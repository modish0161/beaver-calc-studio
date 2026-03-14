"""
Sensitivity Analysis Calculator Plugin
"""
from typing import Dict, Any

from ..base import CalculatorPlugin
from .schema import SensitivityAnalysisInputs, SensitivityAnalysisOutputs
from .calculator import calculate_sensitivity_analysis


class SensitivityAnalysisCalculatorPlugin(CalculatorPlugin):
    """Sensitivity analysis calculator plugin"""

    key = "sensitivity_analysis_v1"
    name = "Sensitivity Analysis"
    version = "1.0.0"
    description = "Advanced sensitivity analysis for structural calculations with parameter variation and impact assessment"
    category = "analysis"
    input_schema = SensitivityAnalysisInputs
    output_schema = SensitivityAnalysisOutputs
    reference_text = "Statistical Methods for Sensitivity Analysis - Advanced Engineering Techniques"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform sensitivity analysis calculation"""
        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)
        
        # Perform calculation
        results = calculate_sensitivity_analysis(validated_inputs)
        
        # Return results as dictionary
        return results.model_dump()


# Create calculator instance
calculator = SensitivityAnalysisCalculatorPlugin()