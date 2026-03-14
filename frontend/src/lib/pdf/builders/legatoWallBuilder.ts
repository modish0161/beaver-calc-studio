// ============================================================================
// BeaverCalc Studio — Legato Wall Report Data Builder
// Interlocking Concrete Block Wall Design
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
 * Form data from the Legato Wall calculator
 */
export interface LegatoWallFormData {
  // Wall Geometry
  wallHeight: string;
  wallLength: string;
  wallBatter: string;
  blockType: string;

  // Block Properties
  blockLength: string;
  blockHeight: string;
  blockWidth: string;
  blockWeight: string;

  // Retained Material
  retainedHeight: string;
  soilUnitWeight: string;
  soilFriction: string;
  soilCohesion: string;

  // Surcharge
  surchargeLoad: string;

  // Foundation
  foundationBearing: string;
  foundationFriction: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Legato Wall calculator
 */
export interface LegatoWallResults {
  // Block Count
  blocksPerRow: string;
  rowCount: string;
  totalBlocks: string;

  // Wall Weight
  wallWeight: string;
  wallWeightPerMeter: string;

  // Earth Pressure
  activePressure: string;
  horizontalForce: string;

  // Sliding Check
  slidingForce: string;
  slidingResistance: string;
  slidingFOS: string;
  slidingStatus: string;

  // Overturning Check
  overturningMoment: string;
  resistingMoment: string;
  overturningFOS: string;
  overturningStatus: string;

  // Bearing Check
  toePress: string;
  heelPressure: string;
  maxBearing: string;
  bearingStatus: string;

  // Inter-block Check
  maxInterfaceShear: string;
  interfaceCapacity: string;
  interfaceStatus: string;

