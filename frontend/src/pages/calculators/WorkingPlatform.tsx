// =============================================================================
// BeaverCalc Studio — Working Platform Design (Premium)
// BRE 470 methodology for piling rigs & tracked plant
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMinimize2,
  FiSliders,
  FiTarget,
  FiTruck,
  FiX,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import WorkingPlatform3D from '../../components/3d/scenes/WorkingPlatform3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  plant: string;
  weight: string;
  trackLength: string;
  trackWidth: string;
  trackSpacing: string;
  material: string;
  thickness: string;
  subgrade: string;
  subgradeCu: string;
  dynamicFactor: string;
  safetyFactor: string;
}

interface Results {
  designLoad: number;
  trackPressure: number;
  effectiveArea: number;
  subgradePressure: number;
  bearingCapacity: number;
  bearingUtil: number;
  bearingStatus: 'PASS' | 'FAIL';
  punchingShear: number;
  punchingAllow: number;
  punchingUtil: number;
  punchingStatus: 'PASS' | 'FAIL';
  minThickness: number;
  providedThickness: number;
  thicknessStatus: 'PASS' | 'FAIL';
  overallStatus: 'PASS' | 'FAIL';
  rating: string;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PLANT DATABASE (BRE 470)
// =============================================================================

const PLANTS: Record<
  string,
  { name: string; weight: number; trackL: number; trackW: number; spacing: number }
> = {
  cfa_small: { name: 'CFA Rig (Small)', weight: 450, trackL: 4.5, trackW: 0.6, spacing: 2.5 },
  cfa_medium: { name: 'CFA Rig (Medium)', weight: 700, trackL: 5.0, trackW: 0.7, spacing: 2.8 },
  cfa_large: { name: 'CFA Rig (Large)', weight: 1100, trackL: 6.0, trackW: 0.8, spacing: 3.2 },
  rotary_small: {
    name: 'Rotary Rig (Small)',
    weight: 600,
    trackL: 4.8,
    trackW: 0.65,
    spacing: 2.6,
  },
  rotary_medium: {
    name: 'Rotary Rig (Medium)',
    weight: 900,
    trackL: 5.5,
    trackW: 0.75,
    spacing: 3.0,
  },
  rotary_large: {
    name: 'Rotary Rig (Large)',
    weight: 1400,
    trackL: 6.5,
    trackW: 0.9,
    spacing: 3.5,
  },
  crawler_50t: { name: '50t Crawler Crane', weight: 500, trackL: 5.0, trackW: 0.9, spacing: 3.2 },
  crawler_100t: {
    name: '100t Crawler Crane',
    weight: 1000,
    trackL: 6.0,
    trackW: 1.0,
    spacing: 4.0,
  },
  mini_piler: { name: 'Mini Piling Rig', weight: 120, trackL: 2.5, trackW: 0.4, spacing: 1.5 },
  excavator_30t: { name: '30t Excavator', weight: 300, trackL: 4.0, trackW: 0.6, spacing: 2.2 },
};

const MATERIALS: Record<string, { name: string; CBR: number; phi: number; gamma: number }> = {
  type1: { name: 'Type 1 Sub-base', CBR: 70, phi: 42, gamma: 20 },
  crushed_rock: { name: 'Crushed Rock (6F2)', CBR: 80, phi: 45, gamma: 20 },
  gravel_6f5: { name: 'Graded Gravel (6F5)', CBR: 60, phi: 40, gamma: 19 },
  recycled: { name: 'Recycled Aggregate', CBR: 40, phi: 35, gamma: 18 },
  sand_gravel: { name: 'Sand & Gravel', CBR: 30, phi: 32, gamma: 18 },
};

const SUBGRADES: Record<string, { name: string; cu: number; CBR: number }> = {
  soft_clay: { name: 'Soft Clay', cu: 25, CBR: 2 },
  firm_clay: { name: 'Firm Clay', cu: 50, CBR: 3 },
  stiff_clay: { name: 'Stiff Clay', cu: 100, CBR: 5 },
  loose_sand: { name: 'Loose Sand', cu: 0, CBR: 10 },
  medium_sand: { name: 'Medium Dense Sand', cu: 0, CBR: 15 },
  dense_sand: { name: 'Dense Sand', cu: 0, CBR: 30 },
  made_ground: { name: 'Made Ground', cu: 20, CBR: 2 },
  peat: { name: 'Peat / Organic', cu: 10, CBR: 1 },
};

const PRESET_SCENARIOS: Record<
  string,
  { plant: string; material: string; subgrade: string; thickness: string; label: string }
> = {
  cfa_firm: {
    plant: 'cfa_medium',
    material: 'crushed_rock',
    subgrade: 'firm_clay',
    thickness: '600',
    label: 'CFA Rig on Firm Clay',
  },
  rotary_soft: {
    plant: 'rotary_large',
    material: 'type1',
    subgrade: 'soft_clay',
    thickness: '900',
    label: 'Rotary Rig on Soft Clay',
  },
  crane_stiff: {
    plant: 'crawler_100t',
    material: 'crushed_rock',
    subgrade: 'stiff_clay',
    thickness: '500',
    label: '100t Crane on Stiff Clay',
  },
  mini_piler: {
    plant: 'mini_piler',
    material: 'gravel_6f5',
    subgrade: 'firm_clay',
    thickness: '300',
    label: 'Mini Piler on Firm Clay',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const WorkingPlatform = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    plant: true,
    platform: true,
    ground: false,
    factors: false,
  });

