"""
Pad footing bearing check (EN 1997-1)
"""
from typing import Dict, Any
import math

from ..base import CalculatorPlugin


class PadFootingBearingCalculator(CalculatorPlugin):
    """Pad/strip footing bearing pressure and sliding check"""

    key = "pad_footing_bearing_v1"
    name = "Pad Footing Bearing Check"
    version = "1.0.0"
    description = "Ultimate and serviceability limit state checks for pad footings"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 - Geotechnical design - General rules"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Pad footing bearing calculation"""

        # Extract inputs
        footing_length_m = inputs.get('footing_length_m', 2.0)
        footing_width_m = inputs.get('footing_width_m', 2.0)
        vertical_load_kN = inputs.get('vertical_load_kN', 500)
        horizontal_load_kN = inputs.get('horizontal_load_kN', 50)
        moment_kNm = inputs.get('moment_kNm', 100)

        # Soil properties
        soil_bearing_capacity_kN_m2 = inputs.get('soil_bearing_capacity_kN_m2', 200)
        soil_unit_weight_kN_m3 = inputs.get('soil_unit_weight_kN_m3', 18)
        soil_friction_angle_deg = inputs.get('soil_friction_angle_deg', 30)

        # Partial safety factors
        gamma_v = inputs.get('gamma_v', 1.4)  # Vertical load factor
        gamma_h = inputs.get('gamma_h', 1.3)  # Horizontal load factor
        gamma_m = inputs.get('gamma_m', 1.0)  # Material factor

        # Calculate footing area and design loads
        footing_area_m2 = footing_length_m * footing_width_m
        V_d_kN = vertical_load_kN * gamma_v
        H_d_kN = horizontal_load_kN * gamma_h
        M_d_kNm = moment_kNm * gamma_h

        # Calculate bearing pressure (simplified - no eccentricity)
        sigma_v_kN_m2 = V_d_kN / footing_area_m2

        # Bearing capacity check
        bearing_capacity_kN_m2 = soil_bearing_capacity_kN_m2 / gamma_m
        utilisation_bearing = sigma_v_kN_m2 / bearing_capacity_kN_m2
        bearing_check = utilisation_bearing <= 1.0

        # Sliding check
        friction_coefficient = math.tan(math.radians(soil_friction_angle_deg))
        sliding_resistance_kN = V_d_kN * friction_coefficient
        utilisation_sliding = H_d_kN / sliding_resistance_kN if sliding_resistance_kN > 0 else float('inf')
        sliding_check = utilisation_sliding <= 1.0

        # Overall check
        overall_check = bearing_check and sliding_check

        return {
            "footing_area_m2": round(footing_area_m2, 2),
            "V_d_kN": round(V_d_kN, 2),
            "H_d_kN": round(H_d_kN, 2),
            "M_d_kNm": round(M_d_kNm, 2),
            "sigma_v_kN_m2": round(sigma_v_kN_m2, 2),
            "bearing_capacity_kN_m2": round(bearing_capacity_kN_m2, 2),
            "utilisation_bearing": round(utilisation_bearing, 3),
            "bearing_check": bearing_check,
            "sliding_resistance_kN": round(sliding_resistance_kN, 2),
            "utilisation_sliding": round(utilisation_sliding, 3),
            "sliding_check": sliding_check,
            "overall_check": overall_check,
            "soil_friction_angle_deg": soil_friction_angle_deg,
            "notes": ["Simplified analysis - detailed geotechnical investigation required"]
        }


calculator = PadFootingBearingCalculator()
