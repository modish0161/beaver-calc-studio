// ============================================================================
// BeaverCalc Studio — Pile Foundations Report Data Builder
// EN 1997-1 Deep Foundation Design — Bored, CFA & Driven Piles
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
 * Form data passed from the Pile Foundations calculator
 */
export interface PileFoundationsFormData {
  pileType: string;
  pileDiameter: number | string;
  pileLength: number | string;
  numberOfPiles: number | string;
  pileSpacing: number | string;
  layout: string;
  soilProfile: string;
  loadVertical: number | string;
  loadHorizontal: number | string;
  moment: number | string;
  concreteGrade: string;
  projectName: string;
  reference: string;
}

/**
 * Results passed from the Pile Foundations calculator
 */
export interface PileFoundationsResults {
  shaftFriction: number;
  endBearing: number;
  ultimateCapacity: number;
  designCapacity: number;
  axialUtil: number;
  lateralCapacity: number;
  lateralUtil: number;
  momentCapacity: number;
  momentUtil: number;
  settlement: number;
  groupCapacity: number;
  groupEfficiency: number;
  governingUtil: number;
  capShearCheck: number;
  capPunchingCheck: number;
  status: string;
}

export interface BuilderOptions {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

/**
 * Build a premium ReportData object from Pile Foundations calculator results
 */
export function buildPileFoundationsReport(
  formData: PileFoundationsFormData,
  results: PileFoundationsResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");
  const overallStatus: "PASS" | "FAIL" =
    results.governingUtil > 1.0 ? "FAIL" : "PASS";
  const govPct = (results.governingUtil * 100).toFixed(1);

  const meta = {
    title: "Pile Foundation Design",
    projectName:
      options.projectName || formData.projectName || "Pile Foundation Design",
    clientName: options.clientName || "Client",
    documentRef: `PIL-${Date.now().toString(36).toUpperCase()}`,
    version: "Rev A",
    date: today,
    preparedBy: options.preparedBy || "BeaverCalc Studio",
    calculatorName: "Pile Foundations",
    designCodes: ["EN 1997-1", "BS 8004", "Tomlinson & Woodward"],
  };

  const executiveSummary = {
    description: `${formData.pileType} pile foundation design: ${formData.numberOfPiles}nr × Ø${formData.pileDiameter}m × ${formData.pileLength}m long piles in ${formData.layout} layout at ${formData.pileSpacing}m c/c in ${formData.soilProfile} ground.`,
    keyResults: [
      {
        label: "Pile Size",
        value: `Ø${formData.pileDiameter}m × ${formData.pileLength}m`,
      },
      {
        label: "Ultimate Capacity",
        value: `${results.ultimateCapacity.toFixed(0)} kN`,
        highlight: true,
      },
      {
        label: "Design Capacity",
        value: `${results.designCapacity.toFixed(0)} kN`,
      },
      {
        label: "Group Capacity",
        value: `${results.groupCapacity.toFixed(0)} kN`,
      },
      { label: "Governing Util.", value: `${govPct}%` },
      { label: "Settlement", value: `${results.settlement.toFixed(1)} mm` },
    ],
    overallStatus,
    governingCheck: getGoverningCheck(results),
    utilisationSummary: `Max utilisation: ${govPct}%`,
  };

  const inputs: ReportInputs = {
    sections: [
      {
        title: "Pile Properties",
        parameters: [
          { name: "Pile Type", value: formData.pileType },
          { name: "Diameter", value: String(formData.pileDiameter), unit: "m" },
          { name: "Length", value: String(formData.pileLength), unit: "m" },
          { name: "Number of Piles", value: String(formData.numberOfPiles) },
          { name: "Spacing", value: String(formData.pileSpacing), unit: "m" },
          { name: "Layout", value: formData.layout },
          { name: "Concrete Grade", value: formData.concreteGrade },
        ],
      },
      {
        title: "Loading",
        parameters: [
          {
            name: "Vertical Load",
            value: String(formData.loadVertical),
            unit: "kN",
          },
          {
            name: "Horizontal Load",
            value: String(formData.loadHorizontal),
            unit: "kN",
          },
          { name: "Moment", value: String(formData.moment), unit: "kNm" },
        ],
      },
      {
        title: "Ground Conditions",
        parameters: [{ name: "Soil Profile", value: formData.soilProfile }],
      },
    ],
  };

  const designChecks: DesignCheckSection[] = [
    {
      title: "Single Pile Axial Capacity",
      description: "EN 1997-1 §7.6 — shaft friction + end bearing",
      checks: [
        {
          name: "Shaft Resistance",
          formula: "Qs = Σ(α·Cu·As) or Σ(K·σ'v·tan δ·As)",
          calculated: `${results.shaftFriction.toFixed(0)} kN`,
          limit: "N/A",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "End Bearing",
          formula: "Qb = Nc·Cu·Ab or Nq·σ'v·Ab",
          calculated: `${results.endBearing.toFixed(0)} kN`,
          limit: "N/A",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Ultimate Capacity",
          formula: "Qult = Qs + Qb",
          calculated: `${results.ultimateCapacity.toFixed(0)} kN`,
          limit: "N/A",
          utilisation: 0,
          status: "PASS",
        },
        {
          name: "Design Capacity",
          formula: "Qd = Qult / γR",
          calculated: `${results.designCapacity.toFixed(0)} kN`,
          limit: `≥ ${formData.loadVertical} kN (per pile)`,
          utilisation: results.axialUtil,
          status: (results.axialUtil <= 1.0 ? "PASS" : "FAIL") as
            | "PASS"
            | "FAIL",
        },
      ],
    },
    {
      title: "Lateral & Moment Capacity",
      description: "Broms method",
      checks: [
        {
          name: "Lateral Capacity",
          formula: "Broms short/long pile analysis",
          calculated: `${results.lateralCapacity.toFixed(0)} kN`,
          limit: `≥ ${formData.loadHorizontal} kN`,
          utilisation: results.lateralUtil,
          status: (results.lateralUtil <= 1.0 ? "PASS" : "FAIL") as
            | "PASS"
            | "FAIL",
        },
        {
          name: "Moment Capacity",
          formula: "M_Rd from reinforced concrete section",
          calculated: `${results.momentCapacity.toFixed(0)} kNm`,
          limit: `≥ ${formData.moment} kNm`,
          utilisation: results.momentUtil,
          status: (results.momentUtil <= 1.0 ? "PASS" : "FAIL") as
            | "PASS"
            | "FAIL",
        },
      ],
    },
    {
      title: "Pile Group & Cap",
      description: "Group efficiency, shear and punching checks",
      checks: [
        {
          name: "Group Capacity",
          formula: "Qg = n × Qd × η",
          calculated: `${results.groupCapacity.toFixed(0)} kN`,
          limit: `≥ ${formData.loadVertical} kN`,
          utilisation: results.governingUtil,
          status: (results.governingUtil <= 1.0 ? "PASS" : "FAIL") as
            | "PASS"
            | "FAIL",
        },
        {
          name: "Pile Cap Shear",
          formula: "V_Ed / V_Rd ≤ 1.0",
          calculated: `${(results.capShearCheck * 100).toFixed(0)}%`,
          limit: "≤ 100%",
          utilisation: results.capShearCheck,
          status: (results.capShearCheck <= 1.0 ? "PASS" : "FAIL") as
            | "PASS"
            | "FAIL",
        },
        {
          name: "Punching Shear",
          formula: "v_Ed / v_Rd,c ≤ 1.0",
          calculated: `${(results.capPunchingCheck * 100).toFixed(0)}%`,
          limit: "≤ 100%",
          utilisation: results.capPunchingCheck,
          status: (results.capPunchingCheck <= 1.0 ? "PASS" : "FAIL") as
            | "PASS"
            | "FAIL",
        },
      ],
    },
    {
      title: "Settlement",
      description: "Elastic + Randolph & Wroth",
      checks: [
        {
          name: "Single Pile Settlement",
          formula: "δ = δ_elastic + δ_R&W",
          calculated: `${results.settlement.toFixed(1)} mm`,
          limit: "≤ 25 mm",
          utilisation: results.settlement / 25,
          status: (results.settlement <= 25 ? "PASS" : "FAIL") as
            | "PASS"
            | "FAIL",
        },
      ],
    },
  ];

  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Pile Geometry",
      steps: [
        {
          description: "Pile cross-sectional area",
          formula: "A = π×D²/4",
          substitution: `A = π × ${formData.pileDiameter}² / 4`,
          result: `${((Math.PI * Math.pow(Number(formData.pileDiameter), 2)) / 4).toFixed(3)} m²`,
        },
        {
          description: "Shaft surface area",
          formula: "As = π × D × L",
          substitution: `As = π × ${formData.pileDiameter} × ${formData.pileLength}`,
          result: `${(Math.PI * Number(formData.pileDiameter) * Number(formData.pileLength)).toFixed(2)} m²`,
        },
      ],
    },
    {
      title: "Capacity Breakdown",
      steps: [
        {
          description: "Shaft friction contribution",
          formula: "Qs / Qult",
          result: `${((results.shaftFriction / results.ultimateCapacity) * 100).toFixed(0)}% (${results.shaftFriction.toFixed(0)} kN)`,
        },
        {
          description: "End bearing contribution",
          formula: "Qb / Qult",
          result: `${((results.endBearing / results.ultimateCapacity) * 100).toFixed(0)}% (${results.endBearing.toFixed(0)} kN)`,
        },
        {
          description: "Group efficiency factor",
          formula: "η",
          result: `${(results.groupEfficiency * 100).toFixed(0)}%`,
        },
      ],
    },
  ];

  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: (w.toLowerCase().includes("fail") ||
    w.toLowerCase().includes("exceed")
      ? "error"
      : "warning") as "error" | "warning",
    message: w,
  }));

  const conclusion: ReportConclusion = {
    summary:
      overallStatus === "PASS"
        ? `The pile foundation design is ADEQUATE. ${formData.numberOfPiles}nr × Ø${formData.pileDiameter}m × ${formData.pileLength}m ${formData.pileType} piles at ${formData.pileSpacing}m c/c provide design capacity of ${results.designCapacity.toFixed(0)} kN/pile (group ${results.groupCapacity.toFixed(0)} kN) with ${govPct}% governing utilisation and ${results.settlement.toFixed(1)}mm settlement.`
        : `The pile foundation design is INADEQUATE at ${govPct}% utilisation. Consider longer piles, larger diameter, additional piles, or revised ground improvement.`,
    status: overallStatus,
    recommendations: [
      `Install ${formData.numberOfPiles}nr × Ø${formData.pileDiameter}m piles to ${formData.pileLength}m depth`,
      `Maintain ${formData.pileSpacing}m minimum c/c spacing`,
      "Verify pile capacity with static load test on working pile",
      "Monitor settlement during and after construction",
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

function getGoverningCheck(results: PileFoundationsResults): string {
  const checks = [
    { name: "Axial Capacity", util: results.axialUtil },
    { name: "Lateral Capacity", util: results.lateralUtil },
    { name: "Moment", util: results.momentUtil },
    { name: "Settlement", util: results.settlement / 25 },
  ];
  return checks.reduce((a, b) => (a.util > b.util ? a : b)).name;
}
