// =============================================================================
// BeaverCalc Studio — Vertical Prop Check (Premium)
// Acrow prop capacity verification with eccentricity considerations
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowUp,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiInfo,
  FiMinimize2,
  FiSettings,
  FiSliders,
  FiX,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import VerticalProps3D from '../../components/3d/scenes/VerticalProps3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  propType: string;
  height: string;
  load: string;
  eccentricity: string;
  safetyFactor: string;
}

interface Results {
  baseSWL: number;
  reducedSWL: number;
  eccFactor: number;
  utilisation: number;
  status: 'PASS' | 'FAIL';
  rating: string;
  validLength: boolean;
  lengthRange: string;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PROP DATABASE (BS 5975)
// =============================================================================

const PROP_DATA: Record<
  string,
  { name: string; minExt: number; maxExt: number; data: { h: number; swl: number }[] }
> = {
  acrow_0: {
    name: 'Size 0 (1.07-1.82m)',
    minExt: 1.07,
    maxExt: 1.82,
    data: [
      { h: 1.07, swl: 35 },
      { h: 1.5, swl: 30 },
      { h: 1.82, swl: 22 },
    ],
  },
  acrow_1: {
    name: 'Size 1 (1.75-3.12m)',
    minExt: 1.75,
    maxExt: 3.12,
    data: [
      { h: 1.75, swl: 35 },
      { h: 2.5, swl: 25 },
      { h: 3.12, swl: 12 },
    ],
  },
  acrow_2: {
    name: 'Size 2 (1.98-3.40m)',
    minExt: 1.98,
    maxExt: 3.4,
    data: [
      { h: 1.98, swl: 35 },
      { h: 2.8, swl: 20 },
      { h: 3.4, swl: 14 },
    ],
  },
  acrow_3: {
    name: 'Size 3 (2.59-3.96m)',
    minExt: 2.59,
    maxExt: 3.96,
    data: [
      { h: 2.59, swl: 35 },
      { h: 3.2, swl: 19 },
      { h: 3.96, swl: 11 },
    ],
  },
  acrow_4: {
    name: 'Size 4 (3.20-4.87m)',
    minExt: 3.2,
    maxExt: 4.87,
    data: [
      { h: 3.2, swl: 30 },
      { h: 4.0, swl: 16 },
      { h: 4.87, swl: 8 },
    ],
  },
  titan_65s: {
    name: 'Titan 65S (1.50-2.60m)',
    minExt: 1.5,
    maxExt: 2.6,
    data: [
      { h: 1.5, swl: 65 },
      { h: 2.0, swl: 50 },
      { h: 2.6, swl: 35 },
    ],
  },
  titan_105s: {
    name: 'Titan 105S (2.00-3.50m)',
    minExt: 2.0,
    maxExt: 3.5,
    data: [
      { h: 2.0, swl: 105 },
      { h: 2.75, swl: 75 },
      { h: 3.5, swl: 50 },
    ],
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PRESETS = {
  acrow_size2: {
    name: 'Acrow Size 2 (1.8-3.1m)',
    propType: 'acrow_2',
    height: '2.5',
    load: '30',
  },
  acrow_size3: {
    name: 'Acrow Size 3 (2.4-3.9m)',
    propType: 'acrow_3',
    height: '3.2',
    load: '25',
  },
  steel_uc: {
    name: 'Steel UC Prop',
    propType: 'steel_uc',
    height: '4.0',
    load: '100',
  },
  timber_prop: {
    name: 'Timber Prop',
    propType: 'timber',
    height: '2.8',
    load: '15',
  },
};

const VerticalProps = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    prop: true,
    loads: true,
    options: false,
  });

