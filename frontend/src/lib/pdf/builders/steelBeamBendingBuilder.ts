// ============================================================================
// BeaverCalc Studio — Steel Beam Bending Report Data Builder
// UKB/UKC/PFC Beam Design to BS EN 1993-1-1
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
 * Form data from the Steel Beam Bending calculator
 */
export interface SteelBeamBendingFormData {
  // Section Selection
  sectionType: string; // UKB, UKC, PFC
  sectionSize: string; // e.g., "533x210x101"
  steelGrade: string; // S275, S355

  // Beam Configuration
  span: string; // m
  supportConditions: string; // Simply supported, Continuous, Cantilever
  restraintConditions: string; // Full, Intermediate, Unrestrained
  restraintSpacing: string; // m (if intermediate)

  // Loading
  loadType: string; // UDL, Point, Combined
  deadLoadUDL: string; // kN/m
  liveLoadUDL: string; // kN/m
  pointLoads: string; // kN (comma separated)
  pointLoadPositions: string; // m (comma separated)

  // Factors
  gammaG: string;
  gammaQ: string;
  psi0: string;

  // Serviceability
  deflectionLimit: string; // L/xxx
  camber: string; // mm (if any)

  // Web Openings
  hasWebOpenings: string; // Yes/No
  openingDiameter: string; // mm
  openingPosition: string; // From end, m
}

/**
 * Results from the Steel Beam Bending calculator
 */
export interface SteelBeamBendingResults {
  // Section Properties
  sectionClass: string;
  depth: string;
  width: string;
  webThickness: string;
  flangeThickness: string;
  Ixx: string;
  Iyy: string;
  Wpl_y: string;
  Wpl_z: string;
  sectionArea: string;

  // Material
  fy: string;

  // Loading Summary
  totalULS: string; // kN/m
  totalSLS: string; // kN/m

  // Action Effects
  maxMoment: string; // kNm
  maxShear: string; // kN
  momentPosition: string;

  // Moment Capacity
  McRd: string; // kNm
  momentUtil: string;
  momentStatus: string;

  // LTB Capacity
  Mb_Rd: string; // kNm (reduced for LTB)
  chi_LT: string;
  lambda_LT: string;
  ltbUtil: string;
  ltbStatus: string;

  // Shear Capacity
  VplRd: string; // kN
  shearUtil: string;
  shearStatus: string;

  // Shear-Moment Interaction
  reducedMoment: string;
  interactionRequired: string; // Yes/No

  // Deflection
  maxDeflection: string; // mm
  deflectionLimit: string; // mm
  deflectionUtil: string;
  deflectionStatus: string;

  // Web Bearing (if point loads)
  webBearingCapacity: string;
  webBearingUtil: string;
  webBearingStatus: string;

