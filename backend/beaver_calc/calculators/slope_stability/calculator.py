"""
Slope stability analysis — Bishop's simplified method of slices.
Circular slip surface, per EN 1997-1 cl 11 / BS 6031.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class SlopeStabilityCalculator(CalculatorPlugin):
    key = "slope_stability_v1"
    name = "Slope Stability"
    version = "1.0.0"
    description = "Slope stability by Bishop's simplified method per EN 1997-1 / BS 6031"
    category = "geotechnical"
    reference_text = "EN 1997-1:2004 cl 11; BS 6031:2009"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Slope geometry
        slope_height_m = inputs.get('slope_height_m', 6)
        slope_angle_deg = inputs.get('slope_angle_deg', 30)

        # Soil layers (list of dicts or single set of params)
        phi_deg = inputs.get('phi_deg', 25)
        c_kPa = inputs.get('cohesion_kPa', 5)
        gamma_kN_m3 = inputs.get('gamma_soil_kN_m3', 19)
        gamma_w = 9.81

        # Water table
        ru = inputs.get('ru', 0.0)  # pore pressure ratio

        # Circle geometry
        n_slices = inputs.get('n_slices', 10)
        # Radius of slip circle (approx)
        R_m = inputs.get('slip_radius_m', 0)
        if R_m <= 0:
            # Estimate: circle through toe and crest
            L_slope = slope_height_m / math.sin(math.radians(slope_angle_deg))
            R_m = L_slope * 1.5  # typical starting radius

        # Surcharge
        surcharge_kPa = inputs.get('surcharge_kPa', 0)

        # Partial factors (DA1-C2)
        gamma_phi = inputs.get('gamma_phi', 1.25)
        gamma_c_pf = inputs.get('gamma_c', 1.25)
        gamma_G = inputs.get('gamma_G', 1.0)

        # Design parameters
        phi_d_rad = math.atan(math.tan(math.radians(phi_deg)) / gamma_phi)
        c_d = c_kPa / gamma_c_pf

        # Bishop's simplified — iterate for FoS
        # Discretise the arc into n slices
        # Simplified single-circle through toe
        beta_rad = math.radians(slope_angle_deg)

        # Slice width
        b = slope_height_m / (math.tan(beta_rad) * n_slices) if math.tan(beta_rad) > 0.01 else 1

        sum_numerator = 0.0
        sum_denominator = 0.0
        slice_results = []

        FoS = 1.5  # initial guess
        for iteration in range(20):
            sum_num = 0.0
            sum_den = 0.0

            for i in range(n_slices):
                # x from toe
                x = (i + 0.5) * b
                # Slice height (simplified triangular slope)
                h_slope = slope_height_m - x * math.tan(beta_rad)
                h_slice = max(0, min(h_slope, slope_height_m))
                if h_slice <= 0:
                    continue

                # Base angle of slice
                alpha_i = math.atan((slope_height_m - h_slice) / (R_m + 0.001))

                # Weight of slice per unit run
                W_i = gamma_kN_m3 * h_slice * b * gamma_G + surcharge_kPa * b * gamma_G

                # Pore pressure
                u_i = ru * gamma_kN_m3 * h_slice

                # Bishop's m_alpha
                m_alpha = math.cos(alpha_i) + math.sin(alpha_i) * math.tan(phi_d_rad) / FoS
                if abs(m_alpha) < 0.01:
                    m_alpha = 0.01

                # Numerator: [c'b + (W - u·b) tan φ'] / m_α
                num_i = (c_d * b + (W_i - u_i * b) * math.tan(phi_d_rad)) / m_alpha
                # Denominator: W sin α
                den_i = W_i * math.sin(alpha_i)

                sum_num += num_i
                sum_den += den_i

                if iteration == 0:
                    slice_results.append({
                        "slice": i + 1,
                        "h_m": round(h_slice, 2),
                        "W_kN": round(W_i, 1),
                        "alpha_deg": round(math.degrees(alpha_i), 1),
                    })

            FoS_new = sum_num / sum_den if abs(sum_den) > 0.01 else 999
            if abs(FoS_new - FoS) < 0.001:
                FoS = FoS_new
                break
            FoS = FoS_new

        # Required FoS
        FoS_required = inputs.get('FoS_required', 1.0)  # 1.0 for DA1-C2 (factors on params)

        fos_ratio = FoS_required / FoS if FoS > 0 else 999

        checks = [
            {"name": "Factor of Safety (Bishop)",
             "utilisation": round(fos_ratio * 100, 1),
             "status": "PASS" if FoS >= FoS_required else "FAIL",
             "detail": f"FoS={FoS:.2f} (required ≥{FoS_required:.2f}, DA1-C2)"},
            {"name": "Slope angle advisory",
             "utilisation": round(slope_angle_deg / phi_deg * 100, 1) if phi_deg > 0 else 999,
             "status": "PASS" if slope_angle_deg < phi_deg else "WARNING",
             "detail": f"Slope={slope_angle_deg}° vs φ'={phi_deg}°"},
        ]

        overall = all(c['status'] in ('PASS', 'WARNING') for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "FoS_bishop": round(FoS, 3),
            "FoS_required": FoS_required,
            "slip_radius_m": round(R_m, 1),
            "n_slices": n_slices,
            "iterations": iteration + 1,
            "phi_d_deg": round(math.degrees(phi_d_rad), 1),
            "c_d_kPa": round(c_d, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = SlopeStabilityCalculator()
