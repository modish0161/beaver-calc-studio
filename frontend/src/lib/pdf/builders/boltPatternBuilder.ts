// =============================================================================
// Bolt Pattern Report Builder
// Bolt Group Analysis — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface BoltPatternFormData {
  pattern_type: string;
  num_bolts_x: number;
  num_bolts_y: number;
  pitch: number;
  gauge: number;
  edge_x1: number;
  edge_x2: number;
  edge_y1: number;
  edge_y2: number;
  bolt_diameter: number;
  hole_diameter: number;
  applied_shear: number;
  applied_moment: number;
  projectName: string;
  reference: string;
}

export interface BoltPatternResults {
  total_bolts: number;
  pattern_width: number;
  pattern_height: number;
  plate_width: number;
  plate_height: number;
  centroid_x: number;
  centroid_y: number;
  Ix: number;
  Iy: number;
  Ip: number;
  r_max: number;
  r_min: number;
  max_shear_direct: number;
  max_shear_torsion: number;
  max_shear_total: number;
  status: string;
  classification: string;
}

interface Warning {
  type: "error" | "warning" | "info";
  message: string;
}
interface ProjectInfo {
  projectName: string;
  clientName: string;
  preparedBy: string;
}

export function buildBoltPatternReport(
  form: BoltPatternFormData,
  results: BoltPatternResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const patternTable: TableInput = {
    title: "Bolt Pattern",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Pattern Type", form.pattern_type || "-", "-"],
      ["Bolts in X", String(form.num_bolts_x || 0), "-"],
      ["Bolts in Y", String(form.num_bolts_y || 0), "-"],
      ["Pitch", String(form.pitch || 0), "mm"],
      ["Gauge", String(form.gauge || 0), "mm"],
      ["Bolt Diameter", String(form.bolt_diameter || 0), "mm"],
      ["Hole Diameter", String(form.hole_diameter || 0), "mm"],
    ],
  };

  const loadingTable: TableInput = {
    title: "Applied Loading",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Applied Shear", String(form.applied_shear || 0), "kN"],
      ["Applied Moment", String(form.applied_moment || 0), "kNm"],
    ],
  };

  const groupPropsTable: TableInput = {
    title: "Bolt Group Properties",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Total Bolts", String(results.total_bolts || 0), "-"],
      ["Pattern Width", `${(results.pattern_width || 0).toFixed(1)}`, "mm"],
      ["Pattern Height", `${(results.pattern_height || 0).toFixed(1)}`, "mm"],
      ["Centroid X", `${(results.centroid_x || 0).toFixed(1)}`, "mm"],
      ["Centroid Y", `${(results.centroid_y || 0).toFixed(1)}`, "mm"],
      ["Polar Moment Ip", `${(results.Ip || 0).toFixed(0)}`, "mm⁴"],
      ["Max Radius r_max", `${(results.r_max || 0).toFixed(1)}`, "mm"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Force Analysis",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      [
        "Direct Shear (max bolt)",
        `${(results.max_shear_direct || 0).toFixed(2)}`,
        "kN",
      ],
      [
        "Torsion Shear (max bolt)",
        `${(results.max_shear_torsion || 0).toFixed(2)}`,
        "kN",
      ],
      [
        "Total Shear (max bolt)",
        `${(results.max_shear_total || 0).toFixed(2)}`,
        "kN",
      ],
      ["Classification", results.classification || "-", "-"],
    ],
  };

  return {
    title: "Bolt Pattern Analysis",
    subtitle: "Bolt Group Shear & Torsion Distribution",
    standard: "BS EN 1993-1-8",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: "Combined Bolt Shear",
      utilisation: 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis determines the force distribution in a bolt group subjected to direct shear and in-plane moment. The elastic method is used to calculate individual bolt forces, considering the polar moment of the bolt group about its centroid.",
      },
      { title: "Bolt Pattern", table: patternTable },
      { title: "Applied Loading", table: loadingTable },
      { title: "Bolt Group Properties", table: groupPropsTable },
      { title: "Force Analysis", table: resultsTable },
      {
        title: "Design Notes",
        items:
          warnings.length > 0
            ? warnings.map((w) => `[${w.type.toUpperCase()}] ${w.message}`)
            : ["No warnings generated"],
      },
    ],
    footer: {
      company: "BeaverCalc Studio",
      disclaimer:
        "This calculation is for professional use only. The engineer must verify all inputs and assumptions.",
    },
  } as unknown as ReportData;
}

export default buildBoltPatternReport;
