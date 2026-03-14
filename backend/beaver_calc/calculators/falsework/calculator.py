"""
Falsework calculator implementation
"""
import math
from typing import Dict, Any, Optional

from ..base import CalculatorPlugin
from .schema import FalseworkInputs, FalseworkOutputs


# Material properties database
MATERIAL_PROPS = {
    "steel": {
        "S235": {"f_y": 235, "f_u": 360, "E": 210000, "G": 81000, "rho": 7850},
        "S275": {"f_y": 275, "f_u": 410, "E": 210000, "G": 81000, "rho": 7850},
        "S355": {"f_y": 355, "f_u": 470, "E": 210000, "G": 81000, "rho": 7850}
    },
    "timber": {
        "GL24h": {"f_c_0_d": 2.4, "f_m_d": 2.4, "E_0_mean": 11000, "rho": 420},
        "GL28h": {"f_c_0_d": 2.8, "f_m_d": 2.8, "E_0_mean": 11000, "rho": 420}
    },
    "aluminum": {
        "6061-T6": {"f_y": 276, "f_u": 310, "E": 68900, "G": 26000, "rho": 2700}
    }
}

# Section properties database (simplified)
SECTION_PROPS = {
    "steel": {
        "48.3x3.2": {"A": 4.24, "I": 5.37, "W": 2.22, "r": 1.12},  # CHS
        "60.3x3.2": {"A": 5.52, "I": 11.3, "W": 3.75, "r": 1.43},   # CHS
        "76.1x3.6": {"A": 7.98, "I": 24.5, "W": 6.44, "r": 1.75},   # CHS
        "101.6x3.6": {"A": 10.9, "I": 57.3, "W": 11.3, "r": 2.29},  # CHS
        "114.3x4.0": {"A": 13.8, "I": 86.8, "W": 15.2, "r": 2.51},  # CHS
        "139.7x4.0": {"A": 16.9, "I": 155, "W": 22.2, "r": 3.03},   # CHS
        "168.3x4.5": {"A": 22.9, "I": 273, "W": 32.5, "r": 3.45},   # CHS
        "UC 152x152x23": {"A": 29.2, "I_y": 1250, "I_z": 429, "W_y": 164, "W_z": 56.3, "r_y": 6.54, "r_z": 3.83},
        "UC 203x203x46": {"A": 58.7, "I_y": 4510, "I_z": 1550, "W_y": 443, "W_z": 152, "r_y": 8.76, "r_z": 5.14},
        "UB 203x133x25": {"A": 31.1, "I_y": 2840, "I_z": 208, "W_y": 280, "W_z": 31.3, "r_y": 9.55, "r_z": 2.59}
    },
    "timber": {
        "100x100": {"A": 10000, "I": 8333333, "W": 166667},  # mm², mm⁴, mm³
        "150x150": {"A": 22500, "I": 42187500, "W": 562500},
        "200x100": {"A": 20000, "I": 16666667, "W": 333333},
        "250x100": {"A": 25000, "I": 52083333, "W": 520833}
    },
    "aluminum": {
        "50x50x3": {"A": 5.69, "I": 10.8, "W": 4.32, "r": 1.38},  # SHS
        "75x75x3": {"A": 8.56, "I": 36.6, "W": 9.76, "r": 2.07},  # SHS
        "100x100x4": {"A": 15.2, "I": 108, "W": 21.6, "r": 2.67}  # SHS
    }
}


