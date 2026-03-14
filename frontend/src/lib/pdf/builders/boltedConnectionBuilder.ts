// ============================================================================
// BeaverCalc Studio — Bolted Connection Report Data Builder
// Bolt Group Capacity Check to EC3-1-8
// ============================================================================

import type {
  DesignCheckSection,
  DetailedCalculation,
  ReportConclusion,
  ReportData,
  ReportInputs,
  ReportWarning,
} from '../types';

/**
 * Form data from the Bolted Connection calculator
 */
export interface BoltedConnectionFormData {
  // Connection Type
  connectionType: string; // Lap, Cover plate, Tee stub
  loadType: string; // Shear only, Tension only, Combined

  // Bolt Details
  boltGrade: string; // 4.6, 8.8, 10.9, etc.
  boltDiameter: string; // mm
  boltHoleType: string; // Standard, Oversize, Slotted
  shankInShear: string; // Yes/No

  // Bolt Group
  numberOfBolts: string;
  rowsOfBolts: string;
  columnsOfBolts: string;
  rowPitch: string; // mm (p1)
  columnPitch: string; // mm (p2)
  edgeDistance: string; // mm (e1)
  endDistance: string; // mm (e2)

  // Plates
  plateGrade: string; // S275, S355
  plateThickness: string; // mm (thinnest)
  plateThickness2: string; // mm (if cover plate)

  // Applied Forces
  appliedShear: string; // kN
  appliedTension: string; // kN
  appliedMoment: string; // kNm

  // Options
  slipResistant: string; // Yes/No
  slipClass: string; // A, B, C, D
  preloadClass: string; // Category A, B, C, D, E
}

/**
 * Results from the Bolted Connection calculator
 */
export interface BoltedConnectionResults {
  // Bolt Properties
  boltArea: string;
  boltTensileArea: string;
  fub: string; // Ultimate strength

  // Shear Resistance
  shearResistanceSingle: string;
  shearResistanceGroup: string;
  shearUtil: string;
  shearStatus: string;

  // Bearing Resistance
  bearingResistanceSingle: string;
  bearingResistanceGroup: string;
  bearingUtil: string;
  bearingStatus: string;

  // Tension Resistance
  tensionResistanceSingle: string;
  tensionResistanceGroup: string;
  tensionUtil: string;
  tensionStatus: string;

  // Combined Check
  combinedRatio: string;
  combinedStatus: string;

  // Slip Resistance (if applicable)
  slipResistanceSingle?: string;
  slipResistanceGroup?: string;
  slipUtil?: string;
  slipStatus?: string;

  // Bolt Group Effect
  boltGroupFactor: string;
  eccentricityEffect: string;

  // Edge/End Distance
  minEdgeDistance: string;
  minEndDistance: string;
  minPitch: string;
  spacingStatus: string;

  // Block Shear
  blockShearResistance: string;
  blockShearUtil: string;
  blockShearStatus: string;

  // Governing
  governingMode: string;
  overallUtil: string;
  overallStatus: string;
}

/**
 * Options for building the report
 */
export interface BuilderOptions {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  documentRef?: string;
  version?: string;
}

/**
 * Build a ReportData object from Bolted Connection calculator results
 */
