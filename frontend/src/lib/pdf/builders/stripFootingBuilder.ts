// ============================================================================
// BeaverCalc Studio — Strip Footing Report Data Builder
// Continuous Strip Foundation Design
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
 * Form data from the Strip Footing calculator
 */
export interface StripFootingFormData {
  // Footing Geometry
  footingWidth: string;
  footingDepth: string;
  footingThickness: string;
  wallThickness: string;

  // Loading
  wallLoad: string;
  eccentricity: string;
  horizontalLoad: string;
  momentLoad: string;

  // Soil Properties
  soilType: string;
  bearingCapacity: string;
  soilFriction: string;
  cohesion: string;
  soilUnitWeight: string;
  waterTableDepth: string;

  // Concrete Properties
  concreteGrade: string;
  steelGrade: string;
  cover: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Strip Footing calculator
 */
export interface StripFootingResults {
  // Bearing Pressure
  grossPressure: string;
  netPressure: string;
  maxPressure: string;
  minPressure: string;
  eccentricityActual: string;
  bearingUtil: string;
  bearingStatus: string;

  // Sliding Check
  slidingForce: string;
  slidingResistance: string;
  slidingFOS: string;
  slidingStatus: string;

  // Overturning Check
  overturningMoment: string;
  stabilizingMoment: string;
  overturningFOS: string;
  overturningStatus: string;

  // Settlement
  immediateSettlement: string;
  consolidationSettlement: string;
  totalSettlement: string;
  settlementStatus: string;

  // Flexural Design
  cantileverMoment: string;
  requiredAs: string;
  providedAs: string;
  barSize: string;
  barSpacing: string;
  flexuralStatus: string;

