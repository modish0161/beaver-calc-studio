// ============================================================================
// BeaverCalc Studio — Weld Sizing Report Data Builder
// Fillet & Butt Weld Design to EC3-1-8
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
 * Form data from the Weld Sizing calculator
 */
export interface WeldSizingFormData {
  // Weld Type
  weldType: string; // Fillet, Full penetration butt, Partial penetration
  weldPosition: string; // Flat, Horizontal, Vertical, Overhead

  // Weld Geometry
  weldLength: string; // mm
  legLength: string; // mm (for fillet)
  throatThickness: string; // mm (a)
  numberOfWelds: string; // 1 or 2 (single/double sided)

  // Joint Details
  jointType: string; // Lap, Tee, Corner, Butt
  plateThickness1: string; // mm
  plateThickness2: string; // mm
  gapBetweenPlates: string; // mm

  // Material
  steelGrade: string; // S275, S355
  electrodeClass: string; // E35, E42, E50
  correlationFactor: string; // βw

  // Applied Forces (per weld length)
  appliedShearLong: string; // kN (parallel to weld)
  appliedShearPerp: string; // kN (perpendicular in plane)
  appliedTension: string; // kN (perpendicular to throat)
  appliedMoment: string; // kNm

  // Connection Length
  connectionWidth: string; // mm
  eccentricity: string; // mm
}

/**
 * Results from the Weld Sizing calculator
 */
export interface WeldSizingResults {
  // Weld Properties
  effectiveThroat: string;
  effectiveLength: string;
  weldArea: string;

  // Material Properties
  fu: string;
  fvwd: string; // Design shear strength

  // Stress Components
  normalStress: string; // σ⊥
  shearStressPara: string; // τ∥
  shearStressPerp: string; // τ⊥

  // Directional Method
  vonMisesStress: string;
  vonMisesLimit: string;
  vonMisesUtil: string;
  vonMisesStatus: string;

  // Normal Stress Check
  normalStressLimit: string;
  normalUtil: string;
  normalStatus: string;

  // Simplified Method
  resultantForce: string;
  weldResistance: string;
  simplifiedUtil: string;
  simplifiedStatus: string;

  // Geometry Checks
  minLegLength: string;
  maxLegLength: string;
  minWeldLength: string;
  geometryStatus: string;

