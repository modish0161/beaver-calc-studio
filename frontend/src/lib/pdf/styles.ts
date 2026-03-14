// ============================================================================
// BeaverCalc Studio — PDF Styles & Theme
// Professional engineering report styling with brand alignment
// ============================================================================

import { Font, StyleSheet } from '@react-pdf/renderer';
import { BRAND_COLORS } from './types';

// Register fonts - using standard web-safe fonts for PDF compatibility
// Note: Custom fonts (Montserrat, Inter, etc.) can be registered if hosted
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' },
  ],
});

// Base spacing unit (in points, 72pt = 1 inch)
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const FONT_SIZE = {
  xs: 7,
  sm: 8,
  base: 9,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 18,
  xxxl: 24,
  title: 32,
};

// Main stylesheet for the report
export const styles = StyleSheet.create({
  // =========================================================================
  // PAGE LAYOUTS
  // =========================================================================
  page: {
    flexDirection: 'column',
    backgroundColor: BRAND_COLORS.white,
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
  },

  coverPage: {
    flexDirection: 'column',
    backgroundColor: BRAND_COLORS.white,
    padding: 0,
    fontFamily: 'Helvetica',
  },

  // =========================================================================
  // COVER PAGE STYLES
  // =========================================================================
  coverHeader: {
    backgroundColor: BRAND_COLORS.primaryBlue,
    height: 120,
    paddingHorizontal: 40,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  coverLogo: {
    width: 160,
    height: 60,
    objectFit: 'contain',
  },

  coverBadge: {
    backgroundColor: BRAND_COLORS.lightBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },

  coverBadgeText: {
    color: BRAND_COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },

  coverMain: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 40,
    justifyContent: 'center',
  },

  coverTitle: {
    fontSize: FONT_SIZE.title,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.md,
    lineHeight: 1.2,
  },

  coverSubtitle: {
    fontSize: FONT_SIZE.xl,
    color: BRAND_COLORS.secondaryBlue,
    marginBottom: SPACING.xxl,
  },

  coverMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xl,
  },

  coverMetaItem: {
    width: '50%',
    marginBottom: SPACING.md,
  },

  coverMetaLabel: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  coverMetaValue: {
    fontSize: FONT_SIZE.md,
    color: BRAND_COLORS.darkGrey,
    fontWeight: 'bold',
  },

  coverImageContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },

  coverImage: {
    maxWidth: 400,
    maxHeight: 250,
    borderRadius: 8,
    border: `1 solid ${BRAND_COLORS.borderLight}`,
  },

  coverFooter: {
    backgroundColor: BRAND_COLORS.neutralGrey,
    paddingHorizontal: 40,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  coverDesignCodes: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.textMuted,
  },

  // =========================================================================
  // HEADER & FOOTER
  // =========================================================================
  pageHeader: {
    position: 'absolute',
    top: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1 solid ${BRAND_COLORS.primaryBlue}`,
    paddingBottom: 8,
  },

  pageHeaderLogo: {
    width: 80,
    height: 30,
    objectFit: 'contain',
  },

  pageHeaderText: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.textMuted,
    textAlign: 'right',
  },

  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: `1 solid ${BRAND_COLORS.borderLight}`,
    paddingTop: 8,
  },

  footerText: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.textMuted,
  },

  footerCenter: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.textMuted,
    textAlign: 'center',
  },

  pageNumber: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.darkGrey,
    fontWeight: 'bold',
  },

  // =========================================================================
  // SECTION HEADINGS
  // =========================================================================
  sectionTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.lg,
    marginTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    borderBottom: `2 solid ${BRAND_COLORS.primaryBlue}`,
  },

  sectionNumber: {
    color: BRAND_COLORS.lightBlue,
    marginRight: SPACING.sm,
  },

  subsectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: BRAND_COLORS.secondaryBlue,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },

  subsubsectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: BRAND_COLORS.darkGrey,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  // =========================================================================
  // TABLE STYLES
  // =========================================================================
  table: {
    width: '100%',
    marginBottom: SPACING.lg,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.primaryBlue,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  tableHeaderCell: {
    padding: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    color: BRAND_COLORS.white,
  },

  tableRow: {
    flexDirection: 'row',
    borderBottom: `0.5 solid ${BRAND_COLORS.borderLight}`,
  },

  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: `0.5 solid ${BRAND_COLORS.borderLight}`,
    backgroundColor: BRAND_COLORS.tableAltRow,
  },

  tableCell: {
    padding: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
  },

  tableCellBold: {
    padding: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
    fontWeight: 'bold',
  },

  tableCellNumeric: {
    padding: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
    textAlign: 'right',
  },

  tableCellCenter: {
    padding: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
    textAlign: 'center',
  },

  // =========================================================================
  // STATUS BADGES
  // =========================================================================
  badgePass: {
    backgroundColor: BRAND_COLORS.successGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },

  badgeFail: {
    backgroundColor: BRAND_COLORS.failRed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },

  badgeWarning: {
    backgroundColor: BRAND_COLORS.warningAmber,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },

  badgeInfo: {
    backgroundColor: BRAND_COLORS.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },

  badgeText: {
    color: BRAND_COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  badgePassLarge: {
    backgroundColor: BRAND_COLORS.successGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  badgeFailLarge: {
    backgroundColor: BRAND_COLORS.failRed,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  badgeTextLarge: {
    color: BRAND_COLORS.white,
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // =========================================================================
  // UTILISATION STYLING
  // =========================================================================
  utilisationLow: {
    color: BRAND_COLORS.successGreen,
    fontWeight: 'bold',
  },

  utilisationMedium: {
    color: BRAND_COLORS.warningAmber,
    fontWeight: 'bold',
  },

  utilisationHigh: {
    color: BRAND_COLORS.failRed,
    fontWeight: 'bold',
  },

  utilisationBar: {
    height: 6,
    backgroundColor: BRAND_COLORS.neutralGrey,
    borderRadius: 3,
    marginTop: 4,
  },

  utilisationBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // =========================================================================
  // CONTENT STYLES
  // =========================================================================
  paragraph: {
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
    marginBottom: SPACING.md,
    lineHeight: 1.5,
  },

  text: {
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
  },

  textBold: {
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
    fontWeight: 'bold',
  },

  textMuted: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.textMuted,
  },

  textSmall: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.textMuted,
  },

  // =========================================================================
  // CALCULATION STYLES
  // =========================================================================
  calculationBlock: {
    backgroundColor: BRAND_COLORS.neutralGrey,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 4,
    borderLeft: `3 solid ${BRAND_COLORS.secondaryBlue}`,
  },

  formula: {
    fontFamily: 'Courier',
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
    backgroundColor: BRAND_COLORS.white,
    padding: SPACING.sm,
    marginVertical: SPACING.xs,
    borderRadius: 2,
  },

  formulaResult: {
    fontFamily: 'Courier',
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
  },

  clauseRef: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.textMuted,
    fontStyle: 'italic',
  },

  // =========================================================================
  // WARNING BOX STYLES
  // =========================================================================
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    borderLeft: `4 solid ${BRAND_COLORS.warningAmber}`,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 4,
  },

  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#F8D7DA',
    borderLeft: `4 solid ${BRAND_COLORS.failRed}`,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 4,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#D1ECF1',
    borderLeft: `4 solid ${BRAND_COLORS.lightBlue}`,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 4,
  },

  boxIcon: {
    width: 20,
    marginRight: SPACING.sm,
  },

  boxContent: {
    flex: 1,
  },

  boxTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },

  boxMessage: {
    fontSize: FONT_SIZE.base,
    lineHeight: 1.4,
  },

  // =========================================================================
  // IMAGE STYLES
  // =========================================================================
  imageContainer: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },

  imageFull: {
    maxWidth: '100%',
    maxHeight: 300,
  },

  imageHalf: {
    maxWidth: '48%',
    maxHeight: 200,
  },

  imageCaption: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },

  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: SPACING.md,
  },

  imageGridItem: {
    width: '48%',
    marginBottom: SPACING.md,
  },

  // =========================================================================
  // TOC STYLES
  // =========================================================================
  tocEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottom: `0.5 dotted ${BRAND_COLORS.borderLight}`,
  },

  tocNumber: {
    width: 30,
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.primaryBlue,
    fontWeight: 'bold',
  },

  tocTitle: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.darkGrey,
  },

  tocPage: {
    width: 30,
    fontSize: FONT_SIZE.base,
    color: BRAND_COLORS.textMuted,
    textAlign: 'right',
  },

  // =========================================================================
  // EXECUTIVE SUMMARY STYLES
  // =========================================================================
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: SPACING.md,
  },

  summaryCard: {
    width: '48%',
    backgroundColor: BRAND_COLORS.neutralGrey,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    marginRight: '2%',
    borderRadius: 4,
  },

  summaryCardFull: {
    width: '100%',
    backgroundColor: BRAND_COLORS.neutralGrey,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 4,
  },

  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: BRAND_COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },

  summaryValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: BRAND_COLORS.darkGrey,
  },

  summaryValueLarge: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
  },

  // =========================================================================
  // CONCLUSION STYLES
  // =========================================================================
  conclusionBox: {
    padding: SPACING.lg,
    borderRadius: 6,
    marginVertical: SPACING.lg,
  },

  conclusionPass: {
    backgroundColor: '#D4EDDA',
    borderLeft: `6 solid ${BRAND_COLORS.successGreen}`,
  },

  conclusionFail: {
    backgroundColor: '#F8D7DA',
    borderLeft: `6 solid ${BRAND_COLORS.failRed}`,
  },

  conclusionTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },

  conclusionPassTitle: {
    color: BRAND_COLORS.successGreen,
  },

  conclusionFailTitle: {
    color: BRAND_COLORS.failRed,
  },

  // =========================================================================
  // LAYOUT HELPERS
  // =========================================================================
  row: {
    flexDirection: 'row',
  },

  column: {
    flexDirection: 'column',
  },

  spaceBetween: {
    justifyContent: 'space-between',
  },

  alignCenter: {
    alignItems: 'center',
  },

  flex1: {
    flex: 1,
  },

  mb_sm: {
    marginBottom: SPACING.sm,
  },

  mb_md: {
    marginBottom: SPACING.md,
  },

  mb_lg: {
    marginBottom: SPACING.lg,
  },

  mt_md: {
    marginTop: SPACING.md,
  },

  mt_lg: {
    marginTop: SPACING.lg,
  },

  // =========================================================================
  // APPENDIX STYLES
  // =========================================================================
  codeBlock: {
    fontFamily: 'Courier',
    fontSize: FONT_SIZE.xs,
    backgroundColor: BRAND_COLORS.neutralGrey,
    padding: SPACING.md,
    borderRadius: 4,
    marginVertical: SPACING.sm,
  },
});

// Export spacing and font sizes for use in components
export { FONT_SIZE, SPACING };
