// =============================================================================
// Batters Report Builder
// Slope / Earthworks Batter Calculations — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface BattersFormData {
  slopeHeight: number;
  horizontalRun: number;
  inputMethod: string;
  batterRatioH: number;
  batterRatioV: number;
  slopeAngle: number;
  embankmentLength: number;
  topWidth: number;
  operationType: string;
  soilType: string;
  projectName: string;
  reference: string;
}

export interface BattersResults {
  angle: number;
  ratioH: number;
  ratioV: number;
  horizontalSetback: number;
  slopeLength: number;
  crossSectionArea: number;
  volume: number;
  safeAngle: number;
  status: string;
  maxUtil: number;
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

export function buildBattersReport(
  form: BattersFormData,
  results: BattersResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const geometryTable: TableInput = {
    title: "Batter Geometry",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Slope Height", String(form.slopeHeight || 0), "m"],
      ["Horizontal Run", String(form.horizontalRun || 0), "m"],
      ["Embankment Length", String(form.embankmentLength || 0), "m"],
      ["Top Width", String(form.topWidth || 0), "m"],
      ["Operation Type", form.operationType || "-", "-"],
      ["Soil Type", form.soilType || "-", "-"],
      ["Input Method", form.inputMethod || "-", "-"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Calculation Results",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Slope Angle", `${(results.angle || 0).toFixed(1)}`, "°"],
      [
        "Batter Ratio (H:V)",
        `${(results.ratioH || 0).toFixed(2)} : ${(results.ratioV || 0).toFixed(2)}`,
        "-",
      ],
      [
        "Horizontal Setback",
        `${(results.horizontalSetback || 0).toFixed(2)}`,
        "m",
      ],
      ["Slope Length", `${(results.slopeLength || 0).toFixed(2)}`, "m"],
      [
        "Cross-Section Area",
        `${(results.crossSectionArea || 0).toFixed(2)}`,
        "m²",
      ],
      ["Volume", `${(results.volume || 0).toFixed(1)}`, "m³"],
      ["Safe Angle", `${(results.safeAngle || 0).toFixed(1)}`, "°"],
    ],
  };

  return {
    title: "Batter Calculations",
    subtitle: "Slope / Earthworks Analysis",
    standard: "BS 6031 & Eurocode 7",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: "Slope Angle",
      utilisation: results.maxUtil || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This calculation determines earthworks batter geometry including slope angles, setbacks, and cut/fill volumes. The safe angle assessment considers soil type and slope height in accordance with BS 6031.",
      },
      { title: "Batter Geometry", table: geometryTable },
      { title: "Calculation Results", table: resultsTable },
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

export default buildBattersReport;
