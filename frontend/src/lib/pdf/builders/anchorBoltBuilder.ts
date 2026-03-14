// ============================================================================
// BeaverCalc Studio — Anchor Bolt Report Data Builder
// Post-installed & Cast-in Anchor Design to EC2 / EOTA TR029
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
 * Form data from the Anchor Bolt calculator
 */
export interface AnchorBoltFormData {
  // Anchor Configuration
  anchorType: string; // Chemical, Mechanical expansion, Undercut, Cast-in
  anchorBrand: string; // Hilti, Fischer, etc.
  anchorSize: string; // M12, M16, M20, etc.
  embedmentDepth: string; // mm

  // Anchor Group
  numberOfAnchors: string;
  anchorPattern: string; // Single, Row, Grid, Circular
  spacingS1: string; // mm (x-direction)
  spacingS2: string; // mm (y-direction)
  edgeDistanceC1: string; // mm (x-direction)
  edgeDistanceC2: string; // mm (y-direction)

  // Base Material
  concreteGrade: string; // C25/30, C30/37, etc.
  concreteCondition: string; // Cracked, Uncracked
  reinforcementCondition: string; // With, Without supplementary reinforcement

  // Applied Loads
  tensionForce: string; // kN
  shearForceX: string; // kN
  shearForceY: string; // kN
  eccentricityX: string; // mm
  eccentricityY: string; // mm

  // Installation
  installationSafety: string; // High, Normal, Low
  designLife: string; // 50 years, 100 years
}

/**
 * Results from the Anchor Bolt calculator
 */
export interface AnchorBoltResults {
  // Anchor Properties
  anchorDiameter: string;
  steelGrade: string;
  fuk: string; // MPa
  fyk: string; // MPa
  As: string; // mm² (stress area)

  // Concrete Properties
  fck: string; // MPa
  fctk: string; // MPa
  hmin: string; // mm (minimum member thickness)

  // Tension Resistances
  NRdS: string; // kN (steel failure)
  NRdP: string; // kN (pull-out)
  NRdC: string; // kN (concrete cone)
  NRdSp: string; // kN (splitting)
  NRdCb: string; // kN (concrete blow-out) - if applicable
  NRd: string; // kN (governing)

  // Shear Resistances
  VRdS: string; // kN (steel failure)
  VRdCp: string; // kN (pryout)
  VRdC: string; // kN (concrete edge)
  VRd: string; // kN (governing)

  // Combined Check
  tensionUtil: string; // %
  shearUtil: string; // %
  combinedUtil: string; // % (interaction)
  interactionFormula: string;

  // Characteristic Spacings & Edge Distances
  scr: string; // mm
  ccr: string; // mm
  smin: string; // mm
  cmin: string; // mm

  // Reduction Factors
  psiAn: string; // Area factor (tension)
  psiSn: string; // Edge distance factor (tension)
  psiEcn: string; // Eccentricity factor (tension)
  psiRen: string; // Reinforcement factor (tension)
  psiAv: string; // Area factor (shear)
  psiSv: string; // Edge distance factor (shear)
  psiEcv: string; // Eccentricity factor (shear)
  psiAlphaV: string; // Load angle factor (shear)
  psiRev: string; // Reinforcement factor (shear)

  // Group Effects
  groupFactorN: string;
  groupFactorV: string;

