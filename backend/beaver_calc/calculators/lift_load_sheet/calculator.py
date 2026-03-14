"""
Lift / crane load sheet calculator.
Checks lift weight, sling loads, crane capacity vs radius per BS 7121.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class LiftLoadSheetCalculator(CalculatorPlugin):
    key = "lift_load_sheet_v1"
    name = "Lift Load Sheet"
    version = "1.0.0"
    description = "Crane lift load sheet and capacity check"
    category = "temporary_works"
    reference_text = "BS 7121-1:2016 / BS 7121-3:2017"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Lifted load
        load_mass_kg = inputs.get('load_mass_kg', 5000)
        rigging_mass_kg = inputs.get('rigging_mass_kg', 200)
        hook_block_mass_kg = inputs.get('hook_block_mass_kg', 150)
        # Dynamic factor (BS 7121)
        dynamic_factor = inputs.get('dynamic_factor', 1.1)
        # Crane
        crane_capacity_kg = inputs.get('crane_capacity_at_radius_kg', 10000)
        crane_radius_m = inputs.get('radius_m', 15.0)
        max_radius_m = inputs.get('max_radius_m', 25.0)
        # Wind
        wind_speed_ms = inputs.get('wind_speed_ms', 9.0)
        max_wind_ms = inputs.get('max_wind_speed_ms', 15.0)
        # Slings
        n_slings = inputs.get('n_slings', 4)
        sling_swl_kg = inputs.get('sling_swl_kg', 5000)
        sling_angle_deg = inputs.get('sling_angle_deg', 60)

        # Total lifted weight
        total_load_kg = load_mass_kg + rigging_mass_kg + hook_block_mass_kg
        total_load_dynamic_kg = total_load_kg * dynamic_factor

        # Crane capacity utilisation
        crane_util = total_load_dynamic_kg / crane_capacity_kg if crane_capacity_kg > 0 else 999

        # Sling load (accounting for angle)
        sling_angle_rad = math.radians(sling_angle_deg)
        if n_slings >= 2 and sling_angle_deg > 0:
            # Each sling carries: total / (n_slings * sin(angle from vertical))
            # For sling angle = included angle between sling and vertical
            load_per_sling_kg = total_load_dynamic_kg / (n_slings * math.cos(math.radians(90 - sling_angle_deg / 2)))
        else:
            load_per_sling_kg = total_load_dynamic_kg / max(n_slings, 1)

        sling_util = load_per_sling_kg / sling_swl_kg if sling_swl_kg > 0 else 999

        # Radius check
        radius_util = crane_radius_m / max_radius_m if max_radius_m > 0 else 0

        # Wind check
        wind_util = wind_speed_ms / max_wind_ms if max_wind_ms > 0 else 0
        wind_ok = wind_speed_ms <= max_wind_ms

        # Net capacity (deduction approach)
        net_capacity_kg = crane_capacity_kg - hook_block_mass_kg - rigging_mass_kg
        capacity_ratio = load_mass_kg * dynamic_factor / net_capacity_kg if net_capacity_kg > 0 else 999

        checks = [
            {"name": "Crane capacity at radius",
             "utilisation": round(crane_util * 100, 1),
             "status": "PASS" if crane_util <= 1.0 else "FAIL",
             "detail": f"Total={total_load_dynamic_kg:.0f} kg / capacity={crane_capacity_kg:.0f} kg at {crane_radius_m}m"},
            {"name": "Sling SWL",
             "utilisation": round(sling_util * 100, 1),
             "status": "PASS" if sling_util <= 1.0 else "FAIL",
             "detail": f"Per sling={load_per_sling_kg:.0f} kg / SWL={sling_swl_kg:.0f} kg ({n_slings} slings @ {sling_angle_deg}°)"},
            {"name": "Radius within limit",
             "utilisation": round(radius_util * 100, 1),
             "status": "PASS" if crane_radius_m <= max_radius_m else "FAIL",
             "detail": f"Operating={crane_radius_m}m / max={max_radius_m}m"},
            {"name": "Wind speed limit",
             "utilisation": round(wind_util * 100, 1),
             "status": "PASS" if wind_ok else "FAIL",
             "detail": f"Current={wind_speed_ms} m/s / limit={max_wind_ms} m/s"},
            {"name": "Net capacity (load only)",
             "utilisation": round(capacity_ratio * 100, 1),
             "status": "PASS" if capacity_ratio <= 1.0 else "FAIL",
             "detail": f"Load×dyn={load_mass_kg * dynamic_factor:.0f} kg / net cap={net_capacity_kg:.0f} kg"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "total_load_kg": round(total_load_kg, 0),
            "total_load_dynamic_kg": round(total_load_dynamic_kg, 0),
            "load_per_sling_kg": round(load_per_sling_kg, 0),
            "net_capacity_kg": round(net_capacity_kg, 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = LiftLoadSheetCalculator()
