"""
Shear stud design for composite beams per EN 1994-1-1.
Checks stud resistance, longitudinal shear, spacing, and degree of connection.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class ShearStudsCalculator(CalculatorPlugin):
    key = "shear_studs_v1"
    name = "Shear Studs"
    version = "1.0.0"
    description = "Headed shear stud design for composite beams per EN 1994-1-1"
    category = "steel"
    reference_text = "EN 1994-1-1:2004 cl 6.6.3"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Stud properties
        d_stud_mm = inputs.get('stud_diameter_mm', 19)
        h_sc_mm = inputs.get('stud_height_mm', 100)
        f_u_stud_MPa = inputs.get('f_u_stud_MPa', 450)
        # Concrete
        fck_MPa = inputs.get('fck_MPa', 30)
        Ecm_MPa = inputs.get('Ecm_MPa', 33000)
        # Deck (profiled sheeting)
        deck_direction = inputs.get('deck_direction', 'perpendicular')  # parallel or perpendicular
        h_p_mm = inputs.get('deck_height_mm', 60)  # profile height
        b_0_mm = inputs.get('deck_trough_width_mm', 120)  # mean trough width
        n_studs_per_trough = inputs.get('n_studs_per_trough', 1)
        # Beam
        beam_span_mm = inputs.get('beam_span_mm', 9000)
        # Required longitudinal shear
        V_l_Ed_kN = inputs.get('V_l_Ed_kN', 1500)  # total longitudinal shear (= min(Nc, Ns))
        # Arrangement
        n_studs_total = inputs.get('n_studs_total', 0)  # 0 = calculate required
        gamma_V = inputs.get('gamma_V', 1.25)

        # Individual stud resistance (EN 1994-1-1 cl 6.6.3.1)
        # P_Rd = min(0.8 × fu × π d²/4, 0.29 × α × d² × √(fck × Ecm)) / γ_V
        A_stud = math.pi * d_stud_mm ** 2 / 4

        # α factor (h_sc/d ratio)
        if h_sc_mm / d_stud_mm > 4:
            alpha = 1.0
        else:
            alpha = 0.2 * (h_sc_mm / d_stud_mm + 1)

        P_Rd_steel = 0.8 * f_u_stud_MPa * A_stud / (gamma_V * 1000)  # kN
        P_Rd_conc = 0.29 * alpha * d_stud_mm ** 2 * math.sqrt(fck_MPa * Ecm_MPa) / (gamma_V * 1000)  # kN
        P_Rd_base = min(P_Rd_steel, P_Rd_conc)

        # Reduction factor for profiled decking (cl 6.6.4)
        if deck_direction == 'perpendicular':
            k_t_max = {1: 0.85, 2: 0.7}.get(n_studs_per_trough, 0.6)
            k_t = min(k_t_max, 0.7 / math.sqrt(n_studs_per_trough) * (b_0_mm / h_p_mm) * (h_sc_mm / h_p_mm - 1))
            k_t = max(0, k_t)
        else:
            # Parallel
            k_l = max(0, 0.6 * (b_0_mm / h_p_mm) * (h_sc_mm / h_p_mm - 1))
            k_t = min(1.0, k_l)

        P_Rd = P_Rd_base * k_t

        # Number of studs required
        n_required = math.ceil(V_l_Ed_kN / P_Rd) if P_Rd > 0 else 999
        # Per half span (each side of max moment)
        n_per_half = math.ceil(n_required / 2)

        if n_studs_total == 0:
            n_studs_total = n_required

        # Stud capacity (total)
        total_capacity_kN = n_studs_total * P_Rd

        # Degree of shear connection
        eta = total_capacity_kN / V_l_Ed_kN if V_l_Ed_kN > 0 else 999

        # Minimum degree of connection (cl 6.6.1.2)
        Le = beam_span_mm / 1000  # m
        if Le <= 25:
            eta_min = max(0.4, 1 - (355 / 355) * (0.75 - 0.03 * Le))
        else:
            eta_min = 1.0

        # Spacing
        half_span = beam_span_mm / 2
        stud_spacing_mm = half_span / n_per_half if n_per_half > 0 else 999
        max_spacing = min(6 * (h_sc_mm + h_p_mm + 75), 800)  # cl 6.6.5.5
        min_spacing = 5 * d_stud_mm

        checks = [
            {"name": "Longitudinal shear capacity",
             "utilisation": round(V_l_Ed_kN / total_capacity_kN * 100, 1) if total_capacity_kN > 0 else 999,
             "status": "PASS" if total_capacity_kN >= V_l_Ed_kN else "FAIL",
             "detail": f"V_l={V_l_Ed_kN:.0f} kN / {n_studs_total} × P_Rd={total_capacity_kN:.0f} kN"},
            {"name": "Degree of shear connection",
             "utilisation": round(eta_min / eta * 100, 1) if eta > 0 else 999,
             "status": "PASS" if eta >= eta_min else "FAIL",
             "detail": f"η={eta:.2f} (min {eta_min:.2f} for Le={Le:.1f}m)"},
            {"name": "Stud spacing",
             "utilisation": round(stud_spacing_mm / max_spacing * 100, 1) if max_spacing > 0 else 0,
             "status": "PASS" if min_spacing <= stud_spacing_mm <= max_spacing else "FAIL",
             "detail": f"s={stud_spacing_mm:.0f}mm ({min_spacing:.0f} ≤ s ≤ {max_spacing:.0f}mm)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "P_Rd_kN": round(P_Rd, 1),
            "P_Rd_base_kN": round(P_Rd_base, 1),
            "k_t": round(k_t, 3),
            "n_required": n_required,
            "n_per_half_span": n_per_half,
            "total_capacity_kN": round(total_capacity_kN, 0),
            "degree_of_connection": round(eta, 2),
            "stud_spacing_mm": round(stud_spacing_mm, 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = ShearStudsCalculator()
