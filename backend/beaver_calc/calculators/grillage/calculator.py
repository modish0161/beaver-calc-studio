"""
Simple grillage analysis — distributes load across longitudinal members.
Calculates distribution factors, moments and shears per beam.
"""
from typing import Dict, Any, List
import math
from ..base import CalculatorPlugin


class GrillageCalculator(CalculatorPlugin):
    key = "grillage_v1"
    name = "Grillage Analysis"
    version = "1.0.0"
    description = "Load distribution in grillage of beams"
    category = "bridges"
    reference_text = "BD 37/01, EN 1991-2"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        n_beams = inputs.get('number_beams', 5)
        beam_spacing_m = inputs.get('beam_spacing_m', 1.5)
        span_m = inputs.get('span_m', 12)
        # Beam stiffness
        EI_long = inputs.get('EI_longitudinal_kNm2', 500000)
        EI_trans = inputs.get('EI_transverse_kNm2', 100000)
        # Loading
        P_kN = inputs.get('point_load_kN', 100)
        load_position_beam = inputs.get('load_position_beam', 2)  # 0-indexed beam
        w_udl_kN_m = inputs.get('udl_kN_m', 10)

        # Stiffness parameter alpha
        alpha = (EI_trans / EI_long) ** 0.25 if EI_long > 0 else 1.0
        width = (n_beams - 1) * beam_spacing_m

        # Distribution factors (simplified Courbon's method)
        # For symmetric grillage: D_i = 1/n + (6*e*x_i) / (n * sum(x^2))
        beam_positions = [(i - (n_beams - 1) / 2) * beam_spacing_m for i in range(n_beams)]
        sum_x2 = sum(x ** 2 for x in beam_positions)

        load_eccentricity = beam_positions[min(load_position_beam, n_beams - 1)]

        dist_factors = []
        for i, xi in enumerate(beam_positions):
            D_i = 1 / n_beams
            if sum_x2 > 0:
                D_i += 6 * load_eccentricity * xi / (n_beams * sum_x2)
            D_i = max(D_i, 0)
            dist_factors.append(round(D_i, 4))

        # Moments and shears per beam
        M_total_point = P_kN * span_m / 4  # mid-span moment from point load
        M_total_udl = w_udl_kN_m * span_m ** 2 / 8
        V_total_point = P_kN / 2
        V_total_udl = w_udl_kN_m * span_m / 2

        beam_results = []
        max_util = 0
        M_Rd = inputs.get('beam_moment_capacity_kNm', 200)

        for i in range(n_beams):
            D = dist_factors[i]
            M_beam = D * M_total_point + M_total_udl / n_beams
            V_beam = D * V_total_point + V_total_udl / n_beams
            util = M_beam / M_Rd if M_Rd > 0 else float('inf')
            max_util = max(max_util, util)
            beam_results.append({
                "beam": i + 1,
                "dist_factor": D,
                "M_kNm": round(M_beam, 1),
                "V_kN": round(V_beam, 1),
                "utilisation": round(util * 100, 1),
            })

        checks = [
            {"name": "Most loaded beam", "utilisation": round(max_util * 100, 1),
             "status": "PASS" if max_util <= 1.0 else "FAIL",
             "detail": f"Max beam moment util = {max_util:.3f}"},
            {"name": "Distribution check", "utilisation": round(max(dist_factors) / (1 / n_beams) * 100 / 2, 1),
             "status": "PASS" if max(dist_factors) < 2.0 / n_beams else "FAIL",
             "detail": f"Max dist factor = {max(dist_factors):.4f} (uniform = {1 / n_beams:.4f})"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "distribution_factors": dist_factors,
            "beam_results": beam_results,
            "alpha": round(alpha, 4),
            "M_total_kNm": round(M_total_point + M_total_udl, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(max_util * 100, 1),
        }


calculator = GrillageCalculator()
