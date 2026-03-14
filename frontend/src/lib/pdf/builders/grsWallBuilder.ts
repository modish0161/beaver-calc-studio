// ============================================================================
// BeaverCalc Studio — GRS Wall Report Data Builder
// Geosynthetic Reinforced Soil Wall Design
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
 * Form data from the GRS Wall calculator
 */
export interface GRSWallFormData {
  // Wall Geometry
  wallHeight: string;
  wallBatter: string;
  reinforcementLength: string;
  verticalSpacing: string;

  // Soil Properties
  backfillUnitWeight: string;
  backfillFriction: string;
  backfillCohesion: string;
  foundationBearing: string;
  foundationFriction: string;

  // Reinforcement Properties
  reinforcementType: string;
  ultimateStrength: string;
  reductionFactorCreep: string;
  reductionFactorDamage: string;
  reductionFactorDurability: string;

  // Surcharge
  surchargeLoad: string;
  surchargeLive: string;

  // Facing
  facingType: string;
  facingThickness: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the GRS Wall calculator
 */
export interface GRSWallResults {
  // External Stability
  slidingForce: string;
  slidingResistance: string;
  slidingFOS: string;
  slidingStatus: string;

  overturningMoment: string;
  resistingMoment: string;
  overturningFOS: string;
  overturningStatus: string;

  bearingPressure: string;
  allowableBearing: string;
  bearingFOS: string;
  bearingStatus: string;

  eccentricity: string;
  maxEccentricity: string;
  eccentricityStatus: string;

  // Internal Stability
  maxTensileForce: string;
  designStrength: string;
  tensileUtilisation: string;
  tensileStatus: string;

  pulloutForce: string;
  pulloutResistance: string;
  pulloutFOS: string;
  pulloutStatus: string;

  connectionStrength: string;
  connectionUtilisation: string;
  connectionStatus: string;

