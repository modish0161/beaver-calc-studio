// =============================================================================
// 6F2 Quantity Report Builder
// Fill Volume / Tonnage Calculator — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface SixF2QuantityFormData {
  platformShape: string;
  platformLength: number;
  platformWidth: number;
  platformRadius: number;
  layerDepth: number;
  numberOfLayers: number;
  materialType: string;
  bulkDensity: number;
  compactionFactor: number;
  truckCapacity: number;
  costPerTonne: number;
  projectName: string;
  reference: string;
}

export interface SixF2QuantityResults {
  planArea: number;
  totalDepth: number;
  looseVolume: number;
  compactedVolume: number;
  tonnage: number;
  numberOfLoads: number;
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

export function buildSixF2QuantityReport(
  form: SixF2QuantityFormData,
  results: SixF2QuantityResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const platformTable: TableInput = {
    title: "Platform Geometry",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Platform Shape", form.platformShape || "-", "-"],
      ["Length", String(form.platformLength || 0), "m"],
      ["Width", String(form.platformWidth || 0), "m"],
      ["Radius", String(form.platformRadius || 0), "m"],
      ["Layer Depth", String(form.layerDepth || 0), "mm"],
      ["Number of Layers", String(form.numberOfLayers || 1), "-"],
    ],
  };

  const materialTable: TableInput = {
    title: "Material Properties",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Material Type", form.materialType || "-", "-"],
      ["Bulk Density", String(form.bulkDensity || 0), "kg/m³"],
      ["Compaction Factor", String(form.compactionFactor || 1.0), "-"],
      ["Truck Capacity", String(form.truckCapacity || 0), "tonnes"],
      ["Cost Per Tonne", `£${(form.costPerTonne || 0).toFixed(2)}`, "-"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Quantity Results",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Plan Area", `${(results.planArea || 0).toFixed(1)}`, "m²"],
      ["Total Depth", `${(results.totalDepth || 0).toFixed(0)}`, "mm"],
      ["Loose Volume", `${(results.looseVolume || 0).toFixed(1)}`, "m³"],
      [
        "Compacted Volume",
        `${(results.compactedVolume || 0).toFixed(1)}`,
        "m³",
      ],
      ["Tonnage", `${(results.tonnage || 0).toFixed(1)}`, "tonnes"],
      ["Number of Loads", String(results.numberOfLoads || 0), "-"],
      ["Total Cost", `£${(results.totalCost || 0).toFixed(2)}`, "-"],
    ],
  };

  return {
    title: "6F2 / Type 1 Quantity",
    subtitle: "Fill Volume & Tonnage Calculation",
    standard: "Specification for Highway Works Series 600",
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
          "This schedule calculates the volume and tonnage of granular fill material (6F2 / Type 1 sub-base) required for a working platform or earthworks operation, including compaction factors and delivery logistics.",
      },
      { title: "Platform Geometry", table: platformTable },
      { title: "Material Properties", table: materialTable },
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

export default buildSixF2QuantityReport;
