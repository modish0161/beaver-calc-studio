// =============================================================================
// Centralised Soil & Geotechnical Properties Database
// =============================================================================
// Canonical source for all geotechnical data used across BeaverCalc.
// Data sourced from:
//   - EN 1997-1 (Geotechnical design)
//   - BS 8002 (Earth retaining structures)
//   - BS 8004 (Foundations)
//   - CIRIA C580 (Embedded retaining walls)
//   - Typical published values for UK soils
//
// Usage:
//   import { SOIL_TYPES, GROUND_PRESETS, SOIL_BEARING } from '@/data/soilProperties';
// =============================================================================

// ---------------------------------------------------------------------------
// Standard Soil Types — Geomechanical properties
// ---------------------------------------------------------------------------

export interface SoilTypeProps {
  /** Display name */
  name: string;
  /** Soil classification */
  category: "granular" | "cohesive" | "organic" | "rock" | "fill";
  /** Effective angle of internal friction φ' (degrees) — characteristic */
  phi: number;
  /** Bulk unit weight γ (kN/m³) */
  gamma: number;
  /** Saturated unit weight γsat (kN/m³) */
  gamma_sat: number;
  /** Submerged unit weight γ' (kN/m³) */
  gamma_sub: number;
  /** Effective cohesion c' (kPa) */
  c_eff: number;
  /** Undrained shear strength cu (kPa) — for cohesive soils, 0 for granular */
  cu: number;
  /** Active earth pressure coefficient Ka (Rankine) */
  Ka: number;
  /** Passive earth pressure coefficient Kp (Rankine) */
  Kp: number;
  /** At rest earth pressure coefficient K0 = 1−sin(φ') */
  K0: number;
  /** Typical angle of wall friction δ (degrees) */
  delta: number;
  /** Typical SPT N value range [min, max] */
  spt_range: [number, number];
  /** Allowable bearing capacity (kPa) — conservative estimate */
  bearing_allowable: number;
}

