// ============================================================================
// BeaverCalc Studio — Ground Anchor Report Data Builder
// Anchor Design & Testing to BS 8081/EC7
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
 * Form data from the Ground Anchor calculator
 */
export interface GroundAnchorFormData {
  // Anchor Configuration
  anchorType: string; // Temporary, Permanent
  anchorClass: string; // Class 1, 2, 3 (EC7)
  tendonType: string; // Strand, Bar

  // Design Load
  designLoad: string; // kN
  workingLoad: string; // kN (SLS)
  loadAngle: string; // degrees from horizontal

  // Geometry
  freeLength: string; // m
  fixedLength: string; // m (bond length)
  inclination: string; // degrees below horizontal
  spacing: string; // m (horizontal)

  // Tendon
  tendonSize: string; // 15.2mm strand, 32mm bar, etc.
  numberOfStrands: string; // for strand anchors
  tendonGrade: string; // 1860, 1030, etc.

  // Ground Conditions
  groundType: string; // Granite, Sandstone, Sand, Clay, etc.
  ultimateBondStress: string; // kPa (τult)
  groundwaterDepth: string; // m

  // Corrosion Protection
  protectionClass: string; // Single, Double (permanent)
  groutCover: string; // mm

  // Testing
  testType: string; // Suitability, Acceptance, Proof
  proofLoadFactor: string; // 1.25, 1.5 etc.
  lockOffLoad: string; // % of working load
}

/**
 * Results from the Ground Anchor calculator
 */
export interface GroundAnchorResults {
  // Tendon Properties
  tendonArea: string; // mm²
  fpu: string; // MPa (characteristic strength)
  Pmax: string; // kN (0.8fpuAp)
  P0: string; // kN (initial lock-off)

  // Bond Capacity
  bondPerimeter: string; // mm
  bondArea: string; // m²
  ultimatePullout: string; // kN
  designPullout: string; // kN
  bondFOS: string;

  // Structural Capacity
  tendonCapacity: string; // kN
  steelFOS: string;

  // Test Loads
  Pp: string; // kN (proof load)
  Pa: string; // kN (acceptance test load)
  Ps: string; // kN (suitability test load)

  // Lock-off
  lockOffForce: string; // kN
  lockOffStress: string; // % fpu

  // Elongation
  theoreticalElongation: string; // mm
  minElongation: string; // mm
  maxElongation: string; // mm

  // Global Stability
  embedmentBelowCritical: string; // m
  blockWeight: string; // kN
  blockFOS: string;

  // Utilisation
  steelUtil: string; // %
  bondUtil: string; // %

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
 * Build a ReportData object from Ground Anchor calculator results
 */
export function buildGroundAnchorReport(
  formData: GroundAnchorFormData,
  results: GroundAnchorResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Ground Anchor Design',
    projectName: options.projectName || 'Anchor Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `GAN-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Ground Anchor Design',
    designCodes: ['BS EN 1997-1:2004', 'BS 8081:2015', 'EC7 Part 1'],
  };

