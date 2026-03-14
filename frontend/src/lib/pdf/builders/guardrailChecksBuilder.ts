// =============================================================================
// Guardrail Checks Report Builder
// Edge Protection & Barrier Systems Analysis — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface GuardrailChecksFormData {
  projectName: string;
  reference: string;
  guardrailType: string;
  postSpacing: number;
  postHeight: number;
  postSection: string;
  railSection: string;
  infillType: string;
  loadCase: string;
  horizontalLoad: number;
  verticalLoad: number;
  steelGrade: string;
  fixingType: string;
  baseThickness: number;
}

export interface GuardrailChecksResults {
  status: string;
  utilisation: number;
  postBendingCapacity: number;
  postBendingDemand: number;
  postUtilisation: number;
  railBendingCapacity: number;
  railBendingDemand: number;
  railUtilisation: number;
  deflectionActual: number;
  deflectionLimit: number;
  deflectionUtilisation: number;
  fixingCapacity: number;
  fixingDemand: number;
  fixingUtilisation: number;
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

export function buildGuardrailChecksReport(
  form: GuardrailChecksFormData,
  results: GuardrailChecksResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Input parameters table
  const inputTable: TableInput = {
    title: 'Input Parameters',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Guardrail Type', form.guardrailType || '-', '-'],
      ['Post Spacing', String(form.postSpacing || 0), 'mm'],
      ['Post Height', String(form.postHeight || 0), 'mm'],
      ['Post Section', form.postSection || '-', '-'],
      ['Rail Section', form.railSection || '-', '-'],
      ['Infill Type', form.infillType || '-', '-'],
      ['Steel Grade', form.steelGrade || '-', '-'],
      ['Fixing Type', form.fixingType || '-', '-'],
      ['Base Plate Thickness', String(form.baseThickness || 0), 'mm'],
    ],
  };

  // Loading table
  const loadingTable: TableInput = {
    title: 'Applied Loading',
    headers: ['Load Type', 'Value', 'Units'],
    rows: [
      ['Load Case', form.loadCase || '-', '-'],
      ['Horizontal Line Load', String(form.horizontalLoad || 0), 'kN/m'],
      ['Vertical Line Load', String(form.verticalLoad || 0), 'kN/m'],
    ],
  };

  // Results table
  const resultsTable: TableInput = {
    title: 'Design Results',
    headers: ['Check', 'Demand', 'Capacity', 'Utilisation', 'Status'],
    rows: [
      [
        'Post Bending',
        `${(results.postBendingDemand || 0).toFixed(2)} kNm`,
        `${(results.postBendingCapacity || 0).toFixed(2)} kNm`,
        `${((results.postUtilisation || 0) * 100).toFixed(1)}%`,
        (results.postUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Rail Bending',
        `${(results.railBendingDemand || 0).toFixed(2)} kNm`,
        `${(results.railBendingCapacity || 0).toFixed(2)} kNm`,
        `${((results.railUtilisation || 0) * 100).toFixed(1)}%`,
        (results.railUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Post Deflection',
        `${(results.deflectionActual || 0).toFixed(1)} mm`,
        `${(results.deflectionLimit || 0).toFixed(1)} mm`,
        `${((results.deflectionUtilisation || 0) * 100).toFixed(1)}%`,
        (results.deflectionUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Fixing Capacity',
        `${(results.fixingDemand || 0).toFixed(2)} kN`,
        `${(results.fixingCapacity || 0).toFixed(2)} kN`,
        `${((results.fixingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.fixingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
    ],
  };

  return {
    title: 'Guardrail & Edge Protection Design',
    subtitle: 'Barrier System Structural Adequacy Check',
    standard: 'BS EN 13374 & BS 6180',
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
          'This analysis checks the structural adequacy of temporary edge protection guardrail systems in accordance with BS EN 13374 for temporary edge protection and BS 6180 for permanent barriers. The design considers horizontal and vertical loads applied to the top rail, with checks for post bending, rail bending, deflection limits, and fixing capacity.',
      },
      {
        title: 'Input Parameters',
        table: inputTable,
      },
      {
        title: 'Applied Loading',
        table: loadingTable,
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

export default buildGuardrailChecksReport;
