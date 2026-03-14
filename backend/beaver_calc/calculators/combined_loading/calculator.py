"""
Combined axial + bending check (EN 1993-1-1 cl 6.3.3)
Interaction checks for members under combined N + My + Mz.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class CombinedLoadingCalculator(CalculatorPlugin):
    key = "combined_loading_v1"
    name = "Combined Loading Check"
    version = "1.0.0"
    description = "N + My + Mz interaction check to EN 1993-1-1"
    category = "steel"
    reference_text = "EN 1993-1-1:2005 cl 6.3.3"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        N_Ed_kN = inputs.get('axial_kN', 500)
        My_Ed_kNm = inputs.get('moment_y_kNm', 80)
        Mz_Ed_kNm = inputs.get('moment_z_kNm', 20)
        section_area_mm2 = inputs.get('section_area_mm2', 9310)
        Iy_mm4 = inputs.get('Iy_mm4', 142e6)
        Iz_mm4 = inputs.get('Iz_mm4', 48.4e6)
        Wpl_y_mm3 = inputs.get('Wpl_y_mm3', 1283e3)
        Wpl_z_mm3 = inputs.get('Wpl_z_mm3', 584e3)
        fy_MPa = inputs.get('fy_MPa', 355)
        L_y_mm = inputs.get('buckling_length_y_mm', 5000)
        L_z_mm = inputs.get('buckling_length_z_mm', 5000)
        L_LTB_mm = inputs.get('ltb_length_mm', 5000)
        section_class = inputs.get('section_class', 1)
        gamma_M0 = 1.0
        gamma_M1 = 1.0

        E = 210000  # MPa
        # Section resistances
        N_Rk = section_area_mm2 * fy_MPa / 1000  # kN
        My_Rk = Wpl_y_mm3 * fy_MPa / 1e6  # kNm
        Mz_Rk = Wpl_z_mm3 * fy_MPa / 1e6  # kNm

        # Euler buckling loads
        N_cr_y = math.pi ** 2 * E * Iy_mm4 / L_y_mm ** 2 / 1000 if L_y_mm > 0 else float('inf')
        N_cr_z = math.pi ** 2 * E * Iz_mm4 / L_z_mm ** 2 / 1000 if L_z_mm > 0 else float('inf')

        # Slenderness ratios
        lambda_y = math.sqrt(N_Rk / N_cr_y) if N_cr_y > 0 else 0
        lambda_z = math.sqrt(N_Rk / N_cr_z) if N_cr_z > 0 else 0

        # Buckling reduction factor (curve b: alpha=0.34)
        def chi(lam, alpha=0.34):
            if lam <= 0.2:
                return 1.0
            phi = 0.5 * (1 + alpha * (lam - 0.2) + lam ** 2)
            return min(1.0, 1 / (phi + math.sqrt(phi ** 2 - lam ** 2)))

        chi_y = chi(lambda_y, 0.34)
        chi_z = chi(lambda_z, 0.49)

        # LTB reduction (simplified)
        iy = math.sqrt(Iy_mm4 / section_area_mm2)
        iz = math.sqrt(Iz_mm4 / section_area_mm2)
        M_cr = math.pi ** 2 * E * Iz_mm4 / L_LTB_mm ** 2 / 1e6 * 1.1 if L_LTB_mm > 0 else float('inf')
        lambda_LT = math.sqrt(My_Rk / M_cr) if M_cr > 0 else 0
        chi_LT = chi(lambda_LT, 0.34)

        N_b_Rd_y = chi_y * N_Rk / gamma_M1
        N_b_Rd_z = chi_z * N_Rk / gamma_M1
        N_b_Rd = min(N_b_Rd_y, N_b_Rd_z)
        My_b_Rd = chi_LT * My_Rk / gamma_M1
        Mz_Rd = Mz_Rk / gamma_M0

        # Interaction factors (simplified method, Annex B)
        Cmy = 0.9
        Cmz = 0.9
        CmLT = 0.9

        n_y = N_Ed_kN / (chi_y * N_Rk / gamma_M1) if chi_y > 0 else float('inf')
        n_z = N_Ed_kN / (chi_z * N_Rk / gamma_M1) if chi_z > 0 else float('inf')

        kyy = Cmy * (1 + min(0.8, (lambda_y - 0.2) * n_y))
        kzz = Cmz * (1 + min(0.8, (2 * lambda_z - 0.6) * n_z))
        kyz = 0.6 * kzz
        kzy = 0.6 * kyy

        # Eq 6.61
        eq_6_61 = (N_Ed_kN / N_b_Rd_y + kyy * My_Ed_kNm / My_b_Rd + kyz * Mz_Ed_kNm / Mz_Rd
                   if N_b_Rd_y > 0 and My_b_Rd > 0 and Mz_Rd > 0 else float('inf'))

        # Eq 6.62
        eq_6_62 = (N_Ed_kN / N_b_Rd_z + kzy * My_Ed_kNm / My_b_Rd + kzz * Mz_Ed_kNm / Mz_Rd
                   if N_b_Rd_z > 0 and My_b_Rd > 0 and Mz_Rd > 0 else float('inf'))

        # Cross-section check (cl 6.2.9)
        cs_check = N_Ed_kN / (N_Rk / gamma_M0) + My_Ed_kNm / (My_Rk / gamma_M0) + Mz_Ed_kNm / (Mz_Rk / gamma_M0)

        governing = max(eq_6_61, eq_6_62, cs_check)

        checks = [
            {"name": "Eq 6.61 (y-axis buckling)", "utilisation": round(eq_6_61 * 100, 1),
             "status": "PASS" if eq_6_61 <= 1.0 else "FAIL",
             "detail": f"N/(χ_y·N_Rk) + k_yy·M_y/M_b,Rd + k_yz·M_z/M_z,Rd = {eq_6_61:.3f}"},
            {"name": "Eq 6.62 (z-axis buckling)", "utilisation": round(eq_6_62 * 100, 1),
             "status": "PASS" if eq_6_62 <= 1.0 else "FAIL",
             "detail": f"N/(χ_z·N_Rk) + k_zy·M_y/M_b,Rd + k_zz·M_z/M_z,Rd = {eq_6_62:.3f}"},
            {"name": "Cross-section (cl 6.2.9)", "utilisation": round(cs_check * 100, 1),
             "status": "PASS" if cs_check <= 1.0 else "FAIL",
             "detail": f"N/N_Rd + M_y/M_y,Rd + M_z/M_z,Rd = {cs_check:.3f}"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "chi_y": round(chi_y, 3), "chi_z": round(chi_z, 3), "chi_LT": round(chi_LT, 3),
            "lambda_y": round(lambda_y, 3), "lambda_z": round(lambda_z, 3), "lambda_LT": round(lambda_LT, 3),
            "N_b_Rd_kN": round(N_b_Rd, 1),
            "My_b_Rd_kNm": round(My_b_Rd, 1),
            "Mz_Rd_kNm": round(Mz_Rd, 1),
            "eq_6_61": round(eq_6_61, 3), "eq_6_62": round(eq_6_62, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing * 100, 1),
        }


calculator = CombinedLoadingCalculator()
