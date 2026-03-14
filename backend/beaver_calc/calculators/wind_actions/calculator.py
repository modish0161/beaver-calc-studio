"""
Wind actions on structures per EN 1991-1-4 / UK NA.
Peak velocity pressure, structural factor, force coefficients for rectangular
buildings, and overall wind force calculation.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class WindActionsCalculator(CalculatorPlugin):
    key = "wind_actions_v1"
    name = "Wind Actions"
    version = "1.0.0"
    description = "Wind actions on structures per EN 1991-1-4 / UK NA"
    category = "actions"
    reference_text = "EN 1991-1-4:2005; UK NA to BS EN 1991-1-4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Site parameters
        v_b0 = inputs.get('v_b0_m_s', 23.4)  # fundamental basic wind speed (UK NA Fig NA.1)
        altitude_m = inputs.get('altitude_m', 50)
        c_dir = inputs.get('c_dir', 1.0)  # directional factor (UK NA Table NA.1)
        c_season = inputs.get('c_season', 1.0)  # seasonal factor
        c_alt = inputs.get('c_alt', None)  # altitude factor (auto-calc if None)
        terrain_cat = inputs.get('terrain_cat', 'II')  # I, II, III, IV

        # Building geometry
        height_m = inputs.get('height_m', 15.0)
        width_m = inputs.get('width_m', 30.0)
        depth_m = inputs.get('depth_m', 20.0)

        # Force coefficients
        cf_override = inputs.get('cf', None)  # override force coefficient

        # Air density
        rho = inputs.get('rho_kg_m3', 1.226)

        # Basic wind velocity (Eq 4.1)
        v_b = c_dir * c_season * v_b0

        # Altitude factor (UK NA cl NA.2.4)
        if c_alt is None:
            c_alt = 1 + 0.001 * altitude_m

        # Peak velocity pressure q_p(z) (simplified UK NA approach)
        # Terrain parameters (Table 4.1)
        terrain_params = {
            'I':   {'z0': 0.003, 'z_min': 1},
            'II':  {'z0': 0.05,  'z_min': 2},
            'III': {'z0': 0.3,   'z_min': 5},
            'IV':  {'z0': 1.0,   'z_min': 10},
        }
        tp = terrain_params.get(terrain_cat, terrain_params['II'])
        z0 = tp['z0']
        z_min = tp['z_min']

        z = max(height_m, z_min)

        # Roughness factor c_r(z) (Eq 4.4)
        kr = 0.19 * (z0 / 0.05) ** 0.07
        cr = kr * math.log(z / z0)

        # Orography factor (assume flat)
        c_o = inputs.get('c_o', 1.0)

        # Mean wind velocity at height z
        v_m = cr * c_o * v_b * c_alt

        # Turbulence intensity I_v(z) (Eq 4.7)
        kl = 1.0
        Iv = kl / (c_o * math.log(z / z0))

        # Peak velocity pressure (Eq 4.8)
        q_p = (1 + 7 * Iv) * 0.5 * rho * v_m ** 2 / 1000  # kPa

        # Structural factor cs×cd (simplified: 1.0 for h < 15m, else interpolate)
        cs_cd = inputs.get('cs_cd', 1.0)

        # Force coefficient for rectangular building (Table 7.1)
        if cf_override is not None:
            cf = cf_override
        else:
            d_b_ratio = depth_m / width_m if width_m > 0 else 1
            # EN 1991-1-4 Table 7.1 approximate interpolation
            if d_b_ratio <= 0.25:
                cf = 2.4
            elif d_b_ratio <= 0.5:
                cf = 1.65 + (2.4 - 1.65) * (0.5 - d_b_ratio) / 0.25
            elif d_b_ratio <= 1.0:
                cf = 1.3 + (1.65 - 1.3) * (1.0 - d_b_ratio) / 0.5
            elif d_b_ratio <= 2.0:
                cf = 0.9 + (1.3 - 0.9) * (2.0 - d_b_ratio) / 1.0
            elif d_b_ratio <= 5.0:
                cf = 0.7 + (0.9 - 0.7) * (5.0 - d_b_ratio) / 3.0
            else:
                cf = 0.7

        # Reference area
        A_ref = width_m * height_m  # m² (windward face)

        # Wind force (Eq 5.3)
        F_w = cs_cd * cf * q_p * A_ref  # kN

        # Base overturning moment
        # Assume resultant at 0.6h for rectangular buildings
        z_app = 0.6 * height_m
        M_base = F_w * z_app  # kNm

        # Base shear
        V_base = F_w

        # Pressure on windward face (for cladding design)
        cpe_plus = inputs.get('cpe_10_windward', 0.8)
        cpe_minus = inputs.get('cpe_10_leeward', -0.5)
        we_windward = cpe_plus * q_p  # kPa
        we_leeward = cpe_minus * q_p  # kPa

        checks = [
            {"name": "Peak velocity pressure q_p(z)",
             "utilisation": 0, "status": "INFO",
             "detail": f"q_p({z:.0f}m) = {q_p:.3f} kPa ({q_p * 1000:.1f} Pa), "
                       f"v_b = {v_b:.1f} m/s, c_alt = {c_alt:.3f}"},
            {"name": "Overall wind force",
             "utilisation": 0, "status": "INFO",
             "detail": f"F_w = cs_cd × cf × q_p × A_ref = "
                       f"{cs_cd}×{cf:.2f}×{q_p:.3f}×{A_ref:.0f} = {F_w:.1f} kN"},
            {"name": "Base overturning moment",
             "utilisation": 0, "status": "INFO",
             "detail": f"M_base = {M_base:.0f} kNm at z = {z_app:.1f}m"},
            {"name": "Windward surface pressure",
             "utilisation": 0, "status": "INFO",
             "detail": f"w_e = {we_windward:.3f} kPa (cpe = +{cpe_plus})"},
            {"name": "Leeward surface pressure",
             "utilisation": 0, "status": "INFO",
             "detail": f"w_e = {we_leeward:.3f} kPa (cpe = {cpe_minus})"},
        ]

        return {
            "v_b_m_s": round(v_b, 1),
            "c_alt": round(c_alt, 3),
            "c_r": round(cr, 3),
            "v_m_m_s": round(v_m, 1),
            "I_v": round(Iv, 3),
            "q_p_kPa": round(q_p, 4),
            "cf": round(cf, 2),
            "A_ref_m2": round(A_ref, 0),
            "F_w_kN": round(F_w, 1),
            "V_base_kN": round(V_base, 1),
            "M_base_kNm": round(M_base, 0),
            "we_windward_kPa": round(we_windward, 4),
            "we_leeward_kPa": round(we_leeward, 4),
            "checks": checks,
            "overall_status": "PASS",
            "utilisation": 0,
        }


calculator = WindActionsCalculator()
