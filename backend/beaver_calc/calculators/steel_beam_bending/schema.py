"""
Input and output schemas for steel beam bending calculator
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class SteelBeamBendingInputs(BaseModel):
    """Input parameters for steel beam bending check"""

    # Section properties
    section: str = Field(..., description="Steel section designation (e.g., 'UKB 610x229x101')")

    # Loading
    span_m: float = Field(..., gt=0, description="Beam span in meters")
    uniform_load_kN_per_m: float = Field(..., ge=0, description="Uniform load in kN/m")

    # Support conditions
    lateral_restraint: Literal["restrained", "unrestrained"] = Field(
        "unrestrained",
        description="Lateral restraint condition"
    )

    # Material
    steel_grade: Literal["S235", "S275", "S355", "S420", "S460"] = Field(
        "S355",
        description="Steel grade"
    )

    # Partial safety factors (ULS)
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

    @field_validator('uniform_load_kN_per_m')
    @classmethod
    def validate_load(cls, v):
        if v < 0:
            raise ValueError('Load cannot be negative')
        if v > 10000:
            raise ValueError('Load seems unreasonably high (>10,000 kN/m)')
        return v


class SteelBeamBendingOutputs(BaseModel):
    """Output results for steel beam bending check"""

    # Design moments and forces
    M_Ed_kNm: float = Field(..., description="Design bending moment (kNm)")
    V_Ed_kN: float = Field(..., description="Design shear force (kN)")

    # Section properties (calculated)
    W_el_y: float = Field(..., description="Elastic section modulus (cm³)")
    W_pl_y: float = Field(..., description="Plastic section modulus (cm³)")
    I_y: float = Field(..., description="Second moment of area (cm⁴)")
    A: float = Field(..., description="Cross-sectional area (cm²)")

    # Material properties
    f_y: float = Field(..., description="Yield strength (N/mm²)")
    f_u: float = Field(..., description="Ultimate strength (N/mm²)")

    # Capacities
    M_c_Rd_kNm: float = Field(..., description="Moment resistance (kNm)")
    V_pl_Rd_kN: float = Field(..., description="Plastic shear resistance (kN)")

    # Utilizations
    utilisation_bending: float = Field(..., description="Bending utilization ratio")
    utilisation_shear: float = Field(..., description="Shear utilization ratio")
    utilisation_combined: float = Field(..., description="Combined utilization ratio")

    # Deflection
    deflection_mm: float = Field(..., description="Deflection under service load (mm)")
    deflection_limit_mm: float = Field(..., description="Deflection limit (mm)")
    deflection_check: bool = Field(..., description="Deflection check passed")

    # Stability (if unrestrained)
    L_cr_m: Optional[float] = Field(None, description="Critical buckling length (m)")
    M_b_Rd_kNm: Optional[float] = Field(None, description="Lateral torsional buckling resistance (kNm)")
    utilisation_ltb: Optional[float] = Field(None, description="LTB utilization ratio")

    # Checks
    bending_check: bool = Field(..., description="Bending check passed")
    shear_check: bool = Field(..., description="Shear check passed")
    ltb_check: Optional[bool] = Field(None, description="LTB check passed")
    overall_check: bool = Field(..., description="Overall check passed")

    # Warnings and notes
    warnings: list[str] = Field(default_factory=list, description="Warning messages")
    notes: list[str] = Field(default_factory=list, description="Additional notes")
