// ============================================================================
// BeaverCalc Studio — LTB Quick Check Report Data Builder
// Lateral-Torsional Buckling Quick Assessment to EC3
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
 * Form data from the LTB Quick Check calculator
 */
export interface LtbQuickCheckFormData {
  // Section
  sectionType: string; // UKB, UKC, PFC
  sectionSize: string;
  steelGrade: string;

  // Member Configuration
  span: string; // m (between restraints)
  effectiveLengthFactor: string; // Default 1.0
  loadType: string; // UDL, Point at mid, Point at quarter, etc.
  loadPosition: string; // Top flange, Shear centre, Bottom flange

  // Applied Moment
  designMoment: string; // kNm (M_Ed)
  momentDiagram: string; // Uniform, Triangular, Parabolic

  // Restraint Conditions
  compressionFlangeRestraint: string; // None, Continuous, Intermediate
  endRestraintConditions: string; // Both fixed, One fixed, Both free
}

/**
 * Results from the LTB Quick Check calculator
 */
export interface LtbQuickCheckResults {
  // Section Properties
  depth: string;
  width: string;
  flangeThickness: string;
  webThickness: string;
  Iy: string; // cm4
  Iz: string; // cm4
  Iw: string; // cm6 (warping constant)
  It: string; // cm4 (torsion constant)
  Wply: string; // cm3

  // Material
  fy: string;
  E: string;
  G: string;

  // LTB Parameters
  effectiveLength: string; // m
  Mcr: string; // kNm (elastic critical moment)
  lambdaLT: string; // Non-dimensional slenderness
  lambdaLT0: string; // Plateau length
  betaFactor: string; // Correction factor

  // Imperfection Factor
  bucklingCurve: string; // a, b, c, d
  alphaLT: string;

  // Reduction Factor
  phiLT: string; // Intermediate value
  chiLT: string; // Reduction factor

  // Moment Resistance
  MplRd: string; // Plastic moment (kNm)
  MbRd: string; // LTB moment (kNm)

  // Utilisation
  momentUtil: string; // %
  ltbUtil: string; // %
  isLTBGoverning: string; // Yes/No

