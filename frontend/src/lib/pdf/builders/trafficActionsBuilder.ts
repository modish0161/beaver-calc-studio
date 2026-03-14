// =============================================================================
// Traffic Actions PDF Builder — EN 1991-2 Bridge Traffic Loading Report
// =============================================================================

import { Page, Text, View } from "@react-pdf/renderer";
import React from "react";
import { createTw } from "react-pdf-tailwind";
import { BeaverCalcReport } from "../BeaverCalcReport";
import { createPDFStyles as baseStyles } from "../utils";

const tw = createTw({});

// Define PDF styles
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
  passText: tw("text-green-700 font-bold text-lg"),
  table: tw("w-full mt-2 mb-4"),
  tableHeader: tw("flex flex-row bg-gray-100 py-2 px-1"),
  tableHeaderCell: tw("text-xs font-bold text-gray-700"),
  tableRow: tw("flex flex-row py-2 px-1 border-b border-gray-100"),
  tableCell: tw("text-xs text-gray-700"),
  warningBox: tw("bg-amber-100 p-3 rounded border border-amber-400 mt-4"),
  warningText: tw("text-sm text-amber-700"),
  infoBox: tw("bg-blue-50 p-3 rounded border border-blue-300 mt-4"),
  infoText: tw("text-xs text-blue-700"),
};

interface LaneResult {
  lane: number;
  width: number;
  Q_k: number;
  q_k: number;
  alpha_Q: number;
  alpha_q: number;
  Q_d: number;
  q_d: number;
  totalUDL: number;
  totalConc: number;
}

interface FormData {
  carriageway_width: string;
  span_length: string;
  deck_type: string;
  load_model: string;
  traffic_group: string;
  include_lm2: boolean;
  include_lm3: boolean;
  lm3_vehicle: string;
  include_lm4: boolean;
  lm4_density: string;
  dynamic_factor: string;
  lane_factor: string;
  projectName: string;
  reference: string;
}

interface Results {
  num_lanes: number;
  lane_width: number;
  remaining_width: number;
  lanes: LaneResult[];
  totalLM1_udl: number;
  totalLM1_conc: number;
  lm2_load: number;
  lm2_contact: number;
  lm3_load: number;
  lm3_axles: number;
  lm4_load: number;
  governing_udl: number;
  governing_conc: number;
  totalBending: number;
  totalShear: number;
  status: string;
  rating: string;
  ratingColor: string;
}

