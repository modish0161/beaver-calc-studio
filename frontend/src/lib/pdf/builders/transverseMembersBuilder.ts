// =============================================================================
// Transverse Members Report Builder — Premium PDF
// EN 1993-1-1 Transverse Member Design — Consultancy-Grade Report
// =============================================================================

import type {
  DesignCheck,
  DesignCheckSection,
  DetailedCalculation,
  ReportConclusion,
  ReportData,
  ReportInputs,
  ReportWarning,
  SectionProperty,
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

/**
 * Build a premium ReportData object from TransverseMembers calculator data.
 * Accepts the raw form + results objects exactly as produced by TransverseMembers.tsx.
 */
export function buildTransverseMembersReport(
  formData: Record<string, any>,
  results: Record<string, any>,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");

  // Overall status
  const allChecks = [
    results.bending_resistance_check?.status,
    results.shear_resistance_check?.status,
    results.web_bearing_check?.status,
    results.deflection_check?.status,
    results.buckling_check?.status,
  ];
  const failCount = allChecks.filter((s: string) => s === "FAIL").length;
  const overallStatus: "PASS" | "FAIL" = failCount > 0 ? "FAIL" : "PASS";

  // Governing check
  const utilValues = [
    {
      name: "Bending Resistance",
      util: Number(results.bending_resistance_check?.utilisation) || 0,
    },
    {
      name: "Shear Resistance",
      util: Number(results.shear_resistance_check?.utilisation) || 0,
    },
    {
      name: "Web Bearing",
      util: Number(results.web_bearing_check?.utilisation) || 0,
    },
    {
      name: "Deflection",
      util: Number(results.deflection_check?.utilisation) || 0,
    },
    {
      name: "LT Buckling",
      util: Number(results.buckling_check?.utilisation) || 0,
    },
  ];
  const governing = utilValues.reduce((a, b) => (b.util > a.util ? b : a));
  const maxUtil = governing.util;

  // Yield strength helper
  const fyMap: Record<string, number> = { S275: 275, S355: 355, S460: 460 };
  const fy = fyMap[formData.steelGrade] || 355;

  // Warnings
  const reportWarnings: ReportWarning[] = warnings.map((w, i) => ({
    severity: (w.includes("⛔") || w.includes("exceeded")
      ? "error"
      : "warning") as "error" | "warning",
    title: `Warning ${i + 1}`,
    message: w.replace(/^[⚠️⛔]\s*/, ""),
  }));

  // Inputs
  const inputs: ReportInputs = {
    geometry: {
      title: "Member Geometry",
      parameters: [
        { label: "Member Type", value: formData.memberType || "Cross Beam" },
        { label: "Span", value: String(formData.span || 0), unit: "m" },
        { label: "Depth", value: String(formData.depth || 0), unit: "mm" },
        {
          label: "Top Flange Width",
          value: String(formData.widthTop || 0),
          unit: "mm",
        },
        {
          label: "Bottom Flange Width",
          value: String(formData.widthBottom || 0),
          unit: "mm",
        },
        {
          label: "Web Thickness",
          value: String(formData.webThickness || 0),
          unit: "mm",
        },
        {
          label: "End Conditions",
          value: formData.endConditions || "simply_supported",
        },
      ],
    },
    materials: {
      title: "Material Properties",
      parameters: [
        { label: "Steel Grade", value: formData.steelGrade || "S355" },
        { label: "Yield Strength (fy)", value: String(fy), unit: "N/mm²" },
        { label: "Young's Modulus (E)", value: "210,000", unit: "N/mm²" },
      ],
    },
    loads: {
      title: "Applied Loading",
      parameters: [
        {
          label: "Dead Load (UDL)",
          value: String(formData.deadLoad || 0),
          unit: "kN/m",
        },
        {
          label: "Live Load (UDL)",
          value: String(formData.liveLoad || 0),
          unit: "kN/m",
        },
        {
          label: "Point Load (Dead)",
          value: String(formData.pointLoadDead || 0),
          unit: "kN",
        },
        {
          label: "Point Load (Live)",
          value: String(formData.pointLoadLive || 0),
          unit: "kN",
        },
        {
          label: "ULS Design Load",
          value: String(results.design_actions?.w_ULS || 0),
          unit: "kN/m",
        },
      ],
    },
    supportConditions: {
      title: "Deck Configuration",
      parameters: [
        {
          label: "Main Girder Spacing",
          value: String(formData.mainGirderSpacing || 0),
          unit: "m",
        },
        {
          label: "Number of Girders",
          value: String(formData.numberOfGirders || 0),
        },
        {
          label: "Deflection Limit",
          value: formData.deflectionLimit || "L/300",
        },
      ],
    },
  };

  // Section properties
  const mp = results.member_properties || {};
  const sectionProperties: SectionProperty[] = [
    {
      name: "Cross-Sectional Area",
      symbol: "A",
      value: String(mp.A || 0),
      unit: "mm²",
    },
    {
      name: "Second Moment of Area",
      symbol: "Iy",
      value: String(mp.I_y || 0),
      unit: "cm⁴",
    },
    {
      name: "Plastic Section Modulus",
      symbol: "Wpl",
      value: String(mp.W_pl || 0),
      unit: "mm³",
    },
    {
      name: "Shear Area",
      symbol: "Av",
      value: String(mp.A_v || 0),
      unit: "mm²",
    },
  ];

  // Design checks
  const da = results.design_actions || {};
  const designChecks: DesignCheckSection[] = [
    {
      title: "Bending Resistance (EN 1993-1-1 §6.2.5)",
      checks: [
        mkCheck(
          "Bending",
          "Moment Resistance",
          da.M_Ed,
          "kN·m",
          results.bending_resistance_check?.M_pl_Rd,
          "kN·m",
          results.bending_resistance_check?.utilisation,
          "6.2.5",
          results.bending_resistance_check?.status,
        ),
      ],
    },
    {
      title: "Shear Resistance (EN 1993-1-1 §6.2.6)",
      checks: [
        mkCheck(
          "Shear",
          "Plastic Shear",
          da.V_Ed,
          "kN",
          results.shear_resistance_check?.V_pl_Rd,
          "kN",
          results.shear_resistance_check?.utilisation,
          "6.2.6",
          results.shear_resistance_check?.status,
        ),
      ],
    },
    {
      title: "Web Bearing (EN 1993-1-5)",
      checks: [
        mkCheck(
          "Web Bearing",
          "Transverse Force",
          da.R_Ed,
          "kN",
          results.web_bearing_check?.F_b_Rd,
          "kN",
          results.web_bearing_check?.utilisation,
          "6.2",
          results.web_bearing_check?.status,
        ),
      ],
    },
    {
      title: "Serviceability — Deflection",
      checks: [
        mkCheck(
          "Deflection",
          "Deflection Check",
          results.deflection_check?.delta_actual,
          "mm",
          results.deflection_check?.delta_limit,
          "mm",
          results.deflection_check?.utilisation,
          "SLS",
          results.deflection_check?.status,
        ),
      ],
    },
    {
      title: "Lateral-Torsional Buckling (EN 1993-1-1 §6.3.2)",
      checks: [
        mkCheck(
          "LTB",
          "Buckling Resistance",
          da.M_Ed,
          "kN·m",
          results.buckling_check?.M_b_Rd,
          "kN·m",
          results.buckling_check?.utilisation,
          "6.3.2",
          results.buckling_check?.status,
          `Lcr = ${results.buckling_check?.L_cr || "?"} m`,
        ),
      ],
    },
  ];

  // Detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Bending Resistance Calculation",
      steps: [
        {
          description: "ULS design moment",
          formula: "M_Ed = w_ULS × L² / 8",
          result: `${da.M_Ed} kN·m`,
        },
        {
          description: "Plastic moment resistance",
          formula: "M_pl,Rd = W_pl × fy / γ_M0",
          result: `${results.bending_resistance_check?.M_pl_Rd} kN·m`,
        },
      ],
    },
    {
      title: "Shear Resistance Calculation",
      steps: [
        {
          description: "ULS design shear",
          formula: "V_Ed = w_ULS × L / 2",
          result: `${da.V_Ed} kN`,
        },
        {
          description: "Plastic shear resistance",
          formula: "V_pl,Rd = A_v × (fy / √3) / γ_M0",
          result: `${results.shear_resistance_check?.V_pl_Rd} kN`,
        },
      ],
    },
  ];

  // Connection summary
  const conn = results.connection_design || {};

  // Conclusion
  const conclusion: ReportConclusion = {
    status: overallStatus,
    summary:
      overallStatus === "PASS"
        ? "The proposed transverse member design is ADEQUATE for the applied loading. All design checks pass in accordance with BS EN 1993-1-1."
        : "The proposed transverse member design is NOT ADEQUATE. One or more design checks have failed. The section requires modification.",
    governingChecks: [
      `${governing.name} at ${governing.util.toFixed(1)}% utilisation`,
    ],
    suggestions:
      overallStatus === "FAIL"
        ? [
            "Review failing checks",
            "Consider increasing section depth or flange width",
            "Add lateral restraints if LTB governs",
          ]
        : [
            "Proceed with connection design",
            `Provide ${conn.bolts_required || "?"} × ${conn.bolt_diameter || "M20"} Grade ${conn.bolt_grade || "8.8"} bolts per connection`,
            `Fillet weld size: ${conn.weld_size || "6mm"}`,
            "Issue for independent design check",
          ],
  };

  return {
    meta: {
      calculatorName: "Transverse Members Calculator",
      title: "Transverse Member Design Report",
      subtitle: "Cross-Beam / Diaphragm Verification to BS EN 1993-1-1",
      projectName: options.projectName || "Transverse Members Design",
      clientName: options.clientName || "Client",
      preparedBy: options.preparedBy || "Engineer",
      checkedBy: options.checkedBy,
      approvedBy: options.approvedBy,
      documentRef:
        options.documentRef || `TRA-${Date.now().toString(36).toUpperCase()}`,
      version: options.version || "Rev A",
      date: today,
      designCodes: ["BS EN 1993-1-1:2005", "BS EN 1990:2002"],
    },
    executiveSummary: {
      overallStatus,
      governingCheck: `${governing.name} at ${governing.util.toFixed(1)}% utilisation`,
      maxUtilisation: maxUtil,
      keyDimensions: [
        { label: "Span", value: String(formData.span || 0), unit: "m" },
        { label: "Depth", value: String(formData.depth || 0), unit: "mm" },
        {
          label: "Top Flange",
          value: String(formData.widthTop || 0),
          unit: "mm",
        },
        { label: "Web", value: String(formData.webThickness || 0), unit: "mm" },
      ],
      keyLoads: [
        {
          label: "Dead Load",
          value: String(formData.deadLoad || 0),
          unit: "kN/m",
        },
        {
          label: "Live Load",
          value: String(formData.liveLoad || 0),
          unit: "kN/m",
        },
        { label: "ULS Moment", value: String(da.M_Ed || 0), unit: "kN·m" },
        { label: "ULS Shear", value: String(da.V_Ed || 0), unit: "kN" },
      ],
    },
    inputs,
    sectionProperties,
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
  designValue: any,
  designUnit: string,
  resistance: any,
  resistanceUnit: string,
  utilisation: any,
  clause: string,
  status: any,
  notes?: string,
): DesignCheck {
  return {
    category,
    name,
    designValue: Number(designValue) || 0,
    designValueUnit: designUnit,
    resistance: Number(resistance) || 0,
    resistanceUnit: resistanceUnit,
    utilisation: Number(utilisation) || 0,
    clause,
    status: status === "PASS" ? "PASS" : "FAIL",
    notes,
  };
}

export default buildTransverseMembersReport;
