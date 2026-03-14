// ============================================================================
// BeaverCalc Studio — Wind Load Report Data Builder
// Wind Actions on Structures to BS EN 1991-1-4
// ============================================================================

import type {
  DesignCheckSection,
  DetailedCalculation,
  ReportConclusion,
  ReportData,
  ReportInputs,
  ReportWarning,
} from '../types';

/**
 * Form data from the Wind Load calculator
 */
export interface WindLoadFormData {
  // Location
  windRegion: string; // UK map regions
  altitude: string; // m above sea level
  distanceFromCoast: string; // km
  distanceToTownCentre: string; // km
  terrainCategory: string; // 0, I, II, III, IV

  // Structure
  structureType: string; // Building, Bridge, Sign, etc.
  structureHeight: string; // m
  structureWidth: string; // m (perpendicular to wind)
  structureDepth: string; // m (parallel to wind)

  // Building Shape (if applicable)
  roofType: string; // Flat, Monopitch, Duopitch, Hipped
  roofPitch: string; // degrees
  eavesHeight: string; // m

  // Openings (for internal pressure)
  dominantOpening: string; // Yes/No
  openingArea: string; // m² (if dominant)
  wallPermeability: string; // % (if no dominant)

  // Design Parameters
  returnPeriod: string; // 50, 100 years
  seasonalFactor: string; // 1.0 default
  probabilityFactor: string;
  directionalFactor: string; // cdir

  // Orography
  orographyType: string; // Flat, Hill, Escarpment, Valley
  effectiveHeight: string; // m (for orography)
  slopeAngle: string; // degrees (if hilly)
}

/**
 * Results from the Wind Load calculator
 */
export interface WindLoadResults {
  // Fundamental Values
  vb0: string; // m/s (basic wind velocity)
  vb: string; // m/s (with factors)
  qb: string; // N/m² (basic velocity pressure)

  // Terrain Factors
  z0: string; // m (roughness length)
  zmin: string; // m (minimum height)
  kr: string; // terrain factor
  cr: string; // roughness factor at ze
  co: string; // orography factor

  // Mean Wind
  vm: string; // m/s (mean wind at ze)
  Iv: string; // turbulence intensity
  qp: string; // N/m² (peak velocity pressure)
  qpKpa: string; // kPa

  // Reference Height
  ze: string; // m (reference height for external)
  zi: string; // m (reference height for internal)

  // Force Coefficients
  cfWindward: string; // Cpe for windward wall
  cfLeeward: string; // Cpe for leeward wall
  cfSidewalls: string; // Cpe for side walls
  cfRoofWindward: string; // Cpe for roof windward
  cfRoofLeeward: string; // Cpe for roof leeward
  cpi: string; // Internal pressure coefficient

  // Net Pressures
  netWindward: string; // kPa
  netLeeward: string; // kPa
  netSidewall: string; // kPa
  netRoofUp: string; // kPa (uplift)
  netRoofDown: string; // kPa (downward)

  // Overall Forces
  dragForce: string; // kN
  liftForce: string; // kN
  overturningMoment: string; // kNm

  // Structural Factor
  cscd: string; // combined structural factor

  overallStatus: string;
}

/**
 * Options for building the report
 */
export interface BuilderOptions {
  projectName?: string;
  clientName?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  documentRef?: string;
  version?: string;
}

/**
 * Build a ReportData object from Wind Load calculator results
 */
