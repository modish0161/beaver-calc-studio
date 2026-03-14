// ============================================================================
// BeaverCalc Studio — Crane Pad Foundation Report Data Builder
// Outrigger Pad & Crane Base Design to EC7
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
 * Form data from the Crane Pad calculator
 */
export interface CranePadFormData {
  // Crane Details
  craneType: string; // Mobile, Tower, Crawler
  craneModel: string;
  maxCapacity: string; // tonnes
  outriggerLoad: string; // kN (maximum per outrigger)

  // Outrigger Configuration
  numberOfOutriggers: string;
  outriggerSpacing: string; // m
  padSize: string; // mm (if using mats)

  // Ground Conditions
  groundType: string; // Made ground, Clay, Sand, Gravel, Rock
  allowableBearing: string; // kPa
  groundwaterDepth: string; // m

  // Existing Surface
  surfaceType: string; // Hardstanding, Grass, Gravel, Compacted
  surfaceThickness: string; // mm (concrete/asphalt)

  // Spreading Arrangement
  spreadingType: string; // Timber mats, Steel plates, Concrete pad, Outrigger only
  matThickness: string; // mm
  matWidth: string; // mm
  matLength: string; // mm
  numberOfMats: string;

  // Steel Plate (if used)
  plateThickness: string; // mm
  plateWidth: string; // mm
  plateLength: string; // mm
  steelGrade: string;

  // Load Factors
  dynamicFactor: string; // 1.1-1.3
  contingencyFactor: string;
}

/**
 * Results from the Crane Pad calculator
 */
export interface CranePadResults {
  // Applied Load
  factoredLoad: string; // kN
  loadPerMat: string; // kN

  // Contact Area
  outriggerFootArea: string; // m²
  effectiveSpreadArea: string; // m²
  spreadAngle: string; // degrees (typically 45°)

  // Bearing Check
  appliedBearing: string; // kPa
  allowableBearing: string; // kPa
  bearingUtil: string; // %
  bearingFOS: string;

  // Mat/Plate Bending
  bendingMoment: string; // kNm/m
  requiredThickness: string; // mm
  providedThickness: string; // mm
  bendingUtil: string; // %

  // Shear Check
  shearForce: string; // kN/m
  shearCapacity: string; // kN/m
  shearUtil: string; // %

  // Punching Check
  punchingPerimeter: string; // mm
  punchingStress: string; // MPa
  punchingCapacity: string; // MPa
  punchingUtil: string; // %

  // Settlement
  immediateSettlement: string; // mm
  totalSettlement: string; // mm
  differentialSettlement: string; // mm

  // Timber Mat Properties (if applicable)
  timberGrade: string;
  timberBendingStrength: string; // MPa
  timberShearStrength: string; // MPa

