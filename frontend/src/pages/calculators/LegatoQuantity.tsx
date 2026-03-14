// =============================================================================
// Legato Block Count Calculator — Premium Version
// =============================================================================
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiBox,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMinimize2,
    FiSliders,
    FiTruck
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import LegatoWall3D from '../../components/3d/scenes/LegatoWall3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';

interface LegatoForm {
  wallLength: string;
  wallHeight: string;
  numberOfWalls: string;
  blockType: string;
  bondPattern: string;
  includeHalfBlocks: boolean;
  deliveryLoadSize: string;
  costPerBlock: string;
  projectName: string;
  reference: string;
}
interface LegatoResults {
  wallArea: number;
  totalArea: number;
  fullBlocks: number;
  halfBlocks: number;
  totalBlocks: number;
  totalWeight: number;
  deliveryLoads: number;
  totalCost: number;
  status: string;
}

const BLOCK_TYPES: Record<
  string,
  { name: string; l: number; w: number; h: number; weight: number; coverArea: number }
> = {
  full_16: {
    name: 'Full Block (1600×800×800)',
    l: 1600,
    w: 800,
    h: 800,
    weight: 2400,
    coverArea: 1.28,
  },
  full_12: {
    name: 'Full Block (1200×600×600)',
    l: 1200,
    w: 600,
    h: 600,
    weight: 1200,
    coverArea: 0.72,
  },
  half_16: {
    name: 'Half Block (800×800×800)',
    l: 800,
    w: 800,
    h: 800,
    weight: 1200,
    coverArea: 0.64,
  },
  full_24: {
    name: 'XL Block (2400×800×800)',
    l: 2400,
    w: 800,
    h: 800,
    weight: 3600,
    coverArea: 1.92,
  },
};

const PRESETS: Record<string, { name: string; form: Partial<LegatoForm> }> = {
  small_wall: {
    name: 'Small Wall (10×1.6m)',
    form: { wallLength: '10', wallHeight: '1.6', numberOfWalls: '1', blockType: 'full_16' },
  },
  medium_wall: {
    name: 'Medium Wall (20×2.4m)',
    form: { wallLength: '20', wallHeight: '2.4', numberOfWalls: '1', blockType: 'full_16' },
  },
  compound: {
    name: 'Compound (3-sided)',
    form: { wallLength: '15', wallHeight: '2.4', numberOfWalls: '3', blockType: 'full_16' },
  },
  storage_bay: {
    name: 'Storage Bay (8×3.2m)',
    form: { wallLength: '8', wallHeight: '3.2', numberOfWalls: '3', blockType: 'full_16' },
  },
};

