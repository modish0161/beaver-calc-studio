// =============================================================================
// Soffit Shores PDF Report Builder
// BS 5975 / BS EN 12812 — Premium Report Generation
// =============================================================================

import type {
  BeaverCalcReport,
  ReportOptions,
  ReportSection,
  ReportTable,
} from "../types";

interface SoffitShoresForm {
  slab_thickness: string;
  concrete_density: string;
  imposed_load: string;
  construction_load: string;
  bay_length_x: string;
  bay_length_y: string;
  soffit_height: string;
  prop_type: string;
  custom_capacity: string;
  custom_min_length: string;
  custom_max_length: string;
  primary_spacing: string;
  secondary_spacing: string;
  beam_type: string;
  safety_factor: string;
  load_factor: string;
  projectName: string;
  reference: string;
}

interface SoffitShoresResults {
  dead_load: number;
  imposed_load: number;
  total_load: number;
  factored_load: number;
  props_x: number;
  props_y: number;
  total_props: number;
  actual_spacing_x: number;
  actual_spacing_y: number;
  tributary_area: number;
  prop_load: number;
  prop_capacity: number;
  utilisation: number;
  status: string;
  classification: string;
  classColor: string;
}

const PROP_CATALOGUE: Record<
  string,
  { name: string; capacity: number; minLength: number; maxLength: number }
> = {
  acrow_0: {
    name: "Acrow No.0",
    capacity: 34,
    minLength: 1.07,
    maxLength: 1.83,
  },
  acrow_1: {
    name: "Acrow No.1",
    capacity: 34,
    minLength: 1.75,
    maxLength: 3.12,
  },
  acrow_2: {
    name: "Acrow No.2",
    capacity: 34,
    minLength: 1.98,
    maxLength: 3.35,
  },
  acrow_3: {
    name: "Acrow No.3",
    capacity: 34,
    minLength: 2.59,
    maxLength: 3.96,
  },
  acrow_4: {
    name: "Acrow No.4",
    capacity: 34,
    minLength: 3.2,
    maxLength: 4.88,
  },
  slimshore_1: {
    name: "Slimshore Size 1",
    capacity: 100,
    minLength: 0.6,
    maxLength: 3.0,
  },
  slimshore_2: {
    name: "Slimshore Size 2",
    capacity: 95,
    minLength: 2.0,
    maxLength: 5.5,
  },
  titan_hv: { name: "Titan HV", capacity: 100, minLength: 1.7, maxLength: 2.9 },
  titan_super: {
    name: "Titan Super",
    capacity: 120,
    minLength: 2.4,
    maxLength: 4.2,
  },
  peri_pep: {
    name: "PERI PEP Ergo",
    capacity: 40,
    minLength: 1.5,
    maxLength: 4.0,
  },
  doka_eurex: {
    name: "Doka Eurex 60",
    capacity: 60,
    minLength: 1.2,
    maxLength: 4.5,
  },
  custom: { name: "Custom Prop", capacity: 0, minLength: 0, maxLength: 0 },
};

const BEAM_TYPES: Record<string, string> = {
  h20_timber: "H20 Timber Beam",
  aluma_225: "Aluma 225",
  rmd_225: "RMD 225 Primary",
  peri_gt24: "PERI GT24",
  steel_rsj: "Steel RSJ",
};

