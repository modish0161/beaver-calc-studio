// ============================================================================
// BeaverCalc Studio — Premium PDF Report Component
// Reusable, consultancy-grade engineering report template
// ============================================================================

import { Document, Page, pdf } from '@react-pdf/renderer';
import React from 'react';
import {
    AppendixSection,
    ConclusionSection,
    CoverPage,
    DesignChecksSection,
    DetailedCalculationsSection,
    DiagramsSection,
    ExecutiveSummarySection,
    InputsSection,
    ModelSection,
    PageFooter,
    PageHeader,
    SectionPropertiesSection,
    TableOfContents,
    WarningsSection,
} from './sections';
import { styles } from './styles';
import { PremiumReportData, ReportWarning } from './types';

// ============================================================================
// TABLE OF CONTENTS ENTRIES (Auto-generated based on available data)
// ============================================================================

const generateTOCEntries = (data: PremiumReportData) => {
  const entries = [
    { number: '1.', title: 'Executive Summary' },
    { number: '2.', title: 'Input Parameters' },
  ];

  if (data.modelImage) {
    entries.push({ number: '3.', title: '3D Model View' });
  }

  if (data.diagrams) {
    entries.push({ number: '4.', title: 'Diagrams' });
  }

  if (data.sectionProperties && data.sectionProperties.length > 0) {
    entries.push({ number: '5.', title: 'Section Properties' });
  }

  entries.push({ number: '6.', title: 'Design Checks' });

  if (data.detailedCalculations && data.detailedCalculations.length > 0) {
    entries.push({ number: '7.', title: 'Detailed Calculations' });
  }

  if (data.warnings && data.warnings.length > 0) {
    entries.push({ number: '8.', title: 'Warnings & Notes' });
  }

  entries.push({ number: '9.', title: 'Conclusion' });

  if (data.appendix && data.appendix.length > 0) {
    entries.push({ number: '10.', title: 'Appendix' });
  }

  return entries;
};

// ============================================================================
// MAIN REPORT COMPONENT
// ============================================================================

interface BeaverCalcReportProps {
  data: PremiumReportData;
  logoBase64?: string;
  logoWhiteBase64?: string;
}

/**
 * BeaverCalcReport — Premium PDF Report Generator
 *
 * A reusable, consultancy-grade engineering report template that can be used
 * by all BeaverCalc calculators. Simply populate the ReportData interface
 * and pass it to this component.
 *
 * @example
 * ```tsx
 * import { BeaverCalcReport, generatePDF, downloadPDF } from './lib/pdf';
 *
 * const reportData: ReportData = {
 *   meta: { ... },
 *   executiveSummary: { ... },
 *   inputs: { ... },
 *   designChecks: [ ... ],
 *   conclusion: { ... },
 * };
 *
 * // Option 1: Download directly
 * await downloadPDF(reportData, 'my-report');
 *
 * // Option 2: Get blob for custom handling
 * const blob = await generatePDF(reportData);
 * ```
 */
