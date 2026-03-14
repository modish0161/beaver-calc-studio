// =============================================================================
// BeaverCalc Studio — Ground Anchor Calculator
// Temporary & permanent ground anchor design to BS EN 1537 / BS 8081
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
  FiMaximize2,
  FiMinimize2,
  FiSliders,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import GroundAnchor3D from '../../components/3d/scenes/GroundAnchor3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

interface FormData {
  anchorType: string;
  anchorClass: string;
  tendonType: string;
  designLoad: string;
  workingLoad: string;
  proofLoad: string;
  freeLength: string;
  fixedLength: string;
  inclination: string;
  drillDiameter: string;
  tendonDiameter: string;
  tendonGrade: string;
  numberOfStrands: string;
  groutStrength: string;
  soilType: string;
  soilShear: string;
  frictionAngle: string;
  overburden: string;
}

interface Results {
  tendonCapacity: number;
  groutBondCapacity: number;
  soilBondCapacity: number;
  pulloutCapacity: number;
  overallCapacity: number;
  tendonUtil: number;
  groutUtil: number;
  soilUtil: number;
  lockOffLoad: number;
  testLoad: number;
  criticalCheck: string;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  temporary_clay: {
    name: 'Temporary – Stiff Clay',
    form: {
      anchorType: 'temporary',
      designLoad: '400',
      freeLength: '6.0',
      fixedLength: '5.0',
      inclination: '15',
      soilType: 'stiff_clay',
      soilShear: '75',
      numberOfStrands: '3',
    },
  },
  temporary_sand: {
    name: 'Temporary – Dense Sand',
    form: {
      anchorType: 'temporary',
      designLoad: '600',
      freeLength: '8.0',
      fixedLength: '6.0',
      inclination: '20',
      soilType: 'dense_sand',
      frictionAngle: '35',
      numberOfStrands: '4',
    },
  },
  permanent: {
    name: 'Permanent – Mixed',
    form: {
      anchorType: 'permanent',
      designLoad: '800',
      freeLength: '10.0',
      fixedLength: '8.0',
      inclination: '15',
      soilType: 'stiff_clay',
      soilShear: '100',
      numberOfStrands: '6',
    },
  },
};

