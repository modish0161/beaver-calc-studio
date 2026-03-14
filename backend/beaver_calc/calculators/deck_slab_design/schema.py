"""
Input and output schemas for deck slab design calculator
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class DeckSlabDesignInputs(BaseModel):
    """Input parameters for deck slab design check"""

    # Slab geometry
    slab_type: Literal["one_way", "two_way"] = Field(
        "two_way",
        description="Type of slab action"
    )
    length_x_m: float = Field(..., gt=0, description="Slab length in X direction (m)")
    length_y_m: float = Field(..., gt=0, description="Slab length in Y direction (m)")
    thickness_mm: float = Field(..., gt=0, description="Slab thickness (mm)")

    # Support conditions
    support_x: Literal["simply_supported", "continuous", "fixed"] = Field(
        "continuous",
        description="Support condition in X direction"
    )
    support_y: Literal["simply_supported", "continuous", "fixed"] = Field(
        "continuous",
        description="Support condition in Y direction"
    )

    # Loading
    dead_load_kN_per_m2: float = Field(..., ge=0, description="Dead load (kN/m²) - excluding self-weight")
    live_load_kN_per_m2: float = Field(..., ge=0, description="Live load (kN/m²)")
    point_load_dead_kN: float = Field(0, ge=0, description="Concentrated dead load (kN)")
    point_load_live_kN: float = Field(0, ge=0, description="Concentrated live load (kN)")

    # Material properties
    concrete_grade: Literal["C20/25", "C25/30", "C30/37", "C35/45", "C40/50"] = Field(
        "C30/37",
        description="Concrete grade"
    )
    steel_grade: Literal["B500B", "B500C"] = Field(
        "B500B",
        description="Reinforcement steel grade"
    )

    # Reinforcement
    cover_top_mm: float = Field(25, gt=0, description="Top reinforcement cover (mm)")
    cover_bottom_mm: float = Field(25, gt=0, description="Bottom reinforcement cover (mm)")
    bar_diameter_mm: float = Field(12, gt=0, description="Main reinforcement bar diameter (mm)")

    # Design parameters
    deflection_limit: Literal["L/250", "L/300", "L/350", "L/400"] = Field(
        "L/250",
        description="Deflection limit for serviceability"
    )

    # Partial safety factors
    gamma_g: float = Field(1.35, ge=0, description="Partial safety factor for permanent loads")
    gamma_q: float = Field(1.5, ge=0, description="Partial safety factor for variable loads")
    gamma_c: float = Field(1.5, ge=0, description="Partial safety factor for concrete")
    gamma_s: float = Field(1.15, ge=0, description="Partial safety factor for steel")

    @field_validator('length_x_m', 'length_y_m')
    @classmethod
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimensions must be positive')
        if v > 50:
            raise ValueError('Dimension seems unreasonably large (>50m)')
        return v

    @field_validator('thickness_mm')
    @classmethod
    def validate_thickness(cls, v):
        if v < 100:
            raise ValueError('Slab thickness too small (<100mm)')
        if v > 1000:
            raise ValueError('Slab thickness too large (>1000mm)')
        return v

    @field_validator('cover_top_mm', 'cover_bottom_mm')
    @classmethod
    def validate_cover(cls, v):
        if v < 15:
            raise ValueError('Cover too small (<15mm)')
        if v > 100:
            raise ValueError('Cover too large (>100mm)')
        return v


class DeckSlabDesignOutputs(BaseModel):
    """Output results for deck slab design check"""

    # Material properties
    concrete_fck: float = Field(..., description="Concrete characteristic strength (N/mm²)")
    concrete_fcd: float = Field(..., description="Concrete design strength (N/mm²)")
    steel_fyk: float = Field(..., description="Steel characteristic strength (N/mm²)")
    steel_fyd: float = Field(..., description="Steel design strength (N/mm²)")

    # Self-weight and loads
    self_weight_kN_per_m2: float = Field(..., description="Slab self-weight (kN/m²)")
    total_load_uls_kN_per_m2: float = Field(..., description="Total ULS load (kN/m²)")
    total_load_sls_kN_per_m2: float = Field(..., description="Total SLS load (kN/m²)")

    # Design moments and shears
    design_moments: dict = Field(..., description="Design bending moments in X and Y directions")
    design_shears: dict = Field(..., description="Design shear forces")

    # Reinforcement design
    reinforcement_x: dict = Field(..., description="Reinforcement design in X direction")
    reinforcement_y: dict = Field(..., description="Reinforcement design in Y direction")

    # Design checks
    bending_check_x: dict = Field(..., description="Bending resistance check in X direction")
    bending_check_y: dict = Field(..., description="Bending resistance check in Y direction")
    shear_check: dict = Field(..., description="Shear resistance check")
    deflection_check: dict = Field(..., description="Deflection serviceability check")

    # Punching shear (for two-way slabs)
    punching_shear_check: Optional[dict] = Field(None, description="Punching shear check (two-way slabs)")

    # Overall results
    utilisation_summary: dict = Field(..., description="Summary of utilizations")
    overall_check: bool = Field(..., description="Overall design check result")

    # Reinforcement schedule
    reinforcement_schedule: dict = Field(..., description="Complete reinforcement schedule")

    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")

    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")
