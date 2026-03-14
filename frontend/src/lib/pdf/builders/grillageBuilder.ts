// =============================================================================
// Grillage Report Builder
// Bridge Grillage Analysis — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface GrillageFormData {
  spanLength: number;
  deckWidth: number;
  deckType: string;
  slabThickness: number;
  numLongBeams: number;
  numTransBeams: number;
  longSection: string;
  transSection: string;
  steelGrade: string;
  deflectionLimit: number;
  dynamicFactor: number;
  gammaM0: number;
  gammaM1: number;
  loadCases: {
    id: number;
    name: string;
    type: string;
    magnitude: number;
    xPos: number;
    yPos: number;
    length?: number;
    width?: number;
  }[];
}

export interface GrillageResults {
  status: string;
  maxUtilisation: number;
  criticalCheck: string;
  maxBendingMoment: number;
  maxShearForce: number;
  maxDeflection: number;
  maxLongBendingUtil: number;
  maxTransBendingUtil: number;
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

export function buildGrillageReport(
  form: GrillageFormData,
  results: GrillageResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const geometryTable: TableInput = {
    title: "Deck Geometry",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Span Length", String(form.spanLength || 0), "m"],
      ["Deck Width", String(form.deckWidth || 0), "m"],
      ["Deck Type", form.deckType || "-", "-"],
      ["Slab Thickness", String(form.slabThickness || 0), "mm"],
      ["No. Longitudinal Beams", String(form.numLongBeams || 0), "-"],
      ["No. Transverse Beams", String(form.numTransBeams || 0), "-"],
    ],
  };

  const membersTable: TableInput = {
    title: "Members & Materials",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Longitudinal Section", form.longSection || "-", "-"],
      ["Transverse Section", form.transSection || "-", "-"],
      ["Steel Grade", form.steelGrade || "-", "-"],
      ["γ_M0", String(form.gammaM0 || 1.0), "-"],
      ["γ_M1", String(form.gammaM1 || 1.0), "-"],
      ["Dynamic Factor", String(form.dynamicFactor || 1.0), "-"],
      ["Deflection Limit", `L/${form.deflectionLimit || 250}`, "-"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Analysis Results",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      [
        "Max Bending Moment",
        `${(results.maxBendingMoment || 0).toFixed(1)}`,
        "kNm",
      ],
      ["Max Shear Force", `${(results.maxShearForce || 0).toFixed(1)}`, "kN"],
      ["Max Deflection", `${(results.maxDeflection || 0).toFixed(1)}`, "mm"],
      [
        "Longitudinal Bending Util",
        `${((results.maxLongBendingUtil || 0) * 100).toFixed(1)}%`,
        "-",
      ],
      [
        "Transverse Bending Util",
        `${((results.maxTransBendingUtil || 0) * 100).toFixed(1)}%`,
        "-",
      ],
      [
        "Max Utilisation",
        `${((results.maxUtilisation || 0) * 100).toFixed(1)}%`,
        "-",
      ],
    ],
  };

  return {
    title: "Bridge Grillage Analysis",
    subtitle: "Simplified Grillage Model Results",
    standard: "BS EN 1993-1-1 & BS EN 1991-2",
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
          "Simplified grillage analysis for a bridge deck using beam-grid analogy. Longitudinal and transverse members are checked for bending, shear and deflection under the specified load cases including highway live loading and dynamic amplification.",
      },
      { title: "Deck Geometry", table: geometryTable },
      { title: "Members & Materials", table: membersTable },
      { title: "Analysis Results", table: resultsTable },
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

export default buildGrillageReport;
