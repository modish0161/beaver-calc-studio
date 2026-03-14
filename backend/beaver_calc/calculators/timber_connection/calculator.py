"""
Timber connection design per EN 1995-1-1 (EC5).
Bolted and dowelled connections — Johansen yield theory (EYM), row shear, splitting.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class TimberConnectionCalculator(CalculatorPlugin):
    key = "timber_connection_v1"
    name = "Timber Connection"
    version = "1.0.0"
    description = "Timber bolted/dowelled connection design per EN 1995-1-1"
    category = "timber"
    reference_text = "EN 1995-1-1:2004 cl 8.2/8.3/8.5"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Connection type
        conn_type = inputs.get('connection_type', 'timber_to_timber')  # timber_to_timber, timber_to_steel
        fastener = inputs.get('fastener_type', 'bolt')  # bolt, dowel

        # Fastener
        d_mm = inputs.get('fastener_diameter_mm', 12)
        fu_MPa = inputs.get('fu_MPa', 400)
        n_fasteners = inputs.get('n_fasteners', 4)
        n_rows = inputs.get('n_rows', 2)
        n_per_row = inputs.get('n_per_row', 2)

        # Timber members
        t1_mm = inputs.get('t1_mm', 50)  # side member
        t2_mm = inputs.get('t2_mm', 100)  # middle member
        rho_k = inputs.get('rho_k_kg_m3', 350)  # characteristic density

        # Timber strength class
        f_h_0_k = inputs.get('f_h_0_k_MPa', 0)
        if f_h_0_k == 0:
            # EN 1995-1-1 Eq 8.15 (bolts ≥6mm)
            f_h_0_k = 0.082 * (1 - 0.01 * d_mm) * rho_k

        # Angle to grain
        alpha_deg = inputs.get('angle_to_grain_deg', 0)
        if alpha_deg > 0:
            k90 = 1.35 + 0.015 * d_mm  # softwood
            f_h_alpha = f_h_0_k / (k90 * math.sin(math.radians(alpha_deg)) ** 2 + math.cos(math.radians(alpha_deg)) ** 2)
        else:
            f_h_alpha = f_h_0_k

        # Yield moment (EN 1995-1-1 Eq 8.14)
        M_y_Rk = 0.3 * fu_MPa * d_mm ** 2.6 / 1000  # Nmm → N·mm

        # Load
        F_Ed_kN = inputs.get('F_Ed_kN', 30)

        # k_mod and gamma_M
        k_mod = inputs.get('k_mod', 0.8)
        gamma_M = inputs.get('gamma_M', 1.3)

        # Single fastener capacity — Johansen EYM (cl 8.2.2)
        # Timber-to-timber double shear (Mode I-III)
        beta = 1.0  # same species both sides
        f_h1 = f_h_alpha  # side member
        f_h2 = f_h_alpha  # middle member

        if conn_type == 'timber_to_timber':
            # Mode I (a) — bearing in side member
            F_v_Rk_Ia = f_h1 * t1_mm * d_mm / 1000  # N → kN factor
            # Mode I (b) — bearing in middle
            F_v_Rk_Ib = 0.5 * f_h2 * t2_mm * d_mm / 1000
            # Mode II
            denom = 1 + beta
            F_v_Rk_II = 1.05 * f_h1 * t1_mm * d_mm / (2 * denom) * (
                math.sqrt(beta + 2 * beta ** 2 * (1 + t2_mm / t1_mm + (t2_mm / t1_mm) ** 2) + beta ** 3 * (t2_mm / t1_mm) ** 2) - beta * (1 + t2_mm / t1_mm)
            ) / 1000
            F_v_Rk_II = max(0, F_v_Rk_II)
            # Mode III
            F_v_Rk_III = 1.05 * f_h1 * t1_mm * d_mm / (2 * denom) * (
                math.sqrt(2 * beta * (1 + beta) + 4 * beta * (2 + beta) * M_y_Rk / (f_h1 * d_mm * t1_mm ** 2)) - beta
            ) / 1000
            F_v_Rk_III = max(0, F_v_Rk_III)

            F_v_Rk_single = min(F_v_Rk_Ia, F_v_Rk_Ib, F_v_Rk_II, F_v_Rk_III)
        else:
            # Timber-to-steel (thin/thick plate)
            steel_plate_mm = inputs.get('steel_plate_mm', 8)
            # Simplified — treat as thick plate if t_steel ≥ d
            F_v_Rk_a = f_h1 * t1_mm * d_mm / 1000
            F_v_Rk_b = f_h1 * t1_mm * d_mm / 1000 * (math.sqrt(2 + 4 * M_y_Rk / (f_h1 * d_mm * t1_mm ** 2)) - 1)
            F_v_Rk_c = 2.3 * math.sqrt(M_y_Rk * f_h1 * d_mm) / 1000
            F_v_Rk_single = min(F_v_Rk_a, max(0, F_v_Rk_b), F_v_Rk_c)

        # Rope effect (bolt add 25% EN 1995-1-1 cl 8.2.2(2))
        if fastener == 'bolt':
            F_v_Rk_single *= 1.25

        # Design resistance per fastener
        F_v_Rd_single = k_mod * F_v_Rk_single / gamma_M

        # Effective number of fasteners in a row (cl 8.5.1.1)
        a1 = inputs.get('a1_spacing_mm', 5 * d_mm)
        n_eff = min(n_per_row, n_per_row ** 0.9 * (a1 / (13 * d_mm)) ** 0.25) if d_mm > 0 else n_per_row

        # Total capacity
        F_v_Rd_total = F_v_Rd_single * n_eff * n_rows * 2  # ×2 for double shear typical
        # (if single shear, user adjusts)
        shear_planes = inputs.get('shear_planes', 2)
        F_v_Rd_total = F_v_Rd_single * n_eff * n_rows * shear_planes

        load_ratio = F_Ed_kN / F_v_Rd_total if F_v_Rd_total > 0 else 999

        # Row shear / splitting (cl 8.1.4)
        # Splitting: F_90,Rd
        he = inputs.get('member_depth_mm', 200)
        w = inputs.get('loaded_edge_distance_mm', 80)
        F_90_Rk = 14 * (t1_mm / 1000) * math.sqrt(he / (1 - w / he if he > w else 0.01))  # kN (softwood)
        splitting_ratio = F_Ed_kN / (F_90_Rk / gamma_M) if F_90_Rk > 0 else 0

        checks = [
            {"name": "Fastener shear capacity",
             "utilisation": round(load_ratio * 100, 1),
             "status": "PASS" if load_ratio <= 1.0 else "FAIL",
             "detail": f"F_Ed={F_Ed_kN:.1f} kN / F_v,Rd={F_v_Rd_total:.1f} kN ({n_fasteners}×Ø{d_mm}, n_eff={n_eff:.1f})"},
            {"name": "Row shear / splitting",
             "utilisation": round(splitting_ratio * 100, 1),
             "status": "PASS" if splitting_ratio <= 1.0 else "FAIL",
             "detail": f"F_Ed={F_Ed_kN:.1f} kN / F_90,Rd={F_90_Rk / gamma_M:.1f} kN"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "F_v_Rk_single_kN": round(F_v_Rk_single, 1),
            "F_v_Rd_single_kN": round(F_v_Rd_single, 1),
            "n_eff": round(n_eff, 1),
            "F_v_Rd_total_kN": round(F_v_Rd_total, 1),
            "f_h_0_k_MPa": round(f_h_0_k, 1),
            "M_y_Rk_Nmm": round(M_y_Rk, 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = TimberConnectionCalculator()
