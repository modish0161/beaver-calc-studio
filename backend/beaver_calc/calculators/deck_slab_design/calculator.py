"""
Deck slab design calculator implementation
"""
import math
from typing import Dict, Any, Optional

from ..base import CalculatorPlugin
from .schema import DeckSlabDesignInputs, DeckSlabDesignOutputs


# Material properties
CONCRETE_PROPERTIES = {
    "C20/25": {"f_ck": 20, "f_cd": 13.3, "E_cm": 30000, "gamma_c": 1.5},
    "C25/30": {"f_ck": 25, "f_cd": 16.7, "E_cm": 31000, "gamma_c": 1.5},
    "C30/37": {"f_ck": 30, "f_cd": 20.0, "E_cm": 33000, "gamma_c": 1.5},
    "C35/45": {"f_ck": 35, "f_cd": 23.3, "E_cm": 34000, "gamma_c": 1.5},
    "C40/50": {"f_ck": 40, "f_cd": 26.7, "E_cm": 35000, "gamma_c": 1.5}
}

STEEL_PROPERTIES = {
    "B500B": {"f_yk": 500, "f_yd": 434.8, "E_s": 200000},
    "B500C": {"f_yk": 500, "f_yd": 434.8, "E_s": 200000}
}


class DeckSlabDesignCalculator(CalculatorPlugin):
    """Deck slab design calculator (EN 1992-1-1)"""

    key = "deck_slab_design_v1"
    name = "Deck Slab Design Check"
    version = "1.0.0"
    description = "Reinforced concrete slab design for one-way and two-way bending with shear checks"
    category = "structures"
    input_schema = DeckSlabDesignInputs
    output_schema = DeckSlabDesignOutputs
    reference_text = "EN 1992-1-1:2004 - Design of concrete structures"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform deck slab design calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Get material properties
        concrete_props = CONCRETE_PROPERTIES[validated_inputs.concrete_grade]
        steel_props = STEEL_PROPERTIES[validated_inputs.steel_grade]

        # Calculate self-weight
        self_weight = self._calculate_self_weight(validated_inputs)

        # Calculate design loads
        design_loads = self._calculate_design_loads(validated_inputs, self_weight)

        # Calculate design moments and shears
        design_actions = self._calculate_design_actions(validated_inputs, design_loads)

        # Calculate effective depth
        d_eff = self._calculate_effective_depth(validated_inputs)

        # Design reinforcement
        reinforcement_x = self._design_reinforcement(
            design_actions["M_Ed_x"], d_eff, concrete_props, steel_props, validated_inputs
        )
        reinforcement_y = self._design_reinforcement(
            design_actions["M_Ed_y"], d_eff, concrete_props, steel_props, validated_inputs
        )

        # Perform design checks
        bending_check_x = self._check_bending_resistance(
            design_actions["M_Ed_x"], reinforcement_x, d_eff, concrete_props, steel_props
        )
        bending_check_y = self._check_bending_resistance(
            design_actions["M_Ed_y"], reinforcement_y, d_eff, concrete_props, steel_props
        )

        shear_check = self._check_shear_resistance(
            design_actions["V_Ed"], d_eff, concrete_props, validated_inputs
        )

        deflection_check = self._check_deflection(
            validated_inputs, design_loads, concrete_props
        )

        punching_check = None
        if validated_inputs.slab_type == "two_way":
            punching_check = self._check_punching_shear(
                design_actions["V_Ed"], d_eff, concrete_props, validated_inputs
            )

        # Generate reinforcement schedule
        reinforcement_schedule = self._generate_reinforcement_schedule(
            reinforcement_x, reinforcement_y, validated_inputs
        )

        # Overall assessment
        checks = [bending_check_x, bending_check_y, shear_check, deflection_check]
        if punching_check:
            checks.append(punching_check)

        overall_check = all(check["status"] == "PASS" for check in checks)

        # Generate recommendations
        recommendations = self._generate_recommendations(checks, validated_inputs)

        # Build warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            checks, validated_inputs, reinforcement_x, reinforcement_y
        )

        # Build results
        results = {
            "concrete_fck": concrete_props["f_ck"],
            "concrete_fcd": concrete_props["f_cd"],
            "steel_fyk": steel_props["f_yk"],
            "steel_fyd": steel_props["f_yd"],
            "self_weight_kN_per_m2": round(self_weight, 2),
            "total_load_uls_kN_per_m2": round(design_loads["uls"], 2),
            "total_load_sls_kN_per_m2": round(design_loads["sls"], 2),
            "design_moments": design_actions,
            "design_shears": {"V_Ed": round(design_actions["V_Ed"], 2)},
            "reinforcement_x": reinforcement_x,
            "reinforcement_y": reinforcement_y,
            "bending_check_x": bending_check_x,
            "bending_check_y": bending_check_y,
            "shear_check": shear_check,
            "deflection_check": deflection_check,
            "punching_shear_check": punching_check,
            "utilisation_summary": {
                "bending_x": bending_check_x["utilization"],
                "bending_y": bending_check_y["utilization"],
                "shear": shear_check["utilization"],
                "deflection": deflection_check["utilization"]
            },
            "overall_check": overall_check,
            "reinforcement_schedule": reinforcement_schedule,
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _calculate_self_weight(self, inputs: DeckSlabDesignInputs) -> float:
        """Calculate slab self-weight (kN/m²)"""
        # Density of reinforced concrete ≈ 25 kN/m³
        return (inputs.thickness_mm / 1000) * 25

    def _calculate_design_loads(self, inputs: DeckSlabDesignInputs, self_weight: float) -> Dict[str, float]:
        """Calculate ULS and SLS design loads"""

        # Total loads
        g_k = inputs.dead_load_kN_per_m2 + self_weight
        q_k = inputs.live_load_kN_per_m2

        # ULS combinations (EN 1990)
        uls = inputs.gamma_g * g_k + inputs.gamma_q * q_k

        # SLS combinations (characteristic)
        sls = g_k + q_k

        return {"uls": uls, "sls": sls}

    def _calculate_design_actions(self, inputs: DeckSlabDesignInputs,
                                design_loads: Dict[str, float]) -> Dict[str, float]:
        """Calculate design bending moments and shear forces"""

        Lx = inputs.length_x_m * 1000  # mm
        Ly = inputs.length_y_m * 1000  # mm
        q_uls = design_loads["uls"] / 1000  # kN/mm²

        if inputs.slab_type == "one_way":
            # One-way slab - assume spanning in X direction
            if inputs.support_x == "simply_supported":
                M_Ed_x = (q_uls * Lx * Lx) / 8 / 1e6  # kN·m
                M_Ed_y = 0
            else:  # continuous
                M_Ed_x = (q_uls * Lx * Lx) / 10 / 1e6  # Approximate for continuous
                M_Ed_y = 0

            V_Ed = (q_uls * Lx) / 2 / 1000  # kN

        else:  # two_way
            # Two-way slab - use coefficient method (EN 1992-1-1, Table 3.1)
            alpha_x = Lx / Ly

            # Coefficients for continuous slab
            if alpha_x <= 0.6:
                k_x = 0.032
                k_y = 0.024
            elif alpha_x <= 1.0:
                k_x = 0.032 - 0.013 * (alpha_x - 0.6) / 0.4
                k_y = 0.024 + 0.008 * (alpha_x - 0.6) / 0.4
            else:
                k_x = 0.024
                k_y = 0.032

            M_Ed_x = k_x * q_uls * Lx * Lx / 1e6  # kN·m
            M_Ed_y = k_y * q_uls * Ly * Ly / 1e6  # kN·m

            # Shear force at column (simplified)
            V_Ed = q_uls * (Lx * Ly) / (4 * max(Lx, Ly)) / 1000  # kN

        return {
            "M_Ed_x": M_Ed_x,
            "M_Ed_y": M_Ed_y,
            "V_Ed": V_Ed
        }

    def _calculate_effective_depth(self, inputs: DeckSlabDesignInputs) -> float:
        """Calculate effective depth (mm)"""
        # Assume reinforcement at bottom for sagging moments
        d = inputs.thickness_mm - inputs.cover_bottom_mm - (inputs.bar_diameter_mm / 2)
        return d

    def _design_reinforcement(self, M_Ed: float, d: float,
                            concrete_props: Dict[str, float],
                            steel_props: Dict[str, float],
                            inputs: DeckSlabDesignInputs) -> Dict[str, float]:
        """Design reinforcement for given moment"""

        if M_Ed <= 0:
            return {"As_required": 0, "As_provided": 0, "spacing": 0}

        # Convert moment to N·mm
        M_Ed_Nmm = M_Ed * 1e6

        # Design reinforcement (EN 1992-1-1, 6.1)
        f_cd = concrete_props["f_cd"]
        f_yd = steel_props["f_yd"]

        # Simplified rectangular stress block
        # Assume single layer reinforcement
        k = M_Ed_Nmm / (f_cd * d * d)
        z = d * (1 - 0.4 * k) if k <= 0.25 else d * 0.95  # Lever arm

        As_required = M_Ed_Nmm / (f_yd * z)

        # Provide reinforcement with minimum spacing
        bar_dia = inputs.bar_diameter_mm
        bar_area = math.pi * (bar_dia / 2) ** 2

        # Minimum spacing (EN 1992-1-1, 8.2)
        spacing_min = max(20, bar_dia, 5)  # mm
        spacing_max = min(3 * inputs.thickness_mm, 400)  # mm

        # Calculate required spacing
        spacing = (bar_area * 1000) / As_required  # mm (for 1m width)

        # Adjust spacing to be within limits
        if spacing < spacing_min:
            spacing = spacing_min
            As_provided = (bar_area * 1000) / spacing
        elif spacing > spacing_max:
            spacing = spacing_max
            As_provided = (bar_area * 1000) / spacing
        else:
            As_provided = As_required

        return {
            "As_required": round(As_required, 2),
            "As_provided": round(As_provided, 2),
            "spacing": round(spacing, 1),
            "bar_diameter": bar_dia,
            "bars_per_meter": round(1000 / spacing, 1)
        }

    def _check_bending_resistance(self, M_Ed: float, reinforcement: Dict[str, float],
                                d: float, concrete_props: Dict[str, float],
                                steel_props: Dict[str, float]) -> Dict[str, Any]:
        """Check bending resistance"""

        if M_Ed <= 0:
            return {"M_Rd": 0, "utilization": 0, "status": "PASS"}

        As = reinforcement["As_provided"]
        f_yd = steel_props["f_yd"]
        f_cd = concrete_props["f_cd"]

        # Simplified calculation
        M_Rd = As * f_yd * d * (1 - 0.4 * (As * f_yd) / (1000 * d * f_cd)) / 1e6  # kN·m

        utilization = M_Ed / M_Rd if M_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "M_Rd": round(M_Rd, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_shear_resistance(self, V_Ed: float, d: float,
                              concrete_props: Dict[str, float],
                              inputs: DeckSlabDesignInputs) -> Dict[str, Any]:
        """Check shear resistance (EN 1992-1-1, 6.2.2)"""

        f_ck = concrete_props["f_ck"]
        f_cd = concrete_props["f_cd"]

        # Concrete shear resistance (simplified)
        # For slabs without shear reinforcement
        rho_l = 0.02  # Longitudinal reinforcement ratio (assume)
        k = min(1 + math.sqrt(200 / d), 2)
        v_min = 0.035 * k**(3/2) * math.sqrt(f_ck)

        V_Rd_c = max(0.12 * k * (100 * rho_l * f_ck)**(1/3),
                     v_min) * 1000 * d / 1000  # kN

        utilization = V_Ed / V_Rd_c if V_Rd_c > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "V_Rd_c": round(V_Rd_c, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_deflection(self, inputs: DeckSlabDesignInputs,
                        design_loads: Dict[str, float],
                        concrete_props: Dict[str, float]) -> Dict[str, Any]:
        """Check deflection (simplified serviceability check)"""

        L_eff = max(inputs.length_x_m, inputs.length_y_m) * 1000  # mm
        q_sls = design_loads["sls"] / 1000  # kN/mm²
        h = inputs.thickness_mm  # mm
        E_cm = concrete_props["E_cm"]

        # Simplified deflection calculation
        # δ = (5/384) * (q * L^4) / (E * I) for simply supported
        # I = b * h^3 / 12
        I = 1000 * (h**3) / 12  # mm⁴ for 1m width
        delta = (5 * q_sls * (L_eff**4)) / (384 * E_cm * I)

        # Deflection limit
        limit_map = {"L/250": 250, "L/300": 300, "L/350": 350, "L/400": 400}
        limit = L_eff / limit_map[inputs.deflection_limit]

        utilization = delta / limit if limit > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "delta_actual": round(delta, 2),
            "delta_limit": round(limit, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_punching_shear(self, V_Ed: float, d: float,
                            concrete_props: Dict[str, float],
                            inputs: DeckSlabDesignInputs) -> Dict[str, Any]:
        """Check punching shear for two-way slabs"""

        f_ck = concrete_props["f_ck"]
        u = 4 * 1000  # Perimeter around column (assume 1000x1000mm column)

        # Punching shear resistance (EN 1992-1-1, 6.4.3)
        v_Rd_c = 0.12 * (100 * 0.02 * f_ck)**(1/3)  # MPa
        V_Rd_c = v_Rd_c * u * d / 1000  # kN

        utilization = V_Ed / V_Rd_c if V_Rd_c > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"

        return {
            "V_Rd_c": round(V_Rd_c, 2),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _generate_reinforcement_schedule(self, reinf_x: Dict[str, float],
                                       reinf_y: Dict[str, float],
                                       inputs: DeckSlabDesignInputs) -> Dict[str, Any]:
        """Generate reinforcement schedule"""

        return {
            "bottom_x": {
                "bars": f"T{inputs.bar_diameter_mm} @ {reinf_x['spacing']}mm c/c",
                "area": round(reinf_x['As_provided'], 2),
                "quantity": f"{reinf_x['bars_per_meter']} bars/m"
            },
            "bottom_y": {
                "bars": f"T{inputs.bar_diameter_mm} @ {reinf_y['spacing']}mm c/c",
                "area": round(reinf_y['As_provided'], 2),
                "quantity": f"{reinf_y['bars_per_meter']} bars/m"
            },
            "top_x": {
                "bars": f"T{inputs.bar_diameter_mm} @ 200mm c/c",  # Distribution steel
                "area": round(reinf_x['As_provided'] * 0.2, 2),  # 20% distribution
                "quantity": "Distribution steel"
            },
            "top_y": {
                "bars": f"T{inputs.bar_diameter_mm} @ 200mm c/c",  # Distribution steel
                "area": round(reinf_y['As_provided'] * 0.2, 2),  # 20% distribution
                "quantity": "Distribution steel"
            }
        }

    def _generate_recommendations(self, checks: list, inputs: DeckSlabDesignInputs) -> list:
        """Generate design recommendations"""

        recommendations = []

        bending_checks = [c for c in checks if "bending" in str(c)]
        for check in bending_checks:
            if check["status"] == "FAIL":
                direction = "X" if "x" in str(check) else "Y"
                recommendations.append(f"Increase slab thickness or reduce span in {direction} direction")
                recommendations.append(f"Use higher strength concrete or increase reinforcement")

        shear_check = next((c for c in checks if "shear" in str(c)), None)
        if shear_check and shear_check["status"] == "FAIL":
            recommendations.append("Increase slab thickness significantly")
            recommendations.append("Consider using shear reinforcement")

        deflection_check = next((c for c in checks if "deflection" in str(c)), None)
        if deflection_check and deflection_check["status"] == "FAIL":
            recommendations.append("Increase slab thickness")
            recommendations.append("Use higher strength concrete")

        return recommendations

    def _generate_warnings_and_notes(self, checks: list, inputs: DeckSlabDesignInputs,
                                   reinf_x: Dict[str, float], reinf_y: Dict[str, float]) -> tuple:
        """Generate warnings and notes"""

        warnings = []
        notes = []

        # Check high utilizations
        for check in checks:
            if isinstance(check, dict) and check.get("utilization", 0) > 0.8:
                check_type = "bending" if "bending" in str(check) else \
                           "shear" if "shear" in str(check) else "deflection"
                warnings.append(f"High {check_type} utilization (>80%)")

        # Check minimum reinforcement
        min_As = 0.26 * (inputs.thickness_mm / 1000) * 1000 * 100  # cm²/m (0.26% of gross area)
        if reinf_x["As_provided"] < min_As or reinf_y["As_provided"] < min_As:
            warnings.append("Reinforcement below minimum requirements")

        # Notes
        notes.append("Calculations based on EN 1992-1-1")
        notes.append(f"Slab type: {inputs.slab_type.replace('_', '-')}")
        notes.append("Reinforcement design assumes single layer")
        notes.append("Distribution steel provided at top")

        return warnings, notes


# Create calculator instance
calculator = DeckSlabDesignCalculator()
