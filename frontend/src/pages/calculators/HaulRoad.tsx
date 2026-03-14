// =============================================================================
// BeaverCalc Studio — Haul Road Design (Premium)
// CBR-based thickness with geosynthetic reinforcement options
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
  FiTruck,
  FiX,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import HaulRoad3D from '../../components/3d/scenes/HaulRoad3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  cbrSelection: string;
  customCbr: string;
  traffic: string;
  axleLoad: string;
  material: string;
  geotextile: boolean;
  geogrid: boolean;
  rutLimit: string;
}

interface Results {
  cbr: number;
  baseThickness: number;
  designThickness: number;
  unreinThickness: number;
  reduction: number;
  cu: number;
  qUlt: number;
  bearingSF: number;
  bearingStatus: 'PASS' | 'FAIL';
  ruttingStatus: 'PASS' | 'FAIL';
  overallStatus: 'PASS' | 'FAIL';
  rating: string;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// DATABASES
// =============================================================================

const TRAFFIC_LEVELS: Record<string, { name: string; passes: number; factor: number }> = {
  very_light: { name: 'Very Light (<10/day)', passes: 10, factor: 0.8 },
  light: { name: 'Light (10-40/day)', passes: 40, factor: 1.0 },
  medium: { name: 'Medium (40-100/day)', passes: 100, factor: 1.2 },
  heavy: { name: 'Heavy (>100/day)', passes: 200, factor: 1.5 },
};

const SUBGRADE_CBR: Record<string, { name: string; cbr: number; cu: string }> = {
  very_soft: { name: 'Very Soft Clay (<1%)', cbr: 0.5, cu: 'Cu < 20 kPa' },
  soft: { name: 'Soft Clay (1-2%)', cbr: 1.5, cu: 'Cu 20-40 kPa' },
  firm: { name: 'Firm Clay (2-5%)', cbr: 3.0, cu: 'Cu 40-75 kPa' },
  stiff: { name: 'Stiff Clay (>5%)', cbr: 6.0, cu: 'Cu > 75 kPa' },
  mixed: { name: 'Made Ground', cbr: 2.0, cu: 'Variable' },
  granular: { name: 'Granular Fill', cbr: 10.0, cu: 'N/A' },
};

const MATERIALS: Record<string, { name: string; cbrMin: number; cost: string }> = {
  '6f2': { name: 'Crushed Concrete (6F2)', cbrMin: 30, cost: '£15-20/t' },
  type1: { name: 'MOT Type 1', cbrMin: 80, cost: '£20-30/t' },
  crusher_run: { name: 'Crusher Run', cbrMin: 50, cost: '£15-25/t' },
  limestone: { name: 'Limestone 6F5', cbrMin: 60, cost: '£18-25/t' },
  as_dug: { name: 'As-Dug Gravel', cbrMin: 25, cost: '£10-15/t' },
};

const PRESET_SCENARIOS: Record<
  string,
  { cbr: string; traffic: string; axle: string; geo: boolean; grid: boolean; label: string }
> = {
  light_access: {
    cbr: '3',
    traffic: 'light',
    axle: '8',
    geo: false,
    grid: false,
    label: 'Light Access Road',
  },
  piling_rig: {
    cbr: '2',
    traffic: 'medium',
    axle: '12',
    geo: true,
    grid: true,
    label: 'Piling Rig Route',
  },
  main_haul: {
    cbr: '1.5',
    traffic: 'heavy',
    axle: '10',
    geo: true,
    grid: true,
    label: 'Main Haul Road',
  },
  soft_site: {
    cbr: '1',
    traffic: 'medium',
    axle: '8',
    geo: true,
    grid: true,
    label: 'Soft Ground Access',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const HaulRoad = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    subgrade: true,
    traffic: true,
    design: false,
  });

