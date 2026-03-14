// ============================================================================
// BeaverCalc Studio — Slope Stability Report Data Builder
// Limit Equilibrium Slope Analysis
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
 * Form data from the Slope Stability calculator
 */
export interface SlopeStabilityFormData {
  // Slope Geometry
  slopeHeight: string;
  slopeAngle: string;
  slopeBatter: string;
  crestWidth: string;
  toeWidth: string;

  // Soil Layers
  layer1Thickness: string;
  layer1UnitWeight: string;
  layer1Cohesion: string;
  layer1Friction: string;

  layer2Thickness: string;
  layer2UnitWeight: string;
  layer2Cohesion: string;
  layer2Friction: string;

  // Water Table
  waterTablePresent: string;
  waterTableDepth: string;
  seepageAngle: string;

  // Surcharge
  crestSurcharge: string;
  surchargeWidth: string;

  // Analysis Method
  analysisMethod: string;

  // Reinforcement (optional)
  reinforcementType: string;
  reinforcementSpacing: string;
  reinforcementStrength: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Slope Stability calculator
 */
export interface SlopeStabilityResults {
  // Critical Slip Surface
  criticalRadius: string;
  criticalCenterX: string;
  criticalCenterY: string;
  slipAngle: string;

  // Forces
  drivingMoment: string;
  resistingMoment: string;
  drivingForce: string;
  resistingForce: string;

  // Factor of Safety
  unreinforcedFOS: string;
  reinforcedFOS: string;
  requiredFOS: string;
  fosStatus: string;

  // Failure Mode
  failureMode: string;
  sliceCount: string;

  // Reinforcement Effect
  reinforcementContribution: string;
  fosImprovement: string;

