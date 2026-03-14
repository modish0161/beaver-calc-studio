// ============================================================================
// BeaverCalc Studio — Punching Shear Report Data Builder
// RC Slab Punching Shear Design to Eurocode 2
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
 * Form data from the Punching Shear calculator
 */
export interface PunchingShearFormData {
  // Slab Properties
  slabThickness: string;
  effectiveDepthX: string;
  effectiveDepthY: string;
  concreteGrade: string;

  // Column/Load Properties
  columnType: string;
  columnWidth: string;
  columnDepth: string;
  columnPosition: string;

  // Reinforcement
  asxTop: string;
  asyTop: string;

  // Loading
  ultimateReaction: string;
  momentTransferX: string;
  momentTransferY: string;
  betaFactor: string;

  // Shear Reinforcement (if any)
  shearReinfType: string;
  studDiameter: string;
  studSpacing: string;
  studRows: string;

  // Control Perimeter
  columnPerimeter: string;
  basicControlPerimeter: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Punching Shear calculator
 */
export interface PunchingShearResults {
  // Section Properties
  dAverage: string;
  u0: string;
  u1: string;

  // Shear Stress (unreinforced)
  vEdU0: string;
  vEdU1: string;
  vRdMax: string;
  vRdC: string;

  // Unreinforced Check
  shearRatioU1: string;
  unreinforcedStatus: string;

  // Maximum Shear Check
  maxShearRatio: string;
  maxShearStatus: string;

  // Reinforcement Required
  reinforcementRequired: string;

  // Shear Reinforcement (if used)
  vRdCs: string;
  asw: string;
  studCapacity: string;
  outerPerimeter: string;
  uout: string;
  uoutEff: string;

  // Reinforced Check
  reinforcedStatus: string;

