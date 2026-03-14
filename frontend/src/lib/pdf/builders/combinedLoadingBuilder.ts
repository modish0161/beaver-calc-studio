// ============================================================================
// BeaverCalc Studio — Combined Loading Report Data Builder
// Steel Member Combined Bending & Compression/Tension to EC3
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
 * Form data from the Combined Loading calculator
 */
export interface CombinedLoadingFormData {
  // Section
  sectionType: string; // UKB, UKC, PFC, Hollow
  sectionSize: string;
  steelGrade: string;

  // Member
  memberLength: string; // m
  boundaryConditions: string; // Simply supported, Cantilever, Fixed-Fixed
  effectiveLengthY: string; // m (major axis)
  effectiveLengthZ: string; // m (minor axis)
  effectiveLengthLT: string; // m (LTB)

  // Applied Forces
  axialForce: string; // kN (positive = compression, negative = tension)
  forceType: string; // Compression or Tension
  momentMy: string; // kNm (major axis)
  momentMz: string; // kNm (minor axis)
  shearVz: string; // kN (major axis)
  shearVy: string; // kN (minor axis)

  // Moment Distribution
  psiY: string; // End moment ratio major axis
  psiZ: string; // End moment ratio minor axis
}

/**
 * Results from the Combined Loading calculator
 */
export interface CombinedLoadingResults {
  // Section Properties
  area: string; // cm²
  Iy: string; // cm⁴
  Iz: string; // cm⁴
  Wply: string; // cm³
  Wplz: string; // cm³
  iy: string; // cm (radius of gyration)
  iz: string; // cm
  Avz: string; // cm² (shear area)
  sectionClass: string;

  // Material
  fy: string;
  E: string;

  // Axial Resistance
  NplRd: string; // kN (plastic)
  NcrY: string; // kN (Euler major)
  NcrZ: string; // kN (Euler minor)
  lambdaY: string; // slenderness major
  lambdaZ: string; // slenderness minor
  chiY: string; // reduction factor major
  chiZ: string; // reduction factor minor
  NbRdY: string; // kN (buckling major)
  NbRdZ: string; // kN (buckling minor)
  NbRd: string; // kN (governing)

  // Moment Resistance
  MplyRd: string; // kNm (plastic major)
  MplzRd: string; // kNm (plastic minor)
  MbRd: string; // kNm (LTB)

  // Shear Resistance
  VplRd: string; // kN

  // Interaction Factors
  kyy: string;
  kyz: string;
  kzy: string;
  kzz: string;
  CmY: string; // moment factor major
  CmZ: string; // moment factor minor
  CmLT: string; // moment factor LTB

  // Interaction Checks
  eq661: string; // Cl.6.3.3 Equation 6.61
  eq662: string; // Cl.6.3.3 Equation 6.62
  governingEq: string;

