// ─────────────────────────────────────────────────────────────────────────────
// Field Explanations — Eurocode clause references for calculator form inputs
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldExplanation {
  title: string;
  method?: string;
  eurocodeClause?: string;
  equation?: string;
  assumptions?: string[];
  references?: string[];
}

/**
 * Universal field explanations keyed by field name.
 * Covers common structural engineering input parameters used across calculators.
 */
const fieldExplanations: Record<string, FieldExplanation> = {
  // ── Geometry ────────────────────────────────────────────────────────────
  span: {
    title: "Span Length",
    method:
      "Clear span between supports. For continuous beams use individual span lengths.",
    eurocodeClause: "EN 1993-1-1 §5.4 — Structural analysis, effective span",
    assumptions: [
      "Measured centre-to-centre of supports",
      "Simply supported unless stated otherwise",
    ],
    references: ["EN 1993-1-1:2005", "SCI P363"],
  },
  effective_length: {
    title: "Effective Length",
    method:
      "The effective length accounts for end restraint conditions and is used in buckling checks.",
    eurocodeClause: "EN 1993-1-1 §6.3.1.3 — Effective length for buckling",
    equation: "L_cr = k × L",
    assumptions: [
      "End conditions determine k factor",
      "k=1.0 for pinned-pinned, k=0.7 for fixed-pinned",
    ],
    references: ["EN 1993-1-1:2005 §6.3.1.3", "SCI P362 Table 5.1"],
  },
  restraint_spacing: {
    title: "Lateral Restraint Spacing",
    method:
      "Distance between lateral torsional buckling restraints along the compression flange.",
    eurocodeClause: "EN 1993-1-1 §6.3.2.1 — LTB restraint",
    assumptions: [
      "Restraints are effective at preventing lateral displacement and twist",
    ],
    references: ["EN 1993-1-1:2005 §6.3.2", "SCI P360"],
  },
  depth: {
    title: "Section Depth",
    method: "Overall depth of the section measured parallel to the web.",
    eurocodeClause: "EN 1993-1-1 §1.7 — Section dimensions",
    references: ["EN 1993-1-1:2005", "BS 4-1:2005 Steel section tables"],
  },
  width: {
    title: "Section Width",
    method: "Overall width of the flange or section.",
    references: ["BS 4-1:2005 Steel section tables"],
  },
  custom_h: {
    title: "Custom Section Depth h",
    method: "Overall depth of custom fabricated section.",
    eurocodeClause:
      "EN 1993-1-1 §6.2 — Cross-section classification depends on h/t ratios",
    references: ["EN 1993-1-1:2005 Table 5.2"],
  },
  custom_b: {
    title: "Custom Flange Width b",
    method:
      "Flange width of custom section. Used in classification and resistance checks.",
    eurocodeClause: "EN 1993-1-1 Table 5.2 — Outstand flanges c/t ratios",
    references: ["EN 1993-1-1:2005 Table 5.2"],
  },
  custom_tw: {
    title: "Custom Web Thickness tw",
    method:
      "Web thickness affects shear resistance and section classification.",
    eurocodeClause: "EN 1993-1-1 §6.2.6 — Shear resistance",
    equation: "V_pl,Rd = A_v × (f_y / √3) / γ_M0",
    references: ["EN 1993-1-1:2005 §6.2.6"],
  },
  custom_tf: {
    title: "Custom Flange Thickness tf",
    method: "Flange thickness governs bending resistance and LTB capacity.",
    eurocodeClause: "EN 1993-1-1 Table 5.2 — Flange classification",
    references: ["EN 1993-1-1:2005"],
  },
  cover: {
    title: "Concrete Cover",
    method:
      "Minimum cover to reinforcement for durability and fire resistance.",
    eurocodeClause: "EN 1992-1-1 §4.4.1 — Minimum cover, c_min",
    equation: "c_nom = c_min + Δc_dev",
    assumptions: [
      "Δc_dev = 10mm unless otherwise specified",
      "Exposure class determines c_min,dur",
    ],
    references: ["EN 1992-1-1:2004 §4.4.1", "BS 8500-1 Table A.4"],
  },
  foundation_depth: {
    title: "Foundation Depth",
    method: "Depth below ground level to underside of foundation.",
    eurocodeClause: "EN 1997-1 §6.5.2.1 — Bearing resistance",
    assumptions: [
      "Frost depth considered",
      "No soft layers below founding level",
    ],
    references: ["EN 1997-1:2004"],
  },

  // ── Loads ───────────────────────────────────────────────────────────────
  dead_load_udl: {
    title: "Permanent Action (UDL)",
    method:
      "Uniformly distributed permanent (dead) loads including self-weight, finishes, partitions.",
    eurocodeClause: "EN 1991-1-1 §6.3 — Self-weight and imposed loads",
    assumptions: ["Concrete density 25 kN/m³", "Steel density 78.5 kN/m³"],
    references: ["EN 1991-1-1:2002 Table A.1"],
  },
  live_load_udl: {
    title: "Variable Action (UDL)",
    method:
      "Uniformly distributed variable (live) loads — occupancy, storage, traffic.",
    eurocodeClause: "EN 1991-1-1 §6.3.1 — Imposed loads on floors",
    assumptions: ["Category of use determines characteristic value"],
    references: ["EN 1991-1-1:2002 Table 6.2", "UK NA Table NA.3"],
  },
  dead_load_point: {
    title: "Permanent Point Load",
    method: "Concentrated permanent load applied at a specific location.",
    eurocodeClause: "EN 1991-1-1 §6.3",
    references: ["EN 1991-1-1:2002"],
  },
  live_load_point: {
    title: "Variable Point Load",
    method: "Concentrated variable load — equipment, machinery, heavy plant.",
    eurocodeClause: "EN 1991-1-1 §6.3.1.2 — Concentrated loads",
    references: ["EN 1991-1-1:2002 Table 6.2"],
  },
  point_load_position: {
    title: "Point Load Position",
    method:
      "Location of the concentrated load as a fraction of the span from the left support.",
    assumptions: ["Critical position at midspan for simply supported beams"],
    references: ["EN 1993-1-1:2005 §5.4"],
  },
  wind_load: {
    title: "Wind Action",
    method:
      "Characteristic wind pressure based on location, terrain, and building geometry.",
    eurocodeClause: "EN 1991-1-4 §5 — Wind pressure on surfaces",
    equation: "w_k = q_p(z) × c_pe",
    assumptions: [
      "10-min mean wind velocity",
      "Terrain category defines roughness",
    ],
    references: ["EN 1991-1-4:2005", "UK NA to EN 1991-1-4"],
  },
  axial_load: {
    title: "Axial Force",
    method: "Design axial compression or tension force in the member.",
    eurocodeClause: "EN 1993-1-1 §6.2.4 — Compression resistance",
    equation: "N_c,Rd = A × f_y / γ_M0",
    references: ["EN 1993-1-1:2005 §6.2.3–6.2.4"],
  },
  bending_moment: {
    title: "Bending Moment",
    method: "Design bending moment at the critical section.",
    eurocodeClause: "EN 1993-1-1 §6.2.5 — Bending resistance",
    equation: "M_c,Rd = W_pl × f_y / γ_M0  (Class 1 or 2)",
    references: ["EN 1993-1-1:2005 §6.2.5"],
  },
  shear_force: {
    title: "Shear Force",
    method: "Design shear force at the critical section.",
    eurocodeClause: "EN 1993-1-1 §6.2.6 — Shear resistance",
    equation: "V_pl,Rd = A_v × (f_y / √3) / γ_M0",
    references: ["EN 1993-1-1:2005 §6.2.6"],
  },

  // ── Material Properties ─────────────────────────────────────────────────
  steel_grade: {
    title: "Steel Grade",
    method:
      "Yield strength depends on steel grade and flange thickness per EN 10025.",
    eurocodeClause: "EN 1993-1-1 §3.2 — Steel grades",
    assumptions: ["f_y reduces for tf > 16mm or 40mm per EN 10025-2 Table 7"],
    references: ["EN 10025-2:2019", "EN 1993-1-1:2005 Table 3.1"],
  },
  concrete_grade: {
    title: "Concrete Strength Class",
    method: "Characteristic cylinder compressive strength f_ck.",
    eurocodeClause: "EN 1992-1-1 §3.1 — Concrete strength classes",
    equation: "f_cd = α_cc × f_ck / γ_C",
    assumptions: [
      "α_cc = 0.85 (UK NA)",
      "Cylinder strength = 0.8 × cube strength",
    ],
    references: ["EN 1992-1-1:2004 Table 3.1", "UK NA to EN 1992-1-1"],
  },
  fck: {
    title: "Characteristic Concrete Strength (f_ck)",
    method: "Characteristic compressive cylinder strength at 28 days.",
    eurocodeClause: "EN 1992-1-1 §3.1.2 — f_ck values",
    equation: "f_cd = α_cc × f_ck / γ_C  (α_cc = 0.85 UK)",
    references: ["EN 1992-1-1:2004 Table 3.1"],
  },
  fy: {
    title: "Yield Strength (f_y)",
    method:
      "Characteristic yield strength of steel reinforcement or structural steel.",
    eurocodeClause: "EN 1992-1-1 §3.2 (rebar) / EN 1993-1-1 §3.2 (structural)",
    assumptions: ["f_yk = 500 MPa for B500B/C reinforcement"],
    references: ["EN 1992-1-1:2004 §3.2", "EN 10080:2005"],
  },
  rebar_grade: {
    title: "Reinforcement Grade",
    method: "Characteristic yield strength of reinforcing steel.",
    eurocodeClause: "EN 1992-1-1 §3.2.2 — Reinforcing steel",
    assumptions: [
      "B500B: f_yk = 500 MPa, ductility class B",
      "B500C: f_yk = 500 MPa, ductility class C",
    ],
    references: ["EN 1992-1-1:2004 §3.2", "BS 4449:2005"],
  },

  // ── Partial Safety Factors ──────────────────────────────────────────────
  gamma_g: {
    title: "Partial Factor γ_G (Permanent)",
    method: "Partial safety factor for permanent actions.",
    eurocodeClause:
      "EN 1990 Table A1.2(A) — γ_G = 1.35 unfavourable, 1.0 favourable",
    equation: "E_d = γ_G × G_k + γ_Q × Q_k,1 + Σ(γ_Q × ψ_0,i × Q_k,i)",
    assumptions: ["STR/GEO limit state", "Expression 6.10 or 6.10a/b"],
    references: ["EN 1990:2002 Table A1.2(A)", "UK NA to EN 1990"],
  },
  gamma_q: {
    title: "Partial Factor γ_Q (Variable)",
    method: "Partial safety factor for variable actions.",
    eurocodeClause: "EN 1990 Table A1.2(A) — γ_Q = 1.5",
    assumptions: [
      "Applied to leading variable action",
      "Combination factor ψ_0 for accompanying actions",
    ],
    references: ["EN 1990:2002 Table A1.2(A)"],
  },
  gamma_m0: {
    title: "Partial Factor γ_M0",
    method:
      "Resistance factor for cross-section resistance (yielding, local buckling).",
    eurocodeClause: "EN 1993-1-1 §6.1 — γ_M0 = 1.00 (UK NA)",
    references: ["EN 1993-1-1:2005 §6.1", "UK NA: γ_M0 = 1.00"],
  },
  gamma_m1: {
    title: "Partial Factor γ_M1",
    method: "Resistance factor for member stability (buckling).",
    eurocodeClause: "EN 1993-1-1 §6.1 — γ_M1 = 1.00 (UK NA)",
    references: ["EN 1993-1-1:2005 §6.1", "UK NA: γ_M1 = 1.00"],
  },
  gamma_m2: {
    title: "Partial Factor γ_M2",
    method:
      "Resistance factor for connection resistance (net section, bolts, welds).",
    eurocodeClause: "EN 1993-1-1 §6.1 — γ_M2 = 1.25 (UK NA)",
    references: ["EN 1993-1-1:2005 §6.1", "UK NA: γ_M2 = 1.25"],
  },
  gamma_c: {
    title: "Partial Factor γ_C (Concrete)",
    method: "Partial safety factor for concrete material properties.",
    eurocodeClause:
      "EN 1992-1-1 Table 2.1N — γ_C = 1.50 (persistent/transient)",
    references: ["EN 1992-1-1:2004 Table 2.1N"],
  },
  gamma_s: {
    title: "Partial Factor γ_S (Reinforcement)",
    method: "Partial safety factor for reinforcing steel.",
    eurocodeClause: "EN 1992-1-1 Table 2.1N — γ_S = 1.15",
    references: ["EN 1992-1-1:2004 Table 2.1N"],
  },

  // ── Deflection & Serviceability ─────────────────────────────────────────
  deflection_limit: {
    title: "Deflection Limit (L/xxx)",
    method: "Maximum allowable deflection expressed as a fraction of span.",
    eurocodeClause: "EN 1993-1-1 §7.2 — Vertical deflection limits",
    assumptions: [
      "L/360 typical for beams supporting brittle finishes",
      "L/200 for total deflection",
    ],
    references: ["EN 1993-1-1:2005 §7.2.1", "UK NA Table NA.4"],
  },

  // ── Connections ─────────────────────────────────────────────────────────
  bolt_diameter: {
    title: "Bolt Diameter",
    method: "Nominal diameter of structural bolts.",
    eurocodeClause: "EN 1993-1-8 §3.6 — Bolt design",
    references: ["EN 1993-1-8:2005 Table 3.1", "EN 14399 (preloaded bolts)"],
  },
  bolt_grade: {
    title: "Bolt Grade",
    method: "Bolt property class (e.g. 8.8, 10.9) defines f_ub and f_yb.",
    eurocodeClause: "EN 1993-1-8 §3.6.1 — Bolt strengths",
    equation: "f_ub = grade × 100 MPa (e.g. 8.8 → f_ub = 800 MPa)",
    references: ["EN 1993-1-8:2005 Table 3.1"],
  },
  weld_size: {
    title: "Weld Throat Thickness",
    method: "Effective throat dimension of fillet weld.",
    eurocodeClause: "EN 1993-1-8 §4.5.3 — Fillet weld design",
    equation: "F_w,Rd = a × L_eff × f_vw,d",
    assumptions: ["Minimum weld size depends on thicker plate per Table 4.1"],
    references: ["EN 1993-1-8:2005 §4.5", "SCI P363"],
  },
  end_distance: {
    title: "End Distance",
    method:
      "Distance from bolt centre to end of plate in the direction of load.",
    eurocodeClause: "EN 1993-1-8 Table 3.3 — Minimum/maximum distances",
    equation: "e₁ ≥ 1.2 × d₀",
    assumptions: ["d₀ = bolt hole diameter"],
    references: ["EN 1993-1-8:2005 Table 3.3"],
  },
  edge_distance: {
    title: "Edge Distance",
    method: "Distance from bolt centre to edge of plate perpendicular to load.",
    eurocodeClause: "EN 1993-1-8 Table 3.3 — Minimum/maximum distances",
    equation: "e₂ ≥ 1.2 × d₀",
    references: ["EN 1993-1-8:2005 Table 3.3"],
  },
  bolt_spacing: {
    title: "Bolt Gauge / Pitch",
    method: "Centre-to-centre distance between bolts.",
    eurocodeClause: "EN 1993-1-8 Table 3.3 — Minimum spacing",
    equation: "p₁ ≥ 2.2 × d₀, p₂ ≥ 2.4 × d₀",
    references: ["EN 1993-1-8:2005 Table 3.3"],
  },
  plate_thickness: {
    title: "Plate Thickness",
    method: "Thickness of end plate or splice plate in connection.",
    eurocodeClause: "EN 1993-1-8 §6.2 — Design resistance of connections",
    references: ["EN 1993-1-8:2005"],
  },

  // ── Foundations ──────────────────────────────────────────────────────────
  bearing_capacity: {
    title: "Bearing Capacity",
    method: "Ultimate bearing capacity of soil beneath footing.",
    eurocodeClause: "EN 1997-1 §6.5.2 — Bearing resistance",
    equation:
      "R/A′ = c′ × N_c × b_c × s_c × i_c + q′ × N_q × b_q × s_q × i_q + 0.5 × γ′ × B′ × N_γ × b_γ × s_γ × i_γ",
    assumptions: [
      "Drained or undrained depending on soil type and loading rate",
    ],
    references: ["EN 1997-1:2004 Annex D", "BS 8004:2015"],
  },
  soil_bearing_pressure: {
    title: "Allowable Bearing Pressure",
    method: "Safe bearing pressure with factor of safety applied.",
    eurocodeClause: "EN 1997-1 §2.4.7 — GEO limit state",
    assumptions: ["Typically FoS = 3.0 for working stress design"],
    references: ["EN 1997-1:2004", "BS 8004:2015"],
  },
  pile_diameter: {
    title: "Pile Diameter",
    method: "Nominal diameter of bored or driven pile.",
    eurocodeClause: "EN 1997-1 §7 — Pile foundations",
    references: ["EN 1997-1:2004 §7", "CIRIA C760"],
  },
  pile_length: {
    title: "Pile Length",
    method: "Length of pile from cut-off level to toe.",
    eurocodeClause: "EN 1997-1 §7.6 — Pile resistance",
    assumptions: [
      "Pile penetrates past soft strata into competent bearing stratum",
    ],
    references: ["EN 1997-1:2004 §7.6"],
  },

  // ── Retaining Walls ─────────────────────────────────────────────────────
  wall_height: {
    title: "Retaining Wall Height",
    method: "Height of retained soil from base to top of wall.",
    eurocodeClause: "EN 1997-1 §9 — Retaining structures",
    references: ["EN 1997-1:2004 §9", "CIRIA C760"],
  },
  surcharge: {
    title: "Surcharge Load",
    method:
      "Uniform distributed load on retained ground surface from traffic, storage, etc.",
    eurocodeClause: "EN 1997-1 §9.5 — Design of retaining structures",
    assumptions: [
      "Typically 10 kPa for general use, 20 kPa for vehicle loading",
    ],
    references: ["EN 1997-1:2004", "HA 68/94 (highway surcharge)"],
  },
  Ka: {
    title: "Active Earth Pressure Coefficient",
    method: "Ratio of horizontal to vertical effective stress in active state.",
    eurocodeClause: "EN 1997-1 §9.5.2 — Earth pressures",
    equation: "K_a = (1 − sinφ′) / (1 + sinφ′)  (Rankine)",
    assumptions: [
      "Smooth vertical wall",
      "Horizontal retained surface",
      "Coulomb's theory if wall friction included",
    ],
    references: ["EN 1997-1:2004 Annex C"],
  },
  Kp: {
    title: "Passive Earth Pressure Coefficient",
    method:
      "Ratio of horizontal to vertical effective stress in passive state.",
    eurocodeClause: "EN 1997-1 §9.5.2 — Earth pressures",
    equation: "K_p = (1 + sinφ′) / (1 − sinφ′)  (Rankine)",
    references: ["EN 1997-1:2004 Annex C"],
  },
  friction_angle: {
    title: "Effective Friction Angle (φ')",
    method: "Peak effective angle of shearing resistance of soil.",
    eurocodeClause:
      "EN 1997-1 §2.4.5 — Characteristic values of geotechnical parameters",
    assumptions: ["Derived from triaxial or SPT correlation"],
    references: ["EN 1997-1:2004 §2.4.5", "EN 1997-2:2007"],
  },
  cohesion: {
    title: "Effective Cohesion (c')",
    method: "Effective cohesion intercept of soil.",
    eurocodeClause: "EN 1997-1 §2.4.5",
    assumptions: [
      "c′ = 0 for granular soils",
      "Use undrained shear strength c_u for short-term clay analysis",
    ],
    references: ["EN 1997-1:2004"],
  },

  // ── RC Design ───────────────────────────────────────────────────────────
  bar_diameter: {
    title: "Reinforcement Bar Diameter",
    method: "Nominal diameter of main tension or compression reinforcement.",
    eurocodeClause: "EN 1992-1-1 §8 — Detailing of reinforcement",
    references: ["EN 1992-1-1:2004 §8", "BS 4449:2005"],
  },
  bar_spacing: {
    title: "Reinforcement Spacing",
    method: "Centre-to-centre distance between reinforcing bars.",
    eurocodeClause: "EN 1992-1-1 §9.3.1.1 — Minimum/maximum spacing",
    assumptions: ["Min spacing ≥ max(bar dia, 20mm, d_g + 5mm)"],
    references: ["EN 1992-1-1:2004 §8.2"],
  },
  effective_depth: {
    title: "Effective Depth (d)",
    method:
      "Distance from extreme compression fibre to centroid of tension reinforcement.",
    eurocodeClause: "EN 1992-1-1 §6.1 — Bending",
    equation: "d = h − c_nom − φ_link − φ_bar/2",
    references: ["EN 1992-1-1:2004"],
  },

  // ── Composite Design ────────────────────────────────────────────────────
  slab_depth: {
    title: "Concrete Slab Depth",
    method: "Overall depth of composite slab above steel decking.",
    eurocodeClause: "EN 1994-1-1 §9.2 — Composite slabs",
    assumptions: ["Minimum depth typically 130mm for fire resistance"],
    references: ["EN 1994-1-1:2004 §9.2"],
  },
  stud_diameter: {
    title: "Shear Stud Diameter",
    method: "Diameter of headed shear stud connector.",
    eurocodeClause: "EN 1994-1-1 §6.6.3 — Stud connectors",
    equation:
      "P_Rd = min(0.8 × f_u × π × d²/4 / γ_V, 0.29 × α × d² × √(f_ck × E_cm) / γ_V)",
    assumptions: ["Through-deck welding reduces capacity (k_t factor)"],
    references: ["EN 1994-1-1:2004 §6.6.3.1"],
  },
  stud_height: {
    title: "Shear Stud Height",
    method: "Overall height of headed stud after welding.",
    eurocodeClause: "EN 1994-1-1 §6.6.3 — Stud height ≥ 3d",
    assumptions: ["Minimum height 3× stud diameter"],
    references: ["EN 1994-1-1:2004"],
  },
  degree_of_shear_connection: {
    title: "Degree of Shear Connection",
    method:
      "Ratio of actual to full shear connection (η). Partial interaction reduces moment resistance.",
    eurocodeClause: "EN 1994-1-1 §6.6.1.2 — Minimum degree of shear connection",
    equation: "η = n/n_f  where n_f = N_c / P_Rd",
    assumptions: [
      "Minimum η depends on span and steel grade",
      "η_min ≥ 1 − (355/f_y)(0.75 − 0.03L_e) for L_e ≤ 25m",
    ],
    references: ["EN 1994-1-1:2004 §6.6.1.2"],
  },

  // ── Bridge-Specific ─────────────────────────────────────────────────────
  deck_width: {
    title: "Deck Width",
    method: "Overall width of bridge deck between parapets.",
    eurocodeClause: "EN 1991-2 §4 — Traffic loads on bridges",
    references: ["EN 1991-2:2003", "CD 377 (DMRB)"],
  },
  notional_lane_width: {
    title: "Notional Lane Width",
    method: "Width of notional lane for load model application.",
    eurocodeClause: "EN 1991-2 §4.2.3 — Division into notional lanes",
    equation: "w_l = 3.0m for w ≥ 6.0m",
    references: ["EN 1991-2:2003 Table 4.1"],
  },

  // ── Temporary Works ─────────────────────────────────────────────────────
  bearing_pressure: {
    title: "Ground Bearing Pressure",
    method: "Applied contact pressure from temporary works on ground.",
    eurocodeClause: "BS 5975 §15 — Falsework",
    assumptions: [
      "Ground investigation should confirm capacity",
      "Consider softening from water",
    ],
    references: ["BS 5975:2019", "CIRIA C580"],
  },
  mat_thickness: {
    title: "Mat / Timber Thickness",
    method: "Thickness of bog mat, track mat, or timber sole plate.",
    assumptions: [
      "Grade C24 softwood or hardwood mat",
      "Section properties per BS EN 338",
    ],
    references: ["BS EN 338:2016", "BS 5975:2019"],
  },

  // ── Pier & Substructure ─────────────────────────────────────────────────
  height: {
    title: "Element Height",
    method: "Overall height of the structural element.",
    references: ["EN 1992-1-1:2004"],
  },
  pier_height: {
    title: "Pier Height",
    method: "Height from foundation top to bearing shelf.",
    eurocodeClause: "EN 1992-2 §5 — Structural analysis of bridge piers",
    references: ["EN 1992-2:2005"],
  },
  pier_width: {
    title: "Pier Width",
    method: "Transverse width of pier cross-section.",
    references: ["EN 1992-2:2005"],
  },
  pier_thickness: {
    title: "Pier Thickness",
    method: "Longitudinal thickness of pier cross-section.",
    references: ["EN 1992-2:2005"],
  },
  pier_foundation_depth: {
    title: "Pier Foundation Depth",
    method: "Depth from ground level to underside of pier foundation.",
    eurocodeClause: "EN 1997-1 §6.5 — Spread foundations",
    references: ["EN 1997-1:2004"],
  },
  scour_depth: {
    title: "Scour Depth",
    method: "Maximum expected scour depth at pier location.",
    eurocodeClause: "EN 1991-1-6 — Actions during execution",
    references: ["CIRIA C742", "CD 356 (DMRB)"],
  },
  water_depth: {
    title: "Water Depth",
    method: "Normal water depth at pier location.",
    references: ["CD 356 (DMRB)"],
  },

  // ── Grillage & Analysis ─────────────────────────────────────────────────
  span_length: {
    title: "Span Length",
    method: "Distance between support centrelines.",
    eurocodeClause: "EN 1993-1-1 §5.4 — Effective span",
    references: ["EN 1993-1-1:2005"],
  },
  deck_type: {
    title: "Deck Type",
    method: "Bridge deck construction type (concrete, steel, composite).",
    references: ["EN 1994-2:2005"],
  },
  dynamic_factor: {
    title: "Dynamic Amplification Factor",
    method: "Factor to account for dynamic effects of traffic loading.",
    eurocodeClause: "EN 1991-2 §4.6 — Dynamic effects",
    equation: "φ = 1 + α × D / (1 + D)",
    references: ["EN 1991-2:2003 §4.6", "PD 6688-2"],
  },

  // ── End Plate & Connections ─────────────────────────────────────────────
  end_plate_thickness: {
    title: "End Plate Thickness",
    method: "Thickness of the end plate connection.",
    eurocodeClause: "EN 1993-1-8 §6.2.6 — End plate connections",
    references: ["EN 1993-1-8:2005", "SCI P398"],
  },
  end_plate_width: {
    title: "End Plate Width",
    method: "Width of end plate, typically wider than beam flange.",
    references: ["SCI P398"],
  },
  end_plate_depth: {
    title: "End Plate Depth",
    method: "Depth of end plate.",
    references: ["SCI P398"],
  },

  // ── LTB & Buckling ─────────────────────────────────────────────────────
  slenderness: {
    title: "Slenderness Ratio",
    method: "Non-dimensional slenderness for column or LTB checks.",
    eurocodeClause: "EN 1993-1-1 §6.3.1 — Uniform members in compression",
    equation: "λ̄ = √(A·fy / Ncr)",
    references: ["EN 1993-1-1:2005 §6.3.1"],
  },
  buckling_curve: {
    title: "Buckling Curve",
    method:
      "Selection of appropriate buckling curve (a, b, c, d) based on section type.",
    eurocodeClause: "EN 1993-1-1 §6.3.1.2 Table 6.2",
    references: ["EN 1993-1-1:2005 Table 6.2"],
  },
  moment_gradient: {
    title: "Moment Gradient Factor",
    method:
      "Factor accounting for non-uniform bending moment distribution in LTB.",
    eurocodeClause: "EN 1993-1-1 §6.3.2.2",
    equation: "C₁ depends on loading and support conditions",
    references: ["EN 1993-1-1:2005 §6.3.2.2", "SCI P362"],
  },

  // ── Punching Shear ──────────────────────────────────────────────────────
  column_dimension_x: {
    title: "Column Dimension (x)",
    method: "Column width in x-direction for punching perimeter calculation.",
    eurocodeClause:
      "EN 1992-1-1 §6.4.2 — Load distribution and basic control perimeter",
    references: ["EN 1992-1-1:2004 §6.4"],
  },
  column_dimension_y: {
    title: "Column Dimension (y)",
    method: "Column depth in y-direction for punching perimeter calculation.",
    references: ["EN 1992-1-1:2004 §6.4"],
  },
  effective_depth_punching: {
    title: "Effective Depth",
    method: "Average effective depth d = (dx + dy) / 2 for punching.",
    eurocodeClause: "EN 1992-1-1 §6.4.4",
    equation: "d_eff = (d_x + d_y) / 2",
    references: ["EN 1992-1-1:2004 §6.4.4"],
  },

  // ── Weld Design ─────────────────────────────────────────────────────────
  weld_type: {
    title: "Weld Type",
    method: "Fillet weld or butt weld selection.",
    eurocodeClause: "EN 1993-1-8 §4.5 — Fillet welds",
    references: ["EN 1993-1-8:2005 §4.5", "SCI P363"],
  },
  throat_thickness: {
    title: "Effective Throat Thickness",
    method: "Throat thickness of fillet weld for resistance calculation.",
    eurocodeClause: "EN 1993-1-8 §4.5.2",
    equation: "a = 0.7 × leg length (for equal leg fillet)",
    references: ["EN 1993-1-8:2005 §4.5.2"],
  },
  weld_length: {
    title: "Weld Length",
    method: "Effective length of weld run.",
    eurocodeClause: "EN 1993-1-8 §4.5.1",
    assumptions: ["Effective length excludes end craters (2a deduction)"],
    references: ["EN 1993-1-8:2005 §4.5.1"],
  },

  // ── Timber ──────────────────────────────────────────────────────────────
  grade_class: {
    title: "Timber Strength Class",
    method: "Strength class designation (e.g., C24, D30, GL28h).",
    eurocodeClause: "EN 338 — Structural timber strength classes",
    references: ["EN 338:2016", "EN 1995-1-1:2004"],
  },
  service_class: {
    title: "Service Class",
    method: "Moisture condition class affecting timber properties (1, 2 or 3).",
    eurocodeClause: "EN 1995-1-1 §2.3.1.3 — Service classes",
    assumptions: [
      "Class 1: heated interior, MC ≤ 12%",
      "Class 2: sheltered exterior, MC ≤ 20%",
      "Class 3: exposed, MC > 20%",
    ],
    references: ["EN 1995-1-1:2004 §2.3.1.3"],
  },
  load_duration: {
    title: "Load Duration Class",
    method: "Duration of load application affecting kmod factor.",
    eurocodeClause: "EN 1995-1-1 §2.3.1.2 — Load-duration classes",
    references: ["EN 1995-1-1:2004 Table 2.1"],
  },
  kmod: {
    title: "Modification Factor kmod",
    method:
      "Factor for load duration and service class effects on timber strength.",
    eurocodeClause: "EN 1995-1-1 §3.1.3",
    equation: "f_d = kmod × f_k / γ_M",
    references: ["EN 1995-1-1:2004 Table 3.1"],
  },

  // ── Slope Stability & Geotechnics ──────────────────────────────────────
  effective_cohesion: {
    title: "Effective Cohesion (c')",
    method: "Effective cohesion intercept from Mohr-Coulomb failure criterion.",
    eurocodeClause: "EN 1997-1 §2.4.5 — Partial factors for soil parameters",
    references: ["EN 1997-1:2004"],
  },
  phi: {
    title: "Angle of Internal Friction (φ')",
    method: "Effective angle of shearing resistance.",
    eurocodeClause: "EN 1997-1 §2.4.5",
    references: ["EN 1997-1:2004", "BS 8002:2015"],
  },
  slope_angle: {
    title: "Slope Angle",
    method: "Inclination of slope face from horizontal.",
    references: ["EN 1997-1:2004", "CIRIA C580"],
  },
  unit_weight: {
    title: "Unit Weight (γ)",
    method: "Bulk unit weight of soil.",
    assumptions: ["γbulk typically 18-20 kN/m³, γsat 20-22 kN/m³"],
    references: ["EN 1997-1:2004"],
  },
  retaining_wall_height: {
    title: "Retaining Wall Height",
    method: "Height of retained soil from base to top of wall.",
    eurocodeClause: "EN 1997-1 §9 — Retaining structures",
    references: ["EN 1997-1:2004 §9", "BS 8002:2015"],
  },
  surcharge_load: {
    title: "Surcharge Loading",
    method: "Uniformly distributed load applied at ground surface behind wall.",
    eurocodeClause: "EN 1991-1-1 §6.3.2 — Imposed loads",
    assumptions: ["Typically 10 kN/m² for highway, 5 kN/m² for footway"],
    references: ["EN 1991-1-1:2002", "PD 6694-1"],
  },

  // ── Excavation & Shoring ───────────────────────────────────────────────
  excavation_depth: {
    title: "Excavation Depth",
    method: "Depth of excavation below existing ground level.",
    eurocodeClause: "BS 5975 §17 — Excavation support",
    references: ["BS 5975:2019", "CIRIA C760"],
  },
  prop_spacing: {
    title: "Prop Spacing",
    method: "Horizontal spacing between temporary props.",
    references: ["BS 5975:2019", "CIRIA C517"],
  },

  // ── Formwork & Falsework ───────────────────────────────────────────────
  pour_rate: {
    title: "Concrete Pour Rate",
    method: "Rate of rise of concrete during placement (m/hr).",
    eurocodeClause: "EN 12812 §6 — Actions",
    equation: "P = ρ·g·h for hydrostatic pressure",
    references: ["EN 12812:2008", "CIRIA R108"],
  },
  pour_height: {
    title: "Pour Height",
    method: "Maximum height of concrete pour.",
    references: ["EN 12812:2008", "CIRIA R108"],
  },
  concrete_temperature: {
    title: "Concrete Temperature",
    method:
      "Temperature of fresh concrete at placement — affects formwork pressure.",
    eurocodeClause: "EN 12812 §6.3",
    references: ["CIRIA R108", "Concrete Society"],
  },

  // ── Sling & Lifting ────────────────────────────────────────────────────
  sling_angle: {
    title: "Sling Angle",
    method: "Angle of sling from vertical. Affects sling load factor.",
    equation: "F_sling = W / (n × cos θ)",
    assumptions: [
      "Never use slings at angles > 60° from vertical",
      "Factor increases rapidly above 45°",
    ],
    references: ["BS 8437:2005", "LOLER 1998"],
  },
  sling_wll: {
    title: "Safe Working Load (SWL / WLL)",
    method: "Working Load Limit of sling assembly.",
    references: ["BS 8437:2005", "LOLER 1998"],
  },
  lift_weight: {
    title: "Lift Weight",
    method: "Total weight of lifted load including rigging.",
    assumptions: ["Include weight of rigging, slings, and spreader beams"],
    references: ["BS 7121-1:2016"],
  },

  // ── Traffic & Wind Actions ──────────────────────────────────────────────
  basic_wind_speed: {
    title: "Basic Wind Speed",
    method: "Fundamental value of basic wind velocity vb,0.",
    eurocodeClause: "EN 1991-1-4 §4.2 — Basic values",
    equation: "vb = cdir × cseason × vb,0",
    references: ["EN 1991-1-4:2005", "NA to BS EN 1991-1-4"],
  },
  terrain_category: {
    title: "Terrain Category",
    method: "Classification of terrain roughness affecting wind profile.",
    eurocodeClause: "EN 1991-1-4 §4.3.2 — Terrain categories",
    references: ["EN 1991-1-4:2005 Table 4.1"],
  },
  orography_factor: {
    title: "Orography Factor",
    method: "Factor accounting for increased wind speed over hills and cliffs.",
    eurocodeClause: "EN 1991-1-4 §4.3.3",
    references: ["EN 1991-1-4:2005 §4.3.3", "NA to BS EN 1991-1-4"],
  },
  altitude: {
    title: "Site Altitude",
    method: "Altitude of site above mean sea level.",
    eurocodeClause: "NA to BS EN 1991-1-4 §NA.2.4",
    references: ["NA to BS EN 1991-1-4:2005+A1:2010"],
  },

  // ── Thermal Actions ─────────────────────────────────────────────────────
  thermal_coefficient: {
    title: "Coefficient of Thermal Expansion",
    method: "Linear expansion coefficient for the material.",
    eurocodeClause:
      "EN 1991-1-5 §6 — Temperature changes in structural elements",
    equation: "ΔL = α × L × ΔT",
    references: ["EN 1991-1-5:2003"],
  },
  temperature_range: {
    title: "Temperature Range",
    method:
      "Difference between maximum and minimum effective bridge temperatures.",
    eurocodeClause: "EN 1991-1-5 §6.1.3 — Range of uniform bridge temperature",
    references: ["EN 1991-1-5:2003", "NA to BS EN 1991-1-5"],
  },

  // ── Spread Footings & Strip ─────────────────────────────────────────────
  footing_length: {
    title: "Footing Length",
    method: "Length of rectangular spread footing.",
    eurocodeClause: "EN 1997-1 §6.5 — Spread foundations",
    references: ["EN 1997-1:2004"],
  },
  footing_width: {
    title: "Footing Width",
    method: "Width of rectangular spread footing (B).",
    eurocodeClause: "EN 1997-1 §6.5.2 — Bearing resistance",
    references: ["EN 1997-1:2004"],
  },
  footing_depth: {
    title: "Footing Depth",
    method: "Thickness of footing for flexural and punching design.",
    references: ["EN 1992-1-1:2004"],
  },

  // ── Geogrid & MSE ──────────────────────────────────────────────────────
  geogrid_strength: {
    title: "Geogrid Tensile Strength",
    method: "Characteristic short-term tensile strength of geogrid.",
    references: ["BS 8006-1:2010 §6.6.4"],
  },
  reinforcement_length: {
    title: "Reinforcement Length",
    method: "Embedment length of geogrid reinforcement behind wall face.",
    eurocodeClause: "BS 8006-1 §6.6 — Internal stability",
    assumptions: ["Minimum 0.7H or 3m, whichever is greater"],
    references: ["BS 8006-1:2010"],
  },

  // ── Hoarding & Temporary Barriers ──────────────────────────────────────
  hoarding_height: {
    title: "Hoarding Height",
    method: "Height of site hoarding above ground level.",
    references: ["BS 5975:2019", "CDM 2015"],
  },
  wind_pressure: {
    title: "Wind Pressure on Hoarding",
    method: "Design wind pressure for temporary structures.",
    eurocodeClause: "EN 1991-1-4 §7 — Wind pressure on structures",
    assumptions: [
      "Use 50-year return period for permanent, 2-year for temporary < 2 years",
    ],
    references: ["EN 1991-1-4:2005", "BS 5975:2019"],
  },

  // ── Guardrails & Edge Protection ───────────────────────────────────────
  guardrail_height: {
    title: "Guardrail Height",
    method: "Height of guardrail above finished deck/floor level.",
    assumptions: ["Minimum 1100mm for vehicular, 1000mm for pedestrian"],
    references: ["EN 1317-2:2010", "CD 377 (DMRB)"],
  },
  impact_load: {
    title: "Impact Load",
    method: "Horizontal force from vehicle impact on parapet/guardrail.",
    eurocodeClause: "EN 1991-2 §4.7 — Actions on parapets",
    references: ["EN 1317-2:2010", "PD 6688-2"],
  },

  // ── Raking Props & Propping ─────────────────────────────────────────────
  prop_load: {
    title: "Prop Axial Load",
    method: "Axial compression in temporary prop.",
    references: ["BS 5975:2019 §14"],
  },
  rake_angle: {
    title: "Rake Angle",
    method: "Angle of raking prop from horizontal.",
    assumptions: ["Optimal range 45°–60° from horizontal"],
    references: ["BS 5975:2019"],
  },

  // ── Needle Beam & Shoring ──────────────────────────────────────────────
  wall_thickness: {
    title: "Wall Thickness",
    method: "Thickness of existing wall to be supported.",
    references: ["BS 5975:2019 §20"],
  },
  opening_width: {
    title: "Opening Width",
    method: "Width of proposed opening in existing wall.",
    references: ["BS 5975:2019 §20"],
  },
  needle_spacing: {
    title: "Needle Beam Spacing",
    method: "Centre-to-centre spacing of needle beams.",
    references: ["BS 5975:2019"],
  },

  // ── Load Spread ─────────────────────────────────────────────────────────
  spread_angle: {
    title: "Load Spread Angle",
    method: "Angle of load dispersion through granular fill or concrete.",
    eurocodeClause: "EN 1997-1 §6.5.2.1 — Vertical bearing capacity",
    assumptions: [
      "Typically 1:1 (45°) through compacted granular fill",
      "1:2 (26.6°) through concrete",
    ],
    references: ["EN 1997-1:2004", "CIRIA C580"],
  },

  // ── Elastomeric Bearings ────────────────────────────────────────────────
  bearing_length: {
    title: "Bearing Plan Length",
    method: "Length of elastomeric bearing pad in plan.",
    eurocodeClause: "EN 1337-3 §5 — Elastomeric bearings",
    references: ["EN 1337-3:2005"],
  },
  bearing_width: {
    title: "Bearing Plan Width",
    method: "Width of elastomeric bearing pad in plan.",
    references: ["EN 1337-3:2005"],
  },
  bearing_thickness: {
    title: "Bearing Total Thickness",
    method: "Total thickness including rubber and steel reinforcing plates.",
    eurocodeClause: "EN 1337-3 §5.3.3 — Design rules for bearings",
    references: ["EN 1337-3:2005"],
  },
  shear_modulus: {
    title: "Shear Modulus (G)",
    method: "Shear modulus of elastomer material.",
    eurocodeClause: "EN 1337-3 §4.3.1",
    assumptions: ["Typically 0.7–1.15 MPa for standard elastomers"],
    references: ["EN 1337-3:2005 Table 1"],
  },

  // ── Movement Joints ─────────────────────────────────────────────────────
  joint_gap: {
    title: "Joint Gap Width",
    method: "Clear width of expansion/contraction joint.",
    eurocodeClause: "EN 1991-1-5 §6 — Thermal effects",
    references: ["EN 1991-1-5:2003", "BD 33 (DMRB)"],
  },
  movement_range: {
    title: "Movement Range",
    method: "Total anticipated movement at the joint location.",
    eurocodeClause: "EN 1991-1-5 §6.1.3",
    equation: "ΔL = α × L × (T_max − T_min)",
    references: ["EN 1991-1-5:2003"],
  },

  // ── Trench Support ──────────────────────────────────────────────────────
  trench_depth: {
    title: "Trench Depth",
    method: "Depth of excavation trench.",
    references: ["BS 6031:2009", "CIRIA R97"],
  },
  trench_width: {
    title: "Trench Width",
    method: "Width of excavation trench at formation level.",
    references: ["BS 6031:2009"],
  },

  // ── Erection & Lifting ─────────────────────────────────────────────────
  crane_capacity: {
    title: "Crane Capacity",
    method: "Maximum rated capacity of crane at specified radius.",
    references: ["BS 7121-1:2016", "LOLER 1998"],
  },
  crane_radius: {
    title: "Working Radius",
    method: "Horizontal distance from crane centre of rotation to hook.",
    references: ["BS 7121-1:2016"],
  },

  // ── Access Ramps ────────────────────────────────────────────────────────
  ramp_gradient: {
    title: "Ramp Gradient",
    method: "Inclination of access ramp as ratio or percentage.",
    assumptions: ["Max 1:10 for wheeled plant", "Max 1:5 for tracked plant"],
    references: ["BS 5975:2019", "CIRIA C703"],
  },
  ramp_width: {
    title: "Ramp Width",
    method: "Clear width of access ramp for plant movements.",
    assumptions: ["Minimum vehicle width + 600mm each side"],
    references: ["BS 5975:2019"],
  },
};

/**
 * Get explanation for a specific field.
 * Falls back to undefined if not found — consumers should check before rendering.
 */
export function getFieldExplanation(
  field: string,
): FieldExplanation | undefined {
  return fieldExplanations[field];
}

/**
 * Check if a field has an explanation available.
 */
export function hasFieldExplanation(field: string): boolean {
  return field in fieldExplanations;
}

export default fieldExplanations;
