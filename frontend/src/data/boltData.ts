// =============================================================================
// Centralised Bolt & Connection Database
// =============================================================================
// Canonical source for all bolt, washer, and connection data across BeaverCalc.
// Data sourced from:
//   - EN 1993-1-8 (Bolted & welded connections)
//   - EN ISO 898-1 (Bolt mechanical properties)
//   - EN 14399 (Preloaded bolts)
//   - EN ISO 4014/4017 (Hex head bolts)
//
// Usage:
//   import { BOLT_GRADES, BOLT_DIMENSIONS, HOLE_TYPES } from '@/data/boltData';
// =============================================================================

// ---------------------------------------------------------------------------
// Bolt Grades — EN ISO 898-1 / EN 1993-1-8 Table 3.1
// ---------------------------------------------------------------------------

export interface BoltGradeProps {
  /** Display name e.g. '8.8' */
  name: string;
  /** Nominal yield strength fyb (MPa) */
  fyb: number;
  /** Nominal ultimate tensile strength fub (MPa) */
  fub: number;
  /** Proof load strength (0.2% offset, MPa) */
  fp: number;
  /** Is this a preload (HSFG) bolt grade? */
  preloadable: boolean;
}

export const BOLT_GRADES: Record<string, BoltGradeProps> = {
  "4.6": { name: "4.6", fyb: 240, fub: 400, fp: 225, preloadable: false },
  "4.8": { name: "4.8", fyb: 320, fub: 400, fp: 310, preloadable: false },
  "5.6": { name: "5.6", fyb: 300, fub: 500, fp: 280, preloadable: false },
  "5.8": { name: "5.8", fyb: 400, fub: 500, fp: 380, preloadable: false },
  "6.8": { name: "6.8", fyb: 480, fub: 600, fp: 440, preloadable: false },
  "8.8": { name: "8.8", fyb: 640, fub: 800, fp: 580, preloadable: true },
  "10.9": { name: "10.9", fyb: 900, fub: 1000, fp: 830, preloadable: true },
};

// ---------------------------------------------------------------------------
// Bolt Dimensions — EN ISO 4014/4017 / EN 14399
// ---------------------------------------------------------------------------

export interface BoltDimensionProps {
  /** Nominal diameter d (mm) */
  d: number;
  /** Tensile stress area As (mm²) */
  As: number;
  /** Gross cross-sectional area A = π×d²/4 (mm²) */
  A: number;
  /** Standard hole diameter d₀ (mm) — normal clearance */
  d0: number;
  /** Oversize hole diameter d₀ (mm) */
  d0_oversize: number;
  /** Short slotted hole width (mm) */
  d0_short_slot: number;
  /** Head across-flats dimension s (mm) */
  head_s: number;
  /** Head height k (mm) */
  head_k: number;
  /** Washer outer diameter (mm) */
  washer_d: number;
  /** Washer thickness (mm) */
  washer_t: number;
  /** Nut height m (mm) */
  nut_m: number;
}

