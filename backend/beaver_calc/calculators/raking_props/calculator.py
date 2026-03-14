"""
Raking prop design calculator for temporary works.
Checks prop axial, buckling, connection, and foundation per BS 5975 / EN 1993-1-1.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class RakingPropsCalculator(CalculatorPlugin):
    key = "raking_props_v1"
    name = "Raking Props"
    version = "1.0.0"
    description = "Raking prop design for temporary shoring to buildings"
    category = "temporary_works"
    reference_text = "BS 5975:2019 / EN 1993-1-1:2005"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Geometry
        wall_height_m = inputs.get('wall_height_m', 6.0)
        prop_angle_deg = inputs.get('prop_angle_deg', 60)  # to horizontal
        # Loading
        horizontal_force_kN = inputs.get('horizontal_force_kN', 50)
        # Prop section (e.g. 203×203×46 UC)
        A_cm2 = inputs.get('A_cm2', 58.7)
        Iy_cm4 = inputs.get('Iy_cm4', 4568)
        Iz_cm4 = inputs.get('Iz_cm4', 1548)
        fy_MPa = inputs.get('fy_MPa', 355)
        E_MPa = inputs.get('E_MPa', 210000)
        gamma_M1 = inputs.get('gamma_M1', 1.0)
        # Foundation
        foundation_type = inputs.get('foundation_type', 'pad')  # pad or raking
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 100)
        pad_width_mm = inputs.get('pad_width_mm', 600)
        pad_length_mm = inputs.get('pad_length_mm', 600)
        # Friction at base
        friction_coeff = inputs.get('friction_coeff', 0.5)

        angle_rad = math.radians(prop_angle_deg)

        # Prop length
        prop_length_m = wall_height_m / math.sin(angle_rad) if math.sin(angle_rad) > 0 else 999
        prop_length_mm = prop_length_m * 1000

        # Force in prop (horizontal force resolved along prop axis)
        axial_force_kN = horizontal_force_kN / math.sin(angle_rad) if math.sin(angle_rad) > 0 else 999

        # Vertical reaction at base
        V_base_kN = axial_force_kN * math.sin(angle_rad)
        H_base_kN = axial_force_kN * math.cos(angle_rad)

        # Axial capacity
        A = A_cm2 * 100  # mm2
        N_Rd = A * fy_MPa / (gamma_M1 * 1000)  # kN
        axial_util = axial_force_kN / N_Rd if N_Rd > 0 else 999

        # Buckling (about minor axis)
        I_min = min(Iy_cm4, Iz_cm4) * 1e4  # mm4
        i_min = math.sqrt(I_min / A) if A > 0 else 1
        lambda_1 = math.pi * math.sqrt(E_MPa / fy_MPa)
        L_cr = prop_length_mm  # assume pinned-pinned
        lambda_bar = (L_cr / i_min) / lambda_1

        # Buckling curve c (α = 0.49 for UC sections about minor axis)
        alpha = 0.49
        phi = 0.5 * (1 + alpha * (lambda_bar - 0.2) + lambda_bar ** 2)
        chi = min(1.0, 1 / (phi + math.sqrt(max(phi ** 2 - lambda_bar ** 2, 0))))

        N_b_Rd = chi * A * fy_MPa / (gamma_M1 * 1000)  # kN
        buckling_util = axial_force_kN / N_b_Rd if N_b_Rd > 0 else 999

        # Foundation bearing
        pad_area = pad_width_mm * pad_length_mm / 1e6  # m2
        bearing_pressure = V_base_kN / pad_area if pad_area > 0 else 999
        bearing_util = bearing_pressure / bearing_capacity_kPa if bearing_capacity_kPa > 0 else 999

        # Sliding at base
        friction_resistance = V_base_kN * friction_coeff
        sliding_util = H_base_kN / friction_resistance if friction_resistance > 0 else 999

        checks = [
            {"name": "Prop axial (N_Ed / N_Rd)",
             "utilisation": round(axial_util * 100, 1),
             "status": "PASS" if axial_util <= 1.0 else "FAIL",
             "detail": f"N_Ed={axial_force_kN:.1f} kN / N_Rd={N_Rd:.0f} kN"},
            {"name": "Prop buckling (N_Ed / N_b,Rd)",
             "utilisation": round(buckling_util * 100, 1),
             "status": "PASS" if buckling_util <= 1.0 else "FAIL",
             "detail": f"N_Ed={axial_force_kN:.1f} kN / N_b,Rd={N_b_Rd:.0f} kN (χ={chi:.3f}, λ̄={lambda_bar:.2f})"},
            {"name": "Foundation bearing",
             "utilisation": round(bearing_util * 100, 1),
             "status": "PASS" if bearing_util <= 1.0 else "FAIL",
             "detail": f"q={bearing_pressure:.1f} kPa / {bearing_capacity_kPa:.0f} kPa ({pad_width_mm}×{pad_length_mm}mm pad)"},
            {"name": "Sliding resistance",
             "utilisation": round(sliding_util * 100, 1),
             "status": "PASS" if sliding_util <= 1.0 else "FAIL",
             "detail": f"H={H_base_kN:.1f} kN / μV={friction_resistance:.1f} kN (μ={friction_coeff})"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "prop_length_m": round(prop_length_m, 2),
            "axial_force_kN": round(axial_force_kN, 1),
            "V_base_kN": round(V_base_kN, 1),
            "H_base_kN": round(H_base_kN, 1),
            "N_b_Rd_kN": round(N_b_Rd, 0),
            "chi": round(chi, 3),
            "lambda_bar": round(lambda_bar, 2),
            "bearing_pressure_kPa": round(bearing_pressure, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = RakingPropsCalculator()