export function buildSoffitShoresReport(
  form: SoffitShoresForm,
  results: SoffitShoresResults,
  warnings: string[] = [],
  options: ReportOptions = {},
): BeaverCalcReport {
  const sections: ReportSection[] = [];

  const prop =
    form.prop_type === "custom"
      ? {
          name: "Custom Prop",
          capacity: parseFloat(form.custom_capacity),
          minLength: parseFloat(form.custom_min_length),
          maxLength: parseFloat(form.custom_max_length),
        }
      : PROP_CATALOGUE[form.prop_type];

  // =============================================================================
  // Section 1: Design Basis
  // =============================================================================
  sections.push({
    title: "1. Design Basis",
    content: [
      { type: "heading", text: "Design Standards" },
      {
        type: "paragraph",
        text: "This calculation determines soffit shoring requirements in accordance with:",
      },
      {
        type: "list",
        items: [
          "BS 5975: Code of practice for temporary works",
          "BS EN 12812: Falsework — Performance requirements and general design",
          "Manufacturer specifications for prop capacities",
        ],
      },
    ],
  });

  // =============================================================================
  // Section 2: Slab Properties
  // =============================================================================
  const slabTable: ReportTable = {
    headers: ["Parameter", "Symbol", "Value", "Unit"],
    rows: [
      ["Slab Thickness", "t", form.slab_thickness, "mm"],
      ["Concrete Density", "γ", form.concrete_density, "kN/m³"],
      ["Imposed Load", "qk", form.imposed_load, "kN/m²"],
      ["Construction Load", "qc", form.construction_load, "kN/m²"],
    ],
  };

  sections.push({
    title: "2. Slab Properties",
    content: [{ type: "table", table: slabTable }],
  });

  // =============================================================================
  // Section 3: Bay Geometry
  // =============================================================================
  const geometryTable: ReportTable = {
    headers: ["Parameter", "Value", "Unit"],
    rows: [
      ["Bay Length X", form.bay_length_x, "m"],
      ["Bay Length Y", form.bay_length_y, "m"],
      ["Soffit Height", form.soffit_height, "m"],
      [
        "Bay Area",
        (parseFloat(form.bay_length_x) * parseFloat(form.bay_length_y)).toFixed(
          2,
        ),
        "m²",
      ],
    ],
  };

  sections.push({
    title: "3. Bay Geometry",
    content: [{ type: "table", table: geometryTable }],
  });

  // =============================================================================
  // Section 4: Prop Selection
  // =============================================================================
  const propTable: ReportTable = {
    headers: ["Parameter", "Value"],
    rows: [
      ["Prop Type", prop?.name || form.prop_type],
      ["Rated Capacity", `${prop?.capacity || form.custom_capacity} kN`],
      [
        "Length Range",
        `${prop?.minLength || form.custom_min_length} - ${prop?.maxLength || form.custom_max_length} m`,
      ],
    ],
  };

  sections.push({
    title: "4. Prop Selection",
    content: [{ type: "table", table: propTable }],
  });

  // =============================================================================
  // Section 5: Load Calculation
  // =============================================================================
  const loadTable: ReportTable = {
    headers: ["Load Type", "Formula", "Value (kN/m²)"],
    rows: [
      ["Dead Load (concrete)", "γ × t", results.dead_load.toFixed(2)],
      ["Imposed + Construction", "qk + qc", results.imposed_load.toFixed(2)],
      ["Total Unfactored", "DL + LL", results.total_load.toFixed(2)],
      [
        "Factored ULS",
        `${form.load_factor} × DL + 1.5 × LL`,
        results.factored_load.toFixed(2),
      ],
    ],
  };

  sections.push({
    title: "5. Load Calculation",
    content: [{ type: "table", table: loadTable }],
  });

  // =============================================================================
  // Section 6: Prop Layout
  // =============================================================================
  const layoutTable: ReportTable = {
    headers: ["Parameter", "Value"],
    rows: [
      ["Primary Beam Spacing", `${form.primary_spacing} mm`],
      ["Secondary Beam Spacing", `${form.secondary_spacing} mm`],
      ["Beam Type", BEAM_TYPES[form.beam_type] || form.beam_type],
      ["Props in X-direction", results.props_x.toString()],
      ["Props in Y-direction", results.props_y.toString()],
      ["Total Props Required", results.total_props.toString()],
      [
        "Actual Spacing X",
        `${(results.actual_spacing_x * 1000).toFixed(0)} mm`,
      ],
      [
        "Actual Spacing Y",
        `${(results.actual_spacing_y * 1000).toFixed(0)} mm`,
      ],
    ],
  };

  sections.push({
    title: "6. Prop Layout",
    content: [{ type: "table", table: layoutTable }],
  });

  // =============================================================================
  // Section 7: Prop Capacity Check
  // =============================================================================
  const designCapacity = results.prop_capacity / parseFloat(form.safety_factor);

  const checkTable: ReportTable = {
    headers: ["Parameter", "Value", "Status"],
    rows: [
      ["Tributary Area", `${results.tributary_area.toFixed(3)} m²`, ""],
      ["Factored Pressure", `${results.factored_load.toFixed(2)} kN/m²`, ""],
      ["Prop Load", `${results.prop_load.toFixed(1)} kN`, ""],
      ["Prop Rated Capacity", `${results.prop_capacity.toFixed(0)} kN`, ""],
      ["Design Capacity (÷SF)", `${designCapacity.toFixed(1)} kN`, ""],
      [
        "Utilisation",
        `${results.utilisation.toFixed(1)}%`,
        results.utilisation <= 100 ? "OK" : "FAIL",
      ],
    ],
  };

  sections.push({
    title: "7. Prop Capacity Check",
    content: [
      {
        type: "paragraph",
        text: `Safety Factor applied: ${form.safety_factor}`,
      },
      { type: "table", table: checkTable },
    ],
  });

  // =============================================================================
  // Section 8: Summary
  // =============================================================================
  const summaryTable: ReportTable = {
    headers: ["Result", "Value", "Status"],
    rows: [
      ["Total Props Required", results.total_props.toString(), ""],
      ["Prop Load", `${results.prop_load.toFixed(1)} kN`, ""],
      [
        "Utilisation",
        `${results.utilisation.toFixed(1)}%`,
        results.classification,
      ],
      [
        "Design Status",
        results.status,
        results.utilisation <= 100 ? "PASS" : "FAIL",
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
        `Use ${results.total_props} × ${prop?.name || "props"} in layout shown`,
        "Ensure base plates are level and on firm ground",
        "Check prop plumb before loading",
        "Install bracing per BS 5975 requirements",
        "Do not remove props until concrete has achieved design strength",
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
    title: "Soffit Shoring Design",
    subtitle: `BS 5975 / BS EN 12812 — ${results.total_props} Props Required`,
    projectInfo: {
      projectName: options.projectName || form.projectName || "Soffit Shoring",
      reference: form.reference || "SS-001",
      preparedBy: options.preparedBy || "BeaverCalc Studio",
      date: new Date().toLocaleDateString("en-GB"),
    },
    sections,
  };
}
