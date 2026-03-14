// =============================================================================
// Centralised Eurocode Design Tables
// =============================================================================
// Canonical source for partial safety factors, combination factors,
// buckling curves, and EN code reference tables.
// Data sourced from:
//   - EN 1990 (Basis of structural design)
//   - EN 1991-1-1 to 1-7 (Actions on structures)
//   - EN 1993-1-1 (Steel structures — general rules)
//   - EN 1992-1-1 (Concrete structures)
//   - EN 1995-1-1 (Timber structures)
//   - UK National Annex values where applicable
//
// Usage:
//   import { PARTIAL_FACTORS, PSI_FACTORS, LOAD_COMBINATIONS } from '@/data/eurocodeTables';
// =============================================================================

// ---------------------------------------------------------------------------
// Partial Safety Factors — EN 1990 / UK NA
// ---------------------------------------------------------------------------

export interface PartialFactors {
  /** Material partial safety factor γM */
  [key: string]: number;
}

/** EN 1993-1-1 Table 6.1 — Steel partial factors (UK NA) */
export const GAMMA_STEEL: PartialFactors = {
  gamma_M0: 1.0, // Resistance of cross-sections
  gamma_M1: 1.0, // Resistance of members — instability
  gamma_M2: 1.25, // Resistance of cross-sections — tension fracture / bolts
  gamma_M3: 1.25, // Slip resistance at SLS (Category B)
  gamma_M3_ULS: 1.1, // Slip resistance at ULS (Category C)
  gamma_M5: 1.0, // Resistance of joints — welds
  gamma_M7: 1.1, // Preload of high-strength bolts
};

/** EN 1992-1-1 — Concrete partial factors (UK NA) */
export const GAMMA_CONCRETE: PartialFactors = {
  gamma_c: 1.5, // Concrete — persistent & transient
  gamma_c_acc: 1.2, // Concrete — accidental
  gamma_s: 1.15, // Reinforcing steel
  gamma_s_acc: 1.0, // Reinforcing steel — accidental
  alpha_cc: 0.85, // Long-term effects coefficient (UK NA value)
  alpha_ct: 1.0, // Tensile strength coefficient
};

/** EN 1995-1-1 — Timber partial factors */
export const GAMMA_TIMBER: PartialFactors = {
  gamma_M_solid: 1.3, // Solid timber
  gamma_M_glulam: 1.25, // Glued laminated timber
  gamma_M_lvl: 1.2, // LVL, plywood
  gamma_M_connections: 1.3, // Connections
};

// ---------------------------------------------------------------------------
// Load Partial Safety Factors — EN 1990 Table A1.2(B) / UK NA
// ---------------------------------------------------------------------------

export interface LoadFactor {
  /** Favourable */
  fav: number;
  /** Unfavourable */
  unfav: number;
}

/** Persistent & transient design situations — EQU (Set A) */
export const LOAD_FACTORS_EQU: Record<string, LoadFactor> = {
  permanent: { fav: 0.9, unfav: 1.1 },
  variable: { fav: 0.0, unfav: 1.5 },
  accidental: { fav: 1.0, unfav: 1.0 },
};

/** Persistent & transient design situations — STR/GEO (Set B) */
export const LOAD_FACTORS_STR: Record<string, LoadFactor> = {
  permanent: { fav: 1.0, unfav: 1.35 },
  variable: { fav: 0.0, unfav: 1.5 },
  accidental: { fav: 1.0, unfav: 1.0 },
};

/** Persistent & transient design situations — GEO (Set C, DA1-C2) */
export const LOAD_FACTORS_GEO: Record<string, LoadFactor> = {
  permanent: { fav: 1.0, unfav: 1.0 },
  variable: { fav: 0.0, unfav: 1.3 },
};

// ---------------------------------------------------------------------------
// ψ Combination Factors — EN 1990 Table A1.1 / UK NA
// ---------------------------------------------------------------------------

export interface PsiFactors {
  /** Description of action category */
  description: string;
  /** ψ0 — combination value */
  psi_0: number;
  /** ψ1 — frequent value */
  psi_1: number;
  /** ψ2 — quasi-permanent value */
  psi_2: number;
}

