// ============================================================================
// BeaverCalc Studio — PDF Section Components
// Modular, reusable sections for engineering reports
// ============================================================================

import { Image, Page, Text, View } from '@react-pdf/renderer';
import React from 'react';
import { styles } from './styles';
import {
    AppendixItem,
    BRAND_COLORS,
    DesignCheck,
    DesignCheckSection,
    DetailedCalculation,
    DiagramSection,
    ExecutiveSummary,
    InputSection,
    ReportConclusion,
    ReportImage,
    ReportInputs,
    ReportMeta,
    ReportWarning,
    SectionProperty,
} from './types';

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

/**
 * Section title with number
 */
export const SectionTitle: React.FC<{ number: string; title: string }> = ({ number, title }) => (
  <View style={styles.sectionTitle}>
    <Text>
      <Text style={styles.sectionNumber}>{number}</Text>
      {title}
    </Text>
  </View>
);

/**
 * Subsection title
 */
export const SubsectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.subsectionTitle}>{title}</Text>
);

/**
 * Status badge component
 */
export const StatusBadge: React.FC<{
  status: 'PASS' | 'FAIL';
  large?: boolean;
}> = ({ status, large = false }) => (
  <View
    style={
      large
        ? status === 'PASS'
          ? styles.badgePassLarge
          : styles.badgeFailLarge
        : status === 'PASS'
          ? styles.badgePass
          : styles.badgeFail
    }
  >
    <Text style={large ? styles.badgeTextLarge : styles.badgeText}>{status}</Text>
  </View>
);

/**
 * Utilisation display with color coding
 */
export const UtilisationDisplay: React.FC<{ value: number }> = ({ value }) => {
  const percentage = value > 1 ? value : value * 100;
  const getStyle = () => {
    if (percentage > 95) return styles.utilisationHigh;
    if (percentage > 80) return styles.utilisationMedium;
    return styles.utilisationLow;
  };

  const getColor = () => {
    if (percentage > 95) return BRAND_COLORS.failRed;
    if (percentage > 80) return BRAND_COLORS.warningAmber;
    return BRAND_COLORS.successGreen;
  };

  return (
    <View>
      <Text style={getStyle()}>{percentage.toFixed(1)}%</Text>
      <View style={styles.utilisationBar}>
        <View
          style={[
            styles.utilisationBarFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: getColor(),
            },
          ]}
        />
      </View>
    </View>
  );
};

/**
 * Generic data table
 */
