// =============================================================================
// Bearing Reactions Report Builder — Premium PDF
// BS EN 1991-2 & BS EN 1337 — Consultancy-Grade Report
// =============================================================================

import type {
  DesignCheck,
  DesignCheckSection,
  DetailedCalculation,
  ReportConclusion,
  ReportData,
  ReportInputs,
  ReportWarning,
} from "../types";

export interface BearingReactionsFormData {
  bridgeType: string;
  spanLength: number;
  numberOfSpans: number;
  bearingType: string;
  numberOfBearings: number;
  bearingSpacing: number;
  includeTemperatureEffects: boolean;
  includeCreepShrinkage: boolean;
  includeDynamicEffects: boolean;
  temperatureRange: number;
  thermalExpansionCoeff: number;
  loadCases: {
    name: string;
    vertical_force: number;
    longitudinal_force: number;
    transverse_force: number;
    moment_longitudinal: number;
    moment_transverse: number;
    torsion: number;
  }[];
}

export interface BearingReactionsResults {
  status: string;
  maxUtilisation: number;
  criticalCheck: string;
  maxVerticalReaction: number;
  maxHorizontalReaction: number;
  maxMoment: number;
  thermalMovement: number;
}

interface Warning {
  type: "error" | "warning" | "info";
  message: string;
}
interface ProjectInfo {
  projectName: string;
  clientName: string;
  preparedBy: string;
}

const BRIDGE_TYPES: Record<string, string> = {
  highway: "Highway Bridge",
  railway: "Railway Bridge",
  footbridge: "Footbridge",
  viaduct: "Viaduct",
};

const BEARING_TYPES: Record<string, string> = {
  pot: "Pot Bearing",
  spherical: "Spherical Bearing",
  cylindrical: "Cylindrical Bearing",
  fixed: "Fixed Bearing",
  guided: "Guided Bearing",
  free: "Free Bearing",
};