  // Build executive summary
  const totalLength = parseFloat(formData.freeLength) + parseFloat(formData.fixedLength);
  const executiveSummary = {
    description: `${formData.anchorType} ${formData.tendonType} anchor, ${formData.anchorClass}.
    Design load ${formData.designLoad}kN at ${formData.inclination}° inclination.
    Total length ${totalLength.toFixed(1)}m (free: ${formData.freeLength}m, bond: ${formData.fixedLength}m).
    ${formData.groundType} ground, τult = ${formData.ultimateBondStress}kPa.`,
    keyResults: [
      { label: 'Tendon', value: `${formData.numberOfStrands}×${formData.tendonSize}` },
      { label: 'Tendon Capacity', value: `${results.tendonCapacity} kN` },
      { label: 'Bond Capacity', value: `${results.designPullout} kN` },
      {
        label: 'Steel Util',
        value: `${results.steelUtil}%`,
        highlight: parseFloat(results.steelUtil) > 80,
      },
      { label: 'Bond Util', value: `${results.bondUtil}%` },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `Steel: ${results.steelUtil}%, Bond: ${results.bondUtil}%`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Anchor Configuration',
        parameters: [
          { name: 'Anchor Type', value: formData.anchorType },
          { name: 'Class', value: formData.anchorClass },
          { name: 'Tendon Type', value: formData.tendonType },
          { name: 'Tendon Size', value: formData.tendonSize },
          { name: 'Number of Strands', value: formData.numberOfStrands },
          { name: 'Grade', value: formData.tendonGrade, unit: 'MPa' },
          { name: 'Tendon Area Ap', value: results.tendonArea, unit: 'mm²' },
        ],
      },
      {
        title: 'Loading',
        parameters: [
          { name: 'Design Load Pd', value: formData.designLoad, unit: 'kN' },
          { name: 'Working Load Pw', value: formData.workingLoad, unit: 'kN' },
          { name: 'Load Angle', value: formData.loadAngle, unit: '°' },
        ],
      },
      {
        title: 'Geometry',
        parameters: [
          { name: 'Free Length Lf', value: formData.freeLength, unit: 'm' },
          { name: 'Fixed (Bond) Length Lb', value: formData.fixedLength, unit: 'm' },
          { name: 'Total Length', value: totalLength.toFixed(1), unit: 'm' },
          { name: 'Inclination', value: formData.inclination, unit: '°' },
          { name: 'Horizontal Spacing', value: formData.spacing, unit: 'm' },
        ],
      },
      {
        title: 'Ground Conditions',
        parameters: [
          { name: 'Ground Type', value: formData.groundType },
          { name: 'Ultimate Bond Stress τult', value: formData.ultimateBondStress, unit: 'kPa' },
          { name: 'Groundwater', value: formData.groundwaterDepth, unit: 'm below GL' },
        ],
      },
      {
        title: 'Corrosion Protection',
        parameters: [
          { name: 'Protection Class', value: formData.protectionClass },
          { name: 'Grout Cover', value: formData.groutCover, unit: 'mm' },
        ],
      },
      {
        title: 'Testing',
        parameters: [
          { name: 'Test Type', value: formData.testType },
          { name: 'Proof Load Factor', value: formData.proofLoadFactor },
          { name: 'Lock-off', value: formData.lockOffLoad, unit: '% Pw' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Tendon Capacity (Steel)',
      description: 'BS 8081 Cl.6.3',
      checks: [
        {
          name: 'Ultimate Tendon Load',
          formula: 'Pt,max = 0.8 × fpu × Ap',
          calculated: `${results.Pmax} kN`,
          limit: 'Maximum permissible',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Tendon Capacity',
          formula: 'Pt,d = Pt,max / γM',
          calculated: `${results.tendonCapacity} kN`,
          limit: `Pd = ${formData.designLoad} kN`,
          utilisation: parseFloat(results.steelUtil) / 100,
          status: parseFloat(results.steelUtil) <= 100 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Steel FOS',
          formula: 'Pt,d / Pd',
          calculated: results.steelFOS,
          limit: '≥ 1.35 (permanent)',
          utilisation: 1.35 / parseFloat(results.steelFOS),
          status: parseFloat(results.steelFOS) >= 1.35 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Bond Capacity (Ground)',
      description: 'BS 8081 Cl.6.4',
      checks: [
        {
          name: 'Ultimate Pullout',
          formula: 'Tult = π × D × Lb × τult',
          calculated: `${results.ultimatePullout} kN`,
          limit: 'Characteristic',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Design Pullout',
          formula: 'Td = Tult / γR',
          calculated: `${results.designPullout} kN`,
          limit: `Pd = ${formData.designLoad} kN`,
          utilisation: parseFloat(results.bondUtil) / 100,
          status: parseFloat(results.bondUtil) <= 100 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Bond FOS',
          formula: 'Tult / Pd',
          calculated: results.bondFOS,
          limit: '≥ 2.0 (permanent)',
          utilisation: 2.0 / parseFloat(results.bondFOS),
          status: parseFloat(results.bondFOS) >= 2.0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Lock-off & Stressing',
      description: 'BS 8081 Cl.9',
      checks: [
        {
          name: 'Lock-off Force',
          formula: `P0 = ${formData.lockOffLoad}% × Pw`,
          calculated: `${results.lockOffForce} kN`,
          limit: `≤ 0.7Pt,max = ${(0.7 * parseFloat(results.Pmax)).toFixed(0)} kN`,
          utilisation: parseFloat(results.lockOffForce) / (0.7 * parseFloat(results.Pmax)),
          status:
            parseFloat(results.lockOffForce) <= 0.7 * parseFloat(results.Pmax) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Lock-off Stress',
          formula: 'σ0 / fpu × 100',
          calculated: `${results.lockOffStress}%`,
          limit: '≤ 70%',
          utilisation: parseFloat(results.lockOffStress) / 70,
          status: parseFloat(results.lockOffStress) <= 70 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Test Loads',
      description: 'BS 8081 Table 4',
      checks: [
        {
          name: 'Proof Load',
          formula: 'Pp = factor × Pd',
          calculated: `${results.Pp} kN`,
          limit: 'During installation',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Acceptance Test',
          formula: 'Pa = 1.25 × Pw',
          calculated: `${results.Pa} kN`,
          limit: 'All anchors',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Suitability Test',
          formula: 'Ps = 1.5 × Pw',
          calculated: `${results.Ps} kN`,
          limit: 'Selected anchors',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Elongation Criteria',
      description: 'BS 8081 Cl.10.5',
      checks: [
        {
          name: 'Theoretical Elongation',
          formula: 'δ = P × Lf / (Ap × Ep)',
          calculated: `${results.theoreticalElongation} mm`,
          limit: 'At proof load',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Acceptable Range',
          formula: '0.8δth to 1.1δth',
          calculated: `${results.minElongation} - ${results.maxElongation} mm`,
          limit: 'Test acceptance',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Global Stability',
      description: 'EC7 Block failure',
      checks: [
        {
          name: 'Block Stability FOS',
          formula: 'W × tanφ / ΣT',
          calculated: results.blockFOS,
          limit: '≥ 1.5',
          utilisation: 1.5 / parseFloat(results.blockFOS),
          status: parseFloat(results.blockFOS) >= 1.5 ? 'PASS' : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Tendon Properties',
      steps: [
        {
          description: 'Strand area',
          formula: `${formData.numberOfStrands} strands × area per strand`,
          result: `Ap = ${results.tendonArea} mm²`,
        },
        {
          description: 'Characteristic strength',
          formula: 'fpu from grade',
          result: `fpu = ${results.fpu} MPa`,
        },
        {
          description: 'Maximum load (0.8fpu)',
          formula: 'Pmax = 0.8 × fpu × Ap',
          substitution: `Pmax = 0.8 × ${results.fpu} × ${results.tendonArea} / 1000`,
          result: `Pmax = ${results.Pmax} kN`,
        },
      ],
    },
    {
      title: 'Bond Capacity',
      steps: [
        {
          description: 'Bond perimeter',
          formula: 'π × D (grout body diameter)',
          result: `Perimeter = ${results.bondPerimeter} mm`,
        },
        {
          description: 'Bond area',
          formula: 'π × D × Lb',
          result: `Ab = ${results.bondArea} m²`,
        },
        {
          description: 'Ultimate pullout resistance',
          formula: 'Tult = Ab × τult',
          substitution: `Tult = ${results.bondArea} × ${formData.ultimateBondStress}`,
          result: `Tult = ${results.ultimatePullout} kN`,
        },
        {
          description: 'Design pullout (with γR = 2.0)',
          formula: 'Td = Tult / 2.0',
          result: `Td = ${results.designPullout} kN`,
        },
      ],
    },
    {
      title: 'Lock-off Calculation',
      steps: [
        {
          description: 'Lock-off force',
          formula: `P0 = ${formData.lockOffLoad}% × Pw`,
          substitution: `P0 = ${formData.lockOffLoad}/100 × ${formData.workingLoad}`,
          result: `P0 = ${results.lockOffForce} kN`,
        },
        {
          description: 'Lock-off stress',
          formula: 'σ0 = P0 / Ap',
          result: `σ0 = ${results.lockOffStress}% of fpu`,
        },
      ],
    },
    {
      title: 'Elongation',
      steps: [
        {
          description: 'Elastic modulus',
          formula: 'Ep = 195,000 MPa (strand)',
          result: 'Ep = 195 GPa',
        },
        {
          description: 'Free length elongation',
          formula: 'δ = P × Lf × 1000 / (Ap × Ep)',
          result: `δ = ${results.theoreticalElongation} mm at proof load`,
        },
        {
          description: 'Acceptable range',
          formula: '80% to 110% of theoretical',
          result: `${results.minElongation} to ${results.maxElongation} mm`,
        },
      ],
    },
    {
      title: 'Test Loads',
      steps: [
        {
          description: 'Proof load',
          formula: `Pp = ${formData.proofLoadFactor} × Pd`,
          result: `Pp = ${results.Pp} kN`,
        },
        {
          description: 'Acceptance test load',
          formula: 'Pa = 1.25 × Pw',
          result: `Pa = ${results.Pa} kN`,
        },
        {
          description: 'Suitability test load',
          formula: 'Ps = 1.5 × Pw',
          result: `Ps = ${results.Ps} kN`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (formData.anchorType === 'Permanent' && formData.protectionClass !== 'Double') {
    reportWarnings.push({
      type: 'warning',
      message: 'Permanent anchor - double corrosion protection recommended',
    });
  }

  if (parseFloat(formData.fixedLength) < 3) {
    reportWarnings.push({
      type: 'warning',
      message: 'Bond length < 3m - consider increased length for reliability',
    });
  }

  if (parseFloat(results.lockOffStress) > 65) {
    reportWarnings.push({
      type: 'info',
      message: 'High lock-off stress - monitor for relaxation losses',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.anchorType} anchor is ADEQUATE.
         ${formData.numberOfStrands}×${formData.tendonSize} ${formData.tendonType}, 
         Lb = ${formData.fixedLength}m in ${formData.groundType}.
         Tendon capacity ${results.tendonCapacity}kN (${results.steelUtil}% util).
         Bond capacity ${results.designPullout}kN (${results.bondUtil}% util).
         Lock-off at ${results.lockOffForce}kN (${results.lockOffStress}% fpu).`
        : `Anchor FAILS. ${results.governingCheck} governs.`,
    status: overallStatus,
    recommendations: [
      `Total length: ${totalLength.toFixed(1)}m (Lf = ${formData.freeLength}m, Lb = ${formData.fixedLength}m)`,
      `Proof load: ${results.Pp}kN, Acceptance: ${results.Pa}kN`,
      `Expected elongation: ${results.minElongation} - ${results.maxElongation}mm`,
      `Corrosion protection: ${formData.protectionClass}`,
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