interface TableColumn {
  header: string;
  key: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

export const DataTable: React.FC<{
  columns: TableColumn[];
  data: any[];
  showHeader?: boolean;
}> = ({ columns, data, showHeader = true }) => (
  <View style={styles.table}>
    {showHeader && (
      <View style={styles.tableHeader}>
        {columns.map((col, idx) => (
          <View
            key={idx}
            style={[
              styles.tableHeaderCell,
              { width: col.width || 'auto', flex: col.width ? undefined : 1 },
            ]}
          >
            <Text>{col.header}</Text>
          </View>
        ))}
      </View>
    )}
    {data.map((row, rowIdx) => (
      <View key={rowIdx} style={rowIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
        {columns.map((col, colIdx) => (
          <View
            key={colIdx}
            style={[
              col.align === 'right'
                ? styles.tableCellNumeric
                : col.align === 'center'
                  ? styles.tableCellCenter
                  : styles.tableCell,
              { width: col.width || 'auto', flex: col.width ? undefined : 1 },
            ]}
          >
            {col.render ? col.render(row[col.key], row) : <Text>{row[col.key]}</Text>}
          </View>
        ))}
      </View>
    ))}
  </View>
);

/**
 * Page header component (used on all pages except cover)
 */
export const PageHeader: React.FC<{ meta: ReportMeta; logoBase64?: string }> = ({
  meta,
  logoBase64,
}) => (
  <View style={styles.pageHeader} fixed>
    {logoBase64 ? (
      <Image src={logoBase64} style={styles.pageHeaderLogo} />
    ) : (
      <Text style={{ fontSize: 10, fontWeight: 'bold', color: BRAND_COLORS.primaryBlue }}>
        BeaverCalc Studio
      </Text>
    )}
    <View>
      <Text style={styles.pageHeaderText}>{meta.calculatorName}</Text>
      <Text style={styles.pageHeaderText}>
        {meta.documentRef} | {meta.version}
      </Text>
    </View>
  </View>
);

/**
 * Page footer component
 */
export const PageFooter: React.FC<{ meta: ReportMeta }> = ({ meta }) => (
  <View style={styles.pageFooter} fixed>
    <Text style={styles.footerText}>BeaverCalc Studio | {meta.calculatorName}</Text>
    <Text style={styles.footerCenter}>
      Generated: {meta.date} | {meta.version}
    </Text>
    <Text
      style={styles.pageNumber}
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
    />
  </View>
);

// ============================================================================
// COVER PAGE
// ============================================================================

export const CoverPage: React.FC<{
  meta: ReportMeta;
  modelImage?: ReportImage;
  logoBase64?: string;
  logoWhiteBase64?: string;
}> = ({ meta, modelImage, logoBase64, logoWhiteBase64 }) => (
  <Page size="A4" style={styles.coverPage}>
    {/* Header Bar */}
    <View style={styles.coverHeader}>
      {logoWhiteBase64 ? (
        <Image src={logoWhiteBase64} style={styles.coverLogo} />
      ) : logoBase64 ? (
        <Image src={logoBase64} style={styles.coverLogo} />
      ) : (
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>BeaverCalc Studio</Text>
      )}
      <View style={styles.coverBadge}>
        <Text style={styles.coverBadgeText}>ENGINEERING REPORT</Text>
      </View>
    </View>

    {/* Main Content */}
    <View style={styles.coverMain}>
      <Text style={styles.coverTitle}>{meta.title}</Text>
      <Text style={styles.coverSubtitle}>Generated by BeaverCalc Studio</Text>

      {/* 3D Model Thumbnail */}
      {modelImage && (
        <View style={styles.coverImageContainer}>
          <Image src={modelImage.src} style={styles.coverImage} />
          {modelImage.caption && <Text style={styles.imageCaption}>{modelImage.caption}</Text>}
        </View>
      )}

      {/* Meta Information Grid */}
      <View style={styles.coverMetaGrid}>
        <View style={styles.coverMetaItem}>
          <Text style={styles.coverMetaLabel}>Project</Text>
          <Text style={styles.coverMetaValue}>{meta.projectName}</Text>
        </View>
        <View style={styles.coverMetaItem}>
          <Text style={styles.coverMetaLabel}>Client</Text>
          <Text style={styles.coverMetaValue}>{meta.clientName}</Text>
        </View>
        <View style={styles.coverMetaItem}>
          <Text style={styles.coverMetaLabel}>Prepared By</Text>
          <Text style={styles.coverMetaValue}>{meta.preparedBy}</Text>
        </View>
        <View style={styles.coverMetaItem}>
          <Text style={styles.coverMetaLabel}>Date</Text>
          <Text style={styles.coverMetaValue}>{meta.date}</Text>
        </View>
        <View style={styles.coverMetaItem}>
          <Text style={styles.coverMetaLabel}>Document Ref</Text>
          <Text style={styles.coverMetaValue}>{meta.documentRef}</Text>
        </View>
        <View style={styles.coverMetaItem}>
          <Text style={styles.coverMetaLabel}>Version</Text>
          <Text style={styles.coverMetaValue}>{meta.version}</Text>
        </View>
      </View>
    </View>

    {/* Footer with Design Codes */}
    <View style={styles.coverFooter}>
      <Text style={styles.coverDesignCodes}>Design Codes: {meta.designCodes.join(' | ')}</Text>
      {meta.checkedBy && <Text style={styles.coverDesignCodes}>Checked By: {meta.checkedBy}</Text>}
    </View>
  </Page>
);

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

interface TOCEntry {
  number: string;
  title: string;
}

export const TableOfContents: React.FC<{ entries: TOCEntry[] }> = ({ entries }) => (
  <View>
    <SectionTitle number="" title="Table of Contents" />
    {entries.map((entry, idx) => (
      <View key={idx} style={styles.tocEntry}>
        <Text style={styles.tocNumber}>{entry.number}</Text>
        <Text style={styles.tocTitle}>{entry.title}</Text>
      </View>
    ))}
  </View>
);

// ============================================================================
// EXECUTIVE SUMMARY
// ============================================================================

export const ExecutiveSummarySection: React.FC<{ data: ExecutiveSummary }> = ({ data }) => (
  <View>
    <SectionTitle number="1." title="Executive Summary" />

    {/* Status Badge */}
    <View style={[styles.row, styles.alignCenter, styles.mb_lg]}>
      <Text style={styles.textBold}>Design Status: </Text>
      <StatusBadge status={data.overallStatus} large />
    </View>

    {/* Summary Cards */}
    <View style={styles.summaryGrid}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Governing Check</Text>
        <Text style={styles.summaryValue}>{data.governingCheck}</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Max Utilisation</Text>
        <UtilisationDisplay value={data.maxUtilisation ?? 0} />
      </View>
    </View>

    {/* Key Dimensions */}
    {data.keyDimensions && data.keyDimensions.length > 0 && (
      <View style={styles.mb_md}>
        <SubsectionTitle title="Key Dimensions" />
        <DataTable
          columns={[
            { header: 'Parameter', key: 'label', width: '50%' },
            { header: 'Value', key: 'value', align: 'right', width: '30%' },
            { header: 'Unit', key: 'unit', align: 'center', width: '20%' },
          ]}
          data={data.keyDimensions}
        />
      </View>
    )}

    {/* Key Loads */}
    {data.keyLoads && data.keyLoads.length > 0 && (
      <View style={styles.mb_md}>
        <SubsectionTitle title="Key Loads" />
        <DataTable
          columns={[
            { header: 'Load', key: 'label', width: '50%' },
            { header: 'Value', key: 'value', align: 'right', width: '30%' },
            { header: 'Unit', key: 'unit', align: 'center', width: '20%' },
          ]}
          data={data.keyLoads}
        />
      </View>
    )}

    {/* Model Snapshot */}
    {data.modelSnapshot && (
      <View style={styles.imageContainer}>
        <Image src={data.modelSnapshot.src} style={styles.imageHalf} />
        {data.modelSnapshot.caption && (
          <Text style={styles.imageCaption}>{data.modelSnapshot.caption}</Text>
        )}
      </View>
    )}
  </View>
);

// ============================================================================
// INPUTS SECTION
// ============================================================================

const InputTable: React.FC<{ section: InputSection }> = ({ section }) => (
  <View style={styles.mb_md}>
    <SubsectionTitle title={section.title} />
    <DataTable
      columns={[
        { header: 'Parameter', key: 'label', width: '45%' },
        { header: 'Value', key: 'value', align: 'right', width: '30%' },
        { header: 'Unit', key: 'unit', align: 'center', width: '15%' },
        {
          header: '',
          key: 'description',
          width: '10%',
          render: (val) => (val ? <Text style={styles.textSmall}>{val}</Text> : null),
        },
      ]}
      data={section.parameters}
    />
  </View>
);

export const InputsSection: React.FC<{ inputs: ReportInputs; designCodes: string[] }> = ({
  inputs,
  designCodes,
}) => (
  <View>
    <SectionTitle number="2." title="Input Parameters" />

    {inputs.geometry && <InputTable section={inputs.geometry} />}
    {inputs.materials && <InputTable section={inputs.materials} />}
    {inputs.loads && <InputTable section={inputs.loads} />}
    {inputs.reinforcement && <InputTable section={inputs.reinforcement} />}
    {inputs.studs && <InputTable section={inputs.studs} />}
    {inputs.stiffeners && <InputTable section={inputs.stiffeners} />}
    {inputs.supportConditions && <InputTable section={inputs.supportConditions} />}
    {inputs.other?.map((section, idx) => (
      <InputTable key={idx} section={section} />
    ))}

    {/* Design Codes */}
    <View style={styles.mb_md}>
      <SubsectionTitle title="Design Codes" />
      <View style={styles.table}>
        {designCodes.map((code, idx) => (
          <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <View style={styles.tableCell}>
              <Text>{code}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  </View>
);

// ============================================================================
// 3D MODEL & DIAGRAMS
// ============================================================================

export const ModelSection: React.FC<{ image: ReportImage }> = ({ image }) => (
  <View>
    <SectionTitle number="3." title="3D Model View" />
    <View style={styles.imageContainer}>
      <Image src={image.src} style={styles.imageFull} />
      {image.caption && <Text style={styles.imageCaption}>{image.caption}</Text>}
    </View>
  </View>
);

export const DiagramsSection: React.FC<{ diagrams: DiagramSection }> = ({ diagrams }) => (
  <View>
    <SectionTitle number="4." title="Diagrams" />

    <View style={styles.imageGrid}>
      {diagrams.crossSection && (
        <View style={styles.imageGridItem}>
          <Image src={diagrams.crossSection.src} style={styles.imageHalf} />
          <Text style={styles.imageCaption}>
            {diagrams.crossSection.caption || 'Cross Section'}
          </Text>
        </View>
      )}
      {diagrams.loadDiagram && (
        <View style={styles.imageGridItem}>
          <Image src={diagrams.loadDiagram.src} style={styles.imageHalf} />
          <Text style={styles.imageCaption}>{diagrams.loadDiagram.caption || 'Load Diagram'}</Text>
        </View>
      )}
      {diagrams.shearForceDiagram && (
        <View style={styles.imageGridItem}>
          <Image src={diagrams.shearForceDiagram.src} style={styles.imageHalf} />
          <Text style={styles.imageCaption}>
            {diagrams.shearForceDiagram.caption || 'Shear Force Diagram'}
          </Text>
        </View>
      )}
      {diagrams.bendingMomentDiagram && (
        <View style={styles.imageGridItem}>
          <Image src={diagrams.bendingMomentDiagram.src} style={styles.imageHalf} />
          <Text style={styles.imageCaption}>
            {diagrams.bendingMomentDiagram.caption || 'Bending Moment Diagram'}
          </Text>
        </View>
      )}
      {diagrams.deflectionShape && (
        <View style={styles.imageGridItem}>
          <Image src={diagrams.deflectionShape.src} style={styles.imageHalf} />
          <Text style={styles.imageCaption}>
            {diagrams.deflectionShape.caption || 'Deflection Shape'}
          </Text>
        </View>
      )}
      {diagrams.custom?.map((img, idx) => (
        <View key={idx} style={styles.imageGridItem}>
          <Image src={img.src} style={styles.imageHalf} />
          {img.caption && <Text style={styles.imageCaption}>{img.caption}</Text>}
        </View>
      ))}
    </View>
  </View>
);

// ============================================================================
// SECTION PROPERTIES
// ============================================================================

export const SectionPropertiesSection: React.FC<{
  properties: SectionProperty[];
}> = ({ properties }) => (
  <View>
    <SectionTitle number="5." title="Section Properties" />
    <DataTable
      columns={[
        { header: 'Property', key: 'name', width: '35%' },
        { header: 'Symbol', key: 'symbol', align: 'center', width: '15%' },
        { header: 'Value', key: 'value', align: 'right', width: '25%' },
        { header: 'Unit', key: 'unit', align: 'center', width: '15%' },
        {
          header: 'Clause',
          key: 'clause',
          align: 'center',
          width: '10%',
          render: (val) => (val ? <Text style={styles.clauseRef}>{val}</Text> : null),
        },
      ]}
      data={properties}
    />
  </View>
);

// ============================================================================
// DESIGN CHECKS
// ============================================================================

const DesignCheckRow: React.FC<{ check: DesignCheck }> = ({ check }) => {
  const getUtilStyle = () => {
    const util = check.utilisation > 1 ? check.utilisation : check.utilisation * 100;
    if (util > 95) return styles.utilisationHigh;
    if (util > 80) return styles.utilisationMedium;
    return styles.utilisationLow;
  };

  return (
    <View style={styles.tableRow}>
      <View style={[styles.tableCell, { width: '25%' }]}>
        <Text style={styles.textBold}>{check.name}</Text>
      </View>
      <View style={[styles.tableCellNumeric, { width: '15%' }]}>
        <Text>
          {(check.designValue ?? 0).toFixed(2)} {check.designValueUnit}
        </Text>
      </View>
      <View style={[styles.tableCellNumeric, { width: '15%' }]}>
        <Text>
          {(check.resistance ?? 0).toFixed(2)} {check.resistanceUnit}
        </Text>
      </View>
      <View style={[styles.tableCellCenter, { width: '15%' }]}>
        <Text style={getUtilStyle()}>
          {(check.utilisation > 1 ? check.utilisation : check.utilisation * 100).toFixed(1)}%
        </Text>
      </View>
      <View style={[styles.tableCellCenter, { width: '15%' }]}>
        {check.clause && <Text style={styles.clauseRef}>{check.clause}</Text>}
      </View>
      <View style={[styles.tableCellCenter, { width: '15%' }]}>
        <StatusBadge status={check.status} />
      </View>
    </View>
  );
};

export const DesignChecksSection: React.FC<{
  sections: DesignCheckSection[];
}> = ({ sections }) => (
  <View>
    <SectionTitle number="6." title="Design Checks" />

    {sections.map((section, sectionIdx) => (
      <View key={sectionIdx} style={styles.mb_lg}>
        <SubsectionTitle title={section.title} />
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, { width: '25%' }]}>
              <Text>Check</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '15%' }]}>
              <Text>Ed</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '15%' }]}>
              <Text>Rd</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '15%' }]}>
              <Text>Util.</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '15%' }]}>
              <Text>Clause</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '15%' }]}>
              <Text>Status</Text>
            </View>
          </View>
          {section.checks.map((check, checkIdx) => (
            <DesignCheckRow key={checkIdx} check={check} />
          ))}
        </View>
      </View>
    ))}
  </View>
);