export function buildBearingReactionsReport(
  form: BearingReactionsFormData,
  results: BearingReactionsResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");
  const bridgeLabel = BRIDGE_TYPES[form.bridgeType] || form.bridgeType;
  const bearingLabel = BEARING_TYPES[form.bearingType] || form.bearingType;
  const overallStatus: "PASS" | "FAIL" =
    results.status === "PASS" ? "PASS" : "FAIL";
  const maxUtil = results.maxUtilisation * 100;

  // Determine governing check
  const vUtil = results.maxVerticalReaction > 0 ? results.maxUtilisation : 0;

  // Report warnings
  const reportWarnings: ReportWarning[] = warnings.map((w, i) => ({
    severity: (w.type === "error" ? "error" : "warning") as "error" | "warning",
    title: `Warning ${i + 1}`,
    message: w.message,
  }));

  // Inputs
  const inputs: ReportInputs = {
    geometry: {
      title: "Bridge Configuration",
      parameters: [
        { label: "Bridge Type", value: bridgeLabel },
        { label: "Span Length", value: String(form.spanLength), unit: "m" },
        { label: "Number of Spans", value: String(form.numberOfSpans) },
        { label: "Bearing Type", value: bearingLabel },
        { label: "Number of Bearings", value: String(form.numberOfBearings) },
        {
          label: "Bearing Spacing",
          value: String(form.bearingSpacing),
          unit: "m",
        },
      ],
    },
    loads: {
      title: "Load Cases",
      parameters: form.loadCases.map((lc) => ({
        label: lc.name,
        value: `V=${lc.vertical_force} kN, H_L=${lc.longitudinal_force} kN, H_T=${lc.transverse_force} kN`,
      })),
    },
    supportConditions: {
      title: "Secondary Effects & Options",
      parameters: [
        {
          label: "Temperature Effects",
          value: form.includeTemperatureEffects ? "Included" : "Excluded",
        },
        {
          label: "Temperature Range",
          value: String(form.temperatureRange),
          unit: "°C",
        },
        {
          label: "Thermal Expansion Coeff",
          value: `${form.thermalExpansionCoeff}`,
          unit: "×10⁻⁶/°C",
        },
        {
          label: "Creep & Shrinkage",
          value: form.includeCreepShrinkage ? "Included" : "Excluded",
        },
        {
          label: "Dynamic Effects",
          value: form.includeDynamicEffects ? "Included" : "Excluded",
        },
      ],
    },
  };

  // Bearing capacity reference values (matching calculator logic)
  const bearingProps: Record<
    string,
    { V_Rd: number; H_Rd: number; M_Rd: number }
  > = {
    pot: { V_Rd: 5000, H_Rd: 500, M_Rd: 200 },
    spherical: { V_Rd: 10000, H_Rd: 1000, M_Rd: 500 },
    cylindrical: { V_Rd: 4000, H_Rd: 400, M_Rd: 150 },
    fixed: { V_Rd: 6000, H_Rd: 800, M_Rd: 500 },
    guided: { V_Rd: 3000, H_Rd: 300, M_Rd: 100 },
    free: { V_Rd: 2000, H_Rd: 100, M_Rd: 0 },
  };
  const bp = bearingProps[form.bearingType] || bearingProps.pot;

  // Design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: "Vertical Capacity (EN 1337)",
      checks: [
        mkCheck(
          "Vertical",
          "Max Vertical Bearing Reaction",
          results.maxVerticalReaction,
          "kN",
          bp.V_Rd,
          "kN",
          (results.maxVerticalReaction / bp.V_Rd) * 100,
          "EN 1337",
          results.maxVerticalReaction <= bp.V_Rd ? "PASS" : "FAIL",
          `Critical bearing: ${results.criticalCheck}`,
        ),
      ],
    },
    {
      title: "Horizontal Capacity (EN 1337)",
      checks: [
        mkCheck(
          "Horizontal",
          "Max Horizontal Bearing Reaction",
          results.maxHorizontalReaction,
          "kN",
          bp.H_Rd,
          "kN",
          (results.maxHorizontalReaction / bp.H_Rd) * 100,
          "EN 1337",
          results.maxHorizontalReaction <= bp.H_Rd ? "PASS" : "FAIL",
        ),
      ],
    },
    {
      title: "Moment Capacity (EN 1337)",
      checks: [
        mkCheck(
          "Moment",
          "Max Bearing Moment",
          results.maxMoment,
          "kNm",
          bp.M_Rd,
          "kNm",
          bp.M_Rd > 0 ? (results.maxMoment / bp.M_Rd) * 100 : 0,
          "EN 1337",
          bp.M_Rd > 0 && results.maxMoment <= bp.M_Rd ? "PASS" : "FAIL",
          `${bearingLabel} bearing`,
        ),
      ],
    },
    {
      title: "Thermal Movement (EN 1991-1-5)",
      checks: [
        mkCheck(
          "Thermal",
          "Thermal Expansion Movement",
          results.thermalMovement,
          "mm",
          form.bearingType === "fixed" ? 0 : 50,
          "mm",
          form.bearingType === "fixed"
            ? 0
            : (results.thermalMovement / 50) * 100,
          "EN 1991-1-5",
          results.thermalMovement <= 50 ? "PASS" : "FAIL",
          `ΔT = ${form.temperatureRange}°C, α = ${form.thermalExpansionCoeff}`,
        ),
      ],
    },
  ];

  // Detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Bearing Reaction Envelope Analysis",
      steps: [
        {
          description: "ULS load factors applied",
          formula: "γ_G = 1.35, γ_Q = 1.50 (EN 1990 Table A2.4)",
          result: `${form.loadCases.length} load cases analysed`,
        },
        {
          description: "Bearing positions from centroid",
          formula: `x_i = −(n−1)·s/2 + i·s`,
          result: `${form.numberOfBearings} bearings at ${form.bearingSpacing} m c/c`,
        },
        {
          description: "Max vertical reaction (envelope)",
          formula: "R_v,Ed = max(ΣV/n ± M·x_i/Σx²)",
          result: `${results.maxVerticalReaction.toFixed(1)} kN`,
        },
        {
          description: "Max horizontal reaction (resultant)",
          formula: "R_h,Ed = √(H_L² + H_T²)",
          result: `${results.maxHorizontalReaction.toFixed(1)} kN`,
        },
        {
          description: "Max moment (resultant)",
          formula: "M_Ed = √(M_L² + M_T²)",
          result: `${results.maxMoment.toFixed(1)} kNm`,
        },
      ],
    },
    {
      title: "Thermal Movement",
      steps: form.includeTemperatureEffects
        ? [
            {
              description: "Free thermal expansion",
              formula: `δ = α × L × ΔT`,
              result: `${form.thermalExpansionCoeff} × ${form.spanLength * 1000} × ${form.temperatureRange} = ${results.thermalMovement.toFixed(1)} mm`,
            },
            {
              description: "Friction force at bearings",
              formula: `H_T = μ × V_max (μ = 0.03 for PTFE)`,
              result: `${(0.03 * results.maxVerticalReaction).toFixed(1)} kN`,
            },
          ]
        : [
            {
              description: "Temperature effects",
              formula: "—",
              result: "Excluded from analysis",
            },
          ],
    },
  ];

  // Conclusion
  const conclusion: ReportConclusion = {
    status: overallStatus,
    summary:
      overallStatus === "PASS"
        ? `All ${form.numberOfBearings} × ${bearingLabel}s are ADEQUATE for the ${bridgeLabel} (${form.spanLength} m span). Maximum utilisation is ${maxUtil.toFixed(1)}%.`
        : `The bearing arrangement is NOT ADEQUATE. One or more capacity checks have failed at ${maxUtil.toFixed(1)}% utilisation.`,
    governingChecks: [
      `Critical bearing: ${results.criticalCheck}`,
      `Max vertical reaction: ${results.maxVerticalReaction.toFixed(1)} kN`,
      `Max utilisation: ${maxUtil.toFixed(1)}%`,
    ],
    suggestions:
      overallStatus === "FAIL"
        ? [
            "Consider a higher-capacity bearing type (e.g. spherical)",
            "Increase the number of bearings to reduce per-bearing loads",
            "Review load case combinations and secondary effects",
          ]
        : [
            `Provide ${form.numberOfBearings} × ${bearingLabel} at ${form.bearingSpacing} m centres`,
            "Verify bearing installation levels and grouting details",
            `Allow ${results.thermalMovement.toFixed(1)} mm for thermal movement`,
            "Install bearing restraint and alignment checking devices",
          ],
  };

  return {
    meta: {
      calculatorName: "Bearing Reactions Calculator",
      title: "Bearing Reactions Analysis Report",
      subtitle: `BS EN 1991-2 & EN 1337 — ${bridgeLabel}`,
      projectName: project.projectName || "Bearing Reaction Analysis",
      clientName: project.clientName || "Client",
      preparedBy: project.preparedBy || "Engineer",
      documentRef: `BRG-${Date.now().toString(36).toUpperCase()}`,
      version: "Rev A",
      date: today,
      designCodes: ["BS EN 1991-2:2003", "BS EN 1337:2005", "BS EN 1990:2002"],
    },
    executiveSummary: {
      overallStatus,
      governingCheck: `Vertical Capacity at ${(vUtil * 100).toFixed(1)}%`,
      maxUtilisation: results.maxUtilisation,
      keyDimensions: [
        { label: "Span", value: String(form.spanLength), unit: "m" },
        { label: "Bearings", value: String(form.numberOfBearings) },
        {
          label: "Spacing",
          value: String(form.bearingSpacing),
          unit: "m",
        },
        { label: "Type", value: bearingLabel },
      ],
      keyLoads: [
        {
          label: "Max V",
          value: results.maxVerticalReaction.toFixed(1),
          unit: "kN",
        },
        {
          label: "Max H",
          value: results.maxHorizontalReaction.toFixed(1),
          unit: "kN",
        },
        {
          label: "Max M",
          value: results.maxMoment.toFixed(1),
          unit: "kNm",
        },
        {
          label: "Thermal δ",
          value: results.thermalMovement.toFixed(1),
          unit: "mm",
        },
      ],
    },
    inputs,
    designChecks,
    detailedCalculations,
    warnings: reportWarnings.length > 0 ? reportWarnings : undefined,
    conclusion,
  };
}

/** Helper to build a DesignCheck */
function mkCheck(
  category: string,
  name: string,
  designValue: number,
  designUnit: string,
  resistance: number,
  resistanceUnit: string,
  utilisation: number,
  clause: string,
  status: "PASS" | "FAIL",
  notes?: string,
): DesignCheck {
  return {
    category,
    name,
    designValue,
    designValueUnit: designUnit,
    resistance,
    resistanceUnit,
    utilisation,
    clause,
    status,
    notes,
  };
}

export default buildBearingReactionsReport;
