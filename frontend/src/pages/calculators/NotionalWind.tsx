// =============================================================================
// Notional Wind Check — Premium Version
// BS EN 1991-1-4 simplified wind pressure check for temporary works
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
import WindLoad3D from '../../components/3d/scenes/WindLoad3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';

interface WindForm {
  structureType: string;
  height: string;
  width: string;
  depth: string;
  windSpeed: string;
  terrain: string;
  exposure: string;
  structuralCapacity: string;
  shieldingFactor: string;
  projectName: string;
  reference: string;
}
interface WindResults {
  vb: number;
  qp: number;
  Cf: number;
  Aref: number;
  Fw: number;
  overturningMoment: number;
  resistingMoment: number;
  forceUtil: number;
  momentUtil: number;
  maxUtil: number;
  status: string;
  criticalCheck: string;
}

const TERRAIN_FACTORS: Record<string, { name: string; ce: number }> = {
  sea: { name: 'Coastal / Seaside', ce: 3.2 },
  country: { name: 'Country (open)', ce: 2.6 },
  town: { name: 'Town (suburban)', ce: 2.0 },
  city: { name: 'City Centre', ce: 1.6 },
};
const STRUCTURE_TYPES: Record<string, { name: string; Cf: number }> = {
  hoarding: { name: 'Hoarding / Fence', Cf: 1.3 },
  scaffold: { name: 'Scaffold', Cf: 1.3 },
  falsework: { name: 'Falsework', Cf: 1.6 },
  crane: { name: 'Crane / Tower', Cf: 2.0 },
  signboard: { name: 'Signboard', Cf: 1.8 },
  container: { name: 'Container / Cabin', Cf: 1.2 },
};

const PRESETS: Record<string, { name: string; form: Partial<WindForm> }> = {
  hoarding_2m: {
    name: '2.4m Hoarding',
    form: {
      structureType: 'hoarding',
      height: '2.4',
      width: '20',
      depth: '0',
      windSpeed: '22',
      terrain: 'town',
    },
  },
  scaffold_6: {
    name: 'Scaffold (6 lifts)',
    form: {
      structureType: 'scaffold',
      height: '12',
      width: '30',
      depth: '1.5',
      windSpeed: '22',
      terrain: 'town',
    },
  },
  falsework: {
    name: 'Falsework (5m)',
    form: {
      structureType: 'falsework',
      height: '5',
      width: '10',
      depth: '10',
      windSpeed: '22',
      terrain: 'country',
    },
  },
  tower_crane: {
    name: 'Tower Crane',
    form: {
      structureType: 'crane',
      height: '40',
      width: '2',
      depth: '2',
      windSpeed: '22',
      terrain: 'town',
    },
  },
};

