"""
Crack width calculation to EN 1992-1-1 cl 7.3.4.
Calculates w_k = s_r,max × (ε_sm - ε_cm).
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class CrackWidthCalculator(CalculatorPlugin):
    key = "crack_width_v1"
    name = "Crack Width Calculator"
    version = "1.0.0"
    description = "RC crack width check to EN 1992-1-1 cl 7.3.4"
    category = "concrete"
    reference_text = "EN 1992-1-1:2004 cl 7.3.4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Section
        b = inputs.get('section_width_mm', 1000)
        h = inputs.get('section_depth_mm', 400)
        d = inputs.get('effective_depth_mm', 350)
        cover = inputs.get('cover_mm', 40)
        bar_dia = inputs.get('bar_diameter_mm', 16)
        bar_spacing = inputs.get('bar_spacing_mm', 150)
        # Material
        fck = inputs.get('fck_MPa', 30)
        fct_eff = inputs.get('fct_eff_MPa', 2.9)  # effective tensile strength
        Es = inputs.get('Es_MPa', 200000)
        Ecm = inputs.get('Ecm_MPa', 33000)
        # Loading
        M_Ed_kNm = inputs.get('moment_kNm', 120)
        N_Ed_kN = inputs.get('axial_kN', 0)  # tension positive
        # Limit
        w_max = inputs.get('crack_width_limit_mm', 0.3)
        k_t = inputs.get('k_t', 0.4)  # 0.6 short-term, 0.4 long-term

        alpha_e = Es / Ecm  # modular ratio
        # Reinforcement area
        n_bars = max(1, int(b / bar_spacing))
        A_s = n_bars * math.pi * bar_dia ** 2 / 4
        rho = A_s / (b * d) if b * d > 0 else 0

        # Cracked section NA depth (x) via quadratic
        # b*x^2/2 = alpha_e * A_s * (d - x)
        a_coeff = b / 2
        b_coeff = alpha_e * A_s
        c_coeff = -alpha_e * A_s * d
        disc = b_coeff ** 2 - 4 * a_coeff * c_coeff
        x = (-b_coeff + math.sqrt(disc)) / (2 * a_coeff) if disc >= 0 else d * 0.45

        # Stress in steel
        I_cr = b * x ** 3 / 3 + alpha_e * A_s * (d - x) ** 2
        M_Ed = M_Ed_kNm * 1e6  # Nmm
        sigma_s = alpha_e * M_Ed * (d - x) / I_cr if I_cr > 0 else 0
        if N_Ed_kN != 0:
            sigma_s += N_Ed_kN * 1000 / A_s if A_s > 0 else 0

        # Effective tension area A_c,eff (cl 7.3.2)
        h_c_eff = min(2.5 * (h - d), (h - x) / 3, h / 2)
        A_c_eff = b * h_c_eff
        rho_p_eff = A_s / A_c_eff if A_c_eff > 0 else 0

        # Strain difference (cl 7.3.4 eq 7.9)
        eps_diff = (sigma_s - k_t * fct_eff / rho_p_eff * (1 + alpha_e * rho_p_eff)) / Es if rho_p_eff > 0 else 0
        eps_min = 0.6 * sigma_s / Es
        eps_sm_cm = max(eps_diff, eps_min)

        # Maximum crack spacing (eq 7.11)
        k1 = 0.8  # high bond
        k2 = 0.5  # bending
        k3 = 3.4
        k4 = 0.425
        c_nom = cover
        s_r_max = k3 * c_nom + k1 * k2 * k4 * bar_dia / rho_p_eff if rho_p_eff > 0 else 0

        # Crack width
        w_k = s_r_max * eps_sm_cm

        util = w_k / w_max if w_max > 0 else float('inf')

        checks = [
            {"name": "Crack width", "utilisation": round(util * 100, 1),
             "status": "PASS" if util <= 1.0 else "FAIL",
             "detail": f"w_k = {w_k:.3f} mm ≤ {w_max:.1f} mm"},
            {"name": "Steel stress", "utilisation": round(sigma_s / (0.8 * 500) * 100, 1),
             "status": "PASS" if sigma_s <= 0.8 * 500 else "FAIL",
             "detail": f"σ_s = {sigma_s:.1f} MPa"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "w_k_mm": round(w_k, 3),
            "s_r_max_mm": round(s_r_max, 1),
            "sigma_s_MPa": round(sigma_s, 1),
            "x_mm": round(x, 1),
            "A_s_mm2": round(A_s, 0),
            "rho_p_eff": round(rho_p_eff, 4),
            "eps_sm_cm": round(eps_sm_cm, 6),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(util * 100, 1),
        }


calculator = CrackWidthCalculator()
