// =============================================================================
// Load Combination Builder Report Builder
// EN 1990 Load Combinations — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

export interface CombinationBuilderFormData {
  design_code: string;
  design_approach: string;
  structure_type: string;
  consequence_class: string;
  include_traffic: boolean;
  include_wind: boolean;
  include_thermal: boolean;
  include_snow: boolean;
  include_seismic: boolean;
  projectName: string;
  reference: string;
}

export interface LoadCase {
  id: string;
  name: string;
  category: string;
  bending: number;
  shear: number;
  axial: number;
  torsion: number;
  isLeading: boolean;
}

export interface Combination {
  id: string;
  name: string;
  type: string;
  loads: { caseId: string; factor: number }[];
  bending: number;
  shear: number;
  axial: number;
  torsion: number;
}

interface ProjectInfo {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

export function buildCombinationBuilderReport(
  form: CombinationBuilderFormData,
  loadCases: LoadCase[],
  combinations: Combination[],
  project: ProjectInfo,
): ReportData {
  // Calculate governing values
  const maxBending = combinations.length > 0 ? Math.max(...combinations.map((c) => c.bending)) : 0;
  const maxShear = combinations.length > 0 ? Math.max(...combinations.map((c) => c.shear)) : 0;
  const maxAxial =
    combinations.length > 0 ? Math.max(...combinations.map((c) => Math.abs(c.axial))) : 0;
  const maxTorsion = combinations.length > 0 ? Math.max(...combinations.map((c) => c.torsion)) : 0;

  // Get included load types
  const loadTypes: string[] = [];
  if (form.include_traffic) loadTypes.push('Traffic');
  if (form.include_wind) loadTypes.push('Wind');
  if (form.include_thermal) loadTypes.push('Thermal');
  if (form.include_snow) loadTypes.push('Snow');
  if (form.include_seismic) loadTypes.push('Seismic');

  // Settings table
  const settingsTable: TableInput = {
    title: 'Design Settings',
    headers: ['Parameter', 'Value'],
    rows: [
      ['Design Code', form.design_code],
      ['Design Approach', form.design_approach],
      ['Structure Type', form.structure_type],
      ['Consequence Class', form.consequence_class],
      ['Load Types Included', loadTypes.join(', ') || 'None'],
    ],
  };

  // Load cases table
  const loadCasesTable: TableInput = {
    title: 'Load Cases',
    headers: ['ID', 'Name', 'Category', 'M (kNm)', 'V (kN)', 'N (kN)', 'T (kNm)'],
    rows: loadCases.map((lc) => [
      lc.id,
      lc.name,
      lc.category,
      lc.bending.toFixed(1),
      lc.shear.toFixed(1),
      lc.axial.toFixed(1),
      lc.torsion.toFixed(1),
    ]),
  };

  // Combinations table (first 20)
  const displayCombinations = combinations.slice(0, 20);
  const combinationsTable: TableInput = {
    title: `Generated Combinations (${combinations.length} total)`,
    headers: ['ID', 'Name', 'M (kNm)', 'V (kN)', 'N (kN)', 'T (kNm)'],
    rows: displayCombinations.map((c) => [
      c.id,
      c.name,
      c.bending.toFixed(1),
      c.shear.toFixed(1),
      c.axial.toFixed(1),
      c.torsion.toFixed(1),
    ]),
  };

  // Governing values table
  const governingTable: TableInput = {
    title: 'Governing Design Values',
    headers: ['Load Effect', 'Maximum Value', 'Units'],
    rows: [
      ['Bending Moment', maxBending.toFixed(2), 'kNm'],
      ['Shear Force', maxShear.toFixed(2), 'kN'],
      ['Axial Force', maxAxial.toFixed(2), 'kN'],
      ['Torsion', maxTorsion.toFixed(2), 'kNm'],
    ],
  };

  return {
    title: 'Load Combination Analysis',
    subtitle: 'EN 1990 — Basis of Structural Design',
    standard: 'EN 1990:2002 + UK National Annex',
    project: {
      name: project.projectName || form.projectName,
      client: project.clientName || 'Client',
      preparedBy: project.preparedBy || 'BeaverCalc Studio',
      date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      status: combinations.length > 0 ? 'COMPLETE' : 'INCOMPLETE',
      critical: 'Bending Moment',
      utilisation: 1.0,
    },
    sections: [
      {
        title: 'Design Basis',
        content: `This analysis generates load combinations in accordance with ${form.design_code} for ${form.structure_type} structures. The design approach is ${form.design_approach} with Consequence Class ${form.consequence_class}. A total of ${combinations.length} combinations have been generated.`,
      },
      {
        title: 'Design Settings',
        table: settingsTable,
      },
      {
        title: 'Load Cases',
        table: loadCasesTable,
        content: `${loadCases.length} load cases have been defined for combination.`,
      },
      {
        title: 'Generated Combinations',
        table: combinationsTable,
        content:
          combinations.length > 20
            ? `Showing first 20 of ${combinations.length} combinations. Additional combinations omitted for brevity.`
            : `All ${combinations.length} combinations shown.`,
      },
      {
        title: 'Governing Design Values',
        table: governingTable,
        content:
          'These are the maximum factored design values from all generated combinations. Use these values for member design.',
      },
      {
        title: 'Design Code Reference',
        items: [
          'EN 1990: Eurocode — Basis of structural design',
          'Expression 6.10: γG·Gk + γQ,1·Qk,1 + Σγq,i·ψ0,i·Qk,i',
          'Expression 6.10a/b: Alternative approach for permanent actions',
          'UK NA: National Annex values for ψ factors',
          'EN 1991-2: Load groups gr1a (LM1), gr1b (LM2), gr2 (horizontal), gr3 (pedestrian)',
        ],
      },
      {
        title: 'Partial Safety Factors',
        items: [
          'γG = 1.35 (unfavourable permanent) / 1.00 (favourable)',
          'γQ = 1.50 (unfavourable variable) / 0.00 (favourable)',
          'ψ0 = Combination factor (varies by action type)',
          'ψ1 = Frequent value factor',
          'ψ2 = Quasi-permanent value factor',
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

export default buildCombinationBuilderReport;
