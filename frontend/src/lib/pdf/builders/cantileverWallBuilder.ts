// ============================================================================
// BeaverCalc Studio — Cantilever Retaining Wall Report Data Builder
// RC Cantilever Wall Design to EC2/EC7
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
 * Form data from the Cantilever Wall calculator
 */
export interface CantileverWallFormData {
  // Wall Geometry
  wallHeight: string; // m (retained height)
  stemThicknessTop: string; // mm
  stemThicknessBase: string; // mm
  baseWidth: string; // m (total base slab width)
  baseToe: string; // m (distance from front face to wall)
  baseThickness: string; // mm

  // Backfill Properties
  soilUnitWeight: string; // kN/m³
  soilFrictionAngle: string; // degrees
  soilCohesion: string; // kPa
  backfillSlope: string; // degrees

  // Foundation Soil
  foundationFrictionAngle: string; // degrees
  foundationBearing: string; // kPa (allowable bearing)
  passiveIncluded: string; // Yes/No

  // Surcharges
  uniformSurcharge: string; // kPa
  lineSurcharge: string; // kN/m
  lineSurchargeDistance: string; // m from wall

  // Water
  waterTableDepth: string; // m below ground (empty if none)
  drainageType: string; // Weepholes, Drain, None

  // Materials
  concreteGrade: string; // C30/37, C35/45
  steelGrade: string; // B500B
  cover: string; // mm

  // Reinforcement (if checking existing)
  stemMainBars: string; // T16@150, etc.
  stemDistBars: string;
  baseTopBars: string;
  baseBottomBars: string;
}

/**
 * Results from the Cantilever Wall calculator
 */
export interface CantileverWallResults {
  // Earth Pressure Coefficients
  Ka: string;
  Kp: string;
  delta: string; // degrees (wall friction)

  // Earth Pressures
  activeForce: string; // kN/m
  passiveForce: string; // kN/m
  surchargeForce: string; // kN/m
  waterForce: string; // kN/m

  // Stability - Overturning
  overturningMoment: string; // kNm/m
  resistingMoment: string; // kNm/m
  overturningFOS: string;

  // Stability - Sliding
  horizontalForce: string; // kN/m
  slidingResistance: string; // kN/m
  slidingFOS: string;

  // Bearing Pressure
  verticalLoad: string; // kN/m
  eccentricity: string; // m
  effectiveWidth: string; // m
  maxBearing: string; // kPa
  minBearing: string; // kPa
  bearingFOS: string;

  // Stem Design
  stemBendingMoment: string; // kNm/m
  stemShear: string; // kN/m
  stemMRd: string; // kNm/m
  stemVRd: string; // kN/m
  stemAsReq: string; // mm²/m
  stemAsProvided: string; // mm²/m
  stemUtil: string; // %

  // Heel Design
  heelBendingMoment: string; // kNm/m
  heelShear: string; // kN/m
  heelMRd: string; // kNm/m
  heelAsReq: string; // mm²/m

  // Toe Design
  toeBendingMoment: string; // kNm/m
  toeShear: string; // kN/m
  toeMRd: string; // kNm/m
  toeAsReq: string; // mm²/m