  const [form, setForm] = useState<FormData>({
    plant: 'cfa_medium',
    weight: '700',
    trackLength: '5.0',
    trackWidth: '0.7',
    trackSpacing: '2.8',
    material: 'crushed_rock',
    thickness: '600',
    subgrade: 'firm_clay',
    subgradeCu: '50',
    dynamicFactor: '1.3',
    safetyFactor: '2.0',
  });
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'plant', label: 'Plant', min: 0, max: 100, step: 1, unit: '' },
    { key: 'weight', label: 'Weight', min: 0, max: 100, step: 1, unit: '' },
    { key: 'trackLength', label: 'Track Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'trackWidth', label: 'Track Width', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATIONS — BRE 470 Methodology
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'weight', label: 'Plant Weight' },
      { key: 'trackLength', label: 'Track Length' },
      { key: 'trackWidth', label: 'Track Width' },
      { key: 'trackSpacing', label: 'Track Spacing' },
      { key: 'thickness', label: 'Platform Thickness' },
      { key: 'subgradeCu', label: 'Subgrade Cu' },
      { key: 'dynamicFactor', label: 'Dynamic Factor' },
      { key: 'safetyFactor', label: 'Safety Factor' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const W = parseFloat(form.weight);
    const Ltrack = parseFloat(form.trackLength);
    const Btrack = parseFloat(form.trackWidth);
    const spacing = parseFloat(form.trackSpacing);
    const t = parseFloat(form.thickness) / 1000;
    const cu = parseFloat(form.subgradeCu);
    const dyn = parseFloat(form.dynamicFactor);
    const SF = parseFloat(form.safetyFactor);
    const material = MATERIALS[form.material];
    const subgrade = SUBGRADES[form.subgrade];

    if (isNaN(W) || W <= 0 || isNaN(t) || t <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid inputs' }]);
      return;
    }

    // Design load per track (including factors)
    const designLoad = (W * dyn * SF) / 2;

    // Track bearing area
    const Atrack = Ltrack * Btrack;
    const trackPressure = designLoad / Atrack;

    // Load spread through platform (BRE 470 method)
    const spreadAngle = material.phi > 30 ? 45 : 30;
    const tanSpread = Math.tan((spreadAngle * Math.PI) / 180);

    // Effective area at subgrade
    const Leff = Ltrack + 2 * t * tanSpread;
    const Beff = Btrack + 2 * t * tanSpread;
    const Aeff = Leff * Beff;

    // Pressure at subgrade
    const subgradePressure = designLoad / Aeff;

    // Bearing capacity (undrained)
    const Nc = 5.14;
    const qUlt = Nc * cu;
    const qAllow = qUlt / SF;
    const bearingUtil = (subgradePressure / qAllow) * 100;
    const bearingStatus = bearingUtil <= 100 ? 'PASS' : 'FAIL';

    // Punching shear (BRE 470 Annex C)
    const d = t;
    const perimeter = 2 * (Ltrack + d) + 2 * (Btrack + d);
    const tauPunch = (designLoad * 1000) / (perimeter * 1000 * d * 1000); // MPa
    const tauAllow = material.phi > 35 ? 0.05 : 0.03;
    const punchingUtil = (tauPunch / tauAllow) * 100;
    const punchingStatus = punchingUtil <= 100 ? 'PASS' : 'FAIL';

    // Minimum thickness (BRE 470 simplified)
    const tMinBearing = (trackPressure * Btrack) / (2 * qAllow * tanSpread);
    const tMinCBR = 0.025 * Math.sqrt((designLoad * 1000) / subgrade.CBR);
    const minThickness = Math.max(0.3, tMinBearing, tMinCBR) * 1000;
    const thicknessStatus = parseFloat(form.thickness) >= minThickness ? 'PASS' : 'FAIL';

    // Overall status
    const overallStatus =
      bearingStatus === 'PASS' && punchingStatus === 'PASS' && thicknessStatus === 'PASS'
        ? 'PASS'
        : 'FAIL';

    // Rating
    const maxUtil = Math.max(bearingUtil, punchingUtil);
    let rating: string;
    if (overallStatus === 'FAIL') rating = 'CRITICAL';
    else if (maxUtil <= 70) rating = 'OPTIMAL';
    else if (maxUtil <= 85) rating = 'EFFICIENT';
    else rating = 'ACCEPTABLE';

    // Warnings
    if (bearingStatus === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: `Bearing failure: ${subgradePressure.toFixed(0)} kPa > ${qAllow.toFixed(0)} kPa allowable`,
      });
    }
    if (punchingStatus === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: `Punching shear failure: ${(tauPunch * 1000).toFixed(1)} kPa > ${(tauAllow * 1000).toFixed(0)} kPa`,
      });
    }
    if (thicknessStatus === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: `Thickness ${form.thickness}mm < required ${minThickness.toFixed(0)}mm`,
      });
    }
    if (maxUtil > 80 && maxUtil <= 100) {
      newWarnings.push({
        type: 'warning',
        message: `Utilisation ${maxUtil.toFixed(0)}% - near design limit`,
      });
    }
    if (cu < 30) {
      newWarnings.push({
        type: 'info',
        message: 'Very soft ground - consider geogrid reinforcement',
      });
    }
    if (t > 0.9) {
      newWarnings.push({
        type: 'info',
        message: 'Thick platform - verify constructability and compaction',
      });
    }

    setResults({
      designLoad,
      trackPressure,
      effectiveArea: Aeff,
      subgradePressure,
      bearingCapacity: qAllow,
      bearingUtil,
      bearingStatus,
      punchingShear: tauPunch * 1000,
      punchingAllow: tauAllow * 1000,
      punchingUtil,
      punchingStatus,
      minThickness,
      providedThickness: parseFloat(form.thickness),
      thicknessStatus,
      overallStatus,
      rating,
    });

    setWarnings(newWarnings);
  }, [form]);

  // ===========================================================================
  // CANVAS VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applyPlantPreset = (key: string) => {
    const plant = PLANTS[key];
    if (plant) {
      setForm((prev) => ({
        ...prev,
        plant: key,
        weight: plant.weight.toString(),
        trackLength: plant.trackL.toString(),
        trackWidth: plant.trackW.toString(),
        trackSpacing: plant.spacing.toString(),
      }));
    }
  };

  const applySubgradePreset = (key: string) => {
    const subgrade = SUBGRADES[key];
    if (subgrade) {
      setForm((prev) => ({
        ...prev,
        subgrade: key,
        subgradeCu: subgrade.cu.toString(),
      }));
    }
  };

  const applyScenarioPreset = (key: string) => {
    const preset = PRESET_SCENARIOS[key];
    if (preset) {
      const plant = PLANTS[preset.plant];
      setForm((prev) => ({
        ...prev,
        plant: preset.plant,
        weight: plant.weight.toString(),
        trackLength: plant.trackL.toString(),
        trackWidth: plant.trackW.toString(),
        trackSpacing: plant.spacing.toString(),
        material: preset.material,
        subgrade: preset.subgrade,
        subgradeCu: SUBGRADES[preset.subgrade].cu.toString(),
        thickness: preset.thickness,
      }));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ===========================================================================
  // PDF EXPORT
  // ===========================================================================

  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Working Platform Design',
      subtitle: 'BRE 470 — Tracked Plant Working Platform',
      projectInfo: [
        { label: 'Project', value: 'Working Platform Design' },
        { label: 'Reference', value: 'WOR001' },
        { label: 'Standard', value: 'BRE 470 / BS 8004' },
      ],
      inputs: [
        { label: 'Plant Type', value: PLANTS[form.plant]?.name || 'Custom' },
        { label: 'Plant Weight', value: form.weight, unit: 'kN' },
        { label: 'Track Length', value: form.trackLength, unit: 'm' },
        { label: 'Track Width', value: form.trackWidth, unit: 'm' },
        { label: 'Track Spacing', value: form.trackSpacing, unit: 'm' },
        { label: 'Platform Material', value: MATERIALS[form.material]?.name || form.material },
        { label: 'Platform Thickness', value: form.thickness, unit: 'mm' },
        { label: 'Subgrade Type', value: form.subgrade },
        { label: 'Subgrade Cu', value: form.subgradeCu, unit: 'kPa' },
        { label: 'Dynamic Factor', value: form.dynamicFactor },
      ],
      sections: [
        {
          title: 'Working Platform Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Design Load (per track)', results.designLoad.toFixed(1), 'kN'],
            ['Track Contact Pressure', results.trackPressure.toFixed(0), 'kPa'],
            ['Effective Area', results.effectiveArea.toFixed(2), 'm²'],
            ['Subgrade Pressure', results.subgradePressure.toFixed(0), 'kPa'],
            ['Bearing Capacity', results.bearingCapacity.toFixed(0), 'kPa'],
            ['Punching Shear Demand', results.punchingShear.toFixed(0), 'kN'],
            ['Punching Shear Allowable', results.punchingAllow.toFixed(0), 'kN'],
            ['Minimum Thickness Required', results.minThickness.toFixed(0), 'mm'],
            ['Provided Thickness', results.providedThickness.toFixed(0), 'mm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Bearing Capacity',
          capacity: `${results.bearingCapacity.toFixed(0)} kPa`,
          utilisation: String(results.bearingUtil.toFixed(1)) + '%',
          status: results.bearingStatus,
        },
        {
          name: 'Punching Shear',
          capacity: `${results.punchingAllow.toFixed(0)} kN`,
          utilisation: String(results.punchingUtil.toFixed(1)) + '%',
          status: results.punchingStatus,
        },
        {
          name: 'Platform Thickness',
          capacity: `Min ${results.minThickness.toFixed(0)} mm`,
          utilisation:
            String(
              (results.providedThickness >= results.minThickness
                ? (results.minThickness / results.providedThickness) * 100
                : 120
              ).toFixed(1),
            ) + '%',
          status: results.thicknessStatus,
        },
      ],
      recommendations: [
        {
          check: 'Platform Material',
          suggestion: 'Use well-graded granular fill compacted to 95% MDD',
        },
        { check: 'Drainage', suggestion: 'Ensure adequate surface water drainage across platform' },
        {
          check: 'Monitoring',
          suggestion: 'Check platform for rutting and deformation during operations',
        },
      ],
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Working Platform Design · BRE 470',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Working Platform Design',
      subtitle: 'BRE 470 — Tracked Plant Working Platform',
      projectInfo: [
        { label: 'Project', value: 'Working Platform Design' },
        { label: 'Reference', value: 'WOR001' },
        { label: 'Standard', value: 'BRE 470 / BS 8004' },
      ],
      inputs: [
        { label: 'Plant Type', value: PLANTS[form.plant]?.name || 'Custom' },
        { label: 'Plant Weight', value: form.weight, unit: 'kN' },
        { label: 'Track Length', value: form.trackLength, unit: 'm' },
        { label: 'Track Width', value: form.trackWidth, unit: 'm' },
        { label: 'Track Spacing', value: form.trackSpacing, unit: 'm' },
        { label: 'Platform Material', value: MATERIALS[form.material]?.name || form.material },
        { label: 'Platform Thickness', value: form.thickness, unit: 'mm' },
        { label: 'Subgrade Type', value: form.subgrade },
        { label: 'Subgrade Cu', value: form.subgradeCu, unit: 'kPa' },
        { label: 'Dynamic Factor', value: form.dynamicFactor },
      ],
      sections: [
        {
          title: 'Working Platform Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Design Load (per track)', results.designLoad.toFixed(1), 'kN'],
            ['Track Contact Pressure', results.trackPressure.toFixed(0), 'kPa'],
            ['Effective Area', results.effectiveArea.toFixed(2), 'm²'],
            ['Subgrade Pressure', results.subgradePressure.toFixed(0), 'kPa'],
            ['Bearing Capacity', results.bearingCapacity.toFixed(0), 'kPa'],
            ['Punching Shear Demand', results.punchingShear.toFixed(0), 'kN'],
            ['Punching Shear Allowable', results.punchingAllow.toFixed(0), 'kN'],
            ['Minimum Thickness Required', results.minThickness.toFixed(0), 'mm'],
            ['Provided Thickness', results.providedThickness.toFixed(0), 'mm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Bearing Capacity',
          capacity: `${results.bearingCapacity.toFixed(0)} kPa`,
          utilisation: String(results.bearingUtil.toFixed(1)) + '%',
          status: results.bearingStatus,
        },
        {
          name: 'Punching Shear',
          capacity: `${results.punchingAllow.toFixed(0)} kN`,
          utilisation: String(results.punchingUtil.toFixed(1)) + '%',
          status: results.punchingStatus,
        },
        {
          name: 'Platform Thickness',
          capacity: `Min ${results.minThickness.toFixed(0)} mm`,
          utilisation:
            String(
              (results.providedThickness >= results.minThickness
                ? (results.minThickness / results.providedThickness) * 100
                : 120
              ).toFixed(1),
            ) + '%',
          status: results.thicknessStatus,
        },
      ],
      recommendations: [
        {
          check: 'Platform Material',
          suggestion: 'Use well-graded granular fill compacted to 95% MDD',
        },
        { check: 'Drainage', suggestion: 'Ensure adequate surface water drainage across platform' },
        {
          check: 'Monitoring',
          suggestion: 'Check platform for rutting and deformation during operations',
        },
      ],
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Working Platform Design · BRE 470',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4">
            <FiTarget className="text-neon-cyan" />
            <span className="text-gray-300 font-mono tracking-wider">GEOTECHNICS | BRE 470</span>
          </div>
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Working Platform
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">BS 5975 working platform design</p>
        </motion.div>

        {/* Presets */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {Object.entries(PRESET_SCENARIOS).map(([key, preset]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => applyScenarioPreset(key)}
              className="bg-black/30 border-gray-700 text-gray-300 hover:bg-neon-cyan/10 hover:border-neon-cyan/50"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Status Banner */}
        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mb-8 p-4 rounded-xl border-2 shadow-lg flex items-center justify-between',
              results.overallStatus === 'PASS'
                ? 'bg-green-950/30 border-green-500/30'
                : 'bg-red-950/30 border-red-500/30',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center',
                  results.overallStatus === 'PASS' ? 'bg-green-500/20' : 'bg-red-500/20',
                )}
              >
                {results.overallStatus === 'PASS' ? (
                  <FiCheck className="w-6 h-6 text-green-400" />
                ) : (
                  <FiX className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div>
                <div
                  className={cn(
                    'text-xl font-bold',
                    results.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400',
                  )}
                >
                  {results.rating} — Bearing {results.bearingUtil.toFixed(0)}%
                </div>
                <div className="text-gray-400 text-sm">
                  Required: {results.minThickness.toFixed(0)}mm | Provided:{' '}
                  {results.providedThickness}mm
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button
                onClick={exportDOCX}
                className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton
                calculatorKey="working-platform"
                inputs={form as unknown as Record<string, string | number>}
                results={results}
                status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
              />
            </div>
          </motion.div>
        )}

        {/* Warnings */}

        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6 space-y-2"
          >
            {warnings.map((warning, i) => (
              <div
                key={i}
                className={cn(
                  'px-4 py-3 rounded-lg flex items-center gap-3 text-sm',
                  warning.type === 'error' && 'bg-red-950/50 border border-red-500/30 text-red-300',
                  warning.type === 'warning' &&
                    'bg-yellow-950/50 border border-yellow-500/30 text-yellow-300',
                  warning.type === 'info' &&
                    'bg-blue-950/50 border border-blue-500/30 text-blue-300',
                )}
              >
                {warning.type === 'error' && <FiX className="w-4 h-4" />}
                {warning.type === 'warning' && <FiAlertTriangle className="w-4 h-4" />}
                {warning.type === 'info' && <FiInfo className="w-4 h-4" />}
                {warning.message}
              </div>
            ))}
            {/* Main Grid */}
            <AnimatePresence mode="wait">
              {activeTab === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid lg:grid-cols-3 gap-8"
                >
                  {/* Inputs */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Plant */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between"
                        onClick={() => toggleSection('plant')}
                      >
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiTruck className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Plant Details</span>
                        </CardTitle>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.plant && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.plant && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Plant Type
                              </label>
                              <select
                                title="Plant"
                                value={form.plant}
                                onChange={(e) => applyPlantPreset(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                              >
                                {Object.entries(PLANTS).map(([key, p]) => (
                                  <option key={key} value={key}>
                                    {p.name} ({p.weight}kN)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Weight"
                              value={form.weight}
                              onChange={(v) => setForm({ ...form, weight: v })}
                              unit="kN"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Track L"
                                value={form.trackLength}
                                onChange={(v) => setForm({ ...form, trackLength: v })}
                                unit="m"
                              />
                              <InputField
                                label="Track W"
                                value={form.trackWidth}
                                onChange={(v) => setForm({ ...form, trackWidth: v })}
                                unit="m"
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Tab Navigation */}
                    <div className="flex justify-center gap-4 mb-8">
                      {['input', 'results', 'visualization'].map((tab) => (
                        <Button
                          key={tab}
                          variant={activeTab === tab ? 'neon' : 'ghost'}
                          onClick={() => setActiveTab(tab as any)}
                          disabled={tab !== 'input' && !results}
                          className={cn(
                            'px-8 py-3 rounded-xl font-semibold capitalize',
                            activeTab === tab
                              ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg'
                              : 'text-gray-400',
                          )}
                        >
                          {tab === 'input'
                            ? '🏗️ Input'
                            : tab === 'results'
                              ? '📊 Results'
                              : '🎨 Visualization'}
                        </Button>
                      ))}
                    </div>

                    {/* Platform */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between"
                        onClick={() => toggleSection('platform')}
                      >
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiGrid className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Platform Specification</span>
                        </CardTitle>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.platform && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.platform && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Material
                              </label>
                              <select
                                title="Material"
                                value={form.material}
                                onChange={(e) => setForm({ ...form, material: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                              >
                                {Object.entries(MATERIALS).map(([key, m]) => (
                                  <option key={key} value={key}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Thickness"
                              value={form.thickness}
                              onChange={(v) => setForm({ ...form, thickness: v })}
                              unit="mm"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Ground */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between"
                        onClick={() => toggleSection('ground')}
                      >
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiLayers className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Subgrade Conditions</span>
                        </CardTitle>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.ground && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.ground && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Subgrade Type
                              </label>
                              <select
                                title="Subgrade"
                                value={form.subgrade}
                                onChange={(e) => applySubgradePreset(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                              >
                                {Object.entries(SUBGRADES).map(([key, s]) => (
                                  <option key={key} value={key}>
                                    {s.name} (cu={s.cu})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Undrained Shear Strength"
                              value={form.subgradeCu}
                              onChange={(v) => setForm({ ...form, subgradeCu: v })}
                              unit="kPa"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Calculate Button */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center pt-4"
                    >
                      <Button
                        onClick={() => {
                          setForm((prev) => ({ ...prev }));
                          setActiveTab('results');
                        }}
                        className="px-16 py-8 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl"
                      >
                        RUN FULL ANALYSIS
                      </Button>
                    </motion.div>

                    {/* Factors */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between"
                        onClick={() => toggleSection('factors')}
                      >
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiTarget className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Design Factors</span>
                        </CardTitle>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.factors && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.factors && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Dynamic Factor"
                                value={form.dynamicFactor}
                                onChange={(v) => setForm({ ...form, dynamicFactor: v })}
                                unit=""
                              />
                              <InputField
                                label="Safety Factor"
                                value={form.safetyFactor}
                                onChange={(v) => setForm({ ...form, safetyFactor: v })}
                                unit=""
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>
                  </div>

                  {/* Visualization & Results — Sticky Right Column */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-32 space-y-6">
                      {/* Fullscreen Preview Overlay */}
                      {previewMaximized && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                        >
                          <div className="flex-1 relative">
                            <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                              <WorkingPlatform3D />
                            </Interactive3DDiagram>
                            <button
                              onClick={() => setPreviewMaximized(false)}
                              className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                              aria-label="Minimize preview"
                            >
                              <FiMinimize2 size={20} />
                            </button>
                            <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                              WORKING PLATFORM — REAL-TIME PREVIEW
                            </div>
                          </div>
                          <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                            <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                              <FiSliders size={14} /> Live Parameters
                            </h3>
                            {[
                              {
                                label: 'Plant Weight',
                                field: 'weight' as keyof FormData,
                                min: 50,
                                max: 2000,
                                step: 50,
                                unit: 'kN',
                              },
                              {
                                label: 'Track Length',
                                field: 'trackLength' as keyof FormData,
                                min: 1,
                                max: 10,
                                step: 0.1,
                                unit: 'm',
                              },
                              {
                                label: 'Track Width',
                                field: 'trackWidth' as keyof FormData,
                                min: 0.2,
                                max: 2,
                                step: 0.1,
                                unit: 'm',
                              },
                              {
                                label: 'Track Spacing',
                                field: 'trackSpacing' as keyof FormData,
                                min: 1,
                                max: 6,
                                step: 0.1,
                                unit: 'm',
                              },
                              {
                                label: 'Thickness',
                                field: 'thickness' as keyof FormData,
                                min: 200,
                                max: 1500,
                                step: 50,
                                unit: 'mm',
                              },
                              {
                                label: 'Subgrade Cu',
                                field: 'subgradeCu' as keyof FormData,
                                min: 10,
                                max: 200,
                                step: 5,
                                unit: 'kPa',
                              },
                              {
                                label: 'Dynamic Factor',
                                field: 'dynamicFactor' as keyof FormData,
                                min: 1.0,
                                max: 2.0,
                                step: 0.1,
                                unit: '',
                              },
                              {
                                label: 'Safety Factor',
                                field: 'safetyFactor' as keyof FormData,
                                min: 1.0,
                                max: 3.0,
                                step: 0.1,
                                unit: '',
                              },
                            ].map((s) => (
                              <div key={s.field} className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                  <span className="text-gray-400">{s.label}</span>
                                  <span className="text-white">
                                    {form[s.field]} {s.unit}
                                  </span>
                                </div>
                                <input
                                  title={s.label}
                                  type="range"
                                  min={s.min}
                                  max={s.max}
                                  step={s.step}
                                  value={form[s.field]}
                                  onChange={(e) => updateForm(s.field, e.target.value)}
                                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                                />
                              </div>
                            ))}
                            <div className="border-t border-gray-700 pt-4">
                              <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                                <FiActivity size={14} /> Live Readout
                              </h3>
                              {[
                                { label: 'Plant', value: PLANTS[form.plant]?.name || form.plant },
                                {
                                  label: 'Material',
                                  value: MATERIALS[form.material]?.name || form.material,
                                },
                                {
                                  label: 'Subgrade',
                                  value: SUBGRADES[form.subgrade]?.name || form.subgrade,
                                },
                                { label: 'Thickness', value: `${form.thickness} mm` },
                                {
                                  label: 'Factors',
                                  value: `γd=${form.dynamicFactor} × FoS=${form.safetyFactor}`,
                                },
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
                                      label: 'Bearing',
                                      util: results.bearingUtil.toFixed(0),
                                      status: results.bearingStatus,
                                    },
                                    {
                                      label: 'Punching',
                                      util: results.punchingUtil.toFixed(0),
                                      status: results.punchingStatus,
                                    },
                                    {
                                      label: 'Thickness',
                                      util:
                                        results.providedThickness >= results.minThickness
                                          ? (
                                              (results.minThickness / results.providedThickness) *
                                              100
                                            ).toFixed(0)
                                          : '100+',
                                      status: results.thicknessStatus,
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
                                          check.status === 'FAIL'
                                            ? 'text-red-500'
                                            : parseFloat(String(check.util)) > 90
                                              ? 'text-orange-400'
                                              : 'text-emerald-400',
                                        )}
                                      >
                                        {check.util}%
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
                        title="Working Platform — 3D Preview"
                        sliders={whatIfSliders}
                        form={form}
                        updateForm={updateForm}
                        status={
                          (results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined
                        }
                        onMaximize={() => setPreviewMaximized(true)}
                        renderScene={(fsHeight) => (
                          <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                            <WorkingPlatform3D />
                          </Interactive3DDiagram>
                        )}
                      />

                      {results && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <ResultCard
                            label="Bearing"
                            value={`${results.bearingUtil.toFixed(0)}%`}
                            limit={`≤ 100%`}
                            status={
                              results.bearingStatus === 'PASS'
                                ? results.bearingUtil < 70
                                  ? 'pass'
                                  : 'warning'
                                : 'fail'
                            }
                          />
                          <ResultCard
                            label="Punching"
                            value={`${results.punchingUtil.toFixed(0)}%`}
                            limit="≤ 100%"
                            status={results.punchingStatus === 'PASS' ? 'pass' : 'fail'}
                          />
                          <ResultCard
                            label="Min Thickness"
                            value={`${results.minThickness.toFixed(0)}mm`}
                            limit={`Provided: ${results.providedThickness}mm`}
                            status={results.thicknessStatus === 'PASS' ? 'pass' : 'fail'}
                          />
                          <ResultCard
                            label="Design Load"
                            value={`${results.designLoad.toFixed(0)} kN`}
                            limit="Per track (factored)"
                            status="info"
                          />
                        </div>
                      )}

                      {results && (
                        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                          <CardHeader className="py-3">
                            <CardTitle className="text-white text-sm flex items-center gap-2">
                              <FiInfo className="text-neon-cyan" />
                              Design Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Track Pressure
                                </div>
                                <div className="text-white font-mono">
                                  {results.trackPressure.toFixed(0)} kPa
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Subgrade Pressure
                                </div>
                                <div className="text-amber-400 font-mono">
                                  {results.subgradePressure.toFixed(0)} kPa
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Bearing Capacity
                                </div>
                                <div className="text-white font-mono">
                                  {results.bearingCapacity.toFixed(0)} kPa
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Effective Area
                                </div>
                                <div className="text-white font-mono">
                                  {results.effectiveArea.toFixed(2)} m²
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <div className="lg:hidden">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={exportPDF}
                            className="w-full bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
                            disabled={!results}
                          >
                            <FiDownload className="mr-2" />
                            Export PDF Report
                          </Button>
                          <Button
                            onClick={exportDOCX}
                            className="w-full bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                            disabled={!results}
                          >
                            <FiDownload className="mr-2" />
                            DOCX
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────── Results Tab ───────────── */}
              {activeTab === 'results' && results && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  {/* Border-l-4 Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card
                      variant="glass"
                      className={cn(
                        'border-l-4 p-6 shadow-2xl',
                        results.overallStatus === 'PASS'
                          ? 'border-l-emerald-500 border-neon-cyan/30'
                          : 'border-l-red-500 border-red-500/30',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {results.overallStatus === 'PASS' ? (
                          <FiCheck className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <FiX className="w-5 h-5 text-red-400" />
                        )}
                        <h3 className="text-white font-bold">Overall Status</h3>
                      </div>
                      <div
                        className={cn(
                          'text-2xl font-black',
                          results.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results.overallStatus}
                      </div>
                      <p className="text-gray-500 text-xs mt-1">Rating: {results.rating}</p>
                    </Card>
                    <Card
                      variant="glass"
                      className="border-l-4 border-l-neon-cyan border-neon-cyan/30 p-6 shadow-2xl"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FiCheck className="w-5 h-5 text-neon-cyan" />
                        <h3 className="text-white font-bold">Design Load</h3>
                      </div>
                      <div className="text-3xl font-black text-neon-cyan">
                        {results.designLoad.toFixed(0)} kN
                      </div>
                      <p className="text-gray-500 text-xs mt-1">Per track (factored)</p>
                    </Card>
                    <Card
                      variant="glass"
                      className="border-l-4 border-l-neon-purple border-neon-cyan/30 p-6 shadow-2xl"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FiCheck className="w-5 h-5 text-neon-purple" />
                        <h3 className="text-white font-bold">Plant</h3>
                      </div>
                      <div className="text-xl font-bold text-gray-300">
                        {PLANTS[form.plant]?.name || 'Custom'}
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {form.weight} kN — {MATERIALS[form.material]?.name}
                      </p>
                    </Card>
                  </div>

                  {/* Individual Check Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        name: 'Bearing Capacity',
                        util: results.bearingUtil,
                        cap: `${results.bearingCapacity.toFixed(0)} kPa`,
                        demand: `Pressure: ${results.subgradePressure.toFixed(0)} kPa`,
                      },
                      {
                        name: 'Punching Shear',
                        util: results.punchingUtil,
                        cap: `${results.punchingAllow.toFixed(0)} kN`,
                        demand: `Shear: ${results.punchingShear.toFixed(0)} kN`,
                      },
                      {
                        name: 'Platform Thickness',
                        util:
                          results.providedThickness >= results.minThickness
                            ? (results.minThickness / results.providedThickness) * 100
                            : 120,
                        cap: `Min: ${results.minThickness.toFixed(0)} mm`,
                        demand: `Provided: ${results.providedThickness} mm`,
                      },
                    ].map((check) => (
                      <Card
                        key={check.name}
                        variant="glass"
                        className={cn(
                          'border-l-4 p-4 shadow-2xl',
                          check.util > 100
                            ? 'border-l-red-500 border-red-500/30'
                            : 'border-l-emerald-500 border-neon-cyan/30',
                        )}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            {check.util <= 100 ? (
                              <FiCheck className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <FiX className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-white font-semibold">{check.name}</span>
                          </div>
                          <span
                            className={cn(
                              'text-xs font-bold px-2 py-1 rounded',
                              check.util <= 100
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400',
                            )}
                          >
                            {check.util <= 100 ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {check.util.toFixed(1)}%
                        </div>
                        <p className="text-gray-500 text-xs mt-1">Capacity: {check.cap}</p>
                        <p className="text-gray-500 text-xs">{check.demand}</p>
                        <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(check.util, 100)}%` }}
                            className={cn(
                              'h-full rounded-full',
                              check.util <= 70
                                ? 'bg-emerald-500'
                                : check.util <= 100
                                  ? 'bg-amber-500'
                                  : 'bg-red-500',
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Design Summary */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-400">Design Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Track Pressure</p>
                        <p className="text-white font-mono">
                          {results.trackPressure.toFixed(0)} kPa
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Subgrade Pressure</p>
                        <p className="text-amber-400 font-mono">
                          {results.subgradePressure.toFixed(0)} kPa
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Bearing Capacity</p>
                        <p className="text-white font-mono">
                          {results.bearingCapacity.toFixed(0)} kPa
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Effective Area</p>
                        <p className="text-white font-mono">
                          {results.effectiveArea.toFixed(2)} m²
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Design Codes */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-400">Design Codes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs text-gray-500">
                      <p>BRE 470 — Working platforms for tracked plant</p>
                      <p>BS 8004 — Code of practice for foundations</p>
                      <p>Eurocode 7 — Geotechnical design</p>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardContent className="py-4">
                      <h4 className="text-neon-cyan font-semibold text-sm mb-3 flex items-center gap-2">
                        <FiCheck className="w-4 h-4" /> Recommendations
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-neon-cyan mt-1 flex-shrink-0" />
                          <span>
                            Use well-graded granular fill compacted to 95% MDD for platform
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-neon-cyan mt-1 flex-shrink-0" />
                          <span>Ensure adequate surface water drainage across the platform</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-neon-cyan mt-1 flex-shrink-0" />
                          <span>
                            Monitor platform for rutting and deformation during operations
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-neon-cyan mt-1 flex-shrink-0" />
                          <span>Verify subgrade strength with plate bearing tests before use</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Export */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={exportPDF}
                      className="w-full bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
                    >
                      <FiDownload className="w-4 h-4 mr-2" />
                      Export PDF Report
                    </Button>
                    <Button
                      onClick={exportDOCX}
                      className="w-full bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                    >
                      <FiDownload className="w-4 h-4 mr-2" />
                      DOCX
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ───────────── Visualization Tab ───────────── */}
              {activeTab === 'visualization' && (
                <motion.div
                  key="visualization"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <Card
                    variant="glass"
                    className="overflow-hidden border-neon-cyan/30 shadow-2xl p-4"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-2xl">
                      <Interactive3DDiagram
                        height="500px"
                        cameraPosition={[8, 6, 8]}
                        status={results ? (results.overallStatus as 'PASS' | 'FAIL') : undefined}
                      >
                        <WorkingPlatform3D />
                      </Interactive3DDiagram>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const InputField = ({
  label,
  value,
  onChange,
  unit,
  field,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  field?: string;
}) => (
  <div>
    <ExplainableLabel
      label={`${label}${unit ? ` (${unit})` : ''}`}
      field={field || 'working-platform'}
    />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300 font-mono"
    />
  </div>
);

const ResultCard = ({
  label,
  value,
  limit,
  status,
}: {
  label: string;
  value: string;
  limit: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 text-center border',
      status === 'pass' && 'border-green-500/30 bg-green-950/20',
      status === 'fail' && 'border-red-500/30 bg-red-950/20',
      status === 'warning' && 'border-yellow-500/30 bg-yellow-950/20',
      status === 'info' && 'border-amber-500/30 bg-amber-950/20',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' && 'text-green-400',
        status === 'fail' && 'text-red-400',
        status === 'warning' && 'text-yellow-400',
        status === 'info' && 'text-amber-400',
      )}
    >
      {value}
    </div>
    {limit && <div className="text-xs text-gray-500 mt-1">{limit}</div>}
    {status !== 'info' && (
      <div
        className={cn(
          'text-xs font-bold mt-2',
          status === 'pass' && 'text-green-600',
          status === 'fail' && 'text-red-600',
          status === 'warning' && 'text-yellow-600',
        )}
      >
        {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'CHECK'}
      </div>
    )}
  </Card>
);

export default WorkingPlatform;
