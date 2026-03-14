// =============================================================================
// Thermal Actions PDF Report Builder
// EN 1991-1-5 with UK NA — Premium Report Generation
// =============================================================================

import type {
  BeaverCalcReport,
  ReportOptions,
  ReportSection,
  ReportTable,
} from "../types";

interface ThermalActionsForm {
  structure_type: string;
  deck_type: string;
  surfacing_thickness: string;
  member_length: string;
  depth: string;
  section_area: string;
  moment_of_inertia: string;
  material: string;
  custom_alpha: string;
  custom_E: string;
  location: string;
  altitude: string;
  coastal: string;
  initial_temp: string;
  T_max_shade: string;
  T_min_shade: string;
  restraint_type: string;
  fixity_factor: string;
  projectName: string;
  reference: string;
}

interface ThermalActionsResults {
  Te_max: number;
  Te_min: number;
  delta_TU_con: number;
  delta_TU_exp: number;
  delta_TM_heat: number;
  delta_TM_cool: number;
  max_expansion: number;
  max_contraction: number;
  total_range: number;
  axial_force_exp: number;
  axial_force_con: number;
  curvature_heat: number;
  curvature_cool: number;
  moment_heat: number;
  moment_cool: number;
  thermal_stress_exp: number;
  thermal_stress_con: number;
  status: string;
  rating: string;
  ratingColor: string;
}

const STRUCTURE_TYPES: Record<string, string> = {
  bridge: "Bridge",
  building: "Building",
  tank_silo: "Tank/Silo",
  industrial: "Industrial",
};

const DECK_TYPES: Record<string, string> = {
  type1: "Type 1 - Steel on Steel Box",
  type2: "Type 2 - Composite Deck",
  type3: "Type 3 - Concrete Box/Slab",
};

const SURFACING_OPTIONS: Record<string, string> = {
  "0": "Unsurfaced",
  "50": "50mm surfacing",
  "100": "100mm surfacing",
  ballast: "Ballasted track",
};

const MATERIALS: Record<string, { alpha: number; E: number; name: string }> = {
  steel: { alpha: 12e-6, E: 210000, name: "Structural Steel" },
  concrete: { alpha: 10e-6, E: 34000, name: "Concrete" },
  stainless: { alpha: 16e-6, E: 200000, name: "Stainless Steel" },
  aluminium: { alpha: 23e-6, E: 70000, name: "Aluminium" },
  timber: { alpha: 5e-6, E: 11000, name: "Timber" },
  custom: { alpha: 12e-6, E: 210000, name: "Custom" },
};

const RESTRAINT_TYPES: Record<string, string> = {
  free: "Free Expansion",
  partially: "Partially Restrained",
  fully: "Fully Restrained",
};

const LOCATIONS: Record<string, string> = {
  default: "UK General",
  london: "London",
  birmingham: "Birmingham",
  manchester: "Manchester",
  edinburgh: "Edinburgh",
  cardiff: "Cardiff",
  belfast: "Belfast",
};

