// =============================================================================
// Turning Platform Report Builder
// Vehicle Turning Platform Design — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface TurningPlatformFormData {
  projectName: string;
  reference: string;
  platformType: string;
  platformLength: number;
  platformWidth: number;
  vehicleType: string;
  vehicleWeight: number;
  axleLoad: number;
  wheelLoad: number;
  tyreContactArea: number;
  turningRadius: number;
  dynamicFactor: number;
  surfaceType: string;
  granularThickness: number;
  granularCBR: number;
  subgradeCBR: number;
  subgradeModulus: number;
  geogridType: string;
  geogridStrength: number;
  edgeDistance: number;
  slopedGround: boolean;
  slopeAngle: number;
}

export interface TurningPlatformResults {
  status: string;
  utilisation: number;
  designLoad: number;
  contactPressure: number;
  requiredThickness: number;
  providedThickness: number;
  thicknessUtilisation: number;
  bearingCapacity: number;
  appliedPressure: number;
  bearingUtilisation: number;
  settlementPredicted: number;
  settlementLimit: number;
  settlementUtilisation: number;
  edgeStability: number;
  edgeStabilityRequired: number;
  edgeUtilisation: number;
  geogridReduction: number;
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

export function buildTurningPlatformReport(
  form: TurningPlatformFormData,
  results: TurningPlatformResults,
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
      ['Edge Distance to Slope', String(form.edgeDistance || 0), 'm'],
      ['Sloped Ground', form.slopedGround ? 'Yes' : 'No', '-'],
      ['Slope Angle', String(form.slopeAngle || 0), '°'],
    ],
  };

  // Vehicle loading table
  const vehicleTable: TableInput = {
    title: 'Vehicle Loading',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Vehicle Type', form.vehicleType || '-', '-'],
      ['Gross Vehicle Weight', String(form.vehicleWeight || 0), 'kN'],
      ['Maximum Axle Load', String(form.axleLoad || 0), 'kN'],
      ['Wheel Load', String(form.wheelLoad || 0), 'kN'],
      ['Tyre Contact Area', String(form.tyreContactArea || 0), 'm²'],
      ['Turning Radius', String(form.turningRadius || 0), 'm'],
      ['Dynamic Factor', String(form.dynamicFactor || 0), '-'],
      ['Design Load (Factored)', (results.designLoad || 0).toFixed(2), 'kN'],
      ['Contact Pressure', (results.contactPressure || 0).toFixed(2), 'kPa'],
    ],
  };

  // Pavement construction table
  const pavementTable: TableInput = {
    title: 'Pavement Construction',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Granular Layer Thickness', String(form.granularThickness || 0), 'mm'],
      ['Granular CBR', String(form.granularCBR || 0), '%'],
      ['Geogrid Type', form.geogridType || 'None', '-'],
      ['Geogrid Strength', String(form.geogridStrength || 0), 'kN/m'],
      ['Geogrid Thickness Reduction', (results.geogridReduction || 0).toFixed(0), '%'],
    ],
  };

  // Subgrade properties table
  const subgradeTable: TableInput = {
    title: 'Subgrade Properties',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Subgrade CBR', String(form.subgradeCBR || 0), '%'],
      ['Subgrade Modulus', String(form.subgradeModulus || 0), 'MPa'],
    ],
  };

  // Results table
  const resultsTable: TableInput = {
    title: 'Design Results',
    headers: ['Check', 'Actual', 'Required/Limit', 'Utilisation', 'Status'],
    rows: [
      [
        'Pavement Thickness',
        `${(results.providedThickness || 0).toFixed(0)} mm`,
        `${(results.requiredThickness || 0).toFixed(0)} mm`,
        `${((results.thicknessUtilisation || 0) * 100).toFixed(1)}%`,
        (results.thicknessUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Bearing Capacity',
        `${(results.appliedPressure || 0).toFixed(1)} kPa`,
        `${(results.bearingCapacity || 0).toFixed(1)} kPa`,
        `${((results.bearingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.bearingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Settlement',
        `${(results.settlementPredicted || 0).toFixed(0)} mm`,
        `${(results.settlementLimit || 0).toFixed(0)} mm`,
        `${((results.settlementUtilisation || 0) * 100).toFixed(1)}%`,
        (results.settlementUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Edge Stability',
        `FoS = ${(results.edgeStability || 0).toFixed(2)}`,
        `FoS ≥ ${(results.edgeStabilityRequired || 1.5).toFixed(2)}`,
        `${((results.edgeUtilisation || 0) * 100).toFixed(1)}%`,
        (results.edgeUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
    ],
  };

  return {
    title: 'Vehicle Turning Platform Design',
    subtitle: 'Heavy Vehicle Manoeuvring Area Analysis',
    standard: 'TRL Report 639 & BRE SD1',
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
          'This analysis designs vehicle turning platforms for heavy construction plant and delivery vehicles. The design follows TRL Report 639 methodology and BRE SD1 guidance for working platforms. Additional considerations include dynamic loading during turning manoeuvres, edge stability near slopes, and geogrid reinforcement benefits.',
      },
      {
        title: 'Platform Geometry',
        table: geometryTable,
      },
      {
        title: 'Vehicle Loading',
        table: vehicleTable,
      },
      {
        title: 'Pavement Construction',
        table: pavementTable,
      },
      {
        title: 'Subgrade Properties',
        table: subgradeTable,
      },
      {
        title: 'Design Results',
        table: resultsTable,
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

export default buildTurningPlatformReport;