export const PSI_FACTORS: Record<string, PsiFactors> = {
  cat_A: {
    description: "Domestic / residential (Cat A)",
    psi_0: 0.7,
    psi_1: 0.5,
    psi_2: 0.3,
  },
  cat_B: {
    description: "Office (Cat B)",
    psi_0: 0.7,
    psi_1: 0.5,
    psi_2: 0.3,
  },
  cat_C: {
    description: "Congregation areas (Cat C)",
    psi_0: 0.7,
    psi_1: 0.7,
    psi_2: 0.6,
  },
  cat_D: {
    description: "Shopping / retail (Cat D)",
    psi_0: 0.7,
    psi_1: 0.7,
    psi_2: 0.6,
  },
  cat_E: {
    description: "Storage (Cat E)",
    psi_0: 1.0,
    psi_1: 0.9,
    psi_2: 0.8,
  },
  cat_F: {
    description: "Traffic ≤ 30 kN (Cat F)",
    psi_0: 0.7,
    psi_1: 0.7,
    psi_2: 0.6,
  },
  cat_G: {
    description: "Traffic 30–160 kN (Cat G)",
    psi_0: 0.7,
    psi_1: 0.5,
    psi_2: 0.3,
  },
  cat_H: {
    description: "Roofs — inaccessible (Cat H)",
    psi_0: 0.7,
    psi_1: 0.0,
    psi_2: 0.0,
  },
  snow_alt_below_1000: {
    description: "Snow — altitude ≤ 1000m",
    psi_0: 0.5,
    psi_1: 0.2,
    psi_2: 0.0,
  },
  snow_alt_above_1000: {
    description: "Snow — altitude > 1000m",
    psi_0: 0.7,
    psi_1: 0.5,
    psi_2: 0.2,
  },
  wind: {
    description: "Wind",
    psi_0: 0.5,
    psi_1: 0.2,
    psi_2: 0.0,
  },
  temperature: {
    description: "Temperature (non-fire)",
    psi_0: 0.6,
    psi_1: 0.5,
    psi_2: 0.0,
  },
  construction: {
    description: "Construction loads",
    psi_0: 1.0,
    psi_1: 0.9,
    psi_2: 0.0,
  },
};

// ---------------------------------------------------------------------------
// Standard Load Combination Expressions — EN 1990 §6.4.3
// ---------------------------------------------------------------------------

export interface LoadCombination {
  /** Combination name for display */
  name: string;
  /** EN 1990 equation reference */
  equation: string;
  /** Limit state type */
  limitState: "ULS" | "SLS" | "Accidental" | "Seismic";
  /** Expression template */
  expression: string;
}

export const LOAD_COMBINATIONS: LoadCombination[] = [
  {
    name: "ULS — STR/GEO (Eq. 6.10)",
    equation: "6.10",
    limitState: "ULS",
    expression: "Σ γG,j Gk,j + γQ,1 Qk,1 + Σ γQ,i ψ0,i Qk,i",
  },
  {
    name: "ULS — STR/GEO (Eq. 6.10a)",
    equation: "6.10a",
    limitState: "ULS",
    expression: "Σ γG,j Gk,j + γQ,1 ψ0,1 Qk,1 + Σ γQ,i ψ0,i Qk,i",
  },
  {
    name: "ULS — STR/GEO (Eq. 6.10b)",
    equation: "6.10b",
    limitState: "ULS",
    expression: "Σ ξ γG,j Gk,j + γQ,1 Qk,1 + Σ γQ,i ψ0,i Qk,i (ξ=0.925)",
  },
  {
    name: "ULS — EQU (Eq. 6.7)",
    equation: "6.7",
    limitState: "ULS",
    expression: "Σ γG,j Gk,j + γQ,1 Qk,1 + Σ γQ,i ψ0,i Qk,i",
  },
  {
    name: "SLS — Characteristic (Eq. 6.14b)",
    equation: "6.14b",
    limitState: "SLS",
    expression: "Σ Gk,j + Qk,1 + Σ ψ0,i Qk,i",
  },
  {
    name: "SLS — Frequent (Eq. 6.15b)",
    equation: "6.15b",
    limitState: "SLS",
    expression: "Σ Gk,j + ψ1,1 Qk,1 + Σ ψ2,i Qk,i",
  },
  {
    name: "SLS — Quasi-permanent (Eq. 6.16b)",
    equation: "6.16b",
    limitState: "SLS",
    expression: "Σ Gk,j + Σ ψ2,i Qk,i",
  },
  {
    name: "Accidental (Eq. 6.11b)",
    equation: "6.11b",
    limitState: "Accidental",
    expression: "Σ Gk,j + Ad + ψ1,1 Qk,1 + Σ ψ2,i Qk,i",
  },
];