export const SOIL_TYPES: Record<string, SoilTypeProps> = {
  loose_sand: {
    name: "Loose Sand",
    category: "granular",
    phi: 28,
    gamma: 16,
    gamma_sat: 18,
    gamma_sub: 8,
    c_eff: 0,
    cu: 0,
    Ka: 0.361,
    Kp: 2.77,
    K0: 0.531,
    delta: 18.7,
    spt_range: [4, 10],
    bearing_allowable: 75,
  },
  medium_sand: {
    name: "Medium Dense Sand",
    category: "granular",
    phi: 32,
    gamma: 17,
    gamma_sat: 19,
    gamma_sub: 9,
    c_eff: 0,
    cu: 0,
    Ka: 0.307,
    Kp: 3.255,
    K0: 0.47,
    delta: 21.3,
    spt_range: [10, 30],
    bearing_allowable: 150,
  },
  dense_sand: {
    name: "Dense Sand",
    category: "granular",
    phi: 36,
    gamma: 18,
    gamma_sat: 20,
    gamma_sub: 10,
    c_eff: 0,
    cu: 0,
    Ka: 0.26,
    Kp: 3.852,
    K0: 0.412,
    delta: 24,
    spt_range: [30, 50],
    bearing_allowable: 300,
  },
  very_dense_sand: {
    name: "Very Dense Sand / Gravel",
    category: "granular",
    phi: 40,
    gamma: 19,
    gamma_sat: 21,
    gamma_sub: 11,
    c_eff: 0,
    cu: 0,
    Ka: 0.217,
    Kp: 4.599,
    K0: 0.357,
    delta: 26.7,
    spt_range: [50, 80],
    bearing_allowable: 500,
  },
  gravel: {
    name: "Gravel",
    category: "granular",
    phi: 35,
    gamma: 18,
    gamma_sat: 20,
    gamma_sub: 10,
    c_eff: 0,
    cu: 0,
    Ka: 0.271,
    Kp: 3.69,
    K0: 0.426,
    delta: 23.3,
    spt_range: [20, 50],
    bearing_allowable: 250,
  },
  sandy_gravel: {
    name: "Sandy Gravel",
    category: "granular",
    phi: 37,
    gamma: 19,
    gamma_sat: 21,
    gamma_sub: 11,
    c_eff: 0,
    cu: 0,
    Ka: 0.249,
    Kp: 4.023,
    K0: 0.398,
    delta: 24.7,
    spt_range: [20, 60],
    bearing_allowable: 300,
  },
  soft_clay: {
    name: "Soft Clay",
    category: "cohesive",
    phi: 20,
    gamma: 17,
    gamma_sat: 18,
    gamma_sub: 8,
    c_eff: 5,
    cu: 25,
    Ka: 0.49,
    Kp: 2.04,
    K0: 0.658,
    delta: 13.3,
    spt_range: [2, 4],
    bearing_allowable: 50,
  },
  firm_clay: {
    name: "Firm Clay",
    category: "cohesive",
    phi: 24,
    gamma: 18,
    gamma_sat: 19,
    gamma_sub: 9,
    c_eff: 10,
    cu: 50,
    Ka: 0.422,
    Kp: 2.371,
    K0: 0.593,
    delta: 16,
    spt_range: [4, 10],
    bearing_allowable: 100,
  },
  stiff_clay: {
    name: "Stiff Clay",
    category: "cohesive",
    phi: 26,
    gamma: 19,
    gamma_sat: 20,
    gamma_sub: 10,
    c_eff: 15,
    cu: 100,
    Ka: 0.39,
    Kp: 2.561,
    K0: 0.562,
    delta: 17.3,
    spt_range: [10, 20],
    bearing_allowable: 200,
  },
  very_stiff_clay: {
    name: "Very Stiff Clay",
    category: "cohesive",
    phi: 28,
    gamma: 20,
    gamma_sat: 21,
    gamma_sub: 11,
    c_eff: 20,
    cu: 200,
    Ka: 0.361,
    Kp: 2.77,
    K0: 0.531,
    delta: 18.7,
    spt_range: [20, 40],
    bearing_allowable: 350,
  },
  hard_clay: {
    name: "Hard Clay",
    category: "cohesive",
    phi: 30,
    gamma: 21,
    gamma_sat: 22,
    gamma_sub: 12,
    c_eff: 25,
    cu: 300,
    Ka: 0.333,
    Kp: 3.0,
    K0: 0.5,
    delta: 20,
    spt_range: [40, 60],
    bearing_allowable: 500,
  },
  silt: {
    name: "Silt",
    category: "cohesive",
    phi: 25,
    gamma: 17,
    gamma_sat: 19,
    gamma_sub: 9,
    c_eff: 5,
    cu: 30,
    Ka: 0.406,
    Kp: 2.464,
    K0: 0.577,
    delta: 16.7,
    spt_range: [4, 10],
    bearing_allowable: 75,
  },
  peat: {
    name: "Peat / Organic",
    category: "organic",
    phi: 15,
    gamma: 12,
    gamma_sat: 14,
    gamma_sub: 4,
    c_eff: 2,
    cu: 10,
    Ka: 0.589,
    Kp: 1.698,
    K0: 0.741,
    delta: 10,
    spt_range: [0, 4],
    bearing_allowable: 25,
  },
  rock_weak: {
    name: "Weak Rock",
    category: "rock",
    phi: 35,
    gamma: 22,
    gamma_sat: 23,
    gamma_sub: 13,
    c_eff: 50,
    cu: 500,
    Ka: 0.271,
    Kp: 3.69,
    K0: 0.426,
    delta: 23.3,
    spt_range: [60, 100],
    bearing_allowable: 1000,
  },
  rock_strong: {
    name: "Strong Rock",
    category: "rock",
    phi: 45,
    gamma: 25,
    gamma_sat: 26,
    gamma_sub: 16,
    c_eff: 200,
    cu: 0,
    Ka: 0.172,
    Kp: 5.828,
    K0: 0.293,
    delta: 30,
    spt_range: [100, 200],
    bearing_allowable: 5000,
  },
  made_ground: {
    name: "Made Ground / Fill",
    category: "fill",
    phi: 25,
    gamma: 16,
    gamma_sat: 18,
    gamma_sub: 8,
    c_eff: 0,
    cu: 0,
    Ka: 0.406,
    Kp: 2.464,
    K0: 0.577,
    delta: 16.7,
    spt_range: [0, 10],
    bearing_allowable: 50,
  },
};

