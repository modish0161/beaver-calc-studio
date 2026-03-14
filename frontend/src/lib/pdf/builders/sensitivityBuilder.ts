// =============================================================================
// Sensitivity Analysis PDF Report Builder
// Monte Carlo Simulation — Probabilistic Structural Analysis
// =============================================================================

import {
  ChecklistInput,
  GridInput,
  PageInput,
  ReportData,
  TableInput,
} from "../ReportDocument";

interface Parameter {
  id: string;
  name: string;
  label: string;
  nominal: string;
  min: string;
  max: string;
  unit: string;
  distribution: string;
  enabled: boolean;
}

interface SensitivityIndex {
  parameter: string;
  correlation: number;
  impact: number;
  rank: number;
}

interface Statistics {
  mean: number;
  stdDev: number;
  median: number;
  min: number;
  max: number;
  percentile5: number;
  percentile95: number;
  percentile99: number;
  failureCount: number;
  probabilityOfFailure: number;
  reliabilityIndex: number;
  sensitivities: SensitivityIndex[];
  histogram: { bin: number; count: number }[];
}

interface FormData {
  calculatorType: string;
  numSimulations: string;
  seed: string;
  targetReliability: string;
  projectName: string;
  reference: string;
}

interface ProjectInfo {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

// Calculator type names
const CALCULATOR_NAMES: Record<string, string> = {
  steel_beam: "Steel Beam (EN 1993)",
  composite_beam: "Composite Beam (EN 1994)",
  rc_beam: "RC Beam (EN 1992)",
  timber_beam: "Timber Beam (EN 1995)",
  pad_footing: "Pad Footing (EN 1997)",
  sheet_pile: "Sheet Pile Wall (EN 1997)",
};

export function buildSensitivityReport(
  form: FormData,
  parameters: Parameter[],
  statistics: Statistics,
  numResults: number,
  projectInfo: ProjectInfo,
): ReportData {
  const enabledParams = parameters.filter((p) => p.enabled);
  const reliabilityPass =
    statistics.reliabilityIndex >= parseFloat(form.targetReliability);

  const pages: PageInput[] = [
    // ===========================================
    // PAGE 1: EXECUTIVE SUMMARY
    // ===========================================
    {
      headerTitle: "Sensitivity Analysis Report",
      headerSubtitle: "Monte Carlo Simulation",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Analysis Summary",
          content: {
            type: "grid",
            columns: 2,
            items: [
              {
                label: "Project",
                value: form.projectName || "Sensitivity Analysis",
              },
              { label: "Reference", value: form.reference },
              {
                label: "Calculator Type",
                value:
                  CALCULATOR_NAMES[form.calculatorType] || form.calculatorType,
              },
              {
                label: "Number of Simulations",
                value: numResults.toLocaleString(),
              },
              {
                label: "Reliability Index (β)",
                value: statistics.reliabilityIndex.toFixed(2),
              },
              { label: "Target β", value: form.targetReliability },
              {
                label: "Reliability Check",
                value: reliabilityPass ? "PASS" : "FAIL",
                isStatus: true,
              },
              {
                label: "Failure Probability",
                value: `${statistics.probabilityOfFailure.toFixed(3)}%`,
              },
            ],
          } as GridInput,
        },
        {
          title: "Statistical Summary",
          content: {
            type: "table",
            headers: ["Statistic", "Value", "Unit"],
            rows: [
              ["Mean Utilisation", statistics.mean.toFixed(2), "%"],
              ["Standard Deviation", statistics.stdDev.toFixed(2), "%"],
              ["Median", statistics.median.toFixed(2), "%"],
              ["Minimum", statistics.min.toFixed(2), "%"],
              ["Maximum", statistics.max.toFixed(2), "%"],
              ["5th Percentile", statistics.percentile5.toFixed(2), "%"],
              ["95th Percentile", statistics.percentile95.toFixed(2), "%"],
              ["99th Percentile", statistics.percentile99.toFixed(2), "%"],
              [
                "Failure Count (U > 100%)",
                statistics.failureCount.toLocaleString(),
                "runs",
              ],
            ],
          } as TableInput,
        },
      ],
    },

