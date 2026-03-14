// =============================================================================
// Trench Support Report Builder
// Trench Shoring Systems — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface TrenchSupportFormData {
  projectName: string;
  reference: string;
  supportType: string;
  trenchDepth: number;
  trenchWidth: number;
  trenchLength: number;
  soilType: string;
  soilUnitWeight: number;
  soilCohesion: number;
  soilFrictionAngle: number;
  waterTableDepth: number;
  surchargeLoad: number;
  surchargeDistance: number;
  sheetingType: string;
  sheetingThickness: number;
  walingSection: string;
  walingSpacing: number;
  strutSection: string;
  strutSpacing: number;
  strutPreload: number;
  steelGrade: string;
}

export interface TrenchSupportResults {
  status: string;
  utilisation: number;
  activePressureCoeff: number;
  lateralPressure: number;
  totalThrust: number;
  sheetingBendingMoment: number;
  sheetingBendingCapacity: number;
  sheetingUtilisation: number;
  walingBendingMoment: number;
  walingBendingCapacity: number;
  walingUtilisation: number;
  strutForce: number;
  strutCapacity: number;
  strutUtilisation: number;
  strutBucklingCapacity: number;
  strutBucklingUtilisation: number;
  baseHeaveFactorOfSafety: number;
  baseHeaveRequired: number;
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

export function buildTrenchSupportReport(
  form: TrenchSupportFormData,
  results: TrenchSupportResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Trench geometry table
  const geometryTable: TableInput = {
    title: 'Trench Geometry',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Support Type', form.supportType || '-', '-'],
      ['Trench Depth', String(form.trenchDepth || 0), 'm'],
      ['Trench Width', String(form.trenchWidth || 0), 'm'],
      ['Trench Length', String(form.trenchLength || 0), 'm'],
    ],
  };

  // Soil properties table
  const soilTable: TableInput = {
    title: 'Soil Properties',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Soil Type', form.soilType || '-', '-'],
      ['Soil Unit Weight (γ)', String(form.soilUnitWeight || 0), 'kN/m³'],
      ["Cohesion (c')", String(form.soilCohesion || 0), 'kPa'],
      ["Friction Angle (φ')", String(form.soilFrictionAngle || 0), '°'],
      ['Water Table Depth', String(form.waterTableDepth || 0), 'm'],
      ['Active Pressure Coefficient (Ka)', (results.activePressureCoeff || 0).toFixed(3), '-'],
    ],
  };

  // Surcharge table
  const surchargeTable: TableInput = {
    title: 'Surcharge Loading',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Surcharge Load', String(form.surchargeLoad || 0), 'kPa'],
      ['Surcharge Distance from Edge', String(form.surchargeDistance || 0), 'm'],
    ],
  };

  // Support system table
  const supportTable: TableInput = {
    title: 'Support System',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Sheeting Type', form.sheetingType || '-', '-'],
      ['Sheeting Thickness', String(form.sheetingThickness || 0), 'mm'],
      ['Waling Section', form.walingSection || '-', '-'],
      ['Waling Vertical Spacing', String(form.walingSpacing || 0), 'm'],
      ['Strut Section', form.strutSection || '-', '-'],
      ['Strut Horizontal Spacing', String(form.strutSpacing || 0), 'm'],
      ['Strut Preload', String(form.strutPreload || 0), 'kN'],
      ['Steel Grade', form.steelGrade || '-', '-'],
    ],
  };

  // Earth pressure results table
  const pressureTable: TableInput = {
    title: 'Earth Pressure Analysis',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Maximum Lateral Pressure', (results.lateralPressure || 0).toFixed(2), 'kPa'],
      ['Total Thrust per metre', (results.totalThrust || 0).toFixed(2), 'kN/m'],
    ],
  };

  // Results table
  const resultsTable: TableInput = {
    title: 'Design Results',
    headers: ['Check', 'Demand', 'Capacity', 'Utilisation', 'Status'],
    rows: [
      [
        'Sheeting Bending',
        `${(results.sheetingBendingMoment || 0).toFixed(2)} kNm/m`,
        `${(results.sheetingBendingCapacity || 0).toFixed(2)} kNm/m`,
        `${((results.sheetingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.sheetingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Waling Bending',
        `${(results.walingBendingMoment || 0).toFixed(2)} kNm`,
        `${(results.walingBendingCapacity || 0).toFixed(2)} kNm`,
        `${((results.walingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.walingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Strut Axial',
        `${(results.strutForce || 0).toFixed(2)} kN`,
        `${(results.strutCapacity || 0).toFixed(2)} kN`,
        `${((results.strutUtilisation || 0) * 100).toFixed(1)}%`,
        (results.strutUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Strut Buckling',
        `${(results.strutForce || 0).toFixed(2)} kN`,
        `${(results.strutBucklingCapacity || 0).toFixed(2)} kN`,
        `${((results.strutBucklingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.strutBucklingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Base Heave Stability',
        `FoS = ${(results.baseHeaveFactorOfSafety || 0).toFixed(2)}`,
        `FoS ≥ ${(results.baseHeaveRequired || 1.5).toFixed(2)}`,
        `${(((results.baseHeaveRequired || 1.5) / (results.baseHeaveFactorOfSafety || 1)) * 100).toFixed(1)}%`,
        (results.baseHeaveFactorOfSafety || 0) >= (results.baseHeaveRequired || 1.5)
          ? 'PASS'
          : 'FAIL',
      ],
    ],
  };

  return {
    title: 'Trench Support Design',
    subtitle: 'Excavation Shoring System Analysis',
    standard: 'BS 6031 & BS EN 1997-1',
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      status: results.status || 'PASS',
      critical: results.criticalCheck || 'Strut Buckling',
      utilisation: results.utilisation || 0,
    },
    sections: [
      {
        title: 'Design Basis',
        content:
          'This analysis designs temporary trench support systems in accordance with BS 6031 Code of Practice for Earthworks and BS EN 1997-1 for geotechnical design. The analysis includes earth pressure calculations, sheeting design, waling design, strut design with buckling checks, and base heave stability verification.',
      },
      {
        title: 'Trench Geometry',
        table: geometryTable,
      },
      {
        title: 'Soil Properties',
        table: soilTable,
      },
      {
        title: 'Surcharge Loading',
        table: surchargeTable,
      },
      {
        title: 'Support System',
        table: supportTable,
      },
      {
        title: 'Earth Pressure Analysis',
        table: pressureTable,
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

export default buildTrenchSupportReport;
