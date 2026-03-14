// =============================================================================
// Pile Capacity Report Builder
// EN 1997 Pile Capacity — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface PileCapacityFormData {
  pileType: string;
  pileDiameter: number;
  pileLength: number;
  appliedLoad: number;
  baseMethod: string;
  shaftMethod: string;
  designApproach: string;
  correlationFactor: number;
  modelFactor: number;
  soilLayers: {
    id: number;
    name: string;
    thickness: number;
    soilType: string;
    sptN: number;
    cptQc: number;
    cu: number;
    phi: number;
    gamma: number;
  }[];
}

export interface PileCapacityResults {
  baseResistance: number;
  shaftResistance: number;
  ultimateCapacity: number;
  characteristicCapacity: number;
  designCapacity: number;
  utilisationRatio: number;
  settlementEstimate: number;
  isPassing: boolean;
  layerContributions: {
    name: string;
    shaftContrib: number;
    baseContrib: number;
  }[];
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

export function buildPileCapacityReport(
  form: PileCapacityFormData,
  results: PileCapacityResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const pileTable: TableInput = {
    title: "Pile Configuration",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Pile Type", form.pileType || "-", "-"],
      ["Pile Diameter", String(form.pileDiameter || 0), "mm"],
      ["Pile Length", String(form.pileLength || 0), "m"],
      ["Applied Load", String(form.appliedLoad || 0), "kN"],
      ["Base Method", form.baseMethod || "-", "-"],
      ["Shaft Method", form.shaftMethod || "-", "-"],
      ["Design Approach", form.designApproach || "-", "-"],
      ["Correlation Factor", String(form.correlationFactor || 0), "-"],
      ["Model Factor", String(form.modelFactor || 0), "-"],
    ],
  };

  const soilRows = (form.soilLayers || []).map((l) => [
    l.name || "-",
    String(l.thickness || 0),
    l.soilType || "-",
    String(l.cu || "-"),
    String(l.phi || "-"),
    String(l.sptN || "-"),
  ]);

  const soilTable: TableInput = {
    title: "Soil Profile",
    headers: ["Layer", "Thickness (m)", "Type", "cu (kPa)", "φ (°)", "SPT N"],
    rows: soilRows.length > 0 ? soilRows : [["—", "-", "-", "-", "-", "-"]],
  };

  const resultsTable: TableInput = {
    title: "Capacity Results",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Base Resistance", `${(results.baseResistance || 0).toFixed(1)}`, "kN"],
      [
        "Shaft Resistance",
        `${(results.shaftResistance || 0).toFixed(1)}`,
        "kN",
      ],
      [
        "Ultimate Capacity",
        `${(results.ultimateCapacity || 0).toFixed(1)}`,
        "kN",
      ],
      [
        "Characteristic Capacity",
        `${(results.characteristicCapacity || 0).toFixed(1)}`,
        "kN",
      ],
      ["Design Capacity", `${(results.designCapacity || 0).toFixed(1)}`, "kN"],
      [
        "Utilisation Ratio",
        `${((results.utilisationRatio || 0) * 100).toFixed(1)}%`,
        "-",
      ],
      [
        "Settlement Estimate",
        `${(results.settlementEstimate || 0).toFixed(1)}`,
        "mm",
      ],
    ],
  };

  return {
    title: "Pile Capacity Assessment",
    subtitle: "Single Pile Axial Capacity to EN 1997",
    standard: "BS EN 1997-1",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.isPassing ? "PASS" : "FAIL",
      critical: "Axial Capacity",
      utilisation: results.utilisationRatio || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis determines the axial capacity of a single pile using EN 1997-1 partial factor methods. Base and shaft resistances are calculated from the soil profile using the selected calculation method, and partial factors are applied per the chosen Design Approach.",
      },
      { title: "Pile Configuration", table: pileTable },
      { title: "Soil Profile", table: soilTable },
      { title: "Capacity Results", table: resultsTable },
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

export default buildPileCapacityReport;
