// =============================================================================
// Member Ratings PDF Report Builder
// EN 1993 Steel / EN 1992 Concrete / EN 1995 Timber — Multi-Material Capacity
// =============================================================================

import { ChecklistInput, GridInput, PageInput, ReportData, TableInput } from '../ReportDocument';

interface LoadCase {
  id: string;
  name: string;
  moment: string;
  shear: string;
  axial: string;
  limit: string;
}

interface MemberRatingsFormData {
  materialType: string;
  grade: string;
  memberType: string;
  length: string;
  width: string;
  depth: string;
  thickness: string;
  diameter: string;
  sectionName: string;
  mainBars: string;
  links: string;
  serviceClass: string;
  loadCases: LoadCase[];
  projectName: string;
  reference: string;
}

interface CaseResult {
  name: string;
  bendingUtil: number;
  shearUtil: number;
  axialUtil: number;
  deflectionUtil: number;
  combinedUtil: number;
  maxUtil: number;
  status: string;
}

interface MemberRatingsResults {
  sectionProperties: {
    area: number;
    Ixx: number;
    Wel: number;
    Wpl: number;
  };
  capacities: {
    Mc_Rd: number;
    Vc_Rd: number;
    Nc_Rd: number;
  };
  caseResults: CaseResult[];
  overallUtilisation: number;
  overallStatus: string;
  rating: string;
  ratingColor: string;
  recommendations: string[];
}

interface ProjectInfo {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

// Design code reference
const DESIGN_CODES: Record<string, string> = {
  steel: 'EN 1993-1-1: Steel Structures',
  concrete: 'EN 1992-1-1: Concrete Structures',
  timber: 'EN 1995-1-1: Timber Structures',
};

export function buildMemberRatingsReport(
  form: MemberRatingsFormData,
  results: MemberRatingsResults,
  warnings: string[],
  projectInfo: ProjectInfo,
): ReportData {
  const designCode = DESIGN_CODES[form.materialType] || 'Eurocode';

  const pages: PageInput[] = [
    // ===========================================
    // PAGE 1: COVER & SUMMARY
    // ===========================================
    {
      headerTitle: 'Member Capacity Report',
      headerSubtitle: designCode,
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: 'Design Summary',
          content: {
            type: 'grid',
            columns: 2,
            items: [
              { label: 'Project', value: form.projectName || 'Member Analysis' },
              { label: 'Reference', value: form.reference },
              { label: 'Material', value: form.materialType.toUpperCase() },
              { label: 'Grade', value: form.grade },
              { label: 'Design Code', value: designCode },
              { label: 'Overall Status', value: results.overallStatus, isStatus: true },
              { label: 'Design Rating', value: results.rating },
              { label: 'Max Utilisation', value: `${results.overallUtilisation.toFixed(1)}%` },
            ],
          } as GridInput,
        },
        {
          title: 'Section Properties',
          content: {
            type: 'table',
            headers: ['Property', 'Value', 'Unit'],
            rows: [
              ...(form.materialType === 'steel'
                ? [['Section', form.sectionName, '-']]
                : [['Dimensions', `${form.width} × ${form.depth}`, 'mm']]),
              ['Cross-sectional Area', results.sectionProperties.area.toFixed(0), 'mm²'],
              ['Second Moment (Ixx)', results.sectionProperties.Ixx.toFixed(0), 'mm⁴'],
              ['Elastic Modulus (Wel)', results.sectionProperties.Wel.toFixed(0), 'mm³'],
              ['Plastic Modulus (Wpl)', results.sectionProperties.Wpl.toFixed(0), 'mm³'],
              ['Span Length', form.length, 'm'],
            ],
          } as TableInput,
        },
        {
          title: 'Section Capacities',
          content: {
            type: 'grid',
            columns: 3,
            items: [
              {
                label: 'Moment Capacity (Mc,Rd)',
                value: `${results.capacities.Mc_Rd.toFixed(1)} kNm`,
              },
              {
                label: 'Shear Capacity (Vc,Rd)',
                value: `${results.capacities.Vc_Rd.toFixed(1)} kN`,
              },
              {
                label: 'Axial Capacity (Nc,Rd)',
                value: `${results.capacities.Nc_Rd.toFixed(1)} kN`,
              },
            ],
          } as GridInput,
        },
      ],
    },

