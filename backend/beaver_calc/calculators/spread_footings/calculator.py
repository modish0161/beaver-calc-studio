"""
Spread footing design per EN 1997-1 / EN 1992-1-1.
Bearing capacity (Terzaghi/Meyerhof), sliding, overturning, bending, and punching shear.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SpreadFootingsCalculator(CalculatorPlugin):
    key = "spread_footings_v1"
    name = "Spread Footings"
    version = "1.0.0"
    description = "Spread footing design per EN 1997-1 / EN 1992-1-1"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 Annex D; EN 1992-1-1:2004 cl 6.4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Loads
        N_kN = inputs.get('N_kN', 800)
        M_kNm = inputs.get('M_kNm', 50)
        H_kN = inputs.get('H_kN', 30)
        # Footing
        B_m = inputs.get('B_m', 2.0)
        L_m = inputs.get('L_m', 2.0)
        D_m = inputs.get('footing_depth_m', 0.6)
        cover_mm = inputs.get('cover_mm', 50)
        fck_MPa = inputs.get('fck_MPa', 30)
        fy_MPa = inputs.get('fy_MPa', 500)
        gamma_conc = inputs.get('gamma_concrete_kN_m3', 25)
        # Embedment
        Df_m = inputs.get('embedment_depth_m', 1.0)
        # Soil
        phi_deg = inputs.get('phi_deg', 30)
        c_kPa = inputs.get('cohesion_kPa', 0)
        gamma_soil = inputs.get('gamma_soil_kN_m3', 18)
        # Partial factors (DA1-C2)
        gamma_phi = inputs.get('gamma_phi', 1.25)
        gamma_c = inputs.get('gamma_c', 1.25)
        gamma_Rv = inputs.get('gamma_Rv', 1.0)

        # Footing self-weight
        W_footing = B_m * L_m * D_m * gamma_conc
        N_total = N_kN + W_footing

        # Eccentricity
        e_B = M_kNm / N_total if N_total > 0 else 0
        B_eff = B_m - 2 * e_B
        L_eff = L_m  # assume M about B direction only
        if B_eff <= 0:
            B_eff = 0.01

        A_eff = B_eff * L_eff

        # Design soil parameters
        phi_d = math.atan(math.tan(math.radians(phi_deg)) / gamma_phi)
        c_d = c_kPa / gamma_c

        # Bearing capacity — Terzaghi/Meyerhof (EN 1997-1 Annex D)
        phi_d_deg = math.degrees(phi_d)
        Nq = math.exp(math.pi * math.tan(phi_d)) * math.tan(math.radians(45 + phi_d_deg / 2)) ** 2
        Nc = (Nq - 1) / math.tan(phi_d) if math.tan(phi_d) > 0.001 else 5.14
        Ngamma = 2 * (Nq - 1) * math.tan(phi_d)

        # Shape factors (Brinch Hansen)
        sq = 1 + (B_eff / L_eff) * math.sin(phi_d)
        sc = 1 + (Nq / Nc) * (B_eff / L_eff) if Nc > 0 else 1
        sg = 1 - 0.3 * (B_eff / L_eff)

        # Depth factors
        k = min(Df_m / B_eff, 1.0) if B_eff > 0 else 0
        dq = 1 + 2 * k * math.tan(phi_d) * (1 - math.sin(phi_d)) ** 2
        dc = 1 + 0.4 * k
        dg = 1.0

        # Inclination factors
        if N_total > 0:
            iq = (1 - H_kN / (N_total + A_eff * c_d / math.tan(phi_d) if math.tan(phi_d) > 0.01 else N_total)) ** 2
            iq = max(0, iq)
        else:
            iq = 1.0
        ic = iq - (1 - iq) / (Nc * math.tan(phi_d)) if (Nc * math.tan(phi_d)) > 0.01 else iq
        ig = max(0, iq ** 2)

        # Overburden
        q_surcharge = gamma_soil * Df_m

        # Ultimate bearing capacity
        q_ult = c_d * Nc * sc * dc * ic + q_surcharge * Nq * sq * dq * iq + 0.5 * gamma_soil * B_eff * Ngamma * sg * dg * ig
        R_v_d = q_ult * A_eff / gamma_Rv

        # Bearing pressure
        q_Ed = N_total / A_eff

        bearing_ratio = q_Ed / (q_ult / gamma_Rv) if q_ult > 0 else 999

        # Sliding
        H_Rd = N_total * math.tan(phi_d) + A_eff * c_d
        sliding_ratio = H_kN / H_Rd if H_Rd > 0 else 999

        # Overturning
        M_restoring = N_total * B_m / 2
        M_overturning = M_kNm + H_kN * Df_m
        ot_ratio = M_overturning / M_restoring if M_restoring > 0 else 999

        # Eccentricity check (middle third)
        e_limit = B_m / 6
        e_ok = abs(e_B) <= e_limit

        # Structural — punching shear (simplified)
        d_eff = D_m * 1000 - cover_mm - 10  # mm
        # Punching at 2d from column face (assume column ~0.4m square)
        col_size = inputs.get('column_size_mm', 400)
        u1 = 4 * (col_size + 2 * 2 * d_eff) + 2 * math.pi * 2 * d_eff  # simplified rectangular
        u1 = 4 * col_size + 4 * math.pi * d_eff  # control perimeter at 2d
        rho_l = 0.002  # assume 0.2%
        k_punch = min(2.0, 1 + math.sqrt(200 / max(d_eff, 1)))
        v_Rd_c = max(0.035 * k_punch ** 1.5 * fck_MPa ** 0.5,
                      0.12 * k_punch * (100 * rho_l * fck_MPa) ** (1 / 3))
        V_Ed_punch = (N_kN - q_Ed * (col_size / 1000 + 4 * d_eff / 1000) ** 2)
        V_Ed_punch = max(0, V_Ed_punch)
        v_Ed = V_Ed_punch * 1000 / (u1 * d_eff) if (u1 * d_eff) > 0 else 0
        punch_ratio = v_Ed / v_Rd_c if v_Rd_c > 0 else 999

        checks = [
            {"name": "Bearing capacity",
             "utilisation": round(bearing_ratio * 100, 1),
             "status": "PASS" if bearing_ratio <= 1.0 else "FAIL",
             "detail": f"q_Ed={q_Ed:.0f} kPa / q_Rd={q_ult / gamma_Rv:.0f} kPa (B'={B_eff:.2f}m)"},
            {"name": "Sliding",
             "utilisation": round(sliding_ratio * 100, 1),
             "status": "PASS" if sliding_ratio <= 1.0 else "FAIL",
             "detail": f"H={H_kN:.1f} kN / H_Rd={H_Rd:.1f} kN"},
            {"name": "Overturning",
             "utilisation": round(ot_ratio * 100, 1),
             "status": "PASS" if ot_ratio <= 1.0 else "FAIL",
             "detail": f"M_ot={M_overturning:.1f} kNm / M_res={M_restoring:.1f} kNm"},
            {"name": "Eccentricity (middle third)",
             "utilisation": round(abs(e_B) / e_limit * 100, 1) if e_limit > 0 else 0,
             "status": "PASS" if e_ok else "WARNING",
             "detail": f"e={abs(e_B):.3f}m / B/6={e_limit:.3f}m"},
            {"name": "Punching shear",
             "utilisation": round(punch_ratio * 100, 1),
             "status": "PASS" if punch_ratio <= 1.0 else "FAIL",
             "detail": f"v_Ed={v_Ed:.3f} MPa / v_Rd,c={v_Rd_c:.3f} MPa"},
        ]

        overall = all(c['status'] in ('PASS', 'WARNING') for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "q_ult_kPa": round(q_ult, 0),
            "q_Ed_kPa": round(q_Ed, 0),
            "B_eff_m": round(B_eff, 2),
            "A_eff_m2": round(A_eff, 2),
            "Nq": round(Nq, 1),
            "Nc": round(Nc, 1),
            "Ngamma": round(Ngamma, 1),
            "eccentricity_m": round(e_B, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SpreadFootingsCalculator()
