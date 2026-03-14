// ============================================================================
// BeaverCalc Studio — Steel Plate Girder Report Data Builder
// Transforms calculator results into ReportData format for premium PDF export
// ============================================================================

import type {
  DesignCheck,
  DesignCheckSection,
  DetailedCalculation,
  ReportConclusion,
  ReportData,
  ReportInputs,
  ReportWarning,
  SectionProperty,
} from '../types';

/**
 * Form data from the Steel Plate Girder calculator
 */
export interface SteelPlateGirderFormData {
  span: string;
  webDepth: string;
  webThickness: string;
  flangeWidth: string;
  flangeThickness: string;
  deadLoad: string;
  liveLoad: string;
  pointLoadDead: string;
  pointLoadLive: string;
  steelGrade: string;
  lateralRestraintSpacing: string;
  useStiffeners: string;
  stiffenerSpacing: string;
  stiffenerThickness: string;
  stiffenerHeight: string;
  loadPosition: string;
  selfWeightToggle: boolean;
}

/**
 * Results from the Steel Plate Girder calculator
 */
export interface SteelPlateGirderResults {
  sectionProperties: {
    totalDepth: string;
    totalArea: string;
    Iy: string;
    Iz: string;
    Wel: string;
    Wpl: string;
    radiusGyration: string;
    sectionClass: number;
    flangeClass: number;
    webClass: number;
    selfWeight: string;
  };
  loads: {
    M_Ed_SLS: string;
    M_Ed_ULS: string;
    V_Ed_SLS: string;
    V_Ed_ULS: string;
    q_ULS: string;
    P_ULS: string;
  };
  bendingResistance: {
    Mc_Rd: string;
    utilisation: string;
    status: string;
  };
  lateralTorsionalBuckling: {
    Mcr: string;
    lambda_LT: string;
    chi_LT: string;
    Mb_Rd: string;
    utilisation: string;
    status: string;
  };
  shearResistance: {
    Vpl_Rd: string;
    utilisation: string;
    status: string;
  };
  shearBuckling: {
    required: boolean;
    hw_tw_ratio: string;
    hw_tw_limit: string;
    chi_w: string;
    Vb_Rd: string;
    utilisation: string;
    status: string;
  };
  deflection: {
    actual: string;
    limit: string;
    ratio: string;
    utilisation: string;
    status: string;
  };
  interaction: {
    status: string;
    utilisation: string;
  };
  webBearing: {
    Fy_Rd: string;
    utilisation: string;
    status: string;
  };
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
 * Build a ReportData object from Steel Plate Girder calculator results
 */
export function buildSteelPlateGirderReport(
  formData: SteelPlateGirderFormData,
  results: SteelPlateGirderResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allChecks = [
    results.bendingResistance.status,
    results.lateralTorsionalBuckling.status,
    results.shearResistance.status,
    results.shearBuckling.status,
    results.deflection.status,
    results.interaction.status,
    results.webBearing.status,
  ];
  const failCount = allChecks.filter((s) => s === 'FAIL').length;
  const overallStatus: 'PASS' | 'FAIL' = failCount > 0 ? 'FAIL' : 'PASS';

  // Find governing check (highest utilisation)
  const utilisationValues = [
    { name: 'Bending Resistance', util: parseFloat(results.bendingResistance.utilisation) },
    {
      name: 'Lateral-Torsional Buckling',
      util: parseFloat(results.lateralTorsionalBuckling.utilisation),
    },
    { name: 'Shear Resistance', util: parseFloat(results.shearResistance.utilisation) },
    { name: 'Shear Buckling', util: parseFloat(results.shearBuckling.utilisation) },
    { name: 'Deflection', util: parseFloat(results.deflection.utilisation) },
    { name: 'Bending-Shear Interaction', util: parseFloat(results.interaction.utilisation) },
    { name: 'Web Bearing', util: parseFloat(results.webBearing.utilisation) },
  ];
  const governing = utilisationValues.reduce((max, curr) => (curr.util > max.util ? curr : max));
  const maxUtil = governing.util;

  // Convert warnings to ReportWarning format
  const reportWarnings: ReportWarning[] = warnings.map((w, i) => {
    const isError = w.includes('⛔');
    const text = w.replace(/^[⚠️⛔]\s*/, '');
    return {
      severity: isError ? 'error' : 'warning',
      title: `Warning ${i + 1}`,
      message: text,
    };
  });

  // Build inputs
  const inputs: ReportInputs = {
    geometry: {
      title: 'Geometry',
      parameters: [
        { label: 'Span Length', value: formData.span, unit: 'm' },
        { label: 'Web Depth', value: formData.webDepth, unit: 'mm' },
        { label: 'Web Thickness', value: formData.webThickness, unit: 'mm' },
        { label: 'Flange Width', value: formData.flangeWidth, unit: 'mm' },
        { label: 'Flange Thickness', value: formData.flangeThickness, unit: 'mm' },
        { label: 'Total Depth', value: results.sectionProperties.totalDepth, unit: 'mm' },
      ],
    },
    materials: {
      title: 'Material Properties',
      parameters: [
        { label: 'Steel Grade', value: formData.steelGrade },
        {
          label: 'Yield Strength (fy)',
          value: getYieldStrength(formData.steelGrade),
          unit: 'N/mm²',
        },
        { label: "Young's Modulus (E)", value: '210,000', unit: 'N/mm²' },
        { label: 'Shear Modulus (G)', value: '80,770', unit: 'N/mm²' },
      ],
    },
    loads: {
      title: 'Applied Loading',
      parameters: [
        { label: 'Dead Load (UDL)', value: formData.deadLoad || '0', unit: 'kN/m' },
        { label: 'Live Load (UDL)', value: formData.liveLoad || '0', unit: 'kN/m' },
        { label: 'Point Load (Dead)', value: formData.pointLoadDead || '0', unit: 'kN' },
        { label: 'Point Load (Live)', value: formData.pointLoadLive || '0', unit: 'kN' },
        { label: 'Self-Weight', value: results.sectionProperties.selfWeight, unit: 'kN/m' },
        { label: 'ULS Design Load', value: results.loads.q_ULS, unit: 'kN/m' },
      ],
    },
    supportConditions: {
      title: 'Support & Restraint Conditions',
      parameters: [
        { label: 'Support Type', value: 'Simply Supported' },
        {
          label: 'Lateral Restraint Spacing',
          value: formData.lateralRestraintSpacing || 'Unrestrained',
          unit: 'mm',
        },
        { label: 'Use Stiffeners', value: formData.useStiffeners === 'yes' ? 'Yes' : 'No' },
      ],
    },
  };

  // Build section properties
  const sectionProperties: SectionProperty[] = [
    { name: 'Total Depth', symbol: 'h', value: results.sectionProperties.totalDepth, unit: 'mm' },
    {
      name: 'Cross-Sectional Area',
      symbol: 'A',
      value: results.sectionProperties.totalArea,
      unit: 'cm²',
    },
    {
      name: 'Second Moment of Area',
      symbol: 'Iy',
      value: results.sectionProperties.Iy,
      unit: 'cm⁴',
    },
    {
      name: 'Second Moment of Area',
      symbol: 'Iz',
      value: results.sectionProperties.Iz,
      unit: 'cm⁴',
    },
    {
      name: 'Elastic Section Modulus',
      symbol: 'Wel,y',
      value: results.sectionProperties.Wel,
      unit: 'cm³',
    },
    {
      name: 'Plastic Section Modulus',
      symbol: 'Wpl,y',
      value: results.sectionProperties.Wpl,
      unit: 'cm³',
    },
    {
      name: 'Radius of Gyration',
      symbol: 'iy',
      value: results.sectionProperties.radiusGyration,
      unit: 'mm',
    },
    {
      name: 'Section Classification',
      value: `Class ${results.sectionProperties.sectionClass}`,
      unit: '',
    },
    {
      name: 'Flange Classification',
      value: `Class ${results.sectionProperties.flangeClass}`,
      unit: '',
    },
    { name: 'Web Classification', value: `Class ${results.sectionProperties.webClass}`, unit: '' },
  ];

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Bending Resistance (EN 1993-1-1 Cl. 6.2.5)',
      checks: [
        createDesignCheck(
          'Bending',
          'Moment Resistance',
          parseFloat(results.loads.M_Ed_ULS),
          'kN·m',
          parseFloat(results.bendingResistance.Mc_Rd),
          'kN·m',
          parseFloat(results.bendingResistance.utilisation),
          '6.2.5',
          results.bendingResistance.status,
          results.sectionProperties.sectionClass <= 2
            ? 'Plastic resistance used (Class 1/2 section)'
            : 'Elastic resistance used (Class 3/4 section)',
        ),
      ],
    },
    {
      title: 'Lateral-Torsional Buckling (EN 1993-1-1 Cl. 6.3.2)',
      checks: [
        createDesignCheck(
          'LTB',
          'Buckling Resistance',
          parseFloat(results.loads.M_Ed_ULS),
          'kN·m',
          parseFloat(results.lateralTorsionalBuckling.Mb_Rd),
          'kN·m',
          parseFloat(results.lateralTorsionalBuckling.utilisation),
          '6.3.2.2',
          results.lateralTorsionalBuckling.status,
          `Mcr = ${results.lateralTorsionalBuckling.Mcr} kN·m, λLT = ${results.lateralTorsionalBuckling.lambda_LT}, χLT = ${results.lateralTorsionalBuckling.chi_LT}`,
        ),
      ],
    },
    {
      title: 'Shear Resistance (EN 1993-1-1 Cl. 6.2.6)',
      checks: [
        createDesignCheck(
          'Shear',
          'Plastic Shear Resistance',
          parseFloat(results.loads.V_Ed_ULS),
          'kN',
          parseFloat(results.shearResistance.Vpl_Rd),
          'kN',
          parseFloat(results.shearResistance.utilisation),
          '6.2.6',
          results.shearResistance.status,
        ),
      ],
    },
    {
      title: 'Shear Buckling (EN 1993-1-5 Cl. 5)',
      checks: [
        createDesignCheck(
          'Shear Buckling',
          'Web Shear Buckling',
          parseFloat(results.loads.V_Ed_ULS),
          'kN',
          parseFloat(results.shearBuckling.Vb_Rd),
          'kN',
          parseFloat(results.shearBuckling.utilisation),
          '5.2',
          results.shearBuckling.status,
          `hw/tw = ${results.shearBuckling.hw_tw_ratio} (limit: ${results.shearBuckling.hw_tw_limit}), χw = ${results.shearBuckling.chi_w}`,
        ),
      ],
    },
    {
      title: 'Serviceability - Deflection',
      checks: [
        createDesignCheck(
          'Deflection',
          'Deflection Check',
          parseFloat(results.deflection.actual),
          'mm',
          parseFloat(results.deflection.limit),
          'mm (L/360)',
          parseFloat(results.deflection.utilisation),
          'SLS',
          results.deflection.status,
          `Span/Deflection ratio: ${results.deflection.ratio}`,
        ),
      ],
    },
    {
      title: 'Combined Bending & Shear (EN 1993-1-1 Cl. 6.2.8)',
      checks: [
        createDesignCheck(
          'Interaction',
          'Bending-Shear Interaction',
          0,
          'Combined',
          100,
          '%',
          parseFloat(results.interaction.utilisation),
          '6.2.8',
          results.interaction.status === 'OK' ? 'PASS' : results.interaction.status,
        ),
      ],
    },
    {
      title: 'Web Bearing (EN 1993-1-5)',
      checks: [
        createDesignCheck(
          'Web Bearing',
          'Transverse Force Resistance',
          0,
          'Reaction',
          parseFloat(results.webBearing.Fy_Rd),
          'kN',
          parseFloat(results.webBearing.utilisation),
          '6.2',
          results.webBearing.status,
        ),
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Lateral-Torsional Buckling Calculation',
      steps: [
        {
          description: 'Elastic critical moment for LTB (EN 1993-1-1)',
          formula: 'Mcr = C₁ × (π²EIz/Lcr²) × √[(Iw/Iz) + (Lcr²GIt)/(π²EIz)]',
          result: `${results.lateralTorsionalBuckling.Mcr} kN·m`,
        },
        {
          description: 'Non-dimensional slenderness for LTB',
          formula: 'λLT = √(Wy × fy / Mcr)',
          result: results.lateralTorsionalBuckling.lambda_LT,
        },
        {
          description: 'LTB reduction factor (Curve c, αLT = 0.49 for welded sections)',
          formula: 'χLT = 1 / [ΦLT + √(ΦLT² - λLT²)] ≤ 1.0',
          result: results.lateralTorsionalBuckling.chi_LT,
        },
        {
          description: 'Design buckling resistance moment',
          formula: 'Mb,Rd = χLT × Wy × fy / γM1',
          result: `${results.lateralTorsionalBuckling.Mb_Rd} kN·m`,
        },
      ],
    },
    {
      title: 'Shear Buckling Calculation',
      steps: [
        {
          description: 'Web slenderness ratio',
          formula: 'hw / tw',
          result: `${results.shearBuckling.hw_tw_ratio} (limit: ${results.shearBuckling.hw_tw_limit})`,
        },
        {
          description: 'Shear buckling reduction factor',
          formula: 'χw = η / (0.76 + λw) for rigid end post',
          result: results.shearBuckling.chi_w,
        },
        {
          description: 'Shear buckling resistance',
          formula: 'Vb,Rd = χw × hw × tw × fyw / (√3 × γM1)',
          result: `${results.shearBuckling.Vb_Rd} kN`,
        },
      ],
    },
  ];

