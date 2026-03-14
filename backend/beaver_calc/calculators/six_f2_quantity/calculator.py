"""
6F2 aggregate quantity take-off calculator.
Computes volume, tonnage, and truck deliveries for Type 1 / 6F2 fill materials
per SHW Series 600.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SixF2QuantityCalculator(CalculatorPlugin):
    key = "six_f2_quantity_v1"
    name = "6F2 Quantity"
    version = "1.0.0"
    description = "6F2 / Type 1 sub-base aggregate quantity take-off per SHW Series 600"
    category = "quantities"
    reference_text = "SHW Series 600; BS EN 13285"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Plan area and depth
        length_m = inputs.get('length_m', 50)
        width_m = inputs.get('width_m', 10)
        depth_mm = inputs.get('depth_mm', 300)
        # Alternatively accept direct volume
        volume_m3_override = inputs.get('volume_m3', 0)

        # Material properties
        compacted_density_t_m3 = inputs.get('compacted_density_t_m3', 2.1)
        bulking_factor = inputs.get('bulking_factor', 1.25)  # loose vs compacted
        wastage_pct = inputs.get('wastage_pct', 5)

        # Transport
        truck_capacity_t = inputs.get('truck_capacity_t', 20)
        truck_volume_m3 = inputs.get('truck_volume_m3', 10)

        # Compacted volume
        if volume_m3_override > 0:
            compacted_vol_m3 = volume_m3_override
        else:
            compacted_vol_m3 = length_m * width_m * (depth_mm / 1000)

        # Apply wastage
        design_vol_m3 = compacted_vol_m3 * (1 + wastage_pct / 100)

        # Loose volume for delivery
        loose_vol_m3 = design_vol_m3 * bulking_factor

        # Tonnage (based on compacted density × design volume)
        tonnage = design_vol_m3 * compacted_density_t_m3

        # Truck loads (governed by weight or volume)
        trucks_by_weight = math.ceil(tonnage / truck_capacity_t) if truck_capacity_t > 0 else 0
        trucks_by_volume = math.ceil(loose_vol_m3 / truck_volume_m3) if truck_volume_m3 > 0 else 0
        trucks_required = max(trucks_by_weight, trucks_by_volume)

        # Layer passes (typical max compacted layer = 225 mm for 6F2)
        max_layer_mm = inputs.get('max_layer_thickness_mm', 225)
        n_layers = math.ceil(depth_mm / max_layer_mm) if max_layer_mm > 0 else 1

        checks = [
            {"name": "Compacted volume",
             "utilisation": 0,
             "status": "INFO",
             "detail": f"{compacted_vol_m3:.1f} m³ ({length_m}×{width_m}×{depth_mm}mm)"},
            {"name": "Design volume (inc. wastage)",
             "utilisation": 0,
             "status": "INFO",
             "detail": f"{design_vol_m3:.1f} m³ ({wastage_pct}% wastage)"},
            {"name": "Tonnage required",
             "utilisation": 0,
             "status": "INFO",
             "detail": f"{tonnage:.1f} t @ {compacted_density_t_m3} t/m³"},
            {"name": "Truck deliveries",
             "utilisation": 0,
             "status": "INFO",
             "detail": f"{trucks_required} loads ({trucks_by_weight} by wt, {trucks_by_volume} by vol)"},
            {"name": "Compaction layers",
             "utilisation": 0,
             "status": "INFO",
             "detail": f"{n_layers} layers @ max {max_layer_mm}mm compacted"},
        ]

        return {
            "compacted_volume_m3": round(compacted_vol_m3, 1),
            "design_volume_m3": round(design_vol_m3, 1),
            "loose_volume_m3": round(loose_vol_m3, 1),
            "tonnage_t": round(tonnage, 1),
            "trucks_required": trucks_required,
            "n_layers": n_layers,
            "checks": checks,
            "overall_status": "PASS",
            "utilisation": 0,
        }


calculator = SixF2QuantityCalculator()
