// =============================================================================
// Spread Footing Report Builder
// Spread Foundation Design — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface SpreadFootingFormData {
  projectName: string;
  reference: string;
  footingType: string;
  footingLength: number;
  footingWidth: number;
  footingDepth: number;
  baseDepth: number;
  columnLength: number;
  columnWidth: number;
  concreteGrade: string;
  rebarGrade: string;
  coverTop: number;
  coverBottom: number;
  axialLoad: number;
  momentX: number;
  momentY: number;
  shearX: number;
  shearY: number;
  soilBearingCapacity: number;
  soilUnitWeight: number;
  groundwaterDepth: number;
  loadCombination: string;
}

export interface SpreadFootingResults {
  status: string;
  utilisation: number;
  eccentricityX: number;
  eccentricityY: number;
  effectiveLength: number;
  effectiveWidth: number;
  effectiveArea: number;
  maxBearingPressure: number;
  minBearingPressure: number;
  bearingUtilisation: number;
  punchingShearDemand: number;
  punchingShearCapacity: number;
  punchingUtilisation: number;
  beamShearDemand: number;
  beamShearCapacity: number;
  beamShearUtilisation: number;
  momentDemandX: number;
  momentCapacityX: number;
  flexureUtilisationX: number;
  momentDemandY: number;
  momentCapacityY: number;
  flexureUtilisationY: number;
  rebarAreaX: number;
  rebarAreaY: number;
  rebarProvided: string;
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

export function buildSpreadFootingReport(
  form: SpreadFootingFormData,
  results: SpreadFootingResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Footing geometry table
  const geometryTable: TableInput = {
    title: 'Footing Geometry',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Footing Type', form.footingType || '-', '-'],
      ['Footing Length (L)', String(form.footingLength || 0), 'm'],
      ['Footing Width (B)', String(form.footingWidth || 0), 'm'],
      ['Footing Depth (h)', String(form.footingDepth || 0), 'm'],
      ['Base Depth Below GL', String(form.baseDepth || 0), 'm'],
      ['Column Length', String(form.columnLength || 0), 'm'],
      ['Column Width', String(form.columnWidth || 0), 'm'],
    ],
  };

  // Material properties table
  const materialTable: TableInput = {
    title: 'Material Properties',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Concrete Grade', form.concreteGrade || '-', '-'],
      ['Rebar Grade', form.rebarGrade || '-', '-'],
      ['Cover to Top Reinforcement', String(form.coverTop || 0), 'mm'],
      ['Cover to Bottom Reinforcement', String(form.coverBottom || 0), 'mm'],
    ],
  };

  // Applied loads table
  const loadingTable: TableInput = {
    title: 'Applied Loads',
    headers: ['Load', 'Value', 'Units'],
    rows: [
      ['Load Combination', form.loadCombination || '-', '-'],
      ['Axial Load (N)', String(form.axialLoad || 0), 'kN'],
      ['Moment about X-axis (Mx)', String(form.momentX || 0), 'kNm'],
      ['Moment about Y-axis (My)', String(form.momentY || 0), 'kNm'],
      ['Shear in X-direction (Vx)', String(form.shearX || 0), 'kN'],
      ['Shear in Y-direction (Vy)', String(form.shearY || 0), 'kN'],
    ],
  };

  // Soil properties table
  const soilTable: TableInput = {
    title: 'Soil Properties',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Allowable Bearing Capacity', String(form.soilBearingCapacity || 0), 'kPa'],
      ['Soil Unit Weight', String(form.soilUnitWeight || 0), 'kN/m³'],
      ['Groundwater Depth', String(form.groundwaterDepth || 0), 'm'],
    ],
  };

  // Bearing pressure results table
  const bearingTable: TableInput = {
    title: 'Bearing Pressure Analysis',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Eccentricity X (ex)', (results.eccentricityX || 0).toFixed(3), 'm'],
      ['Eccentricity Y (ey)', (results.eccentricityY || 0).toFixed(3), 'm'],
      ["Effective Length (L')", (results.effectiveLength || 0).toFixed(3), 'm'],
      ["Effective Width (B')", (results.effectiveWidth || 0).toFixed(3), 'm'],
      ["Effective Area (A')", (results.effectiveArea || 0).toFixed(3), 'm²'],
      ['Maximum Bearing Pressure', (results.maxBearingPressure || 0).toFixed(2), 'kPa'],
      ['Minimum Bearing Pressure', (results.minBearingPressure || 0).toFixed(2), 'kPa'],
    ],
  };

  // Structural design results table
  const resultsTable: TableInput = {
    title: 'Structural Design Results',
    headers: ['Check', 'Demand', 'Capacity', 'Utilisation', 'Status'],
    rows: [
      [
        'Bearing Capacity',
        `${(results.maxBearingPressure || 0).toFixed(2)} kPa`,
        `${(form.soilBearingCapacity || 0).toFixed(2)} kPa`,
        `${((results.bearingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.bearingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Punching Shear',
        `${(results.punchingShearDemand || 0).toFixed(2)} kN`,
        `${(results.punchingShearCapacity || 0).toFixed(2)} kN`,
        `${((results.punchingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.punchingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Beam Shear',
        `${(results.beamShearDemand || 0).toFixed(2)} kN`,
        `${(results.beamShearCapacity || 0).toFixed(2)} kN`,
        `${((results.beamShearUtilisation || 0) * 100).toFixed(1)}%`,
        (results.beamShearUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Flexure (X-axis)',
        `${(results.momentDemandX || 0).toFixed(2)} kNm`,
        `${(results.momentCapacityX || 0).toFixed(2)} kNm`,
        `${((results.flexureUtilisationX || 0) * 100).toFixed(1)}%`,
        (results.flexureUtilisationX || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Flexure (Y-axis)',
        `${(results.momentDemandY || 0).toFixed(2)} kNm`,
        `${(results.momentCapacityY || 0).toFixed(2)} kNm`,
        `${((results.flexureUtilisationY || 0) * 100).toFixed(1)}%`,
        (results.flexureUtilisationY || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
    ],
  };

  // Reinforcement table
  const rebarTable: TableInput = {
    title: 'Reinforcement Design',
    headers: ['Direction', 'Required Area', 'Provided'],
    rows: [
      [
        'X-direction',
        `${(results.rebarAreaX || 0).toFixed(0)} mm²/m`,
        results.rebarProvided || '-',
      ],
      [
        'Y-direction',
        `${(results.rebarAreaY || 0).toFixed(0)} mm²/m`,
        results.rebarProvided || '-',
      ],
    ],
  };

  return {
    title: 'Spread Footing Design',
    subtitle: 'Shallow Foundation Analysis & Design',
    standard: 'BS EN 1992-1-1 & BS EN 1997-1',
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
          'This analysis designs a spread footing foundation in accordance with BS EN 1992-1-1 for structural concrete design and BS EN 1997-1 for geotechnical design. The analysis includes bearing capacity verification, punching shear, beam shear, and flexural design with reinforcement sizing.',
      },
      {
        title: 'Footing Geometry',
        table: geometryTable,
      },
      {
        title: 'Material Properties',
        table: materialTable,
      },
      {
        title: 'Applied Loads',
        table: loadingTable,
      },
      {
        title: 'Soil Properties',
        table: soilTable,
      },
      {
        title: 'Bearing Pressure Analysis',
        table: bearingTable,
      },
      {
        title: 'Structural Design Results',
        table: resultsTable,
      },
      {
        title: 'Reinforcement Design',
        table: rebarTable,
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

export default buildSpreadFootingReport;