  // Build conclusion
  const conclusion: ReportConclusion = {
    status: overallStatus,
    summary:
      overallStatus === 'PASS'
        ? `The proposed steel plate girder design is ADEQUATE for the applied loading. All design checks pass in accordance with BS EN 1993-1-1 and BS EN 1993-1-5.`
        : `The proposed steel plate girder design is NOT ADEQUATE for the applied loading. One or more design checks have failed. The section requires modification.`,
    governingChecks: [`${governing.name} at ${governing.util.toFixed(1)}% utilisation`],
    suggestions:
      overallStatus === 'FAIL'
        ? [
            'Review failing design checks',
            'Consider increasing section size or using higher grade steel',
            'Add additional lateral restraints if LTB governs',
            'Consult with senior engineer before proceeding',
          ]
        : [
            'Proceed with detailed connection design',
            'Verify fabrication tolerances per EN 1090-2',
            'Consider fatigue assessment if applicable',
            'Issue for independent design check',
          ],
  };

  return {
    meta: {
      calculatorName: 'Steel Plate Girder Calculator',
      title: 'Steel Plate Girder Design Report',
      subtitle: 'Structural Engineering Design Calculations to BS EN 1993-1-1',
      projectName: options.projectName || 'Project',
      clientName: options.clientName || 'Client',
      preparedBy: options.preparedBy || 'Engineer',
      checkedBy: options.checkedBy,
      approvedBy: options.approvedBy,
      documentRef: options.documentRef || `SPG-${Date.now().toString(36).toUpperCase()}`,
      version: options.version || 'Rev A',
      date: today,
      designCodes: ['BS EN 1993-1-1:2005', 'BS EN 1993-1-5:2006', 'BS EN 1990:2002'],
    },

    executiveSummary: {
      overallStatus,
      governingCheck: `${governing.name} at ${governing.util.toFixed(1)}% utilisation`,
      maxUtilisation: maxUtil,
      keyDimensions: [
        { label: 'Span', value: formData.span, unit: 'm' },
        { label: 'Total Depth', value: results.sectionProperties.totalDepth, unit: 'mm' },
        { label: 'Web', value: `${formData.webDepth} × ${formData.webThickness}`, unit: 'mm' },
        {
          label: 'Flanges',
          value: `${formData.flangeWidth} × ${formData.flangeThickness}`,
          unit: 'mm',
        },
      ],
      keyLoads: [
        { label: 'Dead Load', value: formData.deadLoad || '0', unit: 'kN/m' },
        { label: 'Live Load', value: formData.liveLoad || '0', unit: 'kN/m' },
        { label: 'ULS Moment', value: results.loads.M_Ed_ULS, unit: 'kN·m' },
        { label: 'ULS Shear', value: results.loads.V_Ed_ULS, unit: 'kN' },
      ],
    },

    inputs,
    sectionProperties,
    designChecks,
    detailedCalculations,
    warnings: reportWarnings.length > 0 ? reportWarnings : undefined,
    conclusion,
  };
}

/**
 * Helper to create a DesignCheck object
 */
function createDesignCheck(
  category: string,
  name: string,
  designValue: number,
  designValueUnit: string,
  resistance: number,
  resistanceUnit: string,
  utilisation: number,
  clause: string,
  status: string,
  notes?: string,
): DesignCheck {
  return {
    category,
    name,
    designValue,
    designValueUnit,
    resistance,
    resistanceUnit,
    utilisation,
    clause,
    status: status === 'PASS' || status === 'OK' ? 'PASS' : 'FAIL',
    notes,
  };
}

/**
 * Helper to get yield strength from steel grade
 */
function getYieldStrength(grade: string): string {
  const strengths: Record<string, number> = {
    S235: 235,
    S275: 275,
    S355: 355,
    S420: 420,
    S460: 460,
  };
  return String(strengths[grade] || 355);
}
