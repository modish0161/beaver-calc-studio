"""
Formwork lateral pressure calculation to CIRIA R108 / EN 12812.
Computes maximum lateral pressure on vertical formwork from fresh concrete.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class FormworkPressureCalculator(CalculatorPlugin):
    key = "formwork_pressure_v1"
    name = "Formwork Pressure"
    version = "1.0.0"
    description = "Concrete lateral pressure on formwork to CIRIA R108"
    category = "temporary_works"
    reference_text = "CIRIA R108, EN 12812:2008"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        H = inputs.get('pour_height_m', 4.0)
        R = inputs.get('pour_rate_m_hr', 2.0)
        T_concrete = inputs.get('concrete_temp_C', 15)
        gamma_c = inputs.get('concrete_density_kNm3', 25)
        cement_type = inputs.get('cement_type', 'OPC')  # OPC, RHPC, SRPC
        admixture = inputs.get('retarder', False)
        # Formwork
        tie_spacing_h = inputs.get('tie_spacing_horizontal_mm', 600)
        tie_spacing_v = inputs.get('tie_spacing_vertical_mm', 600)
        tie_capacity_kN = inputs.get('tie_capacity_kN', 90)

        # CIRIA R108 coefficients
        C1 = {'OPC': 1.0, 'RHPC': 1.15, 'SRPC': 1.45}.get(cement_type, 1.0)
        C2 = 1.2 if admixture else 1.0
        K = 36 / (T_concrete + 16) if T_concrete > -16 else 3.0

        # Hydrostatic head
        P_hydro = gamma_c * H

        # CIRIA R108 maximum pressure
        P_max_ciria = gamma_c * (C1 * C2 * K * math.sqrt(R) + C1 * C2 * 0.3)
        P_max_ciria = min(P_max_ciria, P_hydro)  # cannot exceed hydrostatic

        # Depth at which max pressure occurs
        h_max = P_max_ciria / gamma_c if gamma_c > 0 else 0

        # Governing pressure
        P_design = P_max_ciria

        # Tie force
        tie_area = (tie_spacing_h / 1000) * (tie_spacing_v / 1000)
        F_tie = P_design * tie_area  # kN
        util_tie = F_tie / tie_capacity_kN if tie_capacity_kN > 0 else float('inf')

        # Total force on form face per metre width
        if H <= h_max:
            F_total = 0.5 * gamma_c * H ** 2  # triangular
        else:
            F_total = 0.5 * gamma_c * h_max ** 2 + P_design * (H - h_max)

        checks = [
            {"name": "Tie force", "utilisation": round(util_tie * 100, 1),
             "status": "PASS" if util_tie <= 1.0 else "FAIL",
             "detail": f"F_tie={F_tie:.1f} kN / capacity={tie_capacity_kN:.1f} kN"},
            {"name": "Pressure envelope", "utilisation": round(P_design / P_hydro * 100, 1) if P_hydro > 0 else 0,
             "status": "PASS",
             "detail": f"P_max={P_design:.1f} kPa (hydrostatic={P_hydro:.1f} kPa)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "P_max_kPa": round(P_design, 1),
            "P_hydrostatic_kPa": round(P_hydro, 1),
            "h_max_m": round(h_max, 2),
            "F_tie_kN": round(F_tie, 1),
            "F_total_kN_m": round(F_total, 1),
            "C1": C1, "C2": C2, "K": round(K, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(util_tie * 100, 1),
        }


calculator = FormworkPressureCalculator()
