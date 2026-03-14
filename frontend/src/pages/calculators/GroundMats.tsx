// =============================================================================
// BeaverCalc Studio — Ground Mats Calculator (Premium)
// Timber crane mat and spreader plate design with Winkler spring model
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
    FiMaximize,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiX
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import BogMats3D from '../../components/3d/scenes/BogMats3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  load: string;
  contactAreaX: string;
  contactAreaY: string;
  matLength: string;
  matWidth: string;
  matThickness: string;
  matE: string;
  matSigmaBem: string;
  matTau: string;
  soilk: string;
  soilType: string;
  matType: string;
}

interface Results {
  M_max: number;
  sigma: number;
  fb: number;
  tau: number;
  fv: number;
  delta: number;
  q_soil_max: number;
  util_bending: number;
  util_shear: number;
  isRigid: boolean;
  beta: number;
  lambda: number;
  I: number;
  V_max: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const MAT_PRESETS: Record<string, { E: string; sigmaBem: string; tau: string; label: string }> = {
  ekki: { E: '18000', sigmaBem: '70', tau: '7.5', label: 'Ekki (D70)' },
  greenheart: { E: '16500', sigmaBem: '65', tau: '7.0', label: 'Greenheart (D60)' },
  oak: { E: '12000', sigmaBem: '36', tau: '4.0', label: 'Oak (D40)' },
  c24: { E: '11000', sigmaBem: '24', tau: '2.5', label: 'Softwood (C24)' },
  steel: { E: '210000', sigmaBem: '275', tau: '160', label: 'Steel Plate' },
};

const SOIL_PRESETS: Record<string, { k: string; label: string }> = {
  soft_clay: { k: '10000', label: 'Soft Clay' },
  firm_clay: { k: '25000', label: 'Firm Clay' },
  stiff_clay: { k: '50000', label: 'Stiff Clay' },
  loose_sand: { k: '15000', label: 'Loose Sand' },
  medium_sand: { k: '40000', label: 'Medium Dense Sand' },
  dense_sand: { k: '80000', label: 'Dense Sand' },
  gravel: { k: '100000', label: 'Gravel' },
  stone_fill: { k: '150000', label: 'Crusite/Stone Fill' },
  hardcore: { k: '75000', label: 'Hardcore/Type 1' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const GroundMats = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    load: true,
    mat: true,
    support: true,
  });