export const BOLT_DIMENSIONS: Record<string, BoltDimensionProps> = {
  M12: {
    d: 12,
    As: 84.3,
    A: 113,
    d0: 13,
    d0_oversize: 15,
    d0_short_slot: 14,
    head_s: 19,
    head_k: 7.5,
    washer_d: 24,
    washer_t: 2.5,
    nut_m: 10.8,
  },
  M14: {
    d: 14,
    As: 115,
    A: 154,
    d0: 15,
    d0_oversize: 17,
    d0_short_slot: 16,
    head_s: 22,
    head_k: 8.8,
    washer_d: 28,
    washer_t: 2.5,
    nut_m: 12.8,
  },
  M16: {
    d: 16,
    As: 157,
    A: 201,
    d0: 18,
    d0_oversize: 20,
    d0_short_slot: 19,
    head_s: 24,
    head_k: 10,
    washer_d: 30,
    washer_t: 3,
    nut_m: 14.8,
  },
  M18: {
    d: 18,
    As: 192,
    A: 254,
    d0: 20,
    d0_oversize: 22,
    d0_short_slot: 21,
    head_s: 27,
    head_k: 11.5,
    washer_d: 34,
    washer_t: 3,
    nut_m: 15.8,
  },
  M20: {
    d: 20,
    As: 245,
    A: 314,
    d0: 22,
    d0_oversize: 24,
    d0_short_slot: 23,
    head_s: 30,
    head_k: 12.5,
    washer_d: 37,
    washer_t: 3,
    nut_m: 18,
  },
  M22: {
    d: 22,
    As: 303,
    A: 380,
    d0: 24,
    d0_oversize: 26,
    d0_short_slot: 25,
    head_s: 32,
    head_k: 14,
    washer_d: 39,
    washer_t: 3,
    nut_m: 19.4,
  },
  M24: {
    d: 24,
    As: 353,
    A: 452,
    d0: 26,
    d0_oversize: 28,
    d0_short_slot: 27,
    head_s: 36,
    head_k: 15,
    washer_d: 44,
    washer_t: 4,
    nut_m: 21.5,
  },
  M27: {
    d: 27,
    As: 459,
    A: 573,
    d0: 30,
    d0_oversize: 32,
    d0_short_slot: 31,
    head_s: 41,
    head_k: 17,
    washer_d: 50,
    washer_t: 4,
    nut_m: 23.8,
  },
  M30: {
    d: 30,
    As: 561,
    A: 707,
    d0: 33,
    d0_oversize: 35,
    d0_short_slot: 34,
    head_s: 46,
    head_k: 18.7,
    washer_d: 56,
    washer_t: 4,
    nut_m: 25.6,
  },
  M33: {
    d: 33,
    As: 694,
    A: 855,
    d0: 36,
    d0_oversize: 38,
    d0_short_slot: 37,
    head_s: 50,
    head_k: 21,
    washer_d: 60,
    washer_t: 5,
    nut_m: 28.7,
  },
  M36: {
    d: 36,
    As: 817,
    A: 1018,
    d0: 39,
    d0_oversize: 41,
    d0_short_slot: 40,
    head_s: 55,
    head_k: 22.5,
    washer_d: 66,
    washer_t: 5,
    nut_m: 31,
  },
};

// ---------------------------------------------------------------------------
// Hole Types — EN 1993-1-8 Table 3.3
// ---------------------------------------------------------------------------

export interface HoleTypeProps {
  name: string;
  description: string;
  /** Hole clearance added to bolt diameter (mm) — varies by bolt size */
  clearance_standard: number;
  /** Used for bearing-type or slip-resistant connections? */
  category: "bearing" | "slip" | "both";
}

export const HOLE_TYPES: Record<string, HoleTypeProps> = {
  normal: {
    name: "Normal",
    description: "Standard clearance holes",
    clearance_standard: 2,
    category: "both",
  },
  oversize: {
    name: "Oversize",
    description: "Oversize clearance holes",
    clearance_standard: 4,
    category: "slip",
  },
  short_slot: {
    name: "Short Slotted",
    description: "Slotted holes — short axis",
    clearance_standard: 3,
    category: "both",
  },
  long_slot: {
    name: "Long Slotted",
    description: "Slotted holes — long axis",
    clearance_standard: 3,
    category: "slip",
  },
  kidney: {
    name: "Kidney Shaped",
    description: "Kidney-shaped holes for adjustment",
    clearance_standard: 4,
    category: "slip",
  },
};

// ---------------------------------------------------------------------------
// Friction / Slip Factors — EN 1993-1-8 Table 3.7
// ---------------------------------------------------------------------------

export interface SlipFactorProps {
  name: string;
  mu: number;
  description: string;
}

export const SLIP_FACTORS: Record<string, SlipFactorProps> = {
  class_A: {
    name: "Class A",
    mu: 0.5,
    description: "Blasted surfaces, friction paint",
  },
  class_B: {
    name: "Class B",
    mu: 0.4,
    description: "Blasted surfaces, spray metalised",
  },
  class_C: {
    name: "Class C",
    mu: 0.3,
    description: "Wire brushed / flame cleaned",
  },
  class_D: {
    name: "Class D",
    mu: 0.2,
    description: "Untreated galvanised surfaces",
  },
};

// ---------------------------------------------------------------------------
// Weld Data — EN 1993-1-8 Table 4.1
// ---------------------------------------------------------------------------

export interface WeldCorrelationProps {
  steelGrade: string;
  betaW: number;
}

export const WELD_CORRELATION_FACTORS: WeldCorrelationProps[] = [
  { steelGrade: "S235", betaW: 0.8 },
  { steelGrade: "S275", betaW: 0.85 },
  { steelGrade: "S355", betaW: 0.9 },
  { steelGrade: "S420", betaW: 1.0 },
  { steelGrade: "S450", betaW: 1.0 },
  { steelGrade: "S460", betaW: 1.0 },
];

export interface ElectrodeGradeProps {
  name: string;
  /** Electrode ultimate tensile strength fu (MPa) */
  fu: number;
}

