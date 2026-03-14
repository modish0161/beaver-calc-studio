"""
RC slab design calculator per EN 1992-1-1.
One-way and two-way spanning slabs: bending, shear, deflection, detailing.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class RcSlabCalculator(CalculatorPlugin):
    key = "rc_slab_v1"
    name = "RC Slab Design"
    version = "1.0.0"
    description = "RC slab design (one-way/two-way) per EN 1992-1-1"
    category = "concrete"
    reference_text = "EN 1992-1-1:2004 cl 6.1, 7.4, 9.3"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Geometry
        h_mm = inputs.get('slab_depth_mm', 200)
        Lx_mm = inputs.get('short_span_mm', 5000)
        Ly_mm = inputs.get('long_span_mm', 7000)
        cover_mm = inputs.get('cover_mm', 25)
        # Reinforcement (per m width)
        bar_dia_mm = inputs.get('bar_dia_mm', 12)
        bar_spacing_mm = inputs.get('bar_spacing_mm', 150)
        # Material
        fck_MPa = inputs.get('fck_MPa', 30)
        fyk_MPa = inputs.get('fyk_MPa', 500)
        gamma_c = inputs.get('gamma_c', 1.5)
        gamma_s = inputs.get('gamma_s', 1.15)
        # Loading (ULS design per m²)
        n_Ed_kPa = inputs.get('design_load_kPa', 15.0)  # total ULS UDL
        # Support conditions
        support = inputs.get('support', 'simply_supported')  # simply_supported, continuous, cantilever

        fcd = 0.85 * fck_MPa / gamma_c
        fyd = fyk_MPa / gamma_s

        d = h_mm - cover_mm - bar_dia_mm / 2

        # Span ratio
        ratio = Ly_mm / Lx_mm if Lx_mm > 0 else 1
        is_two_way = ratio <= 2.0

        # Bending moments (per m width)
        if is_two_way:
            # Yield-line or coefficient method (BS 8110 Table 3.14 / simply supported)
            # α_sx, α_sy coefficients for simply supported:
            if ratio <= 1.0:
                alpha_sx = 0.062
                alpha_sy = 0.062
            elif ratio <= 1.5:
                alpha_sx = 0.084
                alpha_sy = 0.059
            else:
                alpha_sx = 0.100
                alpha_sy = 0.056
            M_x = alpha_sx * n_Ed_kPa * Lx_mm ** 2 / 1e6  # kNm/m
            M_y = alpha_sy * n_Ed_kPa * Lx_mm ** 2 / 1e6
        else:
            # One-way spanning
            if support == 'simply_supported':
                M_x = n_Ed_kPa * Lx_mm ** 2 / (8 * 1e6)
            elif support == 'continuous':
                M_x = n_Ed_kPa * Lx_mm ** 2 / (10 * 1e6)  # approximate
            else:
                M_x = n_Ed_kPa * Lx_mm ** 2 / (2 * 1e6)  # cantilever
            M_y = 0

        # Resistance (per m width, b = 1000mm)
        b = 1000  # mm per m width
        A_s = math.pi * bar_dia_mm ** 2 / 4 * (b / bar_spacing_mm)  # mm²/m

        K = M_x * 1e6 / (b * d ** 2 * fck_MPa) if (b * d ** 2 * fck_MPa) > 0 else 0
        K_prime = 0.167
        z = min(d * (0.5 + math.sqrt(max(0, 0.25 - K / 1.134))), 0.95 * d) if K <= K_prime else 0.95 * d
        M_Rd = A_s * fyd * z / 1e6  # kNm/m

        bend_util = M_x / M_Rd if M_Rd > 0 else 999

        # Shear (per m width)
        if support == 'cantilever':
            V_Ed = n_Ed_kPa * Lx_mm / 1000  # kN/m
        else:
            V_Ed = n_Ed_kPa * Lx_mm / (2 * 1000)

        rho_l = min(A_s / (b * d), 0.02)
        k_shear = min(2.0, 1 + math.sqrt(200 / d))
        V_Rd_c = max(
            0.18 / gamma_c * k_shear * (100 * rho_l * fck_MPa) ** (1 / 3) * b * d / 1000,
            0.035 * k_shear ** 1.5 * fck_MPa ** 0.5 * b * d / 1000,
        )
        shear_util = V_Ed / V_Rd_c if V_Rd_c > 0 else 999

        # Deflection (span/depth ratio cl 7.4.2)
        rho_0 = math.sqrt(fck_MPa) / 1000
        rho = A_s / (b * d)
        if rho <= rho_0:
            l_d_basic = 11 + 1.5 * math.sqrt(fck_MPa) * rho_0 / rho + 3.2 * math.sqrt(fck_MPa) * max(0, rho_0 / rho - 1) ** 1.5
        else:
            l_d_basic = 11 + 1.5 * math.sqrt(fck_MPa) * rho_0 / (rho - rho_0) if rho > rho_0 else 999

        # K factor for support type
        K_defl = {"simply_supported": 1.0, "continuous": 1.3, "cantilever": 0.4}.get(support, 1.0)
        allowable_l_d = l_d_basic * K_defl
        actual_l_d = Lx_mm / d
        defl_util = actual_l_d / allowable_l_d if allowable_l_d > 0 else 999

        # Minimum reinforcement
        A_s_min = max(0.26 * (fck_MPa ** 0.5 / fyk_MPa) * b * d, 0.0013 * b * d)
        reinf_ok = A_s >= A_s_min
        # Maximum spacing
        max_spacing = min(2 * h_mm, 250)
        spacing_ok = bar_spacing_mm <= max_spacing

        checks = [
            {"name": "Bending short span (M_Ed/M_Rd)",
             "utilisation": round(bend_util * 100, 1),
             "status": "PASS" if bend_util <= 1.0 else "FAIL",
             "detail": f"M_x={M_x:.1f} kNm/m / M_Rd={M_Rd:.1f} kNm/m (K={K:.4f})"},
            {"name": "Shear (V_Ed / V_Rd,c)",
             "utilisation": round(shear_util * 100, 1),
             "status": "PASS" if shear_util <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed:.1f} kN/m / V_Rd,c={V_Rd_c:.1f} kN/m"},
            {"name": "Deflection (L/d ratio)",
             "utilisation": round(defl_util * 100, 1),
             "status": "PASS" if defl_util <= 1.0 else "FAIL",
             "detail": f"L/d={actual_l_d:.1f} / allowable={allowable_l_d:.1f} (K={K_defl})"},
            {"name": "Min reinforcement & spacing",
             "utilisation": round(A_s_min / A_s * 100, 1) if A_s > 0 else 999,
             "status": "PASS" if reinf_ok and spacing_ok else "FAIL",
             "detail": f"A_s={A_s:.0f} mm²/m (min={A_s_min:.0f}), spacing={bar_spacing_mm}mm (max={max_spacing}mm)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "spanning": "two-way" if is_two_way else "one-way",
            "d_mm": round(d, 0),
            "M_x_kNm_m": round(M_x, 1),
            "M_Rd_kNm_m": round(M_Rd, 1),
            "V_Ed_kN_m": round(V_Ed, 1),
            "V_Rd_c_kN_m": round(V_Rd_c, 1),
            "A_s_mm2_m": round(A_s, 0),
            "actual_l_d": round(actual_l_d, 1),
            "allowable_l_d": round(allowable_l_d, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = RcSlabCalculator()
