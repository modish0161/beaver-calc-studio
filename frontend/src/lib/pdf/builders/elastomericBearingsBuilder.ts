// =============================================================================
// Elastomeric Bearings Report Builder
// Bridge Elastomeric Bearing Design — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface ElastomericBearingsFormData {
  shape: string;
  planArea: number;
  length: number;
  width: number;
  diameter: number;
  topPlateThickness: number;
  bottomPlateThickness: number;
  designVerticalLoad: number;
  designShearLoad: number;
  serviceTemperature: number;
  temperatureRange: number;
  shapeFactorMin: number;
  shapeFactorMax: number;
  strainLimit: number;
  compressionStressLimit: number;
  elastomerLayers: {
    thickness_mm: number;
    shear_modulus_mpa: number;
    bulk_modulus_mpa: number;
  }[];
  steelShims: {
    number_of_shims: number;
    shim_thickness_mm: number;
    shim_modulus_mpa: number;
  };
}

export interface ElastomericBearingsResults {
  status: string;
  maxUtilisation: number;
  criticalCheck: string;
  shapeFactor: number;
  compressiveStrain: number;
  shearStrain: number;
  rotationStrain: number;
  totalStrain: number;
  compressiveStress: number;
  stabilityFactor: number;
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

export function buildElastomericBearingsReport(
  form: ElastomericBearingsFormData,
  results: ElastomericBearingsResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const geometryTable: TableInput = {
    title: "Bearing Geometry",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Shape", form.shape || "-", "-"],
      ["Plan Area", String(form.planArea || 0), "mm²"],
      ["Length", String(form.length || 0), "mm"],
      ["Width", String(form.width || 0), "mm"],
      ["Top Plate Thickness", String(form.topPlateThickness || 0), "mm"],
      ["Bottom Plate Thickness", String(form.bottomPlateThickness || 0), "mm"],
      ["Elastomer Layers", String((form.elastomerLayers || []).length), "-"],
      ["Steel Shims", String(form.steelShims?.number_of_shims || 0), "-"],
    ],
  };

  const loadingTable: TableInput = {
    title: "Design Loading",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Vertical Load", String(form.designVerticalLoad || 0), "kN"],
      ["Shear Load", String(form.designShearLoad || 0), "kN"],
      ["Service Temperature", String(form.serviceTemperature || 0), "°C"],
      ["Temperature Range", String(form.temperatureRange || 0), "°C"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Design Results",
    headers: ["Check", "Value", "Limit", "Status"],
    rows: [
      [
        "Shape Factor",
        `${(results.shapeFactor || 0).toFixed(2)}`,
        `${form.shapeFactorMin || 0} – ${form.shapeFactorMax || 0}`,
        (results.shapeFactor || 0) >= (form.shapeFactorMin || 0)
          ? "PASS"
          : "FAIL",
      ],
      [
        "Compressive Stress",
        `${(results.compressiveStress || 0).toFixed(1)} MPa`,
        `${form.compressionStressLimit || 0} MPa`,
        (results.compressiveStress || 0) <= (form.compressionStressLimit || 0)
          ? "PASS"
          : "FAIL",
      ],
      [
        "Total Strain",
        `${(results.totalStrain || 0).toFixed(3)}`,
        `${form.strainLimit || 0}`,
        (results.totalStrain || 0) <= (form.strainLimit || 0) ? "PASS" : "FAIL",
      ],
      [
        "Stability Factor",
        `${(results.stabilityFactor || 0).toFixed(2)}`,
        "≥ 1.0",
        (results.stabilityFactor || 0) >= 1.0 ? "PASS" : "FAIL",
      ],
    ],
  };

  return {
    title: "Elastomeric Bearing Design",
    subtitle: "Laminated Elastomeric Bearing Check",
    standard: "BS EN 1337-3",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalCheck || "Total Strain",
      utilisation: results.maxUtilisation || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis checks laminated elastomeric bearing pads to EN 1337-3. Shape factor, compressive strain, shear strain, rotation strain, total strain, and stability are verified against codified limits.",
      },
      { title: "Bearing Geometry", table: geometryTable },
      { title: "Design Loading", table: loadingTable },
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

export default buildElastomericBearingsReport;
