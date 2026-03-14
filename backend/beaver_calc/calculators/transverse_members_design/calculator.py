"""
Transverse members design calculator implementation
"""
import math
from typing import Dict, Any, Optional

from ..base import CalculatorPlugin
from .schema import TransverseMembersDesignInputs, TransverseMembersDesignOutputs


# Material properties
STEEL_PROPERTIES = {
    "S235": {"f_y": 235, "f_u": 360, "E": 210000, "G": 81000},
    "S275": {"f_y": 275, "f_u": 410, "E": 210000, "G": 81000},
    "S355": {"f_y": 355, "f_u": 470, "E": 210000, "G": 81000},
    "S420": {"f_y": 420, "f_u": 500, "E": 210000, "G": 81000},
    "S460": {"f_y": 460, "f_u": 540, "E": 210000, "G": 81000}
}


class TransverseMembersDesignCalculator(CalculatorPlugin):
    """Transverse members design calculator (EN 1993-1-1)"""

    key = "transverse_members_design_v1"
    name = "Transverse Members Design"
    version = "1.0.0"
    description = "Bridge transverse beam and diaphragm design with load distribution analysis"
    category = "structures"
    input_schema = TransverseMembersDesignInputs
    output_schema = TransverseMembersDesignOutputs
    reference_text = "EN 1993-1-1:2005 - Design of steel structures"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform transverse members design calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Get material properties
        steel_props = STEEL_PROPERTIES[validated_inputs.steel_grade]

        # Calculate member properties
        member_props = self._calculate_member_properties(validated_inputs)

        # Calculate load distribution from deck
        load_distribution = self._calculate_load_distribution(validated_inputs)

        # Calculate design actions
        design_actions = self._calculate_design_actions(
            validated_inputs, load_distribution, member_props
        )

        # Perform design checks
        bending_check = self._check_bending_resistance(
            design_actions, member_props, steel_props, validated_inputs
        )

        shear_check = self._check_shear_resistance(
            design_actions, member_props, steel_props, validated_inputs
        )

        web_bearing_check = self._check_web_bearing(
            design_actions, member_props, steel_props, validated_inputs
        )

        deflection_check = self._check_deflection(
            validated_inputs, design_actions, member_props, steel_props
        )

        buckling_check = None
        if validated_inputs.end_conditions == "pinned":
            buckling_check = self._check_buckling(
                design_actions, validated_inputs, member_props, steel_props
            )

        # Connection design
        connection_design = self._design_connections(
            design_actions, validated_inputs, member_props
        )

        # Overall assessment
        checks = [bending_check, shear_check, web_bearing_check, deflection_check]
        if buckling_check:
            checks.append(buckling_check)

        overall_check = all(check["status"] == "PASS" for check in checks)

        # Generate recommendations
        recommendations = self._generate_recommendations(checks, validated_inputs)

        # Build warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            checks, validated_inputs
        )

        # Build results
        results = {
            "member_properties": member_props,
            "load_distribution": load_distribution,
            "design_actions": design_actions,
            "bending_resistance_check": bending_check,
            "shear_resistance_check": shear_check,
            "web_bearing_check": web_bearing_check,
            "deflection_check": deflection_check,
            "buckling_check": buckling_check,
            "connection_design": connection_design,
            "utilisation_summary": {
                "bending": bending_check["utilization"],
                "shear": shear_check["utilization"],
                "web_bearing": web_bearing_check["utilization"],
                "deflection": deflection_check["utilization"]
            },
            "overall_check": overall_check,
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _calculate_member_properties(self, inputs: TransverseMembersDesignInputs) -> Dict[str, float]:
        """Calculate geometric properties of transverse member"""

        # Simplified I-section properties
        h = inputs.depth_mm
        b_top = inputs.width_top_mm
        b_bottom = inputs.width_bottom_mm
        t_w = inputs.web_thickness_mm

        # Assume constant flange thickness (simplified)
        t_f = (b_top + b_bottom) / 4  # Approximate

        # Cross-sectional area
        A = b_top * t_f + b_bottom * t_f + (h - 2 * t_f) * t_w

        # Second moment of area (simplified)
        I_y = (b_top * (h**3) / 12) - ((b_top - t_w) * ((h - 2 * t_f)**3) / 12)

        # Plastic section modulus
        W_pl = I_y / (h / 2)

        # Shear area
        A_v = h * t_w

        return {
            "A": round(A, 2),
            "I_y": round(I_y, 2),
            "W_pl": round(W_pl, 2),
            "A_v": round(A_v, 2),
            "h": h,
            "b_top": b_top,
            "b_bottom": b_bottom,
            "t_w": t_w,
            "t_f": round(t_f, 2)
        }

    def _calculate_load_distribution(self, inputs: TransverseMembersDesignInputs) -> Dict[str, float]:
        """Calculate load distribution from bridge deck to transverse member"""

        # Tributary width for transverse member
        tributary_width = inputs.main_girder_spacing_m

        # Load per unit length on transverse member
        w_DL_per_m = inputs.dead_load_kN_per_m * tributary_width
        w_LL_per_m = inputs.live_load_kN_per_m * tributary_width

        # Point loads (distributed to transverse member)
        P_DL = inputs.point_load_dead_kN / inputs.number_of_girders
        P_LL = inputs.point_load_live_kN / inputs.number_of_girders

        return {
            "tributary_width": round(tributary_width, 2),
            "w_DL_per_m": round(w_DL_per_m, 2),
            "w_LL_per_m": round(w_LL_per_m, 2),
            "P_DL_per_girder": round(P_DL, 2),
            "P_LL_per_girder": round(P_LL, 2),
            "total_DL": round(w_DL_per_m * inputs.span_m + P_DL * inputs.number_of_girders, 2),
            "total_LL": round(w_LL_per_m * inputs.span_m + P_LL * inputs.number_of_girders, 2)
        }

    def _calculate_design_actions(self, inputs: TransverseMembersDesignInputs,
                                load_dist: Dict[str, float], member_props: Dict[str, float]) -> Dict[str, float]:
        """Calculate design bending moments and shear forces"""

        L = inputs.span_m * 1000  # mm
        w_DL = load_dist["w_DL_per_m"] / 1000  # kN/mm
        w_LL = load_dist["w_LL_per_m"] / 1000  # kN/mm

        # Point loads at girder locations
        P_DL_total = load_dist["P_DL_per_girder"] * inputs.number_of_girders
        P_LL_total = load_dist["P_LL_per_girder"] * inputs.number_of_girders

        # ULS combinations (EN 1990)
        w_ULS = inputs.gamma_g * w_DL + inputs.gamma_q * w_LL
        P_ULS = inputs.gamma_g * P_DL_total + inputs.gamma_q * P_LL_total

        # Maximum bending moment (simply supported beam with UDL + point loads)
        M_ULS_udl = (w_ULS * L * L) / 8 / 1e6  # kN·m
        M_ULS_points = (P_ULS * L) / 4 / 1e6  # kN·m (approximate)
        M_Ed = M_ULS_udl + M_ULS_points

        # Maximum shear force
        V_Ed = (w_ULS * L) / 2 / 1000 + P_ULS / 2  # kN

        # Reactions at supports
        R_Ed = (w_ULS * L + P_ULS) / 2 / 1000  # kN per support

        return {
            "M_Ed": round(M_Ed, 2),
            "V_Ed": round(V_Ed, 2),
            "R_Ed": round(R_Ed, 2),
            "w_ULS": round(w_ULS * 1000, 2),  # kN/m
            "P_ULS_total": round(P_ULS, 2)
        }

    def _check_bending_resistance(self, design_actions: Dict[str, float],
                                member_props: Dict[str, float],
                                steel_props: Dict[str, float],
                                inputs: TransverseMembersDesignInputs) -> Dict[str, Any]:
        """Check bending resistance"""

        M_Ed = design_actions["M_Ed"]
        W_pl = member_props["W_pl"] / 1000  # Convert mm³ to m³
        f_y = steel_props["f_y"]

        M_pl_Rd = (W_pl * f_y) / inputs.gamma_m0 / 1000  # kN·m

        utilization = M_Ed / M_pl_Rd if M_pl_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "M_pl_Rd": round(M_pl_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_shear_resistance(self, design_actions: Dict[str, float],
                              member_props: Dict[str, float],
                              steel_props: Dict[str, float],
                              inputs: TransverseMembersDesignInputs) -> Dict[str, Any]:
        """Check shear resistance"""

        V_Ed = design_actions["V_Ed"]
        A_v = member_props["A_v"]  # mm²
        f_y = steel_props["f_y"]

        V_pl_Rd = (A_v * f_y / math.sqrt(3)) / inputs.gamma_m0 / 1000  # kN

        utilization = V_Ed / V_pl_Rd if V_pl_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "V_pl_Rd": round(V_pl_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_web_bearing(self, design_actions: Dict[str, float],
                         member_props: Dict[str, float],
                         steel_props: Dict[str, float],
                         inputs: TransverseMembersDesignInputs) -> Dict[str, Any]:
        """Check web bearing capacity"""

        R_Ed = design_actions["R_Ed"]  # kN per support
        t_w = member_props["t_w"]
        f_y = steel_props["f_y"]

        # Bearing length (assume 100mm)
        l_b = 100  # mm

        F_b_Rd = (l_b * t_w * f_y) / inputs.gamma_m0 / 1000  # kN

        utilization = R_Ed / F_b_Rd if F_b_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "F_b_Rd": round(F_b_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_deflection(self, inputs: TransverseMembersDesignInputs,
                        design_actions: Dict[str, float],
                        member_props: Dict[str, float],
                        steel_props: Dict[str, float]) -> Dict[str, Any]:
        """Check deflection (SLS)"""

        L = inputs.span_m * 1000  # mm
        w_SLS = design_actions["w_ULS"] / inputs.gamma_g  # Service load (kN/m)
        w_SLS_per_mm = w_SLS / 1000  # kN/mm

        I_y = member_props["I_y"] * 1e4  # Convert cm⁴ to mm⁴
        E = steel_props["E"]

        # Deflection calculation (simply supported beam with UDL)
        delta = (5 * w_SLS_per_mm * (L**4)) / (384 * E * I_y)

        # Deflection limit
        limit_map = {"L/300": 300, "L/400": 400, "L/500": 500}
        limit = L / limit_map[inputs.deflection_limit]

        utilization = delta / limit if limit > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "delta_actual": round(delta, 2),
            "delta_limit": round(limit, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_buckling(self, design_actions: Dict[str, float],
                      inputs: TransverseMembersDesignInputs,
                      member_props: Dict[str, float],
                      steel_props: Dict[str, float]) -> Dict[str, Any]:
        """Check lateral torsional buckling (simplified)"""

        M_Ed = design_actions["M_Ed"]
        L_cr = inputs.span_m  # Assume full span
        W_pl = member_props["W_pl"] / 1000  # Convert mm³ to m³
        f_y = steel_props["f_y"]

        # Simplified LTB resistance
        M_b_Rd = (W_pl * f_y) / inputs.gamma_m1  # kN·m

        utilization = M_Ed / M_b_Rd if M_b_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "M_b_Rd": round(M_b_Rd, 2),
            "L_cr": round(L_cr, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _design_connections(self, design_actions: Dict[str, float],
                          inputs: TransverseMembersDesignInputs,
                          member_props: Dict[str, float]) -> Dict[str, Any]:
        """Design connections to main girders"""

        R_Ed = design_actions["R_Ed"]  # kN per connection

        # Assume bolted connection
        # Required bolt capacity
        bolts_required = math.ceil(R_Ed / 50)  # Assume 50kN per bolt

        return {
            "connection_type": "Bolted",
            "reaction_per_connection": round(R_Ed, 2),
            "bolts_required": bolts_required,
            "bolt_grade": "8.8",
            "bolt_diameter": "M20",
            "weld_size": "6mm"  # Alternative
        }

    def _generate_recommendations(self, checks: list, inputs: TransverseMembersDesignInputs) -> list:
        """Generate design recommendations"""

        recommendations = []

        bending_check = next((c for c in checks if "bending" in str(c)), None)
        if bending_check and bending_check["status"] == "FAIL":
            recommendations.append("Increase member depth or use higher strength steel")
            recommendations.append("Add intermediate supports to reduce span")

        shear_check = next((c for c in checks if "shear" in str(c)), None)
        if shear_check and shear_check["status"] == "FAIL":
            recommendations.append("Increase web thickness")
            recommendations.append("Use steel plates to strengthen web")

        web_bearing_check = next((c for c in checks if "web_bearing" in str(c)), None)
        if web_bearing_check and web_bearing_check["status"] == "FAIL":
            recommendations.append("Increase bearing length or add stiffeners")
            recommendations.append("Use bearing plates to distribute load")

        deflection_check = next((c for c in checks if "deflection" in str(c)), None)
        if deflection_check and deflection_check["status"] == "FAIL":
            recommendations.append("Increase member depth significantly")
            recommendations.append("Add intermediate diaphragms")

        return recommendations

    def _generate_warnings_and_notes(self, checks: list, inputs: TransverseMembersDesignInputs) -> tuple:
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
        notes.append("Calculations based on EN 1993-1-1")
        notes.append(f"Member type: {inputs.member_type.replace('_', ' ')}")
        notes.append("Load distribution assumes uniform tributary width")
        notes.append("Connections designed for maximum reaction")

        return warnings, notes


# Create calculator instance
calculator = TransverseMembersDesignCalculator()
