// ============================================================================
// BeaverCalc Studio — Fin Plate Connection Report Data Builder
// Beam-to-Beam/Column Simple Connections to EC3-1-8
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
 * Form data from the Fin Plate calculator
 */
export interface FinPlateFormData {
  // Connection Type
  connectionType: string; // Beam-to-column, Beam-to-beam
  supportingMember: string; // UKB 406x178x74, etc.
  supportedMember: string; // UKB 305x165x40, etc.

  // Fin Plate
  plateThickness: string; // mm
  plateDepth: string; // mm
  plateLength: string; // mm
  steelGrade: string; // S275, S355

  // Bolt Configuration
  boltSize: string; // M16, M20, M24
  boltGrade: string; // 8.8, 10.9
  numberOfBoltRows: string;
  boltPitch: string; // mm (vertical spacing)
  endDistance: string; // mm (to edge of plate)
  edgeDistance: string; // mm (to side of plate)

  // Weld (to supporting member)
  weldSize: string; // mm (fillet leg length)
  weldType: string; // Fillet, Full penetration

  // Applied Loads
  shearForce: string; // kN
  eccentricity: string; // mm (from face of supporting member)
  tying: string; // Yes/No (accidental design situation)
  tyingForce: string; // kN (if applicable)
}

/**
 * Results from the Fin Plate calculator
 */
export interface FinPlateResults {
  // Material Properties
  fyPlate: string; // MPa
  fuPlate: string; // MPa
  fub: string; // MPa (bolt ultimate)

  // Bolt Capacities
  FvRd: string; // kN (single bolt shear)
  FbRd: string; // kN (bolt bearing on plate)
  FbRdBeam: string; // kN (bolt bearing on beam web)

  // Bolt Group
  numberOfBolts: string;
  boltGroupCapacity: string; // kN
  boltGroupMomentCapacity: string; // kNm

  // Plate Checks
  plateShearGross: string; // kN
  plateShearNet: string; // kN
  plateShearBlock: string; // kN
  plateBending: string; // kNm

  // Beam Web Checks
  beamShearNet: string; // kN
  beamShearBlock: string; // kN

  // Weld Capacity
  weldLength: string; // mm
  weldThroat: string; // mm
  weldCapacity: string; // kN

  // Notch (if applicable)
  notchDepth: string; // mm
  notchLength: string; // mm
  reducedCapacity: string; // kN

  // Utilisations
  boltShearUtil: string; // %
  boltBearingUtil: string; // %
  plateShearUtil: string; // %
  plateBendingUtil: string; // %
  blockTearUtil: string; // %
  weldUtil: string; // %

