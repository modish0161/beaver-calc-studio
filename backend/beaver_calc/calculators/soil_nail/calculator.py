"""
Soil nail wall design per BS 8006-2 / FHWA-NHI-14-007.
Checks nail pull-out, tensile capacity, global stability, and facing design.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SoilNailCalculator(CalculatorPlugin):
    key = "soil_nail_v1"
    name = "Soil Nail"
    version = "1.0.0"
    description = "Soil nail wall design per BS 8006-2 / FHWA-NHI-14-007"
    category = "geotechnical"
    reference_text = "BS 8006-2:2011; FHWA-NHI-14-007"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Wall geometry
        H_m = inputs.get('wall_height_m', 6.0)
        face_batter_deg = inputs.get('face_batter_deg', 0)  # 0 = vertical
        nail_inclination_deg = inputs.get('nail_inclination_deg', 15)  # below horizontal

        # Nail properties
        nail_diameter_mm = inputs.get('nail_bar_diameter_mm', 25)
        drill_hole_mm = inputs.get('drill_hole_diameter_mm', 100)
        nail_length_m = inputs.get('nail_length_m', 6.0)
        fy_nail_MPa = inputs.get('fy_nail_MPa', 500)
        nail_spacing_h_m = inputs.get('nail_spacing_h_m', 1.5)
        nail_spacing_v_m = inputs.get('nail_spacing_v_m', 1.5)
        n_rows = inputs.get('n_rows', 0)
        if n_rows == 0:
            n_rows = max(1, math.floor(H_m / nail_spacing_v_m))

        # Grout
        grout_hole_bond_kPa = inputs.get('grout_soil_bond_kPa', 100)  # ultimate bond stress

        # Soil
        phi_deg = inputs.get('phi_deg', 30)
        c_kPa = inputs.get('cohesion_kPa', 5)
        gamma_soil = inputs.get('gamma_soil_kN_m3', 19)
        surcharge_kPa = inputs.get('surcharge_kPa', 10)

        # Partial factors
        gamma_pull = inputs.get('gamma_pullout', 2.0)  # FoS on pull-out (FHWA)
        gamma_t = inputs.get('gamma_tensile', 1.8)  # FoS on nail tensile
        gamma_G = inputs.get('gamma_G', 1.35)

        # ---- Nail pull-out capacity ----
        # Q_u = π × D_hole × L_nail × q_u  (ultimate)
        Q_u_kN = math.pi * (drill_hole_mm / 1000) * nail_length_m * grout_hole_bond_kPa
        Q_a_kN = Q_u_kN / gamma_pull  # allowable

        # ---- Nail tensile capacity ----
        A_bar = math.pi * (nail_diameter_mm / 1000) ** 2 / 4
        T_u_kN = A_bar * fy_nail_MPa * 1000  # kN
        T_a_kN = T_u_kN / gamma_t

        # Governing nail capacity
        R_nail_kN = min(Q_a_kN, T_a_kN)

        # ---- Active earth pressure (design load per nail) ----
        phi_rad = math.radians(phi_deg)
        Ka = math.tan(math.radians(45 - phi_deg / 2)) ** 2
        # Pressure at mid-height of each row
        max_nail_load = 0
        nail_loads = []
        for row in range(n_rows):
            z = nail_spacing_v_m * (row + 0.5) + 0.5  # depth from top
            sigma_a = Ka * (gamma_soil * z + surcharge_kPa) * gamma_G - 2 * c_kPa * math.sqrt(Ka)
            sigma_a = max(0, sigma_a)
            T_i = sigma_a * nail_spacing_h_m * nail_spacing_v_m
            nail_loads.append({"row": row + 1, "depth_m": round(z, 1), "T_kN": round(T_i, 1)})
            if T_i > max_nail_load:
                max_nail_load = T_i

        pullout_ratio = max_nail_load / Q_a_kN if Q_a_kN > 0 else 999
        tensile_ratio = max_nail_load / T_a_kN if T_a_kN > 0 else 999

        # ---- Global stability (simplified L/H ratio) ----
        LH_ratio = nail_length_m / H_m
        LH_min = 0.7  # FHWA recommended minimum
        global_ratio = LH_min / LH_ratio if LH_ratio > 0 else 999

        # ---- Facing check (simplified — punching shear around head plate) ----
        head_plate_mm = inputs.get('head_plate_size_mm', 200)
        facing_thickness_mm = inputs.get('facing_thickness_mm', 150)
        fck_facing = inputs.get('fck_facing_MPa', 25)
        # Punching shear perimeter at d/2
        d_face = facing_thickness_mm * 0.85  # effective depth mm
        u_punch = 4 * (head_plate_mm + d_face)  # mm
        v_Rd_c = 0.035 * (1 + math.sqrt(200 / max(d_face, 1))) ** (3 / 2) * fck_facing ** 0.5 * 1000  # kPa rough
        V_Rd_punch_kN = v_Rd_c * u_punch / 1000 * d_face / 1000
        facing_ratio = max_nail_load / V_Rd_punch_kN if V_Rd_punch_kN > 0 else 999

        checks = [
            {"name": "Nail pull-out",
             "utilisation": round(pullout_ratio * 100, 1),
             "status": "PASS" if pullout_ratio <= 1.0 else "FAIL",
             "detail": f"T_max={max_nail_load:.1f} kN / Q_a={Q_a_kN:.1f} kN (FoS={gamma_pull})"},
            {"name": "Nail tensile",
             "utilisation": round(tensile_ratio * 100, 1),
             "status": "PASS" if tensile_ratio <= 1.0 else "FAIL",
             "detail": f"T_max={max_nail_load:.1f} kN / T_a={T_a_kN:.1f} kN (Ø{nail_diameter_mm} fy={fy_nail_MPa})"},
            {"name": "Global stability (L/H)",
             "utilisation": round(global_ratio * 100, 1),
             "status": "PASS" if LH_ratio >= LH_min else "FAIL",
             "detail": f"L/H={LH_ratio:.2f} (min {LH_min})"},
            {"name": "Facing punching shear",
             "utilisation": round(facing_ratio * 100, 1),
             "status": "PASS" if facing_ratio <= 1.0 else "FAIL",
             "detail": f"T={max_nail_load:.1f} kN / V_Rd={V_Rd_punch_kN:.1f} kN ({facing_thickness_mm}mm shotcrete)"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "Q_u_pullout_kN": round(Q_u_kN, 1),
            "Q_a_pullout_kN": round(Q_a_kN, 1),
            "T_u_tensile_kN": round(T_u_kN, 1),
            "T_a_tensile_kN": round(T_a_kN, 1),
            "max_nail_load_kN": round(max_nail_load, 1),
            "n_rows": n_rows,
            "nail_loads": nail_loads,
            "LH_ratio": round(LH_ratio, 2),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SoilNailCalculator()
