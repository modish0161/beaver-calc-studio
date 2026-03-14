"""
Soffit shoring (falsework prop) design for supporting freshly-cast slabs.
Per BS 5975 / EN 12812, checks prop capacity, head/base plate bearing, and slab back-propping.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SoffitShoresCalculator(CalculatorPlugin):
    key = "soffit_shores_v1"
    name = "Soffit Shores"
    version = "1.0.0"
    description = "Soffit shoring prop design per BS 5975 / EN 12812"
    category = "temporary_works"
    reference_text = "BS 5975:2019 cl 20; EN 12812:2008"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Slab
        slab_thickness_mm = inputs.get('slab_thickness_mm', 250)
        slab_span_x_m = inputs.get('slab_span_x_m', 6)
        slab_span_y_m = inputs.get('slab_span_y_m', 6)
        gamma_conc = inputs.get('gamma_concrete_kN_m3', 25)
        # Imposed construction load
        q_constr_kPa = inputs.get('construction_load_kPa', 1.5)  # BS 5975 cl 20
        # Formwork self-weight
        q_formwork_kPa = inputs.get('formwork_selfweight_kPa', 0.5)

        # Prop data
        prop_type = inputs.get('prop_type', 'acrow_no3')  # acrow_no3, acrow_no4, etc.
        prop_swl_kN = inputs.get('prop_swl_kN', 20.5)  # Acrow No.3 at max extension
        prop_spacing_x_m = inputs.get('prop_spacing_x_m', 1.2)
        prop_spacing_y_m = inputs.get('prop_spacing_y_m', 1.2)
        prop_height_m = inputs.get('prop_height_m', 3.0)

        # Head plate / base plate
        head_plate_mm = inputs.get('head_plate_size_mm', 150)
        base_plate_mm = inputs.get('base_plate_size_mm', 150)
        bearing_capacity_kPa = inputs.get('bearing_surface_capacity_kPa', 5000)  # concrete slab below

        # Back-propping
        n_levels_backpropped = inputs.get('n_levels_backpropped', 1)
        slab_below_thickness_mm = inputs.get('slab_below_thickness_mm', 250)

        # ULS factors (BS 5975 / EN 12812)
        gamma_G = inputs.get('gamma_G', 1.35)
        gamma_Q = inputs.get('gamma_Q', 1.5)

        # Loads
        g_slab = gamma_conc * slab_thickness_mm / 1000  # kPa
        q_total_char = g_slab + q_formwork_kPa + q_constr_kPa
        q_total_uls = g_slab * gamma_G + q_formwork_kPa * gamma_G + q_constr_kPa * gamma_Q

        # Tributary area per prop
        trib_area = prop_spacing_x_m * prop_spacing_y_m

        # Prop load
        P_char_kN = q_total_char * trib_area
        P_uls_kN = q_total_uls * trib_area

        # Prop capacity check (SWL is characteristic/service)
        prop_ratio = P_char_kN / prop_swl_kN if prop_swl_kN > 0 else 999

        # Bearing check (head/base plate)
        plate_area_m2 = (head_plate_mm / 1000) ** 2
        bearing_stress_kPa = P_uls_kN / plate_area_m2 if plate_area_m2 > 0 else 999
        bearing_ratio = bearing_stress_kPa / bearing_capacity_kPa if bearing_capacity_kPa > 0 else 999

        # Number of props required
        total_area = slab_span_x_m * slab_span_y_m
        n_x = math.ceil(slab_span_x_m / prop_spacing_x_m)
        n_y = math.ceil(slab_span_y_m / prop_spacing_y_m)
        n_props = n_x * n_y

        # Back-propping load on slab below
        if n_levels_backpropped > 0:
            # Load shared across n_levels+1 slabs (simplified)
            bp_load_per_slab = q_total_char / (n_levels_backpropped + 1)
            slab_below_capacity = gamma_conc * slab_below_thickness_mm / 1000 * 0.5  # crude 50% of SW as indicator
            bp_ratio = bp_load_per_slab / (slab_below_capacity + q_constr_kPa) if slab_below_capacity > 0 else 999
        else:
            bp_load_per_slab = 0
            bp_ratio = 0

        checks = [
            {"name": "Prop load vs SWL",
             "utilisation": round(prop_ratio * 100, 1),
             "status": "PASS" if prop_ratio <= 1.0 else "FAIL",
             "detail": f"P={P_char_kN:.1f} kN / SWL={prop_swl_kN:.1f} kN (trib {prop_spacing_x_m}×{prop_spacing_y_m}m)"},
            {"name": "Head/base plate bearing",
             "utilisation": round(bearing_ratio * 100, 1),
             "status": "PASS" if bearing_ratio <= 1.0 else "FAIL",
             "detail": f"σ={bearing_stress_kPa:.0f} kPa / {bearing_capacity_kPa:.0f} kPa ({head_plate_mm}mm plate)"},
            {"name": "Back-propping adequacy",
             "utilisation": round(bp_ratio * 100, 1),
             "status": "PASS" if bp_ratio <= 1.0 else "FAIL",
             "detail": f"Slab below load={bp_load_per_slab:.1f} kPa ({n_levels_backpropped} level(s) back-propped)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "slab_sw_kPa": round(g_slab, 2),
            "total_load_char_kPa": round(q_total_char, 2),
            "total_load_uls_kPa": round(q_total_uls, 2),
            "prop_load_char_kN": round(P_char_kN, 1),
            "prop_load_uls_kN": round(P_uls_kN, 1),
            "n_props": n_props,
            "n_x": n_x,
            "n_y": n_y,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SoffitShoresCalculator()
