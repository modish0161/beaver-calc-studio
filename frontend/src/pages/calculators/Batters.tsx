// =============================================================================
// Batter Calculations — Premium Edition
// Slope angle, setback, and volume calculator for earthworks
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMap,
    FiMinimize2,
    FiSliders,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import Batters3D from '../../components/3d/scenes/Batters3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { cn } from '../../lib/utils';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface BatterForm {
  slopeHeight: string;
  horizontalRun: string;
  inputMethod: string;
  batterRatioH: string;
  batterRatioV: string;
  slopeAngle: string;
  embankmentLength: string;
  topWidth: string;
  operationType: string;
  soilType: string;
  projectName: string;
  reference: string;
}

interface BatterResults {
  angle: number;
  ratioH: number;
  ratioV: number;
  horizontalSetback: number;
  slopeLength: number;
  crossSectionArea: number;
  volume: number;
  safeAngle: number;
  status: 'PASS' | 'FAIL';
  maxUtil: number;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const SOIL_TYPES: Record<string, { name: string; maxAngle: number; maxRatio: string }> = {
  granular_loose: { name: 'Granular (loose)', maxAngle: 30, maxRatio: '1.7:1' },
  granular_dense: { name: 'Granular (dense)', maxAngle: 35, maxRatio: '1.4:1' },
  clay_soft: { name: 'Clay (soft)', maxAngle: 25, maxRatio: '2.1:1' },
  clay_stiff: { name: 'Clay (stiff)', maxAngle: 45, maxRatio: '1:1' },
  rock: { name: 'Rock (weathered)', maxAngle: 60, maxRatio: '0.6:1' },
  mixed: { name: 'Mixed Fill', maxAngle: 33, maxRatio: '1.5:1' },
};

const PRESETS: Record<string, { name: string; form: Partial<BatterForm> }> = {
  shallow_cut: {
    name: 'Shallow Cut (1:2)',
    form: {
      slopeHeight: '3',
      batterRatioH: '2',
      batterRatioV: '1',
      inputMethod: 'ratio',
      operationType: 'cut',
      soilType: 'clay_soft',
    },
  },
  standard_fill: {
    name: 'Standard Fill (1:1.5)',
    form: {
      slopeHeight: '5',
      batterRatioH: '1.5',
      batterRatioV: '1',
      inputMethod: 'ratio',
      operationType: 'fill',
      soilType: 'granular_dense',
    },
  },
  steep_rock: {
    name: 'Rock Cut (1:0.5)',
    form: {
      slopeHeight: '8',
      batterRatioH: '0.5',
      batterRatioV: '1',
      inputMethod: 'ratio',
      operationType: 'cut',
      soilType: 'rock',
    },
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Batters: React.FC = () => {
  const [form, setForm] = useState<BatterForm>({
    slopeHeight: '4',
    horizontalRun: '6',
    inputMethod: 'ratio',
    batterRatioH: '1.5',
    batterRatioV: '1',
    slopeAngle: '33.7',
    embankmentLength: '50',
    topWidth: '6',
    operationType: 'cut',
    soilType: 'granular_dense',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'slopeHeight', label: 'Slope Height' },
  { key: 'horizontalRun', label: 'Horizontal Run' },
  { key: 'batterRatioH', label: 'Batter Ratio H' },
  { key: 'batterRatioV', label: 'Batter Ratio V' },
  { key: 'slopeAngle', label: 'Slope Angle', allowZero: true },
  { key: 'embankmentLength', label: 'Embankment Length' },
  { key: 'topWidth', label: 'Top Width' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'slopeHeight', label: 'Slope Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'horizontalRun', label: 'Horizontal Run', min: 0, max: 100, step: 1, unit: '' },
    { key: 'inputMethod', label: 'Input Method', min: 0, max: 100, step: 1, unit: '' },
    { key: 'batterRatioH', label: 'Batter Ratio H', min: 0, max: 100, step: 1, unit: '' }
  ];


  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [results, setResults] = useState<BatterResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    slope: true,
    volume: true,
    soil: false,
    project: false,
  });

  const updateForm = (field: keyof BatterForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const H = parseFloat(form.slopeHeight) || 0;
    let angle: number, ratioH: number, ratioV: number, horizontal: number;

    if (form.inputMethod === 'ratio') {
      ratioH = parseFloat(form.batterRatioH) || 1;
      ratioV = parseFloat(form.batterRatioV) || 1;
      angle = (Math.atan(ratioV / ratioH) * 180) / Math.PI;
      horizontal = H * (ratioH / ratioV);
    } else if (form.inputMethod === 'angle') {
      angle = parseFloat(form.slopeAngle) || 45;
      ratioV = 1;
      ratioH = 1 / Math.tan((angle * Math.PI) / 180);
      horizontal = H / Math.tan((angle * Math.PI) / 180);
    } else {
      horizontal = parseFloat(form.horizontalRun) || 1;
      angle = (Math.atan(H / horizontal) * 180) / Math.PI;
      ratioV = 1;
      ratioH = horizontal / H;
    }

    const slopeLength = Math.sqrt(H * H + horizontal * horizontal);
    const crossSectionArea = 0.5 * horizontal * H;
    const embL = parseFloat(form.embankmentLength) || 1;
    const topW = parseFloat(form.topWidth) || 1;

    let volume: number;
    if (form.operationType === 'fill') {
      volume = (crossSectionArea * 2 + topW * H) * embL;
    } else {
      volume = crossSectionArea * embL;
    }

    const soil = SOIL_TYPES[form.soilType];
    const safeAngle = soil.maxAngle;
    const maxUtil = (angle / safeAngle) * 100;

    if (angle > safeAngle)
      w.push(`Slope angle ${angle.toFixed(1)}° exceeds safe angle ${safeAngle}° for ${soil.name}`);
    if (angle > safeAngle * 0.85 && angle <= safeAngle)
      w.push('Slope angle approaching safe limit — consider geotechnical review');
    if (H > 6) w.push('Slope height >6m — consider benching or reinforcement');

    setResults({
      angle,
      ratioH,
      ratioV,
      horizontalSetback: horizontal,
      slopeLength,
      crossSectionArea,
      volume,
      safeAngle,
      status: angle <= safeAngle ? 'PASS' : 'FAIL',
      maxUtil,
    });
    setWarnings(w);
  }, [form]);

  useEffect(() => {
    const t = setTimeout(calculate, 300);
    return () => clearTimeout(t);
  }, [calculate]);

  // Canvas Drawing

  const handleExportPDF = async () => {
    if (!results) return;
    await generatePremiumPDF({
      title: 'Earthworks Batter Design',
      subtitle: 'Slope Angle and Volume Analysis',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'BAT001' },
        { label: 'Standard', value: 'BS 6031 / EC7' },
      ],
      inputs: [
        { label: 'Slope Height', value: form.slopeHeight, unit: 'm' },
        { label: 'Input Method', value: form.inputMethod },
        { label: 'Batter Ratio', value: `1:${results.ratioH.toFixed(2)}` },
        { label: 'Operation', value: form.operationType },
        { label: 'Soil Type', value: SOIL_TYPES[form.soilType].name },
        { label: 'Embankment Length', value: form.embankmentLength, unit: 'm' },
        { label: 'Top Width', value: form.topWidth, unit: 'm' },
      ],
      checks: [
        {
          name: 'Global Stability Check',
          capacity: `${results.safeAngle}°`,
          utilisation: `${results.maxUtil.toFixed(1)}%`,
          status: results.status,
        },
      ],
      sections: [
        {
          title: 'Geometric Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Slope Angle', results.angle.toFixed(1), '°'],
            ['Horizontal Setback', results.horizontalSetback.toFixed(2), 'm'],
            ['Slope Length', results.slopeLength.toFixed(2), 'm'],
            ['Cross-Section Area', results.crossSectionArea.toFixed(1), 'm²'],
            ['Total Volume', results.volume.toFixed(0), 'm³'],
            ['Safety Factor', (results.safeAngle / results.angle).toFixed(2), '-'],
          ],
        },
      ],
      recommendations: [
        ...(results.maxUtil > 85
          ? [
              {
                check: 'Near Limit',
                suggestion: 'Slope approaching safe limit — consider reducing angle',
              },
            ]
          : []),
        ...(parseFloat(form.slopeHeight) > 6
          ? [{ check: 'High Cut', suggestion: 'Height >6m — consider benching or reinforcement' }]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.status === 'PASS'
              ? 'Slope design adequate'
              : 'Design fails — revise geometry or soil assumptions',
        },
      ],
      warnings,
      footerNote: 'Beaver Bridges Ltd — Earthworks Batter Design (BS 6031 / EC7)',
    });
  };

  // DOCX Export — Editable Word document
  const handleExportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Earthworks Batter Design',
      subtitle: 'Slope Angle and Volume Analysis',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'BAT001' },
      ],
      inputs: [
        { label: 'Slope Height', value: form.slopeHeight, unit: 'm' },
        { label: 'Input Method', value: form.inputMethod, unit: '' },
        { label: 'Batter Ratio', value: `1:${results.ratioH.toFixed(2)}`, unit: '' },
        { label: 'Operation', value: form.operationType, unit: '' },
        { label: 'Soil Type', value: SOIL_TYPES[form.soilType]?.name || form.soilType, unit: '' },
        { label: 'Embankment Length', value: form.embankmentLength, unit: 'm' },
      ],
      checks: [
        {
          name: 'Global Stability',
          capacity: `${results.safeAngle}°`,
          utilisation: `${results.maxUtil?.toFixed(1) || '-'}%`,
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Overall',
          suggestion:
            results.status === 'PASS'
              ? 'Slope design adequate'
              : 'Design fails — revise geometry or soil assumptions',
        },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Earthworks Batter Design',
    });
  };

  const SectionComp: React.FC<{ id: string; title: string; icon: any; children: any }> = ({
    id,
    title,
    icon,
    children,
  }) => (
    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full p-4 flex items-center justify-between border-b border-gray-700/50 bg-gray-800/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
            {icon}
          </div>
          <span className="text-xl font-bold text-white">{title}</span>
        </div>
        {expandedSections[id] ? <FiChevronDown className="text-gray-400" /> : <FiChevronRight className="text-gray-400" />}
      </button>
      <AnimatePresence>
        {expandedSections[id] && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="p-4 space-y-4">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );

  const InputField: React.FC<{ label: string; field: keyof BatterForm; unit?: string }> = ({
    label,
    field,
    unit,
  }) => (
    <div className="space-y-1">
      <ExplainableLabel
        label={label}
        field={field}
        className="text-sm font-semibold text-gray-200"
      />
      <div className="relative">
        <input
          title={label}
          type="number"
          value={form[field] as string}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 outline-none transition-all"
        />
        {unit && <span className="absolute right-3 top-3 text-gray-400 text-xs">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div className="fixed inset-0 z-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
                Batter Design
              </h1>
              <p className="text-lg text-gray-400">Slope stability & earthworks volume engine</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                onClick={handleExportPDF}
                className="flex-1 md:flex-none bg-gray-800/50 hover:bg-gray-700/50 text-white font-bold p-6 rounded-xl border border-gray-700/50"
              >
                <FiDownload className="mr-2" /> PDF
              </Button>
              <Button
                onClick={handleExportDOCX}
                className="flex-1 md:flex-none bg-gray-800/50 hover:bg-gray-700/50 text-white font-bold p-6 rounded-xl border border-gray-700/50"
              >
                <FiDownload className="mr-2" /> DOCX
              </Button>
              <SaveRunButton
                calculatorKey="batters"
                inputs={form as unknown as Record<string, string>}
                results={results}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                summary={results ? `${results.angle?.toFixed(1) || '-'}°` : undefined}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 flex justify-center gap-4 mb-8">
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as any)}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white'
                  : 'text-gray-400',
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
              className="grid lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FiZap className="text-neon-cyan" />
                    <span className="font-bold text-gray-400 uppercase text-xs tracking-widest">
                      Presets
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(PRESETS).map((k) => (
                      <Button
                        key={k}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(k)}
                        className="border-gray-700/50 hover:border-neon-cyan/50 hover:bg-neon-cyan/10"
                      >
                        {PRESETS[k].name}
                      </Button>
                    ))}
                  </div>
                </Card>

                <SectionComp
                  id="slope"
                  title="Slope Geometry"
                  icon={<FiMap className="w-6 h-6 text-neon-cyan" />}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Slope Height (H)" field="slopeHeight" unit="m" />
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">
                        Input Method
                      </label>
                      <select
                        title="Input Method"
                        value={form.inputMethod}
                        onChange={(e) => updateForm('inputMethod', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        <option value="ratio">Batter Ratio (1:x)</option>
                        <option value="angle">Slope Angle (°)</option>
                        <option value="setback">Horizontal Setback (m)</option>
                      </select>
                    </div>
                    {form.inputMethod === 'ratio' && (
                      <InputField label="Batter Ratio Horizontal (x)" field="batterRatioH" />
                    )}
                    {form.inputMethod === 'angle' && (
                      <InputField label="Slope Angle" field="slopeAngle" unit="°" />
                    )}
                    {form.inputMethod === 'setback' && (
                      <InputField label="Horizontal Run" field="horizontalRun" unit="m" />
                    )}
                  </div>
                </SectionComp>

                <SectionComp
                  id="soil"
                  title="Geotechnical Settings"
                  icon={<FiLayers className="w-6 h-6 text-neon-cyan" />}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">
                        Soil Condition
                      </label>
                      <select
                        title="Soil Type"
                        value={form.soilType}
                        onChange={(e) => updateForm('soilType', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.entries(SOIL_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                      <div className="text-xs text-gray-400 mb-1 font-bold italic underline">
                        Safe Limit for {SOIL_TYPES[form.soilType].name}
                      </div>
                      <div className="text-lg font-bold text-neon-cyan">
                        {SOIL_TYPES[form.soilType].maxAngle}° (1:
                        {SOIL_TYPES[form.soilType].maxRatio.split(':')[0]})
                      </div>
                    </div>
                  </div>
                </SectionComp>

                {/* Calculate Button */}
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-2xl shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>

              <div className="space-y-6 sticky top-8">
                <Card
                  variant="glass"
                  className={cn(
                    'border-neon-cyan/30 shadow-2xl p-6 overflow-hidden relative group',
                    results?.status === 'PASS' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500',
                  )}
                >
                  <div className="relative z-10">
                    <h3 className="text-xs font-black text-neon-cyan uppercase tracking-widest mb-4">
                      Quick Analysis
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Slope Setback</div>
                        <div className="text-2xl font-bold text-white">
                          {results?.horizontalSetback.toFixed(1)}m
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Utilisation</div>
                        <div
                          className={cn(
                            'text-2xl font-bold',
                            results?.status === 'PASS' ? 'text-neon-cyan' : 'text-red-500',
                          )}
                        >
                          {results?.maxUtil.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-6 p-4 rounded-xl text-center font-bold border',
                        results?.status === 'PASS'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-500',
                      )}
                    >
                      {results?.status === 'PASS' ? '✅ DESIGN SAFE' : '⚠️ LIMIT EXCEEDED'}
                    </div>
                  </div>
                </Card>

                {/* Recommendations */}
                {results && (
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-5 border-l-4 border-l-amber-500">
                    <h3 className="text-xs font-black text-neon-cyan uppercase tracking-widest mb-3 flex items-center gap-2">
                      <FiCheck /> Recommendations
                    </h3>
                    <div className="space-y-2 text-sm">
                      {results.maxUtil > 85 && (
                        <div className="text-amber-400">
                          ⚠ Slope near safe limit — consider reducing angle
                        </div>
                      )}
                      {parseFloat(form.slopeHeight) > 6 && (
                        <div className="text-amber-400">
                          ⚠ Height &gt;6m — consider benching or reinforcement
                        </div>
                      )}
                      {results.maxUtil > 100 && (
                        <div className="text-red-400">
                          ✗ Slope exceeds safe angle for {SOIL_TYPES[form.soilType].name}
                        </div>
                      )}
                      <div
                        className={results.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}
                      >
                        {results.status === 'PASS'
                          ? '✓ Slope design adequate'
                          : '✗ Design fails — revise geometry or soil assumptions'}
                      </div>
                    </div>
                  </Card>
                )}

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
                        <Batters3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        BATTER ANALYSIS — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        { label: 'Slope Height', field: 'slopeHeight' as keyof BatterForm, min: 0, max: 30, step: 0.5, unit: 'm' },
                        { label: 'Horizontal Run', field: 'horizontalRun' as keyof BatterForm, min: 0, max: 50, step: 0.5, unit: 'm' },
                        { label: 'Batter Ratio H', field: 'batterRatioH' as keyof BatterForm, min: 0.5, max: 5, step: 0.1, unit: '' },
                        { label: 'Batter Ratio V', field: 'batterRatioV' as keyof BatterForm, min: 0.5, max: 3, step: 0.1, unit: '' },
                        { label: 'Embankment Length', field: 'embankmentLength' as keyof BatterForm, min: 1, max: 200, step: 1, unit: 'm' },
                        { label: 'Top Width', field: 'topWidth' as keyof BatterForm, min: 1, max: 20, step: 0.5, unit: 'm' },
                      ].map((s) => (
                        <div key={s.field} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">{form[s.field]} {s.unit}</span>
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
                            aria-label={s.label}
                          />
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                          <FiActivity size={14} /> Live Readout
                        </h3>
                        {[
                          { label: 'Slope Angle', value: `${results?.angle.toFixed(1) ?? '—'}°` },
                          { label: 'Slope Ratio', value: `${results?.ratioH.toFixed(2) ?? '—'} : ${results?.ratioV.toFixed(2) ?? '—'}` },
                          { label: 'Soil Type', value: form.soilType.replace(/_/g, ' ') },
                          { label: 'Operation', value: form.operationType },
                        ].map((stat) => (
                          <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                            <span className="text-gray-500">{stat.label}</span>
                            <span className="text-white font-medium">{stat.value}</span>
                          </div>
                        ))}
                        {results && (
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Last Analysis</div>
                            {[
                              { label: 'Setback', value: `${results.horizontalSetback.toFixed(1)} m`, status: results.status },
                              { label: 'Slope Length', value: `${results.slopeLength.toFixed(1)} m`, status: results.status },
                              { label: 'Cross-Section', value: `${results.crossSectionArea.toFixed(1)} m²`, status: results.status },
                              { label: 'Volume', value: `${results.volume.toFixed(0)} m³`, status: results.status },
                              { label: 'Utilisation', value: `${results.maxUtil.toFixed(1)}%`, status: results.status },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : results.maxUtil > 90 ? 'text-orange-400' : 'text-emerald-400')}>
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

                <WhatIfPreview
                  title="Batters — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  onMaximize={() => setPreviewMaximized(true)}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <Batters3D />
                    </Interactive3DDiagram>
                  )}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card variant="glass" className="p-8 border-neon-cyan/30 shadow-2xl border-l-4 border-l-neon-cyan">
                  <h3 className="text-xl font-bold text-white mb-2">Geometric Outcome</h3>
                  <div className="text-5xl font-black text-white">{results.angle.toFixed(1)}°</div>
                  <p className="text-sm text-gray-400 mt-2">
                    Projection: {results.horizontalSetback.toFixed(1)}m
                  </p>
                </Card>
                <Card variant="glass" className="p-8 border-neon-cyan/30 shadow-2xl border-l-4 border-l-emerald-500">
                  <h3 className="text-xl font-bold text-white mb-2">Safety Factor</h3>
                  <div className="text-5xl font-black text-white">
                    {(results.safeAngle / results.angle).toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Required for {SOIL_TYPES[form.soilType].name}: 1.00
                  </p>
                </Card>
                <Card variant="glass" className="p-8 border-neon-cyan/30 shadow-2xl border-l-4 border-l-neon-purple">
                  <h3 className="text-xl font-bold text-white mb-2">Volume Total</h3>
                  <div className="text-5xl font-black text-white">{results.volume.toFixed(0)}</div>
                  <p className="text-sm text-gray-400 mt-2">
                    m³ based on {form.embankmentLength}m length
                  </p>
                </Card>
              </div>
              {warnings.length > 0 && (
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-red-500 font-bold">
                    <FiAlertTriangle /> Geotechnical Alerts
                  </div>
                  {warnings.map((w, i) => (
                    <div key={i} className="text-sm text-red-400/80">
                      {w}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'visualization' && (
            <motion.div
              key="vis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="aspect-video bg-gray-900 rounded-3xl overflow-hidden border border-gray-700/50 shadow-2xl relative"
            >
              <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                <Batters3D />
              </Interactive3DDiagram>
              <div className="absolute top-8 left-8 p-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl max-w-sm">
                <div className="text-neon-cyan font-bold mb-1">Real-time Profile</div>
                <div className="text-gray-400 text-sm leading-relaxed">
                  This cross-section represents the design batter at {results?.angle.toFixed(1)}°.
                  The shaded area indicates the material volume for{' '}
                  {form.operationType === 'cut' ? 'excavation' : 'fill'}.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Batters;
