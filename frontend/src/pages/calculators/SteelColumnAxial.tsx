// =============================================================================
// BeaverCalc Studio — Steel Column Axial Calculator
// BS EN 1993-1-1 Axial Compression with Buckling
// =============================================================================
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FiActivity, FiAlertTriangle, FiCheck, FiCheckCircle, FiChevronDown, FiDownload, FiInfo, FiMaximize2, FiMinimize2, FiSettings, FiSliders, FiTarget, FiX, FiZap } from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SteelColumn3D from '../../components/3d/scenes/SteelColumn3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import WhatIfPreview from '../../components/WhatIfPreview';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';

interface FormData {
  sectionSize: string;
  steelGrade: string;
  systemLength: string;
  effectiveLengthY: string;
  effectiveLengthZ: string;
  axialForce: string;
  Ag: string;
  Iyy: string;
  Izz: string;
  iy: string;
  iz: string;
  tf: string;
  buckling_curve_y: string;
  buckling_curve_z: string;
}

interface Results {
  fy: number;
  NplRd: number;
  lambda_y: number;
  lambda_z: number;
  chi_y: number;
  chi_z: number;
  NbRd_y: number;
  NbRd_z: number;
  NbRd: number;
  utilAxial: number;
  utilBuckling: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const SECTION_PRESETS: Record<
  string,
  { Ag: string; Iyy: string; Izz: string; iy: string; iz: string; tf: string; label: string }
> = {
  '203x203x60': {
    Ag: '7640',
    Iyy: '6130',
    Izz: '2070',
    iy: '89.6',
    iz: '52.0',
    tf: '14.2',
    label: '203×203×60 UC',
  },
  '254x254x89': {
    Ag: '11400',
    Iyy: '14300',
    Izz: '4860',
    iy: '112',
    iz: '65.2',
    tf: '17.3',
    label: '254×254×89 UC',
  },
  '305x305x118': {
    Ag: '15000',
    Iyy: '27700',
    Izz: '9060',
    iy: '136',
    iz: '77.5',
    tf: '18.7',
    label: '305×305×118 UC',
  },
  '305x305x158': {
    Ag: '20100',
    Iyy: '38800',
    Izz: '12600',
    iy: '139',
    iz: '79.0',
    tf: '25.0',
    label: '305×305×158 UC',
  },
  '356x368x177': {
    Ag: '22600',
    Iyy: '57100',
    Izz: '20500',
    iy: '159',
    iz: '95.3',
    tf: '23.8',
    label: '356×368×177 UC',
  },
  custom: { Ag: '0', Iyy: '0', Izz: '0', iy: '0', iz: '0', tf: '0', label: 'Custom Section' },
};

const ALPHA_FACTORS: Record<string, number> = { a0: 0.13, a: 0.21, b: 0.34, c: 0.49, d: 0.76 };

const SteelColumnAxial = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    section: true,
    length: true,
    loading: false,
  });
  const [form, setForm] = useState<FormData>({
    sectionSize: '254x254x89',
    steelGrade: 'S355',
    systemLength: '4500',
    effectiveLengthY: '1.0',
    effectiveLengthZ: '1.0',
    axialForce: '1500',
    Ag: '11400',
    Iyy: '14300',
    Izz: '4860',
    iy: '112',
    iz: '65.2',
    tf: '17.3',
    buckling_curve_y: 'b',
    buckling_curve_z: 'c',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'systemLength', label: 'System Length' },
  { key: 'effectiveLengthY', label: 'Effective Length Y' },
  { key: 'effectiveLengthZ', label: 'Effective Length Z' },
  { key: 'axialForce', label: 'Axial Force' },
  { key: 'Ag', label: 'Ag' },
  { key: 'Iyy', label: 'Iyy' },
  { key: 'Izz', label: 'Izz' },
  { key: 'iy', label: 'Iy' },
  { key: 'iz', label: 'Iz' },
  { key: 'tf', label: 'Tf' },
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
    { key: 'sectionSize', label: 'Section Size', min: 0, max: 100, step: 1, unit: '' },
    { key: 'steelGrade', label: 'Steel Grade', min: 0, max: 100, step: 1, unit: '' },
    { key: 'systemLength', label: 'System Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'effectiveLengthY', label: 'Effective Length Y', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  useEffect(() => {
    const preset = SECTION_PRESETS[form.sectionSize];
    if (preset && form.sectionSize !== 'custom') {
      setForm((f) => ({
        ...f,
        Ag: preset.Ag,
        Iyy: preset.Iyy,
        Izz: preset.Izz,
        iy: preset.iy,
        iz: preset.iz,
        tf: preset.tf,
      }));
    }
  }, [form.sectionSize]);

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const Ag = parseFloat(form.Ag);
      const iy_val = parseFloat(form.iy);
      const iz_val = parseFloat(form.iz);
      const tf = parseFloat(form.tf);
      const L = parseFloat(form.systemLength);
      const leY = parseFloat(form.effectiveLengthY);
      const leZ = parseFloat(form.effectiveLengthZ);
      const NEd = parseFloat(form.axialForce);

      if (Ag <= 0 || iy_val <= 0 || iz_val <= 0 || L <= 0) {
        w.push({ type: 'error', message: 'Invalid section properties' });
        setWarnings(w);
        return;
      }

      // Steel grade
      const fy =
        tf <= 16
          ? form.steelGrade === 'S355'
            ? 355
            : form.steelGrade === 'S275'
              ? 275
              : 460
          : form.steelGrade === 'S355'
            ? 345
            : form.steelGrade === 'S275'
              ? 265
              : 440;
      const gammaM1 = 1.0;

      // Plastic resistance
      const NplRd = (Ag * fy) / (gammaM1 * 1000); // kN

      // Effective lengths
      const Lcr_y = leY * L;
      const Lcr_z = leZ * L;

      // Non-dimensional slenderness
      const E = 210000; // MPa
      const lambda_1 = Math.PI * Math.sqrt(E / fy);
      const lambda_y = Lcr_y / iy_val / lambda_1;
      const lambda_z = Lcr_z / iz_val / lambda_1;

      // Buckling reduction factors
      const calcChi = (lambda: number, curve: string) => {
        if (lambda <= 0.2) return 1.0;
        const alpha = ALPHA_FACTORS[curve] || 0.34;
        const phi = 0.5 * (1 + alpha * (lambda - 0.2) + lambda * lambda);
        return Math.min(1.0, 1 / (phi + Math.sqrt(phi * phi - lambda * lambda)));
      };

      const chi_y = calcChi(lambda_y, form.buckling_curve_y);
      const chi_z = calcChi(lambda_z, form.buckling_curve_z);

      const NbRd_y = (chi_y * Ag * fy) / (gammaM1 * 1000);
      const NbRd_z = (chi_z * Ag * fy) / (gammaM1 * 1000);
      const NbRd = Math.min(NbRd_y, NbRd_z);

      const utilAxial = NEd / NplRd;
      const utilBuckling = NEd / NbRd;

      if (lambda_y > 2.0 || lambda_z > 2.0)
        w.push({
          type: 'warning',
          message: `High slenderness (λ̄=${Math.max(lambda_y, lambda_z).toFixed(2)}) — consider bracing`,
        });
      if (utilBuckling > 0.85)
        w.push({ type: 'info', message: 'Utilisation >85% — limited reserve' });

      const overallStatus = utilBuckling <= 1.0 ? 'PASS' : 'FAIL';

      setResults({
        fy,
        NplRd,
        lambda_y,
        lambda_z,
        chi_y,
        chi_z,
        NbRd_y,
        NbRd_z,
        NbRd,
        utilAxial,
        utilBuckling,
        overallStatus,
      });
    } catch {
      w.push({ type: 'error', message: 'Calculation error' });
    }
    setWarnings(w);
  };

  useEffect(() => {
    calculate();
  }, [form]);

  const exportPDF = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.utilBuckling > 0.85)
      recs.push({
        check: 'Buckling',
        suggestion: 'Increase section size or add intermediate restraint',
      });
    if (results.lambda_y > 2.0 || results.lambda_z > 2.0)
      recs.push({
        check: 'Slenderness',
        suggestion: 'Column very slender — add bracing or reduce effective length',
      });
    if (results.chi_z < 0.5)
      recs.push({ check: 'Weak Axis', suggestion: 'Consider restraint about weak axis' });
    generatePremiumPDF({
      title: 'Steel Column — Axial Buckling',
      subtitle: 'BS EN 1993-1-1 Cl. 6.3.1',
      projectInfo: [
        { label: 'Calculator', value: 'Steel Column Axial' },
        { label: 'Code', value: 'BS EN 1993-1-1' },
      ],
      inputs: [
        { label: 'Section', value: SECTION_PRESETS[form.sectionSize]?.label || 'Custom' },
        { label: 'Grade', value: form.steelGrade },
        { label: 'Length', value: form.systemLength, unit: 'mm' },
        { label: 'LE factor Y/Z', value: `${form.effectiveLengthY} / ${form.effectiveLengthZ}` },
        { label: 'NEd', value: form.axialForce, unit: 'kN' },
      ],
      checks: [
        {
          name: 'Squash',
          capacity: `NplRd = ${results.NplRd.toFixed(0)} kN`,
          utilisation: `${(results.utilAxial * 100).toFixed(0)}%`,
          status: results.utilAxial <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Buckling',
          capacity: `NbRd = ${results.NbRd.toFixed(0)} kN`,
          utilisation: `${(results.utilBuckling * 100).toFixed(0)}%`,
          status: results.utilBuckling <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Buckling Parameters',
          head: [['Parameter', 'Y-Y', 'Z-Z']],
          body: [
            ['λ̄', results.lambda_y.toFixed(3), results.lambda_z.toFixed(3)],
            ['χ', results.chi_y.toFixed(3), results.chi_z.toFixed(3)],
            ['NbRd', `${results.NbRd_y.toFixed(0)} kN`, `${results.NbRd_z.toFixed(0)} kN`],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Steel Column Axial Buckling',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.utilBuckling > 0.85)
      recs.push({
        check: 'Buckling',
        suggestion: 'Increase section size or add intermediate restraint',
      });
    if (results.lambda_y > 2.0 || results.lambda_z > 2.0)
      recs.push({
        check: 'Slenderness',
        suggestion: 'Column very slender — add bracing or reduce effective length',
      });
    if (results.chi_z < 0.5)
      recs.push({ check: 'Weak Axis', suggestion: 'Consider restraint about weak axis' });
    generateDOCX({
      title: 'Steel Column — Axial Buckling',
      subtitle: 'BS EN 1993-1-1 Cl. 6.3.1',
      projectInfo: [
        { label: 'Calculator', value: 'Steel Column Axial' },
        { label: 'Code', value: 'BS EN 1993-1-1' },
      ],
      inputs: [
        { label: 'Section', value: SECTION_PRESETS[form.sectionSize]?.label || 'Custom' },
        { label: 'Grade', value: form.steelGrade },
        { label: 'Length', value: form.systemLength, unit: 'mm' },
        { label: 'LE factor Y/Z', value: `${form.effectiveLengthY} / ${form.effectiveLengthZ}` },
        { label: 'NEd', value: form.axialForce, unit: 'kN' },
      ],
      checks: [
        {
          name: 'Squash',
          capacity: `NplRd = ${results.NplRd.toFixed(0)} kN`,
          utilisation: `${(results.utilAxial * 100).toFixed(0)}%`,
          status: results.utilAxial <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Buckling',
          capacity: `NbRd = ${results.NbRd.toFixed(0)} kN`,
          utilisation: `${(results.utilBuckling * 100).toFixed(0)}%`,
          status: results.utilBuckling <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Buckling Parameters',
          head: [['Parameter', 'Y-Y', 'Z-Z']],
          body: [
            ['λ̄', results.lambda_y.toFixed(3), results.lambda_z.toFixed(3)],
            ['χ', results.chi_y.toFixed(3), results.chi_z.toFixed(3)],
            ['NbRd', `${results.NbRd_y.toFixed(0)} kN`, `${results.NbRd_z.toFixed(0)} kN`],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Steel Column Axial Buckling',
    });
  };

  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-800/20 via-transparent to-gray-900/10" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-blue-500/30 mb-4 bg-blue-950/20">
            <span className="text-blue-100 font-mono tracking-wider">STEEL | AXIAL COLUMN</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
            Steel Column — Axial
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto mt-2">
            Axial compression with flexural buckling resistance to BS EN 1993-1-1 Clause 6.3.1 —
            buckling curves a0 through d.
          </p>
        </motion.div>

        {/* Glass toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button onClick={exportPDF} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm px-4 py-2 rounded-lg">
            <FiDownload className="mr-2" />
            PDF Report
          </Button>
          <Button onClick={exportDOCX} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm px-4 py-2 rounded-lg">
            <FiDownload className="mr-2" />
            DOCX Report
          </Button>
          <div className="flex-1" />
          <SaveRunButton calculatorKey="steel-column-axial" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as any)}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
            </Button>
          ))}
        </div>

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
                  {results.overallStatus === 'PASS' ? 'Column Adequate' : 'Column Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  NbRd = {results.NbRd.toFixed(0)} kN | χ_min ={' '}
                  {Math.min(results.chi_y, results.chi_z).toFixed(3)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={exportPDF} className="bg-gradient-to-r from-blue-600 to-cyan-600">
                <FiDownload className="mr-2" />
                PDF Report
              </Button>
              <Button onClick={exportDOCX} className="bg-gradient-to-r from-blue-600 to-cyan-600">
                <FiDownload className="mr-2" />
                DOCX Report
              </Button>
              <SaveRunButton calculatorKey="steel-column-axial" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
            </div>
          </motion.div>
        )}

        {warnings.length > 0 && (
          <div className="mb-6 space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={cn(
                  'px-4 py-3 rounded-lg flex items-center gap-3 text-sm',
                  w.type === 'error' && 'bg-red-950/50 border border-red-500/30 text-red-300',
                  w.type === 'warning' &&
                    'bg-yellow-950/50 border border-yellow-500/30 text-yellow-300',
                  w.type === 'info' && 'bg-blue-950/50 border border-blue-500/30 text-blue-300',
                )}
              >
                {w.type === 'error' ? (
                  <FiX className="w-4 h-4" />
                ) : w.type === 'warning' ? (
                  <FiAlertTriangle className="w-4 h-4" />
                ) : (
                  <FiInfo className="w-4 h-4" />
                )}
                {w.message}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-4 gap-6"
            >
              <div className="lg:col-span-1 space-y-4">
                <Card variant="glass" className="border-blue-500/20 shadow-lg shadow-blue-500/5">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('section')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiSettings className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Section Properties</CardTitle>
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
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Section Size
                          </label>
                          <select
                            title="Section Size"
                            value={form.sectionSize}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, sectionSize: e.target.value }))
                            }
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          >
                            {Object.entries(SECTION_PRESETS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Steel Grade
                          </label>
                          <select
                            title="Steel Grade"
                            value={form.steelGrade}
                            onChange={(e) => setForm((f) => ({ ...f, steelGrade: e.target.value }))}
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          >
                            <option value="S275">S275</option>
                            <option value="S355">S355</option>
                            <option value="S460">S460</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Ag"
                            value={form.Ag}
                            onChange={(v) => setForm((f) => ({ ...f, Ag: v }))}
                            unit="mm²"
                          />
                          <InputField
                            label="tf"
                            value={form.tf}
                            onChange={(v) => setForm((f) => ({ ...f, tf: v }))}
                            unit="mm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="iy"
                            value={form.iy}
                            onChange={(v) => setForm((f) => ({ ...f, iy: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="iz"
                            value={form.iz}
                            onChange={(v) => setForm((f) => ({ ...f, iz: v }))}
                            unit="mm"
                          />
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-blue-500/20 shadow-lg shadow-blue-500/5">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('length')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiTarget className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Effective Length</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.length && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.length && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="System Length"
                          value={form.systemLength}
                          onChange={(v) => setForm((f) => ({ ...f, systemLength: v }))}
                          unit="mm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="LE factor Y"
                            value={form.effectiveLengthY}
                            onChange={(v) => setForm((f) => ({ ...f, effectiveLengthY: v }))}
                            unit=""
                          />
                          <InputField
                            label="LE factor Z"
                            value={form.effectiveLengthZ}
                            onChange={(v) => setForm((f) => ({ ...f, effectiveLengthZ: v }))}
                            unit=""
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                              Curve Y
                            </label>
                            <select
                              title="Buckling Curve Y"
                              value={form.buckling_curve_y}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, buckling_curve_y: e.target.value }))
                              }
                              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            >
                              {Object.keys(ALPHA_FACTORS).map((k) => (
                                <option key={k} value={k}>
                                  {k}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                              Curve Z
                            </label>
                            <select
                              title="Buckling Curve Z"
                              value={form.buckling_curve_z}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, buckling_curve_z: e.target.value }))
                              }
                              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            >
                              {Object.keys(ALPHA_FACTORS).map((k) => (
                                <option key={k} value={k}>
                                  {k}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-blue-500/20 shadow-lg shadow-blue-500/5">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('loading')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiZap className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Applied Loading</CardTitle>
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
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="NEd (axial)"
                          value={form.axialForce}
                          onChange={(v) => setForm((f) => ({ ...f, axialForce: v }))}
                          unit="kN"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                {/* RUN FULL ANALYSIS button */}
                <button
                  onClick={calculate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
                </button>
              </div>
              <div className="lg:col-span-2 space-y-6">
                {/* Fullscreen Preview Overlay */}
                {previewMaximized && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex">
                    <div className="flex-1 relative">
                      <Interactive3DDiagram height="h-full" cameraPosition={[5, 6, 5]}>
                        <SteelColumn3D />
                      </Interactive3DDiagram>
                      <button onClick={() => setPreviewMaximized(false)}
                        title="Exit fullscreen"
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10">
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        STEEL COLUMN AXIAL — REAL-TIME PREVIEW
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
                          { label: 'Section', value: SECTION_PRESETS[form.sectionSize]?.label || form.sectionSize },
                          { label: 'Steel Grade', value: form.steelGrade },
                          { label: 'System Length', value: `${form.systemLength} mm` },
                          { label: 'Eff. Length Y', value: form.effectiveLengthY },
                          { label: 'Eff. Length Z', value: form.effectiveLengthZ },
                          { label: 'Axial Force', value: `${form.axialForce} kN` },
                          { label: 'Buckling Curve Y', value: form.buckling_curve_y },
                          { label: 'Buckling Curve Z', value: form.buckling_curve_z },
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
                            { label: 'Squash Util', util: (results.utilAxial * 100).toFixed(1), status: results.utilAxial > 1 ? 'FAIL' : 'PASS' },
                            { label: 'Buckling Util', util: (results.utilBuckling * 100).toFixed(1), status: results.utilBuckling > 1 ? 'FAIL' : 'PASS' },
                            { label: 'N_b,Rd', util: results.NbRd.toFixed(0) + ' kN', status: results.overallStatus },
                            { label: 'λ_y', util: results.lambda_y.toFixed(2), status: results.overallStatus },
                            { label: 'λ_z', util: results.lambda_z.toFixed(2), status: results.overallStatus },
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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-mono uppercase">3D Preview</span>
                  <button
                    onClick={() => setPreviewMaximized(true)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                    title="Fullscreen preview"
                  >
                    <FiMaximize2 size={16} />
                  </button>
                </div>
                <WhatIfPreview
                  title="Steel Column Axial — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[5, 6, 5]}>
                      <SteelColumn3D />
                    </Interactive3DDiagram>
                  )}
                />
              </div>
              {/* Sticky sidebar summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-4">
                  {results && (
                    <>
                      <div className={cn(
                        'bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 border-l-4',
                        results.utilAxial <= 1 ? 'border-l-green-400' : 'border-l-red-400'
                      )}>
                        <div className="text-xs uppercase text-gray-500 mb-1">Squash Resistance</div>
                        <div className={cn('text-2xl font-bold font-mono', results.utilAxial <= 1 ? 'text-green-400' : 'text-red-400')}>
                          {(results.utilAxial * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">NplRd = {results.NplRd.toFixed(0)} kN</div>
                      </div>
                      <div className={cn(
                        'bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 border-l-4',
                        results.utilBuckling <= 1 ? 'border-l-green-400' : 'border-l-red-400'
                      )}>
                        <div className="text-xs uppercase text-gray-500 mb-1">Buckling</div>
                        <div className={cn('text-2xl font-bold font-mono', results.utilBuckling <= 1 ? 'text-green-400' : 'text-red-400')}>
                          {(results.utilBuckling * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">NbRd = {results.NbRd.toFixed(0)} kN</div>
                      </div>
                      <div className={cn(
                        'bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 border-l-4',
                        results.overallStatus === 'PASS' ? 'border-l-blue-400' : 'border-l-red-400'
                      )}>
                        <div className="text-xs uppercase text-gray-500 mb-1">Overall Status</div>
                        <div className={cn('text-lg font-bold', results.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400')}>
                          {results.overallStatus}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          χ_min = {Math.min(results.chi_y, results.chi_z).toFixed(3)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card variant="glass" className="border-gray-800/50 shadow-lg shadow-gray-500/5">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {[
                      ['ƒy', `${results.fy} MPa`],
                      ['NplRd', `${results.NplRd.toFixed(0)} kN`],
                      ['λ̄y', results.lambda_y.toFixed(3)],
                      ['λ̄z', results.lambda_z.toFixed(3)],
                      ['χy', results.chi_y.toFixed(3)],
                      ['χz', results.chi_z.toFixed(3)],
                      ['NbRd,y', `${results.NbRd_y.toFixed(0)} kN`],
                      ['NbRd,z', `${results.NbRd_z.toFixed(0)} kN`],
                    ].map(([l, v], i) => (
                      <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="text-gray-500 text-xs uppercase mb-1">{l}</div>
                        <div className="text-white font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card
                variant="glass"
                className="border-emerald-500/20 p-6 shadow-lg shadow-emerald-500/5 mt-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiCheckCircle className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold">
                    Design Recommendations
                  </h3>
                </div>
                <div className="space-y-2">
                  {results.utilBuckling > 0.85 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">
                          High Buckling Utilisation
                        </div>
                        <div className="text-xs text-gray-400">
                          Increase section size or add intermediate restraint
                        </div>
                      </div>
                    </div>
                  )}
                  {(results.lambda_y > 2.0 || results.lambda_z > 2.0) && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <FiAlertTriangle className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">High Slenderness</div>
                        <div className="text-xs text-gray-400">
                          Column is very slender — consider bracing or reduced effective length
                        </div>
                      </div>
                    </div>
                  )}
                  {results.chi_z < 0.5 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Weak Axis Governs</div>
                        <div className="text-xs text-gray-400">
                          Consider restraint about weak axis or using larger section
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <FiCheck className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white">Overall</div>
                      <div className="text-xs text-gray-400">
                        {results.overallStatus === 'PASS'
                          ? 'Column is adequate for axial buckling'
                          : 'Column FAILS — increase section size'}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
          {activeTab === 'visualization' && (
            <motion.div
              key="viz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card variant="glass" className="border-gray-800/50 overflow-hidden">
                <div className="bg-gradient-to-b from-gray-900 to-black p-4">
                  <Interactive3DDiagram height="500px" cameraPosition={[6, 8, 6]}>
                    <SteelColumn3D />
                  </Interactive3DDiagram>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

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
    <div className="flex items-center gap-1.5 mb-2">
      <ExplainableLabel
        label={label}
        field={field || label.toLowerCase().replace(/\s+/g, '_')}
        className="text-sm font-semibold text-gray-300"
      />{' '}
      {unit && <span className="text-gray-600 text-xs">({unit})</span>}
    </div>
    <input
      title={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
    />
  </div>
);

const ResultCard = ({
  label,
  value,
  limit,
  status,
}: {
  label: string;
  value: string;
  limit: string;
  status: 'pass' | 'fail';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 text-center border shadow-lg',
      status === 'pass'
        ? 'border-green-500/30 bg-green-950/20 shadow-green-500/5'
        : 'border-red-500/30 bg-red-950/20 shadow-red-500/5',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' ? 'text-green-400' : 'text-red-400',
      )}
    >
      {value}
    </div>
    <div className="text-xs text-gray-500 mt-1">{limit}</div>
  </Card>
);

export default SteelColumnAxial;