// ---------------------------------------------------------------------------
// Steel Buckling Curves — EN 1993-1-1 Table 6.2
// ---------------------------------------------------------------------------

export type BucklingCurve = "a0" | "a" | "b" | "c" | "d";

export interface BucklingImperfection {
  curve: BucklingCurve;
  alpha: number;
}

export const BUCKLING_CURVES: Record<BucklingCurve, BucklingImperfection> = {
  a0: { curve: "a0", alpha: 0.13 },
  a: { curve: "a", alpha: 0.21 },
  b: { curve: "b", alpha: 0.34 },
  c: { curve: "c", alpha: 0.49 },
  d: { curve: "d", alpha: 0.76 },
};

// ---------------------------------------------------------------------------
// Cross-Section Classification Limits — EN 1993-1-1 Table 5.2
// ---------------------------------------------------------------------------

export interface ClassLimits {
  /** Class 1 limit (c/t or d/t ratio) */
  class1: number;
  /** Class 2 limit */
  class2: number;
  /** Class 3 limit */
  class3: number;
}

/** Internal compression elements (web in bending) — EN 1993-1-1 Table 5.2 */
export const WEB_CLASS_LIMITS_BENDING: ClassLimits = {
  class1: 72, // 72ε
  class2: 83, // 83ε
  class3: 124, // 124ε
};

/** Outstand flanges in compression — EN 1993-1-1 Table 5.2 */
export const FLANGE_CLASS_LIMITS: ClassLimits = {
  class1: 9, // 9ε
  class2: 10, // 10ε
  class3: 14, // 14ε
};

/** CHS classification — EN 1993-1-1 Table 5.2 (d/t limits × ε²) */
export const CHS_CLASS_LIMITS: ClassLimits = {
  class1: 50, // 50ε²
  class2: 70, // 70ε²
  class3: 90, // 90ε²
};

/** Calculate epsilon factor ε = √(235/fy) */
export function calcEpsilon(fy: number): number {
  return Math.sqrt(235 / fy);
}

// ---------------------------------------------------------------------------
// Effective Length Factors — EN 1993-1-1 / BS 5950 convenience
// ---------------------------------------------------------------------------

export interface EffectiveLengthCase {
  name: string;
  description: string;
  kFactor: number;
}

export const EFFECTIVE_LENGTH_FACTORS: EffectiveLengthCase[] = [
  {
    name: "Fixed-Fixed",
    description: "Both ends fixed (rotation and translation)",
    kFactor: 0.5,
  },
  {
    name: "Fixed-Pinned",
    description: "One end fixed, one pinned",
    kFactor: 0.7,
  },
  { name: "Pinned-Pinned", description: "Both ends pinned", kFactor: 1.0 },
  { name: "Fixed-Free", description: "Cantilever", kFactor: 2.0 },
  { name: "Fixed-Slide", description: "Fixed base, guided top", kFactor: 1.0 },
  {
    name: "Propped Cantilever",
    description: "Fixed base, roller support at top",
    kFactor: 0.8,
  },
];

// ---------------------------------------------------------------------------
// Deflection Limits — from various Eurocodes & UK BS codes
// ---------------------------------------------------------------------------

