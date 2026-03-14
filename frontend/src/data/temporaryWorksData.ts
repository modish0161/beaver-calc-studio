// =============================================================================
// Centralised Temporary Works Database
// =============================================================================
// Canonical source for all temporary works data used across BeaverCalc.
// Data sourced from:
//   - CIRIA C660 (Early-age thermal crack control in concrete)
//   - BS 5975 (Code of practice for temporary works)
//   - CIRIA R108 (Concrete pressure on formwork)
//   - BS EN 12812 (Falsework)
//   - DMRB CD 350 (Access ramps & haul roads on construction sites)
//   - BS 8004 (Foundations — temporary platforms)
//
// Usage:
//   import { PLANT_TYPES, FORMWORK_TYPES, ACCESS_RAMP_MATERIALS } from '@/data/temporaryWorksData';
// =============================================================================

// ---------------------------------------------------------------------------
// Plant / Vehicle Types — for access ramp & platform design
// ---------------------------------------------------------------------------

export interface PlantTypeProps {
  /** Display name */
  name: string;
  /** Total gross weight (kN) */
  weight: number;
  /** Track / wheel axle load (kN) */
  axleLoad: number;
  /** Ground contact pressure (kPa) — tracked or tyred */
  contactPressure: number;
  /** Width (m) */
  width: number;
  /** Track / tyre type */
  type: "tracked" | "wheeled";
  /** Description */
  description: string;
}

export const PLANT_TYPES: Record<string, PlantTypeProps> = {
  // Tracked excavators
  excavator_8t: {
    name: "8t Mini Excavator",
    weight: 80,
    axleLoad: 40,
    contactPressure: 28,
    width: 2.2,
    type: "tracked",
    description: "JCB 85Z / Cat 308",
  },
  excavator_14t: {
    name: "14t Excavator",
    weight: 140,
    axleLoad: 70,
    contactPressure: 35,
    width: 2.5,
    type: "tracked",
    description: "Cat 314 / Komatsu PC138",
  },
  excavator_22t: {
    name: "22t Excavator",
    weight: 220,
    axleLoad: 110,
    contactPressure: 42,
    width: 2.9,
    type: "tracked",
    description: "Cat 320 / Komatsu PC210",
  },
  excavator_30t: {
    name: "30t Excavator",
    weight: 300,
    axleLoad: 150,
    contactPressure: 48,
    width: 3.2,
    type: "tracked",
    description: "Cat 330 / Komatsu PC290",
  },
  excavator_45t: {
    name: "45t Excavator",
    weight: 450,
    axleLoad: 225,
    contactPressure: 55,
    width: 3.4,
    type: "tracked",
    description: "Cat 345 / Komatsu PC450",
  },
  excavator_80t: {
    name: "80t Excavator",
    weight: 800,
    axleLoad: 400,
    contactPressure: 70,
    width: 3.8,
    type: "tracked",
    description: "Cat 374 / Komatsu PC800",
  },

  // Cranes
  crane_25t: {
    name: "25t Mobile Crane",
    weight: 280,
    axleLoad: 70,
    contactPressure: 200,
    width: 2.5,
    type: "wheeled",
    description: "Outrigger pad pressure ~200 kPa",
  },
  crane_50t: {
    name: "50t Mobile Crane",
    weight: 420,
    axleLoad: 105,
    contactPressure: 250,
    width: 2.7,
    type: "wheeled",
    description: "Outrigger pad pressure ~250 kPa",
  },
  crane_100t: {
    name: "100t Mobile Crane",
    weight: 650,
    axleLoad: 163,
    contactPressure: 350,
    width: 2.9,
    type: "wheeled",
    description: "Outrigger pad pressure ~350 kPa",
  },
  crane_200t: {
    name: "200t Mobile Crane",
    weight: 960,
    axleLoad: 240,
    contactPressure: 450,
    width: 3.0,
    type: "wheeled",
    description: "Outrigger pad pressure ~450 kPa",
  },
  crane_350t: {
    name: "350t Crawler Crane",
    weight: 1500,
    axleLoad: 750,
    contactPressure: 120,
    width: 5.5,
    type: "tracked",
    description: "LR1350 class",
  },

  // Wheeled vehicles
  dumper_6t: {
    name: "6t Site Dumper",
    weight: 95,
    axleLoad: 55,
    contactPressure: 200,
    width: 2.0,
    type: "wheeled",
    description: "Thwaites / Terex 6t",
  },
  dumper_30t: {
    name: "30t Articulated Dump Truck",
    weight: 450,
    axleLoad: 225,
    contactPressure: 250,
    width: 3.0,
    type: "wheeled",
    description: "Cat 730 / Volvo A30",
  },
  lorry_rigid: {
    name: "Rigid HGV (26t)",
    weight: 260,
    axleLoad: 100,
    contactPressure: 200,
    width: 2.5,
    type: "wheeled",
    description: "8-wheel rigid tipper",
  },
  lorry_artic: {
    name: "Articulated HGV (44t)",
    weight: 440,
    axleLoad: 100,
    contactPressure: 200,
    width: 2.5,
    type: "wheeled",
    description: "Standard 6-axle artic",
  },
  concrete_mixer: {
    name: "Concrete Mixer Truck",
    weight: 320,
    axleLoad: 100,
    contactPressure: 210,
    width: 2.5,
    type: "wheeled",
    description: "8m³ readymix truck",
  },
  telehandler: {
    name: "Telehandler",
    weight: 120,
    axleLoad: 60,
    contactPressure: 150,
    width: 2.3,
    type: "wheeled",
    description: "JCB 540 / Manitou MLT",
  },
  piling_rig: {
    name: "CFA Piling Rig",
    weight: 800,
    axleLoad: 400,
    contactPressure: 90,
    width: 3.5,
    type: "tracked",
    description: "Bauer BG28 / Soilmec SR-75",
  },
};

