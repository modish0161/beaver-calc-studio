// =============================================================================
// Centralised Material Grade Database
// =============================================================================
// Canonical source for all structural material properties used across BeaverCalc.
// Data sourced from:
//   - EN 1993-1-1 (Steel)   - EN 10025-2 (Hot-rolled structural steels)
//   - EN 1992-1-1 (Concrete) - EN 206 (Concrete specification)
//   - EN 1995-1-1 (Timber)  - EN 338 (Structural timber strength classes)
//   - EN 10080 (Reinforcing steel)
//
// Usage:
//   import { CONCRETE_GRADES, STEEL_GRADES, TIMBER_GRADES } from '@/data/materialGrades';
// =============================================================================

// ---------------------------------------------------------------------------
// Structural Steel Grades — EN 10025-2 / EN 1993-1-1
// ---------------------------------------------------------------------------

export interface SteelGradeProps {
  /** Display name */
  name: string;
  /** Yield strength fy (MPa) for t ≤ 16 mm — EN 10025-2 Table 7 */
  fy: number;
  /** Yield strength fy (MPa) for 16 < t ≤ 40 mm */
  fy_16_40: number;
  /** Yield strength fy (MPa) for 40 < t ≤ 63 mm */
  fy_40_63: number;
  /** Ultimate tensile strength fu (MPa) — EN 10025-2 Table 7 */
  fu: number;
  /** Weld correlation factor βw — EN 1993-1-8 Table 4.1 */
  betaW: number;
  /** Young's modulus E (MPa) */
  E: number;
  /** Shear modulus G (MPa) */
  G: number;
  /** Poisson's ratio */
  nu: number;
  /** Density (kg/m³) */
  density: number;
  /** Thermal expansion coefficient (per °C) */
  alpha_T: number;
}

export const STEEL_GRADES: Record<string, SteelGradeProps> = {
  S235: {
    name: "S235",
    fy: 235,
    fy_16_40: 225,
    fy_40_63: 215,
    fu: 360,
    betaW: 0.8,
    E: 210000,
    G: 81000,
    nu: 0.3,
    density: 7850,
    alpha_T: 12e-6,
  },
  S275: {
    name: "S275",
    fy: 275,
    fy_16_40: 265,
    fy_40_63: 255,
    fu: 430,
    betaW: 0.85,
    E: 210000,
    G: 81000,
    nu: 0.3,
    density: 7850,
    alpha_T: 12e-6,
  },
  S355: {
    name: "S355",
    fy: 355,
    fy_16_40: 345,
    fy_40_63: 335,
    fu: 510,
    betaW: 0.9,
    E: 210000,
    G: 81000,
    nu: 0.3,
    density: 7850,
    alpha_T: 12e-6,
  },
  S420: {
    name: "S420",
    fy: 420,
    fy_16_40: 400,
    fy_40_63: 390,
    fu: 520,
    betaW: 1.0,
    E: 210000,
    G: 81000,
    nu: 0.3,
    density: 7850,
    alpha_T: 12e-6,
  },
  S450: {
    name: "S450",
    fy: 450,
    fy_16_40: 430,
    fy_40_63: 410,
    fu: 550,
    betaW: 1.0,
    E: 210000,
    G: 81000,
    nu: 0.3,
    density: 7850,
    alpha_T: 12e-6,
  },
  S460: {
    name: "S460",
    fy: 460,
    fy_16_40: 440,
    fy_40_63: 420,
    fu: 570,
    betaW: 1.0,
    E: 210000,
    G: 81000,
    nu: 0.3,
    density: 7850,
    alpha_T: 12e-6,
  },
};

// ---------------------------------------------------------------------------
// Pile Steel Grades — EN 10248 / EN 10219
// ---------------------------------------------------------------------------

export interface PileSteelGradeProps {
  name: string;
  fy: number;
  fu: number;
}

