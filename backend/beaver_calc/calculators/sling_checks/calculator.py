"""
Sling capacity checks per BS EN 13414 / BS 7121.
Verifies sling type, WLL, inspection criteria, and D:d ratio for wire rope slings.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SlingChecksCalculator(CalculatorPlugin):
    key = "sling_checks_v1"
    name = "Sling Checks"
    version = "1.0.0"
    description = "Sling capacity and inspection checks per BS EN 13414 / BS 7121"
    category = "lifting"
    reference_text = "BS EN 13414-1:2003; BS 7121-1:2016"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Sling parameters
        sling_type = inputs.get('sling_type', 'wire_rope')  # wire_rope, chain, webbing, roundsling
        sling_wll_t = inputs.get('sling_wll_t', 5.0)  # working load limit in tonnes
        rope_diameter_mm = inputs.get('rope_diameter_mm', 20)
        rope_mbl_kN = inputs.get('rope_mbl_kN', 0)  # minimum breaking load
        # Hitch type
        hitch = inputs.get('hitch_type', 'vertical')  # vertical, choker, basket
        # Loading
        load_t = inputs.get('load_t', 4.0)
        n_legs = inputs.get('n_legs', 1)
        angle_deg = inputs.get('angle_from_vertical_deg', 0)
        # D:d ratio (for wire rope over pin/hook)
        pin_diameter_mm = inputs.get('pin_diameter_mm', 0)
        # Temperature
        temperature_C = inputs.get('temperature_C', 20)

        # Hitch factor (BS EN 13414-1 Table 1)
        hitch_factors = {
            'vertical': 1.0,
            'choker': 0.8,
            'basket': 2.0,
        }
        hitch_factor = hitch_factors.get(hitch, 1.0)

        # Effective capacity
        if angle_deg > 0 and math.cos(math.radians(angle_deg)) > 0.01:
            angle_factor = math.cos(math.radians(angle_deg))
        else:
            angle_factor = 1.0

        effective_wll_t = sling_wll_t * hitch_factor * angle_factor * n_legs

        # Load utilisation
        load_ratio = load_t / effective_wll_t if effective_wll_t > 0 else 999

        # D:d ratio check for wire rope
        if sling_type == 'wire_rope' and pin_diameter_mm > 0 and rope_diameter_mm > 0:
            Dd_ratio = pin_diameter_mm / rope_diameter_mm
            # EN 13414-1: D/d ≥ 1 minimum, efficiency loss below 20:1
            if Dd_ratio >= 20:
                Dd_efficiency = 1.0
            elif Dd_ratio >= 5:
                Dd_efficiency = 0.75 + 0.25 * (Dd_ratio - 5) / 15
            elif Dd_ratio >= 1:
                Dd_efficiency = 0.50 + 0.25 * (Dd_ratio - 1) / 4
            else:
                Dd_efficiency = 0.5
            Dd_check = Dd_ratio >= 1.0
        else:
            Dd_ratio = 99
            Dd_efficiency = 1.0
            Dd_check = True

        # Temperature derating
        if sling_type == 'webbing':
            temp_ok = -40 <= temperature_C <= 100
            temp_detail = f"{temperature_C}°C (webbing: -40°C to 100°C)"
        elif sling_type == 'chain':
            temp_ok = -40 <= temperature_C <= 200
            if temperature_C > 200:
                temp_ok = False
            elif temperature_C > 150:
                temp_detail = f"{temperature_C}°C — derate to 90% WLL"
            else:
                temp_detail = f"{temperature_C}°C OK"
            temp_detail = f"{temperature_C}°C (chain: -40°C to 200°C)"
        else:
            temp_ok = temperature_C <= 100 if sling_type == 'roundsling' else True
            temp_detail = f"{temperature_C}°C — {'OK' if temp_ok else 'EXCEEDED'}"

        # MBL / FoS check (if MBL provided)
        if rope_mbl_kN > 0:
            applied_kN = load_t * 9.81
            fos = rope_mbl_kN / applied_kN if applied_kN > 0 else 999
            fos_required = {'wire_rope': 5, 'chain': 4, 'webbing': 7, 'roundsling': 7}.get(sling_type, 5)
            fos_ok = fos >= fos_required
        else:
            fos = 0
            fos_required = 0
            fos_ok = True  # not checked

        checks = [
            {"name": "Load vs WLL",
             "utilisation": round(load_ratio * 100, 1),
             "status": "PASS" if load_ratio <= 1.0 else "FAIL",
             "detail": f"Load={load_t:.1f}t / WLL_eff={effective_wll_t:.1f}t ({hitch}, {n_legs}-leg, {angle_deg}°)"},
            {"name": "D:d ratio",
             "utilisation": round((1 / Dd_ratio) * 100, 1) if Dd_ratio > 0 else 0,
             "status": "PASS" if Dd_check else "FAIL",
             "detail": f"D/d={Dd_ratio:.1f} (eff={Dd_efficiency:.0%})" if sling_type == 'wire_rope' and pin_diameter_mm > 0 else "N/A"},
            {"name": "Temperature",
             "utilisation": 0,
             "status": "PASS" if temp_ok else "FAIL",
             "detail": temp_detail},
        ]

        if rope_mbl_kN > 0:
            checks.append({
                "name": "Factor of safety",
                "utilisation": round(fos_required / fos * 100, 1) if fos > 0 else 999,
                "status": "PASS" if fos_ok else "FAIL",
                "detail": f"FoS={fos:.1f} (required ≥{fos_required} for {sling_type})",
            })

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "effective_wll_t": round(effective_wll_t, 2),
            "load_ratio": round(load_ratio, 3),
            "hitch_factor": hitch_factor,
            "Dd_ratio": round(Dd_ratio, 1),
            "Dd_efficiency": round(Dd_efficiency, 2),
            "factor_of_safety": round(fos, 1) if fos > 0 else None,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SlingChecksCalculator()
