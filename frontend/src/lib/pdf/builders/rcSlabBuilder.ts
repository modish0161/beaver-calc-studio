// ============================================================================
// BeaverCalc Studio — RC Slab Design Report Data Builder
// One-way/Two-way Slab Design to BS EN 1992-1-1
// ============================================================================

import type {
  DesignCheckSection,
  DetailedCalculation,
  ReportConclusion,
  ReportData,
  ReportInputs,
  ReportWarning,
} from "../types";

/**
 * Form data from the RC Slab Design calculator
 */
export interface RcSlabFormData {
  // Slab Configuration
  slabType: string; // One-way, Two-way, Flat slab
  supportConditions: string; // Simply supported, Continuous, Cantilever
  edgeConditions: string; // All edges supported, 3 edges, 2 adjacent, etc.

  // Geometry
  spanX: string; // m (shorter span for 2-way)
  spanY: string; // m (longer span)
  thickness: string; // mm

  // Materials
  concreteClass: string; // C25/30, C30/37, etc.
  rebarGrade: string; // B500B
  cover: string; // mm
  maxAggSize: string; // mm

  // Loading
  selfWeight: string; // kN/m² (auto or manual)
  superimposedDead: string; // kN/m² (finishes, services)
  liveLoad: string; // kN/m²
  liveLoadCategory: string; // A, B, C, D, E
  partitionAllowance: string; // kN/m²

  // Factors
  gammaG: string;
  gammaQ: string;
  psi0: string;
  psi2: string;

  // Fire Resistance
  fireResistance: string; // R60, R90, R120

  // Options
  checkCracking: string; // Yes/No
  checkDeflection: string; // Yes/No
}

/**
 * Results from the RC Slab Design calculator
 */
export interface RcSlabResults {
  // Section Properties
  effectiveDepth: string;
  spanToDepthRatio: string;

  // Material Properties
  fck: string;
  fcd: string;
  fyk: string;
  fyd: string;
  Ecm: string;

  // Loading
  totalDeadLoad: string;
  totalLiveLoad: string;
  ulsLoad: string;
  slsLoad: string;

  // Bending (X-direction / short span)
  momentX: string; // kNm/m
  reqAsX: string; // mm²/m
  provAsX: string; // mm²/m
  barsX: string; // e.g., "T12@150"
  bendingUtilX: string;
  bendingStatusX: string;

  // Bending (Y-direction / long span)
  momentY: string; // kNm/m
  reqAsY: string; // mm²/m
  provAsY: string; // mm²/m
  barsY: string;
  bendingUtilY: string;
  bendingStatusY: string;

  // Shear
  shearForce: string; // kN/m
  shearStress: string; // MPa
  shearCapacity: string; // MPa
  shearUtil: string;
  shearStatus: string;

  // Deflection
  spanToDepthActual: string;
  spanToDepthLimit: string;
  deflectionUtil: string;
  deflectionStatus: string;

  // Cracking
  crackWidth: string; // mm
  crackWidthLimit: string; // mm
  crackingUtil: string;
  crackingStatus: string;

  // Minimum Reinforcement
  asMin: string; // mm²/m
  asMax: string; // mm²/m

  // Fire
  minCoverFire: string; // mm
  fireStatus: string;

  // Overall
  governingCheck: string;
  overallUtil: string;
  overallStatus: string;
}

/**
 * Options for building the report
 */
export interface BuilderOptions {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  documentRef?: string;
  version?: string;
}

/**
 * Build a ReportData object from RC Slab Design calculator results
 */
