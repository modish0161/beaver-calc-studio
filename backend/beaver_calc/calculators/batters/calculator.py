"""
Batters / slope angle stability check (BS 6031 / EN 1997-1)
Checks maximum safe batter angle for excavations and embankments.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class BattersCalculator(CalculatorPlugin):
    key = "batters_v1"
    name = "Batters / Slope Angle Check"
    version = "1.0.0"
    description = "Excavation / embankment batter angle stability to BS 6031"
    category = "geotechnical"
    reference_text = "BS 6031:2009 / EN 1997-1:2004"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        height_m = inputs.get('height_m', 3.0)
        batter_angle_deg = inputs.get('batter_angle_deg', 45)
        soil_phi_deg = inputs.get('soil_friction_angle_deg', 30)
        soil_cohesion_kPa = inputs.get('soil_cohesion_kPa', 5)
        soil_unit_weight_kNm3 = inputs.get('soil_unit_weight_kNm3', 18)
        surcharge_kPa = inputs.get('surcharge_kPa', 10)
        water_table_depth_m = inputs.get('water_table_depth_m', 10)
        is_temporary = inputs.get('is_temporary', True)
        gamma_phi = inputs.get('gamma_phi', 1.25)
        gamma_c = inputs.get('gamma_c', 1.25)

        phi_rad = math.radians(soil_phi_deg)
        beta_rad = math.radians(batter_angle_deg)

        # Design soil parameters (EN 1997-1 DA1-C2)
        phi_d_rad = math.atan(math.tan(phi_rad) / gamma_phi)
        phi_d_deg = math.degrees(phi_d_rad)
        c_d_kPa = soil_cohesion_kPa / gamma_c

        # Simple infinite slope analysis (Fs = c'/(gamma*H*sin(beta)*cos(beta)) + tan(phi')/tan(beta))
        sin_b = math.sin(beta_rad)
        cos_b = math.cos(beta_rad)
        if sin_b * cos_b > 0 and math.tan(beta_rad) > 0:
            cohesion_term = c_d_kPa / (soil_unit_weight_kNm3 * height_m * sin_b * cos_b)
            friction_term = math.tan(phi_d_rad) / math.tan(beta_rad)
            FoS = cohesion_term + friction_term
        else:
            FoS = float('inf')

        # Pore water pressure effect
        if water_table_depth_m < height_m:
            ru = 0.5 * (height_m - water_table_depth_m) / height_m
            FoS_water = FoS * (1 - ru)
        else:
            FoS_water = FoS
            ru = 0

        # Surcharge effect
        equiv_height_m = height_m + surcharge_kPa / soil_unit_weight_kNm3
        if sin_b * cos_b > 0 and math.tan(beta_rad) > 0:
            cohesion_s = c_d_kPa / (soil_unit_weight_kNm3 * equiv_height_m * sin_b * cos_b)
            friction_s = math.tan(phi_d_rad) / math.tan(beta_rad)
            FoS_surcharge = cohesion_s + friction_s
        else:
            FoS_surcharge = float('inf')

        # Governing FoS
        FoS_governing = min(FoS_water, FoS_surcharge)

        # Required FoS
        FoS_required = 1.0 if is_temporary else 1.3

        # Maximum safe angle (for pure friction: beta_max = phi_d)
        if c_d_kPa > 0:
            max_safe_angle_deg = phi_d_deg + math.degrees(math.atan(c_d_kPa / (soil_unit_weight_kNm3 * height_m)))
        else:
            max_safe_angle_deg = phi_d_deg

        # Horizontal setback
        setback_m = height_m / math.tan(beta_rad) if math.tan(beta_rad) > 0 else 0

        util = FoS_required / FoS_governing if FoS_governing > 0 else float('inf')
        stability_ok = FoS_governing >= FoS_required
        angle_ok = batter_angle_deg <= max_safe_angle_deg

        checks = [
            {"name": "Factor of Safety", "utilisation": round(util * 100, 1),
             "status": "PASS" if stability_ok else "FAIL",
             "detail": f"FoS = {FoS_governing:.2f} ≥ {FoS_required:.1f}"},
            {"name": "Batter Angle", "utilisation": round(batter_angle_deg / max_safe_angle_deg * 100, 1) if max_safe_angle_deg > 0 else 0,
             "status": "PASS" if angle_ok else "FAIL",
             "detail": f"{batter_angle_deg}° ≤ max safe {max_safe_angle_deg:.1f}°"},
        ]

        overall = stability_ok and angle_ok

        return {
            "FoS_no_water": round(FoS, 2),
            "FoS_with_water": round(FoS_water, 2),
            "FoS_with_surcharge": round(FoS_surcharge, 2),
            "FoS_governing": round(FoS_governing, 2),
            "FoS_required": FoS_required,
            "phi_d_deg": round(phi_d_deg, 1),
            "max_safe_angle_deg": round(max_safe_angle_deg, 1),
            "setback_m": round(setback_m, 2),
            "ru": round(ru, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(util * 100, 1),
        }


calculator = BattersCalculator()
