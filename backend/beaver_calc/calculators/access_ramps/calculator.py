"""
Access ramps design (BS 8300:2018 / Approved Document M)
Checks gradient, width, landing, surface drainage and vehicle clearance.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class AccessRampsCalculator(CalculatorPlugin):
    key = "access_ramps_v1"
    name = "Access Ramps Design"
    version = "1.0.0"
    description = "Ramp gradient, width, landing and drainage checks to BS 8300"
    category = "site"
    reference_text = "BS 8300:2018 / Approved Document M"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        rise_mm = inputs.get('rise_mm', 600)
        going_mm = inputs.get('going_mm', 6000)
        width_mm = inputs.get('width_mm', 1500)
        landing_length_mm = inputs.get('landing_length_mm', 1500)
        cross_fall_pct = inputs.get('cross_fall_pct', 1.5)
        surface_type = inputs.get('surface_type', 'tarmac')
        is_vehicle_ramp = inputs.get('is_vehicle_ramp', False)
        vehicle_height_mm = inputs.get('vehicle_height_mm', 4500)
        headroom_mm = inputs.get('headroom_mm', 2300)

        # Gradient calculation
        gradient = rise_mm / going_mm if going_mm > 0 else float('inf')
        gradient_ratio = f"1:{round(1 / gradient, 1)}" if gradient > 0 else "flat"

        # BS 8300 limits
        if rise_mm <= 500:
            max_gradient = 1 / 12
        elif rise_mm <= 2000:
            max_gradient = 1 / 15
        else:
            max_gradient = 1 / 20
        util_gradient = gradient / max_gradient if max_gradient > 0 else 0
        gradient_ok = gradient <= max_gradient

        # Width check (BS 8300: min 1500mm for 2-way, 1200mm for 1-way)
        min_width_mm = 1500
        util_width = min_width_mm / width_mm if width_mm > 0 else float('inf')
        width_ok = width_mm >= min_width_mm

        # Landing length check (min 1500mm clear)
        min_landing_mm = 1500
        util_landing = min_landing_mm / landing_length_mm if landing_length_mm > 0 else float('inf')
        landing_ok = landing_length_mm >= min_landing_mm

        # Cross-fall / drainage (1-2.5% acceptable)
        crossfall_ok = 1.0 <= cross_fall_pct <= 2.5

        # Number of flights needed (max 10m going per flight BS 8300)
        max_flight_mm = 10000
        num_flights = max(1, math.ceil(going_mm / max_flight_mm))
        total_length_mm = going_mm + (num_flights - 1) * landing_length_mm

        # Headroom check (vehicles)
        headroom_ok = True
        util_headroom = 0.0
        if is_vehicle_ramp:
            min_headroom_mm = vehicle_height_mm + 300
            util_headroom = min_headroom_mm / headroom_mm if headroom_mm > 0 else float('inf')
            headroom_ok = headroom_mm >= min_headroom_mm

        # Surface slip resistance (PTV = Pendulum Test Value)
        ptv_map = {'tarmac': 65, 'concrete': 50, 'resin_bound': 70, 'block_paving': 55, 'timber': 35}
        ptv = ptv_map.get(surface_type, 45)
        min_ptv = 45 if not is_vehicle_ramp else 36
        surface_ok = ptv >= min_ptv

        overall = all([gradient_ok, width_ok, landing_ok, crossfall_ok, headroom_ok, surface_ok])

        checks = [
            {"name": "Gradient", "utilisation": round(util_gradient * 100, 1), "status": "PASS" if gradient_ok else "FAIL",
             "detail": f"{gradient_ratio} vs max 1:{round(1/max_gradient)}"},
            {"name": "Width", "utilisation": round(util_width * 100, 1), "status": "PASS" if width_ok else "FAIL",
             "detail": f"{width_mm}mm vs min {min_width_mm}mm"},
            {"name": "Landing Length", "utilisation": round(util_landing * 100, 1), "status": "PASS" if landing_ok else "FAIL",
             "detail": f"{landing_length_mm}mm vs min {min_landing_mm}mm"},
            {"name": "Cross-fall Drainage", "utilisation": round(cross_fall_pct / 2.5 * 100, 1),
             "status": "PASS" if crossfall_ok else "FAIL",
             "detail": f"{cross_fall_pct}% (1.0-2.5% acceptable)"},
            {"name": "Surface Slip Resistance", "utilisation": round(min_ptv / ptv * 100, 1) if ptv > 0 else 0,
             "status": "PASS" if surface_ok else "FAIL",
             "detail": f"PTV {ptv} vs min {min_ptv}"},
        ]
        if is_vehicle_ramp:
            checks.append({"name": "Vehicle Headroom", "utilisation": round(util_headroom * 100, 1),
                           "status": "PASS" if headroom_ok else "FAIL",
                           "detail": f"{headroom_mm}mm vs min {vehicle_height_mm + 300}mm"})

        return {
            "gradient": round(gradient, 4),
            "gradient_ratio": gradient_ratio,
            "num_flights": num_flights,
            "total_length_mm": round(total_length_mm, 0),
            "ptv": ptv,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(max(util_gradient, util_width, util_landing) * 100, 1),
        }


calculator = AccessRampsCalculator()
