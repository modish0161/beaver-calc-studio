// =============================================================================
// Pile Foundations PDF Builder V2 — EN 1997-1 Deep Foundation Report
// =============================================================================

import { Page, Text, View } from "@react-pdf/renderer";
import React from "react";
import { createTw } from "react-pdf-tailwind";
import { BeaverCalcReport } from "../BeaverCalcReport";
import { createPDFStyles as baseStyles } from "../utils";

const tw = createTw({});

const styles = {
  ...baseStyles(),
  pageContainer: tw("p-8 font-sans text-gray-800"),
  header: tw("text-2xl font-bold text-center text-amber-700 mb-4"),
  subHeader: tw(
    "text-lg font-semibold text-gray-700 mb-2 mt-4 border-b border-gray-300 pb-1",
  ),
  row: tw("flex flex-row justify-between py-1 border-b border-gray-100"),
  label: tw("text-sm text-gray-600"),
  value: tw("text-sm font-semibold text-gray-800"),
  valueHighlight: tw("text-sm font-bold text-amber-600"),
  passBox: tw(
    "bg-green-100 p-4 rounded-lg border border-green-500 text-center my-4",
  ),
  failBox: tw(
    "bg-red-100 p-4 rounded-lg border border-red-500 text-center my-4",
  ),
  passText: tw("text-green-700 font-bold text-lg"),
  failText: tw("text-red-700 font-bold text-lg"),
  warningBox: tw("bg-amber-100 p-3 rounded border border-amber-400 mt-4"),
  warningText: tw("text-sm text-amber-700"),
  infoBox: tw("bg-blue-50 p-3 rounded border border-blue-300 mt-4"),
  infoText: tw("text-xs text-blue-700"),
  table: tw("w-full mt-2 mb-4"),
  tableHeader: tw("flex flex-row bg-gray-100 py-2 px-1"),
  tableHeaderCell: tw("text-xs font-bold text-gray-700"),
  tableRow: tw("flex flex-row py-2 px-1 border-b border-gray-100"),
  tableCell: tw("text-xs text-gray-700"),
};

interface FormData {
  pile_type: string;
  pile_count: string;
  pile_diameter: string;
  pile_length: string;
  concrete_grade: string;
  steel_grade: string;
  reinforcement_percent: string;
  load_vertical: string;
  load_horizontal: string;
  moment: string;
  load_case: string;
  layout: string;
  spacing: string;
  cap_thickness: string;
  cap_width: string;
  soil_profile: string;
  cu_surface: string;
  cu_gradient: string;
  phi_eff: string;
  gamma: string;
  groundwater_depth: string;
  gamma_R1: string;
  gamma_R2: string;
  gamma_R3: string;
  projectName: string;
  reference: string;
}

interface PileResult {
  shaft_friction: number;
  end_bearing: number;
  ultimate_capacity: number;
  design_capacity: number;
  axial_util: number;
  lateral_capacity: number;
  lateral_util: number;
  moment_capacity: number;
  moment_util: number;
  settlement: number;
  status: string;
}

interface Results {
  single_pile: PileResult;
  group_capacity: number;
  group_efficiency: number;
  governing_util: number;
  cap_design: {
    width: number;
    depth: number;
    shear_check: number;
    punching_check: number;
  };
  cost_estimate: {
    piling: number;
    reinforcement: number;
    pile_cap: number;
    total: number;
  };
  status: string;
  rating: string;
  ratingColor: string;
}