  const [form, setForm] = useState<FormData>({
    propType: 'acrow_1',
    height: '2.5',
    load: '15',
    eccentricity: '0',
    safetyFactor: '1.0',
  });
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'propType', label: 'Prop Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'height', label: 'Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'load', label: 'Load', min: 0, max: 100, step: 1, unit: '' },
    { key: 'eccentricity', label: 'Eccentricity', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (preset) {
      const { name, ...values } = preset;
      setForm((prev: any) => ({ ...prev, ...values }));
    }
  };

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // HELPER: INTERPOLATE SWL
  // ===========================================================================

  const getSWL = (type: string, h: number): number => {
    const prop = PROP_DATA[type];
    if (!prop || h < prop.minExt || h > prop.maxExt) return 0;

    const { data } = prop;
    for (let i = 0; i < data.length - 1; i++) {
      const p1 = data[i];
      const p2 = data[i + 1];
      if (h >= p1.h && h <= p2.h) {
        const ratio = (h - p1.h) / (p2.h - p1.h);
        return p1.swl + ratio * (p2.swl - p1.swl);
      }
    }
    return 0;
  };

  // ===========================================================================
  // CALCULATIONS
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'height', label: 'Prop Height' },
      { key: 'load', label: 'Applied Load' },
      { key: 'eccentricity', label: 'Eccentricity', allowZero: true },
      { key: 'safetyFactor', label: 'Safety Factor' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const h = parseFloat(form.height);
    const load = parseFloat(form.load);
    const ecc = parseFloat(form.eccentricity);
    const fos = parseFloat(form.safetyFactor);
    const prop = PROP_DATA[form.propType];

    if (isNaN(h) || h <= 0 || isNaN(load) || load <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid input parameters' }]);
      return;
    }

    // Check valid length range
    const validLength = h >= prop.minExt && h <= prop.maxExt;
    const lengthRange = `${prop.minExt}m - ${prop.maxExt}m`;

    // Get base SWL
    let baseSWL = getSWL(form.propType, h);

    // Eccentricity reduction (BS 5975 typically allows up to 25mm)
    let eccFactor = 1.0;
    if (ecc > 25) {
      eccFactor = Math.max(0, 1.0 - (ecc - 25) * 0.02);
    }
    if (ecc > 50) eccFactor = 0;

    const reducedSWL = (baseSWL * eccFactor) / fos;
    const utilisation = reducedSWL > 0 ? (load / reducedSWL) * 100 : 999;
    const status = validLength && utilisation <= 100 ? 'PASS' : 'FAIL';

    // Rating
    let rating: string;
    if (!validLength) {
      rating = 'INVALID LENGTH';
    } else if (status === 'PASS') {
      rating = utilisation < 70 ? 'OPTIMAL' : 'ADEQUATE';
    } else {
      rating = 'CRITICAL';
    }

    // Warnings
    if (!validLength) {
      newWarnings.push({ type: 'error', message: `Height ${h}m outside range ${lengthRange}` });
    }
    if (ecc > 25) {
      newWarnings.push({
        type: 'warning',
        message: `Eccentricity ${ecc}mm > 25mm - capacity reduced`,
      });
    }
    if (ecc > 50) {
      newWarnings.push({ type: 'error', message: 'Excessive eccentricity - prop not suitable' });
    }
    if (utilisation > 100) {
      newWarnings.push({
        type: 'error',
        message: `Utilisation ${utilisation.toFixed(0)}% exceeds capacity`,
      });
    }
    if (utilisation > 80 && utilisation <= 100) {
      newWarnings.push({
        type: 'warning',
        message: `High utilisation ${utilisation.toFixed(0)}% - near capacity`,
      });
    }

    const overallStatus = validLength && status === 'PASS' ? 'PASS' : 'FAIL';

    setResults({
      baseSWL,
      reducedSWL,
      eccFactor,
      utilisation,
      status,
      rating,
      validLength,
      lengthRange,
      overallStatus,
    });

    setWarnings(newWarnings);
  }, [form]);

  // ===========================================================================
  // VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ===========================================================================
  // PDF EXPORT
  // ===========================================================================

  const exportPDF = () => {
    if (!results) return;

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.utilisation > 80)
      pdfRecs.push({
        check: 'Utilisation',
        suggestion: `${results.utilisation.toFixed(0)}% — consider a larger prop size or reduce applied load`,
      });
    if (results.eccFactor < 1)
      pdfRecs.push({
        check: 'Eccentricity',
        suggestion: `Factor ${(results.eccFactor * 100).toFixed(0)}% — reduce eccentricity or add packing for concentric loading`,
      });
    if (!results.validLength)
      pdfRecs.push({
        check: 'Height',
        suggestion: `${form.height}m outside valid range ${results.lengthRange} — select appropriate prop size`,
      });
    if (results.utilisation <= 50)
      pdfRecs.push({
        check: 'Over-designed',
        suggestion: `Only ${results.utilisation.toFixed(0)}% utilised — a smaller prop may be more economical`,
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion:
        results.overallStatus === 'PASS'
          ? 'All checks satisfied — prop selection adequate'
          : 'One or more checks failed — review design',
    });

    generatePremiumPDF({
      title: 'Vertical Prop Check',
      subtitle: 'BS 5975 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Vertical Prop Check' },
        { label: 'Reference', value: 'VER001' },
        { label: 'Standard', value: 'BS 5975' },
      ],
      inputs: [
        { label: 'Prop Type', value: PROP_DATA[form.propType]?.name || form.propType },
        { label: 'Height', value: `${form.height} m` },
        { label: 'Vertical Load', value: `${form.load} kN` },
        { label: 'Eccentricity', value: `${form.eccentricity} mm` },
        { label: 'Safety Factor', value: form.safetyFactor },
      ],
      sections: [
        {
          title: 'Capacity Analysis',
          head: [['Parameter', 'Value']],
          body: [
            ['Base SWL', `${results.baseSWL.toFixed(1)} kN`],
            ['Eccentricity Factor', `${(results.eccFactor * 100).toFixed(0)}%`],
            ['Reduced SWL', `${results.reducedSWL.toFixed(1)} kN`],
            ['Utilisation', `${results.utilisation.toFixed(1)}%`],
            ['Valid Length Range', results.lengthRange],
            ['Height In Range', results.validLength ? 'Yes' : 'No'],
            ['Rating', results.rating],
          ],
        },
      ],
      checks: [
        {
          name: 'Prop Capacity',
          capacity: `${results.reducedSWL.toFixed(1)} kN`,
          utilisation: `${results.utilisation.toFixed(0)}%`,
          status: results.status,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Vertical Prop Check',
    });
  };

  const exportDOCX = () => {
    if (!results) return;

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.utilisation > 80)
      pdfRecs.push({
        check: 'Utilisation',
        suggestion: `${results.utilisation.toFixed(0)}% — consider a larger prop size or reduce applied load`,
      });
    if (results.eccFactor < 1)
      pdfRecs.push({
        check: 'Eccentricity',
        suggestion: `Factor ${(results.eccFactor * 100).toFixed(0)}% — reduce eccentricity or add packing for concentric loading`,
      });
    if (!results.validLength)
      pdfRecs.push({
        check: 'Height',
        suggestion: `${form.height}m outside valid range ${results.lengthRange} — select appropriate prop size`,
      });
    if (results.utilisation <= 50)
      pdfRecs.push({
        check: 'Over-designed',
        suggestion: `Only ${results.utilisation.toFixed(0)}% utilised — a smaller prop may be more economical`,
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion:
        results.overallStatus === 'PASS'
          ? 'All checks satisfied — prop selection adequate'
          : 'One or more checks failed — review design',
    });

    generateDOCX({
      title: 'Vertical Prop Check',
      subtitle: 'BS 5975 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Vertical Prop Check' },
        { label: 'Reference', value: 'VER001' },
        { label: 'Standard', value: 'BS 5975' },
      ],
      inputs: [
        { label: 'Prop Type', value: PROP_DATA[form.propType]?.name || form.propType },
        { label: 'Height', value: `${form.height} m` },
        { label: 'Vertical Load', value: `${form.load} kN` },
        { label: 'Eccentricity', value: `${form.eccentricity} mm` },
        { label: 'Safety Factor', value: form.safetyFactor },
      ],
      sections: [
        {
          title: 'Capacity Analysis',
          head: [['Parameter', 'Value']],
          body: [
            ['Base SWL', `${results.baseSWL.toFixed(1)} kN`],
            ['Eccentricity Factor', `${(results.eccFactor * 100).toFixed(0)}%`],
            ['Reduced SWL', `${results.reducedSWL.toFixed(1)} kN`],
            ['Utilisation', `${results.utilisation.toFixed(1)}%`],
            ['Valid Length Range', results.lengthRange],
            ['Height In Range', results.validLength ? 'Yes' : 'No'],
            ['Rating', results.rating],
          ],
        },
      ],
      checks: [
        {
          name: 'Prop Capacity',
          capacity: `${results.reducedSWL.toFixed(1)} kN`,
          utilisation: `${results.utilisation.toFixed(0)}%`,
          status: results.status,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Vertical Prop Check',
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
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4 bg-gray-950/20">
            <FiArrowUp className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">
              PROPPING & SHORING | BS 5975
            </span>
          </div>
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Vertical Prop Check
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BS 5975 vertical prop design & capacity
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
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg'
                  : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
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
                  {results.rating} — Utilisation {results.utilisation.toFixed(0)}%
                </div>
                <div className="text-gray-400 text-sm">
                  SWL: {results.reducedSWL.toFixed(1)} kN | Base SWL: {results.baseSWL.toFixed(1)}{' '}
                  kN
                </div>
              </div>
            </div>
            {/* Preset Selector */}
            <div className="flex items-center gap-2 mr-auto">
              <select
                value=""
                onChange={(e) => e.target.value && applyPreset(e.target.value)}
                className="px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-700 focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white text-sm"
                title="Quick Presets"
              >
                <option value="">⚡ Quick Presets</option>
                {Object.entries(PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {(p as any).name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
              >
                <FiDownload className="mr-2" />
                PDF
              </Button>
              <Button
                onClick={exportDOCX}
                className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
              >
                <FiDownload className="mr-2" />
                DOCX
              </Button>
              <SaveRunButton
                calculatorKey="vertical-props"
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
                  className="grid lg:grid-cols-3 gap-6"
                >
                  {/* Inputs */}
                  <div className="lg:col-span-4 space-y-4">
                    {/* Prop Selection */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('prop')}
                      >
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiArrowUp className="w-5 h-5 text-neon-cyan" />
                          </motion.div>
                          <span>Prop Selection</span>
                        </CardTitle>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.prop && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.prop && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Prop Type
                              </label>
                              <select
                                title="Prop Type"
                                value={form.propType}
                                onChange={(e) => setForm({ ...form, propType: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white text-sm"
                              >
                                {Object.entries(PROP_DATA).map(([key, prop]) => (
                                  <option key={key} value={key}>
                                    {prop.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Height"
                              value={form.height}
                              onChange={(v) => setForm({ ...form, height: v })}
                              unit="m"
                            />
                            {results && (
                              <div className="text-xs text-gray-500">
                                Valid range: {results.lengthRange}
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Loads */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('loads')}
                      >
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiArrowUp className="w-5 h-5 text-neon-cyan" />
                          </motion.div>
                          <span>Applied Load</span>
                        </CardTitle>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.loads && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.loads && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <InputField
                              label="Vertical Load"
                              value={form.load}
                              onChange={(v) => setForm({ ...form, load: v })}
                              unit="kN"
                            />
                            <InputField
                              label="Eccentricity"
                              value={form.eccentricity}
                              onChange={(v) => setForm({ ...form, eccentricity: v })}
                              unit="mm"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Options */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('options')}
                      >
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiSettings className="w-5 h-5 text-neon-cyan" />
                          </motion.div>
                          <span>Options</span>
                        </CardTitle>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.options && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.options && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <InputField
                              label="Safety Factor"
                              value={form.safetyFactor}
                              onChange={(v) => setForm({ ...form, safetyFactor: v })}
                              unit=""
                            />
                            <div className="text-xs text-gray-500">
                              Note: SWL typically has FOS 2.0 built in
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>
                  </div>

                  {/* Visualization & Results */}
                  <div className="lg:col-span-8 space-y-6 sticky top-32">
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
                            <VerticalProps3D />
                          </Interactive3DDiagram>
                          <button
                            onClick={() => setPreviewMaximized(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                            aria-label="Minimize preview"
                          >
                            <FiMinimize2 size={20} />
                          </button>
                          <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                            VERTICAL PROPS — REAL-TIME PREVIEW
                          </div>
                        </div>

                        {/* Right sidebar — live parameters & stats */}
                        <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                          <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                            <FiSliders size={14} /> Live Parameters
                          </h3>

                          {[
                            {
                              label: 'Height',
                              field: 'height' as keyof FormData,
                              min: 0.5,
                              max: 5,
                              step: 0.1,
                              unit: 'm',
                            },
                            {
                              label: 'Load',
                              field: 'load' as keyof FormData,
                              min: 0,
                              max: 60,
                              step: 1,
                              unit: 'kN',
                            },
                            {
                              label: 'Eccentricity',
                              field: 'eccentricity' as keyof FormData,
                              min: 0,
                              max: 50,
                              step: 1,
                              unit: 'mm',
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
                              { label: 'Prop Type', value: form.propType || '—' },
                              { label: 'Height', value: `${form.height} m` },
                              { label: 'Applied Load', value: `${form.load} kN` },
                              { label: 'Safety Factor', value: form.safetyFactor },
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
                                    label: 'Utilisation',
                                    util: results.utilisation?.toFixed(0),
                                    status: results.status,
                                  },
                                  {
                                    label: 'Base SWL',
                                    util: null,
                                    status: `${results.baseSWL?.toFixed(1)} kN`,
                                  },
                                  {
                                    label: 'Design SWL',
                                    util: null,
                                    status: `${results.reducedSWL?.toFixed(1)} kN`,
                                  },
                                  { label: 'Overall', util: null, status: results.overallStatus },
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
                                          : check.label === 'Utilisation' &&
                                              parseFloat(check.util || '0') > 90
                                            ? 'text-orange-400'
                                            : 'text-emerald-400',
                                      )}
                                    >
                                      {check.util ? `${check.util}%` : check.status}
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
                      title="Vertical Props — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <VerticalProps3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          {
                            label: 'Utilisation',
                            value: `${results.utilisation.toFixed(0)}%`,
                            ok: results.status === 'PASS',
                            color: results.status === 'PASS' ? 'green' : 'red',
                          },
                          {
                            label: 'Base SWL',
                            value: `${results.baseSWL.toFixed(1)} kN`,
                            ok: true,
                            color: 'cyan',
                          },
                          {
                            label: 'Design SWL',
                            value: `${results.reducedSWL.toFixed(1)} kN`,
                            ok: results.status === 'PASS',
                            color: results.status === 'PASS' ? 'green' : 'red',
                          },
                          {
                            label: 'Ecc. Factor',
                            value: `${(results.eccFactor * 100).toFixed(0)}%`,
                            ok: results.eccFactor >= 1,
                            color: results.eccFactor >= 1 ? 'green' : 'yellow',
                          },
                        ].map((card) => (
                          <div
                            key={card.label}
                            className={cn(
                              'border-l-4 bg-gray-900/50 rounded-xl p-4',
                              card.color === 'green' && 'border-green-500',
                              card.color === 'red' && 'border-red-500',
                              card.color === 'yellow' && 'border-yellow-500',
                              card.color === 'cyan' && 'border-neon-cyan',
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {card.ok ? (
                                <FiCheck className="w-4 h-4 text-green-400" />
                              ) : (
                                <FiAlertTriangle className="w-4 h-4 text-red-400" />
                              )}
                              <span className="text-xs uppercase text-gray-400">{card.label}</span>
                            </div>
                            <div
                              className={cn(
                                'text-2xl font-bold font-mono',
                                card.color === 'green' && 'text-green-400',
                                card.color === 'red' && 'text-red-400',
                                card.color === 'yellow' && 'text-yellow-400',
                                card.color === 'cyan' && 'text-neon-cyan',
                              )}
                            >
                              {card.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-2xl text-white flex items-center space-x-3">
                            <motion.div
                              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.6 }}
                            >
                              <FiInfo className="w-5 h-5 text-neon-cyan" />
                            </motion.div>
                            <span>Prop Summary</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Prop Type</div>
                              <div className="text-white font-mono text-xs">
                                {PROP_DATA[form.propType]?.name}
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Height</div>
                              <div className="text-white font-mono">{form.height}m</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Valid Range
                              </div>
                              <div
                                className={cn(
                                  'font-mono text-xs',
                                  results.validLength ? 'text-green-400' : 'text-red-400',
                                )}
                              >
                                {results.lengthRange}
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Load Applied
                              </div>
                              <div className="text-amber-400 font-mono">{form.load} kN</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results &&
                      (() => {
                        const recs: { check: string; suggestion: string }[] = [];
                        if (results.utilisation > 80)
                          recs.push({
                            check: 'Utilisation',
                            suggestion: `${results.utilisation.toFixed(0)}% — consider a larger prop size or reduce applied load`,
                          });
                        if (results.eccFactor < 1)
                          recs.push({
                            check: 'Eccentricity',
                            suggestion: `Factor ${(results.eccFactor * 100).toFixed(0)}% — reduce eccentricity or add packing`,
                          });
                        if (!results.validLength)
                          recs.push({
                            check: 'Height',
                            suggestion: `${form.height}m outside valid range ${results.lengthRange}`,
                          });
                        if (results.utilisation <= 50)
                          recs.push({
                            check: 'Over-designed',
                            suggestion: `Only ${results.utilisation.toFixed(0)}% utilised — a smaller prop may suffice`,
                          });
                        recs.push({
                          check: 'Overall',
                          suggestion:
                            results.overallStatus === 'PASS'
                              ? 'All checks satisfied'
                              : 'Review design — one or more checks failed',
                        });
                        return recs.length > 0 ? (
                          <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                            <CardHeader className="py-3">
                              <CardTitle className="text-2xl text-white flex items-center space-x-3">
                                <motion.div
                                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                                  whileHover={{ rotate: 360 }}
                                  transition={{ duration: 0.6 }}
                                >
                                  <FiInfo className="w-5 h-5 text-neon-cyan" />
                                </motion.div>
                                <span>Recommendations</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {recs.map((r, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <FiCheck className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                                  <div>
                                    <span className="text-white font-medium">{r.check}:</span>{' '}
                                    <span className="text-gray-400">{r.suggestion}</span>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ) : null;
                      })()}

                    {/* Run Full Analysis Button */}
                    <div className="flex justify-center">
                      <Button
                        className="px-16 py-8 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl"
                        onClick={() => {
                          setForm((prev) => ({ ...prev }));
                          setActiveTab('results');
                        }}
                      >
                        RUN FULL ANALYSIS
                      </Button>
                    </div>

                    <div className="lg:hidden">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={exportPDF}
                          className="w-full bg-gradient-to-r from-neon-cyan to-neon-blue"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-neon-cyan to-neon-blue"
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
    <label className="flex items-center justify-between text-sm font-semibold text-gray-200">
      <ExplainableLabel
        label={label}
        field={field ?? label}
        className="text-sm font-semibold text-gray-200"
      />
      {unit && <span className="text-neon-cyan text-xs">{unit}</span>}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white text-sm font-mono"
    />
  </div>
);

export default VerticalProps;
