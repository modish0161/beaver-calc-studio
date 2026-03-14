// =============================================================================
// Falsework Design Report Builder
// BS 5975 Temporary Works — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

interface FalseworkFormData {
  span: string;
  bay_width: string;
  tier_count: string;
  post_height: string;
  system_type: string;
  dead_load: string;
  live_load: string;
  wind_load: string;
  concrete_thickness: string;
  formwork_weight: string;
  post_section: string;
  steel_grade: string;
  foundation_type: string;
  ground_condition: string;
  base_plate_size: string;
  bracing_type: string;
  bracing_spacing: string;
  sf_bearing: string;
  sf_buckling: string;
  dynamic_factor: string;
  projectName: string;
  reference: string;
}

interface FalseworkResults {
  total_load_per_prop: number;
  total_uls_load: number;
  post_area: number;
  post_radius: number;
  post_slenderness: number;
  euler_load: number;
  buckling_factor: number;
  design_resistance: number;
  post_util: number;
  post_status: string;
  base_area: number;
  bearing_pressure: number;
  allowable_bearing: number;
  bearing_util: number;
  bearing_status: string;
  bracing_required: boolean;
  horizontal_force: number;
  bracing_capacity: number;
  bracing_status: string;
  num_posts: number;
  effective_length: number;
  critical_check: string;
  status: string;
  rating: string;
  ratingColor: string;
}

