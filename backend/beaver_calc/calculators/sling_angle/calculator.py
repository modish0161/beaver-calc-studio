"""
Sling angle and load factor calculator per BS 7121-1 / LOLER.
Computes sling leg forces for multi-leg hitches at various angles.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SlingAngleCalculator(CalculatorPlugin):
    key = "sling_angle_v1"
    name = "Sling Angle"
    version = "1.0.0"
    description = "Sling angle factor and leg force calculator per BS 7121-1"
    category = "lifting"
    reference_text = "BS 7121-1:2016; LOLER 1998"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Load
        load_kN = inputs.get('load_kN', 50)
        n_legs = inputs.get('number_of_legs', 2)
        # Sling geometry
        sling_length_m = inputs.get('sling_length_m', 3.0)
        hook_height_m = inputs.get('hook_height_above_cog_m', 2.5)
        # Sling SWL
        sling_swl_kN = inputs.get('sling_swl_per_leg_kN', 50)
        # Asymmetry
        cog_offset_pct = inputs.get('cog_offset_pct', 0)  # 0 = centred

        # Sling angle from vertical
        if hook_height_m > 0 and sling_length_m > hook_height_m:
            theta_rad = math.acos(hook_height_m / sling_length_m)
        elif hook_height_m > 0:
            theta_rad = 0  # vertical
        else:
            theta_rad = math.radians(60)  # default worst case

        theta_deg = math.degrees(theta_rad)

        # Mode factor (BS 7121-1 Table)
        # n_legs effective: for 3 & 4 leg slings, assume only 3 legs share
        if n_legs <= 2:
            n_eff = n_legs
        else:
            n_eff = n_legs - 1  # one leg may go slack

        # Force per leg
        if n_eff > 0 and math.cos(theta_rad) > 0.01:
            force_per_leg = load_kN / (n_eff * math.cos(theta_rad))
        else:
            force_per_leg = load_kN  # fallback

        # Asymmetry increase
        asym_factor = 1 + cog_offset_pct / 100
        force_per_leg_design = force_per_leg * asym_factor

        # Mode factor (force multiplier vs single vertical)
        mode_factor = force_per_leg_design / (load_kN / n_legs) if n_legs > 0 else 1

        # SWL check
        swl_ratio = force_per_leg_design / sling_swl_kN if sling_swl_kN > 0 else 999

        # Angle limits (LEEA guidance)
        angle_ok = theta_deg <= 60
        angle_warning = theta_deg > 45

        # Horizontal pull
        horizontal_kN = force_per_leg_design * math.sin(theta_rad)
        total_horizontal_kN = horizontal_kN * n_legs / 2  # opposing pairs

        checks = [
            {"name": "Sling leg force vs SWL",
             "utilisation": round(swl_ratio * 100, 1),
             "status": "PASS" if swl_ratio <= 1.0 else "FAIL",
             "detail": f"F_leg={force_per_leg_design:.1f} kN / SWL={sling_swl_kN:.1f} kN ({n_legs}-leg, θ={theta_deg:.1f}°)"},
            {"name": "Sling angle limit (≤60°)",
             "utilisation": round(theta_deg / 60 * 100, 1),
             "status": "PASS" if angle_ok else "FAIL",
             "detail": f"θ={theta_deg:.1f}° (max 60° from vertical)"},
            {"name": "Sling angle advisory (≤45°)",
             "utilisation": round(theta_deg / 45 * 100, 1),
             "status": "PASS" if not angle_warning else "WARNING",
             "detail": f"θ={theta_deg:.1f}° (preferred ≤45° per LEEA CoP)"},
        ]

        overall = all(c['status'] in ('PASS', 'WARNING') for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "sling_angle_deg": round(theta_deg, 1),
            "force_per_leg_kN": round(force_per_leg_design, 1),
            "mode_factor": round(mode_factor, 2),
            "n_effective_legs": n_eff,
            "horizontal_force_kN": round(total_horizontal_kN, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SlingAngleCalculator()
