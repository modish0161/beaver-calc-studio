"""
Sheet pile excavation support — cantilever & propped analysis.
Lateral earth pressure (Rankine), embedment depth, prop force.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class ExcavationSheetPileCalculator(CalculatorPlugin):
    key = "excavation_sheet_pile_v1"
    name = "Excavation Sheet Pile"
    version = "1.0.0"
    description = "Sheet pile excavation support design to EN 1997-1"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 cl 9, BS 8002:2015"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        H = inputs.get('excavation_depth_m', 4.0)
        phi_deg = inputs.get('friction_angle_deg', 30)
        gamma_soil = inputs.get('soil_unit_weight_kNm3', 18)
        c_kPa = inputs.get('cohesion_kPa', 0)
        surcharge_kPa = inputs.get('surcharge_kPa', 10)
        water_depth_m = inputs.get('water_depth_m', 0)
        gamma_w = 9.81
        propped = inputs.get('propped', True)
        prop_depth_m = inputs.get('prop_depth_m', 1.0)
        # Section
        section_modulus_cm3 = inputs.get('section_modulus_cm3', 2000)
        fy_pile = inputs.get('pile_fy_MPa', 355)

        phi_rad = math.radians(phi_deg)
        Ka = (1 - math.sin(phi_rad)) / (1 + math.sin(phi_rad))
        Kp = 1 / Ka

        gamma_R = 1.4  # partial factor on passive resistance

        if propped:
            # Propped cantilever — free earth support method
            # Active pressure at excavation level
            sigma_a_H = Ka * gamma_soil * H + Ka * surcharge_kPa - 2 * c_kPa * math.sqrt(Ka)
            sigma_a_H = max(sigma_a_H, 0)

            # Embedment by moment equilibrium about prop
            # Iterative: find d where passive moment ≥ active moment
            d = 0.5
            for _ in range(200):
                # Active force & moment about prop
                F_a = 0.5 * Ka * gamma_soil * (H + d) ** 2 + Ka * surcharge_kPa * (H + d) - 2 * c_kPa * math.sqrt(Ka) * (H + d)
                F_a = max(F_a, 0)
                y_a = (H + d) / 3  # from base

                # Passive force (below excavation)
                F_p = 0.5 * Kp * gamma_soil * d ** 2 + 2 * c_kPa * math.sqrt(Kp) * d
                F_p_design = F_p / gamma_R
                y_p = d / 3

                # Moments about prop
                M_active = F_a * ((H + d) - prop_depth_m - y_a)
                M_passive = F_p_design * (H - prop_depth_m + y_p)

                if M_passive >= M_active:
                    break
                d += 0.05

            total_length = H + d * 1.2  # 20% extra embedment

            # Prop force (horizontal equilibrium)
            prop_force = F_a - F_p_design

            # Maximum bending moment (approximate)
            z_max = prop_depth_m + (H - prop_depth_m) * 0.6
            M_max = prop_force * (z_max - prop_depth_m) - 0.5 * Ka * gamma_soil * z_max ** 2 * z_max / 3
            M_max = abs(M_max) if M_max != 0 else F_a * (H + d) / 10
        else:
            # Cantilever — fixed earth support
            d = 0.5
            for _ in range(200):
                F_a = 0.5 * Ka * gamma_soil * (H + d) ** 2 + Ka * surcharge_kPa * (H + d)
                F_p = 0.5 * Kp * gamma_soil * d ** 2 / gamma_R

                M_a = F_a * (H + d) / 3
                M_p = F_p * d / 3

                if M_p >= M_a * 1.5:
                    break
                d += 0.05

            total_length = H + d * 1.2
            prop_force = 0
            M_max = 0.5 * Ka * gamma_soil * (H + d) ** 2 * (H + d) / 6

        # Section check
        M_Rd = section_modulus_cm3 * 1e3 * fy_pile / 1e6  # kNm (cm3 → mm3)
        util_bending = M_max / M_Rd if M_Rd > 0 else float('inf')

        # Embedment ratio check
        embed_ratio = d / H if H > 0 else 0

        checks = [
            {"name": "Pile bending", "utilisation": round(util_bending * 100, 1),
             "status": "PASS" if util_bending <= 1.0 else "FAIL",
             "detail": f"M_max={M_max:.1f} kNm / M_Rd={M_Rd:.1f} kNm"},
            {"name": "Embedment depth", "utilisation": round(min(embed_ratio / 0.6, 1.0) * 100, 1),
             "status": "PASS" if embed_ratio >= 0.3 else "FAIL",
             "detail": f"d={d:.2f} m, d/H={embed_ratio:.2f}"},
            {"name": "Overall stability", "utilisation": round(util_bending * 100, 1),
             "status": "PASS" if util_bending <= 1.0 else "FAIL",
             "detail": f"Total pile length = {total_length:.2f} m"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "Ka": round(Ka, 3), "Kp": round(Kp, 3),
            "embedment_m": round(d, 2),
            "total_length_m": round(total_length, 2),
            "prop_force_kN_m": round(prop_force, 1),
            "M_max_kNm": round(M_max, 1),
            "M_Rd_kNm": round(M_Rd, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(util_bending * 100, 1),
        }


calculator = ExcavationSheetPileCalculator()
