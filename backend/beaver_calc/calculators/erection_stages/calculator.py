"""
Erection stage analysis — checks stability and capacity at each
construction stage (bare steel, wet concrete, composite).
"""
from typing import Dict, Any, List
import math
from ..base import CalculatorPlugin


class ErectionStagesCalculator(CalculatorPlugin):
    key = "erection_stages_v1"
    name = "Erection Stages"
    version = "1.0.0"
    description = "Multi-stage erection check for composite construction"
    category = "temporary_works"
    reference_text = "EN 1993-1-1 cl 6.3, BS 5975:2019"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Beam properties
        span_m = inputs.get('span_m', 10)
        Wpl_y_mm3 = inputs.get('Wpl_y_mm3', 1283e3)
        Iz_mm4 = inputs.get('Iz_mm4', 48.4e6)
        fy = inputs.get('fy_MPa', 355)
        beam_weight_kN_m = inputs.get('beam_weight_kNm', 0.73)
        # Slab
        slab_weight_kN_m2 = inputs.get('slab_weight_kNm2', 3.5)
        beam_spacing_m = inputs.get('beam_spacing_m', 3.0)
        # Construction loads
        constr_load_kN_m2 = inputs.get('construction_load_kNm2', 1.5)
        # Lateral restraint
        L_LTB_mm = inputs.get('ltb_length_mm', 3000)

        gamma_M0 = 1.0
        gamma_M1 = 1.0
        gamma_G = 1.35
        gamma_Q = 1.5
        E = 210000  # MPa
        span_mm = span_m * 1000

        M_pl_Rd = Wpl_y_mm3 * fy / 1e6  # kNm

        # LTB reduction
        M_cr = math.pi ** 2 * E * Iz_mm4 / L_LTB_mm ** 2 / 1e6 * 1.1 if L_LTB_mm > 0 else float('inf')
        lambda_LT = math.sqrt(M_pl_Rd / M_cr) if M_cr > 0 else 0
        alpha_LT = 0.34
        phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT ** 2) if lambda_LT > 0.2 else 0.5
        chi_LT = min(1.0, 1 / (phi_LT + math.sqrt(max(phi_LT ** 2 - lambda_LT ** 2, 0.001)))) if lambda_LT > 0.2 else 1.0
        M_b_Rd = chi_LT * M_pl_Rd / gamma_M1

        stages = []

        # Stage 1: Bare steel + self-weight
        w1 = beam_weight_kN_m
        M1 = gamma_G * w1 * span_m ** 2 / 8
        util1 = M1 / M_b_Rd if M_b_Rd > 0 else float('inf')
        stages.append({
            "name": "Stage 1: Bare steel erection",
            "loading_kNm": round(w1, 2),
            "M_Ed_kNm": round(M1, 1),
            "M_Rd_kNm": round(M_b_Rd, 1),
            "utilisation": round(util1 * 100, 1),
            "status": "PASS" if util1 <= 1.0 else "FAIL"
        })

        # Stage 2: Wet concrete pour
        w2 = beam_weight_kN_m + slab_weight_kN_m2 * beam_spacing_m + constr_load_kN_m2 * beam_spacing_m
        M2 = gamma_G * (beam_weight_kN_m + slab_weight_kN_m2 * beam_spacing_m) * span_m ** 2 / 8 + \
             gamma_Q * constr_load_kN_m2 * beam_spacing_m * span_m ** 2 / 8
        util2 = M2 / M_b_Rd if M_b_Rd > 0 else float('inf')
        stages.append({
            "name": "Stage 2: Wet concrete + construction loads",
            "loading_kNm": round(w2, 2),
            "M_Ed_kNm": round(M2, 1),
            "M_Rd_kNm": round(M_b_Rd, 1),
            "utilisation": round(util2 * 100, 1),
            "status": "PASS" if util2 <= 1.0 else "FAIL"
        })

        # Stage 3: Decking placement (partial restraint)
        w3 = beam_weight_kN_m + slab_weight_kN_m2 * beam_spacing_m * 0.5
        M3 = gamma_G * w3 * span_m ** 2 / 8
        util3 = M3 / M_b_Rd if M_b_Rd > 0 else float('inf')
        stages.append({
            "name": "Stage 3: Decking placed (partial slab load)",
            "loading_kNm": round(w3, 2),
            "M_Ed_kNm": round(M3, 1),
            "M_Rd_kNm": round(M_b_Rd, 1),
            "utilisation": round(util3 * 100, 1),
            "status": "PASS" if util3 <= 1.0 else "FAIL"
        })

        # Deflection check (Stage 2 — wet concrete, SLS)
        w_sls = (beam_weight_kN_m + slab_weight_kN_m2 * beam_spacing_m + constr_load_kN_m2 * beam_spacing_m)
        Iy_mm4 = inputs.get('Iy_mm4', 142e6)
        delta = 5 * w_sls * span_mm ** 4 / (384 * E * Iy_mm4) if Iy_mm4 > 0 else float('inf')
        delta_limit = span_mm / 200
        util_defl = delta / delta_limit if delta_limit > 0 else float('inf')

        checks = []
        for s in stages:
            checks.append({
                "name": s['name'], "utilisation": s['utilisation'],
                "status": s['status'],
                "detail": f"M_Ed={s['M_Ed_kNm']:.1f} / M_b,Rd={s['M_Rd_kNm']:.1f} kNm"
            })
        checks.append({
            "name": "Deflection (wet concrete)", "utilisation": round(util_defl * 100, 1),
            "status": "PASS" if util_defl <= 1.0 else "FAIL",
            "detail": f"δ={delta:.1f} mm / limit={delta_limit:.1f} mm (L/200)"
        })

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "stages": stages,
            "chi_LT": round(chi_LT, 3),
            "lambda_LT": round(lambda_LT, 3),
            "M_b_Rd_kNm": round(M_b_Rd, 1),
            "deflection_mm": round(delta, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = ErectionStagesCalculator()