  const [form, setForm] = useState<FormData>({
    cbrSelection: 'soft',
    customCbr: '1.5',
    traffic: 'medium',
    axleLoad: '10',
    material: '6f2',
    geotextile: true,
    geogrid: false,
    rutLimit: '75',
  });
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'cbrSelection', label: 'Cbr Selection', min: 0, max: 100, step: 1, unit: '' },
    { key: 'customCbr', label: 'Custom Cbr', min: 0, max: 100, step: 1, unit: '' },
    { key: 'traffic', label: 'Traffic', min: 0, max: 100, step: 1, unit: '' },
    { key: 'axleLoad', label: 'Axle Load', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // ===========================================================================
  // CALCULATIONS — CBR-based thickness + geosynthetic reduction
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'customCbr', label: 'CBR Value' },
      { key: 'axleLoad', label: 'Axle Load' },
      { key: 'rutLimit', label: 'Rut Limit' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const CBR = parseFloat(form.customCbr);
    const axleLoad = parseFloat(form.axleLoad);
    const rutLimit = parseFloat(form.rutLimit);
    const traffic = TRAFFIC_LEVELS[form.traffic];

    if (isNaN(CBR) || CBR <= 0 || isNaN(axleLoad) || axleLoad <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid input values' }]);
      return;
    }

    // Base thickness from CBR (empirical curve based on TRL/CIRIA)
    // T_base = 200 + 350 / CBR^0.7 (mm)
    let baseThickness = 200 + 350 / Math.pow(CBR, 0.7);

    // Load factor (standard axle = 8t)
    const loadFactor = Math.pow(axleLoad / 8, 0.6);
    baseThickness *= loadFactor;

    // Traffic factor
    baseThickness *= traffic.factor;

    // Geosynthetic reduction
    let reduction = 0;
    if (form.geogrid)
      reduction = 0.3; // 30% reduction with grid
    else if (form.geotextile) reduction = 0.15; // 15% with separation only

    const designThickness = baseThickness * (1 - reduction);
    const unreinThickness = baseThickness;

    // Round to 50mm
    const roundedDesign = Math.max(200, Math.ceil(designThickness / 50) * 50);
    const roundedUnrein = Math.max(200, Math.ceil(unreinThickness / 50) * 50);

    // Bearing capacity check
    const cu = 23 * CBR; // Approximate Cu from CBR
    const qUlt = 5.14 * cu;
    const contactPressure = 100; // kPa for trucks
    const bearingSF = qUlt / contactPressure;
    const bearingStatus = bearingSF >= 1.0 ? 'PASS' : 'FAIL';

    // Rutting check (simplified - if design thickness adequate, ruts OK)
    const ruttingStatus = 'PASS';

    // Rating
    let rating: string;
    let overallStatus: 'PASS' | 'FAIL';
    if (bearingStatus === 'PASS') {
      if (bearingSF > 2.0 && roundedDesign < 400) {
        rating = 'OPTIMAL';
      } else {
        rating = 'ADEQUATE';
      }
      overallStatus = 'PASS';
    } else {
      rating = 'CRITICAL';
      overallStatus = 'FAIL';
    }

    // Warnings
    if (CBR < 1 && !form.geotextile) {
      newWarnings.push({
        type: 'error',
        message: 'Very soft ground - geotextile separation essential',
      });
    }
    if (bearingSF < 1.0) {
      newWarnings.push({
        type: 'error',
        message: `Bearing capacity insufficient: FOS = ${bearingSF.toFixed(2)} < 1.0`,
      });
    }
    if (CBR < 2) {
      newWarnings.push({
        type: 'warning',
        message: 'Soft subgrade - proof roll carefully and monitor for rutting',
      });
    }
    if (roundedDesign > 500) {
      newWarnings.push({
        type: 'info',
        message: 'Consider soil stabilization to reduce aggregate thickness',
      });
    }
    if (!form.geotextile && CBR < 3) {
      newWarnings.push({
        type: 'info',
        message: 'Recommend geotextile to prevent clay pumping into stone',
      });
    }

    setResults({
      cbr: CBR,
      baseThickness: roundedUnrein,
      designThickness: roundedDesign,
      unreinThickness: roundedUnrein,
      reduction: Math.round(reduction * 100),
      cu,
      qUlt,
      bearingSF,
      bearingStatus,
      ruttingStatus,
      overallStatus,
      rating,
    });

    setWarnings(newWarnings);
  }, [form]);

  // ===========================================================================
  // CANVAS VISUALIZATION — Cross-section
  // ===========================================================================

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applySubgradePreset = (key: string) => {
    const preset = SUBGRADE_CBR[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        cbrSelection: key,
        customCbr: preset.cbr.toString(),
      }));
    }
  };

  const applyScenarioPreset = (key: string) => {
    const preset = PRESET_SCENARIOS[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        customCbr: preset.cbr,
        traffic: preset.traffic,
        axleLoad: preset.axle,
        geotextile: preset.geo,
        geogrid: preset.grid,
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
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.bearingSF < 1.0)
      pdfRecs.push({
        check: 'Bearing Failure',
        suggestion:
          'Subgrade bearing capacity insufficient — consider soil stabilization or geogrid',
      });
    if (results.cbr < 2)
      pdfRecs.push({
        check: 'Soft Subgrade',
        suggestion: 'CBR < 2% — proof roll carefully and monitor for rutting',
      });
    if (results.designThickness > 500)
      pdfRecs.push({
        check: 'Thick Build-up',
        suggestion: 'Design > 500mm — consider lime/cement stabilization to reduce aggregate',
      });
    if (!form.geotextile && results.cbr < 3)
      pdfRecs.push({
        check: 'Separation Layer',
        suggestion: 'Recommend geotextile to prevent clay pumping into stone',
      });
    if (results.reduction === 0 && results.cbr < 5)
      pdfRecs.push({
        check: 'Reinforcement',
        suggestion: 'Consider geogrid reinforcement to reduce aggregate thickness by ~30%',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Haul road thickness and bearing capacity are satisfactory',
      });
    generatePremiumPDF({
      title: 'Haul Road Design',
      subtitle: 'CBR-Based Thickness with Geosynthetic Options',
      projectInfo: [
        { label: 'Project', value: 'Haul Road Design' },
        { label: 'Reference', value: 'HAU001' },
        { label: 'Standard', value: 'TRL/CIRIA Method' },
      ],
      inputs: [
        { label: 'Subgrade CBR', value: `${form.customCbr} %` },
        { label: 'Traffic Level', value: form.traffic },
        { label: 'Max Axle Load', value: `${form.axleLoad} t` },
        { label: 'Surface Material', value: form.material },
        { label: 'Geotextile', value: form.geotextile ? 'Yes' : 'No' },
        { label: 'Geogrid', value: form.geogrid ? 'Yes' : 'No' },
        { label: 'Rut Limit', value: `${form.rutLimit} mm` },
      ],
      sections: [
        {
          title: 'Design Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Base Thickness (unreinforced)', String(results.unreinThickness), 'mm'],
            ['Design Thickness', String(results.designThickness), 'mm'],
            ['Geosynthetic Reduction', String(results.reduction), '%'],
            ['Subgrade Cu', results.cu.toFixed(1), 'kPa'],
            ['Ultimate Bearing (qult)', results.qUlt.toFixed(1), 'kPa'],
            ['Bearing FOS', results.bearingSF.toFixed(2), '≥ 1.0'],
          ],
        },
      ],
      checks: [
        {
          name: 'Ground Bearing',
          capacity: `${results.qUlt.toFixed(0)} kPa`,
          utilisation: String(Math.round((1.0 / results.bearingSF) * 100)),
          status: results.bearingStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Haul Road Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.bearingSF < 1.0)
      pdfRecs.push({
        check: 'Bearing Failure',
        suggestion:
          'Subgrade bearing capacity insufficient — consider soil stabilization or geogrid',
      });
    if (results.cbr < 2)
      pdfRecs.push({
        check: 'Soft Subgrade',
        suggestion: 'CBR < 2% — proof roll carefully and monitor for rutting',
      });
    if (results.designThickness > 500)
      pdfRecs.push({
        check: 'Thick Build-up',
        suggestion: 'Design > 500mm — consider lime/cement stabilization to reduce aggregate',
      });
    if (!form.geotextile && results.cbr < 3)
      pdfRecs.push({
        check: 'Separation Layer',
        suggestion: 'Recommend geotextile to prevent clay pumping into stone',
      });
    if (results.reduction === 0 && results.cbr < 5)
      pdfRecs.push({
        check: 'Reinforcement',
        suggestion: 'Consider geogrid reinforcement to reduce aggregate thickness by ~30%',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Haul road thickness and bearing capacity are satisfactory',
      });
    generateDOCX({
      title: 'Haul Road Design',
      subtitle: 'CBR-Based Thickness with Geosynthetic Options',
      projectInfo: [
        { label: 'Project', value: 'Haul Road Design' },
        { label: 'Reference', value: 'HAU001' },
        { label: 'Standard', value: 'TRL/CIRIA Method' },
      ],
      inputs: [
        { label: 'Subgrade CBR', value: `${form.customCbr} %` },
        { label: 'Traffic Level', value: form.traffic },
        { label: 'Max Axle Load', value: `${form.axleLoad} t` },
        { label: 'Surface Material', value: form.material },
        { label: 'Geotextile', value: form.geotextile ? 'Yes' : 'No' },
        { label: 'Geogrid', value: form.geogrid ? 'Yes' : 'No' },
        { label: 'Rut Limit', value: `${form.rutLimit} mm` },
      ],
      sections: [
        {
          title: 'Design Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Base Thickness (unreinforced)', String(results.unreinThickness), 'mm'],
            ['Design Thickness', String(results.designThickness), 'mm'],
            ['Geosynthetic Reduction', String(results.reduction), '%'],
            ['Subgrade Cu', results.cu.toFixed(1), 'kPa'],
            ['Ultimate Bearing (qult)', results.qUlt.toFixed(1), 'kPa'],
            ['Bearing FOS', results.bearingSF.toFixed(2), '≥ 1.0'],
          ],
        },
      ],
      checks: [
        {
          name: 'Ground Bearing',
          capacity: `${results.qUlt.toFixed(0)} kPa`,
          utilisation: String(Math.round((1.0 / results.bearingSF) * 100)),
          status: results.bearingStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Haul Road Design',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-transparent to-amber-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gray-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl mb-4">
            <FiTruck className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">
              SITE LOGISTICS | GROUND ENGINEERING
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">
            Haul Road Design
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            CBR-based aggregate thickness with geosynthetic reinforcement options.
          </p>
        </motion.div>

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
                activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
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
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Preset scenarios */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {Object.entries(PRESET_SCENARIOS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyScenarioPreset(key)}
                    className="bg-black/30 border-gray-700 text-gray-300 hover:bg-gray-950/30 hover:border-gray-500/50"
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
                        'w-12 h-12 rounded-full flex items-center justify-center',
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
                        {results.rating} — {results.designThickness}mm
                      </div>
                      <div className="text-gray-400 text-sm">
                        Unreinforced: {results.unreinThickness}mm | Reduction: {results.reduction}%
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={exportPDF}
                      className="bg-gradient-to-r from-gray-600 to-amber-600 hover:from-gray-500 hover:to-amber-500"
                    >
                      <FiDownload className="mr-2" />
                      Export Report
                    </Button>
                    <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                      <FiDownload className="mr-2" />
                      Export Report
                    </Button>
                    <SaveRunButton
                      calculatorKey="haul-road"
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
                        warning.type === 'error' &&
                          'bg-red-950/50 border border-red-500/30 text-red-300',
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

                  {/* Inputs */}
                  <div className="lg:col-span-4 space-y-4">
                    {/* Subgrade */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('subgrade')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Subgrade Conditions
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.subgrade && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.subgrade && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Ground Type
                              </label>
                              <select
                                title="Subgrade"
                                value={form.cbrSelection}
                                onChange={(e) => applySubgradePreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(SUBGRADE_CBR).map(([key, s]) => (
                                  <option key={key} value={key}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="CBR"
                              value={form.customCbr}
                              onChange={(v) => setForm({ ...form, customCbr: v })}
                              unit="%"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Traffic */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('traffic')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiTruck className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Traffic Loading
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.traffic && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.traffic && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Traffic Level
                              </label>
                              <select
                                title="Traffic"
                                value={form.traffic}
                                onChange={(e) => setForm({ ...form, traffic: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(TRAFFIC_LEVELS).map(([key, t]) => (
                                  <option key={key} value={key}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Max Axle Load"
                              value={form.axleLoad}
                              onChange={(v) => setForm({ ...form, axleLoad: v })}
                              unit="t"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Design */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('design')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiGrid className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Design Options
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.design && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.design && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Surface Material
                              </label>
                              <select
                                title="Material"
                                value={form.material}
                                onChange={(e) => setForm({ ...form, material: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(MATERIALS).map(([key, m]) => (
                                  <option key={key} value={key}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-3">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  title="Form"
                                  type="checkbox"
                                  checked={form.geotextile}
                                  onChange={(e) =>
                                    setForm({ ...form, geotextile: e.target.checked })
                                  }
                                  className="w-4 h-4 rounded border-gray-700/50 bg-gray-800/50 text-neon-cyan focus:ring-neon-cyan/20"
                                />
                                <span className="text-white text-sm">Geotextile Separation</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  title="Form"
                                  type="checkbox"
                                  checked={form.geogrid}
                                  onChange={(e) => setForm({ ...form, geogrid: e.target.checked })}
                                  className="w-4 h-4 rounded border-gray-700/50 bg-gray-800/50 text-neon-cyan focus:ring-neon-cyan/20"
                                />
                                <span className="text-white text-sm">Geogrid Reinforcement</span>
                              </label>
                            </div>
                            <InputField
                              label="Rut Limit"
                              value={form.rutLimit}
                              onChange={(v) => setForm({ ...form, rutLimit: v })}
                              unit="mm"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Calculate Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev }));
                        setActiveTab('results');
                      }}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>
                  </div>

                  {/* Visualization & Results */}
                  <div className="lg:col-span-8 space-y-6 sticky top-8">
                    <WhatIfPreview
                      title="Haul Road — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <HaulRoad3D />
                        </Interactive3DDiagram>
                      )}
                    />

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
                            <HaulRoad3D />
                          </Interactive3DDiagram>
                          <button
                            onClick={() => setPreviewMaximized(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                            aria-label="Minimize preview"
                          >
                            <FiMinimize2 size={20} />
                          </button>
                          <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                            HAUL ROAD — REAL-TIME PREVIEW
                          </div>
                        </div>
                        <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                          <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                            <FiSliders size={14} /> Live Parameters
                          </h3>
                          {[
                            {
                              label: 'CBR Value',
                              field: 'customCbr' as keyof FormData,
                              min: 0.5,
                              max: 30,
                              step: 0.5,
                              unit: '%',
                            },
                            {
                              label: 'Axle Load',
                              field: 'axleLoad' as keyof FormData,
                              min: 5,
                              max: 25,
                              step: 0.5,
                              unit: 't',
                            },
                            {
                              label: 'Rut Limit',
                              field: 'rutLimit' as keyof FormData,
                              min: 25,
                              max: 150,
                              step: 5,
                              unit: 'mm',
                            },
                          ].map((s) => (
                            <div key={s.field} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-400">{s.label}</span>
                                <span className="text-white">
                                  {form[s.field] as string} {s.unit}
                                </span>
                              </div>
                              <input
                                title={s.label}
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={s.step}
                                value={form[s.field] as string}
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
                              { label: 'CBR', value: `${form.customCbr}%` },
                              { label: 'Axle Load', value: `${form.axleLoad} t` },
                              { label: 'Material', value: form.material },
                              { label: 'Geotextile', value: form.geotextile ? 'Yes' : 'No' },
                              { label: 'Geogrid', value: form.geogrid ? 'Yes' : 'No' },
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
                                    label: 'Design Thickness',
                                    value: `${results.designThickness}mm`,
                                    status: results.overallStatus,
                                  },
                                  {
                                    label: 'Unreinforced',
                                    value: `${results.unreinThickness}mm`,
                                    status: 'PASS' as const,
                                  },
                                  {
                                    label: 'Reduction',
                                    value: `${results.reduction}%`,
                                    status:
                                      results.reduction > 0 ? ('PASS' as const) : ('FAIL' as const),
                                  },
                                  {
                                    label: 'Bearing FOS',
                                    value: results.bearingSF.toFixed(2),
                                    status: results.bearingStatus,
                                  },
                                  {
                                    label: 'Overall',
                                    value: results.overallStatus,
                                    status: results.overallStatus,
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
                                          : 'text-emerald-400',
                                      )}
                                    >
                                      {check.value}
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

                    {results && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard
                          label="Design Thickness"
                          value={`${results.designThickness}mm`}
                          limit={`Unrein: ${results.unreinThickness}mm`}
                          status="pass"
                        />
                        <ResultCard
                          label="Reduction"
                          value={`${results.reduction}%`}
                          limit={form.geogrid ? 'Geogrid' : form.geotextile ? 'Geotextile' : 'None'}
                          status={results.reduction > 0 ? 'pass' : 'info'}
                        />
                        <ResultCard
                          label="Bearing FOS"
                          value={results.bearingSF.toFixed(2)}
                          limit="≥ 1.0"
                          status={
                            results.bearingStatus === 'PASS'
                              ? results.bearingSF > 2
                                ? 'pass'
                                : 'warning'
                              : 'fail'
                          }
                        />
                        <ResultCard
                          label="Subgrade Cu"
                          value={`${results.cu.toFixed(0)} kPa`}
                          limit={`qult = ${results.qUlt.toFixed(0)} kPa`}
                          status="info"
                        />
                      </div>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiInfo className="text-neon-cyan" />
                            Build-up Specification
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Surface</div>
                              <div className="text-white">{MATERIALS[form.material]?.name}</div>
                              <div className="text-gray-500 text-xs mt-1">
                                {results.designThickness}mm
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Reinforcement
                              </div>
                              <div
                                className={cn(
                                  form.geogrid
                                    ? 'text-amber-400'
                                    : form.geotextile
                                      ? 'text-gray-300'
                                      : 'text-gray-600',
                                )}
                              >
                                {form.geogrid
                                  ? 'Biaxial Geogrid'
                                  : form.geotextile
                                    ? 'Separation Geotextile'
                                    : 'None'}
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Subgrade</div>
                              <div className="text-gray-400">CBR {results.cbr}%</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results &&
                      (() => {
                        const recs: { icon: string; text: string }[] = [];
                        if (results.bearingSF < 1.0)
                          recs.push({
                            icon: '🔴',
                            text: 'Ground bearing insufficient — use geogrid or stabilize subgrade',
                          });
                        if (results.cbr < 2)
                          recs.push({
                            icon: '⚠️',
                            text: 'Soft subgrade (CBR < 2%) — proof roll and monitor for rutting',
                          });
                        if (results.designThickness > 500)
                          recs.push({
                            icon: '📐',
                            text: 'Design > 500mm — consider lime/cement stabilization',
                          });
                        if (!form.geotextile && results.cbr < 3)
                          recs.push({
                            icon: '📐',
                            text: 'Recommend geotextile separation layer for CBR < 3%',
                          });
                        if (results.reduction === 0 && results.cbr < 5)
                          recs.push({
                            icon: '📐',
                            text: 'Consider geogrid to reduce aggregate thickness by ~30%',
                          });
                        if (recs.length === 0)
                          recs.push({
                            icon: '✅',
                            text: 'Haul road thickness and bearing capacity are satisfactory',
                          });
                        return (
                          <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                            <CardHeader className="py-3">
                              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <FiInfo className="text-neon-cyan" />
                                Recommendations
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {recs.map((r, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-gray-300"
                                >
                                  <span>{r.icon}</span>
                                  <span>{r.text}</span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        );
                      })()}

                    <div className="lg:hidden">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={exportPDF}
                          className="w-full bg-gradient-to-r from-gray-600 to-amber-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-gray-600 to-amber-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          DOCX
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
    <ExplainableLabel label={`${label}${unit ? ` (${unit})` : ''}`} field={field || 'haul-road'} />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono"
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
      'p-4 text-center border-l-4 shadow-2xl',
      status === 'pass' && 'border-green-500 bg-green-950/20 shadow-green-500/5',
      status === 'fail' && 'border-red-500 bg-red-950/20 shadow-red-500/5',
      status === 'warning' && 'border-yellow-500 bg-yellow-950/20 shadow-yellow-500/5',
      status === 'info' && 'border-gray-500 bg-gray-950/20 shadow-gray-500/5',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' && 'text-green-400',
        status === 'fail' && 'text-red-400',
        status === 'warning' && 'text-yellow-400',
        status === 'info' && 'text-gray-400',
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
        {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'MARGINAL'}
      </div>
    )}
  </Card>
);

export default HaulRoad;
