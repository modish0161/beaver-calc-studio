// =============================================================================
// Bracing Design PDF Report Builder — Premium PDF
// EN 1993-1-1 — Consultancy-Grade Report
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

interface BracingForm {
  bracing_type: string;
  material_type: string;
  steel_grade: string;
  timber_grade: string;
  cable_type: string;
  span_length: string;
  system_height: string;
  number_of_panels: string;
  section_type: string;
  wind_load: string;
  seismic_factor: string;
  notional_load: string;
  temp_change: string;
  load_factor_uls: string;
  safety_factor: string;
  slenderness_limit: string;
  projectName: string;
  reference: string;
}

interface BracingResults {
  panel_width: number;
  panel_height: number;
  bracing_angle: number;
  bracing_length: number;
  total_members: number;
  slenderness: number;
  wind_force: number;
  seismic_force: number;
  notional_force: number;
  thermal_force: number;
  total_lateral: number;
  force_per_member: number;
  factored_force: number;
  area: number;
  iyy: number;
  radius: number;
  fy: number;
  tension_capacity: number;
  tension_utilisation: number;
  compression_capacity: number;
  compression_utilisation: number;
  buckling_capacity: number;
  buckling_utilisation: number;
  chi: number;
  lambda_bar: number;
  connection_force: number;
  bolt_capacity: number;
  bolts_required: number;
  connection_utilisation: number;
  system_stiffness: number;
  drift_limit: number;
  actual_drift: number;
  critical_check: string;
  max_utilisation: number;
  status: string;
  classification: string;
}

const BRACING_TYPES: Record<string, string> = {
  cross: "Cross Bracing (X)",
  single_diagonal: "Single Diagonal",
  k_bracing: "K-Bracing",
  v_bracing: "V-Bracing (Chevron)",
  inverted_v: "Inverted V-Bracing",
  eccentric: "Eccentric Bracing",
};

export interface BuilderOptions {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  documentRef?: string;
  version?: string;
}

