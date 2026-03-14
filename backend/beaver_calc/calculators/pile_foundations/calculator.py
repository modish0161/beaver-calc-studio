"""
Pile group / pile cap design calculator.
Checks pile group capacity, pile cap bending/shear, and pile spacing per EN 1997-1 / EN 1992-1-1.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class PileFoundationsCalculator(CalculatorPlugin):
    key = "pile_foundations_v1"
    name = "Pile Foundations"
    version = "1.0.0"
    description = "Pile group and pile cap design per EN 1997-1 / EN 1992-1-1"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 cl 7.6.3 / EN 1992-1-1 cl 6.4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Pile group
        n_piles = inputs.get('n_piles', 4)
        pile_dia_mm = inputs.get('pile_diameter_mm', 600)
        pile_capacity_kN = inputs.get('single_pile_capacity_kN', 1500)
        pile_spacing_mm = inputs.get('pile_spacing_mm', 1800)
        # Loading
        N_Ed_kN = inputs.get('N_Ed_kN', 4000)
        M_Ed_kNm = inputs.get('M_Ed_kNm', 500)
        V_Ed_kN = inputs.get('V_Ed_kN', 200)
        # Pile cap
        cap_depth_mm = inputs.get('cap_depth_mm', 900)
        cap_width_mm = inputs.get('cap_width_mm', 2400)
        cap_length_mm = inputs.get('cap_length_mm', 2400)
        cover_mm = inputs.get('cover_mm', 75)
        bar_dia_mm = inputs.get('bar_dia_mm', 20)
        n_bars = inputs.get('n_bars', 10)
        # Material
        fck_MPa = inputs.get('fck_MPa', 35)
        fyk_MPa = inputs.get('fyk_MPa', 500)
        gamma_c = inputs.get('gamma_c', 1.5)
        gamma_s = inputs.get('gamma_s', 1.15)

        fcd = 0.85 * fck_MPa / gamma_c
        fyd = fyk_MPa / gamma_s

        # Group efficiency (simple block failure check)
        # Minimum spacing check: ≥ 3d (EN 1997-1 recommends)
        min_spacing = 3 * pile_dia_mm
        spacing_ok = pile_spacing_mm >= min_spacing

        # Group capacity (simple efficiency)
        # For 2×2 group at s/d ≥ 3, efficiency ≈ 1.0
        s_over_d = pile_spacing_mm / pile_dia_mm if pile_dia_mm > 0 else 0
        if s_over_d >= 6:
            group_efficiency = 1.0
        elif s_over_d >= 3:
            group_efficiency = 0.7 + 0.1 * (s_over_d - 3)
        else:
            group_efficiency = max(0.5, 0.5 + 0.067 * (s_over_d - 2))

        group_capacity_kN = n_piles * pile_capacity_kN * group_efficiency

        # Pile load distribution (assuming rectangular pile group)
        # Max pile load = N/n + M × y_max / Σy²
        # Assume piles symmetrically placed
        rows = int(math.sqrt(n_piles))
        cols = math.ceil(n_piles / rows)
        y_values = []
        for r in range(rows):
            y = (r - (rows - 1) / 2) * pile_spacing_mm / 1000  # m
            for c in range(cols):
                if len(y_values) < n_piles:
                    y_values.append(y)
        sum_y2 = sum(y ** 2 for y in y_values)
        y_max = max(abs(y) for y in y_values) if y_values else 0

        P_avg = N_Ed_kN / n_piles
        P_moment = M_Ed_kNm * y_max / sum_y2 if sum_y2 > 0 else 0
        P_max = P_avg + P_moment
        P_min = P_avg - P_moment

        pile_util = P_max / pile_capacity_kN if pile_capacity_kN > 0 else 999

        # Pile cap bending (strut-and-tie or beam theory)
        d_eff = cap_depth_mm - cover_mm - bar_dia_mm / 2
        A_s = n_bars * math.pi * bar_dia_mm ** 2 / 4
        # Bending from pile reactions
        arm = pile_spacing_mm / 2  # mm (cantilever from column face to pile)
        M_cap = P_max * arm / 1000  # kN⋅m
        M_Rd = A_s * fyd * (d_eff - 0.4 * A_s * fyd / (fcd * cap_width_mm)) / 1e6
        bend_util = M_cap / M_Rd if M_Rd > 0 else 999

        # Punching shear around pile (EN 1992-1-1 cl 6.4)
        u_0 = math.pi * pile_dia_mm + 2 * cap_depth_mm  # control perimeter at 2d
        rho_l = min(A_s / (cap_width_mm * d_eff), 0.02)
        k_punch = min(2.0, 1 + math.sqrt(200 / d_eff))
        v_Rd_c = 0.18 / gamma_c * k_punch * (100 * rho_l * fck_MPa) ** (1 / 3)
        V_punch = P_max * 1000  # N
        v_Ed = V_punch / (u_0 * d_eff)  # MPa
        punch_util = v_Ed / v_Rd_c if v_Rd_c > 0 else 999

        checks = [
            {"name": "Group capacity",
             "utilisation": round(N_Ed_kN / group_capacity_kN * 100, 1) if group_capacity_kN > 0 else 999,
             "status": "PASS" if N_Ed_kN <= group_capacity_kN else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.0f} kN / Q_group={group_capacity_kN:.0f} kN (η={group_efficiency:.2f})"},
            {"name": "Max pile load",
             "utilisation": round(pile_util * 100, 1),
             "status": "PASS" if pile_util <= 1.0 else "FAIL",
             "detail": f"P_max={P_max:.0f} kN / R_pile={pile_capacity_kN:.0f} kN (P_min={P_min:.0f} kN)"},
            {"name": "Pile spacing (≥ 3d)",
             "utilisation": round(min_spacing / pile_spacing_mm * 100, 1) if pile_spacing_mm > 0 else 999,
             "status": "PASS" if spacing_ok else "FAIL",
             "detail": f"s={pile_spacing_mm}mm (min {min_spacing}mm), s/d={s_over_d:.1f}"},
            {"name": "Pile cap bending",
             "utilisation": round(bend_util * 100, 1),
             "status": "PASS" if bend_util <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_cap:.1f} kNm / M_Rd={M_Rd:.1f} kNm"},
            {"name": "Punching shear",
             "utilisation": round(punch_util * 100, 1),
             "status": "PASS" if punch_util <= 1.0 else "FAIL",
             "detail": f"v_Ed={v_Ed:.2f} MPa / v_Rd,c={v_Rd_c:.2f} MPa"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "group_capacity_kN": round(group_capacity_kN, 0),
            "group_efficiency": round(group_efficiency, 2),
            "P_max_kN": round(P_max, 0),
            "P_min_kN": round(P_min, 0),
            "M_cap_kNm": round(M_cap, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = PileFoundationsCalculator()
