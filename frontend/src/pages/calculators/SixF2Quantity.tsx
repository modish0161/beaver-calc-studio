// =============================================================================
// 6F2 / Type 1 Quantity Calculator — Premium Version
// Granular fill volume, tonnage, and cost estimation
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
    FiGrid,
    FiLayers,
    FiMinimize2,
    FiSliders,
    FiTruck,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import LegatoWall3D from '../../components/3d/scenes/LegatoWall3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// Types
// =============================================================================

interface SixF2Form {
  // Area
  platformShape: string;
  platformLength: string;
  platformWidth: string;
  platformRadius: string;
  // Depth
  layerDepth: string;
  numberOfLayers: string;
  // Material
  materialType: string;
  bulkDensity: string;
  compactionFactor: string;
  // Transport
  truckCapacity: string;
  costPerTonne: string;
  // Project
  projectName: string;
  reference: string;
}

interface SixF2Results {
  planArea: number;
  totalDepth: number;
  looseVolume: number;
  compactedVolume: number;
  tonnage: number;
  numberOfLoads: number;
  totalCost: number;
  status: string;
}

// =============================================================================
// Constants
// =============================================================================

const MATERIAL_TYPES: Record<string, { name: string; density: number; compaction: number }> = {
  '6F2': { name: '6F2 (Coarse Graded)', density: 2.0, compaction: 1.25 },
  type1: { name: 'Type 1 Sub-base', density: 2.24, compaction: 1.2 },
  type2: { name: 'Type 2 Sub-base', density: 2.1, compaction: 1.2 },
  '6F5': { name: '6F5 (Sand/Gravel)', density: 1.8, compaction: 1.15 },
  mot: { name: 'MOT Type 1', density: 2.24, compaction: 1.2 },
  crushed_concrete: { name: 'Crushed Concrete (6F1)', density: 1.9, compaction: 1.3 },
};

