// =============================================================================
// Timber Quantity Report Builder
// Board / Baulk Material Take-Off — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface TimberQuantityFormData {
  application: string;
  areaLength: number;
  areaWidth: number;
  boardLength: number;
  boardWidth: number;
  boardThickness: number;
  spacing: number;
  orientation: string;
  wastageFactor: number;
  boardsPerPack: number;
  costPerCubicMetre: number;
  projectName: string;
  reference: string;
}

export interface TimberQuantityResults {
  coverArea: number;
  boardCoverWidth: number;
  numberOfBoards: number;
  boardsWithWastage: number;
  totalLength: number;
  volumeCubicMetres: number;
  numberOfPacks: number;
  totalCost: number;
  status: string;
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

export function buildTimberQuantityReport(
  form: TimberQuantityFormData,
  results: TimberQuantityResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const areaTable: TableInput = {
    title: "Coverage Area",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Application", form.application || "-", "-"],
      ["Area Length", String(form.areaLength || 0), "m"],
      ["Area Width", String(form.areaWidth || 0), "m"],
      ["Orientation", form.orientation || "-", "-"],
      ["Spacing", String(form.spacing || 0), "mm"],
    ],
  };

  const boardTable: TableInput = {
    title: "Board Specification",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Board Length", String(form.boardLength || 0), "mm"],
      ["Board Width", String(form.boardWidth || 0), "mm"],
      ["Board Thickness", String(form.boardThickness || 0), "mm"],
      [
        "Wastage Factor",
        `${((form.wastageFactor || 0) * 100).toFixed(0)}%`,
        "-",
      ],
      ["Boards Per Pack", String(form.boardsPerPack || 0), "-"],
      ["Cost Per m³", `£${(form.costPerCubicMetre || 0).toFixed(2)}`, "-"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Quantity Results",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Cover Area", `${(results.coverArea || 0).toFixed(1)}`, "m²"],
      ["Number of Boards (net)", String(results.numberOfBoards || 0), "-"],
      ["Boards incl. Wastage", String(results.boardsWithWastage || 0), "-"],
      ["Total Board Length", `${(results.totalLength || 0).toFixed(1)}`, "m"],
      ["Volume", `${(results.volumeCubicMetres || 0).toFixed(3)}`, "m³"],
      ["Number of Packs", String(results.numberOfPacks || 0), "-"],
      ["Total Cost", `£${(results.totalCost || 0).toFixed(2)}`, "-"],
    ],
  };

  return {
    title: "Timber Quantity",
    subtitle: "Board / Baulk Material Take-Off",
    standard: "General Specification",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: "Quantity",
      utilisation: 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This schedule calculates the number of timber boards or baulks required for the specified coverage area, including a wastage allowance, pack quantities, and cost estimate.",
      },
      { title: "Coverage Area", table: areaTable },
      { title: "Board Specification", table: boardTable },
      { title: "Quantity Results", table: resultsTable },
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

export default buildTimberQuantityReport;
