// =============================================================================
// Pad Footing Bearing PDF Report Builder
// =============================================================================

import { ReportData, ReportSection } from '../types';

export function buildPadFootingReport(
  form: any,
  results: any,
  warnings: string[],
  projectInfo: { projectName: string; clientName: string; preparedBy: string },
): ReportData {
  const sections: ReportSection[] = [];

  // Project Information
  sections.push({
    title: 'Project Information',
    content: [
      { label: 'Project Name', value: projectInfo.projectName },
      { label: 'Reference', value: form.reference },
      { label: 'Prepared By', value: projectInfo.preparedBy },
      { label: 'Date', value: new Date().toLocaleDateString('en-GB') },
    ],
  });

  // Footing Geometry
  sections.push({
    title: 'Footing Geometry',
    content: [
      { label: 'Footing Length (L)', value: form.footingLength, unit: 'm' },
      { label: 'Footing Width (B)', value: form.footingWidth, unit: 'm' },
      { label: 'Footing Depth (D)', value: form.footingDepth, unit: 'm' },
      { label: 'Embedment Depth (Df)', value: form.embedmentDepth, unit: 'm' },
      { label: 'Footing Area', value: results.footingArea.toFixed(2), unit: 'm²' },
      { label: 'Aspect Ratio (L/B)', value: results.aspectRatio.toFixed(2) },
    ],
  });

  // Applied Loading
  sections.push({
    title: 'Applied Loading',
    content: [
      { label: 'Vertical Load (V)', value: form.verticalLoad, unit: 'kN' },
      { label: 'Horizontal Load X (Hx)', value: form.horizontalLoadX, unit: 'kN' },
      { label: 'Horizontal Load Y (Hy)', value: form.horizontalLoadY, unit: 'kN' },
      { label: 'Moment X (Mx)', value: form.momentX, unit: 'kNm' },
      { label: 'Moment Y (My)', value: form.momentY, unit: 'kNm' },
    ],
  });

  // Soil Properties
  sections.push({
    title: 'Soil Properties',
    content: [
      { label: 'Soil Type', value: form.soilType },
      { label: 'Allowable Bearing Capacity', value: form.bearingCapacity, unit: 'kPa' },
      { label: 'Unit Weight (γ)', value: form.unitWeight, unit: 'kN/m³' },
      { label: 'Friction Angle (φ)', value: form.frictionAngle, unit: '°' },
      { label: 'Cohesion (c)', value: form.cohesion, unit: 'kPa' },
    ],
  });

  // Eccentricity Analysis
  sections.push({
    title: 'Eccentricity Analysis (Meyerhof Method)',
    content: [
      { label: 'Eccentricity eX', value: results.eccentricityX.toFixed(3), unit: 'm' },
      { label: 'Eccentricity eY', value: results.eccentricityY.toFixed(3), unit: 'm' },
      {
        label: 'Middle Third Limit (L/6)',
        value: (parseFloat(form.footingLength) / 6).toFixed(3),
        unit: 'm',
      },
      {
        label: 'Middle Third Limit (B/6)',
        value: (parseFloat(form.footingWidth) / 6).toFixed(3),
        unit: 'm',
      },
      { label: "Effective Length (L')", value: results.effectiveLengthX.toFixed(3), unit: 'm' },
      { label: "Effective Width (B')", value: results.effectiveLengthY.toFixed(3), unit: 'm' },
      { label: "Effective Area (A')", value: results.effectiveArea.toFixed(3), unit: 'm²' },
    ],
  });

  // Bearing Check
  sections.push({
    title: 'Bearing Capacity Check',
    content: [
      { label: 'Applied Bearing Pressure', value: results.bearingPressure.toFixed(1), unit: 'kPa' },
      {
        label: 'Allowable Bearing (factored)',
        value: results.allowableBearing.toFixed(1),
        unit: 'kPa',
      },
      {
        label: 'Bearing Utilisation',
        value: (results.bearingUtilisation * 100).toFixed(1),
        unit: '%',
      },
      { label: 'Bearing Status', value: results.bearingStatus, status: results.bearingStatus },
    ],
  });

  // Sliding Check
  sections.push({
    title: 'Sliding Resistance Check',
    content: [
      { label: 'Horizontal Force (H)', value: results.slidingDemand.toFixed(1), unit: 'kN' },
      { label: 'Sliding Resistance', value: results.slidingResistance.toFixed(1), unit: 'kN' },
      {
        label: 'Sliding Utilisation',
        value: (results.slidingUtilisation * 100).toFixed(1),
        unit: '%',
      },
      { label: 'Sliding Status', value: results.slidingStatus, status: results.slidingStatus },
    ],
  });

  // Overturning Check
  sections.push({
    title: 'Overturning Stability Check',
    content: [
      { label: 'Overturning Moment', value: results.overturningMoment.toFixed(1), unit: 'kNm' },
      { label: 'Resisting Moment', value: results.resistingMoment.toFixed(1), unit: 'kNm' },
      { label: 'Factor of Safety', value: results.overturningFOS.toFixed(2) },
      { label: 'Required FOS', value: '1.50' },
      {
        label: 'Overturning Status',
        value: results.overturningStatus,
        status: results.overturningStatus,
      },
    ],
  });

  // Settlement
  sections.push({
    title: 'Settlement Estimate',
    content: [
      { label: 'Immediate Settlement', value: results.immediateSettlement.toFixed(1), unit: 'mm' },
      {
        label: 'Consolidation Settlement',
        value: results.consolidationSettlement.toFixed(1),
        unit: 'mm',
      },
      { label: 'Total Settlement', value: results.totalSettlement.toFixed(1), unit: 'mm' },
      { label: 'Typical Limit', value: '25', unit: 'mm' },
    ],
  });

  // Warnings
  if (warnings.length > 0) {
    sections.push({
      title: 'Design Warnings',
      content: warnings.map((w, i) => ({ label: `Warning ${i + 1}`, value: w })),
    });
  }

  // Summary
  sections.push({
    title: 'Design Summary',
    content: [
      { label: 'Bearing Check', value: results.bearingStatus, status: results.bearingStatus },
      { label: 'Sliding Check', value: results.slidingStatus, status: results.slidingStatus },
      {
        label: 'Overturning Check',
        value: results.overturningStatus,
        status: results.overturningStatus,
      },
      { label: 'Overall Rating', value: results.rating },
      { label: 'Overall Status', value: results.overallStatus, status: results.overallStatus },
    ],
  });

  return {
    title: 'Pad Footing Bearing Analysis',
    subtitle: 'EN 1997-1:2004 Geotechnical Design',
    projectInfo: {
      name: projectInfo.projectName,
      reference: form.reference,
      client: projectInfo.clientName,
      preparedBy: projectInfo.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    sections,
    designCode: 'EN 1997-1:2004',
    overallStatus: results.overallStatus,
    footerNote: 'Meyerhof effective area method | Eurocode 7 compliant',
  };
}
