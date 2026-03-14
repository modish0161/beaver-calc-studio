// =============================================================================
// Erection Stages Calculator — Premium Version
// Phased lifting/erection planning for steel structures
// =============================================================================
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiPlus,
    FiSettings,
    FiSliders,
    FiTrash2,
    FiZap,
} from 'react-icons/fi';
import ExplainableLabel from '../../components/ExplainableLabel';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import ErectionStages3D from '../../components/3d/scenes/ErectionStages3D';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';

interface Stage {
  id: number;
  name: string;
  members: string;
  weight: string;
  craneRadius: string;
  liftHeight: string;
  duration: string;
  boltCount: string;
  notes: string;
}
interface ErectionForm {
  structureType: string;
  totalWeight: string;
  craneType: string;
  craneCapacity: string;
  projectName: string;
  reference: string;
}
interface ErectionResults {
  totalStages: number;
  totalWeight: number;
  totalDuration: number;
  totalBolts: number;
  maxLiftWeight: number;
  maxRadius: number;
  maxHeight: number;
  craneCapacity: number;
  maxUtil: number;
  status: string;
  criticalStage: string;
}

const CRANE_TYPES: Record<string, { name: string; maxCap: number }> = {
  mobile_50: { name: 'Mobile 50t', maxCap: 50 },
  mobile_100: { name: 'Mobile 100t', maxCap: 100 },
  mobile_200: { name: 'Mobile 200t', maxCap: 200 },
  tower_10: { name: 'Tower (10t tip)', maxCap: 10 },
  tower_20: { name: 'Tower (20t tip)', maxCap: 20 },
  crawler_100: { name: 'Crawler 100t', maxCap: 100 },
  crawler_300: { name: 'Crawler 300t', maxCap: 300 },
};

const PRESETS: Record<string, { name: string; form: Partial<ErectionForm>; stages: Stage[] }> = {
  portal_frame: {
    name: 'Portal Frame (4-bay)',
    form: {
      structureType: 'portal_frame',
      totalWeight: '45',
      craneType: 'mobile_100',
      craneCapacity: '100',
    },
    stages: [
      {
        id: 1,
        name: 'Columns Bay 1-2',
        members: '4',
        weight: '8',
        craneRadius: '12',
        liftHeight: '8',
        duration: '4',
        boltCount: '32',
        notes: 'Base plates pre-set',
      },
      {
        id: 2,
        name: 'Rafters Bay 1-2',
        members: '2',
        weight: '12',
        craneRadius: '14',
        liftHeight: '10',
        duration: '3',
        boltCount: '24',
        notes: 'Apex splice in-situ',
      },
      {
        id: 3,
        name: 'Columns Bay 3-4',
        members: '4',
        weight: '8',
        craneRadius: '18',
        liftHeight: '8',
        duration: '4',
        boltCount: '32',
        notes: '',
      },
      {
        id: 4,
        name: 'Rafters Bay 3-4',
        members: '2',
        weight: '12',
        craneRadius: '20',
        liftHeight: '10',
        duration: '3',
        boltCount: '24',
        notes: '',
      },
      {
        id: 5,
        name: 'Purlins & Bracing',
        members: '30',
        weight: '5',
        craneRadius: '16',
        liftHeight: '9',
        duration: '6',
        boltCount: '120',
        notes: 'Bundles of 5',
      },
    ],
  },
  bridge_girders: {
    name: 'Bridge Girders (2nr)',
    form: {
      structureType: 'bridge',
      totalWeight: '120',
      craneType: 'crawler_300',
      craneCapacity: '300',
    },
    stages: [
      {
        id: 1,
        name: 'Girder 1 Lift',
        members: '1',
        weight: '55',
        craneRadius: '18',
        liftHeight: '12',
        duration: '2',
        boltCount: '0',
        notes: 'Tandem lift',
      },
      {
        id: 2,
        name: 'Girder 2 Lift',
        members: '1',
        weight: '55',
        craneRadius: '20',
        liftHeight: '12',
        duration: '2',
        boltCount: '0',
        notes: 'Tandem lift',
      },
      {
        id: 3,
        name: 'Cross-bracing',
        members: '8',
        weight: '10',
        craneRadius: '16',
        liftHeight: '10',
        duration: '4',
        boltCount: '64',
        notes: '',
      },
    ],
  },
};

