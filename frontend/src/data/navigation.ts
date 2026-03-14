/**
 * BeaverCalc Studio - Navigation Structure
 * Comprehensive mega-nav with all calculator categories
 */

export interface NavItem {
  label: string;
  path: string;
  description?: string;
  badge?: "beta" | "new" | "verified";
}

export interface NavCategory {
  label: string;
  icon: string;
  items: NavItem[];
}

export interface NavSection {
  title: string;
  path: string;
  icon: string;
  description: string;
  categories: NavCategory[];
}

export const navigationStructure: NavSection[] = [
  {
    title: "Projects",
    path: "/projects",
    icon: "📁",
    description: "Project management and files",
    categories: [
      {
        label: "Project Management",
        icon: "📊",
        items: [
          {
            label: "Dashboard",
            path: "/projects",
            description: "Recent runs, drafts, approvals",
          },
          {
            label: "Files",
            path: "/projects/files",
            description: "DWG/DXF/IFC/PDF management",
          },
          {
            label: "Issue Register",
            path: "/projects/issues",
            description: "Reports with sign-off",
          },
          {
            label: "Templates",
            path: "/projects/templates",
            description: "Saved inputs/assumptions",
          },
        ],
      },
      {
        label: "Libraries",
        icon: "📚",
        items: [
          {
            label: "Materials & Sections",
            path: "/projects/libraries",
            description: "Project-scoped libraries",
          },
          {
            label: "Load Sets",
            path: "/projects/loadsets",
            description: "Reusable load combinations",
          },
        ],
      },
    ],
  },
  {
    title: "Bridges",
    path: "/bridges",
    icon: "🌉",
    description: "Bridge design and analysis",
    categories: [
      {
        label: "Superstructure",
        icon: "🏗️",
        items: [
          {
            label: "Steel Plate Girders",
            path: "/calculator/steel_plate_girder",
            badge: "verified",
          },
          {
            label: "Composite Beams",
            path: "/calculator/composite_beam",
            badge: "beta",
          },
          { label: "Deck Slabs", path: "/calculator/deck_slab" },
          {
            label: "Transverse Members",
            path: "/calculator/transverse_members",
          },
          { label: "Bracing Systems", path: "/calculator/bracing" },
        ],
      },
      {
        label: "Substructure & Foundations",
        icon: "🏛️",
        items: [
          { label: "Abutments", path: "/calculator/abutments" },
          { label: "Pier Design", path: "/calculator/pier_design" },
          {
            label: "Spread Footings",
            path: "/calculator/spread_footings",
            badge: "verified",
          },
          {
            label: "Pile Foundations",
            path: "/calculator/pile_foundations",
            badge: "beta",
          },
        ],
      },
      {
        label: "Bearings & Joints",
        icon: "⚙️",
        items: [
          {
            label: "Bearing Reactions",
            path: "/calculator/bearing_reactions",
            badge: "verified",
          },
          {
            label: "Elastomeric Bearings",
            path: "/calculator/elastomeric_bearings",
            badge: "beta",
          },
          { label: "Movement Joints", path: "/calculator/movement_joints" },
        ],
      },
      {
        label: "Loading & Analysis",
        icon: "📐",
        items: [
          {
            label: "Traffic Actions (LM1/LM2)",
            path: "/calculator/traffic_actions",
            badge: "new",
          },
          { label: "Wind Actions", path: "/calculator/wind_actions" },
          { label: "Thermal Actions", path: "/calculator/thermal_actions" },
          {
            label: "Combination Builder",
            path: "/calculator/combination_builder",
            badge: "verified",
          },
          {
            label: "Grillage Analysis",
            path: "/calculator/grillage",
            badge: "beta",
          },
        ],
      },
      {
        label: "Assessment & Rating",
        icon: "✅",
        items: [
          { label: "Member Ratings", path: "/calculator/member_ratings" },
          { label: "Sensitivity Analysis", path: "/calculator/sensitivity" },
          { label: "Change Log Comparison", path: "/calculator/change_log" },
        ],
      },
    ],
  },
  {
    title: "Temporary Works",
    path: "/temporary-works",
    icon: "🏗️",
    description: "BS 5975 compliant temporary works design",
    categories: [
      {
        label: "Working Platforms & Crane Pads",
        icon: "🏗️",
        items: [
          {
            label: "Crane Pad Design",
            path: "/calculator/crane_pad_design",
            badge: "verified",
          },
          {
            label: "Working Platform",
            path: "/calculator/working_platform",
            badge: "verified",
          },
          { label: "Trackmats", path: "/calculator/trackmats", badge: "new" },
          { label: "Bog Mats", path: "/calculator/bog_mats", badge: "new" },
          { label: "Load Spread Calculator", path: "/calculator/load_spread" },
        ],
      },
      {
        label: "Propping & Shoring",
        icon: "🔩",
        items: [
          {
            label: "Vertical Props",
            path: "/calculator/vertical_props",
            badge: "beta",
          },
          {
            label: "Raking Props",
            path: "/calculator/raking_props",
            badge: "beta",
          },
          {
            label: "Needle Beam Design",
            path: "/calculator/needling",
            badge: "new",
          },
          {
            label: "Excavation Support",
            path: "/calculator/trench_support",
            badge: "new",
          },
          {
            label: "Sheet Pile Design",
            path: "/calculator/excavation_sheeting",
            badge: "new",
          },
        ],
      },
      {
        label: "Falsework & Formwork",
        icon: "📏",
        items: [
          {
            label: "Falsework Posts/Ledgers",
            path: "/calculator/falsework",
            badge: "beta",
          },
          { label: "Formwork Pressure", path: "/calculator/formwork_pressure" },
          { label: "Deck Soffit Shores", path: "/calculator/soffit_shores" },
        ],
      },
      {
        label: "Edge Protection & Fencing",
        icon: "🚧",
        items: [
          {
            label: "Timber Hoarding Design",
            path: "/calculator/hoarding",
            badge: "new",
          },
          {
            label: "Heras Fence + Ballast",
            path: "/calculator/heras_fence",
            badge: "new",
          },
          { label: "Temporary Parapet", path: "/calculator/temp_parapet" },
          { label: "Guardrail Checks", path: "/calculator/guardrail" },
        ],
      },
      {
        label: "Access & Haul Roads",
        icon: "🛤️",
        items: [
          {
            label: "Access Ramps",
            path: "/calculator/access_ramps",
            badge: "beta",
          },
          { label: "Haul Road Build-up", path: "/calculator/haul_road" },
          { label: "Turning Platforms", path: "/calculator/turning_platform" },
        ],
      },
      {
        label: "Lifting & Rigging",
        icon: "⛓️",
        items: [
          {
            label: "Load Sheet Generator",
            path: "/calculator/load_sheet",
            badge: "verified",
          },
          { label: "Sling Checks", path: "/calculator/sling_checks" },
          { label: "Spreader Beam", path: "/calculator/spreader_beam" },
        ],
      },
    ],
  },
  {
    title: "Geotechnics",
    path: "/geotechnics",
    icon: "🌍",
    description: "Geotechnical design per EN 1997",
    categories: [
      {
        label: "Foundations",
        icon: "🏗️",
        items: [
          {
            label: "Pad Footing",
            path: "/calculator/pad_footing_bearing",
            badge: "verified",
          },
          { label: "Strip Footing", path: "/calculator/strip_footing" },
          {
            label: "Pile Capacity",
            path: "/calculator/pile_capacity",
            badge: "beta",
          },
          {
            label: "Negative Skin Friction",
            path: "/calculator/negative_skin",
          },
        ],
      },
      {
        label: "Earthworks & Slopes",
        icon: "⛰️",
        items: [
          { label: "Slope Stability", path: "/calculator/slope_stability" },
          { label: "Cut & Fill Volumes", path: "/calculator/cut_fill" },
        ],
      },
      {
        label: "Retaining Structures",
        icon: "🧱",
        items: [
          {
            label: "Legato Wall",
            path: "/calculator/legato_wall",
            badge: "beta",
          },
          { label: "Gravity Wall", path: "/calculator/gravity_wall" },
          { label: "GRS Wall", path: "/calculator/grs_wall" },
        ],
      },
      {
        label: "Ground Improvement",
        icon: "🔧",
        items: [
          { label: "Ground Mats", path: "/calculator/ground_mats" },
          { label: "Geogrid Design", path: "/calculator/geogrid" },
        ],
      },
    ],
  },
  {
    title: "Structures",
    path: "/structures",
    icon: "🏛️",
    description: "Structural member and connection design",
    categories: [
      {
        label: "Steel Members",
        icon: "🔩",
        items: [
          {
            label: "I/H-Beam Bending",
            path: "/calculator/steel_beam_bending",
            badge: "verified",
          },
          { label: "Plate Girder Checks", path: "/calculator/plate_girder" },
          {
            label: "LTB Quick Check",
            path: "/calculator/ltb_check",
            badge: "verified",
          },
          { label: "Combined Loading", path: "/calculator/combined_loading" },
        ],
      },
      {
        label: "Steel Connections",
        icon: "🔗",
        items: [
          {
            label: "Bolted Connections",
            path: "/calculator/bolted_connection",
            badge: "verified",
          },
          {
            label: "Weld Sizing",
            path: "/calculator/weld_sizing",
            badge: "verified",
          },
          { label: "End Plates", path: "/calculator/end_plate" },
          { label: "Base Plates", path: "/calculator/base_plate" },
        ],
      },
      {
        label: "Concrete",
        icon: "🧱",
        items: [
          {
            label: "RC Slab Design",
            path: "/calculator/rc_slab_bending",
            badge: "verified",
          },
          { label: "RC Beam Design", path: "/calculator/rc_beam" },
          {
            label: "Punching Shear",
            path: "/calculator/punching_shear",
            badge: "beta",
          },
          { label: "Crack Width Check", path: "/calculator/crack_width" },
        ],
      },
      {
        label: "Timber",
        icon: "🌲",
        items: [
          {
            label: "C24/C16 Member Checks",
            path: "/calculator/timber_member",
            badge: "beta",
          },
          {
            label: "Timber Connections",
            path: "/calculator/timber_connection",
          },
        ],
      },
      {
        label: "Composite",
        icon: "🔄",
        items: [
          {
            label: "Composite Quick Check",
            path: "/calculator/composite_quick",
          },
          { label: "Shear Stud Design", path: "/calculator/shear_studs" },
        ],
      },
    ],
  },
  {
    title: "Construction Logistics",
    path: "/construction-logistics",
    icon: "🚛",
    description: "Site operations and logistics",
    categories: [
      {
        label: "Movement & Access",
        icon: "🛣️",
        items: [
          { label: "Swept Path Templates", path: "/calculator/swept_path" },
          { label: "Working Area Layout", path: "/calculator/working_area" },
        ],
      },
      {
        label: "Lift Studies",
        icon: "🏗️",
        items: [
          {
            label: "Lift Load Sheets",
            path: "/calculator/lift_sheet",
            badge: "verified",
          },
          { label: "Sling Angle Calculator", path: "/calculator/sling_angle" },
        ],
      },
      {
        label: "Temporary Stability",
        icon: "⚖️",
        items: [
          { label: "Erection Stages", path: "/calculator/erection_stages" },
          { label: "Notional Wind Check", path: "/calculator/notional_wind" },
        ],
      },
    ],
  },
  {
    title: "Site Tools",
    path: "/site-tools",
    icon: "🔧",
    description: "Quick checks and site calculations",
    categories: [
      {
        label: "Quantities",
        icon: "📦",
        items: [
          { label: "6F2/Type 1 Calculator", path: "/calculator/6f2_quantity" },
          { label: "Timber Quantities", path: "/calculator/timber_quantity" },
          { label: "Legato Block Count", path: "/calculator/legato_quantity" },
        ],
      },
      {
        label: "Volumes & Levels",
        icon: "📏",
        items: [
          { label: "Cut/Fill Volumes", path: "/calculator/volumes" },
          { label: "Batter Calculations", path: "/calculator/batters" },
        ],
      },
      {
        label: "Set-outs",
        icon: "📐",
        items: [
          { label: "Bolt Pattern Generator", path: "/calculator/bolt_pattern" },
          { label: "Hole Pattern DXF", path: "/calculator/hole_pattern_dxf" },
        ],
      },
    ],
  },
  {
    title: "Libraries",
    path: "/libraries",
    icon: "📚",
    description: "Material and section catalogues",
    categories: [
      {
        label: "Materials",
        icon: "🔩",
        items: [
          { label: "Steel Grades", path: "/libraries/steel" },
          { label: "Concrete Classes", path: "/libraries/concrete" },
          { label: "Timber Species", path: "/libraries/timber" },
        ],
      },
      {
        label: "Sections",
        icon: "📏",
        items: [
          { label: "UKB/UKC/UC/UB", path: "/libraries/sections" },
          { label: "PFC/Channels", path: "/libraries/channels" },
          { label: "Plates", path: "/libraries/plates" },
        ],
      },
      {
        label: "Load Models",
        icon: "⚖️",
        items: [
          { label: "Traffic Presets", path: "/libraries/traffic" },
          { label: "Wind Presets", path: "/libraries/wind" },
          { label: "Thermal Presets", path: "/libraries/thermal" },
        ],
      },
      {
        label: "Components",
        icon: "⚙️",
        items: [
          { label: "Bearings Catalogue", path: "/libraries/bearings" },
          { label: "Joints Catalogue", path: "/libraries/joints" },
        ],
      },
    ],
  },
  {
    title: "Reports",
    path: "/reports",
    icon: "📄",
    description: "Report generation and exports",
    categories: [
      {
        label: "Report Builder",
        icon: "📝",
        items: [
          { label: "PDF Reports", path: "/reports/pdf" },
          { label: "DOCX Reports", path: "/reports/docx" },
          { label: "Batch Reports", path: "/reports/batch" },
        ],
      },
      {
        label: "Templates",
        icon: "📋",
        items: [
          { label: "Method Statements", path: "/reports/method-statements" },
          { label: "General Notes Packs", path: "/reports/notes" },
        ],
      },
      {
        label: "CAD Exports",
        icon: "🖥️",
        items: [
          { label: "DXF Export Centre", path: "/reports/dxf" },
          { label: "IFC Export (Pilot)", path: "/reports/ifc", badge: "beta" },
        ],
      },
    ],
  },
  {
    title: "Admin",
    path: "/admin",
    icon: "⚙️",
    description: "System administration",
    categories: [
      {
        label: "User Management",
        icon: "👥",
        items: [
          { label: "Users & Roles", path: "/admin/users" },
          { label: "Permissions", path: "/admin/permissions" },
        ],
      },
      {
        label: "System",
        icon: "🔧",
        items: [
          { label: "Calculator Manager", path: "/admin/calculators" },
          { label: "Audit & Integrity", path: "/admin/audit" },
          { label: "Integrations", path: "/admin/integrations" },
          { label: "Feature Flags", path: "/admin/features" },
        ],
      },
    ],
  },
];