// ---------------------------------------------------------------------------
// Access Ramp / Haul Road Materials
// ---------------------------------------------------------------------------

export interface RampMaterialProps {
  name: string;
  /** CBR value (%) */
  cbr: number;
  /** Typical thickness range [min, max] (mm) */
  thicknessRange: [number, number];
  /** Typical unit weight (kN/m³) */
  unitWeight: number;
  /** Description */
  description: string;
}

export const ACCESS_RAMP_MATERIALS: Record<string, RampMaterialProps> = {
  type_1: {
    name: "Type 1 Sub-base",
    cbr: 30,
    thicknessRange: [150, 300],
    unitWeight: 20,
    description: "Crushed rock sub-base to Spec. for Highways Works clause 803",
  },
  type_3: {
    name: "Type 3 Open-graded",
    cbr: 25,
    thicknessRange: [150, 300],
    unitWeight: 18,
    description: "Open-graded aggregate, permits drainage",
  },
  recycled_6f2: {
    name: "6F2 Recycled Aggregate",
    cbr: 20,
    thicknessRange: [200, 400],
    unitWeight: 18,
    description: "Recycled concrete or mixed aggregate fill",
  },
  crushed_concrete: {
    name: "Crushed Concrete",
    cbr: 25,
    thicknessRange: [150, 300],
    unitWeight: 19,
    description: "Recycled 6F5 crushed concrete",
  },
  as_dug_gravel: {
    name: "As-Dug Gravel",
    cbr: 15,
    thicknessRange: [200, 400],
    unitWeight: 18,
    description: "Natural granular material",
  },
  hardcore: {
    name: "Hardcore",
    cbr: 10,
    thicknessRange: [200, 400],
    unitWeight: 17,
    description: "Brick / demolition rubble",
  },
  geogrid_improved: {
    name: "Geogrid + Type 1",
    cbr: 30,
    thicknessRange: [100, 250],
    unitWeight: 20,
    description: "Geogrid-reinforced sub-base (reduced thickness)",
  },
};

// ---------------------------------------------------------------------------
// Maximum Ramp Gradients
// ---------------------------------------------------------------------------

export interface RampGradient {
  gradient: string;
  ratio: number;
  angle_deg: number;
  description: string;
}