export const ELECTRODE_GRADES: Record<string, ElectrodeGradeProps> = {
  E35: { name: "E35 (Grade 35)", fu: 440 },
  E42: { name: "E42 (Grade 42)", fu: 500 },
  E50: { name: "E50 (Grade 50)", fu: 560 },
};

/** Minimum fillet weld leg length (mm) per thicker plate (mm) — AWS D1.1 / BS best practice */
export const MIN_FILLET_WELD_LEG: {
  plateThicknessMax: number;
  minLeg: number;
}[] = [
  { plateThicknessMax: 6, minLeg: 3 },
  { plateThicknessMax: 13, minLeg: 5 },
  { plateThicknessMax: 19, minLeg: 6 },
  { plateThicknessMax: 38, minLeg: 8 },
  { plateThicknessMax: 64, minLeg: 10 },
  { plateThicknessMax: Infinity, minLeg: 12 },
];

// ---------------------------------------------------------------------------
// Minimum Edge / End / Spacing Distances — EN 1993-1-8 Table 3.3
// ---------------------------------------------------------------------------

export interface BoltSpacingRules {
  /** Minimum end distance e1 = 1.2 × d0 */
  minEndDist: (d0: number) => number;
  /** Minimum edge distance e2 = 1.2 × d0 */
  minEdgeDist: (d0: number) => number;
  /** Minimum pitch p1 = 2.2 × d0 */
  minPitch: (d0: number) => number;
  /** Minimum gauge p2 = 2.4 × d0 */
  minGauge: (d0: number) => number;
  /** Maximum end distance e1 = 4t + 40 */
  maxEndDist: (t: number) => number;
  /** Maximum pitch p1 = min(14t, 200) */
  maxPitch: (t: number) => number;
}

export const BOLT_SPACING: BoltSpacingRules = {
  minEndDist: (d0) => 1.2 * d0,
  minEdgeDist: (d0) => 1.2 * d0,
  minPitch: (d0) => 2.2 * d0,
  minGauge: (d0) => 2.4 * d0,
  maxEndDist: (t) => 4 * t + 40,
  maxPitch: (t) => Math.min(14 * t, 200),
};

// ---------------------------------------------------------------------------
// Anchor Bolt Types — EN 1992-4
// ---------------------------------------------------------------------------

export interface AnchorBoltType {
  name: string;
  description: string;
  category: "cast_in" | "post_installed";
}

export const ANCHOR_TYPES: Record<string, AnchorBoltType> = {
  headed: {
    name: "Headed Anchor",
    description: "Cast-in headed studs or bolts",
    category: "cast_in",
  },
  hooked: {
    name: "Hooked (J/L) Bolt",
    description: "Cast-in bent anchor bolts",
    category: "cast_in",
  },
  channel: {
    name: "Channel Bar",
    description: "Cast-in anchor channels",
    category: "cast_in",
  },
  expansion: {
    name: "Expansion Anchor",
    description: "Post-installed torque-controlled",
    category: "post_installed",
  },
  undercut: {
    name: "Undercut Anchor",
    description: "Post-installed undercut type",
    category: "post_installed",
  },
  adhesive: {
    name: "Adhesive Anchor",
    description: "Post-installed bonded anchor",
    category: "post_installed",
  },
  screw: {
    name: "Screw Anchor",
    description: "Post-installed concrete screw",
    category: "post_installed",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up the bolt hole diameter for a given bolt size and hole type */
export function getHoleDiameter(
  boltSize: string,
  holeType: keyof typeof HOLE_TYPES = "normal",
): number {
  const bolt = BOLT_DIMENSIONS[boltSize];
  if (!bolt) return 0;
  switch (holeType) {
    case "oversize":
      return bolt.d0_oversize;
    case "short_slot":
      return bolt.d0_short_slot;
    default:
      return bolt.d0;
  }
}

/** Calculate preload force Fp,C for HSFG bolts — EN 1993-1-8 Eq. 3.1 */
export function getPreloadForce(boltSize: string, boltGrade: string): number {
  const bolt = BOLT_DIMENSIONS[boltSize];
  const grade = BOLT_GRADES[boltGrade];
  if (!bolt || !grade) return 0;
  return (0.7 * grade.fub * bolt.As) / 1000; // kN
}

/** Get minimum fillet weld leg length for a given plate thickness */
export function getMinFilletLeg(plateThickness_mm: number): number {
  const entry = MIN_FILLET_WELD_LEG.find(
    (e) => plateThickness_mm <= e.plateThicknessMax,
  );
  return entry ? entry.minLeg : 12;
}
