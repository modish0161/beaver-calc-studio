// =============================================================================
// BeaverCalc Studio — Deck Slab Report Data Builder
// RC Deck Slab Design to EN 1992-1-1 / EN 1992-2
// =============================================================================

import type {
  DesignCheckSection,
  DetailedCalculation,
  ReportConclusion,
  ReportData,
  ReportInputs,
  ReportWarning,
} from "../types";

export interface BuilderOptions {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  documentRef?: string;
  version?: string;
}

// Helper: safely read a numeric value with fallback
const num = (v: any, fallback = 0): number => {
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
};
const str = (v: any, fallback = "-"): string =>
  v != null && v !== "" ? String(v) : fallback;

/**
 * Build a ReportData object directly from the DeckSlab calculator's
 * formData and results objects.
 */
export function buildDeckSlabReport(
  formData: Record<string, any>,
  results: Record<string, any>,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");

  // Shortcuts for nested result groups
  const bendX = results.bending_check_x ?? {};
  const bendY = results.bending_check_y ?? {};
  const shearChk = results.shear_check ?? {};
  const deflChk = results.deflection_check ?? {};
  const crackChk = results.crack_width_check ?? {};
  const reinfX = results.reinforcement_x ?? {};
  const reinfY = results.reinforcement_y ?? {};
  const reinfSched = results.reinforcement_schedule ?? {};
  const moments = results.design_moments ?? {};
  const shears = results.design_shears ?? {};
  const utilSummary = results.utilisation_summary ?? {};

  // Determine overall status
  const allStatuses = [
    bendX.status,
    bendY.status,
    shearChk.status,
    deflChk.status,
    crackChk.status,
  ].filter(Boolean);
  const overallStatus: "PASS" | "FAIL" = allStatuses.includes("FAIL")
    ? "FAIL"
    : "PASS";

  // Governing check
  const utils = [
    { name: "Bending (X)", util: num(bendX.utilisation) },
    { name: "Bending (Y)", util: num(bendY.utilisation) },
    { name: "Shear", util: num(shearChk.utilisation) },
    { name: "Deflection", util: num(deflChk.utilisation) },
    { name: "Crack Width", util: num(crackChk.utilisation) },
  ].filter((u) => u.util > 0);
  const maxUtil =
    utils.length > 0
      ? utils.reduce((a, b) => (a.util > b.util ? a : b))
      : { name: "Bending (X)", util: 0 };

  // Build meta
  const meta = {
    title: "Deck Slab Design",
    projectName: options.projectName || "Deck Slab Design",
    clientName: options.clientName || "Client",
    documentRef:
      options.documentRef || `DEC-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || "Rev A",
    date: today,
    preparedBy: options.preparedBy || "BeaverCalc Studio",
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: "Deck Slab",
    designCodes: ["EN 1992-1-1:2004", "EN 1992-2:2005", "EN 1990"],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Reinforced concrete deck slab: ${formData.thickness}mm ${formData.concreteGrade} (${results.isOneWay ? "one-way" : "two-way"}). Spans ${formData.lengthX}m × ${formData.lengthY}m. T${formData.barDiameter} ${formData.steelGrade} reinforcement.`,
    keyResults: [
      { label: "Slab Type", value: results.isOneWay ? "One-Way" : "Two-Way" },
      { label: "Thickness", value: `${formData.thickness} mm` },
      {
        label: "Bending M_Rd (X)",
        value: `${str(bendX.M_Rd)} kN·m`,
        highlight: true,
      },
      { label: "Max Utilisation", value: `${maxUtil.util.toFixed(1)}%` },
      { label: "Reinf. X", value: str(reinfSched.bottom_x?.bars) },
      { label: "Reinf. Y", value: str(reinfSched.bottom_y?.bars) },
    ],
    overallStatus,
    governingCheck: maxUtil.name,
    utilisationSummary: `Max utilisation: ${maxUtil.util.toFixed(0)}% (${maxUtil.name})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: "Slab Geometry",
        parameters: [
          {
            name: "Slab Type",
            value: results.isOneWay ? "One-Way" : "Two-Way",
          },
          { name: "Length X", value: str(formData.lengthX), unit: "m" },
          { name: "Length Y", value: str(formData.lengthY), unit: "m" },
          { name: "Thickness", value: str(formData.thickness), unit: "mm" },
          { name: "Support X", value: str(formData.supportX) },
          { name: "Support Y", value: str(formData.supportY) },
        ],
      },
      {
        title: "Materials",
        parameters: [
          { name: "Concrete Grade", value: str(formData.concreteGrade) },
          { name: "Steel Grade", value: str(formData.steelGrade) },
          { name: "Cover (top)", value: str(formData.coverTop), unit: "mm" },
          {
            name: "Cover (bottom)",
            value: str(formData.coverBottom),
            unit: "mm",
          },
          {
            name: "Bar Diameter",
            value: `T${formData.barDiameter}`,
            unit: "mm",
          },
        ],
      },
      {
        title: "Loading",
        parameters: [
          { name: "Dead Load", value: str(formData.deadLoad), unit: "kN/m²" },
          { name: "Live Load", value: str(formData.liveLoad), unit: "kN/m²" },
          {
            name: "ULS Load",
            value: str(results.total_load_uls_kN_per_m2),
            unit: "kN/m²",
          },
          { name: "Deflection Limit", value: str(formData.deflectionLimit) },
        ],
      },
      {
        title: "Reinforcement Schedule",
        parameters: [
          { name: "Bottom X", value: str(reinfSched.bottom_x?.bars) },
          { name: "Bottom Y", value: str(reinfSched.bottom_y?.bars) },
          { name: "Top X", value: str(reinfSched.top_x?.bars) },
          { name: "Top Y", value: str(reinfSched.top_y?.bars) },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: "Bending — X Direction (EC2 Cl.6.1)",
      description: "Sagging moment resistance in short span direction",
      checks: [
        {
          name: "Moment Resistance (X)",
          formula: "M_Ed ≤ M_Rd",
          calculated: `M_Ed = ${str(moments.M_Ed_x)} kN·m/m`,
          limit: `M_Rd = ${str(bendX.M_Rd)} kN·m/m`,
          utilisation: num(bendX.utilisation) / 100,
          status: (bendX.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Bending — Y Direction (EC2 Cl.6.1)",
      description: "Sagging moment resistance in long span direction",
      checks: [
        {
          name: "Moment Resistance (Y)",
          formula: "M_Ed ≤ M_Rd",
          calculated: `M_Ed = ${str(moments.M_Ed_y)} kN·m/m`,
          limit: `M_Rd = ${str(bendY.M_Rd)} kN·m/m`,
          utilisation: num(bendY.utilisation) / 100,
          status: (bendY.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Punching / One-Way Shear (EC2 Cl.6.2)",
      description: "Concrete shear resistance without links",
      checks: [
        {
          name: "Shear Resistance",
          formula: "V_Ed ≤ V_Rd,c",
          calculated: `V_Ed = ${str(shears.V_Ed)} kN/m`,
          limit: `V_Rd,c = ${str(shearChk.V_Rd_c)} kN/m`,
          utilisation: num(shearChk.utilisation) / 100,
          status: (shearChk.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "SLS Deflection (EC2 Cl.7.4)",
      description: "Span/depth ratio check",
      checks: [
        {
          name: "Deflection (L/d ratio)",
          formula: "L/d_actual ≤ L/d_allowable",
          calculated: `L/d = ${str(deflChk.actual_ld)}`,
          limit: `≤ ${str(deflChk.allowable_ld)}`,
          utilisation: num(deflChk.utilisation) / 100,
          status: (deflChk.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Crack Width (EC2 Cl.7.3)",
      description: "Serviceability crack width check",
      checks: [
        {
          name: "Crack Width",
          formula: "w_k ≤ w_k,limit",
          calculated: `w_k = ${str(crackChk.w_k)} mm`,
          limit: `≤ ${str(crackChk.w_k_limit)} mm`,
          utilisation: num(crackChk.utilisation) / 100,
          status: (crackChk.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Design Moments",
      steps: [
        {
          description: "Design moment X (sagging)",
          formula: "M_Ed,x from coefficients × n × lx²",
          result: `M_Ed,x = ${str(moments.M_Ed_x)} kN·m/m`,
        },
        {
          description: "Design moment Y (sagging)",
          formula: "M_Ed,y from coefficients × n × ly²",
          result: `M_Ed,y = ${str(moments.M_Ed_y)} kN·m/m`,
        },
        {
          description: "Design shear",
          formula: "V_Ed from β × n × lx",
          result: `V_Ed = ${str(shears.V_Ed)} kN/m`,
        },
      ],
    },
    {
      title: "Reinforcement Design (X)",
      steps: [
        {
          description: "Required reinforcement area",
          formula: "A_s,req from M_Ed / (0.87 × f_yk × z)",
          result: `A_s,req = ${str(reinfX.As_required)} mm²/m`,
        },
        {
          description: "Provided reinforcement area",
          formula: `T${formData.barDiameter} @ ${str(reinfX.spacing)}mm c/c`,
          result: `A_s,prov = ${str(reinfX.As_provided)} mm²/m`,
        },
        {
          description: "K factor",
          formula: "K = M / (b × d² × f_ck)",
          result: `K = ${str(reinfX.K)}`,
        },
      ],
    },
    {
      title: "Reinforcement Design (Y)",
      steps: [
        {
          description: "Required reinforcement area",
          formula: "A_s,req from M_Ed / (0.87 × f_yk × z)",
          result: `A_s,req = ${str(reinfY.As_required)} mm²/m`,
        },
        {
          description: "Provided reinforcement area",
          formula: `T${formData.barDiameter} @ ${str(reinfY.spacing)}mm c/c`,
          result: `A_s,prov = ${str(reinfY.As_provided)} mm²/m`,
        },
        {
          description: "K factor",
          formula: "K = M / (b × d² × f_ck)",
          result: `K = ${str(reinfY.K)}`,
        },
      ],
    },
    {
      title: "Shear Resistance",
      steps: [
        {
          description: "Shear factor k",
          formula: "k = min(1 + √(200/d), 2.0)",
          result: `k = ${str(shearChk.k)}`,
        },
        {
          description: "Reinforcement ratio",
          formula: "ρ_l = A_s / (b × d)",
          result: `ρ_l = ${str(shearChk.rho_l)}%`,
        },
        {
          description: "Concrete shear resistance",
          formula: "V_Rd,c = [C_Rd,c × k × (100 × ρ_l × f_ck)^(1/3)] × b × d",
          result: `V_Rd,c = ${str(shearChk.V_Rd_c)} kN/m`,
        },
      ],
    },
    {
      title: "Crack Width Calculation",
      steps: [
        {
          description: "Maximum crack spacing",
          formula: "s_r,max = 3.4c + 0.425 × k₁ × k₂ × φ / ρ_p,eff",
          result: `s_r,max = ${str(crackChk.sr_max)} mm`,
        },
        {
          description: "Steel stress under quasi-permanent",
          formula: "σ_s from cracked section",
          result: `σ_s = ${str(crackChk.sigma_s)} MPa`,
        },
        {
          description: "Calculated crack width",
          formula: "w_k = s_r,max × (ε_sm - ε_cm)",
          result: `w_k = ${str(crackChk.w_k)} mm`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes("fail")
      ? ("error" as const)
      : ("warning" as const),
    message: w,
  }));

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === "PASS"
        ? `The deck slab design is ADEQUATE. ${formData.thickness}mm ${formData.concreteGrade} slab with T${formData.barDiameter} ${formData.steelGrade}. Max utilisation ${maxUtil.util.toFixed(1)}% (${maxUtil.name}).`
        : `The deck slab design is INADEQUATE. Consider increasing slab thickness, bar diameter, or reducing span.`,
    status: overallStatus,
    recommendations: [
      `Slab: ${formData.thickness}mm ${formData.concreteGrade}`,
      `Bottom X: ${str(reinfSched.bottom_x?.bars)}`,
      `Bottom Y: ${str(reinfSched.bottom_y?.bars)}`,
      `Cover: ${formData.coverBottom}mm (bottom), ${formData.coverTop}mm (top)`,
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

export default buildDeckSlabReport;
