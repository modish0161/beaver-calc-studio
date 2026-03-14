// =============================================================================
// Formwork Pressure PDF Report Builder
// CIRIA R108 / DIN 18218 — Premium Report Generation
// =============================================================================

import type {
  BeaverCalcReport,
  ReportOptions,
  ReportSection,
  ReportTable,
} from "../types";

interface FormworkPressureForm {
  concrete_type: string;
  density: string;
  slump: string;
  temperature: string;
  placement_method: string;
  pour_rate: string;
  pour_height: string;
  admixture: string;
  vibration: string;
  form_type: string;
  form_height: string;
  form_width: string;
  tie_spacing_h: string;
  tie_spacing_v: string;
  design_method: string;
  safety_factor: string;
  projectName: string;
  reference: string;
}

interface FormworkPressureResults {
  p_max_hydrostatic: number;
  p_max_ciria: number;
  p_max_din: number;
  p_design: number;
  h_effective: number;
  tie_force: number;
  total_force_per_m: number;
  method_used: string;
  status: string;
  classification: string;
  classColor: string;
}

const CONCRETE_TYPES: Record<string, string> = {
  normal: "Normal Weight Concrete",
  lightweight: "Lightweight Concrete",
  heavy: "Heavy Weight Concrete",
  scc: "Self-Compacting Concrete",
};

const SLUMP_CATEGORIES: Record<string, string> = {
  low: "Low Slump (25-75mm)",
  medium: "Medium Slump (75-125mm)",
  high: "High Slump (125-180mm)",
  flowing: "Flowing (>180mm)",
  scc: "Self-Compacting",
};

const PLACEMENT_METHODS: Record<string, string> = {
  direct: "Direct Discharge",
  pump: "Pump Placement",
  skip: "Skip/Bucket",
  tremie: "Tremie",
};

const FORM_TYPES: Record<string, string> = {
  plywood: "Plywood",
  steel: "Steel",
  timber: "Timber Boards",
  gfrp: "GFRP/Composite",
  liner: "Textured Liner",
};