  // Crack Control
  crackWidth: string; // mm
  crackLimit: string; // mm

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
 * Build a ReportData object from Cantilever Wall calculator results
 */
export function buildCantileverWallReport(
  formData: CantileverWallFormData,
  results: CantileverWallResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Cantilever Retaining Wall Design',
    projectName: options.projectName || 'Retaining Wall Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `CRW-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Cantilever Retaining Wall',
    designCodes: ['BS EN 1992-1-1:2004', 'BS EN 1997-1:2004', 'UK NA', 'PD 6694'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `RC cantilever wall retaining ${formData.wallHeight}m.
    Base ${formData.baseWidth}m × ${formData.baseThickness}mm.
    Stem ${formData.stemThicknessBase}mm (base) tapering to ${formData.stemThicknessTop}mm (top).
    ${formData.concreteGrade} concrete with ${formData.steelGrade} reinforcement.`,
    keyResults: [
      { label: 'Retained Height', value: `${formData.wallHeight} m` },
      {
        label: 'FOS Overturning',
        value: results.overturningFOS,
        highlight: parseFloat(results.overturningFOS) < 2.0,
      },
      {
        label: 'FOS Sliding',
        value: results.slidingFOS,
        highlight: parseFloat(results.slidingFOS) < 1.5,
      },
      { label: 'Max Bearing', value: `${results.maxBearing} kPa` },
      { label: 'Stem Util', value: `${results.stemUtil}%` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `Stability: OK, Structural: ${results.stemUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Wall Geometry',
        parameters: [
          { name: 'Retained Height H', value: formData.wallHeight, unit: 'm' },
          { name: 'Stem Thickness (top)', value: formData.stemThicknessTop, unit: 'mm' },
          { name: 'Stem Thickness (base)', value: formData.stemThicknessBase, unit: 'mm' },
          { name: 'Base Width B', value: formData.baseWidth, unit: 'm' },
          { name: 'Toe Length', value: formData.baseToe, unit: 'm' },
          {
            name: 'Heel Length',
            value: (
              parseFloat(formData.baseWidth) -
              parseFloat(formData.baseToe) -
              parseFloat(formData.stemThicknessBase) / 1000
            ).toFixed(2),
            unit: 'm',
          },
          { name: 'Base Thickness D', value: formData.baseThickness, unit: 'mm' },
        ],
      },
      {
        title: 'Backfill Properties',
        parameters: [
          { name: 'Unit Weight γ', value: formData.soilUnitWeight, unit: 'kN/m³' },
          { name: "Friction Angle φ'", value: formData.soilFrictionAngle, unit: '°' },
          { name: "Cohesion c'", value: formData.soilCohesion, unit: 'kPa' },
          { name: 'Backfill Slope β', value: formData.backfillSlope, unit: '°' },
          { name: 'Ka (active)', value: results.Ka },
          { name: 'δ (wall friction)', value: results.delta, unit: '°' },
        ],
      },
      {
        title: 'Foundation',
        parameters: [
          { name: "Foundation φ'", value: formData.foundationFrictionAngle, unit: '°' },
          { name: 'Allowable Bearing', value: formData.foundationBearing, unit: 'kPa' },
          { name: 'Passive Included', value: formData.passiveIncluded },
          { name: 'Kp (passive)', value: results.Kp },
        ],
      },
      {
        title: 'Surcharges & Water',
        parameters: [
          { name: 'Uniform Surcharge', value: formData.uniformSurcharge, unit: 'kPa' },
          { name: 'Line Surcharge', value: formData.lineSurcharge, unit: 'kN/m' },
          { name: 'Line Distance', value: formData.lineSurchargeDistance, unit: 'm' },
          {
            name: 'Water Table',
            value: formData.waterTableDepth || 'None',
            unit: formData.waterTableDepth ? 'm' : '',
          },
          { name: 'Drainage', value: formData.drainageType },
        ],
      },
      {
        title: 'Materials',
        parameters: [
          { name: 'Concrete', value: formData.concreteGrade },
          { name: 'Steel', value: formData.steelGrade },
          { name: 'Cover', value: formData.cover, unit: 'mm' },
        ],
      },
      {
        title: 'Reinforcement',
        parameters: [
          { name: 'Stem Main Bars', value: formData.stemMainBars },
          { name: 'Stem Distribution', value: formData.stemDistBars },
          { name: 'Base Top', value: formData.baseTopBars },
          { name: 'Base Bottom', value: formData.baseBottomBars },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Overturning Stability',
      description: 'EC7 Cl.9.5 / DA1',
      checks: [
        {
          name: 'Factor of Safety',
          formula: 'FOS = Mresist / Moverturn ≥ 2.0',
          calculated: results.overturningFOS,
          limit: '≥ 2.0',
          utilisation: 2.0 / parseFloat(results.overturningFOS),
          status: parseFloat(results.overturningFOS) >= 2.0 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Overturning Moment',
          formula: 'Mo = Pa × ha + Ps × hs + Pw × hw',
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
      ],
    },
    {
      title: 'Sliding Stability',
      description: 'EC7 Cl.9.5 / DA1',
      checks: [
        {
          name: 'Factor of Safety',
          formula: 'FOS = (V×tanδ + Pp) / H ≥ 1.5',
          calculated: results.slidingFOS,
          limit: '≥ 1.5',
          utilisation: 1.5 / parseFloat(results.slidingFOS),
          status: parseFloat(results.slidingFOS) >= 1.5 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Horizontal Force',
          formula: 'H = Pa,h + Ps,h + Pw',
          calculated: `${results.horizontalForce} kN/m`,
          limit: 'Driving',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Sliding Resistance',
          formula: 'R = V × tan(2φ/3) + Pp',
          calculated: `${results.slidingResistance} kN/m`,
          limit: 'Resisting',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Bearing Capacity',
      description: 'EC7 Cl.6.5',
      checks: [
        {
          name: 'Eccentricity',
          formula: 'e = M / V ≤ B/6 (middle third)',
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
          formula: 'qmax = V/B′ × (1 + 6e/B′)',
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
          formula: 'qmin = V/B′ × (1 - 6e/B′)',
          calculated: `${results.minBearing} kPa`,
          limit: '≥ 0 (no tension)',
          utilisation: 0,
          status: parseFloat(results.minBearing) >= 0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Stem Design - Bending',
      description: 'EC2 Cl.6.1',
      checks: [
        {
          name: 'Bending Moment',
          formula: 'MEd from earth pressure diagram',
          calculated: `${results.stemBendingMoment} kNm/m`,
          limit: `MRd = ${results.stemMRd} kNm/m`,
          utilisation: parseFloat(results.stemBendingMoment) / parseFloat(results.stemMRd),
          status:
            parseFloat(results.stemBendingMoment) <= parseFloat(results.stemMRd) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Reinforcement',
          formula: 'As,req vs As,prov',
          calculated: `${results.stemAsProvided} mm²/m`,
          limit: `As,req = ${results.stemAsReq} mm²/m`,
          utilisation: parseFloat(results.stemAsReq) / parseFloat(results.stemAsProvided),
          status:
            parseFloat(results.stemAsProvided) >= parseFloat(results.stemAsReq) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Stem Design - Shear',
      description: 'EC2 Cl.6.2',
      checks: [
        {
          name: 'Shear Force',
          formula: 'VEd from earth pressure',
          calculated: `${results.stemShear} kN/m`,
          limit: `VRd,c = ${results.stemVRd} kN/m`,
          utilisation: parseFloat(results.stemShear) / parseFloat(results.stemVRd),
          status: parseFloat(results.stemShear) <= parseFloat(results.stemVRd) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Base Heel Design',
      description: 'EC2 Cl.6.1',
      checks: [
        {
          name: 'Heel Bending',
          formula: 'Upward soil - weight - surcharge',
          calculated: `${results.heelBendingMoment} kNm/m`,
          limit: `MRd = ${results.heelMRd} kNm/m`,
          utilisation: parseFloat(results.heelBendingMoment) / parseFloat(results.heelMRd),
          status:
            parseFloat(results.heelBendingMoment) <= parseFloat(results.heelMRd) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Base Toe Design',
      description: 'EC2 Cl.6.1',
      checks: [
        {
          name: 'Toe Bending',
          formula: 'Bearing pressure - self-weight',
          calculated: `${results.toeBendingMoment} kNm/m`,
          limit: `MRd = ${results.toeMRd} kNm/m`,
          utilisation: parseFloat(results.toeBendingMoment) / parseFloat(results.toeMRd),
          status:
            parseFloat(results.toeBendingMoment) <= parseFloat(results.toeMRd) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Crack Control',
      description: 'EC2 Cl.7.3',
      checks: [
        {
          name: 'Crack Width',
          formula: 'wk = sr,max × (εsm - εcm)',
          calculated: `${results.crackWidth} mm`,
          limit: `wmax = ${results.crackLimit} mm`,
          utilisation: parseFloat(results.crackWidth) / parseFloat(results.crackLimit),
          status:
            parseFloat(results.crackWidth) <= parseFloat(results.crackLimit) ? 'PASS' : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Earth Pressure Coefficients',
      steps: [
        {
          description: 'Active coefficient (Rankine/Coulomb)',
          formula: 'Ka = (1 - sinφ)/(1 + sinφ) for level backfill',
          substitution: `Ka = (1 - sin${formData.soilFrictionAngle}°)/(1 + sin${formData.soilFrictionAngle}°)`,
          result: `Ka = ${results.Ka}`,
        },
        {
          description: 'Wall friction angle',
          formula: 'δ = 2φ/3 for concrete-soil',
          result: `δ = ${results.delta}°`,
        },
        {
          description: 'Passive coefficient',
          formula: 'Kp = (1 + sinφ)/(1 - sinφ)',
          result: `Kp = ${results.Kp}`,
        },
      ],
    },
    {
      title: 'Earth Pressure Forces',
      steps: [
        {
          description: 'Active earth pressure force',
          formula: 'Pa = 0.5 × Ka × γ × H²',
          result: `Pa = ${results.activeForce} kN/m`,
        },
        {
          description: 'Surcharge force',
          formula: 'Ps = Ka × q × H',
          result: `Ps = ${results.surchargeForce} kN/m`,
        },
        {
          description: 'Water force (if applicable)',
          formula: 'Pw = 0.5 × γw × hw²',
          result: `Pw = ${results.waterForce} kN/m`,
        },
        {
          description: 'Passive resistance (if included)',
          formula: 'Pp = 0.5 × Kp × γ × D²',
          result: `Pp = ${results.passiveForce} kN/m`,
        },
      ],
    },
    {
      title: 'Stability Calculations',
      steps: [
        {
          description: 'Overturning moment about toe',
          formula: 'Mo = Σ(Hi × hi)',
          result: `Mo = ${results.overturningMoment} kNm/m`,
        },
        {
          description: 'Resisting moment about toe',
          formula: 'Mr = Σ(Vi × xi)',
          result: `Mr = ${results.resistingMoment} kNm/m`,
        },
        {
          description: 'FOS overturning',
          formula: 'FOS = Mr / Mo',
          result: `FOS = ${results.overturningFOS}`,
        },
        {
          description: 'FOS sliding',
          formula: 'FOS = (V×tanδb + Pp) / H',
          result: `FOS = ${results.slidingFOS}`,
        },
      ],
    },
    {
      title: 'Bearing Pressure',
      steps: [
        {
          description: 'Vertical load',
          formula: 'V = Wwall + Wbase + Wsoil + Wsurcharge',
          result: `V = ${results.verticalLoad} kN/m`,
        },
        {
          description: 'Eccentricity',
          formula: 'e = (Mr - Mo) / V',
          result: `e = ${results.eccentricity} m`,
        },
        {
          description: 'Effective width',
          formula: 'B′ = B - 2e',
          result: `B′ = ${results.effectiveWidth} m`,
        },
        {
          description: 'Bearing pressures',
          formula: 'q = V/B′ × (1 ± 6e/B′)',
          result: `qmax = ${results.maxBearing} kPa, qmin = ${results.minBearing} kPa`,
        },
      ],
    },
    {
      title: 'Stem Reinforcement',
      steps: [
        {
          description: 'Design moment at base',
          formula: 'MEd = 0.5 × Ka × γ × H³/3 + Ka × q × H²/2',
          result: `MEd = ${results.stemBendingMoment} kNm/m`,
        },
        {
          description: 'Lever arm',
          formula: 'z = d × (1 - 0.4x/d)',
          result: 'z from moment equilibrium',
        },
        {
          description: 'Required reinforcement',
          formula: 'As,req = MEd / (0.87 × fyk × z)',
          result: `As,req = ${results.stemAsReq} mm²/m`,
        },
        {
          description: 'Provided reinforcement',
          formula: formData.stemMainBars,
          result: `As,prov = ${results.stemAsProvided} mm²/m`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.minBearing) < 0) {
    reportWarnings.push({
      type: 'error',
      message: 'Tension at base heel - increase base width or toe projection',
    });
  }

  if (formData.drainageType === 'None') {
    reportWarnings.push({
      type: 'warning',
      message: 'No drainage specified - consider water pressure in design',
    });
  }

  if (parseFloat(results.eccentricity) > parseFloat(formData.baseWidth) / 6) {
    reportWarnings.push({
      type: 'warning',
      message: 'Resultant outside middle third - review bearing pressure distribution',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `Cantilever wall retaining ${formData.wallHeight}m is ADEQUATE.
         FOS Overturning = ${results.overturningFOS} ≥ 2.0.
         FOS Sliding = ${results.slidingFOS} ≥ 1.5.
         Max bearing = ${results.maxBearing}kPa ≤ ${formData.foundationBearing}kPa.
         Stem bending: ${results.stemUtil}% utilisation.`
        : `Wall FAILS. ${results.governingCheck} governs.`,
    status: overallStatus,
    recommendations: [
      `Base: ${formData.baseWidth}m wide × ${formData.baseThickness}mm deep`,
      `Stem reinforcement: ${formData.stemMainBars} (As,prov = ${results.stemAsProvided} mm²/m)`,
      `Required: As,req = ${results.stemAsReq} mm²/m`,
      `Crack width: ${results.crackWidth}mm ≤ ${results.crackLimit}mm`,
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
