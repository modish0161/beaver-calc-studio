// =============================================================================
// Wind Actions PDF Report Builder
// EN 1991-1-4 with UK NA — Premium Report Generation
// =============================================================================

import type {
  BeaverCalcReport,
  ReportOptions,
  ReportSection,
  ReportTable,
} from "../types";

interface WindActionsForm {
  wind_zone: string;
  terrain_category: string;
  orography: string;
  altitude: string;
  distance_sea: string;
  structure_type: string;
  height: string;
  width: string;
  depth: string;
  reference_height: string;
  cseason: string;
  cdir: string;
  cprob: string;
  cf: string;
  cpe_windward: string;
  cpe_leeward: string;
  cpi: string;
  projectName: string;
  reference: string;
}

interface WindActionsResults {
  vb_0: number;
  vb: number;
  cr: number;
  co: number;
  vm: number;
  Iv: number;
  kl: number;
  qp: number;
  qb: number;
  ce: number;
  we_windward: number;
  we_leeward: number;
  wi_pos: number;
  wi_neg: number;
  net_pressure: number;
  wind_force: number;
  area: number;
  cscd: number;
  status: string;
  classification: string;
  classColor: string;
}

const UK_WIND_ZONES: Record<string, { name: string; vb_0: number }> = {
  zone1: { name: "Zone 1 (London/SE)", vb_0: 21.8 },
  zone2: { name: "Zone 2 (Midlands)", vb_0: 22.7 },
  zone3: { name: "Zone 3 (Wales/SW)", vb_0: 24.3 },
  zone4: { name: "Zone 4 (Northern)", vb_0: 25.4 },
  zone5: { name: "Zone 5 (Scotland)", vb_0: 26.5 },
  zone6: { name: "Zone 6 (Exposed)", vb_0: 30.0 },
};

const TERRAIN_CATEGORIES: Record<string, string> = {
  "0": "Category 0 - Sea/Coastal",
  I: "Category I - Lakes/Flat",
  II: "Category II - Rural",
  III: "Category III - Suburban",
  IV: "Category IV - Urban",
};

const OROGRAPHY_FACTORS: Record<string, { name: string; co: number }> = {
  flat: { name: "Flat terrain", co: 1.0 },
  hills: { name: "Hills/Cliffs", co: 1.1 },
  escarpment: { name: "Escarpments", co: 1.2 },
  ridges: { name: "Ridges/Peaks", co: 1.3 },
};

const STRUCTURE_TYPES: Record<string, string> = {
  building: "Building",
  bridge: "Bridge Deck",
  tower: "Tower/Mast",
  signage: "Signage/Hoarding",
  cylinder: "Cylindrical",
  truss: "Open Truss",
};

