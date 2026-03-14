// =============================================================================
// Access Ramps PDF Report Builder
// =============================================================================

import { ReportData, ReportSection } from '../types';

export function buildAccessRampsReport(
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

  // Ramp Geometry
  sections.push({
    title: 'Ramp Geometry',
    content: [
      { label: 'Rise (Height)', value: form.height, unit: 'm' },
      { label: 'Run (Length)', value: form.length, unit: 'm' },
      { label: 'Width', value: form.width, unit: 'm' },
      { label: 'Side Slope Ratio', value: `1:${form.sideSlopeRatio}` },
      { label: 'Slope Length', value: results.slopeLength.toFixed(1), unit: 'm' },
      { label: 'Slope Angle', value: results.slopeAngle.toFixed(1), unit: '°' },
    ],
  });

  // Plant & Material
  sections.push({
    title: 'Plant & Material',
    content: [
      { label: 'Plant Type', value: form.plantType },
      { label: 'Ramp Material', value: form.material },
      { label: 'Wet Conditions', value: form.wetConditions ? 'Yes' : 'No' },
      { label: 'Two-Way Traffic', value: form.twoWayTraffic ? 'Yes' : 'No' },
    ],
  });

  // Gradient Analysis
  sections.push({
    title: 'Gradient Analysis',
    content: [
      { label: 'Gradient', value: results.gradientPercent.toFixed(1), unit: '%' },
      { label: 'Gradient Ratio', value: `1:${results.gradientRatio.toFixed(1)}` },
      { label: 'Maximum Allowable Gradient', value: results.maxGrade.toString(), unit: '%' },
      { label: 'Gradient Status', value: results.gradeStatus, status: results.gradeStatus },
    ],
  });

  // Traction Analysis
  sections.push({
    title: 'Traction Analysis',
    content: [
      { label: 'Traction Safety Factor', value: results.tractionSF.toFixed(2) },
      { label: 'Minimum Required', value: '1.0' },
      { label: 'Traction Status', value: results.tractionStatus, status: results.tractionStatus },
    ],
  });

  // Width Check
  sections.push({
    title: 'Width Check',
    content: [
      { label: 'Width Provided', value: results.widthProvided.toFixed(1), unit: 'm' },
      { label: 'Width Required', value: results.widthRequired.toFixed(1), unit: 'm' },
      { label: 'Width Status', value: results.widthStatus, status: results.widthStatus },
    ],
  });

  // Safety
  sections.push({
    title: 'Safety Analysis',
    content: [
      {
        label: 'Stopping Distance (10 km/h)',
        value: results.runawayRisk ? 'RUNAWAY RISK' : results.stoppingDistance.toFixed(1),
        unit: results.runawayRisk ? '' : 'm',
      },
      { label: 'Runaway Risk', value: results.runawayRisk ? 'YES - CRITICAL' : 'No' },
    ],
  });

  // Quantities
  sections.push({
    title: 'Material Quantities',
    content: [
      { label: 'Fill Volume', value: results.totalVolume.toFixed(0), unit: 'm³' },
      { label: 'Fill Mass', value: results.totalMass.toFixed(0), unit: 'tonnes' },
    ],
  });

  // Warnings
  if (warnings.length > 0) {
    sections.push({
      title: 'Warnings & Recommendations',
      content: warnings.map((w, i) => ({ label: `Warning ${i + 1}`, value: w })),
    });
  }

  // Summary
  sections.push({
    title: 'Design Summary',
    content: [
      { label: 'Gradient Check', value: results.gradeStatus, status: results.gradeStatus },
      { label: 'Traction Check', value: results.tractionStatus, status: results.tractionStatus },
      { label: 'Width Check', value: results.widthStatus, status: results.widthStatus },
      { label: 'Overall Rating', value: results.rating },
      { label: 'Overall Status', value: results.overallStatus, status: results.overallStatus },
    ],
  });

  return {
    title: 'Access Ramp Design',
    subtitle: 'Plant & Vehicle Access Analysis',
    projectInfo: {
      name: projectInfo.projectName,
      reference: form.reference,
      client: projectInfo.clientName,
      preparedBy: projectInfo.preparedBy,
      date: new Date().toLocaleDateString('en-GB'),
    },
    sections,
    designCode: 'Industry Standards',
    overallStatus: results.overallStatus,
    footerNote: 'Gradient, traction and width analysis for temporary works access',
  };
}