  // Shear Design
  shearForce: string;
  shearCapacity: string;
  shearUtil: string;
  shearStatus: string;

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
 * Build a ReportData object from Strip Footing calculator results
 */
export function buildStripFootingReport(
  formData: StripFootingFormData,
  results: StripFootingResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.bearingStatus,
    results.slidingStatus,
    results.overturningStatus,
    results.settlementStatus,
    results.flexuralStatus,
    results.shearStatus,
  ];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'Strip Footing Design',
    projectName: options.projectName || formData.projectTitle || 'Strip Footing Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `STR-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Strip Footing',
    designCodes: ['Eurocode 7', 'Eurocode 2', 'BS 8004', 'BS 8110'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Strip footing design for ${formData.wallThickness}mm wall on ${formData.footingWidth}m wide × 
    ${formData.footingThickness}m thick footing at ${formData.footingDepth}m depth.
    ${formData.concreteGrade} concrete, ${formData.soilType} founding stratum with 
    ${formData.bearingCapacity} kPa allowable bearing.`,
    keyResults: [
      { label: 'Footing Width', value: `${formData.footingWidth} m` },
      { label: 'Max Bearing Pressure', value: `${results.maxPressure} kPa`, highlight: true },
      { label: 'Bearing Utilisation', value: `${results.bearingUtil}%` },
      { label: 'Total Settlement', value: `${results.totalSettlement} mm` },
      { label: 'Reinforcement', value: `${results.barSize}@${results.barSpacing}` },
    ],
    overallStatus,
    governingCheck: getGoverningCheck(results),
    utilisationSummary: `Max utilisation: ${Math.max(
      parseFloat(results.bearingUtil),
      parseFloat(results.shearUtil),
    ).toFixed(0)}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Footing Geometry',
        parameters: [
          { name: 'Footing Width', value: formData.footingWidth, unit: 'm' },
          { name: 'Foundation Depth', value: formData.footingDepth, unit: 'm' },
          { name: 'Footing Thickness', value: formData.footingThickness, unit: 'm' },
          { name: 'Wall Thickness', value: formData.wallThickness, unit: 'mm' },
        ],
      },
      {
        title: 'Loading',
        parameters: [
          { name: 'Wall Line Load', value: formData.wallLoad, unit: 'kN/m' },
          { name: 'Eccentricity', value: formData.eccentricity, unit: 'mm' },
          { name: 'Horizontal Load', value: formData.horizontalLoad, unit: 'kN/m' },
          { name: 'Moment', value: formData.momentLoad, unit: 'kNm/m' },
        ],
      },
      {
        title: 'Soil Properties',
        parameters: [
          { name: 'Soil Type', value: formData.soilType },
          { name: 'Allowable Bearing', value: formData.bearingCapacity, unit: 'kPa' },
          { name: 'Friction Angle', value: formData.soilFriction, unit: '°' },
          { name: 'Cohesion', value: formData.cohesion, unit: 'kPa' },
          { name: 'Unit Weight', value: formData.soilUnitWeight, unit: 'kN/m³' },
        ],
      },
      {
        title: 'Concrete & Reinforcement',
        parameters: [
          { name: 'Concrete Grade', value: formData.concreteGrade },
          { name: 'Steel Grade', value: formData.steelGrade },
          { name: 'Cover', value: formData.cover, unit: 'mm' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Bearing Capacity',
      description: 'Check soil bearing pressure',
      checks: [
        {
          name: 'Maximum Bearing Pressure',
          formula: 'q_max = P/A × (1 + 6e/B) ≤ q_allow',
          calculated: `${results.maxPressure} kPa`,
          limit: `≤ ${formData.bearingCapacity} kPa`,
          utilisation: parseFloat(results.bearingUtil) / 100,
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Minimum Pressure (Tension)',
          formula: 'q_min ≥ 0',
          calculated: `${results.minPressure} kPa`,
          limit: '≥ 0 kPa',
          utilisation: parseFloat(results.minPressure) > 0 ? 0 : 1.5,
          status: parseFloat(results.minPressure) >= 0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Sliding Stability',
      description: 'Check resistance to horizontal sliding',
      checks: [
        {
          name: 'Sliding Factor of Safety',
          formula: 'FOS = (V × tan(δ) + cB) / H ≥ 1.5',
          calculated: results.slidingFOS,
          limit: '≥ 1.50',
          utilisation: 1.5 / parseFloat(results.slidingFOS),
          status: results.slidingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Overturning Stability',
      description: 'Check resistance to overturning',
      checks: [
        {
          name: 'Overturning Factor of Safety',
          formula: 'FOS = M_stab / M_over ≥ 2.0',
          calculated: results.overturningFOS,
          limit: '≥ 2.00',
          utilisation: 2.0 / parseFloat(results.overturningFOS),
          status: results.overturningStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Settlement',
      description: 'Check total settlement within limits',
      checks: [
        {
          name: 'Total Settlement',
          formula: 'δ_total = δ_imm + δ_cons ≤ 25mm',
          calculated: `${results.totalSettlement} mm`,
          limit: '≤ 25 mm',
          utilisation: parseFloat(results.totalSettlement) / 25,
          status: results.settlementStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Flexural Design (EC2)',
      description: 'Cantilever bending in transverse direction',
      checks: [
        {
          name: 'Bottom Reinforcement',
          formula: 'As_req ≤ As_prov',
          calculated: `${results.requiredAs} mm²/m`,
          limit: `${results.providedAs} mm²/m provided`,
          utilisation: parseFloat(results.requiredAs) / parseFloat(results.providedAs),
          status: results.flexuralStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Shear Design (EC2)',
      description: 'Punching shear at face of wall',
      checks: [
        {
          name: 'Shear Resistance (no links)',
          formula: 'VEd ≤ VRd,c',
          calculated: `${results.shearForce} kN/m`,
          limit: `≤ ${results.shearCapacity} kN/m`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Bearing Pressure Distribution',
      steps: [
        {
          description: 'Total vertical load',
          formula: 'V = P_wall + W_footing',
          result: `${(parseFloat(formData.wallLoad) + parseFloat(formData.footingThickness) * parseFloat(formData.footingWidth) * 25).toFixed(1)} kN/m`,
        },
        {
          description: 'Eccentricity',
          formula: 'e = M/V',
          result: `${results.eccentricityActual} m`,
        },
        {
          description: 'Maximum pressure (Meyerhof)',
          formula: 'q_max = V/A × (1 + 6e/B)',
          result: `${results.maxPressure} kPa`,
        },
        {
          description: 'Minimum pressure',
          formula: 'q_min = V/A × (1 - 6e/B)',
          result: `${results.minPressure} kPa`,
        },
      ],
    },
    {
      title: 'Settlement Calculation',
      steps: [
        {
          description: 'Immediate settlement',
          formula: 'δ_imm = q × B × (1-ν²) / E × I_s',
          result: `${results.immediateSettlement} mm`,
        },
        {
          description: 'Consolidation settlement',
          formula: "δ_cons = (Cc × H) / (1+e₀) × log((σ'₀ + Δσ) / σ'₀)",
          result: `${results.consolidationSettlement} mm`,
        },
        {
          description: 'Total settlement',
          formula: 'δ_total = δ_imm + δ_cons',
          result: `${results.totalSettlement} mm`,
        },
      ],
    },
    {
      title: 'Reinforcement Design',
      steps: [
        {
          description: 'Cantilever moment',
          formula: 'M_Ed = q_max × L_cant² / 2',
          result: `${results.cantileverMoment} kNm/m`,
        },
        {
          description: 'Required steel area',
          formula: 'As = M_Ed / (0.87 × fyk × z)',
          result: `${results.requiredAs} mm²/m`,
        },
        {
          description: 'Provided reinforcement',
          formula: `${results.barSize} @ ${results.barSpacing} c/c`,
          result: `${results.providedAs} mm²/m`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.minPressure) < 0) {
    reportWarnings.push({
      type: 'warning',
      message: 'Tension under footing - consider wider base or reducing eccentricity',
    });
  }

  if (parseFloat(formData.footingDepth) < 0.45) {
    reportWarnings.push({
      type: 'info',
      message: 'Foundation depth < 450mm - check frost protection requirements',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The strip footing design is ADEQUATE. ${formData.footingWidth}m wide footing with 
         ${results.barSize}@${results.barSpacing} bottom reinforcement provides bearing 
         utilisation of ${results.bearingUtil}% and settlement of ${results.totalSettlement}mm.`
        : `The strip footing design is INADEQUATE. Consider increasing width, depth, 
         or reinforcement as required.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.concreteGrade} concrete with ${formData.cover}mm cover`,
      `Install ${results.barSize} bars @ ${results.barSpacing} c/c transverse (bottom)`,
      'Provide longitudinal distribution steel (20% of main)',
      'Compact fill to 95% MDD in 150mm lifts',
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

function getGoverningCheck(results: StripFootingResults): string {
  const checks = [
    { name: 'Bearing', util: parseFloat(results.bearingUtil) },
    { name: 'Shear', util: parseFloat(results.shearUtil) },
  ];
  return checks.reduce((a, b) => (a.util > b.util ? a : b)).name;
}
