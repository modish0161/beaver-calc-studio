// ============================================================================
// BeaverCalc Studio — Timber Connections Report Data Builder
// Timber Joint Design to BS EN 1995-1-1 (EC5)
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
 * Form data from the Timber Connections calculator
 */
export interface TimberConnectionsFormData {
  // Connection Type
  connectionType: string; // Bolted, Dowelled, Nailed, Screwed, Nail plate
  loadType: string; // Shear, Axial, Combined

  // Timber Members
  member1Species: string; // C24, C16, GL24h, etc.
  member1Thickness: string; // mm
  member2Species: string;
  member2Thickness: string;
  timberServiceClass: string; // 1, 2, 3
  loadDurationClass: string; // Permanent, Long-term, Medium-term, Short-term, Instantaneous

  // Fastener Details
  fastenerType: string; // Bolt, Dowel, Nail, Screw
  fastenerDiameter: string; // mm
  fastenerLength: string; // mm
  fastenerGrade: string; // 4.6, 8.8 for bolts
  numberOfFasteners: string;
  rowsOfFasteners: string;
  columnsOfFasteners: string;

  // Spacing (EC5 requirements)
  a1: string; // mm - parallel to grain spacing
  a2: string; // mm - perpendicular to grain spacing
  a3t: string; // mm - loaded end distance
  a3c: string; // mm - unloaded end distance
  a4t: string; // mm - loaded edge distance
  a4c: string; // mm - unloaded edge distance

  // Applied Forces
  shearForce: string; // kN
  axialForce: string; // kN
  angleToGrain: string; // degrees
}

/**
 * Results from the Timber Connections calculator
 */
export interface TimberConnectionsResults {
  // Material Properties
  rhok: string; // Characteristic density
  fhk: string; // Embedment strength
  MyRk: string; // Yield moment of fastener

  // Modification Factors
  kmod: string;
  gammaMtimber: string;
  gammaMconnection: string;

  // Single Fastener Capacity
  FvRkSingle: string; // Characteristic capacity
  FvRdSingle: string; // Design capacity
  failureMode: string; // Mode a, b, c, d, e, f, g, h, j, k

  // Connection Capacity
  numberOfShearPlanes: string;
  effectiveNumber: string; // n_eff
  FvRdConnection: string;

  // Applied vs Capacity
  appliedPerFastener: string;
  capacityPerFastener: string;
  fastenerUtil: string;
  fastenerStatus: string;

  // Spacing Check
  minA1: string;
  minA2: string;
  minA3t: string;
  minA3c: string;
  minA4t: string;
  minA4c: string;
  spacingStatus: string;

  // Block Shear / Tear-out
  blockShearCapacity: string;
  blockShearUtil: string;
  blockShearStatus: string;

  // Row Shear
  rowShearCapacity: string;
  rowShearUtil: string;
  rowShearStatus: string;

