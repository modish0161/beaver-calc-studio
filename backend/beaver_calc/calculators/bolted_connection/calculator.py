"""
Bolted connection design (EN 1993-1-8)
Checks bolt shear, bearing, tension, net section, block tearing.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class BoltedConnectionCalculator(CalculatorPlugin):
    key = "bolted_connection_v1"
    name = "Bolted Connection Design"
    version = "1.0.0"
    description = "Bolted connection checks to EN 1993-1-8"
    category = "steel"
    reference_text = "EN 1993-1-8:2005"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        bolt_dia_mm = inputs.get('bolt_diameter_mm', 20)
        n_bolts = inputs.get('num_bolts', 4)
        n_rows = inputs.get('num_rows', 2)
        n_cols = inputs.get('num_cols', 2)
        fub_MPa = inputs.get('fub_MPa', 800)
        fy_plate_MPa = inputs.get('fy_plate_MPa', 275)
        fu_plate_MPa = inputs.get('fu_plate_MPa', 430)
        plate_thick_mm = inputs.get('plate_thickness_mm', 10)
        plate_width_mm = inputs.get('plate_width_mm', 200)
        N_Ed_kN = inputs.get('tension_kN', 100)
        V_Ed_kN = inputs.get('shear_kN', 150)
        edge_dist_mm = inputs.get('edge_distance_mm', 30)
        end_dist_mm = inputs.get('end_distance_mm', 40)
        pitch_mm = inputs.get('pitch_mm', 60)
        gauge_mm = inputs.get('gauge_mm', 100)
        n_shear_planes = inputs.get('n_shear_planes', 1)
        is_slip_resistant = inputs.get('is_slip_resistant', False)
        mu = inputs.get('friction_coefficient', 0.5)
        gamma_M2 = 1.25
        gamma_M0 = 1.0

        d_0_mm = bolt_dia_mm + 2  # standard hole clearance
        A_s_mm2 = math.pi / 4 * (bolt_dia_mm * 0.84) ** 2

        # --- Bolt shear resistance (Table 3.4) ---
        alpha_v = 0.6 if fub_MPa <= 800 else 0.5
        F_v_Rd_kN = n_shear_planes * alpha_v * fub_MPa * A_s_mm2 / gamma_M2 / 1000
        V_per_bolt_kN = V_Ed_kN / n_bolts
        util_bolt_shear = V_per_bolt_kN / F_v_Rd_kN if F_v_Rd_kN > 0 else float('inf')

        # --- Bearing resistance (Table 3.4) ---
        alpha_d = min(end_dist_mm / (3 * d_0_mm), pitch_mm / (3 * d_0_mm) - 0.25, fub_MPa / fu_plate_MPa, 1.0)
        k1 = min(2.8 * edge_dist_mm / d_0_mm - 1.7, 1.4 * gauge_mm / d_0_mm - 1.7, 2.5)
        k1 = max(k1, 1.25)
        F_b_Rd_kN = k1 * alpha_d * fu_plate_MPa * bolt_dia_mm * plate_thick_mm / gamma_M2 / 1000
        util_bearing = V_per_bolt_kN / F_b_Rd_kN if F_b_Rd_kN > 0 else float('inf')

        # --- Bolt tension resistance (Table 3.4) ---
        F_t_Rd_kN = 0.9 * fub_MPa * A_s_mm2 / gamma_M2 / 1000
        T_per_bolt_kN = N_Ed_kN / n_bolts if N_Ed_kN > 0 else 0
        util_bolt_tension = T_per_bolt_kN / F_t_Rd_kN if F_t_Rd_kN > 0 else 0

        # --- Combined shear + tension (Table 3.4) ---
        if T_per_bolt_kN > 0 and V_per_bolt_kN > 0:
            combined = V_per_bolt_kN / F_v_Rd_kN + T_per_bolt_kN / (1.4 * F_t_Rd_kN)
        else:
            combined = max(util_bolt_shear, util_bolt_tension)
        combined_ok = combined <= 1.0

        # --- Net section tension (cl 6.2.3) ---
        net_width_mm = plate_width_mm - n_cols * d_0_mm
        A_net_mm2 = net_width_mm * plate_thick_mm
        N_u_Rd_kN = 0.9 * A_net_mm2 * fu_plate_MPa / gamma_M2 / 1000
        util_net_section = N_Ed_kN / N_u_Rd_kN if N_u_Rd_kN > 0 else 0

        # --- Block tearing (cl 3.10.2) ---
        A_nt_mm2 = (gauge_mm * (n_cols - 1) - (n_cols - 1) * d_0_mm) * plate_thick_mm if n_cols > 1 else net_width_mm * plate_thick_mm
        A_nv_mm2 = (end_dist_mm + (n_rows - 1) * pitch_mm - (n_rows - 0.5) * d_0_mm) * plate_thick_mm
        V_eff_Rd_kN = (fu_plate_MPa * A_nt_mm2 / gamma_M2 + fy_plate_MPa * A_nv_mm2 / (math.sqrt(3) * gamma_M0)) / 1000
        util_block_tearing = V_Ed_kN / V_eff_Rd_kN if V_eff_Rd_kN > 0 else 0

        # --- Slip resistance (if preloaded) ---
        util_slip = 0
        slip_ok = True
        F_s_Rd_kN = 0
        if is_slip_resistant:
            F_p_C_kN = 0.7 * fub_MPa * A_s_mm2 / 1000
            k_s = 1.0
            F_s_Rd_kN = k_s * n_shear_planes * mu * F_p_C_kN / 1.25
            util_slip = V_per_bolt_kN / F_s_Rd_kN if F_s_Rd_kN > 0 else float('inf')
            slip_ok = util_slip <= 1.0

        governing = max(util_bolt_shear, util_bearing, util_bolt_tension, combined,
                        util_net_section, util_block_tearing, util_slip)

        checks = [
            {"name": "Bolt Shear", "utilisation": round(util_bolt_shear * 100, 1),
             "status": "PASS" if util_bolt_shear <= 1.0 else "FAIL",
             "detail": f"V={V_per_bolt_kN:.1f}kN / F_v,Rd={F_v_Rd_kN:.1f}kN"},
            {"name": "Bearing", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if util_bearing <= 1.0 else "FAIL",
             "detail": f"V={V_per_bolt_kN:.1f}kN / F_b,Rd={F_b_Rd_kN:.1f}kN"},
            {"name": "Bolt Tension", "utilisation": round(util_bolt_tension * 100, 1),
             "status": "PASS" if util_bolt_tension <= 1.0 else "FAIL",
             "detail": f"T={T_per_bolt_kN:.1f}kN / F_t,Rd={F_t_Rd_kN:.1f}kN"},
            {"name": "Combined Shear+Tension", "utilisation": round(combined * 100, 1),
             "status": "PASS" if combined_ok else "FAIL",
             "detail": f"Interaction = {combined:.3f} ≤ 1.0"},
            {"name": "Net Section", "utilisation": round(util_net_section * 100, 1),
             "status": "PASS" if util_net_section <= 1.0 else "FAIL",
             "detail": f"N_Ed={N_Ed_kN:.1f}kN / N_u,Rd={N_u_Rd_kN:.1f}kN"},
            {"name": "Block Tearing", "utilisation": round(util_block_tearing * 100, 1),
             "status": "PASS" if util_block_tearing <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f}kN / V_eff,Rd={V_eff_Rd_kN:.1f}kN"},
        ]
        if is_slip_resistant:
            checks.append({"name": "Slip Resistance", "utilisation": round(util_slip * 100, 1),
                           "status": "PASS" if slip_ok else "FAIL",
                           "detail": f"V={V_per_bolt_kN:.1f}kN / F_s,Rd={F_s_Rd_kN:.1f}kN"})

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "A_s_mm2": round(A_s_mm2, 1),
            "F_v_Rd_kN": round(F_v_Rd_kN, 1),
            "F_b_Rd_kN": round(F_b_Rd_kN, 1),
            "F_t_Rd_kN": round(F_t_Rd_kN, 1),
            "N_u_Rd_kN": round(N_u_Rd_kN, 1),
            "V_eff_Rd_kN": round(V_eff_Rd_kN, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing * 100, 1),
        }


calculator = BoltedConnectionCalculator()
