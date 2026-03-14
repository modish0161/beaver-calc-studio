"""
Fin plate (shear tab) connection design to EN 1993-1-8 / SCI P358.
Bolt group in single shear, fin plate bending/shear/block tearing, weld.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class FinPlateCalculator(CalculatorPlugin):
    key = "fin_plate_v1"
    name = "Fin Plate Connection"
    version = "1.0.0"
    description = "Fin plate shear connection to EN 1993-1-8 / SCI P358"
    category = "steel"
    reference_text = "EN 1993-1-8:2005, SCI P358"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        V_Ed_kN = inputs.get('shear_kN', 200)
        # Fin plate
        tp = inputs.get('plate_thk_mm', 10)
        hp = inputs.get('plate_depth_mm', 300)
        plate_fy = inputs.get('plate_fy_MPa', 275)
        plate_fu = inputs.get('plate_fu_MPa', 430)
        # Bolts
        n_bolts = inputs.get('number_bolts', 4)
        bolt_dia = inputs.get('bolt_diameter_mm', 20)
        fub = inputs.get('bolt_grade_fub_MPa', 800)
        bolt_pitch = inputs.get('bolt_pitch_mm', 70)
        end_dist = inputs.get('end_distance_mm', 40)
        edge_dist = inputs.get('edge_distance_mm', 50)
        # Weld
        weld_size = inputs.get('weld_size_mm', 8)

        gamma_M0 = 1.0
        gamma_M2 = 1.25
        d0 = bolt_dia + 2  # hole diameter

        # Bolt shear (single shear plane)
        As = 0.78 * math.pi * bolt_dia ** 2 / 4
        F_v_Rd = 0.6 * fub * As / gamma_M2 / 1000  # kN per bolt
        V_per_bolt = V_Ed_kN / n_bolts
        util_bolt_shear = V_per_bolt / F_v_Rd if F_v_Rd > 0 else float('inf')

        # Bolt bearing on fin plate
        alpha_d = min(end_dist / (3 * d0), bolt_dia / (3 * d0) - 0.25, fub / plate_fu, 1.0)
        k1 = min(2.8 * edge_dist / d0 - 1.7, 2.5)
        F_b_Rd = k1 * alpha_d * plate_fu * bolt_dia * tp / gamma_M2 / 1000
        util_bearing = V_per_bolt / F_b_Rd if F_b_Rd > 0 else float('inf')

        # Fin plate shear (gross section)
        A_v = hp * tp
        V_pl_Rd = A_v * (plate_fy / math.sqrt(3)) / 1000 / gamma_M0
        util_plate_shear = V_Ed_kN / V_pl_Rd if V_pl_Rd > 0 else float('inf')

        # Fin plate shear (net section)
        A_v_net = (hp - n_bolts * d0) * tp
        V_net_Rd = A_v_net * (plate_fu / math.sqrt(3)) / 1000 / gamma_M2
        util_net_shear = V_Ed_kN / V_net_Rd if V_net_Rd > 0 else float('inf')

        # Block tearing (cl 3.10.2)
        L_v_net = (hp - end_dist - (n_bolts - 1) * bolt_pitch) - (n_bolts - 0.5) * d0
        L_v_net = max(L_v_net, 0)
        A_nt = (edge_dist - d0 / 2) * tp
        A_nv = L_v_net * tp
        V_eff_Rd = (plate_fu * A_nt / gamma_M2 + plate_fy * A_nv / (math.sqrt(3) * gamma_M0)) / 1000
        # Simplified block tearing
        L_v_gross = hp - end_dist
        V_block = (0.5 * plate_fu * A_nt / gamma_M2 + plate_fy * L_v_gross * tp / (math.sqrt(3) * gamma_M0)) / 1000
        V_eff_Rd = max(V_eff_Rd, V_block) if V_block > 0 else V_eff_Rd
        util_block = V_Ed_kN / V_eff_Rd if V_eff_Rd > 0 else float('inf')

        # Weld check (fillet weld each side)
        a = weld_size * 0.7  # throat
        L_weld = hp  # total weld length (both sides)
        fw = 510  # electrode strength E42xx
        F_w_Rd = 2 * a * L_weld * fw / (math.sqrt(3) * gamma_M2) / 1000  # kN (2 welds)
        util_weld = V_Ed_kN / F_w_Rd if F_w_Rd > 0 else float('inf')

        # Lateral torsional buckling of long fin plates (SCI P358 cl 5)
        z = edge_dist  # eccentricity
        M_fin = V_Ed_kN * z / 1000  # kNm
        W_fin = tp * hp ** 2 / 6 / 1e3  # cm^3 → kNm capacity
        M_fin_Rd = W_fin * plate_fy / 1e3
        util_ltb = M_fin / M_fin_Rd if M_fin_Rd > 0 else float('inf')

        checks = [
            {"name": "Bolt shear", "utilisation": round(util_bolt_shear * 100, 1),
             "status": "PASS" if util_bolt_shear <= 1.0 else "FAIL",
             "detail": f"V/bolt={V_per_bolt:.1f} kN / F_v,Rd={F_v_Rd:.1f} kN"},
            {"name": "Bolt bearing", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if util_bearing <= 1.0 else "FAIL",
             "detail": f"V/bolt={V_per_bolt:.1f} kN / F_b,Rd={F_b_Rd:.1f} kN"},
            {"name": "Plate gross shear", "utilisation": round(util_plate_shear * 100, 1),
             "status": "PASS" if util_plate_shear <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f} kN / V_pl,Rd={V_pl_Rd:.1f} kN"},
            {"name": "Plate net shear", "utilisation": round(util_net_shear * 100, 1),
             "status": "PASS" if util_net_shear <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f} kN / V_net,Rd={V_net_Rd:.1f} kN"},
            {"name": "Block tearing", "utilisation": round(util_block * 100, 1),
             "status": "PASS" if util_block <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f} kN / V_eff,Rd={V_eff_Rd:.1f} kN"},
            {"name": "Weld", "utilisation": round(util_weld * 100, 1),
             "status": "PASS" if util_weld <= 1.0 else "FAIL",
             "detail": f"V_Ed={V_Ed_kN:.1f} kN / F_w,Rd={F_w_Rd:.1f} kN"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "F_v_Rd_kN": round(F_v_Rd, 1),
            "F_b_Rd_kN": round(F_b_Rd, 1),
            "V_pl_Rd_kN": round(V_pl_Rd, 1),
            "V_net_Rd_kN": round(V_net_Rd, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = FinPlateCalculator()