  const [form, setForm] = useState<FormData>({
    load: '200',
    contactAreaX: '0.5',
    contactAreaY: '0.5',
    matLength: '5.0',
    matWidth: '1.0',
    matThickness: '0.20',
    matE: '18000',
    matSigmaBem: '70',
    matTau: '7.5',
    soilk: '50000',
    soilType: 'stiff_clay',
    matType: 'ekki',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'load', label: 'Load' },
  { key: 'contactAreaX', label: 'Contact Area X' },
  { key: 'contactAreaY', label: 'Contact Area Y' },
  { key: 'matLength', label: 'Mat Length' },
  { key: 'matWidth', label: 'Mat Width' },
  { key: 'matThickness', label: 'Mat Thickness' },
  { key: 'matE', label: 'Mat E' },
  { key: 'matSigmaBem', label: 'Mat Sigma Bem' },
  { key: 'matTau', label: 'Mat Tau' },
  { key: 'soilk', label: 'Soilk' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map(e => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'load', label: 'Load', min: 0, max: 100, step: 1, unit: '' },
    { key: 'contactAreaX', label: 'Contact Area X', min: 0, max: 100, step: 1, unit: '' },
    { key: 'contactAreaY', label: 'Contact Area Y', min: 0, max: 100, step: 1, unit: '' },
    { key: 'matLength', label: 'Mat Length', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    if (!validateInputs()) return;
    const newWarnings: Warning[] = [];

    try {
      const P = parseFloat(form.load);
      const L = parseFloat(form.matLength);
      const W = parseFloat(form.matWidth);
      const t = parseFloat(form.matThickness);
      const E = parseFloat(form.matE) * 1000;
      const fb = parseFloat(form.matSigmaBem) * 1000;
      const fv = parseFloat(form.matTau) * 1000;
      const k = parseFloat(form.soilk);

      if (P <= 0 || L <= 0 || W <= 0 || t <= 0) {
        newWarnings.push({ type: 'error', message: 'All dimensions must be positive' });
        setWarnings(newWarnings);
        return;
      }

      const I = (W * Math.pow(t, 3)) / 12;
      const beta = Math.pow((k * W) / (4 * E * I), 0.25);
      const lambda = 1 / beta;
      const isRigid = L < Math.PI / beta;
      const M_max = P / (4 * beta);
      const sigma = (M_max * (t / 2)) / I;
      const V_max = P / 2;
      const tau = (1.5 * V_max) / (W * t);
      const delta = (P * beta) / (2 * k * W);
      const q_soil_max = k * delta;
      const util_bending = sigma / fb;
      const util_shear = tau / fv;

      if (util_bending > 0.9 && util_bending <= 1.0) {
        newWarnings.push({
          type: 'warning',
          message: `Bending at ${(util_bending * 100).toFixed(0)}%`,
        });
      }
      if (util_shear > 0.9 && util_shear <= 1.0) {
        newWarnings.push({
          type: 'warning',
          message: `Shear at ${(util_shear * 100).toFixed(0)}%`,
        });
      }
      if (delta > L / 150) {
        newWarnings.push({ type: 'warning', message: `Deflection exceeds L/150` });
      }
      if (isRigid) {
        newWarnings.push({ type: 'info', message: 'Mat behaves as rigid plate' });
      }

      const overallStatus = util_bending <= 1.0 && util_shear <= 1.0 ? 'PASS' : 'FAIL';

      setResults({
        M_max,
        sigma,
        fb,
        tau,
        fv,
        delta,
        q_soil_max,
        util_bending,
        util_shear,
        isRigid,
        beta,
        lambda,
        I,
        V_max,
        overallStatus,
      });
    } catch {
      newWarnings.push({ type: 'error', message: 'Calculation error' });
    }

    setWarnings(newWarnings);
  };

  useEffect(() => {
    calculate();
  }, [form]);

  // ===========================================================================
  // VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applyMatPreset = (presetKey: string) => {
    const preset = MAT_PRESETS[presetKey];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        matType: presetKey,
        matE: preset.E,
        matSigmaBem: preset.sigmaBem,
        matTau: preset.tau,
      }));
    }
  };

  const applySoilPreset = (presetKey: string) => {
    const preset = SOIL_PRESETS[presetKey];
    if (preset) {
      setForm((prev) => ({ ...prev, soilType: presetKey, soilk: preset.k }));
    }
  };

  // ===========================================================================
  // PDF EXPORT
  // ===========================================================================

  const exportPDF = () => {
    if (!results) return;

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.util_bending > 0.8)
      pdfRecs.push({
        check: 'Bending',
        suggestion: `${(results.util_bending * 100).toFixed(0)}% utilised — consider increasing mat thickness or upgrading timber grade`,
      });
    if (results.util_shear > 0.8)
      pdfRecs.push({
        check: 'Shear',
        suggestion: `${(results.util_shear * 100).toFixed(0)}% utilised — increase mat width or use higher shear grade`,
      });
    if (results.delta > parseFloat(form.matLength) / 150)
      pdfRecs.push({
        check: 'Deflection',
        suggestion: `${(results.delta * 1000).toFixed(1)}mm exceeds L/150 — stiffen mat or improve subgrade`,
      });
    if (results.isRigid)
      pdfRecs.push({
        check: 'Behaviour',
        suggestion: 'Mat behaves as rigid plate — Winkler model conservative',
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion:
        results.overallStatus === 'PASS'
          ? 'All checks satisfied — mat design adequate'
          : 'One or more checks failed — review design',
    });

    generatePremiumPDF({
      title: 'Ground Mat Design',
      subtitle: 'EN 1995-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Ground Mat Design' },
        { label: 'Reference', value: 'GRO001' },
        { label: 'Standard', value: 'EN 1995-1-1' },
      ],
      inputs: [
        { label: 'Applied Load', value: `${form.load} kN` },
        { label: 'Contact Area', value: `${form.contactAreaX} × ${form.contactAreaY} m` },
        {
          label: 'Mat Size',
          value: `${form.matLength} × ${form.matWidth} × ${form.matThickness} m`,
        },
        { label: 'Mat Material', value: MAT_PRESETS[form.matType]?.label || form.matType },
        { label: 'Elastic Modulus', value: `${form.matE} MPa` },
        { label: 'Bending Strength', value: `${form.matSigmaBem} MPa` },
        { label: 'Shear Strength', value: `${form.matTau} MPa` },
        { label: 'Subgrade Modulus', value: `${form.soilk} kN/m³` },
        { label: 'Soil Type', value: SOIL_PRESETS[form.soilType]?.label || form.soilType },
      ],
      sections: [
        {
          title: 'Detailed Results',
          head: [['Parameter', 'Value']],
          body: [
            ['Max Bending Moment', `${results.M_max.toFixed(2)} kNm`],
            ['Bending Stress', `${(results.sigma / 1000).toFixed(1)} MPa`],
            ['Bending Utilisation', `${(results.util_bending * 100).toFixed(1)}%`],
            ['Max Shear Force', `${results.V_max.toFixed(2)} kN`],
            ['Shear Stress', `${(results.tau / 1000).toFixed(1)} MPa`],
            ['Shear Utilisation', `${(results.util_shear * 100).toFixed(1)}%`],
            ['Deflection', `${(results.delta * 1000).toFixed(1)} mm`],
            ['Max Soil Pressure', `${results.q_soil_max.toFixed(0)} kPa`],
            ['Characteristic Length', `${results.lambda.toFixed(2)} m`],
            ['Mat Behaviour', results.isRigid ? 'Rigid' : 'Flexible'],
          ],
        },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `${(results.fb / 1000).toFixed(1)} MPa`,
          utilisation: `${(results.util_bending * 100).toFixed(0)}%`,
          status: results.util_bending <= 1.0 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `${(results.fv / 1000).toFixed(1)} MPa`,
          utilisation: `${(results.util_shear * 100).toFixed(0)}%`,
          status: results.util_shear <= 1.0 ? 'PASS' : 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Ground Mat Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.util_bending > 0.8)
      pdfRecs.push({
        check: 'Bending',
        suggestion: `${(results.util_bending * 100).toFixed(0)}% utilised — consider increasing mat thickness or upgrading timber grade`,
      });
    if (results.util_shear > 0.8)
      pdfRecs.push({
        check: 'Shear',
        suggestion: `${(results.util_shear * 100).toFixed(0)}% utilised — increase mat width or use higher shear grade`,
      });
    if (results.delta > parseFloat(form.matLength) / 150)
      pdfRecs.push({
        check: 'Deflection',
        suggestion: `${(results.delta * 1000).toFixed(1)}mm exceeds L/150 — stiffen mat or improve subgrade`,
      });
    if (results.isRigid)
      pdfRecs.push({
        check: 'Behaviour',
        suggestion: 'Mat behaves as rigid plate — Winkler model conservative',
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion:
        results.overallStatus === 'PASS'
          ? 'All checks satisfied — mat design adequate'
          : 'One or more checks failed — review design',
    });

    generateDOCX({
      title: 'Ground Mat Design',
      subtitle: 'EN 1995-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Ground Mat Design' },
        { label: 'Reference', value: 'GRO001' },
        { label: 'Standard', value: 'EN 1995-1-1' },
      ],
      inputs: [
        { label: 'Applied Load', value: `${form.load} kN` },
        { label: 'Contact Area', value: `${form.contactAreaX} × ${form.contactAreaY} m` },
        {
          label: 'Mat Size',
          value: `${form.matLength} × ${form.matWidth} × ${form.matThickness} m`,
        },
        { label: 'Mat Material', value: MAT_PRESETS[form.matType]?.label || form.matType },
        { label: 'Elastic Modulus', value: `${form.matE} MPa` },
        { label: 'Bending Strength', value: `${form.matSigmaBem} MPa` },
        { label: 'Shear Strength', value: `${form.matTau} MPa` },
        { label: 'Subgrade Modulus', value: `${form.soilk} kN/m³` },
        { label: 'Soil Type', value: SOIL_PRESETS[form.soilType]?.label || form.soilType },
      ],
      sections: [
        {
          title: 'Detailed Results',
          head: [['Parameter', 'Value']],
          body: [
            ['Max Bending Moment', `${results.M_max.toFixed(2)} kNm`],
            ['Bending Stress', `${(results.sigma / 1000).toFixed(1)} MPa`],
            ['Bending Utilisation', `${(results.util_bending * 100).toFixed(1)}%`],
            ['Max Shear Force', `${results.V_max.toFixed(2)} kN`],
            ['Shear Stress', `${(results.tau / 1000).toFixed(1)} MPa`],
            ['Shear Utilisation', `${(results.util_shear * 100).toFixed(1)}%`],
            ['Deflection', `${(results.delta * 1000).toFixed(1)} mm`],
            ['Max Soil Pressure', `${results.q_soil_max.toFixed(0)} kPa`],
            ['Characteristic Length', `${results.lambda.toFixed(2)} m`],
            ['Mat Behaviour', results.isRigid ? 'Rigid' : 'Flexible'],
          ],
        },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `${(results.fb / 1000).toFixed(1)} MPa`,
          utilisation: `${(results.util_bending * 100).toFixed(0)}%`,
          status: results.util_bending <= 1.0 ? 'PASS' : 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `${(results.fv / 1000).toFixed(1)} MPa`,
          utilisation: `${(results.util_shear * 100).toFixed(0)}%`,
          status: results.util_shear <= 1.0 ? 'PASS' : 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Ground Mat Design',
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/10 via-transparent to-neon-purple/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4">
            <FiMaximize className="text-neon-cyan" />
            <span className="text-gray-300 font-mono tracking-wider">
              GEOTECHNICS | GROUND MATS
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-2">Ground Mat Design</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Timber crane mats and spreader plates on elastic Winkler foundations. BS EN 1995-1-1.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 flex gap-2">
            {['input', 'results', 'visualization'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'neon' : 'ghost'}
                onClick={() => setActiveTab(tab as any)}
                disabled={tab !== 'input' && !results}
                className={cn(
                  'px-8 py-3 rounded-xl font-semibold capitalize',
                  activeTab === tab ? 'bg-gradient-to-r from-neon-cyan to-neon-blue' : 'text-gray-400',
                )}
              >
                {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
              </Button>
            ))}
          </div>
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
                  {results.overallStatus === 'PASS' ? 'Design Adequate' : 'Design Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  Max utilisation: {Math.max(results.util_bending, results.util_shear).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:opacity-90"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-gradient-to-r from-neon-purple to-neon-blue hover:opacity-90">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton calculatorKey="ground-mats" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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
          </motion.div>
        )}

        {/* Main Grid */}
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-12 gap-8"
            >
              {/* Inputs */}
              <div className="lg:col-span-7 space-y-4">
                    {/* Load */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('load')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiMaximize className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Applied Load</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.load && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.load && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <InputField
                              label="Point Load"
                              value={form.load}
                              onChange={(v) => setForm({ ...form, load: v })}
                              unit="kN"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Contact X"
                                value={form.contactAreaX}
                                onChange={(v) => setForm({ ...form, contactAreaX: v })}
                                unit="m"
                              />
                              <InputField
                                label="Contact Y"
                                value={form.contactAreaY}
                                onChange={(v) => setForm({ ...form, contactAreaY: v })}
                                unit="m"
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Mat Properties */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('mat')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Mat Properties</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.mat && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.mat && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Mat Material
                              </label>
                              <select
                                title="Mat Material"
                                value={form.matType}
                                onChange={(e) => applyMatPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(MAT_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Length"
                                value={form.matLength}
                                onChange={(v) => setForm({ ...form, matLength: v })}
                                unit="m"
                              />
                              <InputField
                                label="Width"
                                value={form.matWidth}
                                onChange={(v) => setForm({ ...form, matWidth: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Thickness"
                              value={form.matThickness}
                              onChange={(v) => setForm({ ...form, matThickness: v })}
                              unit="m"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <InputField
                                label="E"
                                value={form.matE}
                                onChange={(v) => setForm({ ...form, matE: v })}
                                unit="MPa"
                              />
                              <InputField
                                label="fb"
                                value={form.matSigmaBem}
                                onChange={(v) => setForm({ ...form, matSigmaBem: v })}
                                unit="MPa"
                              />
                              <InputField
                                label="fv"
                                value={form.matTau}
                                onChange={(v) => setForm({ ...form, matTau: v })}
                                unit="MPa"
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Support */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('support')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiGrid className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Support Conditions</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.support && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.support && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Soil Type
                              </label>
                              <select
                                title="Soil Type"
                                value={form.soilType}
                                onChange={(e) => applySoilPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(SOIL_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Subgrade Modulus"
                              value={form.soilk}
                              onChange={(v) => setForm({ ...form, soilk: v })}
                              unit="kN/m³"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardContent className="py-3">
                        <div className="flex items-start gap-2">
                          <FiSettings className="text-neon-cyan mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-gray-500">
                            <p className="font-medium text-gray-400 mb-1">Analysis Method</p>
                            <p>
                              Winkler elastic foundation. M = P/(4β). Suitable for crane mats and
                              outrigger pads.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Calculate Button */}
                    <button
                      onClick={calculate}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-neon-cyan/25"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>
                  </div>

                  {/* Results Sidebar */}
                  <div className="lg:col-span-5 space-y-6 sticky top-8 self-start">
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
                          <BogMats3D />
                        </Interactive3DDiagram>
                        <button
                          onClick={() => setPreviewMaximized(false)}
                          className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                          aria-label="Minimize preview"
                        >
                          <FiMinimize2 size={20} />
                        </button>
                        <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                          GROUND MATS — REAL-TIME PREVIEW
                        </div>
                      </div>
                      <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                          <FiSliders size={14} /> Live Parameters
                        </h3>
                        {[
                          { label: 'Applied Load', field: 'load' as keyof FormData, min: 10, max: 1000, step: 10, unit: 'kN' },
                          { label: 'Mat Length', field: 'matLength' as keyof FormData, min: 1, max: 10, step: 0.1, unit: 'm' },
                          { label: 'Mat Width', field: 'matWidth' as keyof FormData, min: 0.3, max: 3, step: 0.1, unit: 'm' },
                          { label: 'Mat Thickness', field: 'matThickness' as keyof FormData, min: 0.05, max: 0.5, step: 0.01, unit: 'm' },
                          { label: 'Contact X', field: 'contactAreaX' as keyof FormData, min: 0.1, max: 2, step: 0.05, unit: 'm' },
                          { label: 'Contact Y', field: 'contactAreaY' as keyof FormData, min: 0.1, max: 2, step: 0.05, unit: 'm' },
                          { label: 'Soil k', field: 'soilk' as keyof FormData, min: 5000, max: 200000, step: 5000, unit: 'kN/m³' },
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
                            />
                          </div>
                        ))}
                        <div className="border-t border-gray-700 pt-4">
                          <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                            <FiActivity size={14} /> Live Readout
                          </h3>
                          {[
                            { label: 'Mat Type', value: form.matType },
                            { label: 'Mat Size', value: `${form.matLength}×${form.matWidth}m × ${parseFloat(form.matThickness) * 1000}mm` },
                            { label: 'Applied Load', value: `${form.load} kN` },
                            { label: 'Soil Type', value: form.soilType.replace(/_/g, ' ') },
                            { label: 'Soil Modulus', value: `${form.soilk} kN/m³` },
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
                                { label: 'Bending', util: (results.util_bending * 100).toFixed(0), status: results.util_bending <= 1.0 ? 'PASS' : 'FAIL' },
                                { label: 'Shear', util: (results.util_shear * 100).toFixed(0), status: results.util_shear <= 1.0 ? 'PASS' : 'FAIL' },
                                { label: 'Deflection', util: `${(results.delta * 1000).toFixed(1)}mm`, status: 'PASS' as const },
                              ].map((check) => (
                                <div key={check.label} className="flex justify-between text-xs py-0.5">
                                  <span className="text-gray-500">{check.label}</span>
                                  <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : parseFloat(String(check.util)) > 90 ? 'text-orange-400' : 'text-emerald-400')}>
                                    {check.util}{typeof check.util === 'string' && check.util.includes('mm') ? '' : '%'}
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
                      title="Ground Mats — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <BogMats3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="grid grid-cols-2 gap-4">
                        <ResultCard
                          label="Bending Utilisation"
                          value={results.util_bending.toFixed(2)}
                          unit=""
                          status={results.util_bending <= 1.0 ? 'pass' : 'fail'}
                          detail={`σ = ${(results.sigma / 1000).toFixed(1)} MPa`}
                        />
                        <ResultCard
                          label="Shear Utilisation"
                          value={results.util_shear.toFixed(2)}
                          unit=""
                          status={results.util_shear <= 1.0 ? 'pass' : 'fail'}
                          detail={`τ = ${(results.tau / 1000).toFixed(1)} MPa`}
                        />
                        <ResultCard
                          label="Deflection"
                          value={(results.delta * 1000).toFixed(1)}
                          unit="mm"
                          status="neutral"
                          detail={`λ = ${results.lambda.toFixed(2)} m`}
                        />
                        <ResultCard
                          label="Soil Pressure"
                          value={results.q_soil_max.toFixed(0)}
                          unit="kPa"
                          status="neutral"
                          detail={results.isRigid ? 'Rigid mat' : 'Flexible mat'}
                        />
                      </div>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiInfo className="text-neon-cyan" />
                            Detailed Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Max Moment</div>
                              <div className="text-white font-mono">
                                {results.M_max.toFixed(2)} kNm
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Max Shear</div>
                              <div className="text-white font-mono">
                                {results.V_max.toFixed(1)} kN
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Second Moment
                              </div>
                              <div className="text-white font-mono">
                                {(results.I * 1e6).toFixed(2)} cm⁴
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Char. Length
                              </div>
                              <div className="text-white font-mono">
                                {results.lambda.toFixed(3)} m
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results &&
                      (() => {
                        const recs: { check: string; suggestion: string }[] = [];
                        if (results.util_bending > 0.8)
                          recs.push({
                            check: 'Bending',
                            suggestion: `${(results.util_bending * 100).toFixed(0)}% utilised — consider thicker mat or better timber grade`,
                          });
                        if (results.util_shear > 0.8)
                          recs.push({
                            check: 'Shear',
                            suggestion: `${(results.util_shear * 100).toFixed(0)}% utilised — increase mat width or use harder timber`,
                          });
                        if (results.delta > parseFloat(form.matLength) / 150)
                          recs.push({
                            check: 'Deflection',
                            suggestion: `Exceeds L/150 — stiffen mat or improve subgrade`,
                          });
                        if (results.isRigid)
                          recs.push({
                            check: 'Behaviour',
                            suggestion:
                              'Rigid plate behaviour — uniform pressure distribution assumed',
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
                              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <FiInfo className="text-neon-cyan" />
                                Recommendations
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
                          className="w-full bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
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
      field={field || 'ground-mats'}
    />
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
  unit,
  status,
  detail,
}: {
  label: string;
  value: string;
  unit: string;
  status: 'pass' | 'fail' | 'neutral';
  detail?: string;
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 border-l-4 shadow-2xl',
      status === 'pass' && 'border-l-green-400 border-green-500/30 bg-green-950/20',
      status === 'fail' && 'border-l-red-400 border-red-500/30 bg-red-950/20',
      status === 'neutral' && 'border-l-amber-400 border-gray-700/30 bg-gray-900/20',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' && 'text-green-400',
        status === 'fail' && 'text-red-400',
        status === 'neutral' && 'text-white',
      )}
    >
      {value}
      {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
    </div>
    {detail && <div className="text-xs text-gray-500 mt-1">{detail}</div>}
    {status !== 'neutral' && (
      <div
        className={cn(
          'text-xs font-bold mt-2',
          status === 'pass' ? 'text-green-600' : 'text-red-600',
        )}
      >
        {status === 'pass' ? 'PASS' : 'FAIL'}
      </div>
    )}
  </Card>
);

export default GroundMats;
