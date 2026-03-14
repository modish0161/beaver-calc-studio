"""
Working platform design for tracked plant per BRE 470 / CIRIA C703 / TWf2013.
Checks bearing capacity with load spread through granular fill,
platform thickness, and edge stability.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class WorkingPlatformCalculator(CalculatorPlugin):
    key = "working_platform_v1"
    name = "Working Platform"
    version = "1.0.0"
    description = "Working platform design per BRE 470 / CIRIA C703"
    category = "temporary-works"
    reference_text = "BRE 470:2004; CIRIA C703; TWf2013"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Plant parameters
        gross_weight_kN = inputs.get('plant_weight_kN', 350.0)
        track_length_m = inputs.get('track_length_m', 4.5)
        track_width_m = inputs.get('track_width_m', 0.6)
        track_centres_m = inputs.get('track_centres_m', 3.0)

        # Platform parameters
        platform_thickness_m = inputs.get('platform_thickness_m', 0.6)
        fill_phi_deg = inputs.get('fill_phi_deg', 40.0)  # well-graded crusite
        fill_gamma_kN_m3 = inputs.get('fill_gamma_kN_m3', 20.0)
        fill_cu_kPa = inputs.get('fill_cu_kPa', 0)  # granular → 0

        # Subgrade parameters
        subgrade_cu_kPa = inputs.get('subgrade_cu_kPa', 40.0)  # undrained shear strength
        subgrade_Nc = inputs.get('subgrade_Nc', 5.14)  # strip footing bearing factor
        subgrade_gamma_kN_m3 = inputs.get('subgrade_gamma_kN_m3', 18.0)

        # Dynamic factor
        daf = inputs.get('daf', 1.1)  # BRE 470 recommends 1.1

        # Partial factors (TWf2013)
        gamma_load = inputs.get('gamma_load', 1.5)  # on imposed
        gamma_cu = inputs.get('gamma_cu', 1.5)  # on undrained strength

        # Contact pressure under track
        track_area = track_length_m * track_width_m  # per track
        # Assume load split 60:40 max for slewing
        max_track_fraction = inputs.get('max_track_fraction', 0.6)
        P_track = gross_weight_kN * max_track_fraction * daf  # kN on one track
        q_applied = P_track / track_area  # kPa

        # Factored applied pressure
        q_applied_factored = q_applied * gamma_load

        # Load spread through platform (BRE 470 method)
        # Spread at angle = tan(phi) either side
        phi_rad = math.radians(fill_phi_deg)
        spread_angle = phi_rad  # BRE uses friction angle

        # Spread width at subgrade level
        B_spread = track_width_m + 2 * platform_thickness_m * math.tan(spread_angle)
        L_spread = track_length_m + 2 * platform_thickness_m * math.tan(spread_angle)

        # Pressure at subgrade level (no overlap check)
        q_subgrade = P_track * gamma_load / (B_spread * L_spread)

        # Surcharge from platform self-weight
        q_platform = fill_gamma_kN_m3 * platform_thickness_m

        q_total = q_subgrade + q_platform

        # Subgrade bearing capacity (undrained)
        cu_d = subgrade_cu_kPa / gamma_cu
        q_bearing = subgrade_Nc * cu_d + subgrade_gamma_kN_m3 * platform_thickness_m
        bearing_util = q_total / q_bearing if q_bearing > 0 else 999

        # Overlap check — adjacent tracks
        gap_between_tracks = track_centres_m - track_width_m
        spread_each_side = platform_thickness_m * math.tan(spread_angle)
        overlap = 2 * spread_each_side - gap_between_tracks
        tracks_overlap = overlap > 0

        if tracks_overlap:
            # Combined loaded area
            B_combined = track_centres_m + track_width_m + 2 * spread_each_side
            P_total = gross_weight_kN * daf * gamma_load
            q_combined = P_total / (B_combined * L_spread) + q_platform
            bearing_util_combined = q_combined / q_bearing if q_bearing > 0 else 999
        else:
            q_combined = 0
            bearing_util_combined = 0

        # Minimum platform thickness (BRE 470 Eq 4)
        # t_min = (q_app × B_track - Nc × cu_d × B_spread) / (Nc × cu_d × 2 × tan(φ) - γ_fill × B_spread)
        # Simplified: iterate or use direct formula
        # Required thickness for FoS = 1.0 on subgrade
        # q_sub = P_track × γ_load / ((B + 2t×tanφ)(L + 2t×tanφ)) ≤ Nc×cu_d
        # Solve iteratively
        t_min = 0
        for t_trial_mm in range(50, 2000, 25):
            t_trial = t_trial_mm / 1000
            B_t = track_width_m + 2 * t_trial * math.tan(spread_angle)
            L_t = track_length_m + 2 * t_trial * math.tan(spread_angle)
            q_t = P_track * gamma_load / (B_t * L_t) + fill_gamma_kN_m3 * t_trial
            q_cap = subgrade_Nc * cu_d + subgrade_gamma_kN_m3 * t_trial
            if q_t <= q_cap:
                t_min = t_trial
                break

        thickness_util = t_min / platform_thickness_m if platform_thickness_m > 0 else 999

        # Punching shear through platform (outrigger/pad check)
        outrigger_load_kN = inputs.get('outrigger_load_kN', 0)
        outrigger_pad_m = inputs.get('outrigger_pad_mm', 400) / 1000
        if outrigger_load_kN > 0:
            # Punching perimeter at d from pad edge
            perim = 4 * (outrigger_pad_m + 2 * platform_thickness_m)
            # Shear stress (simplified)
            tau_punch = outrigger_load_kN * gamma_load / (perim * platform_thickness_m * 1000)  # MPa
            # Fill shear capacity (conservative: cu equivalent)
            tau_cap = 0.05  # MPa for granular fill (very conservative)
            punch_util = tau_punch / tau_cap if tau_cap > 0 else 999
        else:
            punch_util = 0

        # Edge distance check (BRE 470 cl 5.4)
        edge_distance_m = inputs.get('edge_distance_m', 2.0)
        min_edge = platform_thickness_m + track_width_m / 2
        edge_util = min_edge / edge_distance_m if edge_distance_m > 0 else 999

        checks = []

        checks.append({
            "name": "Bearing capacity (single track)",
            "utilisation": round(bearing_util, 3),
            "status": "PASS" if bearing_util <= 1.0 else "FAIL",
            "detail": (f"q_total = {q_total:.1f} kPa vs q_bearing = "
                       f"{q_bearing:.1f} kPa (spread B = {B_spread:.2f}m)")
        })

        if tracks_overlap:
            checks.append({
                "name": "Bearing (overlapping spread)",
                "utilisation": round(bearing_util_combined, 3),
                "status": "PASS" if bearing_util_combined <= 1.0 else "FAIL",
                "detail": (f"q_combined = {q_combined:.1f} kPa vs q_bearing = "
                           f"{q_bearing:.1f} kPa (overlap = {overlap * 1000:.0f}mm)")
            })

        checks.append({
            "name": "Minimum platform thickness",
            "utilisation": round(thickness_util, 3),
            "status": "PASS" if thickness_util <= 1.0 else "FAIL",
            "detail": (f"t_min = {t_min * 1000:.0f}mm vs provided "
                       f"{platform_thickness_m * 1000:.0f}mm")
        })

        if outrigger_load_kN > 0:
            checks.append({
                "name": "Outrigger punching",
                "utilisation": round(punch_util, 3),
                "status": "PASS" if punch_util <= 1.0 else "FAIL",
                "detail": f"τ = {tau_punch:.3f} MPa vs τ_cap = {tau_cap:.3f} MPa"
            })

        checks.append({
            "name": "Edge distance",
            "utilisation": round(edge_util, 3),
            "status": "PASS" if edge_util <= 1.0 else "FAIL",
            "detail": (f"Min edge = {min_edge:.2f}m vs provided "
                       f"{edge_distance_m:.2f}m")
        })

        governing = max(c["utilisation"] for c in checks)
        overall = "PASS" if all(c["status"] == "PASS" for c in checks) else "FAIL"

        return {
            "q_applied_kPa": round(q_applied, 1),
            "q_applied_factored_kPa": round(q_applied_factored, 1),
            "B_spread_m": round(B_spread, 3),
            "L_spread_m": round(L_spread, 3),
            "q_subgrade_kPa": round(q_subgrade, 1),
            "q_bearing_kPa": round(q_bearing, 1),
            "t_min_mm": round(t_min * 1000, 0),
            "tracks_overlap": tracks_overlap,
            "checks": checks,
            "overall_status": overall,
            "utilisation": round(governing * 100, 1),
        }


calculator = WorkingPlatformCalculator()
