"""
Legato interlocking block wall structural design calculator.
Checks overturning, sliding, bearing, inter-course friction per EN 1997-1.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class LegatoWallCalculator(CalculatorPlugin):
    key = "legato_wall_v1"
    name = "Legato Wall Design"
    version = "1.0.0"
    description = "Structural checks for Legato interlocking block retaining walls"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 / BS 8002:2015"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Wall geometry
        wall_height_m = inputs.get('wall_height_m', 2.4)
        block_width_m = inputs.get('block_width_m', 0.8)
        block_length_m = inputs.get('block_length_m', 1.6)
        block_height_m = inputs.get('block_height_m', 0.8)
        n_courses = inputs.get('n_courses', 0) or math.ceil(wall_height_m / block_height_m)
        # Setback per course (mm)
        setback_mm = inputs.get('setback_mm', 0)
        setback_m = setback_mm / 1000
        # Soil params
        gamma_soil = inputs.get('gamma_soil_kN_m3', 18.0)
        phi_deg = inputs.get('phi_deg', 30.0)
        surcharge_kPa = inputs.get('surcharge_kPa', 5.0)
        # Foundation
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 150.0)
        base_friction_coeff = inputs.get('base_friction_coeff', 0.5)
        # Block density
        gamma_block = inputs.get('gamma_block_kN_m3', 24.0)

        H = n_courses * block_height_m
        phi_rad = math.radians(phi_deg)
        Ka = (1 - math.sin(phi_rad)) / (1 + math.sin(phi_rad))

        # Active earth pressure force (per m run)
        Pa_soil = 0.5 * Ka * gamma_soil * H ** 2  # kN/m
        Pa_surcharge = Ka * surcharge_kPa * H  # kN/m
        Pa_total = Pa_soil + Pa_surcharge

        # Lever arms about toe
        arm_soil = H / 3
        arm_surcharge = H / 2

        # Overturning moment about toe
        M_o = Pa_soil * arm_soil + Pa_surcharge * arm_surcharge

        # Wall self-weight (per m run)
        total_setback = (n_courses - 1) * setback_m
        # Effective base width = block_width + total setback
        B_eff = block_width_m + total_setback
        W_wall = gamma_block * block_width_m * H  # weight per m run

        # Stabilising moment (centroid of wall including setback)
        x_cg = B_eff / 2  # approximate
        M_s = W_wall * x_cg

        # Overturning FoS (EN 1997-1: ≥ 2.0 for gravity walls)
        FoS_ot = M_s / M_o if M_o > 0 else 999

        # Sliding check (friction only)
        F_resist = W_wall * base_friction_coeff
        FoS_slide = F_resist / Pa_total if Pa_total > 0 else 999

        # Bearing pressure
        e = B_eff / 2 - (M_s - M_o) / W_wall if W_wall > 0 else 0
        # Meyerhof effective width
        B_prime = B_eff - 2 * abs(e)
        q_bearing = W_wall / B_prime if B_prime > 0 else 999
        bearing_util = q_bearing / bearing_capacity_kPa

        # Inter-course friction (most critical at base)
        block_friction_coeff = inputs.get('inter_block_friction', 0.6)
        F_friction = W_wall * block_friction_coeff
        FoS_interblock = F_friction / Pa_total if Pa_total > 0 else 999

        checks = [
            {"name": "Overturning (FoS ≥ 2.0)",
             "utilisation": round(2.0 / FoS_ot * 100, 1),
             "status": "PASS" if FoS_ot >= 2.0 else "FAIL",
             "detail": f"FoS = {FoS_ot:.2f} (M_s={M_s:.1f}, M_o={M_o:.1f} kNm/m)"},
            {"name": "Sliding (FoS ≥ 1.5)",
             "utilisation": round(1.5 / FoS_slide * 100, 1),
             "status": "PASS" if FoS_slide >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_slide:.2f} (F_r={F_resist:.1f}, P_a={Pa_total:.1f} kN/m)"},
            {"name": "Bearing pressure",
             "utilisation": round(bearing_util * 100, 1),
             "status": "PASS" if bearing_util <= 1.0 else "FAIL",
             "detail": f"q = {q_bearing:.1f} kPa / {bearing_capacity_kPa:.0f} kPa capacity"},
            {"name": "Inter-course friction (FoS ≥ 1.5)",
             "utilisation": round(1.5 / FoS_interblock * 100, 1),
             "status": "PASS" if FoS_interblock >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_interblock:.2f} (μ={block_friction_coeff})"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "wall_height_m": round(H, 2),
            "n_courses": n_courses,
            "effective_base_m": round(B_eff, 2),
            "Ka": round(Ka, 3),
            "Pa_total_kN_m": round(Pa_total, 1),
            "wall_weight_kN_m": round(W_wall, 1),
            "eccentricity_m": round(e, 3),
            "bearing_pressure_kPa": round(q_bearing, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = LegatoWallCalculator()