export const PILE_STEEL_GRADES: Record<string, PileSteelGradeProps> = {
  S240GP: { name: "S240GP", fy: 240, fu: 340 },
  S270GP: { name: "S270GP", fy: 270, fu: 410 },
  S320GP: { name: "S320GP", fy: 320, fu: 440 },
  S355GP: { name: "S355GP", fy: 355, fu: 480 },
  S390GP: { name: "S390GP", fy: 390, fu: 490 },
  S430GP: { name: "S430GP", fy: 430, fu: 510 },
};

// ---------------------------------------------------------------------------
// Concrete Grades — EN 1992-1-1 Table 3.1 / EN 206
// ---------------------------------------------------------------------------

export interface ConcreteGradeProps {
  /** Display name e.g. 'C25/30' */
  name: string;
  /** Characteristic cylinder strength fck (MPa) */
  fck: number;
  /** Characteristic cube strength fck,cube (MPa) */
  fck_cube: number;
  /** Mean cylinder compressive strength fcm (MPa) = fck + 8 */
  fcm: number;
  /** Mean axial tensile strength fctm (MPa) — Table 3.1 */
  fctm: number;
  /** 5% fractile axial tensile strength fctk,0.05 (MPa) */
  fctk_005: number;
  /** 95% fractile axial tensile strength fctk,0.95 (MPa) */
  fctk_095: number;
  /** Secant modulus of elasticity Ecm (GPa) — Table 3.1 */
  Ecm: number;
  /** Design compressive strength fcd = αcc × fck / γC (MPa) with αcc=1.0, γC=1.5 */
  fcd: number;
  /** Ultimate compressive strain εcu2 (‰) */
  ecu2: number;
  /** Density (kN/m³) — normal weight */
  density: number;
}

export const CONCRETE_GRADES: Record<string, ConcreteGradeProps> = {
  "C12/15": {
    name: "C12/15",
    fck: 12,
    fck_cube: 15,
    fcm: 20,
    fctm: 1.6,
    fctk_005: 1.1,
    fctk_095: 2.0,
    Ecm: 27,
    fcd: 12 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C16/20": {
    name: "C16/20",
    fck: 16,
    fck_cube: 20,
    fcm: 24,
    fctm: 1.9,
    fctk_005: 1.3,
    fctk_095: 2.5,
    Ecm: 29,
    fcd: 16 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C20/25": {
    name: "C20/25",
    fck: 20,
    fck_cube: 25,
    fcm: 28,
    fctm: 2.2,
    fctk_005: 1.5,
    fctk_095: 2.9,
    Ecm: 30,
    fcd: 20 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C25/30": {
    name: "C25/30",
    fck: 25,
    fck_cube: 30,
    fcm: 33,
    fctm: 2.6,
    fctk_005: 1.8,
    fctk_095: 3.3,
    Ecm: 31,
    fcd: 25 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C28/35": {
    name: "C28/35",
    fck: 28,
    fck_cube: 35,
    fcm: 36,
    fctm: 2.8,
    fctk_005: 1.9,
    fctk_095: 3.6,
    Ecm: 32,
    fcd: 28 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C30/37": {
    name: "C30/37",
    fck: 30,
    fck_cube: 37,
    fcm: 38,
    fctm: 2.9,
    fctk_005: 2.0,
    fctk_095: 3.8,
    Ecm: 33,
    fcd: 30 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C32/40": {
    name: "C32/40",
    fck: 32,
    fck_cube: 40,
    fcm: 40,
    fctm: 3.0,
    fctk_005: 2.1,
    fctk_095: 3.9,
    Ecm: 33.5,
    fcd: 32 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C35/45": {
    name: "C35/45",
    fck: 35,
    fck_cube: 45,
    fcm: 43,
    fctm: 3.2,
    fctk_005: 2.2,
    fctk_095: 4.2,
    Ecm: 34,
    fcd: 35 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C40/50": {
    name: "C40/50",
    fck: 40,
    fck_cube: 50,
    fcm: 48,
    fctm: 3.5,
    fctk_005: 2.5,
    fctk_095: 4.6,
    Ecm: 35,
    fcd: 40 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C45/55": {
    name: "C45/55",
    fck: 45,
    fck_cube: 55,
    fcm: 53,
    fctm: 3.8,
    fctk_005: 2.7,
    fctk_095: 4.9,
    Ecm: 36,
    fcd: 45 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C50/60": {
    name: "C50/60",
    fck: 50,
    fck_cube: 60,
    fcm: 58,
    fctm: 4.1,
    fctk_005: 2.9,
    fctk_095: 5.3,
    Ecm: 37,
    fcd: 50 / 1.5,
    ecu2: 3.5,
    density: 25,
  },
  "C55/67": {
    name: "C55/67",
    fck: 55,
    fck_cube: 67,
    fcm: 63,
    fctm: 4.2,
    fctk_005: 3.0,
    fctk_095: 5.5,
    Ecm: 38,
    fcd: 55 / 1.5,
    ecu2: 3.1,
    density: 25,
  },
  "C60/75": {
    name: "C60/75",
    fck: 60,
    fck_cube: 75,
    fcm: 68,
    fctm: 4.4,
    fctk_005: 3.1,
    fctk_095: 5.7,
    Ecm: 39,
    fcd: 60 / 1.5,
    ecu2: 2.9,
    density: 25,
  },
};

