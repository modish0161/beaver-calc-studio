"""
Haul road design — pavement thickness, gradient, width, drainage.
Based on CIRIA C758 and HA guidance for temporary haul roads.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class HaulRoadCalculator(CalculatorPlugin):
    key = "haul_road_v1"
    name = "Haul Road Design"
    version = "1.0.0"
    description = "Temporary haul road design per CIRIA C758"
    category = "temporary_works"
    reference_text = "CIRIA C758, BRE 470"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Vehicle
        axle_load_kN = inputs.get('axle_load_kN', 200)  # max loaded axle
        tyre_pressure_kPa = inputs.get('tyre_pressure_kPa', 700)
        n_passes = inputs.get('number_passes', 1000)
        # Subgrade
        cbr_percent = inputs.get('cbr_percent', 5)
        # Road geometry
        road_width_m = inputs.get('road_width_m', 6.0)
        gradient_percent = inputs.get('gradient_percent', 8)
        turning_radius_m = inputs.get('turning_radius_m', 15)
        # Vehicle dimensions
        vehicle_width_m = inputs.get('vehicle_width_m', 3.5)

        # CBR-based pavement thickness (simplified Boussinesq / TRL method)
        # log(N) approach: thickness = k * (P / CBR)^0.5
        if cbr_percent <= 0:
            cbr_percent = 1
        P_contact = axle_load_kN / 2  # per wheel
        # Equivalent passes factor
        log_N = math.log10(max(n_passes, 1))
        k = 0.024 + 0.006 * log_N

        # Required granular thickness (mm)
        t_req = k * P_contact / cbr_percent * 1000
        t_req = max(t_req, 150)  # minimum 150mm

        # Recommended layers
        t_capping = max(t_req * 0.6, 150) if cbr_percent < 5 else 0
        t_sub_base = max(t_req - t_capping, 200)
        t_total = t_capping + t_sub_base

        # Width check (2× vehicle width + 2m)
        min_width_single = vehicle_width_m + 1.0
        min_width_two_way = 2 * vehicle_width_m + 2.0
        two_way = road_width_m >= min_width_two_way
        width_ok = road_width_m >= min_width_single

        # Gradient check (max 10% for loaded vehicles, 15% unloaded)
        max_gradient = 10
        gradient_ok = gradient_percent <= max_gradient

        # Turning radius (min 3× vehicle length typically)
        vehicle_length_m = inputs.get('vehicle_length_m', 10)
        min_radius = 3 * vehicle_length_m
        radius_ok = turning_radius_m >= min_radius

        # Crossfall for drainage (2-5%)
        crossfall_percent = inputs.get('crossfall_percent', 3)
        crossfall_ok = 2 <= crossfall_percent <= 5

        util_pavement = t_req / t_total if t_total > 0 else float('inf')

        checks = [
            {"name": "Pavement thickness", "utilisation": round(util_pavement * 100, 1),
             "status": "PASS" if t_total >= t_req else "FAIL",
             "detail": f"Required={t_req:.0f} mm, Provided={t_total:.0f} mm"},
            {"name": "Road width", "utilisation": round(min_width_single / road_width_m * 100, 1) if road_width_m > 0 else 999,
             "status": "PASS" if width_ok else "FAIL",
             "detail": f"Width={road_width_m:.1f} m ({'two-way' if two_way else 'single lane'})"},
            {"name": "Gradient", "utilisation": round(gradient_percent / max_gradient * 100, 1),
             "status": "PASS" if gradient_ok else "FAIL",
             "detail": f"Gradient={gradient_percent}% (max {max_gradient}%)"},
            {"name": "Turning radius", "utilisation": round(min_radius / turning_radius_m * 100, 1) if turning_radius_m > 0 else 999,
             "status": "PASS" if radius_ok else "FAIL",
             "detail": f"R={turning_radius_m:.1f} m (min {min_radius:.1f} m)"},
            {"name": "Drainage crossfall", "utilisation": round(crossfall_percent / 5 * 100, 1),
             "status": "PASS" if crossfall_ok else "FAIL",
             "detail": f"Crossfall={crossfall_percent}% (target 2-5%)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "t_required_mm": round(t_req, 0),
            "t_capping_mm": round(t_capping, 0),
            "t_sub_base_mm": round(t_sub_base, 0),
            "t_total_mm": round(t_total, 0),
            "two_way_traffic": two_way,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = HaulRoadCalculator()
