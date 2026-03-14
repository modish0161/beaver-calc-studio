"""
Movement Joints Design Calculator
EN 1991-1-5: Actions on Structures - Thermal Actions
EN 1992-1-1: Concrete Structures - General Rules (for creep/shrinkage)
"""

import math
from typing import Dict, List, Tuple
import numpy as np
from .schema import (
    MovementInputs,
    MovementOutputs,
    JointType,
    BridgeType,
    SeismicZone
)


class MovementJointsCalculator:
    """
    Calculator for bridge movement joints design.
    Handles thermal expansion, creep, shrinkage, and seismic movements.
    """

    # Material properties (EN 1992-1-1, EN 1993-1-1)
    MATERIAL_PROPERTIES = {
        'concrete': {
            'thermal_coefficient': 10e-6,  # 1/°C
            'creep_coefficient': 0.8,
            'shrinkage_strain': 0.0004
        },
        'steel': {
            'thermal_coefficient': 12e-6,  # 1/°C
            'creep_coefficient': 0.0,
            'shrinkage_strain': 0.0
        },
        'composite': {
            'thermal_coefficient': 11e-6,  # 1/°C (weighted average)
            'creep_coefficient': 0.4,
            'shrinkage_strain': 0.0002
        }
    }

    # Joint type factors (based on manufacturer data and EN standards)
    JOINT_CAPACITY_FACTORS = {
        JointType.COMPRESSION_SEAL: {
            'movement_capacity_percent': 15,
            'min_gap_mm': 20,
            'max_gap_mm': 80
        },
        JointType.STRIP_SEAL: {
            'movement_capacity_percent': 25,
            'min_gap_mm': 30,
            'max_gap_mm': 120
        },
        JointType.MODULAR_SEAL: {
            'movement_capacity_percent': 35,
            'min_gap_mm': 40,
            'max_gap_mm': 200
        },
        JointType.POT_SEAL: {
            'movement_capacity_percent': 20,
            'min_gap_mm': 25,
            'max_gap_mm': 100
        },
        JointType.FINGER_PLATE: {
            'movement_capacity_percent': 50,
            'min_gap_mm': 50,
            'max_gap_mm': 300
        }
    }

    @staticmethod
    def calculate_thermal_movement(inputs: MovementInputs) -> Dict[str, float]:
        """
        Calculate thermal movements according to EN 1991-1-5
        """
        # Get material properties
        material_props = MovementJointsCalculator.MATERIAL_PROPERTIES[inputs.bridge_type]

        # Thermal expansion coefficient
        alpha = inputs.thermal_coefficient_per_c if inputs.thermal_coefficient_per_c > 0 else material_props['thermal_coefficient']

        # Temperature differences
        delta_t_expansion = inputs.max_temperature_c - inputs.mean_temperature_c
        delta_t_contraction = inputs.mean_temperature_c - inputs.min_temperature_c

        # Thermal movements (expansion and contraction)
        thermal_expansion_mm = alpha * inputs.span_length_m * 1000 * delta_t_expansion
        thermal_contraction_mm = alpha * inputs.span_length_m * 1000 * delta_t_contraction

        # Total thermal movement (absolute value)
        thermal_movement_mm = max(thermal_expansion_mm, thermal_contraction_mm)

        return {
            'thermal_movement_mm': thermal_movement_mm,
            'thermal_expansion_mm': thermal_expansion_mm,
            'thermal_contraction_mm': thermal_contraction_mm,
            'thermal_coefficient_used': alpha
        }

    @staticmethod
    def calculate_concrete_movements(inputs: MovementInputs) -> Dict[str, float]:
        """
        Calculate creep and shrinkage movements for concrete bridges
        EN 1992-1-1, EN 1992-1-2
        """
        if inputs.bridge_type == BridgeType.STEEL:
            return {
                'creep_movement_mm': 0.0,
                'shrinkage_movement_mm': 0.0
            }

        # Creep movement (simplified approach)
        creep_coefficient = inputs.creep_coefficient if inputs.creep_coefficient > 0 else MovementJointsCalculator.MATERIAL_PROPERTIES[inputs.bridge_type]['creep_coefficient']
        creep_movement_mm = creep_coefficient * inputs.span_length_m * 1000 * 0.0002  # Assumed elastic strain

        # Shrinkage movement
        shrinkage_strain = inputs.shrinkage_strain if inputs.shrinkage_strain > 0 else MovementJointsCalculator.MATERIAL_PROPERTIES[inputs.bridge_type]['shrinkage_strain']
        shrinkage_movement_mm = shrinkage_strain * inputs.span_length_m * 1000

        return {
            'creep_movement_mm': creep_movement_mm,
            'shrinkage_movement_mm': shrinkage_movement_mm
        }

    @staticmethod
    def calculate_seismic_movement(inputs: MovementInputs) -> float:
        """
        Calculate seismic movement allowance
        EN 1998-2 (simplified approach)
        """
        if inputs.seismic_displacement_mm > 0:
            return inputs.seismic_displacement_mm

        # Simplified seismic displacement based on zone
        seismic_factors = {
            SeismicZone.LOW: 5,      # mm
            SeismicZone.MEDIUM: 15,  # mm
            SeismicZone.HIGH: 30     # mm
        }

        return seismic_factors[inputs.seismic_zone]

    @staticmethod
    def calculate_joint_sizing(total_movement_mm: float, inputs: MovementInputs) -> Dict[str, float]:
        """
        Calculate joint dimensions and verify capacity
        """
        joint_factors = MovementJointsCalculator.JOINT_CAPACITY_FACTORS[inputs.joint_type]

        # Apply safety factor
        design_movement_mm = total_movement_mm * inputs.safety_factor_movement

        # Calculate required gap width
        design_gap_mm = design_movement_mm / (joint_factors['movement_capacity_percent'] / 100)

        # Ensure minimum gap requirements
        joint_width_mm = max(design_gap_mm, joint_factors['min_gap_mm'])

        # Check if within joint capacity
        max_capacity_mm = joint_factors['max_gap_mm']
        utilization = (joint_width_mm / max_capacity_mm) * 100

        # Seal thickness (rule of thumb based on joint depth)
        seal_thickness_mm = inputs.joint_depth_mm * 0.8 if inputs.joint_depth_mm > 0 else joint_width_mm * 0.3

        return {
            'design_gap_mm': design_gap_mm,
            'joint_width_mm': joint_width_mm,
            'seal_thickness_mm': seal_thickness_mm,
            'joint_capacity_utilization': utilization,
            'max_joint_capacity_mm': max_capacity_mm
        }

    @staticmethod
    def perform_movement_checks(inputs: MovementInputs, total_movement_mm: float) -> Dict[str, Dict[str, float]]:
        """
        Perform verification checks for movement joints
        """
        checks = {}

        # Thermal movement check
        max_thermal_movement = 100  # mm (typical limit for most joints)
        checks['thermal_movement'] = {
            'required': total_movement_mm,
            'capacity': max_thermal_movement,
            'utilization': (total_movement_mm / max_thermal_movement) * 100,
            'status': 'PASS' if total_movement_mm <= max_thermal_movement else 'FAIL'
        }

        # Joint type capacity check
        joint_factors = MovementJointsCalculator.JOINT_CAPACITY_FACTORS[inputs.joint_type]
        checks['joint_capacity'] = {
            'required': total_movement_mm * inputs.safety_factor_movement,
            'capacity': joint_factors['max_gap_mm'] * (joint_factors['movement_capacity_percent'] / 100),
            'utilization': ((total_movement_mm * inputs.safety_factor_movement) /
                          (joint_factors['max_gap_mm'] * (joint_factors['movement_capacity_percent'] / 100))) * 100,
            'status': 'PASS' if (total_movement_mm * inputs.safety_factor_movement) <=
                      (joint_factors['max_gap_mm'] * (joint_factors['movement_capacity_percent'] / 100)) else 'FAIL'
        }

        # Service life consideration
        service_life_factor = min(1.0, inputs.service_life_years / 120.0)  # Normalized to 120 years
        checks['service_life'] = {
            'required': total_movement_mm,
            'capacity': total_movement_mm / service_life_factor,
            'utilization': service_life_factor * 100,
            'status': 'PASS' if service_life_factor >= 0.8 else 'WARNING'
        }

        return checks

    @staticmethod
    def generate_recommendations(inputs: MovementInputs, checks: Dict[str, Dict[str, float]]) -> List[str]:
        """
        Generate design recommendations based on verification results
        """
        recommendations = []

        # Joint type recommendations
        if checks['joint_capacity']['status'] == 'FAIL':
            recommendations.append("Consider upgrading to a joint type with higher movement capacity (e.g., modular seal or finger plate)")

        # Thermal considerations
        if checks['thermal_movement']['utilization'] > 80:
            recommendations.append("High thermal movement detected - consider thermal breaks or expansion joints at intermediate locations")

        # Service life considerations
        if checks['service_life']['status'] == 'WARNING':
            recommendations.append("Extended service life may require increased movement allowances or joint maintenance provisions")

        # Bridge type specific recommendations
        if inputs.bridge_type == BridgeType.CONCRETE:
            recommendations.append("For concrete bridges, ensure adequate reinforcement detailing around joint locations")
        elif inputs.bridge_type == BridgeType.STEEL:
            recommendations.append("For steel bridges, consider differential expansion between steel and concrete elements")

        # Seismic recommendations
        if inputs.seismic_zone != SeismicZone.LOW:
            recommendations.append("Seismic zone requires special attention to joint restraint systems and backup seals")

        # General recommendations
        recommendations.append("Provide adequate drainage and waterproofing systems at joint locations")
        recommendations.append("Include joint monitoring provisions for long-term maintenance planning")

        return recommendations

    @staticmethod
    def calculate(inputs: MovementInputs) -> MovementOutputs:
        """
        Main calculation method for movement joints design
        """
        # Calculate thermal movements
        thermal_results = MovementJointsCalculator.calculate_thermal_movement(inputs)

        # Calculate concrete movements (creep and shrinkage)
        concrete_results = MovementJointsCalculator.calculate_concrete_movements(inputs)

        # Calculate seismic movement
        seismic_movement_mm = MovementJointsCalculator.calculate_seismic_movement(inputs)

        # Total movement calculation
        total_movement_mm = (
            thermal_results['thermal_movement_mm'] +
            concrete_results['creep_movement_mm'] +
            concrete_results['shrinkage_movement_mm'] +
            seismic_movement_mm
        )

        # Calculate joint sizing
        joint_sizing = MovementJointsCalculator.calculate_joint_sizing(total_movement_mm, inputs)

        # Perform verification checks
        movement_checks = MovementJointsCalculator.perform_movement_checks(inputs, total_movement_mm)

        # Joint capacity parameters
        joint_factors = MovementJointsCalculator.JOINT_CAPACITY_FACTORS[inputs.joint_type]
        joint_capacity = {
            'movement_capacity_percent': joint_factors['movement_capacity_percent'],
            'min_gap_mm': joint_factors['min_gap_mm'],
            'max_gap_mm': joint_factors['max_gap_mm'],
            'recommended_seal_depth_mm': inputs.joint_depth_mm or joint_sizing['joint_width_mm'] * 0.4
        }

        # Generate recommendations and warnings
        recommendations = MovementJointsCalculator.generate_recommendations(inputs, movement_checks)

        # Generate warnings
        warnings = []
        if movement_checks['joint_capacity']['utilization'] > 90:
            warnings.append("Joint capacity utilization is very high - consider alternative joint type")
        if inputs.span_length_m > 100:
            warnings.append("Long span bridge - consider multiple expansion joints")
        if inputs.deck_width_m > 20:
            warnings.append("Wide bridge deck - ensure adequate joint support and drainage")

        # Generate notes
        notes = [
            f"Calculations based on EN 1991-1-5 (thermal actions) and EN 1992-1-1 (concrete movements)",
            f"Bridge type: {inputs.bridge_type.value}",
            f"Joint type: {inputs.joint_type.value}",
            f"Design service life: {inputs.service_life_years} years",
            f"Safety factor applied: {inputs.safety_factor_movement}",
            f"Seismic zone: {inputs.seismic_zone.value}"
        ]

        return MovementOutputs(
            thermal_movement_mm=thermal_results['thermal_movement_mm'],
            thermal_expansion_mm=thermal_results['thermal_expansion_mm'],
            thermal_contraction_mm=thermal_results['thermal_contraction_mm'],
            creep_movement_mm=concrete_results['creep_movement_mm'],
            shrinkage_movement_mm=concrete_results['shrinkage_movement_mm'],
            total_movement_mm=total_movement_mm,
            design_gap_mm=joint_sizing['design_gap_mm'],
            joint_width_mm=joint_sizing['joint_width_mm'],
            seal_thickness_mm=joint_sizing['seal_thickness_mm'],
            movement_checks=movement_checks,
            joint_capacity=joint_capacity,
            recommendations=recommendations,
            warnings=warnings,
            notes=notes
        )


def calculate_movement_joints(inputs: MovementInputs) -> MovementOutputs:
    """
    Public interface for movement joints calculation
    """
    return MovementJointsCalculator.calculate(inputs)
