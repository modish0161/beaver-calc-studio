// =============================================================================
// Spreader Beam Design Report Builder
// BS EN 13155 / EN 1993-1-1 — PDF Report Generation
// =============================================================================

import { ReportData, TableInput } from '../types';

interface SpreaderBeamFormData {
  beam_length: string;
  lift_point_spacing: string;
  load_point_spacing: string;
  load_offset: string;
  total_swl: string;
  load_type: string;
  num_pick_points: string;
  dynamic_factor: string;
  sling_angle: string;
  beam_section: string;
  steel_grade: string;
  custom_depth: string;
  custom_Ix: string;
  custom_Zx: string;
  custom_mass: string;
  lug_type: string;
  lug_thickness: string;
  hole_diameter: string;
  safety_factor: string;
  projectName: string;
  reference: string;
}

interface SpreaderBeamResults {
  swl_factored: number;
  load_per_lug: number;
  sling_tension: number;
  horizontal_force: number;
  vertical_reaction: number;
  max_moment: number;
  moment_capacity: number;
  bending_util: number;
  bending_status: string;
  max_shear: number;
  shear_capacity: number;
  shear_util: number;
  shear_status: string;
  lambda_lt: number;
  chi_lt: number;
  ltb_capacity: number;
  ltb_util: number;
  ltb_status: string;
  max_deflection: number;
  deflection_limit: number;
  deflection_util: number;
  deflection_status: string;
  lug_bearing_stress: number;
  lug_allowable: number;
  lug_util: number;
  lug_status: string;
  beam_weight: number;
  total_lifted: number;
  critical_check: string;
  status: string;
  rating: string;
}

interface ProjectInfo {
  projectName: string;
  clientName: string;
  preparedBy: string;
}

const BEAM_SECTIONS: Record<string, { name: string }> = {
  UC_152x152x23: { name: 'UC 152×152×23' },
  UC_203x203x46: { name: 'UC 203×203×46' },
  UC_254x254x73: { name: 'UC 254×254×73' },
  UC_305x305x97: { name: 'UC 305×305×97' },
  UB_305x165x40: { name: 'UB 305×165×40' },
  UB_406x178x54: { name: 'UB 406×178×54' },
  UB_457x191x67: { name: 'UB 457×191×67' },
  UB_533x210x82: { name: 'UB 533×210×82' },
  UB_610x229x101: { name: 'UB 610×229×101' },
  SHS_150x150x8: { name: 'SHS 150×150×8' },
  SHS_200x200x10: { name: 'SHS 200×200×10' },
  Custom: { name: 'Custom Section' },
};

const LUG_TYPES: Record<string, { name: string }> = {
  welded_plate: { name: 'Welded Plate Lug' },
  bolted_cleat: { name: 'Bolted Cleat' },
  shackle_hole: { name: 'Pin Through Web' },
  chain_cradle: { name: 'Chain Cradle' },
};

const LOAD_TYPES: Record<string, { name: string }> = {
  single_point: { name: 'Single Point Load' },
  two_point: { name: 'Two Point Loads' },
  four_point: { name: 'Four Point Loads' },
  udl: { name: 'Uniform Load' },
};

