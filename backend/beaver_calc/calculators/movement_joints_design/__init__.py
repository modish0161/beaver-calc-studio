"""
Movement Joints Design Calculator Package
"""

from typing import Dict, Any
from ..base import CalculatorPlugin
from .calculator import MovementJointsCalculator, calculate_movement_joints
from .schema import (
    MovementInputs,
    MovementOutputs,
    MovementCalculatorInputs,
    MovementCalculatorOutputs,
    JointType,
    BridgeType,
    SeismicZone
)


class MovementJointsPlugin(CalculatorPlugin):
    """Movement joints design calculator plugin (EN 1991-1-5)"""

    key = "movement_joints_v1"
    name = "Movement Joints Design"
    version = "1.0.0"
    description = "Bridge movement joint design with thermal expansion, creep, shrinkage, and seismic movements"
    category = "bridges"
    input_schema = MovementInputs
    output_schema = MovementOutputs
    reference_text = "EN 1991-1-5:2003 - Actions on Structures - Thermal Actions"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform movement joints design calculations"""
        validated_inputs = self.validate_inputs(inputs)
        result = MovementJointsCalculator.calculate(validated_inputs)
        return result.model_dump()


# Export calculator instance for plugin loader
calculator = MovementJointsPlugin()


__all__ = [
    'calculator',
    'calculate_movement_joints',
    'MovementInputs',
    'MovementOutputs',
    'MovementCalculatorInputs',
    'MovementCalculatorOutputs',
    'JointType',
    'BridgeType',
    'SeismicZone'
]
