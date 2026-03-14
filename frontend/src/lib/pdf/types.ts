// ============================================================================
// BeaverCalc Studio — Premium PDF Report Types
// Strongly-typed interfaces for consultancy-grade engineering reports
// ============================================================================

/**
 * Brand color palette for consistent styling across all reports
 */
export const BRAND_COLORS = {
  primaryBlue: "#002A5C",
  secondaryBlue: "#004B8D",
  lightBlue: "#4FA3D1",
  neutralGrey: "#F2F2F2",
  darkGrey: "#333333",
  white: "#FFFFFF",
  successGreen: "#2ECC71",
  warningAmber: "#F1C40F",
  failRed: "#E74C3C",
  // Additional professional tones
  tableHeaderBg: "#002A5C",
  tableAltRow: "#F8F9FA",
  borderLight: "#E0E0E0",
  textMuted: "#6C757D",
} as const;

/**
 * Report metadata - project and document information
 */
export interface ReportMeta {
  /** Calculator display name, e.g. "Steel Plate Girder Calculator" */
  calculatorName: string;
  /** Report title, e.g. "Steel Plate Girder Design Report" */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Project name */
  projectName: string;
  /** Client name */
  clientName: string;
  /** Prepared by (engineer name) */
  preparedBy: string;
  /** Checked by (reviewer name) */
  checkedBy?: string;
  /** Approved by */
  approvedBy?: string;
  /** Document reference number */
  documentRef: string;
  /** Report version, e.g. "Rev A", "1.0" */
  version: string;
  /** Date generated */
  date: string;
  /** Design codes used, e.g. ["BS EN 1993-1-1", "BS EN 1993-1-5"] */
  designCodes: string[];
  /** Optional company logo URL or base64 */
  companyLogo?: string;
  /** Optional QR code URL for linking back to calculation */
  qrCodeUrl?: string;
}

/**
 * Input parameter with value and optional unit
 */
export interface InputParameter {
  label?: string;
  /** Alias for label — used by most builders */
  name?: string;
  value: string | number;
  unit?: string;
  description?: string;
  /** Additional note for the parameter */
  note?: string;
}

/**
 * Grouped inputs for different categories
 */
export interface InputSection {
  title: string;
  parameters: InputParameter[];
}

/**
 * Report inputs organized by category
 */
export interface ReportInputs {
  geometry?: InputSection;
  materials?: InputSection;
  loads?: InputSection;
  reinforcement?: InputSection;
  studs?: InputSection;
  stiffeners?: InputSection;
  supportConditions?: InputSection;
  other?: InputSection[];
  /** Flat array of input sections — used by most builders */
  sections?: InputSection[];
}

/**
 * Image/diagram for the report
 */
export interface ReportImage {
  /** Base64 data URL or public URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Caption to display below image */
  caption?: string;
  /** Width in points (72 points = 1 inch) */
  width?: number;
  /** Height in points */
  height?: number;
}

/**
 * Diagram section with multiple images
 */
export interface DiagramSection {
  crossSection?: ReportImage;
  loadDiagram?: ReportImage;
  shearForceDiagram?: ReportImage;
  bendingMomentDiagram?: ReportImage;
  deflectionShape?: ReportImage;
  custom?: ReportImage[];
}

/**
 * Section property row
 */
export interface SectionProperty {
  name: string;
  symbol?: string;
  value: string | number;
  unit: string;
  clause?: string;
}

/**
 * Design check result
 */
export interface DesignCheck {
  /** Check category, e.g. "Bending", "Shear", "LTB" */
  category?: string;
  /** Check name/description */
  name: string;
  /** Design value (Ed) — numeric form */
  designValue?: number;
  /** Design value unit */
  designValueUnit?: string;
  /** Resistance value (Rd) — numeric form */
  resistance?: number;
  /** Resistance unit */
  resistanceUnit?: string;
  /** Utilisation ratio (0-1 or percentage) */
  utilisation: number;
  /** Eurocode clause reference */
  clause?: string;
  /** Pass/Fail status */
  status: "PASS" | "FAIL";
  /** Optional notes */
  notes?: string;
  /** Formula expression, e.g. 'NRd,s = As × fuk / γMs' */
  formula?: string;
  /** Calculated value as formatted string, e.g. '45.2 kN' */
  calculated?: string;
  /** Limit/demand value as formatted string, e.g. 'NEd = 30 kN' */
  limit?: string;
  /** Description of the check */
  description?: string;
}

/**
 * Grouped design checks by category
 */
export interface DesignCheckSection {
  title: string;
  checks: DesignCheck[];
  /** Clause reference or description, e.g. 'EC2-4 Cl.7.2' */
  description?: string;
}

/**
 * Calculation step with formula and values
 */
export interface CalculationStep {
  /** Step description */
  description: string;
  /** Formula in LaTeX or plain text */
  formula?: string;
  /** Substituted values */
  substitution?: string;
  /** Result value (optional for formula-only steps) */
  result?: string | number;
  /** Result unit */
  unit?: string;
  /** Clause reference */
  clause?: string;
}

/**
 * Detailed calculation section
 */
export interface DetailedCalculation {
  title: string;
  steps: CalculationStep[];
}

/**
 * Warning or note
 */
export interface ReportWarning {
  /** Warning severity */
  severity?: "info" | "warning" | "error" | "critical";
  /** Warning type — alias for severity, used by most builders */
  type?: "info" | "warning" | "error" | "critical";
  /** Warning title */
  title?: string;
  /** Detailed message */
  message: string;
  /** Related clause or check */
  reference?: string;
}

/**
 * Key result item for executive summary
 */
export interface KeyResult {
  label: string;
  value: string;
  highlight?: boolean;
}

/**
 * Executive summary data
 */