export function buildThermalActionsReport(
  form: ThermalActionsForm,
  results: ThermalActionsResults,
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
        text: "This calculation determines thermal actions on structures in accordance with:",
      },
      {
        type: "list",
        items: [
          "EN 1991-1-5: Eurocode 1 — Actions on structures — General actions — Thermal actions",
          "UK National Annex to BS EN 1991-1-5",
          "Table 6.1: Bridge deck types for uniform temperature",
          "Table 6.2: Surfacing adjustments for differential temperature",
        ],
      },
    ],
  });

  // =============================================================================
  // Section 2: Structure Configuration
  // =============================================================================
  const structureTable: ReportTable = {
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      [
        "Structure Type",
        STRUCTURE_TYPES[form.structure_type] || form.structure_type,
        "",
      ],
    ],
  };

  if (form.structure_type === "bridge") {
    structureTable.rows.push(
      [
        "Deck Type",
        DECK_TYPES[form.deck_type] || form.deck_type,
        "EN 1991-1-5 Table 6.1",
      ],
      [
        "Surfacing",
        SURFACING_OPTIONS[form.surfacing_thickness] || form.surfacing_thickness,
        "Affects differential temp",
      ],
    );
  }

  structureTable.rows.push(
    [
      "Location",
      LOCATIONS[form.location] || form.location,
      "UK NA shade air temps",
    ],
    [
      "Restraint",
      RESTRAINT_TYPES[form.restraint_type] || form.restraint_type,
      "",
    ],
  );

  sections.push({
    title: "2. Structure Configuration",
    content: [{ type: "table", table: structureTable }],
  });

  // =============================================================================
  // Section 3: Member Geometry
  // =============================================================================
  const geometryTable: ReportTable = {
    headers: ["Parameter", "Symbol", "Value", "Unit"],
    rows: [
      ["Member Length", "L", form.member_length, "m"],
      ["Section Depth", "d", form.depth, "mm"],
      ["Section Area", "A", form.section_area, "mm²"],
      ["Moment of Inertia", "I", form.moment_of_inertia, "mm⁴"],
    ],
  };

  sections.push({
    title: "3. Member Geometry",
    content: [{ type: "table", table: geometryTable }],
  });

  // =============================================================================
  // Section 4: Material Properties
  // =============================================================================
  const mat = MATERIALS[form.material];
  const alpha =
    form.material === "custom"
      ? parseFloat(form.custom_alpha) * 1e-6
      : mat?.alpha || 12e-6;
  const E =
    form.material === "custom" ? parseFloat(form.custom_E) : mat?.E || 210000;

  const materialTable: ReportTable = {
    headers: ["Parameter", "Symbol", "Value", "Unit"],
    rows: [
      ["Material", "", mat?.name || "Custom", ""],
      ["Thermal Coefficient", "α", (alpha * 1e6).toFixed(1), "×10⁻⁶/°C"],
      ["Elastic Modulus", "E", E.toString(), "MPa"],
    ],
  };

  sections.push({
    title: "4. Material Properties",
    content: [{ type: "table", table: materialTable }],
  });

  // =============================================================================
  // Section 5: Temperature Data
  // =============================================================================
  const tempTable: ReportTable = {
    headers: ["Parameter", "Symbol", "Value", "Unit"],
    rows: [
      ["Initial Temperature", "T₀", form.initial_temp, "°C"],
      ["Max Shade Air Temp", "T_max", form.T_max_shade, "°C"],
      ["Min Shade Air Temp", "T_min", form.T_min_shade, "°C"],
      ["Max Effective Temp", "Te,max", results.Te_max.toFixed(1), "°C"],
      ["Min Effective Temp", "Te,min", results.Te_min.toFixed(1), "°C"],
    ],
  };

  sections.push({
    title: "5. Temperature Data (UK NA)",
    content: [
      {
        type: "paragraph",
        text: "Shade air temperatures from UK National Annex.",
      },
      { type: "table", table: tempTable },
    ],
  });

  // =============================================================================
  // Section 6: Uniform Temperature Component
  // =============================================================================
  const uniformTable: ReportTable = {
    headers: ["Component", "Symbol", "Value", "Derivation"],
    rows: [
      [
        "Expansion ΔT",
        "ΔTU,exp",
        `+${results.delta_TU_exp.toFixed(1)} °C`,
        `Te,max - T₀ = ${results.Te_max.toFixed(0)} - ${form.initial_temp}`,
      ],
      [
        "Contraction ΔT",
        "ΔTU,con",
        `-${results.delta_TU_con.toFixed(1)} °C`,
        `T₀ - Te,min = ${form.initial_temp} - (${results.Te_min.toFixed(0)})`,
      ],
    ],
  };

  sections.push({
    title: "6. Uniform Temperature Component",
    content: [
      {
        type: "paragraph",
        text: "Uniform temperature change causing axial expansion/contraction per EN 1991-1-5 Clause 6.1.3.",
      },
      { type: "table", table: uniformTable },
    ],
  });

  // =============================================================================
  // Section 7: Differential Temperature (Bridges)
  // =============================================================================
  if (form.structure_type === "bridge") {
    const diffTable: ReportTable = {
      headers: ["Component", "Symbol", "Value", "Notes"],
      rows: [
        [
          "Heating (top warmer)",
          "ΔTM,heat",
          `+${results.delta_TM_heat.toFixed(1)} °C`,
          "Solar heating, deck type + surfacing",
        ],
        [
          "Cooling (top cooler)",
          "ΔTM,cool",
          `+${results.delta_TM_cool.toFixed(1)} °C`,
          "Night cooling",
        ],
        [
          "Curvature (heating)",
          "κ_heat",
          `${(results.curvature_heat * 1000).toFixed(4)} /km`,
          "α × ΔTM / d",
        ],
        [
          "Curvature (cooling)",
          "κ_cool",
          `${(results.curvature_cool * 1000).toFixed(4)} /km`,
          "α × ΔTM / d",
        ],
      ],
    };

    sections.push({
      title: "7. Differential Temperature Component",
      content: [
        {
          type: "paragraph",
          text: "Temperature difference through depth causing curvature per EN 1991-1-5 Table 6.1.",
        },
        { type: "table", table: diffTable },
      ],
    });
  }

  // =============================================================================
  // Section 8: Thermal Movement
  // =============================================================================
  const movementTable: ReportTable = {
    headers: ["Movement", "Formula", "Value"],
    rows: [
      [
        "Max Expansion",
        "δ_exp = α × ΔTU,exp × L",
        `+${results.max_expansion.toFixed(1)} mm`,
      ],
      [
        "Max Contraction",
        "δ_con = α × ΔTU,con × L",
        `-${results.max_contraction.toFixed(1)} mm`,
      ],
      [
        "Total Movement Range",
        "δ_total = δ_exp + δ_con",
        `${results.total_range.toFixed(1)} mm`,
      ],
    ],
  };

  sections.push({
    title: "8. Free Thermal Movement",
    content: [
      {
        type: "paragraph",
        text: "Free movement assuming unrestrained expansion/contraction.",
      },
      { type: "table", table: movementTable },
    ],
  });

  // =============================================================================
  // Section 9: Restrained Effects (if applicable)
  // =============================================================================
  if (form.restraint_type !== "free") {
    const restrainedTable: ReportTable = {
      headers: ["Effect", "Formula", "Value"],
      rows: [
        [
          "Axial Force (Expansion)",
          "N_exp = E × A × α × ΔT × k",
          `${results.axial_force_exp.toFixed(0)} kN`,
        ],
        [
          "Axial Force (Contraction)",
          "N_con = E × A × α × ΔT × k",
          `${results.axial_force_con.toFixed(0)} kN`,
        ],
        [
          "Thermal Stress (Expansion)",
          "σ_exp = N_exp / A",
          `${results.thermal_stress_exp.toFixed(1)} MPa`,
        ],
        [
          "Thermal Stress (Contraction)",
          "σ_con = N_con / A",
          `${results.thermal_stress_con.toFixed(1)} MPa`,
        ],
      ],
    };

    if (form.structure_type === "bridge") {
      restrainedTable.rows.push(
        [
          "Moment (Heating)",
          "M_heat = E × I × κ",
          `${results.moment_heat.toFixed(0)} kNm`,
        ],
        [
          "Moment (Cooling)",
          "M_cool = E × I × κ",
          `${results.moment_cool.toFixed(0)} kNm`,
        ],
      );
    }

    sections.push({
      title: "9. Restrained Thermal Effects",
      content: [
        {
          type: "paragraph",
          text: `Restraint condition: ${RESTRAINT_TYPES[form.restraint_type]}`,
        },
        { type: "table", table: restrainedTable },
      ],
    });
  }

  // =============================================================================
  // Section 10: Summary
  // =============================================================================
  const summaryTable: ReportTable = {
    headers: ["Parameter", "Value", "Status"],
    rows: [
      [
        "Total Movement Range",
        `${results.total_range.toFixed(1)} mm`,
        results.rating,
      ],
      [
        "Movement Classification",
        results.rating,
        results.total_range <= 50 ? "Standard joints" : "Large movement joints",
      ],
    ],
  };

  if (form.restraint_type !== "free") {
    summaryTable.rows.push([
      "Max Thermal Stress",
      `${Math.max(results.thermal_stress_exp, results.thermal_stress_con).toFixed(1)} MPa`,
      "Verify capacity",
    ]);
  }

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
        `Provide expansion joints to accommodate ${results.total_range.toFixed(0)}mm total movement`,
        "Consider movement range for bearing selection",
        "Allow for temperature effects in connection design",
        form.structure_type === "bridge"
          ? "Account for differential temperature in deck slab design"
          : "Consider thermal movement at building joints",
      ],
    },
  );

  sections.push({
    title: "10. Summary & Recommendations",
    content: summaryContent,
  });

  // =============================================================================
  // Build Final Report
  // =============================================================================
  return {
    title: "Thermal Actions Analysis",
    subtitle: `EN 1991-1-5 with UK NA — ${STRUCTURE_TYPES[form.structure_type] || "Structure"}`,
    projectInfo: {
      projectName:
        options.projectName || form.projectName || "Thermal Analysis",
      reference: form.reference || "TH-001",
      preparedBy: options.preparedBy || "BeaverCalc Studio",
      date: new Date().toLocaleDateString("en-GB"),
    },
    sections,
  };
}
