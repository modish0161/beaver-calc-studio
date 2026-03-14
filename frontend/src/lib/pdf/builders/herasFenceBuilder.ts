// =============================================================================
// Heras Fence Report Builder
// Heras Fence Wind Stability — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface HerasFenceFormData {
  fenceType: string;
  numberOfPanels: number;
  ballastType: string;
  ballastPerFoot: number;
  exposure: string;
  designWindSpeed: number;
  groundCondition: string;
  additionalCladding: boolean;
  claddingPercentage: number;
  sfOverturning: number;
  sfSliding: number;
}

export interface HerasFenceResults {
  status: string;
  maxUtilisation: number;
  criticalCheck: string;
  windPressure: number;
  windForce: number;
  overturningMoment: number;
  resistingMoment: number;
  overturningFOS: number;
  slidingForce: number;
  resistingSlidingForce: number;
  slidingFOS: number;
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

export function buildHerasFenceReport(
  form: HerasFenceFormData,
  results: HerasFenceResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const configTable: TableInput = {
    title: "Fence Configuration",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Fence Type", form.fenceType || "-", "-"],
      ["Number of Panels", String(form.numberOfPanels || 0), "-"],
      ["Ballast Type", form.ballastType || "-", "-"],
      ["Ballast Per Foot", String(form.ballastPerFoot || 0), "kg"],
      ["Ground Condition", form.groundCondition || "-", "-"],
      ["Additional Cladding", form.additionalCladding ? "Yes" : "No", "-"],
      ["Cladding Percentage", `${form.claddingPercentage || 0}`, "%"],
    ],
  };

  const windTable: TableInput = {
    title: "Wind Loading",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Design Wind Speed", String(form.designWindSpeed || 0), "m/s"],
      ["Exposure", form.exposure || "-", "-"],
      ["Wind Pressure", `${(results.windPressure || 0).toFixed(2)}`, "kN/m²"],
      [
        "Wind Force (per panel)",
        `${(results.windForce || 0).toFixed(2)}`,
        "kN",
      ],
    ],
  };

  const resultsTable: TableInput = {
    title: "Stability Results",
    headers: ["Check", "Applied", "Resisting", "FOS", "Required FOS", "Status"],
    rows: [
      [
        "Overturning",
        `${(results.overturningMoment || 0).toFixed(2)} kNm`,
        `${(results.resistingMoment || 0).toFixed(2)} kNm`,
        `${(results.overturningFOS || 0).toFixed(2)}`,
        String(form.sfOverturning || 1.5),
        (results.overturningFOS || 0) >= (form.sfOverturning || 1.5)
          ? "PASS"
          : "FAIL",
      ],
      [
        "Sliding",
        `${(results.slidingForce || 0).toFixed(2)} kN`,
        `${(results.resistingSlidingForce || 0).toFixed(2)} kN`,
        `${(results.slidingFOS || 0).toFixed(2)}`,
        String(form.sfSliding || 1.5),
        (results.slidingFOS || 0) >= (form.sfSliding || 1.5) ? "PASS" : "FAIL",
      ],
    ],
  };

  return {
    title: "Heras Fence Stability",
    subtitle: "Temporary Fencing Wind Stability Check",
    standard: "BS EN 1991-1-4 & BS EN 12811-1",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalCheck || "Overturning",
      utilisation: results.maxUtilisation || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis checks the stability of temporary Heras-type security fencing against wind loading. Overturning and sliding safety factors are verified considering ballast weight, fence area, cladding, and site exposure.",
      },
      { title: "Fence Configuration", table: configTable },
      { title: "Wind Loading", table: windTable },
      { title: "Stability Results", table: resultsTable },
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

export default buildHerasFenceReport;