export function buildBracingReport(
  form: BracingForm,
  results: BracingResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString("en-GB");
  const bracingLabel = BRACING_TYPES[form.bracing_type] || form.bracing_type;
  const overallStatus: "PASS" | "FAIL" =
    results.status === "PASS" ? "PASS" : "FAIL";
  const maxUtil = results.max_utilisation;

  // All utilisation values for governing check
  const utilValues = [
    { name: "Tension", util: results.tension_utilisation },
    { name: "Compression", util: results.compression_utilisation },
    { name: "Buckling", util: results.buckling_utilisation },
    { name: "Connection", util: results.connection_utilisation },
  ];
  const governing = utilValues.reduce((a, b) => (b.util > a.util ? b : a));

  // Warnings
  const reportWarnings: ReportWarning[] = warnings.map((w, i) => ({
    severity: (w.includes("⛔") || w.includes("FAIL") ? "error" : "warning") as
      | "error"
      | "warning",
    title: `Warning ${i + 1}`,
    message: w.replace(/^[⚠️⛔]\s*/, ""),
  }));

  // Inputs
  const grade =
    form.material_type === "steel"
      ? form.steel_grade
      : form.timber_grade || form.cable_type;
  const inputs: ReportInputs = {
    geometry: {
      title: "System Geometry",
      parameters: [
        { label: "Bracing Type", value: bracingLabel },
        { label: "Span Length", value: form.span_length, unit: "m" },
        { label: "System Height", value: form.system_height, unit: "m" },
        { label: "Number of Panels", value: form.number_of_panels },
        {
          label: "Panel Width",
          value: results.panel_width.toFixed(2),
          unit: "m",
        },
        {
          label: "Panel Height",
          value: results.panel_height.toFixed(2),
          unit: "m",
        },
        {
          label: "Bracing Angle",
          value: results.bracing_angle.toFixed(1),
          unit: "°",
        },
        {
          label: "Bracing Length",
          value: results.bracing_length.toFixed(2),
          unit: "m",
        },
        { label: "Total Members", value: String(results.total_members) },
      ],
    },
    materials: {
      title: "Material Properties",
      parameters: [
        {
          label: "Material",
          value:
            form.material_type.charAt(0).toUpperCase() +
            form.material_type.slice(1),
        },
        { label: "Grade", value: grade },
        { label: "Section", value: form.section_type },
        {
          label: "Yield Strength (fy)",
          value: String(results.fy),
          unit: "MPa",
        },
      ],
    },
    loads: {
      title: "Loading",
      parameters: [
        { label: "Wind Load", value: form.wind_load, unit: "kN/m" },
        { label: "Seismic Factor", value: form.seismic_factor },
        { label: "Notional Load", value: form.notional_load, unit: "kN" },
        { label: "Temperature Change", value: form.temp_change, unit: "°C" },
        { label: "Load Factor (γF)", value: form.load_factor_uls },
        {
          label: "Total Lateral",
          value: results.total_lateral.toFixed(1),
          unit: "kN",
        },
        {
          label: "Force per Member",
          value: results.force_per_member.toFixed(1),
          unit: "kN",
        },
        {
          label: "Factored Force (ULS)",
          value: results.factored_force.toFixed(1),
          unit: "kN",
        },
      ],
    },
    supportConditions: {
      title: "Design Parameters",
      parameters: [
        { label: "Safety Factor (γM)", value: form.safety_factor },
        { label: "Slenderness Limit", value: form.slenderness_limit },
        {
          label: "Drift Limit",
          value: `${results.drift_limit.toFixed(1)} mm (H/500)`,
        },
      ],
    },
  };

  // Section properties
  const sectionProperties: SectionProperty[] = [
    {
      name: "Cross-Sectional Area",
      symbol: "A",
      value: results.area.toFixed(0),
      unit: "mm²",
    },
    {
      name: "Second Moment of Area",
      symbol: "Iyy",
      value: (results.iyy / 1e6).toFixed(2),
      unit: "× 10⁶ mm⁴",
    },
    {
      name: "Radius of Gyration",
      symbol: "r",
      value: results.radius.toFixed(1),
      unit: "mm",
    },
    {
      name: "Slenderness Ratio",
      symbol: "λ",
      value: results.slenderness.toFixed(0),
      unit: "",
    },
    {
      name: "Non-dimensional Slenderness",
      symbol: "λ̄",
      value: results.lambda_bar.toFixed(2),
      unit: "",
    },
    {
      name: "Buckling Reduction Factor",
      symbol: "χ",
      value: results.chi.toFixed(3),
      unit: "",
    },
  ];

  // Design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: "Tension Resistance (EN 1993-1-1 §6.2.3)",
      checks: [
        mkCheck(
          "Tension",
          "Axial Tension",
          results.factored_force,
          "kN",
          results.tension_capacity,
          "kN",
          results.tension_utilisation,
          "6.2.3",
          results.tension_utilisation <= 100 ? "PASS" : "FAIL",
        ),
      ],
    },
    {
      title: "Compression Resistance (EN 1993-1-1 §6.2.4)",
      checks: [
        mkCheck(
          "Compression",
          "Axial Compression",
          results.factored_force,
          "kN",
          results.compression_capacity,
          "kN",
          results.compression_utilisation,
          "6.2.4",
          results.compression_utilisation <= 100 ? "PASS" : "FAIL",
        ),
      ],
    },
    {
      title: "Buckling Resistance (EN 1993-1-1 §6.3.1)",
      checks: [
        mkCheck(
          "Buckling",
          "Flexural Buckling",
          results.factored_force,
          "kN",
          results.buckling_capacity,
          "kN",
          results.buckling_utilisation,
          "6.3.1",
          results.buckling_utilisation <= 100 ? "PASS" : "FAIL",
          `χ = ${results.chi.toFixed(3)}, λ̄ = ${results.lambda_bar.toFixed(2)}`,
        ),
      ],
    },
    {
      title: "Connection Design (EN 1993-1-8)",
      checks: [
        mkCheck(
          "Connection",
          "Bolt Group Capacity",
          results.connection_force,
          "kN",
          results.bolts_required * results.bolt_capacity,
          "kN",
          results.connection_utilisation,
          "3.6",
          results.connection_utilisation <= 100 ? "PASS" : "FAIL",
          `${results.bolts_required} × M16 Grade 8.8`,
        ),
      ],
    },
    {
      title: "Serviceability — Drift",
      checks: [
        mkCheck(
          "Drift",
          "Lateral Drift",
          results.actual_drift,
          "mm",
          results.drift_limit,
          "mm",
          results.actual_drift <= results.drift_limit
            ? (results.actual_drift / results.drift_limit) * 100
            : (results.actual_drift / results.drift_limit) * 100,
          "SLS",
          results.actual_drift <= results.drift_limit ? "PASS" : "FAIL",
          `Stiffness = ${results.system_stiffness.toFixed(1)} kN/mm`,
        ),
      ],
    },
  ];

  // Detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: "Loading Analysis",
      steps: [
        {
          description: "Wind force",
          formula: "F_w = w × L",
          result: `${results.wind_force.toFixed(1)} kN`,
        },
        {
          description: "Seismic force",
          formula: "F_s = α × W",
          result: `${results.seismic_force.toFixed(1)} kN`,
        },
        {
          description: "Total lateral",
          formula: "ΣF = F_w + F_s + F_n + F_t",
          result: `${results.total_lateral.toFixed(1)} kN`,
        },
        {
          description: "Factored force/member",
          formula: "N_Ed = γF × F/n",
          result: `${results.factored_force.toFixed(1)} kN`,
        },
      ],
    },
    {
      title: "Buckling Check",
      steps: [
        {
          description: "Slenderness",
          formula: "λ = L_cr / r",
          result: String(results.slenderness.toFixed(0)),
        },
        {
          description: "Non-dim. slenderness",
          formula: "λ̄ = λ / 93.9ε",
          result: results.lambda_bar.toFixed(2),
        },
        {
          description: "Reduction factor",
          formula: "χ = 1 / (Φ + √(Φ²−λ̄²))",
          result: results.chi.toFixed(3),
        },
        {
          description: "Buckling resistance",
          formula: "N_b,Rd = χ·A·fy / γ_M1",
          result: `${results.buckling_capacity.toFixed(1)} kN`,
        },
      ],
    },
  ];

  // Conclusion
  const conclusion: ReportConclusion = {
    status: overallStatus,
    summary:
      overallStatus === "PASS"
        ? `The ${bracingLabel} system is ADEQUATE. All members and connections satisfy EN 1993-1-1 requirements.`
        : `The ${bracingLabel} system is NOT ADEQUATE. One or more design checks have failed.`,
    governingChecks: [
      `${governing.name} at ${governing.util.toFixed(1)}% utilisation`,
      `Classification: ${results.classification}`,
    ],
    suggestions:
      overallStatus === "FAIL"
        ? [
            "Consider using a larger section or higher grade steel",
            "Review slenderness and buckling parameters",
          ]
        : [
            `Provide ${results.total_members} × ${form.section_type} bracing members`,
            `${results.bolts_required} × M16 Grade 8.8 bolts per connection`,
            "Ensure gusset plates designed for full connection capacity",
            "Install plumb and check alignment before final bolting",
          ],
    recommendations: [
      `Verify ${bracingLabel} arrangement suits structural frame geometry`,
      `Check gusset plate thickness for Whitmore section — min ${results.connection_utilisation > 70 ? "thicker plate may be required" : "plate adequate"}`,
      `Confirm lateral load path from diaphragm/floor to bracing members`,
      overallStatus === "FAIL"
        ? `Design FAILS — increase section size or reduce span/height`
        : `All checks pass — max utilisation ${maxUtil.toFixed(1)}%`,
    ],
  };

  return {
    meta: {
      calculatorName: "Bracing Design Calculator",
      title: "Bracing Design Calculation Report",
      subtitle: `EN 1993-1-1 — ${bracingLabel}`,
      projectName: options.projectName || form.projectName || "Bracing Design",
      clientName: options.clientName || "Client",
      preparedBy: options.preparedBy || "Engineer",
      checkedBy: options.checkedBy,
      approvedBy: options.approvedBy,
      documentRef:
        options.documentRef ||
        form.reference ||
        `BRA-${Date.now().toString(36).toUpperCase()}`,
      version: options.version || "Rev A",
      date: today,
      designCodes: [
        "BS EN 1993-1-1:2005",
        "BS EN 1993-1-8:2005",
        "BS EN 1990:2002",
      ],
    },
    executiveSummary: {
      overallStatus,
      governingCheck: `${governing.name} at ${governing.util.toFixed(1)}% utilisation`,
      maxUtilisation: maxUtil,
      keyDimensions: [
        { label: "Span", value: form.span_length, unit: "m" },
        { label: "Height", value: form.system_height, unit: "m" },
        {
          label: "Bracing Length",
          value: results.bracing_length.toFixed(2),
          unit: "m",
        },
        { label: "Angle", value: results.bracing_angle.toFixed(1), unit: "°" },
      ],
      keyLoads: [
        {
          label: "Total Lateral",
          value: results.total_lateral.toFixed(1),
          unit: "kN",
        },
        {
          label: "Factored Force",
          value: results.factored_force.toFixed(1),
          unit: "kN",
        },
        {
          label: "Wind Force",
          value: results.wind_force.toFixed(1),
          unit: "kN",
        },
        {
          label: "Seismic Force",
          value: results.seismic_force.toFixed(1),
          unit: "kN",
        },
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

export default buildBracingReport;