  // Overall
  governingMethod: string;
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
 * Build a ReportData object from Weld Sizing calculator results
 */
export function buildWeldSizingReport(
  formData: WeldSizingFormData,
  results: WeldSizingResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const overallStatus: 'PASS' | 'FAIL' = results.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

  // Build meta
  const meta = {
    title: 'Weld Sizing Design',
    projectName: options.projectName || 'Welded Connection',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `WS-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Weld Sizing',
    designCodes: ['BS EN 1993-1-8:2005', 'UK NA'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.weldType} weld, ${formData.jointType} joint configuration.
    ${formData.legLength}mm leg (a=${results.effectiveThroat}mm throat), 
    ${formData.weldLength}mm long${formData.numberOfWelds === '2' ? ' (double-sided)' : ''}.
    ${formData.steelGrade} parent material, ${formData.electrodeClass} electrode.`,
    keyResults: [
      { label: 'Weld Type', value: formData.weldType },
      { label: 'Throat Thickness a', value: `${results.effectiveThroat} mm`, highlight: true },
      { label: 'Effective Length', value: `${results.effectiveLength} mm` },
      { label: 'Overall Utilisation', value: `${results.overallUtil}%` },
      { label: 'Governing Check', value: results.governingMethod },
    ],
    overallStatus,
    governingCheck: results.governingMethod,
    utilisationSummary: `${results.overallUtil}% (${results.governingMethod})`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Weld Configuration',
        parameters: [
          { name: 'Weld Type', value: formData.weldType },
          { name: 'Joint Type', value: formData.jointType },
          { name: 'Weld Position', value: formData.weldPosition },
          {
            name: 'Number of Welds',
            value: formData.numberOfWelds === '2' ? 'Double-sided' : 'Single-sided',
          },
        ],
      },
      {
        title: 'Weld Geometry',
        parameters: [
          { name: 'Weld Length', value: formData.weldLength, unit: 'mm' },
          { name: 'Leg Length', value: formData.legLength, unit: 'mm' },
          { name: 'Throat Thickness (calc)', value: results.effectiveThroat, unit: 'mm' },
          { name: 'Effective Length', value: results.effectiveLength, unit: 'mm' },
          { name: 'Weld Area', value: results.weldArea, unit: 'mm²' },
        ],
      },
      {
        title: 'Joint Details',
        parameters: [
          { name: 'Plate Thickness 1', value: formData.plateThickness1, unit: 'mm' },
          { name: 'Plate Thickness 2', value: formData.plateThickness2, unit: 'mm' },
          { name: 'Gap', value: formData.gapBetweenPlates, unit: 'mm' },
        ],
      },
      {
        title: 'Material Properties',
        parameters: [
          { name: 'Steel Grade', value: formData.steelGrade },
          { name: 'Electrode Class', value: formData.electrodeClass },
          { name: 'Ultimate Strength fu', value: results.fu, unit: 'MPa' },
          { name: 'Correlation Factor βw', value: formData.correlationFactor },
          { name: 'Design Shear Strength fvw.d', value: results.fvwd, unit: 'MPa' },
        ],
      },
      {
        title: 'Applied Forces',
        parameters: [
          { name: 'Shear (parallel) F∥', value: formData.appliedShearLong, unit: 'kN' },
          { name: 'Shear (perpendicular) F⊥', value: formData.appliedShearPerp, unit: 'kN' },
          { name: 'Tension (normal)', value: formData.appliedTension, unit: 'kN' },
          { name: 'Moment', value: formData.appliedMoment, unit: 'kNm' },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Geometry Requirements',
      description: 'Weld size limits (EC3-1-8 Cl.4.5)',
      checks: [
        {
          name: 'Minimum Leg Length',
          formula: 'a ≥ 3mm',
          calculated: `${formData.legLength} mm`,
          limit: `≥ ${results.minLegLength} mm`,
          utilisation: parseFloat(results.minLegLength) / parseFloat(formData.legLength),
          status: results.geometryStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Maximum Leg Length',
          formula: 'a ≤ 0.7 × t_min',
          calculated: `${formData.legLength} mm`,
          limit: `≤ ${results.maxLegLength} mm`,
          utilisation: parseFloat(formData.legLength) / parseFloat(results.maxLegLength),
          status: results.geometryStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Minimum Length',
          formula: 'L ≥ 6a or 30mm',
          calculated: `${formData.weldLength} mm`,
          limit: `≥ ${results.minWeldLength} mm`,
          utilisation: parseFloat(results.minWeldLength) / parseFloat(formData.weldLength),
          status: results.geometryStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Directional Method (EC3-1-8 Cl.4.5.3.2)',
      description: 'Stress components resolved on throat plane',
      checks: [
        {
          name: 'Von Mises Equivalent',
          formula: '√(σ⊥² + 3(τ⊥² + τ∥²)) ≤ fu/(βw×γM2)',
          calculated: `${results.vonMisesStress} MPa`,
          limit: `≤ ${results.vonMisesLimit} MPa`,
          utilisation: parseFloat(results.vonMisesUtil) / 100,
          status: results.vonMisesStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Normal Stress Check',
          formula: 'σ⊥ ≤ 0.9×fu/γM2',
          calculated: `${results.normalStress} MPa`,
          limit: `≤ ${results.normalStressLimit} MPa`,
          utilisation: parseFloat(results.normalUtil) / 100,
          status: results.normalStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Simplified Method (EC3-1-8 Cl.4.5.3.3)',
      description: 'Resultant force per unit length',
      checks: [
        {
          name: 'Resultant vs Resistance',
          formula: 'Fw,Ed ≤ Fw,Rd',
          calculated: `${results.resultantForce} kN/mm`,
          limit: `≤ ${results.weldResistance} kN/mm`,
          utilisation: parseFloat(results.simplifiedUtil) / 100,
          status: results.simplifiedStatus as 'PASS' | 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Effective Throat Calculation',
      steps: [
        {
          description: 'Leg length provided',
          formula: 's = leg',
          result: `s = ${formData.legLength} mm`,
        },
        {
          description: 'Throat thickness (fillet)',
          formula: 'a = 0.7 × s',
          substitution: `a = 0.7 × ${formData.legLength}`,
          result: `a = ${results.effectiveThroat} mm`,
        },
        {
          description: 'Effective length',
          formula: 'Leff = L - 2a (for returns)',
          result: `Leff = ${results.effectiveLength} mm`,
        },
        {
          description: 'Weld throat area',
          formula: 'Aw = n × a × Leff',
          result: `Aw = ${results.weldArea} mm²`,
        },
      ],
    },
    {
      title: 'Material Strength',
      steps: [
        {
          description: 'Steel ultimate strength',
          formula: `${formData.steelGrade}`,
          result: `fu = ${results.fu} MPa`,
        },
        {
          description: 'Correlation factor',
          formula: `For ${formData.steelGrade}`,
          result: `βw = ${formData.correlationFactor}`,
        },
        {
          description: 'Design shear strength',
          formula: 'fvw.d = fu / (√3 × βw × γM2)',
          substitution: `fvw.d = ${results.fu} / (√3 × ${formData.correlationFactor} × 1.25)`,
          result: `fvw.d = ${results.fvwd} MPa`,
        },
      ],
    },
    {
      title: 'Stress Components',
      steps: [
        {
          description: 'Parallel shear stress',
          formula: 'τ∥ = F∥ / Aw',
          result: `τ∥ = ${results.shearStressPara} MPa`,
        },
        {
          description: 'Perpendicular shear stress',
          formula: 'τ⊥ = F⊥ / (Aw × √2)',
          result: `τ⊥ = ${results.shearStressPerp} MPa`,
        },
        {
          description: 'Normal stress',
          formula: 'σ⊥ = FN / (Aw × √2)',
          result: `σ⊥ = ${results.normalStress} MPa`,
        },
      ],
    },
    {
      title: 'Von Mises Equivalent Stress',
      steps: [
        {
          description: 'Equivalent stress formula',
          formula: 'σeq = √(σ⊥² + 3(τ⊥² + τ∥²))',
          substitution: `σeq = √(${results.normalStress}² + 3(${results.shearStressPerp}² + ${results.shearStressPara}²))`,
          result: `σeq = ${results.vonMisesStress} MPa`,
        },
        {
          description: 'Limit stress',
          formula: 'σlim = fu / (βw × γM2)',
          substitution: `σlim = ${results.fu} / (${formData.correlationFactor} × 1.25)`,
          result: `σlim = ${results.vonMisesLimit} MPa`,
        },
        {
          description: 'Utilisation',
          formula: 'Util = σeq / σlim × 100',
          result: `${results.vonMisesUtil}%`,
        },
      ],
    },
    {
      title: 'Simplified Method Check',
      steps: [
        {
          description: 'Resultant force per unit length',
          formula: 'Fw,Ed = √(F∥² + F⊥²) / L',
          result: `Fw,Ed = ${results.resultantForce} kN/mm`,
        },
        {
          description: 'Weld resistance per unit length',
          formula: 'Fw,Rd = a × fvw.d',
          substitution: `Fw,Rd = ${results.effectiveThroat} × ${results.fvwd} / 1000`,
          result: `Fw,Rd = ${results.weldResistance} kN/mm`,
        },
        {
          description: 'Simplified utilisation',
          formula: 'Util = Fw,Ed / Fw,Rd × 100',
          result: `${results.simplifiedUtil}%`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.legLength) > parseFloat(formData.plateThickness1) * 0.7) {
    reportWarnings.push({
      type: 'warning',
      message: 'Leg length may exceed practical limit for plate thickness',
    });
  }

  if (formData.weldPosition === 'Overhead') {
    reportWarnings.push({
      type: 'info',
      message: 'Overhead welding - specify qualified welder procedure',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `${formData.legLength}mm ${formData.weldType.toLowerCase()} weld is ADEQUATE. 
         Throat a=${results.effectiveThroat}mm, ${results.governingMethod} governs at ${results.overallUtil}% utilisation.`
        : `Weld is INADEQUATE at ${results.overallUtil}% utilisation. Increase leg length or weld length.`,
    status: overallStatus,
    recommendations: [
      `Specify ${formData.legLength}mm continuous ${formData.weldType.toLowerCase()} weld`,
      `Electrode: ${formData.electrodeClass} minimum (to match ${formData.steelGrade})`,
      `Weld quality: ISO 5817 Level C minimum`,
      `Pre-heat requirements per EN 1011 if thickness > 25mm`,
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
