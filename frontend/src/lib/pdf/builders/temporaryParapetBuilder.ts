// =============================================================================
// Temporary Parapet Report Builder
// Temporary Edge Protection Barriers — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface TemporaryParapetFormData {
  projectName: string;
  reference: string;
  parapetType: string;
  parapetHeight: number;
  parapetLength: number;
  postSpacing: number;
  postSection: string;
  railSection: string;
  toeboardHeight: number;
  meshType: string;
  meshHeight: number;
  loadClass: string;
  horizontalLineLoad: number;
  verticalLineLoad: number;
  pointLoad: number;
  steelGrade: string;
  fixingType: string;
  fixingSpacing: number;
  anchorCapacity: number;
}

export interface TemporaryParapetResults {
  status: string;
  utilisation: number;
  postBendingMoment: number;
  postBendingCapacity: number;
  postUtilisation: number;
  railBendingMoment: number;
  railBendingCapacity: number;
  railUtilisation: number;
  postDeflection: number;
  deflectionLimit: number;
  deflectionUtilisation: number;
  baseReaction: number;
  anchorDemand: number;
  anchorCapacity: number;
  anchorUtilisation: number;
  overturningMoment: number;
  resistingMoment: number;
  overturningUtilisation: number;
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

export function buildTemporaryParapetReport(
  form: TemporaryParapetFormData,
  results: TemporaryParapetResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Parapet geometry table
  const geometryTable: TableInput = {
    title: 'Parapet Geometry',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Parapet Type', form.parapetType || '-', '-'],
      ['Parapet Height', String(form.parapetHeight || 0), 'mm'],
      ['Parapet Length', String(form.parapetLength || 0), 'm'],
      ['Post Spacing', String(form.postSpacing || 0), 'mm'],
      ['Post Section', form.postSection || '-', '-'],
      ['Rail Section', form.railSection || '-', '-'],
      ['Toeboard Height', String(form.toeboardHeight || 0), 'mm'],
      ['Mesh Type', form.meshType || 'None', '-'],
      ['Mesh Height', String(form.meshHeight || 0), 'mm'],
      ['Steel Grade', form.steelGrade || '-', '-'],
    ],
  };

  // Loading table
  const loadingTable: TableInput = {
    title: 'Applied Loading',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Load Class', form.loadClass || '-', '-'],
      ['Horizontal Line Load', String(form.horizontalLineLoad || 0), 'kN/m'],
      ['Vertical Line Load', String(form.verticalLineLoad || 0), 'kN/m'],
      ['Point Load', String(form.pointLoad || 0), 'kN'],
    ],
  };

  // Fixing details table
  const fixingTable: TableInput = {
    title: 'Fixing Details',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Fixing Type', form.fixingType || '-', '-'],
      ['Fixing Spacing', String(form.fixingSpacing || 0), 'mm'],
      ['Anchor Capacity', String(form.anchorCapacity || 0), 'kN'],
    ],
  };

  // Results table
  const resultsTable: TableInput = {
    title: 'Design Results',
    headers: ['Check', 'Demand', 'Capacity', 'Utilisation', 'Status'],
    rows: [
      [
        'Post Bending',
        `${(results.postBendingMoment || 0).toFixed(2)} kNm`,
        `${(results.postBendingCapacity || 0).toFixed(2)} kNm`,
        `${((results.postUtilisation || 0) * 100).toFixed(1)}%`,
        (results.postUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Rail Bending',
        `${(results.railBendingMoment || 0).toFixed(2)} kNm`,
        `${(results.railBendingCapacity || 0).toFixed(2)} kNm`,
        `${((results.railUtilisation || 0) * 100).toFixed(1)}%`,
        (results.railUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Post Deflection',
        `${(results.postDeflection || 0).toFixed(1)} mm`,
        `${(results.deflectionLimit || 0).toFixed(1)} mm`,
        `${((results.deflectionUtilisation || 0) * 100).toFixed(1)}%`,
        (results.deflectionUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Anchor Capacity',
        `${(results.anchorDemand || 0).toFixed(2)} kN`,
        `${(results.anchorCapacity || 0).toFixed(2)} kN`,
        `${((results.anchorUtilisation || 0) * 100).toFixed(1)}%`,
        (results.anchorUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Overturning Stability',
        `${(results.overturningMoment || 0).toFixed(2)} kNm`,
        `${(results.resistingMoment || 0).toFixed(2)} kNm`,
        `${((results.overturningUtilisation || 0) * 100).toFixed(1)}%`,
        (results.overturningUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
    ],
  };

  // Reactions table
  const reactionsTable: TableInput = {
    title: 'Base Reactions',
    headers: ['Reaction', 'Value', 'Units'],
    rows: [
      ['Base Reaction per Post', (results.baseReaction || 0).toFixed(2), 'kN'],
      ['Overturning Moment', (results.overturningMoment || 0).toFixed(2), 'kNm'],
      ['Resisting Moment', (results.resistingMoment || 0).toFixed(2), 'kNm'],
    ],
  };

  return {
    title: 'Temporary Parapet Design',
    subtitle: 'Edge Protection Barrier Analysis',
    standard: 'BS EN 13374 & BS 6399-1',
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      status: results.status || 'PASS',
      critical: results.criticalCheck || 'Post Bending',
      utilisation: results.utilisation || 0,
    },
    sections: [
      {
        title: 'Design Basis',
        content:
          'This analysis designs temporary parapet edge protection systems in accordance with BS EN 13374 for temporary edge protection systems. The design considers horizontal and vertical loads, post bending, rail bending, deflection limits, anchor capacity, and overturning stability. Load classes are selected based on the work activity and fall height.',
      },
      {
        title: 'Parapet Geometry',
        table: geometryTable,
      },
      {
        title: 'Applied Loading',
        table: loadingTable,
      },
      {
        title: 'Fixing Details',
        table: fixingTable,
      },
      {
        title: 'Design Results',
        table: resultsTable,
      },
      {
        title: 'Base Reactions',
        table: reactionsTable,
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

export default buildTemporaryParapetReport;
