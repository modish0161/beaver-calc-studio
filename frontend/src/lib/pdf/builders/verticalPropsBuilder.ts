// =============================================================================
// Vertical Props Report Builder
// Vertical Propping & Shores Analysis — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface VerticalPropsFormData {
  projectName: string;
  reference: string;
  propType: string;
  propSection: string;
  propHeight: number;
  numberOfProps: number;
  propSpacingX: number;
  propSpacingY: number;
  totalLoad: number;
  loadPerProp: number;
  loadType: string;
  eccentricity: number;
  steelGrade: string;
  topPlateSize: string;
  bottomPlateSize: string;
  effectiveLengthFactorX: number;
  effectiveLengthFactorY: number;
  baseCondition: string;
  headCondition: string;
  groundBearing: number;
  adjustmentRange: number;
}

export interface VerticalPropsResults {
  status: string;
  utilisation: number;
  axialForce: number;
  axialCapacity: number;
  axialUtilisation: number;
  effectiveLengthX: number;
  effectiveLengthY: number;
  slendernessX: number;
  slendernessY: number;
  criticalSlenderness: number;
  bucklingCapacityX: number;
  bucklingCapacityY: number;
  bucklingCapacity: number;
  bucklingUtilisation: number;
  combinedUtilisation: number;
  basePressure: number;
  baseBearingCapacity: number;
  bearingUtilisation: number;
  topPlateCapacity: number;
  bottomPlateCapacity: number;
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

export function buildVerticalPropsReport(
  form: VerticalPropsFormData,
  results: VerticalPropsResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  // Prop details table
  const propTable: TableInput = {
    title: 'Prop Details',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Prop Type', form.propType || '-', '-'],
      ['Prop Section', form.propSection || '-', '-'],
      ['Prop Height', String(form.propHeight || 0), 'm'],
      ['Number of Props', String(form.numberOfProps || 0), '-'],
      ['Prop Spacing X', String(form.propSpacingX || 0), 'm'],
      ['Prop Spacing Y', String(form.propSpacingY || 0), 'm'],
      ['Steel Grade', form.steelGrade || '-', '-'],
      ['Adjustment Range', String(form.adjustmentRange || 0), 'mm'],
    ],
  };

  // Loading table
  const loadingTable: TableInput = {
    title: 'Applied Loading',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Load Type', form.loadType || '-', '-'],
      ['Total Load Supported', String(form.totalLoad || 0), 'kN'],
      ['Load per Prop', String(form.loadPerProp || 0), 'kN'],
      ['Load Eccentricity', String(form.eccentricity || 0), 'mm'],
    ],
  };

  // End conditions table
  const endConditionsTable: TableInput = {
    title: 'End Conditions & Plates',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Head Condition', form.headCondition || '-', '-'],
      ['Base Condition', form.baseCondition || '-', '-'],
      ['Top Plate Size', form.topPlateSize || '-', '-'],
      ['Bottom Plate Size', form.bottomPlateSize || '-', '-'],
      ['Effective Length Factor (X)', String(form.effectiveLengthFactorX || 0), '-'],
      ['Effective Length Factor (Y)', String(form.effectiveLengthFactorY || 0), '-'],
      ['Ground Bearing Capacity', String(form.groundBearing || 0), 'kPa'],
    ],
  };

  // Buckling analysis table
  const bucklingTable: TableInput = {
    title: 'Buckling Analysis',
    headers: ['Parameter', 'X-axis', 'Y-axis', 'Units'],
    rows: [
      [
        'Effective Length',
        (results.effectiveLengthX || 0).toFixed(2),
        (results.effectiveLengthY || 0).toFixed(2),
        'm',
      ],
      [
        'Slenderness Ratio',
        (results.slendernessX || 0).toFixed(1),
        (results.slendernessY || 0).toFixed(1),
        '-',
      ],
      [
        'Buckling Capacity',
        (results.bucklingCapacityX || 0).toFixed(2),
        (results.bucklingCapacityY || 0).toFixed(2),
        'kN',
      ],
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
        'Combined Actions',
        'N/A',
        'N/A',
        `${((results.combinedUtilisation || 0) * 100).toFixed(1)}%`,
        (results.combinedUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
      [
        'Base Bearing',
        `${(results.basePressure || 0).toFixed(2)} kPa`,
        `${(results.baseBearingCapacity || 0).toFixed(2)} kPa`,
        `${((results.bearingUtilisation || 0) * 100).toFixed(1)}%`,
        (results.bearingUtilisation || 0) <= 1.0 ? 'PASS' : 'FAIL',
      ],
    ],
  };

  // Summary table
  const summaryTable: TableInput = {
    title: 'Design Summary',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Critical Slenderness Ratio', (results.criticalSlenderness || 0).toFixed(1), '-'],
      ['Governing Buckling Capacity', (results.bucklingCapacity || 0).toFixed(2), 'kN'],
      ['Safe Working Load per Prop', ((results.bucklingCapacity || 0) / 1.5).toFixed(2), 'kN'],
    ],
  };

  return {
    title: 'Vertical Props Design',
    subtitle: 'Temporary Vertical Shore Analysis',
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
          'This analysis designs vertical props (shores) used for temporary support of slabs, beams, or formwork. The design follows BS EN 1993-1-1 for steel member design and BS 5975 for temporary works. Checks include axial compression, buckling resistance about both axes, combined actions with eccentricity, and base bearing capacity.',
      },
      {
        title: 'Prop Details',
        table: propTable,
      },
      {
        title: 'Applied Loading',
        table: loadingTable,
      },
      {
        title: 'End Conditions & Plates',
        table: endConditionsTable,
      },
      {
        title: 'Buckling Analysis',
        table: bucklingTable,
      },
      {
        title: 'Design Results',
        table: resultsTable,
      },
      {
        title: 'Design Summary',
        table: summaryTable,
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

export default buildVerticalPropsReport;
