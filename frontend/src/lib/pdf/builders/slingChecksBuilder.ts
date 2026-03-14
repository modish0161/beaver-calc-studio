// =============================================================================
// Sling Checks Report Builder
// BS EN 1492 / LEEA — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

interface SlingChecksFormData {
  sling_type: string;
  sling_config: string;
  sling_length: string;
  num_legs: string;
  load_weight: string;
  dynamic_factor: string;
  cog_offset: string;
  environmental_factor: string;
  sling_angle: string;
  spread_width: string;
  lift_height: string;
  top_fitting: string;
  bottom_fitting: string;
  design_factor: string;
  projectName: string;
  reference: string;
}

interface SlingChecksResults {
  load_per_leg: number;
  factored_load: number;
  angle_factor: number;
  adjusted_wll: number;
  sling_wll_single: number;
  sling_mbl: number;
  sling_capacity_config: number;
  efficiency: number;
  utilisation: number;
  status: string;
  actual_angle: number;
  actual_length_req: number;
  min_sling_size: string;
  recommended_sling: string;
  rating: string;
  warnings: string[];
}

interface ProjectInfo {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

const SLING_TYPES: Record<string, { name: string; material: string }> = {
  chain_8_G80: { name: "Grade 80 Chain 8mm", material: "Alloy Steel" },
  chain_10_G80: { name: "Grade 80 Chain 10mm", material: "Alloy Steel" },
  chain_13_G80: { name: "Grade 80 Chain 13mm", material: "Alloy Steel" },
  chain_16_G80: { name: "Grade 80 Chain 16mm", material: "Alloy Steel" },
  chain_20_G80: { name: "Grade 80 Chain 20mm", material: "Alloy Steel" },
  chain_26_G80: { name: "Grade 80 Chain 26mm", material: "Alloy Steel" },
  chain_10_G100: { name: "Grade 100 Chain 10mm", material: "Alloy Steel" },
  chain_13_G100: { name: "Grade 100 Chain 13mm", material: "Alloy Steel" },
  chain_16_G100: { name: "Grade 100 Chain 16mm", material: "Alloy Steel" },
  wire_12: { name: "Wire Rope 12mm 6x36", material: "Steel Wire" },
  wire_16: { name: "Wire Rope 16mm 6x36", material: "Steel Wire" },
  wire_20: { name: "Wire Rope 20mm 6x36", material: "Steel Wire" },
  wire_26: { name: "Wire Rope 26mm 6x36", material: "Steel Wire" },
  wire_32: { name: "Wire Rope 32mm 6x36", material: "Steel Wire" },
  web_25_purple: { name: "Webbing 25mm Purple 1t", material: "Polyester" },
  web_50_green: { name: "Webbing 50mm Green 2t", material: "Polyester" },
  web_60_yellow: { name: "Webbing 60mm Yellow 3t", material: "Polyester" },
  web_90_grey: { name: "Webbing 90mm Grey 4t", material: "Polyester" },
  web_120_red: { name: "Webbing 120mm Red 5t", material: "Polyester" },
  round_1_violet: { name: "Round Sling 1t Violet", material: "Polyester Core" },
  round_2_green: { name: "Round Sling 2t Green", material: "Polyester Core" },
  round_3_yellow: { name: "Round Sling 3t Yellow", material: "Polyester Core" },
  round_5_red: { name: "Round Sling 5t Red", material: "Polyester Core" },
  round_8_blue: { name: "Round Sling 8t Blue", material: "Polyester Core" },
  round_10_orange: {
    name: "Round Sling 10t Orange",
    material: "Polyester Core",
  },
  round_20_orange: {
    name: "Round Sling 20t Orange",
    material: "Polyester Core",
  },
};

const SLING_CONFIGS: Record<string, { name: string }> = {
  single_vertical: { name: "Single Vertical" },
  single_choke: { name: "Single Choke" },
  single_basket: { name: "Single Basket" },
  two_leg_60: { name: "2-Leg @ 60°" },
  two_leg_45: { name: "2-Leg @ 45°" },
  four_leg_60: { name: "4-Leg @ 60°" },
  four_leg_45: { name: "4-Leg @ 45°" },
  custom: { name: "Custom Config" },
};

const END_FITTINGS: Record<string, { name: string }> = {
  master_link: { name: "Master Link" },
  soft_eye: { name: "Soft Eye" },
  thimble_eye: { name: "Thimble Eye" },
  self_lock_hook: { name: "Self-Locking Hook" },
  sling_hook: { name: "Sling Hook" },
  grab_hook: { name: "Grab Hook" },
  shackle: { name: "Shackle" },
};

export function buildSlingChecksReport(
  form: SlingChecksFormData,
  results: SlingChecksResults,
  projectInfo: ProjectInfo = {},
): ReportData {
  // Sling selection table
  const slingTable: TableInput = {
    title: "Sling Selection",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      [
        "Sling Type",
        SLING_TYPES[form.sling_type]?.name || form.sling_type,
        SLING_TYPES[form.sling_type]?.material || "-",
      ],
      [
        "Configuration",
        SLING_CONFIGS[form.sling_config]?.name || form.sling_config,
        "-",
      ],
      ["Sling Length", form.sling_length + " m", "-"],
      [
        "Top Fitting",
        END_FITTINGS[form.top_fitting]?.name || form.top_fitting,
        "-",
      ],
      [
        "Bottom Fitting",
        END_FITTINGS[form.bottom_fitting]?.name || form.bottom_fitting,
        "-",
      ],
    ],
  };

