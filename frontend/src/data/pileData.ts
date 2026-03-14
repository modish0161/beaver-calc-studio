// =============================================================================
// Centralised Pile Foundation Database
// =============================================================================
// Canonical source for all pile design data used across BeaverCalc.
// Data sourced from:
//   - EN 1997-1 (Geotechnical design — general rules)
//   - EN 1993-5 (Steel piling)
//   - EN 1536 (Bored piles)
//   - EN 12699 (Displacement piles)
//   - ICE Piling Handbook
//   - CIRIA C550 / Federation of Piling Specialists
//
// Usage:
//   import { PILE_TYPES, PILE_SOIL_PROFILES, PILE_LAYOUTS } from '@/data/pileData';
// =============================================================================

// ---------------------------------------------------------------------------
// Pile Types — classification and properties
// ---------------------------------------------------------------------------

export interface PileTypeProps {
  /** Display name */
  name: string;
  /** Pile category */
  category: "bored" | "driven" | "CFA" | "micropile" | "sheet";
  /** Material */
  material: "concrete" | "steel" | "timber";
  /** Displacement type */
  displacement: "displacement" | "non-displacement" | "low-displacement";
  /** Typical diameter range [min, max] (mm) */
  diameterRange: [number, number];
  /** Typical capacity range [min, max] (kN) */
  capacityRange: [number, number];
  /** Typical maximum length (m) */
  maxLength: number;
  /** Description */
  description: string;
}

export const PILE_TYPES: Record<string, PileTypeProps> = {
  bored_concrete: {
    name: "Bored Concrete Pile",
    category: "bored",
    material: "concrete",
    displacement: "non-displacement",
    diameterRange: [300, 2400],
    capacityRange: [200, 15000],
    maxLength: 60,
    description:
      "Cast-in-situ concrete pile formed by boring/excavation. Most common for heavy loads.",
  },
  cfa: {
    name: "Continuous Flight Auger (CFA)",
    category: "CFA",
    material: "concrete",
    displacement: "low-displacement",
    diameterRange: [300, 900],
    capacityRange: [200, 5000],
    maxLength: 30,
    description:
      "Drilled with continuous auger, concrete pumped as auger withdrawn. Quick execution.",
  },
  driven_precast: {
    name: "Driven Precast Concrete",
    category: "driven",
    material: "concrete",
    displacement: "displacement",
    diameterRange: [250, 600],
    capacityRange: [300, 3000],
    maxLength: 30,
    description:
      "Precast reinforced or prestressed concrete piles driven by hammer.",
  },
  driven_steel_h: {
    name: "Driven Steel H-Pile",
    category: "driven",
    material: "steel",
    displacement: "low-displacement",
    diameterRange: [200, 400],
    capacityRange: [200, 4000],
    maxLength: 40,
    description:
      "H-section steel piles. Easy to splice. Low soil displacement.",
  },
  driven_steel_tube: {
    name: "Driven Steel Tube Pile",
    category: "driven",
    material: "steel",
    displacement: "displacement",
    diameterRange: [273, 1220],
    capacityRange: [300, 8000],
    maxLength: 50,
    description:
      "Open or closed-ended tubular steel piles. High moment capacity.",
  },
  micropile: {
    name: "Micropile / Minipile",
    category: "micropile",
    material: "steel",
    displacement: "non-displacement",
    diameterRange: [100, 300],
    capacityRange: [50, 500],
    maxLength: 30,
    description:
      "Small diameter drilled piles. Ideal for restricted access / underpinning.",
  },
  screw_pile: {
    name: "Screw / Helical Pile",
    category: "driven",
    material: "steel",
    displacement: "low-displacement",
    diameterRange: [76, 400],
    capacityRange: [20, 600],
    maxLength: 20,
    description:
      "Helical blade plates welded to shaft. Rapid installation, low vibration.",
  },
  timber_pile: {
    name: "Timber Pile",
    category: "driven",
    material: "timber",
    displacement: "displacement",
    diameterRange: [200, 400],
    capacityRange: [50, 500],
    maxLength: 15,
    description:
      "Treated timber piles. Suitable for light structures and temporary works.",
  },
  sheet_pile: {
    name: "Steel Sheet Pile",
    category: "sheet",
    material: "steel",
    displacement: "displacement",
    diameterRange: [400, 700],
    capacityRange: [0, 0],
    maxLength: 30,
    description:
      "Interlocking steel sections for retaining walls and cofferdams.",
  },
};