export function buildWindLoadReport(
  formData: WindLoadFormData,
  results: WindLoadResults,
  warnings: string[],
  options: BuilderOptions = {},
): ReportData {
  const today = new Date().toLocaleDateString('en-GB');

  // Wind calcs always PASS as they're providing loads
  const overallStatus: 'PASS' | 'FAIL' = 'PASS';

  // Build meta
  const meta = {
    title: 'Wind Load Analysis',
    projectName: options.projectName || 'Wind Load Assessment',
    clientName: options.clientName || 'Client',
    documentRef: options.documentRef || `WND-${Date.now().toString(36).toUpperCase()}`,
    version: options.version || 'Rev A',
    date: today,
    preparedBy: options.preparedBy || 'BeaverCalc Studio',
    checkedBy: options.checkedBy,
    approvedBy: options.approvedBy,
    calculatorName: 'Wind Load Calculator',
    designCodes: ['BS EN 1991-1-4:2005', 'UK NA to EN 1991-1-4'],
  };

  // Build executive summary
  const executiveSummary = {
    description: `${formData.structureType} wind load analysis.
    Height ${formData.structureHeight}m, ${formData.structureWidth}m × ${formData.structureDepth}m.
    ${formData.terrainCategory} terrain, ${formData.altitude}m altitude.
    ${formData.roofType} roof at ${formData.roofPitch}° pitch.`,
    keyResults: [
      { label: 'vb', value: `${results.vb} m/s` },
      { label: 'qp(ze)', value: `${results.qpKpa} kPa` },
      { label: 'Windward', value: `${results.netWindward} kPa`, highlight: true },
      { label: 'Roof Uplift', value: `${results.netRoofUp} kPa` },
      { label: 'Overall Drag', value: `${results.dragForce} kN` },
    ],
    overallStatus,
    governingCheck: 'Peak velocity pressure',
    utilisationSummary: `qp = ${results.qpKpa} kPa, ze = ${results.ze}m`,
  };

  // Build inputs
  const inputs: ReportInputs = {
    sections: [
      {
        title: 'Site Location',
        parameters: [
          { name: 'Wind Region', value: formData.windRegion },
          { name: 'Altitude', value: formData.altitude, unit: 'm' },
          { name: 'Distance from Coast', value: formData.distanceFromCoast, unit: 'km' },
          { name: 'Distance to Town Centre', value: formData.distanceToTownCentre, unit: 'km' },
        ],
      },
      {
        title: 'Terrain',
        parameters: [
          { name: 'Terrain Category', value: formData.terrainCategory },
          { name: 'Roughness Length z0', value: results.z0, unit: 'm' },
          { name: 'Minimum Height zmin', value: results.zmin, unit: 'm' },
          { name: 'Orography', value: formData.orographyType },
          { name: 'Orography Factor co', value: results.co },
        ],
      },
      {
        title: 'Structure Dimensions',
        parameters: [
          { name: 'Type', value: formData.structureType },
          { name: 'Height', value: formData.structureHeight, unit: 'm' },
          { name: 'Width (b)', value: formData.structureWidth, unit: 'm' },
          { name: 'Depth (d)', value: formData.structureDepth, unit: 'm' },
          { name: 'Eaves Height', value: formData.eavesHeight, unit: 'm' },
        ],
      },
      {
        title: 'Roof',
        parameters: [
          { name: 'Type', value: formData.roofType },
          { name: 'Pitch', value: formData.roofPitch, unit: '°' },
        ],
      },
      {
        title: 'Openings',
        parameters: [
          { name: 'Dominant Opening', value: formData.dominantOpening },
          {
            name: 'Opening Area',
            value: formData.dominantOpening === 'Yes' ? formData.openingArea : 'N/A',
            unit: formData.dominantOpening === 'Yes' ? 'm²' : '',
          },
          {
            name: 'Permeability',
            value: formData.dominantOpening === 'No' ? formData.wallPermeability : 'N/A',
            unit: formData.dominantOpening === 'No' ? '%' : '',
          },
        ],
      },
      {
        title: 'Design Factors',
        parameters: [
          { name: 'Return Period', value: formData.returnPeriod, unit: 'years' },
          { name: 'Seasonal Factor cseason', value: formData.seasonalFactor },
          { name: 'Probability Factor cprob', value: formData.probabilityFactor },
          { name: 'Directional Factor cdir', value: formData.directionalFactor },
          { name: 'Structural Factor cscd', value: results.cscd },
        ],
      },
    ],
  };

  // Build design checks (wind loads are outputs, not checks per se)
  const designChecks: DesignCheckSection[] = [
    {
      title: 'Basic Wind Velocity',
      description: 'EN 1991-1-4 Cl.4.2',
      checks: [
        {
          name: 'Fundamental vb,0',
          formula: 'From UK NA map',
          calculated: `${results.vb0} m/s`,
          limit: 'Based on location',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Basic vb',
          formula: 'vb = cdir × cseason × cprob × calt × vb,0',
          calculated: `${results.vb} m/s`,
          limit: 'Design value',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Peak Velocity Pressure',
      description: 'EN 1991-1-4 Cl.4.5',
      checks: [
        {
          name: 'Roughness Factor cr(ze)',
          formula: 'cr = kr × ln(ze/z0)',
          calculated: results.cr,
          limit: `At ze = ${results.ze}m`,
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Mean Velocity vm',
          formula: 'vm = cr × co × vb',
          calculated: `${results.vm} m/s`,
          limit: 'At reference height',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Peak Pressure qp(ze)',
          formula: 'qp = [1 + 7×Iv] × 0.5ρv²m',
          calculated: `${results.qpKpa} kPa`,
          limit: `(${results.qp} N/m²)`,
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'External Pressure Coefficients',
      description: 'EN 1991-1-4 Table 7.1',
      checks: [
        {
          name: 'Windward Wall (Zone D)',
          formula: 'Cpe,10 from h/d ratio',
          calculated: results.cfWindward,
          limit: 'For loaded area > 10m²',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Leeward Wall (Zone E)',
          formula: 'Cpe,10 from h/d ratio',
          calculated: results.cfLeeward,
          limit: 'For loaded area > 10m²',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Side Walls (Zones A-C)',
          formula: 'Cpe,10 = -1.2 to -0.5',
          calculated: results.cfSidewalls,
          limit: 'Most negative zone',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Roof Windward',
          formula: 'Cpe from pitch & h/d',
          calculated: results.cfRoofWindward,
          limit: `${formData.roofType} @ ${formData.roofPitch}°`,
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Roof Leeward',
          formula: 'Cpe from pitch & h/d',
          calculated: results.cfRoofLeeward,
          limit: `${formData.roofType} @ ${formData.roofPitch}°`,
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Internal Pressure Coefficient',
      description: 'EN 1991-1-4 Cl.7.2.9',
      checks: [
        {
          name: 'Cpi',
          formula:
            formData.dominantOpening === 'Yes' ? 'From dominant opening' : 'From permeability',
          calculated: results.cpi,
          limit: '-0.3 to +0.2 typically',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Net Design Pressures',
      description: 'we = qp × (Cpe - Cpi)',
      checks: [
        {
          name: 'Windward Wall',
          formula: `qp × (${results.cfWindward} - ${results.cpi})`,
          calculated: `${results.netWindward} kPa`,
          limit: 'Positive = pressure',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Leeward Wall',
          formula: `qp × (${results.cfLeeward} - ${results.cpi})`,
          calculated: `${results.netLeeward} kPa`,
          limit: 'Negative = suction',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Side Walls',
          formula: `qp × (${results.cfSidewalls} - ${results.cpi})`,
          calculated: `${results.netSidewall} kPa`,
          limit: 'Negative = suction',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Roof Uplift (max)',
          formula: `qp × (Cpe,min - Cpi,max)`,
          calculated: `${results.netRoofUp} kPa`,
          limit: 'Most adverse uplift',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Roof Downward',
          formula: `qp × (Cpe,max - Cpi,min)`,
          calculated: `${results.netRoofDown} kPa`,
          limit: 'If positive',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
    {
      title: 'Overall Forces',
      description: 'EN 1991-1-4 Cl.5.3',
      checks: [
        {
          name: 'Overall Drag (X)',
          formula: 'Fw = cscd × cf × qp(ze) × Aref',
          calculated: `${results.dragForce} kN`,
          limit: 'Horizontal force',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Overall Lift (Z)',
          formula: 'Fl = qp(ze) × Σ(Cpe × Aroof)',
          calculated: `${results.liftForce} kN`,
          limit: 'Vertical uplift',
          utilisation: 0,
          status: 'PASS',
        },
        {
          name: 'Overturning Moment',
          formula: 'M = Fw × ze/2',
          calculated: `${results.overturningMoment} kNm`,
          limit: 'About base',
          utilisation: 0,
          status: 'PASS',
        },
      ],
    },
  ];

  // Build detailed calculations
  const detailedCalculations: DetailedCalculation[] = [
    {
      title: 'Basic Wind Velocity',
      steps: [
        {
          description: 'Fundamental velocity',
          formula: 'vb,0 from UK NA Figure NA.1',
          result: `vb,0 = ${results.vb0} m/s`,
        },
        {
          description: 'Altitude factor',
          formula: 'calt = 1 + 0.001A (A < 10°)',
          substitution: `calt = 1 + 0.001 × ${formData.altitude}`,
          result: 'Altitude correction applied',
        },
        {
          description: 'Basic wind velocity',
          formula: 'vb = cdir × cseason × cprob × calt × vb,0',
          result: `vb = ${results.vb} m/s`,
        },
        {
          description: 'Basic velocity pressure',
          formula: 'qb = 0.5 × ρ × vb² (ρ = 1.226 kg/m³)',
          result: `qb = ${results.qb} N/m²`,
        },
      ],
    },
    {
      title: 'Terrain & Roughness',
      steps: [
        {
          description: 'Terrain category',
          formula: `Category ${formData.terrainCategory}`,
          result: `z0 = ${results.z0}m, zmin = ${results.zmin}m`,
        },
        {
          description: 'Terrain factor',
          formula: 'kr = 0.19 × (z0/z0,II)^0.07',
          result: `kr = ${results.kr}`,
        },
        {
          description: 'Reference height',
          formula: 'ze = max(h, b, 2×h, …) per figure 7.4',
          result: `ze = ${results.ze} m`,
        },
        {
          description: 'Roughness factor',
          formula: 'cr(ze) = kr × ln(ze/z0) for z ≥ zmin',
          result: `cr = ${results.cr}`,
        },
      ],
    },
    {
      title: 'Orography',
      steps: [
        {
          description: 'Orography type',
          formula: formData.orographyType,
          result: `co = ${results.co}`,
        },
        {
          description: 'Speed-up factor',
          formula: 'co(z) = 1 + 2s×Φ for hill/ridge',
          result:
            formData.orographyType === 'Flat' ? 'Flat terrain, co = 1.0' : `co = ${results.co}`,
        },
      ],
    },
    {
      title: 'Mean Wind & Peak Pressure',
      steps: [
        {
          description: 'Mean wind velocity',
          formula: 'vm(ze) = cr(ze) × co(ze) × vb',
          substitution: `vm = ${results.cr} × ${results.co} × ${results.vb}`,
          result: `vm = ${results.vm} m/s`,
        },
        {
          description: 'Turbulence intensity',
          formula: 'Iv(ze) = kI / (co × ln(ze/z0))',
          result: `Iv = ${results.Iv}`,
        },
        {
          description: 'Peak velocity pressure',
          formula: 'qp(ze) = [1 + 7×Iv(ze)] × 0.5×ρ×vm²',
          result: `qp = ${results.qp} N/m² = ${results.qpKpa} kPa`,
        },
      ],
    },
    {
      title: 'Pressure Coefficients',
      steps: [
        {
          description: 'h/d ratio',
          formula: `h/d = ${formData.structureHeight}/${formData.structureDepth}`,
          result: `h/d = ${(parseFloat(formData.structureHeight) / parseFloat(formData.structureDepth)).toFixed(2)}`,
        },
        {
          description: 'Windward Cpe,10 (Zone D)',
          formula: 'Table 7.1 interpolation',
          result: `Cpe = ${results.cfWindward}`,
        },
        {
          description: 'Leeward Cpe,10 (Zone E)',
          formula: 'Table 7.1 interpolation',
          result: `Cpe = ${results.cfLeeward}`,
        },
        {
          description: 'Internal Cpi',
          formula: formData.dominantOpening === 'Yes' ? '0.75×Cpe of opening face' : 'From μ ratio',
          result: `Cpi = ${results.cpi}`,
        },
      ],
    },
    {
      title: 'Net Pressures',
      steps: [
        {
          description: 'Windward net',
          formula: 'we = qp × (Cpe - Cpi)',
          substitution: `we = ${results.qpKpa} × (${results.cfWindward} - (${results.cpi}))`,
          result: `we = ${results.netWindward} kPa`,
        },
        {
          description: 'Leeward net',
          formula: 'we = qp × (Cpe - Cpi)',
          substitution: `we = ${results.qpKpa} × (${results.cfLeeward} - (${results.cpi}))`,
          result: `we = ${results.netLeeward} kPa`,
        },
        {
          description: 'Roof net (uplift)',
          formula: 'we = qp × (Cpe,min - Cpi,max)',
          result: `we = ${results.netRoofUp} kPa`,
        },
      ],
    },
  ];

  // Build warnings
  const reportWarnings: ReportWarning[] = warnings.map((w) => ({
    type: w.toLowerCase().includes('fail') ? 'error' : 'warning',
    message: w,
  }));

  if (parseFloat(formData.structureHeight) > 50) {
    reportWarnings.push({
      type: 'info',
      message: 'Tall structure - consider dynamic response and resonance',
    });
  }

  if (formData.orographyType !== 'Flat') {
    reportWarnings.push({
      type: 'info',
      message: 'Orography factor applied - verify hill parameters',
    });
  }

  if (formData.dominantOpening === 'Yes') {
    reportWarnings.push({
      type: 'warning',
      message: 'Dominant opening - internal pressure depends on opening position',
    });
  }

  // Build conclusion
  const conclusion: ReportConclusion = {
    summary: `Wind loads calculated for ${formData.structureType} to BS EN 1991-1-4.
    Basic velocity vb = ${results.vb}m/s.
    Peak velocity pressure qp(ze) = ${results.qpKpa}kPa at ze = ${results.ze}m.
    Net windward = ${results.netWindward}kPa, Net roof uplift = ${results.netRoofUp}kPa.
    Overall drag = ${results.dragForce}kN, Overturning = ${results.overturningMoment}kNm.`,
    status: overallStatus,
    recommendations: [
      `Apply qp = ${results.qpKpa} kPa to structural analysis`,
      `Windward wall: ${results.netWindward} kPa (pressure)`,
      `Leeward wall: ${results.netLeeward} kPa (suction)`,
      `Roof: ${results.netRoofUp} kPa (uplift) / ${results.netRoofDown} kPa (downward)`,
      `Check local pressure zones (corners/edges) with Cpe,1 values`,
    ],
  };

  return {
    meta,
    executiveSummary,
    inputs,
    designChecks,
    detailedCalculations,
    warnings: reportWarnings.length > 0 ? reportWarnings : undefined,
    conclusion,
  };
}
