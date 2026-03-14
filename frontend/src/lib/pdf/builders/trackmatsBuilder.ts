// =============================================================================
// Trackmats Report Builder
// Trackmat Structural Check — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface TrackmatsFormData {
  matMaterial: string;
  matLength: number;
  matWidth: number;
  matThickness: number;
  numberOfMats: number;
  spanLength: number;
  vehicle: string;
  customWheelLoad: number;
  customContactArea: number;
  useCustomVehicle: boolean;
  groundType: string;
  customBearing: number;
  useCustomBearing: boolean;
  platformThickness: number;
  safetyFactor: number;
  loadType: string;
}

export interface TrackmatsResults {
  overallStatus: string;
  warnings: string[];
  matProperties: {
    elasticModulus: number;
    allowableBending: number;
    allowableShear: number;
  };
  loadAnalysis: { wheelLoad: number; contactPressure: number };
  bendingCheck: {
    moment: number;
    stress: number;
    allowable: number;
    utilisation: number;
    status: string;
  };
  shearCheck: {
    force: number;
    stress: number;
    allowable: number;
    utilisation: number;
    status: string;
  };
  deflectionCheck: {
    deflection: number;
    limit: number;
    utilisation: number;
    status: string;
  };
  bearingCheck: {
    pressure: number;
    allowable: number;
    utilisation: number;
    status: string;
  };
  punchingCheck: {
    stress: number;
    allowable: number;
    utilisation: number;
    status: string;
  };
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

export function buildTrackmatsReport(
  form: TrackmatsFormData,
  results: TrackmatsResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const matTable: TableInput = {
    title: "Mat Properties",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Material", form.matMaterial || "-", "-"],
      ["Length", String(form.matLength || 0), "mm"],
      ["Width", String(form.matWidth || 0), "mm"],
      ["Thickness", String(form.matThickness || 0), "mm"],
      ["Number of Mats", String(form.numberOfMats || 0), "-"],
      ["Span Length", String(form.spanLength || 0), "mm"],
    ],
  };

  const loadTable: TableInput = {
    title: "Loading",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Vehicle", form.vehicle || "-", "-"],
      [
        "Wheel Load",
        `${(results.loadAnalysis?.wheelLoad || 0).toFixed(1)}`,
        "kN",
      ],
      [
        "Contact Pressure",
        `${(results.loadAnalysis?.contactPressure || 0).toFixed(1)}`,
        "kPa",
      ],
      ["Load Type", form.loadType || "-", "-"],
      ["Safety Factor", String(form.safetyFactor || 1.0), "-"],
    ],
  };

  const groundTable: TableInput = {
    title: "Ground Conditions",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Ground Type", form.groundType || "-", "-"],
      [
        "Custom Bearing",
        form.useCustomBearing ? `${form.customBearing} kPa` : "Auto",
        "-",
      ],
      ["Platform Thickness", String(form.platformThickness || 0), "mm"],
    ],
  };

  const bc = results.bendingCheck || ({} as TrackmatsResults["bendingCheck"]);
  const sc = results.shearCheck || ({} as TrackmatsResults["shearCheck"]);
  const dc =
    results.deflectionCheck || ({} as TrackmatsResults["deflectionCheck"]);
  const brc = results.bearingCheck || ({} as TrackmatsResults["bearingCheck"]);
  const pc = results.punchingCheck || ({} as TrackmatsResults["punchingCheck"]);

  const checksTable: TableInput = {
    title: "Design Checks",
    headers: ["Check", "Applied", "Allowable", "Utilisation", "Status"],
    rows: [
      [
        "Bending",
        `${(bc.stress || 0).toFixed(1)} MPa`,
        `${(bc.allowable || 0).toFixed(1)} MPa`,
        `${((bc.utilisation || 0) * 100).toFixed(1)}%`,
        bc.status || "-",
      ],
      [
        "Shear",
        `${(sc.stress || 0).toFixed(1)} MPa`,
        `${(sc.allowable || 0).toFixed(1)} MPa`,
        `${((sc.utilisation || 0) * 100).toFixed(1)}%`,
        sc.status || "-",
      ],
      [
        "Deflection",
        `${(dc.deflection || 0).toFixed(1)} mm`,
        `${(dc.limit || 0).toFixed(1)} mm`,
        `${((dc.utilisation || 0) * 100).toFixed(1)}%`,
        dc.status || "-",
      ],
      [
        "Bearing",
        `${(brc.pressure || 0).toFixed(1)} kPa`,
        `${(brc.allowable || 0).toFixed(1)} kPa`,
        `${((brc.utilisation || 0) * 100).toFixed(1)}%`,
        brc.status || "-",
      ],
      [
        "Punching",
        `${(pc.stress || 0).toFixed(1)} MPa`,
        `${(pc.allowable || 0).toFixed(1)} MPa`,
        `${((pc.utilisation || 0) * 100).toFixed(1)}%`,
        pc.status || "-",
      ],
    ],
  };

  const maxUtil = Math.max(
    bc.utilisation || 0,
    sc.utilisation || 0,
    dc.utilisation || 0,
    brc.utilisation || 0,
    pc.utilisation || 0,
  );

  return {
    title: "Trackmat Structural Check",
    subtitle: "Temporary Access Mat Design Verification",
    standard: "BS 5975 & BS EN 1993-1-1",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.overallStatus || "PASS",
      critical: "Bending",
      utilisation: maxUtil,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This analysis checks temporary access trackmats for bending, shear, deflection, bearing pressure, and punching under plant wheel loads. Material properties are derived from the mat specification and ground bearing from the site conditions.",
      },
      { title: "Mat Properties", table: matTable },
      { title: "Loading", table: loadTable },
      { title: "Ground Conditions", table: groundTable },
      { title: "Design Checks", table: checksTable },
      {
        title: "Design Notes",
        items:
          warnings.length > 0
            ? warnings.map((w) => `[${w.type.toUpperCase()}] ${w.message}`)
            : (results.warnings || []).length > 0
              ? results.warnings
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

export default buildTrackmatsReport;
