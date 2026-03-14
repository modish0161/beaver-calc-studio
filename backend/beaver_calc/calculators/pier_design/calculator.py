"""
Pier / column design calculator for RC piers per EN 1992-1-1.
Checks axial + biaxial bending interaction, slenderness, and shear.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class PierDesignCalculator(CalculatorPlugin):
    key = "pier_design_v1"
    name = "Pier Design"
    version = "1.0.0"
    description = "RC pier/column design with N-M interaction per EN 1992-1-1"
    category = "concrete"
    reference_text = "EN 1992-1-1:2004 cl 5.8, 6.1"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Geometry (rectangular)
        B_mm = inputs.get('width_mm', 600)
        H_mm = inputs.get('depth_mm', 900)
        L_mm = inputs.get('height_mm', 8000)
        cover_mm = inputs.get('cover_mm', 40)
        # Reinforcement
        n_bars_B = inputs.get('n_bars_width', 4)
        n_bars_H = inputs.get('n_bars_depth', 6)
        bar_dia_mm = inputs.get('bar_dia_mm', 25)
        link_dia_mm = inputs.get('link_dia_mm', 10)
        # Material
        fck_MPa = inputs.get('fck_MPa', 40)
        fyk_MPa = inputs.get('fyk_MPa', 500)
        gamma_c = inputs.get('gamma_c', 1.5)
        gamma_s = inputs.get('gamma_s', 1.15)
        # Loading (design values)
        N_Ed_kN = inputs.get('N_Ed_kN', 3000)
        M_Ed_y_kNm = inputs.get('M_Ed_y_kNm', 400)  # about y (bending about major)
        M_Ed_z_kNm = inputs.get('M_Ed_z_kNm', 100)   # about z (minor)
        V_Ed_kN = inputs.get('V_Ed_kN', 200)
        # Effective length factor
        k_eff = inputs.get('effective_length_factor', 0.85)

        fcd = 0.85 * fck_MPa / gamma_c
        fyd = fyk_MPa / gamma_s
        Es = 200000  # MPa

        A_c = B_mm * H_mm  # mm2
        A_bar = math.pi * bar_dia_mm ** 2 / 4
        total_bars = 2 * n_bars_B + 2 * max(0, n_bars_H - 2)
        A_s = total_bars * A_bar

        # Effective depths
        d_y = H_mm - cover_mm - link_dia_mm - bar_dia_mm / 2
        d_z = B_mm - cover_mm - link_dia_mm - bar_dia_mm / 2

        # Axial capacity (simplified)
        N_Rd_kN = (fcd * A_c + fyd * A_s) / 1000

        # Slenderness check (cl 5.8.3)
        i_y = H_mm / math.sqrt(12)  # radius of gyration
        i_z = B_mm / math.sqrt(12)
        L_0_y = k_eff * L_mm
        L_0_z = k_eff * L_mm
        lambda_y = L_0_y / i_y
        lambda_z = L_0_z / i_z

        # Limiting slenderness (simplified: cl 5.8.3.1)
        n_rel = N_Ed_kN * 1000 / (fcd * A_c) if (fcd * A_c) > 0 else 999
        A_val = 0.7  # default
        B_val = 1.1  # default
        C_val = 0.7  # default
        lambda_lim = 20 * A_val * B_val * C_val / math.sqrt(n_rel) if n_rel > 0 else 999

        slender_y = lambda_y > lambda_lim
        slender_z = lambda_z > lambda_lim

        # Simplified moment-axial interaction (EN 1992-1-1 cl 6.1)
        # Using simplified rectangular stress block
        # M_Rd ≈ A_s × fyd × (d - d') + 0.5 × N × (h - a)  (conservative approximation)
        d_prime = cover_mm + link_dia_mm + bar_dia_mm / 2

        # Balanced capacity about y axis
        x_bal_y = 0.6 * d_y  # balanced NA depth
        M_Rd_y = (A_s / 2 * fyd * (d_y - d_prime) + fcd * B_mm * 0.8 * x_bal_y * (d_y - 0.4 * x_bal_y)) / 1e6
        # Reduce for axial load effect
        M_Rd_y_reduced = M_Rd_y * (1 - (N_Ed_kN / N_Rd_kN) ** 2) if N_Rd_kN > 0 else 0

        # About z axis
        x_bal_z = 0.6 * d_z
        M_Rd_z = (A_s / 2 * fyd * (d_z - d_prime) + fcd * H_mm * 0.8 * x_bal_z * (d_z - 0.4 * x_bal_z)) / 1e6
        M_Rd_z_reduced = M_Rd_z * (1 - (N_Ed_kN / N_Rd_kN) ** 2) if N_Rd_kN > 0 else 0

        # Biaxial interaction (cl 5.8.9 Eq 5.39)
        a_exp = 1.0 if N_Ed_kN / N_Rd_kN <= 0.1 else min(2.0, 1.0 + N_Ed_kN / N_Rd_kN) if N_Rd_kN > 0 else 1.0
        biaxial_util = 0
        if M_Rd_y_reduced > 0 and M_Rd_z_reduced > 0:
            biaxial_util = (abs(M_Ed_y_kNm) / M_Rd_y_reduced) ** a_exp + (abs(M_Ed_z_kNm) / M_Rd_z_reduced) ** a_exp

        # Shear (cl 6.2.2 without shear reinforcement)
        rho_l = min(A_s / (B_mm * d_y), 0.02)
        k_shear = min(2.0, 1 + math.sqrt(200 / d_y))
        sigma_cp = min(N_Ed_kN * 1000 / A_c, 0.2 * fcd)
        v_Rd_c = max(
            (0.18 / gamma_c * k_shear * (100 * rho_l * fck_MPa) ** (1 / 3) + 0.15 * sigma_cp) * B_mm * d_y / 1000,
            (0.035 * k_shear ** 1.5 * fck_MPa ** 0.5 + 0.15 * sigma_cp) * B_mm * d_y / 1000,
        )
        shear_util = V_Ed_kN / v_Rd_c if v_Rd_c > 0 else 999

        checks = [
            {"name": "Axial capacity (N_Ed/N_Rd)",
             "utilisation": round(N_Ed_kN / N_Rd_kN * 100, 1) if N_Rd_kN > 0 else 999,
             "status": "PASS" if N_Ed_kN <= N_Rd_kN else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.0f} kN / N_Rd={N_Rd_kN:.0f} kN"},
            {"name": "Biaxial bending interaction",
             "utilisation": round(biaxial_util * 100, 1),
             "status": "PASS" if biaxial_util <= 1.0 else "FAIL",
             "detail": f"(M_y/M_Ry)^a + (M_z/M_Rz)^a = {biaxial_util:.3f} ≤ 1.0 (a={a_exp:.2f})"},
            {"name": "Slenderness (major axis)",
             "utilisation": round(lambda_y / lambda_lim * 100, 1) if lambda_lim > 0 else 0,
             "status": "PASS" if not slender_y else "FAIL",
             "detail": f"λ_y={lambda_y:.1f} vs λ_lim={lambda_lim:.1f} ({'slender' if slender_y else 'stocky'})"},
            {"name": "Shear capacity (V_Ed/V_Rd,c)",
             "utilisation": round(shear_util * 100, 1),
             "status": "PASS" if shear_util <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.0f} kN / V_Rd,c={v_Rd_c:.0f} kN (no links)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "N_Rd_kN": round(N_Rd_kN, 0),
            "M_Rd_y_kNm": round(M_Rd_y_reduced, 1),
            "M_Rd_z_kNm": round(M_Rd_z_reduced, 1),
            "lambda_y": round(lambda_y, 1),
            "lambda_z": round(lambda_z, 1),
            "lambda_lim": round(lambda_lim, 1),
            "biaxial_interaction": round(biaxial_util, 3),
            "total_bars": total_bars,
            "A_s_mm2": round(A_s, 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = PierDesignCalculator()
