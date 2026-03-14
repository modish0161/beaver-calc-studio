// ============================================================================
// BeaverCalc Studio — Sling Angle Calculator Report Data Builder
// Rigging Load Distribution & Sling Capacity Check
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
 * Form data from the Sling Angle Calculator
 */
export interface SlingAngleFormData {
  // Load Details
  loadWeight: string; // tonnes
  loadDescription: string;
  cogPosition: string; // Central, Off-centre
  cogOffset: string; // mm (if off-centre)

  // Sling Configuration
  numberOfLegs: string; // 1, 2, 3, 4
  slingMode: string; // Vertical, Basket, Choked
  slingType: string; // Chain, Wire rope, Webbing, Round sling

  // Geometry
  slingLength: string; // m
  headroom: string; // m (hook to load attachment)
  spreadWidth: string; // m (between attachment points)
  spreadLength: string; // m (for 4-leg)

  // Sling Properties
  slingWLL: string; // tonnes (vertical rating)
  slingModeFactors: string; // Use mode factor table

  // Safety Factors
  dynamicFactor: string;
  consequenceFactor: string;

  // Options
  useSpreadBeam: string; // Yes/No
  spreadBeamWeight: string; // tonnes
}

/**
 * Results from the Sling Angle Calculator
 */
export interface SlingAngleResults {
  // Geometry
  calculatedAngle: string; // degrees from vertical
  angleFactor: string; // 1/cos(θ)

  // Load Distribution
  loadPerLeg: string; // tonnes
  loadWithFactors: string; // tonnes
  effectiveLegs: string; // For 4-leg, typically 3 used

  // Mode Factor
  modeReductionFactor: string;
  effectiveWLL: string; // After mode factor

  // Angle Reduction
  angleReductionFactor: string;
  finalWLL: string; // After angle reduction

  // Utilisation
  tensionPerSling: string; // tonnes
  slingUtil: string; // %
  slingStatus: string;

  // Angle Assessment
  angleCategory: string; // Green/Amber/Red zone
  angleWarning: string;

  // Hook Load
  hookLoad: string; // Total at hook

  // COG Effect
  cogEffect: string; // Load increase on near side
  maxLegLoad: string;