export function buildWindActionsReport(
  form: WindActionsForm,
  results: WindActionsResults,
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
        text: "This calculation determines wind actions on structures in accordance with:",
      },
      {
        type: "list",
        items: [
          "EN 1991-1-4: Eurocode 1 — Actions on structures — Wind actions",
          "UK National Annex to BS EN 1991-1-4",
          "Table NA.1: Fundamental basic wind velocity",
          "Clause 4.5: Peak velocity pressure",
        ],
      },
    ],
  });

  // =============================================================================
  // Section 2: Location & Terrain
  // =============================================================================
  const locationTable: ReportTable = {
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      [
        "Wind Zone",
        UK_WIND_ZONES[form.wind_zone]?.name || form.wind_zone,
        `vb,0 = ${UK_WIND_ZONES[form.wind_zone]?.vb_0 || "—"} m/s`,
      ],
      [
        "Terrain Category",
        TERRAIN_CATEGORIES[form.terrain_category] || form.terrain_category,
        "EN 1991-1-4 Table 4.1",
      ],
      [
        "Orography",
        OROGRAPHY_FACTORS[form.orography]?.name || form.orography,
        `co = ${OROGRAPHY_FACTORS[form.orography]?.co || "—"}`,
      ],
      ["Altitude", `${form.altitude} m`, "Above sea level"],
      ["Distance to Sea", `${form.distance_sea} km`, "For coastal exposure"],
    ],
  };

  sections.push({
    title: "2. Location & Terrain",
    content: [{ type: "table", table: locationTable }],
  });

  // =============================================================================
  // Section 3: Structure Geometry
  // =============================================================================
  const geometryTable: ReportTable = {
    headers: ["Parameter", "Symbol", "Value", "Unit"],
    rows: [
      [
        "Structure Type",
        "",
        STRUCTURE_TYPES[form.structure_type] || form.structure_type,
        "",
      ],
      ["Height", "H", form.height, "m"],
      ["Width (⊥ wind)", "b", form.width, "m"],
      ["Depth (∥ wind)", "d", form.depth, "m"],
      ["Reference Height", "z", form.reference_height, "m"],
      ["Reference Area", "A_ref", results.area.toFixed(1), "m²"],
    ],
  };

  sections.push({
    title: "3. Structure Geometry",
    content: [{ type: "table", table: geometryTable }],
  });

  // =============================================================================
  // Section 4: Modification Factors
  // =============================================================================
  const factorsTable: ReportTable = {
    headers: ["Factor", "Symbol", "Value", "Description"],
    rows: [
      [
        "Seasonal Factor",
        "c_season",
        form.cseason,
        "UK NA: 1.0 for permanent structures",
      ],
      ["Directional Factor", "c_dir", form.cdir, "Depends on structure type"],
      [
        "Probability Factor",
        "c_prob",
        form.cprob,
        "1.0 for 50-year return period",
      ],
      ["Orography Factor", "c_o", results.co.toFixed(2), "Terrain speedup"],
    ],
  };

  sections.push({
    title: "4. Modification Factors",
    content: [{ type: "table", table: factorsTable }],
  });

  // =============================================================================
  // Section 5: Basic Wind Velocity
  // =============================================================================
  const windVelTable: ReportTable = {
    headers: ["Parameter", "Formula", "Value"],
    rows: [
      [
        "Fundamental wind velocity",
        "vb,0 (UK NA)",
        `${results.vb_0.toFixed(1)} m/s`,
      ],
      [
        "Basic wind velocity",
        "vb = cdir × cseason × cprob × calt × vb,0",
        `${results.vb.toFixed(1)} m/s`,
      ],
      ["Roughness factor", "cr = kr × ln(z/z0)", results.cr.toFixed(3)],
      [
        "Mean wind velocity",
        "vm = cr × co × vb",
        `${results.vm.toFixed(1)} m/s`,
      ],
    ],
  };

  sections.push({
    title: "5. Wind Velocity Calculation",
    content: [
      {
        type: "paragraph",
        text: "Basic and mean wind velocities per EN 1991-1-4 Clause 4.2.",
      },
      { type: "table", table: windVelTable },
    ],
  });

  // =============================================================================
  // Section 6: Peak Velocity Pressure
  // =============================================================================
  const pressureTable: ReportTable = {
    headers: ["Parameter", "Formula", "Value"],
    rows: [
      [
        "Basic velocity pressure",
        "qb = 0.5 × ρ × vb²",
        `${results.qb.toFixed(0)} Pa`,
      ],
      [
        "Turbulence intensity",
        "Iv = kl / (co × ln(z/z0))",
        results.Iv.toFixed(3),
      ],
      ["Exposure factor", "ce = (1 + 7Iv) × cr² × co²", results.ce.toFixed(2)],
      ["Peak velocity pressure", "qp = ce × qb", `${results.qp.toFixed(0)} Pa`],
      ["", "", `${(results.qp / 1000).toFixed(3)} kN/m²`],
    ],
  };

  sections.push({
    title: "6. Peak Velocity Pressure",
    content: [
      {
        type: "paragraph",
        text: "Peak velocity pressure at reference height per EN 1991-1-4 Clause 4.5.",
      },
      { type: "table", table: pressureTable },
    ],
  });

  // =============================================================================
  // Section 7: Pressure Coefficients
  // =============================================================================
  const coefTable: ReportTable = {
    headers: ["Coefficient", "Symbol", "Value", "Location"],
    rows: [
      ["External (windward)", "cpe", form.cpe_windward, "Pressure"],
      ["External (leeward)", "cpe", form.cpe_leeward, "Suction"],
      ["Internal", "cpi", `±${form.cpi}`, "Opening dependent"],
      ["Force coefficient", "cf", form.cf, "Structure type"],
    ],
  };

  sections.push({
    title: "7. Pressure Coefficients",
    content: [{ type: "table", table: coefTable }],
  });

  // =============================================================================
  // Section 8: Wind Pressure Results
  // =============================================================================
  const windPressTable: ReportTable = {
    headers: ["Surface", "Formula", "Pressure (Pa)", "Pressure (kN/m²)"],
    rows: [
      [
        "Windward external",
        "we = qp × cpe",
        `+${results.we_windward.toFixed(0)}`,
        `+${(results.we_windward / 1000).toFixed(3)}`,
      ],
      [
        "Leeward external",
        "we = qp × cpe",
        results.we_leeward.toFixed(0),
        (results.we_leeward / 1000).toFixed(3),
      ],
      [
        "Internal (positive)",
        "wi = qp × cpi",
        `+${results.wi_pos.toFixed(0)}`,
        `+${(results.wi_pos / 1000).toFixed(3)}`,
      ],
      [
        "Internal (negative)",
        "wi = qp × cpi",
        results.wi_neg.toFixed(0),
        (results.wi_neg / 1000).toFixed(3),
      ],
      [
        "Net design pressure",
        "Worst case combination",
        results.net_pressure.toFixed(0),
        (results.net_pressure / 1000).toFixed(3),
      ],
    ],
  };

  sections.push({
    title: "8. Wind Pressure Results",
    content: [{ type: "table", table: windPressTable }],
  });

  // =============================================================================
  // Section 9: Wind Force
  // =============================================================================
  const forceTable: ReportTable = {
    headers: ["Parameter", "Value"],
    rows: [
      ["Structural factor cscd", results.cscd.toFixed(2)],
      ["Force coefficient cf", form.cf],
      ["Reference area Aref", `${results.area.toFixed(1)} m²`],
      ["Peak pressure qp", `${results.qp.toFixed(0)} Pa`],
      [
        "Wind force Fw = cscd × cf × qp × Aref",
        `${results.wind_force.toFixed(1)} kN`,
      ],
    ],
  };

  sections.push({
    title: "9. Total Wind Force",
    content: [
      {
        type: "paragraph",
        text: "Wind force on structure per EN 1991-1-4 Clause 5.3.",
      },
      { type: "table", table: forceTable },
    ],
  });

  // =============================================================================
  // Section 10: Summary
  // =============================================================================
  const summaryTable: ReportTable = {
    headers: ["Result", "Value", "Classification"],
    rows: [
      [
        "Peak Velocity Pressure",
        `${results.qp.toFixed(0)} Pa (${(results.qp / 1000).toFixed(3)} kN/m²)`,
        results.classification,
      ],
      [
        "Net Design Pressure",
        `${results.net_pressure.toFixed(0)} Pa (${(results.net_pressure / 1000).toFixed(3)} kN/m²)`,
        "",
      ],
      ["Total Wind Force", `${results.wind_force.toFixed(1)} kN`, ""],
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
        "Apply wind forces to structural model at centroid of reference area",
        "Consider wind from all directions for worst-case loading",
        "Combine with other variable actions per EN 1990",
        "For dynamic structures, verify cscd factor per Annex B/C",
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
    title: "Wind Actions Analysis",
    subtitle: `EN 1991-1-4 with UK NA — ${STRUCTURE_TYPES[form.structure_type] || "Structure"}`,
    projectInfo: {
      projectName: options.projectName || form.projectName || "Wind Analysis",
      reference: form.reference || "WA-001",
      preparedBy: options.preparedBy || "BeaverCalc Studio",
      date: new Date().toLocaleDateString("en-GB"),
    },
    sections,
  };
}
