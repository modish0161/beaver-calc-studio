// =============================================================================
// BeaverCalc Studio — Guardrail Checks Calculator (Premium)
// Tubular guardrail and post capacity verification
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiInfo,
    FiMinimize2,
    FiSettings,
    FiShield,
    FiSliders,
    FiX
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import GuardrailChecks3D from '../../components/3d/scenes/GuardrailChecks3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  materialKey: string;
  tubeKey: string;
  postSpacing: string;
  postHeight: string;
  railHeight: string;
  numRails: string;
  pointLoad: string;
  lineLoad: string;
  loadCase: string;
  deflectionLimit: string;
}

interface Results {
  postMoment: number;
  railMoment: number;
  postCapacity: number;
  railCapacity: number;
  postDeflection: number;
  railDeflection: number;
  postUtilisation: number;
  railUtilisation: number;
  defUtilisation: number;
  overallStatus: 'PASS' | 'FAIL';
  postStatus: 'PASS' | 'FAIL';
  railStatus: 'PASS' | 'FAIL';
  deflectionStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// MATERIALS & SECTIONS DATABASE
// =============================================================================

const MATERIALS: Record<string, { name: string; E: number; fy: number }> = {
  steel_s275: { name: 'Steel S275', E: 210000, fy: 275 },
  steel_s355: { name: 'Steel S355', E: 210000, fy: 355 },
  alum_6082: { name: 'Aluminium 6082-T6', E: 70000, fy: 250 },
  alum_6063: { name: 'Aluminium 6063-T6', E: 70000, fy: 160 },
};

const TUBES: Record<string, { name: string; D: number; t: number; I: number; Z: number }> = {
  '48.3x3.2': { name: '48.3×3.2 CHS (Scaffold)', D: 48.3, t: 3.2, I: 11.6, Z: 4.8 },
  '48.3x4.0': { name: '48.3×4.0 CHS (Heavy)', D: 48.3, t: 4.0, I: 13.8, Z: 5.7 },
  '48.3x5.0': { name: '48.3×5.0 CHS (XH)', D: 48.3, t: 5.0, I: 16.2, Z: 6.7 },
  '42.4x3.2': { name: '42.4×3.2 CHS (C42)', D: 42.4, t: 3.2, I: 8.2, Z: 3.9 },
  '33.7x3.2': { name: '33.7×3.2 CHS (B34)', D: 33.7, t: 3.2, I: 4.1, Z: 2.4 },
  '60.3x3.2': { name: '60.3×3.2 CHS', D: 60.3, t: 3.2, I: 23.4, Z: 7.8 },
  '76.1x3.2': { name: '76.1×3.2 CHS', D: 76.1, t: 3.2, I: 48.8, Z: 12.8 },
  '40x40x3': { name: '40×40×3 SHS', D: 40, t: 3, I: 6.9, Z: 3.5 },
  '50x50x3': { name: '50×50×3 SHS', D: 50, t: 3, I: 14.2, Z: 5.7 },
};

const LOAD_CASES: Record<string, { point: string; line: string; label: string }> = {
  pedestrian: { point: '0.5', line: '0.5', label: 'Pedestrian (BS 6180)' },
  crowd: { point: '1.5', line: '1.5', label: 'Crowd Loading' },
  industrial: { point: '0.75', line: '0.74', label: 'Industrial' },
  light: { point: '0.36', line: '0.36', label: 'Light Access' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const GuardrailChecks = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    section: true,
    geometry: true,
    loading: false,
  });