const PRESETS: Record<string, { name: string; form: Partial<SixF2Form> }> = {
  crane_pad: {
    name: 'Crane Pad (12×12m)',
    form: {
      platformShape: 'rectangle',
      platformLength: '12',
      platformWidth: '12',
      layerDepth: '600',
      numberOfLayers: '1',
      materialType: '6F2',
    },
  },
  working_platform: {
    name: 'Working Platform (30×20m)',
    form: {
      platformShape: 'rectangle',
      platformLength: '30',
      platformWidth: '20',
      layerDepth: '300',
      numberOfLayers: '2',
      materialType: 'type1',
    },
  },
  haul_road: {
    name: 'Haul Road (100×5m)',
    form: {
      platformShape: 'rectangle',
      platformLength: '100',
      platformWidth: '5',
      layerDepth: '350',
      numberOfLayers: '2',
      materialType: 'mot',
    },
  },
  compound: {
    name: 'Site Compound (50×30m)',
    form: {
      platformShape: 'rectangle',
      platformLength: '50',
      platformWidth: '30',
      layerDepth: '200',
      numberOfLayers: '1',
      materialType: 'type1',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const SixF2Quantity: React.FC = () => {
  const [form, setForm] = useState<SixF2Form>({
    platformShape: 'rectangle',
    platformLength: '20',
    platformWidth: '15',
    platformRadius: '10',
    layerDepth: '300',
    numberOfLayers: '2',
    materialType: '6F2',
    bulkDensity: '2.0',
    compactionFactor: '1.25',
    truckCapacity: '20',
    costPerTonne: '18',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'platformLength', label: 'Platform Length' },
  { key: 'platformWidth', label: 'Platform Width' },
  { key: 'platformRadius', label: 'Platform Radius' },
  { key: 'layerDepth', label: 'Layer Depth' },
  { key: 'numberOfLayers', label: 'Number Of Layers' },
  { key: 'bulkDensity', label: 'Bulk Density' },
  { key: 'compactionFactor', label: 'Compaction Factor' },
  { key: 'truckCapacity', label: 'Truck Capacity' },
  { key: 'costPerTonne', label: 'Cost Per Tonne' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'platformShape', label: 'Platform Shape', min: 0, max: 100, step: 1, unit: '' },
    { key: 'platformLength', label: 'Platform Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'platformWidth', label: 'Platform Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'platformRadius', label: 'Platform Radius', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<SixF2Results | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    area: true,
    depth: true,
    material: true,
    transport: false,
  });

  const [previewMaximized, setPreviewMaximized] = useState(false);

  // Handlers
  const updateForm = (field: keyof SixF2Form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setForm((prev) => {
        const updated = { ...prev, ...preset.form };
        const mat = MATERIAL_TYPES[updated.materialType];
        if (mat) {
          updated.bulkDensity = mat.density.toString();
          updated.compactionFactor = mat.compaction.toString();
        }
        return updated;
      });
    }
  };

  const onMaterialChange = (val: string) => {
    const mat = MATERIAL_TYPES[val];
    if (mat) {
      setForm((prev) => ({
        ...prev,
        materialType: val,
        bulkDensity: mat.density.toString(),
        compactionFactor: mat.compaction.toString(),
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // Calculation
  // ---------------------------------------------------------------------------
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const newWarnings: string[] = [];

    const L = parseFloat(form.platformLength);
    const W = parseFloat(form.platformWidth);
    const R = parseFloat(form.platformRadius);
    const d = parseFloat(form.layerDepth) / 1000; // mm → m
    const nLayers = parseInt(form.numberOfLayers);
    const rho = parseFloat(form.bulkDensity); // t/m³
    const cf = parseFloat(form.compactionFactor);
    const truckCap = parseFloat(form.truckCapacity);
    const cost = parseFloat(form.costPerTonne);

    // Plan area
    let planArea = 0;
    if (form.platformShape === 'rectangle') {
      planArea = L * W;
    } else {
      planArea = Math.PI * R * R;
    }

    const totalDepth = d * nLayers;
    const compactedVolume = planArea * totalDepth;
    const looseVolume = compactedVolume * cf;
    const tonnage = compactedVolume * rho;
    const numberOfLoads = Math.ceil(tonnage / truckCap);
    const totalCost = tonnage * cost;

    // Warnings
    if (totalDepth > 1.5) {
      newWarnings.push('Total depth exceeds 1.5m — consider phased compaction approach');
    }
    if (d > 0.3 && form.materialType.includes('type')) {
      newWarnings.push('Layer depth exceeds 300mm — BS 6031 recommends ≤300mm per compacted layer');
    }
    if (numberOfLoads > 50) {
      newWarnings.push('Large number of deliveries — check site access and storage capacity');
    }

    setResults({
      planArea,
      totalDepth,
      looseVolume,
      compactedVolume,
      tonnage,
      numberOfLoads,
      totalCost,
      status: 'OK',
    });
    setWarnings(newWarnings);
  }, [form]);

  useEffect(() => {
    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [calculate]);

  // ---------------------------------------------------------------------------
  // Canvas
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // PDF Export
  // ---------------------------------------------------------------------------
  const exportPDF = async () => {
    if (!results) return;
    try {
      const pdfRecs: { check: string; suggestion: string }[] = [];
      if (results.totalDepth > 1.0)
        pdfRecs.push({
          check: 'Deep Fill',
          suggestion: `Total depth ${(results.totalDepth * 1000).toFixed(0)}mm — ensure adequate compaction plant available`,
        });
      if (results.numberOfLoads > 30)
        pdfRecs.push({
          check: 'Many Deliveries',
          suggestion: `${results.numberOfLoads} loads required — plan access route and traffic management`,
        });
      if (parseFloat(form.layerDepth) > 300)
        pdfRecs.push({
          check: 'Layer Depth',
          suggestion: 'Layer depth >300mm — BS 6031 recommends ≤300mm per compacted layer',
        });
      pdfRecs.push({
        check: 'Overall',
        suggestion: `Quantity estimate: ${results.tonnage.toFixed(1)}t across ${results.numberOfLoads} deliveries`,
      });

      await generatePremiumPDF({
        title: '6F2 / Type 1 Quantity Calculator',
        subtitle: MATERIAL_TYPES[form.materialType]?.name || form.materialType,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Reference', value: form.reference || '-' },
          {
            label: 'Material',
            value: MATERIAL_TYPES[form.materialType]?.name || form.materialType,
          },
        ],
        inputs: [
          { label: 'Platform Shape', value: form.platformShape },
          {
            label: 'Plan Dimensions',
            value:
              form.platformShape === 'rectangle'
                ? `${form.platformLength} × ${form.platformWidth}`
                : `R = ${form.platformRadius}`,
            unit: 'm',
          },
          { label: 'Layer Depth', value: form.layerDepth, unit: 'mm' },
          { label: 'Number of Layers', value: form.numberOfLayers },
          { label: 'Bulk Density', value: form.bulkDensity, unit: 't/m³' },
          { label: 'Compaction Factor', value: form.compactionFactor },
          { label: 'Truck Capacity', value: form.truckCapacity, unit: 't' },
          { label: 'Cost per Tonne', value: `£${form.costPerTonne}/t` },
        ],
        sections: [
          {
            title: 'Quantity Summary',
            head: [['Item', 'Value', 'Unit']],
            body: [
              ['Plan Area', results.planArea.toFixed(1), 'm²'],
              ['Total Depth', (results.totalDepth * 1000).toFixed(0), 'mm'],
              ['Compacted Volume', results.compactedVolume.toFixed(1), 'm³'],
              ['Loose Volume (for ordering)', results.looseVolume.toFixed(1), 'm³'],
              ['Tonnage', results.tonnage.toFixed(1), 'tonnes'],
              ['Number of Loads', results.numberOfLoads.toString(), `@ ${form.truckCapacity}t`],
              ['Estimated Cost', `£${results.totalCost.toFixed(0)}`, `@ £${form.costPerTonne}/t`],
            ],
          },
        ],
        checks: [
          {
            name: 'Quantity Check',
            capacity: `${results.tonnage.toFixed(1)} tonnes`,
            utilisation: `${results.numberOfLoads} loads`,
            status: 'PASS' as const,
          },
        ],
        recommendations: pdfRecs,
        warnings,
        footerNote: 'BeaverCalc Studio — Granular Fill Quantities',
      });
    } catch (error) {
      console.error('PDF export error:', error);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: '6F2 / Type 1 Quantity Calculator',
      subtitle: MATERIAL_TYPES[form.materialType]?.name || form.materialType,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
        { label: 'Material', value: MATERIAL_TYPES[form.materialType]?.name || form.materialType },
      ],
      inputs: [
        { label: 'Platform Shape', value: form.platformShape },
        { label: 'Layer Depth', value: form.layerDepth, unit: 'mm' },
        { label: 'Number of Layers', value: form.numberOfLayers },
        { label: 'Bulk Density', value: form.bulkDensity, unit: 't/m\u00b3' },
        { label: 'Compaction Factor', value: form.compactionFactor },
      ],
      checks: [
        {
          name: 'Quantity Check',
          capacity: `${results.tonnage.toFixed(1)} tonnes`,
          utilisation: `${results.numberOfLoads} loads`,
          status: 'PASS' as const,
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio \u2014 Granular Fill Quantities',
    });
  };

  // ---------------------------------------------------------------------------
  // Collapsible Section
  // ---------------------------------------------------------------------------
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
      className="rounded-2xl overflow-hidden bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            {icon}
          </div>
          <span className="text-white font-semibold">{title}</span>
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
    field: keyof SixF2Form;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title="{label}"
          type={type}
          value={form[field]}
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
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
            6F2 / Type 1 Calculator
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Granular fill volume, tonnage, and delivery load estimation for working platforms, haul
            roads, and crane pads
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button onClick={exportPDF} disabled={!results} className="bg-gray-800/50 border border-gray-600/50 hover:bg-gray-700/50 text-gray-300">
            <FiDownload className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button onClick={exportDOCX} disabled={!results} className="bg-gray-800/50 border border-gray-600/50 hover:bg-gray-700/50 text-gray-300">
            <FiDownload className="w-4 h-4 mr-2" /> Export DOCX
          </Button>
        </div>

        {/* Project Info */}
        <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="Project Name" field="projectName" type="text" />
              <InputField label="Reference" field="reference" type="text" />
            </div>
          </CardContent>
        </Card>

        {/* Presets */}
        <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
              <FiZap className="text-amber-400" /> Quick Presets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(key)}
                  className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </CardContent>
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
              {/* Input Column */}
              <div className="lg:col-span-2 space-y-4">
                <Section
                  id="area"
                  title="Platform Area"
                  icon={<FiGrid className="w-6 h-6 text-blue-400" />}
                  color="border-gray-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Shape</label>
                      <select
                        value={form.platformShape}
                        onChange={(e) => updateForm('platformShape', e.target.value)}
                        title="Platform Shape"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="rectangle">Rectangular</option>
                        <option value="circular">Circular</option>
                      </select>
                    </div>
                    {form.platformShape === 'rectangle' ? (
                      <>
                        <InputField label="Length" field="platformLength" unit="m" />
                        <InputField label="Width" field="platformWidth" unit="m" />
                      </>
                    ) : (
                      <InputField label="Radius" field="platformRadius" unit="m" />
                    )}
                  </div>
                </Section>

                <Section
                  id="depth"
                  title="Layer Depth"
                  icon={<FiLayers className="w-6 h-6 text-blue-400" />}
                  color="border-gray-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Layer Depth (compacted)" field="layerDepth" unit="mm" />
                    <InputField label="Number of Layers" field="numberOfLayers" />
                  </div>
                </Section>

                <Section
                  id="material"
                  title="Material Properties"
                  icon={<FiBox className="w-6 h-6 text-blue-400" />}
                  color="border-gray-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Material Type</label>
                      <select
                        value={form.materialType}
                        onChange={(e) => onMaterialChange(e.target.value)}
                        title="Material Type"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(MATERIAL_TYPES).map(([key, mat]) => (
                          <option key={key} value={key}>
                            {mat.name} ({mat.density} t/m³)
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Bulk Density" field="bulkDensity" unit="t/m³" />
                    <InputField label="Compaction Factor" field="compactionFactor" />
                  </div>
                </Section>

                <Section
                  id="transport"
                  title="Transport & Cost"
                  icon={<FiTruck className="w-6 h-6 text-blue-400" />}
                  color="border-gray-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Truck Capacity" field="truckCapacity" unit="t" />
                    <InputField label="Cost per Tonne" field="costPerTonne" unit="£/t" />
                  </div>
                </Section>

                {/* RUN FULL ANALYSIS Button */}
                <button
                  onClick={calculate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
                </button>
              </div>

              {/* Results Column */}
              <div className="space-y-4 sticky top-8 self-start">
                <WhatIfPreview
                  title="Six F2Quantity — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <LegatoWall3D />
                    </Interactive3DDiagram>
                  )}
                />

                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <Card className="bg-green-900/20 backdrop-blur-md border border-green-500/50 border-l-4 border-l-green-400 shadow-lg shadow-green-500/10">
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <FiCheck className="w-6 h-6 text-green-400" />
                          <span className="text-2xl font-bold text-green-400">CALCULATED</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {results.tonnage.toFixed(1)} tonnes required
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Quantity Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Plan Area</p>
                          <p className="text-white font-mono">{results.planArea.toFixed(1)} m²</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Depth</p>
                          <p className="text-white font-mono">
                            {(results.totalDepth * 1000).toFixed(0)} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Compacted Vol.</p>
                          <p className="text-white font-mono">
                            {results.compactedVolume.toFixed(1)} m³
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Loose Vol.</p>
                          <p className="text-white font-mono">
                            {results.looseVolume.toFixed(1)} m³
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Tonnage</p>
                          <p className="text-white font-mono text-lg">
                            {results.tonnage.toFixed(1)} t
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">No. Loads</p>
                          <p className="text-white font-mono text-lg">{results.numberOfLoads}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-green-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Cost Estimate</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <p className="text-3xl font-bold text-white font-mono">
                          £{results.totalCost.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          @ £{form.costPerTonne}/t delivered
                        </p>
                      </CardContent>
                    </Card>

                    {warnings.length > 0 && (
                      <Card className="bg-amber-900/20 border border-amber-500/30 border-l-4 border-l-amber-400">
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

                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-yellow-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {results.totalDepth > 1.0 && (
                          <div className="flex items-start gap-2 text-amber-300">
                            <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              Deep fill ({(results.totalDepth * 1000).toFixed(0)}mm) — ensure
                              adequate compaction plant available
                            </span>
                          </div>
                        )}
                        {results.numberOfLoads > 30 && (
                          <div className="flex items-start gap-2 text-amber-300">
                            <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              {results.numberOfLoads} loads required — plan access route and traffic
                              management
                            </span>
                          </div>
                        )}
                        {parseFloat(form.layerDepth) > 300 && (
                          <div className="flex items-start gap-2 text-amber-300">
                            <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              Layer depth &gt;300mm — BS 6031 recommends ≤300mm per compacted layer
                            </span>
                          </div>
                        )}
                        <div className="flex items-start gap-2 text-green-400">
                          <FiCheck className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>
                            Quantity estimate: {results.tonnage.toFixed(1)}t across{' '}
                            {results.numberOfLoads} deliveries
                          </span>
                        </div>
                      </CardContent>
                    </Card>

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
                      <SaveRunButton calculatorKey="sixf2-quantity" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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
            {/* 3D Scene */}
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
                6F2 QUANTITY — REAL-TIME PREVIEW
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
              <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                <FiSliders size={14} /> Live Parameters
              </h3>
              {[
                { label: 'Platform Length', field: 'platformLength' as keyof SixF2Form, min: 1, max: 100, step: 0.5, unit: 'm' },
                { label: 'Platform Width', field: 'platformWidth' as keyof SixF2Form, min: 1, max: 100, step: 0.5, unit: 'm' },
                { label: 'Layer Depth', field: 'layerDepth' as keyof SixF2Form, min: 50, max: 1000, step: 10, unit: 'mm' },
                { label: 'Number of Layers', field: 'numberOfLayers' as keyof SixF2Form, min: 1, max: 10, step: 1, unit: '' },
                { label: 'Bulk Density', field: 'bulkDensity' as keyof SixF2Form, min: 1.0, max: 3.0, step: 0.05, unit: 't/m³' },
                { label: 'Compaction Factor', field: 'compactionFactor' as keyof SixF2Form, min: 1.0, max: 1.5, step: 0.01, unit: '' },
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
                  { label: 'Platform Shape', value: form.platformShape },
                  { label: 'Total Depth', value: `${((parseFloat(form.layerDepth) || 0) * (parseInt(form.numberOfLayers) || 1)).toFixed(0)} mm` },
                  { label: 'Material', value: form.materialType },
                  { label: 'Bulk Density', value: `${form.bulkDensity} t/m³` },
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
                      { label: 'Plan Area', value: `${results.planArea.toFixed(1)} m²` },
                      { label: 'Volume', value: `${results.compactedVolume.toFixed(1)} m³` },
                      { label: 'Tonnage', value: `${results.tonnage.toFixed(1)} t` },
                      { label: 'Truck Loads', value: `${results.numberOfLoads}` },
                    ].map((check) => (
                      <div key={check.label} className="flex justify-between text-xs py-0.5">
                        <span className="text-gray-500">{check.label}</span>
                        <span className="text-emerald-400 font-bold">{check.value}</span>
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
      </div>
    </div>
  );
};

export default SixF2Quantity;