const LegatoQuantity: React.FC = () => {
  const [form, setForm] = useState<LegatoForm>({
    wallLength: '15',
    wallHeight: '2.4',
    numberOfWalls: '1',
    blockType: 'full_16',
    bondPattern: 'stretcher',
    includeHalfBlocks: true,
    deliveryLoadSize: '12',
    costPerBlock: '85',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'wallLength', label: 'Wall Length' },
  { key: 'wallHeight', label: 'Wall Height' },
  { key: 'numberOfWalls', label: 'Number Of Walls' },
  { key: 'deliveryLoadSize', label: 'Delivery Load Size' },
  { key: 'costPerBlock', label: 'Cost Per Block' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'wallLength', label: 'Wall Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'wallHeight', label: 'Wall Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'numberOfWalls', label: 'Number Of Walls', min: 0, max: 100, step: 1, unit: '' },
    { key: 'blockType', label: 'Block Type', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<LegatoResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    wall: true,
    block: true,
    delivery: false,
  });
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const updateForm = (field: keyof LegatoForm, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const L = parseFloat(form.wallLength),
      H = parseFloat(form.wallHeight),
      nWalls = parseInt(form.numberOfWalls);
    const block = BLOCK_TYPES[form.blockType];
    const loadSize = parseInt(form.deliveryLoadSize);
    const costPer = parseFloat(form.costPerBlock);
    const wallArea = L * H;
    const totalArea = wallArea * nWalls;
    const blockH = block.h / 1000,
      blockL = block.l / 1000;
    const rows = Math.ceil(H / blockH),
      cols = Math.ceil(L / blockL);
    let fullBlocks = cols * rows * nWalls,
      halfBlocks = 0;
    if (form.includeHalfBlocks && form.bondPattern === 'stretcher') {
      const sr = Math.floor(rows / 2);
      halfBlocks = sr * 2 * nWalls;
      fullBlocks -= sr * nWalls;
    }
    const totalBlocks = fullBlocks + halfBlocks;
    const totalWeight = (fullBlocks * block.weight + (halfBlocks * block.weight) / 2) / 1000;
    const deliveryLoads = Math.ceil(totalBlocks / loadSize);
    const totalCost = totalBlocks * costPer;
    if (H > 4.0) w.push('Wall height exceeds 4.0m — structural stability check required');
    if (rows > 5) w.push('More than 5 courses high — consider intermediate support');
    if (totalWeight > 100) w.push('Total weight exceeds 100t — plan crane availability');
    setResults({
      wallArea,
      totalArea,
      fullBlocks,
      halfBlocks,
      totalBlocks,
      totalWeight,
      deliveryLoads,
      totalCost,
      status: 'OK',
    });
    setWarnings(w);
  }, [form]);

  useEffect(() => {
    const t = setTimeout(calculate, 300);
    return () => clearTimeout(t);
  }, [calculate]);

  const exportPDF = async () => {
    if (!results) return;
    const block = BLOCK_TYPES[form.blockType];
    const recommendations: { check: string; suggestion: string }[] = [];
    if (parseFloat(form.wallHeight) > 3.2)
      recommendations.push({
        check: 'High Wall',
        suggestion: `Wall height ${form.wallHeight}m — structural stability assessment required`,
      });
    if (results.deliveryLoads > 5)
      recommendations.push({
        check: 'Logistics',
        suggestion: `${results.deliveryLoads} delivery loads — plan unloading schedule and crane availability`,
      });
    if (results.totalWeight > 50)
      recommendations.push({
        check: 'Heavy Load',
        suggestion: `Total weight ${results.totalWeight.toFixed(0)}t — verify ground bearing capacity for storage area`,
      });
    recommendations.push({
      check: 'Overall',
      suggestion: `Quantity complete — ${results.totalBlocks} blocks, ${results.deliveryLoads} loads, £${results.totalCost.toFixed(0)} total`,
    });
    try {
      await generatePremiumPDF({
        title: 'Legato Block Count',
        subtitle: block.name,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Reference', value: form.reference || '-' },
        ],
        inputs: [
          { label: 'Wall Length', value: form.wallLength, unit: 'm' },
          { label: 'Wall Height', value: form.wallHeight, unit: 'm' },
          { label: 'Number of Walls', value: form.numberOfWalls },
          { label: 'Block Type', value: block.name },
          { label: 'Bond Pattern', value: form.bondPattern },
          { label: 'Blocks per Load', value: form.deliveryLoadSize },
          { label: 'Cost per Block', value: form.costPerBlock, unit: '£' },
        ],
        checks: [
          {
            name: 'Block Count',
            capacity: `${results.totalBlocks}`,
            utilisation: `${results.deliveryLoads} loads`,
            status: 'PASS' as const,
          },
        ],
        sections: [
          {
            title: 'Quantities Summary',
            head: [['Item', 'Value', 'Unit']],
            body: [
              ['Wall Area (each)', results.wallArea.toFixed(1), 'm²'],
              ['Total Area', results.totalArea.toFixed(1), 'm²'],
              ['Full Blocks', results.fullBlocks.toString(), 'nr'],
              ['Half Blocks', results.halfBlocks.toString(), 'nr'],
              ['Total Blocks', results.totalBlocks.toString(), 'nr'],
              ['Total Weight', results.totalWeight.toFixed(1), 't'],
              ['Delivery Loads', results.deliveryLoads.toString(), ''],
              ['Total Cost', `£${results.totalCost.toFixed(0)}`, ''],
            ],
          },
        ],
        recommendations,
        warnings,
        footerNote: 'BeaverCalc Studio — Legato Quantities',
      });
    } catch (e) {
      console.error(e);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    const block = BLOCK_TYPES[form.blockType];
    generateDOCX({
      title: 'Legato Block Count',
      subtitle: block.name,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
      ],
      inputs: [
        { label: 'Wall Length', value: form.wallLength, unit: 'm' },
        { label: 'Wall Height', value: form.wallHeight, unit: 'm' },
        { label: 'Number of Walls', value: form.numberOfWalls },
        { label: 'Block Type', value: block.name },
        { label: 'Blocks per Load', value: form.deliveryLoadSize },
      ],
      checks: [
        {
          name: 'Block Count',
          capacity: `${results.totalBlocks}`,
          utilisation: `${results.deliveryLoads} loads`,
          status: 'PASS' as const,
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio \u2014 Legato Quantities',
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
      className={cn('rounded-2xl border overflow-hidden shadow-lg shadow-gray-500/5', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            {icon}
          </div>
          <span className="font-semibold text-white">{title}</span>
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

  const InputField: React.FC<{
    label: string;
    field: keyof LegatoForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title={label}
          type={type}
          value={form[field] as string}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-500/20 border border-gray-500/30 text-gray-300 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">Site Quantities</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Legato Block Count
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Concrete block quantity estimator for Legato retaining walls and storage bays
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button onClick={exportPDF} disabled={!results} className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-600/50 rounded-lg px-4 py-2">
            <FiDownload className="w-4 h-4" /> PDF
          </Button>
          <Button onClick={exportDOCX} disabled={!results} className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-600/50 rounded-lg px-4 py-2">
            <FiDownload className="w-4 h-4" /> DOCX
          </Button>
          <div className="flex-1" />
          <SaveRunButton calculatorKey="legato-quantity" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
        </div>

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

        <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="Project Name" field="projectName" type="text" />
              <InputField label="Reference" field="reference" type="text" />
            </div>
          </CardContent>
        </Card>
        <WhatIfPreview
          title="Legato Quantity — 3D Preview"
          sliders={whatIfSliders}
          form={form}
          updateForm={updateForm}
          status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
          onMaximize={() => setPreviewMaximized(true)}
          renderScene={(fsHeight) => (
            <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
              <CardContent className="p-4">
                <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                  <LegatoWall3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          )}
        />
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
                <Section
                  id="wall"
                  title="Wall Geometry"
                  icon={<FiLayers className="w-6 h-6 text-blue-400" />}
                  color="border-gray-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Wall Length" field="wallLength" unit="m" />
                    <InputField label="Wall Height" field="wallHeight" unit="m" />
                    <InputField label="Number of Walls" field="numberOfWalls" />
                  </div>
                </Section>
                <Section
                  id="block"
                  title="Block Specification"
                  icon={<FiBox className="w-6 h-6 text-blue-400" />}
                  color="border-gray-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Block Type</label>
                      <select
                        value={form.blockType}
                        onChange={(e) => updateForm('blockType', e.target.value)}
                        title="Block Type"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(BLOCK_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name} — {v.weight}kg
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Bond Pattern</label>
                      <select
                        value={form.bondPattern}
                        onChange={(e) => updateForm('bondPattern', e.target.value)}
                        title="Bond Pattern"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="stretcher">Stretcher Bond</option>
                        <option value="stack">Stack Bond</option>
                      </select>
                    </div>
                  </div>
                </Section>
                <Section
                  id="delivery"
                  title="Delivery & Cost"
                  icon={<FiTruck className="w-6 h-6 text-blue-400" />}
                  color="border-gray-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Blocks per Load" field="deliveryLoadSize" />
                    <InputField label="Cost per Block" field="costPerBlock" unit="£" />
                  </div>
                </Section>

                {/* RUN FULL ANALYSIS button */}
                <button
                  onClick={calculate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
                </button>
              </div>
              <div className="space-y-4 sticky top-8">
                <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardContent className="p-4">
                    <Interactive3DDiagram height="350px" cameraPosition={[8, 6, 8]}>
                      <LegatoWall3D />
                    </Interactive3DDiagram>
                  </CardContent>
                </Card>
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <Card className="bg-green-900/20 border-2 border-green-500/50 shadow-lg shadow-green-500/10">
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <FiCheck className="w-6 h-6 text-green-400" />
                          <span className="text-2xl font-bold text-green-400">CALCULATED</span>
                        </div>
                        <p className="text-sm text-gray-400">{results.totalBlocks} blocks total</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white font-semibold">Block Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Wall Area</p>
                          <p className="text-white font-mono">{results.totalArea.toFixed(1)} m²</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Full Blocks</p>
                          <p className="text-white font-mono">{results.fullBlocks}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Half Blocks</p>
                          <p className="text-white font-mono">{results.halfBlocks}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total</p>
                          <p className="text-white font-mono text-lg">{results.totalBlocks}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Weight</p>
                          <p className="text-white font-mono">{results.totalWeight.toFixed(1)} t</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Loads</p>
                          <p className="text-white font-mono">{results.deliveryLoads}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-green-400">
                      <CardContent className="text-center p-4">
                        <p className="text-3xl font-bold text-white font-mono">
                          £{results.totalCost.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">@ £{form.costPerBlock}/block</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-yellow-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white font-semibold">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {parseFloat(form.wallHeight) > 3.2 && (
                          <div className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">⚠</span>
                            <span className="text-gray-300">
                              Wall height &gt;3.2m — structural stability assessment required
                            </span>
                          </div>
                        )}
                        {results.deliveryLoads > 5 && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">ℹ</span>
                            <span className="text-gray-300">
                              {results.deliveryLoads} delivery loads — plan unloading schedule and
                              crane availability
                            </span>
                          </div>
                        )}
                        {results.totalWeight > 50 && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">ℹ</span>
                            <span className="text-gray-300">
                              Total weight {results.totalWeight.toFixed(0)}t — verify ground bearing
                              for storage
                            </span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-800">
                          <span className="text-green-400 font-medium">
                            ✓ {results.totalBlocks} blocks across {results.deliveryLoads} loads
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    {warnings.length > 0 && (
                      <Card className="bg-amber-900/20 border-amber-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FiAlertTriangle className="text-amber-400" />
                            <span className="text-amber-400 font-medium">Warnings</span>
                          </div>
                          <ul className="space-y-1">
                            {warnings.map((w, i) => (
                              <li key={i} className="text-sm text-amber-200/80">
                                • {w}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        className="w-full bg-gradient-to-r from-gray-600 to-gray-600 hover:from-gray-500 hover:to-gray-500"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> Export PDF Report
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> DOCX
                      </Button>
                      <SaveRunButton calculatorKey="legato-quantity" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <LegatoWall3D />
                </Interactive3DDiagram>
                <button
                  onClick={() => setPreviewMaximized(false)}
                  className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                  aria-label="Minimize preview"
                >
                  <FiMinimize2 size={20} />
                </button>
                <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                  LEGATO QUANTITY — REAL-TIME PREVIEW
                </div>
              </div>
              <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                  <FiSliders size={14} /> Live Parameters
                </h3>
                {[
                  { label: 'Wall Length', value: `${form.wallLength || '0'} m` },
                  { label: 'Wall Height', value: `${form.wallHeight || '0'} m` },
                  { label: 'No. Walls', value: form.numberOfWalls || '1' },
                  { label: 'Block Type', value: BLOCK_TYPES[form.blockType]?.name || form.blockType },
                  { label: 'Bond Pattern', value: form.bondPattern },
                  { label: 'Half Blocks', value: form.includeHalfBlocks ? 'Yes' : 'No' },
                  { label: 'Delivery Load', value: `${form.deliveryLoadSize || '0'} blocks` },
                  { label: 'Cost/Block', value: `£${form.costPerBlock || '0'}` },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                    <span className="text-gray-500">{stat.label}</span>
                    <span className="text-white font-medium">{stat.value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                    <FiActivity size={14} /> Live Readout
                  </h3>
                  {results ? (
                    <>
                      {[
                        { label: 'Wall Area', value: `${results.wallArea.toFixed(1)} m²` },
                        { label: 'Total Area', value: `${results.totalArea.toFixed(1)} m²` },
                        { label: 'Full Blocks', value: `${results.fullBlocks}` },
                        { label: 'Half Blocks', value: `${results.halfBlocks}` },
                        { label: 'Total Blocks', value: `${results.totalBlocks}` },
                        { label: 'Weight', value: `${(results.totalWeight / 1000).toFixed(1)} t` },
                        { label: 'Deliveries', value: `${results.deliveryLoads}` },
                        { label: 'Total Cost', value: `£${results.totalCost.toLocaleString()}` },
                      ].map((stat) => (
                        <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                          <span className="text-gray-500">{stat.label}</span>
                          <span className="text-emerald-400 font-medium">{stat.value}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-xs text-gray-600 italic">Run analysis to see results</p>
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
      </div>
    </div>
  );
};

export default LegatoQuantity;
