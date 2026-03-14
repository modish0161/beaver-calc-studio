// ============================================================================
// BeaverCalc Studio — Negative Skin Friction Report Data Builder
// Pile Downdrag Analysis (Dragload)
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
 * Form data from the Negative Skin Friction calculator
 */
export interface NegativeSkinFrictionFormData {
  // Pile Properties
  pileType: string;
  pileDiameter: string;
  pileLength: string;
  pileEmbedment: string;
  numberOfPiles: string;

  // Soil Layers
  fillThickness: string;
  fillDensity: string;
  fillSettlement: string;

  compressibleThickness: string;
  compressibleDensity: string;
  compressibleCu: string;
  compressibleSettlement: string;

  bearingLayerDensity: string;
  bearingLayerFriction: string;

  // Neutral Plane
  neutralPlaneMethod: string;

  // Loading
  deadLoad: string;
  liveLoad: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Negative Skin Friction calculator
 */
export interface NegativeSkinFrictionResults {
  // Pile Geometry
  pilePerimeter: string;
  pileArea: string;
  embedInBearing: string;

  // Negative Friction
  nsfFill: string;
  nsfCompressible: string;
  totalNSF: string;
  nsfPerPile: string;

  // Positive Friction
  positiveFriction: string;
  endBearing: string;
  totalCapacity: string;

  // Neutral Plane
  neutralPlaneDepth: string;
  neutralPlaneMethod: string;

  // Dragload
  maxDragload: string;
  dragloadRatio: string;

  // Structural Check
  totalAxialLoad: string;
  pileCapacity: string;
  structuralUtil: string;
  structuralStatus: string;

