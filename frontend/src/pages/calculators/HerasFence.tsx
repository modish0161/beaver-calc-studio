import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiGrid,
  FiInfo,
  FiMinimize2,
  FiSettings,
  FiShield,
  FiSliders,
  FiWind,
  FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { ReportData } from '../../lib/pdf/types';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import HerasFence3D from '../../components/3d/scenes/HerasFence3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// HERAS FENCE DATABASES
// ============================================================================

const FENCE_TYPES = {
  standard_2m: {
    name: 'Standard Heras (3.5m × 2m)',
    height: 2.0,
    width: 3.5,
    weight: 17,
    Cd: 1.2,
    solidity: 0.0,
    mesh: '100x300mm',
  },
  heavy_2m: {
    name: 'Heavy Duty (3.5m × 2m)',
    height: 2.0,
    width: 3.5,
    weight: 22,
    Cd: 1.2,
    solidity: 0.0,
    mesh: '75x200mm',
  },
  anticlimb: {
    name: 'Anti-Climb (3.5m × 2.5m)',
    height: 2.5,
    width: 3.5,
    weight: 28,
    Cd: 1.2,
    solidity: 0.15,
    mesh: '76x12mm',
  },
  round_top: {
    name: 'Round Top (3.5m × 2m)',
    height: 2.0,
    width: 3.5,
    weight: 19,
    Cd: 1.2,
    solidity: 0.0,
    mesh: '100x300mm',
  },
  solid_hoarding: {
    name: 'Solid Hoarding (2.4m × 2.1m)',
    height: 2.1,
    width: 2.4,
    weight: 35,
    Cd: 1.3,
    solidity: 1.0,
    mesh: 'N/A',
  },
  timber_hoarding: {
    name: 'Timber Hoarding (2.4m × 2.4m)',
    height: 2.4,
    width: 2.4,
    weight: 45,
    Cd: 1.3,
    solidity: 1.0,
    mesh: 'N/A',
  },
  mesh_debris: {
    name: 'Mesh + Debris Net',
    height: 2.0,
    width: 3.5,
    weight: 20,
    Cd: 0.9,
    solidity: 0.5,
    mesh: 'Net attached',
  },
};

const BALLAST_TYPES = {
  concrete_25: {
    name: 'Concrete Block (25kg)',
    weight: 25,
    width: 0.45,
    height: 0.2,
    footprint: 0.2,
  },
  concrete_40: {
    name: 'Concrete Block (40kg)',
    weight: 40,
    width: 0.5,
    height: 0.25,
    footprint: 0.25,
  },
  kentledge_250: {
    name: 'Kentledge (250kg)',
    weight: 250,
    width: 0.6,
    height: 0.3,
    footprint: 0.36,
  },
  kentledge_500: {
    name: 'Kentledge (500kg)',
    weight: 500,
    width: 0.8,
    height: 0.4,
    footprint: 0.64,
  },
  water_filled: {
    name: 'Water-Filled Barrier',
    weight: 450,
    width: 0.6,
    height: 0.5,
    footprint: 0.36,
  },
  sandbags: { name: 'Sandbags (4×25kg)', weight: 100, width: 0.5, height: 0.2, footprint: 0.25 },
  rubber_foot: { name: 'Rubber Stabiliser', weight: 30, width: 0.5, height: 0.15, footprint: 0.25 },
};

const EXPOSURE_CATEGORIES = {
  sheltered: { name: 'Sheltered', factor: 0.7, description: 'Surrounded by buildings/trees' },
  normal: { name: 'Normal', factor: 1.0, description: 'Typical suburban site' },
  exposed: { name: 'Exposed', factor: 1.2, description: 'Open country, hilltop' },
  very_exposed: { name: 'Very Exposed', factor: 1.4, description: 'Coastal, isolated hilltop' },
};

const GROUND_CONDITIONS = {
  concrete: { name: 'Concrete/Asphalt', friction: 0.6, description: 'Hardstanding surface' },
  gravel: { name: 'Compacted Gravel', friction: 0.5, description: 'Compacted aggregate' },
  grass: { name: 'Grass/Turf', friction: 0.4, description: 'Firm grass surface' },
  soft_ground: { name: 'Soft Ground', friction: 0.3, description: 'Muddy or loose surface' },
};