// ============================================================================
// DETAILED CALCULATIONS
// ============================================================================

export const DetailedCalculationsSection: React.FC<{
  calculations: DetailedCalculation[];
}> = ({ calculations }) => (
  <View>
    <SectionTitle number="7." title="Detailed Calculations" />

    {calculations.map((calc, calcIdx) => (
      <View key={calcIdx} style={styles.mb_lg}>
        <SubsectionTitle title={calc.title} />
        {calc.steps.map((step, stepIdx) => (
          <View key={stepIdx} style={styles.calculationBlock}>
            <Text style={styles.textBold}>{step.description}</Text>
            {step.clause && <Text style={styles.clauseRef}>Ref: {step.clause}</Text>}
            {step.formula && <Text style={styles.formula}>{step.formula}</Text>}
            {step.substitution && <Text style={styles.formula}>{step.substitution}</Text>}
            {step.result !== undefined && (
              <Text style={styles.formulaResult}>
                = {step.result} {step.unit || ''}
              </Text>
            )}
          </View>
        ))}
      </View>
    ))}
  </View>
);

// ============================================================================
// WARNINGS & NOTES
// ============================================================================

export const WarningsSection: React.FC<{ warnings: ReportWarning[] }> = ({ warnings }) => (
  <View>
    <SectionTitle number="8." title="Warnings & Notes" />

    {warnings.map((warning, idx) => {
      const boxStyle =
        warning.severity === 'error'
          ? styles.errorBox
          : warning.severity === 'warning'
            ? styles.warningBox
            : styles.infoBox;

      const titleColor =
        warning.severity === 'error'
          ? BRAND_COLORS.failRed
          : warning.severity === 'warning'
            ? '#856404'
            : BRAND_COLORS.lightBlue;

      return (
        <View key={idx} style={boxStyle}>
          <View style={styles.boxContent}>
            <Text style={[styles.boxTitle, { color: titleColor }]}>
              {warning.severity === 'error' ? '⚠ ' : warning.severity === 'warning' ? '⚡ ' : 'ℹ '}
              {warning.title}
            </Text>
            <Text style={styles.boxMessage}>{warning.message}</Text>
            {warning.reference && (
              <Text style={styles.clauseRef}>Reference: {warning.reference}</Text>
            )}
          </View>
        </View>
      );
    })}
  </View>
);