  // Utilisations
  axialUtil: string; // %
  momentYUtil: string; // %
  momentZUtil: string; // %
  shearUtil: string; // %
  combinedUtil: string; // %

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
 * Build a ReportData object from Combined Loading calculator results
 */
export function buildCombinedLoadingReport(
  formData: CombinedLoadingFormData,
  results: CombinedLoadingResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Combined Loading Assessment',
    projectName: options.projectName || 'Steel Member Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `CMB-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Combined Loading',
    designCodes: ['BS EN 1993-1-1:2005', 'UK NA'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.sectionType} ${formData.sectionSize} ${formData.steelGrade} 
    under ${formData.forceType} (${formData.axialForce}kN) + bending 
    (My = ${formData.momentMy}kNm, Mz = ${formData.momentMz}kNm).
    Member length ${formData.memberLength}m. Class ${results.sectionClass} section.`,
    keyResults: [
      { label: 'Section', value: `${formData.sectionType} ${formData.sectionSize}` },
      { label: 'Eq.6.61', value: results.eq661, highlight: parseFloat(results.eq661) > 0.8 },
      { label: 'Eq.6.62', value: results.eq662, highlight: parseFloat(results.eq662) > 0.8 },
      { label: 'Governing', value: results.governingEq },
      { label: 'Combined Util', value: `${results.combinedUtil}%` },
    ],
    overallStatus,
    governingCheck: results.governingEq,
    utilisationSummary: `${results.combinedUtil}% combined utilisation`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Section Selection',
        parameters: [
          { name: 'Section Type', value: formData.sectionType },
          { name: 'Section Size', value: formData.sectionSize },
          { name: 'Steel Grade', value: formData.steelGrade },
          { name: 'Yield Strength fy', value: results.fy, unit: 'MPa' },
          { name: 'Section Class', value: results.sectionClass },
        ],
      },
      {
        title: 'Section Properties',
        parameters: [
          { name: 'Area A', value: results.area, unit: 'cm²' },
          { name: 'Iy', value: results.Iy, unit: 'cm⁴' },
          { name: 'Iz', value: results.Iz, unit: 'cm⁴' },
          { name: 'Wpl,y', value: results.Wply, unit: 'cm³' },
          { name: 'Wpl,z', value: results.Wplz, unit: 'cm³' },
          { name: 'iy', value: results.iy, unit: 'cm' },
          { name: 'iz', value: results.iz, unit: 'cm' },
        ],
      },
      {
        title: 'Member Configuration',
        parameters: [
          { name: 'Length', value: formData.memberLength, unit: 'm' },
          { name: 'Boundary Conditions', value: formData.boundaryConditions },
          { name: 'Effective Length Lcr,y', value: formData.effectiveLengthY, unit: 'm' },
          { name: 'Effective Length Lcr,z', value: formData.effectiveLengthZ, unit: 'm' },
          { name: 'Effective Length LLT', value: formData.effectiveLengthLT, unit: 'm' },
        ],
      },
      {
        title: 'Applied Forces',
        parameters: [
          {
            name: 'Axial Force NEd',
            value: formData.axialForce,
            unit: 'kN',
            note: formData.forceType,
          },
          { name: 'Moment My,Ed', value: formData.momentMy, unit: 'kNm', note: 'Major axis' },
          { name: 'Moment Mz,Ed', value: formData.momentMz, unit: 'kNm', note: 'Minor axis' },
          { name: 'Shear Vz,Ed', value: formData.shearVz, unit: 'kN' },
          { name: 'Shear Vy,Ed', value: formData.shearVy, unit: 'kN' },
        ],
      },
      {
        title: 'Moment Distribution',
        parameters: [
          { name: 'ψy (major)', value: formData.psiY },
          { name: 'ψz (minor)', value: formData.psiZ },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Axial Resistance',
      description: 'EC3 Cl.6.2.4 & 6.3.1',
      checks: [
        {
          name: 'Cross-section',
          formula: 'Npl,Rd = A × fy / γM0',
          calculated: `${results.NplRd} kN`,
          limit: `NEd = ${formData.axialForce} kN`,
          utilisation: parseFloat(results.axialUtil) / 100,
          status: parseFloat(results.axialUtil) <= 100 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Flexural Buckling (y-y)',
          formula: 'Nb,Rd,y = χy × A × fy / γM1',
          calculated: `${results.NbRdY} kN`,
          limit: `NEd = ${formData.axialForce} kN`,
          utilisation: parseFloat(formData.axialForce) / parseFloat(results.NbRdY),
          status: parseFloat(formData.axialForce) <= parseFloat(results.NbRdY) ? 'PASS' : 'FAIL',
        },
        {
          name: 'Flexural Buckling (z-z)',
          formula: 'Nb,Rd,z = χz × A × fy / γM1',
          calculated: `${results.NbRdZ} kN`,
          limit: `NEd = ${formData.axialForce} kN`,
          utilisation: parseFloat(formData.axialForce) / parseFloat(results.NbRdZ),
          status: parseFloat(formData.axialForce) <= parseFloat(results.NbRdZ) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Moment Resistance',
      description: 'EC3 Cl.6.2.5 & 6.3.2',
      checks: [
        {
          name: 'Cross-section (y-y)',
          formula: 'Mpl,y,Rd = Wpl,y × fy / γM0',
          calculated: `${results.MplyRd} kNm`,
          limit: `My,Ed = ${formData.momentMy} kNm`,
          utilisation: parseFloat(results.momentYUtil) / 100,
          status: parseFloat(results.momentYUtil) <= 100 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Cross-section (z-z)',
          formula: 'Mpl,z,Rd = Wpl,z × fy / γM0',
          calculated: `${results.MplzRd} kNm`,
          limit: `Mz,Ed = ${formData.momentMz} kNm`,
          utilisation: parseFloat(results.momentZUtil) / 100,
          status: parseFloat(results.momentZUtil) <= 100 ? 'PASS' : 'FAIL',
        },
        {
          name: 'LTB Resistance',
          formula: 'Mb,Rd = χLT × Wpl,y × fy / γM1',
          calculated: `${results.MbRd} kNm`,
          limit: `My,Ed = ${formData.momentMy} kNm`,
          utilisation: parseFloat(formData.momentMy) / parseFloat(results.MbRd),
          status: parseFloat(formData.momentMy) <= parseFloat(results.MbRd) ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Shear Resistance',
      description: 'EC3 Cl.6.2.6',
      checks: [
        {
          name: 'Plastic Shear',
          formula: 'Vpl,Rd = Av × (fy/√3) / γM0',
          calculated: `${results.VplRd} kN`,
          limit: `VEd = ${formData.shearVz} kN`,
          utilisation: parseFloat(results.shearUtil) / 100,
          status: parseFloat(results.shearUtil) <= 100 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Interaction Check - Equation 6.61',
      description: 'EC3 Cl.6.3.3(4) - Flexural buckling about y-y',
      checks: [
        {
          name: 'Eq.6.61',
          formula: 'NEd/(χy·NRk/γM1) + kyy·My,Ed/(χLT·My,Rk/γM1) + kyz·Mz,Ed/(Mz,Rk/γM1) ≤ 1.0',
          calculated: results.eq661,
          limit: '1.0',
          utilisation: parseFloat(results.eq661),
          status: parseFloat(results.eq661) <= 1.0 ? 'PASS' : 'FAIL',
        },
      ],
    },
    {
      title: 'Interaction Check - Equation 6.62',
      description: 'EC3 Cl.6.3.3(4) - Flexural buckling about z-z',
      checks: [
        {
          name: 'Eq.6.62',
          formula: 'NEd/(χz·NRk/γM1) + kzy·My,Ed/(χLT·My,Rk/γM1) + kzz·Mz,Ed/(Mz,Rk/γM1) ≤ 1.0',
          calculated: results.eq662,
          limit: '1.0',
          utilisation: parseFloat(results.eq662),
          status: parseFloat(results.eq662) <= 1.0 ? 'PASS' : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Axial Buckling Parameters',
      steps: [
        {
          description: 'Euler critical load (y-y)',
          formula: 'Ncr,y = π²EIy / Lcr,y²',
          result: `Ncr,y = ${results.NcrY} kN`,
        },
        {
          description: 'Euler critical load (z-z)',
          formula: 'Ncr,z = π²EIz / Lcr,z²',
          result: `Ncr,z = ${results.NcrZ} kN`,
        },
        {
          description: 'Slenderness (y-y)',
          formula: 'λy = √(A × fy / Ncr,y)',
          result: `λy = ${results.lambdaY}`,
        },
        {
          description: 'Slenderness (z-z)',
          formula: 'λz = √(A × fy / Ncr,z)',
          result: `λz = ${results.lambdaZ}`,
        },
        {
          description: 'Reduction factor (y-y)',
          formula: 'χy per buckling curve',
          result: `χy = ${results.chiY}`,
        },
        {
          description: 'Reduction factor (z-z)',
          formula: 'χz per buckling curve',
          result: `χz = ${results.chiZ}`,
        },
      ],
    },
    {
      title: 'Interaction Factors',
      steps: [
        {
          description: 'Cm,y factor',
          formula: 'From moment diagram and ψy',
          result: `Cm,y = ${results.CmY}`,
        },
        {
          description: 'Cm,z factor',
          formula: 'From moment diagram and ψz',
          result: `Cm,z = ${results.CmZ}`,
        },
        {
          description: 'Cm,LT factor',
          formula: 'For LTB interaction',
          result: `Cm,LT = ${results.CmLT}`,
        },
        {
          description: 'kyy factor',
          formula: 'Per Annex B Table B.1',
          result: `kyy = ${results.kyy}`,
        },
        {
          description: 'kyz factor',
          formula: 'Per Annex B Table B.1',
          result: `kyz = ${results.kyz}`,
        },
        {
          description: 'kzy factor',
          formula: 'Per Annex B Table B.1',
          result: `kzy = ${results.kzy}`,
        },
        {
          description: 'kzz factor',
          formula: 'Per Annex B Table B.1',
          result: `kzz = ${results.kzz}`,
        },
      ],
    },
    {
      title: 'Interaction Verification',
      steps: [
        {
          description: 'Equation 6.61',
          formula: 'NEd/(χy·NRk/γM1) + kyy·My,Ed/(χLT·My,Rk/γM1) + kyz·Mz,Ed/(Mz,Rk/γM1)',
          result: `= ${results.eq661} ${parseFloat(results.eq661) <= 1.0 ? '≤' : '>'} 1.0`,
        },
        {
          description: 'Equation 6.62',
          formula: 'NEd/(χz·NRk/γM1) + kzy·My,Ed/(χLT·My,Rk/γM1) + kzz·Mz,Ed/(Mz,Rk/γM1)',
          result: `= ${results.eq662} ${parseFloat(results.eq662) <= 1.0 ? '≤' : '>'} 1.0`,
        },
        {
          description: 'Governing equation',
          formula: 'max(Eq.6.61, Eq.6.62)',
          result: `${results.governingEq} governs at ${results.combinedUtil}%`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(results.combinedUtil) > 95) {
    reportWarnings.push({
      type: 'warning',
      message: 'Near capacity - consider increased section or reduced forces',
    });
  }

  if (parseFloat(results.shearUtil) > 50) {
    reportWarnings.push({
      type: 'info',
      message: 'VEd > 0.5Vpl,Rd - check for shear-moment interaction',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.sectionType} ${formData.sectionSize} ${formData.steelGrade} is ADEQUATE.
         Combined interaction: Eq.6.61 = ${results.eq661}, Eq.6.62 = ${results.eq662}.
         ${results.governingEq} governs at ${results.combinedUtil}% utilisation.`
        : `Section FAILS combined loading check. ${results.governingEq} = ${results.combinedUtil}% > 100%.`,
    status: overallStatus,
    recommendations: [
      `Axial: ${results.axialUtil}%, Moment y: ${results.momentYUtil}%, Moment z: ${results.momentZUtil}%`,
      `Buckling: χy = ${results.chiY}, χz = ${results.chiZ}`,
      parseFloat(results.eq661) > parseFloat(results.eq662)
        ? 'Major axis buckling governs'
        : 'Minor axis buckling governs',
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