// Quick calculator definitions for the Quick Calc drawer
export interface QuickCalc {
  id: string;
  label: string;
  icon: string;
  description: string;
  inputs: { name: string; unit: string; placeholder: string }[];
  calculate: (inputs: Record<string, number>) => Record<string, number>;
}

export const quickCalculators: QuickCalc[] = [
  {
    id: "force_conversion",
    label: "Force Conversion",
    icon: "⚖️",
    description: "Convert between kN and tonnes",
    inputs: [{ name: "kN", unit: "kN", placeholder: "100" }],
    calculate: (inputs) => ({ tonnes: inputs.kN / 9.81 }),
  },
  {
    id: "length_conversion",
    label: "Length Conversion",
    icon: "📏",
    description: "Convert between mm and metres",
    inputs: [{ name: "mm", unit: "mm", placeholder: "1000" }],
    calculate: (inputs) => ({ metres: inputs.mm / 1000 }),
  },
  {
    id: "bolt_shear",
    label: "Bolt Shear Capacity",
    icon: "🔩",
    description: "Quick M20 8.8 bolt shear",
    inputs: [
      { name: "count", unit: "nr", placeholder: "4" },
      { name: "planes", unit: "nr", placeholder: "1" },
    ],
    calculate: (inputs) => ({
      capacity_kN: inputs.count * inputs.planes * 98.3,
    }),
  },
];
