// ============================================================================
// BeaverCalc Studio — RC Column Design Report Data Builder
// Reinforced Concrete Column to BS EN 1992-1-1
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
 * Form data from the RC Column Design calculator
 */
export interface RcColumnFormData {
  // Column Geometry
  columnType: string; // Rectangular, Circular
  width: string; // mm (b)
  depth: string; // mm (h)
  diameter: string; // mm (for circular)
  height: string; // mm (L)

  // Support Conditions
  topCondition: string; // Pinned, Fixed, Cantilever
  bottomCondition: string; // Pinned, Fixed
  bracedDirection: string; // Both, X only, Y only, Neither

  // Materials
  concreteClass: string; // C25/30, C30/37, etc.
  rebarGrade: string; // B500B, B500C
  cover: string; // mm

  // Reinforcement
  mainBarDia: string; // mm
  numberOfBars: string;
  linkDia: string; // mm
  linkSpacing: string; // mm

  // Applied Forces (ULS)
  axialForce: string; // kN (N_Ed)
  momentX: string; // kNm (M_Ed,x)
  momentY: string; // kNm (M_Ed,y)
  shearX: string; // kN (V_Ed,x)
  shearY: string; // kN (V_Ed,y)

  // Second Order
  includeSecondOrder: string; // Yes/No
  imperfectionFactor: string;
  creepCoeff: string;
}

/**
 * Results from the RC Column Design calculator
 */
export interface RcColumnResults {
  // Section Properties
  grossArea: string;
  effectiveDepthX: string;
  effectiveDepthY: string;

  // Material Properties
  fck: string;
  fcd: string;
  fyk: string;
  fyd: string;

  // Reinforcement
  totalSteelArea: string;
  steelRatio: string;

  // Slenderness
  effectiveLengthX: string;
  effectiveLengthY: string;
  slendernessX: string;
  slendernessY: string;
  slendernessLimit: string;
  isSlender: string;

  // Second Order Effects
  e2x: string;
  e2y: string;
  mEdX2: string;
  mEdY2: string;

  // Axial Capacity
  axialCapacity: string;
  axialUtil: string;
  axialStatus: string;

  // Moment Capacity (X-axis)
  momentCapacityX: string;
  momentUtilX: string;
  momentStatusX: string;

  // Moment Capacity (Y-axis)
  momentCapacityY: string;
  momentUtilY: string;
  momentStatusY: string;

  // Biaxial Bending
  biaxialRatio: string;
  biaxialStatus: string;

  // Shear
  shearCapacityX: string;
  shearUtilX: string;
  shearStatusX: string;
  shearCapacityY: string;
  shearUtilY: string;
  shearStatusY: string;

