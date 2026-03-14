"""
Trench support (shoring) design per BS 6031 / CIRIA R97 / EN 1997-1.
Covers hydraulic props, timber shoring, and trench box capacity checks.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class TrenchSupportCalculator(CalculatorPlugin):
    key = "trench_support_v1"
    name = "Trench Support"
    version = "1.0.0"
    description = "Trench support design per BS 6031 / CIRIA R97 / EN 1997-1"
    category = "temporary-works"
    reference_text = "BS 6031:2009; CIRIA R97; EN 1997-1:2004"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Trench geometry
        depth_m = inputs.get('depth_m', 3.0)
        width_m = inputs.get('width_m', 1.2)
        length_m = inputs.get('length_m', 6.0)

        # Soil parameters
        gamma_kPa = inputs.get('gamma_kN_m3', 19.0)
        phi_deg = inputs.get('phi_deg', 25.0)
        c_kPa = inputs.get('c_kPa', 0.0)
        water_table_m = inputs.get('water_table_m', depth_m)  # default: below trench

        # Surcharge
        surcharge_kPa = inputs.get('surcharge_kPa', 10.0)

        # Support type
        support_type = inputs.get('support_type', 'hydraulic_prop')  # hydraulic_prop, timber, trench_box

        # Prop/strut capacity
        prop_capacity_kN = inputs.get('prop_capacity_kN', 200.0)
        prop_spacing_m = inputs.get('prop_spacing_m', 2.0)  # horizontal spacing
        n_prop_rows = inputs.get('n_prop_rows', 2)  # vertical rows

        # Active earth pressure coefficient (Rankine)
        phi_rad = math.radians(phi_deg)
        Ka = math.tan(math.pi / 4 - phi_rad / 2) ** 2

        # Earth pressure at base (triangular)
        sigma_a_base = Ka * gamma_kPa * depth_m - 2 * c_kPa * math.sqrt(Ka)
        sigma_a_base = max(sigma_a_base, 0)

        # Surcharge pressure (uniform)
        sigma_surcharge = Ka * surcharge_kPa

        # Hydrostatic pressure below water table
        if water_table_m < depth_m:
            hw = depth_m - water_table_m
            sigma_water = 9.81 * hw
        else:
            hw = 0
            sigma_water = 0

        # Total lateral pressure at base
        sigma_total = sigma_a_base + sigma_surcharge + sigma_water

        # Total thrust per metre run of trench (simplified trapezoidal)
        Pa_earth = 0.5 * Ka * gamma_kPa * depth_m ** 2 - 2 * c_kPa * math.sqrt(Ka) * depth_m
        Pa_earth = max(Pa_earth, 0)
        Pa_surcharge = Ka * surcharge_kPa * depth_m
        Pa_water = 0.5 * 9.81 * hw ** 2 if hw > 0 else 0

        total_thrust_per_m = Pa_earth + Pa_surcharge + Pa_water

        # Prop loading (assume roughly equal distribution among rows)
        # Each row takes thrust over its tributary height × prop spacing
        if n_prop_rows > 0:
            load_per_prop = total_thrust_per_m * prop_spacing_m / n_prop_rows
        else:
            load_per_prop = total_thrust_per_m * prop_spacing_m

        prop_util = load_per_prop / prop_capacity_kN if prop_capacity_kN > 0 else 999

        # Waling/bearer check (for timber/hydraulic)
        # Assume waling spans between props
        waling_M = load_per_prop * prop_spacing_m / 8  # continuous beam approx
        waling_capacity_kNm = inputs.get('waling_capacity_kNm', 15.0)
        waling_util = waling_M / waling_capacity_kNm if waling_capacity_kNm > 0 else 999

        # Sheeting check — bending on vertical sheet spanning between prop rows
        if n_prop_rows >= 2:
            # Max span between props
            vert_spacing = depth_m / (n_prop_rows + 1)  # approx equal spacing
        else:
            vert_spacing = depth_m

        # Pressure at mid-span (conservative: use base pressure)
        sheet_M = sigma_total * vert_spacing ** 2 / 8  # kNm per metre width
        sheet_capacity_kNm = inputs.get('sheet_capacity_kNm_per_m', 5.0)
        sheet_util = sheet_M / sheet_capacity_kNm if sheet_capacity_kNm > 0 else 999

        # Base heave check (undrained clay only)
        cu_kPa = inputs.get('cu_kPa', 50.0)
        Nc_heave = 6.0  # BS 6031 / Bjerrum & Eide
        fos_heave = Nc_heave * cu_kPa / (gamma_kPa * depth_m + surcharge_kPa) if (gamma_kPa * depth_m + surcharge_kPa) > 0 else 999
        heave_util = 1.5 / fos_heave if fos_heave > 0 else 999  # FoS ≥ 1.5 required

        checks = []

        checks.append({
            "name": "Prop capacity",
            "utilisation": round(prop_util, 3),
            "status": "PASS" if prop_util <= 1.0 else "FAIL",
            "detail": (f"Load per prop = {load_per_prop:.1f} kN vs capacity "
                       f"{prop_capacity_kN:.0f} kN ({prop_util * 100:.0f}%)")
        })

        checks.append({
            "name": "Waling bending",
            "utilisation": round(waling_util, 3),
            "status": "PASS" if waling_util <= 1.0 else "FAIL",
            "detail": (f"M_Ed = {waling_M:.1f} kNm vs M_Rd = "
                       f"{waling_capacity_kNm:.1f} kNm ({waling_util * 100:.0f}%)")
        })

        checks.append({
            "name": "Sheeting bending",
            "utilisation": round(sheet_util, 3),
            "status": "PASS" if sheet_util <= 1.0 else "FAIL",
            "detail": (f"M_Ed = {sheet_M:.2f} kNm/m vs M_Rd = "
                       f"{sheet_capacity_kNm:.1f} kNm/m ({sheet_util * 100:.0f}%)")
        })

        checks.append({
            "name": "Base heave stability",
            "utilisation": round(heave_util, 3),
            "status": "PASS" if heave_util <= 1.0 else "FAIL",
            "detail": (f"FoS = {fos_heave:.2f} ≥ 1.5 required "
                       f"(Nc × cu / σ_v = {Nc_heave}×{cu_kPa}/{gamma_kPa * depth_m + surcharge_kPa:.0f})")
        })

        governing = max(prop_util, waling_util, sheet_util, heave_util)
        overall = "PASS" if all(c["status"] == "PASS" for c in checks) else "FAIL"

        return {
            "Ka": round(Ka, 3),
            "sigma_a_base_kPa": round(sigma_a_base, 1),
            "sigma_surcharge_kPa": round(sigma_surcharge, 1),
            "sigma_water_kPa": round(sigma_water, 1),
            "sigma_total_kPa": round(sigma_total, 1),
            "total_thrust_per_m_kN": round(total_thrust_per_m, 1),
            "load_per_prop_kN": round(load_per_prop, 1),
            "fos_heave": round(fos_heave, 2),
            "checks": checks,
            "overall_status": overall,
            "utilisation": round(governing * 100, 1),
        }


calculator = TrenchSupportCalculator()
