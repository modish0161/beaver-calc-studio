"""
Swept path / turning circle analysis for construction vehicles.
Computes inner/outer swept radii per DMRB CD 109 / BS 6677.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SweptPathCalculator(CalculatorPlugin):
    key = "swept_path_v1"
    name = "Swept Path"
    version = "1.0.0"
    description = "Vehicle swept path / turning circle analysis per DMRB CD 109"
    category = "temporary_works"
    reference_text = "DMRB CD 109; BS 6677"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Vehicle parameters
        vehicle_type = inputs.get('vehicle_type', 'articulated_truck')
        wheelbase_m = inputs.get('wheelbase_m', 6.0)
        front_overhang_m = inputs.get('front_overhang_m', 1.5)
        rear_overhang_m = inputs.get('rear_overhang_m', 1.0)
        vehicle_width_m = inputs.get('vehicle_width_m', 2.5)
        # For articulated
        tractor_wheelbase_m = inputs.get('tractor_wheelbase_m', 3.6)
        trailer_wheelbase_m = inputs.get('trailer_wheelbase_m', 8.0)
        kingpin_to_rear_axle_m = inputs.get('kingpin_to_rear_axle_m', 8.0)

        # Steering
        max_steering_angle_deg = inputs.get('max_steering_angle_deg', 52)

        # Road/path
        lane_width_m = inputs.get('lane_width_m', 3.65)
        road_centreline_radius_m = inputs.get('road_centreline_radius_m', 12.5)

        is_articulated = vehicle_type in ('articulated_truck', 'artic')

        if is_articulated:
            # Articulated vehicle turning radius
            # Inner radius of rear axle
            R_inner_rear = math.sqrt(road_centreline_radius_m ** 2 - kingpin_to_rear_axle_m ** 2) if road_centreline_radius_m > kingpin_to_rear_axle_m else 0.1
            R_inner_wall = R_inner_rear - vehicle_width_m / 2

            # Outer radius (front corner of tractor)
            R_outer_front = math.sqrt((road_centreline_radius_m + vehicle_width_m / 2) ** 2 + front_overhang_m ** 2)

            # Swept width
            swept_width = R_outer_front - R_inner_wall
            effective_wb = kingpin_to_rear_axle_m
        else:
            # Rigid vehicle (Ackermann geometry)
            # Minimum turning radius at front outer wheel
            alpha_rad = math.radians(max_steering_angle_deg)
            if math.tan(alpha_rad) > 0.01:
                R_min_outer = wheelbase_m / math.sin(alpha_rad)
            else:
                R_min_outer = 999

            # Inner rear radius
            R_inner_rear = math.sqrt(R_min_outer ** 2 - wheelbase_m ** 2) - vehicle_width_m / 2
            R_inner_wall = R_inner_rear

            # Outer front corner
            R_outer_front = math.sqrt((R_inner_rear + vehicle_width_m) ** 2 + (wheelbase_m + front_overhang_m) ** 2)

            swept_width = R_outer_front - R_inner_wall
            effective_wb = wheelbase_m

        # Check against lane/road width
        available_width = lane_width_m * 2 if lane_width_m else swept_width * 1.5
        width_ratio = swept_width / available_width if available_width > 0 else 999

        # Wall-to-wall turning circle diameter
        turning_circle_m = 2 * R_outer_front

        # Tail swing (rear overhang sweeps outside inner radius)
        tail_swing_m = math.sqrt((R_inner_rear + vehicle_width_m) ** 2 + rear_overhang_m ** 2) - (R_inner_rear + vehicle_width_m)

        checks = [
            {"name": "Swept width vs available",
             "utilisation": round(width_ratio * 100, 1),
             "status": "PASS" if width_ratio <= 1.0 else "FAIL",
             "detail": f"Swept={swept_width:.1f}m / Available={available_width:.1f}m"},
            {"name": "Turning circle diameter",
             "utilisation": 0,
             "status": "INFO",
             "detail": f"Wall-to-wall Ø={turning_circle_m:.1f}m"},
            {"name": "Tail swing",
             "utilisation": 0,
             "status": "INFO" if tail_swing_m < 1.0 else "WARNING",
             "detail": f"Tail swing = {tail_swing_m:.2f}m beyond body line"},
        ]

        overall = all(c['status'] in ('PASS', 'INFO', 'WARNING') for c in checks)
        governing = max((c['utilisation'] for c in checks if c['status'] not in ('INFO',)), default=0)

        return {
            "R_inner_wall_m": round(R_inner_wall, 2),
            "R_outer_front_m": round(R_outer_front, 2),
            "swept_width_m": round(swept_width, 2),
            "turning_circle_m": round(turning_circle_m, 1),
            "tail_swing_m": round(tail_swing_m, 2),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SweptPathCalculator()
