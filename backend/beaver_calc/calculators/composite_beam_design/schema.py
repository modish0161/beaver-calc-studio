"""
Input and output schemas for composite beam design calculator
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class CompositeBeamDesignInputs(BaseModel):
    """Input parameters for composite beam design check"""

    # Steel section properties
    steel_section: str = Field(..., description="Steel section designation (e.g., 'UKB 610x229x101')")

    # Concrete slab properties
    slab_thickness_mm: float = Field(..., gt=0, description="Concrete slab thickness (mm)")
    slab_width_mm: float = Field(..., gt=0, description="Effective slab width (mm)")
    concrete_grade: Literal["C20/25", "C25/30", "C30/37", "C35/45", "C40/50"] = Field(
        "C30/37",
        description="Concrete grade"
    )

    # Shear connection
    shear_connector_type: Literal["stud", "perfobond", "channel"] = Field(
        "stud",
        description="Type of shear connector"
    )
    shear_connector_diameter_mm: float = Field(20, gt=0, description="Shear connector diameter (mm)")
    shear_connector_height_mm: float = Field(100, gt=0, description="Shear connector height (mm)")
    connectors_per_row: int = Field(2, gt=0, description="Number of connectors per row")
    connector_rows: int = Field(..., gt=0, description="Number of connector rows")
    connector_spacing_mm: float = Field(300, gt=0, description="Spacing between connector rows (mm)")

    # Loading
    span_m: float = Field(..., gt=0, description="Beam span in meters")
    dead_load_kN_per_m: float = Field(..., ge=0, description="Dead load (excluding self-weight) in kN/m")
    live_load_kN_per_m: float = Field(..., ge=0, description="Live load in kN/m")
    point_load_dead_kN: float = Field(0, ge=0, description="Concentrated dead load at mid-span (kN)")
    point_load_live_kN: float = Field(0, ge=0, description="Concentrated live load at mid-span (kN)")

    # Material properties
    steel_grade: Literal["S235", "S275", "S355", "S420", "S460"] = Field(
        "S355",
        description="Steel grade"
    )

    # Support conditions
    lateral_restraint: Literal["restrained", "unrestrained"] = Field(
        "unrestrained",
        description="Lateral restraint condition"
    )

    # Partial safety factors
    gamma_m0: float = Field(1.0, ge=0, description="Partial safety factor for resistance")
    gamma_m1: float = Field(1.0, ge=0, description="Partial safety factor for buckling resistance")
    gamma_v: float = Field(1.25, ge=0, description="Partial safety factor for shear connection")

    @field_validator('span_m')
    @classmethod
    def validate_span(cls, v):
        if v <= 0:
            raise ValueError('Span must be positive')
        if v > 100:
            raise ValueError('Span seems unreasonably large (>100m)')
        return v

    @field_validator('slab_thickness_mm', 'slab_width_mm')
    @classmethod
    def validate_slab_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Slab dimensions must be positive')
        if v > 10000:
            raise ValueError('Slab dimension seems unreasonably large (>10m)')
        return v

    @field_validator('shear_connector_diameter_mm', 'shear_connector_height_mm')
    @classmethod
    def validate_connector_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Connector dimensions must be positive')
        return v

    @field_validator('connector_spacing_mm')
    @classmethod
    def validate_spacing(cls, v):
        if v < 100:
            raise ValueError('Connector spacing too small (<100mm)')
        if v > 1000:
            raise ValueError('Connector spacing too large (>1000mm)')
        return v


class CompositeBeamDesignOutputs(BaseModel):
    """Output results for composite beam design check"""

    # Steel section properties
    steel_section_properties: dict = Field(..., description="Steel section geometric properties")

    # Concrete properties
    concrete_fck: float = Field(..., description="Concrete characteristic strength (N/mm²)")
    concrete_fcd: float = Field(..., description="Concrete design strength (N/mm²)")

    # Composite section properties
    composite_section_properties: dict = Field(..., description="Composite section properties")

    # Shear connection
    shear_connection_capacity: dict = Field(..., description="Shear connection design capacity")

    # Design actions
    design_actions: dict = Field(..., description="Design bending moments and shear forces")

    # Design checks
    bending_resistance_check: dict = Field(..., description="Bending resistance verification")
    shear_resistance_check: dict = Field(..., description="Shear resistance verification")
    shear_connection_check: dict = Field(..., description="Shear connection verification")
    deflection_check: dict = Field(..., description="Deflection serviceability check")
    lateral_torsional_buckling_check: Optional[dict] = Field(None, description="LTB check (if unrestrained)")

    # Overall results
    utilisation_summary: dict = Field(..., description="Summary of utilizations")
    overall_check: bool = Field(..., description="Overall design check result")

    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")

    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")
