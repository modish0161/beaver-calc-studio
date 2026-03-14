"""
Composite beam design calculator implementation
"""
import math
from typing import Dict, Any, Optional

from ..base import CalculatorPlugin
from .schema import CompositeBeamDesignInputs, CompositeBeamDesignOutputs


# Steel section properties database (simplified)
STEEL_SECTIONS = {
    "UKB 610x229x101": {
        "h": 603.0, "b": 228.0, "t_w": 8.8, "t_f": 14.1,
        "A": 129.0, "I_y": 40100.0, "W_el_y": 2720.0, "W_pl_y": 3140.0,
        "r_y": 17.6, "Z_y": 3340.0
    },
    "UKB 457x191x67": {
        "h": 449.0, "b": 189.0, "t_w": 8.5, "t_f": 10.9,
        "A": 85.3, "I_y": 13700.0, "W_el_y": 1160.0, "W_pl_y": 1330.0,
        "r_y": 12.7, "Z_y": 1410.0
    },
    "UKB 305x165x40": {
        "h": 298.0, "b": 165.0, "t_w": 5.9, "t_f": 8.8,
        "A": 51.0, "I_y": 2310.0, "W_el_y": 403.0, "W_pl_y": 455.0,
        "r_y": 6.7, "Z_y": 483.0
    }
}

# Material properties
STEEL_PROPERTIES = {
    "S235": {"f_y": 235, "f_u": 360, "E": 210000, "G": 81000},
    "S275": {"f_y": 275, "f_u": 410, "E": 210000, "G": 81000},
    "S355": {"f_y": 355, "f_u": 470, "E": 210000, "G": 81000},
    "S420": {"f_y": 420, "f_u": 500, "E": 210000, "G": 81000},
    "S460": {"f_y": 460, "f_u": 540, "E": 210000, "G": 81000}
}

CONCRETE_PROPERTIES = {
    "C20/25": {"f_ck": 20, "f_cd": 13.3, "E_cm": 30000, "gamma_c": 1.5},
    "C25/30": {"f_ck": 25, "f_cd": 16.7, "E_cm": 31000, "gamma_c": 1.5},
    "C30/37": {"f_ck": 30, "f_cd": 20.0, "E_cm": 33000, "gamma_c": 1.5},
    "C35/45": {"f_ck": 35, "f_cd": 23.3, "E_cm": 34000, "gamma_c": 1.5},
    "C40/50": {"f_ck": 40, "f_cd": 26.7, "E_cm": 35000, "gamma_c": 1.5}
}