  // Overall
  governingMode: string;
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
 * Build a ReportData object from Timber Connections calculator results
 */
export function buildTimberConnectionsReport(
  formData: TimberConnectionsFormData,
  results: TimberConnectionsResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Timber Connection Design',
    projectName: options.projectName || 'Timber Connection',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `TC-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Timber Connections',
    designCodes: ['BS EN 1995-1-1:2004', 'UK NA', 'EC5'],
  };

  // Fastener description
  const fastenerDesc =
    formData.fastenerType === 'Bolt' || formData.fastenerType === 'Dowel'
      ? `M${formData.fastenerDiameter} ${formData.fastenerType.toLowerCase()}s`
      : `${formData.fastenerDiameter}mm × ${formData.fastenerLength}mm ${formData.fastenerType.toLowerCase()}s`;

  // Build executive summary
  const executiveSummary = {
    description: `${formData.connectionType} connection: ${formData.numberOfFasteners}No. ${fastenerDesc}.
    ${formData.member1Species} ${formData.member1Thickness}mm to ${formData.member2Species} ${formData.member2Thickness}mm.
    Service Class ${formData.timberServiceClass}, ${formData.loadDurationClass} load duration.`,
    keyResults: [
      { label: 'Fasteners', value: `${formData.numberOfFasteners}No. ${fastenerDesc}` },
      { label: 'Connection Capacity', value: `${results.FvRdConnection} kN`, highlight: true },
      { label: 'Applied Load', value: `${formData.shearForce} kN` },
      { label: 'Utilisation', value: `${results.overallUtil}%` },
      { label: 'Failure Mode', value: results.failureMode },
    ],
    overallStatus,
    governingCheck: results.governingMode,
    utilisationSummary: `${results.overallUtil}% (${results.governingMode})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Connection Configuration',
        parameters: [
          { name: 'Connection Type', value: formData.connectionType },
          { name: 'Load Type', value: formData.loadType },
          { name: 'Angle to Grain', value: formData.angleToGrain, unit: '°' },
        ],
      },
      {
        title: 'Member 1',
        parameters: [
          { name: 'Species/Grade', value: formData.member1Species },
          { name: 'Thickness', value: formData.member1Thickness, unit: 'mm' },
        ],
      },
      {
        title: 'Member 2',
        parameters: [
          { name: 'Species/Grade', value: formData.member2Species },
          { name: 'Thickness', value: formData.member2Thickness, unit: 'mm' },
        ],
      },
      {
        title: 'Service Conditions',
        parameters: [
          { name: 'Service Class', value: formData.timberServiceClass },
          { name: 'Load Duration', value: formData.loadDurationClass },
          { name: 'kmod', value: results.kmod },
        ],
      },
      {
        title: 'Fastener Details',
        parameters: [
          { name: 'Fastener Type', value: formData.fastenerType },
          { name: 'Diameter', value: formData.fastenerDiameter, unit: 'mm' },
          { name: 'Length', value: formData.fastenerLength, unit: 'mm' },
          { name: 'Grade', value: formData.fastenerGrade },
          { name: 'Number', value: formData.numberOfFasteners },
          {
            name: 'Rows × Columns',
            value: `${formData.rowsOfFasteners} × ${formData.columnsOfFasteners}`,
          },
        ],
      },
      {
        title: 'Spacing',
        parameters: [
          { name: 'a₁ (parallel)', value: formData.a1, unit: 'mm' },
          { name: 'a₂ (perpendicular)', value: formData.a2, unit: 'mm' },
          { name: 'a₃,t (loaded end)', value: formData.a3t, unit: 'mm' },
          { name: 'a₃,c (unloaded end)', value: formData.a3c, unit: 'mm' },
          { name: 'a₄,t (loaded edge)', value: formData.a4t, unit: 'mm' },
          { name: 'a₄,c (unloaded edge)', value: formData.a4c, unit: 'mm' },
        ],
      },
      {
        title: 'Applied Forces',
        parameters: [
          { name: 'Shear Force', value: formData.shearForce, unit: 'kN' },
          { name: 'Axial Force', value: formData.axialForce, unit: 'kN' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Spacing Requirements (EC5 Table 8.5)',
      description: 'Minimum fastener spacing',
      checks: [
        {
          name: 'a₁ (parallel to grain)',
          formula: 'Per EC5 Table 8.5',
          calculated: `${formData.a1} mm`,
          limit: `≥ ${results.minA1} mm`,
          utilisation: parseFloat(results.minA1) / parseFloat(formData.a1),
          status: parseFloat(formData.a1) >= parseFloat(results.minA1) ? 'PASS' : 'FAIL',
        },
        {
          name: 'a₂ (perp. to grain)',
          formula: 'Per EC5 Table 8.5',
          calculated: `${formData.a2} mm`,
          limit: `≥ ${results.minA2} mm`,
          utilisation: parseFloat(results.minA2) / parseFloat(formData.a2),
          status: parseFloat(formData.a2) >= parseFloat(results.minA2) ? 'PASS' : 'FAIL',
        },
        {
          name: 'a₃,t (loaded end)',
          formula: 'Per EC5 Table 8.5',
          calculated: `${formData.a3t} mm`,
          limit: `≥ ${results.minA3t} mm`,
          utilisation: parseFloat(results.minA3t) / parseFloat(formData.a3t),
          status: parseFloat(formData.a3t) >= parseFloat(results.minA3t) ? 'PASS' : 'FAIL',
        },
        {
          name: 'a₄,t (loaded edge)',
          formula: 'Per EC5 Table 8.5',
          calculated: `${formData.a4t} mm`,
          limit: `≥ ${results.minA4t} mm`,
          utilisation: parseFloat(results.minA4t) / parseFloat(formData.a4t),
          status: parseFloat(formData.a4t) >= parseFloat(results.minA4t) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Single Fastener Capacity',
      description: 'EC5 Cl.8.2 - Johansen equations',
      checks: [
        {
          name: 'Failure Mode',
          formula: 'Min of modes (a) to (k)',
          calculated: results.failureMode,
          limit: 'Governing mode',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Characteristic Capacity',
          formula: 'Fv,Rk per EC5 Eq.8.6-8.14',
          calculated: `${results.FvRkSingle} kN`,
          limit: 'Unfactored',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Design Capacity',
          formula: 'Fv,Rd = kmod × Fv,Rk / γM',
          calculated: `${results.FvRdSingle} kN`,
          limit: 'Per fastener',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Connection Capacity',
      description: 'Multiple fastener resistance',
      checks: [
        {
          name: 'Effective Number',
          formula: 'nef = n^0.9 × (a₁/13d)^0.25',
          calculated: results.effectiveNumber,
          limit: `n = ${formData.numberOfFasteners}`,
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Connection Resistance',
          formula: 'Fv,Rd,conn = nef × Fv,Rd',
          calculated: `${results.FvRdConnection} kN`,
          limit: `Fed = ${formData.shearForce} kN`,
          utilisation: parseFloat(results.fastenerUtil) / 100,
          status: results.fastenerStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Block Shear',
      description: 'Timber tear-out check',
      checks: [
        {
          name: 'Block Shear Capacity',
          formula: 'Fbs,Rd per EC5 Annex A',
          calculated: `${results.blockShearCapacity} kN`,
          limit: `Fed = ${formData.shearForce} kN`,
          utilisation: parseFloat(results.blockShearUtil) / 100,
          status: results.blockShearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Row Shear',
      description: 'Splitting failure check',
      checks: [
        {
          name: 'Row Shear Capacity',
          formula: 'Fv,90 per EC5 Cl.8.1.4',
          calculated: `${results.rowShearCapacity} kN`,
          limit: `Fed = ${formData.shearForce} kN`,
          utilisation: parseFloat(results.rowShearUtil) / 100,
          status: results.rowShearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Material Properties',
      steps: [
        {
          description: 'Timber density',
          formula: `${formData.member1Species}`,
          result: `ρk = ${results.rhok} kg/m³`,
        },
        {
          description: 'Embedment strength (parallel)',
          formula: 'fh,0,k = 0.082 × ρk × d^(-0.3)',
          result: `fh,k = ${results.fhk} MPa`,
        },
        {
          description: 'Fastener yield moment',
          formula: 'My,Rk = 0.3 × fu × d^2.6',
          result: `My,Rk = ${results.MyRk} Nmm`,
        },
      ],
    },
    {
      title: 'Modification Factors',
      steps: [
        {
          description: 'Load duration & service class',
          formula: 'EC5 Table 3.1',
          result: `kmod = ${results.kmod}`,
        },
        {
          description: 'Partial factor (connections)',
          formula: 'EC5 NA',
          result: `γM = ${results.gammaMconnection}`,
        },
      ],
    },
    {
      title: 'Single Fastener Calculation',
      steps: [
        {
          description: 'Number of shear planes',
          formula: 'Based on connection geometry',
          result: `n_planes = ${results.numberOfShearPlanes}`,
        },
        {
          description: 'Characteristic resistance',
          formula: `Mode ${results.failureMode} governs`,
          result: `Fv,Rk = ${results.FvRkSingle} kN`,
        },
        {
          description: 'Design resistance',
          formula: 'Fv,Rd = kmod × Fv,Rk / γM',
          substitution: `Fv,Rd = ${results.kmod} × ${results.FvRkSingle} / ${results.gammaMconnection}`,
          result: `Fv,Rd = ${results.FvRdSingle} kN`,
        },
      ],
    },
    {
      title: 'Effective Number of Fasteners',
      steps: [
        {
          description: 'Row effect',
          formula: 'nef = n^0.9 × (a₁/(13d))^0.25',
          result: `nef = ${results.effectiveNumber}`,
        },
        {
          description: 'Connection resistance',
          formula: 'Fv,Rd,conn = nef × n_planes × Fv,Rd',
          result: `Fv,Rd,conn = ${results.FvRdConnection} kN`,
        },
        {
          description: 'Connection utilisation',
          formula: 'Util = Fed / Fv,Rd,conn × 100',
          result: `${results.fastenerUtil}%`,
        },
      ],
    },
    {
      title: 'Block Shear Check',
      steps: [
        {
          description: 'Net tension area',
          formula: 'Ant = (n-1) × a₁ × t',
          result: 'Per EC5 Annex A',
        },
        {
          description: 'Net shear area',
          formula: 'Anv = a₃,t × t × 2',
          result: 'Per EC5 Annex A',
        },
        {
          description: 'Block shear resistance',
          formula: 'Fbs = 0.5 × fv × Anv + ft × Ant',
          result: `Fbs = ${results.blockShearCapacity} kN`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (results.spacingStatus === 'FAIL') {
    reportWarnings.push({
      type: 'error',
      message: 'One or more spacing requirements not met - splitting may occur',
    });
  }

  if (formData.timberServiceClass === '3') {
    reportWarnings.push({
      type: 'warning',
      message: 'Service Class 3 - ensure appropriate protection against moisture',
    });
  }

  if (
    formData.fastenerType === 'Nail' &&
    parseFloat(formData.member1Thickness) < 6 * parseFloat(formData.fastenerDiameter)
  ) {
    reportWarnings.push({
      type: 'warning',
      message: 'Thin timber member - pre-drilling may be required',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.numberOfFasteners}No. ${fastenerDesc} connection is ADEQUATE.
         Capacity ${results.FvRdConnection} kN ≥ Applied ${formData.shearForce} kN (${results.overallUtil}% util).
         Governing: ${results.governingMode} (Mode ${results.failureMode}).`
        : `Connection FAILS at ${results.governingMode}. Increase fastener size/number or reduce loads.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.numberOfFasteners}No. ${fastenerDesc}`,
      `Minimum spacings: a₁≥${results.minA1}mm, a₂≥${results.minA2}mm`,
      `End/edge distances: a₃,t≥${results.minA3t}mm, a₄,t≥${results.minA4t}mm`,
      formData.fastenerType === 'Bolt' ? 'Use washers under bolt head and nut' : '',
      `${formData.loadDurationClass} load duration - kmod=${results.kmod}`,
    ].filter(Boolean),
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
