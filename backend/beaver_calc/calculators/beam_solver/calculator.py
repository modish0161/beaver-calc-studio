"""
Continuous Beam Solver — stiffness-matrix method with moving-load envelopes.

Supports:
  * Simply-supported and continuous multi-span beams
  * Point loads, UDLs, and moving wheel-load trains (e.g. HB / SV vehicles)
  * Moment & shear envelopes across the beam

Theory:
  Direct stiffness method for 2-node Euler-Bernoulli beam elements.
  Fixed-end forces are transformed to global coordinates and solved
  via the reduced stiffness matrix (supports removed).

Reference: EN 1991-2, BD 37/01, Matrix Structural Analysis (McGuire et al.)
"""

from typing import Dict, Any, List, Optional
import math
from ..base import CalculatorPlugin


# ---------------------------------------------------------------------------
# Stiffness helpers
# ---------------------------------------------------------------------------

def _element_stiffness(EI: float, L: float) -> List[List[float]]:
    """4x4 Euler-Bernoulli beam element stiffness matrix [v1,θ1,v2,θ2]."""
    c = EI / L ** 3
    return [
        [12 * c, 6 * L * c, -12 * c, 6 * L * c],
        [6 * L * c, 4 * L ** 2 * c, -6 * L * c, 2 * L ** 2 * c],
        [-12 * c, -6 * L * c, 12 * c, -6 * L * c],
        [6 * L * c, 2 * L ** 2 * c, -6 * L * c, 4 * L ** 2 * c],
    ]


def _fixed_end_point(P: float, a: float, L: float) -> List[float]:
    """Fixed-end reactions for a point load P at distance *a* from left node."""
    b = L - a
    Ma = -P * a * b ** 2 / L ** 2
    Mb = P * a ** 2 * b / L ** 2
    Ra = P * b ** 2 * (3 * a + b) / L ** 3
    Rb = P * a ** 2 * (a + 3 * b) / L ** 3
    return [Ra, Ma, Rb, Mb]


def _fixed_end_udl(w: float, L: float) -> List[float]:
    """Fixed-end reactions for a full UDL *w* (kN/m) over element length *L*."""
    R = w * L / 2
    M = w * L ** 2 / 12
    return [R, -M, R, M]


def _solve(K: List[List[float]], F: List[float], free_dofs: List[int]) -> List[float]:
    """Solve K·u = F for free DOFs via Gaussian elimination (no numpy)."""
    n = len(free_dofs)
    # Extract sub-matrix
    A = [[K[free_dofs[i]][free_dofs[j]] for j in range(n)] for i in range(n)]
    b = [F[free_dofs[i]] for i in range(n)]

    # Forward elimination
    for col in range(n):
        # Partial pivot
        max_row = col
        for row in range(col + 1, n):
            if abs(A[row][col]) > abs(A[max_row][col]):
                max_row = row
        A[col], A[max_row] = A[max_row], A[col]
        b[col], b[max_row] = b[max_row], b[col]

        if abs(A[col][col]) < 1e-14:
            continue
        for row in range(col + 1, n):
            factor = A[row][col] / A[col][col]
            for k in range(col, n):
                A[row][k] -= factor * A[col][k]
            b[row] -= factor * b[col]

    # Back substitution
    u = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = b[i]
        for j in range(i + 1, n):
            s -= A[i][j] * u[j]
        u[i] = s / A[i][i] if abs(A[i][i]) > 1e-14 else 0.0

    # Map back to full DOF vector
    full = [0.0] * len(F)
    for idx, dof in enumerate(free_dofs):
        full[dof] = u[idx]
    return full


# ---------------------------------------------------------------------------
# Internal analysis for one load case
# ---------------------------------------------------------------------------