export function buildSpreaderBeamReport(
  form: SpreaderBeamFormData,
  results: SpreaderBeamResults,
  warnings: string[],
  projectInfo: ProjectInfo,
): ReportData {
  // Geometry table
  const geometryTable: TableInput = {
    title: 'Beam Geometry',
    headers: ['Parameter', 'Value', 'Unit'],
    rows: [
      ['Beam Length', form.beam_length, 'm'],
      ['Lift Point Spacing', form.lift_point_spacing, 'm'],
      ['Load Point Spacing', form.load_point_spacing, 'm'],
      ['Sling Angle', form.sling_angle, '°'],
    ],
  };

  // Loading table
  const loadingTable: TableInput = {
    title: 'Loading Data',
    headers: ['Parameter', 'Value', 'Unit'],
    rows: [
      ['Safe Working Load (SWL)', form.total_swl, 'kN'],
      ['Load Type', LOAD_TYPES[form.load_type]?.name || form.load_type, '-'],
      ['Dynamic Factor', form.dynamic_factor, '-'],
      ['Safety Factor', form.safety_factor, '-'],
      ['Factored SWL', results.swl_factored.toFixed(1), 'kN'],
      ['Beam Self-Weight', results.beam_weight.toFixed(2), 'kN'],
      ['Total Lifted Weight', results.total_lifted.toFixed(1), 'kN'],
    ],
  };

  // Section table
  const sectionTable: TableInput = {
    title: 'Section Properties',
    headers: ['Parameter', 'Value', 'Notes'],
    rows: [
      [
        'Beam Section',
        BEAM_SECTIONS[form.beam_section]?.name || form.beam_section,
        'Hot-rolled steel',
      ],
      ['Steel Grade', form.steel_grade, 'EN 10025'],
      ['Lug Type', LUG_TYPES[form.lug_type]?.name || form.lug_type, '-'],
      ['Lug Thickness', form.lug_thickness, 'mm'],
      ['Hole Diameter', form.hole_diameter, 'mm'],
    ],
  };

  // Load summary table
  const loadSummaryTable: TableInput = {
    title: 'Sling Forces',
    headers: ['Parameter', 'Value', 'Unit'],
    rows: [
      ['Load per Lug', results.load_per_lug.toFixed(1), 'kN'],
      ['Sling Tension', results.sling_tension.toFixed(1), 'kN'],
      ['Horizontal Force', results.horizontal_force.toFixed(1), 'kN'],
      ['Vertical Reaction', results.vertical_reaction.toFixed(1), 'kN'],
    ],
  };

  // Bending check table
  const bendingTable: TableInput = {
    title: 'Bending Check (EN 1993-1-1)',
    headers: ['Parameter', 'Value', 'Status'],
    rows: [
      ['Maximum Moment', results.max_moment.toFixed(2) + ' kNm', '-'],
      ['Plastic Moment Capacity', results.moment_capacity.toFixed(2) + ' kNm', '-'],
      ['LTB Reduction Factor χ_LT', results.chi_lt.toFixed(3), '-'],
      ['LTB Moment Capacity', results.ltb_capacity.toFixed(2) + ' kNm', '-'],
      [
        'Bending Utilisation',
        (results.bending_util * 100).toFixed(1) + '%',
        results.bending_status,
      ],
      ['LTB Utilisation', (results.ltb_util * 100).toFixed(1) + '%', results.ltb_status],
    ],
  };

  // Shear check table
  const shearTable: TableInput = {
    title: 'Shear & Deflection Check',
    headers: ['Parameter', 'Value', 'Status'],
    rows: [
      ['Maximum Shear', results.max_shear.toFixed(1) + ' kN', '-'],
      ['Shear Capacity', results.shear_capacity.toFixed(0) + ' kN', '-'],
      ['Shear Utilisation', (results.shear_util * 100).toFixed(1) + '%', results.shear_status],
      ['Maximum Deflection', results.max_deflection.toFixed(1) + ' mm', '-'],
      ['Deflection Limit (L/250)', results.deflection_limit.toFixed(1) + ' mm', '-'],
      [
        'Deflection Utilisation',
        (results.deflection_util * 100).toFixed(1) + '%',
        results.deflection_status,
      ],
    ],
  };

  // Lug check table
  const lugTable: TableInput = {
    title: 'Lug Bearing Check',
    headers: ['Parameter', 'Value', 'Status'],
    rows: [
      ['Bearing Stress', results.lug_bearing_stress.toFixed(0) + ' MPa', '-'],
      ['Allowable Stress', results.lug_allowable.toFixed(0) + ' MPa', '-'],
      ['Bearing Utilisation', (results.lug_util * 100).toFixed(1) + '%', results.lug_status],
    ],
  };

  // Summary table
  const summaryTable: TableInput = {
    title: 'Design Summary',
    headers: ['Check', 'Utilisation', 'Status'],
    rows: [
      ['Bending', (results.bending_util * 100).toFixed(1) + '%', results.bending_status],
      ['LTB', (results.ltb_util * 100).toFixed(1) + '%', results.ltb_status],
      ['Shear', (results.shear_util * 100).toFixed(1) + '%', results.shear_status],
      ['Deflection', (results.deflection_util * 100).toFixed(1) + '%', results.deflection_status],
      ['Lug Bearing', (results.lug_util * 100).toFixed(1) + '%', results.lug_status],
      ['OVERALL', 'Critical: ' + results.critical_check, results.status],
    ],
  };

  const notesContent = [
    '1. Design in accordance with BS EN 13155:2020 - Cranes - Safety - Non-fixed load lifting attachments.',
    '2. Steel design checks per EN 1993-1-1:2005 (Eurocode 3).',
    '3. Minimum safety factor of 2.0 applied per BS EN 13155.',
    '4. Dynamic factor of ' + form.dynamic_factor + ' applied to account for lifting dynamics.',
    '5. Lifting lugs to be inspected per LOLER 1998 requirements.',
    '6. Beam to be clearly marked with SWL: ' + form.total_swl + ' kN.',
    '7. NDT inspection of welds required before first use.',
    '8. Regular examination interval: 12 months maximum.',
  ];

  if (warnings.length > 0) {
    notesContent.push('', 'DESIGN WARNINGS:');
    warnings.forEach((w) => notesContent.push('• ' + w));
  }

  return {
    title: 'Spreader Beam Design Report',
    subtitle: 'BS EN 13155 / EN 1993-1-1 Lifting Beam Analysis',
    projectInfo: {
      'Project Name': projectInfo.projectName || form.projectName,
      Reference: form.reference,
      Client: projectInfo.clientName,
      'Prepared By': projectInfo.preparedBy,
      Date: new Date().toLocaleDateString('en-GB'),
    },
    summary: {
      'Beam Section': BEAM_SECTIONS[form.beam_section]?.name || form.beam_section,
      'Beam Length': form.beam_length + ' m',
      'Safe Working Load': form.total_swl + ' kN',
      'Sling Angle': form.sling_angle + '°',
      'Critical Check': results.critical_check,
      'Design Status': results.status,
      Rating: results.rating,
    },
    tables: [
      geometryTable,
      loadingTable,
      sectionTable,
      loadSummaryTable,
      bendingTable,
      shearTable,
      lugTable,
      summaryTable,
    ],
    notes: notesContent,
    footer: {
      preparedBy: projectInfo.preparedBy,
      reviewedBy: 'Lifting Equipment Engineer',
      approvedBy: '',
    },
  };
}