// ---------------------------------------------------------------------------
// Reinforcing Steel — EN 10080 / EN 1992-1-1
// ---------------------------------------------------------------------------

export interface RebarGradeProps {
  name: string;
  /** Characteristic yield strength fyk (MPa) */
  fyk: number;
  /** Design yield strength fyd = fyk / γS (MPa) with γS = 1.15 */
  fyd: number;
  /** Modulus of elasticity Es (MPa) */
  Es: number;
  /** Ductility class */
  ductilityClass: string;
  /** Ratio of tensile to yield strength (ft/fy)k */
  k: number;
}

export const REBAR_GRADES: Record<string, RebarGradeProps> = {
  B500A: {
    name: "B500A",
    fyk: 500,
    fyd: 500 / 1.15,
    Es: 200000,
    ductilityClass: "A",
    k: 1.05,
  },
  B500B: {
    name: "B500B",
    fyk: 500,
    fyd: 500 / 1.15,
    Es: 200000,
    ductilityClass: "B",
    k: 1.08,
  },
  B500C: {
    name: "B500C",
    fyk: 500,
    fyd: 500 / 1.15,
    Es: 200000,
    ductilityClass: "C",
    k: 1.15,
  },
  B400: {
    name: "B400",
    fyk: 400,
    fyd: 400 / 1.15,
    Es: 200000,
    ductilityClass: "A",
    k: 1.05,
  },
};

/** Standard rebar bar sizes available in the UK (mm) */
export const REBAR_SIZES = [6, 8, 10, 12, 16, 20, 25, 32, 40] as const;

/** Cross-sectional area for a single rebar (mm²) */
export const REBAR_AREA: Record<number, number> = {
  6: 28.3,
  8: 50.3,
  10: 78.5,
  12: 113.1,
  16: 201.1,
  20: 314.2,
  25: 490.9,
  32: 804.2,
  40: 1256.6,
};

// ---------------------------------------------------------------------------
// Timber Grades — EN 338:2016 (Softwood, Hardwood, Glulam)
// ---------------------------------------------------------------------------

export interface TimberGradeProps {
  /** Display name */
  name: string;
  /** Type: softwood | hardwood | glulam */
  type: "softwood" | "hardwood" | "glulam";
  /** Characteristic bending strength fm,k (MPa) */
  fm_k: number;
  /** Characteristic tension parallel ft,0,k (MPa) */
  ft_0_k: number;
  /** Characteristic tension perpendicular ft,90,k (MPa) */
  ft_90_k: number;
  /** Characteristic compression parallel fc,0,k (MPa) */
  fc_0_k: number;
  /** Characteristic compression perpendicular fc,90,k (MPa) */
  fc_90_k: number;
  /** Characteristic shear strength fv,k (MPa) */
  fv_k: number;
  /** Mean modulus of elasticity parallel E0,mean (MPa) */
  E_mean: number;
  /** 5th percentile modulus E0,05 (MPa) */
  E_05: number;
  /** Mean shear modulus Gmean (MPa) */
  G_mean: number;
  /** Characteristic density ρk (kg/m³) */
  rho_k: number;
  /** Mean density ρmean (kg/m³) */
  rho_mean: number;
}

