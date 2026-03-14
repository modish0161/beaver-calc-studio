// =============================================================================
// Notional Wind Report Builder
// Temporary Works Wind Check — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface NotionalWindFormData {
  structureType: string;
  height: number;
  width: number;
  depth: number;
  windSpeed: number;
  terrain: string;
  exposure: string;
  structuralCapacity: number;
  shieldingFactor: number;
  projectName: string;
  reference: string;
}

export interface NotionalWindResults {
  vb: number;
  qp: number;
  Cf: number;
  Aref: number;
  Fw: number;
  overturningMoment: number;
  resistingMoment: number;
  forceUtil: number;
  momentUtil: number;
  maxUtil: number;
  status: string;
  criticalCheck: string;
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

export function buildNotionalWindReport(
  form: NotionalWindFormData,
  results: NotionalWindResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const structureTable: TableInput = {
    title: "Structure Dimensions",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Structure Type", form.structureType || "-", "-"],
      ["Height", String(form.height || 0), "m"],
      ["Width", String(form.width || 0), "m"],
      ["Depth", String(form.depth || 0), "m"],
      ["Structural Capacity", String(form.structuralCapacity || 0), "kN"],
    ],
  };

  const windTable: TableInput = {
    title: "Wind Parameters",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Basic Wind Speed (vb)", `${(results.vb || 0).toFixed(1)}`, "m/s"],
      [
        "Peak Velocity Pressure (qp)",
        `${(results.qp || 0).toFixed(3)}`,
        "kN/m²",
      ],
      ["Force Coefficient (Cf)", `${(results.Cf || 0).toFixed(2)}`, "-"],
      ["Reference Area (Aref)", `${(results.Aref || 0).toFixed(1)}`, "m²"],
      ["Terrain", form.terrain || "-", "-"],
      ["Exposure", form.exposure || "-", "-"],
      ["Shielding Factor", String(form.shieldingFactor || 1.0), "-"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Design Results",
    headers: ["Check", "Value", "Utilisation", "Status"],
    rows: [
      [
        "Wind Force (Fw)",
        `${(results.Fw || 0).toFixed(2)} kN`,
        `${((results.forceUtil || 0) * 100).toFixed(1)}%`,
        (results.forceUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Overturning Moment",
        `${(results.overturningMoment || 0).toFixed(2)} kNm`,
        `${((results.momentUtil || 0) * 100).toFixed(1)}%`,
        (results.momentUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
    ],
  };

  return {
    title: "Notional Wind Check",
    subtitle: "Temporary Works Wind Force Assessment",
    standard: "BS EN 1991-1-4 (Temporary Works)",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalCheck || "Wind Force",
      utilisation: results.maxUtil || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "Quick notional wind check for temporary works structures to EN 1991-1-4. Calculates peak velocity pressure, wind force, and overturning moment for the specified structure geometry and site exposure.",
      },
      { title: "Structure Dimensions", table: structureTable },
      { title: "Wind Parameters", table: windTable },
      { title: "Design Results", table: resultsTable },
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

export default buildNotionalWindReport;