export interface DeflectionLimit {
  category: string;
  description: string;
  limit: string;
  /** Denominator value (for span/xxx) */
  denominator: number;
}

export const DEFLECTION_LIMITS: DeflectionLimit[] = [
  {
    category: "Beams — general",
    description: "Variable actions — general",
    limit: "L/360",
    denominator: 360,
  },
  {
    category: "Beams — brittle finish",
    description: "Variable actions — plaster etc.",
    limit: "L/500",
    denominator: 500,
  },
  {
    category: "Beams — total",
    description: "Permanent + variable",
    limit: "L/250",
    denominator: 250,
  },
  {
    category: "Cantilever — general",
    description: "Variable actions",
    limit: "L/180",
    denominator: 180,
  },
  {
    category: "Cantilever — total",
    description: "Permanent + variable",
    limit: "L/125",
    denominator: 125,
  },
  {
    category: "Floor — perception",
    description: "Under frequent combination",
    limit: "L/350",
    denominator: 350,
  },
  {
    category: "Crane girders",
    description: "Vertical deflection",
    limit: "L/600",
    denominator: 600,
  },
  {
    category: "Portal frame",
    description: "Horizontal at eaves",
    limit: "H/300",
    denominator: 300,
  },
  {
    category: "Column — sway",
    description: "Interstorey drift",
    limit: "H/300",
    denominator: 300,
  },
  {
    category: "Timber — instantaneous",
    description: "EN 1995-1-1 Table 7.2",
    limit: "L/300",
    denominator: 300,
  },
  {
    category: "Timber — creep (net final)",
    description: "EN 1995-1-1 Table 7.2",
    limit: "L/250",
    denominator: 250,
  },
];

// ---------------------------------------------------------------------------
// Consequence Classes — EN 1990 Table B1
// ---------------------------------------------------------------------------

export interface ConsequenceClass {
  class: string;
  description: string;
  kFI: number;
  examples: string;
}

export const CONSEQUENCE_CLASSES: ConsequenceClass[] = [
  {
    class: "CC1",
    description: "Low consequence",
    kFI: 0.9,
    examples: "Agricultural buildings, temporary structures",
  },
  {
    class: "CC2",
    description: "Medium consequence",
    kFI: 1.0,
    examples: "Residential and office buildings",
  },
  {
    class: "CC3",
    description: "High consequence",
    kFI: 1.1,
    examples: "Public buildings, grandstands, bridges",
  },
];

// ---------------------------------------------------------------------------
// Durability — Concrete Cover Requirements — EN 1992-1-1 Table 4.4N
// ---------------------------------------------------------------------------

export interface CoverRequirement {
  exposureClass: string;
  /** Minimum cover cmin,dur (mm) for design life 50 years */
  cmin_dur_S4: number;
  /** Minimum cover cmin,dur (mm) for design life 100 years */
  cmin_dur_S6: number;
}

export const COVER_REQUIREMENTS: CoverRequirement[] = [
  { exposureClass: "X0", cmin_dur_S4: 10, cmin_dur_S6: 15 },
  { exposureClass: "XC1", cmin_dur_S4: 15, cmin_dur_S6: 20 },
  { exposureClass: "XC2", cmin_dur_S4: 25, cmin_dur_S6: 30 },
  { exposureClass: "XC3", cmin_dur_S4: 25, cmin_dur_S6: 30 },
  { exposureClass: "XC4", cmin_dur_S4: 30, cmin_dur_S6: 35 },
  { exposureClass: "XD1", cmin_dur_S4: 35, cmin_dur_S6: 40 },
  { exposureClass: "XD2", cmin_dur_S4: 40, cmin_dur_S6: 45 },
  { exposureClass: "XD3", cmin_dur_S4: 45, cmin_dur_S6: 50 },
  { exposureClass: "XS1", cmin_dur_S4: 35, cmin_dur_S6: 40 },
  { exposureClass: "XS2", cmin_dur_S4: 40, cmin_dur_S6: 45 },
  { exposureClass: "XS3", cmin_dur_S4: 45, cmin_dur_S6: 50 },
];
