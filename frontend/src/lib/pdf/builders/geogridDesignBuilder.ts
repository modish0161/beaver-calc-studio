// ============================================================================
// BeaverCalc Studio — Geogrid Design Report Data Builder
// Transforms calculator results into ReportData format for premium PDF export
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
 * Form data from the Geogrid Design calculator
 */
export interface GeogridDesignFormData {
  // Loading
  appliedLoad: string;
  loadType: 'point' | 'distributed';
  loadArea: string;

  // Soil Properties
  soilCBR: string;
  subgradeCBR: string;
  soilType: string;

  // Geogrid Properties
  geogridType: string;
  geogridStrength: string;

  // Platform
  platformThickness: string;
  aggregateType: string;

  // Project
  projectTitle: string;
}

/**
 * Results from the Geogrid Design calculator
 */
export interface GeogridDesignResults {
  // Design Calculations
  requiredThickness: string;
  unreinforcedThickness: string;
  thicknessReduction: string;
  thicknessReductionPercent: string;

  // Load Distribution
  contactPressure: string;
  spreadAngle: string;
  effectiveWidth: string;

  // Bearing Capacity
  subgradeBearing: string;
  designBearing: string;
  bearingUtilisation: string;
  bearingStatus: string;

  // Geogrid Check
  requiredStrength: string;
  providedStrength: string;
  strengthUtilisation: string;
  strengthStatus: string;

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
 * Build a ReportData object from Geogrid Design calculator results
 */
export function buildGeogridDesignReport(
  formData: GeogridDesignFormData,
  results: GeogridDesignResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status
  const allStatuses = [results.bearingStatus, results.strengthStatus];
  const overallStatus: 'PASS' | 'FAIL' = allStatuses.includes('FAIL') ? 'FAIL' : 'PASS';

  // Build meta
  const meta = {
    title: 'Geogrid Reinforced Platform Design',
    projectName: options.projectName || formData.projectTitle || 'Geogrid Design',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `GEO-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Geogrid Design',
    designCodes: ['BS 8006-1:2010', 'Eurocode 7'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Geogrid reinforced platform design for ${formData.loadType} loading of ${formData.appliedLoad} kN. 
    The platform uses ${formData.geogridType} geogrid with ${formData.aggregateType} aggregate to achieve 
    adequate load distribution over ${formData.soilType} subgrade with CBR of ${formData.subgradeCBR}%.`,
    keyResults: [
      {
        label: 'Required Platform Thickness',
        value: `${results.requiredThickness} mm`,
        highlight: true,
      },
      { label: 'Unreinforced Thickness', value: `${results.unreinforcedThickness} mm` },
      { label: 'Thickness Reduction', value: `${results.thicknessReductionPercent}%` },
      {
        label: 'Bearing Utilisation',
        value: `${(parseFloat(results.bearingUtilisation) * 100).toFixed(0)}%`,
      },
      {
        label: 'Geogrid Utilisation',
        value: `${(parseFloat(results.strengthUtilisation) * 100).toFixed(0)}%`,
      },
    ],
    overallStatus,
    governingCheck:
      parseFloat(results.bearingUtilisation) > parseFloat(results.strengthUtilisation)
        ? 'Subgrade Bearing'
        : 'Geogrid Strength',
    utilisationSummary: `Maximum utilisation: ${Math.max(
      parseFloat(results.bearingUtilisation),
      parseFloat(results.strengthUtilisation),
    ).toFixed(2)}`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Loading Parameters',
        parameters: [
          { name: 'Applied Load', value: formData.appliedLoad, unit: 'kN' },
          {
            name: 'Load Type',
            value: formData.loadType === 'point' ? 'Point Load' : 'Distributed Load',
          },
          { name: 'Load Area', value: formData.loadArea, unit: 'm²' },
        ],
      },
      {
        title: 'Soil Properties',
        parameters: [
          { name: 'Soil Type', value: formData.soilType },
          { name: 'Platform Fill CBR', value: formData.soilCBR, unit: '%' },
          { name: 'Subgrade CBR', value: formData.subgradeCBR, unit: '%' },
        ],
      },
      {
        title: 'Geogrid Properties',
        parameters: [
          { name: 'Geogrid Type', value: formData.geogridType },
          { name: 'Geogrid Strength', value: formData.geogridStrength, unit: 'kN/m' },
        ],
      },
      {
        title: 'Platform Design',
        parameters: [
          { name: 'Platform Thickness', value: formData.platformThickness, unit: 'mm' },
          { name: 'Aggregate Type', value: formData.aggregateType },
        ],
      },
    ],
  };

  // Build design checks
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Bearing Capacity Check',
      description: 'Verification of subgrade bearing capacity under distributed load',
      checks: [
        {
          name: 'Contact Pressure',
          formula: 'σ = P / A_eff',
          calculated: `${results.contactPressure} kPa`,
          limit: `≤ ${results.subgradeBearing} kPa`,
          utilisation: parseFloat(results.bearingUtilisation),
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Geogrid Strength Check',
      description: 'Verification of geogrid tensile strength under membrane action',
      checks: [
        {
          name: 'Required Geogrid Strength',
          formula: 'T_req = f(P, geometry)',
          calculated: `${results.requiredStrength} kN/m`,
          limit: `≤ ${results.providedStrength} kN/m`,
          utilisation: parseFloat(results.strengthUtilisation),
          status: results.strengthStatus as 'PASS' | 'FAIL',
        },
      ],
    },
    {
      title: 'Platform Thickness',
      description: 'Comparison of reinforced vs unreinforced platform requirements',
      checks: [
        {
          name: 'Platform Thickness Adequacy',
          formula: 'D_provided ≥ D_required',
          calculated: `${formData.platformThickness} mm`,
          limit: `≥ ${results.requiredThickness} mm`,
          utilisation:
            parseFloat(results.requiredThickness) / parseFloat(formData.platformThickness),
          status:
            parseFloat(formData.platformThickness) >= parseFloat(results.requiredThickness)
              ? 'PASS'
              : 'FAIL',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Load Distribution Calculation',
      steps: [
        {
          description: 'Calculate contact pressure at platform surface',
          formula: 'σ_0 = P / A_load',
          substitution: `σ_0 = ${formData.appliedLoad} / ${formData.loadArea}`,
          result: `${results.contactPressure} kPa`,
        },
        {
          description: 'Determine load spread angle with geogrid',
          formula: 'α = 45° for reinforced platform',
          result: `${results.spreadAngle}°`,
        },
        {
          description: 'Calculate effective width at subgrade',
          formula: 'B_eff = B_0 + 2 × D × tan(α)',
          result: `${results.effectiveWidth} m`,
        },
      ],
    },
    {
      title: 'Thickness Design',
      steps: [
        {
          description: 'Unreinforced platform thickness (Giroud method)',
          formula: 'D_unreinf = f(P, CBR_subgrade)',
          result: `${results.unreinforcedThickness} mm`,
        },
        {
          description: 'Reinforced platform thickness',
          formula: 'D_reinf = D_unreinf × reduction_factor',
          result: `${results.requiredThickness} mm`,
        },
        {
          description: 'Thickness reduction achieved',
          formula: 'Reduction = (D_unreinf - D_reinf) / D_unreinf × 100',
          result: `${results.thicknessReductionPercent}%`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type:
      w.toLowerCase().includes('fail') || w.toLowerCase().includes('exceed') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.subgradeCBR) < 1) {
    reportWarnings.push({
      type: 'warning',
      message: 'Very low subgrade CBR - consider ground improvement before platform construction',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary:
      overallStatus === 'PASS'
        ? `The geogrid reinforced platform design is ADEQUATE. A ${results.requiredThickness}mm thick 
         ${formData.aggregateType} platform with ${formData.geogridType} geogrid provides sufficient 
         load distribution and bearing capacity for the design loads.`
        : `The geogrid reinforced platform design is INADEQUATE. Review the failing checks and consider 
         increasing platform thickness, using a stronger geogrid, or ground improvement.`,
    status: overallStatus,
    recommendations: [
      `Use ${formData.geogridType} geogrid at base of granular platform`,
      `Minimum platform thickness: ${results.requiredThickness}mm of ${formData.aggregateType}`,
      `Compact aggregate to 95% relative compaction`,
      `Ensure geogrid overlap of minimum 300mm at joints`,
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
