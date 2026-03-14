// ============================================================================
// BeaverCalc Studio — Soil Nail Report Data Builder
// Soil Nail Wall Design to BS 8006/BS 8081/CIRIA C637
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
 * Form data from the Soil Nail calculator
 */
export interface SoilNailFormData {
  // Wall Geometry
  cutHeight: string; // m
  wallAngle: string; // degrees from vertical (typically 0-15°)
  groundSlope: string; // degrees above crest

  // Nail Pattern
  nailSpacingH: string; // m horizontal
  nailSpacingV: string; // m vertical
  nailInclination: string; // degrees below horizontal (typically 10-20°)
  nailLength: string; // m

  // Nail Properties
  nailDiameter: string; // mm (bar diameter)
  drillHoleDiameter: string; // mm
  groutStrength: string; // MPa (fck)
  steelGrade: string; // Rebar grade (B500B, etc.)

  // Soil Properties
  soilGamma: string; // kN/m³
  soilPhi: string; // degrees (effective)
  soilCohesion: string; // kPa (effective)
  soilNailBond: string; // kPa (ultimate grout-soil bond)

  // Facing
  facingType: string; // Shotcrete, Mesh, Precast panels
  facingThickness: string; // mm
  facingReinforcement: string; // Mesh size or bars

  // Design Parameters
  designApproach: string; // DA1-C1, DA1-C2, DA2*, DA3
  surcharge: string; // kPa
  waterLevel: string; // None, At crest, Mid-height, Drained
}

/**
 * Results from the Soil Nail calculator
 */
export interface SoilNailResults {
  // Nail Design
  nailYield: string; // kN (bar tensile capacity)
  nailPullout: string; // kN (grout-soil bond capacity)
  nailDesignCapacity: string; // kN (governing)

  // Global Stability
  globalFOS: string;
  criticalSlipAngle: string; // degrees
  drivingForce: string; // kN/m
  resistingForce: string; // kN/m
  nailContribution: string; // kN/m

  // Internal Stability
  internalFOS: string;
  maxTensileForce: string; // kN/nail
  tensileUtil: string; // %

  // Facing Design
  facingMoment: string; // kNm/m
  facingShear: string; // kN/m
  punchingShear: string; // kN (at nail head)
  facingUtil: string; // %

  // Serviceability
  maxWallDeflection: string; // mm
  topDeflection: string; // mm

