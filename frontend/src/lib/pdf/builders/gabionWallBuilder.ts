// ============================================================================
// BeaverCalc Studio — Gabion Wall Report Data Builder
// Gabion Retaining Wall Design to EC7
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
 * Form data from the Gabion Wall calculator
 */
export interface GabionWallFormData {
  // Wall Geometry
  wallHeight: string; // m
  numberOfCourses: string;
  courseHeight: string; // mm (typically 500, 1000)
  baseWidth: string; // m
  topWidth: string; // m (for battered wall)
  batter: string; // degrees (back face angle)

  // Gabion Properties
  gabionType: string; // Weld mesh, Woven mesh, Reno mattress
  meshSize: string; // mm (80×100, 60×80, etc.)
  wireDiameter: string; // mm
  stoneSize: string; // mm (100-200, 150-250)
  stoneDensity: string; // kN/m³
  gabionPorosity: string; // % (typically 30-35%)

  // Backfill Properties
  backfillGamma: string; // kN/m³
  backfillPhi: string; // degrees
  backfillCohesion: string; // kPa
  backfillSlope: string; // degrees

  // Foundation
  foundationBearing: string; // kPa
  foundationFriction: string; // degrees
  passiveIncluded: string; // Yes/No
  embedmentDepth: string; // m

  // Surcharges
  surcharge: string; // kPa

  // Drainage
  drainageProvided: string; // Yes/No
}

/**
 * Results from the Gabion Wall calculator
 */
export interface GabionWallResults {
  // Gabion Properties
  effectiveDensity: string; // kN/m³ (accounting for voids)
  wallWeight: string; // kN/m
  centroidX: string; // m from toe

  // Earth Pressures
  Ka: string;
  Kp: string;
  activeForce: string; // kN/m
  activeArm: string; // m
  passiveForce: string; // kN/m
  surchargeForce: string; // kN/m

  // Overturning
  overturningMoment: string; // kNm/m
  resistingMoment: string; // kNm/m
  overturningFOS: string;

  // Sliding
  horizontalForce: string; // kN/m
  slidingResistance: string; // kN/m
  slidingFOS: string;

  // Bearing
  verticalLoad: string; // kN/m
  eccentricity: string; // m
  effectiveWidth: string; // m
  maxBearing: string; // kPa
  minBearing: string; // kPa
  bearingFOS: string;

  // Internal Stability
  interBaseSlidingFOS: string; // between courses
  internalOverturningFOS: string;

  // Mesh Capacity
  meshTensileStrength: string; // kN/m
  meshUtil: string; // %

