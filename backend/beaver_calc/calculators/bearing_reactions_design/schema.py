"""
Input and output schemas for bearing reactions calculator
"""
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, field_validator


class LoadCase(BaseModel):
    """Individual load case definition"""

    name: str = Field(..., description="Load case identifier/name")
    vertical_force: float = Field(..., ge=0, description="Vertical force (kN)")
    longitudinal_force: float = Field(..., description="Longitudinal force (kN)")
    transverse_force: float = Field(..., description="Transverse force (kN)")
    moment_longitudinal: float = Field(..., description="Moment about longitudinal axis (kNm)")
    moment_transverse: float = Field(..., description="Moment about transverse axis (kNm)")
    torsion: float = Field(..., description="Torsional moment (kNm)")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Load case name cannot be empty')
        return v.strip()


class BearingReactionsInputs(BaseModel):
    """Input parameters for bearing reactions calculation"""

    # Bridge configuration
    bridge_type: Literal["simply_supported", "continuous", "cantilever", "arch"] = Field(
        "simply_supported",
        description="Type of bridge structure"
    )
    span_length_m: float = Field(..., gt=0, description="Total bridge span length (m)")
    number_of_spans: int = Field(1, ge=1, description="Number of spans")

    # Bearing configuration
    bearing_type: Literal["pot", "spherical", "cylindrical", "fixed", "guided", "free"] = Field(
        "pot",
        description="Type of bearing"
    )
    number_of_bearings: int = Field(..., ge=1, description="Total number of bearings")
    bearing_spacing_m: float = Field(..., gt=0, description="Spacing between bearings (m)")

    # Load cases
    load_cases: List[LoadCase] = Field(..., min_length=1, description="List of load cases to analyze")

    # Design parameters
    partial_safety_gamma_g: float = Field(1.35, ge=0, description="Partial safety factor for permanent loads")
    partial_safety_gamma_q: float = Field(1.5, ge=0, description="Partial safety factor for variable loads")
    partial_safety_gamma_f: float = Field(1.25, ge=0, description="Partial safety factor for fatigue")

    # Analysis options
    include_temperature_effects: bool = Field(True, description="Include temperature effects in analysis")
    include_creep_shrinkage: bool = Field(True, description="Include creep and shrinkage effects")
    include_dynamic_effects: bool = Field(False, description="Include dynamic load effects")

    # Temperature parameters
    temperature_range_deg: float = Field(30, ge=0, description="Temperature range (°C)")
    thermal_expansion_coeff: float = Field(0.000012, ge=0, description="Thermal expansion coefficient (1/°C)")

    @field_validator('span_length_m', 'bearing_spacing_m')
    @classmethod
    def validate_dimensions(cls, v):
        if v <= 0:
            raise ValueError('Dimensions must be positive')
        if v > 1000:
            raise ValueError('Dimension seems unreasonably large (>1000m)')
        return v

    @field_validator('number_of_bearings', 'number_of_spans')
    @classmethod
    def validate_counts(cls, v):
        if v < 1:
            raise ValueError('Must have at least 1')
        if v > 50:
            raise ValueError('Too many (>50)')
        return v


class BearingReaction(BaseModel):
    """Individual bearing reaction result"""

    bearing_id: str = Field(..., description="Bearing identifier")
    position_m: float = Field(..., description="Position along bridge (m)")

    # Reaction forces
    vertical_reaction: float = Field(..., description="Vertical reaction force (kN)")
    longitudinal_reaction: float = Field(..., description="Longitudinal reaction force (kN)")
    transverse_reaction: float = Field(..., description="Transverse reaction force (kN)")

    # Reaction moments
    moment_longitudinal: float = Field(..., description="Moment about longitudinal axis (kNm)")
    moment_transverse: float = Field(..., description="Moment about transverse axis (kNm)")
    torsion: float = Field(..., description="Torsional moment (kNm)")

    # Utilization
    utilization_vertical: float = Field(..., description="Vertical capacity utilization")
    utilization_horizontal: float = Field(..., description="Horizontal capacity utilization")
    utilization_moment: float = Field(..., description="Moment capacity utilization")


class BearingReactionsOutputs(BaseModel):
    """Output results for bearing reactions calculation"""

    # Analysis summary
    analysis_summary: dict = Field(..., description="Summary of analysis parameters")

    # Load case results
    load_case_results: dict = Field(..., description="Results for each load case")

    # Envelope results
    envelope_max: dict = Field(..., description="Maximum envelope reactions")
    envelope_min: dict = Field(..., description="Minimum envelope reactions")

    # Individual bearing reactions
    bearing_reactions: List[BearingReaction] = Field(..., description="Detailed reactions for each bearing")

    # Design checks
    capacity_checks: dict = Field(..., description="Bearing capacity verification")

    # System analysis
    system_stability: dict = Field(..., description="Overall system stability assessment")

    # Recommendations
    recommendations: list[str] = Field(default_factory=list, description="Design recommendations")

    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")
