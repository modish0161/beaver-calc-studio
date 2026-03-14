// =============================================================================
// Erection Stages Report Builder
// Construction Erection Planning — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface ErectionStagesFormData {
  structureType: string;
  totalWeight: number;
  craneType: string;
  craneCapacity: number;
  projectName: string;
  reference: string;
  stages: {
    id: number;
    name: string;
    members: number;
    weight: number;
    craneRadius: number;
    liftHeight: number;
    duration: number;
    boltCount: number;
    notes: string;
  }[];
}

export interface ErectionStagesResults {
  totalStages: number;
  totalWeight: number;
  totalDuration: number;
  totalBolts: number;
  maxLiftWeight: number;
  maxRadius: number;
  maxHeight: number;
  craneCapacity: number;
  maxUtil: number;
  status: string;
  criticalStage: string;
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

export function buildErectionStagesReport(
  form: ErectionStagesFormData,
  results: ErectionStagesResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const configTable: TableInput = {
    title: "Erection Configuration",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Structure Type", form.structureType || "-", "-"],
      ["Total Weight", String(form.totalWeight || 0), "kN"],
      ["Crane Type", form.craneType || "-", "-"],
      ["Crane Capacity", String(form.craneCapacity || 0), "kN"],
    ],
  };

  const stageRows = (form.stages || []).map((s, i) => [
    String(i + 1),
    s.name || "-",
    String(s.weight || 0),
    String(s.craneRadius || 0),
    String(s.liftHeight || 0),
    String(s.duration || 0),
  ]);

  const stagesTable: TableInput = {
    title: "Erection Stages",
    headers: [
      "Stage",
      "Description",
      "Weight (kN)",
      "Radius (m)",
      "Height (m)",
      "Duration (hrs)",
    ],
    rows:
      stageRows.length > 0
        ? stageRows
        : [["—", "No stages defined", "-", "-", "-", "-"]],
  };

  const summaryTable: TableInput = {
    title: "Summary",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Total Stages", String(results.totalStages || 0), "-"],
      ["Total Duration", `${(results.totalDuration || 0).toFixed(1)}`, "hrs"],
      ["Total Bolts", String(results.totalBolts || 0), "-"],
      ["Max Lift Weight", `${(results.maxLiftWeight || 0).toFixed(1)}`, "kN"],
      ["Max Radius", `${(results.maxRadius || 0).toFixed(1)}`, "m"],
      ["Max Height", `${(results.maxHeight || 0).toFixed(1)}`, "m"],
      ["Max Utilisation", `${((results.maxUtil || 0) * 100).toFixed(1)}%`, "-"],
      ["Critical Stage", results.criticalStage || "-", "-"],
    ],
  };

  return {
    title: "Erection Stages",
    subtitle: "Construction Sequence & Crane Utilisation",
    standard: "BS 7121 & BS EN 1991-1-6",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalStage || "Crane Utilisation",
      utilisation: results.maxUtil || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This document records the planned erection sequence for the structure, including crane utilisation checks at each stage. Compliance with BS 7121 crane safety and EN 1991-1-6 construction loading is verified.",
      },
      { title: "Erection Configuration", table: configTable },
      { title: "Erection Stages", table: stagesTable },
      { title: "Summary", table: summaryTable },
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

export default buildErectionStagesReport;
