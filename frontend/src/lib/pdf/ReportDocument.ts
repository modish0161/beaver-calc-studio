// =============================================================================
// ReportDocument — Type definitions for page-based PDF report builders
// Used by excavationSheetPileBuilder, memberRatingsBuilder, sensitivityBuilder
// =============================================================================

export type { ReportData } from "./types";

export interface GridInput {
  type: "grid";
  columns: number;
  items: { label: string; value: string | number; isStatus?: boolean }[];
}

export interface TableInput {
  type: "table";
  headers: string[];
  rows: (string | number)[][];
}

export interface ChecklistInput {
  type: "checklist";
  items: { label: string; checked: boolean }[];
}

export interface PageSection {
  title: string;
  content: GridInput | TableInput | ChecklistInput;
}

export interface PageInput {
  headerTitle: string;
  headerSubtitle: string;
  headerCode: string;
  sections: PageSection[];
}
