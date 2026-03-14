// ============================================================================
// BeaverCalc Studio — Base Plate Connection Report Data Builder
// Steel Column Base Plate Design to Eurocode 3
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
 * Form data from the Base Plate calculator
 */
export interface BasePlateFormData {
  // Column Section
  columnSection: string;
  columnGrade: string;
  columnDepth: string;
  columnWidth: string;
  columnFlange: string;
  columnWeb: string;

  // Base Plate
  plateLength: string;
  plateWidth: string;
  plateThickness: string;
  plateGrade: string;

  // Anchor Bolts
  boltGrade: string;
  boltDiameter: string;
  numberOfBolts: string;
  boltPattern: string;
  edgeDistance: string;
  embedmentDepth: string;

  // Loading
  axialForce: string;
  momentMajor: string;
  momentMinor: string;
  shearMajor: string;
  shearMinor: string;

  // Foundation
  concreteGrade: string;
  groutThickness: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Base Plate calculator
 */
export interface BasePlateResults {
  // Base Plate
  bearingArea: string;
  effectiveArea: string;
  cProjection: string;

  // Bearing Check
  bearingStress: string;
  fjdBearing: string;
  bearingUtil: string;
  bearingStatus: string;

  // Plate Bending
  plateMoment: string;
  plateCapacity: string;
  plateUtil: string;
  plateStatus: string;

  // Tension (if applicable)
  tensionForce: string;
  boltTensionCapacity: string;
  tensionUtil: string;
  tensionStatus: string;

  // Compression (T-stub)
  compressionForce: string;
  leffCompression: string;
  compressionStatus: string;

  // Shear Transfer
  shearForce: string;
  frictionCapacity: string;
  boltShearCapacity: string;
  shearMethod: string;
  shearUtil: string;
  shearStatus: string;

  // Anchor Bolt Checks
  conePullout: string;
  concreteBreakout: string;
  anchorStatus: string;

