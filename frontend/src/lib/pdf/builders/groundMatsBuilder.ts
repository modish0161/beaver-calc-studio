// ============================================================================
// BeaverCalc Studio — Ground Mats Report Data Builder
// Transforms calculator results into ReportData format for premium PDF export
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
 * Form data from the Ground Mats calculator
 */
export interface GroundMatsFormData {
  // Equipment Loading
  machineType: string;
  grossWeight: string;
  trackLength: string;
  trackWidth: string;
  numberOfTracks: string;

  // Ground Conditions
  groundType: string;
  groundBearing: string;
  groundCBR: string;
  waterTableDepth: string;

  // Mat Properties
  matType: string;
  matLength: string;
  matWidth: string;
  matThickness: string;
  matMaterial: string;

  // Configuration
  layerCount: string;
  orientation: 'parallel' | 'perpendicular';

  // Project
  projectTitle: string;
}

/**
 * Results from the Ground Mats calculator
 */
export interface GroundMatsResults {
  // Contact Pressure
  trackContactPressure: string;
  matContactPressure: string;

  // Load Spread
  loadSpreadAngle: string;
  effectiveArea: string;
  pressureAtGround: string;

  // Bearing Check
  allowableBearing: string;
  bearingUtilisation: string;
  bearingStatus: string;

  // Mat Bending
  maxBendingMoment: string;
  bendingStress: string;
  allowableBending: string;
  bendingUtilisation: string;
  bendingStatus: string;

  // Mat Shear
  maxShear: string;
  shearStress: string;
  allowableShear: string;
  shearUtilisation: string;
  shearStatus: string;

  // Deflection
  maxDeflection: string;
  deflectionLimit: string;
  deflectionUtilisation: string;
  deflectionStatus: string;

  // Recommendations
  minMatsRequired: string;
  recommendedLayout: string;
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
 * Build a ReportData object from Ground Mats calculator results
 */
export function buildGroundMatsReport(
  formData: GroundMatsFormData,
  results: GroundMatsResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.bearingStatus,
    results.bendingStatus,
    results.shearStatus,
    results.deflectionStatus,
  ];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Find governing check
  const utilisations = [
    { name: 'Ground Bearing', util: parseFloat(results.bearingUtilisation) },
    { name: 'Mat Bending', util: parseFloat(results.bendingUtilisation) },
    { name: 'Mat Shear', util: parseFloat(results.shearUtilisation) },
    { name: 'Deflection', util: parseFloat(results.deflectionUtilisation) },
  ];
  const governingCheck = utilisations.reduce((a, b) => (a.util > b.util ? a : b));