const NotionalWind: React.FC = () => {
  const [form, setForm] = useState<WindForm>({
    structureType: 'hoarding',
    height: '2.4',
    width: '20',
    depth: '0',
    windSpeed: '22',
    terrain: 'town',
    exposure: 'normal',
    structuralCapacity: '50',
    shieldingFactor: '1.0',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'height', label: 'Height' },
  { key: 'width', label: 'Width' },
  { key: 'depth', label: 'Depth' },
  { key: 'windSpeed', label: 'Wind Speed' },
  { key: 'structuralCapacity', label: 'Structural Capacity' },
  { key: 'shieldingFactor', label: 'Shielding Factor' },
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
    { key: 'height', label: 'Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'width', label: 'Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'depth', label: 'Depth', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [results, setResults] = useState<WindResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    wind: true,
    capacity: false,
  });

  const updateForm = (field: keyof WindForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const H = parseFloat(form.height);
    const W = parseFloat(form.width);
    const vb = parseFloat(form.windSpeed);
    const terrain = TERRAIN_FACTORS[form.terrain];
    const struct = STRUCTURE_TYPES[form.structureType];
    const sf = parseFloat(form.shieldingFactor);
    const cap = parseFloat(form.structuralCapacity);

    // Peak velocity pressure: qp = 0.5 × ρ × vb² × ce(z)
    const rho = 1.226; // kg/m³
    const qp = (0.5 * rho * vb * vb * terrain.ce) / 1000; // kN/m²
    const Cf = struct.Cf;
    const Aref = H * W * sf;
    const Fw = qp * Cf * Aref; // kN

    const overturningMoment = Fw * (H / 2); // kNm (force at mid-height)
    const resistingMoment = cap * W; // simplified
    const forceUtil = (Fw / cap) * 100;
    const momentUtil = (overturningMoment / resistingMoment) * 100;
    const maxUtil = Math.max(forceUtil, momentUtil);
    const criticalCheck = forceUtil >= momentUtil ? 'Force' : 'Overturning';
    const status = maxUtil <= 100 ? 'PASS' : 'FAIL';

    if (vb > 25) w.push('Wind speed >25 m/s — check site-specific wind data');
    if (H > 15 && form.structureType === 'hoarding')
      w.push('Hoarding height >15m — specialist design required');
    if (maxUtil > 80 && maxUtil <= 100) w.push('Utilisation >80% — limited margin of safety');

    setResults({
      vb,
      qp,
      Cf,
      Aref,
      Fw,
      overturningMoment,
      resistingMoment,
      forceUtil,
      momentUtil,
      maxUtil,
      status,
      criticalCheck,
    });
    setWarnings(w);
  }, [form]);

  useEffect(() => {
    const t = setTimeout(calculate, 300);
    return () => clearTimeout(t);
  }, [calculate]);

  const exportPDF = async () => {
    if (!results) return;
    const recommendations: { check: string; suggestion: string }[] = [];
    if (results.forceUtil > 80)
      recommendations.push({
        check: 'High Force Utilisation',
        suggestion: `Wind force util ${results.forceUtil.toFixed(0)}% — review connection and foundation design`,
      });
    if (results.momentUtil > 80)
      recommendations.push({
        check: 'Overturning Risk',
        suggestion: `Overturning util ${results.momentUtil.toFixed(0)}% — check base fixity and ballast`,
      });
    if (results.vb > 22)
      recommendations.push({
        check: 'High Wind Speed',
        suggestion: `vb = ${results.vb} m/s exceeds typical UK notional value — verify with site-specific data`,
      });
    recommendations.push({
      check: 'Overall',
      suggestion:
        results.status === 'PASS'
          ? 'All wind checks pass — structure adequate for notional wind loads'
          : 'Wind check failed — increase structural capacity or reduce exposure',
    });
    try {
      await generatePremiumPDF({
        title: 'Notional Wind Check',
        subtitle: STRUCTURE_TYPES[form.structureType]?.name || form.structureType,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Ref', value: form.reference || '-' },
        ],
        inputs: [
          { label: 'Structure', value: STRUCTURE_TYPES[form.structureType]?.name },
          { label: 'Height', value: form.height, unit: 'm' },
          { label: 'Width', value: form.width, unit: 'm' },
          { label: 'Depth', value: form.depth, unit: 'm' },
          { label: 'Wind Speed vb', value: form.windSpeed, unit: 'm/s' },
          { label: 'Terrain', value: TERRAIN_FACTORS[form.terrain]?.name },
          { label: 'Shielding Factor', value: form.shieldingFactor },
          { label: 'Structural Capacity', value: form.structuralCapacity, unit: 'kN' },
        ],
        checks: [
          {
            name: 'Wind Force',
            capacity: `${form.structuralCapacity} kN`,
            utilisation: `${results.forceUtil.toFixed(1)}%`,
            status: (results.forceUtil <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
          },
          {
            name: 'Overturning',
            capacity: `${results.resistingMoment.toFixed(1)} kNm`,
            utilisation: `${results.momentUtil.toFixed(1)}%`,
            status: (results.momentUtil <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
          },
        ],
        sections: [
          {
            title: 'Wind Analysis',
            head: [['Parameter', 'Value', 'Unit']],
            body: [
              ['Peak Pressure qp', results.qp.toFixed(3), 'kN/m²'],
              ['Force Coefficient Cf', results.Cf.toFixed(1), '-'],
              ['Reference Area Aref', results.Aref.toFixed(1), 'm²'],
              ['Wind Force Fw', results.Fw.toFixed(1), 'kN'],
              ['Overturning Moment', results.overturningMoment.toFixed(1), 'kNm'],
              ['Resisting Moment', results.resistingMoment.toFixed(1), 'kNm'],
            ],
          },
        ],
        recommendations,
        warnings,
        footerNote: 'BeaverCalc Studio — Notional Wind',
      });
    } catch (e) {
      console.error(e);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Notional Wind Check',
      subtitle: STRUCTURE_TYPES[form.structureType]?.name || form.structureType,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
      ],
      inputs: [
        { label: 'Structure', value: STRUCTURE_TYPES[form.structureType]?.name },
        { label: 'Height', value: form.height, unit: 'm' },
        { label: 'Width', value: form.width, unit: 'm' },
        { label: 'Depth', value: form.depth, unit: 'm' },
        { label: 'Wind Speed vb', value: form.windSpeed, unit: 'm/s' },
        { label: 'Structural Capacity', value: form.structuralCapacity, unit: 'kN' },
      ],
      checks: [
        {
          name: 'Wind Force',
          capacity: `${form.structuralCapacity} kN`,
          utilisation: `${results.forceUtil.toFixed(1)}%`,
          status: (results.forceUtil <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning',
          capacity: `${results.resistingMoment.toFixed(1)} kNm`,
          utilisation: `${results.momentUtil.toFixed(1)}%`,
          status: (results.momentUtil <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio \u2014 Notional Wind',
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
        <div className="flex items-center gap-3">
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
  const InputField: React.FC<{
    label: string;
    field: keyof WindForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title={label}
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
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
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-800/40 backdrop-blur-md border border-gray-700/50 text-neon-cyan mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">BS EN 1991-1-4</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-4">
            Notional Wind Check
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Simplified wind force and overturning check for temporary works structures
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 mx-auto w-fit">
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

        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="Project Name" field="projectName" type="text" />
              <InputField label="Reference" field="reference" type="text" />
            </div>
          </CardContent>
        </Card>
        <WhatIfPreview
          title="Notional Wind — 3D Preview"
          sliders={whatIfSliders}
          form={form}
          updateForm={updateForm}
          status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
          renderScene={(fsHeight) => (
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardContent className="p-4">
                <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                  <WindLoad3D />
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
                  id="geometry"
                  title="Structure Geometry"
                  icon={<FiLayers className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Structure Type</label>
                      <select
                        value={form.structureType}
                        onChange={(e) => updateForm('structureType', e.target.value)}
                        title="Structure Type"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.entries(STRUCTURE_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name} (Cf={v.Cf})
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Height" field="height" unit="m" />
                    <InputField label="Width (perpendicular to wind)" field="width" unit="m" />
                    <InputField label="Depth (parallel to wind)" field="depth" unit="m" />
                  </div>
                </Section>
                <Section
                  id="wind"
                  title="Wind Parameters"
                  icon={<FiSettings className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Basic Wind Speed (vb)" field="windSpeed" unit="m/s" />
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Terrain Category</label>
                      <select
                        value={form.terrain}
                        onChange={(e) => updateForm('terrain', e.target.value)}
                        title="Terrain"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.entries(TERRAIN_FACTORS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name} (ce={v.ce})
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Shielding Factor" field="shieldingFactor" />
                  </div>
                </Section>
                <Section
                  id="capacity"
                  title="Structural Capacity"
                  icon={<FiSettings className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField
                      label="Resisting Force Capacity"
                      field="structuralCapacity"
                      unit="kN"
                    />
                  </div>
                </Section>
              </div>
              <div className="space-y-4 sticky top-8">
                {/* Fullscreen Preview Overlay */}
                {previewMaximized && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex">
                    <div className="flex-1 relative">
                      <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                        <WindLoad3D />
                      </Interactive3DDiagram>
                      <button onClick={() => setPreviewMaximized(false)}
                        title="Exit fullscreen"
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10">
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        NOTIONAL WIND — REAL-TIME PREVIEW
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
                          { label: 'Structure Type', value: STRUCTURE_TYPES[form.structureType]?.name || form.structureType },
                          { label: 'Height', value: `${form.height} m` },
                          { label: 'Width', value: `${form.width} m` },
                          { label: 'Depth', value: `${form.depth} m` },
                          { label: 'Wind Speed', value: `${form.windSpeed} m/s` },
                          { label: 'Terrain', value: TERRAIN_FACTORS[form.terrain]?.name || form.terrain },
                          { label: 'Shielding Factor', value: form.shieldingFactor },
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
                            { label: 'Force Util', util: (results.forceUtil * 100).toFixed(1), status: results.forceUtil > 1 ? 'FAIL' : 'PASS' },
                            { label: 'Moment Util', util: (results.momentUtil * 100).toFixed(1), status: results.momentUtil > 1 ? 'FAIL' : 'PASS' },
                            { label: 'Max Util', util: (results.maxUtil * 100).toFixed(1), status: results.maxUtil > 1 ? 'FAIL' : 'PASS' },
                            { label: 'Wind Force', util: results.Fw.toFixed(1) + ' kN', status: results.status === 'PASS' ? 'PASS' : 'FAIL' },
                            { label: 'Overturning M', util: results.overturningMoment.toFixed(1) + ' kNm', status: results.status === 'PASS' ? 'PASS' : 'FAIL' },
                          ].map((check) => (
                            <div key={check.label} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-500">{check.label}</span>
                              <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util)) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                                {check.util}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setPreviewMaximized(false)}
                        className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors">
                        Close Fullscreen
                      </button>
                    </div>
                  </motion.div>
                )}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2 flex flex-row items-center">
                    <CardTitle className="text-sm">3D Preview</CardTitle>
                    <button
                      onClick={() => setPreviewMaximized(true)}
                      className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                      title="Fullscreen preview"
                    >
                      <FiMaximize2 size={16} />
                    </button>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Interactive3DDiagram height="350px" cameraPosition={[8, 6, 8]}>
                      <WindLoad3D />
                    </Interactive3DDiagram>
                  </CardContent>
                </Card>
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <Card
                      className={cn(
                        'border-l-4 shadow-lg',
                        results.status === 'PASS'
                          ? 'bg-green-900/20 border-l-green-500 shadow-green-500/10'
                          : 'bg-red-900/20 border-l-red-500 shadow-red-500/10',
                      )}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {results.status === 'PASS' ? (
                            <FiCheck className="w-6 h-6 text-green-400" />
                          ) : (
                            <FiAlertTriangle className="w-6 h-6 text-red-400" />
                          )}
                          <span
                            className={cn(
                              'text-2xl font-bold',
                              results.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {results.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          Max Util: {results.maxUtil.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Critical: {results.criticalCheck}</p>
                      </CardContent>
                    </Card>
                    <Card variant="glass" className="border-l-4 border-l-neon-cyan shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { name: 'Wind Force', util: results.forceUtil },
                          { name: 'Overturning', util: results.momentUtil },
                        ].map((c) => (
                          <div key={c.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">{c.name}</span>
                              <span className={c.util <= 100 ? 'text-green-400' : 'text-red-400'}>
                                {c.util.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(c.util, 100)}%` }}
                                className={cn(
                                  'h-full rounded-full',
                                  c.util <= 70
                                    ? 'bg-green-500'
                                    : c.util <= 90
                                      ? 'bg-emerald-500'
                                      : c.util <= 100
                                        ? 'bg-amber-500'
                                        : 'bg-red-500',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Wind Results</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">qp</p>
                          <p className="text-white font-mono">{results.qp.toFixed(3)} kN/m²</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Cf</p>
                          <p className="text-white font-mono">{results.Cf.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Aref</p>
                          <p className="text-white font-mono">{results.Aref.toFixed(1)} m²</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Fw</p>
                          <p className="text-white font-mono text-lg">{results.Fw.toFixed(1)} kN</p>
                        </div>
                        <div>
                          <p className="text-gray-500">OTM</p>
                          <p className="text-white font-mono">
                            {results.overturningMoment.toFixed(1)} kNm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">MR</p>
                          <p className="text-white font-mono">
                            {results.resistingMoment.toFixed(1)} kNm
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {results.forceUtil > 80 && (
                          <div className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">⚠</span>
                            <span className="text-gray-300">
                              Wind force util {results.forceUtil.toFixed(0)}% — review connection
                              and foundation design
                            </span>
                          </div>
                        )}
                        {results.momentUtil > 80 && (
                          <div className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">⚠</span>
                            <span className="text-gray-300">
                              Overturning util {results.momentUtil.toFixed(0)}% — check base fixity
                              and ballast
                            </span>
                          </div>
                        )}
                        {results.vb > 22 && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">ℹ</span>
                            <span className="text-gray-300">
                              Wind speed {results.vb} m/s exceeds typical UK notional value
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
                              ? '✓ All wind checks pass'
                              : '✗ Wind check failed — increase capacity or reduce exposure'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    {warnings.length > 0 && (
                      <Card variant="glass" className="border-l-4 border-l-amber-500 shadow-2xl">
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
                    <button
                      onClick={calculate}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        className="w-full bg-gradient-to-r from-neon-cyan to-neon-blue hover:shadow-neon-cyan/25"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> Export PDF Report
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> DOCX
                      </Button>
                      <SaveRunButton calculatorKey="notional-wind" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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

export default NotionalWind;
