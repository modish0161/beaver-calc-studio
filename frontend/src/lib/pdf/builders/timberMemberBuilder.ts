// ============================================================================
// BeaverCalc Studio — Timber Member Report Data Builder
// C24/C16 Timber Member Checks to Eurocode 5
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
 * Form data from the Timber Member calculator
 */
export interface TimberMemberFormData {
  // Member Geometry
  memberType: string;
  breadth: string;
  depth: string;
  span: string;
  effectiveLength: string;
  supportCondition: string;
  lateralRestraint: string;

  // Timber Properties
  timberGrade: string;
  serviceClass: string;
  loadDuration: string;

  // Loading
  deadLoad: string;
  liveLoad: string;
  windLoad: string;
  loadCombination: string;

  // Notching (if applicable)
  notched: string;
  notchDepth: string;
  notchLength: string;
  notchPosition: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Timber Member calculator
 */
export interface TimberMemberResults {
  // Section Properties
  area: string;
  ixx: string;
  iyy: string;
  zxx: string;
  zyy: string;
  rxx: string;
  ryy: string;

  // Material Properties
  fm_k: string;
  fc_0_k: string;
  fv_k: string;
  E_0_mean: string;
  kmod: string;
  kdef: string;

  // Design Strengths
  fm_d: string;
  fc_0_d: string;
  fv_d: string;

  // ULS Bending
  mEd: string;
  sigmaM: string;
  kh: string;
  kcrit: string;
  bendingUtil: string;
  bendingStatus: string;

  // ULS Shear
  vEd: string;
  tauV: string;
  kcr: string;
  shearUtil: string;
  shearStatus: string;

  // ULS Compression (if applicable)
  nEd: string;
  sigmaC: string;
  kc: string;
  compressionUtil: string;
  compressionStatus: string;

  // Combined Stress
  combinedUtil: string;
  combinedStatus: string;

  // Bearing
  bearingLength: string;
  bearingStress: string;
  bearingCapacity: string;
  bearingUtil: string;
  bearingStatus: string;

  // SLS Deflection
  instantDeflection: string;
  finalDeflection: string;
  allowableDeflection: string;
  deflectionUtil: string;
  deflectionStatus: string;

  // Notch Effect
  kv: string;
  notchShearUtil: string;
  notchStatus: string;

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
 * Build a ReportData object from Timber Member calculator results
 */
export function buildTimberMemberReport(
  formData: TimberMemberFormData,
  results: TimberMemberResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.bendingStatus,
    results.shearStatus,
    results.compressionStatus,
    results.bearingStatus,
    results.deflectionStatus,
  ].filter(Boolean);
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  const hasNotch = formData.notched === 'yes';