  // Settlement Check
  pileSettlement: string;
  settleStatus: string;

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
 * Build a ReportData object from Negative Skin Friction calculator results
 */
export function buildNegativeSkinFrictionReport(
  formData: NegativeSkinFrictionFormData,
  results: NegativeSkinFrictionResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [results.structuralStatus, results.settleStatus];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'Negative Skin Friction (Downdrag) Analysis',
    projectName: options.projectName || formData.projectTitle || 'NSF Analysis',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `NSF-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Negative Skin Friction',
    designCodes: ['Eurocode 7', 'BS 8004', 'Tomlinson Pile Design'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Negative skin friction (downdrag) analysis for ${formData.numberOfPiles}nr ${formData.pileDiameter}mm 
    ${formData.pileType} piles through ${formData.fillThickness}m fill and ${formData.compressibleThickness}m 
    compressible stratum. Neutral plane located at ${results.neutralPlaneDepth}m depth.`,
    keyResults: [
      { label: 'Pile Diameter', value: `${formData.pileDiameter} mm` },
      { label: 'Pile Length', value: `${formData.pileLength} m` },
      { label: 'Total NSF (Dragload)', value: `${results.totalNSF} kN`, highlight: true },
      { label: 'Neutral Plane', value: `${results.neutralPlaneDepth} m` },
      { label: 'Structural Utilisation', value: `${results.structuralUtil}%` },
    ],
    overallStatus,
    governingCheck: parseFloat(results.structuralUtil) > 80 ? 'Structural Capacity' : 'Settlement',
    utilisationSummary: `Peak utilisation: ${results.structuralUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Pile Properties',
        parameters: [
          { name: 'Pile Type', value: formData.pileType },
          { name: 'Pile Diameter', value: formData.pileDiameter, unit: 'mm' },
          { name: 'Pile Length', value: formData.pileLength, unit: 'm' },
          { name: 'Embedment in Bearing Layer', value: formData.pileEmbedment, unit: 'm' },
          { name: 'Number of Piles', value: formData.numberOfPiles },
        ],
      },
      {
        title: 'Fill Layer',
        parameters: [
          { name: 'Fill Thickness', value: formData.fillThickness, unit: 'm' },
          { name: 'Fill Density', value: formData.fillDensity, unit: 'kN/m³' },
          { name: 'Fill Settlement', value: formData.fillSettlement, unit: 'mm' },
        ],
      },
      {
        title: 'Compressible Layer',
        parameters: [
          { name: 'Thickness', value: formData.compressibleThickness, unit: 'm' },
          { name: 'Density', value: formData.compressibleDensity, unit: 'kN/m³' },
          { name: 'Undrained Shear Strength', value: formData.compressibleCu, unit: 'kPa' },
          { name: 'Expected Settlement', value: formData.compressibleSettlement, unit: 'mm' },
        ],
      },
      {
        title: 'Bearing Layer & Loading',
        parameters: [
          { name: 'Bearing Layer Density', value: formData.bearingLayerDensity, unit: 'kN/m³' },
          { name: 'Bearing Layer Friction', value: formData.bearingLayerFriction, unit: '°' },
          { name: 'Dead Load', value: formData.deadLoad, unit: 'kN' },
          { name: 'Live Load', value: formData.liveLoad, unit: 'kN' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Structural Capacity Check',
      description: 'Check pile can carry applied load + dragload',
      checks: [
        {
          name: 'Total Axial Load',
          formula: 'P_total = P_applied + NSF',
          calculated: `${results.totalAxialLoad} kN`,
          limit: `≤ ${results.pileCapacity} kN`,
          utilisation: parseFloat(results.structuralUtil) / 100,
          status: results.structuralStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Geotechnical Capacity Check',
      description: 'Check pile capacity below neutral plane',
      checks: [
        {
          name: 'Available Resistance',
          formula: 'R = Q_s,positive + Q_b',
          calculated: `${results.totalCapacity} kN`,
          limit: `≥ P_applied + NSF`,
          utilisation: parseFloat(results.totalAxialLoad) / parseFloat(results.totalCapacity),
          status:
            parseFloat(results.totalCapacity) >= parseFloat(results.totalAxialLoad)
              ? 'PASS'
              : 'FAIL',
        },
      ],
    },
    {
      title: 'Settlement Check',
      description: 'Check pile settlement is acceptable',
      checks: [
        {
          name: 'Pile Settlement',
          formula: 'δ_pile ≤ δ_allowable',
          calculated: `${results.pileSettlement} mm`,
          limit: '≤ 25 mm',
          utilisation: parseFloat(results.pileSettlement) / 25,
          status: results.settleStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Pile Geometry',
      steps: [
        {
          description: 'Pile perimeter',
          formula: 'P = π × D',
          substitution: `P = π × ${parseFloat(formData.pileDiameter) / 1000}`,
          result: `${results.pilePerimeter} m`,
        },
        {
          description: 'Pile base area',
          formula: 'A = π × D² / 4',
          result: `${results.pileArea} m²`,
        },
        {
          description: 'Embedment in bearing stratum',
          formula: 'L_embed = L_pile - H_fill - H_compress',
          result: `${results.embedInBearing} m`,
        },
      ],
    },
    {
      title: 'Neutral Plane Location',
      steps: [
        {
          description: 'Method used',
          formula: results.neutralPlaneMethod,
          result: `Neutral plane at ${results.neutralPlaneDepth} m`,
        },
        {
          description: 'Equilibrium condition',
          formula: 'Q_applied + NSF = Q_s,pos + Q_b',
          result: 'Forces balanced at neutral plane',
        },
      ],
    },
    {
      title: 'Negative Skin Friction Calculation',
      steps: [
        {
          description: 'NSF through fill layer',
          formula: "NSF_fill = β × σ'v,avg × P × H_fill",
          result: `${results.nsfFill} kN`,
        },
        {
          description: 'NSF through compressible layer',
          formula: 'NSF_comp = α × Cu × P × H_comp (or β method)',
          result: `${results.nsfCompressible} kN`,
        },
        {
          description: 'Total negative skin friction',
          formula: 'NSF_total = NSF_fill + NSF_comp',
          result: `${results.totalNSF} kN`,
        },
      ],
    },
    {
      title: 'Positive Resistance Calculation',
      steps: [
        {
          description: 'Positive shaft friction (below neutral plane)',
          formula: "Q_s = α × Cu × P × L_embed (cohesive) or β × σ'v × P × L (granular)",
          result: `${results.positiveFriction} kN`,
        },
        {
          description: 'End bearing',
          formula: "Q_b = Nc × Cu × Ab (cohesive) or Nq × σ'v × Ab (granular)",
          result: `${results.endBearing} kN`,
        },
        {
          description: 'Total geotechnical capacity',
          formula: 'R = Q_s + Q_b',
          result: `${results.totalCapacity} kN`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.dragloadRatio) > 0.5) {
    reportWarnings.push({
      type: 'warning',
      message: `Dragload is ${(parseFloat(results.dragloadRatio) * 100).toFixed(0)}% of applied load - significant`,
    });
  }

  if (parseFloat(formData.compressibleSettlement) > 100) {
    reportWarnings.push({
      type: 'info',
      message: 'Large ground settlement - consider preloading or ground improvement',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The pile design is ADEQUATE for negative skin friction effects. Maximum dragload 
         of ${results.totalNSF} kN develops above the neutral plane at ${results.neutralPlaneDepth}m depth.
         Structural utilisation is ${results.structuralUtil}%.`
        : `The pile design is INADEQUATE for negative skin friction effects. Consider deeper 
         piles, larger diameter, or reducing consolidating strata.`,
    status: overallStatus,
    recommendations: [
      'Apply bitumen slip coating if dragload exceeds 30% of capacity',
      'Monitor ground settlement during construction',
      'Consider staged loading to allow consolidation',
      'Verify neutral plane depth with consolidation analysis',
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
