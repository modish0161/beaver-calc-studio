"""
Steel plate girder calculator implementation
"""
import math
from typing import Dict, Any, Optional

from ..base import CalculatorPlugin
from .schema import SteelPlateGirderInputs, SteelPlateGirderOutputs


# Steel grade properties (N/mm²)
STEEL_PROPERTIES = {
    "S235": {"f_y": 235, "f_u": 360, "E": 210000, "G": 81000},
    "S275": {"f_y": 275, "f_u": 410, "E": 210000, "G": 81000},
    "S355": {"f_y": 355, "f_u": 470, "E": 210000, "G": 81000},
    "S420": {"f_y": 420, "f_u": 500, "E": 210000, "G": 81000},
    "S460": {"f_y": 460, "f_u": 540, "E": 210000, "G": 81000}
}


class SteelPlateGirderCalculator(CalculatorPlugin):
    """Steel plate girder design calculator (EN 1993-1-1, EN 1993-1-5)"""

    key = "steel_plate_girder_v1"
    name = "Steel Plate Girder Design Check"
    version = "1.0.0"
    description = "Ultimate and serviceability limit state checks for steel plate girders with web stiffeners"
    category = "structural"
    input_schema = SteelPlateGirderInputs
    output_schema = SteelPlateGirderOutputs
    reference_text = "EN 1993-1-1:2005, EN 1993-1-5:2006 - Design of steel structures"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform steel plate girder design calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Get material properties
        material_props = STEEL_PROPERTIES[validated_inputs.steel_grade]

        # Calculate section properties
        section_props = self._calculate_section_properties(validated_inputs)

        # Calculate self-weight
        self_weight = self._calculate_self_weight(section_props)

        # Calculate design actions
        design_actions = self._calculate_design_actions(
            validated_inputs, self_weight
        )

        # Calculate resistances
        bending_resistance = self._check_bending_resistance(
            design_actions, section_props, material_props, validated_inputs
        )

        shear_resistance = self._check_shear_resistance(
            design_actions, section_props, material_props, validated_inputs
        )

        shear_buckling_resistance = self._check_shear_buckling_resistance(
            design_actions, section_props, material_props, validated_inputs
        )

        lateral_torsional_buckling = self._check_lateral_torsional_buckling(
            design_actions, section_props, material_props, validated_inputs
        )

        deflection_check = self._check_deflection(
            validated_inputs, design_actions, section_props, material_props
        )

        interaction_check = self._check_interaction(
            bending_resistance, shear_resistance
        )

        # Overall assessment
        checks = [
            bending_resistance,
            shear_resistance,
            shear_buckling_resistance,
            lateral_torsional_buckling,
            deflection_check
        ]

        overall_check = all(check.get("status") == "PASS" for check in checks if isinstance(check, dict))

        # Generate recommendations
        recommendations = self._generate_recommendations(
            checks, validated_inputs, section_props, material_props
        )

        # Generate warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            checks, validated_inputs, section_props, material_props
        )

        # Build results
        results = {
            "section_properties": section_props,
            "material_properties": material_props,
            "design_actions": design_actions,
            "bending_resistance": bending_resistance,
            "shear_resistance": shear_resistance,
            "shear_buckling_resistance": shear_buckling_resistance,
            "lateral_torsional_buckling": lateral_torsional_buckling,
            "deflection_check": deflection_check,
            "interaction_check": interaction_check,
            "utilisation_summary": {
                "bending": bending_resistance.get("utilization", 0),
                "shear": shear_resistance.get("utilization", 0),
                "shear_buckling": shear_buckling_resistance.get("utilization", 0),
                "ltb": lateral_torsional_buckling.get("utilization", 0),
                "deflection": deflection_check.get("utilization", 0)
            },
            "overall_check": overall_check,
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _calculate_section_properties(self, inputs: SteelPlateGirderInputs) -> Dict[str, float]:
        """Calculate section properties for plate girder"""
        
        # Convert mm to cm for calculations
        hw = inputs.web_depth_mm / 10  # Web height in cm
        tw = inputs.web_thickness_mm / 10  # Web thickness in cm
        bf = inputs.flange_width_mm / 10  # Flange width in cm
        tf = inputs.flange_thickness_mm / 10  # Flange thickness in cm
        
        # Areas
        Aw = hw * tw  # Web area
        Af = bf * tf  # Flange area (per flange)
        A = Aw + 2 * Af  # Total area
        
        # Moments of inertia (about major axis)
        # Web contribution
        Iw = (tw * (hw ** 3)) / 12
        # Flange contribution (using parallel axis theorem)
        If = 2 * ((bf * (tf ** 3)) / 12 + Af * ((hw / 2 + tf / 2) ** 2))
        Iy = Iw + If  # Total moment of inertia
        
        # Elastic section moduli
        ymax = hw / 2 + tf  # Distance to extreme fiber
        Wy = Iy / ymax  # Elastic section modulus
        
        # Plastic section modulus (approximate)
        Wpl_y = 2 * Af * (hw / 2 + tf / 2)  # Plastic modulus assuming elastic neutral axis at mid-height
        
        # Shear area (EN 1993-1-1, 6.2.6(3))
        Av = Aw  # For rolled I-sections, typically web area
        
        return {
            "A": round(A, 2),
            "Aw": round(Aw, 2),
            "Af": round(Af, 2),
            "Iy": round(Iy, 2),
            "Wy": round(Wy, 2),
            "Wpl_y": round(Wpl_y, 2),
            "Av": round(Av, 2),
            "hw": round(hw, 2),
            "tw": round(tw, 2),
            "bf": round(bf, 2),
            "tf": round(tf, 2)
        }

    def _calculate_self_weight(self, section_props: Dict[str, float]) -> float:
        """Calculate self-weight of beam (kN/m)"""
        # Steel density = 7850 kg/m³
        # Area in cm², convert to m²: / 10000
        # Convert to kN/m: * 7850 * 9.81 / 1000
        return (section_props["A"] / 10000) * 7850 * 9.81 / 1000

    def _calculate_design_actions(self, inputs: SteelPlateGirderInputs,
                                self_weight: float) -> Dict[str, float]:
        """Calculate design bending moments and shear forces"""

        L = inputs.span_m * 1000  # mm
        w_DL_total = inputs.dead_load_kN_per_m + self_weight
        w_LL = inputs.live_load_kN_per_m
        P_DL = inputs.point_load_dead_kN
        P_LL = inputs.point_load_live_kN

        # SLS combinations
        w_SLS = w_DL_total + w_LL
        P_SLS = P_DL + P_LL

        # Maximum moments and shears based on load position
        if inputs.load_position == "midspan":
            # Simply supported beam with central point load
            M_SLS_q = (w_SLS * L * L) / 8 / 1e6  # kN·m
            M_SLS_P = (P_SLS * L) / 4 / 1e6  # kN·m
            M_Ed_SLS = M_SLS_q + M_SLS_P

            V_SLS = (w_SLS * L) / 2 / 1000 + P_SLS / 2  # kN
            
        elif inputs.load_position == "third_points":
            # Simply supported beam with two point loads at third points
            M_SLS_q = (w_SLS * L * L) / 8 / 1e6  # kN·m
            M_SLS_P = (P_SLS * L) / 9 / 1e6 * 2  # kN·m (maximum at third points)
            M_Ed_SLS = M_SLS_q + M_SLS_P

            V_SLS = (w_SLS * L) / 2 / 1000 + P_SLS * 2/3  # kN (maximum at supports)
            
        else:  # quarter_points
            # Simply supported beam with two point loads at quarter points
            M_SLS_q = (w_SLS * L * L) / 8 / 1e6  # kN·m
            M_SLS_P = (P_SLS * L) / 8 / 1e6 * 3  # kN·m (maximum at quarter points)
            M_Ed_SLS = M_SLS_q + M_SLS_P

            V_SLS = (w_SLS * L) / 2 / 1000 + P_SLS * 3/4  # kN (maximum at supports)

        # ULS combinations (EN 1990)
        gamma_G = 1.35
        gamma_Q = 1.5

        w_ULS = gamma_G * w_DL_total + gamma_Q * w_LL
        P_ULS = gamma_G * P_DL + gamma_Q * P_LL

        if inputs.load_position == "midspan":
            M_ULS_q = (w_ULS * L * L) / 8 / 1e6  # kN·m
            M_ULS_P = (P_ULS * L) / 4 / 1e6  # kN·m
            M_Ed_ULS = M_ULS_q + M_ULS_P

            V_ULS = (w_ULS * L) / 2 / 1000 + P_ULS / 2  # kN
            
        elif inputs.load_position == "third_points":
            M_ULS_q = (w_ULS * L * L) / 8 / 1e6  # kN·m
            M_ULS_P = (P_ULS * L) / 9 / 1e6 * 2  # kN·m
            M_Ed_ULS = M_ULS_q + M_ULS_P

            V_ULS = (w_ULS * L) / 2 / 1000 + P_ULS * 2/3  # kN
            
        else:  # quarter_points
            M_ULS_q = (w_ULS * L * L) / 8 / 1e6  # kN·m
            M_ULS_P = (P_ULS * L) / 8 / 1e6 * 3  # kN·m
            M_Ed_ULS = M_ULS_q + M_ULS_P

            V_ULS = (w_ULS * L) / 2 / 1000 + P_ULS * 3/4  # kN

        return {
            "M_Ed_SLS": round(M_Ed_SLS, 2),
            "M_Ed_ULS": round(M_Ed_ULS, 2),
            "V_Ed_SLS": round(V_SLS, 2),
            "V_Ed_ULS": round(V_ULS, 2)
        }

    def _check_bending_resistance(self, design_actions: Dict[str, float],
                                section_props: Dict[str, float],
                                material_props: Dict[str, float],
                                inputs: SteelPlateGirderInputs) -> Dict[str, Any]:
        """Check bending resistance (EN 1993-1-1, 6.2.5)"""
        
        M_Ed = design_actions["M_Ed_ULS"]
        W_pl = section_props["Wpl_y"] * 1000  # Convert cm³ to mm³
        f_y = material_props["f_y"]
        
        # Plastic moment resistance
        M_pl_Rd = (W_pl * f_y) / inputs.gamma_m0 / 1e6  # kN·m
        
        utilization = M_Ed / M_pl_Rd if M_pl_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "M_pl_Rd": round(M_pl_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_shear_resistance(self, design_actions: Dict[str, float],
                              section_props: Dict[str, float],
                              material_props: Dict[str, float],
                              inputs: SteelPlateGirderInputs) -> Dict[str, Any]:
        """Check shear resistance (EN 1993-1-1, 6.2.6)"""
        
        V_Ed = design_actions["V_Ed_ULS"]
        A_v = section_props["Av"] * 100  # Convert cm² to mm²
        f_y = material_props["f_y"]
        
        # Plastic shear resistance
        V_pl_Rd = (A_v * (f_y / math.sqrt(3))) / inputs.gamma_m0 / 1000  # kN
        
        utilization = V_Ed / V_pl_Rd if V_pl_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "V_pl_Rd": round(V_pl_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_shear_buckling_resistance(self, design_actions: Dict[str, float],
                                       section_props: Dict[str, float],
                                       material_props: Dict[str, float],
                                       inputs: SteelPlateGirderInputs) -> Dict[str, Any]:
        """Check shear buckling resistance (EN 1993-1-5, 6.1)"""
        
        V_Ed = design_actions["V_Ed_ULS"]
        hw = section_props["hw"] * 10  # Convert cm to mm
        tw = section_props["tw"] * 10  # Convert cm to mm
        f_yw = material_props["f_y"]
        
        # Web slenderness ratio
        hw_tw = hw / tw
        
        # Limit for shear buckling (EN 1993-1-5, 6.1.2)
        hw_tw_limit = 72 * math.sqrt(material_props["E"] / f_yw)
        
        # If web is stocky enough, no shear buckling check needed
        if hw_tw <= hw_tw_limit / 2:
            # No shear buckling check required
            V_b_Rd = self._check_shear_resistance(design_actions, section_props, material_props, inputs)["V_pl_Rd"]
            utilization = V_Ed / V_b_Rd if V_b_Rd > 0 else float('inf')
            status = "PASS" if utilization <= 1.0 else "FAIL"
            
            return {
                "hw_tw_ratio": round(hw_tw, 2),
                "hw_tw_limit": round(hw_tw_limit, 2),
                "V_b_Rd": round(V_b_Rd, 2),
                "utilization": round(utilization, 3),
                "status": status,
                "note": "Web is stocky, no shear buckling check required"
            }
        
        # Shear buckling resistance calculation (EN 1993-1-5, 6.3)
        tau_cr = 0.9 * (material_props["E"] / (12 * (1 - 0.3**2))) * (tw / hw)**2  # Critical shear stress
        V_cr = tau_cr * hw * tw / 1000  # Critical shear force in kN
        
        # Shear buckling reduction factor (EN 1993-1-5, 6.3.2)
        lambda_w = math.sqrt((f_yw / math.sqrt(3)) / tau_cr)
        chi_w = 1.0  # Simplified - would normally depend on lambda_w and boundary conditions
        
        if inputs.use_stiffeners:
            # With stiffeners, higher resistance
            V_bw_Rd = chi_w * hw * tw * (f_yw / math.sqrt(3)) / inputs.gamma_m0 / 1000
        else:
            # Without stiffeners, reduced resistance
            V_bw_Rd = 0.5 * chi_w * hw * tw * (f_yw / math.sqrt(3)) / inputs.gamma_m0 / 1000
            
        utilization = V_Ed / V_bw_Rd if V_bw_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "hw_tw_ratio": round(hw_tw, 2),
            "hw_tw_limit": round(hw_tw_limit, 2),
            "V_bw_Rd": round(V_bw_Rd, 2),
            "tau_cr": round(tau_cr, 2),
            "lambda_w": round(lambda_w, 2),
            "chi_w": round(chi_w, 2),
            "utilization": round(utilization, 3),
            "status": status,
            "requires_stiffeners": hw_tw > hw_tw_limit and not inputs.use_stiffeners
        }

    def _check_lateral_torsional_buckling(self, design_actions: Dict[str, float],
                                        section_props: Dict[str, float],
                                        material_props: Dict[str, float],
                                        inputs: SteelPlateGirderInputs) -> Dict[str, Any]:
        """Check lateral torsional buckling (EN 1993-1-1, 6.3)"""
        
        M_Ed = design_actions["M_Ed_ULS"]
        L_cr = inputs.lateral_restraint_spacing_m  # Critical length
        W_pl = section_props["Wpl_y"] * 1000  # Convert cm³ to mm³
        f_y = material_props["f_y"]
        
        # Simplified LTB calculation
        # For plate girders, LTB depends on many factors including loading, support conditions, etc.
        # This is a simplified approach - in practice would use more detailed methods
        
        # Non-dimensional slenderness (simplified)
        lambda_LT = L_cr / (math.sqrt(material_props["E"] * section_props["Iy"] * 10000 / (f_y * W_pl)))
        
        # Reduction factor (simplified - would normally use appropriate buckling curve)
        chi_LT = 1.0 / (0.5 * (1 + 0.2 * lambda_LT + lambda_LT**2))  # Simplified
        chi_LT = min(chi_LT, 1.0)
        
        # LTB moment resistance
        M_b_Rd = chi_LT * (W_pl * f_y) / inputs.gamma_m1 / 1e6  # kN·m
        
        utilization = M_Ed / M_b_Rd if M_b_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "L_cr": round(L_cr, 2),
            "lambda_LT": round(lambda_LT, 2),
            "chi_LT": round(chi_LT, 3),
            "M_b_Rd": round(M_b_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_deflection(self, inputs: SteelPlateGirderInputs,
                         design_actions: Dict[str, float],
                         section_props: Dict[str, float],
                         material_props: Dict[str, float]) -> Dict[str, Any]:
        """Check deflection (SLS)"""
        
        L = inputs.span_m * 1000  # mm
        M_SLS = design_actions["M_Ed_SLS"] * 1e6  # N·mm
        I = section_props["Iy"] * 10000  # Convert cm⁴ to mm⁴
        E = material_props["E"]
        
        # Simplified deflection calculation for uniformly distributed load
        # δ = 5wL⁴/(384EI) for simply supported beam with UDL
        w_SLS = design_actions["V_Ed_SLS"] * 2000 / L  # Approximate UDL from shear
        delta_UDL = (5 * w_SLS * (L ** 4)) / (384 * E * I)
        
        # Deflection from point load (approximate)
        delta_point = (design_actions["M_Ed_SLS"] * 1e6 * (L ** 2)) / (8 * E * I)
        
        # Total deflection
        delta = delta_UDL + delta_point
        delta_limit = L / 300  # Typical limit for beams
        
        utilization = delta / delta_limit if delta_limit > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "delta_actual": round(delta, 2),
            "delta_limit": round(delta_limit, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_interaction(self, bending_check: Dict[str, Any],
                          shear_check: Dict[str, Any]) -> Dict[str, Any]:
        """Check interaction between bending and shear (EN 1993-1-1, 6.2.8)"""
        
        util_bending = bending_check.get("utilization", 0)
        util_shear = shear_check.get("utilization", 0)
        
        # Simple interaction check - if shear utilization > 0.5, reduce bending resistance
        if util_shear > 0.5:
            # Reduced bending resistance due to high shear
            interaction_factor = 1.0 - 0.5 * (util_shear - 0.5)  # Simplified
            adjusted_util_bending = util_bending / interaction_factor
        else:
            adjusted_util_bending = util_bending
            
        max_util = max(adjusted_util_bending, util_shear)
        status = "PASS" if max_util <= 1.0 else "FAIL"
        
        return {
            "utilization": round(max_util, 3),
            "status": status,
            "bending_util_adj": round(adjusted_util_bending, 3),
            "shear_util": round(util_shear, 3)
        }

    def _generate_recommendations(self, checks: list, inputs: SteelPlateGirderInputs,
                                section_props: Dict[str, float], material_props: Dict[str, float]) -> list:
        """Generate design recommendations based on failed checks"""
        
        recommendations = []
        
        # Check for high utilizations
        for check in checks:
            if isinstance(check, dict) and check.get("utilization", 0) > 0.8:
                if "bending" in str(check):
                    recommendations.append("Consider increasing flange dimensions or using higher strength steel")
                elif "shear" in str(check):
                    recommendations.append("Consider increasing web thickness or adding stiffeners")
                elif "ltb" in str(check):
                    recommendations.append("Consider reducing lateral restraint spacing or increasing flange width")
                elif "deflection" in str(check):
                    recommendations.append("Consider increasing section depth or adding intermediate supports")
        
        # Specific recommendations based on web slenderness
        hw_tw = section_props["hw"] * 10 / (section_props["tw"] * 10)  # hw/tw ratio
        hw_tw_limit = 72 * math.sqrt(material_props["E"] / material_props["f_y"])
        
        if hw_tw > hw_tw_limit:
            if not inputs.use_stiffeners:
                recommendations.append("Web is slender - consider adding intermediate stiffeners")
            else:
                recommendations.append("Consider increasing web thickness or reducing stiffener spacing")
                
        return recommendations

    def _generate_warnings_and_notes(self, checks: list, inputs: SteelPlateGirderInputs,
                                   section_props: Dict[str, float], material_props: Dict[str, float]) -> tuple:
        """Generate warnings and notes"""
        
        warnings = []
        notes = []
        
        # Check high utilizations
        for check in checks:
            if isinstance(check, dict) and check.get("utilization", 0) > 0.8:
                check_type = "bending" if "bending" in str(check) else \
                           "shear" if "shear" in str(check) else "other"
                warnings.append(f"High {check_type} utilization (>80%)")
        
        # Notes about assumptions
        notes.append("Calculations based on EN 1993-1-1 and EN 1993-1-5")
        notes.append("Lateral torsional buckling calculation is simplified")
        notes.append("Shear buckling resistance assumes appropriate stiffener design")
        notes.append("Deflection calculation is approximate")
        
        # Web slenderness note
        hw_tw = section_props["hw"] * 10 / (section_props["tw"] * 10)
        hw_tw_limit = 72 * math.sqrt(material_props["E"] / material_props["f_y"])
        notes.append(f"Web slenderness ratio: {round(hw_tw, 1)}, limit: {round(hw_tw_limit, 1)}")
        
        return warnings, notes


# Create calculator instance
calculator = SteelPlateGirderCalculator()