  // Nail Schedule
  totalNails: string;
  nailRows: string;
  nailsPerRow: string;

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
 * Build a ReportData object from Soil Nail calculator results
 */
export function buildSoilNailReport(
  formData: SoilNailFormData,
  results: SoilNailResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Soil Nail Wall Design',
    projectName: options.projectName || 'Soil Nail Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `SNL-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Soil Nail Wall',
    designCodes: [
      'BS 8006-2:2011',
      'BS 8081:2015',
      'CIRIA C637',
      'FHWA-NHI-14-007',
      'BS EN 1997-1',
    ],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Soil nail wall: ${formData.cutHeight}m cut height.
    Nail pattern: ${formData.nailSpacingH}m × ${formData.nailSpacingV}m at ${formData.nailInclination}°.
    Nail length ${formData.nailLength}m, Ø${formData.nailDiameter}mm bars.
    Soil: φ' = ${formData.soilPhi}°, c' = ${formData.soilCohesion}kPa.
    ${formData.facingType} facing ${formData.facingThickness}mm thick.`,
    keyResults: [
      { label: 'Cut Height', value: `${formData.cutHeight} m` },
      {
        label: 'Global FOS',
        value: results.globalFOS,
        highlight: parseFloat(results.globalFOS) < 1.3,
      },
      { label: 'Internal FOS', value: results.internalFOS },
      { label: 'Tensile Util.', value: `${results.tensileUtil}%` },
      { label: 'Nail Capacity', value: `${results.nailDesignCapacity} kN` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `Global FOS: ${results.globalFOS}, Tensile: ${results.tensileUtil}% utilised`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Wall Geometry',
        parameters: [
          { name: 'Cut Height', value: formData.cutHeight, unit: 'm' },
          { name: 'Wall Angle', value: formData.wallAngle, unit: '° from vert' },
          { name: 'Ground Slope', value: formData.groundSlope, unit: '°' },
        ],
      },
      {
        title: 'Nail Pattern',
        parameters: [
          { name: 'Horizontal Spacing', value: formData.nailSpacingH, unit: 'm' },
          { name: 'Vertical Spacing', value: formData.nailSpacingV, unit: 'm' },
          { name: 'Inclination', value: formData.nailInclination, unit: '° below horiz' },
          { name: 'Length', value: formData.nailLength, unit: 'm' },
        ],
      },
      {
        title: 'Nail Properties',
        parameters: [
          { name: 'Bar Diameter', value: formData.nailDiameter, unit: 'mm' },
          { name: 'Drill Hole', value: formData.drillHoleDiameter, unit: 'mm' },
          { name: 'Grout fck', value: formData.groutStrength, unit: 'MPa' },
          { name: 'Steel Grade', value: formData.steelGrade },
        ],
      },
      {
        title: 'Soil Properties',
        parameters: [
          { name: 'Unit Weight γ', value: formData.soilGamma, unit: 'kN/m³' },
          { name: "Friction Angle φ'", value: formData.soilPhi, unit: '°' },
          { name: "Cohesion c'", value: formData.soilCohesion, unit: 'kPa' },
          { name: 'Nail-Soil Bond', value: formData.soilNailBond, unit: 'kPa' },
        ],
      },
      {
        title: 'Facing',
        parameters: [
          { name: 'Type', value: formData.facingType },
          { name: 'Thickness', value: formData.facingThickness, unit: 'mm' },
          { name: 'Reinforcement', value: formData.facingReinforcement },
        ],
      },
      {
        title: 'Design Parameters',
        parameters: [
          { name: 'Design Approach', value: formData.designApproach },
          { name: 'Surcharge', value: formData.surcharge, unit: 'kPa' },
          { name: 'Water Condition', value: formData.waterLevel },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Global Stability',
      description: 'Overall slope stability with nails',
      checks: [
        {
          name: 'Critical Slip Angle',
          formula: 'From limit equilibrium analysis',
          calculated: `${results.criticalSlipAngle}°`,
          limit: 'Critical surface',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Driving Force',
          formula: 'W × sinθ + Q × sinθ',
          calculated: `${results.drivingForce} kN/m`,
          limit: 'Destabilizing',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Soil Resistance',
          formula: 'τ × L (along slip surface)',
          calculated: `${results.resistingForce} kN/m`,
          limit: 'Stabilizing',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Nail Contribution',
          formula: 'ΣTn × cos(θ - α)',
          calculated: `${results.nailContribution} kN/m`,
          limit: 'Additional resistance',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Global FOS',
          formula: 'FOS = (R_soil + R_nail) / D',
          calculated: results.globalFOS,
          limit: '≥ 1.3',
          utilisation: 1.3 / parseFloat(results.globalFOS),
          status: parseFloat(results.globalFOS) >= 1.3 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Nail Internal Stability',
      description: 'Tensile and pullout capacity',
      checks: [
        {
          name: 'Nail Yield Capacity',
          formula: 'Ty = As × fy / γs',
          calculated: `${results.nailYield} kN`,
          limit: 'Tensile strength',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Pullout Capacity',
          formula: 'Tp = π × D × La × τult / γm',
          calculated: `${results.nailPullout} kN`,
          limit: 'Bond capacity',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Design Capacity',
          formula: 'Td = min(Ty, Tp)',
          calculated: `${results.nailDesignCapacity} kN`,
          limit: 'Governing',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Max Tensile Force',
          formula: 'From global analysis',
          calculated: `${results.maxTensileForce} kN`,
          limit: `Td = ${results.nailDesignCapacity} kN`,
          utilisation: parseFloat(results.maxTensileForce) / parseFloat(results.nailDesignCapacity),
          status:
            parseFloat(results.maxTensileForce) <= parseFloat(results.nailDesignCapacity)
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Tensile Utilisation',
          formula: 'Tmax / Td × 100',
          calculated: `${results.tensileUtil}%`,
          limit: '≤ 100%',
          utilisation: parseFloat(results.tensileUtil) / 100,
          status: parseFloat(results.tensileUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Facing Design',
      description: 'Shotcrete/mesh facing adequacy',
      checks: [
        {
          name: 'Facing Moment',
          formula: 'M = Pa × Sv²/10',
          calculated: `${results.facingMoment} kNm/m`,
          limit: 'Facing capacity',
          utilisation: parseFloat(results.facingUtil) / 100,
          status: 'PASS',
        },
        {
          name: 'Facing Shear',
          formula: 'V = Pa × Sv',
          calculated: `${results.facingShear} kN/m`,
          limit: 'Shear capacity',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Punching Shear',
          formula: 'At nail head plate',
          calculated: `${results.punchingShear} kN`,
          limit: 'Punching capacity',
          utilisation: parseFloat(results.facingUtil) / 100,
          status: parseFloat(results.facingUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Serviceability',
      description: 'Wall deformations',
      checks: [
        {
          name: 'Max Wall Deflection',
          formula: 'From stiffness analysis',
          calculated: `${results.maxWallDeflection} mm`,
          limit: 'H/250 typical',
          utilisation:
            parseFloat(results.maxWallDeflection) / ((parseFloat(formData.cutHeight) * 1000) / 250),
          status: 'PASS',
        },
        {
          name: 'Top Deflection',
          formula: 'At crest of wall',
          calculated: `${results.topDeflection} mm`,
          limit: 'Consider adjacent structures',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Nail Tensile Capacity',
      steps: [
        {
          description: 'Bar area',
          formula: 'As = π × d² / 4',
          substitution: `As = π × ${formData.nailDiameter}² / 4`,
          result: `As = ${((Math.PI * Math.pow(parseFloat(formData.nailDiameter), 2)) / 4).toFixed(0)} mm²`,
        },
        {
          description: 'Yield strength',
          formula: 'fy from steel grade',
          result: `fy = 500 MPa (${formData.steelGrade})`,
        },
        {
          description: 'Tensile capacity',
          formula: 'Ty = As × fy / γs',
          substitution: `Ty = As × 500 / 1.15`,
          result: `Ty = ${results.nailYield} kN`,
        },
      ],
    },
    {
      title: 'Nail Pullout Capacity',
      steps: [
        {
          description: 'Grout-soil bond',
          formula: 'τult from tests or correlation',
          result: `τult = ${formData.soilNailBond} kPa`,
        },
        {
          description: 'Anchor length (behind slip)',
          formula: 'La = L - Ls (varies with depth)',
          result: `Average La = ${(parseFloat(formData.nailLength) * 0.6).toFixed(1)} m`,
        },
        {
          description: 'Pullout capacity',
          formula: 'Tp = π × D × La × τult / γm',
          substitution: `Tp = π × ${formData.drillHoleDiameter}/1000 × La × ${formData.soilNailBond} / 1.25`,
          result: `Tp = ${results.nailPullout} kN`,
        },
      ],
    },
    {
      title: 'Global Stability Analysis',
      steps: [
        {
          description: 'Method',
          formula: 'Limit equilibrium - trial slip surfaces',
          result: 'Bishop simplified or Janbu method',
        },
        {
          description: 'Critical slip surface',
          formula: 'Surface with minimum FOS',
          result: `θcrit = ${results.criticalSlipAngle}° from horizontal`,
        },
        {
          description: 'Driving forces',
          formula: 'D = W × sinθ + Q',
          result: `D = ${results.drivingForce} kN/m`,
        },
        {
          description: 'Resisting forces',
          formula: 'R = (c × L + N × tanφ) + ΣT_nail',
          result: `R_soil = ${results.resistingForce} kN/m, R_nail = ${results.nailContribution} kN/m`,
        },
        {
          description: 'Factor of safety',
          formula: 'FOS = R_total / D',
          result: `FOS = ${results.globalFOS}`,
        },
      ],
    },
    {
      title: 'Nail Schedule',
      steps: [
        {
          description: 'Number of rows',
          formula: 'n = (H - offset) / Sv + 1',
          result: `${results.nailRows} rows`,
        },
        {
          description: 'Nails per row',
          formula: 'Depends on wall width and Sh',
          result: `${results.nailsPerRow} nails/row`,
        },
        {
          description: 'Total nails',
          formula: 'Rows × nails/row',
          result: `${results.totalNails} nails total`,
        },
        {
          description: 'Nail specification',
          formula: 'Summary',
          result: `Ø${formData.nailDiameter}mm × ${formData.nailLength}m @ ${formData.nailInclination}°`,
        },
      ],
    },
    {
      title: 'Facing Design',
      steps: [
        {
          description: 'Earth pressure on facing',
          formula: 'pa = Ka × γ × z + Ka × q',
          result: 'Varies with depth',
        },
        {
          description: 'Bending moment',
          formula: 'M = pa × Sv² / 10 (continuous)',
          result: `M = ${results.facingMoment} kNm/m`,
        },
        {
          description: 'Facing thickness',
          formula: 'From shotcrete design',
          result: `t = ${formData.facingThickness} mm, reinf: ${formData.facingReinforcement}`,
        },
        {
          description: 'Punching at nail head',
          formula: 'V = T_nail (at bearing plate)',
          result: `V = ${results.punchingShear} kN`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.nailLength) < parseFloat(formData.cutHeight) * 0.7) {
    reportWarnings.push({
      type: 'warning',
      message: 'Nail length < 0.7H - may need longer nails for global stability',
    });
  }

  if (parseFloat(formData.nailInclination) < 10 || parseFloat(formData.nailInclination) > 20) {
    reportWarnings.push({
      type: 'warning',
      message: 'Nail inclination typically 10-20° for optimal grouting and capacity',
    });
  }

  if (formData.waterLevel !== 'None' && formData.waterLevel !== 'Drained') {
    reportWarnings.push({
      type: 'warning',
      message: 'Water present - ensure adequate drainage provisions',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `Soil nail wall ${formData.cutHeight}m high is ADEQUATE.
         ${results.totalNails} nails: Ø${formData.nailDiameter}mm × ${formData.nailLength}m.
         Pattern: ${formData.nailSpacingH}m H × ${formData.nailSpacingV}m V @ ${formData.nailInclination}°.
         Global FOS = ${results.globalFOS} ≥ 1.3.
         Tensile utilisation = ${results.tensileUtil}%.`
        : `Soil nail wall FAILS. ${results.governingCheck} governs.`,
    status: overallStatus,
    recommendations: [
      `Nail: Ø${formData.nailDiameter}mm ${formData.steelGrade} in Ø${formData.drillHoleDiameter}mm hole`,
      `Grout: fck ≥ ${formData.groutStrength} MPa`,
      `Facing: ${formData.facingThickness}mm ${formData.facingType}`,
      'Carry out proof and suitability tests per BS 8081',
      'Install drainage behind facing',
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
