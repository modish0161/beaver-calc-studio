"""
Sheet pile wall design per EN 1997-1 / BS 8002.
Cantilever and propped modes, checks embedment, bending, prop force, and toe kick.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SheetPileCalculator(CalculatorPlugin):
    key = "sheet_pile_v1"
    name = "Sheet Pile"
    version = "1.0.0"
    description = "Sheet pile retaining wall design per EN 1997-1 / BS 8002"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 cl 9; BS 8002:2015"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Retained soil
        phi_deg = inputs.get('phi_deg', 30)
        gamma_soil = inputs.get('gamma_soil_kN_m3', 18)
        c_kPa = inputs.get('cohesion_kPa', 0)
        delta_deg = inputs.get('delta_deg', 20)  # wall friction

        # Geometry
        H_m = inputs.get('retained_height_m', 4.0)
        d_m = inputs.get('embedment_m', 4.0)
        surcharge_kPa = inputs.get('surcharge_kPa', 10)
        water_level_m = inputs.get('water_level_below_surface_m', 99)  # from retained side surface
        gamma_w = 9.81

        # Wall properties
        section_modulus_cm3 = inputs.get('section_modulus_cm3', 2000)
        fy_MPa = inputs.get('fy_MPa', 355)
        wall_type = inputs.get('wall_type', 'cantilever')  # cantilever or propped
        prop_level_m = inputs.get('prop_level_below_crest_m', 0.5)

        # Partial factors (DA1-C2)
        gamma_phi = inputs.get('gamma_phi', 1.25)
        gamma_c = inputs.get('gamma_c', 1.25)
        gamma_G = inputs.get('gamma_G_unfav', 1.0)
        gamma_Q = inputs.get('gamma_Q_unfav', 1.3)

        # Design soil parameters
        phi_d = math.atan(math.tan(math.radians(phi_deg)) / gamma_phi)
        delta_d = math.atan(math.tan(math.radians(delta_deg)) / gamma_phi)
        c_d = c_kPa / gamma_c

        # Earth pressure coefficients (Coulomb)
        phi_d_deg = math.degrees(phi_d)
        Ka = math.tan(math.radians(45 - phi_d_deg / 2)) ** 2
        Kp = math.tan(math.radians(45 + phi_d_deg / 2)) ** 2
        # Caquot-Kerisel correction for wall friction
        Ka_ck = Ka * math.cos(delta_d)
        Kp_ck = Kp * math.cos(delta_d)

        # Cohesion reduction
        Ka_c = 2 * math.sqrt(Ka) * c_d if c_d > 0 else 0
        Kp_c = 2 * math.sqrt(Kp) * c_d if c_d > 0 else 0

        # Simple pressure diagram for cantilever
        total_length = H_m + d_m
        # Active pressure at base of retained side (z = H_m)
        sigma_a_H = gamma_soil * H_m * Ka_ck + surcharge_kPa * Ka_ck * gamma_Q - Ka_c
        sigma_a_H = max(0, sigma_a_H)

        # Active pressure at toe (z = H_m + d_m)
        sigma_a_toe = gamma_soil * total_length * Ka_ck + surcharge_kPa * Ka_ck * gamma_Q - Ka_c
        sigma_a_toe = max(0, sigma_a_toe)

        # Passive pressure at toe (over embedment d_m)
        sigma_p_toe = gamma_soil * d_m * Kp_ck + Kp_c

        # Water pressures
        if water_level_m < H_m:
            hw_active = H_m - water_level_m
            u_active = gamma_w * hw_active
        else:
            hw_active = 0
            u_active = 0

        # Net passive moment about excavation level (simplified)
        # Passive resultant and lever arm
        Pp = 0.5 * sigma_p_toe * d_m  # kN/m
        arm_p = d_m / 3

        # Active resultant (triangular + rectangular surcharge)
        # Triangular from soil weight
        Pa_tri = 0.5 * gamma_soil * Ka_ck * H_m ** 2 * gamma_G
        arm_a_tri = H_m / 3 + d_m

        # Rectangular from surcharge
        Pa_rect = surcharge_kPa * Ka_ck * gamma_Q * H_m
        arm_a_rect = H_m / 2 + d_m

        # Active over embedment depth
        Pa_embed = 0.5 * gamma_soil * Ka_ck * d_m ** 2 * gamma_G
        arm_a_embed = d_m / 3

        if wall_type == 'cantilever':
            # Moment equilibrium about toe
            M_overturning = Pa_tri * arm_a_tri + Pa_rect * arm_a_rect + Pa_embed * arm_a_embed
            M_restoring = Pp * arm_p
            embedment_ratio = M_overturning / M_restoring if M_restoring > 0 else 999

            # Max bending moment (approx at 0.6 × d from excavation level)
            z_max = 0.6 * d_m
            M_Ed = Pa_tri * (H_m / 3 + z_max) + Pa_rect * (H_m / 2 + z_max) - 0.5 * Kp_ck * gamma_soil * z_max ** 2 * z_max / 3
            M_Ed = abs(M_Ed)

            prop_force_kN = 0
        else:
            # Propped wall — prop at prop_level_m below crest
            h_prop = prop_level_m
            # Free earth support method
            # Active total
            Pa_total = Pa_tri + Pa_rect

            # Moment about prop
            M_about_prop_active = Pa_tri * (H_m / 3 - h_prop) + Pa_rect * (H_m / 2 - h_prop)
            M_about_prop_passive = Pp * (H_m - h_prop + arm_p)

            # Prop force from equilibrium
            prop_force_kN = (Pa_total * (H_m / 3 - h_prop) - Pp * (H_m + arm_p - h_prop)) / (H_m - h_prop) if (H_m - h_prop) > 0 else Pa_total
            prop_force_kN = abs(prop_force_kN)

            M_overturning = Pa_tri * arm_a_tri + Pa_rect * arm_a_rect
            M_restoring = Pp * arm_p + prop_force_kN * (H_m + d_m - h_prop)
            embedment_ratio = M_overturning / M_restoring if M_restoring > 0 else 999

            # Max bending (approx)
            M_Ed = Pa_tri * H_m / 6 + Pa_rect * H_m / 8
            M_Ed = abs(M_Ed)

        # Section capacity
        M_Rd = section_modulus_cm3 * 1e-3 * fy_MPa / 1000  # kNm (cm3 → dm3 → m3)
        # Z in cm3 × 1e-6 m3 × fy in kPa → kNm
        M_Rd_correct = section_modulus_cm3 * 1e-6 * fy_MPa * 1000  # kNm
        bending_ratio = M_Ed / M_Rd_correct if M_Rd_correct > 0 else 999

        # Toe kick (vertical equilibrium)
        # Active vertical = Pa × tan(delta_d)
        V_active = (Pa_tri + Pa_rect) * math.tan(delta_d)
        # Passive vertical = Pp × tan(delta_d)
        V_passive = Pp * math.tan(delta_d)
        vertical_ratio = V_active / (V_passive + 0.001)

        checks = [
            {"name": "Embedment adequacy (moment)",
             "utilisation": round(embedment_ratio * 100, 1),
             "status": "PASS" if embedment_ratio <= 1.0 else "FAIL",
             "detail": f"M_ot={M_overturning:.0f} kNm / M_res={M_restoring:.0f} kNm"},
            {"name": "Bending capacity",
             "utilisation": round(bending_ratio * 100, 1),
             "status": "PASS" if bending_ratio <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed:.0f} kNm / M_Rd={M_Rd_correct:.0f} kNm (Z={section_modulus_cm3}cm³)"},
            {"name": "Toe kick (vertical)",
             "utilisation": round(vertical_ratio * 100, 1),
             "status": "PASS" if vertical_ratio <= 1.0 else "FAIL",
             "detail": f"V_a={V_active:.1f} kN / V_p={V_passive:.1f} kN"},
        ]

        if wall_type == 'propped':
            checks.append({
                "name": "Prop force",
                "utilisation": 0,
                "status": "INFO",
                "detail": f"Prop force = {prop_force_kN:.1f} kN/m at {prop_level_m:.1f}m below crest",
            })

        overall = all(c['status'] in ('PASS', 'INFO') for c in checks)
        governing = max((c['utilisation'] for c in checks if c['status'] != 'INFO'), default=0)

        return {
            "Ka": round(Ka_ck, 3),
            "Kp": round(Kp_ck, 3),
            "Pa_total_kN_m": round(Pa_tri + Pa_rect, 1),
            "Pp_kN_m": round(Pp, 1),
            "M_Ed_kNm": round(M_Ed, 0),
            "M_Rd_kNm": round(M_Rd_correct, 0),
            "prop_force_kN_m": round(prop_force_kN, 1),
            "embedment_ratio": round(embedment_ratio, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SheetPileCalculator()
