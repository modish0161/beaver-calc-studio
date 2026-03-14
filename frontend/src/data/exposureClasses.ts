// =============================================================================
// Centralised Exposure & Durability Database
// =============================================================================
// Canonical source for concrete exposure classification, crack width limits,
// and durability requirements across BeaverCalc.
// Data sourced from:
//   - EN 1992-1-1 (Design of concrete structures)
//   - EN 206 (Concrete — specification, performance, production)
//   - BS 8500-1 (Complementary British Standard to EN 206)
//   - PD 6687 (Background paper to UK NA to EC2)
//
// Usage:
//   import { EXPOSURE_CLASSES, CRACK_WIDTH_LIMITS } from '@/data/exposureClasses';
// =============================================================================

// ---------------------------------------------------------------------------
// Exposure Classes — EN 206 / BS 8500-1
// ---------------------------------------------------------------------------

export interface ExposureClassProps {
  /** Class designation e.g. 'XC1' */
  code: string;
  /** Deterioration mechanism */
  mechanism:
    | "none"
    | "carbonation"
    | "chloride"
    | "chloride_seawater"
    | "freeze_thaw"
    | "chemical";
  /** Short description */
  description: string;
  /** Detailed environment description */
  environment: string;
  /** Recommended limiting crack width wmax (mm) — EN 1992-1-1 Table 7.1N (quasi-permanent) */
  wmax: number;
  /** Minimum concrete strength class per BS 8500-1 */
  minStrengthClass: string;
  /** Maximum w/c ratio per BS 8500-1 */
  maxWcRatio: number;
  /** Minimum cement content (kg/m³) per BS 8500-1 */
  minCementContent: number;
  /** Min cover cmin,dur for 50yr (mm) — S4 structural class */
  minCover_50yr: number;
  /** Min cover cmin,dur for 100yr (mm) — S6 structural class */
  minCover_100yr: number;
}

