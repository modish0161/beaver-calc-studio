"""
2-D Frame / Truss Analysis — direct-stiffness method.

Each member is a general 2-D beam-column (axial + bending) unless
``member_type="truss"`` in which case bending DOFs are released
(pin-pin) so only axial force is carried.

Supports:
  * Any topology of nodes, members, supports, and applied loads
  * Frame, truss, or mixed behaviour
  * Outputs: nodal displacements, member forces (N, V, M), reactions

Reference: Matrix Structural Analysis (McGuire, Gallagher & Ziemian)
"""

from typing import Dict, Any, List
import math
from ..base import CalculatorPlugin


# ---------------------------------------------------------------------------
# Element stiffness in local then global coordinates
# ---------------------------------------------------------------------------

def _rotation_matrix(cos: float, sin: float) -> List[List[float]]:
    """6×6 transformation matrix from local to global for a 2-D frame element."""
    T = [[0.0] * 6 for _ in range(6)]
    T[0][0] = cos;  T[0][1] = sin
    T[1][0] = -sin; T[1][1] = cos
    T[2][2] = 1.0
    T[3][3] = cos;  T[3][4] = sin
    T[4][3] = -sin; T[4][4] = cos
    T[5][5] = 1.0
    return T


def _local_frame_stiffness(E: float, A: float, I: float, L: float) -> List[List[float]]:
    """6×6 local stiffness for a 2-D frame element [u1,v1,θ1,u2,v2,θ2]."""
    ea = E * A / L
    ei = E * I / L ** 3
    k = [[0.0] * 6 for _ in range(6)]
    # Axial
    k[0][0] = ea;  k[0][3] = -ea
    k[3][0] = -ea; k[3][3] = ea
    # Bending
    k[1][1] = 12 * ei;     k[1][2] = 6 * L * ei
    k[1][4] = -12 * ei;    k[1][5] = 6 * L * ei
    k[2][1] = 6 * L * ei;  k[2][2] = 4 * L ** 2 * ei
    k[2][4] = -6 * L * ei; k[2][5] = 2 * L ** 2 * ei
    k[4][1] = -12 * ei;    k[4][2] = -6 * L * ei
    k[4][4] = 12 * ei;     k[4][5] = -6 * L * ei
    k[5][1] = 6 * L * ei;  k[5][2] = 2 * L ** 2 * ei
    k[5][4] = -6 * L * ei; k[5][5] = 4 * L ** 2 * ei
    return k


def _local_truss_stiffness(E: float, A: float, L: float) -> List[List[float]]:
    """6×6 local stiffness for a truss element (axial only)."""
    ea = E * A / L
    k = [[0.0] * 6 for _ in range(6)]
    k[0][0] = ea;  k[0][3] = -ea
    k[3][0] = -ea; k[3][3] = ea
    return k


def _transform(k_local: List[List[float]], T: List[List[float]]) -> List[List[float]]:
    """K_global = T^T · K_local · T"""
    n = 6
    # Temp = K_local · T
    temp = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            s = 0.0
            for p in range(n):
                s += k_local[i][p] * T[p][j]
            temp[i][j] = s
    # K_global = T^T · temp
    kg = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            s = 0.0
            for p in range(n):
                s += T[p][i] * temp[p][j]
            kg[i][j] = s
    return kg


# ---------------------------------------------------------------------------
# Gaussian solver (no numpy dependency)
# ---------------------------------------------------------------------------

def _gauss_solve(K: List[List[float]], F: List[float], free: List[int]) -> List[float]:
    """Solve K·u = F for free DOFs."""
    n = len(free)
    A = [[K[free[i]][free[j]] for j in range(n)] for i in range(n)]
    b = [F[free[i]] for i in range(n)]

    for col in range(n):
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

    u = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = b[i]
        for j in range(i + 1, n):
            s -= A[i][j] * u[j]
        u[i] = s / A[i][i] if abs(A[i][i]) > 1e-14 else 0.0

    full = [0.0] * len(F)
    for idx, dof in enumerate(free):
        full[dof] = u[idx]
    return full


# ---------------------------------------------------------------------------
# Calculator Plugin
# ---------------------------------------------------------------------------

