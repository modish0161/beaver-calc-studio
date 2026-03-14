"""
Input and output schemas for bracing design calculator
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class BracingDesignInputs(BaseModel):
    """Input parameters for bracing design check"""

    # Bracing system configuration
    bracing_type: Literal["cross_bracing", "k_bracing", "diagonal_bracing", "x_bracing"] = Field(
        "cross_bracing",
        description="Type of bracing system"
    )
    bracing_material: Literal["steel", "timber", "cable"] = Field(
        "steel",
        description="Material used for bracing members"
    )

    # Geometric configuration
    span_length_m: float = Field(..., gt=0, description="Length of braced span (m)")
    height_m: float = Field(..., gt=0, description="Height of bracing system (m)")
    number_of_panels: int = Field(..., gt=0, description="Number of bracing panels")

    # Member properties
    member_section: str = Field(..., description="Section designation (e.g., 'CHS 114.3x6.3', 'UB 203x133x30')")
    member_length_m: float = Field(..., gt=0, description="Length of individual bracing member (m)")

    # Loading conditions
    wind_load_kN_per_m2: float = Field(..., ge=0, description="Wind load intensity (kN/m²)")
    seismic_load_factor: float = Field(0, ge=0, description="Seismic load factor")
    temperature_change_deg: float = Field(0, ge=0, description="Temperature change (°C)")

    # Material properties
    steel_grade: Literal["S235", "S275", "S355", "S420", "S460"] = Field(
        "S355",
        description="Steel grade (for steel bracing)"
    )
    timber_grade: Literal["C16", "C24", "C30", "D30", "D40"] = Field(
        "C24",
        description="Timber grade (for timber bracing)"
    )
    cable_type: Literal["spiral_strand", "locked_coil", "parallel_wire"] = Field(
        "spiral_strand",
        description="Cable type (for cable bracing)"
    )

    # Design parameters
    utilization_limit: float = Field(0.8, ge=0, le=1, description="Maximum allowed utilization ratio")

    # Partial safety factors
    gamma_g: float = Field(1.35, ge=0, description="Partial safety factor for permanent loads")
    gamma_q: float = Field(1.5, ge=0, description="Partial safety factor for variable loads")
    gamma_m0: float = Field(1.0, ge=0, description="Partial safety factor for resistance")
    gamma_m1: float = Field(1.0, ge=0, description="Partial safety factor for buckling resistance")

    @field_validator('span_length_m', 'height_m', 'member_length_m')
    @classmethod
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimensions must be positive')
        if v > 100:
            raise ValueError('Dimension seems unreasonably large (>100m)')
        return v

    @field_validator('number_of_panels')
    @classmethod
    def validate_panels(cls, v):
        if v < 1:
            raise ValueError('Must have at least 1 panel')
        if v > 20:
            raise ValueError('Too many panels (>20)')
        return v

    @field_validator('member_section')
    @classmethod
    def validate_section(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Section designation cannot be empty')
        return v.strip()


class BracingDesignOutputs(BaseModel):
    """Output results for bracing design check"""

    # System configuration
    system_geometry: dict = Field(..., description="Geometric properties of bracing system")

    # Member forces
    member_forces: dict = Field(..., description="Forces in individual bracing members")

    # Design checks
    compression_check: dict = Field(..., description="Compression resistance check")
    tension_check: dict = Field(..., description="Tension resistance check")
    buckling_check: dict = Field(..., description="Buckling stability check")
    connection_check: dict = Field(..., description="Connection capacity check")

    # System performance
    system_stiffness: dict = Field(..., description="Overall system stiffness properties")
    load_distribution: dict = Field(..., description="Load distribution analysis")

    # Overall results
    utilisation_summary: dict = Field(..., description="Summary of utilizations")
    overall_check: bool = Field(..., description="Overall design check result")

    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")

    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")