  // Weld (column to plate)
  weldSize: string;
  weldLength: string;
  weldCapacity: string;
  weldUtil: string;
  weldStatus: string;

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
 * Build a ReportData object from Base Plate calculator results
 */
export function buildBasePlateReport(
  formData: BasePlateFormData,
  results: BasePlateResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [
    results.bearingStatus,
    results.plateStatus,
    results.tensionStatus,
    results.shearStatus,
    results.anchorStatus,
    results.weldStatus,
  ].filter(Boolean);
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  const hasTension = parseFloat(results.tensionForce) > 0;

  // Build meta
  const meta = {
    title: 'Column Base Plate Design',
    projectName: options.projectName || formData.projectTitle || 'Base Plate Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `BPL-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Base Plate',
    designCodes: ['EN 1993-1-8:2005', 'EN 1993-1-1', 'SCI P398'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Base plate connection for ${formData.columnSection} ${formData.columnGrade} column.
    ${formData.plateLength}×${formData.plateWidth}×${formData.plateThickness}mm ${formData.plateGrade} plate
    with ${formData.numberOfBolts}nr M${formData.boltDiameter} ${formData.boltGrade} anchor bolts.
    ${formData.concreteGrade} foundation.`,
    keyResults: [
      { label: 'Column', value: formData.columnSection },
      {
        label: 'Base Plate',
        value: `${formData.plateLength}×${formData.plateWidth}×${formData.plateThickness}`,
      },
      { label: 'Bearing Utilisation', value: `${results.bearingUtil}%`, highlight: true },
      { label: 'Plate Utilisation', value: `${results.plateUtil}%` },
      {
        label: 'Anchor Bolts',
        value: `${formData.numberOfBolts}×M${formData.boltDiameter} ${formData.boltGrade}`,
      },
    ],
    overallStatus,
    governingCheck: getGoverningCheck(results),
    utilisationSummary: `Max utilisation: ${Math.max(
      parseFloat(results.bearingUtil),
      parseFloat(results.plateUtil),
      parseFloat(results.shearUtil),
    ).toFixed(0)}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Column Section',
        parameters: [
          { name: 'Section', value: formData.columnSection },
          { name: 'Steel Grade', value: formData.columnGrade },
          { name: 'Depth', value: formData.columnDepth, unit: 'mm' },
          { name: 'Width', value: formData.columnWidth, unit: 'mm' },
        ],
      },
      {
        title: 'Base Plate',
        parameters: [
          { name: 'Length', value: formData.plateLength, unit: 'mm' },
          { name: 'Width', value: formData.plateWidth, unit: 'mm' },
          { name: 'Thickness', value: formData.plateThickness, unit: 'mm' },
          { name: 'Plate Grade', value: formData.plateGrade },
        ],
      },
      {
        title: 'Anchor Bolts',
        parameters: [
          { name: 'Grade', value: formData.boltGrade },
          { name: 'Diameter', value: formData.boltDiameter, unit: 'mm' },
          { name: 'Number of Bolts', value: formData.numberOfBolts },
          { name: 'Pattern', value: formData.boltPattern },
          { name: 'Embedment', value: formData.embedmentDepth, unit: 'mm' },
        ],
      },
      {
        title: 'Design Forces',
        parameters: [
          { name: 'Axial Force', value: formData.axialForce, unit: 'kN' },
          { name: 'Major Axis Moment', value: formData.momentMajor, unit: 'kNm' },
          { name: 'Minor Axis Moment', value: formData.momentMinor, unit: 'kNm' },
          { name: 'Shear Force', value: formData.shearMajor, unit: 'kN' },
        ],
      },
      {
        title: 'Foundation',
        parameters: [
          { name: 'Concrete Grade', value: formData.concreteGrade },
          { name: 'Grout Thickness', value: formData.groutThickness, unit: 'mm' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Concrete Bearing (EC2/EC3)',
      description: 'Check bearing stress under base plate',
      checks: [
        {
          name: 'Bearing Stress',
          formula: 'σ = NEd / Aeff ≤ fjd',
          calculated: `${results.bearingStress} MPa`,
          limit: `≤ ${results.fjdBearing} MPa`,
          utilisation: parseFloat(results.bearingUtil) / 100,
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Plate Bending (EC3-1-8)',
      description: 'Check plate thickness for bending',
      checks: [
        {
          name: 'Plate Bending Moment',
          formula: 'MEd ≤ Mpl,Rd',
          calculated: `${results.plateMoment} kNm/m`,
          limit: `≤ ${results.plateCapacity} kNm/m`,
          utilisation: parseFloat(results.plateUtil) / 100,
          status: results.plateStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  if (hasTension) {
    designChecks.push({
      title: 'Anchor Bolt Tension',
      description: 'Check bolt tension under moment/uplift',
      checks: [
        {
          name: 'Bolt Tension',
          formula: 'Ft,Ed ≤ Ft,Rd',
          calculated: `${results.tensionForce} kN`,
          limit: `≤ ${results.boltTensionCapacity} kN`,
          utilisation: parseFloat(results.tensionUtil) / 100,
          status: results.tensionStatus as 'PASS' | 'FAIL',
        },
      ],
    });
  }

  designChecks.push(
    {
      title: 'Shear Transfer',
      description: `Shear via ${results.shearMethod}`,
      checks: [
        {
          name: 'Shear Resistance',
          formula: 'VEd ≤ VRd',
          calculated: `${results.shearForce} kN`,
          limit: `≤ ${results.shearMethod === 'friction' ? results.frictionCapacity : results.boltShearCapacity} kN`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Anchor Embedment',
      description: 'Concrete cone and pullout checks',
      checks: [
        {
          name: 'Concrete Breakout',
          formula: 'NRk,c / γMc',
          calculated: `${results.concreteBreakout} kN`,
          limit: '≥ Tension demand',
          utilisation: hasTension
            ? parseFloat(results.tensionForce) / parseFloat(results.concreteBreakout)
            : 0,
          status: results.anchorStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Column to Plate Weld',
      description: 'Fillet weld around column profile',
      checks: [
        {
          name: 'Weld Capacity',
          formula: 'σw ≤ fw,d',
          calculated: `${results.weldSize}mm fillet`,
          limit: `${results.weldCapacity} kN/mm`,
          utilisation: parseFloat(results.weldUtil) / 100,
          status: results.weldStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  );

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Effective Area Calculation',
      steps: [
        {
          description: 'Design bearing strength',
          formula: 'fjd = βj × fcd = βj × αcc × fck / γc',
          result: `fjd = ${results.fjdBearing} MPa`,
        },
        {
          description: 'Cantilever projection',
          formula: 'c = tp × √(fy / (3 × fjd × γM0))',
          result: `c = ${results.cProjection} mm`,
        },
        {
          description: 'Effective area',
          formula: 'Aeff = (h + 2c) × (b + 2c) - holes',
          result: `Aeff = ${results.effectiveArea} mm²`,
        },
      ],
    },
    {
      title: 'Plate Thickness Check',
      steps: [
        {
          description: 'Bending moment in plate',
          formula: 'MEd = σ × c² / 2',
          result: `${results.plateMoment} kNm/m`,
        },
        {
          description: 'Plate moment resistance',
          formula: 'Mpl,Rd = tp² × fy / (4 × γM0)',
          result: `${results.plateCapacity} kNm/m`,
        },
      ],
    },
    {
      title: 'Shear Transfer Mechanism',
      steps: [
        {
          description: 'Friction resistance',
          formula: 'Vf,Rd = Cf × NEd',
          result: `${results.frictionCapacity} kN (friction)`,
        },
        {
          description: 'Bolt shear resistance',
          formula: 'Fv,Rd = αv × fub × As / γM2',
          result: `${results.boltShearCapacity} kN (bolts)`,
        },
        {
          description: 'Governing mechanism',
          formula: results.shearMethod,
          result: 'Used for shear check',
        },
      ],
    },
    {
      title: 'Weld Design',
      steps: [
        {
          description: 'Required weld size',
          formula: 'a = F / (fw,d × Lw)',
          result: `a = ${results.weldSize} mm`,
        },
        {
          description: 'Weld length',
          formula: 'Lw = 2 × (h - 2tf) + 4 × b',
          result: `Lw = ${results.weldLength} mm`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.groutThickness) > 50) {
    reportWarnings.push({
      type: 'warning',
      message: 'Grout thickness > 50mm - may need reinforced grout',
    });
  }

  if (parseFloat(formData.embedmentDepth) < 8 * parseFloat(formData.boltDiameter)) {
    reportWarnings.push({
      type: 'warning',
      message: 'Embedment depth < 8d - verify concrete breakout capacity',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The base plate design is ADEQUATE. 
         ${formData.plateLength}×${formData.plateWidth}×${formData.plateThickness}mm plate with 
         ${formData.numberOfBolts}×M${formData.boltDiameter} ${formData.boltGrade} bolts.
         Bearing ${results.bearingUtil}%, Plate ${results.plateUtil}%.`
        : `The base plate design is INADEQUATE. Consider thicker plate, 
         larger bolts, or increased plate dimensions.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.plateLength}×${formData.plateWidth}×${formData.plateThickness}mm ${formData.plateGrade} plate`,
      `Install ${formData.numberOfBolts}×M${formData.boltDiameter} ${formData.boltGrade} anchors at ${formData.embedmentDepth}mm embedment`,
      `Weld: ${results.weldSize}mm fillet all around column profile`,
      `Grout: ${formData.groutThickness}mm non-shrink grout`,
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

function getGoverningCheck(results: BasePlateResults): string {
  const checks = [
    { name: 'Bearing', util: parseFloat(results.bearingUtil) },
    { name: 'Plate Bending', util: parseFloat(results.plateUtil) },
    { name: 'Shear', util: parseFloat(results.shearUtil) },
  ];
  return checks.reduce((a, b) => (a.util > b.util ? a : b)).name;
}
