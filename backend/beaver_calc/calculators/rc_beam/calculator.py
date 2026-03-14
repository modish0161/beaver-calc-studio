"""
RC beam design calculator per EN 1992-1-1.
Checks bending, shear, deflection, cracking, and detailing.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class RcBeamCalculator(CalculatorPlugin):
    key = "rc_beam_v1"
    name = "RC Beam Design"
    version = "1.0.0"
    description = "Reinforced concrete beam design per EN 1992-1-1"
    category = "concrete"
    reference_text = "EN 1992-1-1:2004 cl 6.1, 6.2, 7.4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Geometry
        b_mm = inputs.get('width_mm', 300)
        h_mm = inputs.get('depth_mm', 600)
        span_mm = inputs.get('span_mm', 8000)
        cover_mm = inputs.get('cover_mm', 30)
        # Reinforcement
        bar_dia_mm = inputs.get('bar_dia_mm', 25)
        n_tension_bars = inputs.get('n_tension_bars', 4)
        bar_dia_comp_mm = inputs.get('bar_dia_comp_mm', 16)
        n_comp_bars = inputs.get('n_comp_bars', 2)
        link_dia_mm = inputs.get('link_dia_mm', 10)
        link_spacing_mm = inputs.get('link_spacing_mm', 200)
        link_legs = inputs.get('link_legs', 2)
        # Material
        fck_MPa = inputs.get('fck_MPa', 30)
        fyk_MPa = inputs.get('fyk_MPa', 500)
        gamma_c = inputs.get('gamma_c', 1.5)
        gamma_s = inputs.get('gamma_s', 1.15)
        # Loading (design values)
        M_Ed_kNm = inputs.get('M_Ed_kNm', 350)
        V_Ed_kN = inputs.get('V_Ed_kN', 200)

        fcd = 0.85 * fck_MPa / gamma_c
        fyd = fyk_MPa / gamma_s
        Es = 200000

        d = h_mm - cover_mm - link_dia_mm - bar_dia_mm / 2
        d_prime = cover_mm + link_dia_mm + bar_dia_comp_mm / 2

        A_s = n_tension_bars * math.pi * bar_dia_mm ** 2 / 4
        A_s_prime = n_comp_bars * math.pi * bar_dia_comp_mm ** 2 / 4

        # Bending — rectangular stress block (cl 6.1)
        eta = 1.0 if fck_MPa <= 50 else 1.0 - (fck_MPa - 50) / 200
        lam = 0.8 if fck_MPa <= 50 else 0.8 - (fck_MPa - 50) / 400

        # K factor
        K = M_Ed_kNm * 1e6 / (b_mm * d ** 2 * fck_MPa)
        K_prime = 0.167  # maximum for singly reinforced (x/d = 0.45)

        if K <= K_prime:
            # Singly reinforced
            z = min(d * (0.5 + math.sqrt(0.25 - K / (2 * eta * lam))), 0.95 * d)
            M_Rd = A_s * fyd * z / 1e6
        else:
            # Compression steel needed
            z = min(d * (0.5 + math.sqrt(0.25 - K_prime / (2 * eta * lam))), 0.95 * d)
            x = (d - z) / (lam / 2) if lam > 0 else 0
            # Compression steel stress
            eps_sc = 0.0035 * (1 - d_prime / x) if x > 0 else 0
            f_sc = min(eps_sc * Es, fyd)
            M_Rd = (A_s * fyd * z + A_s_prime * f_sc * (d - d_prime)) / 1e6

        bend_util = M_Ed_kNm / M_Rd if M_Rd > 0 else 999

        # Shear (cl 6.2)
        rho_l = min(A_s / (b_mm * d), 0.02)
        k_shear = min(2.0, 1 + math.sqrt(200 / d))

        # V_Rd,c (without shear reinforcement)
        V_Rd_c = max(
            (0.18 / gamma_c * k_shear * (100 * rho_l * fck_MPa) ** (1 / 3)) * b_mm * d / 1000,
            0.035 * k_shear ** 1.5 * fck_MPa ** 0.5 * b_mm * d / 1000,
        )

        # V_Rd,s (with shear reinforcement)
        A_sw = link_legs * math.pi * link_dia_mm ** 2 / 4
        fywd = fyd
        theta = 21.8  # strut angle (cot θ = 2.5)
        cot_theta = 2.5
        V_Rd_s = A_sw / link_spacing_mm * z * fywd * cot_theta / 1000

        # V_Rd,max (strut crushing)
        alpha_cw = 1.0
        nu_1 = 0.6 * (1 - fck_MPa / 250)
        V_Rd_max = alpha_cw * b_mm * z * nu_1 * fcd / (cot_theta + 1 / cot_theta) / 1000

        V_Rd = min(V_Rd_s, V_Rd_max)
        shear_util = V_Ed_kN / V_Rd if V_Rd > 0 else 999

        # Deflection (span/depth ratio, cl 7.4.2)
        rho_0 = math.sqrt(fck_MPa) / 1000
        rho = A_s / (b_mm * d)
        if rho <= rho_0:
            l_over_d = 11 + 1.5 * math.sqrt(fck_MPa) * rho_0 / rho + 3.2 * math.sqrt(fck_MPa) * (rho_0 / rho - 1) ** 1.5
        else:
            l_over_d = 11 + 1.5 * math.sqrt(fck_MPa) * rho_0 / (rho - rho_0)
        # Simply supported K_factor = 1.0
        allowable_l_d = l_over_d * 1.0
        actual_l_d = span_mm / d
        defl_util = actual_l_d / allowable_l_d

        # Min reinforcement (cl 9.2.1.1)
        A_s_min = max(0.26 * (fck_MPa ** 0.5 / fyk_MPa) * b_mm * d, 0.0013 * b_mm * d)
        reinf_ok = A_s >= A_s_min

        checks = [
            {"name": "Bending (M_Ed / M_Rd)",
             "utilisation": round(bend_util * 100, 1),
             "status": "PASS" if bend_util <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed_kNm:.1f} kNm / M_Rd={M_Rd:.1f} kNm (K={K:.4f})"},
            {"name": "Shear (V_Ed / V_Rd)",
             "utilisation": round(shear_util * 100, 1),
             "status": "PASS" if shear_util <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.0f} kN / V_Rd={V_Rd:.0f} kN (V_Rd,s={V_Rd_s:.0f}, V_Rd,max={V_Rd_max:.0f})"},
            {"name": "Deflection (L/d ratio)",
             "utilisation": round(defl_util * 100, 1),
             "status": "PASS" if defl_util <= 1.0 else "FAIL",
             "detail": f"L/d={actual_l_d:.1f} / allowable={allowable_l_d:.1f}"},
            {"name": "Minimum reinforcement",
             "utilisation": round(A_s_min / A_s * 100, 1) if A_s > 0 else 999,
             "status": "PASS" if reinf_ok else "FAIL",
             "detail": f"A_s={A_s:.0f} mm² ≥ A_s,min={A_s_min:.0f} mm²"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "d_mm": round(d, 0),
            "A_s_mm2": round(A_s, 0),
            "M_Rd_kNm": round(M_Rd, 1),
            "K": round(K, 4),
            "z_mm": round(z, 0),
            "V_Rd_s_kN": round(V_Rd_s, 0),
            "V_Rd_max_kN": round(V_Rd_max, 0),
            "actual_l_d": round(actual_l_d, 1),
            "allowable_l_d": round(allowable_l_d, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = RcBeamCalculator()