  // Sensitivity
  fosAtSaturated: string;
  fosAtSeismic: string;

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
 * Build a ReportData object from Slope Stability calculator results
 */
export function buildSlopeStabilityReport(
  formData: SlopeStabilityFormData,
  results: SlopeStabilityResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.fosStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Slope Stability Analysis',
    projectName: options.projectName || formData.projectTitle || 'Slope Stability',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `SLP-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Slope Stability',
    designCodes: ['Eurocode 7', 'BS 6031', 'Bishop (1955)', 'Janbu (1973)'],
  };

  // Build executive summary
  const hasReinforcement = formData.reinforcementType && formData.reinforcementType !== 'none';
  const executiveSummary = {
    description: `${formData.analysisMethod} slope stability analysis for a ${formData.slopeHeight}m high 
    slope at ${formData.slopeAngle}° (${formData.slopeBatter}:1 batter).
    ${hasReinforcement ? `Reinforced with ${formData.reinforcementType} at ${formData.reinforcementSpacing}m spacing.` : 'Unreinforced slope.'}
    Water table ${formData.waterTablePresent === 'yes' ? `at ${formData.waterTableDepth}m depth` : 'not present'}.`,
    keyResults: [
      { label: 'Slope Height', value: `${formData.slopeHeight} m` },
      { label: 'Slope Angle', value: `${formData.slopeAngle}°` },
      {
        label: 'Factor of Safety',
        value: hasReinforcement ? results.reinforcedFOS : results.unreinforcedFOS,
        highlight: true,
      },
      { label: 'Required FOS', value: results.requiredFOS },
      { label: 'Critical Failure Mode', value: results.failureMode },
    ],
    overallStatus,
    governingCheck: 'Global Stability',
    utilisationSummary: `FOS = ${hasReinforcement ? results.reinforcedFOS : results.unreinforcedFOS} (min ${results.requiredFOS} required)`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Slope Geometry',
        parameters: [
          { name: 'Slope Height', value: formData.slopeHeight, unit: 'm' },
          { name: 'Slope Angle', value: formData.slopeAngle, unit: '°' },
          { name: 'Batter Ratio', value: formData.slopeBatter, unit: ':1' },
          { name: 'Crest Width', value: formData.crestWidth, unit: 'm' },
        ],
      },
      {
        title: 'Soil Layer 1',
        parameters: [
          { name: 'Thickness', value: formData.layer1Thickness, unit: 'm' },
          { name: 'Unit Weight', value: formData.layer1UnitWeight, unit: 'kN/m³' },
          { name: 'Cohesion', value: formData.layer1Cohesion, unit: 'kPa' },
          { name: 'Friction Angle', value: formData.layer1Friction, unit: '°' },
        ],
      },
      {
        title: 'Soil Layer 2',
        parameters: [
          { name: 'Thickness', value: formData.layer2Thickness, unit: 'm' },
          { name: 'Unit Weight', value: formData.layer2UnitWeight, unit: 'kN/m³' },
          { name: 'Cohesion', value: formData.layer2Cohesion, unit: 'kPa' },
          { name: 'Friction Angle', value: formData.layer2Friction, unit: '°' },
        ],
      },
      {
        title: 'Water & Loading',
        parameters: [
          { name: 'Water Table Present', value: formData.waterTablePresent },
          { name: 'Water Table Depth', value: formData.waterTableDepth, unit: 'm' },
          { name: 'Crest Surcharge', value: formData.crestSurcharge, unit: 'kPa' },
          { name: 'Surcharge Width', value: formData.surchargeWidth, unit: 'm' },
        ],
      },
      ...(hasReinforcement
        ? [
            {
              title: 'Reinforcement',
              parameters: [
                { name: 'Type', value: formData.reinforcementType },
                { name: 'Vertical Spacing', value: formData.reinforcementSpacing, unit: 'm' },
                { name: 'Ultimate Strength', value: formData.reinforcementStrength, unit: 'kN/m' },
              ],
            },
          ]
        : []),
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Global Stability (Static)',
      description: `${formData.analysisMethod} analysis with ${results.sliceCount} slices`,
      checks: [
        {
          name: 'Factor of Safety (Unreinforced)',
          formula: 'FOS = ΣM_resist / ΣM_driving ≥ FOS_req',
          calculated: results.unreinforcedFOS,
          limit: `≥ ${results.requiredFOS}`,
          utilisation: parseFloat(results.requiredFOS) / parseFloat(results.unreinforcedFOS),
          status:
            parseFloat(results.unreinforcedFOS) >= parseFloat(results.requiredFOS)
              ? 'PASS'
              : 'FAIL',
        },
        ...(hasReinforcement
          ? [
              {
                name: 'Factor of Safety (Reinforced)',
                formula: 'FOS = (ΣM_resist + M_reinf) / ΣM_driving',
                calculated: results.reinforcedFOS,
                limit: `≥ ${results.requiredFOS}`,
                utilisation: parseFloat(results.requiredFOS) / parseFloat(results.reinforcedFOS),
                status:
                  parseFloat(results.reinforcedFOS) >= parseFloat(results.requiredFOS)
                    ? ('PASS' as const)
                    : ('FAIL' as const),
              },
            ]
          : []),
      ],
    },
    {
      title: 'Sensitivity Analysis',
      description: 'Factor of Safety under adverse conditions',
      checks: [
        {
          name: 'Fully Saturated Condition',
          formula: 'FOS_sat',
          calculated: results.fosAtSaturated,
          limit: '≥ 1.30',
          utilisation: 1.3 / parseFloat(results.fosAtSaturated),
          status: parseFloat(results.fosAtSaturated) >= 1.3 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Seismic Condition (pseudo-static)',
          formula: 'FOS_seis',
          calculated: results.fosAtSeismic,
          limit: '≥ 1.10',
          utilisation: 1.1 / parseFloat(results.fosAtSeismic),
          status: parseFloat(results.fosAtSeismic) >= 1.1 ? 'PASS' : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Critical Slip Surface',
      steps: [
        {
          description: 'Critical circle radius',
          formula: 'R_critical (from search)',
          result: `${results.criticalRadius} m`,
        },
        {
          description: 'Circle center location',
          formula: '(X_c, Y_c)',
          result: `(${results.criticalCenterX}, ${results.criticalCenterY}) m`,
        },
        {
          description: 'Failure mode',
          formula: 'Based on slip surface geometry',
          result: results.failureMode,
        },
      ],
    },
    {
      title: 'Driving & Resisting Forces',
      steps: [
        {
          description: 'Total driving moment',
          formula: 'M_d = Σ(W_i × sin(α_i) × R)',
          result: `${results.drivingMoment} kNm/m`,
        },
        {
          description: 'Total resisting moment',
          formula: 'M_r = Σ(c × L_i + N_i × tan(φ)) × R',
          result: `${results.resistingMoment} kNm/m`,
        },
      ],
    },
    {
      title: 'Factor of Safety Calculation',
      steps: [
        {
          description: 'Unreinforced FOS',
          formula: 'FOS = M_resist / M_driving',
          substitution: `FOS = ${results.resistingMoment} / ${results.drivingMoment}`,
          result: results.unreinforcedFOS,
        },
        ...(hasReinforcement
          ? [
              {
                description: 'Reinforcement contribution',
                formula: 'M_reinf = Σ(T_design × arm)',
                result: `${results.reinforcementContribution} kNm/m`,
              },
              {
                description: 'Reinforced FOS',
                formula: 'FOS_reinf = (M_resist + M_reinf) / M_driving',
                result: results.reinforcedFOS,
              },
              {
                description: 'FOS improvement',
                formula: 'ΔFOS = FOS_reinf - FOS_unreinf',
                result: `+${results.fosImprovement}`,
              },
            ]
          : []),
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.unreinforcedFOS) < 1.0) {
    reportWarnings.push({
      type: 'error',
      message: 'Unreinforced FOS < 1.0 - slope is unstable',
    });
  }

  if (parseFloat(results.fosAtSaturated) < 1.0) {
    reportWarnings.push({
      type: 'warning',
      message: 'Slope is unstable when saturated - provide drainage',
    });
  }

  if (parseFloat(formData.slopeAngle) > 45) {
    reportWarnings.push({
      type: 'info',
      message: 'Steep slope angle > 45° - verify with detailed geotechnical analysis',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The slope design is ADEQUATE with FOS = ${hasReinforcement ? results.reinforcedFOS : results.unreinforcedFOS} 
         (minimum ${results.requiredFOS} required). Critical failure mode: ${results.failureMode}.`
        : `The slope design is INADEQUATE. Consider reducing slope angle, adding berms, 
         installing drainage, or adding reinforcement.`,
    status: overallStatus,
    recommendations: [
      'Install slope drainage to prevent pore pressure buildup',
      'Provide erosion protection on slope face',
      'Monitor slope movement with inclinometers',
      `${hasReinforcement ? `Install ${formData.reinforcementType} at ${formData.reinforcementSpacing}m vertical spacing` : 'Consider reinforcement if marginal FOS'}`,
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
