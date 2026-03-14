"""
Site hoarding design — wind load, post bending, foundation/base, cladding.
BS 5975:2019 + EN 1991-1-4 wind loading.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class HoardingCalculator(CalculatorPlugin):
    key = "hoarding_v1"
    name = "Hoarding Design"
    version = "1.0.0"
    description = "Site hoarding design to BS 5975 / EN 1991-1-4"
    category = "temporary_works"
    reference_text = "BS 5975:2019, EN 1991-1-4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        H = inputs.get('hoarding_height_m', 2.4)
        post_spacing_m = inputs.get('post_spacing_m', 2.4)
        v_wind_ms = inputs.get('wind_speed_ms', 22)
        terrain_cat = inputs.get('terrain_category', 3)  # 1-4
        # Post
        post_section = inputs.get('post_section', 'CHS 76.1×3.2')
        post_Wpl_mm3 = inputs.get('post_Wpl_mm3', 16800)
        post_fy_MPa = inputs.get('post_fy_MPa', 275)
        # Foundation
        foundation_type = inputs.get('foundation_type', 'buried')  # buried or weighted
        embedment_m = inputs.get('embedment_depth_m', 0.8)
        soil_Kp = inputs.get('soil_Kp', 3.0)
        gamma_soil = inputs.get('soil_unit_weight_kNm3', 18)
        block_weight_kN = inputs.get('block_weight_kN', 5.0)

        gamma_M = 1.1
        rho_air = 1.226

        # Terrain height factor
        z_factors = {1: 1.0, 2: 0.91, 3: 0.78, 4: 0.67}
        ce = z_factors.get(terrain_cat, 0.78)

        # Wind pressure
        q_p = 0.5 * rho_air * (v_wind_ms * ce) ** 2 / 1000  # kPa
        Cf = 1.3  # pressure coefficient for solid hoarding

        # Wind force on panel
        F_wind = q_p * Cf * H * post_spacing_m  # kN per bay
        F_per_post = F_wind  # shared between adjacent posts → simplified to per bay

        # Post bending (cantilever from ground)
        M_post = F_per_post * H / 2  # kNm
        M_post_Rd = post_Wpl_mm3 * post_fy_MPa / gamma_M / 1e6
        util_post = M_post / M_post_Rd if M_post_Rd > 0 else float('inf')

        # Foundation — buried post
        if foundation_type == 'buried':
            # Passive resistance from embedment
            p_passive = soil_Kp * gamma_soil * embedment_m  # kPa at depth d
            post_width = 0.076  # m (76mm CHS approx)
            R_passive = 0.5 * p_passive * embedment_m * post_width  # kN
            M_resist = R_passive * embedment_m * 2 / 3
            FoS_foundation = M_resist / M_post if M_post > 0 else float('inf')
        else:
            # Weighted base
            lever = 0.5  # m typical base width
            M_resist = block_weight_kN * lever
            FoS_foundation = M_resist / M_post if M_post > 0 else float('inf')

        util_foundation = 1.5 / FoS_foundation if FoS_foundation > 0 else float('inf')

        # Cladding check (plywood bending between rails)
        ply_thk = inputs.get('cladding_thk_mm', 18)
        rail_spacing_mm = inputs.get('rail_spacing_mm', 600)
        w_clad = q_p * Cf * post_spacing_m  # kN/m on cladding strip
        M_clad = w_clad * (rail_spacing_mm / 1000) ** 2 / 8  # kNm/m
        # Plywood bending stress
        W_clad = 1000 * ply_thk ** 2 / 6  # mm^3/m
        sigma_clad = M_clad * 1e6 / W_clad if W_clad > 0 else float('inf')
        fm_ply = 20  # MPa typical structural plywood
        util_cladding = sigma_clad / fm_ply if fm_ply > 0 else float('inf')

        checks = [
            {"name": "Post bending", "utilisation": round(util_post * 100, 1),
             "status": "PASS" if util_post <= 1.0 else "FAIL",
             "detail": f"M={M_post:.2f} kNm / M_Rd={M_post_Rd:.2f} kNm"},
            {"name": "Foundation (FoS ≥ 1.5)", "utilisation": round(util_foundation * 100, 1),
             "status": "PASS" if FoS_foundation >= 1.5 else "FAIL",
             "detail": f"FoS = {FoS_foundation:.2f}"},
            {"name": "Cladding bending", "utilisation": round(util_cladding * 100, 1),
             "status": "PASS" if util_cladding <= 1.0 else "FAIL",
             "detail": f"σ={sigma_clad:.2f} MPa / fm={fm_ply} MPa"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "q_p_kPa": round(q_p, 3),
            "F_wind_kN": round(F_wind, 2),
            "M_post_kNm": round(M_post, 2),
            "M_post_Rd_kNm": round(M_post_Rd, 2),
            "FoS_foundation": round(FoS_foundation, 2),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = HoardingCalculator()
