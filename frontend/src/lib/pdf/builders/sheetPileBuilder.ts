// ============================================================================
// BeaverCalc Studio — Sheet Pile Wall Report Data Builder
// Embedded Retaining Wall Design to EC7
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
 * Form data from the Sheet Pile calculator
 */
export interface SheetPileFormData {
  // Wall Configuration
  pileType: string; // Larssen, Arcelor, etc.
  sectionName: string; // LX20, AZ26, etc.
  wallCondition: string; // Cantilever, Propped, Anchored

  // Geometry
  retainedHeight: string; // m
  embedmentDepth: string; // m
  excavationLevel: string; // m OD

  // Prop/Anchor (if applicable)
  propLevel: string; // m below retained surface
  propSpacing: string; // m

  // Retained Side Soil
  soilLayers: string; // JSON array of layers
  retainedPhiPrime: string; // degrees (simplified single layer)
  retainedCohesion: string; // kPa
  retainedGamma: string; // kN/m³

  // Excavated Side Soil
  passivePhiPrime: string; // degrees
  passiveCohesion: string; // kPa
  passiveGamma: string; // kN/m³

  // Water
  retainedWaterLevel: string; // m below ground
  excavatedWaterLevel: string; // m below excavation

  // Surcharges
  uniformSurcharge: string; // kPa
  stripLoad: string; // kN/m
  stripLoadWidth: string; // m
  stripLoadDistance: string; // m from wall

  // Design Parameters
  designApproach: string; // DA1-1, DA1-2, DA2
  wallFrictionRatio: string; // δ/φ' ratio
  unplannedExcavation: string; // m
}

/**
 * Results from the Sheet Pile calculator
 */
export interface SheetPileResults {
  // Section Properties
  sectionModulus: string; // cm³/m
  momentOfInertia: string; // cm⁴/m
  steelGrade: string;
  fy: string; // MPa

  // Earth Pressure Coefficients
  Ka: string;
  Kp: string;
  Kam: string; // mobilized active
  Kpm: string; // mobilized passive
  delta: string; // degrees

  // Earth Pressures (at key depths)
  activeAtBase: string; // kPa
  passiveAtBase: string; // kPa
  netPressure: string; // kPa

  // Embedment Design
  requiredEmbedment: string; // m
  providedEmbedment: string; // m
  embedmentFOS: string;

  // Prop/Anchor Force (if applicable)
  propForce: string; // kN/m
  anchorDesignLoad: string; // kN per anchor

  // Structural
  maxBendingMoment: string; // kNm/m
  bendingMomentLocation: string; // m below top
  maxShear: string; // kN/m
  requiredModulus: string; // cm³/m
  providedModulus: string; // cm³/m
  bendingUtil: string; // %

  // Deflection
  maxDeflection: string; // mm
  deflectionLocation: string; // m below top

  // Wall Stability
  rotationalStability: string; // FOS
  verticalEquilibrium: string; // kN/m (net vertical)
  kickoutCheck: string; // PASS/FAIL

