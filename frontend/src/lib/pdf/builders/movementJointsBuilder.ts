// =============================================================================
// Movement Joints Report Builder
// Bridge Movement Joint Design — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface MovementJointsFormData {
  bridgeType: string;
  spanLength: number;
  deckWidth: number;
  jointLocation: string;
  minTemperature: number;
  maxTemperature: number;
  meanTemperature: number;
  thermalCoefficient: number;
  creepCoefficient: number;
  shrinkageStrain: number;
  jointType: string;
  numberOfGaps: number;
  jointDepth: number;
  seismicZone: string;
  seismicDisplacement: number;
  safetyFactor: number;
  serviceLife: number;
}

export interface MovementJointsResults {
  status: string;
  maxUtilisation: number;
  criticalCheck: string;
  thermalMovement: number;
  creepMovement: number;
  shrinkageMovement: number;
  totalMovement: number;
  jointCapacity: number;
  seismicMovement: number;
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

export function buildMovementJointsReport(
  form: MovementJointsFormData,
  results: MovementJointsResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const bridgeTable: TableInput = {
    title: "Bridge Configuration",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Bridge Type", form.bridgeType || "-", "-"],
      ["Span Length", String(form.spanLength || 0), "m"],
      ["Deck Width", String(form.deckWidth || 0), "m"],
      ["Joint Location", form.jointLocation || "-", "-"],
      ["Joint Type", form.jointType || "-", "-"],
      ["Number of Gaps", String(form.numberOfGaps || 0), "-"],
      ["Joint Depth", String(form.jointDepth || 0), "mm"],
    ],
  };

  const thermalTable: TableInput = {
    title: "Thermal & Time-Dependent Parameters",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Min Temperature", String(form.minTemperature || 0), "°C"],
      ["Max Temperature", String(form.maxTemperature || 0), "°C"],
      ["Mean Temperature", String(form.meanTemperature || 0), "°C"],
      ["Thermal Coefficient", String(form.thermalCoefficient || 0), "×10⁻⁶/°C"],
      ["Creep Coefficient", String(form.creepCoefficient || 0), "-"],
      ["Shrinkage Strain", String(form.shrinkageStrain || 0), "×10⁻⁶"],
      ["Service Life", String(form.serviceLife || 0), "years"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Movement Results",
    headers: ["Component", "Movement (mm)", "Notes"],
    rows: [
      [
        "Thermal Movement",
        `${(results.thermalMovement || 0).toFixed(1)}`,
        "Due to temperature range",
      ],
      [
        "Creep Movement",
        `${(results.creepMovement || 0).toFixed(1)}`,
        "Long-term creep",
      ],
      [
        "Shrinkage Movement",
        `${(results.shrinkageMovement || 0).toFixed(1)}`,
        "Drying shrinkage",
      ],
      [
        "Seismic Movement",
        `${(results.seismicMovement || 0).toFixed(1)}`,
        form.seismicZone || "-",
      ],
      [
        "Total Movement",
        `${(results.totalMovement || 0).toFixed(1)}`,
        "Factored total",
      ],
      [
        "Joint Capacity",
        `${(results.jointCapacity || 0).toFixed(1)}`,
        "Available joint movement",
      ],
    ],
  };

  return {
    title: "Movement Joint Design",
    subtitle: "Bridge Expansion Joint Movement Assessment",
    standard: "BS EN 1991-1-5 & BS EN 1337",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalCheck || "Total Movement",
      utilisation: results.maxUtilisation || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis calculates the total movement at bridge expansion joints considering thermal effects (EN 1991-1-5), creep, shrinkage, and seismic displacement. The total factored movement is compared against the selected joint capacity.",
      },
      { title: "Bridge Configuration", table: bridgeTable },
      { title: "Thermal & Time-Dependent Parameters", table: thermalTable },
      { title: "Movement Results", table: resultsTable },
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

export default buildMovementJointsReport;
