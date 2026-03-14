"""
Ground/crane mat design — bearing, bending, shear checks for
temporary mats used under crane outriggers or plant.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class GroundMatsCalculator(CalculatorPlugin):
    key = "ground_mats_v1"
    name = "Ground Mats"
    version = "1.0.0"
    description = "Temporary ground mats for crane outrigger loads"
    category = "temporary_works"
    reference_text = "BRE 470, CIRIA C703"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        P_kN = inputs.get('outrigger_load_kN', 400)
        pad_size_mm = inputs.get('outrigger_pad_mm', 400)
        # Mat properties
        mat_length_mm = inputs.get('mat_length_mm', 6000)
        mat_width_mm = inputs.get('mat_width_mm', 1000)
        mat_thk_mm = inputs.get('mat_thickness_mm', 200)
        n_mats = inputs.get('number_mats_stacked', 1)
        timber_grade = inputs.get('timber_grade', 'C24')
        # Ground
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 80)
        spread_angle_deg = inputs.get('spread_angle_deg', 45)

        # Timber properties (EN 338)
        props = {
            'C16': {'fm': 16, 'fv': 3.2, 'fc90': 2.2, 'E': 8000},
            'C24': {'fm': 24, 'fv': 4.0, 'fc90': 2.5, 'E': 11000},
            'C30': {'fm': 30, 'fv': 4.0, 'fc90': 2.7, 'E': 12000},
            'D50': {'fm': 50, 'fv': 6.0, 'fc90': 9.3, 'E': 14000},
        }.get(timber_grade, {'fm': 24, 'fv': 4.0, 'fc90': 2.5, 'E': 11000})

        k_mod = 0.9  # short-term loading
        gamma_M = 1.3
        total_thk = mat_thk_mm * n_mats

        # Load spread through mat (1:1 per side)
        spread = 2 * total_thk * math.tan(math.radians(spread_angle_deg))
        contact_area_mm2 = (pad_size_mm + spread) * (pad_size_mm + spread)
        contact_area_m2 = contact_area_mm2 / 1e6

        # Ground bearing
        q_applied = P_kN / contact_area_m2 if contact_area_m2 > 0 else float('inf')
        util_bearing = q_applied / bearing_capacity_kPa if bearing_capacity_kPa > 0 else float('inf')

        # Punching / crushing on mat surface
        A_pad = (pad_size_mm / 1000) ** 2
        sigma_c90 = P_kN / A_pad / 1000  # MPa
        fc90_d = k_mod * props['fc90'] / gamma_M
        util_crushing = sigma_c90 / fc90_d if fc90_d > 0 else float('inf')

        # Bending — cantilever from pad edge
        overhang = (mat_length_mm - pad_size_mm) / 2  # mm
        w = q_applied * mat_width_mm / 1000 / 1000  # kN/mm → convert
        # Simplified: point load on simply supported mat
        M_Ed = P_kN * overhang / 4 / 1000  # kNm (approximate)
        W = mat_width_mm * mat_thk_mm ** 2 / 6  # mm^3
        sigma_m = M_Ed * 1e6 / W if W > 0 else float('inf')  # MPa
        fm_d = k_mod * props['fm'] / gamma_M
        util_bending = sigma_m / fm_d if fm_d > 0 else float('inf')

        # Shear
        V_Ed = P_kN / 2
        A_shear = mat_width_mm * mat_thk_mm * 2 / 3  # effective shear area
        tau = V_Ed * 1000 / A_shear if A_shear > 0 else float('inf')  # MPa
        fv_d = k_mod * props['fv'] / gamma_M
        util_shear = tau / fv_d if fv_d > 0 else float('inf')

        # Deflection
        I = mat_width_mm * mat_thk_mm ** 3 / 12  # mm^4
        span = mat_length_mm
        delta = P_kN * 1000 * span ** 3 / (48 * props['E'] * I) if I > 0 else float('inf')
        delta_limit = span / 150
        util_defl = delta / delta_limit if delta_limit > 0 else float('inf')

        checks = [
            {"name": "Ground bearing", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if util_bearing <= 1.0 else "FAIL",
             "detail": f"q={q_applied:.1f} kPa / q_allow={bearing_capacity_kPa:.0f} kPa"},
            {"name": "Crushing (fc,90)", "utilisation": round(util_crushing * 100, 1),
             "status": "PASS" if util_crushing <= 1.0 else "FAIL",
             "detail": f"σ_c,90={sigma_c90:.2f} MPa / fc,90,d={fc90_d:.2f} MPa"},
            {"name": "Mat bending", "utilisation": round(util_bending * 100, 1),
             "status": "PASS" if util_bending <= 1.0 else "FAIL",
             "detail": f"σ_m={sigma_m:.2f} MPa / fm,d={fm_d:.2f} MPa"},
            {"name": "Mat shear", "utilisation": round(util_shear * 100, 1),
             "status": "PASS" if util_shear <= 1.0 else "FAIL",
             "detail": f"τ={tau:.2f} MPa / fv,d={fv_d:.2f} MPa"},
            {"name": "Deflection", "utilisation": round(util_defl * 100, 1),
             "status": "PASS" if util_defl <= 1.0 else "FAIL",
             "detail": f"δ={delta:.1f} mm / limit={delta_limit:.1f} mm (L/150)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "q_applied_kPa": round(q_applied, 1),
            "contact_area_m2": round(contact_area_m2, 3),
            "spread_mm": round(spread, 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = GroundMatsCalculator()
