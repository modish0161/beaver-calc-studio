// =============================================================================
// Legato Quantity Report Builder
// Legato Block Count / Site Quantities — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface LegatoQuantityFormData {
  wallLength: number;
  wallHeight: number;
  numberOfWalls: number;
  blockType: string;
  bondPattern: string;
  includeHalfBlocks: boolean;
  deliveryLoadSize: number;
  costPerBlock: number;
  projectName: string;
  reference: string;
}

export interface LegatoQuantityResults {
  wallArea: number;
  totalArea: number;
  fullBlocks: number;
  halfBlocks: number;
  totalBlocks: number;
  totalWeight: number;
  deliveryLoads: number;
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

export function buildLegatoQuantityReport(
  form: LegatoQuantityFormData,
  results: LegatoQuantityResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const wallTable: TableInput = {
    title: "Wall Configuration",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Wall Length", String(form.wallLength || 0), "m"],
      ["Wall Height", String(form.wallHeight || 0), "m"],
      ["Number of Walls", String(form.numberOfWalls || 1), "-"],
      ["Block Type", form.blockType || "-", "-"],
      ["Bond Pattern", form.bondPattern || "-", "-"],
      ["Include Half Blocks", form.includeHalfBlocks ? "Yes" : "No", "-"],
    ],
  };

  const quantityTable: TableInput = {
    title: "Quantity Summary",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Wall Area (single)", `${(results.wallArea || 0).toFixed(1)}`, "m²"],
      ["Total Wall Area", `${(results.totalArea || 0).toFixed(1)}`, "m²"],
      ["Full Blocks", String(results.fullBlocks || 0), "-"],
      ["Half Blocks", String(results.halfBlocks || 0), "-"],
      ["Total Blocks", String(results.totalBlocks || 0), "-"],
      ["Total Weight", `${(results.totalWeight || 0).toFixed(1)}`, "kg"],
    ],
  };

  const logisticsTable: TableInput = {
    title: "Logistics & Cost",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Delivery Load Size", String(form.deliveryLoadSize || 0), "blocks"],
      ["Delivery Loads Required", String(results.deliveryLoads || 0), "-"],
      ["Cost Per Block", `£${(form.costPerBlock || 0).toFixed(2)}`, "-"],
      ["Total Cost", `£${(results.totalCost || 0).toFixed(2)}`, "-"],
    ],
  };

  return {
    title: "Legato Block Quantity",
    subtitle: "Interlocking Block Wall — Material Take-Off",
    standard: "Manufacturer Guidance",
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
          "This schedule calculates the number of Legato interlocking concrete blocks required for the specified wall configuration, including half blocks, delivery loads, and cost estimate.",
      },
      { title: "Wall Configuration", table: wallTable },
      { title: "Quantity Summary", table: quantityTable },
      { title: "Logistics & Cost", table: logisticsTable },
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

export default buildLegatoQuantityReport;
