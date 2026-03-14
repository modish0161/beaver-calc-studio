"""
Input and output schemas for steel plate girder calculator
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class SteelPlateGirderInputs(BaseModel):
    """Input parameters for steel plate girder design check"""

    # Geometry
    span_m: float = Field(..., gt=0, description="Beam span in meters")
    web_depth_mm: float = Field(..., gt=0, description="Web depth in mm")
    web_thickness_mm: float = Field(..., gt=0, description="Web thickness in mm")
    flange_width_mm: float = Field(..., gt=0, description="Flange width in mm")
    flange_thickness_mm: float = Field(..., gt=0, description="Flange thickness in mm")

    # Loading
    dead_load_kN_per_m: float = Field(..., ge=0, description="Dead load in kN/m")
    live_load_kN_per_m: float = Field(..., ge=0, description="Live load in kN/m")
    point_load_dead_kN: float = Field(0, ge=0, description="Concentrated dead load at specified position (kN)")
    point_load_live_kN: float = Field(0, ge=0, description="Concentrated live load at specified position (kN)")
    load_position: Literal["midspan", "third_points", "quarter_points"] = Field(
        "midspan",
        description="Position of concentrated loads"
    )

    # Material
    steel_grade: Literal["S235", "S275", "S355", "S420", "S460"] = Field(
        "S355",
        description="Steel grade"
    )

    # Lateral restraint
    lateral_restraint_spacing_m: float = Field(..., gt=0, description="Lateral restraint spacing in meters")
    
    # Stiffeners
    use_stiffeners: bool = Field(False, description="Use intermediate web stiffeners")
    stiffener_spacing_mm: float = Field(2000, gt=0, description="Stiffener spacing in mm")

    # Partial safety factors
    gamma_m0: float = Field(1.0, ge=0, description="Partial safety factor for resistance")
    gamma_m1: float = Field(1.0, ge=0, description="Partial safety factor for buckling resistance")

    @field_validator('span_m')
    @classmethod
    def validate_span(cls, v):
        if v <= 0:
            raise ValueError('Span must be positive')
        if v > 100:
            raise ValueError('Span seems unreasonably large (>100m)')
        return v

    @field_validator('web_depth_mm', 'flange_width_mm')
    @classmethod
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimensions must be positive')
        if v > 5000:
            raise ValueError('Dimension seems unreasonably large (>5m)')
        return v

    @field_validator('web_thickness_mm', 'flange_thickness_mm')
    @classmethod
    def validate_thickness(cls, v):
        if v <= 0:
            raise ValueError('Thickness must be positive')
        if v > 100:
            raise ValueError('Thickness seems unreasonably large (>100mm)')
        return v

    @field_validator('dead_load_kN_per_m', 'live_load_kN_per_m')
    @classmethod
    def validate_loads(cls, v):
        if v < 0:
            raise ValueError('Load cannot be negative')
        if v > 1000:
            raise ValueError('Load seems unreasonably high (>1000 kN/m)')
        return v


class SteelPlateGirderOutputs(BaseModel):
    """Output results for steel plate girder design check"""

    # Section properties
    section_properties: dict = Field(..., description="Section geometric properties")
    
    # Material properties
    material_properties: dict = Field(..., description="Material properties")
    
    # Design actions
    design_actions: dict = Field(..., description="Design bending moments and shear forces")
    
    # Resistances
    bending_resistance: dict = Field(..., description="Bending resistance check")
    shear_resistance: dict = Field(..., description="Shear resistance check")
    shear_buckling_resistance: dict = Field(..., description="Shear buckling resistance check")
    lateral_torsional_buckling: dict = Field(..., description="Lateral torsional buckling check")
    
    # Serviceability
    deflection_check: dict = Field(..., description="Deflection serviceability check")
    
    # Interaction checks
    interaction_check: dict = Field(..., description="Interaction between bending and shear")
    
    # Utilization summary
    utilisation_summary: dict = Field(..., description="Summary of utilizations")
    overall_check: bool = Field(..., description="Overall design check result")
    
    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")
    
    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")