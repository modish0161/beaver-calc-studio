"""
Temporary parapet / edge protection design per BS 6180 / EN 13374.
Checks post bending, rail loading, base plate/counterweight stability.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class TemporaryParapetCalculator(CalculatorPlugin):
    key = "temporary_parapet_v1"
    name = "Temporary Parapet"
    version = "1.0.0"
    description = "Temporary parapet / edge protection design per BS 6180 / EN 13374"
    category = "temporary_works"
    reference_text = "BS 6180:2011; EN 13374:2013"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Classification
        parapet_class = inputs.get('class', 'A')  # A, B, or C per EN 13374

        # Post geometry
        post_height_mm = inputs.get('post_height_mm', 1100)
        post_spacing_mm = inputs.get('post_spacing_mm', 2400)
        # Post section (CHS or RHS typically)
        post_Wpl_cm3 = inputs.get('post_Wpl_cm3', 15)
        post_fy_MPa = inputs.get('post_fy_MPa', 355)

        # Rail
        n_rails = inputs.get('n_rails', 2)  # top rail + mid rail
        rail_Wpl_cm3 = inputs.get('rail_Wpl_cm3', 5)
        rail_fy_MPa = inputs.get('rail_fy_MPa', 355)

        # Toeboard
        toeboard_height_mm = inputs.get('toeboard_height_mm', 150)

        # Counterweight / base
        fixing_type = inputs.get('fixing_type', 'counterweight')  # counterweight, clamp, bolt
        counterweight_kg = inputs.get('counterweight_kg', 30)
        base_lever_arm_mm = inputs.get('base_lever_arm_mm', 400)

        gamma_M0 = inputs.get('gamma_M0', 1.0)

        # Design loads per EN 13374 / BS 6180
        # Class A: point load at top rail = 0.3 kN, UDL = 0.3 kN/m
        # Class B: point load = 0.5 kN, UDL = 0.5 kN/m, downward = 1.25 kN
        # Class C: point load = 0.5 kN, UDL = 0.5 kN/m + impact energy
        class_loads = {
            'A': {'F_point_kN': 0.3, 'w_udl_kN_m': 0.3, 'F_down_kN': 0.3},
            'B': {'F_point_kN': 0.5, 'w_udl_kN_m': 0.5, 'F_down_kN': 1.25},
            'C': {'F_point_kN': 0.5, 'w_udl_kN_m': 0.5, 'F_down_kN': 1.25},
        }
        loads = class_loads.get(parapet_class, class_loads['A'])

        F_h = loads['F_point_kN']
        w_h = loads['w_udl_kN_m']

        # Post bending — horizontal point load at top
        # Cantilever post: M = F × h
        M_Ed_post = F_h * post_height_mm / 1000  # kNm
        M_Rd_post = post_Wpl_cm3 * 1e-6 * post_fy_MPa * 1e3 / gamma_M0  # kNm
        post_ratio = M_Ed_post / M_Rd_post if M_Rd_post > 0 else 999

        # UDL on rail between posts
        M_Ed_rail = w_h * (post_spacing_mm / 1000) ** 2 / 8
        M_Rd_rail = rail_Wpl_cm3 * 1e-6 * rail_fy_MPa * 1e3 / gamma_M0
        rail_ratio = M_Ed_rail / M_Rd_rail if M_Rd_rail > 0 else 999

        # Point load on rail (mid-span)
        M_Ed_rail_point = F_h * post_spacing_mm / (4 * 1000)
        rail_point_ratio = M_Ed_rail_point / M_Rd_rail if M_Rd_rail > 0 else 999

        # Base stability (counterweight)
        if fixing_type == 'counterweight':
            # Overturning about edge: M_ot = F_h × post_height
            M_ot = F_h * post_height_mm / 1000  # kNm
            # Restoring: counterweight × lever arm
            W_cw = counterweight_kg * 9.81 / 1000  # kN
            M_res = W_cw * base_lever_arm_mm / 1000
            base_ratio = M_ot / M_res if M_res > 0 else 999
        else:
            M_ot = F_h * post_height_mm / 1000
            M_res = 999  # assumed adequate for bolted/clamped
            base_ratio = 0

        # Toeboard check
        tb_ok = toeboard_height_mm >= 150

        # Height check (min 1100mm for Class A, 1100mm for B/C per EN 13374)
        min_height = 1100
        height_ok = post_height_mm >= min_height

        checks = [
            {"name": "Post bending (point load)",
             "utilisation": round(post_ratio * 100, 1),
             "status": "PASS" if post_ratio <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed_post:.2f} kNm / M_Rd={M_Rd_post:.2f} kNm (Class {parapet_class})"},
            {"name": "Rail bending (UDL)",
             "utilisation": round(rail_ratio * 100, 1),
             "status": "PASS" if rail_ratio <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed_rail:.2f} kNm / M_Rd={M_Rd_rail:.2f} kNm @ {post_spacing_mm}mm c/c"},
            {"name": "Rail bending (point load)",
             "utilisation": round(rail_point_ratio * 100, 1),
             "status": "PASS" if rail_point_ratio <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed_rail_point:.2f} kNm / M_Rd={M_Rd_rail:.2f} kNm"},
            {"name": "Base stability",
             "utilisation": round(base_ratio * 100, 1),
             "status": "PASS" if base_ratio <= 1.0 else "FAIL",
             "detail": f"M_ot={M_ot:.2f} kNm / M_res={M_res:.2f} kNm ({fixing_type})"},
            {"name": "Parapet height",
             "utilisation": round(min_height / post_height_mm * 100, 1) if post_height_mm > 0 else 999,
             "status": "PASS" if height_ok else "FAIL",
             "detail": f"h={post_height_mm}mm (min {min_height}mm)"},
            {"name": "Toeboard",
             "utilisation": 0,
             "status": "PASS" if tb_ok else "FAIL",
             "detail": f"h_tb={toeboard_height_mm}mm (min 150mm)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "class": parapet_class,
            "F_horizontal_kN": F_h,
            "M_Ed_post_kNm": round(M_Ed_post, 2),
            "M_Rd_post_kNm": round(M_Rd_post, 2),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = TemporaryParapetCalculator()
