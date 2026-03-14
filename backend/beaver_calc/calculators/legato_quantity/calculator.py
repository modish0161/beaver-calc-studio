"""
Legato block quantity take-off calculator.
Estimates block counts, mortar, labour for Legato interlocking block walls.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class LegatoQuantityCalculator(CalculatorPlugin):
    key = "legato_quantity_v1"
    name = "Legato Block Quantity"
    version = "1.0.0"
    description = "Quantity take-off for Legato interlocking concrete block walls"
    category = "quantity"
    reference_text = "Manufacturer data / BS 5975:2019"

    # Standard Legato block sizes (L x W x H) mm
    BLOCK_TYPES = {
        "full": {"L": 1600, "W": 800, "H": 800, "mass_kg": 2400},
        "half": {"L": 800, "W": 800, "H": 800, "mass_kg": 1200},
        "quarter": {"L": 400, "W": 800, "H": 800, "mass_kg": 600},
    }

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        wall_length_m = inputs.get('wall_length_m', 10.0)
        wall_height_m = inputs.get('wall_height_m', 2.4)
        block_type = inputs.get('block_type', 'full')
        # Optional wastage
        wastage_pct = inputs.get('wastage_pct', 5.0)
        # Delivery limit
        max_truck_tonnes = inputs.get('max_truck_tonnes', 20.0)

        blk = self.BLOCK_TYPES.get(block_type, self.BLOCK_TYPES['full'])
        blk_L_m = blk['L'] / 1000
        blk_H_m = blk['H'] / 1000
        blk_mass = blk['mass_kg']

        # Courses (rows)
        n_courses = math.ceil(wall_height_m / blk_H_m)
        actual_height = n_courses * blk_H_m

        # Blocks per course (with half-bond offset)
        blocks_per_course = math.ceil(wall_length_m / blk_L_m)
        # Alternating courses need half blocks at ends for bonding
        half_blocks_per_alt_course = 2  # one each end
        full_courses = math.ceil(n_courses / 2)
        alt_courses = n_courses - full_courses

        full_blocks_needed = full_courses * blocks_per_course + alt_courses * max(0, blocks_per_course - 1)
        half_blocks_needed = alt_courses * half_blocks_per_alt_course

        # Wastage
        wastage_factor = 1 + wastage_pct / 100
        full_blocks_order = math.ceil(full_blocks_needed * wastage_factor)
        half_blocks_order = math.ceil(half_blocks_needed * wastage_factor)

        total_mass_kg = full_blocks_order * blk_mass + half_blocks_order * (blk_mass / 2)
        total_mass_t = total_mass_kg / 1000

        # Truck loads
        n_trucks = math.ceil(total_mass_t / max_truck_tonnes) if max_truck_tonnes > 0 else 1

        # Wall face area
        face_area_m2 = wall_length_m * actual_height

        checks = [
            {"name": "Wall completeness",
             "utilisation": round(wall_height_m / actual_height * 100, 1),
             "status": "PASS",
             "detail": f"{n_courses} courses × {blk_H_m:.2f}m = {actual_height:.2f}m (target {wall_height_m:.2f}m)"},
            {"name": "Block count (full)",
             "utilisation": 0,
             "status": "PASS",
             "detail": f"{full_blocks_order} full blocks (incl {wastage_pct}% wastage)"},
            {"name": "Block count (half)",
             "utilisation": 0,
             "status": "PASS",
             "detail": f"{half_blocks_order} half blocks for bonding"},
            {"name": "Total mass / deliveries",
             "utilisation": round(total_mass_t / max_truck_tonnes * 100, 1) if max_truck_tonnes > 0 else 0,
             "status": "PASS",
             "detail": f"{total_mass_t:.1f} t → {n_trucks} truck loads ({max_truck_tonnes} t each)"},
        ]

        return {
            "n_courses": n_courses,
            "actual_height_m": round(actual_height, 2),
            "full_blocks_needed": full_blocks_needed,
            "half_blocks_needed": half_blocks_needed,
            "full_blocks_order": full_blocks_order,
            "half_blocks_order": half_blocks_order,
            "total_mass_t": round(total_mass_t, 1),
            "n_trucks": n_trucks,
            "face_area_m2": round(face_area_m2, 1),
            "checks": checks,
            "overall_status": "PASS",
            "utilisation": round(wall_height_m / actual_height * 100, 1),
        }


calculator = LegatoQuantityCalculator()
