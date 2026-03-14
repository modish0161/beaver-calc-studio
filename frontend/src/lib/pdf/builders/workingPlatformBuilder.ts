// =============================================================================
// Working Platform Report Builder
// Working Platform Design for Cranes & Plant — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface WorkingPlatformFormData {
  projectName: string;
  reference: string;
  platformType: string;
  platformLength: number;
  platformWidth: number;
  plantType: string;
  plantWeight: number;
  outriggerLoad: number;
  outriggerPadSize: number;
  outriggerSpacing: number;
  trackPressure: number;
  trackLength: number;
  trackWidth: number;
  dynamicFactor: number;
  surfaceType: string;
  granularMaterial: string;
  granularThickness: number;
  granularCBR: number;
  granularAngleOfFriction: number;
  subgradeCBR: number;
  subgradeUndrained: number;
  subgradeDrained: number;
  groundwaterDepth: number;
  geogridType: string;
  geogridStrength: number;
  numberOfLayers: number;
  edgeDistance: number;
}

export interface WorkingPlatformResults {
  status: string;
  utilisation: number;
  designLoad: number;
  designPressure: number;
  requiredThicknessUndrained: number;
  requiredThicknessDrained: number;
  requiredThickness: number;
  providedThickness: number;
  thicknessUtilisation: number;
  punchingShearCapacity: number;
  punchingShearDemand: number;
  punchingUtilisation: number;
  bearingCapacityUndrained: number;
  bearingCapacityDrained: number;
  bearingCapacity: number;
  bearingUtilisation: number;
  settlementImmediate: number;
  settlementConsolidation: number;
  settlementTotal: number;
  settlementLimit: number;
  settlementUtilisation: number;
  slopeStabilityFoS: number;
  slopeStabilityRequired: number;
  slopeUtilisation: number;
  geogridReductionFactor: number;
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

export function buildWorkingPlatformReport(
  form: WorkingPlatformFormData,
  results: WorkingPlatformResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Platform geometry table
  const geometryTable: TableInput = {
    title: 'Platform Geometry',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Platform Type', form.platformType || '-', '-'],
      ['Platform Length', String(form.platformLength || 0), 'm'],
      ['Platform Width', String(form.platformWidth || 0), 'm'],
      ['Surface Type', form.surfaceType || '-', '-'],
      ['Edge Distance to Excavation', String(form.edgeDistance || 0), 'm'],
    ],
  };

