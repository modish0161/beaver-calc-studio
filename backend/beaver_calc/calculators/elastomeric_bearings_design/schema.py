"""
Input and output schemas for elastomeric bearings calculator
"""
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, field_validator


class ElastomerLayer(BaseModel):
    """Individual elastomer layer properties"""

    thickness_mm: float = Field(..., gt=0, description="Thickness of elastomer layer (mm)")
    shear_modulus_mpa: float = Field(..., gt=0, description="Shear modulus of elastomer (MPa)")
    bulk_modulus_mpa: float = Field(..., gt=0, description="Bulk modulus of elastomer (MPa)")

    @field_validator('thickness_mm', 'shear_modulus_mpa', 'bulk_modulus_mpa')
    @classmethod
    def validate_positive(cls, v):
        if v <= 0:
            raise ValueError('Must be positive')
        return v


class SteelShims(BaseModel):
    """Steel shim plate configuration"""

    number_of_shims: int = Field(..., ge=0, description="Number of steel shim plates")
    shim_thickness_mm: float = Field(0, ge=0, description="Thickness of each shim plate (mm)")
    shim_modulus_mpa: float = Field(200000, ge=0, description="Modulus of elasticity of shim material (MPa)")

    @field_validator('number_of_shims', 'shim_thickness_mm', 'shim_modulus_mpa')
    @classmethod
    def validate_non_negative(cls, v):
        if v < 0:
            raise ValueError('Must be non-negative')
        return v


class ElastomericBearingsInputs(BaseModel):
    """Input parameters for elastomeric bearings design"""

    # Bearing geometry
    plan_area_mm2: float = Field(..., gt=0, description="Plan area of bearing (mm²)")
    shape: Literal["rectangular", "circular", "square"] = Field(
        "rectangular",
        description="Shape of bearing plan"
    )

    # Dimensions
    length_mm: float = Field(..., gt=0, description="Length of bearing (mm) - for rectangular")
    width_mm: float = Field(..., gt=0, description="Width of bearing (mm) - for rectangular/square")
    diameter_mm: float = Field(0, ge=0, description="Diameter of bearing (mm) - for circular")

    # Elastomer configuration
    elastomer_layers: List[ElastomerLayer] = Field(..., min_length=1, description="List of elastomer layers")

    # Steel reinforcement
    steel_shims: SteelShims = Field(..., description="Steel shim plate configuration")

    # End plates
    top_plate_thickness_mm: float = Field(..., gt=0, description="Thickness of top steel plate (mm)")
    bottom_plate_thickness_mm: float = Field(..., gt=0, description="Thickness of bottom steel plate (mm)")

    # Loading conditions
    design_vertical_load_kn: float = Field(..., gt=0, description="Design vertical load (kN)")
    design_shear_load_kn: float = Field(..., gt=0, description="Design shear load (kN)")

    # Service conditions
    service_temperature_deg: float = Field(20, description="Service temperature (°C)")
    temperature_range_deg: float = Field(30, ge=0, description="Temperature range (°C)")

    # Design parameters
    shape_factor_min: float = Field(5, ge=0, description="Minimum allowable shape factor")
    shape_factor_max: float = Field(12, ge=0, description="Maximum allowable shape factor")
    strain_limit_percent: float = Field(100, ge=0, le=200, description="Maximum allowable strain (%)")
    compression_stress_limit_mpa: float = Field(15, ge=0, description="Maximum compression stress (MPa)")

    # Material properties
    steel_yield_strength_mpa: float = Field(355, gt=0, description="Steel yield strength (MPa)")
    concrete_compressive_strength_mpa: float = Field(30, gt=0, description="Concrete compressive strength (MPa)")

    # Safety factors
    gamma_g: float = Field(1.35, gt=0, description="Partial safety factor for permanent loads")
    gamma_q: float = Field(1.5, gt=0, description="Partial safety factor for variable loads")
    gamma_m: float = Field(1.25, gt=0, description="Partial safety factor for materials")

    @field_validator('plan_area_mm2')
    @classmethod
    def validate_area(cls, v):
        if v <= 0:
            raise ValueError('Plan area must be positive')
        if v > 10000000:  # 10m²
            raise ValueError('Plan area seems unreasonably large')
        return v

    @field_validator('length_mm', 'width_mm', 'diameter_mm')
    @classmethod
    def validate_dimensions(cls, v):
        if v < 0:
            raise ValueError('Dimensions must be non-negative')
        if v > 5000:  # 5m
            raise ValueError('Dimension seems unreasonably large')
        return v

    @field_validator('shape_factor_min', 'shape_factor_max')
    @classmethod
    def validate_shape_factors(cls, v):
        if v <= 0:
            raise ValueError('Shape factor must be positive')
        return v


class ElastomericBearingsOutputs(BaseModel):
    """Output results for elastomeric bearings design"""

    # Geometric properties
    geometry: dict = Field(..., description="Calculated geometric properties")

    # Shape factors
    shape_factors: dict = Field(..., description="Shape factors for each layer")

    # Material properties
    effective_properties: dict = Field(..., description="Effective material properties")

    # Design checks
    stability_check: dict = Field(..., description="Stability and overturning check")
    compression_check: dict = Field(..., description="Compression stress check")
    shear_check: dict = Field(..., description="Shear deformation check")
    strain_check: dict = Field(..., description="Strain limit check")

    # Performance characteristics
    stiffness_properties: dict = Field(..., description="Stiffness and deformation properties")
    rotation_capacity: dict = Field(..., description="Rotation capacity analysis")

    # Design verification
    overall_check: bool = Field(..., description="Overall design verification")
    utilisation_summary: dict = Field(..., description="Summary of utilizations")

    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")

    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")
