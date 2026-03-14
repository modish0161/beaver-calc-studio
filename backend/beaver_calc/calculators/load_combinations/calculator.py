"""
Load combination generator per EN 1990:2002.
Generates ULS/SLS combinations with partial factors and psi values.
"""
from typing import Dict, Any, List
import math
from ..base import CalculatorPlugin


class LoadCombinationsCalculator(CalculatorPlugin):
    key = "load_combinations_v1"
    name = "Load Combinations"
    version = "1.0.0"
    description = "EN 1990 load combination generator (STR/GEO/EQU)"
    category = "loading"
    reference_text = "EN 1990:2002 / UK NA"

    # UK NA partial factors
    GAMMA = {
        "G_unfav": 1.35,
        "G_fav": 1.0,
        "Q_unfav": 1.5,
        "Q_fav": 0.0,
    }

    # UK NA Table NA.A1.1 psi factors
    PSI_FACTORS = {
        "imposed_A": {"psi_0": 0.7, "psi_1": 0.5, "psi_2": 0.3},
        "imposed_B": {"psi_0": 0.7, "psi_1": 0.5, "psi_2": 0.3},
        "imposed_C": {"psi_0": 0.7, "psi_1": 0.7, "psi_2": 0.6},
        "imposed_D": {"psi_0": 0.7, "psi_1": 0.7, "psi_2": 0.6},
        "imposed_E": {"psi_0": 1.0, "psi_1": 0.9, "psi_2": 0.8},
        "snow_below_1000": {"psi_0": 0.5, "psi_1": 0.2, "psi_2": 0.0},
        "snow_above_1000": {"psi_0": 0.7, "psi_1": 0.5, "psi_2": 0.2},
        "wind": {"psi_0": 0.5, "psi_1": 0.2, "psi_2": 0.0},
        "temperature": {"psi_0": 0.6, "psi_1": 0.5, "psi_2": 0.0},
    }

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Permanent loads
        G_k = inputs.get('G_k_kN', 100.0)  # characteristic permanent
        # Variable loads: list of {name, Q_k, category}
        variable_loads = inputs.get('variable_loads', [
            {"name": "Imposed", "Q_k_kN": 50.0, "category": "imposed_A"},
            {"name": "Wind", "Q_k_kN": 30.0, "category": "wind"},
        ])
        # Limit state
        include_uls = inputs.get('include_uls', True)
        include_sls = inputs.get('include_sls', True)
        approach = inputs.get('approach', 'STR')  # STR, GEO, EQU

        g = self.GAMMA
        combos: List[dict] = []

        if include_uls:
            # For each variable load as leading
            for i, leading in enumerate(variable_loads):
                cat_lead = leading.get('category', 'imposed_A')
                psi_lead = self.PSI_FACTORS.get(cat_lead, self.PSI_FACTORS['imposed_A'])

                combo_name = f"ULS-{i + 1}: {leading['name']} leading"
                # EN 1990 Eq 6.10 (UK NA uses 6.10a/b)
                # 6.10a: γ_G × G_k + γ_Q × ψ_0 × Q_k,1 + Σ(γ_Q × ψ_0 × Q_k,i)
                # 6.10b: ξ × γ_G × G_k + γ_Q × Q_k,1 + Σ(γ_Q × ψ_0 × Q_k,i)
                xi = 0.925  # UK NA reduction factor

                # Eq 6.10a
                val_6_10a = g['G_unfav'] * G_k
                for j, vl in enumerate(variable_loads):
                    cat_j = vl.get('category', 'imposed_A')
                    psi_j = self.PSI_FACTORS.get(cat_j, self.PSI_FACTORS['imposed_A'])
                    val_6_10a += g['Q_unfav'] * psi_j['psi_0'] * vl['Q_k_kN']

                # Eq 6.10b
                val_6_10b = xi * g['G_unfav'] * G_k + g['Q_unfav'] * leading['Q_k_kN']
                for j, vl in enumerate(variable_loads):
                    if j == i:
                        continue
                    cat_j = vl.get('category', 'imposed_A')
                    psi_j = self.PSI_FACTORS.get(cat_j, self.PSI_FACTORS['imposed_A'])
                    val_6_10b += g['Q_unfav'] * psi_j['psi_0'] * vl['Q_k_kN']

                design_value = max(val_6_10a, val_6_10b)
                governing_eq = "6.10a" if val_6_10a >= val_6_10b else "6.10b"

                combos.append({
                    "name": combo_name,
                    "type": "ULS",
                    "eq_6_10a_kN": round(val_6_10a, 2),
                    "eq_6_10b_kN": round(val_6_10b, 2),
                    "design_value_kN": round(design_value, 2),
                    "governing": governing_eq,
                })

            # Permanent only ULS
            combos.append({
                "name": "ULS-perm: Permanent only",
                "type": "ULS",
                "design_value_kN": round(g['G_unfav'] * G_k, 2),
                "governing": "6.10",
            })

        if include_sls:
            for i, leading in enumerate(variable_loads):
                cat_lead = leading.get('category', 'imposed_A')
                psi_lead = self.PSI_FACTORS.get(cat_lead, self.PSI_FACTORS['imposed_A'])

                # Characteristic SLS: G_k + Q_k,1 + Σψ_0 × Q_k,i
                sls_char = G_k + leading['Q_k_kN']
                for j, vl in enumerate(variable_loads):
                    if j == i:
                        continue
                    cat_j = vl.get('category', 'imposed_A')
                    psi_j = self.PSI_FACTORS.get(cat_j, self.PSI_FACTORS['imposed_A'])
                    sls_char += psi_j['psi_0'] * vl['Q_k_kN']

                # Frequent SLS: G_k + ψ_1 × Q_k,1 + Σψ_2 × Q_k,i
                sls_freq = G_k + psi_lead['psi_1'] * leading['Q_k_kN']
                for j, vl in enumerate(variable_loads):
                    if j == i:
                        continue
                    cat_j = vl.get('category', 'imposed_A')
                    psi_j = self.PSI_FACTORS.get(cat_j, self.PSI_FACTORS['imposed_A'])
                    sls_freq += psi_j['psi_2'] * vl['Q_k_kN']

                # Quasi-permanent SLS: G_k + Σψ_2 × Q_k,i
                sls_qp = G_k
                for vl in variable_loads:
                    cat_j = vl.get('category', 'imposed_A')
                    psi_j = self.PSI_FACTORS.get(cat_j, self.PSI_FACTORS['imposed_A'])
                    sls_qp += psi_j['psi_2'] * vl['Q_k_kN']

                combos.append({
                    "name": f"SLS-char-{i + 1}: {leading['name']} leading",
                    "type": "SLS_characteristic",
                    "design_value_kN": round(sls_char, 2),
                })
                combos.append({
                    "name": f"SLS-freq-{i + 1}: {leading['name']} leading",
                    "type": "SLS_frequent",
                    "design_value_kN": round(sls_freq, 2),
                })

            combos.append({
                "name": "SLS-QP: Quasi-permanent",
                "type": "SLS_quasi_permanent",
                "design_value_kN": round(sls_qp, 2),
            })

        # Find governing ULS combo
        uls_combos = [c for c in combos if c['type'] == 'ULS']
        max_uls = max((c['design_value_kN'] for c in uls_combos), default=0)

        checks = [
            {"name": "ULS combinations generated",
             "utilisation": 0,
             "status": "PASS",
             "detail": f"{len(uls_combos)} ULS combos, governing = {max_uls:.2f} kN"},
            {"name": "SLS combinations generated",
             "utilisation": 0,
             "status": "PASS",
             "detail": f"{len(combos) - len(uls_combos)} SLS combos"},
        ]

        return {
            "combinations": combos,
            "n_combinations": len(combos),
            "governing_uls_kN": round(max_uls, 2),
            "checks": checks,
            "overall_status": "PASS",
            "utilisation": 0,
        }


calculator = LoadCombinationsCalculator()