class FalseworkCalculator(CalculatorPlugin):
    """Falsework design calculator (BS 5975)"""

    key = "falsework_v1"
    name = "Falsework Design Check"
    version = "1.0.0"
    description = "Design of falsework systems with posts, ledgers, and bracing"
    category = "temporary_works"
    input_schema = FalseworkInputs
    output_schema = FalseworkOutputs
    reference_text = "BS 5975:2019 - Code of practice for temporary works procedures"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Perform falsework design calculations"""

        # Validate inputs
        validated_inputs = self.validate_inputs(inputs)

        # Get material properties
        post_mat_props = MATERIAL_PROPS[validated_inputs.post_material][validated_inputs.post_grade]
        ledger_mat_props = MATERIAL_PROPS[validated_inputs.ledger_material][validated_inputs.ledger_grade]

        # Get section properties
        post_section_props = self._get_section_properties(
            validated_inputs.post_material, validated_inputs.post_section
        )
        ledger_section_props = self._get_section_properties(
            validated_inputs.ledger_material, validated_inputs.ledger_section
        )

        if not post_section_props:
            raise ValueError(f"Post section '{validated_inputs.post_section}' not found in database")
        if not ledger_section_props:
            raise ValueError(f"Ledger section '{validated_inputs.ledger_section}' not found in database")

        # Calculate system properties
        system_props = self._calculate_system_properties(validated_inputs)

        # Calculate loads
        loads = self._calculate_loads(validated_inputs, system_props)

        # Design checks
        post_design = self._check_post_design(
            loads, post_section_props, post_mat_props, validated_inputs
        )

        ledger_design = self._check_ledger_design(
            loads, ledger_section_props, ledger_mat_props, validated_inputs
        )

        bracing_design = self._check_bracing_design(
            loads, system_props, validated_inputs
        )

        stability_checks = self._check_stability(
            loads, system_props, validated_inputs
        )

        # Overall assessment
        checks = [post_design, ledger_design, bracing_design, stability_checks]
        overall_check = all(check.get("status") == "PASS" for check in checks if isinstance(check, dict))

        # Generate recommendations
        recommendations = self._generate_recommendations(
            checks, validated_inputs, post_design, ledger_design
        )

        # Generate warnings and notes
        warnings, notes = self._generate_warnings_and_notes(
            checks, validated_inputs
        )

        # Build results
        results = {
            "system_properties": system_props,
            "loads": loads,
            "post_design": post_design,
            "ledger_design": ledger_design,
            "bracing_design": bracing_design,
            "stability_checks": stability_checks,
            "utilisation_summary": {
                "post": post_design.get("utilization", 0),
                "ledger": ledger_design.get("utilization", 0),
                "bracing": bracing_design.get("utilization", 0) if bracing_design else 0,
                "stability": stability_checks.get("utilization", 0)
            },
            "overall_check": overall_check,
            "recommendations": recommendations,
            "warnings": warnings,
            "notes": notes
        }

        return results

    def _get_section_properties(self, material: str, section: str) -> Optional[Dict[str, float]]:
        """Get section properties from database"""
        material_sections = SECTION_PROPS.get(material, {})
        return material_sections.get(section)

    def _calculate_system_properties(self, inputs: FalseworkInputs) -> Dict[str, float]:
        """Calculate falsework system properties"""
        return {
            "span_m": inputs.span_m,
            "bay_width_m": inputs.bay_width_m,
            "tier_count": inputs.tier_count,
            "post_height_m": inputs.post_height_m,
            "total_height_m": inputs.post_height_m * inputs.tier_count,
            "brace_spacing_m": inputs.brace_spacing_m
        }

    def _calculate_loads(self, inputs: FalseworkInputs, system_props: Dict[str, float]) -> Dict[str, float]:
        """Calculate applied loads and load combinations"""
        
        # Tributary areas
        tributary_area_post = inputs.span_m * inputs.bay_width_m
        tributary_area_ledger = inputs.bay_width_m * system_props["post_height_m"]
        
        # Basic loads
        dead_load_total = inputs.dead_load_kN_per_m2 * tributary_area_post
        live_load_total = inputs.live_load_kN_per_m2 * tributary_area_post
        wind_load_total = inputs.wind_load_kN_per_m2 * tributary_area_post
        
        # Dynamic amplification
        dead_load_factored = dead_load_total * inputs.dynamic_amplification_factor
        live_load_factored = live_load_total * inputs.dynamic_amplification_factor
        wind_load_factored = wind_load_total * inputs.dynamic_amplification_factor
        
        # ULS combinations (BS 5975)
        gamma_G = 1.35
        gamma_Q = 1.5
        
        # Vertical loads
        vertical_load_ULS = gamma_G * dead_load_factored + gamma_Q * live_load_factored
        vertical_load_SLS = dead_load_factored + live_load_factored
        
        # Horizontal loads (wind)
        horizontal_load_ULS = gamma_Q * wind_load_factored
        horizontal_load_SLS = wind_load_factored
        
        return {
            "tributary_area_post": round(tributary_area_post, 2),
            "tributary_area_ledger": round(tributary_area_ledger, 2),
            "dead_load_total": round(dead_load_total, 2),
            "live_load_total": round(live_load_total, 2),
            "wind_load_total": round(wind_load_total, 2),
            "dead_load_factored": round(dead_load_factored, 2),
            "live_load_factored": round(live_load_factored, 2),
            "wind_load_factored": round(wind_load_factored, 2),
            "vertical_load_ULS": round(vertical_load_ULS, 2),
            "vertical_load_SLS": round(vertical_load_SLS, 2),
            "horizontal_load_ULS": round(horizontal_load_ULS, 2),
            "horizontal_load_SLS": round(horizontal_load_SLS, 2)
        }

    def _check_post_design(self, loads: Dict[str, float], section_props: Dict[str, float],
                          material_props: Dict[str, float], inputs: FalseworkInputs) -> Dict[str, Any]:
        """Check post design (axial compression + bending)"""
        
        N_Ed = loads["vertical_load_ULS"]  # Axial load in kN
        H_Ed = loads["horizontal_load_ULS"]  # Horizontal load in kN
        
        # For simplicity, assume horizontal load creates bending moment
        # In reality, this would depend on bracing and connections
        M_Ed = H_Ed * inputs.post_height_m / 4  # Simplified bending moment calculation
        
        # Section properties
        A = section_props["A"]  # cm²
        W = section_props.get("W_y", section_props.get("W", 0))  # cm³
        
        # Material properties
        f_y = material_props["f_y"]  # N/mm²
        
        # Axial compression resistance (simplified)
        N_c_Rd = (A * 100 * f_y) / (inputs.gamma_m0 * 1000)  # kN
        
        # Bending resistance
        M_c_Rd = (W * 1000 * f_y) / (inputs.gamma_m0 * 1000000)  # kN·m
        
        # Combined check (simplified interaction)
        util_axial = N_Ed / N_c_Rd if N_c_Rd > 0 else float('inf')
        util_bending = M_Ed / M_c_Rd if M_c_Rd > 0 else float('inf')
        utilization = math.sqrt(util_axial**2 + util_bending**2)
        
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "N_Ed": round(N_Ed, 2),
            "M_Ed": round(M_Ed, 2),
            "N_c_Rd": round(N_c_Rd, 2),
            "M_c_Rd": round(M_c_Rd, 2),
            "utilization_axial": round(util_axial, 3),
            "utilization_bending": round(util_bending, 3),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_ledger_design(self, loads: Dict[str, float], section_props: Dict[str, float],
                           material_props: Dict[str, float], inputs: FalseworkInputs) -> Dict[str, Any]:
        """Check ledger design (bending + shear)"""
        
        # Distributed load on ledger
        w_ED = loads["vertical_load_ULS"] / inputs.bay_width_m  # kN/m
        
        # Maximum bending moment (simply supported)
        M_Ed = (w_ED * (inputs.span_m ** 2)) / 8  # kN·m
        
        # Maximum shear force
        V_Ed = (w_ED * inputs.span_m) / 2  # kN
        
        # Section properties
        A = section_props["A"]  # cm²
        W = section_props.get("W_y", section_props.get("W", 0))  # cm³
        I = section_props.get("I_y", section_props.get("I", 0))  # cm⁴
        
        # Material properties
        f_y = material_props["f_y"]  # N/mm²
        
        # Bending resistance
        M_c_Rd = (W * 1000 * f_y) / (inputs.gamma_m0 * 1000000)  # kN·m
        
        # Shear resistance
        A_v = A * 100  # mm² (simplified)
        V_pl_Rd = (A_v * (f_y / math.sqrt(3))) / (inputs.gamma_m0 * 1000)  # kN
        
        # Utilizations
        util_bending = M_Ed / M_c_Rd if M_c_Rd > 0 else float('inf')
        util_shear = V_Ed / V_pl_Rd if V_pl_Rd > 0 else float('inf')
        utilization = max(util_bending, util_shear)
        
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "w_ED": round(w_ED, 2),
            "M_Ed": round(M_Ed, 2),
            "V_Ed": round(V_Ed, 2),
            "M_c_Rd": round(M_c_Rd, 2),
            "V_pl_Rd": round(V_pl_Rd, 2),
            "utilization_bending": round(util_bending, 3),
            "utilization_shear": round(util_shear, 3),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _check_bracing_design(self, loads: Dict[str, float], system_props: Dict[str, float],
                            inputs: FalseworkInputs) -> Dict[str, Any]:
        """Check bracing design"""
        
        if not inputs.use_bracing:
            return {
                "status": "NOT_APPLICABLE",
                "note": "Bracing not used in design"
            }
        
        # Horizontal load to be resisted by bracing (BS 5975:2019)
        H_Ed = loads["horizontal_load_ULS"]
        
        # Brace geometry: diagonal brace spanning between posts
        brace_height = system_props["post_height_m"]
        brace_width = inputs.brace_spacing_m
        brace_length = math.sqrt(brace_height**2 + brace_width**2)
        brace_angle = math.atan(brace_height / brace_width) if brace_width > 0 else math.pi / 4
        
        # Force in diagonal brace member from horizontal load
        # Brace resists horizontal force via axial action
        N_brace = H_Ed / math.cos(brace_angle) if math.cos(brace_angle) > 0.01 else H_Ed * 10
        
        # Brace resistance: use post section data as proxy for brace section
        # (braces typically same CHS section as posts in proprietary systems)
        post_sec = self._get_section_properties(inputs.post_material, inputs.post_section)
        post_mat = MATERIAL_PROPS[inputs.post_material][inputs.post_grade]
        
        if post_sec and post_mat:
            A_brace = post_sec["A"] * 100  # cm² -> mm²
            f_y = post_mat["f_y"]  # N/mm²
            E = post_mat["E"]  # N/mm²
            r = post_sec.get("r", post_sec.get("r_y", 1.0))  # radius of gyration cm
            
            # Slenderness of brace
            L_brace_mm = brace_length * 1000
            lambda_brace = L_brace_mm / (r * 10) if r > 0 else 200
            
            # Euler buckling load
            N_cr = (math.pi**2 * E * (post_sec.get("I", post_sec.get("I_y", 100)) * 1e4)) / (L_brace_mm**2)
            N_cr_kN = N_cr / 1000
            
            # Buckling reduction factor (EC3 curve c, alpha=0.49)
            lambda_bar = math.sqrt(A_brace * f_y / (N_cr * 1000)) if N_cr > 0 else 2.0
            alpha_imp = 0.49  # Imperfection factor curve c
            phi = 0.5 * (1 + alpha_imp * (lambda_bar - 0.2) + lambda_bar**2)
            chi = min(1.0 / (phi + math.sqrt(max(phi**2 - lambda_bar**2, 0.001))), 1.0)
            
            # Brace compression resistance
            N_b_Rd = chi * A_brace * f_y / (inputs.gamma_m1 * 1000)  # kN
        else:
            N_b_Rd = H_Ed * 2  # Conservative fallback
            N_cr_kN = N_b_Rd * 3
            lambda_brace = 100
            chi = 0.5
        
        utilization = abs(N_brace) / N_b_Rd if N_b_Rd > 0 else float('inf')
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "H_Ed": round(H_Ed, 2),
            "brace_length_m": round(brace_length, 3),
            "brace_angle_deg": round(math.degrees(brace_angle), 1),
            "N_brace_kN": round(N_brace, 2),
            "N_b_Rd_kN": round(N_b_Rd, 2),
            "N_cr_kN": round(N_cr_kN, 2),
            "slenderness": round(lambda_brace, 1),
            "chi": round(chi, 3),
            "utilization": round(utilization, 3),
            "status": status,
            "note": "Diagonal brace check per EC3 buckling curve c"
        }

    def _check_stability(self, loads: Dict[str, float], system_props: Dict[str, float],
                        inputs: FalseworkInputs) -> Dict[str, Any]:
        """Check overall stability (overturning, sliding, etc.)"""
        
        # Overturning check
        # Simplified - assume base fixity and adequate foundation
        overturning_moment = loads["horizontal_load_ULS"] * system_props["total_height_m"]
        stabilizing_moment = loads["vertical_load_ULS"] * (inputs.bay_width_m / 2)
        
        otm_ratio = overturning_moment / stabilizing_moment if stabilizing_moment > 0 else float('inf')
        utilization_otm = otm_ratio / 2.0  # Factor of safety = 2.0
        
        # Sliding check
        friction_coefficient = 0.5  # Typical value for concrete/concrete
        sliding_force = loads["horizontal_load_ULS"]
        resisting_force = loads["vertical_load_ULS"] * friction_coefficient
        
        sliding_ratio = sliding_force / resisting_force if resisting_force > 0 else float('inf')
        utilization_sliding = sliding_ratio / 1.5  # Factor of safety = 1.5
        
        # Overall stability utilization
        utilization = max(utilization_otm, utilization_sliding)
        status = "PASS" if utilization <= 1.0 else "FAIL"
        
        return {
            "overturning_moment": round(overturning_moment, 2),
            "stabilizing_moment": round(stabilizing_moment, 2),
            "otm_ratio": round(otm_ratio, 2),
            "utilization_otm": round(utilization_otm, 3),
            "sliding_force": round(sliding_force, 2),
            "resisting_force": round(resisting_force, 2),
            "sliding_ratio": round(sliding_ratio, 2),
            "utilization_sliding": round(utilization_sliding, 3),
            "utilization": round(utilization, 3),
            "status": status
        }

    def _generate_recommendations(self, checks: list, inputs: FalseworkInputs,
                               post_check: Dict[str, Any], ledger_check: Dict[str, Any]) -> list:
        """Generate design recommendations based on failed checks"""
        
        recommendations = []
        
        # Check for high utilizations
        if post_check.get("utilization", 0) > 0.8:
            recommendations.append("Consider increasing post section size or reducing bay spacing")
            
        if ledger_check.get("utilization", 0) > 0.8:
            recommendations.append("Consider increasing ledger section size or reducing span")
            
        # Bracing recommendations
        if inputs.use_bracing:
            recommendations.append("Verify bracing connections and detailing")
        else:
            recommendations.append("Consider adding bracing for improved stability")
            
        return recommendations

    def _generate_warnings_and_notes(self, checks: list, inputs: FalseworkInputs) -> tuple:
        """Generate warnings and notes"""
        
        warnings = []
        notes = []
        
        # Check high utilizations
        for check in checks:
            if isinstance(check, dict) and check.get("utilization", 0) > 0.8:
                warnings.append("High utilization (>80%) in structural element")
        
        # Notes about assumptions
        notes.append("Calculations based on BS 5975:2019")
        notes.append("Load distributions are simplified - detailed analysis recommended")
        notes.append("Connection design not included - must be verified separately")
        notes.append("Foundation design not included - must be verified separately")
        notes.append("Dynamic effects are approximated using amplification factors")
        
        return warnings, notes


# Create calculator instance
calculator = FalseworkCalculator()