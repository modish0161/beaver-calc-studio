// ============================================================================
// BeaverCalc Studio — Load Combinations Report Data Builder
// ULS/SLS Load Combinations to EC0
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
 * Form data from the Load Combinations calculator
 */
export interface LoadCombinationsFormData {
  // Structure Type
  structureType: string; // Building, Bridge, Temporary
  designSituation: string; // Persistent, Transient, Accidental, Seismic

  // Permanent Actions
  selfWeight: string; // kN/m² or kN/m
  superimposedDead: string;
  earthPressure: string;
  waterPressure: string;
  prestress: string;

  // Variable Actions
  imposedFloor: string; // kN/m²
  imposedRoof: string;
  imposedCategory: string; // A, B, C, D, E, F, G, H
  snowLoad: string;
  windLoad: string;
  thermalLoad: string;
  trafficLoad: string;

  // Accidental Actions
  impact: string;
  explosion: string;
  fire: string;

  // Combination Factors
  psi0Imposed: string; // ψ₀
  psi1Imposed: string; // ψ₁
  psi2Imposed: string; // ψ₂
  psi0Snow: string;
  psi1Snow: string;
  psi2Snow: string;
  psi0Wind: string;
  psi1Wind: string;
  psi2Wind: string;

  // Partial Factors (editable)
  gammaGUnfav: string; // γG,unfav = 1.35
  gammaGFav: string; // γG,fav = 1.0
  gammaQUnfav: string; // γQ = 1.5
  gammaQFav: string; // γQ = 0

  // Options
  includeFavourable: string; // Yes/No (for counteracting loads)
  useEquation610: string; // Yes/No (vs 6.10a/6.10b)
}

/**
 * Results from the Load Combinations calculator
 */
export interface LoadCombinationsResults {
  // ULS Combinations (persistent/transient)
  ulsSTR_EQ610: string; // kN/m² (Equation 6.10)
  ulsSTR_EQ610a: string; // Equation 6.10a
  ulsSTR_EQ610b: string; // Equation 6.10b
  ulsSTR_governing: string;
  ulsGEO: string; // Geotechnical

  // ULS with different leading actions
  ulsImposedLeading: string;
  ulsSnowLeading: string;
  ulsWindLeading: string;

  // Favourable combinations
  ulsFavourable: string;

  // EQU (equilibrium)
  ulsEQU: string;

  // Accidental combinations
  ulsAccidental: string;

  // SLS Combinations
  slsCharacteristic: string;
  slsFrequent: string;
  slsQuasiPermanent: string;

  // Component Breakdown (for governing ULS)
  permanentContribution: string; // kN/m²
  leadingVariableContribution: string;
  accompanyingContribution: string;

