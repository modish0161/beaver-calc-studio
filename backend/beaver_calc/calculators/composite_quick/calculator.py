"""
Quick composite beam check (EN 1994-1-1 simplified).
Plastic moment of composite section, vertical shear, longitudinal shear.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class CompositeQuickCalculator(CalculatorPlugin):
    key = "composite_quick_v1"
    name = "Composite Quick Check"
    version = "1.0.0"
    description = "Quick composite beam check to EN 1994-1-1"
    category = "steel"
    reference_text = "EN 1994-1-1:2004 cl 6.2, 6.3, 6.6"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Steel section
        d_beam_mm = inputs.get('beam_depth_mm', 457)
        b_f = inputs.get('flange_width_mm', 190)
        t_f = inputs.get('flange_thk_mm', 17.7)
        t_w = inputs.get('web_thk_mm', 11.0)
        A_steel = inputs.get('steel_area_mm2', 9460)
        fy = inputs.get('fy_MPa', 355)
        # Concrete slab
        b_eff = inputs.get('effective_width_mm', 2500)
        h_slab = inputs.get('slab_depth_mm', 130)
        h_deck = inputs.get('deck_depth_mm', 60)
        fck = inputs.get('fck_MPa', 30)
        # Shear studs
        n_studs = inputs.get('number_studs_half_span', 40)
        P_Rd_kN = inputs.get('stud_resistance_kN', 73.7)
        # Loading
        M_Ed_kNm = inputs.get('moment_kNm', 400)
        V_Ed_kN = inputs.get('shear_kN', 250)
        span_mm = inputs.get('span_mm', 8000)

        gamma_M0 = 1.0
        gamma_C = 1.5

        # Concrete in compression
        h_c = h_slab - h_deck  # depth of solid slab above deck
        f_cd = 0.85 * fck / gamma_C
        R_c = f_cd * b_eff * h_c / 1000  # kN
        R_s = A_steel * fy / 1000  # kN

        # Degree of shear connection
        R_q = n_studs * P_Rd_kN  # total stud resistance
        degree = min(R_q / min(R_c, R_s), 1.0) if min(R_c, R_s) > 0 else 0

        # Plastic NA position
        if R_s <= R_c:
            # NA in slab
            x_c = R_s / (f_cd * b_eff) if f_cd * b_eff > 0 else 0  # mm
            M_pl_Rd = R_s * (d_beam_mm / 2 + h_slab - x_c / 2) / 1e3  # kNm
        else:
            # NA in steel
            x_c = h_c
            F_c = R_c
            excess = (R_s - R_c) / 2
            y_excess = excess / (fy * b_f / 1000) if fy * b_f > 0 else 0
            M_pl_Rd = R_c * (d_beam_mm / 2 + h_slab - h_c / 2) / 1e3

        M_Rd = M_pl_Rd * degree  # adjust for partial connection

        # Shear check (steel web only)
        h_w = d_beam_mm - 2 * t_f
        A_v = h_w * t_w * 1.0  # mm^2
        V_pl_Rd = A_v * (fy / math.sqrt(3)) / 1000  # kN

        # Longitudinal shear (cl 6.6.2)
        F_longitudinal = min(R_c, R_s)
        eta_shear = F_longitudinal / R_q if R_q > 0 else float('inf')

        util_moment = M_Ed_kNm / M_Rd if M_Rd > 0 else float('inf')
        util_shear = V_Ed_kN / V_pl_Rd if V_pl_Rd > 0 else float('inf')

        checks = [
            {"name": "Moment resistance", "utilisation": round(util_moment * 100, 1),
             "status": "PASS" if util_moment <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed_kNm:.1f} kNm / M_Rd={M_Rd:.1f} kNm = {util_moment:.3f}"},
            {"name": "Vertical shear", "utilisation": round(util_shear * 100, 1),
             "status": "PASS" if util_shear <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f} kN / V_pl,Rd={V_pl_Rd:.1f} kN = {util_shear:.3f}"},
            {"name": "Longitudinal shear", "utilisation": round(eta_shear * 100, 1),
             "status": "PASS" if eta_shear <= 1.0 else "FAIL",
             "detail": f"F_l={F_longitudinal:.1f} kN / R_q={R_q:.1f} kN = {eta_shear:.3f}"},
            {"name": "Degree of shear connection", "utilisation": round(degree * 100, 1),
             "status": "PASS" if degree >= 0.4 else "FAIL",
             "detail": f"η = {degree:.3f} (min 0.4 required)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(util_moment, util_shear, eta_shear) * 100

        return {
            "R_c_kN": round(R_c, 1), "R_s_kN": round(R_s, 1), "R_q_kN": round(R_q, 1),
            "M_pl_Rd_kNm": round(M_Rd, 1), "V_pl_Rd_kN": round(V_pl_Rd, 1),
            "degree_connection": round(degree, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = CompositeQuickCalculator()
