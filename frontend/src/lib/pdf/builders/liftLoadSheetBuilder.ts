// ============================================================================
// BeaverCalc Studio — Lift Load Sheet Report Data Builder
// Crane/Lifting Operations Load Assessment
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
 * Form data from the Lift Load Sheet calculator
 */
export interface LiftLoadSheetFormData {
  // Lift Identification
  liftNumber: string;
  liftDescription: string;

  // Load Details
  loadDescription: string;
  loadWeight: string;
  loadCOG: string;
  loadDimensions: string;

  // Rigging
  riggingType: string;
  riggingWeight: string;
  slingType: string;
  slingWLL: string;
  slingAngle: string;
  numberOfLegs: string;

  // Crane Details
  craneType: string;
  craneCapacity: string;
  craneRadius: string;
  boomLength: string;
  craneSLC: string;

  // Environmental
  windSpeed: string;
  windFactor: string;
  dynamicFactor: string;

  // Factors
  consequenceFactor: string;
  asymmetryFactor: string;
  skewFactor: string;

  // Project
  projectTitle: string;
  liftPlanner: string;
  apCode: string;
}

/**
 * Results from the Lift Load Sheet calculator
 */
export interface LiftLoadSheetResults {
  // Weight Summary
  nettLoadWeight: string;
  riggingWeight: string;
  grossHookLoad: string;

  // Factors Applied
  totalFactor: string;
  factoredLoad: string;

  // Sling Check
  slingTension: string;
  slingCapacity: string;
  slingUtil: string;
  slingStatus: string;

  // Crane Check
  craneLoadAtRadius: string;
  craneCapacityAtRadius: string;
  craneUtil: string;
  craneStatus: string;

  // Ground Bearing
  outriggerLoad: string;
  padSize: string;
  groundPressure: string;
  groundBearing: string;
  groundStatus: string;

  // Stability
  stabilityMoment: string;
  overturningMoment: string;
  stabilityFOS: string;
  stabilityStatus: string;

  // Clearances
  headroom: string;
  tailSwing: string;
  clearanceStatus: string;

