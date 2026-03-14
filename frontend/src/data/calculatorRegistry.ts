/**
 * Calculator Registry
 * Maps calculator keys to navigation structure with metadata
 */

export interface CalculatorMetadata {
  key: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  badge?: "verified" | "beta" | "new";
  version: string;
  status: "active" | "draft" | "deprecated";
  eurocodes: string[];
  tags: string[];
}

export const calculatorRegistry: Record<string, CalculatorMetadata> = {
  // Existing Calculators
  crane_pad_design: {
    key: "crane_pad_design",
    name: "Crane Pad Design",
    description:
      "Design crane pads and outrigger loads with bearing pressure, punching, and stability checks",
    category: "Temporary Works",
    subcategory: "Working Platforms & Crane Pads",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "EN 1997-1"],
    tags: [
      "crane",
      "pad",
      "temporary works",
      "bearing",
      "punching",
      "stability",
    ],
  },

  pad_footing_bearing: {
    key: "pad_footing_bearing",
    name: "Pad Footing Bearing",
    description:
      "Pad and strip footing bearing pressure, sliding, and overturning checks",
    category: "Geotechnics",
    subcategory: "Foundations",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1", "EN 1992-1-1"],
    tags: [
      "foundation",
      "pad",
      "footing",
      "bearing",
      "geotechnics",
      "ULS",
      "SLS",
    ],
  },

  rc_slab_bending: {
    key: "rc_slab_bending",
    name: "RC Slab Bending",
    description:
      "Reinforced concrete slab design for bending and shear with reinforcement scheduling",
    category: "Structures",
    subcategory: "Concrete",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1", "EN 1992-1-1 UK NA"],
    tags: ["concrete", "RC", "slab", "bending", "reinforcement", "ULS", "SLS"],
  },

  steel_beam_bending: {
    key: "steel_beam_bending",
    name: "Steel Beam Bending",
    description:
      "I/H-section steel beam bending, shear, and deflection checks with LTB",
    category: "Structures",
    subcategory: "Steel Members",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1", "EN 1993-1-1 UK NA"],
    tags: ["steel", "beam", "bending", "LTB", "ULS", "SLS", "I-section"],
  },

  steel_plate_girder: {
    key: "steel_plate_girder",
    name: "Steel Plate Girders",
    description:
      "Plate girder design with web slenderness, stiffeners, and LTB checks",
    category: "Bridges",
    subcategory: "Superstructure",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1", "EN 1993-1-5", "EN 1993-2"],
    tags: ["steel", "plate girder", "bridge", "stiffeners", "buckling"],
  },

  composite_beam: {
    key: "composite_beam",
    name: "Composite Beams",
    description:
      "Composite beam design with shear studs and effective width calculations",
    category: "Bridges",
    subcategory: "Superstructure",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1", "EN 1994-1-1"],
    tags: ["composite", "steel", "concrete", "shear studs", "bridge"],
  },

  deck_slab: {
    key: "deck_slab",
    name: "Deck Slab Design",
    description:
      "Reinforced concrete slab design for one-way and two-way bending with shear checks",
    category: "Structures",
    subcategory: "Concrete",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1"],
    tags: ["concrete", "RC", "slab", "reinforcement", "bending", "shear"],
  },

  transverse_members: {
    key: "transverse_members",
    name: "Transverse Members",
    description:
      "Bridge transverse beam and diaphragm design with load distribution analysis",
    category: "Bridges",
    subcategory: "Superstructure",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1"],
    tags: [
      "bridge",
      "transverse",
      "beam",
      "diaphragm",
      "steel",
      "load distribution",
    ],
  },

  bracing: {
    key: "bracing",
    name: "Structural Bracing",
    description:
      "Cross/K/X bracing system design for lateral stability with steel/timber/cable options",
    category: "Structures",
    subcategory: "Stability Systems",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1", "EN 1995-1-1"],
    tags: [
      "bracing",
      "stability",
      "lateral",
      "cross bracing",
      "steel",
      "timber",
      "cable",
      "buckling",
    ],
  },

  working_platform: {
    key: "working_platform",
    name: "Working Platform",
    description:
      "Working platform thickness design from CBR with partial factors",
    category: "Temporary Works",
    subcategory: "Working Platforms & Crane Pads",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "BRE 470"],
    tags: ["working platform", "temporary works", "CBR", "ground bearing"],
  },

  heras_fence: {
    key: "heras_fence",
    name: "Heras Fence + Ballast",
    description:
      "Heras fence stability in wind with ballast and rubber mat checks",
    category: "Temporary Works",
    subcategory: "Edge Protection & Fencing",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "EN 1991-1-4"],
    tags: ["heras", "fence", "temporary works", "wind", "stability", "ballast"],
  },

  falsework: {
    key: "falsework",
    name: "Falsework Posts/Ledgers",
    description:
      "Falsework design with load paths, buckling, and bracing checks",
    category: "Temporary Works",
    subcategory: "Falsework & Formwork",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "EN 1993-1-1"],
    tags: ["falsework", "temporary works", "props", "buckling", "bracing"],
  },

  bolted_connection: {
    key: "bolted_connection",
    name: "Bolted Connections",
    description:
      "Bolted connection design for shear, bearing, and slip-resistant joints",
    category: "Structures",
    subcategory: "Steel Connections",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-8", "EN 1993-1-8 UK NA"],
    tags: ["bolt", "connection", "steel", "shear", "bearing", "slip"],
  },

  weld_sizing: {
    key: "weld_sizing",
    name: "Weld Sizing",
    description: "Fillet and butt weld sizing for steel connections",
    category: "Structures",
    subcategory: "Steel Connections",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-8"],
    tags: ["weld", "connection", "steel", "fillet", "butt"],
  },

  bearing_reactions: {
    key: "bearing_reactions",
    name: "Bearing Reactions",
    description:
      "Advanced bearing reaction envelope analysis from multiple load cases with stability assessment",
    category: "Bridges",
    subcategory: "Bearings & Joints",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1990", "EN 1991-2"],
    tags: [
      "bearing",
      "reactions",
      "bridge",
      "load cases",
      "envelopes",
      "stability",
      "pot bearing",
      "spherical",
      "cylindrical",
    ],
  },

  elastomeric_bearings: {
    key: "elastomeric_bearings",
    name: "Elastomeric Bearings",
    description:
      "Elastomeric bearing design with shape factor analysis, stability verification, and stiffness calculations",
    category: "Bridges",
    subcategory: "Bearings & Joints",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1337-3"],
    tags: [
      "elastomeric",
      "bearing",
      "bridge",
      "shape factor",
      "stability",
      "stiffness",
      "shear",
      "compression",
      "strain",
    ],
  },

  movement_joints: {
    key: "movement_joints",
    name: "Movement Joints",
    description:
      "Bridge movement joint design with thermal expansion, creep, shrinkage, and seismic movement calculations",
    category: "Bridges",
    subcategory: "Bearings & Joints",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1991-1-5", "EN 1992-1-1", "EN 1998-2"],
    tags: [
      "movement",
      "joint",
      "bridge",
      "thermal",
      "expansion",
      "creep",
      "shrinkage",
      "seismic",
      "expansion joint",
    ],
  },

  load_sheet: {
    key: "load_sheet",
    name: "Load Sheet Generator",
    description:
      "Generate load sheets for lifting operations with ULS/SLS envelopes",
    category: "Temporary Works",
    subcategory: "Lifting & Rigging",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 7121", "BS 5975"],
    tags: ["lifting", "load sheet", "temporary works", "rigging", "crane"],
  },

  trackmats: {
    key: "trackmats",
    name: "Trackmats / Bog Mats",
    description: "Timber/composite mat capacity and bearing stress checks",
    category: "Temporary Works",
    subcategory: "Working Platforms & Crane Pads",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1995-1-1", "BS 5975"],
    tags: [
      "trackmats",
      "bog mats",
      "timber",
      "temporary works",
      "ground protection",
    ],
  },

  combination_builder: {
    key: "combination_builder",
    name: "Combination Builder",
    description: "Generate ULS/SLS load combinations from load cases",
    category: "Bridges",
    subcategory: "Loading & Analysis",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1990", "EN 1990 UK NA"],
    tags: ["load combinations", "ULS", "SLS", "load cases", "partial factors"],
  },

  member_ratings: {
    key: "member_ratings",
    name: "Member Ratings",
    description:
      "Comprehensive structural member capacity checks for steel, concrete, and timber members under combined loading",
    category: "Structures",
    subcategory: "Member Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1", "EN 1992-1-1", "EN 1995-1-1"],
    tags: [
      "member",
      "capacity",
      "steel",
      "concrete",
      "timber",
      "combined loading",
      "ULS",
      "SLS",
      "Utilisation",
      "section check",
    ],
  },

  sensitivity: {
    key: "sensitivity",
    name: "Sensitivity Analysis",
    description:
      "Advanced sensitivity analysis for structural calculations with parameter variation, Monte Carlo simulation, and correlation studies",
    category: "Analysis",
    subcategory: "Sensitivity & Risk",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1990", "EN 1991-1-1"],
    tags: [
      "sensitivity",
      "analysis",
      "monte carlo",
      "correlation",
      "parameter variation",
      "tornado diagram",
      "risk assessment",
      "uncertainty",
      "statistical analysis",
      "reliability",
    ],
  },

  abutments: {
    key: "abutments_v1",
    name: "Abutments Design",
    description:
      "Bridge abutment design with foundation analysis, stability checks, and reinforcement calculations",
    category: "Bridges",
    subcategory: "Substructure",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1", "EN 1997-1"],
    tags: [
      "abutments",
      "bridge",
      "foundation",
      "stability",
      "reinforcement",
      "concrete",
      "bearing capacity",
      "sliding",
      "overturning",
      "earth pressure",
    ],
  },

  raking_props: {
    key: "raking_props",
    name: "Raking Props",
    description:
      "Raking prop design with axial capacity, buckling, sliding, and overturning checks for temporary support",
    category: "Temporary Works",
    subcategory: "Propping & Support",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "EN 1993-1-1"],
    tags: [
      "raking props",
      "temporary works",
      "propping",
      "buckling",
      "stability",
      "axial",
    ],
  },

  vertical_props: {
    key: "vertical_props",
    name: "Vertical Props",
    description:
      "Vertical prop capacity checks with steel/aluminium options and buckling analysis",
    category: "Temporary Works",
    subcategory: "Propping & Support",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "EN 1993-1-1"],
    tags: [
      "vertical props",
      "temporary works",
      "propping",
      "buckling",
      "steel",
      "aluminium",
    ],
  },

  spreader_beam: {
    key: "spreader_beam",
    name: "Spreader Beam",
    description:
      "Spreader beam design for lifting with bending, shear, and connection checks",
    category: "Temporary Works",
    subcategory: "Lifting & Rigging",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 7121", "EN 1993-1-1"],
    tags: [
      "spreader beam",
      "lifting",
      "temporary works",
      "rigging",
      "bending",
      "shear",
    ],
  },

  sling_checks: {
    key: "sling_checks",
    name: "Sling Checks",
    description:
      "Sling capacity calculations with angle factors, WLL checks, and multi-leg assembly analysis",
    category: "Temporary Works",
    subcategory: "Lifting & Rigging",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS EN 1492", "LOLER 1998"],
    tags: [
      "sling",
      "lifting",
      "temporary works",
      "rigging",
      "WLL",
      "chain",
      "wire rope",
    ],
  },

  formwork_pressure: {
    key: "formwork_pressure",
    name: "Formwork Pressure",
    description:
      "Concrete formwork pressure calculations with pour rate and temperature considerations",
    category: "Temporary Works",
    subcategory: "Falsework & Formwork",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "CIRIA R108"],
    tags: [
      "formwork",
      "pressure",
      "temporary works",
      "concrete",
      "pour rate",
      "shuttering",
    ],
  },

  load_spread: {
    key: "load_spread",
    name: "Load Spread Analysis",
    description:
      "Boussinesq and 2:1 load spread analysis for ground bearing and foundation design",
    category: "Geotechnics",
    subcategory: "Foundations",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1"],
    tags: [
      "load spread",
      "boussinesq",
      "bearing",
      "foundation",
      "ground",
      "stress distribution",
    ],
  },

  bog_mats: {
    key: "bog_mats",
    name: "Bog Mats",
    description:
      "Timber bog mat design with bending, shear, and ground bearing checks",
    category: "Temporary Works",
    subcategory: "Working Platforms & Crane Pads",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1995-1-1", "BS 5975"],
    tags: [
      "bog mats",
      "timber",
      "temporary works",
      "ground protection",
      "bending",
      "shear",
    ],
  },

  grillage: {
    key: "grillage",
    name: "Grillage Analysis",
    description:
      "Steel grillage foundation design with beam bending, shear, and bearing checks",
    category: "Structures",
    subcategory: "Foundations",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1", "EN 1997-1"],
    tags: [
      "grillage",
      "foundation",
      "steel",
      "beam",
      "bearing",
      "temporary works",
    ],
  },

  traffic_actions: {
    key: "traffic_actions",
    name: "Traffic Actions",
    description:
      "Highway bridge traffic loading to EN 1991-2 with LM1, LM2, LM3, and special vehicles",
    category: "Loads",
    subcategory: "Traffic Loading",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1991-2", "EN 1991-2 UK NA"],
    tags: ["traffic", "loading", "bridge", "LM1", "LM2", "highway", "vehicles"],
  },

  wind_actions: {
    key: "wind_actions",
    name: "Wind Actions",
    description:
      "Wind loading calculations to EN 1991-1-4 for structures and temporary works",
    category: "Loads",
    subcategory: "Environmental Loading",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1991-1-4", "EN 1991-1-4 UK NA"],
    tags: [
      "wind",
      "loading",
      "environmental",
      "pressure",
      "force",
      "temporary works",
    ],
  },

  thermal_actions: {
    key: "thermal_actions",
    name: "Thermal Actions",
    description:
      "Thermal expansion and contraction calculations for bridges and structures",
    category: "Loads",
    subcategory: "Environmental Loading",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1991-1-5", "EN 1991-1-5 UK NA"],
    tags: [
      "thermal",
      "expansion",
      "temperature",
      "gradient",
      "bridge",
      "movements",
    ],
  },

  pier_design: {
    key: "pier_design",
    name: "Pier Design",
    description:
      "Bridge pier design with RC/steel options, slenderness, and capacity checks",
    category: "Bridges",
    subcategory: "Substructure",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1", "EN 1993-1-1", "EN 1997-1"],
    tags: [
      "pier",
      "bridge",
      "column",
      "slenderness",
      "buckling",
      "concrete",
      "steel",
    ],
  },

  spread_footings: {
    key: "spread_footings",
    name: "Spread Footings",
    description:
      "Spread footing design with eccentricity, sliding, and bearing capacity checks",
    category: "Geotechnics",
    subcategory: "Foundations",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1", "EN 1992-1-1"],
    tags: [
      "spread footing",
      "foundation",
      "bearing",
      "sliding",
      "eccentricity",
      "geotechnics",
    ],
  },

  strip_footing: {
    key: "strip_footing",
    name: "Strip Footing",
    description:
      "Strip footing analysis per meter run with eccentricity and sliding checks",
    category: "Geotechnics",
    subcategory: "Foundations",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1"],
    tags: [
      "strip footing",
      "foundation",
      "bearing",
      "geotechnics",
      "per meter",
    ],
  },

  pile_foundations: {
    key: "pile_foundations",
    name: "Pile Foundations",
    description:
      "Pile capacity calculations with static methods, group effects, and settlement",
    category: "Geotechnics",
    subcategory: "Deep Foundations",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1", "EN 1536"],
    tags: [
      "pile",
      "foundation",
      "deep",
      "capacity",
      "settlement",
      "group effects",
    ],
  },

  temporary_parapet: {
    key: "temporary_parapet",
    name: "Temporary Parapet",
    description: "Design clamp-on edge protection systems to EN 13374.",
    category: "Temporary Works",
    subcategory: "Edge Protection",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 13374"],
    tags: ["edge protection", "parapet", "clamp", "safety"],
  },
  guardrail_checks: {
    key: "guardrail_checks",
    name: "Guardrail Checks",
    description: "Check capacity of tubular guardrails and posts.",
    category: "Temporary Works",
    subcategory: "Edge Protection",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 13374", "EN 1993"],
    tags: ["guardrail", "handrail", "safety", "barrier"],
  },
  needle_beam: {
    key: "needle_beam",
    name: "Needle Beam Design",
    description: "Design steel needle beams for temporary wall support.",
    category: "Temporary Works",
    subcategory: "Propping & Shoring",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "EN 1993-1-1"],
    tags: [
      "needle beam",
      "temporary works",
      "propping",
      "steel",
      "masonry support",
    ],
  },

  excavation_sheeting: {
    key: "excavation_sheeting",
    name: "Excavation Support",
    description: "Design cantilever sheet pile walls for shallow excavations.",
    category: "Temporary Works",
    subcategory: "Propping & Shoring",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1"],
    tags: [
      "excavation",
      "sheet pile",
      "temporary works",
      "retaining wall",
      "geotechnics",
    ],
  },

  negative_skin_friction: {
    key: "negative_skin_friction",
    name: "Negative Skin Friction",
    description: "Calculate drag load on piles due to soil settlement.",
    category: "Geotechnics",
    subcategory: "Foundations",
    badge: "beta",
    version: "0.5.0",
    status: "active",
    eurocodes: ["EN 1997-1"],
    tags: [
      "pile",
      "drag load",
      "settlement",
      "negative skin friction",
      "geotechnics",
    ],
  },

  slope_stability: {
    key: "slope_stability",
    name: "Slope Stability",
    description: "Global stability analysis using Bishop's Simplified Method.",
    category: "Geotechnics",
    subcategory: "Earthworks",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1"],
    tags: ["slope", "stability", "bishop", "slip circle", "geotechnics"],
  },

  cut_fill_volumes: {
    key: "cut_fill_volumes",
    name: "Cut & Fill Volumes",
    description:
      "Earthworks volume calculations using Average End Area method.",
    category: "Geotechnics",
    subcategory: "Earthworks",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 6031"],
    tags: ["earthworks", "cut fill", "volume", "mass haul", "geotechnics"],
  },

  legato_wall: {
    key: "legato_wall",
    name: "Legato Wall",
    description: "Interlocking concrete block gravity wall analysis.",
    category: "Geotechnics",
    subcategory: "Retaining Structures",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1"],
    tags: ["retaining wall", "gravity", "legato", "block", "geotechnics"],
  },

  gravity_wall: {
    key: "gravity_wall",
    name: "Gravity Wall",
    description:
      "Stability analysis (Sliding, Overturning, Bearing) for mass gravity walls.",
    category: "Geotechnics",
    subcategory: "Retaining Structures",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1"],
    tags: ["retaining wall", "gravity", "concrete", "masonry", "geotechnics"],
  },

  grs_wall: {
    key: "grs_wall",
    name: "GRS Wall",
    description:
      "Geosynthetic Reinforced Soil wall analysis (Internal and External).",
    category: "Geotechnics",
    subcategory: "Retaining Structures",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 8006", "FHWA"],
    tags: [
      "grs",
      "reinforced soil",
      "geosynthetic",
      "retaining wall",
      "geotechnics",
    ],
  },

  ground_mats: {
    key: "ground_mats",
    name: "Ground Mats",
    description:
      "Structural design of timber or steel ground mats (Winkler spring model).",
    category: "Geotechnics",
    subcategory: "Ground Improvement",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975"],
    tags: [
      "mat",
      "crane",
      "ground improvement",
      "temporary works",
      "geotechnics",
    ],
  },

  geogrid_design: {
    key: "geogrid_design",
    name: "Geogrid Design",
    description:
      "Design of geogrid reinforced unpaved roads and working platforms.",
    category: "Geotechnics",
    subcategory: "Ground Improvement",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 8006", "USACE"],
    tags: [
      "geogrid",
      "pavement",
      "unpaved",
      "ground improvement",
      "geotechnics",
    ],
  },

  // â”€â”€ Structures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  base_plate: {
    key: "base_plate",
    name: "Base Plate",
    description:
      "Steel column base plate design â€” bearing stress, plate bending, anchor bolt checks.",
    category: "Structures",
    subcategory: "Steel Connections",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-8"],
    tags: ["base plate", "anchor bolts", "bearing", "column base", "steel"],
  },
  combined_loading: {
    key: "combined_loading",
    name: "Combined Loading",
    description:
      "Steel members under combined axial + bending â€” interaction and buckling checks.",
    category: "Structures",
    subcategory: "Steel Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1"],
    tags: [
      "combined loading",
      "interaction",
      "buckling",
      "axial",
      "bending",
      "steel",
    ],
  },
  composite_quick: {
    key: "composite_quick",
    name: "Composite Quick Check",
    description:
      "Simplified composite beam check â€” moment, deflection, and shear stud requirement.",
    category: "Structures",
    subcategory: "Composite Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1994-1-1"],
    tags: [
      "composite beam",
      "shear studs",
      "neutral axis",
      "deflection",
      "slab",
    ],
  },
  crack_width: {
    key: "crack_width",
    name: "Crack Width",
    description:
      "Serviceability crack width check for RC sections to EN 1992-1-1 Clause 7.3.",
    category: "Structures",
    subcategory: "Concrete Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1"],
    tags: [
      "crack width",
      "serviceability",
      "reinforcement",
      "exposure",
      "concrete",
    ],
  },
  end_plate: {
    key: "end_plate",
    name: "End Plate",
    description:
      "Steel beam end plate moment connection â€” T-stub, bolt forces, plate bending, weld checks.",
    category: "Structures",
    subcategory: "Steel Connections",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-8"],
    tags: [
      "end plate",
      "moment connection",
      "T-stub",
      "bolts",
      "welds",
      "steel",
    ],
  },
  ltb_check: {
    key: "ltb_check",
    name: "LTB Check",
    description:
      "Lateral torsional buckling check for steel beams â€” Mcr, reduction factor, utilisation.",
    category: "Structures",
    subcategory: "Steel Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1"],
    tags: [
      "LTB",
      "lateral torsional buckling",
      "steel beam",
      "Mcr",
      "restraint",
    ],
  },
  punching_shear: {
    key: "punching_shear",
    name: "Punching Shear",
    description:
      "RC slab punching shear design â€” control perimeters, shear stress, stud reinforcement.",
    category: "Structures",
    subcategory: "Concrete Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1"],
    tags: ["punching shear", "slab", "column", "control perimeter", "concrete"],
  },
  rc_beam: {
    key: "rc_beam",
    name: "RC Beam",
    description:
      "Reinforced concrete beam design â€” flexure, shear, deflection, reinforcement sizing.",
    category: "Structures",
    subcategory: "Concrete Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1"],
    tags: [
      "RC beam",
      "flexure",
      "shear",
      "reinforcement",
      "concrete",
      "deflection",
    ],
  },
  shear_studs: {
    key: "shear_studs",
    name: "Shear Studs",
    description:
      "Headed shear stud design for composite beams â€” capacity, deck factor, spacing.",
    category: "Structures",
    subcategory: "Composite Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1994-1-1"],
    tags: ["shear studs", "composite", "headed studs", "deck", "PRd"],
  },
  timber_connection: {
    key: "timber_connection",
    name: "Timber Connection",
    description:
      "Timber fastener connection design â€” Johansen yield, kmod, spacing rules.",
    category: "Structures",
    subcategory: "Timber Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1995-1-1"],
    tags: [
      "timber",
      "connection",
      "fastener",
      "bolt",
      "nail",
      "screw",
      "Johansen",
    ],
  },
  timber_member: {
    key: "timber_member",
    name: "Timber Member",
    description:
      "Timber member bending, shear, and deflection checks with kmod and service class.",
    category: "Structures",
    subcategory: "Timber Design",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1995-1-1"],
    tags: [
      "timber",
      "beam",
      "joist",
      "rafter",
      "bending",
      "shear",
      "deflection",
    ],
  },

  // â”€â”€ Temporary Works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  access_ramps: {
    key: "access_ramps",
    name: "Access Ramps",
    description:
      "Plant & vehicle access ramp design â€” gradient, traction, width, stopping distance.",
    category: "Temporary Works",
    subcategory: "Access & Logistics",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: ["ramps", "plant access", "gradient", "traction", "site logistics"],
  },
  erection_stages: {
    key: "erection_stages",
    name: "Erection Stages",
    description:
      "Phased lifting/erection planning â€” stage weights, crane utilisation, durations.",
    category: "Temporary Works",
    subcategory: "Erection Planning",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: [
      "erection",
      "lifting",
      "staging",
      "crane",
      "steel erection",
      "planning",
    ],
  },
  haul_road: {
    key: "haul_road",
    name: "Haul Road",
    description:
      "CBR-based haul road thickness design with geosynthetic reinforcement options.",
    category: "Temporary Works",
    subcategory: "Access & Logistics",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: [
      "haul road",
      "CBR",
      "geotextile",
      "geogrid",
      "subgrade",
      "thickness",
    ],
  },
  hoarding: {
    key: "hoarding",
    name: "Hoarding",
    description:
      "Site hoarding design â€” wind load, overturning checks, foundation sizing.",
    category: "Temporary Works",
    subcategory: "Site Setup",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS EN 1991-1-4"],
    tags: ["hoarding", "wind load", "kentledge", "site boundary", "fence"],
  },
  notional_wind: {
    key: "notional_wind",
    name: "Notional Wind",
    description:
      "Simplified wind pressure for temporary works â€” hoarding, scaffold, falsework.",
    category: "Temporary Works",
    subcategory: "Wind Loading",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS EN 1991-1-4"],
    tags: ["wind", "temporary works", "scaffold", "falsework", "peak pressure"],
  },
  soffit_shores: {
    key: "soffit_shores",
    name: "Soffit Shores",
    description:
      "Slab formwork propping design â€” dead/imposed loads, prop layout, capacity utilisation.",
    category: "Temporary Works",
    subcategory: "Formwork & Falsework",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS 5975", "BS EN 12812"],
    tags: ["soffit", "propping", "formwork", "props", "slab", "falsework"],
  },
  trench_support: {
    key: "trench_support",
    name: "Trench Support",
    description:
      "Trench shoring analysis â€” earth pressure, strut capacity, width verification.",
    category: "Temporary Works",
    subcategory: "Excavation Support",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: ["trench", "shoring", "earth pressure", "struts", "excavation"],
  },
  turning_platform: {
    key: "turning_platform",
    name: "Turning Platform",
    description:
      "Heavy plant turning platform â€” swept path diameter, surface/subgrade bearing.",
    category: "Temporary Works",
    subcategory: "Access & Logistics",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: ["turning", "platform", "piling rig", "plant", "bearing", "CBR"],
  },

  // â”€â”€ Geotechnics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  batters: {
    key: "batters",
    name: "Batters",
    description:
      "Slope angle, setback, and volume calculator for earthworks cuts and embankments.",
    category: "Geotechnics",
    subcategory: "Earthworks",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: ["batters", "slope", "earthworks", "cut", "embankment", "volume"],
  },
  pile_capacity: {
    key: "pile_capacity",
    name: "Pile Capacity",
    description:
      "Pile capacity from SPT, CPT, or analytical methods â€” shaft, base, settlement.",
    category: "Geotechnics",
    subcategory: "Piling",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1"],
    tags: ["pile", "capacity", "SPT", "CPT", "settlement", "shaft friction"],
  },

  // â”€â”€ Lifting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sling_angle: {
    key: "sling_angle",
    name: "Sling Angle",
    description:
      "Sling capacity and angle analysis â€” tension, WLL check, mode factor.",
    category: "Lifting",
    subcategory: "Rigging",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["BS EN 1492", "LEEA"],
    tags: ["sling", "angle", "WLL", "lifting", "rigging", "tension"],
  },

  // â”€â”€ Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  bolt_pattern: {
    key: "bolt_pattern",
    name: "Bolt Pattern",
    description:
      "Bolt group geometric analysis â€” centroid, polar moment, force distribution.",
    category: "Tools",
    subcategory: "Steel Detailing",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: ["bolt pattern", "polar moment", "bolt group", "centroid", "inertia"],
  },
  hole_pattern_dxf: {
    key: "hole_pattern_dxf",
    name: "Hole Pattern DXF",
    description:
      "Hole pattern generation with DXF export for CNC/CAD fabrication.",
    category: "Tools",
    subcategory: "Fabrication",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: ["DXF", "hole pattern", "CNC", "CAD", "drilling", "export"],
  },
  legato_quantity: {
    key: "legato_quantity",
    name: "Legato Quantity",
    description:
      "Legato block quantity calculator â€” block count, weight, delivery loads, cost.",
    category: "Tools",
    subcategory: "Quantities",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: ["legato", "blocks", "quantity", "interlocking", "retaining", "cost"],
  },
  "6f2_quantity": {
    key: "6f2_quantity",
    name: "6F2 Quantity",
    description:
      "Granular fill volume, tonnage, and cost estimation for platforms and crane pads.",
    category: "Tools",
    subcategory: "Quantities",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: ["6F2", "Type 1", "fill", "tonnage", "volume", "cost", "platform"],
  },
  swept_path: {
    key: "swept_path",
    name: "Swept Path",
    description:
      "Vehicle turning/swept path â€” inner/outer radii, road width, rear swing.",
    category: "Tools",
    subcategory: "Site Logistics",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: [
      "swept path",
      "turning",
      "vehicle",
      "access",
      "articulated",
      "road width",
    ],
  },
  timber_quantity: {
    key: "timber_quantity",
    name: "Timber Quantity",
    description:
      "Timber board/baulk quantity estimation â€” count, volume, packs, cost.",
    category: "Tools",
    subcategory: "Quantities",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: [
      "timber",
      "quantity",
      "boards",
      "scaffold boards",
      "formwork",
      "walings",
    ],
  },
  working_area: {
    key: "working_area",
    name: "Working Area",
    description:
      "Equipment working area and exclusion zone calculator â€” clearances, ground pressure.",
    category: "Tools",
    subcategory: "Site Planning",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: [],
    tags: [
      "working area",
      "exclusion zone",
      "plant",
      "clearance",
      "site planning",
    ],
  },

  anchor_bolt: {
    key: "anchor_bolt",
    name: "Anchor Bolt Design",
    description:
      "Cast-in and post-installed anchor bolt design with tension, shear, and combined loading checks",
    category: "Structures",
    subcategory: "Steel Connections",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-4", "EN 1993-1-8"],
    tags: [
      "anchor",
      "bolt",
      "connection",
      "tension",
      "shear",
      "concrete",
      "embedment",
    ],
  },

  cantilever_wall: {
    key: "cantilever_wall",
    name: "Cantilever Retaining Wall",
    description:
      "Reinforced concrete cantilever retaining wall design with sliding, overturning, and bearing checks",
    category: "Geotechnics",
    subcategory: "Retaining Walls",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1", "EN 1997-1"],
    tags: [
      "cantilever",
      "retaining wall",
      "earth pressure",
      "sliding",
      "overturning",
      "concrete",
    ],
  },

  fin_plate: {
    key: "fin_plate",
    name: "Fin Plate Connection",
    description:
      "Fin plate (shear tab) connection design with bolt group, weld, and block tearing checks",
    category: "Structures",
    subcategory: "Steel Connections",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-8"],
    tags: [
      "fin plate",
      "shear tab",
      "connection",
      "steel",
      "bolt",
      "weld",
      "block tearing",
    ],
  },

  gabion_wall: {
    key: "gabion_wall",
    name: "Gabion Wall",
    description:
      "Gabion basket retaining wall design with stability, sliding, and drainage checks",
    category: "Geotechnics",
    subcategory: "Retaining Walls",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1", "BS 8002"],
    tags: [
      "gabion",
      "retaining wall",
      "stability",
      "sliding",
      "drainage",
      "gravity wall",
    ],
  },

  ground_anchor: {
    key: "ground_anchor",
    name: "Ground Anchor",
    description:
      "Ground anchor and tie-back design with pull-out capacity, bond length, and proof load calculations",
    category: "Geotechnics",
    subcategory: "Ground Improvement",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1", "BS 8081"],
    tags: [
      "ground anchor",
      "tie-back",
      "pull-out",
      "bond",
      "prestressed",
      "grouted",
    ],
  },

  load_combinations: {
    key: "load_combinations",
    name: "Load Combinations",
    description:
      "EN 1990 load combination generator with permanent, variable, and accidental actions for ULS/SLS",
    category: "Bridges",
    subcategory: "Loading & Analysis",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1990", "EN 1990 UK NA"],
    tags: [
      "load combinations",
      "ULS",
      "SLS",
      "EN 1990",
      "partial factors",
      "psi factors",
    ],
  },

  rc_column: {
    key: "rc_column",
    name: "RC Column Design",
    description:
      "Reinforced concrete column design with axial-moment interaction, slenderness, and second-order effects",
    category: "Structures",
    subcategory: "Concrete",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1"],
    tags: [
      "concrete",
      "RC",
      "column",
      "interaction",
      "slenderness",
      "buckling",
      "second-order",
    ],
  },

  rc_slab: {
    key: "rc_slab",
    name: "RC Slab Design",
    description:
      "Reinforced concrete slab design for one-way and two-way bending with deflection and crack width checks",
    category: "Structures",
    subcategory: "Concrete",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1992-1-1"],
    tags: ["concrete", "RC", "slab", "bending", "deflection", "crack width"],
  },

  sheet_pile: {
    key: "sheet_pile",
    name: "Sheet Pile Wall",
    description:
      "Sheet pile retaining wall design with embedment depth, bending moment, and prop force calculations",
    category: "Geotechnics",
    subcategory: "Retaining Walls",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1", "EN 1993-5"],
    tags: [
      "sheet pile",
      "retaining wall",
      "cofferdam",
      "embedment",
      "prop",
      "cantilever",
    ],
  },

  six_f2_quantity: {
    key: "six_f2_quantity",
    name: "6F2 Quantity Calculator",
    description:
      "6F2 capping layer material quantity and thickness calculator for earthworks and road construction",
    category: "Construction Logistics",
    subcategory: "Material Quantities",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["SHW Series 600"],
    tags: [
      "6F2",
      "capping",
      "earthworks",
      "quantity",
      "material",
      "road construction",
    ],
  },

  soil_nail: {
    key: "soil_nail",
    name: "Soil Nail Design",
    description:
      "Soil nail wall design with pull-out resistance, global stability, and facing checks",
    category: "Geotechnics",
    subcategory: "Ground Improvement",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1997-1", "BS 8006"],
    tags: [
      "soil nail",
      "ground improvement",
      "slope",
      "stability",
      "pull-out",
      "facing",
    ],
  },

  steel_column_axial: {
    key: "steel_column_axial",
    name: "Steel Column Axial",
    description:
      "Steel column axial compression design with buckling resistance and effective length calculations",
    category: "Structures",
    subcategory: "Steel Members",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1993-1-1"],
    tags: [
      "steel",
      "column",
      "axial",
      "compression",
      "buckling",
      "effective length",
    ],
  },

  wind_load: {
    key: "wind_load",
    name: "Wind Load Calculator",
    description:
      "EN 1991-1-4 wind load and pressure calculation with terrain, orography, and structural factor analysis",
    category: "Structures",
    subcategory: "Loading",
    badge: "verified",
    version: "1.0.0",
    status: "active",
    eurocodes: ["EN 1991-1-4", "EN 1991-1-4 UK NA"],
    tags: [
      "wind",
      "load",
      "pressure",
      "terrain",
      "orography",
      "velocity",
      "dynamic",
    ],
  },
};

// Helper function to get calculator by key
export const getCalculator = (key: string): CalculatorMetadata | undefined => {
  return calculatorRegistry[key];
};

// Helper function to get calculators by category
export const getCalculatorsByCategory = (
  category: string,
): CalculatorMetadata[] => {
  return Object.values(calculatorRegistry).filter(
    (calc) => calc.category === category,
  );
};

// Helper function to get calculators by subcategory
export const getCalculatorsBySubcategory = (
  subcategory: string,
): CalculatorMetadata[] => {
  return Object.values(calculatorRegistry).filter(
    (calc) => calc.subcategory === subcategory,
  );
};

// Helper function to get active calculators only
export const getActiveCalculators = (): CalculatorMetadata[] => {
  return Object.values(calculatorRegistry).filter(
    (calc) => calc.status === "active",
  );
};

// Helper function to search calculators
export const searchCalculators = (query: string): CalculatorMetadata[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(calculatorRegistry).filter(
    (calc) =>
      calc.name.toLowerCase().includes(lowerQuery) ||
      calc.description.toLowerCase().includes(lowerQuery) ||
      calc.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );
};
