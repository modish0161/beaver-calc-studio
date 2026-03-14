"""
Punching shear calculator for RC flat slabs per EN 1992-1-1 cl 6.4.
Checks at column face, basic control perimeter, and with shear reinforcement.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class PunchingShearCalculator(CalculatorPlugin):
    key = "punching_shear_v1"
    name = "Punching Shear"
    version = "1.0.0"
    description = "RC flat slab punching shear per EN 1992-1-1 cl 6.4"
    category = "concrete"
    reference_text = "EN 1992-1-1:2004 cl 6.4"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Slab
        h_mm = inputs.get('slab_depth_mm', 300)
        cover_mm = inputs.get('cover_mm', 30)
        bar_dia_y_mm = inputs.get('bar_dia_y_mm', 16)
        bar_dia_z_mm = inputs.get('bar_dia_z_mm', 16)
        bar_spacing_y_mm = inputs.get('bar_spacing_y_mm', 150)
        bar_spacing_z_mm = inputs.get('bar_spacing_z_mm', 150)
        # Column
        col_shape = inputs.get('col_shape', 'rectangular')  # rectangular or circular
        col_width_mm = inputs.get('col_width_mm', 400)
        col_depth_mm = inputs.get('col_depth_mm', 400)
        col_dia_mm = inputs.get('col_diameter_mm', 400)
        position = inputs.get('position', 'internal')  # internal, edge, corner
        # Loading
        V_Ed_kN = inputs.get('V_Ed_kN', 800)
        M_Ed_kNm = inputs.get('M_Ed_kNm', 0)  # moment transfer
        # Material
        fck_MPa = inputs.get('fck_MPa', 30)
        fyk_MPa = inputs.get('fyk_MPa', 500)
        gamma_c = inputs.get('gamma_c', 1.5)

        # Effective depth
        d_y = h_mm - cover_mm - bar_dia_y_mm / 2
        d_z = h_mm - cover_mm - bar_dia_y_mm - bar_dia_z_mm / 2
        d = (d_y + d_z) / 2

        # Reinforcement ratios
        A_sy = math.pi * bar_dia_y_mm ** 2 / (4 * bar_spacing_y_mm) * 1000  # mm²/m
        A_sz = math.pi * bar_dia_z_mm ** 2 / (4 * bar_spacing_z_mm) * 1000
        rho_ly = A_sy / (1000 * d_y)
        rho_lz = A_sz / (1000 * d_z)
        rho_l = min(math.sqrt(rho_ly * rho_lz), 0.02)

        # Beta factor (eccentricity from moment)
        if position == 'internal':
            beta = 1.15 if M_Ed_kNm == 0 else 1 + 1.8 * math.sqrt((M_Ed_kNm / V_Ed_kN) ** 2) / d * 1000 if V_Ed_kN > 0 else 1.15
            beta = max(1.15, min(beta, 1.8))
        elif position == 'edge':
            beta = 1.4
        else:  # corner
            beta = 1.5

        # Control perimeters
        if col_shape == 'circular':
            u0 = math.pi * col_dia_mm   # column face
            u1 = math.pi * (col_dia_mm + 4 * d)  # basic control perimeter at 2d
        else:
            if position == 'internal':
                u0 = 2 * (col_width_mm + col_depth_mm)
                u1 = 2 * (col_width_mm + col_depth_mm) + 4 * math.pi * d
            elif position == 'edge':
                u0 = col_depth_mm + 2 * col_width_mm
                u1 = col_depth_mm + 2 * col_width_mm + 2 * math.pi * d
            else:  # corner
                u0 = col_width_mm + col_depth_mm
                u1 = col_width_mm + col_depth_mm + math.pi * d

        # Shear stress at column face (v_Ed,0)
        v_Ed_0 = beta * V_Ed_kN * 1000 / (u0 * d)  # MPa

        # Maximum shear stress at face (cl 6.4.5)
        v_Rd_max = 0.5 * 0.6 * (1 - fck_MPa / 250) * fck_MPa / gamma_c

        # Shear stress at basic control perimeter
        v_Ed = beta * V_Ed_kN * 1000 / (u1 * d)  # MPa

        # Resistance without shear reinforcement (cl 6.4.4)
        k = min(2.0, 1 + math.sqrt(200 / d))
        v_Rd_c = max(
            0.18 / gamma_c * k * (100 * rho_l * fck_MPa) ** (1 / 3),
            0.035 * k ** 1.5 * fck_MPa ** 0.5,
        )

        # v_min
        v_min = 0.035 * k ** 1.5 * fck_MPa ** 0.5

        face_util = v_Ed_0 / v_Rd_max if v_Rd_max > 0 else 999
        perim_util = v_Ed / v_Rd_c if v_Rd_c > 0 else 999

        # Shear reinforcement required?
        shear_reinf_required = v_Ed > v_Rd_c

        # If required, compute A_sw (cl 6.4.5)
        A_sw_per_perim_mm2 = 0
        if shear_reinf_required:
            fywd = min(250 + 0.25 * d, fyk_MPa / 1.15)
            # v_Rd,cs = 0.75 v_Rd,c + 1.5(d/s_r) A_sw fywd / (u1 d)
            # Need: v_Ed ≤ v_Rd,cs → A_sw = (v_Ed - 0.75 v_Rd,c) × u1 × d / (1.5 × fywd)
            A_sw_per_perim_mm2 = max(0, (v_Ed - 0.75 * v_Rd_c) * u1 * d / (1.5 * fywd))

        checks = [
            {"name": "Face shear (v_Ed,0 / v_Rd,max)",
             "utilisation": round(face_util * 100, 1),
             "status": "PASS" if face_util <= 1.0 else "FAIL",
             "detail": f"v_Ed,0={v_Ed_0:.2f} MPa / v_Rd,max={v_Rd_max:.2f} MPa (β={beta:.2f})"},
            {"name": "Perimeter shear (v_Ed / v_Rd,c)",
             "utilisation": round(perim_util * 100, 1),
             "status": "PASS" if perim_util <= 1.0 else "FAIL",
             "detail": f"v_Ed={v_Ed:.2f} MPa / v_Rd,c={v_Rd_c:.2f} MPa at u1={u1:.0f}mm"},
            {"name": "Shear reinforcement",
             "utilisation": round(perim_util * 100, 1) if shear_reinf_required else 0,
             "status": "FAIL" if shear_reinf_required else "PASS",
             "detail": f"A_sw={A_sw_per_perim_mm2:.0f} mm² per perimeter required" if shear_reinf_required else "No shear reinforcement needed"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "d_mm": round(d, 0),
            "rho_l": round(rho_l, 4),
            "beta": round(beta, 2),
            "u0_mm": round(u0, 0),
            "u1_mm": round(u1, 0),
            "v_Ed_0_MPa": round(v_Ed_0, 2),
            "v_Ed_MPa": round(v_Ed, 2),
            "v_Rd_c_MPa": round(v_Rd_c, 2),
            "v_Rd_max_MPa": round(v_Rd_max, 2),
            "shear_reinf_required": shear_reinf_required,
            "A_sw_mm2": round(A_sw_per_perim_mm2, 0),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = PunchingShearCalculator()
