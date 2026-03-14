"""
Anchor bolt design (EN 1992-4 / CEN/TS 1992-4)
Checks tension, shear, combined, concrete cone breakout, pull-out, pry-out.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class AnchorBoltCalculator(CalculatorPlugin):
    key = "anchor_bolt_v1"
    name = "Anchor Bolt Design"
    version = "1.0.0"
    description = "Cast-in / post-installed anchor design to EN 1992-4"
    category = "steel"
    reference_text = "EN 1992-4:2018 / CEN/TS 1992-4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        bolt_dia_mm = inputs.get('bolt_diameter_mm', 20)
        embed_depth_mm = inputs.get('embedment_depth_mm', 200)
        fck_MPa = inputs.get('fck_MPa', 30)
        fub_MPa = inputs.get('fub_MPa', 800)
        n_bolts = inputs.get('num_bolts', 4)
        N_Ed_kN = inputs.get('tension_kN', 50)
        V_Ed_kN = inputs.get('shear_kN', 30)
        edge_dist_mm = inputs.get('edge_distance_mm', 150)
        spacing_mm = inputs.get('spacing_mm', 150)
        anchor_type = inputs.get('anchor_type', 'cast_in')
        gamma_Ms = inputs.get('gamma_Ms', 1.4)
        gamma_Mc = inputs.get('gamma_Mc', 1.5)

        A_s_mm2 = math.pi / 4 * (bolt_dia_mm * 0.84) ** 2  # tensile stress area approx
        h_ef = embed_depth_mm

        # --- Steel tension resistance ---
        N_Rd_s_kN = n_bolts * A_s_mm2 * fub_MPa / gamma_Ms / 1000
        util_steel_tension = N_Ed_kN / N_Rd_s_kN if N_Rd_s_kN > 0 else float('inf')

        # --- Concrete cone breakout (EN 1992-4 Eq. 7.2) ---
        k1 = 12.7 if anchor_type == 'cast_in' else 7.7
        N_Rk0_c_N = k1 * math.sqrt(fck_MPa) * h_ef ** 1.5
        # Area ratio (simplified for group with edge/spacing effects)
        s_cr = 3 * h_ef
        c_cr = 1.5 * h_ef
        psi_s_N = min(1.0, 0.7 + 0.3 * edge_dist_mm / c_cr)
        psi_g_N = min(1.0, n_bolts ** 0.5 * (1 - spacing_mm / s_cr) + 1) if spacing_mm < s_cr else 1.0
        A_ratio = min(1.0, (min(edge_dist_mm, c_cr) * 2 + spacing_mm * (n_bolts - 1)) / (s_cr * n_bolts))
        N_Rd_c_kN = N_Rk0_c_N * A_ratio * psi_s_N * psi_g_N / gamma_Mc / 1000
        util_cone = N_Ed_kN / N_Rd_c_kN if N_Rd_c_kN > 0 else float('inf')

        # --- Pull-out resistance (EN 1992-4 Eq. 7.15 for headed bolts) ---
        bearing_area_mm2 = math.pi / 4 * ((bolt_dia_mm * 2) ** 2 - bolt_dia_mm ** 2)
        N_Rd_p_kN = n_bolts * bearing_area_mm2 * 8 * fck_MPa / gamma_Mc / 1000
        util_pullout = N_Ed_kN / N_Rd_p_kN if N_Rd_p_kN > 0 else float('inf')

        # --- Steel shear resistance ---
        V_Rd_s_kN = n_bolts * 0.5 * A_s_mm2 * fub_MPa / gamma_Ms / 1000
        util_steel_shear = V_Ed_kN / V_Rd_s_kN if V_Rd_s_kN > 0 else float('inf')

        # --- Concrete pry-out (EN 1992-4 Eq. 7.25) ---
        k3 = 2.0 if h_ef >= 60 else 1.0
        V_Rd_cp_kN = k3 * N_Rd_c_kN
        util_pryout = V_Ed_kN / V_Rd_cp_kN if V_Rd_cp_kN > 0 else float('inf')

        # --- Concrete edge breakout in shear ---
        d_nom = bolt_dia_mm
        l_f = min(h_ef, 8 * d_nom)
        V_Rk0_c_N = 3.0 * (d_nom / 1.0) ** 0.1 * math.sqrt(l_f / d_nom) * math.sqrt(fck_MPa) * edge_dist_mm ** 1.5
        psi_s_V = min(1.0, 0.7 + 0.3 * edge_dist_mm / (1.5 * edge_dist_mm))
        V_Rd_edge_kN = V_Rk0_c_N * psi_s_V / gamma_Mc / 1000
        util_edge = V_Ed_kN / V_Rd_edge_kN if V_Rd_edge_kN > 0 else float('inf')

        # --- Combined tension + shear interaction ---
        max_tension_util = max(util_steel_tension, util_cone, util_pullout)
        max_shear_util = max(util_steel_shear, util_pryout, util_edge)
        # Interaction: (N/NRd)^1.5 + (V/VRd)^1.5 <= 1.0
        if max_tension_util > 0 or max_shear_util > 0:
            interaction = max_tension_util ** 1.5 + max_shear_util ** 1.5
        else:
            interaction = 0
        combined_ok = interaction <= 1.0

        governing_util = max(util_steel_tension, util_cone, util_pullout,
                            util_steel_shear, util_pryout, util_edge, interaction)

        checks = [
            {"name": "Steel Tension", "utilisation": round(util_steel_tension * 100, 1),
             "status": "PASS" if util_steel_tension <= 1.0 else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.1f}kN / N_Rd,s={N_Rd_s_kN:.1f}kN"},
            {"name": "Concrete Cone Breakout", "utilisation": round(util_cone * 100, 1),
             "status": "PASS" if util_cone <= 1.0 else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.1f}kN / N_Rd,c={N_Rd_c_kN:.1f}kN"},
            {"name": "Pull-out", "utilisation": round(util_pullout * 100, 1),
             "status": "PASS" if util_pullout <= 1.0 else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.1f}kN / N_Rd,p={N_Rd_p_kN:.1f}kN"},
            {"name": "Steel Shear", "utilisation": round(util_steel_shear * 100, 1),
             "status": "PASS" if util_steel_shear <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f}kN / V_Rd,s={V_Rd_s_kN:.1f}kN"},
            {"name": "Concrete Pry-out", "utilisation": round(util_pryout * 100, 1),
             "status": "PASS" if util_pryout <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f}kN / V_Rd,cp={V_Rd_cp_kN:.1f}kN"},
            {"name": "Edge Breakout (Shear)", "utilisation": round(util_edge * 100, 1),
             "status": "PASS" if util_edge <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f}kN / V_Rd,c={V_Rd_edge_kN:.1f}kN"},
            {"name": "Combined Tension + Shear", "utilisation": round(interaction * 100, 1),
             "status": "PASS" if combined_ok else "FAIL",
             "detail": f"Interaction = {interaction:.3f} ≤ 1.0"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "A_s_mm2": round(A_s_mm2, 1),
            "N_Rd_s_kN": round(N_Rd_s_kN, 1),
            "N_Rd_c_kN": round(N_Rd_c_kN, 1),
            "N_Rd_p_kN": round(N_Rd_p_kN, 1),
            "V_Rd_s_kN": round(V_Rd_s_kN, 1),
            "V_Rd_cp_kN": round(V_Rd_cp_kN, 1),
            "V_Rd_edge_kN": round(V_Rd_edge_kN, 1),
            "interaction": round(interaction, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing_util * 100, 1),
        }


calculator = AnchorBoltCalculator()
