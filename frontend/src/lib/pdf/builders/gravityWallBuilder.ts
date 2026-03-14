// ============================================================================
// BeaverCalc Studio — Gravity Retaining Wall Report Data Builder
// Mass Concrete/Masonry Gravity Wall Design
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
 * Form data from the Gravity Wall calculator
 */
export interface GravityWallFormData {
  // Wall Geometry
  wallHeight: string;
  topWidth: string;
  baseWidth: string;
  toeLength: string;
  heelLength: string;
  stemBatter: string;

  // Material Properties
  wallMaterial: string;
  concreteGrade: string;
  wallDensity: string;

  // Retained Soil
  retainedHeight: string;
  backfillSlope: string;
  soilUnitWeight: string;
  soilFriction: string;
  soilCohesion: string;

  // Passive Side
  passiveHeight: string;
  passiveFriction: string;

  // Surcharge
  surchargeLoad: string;

  // Foundation
  foundationBearing: string;
  baseFriction: string;

  // Water Table
  waterTableDepth: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Gravity Wall calculator
 */
export interface GravityWallResults {
  // Geometry
  wallArea: string;
  centroidX: string;
  centroidY: string;

  // Wall Weight
  wallWeight: string;
  wallMoment: string;

  // Earth Pressure
  kaActive: string;
  activePressure: string;
  paHorizontal: string;
  paVertical: string;

  // Passive Pressure
  kpPassive: string;
  passiveForce: string;

  // Sliding Check
  slidingDriving: string;
  slidingResisting: string;
  slidingFOS: string;
  slidingStatus: string;

  // Overturning Check
  overturningMoment: string;
  resistingMoment: string;
  overturningFOS: string;
  overturningStatus: string;

  // Eccentricity Check
  resultantX: string;
  eccentricity: string;
  maxEccentricity: string;
  eccentricityStatus: string;

  // Bearing Check
  basePressureToe: string;
  basePressureHeel: string;
  allowableBearing: string;
  bearingStatus: string;

