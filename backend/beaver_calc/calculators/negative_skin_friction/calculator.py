"""
Negative skin friction (downdrag) calculator for piles.
Computes downdrag force per EN 1997-1 and checks pile structural capacity.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class NegativeSkinFrictionCalculator(CalculatorPlugin):
    key = "negative_skin_friction_v1"
    name = "Negative Skin Friction"
    version = "1.0.0"
    description = "Pile downdrag / negative skin friction per EN 1997-1"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 cl 7.3.2 / Fellenius (1972)"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Pile
        pile_dia_mm = inputs.get('pile_diameter_mm', 600)
        pile_length_m = inputs.get('pile_length_m', 20.0)
        pile_capacity_kN = inputs.get('pile_capacity_kN', 3000)
        structural_capacity_kN = inputs.get('structural_capacity_kN', 4000)
        applied_load_kN = inputs.get('applied_load_kN', 1500)
        # Soil layers with downdrag
        # Each layer: {thickness_m, gamma_kN_m3, K (earth pressure), delta_deg (interface friction)}
        layers = inputs.get('layers', [
            {"thickness_m": 5.0, "gamma_kN_m3": 16.0, "K": 0.7, "delta_deg": 20},
            {"thickness_m": 3.0, "gamma_kN_m3": 18.0, "K": 0.5, "delta_deg": 25},
        ])
        # Neutral plane depth (where settlement equals pile settlement)
        neutral_plane_m = inputs.get('neutral_plane_m', 0)  # 0 = auto (full consolidating depth)

        pile_perim = math.pi * pile_dia_mm / 1000  # m

        # Calculate downdrag force layer by layer
        depth = 0
        total_nsf_kN = 0
        sigma_v = 0  # vertical effective stress at top of layer
        layer_results = []

        for lyr in layers:
            t = lyr['thickness_m']
            gamma = lyr['gamma_kN_m3']
            K = lyr.get('K', 0.5)
            delta = math.radians(lyr.get('delta_deg', 20))

            # Average vertical effective stress in this layer
            sigma_v_mid = sigma_v + gamma * t / 2
            # Negative skin friction: f_n = K × σ'v × tan(δ)
            f_n = K * sigma_v_mid * math.tan(delta)  # kPa
            # Force from this layer
            F_layer = f_n * pile_perim * t  # kN

            total_nsf_kN += F_layer
            layer_results.append({
                "depth_from_m": round(depth, 1),
                "depth_to_m": round(depth + t, 1),
                "sigma_v_mid_kPa": round(sigma_v_mid, 1),
                "unit_nsf_kPa": round(f_n, 1),
                "nsf_force_kN": round(F_layer, 1),
            })

            sigma_v += gamma * t
            depth += t

        # Total axial force on pile
        total_axial_kN = applied_load_kN + total_nsf_kN

        # Geotechnical check
        geo_util = total_axial_kN / pile_capacity_kN if pile_capacity_kN > 0 else 999

        # Structural check
        str_util = total_axial_kN / structural_capacity_kN if structural_capacity_kN > 0 else 999

        # NSF as percentage of positive capacity
        nsf_pct = total_nsf_kN / pile_capacity_kN * 100 if pile_capacity_kN > 0 else 0

        # Settlement neutral plane
        consolidating_depth = depth  # total depth of settling layers

        checks = [
            {"name": "Geotechnical capacity (with NSF)",
             "utilisation": round(geo_util * 100, 1),
             "status": "PASS" if geo_util <= 1.0 else "FAIL",
             "detail": f"N_total={total_axial_kN:.0f} kN (P={applied_load_kN:.0f} + NSF={total_nsf_kN:.0f}) / R_k={pile_capacity_kN:.0f} kN"},
            {"name": "Structural capacity",
             "utilisation": round(str_util * 100, 1),
             "status": "PASS" if str_util <= 1.0 else "FAIL",
             "detail": f"N_total={total_axial_kN:.0f} kN / N_str={structural_capacity_kN:.0f} kN"},
            {"name": "NSF proportion of capacity",
             "utilisation": round(nsf_pct, 1),
             "status": "PASS" if nsf_pct < 50 else "FAIL",
             "detail": f"NSF={total_nsf_kN:.0f} kN = {nsf_pct:.1f}% of pile capacity (warn if >50%)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "total_nsf_kN": round(total_nsf_kN, 0),
            "total_axial_kN": round(total_axial_kN, 0),
            "consolidating_depth_m": round(consolidating_depth, 1),
            "layer_results": layer_results,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = NegativeSkinFrictionCalculator()