interface ProjectInfo {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

const PILE_TYPES: Record<string, { name: string }> = {
  bored: { name: "Bored Cast-In-Place" },
  cfa: { name: "Continuous Flight Auger" },
  driven_precast: { name: "Driven Precast" },
  driven_steel: { name: "Driven Steel H-pile" },
  micropile: { name: "Micropile" },
};

const SOIL_PROFILES: Record<string, { name: string }> = {
  soft_clay: { name: "Soft Clay" },
  firm_clay: { name: "Firm Clay" },
  stiff_clay: { name: "Stiff Clay" },
  very_stiff_clay: { name: "Very Stiff Clay" },
  loose_sand: { name: "Loose Sand" },
  medium_sand: { name: "Medium Dense Sand" },
  dense_sand: { name: "Dense Sand" },
  gravel: { name: "Gravel" },
  weathered_rock: { name: "Weathered Rock" },
};

export const buildPileFoundationsReportV2 = (
  form: FormData,
  results: Results,
  warnings: string[],
  projectInfo: ProjectInfo,
): React.ReactElement => {
  const { projectName, clientName, preparedBy } = projectInfo;
  const pileTypeName = PILE_TYPES[form.pile_type]?.name || form.pile_type;
  const soilName = SOIL_PROFILES[form.soil_profile]?.name || form.soil_profile;

  return React.createElement(
    BeaverCalcReport as any,
    {
      title: "Pile Foundation Design",
      projectName: projectName || form.projectName,
      reference: form.reference,
      designCode: "EN 1997-1",
      clientName: clientName || "Client",
      preparedBy: preparedBy || "Engineer",
    },
    // Page 1: Input Summary & Single Pile
    React.createElement(
      Page,
      { size: "A4", style: styles.pageContainer },

      // Pile Properties
      React.createElement(Text, { style: styles.subHeader }, "Pile Properties"),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Pile Type"),
        React.createElement(Text, { style: styles.value }, pileTypeName),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Configuration"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.pile_count} piles × Ø${form.pile_diameter}m × ${form.pile_length}m`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Concrete Grade"),
        React.createElement(Text, { style: styles.value }, form.concrete_grade),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Layout / Spacing"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.layout} @ ${form.spacing}m c/c`,
        ),
      ),