def _analyse_beam(
    spans: List[float],
    EI: float,
    point_loads: List[dict],
    udl_loads: List[dict],
) -> Dict[str, Any]:
    """
    Analyse a continuous beam.

    Parameters
    ----------
    spans : list of span lengths (m)
    EI : flexural rigidity (kN·m²)
    point_loads : [{"position_m": float, "magnitude_kN": float}, ...]
    udl_loads : [{"span_index": int, "magnitude_kN_m": float}, ...]

    Returns dict with moments, shears, reactions at nodes and along the beam.
    """
    n_spans = len(spans)
    n_nodes = n_spans + 1
    ndof = 2 * n_nodes  # v,θ per node

    # Assemble global K and F
    K = [[0.0] * ndof for _ in range(ndof)]
    F = [0.0] * ndof

    node_x = [0.0]
    for s in spans:
        node_x.append(node_x[-1] + s)

    for elem in range(n_spans):
        L = spans[elem]
        ke = _element_stiffness(EI, L)
        dofs = [2 * elem, 2 * elem + 1, 2 * elem + 2, 2 * elem + 3]
        for i in range(4):
            for j in range(4):
                K[dofs[i]][dofs[j]] += ke[i][j]

    # Fixed-end forces from UDL
    for udl in udl_loads:
        elem = udl["span_index"]
        w = udl["magnitude_kN_m"]
        L = spans[elem]
        fe = _fixed_end_udl(w, L)
        dofs = [2 * elem, 2 * elem + 1, 2 * elem + 2, 2 * elem + 3]
        for i in range(4):
            F[dofs[i]] += fe[i]

    # Fixed-end forces from point loads
    for pl in point_loads:
        pos = pl["position_m"]
        P = pl["magnitude_kN"]
        # Which element?
        cum = 0.0
        for elem in range(n_spans):
            if cum + spans[elem] >= pos - 1e-9:
                a = pos - cum
                fe = _fixed_end_point(P, a, spans[elem])
                dofs = [2 * elem, 2 * elem + 1, 2 * elem + 2, 2 * elem + 3]
                for i in range(4):
                    F[dofs[i]] += fe[i]
                break
            cum += spans[elem]

    # Supports: pin at every node (vertical DOF restrained), rotation free
    fixed_dofs = [2 * i for i in range(n_nodes)]  # vertical DOFs
    free_dofs = [d for d in range(ndof) if d not in fixed_dofs]

    # Solve
    u = _solve(K, F, free_dofs)

    # Recover reactions (R = K·u - F at fixed DOFs)
    reactions = []
    for dof in fixed_dofs:
        r = -F[dof]
        for j in range(ndof):
            r += K[dof][j] * u[j]
        reactions.append(round(r, 3))

    # Compute moment and shear at 21 stations per span
    n_stations = 21
    stations_x: List[float] = []
    moments: List[float] = []
    shears: List[float] = []

    for elem in range(n_spans):
        L = spans[elem]
        dofs = [2 * elem, 2 * elem + 1, 2 * elem + 2, 2 * elem + 3]
        ue = [u[d] for d in dofs]

        # Collect loads on this element
        elem_udl = sum(
            udl["magnitude_kN_m"] for udl in udl_loads if udl["span_index"] == elem
        )
        elem_pts = []
        cum = sum(spans[:elem])
        for pl in point_loads:
            a = pl["position_m"] - cum
            if -1e-9 <= a <= L + 1e-9:
                elem_pts.append((max(0, a), pl["magnitude_kN"]))

        for k in range(n_stations):
            x_local = k * L / (n_stations - 1)
            x_global = cum + x_local

            # Shape-function derivatives for moment: M = EI * d²v/dx²
            xi = x_local / L
            # N'' for Hermite cubics (second derivative × L²)
            N1pp = 6 * (2 * xi - 1) / L ** 2
            N2pp = (6 * xi - 4) / L
            N3pp = -6 * (2 * xi - 1) / L ** 2
            N4pp = (6 * xi - 2) / L

            M = EI * (N1pp * ue[0] + N2pp * ue[1] + N3pp * ue[2] + N4pp * ue[3])

            # Subtract fixed-end contribution and add free-body
            # Instead, use equilibrium from the left
            # Re-calculate M from free-body
            M_fb = 0.0
            # Reaction at left of element
            R_left = reactions[elem]
            M_fb += R_left * x_local
            # Previous reactions
            for prev_node in range(elem):
                M_fb += reactions[prev_node] * (x_global - node_x[prev_node])
            # UDL on this element
            M_fb -= elem_udl * x_local ** 2 / 2
            # Point loads to the left (on this element)
            for (a, P) in elem_pts:
                if a < x_local - 1e-9:
                    M_fb -= P * (x_local - a)
            # UDL on previous elements
            for prev_elem in range(elem):
                w_prev = sum(
                    udl["magnitude_kN_m"] for udl in udl_loads if udl["span_index"] == prev_elem
                )
                L_prev = spans[prev_elem]
                arm = x_global - (node_x[prev_elem] + L_prev / 2)
                M_fb -= w_prev * L_prev * arm
            # Point loads on previous elements
            for pl in point_loads:
                if pl["position_m"] < cum - 1e-9:
                    M_fb -= pl["magnitude_kN"] * (x_global - pl["position_m"])

            # Shear from equilibrium
            V_fb = 0.0
            for node_idx in range(elem + 1):
                V_fb += reactions[node_idx]
            # Subtract loads to the left
            V_fb -= elem_udl * x_local
            for (a, P) in elem_pts:
                if a < x_local - 1e-9:
                    V_fb -= P
            for prev_elem in range(elem):
                w_prev = sum(
                    udl["magnitude_kN_m"] for udl in udl_loads if udl["span_index"] == prev_elem
                )
                V_fb -= w_prev * spans[prev_elem]
            for pl in point_loads:
                if pl["position_m"] < cum - 1e-9:
                    V_fb -= pl["magnitude_kN"]

            if not (elem > 0 and k == 0):
                stations_x.append(round(x_global, 4))
                moments.append(round(M_fb, 3))
                shears.append(round(V_fb, 3))

    return {
        "stations_x": stations_x,
        "moments": moments,
        "shears": shears,
        "reactions": reactions,
        "node_x": [round(x, 4) for x in node_x],
    }