export const TIMBER_GRADES: Record<string, TimberGradeProps> = {
  // Softwood — EN 338 Table 1
  C14: {
    name: "C14",
    type: "softwood",
    fm_k: 14,
    ft_0_k: 7.2,
    ft_90_k: 0.4,
    fc_0_k: 16,
    fc_90_k: 2.0,
    fv_k: 3.0,
    E_mean: 7000,
    E_05: 4700,
    G_mean: 440,
    rho_k: 290,
    rho_mean: 350,
  },
  C16: {
    name: "C16",
    type: "softwood",
    fm_k: 16,
    ft_0_k: 8.5,
    ft_90_k: 0.4,
    fc_0_k: 17,
    fc_90_k: 2.2,
    fv_k: 3.2,
    E_mean: 8000,
    E_05: 5400,
    G_mean: 500,
    rho_k: 310,
    rho_mean: 370,
  },
  C18: {
    name: "C18",
    type: "softwood",
    fm_k: 18,
    ft_0_k: 10,
    ft_90_k: 0.4,
    fc_0_k: 18,
    fc_90_k: 2.2,
    fv_k: 3.4,
    E_mean: 9000,
    E_05: 6000,
    G_mean: 560,
    rho_k: 320,
    rho_mean: 380,
  },
  C22: {
    name: "C22",
    type: "softwood",
    fm_k: 22,
    ft_0_k: 13,
    ft_90_k: 0.4,
    fc_0_k: 20,
    fc_90_k: 2.4,
    fv_k: 3.8,
    E_mean: 10000,
    E_05: 6700,
    G_mean: 630,
    rho_k: 340,
    rho_mean: 410,
  },
  C24: {
    name: "C24",
    type: "softwood",
    fm_k: 24,
    ft_0_k: 14.5,
    ft_90_k: 0.4,
    fc_0_k: 21,
    fc_90_k: 2.5,
    fv_k: 4.0,
    E_mean: 11000,
    E_05: 7400,
    G_mean: 690,
    rho_k: 350,
    rho_mean: 420,
  },
  C27: {
    name: "C27",
    type: "softwood",
    fm_k: 27,
    ft_0_k: 16.5,
    ft_90_k: 0.4,
    fc_0_k: 22,
    fc_90_k: 2.6,
    fv_k: 4.0,
    E_mean: 11500,
    E_05: 7700,
    G_mean: 720,
    rho_k: 370,
    rho_mean: 450,
  },
  C30: {
    name: "C30",
    type: "softwood",
    fm_k: 30,
    ft_0_k: 18,
    ft_90_k: 0.4,
    fc_0_k: 23,
    fc_90_k: 2.7,
    fv_k: 4.0,
    E_mean: 12000,
    E_05: 8000,
    G_mean: 750,
    rho_k: 380,
    rho_mean: 460,
  },
  C35: {
    name: "C35",
    type: "softwood",
    fm_k: 35,
    ft_0_k: 21,
    ft_90_k: 0.4,
    fc_0_k: 25,
    fc_90_k: 2.8,
    fv_k: 4.0,
    E_mean: 13000,
    E_05: 8700,
    G_mean: 810,
    rho_k: 400,
    rho_mean: 480,
  },
  C40: {
    name: "C40",
    type: "softwood",
    fm_k: 40,
    ft_0_k: 24,
    ft_90_k: 0.4,
    fc_0_k: 26,
    fc_90_k: 2.9,
    fv_k: 4.0,
    E_mean: 14000,
    E_05: 9400,
    G_mean: 880,
    rho_k: 420,
    rho_mean: 500,
  },

  // Hardwood — EN 338 Table 2
  D18: {
    name: "D18 (Hardwood)",
    type: "hardwood",
    fm_k: 18,
    ft_0_k: 11,
    ft_90_k: 0.6,
    fc_0_k: 18,
    fc_90_k: 7.5,
    fv_k: 3.4,
    E_mean: 9500,
    E_05: 8000,
    G_mean: 600,
    rho_k: 475,
    rho_mean: 570,
  },
  D24: {
    name: "D24 (Hardwood)",
    type: "hardwood",
    fm_k: 24,
    ft_0_k: 14,
    ft_90_k: 0.6,
    fc_0_k: 21,
    fc_90_k: 7.8,
    fv_k: 4.0,
    E_mean: 10000,
    E_05: 8400,
    G_mean: 630,
    rho_k: 485,
    rho_mean: 580,
  },
  D30: {
    name: "D30 (Hardwood)",
    type: "hardwood",
    fm_k: 30,
    ft_0_k: 18,
    ft_90_k: 0.6,
    fc_0_k: 23,
    fc_90_k: 8.0,
    fv_k: 3.0,
    E_mean: 10000,
    E_05: 8000,
    G_mean: 640,
    rho_k: 530,
    rho_mean: 640,
  },
  D35: {
    name: "D35 (Hardwood)",
    type: "hardwood",
    fm_k: 35,
    ft_0_k: 21,
    ft_90_k: 0.6,
    fc_0_k: 25,
    fc_90_k: 8.4,
    fv_k: 4.0,
    E_mean: 10000,
    E_05: 8700,
    G_mean: 650,
    rho_k: 540,
    rho_mean: 650,
  },
  D40: {
    name: "D40 (Hardwood)",
    type: "hardwood",
    fm_k: 40,
    ft_0_k: 24,
    ft_90_k: 0.6,
    fc_0_k: 26,
    fc_90_k: 8.8,
    fv_k: 4.0,
    E_mean: 11000,
    E_05: 9400,
    G_mean: 700,
    rho_k: 550,
    rho_mean: 660,
  },
  D50: {
    name: "D50 (Hardwood)",
    type: "hardwood",
    fm_k: 50,
    ft_0_k: 30,
    ft_90_k: 0.6,
    fc_0_k: 29,
    fc_90_k: 9.7,
    fv_k: 4.0,
    E_mean: 14000,
    E_05: 11800,
    G_mean: 880,
    rho_k: 620,
    rho_mean: 750,
  },
  D60: {
    name: "D60 (Hardwood)",
    type: "hardwood",
    fm_k: 60,
    ft_0_k: 36,
    ft_90_k: 0.6,
    fc_0_k: 32,
    fc_90_k: 10.5,
    fv_k: 4.5,
    E_mean: 17000,
    E_05: 14300,
    G_mean: 1060,
    rho_k: 700,
    rho_mean: 840,
  },
  D70: {
    name: "D70 (Hardwood)",
    type: "hardwood",
    fm_k: 70,
    ft_0_k: 42,
    ft_90_k: 0.6,
    fc_0_k: 34,
    fc_90_k: 13.5,
    fv_k: 5.0,
    E_mean: 20000,
    E_05: 16800,
    G_mean: 1250,
    rho_k: 900,
    rho_mean: 1080,
  },

  // Glulam — EN 14080:2013
  GL20h: {
    name: "GL20h (Glulam)",
    type: "glulam",
    fm_k: 20,
    ft_0_k: 16,
    ft_90_k: 0.5,
    fc_0_k: 20,
    fc_90_k: 2.5,
    fv_k: 3.5,
    E_mean: 8400,
    E_05: 7000,
    G_mean: 540,
    rho_k: 340,
    rho_mean: 370,
  },
  GL22h: {
    name: "GL22h (Glulam)",
    type: "glulam",
    fm_k: 22,
    ft_0_k: 17.6,
    ft_90_k: 0.5,
    fc_0_k: 22,
    fc_90_k: 2.5,
    fv_k: 3.5,
    E_mean: 10500,
    E_05: 8800,
    G_mean: 650,
    rho_k: 370,
    rho_mean: 410,
  },
  GL24h: {
    name: "GL24h (Glulam)",
    type: "glulam",
    fm_k: 24,
    ft_0_k: 19.2,
    ft_90_k: 0.5,
    fc_0_k: 24,
    fc_90_k: 2.5,
    fv_k: 3.5,
    E_mean: 11500,
    E_05: 9600,
    G_mean: 720,
    rho_k: 385,
    rho_mean: 420,
  },
  GL26h: {
    name: "GL26h (Glulam)",
    type: "glulam",
    fm_k: 26,
    ft_0_k: 20.8,
    ft_90_k: 0.5,
    fc_0_k: 26,
    fc_90_k: 2.5,
    fv_k: 3.5,
    E_mean: 12100,
    E_05: 10100,
    G_mean: 760,
    rho_k: 405,
    rho_mean: 440,
  },
  GL28h: {
    name: "GL28h (Glulam)",
    type: "glulam",
    fm_k: 28,
    ft_0_k: 22.4,
    ft_90_k: 0.5,
    fc_0_k: 28,
    fc_90_k: 2.5,
    fv_k: 3.5,
    E_mean: 12600,
    E_05: 10500,
    G_mean: 780,
    rho_k: 425,
    rho_mean: 460,
  },
  GL30h: {
    name: "GL30h (Glulam)",
    type: "glulam",
    fm_k: 30,
    ft_0_k: 24,
    ft_90_k: 0.5,
    fc_0_k: 30,
    fc_90_k: 2.5,
    fv_k: 3.5,
    E_mean: 13600,
    E_05: 11300,
    G_mean: 850,
    rho_k: 430,
    rho_mean: 480,
  },
  GL32h: {
    name: "GL32h (Glulam)",
    type: "glulam",
    fm_k: 32,
    ft_0_k: 25.6,
    ft_90_k: 0.5,
    fc_0_k: 32,
    fc_90_k: 2.5,
    fv_k: 3.5,
    E_mean: 14200,
    E_05: 11800,
    G_mean: 890,
    rho_k: 440,
    rho_mean: 490,
  },
};

