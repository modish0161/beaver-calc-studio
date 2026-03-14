"""
Pile capacity calculator — single pile bearing capacity.
Computes shaft friction + end bearing per EN 1997-1 / effective stress method.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class PileCapacityCalculator(CalculatorPlugin):
    key = "pile_capacity_v1"
    name = "Pile Capacity"
    version = "1.0.0"
    description = "Single pile bearing capacity by effective stress method"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 cl 7.6 / Fleming et al."

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Pile
        pile_type = inputs.get('pile_type', 'bored')  # bored or driven
        pile_dia_mm = inputs.get('pile_diameter_mm', 600)
        pile_length_m = inputs.get('pile_length_m', 15.0)
        applied_load_kN = inputs.get('applied_load_kN', 1500)
        # Safety
        gamma_t = inputs.get('gamma_t', 1.4)     # total (DA1-C2 or equivalent)
        gamma_s = inputs.get('gamma_s_shaft', 1.0)   # model factor shaft
        gamma_b = inputs.get('gamma_b_base', 1.0)    # model factor base
        # Ground layers: [{thickness_m, gamma_kN_m3, cu_kPa (undrained), phi_deg, K_s, delta_deg}]
        layers = inputs.get('layers', [
            {"thickness_m": 5.0, "gamma_kN_m3": 18.0, "cu_kPa": 50, "phi_deg": 0, "K_s": 0.5, "delta_deg": 0},
            {"thickness_m": 5.0, "gamma_kN_m3": 19.0, "cu_kPa": 0, "phi_deg": 32, "K_s": 0.8, "delta_deg": 25},
            {"thickness_m": 5.0, "gamma_kN_m3": 20.0, "cu_kPa": 0, "phi_deg": 35, "K_s": 0.9, "delta_deg": 28},
        ])
        # End bearing soil
        Nc = inputs.get('Nc', 9.0)  # bearing factor for clay
        Nq_base = inputs.get('Nq_base', 0)  # 0 = auto from phi
        bearing_cu_kPa = inputs.get('bearing_cu_kPa', 0)  # undrained at base

        alpha_factor = 0.45 if pile_type == 'bored' else 0.55  # adhesion factor for clay

        pile_dia_m = pile_dia_mm / 1000
        pile_perim = math.pi * pile_dia_m
        A_base = math.pi * pile_dia_m ** 2 / 4

        # Shaft friction layer by layer
        depth = 0
        sigma_v = 0  # effective vertical stress
        total_shaft_kN = 0
        layer_results = []

        for lyr in layers:
            t = lyr['thickness_m']
            gamma = lyr['gamma_kN_m3']
            cu = lyr.get('cu_kPa', 0)
            phi = lyr.get('phi_deg', 0)
            K_s = lyr.get('K_s', 0.5)
            delta_deg = lyr.get('delta_deg', 20)

            # Only include layer if within pile length
            depth_top = depth
            depth_bot = min(depth + t, pile_length_m)
            if depth_top >= pile_length_m:
                depth += t
                sigma_v += gamma * t
                continue
            eff_t = depth_bot - depth_top

            sigma_v_mid = sigma_v + gamma * eff_t / 2

            if cu > 0:
                # Total stress (alpha method)
                f_s = alpha_factor * cu
            else:
                # Effective stress (beta method)
                delta_rad = math.radians(delta_deg)
                f_s = K_s * sigma_v_mid * math.tan(delta_rad)

            Q_s_layer = f_s * pile_perim * eff_t
            total_shaft_kN += Q_s_layer

            layer_results.append({
                "depth_from_m": round(depth_top, 1),
                "depth_to_m": round(depth_bot, 1),
                "f_s_kPa": round(f_s, 1),
                "Q_s_kN": round(Q_s_layer, 1),
            })

            sigma_v += gamma * t
            depth += t

        # End bearing
        # Get properties of layer at pile toe
        last_layer = layers[-1] if layers else {}
        base_cu = bearing_cu_kPa or last_layer.get('cu_kPa', 0)
        base_phi = last_layer.get('phi_deg', 0)

        if base_cu > 0:
            q_b = Nc * base_cu  # undrained end bearing
        else:
            # Drained: q_b = σ'_v × N_q
            if Nq_base > 0:
                Nq = Nq_base
            else:
                phi_rad = math.radians(base_phi)
                Nq = math.exp(math.pi * math.tan(phi_rad)) * (math.tan(math.pi / 4 + phi_rad / 2)) ** 2
            q_b = sigma_v * Nq

        Q_b_kN = q_b * A_base

        # Total capacity
        R_c_k = total_shaft_kN / gamma_s + Q_b_kN / gamma_b
        R_c_d = R_c_k / gamma_t

        # Utilisation
        util = applied_load_kN / R_c_d if R_c_d > 0 else 999

        # Shaft/base split
        shaft_pct = total_shaft_kN / (total_shaft_kN + Q_b_kN) * 100 if (total_shaft_kN + Q_b_kN) > 0 else 0

        checks = [
            {"name": "Pile capacity (N_Ed / R_c,d)",
             "utilisation": round(util * 100, 1),
             "status": "PASS" if util <= 1.0 else "FAIL",
             "detail": f"N_Ed={applied_load_kN:.0f} kN / R_c,d={R_c_d:.0f} kN (γ_t={gamma_t})"},
            {"name": "Shaft friction (characteristic)",
             "utilisation": round(shaft_pct, 1),
             "status": "PASS",
             "detail": f"Q_s,k={total_shaft_kN:.0f} kN ({shaft_pct:.0f}% of total)"},
            {"name": "Base resistance (characteristic)",
             "utilisation": round(100 - shaft_pct, 1),
             "status": "PASS",
             "detail": f"Q_b,k={Q_b_kN:.0f} kN (q_b={q_b:.0f} kPa)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "total_shaft_kN": round(total_shaft_kN, 0),
            "base_capacity_kN": round(Q_b_kN, 0),
            "R_c_k_kN": round(R_c_k, 0),
            "R_c_d_kN": round(R_c_d, 0),
            "q_b_kPa": round(q_b, 0),
            "shaft_percentage": round(shaft_pct, 1),
            "layer_results": layer_results,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = PileCapacityCalculator()
