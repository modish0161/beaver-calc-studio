// =============================================================================
// PDF Utilities — Shared utilities for PDF builders
// =============================================================================

import { StyleSheet } from '@react-pdf/renderer';

/**
 * Create base PDF styles for react-pdf documents
 */
export function createPDFStyles() {
  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 30,
      fontFamily: 'Helvetica',
    },
    section: {
      marginBottom: 10,
    },
    heading: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#374151',
    },
    text: {
      fontSize: 10,
      lineHeight: 1.5,
      color: '#4b5563',
    },
    table: {
      width: '100%',
      marginTop: 8,
      marginBottom: 8,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      paddingVertical: 4,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#f3f4f6',
      borderBottomWidth: 1,
      borderBottomColor: '#d1d5db',
      paddingVertical: 6,
    },
    tableCell: {
      flex: 1,
      fontSize: 9,
      paddingHorizontal: 4,
    },
    tableCellHeader: {
      flex: 1,
      fontSize: 9,
      fontWeight: 'bold',
      paddingHorizontal: 4,
    },
    statusPass: {
      color: '#059669',
      fontWeight: 'bold',
    },
    statusFail: {
      color: '#dc2626',
      fontWeight: 'bold',
    },
  });
}

/**
 * Format a number with specified decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format a percentage with specified decimal places
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Get status color based on pass/fail
 */
export function getStatusColor(status: string): string {
  if (status.toUpperCase() === 'PASS' || status.toUpperCase() === 'OK') {
    return '#059669';
  } else if (status.toUpperCase() === 'FAIL') {
    return '#dc2626';
  }
  return '#d97706';
}
