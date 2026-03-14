// =============================================================================
// Needle Beam Design Report Builder
// Steel needle beam design for masonry wall support — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface NeedleBeamFormData {
  sectionKey: string;
  span: string;
  wallLoad: string;
  wallThickness: string;
  wallHeight: string;
  numNeedles: string;
  needleSpacing: string;
  designStrength: string;
  deflectionLimit: string;
  customIx: string;
  customZx: string;
  customDepth: string;
}

export interface NeedleBeamResults {
  moment: number;
  shear: number;
  stress: number;
  deflection: number;
  allowableDeflection: number;
  utilisationStress: number;
  utilisationDeflection: number;
  loadPerNeedle: number;
  requiredIx: number;
  overallStatus: 'PASS' | 'FAIL';
  stressStatus: 'PASS' | 'FAIL';
  deflectionStatus: 'PASS' | 'FAIL';
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

const BEAM_SECTIONS: Record<string, { name: string }> = {
  '127x76x13UB': { name: '127×76×13 UB' },
  '152x89x16UB': { name: '152×89×16 UB' },
  '178x102x19UB': { name: '178×102×19 UB' },
  '203x102x23UB': { name: '203×102×23 UB' },
  '203x133x25UB': { name: '203×133×25 UB' },
  '254x102x22UB': { name: '254×102×22 UB' },
  '254x102x25UB': { name: '254×102×25 UB' },
  '254x146x31UB': { name: '254×146×31 UB' },
  '305x102x25UB': { name: '305×102×25 UB' },
  '305x127x37UB': { name: '305×127×37 UB' },
  '305x165x40UB': { name: '305×165×40 UB' },
  '356x127x33UB': { name: '356×127×33 UB' },
  '356x171x45UB': { name: '356×171×45 UB' },
  '152x152x23UC': { name: '152×152×23 UC' },
  '152x152x30UC': { name: '152×152×30 UC' },
  '203x203x46UC': { name: '203×203×46 UC' },
  '203x203x60UC': { name: '203×203×60 UC' },
  custom: { name: 'Custom Section' },
};

export function buildNeedleBeamReport(
  form: NeedleBeamFormData,
  results: NeedleBeamResults,
  warnings: Warning[],
  project: ProjectInfo,
): ReportData {
  const sectionName = BEAM_SECTIONS[form.sectionKey]?.name || form.sectionKey;
  const span = parseFloat(form.span) || 0;
  const numNeedles = parseInt(form.numNeedles) || 2;
  const needleSpacing = parseFloat(form.needleSpacing) || 1.5;
  const wallLoad = parseFloat(form.wallLoad) || 0;
  const wallThickness = parseFloat(form.wallThickness) || 0;
  const wallHeight = parseFloat(form.wallHeight) || 0;
  const designStrength = parseFloat(form.designStrength) || 275;
  const deflectionLimit = parseFloat(form.deflectionLimit) || 360;

  // Input parameters table
  const inputTable: TableInput = {
    title: 'Input Parameters',
    headers: ['Parameter', 'Value', 'Units'],
    rows: [
      ['Beam Section', sectionName, '—'],
      ['Needle Span', span.toFixed(3), 'm'],
      ['Number of Needles', numNeedles.toString(), '—'],
      ['Needle Spacing', needleSpacing.toFixed(3), 'm'],
      ['Wall Line Load', wallLoad.toFixed(1), 'kN/m'],
      ['Wall Thickness', wallThickness.toFixed(0), 'mm'],
      ['Wall Height', wallHeight.toFixed(2), 'm'],
      ['Design Strength (fy)', designStrength.toFixed(0), 'N/mm²'],
      ['Deflection Limit (L/)', deflectionLimit.toFixed(0), '—'],
    ],
  };

  // Loading calculation table
  const loadingTable: TableInput = {
    title: 'Loading Analysis',
    headers: ['Load Component', 'Value', 'Units', 'Reference'],
    rows: [
      ['Wall Line Load', wallLoad.toFixed(2), 'kN/m', 'Input'],
      [
        'Load per Needle',
        results.loadPerNeedle.toFixed(2),
        'kN',
        `${wallLoad.toFixed(1)} × ${needleSpacing.toFixed(2)}`,
      ],
      ['Design Moment', results.moment.toFixed(2), 'kNm', 'Simple beam formula'],
      ['Design Shear', results.shear.toFixed(2), 'kN', 'V = wL/2'],
    ],
  };

  // Section capacity table
  const capacityTable: TableInput = {
    title: 'Section Capacity Checks',
    headers: ['Check', 'Applied', 'Capacity/Limit', 'Utilisation', 'Status'],
    rows: [
      [
        'Bending Stress',
        `${results.stress.toFixed(1)} N/mm²`,
        `${designStrength.toFixed(0)} N/mm²`,
        `${(results.utilisationStress * 100).toFixed(1)}%`,
        results.stressStatus,
      ],
      [
        'Deflection',
        `${results.deflection.toFixed(2)} mm`,
        `${results.allowableDeflection.toFixed(2)} mm`,
        `${(results.utilisationDeflection * 100).toFixed(1)}%`,
        results.deflectionStatus,
      ],
    ],
  };

  // Requirements table
  const requirementsTable: TableInput = {
    title: 'Section Requirements',
    headers: ['Requirement', 'Value', 'Units', 'Notes'],
    rows: [
      ['Required Ix', results.requiredIx.toFixed(0), 'cm⁴', 'For deflection limit'],
      [
        'Allowable Deflection',
        results.allowableDeflection.toFixed(2),
        'mm',
        `L/${deflectionLimit}`,
      ],
    ],
  };

  // Summary table
  const summaryTable: TableInput = {
    title: 'Design Summary',
    headers: ['Parameter', 'Value', 'Status'],
    rows: [
      [
        'Stress Utilisation',
        `${(results.utilisationStress * 100).toFixed(1)}%`,
        results.stressStatus,
      ],
      [
        'Deflection Utilisation',
        `${(results.utilisationDeflection * 100).toFixed(1)}%`,
        results.deflectionStatus,
      ],
      ['Overall Design', results.overallStatus, results.overallStatus],
    ],
  };

  // Warnings list
  const warningItems =
    warnings.length > 0
      ? warnings.map((w) => `[${w.type.toUpperCase()}] ${w.message}`)
      : ['No warnings generated'];

  return {
    title: 'Needle Beam Design',
    subtitle: 'Steel Needle Support for Masonry Wall',
    standard: 'BS EN 1993-1-1 Eurocode 3 — Steel Structures',
    project: {
      name: project.projectName,
      client: project.clientName,
      preparedBy: project.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      status: results.overallStatus === 'PASS' ? 'PASS' : 'FAIL',
      critical:
        results.utilisationStress > results.utilisationDeflection ? 'Bending Stress' : 'Deflection',
      utilisation: Math.max(results.utilisationStress, results.utilisationDeflection),
    },
    sections: [
      {
        title: 'Design Basis',
        content: `This calculation assesses the structural adequacy of ${sectionName} steel needle beams for temporary support of a ${wallThickness}mm thick masonry wall during alteration works. The design follows BS EN 1993-1-1 (Eurocode 3) with appropriate partial safety factors for temporary works.`,
      },
      {
        title: 'Input Parameters',
        table: inputTable,
      },
      {
        title: 'Loading Analysis',
        table: loadingTable,
        content: `Total wall load is distributed between ${numNeedles} needle beams at ${needleSpacing}m centres. Each needle carries ${results.loadPerNeedle.toFixed(2)} kN as a point load or distributed over its bearing length.`,
      },
      {
        title: 'Structural Checks',
        table: capacityTable,
        content:
          'Section capacity verified for bending stress and serviceability deflection limits.',
      },
      {
        title: 'Section Requirements',
        table: requirementsTable,
      },
      {
        title: 'Design Summary',
        table: summaryTable,
        content:
          results.overallStatus === 'PASS'
            ? `The ${sectionName} section is adequate for the needle beam application with maximum utilisation of ${(Math.max(results.utilisationStress, results.utilisationDeflection) * 100).toFixed(1)}%.`
            : `The ${sectionName} section is NOT adequate. Consider a larger section with greater Ix and Zx values.`,
      },
      {
        title: 'Design Notes & Warnings',
        items: warningItems,
      },
      {
        title: 'Installation Notes',
        items: [
          'Needles must bear on solid masonry or padstones at each end',
          'Ensure minimum bearing length of 150mm or 2× beam depth',
          'Install temporary props/shores before cutting masonry below',
          'Check wall condition and structural integrity before works',
          'Needle holes should be cut with diamond saw, not impact tools',
          'Grout needle holes solid after removal of temporary supports',
        ],
      },
    ],
    footer: {
      company: 'BeaverCalc Studio',
      disclaimer:
        'This calculation is for professional use only. The engineer must verify all inputs and assumptions.',
    },
  };
}