# ---------------------------------------------------------------------------
# Moving load envelope
# ---------------------------------------------------------------------------

def _moving_load_envelope(
    spans: List[float],
    EI: float,
    axle_loads: List[float],
    axle_spacings: List[float],
    udl_loads: List[dict],
    step_m: float = 0.5,
) -> Dict[str, Any]:
    """
    Traverse an axle train along the beam, returning moment/shear envelopes.

    axle_loads : list of axle forces (kN), e.g. [100, 100, 100, 100]
    axle_spacings : list of gaps between consecutive axles (m), len = len(axle_loads)-1
    """
    total_length = sum(spans)
    train_length = sum(axle_spacings) if axle_spacings else 0.0

    # Reference stations (every step_m)
    n_pts = max(int(total_length / step_m) + 1, 3)
    ref_x = [i * total_length / (n_pts - 1) for i in range(n_pts)]

    M_max = [-1e30] * n_pts
    M_min = [1e30] * n_pts
    V_max = [-1e30] * n_pts
    V_min = [1e30] * n_pts

    front_start = -train_length
    front_end = total_length + 0.01

    pos = front_start
    while pos <= front_end:
        # Build point_loads for this train position
        pls: List[dict] = []
        for ax_idx, P in enumerate(axle_loads):
            ax_pos = pos + sum(axle_spacings[:ax_idx])
            if 0 <= ax_pos <= total_length:
                pls.append({"position_m": ax_pos, "magnitude_kN": P})

        if pls:
            res = _analyse_beam(spans, EI, pls, udl_loads)
            # Interpolate to ref stations
            sx = res["stations_x"]
            sm = res["moments"]
            sv = res["shears"]
            for i, rx in enumerate(ref_x):
                m_val = _interp(sx, sm, rx)
                v_val = _interp(sx, sv, rx)
                if m_val > M_max[i]:
                    M_max[i] = m_val
                if m_val < M_min[i]:
                    M_min[i] = m_val
                if v_val > V_max[i]:
                    V_max[i] = v_val
                if v_val < V_min[i]:
                    V_min[i] = v_val

        pos += step_m

    return {
        "envelope_x": [round(x, 4) for x in ref_x],
        "M_max": [round(v, 3) for v in M_max],
        "M_min": [round(v, 3) for v in M_min],
        "V_max": [round(v, 3) for v in V_max],
        "V_min": [round(v, 3) for v in V_min],
    }


