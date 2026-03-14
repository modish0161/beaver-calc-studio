"""
Member Ratings Design Calculator Schema
Comprehensive structural member capacity checks for steel, concrete, and timber members
"""

from enum import Enum
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field, validator
from pint import UnitRegistry

# Initialize unit registry
ureg = UnitRegistry()
Q_ = ureg.Quantity


class MaterialType(str, Enum):
    STEEL = "steel"
    CONCRETE = "concrete"
    TIMBER = "timber"


class SteelGrade(str, Enum):
    S235 = "S235"
    S275 = "S275"
    S355 = "S355"
    S420 = "S420"
    S460 = "S460"


class ConcreteGrade(str, Enum):
    C20_25 = "C20/25"
    C25_30 = "C25/30"
    C30_37 = "C30/37"
    C35_45 = "C35/45"
    C40_50 = "C40/50"


class TimberGrade(str, Enum):
    C16 = "C16"
    C24 = "C24"
    C30 = "C30"
    D30 = "D30"
    D40 = "D40"


class MemberType(str, Enum):
    # Steel
    I_BEAM = "i_beam"
    H_BEAM = "h_beam"
    BOX_SECTION = "box_section"
    CHS = "chs"
    RHS = "rhs"
    ANGLE = "angle"
    CHANNEL = "channel"

    # Concrete
    RECTANGULAR_COLUMN = "rectangular_column"
    CIRCULAR_COLUMN = "circular_column"
    RECTANGULAR_BEAM = "rectangular_beam"
    T_BEAM = "t_beam"

    # Timber
    SOLID_RECTANGULAR = "solid_rectangular"
    GLAULAM = "glulam"


class LoadCase(BaseModel):
    name: str = Field(..., description="Load case identifier")
    bending_moment_knm: float = Field(0.0, description="Bending moment in kN·m", ge=0)
    shear_force_kn: float = Field(0.0, description="Shear force in kN", ge=0)
    axial_force_kn: float = Field(0.0, description="Axial force in kN")
    torsional_moment_knm: float = Field(0.0, description="Torsional moment in kN·m", ge=0)
    deflection_limit_mm: Optional[float] = Field(None, description="Deflection limit in mm")


class MemberGeometry(BaseModel):
    # Common dimensions
    length_m: float = Field(..., description="Member length in meters", gt=0)

    # Steel sections
    section_name: Optional[str] = Field(None, description="Standard section designation")

    # Concrete dimensions
    width_mm: Optional[float] = Field(None, description="Width in mm", gt=0)
    depth_mm: Optional[float] = Field(None, description="Depth in mm", gt=0)
    cover_mm: Optional[float] = Field(None, description="Concrete cover in mm", gt=0)

    # Timber dimensions
    breadth_mm: Optional[float] = Field(None, description="Breadth in mm", gt=0)
    height_mm: Optional[float] = Field(None, description="Height in mm", gt=0)

    # Circular sections
    diameter_mm: Optional[float] = Field(None, description="Diameter in mm", gt=0)

    # Reinforcement (concrete)
    longitudinal_bars: Optional[str] = Field(None, description="Longitudinal reinforcement arrangement")
    stirrups: Optional[str] = Field(None, description="Shear reinforcement arrangement")


class DesignParameters(BaseModel):
    material_type: MaterialType = Field(..., description="Material type")

    # Material properties
    steel_grade: Optional[SteelGrade] = Field(None, description="Steel grade")
    concrete_grade: Optional[ConcreteGrade] = Field(None, description="Concrete grade")
    timber_grade: Optional[TimberGrade] = Field(None, description="Timber grade")

    # Design parameters
    member_type: MemberType = Field(..., description="Member type")
    geometry: MemberGeometry = Field(..., description="Member geometry")

    # Loading
    load_cases: List[LoadCase] = Field(..., description="Load cases to analyze", min_items=1)

    # Design criteria
    safety_factor: float = Field(1.35, description="Partial safety factor", gt=0)
    serviceability_limit: float = Field(1.0, description="Serviceability limit factor", gt=0)

    # Boundary conditions
    left_support: str = Field("pinned", description="Left support condition")
    right_support: str = Field("pinned", description="Right support condition")

    # Environmental
    temperature_celsius: float = Field(20.0, description="Design temperature in °C")
    exposure_class: str = Field("normal", description="Exposure class")

    @validator('load_cases')
    def validate_load_cases(cls, v):
        if len(v) == 0:
            raise ValueError('At least one load case must be provided')
        return v

    @validator('steel_grade')
    def validate_steel_grade(cls, v, values):
        if values.get('material_type') == MaterialType.STEEL and v is None:
            raise ValueError('Steel grade is required for steel members')
        return v

    @validator('concrete_grade')
    def validate_concrete_grade(cls, v, values):
        if values.get('material_type') == MaterialType.CONCRETE and v is None:
            raise ValueError('Concrete grade is required for concrete members')
        return v

    @validator('timber_grade')
    def validate_timber_grade(cls, v, values):
        if values.get('material_type') == MaterialType.TIMBER and v is None:
            raise ValueError('Timber grade is required for timber members')
        return v