export function buildBoltedConnectionReport(
  formData: BoltedConnectionFormData,
  results: BoltedConnectionResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Bolted Connection Design',
    projectName: options.projectName || 'Steel Connection',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `BC-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Bolted Connection',
    designCodes: ['BS EN 1993-1-8:2005', 'UK NA'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.connectionType} connection using ${formData.numberOfBolts}No. M${formData.boltDiameter} 
    Grade ${formData.boltGrade} bolts. ${formData.loadType} loading with ${formData.plateGrade} plates.
    ${formData.slipResistant === 'Yes' ? `Slip-resistant Class ${formData.slipClass}.` : 'Bearing type connection.'}`,
    keyResults: [
      {
        label: 'Bolts',
        value: `${formData.numberOfBolts}No. M${formData.boltDiameter} Gr.${formData.boltGrade}`,
      },
      { label: 'Governing Mode', value: results.governingMode, highlight: true },
      { label: 'Overall Utilisation', value: `${results.overallUtil}%` },
      { label: 'Shear Util', value: `${results.shearUtil}%` },
      { label: 'Bearing Util', value: `${results.bearingUtil}%` },
    ],
    overallStatus,
    governingCheck: results.governingMode,
    utilisationSummary: `${results.overallUtil}% (${results.governingMode})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Connection Configuration',
        parameters: [
          { name: 'Connection Type', value: formData.connectionType },
          { name: 'Load Type', value: formData.loadType },
          { name: 'Slip Resistant', value: formData.slipResistant },
          ...(formData.slipResistant === 'Yes'
            ? [{ name: 'Slip Class', value: formData.slipClass }]
            : []),
        ],
      },
      {
        title: 'Bolt Details',
        parameters: [
          { name: 'Bolt Grade', value: formData.boltGrade },
          { name: 'Bolt Diameter', value: formData.boltDiameter, unit: 'mm' },
          { name: 'Hole Type', value: formData.boltHoleType },
          { name: 'Shank in Shear Plane', value: formData.shankInShear },
          { name: 'Tensile Stress Area', value: results.boltTensileArea, unit: 'mm²' },
          { name: 'Ultimate Strength fub', value: results.fub, unit: 'MPa' },
        ],
      },
      {
        title: 'Bolt Arrangement',
        parameters: [
          { name: 'Number of Bolts', value: formData.numberOfBolts },
          { name: 'Rows × Columns', value: `${formData.rowsOfBolts} × ${formData.columnsOfBolts}` },
          { name: 'Row Pitch p₁', value: formData.rowPitch, unit: 'mm' },
          { name: 'Column Pitch p₂', value: formData.columnPitch, unit: 'mm' },
          { name: 'Edge Distance e₁', value: formData.edgeDistance, unit: 'mm' },
          { name: 'End Distance e₂', value: formData.endDistance, unit: 'mm' },
        ],
      },
      {
        title: 'Plate Details',
        parameters: [
          { name: 'Plate Grade', value: formData.plateGrade },
          { name: 'Plate Thickness (thin)', value: formData.plateThickness, unit: 'mm' },
          ...(formData.plateThickness2
            ? [{ name: 'Plate Thickness 2', value: formData.plateThickness2, unit: 'mm' }]
            : []),
        ],
      },
      {
        title: 'Applied Forces',
        parameters: [
          { name: 'Shear Force VEd', value: formData.appliedShear, unit: 'kN' },
          { name: 'Tension Force NEd', value: formData.appliedTension, unit: 'kN' },
          { name: 'Moment MEd', value: formData.appliedMoment, unit: 'kNm' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Spacing & Edge Distances',
      description: 'Minimum geometry requirements (EC3-1-8 Table 3.3)',
      checks: [
        {
          name: 'Edge Distance e₁',
          formula: 'e₁ ≥ 1.2d₀',
          calculated: `${formData.edgeDistance} mm`,
          limit: `≥ ${results.minEdgeDistance} mm`,
          utilisation: parseFloat(results.minEdgeDistance) / parseFloat(formData.edgeDistance),
          status: results.spacingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'End Distance e₂',
          formula: 'e₂ ≥ 1.2d₀',
          calculated: `${formData.endDistance} mm`,
          limit: `≥ ${results.minEndDistance} mm`,
          utilisation: parseFloat(results.minEndDistance) / parseFloat(formData.endDistance),
          status: results.spacingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Pitch p₁',
          formula: 'p₁ ≥ 2.2d₀',
          calculated: `${formData.rowPitch} mm`,
          limit: `≥ ${results.minPitch} mm`,
          utilisation: parseFloat(results.minPitch) / parseFloat(formData.rowPitch),
          status: results.spacingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Shear Resistance',
      description: 'Bolt shear capacity (EC3-1-8 Cl.3.6.1)',
      checks: [
        {
          name: 'Single Bolt Shear',
          formula: 'Fv,Rd = αv × fub × A / γM2',
          calculated: `${results.shearResistanceSingle} kN`,
          limit: 'Capacity',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Bolt Group Shear',
          formula: 'n × Fv,Rd',
          calculated: `${results.shearResistanceGroup} kN`,
          limit: `VEd = ${formData.appliedShear} kN`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Bearing Resistance',
      description: 'Plate bearing at bolt (EC3-1-8 Cl.3.6.1)',
      checks: [
        {
          name: 'Single Bolt Bearing',
          formula: 'Fb,Rd = k₁ × αb × fu × d × t / γM2',
          calculated: `${results.bearingResistanceSingle} kN`,
          limit: 'Capacity',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Bolt Group Bearing',
          formula: 'n × Fb,Rd',
          calculated: `${results.bearingResistanceGroup} kN`,
          limit: `VEd = ${formData.appliedShear} kN`,
          utilisation: parseFloat(results.bearingUtil) / 100,
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Add tension checks if applicable
  if (formData.loadType.includes('Tension') || formData.loadType.includes('Combined')) {
    designChecks.push({
      title: 'Tension Resistance',
      description: 'Bolt tension capacity (EC3-1-8 Cl.3.6.1)',
      checks: [
        {
          name: 'Single Bolt Tension',
          formula: 'Ft,Rd = 0.9 × fub × As / γM2',
          calculated: `${results.tensionResistanceSingle} kN`,
          limit: 'Capacity',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Bolt Group Tension',
          formula: 'n × Ft,Rd',
          calculated: `${results.tensionResistanceGroup} kN`,
          limit: `NEd = ${formData.appliedTension} kN`,
          utilisation: parseFloat(results.tensionUtil) / 100,
          status: results.tensionStatus as 'PASS' | 'FAIL',
        },
      ],
    });
  }

  // Add combined check if applicable
  if (formData.loadType.includes('Combined')) {
    designChecks.push({
      title: 'Combined Shear & Tension',
      description: 'Interaction formula (EC3-1-8 Table 3.4)',
      checks: [
        {
          name: 'Interaction',
          formula: 'Fv,Ed/Fv,Rd + Ft,Ed/(1.4×Ft,Rd) ≤ 1.0',
          calculated: results.combinedRatio,
          limit: '≤ 1.0',
          utilisation: parseFloat(results.combinedRatio),
          status: results.combinedStatus as 'PASS' | 'FAIL',
        },
      ],
    });
  }

  // Add slip resistance if applicable
  if (formData.slipResistant === 'Yes' && results.slipResistanceGroup) {
    designChecks.push({
      title: 'Slip Resistance',
      description: `Category B/C connection, Class ${formData.slipClass}`,
      checks: [
        {
          name: 'Slip Resistance',
          formula: 'Fs,Rd = ks × n × μ × Fp,C / γM3',
          calculated: `${results.slipResistanceGroup} kN`,
          limit: `VEd = ${formData.appliedShear} kN`,
          utilisation: parseFloat(results.slipUtil || '0') / 100,
          status: (results.slipStatus || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
    });
  }

  // Add block shear
  designChecks.push({
    title: 'Block Shear',
    description: 'Block tearing resistance (EC3-1-8 Cl.3.10.2)',
    checks: [
      {
        name: 'Block Shear Resistance',
        formula: 'Veff,Rd = fu×Ant/γM2 + fy×Anv/(√3×γM0)',
        calculated: `${results.blockShearResistance} kN`,
        limit: `VEd = ${formData.appliedShear} kN`,
        utilisation: parseFloat(results.blockShearUtil) / 100,
        status: results.blockShearStatus as 'PASS' | 'FAIL',
      },
    ],
  });

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Bolt Properties',
      steps: [
        {
          description: 'Bolt diameter',
          formula: `M${formData.boltDiameter}`,
          result: `d = ${formData.boltDiameter} mm`,
        },
        {
          description: 'Hole diameter (standard)',
          formula: 'd₀ = d + 2',
          substitution: `d₀ = ${formData.boltDiameter} + 2`,
          result: `d₀ = ${parseFloat(formData.boltDiameter) + 2} mm`,
        },
        {
          description: 'Tensile stress area',
          formula: 'From tables',
          result: `As = ${results.boltTensileArea} mm²`,
        },
        {
          description: 'Ultimate strength',
          formula: `Grade ${formData.boltGrade}`,
          result: `fub = ${results.fub} MPa`,
        },
      ],
    },
    {
      title: 'Shear Resistance Calculation',
      steps: [
        {
          description: 'Shear plane factor',
          formula:
            formData.shankInShear === 'Yes' ? 'αv = 0.6 (shank)' : 'αv = 0.6 (thread for ≤8.8)',
          result: 'αv = 0.6',
        },
        {
          description: 'Single bolt shear resistance',
          formula: 'Fv,Rd = αv × fub × A / γM2',
          substitution: `Fv,Rd = 0.6 × ${results.fub} × ${results.boltTensileArea} / 1.25`,
          result: `Fv,Rd = ${results.shearResistanceSingle} kN`,
        },
        {
          description: 'Group shear resistance',
          formula: 'n × Fv,Rd',
          substitution: `${formData.numberOfBolts} × ${results.shearResistanceSingle}`,
          result: `${results.shearResistanceGroup} kN`,
        },
        {
          description: 'Shear utilisation',
          formula: 'Util = VEd / Fv,Rd,group × 100',
          result: `${results.shearUtil}%`,
        },
      ],
    },
    {
      title: 'Bearing Resistance Calculation',
      steps: [
        {
          description: 'αb factor',
          formula: 'min(αd; fub/fu; 1.0)',
          result: 'Per EC3-1-8 Table 3.4',
        },
        {
          description: 'k₁ factor',
          formula: 'min(2.8e₂/d₀ - 1.7; 2.5)',
          result: 'Per EC3-1-8 Table 3.4',
        },
        {
          description: 'Single bolt bearing',
          formula: 'Fb,Rd = k₁ × αb × fu × d × t / γM2',
          result: `Fb,Rd = ${results.bearingResistanceSingle} kN`,
        },
        {
          description: 'Bearing utilisation',
          formula: 'Util = VEd / Fb,Rd,group × 100',
          result: `${results.bearingUtil}%`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.overallUtil) > 90) {
    reportWarnings.push({
      type: 'warning',
      message: `High utilisation ${results.overallUtil}% - consider additional bolts`,
    });
  }

  if (formData.boltGrade === '10.9' && formData.slipResistant !== 'Yes') {
    reportWarnings.push({
      type: 'info',
      message: 'Grade 10.9 bolts typically used for preloaded (slip-resistant) connections',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.numberOfBolts}No. M${formData.boltDiameter} Grade ${formData.boltGrade} bolts are ADEQUATE.
         Governing mode: ${results.governingMode} at ${results.overallUtil}% utilisation.`
        : `Connection FAILS. Governing mode: ${results.governingMode}. Increase bolt size/number.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.boltGrade} ${formData.slipResistant === 'Yes' ? 'preloaded' : 'bearing'} bolts`,
      `Minimum edge distance: ${results.minEdgeDistance}mm, provided: ${formData.edgeDistance}mm`,
      `Minimum pitch: ${results.minPitch}mm, provided: ${formData.rowPitch}mm`,
      formData.slipResistant === 'Yes'
        ? 'Faying surfaces to be prepared to slip factor requirement'
        : 'Snug-tight installation acceptable',
    ],
  };

  return {
    meta,
    executiveSummary,
    inputs,
    designChecks,
    detailedCalculations,
    warnings: reportWarnings.length > 0 ? reportWarnings : undefined,
    conclusion,
  };
}
