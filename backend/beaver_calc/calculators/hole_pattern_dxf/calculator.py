"""
Hole / bolt pattern layout calculator.
Generates hole coordinates, checks edge/end distances, pitch per EN 1993-1-8.
"""
from typing import Dict, Any, List
import math
from ..base import CalculatorPlugin


class HolePatternDxfCalculator(CalculatorPlugin):
    key = "hole_pattern_dxf_v1"
    name = "Hole Pattern DXF"
    version = "1.0.0"
    description = "Bolt hole pattern layout and edge distance checks"
    category = "steel"
    reference_text = "EN 1993-1-8:2005 Table 3.3"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Pattern
        n_rows = inputs.get('rows', 2)
        n_cols = inputs.get('columns', 3)
        pitch_x_mm = inputs.get('pitch_x_mm', 70)
        pitch_y_mm = inputs.get('pitch_y_mm', 80)
        # Bolt
        bolt_dia_mm = inputs.get('bolt_diameter_mm', 20)
        hole_dia_mm = inputs.get('hole_diameter_mm', 22)
        # Plate
        plate_width_mm = inputs.get('plate_width_mm', 200)
        plate_height_mm = inputs.get('plate_height_mm', 300)
        plate_thk_mm = inputs.get('plate_thk_mm', 12)
        # Starting position (offset from plate edge)
        edge_x_mm = inputs.get('edge_distance_x_mm', 35)
        end_y_mm = inputs.get('end_distance_y_mm', 40)

        d0 = hole_dia_mm

        # EN 1993-1-8 Table 3.3 minimum distances
        e1_min = 1.2 * d0  # end distance
        e2_min = 1.2 * d0  # edge distance
        p1_min = 2.2 * d0  # pitch in direction of force
        p2_min = 2.4 * d0  # pitch perpendicular to force

        # Maximum distances
        e1_max = min(4 * plate_thk_mm + 40, 12 * plate_thk_mm)
        p1_max = min(14 * plate_thk_mm, 200)

        # Generate hole coordinates
        holes: List[dict] = []
        for row in range(n_rows):
            for col in range(n_cols):
                x = edge_x_mm + col * pitch_x_mm
                y = end_y_mm + row * pitch_y_mm
                holes.append({"x_mm": round(x, 1), "y_mm": round(y, 1), "dia_mm": hole_dia_mm})

        # Check edge/end distances
        min_edge_x = edge_x_mm
        max_edge_x = plate_width_mm - (edge_x_mm + (n_cols - 1) * pitch_x_mm)
        min_end_y = end_y_mm
        max_end_y = plate_height_mm - (end_y_mm + (n_rows - 1) * pitch_y_mm)

        edge_ok = min(min_edge_x, max_edge_x) >= e2_min
        end_ok = min(min_end_y, max_end_y) >= e1_min
        pitch_x_ok = pitch_x_mm >= p2_min if n_cols > 1 else True
        pitch_y_ok = pitch_y_mm >= p1_min if n_rows > 1 else True

        # Pattern centroid
        cx = edge_x_mm + (n_cols - 1) * pitch_x_mm / 2
        cy = end_y_mm + (n_rows - 1) * pitch_y_mm / 2

        # Polar moment of area (for bolt group)
        I_p = 0
        for h in holes:
            I_p += (h['x_mm'] - cx) ** 2 + (h['y_mm'] - cy) ** 2
        r_max = max(math.sqrt((h['x_mm'] - cx) ** 2 + (h['y_mm'] - cy) ** 2) for h in holes) if holes else 0

        checks = [
            {"name": "Edge distance (e2 ≥ 1.2d0)", "utilisation": round(e2_min / min(min_edge_x, max_edge_x) * 100, 1) if min(min_edge_x, max_edge_x) > 0 else 999,
             "status": "PASS" if edge_ok else "FAIL",
             "detail": f"e2_min={min(min_edge_x, max_edge_x):.1f} mm (req {e2_min:.1f} mm)"},
            {"name": "End distance (e1 ≥ 1.2d0)", "utilisation": round(e1_min / min(min_end_y, max_end_y) * 100, 1) if min(min_end_y, max_end_y) > 0 else 999,
             "status": "PASS" if end_ok else "FAIL",
             "detail": f"e1_min={min(min_end_y, max_end_y):.1f} mm (req {e1_min:.1f} mm)"},
            {"name": "Pitch x (p2 ≥ 2.4d0)", "utilisation": round(p2_min / pitch_x_mm * 100, 1) if pitch_x_mm > 0 else 0,
             "status": "PASS" if pitch_x_ok else "FAIL",
             "detail": f"p2={pitch_x_mm:.1f} mm (req {p2_min:.1f} mm)"},
            {"name": "Pitch y (p1 ≥ 2.2d0)", "utilisation": round(p1_min / pitch_y_mm * 100, 1) if pitch_y_mm > 0 else 0,
             "status": "PASS" if pitch_y_ok else "FAIL",
             "detail": f"p1={pitch_y_mm:.1f} mm (req {p1_min:.1f} mm)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "holes": holes,
            "centroid_x_mm": round(cx, 1),
            "centroid_y_mm": round(cy, 1),
            "n_holes": len(holes),
            "I_polar_mm2": round(I_p, 0),
            "r_max_mm": round(r_max, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = HolePatternDxfCalculator()
