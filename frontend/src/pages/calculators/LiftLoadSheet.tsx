// =============================================================================
// Lift Load Sheet Generator — Premium Version
// Automated lift plan summary sheet for crane operations
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
    FiMinimize2,
    FiSettings,
    FiSliders
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import LiftLoadSheet3D from '../../components/3d/scenes/LiftLoadSheet3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

interface LiftForm {
  liftDescription: string;
  loadWeight: string;
  riggingWeight: string;
  hookBlockWeight: string;
  craneModel: string;
  craneCapacity: string;
  operatingRadius: string;
  boomLength: string;
  windSpeed: string;
  maxWindSpeed: string;
  groundCondition: string;
  liftCategory: string;
  numberOfSignallers: string;
  projectName: string;
  reference: string;
  liftNumber: string;
}
interface LiftResults {
  totalLoadWeight: number;
  craneCapacity: number;
  utilisation: number;
  riskCategory: string;
  windOK: boolean;
  groundOK: boolean;
  status: string;
  maxUtil: number;
  criticalCheck: string;
}

const LIFT_CATEGORIES: Record<string, { name: string; color: string }> = {
  standard: { name: 'Standard (<10t, routine)', color: '#22c55e' },
  complex: { name: 'Complex (10-50t or restricted)', color: '#f97316' },
  critical: { name: 'Critical (>50t / multi-crane / people)', color: '#ef4444' },
};

const PRESETS: Record<string, { name: string; form: Partial<LiftForm> }> = {
  steel_beam: {
    name: 'Steel Beam (3t)',
    form: {
      liftDescription: 'UB610×229×101 steel beam',
      loadWeight: '3',
      riggingWeight: '0.2',
      hookBlockWeight: '0.5',
      craneCapacity: '50',
      operatingRadius: '12',
      liftCategory: 'standard',
    },
  },
  precast: {
    name: 'Precast Panel (8t)',
    form: {
      liftDescription: 'Precast concrete cladding panel',
      loadWeight: '8',
      riggingWeight: '0.5',
      hookBlockWeight: '0.5',
      craneCapacity: '100',
      operatingRadius: '18',
      liftCategory: 'complex',
    },
  },
  bridge_girder: {
    name: 'Bridge Girder (55t)',
    form: {
      liftDescription: 'Plate girder tandem lift',
      loadWeight: '55',
      riggingWeight: '2',
      hookBlockWeight: '1',
      craneCapacity: '300',
      operatingRadius: '20',
      liftCategory: 'critical',
    },
  },
  ac_unit: {
    name: 'AC Unit (1.2t)',
    form: {
      liftDescription: 'Roof-mounted AC unit',
      loadWeight: '1.2',
      riggingWeight: '0.1',
      hookBlockWeight: '0.5',
      craneCapacity: '50',
      operatingRadius: '15',
      liftCategory: 'standard',
    },
  },
};

