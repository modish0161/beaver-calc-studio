// =============================================================================
// Hole Pattern DXF Report Builder
// CNC/CAD Hole Pattern — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from "../types";

export interface HolePatternDXFFormData {
  pattern_type: string;
  num_holes_x: number;
  num_holes_y: number;
  spacing_x: number;
  spacing_y: number;
  start_x: number;
  start_y: number;
  num_holes_circle: number;
  circle_radius: number;
  center_x: number;
  center_y: number;
  start_angle: number;
  hole_diameter: number;
  hole_type: string;
  plate_width: number;
  plate_height: number;
  show_plate: boolean;
  layer_name: string;
  units: string;
  projectName: string;
  reference: string;
}

export interface HolePatternDXFResults {
  total_holes: number;
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  pattern_width: number;
  pattern_height: number;
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

export function buildHolePatternDXFReport(
  form: HolePatternDXFFormData,
  results: HolePatternDXFResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const patternTable: TableInput = {
    title: "Pattern Configuration",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Pattern Type", form.pattern_type || "-", "-"],
      ["Hole Diameter", String(form.hole_diameter || 0), form.units || "mm"],
      ["Hole Type", form.hole_type || "-", "-"],
      ["Units", form.units || "mm", "-"],
      ["Layer Name", form.layer_name || "-", "-"],
    ],
  };

  const gridRows: string[][] = [];
  if (form.pattern_type === "grid" || form.pattern_type === "rectangular") {
    gridRows.push(
      ["Holes in X", String(form.num_holes_x || 0), "-"],
      ["Holes in Y", String(form.num_holes_y || 0), "-"],
      ["Spacing X", String(form.spacing_x || 0), form.units || "mm"],
      ["Spacing Y", String(form.spacing_y || 0), form.units || "mm"],
      ["Start X", String(form.start_x || 0), form.units || "mm"],
      ["Start Y", String(form.start_y || 0), form.units || "mm"],
    );
  } else {
    gridRows.push(
      ["Number of Holes", String(form.num_holes_circle || 0), "-"],
      ["Circle Radius", String(form.circle_radius || 0), form.units || "mm"],
      ["Centre X", String(form.center_x || 0), form.units || "mm"],
      ["Centre Y", String(form.center_y || 0), form.units || "mm"],
      ["Start Angle", String(form.start_angle || 0), "°"],
    );
  }

  const dimensionsTable: TableInput = {
    title: "Pattern Dimensions",
    headers: ["Parameter", "Value", "Units"],
    rows: gridRows,
  };

  const plateTable: TableInput = {
    title: "Plate & Output",
    headers: ["Parameter", "Value", "Units"],
    rows: [
      ["Plate Width", String(form.plate_width || 0), form.units || "mm"],
      ["Plate Height", String(form.plate_height || 0), form.units || "mm"],
      ["Show Plate", form.show_plate ? "Yes" : "No", "-"],
      ["Total Holes", String(results.total_holes || 0), "-"],
      [
        "Pattern Width",
        `${(results.pattern_width || 0).toFixed(1)}`,
        form.units || "mm",
      ],
      [
        "Pattern Height",
        `${(results.pattern_height || 0).toFixed(1)}`,
        form.units || "mm",
      ],
    ],
  };

  return {
    title: "Hole Pattern DXF Generator",
    subtitle: "CNC / CAD Hole Pattern Summary",
    standard: "General Manufacturing",
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    summary: {
      status: results.status || "PASS",
      critical: "Hole Pattern",
      utilisation: 0,
    },
    sections: [
      {
        title: "Design Basis",
        content:
          "This document records the hole pattern configuration for DXF export to CNC or CAD systems. Pattern dimensions and hole locations are listed for fabrication records.",
      },
      { title: "Pattern Configuration", table: patternTable },
      { title: "Pattern Dimensions", table: dimensionsTable },
      { title: "Plate & Output Summary", table: plateTable },
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

export default buildHolePatternDXFReport;
