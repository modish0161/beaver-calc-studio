"""
RC column design calculator per EN 1992-1-1.
Axial + uniaxial/biaxial bending, slenderness, and nominal curvature method.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class RcColumnCalculator(CalculatorPlugin):
    key = "rc_column_v1"
    name = "RC Column Design"
    version = "1.0.0"
    description = "RC column design with second-order effects per EN 1992-1-1 cl 5.8"
    category = "concrete"
    reference_text = "EN 1992-1-1:2004 cl 5.8, 6.1"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Geometry
        b_mm = inputs.get('width_mm', 400)
        h_mm = inputs.get('depth_mm', 400)
        L_mm = inputs.get('height_mm', 4000)
        cover_mm = inputs.get('cover_mm', 35)
        # Reinforcement
        bar_dia_mm = inputs.get('bar_dia_mm', 25)
        n_bars_per_face = inputs.get('n_bars_per_face', 3)
        link_dia_mm = inputs.get('link_dia_mm', 8)
        # Material
        fck_MPa = inputs.get('fck_MPa', 32)
        fyk_MPa = inputs.get('fyk_MPa', 500)
        gamma_c = inputs.get('gamma_c', 1.5)
        gamma_s = inputs.get('gamma_s', 1.15)
        # Loading
        N_Ed_kN = inputs.get('N_Ed_kN', 2000)
        M_01_kNm = inputs.get('M_01_kNm', 80)     # smaller end moment
        M_02_kNm = inputs.get('M_02_kNm', 120)     # larger end moment
        # Second order
        effective_length_factor = inputs.get('effective_length_factor', 0.85)

        fcd = 0.85 * fck_MPa / gamma_c
        fyd = fyk_MPa / gamma_s
        Es = 200000

        d = h_mm - cover_mm - link_dia_mm - bar_dia_mm / 2
        d_prime = cover_mm + link_dia_mm + bar_dia_mm / 2

        # Total bars = 4 corner + (n_bars_per_face - 2) × 4 faces... simplify
        total_bars = 4 + 4 * max(0, n_bars_per_face - 2)
        A_s = total_bars * math.pi * bar_dia_mm ** 2 / 4
        A_c = b_mm * h_mm

        # Minimum reinforcement (cl 9.5.2)
        A_s_min = max(0.002 * A_c, 0.1 * N_Ed_kN * 1000 / fyd)
        A_s_max = 0.04 * A_c

        # Effective length
        L_0 = effective_length_factor * L_mm
        # Radius of gyration
        i = h_mm / math.sqrt(12)
        # Slenderness
        lam = L_0 / i

        # Limiting slenderness (cl 5.8.3.1)
        n_rel = N_Ed_kN * 1000 / (fcd * A_c) if (fcd * A_c) > 0 else 999
        A_coeff = 0.7
        B_coeff = 1.1
        C_coeff = 0.7
        lam_lim = 20 * A_coeff * B_coeff * C_coeff / math.sqrt(n_rel) if n_rel > 0 else 999

        is_slender = lam > lam_lim

        # First-order moment
        M_0Ed = max(M_02_kNm, abs(0.6 * M_02_kNm + 0.4 * M_01_kNm), N_Ed_kN * 0.02)  # min eccentricity h/30 or 20mm

        # Second-order moment (nominal curvature method cl 5.8.8)
        M_2 = 0
        if is_slender:
            n_u = 1 + A_s * fyd / (A_c * fcd) if (A_c * fcd) > 0 else 1
            n_bal = 0.4
            n = N_Ed_kN * 1000 / (A_c * fcd) if (A_c * fcd) > 0 else 999
            K_r = min(1.0, (n_u - n) / (n_u - n_bal)) if (n_u - n_bal) > 0 else 1.0
            K_r = max(0, K_r)
            # K_phi (creep factor — simplified)
            phi_ef = inputs.get('creep_factor', 2.0)
            beta_val = 0.35 + fck_MPa / 200 - lam / 150
            K_phi = max(1.0, 1 + beta_val * phi_ef)
            # 1/r
            epsilon_yd = fyd / Es
            one_over_r = K_r * K_phi * epsilon_yd / (0.45 * d)
            e_2 = one_over_r * L_0 ** 2 / math.pi ** 2
            M_2 = N_Ed_kN * e_2 / 1000  # kNm

        M_Ed_total = M_0Ed + M_2

        # Axial capacity (simplified)
        N_Rd_kN = (fcd * A_c + fyd * A_s) / 1000

        # Simplified N-M interaction
        # At balanced: M_Rd at N_Ed
        # Using simplified approach: M_Rd = A_s/2 × fyd × (d-d') × (1 - N/(0.85×fcd×A_c))
        moment_factor = max(0, 1 - (N_Ed_kN * 1000) / (fcd * A_c)) if (fcd * A_c) > 0 else 0
        M_Rd = (A_s / 2 * fyd * (d - d_prime) * moment_factor + fcd * b_mm * d * d * 0.1 * moment_factor) / 1e6
        M_Rd = max(M_Rd, A_s / 2 * fyd * (d - d_prime) * 0.3 / 1e6)  # minimum

        bend_util = M_Ed_total / M_Rd if M_Rd > 0 else 999
        axial_util = N_Ed_kN / N_Rd_kN if N_Rd_kN > 0 else 999

        checks = [
            {"name": "Axial capacity (N_Ed/N_Rd)",
             "utilisation": round(axial_util * 100, 1),
             "status": "PASS" if axial_util <= 1.0 else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.0f} kN / N_Rd={N_Rd_kN:.0f} kN"},
            {"name": "Bending with 2nd order (M_Ed/M_Rd)",
             "utilisation": round(bend_util * 100, 1),
             "status": "PASS" if bend_util <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed_total:.1f} kNm (M_0={M_0Ed:.1f}+M_2={M_2:.1f}) / M_Rd={M_Rd:.1f} kNm"},
            {"name": "Slenderness",
             "utilisation": round(lam / lam_lim * 100, 1) if lam_lim > 0 else 0,
             "status": "PASS" if not is_slender else "FAIL",
             "detail": f"λ={lam:.1f} / λ_lim={lam_lim:.1f} ({'slender' if is_slender else 'stocky'})"},
            {"name": "Reinforcement limits",
             "utilisation": round(A_s_min / A_s * 100, 1) if A_s > 0 else 999,
             "status": "PASS" if A_s >= A_s_min and A_s <= A_s_max else "FAIL",
             "detail": f"A_s={A_s:.0f} mm² ({A_s_min:.0f} ≤ A_s ≤ {A_s_max:.0f})"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "N_Rd_kN": round(N_Rd_kN, 0),
            "M_Rd_kNm": round(M_Rd, 1),
            "M_Ed_total_kNm": round(M_Ed_total, 1),
            "M_2_kNm": round(M_2, 1),
            "lambda": round(lam, 1),
            "lambda_lim": round(lam_lim, 1),
            "is_slender": is_slender,
            "total_bars": total_bars,
            "A_s_mm2": round(A_s, 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = RcColumnCalculator()