// ---------------------------------------------------------------------------
// Soil Layer Profiles for Pile Design
// ---------------------------------------------------------------------------

export interface SoilLayerProfile {
  /** Layer depth from surface (m) */
  depth: number;
  /** Layer thickness (m) */
  thickness: number;
  /** Soil description */
  description: string;
  /** Soil type key (maps to SOIL_TYPES) */
  soilType: string;
  /** Effective unit weight γ' (kN/m³) */
  gamma_eff: number;
  /** Undrained shear strength cu (kPa) — 0 for granular */
  cu: number;
  /** Effective friction angle φ' (degrees) */
  phi: number;
  /** SPT N value */
  spt_n: number;
}

export interface PileSoilProfile {
  name: string;
  description: string;
  layers: SoilLayerProfile[];
  waterTableDepth: number;
}

export const PILE_SOIL_PROFILES: Record<string, PileSoilProfile> = {
  london_clay: {
    name: "London Clay Profile",
    description:
      "Typical London Clay sequence — made ground, alluvium, terrace gravel, London Clay",
    waterTableDepth: 3.0,
    layers: [
      {
        depth: 0,
        thickness: 1.5,
        description: "Made Ground",
        soilType: "made_ground",
        gamma_eff: 8,
        cu: 0,
        phi: 25,
        spt_n: 5,
      },
      {
        depth: 1.5,
        thickness: 1.5,
        description: "Alluvium (soft)",
        soilType: "soft_clay",
        gamma_eff: 7,
        cu: 20,
        phi: 20,
        spt_n: 3,
      },
      {
        depth: 3,
        thickness: 3,
        description: "Terrace Gravel",
        soilType: "gravel",
        gamma_eff: 10,
        cu: 0,
        phi: 35,
        spt_n: 30,
      },
      {
        depth: 6,
        thickness: 14,
        description: "Stiff London Clay",
        soilType: "stiff_clay",
        gamma_eff: 10,
        cu: 100,
        phi: 25,
        spt_n: 20,
      },
      {
        depth: 20,
        thickness: 10,
        description: "Very Stiff London Clay",
        soilType: "very_stiff_clay",
        gamma_eff: 11,
        cu: 200,
        phi: 28,
        spt_n: 35,
      },
    ],
  },
  glacial_till: {
    name: "Glacial Till Profile",
    description:
      "Northern UK glacial deposit — topsoil, sand, glacial till, mudstone",
    waterTableDepth: 5.0,
    layers: [
      {
        depth: 0,
        thickness: 0.5,
        description: "Topsoil",
        soilType: "made_ground",
        gamma_eff: 7,
        cu: 0,
        phi: 25,
        spt_n: 3,
      },
      {
        depth: 0.5,
        thickness: 2.5,
        description: "Sand / gravel",
        soilType: "medium_sand",
        gamma_eff: 9,
        cu: 0,
        phi: 32,
        spt_n: 15,
      },
      {
        depth: 3,
        thickness: 12,
        description: "Glacial Till",
        soilType: "stiff_clay",
        gamma_eff: 11,
        cu: 120,
        phi: 30,
        spt_n: 25,
      },
      {
        depth: 15,
        thickness: 15,
        description: "Mudstone",
        soilType: "rock_weak",
        gamma_eff: 13,
        cu: 500,
        phi: 35,
        spt_n: 80,
      },
    ],
  },
  alluvium: {
    name: "Alluvial / Estuarine Profile",
    description: "Coastal / river deposit — fill, soft alluvium, sand, clay",
    waterTableDepth: 1.5,
    layers: [
      {
        depth: 0,
        thickness: 2,
        description: "Made Ground / Fill",
        soilType: "made_ground",
        gamma_eff: 7,
        cu: 0,
        phi: 25,
        spt_n: 4,
      },
      {
        depth: 2,
        thickness: 5,
        description: "Soft Alluvium",
        soilType: "soft_clay",
        gamma_eff: 6,
        cu: 15,
        phi: 18,
        spt_n: 2,
      },
      {
        depth: 7,
        thickness: 4,
        description: "Medium Dense Sand",
        soilType: "medium_sand",
        gamma_eff: 9,
        cu: 0,
        phi: 32,
        spt_n: 20,
      },
      {
        depth: 11,
        thickness: 9,
        description: "Firm to Stiff Clay",
        soilType: "firm_clay",
        gamma_eff: 9,
        cu: 60,
        phi: 24,
        spt_n: 10,
      },
    ],
  },
  chalk: {
    name: "Chalk Profile",
    description:
      "SE England chalk sequence — topsoil, clay with flints, structured chalk",
    waterTableDepth: 8.0,
    layers: [
      {
        depth: 0,
        thickness: 0.3,
        description: "Topsoil",
        soilType: "made_ground",
        gamma_eff: 7,
        cu: 0,
        phi: 25,
        spt_n: 3,
      },
      {
        depth: 0.3,
        thickness: 2.7,
        description: "Clay with Flints",
        soilType: "stiff_clay",
        gamma_eff: 10,
        cu: 100,
        phi: 28,
        spt_n: 15,
      },
      {
        depth: 3,
        thickness: 5,
        description: "Structured Chalk (CIRIA C574 Grade Dm)",
        soilType: "rock_weak",
        gamma_eff: 12,
        cu: 200,
        phi: 33,
        spt_n: 25,
      },
      {
        depth: 8,
        thickness: 12,
        description: "Intact Chalk (Grade B)",
        soilType: "rock_weak",
        gamma_eff: 13,
        cu: 400,
        phi: 35,
        spt_n: 50,
      },
    ],
  },
  custom: {
    name: "Custom Profile",
    description: "Define your own soil layers",
    waterTableDepth: 5.0,
    layers: [
      {
        depth: 0,
        thickness: 5,
        description: "Layer 1",
        soilType: "medium_sand",
        gamma_eff: 9,
        cu: 0,
        phi: 30,
        spt_n: 15,
      },
      {
        depth: 5,
        thickness: 10,
        description: "Layer 2",
        soilType: "stiff_clay",
        gamma_eff: 10,
        cu: 80,
        phi: 25,
        spt_n: 15,
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Pile Layouts — standard group arrangements
// ---------------------------------------------------------------------------

export interface PileLayoutProps {
  /** Display name */
  name: string;
  /** Number of piles */
  count: number;
  /** Coordinates [x, y] of each pile (normalised to spacing) */
  positions: [number, number][];
  /** Minimum pile cap overhang from edge of pile (mm) */
  minOverhang: number;
}

export const PILE_LAYOUTS: Record<string, PileLayoutProps> = {
  single: {
    name: "1 Pile",
    count: 1,
    positions: [[0, 0]],
    minOverhang: 150,
  },
  pair: {
    name: "2 Piles",
    count: 2,
    positions: [
      [-0.5, 0],
      [0.5, 0],
    ],
    minOverhang: 150,
  },
  triangle: {
    name: "3 Piles (Triangle)",
    count: 3,
    positions: [
      [-0.5, -0.289],
      [0.5, -0.289],
      [0, 0.577],
    ],
    minOverhang: 150,
  },
  square: {
    name: "4 Piles (Square)",
    count: 4,
    positions: [
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ],
    minOverhang: 150,
  },
  pentagon: {
    name: "5 Piles (Cross)",
    count: 5,
    positions: [
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
      [0, 0],
    ],
    minOverhang: 150,
  },
  hex: {
    name: "6 Piles (2×3)",
    count: 6,
    positions: [
      [-0.5, -1],
      [0.5, -1],
      [-0.5, 0],
      [0.5, 0],
      [-0.5, 1],
      [0.5, 1],
    ],
    minOverhang: 150,
  },
  grid_3x3: {
    name: "9 Piles (3×3)",
    count: 9,
    positions: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    minOverhang: 150,
  },
};

// ---------------------------------------------------------------------------
// Adhesion Factors — α for cohesive soils (total stress)
// ---------------------------------------------------------------------------

export interface AdhesionFactor {
  /** cu range description */
  cuRange: string;
  /** cu lower limit (kPa) */
  cuMin: number;
  /** cu upper limit (kPa) */
  cuMax: number;
  /** α factor for bored piles */
  alpha_bored: number;
  /** α factor for driven piles */
  alpha_driven: number;
}

export const ADHESION_FACTORS: AdhesionFactor[] = [
  {
    cuRange: "cu ≤ 25 kPa",
    cuMin: 0,
    cuMax: 25,
    alpha_bored: 0.7,
    alpha_driven: 1.0,
  },
  {
    cuRange: "25 < cu ≤ 50 kPa",
    cuMin: 25,
    cuMax: 50,
    alpha_bored: 0.6,
    alpha_driven: 0.8,
  },
  {
    cuRange: "50 < cu ≤ 100 kPa",
    cuMin: 50,
    cuMax: 100,
    alpha_bored: 0.5,
    alpha_driven: 0.6,
  },
  {
    cuRange: "100 < cu ≤ 200 kPa",
    cuMin: 100,
    cuMax: 200,
    alpha_bored: 0.45,
    alpha_driven: 0.5,
  },
  {
    cuRange: "cu > 200 kPa",
    cuMin: 200,
    cuMax: Infinity,
    alpha_bored: 0.4,
    alpha_driven: 0.45,
  },
];

// ---------------------------------------------------------------------------
// Earth Pressure Coefficients for Pile Shaft (Kstanδ) — EN 1997-1
// ---------------------------------------------------------------------------

export interface KsTanDelta {
  soilType: string;
  /** Ks × tan(δ) for bored piles */
  bored: number;
  /** Ks × tan(δ) for driven piles */
  driven: number;
}

export const KS_TAN_DELTA: KsTanDelta[] = [
  { soilType: "Loose sand", bored: 0.2, driven: 0.4 },
  { soilType: "Medium dense sand", bored: 0.35, driven: 0.6 },
  { soilType: "Dense sand", bored: 0.5, driven: 0.8 },
  { soilType: "Gravel", bored: 0.6, driven: 1.0 },
];

// ---------------------------------------------------------------------------
// Bearing Capacity Factors — Nq for pile tip
// ---------------------------------------------------------------------------

export interface NqFactor {
  phi: number;
  Nq_bored: number;
  Nq_driven: number;
}

export const NQ_FACTORS: NqFactor[] = [
  { phi: 25, Nq_bored: 5, Nq_driven: 10 },
  { phi: 28, Nq_bored: 8, Nq_driven: 15 },
  { phi: 30, Nq_bored: 10, Nq_driven: 20 },
  { phi: 32, Nq_bored: 13, Nq_driven: 30 },
  { phi: 35, Nq_bored: 18, Nq_driven: 45 },
  { phi: 38, Nq_bored: 25, Nq_driven: 70 },
  { phi: 40, Nq_bored: 35, Nq_driven: 100 },
];

// ---------------------------------------------------------------------------
// Correlation Factors — EN 1997-1 Table A.9/A.10 (UK NA)
// ---------------------------------------------------------------------------

export interface CorrelationFactors {
  /** Number of profiles/tests */
  n: number;
  /** ξ3 — mean of measured values */
  xi3: number;
  /** ξ4 — minimum measured value */
  xi4: number;
}

export const CORRELATION_FACTORS_GROUND_TEST: CorrelationFactors[] = [
  { n: 1, xi3: 1.4, xi4: 1.4 },
  { n: 2, xi3: 1.35, xi4: 1.27 },
  { n: 3, xi3: 1.33, xi4: 1.23 },
  { n: 4, xi3: 1.31, xi4: 1.2 },
  { n: 5, xi3: 1.29, xi4: 1.15 },
  { n: 7, xi3: 1.27, xi4: 1.12 },
  { n: 10, xi3: 1.25, xi4: 1.08 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get adhesion factor α based on undrained shear strength and pile type */
export function getAdhesionFactor(
  cu: number,
  pileType: "bored" | "driven",
): number {
  const entry = ADHESION_FACTORS.find((f) => cu >= f.cuMin && cu <= f.cuMax);
  if (!entry) return 0.45;
  return pileType === "bored" ? entry.alpha_bored : entry.alpha_driven;
}

/** Get Nq bearing capacity factor for a given friction angle (linear interpolation) */
export function getNqFactor(phi: number, pileType: "bored" | "driven"): number {
  const key = pileType === "bored" ? "Nq_bored" : "Nq_driven";
  if (phi <= NQ_FACTORS[0].phi) return NQ_FACTORS[0][key];
  if (phi >= NQ_FACTORS[NQ_FACTORS.length - 1].phi)
    return NQ_FACTORS[NQ_FACTORS.length - 1][key];

  for (let i = 0; i < NQ_FACTORS.length - 1; i++) {
    if (phi >= NQ_FACTORS[i].phi && phi <= NQ_FACTORS[i + 1].phi) {
      const ratio =
        (phi - NQ_FACTORS[i].phi) / (NQ_FACTORS[i + 1].phi - NQ_FACTORS[i].phi);
      return (
        NQ_FACTORS[i][key] +
        ratio * (NQ_FACTORS[i + 1][key] - NQ_FACTORS[i][key])
      );
    }
  }
  return NQ_FACTORS[0][key];
}
