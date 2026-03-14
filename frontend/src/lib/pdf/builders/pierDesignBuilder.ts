// =============================================================================
// Pier Design Report Builder
// Bridge Pier Design — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface PierDesignFormData {
  pierType: string;
  height: number;
  width: number;
  thickness: number;
  foundationDepth: number;
  exposure: string;
  concrete: string;
  steel: string;
  soil: string;
  pileCap: boolean;
  pileCount: number;
  pileDiameter: number;
  pileLength: number;
  waterDepth: number;
  scourDepth: number;
  windPressure: number;
  seismicCoeff: number;
  includeSeismic: boolean;
  loadCases: {
    name: string;
    vertical: number;
    horizontal: number;
    torsion: number;
    temperature: number;
    seismic: number;
  }[];
}

export interface PierDesignResults {
  status: string;
  maxUtilisation: number;
  criticalCheck: string;
  bendingUtil: number;
  shearUtil: number;
  bearingUtil: number;
  stabilityUtil: number;
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

export function buildPierDesignReport(
  form: PierDesignFormData,
  results: PierDesignResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const geometryTable: TableInput = {
    title: "Pier Geometry",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Pier Type", form.pierType || "-", "-"],
      ["Height", String(form.height || 0), "m"],
      ["Width", String(form.width || 0), "m"],
      ["Thickness", String(form.thickness || 0), "m"],
      ["Foundation Depth", String(form.foundationDepth || 0), "m"],
      ["Water Depth", String(form.waterDepth || 0), "m"],
      ["Scour Depth", String(form.scourDepth || 0), "m"],
    ],
  };

  const materialsTable: TableInput = {
    title: "Materials & Foundation",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Concrete", form.concrete || "-", "-"],
      ["Steel", form.steel || "-", "-"],
      ["Soil Type", form.soil || "-", "-"],
      ["Exposure", form.exposure || "-", "-"],
      ["Pile Cap", form.pileCap ? "Yes" : "No", "-"],
      ["Pile Count", String(form.pileCount || 0), "-"],
      ["Pile Diameter", String(form.pileDiameter || 0), "mm"],
      ["Pile Length", String(form.pileLength || 0), "m"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Design Results",
    headers: ["Check", "Utilisation", "Status"],
    rows: [
      [
        "Bending",
        `${((results.bendingUtil || 0) * 100).toFixed(1)}%`,
        (results.bendingUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Shear",
        `${((results.shearUtil || 0) * 100).toFixed(1)}%`,
        (results.shearUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Bearing",
        `${((results.bearingUtil || 0) * 100).toFixed(1)}%`,
        (results.bearingUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Stability",
        `${((results.stabilityUtil || 0) * 100).toFixed(1)}%`,
        (results.stabilityUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
    ],
  };

  return {
    title: "Bridge Pier Design",
    subtitle: "Pier Structural & Geotechnical Assessment",
    standard: "BS EN 1992-1-1 & BS EN 1997-1",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalCheck || "Bending",
      utilisation: results.maxUtilisation || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis checks a bridge pier for bending, shear, bearing, and stability under the specified load combinations. Scour and water pressure effects are included where applicable. Foundation design considers pile capacity or spread footing bearing.",
      },
      { title: "Pier Geometry", table: geometryTable },
      { title: "Materials & Foundation", table: materialsTable },
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

export default buildPierDesignReport;
