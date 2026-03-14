"""
Sensitivity Analysis Calculator Schema
Advanced sensitivity analysis for structural calculations with parameter variation and impact assessment
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from pint import UnitRegistry

# Initialize unit registry
ureg = UnitRegistry()
Q_ = ureg.Quantity


class AnalysisType(str, Enum):
    SINGLE_PARAMETER = "single_parameter"
    MULTI_PARAMETER = "multi_parameter"
    MONTE_CARLO = "monte_carlo"
    CORRELATION = "correlation"


class VariationType(str, Enum):
    PERCENTAGE = "percentage"
    ABSOLUTE = "absolute"
    RANGE = "range"


class ParameterVariation(BaseModel):
    parameter_name: str = Field(..., description="Name of the parameter to vary")
    variation_type: VariationType = Field(..., description="Type of variation to apply")
    min_value: Optional[float] = Field(None, description="Minimum value for range variation")
    max_value: Optional[float] = Field(None, description="Maximum value for range variation")
    step_count: int = Field(10, description="Number of steps for analysis", ge=2, le=100)
    percentage_range: Optional[float] = Field(None, description="Percentage range for variation (±%)", ge=0, le=100)


class SensitivityInput(BaseModel):
    calculator_key: str = Field(..., description="Key of the calculator to analyze")
    base_inputs: Dict[str, Any] = Field(..., description="Base input values for the calculator")
    analysis_type: AnalysisType = Field(AnalysisType.SINGLE_PARAMETER, description="Type of sensitivity analysis")
    parameters_to_vary: List[ParameterVariation] = Field(..., description="Parameters to vary in analysis", min_items=1)
    output_parameters: List[str] = Field(..., description="Output parameters to track", min_items=1)

    @validator('parameters_to_vary')
    def validate_parameters(cls, v, values):
        if values.get('analysis_type') == AnalysisType.SINGLE_PARAMETER and len(v) != 1:
            raise ValueError('Single parameter analysis requires exactly one parameter')
        if values.get('analysis_type') == AnalysisType.MULTI_PARAMETER and len(v) < 2:
            raise ValueError('Multi parameter analysis requires at least two parameters')
        return v

    @validator('parameters_to_vary')
    def validate_variation_config(cls, v):
        for param in v:
            if param.variation_type == VariationType.PERCENTAGE and param.percentage_range is None:
                raise ValueError('Percentage variation requires percentage_range')
            if param.variation_type == VariationType.RANGE and (param.min_value is None or param.max_value is None):
                raise ValueError('Range variation requires min_value and max_value')
        return v


class ParameterImpact(BaseModel):
    parameter_name: str = Field(..., description="Name of the varied parameter")
    output_parameter: str = Field(..., description="Output parameter affected")
    sensitivity_coefficient: float = Field(..., description="Sensitivity coefficient (dimensionless)")
    correlation_coefficient: float = Field(..., description="Correlation coefficient R²")
    impact_rank: int = Field(..., description="Impact ranking (1 = most sensitive)")
    variation_range: Dict[str, float] = Field(..., description="Range of variation applied")
    output_range: Dict[str, float] = Field(..., description="Resulting output range")


class SensitivityResult(BaseModel):
    parameter_name: str = Field(..., description="Parameter that was varied")
    variation_values: List[float] = Field(..., description="Parameter values used")
    output_results: Dict[str, List[float]] = Field(..., description="Output values for each variation")
    statistics: Dict[str, Dict[str, float]] = Field(..., description="Statistical analysis of results")


class TornadoData(BaseModel):
    parameter_name: str = Field(..., description="Parameter name")
    low_value: float = Field(..., description="Low parameter value")
    high_value: str = Field(..., description="High parameter value")
    output_low: Dict[str, float] = Field(..., description="Outputs at low parameter value")
    output_high: Dict[str, float] = Field(..., description="Outputs at high parameter value")
    impact_magnitude: Dict[str, float] = Field(..., description="Impact magnitude for each output")


class MonteCarloResult(BaseModel):
    sample_count: int = Field(..., description="Number of Monte Carlo samples")
    parameter_distributions: Dict[str, Dict[str, float]] = Field(..., description="Parameter distributions used")
    output_statistics: Dict[str, Dict[str, float]] = Field(..., description="Output parameter statistics")
    confidence_intervals: Dict[str, Dict[str, float]] = Field(..., description="95% confidence intervals")
    probability_distributions: Dict[str, List[float]] = Field(..., description="Probability distributions for outputs")


class CorrelationMatrix(BaseModel):
    parameters: List[str] = Field(..., description="Parameter names")
    correlation_matrix: List[List[float]] = Field(..., description="Correlation coefficients matrix")
    significance_levels: List[List[float]] = Field(..., description="Statistical significance levels")


class SensitivityAnalysisResults(BaseModel):
    analysis_type: AnalysisType = Field(..., description="Type of analysis performed")
    base_case_results: Dict[str, float] = Field(..., description="Base case output values")
    parameter_impacts: List[ParameterImpact] = Field(..., description="Impact analysis for each parameter")
    sensitivity_results: List[SensitivityResult] = Field(..., description="Detailed sensitivity results")
    tornado_diagram_data: Optional[List[TornadoData]] = Field(None, description="Data for tornado diagrams")
    monte_carlo_results: Optional[MonteCarloResult] = Field(None, description="Monte Carlo analysis results")
    correlation_matrix: Optional[CorrelationMatrix] = Field(None, description="Parameter correlation matrix")

    # Analysis metadata
    execution_time_seconds: float = Field(..., description="Analysis execution time")
    total_calculations: int = Field(..., description="Total number of calculations performed")
    analysis_timestamp: str = Field(..., description="Analysis timestamp")


class SensitivityAnalysisInputs(BaseModel):
    """Input schema for sensitivity analysis calculator"""
    sensitivity_config: SensitivityInput = Field(..., description="Sensitivity analysis configuration")


class SensitivityAnalysisOutputs(BaseModel):
    """Output schema for sensitivity analysis calculator"""
    results: SensitivityAnalysisResults = Field(..., description="Complete sensitivity analysis results")
    recommendations: List[str] = Field(..., description="Analysis recommendations")
    warnings: List[str] = Field(..., description="Analysis warnings")
    notes: List[str] = Field(..., description="Additional analysis notes")