  // Overall
  governingCheck: string;
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
 * Build a ReportData object from Steel Beam Bending calculator results
 */
export function buildSteelBeamBendingReport(
  formData: SteelBeamBendingFormData,
  results: SteelBeamBendingResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Steel Beam Design',
    projectName: options.projectName || 'Steel Beam',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `SB-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Steel Beam Bending',
    designCodes: ['BS EN 1993-1-1:2005', 'UK NA'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.sectionType} ${formData.sectionSize} ${formData.steelGrade} beam, ${formData.span}m span.
    ${formData.supportConditions} with ${formData.restraintConditions.toLowerCase()} lateral restraint.
    Class ${results.sectionClass} section.`,
    keyResults: [
      { label: 'Section', value: `${formData.sectionType} ${formData.sectionSize}` },
      { label: 'Max Moment', value: `${results.maxMoment} kNm`, highlight: true },
      { label: 'Moment Util', value: `${results.ltbUtil}%` },
      { label: 'Max Shear', value: `${results.maxShear} kN` },
      { label: 'Deflection', value: `${results.maxDeflection} mm` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `${results.overallUtil}% (${results.governingCheck})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Section Selection',
        parameters: [
          { name: 'Section Type', value: formData.sectionType },
          { name: 'Section Size', value: formData.sectionSize },
          { name: 'Steel Grade', value: formData.steelGrade },
          { name: 'Yield Strength fy', value: results.fy, unit: 'MPa' },
        ],
      },
      {
        title: 'Section Properties',
        parameters: [
          { name: 'Depth', value: results.depth, unit: 'mm' },
          { name: 'Width', value: results.width, unit: 'mm' },
          { name: 'Web Thickness', value: results.webThickness, unit: 'mm' },
          { name: 'Flange Thickness', value: results.flangeThickness, unit: 'mm' },
          { name: 'Ixx', value: results.Ixx, unit: 'cm⁴' },
          { name: 'Wpl,y', value: results.Wpl_y, unit: 'cm³' },
          { name: 'Section Class', value: results.sectionClass },
        ],
      },
      {
        title: 'Beam Configuration',
        parameters: [
          { name: 'Span', value: formData.span, unit: 'm' },
          { name: 'Support Conditions', value: formData.supportConditions },
          { name: 'Lateral Restraint', value: formData.restraintConditions },
          ...(formData.restraintConditions === 'Intermediate'
            ? [{ name: 'Restraint Spacing', value: formData.restraintSpacing, unit: 'm' }]
            : []),
        ],
      },
      {
        title: 'Loading',
        parameters: [
          { name: 'Load Type', value: formData.loadType },
          { name: 'Dead Load (UDL)', value: formData.deadLoadUDL, unit: 'kN/m' },
          { name: 'Live Load (UDL)', value: formData.liveLoadUDL, unit: 'kN/m' },
          { name: 'γG', value: formData.gammaG },
          { name: 'γQ', value: formData.gammaQ },
          { name: 'ULS Load', value: results.totalULS, unit: 'kN/m' },
        ],
      },
      {
        title: 'Serviceability',
        parameters: [
          { name: 'Deflection Limit', value: `L/${formData.deflectionLimit}` },
          { name: 'Camber', value: formData.camber || '0', unit: 'mm' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Section Classification',
      description: 'EC3 Table 5.2',
      checks: [
        {
          name: 'Cross-section Class',
          formula: 'Flange & web c/t ratios',
          calculated: `Class ${results.sectionClass}`,
          limit: 'Class 1 or 2 for plastic design',
          utilisation: 0,
          status: parseInt(results.sectionClass) <= 2 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Moment Resistance (Cross-section)',
      description: 'EC3 Cl.6.2.5',
      checks: [
        {
          name: 'Plastic Moment',
          formula: 'Mc,Rd = Wpl × fy / γM0',
          calculated: `${results.McRd} kNm`,
          limit: `MEd = ${results.maxMoment} kNm`,
          utilisation: parseFloat(results.momentUtil) / 100,
          status: results.momentStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Lateral-Torsional Buckling',
      description: 'EC3 Cl.6.3.2',
      checks: [
        {
          name: 'Slenderness λLT',
          formula: 'λLT = √(Wpl×fy / Mcr)',
          calculated: results.lambda_LT,
          limit: 'Used for χLT',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Reduction Factor χLT',
          formula: 'Per buckling curve',
          calculated: results.chi_LT,
          limit: '≤ 1.0',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'LTB Resistance Mb,Rd',
          formula: 'Mb,Rd = χLT × Wpl × fy / γM1',
          calculated: `${results.Mb_Rd} kNm`,
          limit: `MEd = ${results.maxMoment} kNm`,
          utilisation: parseFloat(results.ltbUtil) / 100,
          status: results.ltbStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Shear Resistance',
      description: 'EC3 Cl.6.2.6',
      checks: [
        {
          name: 'Plastic Shear',
          formula: 'Vpl,Rd = Av × fy / (√3 × γM0)',
          calculated: `${results.VplRd} kN`,
          limit: `VEd = ${results.maxShear} kN`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Deflection (SLS)',
      description: 'Serviceability check',
      checks: [
        {
          name: 'Maximum Deflection',
          formula: 'δ = 5wL⁴ / (384EI) for UDL',
          calculated: `${results.maxDeflection} mm`,
          limit: `L/${formData.deflectionLimit} = ${results.deflectionLimit} mm`,
          utilisation: parseFloat(results.deflectionUtil) / 100,
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Add shear-moment interaction if applicable
  if (results.interactionRequired === 'Yes') {
    designChecks.push({
      title: 'Shear-Moment Interaction',
      description: 'EC3 Cl.6.2.8 (VEd > 0.5×Vpl,Rd)',
      checks: [
        {
          name: 'Reduced Moment',
          formula: 'MV,Rd = Mc,Rd × (1 - ρ²)',
          calculated: `${results.reducedMoment} kNm`,
          limit: `MEd = ${results.maxMoment} kNm`,
          utilisation: parseFloat(results.maxMoment) / parseFloat(results.reducedMoment),
          status:
            parseFloat(results.maxMoment) <= parseFloat(results.reducedMoment) ? 'PASS' : 'FAIL',
        },
      ],
    });
  }

  // Add web bearing if point loads
  if (formData.loadType.includes('Point') && results.webBearingCapacity) {
    designChecks.push({
      title: 'Web Bearing',
      description: 'Concentrated load on web',
      checks: [
        {
          name: 'Web Bearing Capacity',
          formula: 'Fw,Rd = fyw × tw × ly / γM1',
          calculated: `${results.webBearingCapacity} kN`,
          limit: `Point load`,
          utilisation: parseFloat(results.webBearingUtil) / 100,
          status: results.webBearingStatus as 'PASS' | 'FAIL',
        },
      ],
    });
  }

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Load Combination',
      steps: [
        {
          description: 'Dead load',
          formula: 'gk = self-weight + permanent',
          result: `gk = ${formData.deadLoadUDL} kN/m`,
        },
        {
          description: 'Live load',
          formula: 'qk = imposed + variable',
          result: `qk = ${formData.liveLoadUDL} kN/m`,
        },
        {
          description: 'ULS load combination',
          formula: 'wEd = γG × gk + γQ × qk',
          substitution: `wEd = ${formData.gammaG} × ${formData.deadLoadUDL} + ${formData.gammaQ} × ${formData.liveLoadUDL}`,
          result: `wEd = ${results.totalULS} kN/m`,
        },
      ],
    },
    {
      title: 'Action Effects',
      steps: [
        {
          description: 'Maximum moment (SS beam)',
          formula: 'MEd = wEd × L² / 8',
          substitution: `MEd = ${results.totalULS} × ${formData.span}² / 8`,
          result: `MEd = ${results.maxMoment} kNm`,
        },
        {
          description: 'Maximum shear',
          formula: 'VEd = wEd × L / 2',
          substitution: `VEd = ${results.totalULS} × ${formData.span} / 2`,
          result: `VEd = ${results.maxShear} kN`,
        },
      ],
    },
    {
      title: 'Moment Resistance',
      steps: [
        {
          description: 'Plastic section modulus',
          formula: 'From section tables',
          result: `Wpl,y = ${results.Wpl_y} cm³`,
        },
        {
          description: 'Cross-section moment resistance',
          formula: 'Mc,Rd = Wpl,y × fy / γM0',
          substitution: `Mc,Rd = ${results.Wpl_y} × 10³ × ${results.fy} / (1.0 × 10⁶)`,
          result: `Mc,Rd = ${results.McRd} kNm`,
        },
        {
          description: 'Cross-section utilisation',
          formula: 'Util = MEd / Mc,Rd × 100',
          result: `${results.momentUtil}%`,
        },
      ],
    },
    {
      title: 'LTB Calculation',
      steps: [
        {
          description: 'Critical moment Mcr',
          formula: 'Elastic critical moment (NCCI)',
          result: 'Calculated from section geometry & restraint',
        },
        {
          description: 'Non-dimensional slenderness',
          formula: 'λLT = √(Wpl × fy / Mcr)',
          result: `λLT = ${results.lambda_LT}`,
        },
        {
          description: 'Reduction factor',
          formula: 'χLT = 1 / (φLT + √(φLT² - λLT²))',
          result: `χLT = ${results.chi_LT}`,
        },
        {
          description: 'LTB moment resistance',
          formula: 'Mb,Rd = χLT × Wpl × fy / γM1',
          result: `Mb,Rd = ${results.Mb_Rd} kNm`,
        },
        {
          description: 'LTB utilisation',
          formula: 'Util = MEd / Mb,Rd × 100',
          result: `${results.ltbUtil}%`,
        },
      ],
    },
    {
      title: 'Shear Resistance',
      steps: [
        {
          description: 'Shear area',
          formula: 'Av = A - 2btf + (tw + 2r)tf',
          result: `Av calculated from section properties`,
        },
        {
          description: 'Plastic shear resistance',
          formula: 'Vpl,Rd = Av × fy / (√3 × γM0)',
          result: `Vpl,Rd = ${results.VplRd} kN`,
        },
        {
          description: 'Shear utilisation',
          formula: 'Util = VEd / Vpl,Rd × 100',
          result: `${results.shearUtil}%`,
        },
      ],
    },
    {
      title: 'Deflection',
      steps: [
        {
          description: 'SLS load',
          formula: 'w_SLS = gk + qk (unfactored)',
          result: `w_SLS = ${results.totalSLS} kN/m`,
        },
        {
          description: 'Maximum deflection',
          formula: 'δ = 5wL⁴ / (384EI)',
          result: `δ = ${results.maxDeflection} mm`,
        },
        {
          description: 'Limit',
          formula: `L/${formData.deflectionLimit}`,
          substitution: `${parseFloat(formData.span) * 1000} / ${formData.deflectionLimit}`,
          result: `δ_limit = ${results.deflectionLimit} mm`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.ltbUtil) > parseFloat(results.momentUtil)) {
    reportWarnings.push({
      type: 'info',
      message: 'LTB governs over cross-section moment capacity',
    });
  }

  if (results.interactionRequired === 'Yes') {
    reportWarnings.push({
      type: 'warning',
      message: 'High shear requires shear-moment interaction check',
    });
  }

  if (parseInt(results.sectionClass) > 2) {
    reportWarnings.push({
      type: 'warning',
      message: `Class ${results.sectionClass} section - elastic design required`,
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.sectionType} ${formData.sectionSize} ${formData.steelGrade} is ADEQUATE.
         Governing check: ${results.governingCheck} at ${results.overallUtil}% utilisation.`
        : `Section FAILS. Governing check: ${results.governingCheck}. Select larger section.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.sectionType} ${formData.sectionSize} ${formData.steelGrade}`,
      `Provide lateral restraints at ${formData.restraintSpacing || 'supports only'}`,
      parseFloat(results.deflectionUtil) > 80
        ? 'Consider precamber for deflection control'
        : 'Deflection acceptable',
      `Max reaction at support: ${results.maxShear} kN`,
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
