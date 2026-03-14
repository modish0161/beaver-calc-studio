// =============================================================================
// Bog Mats Report Builder
// Ground Mats Structural Check — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface BogMatsFormData {
  machineType: string;
  grossWeight: number;
  trackLength: number;
  trackWidth: number;
  numberOfTracks: number;
  groundType: string;
  groundBearing: number;
  groundCBR: number;
  matType: string;
  matLength: number;
  matWidth: number;
  matThickness: number;
  matMaterial: string;
  layerCount: number;
  orientation: string;
  projectTitle: string;
  reference: string;
}

export interface BogMatsResults {
  trackContactPressure: number;
  matContactPressure: number;
  effectiveArea: number;
  pressureAtGround: number;
  allowableBearing: number;
  bearingUtilisation: number;
  bearingStatus: string;
  bendingStress: number;
  allowableBending: number;
  bendingUtilisation: number;
  bendingStatus: string;
  overallStatus: string;
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

export function buildBogMatsReport(
  form: BogMatsFormData,
  results: BogMatsResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const machineTable: TableInput = {
    title: "Machine Data",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Machine Type", form.machineType || "-", "-"],
      ["Gross Weight", String(form.grossWeight || 0), "kN"],
      ["Track Length", String(form.trackLength || 0), "mm"],
      ["Track Width", String(form.trackWidth || 0), "mm"],
      ["Number of Tracks", String(form.numberOfTracks || 0), "-"],
    ],
  };

  const matTable: TableInput = {
    title: "Mat Properties",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Mat Type", form.matType || "-", "-"],
      ["Mat Material", form.matMaterial || "-", "-"],
      ["Mat Length", String(form.matLength || 0), "mm"],
      ["Mat Width", String(form.matWidth || 0), "mm"],
      ["Mat Thickness", String(form.matThickness || 0), "mm"],
      ["Layer Count", String(form.layerCount || 1), "-"],
      ["Orientation", form.orientation || "-", "-"],
    ],
  };

  const groundTable: TableInput = {
    title: "Ground Conditions",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Ground Type", form.groundType || "-", "-"],
      ["Ground Bearing Capacity", String(form.groundBearing || 0), "kPa"],
      ["Ground CBR", String(form.groundCBR || 0), "%"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Design Results",
    headers: ["Check", "Applied", "Allowable", "Utilisation", "Status"],
    rows: [
      [
        "Bearing Pressure",
        `${(results.pressureAtGround || 0).toFixed(1)} kPa`,
        `${(results.allowableBearing || 0).toFixed(1)} kPa`,
        `${((results.bearingUtilisation || 0) * 100).toFixed(1)}%`,
        results.bearingStatus || "-",
      ],
      [
        "Bending Stress",
        `${(results.bendingStress || 0).toFixed(1)} MPa`,
        `${(results.allowableBending || 0).toFixed(1)} MPa`,
        `${((results.bendingUtilisation || 0) * 100).toFixed(1)}%`,
        results.bendingStatus || "-",
      ],
    ],
  };

  return {
    title: "Bog Mat / Ground Mat Design",
    subtitle: "Structural Check for Temporary Ground Protection",
    standard: "BS 6031 & BS EN 1995-1-1",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.overallStatus || "PASS",
      critical: "Bearing Pressure",
      utilisation: Math.max(
        results.bearingUtilisation || 0,
        results.bendingUtilisation || 0,
      ),
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis checks bog mats / ground mats for adequate load spread and structural capacity under plant loading. Bearing pressure at the ground surface and bending stress in the mat are assessed against allowable values.",
      },
      { title: "Machine Data", table: machineTable },
      { title: "Mat Properties", table: matTable },
      { title: "Ground Conditions", table: groundTable },
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

export default buildBogMatsReport;