interface ProjectInfo {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

const SYSTEM_TYPES: Record<string, { name: string }> = {
  tube_fitting: { name: "Tube & Fitting" },
  system_scaffold: { name: "System Scaffold" },
  shoring_tower: { name: "Shoring Tower" },
  props: { name: "Adjustable Props" },
  modular: { name: "Modular System" },
};

const POST_SECTIONS: Record<string, { name: string }> = {
  "CHS_48.3x3.2": { name: "CHS 48.3×3.2" },
  "CHS_60.3x3.2": { name: "CHS 60.3×3.2" },
  "CHS_76.1x3.6": { name: "CHS 76.1×3.6" },
  "CHS_101.6x3.6": { name: "CHS 101.6×3.6" },
  "CHS_114.3x4.0": { name: "CHS 114.3×4.0" },
  "CHS_139.7x4.0": { name: "CHS 139.7×4.0" },
  "CHS_168.3x4.5": { name: "CHS 168.3×4.5" },
  "CHS_193.7x5.0": { name: "CHS 193.7×5.0" },
};

const FOUNDATION_TYPES: Record<string, { name: string }> = {
  timber_sole: { name: "Timber Sole Plate" },
  steel_base: { name: "Steel Base Plate" },
  spread_pad: { name: "Spread Pad Footing" },
  ground_bearing: { name: "Direct on Ground" },
  existing_slab: { name: "Existing Concrete Slab" },
};

const GROUND_CONDITIONS: Record<string, { name: string }> = {
  soft_clay: { name: "Soft Clay" },
  firm_clay: { name: "Firm Clay" },
  stiff_clay: { name: "Stiff Clay" },
  loose_sand: { name: "Loose Sand" },
  medium_sand: { name: "Medium Dense Sand" },
  dense_sand: { name: "Dense Sand/Gravel" },
  hardcore: { name: "Compacted Hardcore" },
  concrete: { name: "Concrete Slab" },
};

const BRACING_TYPES: Record<string, { name: string }> = {
  none: { name: "No Bracing" },
  ledger: { name: "Ledger Bracing" },
  diagonal: { name: "Diagonal Bracing" },
  plan_bracing: { name: "Plan Bracing" },
  full_bracing: { name: "Full Bracing System" },
};

export function buildFalseworkReport(
  form: FalseworkFormData,
  results: FalseworkResults,
  warnings: string[] = [],
  projectInfo: ProjectInfo = {},
): ReportData {
  // Input data table
  const geometryTable: TableInput = {
    title: "System Geometry",
    headers: ["Parameter", "Value", "Unit"],
    rows: [
      [
        "System Type",
        SYSTEM_TYPES[form.system_type]?.name || form.system_type,
        "-",
      ],
      ["Span", form.span, "m"],
      ["Bay Width", form.bay_width, "m"],
      ["Post Height (per tier)", form.post_height, "m"],
      ["Number of Tiers", form.tier_count, "-"],
      [
        "Total Height",
        (parseFloat(form.post_height) * parseInt(form.tier_count)).toFixed(2),
        "m",
      ],
    ],
  };

  const concreteLoad = (parseFloat(form.concrete_thickness) / 1000) * 25;
  const loadingTable: TableInput = {
    title: "Loading Data",
    headers: ["Load Type", "Value", "Unit"],
    rows: [
      ["Concrete Thickness", form.concrete_thickness, "mm"],
      ["Concrete Self-Weight", concreteLoad.toFixed(2), "kN/m²"],
      ["Dead Load (excl. concrete)", form.dead_load, "kN/m²"],
      ["Live Load", form.live_load, "kN/m²"],
      ["Formwork Weight", form.formwork_weight, "kN/m²"],
      ["Wind Load", form.wind_load, "kN/m²"],
      ["Dynamic Factor", form.dynamic_factor, "-"],
    ],
  };

  const materialsTable: TableInput = {
    title: "Materials & Foundation",
    headers: ["Parameter", "Value", "Notes"],
    rows: [
      [
        "Post Section",
        POST_SECTIONS[form.post_section]?.name || form.post_section,
        "CHS steel tube",
      ],
      ["Steel Grade", form.steel_grade, "EN 10025"],
      ["Base Plate Size", form.base_plate_size, "mm square"],
      [
        "Foundation Type",
        FOUNDATION_TYPES[form.foundation_type]?.name || form.foundation_type,
        "-",
      ],
      [
        "Ground Condition",
        GROUND_CONDITIONS[form.ground_condition]?.name || form.ground_condition,
        "-",
      ],
      [
        "Bracing Type",
        BRACING_TYPES[form.bracing_type]?.name || form.bracing_type,
        "-",
      ],
    ],
  };

  // Results tables
  const loadSummaryTable: TableInput = {
    title: "Loading Summary",
    headers: ["Parameter", "Value", "Unit"],
    rows: [
      ["Number of Posts", results.num_posts.toString(), "-"],
      ["Load per Post (SLS)", results.total_load_per_prop.toFixed(2), "kN"],
      ["ULS Load per Post", results.total_uls_load.toFixed(2), "kN"],
      ["Effective Length", results.effective_length.toFixed(3), "m"],
    ],
  };

  const bucklingTable: TableInput = {
    title: "Post Buckling Check (EN 1993-1-1)",
    headers: ["Parameter", "Value", "Status"],
    rows: [
      [
        "Slenderness Ratio λ",
        results.post_slenderness.toFixed(1),
        results.post_slenderness <= 180 ? "OK" : "HIGH",
      ],
      ["Buckling Factor χ", results.buckling_factor.toFixed(4), "-"],
      ["Euler Critical Load", results.euler_load.toFixed(1) + " kN", "-"],
      ["Design Resistance", results.design_resistance.toFixed(1) + " kN", "-"],
      ["Applied Load", results.total_uls_load.toFixed(1) + " kN", "-"],
      [
        "Utilisation",
        (results.post_util * 100).toFixed(1) + "%",
        results.post_status,
      ],
    ],
  };

  const foundationTable: TableInput = {
    title: "Foundation Bearing Check",
    headers: ["Parameter", "Value", "Status"],
    rows: [
      ["Base Area", (results.base_area * 10000).toFixed(0) + " cm²", "-"],
      ["Bearing Pressure", results.bearing_pressure.toFixed(1) + " kPa", "-"],
      ["Allowable Bearing", results.allowable_bearing.toFixed(1) + " kPa", "-"],
      [
        "Utilisation",
        (results.bearing_util * 100).toFixed(1) + "%",
        results.bearing_status,
      ],
    ],
  };

  const bracingTable: TableInput = {
    title: "Bracing Assessment",
    headers: ["Parameter", "Value", "Status"],
    rows: [
      ["Bracing Required", results.bracing_required ? "Yes" : "No", "-"],
      ["Horizontal Force", results.horizontal_force.toFixed(1) + " kN", "-"],
      ["Bracing Capacity", results.bracing_capacity.toFixed(0) + " kN", "-"],
      ["Overall Status", results.bracing_status, results.bracing_status],
    ],
  };

  const summaryTable: TableInput = {
    title: "Design Summary",
    headers: ["Check", "Utilisation", "Status"],
    rows: [
      [
        "Post Buckling",
        (results.post_util * 100).toFixed(1) + "%",
        results.post_status,
      ],
      [
        "Foundation Bearing",
        (results.bearing_util * 100).toFixed(1) + "%",
        results.bearing_status,
      ],
      ["Bracing", "-", results.bracing_status],
      ["OVERALL DESIGN", "Critical: " + results.critical_check, results.status],
    ],
  };

  const notesContent = [
    "1. Design in accordance with BS 5975:2019 for temporary works procedures.",
    '2. Post buckling capacity calculated per EN 1993-1-1, using buckling curve "a" for CHS sections.',
    "3. Load factors: 1.35 for permanent actions, 1.50 for variable actions.",
    "4. Effective length factor (k) based on system type and end restraint conditions.",
    "5. Ground bearing allowable pressure reduced by safety factor of " +
      form.sf_bearing +
      ".",
    "6. A Temporary Works Coordinator (TWC) must review this design.",
    "7. All dimensions and loads to be verified on site before erection.",
    "8. Check for any local obstructions, services, or access requirements.",
  ];

  if (warnings.length > 0) {
    notesContent.push("", "DESIGN WARNINGS:");
    warnings.forEach((w) => notesContent.push("• " + w));
  }

  return {
    title: "Falsework Design Report",
    subtitle: "BS 5975 Temporary Works Assessment",
    projectInfo: {
      "Project Name": projectInfo.projectName || form.projectName,
      Reference: form.reference,
      Client: projectInfo.clientName,
      "Prepared By": projectInfo.preparedBy,
      Date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      "System Type": SYSTEM_TYPES[form.system_type]?.name || form.system_type,
      "Post Section":
        POST_SECTIONS[form.post_section]?.name || form.post_section,
      "Total Height":
        (parseFloat(form.post_height) * parseInt(form.tier_count)).toFixed(2) +
        " m",
      "Number of Posts": results.num_posts.toString(),
      "Critical Check": results.critical_check,
      "Design Status": results.status,
      Rating: results.rating,
    },
    tables: [
      geometryTable,
      loadingTable,
      materialsTable,
      loadSummaryTable,
      bucklingTable,
      foundationTable,
      bracingTable,
      summaryTable,
    ],
    notes: notesContent,
    footer: {
      preparedBy: projectInfo.preparedBy,
      reviewedBy: "TWC Review Required",
      approvedBy: "",
    },
  };
}
