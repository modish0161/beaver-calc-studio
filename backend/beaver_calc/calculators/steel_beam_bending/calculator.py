"""
Steel beam bending calculator implementation
"""
import math
from typing import Dict, Any

from ..base import CalculatorPlugin
from .schema import SteelBeamBendingInputs, SteelBeamBendingOutputs


# UKB section properties (simplified database - in reality would be more comprehensive)
SECTION_PROPERTIES = {
    "UKB 610x229x101": {
        "W_el_y": 2720,  # cm³
        "W_pl_y": 3140,  # cm³
        "I_y": 40100,    # cm⁴
        "A": 129,        # cm²
        "h": 609.6,      # mm
        "b": 228.6,      # mm
        "t_w": 8.8,      # mm
        "t_f": 14.1,     # mm
    },
    "UKB 457x191x67": {
        "W_el_y": 1160,
        "W_pl_y": 1330,
        "I_y": 13700,
        "A": 85.3,
        "h": 449.8,
        "b": 189.9,
        "t_w": 8.5,
        "t_f": 10.9,
    },
    "UKB 305x165x40": {
        "W_el_y": 403,
        "W_pl_y": 455,
        "I_y": 2310,
        "A": 51.0,
        "h": 303.4,
        "b": 165.0,
        "t_w": 5.9,
        "t_f": 8.8,
    }
}

# Steel grade properties (N/mm²)
STEEL_PROPERTIES = {
    "S235": {"f_y": 235, "f_u": 360},
    "S275": {"f_y": 275, "f_u": 410},
    "S355": {"f_y": 355, "f_u": 470},
    "S420": {"f_y": 420, "f_u": 500},
    "S460": {"f_y": 460, "f_u": 550},
}


