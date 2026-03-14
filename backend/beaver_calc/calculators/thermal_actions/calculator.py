"""
Thermal actions on structures per EN 1991-1-5.
Uniform temperature component, temperature difference, and resulting
movements/forces for bridges and buildings.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class ThermalActionsCalculator(CalculatorPlugin):
    key = "thermal_actions_v1"
    name = "Thermal Actions"
    version = "1.0.0"
    description = "Thermal actions on structures per EN 1991-1-5"
    category = "actions"
    reference_text = "EN 1991-1-5:2003; UK NA"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Structure type
        structure_type = inputs.get('structure_type', 'building')  # building, bridge_steel, bridge_composite, bridge_concrete
        # Location
        T_max_shade_C = inputs.get('T_max_shade_C', 34)  # UK NA Figure NA.1
        T_min_shade_C = inputs.get('T_min_shade_C', -18)  # UK NA Figure NA.2
        altitude_m = inputs.get('altitude_m', 100)

        # Altitude correction (UK NA: -0.5°C per 100m for max, -1°C per 100m for min)
        T_max = T_max_shade_C - 0.5 * altitude_m / 100
        T_min = T_min_shade_C - 1.0 * altitude_m / 100

        # Uniform bridge temperature (Type 1 deck)
        # EN 1991-1-5 Fig 6.1 / UK NA
        if 'bridge' in structure_type:
            if 'steel' in structure_type:
                # Type 1 (steel)
                Te_max = T_max + 16
                Te_min = T_min - 3
            elif 'composite' in structure_type:
                # Type 2 (composite)
                Te_max = T_max + 4
                Te_min = T_min + 4
            else:
                # Type 3 (concrete)
                Te_max = T_max + 2
                Te_min = T_min + 8
        else:
            # Building: use shade temps directly
            Te_max = T_max
            Te_min = T_min

        # Initial temperature T0
        T0 = inputs.get('T0_C', 10)

        # Expansion / contraction ranges
        delta_T_exp = Te_max - T0
        delta_T_con = T0 - Te_min

        # Free movement
        member_length_m = inputs.get('member_length_m', 30)
        alpha_T = inputs.get('alpha_T_per_C', 12e-6)  # steel default
        delta_L_exp_mm = alpha_T * delta_T_exp * member_length_m * 1000
        delta_L_con_mm = alpha_T * delta_T_con * member_length_m * 1000
        total_range_mm = delta_L_exp_mm + delta_L_con_mm

        # Restrained force (if fully restrained)
        E_MPa = inputs.get('E_MPa', 210000)
        A_mm2 = inputs.get('A_mm2', 10000)
        F_restrained_exp_kN = alpha_T * delta_T_exp * E_MPa * A_mm2 / 1000
        F_restrained_con_kN = alpha_T * delta_T_con * E_MPa * A_mm2 / 1000

        # Temperature difference (vertical gradient)
        # EN 1991-1-5 cl 6.1.4 / UK NA
        if 'bridge' in structure_type:
            DT_heat = inputs.get('DT_heating_C', 13)  # Type 3 heating top > bottom
            DT_cool = inputs.get('DT_cooling_C', -8)
        else:
            DT_heat = inputs.get('DT_heating_C', 10)
            DT_cool = inputs.get('DT_cooling_C', -5)

        # Combination factors ψ (UK NA/EN 1990)
        psi_0 = 0.6  # EN 1990 Table A1.1 for thermal
        psi_1 = 0.5
        psi_2 = 0.0

        # Joint/bearing movement range
        joint_capacity_mm = inputs.get('joint_capacity_mm', 0)
        if joint_capacity_mm > 0:
            joint_ratio = total_range_mm / joint_capacity_mm
        else:
            joint_ratio = 0

        checks = [
            {"name": "Expansion movement",
              "utilisation": 0,
              "status": "INFO",
              "detail": f"ΔL_exp={delta_L_exp_mm:.1f}mm (ΔT={delta_T_exp:.1f}°C, L={member_length_m}m)"},
            {"name": "Contraction movement",
              "utilisation": 0,
              "status": "INFO",
              "detail": f"ΔL_con={delta_L_con_mm:.1f}mm (ΔT={delta_T_con:.1f}°C)"},
            {"name": "Total movement range",
              "utilisation": 0,
              "status": "INFO",
              "detail": f"Total={total_range_mm:.1f}mm"},
        ]

        if joint_capacity_mm > 0:
            checks.append({
                "name": "Joint capacity",
                "utilisation": round(joint_ratio * 100, 1),
                "status": "PASS" if joint_ratio <= 1.0 else "FAIL",
                "detail": f"Range={total_range_mm:.1f}mm / Joint={joint_capacity_mm:.1f}mm",
            })

        checks.append({
            "name": "Restrained force (expansion)",
            "utilisation": 0,
            "status": "INFO",
            "detail": f"F={F_restrained_exp_kN:.0f} kN (if fully restrained, A={A_mm2}mm²)",
        })

        overall = all(c['status'] in ('PASS', 'INFO') for c in checks)
        governing = max((c['utilisation'] for c in checks if c['status'] not in ('INFO',)), default=0)

        return {
            "Te_max_C": round(Te_max, 1),
            "Te_min_C": round(Te_min, 1),
            "delta_T_expansion_C": round(delta_T_exp, 1),
            "delta_T_contraction_C": round(delta_T_con, 1),
            "delta_L_expansion_mm": round(delta_L_exp_mm, 1),
            "delta_L_contraction_mm": round(delta_L_con_mm, 1),
            "total_movement_mm": round(total_range_mm, 1),
            "F_restrained_exp_kN": round(F_restrained_exp_kN, 0),
            "DT_heating_C": DT_heat,
            "DT_cooling_C": DT_cool,
            "psi_0": psi_0,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = ThermalActionsCalculator()
