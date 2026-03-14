"""
Bracing design calculator implementation
"""
import math
from typing import Dict, Any, Optional

from ..base import CalculatorPlugin
from .schema import BracingDesignInputs, BracingDesignOutputs


# Material properties
STEEL_PROPERTIES = {
    "S235": {"f_y": 235, "f_u": 360, "E": 210000, "G": 81000},
    "S275": {"f_y": 275, "f_u": 410, "E": 210000, "G": 81000},
    "S355": {"f_y": 355, "f_u": 470, "E": 210000, "G": 81000},
    "S420": {"f_y": 420, "f_u": 500, "E": 210000, "G": 81000},
    "S460": {"f_y": 460, "f_u": 540, "E": 210000, "G": 81000}
}

TIMBER_PROPERTIES = {
    "C16": {"f_m,k": 16, "f_t,0,k": 8.5, "f_c,0,k": 16, "f_c,90,k": 2.2, "E_0,mean": 8000, "E_0,05": 5800},
    "C24": {"f_m,k": 24, "f_t,0,k": 14.5, "f_c,0,k": 21, "f_c,90,k": 2.5, "E_0,mean": 11000, "E_0,05": 7400},
    "C30": {"f_m,k": 30, "f_t,0,k": 18.5, "f_c,0,k": 23, "f_c,90,k": 2.7, "E_0,mean": 12000, "E_0,05": 8200},
    "D30": {"f_m,k": 30, "f_t,0,k": 18.5, "f_c,0,k": 23, "f_c,90,k": 2.7, "E_0,mean": 12000, "E_0,05": 8200},
    "D40": {"f_m,k": 40, "f_t,0,k": 24.5, "f_c,0,k": 27, "f_c,90,k": 3.0, "E_0,mean": 13000, "E_0,05": 8900}
}

CABLE_PROPERTIES = {
    "spiral_strand": {"f_u": 1770, "E": 165000, "breaking_load_factor": 0.9},
    "locked_coil": {"f_u": 1570, "E": 150000, "breaking_load_factor": 0.85},
    "parallel_wire": {"f_u": 1670, "E": 160000, "breaking_load_factor": 0.88}
}


