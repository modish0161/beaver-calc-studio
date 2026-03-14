// ============================================================================
// BeaverCalc Studio — PDF Report Module
// Barrel export for the premium PDF report system
// ============================================================================

// Types
export type {
  AppendixItem,
  CalculationStep,
  DesignCheck,
  DesignCheckSection,
  DetailedCalculation,
  DiagramSection,
  ExecutiveSummary,
  InputParameter,
  InputSection,
  ReportConclusion,
  ReportData,
  ReportImage,
  ReportInputs,
  ReportMeta,
  ReportWarning,
  SectionProperty,
  TOCEntry,
} from './types';

export { BRAND_COLORS } from './types';

// Styles
export { FONT_SIZE, SPACING, styles } from './styles';

// Section Components
export {
  AppendixSection,
  ConclusionSection,
  CoverPage,
  DataTable,
  DesignChecksSection,
  DetailedCalculationsSection,
  DiagramsSection,
  ExecutiveSummarySection,
  InputsSection,
  ModelSection,
  PageFooter,
  PageHeader,
  SectionPropertiesSection,
  SectionTitle,
  StatusBadge,
  SubsectionTitle,
  TableOfContents,
  UtilisationDisplay,
  WarningsSection,
} from './sections';

// Main Report Component & Utilities
export { BeaverCalcReport, downloadPDF, generatePDF, previewPDF } from './BeaverCalcReport';
export type { LogoOptions } from './BeaverCalcReport';

export { default } from './BeaverCalcReport';

// Calculator-specific Report Builders
export {
  buildSteelPlateGirderReport,
  type BuilderOptions,
  type SteelPlateGirderFormData,
  type SteelPlateGirderResults,
} from './builders';

// Example Data
export { steelPlateGirderExampleData } from './exampleData';