export const RAMP_GRADIENTS: RampGradient[] = [
  {
    gradient: "1:20",
    ratio: 1 / 20,
    angle_deg: 2.86,
    description: "Pedestrian access (DDA compliant)",
  },
  {
    gradient: "1:12",
    ratio: 1 / 12,
    angle_deg: 4.76,
    description: "Maximum for wheelchair access",
  },
  {
    gradient: "1:10",
    ratio: 1 / 10,
    angle_deg: 5.71,
    description: "Maximum for wheeled plant (recommended)",
  },
  {
    gradient: "1:8",
    ratio: 1 / 8,
    angle_deg: 7.13,
    description: "Steep temporary access (tracked plant)",
  },
  {
    gradient: "1:6",
    ratio: 1 / 6,
    angle_deg: 9.46,
    description: "Maximum for tracked plant only",
  },
  {
    gradient: "1:5",
    ratio: 1 / 5,
    angle_deg: 11.31,
    description: "Very steep — special assessment required",
  },
  {
    gradient: "1:4",
    ratio: 1 / 4,
    angle_deg: 14.04,
    description: "Maximum absolute for crawlers",
  },
  {
    gradient: "1:3",
    ratio: 1 / 3,
    angle_deg: 18.43,
    description: "Impractical — for batter calculations only",
  },
];

// ---------------------------------------------------------------------------
// Formwork / Concrete Pressure Data — CIRIA R108 / CIRIA C660
// ---------------------------------------------------------------------------

export interface FormworkTypeProps {
  name: string;
  /** Maximum concrete pressure (kPa) for full hydrostatic head */
  maxPressure: "hydrostatic" | number;
  /** Stiffness factor */
  stiffness: "rigid" | "flexible" | "semi-rigid";
  /** Reuse count before replacement */
  maxReuses: number;
  /** Description */
  description: string;
}

export const FORMWORK_TYPES: Record<string, FormworkTypeProps> = {
  plywood: {
    name: "Plywood Formwork",
    maxPressure: "hydrostatic",
    stiffness: "semi-rigid",
    maxReuses: 10,
    description: "Birch ply 18mm panels — most common for walls/columns",
  },
  steel: {
    name: "Steel Formwork",
    maxPressure: "hydrostatic",
    stiffness: "rigid",
    maxReuses: 200,
    description: "Proprietary steel panels — PERI, Doka, RMD",
  },
  aluminium: {
    name: "Aluminium Formwork",
    maxPressure: "hydrostatic",
    stiffness: "rigid",
    maxReuses: 150,
    description: "Lightweight aluminium systems",
  },
  insulating: {
    name: "Insulating (ICF)",
    maxPressure: 50,
    stiffness: "flexible",
    maxReuses: 1,
    description:
      "Insulating concrete formwork — permanent, limited pour height",
  },
  slipform: {
    name: "Slipform",
    maxPressure: 30,
    stiffness: "rigid",
    maxReuses: 1000,
    description: "Continuously moving formwork for cores / chimneys",
  },
};

// ---------------------------------------------------------------------------
// Concrete Pour Rate Categories — CIRIA R108 Method
// ---------------------------------------------------------------------------

export interface PourRateCategory {
  name: string;
  /** Pour rate (m/hr) */
  rate: number;
  /** Concrete temperature during pour (°C) */
  tempRange: string;
  /** Use factor for pressure calculation */
  description: string;
}

export const POUR_RATES: PourRateCategory[] = [
  {
    name: "Very Slow",
    rate: 0.5,
    tempRange: "> 15°C",
    description: "Small pours, hand-placed",
  },
  {
    name: "Slow",
    rate: 1.0,
    tempRange: "> 10°C",
    description: "Standard wall pours",
  },
  {
    name: "Normal",
    rate: 2.0,
    tempRange: "5-15°C",
    description: "Typical concrete pours",
  },
  {
    name: "Fast",
    rate: 3.0,
    tempRange: "< 10°C",
    description: "Pumped concrete, large pours",
  },
  {
    name: "Very Fast",
    rate: 5.0,
    tempRange: "< 5°C",
    description: "SCC or rapid pumped pours",
  },
  {
    name: "SCC / Full",
    rate: 10.0,
    tempRange: "Any",
    description: "Self-compacting — full hydrostatic",
  },
];

// ---------------------------------------------------------------------------
// Bog / Timber Mat Data — for crane / piling platform design
// ---------------------------------------------------------------------------

