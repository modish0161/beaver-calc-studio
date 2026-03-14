"""
Traffic actions on bridges per EN 1991-2 / UK NA.
Load Model 1 (LM1), LM2, LM3 (SV vehicles), and crowd loading.
"""
from typing import Dict, Any
import math
from ..base import CalculatorPlugin


class TrafficActionsCalculator(CalculatorPlugin):
    key = "traffic_actions_v1"
    name = "Traffic Actions"
    version = "1.0.0"
    description = "Traffic actions on bridges per EN 1991-2 / UK NA"
    category = "actions"
    reference_text = "EN 1991-2:2003; UK NA to BS EN 1991-2"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        # Bridge geometry
        carriageway_width_m = inputs.get('carriageway_width_m', 7.3)
        span_m = inputs.get('span_m', 20)

        # Load model selection
        load_model = inputs.get('load_model', 'LM1')  # LM1, LM2, LM3, crowd

        # Number of notional lanes (EN 1991-2 Table 4.1)
        w = carriageway_width_m
        if w < 5.4:
            n_lanes = 1
            w_lane = 3.0
        elif w < 6.0:
            n_lanes = 1
            w_lane = 3.0
        else:
            n_lanes = int(w / 3.0)
            w_lane = 3.0

        w_remaining = w - n_lanes * w_lane

        if load_model == 'LM1':
            # Tandem system (TS) and UDL per lane
            # UK NA adjustment factors α_Q and α_q
            alpha_Q = [inputs.get('alpha_Q1', 1.0), inputs.get('alpha_Q2', 1.0), inputs.get('alpha_Q3', 1.0)]
            alpha_q = [inputs.get('alpha_q1', 1.0), inputs.get('alpha_q2', 2.4 / 2.5), inputs.get('alpha_q3', 1.2 / 2.5)]
            alpha_qr = inputs.get('alpha_qr', 1.2 / 2.5)  # remaining area

            # EN 1991-2 Table 4.2
            Q_k = [300, 200, 100]  # kN per axle (lane 1, 2, 3)
            q_k = [9.0, 2.5, 2.5]  # kPa UDL

            lane_results = []
            total_ts_kN = 0
            total_udl_kN = 0

            for i in range(min(n_lanes, 3)):
                ts = alpha_Q[i] * Q_k[i] * 2  # 2 axles
                udl = alpha_q[i] * q_k[i] * w_lane * span_m
                lane_results.append({
                    'lane': i + 1,
                    'TS_kN': round(ts, 0),
                    'UDL_kN': round(udl, 0),
                    'q_kPa': round(alpha_q[i] * q_k[i], 2),
                })
                total_ts_kN += ts
                total_udl_kN += udl

            # Remaining area
            if w_remaining > 0:
                udl_rem = alpha_qr * 2.5 * w_remaining * span_m
                total_udl_kN += udl_rem

            total_load_kN = total_ts_kN + total_udl_kN

        elif load_model == 'LM2':
            # Single axle load (400 kN × β_Q)
            beta_Q = inputs.get('beta_Q', 1.0)
            axle_load = 400 * beta_Q
            total_load_kN = axle_load
            lane_results = [{'axle_load_kN': round(axle_load, 0)}]
            total_ts_kN = axle_load
            total_udl_kN = 0

        elif load_model == 'LM3':
            # SV vehicles (UK NA)
            sv_type = inputs.get('sv_type', 'SV80')  # SV80, SV100, SV196, SOV250
            sv_weights = {
                'SV80': 800,
                'SV100': 1000,
                'SV196': 1960,
                'SOV250': 2500,
            }
            sv_total = sv_weights.get(sv_type, 800)
            total_load_kN = sv_total
            lane_results = [{'vehicle': sv_type, 'total_kN': sv_total}]
            total_ts_kN = sv_total
            total_udl_kN = 0

        else:
            # Crowd loading (cl 5.3.2.1)
            q_crowd = inputs.get('q_crowd_kPa', 5.0)
            total_udl_kN = q_crowd * carriageway_width_m * span_m
            total_ts_kN = 0
            total_load_kN = total_udl_kN
            lane_results = [{'q_crowd_kPa': q_crowd}]

        # Per-metre values
        total_per_m = total_load_kN / span_m if span_m > 0 else 0

        # Simple bending effects (SS beam)
        M_max_kNm = total_udl_kN * span_m / 8 + total_ts_kN * span_m / 4
        V_max_kN = total_udl_kN / 2 + total_ts_kN / 2

        checks = [
            {"name": "Total traffic load",
             "utilisation": 0, "status": "INFO",
             "detail": f"{total_load_kN:.0f} kN ({load_model}, {n_lanes} lanes, L={span_m}m)"},
            {"name": "Bending (SS beam)",
             "utilisation": 0, "status": "INFO",
             "detail": f"M_max ≈ {M_max_kNm:.0f} kNm"},
            {"name": "Shear (SS beam)",
             "utilisation": 0, "status": "INFO",
             "detail": f"V_max ≈ {V_max_kN:.0f} kN"},
        ]

        return {
            "n_notional_lanes": n_lanes,
            "lane_width_m": w_lane,
            "remaining_area_m": round(w_remaining, 2),
            "lanes": lane_results,
            "total_TS_kN": round(total_ts_kN, 0),
            "total_UDL_kN": round(total_udl_kN, 0),
            "total_load_kN": round(total_load_kN, 0),
            "total_per_m_kN_m": round(total_per_m, 1),
            "M_max_kNm": round(M_max_kNm, 0),
            "V_max_kN": round(V_max_kN, 0),
            "checks": checks,
            "overall_status": "PASS",
            "utilisation": 0,
        }


calculator = TrafficActionsCalculator()
