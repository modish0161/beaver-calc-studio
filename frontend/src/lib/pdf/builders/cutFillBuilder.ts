// ============================================================================
// BeaverCalc Studio — Cut & Fill Volumes Report Data Builder
// Earthworks Volume Calculation
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
 * Form data from the Cut & Fill Calculator
 */
export interface CutFillFormData {
  // Site Geometry
  calculationMethod: string; // Grid, Cross-section, Average end area
  gridSpacing: string; // m
  siteLength: string; // m
  siteWidth: string; // m

  // Levels Data
  existingLevels: string; // Comma-separated or grid array
  proposedLevels: string; // Comma-separated or grid array
  numberOfPoints: string;

  // Formation
  formationLevel: string; // m AOD
  allowance: string; // mm (topsoil strip, etc.)

  // Material Properties
  bulkingFactor: string; // %
  shrinkageFactor: string; // %
  reusability: string; // % of cut suitable for fill

  // Disposal/Import
  disposeOfExcess: string; // Yes/No
  importRequired: string; // Yes/No
  materialType: string; // Clay, Granular, Rock, Mixed
}

/**
 * Results from the Cut & Fill Calculator
 */
export interface CutFillResults {
  // Site Summary
  totalSiteArea: string;
  numberOfGridCells: string;
  averageExistingLevel: string;
  averageProposedLevel: string;
  averageCutFill: string;

  // Cut Volumes
  grossCutVolume: string; // m³ (in-situ)
  bulkedCutVolume: string; // m³ (after bulking)
  reusableCutVolume: string; // m³
  disposalVolume: string; // m³

  // Fill Volumes
  grossFillVolume: string; // m³ (in-situ)
  compactedFillRequired: string; // m³ (accounting for shrinkage)
  fillFromCut: string; // m³
  importVolume: string; // m³

  // Balance
  netCutFill: string; // Positive = surplus cut, Negative = fill required
  balanceDescription: string; // "X m³ surplus" or "X m³ import required"
  isBalanced: string; // Yes/No (within tolerance)

  // Quantities by Zone (if applicable)
  zoneBreakdown: string;

  // Topsoil
  topsoilStrip: string; // m³
  topsoilRetain: string; // m³

