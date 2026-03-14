// ============================================================================
// BeaverCalc Studio — Steel Column Axial Report Data Builder
// Steel Column Compression Design to EC3
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
 * Form data from the Steel Column Axial calculator
 */
export interface SteelColumnAxialFormData {
  // Section
  sectionSize: string; // e.g., 203x203x60 UC
  steelGrade: string; // S275, S355, S460

  // Geometry
  systemLength: string; // m
  effectiveLengthFactorY: string; // Lcr/L major axis
  effectiveLengthFactorZ: string; // Lcr/L minor axis

  // Loading
  axialForce: string; // kN (NEd)
  loadType: string; // Permanent, Variable, or Factored

  // Restraints
  restraintTop: string; // Fixed, Pinned, Free
  restraintBottom: string;
  intermediateRestraints: string; // Yes/No
  bracedFrame: string; // Yes/No (sway or non-sway)

  // Section Properties (from database or manual)
  area: string; // cm²
  iy: string; // cm
  iz: string; // cm
  tf: string; // mm
  tw: string; // mm
  h: string; // mm
  b: string; // mm
  cf_tf: string; // c/tf (outstand)
  cw_tw: string; // cw/tw (web)
}

/**
 * Results from the Steel Column Axial calculator
 */
export interface SteelColumnAxialResults {
  // Material
  fy: string; // N/mm²
  E: string; // N/mm²
  gammaM1: string;

  // Classification
  flangeClass: string;
  webClass: string;
  overallClass: string;

  // Effective lengths
  LcrY: string; // m
  LcrZ: string; // m

  // Slenderness
  lambdaY: string;
  lambdaZ: string;
  lambda1: string;
  lambdaBarY: string;
  lambdaBarZ: string;

  // Buckling parameters
  bucklingCurveY: string; // a, b, c, d
  bucklingCurveZ: string;
  alphaY: string; // imperfection factor
  alphaZ: string;
  phiY: string;
  phiZ: string;
  chiY: string; // reduction factor
  chiZ: string;
  chiGoverning: string;

  // Resistances
  NplRd: string; // kN (plastic resistance)
  NbRdY: string; // kN (buckling y-y)
  NbRdZ: string; // kN (buckling z-z)
  NbRd: string; // kN (governing)

