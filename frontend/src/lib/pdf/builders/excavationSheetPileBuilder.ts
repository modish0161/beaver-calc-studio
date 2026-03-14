// =============================================================================
// Excavation & Sheet Pile PDF Report Builder
// EN 1997-1 & BS 8002 Embedded Retaining Wall Design
// =============================================================================

import {
  ChecklistInput,
  GridInput,
  PageInput,
  ReportData,
  TableInput,
} from "../ReportDocument";

interface SheetPileFormData {
  excavationDepth: string;
  embedmentDepth: string;
  wallType: string;
  soilType: string;
  phi: string;
  gamma: string;
  cohesion: string;
  deltaRatio: string;
  surcharge: string;
  waterDepth: string;
  pileSection: string;
  steelGrade: string;
  safetyFactorPassive: string;
  designApproach: string;
  projectName: string;
  reference: string;
}

interface SheetPileResults {
  Ka: number;
  Kp: number;
  activeForce: number;
  passiveForce: number;
  surchargeForce: number;
  waterForce: number;
  momentDemand: number;
  momentResisting: number;
  embedmentRatio: number;
  embedmentStatus: string;
  requiredModulus: number;
  providedModulus: number;
  sectionUtilisation: number;
  sectionStatus: string;
  toeCapacity: number;
  toeDemand: number;
  toeUtilisation: number;
  toeStatus: string;
  overallStatus: string;
  rating: string;
  ratingColor: string;
}

interface ProjectInfo {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
}

// Wall type descriptions
const WALL_TYPE_NAMES: Record<string, string> = {
  sheet_pile: "Steel Sheet Pile",
  soldier_pile: "Soldier Piles & Lagging",
  secant: "Secant Pile Wall",
  contiguous: "Contiguous Pile Wall",
  diaphragm: "Diaphragm Wall",
};

// Soil type names
const SOIL_TYPE_NAMES: Record<string, string> = {
  loose_sand: "Loose Sand",
  medium_sand: "Medium Dense Sand",
  dense_sand: "Dense Sand",
  gravel: "Sandy Gravel",
  soft_clay: "Soft Clay (Undrained)",
  firm_clay: "Firm Clay (Undrained)",
  stiff_clay: "Stiff Clay (Drained)",
};

// Pile section data
const PILE_SECTIONS: Record<
  string,
  { name: string; Z: number; I: number; weight: number }
> = {
  Larssen_6W: { name: "Larssen 6W", Z: 1730, I: 31000, weight: 102 },
  Larssen_12: { name: "Larssen 12", Z: 2100, I: 42000, weight: 115 },
  AZ_18: { name: "AZ 18", Z: 1800, I: 30900, weight: 95 },
  AZ_26: { name: "AZ 26", Z: 2600, I: 47200, weight: 117 },
  AZ_36: { name: "AZ 36", Z: 3600, I: 72000, weight: 145 },
  AZ_50: { name: "AZ 50", Z: 5000, I: 115000, weight: 185 },
  HZ_880A: { name: "HZ 880-A", Z: 5600, I: 140000, weight: 208 },
  AU_14: { name: "AU 14", Z: 1400, I: 21000, weight: 74 },
  AU_20: { name: "AU 20", Z: 2000, I: 36000, weight: 100 },
  AU_25: { name: "AU 25", Z: 2500, I: 50000, weight: 127 },
};

// Steel grade data
const STEEL_GRADES: Record<string, { fy: number; description: string }> = {
  S240GP: { fy: 240, description: "General Purpose" },
  S270GP: { fy: 270, description: "Standard" },
  S320GP: { fy: 320, description: "Higher Strength" },
  S355GP: { fy: 355, description: "High Strength" },
  S390GP: { fy: 390, description: "Extra High Strength" },
  S430GP: { fy: 430, description: "Maximum Strength" },
};

// Design approach data
const DESIGN_APPROACHES: Record<string, string> = {
  DA1_C1: "EN 1997-1 DA1 Combination 1",
  DA1_C2: "EN 1997-1 DA1 Combination 2",
  DA2: "EN 1997-1 DA2",
  BS8002: "BS 8002 Factor of Safety",
};

