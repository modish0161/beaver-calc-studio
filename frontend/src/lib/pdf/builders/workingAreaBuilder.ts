// =============================================================================
// Working Area Report Builder
// Equipment Space Requirements — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface WorkingAreaFormData {
  equipmentType: string;
  operationRadius: number;
  tailSwing: number;
  safetyBuffer: number;
  pedestrianBuffer: number;
  materialStorage: number;
  accessWidth: number;
  siteLength: number;
  siteWidth: number;
  existingObstacles: number;
  workingHeight: number;
  groundCondition: string;
}

export interface WorkingAreaResults {
  overallStatus: string;
  minWorkingArea: number;
  exclusionZoneRadius: number;
  exclusionZoneArea: number;
  totalRequiredArea: number;
  availableSiteArea: number;
  areaUtilisation: number;
  clearanceZone: number;
  overheadClearance: number;
  accessRouteArea: number;
  storageArea: number;
  warnings: string[];
  recommendations: string[];
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

export function buildWorkingAreaReport(
  form: WorkingAreaFormData,
  results: WorkingAreaResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const equipmentTable: TableInput = {
    title: "Equipment & Buffers",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Equipment Type", form.equipmentType || "-", "-"],
      ["Operation Radius", String(form.operationRadius || 0), "m"],
      ["Tail Swing", String(form.tailSwing || 0), "m"],
      ["Safety Buffer", String(form.safetyBuffer || 0), "m"],
      ["Pedestrian Buffer", String(form.pedestrianBuffer || 0), "m"],
      ["Material Storage", String(form.materialStorage || 0), "m²"],
      ["Access Width", String(form.accessWidth || 0), "m"],
      ["Working Height", String(form.workingHeight || 0), "m"],
      ["Ground Condition", form.groundCondition || "-", "-"],
    ],
  };

  const siteTable: TableInput = {
    title: "Site Dimensions",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Site Length", String(form.siteLength || 0), "m"],
      ["Site Width", String(form.siteWidth || 0), "m"],
      ["Existing Obstacles", String(form.existingObstacles || 0), "-"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Working Area Results",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Min Working Area", `${(results.minWorkingArea || 0).toFixed(1)}`, "m²"],
      [
        "Exclusion Zone Radius",
        `${(results.exclusionZoneRadius || 0).toFixed(1)}`,
        "m",
      ],
      [
        "Exclusion Zone Area",
        `${(results.exclusionZoneArea || 0).toFixed(1)}`,
        "m²",
      ],
      [
        "Access Route Area",
        `${(results.accessRouteArea || 0).toFixed(1)}`,
        "m²",
      ],
      ["Storage Area", `${(results.storageArea || 0).toFixed(1)}`, "m²"],
      [
        "Total Required Area",
        `${(results.totalRequiredArea || 0).toFixed(1)}`,
        "m²",
      ],
      [
        "Available Site Area",
        `${(results.availableSiteArea || 0).toFixed(1)}`,
        "m²",
      ],
      [
        "Area Utilisation",
        `${((results.areaUtilisation || 0) * 100).toFixed(1)}%`,
        "-",
      ],
      [
        "Overhead Clearance",
        `${(results.overheadClearance || 0).toFixed(1)}`,
        "m",
      ],
    ],
  };

  return {
    title: "Working Area Assessment",
    subtitle: "Equipment Space & Exclusion Zone Requirements",
    standard: "BS 7121 & CDM 2015",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.overallStatus || "PASS",
      critical: "Area Utilisation",
      utilisation: results.areaUtilisation || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This assessment determines the minimum working area required for the specified equipment, including exclusion zones, pedestrian buffers, access routes, and material storage. Area utilisation is checked against the available site dimensions.",
      },
      { title: "Equipment & Buffers", table: equipmentTable },
      { title: "Site Dimensions", table: siteTable },
      { title: "Working Area Results", table: resultsTable },
      {
        title: "Recommendations",
        items:
          (results.recommendations || []).length > 0
            ? results.recommendations
            : ["No specific recommendations"],
      },
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

export default buildWorkingAreaReport;