  // Overall
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
 * Build a ReportData object from Legato Wall calculator results
 */
export function buildLegatoWallReport(
  formData: LegatoWallFormData,
  results: LegatoWallResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.slidingStatus,
    results.overturningStatus,
    results.bearingStatus,
    results.interfaceStatus,
  ];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'Legato Block Retaining Wall Design',
    projectName: options.projectName || formData.projectTitle || 'Legato Wall Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `LEG-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Legato Wall',
    designCodes: ['BS 8002:2015', 'Eurocode 7', 'CIRIA C516'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Legato interlocking block retaining wall design for a ${formData.wallHeight}m high wall 
    retaining ${formData.retainedHeight}m of ${formData.soilUnitWeight} kN/m³ backfill. 
    ${formData.blockType} blocks (${formData.blockLength}×${formData.blockHeight}×${formData.blockWidth}mm).`,
    keyResults: [
      { label: 'Wall Height', value: `${formData.wallHeight} m` },
      { label: 'Total Blocks Required', value: results.totalBlocks, highlight: true },
      { label: 'Sliding FOS', value: results.slidingFOS },
      { label: 'Overturning FOS', value: results.overturningFOS },
      { label: 'Max Toe Pressure', value: `${results.toePress} kPa` },
    ],
    overallStatus,
    governingCheck:
      parseFloat(results.slidingFOS) < parseFloat(results.overturningFOS)
        ? 'Sliding'
        : 'Overturning',
    utilisationSummary: `Minimum FOS: ${Math.min(
      parseFloat(results.slidingFOS),
      parseFloat(results.overturningFOS),
    ).toFixed(2)}`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Wall Geometry',
        parameters: [
          { name: 'Wall Height', value: formData.wallHeight, unit: 'm' },
          { name: 'Wall Length', value: formData.wallLength, unit: 'm' },
          { name: 'Wall Batter', value: formData.wallBatter, unit: '°' },
        ],
      },
      {
        title: 'Block Properties',
        parameters: [
          { name: 'Block Type', value: formData.blockType },
          {
            name: 'Block Size',
            value: `${formData.blockLength}×${formData.blockHeight}×${formData.blockWidth}`,
            unit: 'mm',
          },
          { name: 'Block Weight', value: formData.blockWeight, unit: 'kg' },
        ],
      },
      {
        title: 'Retained Soil',
        parameters: [
          { name: 'Retained Height', value: formData.retainedHeight, unit: 'm' },
          { name: 'Unit Weight', value: formData.soilUnitWeight, unit: 'kN/m³' },
          { name: 'Friction Angle', value: formData.soilFriction, unit: '°' },
          { name: 'Cohesion', value: formData.soilCohesion, unit: 'kPa' },
        ],
      },
      {
        title: 'Loading & Foundation',
        parameters: [
          { name: 'Surcharge', value: formData.surchargeLoad, unit: 'kPa' },
          { name: 'Foundation Bearing', value: formData.foundationBearing, unit: 'kPa' },
          { name: 'Foundation Friction', value: formData.foundationFriction, unit: '°' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Sliding Stability',
      description: 'Check against horizontal sliding on base',
      checks: [
        {
          name: 'Sliding Factor of Safety',
          formula: 'FOS = (W × tan(δ)) / H_active ≥ 1.5',
          calculated: results.slidingFOS,
          limit: '≥ 1.50',
          utilisation: 1.5 / parseFloat(results.slidingFOS),
          status: results.slidingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Overturning Stability',
      description: 'Check against overturning about toe',
      checks: [
        {
          name: 'Overturning Factor of Safety',
          formula: 'FOS = M_resist / M_overturn ≥ 2.0',
          calculated: results.overturningFOS,
          limit: '≥ 2.00',
          utilisation: 2.0 / parseFloat(results.overturningFOS),
          status: results.overturningStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Bearing Capacity',
      description: 'Check foundation bearing pressure',
      checks: [
        {
          name: 'Maximum Toe Pressure',
          formula: 'σ_toe ≤ q_allowable',
          calculated: `${results.toePress} kPa`,
          limit: `≤ ${results.maxBearing} kPa`,
          utilisation: parseFloat(results.toePress) / parseFloat(results.maxBearing),
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Inter-Block Shear',
      description: 'Check shear capacity between blocks',
      checks: [
        {
          name: 'Interface Shear',
          formula: 'V_interface ≤ V_capacity',
          calculated: `${results.maxInterfaceShear} kN/m`,
          limit: `≤ ${results.interfaceCapacity} kN/m`,
          utilisation:
            parseFloat(results.maxInterfaceShear) / parseFloat(results.interfaceCapacity),
          status: results.interfaceStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Block Quantity Calculation',
      steps: [
        {
          description: 'Blocks per row',
          formula: 'n_row = L_wall / L_block',
          substitution: `n_row = ${formData.wallLength} / ${parseFloat(formData.blockLength) / 1000}`,
          result: `${results.blocksPerRow} blocks`,
        },
        {
          description: 'Number of rows',
          formula: 'n_rows = H_wall / H_block',
          substitution: `n_rows = ${formData.wallHeight} / ${parseFloat(formData.blockHeight) / 1000}`,
          result: `${results.rowCount} rows`,
        },
        {
          description: 'Total blocks (with stagger)',
          formula: 'n_total = n_row × n_rows × 1.05 (stagger allowance)',
          result: `${results.totalBlocks} blocks`,
        },
      ],
    },
    {
      title: 'Earth Pressure Calculation',
      steps: [
        {
          description: 'Active earth pressure coefficient',
          formula: 'Ka = tan²(45° - φ/2)',
          result: `Ka = ${Math.pow(Math.tan(((45 - parseFloat(formData.soilFriction) / 2) * Math.PI) / 180), 2).toFixed(3)}`,
        },
        {
          description: 'Horizontal active force',
          formula: 'P_a = 0.5 × Ka × γ × H² + Ka × q × H',
          result: `${results.horizontalForce} kN/m`,
        },
      ],
    },
    {
      title: 'Stability Calculations',
      steps: [
        {
          description: 'Wall self-weight per meter',
          formula: 'W = n_rows × (block_weight × 9.81/1000) / block_length',
          result: `${results.wallWeightPerMeter} kN/m`,
        },
        {
          description: 'Sliding resistance',
          formula: 'R = W × tan(δ)',
          result: `${results.slidingResistance} kN/m`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.wallHeight) > 3) {
    reportWarnings.push({
      type: 'info',
      message: 'Wall height exceeds 3m - consider geotechnical review for global stability',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The Legato block wall design is ADEQUATE. A ${results.rowCount}-row wall 
         provides sufficient stability against sliding, overturning, and bearing failure.`
        : `The Legato block wall design is INADEQUATE. Consider increasing wall width 
         (batter), reducing retained height, or using reinforced soil behind blocks.`,
    status: overallStatus,
    recommendations: [
      `Order ${results.totalBlocks} ${formData.blockType} blocks (includes 5% wastage)`,
      'Install drainage aggregate behind wall face',
      'Compact each lift to 95% relative density',
      'Ensure level, compacted foundation before first course',
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
