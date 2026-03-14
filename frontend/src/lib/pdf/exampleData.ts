// ============================================================================
// BeaverCalc Studio — Example Report Data
// Mock data for Steel Plate Girder Calculator demonstration
// ============================================================================

import { ReportData } from './types';

/**
 * Example ReportData for a Steel Plate Girder Design
 *
 * This demonstrates how to populate the ReportData interface
 * for use with the BeaverCalcReport component.
 */
export const steelPlateGirderExampleData: ReportData = {
  // =========================================================================
  // METADATA
  // =========================================================================
  meta: {
    calculatorName: 'Steel Plate Girder Calculator',
    title: 'Steel Plate Girder Design Report',
    subtitle: 'Simply Supported Highway Bridge Girder',
    projectName: 'A49 Bridge Replacement - Ludlow',
    clientName: 'Highways England',
    preparedBy: 'J. Smith CEng MIStructE',
    checkedBy: 'M. Williams CEng MICE',
    approvedBy: 'S. Jones FIStructE',
    documentRef: 'BB-CALC-2026-0042',
    version: 'Rev A',
    date: '03/02/2026',
    designCodes: [
      'BS EN 1993-1-1:2005+A1:2014',
      'BS EN 1993-1-5:2006',
      'BS EN 1993-2:2006',
      'NA to BS EN 1993-1-1',
      'PD 6695-2:2008',
    ],
  },

  // =========================================================================
  // EXECUTIVE SUMMARY
  // =========================================================================
  executiveSummary: {
    overallStatus: 'PASS',
    governingCheck: 'Lateral Torsional Buckling (91.2% utilisation)',
    maxUtilisation: 0.912,
    keyDimensions: [
      { label: 'Span', value: 25.0, unit: 'm' },
      { label: 'Overall Depth', value: 1500, unit: 'mm' },
      { label: 'Top Flange', value: '400 × 30', unit: 'mm' },
      { label: 'Bottom Flange', value: '450 × 40', unit: 'mm' },
      { label: 'Web', value: '1430 × 14', unit: 'mm' },
    ],
    keyLoads: [
      { label: 'Max Bending Moment (ULS)', value: 8450, unit: 'kNm' },
      { label: 'Max Shear Force (ULS)', value: 1250, unit: 'kN' },
      { label: 'Max Deflection (SLS)', value: 42.5, unit: 'mm' },
    ],
    modelSnapshot: {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      alt: '3D Model of Steel Plate Girder',
      caption: 'Isometric view of plate girder showing load application points',
    },
  },

  // =========================================================================
  // INPUT PARAMETERS
  // =========================================================================
  inputs: {
    geometry: {
      title: 'Geometry',
      parameters: [
        { label: 'Span Length', value: 25.0, unit: 'm' },
        { label: 'Girder Spacing', value: 3.5, unit: 'm' },
        { label: 'Overall Depth', value: 1500, unit: 'mm' },
        { label: 'Top Flange Width', value: 400, unit: 'mm' },
        { label: 'Top Flange Thickness', value: 30, unit: 'mm' },
        { label: 'Bottom Flange Width', value: 450, unit: 'mm' },
        { label: 'Bottom Flange Thickness', value: 40, unit: 'mm' },
        { label: 'Web Height', value: 1430, unit: 'mm' },
        { label: 'Web Thickness', value: 14, unit: 'mm' },
      ],
    },
    materials: {
      title: 'Materials',
      parameters: [
        { label: 'Steel Grade (Flanges)', value: 'S355J2', unit: '' },
        { label: 'Steel Grade (Web)', value: 'S355J2', unit: '' },
        { label: 'Yield Strength (fy)', value: 335, unit: 'N/mm²', description: 'tf > 16mm' },
        { label: 'Ultimate Strength (fu)', value: 470, unit: 'N/mm²' },
        { label: 'Elastic Modulus (E)', value: 210000, unit: 'N/mm²' },
        { label: "Poisson's Ratio (ν)", value: 0.3, unit: '' },
        { label: 'Partial Factor (γM0)', value: 1.0, unit: '' },
        { label: 'Partial Factor (γM1)', value: 1.0, unit: '' },
      ],
    },
    loads: {
      title: 'Applied Loads',
      parameters: [
        { label: 'Permanent Load (gk)', value: 45.0, unit: 'kN/m' },
        { label: 'Variable Load (qk)', value: 75.0, unit: 'kN/m' },
        { label: 'Load Factor (γG)', value: 1.35, unit: '' },
        { label: 'Load Factor (γQ)', value: 1.5, unit: '' },
        { label: 'Design UDL (ULS)', value: 173.25, unit: 'kN/m' },
        { label: 'Design UDL (SLS)', value: 120.0, unit: 'kN/m' },
      ],
    },
    stiffeners: {
      title: 'Web Stiffeners',
      parameters: [
        { label: 'Transverse Stiffener Spacing', value: 2500, unit: 'mm' },
        { label: 'Stiffener Thickness', value: 12, unit: 'mm' },
        { label: 'Stiffener Outstand', value: 120, unit: 'mm' },
        { label: 'Bearing Stiffener Thickness', value: 20, unit: 'mm' },
        { label: 'Bearing Stiffener Width', value: 180, unit: 'mm' },
      ],
    },
    supportConditions: {
      title: 'Support Conditions',
      parameters: [
        { label: 'Left Support', value: 'Pinned', unit: '' },
        { label: 'Right Support', value: 'Roller', unit: '' },
        { label: 'Lateral Restraint Spacing', value: 5.0, unit: 'm' },
        { label: 'Effective Length Factor (kc)', value: 1.0, unit: '' },
      ],
    },
  },

  // =========================================================================
  // 3D MODEL IMAGE (would be captured from viewer)
  // =========================================================================
  modelImage: {
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Full 3D Model View',
    caption: 'Steel plate girder - rendered in BeaverCalc 3D viewer',
  },

  // =========================================================================
  // DIAGRAMS (would be generated/captured from app)
  // =========================================================================
  diagrams: {
    crossSection: {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      alt: 'Cross Section',
      caption: 'Typical cross-section with dimensions',
    },
    bendingMomentDiagram: {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      alt: 'Bending Moment Diagram',
      caption: 'Bending moment diagram (ULS)',
    },
    shearForceDiagram: {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      alt: 'Shear Force Diagram',
      caption: 'Shear force diagram (ULS)',
    },
    deflectionShape: {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      alt: 'Deflection Shape',
      caption: 'Deflected shape (SLS) - max 42.5mm',
    },
  },

  // =========================================================================
  // SECTION PROPERTIES
  // =========================================================================
  sectionProperties: [
    { name: 'Cross-sectional Area', symbol: 'A', value: 56020, unit: 'mm²' },
    {
      name: 'Second Moment of Area (Major)',
      symbol: 'Iy',
      value: 2.45e10,
      unit: 'mm⁴',
      clause: '6.2.5',
    },
    { name: 'Second Moment of Area (Minor)', symbol: 'Iz', value: 4.82e8, unit: 'mm⁴' },
    {
      name: 'Elastic Section Modulus (Top)',
      symbol: 'Wel,top',
      value: 3.08e7,
      unit: 'mm³',
      clause: '6.2.5',
    },
    {
      name: 'Elastic Section Modulus (Bot)',
      symbol: 'Wel,bot',
      value: 3.45e7,
      unit: 'mm³',
      clause: '6.2.5',
    },
    { name: 'Plastic Section Modulus', symbol: 'Wpl', value: 3.92e7, unit: 'mm³', clause: '6.2.5' },
    { name: 'Shear Area', symbol: 'Av', value: 20020, unit: 'mm²', clause: '6.2.6' },
    { name: 'Torsional Constant', symbol: 'IT', value: 2.15e6, unit: 'mm⁴' },
    { name: 'Warping Constant', symbol: 'Iw', value: 8.42e12, unit: 'mm⁶' },
    { name: 'Centroid from Bottom', symbol: 'yc', value: 712, unit: 'mm' },
    { name: 'Radius of Gyration (Major)', symbol: 'iy', value: 661, unit: 'mm' },
    { name: 'Radius of Gyration (Minor)', symbol: 'iz', value: 92.8, unit: 'mm' },
  ],

  // =========================================================================
  // DESIGN CHECKS
  // =========================================================================
  designChecks: [
    {
      title: 'Classification',
      checks: [
        {
          category: 'Classification',
          name: 'Top Flange Classification',
          designValue: 6.67,
          designValueUnit: 'c/tf',
          resistance: 9.0,
          resistanceUnit: 'Class 1 limit',
          utilisation: 0.74,
          clause: 'Table 5.2',
          status: 'PASS',
          notes: 'Class 1 - Plastic',
        },
        {
          category: 'Classification',
          name: 'Web Classification (Bending)',
          designValue: 102.1,
          designValueUnit: 'hw/tw',
          resistance: 124,
          resistanceUnit: 'Class 3 limit',
          utilisation: 0.823,
          clause: 'Table 5.2',
          status: 'PASS',
          notes: 'Class 3 - Elastic',
        },
      ],
    },
    {
      title: 'Bending Resistance',
      checks: [
        {
          category: 'Bending',
          name: 'Major Axis Bending (Cross-section)',
          designValue: 8450,
          designValueUnit: 'kNm',
          resistance: 10332,
          resistanceUnit: 'kNm',
          utilisation: 0.818,
          clause: '6.2.5',
          status: 'PASS',
        },
        {
          category: 'Bending',
          name: 'Lateral Torsional Buckling',
          designValue: 8450,
          designValueUnit: 'kNm',
          resistance: 9264,
          resistanceUnit: 'kNm',
          utilisation: 0.912,
          clause: '6.3.2.2',
          status: 'PASS',
          notes: 'Governing check',
        },
      ],
    },
    {
      title: 'Shear Resistance',
      checks: [
        {
          category: 'Shear',
          name: 'Shear Resistance (Plastic)',
          designValue: 1250,
          designValueUnit: 'kN',
          resistance: 3875,
          resistanceUnit: 'kN',
          utilisation: 0.323,
          clause: '6.2.6',
          status: 'PASS',
        },
        {
          category: 'Shear',
          name: 'Shear Buckling (hw/tw > 72ε)',
          designValue: 1250,
          designValueUnit: 'kN',
          resistance: 2840,
          resistanceUnit: 'kN',
          utilisation: 0.44,
          clause: 'EN 1993-1-5 5.2',
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Interaction Checks',
      checks: [
        {
          category: 'Interaction',
          name: 'Bending + Shear Interaction',
          designValue: 0.682,
          designValueUnit: '',
          resistance: 1.0,
          resistanceUnit: '',
          utilisation: 0.682,
          clause: '6.2.8',
          status: 'PASS',
          notes: 'VEd < 0.5Vpl,Rd, no reduction required',
        },
      ],
    },
    {
      title: 'Serviceability',
      checks: [
        {
          category: 'Deflection',
          name: 'Vertical Deflection',
          designValue: 42.5,
          designValueUnit: 'mm',
          resistance: 62.5,
          resistanceUnit: 'mm (L/400)',
          utilisation: 0.68,
          clause: 'NA.2.23',
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Web Stiffener Checks',
      checks: [
        {
          category: 'Stiffeners',
          name: 'Transverse Stiffener Outstand',
          designValue: 10.0,
          designValueUnit: 'ts/bs',
          resistance: 13.0,
          resistanceUnit: 'Class 3 limit',
          utilisation: 0.769,
          clause: 'EN 1993-1-5 9.2',
          status: 'PASS',
        },
        {
          category: 'Stiffeners',
          name: 'Bearing Stiffener Capacity',
          designValue: 625,
          designValueUnit: 'kN',
          resistance: 1420,
          resistanceUnit: 'kN',
          utilisation: 0.44,
          clause: 'EN 1993-1-5 9.4',
          status: 'PASS',
        },
      ],
    },
  ],

  // =========================================================================
  // DETAILED CALCULATIONS
  // =========================================================================
  detailedCalculations: [
    {
      title: 'Lateral Torsional Buckling Resistance',
      steps: [
        {
          description: 'Elastic critical moment for LTB',
          formula: 'Mcr = C1 × (π²EIz / (kL)²) × √((Iw/Iz) + (kL)²GIT / (π²EIz))',
          result: '(see below)',
          clause: 'NCCI SN003a-EN-EU',
        },
        {
          description: 'Substituting values',
          substitution:
            'Mcr = 1.127 × (π² × 210000 × 4.82×10⁸ / (5000)²) × √((8.42×10¹² / 4.82×10⁸) + ...)',
          result: 15420,
          unit: 'kNm',
        },
        {
          description: 'Non-dimensional slenderness',
          formula: 'λ̄LT = √(Wy × fy / Mcr)',
          substitution: 'λ̄LT = √(3.45×10⁷ × 335 / 15420×10⁶)',
          result: 0.865,
          unit: '',
          clause: '6.3.2.2(1)',
        },
        {
          description: 'LTB reduction factor (curve c)',
          formula: 'χLT = 1 / (ΦLT + √(Φ²LT - λ̄²LT))',
          substitution: 'χLT = 1 / (1.014 + √(1.014² - 0.865²))',
          result: 0.673,
          unit: '',
          clause: '6.3.2.2(1)',
        },
        {
          description: 'Design buckling resistance moment',
          formula: 'Mb,Rd = χLT × Wy × fy / γM1',
          substitution: 'Mb,Rd = 0.673 × 3.45×10⁷ × 335 / 1.0',
          result: 7780,
          unit: 'kNm',
          clause: '6.3.2.1(3)',
        },
        {
          description: 'Modified LTB resistance (f factor)',
          formula: 'Mb,Rd,mod = Mb,Rd / f',
          substitution: 'Mb,Rd,mod = 7780 / 0.84',
          result: 9264,
          unit: 'kNm',
          clause: '6.3.2.3(2)',
        },
      ],
    },
    {
      title: 'Shear Buckling Resistance',
      steps: [
        {
          description: 'Web slenderness for shear',
          formula: 'λ̄w = hw / (37.4 × tw × ε × √kτ)',
          result: 1.08,
          clause: 'EN 1993-1-5 5.3(3)',
        },
        {
          description: 'Shear buckling coefficient',
          formula: 'kτ = 5.34 + 4(hw/a)²  for a/hw ≥ 1',
          substitution: 'kτ = 5.34 + 4(1430/2500)² = 5.34 + 1.31',
          result: 6.65,
          unit: '',
        },
        {
          description: 'Web contribution factor',
          formula: 'χw = η / (0.83 + λ̄w)  for λ̄w > 0.83',
          substitution: 'χw = 1.2 / (0.83 + 1.08)',
          result: 0.628,
          unit: '',
          clause: 'Table 5.1',
        },
        {
          description: 'Shear buckling resistance',
          formula: 'Vbw,Rd = χw × fyw × hw × tw / (√3 × γM1)',
          substitution: 'Vbw,Rd = 0.628 × 335 × 1430 × 14 / (√3 × 1.0)',
          result: 2420,
          unit: 'kN',
          clause: '5.2(1)',
        },
      ],
    },
  ],

  // =========================================================================
  // WARNINGS & NOTES
  // =========================================================================
  warnings: [
    {
      severity: 'warning',
      title: 'High Utilisation - LTB Check',
      message:
        'The lateral torsional buckling check has a utilisation of 91.2%. Consider reducing the unbraced length or increasing the compression flange size for a more robust design.',
      reference: 'BS EN 1993-1-1 Cl. 6.3.2',
    },
    {
      severity: 'info',
      title: 'Class 3 Web',
      message:
        'The web is classified as Class 3 for bending. Elastic section properties have been used for all bending calculations.',
      reference: 'Table 5.2',
    },
    {
      severity: 'info',
      title: 'Fabrication Assumption',
      message:
        'The analysis assumes full-penetration butt welds at flange-to-web connections with weld quality in accordance with BS EN ISO 5817 Quality Level B.',
    },
  ],

  // =========================================================================
  // CONCLUSION
  // =========================================================================
  conclusion: {
    status: 'PASS',
    summary:
      'The proposed steel plate girder design is adequate for the applied loading. All design checks pass in accordance with BS EN 1993-1-1 and BS EN 1993-1-5. The governing check is lateral torsional buckling with a utilisation of 91.2%.',
    governingChecks: [
      'Lateral Torsional Buckling: 91.2% utilisation (clause 6.3.2.2)',
      'Cross-section Bending: 81.8% utilisation (clause 6.2.5)',
      'Serviceability Deflection: 68.0% utilisation (L/588)',
    ],
    suggestions: [
      'Consider reducing the lateral restraint spacing from 5.0m to 4.0m to improve the LTB resistance.',
      'A thicker top flange (35mm instead of 30mm) would reduce LTB utilisation to approximately 82%.',
    ],
    alternatives: [
      'UB 914×419×388 rolled section (less fabrication, similar capacity)',
      'Fabricated section with 500×35 top flange (improved LTB performance)',
    ],
  },

  // =========================================================================
  // APPENDIX
  // =========================================================================
  appendix: [
    {
      title: 'References',
      type: 'text',
      content: `
1. BS EN 1993-1-1:2005+A1:2014 - Eurocode 3: Design of steel structures. General rules and rules for buildings.
2. BS EN 1993-1-5:2006 - Eurocode 3: Design of steel structures. Plated structural elements.
3. BS EN 1993-2:2006 - Eurocode 3: Design of steel structures. Steel bridges.
4. NA to BS EN 1993-1-1:2005+A1:2014 - UK National Annex.
5. PD 6695-2:2008 - Recommendations for the design of bridges to BS EN 1993.
6. SN003a-EN-EU: NCCI Elastic critical moment for lateral torsional buckling.
      `.trim(),
    },
    {
      title: 'Assumptions & Limitations',
      type: 'text',
      content: `
• Simply supported boundary conditions assumed at both ends.
• Lateral restraint provided at L/5 intervals (5.0m spacing).
• Uniform loading assumed along the full span.
• Steel properties based on product standards with t > 16mm.
• No holes or openings considered in this analysis.
• Fatigue assessment not included in this calculation.
• Web bearing and local buckling at supports require separate checks.
      `.trim(),
    },
  ],
};

export default steelPlateGirderExampleData;