      // Soil Profile
      React.createElement(Text, { style: styles.subHeader }, "Soil Profile"),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Soil Type"),
        React.createElement(Text, { style: styles.value }, soilName),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Cu (surface)"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.cu_surface} kPa`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Unit Weight γ"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.gamma} kN/m³`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Groundwater Depth"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.groundwater_depth} m`,
        ),
      ),

      // Applied Loads
      React.createElement(Text, { style: styles.subHeader }, "Applied Loads"),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Vertical Load"),
        React.createElement(
          Text,
          { style: styles.valueHighlight },
          `${form.load_vertical} kN`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Horizontal Load"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.load_horizontal} kN`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Moment"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.moment} kNm`,
        ),
      ),

      // Single Pile Capacity
      React.createElement(
        Text,
        { style: styles.subHeader },
        "Single Pile Capacity",
      ),
      React.createElement(
        View,
        {
          style: tw("flex flex-row justify-around mt-2 p-3 bg-gray-50 rounded"),
        },
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Shaft Friction",
          ),
          React.createElement(
            Text,
            { style: tw("text-lg font-bold text-gray-800") },
            `${results.single_pile.shaft_friction.toFixed(0)} kN`,
          ),
        ),
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "End Bearing",
          ),
          React.createElement(
            Text,
            { style: tw("text-lg font-bold text-gray-800") },
            `${results.single_pile.end_bearing.toFixed(0)} kN`,
          ),
        ),
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Ultimate",
          ),
          React.createElement(
            Text,
            { style: tw("text-lg font-bold text-amber-700") },
            `${results.single_pile.ultimate_capacity.toFixed(0)} kN`,
          ),
        ),
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Design",
          ),
          React.createElement(
            Text,
            { style: tw("text-lg font-bold text-green-700") },
            `${results.single_pile.design_capacity.toFixed(0)} kN`,
          ),
        ),
      ),
    ),

    // Page 2: Group Results & Summary
    React.createElement(
      Page,
      { size: "A4", style: styles.pageContainer },

      // Group Performance
      React.createElement(
        Text,
        { style: styles.subHeader },
        "Pile Group Performance",
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Group Capacity"),
        React.createElement(
          Text,
          { style: styles.valueHighlight },
          `${results.group_capacity.toFixed(0)} kN`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Group Efficiency"),
        React.createElement(
          Text,
          { style: styles.value },
          `${(results.group_efficiency * 100).toFixed(0)}%`,
        ),
      ),

      // Utilisation Checks
      React.createElement(
        Text,
        { style: styles.subHeader },
        "Utilisation Checks",
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Axial Utilisation"),
        React.createElement(
          Text,
          {
            style:
              results.single_pile.axial_util <= 1
                ? styles.value
                : tw("text-sm font-bold text-red-600"),
          },
          `${(results.single_pile.axial_util * 100).toFixed(1)}%`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(
          Text,
          { style: styles.label },
          "Lateral Utilisation",
        ),
        React.createElement(
          Text,
          {
            style:
              results.single_pile.lateral_util <= 1
                ? styles.value
                : tw("text-sm font-bold text-red-600"),
          },
          `${(results.single_pile.lateral_util * 100).toFixed(1)}%`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(
          Text,
          { style: styles.label },
          "Moment Utilisation",
        ),
        React.createElement(
          Text,
          {
            style:
              results.single_pile.moment_util <= 1
                ? styles.value
                : tw("text-sm font-bold text-red-600"),
          },
          `${(results.single_pile.moment_util * 100).toFixed(1)}%`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(
          Text,
          { style: styles.label },
          "Governing Utilisation",
        ),
        React.createElement(
          Text,
          { style: styles.valueHighlight },
          `${(results.governing_util * 100).toFixed(1)}%`,
        ),
      ),

      // Settlement
      React.createElement(Text, { style: styles.subHeader }, "Settlement"),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(
          Text,
          { style: styles.label },
          "Estimated Settlement",
        ),
        React.createElement(
          Text,
          {
            style:
              results.single_pile.settlement <= 25
                ? styles.value
                : tw("text-sm font-bold text-red-600"),
          },
          `${results.single_pile.settlement.toFixed(1)} mm`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(
          Text,
          { style: styles.label },
          "Allowable Settlement",
        ),
        React.createElement(Text, { style: styles.value }, "25 mm"),
      ),

      // Pile Cap
      React.createElement(Text, { style: styles.subHeader }, "Pile Cap Design"),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Cap Size"),
        React.createElement(
          Text,
          { style: styles.value },
          `${results.cap_design.width}m × ${results.cap_design.width}m × ${results.cap_design.depth}m`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Shear Check"),
        React.createElement(
          Text,
          {
            style:
              results.cap_design.shear_check <= 1
                ? styles.value
                : tw("text-sm font-bold text-red-600"),
          },
          `${(results.cap_design.shear_check * 100).toFixed(0)}%`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Punching Check"),
        React.createElement(
          Text,
          {
            style:
              results.cap_design.punching_check <= 1
                ? styles.value
                : tw("text-sm font-bold text-red-600"),
          },
          `${(results.cap_design.punching_check * 100).toFixed(0)}%`,
        ),
      ),

      // Status
      results.status === "PASS"
        ? React.createElement(
            View,
            { style: styles.passBox },
            React.createElement(
              Text,
              { style: styles.passText },
              `${results.rating}`,
            ),
            React.createElement(
              Text,
              { style: tw("text-sm text-green-600 mt-1") },
              "Pile foundation design adequate per EN 1997-1",
            ),
          )
        : React.createElement(
            View,
            { style: styles.failBox },
            React.createElement(Text, { style: styles.failText }, "INADEQUATE"),
            React.createElement(
              Text,
              { style: tw("text-sm text-red-600 mt-1") },
              "Design revision required",
            ),
          ),

      // Warnings
      warnings.length > 0 &&
        React.createElement(
          View,
          { style: styles.warningBox },
          React.createElement(
            Text,
            { style: tw("font-bold text-amber-700 mb-1") },
            "Design Notes:",
          ),
          ...warnings.map((w, i) =>
            React.createElement(
              Text,
              { style: styles.warningText, key: `warn-${i}` },
              `• ${w}`,
            ),
          ),
        ),

      // Cost Estimate
      React.createElement(Text, { style: styles.subHeader }, "Cost Estimate"),
      React.createElement(
        View,
        {
          style: tw("flex flex-row justify-around mt-2 p-3 bg-gray-50 rounded"),
        },
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Piling",
          ),
          React.createElement(
            Text,
            { style: tw("text-sm font-bold text-gray-800") },
            `£${(results.cost_estimate.piling / 1000).toFixed(0)}k`,
          ),
        ),
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Reinforcement",
          ),
          React.createElement(
            Text,
            { style: tw("text-sm font-bold text-gray-800") },
            `£${(results.cost_estimate.reinforcement / 1000).toFixed(0)}k`,
          ),
        ),
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Pile Cap",
          ),
          React.createElement(
            Text,
            { style: tw("text-sm font-bold text-gray-800") },
            `£${(results.cost_estimate.pile_cap / 1000).toFixed(0)}k`,
          ),
        ),
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Total",
          ),
          React.createElement(
            Text,
            { style: tw("text-sm font-bold text-amber-700") },
            `£${(results.cost_estimate.total / 1000).toFixed(0)}k`,
          ),
        ),
      ),

      // Reference
      React.createElement(
        View,
        { style: styles.infoBox },
        React.createElement(
          Text,
          { style: tw("font-bold text-blue-700 mb-1") },
          "Design Code References",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• EN 1997-1: Eurocode 7 - Geotechnical Design",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• Alpha method: Shaft friction in cohesive soils",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• Beta method: Shaft friction in granular soils",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• Nc, Nq bearing capacity factors for end bearing",
        ),
      ),
    ),
  );
};

export default buildPileFoundationsReportV2;
