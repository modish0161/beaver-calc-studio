import { motion } from 'framer-motion';
import React, { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiInfo,
  FiMapPin,
  FiMinimize2,
  FiSettings,
  FiShield,
  FiSliders,
  FiWind,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { ReportData } from '../../lib/pdf/types';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import Hoarding3D from '../../components/3d/scenes/Hoarding3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// HOARDING DATABASES
// ============================================================================

const WIND_ZONES = {
  london: { name: 'London & South East', Vb: 21.5, altitude: 30 },
  midlands: { name: 'Midlands / East Anglia', Vb: 22.5, altitude: 50 },
  south_west: { name: 'South West England', Vb: 23.0, altitude: 100 },
  wales: { name: 'Wales', Vb: 24.0, altitude: 150 },
  north_west: { name: 'North West England', Vb: 24.5, altitude: 80 },
  yorkshire: { name: 'Yorkshire & North East', Vb: 23.5, altitude: 60 },
  scotland_central: { name: 'Central Scotland', Vb: 25.0, altitude: 100 },
  scotland_north: { name: 'Scotland Highlands', Vb: 26.0, altitude: 200 },
  northern_ireland: { name: 'Northern Ireland', Vb: 24.0, altitude: 80 },
  custom: { name: 'Custom Location', Vb: 22.0, altitude: 50 },
};

const HOARDING_TYPES = {
  timber_solid: {
    name: 'Solid Timber Hoarding',
    Cf: 1.3,
    mass: 25,
    description: 'Plywood/OSB panels',
  },
  steel_solid: {
    name: 'Solid Steel Panel',
    Cf: 1.3,
    mass: 35,
    description: 'Galvanised steel sheets',
  },
  composite_solid: {
    name: 'Composite Panel',
    Cf: 1.3,
    mass: 20,
    description: 'Aluminium composite',
  },
  mesh_debris: {
    name: 'Mesh with Debris Net',
    Cf: 0.9,
    mass: 12,
    description: '50% porosity assumed',
  },
  heras_mesh: { name: 'Open Mesh (Heras)', Cf: 0.6, mass: 8, description: 'Wire mesh panels' },
  branded: {
    name: 'Branded Graphics Panel',
    Cf: 1.35,
    mass: 28,
    description: 'With printed graphics',
  },
};

const FOUNDATION_TYPES = {
  kentledge: {
    name: 'Kentledge Blocks',
    method: 'gravity',
    friction: 0.5,
    description: 'Concrete blocks on ground',
  },
  water_ballast: {
    name: 'Water-Filled Barriers',
    method: 'gravity',
    friction: 0.4,
    description: 'Plastic water barriers',
  },
  ground_socket: {
    name: 'Ground Sockets',
    method: 'embedded',
    embedDepth: 0.6,
    description: 'Steel sockets in ground',
  },
  concrete_base: {
    name: 'Concrete Base',
    method: 'embedded',
    embedDepth: 0.5,
    description: 'Cast in-situ base',
  },
  screw_anchor: {
    name: 'Screw Anchors',
    method: 'anchor',
    capacity: 10,
    description: 'Ground anchors',
  },
};

const TERRAIN_CATEGORIES = {
  '0': { name: 'Sea/Coastal (<1km)', z0: 0.003, zmin: 1, Cr_factor: 1.3 },
  I: { name: 'Lakes/Flat Open', z0: 0.01, zmin: 1, Cr_factor: 1.2 },
  II: { name: 'Open Country', z0: 0.05, zmin: 2, Cr_factor: 1.0 },
  III: { name: 'Suburban/Industrial', z0: 0.3, zmin: 5, Cr_factor: 0.85 },
  IV: { name: 'Urban/City Centre', z0: 1.0, zmin: 10, Cr_factor: 0.7 },
};

const PRESETS = {
  standard_2m: {
    name: 'Standard 2m Hoarding',
    height: '2.0',
    postSpacing: '2.4',
    hoardingType: 'timber_solid',
    foundationType: 'kentledge',
  },
  high_security: {
    name: 'High Security 2.4m',
    height: '2.4',
    postSpacing: '2.0',
    hoardingType: 'steel_solid',
    foundationType: 'ground_socket',
  },
  temporary_mesh: {
    name: 'Temporary Mesh',
    height: '2.0',
    postSpacing: '3.5',
    hoardingType: 'heras_mesh',
    foundationType: 'kentledge',
  },
  acoustic_barrier: {
    name: 'Acoustic Barrier 3m',
    height: '3.0',
    postSpacing: '2.0',
    hoardingType: 'composite_solid',
    foundationType: 'concrete_base',
  },
  scaffold_wrap: {
    name: 'Scaffold Wrap',
    height: '3.0',
    postSpacing: '2.4',
    hoardingType: 'mesh_debris',
    foundationType: 'kentledge',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Hoarding: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // Collapsible sections
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  const [form, setForm] = useState({
    // Geometry
    height: '2.4',
    postSpacing: '2.4',
    postSize: '100x100',

    // Type
    hoardingType: 'timber_solid' as keyof typeof HOARDING_TYPES,

    // Wind Location
    windZone: 'london' as keyof typeof WIND_ZONES,
    customWindSpeed: '22',
    altitude: '30',
    terrainCategory: 'III' as keyof typeof TERRAIN_CATEGORIES,
    distanceToSea: '50',
    orography: 'flat',

    // Foundation
    foundationType: 'kentledge' as keyof typeof FOUNDATION_TYPES,
    ballastWeight: '500',
    ballastLeverArm: '0.6',
    embedDepth: '0.6',

    // Safety Factors
    sfOverturning: '1.5',
    sfSliding: '1.2',
    dynamicFactor: '1.0',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'height', label: 'Height' },
  { key: 'postSpacing', label: 'Post Spacing' },
  { key: 'customWindSpeed', label: 'Custom Wind Speed' },
  { key: 'altitude', label: 'Altitude' },
  { key: 'distanceToSea', label: 'Distance To Sea' },
  { key: 'ballastWeight', label: 'Ballast Weight' },
  { key: 'ballastLeverArm', label: 'Ballast Lever Arm' },
  { key: 'embedDepth', label: 'Embed Depth' },
  { key: 'sfOverturning', label: 'Sf Overturning' },
  { key: 'sfSliding', label: 'Sf Sliding' },
  { key: 'dynamicFactor', label: 'Dynamic Factor' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'height', label: 'Hoarding Height', min: 1.5, max: 4.0, step: 0.1, unit: 'm' },
    { key: 'postSpacing', label: 'Post Spacing', min: 1.0, max: 4.0, step: 0.2, unit: 'm' },
    { key: 'customWindSpeed', label: 'Wind Speed', min: 15, max: 35, step: 0.5, unit: 'm/s' },
    { key: 'ballastWeight', label: 'Ballast Weight', min: 100, max: 1000, step: 50, unit: 'kg' },
  ];

  // Canvas visualization

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Auto-update wind speed when zone changes
    if (field === 'windZone' && value !== 'custom') {
      const zone = WIND_ZONES[value as keyof typeof WIND_ZONES];
      setForm((prev) => ({
        ...prev,
        customWindSpeed: zone.Vb.toString(),
        altitude: zone.altitude.toString(),
      }));
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        height: preset.height,
        postSpacing: preset.postSpacing,
        hoardingType: preset.hoardingType as keyof typeof HOARDING_TYPES,
        foundationType: preset.foundationType as keyof typeof FOUNDATION_TYPES,
      }));
    }
  };

  const runCalculation = () => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);

    setTimeout(() => {
      const H = parseFloat(form.height);
      const S = parseFloat(form.postSpacing);
      const Vb = parseFloat(form.customWindSpeed);
      const alt = parseFloat(form.altitude);
      const ballast = parseFloat(form.ballastWeight);
      const leverArm = parseFloat(form.ballastLeverArm) || 0.5;
      const SF_OT = parseFloat(form.sfOverturning);
      const SF_SL = parseFloat(form.sfSliding);
      const dynFactor = parseFloat(form.dynamicFactor);

      const hoarding = HOARDING_TYPES[form.hoardingType];
      const foundation = FOUNDATION_TYPES[form.foundationType];
      const terrain = TERRAIN_CATEGORIES[form.terrainCategory];

      const newWarnings: string[] = [];

      // Wind Calculation per BS EN 1991-1-4
      // Altitude correction
      const C_alt = 1 + 0.001 * alt;

      // Basic wind velocity
      const Vb_corrected = Vb * C_alt;

      // Terrain roughness factor (simplified)
      const Cr = terrain.Cr_factor * Math.pow(Math.max(H, terrain.zmin) / 10, 0.22);

      // Turbulence intensity (simplified)
      const Iv = 1.0 / (1.0 + 1.5 * terrain.z0);

      // Peak velocity pressure
      const rho = 1.225; // kg/m³
      const qb = 0.5 * rho * Math.pow(Vb_corrected, 2); // N/m²
      const qp = qb * (1 + 7 * Iv) * Math.pow(Cr, 2); // N/m² (peak)
      const windPressure = qp / 1000; // kPa

      // Force coefficient
      const Cf = hoarding.Cf;

      // Wind force per post
      const areaPerPost = H * S;
      const forcePerPost = windPressure * Cf * areaPerPost * dynFactor; // kN

      // Centre of pressure (wind acts at H/2 for uniform distribution)
      const zcp = H / 2;

      // Overturning moment about base
      const M_overturn = forcePerPost * zcp; // kNm

      // Self-weight of hoarding per post
      const selfWeight = ((hoarding.mass * areaPerPost) / 1000) * 9.81; // kN (approx)

      // Restoring moment
      let M_restoring = 0;
      let slidingResistance = 0;
      let slidingRatio = 0;

      if (foundation.method === 'gravity') {
        // Kentledge/ballast system
        const W_ballast = (ballast * 9.81) / 1000; // kN
        M_restoring = W_ballast * leverArm + selfWeight * 0.1; // kNm

        // Sliding check
        slidingResistance =
          (W_ballast + selfWeight) * ('friction' in foundation ? foundation.friction || 0.5 : 0.5);
        slidingRatio = forcePerPost > 0 ? slidingResistance / forcePerPost : 999;
      } else if (foundation.method === 'embedded') {
        // Embedded post - passive resistance
        const embedDepth = ('embedDepth' in foundation ? foundation.embedDepth : undefined) || 0.6;
        const Kp = 3.0; // Passive earth pressure coefficient (approx for φ=30°)
        const gamma_soil = 18; // kN/m³
        const passiveForce = 0.5 * Kp * gamma_soil * Math.pow(embedDepth, 2) * 0.1; // kN (per 100mm post)
        M_restoring = (passiveForce * embedDepth) / 3 + selfWeight * 0.1;
        slidingRatio = 999; // N/A for embedded
      } else if (foundation.method === 'anchor') {
        // Anchor system
        const anchorCapacity = ('capacity' in foundation ? foundation.capacity : undefined) || 10; // kN
        M_restoring = anchorCapacity * leverArm;
        slidingRatio = 999; // Handled by anchors
      }

      // Stability ratio
      const stabilityRatio = M_overturn > 0 ? M_restoring / M_overturn : 999;
      const requiredBallast = ((M_overturn * SF_OT) / leverArm / 9.81) * 1000; // kg

      // Status checks
      const statusOT = stabilityRatio >= SF_OT ? 'PASS' : 'FAIL';
      const statusSliding =
        foundation.method === 'gravity' ? (slidingRatio >= SF_SL ? 'PASS' : 'FAIL') : 'N/A';

      // Warnings
      if (stabilityRatio < SF_OT) {
        newWarnings.push(
          `⛔ Overturning check FAILS - increase ballast to min ${requiredBallast.toFixed(0)} kg`,
        );
      } else if (stabilityRatio < SF_OT * 1.2) {
        newWarnings.push('⚠️ Stability ratio close to limit - consider additional ballast');
      }

      if (foundation.method === 'gravity' && slidingRatio < SF_SL) {
        newWarnings.push('⛔ Sliding check FAILS - increase ballast or improve friction');
      }

      if (H > 3.0) {
        newWarnings.push('⚠️ Hoarding height >3m - consider structural engineer review');
      }

      if (Vb > 25) {
        newWarnings.push('⚠️ High wind speed zone - verify local wind data');
      }

      // Rating
      let rating = 'CRITICAL';
      let ratingColor = '#ef4444';
      if (statusOT === 'PASS' && (statusSliding === 'PASS' || statusSliding === 'N/A')) {
        if (stabilityRatio > 2.5) {
          rating = 'EXCELLENT';
          ratingColor = '#22c55e';
        } else if (stabilityRatio > 2.0) {
          rating = 'GOOD';
          ratingColor = '#10b981';
        } else if (stabilityRatio > 1.5) {
          rating = 'ADEQUATE';
          ratingColor = '#f59e0b';
        } else {
          rating = 'MARGINAL';
          ratingColor = '#f97316';
        }
      }

      setResults({
        inputs: {
          dims: `${H}m high × ${S}m spacing`,
          windSpeed: `${Vb} m/s (${form.windZone})`,
          terrain: terrain.name,
          hoardingType: hoarding.name,
          foundationType: foundation.name,
        },
        wind: {
          basicPressure: (qb / 1000).toFixed(3),
          peakPressure: windPressure.toFixed(3),
          Cf: Cf.toFixed(2),
          forcePerPost: forcePerPost.toFixed(2),
          areaPerPost: areaPerPost.toFixed(2),
        },
        stability: {
          overturning: M_overturn.toFixed(2),
          restoring: M_restoring.toFixed(2),
          ratio: stabilityRatio.toFixed(2),
          statusOT,
          requiredBallast: requiredBallast.toFixed(0),
        },
        sliding: {
          resistance: slidingResistance.toFixed(2),
          ratio: slidingRatio > 900 ? 'N/A' : slidingRatio.toFixed(2),
          statusSliding,
        },
        overallStatus:
          statusOT === 'PASS' && (statusSliding === 'PASS' || statusSliding === 'N/A')
            ? 'PASS'
            : 'FAIL',
        rating,
        ratingColor,
      });

      setWarnings(newWarnings);
      setIsCalculating(false);
      setActiveTab('results');
    }, 1200);
  };

  const buildReportData = (): ReportData => {
    const hoarding = HOARDING_TYPES[form.hoardingType];
    const foundation = FOUNDATION_TYPES[form.foundationType];
    const terrain = TERRAIN_CATEGORIES[form.terrainCategory];

    return {
      meta: {
        title: 'Hoarding Stability Design',
        projectName: 'Site Hoarding Assessment',
        clientName: 'Client',
        documentRef: `HRD-${Date.now().toString(36).toUpperCase()}`,
        version: 'Rev A',
        date: new Date().toLocaleDateString('en-GB'),
        preparedBy: 'BeaverCalc Studio',
        calculatorName: 'Hoarding Design',
        designCodes: ['BS EN 1991-1-4:2005', 'BS 5975:2019'],
      },
      executiveSummary: {
        description: `Site hoarding stability assessment for ${form.height}m high ${hoarding.name} with ${foundation.name} foundation. Wind loading per BS EN 1991-1-4.`,
        keyResults: [
          { label: 'Hoarding Height', value: `${form.height} m` },
          { label: 'Wind Force/Post', value: `${results?.wind.forcePerPost || '-'} kN` },
          {
            label: 'Stability Ratio',
            value: results?.stability.ratio || '-',
            highlight: parseFloat(results?.stability.ratio || '0') < 1.5,
          },
          { label: 'Required Ballast', value: `${results?.stability.requiredBallast || '-'} kg` },
        ],
        overallStatus: results?.overallStatus || 'PENDING',
        governingCheck: 'Overturning Stability',
        utilisationSummary: `Stability FOS: ${results?.stability.ratio || '-'}`,
      },
      inputs: {
        sections: [
          {
            title: 'Hoarding Geometry',
            parameters: [
              { name: 'Hoarding Height', value: form.height, unit: 'm' },
              { name: 'Post Spacing', value: form.postSpacing, unit: 'm' },
              { name: 'Hoarding Type', value: hoarding.name },
              { name: 'Force Coefficient Cf', value: hoarding.Cf.toString() },
            ],
          },
          {
            title: 'Wind Parameters',
            parameters: [
              { name: 'Wind Zone', value: WIND_ZONES[form.windZone].name },
              { name: 'Basic Wind Speed', value: form.customWindSpeed, unit: 'm/s' },
              { name: 'Altitude', value: form.altitude, unit: 'm' },
              { name: 'Terrain Category', value: terrain.name },
            ],
          },
          {
            title: 'Foundation',
            parameters: [
              { name: 'Foundation Type', value: foundation.name },
              { name: 'Ballast Weight', value: form.ballastWeight, unit: 'kg' },
              { name: 'Lever Arm', value: form.ballastLeverArm, unit: 'm' },
            ],
          },
        ],
      },
      designChecks: [
        {
          title: 'Wind Load Analysis',
          description: 'BS EN 1991-1-4',
          checks: [
            {
              name: 'Peak Velocity Pressure',
              formula: 'qp = qb(1+7Iv)Cr²',
              calculated: `${results?.wind.peakPressure || '-'} kPa`,
              limit: '-',
              utilisation: 0,
              status: 'PASS',
            },
            {
              name: 'Wind Force per Post',
              formula: 'F = qp × Cf × A',
              calculated: `${results?.wind.forcePerPost || '-'} kN`,
              limit: '-',
              utilisation: 0,
              status: 'PASS',
            },
          ],
        },
        {
          title: 'Overturning Stability',
          description: 'Factor of Safety Check',
          checks: [
            {
              name: 'Overturning Moment',
              formula: 'Mo = F × H/2',
              calculated: `${results?.stability.overturning || '-'} kNm`,
              limit: '-',
              utilisation: 0,
              status: 'PASS',
            },
            {
              name: 'Restoring Moment',
              formula: 'Mr = W × lever',
              calculated: `${results?.stability.restoring || '-'} kNm`,
              limit: `FOS ≥ ${form.sfOverturning}`,
              utilisation:
                parseFloat(results?.stability.ratio || '0') > 0
                  ? 100 / parseFloat(results?.stability.ratio)
                  : 0,
              status: results?.stability.statusOT || 'PENDING',
            },
          ],
        },
        {
          title: 'Sliding Check',
          description: 'Friction Resistance',
          checks: [
            {
              name: 'Sliding Resistance',
              formula: 'Fr = μ × W',
              calculated: `${results?.sliding.resistance || '-'} kN`,
              limit: `FOS ≥ ${form.sfSliding}`,
              utilisation: 0,
              status: results?.sliding.statusSliding || 'N/A',
            },
          ],
        },
      ],
      conclusion: {
        summary:
          results?.overallStatus === 'PASS'
            ? 'Hoarding stability is ADEQUATE for the specified wind loading.'
            : 'Hoarding stability is INADEQUATE - increase ballast or change foundation type.',
        recommendations: [
          `Minimum ballast per post: ${results?.stability.requiredBallast || '-'} kg`,
          'Ensure ballast blocks are secured to prevent displacement',
          'Inspect after high wind events (>50 km/h sustained)',
          'Check post verticality monthly',
        ],
        limitations: [
          'Simplified wind calculation - full BS EN 1991-1-4 analysis may be required for complex sites',
          'Ground friction assumed - verify site conditions',
          'Does not account for impact loads or vandalism',
        ],
      },
      warnings: warnings.map((w) => ({
        severity: w.startsWith('⛔') ? ('critical' as const) : ('warning' as const),
        message: w.replace(/^[⛔⚠️]\s*/, ''),
      })),
    };
  };

  const exportPDF = () => {
    if (!results) return;
    const windZone = WIND_ZONES[form.windZone as keyof typeof WIND_ZONES];
    const hoardType = HOARDING_TYPES[form.hoardingType as keyof typeof HOARDING_TYPES];
    const foundType = FOUNDATION_TYPES[form.foundationType as keyof typeof FOUNDATION_TYPES];
    const terrain = TERRAIN_CATEGORIES[form.terrainCategory as keyof typeof TERRAIN_CATEGORIES];
    const stabilityUtil =
      parseFloat(results.stability.ratio) > 0
        ? (100 / parseFloat(results.stability.ratio)) * parseFloat(form.sfOverturning)
        : 0;
    generatePremiumPDF({
      title: 'Hoarding Stability Design',
      subtitle: 'BS EN 1991-1-4 Wind Loading',
      projectInfo: [
        { label: 'Project', value: 'Hoarding Stability Design' },
        { label: 'Standard', value: 'BS EN 1991-1-4 / BS 5975' },
        { label: 'Reference', value: 'HOA001' },
      ],
      inputs: [
        { label: 'Hoarding Height', value: form.height, unit: 'm' },
        { label: 'Post Spacing', value: form.postSpacing, unit: 'm' },
        { label: 'Hoarding Type', value: hoardType?.name || form.hoardingType },
        { label: 'Force Coefficient (Cf)', value: String(hoardType?.Cf || '-') },
        { label: 'Wind Zone', value: windZone?.name || form.windZone },
        {
          label: 'Basic Wind Speed',
          value: String(windZone?.Vb || form.customWindSpeed),
          unit: 'm/s',
        },
        { label: 'Terrain Category', value: terrain?.name || form.terrainCategory },
        { label: 'Foundation Type', value: foundType?.name || form.foundationType },
        { label: 'Ballast Weight', value: form.ballastWeight, unit: 'kg' },
        { label: 'Altitude', value: form.altitude, unit: 'm' },
      ],
      sections: [
        {
          title: 'Wind & Stability Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Peak Wind Pressure', results.wind.peakPressure, 'kPa'],
            ['Wind Force per Post', results.wind.forcePerPost, 'kN'],
            ['Overturning Moment', results.stability.overturning, 'kNm'],
            ['Restoring Moment', results.stability.restoring, 'kNm'],
            ['Stability Ratio', results.stability.ratio, '-'],
            ['Required Ballast', results.stability.requiredBallast, 'kg'],
            ['Sliding Resistance', results.sliding.resistance, 'kN'],
            ['SF Overturning', form.sfOverturning, '-'],
            ['SF Sliding', form.sfSliding, '-'],
            ['Dynamic Factor', form.dynamicFactor, '-'],
          ],
        },
      ],
      checks: [
        {
          name: 'Overturning Stability',
          capacity: `FOS ${results.stability.ratio}`,
          utilisation: String(stabilityUtil.toFixed(1)) + '%',
          status: results.stability.statusOT as 'PASS' | 'FAIL',
        },
        {
          name: 'Sliding Resistance',
          capacity: `${results.sliding.resistance} kN`,
          utilisation: String(results.sliding.statusSliding === 'PASS' ? '< 100%' : '> 100%'),
          status: (results.sliding.statusSliding === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overall Status',
          capacity: '-',
          utilisation: String(stabilityUtil.toFixed(1)) + '%',
          status: results.overallStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Ballast Specification',
          suggestion: 'Use minimum 2400 kg/m³ concrete kentledge blocks with certified weights',
        },
        {
          check: 'Wind Monitoring',
          suggestion:
            'Install anemometer for sites with Vb > 24 m/s; cease work above 17 m/s gusts',
        },
        {
          check: 'Inspection Regime',
          suggestion:
            'Inspect hoarding fixings weekly and after any storm event exceeding design speed',
        },
        {
          check: 'Drainage',
          suggestion:
            'Ensure base drainage prevents water pooling that could undermine foundations',
        },
      ],
      warnings: warnings,
      footerNote: 'Beaver Bridges Ltd — Hoarding Stability Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const windZone = WIND_ZONES[form.windZone as keyof typeof WIND_ZONES];
    const hoardType = HOARDING_TYPES[form.hoardingType as keyof typeof HOARDING_TYPES];
    const foundType = FOUNDATION_TYPES[form.foundationType as keyof typeof FOUNDATION_TYPES];
    const terrain = TERRAIN_CATEGORIES[form.terrainCategory as keyof typeof TERRAIN_CATEGORIES];
    const stabilityUtil =
      parseFloat(results.stability.ratio) > 0
        ? (100 / parseFloat(results.stability.ratio)) * parseFloat(form.sfOverturning)
        : 0;
    generateDOCX({
      title: 'Hoarding Stability Design',
      subtitle: 'BS EN 1991-1-4 Wind Loading',
      projectInfo: [
        { label: 'Project', value: 'Hoarding Stability Design' },
        { label: 'Standard', value: 'BS EN 1991-1-4 / BS 5975' },
        { label: 'Reference', value: 'HOA001' },
      ],
      inputs: [
        { label: 'Hoarding Height', value: form.height, unit: 'm' },
        { label: 'Post Spacing', value: form.postSpacing, unit: 'm' },
        { label: 'Hoarding Type', value: hoardType?.name || form.hoardingType },
        { label: 'Force Coefficient (Cf)', value: String(hoardType?.Cf || '-') },
        { label: 'Wind Zone', value: windZone?.name || form.windZone },
        {
          label: 'Basic Wind Speed',
          value: String(windZone?.Vb || form.customWindSpeed),
          unit: 'm/s',
        },
        { label: 'Terrain Category', value: terrain?.name || form.terrainCategory },
        { label: 'Foundation Type', value: foundType?.name || form.foundationType },
        { label: 'Ballast Weight', value: form.ballastWeight, unit: 'kg' },
        { label: 'Altitude', value: form.altitude, unit: 'm' },
      ],
      sections: [
        {
          title: 'Wind & Stability Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Peak Wind Pressure', results.wind.peakPressure, 'kPa'],
            ['Wind Force per Post', results.wind.forcePerPost, 'kN'],
            ['Overturning Moment', results.stability.overturning, 'kNm'],
            ['Restoring Moment', results.stability.restoring, 'kNm'],
            ['Stability Ratio', results.stability.ratio, '-'],
            ['Required Ballast', results.stability.requiredBallast, 'kg'],
            ['Sliding Resistance', results.sliding.resistance, 'kN'],
            ['SF Overturning', form.sfOverturning, '-'],
            ['SF Sliding', form.sfSliding, '-'],
            ['Dynamic Factor', form.dynamicFactor, '-'],
          ],
        },
      ],
      checks: [
        {
          name: 'Overturning Stability',
          capacity: `FOS ${results.stability.ratio}`,
          utilisation: String(stabilityUtil.toFixed(1)) + '%',
          status: results.stability.statusOT as 'PASS' | 'FAIL',
        },
        {
          name: 'Sliding Resistance',
          capacity: `${results.sliding.resistance} kN`,
          utilisation: String(results.sliding.statusSliding === 'PASS' ? '< 100%' : '> 100%'),
          status: (results.sliding.statusSliding === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overall Status',
          capacity: '-',
          utilisation: String(stabilityUtil.toFixed(1)) + '%',
          status: results.overallStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Ballast Specification',
          suggestion: 'Use minimum 2400 kg/m³ concrete kentledge blocks with certified weights',
        },
        {
          check: 'Wind Monitoring',
          suggestion:
            'Install anemometer for sites with Vb > 24 m/s; cease work above 17 m/s gusts',
        },
        {
          check: 'Inspection Regime',
          suggestion:
            'Inspect hoarding fixings weekly and after any storm event exceeding design speed',
        },
        {
          check: 'Drainage',
          suggestion:
            'Ensure base drainage prevents water pooling that could undermine foundations',
        },
      ],
      warnings: warnings,
      footerNote: 'Beaver Bridges Ltd — Hoarding Stability Design',
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-2xl bg-gray-800/40 backdrop-blur-md border border-gray-700/50"
            whileHover={{ scale: 1.05 }}
          >
            <FiShield className="text-neon-cyan" size={24} />
            <span className="text-white font-semibold">BS EN 1991-1-4 | Wind Loading</span>
          </motion.div>
          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
            Hoarding Stability Design
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Calculate wind loads and stability for site hoardings. Checks overturning and sliding
            for kentledge, embedded, or anchored solutions.
          </p>
        </motion.div>

        {/* Presets Bar */}
        <Card
          variant="glass"
          className="mb-6 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl"
        >
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <FiSettings className="text-neon-cyan" />
                <select
                  title="s"
                  value=""
                  onChange={(e) => e.target.value && applyPreset(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                >
                  <option value="">⚡ Quick Presets</option>
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <option key={key} value={key}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {results && (
                <Button variant="ghost" size="sm" onClick={exportPDF} className="ml-auto">
                  <FiDownload className="mr-1" /> Export PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          {['input', 'results'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as 'input' | 'results')}
              disabled={tab === 'results' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-purple'
                  : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Design Parameters' : '📊 Stability Results'}
            </Button>
          ))}
        </div>

        {activeTab === 'input' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid lg:grid-cols-2 gap-8"
          >
            {/* Left - Inputs */}
            <div className="space-y-6">
              {/* Geometry */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiShield className="w-6 h-6 text-neon-cyan" />
                    </div>{' '}
                    Hoarding Geometry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Hoarding Height (m)"
                      value={form.height}
                      onChange={(v) => updateForm('height', v)}
                    />
                    <InputField
                      label="Post Spacing (m)"
                      value={form.postSpacing}
                      onChange={(v) => updateForm('postSpacing', v)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-2">
                      Hoarding Type
                    </label>
                    <select
                      title="Hoarding Type"
                      value={form.hoardingType}
                      onChange={(e) => updateForm('hoardingType', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                    >
                      {Object.entries(HOARDING_TYPES).map(([key, h]) => (
                        <option key={key} value={key}>
                          {h.name} (Cf={h.Cf})
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Wind Location */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiWind className="w-6 h-6 text-neon-cyan" />
                    </div>{' '}
                    Wind Loading
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-200 block mb-2">
                        Wind Zone
                      </label>
                      <select
                        title="Wind Zone"
                        value={form.windZone}
                        onChange={(e) => updateForm('windZone', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.entries(WIND_ZONES).map(([key, z]) => (
                          <option key={key} value={key}>
                            {z.name} ({z.Vb} m/s)
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField
                      label="Wind Speed (m/s)"
                      value={form.customWindSpeed}
                      onChange={(v) => updateForm('customWindSpeed', v)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-2">
                      Terrain Category
                    </label>
                    <select
                      title="Terrain Category"
                      value={form.terrainCategory}
                      onChange={(e) => updateForm('terrainCategory', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                    >
                      {Object.entries(TERRAIN_CATEGORIES).map(([key, t]) => (
                        <option key={key} value={key}>
                          Cat {key}: {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Foundation */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiMapPin className="w-6 h-6 text-neon-cyan" />
                    </div>{' '}
                    Foundation System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-2">
                      Foundation Type
                    </label>
                    <select
                      title="Foundation Type"
                      value={form.foundationType}
                      onChange={(e) => updateForm('foundationType', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                    >
                      {Object.entries(FOUNDATION_TYPES).map(([key, f]) => (
                        <option key={key} value={key}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.foundationType === 'kentledge' ||
                  form.foundationType === 'water_ballast' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Ballast Weight (kg/post)"
                        value={form.ballastWeight}
                        onChange={(v) => updateForm('ballastWeight', v)}
                      />
                      <InputField
                        label="Lever Arm (m)"
                        value={form.ballastLeverArm}
                        onChange={(v) => updateForm('ballastLeverArm', v)}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Advanced Settings */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <div className="flex justify-between items-center w-full">
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiSettings className="w-6 h-6 text-neon-cyan" />
                      </div>{' '}
                      Advanced Settings
                    </CardTitle>
                    <motion.div animate={{ rotate: showAdvanced ? 180 : 0 }}>
                      <FiChevronDown className="text-gray-400" />
                    </motion.div>
                  </div>
                </CardHeader>

                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-3 gap-4">
                        <InputField
                          label="SF Overturn"
                          value={form.sfOverturning}
                          onChange={(v) => updateForm('sfOverturning', v)}
                        />
                        <InputField
                          label="SF Sliding"
                          value={form.sfSliding}
                          onChange={(v) => updateForm('sfSliding', v)}
                        />
                        <InputField
                          label="Dynamic Factor"
                          value={form.dynamicFactor}
                          onChange={(v) => updateForm('dynamicFactor', v)}
                        />
                      </div>
                      <InputField
                        label="Altitude (m)"
                        value={form.altitude}
                        onChange={(v) => updateForm('altitude', v)}
                      />
                    </CardContent>
                  </motion.div>
                )}
              </Card>
            </div>

            {/* Right - Visualization */}
            <div className="space-y-6">
              {/* Fullscreen Preview Overlay */}
              {previewMaximized && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                >
                  {/* 3D Scene */}
                  <div className="flex-1 relative">
                    <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                      <Hoarding3D />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                      aria-label="Minimize preview"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      HOARDING — REAL-TIME PREVIEW
                    </div>
                  </div>

                  {/* Right sidebar */}
                  <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                    <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                      <FiSliders size={14} /> Live Parameters
                    </h3>
                    {[
                      {
                        label: 'Height',
                        field: 'height',
                        min: 1.2,
                        max: 4.0,
                        step: 0.1,
                        unit: 'm',
                      },
                      {
                        label: 'Post Spacing',
                        field: 'postSpacing',
                        min: 1.0,
                        max: 4.0,
                        step: 0.1,
                        unit: 'm',
                      },
                      {
                        label: 'Wind Speed',
                        field: 'customWindSpeed',
                        min: 15,
                        max: 35,
                        step: 1,
                        unit: 'm/s',
                      },
                      {
                        label: 'Ballast Weight',
                        field: 'ballastWeight',
                        min: 100,
                        max: 2000,
                        step: 50,
                        unit: 'kg',
                      },
                    ].map((s) => (
                      <div key={s.field} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-gray-400">{s.label}</span>
                          <span className="text-white">
                            {form[s.field as keyof typeof form]} {s.unit}
                          </span>
                        </div>
                        <input
                          title={s.label}
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={form[s.field as keyof typeof form] as string}
                          onChange={(e) => updateForm(s.field, e.target.value)}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                          aria-label={s.label}
                        />
                      </div>
                    ))}

                    <div className="border-t border-gray-700 pt-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                        <FiActivity size={14} /> Live Readout
                      </h3>
                      {[
                        { label: 'Hoarding Type', value: form.hoardingType },
                        { label: 'Foundation', value: form.foundationType },
                        { label: 'Terrain', value: form.terrainCategory },
                        { label: 'SF Overturning', value: form.sfOverturning },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                        >
                          <span className="text-gray-500">{stat.label}</span>
                          <span className="text-white font-medium">{stat.value}</span>
                        </div>
                      ))}

                      {results && (
                        <div className="mt-3 space-y-1">
                          <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                            Last Analysis
                          </div>
                          {[
                            {
                              label: 'Stability FOS',
                              util: results.stability?.ratio,
                              status: results.stability?.statusOT,
                            },
                            {
                              label: 'Sliding FOS',
                              util: results.sliding?.ratio,
                              status: results.sliding?.statusSliding,
                            },
                          ].map((check) => (
                            <div key={check.label} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-500">{check.label}</span>
                              <span
                                className={cn(
                                  'font-bold',
                                  check.status === 'FAIL' ? 'text-red-500' : 'text-emerald-400',
                                )}
                              >
                                {check.util}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors"
                    >
                      Close Fullscreen
                    </button>
                  </div>
                </motion.div>
              )}

              <WhatIfPreview
                title="Hoarding — 3D Preview"
                sliders={whatIfSliders}
                form={form}
                updateForm={updateForm}
                status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                onMaximize={() => setPreviewMaximized(true)}
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                    <Hoarding3D />
                  </Interactive3DDiagram>
                )}
              />

              {/* Quick Info */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <FiInfo className="text-neon-cyan mt-1 flex-shrink-0" />
                    <div className="text-sm text-gray-300">
                      <p className="font-semibold text-white mb-2">Design Notes:</p>
                      <ul className="space-y-1 text-xs text-white">
                        <li>• Solid panels: Cf = 1.3 (full wind load)</li>
                        <li>• Mesh panels: Cf = 0.6-0.9 (reduced load)</li>
                        <li>• Standard safety factor: 1.5 for overturning</li>
                        <li>• Ballast friction μ ≈ 0.5 for concrete on soil</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={runCalculation}
                disabled={isCalculating}
                variant="neon"
                className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
              >
                {isCalculating ? (
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    CALCULATING...
                  </div>
                ) : (
                  <span className="flex items-center gap-3">⚡ RUN FULL ANALYSIS</span>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          // Results Tab
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-6"
          >
            {results && (
              <>
                {/* Status Banner */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-6 rounded-2xl border border-gray-700/30 border-l-4 flex items-center justify-between shadow-lg',
                    results.overallStatus === 'PASS'
                      ? 'bg-green-500/10 border-l-green-400 shadow-green-500/10'
                      : 'bg-red-500/10 border-l-red-400 shadow-red-500/10',
                  )}
                >
                  <div className="flex items-center gap-4">
                    {results.overallStatus === 'PASS' ? (
                      <FiCheck className="text-green-400" size={48} />
                    ) : (
                      <FiAlertTriangle className="text-red-400" size={48} />
                    )}
                    <div>
                      <h2 className="text-3xl font-black text-white">{results.overallStatus}</h2>
                      <p className="text-gray-400">Stability Ratio: {results.stability.ratio}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Rating</div>
                    <div className="text-2xl font-bold" style={{ color: results.ratingColor }}>
                      {results.rating}
                    </div>
                  </div>
                </motion.div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <Card
                    variant="glass"
                    className="border border-gray-700/30 border-l-4 border-l-yellow-400 shadow-2xl"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <FiAlertTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{w}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Results Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  <ResultCard
                    title="Wind Force"
                    value={`${results.wind.forcePerPost} kN`}
                    subtitle="Per post"
                    color="blue"
                  />
                  <ResultCard
                    title="Overturning Moment"
                    value={`${results.stability.overturning} kNm`}
                    subtitle="About base"
                    color="orange"
                  />
                  <ResultCard
                    title="Restoring Moment"
                    value={`${results.stability.restoring} kNm`}
                    subtitle="From ballast"
                    color="green"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white">
                        Overturning Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Stability Ratio</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.stability.statusOT === 'PASS'
                                ? 'text-green-400'
                                : 'text-red-400',
                            )}
                          >
                            {results.stability.ratio} ≥ {form.sfOverturning}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, (100 / parseFloat(results.stability.ratio)) * parseFloat(form.sfOverturning))}%`,
                            }}
                            className={cn(
                              'h-full rounded-full',
                              results.stability.statusOT === 'PASS' ? 'bg-green-500' : 'bg-red-500',
                            )}
                          />
                        </div>
                        <div className="text-sm text-gray-400">
                          Required ballast for FOS {form.sfOverturning}:{' '}
                          <span className="text-cyan-400 font-mono">
                            {results.stability.requiredBallast} kg
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white">Sliding Check</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Sliding Resistance</span>
                          <span className="text-white">{results.sliding.resistance} kN</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.sliding.statusSliding === 'PASS'
                                ? 'text-green-400'
                                : results.sliding.statusSliding === 'FAIL'
                                  ? 'text-red-400'
                                  : 'text-gray-400',
                            )}
                          >
                            {results.sliding.statusSliding}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiCheck className="w-6 h-6 text-neon-cyan" />
                      </div>
                      Design Recommendations
                    </h3>
                    <div className="space-y-3">
                      {[
                        'Ensure ballast blocks are secured to prevent displacement during high winds',
                        'Install wind-speed monitoring for exposed sites exceeding 24 m/s basic speed',
                        'Provide 150mm toe-board at base to prevent debris migration under hoarding',
                        'Schedule weekly inspections of fixings, foundations, and structural connections',
                      ].map((rec, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <FiCheck className="text-neon-cyan mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Export Button */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={exportPDF}
                    variant="neon"
                    className="w-full py-6 text-xl font-black bg-gradient-to-r from-neon-cyan to-neon-purple"
                  >
                    <FiDownload className="mr-2" size={24} /> Export PDF Report
                  </Button>
                  <Button
                    onClick={exportDOCX}
                    variant="neon"
                    className="w-full py-6 text-xl font-black bg-gradient-to-r from-neon-cyan to-neon-purple"
                  >
                    <FiDownload className="mr-2" size={24} /> DOCX
                  </Button>
                  <SaveRunButton
                    calculatorKey="hoarding"
                    inputs={form as unknown as Record<string, string | number>}
                    results={results}
                    status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  />
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  field?: string;
}> = ({ label, value, onChange, unit, field }) => (
  <div>
    <ExplainableLabel
      label={label}
      field={field || label.toLowerCase().replace(/\s+/g, '_')}
      className="text-sm font-semibold text-gray-200 block mb-2"
    />
    <div className="relative">
      <input
        title="{label}"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step="0.1"
        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 pr-12"
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          {unit}
        </span>
      )}
    </div>
  </div>
);

const ResultCard: React.FC<{ title: string; value: string; subtitle: string; color: string }> = ({
  title,
  value,
  subtitle,
  color,
}) => {
  const borderColors: Record<string, string> = {
    blue: 'border-l-blue-400',
    green: 'border-l-green-400',
    orange: 'border-l-orange-400',
    red: 'border-l-red-400',
    purple: 'border-l-purple-400',
    cyan: 'border-l-cyan-400',
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
  };

  return (
    <Card
      variant="glass"
      className={cn('border border-gray-700/30 border-l-4 shadow-2xl', borderColors[color])}
    >
      <CardContent className="p-6 text-center">
        <div className="text-gray-400 text-sm mb-2">{title}</div>
        <div className={cn('text-3xl font-black', textColors[color])}>{value}</div>
        <div className="text-gray-500 text-xs mt-1">{subtitle}</div>
      </CardContent>
    </Card>
  );
};

export default Hoarding;
