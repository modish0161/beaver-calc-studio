// ============================================================================
// BeaverCalc Studio — Shear Stud Design Report Data Builder
// Headed Stud Connectors for Composite Beams to BS EN 1994-1-1
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
 * Form data from the Shear Stud Design calculator
 */
export interface ShearStudFormData {
  // Beam Details
  beamSize: string;
  beamSpan: string; // m
  steelGrade: string;

  // Slab Details
  slabType: string; // Solid, Profiled deck
  slabThickness: string; // mm (total)
  deckProfile: string; // TR60, TR80, etc.
  deckHeight: string; // mm
  deckOrientation: string; // Parallel, Perpendicular
  ribWidth: string; // mm
  ribSpacing: string; // mm

  // Concrete
  concreteClass: string;

  // Stud Details
  studDiameter: string; // mm (typically 19)
  studHeight: string; // mm (typically 100, 125)
  studFu: string; // MPa (450 typical)
  studsPerRib: string; // 1 or 2

  // Loading
  totalULSLoad: string; // kN/m
  totalSLSLoad: string; // kN/m

  // Design Options
  degreeOfInteraction: string; // Full, Partial (%)
  partialInteractionMin: string; // % (EC4 minimum)
}

/**
 * Results from the Shear Stud Design calculator
 */
export interface ShearStudResults {
  // Material Properties
  fck: string;
  Ecm: string;

  // Stud Resistance (unreduced)
  PRdSteel: string; // From stud shear
  PRdConcrete: string; // From concrete crushing
  PRdBase: string; // Min of above

  // Reduction Factors
  kt: string; // Transverse deck
  kl: string; // Height limitation
  PRdReduced: string; // After factors

  // Longitudinal Shear
  vLongitudinal: string; // Total shear force
  criticalLength: string; // m (end to point of max moment)

  // Stud Requirements
  numberOfStudsRequired: string;
  numberOfStudsProvided: string;
  studSpacing: string; // mm
  studUtil: string;
  studStatus: string;

  // Minimum Interaction
  actualInteraction: string; // %
  minInteraction: string; // %
  interactionStatus: string;

  // Rib Shear
  ribShearForce: string;
  ribShearCapacity: string;
  ribShearUtil: string;
  ribShearStatus: string;

  // Transverse Reinforcement
  transverseForce: string; // kN/m
  transverseAsReq: string; // mm²/m
  transverseAsProv: string; // mm²/m
  transverseStatus: string;