  // SLS
  slsMoment: string; // kNm/m
  slsDeflection: string; // mm

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
 * Build a ReportData object from Sheet Pile calculator results
 */
export function buildSheetPileReport(
  formData: SheetPileFormData,
  results: SheetPileResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  const isPropped = formData.wallCondition !== 'Cantilever';

  // Build meta
  const meta = {
    title: 'Sheet Pile Wall Design',
    projectName: options.projectName || 'Embedded Wall Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `SPW-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Sheet Pile Wall',
    designCodes: ['BS EN 1997-1:2004', 'CIRIA C580', 'UK NA', 'BS EN 1993-5'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.wallCondition} sheet pile wall: ${formData.sectionName}.
    Retained height ${formData.retainedHeight}m, embedment ${formData.embedmentDepth}m.
    ${formData.designApproach} design approach.
    ${isPropped ? `Prop at ${formData.propLevel}m depth, ${formData.propSpacing}m spacing.` : 'Cantilever design.'}`,
    keyResults: [
      { label: 'Section', value: formData.sectionName },
      { label: 'Max Moment', value: `${results.maxBendingMoment} kNm/m` },
      {
        label: 'Bending Util',
        value: `${results.bendingUtil}%`,
        highlight: parseFloat(results.bendingUtil) > 90,
      },
      { label: 'Embedment FOS', value: results.embedmentFOS },
      {
        label: isPropped ? 'Prop Force' : 'Deflection',
        value: isPropped ? `${results.propForce} kN/m` : `${results.maxDeflection} mm`,
      },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `Bending: ${results.bendingUtil}%, FOS embedment: ${results.embedmentFOS}`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Wall Configuration',
        parameters: [
          { name: 'Pile Type', value: formData.pileType },
          { name: 'Section', value: formData.sectionName },
          { name: 'Wall Condition', value: formData.wallCondition },
          { name: 'Section Modulus Wel', value: results.sectionModulus, unit: 'cm³/m' },
          { name: 'Moment of Inertia I', value: results.momentOfInertia, unit: 'cm⁴/m' },
          { name: 'Steel Grade', value: results.steelGrade },
          { name: 'fy', value: results.fy, unit: 'MPa' },
        ],
      },
      {
        title: 'Geometry',
        parameters: [
          { name: 'Retained Height H', value: formData.retainedHeight, unit: 'm' },
          { name: 'Embedment Depth D', value: formData.embedmentDepth, unit: 'm' },
          {
            name: 'Total Length',
            value: (
              parseFloat(formData.retainedHeight) + parseFloat(formData.embedmentDepth)
            ).toFixed(2),
            unit: 'm',
          },
          { name: 'Excavation Level', value: formData.excavationLevel, unit: 'm OD' },
          { name: 'Unplanned Excavation', value: formData.unplannedExcavation, unit: 'm' },
        ],
      },
      ...(isPropped
        ? [
            {
              title: 'Prop/Anchor',
              parameters: [
                { name: 'Prop Level', value: formData.propLevel, unit: 'm below GL' },
                { name: 'Prop Spacing', value: formData.propSpacing, unit: 'm' },
                { name: 'Prop Force', value: results.propForce, unit: 'kN/m' },
                { name: 'Anchor Load', value: results.anchorDesignLoad, unit: 'kN/anchor' },
              ],
            },
          ]
        : []),
      {
        title: 'Retained Side Soil',
        parameters: [
          { name: "φ'", value: formData.retainedPhiPrime, unit: '°' },
          { name: "c'", value: formData.retainedCohesion, unit: 'kPa' },
          { name: 'γ', value: formData.retainedGamma, unit: 'kN/m³' },
          { name: 'Water Level', value: formData.retainedWaterLevel, unit: 'm below GL' },
        ],
      },
      {
        title: 'Excavated Side Soil',
        parameters: [
          { name: "φ'", value: formData.passivePhiPrime, unit: '°' },
          { name: "c'", value: formData.passiveCohesion, unit: 'kPa' },
          { name: 'γ', value: formData.passiveGamma, unit: 'kN/m³' },
          { name: 'Water Level', value: formData.excavatedWaterLevel, unit: 'm below exc.' },
        ],
      },
      {
        title: 'Surcharges',
        parameters: [
          { name: 'Uniform Surcharge', value: formData.uniformSurcharge, unit: 'kPa' },
          { name: 'Strip Load', value: formData.stripLoad, unit: 'kN/m' },
          { name: 'Strip Width', value: formData.stripLoadWidth, unit: 'm' },
          { name: 'Strip Distance', value: formData.stripLoadDistance, unit: 'm' },
        ],
      },
      {
        title: 'Design Parameters',
        parameters: [
          { name: 'Design Approach', value: formData.designApproach },
          { name: "Wall Friction δ/φ'", value: formData.wallFrictionRatio },
          { name: 'Ka', value: results.Ka },
          { name: 'Kp', value: results.Kp },
          { name: 'δ', value: results.delta, unit: '°' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Embedment Depth',
      description: 'EC7 Cl.9.7 / CIRIA C580',
      checks: [
        {
          name: 'Required Embedment',
          formula: 'From limit equilibrium analysis',
          calculated: `${results.requiredEmbedment} m`,
          limit: 'For rotational stability',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Provided Embedment',
          formula: 'With safety factor',
          calculated: `${results.providedEmbedment} m`,
          limit: `D_req × FOS = ${results.requiredEmbedment} m`,
          utilisation:
            parseFloat(results.requiredEmbedment) / parseFloat(results.providedEmbedment),
          status:
            parseFloat(results.providedEmbedment) >= parseFloat(results.requiredEmbedment)
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Embedment FOS',
          formula: 'D_provided / D_limit equilibrium',
          calculated: results.embedmentFOS,
          limit: '≥ 1.2',
          utilisation: 1.2 / parseFloat(results.embedmentFOS),
          status: parseFloat(results.embedmentFOS) >= 1.2 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Rotational Stability',
      description: 'EC7 GEO limit state',
      checks: [
        {
          name: 'Rotational FOS',
          formula: 'Moment resistance / Overturning moment',
          calculated: results.rotationalStability,
          limit: '≥ 1.0 (factored)',
          utilisation: 1.0 / parseFloat(results.rotationalStability),
          status: parseFloat(results.rotationalStability) >= 1.0 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Kickout Check',
          formula: 'Base stability for propped wall',
          calculated: results.kickoutCheck,
          limit: 'PASS',
          utilisation: 0,
          status: results.kickoutCheck === 'PASS' ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Bending Resistance',
      description: 'BS EN 1993-5',
      checks: [
        {
          name: 'Maximum Moment',
          formula: 'From structural analysis',
          calculated: `${results.maxBendingMoment} kNm/m`,
          limit: `At ${results.bendingMomentLocation}m depth`,
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Required Modulus',
          formula: 'Wel,req = MEd × γM0 / fy',
          calculated: `${results.requiredModulus} cm³/m`,
          limit: `Wel,prov = ${results.providedModulus} cm³/m`,
          utilisation: parseFloat(results.requiredModulus) / parseFloat(results.providedModulus),
          status:
            parseFloat(results.providedModulus) >= parseFloat(results.requiredModulus)
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Bending Utilisation',
          formula: 'MEd / MRd × 100',
          calculated: `${results.bendingUtil}%`,
          limit: '100%',
          utilisation: parseFloat(results.bendingUtil) / 100,
          status: parseFloat(results.bendingUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Shear Resistance',
      description: 'BS EN 1993-5',
      checks: [
        {
          name: 'Maximum Shear',
          formula: 'From structural analysis',
          calculated: `${results.maxShear} kN/m`,
          limit: 'At prop/excavation level',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    ...(isPropped
      ? [
          {
            title: 'Prop Force',
            description: 'Support reaction',
            checks: [
              {
                name: 'Prop Force',
                formula: 'From equilibrium',
                calculated: `${results.propForce} kN/m`,
                limit: `Every ${formData.propSpacing}m`,
                utilisation: 0,
                status: 'PASS' as const,
              },
              {
                name: 'Design Anchor Load',
                formula: 'F × spacing',
                calculated: `${results.anchorDesignLoad} kN`,
                limit: 'Per anchor',
                utilisation: 0,
                status: 'PASS' as const,
              },
            ],
          },
        ]
      : []),
    {
      title: 'Deflection (SLS)',
      description: 'Serviceability check',
      checks: [
        {
          name: 'Maximum Deflection',
          formula: 'From elastic analysis',
          calculated: `${results.maxDeflection} mm`,
          limit: `At ${results.deflectionLocation}m depth`,
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'SLS Moment',
          formula: 'Characteristic loads',
          calculated: `${results.slsMoment} kNm/m`,
          limit: 'For deflection calc',
          utilisation: 0,
          status: 'PASS',
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
          description: 'Active coefficient',
          formula: 'Ka from Coulomb or tables',
          substitution: `φ' = ${formData.retainedPhiPrime}°, δ = ${results.delta}°`,
          result: `Ka = ${results.Ka}`,
        },
        {
          description: 'Passive coefficient',
          formula: 'Kp from Coulomb or tables (with δ)',
          substitution: `φ' = ${formData.passivePhiPrime}°, δ = ${results.delta}°`,
          result: `Kp = ${results.Kp}`,
        },
        {
          description: 'Wall friction',
          formula: `δ = ${formData.wallFrictionRatio} × φ'`,
          result: `δ = ${results.delta}°`,
        },
      ],
    },
    {
      title: 'Earth Pressures',
      steps: [
        {
          description: 'Active at base of embedment',
          formula: 'σa = Ka × (γ × z + q) - 2c√Ka',
          result: `σa = ${results.activeAtBase} kPa`,
        },
        {
          description: 'Passive at base of embedment',
          formula: 'σp = Kp × γ × z + 2c√Kp',
          result: `σp = ${results.passiveAtBase} kPa`,
        },
        {
          description: 'Net pressure diagram',
          formula: 'σp - σa considering factored values',
          result: `Net = ${results.netPressure} kPa`,
        },
      ],
    },
    {
      title: 'Structural Analysis',
      steps: [
        {
          description: 'Maximum bending moment',
          formula: isPropped ? 'From prop + embedment reaction' : 'Cantilever moment at fixity',
          result: `Mmax = ${results.maxBendingMoment} kNm/m at ${results.bendingMomentLocation}m`,
        },
        {
          description: 'Maximum shear',
          formula: 'At prop/anchor level',
          result: `Vmax = ${results.maxShear} kN/m`,
        },
        ...(isPropped
          ? [
              {
                description: 'Prop force',
                formula: 'Equilibrium of horizontal forces',
                result: `F = ${results.propForce} kN/m`,
              },
            ]
          : []),
      ],
    },
    {
      title: 'Section Check',
      steps: [
        {
          description: 'Moment resistance',
          formula: 'MRd = Wel × fy / γM0',
          substitution: `MRd = ${results.providedModulus} × ${results.fy} / (1.0 × 1000)`,
          result: `MRd = ${((parseFloat(results.providedModulus) * parseFloat(results.fy)) / 1000).toFixed(1)} kNm/m`,
        },
        {
          description: 'Required modulus',
          formula: 'Wel,req = MEd / (fy/γM0)',
          result: `Wel,req = ${results.requiredModulus} cm³/m`,
        },
        {
          description: 'Utilisation',
          formula: 'Wel,req / Wel,prov',
          result: `${results.bendingUtil}%`,
        },
      ],
    },
    {
      title: 'Deflection',
      steps: [
        {
          description: 'Beam on elastic foundation or FE',
          formula: 'δ from integration of M/EI',
          result: `δmax = ${results.maxDeflection}mm at ${results.deflectionLocation}m`,
        },
        {
          description: 'SLS check',
          formula: 'Characteristic loads',
          result: `δ = ${results.slsDeflection}mm`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.unplannedExcavation) < 0.5) {
    reportWarnings.push({
      type: 'warning',
      message: 'Consider 0.5m unplanned excavation per CIRIA C580',
    });
  }

  if (parseFloat(results.maxDeflection) > 50) {
    reportWarnings.push({
      type: 'warning',
      message: 'Large deflection - check adjacent structures and services',
    });
  }

  if (formData.wallCondition === 'Cantilever' && parseFloat(formData.retainedHeight) > 4) {
    reportWarnings.push({
      type: 'info',
      message: 'Cantilever > 4m - consider propped solution for economy',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.sectionName} sheet pile wall is ADEQUATE.
         ${formData.wallCondition} wall, H = ${formData.retainedHeight}m, D = ${formData.embedmentDepth}m.
         Mmax = ${results.maxBendingMoment}kNm/m, utilisation = ${results.bendingUtil}%.
         FOS embedment = ${results.embedmentFOS}.
         ${isPropped ? `Prop force = ${results.propForce}kN/m.` : ''}`
        : `Sheet pile wall FAILS. ${results.governingCheck} governs.`,
    status: overallStatus,
    recommendations: [
      `Section: ${formData.sectionName}, Wel = ${results.providedModulus} cm³/m`,
      `Total length: ${(parseFloat(formData.retainedHeight) + parseFloat(formData.embedmentDepth)).toFixed(1)}m`,
      isPropped ? `Prop at ${formData.propLevel}m: ${results.propForce} kN/m` : 'Cantilever design',
      `Max deflection: ${results.maxDeflection}mm at ${results.deflectionLocation}m`,
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
