// =============================================================================
// Hoarding Report Builder
// Temporary Hoarding Wind Design — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface HoardingFormData {
  height: number;
  postSpacing: number;
  postSize: string;
  hoardingType: string;
  windZone: string;
  customWindSpeed: number;
  altitude: number;
  terrainCategory: string;
  distanceToSea: number;
  orography: number;
  foundationType: string;
  ballastWeight: number;
  ballastLeverArm: number;
  embedDepth: number;
  sfOverturning: number;
  sfSliding: number;
  dynamicFactor: number;
}

export interface HoardingResults {
  status: string;
  maxUtilisation: number;
  criticalCheck: string;
  windPressure: number;
  windForcePerPanel: number;
  overturningMoment: number;
  resistingMoment: number;
  overturningFOS: number;
  slidingForce: number;
  resistingSlidingForce: number;
  slidingFOS: number;
  postBendingUtil: number;
  postShearUtil: number;
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

export function buildHoardingReport(
  form: HoardingFormData,
  results: HoardingResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const geometryTable: TableInput = {
    title: "Hoarding Geometry",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Height", String(form.height || 0), "m"],
      ["Post Spacing", String(form.postSpacing || 0), "m"],
      ["Post Size", form.postSize || "-", "-"],
      ["Hoarding Type", form.hoardingType || "-", "-"],
      ["Foundation Type", form.foundationType || "-", "-"],
      ["Embed Depth", String(form.embedDepth || 0), "m"],
      ["Ballast Weight", String(form.ballastWeight || 0), "kN"],
    ],
  };

  const windTable: TableInput = {
    title: "Wind Loading",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Wind Zone", form.windZone || "-", "-"],
      ["Custom Wind Speed", String(form.customWindSpeed || 0), "m/s"],
      ["Altitude", String(form.altitude || 0), "m"],
      ["Terrain Category", form.terrainCategory || "-", "-"],
      ["Distance to Sea", String(form.distanceToSea || 0), "km"],
      ["Orography Factor", String(form.orography || 1.0), "-"],
      ["Dynamic Factor", String(form.dynamicFactor || 1.0), "-"],
      ["Wind Pressure", `${(results.windPressure || 0).toFixed(3)}`, "kN/m²"],
    ],
  };

  const stabilityTable: TableInput = {
    title: "Stability Results",
    headers: ["Check", "Applied", "Resisting", "FOS", "Required", "Status"],
    rows: [
      [
        "Overturning",
        `${(results.overturningMoment || 0).toFixed(2)} kNm`,
        `${(results.resistingMoment || 0).toFixed(2)} kNm`,
        `${(results.overturningFOS || 0).toFixed(2)}`,
        String(form.sfOverturning || 1.5),
        (results.overturningFOS || 0) >= (form.sfOverturning || 1.5)
          ? "PASS"
          : "FAIL",
      ],
      [
        "Sliding",
        `${(results.slidingForce || 0).toFixed(2)} kN`,
        `${(results.resistingSlidingForce || 0).toFixed(2)} kN`,
        `${(results.slidingFOS || 0).toFixed(2)}`,
        String(form.sfSliding || 1.5),
        (results.slidingFOS || 0) >= (form.sfSliding || 1.5) ? "PASS" : "FAIL",
      ],
      [
        "Post Bending",
        "-",
        "-",
        `${((results.postBendingUtil || 0) * 100).toFixed(1)}%`,
        "≤ 100%",
        (results.postBendingUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
      [
        "Post Shear",
        "-",
        "-",
        `${((results.postShearUtil || 0) * 100).toFixed(1)}%`,
        "≤ 100%",
        (results.postShearUtil || 0) <= 1.0 ? "PASS" : "FAIL",
      ],
    ],
  };

  return {
    title: "Hoarding Design",
    subtitle: "Temporary Hoarding Wind Stability & Structural Check",
    standard: "BS EN 1991-1-4 & BS 5975",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: results.criticalCheck || "Overturning",
      utilisation: results.maxUtilisation || 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis checks temporary site hoarding for stability against wind loading. Both overturning and sliding safety factors are assessed, along with post bending and shear capacity. Wind pressures are derived from EN 1991-1-4 using the site-specific parameters.",
      },
      { title: "Hoarding Geometry", table: geometryTable },
      { title: "Wind Loading", table: windTable },
      { title: "Stability & Structural Results", table: stabilityTable },
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

export default buildHoardingReport;
