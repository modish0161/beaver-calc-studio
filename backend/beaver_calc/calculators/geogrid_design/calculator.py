"""
Geogrid reinforced soil design to BS 8006-1:2010.
Checks internal stability (rupture, pullout) and external stability.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class GeogridDesignCalculator(CalculatorPlugin):
    key = "geogrid_design_v1"
    name = "Geogrid Design"
    version = "1.0.0"
    description = "Geogrid reinforced soil wall to BS 8006-1"
    category = "geotechnical"
    reference_text = "BS 8006-1:2010, EN 1997-1"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        H = inputs.get('wall_height_m', 5.0)
        surcharge = inputs.get('surcharge_kPa', 10)
        phi_fill_deg = inputs.get('fill_friction_deg', 35)
        gamma_fill = inputs.get('fill_unit_weight_kNm3', 19)
        phi_foundation_deg = inputs.get('foundation_friction_deg', 28)
        gamma_found = inputs.get('foundation_unit_weight_kNm3', 18)
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 150)
        # Geogrid
        T_ult_kN_m = inputs.get('geogrid_ult_strength_kNm', 60)
        n_layers = inputs.get('number_layers', 5)
        spacing_m = inputs.get('vertical_spacing_m', 1.0)
        L_reinforcement_m = inputs.get('reinforcement_length_m', 4.0)
        # Reduction factors
        RF_creep = inputs.get('RF_creep', 2.0)
        RF_install = inputs.get('RF_installation', 1.1)
        RF_durability = inputs.get('RF_durability', 1.1)

        phi_fill_rad = math.radians(phi_fill_deg)
        phi_found_rad = math.radians(phi_foundation_deg)
        Ka_fill = (1 - math.sin(phi_fill_rad)) / (1 + math.sin(phi_fill_rad))

        # Design tensile strength
        T_d = T_ult_kN_m / (RF_creep * RF_install * RF_durability)

        # Internal stability — rupture check at each layer
        max_rupture_util = 0
        layer_results = []
        for i in range(n_layers):
            z = H - (i + 0.5) * spacing_m  # depth below top
            sigma_h = Ka_fill * (gamma_fill * z + surcharge)
            T_req = sigma_h * spacing_m  # kN/m
            util = T_req / T_d if T_d > 0 else float('inf')
            max_rupture_util = max(max_rupture_util, util)
            layer_results.append({
                "layer": i + 1, "depth_m": round(z, 2),
                "T_req_kNm": round(T_req, 1), "util": round(util, 3)
            })

        # Internal stability — pullout
        f_b = 0.67  # pullout interaction coefficient
        max_pullout_util = 0
        for i in range(n_layers):
            z = H - (i + 0.5) * spacing_m
            sigma_v = gamma_fill * z + surcharge
            L_e = L_reinforcement_m - (H - z) * Ka_fill  # effective bond length
            L_e = max(L_e, 1.0)
            P_pullout = 2 * f_b * sigma_v * L_e * math.tan(phi_fill_rad)
            sigma_h = Ka_fill * sigma_v
            T_req = sigma_h * spacing_m
            util_po = T_req / P_pullout if P_pullout > 0 else float('inf')
            max_pullout_util = max(max_pullout_util, util_po)

        # External stability — overturning
        Pa = 0.5 * Ka_fill * gamma_fill * H ** 2 + Ka_fill * surcharge * H
        W = gamma_fill * H * L_reinforcement_m + surcharge * L_reinforcement_m
        M_resist = W * L_reinforcement_m / 2
        M_overturn = 0.5 * Ka_fill * gamma_fill * H ** 2 * H / 3 + Ka_fill * surcharge * H * H / 2
        FoS_overturn = M_resist / M_overturn if M_overturn > 0 else float('inf')

        # External stability — sliding
        F_slide_resist = W * math.tan(phi_found_rad)
        FoS_slide = F_slide_resist / Pa if Pa > 0 else float('inf')

        # Bearing
        e = L_reinforcement_m / 2 - (M_resist - M_overturn) / W if W > 0 else 0
        B_eff = L_reinforcement_m - 2 * abs(e)
        q_base = W / B_eff if B_eff > 0 else float('inf')
        util_bearing = q_base / bearing_capacity_kPa if bearing_capacity_kPa > 0 else float('inf')

        checks = [
            {"name": "Geogrid rupture", "utilisation": round(max_rupture_util * 100, 1),
             "status": "PASS" if max_rupture_util <= 1.0 else "FAIL",
             "detail": f"Max T_req/T_d = {max_rupture_util:.3f}, T_d={T_d:.1f} kN/m"},
            {"name": "Geogrid pullout", "utilisation": round(max_pullout_util * 100, 1),
             "status": "PASS" if max_pullout_util <= 1.0 else "FAIL",
             "detail": f"Max pullout utilisation = {max_pullout_util:.3f}"},
            {"name": "Overturning (FoS ≥ 2.0)", "utilisation": round(2.0 / FoS_overturn * 100, 1) if FoS_overturn > 0 else 999,
             "status": "PASS" if FoS_overturn >= 2.0 else "FAIL",
             "detail": f"FoS = {FoS_overturn:.2f}"},
            {"name": "Sliding (FoS ≥ 1.5)", "utilisation": round(1.5 / FoS_slide * 100, 1) if FoS_slide > 0 else 999,
             "status": "PASS" if FoS_slide >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_slide:.2f}"},
            {"name": "Bearing pressure", "utilisation": round(util_bearing * 100, 1),
             "status": "PASS" if util_bearing <= 1.0 else "FAIL",
             "detail": f"q={q_base:.1f} kPa / q_allow={bearing_capacity_kPa:.0f} kPa"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "T_d_kNm": round(T_d, 1),
            "Ka_fill": round(Ka_fill, 3),
            "Pa_kN_m": round(Pa, 1),
            "FoS_overturn": round(FoS_overturn, 2),
            "FoS_slide": round(FoS_slide, 2),
            "q_base_kPa": round(q_base, 1),
            "layers": layer_results,
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = GeogridDesignCalculator()
