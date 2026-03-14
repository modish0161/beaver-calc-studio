// ============================================================================
// BeaverCalc Studio — Composite Beam Report Data Builder
// Steel-Concrete Composite Beam Design to Eurocode 4
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

// Helper: safely read a numeric value with fallback
const num = (v: any, fallback = 0): number => {
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
};
const str = (v: any, fallback = "-"): string =>
  v != null && v !== "" ? String(v) : fallback;

/**
 * Build a ReportData object directly from the CompositeBeam calculator's
 * formData and results objects (snake_case nested shape).
 */
export function buildCompositeBeamReport(
  formData: Record<string, any>,
  results: Record<string, any>,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");

  // Shortcuts for nested result groups
  const csp = results.composite_section_properties ?? {};
  const da = results.design_actions ?? {};
  const bend = results.bending_resistance_check ?? {};
  const shear = results.shear_resistance_check ?? {};
  const conn = results.shear_connection_check ?? {};
  const defl = results.deflection_check ?? {};
  const ltb = results.lateral_torsional_buckling_check ?? {};

  // Determine overall status
  const allStatuses = [
    bend.status,
    shear.status,
    conn.status,
    defl.status,
    ltb.status,
  ].filter(Boolean);
  const overallStatus: "PASS" | "FAIL" = allStatuses.includes("FAIL")
    ? "FAIL"
    : "PASS";

  // Build meta
  const meta = {
    title: "Composite Beam Design",
    projectName: options.projectName || "Composite Beam Design",
    clientName: options.clientName || "Client",
    documentRef:
      options.documentRef || `CMP-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || "Rev A",
    date: today,
    preparedBy: options.preparedBy || "BeaverCalc Studio",
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: "Composite Beam",
    designCodes: ["EN 1994-1-1:2004", "EN 1993-1-1", "SCI P300"],
  };

  // Governing check
  const utils = [
    { name: "Bending", util: num(bend.utilisation) },
    { name: "Shear", util: num(shear.utilisation) },
    { name: "Shear Connection", util: num(conn.utilisation) },
    { name: "Deflection", util: num(defl.utilisation) },
    { name: "LTB", util: num(ltb.utilisation) },
  ].filter((u) => u.util > 0);
  const maxUtil =
    utils.length > 0
      ? utils.reduce((a, b) => (a.util > b.util ? a : b))
      : { name: "Bending", util: 0 };

  // Build executive summary
  const executiveSummary = {
    description: `Steel-concrete composite beam: ${formData.steelSection} ${formData.steelGrade} with ${formData.slabThickness}mm slab (${formData.concreteGrade}). ${formData.span}m span, ${formData.slabWidth}mm effective width.`,
    keyResults: [
      { label: "Steel Section", value: str(formData.steelSection) },
      {
        label: "Applied Moment",
        value: `${str(da.M_Ed_ULS)} kN·m`,
        highlight: true,
      },
      { label: "Bending Resistance", value: `${str(bend.M_pl_Rd)} kN·m` },
      { label: "Max Utilisation", value: `${maxUtil.util.toFixed(1)}%` },
    ],
    overallStatus,
    governingCheck: maxUtil.name,
    utilisationSummary: `Max utilisation: ${maxUtil.util.toFixed(0)}% (${maxUtil.name})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: "Steel Section",
        parameters: [
          { name: "Section Size", value: str(formData.steelSection) },
          { name: "Steel Grade", value: str(formData.steelGrade) },
          { name: "Beam Span", value: str(formData.span), unit: "m" },
          { name: "Lateral Restraint", value: str(formData.lateralRestraint) },
        ],
      },
      {
        title: "Concrete Slab",
        parameters: [
          {
            name: "Slab Thickness",
            value: str(formData.slabThickness),
            unit: "mm",
          },
          { name: "Slab Width", value: str(formData.slabWidth), unit: "mm" },
          { name: "Concrete Grade", value: str(formData.concreteGrade) },
        ],
      },
      {
        title: "Shear Connectors",
        parameters: [
          {
            name: "Connector Diameter",
            value: str(formData.shearConnectorDiameter),
            unit: "mm",
          },
          {
            name: "Connector Height",
            value: str(formData.shearConnectorHeight),
            unit: "mm",
          },
          { name: "Connectors per Row", value: str(formData.connectorsPerRow) },
          { name: "Number of Rows", value: str(formData.connectorRows) },
          {
            name: "Spacing",
            value: str(formData.connectorSpacing),
            unit: "mm",
          },
        ],
      },
      {
        title: "Loading",
        parameters: [
          { name: "Dead Load", value: str(formData.deadLoad), unit: "kN/m" },
          { name: "Live Load", value: str(formData.liveLoad), unit: "kN/m" },
          {
            name: "Point Load (Dead)",
            value: str(formData.pointLoadDead),
            unit: "kN",
          },
          {
            name: "Point Load (Live)",
            value: str(formData.pointLoadLive),
            unit: "kN",
          },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: "ULS Bending (EC4 Cl.6.2)",
      description: "Composite section moment resistance",
      checks: [
        {
          name: "Moment Resistance",
          formula: "M_Ed ≤ M_pl,Rd",
          calculated: `${str(da.M_Ed_ULS)} kN·m`,
          limit: `≤ ${str(bend.M_pl_Rd)} kN·m`,
          utilisation: num(bend.utilisation) / 100,
          status: (bend.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "ULS Shear (EC4 Cl.6.2)",
      description: "Vertical shear resistance",
      checks: [
        {
          name: "Shear Resistance",
          formula: "V_Ed ≤ V_pl,Rd",
          calculated: `${str(da.V_Ed_ULS)} kN`,
          limit: `≤ ${str(shear.V_pl_Rd)} kN`,
          utilisation: num(shear.utilisation) / 100,
          status: (shear.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "Shear Connection (EC4 Cl.6.6)",
      description: "Shear connector resistance",
      checks: [
        {
          name: "Shear Connector Capacity",
          formula: "V_Ed ≤ V_Rd (connectors)",
          calculated: `${str(conn.utilisation, "0")}%`,
          limit: `V_Rd = ${str(conn.V_Rd)} kN`,
          utilisation: num(conn.utilisation) / 100,
          status: (conn.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
    {
      title: "SLS Deflection (EC4 Cl.7.3)",
      description: "Serviceability deflection check",
      checks: [
        {
          name: "Deflection",
          formula: "δ_total ≤ L/360",
          calculated: `${str(defl.utilisation, "0")}%`,
          limit: `δ_limit = ${str(defl.delta_limit)} mm`,
          utilisation: num(defl.utilisation) / 100,
          status: (defl.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    },
  ];

  // Add LTB check if present
  if (ltb.status) {
    designChecks.push({
      title: "Lateral Torsional Buckling (EC3 Cl.6.3.2)",
      description: "Lateral stability of steel beam",
      checks: [
        {
          name: "LTB Resistance",
          formula: "M_Ed ≤ M_b,Rd",
          calculated: `${str(ltb.utilisation, "0")}%`,
          limit: `M_b,Rd`,
          utilisation: num(ltb.utilisation) / 100,
          status: (ltb.status || "PASS") as "PASS" | "FAIL",
        },
      ],
    });
  }

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Composite Section Properties",
      steps: [
        {
          description: "Composite area",
          formula: "A_comp = A_s + A_c/n",
          result: `A_comp = ${str(csp.A_comp)} cm²`,
        },
        {
          description: "Composite inertia",
          formula: "I_comp (transformed section)",
          result: `I_comp = ${str(csp.I_comp)} cm⁴`,
        },
        {
          description: "Elastic section modulus",
          formula: "W_el = I/y",
          result: `W_el = ${str(csp.W_el_comp)} cm³`,
        },
        {
          description: "Neutral axis depth",
          formula: "ȳ from top",
          result: `ȳ = ${str(csp.y_bar)} mm`,
        },
        {
          description: "Modular ratio",
          formula: "n = E_s / E_c",
          result: `n = ${str(csp.modular_ratio)}`,
        },
      ],
    },
    {
      title: "Design Actions (EN 1990)",
      steps: [
        {
          description: "SLS Moment",
          formula: "M_Ed,SLS = g_k + q_k actions",
          result: `M_Ed,SLS = ${str(da.M_Ed_SLS)} kN·m`,
        },
        {
          description: "ULS Moment",
          formula: "M_Ed,ULS = 1.35G + 1.5Q",
          result: `M_Ed,ULS = ${str(da.M_Ed_ULS)} kN·m`,
        },
        {
          description: "SLS Shear",
          formula: "V_Ed,SLS",
          result: `V_Ed,SLS = ${str(da.V_Ed_SLS)} kN`,
        },
        {
          description: "ULS Shear",
          formula: "V_Ed,ULS = 1.35G + 1.5Q",
          result: `V_Ed,ULS = ${str(da.V_Ed_ULS)} kN`,
        },
      ],
    },
    {
      title: "Moment Resistance",
      steps: [
        {
          description: "Plastic moment resistance",
          formula: "M_pl,Rd from stress blocks",
          result: `M_pl,Rd = ${str(bend.M_pl_Rd)} kN·m`,
        },
        {
          description: "Utilisation",
          formula: "M_Ed / M_pl,Rd",
          result: `${str(bend.utilisation)}%`,
        },
      ],
    },
    {
      title: "Shear Resistance",
      steps: [
        {
          description: "Plastic shear resistance",
          formula: "V_pl,Rd = A_v × (f_y/√3) / γ_M0",
          result: `V_pl,Rd = ${str(shear.V_pl_Rd)} kN`,
        },
        {
          description: "Utilisation",
          formula: "V_Ed / V_pl,Rd",
          result: `${str(shear.utilisation)}%`,
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
        ? `The composite beam design is ADEQUATE. ${formData.steelSection} section with ${formData.concreteGrade} slab. Max utilisation ${maxUtil.util.toFixed(1)}% (${maxUtil.name}).`
        : `The composite beam design is INADEQUATE. Consider a larger steel section, thicker slab, or more shear connectors.`,
    status: overallStatus,
    recommendations: [
      `Steel section: ${formData.steelSection} ${formData.steelGrade}`,
      `Slab: ${formData.slabThickness}mm ${formData.concreteGrade}`,
      `Shear connectors: ${formData.connectorsPerRow}×${formData.connectorRows} rows @ ${formData.connectorSpacing}mm c/c`,
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