  // Overall
  overallStatus: string;
  criticalLayer: string;
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
 * Build a ReportData object from GRS Wall calculator results
 */
export function buildGRSWallReport(
  formData: GRSWallFormData,
  results: GRSWallResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.slidingStatus,
    results.overturningStatus,
    results.bearingStatus,
    results.eccentricityStatus,
    results.tensileStatus,
    results.pulloutStatus,
    results.connectionStatus,
  ];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'GRS Retaining Wall Design',
    projectName: options.projectName || formData.projectTitle || 'GRS Wall Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `GRS-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'GRS Wall Design',
    designCodes: ['BS 8006-1:2010', 'Eurocode 7', 'FHWA-NHI-10-024'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Geosynthetic Reinforced Soil (GRS) wall design for a ${formData.wallHeight}m high wall 
    with ${formData.facingType} facing. Reinforcement: ${formData.reinforcementType} at 
    ${formData.verticalSpacing}mm vertical spacing, ${formData.reinforcementLength}m length.`,
    keyResults: [
      { label: 'Wall Height', value: `${formData.wallHeight} m` },
      { label: 'Reinforcement Length', value: `${formData.reinforcementLength} m` },
      { label: 'Sliding FOS', value: results.slidingFOS, highlight: true },
      { label: 'Overturning FOS', value: results.overturningFOS },
      { label: 'Bearing FOS', value: results.bearingFOS },
      { label: 'Critical Layer', value: results.criticalLayer },
    ],
    overallStatus,
    governingCheck:
      parseFloat(results.slidingFOS) < parseFloat(results.overturningFOS)
        ? 'Sliding'
        : 'Overturning',
    utilisationSummary: `Minimum FOS: ${Math.min(
      parseFloat(results.slidingFOS),
      parseFloat(results.overturningFOS),
      parseFloat(results.bearingFOS),
    ).toFixed(2)}`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Wall Geometry',
        parameters: [
          { name: 'Wall Height', value: formData.wallHeight, unit: 'm' },
          { name: 'Wall Batter', value: formData.wallBatter, unit: '°' },
          { name: 'Reinforcement Length', value: formData.reinforcementLength, unit: 'm' },
          { name: 'Vertical Spacing', value: formData.verticalSpacing, unit: 'mm' },
        ],
      },
      {
        title: 'Backfill Properties',
        parameters: [
          { name: 'Unit Weight', value: formData.backfillUnitWeight, unit: 'kN/m³' },
          { name: 'Friction Angle', value: formData.backfillFriction, unit: '°' },
          { name: 'Cohesion', value: formData.backfillCohesion, unit: 'kPa' },
        ],
      },
      {
        title: 'Foundation Properties',
        parameters: [
          { name: 'Bearing Capacity', value: formData.foundationBearing, unit: 'kPa' },
          { name: 'Interface Friction', value: formData.foundationFriction, unit: '°' },
        ],
      },
      {
        title: 'Reinforcement Properties',
        parameters: [
          { name: 'Type', value: formData.reinforcementType },
          { name: 'Ultimate Strength', value: formData.ultimateStrength, unit: 'kN/m' },
          { name: 'RF Creep', value: formData.reductionFactorCreep },
          { name: 'RF Damage', value: formData.reductionFactorDamage },
          { name: 'RF Durability', value: formData.reductionFactorDurability },
        ],
      },
      {
        title: 'Loading',
        parameters: [
          { name: 'Dead Surcharge', value: formData.surchargeLoad, unit: 'kPa' },
          { name: 'Live Surcharge', value: formData.surchargeLive, unit: 'kPa' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'External Stability - Sliding',
      description: 'Check against horizontal sliding on base',
      checks: [
        {
          name: 'Sliding Factor of Safety',
          formula: 'FOS_sliding = ΣR / ΣH ≥ 1.5',
          calculated: results.slidingFOS,
          limit: '≥ 1.50',
          utilisation: 1.5 / parseFloat(results.slidingFOS),
          status: results.slidingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'External Stability - Overturning',
      description: 'Check against overturning about toe',
      checks: [
        {
          name: 'Overturning Factor of Safety',
          formula: 'FOS_OT = M_resist / M_overturn ≥ 2.0',
          calculated: results.overturningFOS,
          limit: '≥ 2.00',
          utilisation: 2.0 / parseFloat(results.overturningFOS),
          status: results.overturningStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'External Stability - Bearing',
      description: 'Check foundation bearing capacity',
      checks: [
        {
          name: 'Bearing Pressure',
          formula: 'σ_max ≤ q_allowable',
          calculated: `${results.bearingPressure} kPa`,
          limit: `≤ ${results.allowableBearing} kPa`,
          utilisation: parseFloat(results.bearingPressure) / parseFloat(results.allowableBearing),
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Base Eccentricity',
          formula: 'e ≤ B/6',
          calculated: `${results.eccentricity} m`,
          limit: `≤ ${results.maxEccentricity} m`,
          utilisation: parseFloat(results.eccentricity) / parseFloat(results.maxEccentricity),
          status: results.eccentricityStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Internal Stability - Reinforcement Tension',
      description: 'Check reinforcement tensile capacity',
      checks: [
        {
          name: 'Tensile Capacity',
          formula: 'T_max ≤ T_design',
          calculated: `${results.maxTensileForce} kN/m`,
          limit: `≤ ${results.designStrength} kN/m`,
          utilisation: parseFloat(results.tensileUtilisation),
          status: results.tensileStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Internal Stability - Pullout',
      description: 'Check reinforcement pullout resistance',
      checks: [
        {
          name: 'Pullout Factor of Safety',
          formula: 'FOS_pullout = P_resist / T_max ≥ 1.5',
          calculated: results.pulloutFOS,
          limit: '≥ 1.50',
          utilisation: 1.5 / parseFloat(results.pulloutFOS),
          status: results.pulloutStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Connection Strength',
      description: 'Check facing-reinforcement connection',
      checks: [
        {
          name: 'Connection Capacity',
          formula: 'T_connection ≥ T_max',
          calculated: `${results.connectionStrength} kN/m`,
          limit: `≥ ${results.maxTensileForce} kN/m`,
          utilisation: parseFloat(results.connectionUtilisation),
          status: results.connectionStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Earth Pressure Calculation',
      steps: [
        {
          description: 'Active earth pressure coefficient (Rankine)',
          formula: 'Ka = tan²(45° - φ/2)',
          substitution: `Ka = tan²(45° - ${formData.backfillFriction}/2)`,
          result: `${Math.pow(Math.tan(((45 - parseFloat(formData.backfillFriction) / 2) * Math.PI) / 180), 2).toFixed(3)}`,
        },
        {
          description: 'Horizontal earth pressure at base',
          formula: 'σ_h = Ka × γ × H + Ka × q',
          result: 'See sliding force calculation',
        },
      ],
    },
    {
      title: 'Reinforcement Design Strength',
      steps: [
        {
          description: 'Combined reduction factor',
          formula: 'RF = RF_creep × RF_damage × RF_durability',
          substitution: `RF = ${formData.reductionFactorCreep} × ${formData.reductionFactorDamage} × ${formData.reductionFactorDurability}`,
          result: `${(parseFloat(formData.reductionFactorCreep) * parseFloat(formData.reductionFactorDamage) * parseFloat(formData.reductionFactorDurability)).toFixed(2)}`,
        },
        {
          description: 'Design tensile strength',
          formula: 'T_design = T_ultimate / RF',
          substitution: `T_design = ${formData.ultimateStrength} / RF`,
          result: `${results.designStrength} kN/m`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.reinforcementLength) < 0.7 * parseFloat(formData.wallHeight)) {
    reportWarnings.push({
      type: 'warning',
      message: 'Reinforcement length less than 0.7H - verify external stability carefully',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The GRS wall design is ADEQUATE. All external and internal stability checks satisfy 
         the required factors of safety. Critical layer: ${results.criticalLayer}.`
        : `The GRS wall design is INADEQUATE. Review failing checks and consider 
         increasing reinforcement length, strength, or reducing spacing.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.reinforcementType} at ${formData.verticalSpacing}mm vertical spacing`,
      `Minimum reinforcement length: ${formData.reinforcementLength}m from face`,
      `Ensure minimum 95% compaction of reinforced fill`,
      `Install drainage behind facing to prevent hydrostatic pressure buildup`,
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
