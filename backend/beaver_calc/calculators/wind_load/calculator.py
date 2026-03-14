"""
Wind load on temporary works per BS 5975 / EN 1991-1-4.
Covers falsework, scaffolding, hoarding, freestanding walls, and signs.
Simplified wind load approach for temporary structures with reduced return period.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class WindLoadCalculator(CalculatorPlugin):
    key = "wind_load_v1"
    name = "Wind Load (Temporary Works)"
    version = "1.0.0"
    description = "Wind load on temporary works per BS 5975 / EN 1991-1-4"
    category = "temporary-works"
    reference_text = "BS 5975:2019 cl 14; EN 1991-1-4; CIRIA C579"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Structure type
        structure_type = inputs.get('structure_type', 'hoarding')
        # hoarding, scaffolding, falsework, sign, freestanding_wall

        # Basic wind speed
        v_b0 = inputs.get('v_b0_m_s', 23.4)
        c_prob = inputs.get('c_prob', 0.83)  # 2-year return (BS 5975 Table 3)

        # Geometry
        height_m = inputs.get('height_m', 2.4)
        length_m = inputs.get('length_m', 25.0)
        depth_m = inputs.get('depth_m', 0.05)  # thickness for hoarding

        # Terrain
        terrain_cat = inputs.get('terrain_cat', 'III')  # typically sheltered
        altitude_m = inputs.get('altitude_m', 50)

        # Air density
        rho = 1.226

        # Reduced basic wind speed for temporary works
        v_b = c_prob * v_b0

        # Altitude factor
        c_alt = 1 + 0.001 * altitude_m

        # Terrain parameters
        terrain_params = {
            'I':   {'z0': 0.003, 'z_min': 1},
            'II':  {'z0': 0.05,  'z_min': 2},
            'III': {'z0': 0.3,   'z_min': 5},
            'IV':  {'z0': 1.0,   'z_min': 10},
        }
        tp = terrain_params.get(terrain_cat, terrain_params['III'])
        z0 = tp['z0']
        z_min = tp['z_min']

        z = max(height_m, z_min)

        kr = 0.19 * (z0 / 0.05) ** 0.07
        cr = kr * math.log(z / z0)
        c_o = inputs.get('c_o', 1.0)
        v_m = cr * c_o * v_b * c_alt
        Iv = 1.0 / (c_o * math.log(z / z0))
        q_p = (1 + 7 * Iv) * 0.5 * rho * v_m ** 2 / 1000  # kPa

        # Force/pressure coefficient by structure type
        if structure_type == 'hoarding':
            # Freestanding wall/hoarding (EN 1991-1-4 cl 7.4.3)
            L_h = length_m / height_m if height_m > 0 else 10
            if L_h <= 3:
                cp_net = 1.2
            elif L_h <= 5:
                cp_net = 1.2 + (1.4 - 1.2) * (L_h - 3) / 2
            elif L_h <= 10:
                cp_net = 1.4 + (1.6 - 1.4) * (L_h - 5) / 5
            else:
                cp_net = 1.6
            # Return period reduction factor for hoarding (BS 5975)
            shelter_factor = inputs.get('shelter_factor', 1.0)
            cp_net *= shelter_factor
            A_ref = height_m * length_m

        elif structure_type == 'scaffolding':
            # Scaffolding (BS EN 12811-1)
            solidity_ratio = inputs.get('solidity_ratio', 0.3)  # sheeted vs open
            if solidity_ratio < 0.1:
                cp_net = 1.2
            else:
                cp_net = 1.0 + 0.75 * solidity_ratio
            A_ref = height_m * length_m * solidity_ratio

        elif structure_type == 'falsework':
            # Falsework frames (BS 5975 cl 14)
            n_frames = inputs.get('n_frames', 4)
            frame_width_m = inputs.get('frame_width_m', 1.2)
            shield_factor = 0.1  # successive frame shielding
            # First frame full, subsequent frames shielded
            effective_frames = 1 + (n_frames - 1) * shield_factor
            cp_net = 1.6  # lattice frame
            A_ref = height_m * frame_width_m * effective_frames

        elif structure_type == 'sign':
            # Traffic sign (EN 1991-1-4 cl 7.4.3)
            cp_net = inputs.get('cp_net', 1.8)
            sign_area = inputs.get('sign_area_m2', 3.0)
            A_ref = sign_area

        else:
            # Freestanding wall
            cp_net = inputs.get('cp_net', 1.6)
            A_ref = height_m * length_m

        # Wind force
        F_w = cp_net * q_p * A_ref  # kN

        # Wind pressure (for design of individual elements)
        w_net = cp_net * q_p  # kPa

        # Overturning moment (for stability)
        z_resultant = 0.5 * height_m  # approximate centroid
        M_overturn = F_w * z_resultant  # kNm

        # Stability check (if self-weight provided)
        self_weight_kN = inputs.get('self_weight_kN', 0)
        restoring_arm_m = inputs.get('restoring_arm_m', 0.3)
        if self_weight_kN > 0 and restoring_arm_m > 0:
            M_restoring = self_weight_kN * restoring_arm_m
            fos_stability = M_restoring / M_overturn if M_overturn > 0 else 999
            stability_util = 1.5 / fos_stability if fos_stability > 0 else 999  # FoS ≥ 1.5
        else:
            fos_stability = None
            stability_util = None

        # Allowable wind speed check (BS 5975 Table 3)
        v_max_working = inputs.get('v_max_working_m_s', 17.0)  # stop work speed
        working_check = v_b <= v_max_working

        checks = []

        checks.append({
            "name": "Peak velocity pressure",
            "utilisation": 0, "status": "INFO",
            "detail": (f"q_p = {q_p:.3f} kPa at z = {z:.1f}m, "
                       f"v_b = {v_b:.1f} m/s (c_prob = {c_prob})")
        })

        checks.append({
            "name": "Wind force on structure",
            "utilisation": 0, "status": "INFO",
            "detail": (f"F_w = {cp_net:.2f} × {q_p:.3f} × {A_ref:.1f} = "
                       f"{F_w:.1f} kN ({structure_type})")
        })

        checks.append({
            "name": "Net wind pressure",
            "utilisation": 0, "status": "INFO",
            "detail": f"w_net = {w_net:.3f} kPa ({w_net * 1000:.1f} Pa)"
        })

        if stability_util is not None:
            checks.append({
                "name": "Overturning stability",
                "utilisation": round(stability_util, 3),
                "status": "PASS" if stability_util <= 1.0 else "FAIL",
                "detail": (f"FoS = {fos_stability:.2f} ≥ 1.5 required "
                           f"(M_rest = {self_weight_kN * restoring_arm_m:.1f} kNm vs "
                           f"M_ot = {M_overturn:.1f} kNm)")
            })

        checks.append({
            "name": "Working wind speed",
            "utilisation": round(v_b / v_max_working, 3) if v_max_working > 0 else 0,
            "status": "PASS" if working_check else "FAIL",
            "detail": (f"v_b = {v_b:.1f} m/s vs stop-work "
                       f"{v_max_working:.0f} m/s")
        })

        governing = max((c["utilisation"] for c in checks if c["status"] != "INFO"), default=0)
        overall = "PASS" if all(c["status"] in ("PASS", "INFO") for c in checks) else "FAIL"

        return {
            "v_b_m_s": round(v_b, 1),
            "q_p_kPa": round(q_p, 4),
            "cp_net": round(cp_net, 2),
            "A_ref_m2": round(A_ref, 1),
            "F_w_kN": round(F_w, 1),
            "w_net_kPa": round(w_net, 4),
            "M_overturn_kNm": round(M_overturn, 1),
            "fos_stability": round(fos_stability, 2) if fos_stability is not None else None,
            "checks": checks,
            "overall_status": overall,
            "utilisation": round(governing * 100, 1),
        }


calculator = WindLoadCalculator()
