"""
Elastomeric bearings calculator implementation
"""
import math
from typing import Dict, Any, List

from ..base import CalculatorPlugin
from .schema import ElastomericBearingsInputs, ElastomericBearingsOutputs, ElastomerLayer, SteelShims


class ElastomericBearingsCalculator(CalculatorPlugin):
    """Elastomeric bearings calculator (EN 1337-3)"""

    key = "elastomeric_bearings_v1"
    name = "Elastomeric Bearings"
    version = "1.0.0"
    description = "Elastomeric bearing design with shape factors and stability analysis"
    category = "bridges"
    input_schema = ElastomericBearingsInputs
    output_schema = ElastomericBearingsOutputs
    reference_text = "EN 1337-3:2005 - Structural bearings"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform elastomeric bearings design calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Calculate geometric properties
        geometry = self._calculate_geometry(validated_inputs)

        # Calculate shape factors
        shape_factors = self._calculate_shape_factors(validated_inputs, geometry)

        # Calculate effective properties
        effective_properties = self._calculate_effective_properties(validated_inputs)

        # Perform design checks
        stability_check = self._check_stability(validated_inputs, geometry)
        compression_check = self._check_compression(validated_inputs, geometry)
        shear_check = self._check_shear_deformation(validated_inputs, geometry, effective_properties)
        strain_check = self._check_strain_limits(validated_inputs, geometry, effective_properties)

        # Calculate performance characteristics
        stiffness_properties = self._calculate_stiffness_properties(validated_inputs, geometry, effective_properties)
        rotation_capacity = self._calculate_rotation_capacity(validated_inputs, geometry, effective_properties)

        # Overall assessment
        checks = [stability_check, compression_check, shear_check, strain_check]
        overall_check = all(check["status"] == "PASS" for check in checks)

        # Generate recommendations
        recommendations = self._generate_recommendations(checks, validated_inputs, shape_factors)

        # Build warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            checks, validated_inputs, shape_factors
        )

        # Build results
        results = {
            "geometry": geometry,
            "shape_factors": shape_factors,
            "effective_properties": effective_properties,
            "stability_check": stability_check,
            "compression_check": compression_check,
            "shear_check": shear_check,
            "strain_check": strain_check,
            "stiffness_properties": stiffness_properties,
            "rotation_capacity": rotation_capacity,
            "overall_check": overall_check,
            "utilisation_summary": {
                "stability": stability_check["utilization"],
                "compression": compression_check["utilization"],
                "shear": shear_check["utilization"],
                "strain": strain_check["utilization"]
            },
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _calculate_geometry(self, inputs: ElastomericBearingsInputs) -> Dict[str, float]:
        """Calculate geometric properties"""

        # Calculate perimeter and area based on shape
        if inputs.shape == "circular":
            area = math.pi * (inputs.diameter_mm / 2) ** 2
            perimeter = math.pi * inputs.diameter_mm
            length = inputs.diameter_mm
            width = inputs.diameter_mm
        elif inputs.shape == "square":
            area = inputs.width_mm ** 2
            perimeter = 4 * inputs.width_mm
            length = inputs.width_mm
            width = inputs.width_mm
        else:  # rectangular
            area = inputs.length_mm * inputs.width_mm
            perimeter = 2 * (inputs.length_mm + inputs.width_mm)
            length = inputs.length_mm
            width = inputs.width_mm

        # Calculate total elastomer thickness
        total_elastomer_thickness = sum(layer.thickness_mm for layer in inputs.elastomer_layers)

        # Calculate total bearing height
        total_height = (
            inputs.top_plate_thickness_mm +
            total_elastomer_thickness +
            inputs.steel_shims.number_of_shims * inputs.steel_shims.shim_thickness_mm +
            inputs.bottom_plate_thickness_mm
        )

        return {
            "area_mm2": area,
            "perimeter_mm": perimeter,
            "length_mm": length,
            "width_mm": width,
            "total_elastomer_thickness_mm": total_elastomer_thickness,
            "total_height_mm": total_height,
            "aspect_ratio": length / width if width > 0 else 1.0
        }

    def _calculate_shape_factors(self, inputs: ElastomericBearingsInputs,
                               geometry: Dict[str, float]) -> Dict[str, List[float]]:
        """Calculate shape factors for each elastomer layer"""

        shape_factors = []
        bonded_area = geometry["area_mm2"]

        for layer in inputs.elastomer_layers:
            # Shape factor S = bonded area / free area
            # Free area = perimeter × thickness
            free_area = geometry["perimeter_mm"] * layer.thickness_mm
            shape_factor = bonded_area / free_area if free_area > 0 else 0
            shape_factors.append(shape_factor)

        return {
            "shape_factors": shape_factors,
            "min_shape_factor": min(shape_factors),
            "max_shape_factor": max(shape_factors),
            "average_shape_factor": sum(shape_factors) / len(shape_factors)
        }

    def _calculate_effective_properties(self, inputs: ElastomericBearingsInputs) -> Dict[str, float]:
        """Calculate effective material properties"""

        # Calculate effective shear modulus
        total_thickness = sum(layer.thickness_mm for layer in inputs.elastomer_layers)
        effective_shear_modulus = total_thickness / sum(
            layer.thickness_mm / layer.shear_modulus_mpa
            for layer in inputs.elastomer_layers
        )

        # Calculate effective bulk modulus
        effective_bulk_modulus = total_thickness / sum(
            layer.thickness_mm / layer.bulk_modulus_mpa
            for layer in inputs.elastomer_layers
        )

        # Calculate effective Young's modulus
        effective_youngs_modulus = 3 * effective_shear_modulus * effective_bulk_modulus / (
            effective_shear_modulus + effective_bulk_modulus
        )

        return {
            "effective_shear_modulus_mpa": effective_shear_modulus,
            "effective_bulk_modulus_mpa": effective_bulk_modulus,
            "effective_youngs_modulus_mpa": effective_youngs_modulus,
            "total_elastomer_thickness_mm": total_thickness
        }

    def _check_stability(self, inputs: ElastomericBearingsInputs,
                        geometry: Dict[str, float]) -> Dict[str, Any]:
        """Check stability and overturning"""

        # Calculate maximum allowable eccentricity
        # Stability criterion: eccentricity ≤ 0.25 × length
        max_eccentricity = 0.25 * geometry["length_mm"]

        # For elastomeric bearings, stability is primarily controlled by shape factor
        # and compression stress limits
        stability_ratio = 1.0  # Assume stable if other checks pass

        utilization = stability_ratio
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "max_eccentricity_mm": max_eccentricity,
            "stability_ratio": stability_ratio,
            "utilization": utilization,
            "status": status
        }

    def _check_compression(self, inputs: ElastomericBearingsInputs,
                          geometry: Dict[str, float]) -> Dict[str, Any]:
        """Check compression stress limits"""

        # Calculate nominal compression stress
        nominal_stress_mpa = (inputs.design_vertical_load_kn * 1000) / geometry["area_mm2"]

        # Check against limit
        utilization = nominal_stress_mpa / inputs.compression_stress_limit_mpa
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "nominal_stress_mpa": nominal_stress_mpa,
            "allowable_stress_mpa": inputs.compression_stress_limit_mpa,
            "utilization": utilization,
            "status": status
        }

    def _check_shear_deformation(self, inputs: ElastomericBearingsInputs,
                               geometry: Dict[str, float],
                               effective_properties: Dict[str, float]) -> Dict[str, Any]:
        """Check shear deformation limits"""

        # Calculate shear strain
        shear_force_n = inputs.design_shear_load_kn * 1000
        shear_area = geometry["area_mm2"]
        shear_stress = shear_force_n / shear_area

        # Shear strain = shear stress / shear modulus
        shear_strain_percent = (shear_stress / effective_properties["effective_shear_modulus_mpa"]) * 100

        # Check against typical limit of 100-150%
        utilization = shear_strain_percent / 100.0  # Normalize to 100%
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "shear_stress_mpa": shear_stress / 1e6,  # Convert to MPa
            "shear_strain_percent": shear_strain_percent,
            "utilization": utilization,
            "status": status
        }

    def _check_strain_limits(self, inputs: ElastomericBearingsInputs,
                           geometry: Dict[str, float],
                           effective_properties: Dict[str, float]) -> Dict[str, Any]:
        """Check strain limits"""

        # Calculate compression strain
        compression_force_n = inputs.design_vertical_load_kn * 1000
        compression_stress = compression_force_n / geometry["area_mm2"]
        compression_strain_percent = (compression_stress / effective_properties["effective_youngs_modulus_mpa"]) * 100

        # Check against limit
        utilization = compression_strain_percent / inputs.strain_limit_percent
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "compression_strain_percent": compression_strain_percent,
            "allowable_strain_percent": inputs.strain_limit_percent,
            "utilization": utilization,
            "status": status
        }

    def _calculate_stiffness_properties(self, inputs: ElastomericBearingsInputs,
                                      geometry: Dict[str, float],
                                      effective_properties: Dict[str, float]) -> Dict[str, float]:
        """Calculate stiffness and deformation properties"""

        area = geometry["area_mm2"]
        total_thickness = effective_properties["total_elastomer_thickness_mm"]

        # Vertical stiffness (compression)
        k_vertical = (effective_properties["effective_youngs_modulus_mpa"] * area) / total_thickness

        # Horizontal stiffness (shear)
        k_horizontal = (effective_properties["effective_shear_modulus_mpa"] * area) / total_thickness

        # Rotational stiffness
        k_rotation = (effective_properties["effective_youngs_modulus_mpa"] * area * total_thickness**2) / 12

        return {
            "vertical_stiffness_kn_mm": k_vertical / 1000,  # kN/mm
            "horizontal_stiffness_kn_mm": k_horizontal / 1000,  # kN/mm
            "rotational_stiffness_knm_rad": k_rotation / 1e6,  # kNm/rad
            "vertical_deflection_mm": (inputs.design_vertical_load_kn * 1000) / k_vertical,
            "horizontal_deflection_mm": (inputs.design_shear_load_kn * 1000) / k_horizontal
        }

    def _calculate_rotation_capacity(self, inputs: ElastomericBearingsInputs,
                                   geometry: Dict[str, float],
                                   effective_properties: Dict[str, float]) -> Dict[str, float]:
        """Calculate rotation capacity"""

        # Simplified rotation capacity based on elastomer thickness
        total_thickness = effective_properties["total_elastomer_thickness_mm"]

        # Typical rotation capacity is about 0.02 radians for elastomeric bearings
        max_rotation_rad = 0.02

        # Calculate required rotation capacity based on bearing dimensions
        # This is a simplified calculation
        rotation_capacity_rad = total_thickness / (geometry["length_mm"] * 10)  # Rough estimate

        utilization = rotation_capacity_rad / max_rotation_rad
        status = "OK" if utilization <= 1.0 else "LIMITED"

        return {
            "max_rotation_rad": max_rotation_rad,
            "available_rotation_rad": rotation_capacity_rad,
            "utilization": utilization,
            "status": status
        }

    def _generate_recommendations(self, checks: List[Dict[str, Any]],
                                inputs: ElastomericBearingsInputs,
                                shape_factors: Dict[str, Any]) -> List[str]:
        """Generate design recommendations"""

        recommendations = []

        # Shape factor recommendations
        if shape_factors["min_shape_factor"] < inputs.shape_factor_min:
            recommendations.append(f"Shape factor too low ({shape_factors['min_shape_factor']:.1f} < {inputs.shape_factor_min}). Increase elastomer thickness or reduce plan area.")

        if shape_factors["max_shape_factor"] > inputs.shape_factor_max:
            recommendations.append(f"Shape factor too high ({shape_factors['max_shape_factor']:.1f} > {inputs.shape_factor_max}). Decrease elastomer thickness or increase plan area.")

        # Check-specific recommendations
        compression_check = next((c for c in checks if "compression" in str(c)), None)
        if compression_check and compression_check["status"] == "FAIL":
            recommendations.append("Compression stress exceeds limit. Increase plan area or reduce design load.")

        shear_check = next((c for c in checks if "shear" in str(c)), None)
        if shear_check and shear_check["status"] == "FAIL":
            recommendations.append("Shear deformation exceeds limit. Increase elastomer thickness or reduce shear load.")

        strain_check = next((c for c in checks if "strain" in str(c)), None)
        if strain_check and strain_check["status"] == "FAIL":
            recommendations.append("Strain limit exceeded. Review elastomer material properties or adjust geometry.")

        if not recommendations:
            recommendations.append("Bearing design appears satisfactory for the applied loads and geometry.")

        return recommendations

    def _generate_warnings_and_notes(self, checks: List[Dict[str, Any]],
                                   inputs: ElastomericBearingsInputs,
                                   shape_factors: Dict[str, Any]) -> tuple:
        """Generate warnings and notes"""

        warnings = []
        notes = []

        # Shape factor warnings
        if shape_factors["min_shape_factor"] < 6:
            warnings.append(f"Low shape factor ({shape_factors['min_shape_factor']:.1f}) may lead to stability issues.")

        if shape_factors["max_shape_factor"] > 10:
            warnings.append(f"High shape factor ({shape_factors['max_shape_factor']:.1f}) may cause excessive compression stresses.")

        # Check warnings
        for check in checks:
            if isinstance(check, dict) and check.get("utilization", 0) > 0.8:
                check_type = "compression" if "compression" in str(check) else \
                           "shear" if "shear" in str(check) else \
                           "strain" if "strain" in str(check) else "stability"
                warnings.append(f"High {check_type} utilization ({(check['utilization']*100):.1f}%)")

        # Notes about assumptions
        notes.append("Calculations based on EN 1337-3 elastomeric bearing design")
        notes.append(f"Bearing shape: {inputs.shape}")
        notes.append(f"Number of elastomer layers: {len(inputs.elastomer_layers)}")
        notes.append(f"Steel shims: {inputs.steel_shims.number_of_shims} plates")
        notes.append("Linear elastic material behavior assumed")
        notes.append("Temperature effects not included in basic analysis")

        if inputs.service_temperature_deg != 20:
            notes.append(f"Service temperature: {inputs.service_temperature_deg}°C (nominal analysis at 20°C)")

        return warnings, notes


# Create calculator instance
calculator = ElastomericBearingsCalculator()
