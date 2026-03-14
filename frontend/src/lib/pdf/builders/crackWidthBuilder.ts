// ============================================================================
// BeaverCalc Studio — Crack Width Report Data Builder
// RC Element Crack Width Check to Eurocode 2
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
 * Form data from the Crack Width calculator
 */
export interface CrackWidthFormData {
  // Element Type
  elementType: string;
  elementDescription: string;

  // Section Properties
  sectionWidth: string;
  sectionDepth: string;
  effectiveDepth: string;
  cover: string;

  // Concrete Properties
  concreteGrade: string;
  cementClass: string;
  ageAtLoading: string;

  // Reinforcement
  barDiameter: string;
  barSpacing: string;
  providedAs: string;

  // Loading (SLS)
  momentSLS: string;
  axialSLS: string;
  stressRatio: string;

  // Exposure
  exposureClass: string;
  wkMax: string;

  // Restraint
  restraintType: string;
  restraintFactor: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Crack Width calculator
 */
export interface CrackWidthResults {
  // Section Properties
  acEff: string;
  rhoEff: string;

  // Steel Stress
  steelStress: string;
  maxAllowableStress: string;
  stressStatus: string;

  // Crack Spacing
  srMax: string;
  k1: string;
  k2: string;
  k3: string;
  k4: string;

  // Strain Difference
  esmEcm: string;
  epsilonSm: string;
  epsilonCm: string;

  // Crack Width
  wkCalculated: string;
  wkLimit: string;
  crackUtil: string;
  crackStatus: string;

  // Direct Method Check
  directTableOK: string;
  tableBarSize: string;
  tableSpacing: string;

  // Early Age (if applicable)
  earlyAgeCrack: string;
  thermalStrain: string;
  shrinkageStrain: string;
  restrainedStrain: string;

