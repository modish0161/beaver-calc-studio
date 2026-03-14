"""
Geosynthetic Reinforced Soil (GRS) wall / abutment design.
Internal / external stability per FHWA GRS-IBS guidelines.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class GRSWallCalculator(CalculatorPlugin):
    key = "grs_wall_v1"
    name = "GRS Wall"
    version = "1.0.0"
    description = "Geosynthetic reinforced soil wall to FHWA GRS-IBS"
    category = "geotechnical"
    reference_text = "FHWA-HRT-11-026, BS 8006-1"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        H = inputs.get('wall_height_m', 6.0)
        q_surcharge = inputs.get('surcharge_kPa', 20)
        phi_fill_deg = inputs.get('fill_friction_deg', 38)
        gamma_fill = inputs.get('fill_unit_weight_kNm3', 20)
        # Reinforcement
        T_f_kN_m = inputs.get('geosynthetic_strength_kNm', 70)
        S_v_m = inputs.get('reinforcement_spacing_m', 0.2)
        L_m = inputs.get('reinforcement_length_m', 0.7 * H)
        # Foundation
        phi_found_deg = inputs.get('foundation_friction_deg', 30)
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 200)

        phi_rad = math.radians(phi_fill_deg)
        Ka = (1 - math.sin(phi_rad)) / (1 + math.sin(phi_rad))
        Kp_fill = 1 / Ka

        if L_m <= 0:
            L_m = 0.7 * H

        # GRS composite capacity (Eq from FHWA)
        # sigma_c = 0.7 * Tf / Sv * Kp
        sigma_c = 0.7 * T_f_kN_m / S_v_m * Kp_fill if S_v_m > 0 else 0

        # Lateral stress at base from retained soil + surcharge
        sigma_h_base = Ka * (gamma_fill * H + q_surcharge)

        # Required capacity check
        util_capacity = sigma_h_base / sigma_c if sigma_c > 0 else float('inf')

        # External — overturning
        Pa = 0.5 * Ka * gamma_fill * H ** 2 + Ka * q_surcharge * H
        W = gamma_fill * H * L_m + q_surcharge * L_m
        M_resist = W * L_m / 2
        M_overturn = 0.5 * Ka * gamma_fill * H ** 2 * H / 3 + Ka * q_surcharge * H * H / 2
        FoS_overturn = M_resist / M_overturn if M_overturn > 0 else float('inf')

        # External — sliding
        phi_found_rad = math.radians(phi_found_deg)
        FoS_slide = W * math.tan(phi_found_rad) / Pa if Pa > 0 else float('inf')

        # Bearing
        e = L_m / 2 - (M_resist - M_overturn) / W if W > 0 else 0
        B_eff = L_m - 2 * abs(e)
        q_base = W / B_eff if B_eff > 0 else float('inf')
        util_bearing = q_base / bearing_capacity_kPa if bearing_capacity_kPa > 0 else float('inf')

        # Facing connection (simplified)
        T_max_req = Ka * (gamma_fill * H + q_surcharge) * S_v_m
        util_connection = T_max_req / T_f_kN_m if T_f_kN_m > 0 else float('inf')

        checks = [
            {"name": "GRS capacity", "utilisation": round(util_capacity * 100, 1),
             "status": "PASS" if util_capacity <= 1.0 else "FAIL",
             "detail": f"σ_h={sigma_h_base:.1f} kPa / σ_c={sigma_c:.1f} kPa"},
            {"name": "Overturning (FoS ≥ 2.0)", "utilisation": round(2.0 / FoS_overturn * 100, 1) if FoS_overturn > 0 else 999,
             "status": "PASS" if FoS_overturn >= 2.0 else "FAIL",
             "detail": f"FoS = {FoS_overturn:.2f}"},
            {"name": "Sliding (FoS ≥ 1.5)", "utilisation": round(1.5 / FoS_slide * 100, 1) if FoS_slide > 0 else 999,
             "status": "PASS" if FoS_slide >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_slide:.2f}"},
            {"name": "Bearing pressure", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if util_bearing <= 1.0 else "FAIL",
             "detail": f"q={q_base:.1f} kPa / q_allow={bearing_capacity_kPa:.0f} kPa"},
            {"name": "Facing connection", "utilisation": round(util_connection * 100, 1),
             "status": "PASS" if util_connection <= 1.0 else "FAIL",
             "detail": f"T_req={T_max_req:.1f} kN/m / T_f={T_f_kN_m:.1f} kN/m"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "sigma_c_kPa": round(sigma_c, 1),
            "Ka": round(Ka, 3),
            "Pa_kN_m": round(Pa, 1),
            "FoS_overturn": round(FoS_overturn, 2),
            "FoS_slide": round(FoS_slide, 2),
            "q_base_kPa": round(q_base, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = GRSWallCalculator()
