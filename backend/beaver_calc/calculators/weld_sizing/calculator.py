"""
Weld sizing per EN 1993-1-8 cl 4.5 (fillet welds) and cl 4.7 (butt welds).
Directional / simplified method, throat thickness selection, combined stresses.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class WeldSizingCalculator(CalculatorPlugin):
    key = "weld_sizing_v1"
    name = "Weld Sizing"
    version = "1.0.0"
    description = "Weld sizing per EN 1993-1-8"
    category = "steel-design"
    reference_text = "EN 1993-1-8:2005 cl 4.5, 4.7; SCI P363"

    # Correlation factor β_w (Table 4.1)
    BETA_W = {
        'S235': 0.80,
        'S275': 0.85,
        'S355': 0.90,
        'S420': 1.00,
        'S460': 1.00,
    }

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Weld type
        weld_type = inputs.get('weld_type', 'fillet')  # fillet or butt

        # Weld geometry
        leg_size_mm = inputs.get('leg_size_mm', 6.0)
        weld_length_mm = inputs.get('weld_length_mm', 200.0)

        # Steel grade
        grade = inputs.get('grade', 'S355')
        fu_MPa = inputs.get('fu_MPa', 510)  # ultimate of parent metal
        fy_MPa = inputs.get('fy_MPa', 355)

        # Applied forces on weld group
        F_parallel_kN = inputs.get('F_parallel_kN', 0.0)  # along weld
        F_perp_kN = inputs.get('F_perp_kN', 50.0)  # perpendicular to weld
        M_kNm = inputs.get('M_kNm', 0.0)  # moment on weld group

        # Safety factors
        gamma_M2 = inputs.get('gamma_M2', 1.25)

        beta_w = self.BETA_W.get(grade, 0.90)

        throat = leg_size_mm / math.sqrt(2)  # effective throat a = s/√2

        # Effective length (deduct 2×a from each end per 4.5.1)
        Leff = max(weld_length_mm - 2 * throat, 0)
        if Leff < 6 * throat:
            Leff = weld_length_mm  # short weld, use full length

        # Weld area
        Aw = throat * Leff  # mm²

        if weld_type == 'fillet':
            # Simplified method (cl 4.5.3.3)
            # Resultant stress on throat
            # τ_parallel (along weld axis)
            tau_par = F_parallel_kN * 1000 / Aw if Aw > 0 else 999

            # σ_perp and τ_perp from transverse force
            # For 90° fillet: σ_⊥ = τ_⊥ = F_perp / (Aw × √2)
            sigma_perp = F_perp_kN * 1000 / (Aw * math.sqrt(2)) if Aw > 0 else 999
            tau_perp = sigma_perp  # equal for 90° fillet

            # Moment on weld line (bending about weld centre)
            if M_kNm > 0 and Leff > 0:
                Sw = throat * Leff ** 2 / 6  # section modulus of weld (mm³)
                sigma_M = M_kNm * 1e6 / (Sw * math.sqrt(2)) if Sw > 0 else 0
                sigma_perp += sigma_M
                tau_perp += sigma_M

            # Directional method (Eq 4.1)
            von_mises = math.sqrt(sigma_perp ** 2 + 3 * (tau_perp ** 2 + tau_par ** 2))
            f_vw_d = fu_MPa / (beta_w * math.sqrt(3) * gamma_M2)

            # Check 1: Von Mises ≤ fu/(β_w × γ_M2)
            dir_limit = fu_MPa / (beta_w * gamma_M2)
            dir_util = von_mises / dir_limit if dir_limit > 0 else 999

            # Check 2: σ_⊥ ≤ 0.9 × fu / γ_M2
            perp_limit = 0.9 * fu_MPa / gamma_M2
            perp_util = abs(sigma_perp) / perp_limit if perp_limit > 0 else 999

            # Simplified method (cl 4.5.3.3 Eq 4.2)
            fw_Rd = fu_MPa / (math.sqrt(3) * beta_w * gamma_M2)
            F_total = math.sqrt((F_parallel_kN * 1000) ** 2 + (F_perp_kN * 1000) ** 2)
            tau_simple = F_total / Aw if Aw > 0 else 999
            simple_util = tau_simple / fw_Rd if fw_Rd > 0 else 999

            # Minimum leg size (Table 4.1 SCI P363)
            t_max_mm = inputs.get('thicker_plate_mm', 12.0)
            if t_max_mm <= 10:
                min_leg = 3.0
            elif t_max_mm <= 20:
                min_leg = 5.0
            elif t_max_mm <= 30:
                min_leg = 6.0
            else:
                min_leg = 8.0
            min_leg_ok = leg_size_mm >= min_leg

            checks = []

            checks.append({
                "name": "Directional method (Eq 4.1)",
                "utilisation": round(dir_util, 3),
                "status": "PASS" if dir_util <= 1.0 else "FAIL",
                "detail": (f"√(σ⊥² + 3(τ⊥² + τ∥²)) = {von_mises:.0f} MPa vs "
                           f"fu/(β_w×γ_M2) = {dir_limit:.0f} MPa")
            })

            checks.append({
                "name": "σ_⊥ ≤ 0.9fu/γ_M2",
                "utilisation": round(perp_util, 3),
                "status": "PASS" if perp_util <= 1.0 else "FAIL",
                "detail": f"|σ⊥| = {abs(sigma_perp):.0f} MPa vs {perp_limit:.0f} MPa"
            })

            checks.append({
                "name": "Simplified method (Eq 4.2)",
                "utilisation": round(simple_util, 3),
                "status": "PASS" if simple_util <= 1.0 else "FAIL",
                "detail": f"τ_Ed = {tau_simple:.0f} MPa vs fw,Rd = {fw_Rd:.0f} MPa"
            })

            checks.append({
                "name": "Minimum leg size",
                "utilisation": round(min_leg / leg_size_mm, 3) if leg_size_mm > 0 else 999,
                "status": "PASS" if min_leg_ok else "FAIL",
                "detail": f"leg = {leg_size_mm:.0f}mm ≥ min {min_leg:.0f}mm for t = {t_max_mm:.0f}mm"
            })

        else:
            # Full penetration butt weld — matched to parent metal
            sigma_butt = F_perp_kN * 1000 / (weld_length_mm * inputs.get('plate_thickness_mm', 12)) \
                if weld_length_mm > 0 else 999
            butt_limit = fy_MPa / gamma_M2
            butt_util = sigma_butt / butt_limit if butt_limit > 0 else 999

            checks = [{
                "name": "Butt weld stress",
                "utilisation": round(butt_util, 3),
                "status": "PASS" if butt_util <= 1.0 else "FAIL",
                "detail": f"σ = {sigma_butt:.0f} MPa vs fy/γ_M2 = {butt_limit:.0f} MPa"
            }]

        governing = max(c["utilisation"] for c in checks)
        overall = "PASS" if all(c["status"] == "PASS" for c in checks) else "FAIL"

        result = {
            "weld_type": weld_type,
            "throat_mm": round(throat, 1),
            "effective_length_mm": round(Leff, 0),
            "Aw_mm2": round(Aw, 0),
            "beta_w": beta_w,
            "checks": checks,
            "overall_status": overall,
            "utilisation": round(governing * 100, 1),
        }

        if weld_type == 'fillet':
            result["fw_Rd_MPa"] = round(fu_MPa / (math.sqrt(3) * beta_w * gamma_M2), 0)
            result["min_leg_mm"] = min_leg

        return result


calculator = WeldSizingCalculator()
