"""
Simplified RC slab bending calculator
"""
from typing import Dict, Any

from ..base import CalculatorPlugin


class RCSlabBendingCalculator(CalculatorPlugin):
    """Simplified RC slab bending check calculator"""

    key = "rc_slab_bending_v1"
    name = "RC Slab One/Two-Way Bending"
    version = "1.0.0"
    description = "Simplified reinforced concrete slab bending analysis"
    category = "structural"
    reference_text = "EN 1992-1-1:2004 - Design of concrete structures"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """RC slab bending check per EN 1992-1-1.

        Treats a 1 m wide strip as a simply-supported beam of span *span_m*.
        """

        # --- Inputs ---------------------------------------------------------
        thickness_mm = inputs.get('thickness_mm', 200)
        span_m = inputs.get('span_m', 4.0)
        load_kN_m2 = inputs.get('load_kN_m2', 5.0)
        concrete_grade = inputs.get('concrete_grade', 'C25/30')
        steel_grade = inputs.get('steel_grade', 'B500')
        cover_mm = inputs.get('cover_mm', 25)
        bar_dia_mm = inputs.get('bar_dia_mm', 12)

        # --- Material properties -------------------------------------------
        CONCRETE_GRADES = {
            'C20/25': 20, 'C25/30': 25, 'C28/35': 28,
            'C30/37': 30, 'C32/40': 32, 'C35/45': 35, 'C40/50': 40,
        }
        f_ck = CONCRETE_GRADES.get(concrete_grade, 25)  # N/mm²
        f_cd = f_ck / 1.5
        f_ctm = 0.30 * f_ck ** (2.0 / 3.0)

        f_yk = 500 if steel_grade == 'B500' else 460  # N/mm²
        f_yd = f_yk / 1.15

        # --- Section geometry (per metre width) -----------------------------
        b = 1000  # mm  (1 m strip)
        d = thickness_mm - cover_mm - bar_dia_mm / 2  # effective depth mm

        # --- ULS bending moment (simply-supported UDL) ----------------------
        w_kN_m = load_kN_m2 * 1.0  # kN/m per metre strip
        M_Ed_kNm = w_kN_m * span_m ** 2 / 8

        # --- Flexural design (cl 6.1) --------------------------------------
        K = M_Ed_kNm * 1e6 / (b * d ** 2 * f_cd)  # dimensionless
        K_prime = 0.167  # singly-reinforced limit (delta = 0.85)

        if K <= K_prime:
            z = d * min(0.5 + (0.25 - K / 1.134) ** 0.5, 0.95)
            As_req_mm2 = M_Ed_kNm * 1e6 / (0.87 * f_yd * z)  # mm²/m
            doubly_reinforced = False
        else:
            z = d * min(0.5 + (0.25 - K_prime / 1.134) ** 0.5, 0.95)
            M_prime = K_prime * b * d ** 2 * f_cd  # N·mm  (limiting moment)
            delta_M = M_Ed_kNm * 1e6 - M_prime       # excess moment N·mm
            d_prime = cover_mm + bar_dia_mm / 2
            As2 = delta_M / (0.87 * f_yd * (d - d_prime))  # compression steel mm²/m
            As_req_mm2 = M_prime / (0.87 * f_yd * z) + As2   # total tension mm²/m
            doubly_reinforced = True

        # --- Minimum reinforcement (cl 9.2.1.1) ----------------------------
        As_min_mm2 = max(0.26 * f_ctm / f_yk * b * d,
                         0.0013 * b * d)

        As_prov_mm2 = max(As_req_mm2, As_min_mm2)

        # --- Utilisation ratio ----------------------------------------------
        utilisation = round(K / K_prime, 3) if K > 0 else 0.0

        # --- Build checks ---------------------------------------------------
        checks = [
            {
                "check": "Bending capacity (K <= K')",
                "status": "PASS" if K <= K_prime else "FAIL",
                "utilisation": utilisation,
                "K": round(K, 4),
                "K_limit": K_prime,
            },
            {
                "check": "Minimum reinforcement",
                "status": "PASS" if As_req_mm2 >= As_min_mm2 else "INFO",
                "As_req_mm2_m": round(As_req_mm2, 1),
                "As_min_mm2_m": round(As_min_mm2, 1),
            },
        ]

        overall_status = "PASS" if K <= K_prime else "FAIL"

        return {
            "span_m": span_m,
            "M_Ed_kNm": round(M_Ed_kNm, 2),
            "f_ck_N_mm2": f_ck,
            "f_yk_N_mm2": f_yk,
            "effective_depth_mm": round(d, 1),
            "K": round(K, 4),
            "doubly_reinforced": doubly_reinforced,
            "As_required_mm2_m": round(As_req_mm2, 1),
            "As_min_mm2_m": round(As_min_mm2, 1),
            "As_provided_mm2_m": round(As_prov_mm2, 1),
            "checks": checks,
            "overall_status": overall_status,
            "utilisation": utilisation,
            "notes": [
                f"EN 1992-1-1:2004, 1 m strip, span {span_m} m",
                "Simply-supported UDL assumed",
            ],
        }


calculator = RCSlabBendingCalculator()
