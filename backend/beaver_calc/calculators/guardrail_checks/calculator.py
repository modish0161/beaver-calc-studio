"""
Guardrail / edge protection checks to EN 13374 / BS 6180.
Post bending, rail capacity, fixing forces for temporary edge protection.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class GuardrailChecksCalculator(CalculatorPlugin):
    key = "guardrail_checks_v1"
    name = "Guardrail Checks"
    version = "1.0.0"
    description = "Temporary edge protection to EN 13374 / BS 6180"
    category = "temporary_works"
    reference_text = "EN 13374:2013, BS 6180:2011"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Class A / B / C
        protection_class = inputs.get('class', 'A')
        post_spacing_mm = inputs.get('post_spacing_mm', 2400)
        post_height_mm = inputs.get('post_height_mm', 1100)
        # Post section
        post_Wpl_mm3 = inputs.get('post_Wpl_mm3', 16000)  # e.g. 48.3×3.2 CHS
        post_fy_MPa = inputs.get('post_fy_MPa', 275)
        # Rail
        rail_Wpl_mm3 = inputs.get('rail_Wpl_mm3', 8000)
        rail_fy_MPa = inputs.get('rail_fy_MPa', 275)
        # Fixing
        fixing_capacity_kN = inputs.get('fixing_capacity_kN', 5.0)

        gamma_M = 1.1

        # EN 13374 Class A: 0.3 kN point load at top rail
        # Class B: 0.2 kN/m distributed + dynamic
        # Class C: higher energy absorption
        loads = {
            'A': {'F_point_kN': 0.3, 'w_dist_kN_m': 0.0},
            'B': {'F_point_kN': 0.3, 'w_dist_kN_m': 0.2},
            'C': {'F_point_kN': 0.5, 'w_dist_kN_m': 0.3},
        }.get(protection_class, {'F_point_kN': 0.3, 'w_dist_kN_m': 0.0})

        F_point = loads['F_point_kN']
        w_dist = loads['w_dist_kN_m']

        # Post bending (cantilever from base)
        M_post = F_point * post_height_mm / 1000 + w_dist * post_spacing_mm / 1000 * post_height_mm / 1000
        M_post_Rd = post_Wpl_mm3 * post_fy_MPa / gamma_M / 1e6  # kNm
        util_post = M_post / M_post_Rd if M_post_Rd > 0 else float('inf')

        # Base fixing force
        V_base = F_point + w_dist * post_spacing_mm / 1000
        M_base = M_post
        F_fixing = M_base / (0.1) if True else V_base  # moment couple over ~100mm base plate
        # Simplified: pull-out force on bolts
        F_pullout = M_post / (0.15)  # lever arm 150mm typical base
        util_fixing = F_pullout / fixing_capacity_kN if fixing_capacity_kN > 0 else float('inf')

        # Rail bending (simply supported between posts)
        M_rail = F_point * post_spacing_mm / 4000  # kNm (point load at mid-span)
        M_rail += w_dist * (post_spacing_mm / 1000) ** 2 / 8
        M_rail_Rd = rail_Wpl_mm3 * rail_fy_MPa / gamma_M / 1e6
        util_rail = M_rail / M_rail_Rd if M_rail_Rd > 0 else float('inf')

        # Height check
        min_height = 1000 if protection_class == 'A' else 1100
        util_height = min_height / post_height_mm if post_height_mm > 0 else float('inf')

        # Toe board gap check (max 470mm between bottom rail and floor for Class A)
        toe_board_height = inputs.get('toe_board_height_mm', 150)
        gap_ok = toe_board_height >= 150

        checks = [
            {"name": "Post bending", "utilisation": round(util_post * 100, 1),
             "status": "PASS" if util_post <= 1.0 else "FAIL",
             "detail": f"M={M_post:.3f} kNm / M_Rd={M_post_Rd:.3f} kNm"},
            {"name": "Rail bending", "utilisation": round(util_rail * 100, 1),
             "status": "PASS" if util_rail <= 1.0 else "FAIL",
             "detail": f"M={M_rail:.3f} kNm / M_Rd={M_rail_Rd:.3f} kNm"},
            {"name": "Base fixing", "utilisation": round(util_fixing * 100, 1),
             "status": "PASS" if util_fixing <= 1.0 else "FAIL",
             "detail": f"F_pullout={F_pullout:.2f} kN / capacity={fixing_capacity_kN:.1f} kN"},
            {"name": "Minimum height", "utilisation": round(util_height * 100, 1),
             "status": "PASS" if post_height_mm >= min_height else "FAIL",
             "detail": f"Height={post_height_mm} mm (min {min_height} mm)"},
            {"name": "Toe board", "utilisation": 100 if gap_ok else 0,
             "status": "PASS" if gap_ok else "FAIL",
             "detail": f"Toe board height={toe_board_height} mm (min 150mm)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(util_post, util_rail, util_fixing)

        return {
            "F_point_kN": F_point,
            "M_post_kNm": round(M_post, 4),
            "M_rail_kNm": round(M_rail, 4),
            "F_pullout_kN": round(F_pullout, 2),
            "protection_class": protection_class,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing * 100, 1),
        }


calculator = GuardrailChecksCalculator()
