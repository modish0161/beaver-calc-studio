"""
Cantilever retaining wall design (EN 1997-1 / EN 1992-1-1)
Checks overturning, sliding, bearing, stem bending, base bending.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class CantileverWallCalculator(CalculatorPlugin):
    key = "cantilever_wall_v1"
    name = "Cantilever Retaining Wall"
    version = "1.0.0"
    description = "RC cantilever retaining wall stability and structural checks"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 / EN 1992-1-1:2004"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        wall_height_m = inputs.get('wall_height_m', 3.0)
        stem_thick_top_mm = inputs.get('stem_thickness_top_mm', 250)
        stem_thick_base_mm = inputs.get('stem_thickness_base_mm', 350)
        base_length_m = inputs.get('base_length_m', 2.5)
        base_thick_mm = inputs.get('base_thickness_mm', 400)
        toe_length_m = inputs.get('toe_length_m', 0.6)
        soil_phi_deg = inputs.get('soil_friction_angle_deg', 30)
        soil_gamma_kNm3 = inputs.get('soil_unit_weight_kNm3', 18)
        soil_delta_deg = inputs.get('wall_friction_angle_deg', 20)
        surcharge_kPa = inputs.get('surcharge_kPa', 10)
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 150)
        fck_MPa = inputs.get('fck_MPa', 30)
        fyk_MPa = inputs.get('fyk_MPa', 500)
        concrete_gamma_kNm3 = 25
        gamma_G = inputs.get('gamma_G', 1.35)
        gamma_Q = inputs.get('gamma_Q', 1.5)

        phi_rad = math.radians(soil_phi_deg)
        base_thick_m = base_thick_mm / 1000
        stem_thick_base_m = stem_thick_base_mm / 1000
        heel_length_m = base_length_m - toe_length_m - stem_thick_base_m

        # Active earth pressure coefficient (Rankine)
        Ka = (1 - math.sin(phi_rad)) / (1 + math.sin(phi_rad))
        # Passive earth pressure coefficient
        Kp = 1 / Ka

        H_total_m = wall_height_m + base_thick_m

        # Active earth pressure force
        Pa_soil_kN = 0.5 * Ka * soil_gamma_kNm3 * H_total_m ** 2
        Pa_surcharge_kN = Ka * surcharge_kPa * H_total_m

        # Passive resistance (on toe side, conservative: ignore top 0.3m)
        depth_passive_m = max(0, base_thick_m - 0.3)
        Pp_kN = 0.5 * Kp * soil_gamma_kNm3 * depth_passive_m ** 2

        # --- Weights and moments about toe ---
        # Stem weight
        avg_stem_thick_m = (stem_thick_top_mm / 1000 + stem_thick_base_m) / 2
        W_stem_kN = concrete_gamma_kNm3 * avg_stem_thick_m * wall_height_m
        x_stem = toe_length_m + stem_thick_base_m / 2

        # Base weight
        W_base_kN = concrete_gamma_kNm3 * base_length_m * base_thick_m
        x_base = base_length_m / 2

        # Soil on heel
        W_soil_heel_kN = soil_gamma_kNm3 * heel_length_m * wall_height_m
        x_soil = toe_length_m + stem_thick_base_m + heel_length_m / 2

        # Surcharge on heel
        W_surcharge_kN = surcharge_kPa * heel_length_m
        x_surcharge = x_soil

        # Total restoring moment about toe
        M_resist_kNm = (W_stem_kN * x_stem + W_base_kN * x_base +
                        W_soil_heel_kN * x_soil + W_surcharge_kN * x_surcharge)
        # Total overturning moment about toe
        M_overturn_kNm = Pa_soil_kN * H_total_m / 3 + Pa_surcharge_kN * H_total_m / 2

        # --- Overturning check ---
        FoS_overturn = M_resist_kNm / M_overturn_kNm if M_overturn_kNm > 0 else float('inf')
        util_overturn = 1.5 / FoS_overturn if FoS_overturn > 0 else float('inf')

        # --- Sliding check ---
        total_V_kN = W_stem_kN + W_base_kN + W_soil_heel_kN + W_surcharge_kN
        total_H_kN = Pa_soil_kN + Pa_surcharge_kN
        mu_base = math.tan(math.radians(soil_delta_deg))
        resist_sliding_kN = total_V_kN * mu_base + Pp_kN
        FoS_sliding = resist_sliding_kN / total_H_kN if total_H_kN > 0 else float('inf')
        util_sliding = 1.5 / FoS_sliding if FoS_sliding > 0 else float('inf')

        # --- Bearing pressure check ---
        e_m = base_length_m / 2 - (M_resist_kNm - M_overturn_kNm) / total_V_kN if total_V_kN > 0 else 0
        if abs(e_m) < base_length_m / 6:
            sigma_max_kPa = total_V_kN / base_length_m * (1 + 6 * e_m / base_length_m)
            sigma_min_kPa = total_V_kN / base_length_m * (1 - 6 * e_m / base_length_m)
        else:
            B_eff_m = base_length_m - 2 * abs(e_m)
            sigma_max_kPa = total_V_kN / B_eff_m if B_eff_m > 0 else float('inf')
            sigma_min_kPa = 0
        util_bearing = sigma_max_kPa / bearing_capacity_kPa

        # --- Stem bending (ULS) ---
        M_stem_kNm = gamma_G * 0.5 * Ka * soil_gamma_kNm3 * wall_height_m ** 2 * wall_height_m / 3 + \
                      gamma_Q * Ka * surcharge_kPa * wall_height_m ** 2 / 2
        d_stem_mm = stem_thick_base_mm - 50  # effective depth
        fcd_MPa = 0.85 * fck_MPa / 1.5
        fyd_MPa = fyk_MPa / 1.15
        K = M_stem_kNm * 1e6 / (1000 * d_stem_mm ** 2 * fcd_MPa) if d_stem_mm > 0 else float('inf')
        K_bal = 0.167
        util_stem = K / K_bal if K_bal > 0 else float('inf')

        # Required rebar
        z = d_stem_mm * (0.5 + math.sqrt(0.25 - min(K, 0.249) / 1.134))
        As_req_mm2 = M_stem_kNm * 1e6 / (fyd_MPa * z) if z > 0 else float('inf')

        governing = max(util_overturn, util_sliding, util_bearing, util_stem)

        checks = [
            {"name": "Overturning", "utilisation": round(util_overturn * 100, 1),
             "status": "PASS" if FoS_overturn >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_overturn:.2f} ≥ 1.5"},
            {"name": "Sliding", "utilisation": round(util_sliding * 100, 1),
             "status": "PASS" if FoS_sliding >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_sliding:.2f} ≥ 1.5"},
            {"name": "Bearing Pressure", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if util_bearing <= 1.0 else "FAIL",
             "detail": f"σ_max={sigma_max_kPa:.1f}kPa / {bearing_capacity_kPa}kPa"},
            {"name": "Stem Bending", "utilisation": round(util_stem * 100, 1),
             "status": "PASS" if util_stem <= 1.0 else "FAIL",
             "detail": f"K={K:.4f} / K_bal={K_bal}"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "Ka": round(Ka, 3), "Kp": round(Kp, 3),
            "Pa_soil_kN": round(Pa_soil_kN, 1),
            "Pa_surcharge_kN": round(Pa_surcharge_kN, 1),
            "total_V_kN": round(total_V_kN, 1),
            "M_resist_kNm": round(M_resist_kNm, 1),
            "M_overturn_kNm": round(M_overturn_kNm, 1),
            "sigma_max_kPa": round(sigma_max_kPa, 1),
            "sigma_min_kPa": round(sigma_min_kPa, 1),
            "eccentricity_m": round(e_m, 3),
            "M_stem_kNm": round(M_stem_kNm, 1),
            "As_req_mm2_per_m": round(As_req_mm2, 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing * 100, 1),
        }


calculator = CantileverWallCalculator()