  // Build meta
  const meta = {
    title: 'Timber Member Design',
    projectName: options.projectName || formData.projectTitle || 'Timber Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `TIM-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Timber Member',
    designCodes: ['EN 1995-1-1:2004', 'UK NA', 'PD 6693-1'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.timberGrade} timber ${formData.memberType}: ${formData.breadth}×${formData.depth}mm section, 
    ${formData.span}m span, Service Class ${formData.serviceClass}, ${formData.loadDuration} duration.
    ${hasNotch ? `Notched at ${formData.notchPosition}.` : 'Unnotched.'}`,
    keyResults: [
      { label: 'Section', value: `${formData.breadth}×${formData.depth} mm` },
      { label: 'Timber Grade', value: formData.timberGrade },
      { label: 'Bending Utilisation', value: `${results.bendingUtil}%`, highlight: true },
      { label: 'Shear Utilisation', value: `${results.shearUtil}%` },
      { label: 'Deflection', value: `${results.finalDeflection} mm` },
    ],
    overallStatus,
    governingCheck: getGoverningCheck(results),
    utilisationSummary: `Max utilisation: ${Math.max(
      parseFloat(results.bendingUtil),
      parseFloat(results.shearUtil),
      parseFloat(results.deflectionUtil),
    ).toFixed(0)}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Member Geometry',
        parameters: [
          { name: 'Member Type', value: formData.memberType },
          { name: 'Breadth', value: formData.breadth, unit: 'mm' },
          { name: 'Depth', value: formData.depth, unit: 'mm' },
          { name: 'Span', value: formData.span, unit: 'm' },
          { name: 'Support', value: formData.supportCondition },
          { name: 'Lateral Restraint', value: formData.lateralRestraint },
        ],
      },
      {
        title: 'Timber Properties',
        parameters: [
          { name: 'Grade', value: formData.timberGrade },
          { name: 'Service Class', value: formData.serviceClass },
          { name: 'Load Duration', value: formData.loadDuration },
          { name: 'fm,k', value: results.fm_k, unit: 'MPa' },
          { name: 'E0,mean', value: results.E_0_mean, unit: 'MPa' },
        ],
      },
      {
        title: 'Loading',
        parameters: [
          { name: 'Dead Load', value: formData.deadLoad, unit: 'kN/m' },
          { name: 'Live Load', value: formData.liveLoad, unit: 'kN/m' },
          { name: 'Wind Load', value: formData.windLoad, unit: 'kN/m' },
          { name: 'Load Combination', value: formData.loadCombination },
        ],
      },
      ...(hasNotch
        ? [
            {
              title: 'Notching',
              parameters: [
                { name: 'Notch Position', value: formData.notchPosition },
                { name: 'Notch Depth', value: formData.notchDepth, unit: 'mm' },
                { name: 'Notch Length', value: formData.notchLength, unit: 'mm' },
              ],
            },
          ]
        : []),
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'ULS Bending (EC5 Cl.6.1.6)',
      description: 'Bending stress check with lateral torsional buckling',
      checks: [
        {
          name: 'Bending Stress',
          formula: 'σm,d = M_Ed / W ≤ kh × kcrit × fm,d',
          calculated: `${results.sigmaM} MPa`,
          limit: `≤ ${results.fm_d} MPa`,
          utilisation: parseFloat(results.bendingUtil) / 100,
          status: results.bendingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'ULS Shear (EC5 Cl.6.1.7)',
      description: 'Shear stress check',
      checks: [
        {
          name: 'Shear Stress',
          formula: 'τv,d = 1.5 × V_Ed / (kcr × A) ≤ fv,d',
          calculated: `${results.tauV} MPa`,
          limit: `≤ ${results.fv_d} MPa`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
        ...(hasNotch
          ? [
              {
                name: 'Shear at Notch',
                formula: 'τv,d ≤ kv × fv,d',
                calculated: `Reduced by kv = ${results.kv}`,
                limit: 'Notch effect included',
                utilisation: parseFloat(results.notchShearUtil) / 100,
                status: results.notchStatus as 'PASS' | 'FAIL',
              },
            ]
          : []),
      ],
    },
    {
      title: 'Bearing (EC5 Cl.6.1.5)',
      description: 'Compression perpendicular to grain at supports',
      checks: [
        {
          name: 'Bearing Stress',
          formula: 'σc,90,d ≤ kc,90 × fc,90,d',
          calculated: `${results.bearingStress} MPa`,
          limit: `≤ ${results.bearingCapacity} MPa`,
          utilisation: parseFloat(results.bearingUtil) / 100,
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'SLS Deflection (EC5 Cl.7.2)',
      description: 'Deflection check including creep',
      checks: [
        {
          name: 'Instantaneous Deflection',
          formula: 'uinst (G+Q)',
          calculated: `${results.instantDeflection} mm`,
          limit: `≤ L/300`,
          utilisation:
            parseFloat(results.instantDeflection) / ((parseFloat(formData.span) * 1000) / 300),
          status: 'PASS',
        },
        {
          name: 'Final Deflection',
          formula: 'ufin = uinst × (1 + kdef)',
          calculated: `${results.finalDeflection} mm`,
          limit: `≤ ${results.allowableDeflection} mm`,
          utilisation: parseFloat(results.deflectionUtil) / 100,
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Section Properties',
      steps: [
        {
          description: 'Cross-sectional area',
          formula: 'A = b × h',
          substitution: `A = ${formData.breadth} × ${formData.depth}`,
          result: `${results.area} mm²`,
        },
        {
          description: 'Second moment of area',
          formula: 'I = b × h³ / 12',
          result: `Ixx = ${results.ixx} mm⁴`,
        },
        {
          description: 'Section modulus',
          formula: 'W = b × h² / 6',
          result: `Wxx = ${results.zxx} mm³`,
        },
      ],
    },
    {
      title: 'Design Strength Calculation',
      steps: [
        {
          description: 'Modification factor',
          formula: 'kmod = f(service class, load duration)',
          result: `kmod = ${results.kmod}`,
        },
        {
          description: 'Design bending strength',
          formula: 'fm,d = kmod × fm,k / γM',
          substitution: `fm,d = ${results.kmod} × ${results.fm_k} / 1.3`,
          result: `${results.fm_d} MPa`,
        },
        {
          description: 'Design shear strength',
          formula: 'fv,d = kmod × fv,k / γM',
          result: `${results.fv_d} MPa`,
        },
      ],
    },
    {
      title: 'Bending Check',
      steps: [
        {
          description: 'Applied moment',
          formula: 'MEd = wL²/8 (simply supported)',
          result: `${results.mEd} kNm`,
        },
        {
          description: 'Bending stress',
          formula: 'σm = MEd / W',
          result: `${results.sigmaM} MPa`,
        },
        {
          description: 'Size factor',
          formula: 'kh = min((150/h)^0.2, 1.3)',
          result: `kh = ${results.kh}`,
        },
        {
          description: 'Critical factor (LTB)',
          formula: 'kcrit = f(λrel,m)',
          result: `kcrit = ${results.kcrit}`,
        },
      ],
    },
    {
      title: 'Deflection Calculation',
      steps: [
        {
          description: 'Instantaneous deflection',
          formula: 'uinst = 5 × w × L⁴ / (384 × E × I)',
          result: `${results.instantDeflection} mm`,
        },
        {
          description: 'Creep factor',
          formula: 'kdef from Service Class',
          result: `kdef = ${results.kdef}`,
        },
        {
          description: 'Final deflection',
          formula: 'ufin = uinst,G × (1 + kdef) + uinst,Q × (1 + ψ₂ × kdef)',
          result: `${results.finalDeflection} mm`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.kcrit) < 1.0) {
    reportWarnings.push({
      type: 'warning',
      message: `Lateral torsional buckling reduction kcrit = ${results.kcrit} applied`,
    });
  }

  if (hasNotch && parseFloat(results.notchShearUtil) > 80) {
    reportWarnings.push({
      type: 'warning',
      message: 'High shear utilisation at notch - consider reinforcement',
    });
  }

  if (formData.serviceClass === '3') {
    reportWarnings.push({
      type: 'info',
      message: 'Service Class 3 - ensure appropriate preservative treatment',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The ${formData.timberGrade} timber ${formData.memberType} is ADEQUATE. 
         ${formData.breadth}×${formData.depth}mm section provides bending utilisation 
         of ${results.bendingUtil}% and deflection of ${results.finalDeflection}mm.`
        : `The timber member design is INADEQUATE. Consider increasing section size, 
         upgrading timber grade, or reducing span.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.timberGrade} graded timber (certified)`,
      `Section: ${formData.breadth}×${formData.depth}mm sawn/regularized`,
      `Ensure lateral restraint as specified: ${formData.lateralRestraint}`,
      `Minimum bearing length: ${results.bearingLength}mm at supports`,
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

function getGoverningCheck(results: TimberMemberResults): string {
  const checks = [
    { name: 'Bending', util: parseFloat(results.bendingUtil) },
    { name: 'Shear', util: parseFloat(results.shearUtil) },
    { name: 'Deflection', util: parseFloat(results.deflectionUtil) },
  ];
  return checks.reduce((a, b) => (a.util > b.util ? a : b)).name;
}