  // Summary
  governingCombination: string;
  governingValue: string;

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
 * Build a ReportData object from Load Combinations calculator results
 */
export function buildLoadCombinationsReport(
  formData: LoadCombinationsFormData,
  results: LoadCombinationsResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Load calcs always PASS
  const overallStatus: 'PASS' | 'FAIL' = 'PASS';

  // Build meta
  const meta = {
    title: 'Load Combinations',
    projectName: options.projectName || 'Structural Loading',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `LCM-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Load Combinations',
    designCodes: ['BS EN 1990:2002+A1', 'UK NA to EN 1990'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.structureType} load combinations for ${formData.designSituation} design.
    Gk = ${formData.selfWeight} + ${formData.superimposedDead} kN/m².
    Qk = ${formData.imposedFloor} (Cat ${formData.imposedCategory}), Snow = ${formData.snowLoad}, Wind = ${formData.windLoad}.
    Using ${formData.useEquation610 === 'Yes' ? 'Equation 6.10' : 'Equations 6.10a/6.10b'}.`,
    keyResults: [
      { label: 'ULS (STR)', value: `${results.ulsSTR_governing} kN/m²`, highlight: true },
      { label: 'ULS (EQU)', value: `${results.ulsEQU} kN/m²` },
      { label: 'SLS Char', value: `${results.slsCharacteristic} kN/m²` },
      { label: 'SLS Freq', value: `${results.slsFrequent} kN/m²` },
      { label: 'SLS QP', value: `${results.slsQuasiPermanent} kN/m²` },
    ],
    overallStatus,
    governingCheck: results.governingCombination,
    utilisationSummary: `Governing: ${results.governingValue} kN/m²`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Design Situation',
        parameters: [
          { name: 'Structure Type', value: formData.structureType },
          { name: 'Design Situation', value: formData.designSituation },
          {
            name: 'Equation Used',
            value: formData.useEquation610 === 'Yes' ? '6.10' : '6.10a/6.10b',
          },
        ],
      },
      {
        title: 'Permanent Actions (Gk)',
        parameters: [
          { name: 'Self-weight', value: formData.selfWeight, unit: 'kN/m²' },
          { name: 'Superimposed Dead', value: formData.superimposedDead, unit: 'kN/m²' },
          { name: 'Earth Pressure', value: formData.earthPressure || '0', unit: 'kN/m²' },
          { name: 'Water Pressure', value: formData.waterPressure || '0', unit: 'kN/m²' },
          { name: 'Prestress', value: formData.prestress || '0', unit: 'kN/m²' },
        ],
      },
      {
        title: 'Variable Actions (Qk)',
        parameters: [
          {
            name: 'Imposed (floor)',
            value: formData.imposedFloor,
            unit: 'kN/m²',
            note: `Cat ${formData.imposedCategory}`,
          },
          { name: 'Imposed (roof)', value: formData.imposedRoof || '0', unit: 'kN/m²' },
          { name: 'Snow', value: formData.snowLoad, unit: 'kN/m²' },
          { name: 'Wind', value: formData.windLoad, unit: 'kN/m²' },
          { name: 'Thermal', value: formData.thermalLoad || '0', unit: 'kN/m²' },
        ],
      },
      {
        title: 'ψ Factors (Imposed)',
        parameters: [
          { name: 'ψ₀', value: formData.psi0Imposed },
          { name: 'ψ₁', value: formData.psi1Imposed },
          { name: 'ψ₂', value: formData.psi2Imposed },
        ],
      },
      {
        title: 'ψ Factors (Snow)',
        parameters: [
          { name: 'ψ₀', value: formData.psi0Snow },
          { name: 'ψ₁', value: formData.psi1Snow },
          { name: 'ψ₂', value: formData.psi2Snow },
        ],
      },
      {
        title: 'ψ Factors (Wind)',
        parameters: [
          { name: 'ψ₀', value: formData.psi0Wind },
          { name: 'ψ₁', value: formData.psi1Wind },
          { name: 'ψ₂', value: formData.psi2Wind },
        ],
      },
      {
        title: 'Partial Factors',
        parameters: [
          { name: 'γG,unfav', value: formData.gammaGUnfav },
          { name: 'γG,fav', value: formData.gammaGFav },
          { name: 'γQ,unfav', value: formData.gammaQUnfav },
          { name: 'γQ,fav', value: formData.gammaQFav },
        ],
      },
    ],
  };

  // Build design checks (load combinations output)
  const designChecks: DesignCheckSection[] = [
    {
      title: 'ULS Combinations (STR/GEO)',
      description: 'EC0 Cl.6.4.3.2',
      checks: [
        {
          name: 'Equation 6.10',
          formula: 'Σ γG,j Gk,j + γQ,1 Qk,1 + Σ γQ,i ψ0,i Qk,i',
          calculated: `${results.ulsSTR_EQ610} kN/m²`,
          limit: 'Single expression',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Equation 6.10a',
          formula: 'Σ γG,j Gk,j + γQ,1 ψ0,1 Qk,1 + Σ γQ,i ψ0,i Qk,i',
          calculated: `${results.ulsSTR_EQ610a} kN/m²`,
          limit: 'Less favourable of 6.10a/b',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Equation 6.10b',
          formula: 'Σ ξ γG,j Gk,j + γQ,1 Qk,1 + Σ γQ,i ψ0,i Qk,i',
          calculated: `${results.ulsSTR_EQ610b} kN/m²`,
          limit: 'ξ = 0.925',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Governing ULS (STR)',
          formula: 'max(6.10, 6.10a, 6.10b)',
          calculated: `${results.ulsSTR_governing} kN/m²`,
          limit: 'For strength design',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'ULS by Leading Action',
      description: 'Different leading variable actions',
      checks: [
        {
          name: 'Imposed Leading',
          formula: `γG Gk + γQ Qk,imp + Σ γQ ψ0 Qk,i`,
          calculated: `${results.ulsImposedLeading} kN/m²`,
          limit: 'Imposed as leading',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Snow Leading',
          formula: `γG Gk + γQ Qk,snow + Σ γQ ψ0 Qk,i`,
          calculated: `${results.ulsSnowLeading} kN/m²`,
          limit: 'Snow as leading',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Wind Leading',
          formula: `γG Gk + γQ Qk,wind + Σ γQ ψ0 Qk,i`,
          calculated: `${results.ulsWindLeading} kN/m²`,
          limit: 'Wind as leading',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'ULS Equilibrium (EQU)',
      description: 'EC0 Table A1.2(A)',
      checks: [
        {
          name: 'EQU Combination',
          formula: 'γG,dst = 1.1, γG,stb = 0.9, γQ = 1.5',
          calculated: `${results.ulsEQU} kN/m²`,
          limit: 'For overturning/uplift',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Favourable Case',
          formula: 'γG,fav Gk (counteracting)',
          calculated: `${results.ulsFavourable} kN/m²`,
          limit: 'Stabilizing',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'SLS Combinations',
      description: 'EC0 Cl.6.5.3',
      checks: [
        {
          name: 'Characteristic',
          formula: 'Σ Gk,j + Qk,1 + Σ ψ0,i Qk,i',
          calculated: `${results.slsCharacteristic} kN/m²`,
          limit: 'Irreversible SLS',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Frequent',
          formula: 'Σ Gk,j + ψ1,1 Qk,1 + Σ ψ2,i Qk,i',
          calculated: `${results.slsFrequent} kN/m²`,
          limit: 'Reversible SLS',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Quasi-permanent',
          formula: 'Σ Gk,j + Σ ψ2,i Qk,i',
          calculated: `${results.slsQuasiPermanent} kN/m²`,
          limit: 'Long-term effects',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    ...(formData.designSituation === 'Accidental'
      ? [
          {
            title: 'Accidental Combination',
            description: 'EC0 Cl.6.4.3.3',
            checks: [
              {
                name: 'Accidental',
                formula: 'Σ Gk,j + Ad + (ψ1,1 or ψ2,1) Qk,1 + Σ ψ2,i Qk,i',
                calculated: `${results.ulsAccidental} kN/m²`,
                limit: 'With accidental action',
                utilisation: 0,
                status: 'PASS' as const,
              },
            ],
          },
        ]
      : []),
  ];

  // Build detailed calculations
  const totalPermanent = parseFloat(formData.selfWeight) + parseFloat(formData.superimposedDead);

  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Permanent Actions',
      steps: [
        {
          description: 'Self-weight',
          formula: 'From structural analysis',
          result: `Gk,1 = ${formData.selfWeight} kN/m²`,
        },
        {
          description: 'Superimposed dead',
          formula: 'Finishes, services, partitions',
          result: `Gk,2 = ${formData.superimposedDead} kN/m²`,
        },
        {
          description: 'Total permanent',
          formula: 'ΣGk = Gk,1 + Gk,2',
          result: `ΣGk = ${totalPermanent.toFixed(2)} kN/m²`,
        },
      ],
    },
    {
      title: 'Variable Actions',
      steps: [
        {
          description: 'Imposed load',
          formula: `Category ${formData.imposedCategory} from Table NA.3`,
          result: `Qk,imp = ${formData.imposedFloor} kN/m²`,
        },
        {
          description: 'Snow load',
          formula: 'From EN 1991-1-3',
          result: `Qk,snow = ${formData.snowLoad} kN/m²`,
        },
        {
          description: 'Wind load',
          formula: 'From EN 1991-1-4',
          result: `Qk,wind = ${formData.windLoad} kN/m²`,
        },
      ],
    },
    {
      title: 'ULS Equation 6.10',
      steps: [
        {
          description: 'Factored permanent',
          formula: `γG × ΣGk = ${formData.gammaGUnfav} × ${totalPermanent.toFixed(2)}`,
          result: `${(parseFloat(formData.gammaGUnfav) * totalPermanent).toFixed(2)} kN/m²`,
        },
        {
          description: 'Leading variable (imposed)',
          formula: `γQ × Qk,1 = ${formData.gammaQUnfav} × ${formData.imposedFloor}`,
          result: `${(parseFloat(formData.gammaQUnfav) * parseFloat(formData.imposedFloor)).toFixed(2)} kN/m²`,
        },
        {
          description: 'Accompanying (snow)',
          formula: `γQ × ψ0 × Qk,snow = ${formData.gammaQUnfav} × ${formData.psi0Snow} × ${formData.snowLoad}`,
          result: `${(parseFloat(formData.gammaQUnfav) * parseFloat(formData.psi0Snow) * parseFloat(formData.snowLoad)).toFixed(2)} kN/m²`,
        },
        {
          description: 'Total ULS (6.10)',
          formula: 'Σ factored loads',
          result: `${results.ulsSTR_EQ610} kN/m²`,
        },
      ],
    },
    {
      title: 'ULS Equations 6.10a/6.10b',
      steps: [
        {
          description: 'Equation 6.10a',
          formula: `${formData.gammaGUnfav}ΣGk + ${formData.gammaQUnfav}×ψ0×Qk,1 + Σ${formData.gammaQUnfav}×ψ0×Qk,i`,
          result: `${results.ulsSTR_EQ610a} kN/m²`,
        },
        {
          description: 'Equation 6.10b',
          formula: `ξ×${formData.gammaGUnfav}ΣGk + ${formData.gammaQUnfav}×Qk,1 + Σ${formData.gammaQUnfav}×ψ0×Qk,i`,
          substitution: 'ξ = 0.925 (UK NA)',
          result: `${results.ulsSTR_EQ610b} kN/m²`,
        },
        {
          description: 'Governing',
          formula: 'max(6.10a, 6.10b)',
          result: `${Math.max(parseFloat(results.ulsSTR_EQ610a), parseFloat(results.ulsSTR_EQ610b)).toFixed(2)} kN/m²`,
        },
      ],
    },
    {
      title: 'SLS Combinations',
      steps: [
        {
          description: 'Characteristic',
          formula: `ΣGk + Qk,1 + Σψ0×Qk,i`,
          substitution: `${totalPermanent.toFixed(2)} + ${formData.imposedFloor} + ${formData.psi0Snow}×${formData.snowLoad}`,
          result: `${results.slsCharacteristic} kN/m²`,
        },
        {
          description: 'Frequent',
          formula: `ΣGk + ψ1×Qk,1 + Σψ2×Qk,i`,
          result: `${results.slsFrequent} kN/m²`,
        },
        {
          description: 'Quasi-permanent',
          formula: `ΣGk + Σψ2×Qk,i`,
          result: `${results.slsQuasiPermanent} kN/m²`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (formData.useEquation610 === 'Yes') {
    reportWarnings.push({
      type: 'info',
      message: 'Using Eq.6.10 - check if 6.10a/b gives economy for design',
    });
  }

  if (parseFloat(formData.imposedFloor) > 7.5) {
    reportWarnings.push({
      type: 'info',
      message: 'High imposed load - confirm category and use',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary: `Load combinations calculated to BS EN 1990.
    Governing ULS (STR): ${results.ulsSTR_governing} kN/m² (${results.governingCombination}).
    SLS Characteristic: ${results.slsCharacteristic} kN/m².
    SLS Quasi-permanent: ${results.slsQuasiPermanent} kN/m².`,
    status: overallStatus,
    recommendations: [
      `Use ${results.ulsSTR_governing} kN/m² for ULS strength design`,
      `Use ${results.ulsFavourable} kN/m² for favourable (counteracting)`,
      `Use ${results.slsCharacteristic} kN/m² for SLS deflection check`,
      `Use ${results.slsQuasiPermanent} kN/m² for long-term effects`,
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