const GroundAnchor = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    anchor: true,
    tendon: true,
    ground: false,
  });
  const [form, setForm] = useState<FormData>({
    anchorType: 'temporary',
    anchorClass: '1',
    tendonType: 'strand',
    designLoad: '500',
    workingLoad: '400',
    proofLoad: '600',
    freeLength: '8.0',
    fixedLength: '6.0',
    inclination: '15',
    drillDiameter: '150',
    tendonDiameter: '15.7',
    tendonGrade: '1860',
    numberOfStrands: '4',
    groutStrength: '30',
    soilType: 'stiff_clay',
    soilShear: '75',
    frictionAngle: '25',
    overburden: '50',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'anchorClass', label: 'Anchor Class' },
      { key: 'designLoad', label: 'Design Load' },
      { key: 'workingLoad', label: 'Working Load' },
      { key: 'proofLoad', label: 'Proof Load' },
      { key: 'freeLength', label: 'Free Length' },
      { key: 'fixedLength', label: 'Fixed Length' },
      { key: 'inclination', label: 'Inclination', allowZero: true },
      { key: 'drillDiameter', label: 'Drill Diameter' },
      { key: 'tendonDiameter', label: 'Tendon Diameter' },
      { key: 'tendonGrade', label: 'Tendon Grade' },
      { key: 'numberOfStrands', label: 'Number Of Strands' },
      { key: 'groutStrength', label: 'Grout Strength' },
      { key: 'soilShear', label: 'Soil Shear' },
      { key: 'frictionAngle', label: 'Friction Angle' },
      { key: 'overburden', label: 'Overburden' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map((e) => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'anchorType', label: 'Anchor Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'anchorClass', label: 'Anchor Class', min: 0, max: 100, step: 1, unit: '' },
    { key: 'tendonType', label: 'Tendon Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'designLoad', label: 'Design Load', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const Pd = parseFloat(form.designLoad);
      const Lf = parseFloat(form.freeLength);
      const Lb = parseFloat(form.fixedLength);
      const Dd = parseFloat(form.drillDiameter);
      const dT = parseFloat(form.tendonDiameter);
      const fpk = parseFloat(form.tendonGrade);
      const nStrands = parseInt(form.numberOfStrands);
      const fcu_grout = parseFloat(form.groutStrength);
      const cu = parseFloat(form.soilShear);
      const isTemp = form.anchorType === 'temporary';

      if (Pd <= 0 || Lb <= 0 || nStrands <= 0) {
        w.push({ type: 'error', message: 'Invalid inputs' });
        setWarnings(w);
        return;
      }

      // Tendon capacity
      const Aps = (Math.PI * dT * dT) / 4; // per strand mm²
      const totalAps = Aps * nStrands;
      const fyd = fpk * 0.87; // characteristic -> design (0.87 for prestressing)
      const tendonCapacity = (totalAps * fyd) / 1000; // kN

      // Grout-tendon bond capacity (simplified)
      const tau_grout = 0.5 * Math.sqrt(fcu_grout); // MPa, grout-steel bond
      const perimeterTendon = Math.PI * dT * nStrands;
      const groutBondCapacity = (tau_grout * perimeterTendon * Lb * 1000) / 1000;

      // Soil-grout bond capacity
      const alpha = isTemp ? 0.5 : 0.35; // adhesion factor — temp more generous
      const tau_soil = (alpha * cu) / 1000; // MPa
      const soilBondCapacity = (tau_soil * Math.PI * Dd * Lb * 1000) / 1000;

      // Pullout capacity (overall)
      const pulloutCapacity = Math.min(soilBondCapacity, groutBondCapacity);
      const overallCapacity = Math.min(tendonCapacity, pulloutCapacity);

      // Partial factors
      const gammaT = isTemp ? 1.1 : 1.25;
      const tendonUtil = (Pd * gammaT) / tendonCapacity;
      const groutUtil = (Pd * gammaT) / groutBondCapacity;
      const soilUtil = (Pd * gammaT) / soilBondCapacity;

      // Test & lock-off
      const lockOffLoad = parseFloat(form.workingLoad) * (isTemp ? 1.0 : 1.1);
      const testLoad = parseFloat(form.proofLoad) || Pd * 1.5;

      let criticalCheck = 'Tendon';
      if (soilBondCapacity < tendonCapacity && soilBondCapacity < groutBondCapacity)
        criticalCheck = 'Soil Bond';
      if (groutBondCapacity < tendonCapacity && groutBondCapacity < soilBondCapacity)
        criticalCheck = 'Grout Bond';

      if (tendonUtil > 0.85)
        w.push({ type: 'warning', message: 'Tendon utilisation high — consider more strands' });
      if (soilUtil > 0.9)
        w.push({ type: 'warning', message: 'Soil bond near capacity — increase fixed length' });
      if (Lf < 5) w.push({ type: 'info', message: 'Short free length — check creep effects' });

      const overallStatus =
        tendonUtil <= 1.0 && groutUtil <= 1.0 && soilUtil <= 1.0 ? 'PASS' : 'FAIL';

      setResults({
        tendonCapacity,
        groutBondCapacity,
        soilBondCapacity,
        pulloutCapacity,
        overallCapacity,
        tendonUtil,
        groutUtil,
        soilUtil,
        lockOffLoad,
        testLoad,
        criticalCheck,
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
    if (results.tendonUtil > 0.85)
      recs.push({ check: 'Tendon', suggestion: 'Consider additional strands or higher grade' });
    if (results.criticalCheck === 'Soil Bond')
      recs.push({
        check: 'Soil Bond',
        suggestion: 'Increase fixed length or consider post-grouting',
      });
    if (results.criticalCheck === 'Grout Bond')
      recs.push({
        check: 'Grout Bond',
        suggestion: 'Use higher grout strength or larger drill diameter',
      });
    generatePremiumPDF({
      title: 'Ground Anchor Design',
      subtitle: 'BS EN 1537 / BS 8081',
      projectInfo: [
        { label: 'Calculator', value: 'Ground Anchor' },
        { label: 'Code', value: 'BS EN 1537' },
      ],
      inputs: [
        { label: 'Anchor Type', value: form.anchorType },
        { label: 'Design Load', value: form.designLoad, unit: 'kN' },
        { label: 'Free Length', value: form.freeLength, unit: 'm' },
        { label: 'Fixed Length', value: form.fixedLength, unit: 'm' },
        { label: 'Strands', value: `${form.numberOfStrands}T${form.tendonDiameter}` },
        { label: 'Drill Ø', value: form.drillDiameter, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Tendon',
          capacity: `${results.tendonCapacity.toFixed(0)} kN`,
          utilisation: `${(results.tendonUtil * 100).toFixed(0)}%`,
          status: results.tendonUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Grout Bond',
          capacity: `${results.groutBondCapacity.toFixed(0)} kN`,
          utilisation: `${(results.groutUtil * 100).toFixed(0)}%`,
          status: results.groutUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Soil Bond',
          capacity: `${results.soilBondCapacity.toFixed(0)} kN`,
          utilisation: `${(results.soilUtil * 100).toFixed(0)}%`,
          status: results.soilUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Capacity Summary',
          head: [['Component', 'Capacity (kN)']],
          body: [
            ['Tendon', results.tendonCapacity.toFixed(0)],
            ['Grout Bond', results.groutBondCapacity.toFixed(0)],
            ['Soil Bond', results.soilBondCapacity.toFixed(0)],
            ['Overall', results.overallCapacity.toFixed(0)],
            ['Lock-Off', results.lockOffLoad.toFixed(0)],
            ['Test Load', results.testLoad.toFixed(0)],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Ground Anchor',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.tendonUtil > 0.85)
      recs.push({ check: 'Tendon', suggestion: 'Consider additional strands or higher grade' });
    if (results.criticalCheck === 'Soil Bond')
      recs.push({
        check: 'Soil Bond',
        suggestion: 'Increase fixed length or consider post-grouting',
      });
    if (results.criticalCheck === 'Grout Bond')
      recs.push({
        check: 'Grout Bond',
        suggestion: 'Use higher grout strength or larger drill diameter',
      });
    generateDOCX({
      title: 'Ground Anchor Design',
      subtitle: 'BS EN 1537 / BS 8081',
      projectInfo: [
        { label: 'Calculator', value: 'Ground Anchor' },
        { label: 'Code', value: 'BS EN 1537' },
      ],
      inputs: [
        { label: 'Anchor Type', value: form.anchorType },
        { label: 'Design Load', value: form.designLoad, unit: 'kN' },
        { label: 'Free Length', value: form.freeLength, unit: 'm' },
        { label: 'Fixed Length', value: form.fixedLength, unit: 'm' },
        { label: 'Strands', value: `${form.numberOfStrands}T${form.tendonDiameter}` },
        { label: 'Drill Ø', value: form.drillDiameter, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Tendon',
          capacity: `${results.tendonCapacity.toFixed(0)} kN`,
          utilisation: `${(results.tendonUtil * 100).toFixed(0)}%`,
          status: results.tendonUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Grout Bond',
          capacity: `${results.groutBondCapacity.toFixed(0)} kN`,
          utilisation: `${(results.groutUtil * 100).toFixed(0)}%`,
          status: results.groutUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Soil Bond',
          capacity: `${results.soilBondCapacity.toFixed(0)} kN`,
          utilisation: `${(results.soilUtil * 100).toFixed(0)}%`,
          status: results.soilUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Capacity Summary',
          head: [['Component', 'Capacity (kN)']],
          body: [
            ['Tendon', results.tendonCapacity.toFixed(0)],
            ['Grout Bond', results.groutBondCapacity.toFixed(0)],
            ['Soil Bond', results.soilBondCapacity.toFixed(0)],
            ['Overall', results.overallCapacity.toFixed(0)],
            ['Lock-Off', results.lockOffLoad.toFixed(0)],
            ['Test Load', results.testLoad.toFixed(0)],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Ground Anchor',
    });
  };

  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Fullscreen Preview Overlay */}
      {previewMaximized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
        >
          <div className="flex-1 relative">
            <Interactive3DDiagram height="h-full" cameraPosition={[8, 5, 8]}>
              <GroundAnchor3D />
            </Interactive3DDiagram>
            <button
              onClick={() => setPreviewMaximized(false)}
              className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
              aria-label="Minimize preview"
            >
              <FiMinimize2 size={20} />
            </button>
            <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
              GROUND ANCHOR — REAL-TIME PREVIEW
            </div>
          </div>
          <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
            <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
              <FiSliders size={14} /> Live Parameters
            </h3>
            {[
              {
                label: 'Design Load',
                key: 'designLoad',
                min: 100,
                max: 2000,
                step: 50,
                unit: 'kN',
              },
              { label: 'Free Length', key: 'freeLength', min: 2, max: 30, step: 0.5, unit: 'm' },
              { label: 'Fixed Length', key: 'fixedLength', min: 2, max: 20, step: 0.5, unit: 'm' },
            ].map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">{s.label}</span>
                  <span className="text-white">
                    {(form as any)[s.key]} {s.unit}
                  </span>
                </div>
                <input
                  title={s.label}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={(form as any)[s.key]}
                  onChange={(e) => updateForm(s.key as keyof FormData, e.target.value)}
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
                { label: 'Anchor Type', value: form.anchorType.toUpperCase() },
                { label: 'Design Load', value: `${form.designLoad} kN` },
                { label: 'Free Length', value: `${form.freeLength} m` },
                { label: 'Fixed Length', value: `${form.fixedLength} m` },
                { label: 'Strands', value: form.numberOfStrands },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                >
                  <span className="text-gray-500">{stat.label}</span>
                  <span className="text-white font-medium">{stat.value}</span>
                </div>
              ))}
              {results && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                    Last Analysis
                  </div>
                  {[
                    {
                      label: 'Tendon Util',
                      value: `${(results.tendonUtil * 100).toFixed(0)}%`,
                      ok: results.tendonUtil <= 1,
                    },
                    {
                      label: 'Grout Bond',
                      value: `${(results.groutUtil * 100).toFixed(0)}%`,
                      ok: results.groutUtil <= 1,
                    },
                    {
                      label: 'Soil Bond',
                      value: `${(results.soilUtil * 100).toFixed(0)}%`,
                      ok: results.soilUtil <= 1,
                    },
                    {
                      label: 'Status',
                      value: results.overallStatus,
                      ok: results.overallStatus === 'PASS',
                    },
                  ].map((check) => (
                    <div key={check.label} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-500">{check.label}</span>
                      <span
                        className={cn('font-bold', check.ok ? 'text-emerald-400' : 'text-red-500')}
                      >
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

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4 bg-gray-900/40">
            <span className="text-neon-cyan font-mono tracking-wider">GEOTECH | GROUND ANCHOR</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">
            Ground Anchor Design
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Temporary and permanent ground anchor capacity — tendon, grout bond, and soil bond
            checks to BS EN 1537 and BS 8081.
          </p>
        </motion.div>

        <div className="flex justify-center gap-4 mb-8 p-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl max-w-xl mx-auto">
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as any)}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple'
                  : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '⚓ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
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
                  {results.overallStatus === 'PASS' ? 'Anchor Adequate' : 'Anchor Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  Critical: {results.criticalCheck} | Capacity: {results.overallCapacity.toFixed(0)}{' '}
                  kN
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button
                onClick={exportDOCX}
                className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton
                calculatorKey="ground-anchor"
                inputs={form as unknown as Record<string, string | number>}
                results={results}
                status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
              />
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
              className="grid lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-1 space-y-4">
                <Card variant="glass" className="border-neon-cyan/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
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
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('anchor')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">
                        Anchor Properties
                      </CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.anchor && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.anchor && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1 block">
                            Anchor Type
                          </label>
                          <select
                            title="Anchor Type"
                            value={form.anchorType}
                            onChange={(e) => setForm((f) => ({ ...f, anchorType: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                          >
                            <option value="temporary">Temporary</option>
                            <option value="permanent">Permanent</option>
                          </select>
                        </div>
                        <InputField
                          label="Design Load"
                          value={form.designLoad}
                          onChange={(v) => setForm((f) => ({ ...f, designLoad: v }))}
                          unit="kN"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Free Length"
                            value={form.freeLength}
                            onChange={(v) => setForm((f) => ({ ...f, freeLength: v }))}
                            unit="m"
                          />
                          <InputField
                            label="Fixed Length"
                            value={form.fixedLength}
                            onChange={(v) => setForm((f) => ({ ...f, fixedLength: v }))}
                            unit="m"
                          />
                        </div>
                        <InputField
                          label="Inclination"
                          value={form.inclination}
                          onChange={(v) => setForm((f) => ({ ...f, inclination: v }))}
                          unit="°"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('tendon')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Tendon</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.tendon && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.tendon && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Strand Ø"
                            value={form.tendonDiameter}
                            onChange={(v) => setForm((f) => ({ ...f, tendonDiameter: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="No. Strands"
                            value={form.numberOfStrands}
                            onChange={(v) => setForm((f) => ({ ...f, numberOfStrands: v }))}
                            unit=""
                          />
                        </div>
                        <InputField
                          label="Tendon Grade"
                          value={form.tendonGrade}
                          onChange={(v) => setForm((f) => ({ ...f, tendonGrade: v }))}
                          unit="MPa"
                        />
                        <InputField
                          label="Drill Ø"
                          value={form.drillDiameter}
                          onChange={(v) => setForm((f) => ({ ...f, drillDiameter: v }))}
                          unit="mm"
                        />
                        <InputField
                          label="Grout fcu"
                          value={form.groutStrength}
                          onChange={(v) => setForm((f) => ({ ...f, groutStrength: v }))}
                          unit="MPa"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('ground')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">
                        Ground Conditions
                      </CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.ground && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.ground && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="Undrained Shear"
                          value={form.soilShear}
                          onChange={(v) => setForm((f) => ({ ...f, soilShear: v }))}
                          unit="kPa"
                        />
                        <InputField
                          label="Friction Angle"
                          value={form.frictionAngle}
                          onChange={(v) => setForm((f) => ({ ...f, frictionAngle: v }))}
                          unit="°"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                {/* Calculate button */}
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-2xl shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>
              <div className="lg:col-span-2 space-y-6 sticky top-8 self-start">
                <div className="relative">
                  <button
                    onClick={() => setPreviewMaximized(true)}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                    aria-label="Maximize preview"
                    title="Fullscreen preview"
                  >
                    <FiMaximize2 size={16} />
                  </button>
                </div>
                <WhatIfPreview
                  title="Ground Anchor — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 5, 8]}>
                      <GroundAnchor3D />
                    </Interactive3DDiagram>
                  )}
                />
                {results && (
                  <div className="grid grid-cols-3 gap-4">
                    <ResultCard
                      label="Tendon"
                      value={`${(results.tendonUtil * 100).toFixed(0)}%`}
                      limit={`${results.tendonCapacity.toFixed(0)} kN`}
                      status={results.tendonUtil <= 1 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Grout Bond"
                      value={`${(results.groutUtil * 100).toFixed(0)}%`}
                      limit={`${results.groutBondCapacity.toFixed(0)} kN`}
                      status={results.groutUtil <= 1 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Soil Bond"
                      value={`${(results.soilUtil * 100).toFixed(0)}%`}
                      limit={`${results.soilBondCapacity.toFixed(0)} kN`}
                      status={results.soilUtil <= 1 ? 'pass' : 'fail'}
                    />
                  </div>
                )}
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  ['Tendon Cap', `${results.tendonCapacity.toFixed(0)} kN`],
                  ['Grout Bond', `${results.groutBondCapacity.toFixed(0)} kN`],
                  ['Soil Bond', `${results.soilBondCapacity.toFixed(0)} kN`],
                  ['Overall', `${results.overallCapacity.toFixed(0)} kN`],
                  ['Lock-Off', `${results.lockOffLoad.toFixed(0)} kN`],
                  ['Test Load', `${results.testLoad.toFixed(0)} kN`],
                ].map(([l, v], i) => (
                  <Card
                    key={i}
                    variant="glass"
                    className="p-4 text-center border border-gray-700/50 shadow-2xl"
                  >
                    <div className="text-xs uppercase text-gray-500 mb-1">{l}</div>
                    <div className="text-xl font-bold font-mono text-white">{v}</div>
                  </Card>
                ))}
              </div>
              <Card variant="glass" className="border-neon-cyan/30 p-6 shadow-2xl mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                    <FiCheck className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-widest">
                    Design Recommendations
                  </h3>
                </div>
                <div className="space-y-2">
                  {results.tendonUtil > 0.85 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border-l-4 border-l-amber-500 border border-amber-500/10">
                      <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">
                          High Tendon Utilisation
                        </div>
                        <div className="text-xs text-gray-400">
                          Consider additional strands or higher grade tendon
                        </div>
                      </div>
                    </div>
                  )}
                  {results.criticalCheck === 'Soil Bond' && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-500/5 border-l-4 border-l-teal-500 border border-teal-500/10">
                      <FiInfo className="text-teal-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Soil Bond Governs</div>
                        <div className="text-xs text-gray-400">
                          Increase fixed length or consider post-grouting
                        </div>
                      </div>
                    </div>
                  )}
                  {results.criticalCheck === 'Grout Bond' && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border-l-4 border-l-blue-500 border border-blue-500/10">
                      <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Grout Bond Governs</div>
                        <div className="text-xs text-gray-400">
                          Use higher grout strength or larger drill diameter
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border-l-4 border-l-emerald-500 border border-emerald-500/10">
                    <FiCheck className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white">Overall</div>
                      <div className="text-xs text-gray-400">
                        {results.overallStatus === 'PASS'
                          ? 'Ground anchor is adequate for design load'
                          : 'Anchor FAILS — increase capacity or reduce load'}
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
                  <Interactive3DDiagram height="500px" cameraPosition={[10, 8, 10]}>
                    <GroundAnchor3D />
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
    <ExplainableLabel
      label={`${label}${unit ? ` (${unit})` : ''}`}
      field={field || 'ground-anchor'}
    />
    <input
      title={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono"
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
      'p-4 text-center shadow-2xl',
      status === 'pass'
        ? 'border-l-4 border-l-green-500 border border-green-500/30 bg-green-950/20'
        : 'border-l-4 border-l-red-500 border border-red-500/30 bg-red-950/20',
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

export default GroundAnchor;