// ============================================================================
// CONCLUSION
// ============================================================================

export const ConclusionSection: React.FC<{ conclusion: ReportConclusion }> = ({ conclusion }) => (
  <View>
    <SectionTitle number="9." title="Conclusion" />

    <View
      style={[
        styles.conclusionBox,
        conclusion.status === 'PASS' ? styles.conclusionPass : styles.conclusionFail,
      ]}
    >
      <Text
        style={[
          styles.conclusionTitle,
          conclusion.status === 'PASS' ? styles.conclusionPassTitle : styles.conclusionFailTitle,
        ]}
      >
        {conclusion.status === 'PASS' ? 'DESIGN PASSES' : 'DESIGN FAILS'}
      </Text>
      <Text style={styles.paragraph}>{conclusion.summary}</Text>
    </View>

    {/* Governing Checks */}
    {conclusion.governingChecks && conclusion.governingChecks.length > 0 && (
      <>
        <SubsectionTitle title="Governing Checks" />
        <View style={styles.mb_md}>
          {conclusion.governingChecks.map((check, idx) => (
            <Text key={idx} style={styles.paragraph}>
              • {check}
            </Text>
          ))}
        </View>
      </>
    )}

    {/* Suggestions */}
    {conclusion.suggestions && conclusion.suggestions.length > 0 && (
      <View style={styles.mb_md}>
        <SubsectionTitle title="Recommendations" />
        {conclusion.suggestions.map((suggestion, idx) => (
          <Text key={idx} style={styles.paragraph}>
            • {suggestion}
          </Text>
        ))}
      </View>
    )}

    {/* Alternatives */}
    {conclusion.alternatives && conclusion.alternatives.length > 0 && (
      <View style={styles.mb_md}>
        <SubsectionTitle title="Alternative Sections to Consider" />
        {conclusion.alternatives.map((alt, idx) => (
          <Text key={idx} style={styles.paragraph}>
            • {alt}
          </Text>
        ))}
      </View>
    )}
  </View>
);

// ============================================================================
// APPENDIX
// ============================================================================

export const AppendixSection: React.FC<{ items: AppendixItem[] }> = ({ items }) => (
  <View>
    <SectionTitle number="10." title="Appendix" />

    {items.map((item, idx) => (
      <View key={idx} style={styles.mb_lg}>
        <SubsectionTitle title={item.title} />
        {item.type === 'json' ? (
          <View style={styles.codeBlock}>
            <Text>{JSON.stringify(item.content, null, 2)}</Text>
          </View>
        ) : (
          <Text style={styles.paragraph}>{String(item.content)}</Text>
        )}
      </View>
    ))}
  </View>
);
