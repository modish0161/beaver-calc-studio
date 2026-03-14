"""
Crane pad design calculator (BS 5975)
"""
from typing import Dict, Any
import math

from ..base import CalculatorPlugin


class CranePadDesignCalculator(CalculatorPlugin):
    """Crane pad/working platform design calculator"""

    key = "crane_pad_design_v1"
    name = "Crane Pad/Working Platform Design"
    version = "1.0.0"
    description = "Design of crane pads and working platforms"
    category = "temporary_works"
    reference_text = "BS 5975:2019 - Code of practice for temporary works procedures"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Crane pad design calculation"""

        # Extract inputs
        crane_load_kN = inputs.get('crane_load_kN', 1000)
        pad_length_m = inputs.get('pad_length_m', 3.0)
        pad_width_m = inputs.get('pad_width_m', 3.0)
        ground_bearing_capacity_kN_m2 = inputs.get('ground_bearing_capacity_kN_m2', 200)
        safety_factor = inputs.get('safety_factor', 2.0)

        # Calculate pad area
        pad_area_m2 = pad_length_m * pad_width_m

        # Design bearing pressure
        design_load_kN = crane_load_kN * safety_factor
        design_bearing_pressure_kN_m2 = design_load_kN / pad_area_m2

        # Check against ground capacity
        utilisation = design_bearing_pressure_kN_m2 / ground_bearing_capacity_kN_m2
        bearing_check = utilisation <= 1.0

        # Calculate required thickness (simplified)
        # Assume granular material with some bearing capacity
        required_thickness_m = max(0.3, design_bearing_pressure_kN_m2 / 1000)  # Simplified

        # Stability check (overturning)
        # Simplified - assume load at center
        overturning_moment = crane_load_kN * (pad_length_m / 2)
        stabilizing_moment = pad_area_m2 * ground_bearing_capacity_kN_m2 * (pad_length_m / 2)
        stability_ratio = stabilizing_moment / overturning_moment if overturning_moment > 0 else float('inf')
        stability_check = stability_ratio >= 1.5

        return {
            "design_load_kN": round(design_load_kN, 2),
            "pad_area_m2": round(pad_area_m2, 2),
            "design_bearing_pressure_kN_m2": round(design_bearing_pressure_kN_m2, 2),
            "ground_capacity_kN_m2": ground_bearing_capacity_kN_m2,
            "utilisation_bearing": round(utilisation, 3),
            "bearing_check": bearing_check,
            "required_thickness_m": round(required_thickness_m, 2),
            "stability_ratio": round(stability_ratio, 2),
            "stability_check": stability_check,
            "overall_check": bearing_check and stability_check,
            "notes": ["Simplified design - detailed geotechnical assessment required"]
        }


calculator = CranePadDesignCalculator()