  // Risk Assessment
  riskCategory: string;
  liftCategory: string;

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
 * Build a ReportData object from Lift Load Sheet calculator results
 */
export function buildLiftLoadSheetReport(
  formData: LiftLoadSheetFormData,
  results: LiftLoadSheetResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.slingStatus,
    results.craneStatus,
    results.groundStatus,
    results.stabilityStatus,
    results.clearanceStatus,
  ];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'Lift Load Sheet',
    projectName: options.projectName || formData.projectTitle || 'Lift Operation',
    clientName: options.clientName || 'Client',
    documentRef:
      options.documentRef || `LLS-${formData.liftNumber || Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || formData.liftPlanner || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Lift Load Sheet',
    designCodes: ['BS 7121', 'LOLER 1998', formData.apCode || 'AP Code'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Lift ${formData.liftNumber}: ${formData.liftDescription}.
    ${formData.loadDescription} (${formData.loadWeight}t) using ${formData.craneType}.
    Radius: ${formData.craneRadius}m, ${formData.slingType} slings at ${formData.slingAngle}°.
    ${results.liftCategory} lift.`,
    keyResults: [
      { label: 'Lift Number', value: formData.liftNumber },
      { label: 'Gross Hook Load', value: `${results.grossHookLoad} t`, highlight: true },
      { label: 'Crane Utilisation', value: `${results.craneUtil}%` },
      { label: 'Sling Utilisation', value: `${results.slingUtil}%` },
      { label: 'Lift Category', value: results.liftCategory },
    ],
    overallStatus,
    governingCheck: getGoverningCheck(results),
    utilisationSummary: `Crane at ${results.craneUtil}%, Slings at ${results.slingUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Lift Identification',
        parameters: [
          { name: 'Lift Number', value: formData.liftNumber },
          { name: 'Description', value: formData.liftDescription },
          { name: 'AP Code', value: formData.apCode },
        ],
      },
      {
        title: 'Load Details',
        parameters: [
          { name: 'Load Description', value: formData.loadDescription },
          { name: 'Nett Weight', value: formData.loadWeight, unit: 't' },
          { name: 'COG Location', value: formData.loadCOG },
          { name: 'Dimensions', value: formData.loadDimensions },
        ],
      },
      {
        title: 'Rigging',
        parameters: [
          { name: 'Rigging Type', value: formData.riggingType },
          { name: 'Rigging Weight', value: formData.riggingWeight, unit: 't' },
          { name: 'Sling Type', value: formData.slingType },
          { name: 'Sling WLL', value: formData.slingWLL, unit: 't' },
          { name: 'Sling Angle', value: formData.slingAngle, unit: '°' },
          { name: 'Number of Legs', value: formData.numberOfLegs },
        ],
      },
      {
        title: 'Crane',
        parameters: [
          { name: 'Crane Type/Model', value: formData.craneType },
          { name: 'Max Capacity', value: formData.craneCapacity, unit: 't' },
          { name: 'Working Radius', value: formData.craneRadius, unit: 'm' },
          { name: 'Boom Length', value: formData.boomLength, unit: 'm' },
          { name: 'SLC at Radius', value: formData.craneSLC, unit: 't' },
        ],
      },
      {
        title: 'Factors & Environment',
        parameters: [
          { name: 'Wind Speed', value: formData.windSpeed, unit: 'm/s' },
          { name: 'Wind Factor', value: formData.windFactor },
          { name: 'Dynamic Factor', value: formData.dynamicFactor },
          { name: 'Consequence Factor', value: formData.consequenceFactor },
          { name: 'Asymmetry Factor', value: formData.asymmetryFactor },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Load Build-Up',
      description: 'Calculate gross hook load with factors',
      checks: [
        {
          name: 'Nett Load Weight',
          formula: 'From weigh ticket/calculation',
          calculated: `${formData.loadWeight} t`,
          limit: 'N/A',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Gross Hook Load',
          formula: 'GHL = Nett + Rigging',
          calculated: `${results.grossHookLoad} t`,
          limit: 'N/A',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Factored Load',
          formula: 'FL = GHL × Dynamic × Consequence × Asymmetry',
          calculated: `${results.factoredLoad} t`,
          limit: 'Applied to crane check',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Sling Capacity',
      description: 'Check sling/rigging at angle',
      checks: [
        {
          name: 'Sling Tension',
          formula: 'T = W / (n × cos(θ)) for vertical',
          calculated: `${results.slingTension} t`,
          limit: `≤ ${results.slingCapacity} t WLL`,
          utilisation: parseFloat(results.slingUtil) / 100,
          status: results.slingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Crane Capacity',
      description: 'Check crane SLC at radius',
      checks: [
        {
          name: 'Crane Load',
          formula: 'Load at working radius',
          calculated: `${results.craneLoadAtRadius} t`,
          limit: `≤ ${results.craneCapacityAtRadius} t SLC`,
          utilisation: parseFloat(results.craneUtil) / 100,
          status: results.craneStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Ground Bearing',
      description: 'Outrigger pad pressure',
      checks: [
        {
          name: 'Ground Pressure',
          formula: 'p = Foutrigger / Apad',
          calculated: `${results.groundPressure} kPa`,
          limit: `≤ ${results.groundBearing} kPa`,
          utilisation: parseFloat(results.groundPressure) / parseFloat(results.groundBearing),
          status: results.groundStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Crane Stability',
      description: 'Overturning check',
      checks: [
        {
          name: 'Stability Factor',
          formula: 'FOS = M_stabilising / M_overturning',
          calculated: results.stabilityFOS,
          limit: '≥ 1.25 (working)',
          utilisation: 1.25 / parseFloat(results.stabilityFOS),
          status: results.stabilityStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Clearances',
      description: 'Spatial checks',
      checks: [
        {
          name: 'Headroom',
          formula: 'Boom tip clearance',
          calculated: `${results.headroom} m`,
          limit: '≥ 2.0 m to obstacles',
          utilisation: 2.0 / parseFloat(results.headroom),
          status: results.clearanceStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Tail Swing',
          formula: 'Counterweight radius',
          calculated: `${results.tailSwing} m`,
          limit: 'Clear of obstructions',
          utilisation: 0,
          status: results.clearanceStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Load Calculation',
      steps: [
        {
          description: 'Nett load weight',
          formula: 'From certified weighing',
          result: `${formData.loadWeight} t`,
        },
        {
          description: 'Rigging weight',
          formula: 'Slings + shackles + spreader',
          result: `${formData.riggingWeight} t`,
        },
        {
          description: 'Gross hook load',
          formula: 'GHL = Nett + Rigging',
          substitution: `GHL = ${formData.loadWeight} + ${formData.riggingWeight}`,
          result: `${results.grossHookLoad} t`,
        },
      ],
    },
    {
      title: 'Sling Calculation',
      steps: [
        {
          description: 'Sling angle factor',
          formula: 'Mode factor for angle θ',
          result: `At ${formData.slingAngle}° from vertical`,
        },
        {
          description: 'Tension per leg',
          formula: 'T = W / (n × cos(θ))',
          result: `${results.slingTension} t per leg`,
        },
        {
          description: 'Sling utilisation',
          formula: 'Util = T / WLL × 100',
          result: `${results.slingUtil}%`,
        },
      ],
    },
    {
      title: 'Crane Check',
      steps: [
        {
          description: 'Chart capacity at radius',
          formula: `${formData.craneType} at ${formData.craneRadius}m`,
          result: `SLC = ${formData.craneSLC} t`,
        },
        {
          description: 'Load with factors',
          formula: 'FL = GHL × factors',
          result: `${results.factoredLoad} t`,
        },
        {
          description: 'Crane utilisation',
          formula: 'Util = FL / SLC × 100',
          result: `${results.craneUtil}%`,
        },
      ],
    },
    {
      title: 'Ground Bearing',
      steps: [
        {
          description: 'Max outrigger reaction',
          formula: 'From crane manufacturer data',
          result: `${results.outriggerLoad} t`,
        },
        {
          description: 'Pad size required',
          formula: 'A = F / p_allow',
          result: `${results.padSize}`,
        },
        {
          description: 'Ground pressure',
          formula: 'p = F / A',
          result: `${results.groundPressure} kPa`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.craneUtil) > 80) {
    reportWarnings.push({
      type: 'warning',
      message: `Crane utilisation ${results.craneUtil}% > 80% - Critical Lift procedures apply`,
    });
  }

  if (parseFloat(formData.windSpeed) > 9) {
    reportWarnings.push({
      type: 'warning',
      message: `Wind speed ${formData.windSpeed} m/s - monitor conditions`,
    });
  }

  if (parseFloat(formData.slingAngle) > 45) {
    reportWarnings.push({
      type: 'info',
      message: `Sling angle ${formData.slingAngle}° from vertical - verify WLL de-rating`,
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `Lift ${formData.liftNumber} is APPROVED. ${formData.craneType} at ${formData.craneRadius}m radius 
         with ${results.grossHookLoad}t gross hook load. Crane at ${results.craneUtil}%, 
         Slings at ${results.slingUtil}%. ${results.liftCategory} Lift.`
        : `Lift ${formData.liftNumber} FAILS review. Revise lift plan before proceeding.`,
    status: overallStatus,
    recommendations: [
      `Pre-lift briefing required for all personnel`,
      `Verify ground conditions at outrigger positions`,
      `Confirm exclusion zone radius: ${parseFloat(formData.craneRadius) + 5}m minimum`,
      `Sling inspection prior to rigging`,
      parseFloat(results.craneUtil) > 80
        ? 'CRITICAL LIFT - AP supervision required'
        : 'Standard lift procedures apply',
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

function getGoverningCheck(results: LiftLoadSheetResults): string {
  const checks = [
    { name: 'Crane Capacity', util: parseFloat(results.craneUtil) },
    { name: 'Sling Capacity', util: parseFloat(results.slingUtil) },
  ];
  return checks.reduce((a, b) => (a.util > b.util ? a : b)).name;
}