  // Minimum Reinforcement
  asMin: string;
  asMinStatus: string;

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
 * Build a ReportData object from Crack Width calculator results
 */
export function buildCrackWidthReport(
  formData: CrackWidthFormData,
  results: CrackWidthResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [results.stressStatus, results.crackStatus, results.asMinStatus];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'Crack Width Check',
    projectName: options.projectName || formData.projectTitle || 'Crack Width Check',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `CRK-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Crack Width',
    designCodes: ['EN 1992-1-1:2004', 'UK NA', 'CIRIA C660'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Crack width check for ${formData.elementType}: ${formData.sectionWidth}×${formData.sectionDepth}mm 
    ${formData.concreteGrade} section with T${formData.barDiameter}@${formData.barSpacing}.
    Exposure class ${formData.exposureClass}, wk,max = ${formData.wkMax}mm.`,
    keyResults: [
      { label: 'Element', value: formData.elementDescription },
      { label: 'Calculated wk', value: `${results.wkCalculated} mm`, highlight: true },
      { label: 'Limit wk,max', value: `${results.wkLimit} mm` },
      { label: 'Utilisation', value: `${results.crackUtil}%` },
      { label: 'Steel Stress', value: `${results.steelStress} MPa` },
    ],
    overallStatus,
    governingCheck: 'Crack Width',
    utilisationSummary: `Crack width ratio: ${results.crackUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Section Properties',
        parameters: [
          { name: 'Element Type', value: formData.elementType },
          { name: 'Width', value: formData.sectionWidth, unit: 'mm' },
          { name: 'Depth', value: formData.sectionDepth, unit: 'mm' },
          { name: 'Effective Depth', value: formData.effectiveDepth, unit: 'mm' },
          { name: 'Cover', value: formData.cover, unit: 'mm' },
        ],
      },
      {
        title: 'Concrete',
        parameters: [
          { name: 'Concrete Grade', value: formData.concreteGrade },
          { name: 'Cement Class', value: formData.cementClass },
          { name: 'Age at Loading', value: formData.ageAtLoading, unit: 'days' },
        ],
      },
      {
        title: 'Reinforcement',
        parameters: [
          { name: 'Bar Diameter', value: formData.barDiameter, unit: 'mm' },
          { name: 'Bar Spacing', value: formData.barSpacing, unit: 'mm' },
          { name: 'Provided As', value: formData.providedAs, unit: 'mm²/m' },
        ],
      },
      {
        title: 'Loading (SLS)',
        parameters: [
          { name: 'Moment', value: formData.momentSLS, unit: 'kNm' },
          { name: 'Axial Force', value: formData.axialSLS, unit: 'kN' },
        ],
      },
      {
        title: 'Exposure & Restraint',
        parameters: [
          { name: 'Exposure Class', value: formData.exposureClass },
          { name: 'wk,max', value: formData.wkMax, unit: 'mm' },
          { name: 'Restraint Type', value: formData.restraintType },
          { name: 'Restraint Factor R', value: formData.restraintFactor },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Steel Stress Check (Table 7.2N)',
      description: 'Check stress for crack control without calculation',
      checks: [
        {
          name: 'Steel Stress',
          formula: 'σs ≤ Table 7.2N limit for wk,max',
          calculated: `${results.steelStress} MPa`,
          limit: `≤ ${results.maxAllowableStress} MPa`,
          utilisation: parseFloat(results.steelStress) / parseFloat(results.maxAllowableStress),
          status: results.stressStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Crack Width Calculation (EC2 7.3.4)',
      description: 'Direct crack width calculation',
      checks: [
        {
          name: 'Calculated Crack Width',
          formula: 'wk = sr,max × (εsm - εcm)',
          calculated: `${results.wkCalculated} mm`,
          limit: `≤ ${results.wkLimit} mm`,
          utilisation: parseFloat(results.crackUtil) / 100,
          status: results.crackStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Minimum Reinforcement (EC2 7.3.2)',
      description: 'Check minimum steel for crack control',
      checks: [
        {
          name: 'As,min',
          formula: 'As,min = kc × k × Act × fct,eff / σs',
          calculated: `${results.asMin} mm²/m`,
          limit: `≤ ${formData.providedAs} mm²/m`,
          utilisation: parseFloat(results.asMin) / parseFloat(formData.providedAs),
          status: results.asMinStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Tables 7.2N/7.3N Check',
      description: 'Deemed-to-satisfy rules',
      checks: [
        {
          name: 'Table Check',
          formula: 'Bar size and spacing from tables',
          calculated: results.directTableOK === 'yes' ? 'PASS' : 'Calculate',
          limit: `Bar ≤ T${results.tableBarSize} @ ${results.tableSpacing}mm`,
          utilisation: results.directTableOK === 'yes' ? 0.8 : 1.0,
          status: results.directTableOK === 'yes' ? 'PASS' : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Effective Tension Area',
      steps: [
        {
          description: 'Effective tension height',
          formula: 'hc,ef = min(2.5(h-d), (h-x)/3, h/2)',
          result: 'Based on section geometry',
        },
        {
          description: 'Effective tension area',
          formula: 'Ac,eff = b × hc,ef',
          result: `${results.acEff} mm²`,
        },
        {
          description: 'Effective reinforcement ratio',
          formula: 'ρp,eff = As / Ac,eff',
          result: results.rhoEff,
        },
      ],
    },
    {
      title: 'Maximum Crack Spacing',
      steps: [
        {
          description: 'Coefficients',
          formula: 'k1 (bond), k2 (strain), k3, k4',
          result: `k1=${results.k1}, k2=${results.k2}, k3=${results.k3}, k4=${results.k4}`,
        },
        {
          description: 'Maximum crack spacing',
          formula: 'sr,max = k3×c + k1×k2×k4×φ/ρp,eff',
          substitution: `sr,max = ${results.k3}×${formData.cover} + ${results.k1}×${results.k2}×${results.k4}×${formData.barDiameter}/${results.rhoEff}`,
          result: `sr,max = ${results.srMax} mm`,
        },
      ],
    },
    {
      title: 'Strain Difference',
      steps: [
        {
          description: 'Mean steel strain',
          formula: 'εsm = σs/Es',
          result: results.epsilonSm,
        },
        {
          description: 'Mean concrete strain',
          formula: 'εcm from tension stiffening',
          result: results.epsilonCm,
        },
        {
          description: 'Strain difference',
          formula: 'εsm - εcm = [σs - kt×fct,eff×(1+αe×ρp,eff)/ρp,eff] / Es',
          result: results.esmEcm,
        },
      ],
    },
    {
      title: 'Crack Width',
      steps: [
        {
          description: 'Characteristic crack width',
          formula: 'wk = sr,max × (εsm - εcm)',
          substitution: `wk = ${results.srMax} × ${results.esmEcm}`,
          result: `wk = ${results.wkCalculated} mm`,
        },
      ],
    },
    ...(formData.restraintType !== 'none'
      ? [
          {
            title: 'Early Age Cracking (CIRIA C660)',
            steps: [
              {
                description: 'Thermal strain',
                formula: 'εth = α × T1 × R',
                result: `εth = ${results.thermalStrain}`,
              },
              {
                description: 'Shrinkage strain',
                formula: 'εsh = εcd + εca',
                result: `εsh = ${results.shrinkageStrain}`,
              },
              {
                description: 'Total restrained strain',
                formula: 'εr = R × (εth + εsh)',
                result: `εr = ${results.restrainedStrain}`,
              },
              {
                description: 'Early age crack width',
                formula: 'w = sr,max × εr',
                result: `w = ${results.earlyAgeCrack} mm`,
              },
            ],
          },
        ]
      : []),
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.crackUtil) > 80) {
    reportWarnings.push({
      type: 'warning',
      message: 'High crack width utilisation - consider reduced bar spacing',
    });
  }

  if (parseFloat(results.steelStress) > 280) {
    reportWarnings.push({
      type: 'info',
      message: 'Steel stress > 280 MPa - calculation method required (not tables)',
    });
  }

  if (formData.restraintType !== 'none') {
    reportWarnings.push({
      type: 'info',
      message: 'Restrained element - early age cracking also checked (CIRIA C660)',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `Crack width check is SATISFACTORY. Calculated wk = ${results.wkCalculated}mm 
         ≤ ${results.wkLimit}mm limit (${results.crackUtil}% utilised).
         T${formData.barDiameter}@${formData.barSpacing} provides adequate crack control.`
        : `Crack width check FAILS. Calculated wk = ${results.wkCalculated}mm exceeds 
         ${results.wkLimit}mm limit. Reduce bar spacing or increase bar size.`,
    status: overallStatus,
    recommendations: [
      `Maintain T${formData.barDiameter} @ ${formData.barSpacing}mm spacing`,
      `Ensure ${formData.cover}mm cover for ${formData.exposureClass} exposure`,
      'Use low-heat cement or cooling for thick sections',
      formData.restraintType !== 'none'
        ? 'Consider construction joints for restrained elements'
        : '',
    ].filter(Boolean),
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
