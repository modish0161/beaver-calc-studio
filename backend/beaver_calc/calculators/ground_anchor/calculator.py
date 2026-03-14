"""
Ground anchor design to EN 1997-1 / BS 8081.
Bond length, tendon capacity, pull-out resistance, proof load.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class GroundAnchorCalculator(CalculatorPlugin):
    key = "ground_anchor_v1"
    name = "Ground Anchor Design"
    version = "1.0.0"
    description = "Ground anchor design to BS 8081 / EN 1997-1"
    category = "geotechnical"
    reference_text = "BS 8081:2015, EN 1997-1:2004 cl 8"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        T_design_kN = inputs.get('design_load_kN', 500)
        # Ground conditions
        soil_type = inputs.get('soil_type', 'stiff_clay')
        tau_bond_kPa = inputs.get('grout_bond_kPa', 100)  # grout-ground bond
        drill_dia_mm = inputs.get('drill_diameter_mm', 150)
        # Tendon
        tendon_area_mm2 = inputs.get('tendon_area_mm2', 1120)  # 4×T15 strands
        fpk_MPa = inputs.get('tendon_fpk_MPa', 1860)
        # Geometry
        free_length_m = inputs.get('free_length_m', 8.0)
        anchor_inclination_deg = inputs.get('inclination_deg', 15)
        # Factors
        FoS_pullout = inputs.get('FoS_pullout', 2.0)
        proof_load_factor = inputs.get('proof_load_factor', 1.25)

        gamma_M = 1.15  # tendon

        # Tendon capacity
        T_tendon_Rd = 0.9 * fpk_MPa * tendon_area_mm2 / gamma_M / 1000  # kN (0.9fpk limit)

        # Required bond length
        perim = math.pi * drill_dia_mm / 1000  # m
        R_pullout_per_m = perim * tau_bond_kPa  # kN/m
        L_bond_req = T_design_kN * FoS_pullout / R_pullout_per_m if R_pullout_per_m > 0 else float('inf')
        L_bond = max(L_bond_req, 3.0)  # minimum 3m bond length

        # Total anchor length
        L_total = free_length_m + L_bond

        # Pullout resistance
        R_pullout = R_pullout_per_m * L_bond
        util_pullout = T_design_kN * FoS_pullout / R_pullout if R_pullout > 0 else float('inf')

        # Tendon check
        util_tendon = T_design_kN / T_tendon_Rd if T_tendon_Rd > 0 else float('inf')

        # Proof load
        T_proof = T_design_kN * proof_load_factor
        util_proof = T_proof / T_tendon_Rd if T_tendon_Rd > 0 else float('inf')

        # Lock-off load (typically 60-80% of design)
        T_lockoff = T_design_kN * 0.6

        # Elastic extension check
        E_tendon = 195000  # MPa for strand
        delta_elastic = T_design_kN * 1000 * free_length_m * 1000 / (E_tendon * tendon_area_mm2)  # mm
        delta_expected_min = delta_elastic * 0.8
        delta_expected_max = delta_elastic * 1.1

        checks = [
            {"name": "Tendon capacity", "utilisation": round(util_tendon * 100, 1),
             "status": "PASS" if util_tendon <= 1.0 else "FAIL",
             "detail": f"T_d={T_design_kN:.1f} kN / T_Rd={T_tendon_Rd:.1f} kN"},
            {"name": "Pullout resistance", "utilisation": round(util_pullout * 100, 1),
             "status": "PASS" if util_pullout <= 1.0 else "FAIL",
             "detail": f"T_d×FoS={T_design_kN * FoS_pullout:.1f} kN / R={R_pullout:.1f} kN"},
            {"name": "Proof load vs tendon", "utilisation": round(util_proof * 100, 1),
             "status": "PASS" if util_proof <= 1.0 else "FAIL",
             "detail": f"T_proof={T_proof:.1f} kN / T_Rd={T_tendon_Rd:.1f} kN"},
            {"name": "Bond length (min 3m)", "utilisation": round(3.0 / L_bond * 100, 1),
             "status": "PASS" if L_bond >= 3.0 else "FAIL",
             "detail": f"L_bond={L_bond:.2f} m"},
        ]

        overall = all(c['status'] == 'PASS' for c in checks)
        governing = max(c['utilisation'] for c in checks)

        return {
            "T_tendon_Rd_kN": round(T_tendon_Rd, 1),
            "L_bond_req_m": round(L_bond_req, 2),
            "L_bond_m": round(L_bond, 2),
            "L_total_m": round(L_total, 2),
            "R_pullout_kN": round(R_pullout, 1),
            "T_proof_kN": round(T_proof, 1),
            "T_lockoff_kN": round(T_lockoff, 1),
            "delta_elastic_mm": round(delta_elastic, 1),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation": round(governing, 1),
        }


calculator = GroundAnchorCalculator()
