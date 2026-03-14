"""
Gabion retaining wall design to EN 1997-1 / BS 8002.
Overturning, sliding, bearing, internal shear between courses.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class GabionWallCalculator(CalculatorPlugin):
    key = "gabion_wall_v1"
    name = "Gabion Wall Design"
    version = "1.0.0"
    description = "Gabion retaining wall stability checks to EN 1997-1"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004, BS 8002:2015"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        H = inputs.get('wall_height_m', 3.0)
        B = inputs.get('base_width_m', 2.0)
        batter_front_deg = inputs.get('batter_front_deg', 6)
        n_courses = inputs.get('number_courses', 3)
        gabion_unit_weight = inputs.get('gabion_unit_weight_kNm3', 16)
        phi_soil_deg = inputs.get('soil_friction_deg', 30)
        gamma_soil = inputs.get('soil_unit_weight_kNm3', 18)
        c_soil = inputs.get('soil_cohesion_kPa', 0)
        surcharge = inputs.get('surcharge_kPa', 10)
        phi_gabion_deg = inputs.get('gabion_interface_friction_deg', 35)
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 150)

        phi_rad = math.radians(phi_soil_deg)
        Ka = (1 - math.sin(phi_rad)) / (1 + math.sin(phi_rad))

        # Active earth pressure
        Pa_soil = 0.5 * Ka * gamma_soil * H ** 2  # kN/m
        Pa_surcharge = Ka * surcharge * H  # kN/m
        Pa_total = Pa_soil + Pa_surcharge

        # Point of application
        y_soil = H / 3
        y_surcharge = H / 2
        y_Pa = (Pa_soil * y_soil + Pa_surcharge * y_surcharge) / Pa_total if Pa_total > 0 else H / 3

        # Wall self-weight (trapezoidal approximation with batter)
        batter_offset = H * math.tan(math.radians(batter_front_deg))
        B_top = B - batter_offset
        W = gabion_unit_weight * H * (B + B_top) / 2  # kN/m
        x_W = (B ** 2 + B * B_top + B_top ** 2) / (3 * (B + B_top))  # centroid from toe

        # Overturning about toe
        M_overturn = Pa_total * y_Pa
        M_resist = W * x_W
        FoS_overturn = M_resist / M_overturn if M_overturn > 0 else float('inf')

        # Sliding
        phi_base = math.radians(phi_gabion_deg)
        F_resist_slide = W * math.tan(phi_base)
        FoS_slide = F_resist_slide / Pa_total if Pa_total > 0 else float('inf')

        # Bearing pressure
        e = B / 2 - (M_resist - M_overturn) / W if W > 0 else 0
        if abs(e) <= B / 6:
            q_max = W / B * (1 + 6 * e / B)
            q_min = W / B * (1 - 6 * e / B)
        else:
            q_max = 2 * W / (3 * (B / 2 - e)) if (B / 2 - e) > 0 else float('inf')
            q_min = 0

        util_bearing = q_max / bearing_capacity_kPa if bearing_capacity_kPa > 0 else float('inf')

        # Internal shear between courses
        h_course = H / n_courses
        shear_forces = []
        max_shear_util = 0
        for i in range(1, n_courses):
            h_i = i * h_course
            Pa_i = 0.5 * Ka * gamma_soil * h_i ** 2 + Ka * surcharge * h_i
            W_i = gabion_unit_weight * h_i * B  # simplified
            F_resist_i = W_i * math.tan(phi_base)
            util_i = Pa_i / F_resist_i if F_resist_i > 0 else float('inf')
            max_shear_util = max(max_shear_util, util_i)
            shear_forces.append({"course": i, "Pa_kN": round(Pa_i, 1), "util": round(util_i, 3)})

        checks = [
            {"name": "Overturning (FoS ≥ 1.5)", "utilisation": round(1.5 / FoS_overturn * 100, 1) if FoS_overturn > 0 else 999,
             "status": "PASS" if FoS_overturn >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_overturn:.2f} (M_r={M_resist:.1f} / M_o={M_overturn:.1f} kNm/m)"},
            {"name": "Sliding (FoS ≥ 1.5)", "utilisation": round(1.5 / FoS_slide * 100, 1) if FoS_slide > 0 else 999,
             "status": "PASS" if FoS_slide >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_slide:.2f} (F_r={F_resist_slide:.1f} / Pa={Pa_total:.1f} kN/m)"},
            {"name": "Bearing pressure", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if util_bearing <= 1.0 else "FAIL",
             "detail": f"q_max={q_max:.1f} kPa / q_allow={bearing_capacity_kPa:.0f} kPa"},
            {"name": "Inter-course shear", "utilisation": round(max_shear_util * 100, 1),
             "status": "PASS" if max_shear_util <= 1.0 else "FAIL",
             "detail": f"Max inter-course sliding util = {max_shear_util:.3f}"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "Ka": round(Ka, 3),
            "Pa_total_kN_m": round(Pa_total, 1),
            "W_kN_m": round(W, 1),
            "FoS_overturn": round(FoS_overturn, 2),
            "FoS_slide": round(FoS_slide, 2),
            "q_max_kPa": round(q_max, 1),
            "q_min_kPa": round(q_min, 1),
            "eccentricity_m": round(e, 3),
            "inter_course_shear": shear_forces,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = GabionWallCalculator()