    // ===========================================
    // PAGE 2: INPUT PARAMETERS
    // ===========================================
    {
      headerTitle: "Input Parameters",
      headerSubtitle: "Random Variable Definitions",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Varied Parameters",
          content: {
            type: "table",
            headers: [
              "Parameter",
              "Min",
              "Nominal",
              "Max",
              "Unit",
              "Distribution",
            ],
            rows: enabledParams.map((p) => [
              p.label,
              p.min,
              p.nominal,
              p.max,
              p.unit,
              p.distribution.charAt(0).toUpperCase() + p.distribution.slice(1),
            ]),
          } as TableInput,
        },
        {
          title: "Distribution Descriptions",
          content: {
            type: "grid",
            columns: 1,
            items: [
              {
                label: "Uniform",
                value: "Equal probability across entire range [min, max]",
              },
              {
                label: "Normal",
                value:
                  "Gaussian distribution centered on nominal value, 99.7% within range",
              },
              {
                label: "Triangular",
                value:
                  "Peak probability at nominal value, linear taper to min/max",
              },
              {
                label: "Log-Normal",
                value: "Skewed distribution, always positive values",
              },
            ],
          } as GridInput,
        },
      ],
    },

    // ===========================================
    // PAGE 3: SENSITIVITY ANALYSIS
    // ===========================================
    {
      headerTitle: "Sensitivity Analysis",
      headerSubtitle: "Parameter Influence Ranking",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Sensitivity Indices",
          content: {
            type: "table",
            headers: [
              "Rank",
              "Parameter",
              "Correlation",
              "Impact Factor",
              "Classification",
            ],
            rows: statistics.sensitivities.map((s) => [
              `#${s.rank}`,
              s.parameter,
              s.correlation.toFixed(4),
              s.impact.toFixed(3),
              s.correlation > 0.3
                ? "HIGH"
                : s.correlation > 0.1
                  ? "MEDIUM"
                  : "LOW",
            ]),
          } as TableInput,
        },
        {
          title: "Interpretation",
          content: {
            type: "grid",
            columns: 1,
            items: [
              {
                label: "Most Influential",
                value: statistics.sensitivities[0]?.parameter || "N/A",
              },
              {
                label: "Correlation Interpretation",
                value:
                  "Absolute correlation > 0.3 indicates strong influence on output variability",
              },
              {
                label: "Impact Factor",
                value:
                  "Product of correlation and standard deviation - indicates contribution to output variance",
              },
            ],
          } as GridInput,
        },
        {
          title: "Design Recommendations",
          content: {
            type: "checklist",
            items: [
              {
                label:
                  "Focus quality control on top-ranked sensitive parameters",
                checked: true,
              },
              {
                label:
                  "Consider tighter tolerances for high-sensitivity inputs",
                checked: true,
              },
              {
                label:
                  "Low-sensitivity parameters may use nominal values with confidence",
                checked: true,
              },
              {
                label:
                  "Verify material testing protocols for critical parameters",
                checked: statistics.sensitivities.some(
                  (s) => s.correlation > 0.3,
                ),
              },
            ],
          } as ChecklistInput,
        },
      ],
    },

    // ===========================================
    // PAGE 4: RELIABILITY ASSESSMENT
    // ===========================================
    {
      headerTitle: "Reliability Assessment",
      headerSubtitle: "Structural Reliability Analysis",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Reliability Results",
          content: {
            type: "grid",
            columns: 2,
            items: [
              {
                label: "Reliability Index (β)",
                value: statistics.reliabilityIndex.toFixed(3),
              },
              {
                label: "Target Reliability (βT)",
                value: form.targetReliability,
              },
              {
                label: "Probability of Failure (Pf)",
                value: `${statistics.probabilityOfFailure.toFixed(4)}%`,
              },
              {
                label: "Approx. Return Period",
                value:
                  statistics.probabilityOfFailure > 0
                    ? `1 in ${Math.round(100 / statistics.probabilityOfFailure).toLocaleString()}`
                    : "> 1 in 10,000",
              },
              {
                label: "Assessment",
                value: reliabilityPass ? "PASS" : "FAIL",
                isStatus: true,
              },
              {
                label: "Confidence Level",
                value: `${((1 - statistics.probabilityOfFailure / 100) * 100).toFixed(2)}%`,
              },
            ],
          } as GridInput,
        },
        {
          title: "Eurocode Reliability Classes",
          content: {
            type: "table",
            headers: [
              "Class",
              "β (50 yr)",
              "Typical Application",
              "Assessment",
            ],
            rows: [
              [
                "RC1",
                "3.3",
                "Agricultural, storage",
                statistics.reliabilityIndex >= 3.3 ? "Satisfied" : "Not met",
              ],
              [
                "RC2",
                "3.8",
                "Residential, office buildings",
                statistics.reliabilityIndex >= 3.8 ? "Satisfied" : "Not met",
              ],
              [
                "RC3",
                "4.3",
                "Grandstands, concert halls",
                statistics.reliabilityIndex >= 4.3 ? "Satisfied" : "Not met",
              ],
            ],
          } as TableInput,
        },
        {
          title: "Assessment Summary",
          content: {
            type: "checklist",
            items: [
              {
                label: `Reliability index β = ${statistics.reliabilityIndex.toFixed(2)} meets target βT = ${form.targetReliability}`,
                checked: reliabilityPass,
              },
              {
                label: "Failure probability within acceptable limits",
                checked: statistics.probabilityOfFailure < 0.1,
              },
              {
                label: "95th percentile utilisation below 100%",
                checked: statistics.percentile95 <= 100,
              },
              {
                label: "Sufficient simulation runs for convergence",
                checked: numResults >= 1000,
              },
            ],
          } as ChecklistInput,
        },
      ],
    },

    // ===========================================
    // PAGE 5: NOTES & LIMITATIONS
    // ===========================================
    {
      headerTitle: "Notes & Limitations",
      headerSubtitle: "Analysis Basis",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Analysis Methodology",
          content: {
            type: "grid",
            columns: 1,
            items: [
              {
                label: "Method",
                value: "Monte Carlo Simulation with random parameter sampling",
              },
              {
                label: "Calculation Basis",
                value:
                  CALCULATOR_NAMES[form.calculatorType] || form.calculatorType,
              },
              {
                label: "Number of Iterations",
                value: numResults.toLocaleString(),
              },
              {
                label: "Convergence",
                value:
                  numResults >= 10000
                    ? "Well converged"
                    : "Adequate for preliminary assessment",
              },
            ],
          } as GridInput,
        },
        {
          title: "Assumptions",
          content: {
            type: "checklist",
            items: [
              {
                label: "Parameters are statistically independent",
                checked: true,
              },
              {
                label: "Distribution shapes adequately represent variability",
                checked: true,
              },
              {
                label: "Physical model (calculator) is accurate representation",
                checked: true,
              },
              {
                label: "Range bounds contain realistic variability",
                checked: true,
              },
            ],
          } as ChecklistInput,
        },
        {
          title: "Limitations",
          content: {
            type: "grid",
            columns: 1,
            items: [
              {
                label: "Model Uncertainty",
                value:
                  "Simplified calculation model - may not capture all failure modes",
              },
              {
                label: "Parameter Correlation",
                value:
                  "Assumed independent - real parameters may be correlated",
              },
              {
                label: "Distribution Selection",
                value:
                  "User-specified distributions - should be verified against data",
              },
              {
                label: "System Effects",
                value:
                  "Analysis covers single element - system redundancy not considered",
              },
            ],
          } as GridInput,
        },
        {
          title: "References",
          content: {
            type: "grid",
            columns: 1,
            items: [
              {
                label: "EN 1990",
                value: "Basis of structural design - Reliability framework",
              },
              {
                label: "JCSS",
                value:
                  "Joint Committee on Structural Safety - Probabilistic Model Code",
              },
              {
                label: "ISO 2394",
                value: "General principles on reliability for structures",
              },
            ],
          } as GridInput,
        },
      ],
    },
  ];

  return {
    metadata: {
      title: "Sensitivity Analysis Report",
      author: projectInfo.preparedBy || "BeaverCalc Studio",
      creator: "BeaverCalc Premium",
      subject: `Monte Carlo Simulation - ${form.reference}`,
      project: form.projectName || "Probabilistic Analysis",
      pageSize: "A4",
      pageOrientation: "portrait" as const,
    },
    pages,
  };
}