// ---------------------------------------------------------------------------
// Timber kmod Modification Factor — EN 1995-1-1 Table 3.1
// Keys are load duration class, values are kmod per service class (1, 2, 3)
// ---------------------------------------------------------------------------

export const TIMBER_KMOD: Record<string, Record<string, number>> = {
  permanent: { "1": 0.6, "2": 0.6, "3": 0.5 },
  long_term: { "1": 0.7, "2": 0.7, "3": 0.55 },
  medium_term: { "1": 0.8, "2": 0.8, "3": 0.65 },
  short_term: { "1": 0.9, "2": 0.9, "3": 0.7 },
  instantaneous: { "1": 1.1, "2": 1.1, "3": 0.9 },
};

/** kdef deformation factor — EN 1995-1-1 Table 3.2 (solid timber) */
export const TIMBER_KDEF: Record<string, number> = {
  "1": 0.6,
  "2": 0.8,
  "3": 2.0,
};

/** Partial safety factor for timber γM — EN 1995-1-1 Table 2.3 */
export const TIMBER_GAMMA_M: Record<string, number> = {
  solid_timber: 1.3,
  glulam: 1.25,
  lvl: 1.2,
  connections: 1.3,
};

// ---------------------------------------------------------------------------
// Lightweight / Heavy Concrete Types
// ---------------------------------------------------------------------------

export interface ConcreteTypeProps {
  name: string;
  density: number;
  description: string;
}

export const CONCRETE_TYPES: Record<string, ConcreteTypeProps> = {
  normal: {
    name: "Normal Weight Concrete",
    density: 24,
    description: "24 kN/m³",
  },
  lightweight: {
    name: "Lightweight Concrete",
    density: 18,
    description: "18 kN/m³",
  },
  heavy: {
    name: "Heavy Weight Concrete",
    density: 28,
    description: "28 kN/m³",
  },
  scc: {
    name: "Self-Compacting Concrete",
    density: 24,
    description: "SCC — Full hydrostatic",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get steel yield strength for a given thickness bracket */
export function getSteelFy(grade: string, thickness_mm: number): number {
  const g = STEEL_GRADES[grade];
  if (!g) return 275;
  if (thickness_mm <= 16) return g.fy;
  if (thickness_mm <= 40) return g.fy_16_40;
  return g.fy_40_63;
}