  // Summary
  totalMatArea: string; // m²
  loadSpreadFactor: string;

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
 * Build a ReportData object from Crane Pad calculator results
 */
export function buildCranePadReport(
  formData: CranePadFormData,
  results: CranePadResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Crane Pad Foundation Design',
    projectName: options.projectName || 'Crane Foundation Assessment',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `CRP-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Crane Pad Design',
    designCodes: ['BS EN 1997-1:2004', 'BS 7121', 'CIRIA C703'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.craneType} crane (${formData.craneModel}) outrigger foundation.
    Max outrigger load ${formData.outriggerLoad}kN on ${formData.groundType}.
    ${formData.spreadingType} spreading arrangement.
    Allowable bearing ${formData.allowableBearing}kPa.`,
    keyResults: [
      { label: 'Outrigger Load', value: `${formData.outriggerLoad} kN` },
      { label: 'Spreading', value: formData.spreadingType },
      { label: 'Applied Bearing', value: `${results.appliedBearing} kPa` },
      {
        label: 'Bearing Util',
        value: `${results.bearingUtil}%`,
        highlight: parseFloat(results.bearingUtil) > 80,
      },
      { label: 'Mat/Plate Util', value: `${results.bendingUtil}%` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `Bearing: ${results.bearingUtil}%, Bending: ${results.bendingUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Crane Details',
        parameters: [
          { name: 'Crane Type', value: formData.craneType },
          { name: 'Model', value: formData.craneModel },
          { name: 'Max Capacity', value: formData.maxCapacity, unit: 'tonnes' },
          { name: 'Outrigger Load (max)', value: formData.outriggerLoad, unit: 'kN' },
          { name: 'Number of Outriggers', value: formData.numberOfOutriggers },
          { name: 'Outrigger Spacing', value: formData.outriggerSpacing, unit: 'm' },
        ],
      },
      {
        title: 'Ground Conditions',
        parameters: [
          { name: 'Ground Type', value: formData.groundType },
          { name: 'Allowable Bearing qa', value: formData.allowableBearing, unit: 'kPa' },
          {
            name: 'Groundwater Depth',
            value: formData.groundwaterDepth || 'Not encountered',
            unit: formData.groundwaterDepth ? 'm' : '',
          },
          { name: 'Surface Type', value: formData.surfaceType },
          { name: 'Surface Thickness', value: formData.surfaceThickness, unit: 'mm' },
        ],
      },
      {
        title: 'Spreading Arrangement',
        parameters: [
          { name: 'Spreading Type', value: formData.spreadingType },
          ...(formData.spreadingType.includes('Timber')
            ? [
                { name: 'Mat Thickness', value: formData.matThickness, unit: 'mm' },
                { name: 'Mat Width', value: formData.matWidth, unit: 'mm' },
                { name: 'Mat Length', value: formData.matLength, unit: 'mm' },
                { name: 'Number of Mats', value: formData.numberOfMats },
              ]
            : []),
          ...(formData.spreadingType.includes('Steel')
            ? [
                { name: 'Plate Thickness', value: formData.plateThickness, unit: 'mm' },
                { name: 'Plate Width', value: formData.plateWidth, unit: 'mm' },
                { name: 'Plate Length', value: formData.plateLength, unit: 'mm' },
                { name: 'Steel Grade', value: formData.steelGrade },
              ]
            : []),
        ],
      },
      {
        title: 'Load Factors',
        parameters: [
          { name: 'Dynamic Factor', value: formData.dynamicFactor },
          { name: 'Contingency Factor', value: formData.contingencyFactor },
          { name: 'Factored Load', value: results.factoredLoad, unit: 'kN' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Bearing Capacity Check',
      description: 'EC7 / BS 7121',
      checks: [
        {
          name: 'Effective Spread Area',
          formula: 'A = (Outrigger + 2×t×tan45°)²',
          calculated: `${results.effectiveSpreadArea} m²`,
          limit: 'At ground level',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Applied Bearing Pressure',
          formula: 'q = P / A',
          calculated: `${results.appliedBearing} kPa`,
          limit: `qa = ${results.allowableBearing} kPa`,
          utilisation: parseFloat(results.bearingUtil) / 100,
          status: parseFloat(results.bearingUtil) <= 100 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Bearing FOS',
          formula: 'FOS = qa / q',
          calculated: results.bearingFOS,
          limit: '≥ 1.0',
          utilisation: 1.0 / parseFloat(results.bearingFOS),
          status: parseFloat(results.bearingFOS) >= 1.0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Mat/Plate Bending',
      description: 'Structural check',
      checks: [
        {
          name: 'Bending Moment',
          formula: 'M = q × a² / 8 (cantilever from outrigger)',
          calculated: `${results.bendingMoment} kNm/m`,
          limit: 'Maximum in mat',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Required Thickness',
          formula: 't_req = √(6M / fb)',
          calculated: `${results.requiredThickness} mm`,
          limit: `t_prov = ${results.providedThickness} mm`,
          utilisation:
            parseFloat(results.requiredThickness) / parseFloat(results.providedThickness),
          status:
            parseFloat(results.providedThickness) >= parseFloat(results.requiredThickness)
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
      title: 'Shear Check',
      description: 'At critical section',
      checks: [
        {
          name: 'Shear Force',
          formula: 'V = q × a (at face of outrigger)',
          calculated: `${results.shearForce} kN/m`,
          limit: `VRd = ${results.shearCapacity} kN/m`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: parseFloat(results.shearUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Punching Check',
      description: 'At outrigger foot',
      checks: [
        {
          name: 'Punching Perimeter',
          formula: 'u = π × (d_foot + 2×d)',
          calculated: `${results.punchingPerimeter} mm`,
          limit: 'Control perimeter',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Punching Stress',
          formula: 'v = P / (u × d)',
          calculated: `${results.punchingStress} MPa`,
          limit: `vRd = ${results.punchingCapacity} MPa`,
          utilisation: parseFloat(results.punchingUtil) / 100,
          status: parseFloat(results.punchingUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Settlement',
      description: 'Serviceability check',
      checks: [
        {
          name: 'Immediate Settlement',
          formula: 'δi = q × B × (1-ν²) / E × If',
          calculated: `${results.immediateSettlement} mm`,
          limit: 'Short-term',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Total Settlement',
          formula: 'δtotal = δi + δc',
          calculated: `${results.totalSettlement} mm`,
          limit: '≤ 25mm typically',
          utilisation: parseFloat(results.totalSettlement) / 25,
          status: parseFloat(results.totalSettlement) <= 25 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Differential',
          formula: 'Δδ between outriggers',
          calculated: `${results.differentialSettlement} mm`,
          limit: '≤ 15mm for crane stability',
          utilisation: parseFloat(results.differentialSettlement) / 15,
          status: parseFloat(results.differentialSettlement) <= 15 ? 'PASS' : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Load Calculation',
      steps: [
        {
          description: 'Maximum outrigger load',
          formula: 'From crane manufacturer',
          result: `P = ${formData.outriggerLoad} kN`,
        },
        {
          description: 'Dynamic amplification',
          formula: 'P_dyn = P × γdyn',
          substitution: `P_dyn = ${formData.outriggerLoad} × ${formData.dynamicFactor}`,
          result: `P_dyn = ${(parseFloat(formData.outriggerLoad) * parseFloat(formData.dynamicFactor)).toFixed(1)} kN`,
        },
        {
          description: 'Factored load',
          formula: 'P_f = P_dyn × γcontingency',
          result: `P_f = ${results.factoredLoad} kN`,
        },
      ],
    },
    {
      title: 'Load Spread',
      steps: [
        {
          description: 'Outrigger foot area',
          formula: 'A_foot = d² or π×d²/4',
          result: `A_foot = ${results.outriggerFootArea} m²`,
        },
        {
          description: 'Spread angle',
          formula: 'Typically 45° through mat/plate',
          result: `θ = ${results.spreadAngle}°`,
        },
        {
          description: 'Effective area at ground',
          formula: 'A_eff = (d_foot + 2×t×tanθ)²',
          result: `A_eff = ${results.effectiveSpreadArea} m²`,
        },
        {
          description: 'Load spread factor',
          formula: 'A_eff / A_foot',
          result: `Factor = ${results.loadSpreadFactor}`,
        },
      ],
    },
    {
      title: 'Bearing Pressure',
      steps: [
        {
          description: 'Applied pressure',
          formula: 'q = P / A_eff',
          substitution: `q = ${results.factoredLoad} / ${results.effectiveSpreadArea}`,
          result: `q = ${results.appliedBearing} kPa`,
        },
        {
          description: 'Allowable pressure',
          formula: 'From ground investigation',
          result: `qa = ${results.allowableBearing} kPa`,
        },
        {
          description: 'Utilisation',
          formula: 'q / qa × 100',
          result: `${results.bearingUtil}%`,
        },
      ],
    },
    ...(formData.spreadingType.includes('Timber')
      ? [
          {
            title: 'Timber Mat Design',
            steps: [
              {
                description: 'Timber grade',
                formula: 'As specified',
                result: `Grade: ${results.timberGrade}`,
              },
              {
                description: 'Bending strength',
                formula: 'fm,k from BS EN 338',
                result: `fm = ${results.timberBendingStrength} MPa`,
              },
              {
                description: 'Shear strength',
                formula: 'fv,k from BS EN 338',
                result: `fv = ${results.timberShearStrength} MPa`,
              },
              {
                description: 'Required thickness',
                formula: 't = √(6M / fm)',
                result: `t_req = ${results.requiredThickness} mm`,
              },
            ],
          },
        ]
      : []),
    ...(formData.spreadingType.includes('Steel')
      ? [
          {
            title: 'Steel Plate Design',
            steps: [
              {
                description: 'Steel grade',
                formula: formData.steelGrade,
                result: `fy = 275 MPa typical`,
              },
              {
                description: 'Plate as beam on elastic foundation',
                formula: 'M = q × a² / 2 (cantilever)',
                result: `M = ${results.bendingMoment} kNm/m`,
              },
              {
                description: 'Required thickness',
                formula: 't = √(6M×γM0 / (fy×1000))',
                result: `t_req = ${results.requiredThickness} mm`,
              },
            ],
          },
        ]
      : []),
    {
      title: 'Settlement Estimate',
      steps: [
        {
          description: 'Elastic settlement',
          formula: 'δ = q × B × (1-ν²) / E × If',
          result: `δi = ${results.immediateSettlement} mm`,
        },
        {
          description: 'Total settlement',
          formula: 'Including consolidation if applicable',
          result: `δtotal = ${results.totalSettlement} mm`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.groundwaterDepth) && parseFloat(formData.groundwaterDepth) < 2) {
    reportWarnings.push({
      type: 'warning',
      message: 'High groundwater - verify bearing capacity for saturated conditions',
    });
  }

  if (formData.groundType === 'Made ground') {
    reportWarnings.push({
      type: 'warning',
      message: 'Made ground - confirm bearing capacity with site investigation',
    });
  }

  if (parseFloat(results.bearingUtil) > 80) {
    reportWarnings.push({
      type: 'info',
      message: 'High bearing utilisation - consider larger spreading area',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `Crane pad foundation is ADEQUATE.
         ${formData.craneType} (${formData.craneModel}) max outrigger load ${formData.outriggerLoad}kN.
         ${formData.spreadingType} provides effective area ${results.effectiveSpreadArea}m².
         Bearing: ${results.appliedBearing}kPa ≤ ${results.allowableBearing}kPa (${results.bearingUtil}%).
         Mat/plate bending: ${results.bendingUtil}%.
         Settlement: ${results.totalSettlement}mm.`
        : `Crane pad FAILS. ${results.governingCheck} governs.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.spreadingType} as specified`,
      `Minimum spreading area: ${results.effectiveSpreadArea} m²`,
      `Check ground conditions match assumed qa = ${formData.allowableBearing} kPa`,
      `Monitor settlement during crane operation`,
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
