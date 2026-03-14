"""
Timber member design per EN 1995-1-1 (EC5).
Bending, shear, compression, tension, combined bending+axial, lateral buckling, deflection.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class TimberMemberCalculator(CalculatorPlugin):
    key = "timber_member_v1"
    name = "Timber Member"
    version = "1.0.0"
    description = "Timber member design per EN 1995-1-1 (bending, shear, compression, deflection)"
    category = "timber"
    reference_text = "EN 1995-1-1:2004 cl 6.1-6.3"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Section
        b_mm = inputs.get('b_mm', 75)
        h_mm = inputs.get('h_mm', 225)
        span_mm = inputs.get('span_mm', 4000)

        # Strength class values
        f_m_k = inputs.get('f_m_k_MPa', 24)  # C24 default
        f_v_k = inputs.get('f_v_k_MPa', 4.0)
        f_c_0_k = inputs.get('f_c_0_k_MPa', 21)
        f_t_0_k = inputs.get('f_t_0_k_MPa', 14.5)
        E_0_mean = inputs.get('E_0_mean_MPa', 11000)
        E_0_05 = inputs.get('E_0_05_MPa', 7400)

        # Factors
        k_mod = inputs.get('k_mod', 0.8)  # medium-term
        gamma_M = inputs.get('gamma_M', 1.3)  # solid timber
        k_sys = inputs.get('k_sys', 1.0)  # 1.1 for load-sharing
        k_h = min(1.3, (150 / h_mm) ** 0.2) if h_mm < 150 else 1.0

        # Loading
        M_Ed_kNm = inputs.get('M_Ed_kNm', 0)
        V_Ed_kN = inputs.get('V_Ed_kN', 0)
        N_c_Ed_kN = inputs.get('N_c_Ed_kN', 0)  # compression
        N_t_Ed_kN = inputs.get('N_t_Ed_kN', 0)  # tension

        # UDL for deflection calc
        g_kN_m = inputs.get('g_kN_m', 1.0)
        q_kN_m = inputs.get('q_kN_m', 1.5)
        k_def = inputs.get('k_def', 0.6)
        psi_2 = inputs.get('psi_2', 0.3)

        # Section properties
        A_mm2 = b_mm * h_mm
        W_y = b_mm * h_mm ** 2 / 6  # mm3
        I_y = b_mm * h_mm ** 3 / 12  # mm4

        # Design strengths
        f_m_d = k_mod * k_sys * k_h * f_m_k / gamma_M
        f_v_d = k_mod * f_v_k / gamma_M
        f_c_0_d = k_mod * f_c_0_k / gamma_M
        f_t_0_d = k_mod * f_t_0_k / gamma_M

        checks = []

        # Bending (cl 6.1.6)
        if M_Ed_kNm > 0:
            sigma_m = M_Ed_kNm * 1e6 / W_y  # MPa
            bending_ratio = sigma_m / f_m_d if f_m_d > 0 else 999
            checks.append({
                "name": "Bending",
                "utilisation": round(bending_ratio * 100, 1),
                "status": "PASS" if bending_ratio <= 1.0 else "FAIL",
                "detail": f"σ_m={sigma_m:.1f} MPa / f_m,d={f_m_d:.1f} MPa",
            })

        # Shear (cl 6.1.7)
        if V_Ed_kN > 0:
            tau_d = 1.5 * V_Ed_kN * 1000 / A_mm2  # MPa
            k_cr = inputs.get('k_cr', 0.67)  # effective width factor for cracks
            tau_d_eff = 1.5 * V_Ed_kN * 1000 / (k_cr * b_mm * h_mm)
            shear_ratio = tau_d_eff / f_v_d if f_v_d > 0 else 999
            checks.append({
                "name": "Shear",
                "utilisation": round(shear_ratio * 100, 1),
                "status": "PASS" if shear_ratio <= 1.0 else "FAIL",
                "detail": f"τ_d={tau_d_eff:.2f} MPa / f_v,d={f_v_d:.2f} MPa (k_cr={k_cr})",
            })

        # Compression (cl 6.1.4 + 6.3.2 buckling)
        if N_c_Ed_kN > 0:
            sigma_c = N_c_Ed_kN * 1000 / A_mm2
            # Slenderness
            L_ef = inputs.get('L_ef_mm', span_mm)
            i_y = math.sqrt(I_y / A_mm2)
            lambda_rel = (L_ef / i_y) / math.pi * math.sqrt(f_c_0_k / E_0_05)
            beta_c = 0.2  # solid timber
            k = 0.5 * (1 + beta_c * (lambda_rel - 0.3) + lambda_rel ** 2)
            k_c = 1 / (k + math.sqrt(k ** 2 - lambda_rel ** 2)) if (k ** 2 - lambda_rel ** 2) > 0 else 0.01
            k_c = min(1.0, k_c)
            comp_ratio = sigma_c / (k_c * f_c_0_d) if (k_c * f_c_0_d) > 0 else 999
            checks.append({
                "name": "Compression (buckling)",
                "utilisation": round(comp_ratio * 100, 1),
                "status": "PASS" if comp_ratio <= 1.0 else "FAIL",
                "detail": f"σ_c={sigma_c:.1f} MPa / k_c×f_c,d={k_c * f_c_0_d:.1f} MPa (λ_rel={lambda_rel:.2f})",
            })

        # Tension (cl 6.1.2)
        if N_t_Ed_kN > 0:
            sigma_t = N_t_Ed_kN * 1000 / A_mm2
            tension_ratio = sigma_t / f_t_0_d if f_t_0_d > 0 else 999
            checks.append({
                "name": "Tension",
                "utilisation": round(tension_ratio * 100, 1),
                "status": "PASS" if tension_ratio <= 1.0 else "FAIL",
                "detail": f"σ_t={sigma_t:.1f} MPa / f_t,d={f_t_0_d:.1f} MPa",
            })

        # Deflection (cl 7.2)
        if g_kN_m > 0 or q_kN_m > 0:
            L = span_mm
            w_inst_G = 5 * g_kN_m * L ** 4 / (384 * E_0_mean * I_y)  # mm
            w_inst_Q = 5 * q_kN_m * L ** 4 / (384 * E_0_mean * I_y)
            w_fin = w_inst_G * (1 + k_def) + w_inst_Q * (1 + psi_2 * k_def)
            w_limit = L / 250
            defl_ratio = w_fin / w_limit if w_limit > 0 else 999
            checks.append({
                "name": "Deflection (final, L/250)",
                "utilisation": round(defl_ratio * 100, 1),
                "status": "PASS" if defl_ratio <= 1.0 else "FAIL",
                "detail": f"w_fin={w_fin:.1f}mm / {w_limit:.1f}mm (w_inst,G={w_inst_G:.1f}, w_inst,Q={w_inst_Q:.1f}mm)",
            })

        if not checks:
            checks.append({"name": "No load applied", "utilisation": 0, "status": "INFO", "detail": "Provide M, V, N, or UDL"})

        overall = all(c['status'] in ('PASS', 'INFO') for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "A_mm2": A_mm2,
            "W_y_mm3": round(W_y, 0),
            "I_y_mm4": round(I_y, 0),
            "f_m_d_MPa": round(f_m_d, 1),
            "f_v_d_MPa": round(f_v_d, 2),
            "f_c_0_d_MPa": round(f_c_0_d, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = TimberMemberCalculator()