const ErectionStages: React.FC = () => {
  const [form, setForm] = useState<ErectionForm>({
    structureType: 'portal_frame',
    totalWeight: '45',
    craneType: 'mobile_100',
    craneCapacity: '100',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'totalWeight', label: 'Total Weight' },
  { key: 'craneCapacity', label: 'Crane Capacity' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'structureType', label: 'Structure Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'totalWeight', label: 'Total Weight', min: 0, max: 100, step: 1, unit: '' },
    { key: 'craneType', label: 'Crane Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'craneCapacity', label: 'Crane Capacity', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [stages, setStages] = useState<Stage[]>([
    {
      id: 1,
      name: 'Stage 1',
      members: '4',
      weight: '10',
      craneRadius: '12',
      liftHeight: '8',
      duration: '4',
      boltCount: '24',
      notes: '',
    },
  ]);
  const [results, setResults] = useState<ErectionResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    setup: true,
    stages: true,
  });

  const updateForm = (field: keyof ErectionForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const addStage = () =>
    setStages((p) => [
      ...p,
      {
        id: p.length + 1,
        name: `Stage ${p.length + 1}`,
        members: '1',
        weight: '5',
        craneRadius: '12',
        liftHeight: '8',
        duration: '2',
        boltCount: '8',
        notes: '',
      },
    ]);
  const removeStage = (id: number) => setStages((p) => p.filter((s) => s.id !== id));
  const updateStage = (id: number, field: keyof Stage, value: string) =>
    setStages((p) => p.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) {
      setForm((prev) => ({ ...prev, ...p.form }));
      setStages(p.stages);
    }
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const craneCap = parseFloat(form.craneCapacity);
    let totalWeight = 0,
      totalDuration = 0,
      totalBolts = 0,
      maxLiftWeight = 0,
      maxRadius = 0,
      maxHeight = 0;
    let criticalStage = '';
    let maxUtil = 0;
    stages.forEach((s) => {
      const wt = parseFloat(s.weight) || 0;
      const r = parseFloat(s.craneRadius) || 0;
      const h = parseFloat(s.liftHeight) || 0;
      totalWeight += wt;
      totalDuration += parseFloat(s.duration) || 0;
      totalBolts += parseInt(s.boltCount) || 0;
      if (wt > maxLiftWeight) maxLiftWeight = wt;
      if (r > maxRadius) maxRadius = r;
      if (h > maxHeight) maxHeight = h;
      const util = (wt / craneCap) * 100;
      if (util > maxUtil) {
        maxUtil = util;
        criticalStage = s.name;
      }
    });
    if (maxUtil > 80 && maxUtil <= 100)
      w.push('Heaviest lift at >80% crane capacity — check load chart carefully');
    if (maxUtil > 100)
      w.push('Lift weight exceeds crane capacity — reduce weight or use larger crane');
    if (maxRadius > 25) w.push('Large crane radius — verify load chart at operating radius');
    if (stages.length > 10) w.push('Complex erection sequence — consider method statement review');
    const status = maxUtil <= 100 ? 'PASS' : 'FAIL';
    setResults({
      totalStages: stages.length,
      totalWeight,
      totalDuration,
      totalBolts,
      maxLiftWeight,
      maxRadius,
      maxHeight,
      craneCapacity: craneCap,
      maxUtil,
      status,
      criticalStage,
    });
    setWarnings(w);
  }, [form, stages]);

  useEffect(() => {
    const t = setTimeout(calculate, 300);
    return () => clearTimeout(t);
  }, [calculate]);

  const exportPDF = async () => {
    if (!results) return;
    const recommendations: { check: string; suggestion: string }[] = [];
    if (results.maxUtil > 80)
      recommendations.push({
        check: 'High Crane Utilisation',
        suggestion: `Max util ${results.maxUtil.toFixed(1)}% — verify load chart at exact radius and boom configuration`,
      });
    if (stages.length > 8)
      recommendations.push({
        check: 'Complex Sequence',
        suggestion: `${stages.length} stages — produce detailed method statement and erection drawings`,
      });
    if (results.maxLiftWeight > 20)
      recommendations.push({
        check: 'Heavy Lift',
        suggestion: `Heaviest lift ${results.maxLiftWeight.toFixed(1)}t — consider tandem lift or sub-assemblies`,
      });
    recommendations.push({
      check: 'Overall',
      suggestion:
        results.status === 'PASS'
          ? 'All crane capacity checks pass — erection sequence acceptable'
          : 'CRANE CAPACITY EXCEEDED — revise erection sequence before proceeding',
    });
    try {
      await generatePremiumPDF({
        title: 'Erection Stages',
        subtitle: form.structureType,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Reference', value: form.reference || '-' },
        ],
        inputs: [
          { label: 'Structure Type', value: form.structureType },
          { label: 'Crane', value: CRANE_TYPES[form.craneType]?.name || form.craneType },
          { label: 'Crane Capacity', value: form.craneCapacity, unit: 't' },
          { label: 'Total Stages', value: results.totalStages },
          { label: 'Total Weight', value: results.totalWeight.toFixed(1), unit: 't' },
          { label: 'Total Duration', value: results.totalDuration.toFixed(0), unit: 'hrs' },
          { label: 'Max Lift Weight', value: results.maxLiftWeight.toFixed(1), unit: 't' },
          { label: 'Max Radius', value: results.maxRadius.toFixed(1), unit: 'm' },
        ],
        checks: [
          {
            name: 'Crane Capacity',
            capacity: `${results.craneCapacity} t`,
            utilisation: `${results.maxUtil.toFixed(1)}%`,
            status: results.status as 'PASS' | 'FAIL',
          },
        ],
        sections: [
          {
            title: 'Erection Stages',
            head: [['Stage', 'Members', 'Weight (t)', 'Radius (m)', 'Height (m)', 'Duration (h)']],
            body: stages.map((s) => [
              s.name,
              s.members,
              s.weight,
              s.craneRadius,
              s.liftHeight,
              s.duration,
            ]),
          },
        ],
        recommendations,
        warnings,
        footerNote: 'BeaverCalc Studio — Erection Stages',
      });
    } catch (e) {
      console.error(e);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Erection Stages',
      subtitle: form.structureType,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
      ],
      inputs: [
        { label: 'Structure Type', value: form.structureType },
        { label: 'Crane', value: CRANE_TYPES[form.craneType]?.name || form.craneType },
        { label: 'Crane Capacity', value: form.craneCapacity, unit: 't' },
        { label: 'Total Stages', value: results.totalStages },
        { label: 'Total Weight', value: results.totalWeight.toFixed(1), unit: 't' },
        { label: 'Total Duration', value: results.totalDuration.toFixed(0), unit: 'hrs' },
      ],
      checks: [
        {
          name: 'Crane Capacity',
          capacity: `${results.craneCapacity} t`,
          utilisation: `${results.maxUtil.toFixed(1)}%`,
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio \u2014 Erection Stages',
    });
  };

  const Section: React.FC<{
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    children: React.ReactNode;
  }> = ({ id, title, icon, color, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border overflow-hidden shadow-lg shadow-neon-cyan/5', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
            {icon}
          </div>
          <span className="text-xl font-bold text-white">{title}</span>
        </div>
        {expandedSections[id] ? (
          <FiChevronDown className="text-gray-400" />
        ) : (
          <FiChevronRight className="text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {expandedSections[id] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-gray-900/30"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">Construction Planning</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-4">
            Erection Stages
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Phased erection planning with crane capacity checks, timeline visualisation, and bolt
            counts
          </p>
          <div className="inline-flex items-center gap-2 mt-4 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-3">
            <Button
              onClick={exportPDF}
              disabled={!results}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <FiDownload className="mr-2" />
              PDF
            </Button>
            <Button
              onClick={exportDOCX}
              disabled={!results}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <FiDownload className="mr-2" />
              DOCX
            </Button>
            <SaveRunButton calculatorKey="erection-stages" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
          </div>
        </motion.div>

        {/* Project Info */}
        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <ExplainableLabel
                  label="Project Name"
                  field="erection-project-name"
                  className="text-sm font-semibold text-gray-200"
                />
                <input
                  title="Project Name"
                  type="text"
                  value={form.projectName}
                  onChange={(e) => updateForm('projectName', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <ExplainableLabel
                  label="Reference"
                  field="erection-reference"
                  className="text-sm font-semibold text-gray-200"
                />
                <input
                  title="Reference"
                  type="text"
                  value={form.reference}
                  onChange={(e) => updateForm('reference', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Presets */}
        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                <FiZap className="w-6 h-6 text-neon-cyan" />
              </div>
              Quick Presets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([k, p]) => (
                <Button
                  key={k}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(k)}
                  className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          {(['input', 'results', 'visualization'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab)}
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

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-4">
                {/* Crane & Structure */}
                <Section
                  id="setup"
                  title="Crane & Structure"
                  icon={<FiSettings className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <ExplainableLabel
                        label="Crane Type"
                        field="erection-crane-type"
                        className="text-sm font-semibold text-gray-200"
                      />
                      <select
                        value={form.craneType}
                        onChange={(e) => {
                          updateForm('craneType', e.target.value);
                          const c = CRANE_TYPES[e.target.value];
                          if (c) updateForm('craneCapacity', c.maxCap.toString());
                        }}
                        title="Crane Type"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(CRANE_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <ExplainableLabel
                        label="Crane Capacity (at radius)"
                        field="erection-crane-capacity"
                        className="text-sm font-semibold text-gray-200"
                      />
                      <div className="relative">
                        <input
                          title="Crane Capacity (at radius)"
                          type="number"
                          value={form.craneCapacity}
                          onChange={(e) => updateForm('craneCapacity', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          t
                        </span>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Erection Stages */}
                <Section
                  id="stages"
                  title={`Erection Stages (${stages.length})`}
                  icon={<FiLayers className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="space-y-3">
                    {stages.map((s) => (
                      <div
                        key={s.id}
                        className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <input
                            title="Stage Name"
                            type="text"
                            value={s.name}
                            onChange={(e) => updateStage(s.id, 'name', e.target.value)}
                            className="bg-transparent text-white font-medium focus:outline-none border-b border-transparent focus:border-neon-cyan"
                          />
                          <button
                            title="Delete"
                            onClick={() => removeStage(s.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <label className="text-xs font-semibold text-gray-200">Members</label>
                            <input
                              title="Members"
                              type="number"
                              value={s.members}
                              onChange={(e) => updateStage(s.id, 'members', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-200">Weight (t)</label>
                            <input
                              title="Weight (t)"
                              type="number"
                              value={s.weight}
                              onChange={(e) => updateStage(s.id, 'weight', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-200">Radius (m)</label>
                            <input
                              title="Radius (m)"
                              type="number"
                              value={s.craneRadius}
                              onChange={(e) => updateStage(s.id, 'craneRadius', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-200">Height (m)</label>
                            <input
                              title="Height (m)"
                              type="number"
                              value={s.liftHeight}
                              onChange={(e) => updateStage(s.id, 'liftHeight', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-200">Duration (h)</label>
                            <input
                              title="Duration (h)"
                              type="number"
                              value={s.duration}
                              onChange={(e) => updateStage(s.id, 'duration', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-200">Bolts</label>
                            <input
                              title="Bolts"
                              type="number"
                              value={s.boltCount}
                              onChange={(e) => updateStage(s.id, 'boltCount', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addStage}
                      className="w-full text-gray-300 border-gray-700 hover:bg-gray-800"
                    >
                      <FiPlus className="mr-2" /> Add Stage
                    </Button>
                  </div>
                </Section>

                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>

              <div className="sticky top-8 space-y-4">
              <Card
                variant="glass"
                className={cn(
                  'p-6 border-l-4 shadow-2xl',
                  results?.status === 'PASS'
                    ? 'border-l-green-500 border-green-500/30 shadow-green-500/10'
                    : results?.status === 'FAIL'
                      ? 'border-l-red-500 border-red-500/30 shadow-red-500/10'
                      : 'border-l-purple-500 border-neon-cyan/30 shadow-purple-500/5',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {results?.status === 'PASS' && <FiCheck className="w-5 h-5 text-green-400" />}
                  <h3 className="text-white font-bold">Summary</h3>
                </div>
                <div
                  className={cn(
                    'text-xl font-bold',
                    results?.status === 'PASS'
                      ? 'text-green-400'
                      : results?.status === 'FAIL'
                        ? 'text-red-400'
                        : 'text-gray-400',
                  )}
                >
                  {results?.status || '-'}
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {results?.totalStages} stages — {results?.totalWeight.toFixed(1)}t total,{' '}
                  {results?.totalDuration.toFixed(0)} hrs
                </p>
              </Card>
              {results && (
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {results.maxUtil > 80 && (
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">⚠</span>
                        <span className="text-gray-300">
                          Crane util &gt;80% on critical lift — verify load chart at exact radius
                        </span>
                      </div>
                    )}
                    {stages.length > 8 && (
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">⚠</span>
                        <span className="text-gray-300">
                          Complex sequence ({stages.length} stages) — produce detailed method
                          statement
                        </span>
                      </div>
                    )}
                    {results.maxLiftWeight > 20 && (
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">ℹ</span>
                        <span className="text-gray-300">
                          Heaviest lift {results.maxLiftWeight.toFixed(1)}t — consider tandem lift
                          or sub-assemblies
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-800">
                      <span
                        className={cn(
                          'font-medium',
                          results.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                        )}
                      >
                        {results.status === 'PASS'
                          ? '✓ All crane capacity checks pass'
                          : '✗ Crane capacity exceeded — revise sequence'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>
            </motion.div>
          )}

          {activeTab === 'visualization' && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
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
                      <ErectionStages3D />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                      title="Close fullscreen"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      ERECTION STAGES — REAL-TIME PREVIEW
                    </div>
                  </div>
                  <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                    <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                      <FiSliders size={14} /> Live Parameters
                    </h3>
                    {[
                      { label: 'Structure Type', value: form.structureType },
                      { label: 'Total Weight', value: `${form.totalWeight} t` },
                      { label: 'Crane Type', value: form.craneType },
                      { label: 'Crane Capacity', value: `${form.craneCapacity} t` },
                      { label: 'No. Stages', value: `${stages.length}` },
                    ].map((p) => (
                      <div key={p.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                        <span className="text-gray-500">{p.label}</span>
                        <span className="text-white font-medium">{p.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-700 pt-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                        <FiActivity size={14} /> Live Readout
                      </h3>
                      {[
                        { label: 'Total Stages', value: results ? `${results.totalStages}` : '—' },
                        { label: 'Total Weight', value: results ? `${results.totalWeight.toFixed(1)} t` : '—' },
                        { label: 'Total Duration', value: results ? `${results.totalDuration.toFixed(0)} hrs` : '—' },
                        { label: 'Max Lift Weight', value: results ? `${results.maxLiftWeight.toFixed(1)} t` : '—' },
                        { label: 'Max Radius', value: results ? `${results.maxRadius.toFixed(1)} m` : '—' },
                        { label: 'Critical Stage', value: results ? results.criticalStage : '—' },
                      ].map((stat) => (
                        <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                          <span className="text-gray-500">{stat.label}</span>
                          <span className="text-white font-medium">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                    {results && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Last Analysis</div>
                        {[
                          { label: 'Crane Util', util: results.maxUtil.toFixed(1), status: results.status },
                        ].map((check) => (
                          <div key={check.label} className="flex justify-between text-xs py-0.5">
                            <span className="text-gray-500">{check.label}</span>
                            <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util || '0')) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                              {check.util}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors"
                    >
                      Close Fullscreen
                    </button>
                  </div>
                </motion.div>
              )}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setPreviewMaximized(true)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                  title="Fullscreen preview"
                >
                  <FiMaximize2 size={16} />
                </button>
              </div>
              <WhatIfPreview
                title="Erection Stages — 3D Preview"
                sliders={whatIfSliders}
                form={form}
                updateForm={updateForm}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                    <ErectionStages3D />
                  </Interactive3DDiagram>
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ErectionStages;
