// ============================================================================
// BeaverCalc Studio — RC Beam Design Report Data Builder
// Reinforced Concrete Beam Design to Eurocode 2
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
 * Form data from the RC Beam calculator
 */
export interface RCBeamFormData {
  // Beam Geometry
  beamWidth: string;
  beamDepth: string;
  effectiveDepth: string;
  span: string;
  supportCondition: string;

  // Loading
  deadLoad: string;
  liveLoad: string;
  ultimateLoad: string;
  loadCombination: string;

  // Materials
  concreteGrade: string;
  steelGrade: string;
  cover: string;

  // Reinforcement
  topBars: string;
  topBarSize: string;
  bottomBars: string;
  bottomBarSize: string;
  linkSize: string;
  linkSpacing: string;

  // Exposure
  exposureClass: string;
  fireRating: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the RC Beam calculator
 */
export interface RCBeamResults {
  // Section Properties
  fck: string;
  fyk: string;
  effectiveWidth: string;
  leverArm: string;

  // ULS Bending
  mEdMidspan: string;
  mEdSupport: string;
  mRdMidspan: string;
  mRdSupport: string;
  bendingUtil: string;
  bendingStatus: string;

  // ULS Shear
  vEd: string;
  vRdC: string;
  vRdS: string;
  shearUtil: string;
  shearStatus: string;
  linksRequired: string;

  // Deflection
  spanEffectiveRatio: string;
  allowableRatio: string;
  actualDeflection: string;
  allowableDeflection: string;
  deflectionStatus: string;

  // Cracking
  crackWidth: string;
  allowableCrack: string;
  crackStatus: string;

