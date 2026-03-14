"""
Load combination builder (EN 1990:2002)
Generates ULS and SLS load combinations per Eurocode.
"""
from typing import Dict, Any, List
from ..base import CalculatorPlugin


class CombinationBuilderCalculator(CalculatorPlugin):
    key = "combination_builder_v1"
    name = "Load Combination Builder"
    version = "1.0.0"
    description = "EN 1990 ULS and SLS load combination generator"
    category = "general"
    reference_text = "EN 1990:2002 Table A1.2(B)"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        permanent_kN = inputs.get('permanent_kN', 100)
        imposed_kN = inputs.get('imposed_kN', 50)
        wind_kN = inputs.get('wind_kN', 30)
        snow_kN = inputs.get('snow_kN', 20)
        category = inputs.get('building_category', 'A')

        psi_map = {
            'A': {'psi0': 0.7, 'psi1': 0.5, 'psi2': 0.3},
            'B': {'psi0': 0.7, 'psi1': 0.5, 'psi2': 0.3},
            'C': {'psi0': 0.7, 'psi1': 0.7, 'psi2': 0.6},
            'D': {'psi0': 0.7, 'psi1': 0.7, 'psi2': 0.6},
            'E': {'psi0': 1.0, 'psi1': 0.9, 'psi2': 0.8},
            'H': {'psi0': 0.0, 'psi1': 0.0, 'psi2': 0.0},
        }
        psi = psi_map.get(category, psi_map['A'])
        psi_wind = {'psi0': 0.5, 'psi1': 0.2, 'psi2': 0.0}
        psi_snow = {'psi0': 0.5, 'psi1': 0.2, 'psi2': 0.0}

        combinations: List[Dict[str, Any]] = []

        # ULS STR/GEO (EN 1990 6.10a/6.10b or 6.10)
        # Eq 6.10: 1.35G + 1.5Q_lead + 1.5*psi0*Q_accomp
        combo_id = 1

        # Imposed leading
        val = 1.35 * permanent_kN + 1.5 * imposed_kN + 1.5 * psi_wind['psi0'] * wind_kN + 1.5 * psi_snow['psi0'] * snow_kN
        combinations.append({
            "id": combo_id, "type": "ULS", "name": "6.10 Imposed leading",
            "expression": f"1.35G + 1.5Q + 1.5×{psi_wind['psi0']}W + 1.5×{psi_snow['psi0']}S",
            "value_kN": round(val, 2),
            "factors": {"G": 1.35, "Q": 1.5, "W": 1.5 * psi_wind['psi0'], "S": 1.5 * psi_snow['psi0']}
        })
        combo_id += 1

        # Wind leading
        val = 1.35 * permanent_kN + 1.5 * wind_kN + 1.5 * psi['psi0'] * imposed_kN + 1.5 * psi_snow['psi0'] * snow_kN
        combinations.append({
            "id": combo_id, "type": "ULS", "name": "6.10 Wind leading",
            "expression": f"1.35G + 1.5W + 1.5×{psi['psi0']}Q + 1.5×{psi_snow['psi0']}S",
            "value_kN": round(val, 2),
            "factors": {"G": 1.35, "W": 1.5, "Q": 1.5 * psi['psi0'], "S": 1.5 * psi_snow['psi0']}
        })
        combo_id += 1

        # Snow leading
        val = 1.35 * permanent_kN + 1.5 * snow_kN + 1.5 * psi['psi0'] * imposed_kN + 1.5 * psi_wind['psi0'] * wind_kN
        combinations.append({
            "id": combo_id, "type": "ULS", "name": "6.10 Snow leading",
            "expression": f"1.35G + 1.5S + 1.5×{psi['psi0']}Q + 1.5×{psi_wind['psi0']}W",
            "value_kN": round(val, 2),
            "factors": {"G": 1.35, "S": 1.5, "Q": 1.5 * psi['psi0'], "W": 1.5 * psi_wind['psi0']}
        })
        combo_id += 1

        # Min permanent (favourable)
        val = 1.0 * permanent_kN + 1.5 * wind_kN
        combinations.append({
            "id": combo_id, "type": "ULS", "name": "6.10 Min G + Wind (uplift)",
            "expression": "1.0G + 1.5W",
            "value_kN": round(val, 2),
            "factors": {"G": 1.0, "W": 1.5}
        })
        combo_id += 1

        # SLS Characteristic
        val = permanent_kN + imposed_kN + psi_wind['psi0'] * wind_kN + psi_snow['psi0'] * snow_kN
        combinations.append({
            "id": combo_id, "type": "SLS", "name": "Characteristic (rare)",
            "expression": f"G + Q + {psi_wind['psi0']}W + {psi_snow['psi0']}S",
            "value_kN": round(val, 2),
            "factors": {"G": 1.0, "Q": 1.0, "W": psi_wind['psi0'], "S": psi_snow['psi0']}
        })
        combo_id += 1

        # SLS Frequent
        val = permanent_kN + psi['psi1'] * imposed_kN + psi_wind['psi2'] * wind_kN
        combinations.append({
            "id": combo_id, "type": "SLS", "name": "Frequent",
            "expression": f"G + {psi['psi1']}Q + {psi_wind['psi2']}W",
            "value_kN": round(val, 2),
            "factors": {"G": 1.0, "Q": psi['psi1'], "W": psi_wind['psi2']}
        })
        combo_id += 1

        # SLS Quasi-permanent
        val = permanent_kN + psi['psi2'] * imposed_kN
        combinations.append({
            "id": combo_id, "type": "SLS", "name": "Quasi-permanent",
            "expression": f"G + {psi['psi2']}Q",
            "value_kN": round(val, 2),
            "factors": {"G": 1.0, "Q": psi['psi2']}
        })

        uls_max = max((c['value_kN'] for c in combinations if c['type'] == 'ULS'), default=0)
        sls_max = max((c['value_kN'] for c in combinations if c['type'] == 'SLS'), default=0)

        return {
            "combinations": combinations,
            "uls_max_kN": round(uls_max, 2),
            "sls_max_kN": round(sls_max, 2),
            "psi_factors": psi,
            "overall_status": "PASS",
            "utilisation": 0,
        }


calculator = CombinationBuilderCalculator()
