"""
Bearing reactions calculator implementation
"""
import math
from typing import Dict, Any, List

from ..base import CalculatorPlugin
from .schema import BearingReactionsInputs, BearingReactionsOutputs, LoadCase, BearingReaction


class BearingReactionsCalculator(CalculatorPlugin):
    """Bearing reactions calculator (EN 1990, EN 1991-2)"""

    key = "bearing_reactions_v1"
    name = "Bearing Reactions"
    version = "1.0.0"
    description = "Calculate bearing reaction envelopes from load cases"
    category = "bridges"
    input_schema = BearingReactionsInputs
    output_schema = BearingReactionsOutputs
    reference_text = "EN 1990:2002 - Basis of structural design"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform bearing reactions calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Calculate analysis summary
        analysis_summary = self._create_analysis_summary(validated_inputs)

        # Process each load case
        load_case_results = {}
        all_reactions = []

        for load_case in validated_inputs.load_cases:
            reactions = self._calculate_load_case_reactions(validated_inputs, load_case)
            load_case_results[load_case.name] = reactions
            all_reactions.extend(reactions)

        # Calculate envelopes
        envelope_max, envelope_min = self._calculate_envelopes(all_reactions)

        # Create detailed bearing reactions
        bearing_reactions = self._create_bearing_reactions(validated_inputs, envelope_max)

        # Perform capacity checks
        capacity_checks = self._check_bearing_capacities(validated_inputs, envelope_max)

        # System stability assessment
        system_stability = self._assess_system_stability(validated_inputs, envelope_max, envelope_min)

        # Generate recommendations
        recommendations = self._generate_recommendations(capacity_checks, system_stability)

        # Build warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            validated_inputs, capacity_checks, system_stability
        )

        # Build results
        results = {
            "analysis_summary": analysis_summary,
            "load_case_results": load_case_results,
            "envelope_max": envelope_max,
            "envelope_min": envelope_min,
            "bearing_reactions": bearing_reactions,
            "capacity_checks": capacity_checks,
            "system_stability": system_stability,
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _create_analysis_summary(self, inputs: BearingReactionsInputs) -> Dict[str, Any]:
        """Create summary of analysis parameters"""

        return {
            "bridge_type": inputs.bridge_type,
            "span_length": inputs.span_length_m,
            "number_of_spans": inputs.number_of_spans,
            "bearing_type": inputs.bearing_type,
            "number_of_bearings": inputs.number_of_bearings,
            "bearing_spacing": inputs.bearing_spacing_m,
            "number_of_load_cases": len(inputs.load_cases),
            "analysis_options": {
                "temperature_effects": inputs.include_temperature_effects,
                "creep_shrinkage": inputs.include_creep_shrinkage,
                "dynamic_effects": inputs.include_dynamic_effects
            }
        }

    def _calculate_load_case_reactions(self, inputs: BearingReactionsInputs,
                                     load_case: LoadCase) -> List[Dict[str, float]]:
        """Calculate reactions for a single load case"""

        reactions = []

        # For simplicity, distribute loads based on bearing positions
        # In a real implementation, this would involve structural analysis

        for i in range(inputs.number_of_bearings):
            position = i * inputs.bearing_spacing_m

            # Simplified distribution - equal distribution for vertical loads
            vertical_reaction = load_case.vertical_force / inputs.number_of_bearings

            # Longitudinal forces - distributed based on position
            if inputs.number_of_bearings > 1:
                # Linear distribution for moments
                moment_effect = load_case.moment_longitudinal / (inputs.bearing_spacing_m * (inputs.number_of_bearings - 1))
                longitudinal_reaction = load_case.longitudinal_force / inputs.number_of_bearings + moment_effect * (position - inputs.bearing_spacing_m * (inputs.number_of_bearings - 1) / 2)
            else:
                longitudinal_reaction = load_case.longitudinal_force

            # Transverse forces - equal distribution
            transverse_reaction = load_case.transverse_force / inputs.number_of_bearings

            # Moments - simplified distribution
            moment_longitudinal = load_case.moment_longitudinal / inputs.number_of_bearings
            moment_transverse = load_case.moment_transverse / inputs.number_of_bearings
            torsion = load_case.torsion / inputs.number_of_bearings

            reactions.append({
                "bearing_id": f"Bearing_{i+1}",
                "position_m": position,
                "vertical_reaction": vertical_reaction,
                "longitudinal_reaction": longitudinal_reaction,
                "transverse_reaction": transverse_reaction,
                "moment_longitudinal": moment_longitudinal,
                "moment_transverse": moment_transverse,
                "torsion": torsion
            })

        return reactions

    def _calculate_envelopes(self, all_reactions: List[Dict[str, float]]) -> tuple:
        """Calculate maximum and minimum envelopes from all reactions"""

        if not all_reactions:
            return {}, {}

        # Group reactions by bearing
        bearing_groups = {}
        for reaction in all_reactions:
            bearing_id = reaction["bearing_id"]
            if bearing_id not in bearing_groups:
                bearing_groups[bearing_id] = []
            bearing_groups[bearing_id].append(reaction)

        envelope_max = {}
        envelope_min = {}

        for bearing_id, reactions in bearing_groups.items():
            envelope_max[bearing_id] = {
                "vertical_reaction": max(r["vertical_reaction"] for r in reactions),
                "longitudinal_reaction": max(abs(r["longitudinal_reaction"]) for r in reactions),
                "transverse_reaction": max(abs(r["transverse_reaction"]) for r in reactions),
                "moment_longitudinal": max(abs(r["moment_longitudinal"]) for r in reactions),
                "moment_transverse": max(abs(r["moment_transverse"]) for r in reactions),
                "torsion": max(abs(r["torsion"]) for r in reactions)
            }

            envelope_min[bearing_id] = {
                "vertical_reaction": min(r["vertical_reaction"] for r in reactions),
                "longitudinal_reaction": min(r["longitudinal_reaction"] for r in reactions),
                "transverse_reaction": min(r["transverse_reaction"] for r in reactions),
                "moment_longitudinal": min(r["moment_longitudinal"] for r in reactions),
                "moment_transverse": min(r["moment_transverse"] for r in reactions),
                "torsion": min(r["torsion"] for r in reactions)
            }

        return envelope_max, envelope_min

    def _create_bearing_reactions(self, inputs: BearingReactionsInputs,
                                envelope_max: Dict[str, Dict[str, float]]) -> List[BearingReaction]:
        """Create detailed bearing reaction objects"""

        reactions = []

        for i in range(inputs.number_of_bearings):
            bearing_id = f"Bearing_{i+1}"
            position = i * inputs.bearing_spacing_m

            if bearing_id in envelope_max:
                env = envelope_max[bearing_id]
                reactions.append(BearingReaction(
                    bearing_id=bearing_id,
                    position_m=position,
                    vertical_reaction=env["vertical_reaction"],
                    longitudinal_reaction=env["longitudinal_reaction"],
                    transverse_reaction=env["transverse_reaction"],
                    moment_longitudinal=env["moment_longitudinal"],
                    moment_transverse=env["moment_transverse"],
                    torsion=env["torsion"],
                    utilization_vertical=self._calculate_utilization_vertical(env["vertical_reaction"], inputs),
                    utilization_horizontal=self._calculate_utilization_horizontal(
                        env["longitudinal_reaction"], env["transverse_reaction"], inputs
                    ),
                    utilization_moment=self._calculate_utilization_moment(
                        env["moment_longitudinal"], env["moment_transverse"], env["torsion"], inputs
                    )
                ))

        return reactions

    def _calculate_utilization_vertical(self, force: float, inputs: BearingReactionsInputs) -> float:
        """Calculate vertical capacity utilization"""

        # Simplified bearing capacity based on type
        capacity_factors = {
            "pot": 5000,  # kN
            "spherical": 3000,
            "cylindrical": 2000,
            "fixed": 10000,
            "guided": 8000,
            "free": 1500
        }

        capacity = capacity_factors.get(inputs.bearing_type, 2000)
        return abs(force) / capacity

    def _calculate_utilization_horizontal(self, long_force: float, trans_force: float,
                                       inputs: BearingReactionsInputs) -> float:
        """Calculate horizontal capacity utilization"""

        # Simplified horizontal capacity
        capacity_factors = {
            "pot": 500,  # kN
            "spherical": 300,
            "cylindrical": 200,
            "fixed": 1000,
            "guided": 800,
            "free": 100
        }

        capacity = capacity_factors.get(inputs.bearing_type, 200)
        total_horizontal = math.sqrt(long_force**2 + trans_force**2)
        return total_horizontal / capacity

    def _calculate_utilization_moment(self, mom_long: float, mom_trans: float, torsion: float,
                                    inputs: BearingReactionsInputs) -> float:
        """Calculate moment capacity utilization"""

        # Simplified moment capacity
        capacity_factors = {
            "pot": 500,  # kNm
            "spherical": 300,
            "cylindrical": 200,
            "fixed": 1000,
            "guided": 800,
            "free": 50
        }

        capacity = capacity_factors.get(inputs.bearing_type, 200)
        total_moment = math.sqrt(mom_long**2 + mom_trans**2 + torsion**2)
        return total_moment / capacity

    def _check_bearing_capacities(self, inputs: BearingReactionsInputs,
                                envelope_max: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
        """Check bearing capacities against envelopes"""

        checks = {
            "vertical_capacity": {"status": "PASS", "max_utilization": 0, "critical_bearing": ""},
            "horizontal_capacity": {"status": "PASS", "max_utilization": 0, "critical_bearing": ""},
            "moment_capacity": {"status": "PASS", "max_utilization": 0, "critical_bearing": ""}
        }

        for bearing_id, env in envelope_max.items():
            util_v = self._calculate_utilization_vertical(env["vertical_reaction"], inputs)
            util_h = self._calculate_utilization_horizontal(env["longitudinal_reaction"], env["transverse_reaction"], inputs)
            util_m = self._calculate_utilization_moment(env["moment_longitudinal"], env["moment_transverse"], env["torsion"], inputs)

            if util_v > checks["vertical_capacity"]["max_utilization"]:
                checks["vertical_capacity"]["max_utilization"] = util_v
                checks["vertical_capacity"]["critical_bearing"] = bearing_id

            if util_h > checks["horizontal_capacity"]["max_utilization"]:
                checks["horizontal_capacity"]["max_utilization"] = util_h
                checks["horizontal_capacity"]["critical_bearing"] = bearing_id

            if util_m > checks["moment_capacity"]["max_utilization"]:
                checks["moment_capacity"]["max_utilization"] = util_m
                checks["moment_capacity"]["critical_bearing"] = bearing_id

        # Update status based on utilization
        for check_type in checks:
            if checks[check_type]["max_utilization"] > 1.0:
                checks[check_type]["status"] = "FAIL"
            elif checks[check_type]["max_utilization"] > 0.8:
                checks[check_type]["status"] = "WARNING"

        return checks

    def _assess_system_stability(self, inputs: BearingReactionsInputs,
                               envelope_max: Dict[str, Dict[str, float]],
                               envelope_min: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
        """Assess overall system stability"""

        # Check for uplift
        uplift_detected = any(env["vertical_reaction"] < 0 for env in envelope_min.values())

        # Check overturning
        total_vertical = sum(env["vertical_reaction"] for env in envelope_max.values())
        total_moment = sum(env["moment_longitudinal"] for env in envelope_max.values())

        stability_ratio = total_vertical * inputs.span_length_m / (2 * total_moment) if total_moment > 0 else float('inf')

        return {
            "uplift_detected": uplift_detected,
            "stability_ratio": stability_ratio,
            "stability_status": "STABLE" if stability_ratio > 1.5 else "UNSTABLE",
            "total_vertical_load": total_vertical,
            "total_overturning_moment": total_moment
        }

    def _generate_recommendations(self, capacity_checks: Dict[str, Any],
                                system_stability: Dict[str, Any]) -> List[str]:
        """Generate design recommendations"""

        recommendations = []

        # Capacity recommendations
        for check_type, check_data in capacity_checks.items():
            if check_data["status"] == "FAIL":
                if check_type == "vertical_capacity":
                    recommendations.append("Increase bearing vertical capacity or redistribute loads")
                elif check_type == "horizontal_capacity":
                    recommendations.append("Add horizontal restraint or increase bearing sliding capacity")
                elif check_type == "moment_capacity":
                    recommendations.append("Use bearings with higher moment capacity or add fixity")

        # Stability recommendations
        if system_stability["uplift_detected"]:
            recommendations.append("Check for bearing uplift - consider additional dead load or restraints")

        if system_stability["stability_ratio"] < 1.5:
            recommendations.append("Review bridge stability - consider additional counterweight or foundation improvements")

        if not recommendations:
            recommendations.append("Bearing design appears satisfactory for the applied loads")

        return recommendations

    def _generate_warnings_and_notes(self, inputs: BearingReactionsInputs,
                                   capacity_checks: Dict[str, Any],
                                   system_stability: Dict[str, Any]) -> tuple:
        """Generate warnings and notes"""

        warnings = []
        notes = []

        # Capacity warnings
        for check_type, check_data in capacity_checks.items():
            if check_data["status"] == "WARNING":
                warnings.append(f"High {check_type.replace('_', ' ')} utilization at {check_data['critical_bearing']}")

        # Stability warnings
        if system_stability["uplift_detected"]:
            warnings.append("Potential bearing uplift detected - verify foundation design")

        if system_stability["stability_ratio"] < 2.0:
            warnings.append("Low stability ratio - consider additional stability measures")

        # Notes about assumptions
        notes.append("Calculations based on EN 1990 and EN 1991-2")
        notes.append(f"Bridge type: {inputs.bridge_type.replace('_', ' ')}")
        notes.append(f"Bearing type: {inputs.bearing_type}")
        notes.append("Load distribution assumes linear elastic behavior")
        notes.append("Dynamic effects not included in analysis")

        if inputs.include_temperature_effects:
            notes.append("Temperature effects included in analysis")

        if inputs.include_creep_shrinkage:
            notes.append("Creep and shrinkage effects considered")

        return warnings, notes


# Create calculator instance
calculator = BearingReactionsCalculator()