  // Recommendations
  minSlingWLLRequired: string;
  recommendedSlingSize: string;

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
 * Build a ReportData object from Sling Angle calculator results
 */
export function buildSlingAngleReport(
  formData: SlingAngleFormData,
  results: SlingAngleResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Sling Angle & Load Distribution',
    projectName: options.projectName || 'Rigging Calculation',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `SA-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Sling Angle Calculator',
    designCodes: ['BS 7121-1', 'LEEA Code of Practice'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.numberOfLegs}-leg ${formData.slingType} sling set in ${formData.slingMode.toLowerCase()} mode.
    Load: ${formData.loadWeight}t, Angle: ${results.calculatedAngle}° from vertical.
    Sling rating: ${formData.slingWLL}t WLL per leg. ${results.angleCategory} zone.`,
    keyResults: [
      { label: 'Load Weight', value: `${formData.loadWeight} t` },
      { label: 'Sling Angle', value: `${results.calculatedAngle}°`, highlight: true },
      { label: 'Angle Zone', value: results.angleCategory },
      { label: 'Load per Leg', value: `${results.tensionPerSling} t` },
      { label: 'Sling Utilisation', value: `${results.slingUtil}%` },
    ],
    overallStatus,
    governingCheck: 'Sling Capacity',
    utilisationSummary: `${results.slingUtil}% of de-rated sling capacity`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Load Details',
        parameters: [
          { name: 'Load Description', value: formData.loadDescription },
          { name: 'Load Weight', value: formData.loadWeight, unit: 't' },
          { name: 'COG Position', value: formData.cogPosition },
          ...(formData.cogPosition === 'Off-centre'
            ? [{ name: 'COG Offset', value: formData.cogOffset, unit: 'mm' }]
            : []),
        ],
      },
      {
        title: 'Sling Configuration',
        parameters: [
          { name: 'Number of Legs', value: formData.numberOfLegs },
          { name: 'Sling Mode', value: formData.slingMode },
          { name: 'Sling Type', value: formData.slingType },
          { name: 'Sling WLL (vertical)', value: formData.slingWLL, unit: 't' },
        ],
      },
      {
        title: 'Geometry',
        parameters: [
          { name: 'Sling Length', value: formData.slingLength, unit: 'm' },
          { name: 'Headroom (hook to load)', value: formData.headroom, unit: 'm' },
          { name: 'Spread Width', value: formData.spreadWidth, unit: 'm' },
          ...(formData.numberOfLegs === '4'
            ? [{ name: 'Spread Length', value: formData.spreadLength, unit: 'm' }]
            : []),
        ],
      },
      {
        title: 'Factors',
        parameters: [
          { name: 'Dynamic Factor', value: formData.dynamicFactor },
          { name: 'Consequence Factor', value: formData.consequenceFactor },
          { name: 'Effective Legs Used', value: results.effectiveLegs },
        ],
      },
      ...(formData.useSpreadBeam === 'Yes'
        ? [
            {
              title: 'Spreader Beam',
              parameters: [
                { name: 'Spreader Used', value: 'Yes' },
                { name: 'Spreader Weight', value: formData.spreadBeamWeight, unit: 't' },
              ],
            },
          ]
        : []),
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Sling Angle',
      description: 'Angle from vertical assessment',
      checks: [
        {
          name: 'Calculated Angle',
          formula: 'θ = arctan(spread/2 / height)',
          calculated: `${results.calculatedAngle}°`,
          limit: '≤ 60° maximum',
          utilisation: parseFloat(results.calculatedAngle) / 60,
          status: parseFloat(results.calculatedAngle) <= 60 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Angle Zone',
          formula: '0-45°: Green, 45-60°: Amber, >60°: Red',
          calculated: results.angleCategory,
          limit: 'Amber or Green',
          utilisation: 0,
          status: results.angleCategory === 'Red' ? 'FAIL' : 'PASS',
        },
      ],
    },
    {
      title: 'Load Distribution',
      description: 'Force per sling leg',
      checks: [
        {
          name: 'Vertical Component',
          formula: 'W / n (or W/3 for 4-leg)',
          calculated: `${results.loadPerLeg} t`,
          limit: 'Factored load',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Tension in Sling',
          formula: 'T = W / (n × cos(θ))',
          calculated: `${results.tensionPerSling} t`,
          limit: `≤ ${results.finalWLL} t (de-rated WLL)`,
          utilisation: parseFloat(results.slingUtil) / 100,
          status: results.slingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Sling Capacity',
      description: 'WLL de-rating for mode and angle',
      checks: [
        {
          name: 'Mode Factor',
          formula: `${formData.slingMode} mode`,
          calculated: results.modeReductionFactor,
          limit: 'Per LEEA tables',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Angle Reduction',
          formula: 'Per angle chart',
          calculated: results.angleReductionFactor,
          limit: 'Combined factor',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Effective WLL',
          formula: 'WLL × mode × angle factor',
          calculated: `${results.finalWLL} t`,
          limit: `Applied: ${formData.slingWLL}t base`,
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Sling Utilisation',
          formula: 'Tension / Effective WLL × 100',
          calculated: `${results.slingUtil}%`,
          limit: '≤ 100%',
          utilisation: parseFloat(results.slingUtil) / 100,
          status: results.slingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Add COG effect if off-centre
  if (formData.cogPosition === 'Off-centre') {
    designChecks.push({
      title: 'COG Effect',
      description: 'Asymmetric load distribution',
      checks: [
        {
          name: 'Load Increase Factor',
          formula: 'Due to offset COG',
          calculated: results.cogEffect,
          limit: 'Applied to critical leg',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Max Leg Load',
          formula: 'T × COG factor',
          calculated: `${results.maxLegLoad} t`,
          limit: `≤ ${results.finalWLL} t`,
          utilisation: parseFloat(results.maxLegLoad) / parseFloat(results.finalWLL),
          status: results.slingStatus as 'PASS' | 'FAIL',
        },
      ],
    });
  }

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Sling Geometry',
      steps: [
        {
          description: 'Sling length',
          formula: 'L_sling',
          result: `L = ${formData.slingLength} m`,
        },
        {
          description: 'Horizontal spread (half)',
          formula: 'a = spread / 2',
          substitution: `a = ${formData.spreadWidth} / 2`,
          result: `a = ${parseFloat(formData.spreadWidth) / 2} m`,
        },
        {
          description: 'Vertical height',
          formula: 'h = √(L² - a²)',
          result: `h = ${formData.headroom} m`,
        },
        {
          description: 'Angle from vertical',
          formula: 'θ = arctan(a / h)',
          result: `θ = ${results.calculatedAngle}°`,
        },
      ],
    },
    {
      title: 'Angle Factor Calculation',
      steps: [
        {
          description: 'Angle to radians',
          formula: 'θ_rad = θ × π/180',
          result: `θ_rad = ${((parseFloat(results.calculatedAngle) * Math.PI) / 180).toFixed(4)} rad`,
        },
        {
          description: 'Cosine of angle',
          formula: 'cos(θ)',
          result: `cos(${results.calculatedAngle}°) = ${Math.cos((parseFloat(results.calculatedAngle) * Math.PI) / 180).toFixed(4)}`,
        },
        {
          description: 'Angle factor',
          formula: 'AF = 1 / cos(θ)',
          result: `AF = ${results.angleFactor}`,
        },
      ],
    },
    {
      title: 'Load Distribution',
      steps: [
        {
          description: 'Number of effective legs',
          formula:
            formData.numberOfLegs === '4'
              ? '3 legs assumed (uneven support)'
              : `${formData.numberOfLegs} legs`,
          result: `n_eff = ${results.effectiveLegs}`,
        },
        {
          description: 'Vertical load per leg',
          formula: 'W_leg = W / n_eff',
          substitution: `W_leg = ${formData.loadWeight} / ${results.effectiveLegs}`,
          result: `W_leg = ${results.loadPerLeg} t`,
        },
        {
          description: 'Sling tension',
          formula: 'T = W_leg / cos(θ)',
          substitution: `T = ${results.loadPerLeg} × ${results.angleFactor}`,
          result: `T = ${results.tensionPerSling} t`,
        },
      ],
    },
    {
      title: 'Capacity De-Rating',
      steps: [
        {
          description: 'Base sling WLL',
          formula: 'Vertical rating',
          result: `WLL_base = ${formData.slingWLL} t`,
        },
        {
          description: 'Mode factor',
          formula: `${formData.slingMode} mode for ${formData.slingType}`,
          result: `MF = ${results.modeReductionFactor}`,
        },
        {
          description: 'Angle reduction (chart)',
          formula: `At ${results.calculatedAngle}° from vertical`,
          result: `ARF = ${results.angleReductionFactor}`,
        },
        {
          description: 'Effective WLL',
          formula: 'WLL_eff = WLL_base × MF × ARF',
          substitution: `WLL_eff = ${formData.slingWLL} × ${results.modeReductionFactor} × ${results.angleReductionFactor}`,
          result: `WLL_eff = ${results.finalWLL} t`,
        },
      ],
    },
    {
      title: 'Utilisation Check',
      steps: [
        {
          description: 'Sling tension',
          formula: 'As calculated above',
          result: `T = ${results.tensionPerSling} t`,
        },
        {
          description: 'Effective capacity',
          formula: 'De-rated WLL',
          result: `WLL_eff = ${results.finalWLL} t`,
        },
        {
          description: 'Utilisation',
          formula: 'Util = T / WLL_eff × 100',
          substitution: `Util = ${results.tensionPerSling} / ${results.finalWLL} × 100`,
          result: `Util = ${results.slingUtil}%`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.calculatedAngle) > 45) {
    reportWarnings.push({
      type: 'warning',
      message: `Sling angle ${results.calculatedAngle}° exceeds 45° - significant de-rating applies`,
    });
  }

  if (parseFloat(results.calculatedAngle) > 60) {
    reportWarnings.push({
      type: 'error',
      message: 'Sling angle exceeds 60° maximum - redesign required',
    });
  }

  if (formData.numberOfLegs === '4') {
    reportWarnings.push({
      type: 'info',
      message: '4-leg sling set: load distributed to 3 legs only (conservative)',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.numberOfLegs}-leg ${formData.slingType} sling set is ADEQUATE for ${formData.loadWeight}t load.
         Angle ${results.calculatedAngle}° (${results.angleCategory}), utilisation ${results.slingUtil}%.`
        : `Sling configuration INADEQUATE. Tension ${results.tensionPerSling}t exceeds capacity ${results.finalWLL}t.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.numberOfLegs} × ${formData.slingWLL}t WLL ${formData.slingType} slings`,
      `Minimum headroom to maintain angle: ${formData.headroom}m`,
      results.angleCategory === 'Amber'
        ? 'Consider increasing headroom to reduce angle'
        : 'Angle within acceptable range',
      `Min sling WLL required (vertical): ${results.minSlingWLLRequired} t`,
      `Suggested sling size: ${results.recommendedSlingSize}`,
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