export const EXPOSURE_CLASSES: Record<string, ExposureClassProps> = {
  X0: {
    code: "X0",
    mechanism: "none",
    description: "No risk of corrosion or attack",
    environment: "Very dry — unreinforced concrete without freeze/thaw",
    wmax: 0.4,
    minStrengthClass: "C12/15",
    maxWcRatio: 0.7,
    minCementContent: 240,
    minCover_50yr: 10,
    minCover_100yr: 15,
  },
  XC1: {
    code: "XC1",
    mechanism: "carbonation",
    description: "Carbonation — dry or permanently wet",
    environment:
      "Inside buildings with low humidity; concrete permanently submerged in water",
    wmax: 0.4,
    minStrengthClass: "C20/25",
    maxWcRatio: 0.65,
    minCementContent: 260,
    minCover_50yr: 15,
    minCover_100yr: 20,
  },
  XC2: {
    code: "XC2",
    mechanism: "carbonation",
    description: "Carbonation — wet, rarely dry",
    environment: "Long-term water contact; foundations",
    wmax: 0.3,
    minStrengthClass: "C25/30",
    maxWcRatio: 0.6,
    minCementContent: 280,
    minCover_50yr: 25,
    minCover_100yr: 30,
  },
  XC3: {
    code: "XC3",
    mechanism: "carbonation",
    description: "Carbonation — moderate humidity",
    environment:
      "Inside buildings with moderate or high humidity; external concrete sheltered from rain",
    wmax: 0.3,
    minStrengthClass: "C28/35",
    maxWcRatio: 0.55,
    minCementContent: 300,
    minCover_50yr: 25,
    minCover_100yr: 30,
  },
  XC4: {
    code: "XC4",
    mechanism: "carbonation",
    description: "Carbonation — cyclic wet and dry",
    environment: "Concrete surfaces subject to water contact, not XC2",
    wmax: 0.3,
    minStrengthClass: "C30/37",
    maxWcRatio: 0.55,
    minCementContent: 300,
    minCover_50yr: 30,
    minCover_100yr: 35,
  },
  XD1: {
    code: "XD1",
    mechanism: "chloride",
    description: "Chloride-induced — moderate humidity",
    environment:
      "Surfaces exposed to airborne chlorides (bridge decks, car parks)",
    wmax: 0.3,
    minStrengthClass: "C32/40",
    maxWcRatio: 0.5,
    minCementContent: 320,
    minCover_50yr: 35,
    minCover_100yr: 40,
  },
  XD2: {
    code: "XD2",
    mechanism: "chloride",
    description: "Chloride-induced — wet, rarely dry",
    environment: "Swimming pools, chloride-bearing industrial waters",
    wmax: 0.3,
    minStrengthClass: "C32/40",
    maxWcRatio: 0.5,
    minCementContent: 320,
    minCover_50yr: 40,
    minCover_100yr: 45,
  },
  XD3: {
    code: "XD3",
    mechanism: "chloride",
    description: "Chloride-induced — cyclic wet and dry",
    environment: "Bridge parts exposed to spray; pavements, car park slabs",
    wmax: 0.2,
    minStrengthClass: "C35/45",
    maxWcRatio: 0.45,
    minCementContent: 340,
    minCover_50yr: 45,
    minCover_100yr: 50,
  },
  XS1: {
    code: "XS1",
    mechanism: "chloride_seawater",
    description: "Seawater chlorides — exposed to airborne salt",
    environment: "Structures near to or on the coast",
    wmax: 0.3,
    minStrengthClass: "C32/40",
    maxWcRatio: 0.5,
    minCementContent: 320,
    minCover_50yr: 35,
    minCover_100yr: 40,
  },
  XS2: {
    code: "XS2",
    mechanism: "chloride_seawater",
    description: "Seawater chlorides — permanently submerged",
    environment: "Parts of marine structures permanently submerged",
    wmax: 0.3,
    minStrengthClass: "C35/45",
    maxWcRatio: 0.45,
    minCementContent: 340,
    minCover_50yr: 40,
    minCover_100yr: 45,
  },
  XS3: {
    code: "XS3",
    mechanism: "chloride_seawater",
    description: "Seawater chlorides — tidal, splash, spray",
    environment: "Tidal, splash and spray zones",
    wmax: 0.2,
    minStrengthClass: "C35/45",
    maxWcRatio: 0.45,
    minCementContent: 340,
    minCover_50yr: 45,
    minCover_100yr: 50,
  },
  XF1: {
    code: "XF1",
    mechanism: "freeze_thaw",
    description: "Freeze/thaw — moderate saturation, no de-icing",
    environment: "Vertical concrete surfaces exposed to rain and freezing",
    wmax: 0.3,
    minStrengthClass: "C28/35",
    maxWcRatio: 0.55,
    minCementContent: 300,
    minCover_50yr: 25,
    minCover_100yr: 30,
  },
  XF2: {
    code: "XF2",
    mechanism: "freeze_thaw",
    description: "Freeze/thaw — moderate saturation, with de-icing",
    environment:
      "Vertical concrete surfaces of road structures exposed to de-icing agents",
    wmax: 0.3,
    minStrengthClass: "C32/40",
    maxWcRatio: 0.5,
    minCementContent: 320,
    minCover_50yr: 30,
    minCover_100yr: 35,
  },
  XF3: {
    code: "XF3",
    mechanism: "freeze_thaw",
    description: "Freeze/thaw — high saturation, no de-icing",
    environment: "Horizontal concrete surfaces exposed to rain and freezing",
    wmax: 0.3,
    minStrengthClass: "C28/35",
    maxWcRatio: 0.55,
    minCementContent: 300,
    minCover_50yr: 25,
    minCover_100yr: 30,
  },
  XF4: {
    code: "XF4",
    mechanism: "freeze_thaw",
    description: "Freeze/thaw — high saturation, with de-icing or seawater",
    environment:
      "Road surfaces, bridge decks, splash zones exposed to de-icing agents",
    wmax: 0.3,
    minStrengthClass: "C32/40",
    maxWcRatio: 0.45,
    minCementContent: 340,
    minCover_50yr: 30,
    minCover_100yr: 35,
  },
  XA1: {
    code: "XA1",
    mechanism: "chemical",
    description: "Chemical attack — slightly aggressive",
    environment:
      "Natural soil & groundwater — slightly aggressive per EN 206 Table 2",
    wmax: 0.3,
    minStrengthClass: "C28/35",
    maxWcRatio: 0.55,
    minCementContent: 300,
    minCover_50yr: 25,
    minCover_100yr: 30,
  },
  XA2: {
    code: "XA2",
    mechanism: "chemical",
    description: "Chemical attack — moderately aggressive",
    environment:
      "Natural soil & groundwater — moderately aggressive, industrial ground",
    wmax: 0.3,
    minStrengthClass: "C32/40",
    maxWcRatio: 0.5,
    minCementContent: 320,
    minCover_50yr: 30,
    minCover_100yr: 35,
  },
  XA3: {
    code: "XA3",
    mechanism: "chemical",
    description: "Chemical attack — highly aggressive",
    environment: "Highly aggressive soil or groundwater, contaminated land",
    wmax: 0.3,
    minStrengthClass: "C35/45",
    maxWcRatio: 0.45,
    minCementContent: 340,
    minCover_50yr: 35,
    minCover_100yr: 40,
  },
};

// ---------------------------------------------------------------------------
// Crack Width Limits — EN 1992-1-1 Table 7.1N
// ---------------------------------------------------------------------------

export interface CrackWidthLimit {
  exposureClasses: string[];
  /** Recommended wmax under quasi-permanent combination (mm) */
  wmax_qp: number;
  /** Recommended wmax under frequent combination (mm) — prestressed tendons in bonded ducts */
  wmax_freq: number | null;
  /** Decompression check required? (prestressed only) */
  decompression: boolean;
}

