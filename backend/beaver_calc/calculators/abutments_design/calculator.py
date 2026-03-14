"""
Abutments design calculator implementation
"""
import math
from typing import Dict, Any, List

from ..base import CalculatorPlugin
from .schema import AbutmentsInputs, AbutmentsOutputs, LoadCase, FoundationCheck, ReinforcementRequirement


class AbutmentsCalculator(CalculatorPlugin):
    """Abutments design calculator (EN 1992-1-1, EN 1997-1)"""

    key = "abutments_v1"
    name = "Abutments Design"
    version = "1.0.0"
    description = "Bridge abutment design with foundation and stability checks"
    category = "bridges"
    input_schema = AbutmentsInputs
    output_schema = AbutmentsOutputs
    reference_text = "EN 1992-1-1: Concrete structures, EN 1997-1: Geotechnical design"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform abutments design calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Create analysis summary
        analysis_summary = self._create_analysis_summary(validated_inputs)

        # Generate load combinations
        load_combinations = self._generate_load_combinations(validated_inputs)

        # Design foundation
        foundation_dimensions = self._design_foundation(validated_inputs, load_combinations)

        # Perform foundation checks
        foundation_checks = self._perform_foundation_checks(validated_inputs, load_combinations, foundation_dimensions)

        # Design abutment structure
        abutment_design = self._design_abutment_structure(validated_inputs, load_combinations)

        # Calculate reinforcement requirements
        reinforcement = self._calculate_reinforcement(validated_inputs, abutment_design)

        # Perform stability analysis
        stability_analysis = self._perform_stability_analysis(validated_inputs, load_combinations, foundation_dimensions)

        # Generate recommendations
        recommendations = self._generate_recommendations(foundation_checks, stability_analysis)

        # Build warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            validated_inputs, foundation_checks, stability_analysis
        )

        # Build results
        results = {
            "analysis_summary": analysis_summary,
            "load_combinations": load_combinations,
            "foundation_dimensions": foundation_dimensions,
            "foundation_checks": foundation_checks,
            "abutment_design": abutment_design,
            "reinforcement": reinforcement,
            "stability_analysis": stability_analysis,
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _create_analysis_summary(self, inputs: AbutmentsInputs) -> Dict[str, Any]:
        """Create summary of analysis parameters"""

        return {
            "bridge_type": inputs.bridge_type,
            "span_length": inputs.span_length_m,
            "abutment_height": inputs.abutment_height_m,
            "abutment_width": inputs.abutment_width_m,
            "foundation_type": inputs.foundation_type,
            "soil_type": inputs.soil_type,
            "bearing_capacity": inputs.bearing_capacity_kpa,
            "concrete_grade": inputs.concrete_grade,
            "reinforcement_grade": inputs.reinforcement_grade,
            "number_of_load_cases": len(inputs.load_cases),
            "analysis_options": {
                "wind_loads": inputs.include_wind_loads,
                "earthquake_loads": inputs.include_earthquake_loads,
                "temperature_effects": inputs.include_temperature_effects
            }
        }

    def _generate_load_combinations(self, inputs: AbutmentsInputs) -> Dict[str, Any]:
        """Generate ULS and SLS load combinations"""

        combinations = {
            "ULS": {},
            "SLS": {}
        }

        # Calculate maximum loads for ULS combinations
        max_dead = max(lc.dead_load for lc in inputs.load_cases)
        max_live = max(lc.live_load for lc in inputs.load_cases)
        max_wind = max(lc.wind_load for lc in inputs.load_cases) if inputs.include_wind_loads else 0
        max_earthquake = max(lc.earthquake_load for lc in inputs.load_cases) if inputs.include_earthquake_loads else 0
        max_temperature = max(abs(lc.temperature_load) for lc in inputs.load_cases) if inputs.include_temperature_effects else 0
        max_braking = max(abs(lc.braking_force) for lc in inputs.load_cases)

        # ULS Combination 1: Dead + Live + Wind/Earthquake
        combinations["ULS"]["combination_1"] = {
            "dead_load": max_dead * inputs.partial_safety_gamma_g,
            "live_load": max_live * inputs.partial_safety_gamma_q,
            "wind_load": max_wind * inputs.partial_safety_gamma_q,
            "earthquake_load": max_earthquake * inputs.partial_safety_gamma_q,
            "temperature_load": max_temperature * inputs.partial_safety_gamma_q,
            "braking_force": max_braking * inputs.partial_safety_gamma_q
        }

        # ULS Combination 2: Dead + Live + Temperature
        combinations["ULS"]["combination_2"] = {
            "dead_load": max_dead * inputs.partial_safety_gamma_g,
            "live_load": max_live * inputs.partial_safety_gamma_q,
            "wind_load": 0,
            "earthquake_load": 0,
            "temperature_load": max_temperature * inputs.partial_safety_gamma_q,
            "braking_force": max_braking * inputs.partial_safety_gamma_q
        }

        # SLS combinations (serviceability limit state)
        combinations["SLS"]["characteristic"] = {
            "dead_load": max_dead,
            "live_load": max_live,
            "wind_load": max_wind,
            "earthquake_load": max_earthquake,
            "temperature_load": max_temperature,
            "braking_force": max_braking
        }

        return combinations

    def _design_foundation(self, inputs: AbutmentsInputs, load_combinations: Dict[str, Any]) -> Dict[str, Any]:
        """Design foundation dimensions"""

        # Get ULS loads
        uls_loads = load_combinations["ULS"]["combination_1"]
        total_vertical_load = uls_loads["dead_load"] + uls_loads["live_load"]

        # Calculate required foundation area for bearing
        required_area_m2 = total_vertical_load * 1000 / (inputs.bearing_capacity_kpa * inputs.partial_safety_gamma_r)

        # Assume square foundation for simplicity
        foundation_side_m = math.sqrt(required_area_m2)

        # Round up to reasonable dimensions
        foundation_length_m = math.ceil(foundation_side_m * 10) / 10
        foundation_width_m = foundation_length_m
        foundation_area_m2 = foundation_length_m * foundation_width_m

        # Calculate foundation depth (simplified)
        foundation_depth_m = max(1.0, inputs.abutment_height_m * 0.3)

        return {
            "type": inputs.foundation_type,
            "length_m": foundation_length_m,
            "width_m": foundation_width_m,
            "depth_m": foundation_depth_m,
            "area_m2": foundation_area_m2,
            "volume_m3": foundation_area_m2 * foundation_depth_m,
            "required_bearing_area_m2": required_area_m2,
            "soil_bearing_capacity_kpa": inputs.bearing_capacity_kpa,
            "design_bearing_capacity_kpa": inputs.bearing_capacity_kpa / inputs.partial_safety_gamma_r
        }

    def _perform_foundation_checks(self, inputs: AbutmentsInputs, load_combinations: Dict[str, Any],
                                 foundation_dimensions: Dict[str, Any]) -> List[FoundationCheck]:
        """Perform foundation capacity checks"""

        checks = []
        uls_loads = load_combinations["ULS"]["combination_1"]

        total_vertical_load = uls_loads["dead_load"] + uls_loads["live_load"]
        total_horizontal_load = uls_loads["wind_load"] + uls_loads["earthquake_load"] + uls_loads["braking_force"]

        foundation_area = foundation_dimensions["area_m2"]
        foundation_length = foundation_dimensions["length_m"]

        # Bearing capacity check
        bearing_demand = total_vertical_load * 1000  # Convert to N
        bearing_capacity = foundation_area * inputs.bearing_capacity_kpa * 1000  # Convert to N
        bearing_capacity_design = bearing_capacity / inputs.partial_safety_gamma_r
        bearing_utilization = bearing_demand / bearing_capacity_design

        checks.append(FoundationCheck(
            check_type="bearing_capacity",
            demand=bearing_demand / 1000,  # Convert back to kN
            capacity=bearing_capacity_design / 1000,
            utilization=bearing_utilization,
            status="PASS" if bearing_utilization <= 1.0 else "FAIL"
        ))

        # Sliding stability check
        sliding_resistance = total_vertical_load * 0.4  # Assume friction coefficient of 0.4
        sliding_demand = total_horizontal_load
        sliding_utilization = sliding_demand / sliding_resistance

        checks.append(FoundationCheck(
            check_type="sliding_stability",
            demand=sliding_demand,
            capacity=sliding_resistance,
            utilization=sliding_utilization,
            status="PASS" if sliding_utilization <= 1.0 else "FAIL"
        ))

        # Overturning stability check
        # Simplified - assume loads act at center and edge
        stabilizing_moment = total_vertical_load * (foundation_length / 2)
        overturning_moment = total_horizontal_load * (inputs.abutment_height_m / 2)
        stability_ratio = stabilizing_moment / overturning_moment

        checks.append(FoundationCheck(
            check_type="overturning_stability",
            demand=overturning_moment,
            capacity=stabilizing_moment,
            utilization=1.0 / stability_ratio,
            status="PASS" if stability_ratio >= 1.5 else "FAIL"
        ))

        return checks

    def _design_abutment_structure(self, inputs: AbutmentsInputs, load_combinations: Dict[str, Any]) -> Dict[str, Any]:
        """Design abutment structural elements"""

        uls_loads = load_combinations["ULS"]["combination_1"]

        # Simplified abutment design
        stem_thickness_m = max(0.4, inputs.abutment_height_m / 20)
        base_thickness_m = max(0.6, inputs.abutment_height_m / 15)

        # Calculate moments and shears (simplified)
        max_moment_kNm = uls_loads["live_load"] * inputs.span_length_m / 8  # Simplified cantilever moment
        max_shear_kN = uls_loads["live_load"] * 0.6  # Simplified shear

        return {
            "stem_thickness_m": stem_thickness_m,
            "base_thickness_m": base_thickness_m,
            "wing_wall_length_m": inputs.abutment_width_m * 0.8,
            "design_moment_kNm": max_moment_kNm,
            "design_shear_kN": max_shear_kN,
            "concrete_volume_m3": inputs.abutment_height_m * inputs.abutment_width_m * stem_thickness_m,
            "material": inputs.concrete_grade
        }

    def _calculate_reinforcement(self, inputs: AbutmentsInputs, abutment_design: Dict[str, Any]) -> List[ReinforcementRequirement]:
        """Calculate reinforcement requirements"""

        requirements = []

        # Simplified reinforcement calculation
        concrete_strength = self._get_concrete_strength(inputs.concrete_grade)
        steel_strength = self._get_steel_strength(inputs.reinforcement_grade)

        # Stem reinforcement (longitudinal)
        stem_area_required = (abutment_design["design_moment_kNm"] * 1e6 * 0.8) / (steel_strength * 0.9 * inputs.abutment_height_m * 1000)
        stem_area_required = max(stem_area_required, 0.002 * inputs.abutment_width_m * inputs.abutment_height_m * 1e6)  # Minimum reinforcement

        requirements.append(ReinforcementRequirement(
            location="stem",
            direction="longitudinal",
            area_required_mm2=stem_area_required,
            area_provided_mm2=math.ceil(stem_area_required / 100) * 100,  # Round up to nearest 100 mm²
            bar_diameter_mm=20,
            bar_spacing_mm=150,
            number_of_bars=math.ceil(inputs.abutment_width_m * 1000 / 150)
        ))

        # Base reinforcement
        base_area_required = stem_area_required * 0.6  # Simplified

        requirements.append(ReinforcementRequirement(
            location="base",
            direction="longitudinal",
            area_required_mm2=base_area_required,
            area_provided_mm2=math.ceil(base_area_required / 100) * 100,
            bar_diameter_mm=16,
            bar_spacing_mm=200,
            number_of_bars=math.ceil(inputs.abutment_width_m * 1000 / 200)
        ))

        return requirements

    def _perform_stability_analysis(self, inputs: AbutmentsInputs, load_combinations: Dict[str, Any],
                                  foundation_dimensions: Dict[str, Any]) -> Dict[str, Any]:
        """Perform overall stability analysis"""

        uls_loads = load_combinations["ULS"]["combination_1"]

        # Calculate active and passive earth pressures
        backfill_pressure = inputs.backfill_density_knm3 * inputs.backfill_height_m
        active_pressure = 0.33 * backfill_pressure * inputs.backfill_height_m  # Simplified Rankine
        passive_pressure = 3.0 * backfill_pressure * inputs.backfill_height_m   # Simplified

        # Check against sliding
        driving_force = uls_loads["wind_load"] + uls_loads["earthquake_load"]
        resisting_force = (uls_loads["dead_load"] + uls_loads["live_load"]) * 0.4 + passive_pressure - active_pressure

        sliding_safety_factor = resisting_force / driving_force if driving_force > 0 else float('inf')

        # Check against overturning
        stabilizing_moment = (uls_loads["dead_load"] + uls_loads["live_load"]) * (foundation_dimensions["length_m"] / 2)
        overturning_moment = driving_force * (inputs.abutment_height_m / 2) + active_pressure * (inputs.backfill_height_m / 3)

        overturning_safety_factor = stabilizing_moment / overturning_moment if overturning_moment > 0 else float('inf')

        return {
            "active_earth_pressure_kN": active_pressure,
            "passive_earth_pressure_kN": passive_pressure,
            "sliding_safety_factor": sliding_safety_factor,
            "overturning_safety_factor": overturning_safety_factor,
            "sliding_status": "STABLE" if sliding_safety_factor >= 1.5 else "UNSTABLE",
            "overturning_status": "STABLE" if overturning_safety_factor >= 2.0 else "UNSTABLE",
            "backfill_pressure_kPa": backfill_pressure
        }

    def _generate_recommendations(self, foundation_checks: List[FoundationCheck],
                                stability_analysis: Dict[str, Any]) -> List[str]:
        """Generate design recommendations"""

        recommendations = []

        # Foundation recommendations
        for check in foundation_checks:
            if check.status == "FAIL":
                if check.check_type == "bearing_capacity":
                    recommendations.append("Increase foundation area or improve soil conditions")
                elif check.check_type == "sliding_stability":
                    recommendations.append("Add shear keys or increase foundation weight")
                elif check.check_type == "overturning_stability":
                    recommendations.append("Increase foundation depth or add counterweight")

        # Stability recommendations
        if stability_analysis["sliding_status"] == "UNSTABLE":
            recommendations.append("Review abutment geometry or add stabilizing elements")

        if stability_analysis["overturning_status"] == "UNSTABLE":
            recommendations.append("Consider foundation anchors or increased base width")

        if not recommendations:
            recommendations.append("Abutment design appears satisfactory for the applied loads")

        return recommendations

    def _generate_warnings_and_notes(self, inputs: AbutmentsInputs,
                                   foundation_checks: List[FoundationCheck],
                                   stability_analysis: Dict[str, Any]) -> tuple:
        """Generate warnings and notes"""

        warnings = []
        notes = []

        # Capacity warnings
        for check in foundation_checks:
            if check.status == "WARNING" or (check.status == "PASS" and check.utilization > 0.8):
                warnings.append(f"High {check.check_type.replace('_', ' ')} utilization ({check.utilization:.2f})")

        # Stability warnings
        if stability_analysis["sliding_safety_factor"] < 2.0:
            warnings.append("Low sliding safety factor - consider additional measures")

        if stability_analysis["overturning_safety_factor"] < 2.5:
            warnings.append("Low overturning safety factor - review foundation design")

        # Notes about assumptions
        notes.append("Calculations based on EN 1992-1-1 and EN 1997-1")
        notes.append(f"Bridge type: {inputs.bridge_type.replace('_', ' ')}")
        notes.append(f"Foundation type: {inputs.foundation_type.replace('_', ' ')}")
        notes.append(f"Soil type: {inputs.soil_type}")
        notes.append("Earth pressures calculated using simplified Rankine theory")
        notes.append("Dynamic effects not included in analysis")

        if inputs.include_earthquake_loads:
            notes.append("Earthquake loads included in analysis")

        return warnings, notes

    def _get_concrete_strength(self, grade: str) -> float:
        """Get concrete characteristic strength in MPa"""
        strengths = {
            "C20": 20,
            "C25": 25,
            "C30": 30,
            "C35": 35,
            "C40": 40
        }
        return strengths.get(grade, 30)

    def _get_steel_strength(self, grade: str) -> float:
        """Get steel characteristic strength in MPa"""
        strengths = {
            "B500B": 500,
            "B500C": 500
        }
        return strengths.get(grade, 500)


# Create calculator instance
calculator = AbutmentsCalculator()