const LiftLoadSheet: React.FC = () => {
  const [form, setForm] = useState<LiftForm>({
    liftDescription: 'Steel beam UB457×191×67',
    loadWeight: '5',
    riggingWeight: '0.3',
    hookBlockWeight: '0.5',
    craneModel: 'Liebherr LTM 1100',
    craneCapacity: '100',
    operatingRadius: '14',
    boomLength: '40',
    windSpeed: '8',
    maxWindSpeed: '15',
    groundCondition: 'good',
    liftCategory: 'standard',
    numberOfSignallers: '1',
    projectName: '',
    reference: '',
    liftNumber: '001',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'loadWeight', label: 'Load Weight' },
  { key: 'riggingWeight', label: 'Rigging Weight' },
  { key: 'hookBlockWeight', label: 'Hook Block Weight' },
  { key: 'craneCapacity', label: 'Crane Capacity' },
  { key: 'operatingRadius', label: 'Operating Radius' },
  { key: 'boomLength', label: 'Boom Length' },
  { key: 'windSpeed', label: 'Wind Speed' },
  { key: 'maxWindSpeed', label: 'Max Wind Speed' },
  { key: 'numberOfSignallers', label: 'Number Of Signallers' },
  { key: 'liftNumber', label: 'Lift Number' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'liftDescription', label: 'Lift Description', min: 0, max: 100, step: 1, unit: '' },
    { key: 'loadWeight', label: 'Load Weight', min: 0, max: 100, step: 1, unit: '' },
    { key: 'riggingWeight', label: 'Rigging Weight', min: 0, max: 100, step: 1, unit: '' },
    { key: 'hookBlockWeight', label: 'Hook Block Weight', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<LiftResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    load: true,
    crane: true,
    environment: false,
    admin: false,
  });
  const [previewMaximized, setPreviewMaximized] = useState(false);


  const updateForm = (field: keyof LiftForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const loadWt = parseFloat(form.loadWeight);
    const rigging = parseFloat(form.riggingWeight);
    const hookBlock = parseFloat(form.hookBlockWeight);
    const totalLoadWeight = loadWt + rigging + hookBlock;
    const craneCapacity = parseFloat(form.craneCapacity);
    const utilisation = (totalLoadWeight / craneCapacity) * 100;
    const windSpeed = parseFloat(form.windSpeed);
    const maxWind = parseFloat(form.maxWindSpeed);
    const windOK = windSpeed <= maxWind;
    const groundOK = form.groundCondition !== 'poor';
    const riskCategory = form.liftCategory;

    let maxUtil = utilisation;
    if (!windOK) maxUtil = Math.max(maxUtil, 101);
    if (!groundOK) maxUtil = Math.max(maxUtil, 101);
    const criticalCheck =
      utilisation > 100 ? 'Capacity' : !windOK ? 'Wind' : !groundOK ? 'Ground' : 'Capacity';
    const status = maxUtil <= 100 ? 'PASS' : 'FAIL';

    if (utilisation > 80 && utilisation <= 100)
      w.push('Load utilisation >80% — verify crane load chart at exact radius & boom length');
    if (utilisation > 100) w.push('LOAD EXCEEDS CRANE CAPACITY — DO NOT PROCEED');
    if (!windOK) w.push(`Wind speed ${windSpeed} m/s exceeds limit ${maxWind} m/s — postpone lift`);
    if (!groundOK) w.push('Ground conditions poor — confirm outrigger bearing capacity');
    if (riskCategory === 'critical')
      w.push('Critical lift — appointed person and detailed method statement required');

    setResults({
      totalLoadWeight,
      craneCapacity,
      utilisation,
      riskCategory,
      windOK,
      groundOK,
      status,
      maxUtil,
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
    if (results.utilisation > 80)
      recommendations.push({
        check: 'High Utilisation',
        suggestion: `Crane util ${results.utilisation.toFixed(0)}% — verify load chart at exact radius and boom length`,
      });
    if (form.liftCategory === 'critical')
      recommendations.push({
        check: 'Critical Lift',
        suggestion: 'Appointed person and detailed method statement required per BS 7121',
      });
    if (!results.windOK)
      recommendations.push({
        check: 'Wind Exceedance',
        suggestion: `Wind ${form.windSpeed} m/s exceeds ${form.maxWindSpeed} m/s limit — postpone lift`,
      });
    recommendations.push({
      check: 'Overall',
      suggestion:
        results.status === 'PASS'
          ? 'All lift checks pass — proceed with lift plan'
          : 'Lift checks FAILED — do not proceed until issues resolved',
    });
    try {
      await generatePremiumPDF({
        title: 'Lift Load Sheet',
        subtitle: `Lift #${form.liftNumber} — ${form.liftDescription}`,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Reference', value: form.reference || '-' },
          { label: 'Lift Number', value: form.liftNumber },
        ],
        inputs: [
          { label: 'Description', value: form.liftDescription },
          { label: 'Load Weight', value: form.loadWeight, unit: 't' },
          { label: 'Rigging Weight', value: form.riggingWeight, unit: 't' },
          { label: 'Hook Block', value: form.hookBlockWeight, unit: 't' },
          { label: 'Total Load', value: results.totalLoadWeight.toFixed(1), unit: 't' },
          { label: 'Crane', value: form.craneModel },
          { label: 'Crane Capacity', value: form.craneCapacity, unit: 't' },
          { label: 'Operating Radius', value: form.operatingRadius, unit: 'm' },
          { label: 'Boom Length', value: form.boomLength, unit: 'm' },
          { label: 'Wind Speed', value: form.windSpeed, unit: 'm/s' },
          {
            label: 'Category',
            value: LIFT_CATEGORIES[form.liftCategory]?.name || form.liftCategory,
          },
        ],
        checks: [
          {
            name: 'Crane Capacity',
            capacity: `${form.craneCapacity} t`,
            utilisation: `${results.utilisation.toFixed(1)}%`,
            status: (results.utilisation <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
          },
          {
            name: 'Wind',
            capacity: `${form.maxWindSpeed} m/s`,
            utilisation: `${form.windSpeed} m/s`,
            status: (results.windOK ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
          },
          {
            name: 'Ground Conditions',
            capacity: 'Adequate',
            utilisation: form.groundCondition,
            status: (results.groundOK ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
          },
        ],
        sections: [
          {
            title: 'Load Breakdown',
            head: [['Component', 'Weight (t)']],
            body: [
              ['Load Weight', form.loadWeight],
              ['Rigging', form.riggingWeight],
              ['Hook Block', form.hookBlockWeight],
              ['Total', results.totalLoadWeight.toFixed(1)],
            ],
          },
        ],
        recommendations,
        warnings,
        footerNote: 'BeaverCalc Studio — Lift Load Sheet',
      });
    } catch (e) {
      console.error(e);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Lift Load Sheet',
      subtitle: `Lift #${form.liftNumber} — ${form.liftDescription}`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
        { label: 'Lift Number', value: form.liftNumber },
      ],
      inputs: [
        { label: 'Description', value: form.liftDescription },
        { label: 'Load Weight', value: form.loadWeight, unit: 't' },
        { label: 'Rigging Weight', value: form.riggingWeight, unit: 't' },
        { label: 'Hook Block', value: form.hookBlockWeight, unit: 't' },
        { label: 'Total Load', value: results.totalLoadWeight.toFixed(1), unit: 't' },
        { label: 'Crane', value: form.craneModel },
        { label: 'Crane Capacity', value: form.craneCapacity, unit: 't' },
        { label: 'Operating Radius', value: form.operatingRadius, unit: 'm' },
      ],
      checks: [
        {
          name: 'Crane Capacity',
          capacity: `${form.craneCapacity} t`,
          utilisation: `${results.utilisation.toFixed(1)}%`,
          status: (results.utilisation <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Wind',
          capacity: `${form.maxWindSpeed} m/s`,
          utilisation: `${form.windSpeed} m/s`,
          status: (results.windOK ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio \u2014 Lift Load Sheet',
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
      className={cn('rounded-2xl border overflow-hidden shadow-2xl', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            {icon}
          </motion.div>
          <span className="text-2xl font-semibold text-white">{title}</span>
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
    field: keyof LiftForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-gray-200">
        <ExplainableLabel label={label} field={field} className="text-sm font-semibold text-gray-200" />
        {unit && <span className="text-neon-cyan text-xs ml-1">({unit})</span>}
      </label>
      <div className="relative">
        <input
          title={label}
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neon-cyan text-xs">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Lift Load Sheet
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BS 7121 lift planning & load sheet
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

        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <InputField label="Project" field="projectName" type="text" />
              <InputField label="Reference" field="reference" type="text" />
              <InputField label="Lift Number" field="liftNumber" type="text" />
            </div>
          </CardContent>
        </Card>
        <WhatIfPreview
          title="Lift Load Sheet — 3D Preview"
          sliders={whatIfSliders}
          form={form}
          updateForm={updateForm}
          status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
          onMaximize={() => setPreviewMaximized(true)}
          renderScene={(fsHeight) => (
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardContent className="p-4">
                <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                  <LiftLoadSheet3D />
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
                  id="load"
                  title="Load Details"
                  icon={<FiLayers className="w-5 h-5 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <InputField label="Lift Description" field="liftDescription" type="text" />
                    </div>
                    <InputField label="Load Weight" field="loadWeight" unit="t" />
                    <InputField label="Rigging Weight" field="riggingWeight" unit="t" />
                    <InputField label="Hook Block Weight" field="hookBlockWeight" unit="t" />
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Lift Category</label>
                      <select
                        value={form.liftCategory}
                        onChange={(e) => updateForm('liftCategory', e.target.value)}
                        title="Lift Category"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                      >
                        {Object.entries(LIFT_CATEGORIES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>
                <Section
                  id="crane"
                  title="Crane Details"
                  icon={<FiSettings className="w-5 h-5 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Crane Model" field="craneModel" type="text" />
                    <InputField label="Crane Capacity (at radius)" field="craneCapacity" unit="t" />
                    <InputField label="Operating Radius" field="operatingRadius" unit="m" />
                    <InputField label="Boom Length" field="boomLength" unit="m" />
                  </div>
                </Section>
                <Section
                  id="environment"
                  title="Environmental Conditions"
                  icon={<FiSettings className="w-5 h-5 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Current Wind Speed" field="windSpeed" unit="m/s" />
                    <InputField label="Max Allowed Wind" field="maxWindSpeed" unit="m/s" />
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Ground Condition</label>
                      <select
                        value={form.groundCondition}
                        onChange={(e) => updateForm('groundCondition', e.target.value)}
                        title="Ground Condition"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                      >
                        <option value="good">Good (compacted/paved)</option>
                        <option value="moderate">Moderate (firm ground)</option>
                        <option value="poor">Poor (soft/waterlogged)</option>
                      </select>
                    </div>
                  </div>
                </Section>
              </div>
              <div className="space-y-4 sticky top-32">
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardContent className="p-4">
                    <Interactive3DDiagram height="350px" cameraPosition={[8, 6, 8]}>
                      <LiftLoadSheet3D />
                    </Interactive3DDiagram>
                  </CardContent>
                </Card>

                {/* RUN FULL ANALYSIS button */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,217,255,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={calculate}
                  className="w-full px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/40 transition-all"
                >
                  RUN FULL ANALYSIS
                </motion.button>

                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    {/* Border-l-4 summary cards */}
                    <div className="space-y-3">
                      <div className={cn(
                        'border-l-4 rounded-r-xl p-4 flex items-center gap-3',
                        results.status === 'PASS'
                          ? 'border-green-500 bg-green-900/20'
                          : 'border-red-500 bg-red-900/20',
                      )}>
                        {results.status === 'PASS' ? (
                          <FiCheck className="w-6 h-6 text-green-400 flex-shrink-0" />
                        ) : (
                          <FiAlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        )}
                        <div>
                          <span className={cn(
                            'text-2xl font-black',
                            results.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                          )}>
                            {results.status}
                          </span>
                          <p className="text-sm text-gray-400">
                            Utilisation: {results.utilisation.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="border-l-4 border-neon-cyan rounded-r-xl p-4 bg-gray-900/50 flex items-center gap-3">
                        <FiCheck className="w-5 h-5 text-neon-cyan flex-shrink-0" />
                        <div>
                          <p className="text-white font-semibold">Total Load: {results.totalLoadWeight.toFixed(1)} t</p>
                          <p className="text-sm text-gray-400">Crane Capacity: {results.craneCapacity} t</p>
                        </div>
                      </div>
                      <div className={cn(
                        'border-l-4 rounded-r-xl p-4 bg-gray-900/50 flex items-center gap-3',
                        results.windOK ? 'border-green-500' : 'border-red-500',
                      )}>
                        <FiCheck className={cn('w-5 h-5 flex-shrink-0', results.windOK ? 'text-green-400' : 'text-red-400')} />
                        <div>
                          <p className="text-white font-semibold">Wind: {results.windOK ? 'OK' : 'FAIL'}</p>
                          <p className="text-sm text-gray-400">{form.windSpeed} / {form.maxWindSpeed} m/s</p>
                        </div>
                      </div>
                    </div>
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-lg font-semibold">Lift Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { name: 'Crane Capacity', util: results.utilisation },
                          { name: 'Wind', util: results.windOK ? 50 : 110 },
                          { name: 'Ground', util: results.groundOK ? 30 : 110 },
                        ].map((c) => (
                          <div key={c.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">{c.name}</span>
                              <span className={c.util <= 100 ? 'text-green-400' : 'text-red-400'}>
                                {c.name === 'Crane Capacity'
                                  ? `${c.util.toFixed(1)}%`
                                  : c.util <= 100
                                    ? 'OK'
                                    : 'FAIL'}
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
                        <CardTitle className="text-white text-lg font-semibold">Load Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Load</p>
                          <p className="text-white font-mono">{form.loadWeight} t</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Rigging</p>
                          <p className="text-white font-mono">{form.riggingWeight} t</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total</p>
                          <p className="text-white font-mono text-lg">
                            {results.totalLoadWeight.toFixed(1)} t
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Capacity</p>
                          <p className="text-white font-mono">{results.craneCapacity} t</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-lg font-semibold">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {results.utilisation > 80 && (
                          <div className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">⚠</span>
                            <span className="text-gray-300">
                              Crane util {results.utilisation.toFixed(0)}% — verify load chart at
                              exact radius and boom length
                            </span>
                          </div>
                        )}
                        {form.liftCategory === 'critical' && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">⚠</span>
                            <span className="text-gray-300">
                              Critical lift — appointed person and detailed method statement
                              required
                            </span>
                          </div>
                        )}
                        {!results.windOK && (
                          <div className="flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">⚠</span>
                            <span className="text-gray-300">
                              Wind exceeds limit — postpone until conditions improve
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
                              ? '✓ All lift checks pass — proceed with lift plan'
                              : '✗ Lift checks failed — do not proceed'}
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
                        className="w-full bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> Export PDF
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="w-full bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> Export DOCX
                      </Button>
                      <SaveRunButton calculatorKey="lift-load-sheet" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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
                  <LiftLoadSheet3D />
                </Interactive3DDiagram>
                <button
                  onClick={() => setPreviewMaximized(false)}
                  className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                  aria-label="Minimize preview"
                >
                  <FiMinimize2 size={20} />
                </button>
                <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                  LIFT LOAD SHEET — REAL-TIME PREVIEW
                </div>
              </div>
              <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                  <FiSliders size={14} /> Live Parameters
                </h3>
                {[
                  { label: 'Load Weight', value: `${form.loadWeight || '0'} t` },
                  { label: 'Rigging Weight', value: `${form.riggingWeight || '0'} t` },
                  { label: 'Hook Block', value: `${form.hookBlockWeight || '0'} t` },
                  { label: 'Crane Model', value: form.craneModel || '-' },
                  { label: 'Crane Capacity', value: `${form.craneCapacity || '0'} t` },
                  { label: 'Radius', value: `${form.operatingRadius || '0'} m` },
                  { label: 'Boom Length', value: `${form.boomLength || '0'} m` },
                  { label: 'Wind Speed', value: `${form.windSpeed || '0'} m/s` },
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
                        { label: 'Total Load', value: `${results.totalLoadWeight.toFixed(2)} t` },
                        { label: 'Utilisation', value: `${results.utilisation.toFixed(1)}%` },
                        { label: 'Risk Category', value: results.riskCategory },
                        { label: 'Wind OK', value: results.windOK ? 'YES' : 'NO' },
                        { label: 'Ground OK', value: results.groundOK ? 'YES' : 'NO' },
                        { label: 'Status', value: results.status },
                      ].map((stat) => (
                        <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                          <span className="text-gray-500">{stat.label}</span>
                          <span className={cn('font-medium', results.status === 'FAIL' ? 'text-red-400' : 'text-emerald-400')}>{stat.value}</span>
                        </div>
                      ))}
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Last Analysis</div>
                        {[
                          { label: 'Max Util', value: `${results.maxUtil.toFixed(1)}%`, pass: results.maxUtil <= 100 },
                          { label: 'Critical Check', value: results.criticalCheck, pass: results.status === 'PASS' },
                        ].map((check) => (
                          <div key={check.label} className="flex justify-between text-xs py-0.5">
                            <span className="text-gray-500">{check.label}</span>
                            <span className={cn('font-bold', check.pass ? 'text-emerald-400' : 'text-red-500')}>{check.value}</span>
                          </div>
                        ))}
                      </div>
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

export default LiftLoadSheet;
