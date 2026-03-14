"""
Cut & Fill volume calculator using cross-section / average end-area method.
Computes volumes, net balance, and bulking/shrinkage adjustments.
"""
from typing import Dict, Any, List
import math
from ..base import CalculatorPlugin


class CutFillVolumesCalculator(CalculatorPlugin):
    key = "cut_fill_volumes_v1"
    name = "Cut & Fill Volumes"
    version = "1.0.0"
    description = "Cut/fill volume estimation using average end-area method"
    category = "earthworks"
    reference_text = "BS 6031:2009 Earthworks"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Cross-sections: list of {chainage_m, cut_area_m2, fill_area_m2}
        sections: List[dict] = inputs.get('sections', [
            {"chainage_m": 0, "cut_area_m2": 5.0, "fill_area_m2": 0.0},
            {"chainage_m": 25, "cut_area_m2": 12.0, "fill_area_m2": 0.0},
            {"chainage_m": 50, "cut_area_m2": 8.0, "fill_area_m2": 2.0},
            {"chainage_m": 75, "cut_area_m2": 0.0, "fill_area_m2": 10.0},
            {"chainage_m": 100, "cut_area_m2": 0.0, "fill_area_m2": 6.0},
        ])
        bulking_factor = inputs.get('bulking_factor', 1.20)  # e.g. 1.20 for clay
        shrinkage_factor = inputs.get('shrinkage_factor', 0.90)  # compaction

        total_cut = 0.0
        total_fill = 0.0
        segment_results = []

        for i in range(len(sections) - 1):
            s1 = sections[i]
            s2 = sections[i + 1]
            dist = s2['chainage_m'] - s1['chainage_m']
            cut_vol = dist * (s1['cut_area_m2'] + s2['cut_area_m2']) / 2
            fill_vol = dist * (s1['fill_area_m2'] + s2['fill_area_m2']) / 2
            total_cut += cut_vol
            total_fill += fill_vol
            segment_results.append({
                "from_ch": s1['chainage_m'],
                "to_ch": s2['chainage_m'],
                "cut_m3": round(cut_vol, 1),
                "fill_m3": round(fill_vol, 1),
            })

        # Adjusted volumes
        bulked_cut = total_cut * bulking_factor
        compacted_fill = total_fill / shrinkage_factor

        net_balance = total_cut - total_fill
        adjusted_balance = bulked_cut - compacted_fill

        # Check: can we re-use cut material?
        reuse_ratio = total_cut / compacted_fill if compacted_fill > 0 else float('inf')

        checks = [
            {"name": "Volume balance (unadjusted)", "utilisation": round(abs(net_balance / max(total_cut, total_fill, 1)) * 100, 1),
             "status": "PASS" if net_balance >= 0 else "FAIL",
             "detail": f"Cut={total_cut:.1f} m³, Fill={total_fill:.1f} m³, Net={net_balance:+.1f} m³"},
            {"name": "Adjusted balance", "utilisation": round(abs(adjusted_balance / max(bulked_cut, compacted_fill, 1)) * 100, 1),
             "status": "PASS" if adjusted_balance >= 0 else "FAIL",
             "detail": f"Bulked cut={bulked_cut:.1f} m³, Compacted fill={compacted_fill:.1f} m³, Net={adjusted_balance:+.1f} m³"},
            {"name": "Material reuse", "utilisation": round(min(reuse_ratio, 1.0) * 100, 1),
             "status": "PASS" if reuse_ratio >= 1.0 else "FAIL",
             "detail": f"Cut/Fill ratio = {reuse_ratio:.2f} ({'surplus' if reuse_ratio >= 1 else 'import needed'})"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "total_cut_m3": round(total_cut, 1),
            "total_fill_m3": round(total_fill, 1),
            "net_balance_m3": round(net_balance, 1),
            "bulked_cut_m3": round(bulked_cut, 1),
            "compacted_fill_m3": round(compacted_fill, 1),
            "adjusted_balance_m3": round(adjusted_balance, 1),
            "segments": segment_results,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(abs(adjusted_balance / max(bulked_cut, 1)) * 100, 1),
        }


calculator = CutFillVolumesCalculator()