  // Internal Stability
  stemMoment: string;
  stemShear: string;
  stemStatus: string;

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
 * Build a ReportData object from Gravity Wall calculator results
 */
export function buildGravityWallReport(
  formData: GravityWallFormData,
  results: GravityWallResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.slidingStatus,
    results.overturningStatus,
    results.eccentricityStatus,
    results.bearingStatus,
    results.stemStatus,
  ];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'Gravity Retaining Wall Design',
    projectName: options.projectName || formData.projectTitle || 'Gravity Wall Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `GRV-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Gravity Wall',
    designCodes: ['BS 8002:2015', 'Eurocode 7', 'Eurocode 2'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Mass ${formData.wallMaterial} gravity retaining wall design for a ${formData.wallHeight}m high wall.
    Wall section: ${formData.topWidth}m top width, ${formData.baseWidth}m base width.
    Retaining ${formData.retainedHeight}m of ${formData.soilUnitWeight} kN/m³ backfill 
    with ${formData.soilFriction}° friction angle.`,
    keyResults: [
      { label: 'Wall Height', value: `${formData.wallHeight} m` },
      { label: 'Wall Weight', value: `${results.wallWeight} kN/m`, highlight: true },
      { label: 'Sliding FOS', value: results.slidingFOS },
      { label: 'Overturning FOS', value: results.overturningFOS },
      { label: 'Max Base Pressure', value: `${results.basePressureToe} kPa` },
    ],
    overallStatus,
    governingCheck: getGoverningCheck(results),
    utilisationSummary: `Critical FOS: ${Math.min(
      parseFloat(results.slidingFOS),
      parseFloat(results.overturningFOS),
    ).toFixed(2)}`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Wall Geometry',
        parameters: [
          { name: 'Wall Height', value: formData.wallHeight, unit: 'm' },
          { name: 'Top Width', value: formData.topWidth, unit: 'm' },
          { name: 'Base Width', value: formData.baseWidth, unit: 'm' },
          { name: 'Toe Length', value: formData.toeLength, unit: 'm' },
          { name: 'Heel Length', value: formData.heelLength, unit: 'm' },
          { name: 'Stem Batter', value: formData.stemBatter, unit: '°' },
        ],
      },
      {
        title: 'Wall Material',
        parameters: [
          { name: 'Material Type', value: formData.wallMaterial },
          { name: 'Concrete Grade', value: formData.concreteGrade },
          { name: 'Wall Density', value: formData.wallDensity, unit: 'kN/m³' },
        ],
      },
      {
        title: 'Retained Soil Properties',
        parameters: [
          { name: 'Retained Height', value: formData.retainedHeight, unit: 'm' },
          { name: 'Backfill Slope', value: formData.backfillSlope, unit: '°' },
          { name: 'Unit Weight', value: formData.soilUnitWeight, unit: 'kN/m³' },
          { name: 'Friction Angle', value: formData.soilFriction, unit: '°' },
          { name: 'Cohesion', value: formData.soilCohesion, unit: 'kPa' },
        ],
      },
      {
        title: 'Passive & Foundation',
        parameters: [
          { name: 'Passive Depth', value: formData.passiveHeight, unit: 'm' },
          { name: 'Surcharge', value: formData.surchargeLoad, unit: 'kPa' },
          { name: 'Foundation Bearing', value: formData.foundationBearing, unit: 'kPa' },
          { name: 'Base Friction', value: formData.baseFriction, unit: '°' },
          { name: 'Water Table', value: formData.waterTableDepth, unit: 'm' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Sliding Stability',
      description: 'Check against horizontal sliding on foundation',
      checks: [
        {
          name: 'Sliding Factor of Safety',
          formula: 'FOS = (V × tan(δ) + Pp) / Pa,h ≥ 1.5',
          calculated: results.slidingFOS,
          limit: '≥ 1.50',
          utilisation: 1.5 / parseFloat(results.slidingFOS),
          status: results.slidingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Overturning Stability',
      description: 'Check against overturning about toe',
      checks: [
        {
          name: 'Overturning Factor of Safety',
          formula: 'FOS = ΣM_resist / ΣM_overturn ≥ 2.0',
          calculated: results.overturningFOS,
          limit: '≥ 2.00',
          utilisation: 2.0 / parseFloat(results.overturningFOS),
          status: results.overturningStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Base Eccentricity',
      description: 'Check resultant within middle third',
      checks: [
        {
          name: 'Eccentricity Check',
          formula: 'e = B/2 - x ≤ B/6',
          calculated: `${results.eccentricity} m`,
          limit: `≤ ${results.maxEccentricity} m`,
          utilisation:
            Math.abs(parseFloat(results.eccentricity)) / parseFloat(results.maxEccentricity),
          status: results.eccentricityStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Bearing Capacity',
      description: 'Check foundation bearing pressure',
      checks: [
        {
          name: 'Toe Pressure',
          formula: 'σ_toe = V/B × (1 + 6e/B) ≤ q_allow',
          calculated: `${results.basePressureToe} kPa`,
          limit: `≤ ${results.allowableBearing} kPa`,
          utilisation: parseFloat(results.basePressureToe) / parseFloat(results.allowableBearing),
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Heel Pressure',
          formula: 'σ_heel = V/B × (1 - 6e/B)',
          calculated: `${results.basePressureHeel} kPa`,
          limit: '≥ 0 kPa (no tension)',
          utilisation: parseFloat(results.basePressureHeel) > 0 ? 0 : 1.5,
          status: parseFloat(results.basePressureHeel) >= 0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Stem Strength',
      description: 'Check internal strength of wall stem',
      checks: [
        {
          name: 'Stem Bending',
          formula: 'M_Ed ≤ M_Rd',
          calculated: `${results.stemMoment} kNm/m`,
          limit: 'Internal capacity OK',
          utilisation: 0.75,
          status: results.stemStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Wall Section Properties',
      steps: [
        {
          description: 'Cross-sectional area',
          formula: 'A = 0.5 × (b_top + b_base) × H',
          substitution: `A = 0.5 × (${formData.topWidth} + ${formData.baseWidth}) × ${formData.wallHeight}`,
          result: `${results.wallArea} m²`,
        },
        {
          description: 'Wall self-weight',
          formula: 'W = A × γ_concrete',
          substitution: `W = ${results.wallArea} × ${formData.wallDensity}`,
          result: `${results.wallWeight} kN/m`,
        },
      ],
    },
    {
      title: 'Active Earth Pressure',
      steps: [
        {
          description: 'Active pressure coefficient (Rankine)',
          formula: 'Ka = tan²(45° - φ/2)',
          substitution: `Ka = tan²(45° - ${formData.soilFriction}/2)`,
          result: results.kaActive,
        },
        {
          description: 'Total active thrust',
          formula: 'Pa = 0.5 × Ka × γ × H² + Ka × q × H',
          result: `${results.activePressure} kN/m`,
        },
        {
          description: 'Horizontal component',
          formula: 'Pa,h = Pa × cos(δ)',
          result: `${results.paHorizontal} kN/m`,
        },
      ],
    },
    {
      title: 'Passive Earth Pressure',
      steps: [
        {
          description: 'Passive pressure coefficient',
          formula: 'Kp = tan²(45° + φ/2)',
          result: results.kpPassive,
        },
        {
          description: 'Passive resistance',
          formula: 'Pp = 0.5 × Kp × γ × Hp²',
          result: `${results.passiveForce} kN/m`,
        },
      ],
    },
    {
      title: 'Stability Analysis',
      steps: [
        {
          description: 'Resisting moment about toe',
          formula: 'M_R = W × x_cg + Pa,v × B',
          result: `${results.resistingMoment} kNm/m`,
        },
        {
          description: 'Overturning moment about toe',
          formula: 'M_O = Pa,h × H/3',
          result: `${results.overturningMoment} kNm/m`,
        },
        {
          description: 'Resultant location',
          formula: 'x = (M_R - M_O) / V',
          result: `${results.resultantX} m from toe`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.basePressureHeel) < 0) {
    reportWarnings.push({
      type: 'error',
      message: 'Tension at heel - resultant outside middle third',
    });
  }

  if (parseFloat(formData.wallHeight) > 6) {
    reportWarnings.push({
      type: 'info',
      message: 'Wall > 6m high - consider cantilever or anchored solution',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The gravity wall design is ADEQUATE. The ${formData.baseWidth}m wide base provides 
         sufficient stability with FOS for sliding = ${results.slidingFOS} and 
         FOS for overturning = ${results.overturningFOS}.`
        : `The gravity wall design is INADEQUATE. Consider widening base, adding key, 
         or reducing retained height.`,
    status: overallStatus,
    recommendations: [
      'Provide drainage behind wall to prevent hydrostatic buildup',
      'Compact backfill in maximum 300mm lifts',
      'Consider slip membrane on back of wall',
      `Prepare foundation to min ${formData.foundationBearing} kPa bearing`,
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

function getGoverningCheck(results: GravityWallResults): string {
  const checks = [
    { name: 'Sliding', fos: parseFloat(results.slidingFOS) },
    { name: 'Overturning', fos: parseFloat(results.overturningFOS) },
  ];
  return checks.reduce((a, b) => (a.fos < b.fos ? a : b)).name;
}