export function buildRcSlabReport(
  formData: RcSlabFormData,
  results: RcSlabResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");

  // Determine overall status
  const overallStatus: "PASS" | "FAIL" =
    results.overallStatus === "PASS" ? "PASS" : "FAIL";

  // Build meta
  const meta = {
    title: "RC Slab Design",
    projectName: options.projectName || "Concrete Slab",
    clientName: options.clientName || "Client",
    documentRef:
      options.documentRef || `RCS-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || "Rev A",
    date: today,
    preparedBy: options.preparedBy || "BeaverCalc Studio",
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: "RC Slab Design",
    designCodes: ["BS EN 1992-1-1:2004", "UK NA", "EC2"],
  };

  // Slab description
  const slabDesc = `${formData.slabType} ${formData.thickness}mm slab, ${formData.spanX}m × ${formData.spanY}m`;

  // Build executive summary
  const executiveSummary = {
    description: `${slabDesc}. ${formData.supportConditions} with ${formData.edgeConditions}.
    ${formData.concreteClass} concrete, ${formData.rebarGrade} reinforcement.
    ${formData.fireResistance} fire resistance.`,
    keyResults: [
      { label: "Slab", value: `${formData.thickness}mm ${formData.slabType}` },
      { label: "Span", value: `${formData.spanX} × ${formData.spanY} m` },
      { label: "Reinf. (X)", value: results.barsX, highlight: true },
      { label: "Reinf. (Y)", value: results.barsY },
      { label: "Overall Util", value: `${results.overallUtil}%` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `${results.overallUtil}% (${results.governingCheck})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: "Slab Configuration",
        parameters: [
          { name: "Slab Type", value: formData.slabType },
          { name: "Support Conditions", value: formData.supportConditions },
          { name: "Edge Conditions", value: formData.edgeConditions },
        ],
      },
      {
        title: "Geometry",
        parameters: [
          { name: "Span X (short)", value: formData.spanX, unit: "m" },
          { name: "Span Y (long)", value: formData.spanY, unit: "m" },
          {
            name: "Span Ratio ly/lx",
            value: (
              parseFloat(formData.spanY) / parseFloat(formData.spanX)
            ).toFixed(2),
          },
          { name: "Thickness h", value: formData.thickness, unit: "mm" },
          {
            name: "Effective Depth d",
            value: results.effectiveDepth,
            unit: "mm",
          },
        ],
      },
      {
        title: "Materials",
        parameters: [
          { name: "Concrete Class", value: formData.concreteClass },
          { name: "fck", value: results.fck, unit: "MPa" },
          { name: "Rebar Grade", value: formData.rebarGrade },
          { name: "fyk", value: results.fyk, unit: "MPa" },
          { name: "Cover", value: formData.cover, unit: "mm" },
        ],
      },
      {
        title: "Loading",
        parameters: [
          { name: "Self-weight", value: formData.selfWeight, unit: "kN/m²" },
          {
            name: "Superimposed Dead",
            value: formData.superimposedDead,
            unit: "kN/m²",
          },
          {
            name: "Partitions",
            value: formData.partitionAllowance,
            unit: "kN/m²",
          },
          { name: "Live Load", value: formData.liveLoad, unit: "kN/m²" },
          { name: "Category", value: formData.liveLoadCategory },
          { name: "Total Dead", value: results.totalDeadLoad, unit: "kN/m²" },
          { name: "ULS Load", value: results.ulsLoad, unit: "kN/m²" },
        ],
      },
      {
        title: "Partial Factors",
        parameters: [
          { name: "γG", value: formData.gammaG },
          { name: "γQ", value: formData.gammaQ },
          { name: "ψ₀", value: formData.psi0 },
        ],
      },
      {
        title: "Fire Resistance",
        parameters: [
          { name: "Required", value: formData.fireResistance },
          {
            name: "Min Cover for Fire",
            value: results.minCoverFire,
            unit: "mm",
          },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: "Bending — X Direction (Short Span)",
      description: "EC2 Cl.6.1 - Bottom reinforcement",
      checks: [
        {
          name: "Design Moment MEd",
          formula:
            formData.slabType === "Two-way"
              ? "MEd = αsx × n × lx²"
              : "MEd = wL²/8",
          calculated: `${results.momentX} kNm/m`,
          limit: "At midspan",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Required As",
          formula: "As = MEd / (0.87 × fyk × z)",
          calculated: `${results.reqAsX} mm²/m`,
          limit: `As,min = ${results.asMin} mm²/m`,
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Provided As",
          formula: results.barsX,
          calculated: `${results.provAsX} mm²/m`,
          limit: `≥ ${results.reqAsX} mm²/m`,
          utilisation: parseFloat(results.bendingUtilX) / 100,
          status: results.bendingStatusX as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Bending — Y Direction (Long Span)",
      description: "EC2 Cl.6.1 - Bottom reinforcement",
      checks: [
        {
          name: "Design Moment MEd",
          formula:
            formData.slabType === "Two-way"
              ? "MEd = αsy × n × lx²"
              : "Distribution steel",
          calculated: `${results.momentY} kNm/m`,
          limit: "At midspan",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Provided As",
          formula: results.barsY,
          calculated: `${results.provAsY} mm²/m`,
          limit: `≥ ${results.reqAsY} mm²/m`,
          utilisation: parseFloat(results.bendingUtilY) / 100,
          status: results.bendingStatusY as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Shear",
      description: "EC2 Cl.6.2 - No shear links in slabs typically",
      checks: [
        {
          name: "Design Shear VEd",
          formula: "VEd = βv × n × lx / 2",
          calculated: `${results.shearForce} kN/m`,
          limit: "At support",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Shear Stress vEd",
          formula: "vEd = VEd / (b × d)",
          calculated: `${results.shearStress} MPa`,
          limit: `vRd,c = ${results.shearCapacity} MPa`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: results.shearStatus as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Deflection (SLS)",
      description: "EC2 Cl.7.4 - Span/depth check",
      checks: [
        {
          name: "Span/Depth Ratio",
          formula: "L/d actual vs L/d allowable",
          calculated: results.spanToDepthActual,
          limit: `≤ ${results.spanToDepthLimit}`,
          utilisation: parseFloat(results.deflectionUtil) / 100,
          status: results.deflectionStatus as "PASS" | "FAIL",
        },
      ],
    },
  ];

  // Add cracking check if enabled
  if (formData.checkCracking === "Yes") {
    designChecks.push({
      title: "Crack Width (SLS)",
      description: "EC2 Cl.7.3",
      checks: [
        {
          name: "Crack Width",
          formula: "wk = sr,max × (εsm - εcm)",
          calculated: `${results.crackWidth} mm`,
          limit: `wk,max = ${results.crackWidthLimit} mm`,
          utilisation: parseFloat(results.crackingUtil) / 100,
          status: results.crackingStatus as "PASS" | "FAIL",
        },
      ],
    });
  }

  // Add fire check
  designChecks.push({
    title: "Fire Resistance",
    description: "EC2-1-2 Tabulated data",
    checks: [
      {
        name: "Cover for Fire",
        formula: `${formData.fireResistance} requirement`,
        calculated: `${formData.cover} mm`,
        limit: `≥ ${results.minCoverFire} mm`,
        utilisation:
          parseFloat(results.minCoverFire) / parseFloat(formData.cover),
        status: results.fireStatus as "PASS" | "FAIL",
      },
    ],
  });

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Loading",
      steps: [
        {
          description: "Self-weight",
          formula: "SW = h × 25 kN/m³",
          substitution: `SW = ${parseFloat(formData.thickness) / 1000} × 25`,
          result: `SW = ${formData.selfWeight} kN/m²`,
        },
        {
          description: "Total dead load",
          formula: "gk = SW + SDL + partitions",
          result: `gk = ${results.totalDeadLoad} kN/m²`,
        },
        {
          description: "Total live load",
          formula: "qk (Category " + formData.liveLoadCategory + ")",
          result: `qk = ${formData.liveLoad} kN/m²`,
        },
        {
          description: "ULS design load",
          formula: "n = γG × gk + γQ × qk",
          substitution: `n = ${formData.gammaG} × ${results.totalDeadLoad} + ${formData.gammaQ} × ${formData.liveLoad}`,
          result: `n = ${results.ulsLoad} kN/m²`,
        },
      ],
    },
    {
      title: "Effective Depth",
      steps: [
        {
          description: "Slab thickness",
          formula: "h",
          result: `h = ${formData.thickness} mm`,
        },
        {
          description: "Cover",
          formula: "c",
          result: `c = ${formData.cover} mm`,
        },
        {
          description: "Effective depth (X)",
          formula: "d = h - c - φ/2",
          result: `d = ${results.effectiveDepth} mm`,
        },
      ],
    },
    {
      title: "Bending Moment (X-direction)",
      steps: [
        {
          description: "Moment coefficient",
          formula:
            formData.slabType === "Two-way" ? "αsx from tables" : "0.125 (SS)",
          result: "Per slab type & edges",
        },
        {
          description: "Design moment",
          formula:
            formData.slabType === "Two-way"
              ? "MEd = αsx × n × lx²"
              : "MEd = n × L² / 8",
          result: `MEd = ${results.momentX} kNm/m`,
        },
        {
          description: "Lever arm",
          formula: "z = 0.95d (approx)",
          result: `z = ${(0.95 * parseFloat(results.effectiveDepth)).toFixed(0)} mm`,
        },
        {
          description: "Required reinforcement",
          formula: "As = MEd / (0.87 × fyk × z)",
          result: `As,req = ${results.reqAsX} mm²/m`,
        },
        {
          description: "Provided reinforcement",
          formula: results.barsX,
          result: `As,prov = ${results.provAsX} mm²/m — OK`,
        },
      ],
    },
    {
      title: "Deflection Check",
      steps: [
        {
          description: "Actual span/depth",
          formula: "L/d",
          substitution: `${parseFloat(formData.spanX) * 1000} / ${results.effectiveDepth}`,
          result: results.spanToDepthActual,
        },
        {
          description: "Basic ratio (lightly stressed)",
          formula: "Per EC2 Table 7.4N",
          result: "Modified for ρ and fck",
        },
        {
          description: "Allowable L/d",
          formula: "K × basic × modifiers",
          result: results.spanToDepthLimit,
        },
        {
          description: "Deflection utilisation",
          formula: "Actual / Allowable × 100",
          result: `${results.deflectionUtil}%`,
        },
      ],
    },
    {
      title: "Minimum & Maximum Reinforcement",
      steps: [
        {
          description: "Minimum reinforcement",
          formula: "As,min = 0.26 × fctm/fyk × b × d ≥ 0.0013 × b × d",
          result: `As,min = ${results.asMin} mm²/m`,
        },
        {
          description: "Maximum reinforcement",
          formula: "As,max = 0.04 × Ac",
          result: `As,max = ${results.asMax} mm²/m`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes("fail") ? "error" : "warning",
    message: w,
  }));

  if (
    parseFloat(results.spanToDepthActual) /
      parseFloat(results.spanToDepthLimit) >
    0.9
  ) {
    reportWarnings.push({
      type: "info",
      message:
        "Close to deflection limit - consider increased thickness for margin",
    });
  }

  if (parseFloat(formData.thickness) < 125) {
    reportWarnings.push({
      type: "warning",
      message: `Slab thickness ${formData.thickness}mm - verify practical minimum for construction`,
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === "PASS"
        ? `${formData.thickness}mm ${formData.slabType.toLowerCase()} slab is ADEQUATE.
         ${results.barsX} (X-dir) and ${results.barsY} (Y-dir) at midspan.
         Governing: ${results.governingCheck} at ${results.overallUtil}%.`
        : `Slab FAILS at ${results.governingCheck}. Increase thickness or reinforcement.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.concreteClass} concrete, ${formData.thickness}mm thick`,
      `Bottom steel: ${results.barsX} (short span) + ${results.barsY} (long span)`,
      `Cover: ${formData.cover}mm (${formData.fireResistance} fire)`,
      "Top steel at supports per continuous slab design if applicable",
      `Max bar spacing: 3h or 400mm = ${Math.min(3 * parseFloat(formData.thickness), 400)}mm`,
    ],
  };

  return {
    meta,
    executiveSummary,
    inputs,
    designChecks,
    detailedCalculations,
    warnings: reportWarnings.length > 0 ? reportWarnings : undefined,
    conclusion,
  };
}
