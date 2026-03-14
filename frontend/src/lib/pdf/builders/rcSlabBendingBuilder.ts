// =============================================================================
// RC Slab Bending PDF Report Builder
// =============================================================================

import { ReportData, ReportSection } from "../types";

export function buildRCSlabBendingReport(
  form: any,
  results: any,
  warnings: string[] = [],
  projectInfo: {
    projectName?: string;
    clientName?: string;
    preparedBy?: string;
  } = {},
): ReportData {
  const sections: ReportSection[] = [];

  // Project Information
  sections.push({
    title: "Project Information",
    content: [
      { label: "Project Name", value: projectInfo.projectName },
      { label: "Reference", value: form.reference },
      { label: "Prepared By", value: projectInfo.preparedBy },
      { label: "Date", value: new Date().toLocaleDateString("en-GB") },
    ],
  });

  // Slab Geometry
  sections.push({
    title: "Slab Geometry",
    content: [
      { label: "Slab Type", value: form.slabType },
      { label: "Span X (Lx)", value: form.spanX, unit: "m" },
      { label: "Span Y (Ly)", value: form.spanY, unit: "m" },
      { label: "Thickness (h)", value: form.thickness, unit: "mm" },
      { label: "Cover Top", value: form.coverTop, unit: "mm" },
      { label: "Cover Bottom", value: form.coverBottom, unit: "mm" },
      { label: "Support Condition", value: form.supportCondition },
    ],
  });

  // Loading
  sections.push({
    title: "Applied Loading",
    content: [
      {
        label: "Superimposed Dead Load (gk)",
        value: form.deadLoad,
        unit: "kN/m²",
      },
      { label: "Live Load (qk)", value: form.liveLoad, unit: "kN/m²" },
      { label: "Load Category", value: form.loadType },
      {
        label: "ULS Design Load",
        value: results.totalULS.toFixed(2),
        unit: "kN/m²",
      },
      {
        label: "SLS Design Load",
        value: results.totalSLS.toFixed(2),
        unit: "kN/m²",
      },
    ],
  });

  // Material Properties
  sections.push({
    title: "Material Properties",
    content: [
      { label: "Concrete Grade", value: form.concreteGrade },
      {
        label: "Characteristic Strength (fck)",
        value: results.fck.toFixed(0),
        unit: "N/mm²",
      },
      {
        label: "Design Strength (fcd)",
        value: results.fcd.toFixed(1),
        unit: "N/mm²",
      },
      { label: "Steel Grade", value: form.steelGrade },
      {
        label: "Yield Strength (fyk)",
        value: results.fyk.toFixed(0),
        unit: "N/mm²",
      },
      {
        label: "Design Yield (fyd)",
        value: results.fyd.toFixed(1),
        unit: "N/mm²",
      },
    ],
  });

  // Bending Analysis
  sections.push({
    title: "Bending Moment Analysis",
    content: [
      {
        label: "Design Moment MEdx (span)",
        value: results.MEdX.toFixed(2),
        unit: "kNm/m",
      },
      {
        label: "Design Moment MEdy (span)",
        value: results.MEdY.toFixed(2),
        unit: "kNm/m",
      },
      {
        label: "Design Moment MEdx (support)",
        value: results.MEdXneg.toFixed(2),
        unit: "kNm/m",
      },
      {
        label: "Design Moment MEdy (support)",
        value: results.MEdYneg.toFixed(2),
        unit: "kNm/m",
      },
      { label: "Effective Depth dx", value: results.dX.toFixed(0), unit: "mm" },
      { label: "Effective Depth dy", value: results.dY.toFixed(0), unit: "mm" },
    ],
  });

  // Reinforcement Design - X Direction
  sections.push({
    title: "Reinforcement Design - X Direction",
    content: [
      { label: "K Factor", value: results.KX.toFixed(4) },
      { label: "Lever Arm (z)", value: results.zX.toFixed(1), unit: "mm" },
      { label: "As Required", value: results.AsReqX.toFixed(0), unit: "mm²/m" },
      { label: "As Minimum", value: results.AsMin.toFixed(0), unit: "mm²/m" },
      { label: "As Provided", value: results.AsProvX },
      {
        label: "As Provided Area",
        value: results.AsProvXarea.toFixed(0),
        unit: "mm²/m",
      },
      {
        label: "Utilisation",
        value: (results.utilisationX * 100).toFixed(1),
        unit: "%",
      },
      { label: "Status", value: results.statusX, status: results.statusX },
    ],
  });

  // Reinforcement Design - Y Direction
  sections.push({
    title: "Reinforcement Design - Y Direction",
    content: [
      { label: "K Factor", value: results.KY.toFixed(4) },
      { label: "Lever Arm (z)", value: results.zY.toFixed(1), unit: "mm" },
      { label: "As Required", value: results.AsReqY.toFixed(0), unit: "mm²/m" },
      { label: "As Provided", value: results.AsProvY },
      {
        label: "As Provided Area",
        value: results.AsProvYarea.toFixed(0),
        unit: "mm²/m",
      },
      {
        label: "Utilisation",
        value: (results.utilisationY * 100).toFixed(1),
        unit: "%",
      },
      { label: "Status", value: results.statusY, status: results.statusY },
    ],
  });

  // Shear Check
  sections.push({
    title: "Shear Check (without shear reinforcement)",
    content: [
      {
        label: "Design Shear (VEd)",
        value: results.VEd.toFixed(1),
        unit: "kN/m",
      },
      {
        label: "Shear Resistance (VRd,c)",
        value: results.VRdc.toFixed(1),
        unit: "kN/m",
      },
      {
        label: "Shear Status",
        value: results.shearStatus,
        status: results.shearStatus,
      },
    ],
  });

  // Deflection Check
  sections.push({
    title: "Deflection Check (Span/Depth)",
    content: [
      { label: "Actual L/d Ratio", value: results.spanDepthRatio.toFixed(1) },
      { label: "Limiting L/d Ratio", value: results.spanDepthLimit.toFixed(1) },
      {
        label: "Deflection Status",
        value: results.deflectionStatus,
        status: results.deflectionStatus,
      },
    ],
  });

  // Crack Width
  sections.push({
    title: "Crack Width Check",
    content: [
      {
        label: "Estimated Crack Width",
        value: results.crackWidth.toFixed(2),
        unit: "mm",
      },
      {
        label: "Crack Width Limit",
        value: results.crackLimit.toFixed(2),
        unit: "mm",
      },
      {
        label: "Crack Status",
        value: results.crackStatus,
        status: results.crackStatus,
      },
    ],
  });

  // Warnings
  if (warnings.length > 0) {
    sections.push({
      title: "Design Warnings",
      content: warnings.map((w, i) => ({
        label: `Warning ${i + 1}`,
        value: w,
      })),
    });
  }

  // Summary
  sections.push({
    title: "Design Summary",
    content: [
      { label: "Bending X", value: results.statusX, status: results.statusX },
      { label: "Bending Y", value: results.statusY, status: results.statusY },
      {
        label: "Shear",
        value: results.shearStatus,
        status: results.shearStatus,
      },
      {
        label: "Deflection",
        value: results.deflectionStatus,
        status: results.deflectionStatus,
      },
      { label: "Overall Rating", value: results.rating },
      {
        label: "Overall Status",
        value: results.overallStatus,
        status: results.overallStatus,
      },
    ],
  });

  return {
    title: "RC Slab Bending Design",
    subtitle: "EN 1992-1-1:2004 Eurocode 2",
    projectInfo: {
      name: projectInfo.projectName,
      reference: form.reference,
      client: projectInfo.clientName,
      preparedBy: projectInfo.preparedBy,
      date: new Date().toLocaleDateString("en-GB"),
    },
    sections,
    designCode: "EN 1992-1-1:2004",
    overallStatus: results.overallStatus,
    footerNote: "Eurocode 2 reinforced concrete design",
  };
}