    // ===========================================
    // PAGE 2: LOAD CASE ANALYSIS
    // ===========================================
    {
      headerTitle: 'Load Case Analysis',
      headerSubtitle: 'Utilisation Results',
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: 'Applied Loading',
          content: {
            type: 'table',
            headers: ['Load Case', 'Moment (kNm)', 'Shear (kN)', 'Axial (kN)', 'Def. Limit (mm)'],
            rows: form.loadCases.map((lc) => [lc.name, lc.moment, lc.shear, lc.axial, lc.limit]),
          } as TableInput,
        },
        {
          title: 'Utilisation Results',
          content: {
            type: 'table',
            headers: ['Load Case', 'Bending', 'Shear', 'Axial', 'Deflection', 'Combined', 'Status'],
            rows: results.caseResults.map((cr) => [
              cr.name,
              `${cr.bendingUtil.toFixed(1)}%`,
              `${cr.shearUtil.toFixed(1)}%`,
              `${cr.axialUtil.toFixed(1)}%`,
              `${cr.deflectionUtil.toFixed(1)}%`,
              `${cr.combinedUtil.toFixed(1)}%`,
              cr.status,
            ]),
          } as TableInput,
        },
        {
          title: 'Critical Load Case',
          content: {
            type: 'grid',
            columns: 2,
            items: [
              {
                label: 'Governing Case',
                value: results.caseResults.reduce(
                  (max, cr) => (cr.maxUtil > max.maxUtil ? cr : max),
                  results.caseResults[0],
                ).name,
              },
              { label: 'Maximum Utilisation', value: `${results.overallUtilisation.toFixed(1)}%` },
              {
                label: 'Governing Check',
                value: (() => {
                  const maxCase = results.caseResults.reduce(
                    (max, cr) => (cr.maxUtil > max.maxUtil ? cr : max),
                    results.caseResults[0],
                  );
                  if (maxCase.bendingUtil >= maxCase.maxUtil) return 'Bending';
                  if (maxCase.shearUtil >= maxCase.maxUtil) return 'Shear';
                  if (maxCase.axialUtil >= maxCase.maxUtil) return 'Axial';
                  if (maxCase.deflectionUtil >= maxCase.maxUtil) return 'Deflection';
                  return 'Combined';
                })(),
              },
              { label: 'Result', value: results.overallStatus, isStatus: true },
            ],
          } as GridInput,
        },
      ],
    },

    // ===========================================
    // PAGE 3: DESIGN VERIFICATION
    // ===========================================
    {
      headerTitle: 'Design Verification',
      headerSubtitle: 'Capacity Checks',
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: 'Design Checks Summary',
          content: {
            type: 'checklist',
            items: [
              {
                label: `Bending: M_Ed ≤ M_c,Rd (${results.capacities.Mc_Rd.toFixed(1)} kNm)`,
                checked: results.caseResults.every((cr) => cr.bendingUtil <= 100),
              },
              {
                label: `Shear: V_Ed ≤ V_c,Rd (${results.capacities.Vc_Rd.toFixed(1)} kN)`,
                checked: results.caseResults.every((cr) => cr.shearUtil <= 100),
              },
              {
                label: `Axial: N_Ed ≤ N_c,Rd (${results.capacities.Nc_Rd.toFixed(1)} kN)`,
                checked: results.caseResults.every((cr) => cr.axialUtil <= 100),
              },
              {
                label: 'Deflection within serviceability limits',
                checked: results.caseResults.every((cr) => cr.deflectionUtil <= 100),
              },
              {
                label: 'Combined interaction check (M + N) ≤ 1.0',
                checked: results.caseResults.every((cr) => cr.combinedUtil <= 100),
              },
              { label: 'Overall design verification', checked: results.overallStatus === 'PASS' },
            ],
          } as ChecklistInput,
        },
        ...(form.materialType === 'steel'
          ? [
              {
                title: 'Steel Design Notes (EN 1993-1-1)',
                content: {
                  type: 'grid' as const,
                  columns: 1,
                  items: [
                    {
                      label: 'Cross-section Classification',
                      value: 'Class 1/2 assumed (plastic capacity)',
                    },
                    { label: 'Partial Factor γM0', value: '1.0 for cross-section resistance' },
                    { label: 'Shear Area', value: 'Approximated as 0.6 × Area for I/H sections' },
                    { label: 'Combined Check', value: 'Clause 6.2.9 - linear interaction' },
                  ],
                } as GridInput,
              },
            ]
          : []),
        ...(form.materialType === 'concrete'
          ? [
              {
                title: 'Concrete Design Notes (EN 1992-1-1)',
                content: {
                  type: 'grid' as const,
                  columns: 1,
                  items: [
                    { label: 'Design Concrete Strength', value: 'fcd = αcc × fck / γc' },
                    { label: 'Reinforcement Yield', value: 'fyd = fyk / γs = 500/1.15 = 435 MPa' },
                    { label: 'Lever Arm', value: 'z = 0.9d approximation' },
                    { label: 'Shear Resistance', value: 'VRd,c without shear reinforcement' },
                  ],
                } as GridInput,
              },
            ]
          : []),
        ...(form.materialType === 'timber'
          ? [
              {
                title: 'Timber Design Notes (EN 1995-1-1)',
                content: {
                  type: 'grid' as const,
                  columns: 1,
                  items: [
                    { label: 'Service Class', value: `SC${form.serviceClass}` },
                    { label: 'Modification Factor', value: 'kmod applied for duration of load' },
                    { label: 'Material Factor', value: 'γM = 1.3 for solid timber' },
                    { label: 'Design Strength', value: 'fd = kmod × fk / γM' },
                  ],
                } as GridInput,
              },
            ]
          : []),
      ],
    },

    // ===========================================
    // PAGE 4: RECOMMENDATIONS & NOTES
    // ===========================================
    {
      headerTitle: 'Recommendations',
      headerSubtitle: 'Design Notes',
      headerCode: `Ref: ${form.reference}`,
      sections: [
        ...(results.recommendations.length > 0
          ? [
              {
                title: 'Design Recommendations',
                content: {
                  type: 'grid' as const,
                  columns: 1,
                  items: results.recommendations.map((r, i) => ({
                    label: `Recommendation ${i + 1}`,
                    value: r,
                  })),
                } as GridInput,
              },
            ]
          : []),
        ...(warnings.length > 0
          ? [
              {
                title: 'Warnings',
                content: {
                  type: 'grid' as const,
                  columns: 1,
                  items: warnings.map((w) => ({ label: '⚠️ Warning', value: w })),
                } as GridInput,
              },
            ]
          : []),
        {
          title: 'Design Assumptions',
          content: {
            type: 'grid',
            columns: 1,
            items: [
              { label: 'Analysis Type', value: 'Elastic cross-section analysis' },
              {
                label: 'Buckling',
                value: 'Not considered in this check - separate verification required',
              },
              { label: 'Connections', value: 'Adequate connections assumed at supports' },
              { label: 'Fire', value: 'Not considered - separate fire design if required' },
              { label: 'Fatigue', value: 'Not considered - verify if cyclic loading expected' },
            ],
          } as GridInput,
        },
        {
          title: 'Further Checks Required',
          content: {
            type: 'checklist',
            items: [
              { label: 'Lateral-torsional buckling (if applicable)', checked: false },
              { label: 'Web bearing and buckling at supports', checked: false },
              { label: 'Connection design', checked: false },
              { label: 'Serviceability (vibration, dynamic response)', checked: false },
              { label: 'Fire resistance requirements', checked: false },
            ],
          } as ChecklistInput,
        },
      ],
    },
  ];

  return {
    metadata: {
      title: 'Member Capacity Report',
      author: projectInfo.preparedBy || 'BeaverCalc Studio',
      creator: 'BeaverCalc Premium',
      subject: `Member Ratings - ${form.reference}`,
      project: form.projectName || 'Structural Analysis',
      pageSize: 'A4',
      pageOrientation: 'portrait' as const,
    },
    pages,
  };
}