interface ProjectInfo {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

export const buildTrafficActionsReport = (
  form: FormData,
  results: Results,
  warnings: string[] = [],
  projectInfo: ProjectInfo = {},
): React.ReactElement => {
  const { projectName, clientName, preparedBy } = projectInfo;

  return React.createElement(
    BeaverCalcReport as any,
    {
      title: "Traffic Actions Analysis",
      projectName: projectName || form.projectName,
      reference: form.reference,
      designCode: "EN 1991-2 + UK NA",
      clientName: clientName || "Client",
      preparedBy: preparedBy || "Engineer",
    },
    // Page 1: Input Summary & LM1 Results
    React.createElement(
      Page,
      { size: "A4", style: styles.pageContainer },

      // Bridge Geometry
      React.createElement(Text, { style: styles.subHeader }, "Bridge Geometry"),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Carriageway Width"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.carriageway_width} m`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Span Length"),
        React.createElement(
          Text,
          { style: styles.value },
          `${form.span_length} m`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Deck Type"),
        React.createElement(Text, { style: styles.value }, form.deck_type),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Traffic Group"),
        React.createElement(Text, { style: styles.value }, form.traffic_group),
      ),

      // Lane Configuration
      React.createElement(
        Text,
        { style: styles.subHeader },
        "Lane Configuration (EN 1991-2 Table 4.1)",
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(
          Text,
          { style: styles.label },
          "Number of Notional Lanes",
        ),
        React.createElement(
          Text,
          { style: styles.valueHighlight },
          `${results.num_lanes}`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Lane Width"),
        React.createElement(
          Text,
          { style: styles.value },
          `${results.lane_width.toFixed(1)} m`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(
          Text,
          { style: styles.label },
          "Remaining Area Width",
        ),
        React.createElement(
          Text,
          { style: styles.value },
          `${results.remaining_width.toFixed(2)} m`,
        ),
      ),

      // LM1 Lane Results Table
      React.createElement(
        Text,
        { style: styles.subHeader },
        "LM1 - Lane Loading (Tandem + UDL)",
      ),
      React.createElement(
        View,
        { style: styles.table },
        // Header
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderCell, width: "12%" } },
            "Lane",
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderCell, width: "11%" } },
            "Q_k",
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderCell, width: "11%" } },
            "q_k",
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderCell, width: "11%" } },
            "α_Q",
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderCell, width: "11%" } },
            "α_q",
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderCell, width: "11%" } },
            "Q_d",
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderCell, width: "11%" } },
            "q_d",
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderCell, width: "11%" } },
            "Total",
          ),
        ),
        // Data rows
        ...results.lanes.map((lane) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: `lane-${lane.lane}` },
            React.createElement(
              Text,
              { style: { ...styles.tableCell, width: "12%" } },
              `Lane ${lane.lane}`,
            ),
            React.createElement(
              Text,
              { style: { ...styles.tableCell, width: "11%" } },
              `${lane.Q_k} kN`,
            ),
            React.createElement(
              Text,
              { style: { ...styles.tableCell, width: "11%" } },
              `${lane.q_k} kN/m²`,
            ),
            React.createElement(
              Text,
              { style: { ...styles.tableCell, width: "11%" } },
              `${lane.alpha_Q.toFixed(2)}`,
            ),
            React.createElement(
              Text,
              { style: { ...styles.tableCell, width: "11%" } },
              `${lane.alpha_q.toFixed(2)}`,
            ),
            React.createElement(
              Text,
              { style: { ...styles.tableCell, width: "11%" } },
              `${lane.Q_d.toFixed(0)} kN`,
            ),
            React.createElement(
              Text,
              { style: { ...styles.tableCell, width: "11%" } },
              `${lane.q_d.toFixed(2)} kN/m²`,
            ),
            React.createElement(
              Text,
              { style: { ...styles.tableCell, width: "11%" } },
              `${lane.totalUDL.toFixed(0)} kN`,
            ),
          ),
        ),
      ),

      // LM1 Totals
      React.createElement(
        View,
        {
          style: tw(
            "flex flex-row justify-around mt-4 p-3 bg-amber-50 rounded",
          ),
        },
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Total UDL Load",
          ),
          React.createElement(
            Text,
            { style: tw("text-lg font-bold text-amber-700") },
            `${results.totalLM1_udl.toFixed(1)} kN`,
          ),
        ),
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Total Concentrated",
          ),
          React.createElement(
            Text,
            { style: tw("text-lg font-bold text-amber-700") },
            `${results.totalLM1_conc.toFixed(1)} kN`,
          ),
        ),
      ),
    ),

    // Page 2: Other Load Models & Summary
    React.createElement(
      Page,
      { size: "A4", style: styles.pageContainer },

      // Other Load Models
      React.createElement(
        Text,
        { style: styles.subHeader },
        "Additional Load Models",
      ),

      form.include_lm2 &&
        React.createElement(
          View,
          { style: tw("p-3 bg-blue-50 rounded mb-3") },
          React.createElement(
            Text,
            { style: tw("font-bold text-blue-700 mb-1") },
            "LM2 - Single Axle",
          ),
          React.createElement(
            Text,
            { style: tw("text-sm text-gray-700") },
            `Axle Load: ${results.lm2_load} kN`,
          ),
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            `Contact Area: ${(results.lm2_contact * 10000).toFixed(0)} mm × 600 mm`,
          ),
        ),

      form.include_lm3 &&
        React.createElement(
          View,
          { style: tw("p-3 bg-purple-50 rounded mb-3") },
          React.createElement(
            Text,
            { style: tw("font-bold text-purple-700 mb-1") },
            `LM3 - Special Vehicle (${form.lm3_vehicle})`,
          ),
          React.createElement(
            Text,
            { style: tw("text-sm text-gray-700") },
            `Total Load: ${results.lm3_load.toFixed(0)} kN`,
          ),
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            `Number of Axles: ${results.lm3_axles}`,
          ),
        ),

      form.include_lm4 &&
        React.createElement(
          View,
          { style: tw("p-3 bg-cyan-50 rounded mb-3") },
          React.createElement(
            Text,
            { style: tw("font-bold text-cyan-700 mb-1") },
            "LM4 - Crowd Loading",
          ),
          React.createElement(
            Text,
            { style: tw("text-sm text-gray-700") },
            `Total Load: ${results.lm4_load.toFixed(1)} kN`,
          ),
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            `Density: ${form.lm4_density} kN/m²`,
          ),
        ),

      // Force Effects
      React.createElement(
        Text,
        { style: styles.subHeader },
        "Force Effects (Simply Supported)",
      ),
      React.createElement(
        View,
        {
          style: tw("flex flex-row justify-around mt-2 p-4 bg-gray-50 rounded"),
        },
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Maximum Bending Moment",
          ),
          React.createElement(
            Text,
            { style: tw("text-2xl font-bold text-amber-700") },
            `${results.totalBending.toFixed(0)} kNm`,
          ),
        ),
        React.createElement(
          View,
          { style: tw("text-center") },
          React.createElement(
            Text,
            { style: tw("text-xs text-gray-600") },
            "Maximum Shear Force",
          ),
          React.createElement(
            Text,
            { style: tw("text-2xl font-bold text-amber-700") },
            `${results.totalShear.toFixed(0)} kN`,
          ),
        ),
      ),

      // Design Summary
      React.createElement(
        Text,
        { style: styles.subHeader },
        "Governing Design Values",
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "Governing UDL"),
        React.createElement(
          Text,
          { style: styles.valueHighlight },
          `${results.governing_udl.toFixed(2)} kN/m²`,
        ),
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(
          Text,
          { style: styles.label },
          "Governing Concentrated Load",
        ),
        React.createElement(
          Text,
          { style: styles.valueHighlight },
          `${results.governing_conc.toFixed(0)} kN`,
        ),
      ),

      // Status
      React.createElement(
        View,
        { style: styles.passBox },
        React.createElement(
          Text,
          { style: styles.passText },
          "TRAFFIC LOADING CALCULATED",
        ),
        React.createElement(
          Text,
          { style: tw("text-sm text-green-600 mt-1") },
          "Per EN 1991-2 with UK National Annex",
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
          "• EN 1991-2: Actions on structures - Traffic loads on bridges",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• UK National Annex to BS EN 1991-2",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• LM1: Normal traffic (Tandem system + UDL per lane)",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• LM2: Single axle 400 kN for local verification",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• LM3: Special vehicles for abnormal load assessment",
        ),
        React.createElement(
          Text,
          { style: styles.infoText },
          "• LM4: Crowd loading (5 kN/m²)",
        ),
      ),
    ),
  );
};

export default buildTrafficActionsReport;