def _interp(xs: List[float], ys: List[float], x: float) -> float:
    """Linear interpolation in sorted xs/ys."""
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    for i in range(len(xs) - 1):
        if xs[i] <= x <= xs[i + 1]:
            t = (x - xs[i]) / (xs[i + 1] - xs[i]) if xs[i + 1] != xs[i] else 0
            return ys[i] + t * (ys[i + 1] - ys[i])
    return ys[-1]


# ---------------------------------------------------------------------------
# Calculator plugin
# ---------------------------------------------------------------------------

class BeamSolverCalculator(CalculatorPlugin):
    key = "beam_solver_v1"
    name = "Beam / Grillage Solver"
    version = "1.0.0"
    description = (
        "1-D continuous beam solver using the direct-stiffness method. "
        "Supports simply-supported and multi-span continuous beams, "
        "point loads, UDLs, and moving-load envelope generation."
    )
    category = "structural"
    reference_text = "EN 1991-2, BD 37/01, Matrix Structural Analysis"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        spans = inputs.get("spans_m", [12.0])
        EI = inputs.get("EI_kNm2", 500000.0)
        M_Rd = inputs.get("moment_capacity_kNm", 500.0)
        V_Rd = inputs.get("shear_capacity_kN", 300.0)

        # Static loads
        point_loads = inputs.get("point_loads", [])
        udl_loads = inputs.get("udl_loads", [])

        # Moving load train (optional)
        axle_loads = inputs.get("axle_loads_kN", [])
        axle_spacings = inputs.get("axle_spacings_m", [])

        # --- Static analysis ---
        static = _analyse_beam(spans, EI, point_loads, udl_loads)

        max_M = max(abs(m) for m in static["moments"]) if static["moments"] else 0
        max_V = max(abs(v) for v in static["shears"]) if static["shears"] else 0

        # --- Moving-load envelope (if axles provided) ---
        envelope = None
        env_max_M = 0.0
        env_max_V = 0.0
        if axle_loads:
            envelope = _moving_load_envelope(spans, EI, axle_loads, axle_spacings, udl_loads)
            env_max_M = max(
                max(abs(v) for v in envelope["M_max"]),
                max(abs(v) for v in envelope["M_min"]),
            )
            env_max_V = max(
                max(abs(v) for v in envelope["V_max"]),
                max(abs(v) for v in envelope["V_min"]),
            )

        governing_M = max(max_M, env_max_M)
        governing_V = max(max_V, env_max_V)

        util_M = governing_M / M_Rd if M_Rd > 0 else float("inf")
        util_V = governing_V / V_Rd if V_Rd > 0 else float("inf")

        checks = [
            {
                "name": "Bending capacity",
                "capacity": round(M_Rd, 1),
                "demand": round(governing_M, 1),
                "utilization": round(util_M * 100, 1),
                "unit": "kNm",
                "status": "PASS" if util_M <= 1.0 else "FAIL",
            },
            {
                "name": "Shear capacity",
                "capacity": round(V_Rd, 1),
                "demand": round(governing_V, 1),
                "utilization": round(util_V * 100, 1),
                "unit": "kN",
                "status": "PASS" if util_V <= 1.0 else "FAIL",
            },
        ]

        overall = all(c["status"] == "PASS" for c in checks)

        result: Dict[str, Any] = {
            "n_spans": len(spans),
            "total_length_m": round(sum(spans), 3),
            "static_analysis": static,
            "max_moment_kNm": round(max_M, 3),
            "max_shear_kN": round(max_V, 3),
            "reactions_kN": static["reactions"],
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
            "utilisation_moment": round(util_M * 100, 1),
            "utilisation_shear": round(util_V * 100, 1),
        }

        if envelope:
            result["moving_load_envelope"] = envelope
            result["envelope_max_moment_kNm"] = round(env_max_M, 3)
            result["envelope_max_shear_kN"] = round(env_max_V, 3)

        return result


calculator = BeamSolverCalculator()