  // Link Requirements
  minLinkSpacing: string;
  maxLinkSpacing: string;
  linkStatus: string;

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
 * Build a ReportData object from RC Column Design calculator results
 */
export function buildRcColumnReport(
  formData: RcColumnFormData,
  results: RcColumnResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Section description
  const sectionDesc =
    formData.columnType === 'Circular'
      ? `ø${formData.diameter}mm circular`
      : `${formData.width} × ${formData.depth}mm rectangular`;

  // Build meta
  const meta = {
    title: 'RC Column Design',
    projectName: options.projectName || 'Concrete Column',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `RCC-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'RC Column Design',
    designCodes: ['BS EN 1992-1-1:2004', 'UK NA'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${sectionDesc} column, ${formData.height}mm high.
    ${formData.concreteClass} concrete with ${formData.numberOfBars}No. T${formData.mainBarDia} bars.
    ${results.isSlender === 'Yes' ? 'Slender column - second order effects included.' : 'Short column.'}`,
    keyResults: [
      { label: 'Section', value: sectionDesc },
      { label: 'Axial NEd', value: `${formData.axialForce} kN`, highlight: true },
      { label: 'Axial Util', value: `${results.axialUtil}%` },
      { label: 'Steel Ratio', value: `${results.steelRatio}%` },
      { label: 'Slenderness', value: results.isSlender },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `${results.overallUtil}% (${results.governingCheck})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Column Geometry',
        parameters: [
          { name: 'Column Type', value: formData.columnType },
          ...(formData.columnType === 'Rectangular'
            ? [
                { name: 'Width b', value: formData.width, unit: 'mm' },
                { name: 'Depth h', value: formData.depth, unit: 'mm' },
              ]
            : [{ name: 'Diameter', value: formData.diameter, unit: 'mm' }]),
          { name: 'Height L', value: formData.height, unit: 'mm' },
        ],
      },
      {
        title: 'Support Conditions',
        parameters: [
          { name: 'Top', value: formData.topCondition },
          { name: 'Bottom', value: formData.bottomCondition },
          { name: 'Braced Direction', value: formData.bracedDirection },
        ],
      },
      {
        title: 'Materials',
        parameters: [
          { name: 'Concrete Class', value: formData.concreteClass },
          { name: 'fck', value: results.fck, unit: 'MPa' },
          { name: 'fcd', value: results.fcd, unit: 'MPa' },
          { name: 'Rebar Grade', value: formData.rebarGrade },
          { name: 'fyk', value: results.fyk, unit: 'MPa' },
          { name: 'Cover', value: formData.cover, unit: 'mm' },
        ],
      },
      {
        title: 'Reinforcement',
        parameters: [
          { name: 'Main Bars', value: `${formData.numberOfBars}No. T${formData.mainBarDia}` },
          { name: 'Total Steel Area', value: results.totalSteelArea, unit: 'mm²' },
          { name: 'Steel Ratio', value: results.steelRatio, unit: '%' },
          { name: 'Links', value: `T${formData.linkDia}@${formData.linkSpacing}` },
        ],
      },
      {
        title: 'Applied Forces (ULS)',
        parameters: [
          { name: 'Axial Force NEd', value: formData.axialForce, unit: 'kN' },
          { name: 'Moment X-axis MEd,x', value: formData.momentX, unit: 'kNm' },
          { name: 'Moment Y-axis MEd,y', value: formData.momentY, unit: 'kNm' },
          { name: 'Shear X VEd,x', value: formData.shearX, unit: 'kN' },
          { name: 'Shear Y VEd,y', value: formData.shearY, unit: 'kN' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Slenderness Check',
      description: 'EC2 Cl.5.8.3',
      checks: [
        {
          name: 'Slenderness X-axis',
          formula: 'λ = L₀ / i',
          calculated: results.slendernessX,
          limit: `λlim = ${results.slendernessLimit}`,
          utilisation: parseFloat(results.slendernessX) / parseFloat(results.slendernessLimit),
          status:
            parseFloat(results.slendernessX) <= parseFloat(results.slendernessLimit)
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Slenderness Y-axis',
          formula: 'λ = L₀ / i',
          calculated: results.slendernessY,
          limit: `λlim = ${results.slendernessLimit}`,
          utilisation: parseFloat(results.slendernessY) / parseFloat(results.slendernessLimit),
          status:
            parseFloat(results.slendernessY) <= parseFloat(results.slendernessLimit)
              ? 'PASS'
              : 'FAIL',
        },
      ],
    },
    {
      title: 'Axial Capacity',
      description: 'Maximum axial resistance EC2 Cl.6.1',
      checks: [
        {
          name: 'Axial Resistance NRd',
          formula: 'NRd = Ac×fcd + As×fyd',
          calculated: `${results.axialCapacity} kN`,
          limit: `NEd = ${formData.axialForce} kN`,
          utilisation: parseFloat(results.axialUtil) / 100,
          status: results.axialStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Moment Capacity X-axis',
      description: 'Bending about X-axis',
      checks: [
        {
          name: 'Moment Resistance MRd,x',
          formula: 'N-M interaction',
          calculated: `${results.momentCapacityX} kNm`,
          limit: `MEd,x = ${results.mEdX2 || formData.momentX} kNm`,
          utilisation: parseFloat(results.momentUtilX) / 100,
          status: results.momentStatusX as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Moment Capacity Y-axis',
      description: 'Bending about Y-axis',
      checks: [
        {
          name: 'Moment Resistance MRd,y',
          formula: 'N-M interaction',
          calculated: `${results.momentCapacityY} kNm`,
          limit: `MEd,y = ${results.mEdY2 || formData.momentY} kNm`,
          utilisation: parseFloat(results.momentUtilY) / 100,
          status: results.momentStatusY as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Biaxial Bending',
      description: 'EC2 Cl.5.8.9',
      checks: [
        {
          name: 'Biaxial Interaction',
          formula: '(MEd,x/MRd,x)^a + (MEd,y/MRd,y)^a ≤ 1.0',
          calculated: results.biaxialRatio,
          limit: '≤ 1.0',
          utilisation: parseFloat(results.biaxialRatio),
          status: results.biaxialStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Shear Capacity',
      description: 'EC2 Cl.6.2',
      checks: [
        {
          name: 'Shear X-axis',
          formula: 'VRd,c + VRd,s',
          calculated: `${results.shearCapacityX} kN`,
          limit: `VEd,x = ${formData.shearX} kN`,
          utilisation: parseFloat(results.shearUtilX) / 100,
          status: results.shearStatusX as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear Y-axis',
          formula: 'VRd,c + VRd,s',
          calculated: `${results.shearCapacityY} kN`,
          limit: `VEd,y = ${formData.shearY} kN`,
          utilisation: parseFloat(results.shearUtilY) / 100,
          status: results.shearStatusY as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Detailing',
      description: 'Link spacing requirements',
      checks: [
        {
          name: 'Link Spacing',
          formula: 's ≤ min(20φ, b, 400mm)',
          calculated: `${formData.linkSpacing} mm`,
          limit: `≤ ${results.maxLinkSpacing} mm`,
          utilisation: parseFloat(formData.linkSpacing) / parseFloat(results.maxLinkSpacing),
          status: results.linkStatus as 'PASS' | 'FAIL',
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
          description: 'Gross concrete area',
          formula: formData.columnType === 'Rectangular' ? 'Ac = b × h' : 'Ac = π × d²/4',
          substitution:
            formData.columnType === 'Rectangular'
              ? `Ac = ${formData.width} × ${formData.depth}`
              : `Ac = π × ${formData.diameter}²/4`,
          result: `Ac = ${results.grossArea} mm²`,
        },
        {
          description: 'Effective depth (x-axis)',
          formula: 'd = h - cover - φlink - φbar/2',
          result: `d = ${results.effectiveDepthX} mm`,
        },
        {
          description: 'Effective depth (y-axis)',
          formula: 'd = b - cover - φlink - φbar/2',
          result: `d = ${results.effectiveDepthY} mm`,
        },
      ],
    },
    {
      title: 'Reinforcement',
      steps: [
        {
          description: 'Bar area',
          formula: 'As,bar = π × φ²/4',
          substitution: `As,bar = π × ${formData.mainBarDia}²/4`,
          result: `As,bar = ${((Math.PI * Math.pow(parseFloat(formData.mainBarDia), 2)) / 4).toFixed(0)} mm²`,
        },
        {
          description: 'Total steel area',
          formula: 'As,total = n × As,bar',
          substitution: `As,total = ${formData.numberOfBars} × As,bar`,
          result: `As,total = ${results.totalSteelArea} mm²`,
        },
        {
          description: 'Steel ratio',
          formula: 'ρ = As / Ac × 100',
          result: `ρ = ${results.steelRatio}%`,
        },
      ],
    },
    {
      title: 'Slenderness',
      steps: [
        {
          description: 'Effective length (x-axis)',
          formula: 'L₀ = k × L',
          result: `L₀,x = ${results.effectiveLengthX} mm`,
        },
        {
          description: 'Radius of gyration',
          formula: formData.columnType === 'Rectangular' ? 'i = h / √12' : 'i = d / 4',
          result:
            formData.columnType === 'Rectangular'
              ? `i = ${(parseFloat(formData.depth) / Math.sqrt(12)).toFixed(1)} mm`
              : `i = ${(parseFloat(formData.diameter) / 4).toFixed(1)} mm`,
        },
        {
          description: 'Slenderness ratio',
          formula: 'λ = L₀ / i',
          result: `λ = ${results.slendernessX}`,
        },
        {
          description: 'Slenderness limit',
          formula: 'λlim = 20×A×B×C/√n',
          result: `λlim = ${results.slendernessLimit}`,
        },
      ],
    },
    {
      title: 'Axial Capacity',
      steps: [
        {
          description: 'Concrete contribution',
          formula: 'Nc = 0.567 × fck × Ac',
          result: `Nc = ${((0.567 * parseFloat(results.fck) * parseFloat(results.grossArea)) / 1000).toFixed(0)} kN`,
        },
        {
          description: 'Steel contribution',
          formula: 'Ns = As × fyd',
          result: `Ns = ${((parseFloat(results.totalSteelArea) * parseFloat(results.fyd)) / 1000).toFixed(0)} kN`,
        },
        {
          description: 'Total axial resistance',
          formula: 'NRd = Nc + Ns',
          result: `NRd = ${results.axialCapacity} kN`,
        },
        {
          description: 'Utilisation',
          formula: 'Util = NEd / NRd × 100',
          result: `${results.axialUtil}%`,
        },
      ],
    },
  ];

  // Add second order calculations if applicable
  if (formData.includeSecondOrder === 'Yes' || results.isSlender === 'Yes') {
    detailedCalculations.push({
      title: 'Second Order Effects',
      steps: [
        {
          description: 'Second order eccentricity (x)',
          formula: 'e₂ = (1/r) × L₀²/c',
          result: `e₂,x = ${results.e2x} mm`,
        },
        {
          description: 'Second order moment (x)',
          formula: 'M₂ = NEd × e₂',
          result: `M₂,x = ${results.mEdX2} kNm (total including 1st order)`,
        },
      ],
    });
  }

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.steelRatio) < 0.4) {
    reportWarnings.push({
      type: 'warning',
      message: `Steel ratio ${results.steelRatio}% below minimum 0.4%`,
    });
  }

  if (parseFloat(results.steelRatio) > 4) {
    reportWarnings.push({
      type: 'warning',
      message: `Steel ratio ${results.steelRatio}% exceeds 4% maximum at laps`,
    });
  }

  if (results.isSlender === 'Yes') {
    reportWarnings.push({
      type: 'info',
      message: 'Slender column - second order effects included in design moments',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${sectionDesc} column with ${formData.numberOfBars}T${formData.mainBarDia} is ADEQUATE.
         Governing check: ${results.governingCheck} at ${results.overallUtil}% utilisation.`
        : `Column FAILS at ${results.governingCheck}. Increase section size or reinforcement.`,
    status: overallStatus,
    recommendations: [
      `Provide ${formData.numberOfBars}No. T${formData.mainBarDia} main bars`,
      `T${formData.linkDia} links @ ${formData.linkSpacing}mm c/c`,
      `Min cover: ${formData.cover}mm`,
      results.isSlender === 'Yes'
        ? 'Verify bracing assumptions for effective length'
        : 'Short column - no additional bracing required',
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
