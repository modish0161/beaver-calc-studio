"""
Spreader beam / lifting beam design per BS 7121 / EN 1993-1-1.
Checks bending, shear, deflection, and lug bearing for lifting beams.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SpreaderBeamCalculator(CalculatorPlugin):
    key = "spreader_beam_v1"
    name = "Spreader Beam"
    version = "1.0.0"
    description = "Spreader/lifting beam design per BS 7121 / EN 1993-1-1"
    category = "lifting"
    reference_text = "BS 7121-1:2016; EN 1993-1-1:2005"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Load
        swl_kN = inputs.get('swl_kN', 100)
        daf = inputs.get('dynamic_amplification_factor', 1.1)
        n_pick_points = inputs.get('n_pick_points', 2)  # 2 or 4
        # Beam geometry
        span_mm = inputs.get('beam_span_mm', 4000)
        # Section
        section_name = inputs.get('section_name', 'UC 203x203x60')
        Wpl_cm3 = inputs.get('Wpl_y_cm3', 652)
        Iy_cm4 = inputs.get('Iy_cm4', 6090)
        Av_cm2 = inputs.get('Av_shear_cm2', 29.6)
        tw_mm = inputs.get('tw_mm', 9.4)
        fy_MPa = inputs.get('fy_MPa', 355)
        E_MPa = inputs.get('E_MPa', 210000)
        beam_sw_kN_m = inputs.get('beam_sw_kN_m', 0.59)
        # Lug / clevis
        lug_thickness_mm = inputs.get('lug_thickness_mm', 20)
        lug_width_mm = inputs.get('lug_width_mm', 80)
        pin_diameter_mm = inputs.get('pin_diameter_mm', 30)
        fu_lug_MPa = inputs.get('fu_lug_MPa', 510)

        # Gamma
        gamma_M0 = inputs.get('gamma_M0', 1.0)
        gamma_M2 = inputs.get('gamma_M2', 1.25)

        # Design load (with DAF)
        P_design = swl_kN * daf

        # Beam analysis — simply supported with 2 point loads (or 1 central crane hook + 2 sling points)
        # Typical: crane hook at centre, pick points spread at ±a from centre
        if n_pick_points == 2:
            # Equal share on 2 pick points below, crane hook above at centre
            # Simply supported at pick points (span = distance between pick points)
            # UDL from self-weight + central point load from crane
            a = span_mm / 2  # half span
            # Max moment at centre
            M_Ed = P_design * span_mm / (4 * 1000) + beam_sw_kN_m * (span_mm / 1000) ** 2 / 8
            V_Ed = P_design / 2 + beam_sw_kN_m * span_mm / 2000
        else:
            # 4-point pick: beam supported at 2 top lugs, loaded at 4 bottom points
            # Simplified as UDL equivalent
            M_Ed = P_design * span_mm / (4 * 1000) + beam_sw_kN_m * (span_mm / 1000) ** 2 / 8
            V_Ed = P_design / 2 + beam_sw_kN_m * span_mm / 2000

        # Bending capacity
        M_Rd = Wpl_cm3 * 1e-6 * fy_MPa * 1e3 / gamma_M0  # kNm
        bending_ratio = M_Ed / M_Rd if M_Rd > 0 else 999

        # Shear
        V_Rd = Av_cm2 * 1e-4 * fy_MPa * 1e3 / (math.sqrt(3) * gamma_M0)
        shear_ratio = V_Ed / V_Rd if V_Rd > 0 else 999

        # Deflection
        I_mm4 = Iy_cm4 * 1e4
        delta = P_design * 1000 * span_mm ** 3 / (48 * E_MPa * I_mm4) + 5 * beam_sw_kN_m * (span_mm ** 4) / (384 * E_MPa * I_mm4)
        delta_limit = span_mm / 500  # more stringent for lifting
        defl_ratio = delta / delta_limit if delta_limit > 0 else 999

        # Lug bearing check (pin bearing on lug)
        # F_b,Rd = 2.5 × fu × d × t / γ_M2 (EN 1993-1-8 Table 3.4 for bearing)
        F_per_lug = P_design / 2 if n_pick_points <= 2 else P_design / 4
        F_b_Rd = 2.5 * fu_lug_MPa * pin_diameter_mm * lug_thickness_mm / (gamma_M2 * 1000)  # kN
        # Net section tension
        A_net = (lug_width_mm - pin_diameter_mm) * lug_thickness_mm  # mm2
        F_t_Rd = 0.9 * A_net * fu_lug_MPa / (gamma_M2 * 1000)  # kN
        lug_bearing_ratio = F_per_lug / F_b_Rd if F_b_Rd > 0 else 999
        lug_tension_ratio = F_per_lug / F_t_Rd if F_t_Rd > 0 else 999

        checks = [
            {"name": "Bending",
             "utilisation": round(bending_ratio * 100, 1),
             "status": "PASS" if bending_ratio <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed:.1f} kNm / M_Rd={M_Rd:.1f} kNm ({section_name})"},
            {"name": "Shear",
             "utilisation": round(shear_ratio * 100, 1),
             "status": "PASS" if shear_ratio <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed:.1f} kN / V_Rd={V_Rd:.1f} kN"},
            {"name": "Deflection (L/500)",
             "utilisation": round(defl_ratio * 100, 1),
             "status": "PASS" if defl_ratio <= 1.0 else "FAIL",
             "detail": f"δ={delta:.1f}mm / {delta_limit:.1f}mm"},
            {"name": "Lug bearing",
             "utilisation": round(lug_bearing_ratio * 100, 1),
             "status": "PASS" if lug_bearing_ratio <= 1.0 else "FAIL",
             "detail": f"F={F_per_lug:.1f} kN / F_b,Rd={F_b_Rd:.1f} kN (Ø{pin_diameter_mm}×{lug_thickness_mm}mm)"},
            {"name": "Lug net tension",
             "utilisation": round(lug_tension_ratio * 100, 1),
             "status": "PASS" if lug_tension_ratio <= 1.0 else "FAIL",
             "detail": f"F={F_per_lug:.1f} kN / F_t,Rd={F_t_Rd:.1f} kN"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "P_design_kN": round(P_design, 1),
            "M_Ed_kNm": round(M_Ed, 1),
            "M_Rd_kNm": round(M_Rd, 1),
            "V_Ed_kN": round(V_Ed, 1),
            "deflection_mm": round(delta, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SpreaderBeamCalculator()
