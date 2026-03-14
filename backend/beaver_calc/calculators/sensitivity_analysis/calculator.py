"""
Sensitivity Analysis Calculator
Advanced sensitivity analysis for structural calculations with parameter variation and impact assessment
"""

import time
import math
import statistics
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
from scipy import stats

from .schema import (
    SensitivityAnalysisInputs,
    SensitivityAnalysisOutputs,
    AnalysisType,
    VariationType,
    ParameterVariation,
    SensitivityAnalysisResults,
    SensitivityResult,
    ParameterImpact,
    TornadoData,
    MonteCarloResult,
    CorrelationMatrix
)


class SensitivityAnalysisCalculator:
    """Advanced sensitivity analysis calculator for structural engineering"""

    def __init__(self):
        # Import calculator modules dynamically
        self.calculator_modules = {}
        self._load_calculator_modules()

    def _load_calculator_modules(self):
        """Load available calculator modules"""
        try:
            # Import all calculator modules
            from ..composite_beam_design import calculate_composite_beam
            from ..deck_slab_design import calculate_deck_slab
            from ..transverse_members_design import calculate_transverse_members
            from ..bracing_design import calculate_bracing
            from ..bearing_reactions_design import calculate_bearing_reactions
            from ..elastomeric_bearings_design import calculate_elastomeric_bearings
            from ..movement_joints_design import calculate_movement_joints
            from ..member_ratings_design import calculate_member_ratings

            self.calculator_modules = {
                'composite_beam': calculate_composite_beam,
                'deck_slab': calculate_deck_slab,
                'transverse_members': calculate_transverse_members,
                'bracing': calculate_bracing,
                'bearing_reactions': calculate_bearing_reactions,
                'elastomeric_bearings': calculate_elastomeric_bearings,
                'movement_joints': calculate_movement_joints,
                'member_ratings': calculate_member_ratings,
            }
        except ImportError as e:
            print(f"Warning: Could not load calculator modules: {e}")

    def calculate(self, inputs: SensitivityAnalysisInputs) -> SensitivityAnalysisOutputs:
        """Main sensitivity analysis calculation method"""
        start_time = time.time()

        config = inputs.sensitivity_config

        # Get base case results
        base_results = self._run_base_calculation(config.calculator_key, config.base_inputs)

        # Perform sensitivity analysis based on type
        if config.analysis_type == AnalysisType.SINGLE_PARAMETER:
            results = self._single_parameter_analysis(config, base_results)
        elif config.analysis_type == AnalysisType.MULTI_PARAMETER:
            results = self._multi_parameter_analysis(config, base_results)
        elif config.analysis_type == AnalysisType.MONTE_CARLO:
            results = self._monte_carlo_analysis(config, base_results)
        elif config.analysis_type == AnalysisType.CORRELATION:
            results = self._correlation_analysis(config, base_results)
        else:
            raise ValueError(f"Unsupported analysis type: {config.analysis_type}")

        execution_time = time.time() - start_time
        total_calculations = sum(len(r.variation_values) for r in results.sensitivity_results)

        # Update results with metadata
        results.execution_time_seconds = execution_time
        results.total_calculations = total_calculations
        results.analysis_timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        # Generate recommendations and notes
        recommendations, warnings, notes = self._generate_feedback(results)

        return SensitivityAnalysisOutputs(
            results=results,
            recommendations=recommendations,
            warnings=warnings,
            notes=notes
        )

    def _run_base_calculation(self, calculator_key: str, inputs: Dict[str, Any]) -> Dict[str, float]:
        """Run base calculation and extract numeric outputs"""
        if calculator_key not in self.calculator_modules:
            raise ValueError(f"Calculator {calculator_key} not available")

        calculator_func = self.calculator_modules[calculator_key]

        # Create input object (this would need to be adapted based on calculator schema)
        # For now, we'll create a mock input object
        input_obj = type('MockInput', (), {'__dict__': inputs})()

        try:
            result = calculator_func(input_obj)

            # Extract numeric outputs (this is simplified - real implementation would parse result structure)
            numeric_outputs = {}
            if hasattr(result, 'results'):
                result_data = result.results
                if hasattr(result_data, '__dict__'):
                    for key, value in result_data.__dict__.items():
                        if isinstance(value, (int, float)):
                            numeric_outputs[key] = float(value)
                elif isinstance(result_data, dict):
                    for key, value in result_data.items():
                        if isinstance(value, (int, float)):
                            numeric_outputs[key] = float(value)

            return numeric_outputs

        except Exception as e:
            raise ValueError(f"Failed to run base calculation: {e}")

    def _single_parameter_analysis(self, config, base_results: Dict[str, float]) -> SensitivityAnalysisResults:
        """Perform single parameter sensitivity analysis"""
        param_variation = config.parameters_to_vary[0]
        parameter_name = param_variation.parameter_name

        # Generate parameter values
        param_values = self._generate_parameter_values(
            config.base_inputs.get(parameter_name, 0),
            param_variation
        )

        # Run calculations for each parameter value
        output_results = {output: [] for output in config.output_parameters}

        for param_value in param_values:
            # Create modified inputs
            modified_inputs = config.base_inputs.copy()
            modified_inputs[parameter_name] = param_value

            try:
                results = self._run_base_calculation(config.calculator_key, modified_inputs)

                for output_param in config.output_parameters:
                    value = results.get(output_param, 0)
                    output_results[output_param].append(value)

            except Exception as e:
                # If calculation fails, use base values
                for output_param in config.output_parameters:
                    output_results[output_param].append(base_results.get(output_param, 0))

        # Calculate statistics
        statistics_data = {}
        for output_param in config.output_parameters:
            values = output_results[output_param]
            statistics_data[output_param] = {
                'mean': statistics.mean(values),
                'std_dev': statistics.stdev(values) if len(values) > 1 else 0,
                'min': min(values),
                'max': max(values),
                'range': max(values) - min(values)
            }

        sensitivity_result = SensitivityResult(
            parameter_name=parameter_name,
            variation_values=param_values,
            output_results=output_results,
            statistics=statistics_data
        )

        # Calculate parameter impacts
        parameter_impacts = []
        for i, output_param in enumerate(config.output_parameters):
            impact = self._calculate_parameter_impact(
                parameter_name, output_param, param_values, output_results[output_param]
            )
            parameter_impacts.append(impact)

        # Sort by impact magnitude
        parameter_impacts.sort(key=lambda x: abs(x.sensitivity_coefficient), reverse=True)
        for i, impact in enumerate(parameter_impacts):
            impact.impact_rank = i + 1

        # Generate tornado diagram data
        tornado_data = self._generate_tornado_data(parameter_name, param_values, output_results)

        return SensitivityAnalysisResults(
            analysis_type=config.analysis_type,
            base_case_results=base_results,
            parameter_impacts=parameter_impacts,
            sensitivity_results=[sensitivity_result],
            tornado_diagram_data=tornado_data
        )

    def _multi_parameter_analysis(self, config, base_results: Dict[str, float]) -> SensitivityAnalysisResults:
        """Perform multi-parameter sensitivity analysis"""
        sensitivity_results = []

        for param_variation in config.parameters_to_vary:
            parameter_name = param_variation.parameter_name

            # Generate parameter values
            param_values = self._generate_parameter_values(
                config.base_inputs.get(parameter_name, 0),
                param_variation
            )

            # Run calculations for each parameter value (keeping others at base)
            output_results = {output: [] for output in config.output_parameters}

            for param_value in param_values:
                modified_inputs = config.base_inputs.copy()
                modified_inputs[parameter_name] = param_value

                try:
                    results = self._run_base_calculation(config.calculator_key, modified_inputs)

                    for output_param in config.output_parameters:
                        value = results.get(output_param, 0)
                        output_results[output_param].append(value)

                except Exception:
                    for output_param in config.output_parameters:
                        output_results[output_param].append(base_results.get(output_param, 0))

            # Calculate statistics
            statistics_data = {}
            for output_param in config.output_parameters:
                values = output_results[output_param]
                statistics_data[output_param] = {
                    'mean': statistics.mean(values),
                    'std_dev': statistics.stdev(values) if len(values) > 1 else 0,
                    'min': min(values),
                    'max': max(values),
                    'range': max(values) - min(values)
                }

            sensitivity_result = SensitivityResult(
                parameter_name=parameter_name,
                variation_values=param_values,
                output_results=output_results,
                statistics=statistics_data
            )
            sensitivity_results.append(sensitivity_result)

        # Calculate parameter impacts for all parameters
        parameter_impacts = []
        for sensitivity_result in sensitivity_results:
            for output_param in config.output_parameters:
                impact = self._calculate_parameter_impact(
                    sensitivity_result.parameter_name,
                    output_param,
                    sensitivity_result.variation_values,
                    sensitivity_result.output_results[output_param]
                )
                parameter_impacts.append(impact)

        # Sort by impact magnitude
        parameter_impacts.sort(key=lambda x: abs(x.sensitivity_coefficient), reverse=True)
        for i, impact in enumerate(parameter_impacts):
            impact.impact_rank = i + 1

        return SensitivityAnalysisResults(
            analysis_type=config.analysis_type,
            base_case_results=base_results,
            parameter_impacts=parameter_impacts,
            sensitivity_results=sensitivity_results
        )

    def _monte_carlo_analysis(self, config, base_results: Dict[str, float]) -> SensitivityAnalysisResults:
        """Perform Monte Carlo sensitivity analysis"""
        # Generate random samples for each parameter
        num_samples = 1000  # Default sample count
        parameter_samples = {}

        for param_variation in config.parameters_to_vary:
            param_name = param_variation.parameter_name
            base_value = config.base_inputs.get(param_name, 0)

            if param_variation.variation_type == VariationType.PERCENTAGE:
                std_dev = base_value * (param_variation.percentage_range or 10) / 100
                samples = np.random.normal(base_value, std_dev, num_samples)
            else:
                # Use range if specified, otherwise default variation
                min_val = param_variation.min_value or (base_value * 0.9)
                max_val = param_variation.max_value or (base_value * 1.1)
                samples = np.random.uniform(min_val, max_val, num_samples)

            parameter_samples[param_name] = samples.tolist()

        # Run Monte Carlo simulations
        output_samples = {output: [] for output in config.output_parameters}

        for i in range(num_samples):
            # Create input sample
            sample_inputs = config.base_inputs.copy()
            for param_name, samples in parameter_samples.items():
                sample_inputs[param_name] = samples[i]

            try:
                results = self._run_base_calculation(config.calculator_key, sample_inputs)

                for output_param in config.output_parameters:
                    value = results.get(output_param, 0)
                    output_samples[output_param].append(value)

            except Exception:
                # Use base values if calculation fails
                for output_param in config.output_parameters:
                    output_samples[output_param].append(base_results.get(output_param, 0))

        # Calculate statistics
        output_statistics = {}
        confidence_intervals = {}
        probability_distributions = {}

        for output_param in config.output_parameters:
            values = output_samples[output_param]
            output_statistics[output_param] = {
                'mean': statistics.mean(values),
                'std_dev': statistics.stdev(values),
                'min': min(values),
                'max': max(values),
                'median': statistics.median(values),
                'percentile_5': np.percentile(values, 5),
                'percentile_95': np.percentile(values, 95)
            }

            confidence_intervals[output_param] = {
                '95_ci_lower': np.percentile(values, 2.5),
                '95_ci_upper': np.percentile(values, 97.5)
            }

            # Create probability distribution (simplified histogram)
            hist, bin_edges = np.histogram(values, bins=20, density=True)
            probability_distributions[output_param] = hist.tolist()

        # Calculate parameter correlations
        correlation_matrix = self._calculate_correlation_matrix(parameter_samples, output_samples)

        monte_carlo_results = MonteCarloResult(
            sample_count=num_samples,
            parameter_distributions={param: {'mean': statistics.mean(samples), 'std_dev': statistics.stdev(samples)}
                                   for param, samples in parameter_samples.items()},
            output_statistics=output_statistics,
            confidence_intervals=confidence_intervals,
            probability_distributions=probability_distributions
        )

        return SensitivityAnalysisResults(
            analysis_type=config.analysis_type,
            base_case_results=base_results,
            parameter_impacts=[],  # Monte Carlo doesn't use traditional parameter impacts
            sensitivity_results=[],
            monte_carlo_results=monte_carlo_results,
            correlation_matrix=correlation_matrix
        )

    def _correlation_analysis(self, config, base_results: Dict[str, float]) -> SensitivityAnalysisResults:
        """Perform correlation analysis between parameters"""
        # Generate correlated parameter variations
        num_samples = 500
        parameter_samples = {}

        for param_variation in config.parameters_to_vary:
            param_name = param_variation.parameter_name
            base_value = config.base_inputs.get(param_name, 0)

            if param_variation.variation_type == VariationType.PERCENTAGE:
                std_dev = base_value * (param_variation.percentage_range or 10) / 100
                samples = np.random.normal(base_value, std_dev, num_samples)
            else:
                min_val = param_variation.min_value or (base_value * 0.9)
                max_val = param_variation.max_value or (base_value * 1.1)
                samples = np.random.uniform(min_val, max_val, num_samples)

            parameter_samples[param_name] = samples.tolist()

        # Run calculations
        output_samples = {output: [] for output in config.output_parameters}

        for i in range(num_samples):
            sample_inputs = config.base_inputs.copy()
            for param_name, samples in parameter_samples.items():
                sample_inputs[param_name] = samples[i]

            try:
                results = self._run_base_calculation(config.calculator_key, sample_inputs)

                for output_param in config.output_parameters:
                    value = results.get(output_param, 0)
                    output_samples[output_param].append(value)

            except Exception:
                for output_param in config.output_parameters:
                    output_samples[output_param].append(base_results.get(output_param, 0))

        # Calculate correlation matrix
        correlation_matrix = self._calculate_correlation_matrix(parameter_samples, output_samples)

        return SensitivityAnalysisResults(
            analysis_type=config.analysis_type,
            base_case_results=base_results,
            parameter_impacts=[],
            sensitivity_results=[],
            correlation_matrix=correlation_matrix
        )

    def _generate_parameter_values(self, base_value: float, variation: ParameterVariation) -> List[float]:
        """Generate parameter values based on variation configuration"""
        if variation.variation_type == VariationType.PERCENTAGE:
            percentage = variation.percentage_range or 10
            min_val = base_value * (1 - percentage / 100)
            max_val = base_value * (1 + percentage / 100)
        elif variation.variation_type == VariationType.RANGE:
            min_val = variation.min_value or base_value * 0.9
            max_val = variation.max_value or base_value * 1.1
        else:  # ABSOLUTE
            range_size = abs(base_value) * 0.1 if base_value != 0 else 1
            min_val = base_value - range_size
            max_val = base_value + range_size

        return np.linspace(min_val, max_val, variation.step_count).tolist()

    def _calculate_parameter_impact(self, param_name: str, output_name: str,
                                  param_values: List[float], output_values: List[float]) -> ParameterImpact:
        """Calculate sensitivity impact for a parameter-output pair"""
        try:
            # Calculate sensitivity coefficient (normalized slope)
            slope, intercept, r_value, p_value, std_err = stats.linregress(param_values, output_values)

            # Normalize sensitivity coefficient
            param_range = max(param_values) - min(param_values)
            output_range = max(output_values) - min(output_values)

            if param_range > 0 and output_range > 0:
                sensitivity_coeff = slope * (param_range / output_range)
            else:
                sensitivity_coeff = 0

            return ParameterImpact(
                parameter_name=param_name,
                output_parameter=output_name,
                sensitivity_coefficient=sensitivity_coeff,
                correlation_coefficient=r_value ** 2,
                impact_rank=0,  # Will be set later
                variation_range={
                    'min': min(param_values),
                    'max': max(param_values),
                    'range': param_range
                },
                output_range={
                    'min': min(output_values),
                    'max': max(output_values),
                    'range': output_range
                }
            )
        except Exception:
            return ParameterImpact(
                parameter_name=param_name,
                output_parameter=output_name,
                sensitivity_coefficient=0,
                correlation_coefficient=0,
                impact_rank=0,
                variation_range={'min': min(param_values), 'max': max(param_values), 'range': 0},
                output_range={'min': min(output_values), 'max': max(output_values), 'range': 0}
            )

    def _generate_tornado_data(self, param_name: str, param_values: List[float],
                             output_results: Dict[str, List[float]]) -> List[TornadoData]:
        """Generate data for tornado diagrams"""
        tornado_data = []

        low_val = min(param_values)
        high_val = max(param_values)

        # Get outputs at low and high parameter values
        low_index = param_values.index(low_val)
        high_index = param_values.index(high_val)

        for output_param in output_results.keys():
            output_low = output_results[output_param][low_index]
            output_high = output_results[output_param][high_index]

            tornado_data.append(TornadoData(
                parameter_name=param_name,
                low_value=low_val,
                high_value=str(high_val),  # Convert to string for schema compatibility
                output_low={output_param: output_low},
                output_high={output_param: output_high},
                impact_magnitude={output_param: abs(output_high - output_low)}
            ))

        return tornado_data

    def _calculate_correlation_matrix(self, parameter_samples: Dict[str, List[float]],
                                    output_samples: Dict[str, List[float]]) -> CorrelationMatrix:
        """Calculate correlation matrix between all parameters and outputs"""
        all_variables = {**parameter_samples, **output_samples}
        variable_names = list(all_variables.keys())

        # Create data matrix
        data_matrix = np.array([all_variables[name] for name in variable_names])

        # Calculate correlation matrix
        correlation_matrix = np.corrcoef(data_matrix)

        # Calculate significance levels (simplified)
        n_samples = len(next(iter(parameter_samples.values())))
        significance_levels = []

        for i in range(len(variable_names)):
            row = []
            for j in range(len(variable_names)):
                # Simplified significance calculation
                r = correlation_matrix[i, j]
                t_stat = r * math.sqrt((n_samples - 2) / (1 - r**2))
                p_value = 2 * (1 - stats.t.cdf(abs(t_stat), n_samples - 2))
                row.append(p_value)
            significance_levels.append(row)

        return CorrelationMatrix(
            parameters=variable_names,
            correlation_matrix=correlation_matrix.tolist(),
            significance_levels=significance_levels
        )

    def _generate_feedback(self, results: SensitivityAnalysisResults) -> Tuple[List[str], List[str], List[str]]:
        """Generate recommendations, warnings, and notes"""
        recommendations = []
        warnings = []
        notes = []

        if results.parameter_impacts:
            # Find most sensitive parameters
            top_impacts = sorted(results.parameter_impacts,
                               key=lambda x: abs(x.sensitivity_coefficient),
                               reverse=True)[:3]

            recommendations.append("Focus design verification on the most sensitive parameters:")
            for impact in top_impacts:
                recommendations.append(f"- {impact.parameter_name} (sensitivity: {impact.sensitivity_coefficient:.3f})")

        if results.monte_carlo_results:
            mc_results = results.monte_carlo_results
            for output_param, stats in mc_results.output_statistics.items():
                cv = stats['std_dev'] / stats['mean'] if stats['mean'] != 0 else 0
                if cv > 0.2:  # High variability
                    warnings.append(f"High variability in {output_param} (CV = {cv:.2f}) - consider additional analysis")

        if results.correlation_matrix:
            # Check for high correlations
            corr_matrix = results.correlation_matrix.correlation_matrix
            param_names = results.correlation_matrix.parameters

            for i in range(len(param_names)):
                for j in range(i + 1, len(param_names)):
                    if abs(corr_matrix[i][j]) > 0.8:
                        notes.append(f"High correlation between {param_names[i]} and {param_names[j]} (r = {corr_matrix[i][j]:.2f})")

        notes.append(f"Analysis completed in {results.execution_time_seconds:.2f} seconds")
        notes.append(f"Total calculations performed: {results.total_calculations}")

        return recommendations, warnings, notes


# Factory function
def calculate_sensitivity_analysis(inputs: SensitivityAnalysisInputs) -> SensitivityAnalysisOutputs:
    """Calculate sensitivity analysis"""
    calculator = SensitivityAnalysisCalculator()
    return calculator.calculate(inputs)