class FrameAnalysisCalculator(CalculatorPlugin):
    key = "frame_analysis_v1"
    name = "2D Frame / Truss Analysis"
    version = "1.0.0"
    description = (
        "General 2-D frame and truss analysis using the direct-stiffness method. "
        "Suitable for simple bridge frames, falsework towers, and bracing systems."
    )
    category = "structural"
    reference_text = "EN 1993-1-1, Matrix Structural Analysis (McGuire et al.)"

    def calculate(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        nodes = inputs.get("nodes", [])
        members = inputs.get("members", [])
        supports = inputs.get("supports", [])
        loads = inputs.get("loads", [])

        if len(nodes) < 2:
            raise ValueError("At least 2 nodes are required")
        if not members:
            raise ValueError("At least 1 member is required")

        n_nodes = len(nodes)
        ndof = 3 * n_nodes  # u, v, θ per node

        K = [[0.0] * ndof for _ in range(ndof)]
        F = [0.0] * ndof

        # Build node coordinate lookup
        node_coords = {n["id"]: (n["x"], n["y"]) for n in nodes}

        # Map node id → sequential index
        node_ids = [n["id"] for n in nodes]
        nid_map = {nid: idx for idx, nid in enumerate(node_ids)}

        member_data = []

        for mem in members:
            ni = nid_map[mem["start_node"]]
            nj = nid_map[mem["end_node"]]
            x1, y1 = node_coords[mem["start_node"]]
            x2, y2 = node_coords[mem["end_node"]]
            dx = x2 - x1
            dy = y2 - y1
            L = math.sqrt(dx ** 2 + dy ** 2)
            if L < 1e-9:
                raise ValueError(f"Zero-length member between nodes {mem['start_node']} and {mem['end_node']}")
            cos = dx / L
            sin = dy / L

            E = mem.get("E_kPa", 210e6)  # default steel in kPa
            A = mem.get("A_m2", 0.01)
            I = mem.get("I_m4", 1e-4)
            mtype = mem.get("type", "frame")

            if mtype == "truss":
                k_local = _local_truss_stiffness(E, A, L)
            else:
                k_local = _local_frame_stiffness(E, A, I, L)

            T = _rotation_matrix(cos, sin)
            k_global = _transform(k_local, T)

            dofs_i = [3 * ni, 3 * ni + 1, 3 * ni + 2]
            dofs_j = [3 * nj, 3 * nj + 1, 3 * nj + 2]
            dof_map = dofs_i + dofs_j

            for a in range(6):
                for b in range(6):
                    K[dof_map[a]][dof_map[b]] += k_global[a][b]

            member_data.append({
                "id": mem.get("id", f"m{len(member_data)+1}"),
                "ni": ni, "nj": nj, "L": L,
                "cos": cos, "sin": sin,
                "E": E, "A": A, "I": I,
                "type": mtype,
                "T": T, "k_local": k_local,
                "dof_map": dof_map,
            })

        # Apply nodal loads
        for load in loads:
            nid = nid_map[load["node"]]
            if "Fx" in load:
                F[3 * nid] += load["Fx"]
            if "Fy" in load:
                F[3 * nid + 1] += load["Fy"]
            if "Mz" in load:
                F[3 * nid + 2] += load["Mz"]

        # Determine fixed DOFs from supports
        fixed_dofs = set()
        for sup in supports:
            nid = nid_map[sup["node"]]
            stype = sup.get("type", "pin")
            if stype in ("pin", "fixed"):
                fixed_dofs.add(3 * nid)      # u
                fixed_dofs.add(3 * nid + 1)  # v
            if stype == "fixed":
                fixed_dofs.add(3 * nid + 2)  # θ
            if stype == "roller_x":
                fixed_dofs.add(3 * nid + 1)  # v only
            if stype == "roller_y":
                fixed_dofs.add(3 * nid)      # u only

        free_dofs = sorted(set(range(ndof)) - fixed_dofs)

        # Solve
        u = _gauss_solve(K, F, free_dofs)

        # Reactions
        reactions = {}
        for sup in supports:
            nid = nid_map[sup["node"]]
            rx = sum(K[3 * nid][j] * u[j] for j in range(ndof)) - F[3 * nid]
            ry = sum(K[3 * nid + 1][j] * u[j] for j in range(ndof)) - F[3 * nid + 1]
            rz = sum(K[3 * nid + 2][j] * u[j] for j in range(ndof)) - F[3 * nid + 2]
            reactions[sup["node"]] = {
                "Rx_kN": round(rx, 3),
                "Ry_kN": round(ry, 3),
                "Mz_kNm": round(rz, 3),
            }

        # Member forces (local)
        member_results = []
        max_axial = 0.0
        max_shear = 0.0
        max_moment = 0.0

        for md in member_data:
            dofs = md["dof_map"]
            u_global = [u[d] for d in dofs]
            T = md["T"]
            # u_local = T · u_global
            u_local = [0.0] * 6
            for i in range(6):
                for j in range(6):
                    u_local[i] += T[i][j] * u_global[j]
            # f_local = k_local · u_local
            k_loc = md["k_local"]
            f_local = [0.0] * 6
            for i in range(6):
                for j in range(6):
                    f_local[i] += k_loc[i][j] * u_local[j]

            N = f_local[3]   # axial at end j
            V_i = f_local[1]
            M_i = f_local[2]
            M_j = f_local[5]

            max_axial = max(max_axial, abs(N))
            max_shear = max(max_shear, abs(V_i))
            max_moment = max(max_moment, abs(M_i), abs(M_j))

            member_results.append({
                "id": md["id"],
                "type": md["type"],
                "length_m": round(md["L"], 4),
                "axial_kN": round(N, 3),
                "shear_kN": round(V_i, 3),
                "moment_start_kNm": round(M_i, 3),
                "moment_end_kNm": round(M_j, 3),
            })

        # Displacements
        nodal_displacements = []
        max_disp = 0.0
        for idx, nid in enumerate(node_ids):
            dx_val = u[3 * idx]
            dy_val = u[3 * idx + 1]
            rz_val = u[3 * idx + 2]
            disp = math.sqrt(dx_val ** 2 + dy_val ** 2)
            max_disp = max(max_disp, disp)
            nodal_displacements.append({
                "node": nid,
                "dx_m": round(dx_val, 6),
                "dy_m": round(dy_val, 6),
                "rotation_rad": round(rz_val, 6),
            })

        # Summary checks
        N_Rd = inputs.get("axial_capacity_kN", 1000.0)
        V_Rd = inputs.get("shear_capacity_kN", 500.0)
        M_Rd = inputs.get("moment_capacity_kNm", 200.0)

        util_N = max_axial / N_Rd if N_Rd > 0 else 0
        util_V = max_shear / V_Rd if V_Rd > 0 else 0
        util_M = max_moment / M_Rd if M_Rd > 0 else 0

        checks = [
            {
                "name": "Axial capacity",
                "capacity": round(N_Rd, 1),
                "demand": round(max_axial, 1),
                "utilization": round(util_N * 100, 1),
                "unit": "kN",
                "status": "PASS" if util_N <= 1.0 else "FAIL",
            },
            {
                "name": "Shear capacity",
                "capacity": round(V_Rd, 1),
                "demand": round(max_shear, 1),
                "utilization": round(util_V * 100, 1),
                "unit": "kN",
                "status": "PASS" if util_V <= 1.0 else "FAIL",
            },
            {
                "name": "Bending capacity",
                "capacity": round(M_Rd, 1),
                "demand": round(max_moment, 1),
                "utilization": round(util_M * 100, 1),
                "unit": "kNm",
                "status": "PASS" if util_M <= 1.0 else "FAIL",
            },
        ]

        overall = all(c["status"] == "PASS" for c in checks)

        return {
            "n_nodes": n_nodes,
            "n_members": len(members),
            "nodal_displacements": nodal_displacements,
            "max_displacement_m": round(max_disp, 6),
            "member_forces": member_results,
            "reactions": reactions,
            "max_axial_kN": round(max_axial, 3),
            "max_shear_kN": round(max_shear, 3),
            "max_moment_kNm": round(max_moment, 3),
            "checks": checks,
            "overall_status": "PASS" if overall else "FAIL",
        }


calculator = FrameAnalysisCalculator()
