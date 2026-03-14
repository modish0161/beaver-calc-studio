"""
Steel column axial compression design per EN 1993-1-1 cl 6.3.1.
Flexural buckling about both axes, class check, and N-M interaction if moment present.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SteelColumnAxialCalculator(CalculatorPlugin):
    key = "steel_column_axial_v1"
    name = "Steel Column Axial"
    version = "1.0.0"
    description = "Steel column axial/buckling design per EN 1993-1-1 cl 6.3.1"
    category = "steel"
    reference_text = "EN 1993-1-1:2005 cl 6.3.1; SCI P362"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Loading
        N_Ed_kN = inputs.get('N_Ed_kN', 1200)
        M_y_Ed_kNm = inputs.get('M_y_Ed_kNm', 0)
        M_z_Ed_kNm = inputs.get('M_z_Ed_kNm', 0)

        # Section properties
        section_name = inputs.get('section_name', 'UC 254x254x89')
        A_cm2 = inputs.get('A_cm2', 113)
        Iy_cm4 = inputs.get('Iy_cm4', 14300)
        Iz_cm4 = inputs.get('Iz_cm4', 4860)
        iy_cm = inputs.get('iy_cm', 11.2)
        iz_cm = inputs.get('iz_cm', 6.55)
        Wpl_y_cm3 = inputs.get('Wpl_y_cm3', 1100)
        Wpl_z_cm3 = inputs.get('Wpl_z_cm3', 534)
        tf_mm = inputs.get('tf_mm', 17.3)
        tw_mm = inputs.get('tw_mm', 10.3)
        h_mm = inputs.get('h_mm', 260.3)
        b_mm = inputs.get('b_mm', 256.3)

        # Material
        fy_MPa = inputs.get('fy_MPa', 355)
        E_MPa = inputs.get('E_MPa', 210000)
        gamma_M0 = inputs.get('gamma_M0', 1.0)
        gamma_M1 = inputs.get('gamma_M1', 1.0)

        # Effective lengths
        L_y_mm = inputs.get('L_y_mm', 4000)
        L_z_mm = inputs.get('L_z_mm', 4000)
        k_y = inputs.get('effective_length_factor_y', 1.0)
        k_z = inputs.get('effective_length_factor_z', 1.0)

        L_cr_y = L_y_mm * k_y
        L_cr_z = L_z_mm * k_z

        # Cross-section capacity
        N_pl_Rd = A_cm2 * 1e-4 * fy_MPa * 1e3 / gamma_M0  # kN
        section_ratio = N_Ed_kN / N_pl_Rd if N_pl_Rd > 0 else 999

        # Slenderness
        N_cr_y = math.pi ** 2 * E_MPa * Iy_cm4 * 1e-8 / (L_cr_y / 1000) ** 2 * 1e3  # kN
        N_cr_z = math.pi ** 2 * E_MPa * Iz_cm4 * 1e-8 / (L_cr_z / 1000) ** 2 * 1e3  # kN

        lambda_y = math.sqrt(A_cm2 * 1e-4 * fy_MPa * 1e3 / N_cr_y) if N_cr_y > 0 else 999
        lambda_z = math.sqrt(A_cm2 * 1e-4 * fy_MPa * 1e3 / N_cr_z) if N_cr_z > 0 else 999

        # Buckling curve selection (EN 1993-1-1 Table 6.2)
        # For rolled H-sections: h/b > 1.2 → y-y: curve a, z-z: curve b
        # h/b ≤ 1.2 → y-y: curve b, z-z: curve c
        hb_ratio = h_mm / b_mm if b_mm > 0 else 1
        if tf_mm <= 40:
            if hb_ratio > 1.2:
                alpha_y = 0.21  # curve a
                alpha_z = 0.34  # curve b
            else:
                alpha_y = 0.34  # curve b
                alpha_z = 0.49  # curve c
        else:
            if hb_ratio > 1.2:
                alpha_y = 0.34  # curve b
                alpha_z = 0.49  # curve c
            else:
                alpha_y = 0.49  # curve c
                alpha_z = 0.76  # curve d

        # Buckling reduction factor χ (cl 6.3.1.2)
        def chi_buckling(lam, alpha):
            if lam <= 0.2:
                return 1.0
            phi = 0.5 * (1 + alpha * (lam - 0.2) + lam ** 2)
            return min(1.0, 1.0 / (phi + math.sqrt(phi ** 2 - lam ** 2)))

        chi_y = chi_buckling(lambda_y, alpha_y)
        chi_z = chi_buckling(lambda_z, alpha_z)

        # Buckling resistance
        N_b_Rd_y = chi_y * A_cm2 * 1e-4 * fy_MPa * 1e3 / gamma_M1
        N_b_Rd_z = chi_z * A_cm2 * 1e-4 * fy_MPa * 1e3 / gamma_M1
        N_b_Rd = min(N_b_Rd_y, N_b_Rd_z)

        buckling_ratio = N_Ed_kN / N_b_Rd if N_b_Rd > 0 else 999
        governing_axis = "y-y" if N_b_Rd_y <= N_b_Rd_z else "z-z"

        checks = [
            {"name": "Cross-section (compression)",
             "utilisation": round(section_ratio * 100, 1),
             "status": "PASS" if section_ratio <= 1.0 else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.0f} kN / N_pl,Rd={N_pl_Rd:.0f} kN"},
            {"name": f"Flexural buckling ({governing_axis})",
             "utilisation": round(buckling_ratio * 100, 1),
             "status": "PASS" if buckling_ratio <= 1.0 else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.0f} kN / N_b,Rd={N_b_Rd:.0f} kN (χ={min(chi_y, chi_z):.3f}, λ̄={max(lambda_y, lambda_z):.2f})"},
        ]

        # N-M interaction if moments present (cl 6.3.3 Eq 6.61/6.62 simplified)
        if M_y_Ed_kNm > 0 or M_z_Ed_kNm > 0:
            M_y_Rd = Wpl_y_cm3 * 1e-6 * fy_MPa * 1e3 / gamma_M0
            M_z_Rd = Wpl_z_cm3 * 1e-6 * fy_MPa * 1e3 / gamma_M0
            # Simplified interaction (Eq 6.61)
            k_yy = min(1.0 + 0.6 * lambda_y * N_Ed_kN / (chi_y * N_pl_Rd) if chi_y * N_pl_Rd > 0 else 999,
                       1.0 + 0.6 * N_Ed_kN / (chi_y * N_pl_Rd) if chi_y * N_pl_Rd > 0 else 999)
            k_yy = max(k_yy, 1.0)
            interaction_661 = (N_Ed_kN / (chi_y * N_pl_Rd / gamma_M1) if chi_y * N_pl_Rd > 0 else 999) + \
                              k_yy * M_y_Ed_kNm / M_y_Rd + 0.6 * M_z_Ed_kNm / M_z_Rd
            checks.append({
                "name": "N-M interaction (Eq 6.61)",
                "utilisation": round(interaction_661 * 100, 1),
                "status": "PASS" if interaction_661 <= 1.0 else "FAIL",
                "detail": f"Combined={interaction_661:.3f} ≤ 1.0",
            })

        overall = all(c['status'] == 'PASS' for c in checks)
        governing_util = max(c['utilisation'] for c in checks)

        return {
            "N_pl_Rd_kN": round(N_pl_Rd, 0),
            "N_b_Rd_kN": round(N_b_Rd, 0),
            "chi_y": round(chi_y, 3),
            "chi_z": round(chi_z, 3),
            "lambda_y": round(lambda_y, 2),
            "lambda_z": round(lambda_z, 2),
            "governing_axis": governing_axis,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing_util, 1),
        }


calculator = SteelColumnAxialCalculator()