export function buildFormworkPressureReport(
  form: FormworkPressureForm,
  results: FormworkPressureResults,
  warnings: string[] = [],
  options: ReportOptions = {},
): BeaverCalcReport {
  const sections: ReportSection[] = [];

  // =============================================================================
  // Section 1: Design Basis
  // =============================================================================
  sections.push({
    title: "1. Design Basis",
    content: [
      { type: "heading", text: "Design Standards" },
      {
        type: "paragraph",
        text: "This calculation determines formwork lateral pressure in accordance with:",
      },
      {
        type: "list",
        items: [
          "CIRIA Report R108: Concrete Pressure on Formwork",
          "DIN 18218: Pressure of Fresh Concrete on Vertical Formwork",
          "BS EN 12812: Falsework — Performance requirements",
        ],
      },
    ],
  });

  // =============================================================================
  // Section 2: Concrete Properties
  // =============================================================================
  const concreteTable: ReportTable = {
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      [
        "Concrete Type",
        CONCRETE_TYPES[form.concrete_type] || form.concrete_type,
        "",
      ],
      ["Density (γ)", `${form.density} kN/m³`, ""],
      [
        "Slump/Workability",
        SLUMP_CATEGORIES[form.slump] || form.slump,
        "Affects pressure",
      ],
      ["Temperature", `${form.temperature}°C`, "Setting time factor"],
    ],
  };

  sections.push({
    title: "2. Concrete Properties",
    content: [{ type: "table", table: concreteTable }],
  });

  // =============================================================================
  // Section 3: Placement Parameters
  // =============================================================================
  const placementTable: ReportTable = {
    headers: ["Parameter", "Symbol", "Value", "Unit"],
    rows: [
      [
        "Placement Method",
        "",
        PLACEMENT_METHODS[form.placement_method] || form.placement_method,
        "",
      ],
      ["Pour Rate", "R", form.pour_rate, "m/h"],
      ["Pour Height", "H", form.pour_height, "m"],
    ],
  };

  sections.push({
    title: "3. Placement Parameters",
    content: [{ type: "table", table: placementTable }],
  });

  // =============================================================================
  // Section 4: Formwork Details
  // =============================================================================
  const formworkTable: ReportTable = {
    headers: ["Parameter", "Value"],
    rows: [
      ["Formwork Type", FORM_TYPES[form.form_type] || form.form_type],
      ["Form Height", `${form.form_height} mm`],
      ["Form Width", `${form.form_width} mm`],
      ["Tie Spacing (Horizontal)", `${form.tie_spacing_h} mm`],
      ["Tie Spacing (Vertical)", `${form.tie_spacing_v} mm`],
    ],
  };

  sections.push({
    title: "4. Formwork Details",
    content: [{ type: "table", table: formworkTable }],
  });

  // =============================================================================
  // Section 5: Pressure Calculation
  // =============================================================================
  const pressureTable: ReportTable = {
    headers: ["Method", "Pressure (kPa)", "Notes"],
    rows: [
      [
        "Hydrostatic (γH)",
        results.p_max_hydrostatic.toFixed(1),
        "Maximum possible",
      ],
      ["CIRIA R108", results.p_max_ciria.toFixed(1), "UK guidance"],
      ["DIN 18218", results.p_max_din.toFixed(1), "German standard"],
      [
        "Design Pressure",
        results.p_design.toFixed(1),
        `${results.method_used} × SF=${form.safety_factor}`,
      ],
    ],
  };

  sections.push({
    title: "5. Pressure Calculation",
    content: [
      {
        type: "paragraph",
        text: "Lateral concrete pressure comparison by method.",
      },
      { type: "table", table: pressureTable },
    ],
  });

  // =============================================================================
  // Section 6: Effective Head
  // =============================================================================
  sections.push({
    title: "6. Effective Pressure Head",
    content: [
      {
        type: "paragraph",
        text: `The effective depth of fresh concrete (h_eff) at which maximum pressure is reached is ${results.h_effective.toFixed(2)} m.`,
      },
      {
        type: "paragraph",
        text: `Below this depth, concrete has begun to stiffen and pressure remains constant at the maximum value of ${results.p_design.toFixed(1)} kPa.`,
      },
    ],
  });

  // =============================================================================
  // Section 7: Tie Design
  // =============================================================================
  const tieArea =
    (parseFloat(form.tie_spacing_h) / 1000) *
    (parseFloat(form.tie_spacing_v) / 1000);

  const tieTable: ReportTable = {
    headers: ["Parameter", "Formula", "Value"],
    rows: [
      [
        "Tie Spacing (H × V)",
        "",
        `${form.tie_spacing_h} × ${form.tie_spacing_v} mm`,
      ],
      ["Tributary Area", "A_tie", `${tieArea.toFixed(3)} m²`],
      ["Design Pressure", "p_design", `${results.p_design.toFixed(1)} kPa`],
      ["Tie Force", "F = p × A", `${results.tie_force.toFixed(1)} kN`],
    ],
  };

  sections.push({
    title: "7. Tie Design",
    content: [{ type: "table", table: tieTable }],
  });

  // =============================================================================
  // Section 8: Summary
  // =============================================================================
  const summaryTable: ReportTable = {
    headers: ["Result", "Value", "Status"],
    rows: [
      [
        "Design Pressure",
        `${results.p_design.toFixed(1)} kPa`,
        results.classification,
      ],
      ["Effective Head", `${results.h_effective.toFixed(2)} m`, ""],
      [
        "Tie Force (max)",
        `${results.tie_force.toFixed(1)} kN`,
        "Verify capacity",
      ],
      [
        "Total Force per m width",
        `${results.total_force_per_m.toFixed(1)} kN/m`,
        "",
      ],
    ],
  };

  const summaryContent: ReportSection["content"] = [
    { type: "table", table: summaryTable },
  ];

  if (warnings.length > 0) {
    summaryContent.push(
      { type: "heading", text: "Design Notes" },
      { type: "list", items: warnings },
    );
  }

  summaryContent.push(
    { type: "heading", text: "Recommendations" },
    {
      type: "list",
      items: [
        `Select ties with capacity ≥ ${(results.tie_force * 1.25).toFixed(0)} kN (25% margin)`,
        "Check formwork deflection under design pressure",
        "Verify soldier/waler design for spanning between ties",
        "Monitor pour rate during construction",
      ],
    },
  );

  sections.push({
    title: "8. Summary & Recommendations",
    content: summaryContent,
  });

  // =============================================================================
  // Build Final Report
  // =============================================================================
  return {
    title: "Formwork Pressure Analysis",
    subtitle: `${results.method_used} Method`,
    projectInfo: {
      projectName: options.projectName || form.projectName || "Formwork Design",
      reference: form.reference || "FW-001",
      preparedBy: options.preparedBy || "BeaverCalc Studio",
      date: new Date().toLocaleDateString("en-GB"),
    },
    sections,
  };
}