class SteelBeamBendingCalculator(CalculatorPlugin):
    """Steel beam bending check calculator (EN 1993-1-1)"""

    key = "steel_beam_bending_v1"
    name = "Steel I-Beam Bending Check"
    version = "1.0.0"
    description = "Ultimate and serviceability limit state checks for steel beams under bending"
    category = "structural"
    input_schema = SteelBeamBendingInputs
    output_schema = SteelBeamBendingOutputs
    reference_text = "EN 1993-1-1:2005 - Design of steel structures - General rules and rules for buildings"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform steel beam bending calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Get section properties
        section_props = self._get_section_properties(validated_inputs.section)
        if not section_props:
            raise ValueError(f"Section '{validated_inputs.section}' not found in database")

        # Get material properties
        material_props = STEEL_PROPERTIES[validated_inputs.steel_grade]

        # Calculate design actions
        M_Ed_kNm = self._calculate_bending_moment(
            validated_inputs.span_m,
            validated_inputs.uniform_load_kN_per_m
        )
        V_Ed_kN = self._calculate_shear_force(
            validated_inputs.span_m,
            validated_inputs.uniform_load_kN_per_m
        )

        # Calculate resistances
        M_c_Rd_kNm = self._calculate_moment_resistance(
            section_props["W_pl_y"],
            material_props["f_y"],
            validated_inputs.gamma_m0
        )
        V_pl_Rd_kN = self._calculate_shear_resistance(
            section_props["A"],
            section_props["t_w"],
            section_props["h"],
            material_props["f_y"],
            validated_inputs.gamma_m0
        )

        # Calculate utilizations
        utilisation_bending = M_Ed_kNm / M_c_Rd_kNm if M_c_Rd_kNm > 0 else float('inf')
        utilisation_shear = V_Ed_kN / V_pl_Rd_kN if V_pl_Rd_kN > 0 else float('inf')
        utilisation_combined = utilisation_bending + utilisation_shear

        # Check bending and shear
        bending_check = utilisation_bending <= 1.0
        shear_check = utilisation_shear <= 1.0

        # Lateral torsional buckling (if unrestrained)
        ltb_results = self._calculate_lateral_torsional_buckling(
            M_Ed_kNm,
            validated_inputs.span_m,
            section_props,
            material_props,
            validated_inputs.lateral_restraint,
            validated_inputs.gamma_m1
        ) if validated_inputs.lateral_restraint == "unrestrained" else None

        # Deflection check (simplified - using service load)
        deflection_results = self._calculate_deflection(
            validated_inputs.span_m,
            validated_inputs.uniform_load_kN_per_m * 0.5,  # Assume 50% service load
            section_props["I_y"],
            material_props["f_y"]
        )

        # Overall check
        checks = [bending_check, shear_check, deflection_results["check"]]
        if ltb_results:
            checks.append(ltb_results["check"])
        overall_check = all(checks)

        # Build warnings and notes
        warnings = []
        notes = []

        if utilisation_bending > 0.8:
            warnings.append("Bending utilization is high (>80%)")
        if utilisation_shear > 0.8:
            warnings.append("Shear utilization is high (>80%)")
        if ltb_results and ltb_results["utilisation"] > 0.8:
            warnings.append("LTB utilization is high (>80%)")

        notes.append("Calculations based on EN 1993-1-1")
        notes.append("Uniform load assumed to be ultimate limit state load")
        if validated_inputs.lateral_restraint == "unrestrained":
            notes.append("Lateral torsional buckling considered")

        # Build results
        results = {
            "M_Ed_kNm": round(M_Ed_kNm, 2),
            "V_Ed_kN": round(V_Ed_kN, 2),
            "W_el_y": section_props["W_el_y"],
            "W_pl_y": section_props["W_pl_y"],
            "I_y": section_props["I_y"],
            "A": section_props["A"],
            "f_y": material_props["f_y"],
            "f_u": material_props["f_u"],
            "M_c_Rd_kNm": round(M_c_Rd_kNm, 2),
            "V_pl_Rd_kN": round(V_pl_Rd_kN, 2),
            "utilisation_bending": round(utilisation_bending, 3),
            "utilisation_shear": round(utilisation_shear, 3),
            "utilisation_combined": round(utilisation_combined, 3),
            "deflection_mm": round(deflection_results["deflection_mm"], 2),
            "deflection_limit_mm": round(deflection_results["limit_mm"], 2),
            "deflection_check": deflection_results["check"],
            "bending_check": bending_check,
            "shear_check": shear_check,
            "overall_check": overall_check,
            "warnings": warnings,
            "notes": notes
        }

        # Add LTB results if applicable
        if ltb_results:
            results.update({
                "L_cr_m": round(ltb_results["L_cr_m"], 2),
                "M_b_Rd_kNm": round(ltb_results["M_b_Rd_kNm"], 2),
                "utilisation_ltb": round(ltb_results["utilisation"], 3),
                "ltb_check": ltb_results["check"]
            })

        return results

    def _get_section_properties(self, section: str) -> Dict[str, float]:
        """Get section properties from database"""
        return SECTION_PROPERTIES.get(section)

    def _calculate_bending_moment(self, span_m: float, load_kN_per_m: float) -> float:
        """Calculate maximum bending moment for simply supported beam with UDL"""
        # M = wL²/8
        return (load_kN_per_m * span_m * span_m) / 8

    def _calculate_shear_force(self, span_m: float, load_kN_per_m: float) -> float:
        """Calculate maximum shear force for simply supported beam with UDL"""
        # V = wL/2
        return (load_kN_per_m * span_m) / 2

    def _calculate_moment_resistance(self, W_pl_y: float, f_y: float, gamma_m0: float) -> float:
        """Calculate plastic moment resistance (EN 1993-1-1, 6.2.5)"""
        # M_c_Rd = W_pl_y * f_y / gamma_m0
        # Convert W_pl_y from cm³ to mm³: *1000
        # Convert f_y from N/mm² to kN/mm²: /1000
        # Result in kNm: /1000000
        return (W_pl_y * 1000 * f_y / 1000) / (gamma_m0 * 1000000)

    def _calculate_shear_resistance(self, A: float, t_w: float, h: float, f_y: float, gamma_m0: float) -> float:
        """Calculate plastic shear resistance (EN 1993-1-1, 6.2.6)"""
        # For I/H sections: A_v = A - 2*b*t_f + (t_w + 2*r)*t_f ≈ h_w * t_w
        # Using the section properties to get web height
        # V_pl_Rd = A_v * (f_y / √3) / gamma_m0
        # h_w ≈ h - 2*t_f (approximate, conservative)
        # We receive A (cm²), t_w (mm), h (mm)
        h_w = h - 2 * 15  # Approximate flange thickness ~ 15mm
        A_v = max(h_w * t_w, A * 100 * 0.5)  # mm², don't go below 50% of total area
        f_y_kN_mm2 = f_y / 1000  # Convert N/mm² to kN/mm²
        V_pl_Rd_kN = A_v * (f_y_kN_mm2 / math.sqrt(3)) / gamma_m0
        return V_pl_Rd_kN

    def _calculate_lateral_torsional_buckling(self, M_Ed: float, span_m: float,
                                             section_props: Dict[str, float],
                                             material_props: Dict[str, float],
                                             restraint: str, gamma_m1: float) -> Dict[str, Any]:
        """LTB calculation per EN 1993-1-1 §6.3.2 (General method)"""
        # Critical length
        L_cr_m = span_m  # Full span unrestrained

        h = section_props["h"]   # mm
        b = section_props["b"]   # mm
        t_f = section_props["t_f"]  # mm
        t_w = section_props["t_w"]  # mm
        I_y = section_props["I_y"] * 1e4  # cm⁴ → mm⁴
        W_pl_y = section_props["W_pl_y"] * 1e3  # cm³ → mm³
        f_y = material_props["f_y"]  # N/mm²
        E = 210000  # N/mm²
        G = 81000   # N/mm²

        L_cr = L_cr_m * 1000  # mm

        # Approximate torsional properties for I-sections
        # I_t ≈ (2*b*t_f³ + (h-2*t_f)*t_w³) / 3
        h_w = h - 2 * t_f
        I_t = (2 * b * t_f**3 + h_w * t_w**3) / 3  # mm⁴

        # Warping constant I_w ≈ I_z * h² / 4 (approx for doubly-symmetric I)
        # I_z ≈ 2 * (t_f * b³) / 12
        I_z = 2 * (t_f * b**3) / 12  # mm⁴
        I_w = I_z * (h - t_f)**2 / 4  # mm⁶

        # Elastic critical moment M_cr (C1=1.0 for uniform moment)
        C1 = 1.0
        M_cr = (C1 * math.pi**2 * E * I_z / L_cr**2) * math.sqrt(
            (I_w / I_z) + (L_cr**2 * G * I_t) / (math.pi**2 * E * I_z)
        )  # N·mm

        # Non-dimensional slenderness λ̄_LT
        M_pl = W_pl_y * f_y  # N·mm
        lambda_LT = math.sqrt(M_pl / M_cr) if M_cr > 0 else 999

        # Buckling curve selection per EN 1993-1-1 Table 6.4
        # h/b > 2 → curve b (α_LT = 0.34), h/b ≤ 2 → curve a (α_LT = 0.21)
        alpha_LT = 0.34 if h / b > 2 else 0.21

        # Φ_LT = 0.5 * [1 + α_LT*(λ̄_LT - 0.2) + λ̄_LT²]
        phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT**2)

        # χ_LT = 1 / (Φ_LT + √(Φ_LT² - λ̄_LT²))
        disc = phi_LT**2 - lambda_LT**2
        if disc < 0:
            chi_LT = 0.0
        else:
            chi_LT = 1 / (phi_LT + math.sqrt(disc))
        chi_LT = min(chi_LT, 1.0)

        # M_b,Rd = χ_LT * W_pl,y * f_y / γ_M1
        M_b_Rd = chi_LT * W_pl_y * f_y / gamma_m1 / 1e6  # kN·m

        utilisation = M_Ed / M_b_Rd if M_b_Rd > 0 else float('inf')
        check = utilisation <= 1.0

        return {
            "L_cr_m": L_cr_m,
            "M_b_Rd_kNm": M_b_Rd,
            "M_cr_kNm": M_cr / 1e6,
            "lambda_LT": round(lambda_LT, 3),
            "chi_LT": round(chi_LT, 3),
            "utilisation": utilisation,
            "check": check
        }

    def _calculate_deflection(self, span_m: float, service_load_kN_per_m: float,
                            I_y: float, f_y: float) -> Dict[str, Any]:
        """Calculate deflection (simplified serviceability check)"""
        # δ = 5wL⁴/(384EI) for simply supported beam with UDL
        # Convert units: L in mm, w in N/mm, I in mm⁴, E in N/mm²
        L_mm = span_m * 1000
        w_N_mm = service_load_kN_per_m * 1000 / 1000  # kN/m to N/mm
        I_mm4 = I_y * 10000  # cm⁴ to mm⁴
        E = 210000  # N/mm² for steel

        deflection_mm = (5 * w_N_mm * (L_mm ** 4)) / (384 * E * I_mm4)

        # Deflection limit: L/360 for general use
        limit_mm = L_mm / 360
        check = deflection_mm <= limit_mm

        return {
            "deflection_mm": deflection_mm,
            "limit_mm": limit_mm,
            "check": check
        }


# Create calculator instance
calculator = SteelBeamBendingCalculator()
