"""
Strip footing (continuous footing) design per EN 1997-1 / EN 1992-1-1.
Bearing capacity, transverse bending, and shear for strip foundations.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class StripFootingCalculator(CalculatorPlugin):
    key = "strip_footing_v1"
    name = "Strip Footing"
    version = "1.0.0"
    description = "Strip footing design per EN 1997-1 / EN 1992-1-1"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 Annex D; EN 1992-1-1:2004 cl 6.1"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Loads per metre run
        N_kN_m = inputs.get('N_kN_per_m', 200)
        M_kNm_m = inputs.get('M_kNm_per_m', 10)
        H_kN_m = inputs.get('H_kN_per_m', 5)

        # Footing dimensions
        B_m = inputs.get('B_m', 1.0)
        D_m = inputs.get('footing_depth_m', 0.4)
        cover_mm = inputs.get('cover_mm', 50)
        fck_MPa = inputs.get('fck_MPa', 30)
        fy_MPa = inputs.get('fy_MPa', 500)
        gamma_conc = 25

        # Embedment
        Df_m = inputs.get('embedment_depth_m', 0.8)

        # Soil
        phi_deg = inputs.get('phi_deg', 28)
        c_kPa = inputs.get('cohesion_kPa', 0)
        gamma_soil = inputs.get('gamma_soil_kN_m3', 18)

        # Partial factors (DA1-C2)
        gamma_phi = inputs.get('gamma_phi', 1.25)
        gamma_c_pf = inputs.get('gamma_c', 1.25)

        # Footing self-weight per m run
        W_footing = B_m * D_m * gamma_conc  # kN/m
        N_total = N_kN_m + W_footing

        # Eccentricity
        e = M_kNm_m / N_total if N_total > 0 else 0
        B_eff = B_m - 2 * abs(e)
        B_eff = max(B_eff, 0.01)

        # Design soil parameters
        phi_d = math.atan(math.tan(math.radians(phi_deg)) / gamma_phi)
        c_d = c_kPa / gamma_c_pf
        phi_d_deg = math.degrees(phi_d)

        # Bearing capacity factors (strip footing — plane strain)
        Nq = math.exp(math.pi * math.tan(phi_d)) * math.tan(math.radians(45 + phi_d_deg / 2)) ** 2
        Nc = (Nq - 1) / math.tan(phi_d) if math.tan(phi_d) > 0.001 else 5.14
        Ngamma = 2 * (Nq - 1) * math.tan(phi_d)

        # For strip footing: shape factors = 1.0
        # Depth factors
        k = min(Df_m / B_eff, 1.0) if B_eff > 0 else 0
        dq = 1 + 2 * k * math.tan(phi_d) * (1 - math.sin(phi_d)) ** 2
        dc = 1 + 0.4 * k

        q_surcharge = gamma_soil * Df_m
        q_ult = c_d * Nc * dc + q_surcharge * Nq * dq + 0.5 * gamma_soil * B_eff * Ngamma

        # Bearing pressure
        q_Ed = N_total / B_eff
        bearing_ratio = q_Ed / q_ult if q_ult > 0 else 999

        # Sliding
        H_Rd = N_total * math.tan(phi_d) + B_eff * c_d
        sliding_ratio = H_kN_m / H_Rd if H_Rd > 0 else 999

        # Eccentricity (middle third)
        e_limit = B_m / 6
        e_ok = abs(e) <= e_limit

        # Structural — transverse bending
        # Wall/column width assumed
        wall_width_m = inputs.get('wall_width_m', 0.3)
        cantilever = (B_m - wall_width_m) / 2
        # ULS bearing pressure for structural design
        gamma_G_str = 1.35
        gamma_Q_str = 1.5
        q_uls = N_total * gamma_G_str / B_eff  # simplified
        M_Ed_trans = q_uls * cantilever ** 2 / 2  # kNm/m
        d_eff = D_m * 1000 - cover_mm - 8  # mm
        K = M_Ed_trans * 1e6 / (1000 * d_eff ** 2 * fck_MPa) if d_eff > 0 else 999
        K_bal = 0.167
        if K <= K_bal and K > 0:
            z = d_eff * (0.5 + math.sqrt(0.25 - K / 1.134))
            z = min(z, 0.95 * d_eff)
            As_req = M_Ed_trans * 1e6 / (0.87 * fy_MPa * z)  # mm²/m
        else:
            As_req = 999
            z = 0

        As_min = max(0.26 * (fck_MPa ** 0.5 / fy_MPa) * 1000 * d_eff, 0.0013 * 1000 * d_eff)

        # Shear at d from face of wall
        V_Ed = q_uls * (cantilever - d_eff / 1000)
        V_Ed = max(0, V_Ed)
        rho_l = max(As_req, As_min) / (1000 * d_eff) if d_eff > 0 else 0
        k_shear = min(2.0, 1 + math.sqrt(200 / max(d_eff, 1)))
        v_Rd_c = max(0.035 * k_shear ** 1.5 * fck_MPa ** 0.5,
                      0.12 * k_shear * (100 * rho_l * fck_MPa) ** (1 / 3))  # MPa
        V_Rd_c = v_Rd_c * 1000 * d_eff / 1000  # kN/m
        shear_ratio = V_Ed / V_Rd_c if V_Rd_c > 0 else 999

        checks = [
            {"name": "Bearing capacity",
             "utilisation": round(bearing_ratio * 100, 1),
             "status": "PASS" if bearing_ratio <= 1.0 else "FAIL",
             "detail": f"q_Ed={q_Ed:.0f} kPa / q_ult={q_ult:.0f} kPa (B'={B_eff:.2f}m)"},
            {"name": "Sliding",
             "utilisation": round(sliding_ratio * 100, 1),
             "status": "PASS" if sliding_ratio <= 1.0 else "FAIL",
             "detail": f"H={H_kN_m:.1f} kN/m / H_Rd={H_Rd:.1f} kN/m"},
            {"name": "Eccentricity (middle third)",
             "utilisation": round(abs(e) / e_limit * 100, 1) if e_limit > 0 else 0,
             "status": "PASS" if e_ok else "WARNING",
             "detail": f"e={abs(e):.3f}m / B/6={e_limit:.3f}m"},
            {"name": "Transverse bending",
             "utilisation": round(K / K_bal * 100, 1) if K_bal > 0 else 0,
             "status": "PASS" if K <= K_bal else "FAIL",
             "detail": f"K={K:.4f} / K_bal={K_bal} → As={As_req:.0f} mm²/m (min {As_min:.0f})"},
            {"name": "Shear (at d from face)",
             "utilisation": round(shear_ratio * 100, 1),
             "status": "PASS" if shear_ratio <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed:.1f} kN/m / V_Rd,c={V_Rd_c:.1f} kN/m"},
        ]

        overall = all(c['status'] in ('PASS', 'WARNING') for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "q_ult_kPa": round(q_ult, 0),
            "q_Ed_kPa": round(q_Ed, 0),
            "B_eff_m": round(B_eff, 2),
            "eccentricity_m": round(e, 3),
            "As_required_mm2_m": round(max(As_req, As_min), 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = StripFootingCalculator()