  // Detailing
  minAs: string;
  maxAs: string;
  providedAs: string;
  anchorageTension: string;
  anchorageCompression: string;

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
 * Build a ReportData object from RC Beam calculator results
 */
export function buildRCBeamReport(
  formData: RCBeamFormData,
  results: RCBeamResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.bendingStatus,
    results.shearStatus,
    results.deflectionStatus,
    results.crackStatus,
  ];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'Reinforced Concrete Beam Design',
    projectName: options.projectName || formData.projectTitle || 'RC Beam Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `RCB-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'RC Beam Design',
    designCodes: ['EN 1992-1-1:2004', 'UK NA', 'BS 8500'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Reinforced concrete beam design: ${formData.beamWidth}×${formData.beamDepth}mm section, 
    ${formData.span}m span, ${formData.supportCondition}. 
    ${formData.concreteGrade} concrete, ${formData.steelGrade} reinforcement.`,
    keyResults: [
      { label: 'Section', value: `${formData.beamWidth}×${formData.beamDepth} mm` },
      { label: 'Ultimate Moment', value: `${results.mEdMidspan} kNm`, highlight: true },
      { label: 'Bending Utilisation', value: `${results.bendingUtil}%` },
      { label: 'Shear Utilisation', value: `${results.shearUtil}%` },
      { label: 'Bottom Steel', value: `${formData.bottomBars}T${formData.bottomBarSize}` },
    ],
    overallStatus,
    governingCheck: getGoverningCheck(results),
    utilisationSummary: `Max utilisation: ${Math.max(
      parseFloat(results.bendingUtil),
      parseFloat(results.shearUtil),
    ).toFixed(0)}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Beam Geometry',
        parameters: [
          { name: 'Beam Width', value: formData.beamWidth, unit: 'mm' },
          { name: 'Overall Depth', value: formData.beamDepth, unit: 'mm' },
          { name: 'Effective Depth', value: formData.effectiveDepth, unit: 'mm' },
          { name: 'Span', value: formData.span, unit: 'm' },
          { name: 'Support Condition', value: formData.supportCondition },
        ],
      },
      {
        title: 'Loading',
        parameters: [
          { name: 'Dead Load (UDL)', value: formData.deadLoad, unit: 'kN/m' },
          { name: 'Live Load (UDL)', value: formData.liveLoad, unit: 'kN/m' },
          { name: 'Ultimate Load', value: formData.ultimateLoad, unit: 'kN/m' },
          { name: 'Load Combination', value: formData.loadCombination },
        ],
      },
      {
        title: 'Materials',
        parameters: [
          { name: 'Concrete Grade', value: formData.concreteGrade },
          { name: 'Steel Grade', value: formData.steelGrade },
          { name: 'Cover', value: formData.cover, unit: 'mm' },
          { name: 'Exposure Class', value: formData.exposureClass },
          { name: 'Fire Rating', value: formData.fireRating },
        ],
      },
      {
        title: 'Reinforcement',
        parameters: [
          { name: 'Top Steel', value: `${formData.topBars}T${formData.topBarSize}` },
          { name: 'Bottom Steel', value: `${formData.bottomBars}T${formData.bottomBarSize}` },
          { name: 'Links', value: `T${formData.linkSize}@${formData.linkSpacing}` },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'ULS Bending (EC2 Cl.6.1)',
      description: 'Check moment resistance',
      checks: [
        {
          name: 'Midspan Bending',
          formula: 'MEd ≤ MRd',
          calculated: `${results.mEdMidspan} kNm`,
          limit: `≤ ${results.mRdMidspan} kNm`,
          utilisation: parseFloat(results.mEdMidspan) / parseFloat(results.mRdMidspan),
          status: results.bendingStatus as 'PASS' | 'FAIL',
        },
        ...(parseFloat(results.mEdSupport) > 0
          ? [
              {
                name: 'Support Bending',
                formula: 'MEd ≤ MRd',
                calculated: `${results.mEdSupport} kNm`,
                limit: `≤ ${results.mRdSupport} kNm`,
                utilisation: parseFloat(results.mEdSupport) / parseFloat(results.mRdSupport),
                status: (parseFloat(results.mEdSupport) <= parseFloat(results.mRdSupport)
                  ? 'PASS'
                  : 'FAIL') as 'PASS' | 'FAIL',
              },
            ]
          : []),
      ],
    },
    {
      title: 'ULS Shear (EC2 Cl.6.2)',
      description: 'Check shear resistance',
      checks: [
        {
          name: 'Shear without links',
          formula: 'VEd ≤ VRd,c',
          calculated: `${results.vEd} kN`,
          limit: `VRd,c = ${results.vRdC} kN`,
          utilisation: parseFloat(results.vEd) / parseFloat(results.vRdC),
          status: parseFloat(results.vEd) <= parseFloat(results.vRdC) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Shear with links',
          formula: 'VEd ≤ VRd,s',
          calculated: `${results.vEd} kN`,
          limit: `VRd,s = ${results.vRdS} kN`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'SLS Deflection (EC2 Cl.7.4)',
      description: 'Check span/depth ratio',
      checks: [
        {
          name: 'Span/Effective Depth Ratio',
          formula: 'L/d ≤ (L/d)_limit',
          calculated: results.spanEffectiveRatio,
          limit: `≤ ${results.allowableRatio}`,
          utilisation: parseFloat(results.spanEffectiveRatio) / parseFloat(results.allowableRatio),
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Actual Deflection',
          formula: 'δ ≤ L/250',
          calculated: `${results.actualDeflection} mm`,
          limit: `≤ ${results.allowableDeflection} mm`,
          utilisation:
            parseFloat(results.actualDeflection) / parseFloat(results.allowableDeflection),
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'SLS Cracking (EC2 Cl.7.3)',
      description: 'Check crack width',
      checks: [
        {
          name: 'Crack Width',
          formula: 'wk ≤ wk,max',
          calculated: `${results.crackWidth} mm`,
          limit: `≤ ${results.allowableCrack} mm`,
          utilisation: parseFloat(results.crackWidth) / parseFloat(results.allowableCrack),
          status: results.crackStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Material Properties',
      steps: [
        {
          description: 'Concrete strength',
          formula: 'fcd = αcc × fck / γc',
          substitution: `fcd = 0.85 × ${results.fck} / 1.5`,
          result: `${((0.85 * parseFloat(results.fck)) / 1.5).toFixed(1)} MPa`,
        },
        {
          description: 'Steel strength',
          formula: 'fyd = fyk / γs',
          substitution: `fyd = ${results.fyk} / 1.15`,
          result: `${(parseFloat(results.fyk) / 1.15).toFixed(0)} MPa`,
        },
      ],
    },
    {
      title: 'Bending Resistance',
      steps: [
        {
          description: 'Lever arm',
          formula: 'z = d × [0.5 + √(0.25 - K/1.134)]',
          result: `z = ${results.leverArm} mm`,
        },
        {
          description: 'Moment resistance',
          formula: 'MRd = As × fyd × z',
          result: `MRd = ${results.mRdMidspan} kNm`,
        },
        {
          description: 'Applied moment',
          formula: 'MEd = wL²/8 (simply supported)',
          result: `MEd = ${results.mEdMidspan} kNm`,
        },
      ],
    },
    {
      title: 'Shear Resistance',
      steps: [
        {
          description: 'Shear without links',
          formula: 'VRd,c = [CRd,c × k × (100ρ₁fck)^(1/3)] × b_w × d',
          result: `VRd,c = ${results.vRdC} kN`,
        },
        {
          description: 'Shear with links',
          formula: 'VRd,s = (Asw/s) × z × fywd × cot(θ)',
          result: `VRd,s = ${results.vRdS} kN`,
        },
        {
          description: 'Links required',
          formula: 'T10@200 (minimum) or as calc',
          result: results.linksRequired,
        },
      ],
    },
    {
      title: 'Detailing Requirements',
      steps: [
        {
          description: 'Minimum reinforcement',
          formula: 'As,min = 0.26 × (fctm/fyk) × bt × d ≥ 0.0013 × bt × d',
          result: `As,min = ${results.minAs} mm²`,
        },
        {
          description: 'Maximum reinforcement',
          formula: 'As,max = 0.04 × Ac',
          result: `As,max = ${results.maxAs} mm²`,
        },
        {
          description: 'Tension anchorage',
          formula: 'lbd (tension)',
          result: `${results.anchorageTension} mm`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.bendingUtil) > 90) {
    reportWarnings.push({
      type: 'warning',
      message: 'High bending utilisation > 90% - limited reserve capacity',
    });
  }

  if (parseFloat(results.providedAs) < parseFloat(results.minAs)) {
    reportWarnings.push({
      type: 'error',
      message: 'Provided reinforcement less than EC2 minimum',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The RC beam design is ADEQUATE. ${formData.beamWidth}×${formData.beamDepth}mm section with 
         ${formData.bottomBars}T${formData.bottomBarSize} bottom and T${formData.linkSize}@${formData.linkSpacing} links.
         Bending ${results.bendingUtil}%, Shear ${results.shearUtil}%.`
        : `The RC beam design is INADEQUATE. Increase section size or reinforcement.`,
    status: overallStatus,
    recommendations: [
      `Provide ${formData.bottomBars}T${formData.bottomBarSize} bottom bars at midspan`,
      `Provide ${formData.topBars}T${formData.topBarSize} top bars over supports`,
      `Provide T${formData.linkSize} links @ ${formData.linkSpacing}mm c/c`,
      `Use ${formData.cover}mm cover for ${formData.exposureClass} exposure`,
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

function getGoverningCheck(results: RCBeamResults): string {
  const checks = [
    { name: 'Bending', util: parseFloat(results.bendingUtil) },
    { name: 'Shear', util: parseFloat(results.shearUtil) },
  ];
  return checks.reduce((a, b) => (a.util > b.util ? a : b)).name;
}
