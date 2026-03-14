"""
Base classes for calculator plugins
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Type
from pydantic import BaseModel, Field
import pint

# Initialize Pint unit registry
ureg = pint.UnitRegistry()
ureg.default_format = '~P'  # Pretty formatting


class CalculatorInputs(BaseModel):
    """Base class for calculator inputs"""
    pass


class CalculatorOutputs(BaseModel):
    """Base class for calculator outputs"""
    pass


class CalculatorPlugin(ABC):
    """Abstract base class for calculator plugins"""

    # Metadata
    key: str
    name: str
    version: str = "1.0.0"
    description: Optional[str] = None
    category: str = "general"

    # Schema classes
    input_schema: Type[CalculatorInputs]
    output_schema: Type[CalculatorOutputs]

    # Reference information
    reference_text: Optional[str] = None

    @abstractmethod
    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform the calculation

        Args:
            inputs: Validated input data

        Returns:
            Calculation results as dict
        """
        pass

    def validate_inputs(self, inputs: Dict[str, Any]) -> CalculatorInputs:
        """Validate inputs against schema"""
        return self.input_schema(**inputs)

    def validate_outputs(self, outputs: Dict[str, Any]) -> CalculatorOutputs:
        """Validate outputs against schema"""
        return self.output_schema(**outputs)

    def get_input_schema(self) -> Dict[str, Any]:
        """Get JSON schema for inputs"""
        return self.input_schema.model_json_schema()

    def get_output_schema(self) -> Dict[str, Any]:
        """Get JSON schema for outputs"""
        return self.output_schema.model_json_schema()

    def get_metadata(self) -> Dict[str, Any]:
        """Get calculator metadata"""
        return {
            'key': self.key,
            'name': self.name,
            'version': self.version,
            'description': self.description,
            'category': self.category,
            'input_schema': self.get_input_schema(),
            'output_schema': self.get_output_schema(),
            'reference_text': self.reference_text
        }


class CalculatorRegistry:
    """Registry for calculator plugins"""

    def __init__(self):
        self._calculators: Dict[str, CalculatorPlugin] = {}

    def register(self, calculator: CalculatorPlugin) -> None:
        """Register a calculator plugin"""
        if calculator.key in self._calculators:
            raise ValueError(f"Calculator with key '{calculator.key}' already registered")
        self._calculators[calculator.key] = calculator

    def get_calculator(self, key: str) -> Optional[CalculatorPlugin]:
        """Get calculator by key"""
        return self._calculators.get(key)

    def list_calculators(self) -> Dict[str, CalculatorPlugin]:
        """List all registered calculators"""
        return self._calculators.copy()

    def get_calculator_keys(self) -> list[str]:
        """Get list of calculator keys"""
        return list(self._calculators.keys())


# Global registry instance
registry = CalculatorRegistry()
