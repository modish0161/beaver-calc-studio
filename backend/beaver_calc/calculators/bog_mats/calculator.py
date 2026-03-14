"""
Bog mats / timber mats bearing and bending check (BRE / CIRIA)
Checks bearing pressure distribution, mat bending, and punching.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class BogMatsCalculator(CalculatorPlugin):
    key = "bog_mats_v1"
    name = "Bog Mats / Timber Mats"
    version = "1.0.0"
    description = "Timber mat bearing and bending under plant loads"
    category = "site"
    reference_text = "BRE 470 / CIRIA C703"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        mat_length_mm = inputs.get('mat_length_mm', 6000)
        mat_width_mm = inputs.get('mat_width_mm', 1200)
        mat_thick_mm = inputs.get('mat_thickness_mm', 150)
        n_mats = inputs.get('num_mats', 2)
        outrigger_load_kN = inputs.get('outrigger_load_kN', 200)
        outrigger_size_mm = inputs.get('outrigger_pad_size_mm', 400)
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 50)
        timber_grade = inputs.get('timber_grade', 'C24')
        k_mod = inputs.get('k_mod', 0.9)
        gamma_M = inputs.get('gamma_M', 1.3)

        # Timber properties by grade (EN 338)
        grade_props = {
            'C16': {'fm': 16, 'fv': 3.2, 'E': 8000},
            'C24': {'fm': 24, 'fv': 4.0, 'E': 11000},
            'C30': {'fm': 30, 'fv': 4.0, 'E': 12000},
            'D30': {'fm': 30, 'fv': 3.9, 'E': 10000},
            'D50': {'fm': 50, 'fv': 4.6, 'E': 14000},
            'Hardwood': {'fm': 40, 'fv': 5.0, 'E': 15000},
        }
        props = grade_props.get(timber_grade, grade_props['C24'])
        fm_k = props['fm']
        fv_k = props['fv']
        E_mean = props['E']
        fm_d = k_mod * fm_k / gamma_M
        fv_d = k_mod * fv_k / gamma_M

        # Effective bearing area (load spread through mat at 1:1)
        spread = mat_thick_mm
        eff_pad_mm = outrigger_size_mm + 2 * spread
        bearing_width_mm = min(eff_pad_mm, mat_width_mm * n_mats)
        bearing_length_mm = min(eff_pad_mm, mat_length_mm)
        bearing_area_m2 = bearing_width_mm * bearing_length_mm / 1e6

        # Bearing pressure
        applied_pressure_kPa = outrigger_load_kN / bearing_area_m2 if bearing_area_m2 > 0 else float('inf')
        util_bearing = applied_pressure_kPa / bearing_capacity_kPa
        bearing_ok = util_bearing <= 1.0

        # Mat bending (simply supported over bearing width, point load at centre)
        # Span = bearing_width for each mat
        span_mm = bearing_width_mm / n_mats if n_mats > 0 else bearing_width_mm
        load_per_mat_kN = outrigger_load_kN / n_mats
        M_Ed_Nmm = load_per_mat_kN * 1000 * span_mm / 4  # point load at mid-span
        # Section props per mat (full length acts as beam width)
        b = mat_length_mm
        d = mat_thick_mm
        Z_mm3 = b * d ** 2 / 6
        sigma_m = M_Ed_Nmm / Z_mm3 if Z_mm3 > 0 else float('inf')
        util_bending = sigma_m / fm_d
        bending_ok = util_bending <= 1.0

        # Shear check
        V_Ed_N = load_per_mat_kN * 1000 / 2
        tau_v = 1.5 * V_Ed_N / (b * d) if b * d > 0 else float('inf')
        util_shear = tau_v / fv_d
        shear_ok = util_shear <= 1.0

        # Punching (bearing stress on mat top face)
        pad_area_mm2 = outrigger_size_mm ** 2
        bearing_on_mat_MPa = outrigger_load_kN * 1000 / pad_area_mm2 if pad_area_mm2 > 0 else float('inf')
        # Timber bearing perpendicular (fc,90,d ~ 0.4 * fm_d for softwood)
        fc90_d = 0.4 * fm_d
        util_punching = bearing_on_mat_MPa / fc90_d if fc90_d > 0 else float('inf')
        punching_ok = util_punching <= 1.0

        # Deflection
        I_mm4 = b * d ** 3 / 12
        delta_mm = load_per_mat_kN * 1000 * span_mm ** 3 / (48 * E_mean * I_mm4) if I_mm4 > 0 else 0
        delta_limit_mm = span_mm / 150
        util_deflection = delta_mm / delta_limit_mm if delta_limit_mm > 0 else 0
        deflection_ok = util_deflection <= 1.0

        governing = max(util_bearing, util_bending, util_shear, util_punching, util_deflection)

        checks = [
            {"name": "Ground Bearing", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if bearing_ok else "FAIL",
             "detail": f"{applied_pressure_kPa:.1f}kPa / {bearing_capacity_kPa}kPa"},
            {"name": "Mat Bending", "utilisation": round(util_bending * 100, 1),
             "status": "PASS" if bending_ok else "FAIL",
             "detail": f"σ_m={sigma_m:.2f}MPa / f_m,d={fm_d:.2f}MPa"},
            {"name": "Mat Shear", "utilisation": round(util_shear * 100, 1),
             "status": "PASS" if shear_ok else "FAIL",
             "detail": f"τ={tau_v:.3f}MPa / f_v,d={fv_d:.2f}MPa"},
            {"name": "Punching (bearing on mat)", "utilisation": round(util_punching * 100, 1),
             "status": "PASS" if punching_ok else "FAIL",
             "detail": f"σ={bearing_on_mat_MPa:.2f}MPa / f_c90,d={fc90_d:.2f}MPa"},
            {"name": "Deflection", "utilisation": round(util_deflection * 100, 1),
             "status": "PASS" if deflection_ok else "FAIL",
             "detail": f"δ={delta_mm:.2f}mm / limit={delta_limit_mm:.1f}mm"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)

        return {
            "bearing_area_m2": round(bearing_area_m2, 3),
            "applied_pressure_kPa": round(applied_pressure_kPa, 1),
            "sigma_m_MPa": round(sigma_m, 2),
            "fm_d_MPa": round(fm_d, 2),
            "delta_mm": round(delta_mm, 2),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing * 100, 1),
        }


calculator = BogMatsCalculator()