  // Loading table
  const loadingTable: TableInput = {
    title: "Loading Data",
    headers: ["Parameter", "Value", "Unit"],
    rows: [
      ["Applied Load", form.load_weight, "kN"],
      ["Dynamic Factor", form.dynamic_factor, "-"],
      ["Environmental Factor", form.environmental_factor, "-"],
      ["Design Factor", form.design_factor, "-"],
      ["Factored Load", results.factored_load.toFixed(1), "kN"],
    ],
  };

  // Geometry table
  const geometryTable: TableInput = {
    title: "Lift Geometry",
    headers: ["Parameter", "Value", "Unit"],
    rows: [
      ["Sling Angle", form.sling_angle, "° from vertical"],
      ["Spread Width", form.spread_width, "m"],
      ["Lift Height", form.lift_height, "m"],
      ["COG Offset", form.cog_offset, "m"],
      ["Calculated Angle", results.actual_angle.toFixed(1), "°"],
      ["Required Length", results.actual_length_req.toFixed(2), "m"],
    ],
  };

  // Capacity table
  const capacityTable: TableInput = {
    title: "Sling Capacity Analysis",
    headers: ["Parameter", "Value", "Status"],
    rows: [
      ["Single Leg WLL", results.sling_wll_single.toFixed(1) + " t", "-"],
      ["Minimum Breaking Load (MBL)", results.sling_mbl.toFixed(1) + " t", "-"],
      ["Angle Factor", results.angle_factor.toFixed(3), "-"],
      ["Fitting Efficiency", (results.efficiency * 100).toFixed(0) + "%", "-"],
      [
        "Configuration Capacity",
        (results.sling_capacity_config * 10).toFixed(0) + " kN",
        "-",
      ],
      ["Load per Leg", results.load_per_leg.toFixed(1) + " kN", "-"],
    ],
  };

  // Summary table
  const summaryTable: TableInput = {
    title: "Design Summary",
    headers: ["Check", "Value", "Status"],
    rows: [
      ["Applied Load", results.factored_load.toFixed(1) + " kN", "-"],
      ["Sling Capacity", results.adjusted_wll.toFixed(1) + " t", "-"],
      [
        "Utilisation",
        (results.utilisation * 100).toFixed(1) + "%",
        results.status,
      ],
      ["OVERALL DESIGN", results.rating, results.status],
    ],
  };

  const notesContent = [
    "1. Design in accordance with BS EN 1492-1/2 (Textile slings), BS EN 818 (Chain), BS EN 13414 (Wire rope).",
    "2. WLL values based on manufacturers data and LEEA Code of Practice for the Safe Use of Lifting Equipment.",
    "3. Angle factor applied per LEEA guidance - capacity reduces significantly above 60° from vertical.",
    "4. For 4-leg configurations, only 3 legs assumed active (75% efficiency) for asymmetric loading.",
    "5. Dynamic factor of " +
      form.dynamic_factor +
      " applied for lifting dynamics.",
    "6. All slings must be marked with WLL and undergo LOLER examination every 6-12 months.",
    "7. Visual inspection required before each lift.",
    "8. Slings showing damage, wear, or deformation must be withdrawn from service.",
  ];

  if (results.warnings.length > 0) {
    notesContent.push("", "DESIGN WARNINGS:");
    results.warnings.forEach((w) => notesContent.push("• " + w));
  }

  if (results.min_sling_size !== "Current selection adequate") {
    notesContent.push("", "RECOMMENDATION: " + results.min_sling_size);
  }

  return {
    title: "Sling Check Report",
    subtitle: "BS EN 1492 / LEEA Lifting Sling Verification",
    projectInfo: {
      "Project Name": projectInfo.projectName || form.projectName,
      Reference: form.reference,
      Client: projectInfo.clientName,
      "Prepared By": projectInfo.preparedBy,
      Date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      "Sling Type": SLING_TYPES[form.sling_type]?.name || form.sling_type,
      Configuration:
        SLING_CONFIGS[form.sling_config]?.name || form.sling_config,
      "Applied Load": form.load_weight + " kN",
      Utilisation: (results.utilisation * 100).toFixed(1) + "%",
      "Design Status": results.status,
      Rating: results.rating,
    },
    tables: [
      slingTable,
      loadingTable,
      geometryTable,
      capacityTable,
      summaryTable,
    ],
    notes: notesContent,
    footer: {
      preparedBy: projectInfo.preparedBy,
      reviewedBy: "Lifting Operations Supervisor",
      approvedBy: "",
    },
  };
}
