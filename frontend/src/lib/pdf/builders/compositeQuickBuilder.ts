// =============================================================================
// Composite Quick Check Report Builder
// EN 1994-1-1 Quick Composite Beam Check — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface CompositeQuickFormData {
  steelSection: string;
  steelDepth: number;
  steelWidth: number;
  steelArea: number;
  steelIy: number;
  steelWy: number;
  fy: number;
  slabDepth: number;
  slabWidth: number;
  fck: number;
  span: number;
  udl: number;
  loadType: string;
  pointLoad: number;
  interactionDegree: number;
  projectName: string;
  reference: string;
}

export interface CompositeQuickResults {
  MplRd_steel: number;
  MplRd_composite: number;
  MEd: number;
  VEd: number;
  na_position: number;
  bendingUtil: number;
  deflection_bare: number;
  deflection_composite: number;
  deflLimit: number;
  deflUtil: number;
  requiredStuds: number;
  maxUtil: number;
  bendingStatus: string;
  deflectionStatus: string;
  status: string;
  criticalCheck: string;
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

export function buildCompositeQuickReport(
  form: CompositeQuickFormData,
  results: CompositeQuickResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const sectionTable: TableInput = {
    title: "Steel Section",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Section", form.steelSection || "-", "-"],
      ["Depth", String(form.steelDepth || 0), "mm"],
      ["Width", String(form.steelWidth || 0), "mm"],
      ["Area", String(form.steelArea || 0), "cm²"],
      ["Iy", String(form.steelIy || 0), "cm⁴"],
      ["Wy", String(form.steelWy || 0), "cm³"],
      ["fy", String(form.fy || 0), "MPa"],
    ],
  };

  const slabTable: TableInput = {
    title: "Concrete Slab",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Slab Depth", String(form.slabDepth || 0), "mm"],
      ["Effective Width", String(form.slabWidth || 0), "mm"],
      ["fck", String(form.fck || 0), "MPa"],
      [
        "Interaction Degree",
        `${((form.interactionDegree || 0) * 100).toFixed(0)}%`,
        "-",
      ],
    ],
  };

  const loadingTable: TableInput = {
    title: "Loading",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Span", String(form.span || 0), "m"],
      ["Load Type", form.loadType || "UDL", "-"],
      ["UDL", String(form.udl || 0), "kN/m"],
      ["Point Load", String(form.pointLoad || 0), "kN"],
    ],
  };

  const resultsTable: TableInput = {
    title: "Design Results",
    headers: ["Check", "Applied", "Resistance", "Utilisation", "Status"],
    rows: [
      [
        "Bending",
        `${(results.MEd || 0).toFixed(1)} kNm`,
        `${(results.MplRd_composite || 0).toFixed(1)} kNm`,
        `${((results.bendingUtil || 0) * 100).toFixed(1)}%`,
        results.bendingStatus || "-",
      ],
      [
        "Deflection",
        `${(results.deflection_composite || 0).toFixed(1)} mm`,
        `${(results.deflLimit || 0).toFixed(1)} mm`,
        `${((results.deflUtil || 0) * 100).toFixed(1)}%`,
        results.deflectionStatus || "-",
      ],
    ],
  };

  const additionalTable: TableInput = {
    title: "Additional Results",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      [
        "Steel Moment Capacity (MplRd)",
        `${(results.MplRd_steel || 0).toFixed(1)}`,
        "kNm",
      ],
      [
        "Composite Moment Capacity",
        `${(results.MplRd_composite || 0).toFixed(1)}`,
        "kNm",
      ],
      [
        "Neutral Axis Position",
        `${(results.na_position || 0).toFixed(1)}`,
        "mm",
      ],
      ["Required Shear Studs", String(results.requiredStuds || 0), "-"],
      [
        "Bare Steel Deflection",
        `${(results.deflection_bare || 0).toFixed(1)}`,
        "mm",
      ],
    ],
  };

  return {
    title: "Composite Quick Check",
    subtitle: "Simplified Composite Beam Verification",
    standard: "BS EN 1994-1-1",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalCheck || "Bending",
      utilisation: results.maxUtil || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "Quick composite beam check to EN 1994-1-1 using plastic analysis. The composite section capacity is determined for the specified degree of shear connection, and deflections are checked for the composite stage.",
      },
      { title: "Steel Section", table: sectionTable },
      { title: "Concrete Slab", table: slabTable },
      { title: "Loading", table: loadingTable },
      { title: "Design Results", table: resultsTable },
      { title: "Additional Results", table: additionalTable },
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

export default buildCompositeQuickReport;
