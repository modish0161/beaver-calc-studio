// =============================================================================
// Swept Path Report Builder
// Vehicle Turning Analysis — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface SweptPathFormData {
  vehicleType: string;
  vehicleLength: number;
  vehicleWidth: number;
  wheelbase: number;
  frontOverhang: number;
  rearOverhang: number;
  turningRadius: number;
  articulationAngle: number;
  roadWidth: number;
  cornerRadius: number;
  clearanceBuffer: number;
  speedLimit: number;
}

export interface SweptPathResults {
  overallStatus: string;
  innerSweptRadius: number;
  outerSweptRadius: number;
  sweptPathWidth: number;
  requiredRoadWidth: number;
  clearanceMargin: number;
  rearSwing: number;
  frontSwing: number;
  trackingDifference: number;
  minCornerRadius: number;
  speedReduction: number;
  warnings: string[];
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

export function buildSweptPathReport(
  form: SweptPathFormData,
  results: SweptPathResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const vehicleTable: TableInput = {
    title: "Vehicle Dimensions",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Vehicle Type", form.vehicleType || "-", "-"],
      ["Vehicle Length", String(form.vehicleLength || 0), "m"],
      ["Vehicle Width", String(form.vehicleWidth || 0), "m"],
      ["Wheelbase", String(form.wheelbase || 0), "m"],
      ["Front Overhang", String(form.frontOverhang || 0), "m"],
      ["Rear Overhang", String(form.rearOverhang || 0), "m"],
      ["Turning Radius", String(form.turningRadius || 0), "m"],
      ["Articulation Angle", String(form.articulationAngle || 0), "°"],
    ],
  };

  const roadTable: TableInput = {
    title: "Road Geometry",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Road Width", String(form.roadWidth || 0), "m"],
      ["Corner Radius", String(form.cornerRadius || 0), "m"],
      ["Clearance Buffer", String(form.clearanceBuffer || 0), "m"],
      ["Speed Limit", String(form.speedLimit || 0), "km/h"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Swept Path Results",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      [
        "Inner Swept Radius",
        `${(results.innerSweptRadius || 0).toFixed(2)}`,
        "m",
      ],
      [
        "Outer Swept Radius",
        `${(results.outerSweptRadius || 0).toFixed(2)}`,
        "m",
      ],
      ["Swept Path Width", `${(results.sweptPathWidth || 0).toFixed(2)}`, "m"],
      [
        "Required Road Width",
        `${(results.requiredRoadWidth || 0).toFixed(2)}`,
        "m",
      ],
      ["Clearance Margin", `${(results.clearanceMargin || 0).toFixed(2)}`, "m"],
      ["Rear Swing", `${(results.rearSwing || 0).toFixed(2)}`, "m"],
      ["Front Swing", `${(results.frontSwing || 0).toFixed(2)}`, "m"],
      [
        "Tracking Difference",
        `${(results.trackingDifference || 0).toFixed(2)}`,
        "m",
      ],
      [
        "Min Corner Radius",
        `${(results.minCornerRadius || 0).toFixed(2)}`,
        "m",
      ],
    ],
  };

  return {
    title: "Swept Path Analysis",
    subtitle: "Vehicle Turning Clearance Assessment",
    standard: "DMRB TD 16 & Design Manual for Roads and Bridges",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.overallStatus || "PASS",
      critical: "Swept Path Width",
      utilisation: 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis determines the swept path envelope for a design vehicle negotiating a turn. The inner and outer swept radii, required road width, and clearance margins are calculated to verify that the road geometry accommodates the vehicle.",
      },
      { title: "Vehicle Dimensions", table: vehicleTable },
      { title: "Road Geometry", table: roadTable },
      { title: "Swept Path Results", table: resultsTable },
      {
        title: "Design Notes",
        items:
          warnings.length > 0
            ? warnings.map((w) => `[${w.type.toUpperCase()}] ${w.message}`)
            : (results.warnings || []).length > 0
              ? results.warnings
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

export default buildSweptPathReport;