export const BeaverCalcReport: React.FC<BeaverCalcReportProps> = ({
  data,
  logoBase64,
  logoWhiteBase64,
}) => {
  const tocEntries = generateTOCEntries(data);

  return (
    <Document
      title={data.meta.title}
      author={data.meta.preparedBy}
      subject={`${data.meta.calculatorName} - ${data.meta.projectName}`}
      keywords={`structural engineering, ${data.meta.calculatorName}, BeaverCalc`}
      creator="BeaverCalc Studio"
      producer="BeaverCalc Studio - Beaver Bridges Ltd"
    >
      {/* Cover Page - uses white logo for dark background */}
      <CoverPage
        meta={data.meta}
        modelImage={data.executiveSummary.modelSnapshot}
        logoBase64={logoBase64}
        logoWhiteBase64={logoWhiteBase64}
      />

      {/* Table of Contents - uses dark logo for white background */}
      <Page size="A4" style={styles.page}>
        <PageHeader meta={data.meta} logoBase64={logoBase64} />
        <TableOfContents entries={tocEntries} />
        <PageFooter meta={data.meta} />
      </Page>

      {/* Executive Summary */}
      <Page size="A4" style={styles.page}>
        <PageHeader meta={data.meta} logoBase64={logoBase64} />
        <ExecutiveSummarySection data={data.executiveSummary} />
        <PageFooter meta={data.meta} />
      </Page>

      {/* Inputs */}
      <Page size="A4" style={styles.page}>
        <PageHeader meta={data.meta} logoBase64={logoBase64} />
        <InputsSection inputs={data.inputs} designCodes={data.meta.designCodes} />
        <PageFooter meta={data.meta} />
      </Page>

      {/* 3D Model (if provided) */}
      {data.modelImage && (
        <Page size="A4" style={styles.page}>
          <PageHeader meta={data.meta} logoBase64={logoBase64} />
          <ModelSection image={data.modelImage} />
          <PageFooter meta={data.meta} />
        </Page>
      )}

      {/* Diagrams (if provided) */}
      {data.diagrams && (
        <Page size="A4" style={styles.page}>
          <PageHeader meta={data.meta} logoBase64={logoBase64} />
          <DiagramsSection diagrams={data.diagrams} />
          <PageFooter meta={data.meta} />
        </Page>
      )}

      {/* Section Properties (if provided) */}
      {data.sectionProperties && data.sectionProperties.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PageHeader meta={data.meta} logoBase64={logoBase64} />
          <SectionPropertiesSection properties={data.sectionProperties} />
          <PageFooter meta={data.meta} />
        </Page>
      )}

      {/* Design Checks */}
      <Page size="A4" style={styles.page}>
        <PageHeader meta={data.meta} logoBase64={logoBase64} />
        <DesignChecksSection sections={data.designChecks} />
        <PageFooter meta={data.meta} />
      </Page>

      {/* Detailed Calculations (if provided) */}
      {data.detailedCalculations && data.detailedCalculations.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PageHeader meta={data.meta} logoBase64={logoBase64} />
          <DetailedCalculationsSection calculations={data.detailedCalculations} />
          <PageFooter meta={data.meta} />
        </Page>
      )}

      {/* Warnings & Notes (if any) */}
      {data.warnings && data.warnings.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PageHeader meta={data.meta} logoBase64={logoBase64} />
          <WarningsSection warnings={data.warnings as ReportWarning[]} />
          <PageFooter meta={data.meta} />
        </Page>
      )}

      {/* Conclusion */}
      <Page size="A4" style={styles.page}>
        <PageHeader meta={data.meta} logoBase64={logoBase64} />
        <ConclusionSection conclusion={data.conclusion} />
        <PageFooter meta={data.meta} />
      </Page>

      {/* Appendix (if provided) */}
      {data.appendix && data.appendix.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PageHeader meta={data.meta} logoBase64={logoBase64} />
          <AppendixSection items={data.appendix} />
          <PageFooter meta={data.meta} />
        </Page>
      )}
    </Document>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logo options for PDF generation
 */
export interface LogoOptions {
  logoBase64?: string; // Dark logo for white backgrounds
  logoWhiteBase64?: string; // White logo for dark backgrounds
}

/**
 * Generate a PDF blob from report data
 */
export const generatePDF = async (data: PremiumReportData, logos?: LogoOptions): Promise<Blob> => {
  const doc = (
    <BeaverCalcReport
      data={data}
      logoBase64={logos?.logoBase64}
      logoWhiteBase64={logos?.logoWhiteBase64}
    />
  );
  const blob = await pdf(doc).toBlob();
  return blob;
};

/**
 * Download a PDF directly in the browser
 */
export const downloadPDF = async (
  data: PremiumReportData,
  filename?: string,
  logos?: LogoOptions,
): Promise<void> => {
  const blob = await generatePDF(data, logos);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename
    ? `${filename}.pdf`
    : `BeaverCalc_${data.meta.calculatorName.replace(/\s+/g, '_')}_${data.meta.date.replace(/\//g, '-')}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
};

/**
 * Open PDF in a new browser tab
 */
export const previewPDF = async (data: PremiumReportData, logos?: LogoOptions): Promise<void> => {
  const blob = await generatePDF(data, logos);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

// Default export
export default BeaverCalcReport;
