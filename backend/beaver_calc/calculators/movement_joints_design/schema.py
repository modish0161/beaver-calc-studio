"""
Movement Joints Design Calculator Schema
EN 1991-1-5: Actions on Structures - Thermal Actions
EN 1998-2: Bridges - Seismic Design (if applicable)
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, validator
from pint import UnitRegistry

# Initialize unit registry
ureg = UnitRegistry()


class JointType(str, Enum):
    COMPRESSION_SEAL = "compression_seal"
    STRIP_SEAL = "strip_seal"
    MODULAR_SEAL = "modular_seal"
    POT_SEAL = "pot_seal"
    FINGER_PLATE = "finger_plate"


class BridgeType(str, Enum):
    CONCRETE = "concrete"
    STEEL = "steel"
    COMPOSITE = "composite"


class SeismicZone(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class MovementInputs(BaseModel):
    """Input parameters for movement joints design"""

    # Bridge geometry
    bridge_type: BridgeType = Field(..., description="Type of bridge construction")
    span_length_m: float = Field(..., ge=0, description="Total length of bridge span requiring joint")
    deck_width_m: float = Field(..., ge=0, description="Width of bridge deck")
    joint_location: str = Field(..., description="Location of movement joint (e.g., expansion joint, contraction joint)")

    # Environmental conditions
    min_temperature_c: float = Field(..., description="Minimum design temperature (°C)")
    max_temperature_c: float = Field(..., description="Maximum design temperature (°C)")
    mean_temperature_c: float = Field(..., description="Mean annual temperature (°C)")

    # Material properties
    thermal_coefficient_per_c: float = Field(..., ge=0, description="Thermal expansion coefficient (1/°C)")
    creep_coefficient: float = Field(..., ge=0, le=1, description="Creep coefficient for concrete")
    shrinkage_strain: float = Field(..., ge=0, description="Shrinkage strain for concrete")

    # Joint configuration
    joint_type: JointType = Field(..., description="Type of movement joint")
    number_of_gaps: int = Field(..., ge=1, description="Number of movement gaps")
    joint_depth_mm: float = Field(..., ge=0, description="Depth of joint seal (mm)")

    # Seismic considerations (optional)
    seismic_zone: SeismicZone = Field(default=SeismicZone.LOW, description="Seismic zone classification")
    seismic_displacement_mm: float = Field(default=0, ge=0, description="Seismic displacement allowance (mm)")

    # Design parameters
    safety_factor_movement: float = Field(default=1.2, ge=1, description="Safety factor for movement calculations")
    service_life_years: int = Field(default=120, ge=1, description="Design service life in years")

    class Config:
        use_enum_values = True
        validate_assignment = True


class MovementOutputs(BaseModel):
    """Output results for movement joints design"""

    # Thermal movements
    thermal_movement_mm: float = Field(..., description="Total thermal movement (mm)")
    thermal_expansion_mm: float = Field(..., description="Thermal expansion component (mm)")
    thermal_contraction_mm: float = Field(..., description="Thermal contraction component (mm)")

    # Concrete movements
    creep_movement_mm: float = Field(..., description="Creep movement (mm)")
    shrinkage_movement_mm: float = Field(..., description="Shrinkage movement (mm)")

    # Total movements
    total_movement_mm: float = Field(..., description="Total design movement (mm)")
    design_gap_mm: float = Field(..., description="Required joint gap width (mm)")

    # Joint sizing
    joint_width_mm: float = Field(..., description="Recommended joint width (mm)")
    seal_thickness_mm: float = Field(..., description="Required seal thickness (mm)")

    # Verification results
    movement_checks: Dict[str, Dict[str, float]] = Field(..., description="Movement verification checks")
    joint_capacity: Dict[str, float] = Field(..., description="Joint capacity parameters")

    # Design recommendations
    recommendations: List[str] = Field(..., description="Design recommendations")
    warnings: List[str] = Field(..., description="Design warnings")
    notes: List[str] = Field(..., description="Additional design notes")

    class Config:
        validate_assignment = True


class MovementCalculatorInputs(BaseModel):
    """Complete input schema for movement joints calculator"""
    calculator_key: str = Field(default="movement_joints_v1", description="Calculator identifier")
    inputs: MovementInputs

    class Config:
        validate_assignment = True


class MovementCalculatorOutputs(BaseModel):
    """Complete output schema for movement joints calculator"""
    calculator_key: str = Field(default="movement_joints_v1", description="Calculator identifier")
    inputs: MovementInputs
    outputs: MovementOutputs
    metadata: Dict[str, any] = Field(default_factory=dict, description="Calculation metadata")

    class Config:
        validate_assignment = True
