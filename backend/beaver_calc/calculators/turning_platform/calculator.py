"""
Turning / reversing platform design per DMRB CD 109 / BS 6677.
Checks platform geometry for vehicle swept path, structural capacity,
edge protection and gradient requirements.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class TurningPlatformCalculator(CalculatorPlugin):
    key = "turning_platform_v1"
    name = "Turning Platform"
    version = "1.0.0"
    description = "Turning / reversing platform design per DMRB CD 109"
    category = "temporary-works"
    reference_text = "DMRB CD 109; BS 6677; CIRIA C579"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Vehicle parameters
        vehicle_length_m = inputs.get('vehicle_length_m', 12.0)
        wheelbase_m = inputs.get('wheelbase_m', 6.3)
        front_overhang_m = inputs.get('front_overhang_m', 1.5)
        rear_overhang_m = inputs.get('rear_overhang_m', 2.5)
        track_width_m = inputs.get('track_width_m', 2.5)
        max_steer_angle_deg = inputs.get('max_steer_angle_deg', 45)

        # Platform parameters
        platform_width_m = inputs.get('platform_width_m', 20.0)
        platform_length_m = inputs.get('platform_length_m', 25.0)
        gradient_pct = inputs.get('gradient_pct', 2.0)  # %
        edge_protection = inputs.get('edge_protection', True)

        # Structural — bearing capacity
        axle_load_kN = inputs.get('axle_load_kN', 120.0)
        contact_area_m2 = inputs.get('contact_area_m2', 0.06)  # per tyre
        platform_bearing_kPa = inputs.get('platform_bearing_kPa', 300.0)

        # Minimum turning circle (Ackermann geometry)
        steer_rad = math.radians(max_steer_angle_deg)
        if steer_rad > 0:
            R_inner = wheelbase_m / math.tan(steer_rad)
        else:
            R_inner = 1e6

        R_outer = math.sqrt(R_inner ** 2 + wheelbase_m ** 2) + track_width_m / 2
        R_inner_edge = R_inner - track_width_m / 2

        # Tail swing
        tail_swing = math.sqrt((R_inner + track_width_m / 2) ** 2 + rear_overhang_m ** 2) - R_outer
        tail_swing = max(tail_swing, 0)

        # Swept width
        swept_width = R_outer - R_inner_edge + tail_swing
        turning_diameter = 2 * R_outer

        # Platform adequacy — inscribed circle
        min_dim = min(platform_width_m, platform_length_m)
        required_diameter = turning_diameter + 2.0  # 1m clearance each side
        geom_util = required_diameter / min_dim if min_dim > 0 else 999

        # Three-point turn check (if platform too small for full turn)
        three_pt_length = 2 * R_outer + vehicle_length_m
        three_pt_width = swept_width + 2.0
        three_pt_ok = (platform_length_m >= three_pt_length and
                       platform_width_m >= three_pt_width)

        # Contact pressure check
        n_tyres = inputs.get('n_tyres_axle', 4)  # dual tyres on rear axle
        contact_pressure = axle_load_kN / (n_tyres * contact_area_m2)
        bearing_util = contact_pressure / platform_bearing_kPa if platform_bearing_kPa > 0 else 999

        # Gradient check (max 8% for HGVs, recommended 5%)
        gradient_limit = inputs.get('gradient_limit_pct', 8.0)
        gradient_util = gradient_pct / gradient_limit if gradient_limit > 0 else 999

        # Edge protection (required if >600mm drop or near excavation)
        edge_ok = edge_protection

        checks = []

        checks.append({
            "name": "Full-turn geometry",
            "utilisation": round(geom_util, 3),
            "status": "PASS" if geom_util <= 1.0 else "FAIL",
            "detail": (f"Turning Ø = {turning_diameter:.1f}m + 2m clearance = "
                       f"{required_diameter:.1f}m vs platform min dim {min_dim:.1f}m")
        })

        if geom_util > 1.0 and three_pt_ok:
            checks.append({
                "name": "Three-point turn geometry",
                "utilisation": 0.9,
                "status": "PASS",
                "detail": (f"3-pt requires {three_pt_length:.1f}m × {three_pt_width:.1f}m — "
                           f"platform {platform_length_m:.1f}m × {platform_width_m:.1f}m OK")
            })

        checks.append({
            "name": "Bearing capacity",
            "utilisation": round(bearing_util, 3),
            "status": "PASS" if bearing_util <= 1.0 else "FAIL",
            "detail": (f"Contact pressure = {contact_pressure:.0f} kPa vs "
                       f"bearing = {platform_bearing_kPa:.0f} kPa ({bearing_util * 100:.0f}%)")
        })

        checks.append({
            "name": "Gradient",
            "utilisation": round(gradient_util, 3),
            "status": "PASS" if gradient_util <= 1.0 else "FAIL",
            "detail": f"{gradient_pct:.1f}% vs max {gradient_limit:.0f}% ({gradient_util * 100:.0f}%)"
        })

        checks.append({
            "name": "Edge protection",
            "utilisation": 0 if edge_ok else 1.5,
            "status": "PASS" if edge_ok else "FAIL",
            "detail": "Edge protection provided" if edge_ok else "Edge protection required"
        })

        governing = max(c["utilisation"] for c in checks)
        overall = "PASS" if all(c["status"] == "PASS" for c in checks) else "FAIL"

        return {
            "R_inner_m": round(R_inner_edge, 2),
            "R_outer_m": round(R_outer, 2),
            "swept_width_m": round(swept_width, 2),
            "turning_diameter_m": round(turning_diameter, 2),
            "tail_swing_m": round(tail_swing, 2),
            "three_pt_ok": three_pt_ok,
            "contact_pressure_kPa": round(contact_pressure, 0),
            "checks": checks,
            "overall_status": overall,
            "utilisation": round(governing * 100, 1),
        }


calculator = TurningPlatformCalculator()
