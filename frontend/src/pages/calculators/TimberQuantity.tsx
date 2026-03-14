// =============================================================================
// Timber Quantity Calculator — Premium Version
// Board/baulk quantities for temporary works
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
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import TimberMember3D from '../../components/3d/scenes/TimberMember3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// Types
// =============================================================================

interface TimberQuantityForm {
  application: string;
  areaLength: string;
  areaWidth: string;
  boardLength: string;
  boardWidth: string;
  boardThickness: string;
  spacing: string;
  orientation: string;
  wastageFactor: string;
  boardsPerPack: string;
  costPerCubicMetre: string;
  projectName: string;
  reference: string;
}

interface TimberQuantityResults {
  coverArea: number;
  boardCoverWidth: number;
  numberOfBoards: number;
  boardsWithWastage: number;
  totalLength: number;
  volumeCubicMetres: number;
  numberOfPacks: number;
  totalCost: number;
  status: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIMBER_SIZES: Record<string, { w: number; t: number; name: string }> = {
  '225x38': { w: 225, t: 38, name: '225 × 38mm (Scaffold Board)' },
  '225x50': { w: 225, t: 50, name: '225 × 50mm (Heavy Board)' },
  '150x50': { w: 150, t: 50, name: '150 × 50mm (Joists)' },
  '100x50': { w: 100, t: 50, name: '100 × 50mm (Studs)' },
  '200x50': { w: 200, t: 50, name: '200 × 50mm (Forms)' },
  '300x75': { w: 300, t: 75, name: '300 × 75mm (Walings)' },
  '200x100': { w: 200, t: 100, name: '200 × 100mm (Baulks)' },
  '250x100': { w: 250, t: 100, name: '250 × 100mm (Bearers)' },
};

const APPLICATIONS: Record<string, string> = {
  hoarding: 'Hoarding Panels',
  formwork: 'Formwork Sheathing',
  access: 'Walkway / Access Decking',
  shoring: 'Trench Shoring',
  fencing: 'Temporary Fencing',
  general: 'General Purpose',
};

const PRESETS: Record<string, { name: string; form: Partial<TimberQuantityForm> }> = {
  hoarding_50m: {
    name: 'Hoarding (50m × 2.4m)',
    form: {
      application: 'hoarding',
      areaLength: '50',
      areaWidth: '2.4',
      boardLength: '2400',
      boardWidth: '225',
      boardThickness: '38',
      spacing: '0',
      orientation: 'vertical',
    },
  },
  formwork_deck: {
    name: 'Formwork Deck (10×8m)',
    form: {
      application: 'formwork',
      areaLength: '10',
      areaWidth: '8',
      boardLength: '3000',
      boardWidth: '225',
      boardThickness: '50',
      spacing: '0',
      orientation: 'horizontal',
    },
  },
  walkway: {
    name: 'Access Walkway (20×1.2m)',
    form: {
      application: 'access',
      areaLength: '20',
      areaWidth: '1.2',
      boardLength: '3900',
      boardWidth: '225',
      boardThickness: '38',
      spacing: '5',
      orientation: 'perpendicular',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const TimberQuantity: React.FC = () => {
  const [form, setForm] = useState<TimberQuantityForm>({
    application: 'hoarding',
    areaLength: '30',
    areaWidth: '2.4',
    boardLength: '2400',
    boardWidth: '225',
    boardThickness: '38',
    spacing: '0',
    orientation: 'vertical',
    wastageFactor: '10',
    boardsPerPack: '24',
    costPerCubicMetre: '350',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'areaLength', label: 'Area Length' },
  { key: 'areaWidth', label: 'Area Width' },
  { key: 'boardLength', label: 'Board Length' },
  { key: 'boardWidth', label: 'Board Width' },
  { key: 'boardThickness', label: 'Board Thickness' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'wastageFactor', label: 'Wastage Factor' },
  { key: 'boardsPerPack', label: 'Boards Per Pack' },
  { key: 'costPerCubicMetre', label: 'Cost Per Cubic Metre' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'application', label: 'Application', min: 0, max: 100, step: 1, unit: '' },
    { key: 'areaLength', label: 'Area Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'areaWidth', label: 'Area Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'boardLength', label: 'Board Length', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<TimberQuantityResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    area: true,
    boards: true,
    options: false,
  });


  const updateForm = (field: keyof TimberQuantityForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  // Calculation
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const L = parseFloat(form.areaLength);
    const W = parseFloat(form.areaWidth);
    const bL = parseFloat(form.boardLength) / 1000;
    const bW = parseFloat(form.boardWidth) / 1000;
    const bT = parseFloat(form.boardThickness) / 1000;
    const gap = parseFloat(form.spacing) / 1000;
    const wastage = parseFloat(form.wastageFactor) / 100;
    const packs = parseInt(form.boardsPerPack);
    const costPer = parseFloat(form.costPerCubicMetre);

    const coverArea = L * W;
    const boardCoverWidth = bW + gap;
    const spanDim = form.orientation === 'vertical' || form.orientation === 'perpendicular' ? L : W;
    const coverDim =
      form.orientation === 'vertical' || form.orientation === 'perpendicular' ? W : L;
    const boardsAcross = Math.ceil(coverDim / boardCoverWidth);
    const boardsAlongLength = Math.ceil(spanDim / bL);
    const numberOfBoards = boardsAcross * boardsAlongLength;
    const boardsWithWastage = Math.ceil(numberOfBoards * (1 + wastage));
    const totalLength = boardsWithWastage * bL;
    const volumeCubicMetres = boardsWithWastage * bL * bW * bT;
    const numberOfPacks = Math.ceil(boardsWithWastage / packs);
    const totalCost = volumeCubicMetres * costPer;

    if (wastage > 0.2) w.push('High wastage factor — consider optimising cut lengths');
    if (bL > 4.8) w.push('Board length exceeds 4.8m — check availability and handling');
    if (boardsWithWastage > 500) w.push('Large quantity — consider phased delivery');

    setResults({
      coverArea,
      boardCoverWidth: boardCoverWidth * 1000,
      numberOfBoards,
      boardsWithWastage,
      totalLength,
      volumeCubicMetres,
      numberOfPacks,
      totalCost,
      status: 'OK',
    });
    setWarnings(w);
  }, [form]);

  useEffect(() => {
    const t = setTimeout(calculate, 300);
    return () => clearTimeout(t);
  }, [calculate]);

  // Canvas

  // PDF
  const exportPDF = async () => {
    if (!results) return;
    try {
      const pdfRecs: { check: string; suggestion: string }[] = [];
      if (parseFloat(form.wastageFactor) > 15)
        pdfRecs.push({
          check: 'High Wastage',
          suggestion: 'Wastage above 15% — consider optimising cut lengths or standard sizes',
        });
      if (results.boardsWithWastage > 200)
        pdfRecs.push({
          check: 'Large Quantity',
          suggestion: 'Large order — consider phased delivery to reduce site storage requirements',
        });
      if (parseFloat(form.boardLength) > 4800)
        pdfRecs.push({
          check: 'Long Boards',
          suggestion: 'Boards >4.8m — verify availability and manual handling risk assessment',
        });
      pdfRecs.push({
        check: 'Overall',
        suggestion: `Quantity calculation complete — ${results.numberOfPacks} packs of ${form.boardsPerPack} boards required`,
      });

      await generatePremiumPDF({
        title: 'Timber Quantity Calculator',
        subtitle: APPLICATIONS[form.application] || form.application,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Reference', value: form.reference || '-' },
          { label: 'Application', value: APPLICATIONS[form.application] || form.application },
        ],
        inputs: [
          { label: 'Coverage Area', value: `${form.areaLength} × ${form.areaWidth}`, unit: 'm' },
          {
            label: 'Board Size',
            value: `${form.boardLength} × ${form.boardWidth} × ${form.boardThickness}`,
            unit: 'mm',
          },
          { label: 'Board Orientation', value: form.orientation },
          { label: 'Gap / Spacing', value: form.spacing, unit: 'mm' },
          { label: 'Wastage Factor', value: form.wastageFactor, unit: '%' },
          { label: 'Boards per Pack', value: form.boardsPerPack },
          { label: 'Cost per m\u00b3', value: `\u00a3${form.costPerCubicMetre}` },
        ],
        sections: [
          {
            title: 'Quantity Summary',
            head: [['Item', 'Value', 'Unit']],
            body: [
              ['Cover Area', results.coverArea.toFixed(1), 'm\u00b2'],
              ['Boards (net)', results.numberOfBoards.toString(), 'nr'],
              ['Boards (incl. wastage)', results.boardsWithWastage.toString(), 'nr'],
              ['Total Length', results.totalLength.toFixed(1), 'm'],
              ['Volume', results.volumeCubicMetres.toFixed(2), 'm\u00b3'],
              ['Packs Required', results.numberOfPacks.toString(), `@ ${form.boardsPerPack}/pack`],
              ['Estimated Cost', `\u00a3${results.totalCost.toFixed(0)}`, ''],
            ],
          },
        ],
        checks: [
          {
            name: 'Quantity Check',
            capacity: `${results.boardsWithWastage} boards`,
            utilisation: `${results.numberOfPacks} packs`,
            status: 'PASS' as const,
          },
        ],
        recommendations: pdfRecs,
        warnings,
        footerNote: 'BeaverCalc Studio — Timber Quantities',
      });
    } catch (e) {
      console.error('PDF error:', e);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Timber Quantity Calculator',
      subtitle: APPLICATIONS[form.application] || form.application,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
        { label: 'Application', value: APPLICATIONS[form.application] || form.application },
      ],
      inputs: [
        { label: 'Coverage Area', value: `${form.areaLength} × ${form.areaWidth}`, unit: 'm' },
        {
          label: 'Board Size',
          value: `${form.boardLength} × ${form.boardWidth} × ${form.boardThickness}`,
          unit: 'mm',
        },
        { label: 'Board Orientation', value: form.orientation },
        { label: 'Gap / Spacing', value: form.spacing, unit: 'mm' },
        { label: 'Wastage Factor', value: form.wastageFactor, unit: '%' },
      ],
      checks: [
        {
          name: 'Quantity Check',
          capacity: `${results.boardsWithWastage} boards`,
          utilisation: `${results.numberOfPacks} packs`,
          status: 'PASS' as const,
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio \u2014 Timber Quantities',
    });
  };

  // Section / InputField
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
      className={cn('rounded-2xl border overflow-hidden shadow-lg shadow-blue-500/5 bg-gray-900/40 backdrop-blur-md border-gray-700/50', color)}
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
    field: keyof TimberQuantityForm;
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">Site Quantities</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Timber Quantities
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Board and baulk quantity calculator for hoarding, formwork, decking, and general
            temporary works
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button onClick={exportPDF} disabled={!results} className="bg-blue-600/80 hover:bg-blue-500/80 text-white text-sm px-4 py-2 rounded-lg">
            <FiDownload className="w-4 h-4 mr-2" /> PDF Report
          </Button>
          <Button onClick={exportDOCX} disabled={!results} className="bg-indigo-600/80 hover:bg-indigo-500/80 text-white text-sm px-4 py-2 rounded-lg">
            <FiDownload className="w-4 h-4 mr-2" /> DOCX
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(PRESETS).map(([k, v]) => (
              <button key={k} onClick={() => applyPreset(k)} className="px-3 py-1.5 text-xs bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 hover:text-white hover:border-gray-600 transition-all">
                {v.name}
              </button>
            ))}
          </div>
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
                <TimberMember3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                aria-label="Minimize preview"
              >
                <FiMinimize2 size={20} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                TIMBER QUANTITY — REAL-TIME PREVIEW
              </div>
            </div>
            <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
              <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                <FiSliders size={14} /> Live Parameters
              </h3>
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                  <FiActivity size={14} /> Live Readout
                </h3>
                {[
                  { label: 'Application', value: form.application },
                  { label: 'Area', value: `${form.areaLength}×${form.areaWidth} m` },
                  { label: 'Board', value: `${form.boardWidth}×${form.boardThickness} mm` },
                  { label: 'Board Length', value: `${form.boardLength} mm` },
                  { label: 'Spacing', value: `${form.spacing} mm` },
                  { label: 'Orientation', value: form.orientation },
                  { label: 'Wastage', value: `${form.wastageFactor}%` },
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
                    { label: 'Boards Needed', value: results.boardsWithWastage.toString() },
                    { label: 'Packs', value: results.numberOfPacks.toString() },
                    { label: 'Volume', value: `${results.volumeCubicMetres.toFixed(2)} m³` },
                    { label: 'Total Cost', value: `£${results.totalCost.toFixed(0)}` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-emerald-400 font-bold">{item.value}</span>
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
        <div className="relative">
          <button
            onClick={() => setPreviewMaximized(true)}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
            aria-label="Maximize preview"
            title="Fullscreen preview"
          >
            <FiMaximize2 size={16} />
          </button>
          <WhatIfPreview
            title="Timber Quantity — 3D Preview"
            sliders={whatIfSliders}
            form={form}
            updateForm={updateForm}
            status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
            renderScene={(fsHeight) => (
              <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                <CardContent className="p-4">
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                    <TimberMember3D />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>
            )}
          />
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
              <div className="lg:col-span-2 space-y-4">
                <Section
                  id="area"
                  title="Coverage Area"
                  icon={<FiGrid className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Application</label>
                      <select
                        value={form.application}
                        onChange={(e) => updateForm('application', e.target.value)}
                        title="Application"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(APPLICATIONS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Orientation</label>
                      <select
                        value={form.orientation}
                        onChange={(e) => updateForm('orientation', e.target.value)}
                        title="Board Orientation"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="vertical">Vertical</option>
                        <option value="horizontal">Horizontal</option>
                        <option value="perpendicular">Perpendicular to span</option>
                      </select>
                    </div>
                    <InputField label="Area Length" field="areaLength" unit="m" />
                    <InputField label="Area Width / Height" field="areaWidth" unit="m" />
                  </div>
                </Section>

                <Section
                  id="boards"
                  title="Board Specification"
                  icon={<FiBox className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Standard Size</label>
                      <select
                        value={`${form.boardWidth}x${form.boardThickness}`}
                        onChange={(e) => {
                          const s = TIMBER_SIZES[e.target.value];
                          if (s)
                            setForm((p) => ({
                              ...p,
                              boardWidth: s.w.toString(),
                              boardThickness: s.t.toString(),
                            }));
                        }}
                        title="Timber Size"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(TIMBER_SIZES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Board Length" field="boardLength" unit="mm" />
                    <InputField label="Board Width" field="boardWidth" unit="mm" />
                    <InputField label="Board Thickness" field="boardThickness" unit="mm" />
                    <InputField label="Gap/Spacing" field="spacing" unit="mm" />
                  </div>
                </Section>

                <Section
                  id="options"
                  title="Wastage & Cost"
                  icon={<FiSettings className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Wastage Factor" field="wastageFactor" unit="%" />
                    <InputField label="Boards per Pack" field="boardsPerPack" />
                    <InputField label="Cost per m³" field="costPerCubicMetre" unit="£/m³" />
                  </div>
                </Section>

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
                      <TimberMember3D />
                    </Interactive3DDiagram>
                  </CardContent>
                </Card>
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <Card className="bg-green-900/20 border border-gray-700/50 border-l-4 border-l-green-400 shadow-lg shadow-green-500/10 backdrop-blur-md">
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <FiCheck className="w-6 h-6 text-green-400" />
                          <span className="text-2xl font-bold text-green-400">CALCULATED</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {results.boardsWithWastage} boards required
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white font-semibold">Quantity Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Cover Area</p>
                          <p className="text-white font-mono">{results.coverArea.toFixed(1)} m²</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Boards (net)</p>
                          <p className="text-white font-mono">{results.numberOfBoards}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Boards (+wastage)</p>
                          <p className="text-white font-mono text-lg">
                            {results.boardsWithWastage}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Packs</p>
                          <p className="text-white font-mono text-lg">{results.numberOfPacks}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Volume</p>
                          <p className="text-white font-mono">
                            {results.volumeCubicMetres.toFixed(2)} m³
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Cost</p>
                          <p className="text-white font-mono">£{results.totalCost.toFixed(0)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {warnings.length > 0 && (
                      <Card className="bg-amber-900/20 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-yellow-400">
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

                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white font-semibold">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {parseFloat(form.wastageFactor) > 15 && (
                          <div className="flex items-start gap-2 text-amber-300">
                            <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              Wastage above 15% — consider optimising cut lengths or standard sizes
                            </span>
                          </div>
                        )}
                        {results.boardsWithWastage > 200 && (
                          <div className="flex items-start gap-2 text-amber-300">
                            <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              Large quantity — consider phased delivery to reduce site storage
                            </span>
                          </div>
                        )}
                        {parseFloat(form.boardLength) > 4800 && (
                          <div className="flex items-start gap-2 text-amber-300">
                            <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              Long boards (&gt;4.8m) — verify availability and manual handling
                            </span>
                          </div>
                        )}
                        <div className="flex items-start gap-2 text-green-400">
                          <FiCheck className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>
                            Quantity calculation complete — {results.numberOfPacks} packs required
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> Export PDF Report
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> DOCX
                      </Button>
                      <SaveRunButton calculatorKey="timber-quantity" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TimberQuantity;
