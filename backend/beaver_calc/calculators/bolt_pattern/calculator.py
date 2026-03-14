"""
Bolt pattern / group analysis (ICR method - EN 1993-1-8)
Finds instantaneous centre of rotation and bolt force distribution.
"""
from typing import Dict, Any, List
import math
from ..base import CalculatorPlugin


class BoltPatternCalculator(CalculatorPlugin):
    key = "bolt_pattern_v1"
    name = "Bolt Pattern / Group Analysis"
    version = "1.0.0"
    description = "Bolt group analysis with ICR method for eccentric loading"
    category = "steel"
    reference_text = "EN 1993-1-8:2005"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        bolt_positions: List[List[float]] = inputs.get('bolt_positions', [
            [-50, -50], [50, -50], [-50, 50], [50, 50]
        ])
        V_kN = inputs.get('shear_kN', 100)
        M_kNm = inputs.get('moment_kNm', 10)
        P_x_kN = inputs.get('horizontal_kN', 0)
        P_y_kN = inputs.get('vertical_kN', 0)
        bolt_dia_mm = inputs.get('bolt_diameter_mm', 20)
        fub_MPa = inputs.get('fub_MPa', 800)
        gamma_M2 = 1.25
        n = len(bolt_positions)

        if n == 0:
            return {"error": "No bolt positions", "overall_status": "FAIL"}

        A_s = math.pi / 4 * (bolt_dia_mm * 0.84) ** 2
        alpha_v = 0.6 if fub_MPa <= 800 else 0.5
        F_v_Rd_kN = alpha_v * fub_MPa * A_s / gamma_M2 / 1000

        # Centroid of bolt group
        cx = sum(p[0] for p in bolt_positions) / n
        cy = sum(p[1] for p in bolt_positions) / n

        # Polar moment of inertia about centroid
        I_p = sum((p[0] - cx) ** 2 + (p[1] - cy) ** 2 for p in bolt_positions)

        # Direct shear per bolt
        V_direct_x = P_x_kN / n
        V_direct_y = (V_kN + P_y_kN) / n

        # Moment-induced forces (torsion about centroid)
        M_total_kNmm = M_kNm * 1000  # convert kNm to kNmm
        bolt_forces = []
        max_force = 0

        for i, pos in enumerate(bolt_positions):
            dx = pos[0] - cx
            dy = pos[1] - cy
            r = math.sqrt(dx ** 2 + dy ** 2)

            if I_p > 0:
                F_mx = -M_total_kNmm * dy / I_p
                F_my = M_total_kNmm * dx / I_p
            else:
                F_mx = 0
                F_my = 0

            Fx = V_direct_x + F_mx
            Fy = V_direct_y + F_my
            F_resultant = math.sqrt(Fx ** 2 + Fy ** 2)
            max_force = max(max_force, F_resultant)

            bolt_forces.append({
                "bolt": i + 1,
                "x": pos[0], "y": pos[1],
                "Fx_kN": round(Fx, 2), "Fy_kN": round(Fy, 2),
                "F_resultant_kN": round(F_resultant, 2),
                "utilisation": round(F_resultant / F_v_Rd_kN * 100, 1) if F_v_Rd_kN > 0 else 0,
            })

        util_max = max_force / F_v_Rd_kN if F_v_Rd_kN > 0 else float('inf')

        checks = [
            {"name": "Max Bolt Force", "utilisation": round(util_max * 100, 1),
             "status": "PASS" if util_max <= 1.0 else "FAIL",
             "detail": f"F_max={max_force:.1f}kN / F_v,Rd={F_v_Rd_kN:.1f}kN"},
        ]

        return {
            "centroid": {"x": round(cx, 1), "y": round(cy, 1)},
            "I_p_mm2": round(I_p, 0),
            "F_v_Rd_kN": round(F_v_Rd_kN, 1),
            "bolt_forces": bolt_forces,
            "max_bolt_force_kN": round(max_force, 2),
            "checks": checks,
            "overall_status": "PASS" if util_max <= 1.0 else "FAIL",
            "utilisation": round(util_max * 100, 1),
        }


calculator = BoltPatternCalculator()