  // Assessment
  slendernessCategory: string; // Stocky, Intermediate, Slender

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
 * Build a ReportData object from LTB Quick Check calculator results
 */
export function buildLtbQuickCheckReport(
  formData: LtbQuickCheckFormData,
  results: LtbQuickCheckResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");

  // Determine overall status
  const overallStatus: "PASS" | "FAIL" =
    results.overallStatus === "PASS" ? "PASS" : "FAIL";

  // Build meta
  const meta = {
    title: "LTB Quick Check",
    projectName: options.projectName || "Beam LTB Assessment",
    clientName: options.clientName || "Client",
    documentRef:
      options.documentRef || `LTB-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || "Rev A",
    date: today,
    preparedBy: options.preparedBy || "BeaverCalc Studio",
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: "LTB Quick Check",
    designCodes: ["BS EN 1993-1-1:2005", "UK NA", "NCCI"],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.sectionType} ${formData.sectionSize} ${formData.steelGrade}, 
    ${formData.span}m unrestrained length. ${formData.loadType} loading.
    ${results.slendernessCategory} slenderness (λLT = ${results.lambdaLT}).`,
    keyResults: [
      {
        label: "Section",
        value: `${formData.sectionType} ${formData.sectionSize}`,
      },
      { label: "λLT", value: results.lambdaLT, highlight: true },
      { label: "χLT", value: results.chiLT },
      { label: "Mb,Rd", value: `${results.MbRd} kNm` },
      { label: "Utilisation", value: `${results.ltbUtil}%` },
    ],
    overallStatus,
    governingCheck: results.isLTBGoverning === "Yes" ? "LTB" : "Cross-section",
    utilisationSummary: `${results.ltbUtil}% LTB utilisation`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: "Section Selection",
        parameters: [
          { name: "Section Type", value: formData.sectionType },
          { name: "Section Size", value: formData.sectionSize },
          { name: "Steel Grade", value: formData.steelGrade },
          { name: "Yield Strength fy", value: results.fy, unit: "MPa" },
        ],
      },
      {
        title: "Section Properties",
        parameters: [
          { name: "Depth h", value: results.depth, unit: "mm" },
          { name: "Width b", value: results.width, unit: "mm" },
          { name: "Iy", value: results.Iy, unit: "cm⁴" },
          { name: "Iz", value: results.Iz, unit: "cm⁴" },
          { name: "Iw", value: results.Iw, unit: "cm⁶" },
          { name: "It", value: results.It, unit: "cm⁴" },
          { name: "Wpl,y", value: results.Wply, unit: "cm³" },
        ],
      },
      {
        title: "Member Configuration",
        parameters: [
          { name: "Unrestrained Length", value: formData.span, unit: "m" },
          {
            name: "Effective Length Factor k",
            value: formData.effectiveLengthFactor,
          },
          {
            name: "Effective Length L0",
            value: results.effectiveLength,
            unit: "m",
          },
          { name: "Load Type", value: formData.loadType },
          { name: "Load Position", value: formData.loadPosition },
        ],
      },
      {
        title: "Applied Loading",
        parameters: [
          {
            name: "Design Moment MEd",
            value: formData.designMoment,
            unit: "kNm",
          },
          { name: "Moment Diagram", value: formData.momentDiagram },
        ],
      },
      {
        title: "Restraint Conditions",
        parameters: [
          {
            name: "Compression Flange",
            value: formData.compressionFlangeRestraint,
          },
          { name: "End Restraints", value: formData.endRestraintConditions },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: "Cross-section Moment Resistance",
      description: "EC3 Cl.6.2.5",
      checks: [
        {
          name: "Plastic Moment",
          formula: "Mpl,Rd = Wpl × fy / γM0",
          calculated: `${results.MplRd} kNm`,
          limit: `MEd = ${formData.designMoment} kNm`,
          utilisation: parseFloat(results.momentUtil) / 100,
          status: parseFloat(results.momentUtil) <= 100 ? "PASS" : "FAIL",
        },
      ],
    },
    {
      title: "Elastic Critical Moment",
      description: "NCCI SN003 / EC3",
      checks: [
        {
          name: "Mcr",
          formula: "Mcr = C1 × (π²EIz/L²) × √(Iw/Iz + L²GIt/π²EIz)",
          calculated: `${results.Mcr} kNm`,
          limit: "Elastic buckling load",
          utilisation: 0,
          status: "PASS",
        },
      ],
    },
    {
      title: "LTB Slenderness",
      description: "EC3 Cl.6.3.2.2",
      checks: [
        {
          name: "Non-dimensional Slenderness",
          formula: "λLT = √(Wpl × fy / Mcr)",
          calculated: results.lambdaLT,
          limit: `λLT,0 = ${results.lambdaLT0}`,
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Slenderness Category",
          formula: "λLT ≤ 0.4: Stocky, ≤ 1.0: Intermediate, > 1.0: Slender",
          calculated: results.slendernessCategory,
          limit: "Classification",
          utilisation: 0,
          status: "PASS",
        },
      ],
    },
    {
      title: "LTB Reduction Factor",
      description: "EC3 Cl.6.3.2.3 (General case)",
      checks: [
        {
          name: "Buckling Curve",
          formula: `Curve ${results.bucklingCurve} for rolled I-sections`,
          calculated: `αLT = ${results.alphaLT}`,
          limit: "Imperfection factor",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Intermediate Value",
          formula: "φLT = 0.5[1 + αLT(λLT - λLT,0) + βλLT²]",
          calculated: results.phiLT,
          limit: "Per EC3",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Reduction Factor",
          formula: "χLT = 1 / (φLT + √(φLT² - βλLT²))",
          calculated: results.chiLT,
          limit: "≤ 1.0",
          utilisation: 0,
          status: "PASS",
        },
      ],
    },
    {
      title: "LTB Moment Resistance",
      description: "EC3 Cl.6.3.2.1",
      checks: [
        {
          name: "Mb,Rd",
          formula: "Mb,Rd = χLT × Wpl × fy / γM1",
          calculated: `${results.MbRd} kNm`,
          limit: `MEd = ${formData.designMoment} kNm`,
          utilisation: parseFloat(results.ltbUtil) / 100,
          status: results.overallStatus as "PASS" | "FAIL",
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Section Properties",
      steps: [
        {
          description: "From steel tables",
          formula: `${formData.sectionType} ${formData.sectionSize}`,
          result: `h = ${results.depth}mm, b = ${results.width}mm`,
        },
        {
          description: "Second moment of area (minor)",
          formula: "Iz from tables",
          result: `Iz = ${results.Iz} cm⁴`,
        },
        {
          description: "Warping constant",
          formula: "Iw from tables",
          result: `Iw = ${results.Iw} cm⁶`,
        },
        {
          description: "Torsion constant",
          formula: "It from tables",
          result: `It = ${results.It} cm⁴`,
        },
      ],
    },
    {
      title: "Elastic Critical Moment",
      steps: [
        {
          description: "Effective length",
          formula: "L0 = k × L",
          substitution: `L0 = ${formData.effectiveLengthFactor} × ${formData.span}`,
          result: `L0 = ${results.effectiveLength} m`,
        },
        {
          description: "C1 factor",
          formula: "Based on moment diagram",
          result: `C1 for ${formData.momentDiagram} moment`,
        },
        {
          description: "Elastic critical moment",
          formula: "Mcr = C1 × (π²EIz/L²) × √(Iw/Iz + L²GIt/π²EIz)",
          result: `Mcr = ${results.Mcr} kNm`,
        },
      ],
    },
    {
      title: "Non-dimensional Slenderness",
      steps: [
        {
          description: "Plastic moment",
          formula: "Mpl = Wpl × fy",
          substitution: `Mpl = ${results.Wply} × 10³ × ${results.fy} / 10⁶`,
          result: `Mpl = ${results.MplRd} kNm`,
        },
        {
          description: "Slenderness ratio",
          formula: "λLT = √(Mpl / Mcr)",
          substitution: `λLT = √(${results.MplRd} / ${results.Mcr})`,
          result: `λLT = ${results.lambdaLT}`,
        },
      ],
    },
    {
      title: "LTB Reduction Factor",
      steps: [
        {
          description: "Buckling curve",
          formula: "h/b ratio determines curve",
          result: `Curve ${results.bucklingCurve}, αLT = ${results.alphaLT}`,
        },
        {
          description: "Plateau length",
          formula: "λLT,0 = 0.4 (UK NA)",
          result: `λLT,0 = ${results.lambdaLT0}`,
        },
        {
          description: "β factor",
          formula: "β = 0.75 (UK NA)",
          result: `β = ${results.betaFactor}`,
        },
        {
          description: "φLT calculation",
          formula: "φLT = 0.5[1 + αLT(λLT - λLT,0) + βλLT²]",
          result: `φLT = ${results.phiLT}`,
        },
        {
          description: "χLT calculation",
          formula: "χLT = 1 / (φLT + √(φLT² - βλLT²))",
          result: `χLT = ${results.chiLT}`,
        },
      ],
    },
    {
      title: "Moment Resistance",
      steps: [
        {
          description: "LTB moment resistance",
          formula: "Mb,Rd = χLT × Wpl × fy / γM1",
          substitution: `Mb,Rd = ${results.chiLT} × ${results.Wply} × 10³ × ${results.fy} / (1.0 × 10⁶)`,
          result: `Mb,Rd = ${results.MbRd} kNm`,
        },
        {
          description: "LTB utilisation",
          formula: "Util = MEd / Mb,Rd × 100",
          substitution: `Util = ${formData.designMoment} / ${results.MbRd} × 100`,
          result: `${results.ltbUtil}%`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes("fail") ? "error" : "warning",
    message: w,
  }));

  if (results.isLTBGoverning === "Yes") {
    reportWarnings.push({
      type: "info",
      message:
        "LTB governs - consider intermediate restraints to increase capacity",
    });
  }

  if (parseFloat(results.lambdaLT) > 1.5) {
    reportWarnings.push({
      type: "warning",
      message: `High slenderness λLT = ${results.lambdaLT} - significant LTB reduction`,
    });
  }

  if (formData.loadPosition === "Top flange") {
    reportWarnings.push({
      type: "info",
      message: "Load on top flange - destabilizing effect included in Mcr",
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === "PASS"
        ? `${formData.sectionType} ${formData.sectionSize} ${formData.steelGrade} is ADEQUATE.
         χLT = ${results.chiLT}, Mb,Rd = ${results.MbRd}kNm ≥ MEd = ${formData.designMoment}kNm.
         ${results.slendernessCategory} slenderness (λLT = ${results.lambdaLT}).`
        : `Section FAILS LTB check at ${results.ltbUtil}%. Reduce restraint spacing or increase section.`,
    status: overallStatus,
    recommendations: [
      results.isLTBGoverning === "Yes"
        ? `Reduce unrestrained length from ${formData.span}m to increase Mb,Rd`
        : "Cross-section capacity governs - adequate restraint",
      parseFloat(results.lambdaLT) < 0.4
        ? "No LTB reduction - λLT < 0.4"
        : `χLT = ${results.chiLT} applied`,
      `Effective length: ${results.effectiveLength}m (k = ${formData.effectiveLengthFactor})`,
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
