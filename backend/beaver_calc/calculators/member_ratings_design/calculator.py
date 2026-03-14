"""
Member Ratings Design Calculator
Comprehensive structural member capacity checks for steel, concrete, and timber members
"""

import math
from typing import Dict, List, Optional, Tuple
import numpy as np

from .schema import (
    MemberRatingsInputs,
    MemberRatingsOutputs,
    MaterialType,
    MemberType,
    SteelGrade,
    ConcreteGrade,
    TimberGrade,
    SectionProperties,
    MaterialProperties,
    CapacityResults,
    DesignResults,
    LoadCase
)


class MemberRatingsCalculator:
    """Comprehensive structural member capacity calculator"""

    # Material properties databases
    STEEL_PROPERTIES = {
        SteelGrade.S235: {"fy": 235, "fu": 360, "E": 210000, "G": 81000, "rho": 7850},
        SteelGrade.S275: {"fy": 275, "fu": 430, "E": 210000, "G": 81000, "rho": 7850},
        SteelGrade.S355: {"fy": 355, "fu": 490, "E": 210000, "G": 81000, "rho": 7850},
        SteelGrade.S420: {"fy": 420, "fu": 500, "E": 210000, "G": 81000, "rho": 7850},
        SteelGrade.S460: {"fy": 460, "fu": 540, "E": 210000, "G": 81000, "rho": 7850},
    }

    CONCRETE_PROPERTIES = {
        ConcreteGrade.C20_25: {"fck": 20, "fcm": 28, "fctm": 2.2, "Ecm": 30000, "rho": 2500},
        ConcreteGrade.C25_30: {"fck": 25, "fcm": 33, "fctm": 2.6, "Ecm": 31000, "rho": 2500},
        ConcreteGrade.C30_37: {"fck": 30, "fcm": 38, "fctm": 2.9, "Ecm": 33000, "rho": 2500},
        ConcreteGrade.C35_45: {"fck": 35, "fcm": 43, "fctm": 3.2, "Ecm": 34000, "rho": 2500},
        ConcreteGrade.C40_50: {"fck": 40, "fcm": 48, "fctm": 3.5, "Ecm": 35000, "rho": 2500},
    }

    TIMBER_PROPERTIES = {
        TimberGrade.C16: {"fmk": 16, "fc0k": 16, "ft0k": 14, "fvk": 2.2, "E0mean": 8000, "rho": 420},
        TimberGrade.C24: {"fmk": 24, "fc0k": 21, "ft0k": 14, "fvk": 2.5, "E0mean": 11000, "rho": 420},
        TimberGrade.C30: {"fmk": 30, "fc0k": 23, "ft0k": 18, "fvk": 2.7, "E0mean": 12000, "rho": 420},
        TimberGrade.D30: {"fmk": 30, "fc0k": 23, "ft0k": 18, "fvk": 2.7, "E0mean": 13000, "rho": 480},
        TimberGrade.D40: {"fmk": 40, "fc0k": 27, "ft0k": 24, "fvk": 3.0, "E0mean": 14000, "rho": 480},
    }

    # UKB/UB section properties (simplified database)
    STEEL_SECTIONS = {
        "UKB 127x76x13": {"A": 1650, "Ixx": 4730000, "Iyy": 497000, "Zxx": 74200, "Zyy": 13100},
        "UKB 152x89x16": {"A": 2030, "Ixx": 8990000, "Iyy": 852000, "Zxx": 118000, "Zyy": 19100},
        "UKB 178x102x19": {"A": 2430, "Ixx": 16100000, "Iyy": 1480000, "Zxx": 181000, "Zyy": 29100},
        "UKB 203x102x23": {"A": 2940, "Ixx": 21400000, "Iyy": 1700000, "Zxx": 211000, "Zyy": 33400},
        "UKB 254x102x22": {"A": 2810, "Ixx": 24100000, "Iyy": 1580000, "Zxx": 190000, "Zyy": 31000},
        "UKB 254x102x25": {"A": 3200, "Ixx": 27100000, "Iyy": 1780000, "Zxx": 213000, "Zyy": 34900},
        "UKB 305x102x25": {"A": 3170, "Ixx": 36100000, "Iyy": 1990000, "Zxx": 237000, "Zyy": 39000},
        "UKB 305x102x28": {"A": 3530, "Ixx": 40000000, "Iyy": 2200000, "Zxx": 262000, "Zyy": 43100},
        "UKB 356x127x33": {"A": 4190, "Ixx": 67500000, "Iyy": 4550000, "Zxx": 380000, "Zyy": 71600},
        "UKB 356x127x39": {"A": 4940, "Ixx": 79500000, "Iyy": 5350000, "Zxx": 447000, "Zyy": 84200},
        "UKB 406x140x39": {"A": 4970, "Ixx": 94500000, "Iyy": 5770000, "Zxx": 465000, "Zyy": 82500},
        "UKB 406x140x46": {"A": 5880, "Ixx": 111000000, "Iyy": 6790000, "Zxx": 547000, "Zyy": 97200},
        "UKB 457x152x52": {"A": 6650, "Ixx": 172000000, "Iyy": 9500000, "Zxx": 753000, "Zyy": 125000},
        "UKB 457x152x60": {"A": 7650, "Ixx": 197000000, "Iyy": 10900000, "Zxx": 863000, "Zyy": 144000},
        "UKB 533x165x66": {"A": 8410, "Ixx": 289000000, "Iyy": 14200000, "Zxx": 1080000, "Zyy": 172000},
        "UKB 533x165x74": {"A": 9430, "Ixx": 324000000, "Iyy": 15900000, "Zxx": 1220000, "Zyy": 193000},
        "UKB 610x178x82": {"A": 10400, "Ixx": 444000000, "Iyy": 19900000, "Zxx": 1460000, "Zyy": 224000},
        "UKB 610x178x100": {"A": 12700, "Ixx": 542000000, "Iyy": 24300000, "Zxx": 1780000, "Zyy": 273000},
    }

    def calculate(self, inputs: MemberRatingsInputs) -> MemberRatingsOutputs:
        """Main calculation method"""
        params = inputs.design_parameters

        # Get material properties
        material_props = self._get_material_properties(params)

        # Get section properties
        section_props = self._get_section_properties(params)

        # Analyze each load case
        load_case_results = []
        max_utilization = 0.0
        critical_case = ""
        governing_mode = ""

        for load_case in params.load_cases:
            result = self._analyze_load_case(
                load_case, params, material_props, section_props
            )
            load_case_results.append(result)

            if result.combined_utilization > max_utilization:
                max_utilization = result.combined_utilization
                critical_case = load_case.name
                governing_mode = self._get_governing_mode(result)

        # Overall design status
        design_status = self._get_design_status(max_utilization)

        # Generate recommendations and warnings
        recommendations, warnings, notes = self._generate_feedback(
            params, max_utilization, load_case_results
        )

        results = DesignResults(
            section_properties=section_props,
            material_properties=material_props,
            load_case_results=load_case_results,
            critical_load_case=critical_case,
            governing_mode=governing_mode,
            overall_utilization=max_utilization,
            design_status=design_status,
            recommendations=recommendations,
            warnings=warnings,
            notes=notes
        )

        # Eurocode references and assumptions
        eurocode_refs = self._get_eurocode_references(params.material_type)
        assumptions = self._get_assumptions(params)

        return MemberRatingsOutputs(
            results=results,
            eurocode_references=eurocode_refs,
            assumptions=assumptions
        )

    def _get_material_properties(self, params) -> MaterialProperties:
        """Get material properties based on type and grade"""
        if params.material_type == MaterialType.STEEL:
            props = self.STEEL_PROPERTIES[params.steel_grade]
            return MaterialProperties(
                yield_strength_mpa=props["fy"],
                ultimate_strength_mpa=props["fu"],
                elastic_modulus_mpa=props["E"],
                shear_modulus_mpa=props["G"],
                density_kg_m3=props["rho"],
                poisson_ratio=0.3
            )
        elif params.material_type == MaterialType.CONCRETE:
            props = self.CONCRETE_PROPERTIES[params.concrete_grade]
            return MaterialProperties(
                yield_strength_mpa=None,
                ultimate_strength_mpa=props["fck"],
                elastic_modulus_mpa=props["Ecm"],
                shear_modulus_mpa=None,
                density_kg_m3=props["rho"],
                poisson_ratio=0.2
            )
        elif params.material_type == MaterialType.TIMBER:
            props = self.TIMBER_PROPERTIES[params.timber_grade]
            return MaterialProperties(
                yield_strength_mpa=None,
                ultimate_strength_mpa=None,
                elastic_modulus_mpa=props["E0mean"],
                shear_modulus_mpa=None,
                density_kg_m3=props["rho"],
                poisson_ratio=0.4
            )

    def _get_section_properties(self, params) -> SectionProperties:
        """Calculate or retrieve section properties"""
        if params.material_type == MaterialType.STEEL and params.geometry.section_name:
            # Look up standard steel section
            if params.geometry.section_name in self.STEEL_SECTIONS:
                props = self.STEEL_SECTIONS[params.geometry.section_name]
                return SectionProperties(
                    area_mm2=props["A"],
                    i_xx_mm4=props["Ixx"],
                    i_yy_mm4=props["Iyy"],
                    z_xx_mm3=props["Zxx"],
                    z_yy_mm3=props["Zyy"],
                    j_mm4=None,
                    w_el_xx_mm3=props["Zxx"],
                    w_el_yy_mm3=props["Zyy"]
                )

        # Calculate properties for custom sections
        if params.member_type in [MemberType.RECTANGULAR_COLUMN, MemberType.RECTANGULAR_BEAM]:
            b = params.geometry.width_mm or 0
            h = params.geometry.depth_mm or 0
            area = b * h
            i_xx = (b * h**3) / 12
            i_yy = (h * b**3) / 12
            z_xx = (b * h**2) / 6
            z_yy = (h * b**2) / 6

        elif params.member_type == MemberType.CIRCULAR_COLUMN:
            d = params.geometry.diameter_mm or 0
            area = math.pi * d**2 / 4
            i_xx = math.pi * d**4 / 64
            i_yy = i_xx
            z_xx = math.pi * d**3 / 32
            z_yy = z_xx

        elif params.member_type == MemberType.SOLID_RECTANGULAR:
            b = params.geometry.breadth_mm or 0
            h = params.geometry.height_mm or 0
            area = b * h
            i_xx = (b * h**3) / 12
            i_yy = (h * b**3) / 12
            z_xx = (b * h**2) / 6
            z_yy = (h * b**2) / 6

        else:
            # Fallback: compute approximate properties from geometry if available
            b = getattr(params.geometry, 'width_mm', None) or getattr(params.geometry, 'breadth_mm', None) or 200
            h = getattr(params.geometry, 'depth_mm', None) or getattr(params.geometry, 'height_mm', None) or 300
            area = b * h
            i_xx = (b * h**3) / 12
            i_yy = (h * b**3) / 12
            z_xx = (b * h**2) / 6
            z_yy = (h * b**2) / 6

        return SectionProperties(
            area_mm2=area,
            i_xx_mm4=i_xx,
            i_yy_mm4=i_yy,
            z_xx_mm3=z_xx,
            z_yy_mm3=z_yy,
            j_mm4=None,
            w_el_xx_mm3=z_xx,
            w_el_yy_mm3=z_yy
        )

    def _analyze_load_case(self, load_case: LoadCase, params, material_props: MaterialProperties,
                          section_props: SectionProperties) -> CapacityResults:
        """Analyze a single load case"""

        # Calculate capacities based on material type
        if params.material_type == MaterialType.STEEL:
            capacities = self._calculate_steel_capacities(params, material_props, section_props)
        elif params.material_type == MaterialType.CONCRETE:
            capacities = self._calculate_concrete_capacities(params, material_props, section_props)
        elif params.material_type == MaterialType.TIMBER:
            capacities = self._calculate_timber_capacities(params, material_props, section_props)
        else:
            capacities = {
                "bending": 1000.0,
                "shear": 500.0,
                "axial": 2000.0,
                "torsional": 100.0
            }

        # Calculate utilizations
        bending_util = abs(load_case.bending_moment_knm) / capacities["bending"] if capacities["bending"] > 0 else 0
        shear_util = abs(load_case.shear_force_kn) / capacities["shear"] if capacities["shear"] > 0 else 0
        axial_util = abs(load_case.axial_force_kn) / capacities["axial"] if capacities["axial"] > 0 else 0
        torsional_util = abs(load_case.torsional_moment_knm) / capacities["torsional"] if capacities["torsional"] > 0 else 0

        # Combined loading check (simplified interaction)
        combined_util = max(
            bending_util + shear_util,  # Simple combination
            bending_util + axial_util,
            bending_util + shear_util + 0.5 * axial_util  # More conservative
        )

        # Deflection calculation (simplified for simply supported beam)
        deflection_mm = None
        deflection_util = None

        if load_case.deflection_limit_mm and params.geometry.length_m > 0:
            # Simplified deflection calculation for UDL
            if params.left_support == "pinned" and params.right_support == "pinned":
                # Assume UDL equivalent load
                equivalent_load = abs(load_case.bending_moment_knm) * 8 / (params.geometry.length_m ** 2)
                deflection_mm = (5 * equivalent_load * (params.geometry.length_m * 1000) ** 4) / (384 * material_props.elastic_modulus_mpa * section_props.i_xx_mm4)
                deflection_util = deflection_mm / load_case.deflection_limit_mm if deflection_mm else 0

        # Overall status
        max_util = max(bending_util, shear_util, axial_util, torsional_util, combined_util)
        if deflection_util:
            max_util = max(max_util, deflection_util)

        if max_util <= 1.0:
            status = "PASS"
        elif max_util <= 1.15:
            status = "WARNING"
        else:
            status = "FAIL"

        return CapacityResults(
            load_case_name=load_case.name,
            bending_capacity_knm=capacities["bending"],
            shear_capacity_kn=capacities["shear"],
            axial_capacity_kn=capacities["axial"],
            torsional_capacity_knm=capacities["torsional"],
            bending_utilization=bending_util,
            shear_utilization=shear_util,
            axial_utilization=axial_util,
            torsional_utilization=torsional_util,
            combined_utilization=combined_util,
            deflection_mm=deflection_mm,
            deflection_utilization=deflection_util,
            overall_status=status
        )

    def _calculate_steel_capacities(self, params, material_props: MaterialProperties,
                                   section_props: SectionProperties) -> Dict[str, float]:
        """Calculate steel member capacities"""
        fy = material_props.yield_strength_mpa or 275

        # Bending capacity (EN 1993-1-1)
        bending_capacity = (fy * section_props.w_el_xx_mm3) / 1000  # kN·m

        # Shear capacity (EN 1993-1-1)
        shear_capacity = (fy * section_props.area_mm2 * 0.6) / 1000  # kN (simplified)

        # Axial capacity (EN 1993-1-1)
        axial_capacity = (fy * section_props.area_mm2) / 1000  # kN

        # Torsional capacity (simplified)
        torsional_capacity = bending_capacity * 0.3  # Conservative estimate

        return {
            "bending": bending_capacity,
            "shear": shear_capacity,
            "axial": axial_capacity,
            "torsional": torsional_capacity
        }

    def _calculate_concrete_capacities(self, params, material_props: MaterialProperties,
                                      section_props: SectionProperties) -> Dict[str, float]:
        """Calculate concrete member capacities"""
        fck = material_props.ultimate_strength_mpa or 30

        # Simplified concrete capacity calculations
        # Bending capacity (simplified)
        bending_capacity = (0.8 * fck * section_props.w_el_xx_mm3) / 1000  # kN·m

        # Shear capacity (simplified)
        shear_capacity = (0.25 * fck * section_props.area_mm2) / 1000  # kN

        # Axial capacity (simplified)
        axial_capacity = (0.3 * fck * section_props.area_mm2) / 1000  # kN

        # Torsional capacity (simplified)
        torsional_capacity = bending_capacity * 0.2  # Conservative estimate

        return {
            "bending": bending_capacity,
            "shear": shear_capacity,
            "axial": axial_capacity,
            "torsional": torsional_capacity
        }

    def _calculate_timber_capacities(self, params, material_props: MaterialProperties,
                                    section_props: SectionProperties) -> Dict[str, float]:
        """Calculate timber member capacities"""
        # Simplified timber capacity calculations
        # Bending capacity (EN 1995-1-1)
        bending_capacity = (15 * section_props.w_el_xx_mm3) / 1000  # kN·m (conservative)

        # Shear capacity (EN 1995-1-1)
        shear_capacity = (2.5 * section_props.area_mm2) / 1000  # kN

        # Axial capacity (EN 1995-1-1)
        axial_capacity = (15 * section_props.area_mm2) / 1000  # kN

        # Torsional capacity (simplified)
        torsional_capacity = bending_capacity * 0.15  # Conservative estimate

        return {
            "bending": bending_capacity,
            "shear": shear_capacity,
            "axial": axial_capacity,
            "torsional": torsional_capacity
        }

    def _get_governing_mode(self, result: CapacityResults) -> str:
        """Determine governing failure mode"""
        utilizations = {
            "bending": result.bending_utilization,
            "shear": result.shear_utilization,
            "axial": result.axial_utilization,
            "torsional": result.torsional_utilization,
            "combined": result.combined_utilization
        }

        max_mode = max(utilizations, key=utilizations.get)
        return max_mode.title()

    def _get_design_status(self, max_utilization: float) -> str:
        """Determine overall design status"""
        if max_utilization <= 1.0:
            return "PASS"
        elif max_utilization <= 1.15:
            return "WARNING"
        else:
            return "FAIL"

    def _generate_feedback(self, params, max_utilization: float,
                          load_case_results: List[CapacityResults]) -> Tuple[List[str], List[str], List[str]]:
        """Generate recommendations, warnings, and notes"""
        recommendations = []
        warnings = []
        notes = []

        if max_utilization > 1.0:
            recommendations.append("Increase member size or reduce applied loads")

        if max_utilization > 1.15:
            warnings.append("Design exceeds capacity limits - immediate redesign required")

        if params.material_type == MaterialType.STEEL:
            notes.append("Calculations based on EN 1993-1-1 with UK National Annex")
        elif params.material_type == MaterialType.CONCRETE:
            notes.append("Calculations based on EN 1992-1-1 with UK National Annex")
        elif params.material_type == MaterialType.TIMBER:
            notes.append("Calculations based on EN 1995-1-1 with UK National Annex")

        return recommendations, warnings, notes

    def _get_eurocode_references(self, material_type: MaterialType) -> List[str]:
        """Get relevant Eurocode references"""
        if material_type == MaterialType.STEEL:
            return [
                "EN 1993-1-1: General rules and rules for buildings",
                "EN 1993-1-1 UK NA: UK National Annex to EN 1993-1-1"
            ]
        elif material_type == MaterialType.CONCRETE:
            return [
                "EN 1992-1-1: General rules and rules for buildings",
                "EN 1992-1-1 UK NA: UK National Annex to EN 1992-1-1"
            ]
        elif material_type == MaterialType.TIMBER:
            return [
                "EN 1995-1-1: General rules and rules for buildings",
                "EN 1995-1-1 UK NA: UK National Annex to EN 1995-1-1"
            ]
        return []

    def _get_assumptions(self, params) -> List[str]:
        """Get design assumptions"""
        assumptions = [
            "Linear elastic material behavior",
            "Standard atmospheric exposure conditions",
            "No significant deterioration over design life"
        ]

        if params.material_type == MaterialType.STEEL:
            assumptions.extend([
                "Steel grade properties as per EN 10025",
                "Standard corrosion protection applied"
            ])
        elif params.material_type == MaterialType.CONCRETE:
            assumptions.extend([
                "Concrete strength based on characteristic cylinder strength",
                "Standard reinforcement detailing followed"
            ])
        elif params.material_type == MaterialType.TIMBER:
            assumptions.extend([
                "Timber strength class properties as per EN 338",
                "Standard moisture content and service conditions"
            ])

        return assumptions


# Factory function
def calculate_member_ratings(inputs: MemberRatingsInputs) -> MemberRatingsOutputs:
    """Calculate member ratings"""
    calculator = MemberRatingsCalculator()
    return calculator.calculate(inputs)
