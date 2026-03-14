"""
Heras / temporary fence wind loading check.
Panel stability, base block weight, bracing requirements.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class HerasFenceCalculator(CalculatorPlugin):
    key = "heras_fence_v1"
    name = "Heras Fence Checks"
    version = "1.0.0"
    description = "Temporary fencing wind stability check"
    category = "temporary_works"
    reference_text = "BS 6399-2, EN 1991-1-4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        panel_height_m = inputs.get('panel_height_m', 2.0)
        panel_width_m = inputs.get('panel_width_m', 3.5)
        solidity_ratio = inputs.get('solidity_ratio', 0.05)  # mesh ~5%
        # If hoarding attached
        hoarding = inputs.get('hoarding_attached', False)
        hoarding_solidity = 1.0 if hoarding else solidity_ratio
        # Wind
        v_wind_ms = inputs.get('wind_speed_ms', 22)
        terrain_factor = inputs.get('terrain_factor', 1.0)
        # Base blocks
        block_weight_kg = inputs.get('base_block_kg', 25)
        n_blocks_per_panel = inputs.get('blocks_per_panel', 2)
        # Bracing
        has_bracing = inputs.get('has_bracing', True)

        rho_air = 1.226  # kg/m3
        q_wind = 0.5 * rho_air * (v_wind_ms * terrain_factor) ** 2 / 1000  # kPa

        # Force coefficient for fence
        if hoarding:
            Cf = 1.3  # solid hoarding
            effective_solidity = 1.0
        else:
            Cf = 1.2 * hoarding_solidity + 0.1  # mesh fence
            effective_solidity = hoarding_solidity

        A_panel = panel_height_m * panel_width_m * effective_solidity
        F_wind = q_wind * Cf * panel_height_m * panel_width_m  # kN per panel
        if not hoarding:
            F_wind *= effective_solidity

        # Overturning moment per panel
        M_overturn = F_wind * panel_height_m / 2  # kNm (force at mid-height)

        # Restoring moment from base blocks
        g = 9.81
        W_blocks = n_blocks_per_panel * block_weight_kg * g / 1000  # kN
        lever = panel_width_m / 4  # base block lever arm
        M_resist = W_blocks * lever

        # With bracing
        brace_factor = 2.0 if has_bracing else 1.0
        M_resist_total = M_resist * brace_factor

        FoS = M_resist_total / M_overturn if M_overturn > 0 else float('inf')
        util_stability = 1.5 / FoS if FoS > 0 else float('inf')

        # Required block weight to achieve FoS 1.5
        W_required = 1.5 * M_overturn / (lever * brace_factor) if lever * brace_factor > 0 else float('inf')
        blocks_required = math.ceil(W_required / (block_weight_kg * g / 1000)) if block_weight_kg > 0 else float('inf')

        checks = [
            {"name": "Overturning stability (FoS ≥ 1.5)",
             "utilisation": round(util_stability * 100, 1),
             "status": "PASS" if FoS >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS:.2f} (M_r={M_resist_total:.2f} / M_o={M_overturn:.2f} kNm)"},
            {"name": "Wind force per panel",
             "utilisation": round(F_wind / 2.0 * 100, 1),
             "status": "PASS",
             "detail": f"F_wind = {F_wind:.3f} kN at v = {v_wind_ms} m/s"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "q_wind_kPa": round(q_wind, 4),
            "F_wind_kN": round(F_wind, 3),
            "M_overturn_kNm": round(M_overturn, 3),
            "M_resist_kNm": round(M_resist_total, 3),
            "FoS": round(FoS, 2),
            "blocks_required": blocks_required,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(util_stability * 100, 1),
        }


calculator = HerasFenceCalculator()