export const CRACK_WIDTH_LIMITS: CrackWidthLimit[] = [
  {
    exposureClasses: ["X0", "XC1"],
    wmax_qp: 0.4,
    wmax_freq: 0.2,
    decompression: false,
  },
  {
    exposureClasses: ["XC2", "XC3", "XC4"],
    wmax_qp: 0.3,
    wmax_freq: 0.2,
    decompression: false,
  },
  {
    exposureClasses: ["XD1", "XD2", "XS1", "XS2"],
    wmax_qp: 0.3,
    wmax_freq: 0.2,
    decompression: true,
  },
  {
    exposureClasses: ["XD3", "XS3"],
    wmax_qp: 0.2,
    wmax_freq: null,
    decompression: true,
  },
];

// ---------------------------------------------------------------------------
// Minimum Concrete Cover Calculation — EN 1992-1-1 §4.4.1
// ---------------------------------------------------------------------------

export interface CoverComponents {
  /** cmin,b — minimum cover for bond (mm) */
  cmin_b: number;
  /** cmin,dur — minimum cover for durability (mm) */
  cmin_dur: number;
  /** Δcdur,γ — additive safety element (mm), recommended 0 */
  delta_cdur_gamma: number;
  /** Δcdur,st — reduction for stainless steel (mm) */
  delta_cdur_st: number;
  /** Δcdur,add — reduction for additional protection (mm) */
  delta_cdur_add: number;
  /** Δcdev — allowance for deviation (mm), recommended 10 */
  delta_cdev: number;
}

/** Calculate nominal cover cnom per EN 1992-1-1 §4.4.1.1 */
export function calcNominalCover(components: CoverComponents): number {
  const cmin = Math.max(
    components.cmin_b,
    components.cmin_dur +
      components.delta_cdur_gamma -
      components.delta_cdur_st -
      components.delta_cdur_add,
    10, // absolute minimum
  );
  return cmin + components.delta_cdev;
}

// ---------------------------------------------------------------------------
// BS 8500-1 Designated Concrete Types (UK)
// ---------------------------------------------------------------------------

export interface DesignatedConcrete {
  designation: string;
  strengthClass: string;
  slumpClass: string;
  maxAggregate: number;
  use: string;
}

export const DESIGNATED_CONCRETES: DesignatedConcrete[] = [
  {
    designation: "GEN 0",
    strengthClass: "C8/10",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "Blinding, mass fill",
  },
  {
    designation: "GEN 1",
    strengthClass: "C12/15",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "Strip foundations ≤ 1m, trench fill",
  },
  {
    designation: "GEN 2",
    strengthClass: "C16/20",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "Foundations for ≤ 2 storeys",
  },
  {
    designation: "GEN 3",
    strengthClass: "C20/25",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "General building, garage floors",
  },
  {
    designation: "RC25",
    strengthClass: "C25/30",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "RC foundations, ground floor slabs",
  },
  {
    designation: "RC28",
    strengthClass: "C28/35",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "RC general (XC3/XC4 environments)",
  },
  {
    designation: "RC30",
    strengthClass: "C30/37",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "Structural RC, external elements",
  },
  {
    designation: "RC32",
    strengthClass: "C32/40",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "RC in XD / XS environments",
  },
  {
    designation: "RC35",
    strengthClass: "C35/45",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "High durability applications",
  },
  {
    designation: "RC40",
    strengthClass: "C40/50",
    slumpClass: "S3",
    maxAggregate: 20,
    use: "Precast, post-tensioned",
  },
  {
    designation: "PAV1",
    strengthClass: "C30/37",
    slumpClass: "S2",
    maxAggregate: 20,
    use: "House drives, light traffic pavements",
  },
  {
    designation: "PAV2",
    strengthClass: "C35/45",
    slumpClass: "S2",
    maxAggregate: 20,
    use: "Heavy-duty pavements with de-icing",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the governing crack width limit for a set of exposure classes */
export function getMaxCrackWidth(exposureCodes: string[]): number {
  let minLimit = 0.4;
  for (const code of exposureCodes) {
    const cls = EXPOSURE_CLASSES[code];
    if (cls && cls.wmax < minLimit) {
      minLimit = cls.wmax;
    }
  }
  return minLimit;
}

/** Get minimum cover for a given exposure class and design life */
export function getMinCoverDur(
  exposureCode: string,
  designLife: 50 | 100 = 50,
): number {
  const cls = EXPOSURE_CLASSES[exposureCode];
  if (!cls) return 25;
  return designLife === 100 ? cls.minCover_100yr : cls.minCover_50yr;
}

/** Look up minimum concrete strength class (as fck) for a set of exposure classes */
export function getMinConcreteClassFck(exposureCodes: string[]): number {
  let maxFck = 12;
  for (const code of exposureCodes) {
    const cls = EXPOSURE_CLASSES[code];
    if (cls) {
      const fck = parseInt(
        cls.minStrengthClass.split("/")[0].replace("C", ""),
        10,
      );
      if (fck > maxFck) maxFck = fck;
    }
  }
  return maxFck;
}