  // Build meta
  const meta = {
    title: 'Ground Mat / Bog Mat Analysis',
    projectName: options.projectName || formData.projectTitle || 'Ground Mats Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `MAT-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Ground Mats',
    designCodes: ['BS 6031', 'Timber Design to EC5', 'CIRIA C760'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Ground mat analysis for ${formData.machineType} with gross weight of ${formData.grossWeight} tonnes 
    operating on ${formData.groundType} with allowable bearing of ${formData.groundBearing} kPa. 
    ${formData.matType} mats (${formData.matLength}m × ${formData.matWidth}m × ${formData.matThickness}mm) 
    arranged in ${formData.layerCount} layer(s).`,
    keyResults: [
      { label: 'Track Contact Pressure', value: `${results.trackContactPressure} kPa` },
      { label: 'Pressure at Ground', value: `${results.pressureAtGround} kPa`, highlight: true },
      {
        label: 'Bearing Utilisation',
        value: `${(parseFloat(results.bearingUtilisation) * 100).toFixed(0)}%`,
      },
      {
        label: 'Mat Bending Utilisation',
        value: `${(parseFloat(results.bendingUtilisation) * 100).toFixed(0)}%`,
      },
      { label: 'Minimum Mats Required', value: results.minMatsRequired },
    ],
    overallStatus,
    governingCheck: governingCheck.name,
    utilisationSummary: `Maximum utilisation: ${(governingCheck.util * 100).toFixed(0)}% (${governingCheck.name})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Equipment Loading',
        parameters: [
          { name: 'Machine Type', value: formData.machineType },
          { name: 'Gross Weight', value: formData.grossWeight, unit: 'tonnes' },
          { name: 'Track Length', value: formData.trackLength, unit: 'm' },
          { name: 'Track Width', value: formData.trackWidth, unit: 'm' },
          { name: 'Number of Tracks', value: formData.numberOfTracks },
        ],
      },
      {
        title: 'Ground Conditions',
        parameters: [
          { name: 'Ground Type', value: formData.groundType },
          { name: 'Allowable Bearing', value: formData.groundBearing, unit: 'kPa' },
          { name: 'Ground CBR', value: formData.groundCBR, unit: '%' },
          { name: 'Water Table Depth', value: formData.waterTableDepth, unit: 'm' },
        ],
      },
      {
        title: 'Mat Properties',
        parameters: [
          { name: 'Mat Type', value: formData.matType },
          {
            name: 'Mat Dimensions',
            value: `${formData.matLength}m × ${formData.matWidth}m × ${formData.matThickness}mm`,
          },
          { name: 'Mat Material', value: formData.matMaterial },
          { name: 'Number of Layers', value: formData.layerCount },
          { name: 'Orientation', value: formData.orientation },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Ground Bearing Capacity',
      description: 'Verification of ground bearing under distributed mat loading',
      checks: [
        {
          name: 'Bearing Pressure Check',
          formula: 'σ_ground ≤ q_allowable',
          calculated: `${results.pressureAtGround} kPa`,
          limit: `≤ ${results.allowableBearing} kPa`,
          utilisation: parseFloat(results.bearingUtilisation),
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Mat Bending Check',
      description: 'Verification of mat structural capacity in bending',
      checks: [
        {
          name: 'Bending Stress',
          formula: 'σ_b = M / W ≤ f_b',
          calculated: `${results.bendingStress} MPa`,
          limit: `≤ ${results.allowableBending} MPa`,
          utilisation: parseFloat(results.bendingUtilisation),
          status: results.bendingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Mat Shear Check',
      description: 'Verification of mat shear capacity',
      checks: [
        {
          name: 'Shear Stress',
          formula: 'τ = 1.5V / A ≤ f_v',
          calculated: `${results.shearStress} MPa`,
          limit: `≤ ${results.allowableShear} MPa`,
          utilisation: parseFloat(results.shearUtilisation),
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Deflection Check',
      description: 'Serviceability check for mat deflection',
      checks: [
        {
          name: 'Maximum Deflection',
          formula: 'δ ≤ L/150',
          calculated: `${results.maxDeflection} mm`,
          limit: `≤ ${results.deflectionLimit} mm`,
          utilisation: parseFloat(results.deflectionUtilisation),
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Contact Pressure Calculation',
      steps: [
        {
          description: 'Calculate track contact area',
          formula: 'A_track = L_track × W_track × n_tracks',
          substitution: `A_track = ${formData.trackLength} × ${formData.trackWidth} × ${formData.numberOfTracks}`,
          result: `${(parseFloat(formData.trackLength) * parseFloat(formData.trackWidth) * parseFloat(formData.numberOfTracks)).toFixed(2)} m²`,
        },
        {
          description: 'Calculate track contact pressure',
          formula: 'σ_track = W × 9.81 / A_track',
          substitution: `σ_track = ${formData.grossWeight} × 9.81 / A_track`,
          result: `${results.trackContactPressure} kPa`,
        },
      ],
    },
    {
      title: 'Load Distribution Through Mats',
      steps: [
        {
          description: 'Assume 2:1 load spread through mat thickness',
          formula: 'A_eff = (L + 2t) × (W + 2t)',
          result: `${results.effectiveArea} m²`,
        },
        {
          description: 'Calculate pressure at ground level',
          formula: 'σ_ground = P / A_eff',
          result: `${results.pressureAtGround} kPa`,
        },
      ],
    },
    {
      title: 'Mat Structural Analysis',
      steps: [
        {
          description: 'Maximum bending moment (simply supported)',
          formula: 'M = wL²/8 for distributed load',
          result: `${results.maxBendingMoment} kNm/m`,
        },
        {
          description: 'Section modulus of mat',
          formula: 'W = bt²/6',
          result: `Calculated for ${formData.matThickness}mm thickness`,
        },
        {
          description: 'Bending stress',
          formula: 'σ_b = M / W',
          result: `${results.bendingStress} MPa`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type:
      w.toLowerCase().includes('fail') || w.toLowerCase().includes('exceed') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.groundCBR) < 2) {
    reportWarnings.push({
      type: 'warning',
      message: 'Very soft ground conditions - consider geotextile separation layer',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The ground mat system is ADEQUATE for the ${formData.machineType}. 
         ${formData.matType} mats provide sufficient load distribution to maintain 
         ground bearing pressure within allowable limits.`
        : `The ground mat system is INADEQUATE. Review failing checks and consider 
         additional mat layers, larger mats, or ground improvement.`,
    status: overallStatus,
    recommendations: [
      `Minimum ${results.minMatsRequired} mats required for safe operation`,
      `Arrange mats ${formData.orientation} to track direction`,
      `Inspect mats daily for damage or excessive deflection`,
      `Ensure mats are placed on level, prepared ground`,
      results.recommendedLayout,
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
