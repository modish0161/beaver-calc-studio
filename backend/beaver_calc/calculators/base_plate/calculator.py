"""
Base plate design (EN 1993-1-8 / SCI P398)
Checks bearing pressure, plate bending, bolt tension under axial + moment.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class BasePlateCalculator(CalculatorPlugin):
    key = "base_plate_v1"
    name = "Base Plate Design"
    version = "1.0.0"
    description = "Column base plate bearing, bending and bolt check to EN 1993-1-8"
    category = "steel"
    reference_text = "EN 1993-1-8:2005 / SCI P398"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        plate_length_mm = inputs.get('plate_length_mm', 400)
        plate_width_mm = inputs.get('plate_width_mm', 400)
        plate_thick_mm = inputs.get('plate_thickness_mm', 25)
        col_depth_mm = inputs.get('column_depth_mm', 254)
        col_width_mm = inputs.get('column_width_mm', 254)
        col_tf_mm = inputs.get('column_flange_thick_mm', 14.2)
        fy_plate_MPa = inputs.get('fy_plate_MPa', 275)
        fck_MPa = inputs.get('fck_MPa', 30)
        N_Ed_kN = inputs.get('axial_load_kN', 800)
        M_Ed_kNm = inputs.get('moment_kNm', 50)
        V_Ed_kN = inputs.get('shear_kN', 40)
        n_bolts = inputs.get('num_bolts', 4)
        bolt_dia_mm = inputs.get('bolt_diameter_mm', 24)
        fub_MPa = inputs.get('fub_MPa', 800)
        bolt_edge_mm = inputs.get('bolt_edge_distance_mm', 50)
        gamma_M0 = inputs.get('gamma_M0', 1.0)
        gamma_c = inputs.get('gamma_c', 1.5)

        # Effective bearing strength of concrete (EN 1992: 0.67*fck/gamma_c * confinement factor)
        alpha_cc = 0.85
        f_jd_MPa = alpha_cc * fck_MPa / gamma_c  # design bearing strength

        # Cantilever projection c (SCI P398 method)
        c = plate_thick_mm * math.sqrt(fy_plate_MPa / (3 * f_jd_MPa * gamma_M0))

        # Effective area under plate
        eff_length = min(plate_length_mm, col_depth_mm + 2 * c)
        eff_width = min(plate_width_mm, col_width_mm + 2 * c)
        A_eff_mm2 = eff_length * eff_width
        A_plate_mm2 = plate_length_mm * plate_width_mm

        # Bearing pressure check
        sigma_bearing_MPa = N_Ed_kN * 1000 / A_eff_mm2 if A_eff_mm2 > 0 else float('inf')
        util_bearing = sigma_bearing_MPa / f_jd_MPa
        bearing_ok = util_bearing <= 1.0

        # Plate bending check (cantilever from column face)
        cantilever_mm = max((plate_length_mm - col_depth_mm) / 2, (plate_width_mm - col_width_mm) / 2)
        if cantilever_mm <= 0:
            cantilever_mm = 50
        w_per_mm = sigma_bearing_MPa  # pressure as UDL per mm width (N/mm per mm)
        M_plate_Nmm = w_per_mm * cantilever_mm ** 2 / 2
        Z_plate_mm3 = plate_thick_mm ** 2 / 6  # per mm width
        sigma_plate_MPa = M_plate_Nmm / Z_plate_mm3 if Z_plate_mm3 > 0 else float('inf')
        util_plate_bend = sigma_plate_MPa / (fy_plate_MPa / gamma_M0)
        plate_bend_ok = util_plate_bend <= 1.0

        # Minimum plate thickness for bending
        t_min_mm = cantilever_mm * math.sqrt(2 * sigma_bearing_MPa * gamma_M0 / fy_plate_MPa)

        # Bolt tension under combined axial + moment
        lever_arm_mm = plate_length_mm - 2 * bolt_edge_mm
        if lever_arm_mm <= 0:
            lever_arm_mm = plate_length_mm * 0.6
        n_tension_bolts = max(2, n_bolts // 2)
        eccentricity_mm = M_Ed_kNm * 1e6 / (N_Ed_kN * 1000) if N_Ed_kN > 0 else 0
        if eccentricity_mm > plate_length_mm / 6:
            # Large eccentricity — bolts in tension
            T_bolt_kN = (M_Ed_kNm * 1000 / lever_arm_mm * 1000 - N_Ed_kN / 2) / n_tension_bolts
            T_bolt_kN = max(0, T_bolt_kN)
        else:
            T_bolt_kN = 0

        A_s_bolt_mm2 = math.pi / 4 * (bolt_dia_mm * 0.84) ** 2
        F_t_Rd_kN = 0.9 * A_s_bolt_mm2 * fub_MPa / 1.25 / 1000
        util_bolt_tension = T_bolt_kN / F_t_Rd_kN if F_t_Rd_kN > 0 else 0
        bolt_tension_ok = util_bolt_tension <= 1.0

        # Bolt shear
        V_per_bolt_kN = V_Ed_kN / n_bolts
        F_v_Rd_kN = 0.6 * A_s_bolt_mm2 * fub_MPa / 1.25 / 1000
        util_bolt_shear = V_per_bolt_kN / F_v_Rd_kN if F_v_Rd_kN > 0 else 0
        bolt_shear_ok = util_bolt_shear <= 1.0

        # Combined bolt check (EN 1993-1-8 Table 3.4)
        if T_bolt_kN > 0 and V_per_bolt_kN > 0:
            combined_bolt = util_bolt_shear / 1.0 + util_bolt_tension / 1.4
        else:
            combined_bolt = max(util_bolt_shear, util_bolt_tension)
        combined_bolt_ok = combined_bolt <= 1.0

        governing = max(util_bearing, util_plate_bend, util_bolt_tension, util_bolt_shear, combined_bolt)

        checks = [
            {"name": "Bearing Pressure", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if bearing_ok else "FAIL",
             "detail": f"σ={sigma_bearing_MPa:.1f}MPa / f_jd={f_jd_MPa:.1f}MPa"},
            {"name": "Plate Bending", "utilisation": round(util_plate_bend * 100, 1),
             "status": "PASS" if plate_bend_ok else "FAIL",
             "detail": f"σ={sigma_plate_MPa:.1f}MPa / fy={fy_plate_MPa}MPa, t_min={t_min_mm:.1f}mm"},
            {"name": "Bolt Tension", "utilisation": round(util_bolt_tension * 100, 1),
             "status": "PASS" if bolt_tension_ok else "FAIL",
             "detail": f"T={T_bolt_kN:.1f}kN / F_t,Rd={F_t_Rd_kN:.1f}kN"},
            {"name": "Bolt Shear", "utilisation": round(util_bolt_shear * 100, 1),
             "status": "PASS" if bolt_shear_ok else "FAIL",
             "detail": f"V={V_per_bolt_kN:.1f}kN / F_v,Rd={F_v_Rd_kN:.1f}kN"},
            {"name": "Combined Bolt", "utilisation": round(combined_bolt * 100, 1),
             "status": "PASS" if combined_bolt_ok else "FAIL",
             "detail": f"Interaction = {combined_bolt:.3f} ≤ 1.0"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "f_jd_MPa": round(f_jd_MPa, 2),
            "c_mm": round(c, 1),
            "A_eff_mm2": round(A_eff_mm2, 0),
            "sigma_bearing_MPa": round(sigma_bearing_MPa, 2),
            "t_min_mm": round(t_min_mm, 1),
            "T_bolt_kN": round(T_bolt_kN, 1),
            "F_t_Rd_kN": round(F_t_Rd_kN, 1),
            "F_v_Rd_kN": round(F_v_Rd_kN, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing * 100, 1),
        }


calculator = BasePlateCalculator()
