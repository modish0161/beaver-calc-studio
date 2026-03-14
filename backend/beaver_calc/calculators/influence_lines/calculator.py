"""
Influence Lines for Deck / Grillage Elements.

Applies Müller-Breslau's principle using the beam solver stiffness method.
For a given response quantity (reaction, moment, shear at a point),
the influence line is obtained by applying a unit action
at successive positions along the beam.

Reference: EN 1991-2, BD 37/01, Structural Analysis (Ghali et al.)
"""

from typing import Dict, Any, List
from ..base import CalculatorPlugin
from ..beam_solver.calculator import _analyse_beam


class InfluenceLinesCalculator(CalculatorPlugin):
    key = "influence_lines_v1"
    name = "Influence Lines"
    version = "1.0.0"
    description = (
        "Generate influence lines for reactions, bending moments, and shear forces "
        "on simply-supported or continuous multi-span beams."
    )
    category = "structural"
    reference_text = "EN 1991-2, BD 37/01, Müller-Breslau Principle"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        spans = inputs.get("spans_m", [12.0])
        EI = inputs.get("EI_kNm2", 500000.0)
        response_type = inputs.get("response_type", "moment")  # "moment", "shear", "reaction"
        response_position_m = inputs.get("response_position_m", None)
        response_node = inputs.get("response_node", 0)  # for reactions
        step_m = inputs.get("step_m", 0.5)

        total_length = sum(spans)

        if response_position_m is None:
            response_position_m = total_length / 2

        # Unit load traversal
        n_positions = max(int(total_length / step_m) + 1, 3)
        positions = [i * total_length / (n_positions - 1) for i in range(n_positions)]

        il_values: List[float] = []

        for load_pos in positions:
            point_loads = [{"position_m": load_pos, "magnitude_kN": 1.0}]
            result = _analyse_beam(spans, EI, point_loads, [])

            if response_type == "reaction":
                # Influence ordinate = reaction at specified node
                node_idx = min(response_node, len(result["reactions"]) - 1)
                il_values.append(result["reactions"][node_idx])
            elif response_type == "moment":
                # Interpolate moment at response_position_m
                val = self._interp(result["stations_x"], result["moments"], response_position_m)
                il_values.append(val)
            elif response_type == "shear":
                val = self._interp(result["stations_x"], result["shears"], response_position_m)
                il_values.append(val)
            else:
                il_values.append(0.0)

        # Find peak values
        max_positive = max(il_values) if il_values else 0.0
        max_negative = min(il_values) if il_values else 0.0
        max_pos_location = positions[il_values.index(max_positive)] if max_positive != 0 else 0
        max_neg_location = positions[il_values.index(max_negative)] if max_negative != 0 else 0

        # Area under IL (for UDL loading)
        area_positive = 0.0
        area_negative = 0.0
        for i in range(len(positions) - 1):
            dx = positions[i + 1] - positions[i]
            avg = (il_values[i] + il_values[i + 1]) / 2
            if avg > 0:
                area_positive += avg * dx
            else:
                area_negative += avg * dx

        return {
            "response_type": response_type,
            "response_position_m": round(response_position_m, 3),
            "total_length_m": round(total_length, 3),
            "n_spans": len(spans),
            "influence_line": {
                "positions_m": [round(p, 4) for p in positions],
                "ordinates": [round(v, 6) for v in il_values],
            },
            "max_positive_ordinate": round(max_positive, 6),
            "max_positive_location_m": round(max_pos_location, 3),
            "max_negative_ordinate": round(max_negative, 6),
            "max_negative_location_m": round(max_neg_location, 3),
            "area_positive": round(area_positive, 4),
            "area_negative": round(area_negative, 4),
            "checks": [
                {
                    "name": f"IL peak ({response_type})",
                    "status": "PASS",
                    "utilization": round(abs(max_positive) * 100, 1) if abs(max_positive) > abs(max_negative) else round(abs(max_negative) * 100, 1),
                    "detail": f"Peak ordinate = {max(abs(max_positive), abs(max_negative)):.4f}",
                }
            ],
            "overall_status": "PASS",
        }

    @staticmethod
    def _interp(xs: List[float], ys: List[float], x: float) -> float:
        if not xs:
            return 0.0
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        for i in range(len(xs) - 1):
            if xs[i] <= x <= xs[i + 1]:
                t = (x - xs[i]) / (xs[i + 1] - xs[i]) if xs[i + 1] != xs[i] else 0
                return ys[i] + t * (ys[i + 1] - ys[i])
        return ys[-1]


calculator = InfluenceLinesCalculator()
