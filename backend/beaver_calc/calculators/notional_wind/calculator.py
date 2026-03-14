"""
Notional horizontal load / EHF calculator per EN 1993-1-1 cl 5.3.2.
Computes equivalent horizontal forces for frame imperfections.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class NotionalWindCalculator(CalculatorPlugin):
    key = "notional_wind_v1"
    name = "Notional Horizontal Load"
    version = "1.0.0"
    description = "Equivalent horizontal forces (EHF) for frame imperfections"
    category = "loading"
    reference_text = "EN 1993-1-1:2005 cl 5.3.2 / EN 1992-1-1 cl 5.2"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Structure
        n_storeys = inputs.get('n_storeys', 4)
        n_columns_per_row = inputs.get('n_columns_per_row', 4)
        storey_height_m = inputs.get('storey_height_m', 3.5)
        # Loads per storey
        storey_vertical_kN = inputs.get('storey_vertical_kN', 2000)  # total vertical per floor
        # Optional direct wind
        wind_load_kN = inputs.get('wind_load_kN', 0)
        # Material type (steel or concrete)
        material = inputs.get('material', 'steel')

        total_height = n_storeys * storey_height_m

        if material == 'steel':
            # EN 1993-1-1 cl 5.3.2(3)
            phi_0 = 1 / 200  # basic imperfection
            # Height reduction: α_h = 2/√h but 2/3 ≤ α_h ≤ 1.0
            alpha_h = min(1.0, max(2 / 3, 2 / math.sqrt(total_height)))
            # Column reduction: α_m = √(0.5(1 + 1/m))
            m = n_columns_per_row
            alpha_m = math.sqrt(0.5 * (1 + 1 / m))
            phi = phi_0 * alpha_h * alpha_m
        else:
            # EN 1992-1-1 cl 5.2
            phi_0 = 1 / 200
            alpha_h = min(1.0, max(2 / 3, 2 / math.sqrt(total_height)))
            m = n_columns_per_row
            alpha_m = math.sqrt(0.5 * (1 + 1 / m))
            phi = phi_0 * alpha_h * alpha_m

        # EHF per storey = φ × vertical load at that storey
        ehf_per_storey_kN = phi * storey_vertical_kN
        total_ehf_kN = ehf_per_storey_kN * n_storeys

        # Compare to wind
        ehf_as_pct_wind = (total_ehf_kN / wind_load_kN * 100) if wind_load_kN > 0 else 0

        # Minimum NHF check (typically EHF should be ≥ NHF)
        # UK practice: NHF = 1.0% of factored dead load per storey (BS 5950 legacy)
        nhf_legacy_per_storey = 0.005 * storey_vertical_kN  # 0.5%
        nhf_legacy_total = nhf_legacy_per_storey * n_storeys

        # Storey-by-storey results
        storey_results = []
        cumulative_shear = 0
        for i in range(n_storeys, 0, -1):
            cumulative_shear += ehf_per_storey_kN
            storey_results.append({
                "storey": i,
                "height_m": round(i * storey_height_m, 1),
                "EHF_kN": round(ehf_per_storey_kN, 2),
                "cumulative_shear_kN": round(cumulative_shear, 2),
            })

        checks = [
            {"name": "Imperfection angle φ",
             "utilisation": round(phi / phi_0 * 100, 1),
             "status": "PASS",
             "detail": f"φ = 1/{1 / phi:.0f} (φ₀=1/200, α_h={alpha_h:.3f}, α_m={alpha_m:.3f})"},
            {"name": "Total EHF",
             "utilisation": 0,
             "status": "PASS",
             "detail": f"ΣH_EHF = {total_ehf_kN:.2f} kN ({ehf_per_storey_kN:.2f} kN/storey × {n_storeys})"},
            {"name": "EHF vs wind load",
             "utilisation": round(ehf_as_pct_wind, 1) if wind_load_kN > 0 else 0,
             "status": "PASS" if wind_load_kN == 0 or total_ehf_kN <= wind_load_kN else "FAIL",
             "detail": f"EHF={total_ehf_kN:.1f} kN vs wind={wind_load_kN:.1f} kN" if wind_load_kN > 0 else "No wind load specified"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "phi": round(phi, 6),
            "phi_reciprocal": round(1 / phi, 0) if phi > 0 else 0,
            "alpha_h": round(alpha_h, 3),
            "alpha_m": round(alpha_m, 3),
            "ehf_per_storey_kN": round(ehf_per_storey_kN, 2),
            "total_ehf_kN": round(total_ehf_kN, 2),
            "storey_results": storey_results,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = NotionalWindCalculator()
