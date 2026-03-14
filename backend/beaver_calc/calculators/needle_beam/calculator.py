"""
Needle beam design calculator for temporary works.
Checks bending, shear, deflection, and bearing for needle beams per BS 5975 / EN 1993-1-1.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class NeedleBeamCalculator(CalculatorPlugin):
    key = "needle_beam_v1"
    name = "Needle Beam Design"
    version = "1.0.0"
    description = "Temporary works needle beam bending, shear, deflection and bearing"
    category = "temporary_works"
    reference_text = "BS 5975:2019 / EN 1993-1-1:2005"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Loading
        wall_load_kN_m = inputs.get('wall_load_kN_m', 50.0)     # load from wall above
        slab_load_kN_m = inputs.get('slab_load_kN_m', 20.0)     # slab UDL
        point_load_kN = inputs.get('point_load_kN', 0)           # additional point load
        # Geometry
        span_mm = inputs.get('span_mm', 3000)
        bearing_length_mm = inputs.get('bearing_length_mm', 200)
        # Section properties (e.g. 203×203×60 UC)
        Wpl_cm3 = inputs.get('Wpl_y_cm3', 656)
        I_cm4 = inputs.get('Iy_cm4', 6125)
        A_v_cm2 = inputs.get('Av_cm2', 26.0)          # shear area
        tw_mm = inputs.get('tw_mm', 9.4)
        tf_mm = inputs.get('tf_mm', 14.2)
        h_mm = inputs.get('h_mm', 209.6)
        b_mm = inputs.get('b_mm', 205.8)
        # Material
        fy_MPa = inputs.get('fy_MPa', 355)
        E_MPa = inputs.get('E_MPa', 210000)
        gamma_M0 = inputs.get('gamma_M0', 1.0)
        # Bearing
        bearing_fy_MPa = inputs.get('bearing_fy_MPa', 20.0)  # masonry/concrete beneath

        w_total_kN_mm = (wall_load_kN_m + slab_load_kN_m) / 1000  # convert to kN/mm
        L = span_mm

        # Bending
        M_udl = w_total_kN_mm * L ** 2 / 8  # kN⋅mm
        M_point = point_load_kN * L / 4      # kN⋅mm
        M_Ed = M_udl + M_point

        Wpl = Wpl_cm3 * 1e3  # mm3
        M_Rd = Wpl * fy_MPa / gamma_M0  # N⋅mm → kN⋅mm
        M_Rd_kNmm = M_Rd / 1000

        m_util = (M_Ed) / M_Rd_kNmm if M_Rd_kNmm > 0 else 999

        # Shear
        V_Ed = w_total_kN_mm * L / 2 + point_load_kN / 2  # kN
        Av = A_v_cm2 * 100  # mm2
        V_Rd = Av * (fy_MPa / math.sqrt(3)) / (gamma_M0 * 1000)  # kN
        v_util = V_Ed / V_Rd if V_Rd > 0 else 999

        # Deflection (UDL + point)
        I = I_cm4 * 1e4  # mm4
        delta_udl = 5 * (w_total_kN_mm * 1000) * L ** 4 / (384 * E_MPa * I)  # N/mm → mm
        delta_point = point_load_kN * 1000 * L ** 3 / (48 * E_MPa * I)
        delta_total = delta_udl + delta_point
        delta_limit = L / 360
        d_util = delta_total / delta_limit if delta_limit > 0 else 0

        # Bearing
        R = V_Ed  # reaction at support = shear force (symmetric)
        bearing_stress = R * 1000 / (b_mm * bearing_length_mm)  # N/mm2 = MPa
        bearing_util = bearing_stress / bearing_fy_MPa if bearing_fy_MPa > 0 else 999

        checks = [
            {"name": "Bending (M_Ed / M_Rd)",
             "utilisation": round(m_util * 100, 1),
             "status": "PASS" if m_util <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed / 1e6:.2f} kNm / M_Rd={M_Rd_kNmm / 1e3:.2f} kNm"},
            {"name": "Shear (V_Ed / V_Rd)",
             "utilisation": round(v_util * 100, 1),
             "status": "PASS" if v_util <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed:.1f} kN / V_Rd={V_Rd:.1f} kN"},
            {"name": "Deflection (δ / L/360)",
             "utilisation": round(d_util * 100, 1),
             "status": "PASS" if d_util <= 1.0 else "FAIL",
             "detail": f"δ={delta_total:.2f} mm / limit={delta_limit:.2f} mm (L/360)"},
            {"name": "Bearing stress",
             "utilisation": round(bearing_util * 100, 1),
             "status": "PASS" if bearing_util <= 1.0 else "FAIL",
             "detail": f"σ_b={bearing_stress:.2f} MPa / f_b={bearing_fy_MPa:.1f} MPa over {bearing_length_mm}mm"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "M_Ed_kNm": round(M_Ed / 1e6, 2),
            "M_Rd_kNm": round(M_Rd_kNmm / 1e3, 2),
            "V_Ed_kN": round(V_Ed, 1),
            "V_Rd_kN": round(V_Rd, 1),
            "deflection_mm": round(delta_total, 2),
            "deflection_limit_mm": round(delta_limit, 2),
            "bearing_stress_MPa": round(bearing_stress, 2),
            "reaction_kN": round(R, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = NeedleBeamCalculator()