class CompositeBeamDesignCalculator(CalculatorPlugin):
    """Composite beam design calculator (EN 1994-1-1)"""

    key = "composite_beam_design_v1"
    name = "Composite Beam Design Check"
    version = "1.0.0"
    description = "Ultimate and serviceability limit state checks for composite steel-concrete beams"
    category = "structural"
    input_schema = CompositeBeamDesignInputs
    output_schema = CompositeBeamDesignOutputs
    reference_text = "EN 1994-1-1:2004 - Design of composite steel and concrete structures"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform composite beam design calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Get material properties
        steel_props = STEEL_PROPERTIES[validated_inputs.steel_grade]
        concrete_props = CONCRETE_PROPERTIES[validated_inputs.concrete_grade]

        # Get steel section properties
        steel_section = self._get_steel_section_properties(validated_inputs.steel_section)
        if not steel_section:
            raise ValueError(f"Steel section '{validated_inputs.steel_section}' not found")

        # Calculate self-weight
        self_weight = self._calculate_self_weight(steel_section, validated_inputs)

        # Calculate design actions
        design_actions = self._calculate_design_actions(
            validated_inputs, self_weight
        )

        # Calculate composite section properties
        composite_props = self._calculate_composite_section_properties(
            steel_section, validated_inputs, concrete_props
        )

        # Calculate shear connection capacity
        shear_connection = self._calculate_shear_connection_capacity(
            validated_inputs, concrete_props
        )

        # Perform design checks
        bending_check = self._check_bending_resistance(
            design_actions, composite_props, steel_props, validated_inputs
        )

        shear_check = self._check_shear_resistance(
            design_actions, steel_section, steel_props, validated_inputs
        )

        shear_conn_check = self._check_shear_connection(
            design_actions, shear_connection, validated_inputs
        )

        deflection_check = self._check_deflection(
            validated_inputs, design_actions, composite_props, steel_props
        )

        ltb_check = None
        if validated_inputs.lateral_restraint == "unrestrained":
            ltb_check = self._check_lateral_torsional_buckling(
                design_actions, steel_section, validated_inputs, steel_props
            )

        # Overall assessment
        checks = [bending_check, shear_check, shear_conn_check, deflection_check]
        if ltb_check:
            checks.append(ltb_check)

        overall_check = all(check["status"] == "PASS" for check in checks)

        # Generate recommendations
        recommendations = self._generate_recommendations(checks, validated_inputs)

        # Build warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            checks, validated_inputs, shear_connection
        )

        # Build results
        results = {
            "steel_section_properties": steel_section,
            "concrete_fck": concrete_props["f_ck"],
            "concrete_fcd": concrete_props["f_cd"],
            "composite_section_properties": composite_props,
            "shear_connection_capacity": shear_connection,
            "design_actions": design_actions,
            "bending_resistance_check": bending_check,
            "shear_resistance_check": shear_check,
            "shear_connection_check": shear_conn_check,
            "deflection_check": deflection_check,
            "lateral_torsional_buckling_check": ltb_check,
            "utilisation_summary": {
                "bending": bending_check["utilization"],
                "shear": shear_check["utilization"],
                "shear_connection": shear_conn_check["utilization"],
                "deflection": deflection_check["utilization"]
            },
            "overall_check": overall_check,
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _get_steel_section_properties(self, section_name: str) -> Optional[Dict[str, float]]:
        """Get steel section properties"""
        return STEEL_SECTIONS.get(section_name)

    def _calculate_self_weight(self, steel_section: Dict[str, float],
                             inputs: CompositeBeamDesignInputs) -> float:
        """Calculate self-weight of composite beam (kN/m)"""
        # Steel weight
        steel_weight = steel_section["A"] * 7850 / 1e6  # kN/m

        # Concrete weight (assumed density 2500 kg/m³)
        concrete_weight = (inputs.slab_width_mm * inputs.slab_thickness_mm * 2500) / 1e6  # kN/m

        return steel_weight + concrete_weight

    def _calculate_design_actions(self, inputs: CompositeBeamDesignInputs,
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

        M_SLS_q = (w_SLS * L * L) / 8 / 1e6  # kN·m
        M_SLS_P = (P_SLS * L) / 4 / 1e6  # kN·m
        M_Ed_SLS = M_SLS_q + M_SLS_P

        V_SLS = (w_SLS * L) / 2 / 1000  # kN

        # ULS combinations (EN 1990)
        gamma_G = 1.35
        gamma_Q = 1.5

        w_ULS = gamma_G * w_DL_total + gamma_Q * w_LL
        P_ULS = gamma_G * P_DL + gamma_Q * P_LL

        M_ULS_q = (w_ULS * L * L) / 8 / 1e6  # kN·m
        M_ULS_P = (P_ULS * L) / 4 / 1e6  # kN·m
        M_Ed_ULS = M_ULS_q + M_ULS_P

        V_ULS = (w_ULS * L) / 2 / 1000  # kN

        return {
            "M_Ed_SLS": round(M_Ed_SLS, 2),
            "M_Ed_ULS": round(M_Ed_ULS, 2),
            "V_Ed_SLS": round(V_SLS, 2),
            "V_Ed_ULS": round(V_ULS, 2)
        }

    def _calculate_composite_section_properties(self, steel_section: Dict[str, float],
                                              inputs: CompositeBeamDesignInputs,
                                              concrete_props: Dict[str, float]) -> Dict[str, float]:
        """Calculate composite section properties"""

        # Get steel properties
        steel_props = STEEL_PROPERTIES[inputs.steel_grade]

        # Steel section properties
        A_a = steel_section["A"]  # cm²
        I_a = steel_section["I_y"]  # cm⁴
        h = steel_section["h"]  # mm

        # Concrete slab properties
        b_eff = inputs.slab_width_mm  # mm
        h_c = inputs.slab_thickness_mm  # mm
        A_c = (b_eff * h_c) / 100  # cm²

        # Modular ratio
        n = steel_props["E"] / concrete_props["E_cm"]
        A_c_eff = A_c / n  # Effective concrete area

        # Distance from steel centroid to concrete centroid
        y_a = h / 2  # Assume steel centroid at mid-height
        y_c = h + h_c / 2  # Concrete centroid from steel bottom

        # Composite section properties
        A_comp = A_a + A_c_eff
        y_bar = (A_a * y_a + A_c_eff * y_c) / A_comp

        # Second moment of area (simplified - ignoring concrete I)
        I_c_eff = 0  # Simplified - concrete I is small
        I_comp = I_a + A_a * (y_bar - y_a)**2 + A_c_eff * (y_c - y_bar)**2 + I_c_eff

        # Plastic section modulus (simplified)
        W_pl_comp = I_comp / max(y_bar, h + h_c - y_bar) * 100  # cm³

        return {
            "A_comp": round(A_comp, 2),
            "I_comp": round(I_comp, 2),
            "W_pl_comp": round(W_pl_comp, 2),
            "y_bar": round(y_bar, 2),
            "modular_ratio": round(n, 2)
        }

    def _calculate_shear_connection_capacity(self, inputs: CompositeBeamDesignInputs,
                                           concrete_props: Dict[str, float]) -> Dict[str, float]:
        """Calculate shear connection capacity per connector"""

        d = inputs.shear_connector_diameter_mm
        h_sc = inputs.shear_connector_height_mm
        f_ck = concrete_props["f_ck"]
        f_u = STEEL_PROPERTIES[inputs.steel_grade]["f_u"]

        # Stud connector capacity (EN 1994-1-1, 6.6.3.1)
        P_Rd = min(
            0.29 * d**2 * math.sqrt(f_ck) * 1e-3,  # Concrete breakout
            0.8 * f_u * math.pi * d**2 / 4 * 1e-3   # Steel failure
        )

        # Design capacity with partial safety factor
        P_Rd_design = P_Rd / inputs.gamma_v

        # Total capacity per beam
        n_connectors = inputs.connectors_per_row * inputs.connector_rows
        V_Rd_total = P_Rd_design * n_connectors

        return {
            "P_Rd_per_connector": round(P_Rd_design, 2),
            "n_connectors": n_connectors,
            "V_Rd_total": round(V_Rd_total, 2)
        }

    def _check_bending_resistance(self, design_actions: Dict[str, float],
                                composite_props: Dict[str, float],
                                steel_props: Dict[str, float],
                                inputs: CompositeBeamDesignInputs) -> Dict[str, Any]:
        """Check bending resistance"""

        M_Ed = design_actions["M_Ed_ULS"]
        W_pl = composite_props["W_pl_comp"] / 100  # Convert cm³ to mm³
        f_y = steel_props["f_y"]

        M_pl_Rd = (W_pl * f_y) / inputs.gamma_m0 / 1e6  # kN·m

        utilization = M_Ed / M_pl_Rd if M_pl_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "M_pl_Rd": round(M_pl_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_shear_resistance(self, design_actions: Dict[str, float],
                              steel_section: Dict[str, float],
                              steel_props: Dict[str, float],
                              inputs: CompositeBeamDesignInputs) -> Dict[str, Any]:
        """Check shear resistance per EN 1993-1-1 §6.2.6"""

        V_Ed = design_actions["V_Ed_ULS"]
        # Shear area for I/H sections: A_v = A - 2*b*t_f + (t_w + 2*r)*t_f ≈ h_w*t_w
        h = steel_section["h"]  # mm
        t_f = steel_section["t_f"]  # mm
        t_w = steel_section["t_w"]  # mm
        h_w = h - 2 * t_f  # web height in mm
        A_v = h_w * t_w  # mm² — conservative shear area
        f_y = steel_props["f_y"]

        V_pl_Rd = (A_v * f_y / math.sqrt(3)) / inputs.gamma_m0 / 1000  # kN

        utilization = V_Ed / V_pl_Rd if V_pl_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "V_pl_Rd": round(V_pl_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_shear_connection(self, design_actions: Dict[str, float],
                              shear_connection: Dict[str, float],
                              inputs: CompositeBeamDesignInputs) -> Dict[str, Any]:
        """Check shear connection capacity"""

        V_Ed = design_actions["V_Ed_ULS"]
        V_Rd = shear_connection["V_Rd_total"]

        utilization = V_Ed / V_Rd if V_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "V_Rd": round(V_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_deflection(self, inputs: CompositeBeamDesignInputs,
                        design_actions: Dict[str, float],
                        composite_props: Dict[str, float],
                        steel_props: Dict[str, float]) -> Dict[str, Any]:
        """Check deflection (SLS)"""

        L = inputs.span_m * 1000  # mm
        M_SLS = design_actions["M_Ed_SLS"] * 1e6  # N·mm
        I_comp = composite_props["I_comp"] * 1e4  # Convert cm⁴ to mm⁴
        E = steel_props["E"]

        # Simplified deflection calculation
        delta = (5 * M_SLS * L * L) / (48 * E * I_comp)
        delta_limit = L / 360  # Typical limit

        utilization = delta / delta_limit if delta_limit > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "delta_actual": round(delta, 2),
            "delta_limit": round(delta_limit, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_lateral_torsional_buckling(self, design_actions: Dict[str, float],
                                        steel_section: Dict[str, float],
                                        inputs: CompositeBeamDesignInputs,
                                        steel_props: Dict[str, float]) -> Dict[str, Any]:
        """Check lateral torsional buckling (simplified)"""

        M_Ed = design_actions["M_Ed_ULS"]
        L_cr = inputs.span_m  # Assume full span
        W_pl = steel_section["W_pl_y"] / 1000  # Convert cm³ to m³
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

    def _generate_recommendations(self, checks: list, inputs: CompositeBeamDesignInputs) -> list:
        """Generate design recommendations based on failed checks"""

        recommendations = []

        bending_check = next((c for c in checks if "bending" in str(c)), None)
        if bending_check and bending_check["status"] == "FAIL":
            recommendations.append("Increase steel section size or reduce span length")
            recommendations.append("Consider using higher strength steel grade")

        shear_check = next((c for c in checks if "shear" in str(c)), None)
        if shear_check and shear_check["status"] == "FAIL":
            recommendations.append("Increase web thickness or use thicker flanges")
            recommendations.append("Add intermediate supports to reduce shear forces")

        shear_conn_check = next((c for c in checks if "shear_connection" in str(c)), None)
        if shear_conn_check and shear_conn_check["status"] == "FAIL":
            recommendations.append("Increase number of shear connectors")
            recommendations.append("Use larger diameter shear studs")
            recommendations.append("Reduce connector spacing")

        deflection_check = next((c for c in checks if "deflection" in str(c)), None)
        if deflection_check and deflection_check["status"] == "FAIL":
            recommendations.append("Increase composite section depth")
            recommendations.append("Add intermediate supports")

        return recommendations

    def _generate_warnings_and_notes(self, checks: list, inputs: CompositeBeamDesignInputs,
                                   shear_connection: Dict[str, float]) -> tuple:
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
        notes.append("Calculations based on EN 1994-1-1")
        notes.append("Composite action assumed throughout span")
        notes.append("Shear connection designed for full interaction")
        notes.append(f"Total shear connectors: {shear_connection.get('n_connectors', 0)}")

        return warnings, notes


# Create calculator instance
calculator = CompositeBeamDesignCalculator()
