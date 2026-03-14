// =============================================================================
// Haul Road Report Builder
// Construction Haul Road Design — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface HaulRoadFormData {
  projectName: string;
  reference: string;
  roadWidth: number;
  roadLength: number;
  vehicleType: string;
  axleLoad: number;
  wheelLoad: number;
  tyreContactPressure: number;
  passesPerDay: number;
  designLife: number;
  subgradeCBR: number;
  subgradeModulus: number;
  surfaceType: string;
  granularThickness: number;
  granularCBR: number;
  geogridType: string;
  loadFactor: number;
}

export interface HaulRoadResults {
  status: string;
  utilisation: number;
  requiredThickness: number;
  providedThickness: number;
  thicknessUtilisation: number;
  bearingCapacity: number;
  appliedPressure: number;
  bearingUtilisation: number;
  rutDepthPredicted: number;
  rutDepthLimit: number;
  rutDepthUtilisation: number;
  designTrafficNumber: number;
  allowableTrafficNumber: number;
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

export function buildHaulRoadReport(
  form: HaulRoadFormData,
  results: HaulRoadResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Geometry table
  const geometryTable: TableInput = {
    title: 'Road Geometry',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Road Width', String(form.roadWidth || 0), 'm'],
      ['Road Length', String(form.roadLength || 0), 'm'],
      ['Surface Type', form.surfaceType || '-', '-'],
      ['Granular Layer Thickness', String(form.granularThickness || 0), 'mm'],
      ['Granular CBR', String(form.granularCBR || 0), '%'],
      ['Geogrid Type', form.geogridType || 'None', '-'],
    ],
  };

  // Vehicle loading table
  const loadingTable: TableInput = {
    title: 'Vehicle Loading',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Vehicle Type', form.vehicleType || '-', '-'],
      ['Axle Load', String(form.axleLoad || 0), 'kN'],
      ['Wheel Load', String(form.wheelLoad || 0), 'kN'],
      ['Tyre Contact Pressure', String(form.tyreContactPressure || 0), 'kPa'],
      ['Passes Per Day', String(form.passesPerDay || 0), '-'],
      ['Design Life', String(form.designLife || 0), 'days'],
      ['Load Factor', String(form.loadFactor || 1.0), '-'],
    ],
  };

  // Subgrade table
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
        'Rut Depth',
        `${(results.rutDepthPredicted || 0).toFixed(0)} mm`,
        `${(results.rutDepthLimit || 0).toFixed(0)} mm`,
        `${((results.rutDepthUtilisation || 0) * 100).toFixed(1)}%`,
        (results.rutDepthUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Traffic Capacity',
        `${(results.designTrafficNumber || 0).toFixed(0)}`,
        `${(results.allowableTrafficNumber || 0).toFixed(0)}`,
        `${(((results.designTrafficNumber || 0) / (results.allowableTrafficNumber || 1)) * 100).toFixed(1)}%`,
        (results.designTrafficNumber || 0) <= (results.allowableTrafficNumber || 0)
          ? 'PASS'
          : 'FAIL',
      ],
    ],
  };

  return {
    title: 'Construction Haul Road Design',
    subtitle: 'Temporary Access Road Pavement Analysis',
    standard: 'TRL Report 639 & BRE SD1',
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      status: results.status || 'PASS',
      critical: results.criticalCheck || 'Pavement Thickness',
      utilisation: results.utilisation || 0,
    },
    sections: [
      {
        title: 'Design Basis',
        content:
          'This analysis designs temporary construction haul roads for heavy plant and vehicle traffic. The design follows TRL Report 639 methodology for unpaved roads and considers subgrade CBR, traffic loading, and required pavement thickness. Geogrid reinforcement benefits are incorporated where applicable.',
      },
      {
        title: 'Road Geometry',
        table: geometryTable,
      },
      {
        title: 'Vehicle Loading',
        table: loadingTable,
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

export default buildHaulRoadReport;
