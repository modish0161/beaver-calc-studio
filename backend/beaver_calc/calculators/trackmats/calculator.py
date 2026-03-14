"""
Trackmat / bog mat design calculator per BRE 470 / CIRIA C703.
Bearing capacity of mat on soft ground, bending of mat, and contact pressure.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class TrackmatsCalculator(CalculatorPlugin):
    key = "trackmats_v1"
    name = "Trackmats"
    version = "1.0.0"
    description = "Trackmat / bog mat design per BRE 470 / CIRIA C703"
    category = "temporary_works"
    reference_text = "BRE 470; CIRIA C703"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Plant / loading
        plant_weight_kN = inputs.get('plant_weight_kN', 250)
        track_length_mm = inputs.get('track_length_mm', 4500)
        track_width_mm = inputs.get('track_width_mm', 600)
        n_tracks = inputs.get('n_tracks', 2)

        # Mat properties
        mat_length_mm = inputs.get('mat_length_mm', 5000)
        mat_width_mm = inputs.get('mat_width_mm', 1000)
        mat_thickness_mm = inputs.get('mat_thickness_mm', 150)
        n_mats_under_track = inputs.get('n_mats_under_track', 3)
        timber_grade = inputs.get('timber_grade', 'hardwood')  # hardwood or softwood
        f_m_k = inputs.get('f_m_k_MPa', 40 if timber_grade == 'hardwood' else 24)
        E_0_mean = inputs.get('E_MPa', 15000 if timber_grade == 'hardwood' else 11000)

        # Ground
        cu_kPa = inputs.get('cu_kPa', 30)  # undrained shear strength
        bearing_factor = inputs.get('bearing_factor', 5.14)  # Nc for undrained

        # Factors
        gamma_M = inputs.get('gamma_M', 1.3)
        k_mod = inputs.get('k_mod', 0.9)  # short-term

        # Contact pressure under tracks
        track_contact_area = track_length_mm * track_width_mm * n_tracks  # mm²
        contact_pressure_track = plant_weight_kN * 1000 / track_contact_area  # kPa (N/mm² × 1000)
        contact_pressure_track_kPa = plant_weight_kN / (track_contact_area / 1e6)  # kPa

        # Spread area through mats
        mat_spread_width = n_mats_under_track * mat_width_mm
        spread_area = mat_length_mm * mat_spread_width / 1e6  # m²
        q_ground_kPa = plant_weight_kN / spread_area

        # Ground bearing capacity (undrained)
        q_ult = bearing_factor * cu_kPa
        bearing_ratio = q_ground_kPa / q_ult if q_ult > 0 else 999

        # Mat bending check
        # Treat mat as simply supported beam over soft ground with track load
        # Span = track spacing (approx 2.5m for typical plant)
        mat_span_mm = inputs.get('mat_cantilever_mm', 0)
        if mat_span_mm == 0:
            mat_span_mm = (mat_length_mm - track_length_mm) / 2  # cantilever beyond track
            mat_span_mm = max(mat_span_mm, 500)

        # Load per mat
        load_per_mat = plant_weight_kN / (n_mats_under_track * n_tracks)
        # Bending as cantilever
        M_Ed = load_per_mat * mat_span_mm / (2 * 1000)  # kNm (approx)

        # Section modulus of mat (per mat width)
        W_mat = mat_width_mm * mat_thickness_mm ** 2 / 6  # mm³
        f_m_d = k_mod * f_m_k / gamma_M
        M_Rd = f_m_d * W_mat / 1e6  # kNm

        bending_ratio = M_Ed / M_Rd if M_Rd > 0 else 999

        # Deflection
        I_mat = mat_width_mm * mat_thickness_mm ** 3 / 12
        delta = load_per_mat * 1000 * mat_span_mm ** 3 / (3 * E_0_mean * I_mat) if I_mat > 0 else 999
        delta_limit = mat_span_mm / 150
        defl_ratio = delta / delta_limit if delta_limit > 0 else 999

        checks = [
            {"name": "Ground bearing",
             "utilisation": round(bearing_ratio * 100, 1),
             "status": "PASS" if bearing_ratio <= 1.0 else "FAIL",
             "detail": f"q={q_ground_kPa:.0f} kPa / q_ult={q_ult:.0f} kPa (cu={cu_kPa}kPa, Nc={bearing_factor})"},
            {"name": "Mat bending",
             "utilisation": round(bending_ratio * 100, 1),
             "status": "PASS" if bending_ratio <= 1.0 else "FAIL",
             "detail": f"M_Ed={M_Ed:.1f} kNm / M_Rd={M_Rd:.1f} kNm ({mat_thickness_mm}mm {timber_grade})"},
            {"name": "Mat deflection",
             "utilisation": round(defl_ratio * 100, 1),
             "status": "PASS" if defl_ratio <= 1.0 else "FAIL",
             "detail": f"δ={delta:.1f}mm / {delta_limit:.1f}mm"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "contact_pressure_kPa": round(contact_pressure_track_kPa, 0),
            "ground_pressure_kPa": round(q_ground_kPa, 0),
            "q_ult_kPa": round(q_ult, 0),
            "n_mats_under_track": n_mats_under_track,
            "spread_area_m2": round(spread_area, 2),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = TrackmatsCalculator()
