"""
Mass/gravity retaining wall design to EN 1997-1.
Overturning, sliding, bearing, eccentricity checks.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class GravityWallCalculator(CalculatorPlugin):
    key = "gravity_wall_v1"
    name = "Gravity Retaining Wall"
    version = "1.0.0"
    description = "Mass gravity retaining wall to EN 1997-1"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 cl 9"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        H = inputs.get('wall_height_m', 3.0)
        B_base = inputs.get('base_width_m', 1.8)
        B_top = inputs.get('top_width_m', 0.6)
        gamma_wall = inputs.get('wall_unit_weight_kNm3', 24)  # concrete
        phi_deg = inputs.get('soil_friction_deg', 30)
        gamma_soil = inputs.get('soil_unit_weight_kNm3', 18)
        c_soil = inputs.get('soil_cohesion_kPa', 0)
        surcharge = inputs.get('surcharge_kPa', 10)
        delta_deg = inputs.get('wall_friction_deg', 20)  # wall-soil friction
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 200)
        base_friction_deg = inputs.get('base_friction_deg', 25)

        phi_rad = math.radians(phi_deg)
        delta_rad = math.radians(delta_deg)
        Ka = (1 - math.sin(phi_rad)) / (1 + math.sin(phi_rad))

        # Active pressure
        Pa_soil = 0.5 * Ka * gamma_soil * H ** 2
        Pa_surcharge = Ka * surcharge * H
        Pa_h = (Pa_soil + Pa_surcharge) * math.cos(delta_rad)
        Pa_v = (Pa_soil + Pa_surcharge) * math.sin(delta_rad)

        # Wall self-weight (trapezoid)
        W = gamma_wall * H * (B_base + B_top) / 2
        x_cg = (B_base ** 2 + B_base * B_top + B_top ** 2) / (3 * (B_base + B_top))

        # Moments about toe
        y_Pa_soil = H / 3
        y_Pa_surcharge = H / 2
        y_Pa = (Pa_soil * y_Pa_soil + Pa_surcharge * y_Pa_surcharge) / (Pa_soil + Pa_surcharge) if (Pa_soil + Pa_surcharge) > 0 else H / 3

        M_resist = W * x_cg + Pa_v * B_base
        M_overturn = Pa_h * y_Pa

        FoS_overturn = M_resist / M_overturn if M_overturn > 0 else float('inf')

        # Sliding
        V_total = W + Pa_v
        F_slide_resist = V_total * math.tan(math.radians(base_friction_deg)) + c_soil * B_base
        FoS_slide = F_slide_resist / Pa_h if Pa_h > 0 else float('inf')

        # Bearing pressure
        e = B_base / 2 - (M_resist - M_overturn) / V_total if V_total > 0 else 0
        if abs(e) <= B_base / 6:
            q_max = V_total / B_base * (1 + 6 * e / B_base)
            q_min = V_total / B_base * (1 - 6 * e / B_base)
        else:
            q_max = 2 * V_total / (3 * (B_base / 2 - e)) if (B_base / 2 - e) > 0 else float('inf')
            q_min = 0

        util_bearing = q_max / bearing_capacity_kPa if bearing_capacity_kPa > 0 else float('inf')

        # Middle third check
        middle_third = abs(e) <= B_base / 6

        checks = [
            {"name": "Overturning (FoS ≥ 2.0)", "utilisation": round(2.0 / FoS_overturn * 100, 1) if FoS_overturn > 0 else 999,
             "status": "PASS" if FoS_overturn >= 2.0 else "FAIL",
             "detail": f"FoS = {FoS_overturn:.2f}"},
            {"name": "Sliding (FoS ≥ 1.5)", "utilisation": round(1.5 / FoS_slide * 100, 1) if FoS_slide > 0 else 999,
             "status": "PASS" if FoS_slide >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_slide:.2f}"},
            {"name": "Bearing pressure", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if util_bearing <= 1.0 else "FAIL",
             "detail": f"q_max={q_max:.1f} kPa / {bearing_capacity_kPa:.0f} kPa"},
            {"name": "Middle third rule", "utilisation": round(abs(e) / (B_base / 6) * 100, 1) if B_base > 0 else 999,
             "status": "PASS" if middle_third else "FAIL",
             "detail": f"e={e:.3f} m, B/6={B_base / 6:.3f} m"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "Ka": round(Ka, 3),
            "Pa_h_kN_m": round(Pa_h, 1), "Pa_v_kN_m": round(Pa_v, 1),
            "W_kN_m": round(W, 1),
            "FoS_overturn": round(FoS_overturn, 2),
            "FoS_slide": round(FoS_slide, 2),
            "q_max_kPa": round(q_max, 1), "q_min_kPa": round(q_min, 1),
            "eccentricity_m": round(e, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = GravityWallCalculator()