export interface BogMatProps {
  name: string;
  /** Length (m) */
  length: number;
  /** Width (m) */
  width: number;
  /** Thickness (mm) */
  thickness: number;
  /** Weight per mat (kg) */
  weight: number;
  /** Safe working load — point (kN) */
  swl_point: number;
  /** Safe working load — UDL (kPa) */
  swl_udl: number;
  /** Material */
  material: "hardwood" | "softwood" | "composite" | "steel";
}

export const BOG_MATS: Record<string, BogMatProps> = {
  standard: {
    name: "Standard Hardwood Bog Mat",
    length: 3.0,
    width: 1.0,
    thickness: 150,
    weight: 350,
    swl_point: 150,
    swl_udl: 50,
    material: "hardwood",
  },
  large: {
    name: "Large Hardwood Bog Mat",
    length: 4.0,
    width: 1.2,
    thickness: 200,
    weight: 700,
    swl_point: 250,
    swl_udl: 60,
    material: "hardwood",
  },
  extra_heavy: {
    name: "Extra Heavy Hardwood",
    length: 4.5,
    width: 1.2,
    thickness: 250,
    weight: 1000,
    swl_point: 350,
    swl_udl: 75,
    material: "hardwood",
  },
  emtek: {
    name: "EmTek Composite Mat",
    length: 2.4,
    width: 1.2,
    thickness: 100,
    weight: 200,
    swl_point: 350,
    swl_udl: 80,
    material: "composite",
  },
  steel_plate: {
    name: "Steel Road Plate",
    length: 2.4,
    width: 1.2,
    thickness: 25,
    weight: 570,
    swl_point: 500,
    swl_udl: 150,
    material: "steel",
  },
  softwood_mat: {
    name: "Softwood Sleeper Mat",
    length: 2.6,
    width: 0.25,
    thickness: 125,
    weight: 50,
    swl_point: 50,
    swl_udl: 25,
    material: "softwood",
  },
};

// ---------------------------------------------------------------------------
// Temporary Propping / Shoring Data
// ---------------------------------------------------------------------------

export interface PropTypeProps {
  name: string;
  /** Maximum capacity (kN) */
  maxCapacity: number;
  /** Extension range [min, max] (m) */
  extensionRange: [number, number];
  /** Weight (kg) */
  weight: number;
}

export const PROP_TYPES: Record<string, PropTypeProps> = {
  acrow_no0: {
    name: "Acrow Prop No. 0",
    maxCapacity: 34,
    extensionRange: [1.04, 1.83],
    weight: 12,
  },
  acrow_no1: {
    name: "Acrow Prop No. 1",
    maxCapacity: 34,
    extensionRange: [1.75, 3.12],
    weight: 17,
  },
  acrow_no2: {
    name: "Acrow Prop No. 2",
    maxCapacity: 34,
    extensionRange: [1.98, 3.35],
    weight: 19,
  },
  acrow_no3: {
    name: "Acrow Prop No. 3",
    maxCapacity: 34,
    extensionRange: [2.59, 3.96],
    weight: 22,
  },
  acrow_no4: {
    name: "Acrow Prop No. 4",
    maxCapacity: 20,
    extensionRange: [3.2, 4.88],
    weight: 27,
  },
  mega_brace: {
    name: "Mega Brace",
    maxCapacity: 100,
    extensionRange: [2.0, 5.0],
    weight: 80,
  },
  hydraulic: {
    name: "Hydraulic Prop 500",
    maxCapacity: 500,
    extensionRange: [2.0, 6.0],
    weight: 250,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate formwork pressure using CIRIA R108 simplified method */
export function calcFormworkPressure(
  pourRate_m_hr: number,
  concreteDensity_kN_m3: number = 25,
  concreteTemp_C: number = 15,
  cementType: "R" | "N" | "S" = "N",
): number {
  // CIRIA R108: Pmax = C₁√R + C₂K√(H-C₁√R/γc)
  // Simplified for initial design: P = Dconc × min(H, C1 × √R)
  // Where C1 depends on cement type and temperature
  const C1_map: Record<string, number> = { R: 1.0, N: 1.15, S: 1.45 };
  const C1 = C1_map[cementType];
  const tempFactor = Math.max(0.5, Math.sqrt(36 / (concreteTemp_C + 16)));
  const effectiveHead = C1 * tempFactor * Math.sqrt(pourRate_m_hr);
  return Math.round(concreteDensity_kN_m3 * effectiveHead * 10) / 10;
}
