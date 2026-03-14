// ============================================================================
// BeaverCalc Studio — End Plate Connection Report Data Builder
// Steel Beam End Plate Moment Connection to Eurocode 3
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
 * Form data from the End Plate calculator
 */
export interface EndPlateFormData {
  // Connection Type
  connectionType: string;
  endPlateType: string;

  // Beam Section
  beamSection: string;
  beamGrade: string;
  beamDepth: string;
  beamWidth: string;
  beamFlange: string;
  beamWeb: string;

  // Column Section (if applicable)
  columnSection: string;
  columnGrade: string;
  columnDepth: string;
  columnWidth: string;
  columnFlange: string;
  columnWeb: string;

  // End Plate
  plateWidth: string;
  plateDepth: string;
  plateThickness: string;
  plateGrade: string;

  // Bolts
  boltGrade: string;
  boltDiameter: string;
  boltRows: string;
  boltCols: string;
  gaugeDistance: string;
  pitchDistance: string;

  // Design Forces
  momentEd: string;
  shearEd: string;
  axialEd: string;

  // Stiffeners
  compressionStiffener: string;
  tensionStiffener: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the End Plate calculator
 */
export interface EndPlateResults {
  // Connection Classification
  classification: string;
  rotationalStiffness: string;
  momentResistance: string;

  // Bolt Row Forces
  boltRowForces: string;
  maxBoltTension: string;

  // T-Stub (Tension Zone)
  mode1Resistance: string;
  mode2Resistance: string;
  mode3Resistance: string;
  tStubMode: string;
  tensionUtil: string;
  tensionStatus: string;

  // Compression Zone
  compressionForce: string;
  columnWebCapacity: string;
  compressionUtil: string;
  compressionStatus: string;

  // Shear Zone
  columnWebShear: string;
  panelZoneCapacity: string;
  shearUtil: string;
  shearStatus: string;

  // Bolt Checks
  boltTensionCapacity: string;
  boltShearCapacity: string;
  combinedBoltUtil: string;
  boltStatus: string;

  // Welds
  flangeWeldSize: string;
  webWeldSize: string;
  flangeWeldUtil: string;
  webWeldUtil: string;
  weldStatus: string;

  // Plate Checks
  plateBendingUtil: string;
  plateShearUtil: string;
  plateStatus: string;

