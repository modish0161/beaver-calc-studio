"""
Timber quantity take-off calculator.
Computes board-feet / cubic metres, piece count, wastage, and cost estimate.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class TimberQuantityCalculator(CalculatorPlugin):
    key = "timber_quantity_v1"
    name = "Timber Quantity"
    version = "1.0.0"
    description = "Timber quantity take-off — volume, piece count, wastage"
    category = "quantities"
    reference_text = "BS EN 14081-1; Industry practice"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Members (list or single specification)
        members = inputs.get('members', [])
        # Single member fallback
        if not members:
            members = [{
                'description': inputs.get('description', 'Joist'),
                'b_mm': inputs.get('b_mm', 47),
                'h_mm': inputs.get('h_mm', 200),
                'length_mm': inputs.get('length_mm', 4800),
                'quantity': inputs.get('quantity', 20),
            }]

        wastage_pct = inputs.get('wastage_pct', 10)
        price_per_m3 = inputs.get('price_per_m3', 400)  # £/m³

        total_net_m3 = 0
        total_gross_m3 = 0
        total_pieces = 0
        results = []

        for m in members:
            b = m.get('b_mm', 47)
            h = m.get('h_mm', 200)
            length = m.get('length_mm', 4800)
            qty = m.get('quantity', 1)
            desc = m.get('description', 'Member')

            vol_per_piece = (b / 1000) * (h / 1000) * (length / 1000)  # m³
            net_vol = vol_per_piece * qty
            gross_vol = net_vol * (1 + wastage_pct / 100)
            lineal_m = (length / 1000) * qty

            results.append({
                'description': desc,
                'size': f'{b}×{h}mm',
                'length_m': round(length / 1000, 2),
                'quantity': qty,
                'net_m3': round(net_vol, 3),
                'gross_m3': round(gross_vol, 3),
                'lineal_m': round(lineal_m, 1),
            })

            total_net_m3 += net_vol
            total_gross_m3 += gross_vol
            total_pieces += qty

        cost_estimate = total_gross_m3 * price_per_m3

        checks = [
            {"name": "Total net volume",
             "utilisation": 0, "status": "INFO",
             "detail": f"{total_net_m3:.3f} m³ ({total_pieces} pieces)"},
            {"name": "Total gross volume (inc. wastage)",
             "utilisation": 0, "status": "INFO",
             "detail": f"{total_gross_m3:.3f} m³ ({wastage_pct}% wastage)"},
            {"name": "Cost estimate",
             "utilisation": 0, "status": "INFO",
             "detail": f"£{cost_estimate:,.0f} @ £{price_per_m3}/m³"},
        ]

        return {
            "members": results,
            "total_net_m3": round(total_net_m3, 3),
            "total_gross_m3": round(total_gross_m3, 3),
            "total_pieces": total_pieces,
            "cost_estimate": round(cost_estimate, 0),
            "checks": checks,
            "overall_status": "PASS",
            "utilisation": 0,
        }


calculator = TimberQuantityCalculator()
