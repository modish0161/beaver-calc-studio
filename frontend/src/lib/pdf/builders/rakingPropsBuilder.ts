// =============================================================================
// Raking Props Report Builder
// Inclined Propping & Shoring Analysis — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface RakingPropsFormData {
  projectName: string;
  reference: string;
  propType: string;
  propSection: string;
  propLength: number;
  propAngle: number;
  wallHeight: number;
  horizontalLoad: number;
  loadType: string;
  propSpacing: number;
  numberOfProps: number;
  steelGrade: string;
  topConnectionType: string;
  baseConnectionType: string;
  solePlateSize: string;
  groundBearing: number;
  effectiveLengthFactor: number;
}

export interface RakingPropsResults {
  status: string;
  utilisation: number;
  axialForce: number;
  axialCapacity: number;
  axialUtilisation: number;
  bucklingCapacity: number;
  bucklingUtilisation: number;
  horizontalReaction: number;
  verticalReaction: number;
  baseBearingPressure: number;
  baseBearingCapacity: number;
  bearingUtilisation: number;
  connectionForce: number;
  connectionCapacity: number;
  connectionUtilisation: number;
  slenderness: number;
  effectiveLength: number;
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

export function buildRakingPropsReport(
  form: RakingPropsFormData,
  results: RakingPropsResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Prop geometry table
  const geometryTable: TableInput = {
    title: 'Prop Geometry',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Prop Type', form.propType || '-', '-'],
      ['Prop Section', form.propSection || '-', '-'],
      ['Prop Length', String(form.propLength || 0), 'm'],
      ['Prop Angle to Horizontal', String(form.propAngle || 0), '°'],
      ['Wall Height Supported', String(form.wallHeight || 0), 'm'],
      ['Prop Spacing', String(form.propSpacing || 0), 'm'],
      ['Number of Props', String(form.numberOfProps || 0), '-'],
      ['Steel Grade', form.steelGrade || '-', '-'],
    ],
  };

  // Loading table
  const loadingTable: TableInput = {
    title: 'Applied Loading',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Load Type', form.loadType || '-', '-'],
      ['Horizontal Load per Prop', String(form.horizontalLoad || 0), 'kN'],
      ['Prop Axial Force', (results.axialForce || 0).toFixed(2), 'kN'],
      ['Horizontal Reaction', (results.horizontalReaction || 0).toFixed(2), 'kN'],
      ['Vertical Reaction', (results.verticalReaction || 0).toFixed(2), 'kN'],
    ],
  };

  // Connection details table
  const connectionTable: TableInput = {
    title: 'Connection Details',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Top Connection Type', form.topConnectionType || '-', '-'],
      ['Base Connection Type', form.baseConnectionType || '-', '-'],
      ['Sole Plate Size', form.solePlateSize || '-', '-'],
      ['Effective Length Factor', String(form.effectiveLengthFactor || 0), '-'],
      ['Effective Length', (results.effectiveLength || 0).toFixed(2), 'm'],
      ['Slenderness Ratio', (results.slenderness || 0).toFixed(1), '-'],
    ],
  };

  // Results table
  const resultsTable: TableInput = {
    title: 'Design Results',
    headers: ['Check', 'Demand', 'Capacity', 'Utilisation', 'Status'],
    rows: [
      [
        'Axial Compression',
        `${(results.axialForce || 0).toFixed(2)} kN`,
        `${(results.axialCapacity || 0).toFixed(2)} kN`,
        `${((results.axialUtilisation || 0) * 100).toFixed(1)}%`,
        (results.axialUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Buckling Resistance',
        `${(results.axialForce || 0).toFixed(2)} kN`,
        `${(results.bucklingCapacity || 0).toFixed(2)} kN`,
        `${((results.bucklingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.bucklingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Base Bearing',
        `${(results.baseBearingPressure || 0).toFixed(2)} kPa`,
        `${(results.baseBearingCapacity || 0).toFixed(2)} kPa`,
        `${((results.bearingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.bearingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Connection Capacity',
        `${(results.connectionForce || 0).toFixed(2)} kN`,
        `${(results.connectionCapacity || 0).toFixed(2)} kN`,
        `${((results.connectionUtilisation || 0) * 100).toFixed(1)}%`,
        (results.connectionUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
    ],
  };

  return {
    title: 'Raking Props Design',
    subtitle: 'Inclined Propping & Shoring Analysis',
    standard: 'BS EN 1993-1-1 & BS 5975',
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      status: results.status || 'PASS',
      critical: results.criticalCheck || 'Buckling Resistance',
      utilisation: results.utilisation || 0,
    },
    sections: [
      {
        title: 'Design Basis',
        content:
          'This analysis designs inclined (raking) props used for temporary lateral support of walls, facades, or excavations. The design follows BS EN 1993-1-1 for steel member design and BS 5975 for temporary works. Checks include axial compression, buckling resistance, base bearing pressure, and connection capacity.',
      },
      {
        title: 'Prop Geometry',
        table: geometryTable,
      },
      {
        title: 'Applied Loading',
        table: loadingTable,
      },
      {
        title: 'Connection Details',
        table: connectionTable,
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

export default buildRakingPropsReport;