// ---------------------------------------------------------------------------
// Ground Presets (for retaining wall / abutment calculators)
// ---------------------------------------------------------------------------

export interface GroundPreset {
  name: string;
  phi: number;
  gamma: number;
  c: number;
  Ka: number;
  Kp: number;
  waterTable: boolean;
}

export const GROUND_PRESETS: Record<string, GroundPreset> = {
  dry_sand: {
    name: "Dry Sand (φ=30°)",
    phi: 30,
    gamma: 18,
    c: 0,
    Ka: 0.333,
    Kp: 3.0,
    waterTable: false,
  },
  wet_sand: {
    name: "Wet Sand (φ=30°)",
    phi: 30,
    gamma: 20,
    c: 0,
    Ka: 0.333,
    Kp: 3.0,
    waterTable: true,
  },
  clay: {
    name: "Stiff Clay (φ=25°)",
    phi: 25,
    gamma: 19,
    c: 10,
    Ka: 0.406,
    Kp: 2.464,
    waterTable: false,
  },
  glacial_till: {
    name: "Glacial Till (φ=32°)",
    phi: 32,
    gamma: 20,
    c: 5,
    Ka: 0.307,
    Kp: 3.255,
    waterTable: false,
  },
  granular_fill: {
    name: "Granular Fill (φ=28°)",
    phi: 28,
    gamma: 17,
    c: 0,
    Ka: 0.361,
    Kp: 2.77,
    waterTable: false,
  },
  rock_fill: {
    name: "Rockfill (φ=40°)",
    phi: 40,
    gamma: 20,
    c: 0,
    Ka: 0.217,
    Kp: 4.599,
    waterTable: false,
  },
};

// ---------------------------------------------------------------------------
// Batter & Slope Soil Presets
// ---------------------------------------------------------------------------

export interface BatterSoilType {
  name: string;
  maxSlope: string;
  description: string;
  phi: number;
  gamma: number;
  c: number;
}

export const BATTER_SOIL_TYPES: BatterSoilType[] = [
  {
    name: "Clean Sand",
    maxSlope: "1:1.5",
    description: "33.7° max angle",
    phi: 30,
    gamma: 18,
    c: 0,
  },
  {
    name: "Sandy Gravel",
    maxSlope: "1:1",
    description: "45° max angle",
    phi: 35,
    gamma: 19,
    c: 0,
  },
  {
    name: "Firm Clay",
    maxSlope: "1:1",
    description: "Short-term 45° max",
    phi: 25,
    gamma: 18,
    c: 10,
  },
  {
    name: "Stiff Clay",
    maxSlope: "1:0.5",
    description: "Short-term 63° max",
    phi: 28,
    gamma: 20,
    c: 20,
  },
  {
    name: "Soft Clay",
    maxSlope: "1:3",
    description: "18° max angle",
    phi: 20,
    gamma: 17,
    c: 5,
  },
  {
    name: "Rock Fill",
    maxSlope: "1:1.25",
    description: "38.7° max angle",
    phi: 38,
    gamma: 20,
    c: 0,
  },
  {
    name: "Made Ground (fill)",
    maxSlope: "1:2",
    description: "26.6° max — variable",
    phi: 25,
    gamma: 16,
    c: 0,
  },
];

// ---------------------------------------------------------------------------
// Allowable Bearing Pressure Table — BS 8004 / typical UK values
// ---------------------------------------------------------------------------

