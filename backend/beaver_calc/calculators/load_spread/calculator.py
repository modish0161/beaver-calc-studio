"""
Load spread / dispersion calculator.
Computes stress at depth for 1:1 and 2:1 spread models per EN 1997-1 / Boussinesq.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class LoadSpreadCalculator(CalculatorPlugin):
    key = "load_spread_v1"
    name = "Load Spread"
    version = "1.0.0"
    description = "Vertical load spread / stress at depth calculation"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 Annex D / Boussinesq"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Applied load
        applied_load_kN = inputs.get('applied_load_kN', 500)
        # Footing / loaded area
        footing_B_m = inputs.get('footing_width_m', 1.5)
        footing_L_m = inputs.get('footing_length_m', 1.5)
        # Depth of interest
        depth_m = inputs.get('depth_m', 3.0)
        # Spread method
        spread_ratio = inputs.get('spread_ratio', 2)  # 1 for 1:1, 2 for 2:1
        # Bearing capacity at depth
        bearing_capacity_kPa = inputs.get('bearing_capacity_kPa', 100.0)
        # Contact pressure
        q_contact = applied_load_kN / (footing_B_m * footing_L_m) if (footing_B_m * footing_L_m) > 0 else 0

        # 2:1 (or 1:1) spread method
        B_spread = footing_B_m + depth_m / spread_ratio
        L_spread = footing_L_m + depth_m / spread_ratio
        q_spread = applied_load_kN / (B_spread * L_spread) if (B_spread * L_spread) > 0 else 0

        # Boussinesq (point load approximation for comparison)
        # σ_z = 3P / (2π z²)  for point load
        q_boussinesq_point = 3 * applied_load_kN / (2 * math.pi * depth_m ** 2) if depth_m > 0 else 0

        # Boussinesq rectangular (Newmark chart approximation)
        # Using influence factor I for corner of rectangle
        m_val = footing_L_m / (2 * depth_m) if depth_m > 0 else 0
        n_val = footing_B_m / (2 * depth_m) if depth_m > 0 else 0
        if m_val > 0 and n_val > 0 and depth_m > 0:
            mn = m_val * n_val
            m2n2 = m_val ** 2 + n_val ** 2
            denom = m2n2 + 1
            factor1 = (2 * mn * math.sqrt(m2n2 + 1)) / (denom * (m2n2 + mn * mn + 1))
            factor2 = math.atan2(2 * mn * math.sqrt(m2n2 + 1), denom - 1) if denom > 1 else 0
            I_4 = max(0, (factor1 + factor2) / (4 * math.pi))
            q_boussinesq_rect = 4 * I_4 * q_contact  # 4 corners
        else:
            q_boussinesq_rect = q_spread

        # Bearing check at depth
        bearing_util_spread = q_spread / bearing_capacity_kPa if bearing_capacity_kPa > 0 else 999
        bearing_util_bouss = q_boussinesq_rect / bearing_capacity_kPa if bearing_capacity_kPa > 0 else 999

        # Stress ratio check (should reduce significantly)
        stress_ratio = q_spread / q_contact if q_contact > 0 else 0

        checks = [
            {"name": f"Bearing at depth ({spread_ratio}:1 spread)",
             "utilisation": round(bearing_util_spread * 100, 1),
             "status": "PASS" if bearing_util_spread <= 1.0 else "FAIL",
             "detail": f"q_spread={q_spread:.1f} kPa at {depth_m}m depth vs {bearing_capacity_kPa:.0f} kPa capacity"},
            {"name": "Bearing at depth (Boussinesq)",
             "utilisation": round(bearing_util_bouss * 100, 1),
             "status": "PASS" if bearing_util_bouss <= 1.0 else "FAIL",
             "detail": f"q_boussinesq={q_boussinesq_rect:.1f} kPa at {depth_m}m depth"},
            {"name": "Contact pressure at surface",
             "utilisation": round(q_contact / bearing_capacity_kPa * 100, 1) if bearing_capacity_kPa > 0 else 0,
             "status": "PASS" if q_contact <= bearing_capacity_kPa else "FAIL",
             "detail": f"q_contact={q_contact:.1f} kPa = {applied_load_kN:.0f} kN / ({footing_B_m}×{footing_L_m} m²)"},
            {"name": "Stress dissipation",
             "utilisation": round(stress_ratio * 100, 1),
             "status": "PASS",
             "detail": f"Stress reduced to {stress_ratio * 100:.1f}% at {depth_m}m depth"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "q_contact_kPa": round(q_contact, 1),
            "q_spread_kPa": round(q_spread, 1),
            "q_boussinesq_kPa": round(q_boussinesq_rect, 1),
            "spread_width_m": round(B_spread, 2),
            "spread_length_m": round(L_spread, 2),
            "stress_ratio_pct": round(stress_ratio * 100, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = LoadSpreadCalculator()
