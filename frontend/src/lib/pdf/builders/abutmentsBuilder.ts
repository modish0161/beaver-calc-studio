// =============================================================================
// Abutments Report Builder
// Bridge Abutment Design — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface AbutmentsFormData {
  bridgeType: string;
  spanLength: number;
  abutmentHeight: number;
  abutmentWidth: number;
  foundationType: string;
  soilType: string;
  bearingCapacity: number;
  concreteGrade: string;
  reinforcementGrade: string;
  includeWindLoads: boolean;
  includeEarthquakeLoads: boolean;
  includeTemperatureEffects: boolean;
  backfillHeight: number;
  backfillDensity: number;
  waterTableDepth: number;
  surchargePressure: number;
  seismicCoefficient: number;
  exposureClass: string;
  loadCases: {
    name: string;
    dead_load: number;
    live_load: number;
    wind_load: number;
    earthquake_load: number;
    temperature_load: number;
    braking_force: number;
  }[];
}

export interface AbutmentsResults {
  status: string;
  maxUtilisation: number;
  criticalCheck: string;
  slidingUtil: number;
  overturningUtil: number;
  bearingUtil: number;
  stemBendingUtil: number;
  stemShearUtil: number;
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

export function buildAbutmentsReport(
  form: AbutmentsFormData,
  results: AbutmentsResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const geometryTable: TableInput = {
    title: "Abutment Geometry",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Bridge Type", form.bridgeType || "-", "-"],
      ["Span Length", String(form.spanLength || 0), "m"],
      ["Abutment Height", String(form.abutmentHeight || 0), "m"],
      ["Abutment Width", String(form.abutmentWidth || 0), "m"],
      ["Foundation Type", form.foundationType || "-", "-"],
      ["Backfill Height", String(form.backfillHeight || 0), "m"],
      ["Backfill Density", String(form.backfillDensity || 0), "kN/m³"],
      ["Water Table Depth", String(form.waterTableDepth || 0), "m"],
    ],
  };

  const materialsTable: TableInput = {
    title: "Materials",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Concrete Grade", form.concreteGrade || "-", "-"],
      ["Reinforcement Grade", form.reinforcementGrade || "-", "-"],
      ["Soil Type", form.soilType || "-", "-"],
      ["Bearing Capacity", String(form.bearingCapacity || 0), "kPa"],
      ["Exposure Class", form.exposureClass || "-", "-"],
    ],
  };

  const loadingTable: TableInput = {
    title: "Loading",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Surcharge Pressure", String(form.surchargePressure || 0), "kPa"],
      ["Seismic Coefficient", String(form.seismicCoefficient || 0), "-"],
      ["Wind Loads Included", form.includeWindLoads ? "Yes" : "No", "-"],
      [
        "Earthquake Loads Included",
        form.includeEarthquakeLoads ? "Yes" : "No",
        "-",
      ],
      [
        "Temperature Effects Included",
        form.includeTemperatureEffects ? "Yes" : "No",
        "-",
      ],
    ],
  };

  const resultsTable: TableInput = {
    title: "Design Results",
    headers: ["Check", "Utilisation", "Status"],
    rows: [
      [
        "Sliding Stability",
        `${((results.slidingUtil || 0) * 100).toFixed(1)}%`,
        (results.slidingUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Overturning Stability",
        `${((results.overturningUtil || 0) * 100).toFixed(1)}%`,
        (results.overturningUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Bearing Pressure",
        `${((results.bearingUtil || 0) * 100).toFixed(1)}%`,
        (results.bearingUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Stem Bending",
        `${((results.stemBendingUtil || 0) * 100).toFixed(1)}%`,
        (results.stemBendingUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Stem Shear",
        `${((results.stemShearUtil || 0) * 100).toFixed(1)}%`,
        (results.stemShearUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
    ],
  };

  return {
    title: "Bridge Abutment Design",
    subtitle: "Abutment Stability & Structural Analysis",
    standard: "BS EN 1997-1 & BS EN 1992-1-1",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalCheck || "Bearing Pressure",
      utilisation: results.maxUtilisation || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis assesses bridge abutment stability against sliding, overturning, and bearing pressure, plus structural adequacy of the wall stem to EN 1997-1 and EN 1992-1-1. Earth pressures are calculated using Rankine/Coulomb theory with appropriate partial factors.",
      },
      { title: "Abutment Geometry", table: geometryTable },
      { title: "Materials", table: materialsTable },
      { title: "Loading", table: loadingTable },
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

export default buildAbutmentsReport;