  // Utilisation
  utilisationY: string; // %
  utilisationZ: string;
  utilisationGoverning: string;

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
 * Build a ReportData object from Steel Column Axial calculator results
 */
export function buildSteelColumnAxialReport(
  formData: SteelColumnAxialFormData,
  results: SteelColumnAxialResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Steel Column Axial Compression Design',
    projectName: options.projectName || 'Steel Column Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `COL-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Steel Column Axial',
    designCodes: ['BS EN 1993-1-1:2005', 'UK NA to EC3-1-1'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.sectionSize} ${formData.steelGrade} column, ${formData.systemLength}m long.
    Axial compression NEd = ${formData.axialForce} kN.
    Effective length factors: ky = ${formData.effectiveLengthFactorY}, kz = ${formData.effectiveLengthFactorZ}.
    ${formData.bracedFrame === 'Yes' ? 'Braced (non-sway)' : 'Unbraced (sway)'} frame.`,
    keyResults: [
      { label: 'Section', value: formData.sectionSize },
      { label: 'NEd', value: `${formData.axialForce} kN` },
      { label: 'Nb,Rd', value: `${results.NbRd} kN` },
      {
        label: 'Util.',
        value: `${results.utilisationGoverning}%`,
        highlight: parseFloat(results.utilisationGoverning) > 100,
      },
      { label: 'Class', value: results.overallClass },
    ],
    overallStatus,
    governingCheck: results.governingCheck,
    utilisationSummary: `${results.utilisationGoverning}% utilised (${results.governingCheck})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Section Properties',
        parameters: [
          { name: 'Section Size', value: formData.sectionSize },
          { name: 'Steel Grade', value: formData.steelGrade },
          { name: 'Area A', value: formData.area, unit: 'cm²' },
          { name: 'Radius iy', value: formData.iy, unit: 'cm' },
          { name: 'Radius iz', value: formData.iz, unit: 'cm' },
          { name: 'Flange tf', value: formData.tf, unit: 'mm' },
          { name: 'Web tw', value: formData.tw, unit: 'mm' },
        ],
      },
      {
        title: 'Column Geometry',
        parameters: [
          { name: 'System Length', value: formData.systemLength, unit: 'm' },
          { name: 'EL Factor ky', value: formData.effectiveLengthFactorY },
          { name: 'EL Factor kz', value: formData.effectiveLengthFactorZ },
          { name: 'Lcr,y', value: results.LcrY, unit: 'm' },
          { name: 'Lcr,z', value: results.LcrZ, unit: 'm' },
        ],
      },
      {
        title: 'Restraints',
        parameters: [
          { name: 'Top Restraint', value: formData.restraintTop },
          { name: 'Bottom Restraint', value: formData.restraintBottom },
          { name: 'Intermediate', value: formData.intermediateRestraints },
          { name: 'Braced Frame', value: formData.bracedFrame },
        ],
      },
      {
        title: 'Loading',
        parameters: [
          { name: 'Axial Force NEd', value: formData.axialForce, unit: 'kN' },
          { name: 'Load Type', value: formData.loadType },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Section Classification',
      description: 'EC3-1-1 Table 5.2',
      checks: [
        {
          name: 'Flange (outstand)',
          formula: 'c/tf ≤ Class limits',
          calculated: `c/tf = ${formData.cf_tf}`,
          limit: 'Table 5.2',
          utilisation: 0,
          status: parseInt(results.flangeClass) <= 3 ? 'PASS' : 'FAIL',
          notes: `Class ${results.flangeClass}`,
        },
        {
          name: 'Web',
          formula: 'cw/tw ≤ Class limits',
          calculated: `cw/tw = ${formData.cw_tw}`,
          limit: 'Table 5.2',
          utilisation: 0,
          status: parseInt(results.webClass) <= 3 ? 'PASS' : 'FAIL',
          notes: `Class ${results.webClass}`,
        },
        {
          name: 'Overall Class',
          formula: 'Worst of flange/web',
          calculated: `Class ${results.overallClass}`,
          limit: 'Class ≤ 3',
          utilisation: parseInt(results.overallClass) / 3,
          status: parseInt(results.overallClass) <= 3 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Slenderness - Major Axis (y-y)',
      description: 'EC3-1-1 Cl.6.3.1',
      checks: [
        {
          name: 'Slenderness λy',
          formula: 'λy = Lcr,y / iy',
          calculated: results.lambdaY,
          limit: '≤ 200 typical',
          utilisation: parseFloat(results.lambdaY) / 200,
          status: parseFloat(results.lambdaY) <= 200 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Non-dim. λ̄y',
          formula: 'λ̄y = λy / λ1',
          calculated: results.lambdaBarY,
          limit: 'λ1 = 93.9ε',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Buckling Curve',
          formula: 'From Table 6.2',
          calculated: `Curve ${results.bucklingCurveY}`,
          limit: 'h/b, tf based',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Reduction χy',
          formula: 'χy = 1/(Φy + √(Φy² - λ̄y²))',
          calculated: results.chiY,
          limit: '≤ 1.0',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Slenderness - Minor Axis (z-z)',
      description: 'EC3-1-1 Cl.6.3.1',
      checks: [
        {
          name: 'Slenderness λz',
          formula: 'λz = Lcr,z / iz',
          calculated: results.lambdaZ,
          limit: '≤ 200 typical',
          utilisation: parseFloat(results.lambdaZ) / 200,
          status: parseFloat(results.lambdaZ) <= 200 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Non-dim. λ̄z',
          formula: 'λ̄z = λz / λ1',
          calculated: results.lambdaBarZ,
          limit: 'λ1 = 93.9ε',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Buckling Curve',
          formula: 'From Table 6.2',
          calculated: `Curve ${results.bucklingCurveZ}`,
          limit: 'h/b, tf based',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Reduction χz',
          formula: 'χz = 1/(Φz + √(Φz² - λ̄z²))',
          calculated: results.chiZ,
          limit: '≤ 1.0',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Buckling Resistance',
      description: 'EC3-1-1 Cl.6.3.1.1',
      checks: [
        {
          name: 'Plastic Resistance',
          formula: 'Npl,Rd = A × fy / γM0',
          calculated: `${results.NplRd} kN`,
          limit: 'Cross-section capacity',
          utilisation: parseFloat(formData.axialForce) / parseFloat(results.NplRd),
          status: parseFloat(formData.axialForce) <= parseFloat(results.NplRd) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Buckling y-y',
          formula: 'Nb,Rd,y = χy × A × fy / γM1',
          calculated: `${results.NbRdY} kN`,
          limit: `NEd = ${formData.axialForce} kN`,
          utilisation: parseFloat(formData.axialForce) / parseFloat(results.NbRdY),
          status: parseFloat(formData.axialForce) <= parseFloat(results.NbRdY) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Buckling z-z',
          formula: 'Nb,Rd,z = χz × A × fy / γM1',
          calculated: `${results.NbRdZ} kN`,
          limit: `NEd = ${formData.axialForce} kN`,
          utilisation: parseFloat(formData.axialForce) / parseFloat(results.NbRdZ),
          status: parseFloat(formData.axialForce) <= parseFloat(results.NbRdZ) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Governing',
          formula: 'Nb,Rd = min(Nb,Rd,y, Nb,Rd,z)',
          calculated: `${results.NbRd} kN`,
          limit: `NEd = ${formData.axialForce} kN`,
          utilisation: parseFloat(results.utilisationGoverning) / 100,
          status: parseFloat(results.utilisationGoverning) <= 100 ? 'PASS' : 'FAIL',
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
          description: 'Yield strength',
          formula: 'fy from Table 3.1 (thickness dependent)',
          substitution: `tf = ${formData.tf}mm, Grade ${formData.steelGrade}`,
          result: `fy = ${results.fy} N/mm²`,
        },
        {
          description: 'Elastic modulus',
          formula: 'E = 210000 N/mm²',
          result: `E = ${results.E} N/mm²`,
        },
        {
          description: 'Epsilon',
          formula: 'ε = √(235/fy)',
          substitution: `ε = √(235/${results.fy})`,
          result: `ε = ${Math.sqrt(235 / parseFloat(results.fy)).toFixed(3)}`,
        },
      ],
    },
    {
      title: 'Section Classification',
      steps: [
        {
          description: 'Flange outstand',
          formula: 'c/tf = (b/2 - tw/2 - r) / tf',
          result: `c/tf = ${formData.cf_tf} → Class ${results.flangeClass}`,
        },
        {
          description: 'Web (compression)',
          formula: 'cw/tw for uniform compression',
          result: `cw/tw = ${formData.cw_tw} → Class ${results.webClass}`,
        },
        {
          description: 'Overall classification',
          formula: 'Maximum of flange and web class',
          result: `Class ${results.overallClass}`,
        },
      ],
    },
    {
      title: 'Effective Lengths',
      steps: [
        {
          description: 'Effective length y-y',
          formula: 'Lcr,y = ky × L',
          substitution: `Lcr,y = ${formData.effectiveLengthFactorY} × ${formData.systemLength}`,
          result: `Lcr,y = ${results.LcrY} m`,
        },
        {
          description: 'Effective length z-z',
          formula: 'Lcr,z = kz × L',
          substitution: `Lcr,z = ${formData.effectiveLengthFactorZ} × ${formData.systemLength}`,
          result: `Lcr,z = ${results.LcrZ} m`,
        },
      ],
    },
    {
      title: 'Slenderness Calculation',
      steps: [
        {
          description: 'Reference slenderness',
          formula: 'λ1 = π × √(E/fy) = 93.9ε',
          result: `λ1 = ${results.lambda1}`,
        },
        {
          description: 'Slenderness y-y',
          formula: 'λy = Lcr,y × 10 / iy',
          result: `λy = ${results.lambdaY}, λ̄y = ${results.lambdaBarY}`,
        },
        {
          description: 'Slenderness z-z',
          formula: 'λz = Lcr,z × 10 / iz',
          result: `λz = ${results.lambdaZ}, λ̄z = ${results.lambdaBarZ}`,
        },
      ],
    },
    {
      title: 'Buckling Reduction Factor - y-y',
      steps: [
        {
          description: 'Buckling curve',
          formula: 'Table 6.2 based on h/b and tf',
          result: `Curve ${results.bucklingCurveY}, α = ${results.alphaY}`,
        },
        {
          description: 'Phi factor',
          formula: 'Φ = 0.5 × [1 + α(λ̄ - 0.2) + λ̄²]',
          result: `Φy = ${results.phiY}`,
        },
        {
          description: 'Reduction factor',
          formula: 'χ = 1 / (Φ + √(Φ² - λ̄²))',
          result: `χy = ${results.chiY}`,
        },
      ],
    },
    {
      title: 'Buckling Reduction Factor - z-z',
      steps: [
        {
          description: 'Buckling curve',
          formula: 'Table 6.2 based on h/b and tf',
          result: `Curve ${results.bucklingCurveZ}, α = ${results.alphaZ}`,
        },
        {
          description: 'Phi factor',
          formula: 'Φ = 0.5 × [1 + α(λ̄ - 0.2) + λ̄²]',
          result: `Φz = ${results.phiZ}`,
        },
        {
          description: 'Reduction factor',
          formula: 'χ = 1 / (Φ + √(Φ² - λ̄²))',
          result: `χz = ${results.chiZ}`,
        },
      ],
    },
    {
      title: 'Buckling Resistance',
      steps: [
        {
          description: 'Plastic resistance',
          formula: 'Npl,Rd = A × fy / γM0',
          substitution: `Npl,Rd = ${formData.area} × 100 × ${results.fy} / 1.0 / 1000`,
          result: `Npl,Rd = ${results.NplRd} kN`,
        },
        {
          description: 'Buckling resistance y-y',
          formula: 'Nb,Rd,y = χy × A × fy / γM1',
          substitution: `Nb,Rd,y = ${results.chiY} × ${formData.area} × 100 × ${results.fy} / ${results.gammaM1} / 1000`,
          result: `Nb,Rd,y = ${results.NbRdY} kN`,
        },
        {
          description: 'Buckling resistance z-z',
          formula: 'Nb,Rd,z = χz × A × fy / γM1',
          substitution: `Nb,Rd,z = ${results.chiZ} × ${formData.area} × 100 × ${results.fy} / ${results.gammaM1} / 1000`,
          result: `Nb,Rd,z = ${results.NbRdZ} kN`,
        },
        {
          description: 'Governing resistance',
          formula: 'Nb,Rd = min(Nb,Rd,y, Nb,Rd,z)',
          result: `Nb,Rd = ${results.NbRd} kN`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseInt(results.overallClass) === 4) {
    reportWarnings.push({
      type: 'error',
      message: 'Class 4 section - effective properties required (not covered)',
    });
  }

  if (parseFloat(results.lambdaY) > 200 || parseFloat(results.lambdaZ) > 200) {
    reportWarnings.push({
      type: 'warning',
      message: 'Slenderness > 200 - consider serviceability and second-order effects',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.sectionSize} ${formData.steelGrade} is ADEQUATE.
         NEd = ${formData.axialForce} kN ≤ Nb,Rd = ${results.NbRd} kN.
         Utilisation = ${results.utilisationGoverning}%.
         Governs: ${results.governingCheck}.`
        : `Column FAILS. ${results.governingCheck}.`,
    status: overallStatus,
    recommendations: [
      `Section: ${formData.sectionSize} Grade ${formData.steelGrade}`,
      `Buckling resistance: ${results.NbRd} kN (χ = ${results.chiGoverning})`,
      formData.bracedFrame === 'Yes' ? 'Non-sway frame assumed' : 'Sway frame - check P-Δ effects',
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