  overallStatus: string;
  governingCheck: string;
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
 * Build a ReportData object from Gabion Wall calculator results
 */
export function buildGabionWallReport(
  formData: GabionWallFormData,
  results: GabionWallResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Gabion Retaining Wall Design',
    projectName: options.projectName || 'Gabion Wall Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `GAB-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Gabion Retaining Wall',
    designCodes: ['BS EN 1997-1:2004', 'BS 8002:2015', 'Maccaferri Guidelines'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Gabion wall: ${formData.wallHeight}m high, ${formData.numberOfCourses} courses.
    Base ${formData.baseWidth}m, top ${formData.topWidth}m (${formData.batter}° batter).
    ${formData.gabionType} with ${formData.stoneSize}mm stone fill.
    Backfill φ' = ${formData.backfillPhi}°, surcharge ${formData.surcharge}kPa.`,
    keyResults: [
      { label: 'Height', value: `${formData.wallHeight} m` },
      {
        label: 'FOS Overturn',
        value: results.overturningFOS,
        highlight: parseFloat(results.overturningFOS) < 2.0,
      },
      {
        label: 'FOS Sliding',
        value: results.slidingFOS,
        highlight: parseFloat(results.slidingFOS) < 1.5,
      },
      { label: 'FOS Bearing', value: results.bearingFOS },
      { label: 'Max Bearing', value: `${results.maxBearing} kPa` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `Overturn: FOS ${results.overturningFOS}, Sliding: FOS ${results.slidingFOS}`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Wall Geometry',
        parameters: [
          { name: 'Total Height', value: formData.wallHeight, unit: 'm' },
          { name: 'Number of Courses', value: formData.numberOfCourses },
          { name: 'Course Height', value: formData.courseHeight, unit: 'mm' },
          { name: 'Base Width', value: formData.baseWidth, unit: 'm' },
          { name: 'Top Width', value: formData.topWidth, unit: 'm' },
          { name: 'Batter Angle', value: formData.batter, unit: '°' },
        ],
      },
      {
        title: 'Gabion Properties',
        parameters: [
          { name: 'Type', value: formData.gabionType },
          { name: 'Mesh Size', value: formData.meshSize, unit: 'mm' },
          { name: 'Wire Diameter', value: formData.wireDiameter, unit: 'mm' },
          { name: 'Stone Size', value: formData.stoneSize, unit: 'mm' },
          { name: 'Stone Density', value: formData.stoneDensity, unit: 'kN/m³' },
          { name: 'Porosity', value: formData.gabionPorosity, unit: '%' },
          { name: 'Effective Density', value: results.effectiveDensity, unit: 'kN/m³' },
        ],
      },
      {
        title: 'Backfill Properties',
        parameters: [
          { name: 'Unit Weight γ', value: formData.backfillGamma, unit: 'kN/m³' },
          { name: "Friction Angle φ'", value: formData.backfillPhi, unit: '°' },
          { name: "Cohesion c'", value: formData.backfillCohesion, unit: 'kPa' },
          { name: 'Slope Angle', value: formData.backfillSlope, unit: '°' },
        ],
      },
      {
        title: 'Foundation',
        parameters: [
          { name: 'Allowable Bearing', value: formData.foundationBearing, unit: 'kPa' },
          { name: "Foundation φ'", value: formData.foundationFriction, unit: '°' },
          { name: 'Passive Included', value: formData.passiveIncluded },
          { name: 'Embedment', value: formData.embedmentDepth, unit: 'm' },
        ],
      },
      {
        title: 'Loading & Drainage',
        parameters: [
          { name: 'Surcharge', value: formData.surcharge, unit: 'kPa' },
          { name: 'Drainage', value: formData.drainageProvided },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'External Stability - Overturning',
      description: 'EC7 Cl.9.5',
      checks: [
        {
          name: 'Overturning Moment',
          formula: 'Mo = Pa × ha + Ps × hs',
          calculated: `${results.overturningMoment} kNm/m`,
          limit: 'Destabilizing',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Resisting Moment',
          formula: 'Mr = W × xw + Pp × hp',
          calculated: `${results.resistingMoment} kNm/m`,
          limit: 'Stabilizing',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'FOS Overturning',
          formula: 'FOS = Mr / Mo ≥ 2.0',
          calculated: results.overturningFOS,
          limit: '≥ 2.0',
          utilisation: 2.0 / parseFloat(results.overturningFOS),
          status: parseFloat(results.overturningFOS) >= 2.0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'External Stability - Sliding',
      description: 'EC7 Cl.9.5',
      checks: [
        {
          name: 'Horizontal Force',
          formula: 'H = Pa,h + Ps,h',
          calculated: `${results.horizontalForce} kN/m`,
          limit: 'Driving',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Sliding Resistance',
          formula: 'R = (W + Pa,v) × tanδb + Pp',
          calculated: `${results.slidingResistance} kN/m`,
          limit: 'Resisting',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'FOS Sliding',
          formula: 'FOS = R / H ≥ 1.5',
          calculated: results.slidingFOS,
          limit: '≥ 1.5',
          utilisation: 1.5 / parseFloat(results.slidingFOS),
          status: parseFloat(results.slidingFOS) >= 1.5 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'External Stability - Bearing',
      description: 'EC7 Cl.6.5',
      checks: [
        {
          name: 'Eccentricity',
          formula: 'e = (Mr - Mo) / V',
          calculated: `${results.eccentricity} m`,
          limit: `B/6 = ${(parseFloat(formData.baseWidth) / 6).toFixed(3)} m`,
          utilisation: parseFloat(results.eccentricity) / (parseFloat(formData.baseWidth) / 6),
          status:
            parseFloat(results.eccentricity) <= parseFloat(formData.baseWidth) / 6
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Maximum Bearing',
          formula: 'qmax = V/B′ × (1 + 6e/B)',
          calculated: `${results.maxBearing} kPa`,
          limit: `qa = ${formData.foundationBearing} kPa`,
          utilisation: parseFloat(results.maxBearing) / parseFloat(formData.foundationBearing),
          status:
            parseFloat(results.maxBearing) <= parseFloat(formData.foundationBearing)
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Minimum Bearing',
          formula: 'qmin ≥ 0 (no tension)',
          calculated: `${results.minBearing} kPa`,
          limit: '≥ 0',
          utilisation: 0,
          status: parseFloat(results.minBearing) >= 0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Internal Stability',
      description: 'Between gabion courses',
      checks: [
        {
          name: 'Inter-course Sliding',
          formula: 'FOS at each interface',
          calculated: results.interBaseSlidingFOS,
          limit: '≥ 1.5',
          utilisation: 1.5 / parseFloat(results.interBaseSlidingFOS),
          status: parseFloat(results.interBaseSlidingFOS) >= 1.5 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Internal Overturning',
          formula: 'About toe of upper courses',
          calculated: results.internalOverturningFOS,
          limit: '≥ 2.0',
          utilisation: 2.0 / parseFloat(results.internalOverturningFOS),
          status: parseFloat(results.internalOverturningFOS) >= 2.0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Mesh Strength',
      description: 'Gabion cage capacity',
      checks: [
        {
          name: 'Tensile Strength',
          formula: 'From mesh specification',
          calculated: `${results.meshTensileStrength} kN/m`,
          limit: 'Mesh capacity',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Mesh Utilisation',
          formula: 'Tension / Capacity × 100',
          calculated: `${results.meshUtil}%`,
          limit: '100%',
          utilisation: parseFloat(results.meshUtil) / 100,
          status: parseFloat(results.meshUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Gabion Wall Weight',
      steps: [
        {
          description: 'Effective unit weight',
          formula: 'γeff = γstone × (1 - porosity/100)',
          substitution: `γeff = ${formData.stoneDensity} × (1 - ${formData.gabionPorosity}/100)`,
          result: `γeff = ${results.effectiveDensity} kN/m³`,
        },
        {
          description: 'Wall cross-section area',
          formula: 'A = H × (B_base + B_top) / 2',
          result: `Trapezoidal section`,
        },
        {
          description: 'Wall weight',
          formula: 'W = A × γeff × 1m length',
          result: `W = ${results.wallWeight} kN/m`,
        },
        {
          description: 'Centroid from toe',
          formula: 'For trapezoid',
          result: `xw = ${results.centroidX} m`,
        },
      ],
    },
    {
      title: 'Earth Pressures',
      steps: [
        {
          description: 'Active coefficient',
          formula: 'Ka = (1 - sinφ)/(1 + sinφ)',
          substitution: `Ka = (1 - sin${formData.backfillPhi}°)/(1 + sin${formData.backfillPhi}°)`,
          result: `Ka = ${results.Ka}`,
        },
        {
          description: 'Active force',
          formula: 'Pa = 0.5 × Ka × γ × H²',
          result: `Pa = ${results.activeForce} kN/m at ${results.activeArm}m`,
        },
        {
          description: 'Surcharge force',
          formula: 'Ps = Ka × q × H',
          result: `Ps = ${results.surchargeForce} kN/m`,
        },
        {
          description: 'Passive coefficient',
          formula: 'Kp = (1 + sinφ)/(1 - sinφ)',
          result: `Kp = ${results.Kp}`,
        },
      ],
    },
    {
      title: 'Overturning Check',
      steps: [
        {
          description: 'Overturning moment',
          formula: 'Mo = Pa × H/3 + Ps × H/2',
          result: `Mo = ${results.overturningMoment} kNm/m`,
        },
        {
          description: 'Resisting moment',
          formula: 'Mr = W × xw',
          substitution: `Mr = ${results.wallWeight} × ${results.centroidX}`,
          result: `Mr = ${results.resistingMoment} kNm/m`,
        },
        {
          description: 'Factor of safety',
          formula: 'FOS = Mr / Mo',
          result: `FOS = ${results.overturningFOS}`,
        },
      ],
    },
    {
      title: 'Sliding Check',
      steps: [
        {
          description: 'Base friction angle',
          formula: 'δb = 2φ/3 (rough base)',
          result: `δb = ${((2 * parseFloat(formData.foundationFriction)) / 3).toFixed(1)}°`,
        },
        {
          description: 'Horizontal force',
          formula: 'H = Pa × cos(δ) + Ps',
          result: `H = ${results.horizontalForce} kN/m`,
        },
        {
          description: 'Sliding resistance',
          formula: 'R = V × tan(δb)',
          result: `R = ${results.slidingResistance} kN/m`,
        },
        {
          description: 'Factor of safety',
          formula: 'FOS = R / H',
          result: `FOS = ${results.slidingFOS}`,
        },
      ],
    },
    {
      title: 'Bearing Pressure',
      steps: [
        {
          description: 'Vertical load',
          formula: 'V = W + Pa,v',
          result: `V = ${results.verticalLoad} kN/m`,
        },
        {
          description: 'Eccentricity',
          formula: 'e = B/2 - (Mr - Mo)/V',
          result: `e = ${results.eccentricity} m`,
        },
        {
          description: 'Effective width',
          formula: 'B′ = B - 2e',
          result: `B′ = ${results.effectiveWidth} m`,
        },
        {
          description: 'Bearing pressure',
          formula: 'q = V/B × (1 ± 6e/B)',
          result: `qmax = ${results.maxBearing} kPa, qmin = ${results.minBearing} kPa`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (formData.drainageProvided === 'No') {
    reportWarnings.push({
      type: 'warning',
      message: 'No drainage - consider hydrostatic pressure or provide drainage',
    });
  }

  if (parseFloat(results.minBearing) < 0) {
    reportWarnings.push({
      type: 'error',
      message: 'Tension at base - increase wall width or batter',
    });
  }

  if (parseFloat(formData.gabionPorosity) > 40) {
    reportWarnings.push({
      type: 'warning',
      message: 'High porosity - ensure proper stone packing',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `Gabion wall ${formData.wallHeight}m high is ADEQUATE.
         ${formData.numberOfCourses} courses of ${formData.courseHeight}mm gabions.
         FOS Overturning = ${results.overturningFOS} ≥ 2.0.
         FOS Sliding = ${results.slidingFOS} ≥ 1.5.
         Max bearing = ${results.maxBearing}kPa ≤ ${formData.foundationBearing}kPa.`
        : `Gabion wall FAILS. ${results.governingCheck} governs.`,
    status: overallStatus,
    recommendations: [
      `Base width: ${formData.baseWidth}m, Top width: ${formData.topWidth}m`,
      `Use ${formData.stoneSize}mm stone with ${formData.gabionType}`,
      `Effective density: ${results.effectiveDensity} kN/m³`,
      formData.drainageProvided === 'Yes'
        ? 'Drainage provided behind wall'
        : 'Provide drainage layer behind wall',
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