class BracingDesignCalculator(CalculatorPlugin):
    """Bracing design calculator (EN 1993-1-1, EN 1995-1-1)"""

    key = "bracing_design_v1"
    name = "Bracing Design"
    version = "1.0.0"
    description = "Structural bracing system design for lateral stability"
    category = "structures"
    input_schema = BracingDesignInputs
    output_schema = BracingDesignOutputs
    reference_text = "EN 1993-1-1:2005 - Design of steel structures"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform bracing design calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Get material properties
        material_props = self._get_material_properties(validated_inputs)

        # Calculate system geometry
        system_geometry = self._calculate_system_geometry(validated_inputs)

        # Calculate member forces
        member_forces = self._calculate_member_forces(validated_inputs, system_geometry)

        # Perform design checks
        compression_check = self._check_compression_resistance(
            member_forces, validated_inputs, material_props
        )

        tension_check = self._check_tension_resistance(
            member_forces, validated_inputs, material_props
        )

        buckling_check = self._check_buckling(
            member_forces, validated_inputs, system_geometry, material_props
        )

        connection_check = self._check_connections(
            member_forces, validated_inputs, material_props
        )

        # System performance
        system_stiffness = self._calculate_system_stiffness(
            validated_inputs, system_geometry, material_props
        )

        load_distribution = self._analyze_load_distribution(
            validated_inputs, member_forces
        )

        # Overall assessment
        checks = [compression_check, tension_check, buckling_check, connection_check]
        overall_check = all(check["status"] == "PASS" for check in checks)

        # Generate recommendations
        recommendations = self._generate_recommendations(checks, validated_inputs)

        # Build warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            checks, validated_inputs
        )

        # Build results
        results = {
            "system_geometry": system_geometry,
            "member_forces": member_forces,
            "compression_check": compression_check,
            "tension_check": tension_check,
            "buckling_check": buckling_check,
            "connection_check": connection_check,
            "system_stiffness": system_stiffness,
            "load_distribution": load_distribution,
            "utilisation_summary": {
                "compression": compression_check["utilization"],
                "tension": tension_check["utilization"],
                "buckling": buckling_check["utilization"],
                "connection": connection_check["utilization"]
            },
            "overall_check": overall_check,
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _get_material_properties(self, inputs: BracingDesignInputs) -> Dict[str, float]:
        """Get material properties based on type and grade"""

        if inputs.bracing_material == "steel":
            return STEEL_PROPERTIES[inputs.steel_grade]
        elif inputs.bracing_material == "timber":
            return TIMBER_PROPERTIES[inputs.timber_grade]
        else:  # cable
            return CABLE_PROPERTIES[inputs.cable_type]

    def _calculate_system_geometry(self, inputs: BracingDesignInputs) -> Dict[str, float]:
        """Calculate geometric properties of bracing system"""

        # Panel dimensions
        panel_width = inputs.span_length_m / inputs.number_of_panels
        panel_height = inputs.height_m

        # Bracing angle
        bracing_angle_rad = math.atan(panel_height / panel_width)
        bracing_angle_deg = math.degrees(bracing_angle_rad)

        # Member slenderness
        slenderness_ratio = inputs.member_length_m * 1000 / self._estimate_member_radius_of_gyration(inputs)

        return {
            "panel_width": round(panel_width, 2),
            "panel_height": round(panel_height, 2),
            "bracing_angle_deg": round(bracing_angle_deg, 1),
            "bracing_angle_rad": round(bracing_angle_rad, 3),
            "number_of_members": inputs.number_of_panels * 2,  # Assuming cross bracing
            "total_system_length": round(inputs.span_length_m, 2),
            "slenderness_ratio": round(slenderness_ratio, 1)
        }

    def _estimate_member_radius_of_gyration(self, inputs: BracingDesignInputs) -> float:
        """Estimate radius of gyration based on section type"""

        # Simple estimation based on section designation
        section = inputs.member_section.upper()

        if "CHS" in section:
            # Circular hollow section
            parts = section.replace("CHS", "").split("X")
            if len(parts) == 2:
                d = float(parts[0])  # diameter
                t = float(parts[1])  # thickness
                A = math.pi * (d**2 - (d - 2*t)**2) / 4
                I = math.pi * (d**4 - (d - 2*t)**4) / 64
                i = math.sqrt(I / A)
                return i

        elif "UB" in section or "UC" in section:
            # Universal beam/column - approximate
            return 50  # mm (rough estimate)

        elif "RHS" in section:
            # Rectangular hollow section
            parts = section.replace("RHS", "").split("X")
            if len(parts) == 3:
                h = float(parts[0])
                b = float(parts[1])
                return min(h, b) / 3.46  # approximation

        # Default assumption
        return 30  # mm

    def _calculate_member_forces(self, inputs: BracingDesignInputs,
                               system_geometry: Dict[str, float]) -> Dict[str, float]:
        """Calculate forces in bracing members"""

        # Wind load on system
        wind_load_total = inputs.wind_load_kN_per_m2 * inputs.height_m * inputs.span_length_m

        # Seismic load (simplified)
        seismic_load_total = inputs.seismic_load_factor * wind_load_total

        # Temperature effects (simplified)
        temp_force = inputs.temperature_change_deg * 0.000012 * 210000 * 1000  # N (rough estimate)

        # Total lateral load
        total_lateral_load = wind_load_total + seismic_load_total

        # Force distribution based on bracing type
        if inputs.bracing_type == "cross_bracing":
            # Cross bracing - each diagonal carries half the load
            force_per_member = total_lateral_load / (2 * math.sin(system_geometry["bracing_angle_rad"]))
        elif inputs.bracing_type == "k_bracing":
            # K-bracing - diagonal carries most load
            force_per_member = total_lateral_load / math.sin(system_geometry["bracing_angle_rad"])
        else:
            # Other types - simplified
            force_per_member = total_lateral_load / math.sin(system_geometry["bracing_angle_rad"])

        # ULS combinations
        compression_force = inputs.gamma_g * force_per_member
        tension_force = inputs.gamma_q * force_per_member

        return {
            "wind_load_total": round(wind_load_total, 2),
            "seismic_load_total": round(seismic_load_total, 2),
            "temperature_force": round(temp_force / 1000, 2),  # kN
            "total_lateral_load": round(total_lateral_load, 2),
            "compression_force_uls": round(compression_force, 2),
            "tension_force_uls": round(tension_force, 2),
            "force_per_member": round(force_per_member, 2)
        }

    def _check_compression_resistance(self, member_forces: Dict[str, float],
                                    inputs: BracingDesignInputs,
                                    material_props: Dict[str, float]) -> Dict[str, Any]:
        """Check compression resistance"""

        N_Ed = member_forces["compression_force_uls"]

        if inputs.bracing_material == "steel":
            # Steel compression resistance
            A = self._estimate_cross_sectional_area(inputs)
            f_y = material_props["f_y"]
            N_pl_Rd = (A * f_y) / inputs.gamma_m0 / 1000  # kN

        elif inputs.bracing_material == "timber":
            # Timber compression resistance
            A = self._estimate_cross_sectional_area(inputs)
            f_c_0_k = material_props["f_c,0,k"]
            k_mod = 0.9  # Medium term loading
            gamma_m = 1.3
            N_pl_Rd = (A * f_c_0_k * k_mod) / gamma_m / 1000  # kN

        else:  # cable
            # Cables don't carry compression
            N_pl_Rd = 0

        utilization = N_Ed / N_pl_Rd if N_pl_Rd > 0 else float('inf')
        status = "PASS" if utilization <= inputs.utilization_limit else "FAIL"

        return {
            "N_pl_Rd": round(N_pl_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_tension_resistance(self, member_forces: Dict[str, float],
                                inputs: BracingDesignInputs,
                                material_props: Dict[str, float]) -> Dict[str, Any]:
        """Check tension resistance"""

        N_Ed = member_forces["tension_force_uls"]

        if inputs.bracing_material == "steel":
            # Steel tension resistance
            A = self._estimate_cross_sectional_area(inputs)
            f_y = material_props["f_y"]
            N_pl_Rd = (A * f_y) / inputs.gamma_m0 / 1000  # kN

        elif inputs.bracing_material == "timber":
            # Timber tension resistance
            A = self._estimate_cross_sectional_area(inputs)
            f_t_0_k = material_props["f_t,0,k"]
            k_mod = 0.9  # Medium term loading
            gamma_m = 1.3
            N_pl_Rd = (A * f_t_0_k * k_mod) / gamma_m / 1000  # kN

        else:  # cable
            # Cable tension resistance
            breaking_load = self._estimate_cable_breaking_load(inputs)
            gamma_s = 1.15  # For cables
            N_pl_Rd = breaking_load * material_props["breaking_load_factor"] / gamma_s

        utilization = N_Ed / N_pl_Rd if N_pl_Rd > 0 else float('inf')
        status = "PASS" if utilization <= inputs.utilization_limit else "FAIL"

        return {
            "N_pl_Rd": round(N_pl_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_buckling(self, member_forces: Dict[str, float],
                      inputs: BracingDesignInputs,
                      system_geometry: Dict[str, float],
                      material_props: Dict[str, float]) -> Dict[str, Any]:
        """Check buckling stability per EN 1993-1-1 §6.3.1.2"""

        N_Ed = member_forces["compression_force_uls"]
        chi = 1.0  # Default for non-steel

        if inputs.bracing_material == "steel":
            # Non-dimensional slenderness per EN 1993-1-1 §6.3.1.3
            f_y = material_props["f_y"]
            E = material_props["E"]
            i = self._estimate_member_radius_of_gyration(inputs)  # mm
            L_cr = inputs.member_length_m * 1000  # mm

            # λ̄ = (L_cr / i) * (1/π) * √(f_y / E)
            lambda_1 = math.pi * math.sqrt(E / f_y)  # Euler slenderness
            lambda_bar = (L_cr / i) / lambda_1

            # Imperfection factor α per EN 1993-1-1 Table 6.1
            # Curve c (α = 0.49) typical for bracing members (hot-rolled hollow sections)
            alpha = 0.49

            # Φ = 0.5 * [1 + α(λ̄ - 0.2) + λ̄²]  — EN 1993-1-1 Eq 6.49
            phi = 0.5 * (1 + alpha * (lambda_bar - 0.2) + lambda_bar**2)

            # χ = 1 / (Φ + √(Φ² - λ̄²))  — EN 1993-1-1 Eq 6.49
            discriminant = phi**2 - lambda_bar**2
            if discriminant < 0:
                chi = 0.0
            else:
                chi = 1 / (phi + math.sqrt(discriminant))
            chi = min(chi, 1.0)

            N_b_Rd = chi * self._check_compression_resistance(member_forces, inputs, material_props)["N_pl_Rd"]

        elif inputs.bracing_material == "timber":
            # Timber buckling per EN 1995-1-1 §6.3.2
            f_c = material_props["f_c,0,k"]
            E_05 = material_props["E_0,05"]
            i = self._estimate_member_radius_of_gyration(inputs)
            L_cr = inputs.member_length_m * 1000
            lambda_rel = (L_cr / i) / math.pi * math.sqrt(f_c / E_05)
            beta_c = 0.2  # For solid timber
            k_y = 0.5 * (1 + beta_c * (lambda_rel - 0.3) + lambda_rel**2)
            k_c = min(1.0, 1 / (k_y + math.sqrt(max(k_y**2 - lambda_rel**2, 0))))
            N_b_Rd = self._check_compression_resistance(member_forces, inputs, material_props)["N_pl_Rd"] * k_c
            lambda_bar = lambda_rel

        else:  # cable
            # Cables don't carry compression
            N_b_Rd = 0
            lambda_bar = 0

        utilization = N_Ed / N_b_Rd if N_b_Rd > 0 else float('inf')
        status = "PASS" if utilization <= inputs.utilization_limit else "FAIL"

        return {
            "N_b_Rd": round(N_b_Rd, 2),
            "lambda_bar": round(lambda_bar, 3),
            "chi": round(chi, 3),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_connections(self, member_forces: Dict[str, float],
                         inputs: BracingDesignInputs,
                         material_props: Dict[str, float]) -> Dict[str, Any]:
        """Check connection capacity"""

        # Simplified connection check
        force_per_connection = max(
            member_forces["compression_force_uls"],
            member_forces["tension_force_uls"]
        )

        # Assume bolted connection
        bolt_capacity = 50  # kN per bolt (simplified)
        required_bolts = math.ceil(force_per_connection / bolt_capacity)

        utilization = force_per_connection / (required_bolts * bolt_capacity)
        status = "PASS" if utilization <= inputs.utilization_limit else "FAIL"

        return {
            "force_per_connection": round(force_per_connection, 2),
            "bolt_capacity": bolt_capacity,
            "required_bolts": required_bolts,
            "utilization": round(utilization, 3),
            "status": status
        }

    def _calculate_system_stiffness(self, inputs: BracingDesignInputs,
                                  system_geometry: Dict[str, float],
                                  material_props: Dict[str, float]) -> Dict[str, float]:
        """Calculate system stiffness properties"""

        # Simplified lateral stiffness calculation
        A = self._estimate_cross_sectional_area(inputs)
        E = material_props["E"]
        L = inputs.member_length_m * 1000  # mm
        angle = system_geometry["bracing_angle_rad"]

        # Stiffness of one bracing member
        k_member = (A * E) / L

        # System stiffness (simplified for cross bracing)
        k_system = 2 * k_member * math.sin(angle)**2

        return {
            "member_stiffness": round(k_member / 1000, 2),  # kN/mm
            "system_stiffness": round(k_system / 1000, 2),  # kN/mm
            "drift_ratio": round(1 / k_system * 1000, 4)  # mm/kN
        }

    def _analyze_load_distribution(self, inputs: BracingDesignInputs,
                                 member_forces: Dict[str, float]) -> Dict[str, float]:
        """Analyze load distribution"""

        total_load = member_forces["total_lateral_load"]
        members_per_panel = 2 if inputs.bracing_type == "cross_bracing" else 1
        total_members = inputs.number_of_panels * members_per_panel

        load_per_member = total_load / total_members

        return {
            "total_load": round(total_load, 2),
            "members_per_panel": members_per_panel,
            "total_members": total_members,
            "load_per_member": round(load_per_member, 2),
            "load_distribution_efficiency": round(0.95, 2)  # Assumed efficiency
        }

    def _estimate_cross_sectional_area(self, inputs: BracingDesignInputs) -> float:
        """Estimate cross-sectional area from section designation"""

        section = inputs.member_section.upper()

        try:
            if "CHS" in section:
                # Circular hollow section
                parts = section.replace("CHS", "").split("X")
                d = float(parts[0])
                t = float(parts[1])
                A = math.pi * (d**2 - (d - 2*t)**2) / 4

            elif "RHS" in section:
                # Rectangular hollow section
                parts = section.replace("RHS", "").split("X")
                h = float(parts[0])
                b = float(parts[1])
                t = float(parts[2])
                A = h*b - (h-2*t)*(b-2*t)

            elif "UB" in section or "UC" in section:
                # Universal beam/column - approximate
                parts = section.replace("UB", "").replace("UC", "").split("X")
                if len(parts) >= 3:
                    h = float(parts[0])
                    b = float(parts[1])
                    tw = float(parts[2])
                    tf = float(parts[3]) if len(parts) > 3 else tw
                    A = b*tf*2 + (h-2*tf)*tw

            else:
                # Default assumption
                A = 1000  # mm²

        except:
            A = 1000  # mm² default

        return A

    def _estimate_cable_breaking_load(self, inputs: BracingDesignInputs) -> float:
        """Estimate cable breaking load"""

        # Simplified estimation based on cable type
        if inputs.cable_type == "spiral_strand":
            return 500  # kN (typical)
        elif inputs.cable_type == "locked_coil":
            return 400  # kN (typical)
        else:  # parallel wire
            return 450  # kN (typical)

    def _generate_recommendations(self, checks: list, inputs: BracingDesignInputs) -> list:
        """Generate design recommendations"""

        recommendations = []

        compression_check = next((c for c in checks if "compression" in str(c)), None)
        if compression_check and compression_check["status"] == "FAIL":
            recommendations.append("Increase member cross-sectional area")
            recommendations.append("Use higher strength material")
            recommendations.append("Reduce member slenderness ratio")

        tension_check = next((c for c in checks if "tension" in str(c)), None)
        if tension_check and tension_check["status"] == "FAIL":
            recommendations.append("Increase member cross-sectional area")
            recommendations.append("Use higher strength material")

        buckling_check = next((c for c in checks if "buckling" in str(c)), None)
        if buckling_check and buckling_check["status"] == "FAIL":
            recommendations.append("Add intermediate restraints")
            recommendations.append("Use stockier member sections")
            recommendations.append("Consider different bracing configuration")

        connection_check = next((c for c in checks if "connection" in str(c)), None)
        if connection_check and connection_check["status"] == "FAIL":
            recommendations.append("Increase number of bolts")
            recommendations.append("Use larger bolt diameter")
            recommendations.append("Strengthen connection plates")

        return recommendations

    def _generate_warnings_and_notes(self, checks: list, inputs: BracingDesignInputs) -> tuple:
        """Generate warnings and notes"""

        warnings = []
        notes = []

        # Check high utilizations
        for check in checks:
            if isinstance(check, dict) and check.get("utilization", 0) > 0.8:
                check_type = "compression" if "compression" in str(check) else \
                           "tension" if "tension" in str(check) else \
                           "buckling" if "buckling" in str(check) else "connection"
                warnings.append(f"High {check_type} utilization (>80%)")

        # Material-specific warnings
        if inputs.bracing_material == "timber":
            warnings.append("Timber bracing requires regular inspection for decay")
        elif inputs.bracing_material == "cable":
            warnings.append("Cable bracing requires proper anchorage and tensioning")

        # Notes about assumptions
        notes.append("Calculations based on EN 1993-1-1 (steel) or EN 1995-1-1 (timber)")
        notes.append(f"Bracing type: {inputs.bracing_type.replace('_', ' ')}")
        notes.append("Load distribution assumes uniform loading")
        notes.append("Connection design assumes bolted connections")

        return warnings, notes


# Create calculator instance
calculator = BracingDesignCalculator()