  // Overall
  mRd: string;
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
 * Build a ReportData object from End Plate calculator results
 */
export function buildEndPlateReport(
  formData: EndPlateFormData,
  results: EndPlateResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.tensionStatus,
    results.compressionStatus,
    results.shearStatus,
    results.boltStatus,
    results.weldStatus,
    results.plateStatus,
  ];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'End Plate Moment Connection Design',
    projectName: options.projectName || formData.projectTitle || 'End Plate Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `EPL-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'End Plate Connection',
    designCodes: ['EN 1993-1-8:2005', 'SCI P398', 'SCI P207/8'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.endPlateType} end plate moment connection: ${formData.beamSection} beam 
    to ${formData.columnSection} column. ${formData.plateWidth}×${formData.plateDepth}×${formData.plateThickness}mm 
    plate with ${formData.boltRows}×${formData.boltCols} M${formData.boltDiameter} ${formData.boltGrade} bolts.`,
    keyResults: [
      { label: 'Connection Type', value: formData.endPlateType },
      { label: 'Moment Resistance', value: `${results.mRd} kNm`, highlight: true },
      { label: 'Applied Moment', value: `${formData.momentEd} kNm` },
      { label: 'Utilisation', value: `${results.overallUtil}%` },
      { label: 'Classification', value: results.classification },
    ],
    overallStatus,
    governingCheck: getGoverningCheck(results),
    utilisationSummary: `Overall utilisation: ${results.overallUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Beam Section',
        parameters: [
          { name: 'Section', value: formData.beamSection },
          { name: 'Steel Grade', value: formData.beamGrade },
          { name: 'Depth', value: formData.beamDepth, unit: 'mm' },
          { name: 'Width', value: formData.beamWidth, unit: 'mm' },
          { name: 'Flange', value: formData.beamFlange, unit: 'mm' },
          { name: 'Web', value: formData.beamWeb, unit: 'mm' },
        ],
      },
      {
        title: 'Column Section',
        parameters: [
          { name: 'Section', value: formData.columnSection },
          { name: 'Steel Grade', value: formData.columnGrade },
          { name: 'Depth', value: formData.columnDepth, unit: 'mm' },
          { name: 'Flange', value: formData.columnFlange, unit: 'mm' },
        ],
      },
      {
        title: 'End Plate',
        parameters: [
          { name: 'Type', value: formData.endPlateType },
          { name: 'Width', value: formData.plateWidth, unit: 'mm' },
          { name: 'Depth', value: formData.plateDepth, unit: 'mm' },
          { name: 'Thickness', value: formData.plateThickness, unit: 'mm' },
          { name: 'Grade', value: formData.plateGrade },
        ],
      },
      {
        title: 'Bolts',
        parameters: [
          { name: 'Grade', value: formData.boltGrade },
          { name: 'Diameter', value: formData.boltDiameter, unit: 'mm' },
          { name: 'Rows × Cols', value: `${formData.boltRows}×${formData.boltCols}` },
          { name: 'Gauge', value: formData.gaugeDistance, unit: 'mm' },
          { name: 'Pitch', value: formData.pitchDistance, unit: 'mm' },
        ],
      },
      {
        title: 'Design Forces',
        parameters: [
          { name: 'Bending Moment', value: formData.momentEd, unit: 'kNm' },
          { name: 'Shear Force', value: formData.shearEd, unit: 'kN' },
          { name: 'Axial Force', value: formData.axialEd, unit: 'kN' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Tension Zone (T-Stub)',
      description: 'Equivalent T-stub in tension',
      checks: [
        {
          name: 'Mode 1 (Plate yield)',
          formula: 'FT,1,Rd = 4 × Mpl,1,Rd / m',
          calculated: `${results.mode1Resistance} kN`,
          limit: 'Complete yielding of flange',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Mode 2 (Plate + bolt)',
          formula: 'FT,2,Rd = (2×Mpl,2,Rd + n×ΣFt,Rd) / (m+n)',
          calculated: `${results.mode2Resistance} kN`,
          limit: 'Bolt failure with yielding',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Mode 3 (Bolt failure)',
          formula: 'FT,3,Rd = ΣFt,Rd',
          calculated: `${results.mode3Resistance} kN`,
          limit: 'Bolt failure',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Governing Mode',
          formula: `Mode ${results.tStubMode}`,
          calculated: `${results.maxBoltTension} kN`,
          limit: `≤ min(FT,Rd)`,
          utilisation: parseFloat(results.tensionUtil) / 100,
          status: results.tensionStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Compression Zone',
      description: 'Column web in compression',
      checks: [
        {
          name: 'Column Web Crushing',
          formula: 'Fc,wc,Rd ≥ Fc,Ed',
          calculated: `${results.compressionForce} kN`,
          limit: `≤ ${results.columnWebCapacity} kN`,
          utilisation: parseFloat(results.compressionUtil) / 100,
          status: results.compressionStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Column Web Panel Shear',
      description: 'Shear in column web panel zone',
      checks: [
        {
          name: 'Panel Zone Shear',
          formula: 'Vwp,Ed ≤ Vwp,Rd',
          calculated: `${results.columnWebShear} kN`,
          limit: `≤ ${results.panelZoneCapacity} kN`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Bolt Checks',
      description: 'Tension, shear, and combined',
      checks: [
        {
          name: 'Tension Capacity',
          formula: 'Ft,Ed ≤ Ft,Rd',
          calculated: `${results.maxBoltTension} kN`,
          limit: `≤ ${results.boltTensionCapacity} kN`,
          utilisation: parseFloat(results.maxBoltTension) / parseFloat(results.boltTensionCapacity),
          status: results.boltStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Combined Tension + Shear',
          formula: 'Ft,Ed/Ft,Rd + Fv,Ed/(1.4×Fv,Rd) ≤ 1.0',
          calculated: `${results.combinedBoltUtil}%`,
          limit: '≤ 100%',
          utilisation: parseFloat(results.combinedBoltUtil) / 100,
          status: results.boltStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Welds',
      description: 'Beam to end plate welds',
      checks: [
        {
          name: 'Flange Welds',
          formula: 'Full strength or capacity design',
          calculated: `${results.flangeWeldSize}mm fillet`,
          limit: `${results.flangeWeldUtil}% utilised`,
          utilisation: parseFloat(results.flangeWeldUtil) / 100,
          status: results.weldStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Web Welds',
          formula: 'Shear transfer',
          calculated: `${results.webWeldSize}mm fillet`,
          limit: `${results.webWeldUtil}% utilised`,
          utilisation: parseFloat(results.webWeldUtil) / 100,
          status: results.weldStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Connection Classification',
      steps: [
        {
          description: 'Rotational stiffness',
          formula: 'Sj,ini = E×z² / Σ(1/ki)',
          result: `Sj = ${results.rotationalStiffness} kNm/rad`,
        },
        {
          description: 'Stiffness boundary',
          formula: 'Sj,ini ≥ 25×EIb/Lb (rigid)',
          result: results.classification,
        },
      ],
    },
    {
      title: 'Bolt Row Force Distribution',
      steps: [
        {
          description: 'Effective lengths per row',
          formula: 'leff = min(circular, non-circular patterns)',
          result: 'Calculated per bolt row',
        },
        {
          description: 'Individual row resistance',
          formula: 'FT,Rd,row = min(Mode 1, 2, 3)',
          result: results.boltRowForces,
        },
      ],
    },
    {
      title: 'Moment Resistance',
      steps: [
        {
          description: 'Tension side',
          formula: 'MRd,tension = Σ(FT,row × hr)',
          result: 'Sum of row contributions',
        },
        {
          description: 'Compression side',
          formula: 'MRd,compression = Fc × lever arm',
          result: 'Compression zone capacity',
        },
        {
          description: 'Connection moment resistance',
          formula: 'MRd = min(tension, compression)',
          result: `${results.mRd} kNm`,
        },
      ],
    },
    {
      title: 'Weld Design',
      steps: [
        {
          description: 'Flange weld (tension)',
          formula: 'Full strength: a ≥ 0.5×tf (beam)',
          result: `${results.flangeWeldSize}mm fillet`,
        },
        {
          description: 'Web weld (shear)',
          formula: 'a = VEd / (2×Lw×fvw,d)',
          result: `${results.webWeldSize}mm fillet`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (results.classification.includes('partial')) {
    reportWarnings.push({
      type: 'info',
      message: 'Partial strength connection - consider effect on frame analysis',
    });
  }

  if (formData.compressionStiffener === 'no' && parseFloat(results.compressionUtil) > 80) {
    reportWarnings.push({
      type: 'warning',
      message: 'Consider compression stiffener in column web',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The end plate connection is ADEQUATE. ${formData.endPlateType} connection provides 
         MRd = ${results.mRd} kNm (${results.overallUtil}% utilised). 
         Classification: ${results.classification}.`
        : `The end plate connection is INADEQUATE. Consider thicker plate, 
         additional bolt rows, or stiffeners.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.plateWidth}×${formData.plateDepth}×${formData.plateThickness}mm ${formData.plateGrade} end plate`,
      `Install ${formData.boltRows}×${formData.boltCols} M${formData.boltDiameter} ${formData.boltGrade} bolts`,
      `Flange weld: ${results.flangeWeldSize}mm fillet, Web weld: ${results.webWeldSize}mm fillet`,
      formData.compressionStiffener === 'yes'
        ? 'Install compression stiffener'
        : 'No stiffeners required',
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

function getGoverningCheck(results: EndPlateResults): string {
  const checks = [
    { name: 'Tension Zone', util: parseFloat(results.tensionUtil) },
    { name: 'Compression Zone', util: parseFloat(results.compressionUtil) },
    { name: 'Panel Shear', util: parseFloat(results.shearUtil) },
    { name: 'Bolts', util: parseFloat(results.combinedBoltUtil) },
  ];
  return checks.reduce((a, b) => (a.util > b.util ? a : b)).name;
}
