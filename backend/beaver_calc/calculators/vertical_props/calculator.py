"""
Vertical prop (Acrow / steel) design per BS 5975 / EN 12812 / EN 1993-1-1.
Checks axial capacity (buckling), head/base bearing, and eccentricity.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class VerticalPropsCalculator(CalculatorPlugin):
    key = "vertical_props_v1"
    name = "Vertical Props"
    version = "1.0.0"
    description = "Vertical prop design per BS 5975 / EN 12812"
    category = "temporary-works"
    reference_text = "BS 5975:2019 cl 20; EN 12812:2008; EN 1993-1-1"

    # Standard Acrow prop data (sizes 0-4)
    PROP_DATA = {
        '0': {'inner_dia_mm': 48.3, 'outer_dia_mm': 60.3, 'min_m': 1.07, 'max_m': 1.83, 'swl_kN': 34},
        '1': {'inner_dia_mm': 48.3, 'outer_dia_mm': 60.3, 'min_m': 1.75, 'max_m': 3.12, 'swl_kN': 20.5},
        '2': {'inner_dia_mm': 48.3, 'outer_dia_mm': 60.3, 'min_m': 2.59, 'max_m': 3.96, 'swl_kN': 17},
        '3': {'inner_dia_mm': 48.3, 'outer_dia_mm': 60.3, 'min_m': 3.20, 'max_m': 4.88, 'swl_kN': 12},
        '4': {'inner_dia_mm': 48.3, 'outer_dia_mm': 60.3, 'min_m': 4.27, 'max_m': 6.10, 'swl_kN': 8},
    }

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Loading
        applied_load_kN = inputs.get('applied_load_kN', 15.0)
        eccentricity_mm = inputs.get('eccentricity_mm', 25.0)

        # Prop selection
        prop_size = str(inputs.get('prop_size', '1'))
        extended_length_m = inputs.get('extended_length_m', 2.5)

        # Bearing
        base_plate_mm = inputs.get('base_plate_side_mm', 150)
        head_plate_mm = inputs.get('head_plate_side_mm', 150)
        bearing_strength_kPa = inputs.get('bearing_strength_kPa', 5000)  # concrete default

        # Steel properties
        fy_MPa = inputs.get('fy_MPa', 235)
        E_MPa = 210000

        data = self.PROP_DATA.get(prop_size, self.PROP_DATA['1'])
        swl_kN = data['swl_kN']

        # Check extended length within range
        length_ok = data['min_m'] <= extended_length_m <= data['max_m']

        # SWL check
        swl_util = applied_load_kN / swl_kN if swl_kN > 0 else 999

        # Euler buckling check on inner tube
        d_inner = data['inner_dia_mm']
        t_wall = 3.2  # typical tube wall thickness mm
        d_outer_tube = d_inner
        d_inner_tube = d_inner - 2 * t_wall
        I = math.pi / 64 * (d_outer_tube ** 4 - d_inner_tube ** 4)  # mm^4
        A = math.pi / 4 * (d_outer_tube ** 2 - d_inner_tube ** 2)  # mm^2

        Le = extended_length_m * 1000  # effective length (pinned-pinned)
        N_cr = math.pi ** 2 * E_MPa * I / (Le ** 2) / 1000  # kN

        # EN 1993-1-1 buckling
        lambda_1 = math.pi * math.sqrt(E_MPa / fy_MPa)
        r = math.sqrt(I / A) if A > 0 else 1
        lambda_bar = (Le / r) / lambda_1 if lambda_1 > 0 else 999

        # Curve c for CHS (α = 0.49)
        alpha_imp = 0.49
        phi = 0.5 * (1 + alpha_imp * (lambda_bar - 0.2) + lambda_bar ** 2)
        chi = 1.0 / (phi + math.sqrt(max(phi ** 2 - lambda_bar ** 2, 0.001)))
        chi = min(chi, 1.0)

        Nb_Rd = chi * A * fy_MPa / 1000 / 1.0  # γ_M1 = 1.0
        buckling_util = applied_load_kN / Nb_Rd if Nb_Rd > 0 else 999

        # Eccentricity moment
        M_ecc = applied_load_kN * eccentricity_mm / 1000  # kNm
        Wel = I / (d_outer_tube / 2) / 1000  # cm^3 → kNm
        M_Rd = Wel * fy_MPa / 1e6  # kNm
        # N-M interaction (simplified)
        nm_util = applied_load_kN / Nb_Rd + M_ecc / M_Rd if M_Rd > 0 else 999

        # Base/head plate bearing
        base_area = (base_plate_mm / 1000) ** 2  # m²
        head_area = (head_plate_mm / 1000) ** 2
        base_pressure = applied_load_kN / base_area if base_area > 0 else 999
        head_pressure = applied_load_kN / head_area if head_area > 0 else 999
        base_util = base_pressure / bearing_strength_kPa if bearing_strength_kPa > 0 else 999
        head_util = head_pressure / bearing_strength_kPa if bearing_strength_kPa > 0 else 999

        checks = []

        checks.append({
            "name": "SWL check",
            "utilisation": round(swl_util, 3),
            "status": "PASS" if swl_util <= 1.0 else "FAIL",
            "detail": (f"Applied {applied_load_kN:.1f} kN vs SWL "
                       f"{swl_kN:.1f} kN (size {prop_size}, {extended_length_m:.2f}m)")
        })

        if not length_ok:
            checks.append({
                "name": "Extension range",
                "utilisation": 1.5,
                "status": "FAIL",
                "detail": (f"Length {extended_length_m:.2f}m outside range "
                           f"{data['min_m']:.2f}–{data['max_m']:.2f}m for size {prop_size}")
            })

        checks.append({
            "name": "Euler buckling (EN 1993-1-1)",
            "utilisation": round(buckling_util, 3),
            "status": "PASS" if buckling_util <= 1.0 else "FAIL",
            "detail": (f"N_Ed = {applied_load_kN:.1f} kN, N_b,Rd = {Nb_Rd:.1f} kN, "
                       f"χ = {chi:.3f}, λ̄ = {lambda_bar:.2f}")
        })

        checks.append({
            "name": "N-M interaction (eccentricity)",
            "utilisation": round(nm_util, 3),
            "status": "PASS" if nm_util <= 1.0 else "FAIL",
            "detail": (f"N/N_Rd + M/M_Rd = {applied_load_kN:.1f}/{Nb_Rd:.1f} + "
                       f"{M_ecc:.2f}/{M_Rd:.2f} = {nm_util:.3f}")
        })

        checks.append({
            "name": "Base plate bearing",
            "utilisation": round(base_util, 3),
            "status": "PASS" if base_util <= 1.0 else "FAIL",
            "detail": (f"{base_pressure:.0f} kPa vs "
                       f"{bearing_strength_kPa:.0f} kPa ({base_util * 100:.0f}%)")
        })

        checks.append({
            "name": "Head plate bearing",
            "utilisation": round(head_util, 3),
            "status": "PASS" if head_util <= 1.0 else "FAIL",
            "detail": (f"{head_pressure:.0f} kPa vs "
                       f"{bearing_strength_kPa:.0f} kPa ({head_util * 100:.0f}%)")
        })

        governing = max(c["utilisation"] for c in checks)
        overall = "PASS" if all(c["status"] == "PASS" for c in checks) else "FAIL"

        return {
            "prop_size": prop_size,
            "swl_kN": swl_kN,
            "N_cr_kN": round(N_cr, 1),
            "Nb_Rd_kN": round(Nb_Rd, 1),
            "chi": round(chi, 3),
            "lambda_bar": round(lambda_bar, 2),
            "base_pressure_kPa": round(base_pressure, 0),
            "checks": checks,
            "overall_status": overall,
            "utilisation": round(governing * 100, 1),
        }


calculator = VerticalPropsCalculator()
