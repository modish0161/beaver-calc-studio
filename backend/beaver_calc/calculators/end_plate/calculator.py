"""
End plate connection design to EN 1993-1-8 / SCI P398.
Extended or flush end plate with bolt tension, plate bending, weld checks.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class EndPlateCalculator(CalculatorPlugin):
    key = "end_plate_v1"
    name = "End Plate Connection"
    version = "1.0.0"
    description = "End plate moment connection to EN 1993-1-8"
    category = "steel"
    reference_text = "EN 1993-1-8:2005 cl 6.2, SCI P398"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Connection forces
        M_Ed_kNm = inputs.get('moment_kNm', 250)
        V_Ed_kN = inputs.get('shear_kN', 150)
        N_Ed_kN = inputs.get('axial_kN', 0)
        # Beam
        beam_depth_mm = inputs.get('beam_depth_mm', 457)
        flange_thk_mm = inputs.get('flange_thk_mm', 17.7)
        web_thk_mm = inputs.get('web_thk_mm', 11.0)
        # End plate
        tp = inputs.get('plate_thk_mm', 20)
        bp = inputs.get('plate_width_mm', 200)
        plate_fy = inputs.get('plate_fy_MPa', 275)
        # Bolts
        bolt_dia = inputs.get('bolt_diameter_mm', 20)
        n_bolt_rows_tension = inputs.get('bolt_rows_tension', 2)
        n_bolts_per_row = inputs.get('bolts_per_row', 2)
        fub = inputs.get('bolt_grade_fub_MPa', 800)  # Grade 10.9
        bolt_spacing_vert = inputs.get('bolt_spacing_vert_mm', 100)
        p_gauge = inputs.get('gauge_mm', 100)
        # Welds
        weld_flange_mm = inputs.get('weld_flange_mm', 12)
        weld_web_mm = inputs.get('weld_web_mm', 8)

        gamma_M0 = 1.0
        gamma_M2 = 1.25

        # Bolt tensile resistance
        As = 0.78 * math.pi * bolt_dia ** 2 / 4  # tensile stress area approx
        F_t_Rd = 0.9 * fub * As / gamma_M2 / 1000  # kN per bolt

        # Lever arm for bolt group
        lever_arm = beam_depth_mm - flange_thk_mm  # between flanges approx
        total_tension_bolts = n_bolt_rows_tension * n_bolts_per_row

        # Bolt tension from moment
        # Assume linear bolt force distribution
        row_forces = []
        sum_y2 = 0
        for i in range(n_bolt_rows_tension):
            y = lever_arm - i * bolt_spacing_vert
            sum_y2 += y ** 2 * n_bolts_per_row

        max_bolt_tension = 0
        for i in range(n_bolt_rows_tension):
            y = lever_arm - i * bolt_spacing_vert
            F_row = M_Ed_kNm * 1e3 * y / sum_y2 if sum_y2 > 0 else 0
            F_bolt = F_row  # per bolt (n_bolts_per_row already in sum_y2)
            row_forces.append(round(F_bolt, 1))
            max_bolt_tension = max(max_bolt_tension, F_bolt)

        # Add axial contribution
        N_per_bolt = abs(N_Ed_kN) / total_tension_bolts if total_tension_bolts > 0 else 0
        if N_Ed_kN > 0:  # tension
            max_bolt_tension += N_per_bolt

        util_bolt_tension = max_bolt_tension / F_t_Rd if F_t_Rd > 0 else float('inf')

        # Bolt shear
        F_v_Rd = 0.6 * fub * As / gamma_M2 / 1000  # kN per bolt
        V_per_bolt = V_Ed_kN / (total_tension_bolts + n_bolts_per_row * 0) if total_tension_bolts > 0 else 0
        # Use all bolts in shear
        total_shear_bolts = n_bolt_rows_tension * n_bolts_per_row
        V_per_bolt = V_Ed_kN / total_shear_bolts if total_shear_bolts > 0 else 0
        util_bolt_shear = V_per_bolt / F_v_Rd if F_v_Rd > 0 else float('inf')

        # Combined shear + tension (Table 3.4)
        combined = V_per_bolt / (1.0 * F_v_Rd) + max_bolt_tension / (1.4 * F_t_Rd) if F_v_Rd > 0 and F_t_Rd > 0 else float('inf')

        # Plate bending (T-stub mode 1)
        m = (p_gauge / 2 - web_thk_mm / 2 - 0.8 * weld_web_mm * math.sqrt(2))
        M_pl_Rd = 0.25 * bp * tp ** 2 * plate_fy / gamma_M0 / 1e6  # kNm
        F_Tstub = 4 * M_pl_Rd / m * 1000 if m > 0 else float('inf')  # kN
        util_plate = max_bolt_tension * n_bolts_per_row / F_Tstub if F_Tstub > 0 else float('inf')

        # Weld check (flange weld)
        a_f = weld_flange_mm * 0.7  # throat
        L_weld_flange = 2 * (bp - web_thk_mm)  # approx weld length
        F_w_Rd = a_f * L_weld_flange * 0.5 * 510 / (math.sqrt(3) * gamma_M2) / 1000  # kN (E42xx electrode)
        F_flange = M_Ed_kNm * 1e3 / lever_arm if lever_arm > 0 else 0
        util_weld = F_flange / F_w_Rd if F_w_Rd > 0 else float('inf')

        checks = [
            {"name": "Bolt tension", "utilisation": round(util_bolt_tension * 100, 1),
             "status": "PASS" if util_bolt_tension <= 1.0 else "FAIL",
             "detail": f"F_t,max={max_bolt_tension:.1f} kN / F_t,Rd={F_t_Rd:.1f} kN"},
            {"name": "Bolt shear", "utilisation": round(util_bolt_shear * 100, 1),
             "status": "PASS" if util_bolt_shear <= 1.0 else "FAIL",
             "detail": f"V/bolt={V_per_bolt:.1f} kN / F_v,Rd={F_v_Rd:.1f} kN"},
            {"name": "Combined shear+tension", "utilisation": round(combined * 100, 1),
             "status": "PASS" if combined <= 1.0 else "FAIL",
             "detail": f"V/F_v + F_t/1.4F_t,Rd = {combined:.3f}"},
            {"name": "Plate bending (T-stub)", "utilisation": round(util_plate * 100, 1),
             "status": "PASS" if util_plate <= 1.0 else "FAIL",
             "detail": f"Row force / F_T-stub = {util_plate:.3f}"},
            {"name": "Flange weld", "utilisation": round(util_weld * 100, 1),
             "status": "PASS" if util_weld <= 1.0 else "FAIL",
             "detail": f"F_flange={F_flange:.1f} kN / F_w,Rd={F_w_Rd:.1f} kN"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(util_bolt_tension, util_bolt_shear, combined, util_plate, util_weld)

        return {
            "F_t_Rd_kN": round(F_t_Rd, 1),
            "F_v_Rd_kN": round(F_v_Rd, 1),
            "row_forces_kN": row_forces,
            "max_bolt_tension_kN": round(max_bolt_tension, 1),
            "lever_arm_mm": round(lever_arm, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing * 100, 1),
        }


calculator = EndPlateCalculator()
