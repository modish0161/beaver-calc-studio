// =============================================================================
// Load Spread Report Builder
// Load Spreading & Dispersion Analysis — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface LoadSpreadFormData {
  projectName: string;
  reference: string;
  loadType: string;
  appliedLoad: number;
  loadWidth: number;
  loadLength: number;
  spreadAngle: number;
  spreadMethod: string;
  layerCount: number;
  layers: Array<{
    material: string;
    thickness: number;
    modulus: number;
    spreadAngle: number;
  }>;
  depthOfInterest: number;
  targetBearingCapacity: number;
}

export interface LoadSpreadResults {
  status: string;
  utilisation: number;
  spreadWidthAtDepth: number;
  spreadLengthAtDepth: number;
  spreadArea: number;
  dispersedPressure: number;
  originalPressure: number;
  pressureReduction: number;
  bearingCapacity: number;
  bearingUtilisation: number;
  effectiveDepth: number;
  criticalCheck: string;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

interface ProjectInfo {
  projectName: string;
  clientName: string;
  preparedBy: string;
}

export function buildLoadSpreadReport(
  form: LoadSpreadFormData,
  results: LoadSpreadResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Applied load table
  const loadTable: TableInput = {
    title: 'Applied Loading',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Load Type', form.loadType || '-', '-'],
      ['Applied Load', String(form.appliedLoad || 0), 'kN'],
      ['Load Width (B)', String(form.loadWidth || 0), 'm'],
      ['Load Length (L)', String(form.loadLength || 0), 'm'],
      [
        'Original Contact Pressure',
        ((form.appliedLoad || 0) / ((form.loadWidth || 1) * (form.loadLength || 1))).toFixed(2),
        'kPa',
      ],
    ],
  };

  // Spread parameters table
  const spreadTable: TableInput = {
    title: 'Spread Parameters',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Spread Method', form.spreadMethod || '-', '-'],
      ['Spread Angle', String(form.spreadAngle || 0), '°'],
      ['Depth of Interest', String(form.depthOfInterest || 0), 'm'],
      ['Number of Layers', String(form.layerCount || 0), '-'],
    ],
  };

  // Layer properties table
  const layerRows = (form.layers || []).map((layer, index) => [
    `Layer ${index + 1}`,
    layer.material || '-',
    String(layer.thickness || 0),
    String(layer.modulus || 0),
    String(layer.spreadAngle || 0),
  ]);

  const layerTable: TableInput = {
    title: 'Layer Properties',
    headers: ['Layer', 'Material', 'Thickness (m)', 'Modulus (MPa)', 'Spread Angle (°)'],
    rows: layerRows.length > 0 ? layerRows : [['1', 'Granular Fill', '0.3', '50', '30']],
  };

  // Results table
  const resultsTable: TableInput = {
    title: 'Load Spread Results',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Spread Width at Depth', (results.spreadWidthAtDepth || 0).toFixed(3), 'm'],
      ['Spread Length at Depth', (results.spreadLengthAtDepth || 0).toFixed(3), 'm'],
      ['Spread Area', (results.spreadArea || 0).toFixed(3), 'm²'],
      ['Dispersed Pressure', (results.dispersedPressure || 0).toFixed(2), 'kPa'],
      ['Pressure Reduction', (results.pressureReduction || 0).toFixed(1), '%'],
      ['Effective Spread Depth', (results.effectiveDepth || 0).toFixed(3), 'm'],
    ],
  };

  // Bearing check table
  const bearingTable: TableInput = {
    title: 'Bearing Capacity Check',
    headers: ['Check', 'Demand', 'Capacity', 'Utilisation', 'Status'],
    rows: [
      [
        'Bearing Pressure',
        `${(results.dispersedPressure || 0).toFixed(2)} kPa`,
        `${(results.bearingCapacity || 0).toFixed(2)} kPa`,
        `${((results.bearingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.bearingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
    ],
  };

  return {
    title: 'Load Spread Analysis',
    subtitle: 'Load Dispersion Through Granular Layers',
    standard: 'Boussinesq Theory & 2:1 Distribution Method',
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      status: results.status || 'PASS',
      critical: results.criticalCheck || 'Bearing Pressure',
      utilisation: results.utilisation || 0,
    },
    sections: [
      {
        title: 'Design Basis',
        content:
          'This analysis calculates the dispersion of applied loads through granular fill layers to determine the pressure at a specified depth. The analysis uses either the simplified 2:1 (or 1:2) load spread method or Boussinesq elastic theory for pressure distribution. This is commonly used to verify that dispersed loads do not exceed the bearing capacity of underlying soils or structures.',
      },
      {
        title: 'Applied Loading',
        table: loadTable,
      },
      {
        title: 'Spread Parameters',
        table: spreadTable,
      },
      {
        title: 'Layer Properties',
        table: layerTable,
      },
      {
        title: 'Load Spread Results',
        table: resultsTable,
      },
      {
        title: 'Bearing Capacity Check',
        table: bearingTable,
      },
      {
        title: 'Design Notes',
        items:
          warnings.length > 0
            ? warnings.map((w) => `[${w.type.toUpperCase()}] ${w.message}`)
            : ['No warnings generated'],
      },
    ],
    footer: {
      company: 'BeaverCalc Studio',
      disclaimer:
        'This calculation is for professional use only. The engineer must verify all inputs and assumptions.',
    },
  };
}

export default buildLoadSpreadReport;