const PRESETS = {
  standard_site: {
    name: 'Standard Site Fence',
    fenceType: 'standard_2m',
    ballastType: 'concrete_25',
    ballastPerFoot: '2',
    exposure: 'normal',
  },
  high_wind: {
    name: 'High Wind Area',
    fenceType: 'heavy_2m',
    ballastType: 'concrete_40',
    ballastPerFoot: '3',
    exposure: 'exposed',
  },
  security: {
    name: 'Security Fence',
    fenceType: 'anticlimb',
    ballastType: 'kentledge_250',
    ballastPerFoot: '1',
    exposure: 'normal',
  },
  coastal: {
    name: 'Coastal Site',
    fenceType: 'heavy_2m',
    ballastType: 'kentledge_500',
    ballastPerFoot: '1',
    exposure: 'very_exposed',
  },
  solid_hoarding: {
    name: 'Solid Hoarding',
    fenceType: 'solid_hoarding',
    ballastType: 'kentledge_500',
    ballastPerFoot: '1',
    exposure: 'exposed',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HerasFence: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // Collapsible sections
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBallastTable, setShowBallastTable] = useState(false);

  const [form, setForm] = useState({
    // Fence
    fenceType: 'standard_2m' as keyof typeof FENCE_TYPES,
    numberOfPanels: '10',

    // Ballast
    ballastType: 'concrete_25' as keyof typeof BALLAST_TYPES,
    ballastPerFoot: '2',

    // Site Conditions
    exposure: 'normal' as keyof typeof EXPOSURE_CATEGORIES,
    designWindSpeed: '22',
    groundCondition: 'gravel' as keyof typeof GROUND_CONDITIONS,

    // Additional cladding (for mesh fences)
    additionalCladding: 'none',
    claddingPercentage: '0',

    // Safety Factors
    sfOverturning: '1.5',
    sfSliding: '1.2',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'numberOfPanels', label: 'Number Of Panels' },
  { key: 'ballastPerFoot', label: 'Ballast Per Foot' },
  { key: 'designWindSpeed', label: 'Design Wind Speed' },
  { key: 'claddingPercentage', label: 'Cladding Percentage' },
  { key: 'sfOverturning', label: 'Sf Overturning' },
  { key: 'sfSliding', label: 'Sf Sliding' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'numberOfPanels', label: 'Number of Panels', min: 1, max: 50, step: 1, unit: '' },
    {
      key: 'designWindSpeed',
      label: 'Design Wind Speed',
      min: 15,
      max: 35,
      step: 0.5,
      unit: 'm/s',
    },
    { key: 'ballastPerFoot', label: 'Ballast per Foot', min: 1, max: 6, step: 1, unit: '' },
    { key: 'sfOverturning', label: 'SF Overturning', min: 1.0, max: 2.5, step: 0.1, unit: '' },
  ];

  // Canvas visualization

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        fenceType: preset.fenceType as keyof typeof FENCE_TYPES,
        ballastType: preset.ballastType as keyof typeof BALLAST_TYPES,
        ballastPerFoot: preset.ballastPerFoot,
        exposure: preset.exposure as keyof typeof EXPOSURE_CATEGORIES,
      }));
    }
  };

  const runCalculation = () => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);

    setTimeout(() => {
      const fence = FENCE_TYPES[form.fenceType];
      const ballast = BALLAST_TYPES[form.ballastType];
      const exposure = EXPOSURE_CATEGORIES[form.exposure];
      const ground = GROUND_CONDITIONS[form.groundCondition];
      const nPanels = parseInt(form.numberOfPanels) || 10;
      const nBallast = parseInt(form.ballastPerFoot) || 2;
      const V = parseFloat(form.designWindSpeed) || 22;
      const SF_OT = parseFloat(form.sfOverturning) || 1.5;
      const SF_SL = parseFloat(form.sfSliding) || 1.2;
      const claddingPct = parseFloat(form.claddingPercentage) || 0;

      const newWarnings: string[] = [];

      // Calculate total run length
      const totalLength = nPanels * fence.width;

      // Wind pressure calculation (simplified BS EN 1991-1-4)
      const rho = 1.225; // kg/m³
      const qp = 0.5 * rho * Math.pow(V, 2) * exposure.factor; // N/m²

      // Adjust Cd for cladding on mesh fences
      let Cd_eff = fence.Cd;
      if (fence.solidity < 0.5 && claddingPct > 0) {
        // Mesh with cladding - increases wind load
        Cd_eff = fence.Cd + (1.3 - fence.Cd) * (claddingPct / 100);
      }

      // Force per panel
      const A_panel = fence.height * fence.width; // m²
      const F_wind = (qp * Cd_eff * A_panel) / 1000; // kN

      // Centre of pressure
      const z_cp = fence.height / 2;

      // Overturning moment
      const M_ot = F_wind * z_cp; // kNm

      // Self-weight of fence
      const W_fence = (fence.weight * 9.81) / 1000; // kN
      const lever_fence = fence.width / 4;

      // Ballast resistance (per panel, 2 feet)
      const W_ballast_total = (2 * nBallast * (ballast.weight * 9.81)) / 1000; // kN
      const lever_ballast = ballast.width / 2;

      // Total restoring moment
      const M_rest = W_fence * lever_fence + W_ballast_total * lever_ballast; // kNm

      // Stability ratio
      const stabilityRatio = M_ot > 0 ? M_rest / M_ot : 999;
      const statusOT = stabilityRatio >= SF_OT ? 'PASS' : 'FAIL';

      // Required ballast for SF_OT
      const M_required = M_ot * SF_OT;
      const M_from_fence = W_fence * lever_fence;
      const M_from_ballast_needed = M_required - M_from_fence;
      const W_ballast_needed = M_from_ballast_needed / lever_ballast; // kN
      const ballast_kg_needed = (W_ballast_needed * 1000) / 9.81;
      const blocksNeeded = Math.ceil(ballast_kg_needed / ballast.weight / 2); // Per foot

      // Sliding check
      const mu = ground.friction;
      const W_total = W_fence + W_ballast_total;
      const F_resist = W_total * mu;
      const slidingRatio = F_wind > 0 ? F_resist / F_wind : 999;
      const statusSliding = slidingRatio >= SF_SL ? 'PASS' : 'FAIL';

      // Warnings
      if (statusOT === 'FAIL') {
        newWarnings.push(`⛔ Overturning check FAILS - need min ${blocksNeeded} blocks per foot`);
      } else if (stabilityRatio < SF_OT * 1.2) {
        newWarnings.push('⚠️ Stability ratio close to minimum - consider extra ballast');
      }

      if (statusSliding === 'FAIL') {
        newWarnings.push('⛔ Sliding check FAILS - increase ballast or improve ground friction');
      }

      if (fence.solidity > 0.5 && form.exposure === 'very_exposed') {
        newWarnings.push('⚠️ Solid hoarding in very exposed location - consider structural review');
      }

      if (V > 25) {
        newWarnings.push('⚠️ High wind speed specified - verify with local data');
      }

      // Totals
      const totalFenceWeight = nPanels * fence.weight;
      const totalBallastWeight = nPanels * 2 * nBallast * ballast.weight;
      const totalWeight = totalFenceWeight + totalBallastWeight;

      // Rating
      const minRatio = Math.min(stabilityRatio, slidingRatio);
      let rating = 'CRITICAL';
      let ratingColor = '#ef4444';
      if (statusOT === 'PASS' && statusSliding === 'PASS') {
        if (minRatio >= 2.0) {
          rating = 'EXCELLENT';
          ratingColor = '#22c55e';
        } else if (minRatio >= 1.5) {
          rating = 'GOOD';
          ratingColor = '#10b981';
        } else if (minRatio >= 1.2) {
          rating = 'ADEQUATE';
          ratingColor = '#f59e0b';
        } else {
          rating = 'MARGINAL';
          ratingColor = '#f97316';
        }
      }

      setResults({
        inputs: {
          fenceType: fence.name,
          numberOfPanels: nPanels,
          totalLength: totalLength.toFixed(1),
          ballastType: ballast.name,
          ballastPerFoot: nBallast,
          exposure: exposure.name,
          windSpeed: V,
        },
        wind: {
          pressure: qp.toFixed(1),
          Cd: Cd_eff.toFixed(2),
          areaPerPanel: A_panel.toFixed(2),
        },
        windForcePerPanel: (F_wind * 1000).toFixed(0), // N
        overturningMoment: M_ot.toFixed(3), // kNm
        resistingMoment: M_rest.toFixed(3), // kNm
        checks: {
          stability: {
            ratio: stabilityRatio.toFixed(2),
            status: statusOT,
            applied: M_ot.toFixed(3),
            resisting: M_rest.toFixed(3),
          },
          sliding: {
            ratio: slidingRatio.toFixed(2),
            status: statusSliding,
            force: (F_wind * 1000).toFixed(0),
            resistance: (F_resist * 1000).toFixed(0),
          },
        },
        weights: {
          totalFence: totalFenceWeight,
          totalBallast: totalBallastWeight,
          total: totalWeight,
        },
        requiredBallastPerFoot: Math.max(blocksNeeded, 1),
        overallStatus: statusOT === 'PASS' && statusSliding === 'PASS' ? 'PASS' : 'FAIL',
        rating,
        ratingColor,
      });

      setWarnings(newWarnings);
      setIsCalculating(false);
      setActiveTab('results');
    }, 1000);
  };

  const buildReportData = (): ReportData => {
    const fence = FENCE_TYPES[form.fenceType];
    const ballast = BALLAST_TYPES[form.ballastType];
    const exposure = EXPOSURE_CATEGORIES[form.exposure];

    return {
      meta: {
        title: 'Heras Fence Stability Design',
        projectName: 'Temporary Fencing Assessment',
        clientName: 'Client',
        documentRef: `HFS-${Date.now().toString(36).toUpperCase()}`,
        version: 'Rev A',
        date: new Date().toLocaleDateString('en-GB'),
        preparedBy: 'BeaverCalc Studio',
        calculatorName: 'Heras Fence Calculator',
        designCodes: ['BS EN 1991-1-4:2005', 'BS 5975:2019'],
      },
      executiveSummary: {
        description: `Temporary fencing stability assessment for ${form.numberOfPanels} panels of ${fence.name}. ${exposure.name} exposure with ${form.designWindSpeed} m/s design wind speed.`,
        keyResults: [
          { label: 'Fence Type', value: fence.name },
          { label: 'Total Length', value: `${results?.inputs.totalLength || '-'} m` },
          { label: 'Wind Force/Panel', value: `${results?.windForcePerPanel || '-'} N` },
          {
            label: 'Stability Ratio',
            value: results?.checks.stability.ratio || '-',
            highlight: parseFloat(results?.checks.stability.ratio || '0') < 1.5,
          },
        ],
        overallStatus: results?.overallStatus || 'PENDING',
        governingCheck: 'Overturning Stability',
        utilisationSummary: `Stability: ${results?.checks.stability.ratio || '-'}, Sliding: ${results?.checks.sliding.ratio || '-'}`,
      },
      inputs: {
        sections: [
          {
            title: 'Fence Specification',
            parameters: [
              { name: 'Fence Type', value: fence.name },
              { name: 'Panel Height', value: fence.height.toString(), unit: 'm' },
              { name: 'Panel Width', value: fence.width.toString(), unit: 'm' },
              { name: 'Panel Weight', value: fence.weight.toString(), unit: 'kg' },
              { name: 'Number of Panels', value: form.numberOfPanels },
            ],
          },
          {
            title: 'Ballast Configuration',
            parameters: [
              { name: 'Ballast Type', value: ballast.name },
              { name: 'Weight per Block', value: ballast.weight.toString(), unit: 'kg' },
              { name: 'Blocks per Foot', value: form.ballastPerFoot },
            ],
          },
          {
            title: 'Site Conditions',
            parameters: [
              { name: 'Exposure Category', value: exposure.name },
              { name: 'Design Wind Speed', value: form.designWindSpeed, unit: 'm/s' },
              { name: 'Ground Condition', value: GROUND_CONDITIONS[form.groundCondition].name },
            ],
          },
        ],
      },
      designChecks: [
        {
          title: 'Wind Loading',
          description: 'BS EN 1991-1-4 Simplified',
          checks: [
            {
              name: 'Peak Velocity Pressure',
              formula: 'qp = 0.5ρV²Ce',
              calculated: `${results?.wind.pressure || '-'} N/m²`,
              limit: '-',
              utilisation: 0,
              status: 'PASS',
            },
            {
              name: 'Wind Force per Panel',
              formula: 'F = qp × Cd × A',
              calculated: `${results?.windForcePerPanel || '-'} N`,
              limit: '-',
              utilisation: 0,
              status: 'PASS',
            },
          ],
        },
        {
          title: 'Overturning Check',
          description: 'Moment Equilibrium',
          checks: [
            {
              name: 'Overturning Moment',
              formula: 'Mo = F × H/2',
              calculated: `${results?.checks.stability.applied || '-'} kNm`,
              limit: '-',
              utilisation: 0,
              status: 'PASS',
            },
            {
              name: 'Restoring Moment',
              formula: 'Mr = W × lever',
              calculated: `${results?.checks.stability.resisting || '-'} kNm`,
              limit: `FOS ≥ ${form.sfOverturning}`,
              utilisation:
                parseFloat(results?.checks.stability.ratio || '0') > 0
                  ? 100 / parseFloat(results?.checks.stability.ratio)
                  : 0,
              status: results?.checks.stability.status || 'PENDING',
            },
          ],
        },
        {
          title: 'Sliding Check',
          description: 'Friction Resistance',
          checks: [
            {
              name: 'Sliding Resistance',
              formula: 'Fr = μW',
              calculated: `${results?.checks.sliding.resistance || '-'} N`,
              limit: `FOS ≥ ${form.sfSliding}`,
              utilisation: 0,
              status: results?.checks.sliding.status || 'PENDING',
            },
          ],
        },
      ],
      conclusion: {
        summary:
          results?.overallStatus === 'PASS'
            ? 'Temporary fencing is STABLE under design wind loading.'
            : 'Temporary fencing is UNSTABLE - increase ballast or reduce exposure.',
        recommendations: [
          `Minimum ballast: ${results?.requiredBallastPerFoot || '-'} blocks per foot`,
          'Ensure all couplers are tight and feet are properly positioned',
          'Inspect after high wind events',
          'Replace damaged panels immediately',
        ],
        limitations: [
          'Simplified wind calculation - site-specific assessment may be required',
          'Does not account for impact or crowd loading',
          'Friction coefficients are indicative - verify site conditions',
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
    const fence = FENCE_TYPES[form.fenceType];
    const ballast = BALLAST_TYPES[form.ballastType];
    const exposure = EXPOSURE_CATEGORIES[form.exposure];
    const ground = GROUND_CONDITIONS[form.groundCondition];
    generatePremiumPDF({
      title: 'Heras Fence & Ballast Calculator',
      subtitle: 'BS EN 1991-1-4 · Wind Stability Assessment',
      standard: 'BS EN 1991-1-4:2005 + UK NA',
      projectInfo: [
        { label: 'Project', value: 'Heras Fence Wind Stability' },
        { label: 'Standard', value: 'BS EN 1991-1-4:2005 + UK NA' },
        {
          label: 'Reference',
          value: `HER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        },
      ],
      inputs: [
        { label: 'Fence Type', value: fence.name },
        { label: 'Number of Panels', value: String(form.numberOfPanels) },
        { label: 'Ballast Type', value: ballast.name },
        { label: 'Ballast Per Foot', value: `${form.ballastPerFoot} blocks` },
        { label: 'Exposure Category', value: exposure.name },
        { label: 'Design Wind Speed', value: form.designWindSpeed, unit: 'm/s' },
        { label: 'Ground Condition', value: ground.name },
        { label: 'SF Overturning', value: String(form.sfOverturning) },
        { label: 'SF Sliding', value: String(form.sfSliding) },
      ],
      sections: [
        {
          title: 'Wind & Stability Analysis',
          head: [['Parameter', 'Value']],
          body: [
            ['Wind Pressure (qp)', `${results.wind.pressure} Pa`],
            ['Drag Coefficient (Cd)', results.wind.Cd],
            ['Panel Area', `${results.wind.areaPerPanel} m²`],
            [
              'Wind Force / Panel',
              `${(parseFloat(results.windForcePerPanel) / 1000).toFixed(2)} kN`,
            ],
            ['Overturning Moment', `${results.overturningMoment} kNm`],
            ['Resisting Moment', `${results.resistingMoment} kNm`],
            ['Stability Ratio', results.checks.stability.ratio],
            ['Sliding Ratio', results.checks.sliding.ratio],
            ['Required Ballast / Foot', `${results.requiredBallastPerFoot} blocks`],
            ['Total Fence Weight', `${results.weights.totalFence} kg`],
            ['Total Ballast Weight', `${results.weights.totalBallast} kg`],
            ['Total Weight', `${results.weights.total} kg`],
          ],
        },
      ],
      checks: [
        {
          name: 'Overturning Stability',
          capacity: `${results.resistingMoment} kNm`,
          utilisation: String(results.checks.stability.ratio),
          status: results.checks.stability.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Sliding Resistance',
          capacity: `${results.checks.sliding.resistance} N`,
          utilisation: String(results.checks.sliding.ratio),
          status: results.checks.sliding.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Ballast Placement',
          suggestion: `Provide minimum ${results.requiredBallastPerFoot} ballast blocks per fence foot`,
        },
        {
          check: 'Coupler Integrity',
          suggestion: 'Ensure all panel couplers are tight and properly secured',
        },
        {
          check: 'Post-Wind Inspection',
          suggestion: 'Inspect fence alignment and ballast position after high wind events',
        },
        {
          check: 'Panel Condition',
          suggestion: 'Replace damaged or deformed panels immediately to maintain stability',
        },
      ],
      warnings: warnings.map((w) => ({ message: w.replace(/^[⛔⚠️🔧✅📌💡]\s*/, '') })),
      footerNote: 'Beaver Bridges Ltd — Heras Fence & Ballast Wind Stability · BS EN 1991-1-4',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const fence = FENCE_TYPES[form.fenceType];
    const ballast = BALLAST_TYPES[form.ballastType];
    const exposure = EXPOSURE_CATEGORIES[form.exposure];
    const ground = GROUND_CONDITIONS[form.groundCondition];
    generateDOCX({
      title: 'Heras Fence & Ballast Calculator',
      subtitle: 'BS EN 1991-1-4 · Wind Stability Assessment',
      standard: 'BS EN 1991-1-4:2005 + UK NA',
      projectInfo: [
        { label: 'Project', value: 'Heras Fence Wind Stability' },
        { label: 'Standard', value: 'BS EN 1991-1-4:2005 + UK NA' },
        {
          label: 'Reference',
          value: `HER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        },
      ],
      inputs: [
        { label: 'Fence Type', value: fence.name },
        { label: 'Number of Panels', value: String(form.numberOfPanels) },
        { label: 'Ballast Type', value: ballast.name },
        { label: 'Ballast Per Foot', value: `${form.ballastPerFoot} blocks` },
        { label: 'Exposure Category', value: exposure.name },
        { label: 'Design Wind Speed', value: form.designWindSpeed, unit: 'm/s' },
        { label: 'Ground Condition', value: ground.name },
        { label: 'SF Overturning', value: String(form.sfOverturning) },
        { label: 'SF Sliding', value: String(form.sfSliding) },
      ],
      sections: [
        {
          title: 'Wind & Stability Analysis',
          head: [['Parameter', 'Value']],
          body: [
            ['Wind Pressure (qp)', `${results.wind.pressure} Pa`],
            ['Drag Coefficient (Cd)', results.wind.Cd],
            ['Panel Area', `${results.wind.areaPerPanel} m²`],
            [
              'Wind Force / Panel',
              `${(parseFloat(results.windForcePerPanel) / 1000).toFixed(2)} kN`,
            ],
            ['Overturning Moment', `${results.overturningMoment} kNm`],
            ['Resisting Moment', `${results.resistingMoment} kNm`],
            ['Stability Ratio', results.checks.stability.ratio],
            ['Sliding Ratio', results.checks.sliding.ratio],
            ['Required Ballast / Foot', `${results.requiredBallastPerFoot} blocks`],
            ['Total Fence Weight', `${results.weights.totalFence} kg`],
            ['Total Ballast Weight', `${results.weights.totalBallast} kg`],
            ['Total Weight', `${results.weights.total} kg`],
          ],
        },
      ],
      checks: [
        {
          name: 'Overturning Stability',
          capacity: `${results.resistingMoment} kNm`,
          utilisation: String(results.checks.stability.ratio),
          status: results.checks.stability.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Sliding Resistance',
          capacity: `${results.checks.sliding.resistance} N`,
          utilisation: String(results.checks.sliding.ratio),
          status: results.checks.sliding.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Ballast Placement',
          suggestion: `Provide minimum ${results.requiredBallastPerFoot} ballast blocks per fence foot`,
        },
        {
          check: 'Coupler Integrity',
          suggestion: 'Ensure all panel couplers are tight and properly secured',
        },
        {
          check: 'Post-Wind Inspection',
          suggestion: 'Inspect fence alignment and ballast position after high wind events',
        },
        {
          check: 'Panel Condition',
          suggestion: 'Replace damaged or deformed panels immediately to maintain stability',
        },
      ],
      warnings: warnings.map((w) => ({ message: w.replace(/^[⛔⚠️🔧✅📌💡]\s*/, '') })),
      footerNote: 'Beaver Bridges Ltd — Heras Fence & Ballast Wind Stability · BS EN 1991-1-4',
    });
  };

  // Calculate ballast recommendations table
  const getBallastTable = () => {
    const fence = FENCE_TYPES[form.fenceType];
    const exposure = EXPOSURE_CATEGORIES[form.exposure];
    const V = parseFloat(form.designWindSpeed) || 22;
    const SF = parseFloat(form.sfOverturning);

    const rho = 1.225;
    const qp = 0.5 * rho * Math.pow(V, 2) * exposure.factor;
    const F_wind = (qp * fence.Cd * fence.height * fence.width) / 1000;
    const M_ot = (F_wind * fence.height) / 2;
    const M_required = M_ot * SF;
    const W_fence = (fence.weight * 9.81) / 1000;
    const M_fence = (W_fence * fence.width) / 4;
    const M_ballast_needed = M_required - M_fence;

    return Object.entries(BALLAST_TYPES).map(([key, bal]) => {
      const lever = bal.width / 2;
      const W_per_block = (bal.weight * 9.81) / 1000;
      const M_per_block = W_per_block * lever;
      const blocksNeeded = Math.ceil(M_ballast_needed / M_per_block / 2);
      return {
        name: bal.name,
        weight: bal.weight,
        blocksPerFoot: Math.max(blocksNeeded, 1),
        totalWeight: blocksNeeded * 2 * bal.weight,
      };
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-full glass border border-neon-cyan/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiShield className="text-neon-cyan" size={24} />
            <span className="text-white font-semibold">BS EN 1991-1-4 | Wind Stability</span>
          </motion.div>
          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
            Heras Fence & Ballast Calculator
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BS 5975 heras fence & ballast checks
          </p>
        </motion.div>

        {/* Presets Bar */}
        <Card variant="glass" className="mb-6 border-neon-cyan/30 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <FiSettings className="text-purple-400" />
                <select
                  value=""
                  onChange={(e) => e.target.value && applyPreset(e.target.value)}
                  title="Quick Presets"
                  className="px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm"
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
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as 'input' | 'results' | 'visualization')}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-blue'
                  : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🚧 Setup' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
            </Button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              {/* Left - Inputs */}
              <div className="space-y-6">
                {/* Fence Selection */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      >
                        <FiActivity className="w-6 h-6 text-neon-cyan" />
                      </motion.div>
                      <span>Fence Type</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-200 block mb-2">
                        Panel Type
                      </label>
                      <select
                        value={form.fenceType}
                        onChange={(e) => updateForm('fenceType', e.target.value)}
                        title="Panel Type"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(FENCE_TYPES).map(([key, f]) => (
                          <option key={key} value={key}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField
                      label="Number of Panels"
                      value={form.numberOfPanels}
                      onChange={(v) => updateForm('numberOfPanels', v)}
                    />
                    <div className="text-sm text-gray-400">
                      Total length:{' '}
                      <span className="text-cyan-400 font-mono">
                        {(parseInt(form.numberOfPanels) || 0) * FENCE_TYPES[form.fenceType].width}m
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Ballast */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      >
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </motion.div>
                      <span>Ballast</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-200 block mb-2">
                        Ballast Type
                      </label>
                      <select
                        value={form.ballastType}
                        onChange={(e) => updateForm('ballastType', e.target.value)}
                        title="Ballast Type"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(BALLAST_TYPES).map(([key, b]) => (
                          <option key={key} value={key}>
                            {b.name} ({b.weight}kg)
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField
                      label="Blocks per Foot"
                      value={form.ballastPerFoot}
                      onChange={(v) => updateForm('ballastPerFoot', v)}
                    />
                  </CardContent>
                </Card>

                {/* Wind Conditions */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      >
                        <FiWind className="w-6 h-6 text-neon-cyan" />
                      </motion.div>
                      <span>Wind & Site</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-200 block mb-2">
                          Exposure
                        </label>
                        <select
                          value={form.exposure}
                          onChange={(e) => updateForm('exposure', e.target.value)}
                          title="Exposure Category"
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                        >
                          {Object.entries(EXPOSURE_CATEGORIES).map(([key, e]) => (
                            <option key={key} value={key}>
                              {e.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField
                        label="Wind Speed (m/s)"
                        value={form.designWindSpeed}
                        onChange={(v) => updateForm('designWindSpeed', v)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-200 block mb-2">
                        Ground Condition
                      </label>
                      <select
                        value={form.groundCondition}
                        onChange={(e) => updateForm('groundCondition', e.target.value)}
                        title="Ground Condition"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(GROUND_CONDITIONS).map(([key, g]) => (
                          <option key={key} value={key}>
                            {g.name} (μ={g.friction})
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Ballast Lookup Table */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => setShowBallastTable(!showBallastTable)}
                  >
                    <div className="flex justify-between items-center w-full">
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                        >
                          <FiGrid className="w-6 h-6 text-neon-cyan" />
                        </motion.div>
                        <span>Ballast Lookup Table</span>
                      </CardTitle>
                      <motion.div animate={{ rotate: showBallastTable ? 180 : 0 }}>
                        <FiChevronDown className="text-gray-400" />
                      </motion.div>
                    </div>
                  </CardHeader>

                  {showBallastTable && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="pt-0">
                        <p className="text-xs text-gray-400 mb-3">
                          Minimum ballast per foot for FOS {form.sfOverturning}:
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-700">
                                <th className="py-2 text-left text-gray-400">Ballast Type</th>
                                <th className="py-2 text-right text-gray-400">Blocks/Foot</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getBallastTable().map((row, i) => (
                                <tr key={i} className="border-b border-gray-800">
                                  <td className="py-2 text-white">{row.name}</td>
                                  <td className="py-2 text-right text-cyan-400 font-mono">
                                    {row.blocksPerFoot}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
              </div>

              {/* Right - Visualization */}
              <div className="space-y-6 sticky top-32">
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
                        <HerasFence3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        HERAS FENCE — REAL-TIME PREVIEW
                      </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        {
                          label: 'Wind Speed',
                          field: 'designWindSpeed',
                          min: 15,
                          max: 35,
                          step: 1,
                          unit: 'm/s',
                        },
                        {
                          label: 'Ballast/Foot',
                          field: 'ballastPerFoot',
                          min: 1,
                          max: 6,
                          step: 1,
                          unit: 'blocks',
                        },
                        {
                          label: 'SF Overturning',
                          field: 'sfOverturning',
                          min: 1.0,
                          max: 2.5,
                          step: 0.1,
                          unit: '×',
                        },
                        {
                          label: 'SF Sliding',
                          field: 'sfSliding',
                          min: 1.0,
                          max: 2.0,
                          step: 0.1,
                          unit: '×',
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
                          { label: 'Fence Type', value: form.fenceType },
                          { label: 'Ballast Type', value: form.ballastType },
                          { label: 'Exposure', value: form.exposure },
                          { label: 'Panels', value: form.numberOfPanels },
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
                                util: results.checks?.stability?.ratio,
                                status: results.checks?.stability?.status,
                              },
                              {
                                label: 'Sliding FOS',
                                util: results.checks?.sliding?.ratio,
                                status: results.checks?.sliding?.status,
                              },
                            ].map((check) => (
                              <div
                                key={check.label}
                                className="flex justify-between text-xs py-0.5"
                              >
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
                  title="Heras Fence — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <HerasFence3D />
                    </Interactive3DDiagram>
                  )}
                />

                <Button
                  onClick={runCalculation}
                  disabled={isCalculating}
                  variant="neon"
                  className="w-full px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/40 transition-all duration-300"
                >
                  {isCalculating ? (
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Calculating...
                    </div>
                  ) : (
                    <span className="flex items-center gap-3">
                      <FiZap size={24} /> RUN FULL ANALYSIS
                    </span>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
          {activeTab === 'results' && (
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
                      'p-6 rounded-2xl border-2 flex items-center justify-between shadow-lg',
                      results.overallStatus === 'PASS'
                        ? 'bg-green-500/10 border-green-500/50 shadow-green-500/10'
                        : 'bg-red-500/10 border-red-500/50 shadow-red-500/10',
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
                        <p className="text-gray-400">Wind stability check</p>
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
                    <Card variant="glass" className="border-yellow-500/30 bg-yellow-500/5">
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

                  {/* Summary Cards */}
                  <div className="grid md:grid-cols-4 gap-4">
                    {[
                      {
                        title: 'Wind Force',
                        value: `${(parseFloat(results.windForcePerPanel) / 1000).toFixed(2)} kN`,
                        subtitle: 'Per panel',
                        borderColor: 'border-l-blue-500',
                        icon: <FiWind className="text-blue-400" />,
                      },
                      {
                        title: 'Overturning',
                        value: `${results.overturningMoment} kNm`,
                        subtitle: 'Applied moment',
                        borderColor: 'border-l-red-500',
                        icon: <FiAlertTriangle className="text-red-400" />,
                      },
                      {
                        title: 'Restoring',
                        value: `${results.resistingMoment} kNm`,
                        subtitle: 'Ballast moment',
                        borderColor: 'border-l-green-500',
                        icon: <FiCheck className="text-green-400" />,
                      },
                      {
                        title: 'Min Ballast',
                        value: `${results.requiredBallastPerFoot}/ft`,
                        subtitle: 'Blocks needed',
                        borderColor: 'border-l-purple-500',
                        icon: <FiShield className="text-purple-400" />,
                      },
                    ].map((card, i) => (
                      <Card
                        key={i}
                        variant="glass"
                        className={cn(
                          'border-l-4 border-neon-cyan/30 shadow-2xl',
                          card.borderColor,
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {card.icon}
                            <span className="text-gray-400 text-xs">{card.title}</span>
                          </div>
                          <div className="text-2xl font-black text-white">{card.value}</div>
                          <div className="text-gray-500 text-xs mt-1">{card.subtitle}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Check Cards */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          Overturning Check
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded',
                              results.checks.stability.status === 'PASS'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400',
                            )}
                          >
                            {results.checks.stability.status}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Stability Ratio</span>
                            <span className="text-white font-mono">
                              {results.checks.stability.ratio} ≥ {form.sfOverturning}
                            </span>
                          </div>
                          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (100 * parseFloat(form.sfOverturning)) / parseFloat(results.checks.stability.ratio))}%`,
                              }}
                              className={cn(
                                'h-full rounded-full',
                                results.checks.stability.status === 'PASS'
                                  ? 'bg-green-500'
                                  : 'bg-red-500',
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          Sliding Check
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded',
                              results.checks.sliding.status === 'PASS'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400',
                            )}
                          >
                            {results.checks.sliding.status}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Sliding Ratio</span>
                            <span className="text-white font-mono">
                              {results.checks.sliding.ratio} ≥ {form.sfSliding}
                            </span>
                          </div>
                          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (100 * parseFloat(form.sfSliding)) / parseFloat(results.checks.sliding.ratio))}%`,
                              }}
                              className={cn(
                                'h-full rounded-full',
                                results.checks.sliding.status === 'PASS'
                                  ? 'bg-green-500'
                                  : 'bg-red-500',
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Weight Summary */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Weight Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-gray-400 text-sm">Fence Weight</div>
                          <div className="text-xl font-bold text-white">
                            {results.weights.totalFence} kg
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm">Ballast Weight</div>
                          <div className="text-xl font-bold text-white">
                            {results.weights.totalBallast} kg
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm">Total Weight</div>
                          <div className="text-xl font-bold text-cyan-400">
                            {results.weights.total} kg
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card variant="glass" className="bg-neon-cyan/5 border-neon-cyan/30 shadow-2xl">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center">
                          <FiCheck className="w-3 h-3 text-white" />
                        </div>
                        Design Recommendations
                      </h3>
                      <div className="space-y-3">
                        {[
                          `Provide minimum ${results.requiredBallastPerFoot} ballast blocks per fence foot for wind stability`,
                          'Ensure all panel couplers are tight and feet are properly positioned on firm ground',
                          'Inspect fence alignment and ballast position after high wind events (>50 km/h)',
                          'Replace damaged or deformed panels immediately to maintain adequate drag resistance',
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
                      className="w-full py-6 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
                    >
                      <FiDownload className="mr-2" size={24} /> Export PDF Report
                    </Button>
                    <Button
                      onClick={exportDOCX}
                      variant="neon"
                      className="w-full py-6 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
                    >
                      <FiDownload className="mr-2" size={24} /> DOCX
                    </Button>
                    <SaveRunButton
                      calculatorKey="heras-fence"
                      inputs={form as unknown as Record<string, string | number>}
                      results={results}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    />
                  </div>

                  {/* Design Codes */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <FiInfo className="text-neon-cyan" />
                        Design Codes &amp; References
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-neon-cyan font-medium">BS EN 1991-1-4:2005</span>
                          <p className="text-gray-400">Wind actions on structures</p>
                        </div>
                        <div>
                          <span className="text-neon-cyan font-medium">BS 5975:2019</span>
                          <p className="text-gray-400">Temporary works procedures</p>
                        </div>
                        <div>
                          <span className="text-neon-cyan font-medium">HSG151</span>
                          <p className="text-gray-400">Protecting the public — temporary works</p>
                        </div>
                        <div>
                          <span className="text-neon-cyan font-medium">CDM 2015</span>
                          <p className="text-gray-400">Construction (Design &amp; Management)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          )}

          {/* ============= VISUALIZATION TAB ============= */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white">3D Fence Visualisation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                    <HerasFence3D />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
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
  field?: string;
}> = ({ label, value, onChange, field }) => (
  <div>
    <ExplainableLabel
      label={label}
      field={field || label.toLowerCase().replace(/\s+/g, '_')}
      className="text-sm font-semibold text-gray-200 block mb-2"
    />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
    />
  </div>
);

const ResultCard: React.FC<{ title: string; value: string; subtitle: string; color: string }> = ({
  title,
  value,
  subtitle,
  color,
}) => {
  const colors: Record<string, string> = {
    blue: 'border-blue-500/30 text-blue-400',
    green: 'border-green-500/30 text-green-400',
    orange: 'border-orange-500/30 text-orange-400',
    red: 'border-red-500/30 text-red-400',
    purple: 'border-purple-500/30 text-purple-400',
    cyan: 'border-cyan-500/30 text-cyan-400',
  };

  return (
    <Card variant="glass" className={cn('border', colors[color]?.split(' ')[0])}>
      <CardContent className="p-4 text-center">
        <div className="text-gray-400 text-xs mb-1">{title}</div>
        <div className={cn('text-2xl font-black', colors[color]?.split(' ')[1])}>{value}</div>
        <div className="text-gray-500 text-xs mt-1">{subtitle}</div>
      </CardContent>
    </Card>
  );
};

export default HerasFence;