export interface BearingCapacity {
  soilDescription: string;
  /** Allowable bearing pressure (kPa) — presumed values */
  qa: number;
}

export const SOIL_BEARING: BearingCapacity[] = [
  { soilDescription: "Strong igneous / gneiss rock", qa: 10000 },
  { soilDescription: "Strong limestone / sandstone", qa: 4000 },
  { soilDescription: "Schist / slate", qa: 3000 },
  { soilDescription: "Strong shale / mudstone", qa: 2000 },
  { soilDescription: "Weathered rock / soft chalk", qa: 600 },
  { soilDescription: "Dense gravel / dense sand & gravel", qa: 400 },
  { soilDescription: "Medium dense gravel / sand & gravel", qa: 200 },
  { soilDescription: "Loose gravel / sand & gravel", qa: 75 },
  { soilDescription: "Very dense sand", qa: 300 },
  { soilDescription: "Dense sand", qa: 200 },
  { soilDescription: "Medium dense sand", qa: 100 },
  { soilDescription: "Loose sand", qa: 50 },
  { soilDescription: "Hard clay (cu>300kPa)", qa: 450 },
  { soilDescription: "Very stiff clay (cu 150-300kPa)", qa: 300 },
  { soilDescription: "Stiff clay (cu 75-150kPa)", qa: 150 },
  { soilDescription: "Firm clay (cu 40-75kPa)", qa: 75 },
  { soilDescription: "Soft clay (cu 20-40kPa)", qa: 40 },
  { soilDescription: "Very soft clay (cu<20kPa)", qa: 20 },
];

// ---------------------------------------------------------------------------
// Angle of Wall Friction — EN 1997-1 Annex C
// ---------------------------------------------------------------------------

/** EN 1997-1: design wall friction δ = k × φ'd */
export function getWallFriction(phi_d: number, k: number = 2 / 3): number {
  return Math.round(k * phi_d * 10) / 10;
}

// ---------------------------------------------------------------------------
// Earth Pressure Coefficient Helpers
// ---------------------------------------------------------------------------

/** Rankine active coefficient Ka = tan²(45° − φ/2) */
export function calcKa(phi_deg: number): number {
  const phi_rad = (phi_deg * Math.PI) / 180;
  return (
    Math.round(Math.pow(Math.tan(Math.PI / 4 - phi_rad / 2), 2) * 1000) / 1000
  );
}

/** Rankine passive coefficient Kp = tan²(45° + φ/2) */
export function calcKp(phi_deg: number): number {
  const phi_rad = (phi_deg * Math.PI) / 180;
  return (
    Math.round(Math.pow(Math.tan(Math.PI / 4 + phi_rad / 2), 2) * 1000) / 1000
  );
}

/** At-rest coefficient K0 = 1 − sin(φ) (Jaky's formula for normally consolidated) */
export function calcK0(phi_deg: number): number {
  const phi_rad = (phi_deg * Math.PI) / 180;
  return Math.round((1 - Math.sin(phi_rad)) * 1000) / 1000;
}

/** Coulomb active Ka accounting for wall friction and backfill slope */
export function calcCoulombKa(
  phi_deg: number,
  delta_deg: number,
  beta_deg: number = 0,
  alpha_deg: number = 90,
): number {
  const phi = (phi_deg * Math.PI) / 180;
  const delta = (delta_deg * Math.PI) / 180;
  const beta = (beta_deg * Math.PI) / 180;
  const alpha = (alpha_deg * Math.PI) / 180;

  const num = Math.pow(Math.sin(alpha + phi), 2);
  const a = Math.sin(phi + delta) * Math.sin(phi - beta);
  const b = Math.sin(alpha - delta) * Math.sin(alpha + beta);
  const denom =
    Math.pow(Math.sin(alpha), 2) *
    Math.sin(alpha - delta) *
    Math.pow(1 + Math.sqrt(a / b), 2);

  return Math.round((num / denom) * 1000) / 1000;
}