  // Plant loading table
  const plantTable: TableInput = {
    title: 'Plant Loading',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Plant Type', form.plantType || '-', '-'],
      ['Gross Plant Weight', String(form.plantWeight || 0), 'kN'],
      ['Outrigger Load', String(form.outriggerLoad || 0), 'kN'],
      ['Outrigger Pad Size', String(form.outriggerPadSize || 0), 'm × m'],
      ['Outrigger Spacing', String(form.outriggerSpacing || 0), 'm'],
      ['Track Pressure', String(form.trackPressure || 0), 'kPa'],
      ['Track Length', String(form.trackLength || 0), 'm'],
      ['Track Width', String(form.trackWidth || 0), 'm'],
      ['Dynamic Factor', String(form.dynamicFactor || 0), '-'],
      ['Design Load (Factored)', (results.designLoad || 0).toFixed(2), 'kN'],
      ['Design Pressure', (results.designPressure || 0).toFixed(2), 'kPa'],
    ],
  };

  // Platform construction table
  const constructionTable: TableInput = {
    title: 'Platform Construction',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Granular Material', form.granularMaterial || '-', '-'],
      ['Granular Thickness', String(form.granularThickness || 0), 'mm'],
      ['Granular CBR', String(form.granularCBR || 0), '%'],
      ['Granular Friction Angle', String(form.granularAngleOfFriction || 0), '°'],
      ['Geogrid Type', form.geogridType || 'None', '-'],
      ['Geogrid Strength', String(form.geogridStrength || 0), 'kN/m'],
      ['Number of Geogrid Layers', String(form.numberOfLayers || 0), '-'],
      ['Geogrid Reduction Factor', ((results.geogridReductionFactor || 1) * 100).toFixed(0), '%'],
    ],
  };

  // Subgrade properties table
  const subgradeTable: TableInput = {
    title: 'Subgrade Properties',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Subgrade CBR', String(form.subgradeCBR || 0), '%'],
      ['Undrained Shear Strength (cu)', String(form.subgradeUndrained || 0), 'kPa'],
      ['Drained Bearing Capacity', String(form.subgradeDrained || 0), 'kPa'],
      ['Groundwater Depth', String(form.groundwaterDepth || 0), 'm'],
    ],
  };

  // Thickness design table
  const thicknessTable: TableInput = {
    title: 'Thickness Design',
    headers: ['Condition', 'Required Thickness', 'Units'],
    rows: [
      ['Undrained Analysis', (results.requiredThicknessUndrained || 0).toFixed(0), 'mm'],
      ['Drained Analysis', (results.requiredThicknessDrained || 0).toFixed(0), 'mm'],
      ['Governing Requirement', (results.requiredThickness || 0).toFixed(0), 'mm'],
      ['Provided Thickness', (results.providedThickness || 0).toFixed(0), 'mm'],
    ],
  };

  // Results table
  const resultsTable: TableInput = {
    title: 'Design Results',
    headers: ['Check', 'Demand', 'Capacity', 'Utilisation', 'Status'],
    rows: [
      [
        'Platform Thickness',
        `${(results.requiredThickness || 0).toFixed(0)} mm`,
        `${(results.providedThickness || 0).toFixed(0)} mm`,
        `${((results.thicknessUtilisation || 0) * 100).toFixed(1)}%`,
        (results.thicknessUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Punching Shear',
        `${(results.punchingShearDemand || 0).toFixed(2)} kPa`,
        `${(results.punchingShearCapacity || 0).toFixed(2)} kPa`,
        `${((results.punchingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.punchingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Bearing Capacity',
        `${(results.designPressure || 0).toFixed(2)} kPa`,
        `${(results.bearingCapacity || 0).toFixed(2)} kPa`,
        `${((results.bearingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.bearingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Settlement',
        `${(results.settlementTotal || 0).toFixed(0)} mm`,
        `${(results.settlementLimit || 0).toFixed(0)} mm`,
        `${((results.settlementUtilisation || 0) * 100).toFixed(1)}%`,
        (results.settlementUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Slope Stability',
        `FoS = ${(results.slopeStabilityFoS || 0).toFixed(2)}`,
        `FoS ≥ ${(results.slopeStabilityRequired || 1.4).toFixed(2)}`,
        `${((results.slopeUtilisation || 0) * 100).toFixed(1)}%`,
        (results.slopeUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
    ],
  };

  // Settlement breakdown table
  const settlementTable: TableInput = {
    title: 'Settlement Analysis',
    headers: ['Component', 'Value', 'Units'],
    rows: [
      ['Immediate Settlement', (results.settlementImmediate || 0).toFixed(1), 'mm'],
      ['Consolidation Settlement', (results.settlementConsolidation || 0).toFixed(1), 'mm'],
      ['Total Settlement', (results.settlementTotal || 0).toFixed(1), 'mm'],
      ['Allowable Settlement', (results.settlementLimit || 0).toFixed(1), 'mm'],
    ],
  };

  return {
    title: 'Working Platform Design',
    subtitle: 'Crane & Heavy Plant Platform Analysis',
    standard: 'BRE BR470 & CIRIA C774',
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      status: results.status || 'PASS',
      critical: results.criticalCheck || 'Bearing Capacity',
      utilisation: results.utilisation || 0,
    },
    sections: [
      {
        title: 'Design Basis',
        content:
          'This analysis designs working platforms for tracked cranes and piling rigs in accordance with BRE BR470 (Working Platforms for Tracked Plant) and CIRIA C774 guidance. The design considers platform thickness requirements for both undrained and drained soil conditions, punching shear from outrigger loads, bearing capacity, settlement predictions, and slope stability near excavations.',
      },
      {
        title: 'Platform Geometry',
        table: geometryTable,
      },
      {
        title: 'Plant Loading',
        table: plantTable,
      },
      {
        title: 'Platform Construction',
        table: constructionTable,
      },
      {
        title: 'Subgrade Properties',
        table: subgradeTable,
      },
      {
        title: 'Thickness Design',
        table: thicknessTable,
      },
      {
        title: 'Design Results',
        table: resultsTable,
      },
      {
        title: 'Settlement Analysis',
        table: settlementTable,
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

export default buildWorkingPlatformReport;