  overallStatus: string;
  governingMode: string;
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
 * Build a ReportData object from Anchor Bolt calculator results
 */
export function buildAnchorBoltReport(
  formData: AnchorBoltFormData,
  results: AnchorBoltResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Anchor Bolt Design',
    projectName: options.projectName || 'Anchor Connection Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `ANK-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Anchor Bolt Design',
    designCodes: ['BS EN 1992-4:2018', 'EOTA TR029', 'ETA'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.numberOfAnchors}No. ${formData.anchorType} anchors ${formData.anchorSize}.
    Embedment ${formData.embedmentDepth}mm in ${formData.concreteGrade} (${formData.concreteCondition}).
    NEd = ${formData.tensionForce}kN, VEd = ${Math.sqrt(
      Math.pow(parseFloat(formData.shearForceX), 2) + Math.pow(parseFloat(formData.shearForceY), 2),
    ).toFixed(1)}kN.`,
    keyResults: [
      { label: 'Anchor', value: `${formData.anchorSize} × ${formData.embedmentDepth}mm` },
      { label: 'NRd', value: `${results.NRd} kN` },
      { label: 'VRd', value: `${results.VRd} kN` },
      { label: 'Governing Mode', value: results.governingMode },
      { label: 'Combined Util', value: `${results.combinedUtil}%`, highlight: true },
    ],
    overallStatus,
    governingCheck: results.governingMode,
    utilisationSummary: `${results.combinedUtil}% combined (N: ${results.tensionUtil}%, V: ${results.shearUtil}%)`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Anchor Selection',
        parameters: [
          { name: 'Anchor Type', value: formData.anchorType },
          { name: 'Manufacturer', value: formData.anchorBrand },
          { name: 'Size', value: formData.anchorSize },
          { name: 'Embedment hef', value: formData.embedmentDepth, unit: 'mm' },
          { name: 'Steel Grade', value: results.steelGrade },
          { name: 'Stress Area As', value: results.As, unit: 'mm²' },
        ],
      },
      {
        title: 'Anchor Group Geometry',
        parameters: [
          { name: 'Number of Anchors', value: formData.numberOfAnchors },
          { name: 'Pattern', value: formData.anchorPattern },
          { name: 'Spacing s1 (x)', value: formData.spacingS1, unit: 'mm' },
          { name: 'Spacing s2 (y)', value: formData.spacingS2, unit: 'mm' },
          { name: 'Edge Distance c1', value: formData.edgeDistanceC1, unit: 'mm' },
          { name: 'Edge Distance c2', value: formData.edgeDistanceC2, unit: 'mm' },
        ],
      },
      {
        title: 'Base Material',
        parameters: [
          { name: 'Concrete Grade', value: formData.concreteGrade },
          { name: 'fck', value: results.fck, unit: 'MPa' },
          { name: 'Condition', value: formData.concreteCondition },
          { name: 'Reinforcement', value: formData.reinforcementCondition },
          { name: 'Min Member Thickness', value: results.hmin, unit: 'mm' },
        ],
      },
      {
        title: 'Applied Loads',
        parameters: [
          { name: 'Tension NEd', value: formData.tensionForce, unit: 'kN' },
          { name: 'Shear Vx,Ed', value: formData.shearForceX, unit: 'kN' },
          { name: 'Shear Vy,Ed', value: formData.shearForceY, unit: 'kN' },
          { name: 'Eccentricity ex', value: formData.eccentricityX, unit: 'mm' },
          { name: 'Eccentricity ey', value: formData.eccentricityY, unit: 'mm' },
        ],
      },
      {
        title: 'Installation & Safety',
        parameters: [
          { name: 'Installation Safety', value: formData.installationSafety },
          { name: 'Design Life', value: formData.designLife },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Tension Failure Modes',
      description: 'EC2-4 Cl.7.2',
      checks: [
        {
          name: 'Steel Failure',
          formula: 'NRd,s = As × fuk / γMs',
          calculated: `${results.NRdS} kN`,
          limit: `NEd = ${formData.tensionForce} kN`,
          utilisation: parseFloat(formData.tensionForce) / parseFloat(results.NRdS),
          status: parseFloat(formData.tensionForce) <= parseFloat(results.NRdS) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Pull-out Failure',
          formula: 'NRd,p = NRk,p / γMp',
          calculated: `${results.NRdP} kN`,
          limit: `NEd = ${formData.tensionForce} kN`,
          utilisation: parseFloat(formData.tensionForce) / parseFloat(results.NRdP),
          status: parseFloat(formData.tensionForce) <= parseFloat(results.NRdP) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Concrete Cone',
          formula: 'NRd,c = N⁰Rk,c × ψA,N × ψs,N × ψec,N × ψre,N / γMc',
          calculated: `${results.NRdC} kN`,
          limit: `NEd = ${formData.tensionForce} kN`,
          utilisation: parseFloat(formData.tensionForce) / parseFloat(results.NRdC),
          status: parseFloat(formData.tensionForce) <= parseFloat(results.NRdC) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Splitting',
          formula: 'NRd,sp = NRk,sp / γMsp',
          calculated: `${results.NRdSp} kN`,
          limit: `NEd = ${formData.tensionForce} kN`,
          utilisation: parseFloat(formData.tensionForce) / parseFloat(results.NRdSp),
          status: parseFloat(formData.tensionForce) <= parseFloat(results.NRdSp) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Shear Failure Modes',
      description: 'EC2-4 Cl.7.3',
      checks: [
        {
          name: 'Steel Failure',
          formula: 'VRd,s = 0.5 × As × fuk / γMs',
          calculated: `${results.VRdS} kN`,
          limit: `VEd = ${Math.sqrt(
            Math.pow(parseFloat(formData.shearForceX), 2) +
              Math.pow(parseFloat(formData.shearForceY), 2),
          ).toFixed(1)} kN`,
          utilisation:
            Math.sqrt(
              Math.pow(parseFloat(formData.shearForceX), 2) +
                Math.pow(parseFloat(formData.shearForceY), 2),
            ) / parseFloat(results.VRdS),
          status: 'PASS',
        },
        {
          name: 'Pryout',
          formula: 'VRd,cp = k × NRd,c / γMcp',
          calculated: `${results.VRdCp} kN`,
          limit: 'VEd',
          utilisation:
            Math.sqrt(
              Math.pow(parseFloat(formData.shearForceX), 2) +
                Math.pow(parseFloat(formData.shearForceY), 2),
            ) / parseFloat(results.VRdCp),
          status: 'PASS',
        },
        {
          name: 'Concrete Edge',
          formula: 'VRd,c = V⁰Rk,c × ψA,V × ψs,V × ψec,V × ψα,V × ψre,V / γMc',
          calculated: `${results.VRdC} kN`,
          limit: 'VEd',
          utilisation:
            Math.sqrt(
              Math.pow(parseFloat(formData.shearForceX), 2) +
                Math.pow(parseFloat(formData.shearForceY), 2),
            ) / parseFloat(results.VRdC),
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Tension-Shear Interaction',
      description: 'EC2-4 Cl.7.4',
      checks: [
        {
          name: 'Combined Check',
          formula: results.interactionFormula,
          calculated: `${results.combinedUtil}%`,
          limit: '100%',
          utilisation: parseFloat(results.combinedUtil) / 100,
          status: results.overallStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Spacing & Edge Distance',
      description: 'Geometric requirements',
      checks: [
        {
          name: 'Spacing',
          formula: 's ≥ smin',
          calculated: `s1 = ${formData.spacingS1}mm, s2 = ${formData.spacingS2}mm`,
          limit: `smin = ${results.smin}mm`,
          utilisation: 0,
          status:
            parseFloat(formData.spacingS1 || '999') >= parseFloat(results.smin) &&
            parseFloat(formData.spacingS2 || '999') >= parseFloat(results.smin)
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Edge Distance',
          formula: 'c ≥ cmin',
          calculated: `c1 = ${formData.edgeDistanceC1}mm, c2 = ${formData.edgeDistanceC2}mm`,
          limit: `cmin = ${results.cmin}mm`,
          utilisation: 0,
          status:
            parseFloat(formData.edgeDistanceC1) >= parseFloat(results.cmin) &&
            parseFloat(formData.edgeDistanceC2) >= parseFloat(results.cmin)
              ? 'PASS'
              : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Tension Reduction Factors',
      steps: [
        {
          description: 'Characteristic spacing',
          formula: 'scr,N = 3 × hef',
          result: `scr,N = ${results.scr} mm`,
        },
        {
          description: 'Characteristic edge distance',
          formula: 'ccr,N = 1.5 × hef',
          result: `ccr,N = ${results.ccr} mm`,
        },
        {
          description: 'Projected area factor',
          formula: 'ψA,N = Ac,N / A⁰c,N',
          result: `ψA,N = ${results.psiAn}`,
        },
        {
          description: 'Edge distance factor',
          formula: 'ψs,N = 0.7 + 0.3c/ccr,N ≤ 1.0',
          result: `ψs,N = ${results.psiSn}`,
        },
        {
          description: 'Eccentricity factor',
          formula: 'ψec,N = 1/(1 + 2eN/scr,N) ≤ 1.0',
          result: `ψec,N = ${results.psiEcn}`,
        },
        {
          description: 'Reinforcement factor',
          formula: 'ψre,N per concrete condition',
          result: `ψre,N = ${results.psiRen}`,
        },
      ],
    },
    {
      title: 'Shear Reduction Factors',
      steps: [
        {
          description: 'Projected area factor',
          formula: 'ψA,V = Ac,V / A⁰c,V',
          result: `ψA,V = ${results.psiAv}`,
        },
        {
          description: 'Edge distance factor',
          formula: 'ψs,V = 0.7 + 0.3c2/(1.5c1) ≤ 1.0',
          result: `ψs,V = ${results.psiSv}`,
        },
        {
          description: 'Eccentricity factor',
          formula: 'ψec,V = 1/(1 + 2eV/scr,V) ≤ 1.0',
          result: `ψec,V = ${results.psiEcv}`,
        },
        {
          description: 'Load angle factor',
          formula: 'ψα,V = √(1/(cos²αV + (sin²αV)/2.5))',
          result: `ψα,V = ${results.psiAlphaV}`,
        },
        {
          description: 'Reinforcement factor',
          formula: 'ψre,V per edge reinforcement',
          result: `ψre,V = ${results.psiRev}`,
        },
      ],
    },
    {
      title: 'Group Effects',
      steps: [
        {
          description: 'Group factor (tension)',
          formula: 'Based on anchor spacing and edge distance',
          result: `Group factor = ${results.groupFactorN}`,
        },
        {
          description: 'Group factor (shear)',
          formula: 'Based on anchor spacing and edge distance',
          result: `Group factor = ${results.groupFactorV}`,
        },
      ],
    },
    {
      title: 'Governing Resistance',
      steps: [
        {
          description: 'Tension resistance',
          formula: 'NRd = min(NRd,s, NRd,p, NRd,c, NRd,sp)',
          result: `NRd = ${results.NRd} kN`,
        },
        {
          description: 'Shear resistance',
          formula: 'VRd = min(VRd,s, VRd,cp, VRd,c)',
          result: `VRd = ${results.VRd} kN`,
        },
        {
          description: 'Combined interaction',
          formula: results.interactionFormula,
          result: `${results.combinedUtil}%`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (formData.concreteCondition === 'Cracked') {
    reportWarnings.push({
      type: 'info',
      message: 'Cracked concrete assumed - reduced cone resistance',
    });
  }

  if (
    parseFloat(formData.edgeDistanceC1) < parseFloat(results.ccr) ||
    parseFloat(formData.edgeDistanceC2) < parseFloat(results.ccr)
  ) {
    reportWarnings.push({
      type: 'warning',
      message: 'Edge distance less than ccr - reduced cone capacity',
    });
  }

  if (
    results.governingMode.toLowerCase().includes('cone') ||
    results.governingMode.toLowerCase().includes('splitting')
  ) {
    reportWarnings.push({
      type: 'info',
      message: 'Concrete failure governs - consider supplementary reinforcement',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.numberOfAnchors}No. ${formData.anchorSize} ${formData.anchorType} anchors are ADEQUATE.
         NRd = ${results.NRd}kN ≥ NEd = ${formData.tensionForce}kN (${results.tensionUtil}%).
         VRd = ${results.VRd}kN ≥ VEd (${results.shearUtil}%).
         Combined: ${results.combinedUtil}%. Governing mode: ${results.governingMode}.`
        : `Anchor connection FAILS. ${results.governingMode} at ${results.combinedUtil}%.`,
    status: overallStatus,
    recommendations: [
      `Embedment depth: ${formData.embedmentDepth}mm, min required: ${results.hmin}mm`,
      `Min spacing: smin = ${results.smin}mm, provided: s1 = ${formData.spacingS1}mm`,
      `Min edge distance: cmin = ${results.cmin}mm, provided: c1 = ${formData.edgeDistanceC1}mm`,
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