export function buildExcavationSheetPileReport(
  form: SheetPileFormData,
  results: SheetPileResults,
  warnings: string[] = [],
  projectInfo: ProjectInfo = {},
): ReportData {
  const H = parseFloat(form.excavationDepth);
  const D = parseFloat(form.embedmentDepth);
  const section = PILE_SECTIONS[form.pileSection] || {
    name: form.pileSection,
    Z: 0,
    I: 0,
    weight: 0,
  };
  const steel = STEEL_GRADES[form.steelGrade] || { fy: 355, description: "" };

  const pages: PageInput[] = [
    // ===========================================
    // PAGE 1: COVER & EXECUTIVE SUMMARY
    // ===========================================
    {
      headerTitle: "Sheet Pile Wall Design",
      headerSubtitle: "EN 1997-1 & BS 8002",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Design Summary",
          content: {
            type: "grid",
            columns: 2,
            items: [
              {
                label: "Project",
                value: form.projectName || "Sheet Pile Design",
              },
              { label: "Reference", value: form.reference },
              {
                label: "Design Code",
                value:
                  DESIGN_APPROACHES[form.designApproach] || form.designApproach,
              },
              {
                label: "Wall Type",
                value: WALL_TYPE_NAMES[form.wallType] || form.wallType,
              },
              {
                label: "Overall Status",
                value: results.overallStatus,
                isStatus: true,
              },
              { label: "Design Rating", value: results.rating },
            ],
          } as GridInput,
        },
        {
          title: "Excavation Geometry",
          content: {
            type: "table",
            headers: ["Parameter", "Value", "Unit", "Description"],
            rows: [
              [
                "Excavation Depth (H)",
                H.toFixed(2),
                "m",
                "Depth below ground level",
              ],
              [
                "Embedment Depth (D)",
                D.toFixed(2),
                "m",
                "Wall penetration below excavation",
              ],
              [
                "Total Wall Length",
                (H + D).toFixed(2),
                "m",
                "Full wall height",
              ],
              [
                "D/H Ratio",
                (D / H).toFixed(2),
                "-",
                "Embedment ratio (recommend ≥ 0.8)",
              ],
            ],
          } as TableInput,
        },
        {
          title: "Soil Parameters",
          content: {
            type: "table",
            headers: ["Property", "Value", "Unit"],
            rows: [
              [
                "Soil Type",
                SOIL_TYPE_NAMES[form.soilType] || form.soilType,
                "-",
              ],
              ["Friction Angle (φ)", form.phi, "°"],
              ["Unit Weight (γ)", form.gamma, "kN/m³"],
              ["Cohesion (c)", form.cohesion, "kPa"],
              ["Wall Friction Ratio (δ/φ)", form.deltaRatio, "-"],
            ],
          } as TableInput,
        },
      ],
    },

    // ===========================================
    // PAGE 2: SECTION & LOADING
    // ===========================================
    {
      headerTitle: "Section Selection & Loading",
      headerSubtitle: "Structural Parameters",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Sheet Pile Section",
          content: {
            type: "table",
            headers: ["Property", "Value", "Unit"],
            rows: [
              ["Section Type", section.name, "-"],
              ["Elastic Section Modulus (Z)", section.Z.toFixed(0), "cm³/m"],
              ["Second Moment of Area (I)", section.I.toFixed(0), "cm⁴/m"],
              ["Weight", section.weight.toFixed(1), "kg/m²"],
              ["Steel Grade", form.steelGrade, "-"],
              ["Yield Strength (fy)", steel.fy.toFixed(0), "MPa"],
            ],
          } as TableInput,
        },
        {
          title: "Applied Loading",
          content: {
            type: "table",
            headers: ["Load Type", "Value", "Unit", "Notes"],
            rows: [
              [
                "Surcharge (q)",
                form.surcharge,
                "kPa",
                "Applied at ground surface",
              ],
              ["Water Table Depth", form.waterDepth, "m", "Below ground level"],
              [
                "Water Pressure Force",
                results.waterForce.toFixed(1),
                "kN/m",
                "Hydrostatic if above toe",
              ],
            ],
          } as TableInput,
        },
        {
          title: "Design Factors",
          content: {
            type: "table",
            headers: ["Factor", "Value", "Application"],
            rows: [
              [
                "Passive Resistance FOS",
                form.safetyFactorPassive,
                "Applied to Kp forces",
              ],
              [
                "Design Approach",
                DESIGN_APPROACHES[form.designApproach] || form.designApproach,
                "EN 1997-1 / BS 8002",
              ],
            ],
          } as TableInput,
        },
      ],
    },

    // ===========================================
    // PAGE 3: EARTH PRESSURE ANALYSIS
    // ===========================================
    {
      headerTitle: "Earth Pressure Analysis",
      headerSubtitle: "Rankine Theory",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Earth Pressure Coefficients",
          content: {
            type: "table",
            headers: ["Coefficient", "Formula", "Value", "Notes"],
            rows: [
              [
                "Active (Ka)",
                "tan²(45° - φ/2)",
                results.Ka.toFixed(4),
                "Rankine active coefficient",
              ],
              [
                "Passive (Kp)",
                "tan²(45° + φ/2)",
                results.Kp.toFixed(4),
                "Rankine passive coefficient",
              ],
              [
                "Kp / Ka Ratio",
                "-",
                (results.Kp / results.Ka).toFixed(2),
                "Strength ratio",
              ],
            ],
          } as TableInput,
        },
        {
          title: "Force Analysis",
          content: {
            type: "table",
            headers: [
              "Force Component",
              "Value (kN/m)",
              "Location",
              "Direction",
            ],
            rows: [
              [
                "Active Soil Force (Pa)",
                results.activeForce.toFixed(2),
                "H/3 from base",
                "Towards excavation",
              ],
              [
                "Surcharge Force",
                results.surchargeForce.toFixed(2),
                "H/2 from base",
                "Towards excavation",
              ],
              [
                "Passive Soil Force (Pp)",
                results.passiveForce.toFixed(2),
                "D/3 from toe",
                "Resisting active",
              ],
              [
                "Water Force (Pw)",
                results.waterForce.toFixed(2),
                "Variable",
                "Net unbalanced",
              ],
            ],
          } as TableInput,
        },
        {
          title: "Moment Equilibrium",
          content: {
            type: "grid",
            columns: 2,
            items: [
              {
                label: "Overturning Moment (Ma)",
                value: `${results.momentDemand.toFixed(1)} kNm/m`,
              },
              {
                label: "Resisting Moment (Mp)",
                value: `${results.momentResisting.toFixed(1)} kNm/m`,
              },
              {
                label: "Stability Ratio (Mp/Ma)",
                value: results.embedmentRatio.toFixed(3),
              },
              {
                label: "Embedment Check",
                value: results.embedmentStatus,
                isStatus: true,
              },
            ],
          } as GridInput,
        },
      ],
    },

    // ===========================================
    // PAGE 4: STRUCTURAL VERIFICATION
    // ===========================================
    {
      headerTitle: "Structural Verification",
      headerSubtitle: "Section Capacity Checks",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Section Capacity Check",
          content: {
            type: "table",
            headers: ["Check", "Demand", "Capacity", "Utilisation", "Status"],
            rows: [
              [
                "Bending Capacity",
                `Z,req = ${results.requiredModulus.toFixed(0)} cm³/m`,
                `Z,prov = ${results.providedModulus.toFixed(0)} cm³/m`,
                `${(results.sectionUtilisation * 100).toFixed(1)}%`,
                results.sectionStatus,
              ],
            ],
          } as TableInput,
        },
        {
          title: "Toe Stability Check",
          content: {
            type: "table",
            headers: ["Parameter", "Value", "Unit"],
            rows: [
              ["Horizontal Demand", results.toeDemand.toFixed(2), "kN/m"],
              ["Toe Capacity", results.toeCapacity.toFixed(2), "kN/m"],
              [
                "Toe Utilisation",
                `${(results.toeUtilisation * 100).toFixed(1)}%`,
                "-",
              ],
              ["Toe Status", results.toeStatus, "-"],
            ],
          } as TableInput,
        },
        {
          title: "Design Verification Summary",
          content: {
            type: "checklist",
            items: [
              {
                label: "Embedment depth adequate for moment equilibrium",
                checked: results.embedmentStatus === "PASS",
              },
              {
                label: "Section modulus sufficient for bending",
                checked: results.sectionStatus === "PASS",
              },
              {
                label: "Toe penetration adequate for stability",
                checked: results.toeStatus === "PASS",
              },
              {
                label: "D/H ratio meets minimum recommendations",
                checked: D / H >= 0.8,
              },
              {
                label: "Overall design status",
                checked: results.overallStatus === "PASS",
              },
            ],
          } as ChecklistInput,
        },
        ...(warnings.length > 0
          ? [
              {
                title: "Design Warnings",
                content: {
                  type: "grid" as const,
                  columns: 1,
                  items: warnings.map((w) => ({
                    label: "⚠️ Warning",
                    value: w,
                  })),
                } as GridInput,
              },
            ]
          : []),
      ],
    },

    // ===========================================
    // PAGE 5: DESIGN RECOMMENDATIONS
    // ===========================================
    {
      headerTitle: "Design Recommendations",
      headerSubtitle: "Construction Notes",
      headerCode: `Ref: ${form.reference}`,
      sections: [
        {
          title: "Construction Sequence",
          content: {
            type: "grid",
            columns: 1,
            items: [
              {
                label: "Step 1",
                value: "Install guide frame and set out pile positions",
              },
              {
                label: "Step 2",
                value: `Drive sheet piles to ${(H + D).toFixed(1)}m total length`,
              },
              {
                label: "Step 3",
                value:
                  "Install any required waling or bracing before excavation",
              },
              {
                label: "Step 4",
                value: `Excavate in lifts not exceeding ${(H / 3).toFixed(1)}m`,
              },
              {
                label: "Step 5",
                value: "Monitor wall deflection throughout excavation",
              },
            ],
          } as GridInput,
        },
        {
          title: "Installation Notes",
          content: {
            type: "grid",
            columns: 1,
            items: [
              {
                label: "Section",
                value: `${section.name} sheet piles at ${section.weight} kg/m²`,
              },
              {
                label: "Steel Grade",
                value: `${form.steelGrade} with fy = ${steel.fy} MPa`,
              },
              {
                label: "Driving Method",
                value: "Vibratory hammer preferred, impact if required",
              },
              {
                label: "Interlock",
                value: "Ensure continuous interlock engagement",
              },
              {
                label: "Corrosion",
                value: "Consider protection for permanent works",
              },
            ],
          } as GridInput,
        },
        {
          title: "Monitoring Requirements",
          content: {
            type: "checklist",
            items: [
              {
                label: "Survey wall head position during excavation",
                checked: true,
              },
              {
                label: "Monitor adjacent structures for settlement",
                checked: true,
              },
              { label: "Record water levels in standpipes", checked: true },
              {
                label: "Visual inspection of interlocks for leakage",
                checked: true,
              },
              { label: "Inclinometer readings if specified", checked: false },
            ],
          } as ChecklistInput,
        },
        {
          title: "Design Assumptions",
          content: {
            type: "grid",
            columns: 1,
            items: [
              {
                label: "Analysis Method",
                value: "Cantilever wall - Rankine earth pressure theory",
              },
              {
                label: "Wall Friction",
                value: "Conservative assumption for cantilever design",
              },
              { label: "Groundwater", value: "Hydrostatic conditions assumed" },
              {
                label: "Surcharge",
                value: "Uniform surcharge applied at ground surface",
              },
              {
                label: "Soil Profile",
                value: "Homogeneous soil assumed for full depth",
              },
            ],
          } as GridInput,
        },
      ],
    },
  ];

  return {
    metadata: {
      title: "Sheet Pile Wall Design Report",
      author: projectInfo.preparedBy || "BeaverCalc Studio",
      creator: "BeaverCalc Premium",
      subject: `Sheet Pile Design - ${form.reference}`,
      project: form.projectName || "Excavation Support Design",
      pageSize: "A4",
      pageOrientation: "portrait" as const,
    },
    pages,
  };
}
