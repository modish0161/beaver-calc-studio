"""
Lateral-torsional buckling (LTB) check for steel beams per EN 1993-1-1.
Calculates M_cr, chi_LT, and design moment resistance M_b,Rd.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class LtbCheckCalculator(CalculatorPlugin):
    key = "ltb_check_v1"
    name = "Lateral Torsional Buckling"
    version = "1.0.0"
    description = "LTB check for steel beams per EN 1993-1-1 cl 6.3.2"
    category = "steel"
    reference_text = "EN 1993-1-1:2005 cl 6.3.2 / SCI P362"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Section properties
        Iy_cm4 = inputs.get('Iy_cm4', 33320)       # major axis I
        Iz_cm4 = inputs.get('Iz_cm4', 1136)         # minor axis I
        It_cm4 = inputs.get('It_cm4', 76.2)         # torsion constant
        Iw_cm6 = inputs.get('Iw_cm6', 1560000)      # warping constant
        Wpl_y_cm3 = inputs.get('Wpl_y_cm3', 1501)   # plastic section modulus
        Wel_y_cm3 = inputs.get('Wel_y_cm3', 1307)   # elastic section modulus
        h_mm = inputs.get('h_mm', 533.1)
        tf_mm = inputs.get('tf_mm', 15.6)
        # Material
        fy_MPa = inputs.get('fy_MPa', 355)
        E_MPa = inputs.get('E_MPa', 210000)
        G_MPa = inputs.get('G_MPa', 81000)
        gamma_M1 = inputs.get('gamma_M1', 1.0)
        # Beam geometry
        L_cr_mm = inputs.get('L_cr_mm', 6000)       # effective length for LTB
        # Loading
        M_Ed_kNm = inputs.get('M_Ed_kNm', 400)
        # C1 factor (moment distribution)
        C1 = inputs.get('C1', 1.0)  # 1.0 uniform, 1.12 parabolic, etc.

        # Convert to mm units
        Iy = Iy_cm4 * 1e4      # mm4
        Iz = Iz_cm4 * 1e4      # mm4
        It = It_cm4 * 1e4      # mm4
        Iw = Iw_cm6 * 1e6      # mm6
        Wpl_y = Wpl_y_cm3 * 1e3  # mm3
        Wel_y = Wel_y_cm3 * 1e3  # mm3

        # Elastic critical moment M_cr (3-factor formula)
        # M_cr = C1 × (π²EI_z / L²) × √(I_w/I_z + L²GI_t/(π²EI_z))
        pi2EIz = math.pi ** 2 * E_MPa * Iz
        L2 = L_cr_mm ** 2
        ratio_w = Iw / Iz
        ratio_t = L2 * G_MPa * It / pi2EIz

        M_cr = C1 * (pi2EIz / L2) * math.sqrt(ratio_w + ratio_t)  # N⋅mm
        M_cr_kNm = M_cr / 1e6

        # Plastic moment
        M_pl_Rd = Wpl_y * fy_MPa / gamma_M1  # N⋅mm
        M_pl_Rd_kNm = M_pl_Rd / 1e6

        # Non-dimensional slenderness
        lambda_LT = math.sqrt(Wpl_y * fy_MPa / M_cr) if M_cr > 0 else 999

        # Buckling curve selection (EN 1993-1-1 Table 6.4)
        # For rolled I/H sections: h/b
        h_over_b = h_mm / (inputs.get('b_mm', 210))
        if h_over_b <= 2:
            alpha_LT = 0.34  # curve b
            curve = "b"
        else:
            alpha_LT = 0.49  # curve c
            curve = "c"

        # Reduction factor chi_LT (General case cl 6.3.2.2)
        lambda_LT_0 = 0.4  # UK NA
        beta = 0.75  # UK NA

        if lambda_LT <= lambda_LT_0:
            chi_LT = 1.0
        else:
            Phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - lambda_LT_0) + beta * lambda_LT ** 2)
            chi_LT = min(1.0, 1.0 / (Phi_LT + math.sqrt(max(Phi_LT ** 2 - beta * lambda_LT ** 2, 0))))

        # Modified chi (f factor, cl 6.3.2.3)
        # f = 1 - 0.5(1 - kc)[1 - 2(λ_LT - 0.8)²]
        kc = 1 / C1 if C1 > 0 else 1.0
        f_mod = 1 - 0.5 * (1 - kc) * max(0, 1 - 2 * (lambda_LT - 0.8) ** 2)
        f_mod = max(f_mod, 1.0)  # f ≥ 1/f factor applied to chi
        chi_LT_mod = min(chi_LT / f_mod, 1.0) if f_mod > 0 else chi_LT

        # Design buckling resistance moment
        M_b_Rd = chi_LT_mod * Wpl_y * fy_MPa / gamma_M1  # N⋅mm
        M_b_Rd_kNm = M_b_Rd / 1e6

        # Utilisation
        util = M_Ed_kNm / M_b_Rd_kNm if M_b_Rd_kNm > 0 else 999

        checks = [
            {"name": "LTB resistance (M_Ed / M_b,Rd)",
             "utilisation": round(util * 100, 1),
             "status": "PASS" if util <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed_kNm:.1f} / M_b,Rd={M_b_Rd_kNm:.1f} kNm (χ_LT={chi_LT_mod:.3f})"},
            {"name": "Slenderness λ_LT",
             "utilisation": round(lambda_LT / 2.0 * 100, 1),  # normalise to λ=2.0 
             "status": "PASS" if lambda_LT < 2.0 else "FAIL",
             "detail": f"λ_LT = {lambda_LT:.3f}, curve {curve} (α={alpha_LT})"},
            {"name": "Elastic critical moment M_cr",
             "utilisation": round(M_Ed_kNm / M_cr_kNm * 100, 1) if M_cr_kNm > 0 else 999,
             "status": "PASS" if M_Ed_kNm < M_cr_kNm else "FAIL",
             "detail": f"M_cr = {M_cr_kNm:.1f} kNm (C1={C1})"},
            {"name": "Cross-section capacity (M_Ed / M_pl,Rd)",
             "utilisation": round(M_Ed_kNm / M_pl_Rd_kNm * 100, 1),
             "status": "PASS" if M_Ed_kNm <= M_pl_Rd_kNm else "FAIL",
             "detail": f"M_pl,Rd = {M_pl_Rd_kNm:.1f} kNm"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "M_cr_kNm": round(M_cr_kNm, 1),
            "lambda_LT": round(lambda_LT, 3),
            "chi_LT": round(chi_LT_mod, 3),
            "M_b_Rd_kNm": round(M_b_Rd_kNm, 1),
            "M_pl_Rd_kNm": round(M_pl_Rd_kNm, 1),
            "buckling_curve": curve,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = LtbCheckCalculator()
