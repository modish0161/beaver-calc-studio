import type { PremiumReportData } from "./pdf/types";

interface PDFTableSection {
  title: string;
  head: string[][];
  body: any[][];
  theme?: "grid" | "striped" | "plain";
  /** Alternative row data as string[][] */
  rows?: string[][];
  /** Alternative row data as object array */
  items?: any[];
}

interface PDFCheckRow {
  name: string;
  capacity: string;
  utilisation: string;
  status: "PASS" | "FAIL";
}

interface PDFReportData {
  title?: string;
  subtitle?: string;
  date?: string;
  projectInfo?: { label: string; value: string }[] | Record<string, any>;
  inputs?:
    | { label: string; value: string | number; unit?: string }[]
    | Record<string, any>;
  sections?: (
    | PDFTableSection
    | { title: string; rows: { label: string; value: string | number }[] }
    | {
        title: string;
        items: { label: string; value: string | number; highlight?: boolean }[];
      }
    | { title: string; content?: any; table?: any; items?: any }
  )[];
  /** Named table sections */
  tables?: (
    | PDFTableSection
    | { title: string; headers: string[]; rows: string[][] }
  )[];
  checks?: PDFCheckRow[];
  recommendations?: { check: string; suggestion: string }[];
  warnings?: (string | { message: string; [key: string]: any })[];
  footerNote?: string;
  documentRef?: string;
  revision?: string;
  preparedBy?: string;
  checkedBy?: string;
  /** Project name for header */
  projectName?: string;
  /** Reference number */
  reference?: string;
  /** Overall result text */
  result?: string;
  /** Result color for styling */
  resultColor?: string;
  diagramImage?: string; // base64 PNG from 3D canvas (data:image/png;base64,...)
  /** Allow arbitrary extra properties for compatibility with ReportData */
  [key: string]: any;
}

// ============================================================================
// PREMIUM PDF ADAPTER — converts PDFReportData → PremiumReportData
// Gives all 82+ standard calcs the premium multi-page @react-pdf/renderer
// output (cover page, ToC, executive summary, design checks, conclusion)
// without rewriting each calculator's exportPDF function.
// ============================================================================

export const generatePremiumPDF = (data: PDFReportData): void => {
  _generatePremiumPDFAsync(data).catch((err) => {
    console.error("Premium PDF generation failed:", err);
  });
};

async function _generatePremiumPDFAsync(data: PDFReportData): Promise<void> {
  const { downloadPDF } = await import("./pdf/BeaverCalcReport");
  const today = new Date().toLocaleDateString("en-GB");
  const checks = data.checks || [];
  const passCount = checks.filter((c) => c.status === "PASS").length;
  const failCount = checks.filter((c) => c.status === "FAIL").length;
  const allPass = failCount === 0;

  const utilValues = checks
    .map((c) => parseFloat(c.utilisation))
    .filter((v) => !isNaN(v));
  const maxUtil = utilValues.length > 0 ? Math.max(...utilValues) : 0;

  // Find governing check (highest utilisation)
  let governingCheck = "N/A";
  if (checks.length > 0) {
    const maxCheck = checks.reduce((prev, curr) => {
      const pU = parseFloat(prev.utilisation) || 0;
      const cU = parseFloat(curr.utilisation) || 0;
      return cU > pU ? curr : prev;
    });
    governingCheck = maxCheck.name;
  }

  // Extract project name from projectInfo or direct field
  let projectName = data.projectName || "Project";
  if (data.projectInfo && Array.isArray(data.projectInfo)) {
    const proj = data.projectInfo.find(
      (p: any) => p.label?.toLowerCase() === "project",
    );
    if (proj) projectName = String((proj as any).value);
  }

  let reference = data.reference || data.documentRef || "";
  if (data.projectInfo && Array.isArray(data.projectInfo)) {
    const ref = data.projectInfo.find(
      (p: any) => p.label?.toLowerCase() === "reference",
    );
    if (ref) reference = String((ref as any).value);
  }

  // Build meta
  const meta = {
    calculatorName: data.title || "Engineering Report",
    title: data.title || "Engineering Report",
    subtitle: data.subtitle,
    projectName,
    clientName: "Client",
    preparedBy: data.preparedBy || "BeaverCalc Studio",
    checkedBy: data.checkedBy,
    approvedBy: undefined as string | undefined,
    documentRef:
      reference || `BB-CALC-${Date.now().toString(36).toUpperCase()}`,
    version: data.revision || "Rev A",
    date: data.date || today,
    designCodes: data.subtitle ? [data.subtitle] : ["BS EN Standards"],
  };

  // Build executive summary
  const executiveSummary = {
    overallStatus: (allPass ? "PASS" : "FAIL") as "PASS" | "FAIL",
    governingCheck,
    description:
      data.subtitle || `${data.title || "Engineering"} calculation report.`,
    keyResults: checks.slice(0, 5).map((c) => ({
      label: c.name,
      value: `${c.utilisation} (${c.status})`,
      highlight: c.status === "FAIL",
    })),
    utilisationSummary: `${maxUtil.toFixed(1)}% (${governingCheck})`,
  };

  // Build inputs
  const inputParams = (data.inputs || []).map((i: any) => ({
    name: i.label || i.name || "",
    value: String(i.value ?? ""),
    unit: i.unit || "",
  }));

  const inputs = {
    sections: [
      {
        title: "Input Parameters",
        parameters: inputParams,
      },
    ],
  };

  // Build design checks
  const designChecks = [
    {
      title: "Design Verification Checks",
      checks: checks.map((c) => ({
        name: c.name,
        utilisation: parseFloat(c.utilisation) / 100 || 0,
        status: c.status as "PASS" | "FAIL",
        calculated: c.capacity,
        description: c.name,
      })),
    },
  ];

  // Build conclusion
  const conclusion = {
    status: (allPass ? "PASS" : "FAIL") as "PASS" | "FAIL",
    summary: allPass
      ? `All ${passCount} design checks are satisfied. The design is adequate.`
      : `${failCount} of ${checks.length} design checks failed. Revise the design.`,
    governingChecks: [governingCheck],
    recommendations: data.recommendations?.map((r) => r.suggestion) || [],
  };

  // Build warnings
  const warnings = (data.warnings || []).map((w) => {
    if (typeof w === "string") {
      return { type: "warning" as const, message: w };
    }
    return { type: "warning" as const, message: w.message || String(w) };
  });

  // Build model image from diagram capture
  const modelImage = data.diagramImage
    ? { src: data.diagramImage, alt: "3D Structural Diagram" }
    : undefined;

  // Assemble PremiumReportData
  const premiumData: PremiumReportData = {
    meta,
    executiveSummary,
    inputs,
    designChecks,
    conclusion,
    warnings: warnings.length > 0 ? warnings : undefined,
    modelImage,
  };

  // Generate filename
  const safeTitle = (data.title || "Report")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "_");
  const fileName = `BeaverBridges_${safeTitle}_${today.replace(/\//g, "-")}`;

  await downloadPDF(premiumData, fileName);
}