  // Cost Estimate
  cutRate: string; // $/m³
  fillRate: string;
  importRate: string;
  disposalRate: string;
  estimatedCost: string;

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
 * Build a ReportData object from Cut & Fill calculator results
 */
export function buildCutFillReport(
  formData: CutFillFormData,
  results: CutFillResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Determine overall status (balanced is preferred)
  const overallStatus: 'PASS' | 'FAIL' = results.isBalanced === 'Yes' ? 'PASS' : 'PASS'; // Quantities calc doesn't really "fail"

  // Build meta
  const meta = {
    title: 'Cut & Fill Volume Calculation',
    projectName: options.projectName || 'Earthworks',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `CF-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Cut & Fill Volumes',
    designCodes: ['BS 6031:2009', 'HA 44/91', 'DMRB'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `Earthworks volume calculation for ${results.totalSiteArea} m² site.
    ${formData.calculationMethod} method with ${formData.gridSpacing}m grid.
    ${results.balanceDescription}.`,
    keyResults: [
      { label: 'Site Area', value: `${results.totalSiteArea} m²` },
      { label: 'Cut Volume', value: `${results.grossCutVolume} m³`, highlight: true },
      { label: 'Fill Volume', value: `${results.grossFillVolume} m³`, highlight: true },
      { label: 'Net Balance', value: `${results.netCutFill} m³` },
      { label: 'Import Required', value: `${results.importVolume} m³` },
    ],
    overallStatus,
    governingCheck: 'Volume Balance',
    utilisationSummary: results.balanceDescription,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Site Geometry',
        parameters: [
          { name: 'Calculation Method', value: formData.calculationMethod },
          { name: 'Grid Spacing', value: formData.gridSpacing, unit: 'm' },
          { name: 'Site Length', value: formData.siteLength, unit: 'm' },
          { name: 'Site Width', value: formData.siteWidth, unit: 'm' },
          { name: 'Total Area', value: results.totalSiteArea, unit: 'm²' },
          { name: 'Number of Grid Points', value: formData.numberOfPoints },
        ],
      },
      {
        title: 'Formation Levels',
        parameters: [
          { name: 'Formation Level', value: formData.formationLevel, unit: 'm AOD' },
          { name: 'Avg Existing Level', value: results.averageExistingLevel, unit: 'm AOD' },
          { name: 'Avg Proposed Level', value: results.averageProposedLevel, unit: 'm AOD' },
          { name: 'Topsoil Allowance', value: formData.allowance, unit: 'mm' },
        ],
      },
      {
        title: 'Material Factors',
        parameters: [
          { name: 'Material Type', value: formData.materialType },
          { name: 'Bulking Factor', value: formData.bulkingFactor, unit: '%' },
          { name: 'Shrinkage Factor', value: formData.shrinkageFactor, unit: '%' },
          { name: 'Reusability', value: formData.reusability, unit: '%' },
        ],
      },
      {
        title: 'Disposal/Import',
        parameters: [
          { name: 'Dispose Excess', value: formData.disposeOfExcess },
          { name: 'Import Required', value: formData.importRequired },
        ],
      },
    ],
  };

  // Build design checks (Volume summaries)
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Cut Volumes',
      description: 'Material to be excavated',
      checks: [
        {
          name: 'Gross Cut (in-situ)',
          formula: 'Σ grid areas × cut depths',
          calculated: `${results.grossCutVolume} m³`,
          limit: 'Calculated',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Bulked Cut',
          formula: 'Gross × (1 + bulking factor)',
          calculated: `${results.bulkedCutVolume} m³`,
          limit: 'For transport',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Reusable Cut',
          formula: 'Gross × reusability %',
          calculated: `${results.reusableCutVolume} m³`,
          limit: 'For fill',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Disposal Required',
          formula: 'Bulked - Reusable',
          calculated: `${results.disposalVolume} m³`,
          limit: 'Off-site',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Fill Volumes',
      description: 'Material to be placed',
      checks: [
        {
          name: 'Gross Fill (in-situ)',
          formula: 'Σ grid areas × fill depths',
          calculated: `${results.grossFillVolume} m³`,
          limit: 'Calculated',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Compacted Fill Required',
          formula: 'Gross / (1 - shrinkage factor)',
          calculated: `${results.compactedFillRequired} m³`,
          limit: 'Loose volume',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Fill from Site Cut',
          formula: 'min(reusable, required)',
          calculated: `${results.fillFromCut} m³`,
          limit: 'Reuse',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Import Required',
          formula: 'Required - from cut',
          calculated: `${results.importVolume} m³`,
          limit: 'External',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Volume Balance',
      description: 'Cut/Fill equilibrium',
      checks: [
        {
          name: 'Net Cut/Fill',
          formula: 'Cut - Fill',
          calculated: `${results.netCutFill} m³`,
          limit: 'Target: 0 (balanced)',
          utilisation: 0,
          status: results.isBalanced === 'Yes' ? 'PASS' : 'PASS',
        },
        {
          name: 'Balance Status',
          formula: results.balanceDescription,
          calculated: results.balanceDescription,
          limit: 'Information',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Topsoil',
      description: 'Stripping and retention',
      checks: [
        {
          name: 'Topsoil Strip',
          formula: 'Site area × strip depth',
          calculated: `${results.topsoilStrip} m³`,
          limit: 'Total strip',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Topsoil Retained',
          formula: 'For reinstatement',
          calculated: `${results.topsoilRetain} m³`,
          limit: 'Storage required',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Grid Method Calculation',
      steps: [
        {
          description: 'Grid cell area',
          formula: 'A_cell = spacing²',
          substitution: `A_cell = ${formData.gridSpacing}²`,
          result: `A_cell = ${Math.pow(parseFloat(formData.gridSpacing), 2)} m²`,
        },
        {
          description: 'Number of grid cells',
          formula: '(L/spacing) × (W/spacing)',
          result: `n = ${results.numberOfGridCells} cells`,
        },
        {
          description: 'Average depth change',
          formula: 'Σ(existing - proposed) / n',
          result: `Δh_avg = ${results.averageCutFill} m`,
        },
      ],
    },
    {
      title: 'Cut Volume Calculation',
      steps: [
        {
          description: 'Gross cut volume (in-situ)',
          formula: 'V_cut = Σ(A_cell × h_cut) where h > 0',
          result: `V_cut = ${results.grossCutVolume} m³`,
        },
        {
          description: 'Bulking adjustment',
          formula: 'V_bulked = V_cut × (1 + bulking%/100)',
          substitution: `V_bulked = ${results.grossCutVolume} × (1 + ${formData.bulkingFactor}/100)`,
          result: `V_bulked = ${results.bulkedCutVolume} m³`,
        },
        {
          description: 'Reusable portion',
          formula: 'V_reuse = V_cut × reusability%/100',
          substitution: `V_reuse = ${results.grossCutVolume} × ${formData.reusability}/100`,
          result: `V_reuse = ${results.reusableCutVolume} m³`,
        },
      ],
    },
    {
      title: 'Fill Volume Calculation',
      steps: [
        {
          description: 'Gross fill volume (in-situ)',
          formula: 'V_fill = Σ(A_cell × h_fill) where h < 0',
          result: `V_fill = ${results.grossFillVolume} m³`,
        },
        {
          description: 'Compacted fill required',
          formula: 'V_compact = V_fill / (1 - shrinkage%/100)',
          substitution: `V_compact = ${results.grossFillVolume} / (1 - ${formData.shrinkageFactor}/100)`,
          result: `V_compact = ${results.compactedFillRequired} m³`,
        },
        {
          description: 'Import volume',
          formula: 'V_import = max(0, V_compact - V_reuse)',
          result: `V_import = ${results.importVolume} m³`,
        },
      ],
    },
    {
      title: 'Volume Balance',
      steps: [
        {
          description: 'Net cut/fill',
          formula: 'Net = V_cut - V_fill',
          substitution: `Net = ${results.grossCutVolume} - ${results.grossFillVolume}`,
          result: `Net = ${results.netCutFill} m³`,
        },
        {
          description: 'Balance assessment',
          formula: 'Positive = surplus cut, Negative = fill needed',
          result: results.balanceDescription,
        },
      ],
    },
    {
      title: 'Topsoil Calculation',
      steps: [
        {
          description: 'Strip volume',
          formula: 'V_topsoil = Area × allowance',
          substitution: `V_topsoil = ${results.totalSiteArea} × ${parseFloat(formData.allowance) / 1000}`,
          result: `V_topsoil = ${results.topsoilStrip} m³`,
        },
        {
          description: 'Retention for reinstatement',
          formula: 'Assume 80% area needs topsoil',
          result: `V_retain = ${results.topsoilRetain} m³`,
        },
      ],
    },
  ];

  // Add cost estimate if available
  if (results.estimatedCost) {
    detailedCalculations.push({
      title: 'Cost Estimate',
      steps: [
        {
          description: 'Cut rate',
          formula: 'Per m³',
          result: `£${results.cutRate}/m³`,
        },
        {
          description: 'Fill rate',
          formula: 'Per m³ placed',
          result: `£${results.fillRate}/m³`,
        },
        {
          description: 'Import rate',
          formula: 'Per m³ delivered',
          result: `£${results.importRate}/m³`,
        },
        {
          description: 'Disposal rate',
          formula: 'Per m³ removed',
          result: `£${results.disposalRate}/m³`,
        },
        {
          description: 'Total estimate',
          formula: 'Σ(volume × rate)',
          result: `£${results.estimatedCost}`,
        },
      ],
    });
  }

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('import') ? 'warning' : 'info',
    message: w,
  }));

  if (parseFloat(results.importVolume) > 0) {
    reportWarnings.push({
      type: 'warning',
      message: `${results.importVolume} m³ imported fill required - verify source availability`,
    });
  }

  if (parseFloat(results.disposalVolume) > 0) {
    reportWarnings.push({
      type: 'info',
      message: `${results.disposalVolume} m³ surplus for disposal - check tip availability`,
    });
  }

  if (formData.materialType.toLowerCase().includes('clay')) {
    reportWarnings.push({
      type: 'warning',
      message: 'Clay material - moisture content affects workability and volume changes',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary: `Earthworks for ${results.totalSiteArea} m² site: ${results.grossCutVolume} m³ cut, 
    ${results.grossFillVolume} m³ fill. ${results.balanceDescription}.`,
    status: 'PASS',
    recommendations: [
      `Allow ${results.topsoilStrip} m³ topsoil storage`,
      results.isBalanced === 'Yes'
        ? 'Site is balanced - minimize import/export'
        : `Plan for ${parseFloat(results.netCutFill) > 0 ? 'disposal' : 'import'}`,
      `${formData.materialType} material - apply appropriate compaction specifications`,
      'Verify levels on site before commencing works',
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