  const [form, setForm] = useState<FormData>({
    materialKey: 'steel_s275',
    tubeKey: '48.3x3.2',
    postSpacing: '2.0',
    postHeight: '1.1',
    railHeight: '1.0',
    numRails: '2',
    pointLoad: '0.5',
    lineLoad: '0.5',
    loadCase: 'pedestrian',
    deflectionLimit: '100',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'postSpacing', label: 'Post Spacing' },
  { key: 'postHeight', label: 'Post Height' },
  { key: 'railHeight', label: 'Rail Height' },
  { key: 'numRails', label: 'Num Rails' },
  { key: 'pointLoad', label: 'Point Load' },
  { key: 'lineLoad', label: 'Line Load' },
  { key: 'deflectionLimit', label: 'Deflection Limit' },
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
    { key: 'materialKey', label: 'Material Key', min: 0, max: 100, step: 1, unit: '' },
    { key: 'tubeKey', label: 'Tube Key', min: 0, max: 100, step: 1, unit: '' },
    { key: 'postSpacing', label: 'Post Spacing', min: 0, max: 100, step: 1, unit: '' },
    { key: 'postHeight', label: 'Post Height', min: 0, max: 100, step: 1, unit: '' }
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
      const mat = MATERIALS[form.materialKey];
      const tube = TUBES[form.tubeKey];
      const L = parseFloat(form.postSpacing);
      const H = parseFloat(form.postHeight);
      const F_point = parseFloat(form.pointLoad);
      const w_line = parseFloat(form.lineLoad);
      const defLimit = parseFloat(form.deflectionLimit);

      if (L <= 0 || H <= 0 || F_point <= 0) {
        newWarnings.push({ type: 'error', message: 'Invalid geometry or loading' });
        setWarnings(newWarnings);
        return;
      }

      // Material factors
      const E = mat.E; // MPa
      const fy = mat.fy; // MPa
      const I = tube.I * 1e4; // mm⁴
      const Z = tube.Z * 1e3; // mm³

      // Elastic moment capacity
      const M_cap = (fy * Z) / 1e6; // kNm

      // Post as cantilever with point load at top
      const M_post = F_point * H; // kNm

      // Rail as simply supported with point load at midspan (worst case)
      const M_rail = (F_point * L) / 4; // kNm

      // Deflection of rail (point load at midspan)
      const F_N = F_point * 1000;
      const L_mm = L * 1000;
      const rail_def = (F_N * Math.pow(L_mm, 3)) / (48 * E * I);
      const allow_def = L_mm / defLimit;

      // Post deflection (cantilever tip)
      const H_mm = H * 1000;
      const post_def = (F_N * Math.pow(H_mm, 3)) / (3 * E * I);

      // Utilisations
      const postUtil = (M_post / M_cap) * 100;
      const railUtil = (M_rail / M_cap) * 100;
      const defUtil = (rail_def / allow_def) * 100;

      // Status
      const postStatus = M_post <= M_cap ? 'PASS' : 'FAIL';
      const railStatus = M_rail <= M_cap ? 'PASS' : 'FAIL';
      const deflectionStatus = rail_def <= allow_def ? 'PASS' : 'FAIL';
      const overallStatus =
        postStatus === 'PASS' && railStatus === 'PASS' && deflectionStatus === 'PASS'
          ? 'PASS'
          : 'FAIL';

      // Warnings
      if (postUtil > 85 && postUtil <= 100) {
        newWarnings.push({
          type: 'warning',
          message: `High post utilisation: ${postUtil.toFixed(0)}%`,
        });
      }
      if (L > 2.4) {
        newWarnings.push({ type: 'info', message: 'Post spacing exceeds typical max 2.4m' });
      }
      if (H < 1.0) {
        newWarnings.push({ type: 'warning', message: 'Height below 1.0m minimum for BS 6180' });
      }
      if (H > 1.1 && form.loadCase === 'pedestrian') {
        newWarnings.push({
          type: 'info',
          message: 'Height exceeds standard 1.1m for pedestrian barriers',
        });
      }

      setResults({
        postMoment: M_post,
        railMoment: M_rail,
        postCapacity: M_cap,
        railCapacity: M_cap,
        postDeflection: post_def,
        railDeflection: rail_def,
        postUtilisation: postUtil,
        railUtilisation: railUtil,
        defUtilisation: defUtil,
        overallStatus,
        postStatus,
        railStatus,
        deflectionStatus,
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

  const applyLoadCase = (key: string) => {
    const preset = LOAD_CASES[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        loadCase: key,
        pointLoad: preset.point,
        lineLoad: preset.line,
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
    if (results.postUtilisation > 85)
      pdfRecs.push({
        check: 'High Post Utilisation',
        suggestion: `Post at ${results.postUtilisation.toFixed(0)}% — consider heavier section or reducing spacing`,
      });
    if (results.railUtilisation > 85)
      pdfRecs.push({
        check: 'High Rail Utilisation',
        suggestion: `Rail at ${results.railUtilisation.toFixed(0)}% — consider heavier section`,
      });
    if (parseFloat(form.postHeight) < 1.0)
      pdfRecs.push({
        check: 'Low Height',
        suggestion: 'Height below 1.0m minimum for BS 6180 compliance',
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion: `Guardrail ${results.overallStatus === 'PASS' ? 'adequate' : 'inadequate'} — ${TUBES[form.tubeKey]?.name} @ ${form.postSpacing}m c/c`,
    });

    generatePremiumPDF({
      title: 'Guardrail Checks',
      subtitle: 'BS 6180 — Tubular Guardrail Verification',
      projectInfo: [
        { label: 'Project', value: 'Guardrail Capacity Check' },
        { label: 'Reference', value: 'GUA001' },
        { label: 'Standard', value: 'BS 6180' },
      ],
      inputs: [
        { label: 'Material', value: MATERIALS[form.materialKey]?.name || form.materialKey },
        { label: 'Tube Section', value: TUBES[form.tubeKey]?.name || form.tubeKey },
        { label: 'Post Spacing', value: form.postSpacing, unit: 'm' },
        { label: 'Post Height', value: form.postHeight, unit: 'm' },
        { label: 'Number of Rails', value: form.numRails },
        { label: 'Load Case', value: LOAD_CASES[form.loadCase]?.label || form.loadCase },
        { label: 'Point Load', value: form.pointLoad, unit: 'kN' },
        { label: 'Deflection Limit', value: `L/${form.deflectionLimit}` },
      ],
      sections: [
        {
          title: 'Detailed Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Post Moment', results.postMoment.toFixed(3), 'kNm'],
            ['Rail Moment', results.railMoment.toFixed(3), 'kNm'],
            ['Section Capacity', results.postCapacity.toFixed(3), 'kNm'],
            ['Post Deflection', results.postDeflection.toFixed(1), 'mm'],
            ['Rail Deflection', results.railDeflection.toFixed(1), 'mm'],
            ['Post Utilisation', results.postUtilisation.toFixed(1), '%'],
            ['Rail Utilisation', results.railUtilisation.toFixed(1), '%'],
            ['Deflection Utilisation', results.defUtilisation.toFixed(1), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Post Bending',
          capacity: `${results.postCapacity.toFixed(2)} kNm`,
          utilisation: `${results.postUtilisation.toFixed(0)}%`,
          status: results.postStatus,
        },
        {
          name: 'Rail Bending',
          capacity: `${results.railCapacity.toFixed(2)} kNm`,
          utilisation: `${results.railUtilisation.toFixed(0)}%`,
          status: results.railStatus,
        },
        {
          name: 'Rail Deflection',
          capacity: `L/${form.deflectionLimit}`,
          utilisation: `${results.defUtilisation.toFixed(0)}%`,
          status: results.deflectionStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Guardrail Checks per BS 6180',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.postUtilisation > 85)
      pdfRecs.push({
        check: 'High Post Utilisation',
        suggestion: `Post at ${results.postUtilisation.toFixed(0)}% — consider heavier section or reducing spacing`,
      });
    if (results.railUtilisation > 85)
      pdfRecs.push({
        check: 'High Rail Utilisation',
        suggestion: `Rail at ${results.railUtilisation.toFixed(0)}% — consider heavier section`,
      });
    if (parseFloat(form.postHeight) < 1.0)
      pdfRecs.push({
        check: 'Low Height',
        suggestion: 'Height below 1.0m minimum for BS 6180 compliance',
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion: `Guardrail ${results.overallStatus === 'PASS' ? 'adequate' : 'inadequate'} — ${TUBES[form.tubeKey]?.name} @ ${form.postSpacing}m c/c`,
    });

    generateDOCX({
      title: 'Guardrail Checks',
      subtitle: 'BS 6180 — Tubular Guardrail Verification',
      projectInfo: [
        { label: 'Project', value: 'Guardrail Capacity Check' },
        { label: 'Reference', value: 'GUA001' },
        { label: 'Standard', value: 'BS 6180' },
      ],
      inputs: [
        { label: 'Material', value: MATERIALS[form.materialKey]?.name || form.materialKey },
        { label: 'Tube Section', value: TUBES[form.tubeKey]?.name || form.tubeKey },
        { label: 'Post Spacing', value: form.postSpacing, unit: 'm' },
        { label: 'Post Height', value: form.postHeight, unit: 'm' },
        { label: 'Number of Rails', value: form.numRails },
        { label: 'Load Case', value: LOAD_CASES[form.loadCase]?.label || form.loadCase },
        { label: 'Point Load', value: form.pointLoad, unit: 'kN' },
        { label: 'Deflection Limit', value: `L/${form.deflectionLimit}` },
      ],
      sections: [
        {
          title: 'Detailed Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Post Moment', results.postMoment.toFixed(3), 'kNm'],
            ['Rail Moment', results.railMoment.toFixed(3), 'kNm'],
            ['Section Capacity', results.postCapacity.toFixed(3), 'kNm'],
            ['Post Deflection', results.postDeflection.toFixed(1), 'mm'],
            ['Rail Deflection', results.railDeflection.toFixed(1), 'mm'],
            ['Post Utilisation', results.postUtilisation.toFixed(1), '%'],
            ['Rail Utilisation', results.railUtilisation.toFixed(1), '%'],
            ['Deflection Utilisation', results.defUtilisation.toFixed(1), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Post Bending',
          capacity: `${results.postCapacity.toFixed(2)} kNm`,
          utilisation: `${results.postUtilisation.toFixed(0)}%`,
          status: results.postStatus,
        },
        {
          name: 'Rail Bending',
          capacity: `${results.railCapacity.toFixed(2)} kNm`,
          utilisation: `${results.railUtilisation.toFixed(0)}%`,
          status: results.railStatus,
        },
        {
          name: 'Rail Deflection',
          capacity: `L/${form.deflectionLimit}`,
          utilisation: `${results.defUtilisation.toFixed(0)}%`,
          status: results.deflectionStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Guardrail Checks per BS 6180',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800/20 via-transparent to-cyan-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl mb-6">
            <FiShield className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">SAFETY | ACCESS</span>
          </div>
          <h1 className="text-6xl font-black mb-2">
            <span className="bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">Guardrail Checks</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Tubular guardrail and post capacity verification to BS 6180.
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
                  {results.overallStatus === 'PASS' ? 'Guardrail Adequate' : 'Guardrail Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  {TUBES[form.tubeKey]?.name} @ {form.postSpacing}m c/c | H = {form.postHeight}m
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton calculatorKey="guardrail-checks" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
            </div>
          </motion.div>
        )}

        {/* Warnings + Main Content */}
        <div className="space-y-4">
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
                  className="grid lg:grid-cols-12 gap-6"
                >
                  {/* Inputs */}
                  <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-8 lg:self-start">
                    {/* Section */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('section')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiShield className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Section & Material</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.section && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.section && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Material
                              </label>
                              <select
                                title="Material"
                                value={form.materialKey}
                                onChange={(e) => setForm({ ...form, materialKey: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(MATERIALS).map(([key, mat]) => (
                                  <option key={key} value={key}>
                                    {mat.name} (fy={mat.fy} MPa)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Tube Section
                              </label>
                              <select
                                title="Tube Section"
                                value={form.tubeKey}
                                onChange={(e) => setForm({ ...form, tubeKey: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(TUBES).map(([key, tube]) => (
                                  <option key={key} value={key}>
                                    {tube.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Geometry */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('geometry')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Geometry</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.geometry && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.geometry && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Post Spacing"
                                value={form.postSpacing}
                                onChange={(v) => setForm({ ...form, postSpacing: v })}
                                unit="m"
                              />
                              <InputField
                                label="Post Height"
                                value={form.postHeight}
                                onChange={(v) => setForm({ ...form, postHeight: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Number of Rails"
                              value={form.numRails}
                              onChange={(v) => setForm({ ...form, numRails: v })}
                              unit=""
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Loading */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('loading')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiAlertTriangle className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Loading</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.loading && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.loading && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Load Case
                              </label>
                              <select
                                title="Load Case"
                                value={form.loadCase}
                                onChange={(e) => applyLoadCase(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(LOAD_CASES).map(([key, lc]) => (
                                  <option key={key} value={key}>
                                    {lc.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Point Load"
                                value={form.pointLoad}
                                onChange={(v) => setForm({ ...form, pointLoad: v })}
                                unit="kN"
                              />
                              <InputField
                                label="Defl Limit (L/n)"
                                value={form.deflectionLimit}
                                onChange={(v) => setForm({ ...form, deflectionLimit: v })}
                                unit=""
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Calculate Button */}
                    <button
                      onClick={calculate}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>
                  </div>

                  {/* Visualization & Results */}
                  <div className="lg:col-span-8 space-y-6">
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
                            <GuardrailChecks3D />
                          </Interactive3DDiagram>
                          <button
                            onClick={() => setPreviewMaximized(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                            aria-label="Minimize preview"
                          >
                            <FiMinimize2 size={20} />
                          </button>
                          <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                            GUARDRAIL CHECKS — REAL-TIME PREVIEW
                          </div>
                        </div>

                        {/* Right sidebar */}
                        <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                          <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                            <FiSliders size={14} /> Live Parameters
                          </h3>
                          {[
                            { label: 'Post Spacing', field: 'postSpacing' as keyof FormData, min: 0.5, max: 3.0, step: 0.1, unit: 'm' },
                            { label: 'Post Height', field: 'postHeight' as keyof FormData, min: 0.9, max: 1.5, step: 0.05, unit: 'm' },
                            { label: 'Point Load', field: 'pointLoad' as keyof FormData, min: 0.0, max: 2.0, step: 0.1, unit: 'kN' },
                            { label: 'Line Load', field: 'lineLoad' as keyof FormData, min: 0.0, max: 2.0, step: 0.1, unit: 'kN/m' },
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
                              { label: 'Tube Size', value: form.tubeKey },
                              { label: 'Material', value: form.materialKey },
                              { label: 'Rails', value: form.numRails },
                              { label: 'Def. Limit', value: `${form.deflectionLimit} mm` },
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
                                  { label: 'Post Bending', util: results.postUtilisation.toFixed(0), status: results.postStatus },
                                  { label: 'Rail Bending', util: results.railUtilisation.toFixed(0), status: results.railStatus },
                                  { label: 'Deflection', util: results.defUtilisation.toFixed(0), status: results.deflectionStatus },
                                ].map((check) => (
                                  <div key={check.label} className="flex justify-between text-xs py-0.5">
                                    <span className="text-gray-500">{check.label}</span>
                                    <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : parseFloat(check.util) > 90 ? 'text-orange-400' : 'text-emerald-400')}>
                                      {check.util}%
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
                      title="Guardrail Checks — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <GuardrailChecks3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard
                          label="Post Bending"
                          value={`${results.postMoment.toFixed(2)} kNm`}
                          util={`${results.postUtilisation.toFixed(0)}%`}
                          status={results.postStatus}
                        />
                        <ResultCard
                          label="Rail Bending"
                          value={`${results.railMoment.toFixed(2)} kNm`}
                          util={`${results.railUtilisation.toFixed(0)}%`}
                          status={results.railStatus}
                        />
                        <ResultCard
                          label="Rail Deflection"
                          value={`${results.railDeflection.toFixed(1)} mm`}
                          util={`${results.defUtilisation.toFixed(0)}%`}
                          status={results.deflectionStatus}
                        />
                        <ResultCard
                          label="Capacity"
                          value={`${results.postCapacity.toFixed(2)} kNm`}
                          util=""
                          status="info"
                        />
                      </div>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiInfo className="text-neon-cyan" />
                            Analysis Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Post Deflection
                              </div>
                              <div className="text-white font-mono">
                                {results.postDeflection.toFixed(1)} mm
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Section Zx</div>
                              <div className="text-blue-400 font-mono">
                                {TUBES[form.tubeKey]?.Z || 0} cm³
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Section Ix</div>
                              <div className="text-blue-400 font-mono">
                                {TUBES[form.tubeKey]?.I || 0} cm⁴
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Design Standard
                              </div>
                              <div className="text-white font-mono">BS 6180</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiCheck className="text-green-400" />
                            Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {results.postUtilisation > 85 && (
                            <div className="flex items-start gap-2 text-amber-300">
                              <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>
                                Post at {results.postUtilisation.toFixed(0)}% — consider heavier
                                section or closer spacing
                              </span>
                            </div>
                          )}
                          {results.railUtilisation > 85 && (
                            <div className="flex items-start gap-2 text-amber-300">
                              <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>
                                Rail at {results.railUtilisation.toFixed(0)}% — consider heavier
                                tube section
                              </span>
                            </div>
                          )}
                          {parseFloat(form.postHeight) < 1.0 && (
                            <div className="flex items-start gap-2 text-red-300">
                              <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>Height below 1.0m minimum for BS 6180</span>
                            </div>
                          )}
                          <div className="flex items-start gap-2 text-green-400">
                            <FiCheck className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              Guardrail{' '}
                              {results.overallStatus === 'PASS' ? 'adequate' : 'inadequate'} —{' '}
                              {TUBES[form.tubeKey]?.name} @ {form.postSpacing}m c/c
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="lg:hidden">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={exportPDF}
                          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
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

      {/* Grid pattern CSS */}
      <style>{`
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
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
      field={field || 'guardrail-checks'}
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
  util,
  status,
}: {
  label: string;
  value: string;
  util: string;
  status: 'PASS' | 'FAIL' | 'info';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 border-l-4 shadow-2xl',
      status === 'PASS' && 'border-l-green-500 border-green-500/30 bg-green-950/20',
      status === 'FAIL' && 'border-l-red-500 border-red-500/30 bg-red-950/20',
      status === 'info' && 'border-l-neon-cyan border-neon-cyan/30 bg-blue-950/20',
    )}
  >
    <div className="text-xs uppercase text-gray-400 mb-1">{label}</div>
    <div
      className={cn(
        'text-xl font-bold font-mono',
        status === 'PASS' && 'text-green-400',
        status === 'FAIL' && 'text-red-400',
        status === 'info' && 'text-neon-cyan',
      )}
    >
      {value}
    </div>
    {util && <div className="text-xs text-gray-400 mt-1">{util}</div>}
    {status !== 'info' && (
      <div
        className={cn(
          'text-xs font-bold mt-2',
          status === 'PASS' ? 'text-green-500' : 'text-red-500',
        )}
      >
        {status}
      </div>
    )}
  </Card>
);

export default GuardrailChecks;