  governingCheck: string;
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
 * Build a ReportData object from Fin Plate calculator results
 */
export function buildFinPlateReport(
  formData: FinPlateFormData,
  results: FinPlateResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Fin Plate Connection Design',
    projectName: options.projectName || 'Steel Connection Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `FIN-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Fin Plate Connection',
    designCodes: ['BS EN 1993-1-8:2005', 'SCI P358', 'UK NA'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.connectionType} fin plate connection. 
    ${formData.plateThickness}mm thick × ${formData.plateDepth}mm deep ${formData.steelGrade} plate.
    ${formData.numberOfBoltRows} rows of ${formData.boltSize} ${formData.boltGrade} bolts.
    VEd = ${formData.shearForce}kN.`,
    keyResults: [
      {
        label: 'Plate',
        value: `${formData.plateThickness}×${formData.plateDepth}mm ${formData.steelGrade}`,
      },
      {
        label: 'Bolts',
        value: `${results.numberOfBolts}No. ${formData.boltSize} ${formData.boltGrade}`,
      },
      { label: 'Bolt Group', value: `${results.boltGroupCapacity} kN` },
      { label: 'Governing', value: results.governingCheck },
      {
        label: 'Max Util',
        value: `${Math.max(
          parseFloat(results.boltShearUtil),
          parseFloat(results.plateShearUtil),
          parseFloat(results.weldUtil),
        ).toFixed(1)}%`,
        highlight: true,
      },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `Bolt: ${results.boltShearUtil}%, Plate: ${results.plateShearUtil}%, Weld: ${results.weldUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Connection Configuration',
        parameters: [
          { name: 'Connection Type', value: formData.connectionType },
          { name: 'Supporting Member', value: formData.supportingMember },
          { name: 'Supported Member', value: formData.supportedMember },
        ],
      },
      {
        title: 'Fin Plate',
        parameters: [
          { name: 'Thickness tp', value: formData.plateThickness, unit: 'mm' },
          { name: 'Depth hp', value: formData.plateDepth, unit: 'mm' },
          { name: 'Length Lp', value: formData.plateLength, unit: 'mm' },
          { name: 'Steel Grade', value: formData.steelGrade },
          { name: 'fy', value: results.fyPlate, unit: 'MPa' },
          { name: 'fu', value: results.fuPlate, unit: 'MPa' },
        ],
      },
      {
        title: 'Bolt Configuration',
        parameters: [
          { name: 'Bolt Size', value: formData.boltSize },
          { name: 'Bolt Grade', value: formData.boltGrade },
          { name: 'fub', value: results.fub, unit: 'MPa' },
          { name: 'Number of Rows', value: formData.numberOfBoltRows },
          { name: 'Total Bolts', value: results.numberOfBolts },
          { name: 'Pitch p', value: formData.boltPitch, unit: 'mm' },
          { name: 'End Distance e1', value: formData.endDistance, unit: 'mm' },
          { name: 'Edge Distance e2', value: formData.edgeDistance, unit: 'mm' },
        ],
      },
      {
        title: 'Welds',
        parameters: [
          { name: 'Weld Type', value: formData.weldType },
          { name: 'Leg Length a', value: formData.weldSize, unit: 'mm' },
          { name: 'Throat t', value: results.weldThroat, unit: 'mm' },
          { name: 'Weld Length Lw', value: results.weldLength, unit: 'mm' },
        ],
      },
      {
        title: 'Applied Loads',
        parameters: [
          { name: 'Shear Force VEd', value: formData.shearForce, unit: 'kN' },
          { name: 'Eccentricity e', value: formData.eccentricity, unit: 'mm' },
          {
            name: 'Tying Force',
            value: formData.tying === 'Yes' ? formData.tyingForce : 'N/A',
            unit: formData.tying === 'Yes' ? 'kN' : '',
          },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Bolt Shear',
      description: 'EC3-1-8 Table 3.4',
      checks: [
        {
          name: 'Single Bolt Shear',
          formula: 'Fv,Rd = αv × fub × A / γM2',
          calculated: `${results.FvRd} kN`,
          limit: 'Per bolt',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Bolt Group Capacity',
          formula: 'VRd = n × Fv,Rd (eccentric loading)',
          calculated: `${results.boltGroupCapacity} kN`,
          limit: `VEd = ${formData.shearForce} kN`,
          utilisation: parseFloat(results.boltShearUtil) / 100,
          status: parseFloat(results.boltShearUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Bolt Bearing',
      description: 'EC3-1-8 Table 3.4',
      checks: [
        {
          name: 'Bearing on Plate',
          formula: 'Fb,Rd = k1 × αb × fu × d × t / γM2',
          calculated: `${results.FbRd} kN`,
          limit: 'Per bolt',
          utilisation: parseFloat(results.boltBearingUtil) / 100,
          status: parseFloat(results.boltBearingUtil) <= 100 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Bearing on Beam Web',
          formula: 'Fb,Rd = k1 × αb × fu × d × tw / γM2',
          calculated: `${results.FbRdBeam} kN`,
          limit: 'Per bolt',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Plate Shear',
      description: 'EC3-1-1 Cl.6.2.6',
      checks: [
        {
          name: 'Gross Section',
          formula: 'Vpl,Rd = Av × (fy/√3) / γM0',
          calculated: `${results.plateShearGross} kN`,
          limit: `VEd = ${formData.shearForce} kN`,
          utilisation: parseFloat(formData.shearForce) / parseFloat(results.plateShearGross),
          status:
            parseFloat(formData.shearForce) <= parseFloat(results.plateShearGross)
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Net Section',
          formula: 'Vn,Rd = Av,net × (fu/√3) / γM2',
          calculated: `${results.plateShearNet} kN`,
          limit: `VEd = ${formData.shearForce} kN`,
          utilisation: parseFloat(formData.shearForce) / parseFloat(results.plateShearNet),
          status:
            parseFloat(formData.shearForce) <= parseFloat(results.plateShearNet) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Block Tearing',
      description: 'EC3-1-8 Cl.3.10.2',
      checks: [
        {
          name: 'Plate Block Tearing',
          formula: 'Veff,1,Rd = fu×Ant/γM2 + (1/√3)×fy×Anv/γM0',
          calculated: `${results.plateShearBlock} kN`,
          limit: `VEd = ${formData.shearForce} kN`,
          utilisation: parseFloat(results.blockTearUtil) / 100,
          status: parseFloat(results.blockTearUtil) <= 100 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Beam Web Block Tearing',
          formula: 'Veff,1,Rd = fu×Ant/γM2 + (1/√3)×fy×Anv/γM0',
          calculated: `${results.beamShearBlock} kN`,
          limit: `VEd = ${formData.shearForce} kN`,
          utilisation: parseFloat(formData.shearForce) / parseFloat(results.beamShearBlock),
          status:
            parseFloat(formData.shearForce) <= parseFloat(results.beamShearBlock) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Plate Bending',
      description: 'Due to eccentricity',
      checks: [
        {
          name: 'Bending Resistance',
          formula: 'Mc,Rd = Wpl × fy / γM0',
          calculated: `${results.plateBending} kNm`,
          limit: `MEd = VEd × e = ${((parseFloat(formData.shearForce) * parseFloat(formData.eccentricity)) / 1000).toFixed(2)} kNm`,
          utilisation: parseFloat(results.plateBendingUtil) / 100,
          status: parseFloat(results.plateBendingUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Weld Resistance',
      description: 'EC3-1-8 Cl.4.5',
      checks: [
        {
          name: 'Fillet Weld',
          formula: 'Fw,Rd = a × Lw × fvw,d',
          calculated: `${results.weldCapacity} kN`,
          limit: `VEd = ${formData.shearForce} kN`,
          utilisation: parseFloat(results.weldUtil) / 100,
          status: parseFloat(results.weldUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Bolt Shear Resistance',
      steps: [
        {
          description: 'Shear plane area',
          formula: 'As for threaded plane, A for unthreaded',
          result: `${formData.boltSize} bolt`,
        },
        {
          description: 'Single bolt shear',
          formula: 'Fv,Rd = 0.6 × fub × As / γM2',
          substitution: `Fv,Rd = 0.6 × ${results.fub} × As / 1.25`,
          result: `Fv,Rd = ${results.FvRd} kN`,
        },
        {
          description: 'Bolt group (ICR method)',
          formula: 'Accounting for eccentricity',
          result: `VRd,bolt = ${results.boltGroupCapacity} kN`,
        },
      ],
    },
    {
      title: 'Bearing Resistance',
      steps: [
        {
          description: 'End bearing factor',
          formula: 'αd = e1/(3d0)',
          result: `αd = ${formData.endDistance}/(3×d0)`,
        },
        {
          description: 'Bearing factor',
          formula: 'αb = min(αd, fub/fu, 1.0)',
          result: `αb used in calculation`,
        },
        {
          description: 'Perpendicular factor',
          formula: 'k1 = min(2.8e2/d0 - 1.7, 2.5)',
          result: `k1 from edge distance`,
        },
        {
          description: 'Bearing capacity',
          formula: 'Fb,Rd = k1 × αb × fu × d × t / γM2',
          result: `Fb,Rd = ${results.FbRd} kN`,
        },
      ],
    },
    {
      title: 'Plate Shear',
      steps: [
        {
          description: 'Gross shear area',
          formula: 'Av = hp × tp',
          substitution: `Av = ${formData.plateDepth} × ${formData.plateThickness}`,
          result: `Av = ${parseFloat(formData.plateDepth) * parseFloat(formData.plateThickness)} mm²`,
        },
        {
          description: 'Gross shear capacity',
          formula: 'Vpl,Rd = Av × (fy/√3) / γM0',
          result: `Vpl,Rd = ${results.plateShearGross} kN`,
        },
        {
          description: 'Net shear area',
          formula: 'Av,net = Av - n × d0 × tp',
          result: `Net section calculated`,
        },
        {
          description: 'Net shear capacity',
          formula: 'Vn,Rd = Av,net × (fu/√3) / γM2',
          result: `Vn,Rd = ${results.plateShearNet} kN`,
        },
      ],
    },
    {
      title: 'Block Tearing',
      steps: [
        {
          description: 'Net tension area',
          formula: 'Ant = tp × (e2 - 0.5d0)',
          result: 'Tension path calculated',
        },
        {
          description: 'Net shear area',
          formula: 'Anv = tp × ((n-1)p + e1 - (n-0.5)d0)',
          result: 'Shear path calculated',
        },
        {
          description: 'Block tearing capacity',
          formula: 'Veff,1,Rd = fu×Ant/γM2 + (1/√3)×fy×Anv/γM0',
          result: `Veff,1,Rd = ${results.plateShearBlock} kN`,
        },
      ],
    },
    {
      title: 'Weld Design',
      steps: [
        {
          description: 'Throat thickness',
          formula: 'a = 0.7 × leg',
          substitution: `a = 0.7 × ${formData.weldSize}`,
          result: `a = ${results.weldThroat} mm`,
        },
        {
          description: 'Weld length',
          formula: 'Lw = 2 × (hp - 2 × end returns)',
          result: `Lw = ${results.weldLength} mm`,
        },
        {
          description: 'Weld capacity',
          formula: 'Fw,Rd = a × Lw × fvw,d',
          result: `Fw,Rd = ${results.weldCapacity} kN`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  // SCI P358 checks
  if (parseFloat(formData.plateThickness) < 10) {
    reportWarnings.push({
      type: 'warning',
      message: 'Plate thickness < 10mm - check for distortion during welding',
    });
  }

  if (parseFloat(formData.plateDepth) > parseFloat(formData.supportedMember.split('×')[0]) * 0.65) {
    reportWarnings.push({
      type: 'info',
      message: 'Fin plate deeper than 0.65d - check for beam LTB',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `Fin plate connection is ADEQUATE.
         ${formData.plateThickness}×${formData.plateDepth}mm ${formData.steelGrade} plate with 
         ${results.numberOfBolts}No. ${formData.boltSize} ${formData.boltGrade} bolts.
         VEd = ${formData.shearForce}kN vs VRd,min = ${Math.min(
           parseFloat(results.boltGroupCapacity),
           parseFloat(results.plateShearNet),
           parseFloat(results.weldCapacity),
         ).toFixed(1)}kN.`
        : `Connection FAILS. ${results.governingCheck} governs.`,
    status: overallStatus,
    recommendations: [
      `Bolt shear: ${results.boltShearUtil}%`,
      `Plate shear (net): ${results.plateShearUtil}%`,
      `Block tearing: ${results.blockTearUtil}%`,
      `Weld: ${results.weldUtil}%`,
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