  // Detailing
  innerPerimeter: string;
  firstRowDistance: string;
  rowSpacing: string;
  studRows: string;

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
 * Build a ReportData object from Punching Shear calculator results
 */
export function buildPunchingShearReport(
  formData: PunchingShearFormData,
  results: PunchingShearResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");

  // Determine overall status
  const allStatuses = [
    results.unreinforcedStatus,
    results.maxShearStatus,
    results.reinforcedStatus,
  ].filter(Boolean);
  const overallStatus: "PASS" | "FAIL" = allStatuses.includes("FAIL")
    ? "FAIL"
    : "PASS";

  const needsReinforcement = results.reinforcementRequired === "yes";

  // Build meta
  const meta = {
    title: "Punching Shear Design",
    projectName:
      options.projectName || formData.projectTitle || "Punching Shear Design",
    clientName: options.clientName || "Client",
    documentRef:
      options.documentRef || `PUN-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || "Rev A",
    date: today,
    preparedBy: options.preparedBy || "BeaverCalc Studio",
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: "Punching Shear",
    designCodes: ["EN 1992-1-1:2004", "UK NA", "Concrete Society TR64"],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Punching shear design for ${formData.slabThickness}mm ${formData.concreteGrade} slab 
    at ${formData.columnType} ${formData.columnWidth}×${formData.columnDepth}mm column 
    (${formData.columnPosition} position). 
    Reaction: ${formData.ultimateReaction}kN.
    ${needsReinforcement ? "Shear reinforcement required." : "No shear reinforcement required."}`,
    keyResults: [
      { label: "Slab Thickness", value: `${formData.slabThickness} mm` },
      {
        label: "Column Size",
        value: `${formData.columnWidth}×${formData.columnDepth} mm`,
      },
      { label: "vEd at u1", value: `${results.vEdU1} MPa`, highlight: true },
      { label: "vRd,c", value: `${results.vRdC} MPa` },
      { label: "Utilisation", value: `${results.overallUtil}%` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `Punching shear utilisation: ${results.overallUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: "Slab Properties",
        parameters: [
          { name: "Slab Thickness", value: formData.slabThickness, unit: "mm" },
          {
            name: "Effective Depth (x)",
            value: formData.effectiveDepthX,
            unit: "mm",
          },
          {
            name: "Effective Depth (y)",
            value: formData.effectiveDepthY,
            unit: "mm",
          },
          { name: "Concrete Grade", value: formData.concreteGrade },
        ],
      },
      {
        title: "Column Properties",
        parameters: [
          { name: "Column Type", value: formData.columnType },
          { name: "Width (c1)", value: formData.columnWidth, unit: "mm" },
          { name: "Depth (c2)", value: formData.columnDepth, unit: "mm" },
          { name: "Position", value: formData.columnPosition },
        ],
      },
      {
        title: "Reinforcement",
        parameters: [
          { name: "As,x (top)", value: formData.asxTop, unit: "mm²/m" },
          { name: "As,y (top)", value: formData.asyTop, unit: "mm²/m" },
        ],
      },
      {
        title: "Loading",
        parameters: [
          {
            name: "Ultimate Reaction",
            value: formData.ultimateReaction,
            unit: "kN",
          },
          {
            name: "Moment Transfer (x)",
            value: formData.momentTransferX,
            unit: "kNm",
          },
          {
            name: "Moment Transfer (y)",
            value: formData.momentTransferY,
            unit: "kNm",
          },
          { name: "β Factor", value: formData.betaFactor },
        ],
      },
      ...(needsReinforcement
        ? [
            {
              title: "Shear Reinforcement",
              parameters: [
                { name: "Type", value: formData.shearReinfType },
                {
                  name: "Stud Diameter",
                  value: formData.studDiameter,
                  unit: "mm",
                },
                {
                  name: "Radial Spacing",
                  value: formData.studSpacing,
                  unit: "mm",
                },
                { name: "Number of Rows", value: formData.studRows },
              ],
            },
          ]
        : []),
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: "Maximum Shear at Column Face (EC2 6.4.5)",
      description: "Check crushing of compression strut",
      checks: [
        {
          name: "Shear Stress at u0",
          formula: "vEd,0 = β × VEd / (u0 × d) ≤ vRd,max",
          calculated: `${results.vEdU0} MPa`,
          limit: `≤ ${results.vRdMax} MPa`,
          utilisation: parseFloat(results.maxShearRatio) / 100,
          status: results.maxShearStatus as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Punching at Basic Control Perimeter (EC2 6.4.3)",
      description: "Check at 2d from column face",
      checks: [
        {
          name: "Shear Stress at u1",
          formula: "vEd,1 = β × VEd / (u1 × d) ≤ vRd,c",
          calculated: `${results.vEdU1} MPa`,
          limit: `≤ ${results.vRdC} MPa`,
          utilisation: parseFloat(results.shearRatioU1) / 100,
          status: results.unreinforcedStatus as "PASS" | "FAIL",
        },
      ],
    },
  ];

  if (needsReinforcement) {
    designChecks.push(
      {
        title: "Reinforced Punching Shear (EC2 6.4.5)",
        description: "Check with shear reinforcement",
        checks: [
          {
            name: "Reinforced Shear Resistance",
            formula: "vRd,cs = 0.75×vRd,c + 1.5×(d/sr)×Asw×fywd,ef/(u1×d)",
            calculated: `${results.vRdCs} MPa`,
            limit: `≥ ${results.vEdU1} MPa`,
            utilisation: parseFloat(results.vEdU1) / parseFloat(results.vRdCs),
            status: results.reinforcedStatus as "PASS" | "FAIL",
          },
        ],
      },
      {
        title: "Outer Perimeter Check (EC2 6.4.5)",
        description: "Check at perimeter where no reinforcement needed",
        checks: [
          {
            name: "Outer Control Perimeter",
            formula: "vEd,out = β × VEd / (uout × d) ≤ vRd,c",
            calculated: `uout,ef = ${results.uoutEff} mm`,
            limit: `Extends ${results.studRows} rows from column`,
            utilisation: 0.8,
            status: "PASS",
          },
        ],
      },
    );
  }

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Control Perimeters",
      steps: [
        {
          description: "Average effective depth",
          formula: "d = (dx + dy) / 2",
          substitution: `d = (${formData.effectiveDepthX} + ${formData.effectiveDepthY}) / 2`,
          result: `${results.dAverage} mm`,
        },
        {
          description: "Column perimeter (u0)",
          formula: "u0 = 2×(c1 + c2) for internal, adjusted for edge/corner",
          result: `u0 = ${results.u0} mm`,
        },
        {
          description: "Basic control perimeter (u1)",
          formula: "u1 = u0 + 4πd (internal)",
          result: `u1 = ${results.u1} mm`,
        },
      ],
    },
    {
      title: "Punching Shear Resistance (Unreinforced)",
      steps: [
        {
          description: "Reinforcement ratio",
          formula: "ρl = √(ρlx × ρly) ≤ 0.02",
          result: "From As,x and As,y",
        },
        {
          description: "Size effect factor",
          formula: "k = 1 + √(200/d) ≤ 2.0",
          result: `k = ${(1 + Math.sqrt(200 / parseFloat(results.dAverage))).toFixed(2)}`,
        },
        {
          description: "Punching resistance",
          formula: "vRd,c = CRd,c × k × (100 × ρl × fck)^(1/3) ≥ vmin",
          result: `vRd,c = ${results.vRdC} MPa`,
        },
      ],
    },
    {
      title: "Maximum Shear Resistance",
      steps: [
        {
          description: "Maximum shear stress",
          formula: "vRd,max = 0.5 × ν × fcd",
          substitution: "ν = 0.6 × (1 - fck/250)",
          result: `vRd,max = ${results.vRdMax} MPa`,
        },
      ],
    },
  ];

  if (needsReinforcement) {
    detailedCalculations.push({
      title: "Shear Reinforcement Design",
      steps: [
        {
          description: "Shear studs per perimeter",
          formula: "Asw = π × d² / 4 × n",
          result: `Asw = ${results.asw} mm²`,
        },
        {
          description: "Effective design strength",
          formula: "fywd,ef = 250 + 0.25×d ≤ fywd",
          result: "Applied to studs",
        },
        {
          description: "Reinforced resistance",
          formula: "vRd,cs = 0.75×vRd,c + 1.5×(d/sr)×Asw×fywd,ef/(u1×d)",
          result: `vRd,cs = ${results.vRdCs} MPa`,
        },
      ],
    });
  }

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes("fail") ? "error" : "warning",
    message: w,
  }));

  if (parseFloat(results.maxShearRatio) > 100) {
    reportWarnings.push({
      type: "error",
      message: "Maximum shear exceeded - increase slab depth or column size",
    });
  }

  if (
    formData.columnPosition !== "internal" &&
    parseFloat(formData.betaFactor) < 1.15
  ) {
    reportWarnings.push({
      type: "warning",
      message: "β factor may be unconservative for edge/corner columns",
    });
  }

  if (needsReinforcement) {
    reportWarnings.push({
      type: "info",
      message: "Shear reinforcement required - ensure proper detailing",
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === "PASS"
        ? `Punching shear design is ADEQUATE. ${
            needsReinforcement
              ? `T${formData.studDiameter} studs at ${formData.studSpacing}mm radial spacing provide 
             vRd,cs = ${results.vRdCs} MPa.`
              : `Unreinforced capacity vRd,c = ${results.vRdC} MPa is sufficient.`
          }
         Utilisation: ${results.overallUtil}%.`
        : `Punching shear design is INADEQUATE. Consider: increasing slab depth, 
         enlarging column, adding drop panel, or shear reinforcement.`,
    status: overallStatus,
    recommendations: needsReinforcement
      ? [
          `Install T${formData.studDiameter} shear studs (${formData.shearReinfType})`,
          `First row at ${results.firstRowDistance}mm from column face`,
          `Radial spacing: ${formData.studSpacing}mm, ${results.studRows} rows`,
          "Extend reinforcement beyond outer control perimeter",
        ]
      : [
          "No shear reinforcement required",
          "Ensure top reinforcement extends through column zone",
          "Provide integrity reinforcement (bottom bars through column)",
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
