"""
Input and output schemas for transverse members design calculator
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class TransverseMembersDesignInputs(BaseModel):
    """Input parameters for transverse members design check"""

    # Member geometry
    member_type: Literal["beam", "diaphragm", "cross_beam"] = Field(
        "beam",
        description="Type of transverse member"
    )
    span_m: float = Field(..., gt=0, description="Transverse member span (m)")
    depth_mm: float = Field(..., gt=0, description="Member depth (mm)")
    width_top_mm: float = Field(..., gt=0, description="Top width/flange (mm)")
    width_bottom_mm: float = Field(..., gt=0, description="Bottom width/flange (mm)")
    web_thickness_mm: float = Field(..., gt=0, description="Web thickness (mm)")

    # Bridge configuration
    main_girder_spacing_m: float = Field(..., gt=0, description="Spacing between main girders (m)")
    deck_width_m: float = Field(..., gt=0, description="Total bridge deck width (m)")
    number_of_girders: int = Field(..., gt=1, description="Number of main girders")

    # Loading from deck
    dead_load_kN_per_m: float = Field(..., ge=0, description="Dead load from deck (kN/m)")
    live_load_kN_per_m: float = Field(..., ge=0, description="Live load from deck (kN/m)")
    point_load_dead_kN: float = Field(0, ge=0, description="Concentrated dead load (kN)")
    point_load_live_kN: float = Field(0, ge=0, description="Concentrated live load (kN)")

    # Material properties
    steel_grade: Literal["S235", "S275", "S355", "S420", "S460"] = Field(
        "S355",
        description="Steel grade"
    )

    # Support conditions
    end_conditions: Literal["pinned", "fixed", "continuous"] = Field(
        "continuous",
        description="End support conditions"
    )

    # Design parameters
    deflection_limit: Literal["L/300", "L/400", "L/500"] = Field(
        "L/300",
        description="Deflection limit for serviceability"
    )

    # Partial safety factors
    gamma_g: float = Field(1.35, ge=0, description="Partial safety factor for permanent loads")
    gamma_q: float = Field(1.5, ge=0, description="Partial safety factor for variable loads")
    gamma_m0: float = Field(1.0, ge=0, description="Partial safety factor for resistance")
    gamma_m1: float = Field(1.0, ge=0, description="Partial safety factor for buckling resistance")

    @field_validator('span_m')
    @classmethod
    def validate_span(cls, v):
        if v <= 0:
            raise ValueError('Span must be positive')
        if v > 20:
            raise ValueError('Span seems unreasonably large (>20m)')
        return v

    @field_validator('depth_mm', 'width_top_mm', 'width_bottom_mm', 'web_thickness_mm')
    @classmethod
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimensions must be positive')
        if v > 2000:
            raise ValueError('Dimension seems unreasonably large (>2000mm)')
        return v

    @field_validator('main_girder_spacing_m', 'deck_width_m')
    @classmethod
    def validate_bridge_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Bridge dimensions must be positive')
        if v > 50:
            raise ValueError('Bridge dimension seems unreasonably large (>50m)')
        return v

    @field_validator('number_of_girders')
    @classmethod
    def validate_girder_count(cls, v):
        if v < 2:
            raise ValueError('Must have at least 2 girders')
        if v > 20:
            raise ValueError('Too many girders (>20)')
        return v


class TransverseMembersDesignOutputs(BaseModel):
    """Output results for transverse members design check"""

    # Member properties
    member_properties: dict = Field(..., description="Geometric properties of transverse member")

    # Load distribution
    load_distribution: dict = Field(..., description="Load distribution from deck to transverse member")

    # Design actions
    design_actions: dict = Field(..., description="Design bending moments, shears, and reactions")

    # Design checks
    bending_resistance_check: dict = Field(..., description="Bending resistance verification")
    shear_resistance_check: dict = Field(..., description="Shear resistance verification")
    web_bearing_check: dict = Field(..., description="Web bearing capacity check")
    deflection_check: dict = Field(..., description="Deflection serviceability check")
    buckling_check: Optional[dict] = Field(None, description="Buckling stability check")

    # Connection design
    connection_design: dict = Field(..., description="Connection requirements to main girders")

    # Overall results
    utilisation_summary: dict = Field(..., description="Summary of utilizations")
    overall_check: bool = Field(..., description="Overall design check result")

    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")

    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")
