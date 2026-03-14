"""
Input and output schemas for abutments design calculator
"""
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, field_validator


class LoadCase(BaseModel):
    """Individual load case definition"""

    name: str = Field(..., description="Load case identifier/name")
    dead_load: float = Field(..., ge=0, description="Dead load (kN)")
    live_load: float = Field(..., ge=0, description="Live load (kN)")
    wind_load: float = Field(0, description="Wind load (kN)")
    earthquake_load: float = Field(0, description="Earthquake load (kN)")
    temperature_load: float = Field(0, description="Temperature load (kN)")
    braking_force: float = Field(0, description="Braking force (kN)")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Load case name cannot be empty')
        return v.strip()


class AbutmentsInputs(BaseModel):
    """Input parameters for abutments design calculation"""

    # Bridge configuration
    bridge_type: Literal["simply_supported", "continuous", "cantilever"] = Field(
        "simply_supported",
        description="Type of bridge structure"
    )
    span_length_m: float = Field(..., gt=0, description="Bridge span length (m)")
    abutment_height_m: float = Field(..., gt=0, description="Abutment height (m)")
    abutment_width_m: float = Field(..., gt=0, description="Abutment width (m)")

    # Foundation configuration
    foundation_type: Literal["spread_footing", "pile_foundation", "caisson"] = Field(
        "spread_footing",
        description="Type of foundation"
    )
    soil_type: Literal["clay", "sand", "gravel", "rock"] = Field(
        "sand",
        description="Soil type at foundation level"
    )
    bearing_capacity_kpa: float = Field(..., gt=0, description="Soil bearing capacity (kPa)")

    # Material properties
    concrete_grade: Literal["C20", "C25", "C30", "C35", "C40"] = Field(
        "C30",
        description="Concrete grade"
    )
    reinforcement_grade: Literal["B500B", "B500C"] = Field(
        "B500B",
        description="Reinforcement steel grade"
    )

    # Load cases
    load_cases: List[LoadCase] = Field(..., min_length=1, description="List of load cases to analyze")

    # Design parameters
    partial_safety_gamma_g: float = Field(1.35, ge=0, description="Partial safety factor for permanent loads")
    partial_safety_gamma_q: float = Field(1.5, ge=0, description="Partial safety factor for variable loads")
    partial_safety_gamma_r: float = Field(1.4, ge=0, description="Partial safety factor for soil resistance")

    # Analysis options
    include_wind_loads: bool = Field(True, description="Include wind loads in analysis")
    include_earthquake_loads: bool = Field(False, description="Include earthquake loads")
    include_temperature_effects: bool = Field(True, description="Include temperature effects")

    # Geometric parameters
    backfill_height_m: float = Field(..., ge=0, description="Backfill height behind abutment (m)")
    backfill_density_knm3: float = Field(18, ge=0, description="Backfill density (kN/m³)")
    water_table_depth_m: Optional[float] = Field(None, description="Depth to water table (m)")

    @field_validator('span_length_m', 'abutment_height_m', 'abutment_width_m')
    @classmethod
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimensions must be positive')
        if v > 100:
            raise ValueError('Dimension seems unreasonably large (>100m)')
        return v

    @field_validator('bearing_capacity_kpa')
    @classmethod
    def validate_bearing_capacity(cls, v):
        if v <= 0:
            raise ValueError('Bearing capacity must be positive')
        if v > 10000:
            raise ValueError('Bearing capacity seems unreasonably high (>10,000 kPa)')
        return v


class FoundationCheck(BaseModel):
    """Foundation capacity check result"""

    check_type: str = Field(..., description="Type of check (bearing, sliding, overturning)")
    demand: float = Field(..., description="Applied load/demand")
    capacity: float = Field(..., description="Available capacity")
    utilization: float = Field(..., description="Capacity utilization ratio")
    status: Literal["PASS", "WARNING", "FAIL"] = Field(..., description="Check status")


class ReinforcementRequirement(BaseModel):
    """Reinforcement requirement for abutment"""

    location: str = Field(..., description="Location (stem, base, etc.)")
    direction: str = Field(..., description="Direction (longitudinal, transverse)")
    area_required_mm2: float = Field(..., description="Required reinforcement area (mm²)")
    area_provided_mm2: float = Field(..., description="Provided reinforcement area (mm²)")
    bar_diameter_mm: int = Field(..., description="Bar diameter (mm)")
    bar_spacing_mm: int = Field(..., description="Bar spacing (mm)")
    number_of_bars: int = Field(..., description="Number of bars")


class AbutmentsOutputs(BaseModel):
    """Output results for abutments design calculation"""

    # Analysis summary
    analysis_summary: dict = Field(..., description="Summary of analysis parameters")

    # Load combinations
    load_combinations: dict = Field(..., description="ULS and SLS load combinations")

    # Foundation design
    foundation_dimensions: dict = Field(..., description="Foundation dimensions and properties")

    # Capacity checks
    foundation_checks: List[FoundationCheck] = Field(..., description="Foundation capacity verification")

    # Structural design
    abutment_design: dict = Field(..., description="Abutment structural design parameters")

    # Reinforcement
    reinforcement: List[ReinforcementRequirement] = Field(..., description="Reinforcement requirements")

    # Stability analysis
    stability_analysis: dict = Field(..., description="Overall stability assessment")

    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")

    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")
