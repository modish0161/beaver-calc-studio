"""
Input and output schemas for falsework calculator
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class FalseworkInputs(BaseModel):
    """Input parameters for falsework design check"""

    # Geometry
    span_m: float = Field(..., gt=0, description="Span between supports in meters")
    bay_width_m: float = Field(..., gt=0, description="Bay width in meters")
    tier_count: int = Field(..., ge=1, le=5, description="Number of tiers (1-5)")
    post_height_m: float = Field(..., gt=0, description="Post height in meters")

    # Loading
    dead_load_kN_per_m2: float = Field(..., ge=0, description="Dead load (formwork + reinforcement) in kN/m²")
    live_load_kN_per_m2: float = Field(..., ge=0, description="Live load (workers + equipment) in kN/m²")
    wind_load_kN_per_m2: float = Field(0, ge=0, description="Wind load in kN/m²")
    dynamic_amplification_factor: float = Field(1.2, ge=1.0, description="Dynamic amplification factor")

    # Materials
    post_material: Literal["steel", "timber", "aluminum"] = Field(
        "steel",
        description="Post material type"
    )
    ledger_material: Literal["steel", "timber", "aluminum"] = Field(
        "steel",
        description="Ledger material type"
    )

    # Post properties
    post_section: str = Field(..., description="Post section designation")
    post_grade: str = Field(..., description="Post material grade")

    # Ledger properties
    ledger_section: str = Field(..., description="Ledger section designation")
    ledger_grade: str = Field(..., description="Ledger material grade")

    # Bracing
    use_bracing: bool = Field(True, description="Use horizontal/vertical bracing")
    brace_spacing_m: float = Field(3.0, gt=0, description="Brace spacing in meters")

    # Partial safety factors
    gamma_m0: float = Field(1.0, ge=0, description="Partial safety factor for resistance")
    gamma_m1: float = Field(1.0, ge=0, description="Partial safety factor for buckling")

    @field_validator('span_m', 'bay_width_m', 'post_height_m')
    @classmethod
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimension must be positive')
        if v > 50:
            raise ValueError('Dimension seems unreasonably large (>50m)')
        return v

    @field_validator('dead_load_kN_per_m2', 'live_load_kN_per_m2', 'wind_load_kN_per_m2')
    @classmethod
    def validate_loads(cls, v):
        if v < 0:
            raise ValueError('Load cannot be negative')
        if v > 20:
            raise ValueError('Load seems unreasonably high (>20 kN/m²)')
        return v

    @field_validator('tier_count')
    @classmethod
    def validate_tiers(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Tier count must be between 1 and 5')
        return v


class FalseworkOutputs(BaseModel):
    """Output results for falsework design check"""

    # System properties
    system_properties: dict = Field(..., description="Falsework system properties")
    
    # Loads
    loads: dict = Field(..., description="Applied loads and load combinations")
    
    # Post checks
    post_design: dict = Field(..., description="Post design checks")
    
    # Ledger checks
    ledger_design: dict = Field(..., description="Ledger design checks")
    
    # Bracing checks
    bracing_design: dict = Field(..., description="Bracing design checks")
    
    # Stability checks
    stability_checks: dict = Field(..., description="Overall stability checks")
    
    # Utilization summary
    utilisation_summary: dict = Field(..., description="Summary of utilizations")
    overall_check: bool = Field(..., description="Overall design check result")
    
    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")
    
    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")