export interface ExecutiveSummary {
  /** Overall pass/fail status */
  overallStatus: "PASS" | "FAIL";
  /** Governing failure mode (if failed) or governing check */
  governingCheck: string;
  /** Overall maximum utilisation — numeric form */
  maxUtilisation?: number;
  /** Key dimensions summary */
  keyDimensions?: InputParameter[];
  /** Key loads summary */
  keyLoads?: InputParameter[];
  /** 3D snapshot image */
  modelSnapshot?: ReportImage;
  /** Narrative description of the design */
  description?: string;
  /** Key results table rows */
  keyResults?: KeyResult[];
  /** Utilisation summary string, e.g. '72% combined (N: 55%, V: 43%)' */
  utilisationSummary?: string;
}

/**
 * Conclusion section
 */
export interface ReportConclusion {
  /** Overall status */
  status?: "PASS" | "FAIL";
  /** Summary statement */
  summary: string;
  /** Governing checks */
  governingChecks?: string[];
  /** Suggested improvements (if failed or high utilisation) */
  suggestions?: string[];
  /** Alternative sizes to consider */
  alternatives?: string[];
  /** Recommendations for the design */
  recommendations?: string[];
  /** Known limitations of the analysis */
  limitations?: string[];
}

/**
 * Appendix item
 */
export interface AppendixItem {
  title: string;
  content: string | object;
  type: "text" | "json" | "table";
}

/**
 * Table input for report generation
 */
export interface TableInput {
  title: string;
  headers: string[];
  rows: string[][];
}

/**
 * Complete report data structure
 * Supports both premium (meta/executiveSummary/designChecks) and flat (sections) patterns
 */
export interface ReportData {
  /** Report metadata — used by premium builders */
  meta?: ReportMeta;

  /** Report title shorthand — used by flat builders */
  title?: string;

  /** Report subtitle shorthand */
  subtitle?: string;

  /** Executive summary — used by premium builders */
  executiveSummary?: ExecutiveSummary;

  /** Input parameters — ReportInputs object or flat array of label/value items */
  inputs?: ReportInputs | InputParameter[];

  /** 3D model snapshot (full view) */
  modelImage?: ReportImage;

  /** Diagrams section */
  diagrams?: DiagramSection;

  /** Section properties */
  sectionProperties?: SectionProperty[];

  /** Design checks grouped by category — used by premium builders */
  designChecks?: DesignCheckSection[];

  /** Detailed calculations */
  detailedCalculations?: DetailedCalculation[];

  /** Warnings and notes — can be ReportWarning objects or plain strings */
  warnings?: (ReportWarning | string)[];

  /** Conclusion — used by premium builders */
  conclusion?: ReportConclusion;

  /** Appendix items */
  appendix?: AppendixItem[];

  // --- Flat builder properties ---

  /** Flat report sections — used by flat builders */
  sections?: ReportSection[];

  /** Design standard reference */
  standard?: string;

  /** Design code reference (alias for standard) */
  designCode?: string;

  /** Project info — variant A */
  project?: {
    name?: string;
    client?: string;
    preparedBy?: string;
    date?: string;
    reference?: string;
  };

  /** Project info — variant B (camelCase or display-name keys) */
  projectInfo?: {
    projectName?: string;
    name?: string;
    reference?: string;
    client?: string;
    preparedBy?: string;
    date?: string;
    [key: string]: any;
  };

  /** Quick summary for flat builders (camelCase or display-name keys) */
  summary?: {
    status?: string;
    critical?: string;
    utilisation?: number;
    [key: string]: any;
  };

  /** Overall status string */
  overallStatus?: string;

  /** Footer note (single string) */
  footerNote?: string;

  /** Tables array — used by some flat builders */
  tables?: TableInput[];

  /** Notes array — used by some flat builders */
  notes?: string[];

  /** Footer — object or simple string */
  footer?:
    | string
    | {
        company?: string;
        disclaimer?: string;
        preparedBy?: string;
        reviewedBy?: string;
        approvedBy?: string;
      };

  /** Arbitrary extra properties used by flat builders (results, etc.) */
  [key: string]: any;
}

/**
 * Table of contents entry (auto-generated)
 */
export interface TOCEntry {
  number: string;
  title: string;
  page: number;
}

/**
 * Table used inside report sections (no title — embedded in section content)
 */
export interface ReportTable {
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Individual content item inside a ReportSection.
 * Can be a label/value pair, a heading, a paragraph, or an embedded table.
 */
export type ReportSectionContent =
  | {
      label: string;
      value: string | number;
      unit?: string;
      status?: string;
      description?: string;
    }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "table"; table: ReportTable }
  | { type: "list"; items: string[] };

/**
 * A flat report section with title and either structured content, a table, or list items.
 * Used by the majority of PDF builders (flat report pattern).
 */
export interface ReportSection {
  title: string;
  /** Structured key-value content array, or a plain text string */
  content?: string | ReportSectionContent[];
  /** Embedded table */
  table?: ReportTable;
  /** Bullet-point items */
  items?: string[];
}

// Convenience aliases
export type BeaverCalcReport = ReportData;

/**
 * Strict report data type for premium PDF builders that require all core fields.
 * Used by BeaverCalcReport.tsx (the React-PDF renderer).
 */
export type PremiumReportData = Omit<ReportData, "inputs"> &
  Required<
    Pick<
      ReportData,
      "meta" | "executiveSummary" | "designChecks" | "conclusion"
    >
  > & { inputs: ReportInputs };

export interface ReportOptions {
  includeDetailedCalcs?: boolean;
  includeAppendix?: boolean;
  includeDiagrams?: boolean;
  paperSize?: "A4" | "Letter";
  projectName?: string;
  preparedBy?: string;
}