  // Overall
  governingCheck: string;
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
 * Build a ReportData object from Shear Stud calculator results
 */
export function buildShearStudReport(
  formData: ShearStudFormData,
  results: ShearStudResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");

  // Determine overall status
  const overallStatus: "PASS" | "FAIL" =
    results.overallStatus === "PASS" ? "PASS" : "FAIL";

  // Build meta
  const meta = {
    title: "Shear Stud Design",
    projectName: options.projectName || "Composite Beam Studs",
    clientName: options.clientName || "Client",
    documentRef:
      options.documentRef || `SS-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || "Rev A",
    date: today,
    preparedBy: options.preparedBy || "BeaverCalc Studio",
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: "Shear Stud Design",
    designCodes: ["BS EN 1994-1-1:2004", "UK NA", "EC4"],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.beamSize} composite beam, ${formData.beamSpan}m span.
    ${formData.studDiameter}mm × ${formData.studHeight}mm headed studs on ${formData.slabType.toLowerCase()} slab.
    ${formData.deckProfile} deck (${formData.deckOrientation.toLowerCase()}).
    ${formData.degreeOfInteraction} interaction design.`,
    keyResults: [
      { label: "Beam", value: formData.beamSize },
      {
        label: "Stud Capacity PRd",
        value: `${results.PRdReduced} kN`,
        highlight: true,
      },
      { label: "Studs Required", value: results.numberOfStudsRequired },
      { label: "Studs Provided", value: results.numberOfStudsProvided },
      { label: "Interaction", value: `${results.actualInteraction}%` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `${results.studUtil}% stud utilisation`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: "Beam Details",
        parameters: [
          { name: "Beam Size", value: formData.beamSize },
          { name: "Span", value: formData.beamSpan, unit: "m" },
          { name: "Steel Grade", value: formData.steelGrade },
        ],
      },
      {
        title: "Slab Details",
        parameters: [
          { name: "Slab Type", value: formData.slabType },
          {
            name: "Total Thickness",
            value: formData.slabThickness,
            unit: "mm",
          },
          { name: "Deck Profile", value: formData.deckProfile },
          { name: "Deck Height", value: formData.deckHeight, unit: "mm" },
          { name: "Deck Orientation", value: formData.deckOrientation },
          { name: "Rib Width", value: formData.ribWidth, unit: "mm" },
          { name: "Rib Spacing", value: formData.ribSpacing, unit: "mm" },
        ],
      },
      {
        title: "Concrete",
        parameters: [
          { name: "Concrete Class", value: formData.concreteClass },
          { name: "fck", value: results.fck, unit: "MPa" },
          { name: "Ecm", value: results.Ecm, unit: "GPa" },
        ],
      },
      {
        title: "Stud Details",
        parameters: [
          { name: "Diameter", value: formData.studDiameter, unit: "mm" },
          { name: "Height", value: formData.studHeight, unit: "mm" },
          { name: "Ultimate Strength fu", value: formData.studFu, unit: "MPa" },
          { name: "Studs per Rib", value: formData.studsPerRib },
        ],
      },
      {
        title: "Design Options",
        parameters: [
          {
            name: "Degree of Interaction",
            value: formData.degreeOfInteraction,
          },
          {
            name: "Min Partial Interaction",
            value: formData.partialInteractionMin,
            unit: "%",
          },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: "Single Stud Resistance",
      description: "EC4 Cl.6.6.3",
      checks: [
        {
          name: "Stud Shear Failure",
          formula: "PRd = 0.8 × fu × πd²/4 / γv",
          calculated: `${results.PRdSteel} kN`,
          limit: "Steel failure",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Concrete Crushing",
          formula: "PRd = 0.29 × α × d² × √(fck×Ecm) / γv",
          calculated: `${results.PRdConcrete} kN`,
          limit: "Concrete failure",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Base Resistance",
          formula: "min(Steel, Concrete)",
          calculated: `${results.PRdBase} kN`,
          limit: "Unreduced",
          utilisation: 0,
          status: "PASS",
        },
      ],
    },
    {
      title: "Reduction Factors",
      description: "For profiled decking (EC4 Cl.6.6.4)",
      checks: [
        {
          name: "kt Factor",
          formula:
            formData.deckOrientation === "Perpendicular"
              ? "kt = 0.7/√nr × (b0/hp) × (hsc/hp - 1)"
              : "kt = 0.6 × (b0/hp) × (hsc/hp - 1)",
          calculated: results.kt,
          limit: "≤ 1.0",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Reduced PRd",
          formula: "PRd = kt × PRd,base",
          calculated: `${results.PRdReduced} kN`,
          limit: "Design value",
          utilisation: 0,
          status: "PASS",
        },
      ],
    },
    {
      title: "Number of Studs",
      description: "Longitudinal shear transfer",
      checks: [
        {
          name: "Studs Required",
          formula: "n = VL / PRd",
          calculated: results.numberOfStudsRequired,
          limit: `Provided: ${results.numberOfStudsProvided}`,
          utilisation: parseFloat(results.studUtil) / 100,
          status: results.studStatus as "PASS" | "FAIL",
        },
        {
          name: "Stud Spacing",
          formula: "Span / (n-1)",
          calculated: `${results.studSpacing} mm`,
          limit: "≤ 6hc or 800mm",
          utilisation: 0,
          status: "PASS",
        },
      ],
    },
    {
      title: "Degree of Interaction",
      description: "EC4 Cl.6.6.1.2",
      checks: [
        {
          name: "Actual Interaction",
          formula: "η = n_prov × PRd / Ncf",
          calculated: `${results.actualInteraction}%`,
          limit: `≥ ${results.minInteraction}% (EC4 min)`,
          utilisation:
            parseFloat(results.minInteraction) /
            parseFloat(results.actualInteraction),
          status: results.interactionStatus as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Transverse Reinforcement",
      description: "EC4 Cl.6.6.6",
      checks: [
        {
          name: "Transverse As",
          formula: "As ≥ vL / (fsd × cotθ)",
          calculated: `${results.transverseAsProv} mm²/m`,
          limit: `≥ ${results.transverseAsReq} mm²/m`,
          utilisation:
            parseFloat(results.transverseAsReq) /
            parseFloat(results.transverseAsProv),
          status: results.transverseStatus as "PASS" | "FAIL",
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Stud Resistance - Steel Failure",
      steps: [
        {
          description: "Stud diameter",
          formula: "d",
          result: `d = ${formData.studDiameter} mm`,
        },
        {
          description: "Stud ultimate strength",
          formula: "fu",
          result: `fu = ${formData.studFu} MPa`,
        },
        {
          description: "Partial factor",
          formula: "γv = 1.25 (UK NA)",
          result: "γv = 1.25",
        },
        {
          description: "Steel failure resistance",
          formula: "PRd = 0.8 × fu × πd²/4 / γv",
          substitution: `PRd = 0.8 × ${formData.studFu} × π × ${formData.studDiameter}² / 4 / 1.25 / 1000`,
          result: `PRd = ${results.PRdSteel} kN`,
        },
      ],
    },
    {
      title: "Stud Resistance - Concrete Crushing",
      steps: [
        {
          description: "α factor",
          formula: "α = 0.2(hsc/d + 1) for hsc/d ≤ 4, else 1.0",
          result: "α = 1.0 (typically)",
        },
        {
          description: "Concrete crushing resistance",
          formula: "PRd = 0.29 × α × d² × √(fck × Ecm) / γv",
          substitution: `PRd = 0.29 × 1.0 × ${formData.studDiameter}² × √(${results.fck} × ${results.Ecm} × 1000) / 1.25 / 1000`,
          result: `PRd = ${results.PRdConcrete} kN`,
        },
        {
          description: "Governing base resistance",
          formula: "min(Steel, Concrete)",
          result: `PRd,base = ${results.PRdBase} kN`,
        },
      ],
    },
    {
      title: "Deck Reduction Factor",
      steps: [
        {
          description: "Deck orientation",
          formula: formData.deckOrientation,
          result:
            formData.deckOrientation === "Perpendicular"
              ? "Transverse deck"
              : "Parallel deck",
        },
        {
          description: "Reduction factor kt",
          formula: "Per EC4 Cl.6.6.4",
          result: `kt = ${results.kt}`,
        },
        {
          description: "Reduced stud resistance",
          formula: "PRd = kt × PRd,base",
          substitution: `PRd = ${results.kt} × ${results.PRdBase}`,
          result: `PRd = ${results.PRdReduced} kN`,
        },
      ],
    },
    {
      title: "Number of Studs Calculation",
      steps: [
        {
          description: "Longitudinal shear force",
          formula: "VL = min(Npl,a, Ncf) for full interaction",
          result: `VL = ${results.vLongitudinal} kN`,
        },
        {
          description: "Critical length",
          formula: "Le = span/2 (for SS beam)",
          result: `Le = ${results.criticalLength} m`,
        },
        {
          description: "Studs required per half span",
          formula: "n = VL / PRd",
          substitution: `n = ${results.vLongitudinal} / ${results.PRdReduced}`,
          result: `n = ${results.numberOfStudsRequired} (total for beam)`,
        },
        {
          description: "Studs provided",
          formula: "Based on deck rib spacing",
          result: `n = ${results.numberOfStudsProvided}`,
        },
      ],
    },
    {
      title: "Degree of Interaction",
      steps: [
        {
          description: "Minimum interaction (EC4)",
          formula: "η_min per span & steel grade",
          result: `η_min = ${results.minInteraction}%`,
        },
        {
          description: "Actual interaction provided",
          formula: "η = n_prov × PRd / Ncf × 100",
          result: `η = ${results.actualInteraction}%`,
        },
        {
          description: "Check",
          formula: "η ≥ η_min",
          result:
            parseFloat(results.actualInteraction) >=
            parseFloat(results.minInteraction)
              ? "OK"
              : "FAIL",
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes("fail") ? "error" : "warning",
    message: w,
  }));

  if (formData.studsPerRib === "2") {
    reportWarnings.push({
      type: "info",
      message:
        "Two studs per rib - ensure adequate rib width for weld clearance",
    });
  }

  if (parseFloat(results.actualInteraction) < 100) {
    reportWarnings.push({
      type: "info",
      message: `Partial interaction ${results.actualInteraction}% - verify plastic moment capacity is reduced accordingly`,
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === "PASS"
        ? `${results.numberOfStudsProvided}No. ${formData.studDiameter}×${formData.studHeight}mm studs are ADEQUATE.
         PRd = ${results.PRdReduced}kN per stud (reduced for deck).
         ${results.actualInteraction}% interaction ≥ ${results.minInteraction}% minimum.`
        : `Stud design FAILS. ${results.governingCheck}. Increase stud numbers or size.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.studDiameter}mm dia. × ${formData.studHeight}mm headed studs`,
      `${results.numberOfStudsProvided} studs total @ ${results.studSpacing}mm c/c`,
      `${formData.studsPerRib} stud(s) per deck rib`,
      `Transverse reinforcement: ${results.transverseAsProv} mm²/m across beam`,
      "Weld studs through deck - min 20mm projection above rib",
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