class SectionProperties(BaseModel):
    area_mm2: float = Field(..., description="Cross-sectional area in mm²")
    i_xx_mm4: float = Field(..., description="Second moment of area about x-x axis in mm⁴")
    i_yy_mm4: float = Field(..., description="Second moment of area about y-y axis in mm⁴")
    z_xx_mm3: float = Field(..., description="Elastic section modulus about x-x axis in mm³")
    z_yy_mm3: float = Field(..., description="Elastic section modulus about y-y axis in mm³")
    j_mm4: Optional[float] = Field(None, description="Torsion constant in mm⁴")
    w_el_xx_mm3: Optional[float] = Field(None, description="Elastic section modulus (weak axis) in mm³")
    w_el_yy_mm3: Optional[float] = Field(None, description="Elastic section modulus (strong axis) in mm³")


class MaterialProperties(BaseModel):
    yield_strength_mpa: Optional[float] = Field(None, description="Yield strength in MPa")
    ultimate_strength_mpa: Optional[float] = Field(None, description="Ultimate strength in MPa")
    elastic_modulus_mpa: float = Field(..., description="Elastic modulus in MPa")
    shear_modulus_mpa: Optional[float] = Field(None, description="Shear modulus in MPa")
    density_kg_m3: float = Field(..., description="Material density in kg/m³")
    poisson_ratio: Optional[float] = Field(None, description="Poisson's ratio")


class CapacityResults(BaseModel):
    load_case_name: str = Field(..., description="Load case identifier")

    # Capacities
    bending_capacity_knm: float = Field(..., description="Bending capacity in kN·m")
    shear_capacity_kn: float = Field(..., description="Shear capacity in kN")
    axial_capacity_kn: float = Field(..., description="Axial capacity in kN")
    torsional_capacity_knm: float = Field(..., description="Torsional capacity in kN·m")

    # Utilizations
    bending_utilization: float = Field(..., description="Bending utilization ratio")
    shear_utilization: float = Field(..., description="Shear utilization ratio")
    axial_utilization: float = Field(..., description="Axial utilization ratio")
    torsional_utilization: float = Field(..., description="Torsional utilization ratio")
    combined_utilization: float = Field(..., description="Combined loading utilization ratio")

    # Serviceability
    deflection_mm: Optional[float] = Field(None, description="Calculated deflection in mm")
    deflection_utilization: Optional[float] = Field(None, description="Deflection utilization ratio")

    # Status
    overall_status: str = Field(..., description="Overall capacity status: PASS/FAIL/WARNING")


class DesignResults(BaseModel):
    section_properties: SectionProperties = Field(..., description="Calculated section properties")
    material_properties: MaterialProperties = Field(..., description="Material properties used")

    # Load case results
    load_case_results: List[CapacityResults] = Field(..., description="Results for each load case")

    # Critical load case
    critical_load_case: str = Field(..., description="Most critical load case")
    governing_mode: str = Field(..., description="Governing failure mode")

    # Overall assessment
    overall_utilization: float = Field(..., description="Maximum utilization ratio")
    design_status: str = Field(..., description="Overall design status: PASS/FAIL/WARNING")

    # Recommendations
    recommendations: List[str] = Field(default_factory=list, description="Design recommendations")
    warnings: List[str] = Field(default_factory=list, description="Design warnings")
    notes: List[str] = Field(default_factory=list, description="Additional notes")


class MemberRatingsInputs(BaseModel):
    """Input schema for member ratings calculator"""
    design_parameters: DesignParameters = Field(..., description="Design parameters and loading")


class MemberRatingsOutputs(BaseModel):
    """Output schema for member ratings calculator"""
    results: DesignResults = Field(..., description="Complete design results")
    eurocode_references: List[str] = Field(..., description="Relevant Eurocode clauses")
    assumptions: List[str] = Field(..., description="Design assumptions made")
