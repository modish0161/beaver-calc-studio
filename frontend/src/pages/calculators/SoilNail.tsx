// =============================================================================
// BeaverCalc Studio — Soil Nail Wall Calculator
// BS EN 14490 / CIRIA C637 Soil Nail Design
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
  FiSliders,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SoilNail3D from '../../components/3d/scenes/SoilNail3D';
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
  cutHeight: string;
  wallAngle: string;
  nailSpacingH: string;
  nailSpacingV: string;
  nailLength: string;
  nailDiameter: string;
  nailInclination: string;
  drillHoleDia: string;
  groutStrength: string;
  steelGrade: string;
  soilUnit: string;
  soilPhi: string;
  soilCohesion: string;
  surcharge: string;
  facingType: string;
}

interface Results {
  nailTensileCapacity: number;
  groutPullout: number;
  soilPullout: number;
  nailCapacity: number;
  requiredCapacity: number;
  tensileUtil: number;
  pulloutUtil: number;
  globalFOS: number;
  internalFOS: number;
  nailDensity: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  shallow_cut: {
    name: 'Shallow Cut (4m)',
    form: {
      cutHeight: '4.0',
      nailLength: '5.0',
      nailSpacingH: '1.5',
      nailSpacingV: '1.5',
      nailDiameter: '25',
      drillHoleDia: '100',
      soilPhi: '28',
      soilCohesion: '5',
      surcharge: '5',
    },
  },
  medium_cut: {
    name: 'Medium Cut (6m)',
    form: {
      cutHeight: '6.0',
      nailLength: '8.0',
      nailSpacingH: '1.5',
      nailSpacingV: '1.5',
      nailDiameter: '25',
      drillHoleDia: '100',
      soilPhi: '30',
      soilCohesion: '5',
      surcharge: '10',
    },
  },
  deep_cut: {
    name: 'Deep Cut (9m)',
    form: {
      cutHeight: '9.0',
      nailLength: '12.0',
      nailSpacingH: '1.5',
      nailSpacingV: '1.5',
      nailDiameter: '32',
      drillHoleDia: '150',
      soilPhi: '32',
      soilCohesion: '10',
      surcharge: '10',
    },
  },
};

const SoilNail = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    wall: true,
    nail: true,
    soil: false,
  });
  const [form, setForm] = useState<FormData>({
    cutHeight: '6.0',
    wallAngle: '80',
    nailSpacingH: '1.5',
    nailSpacingV: '1.5',
    nailLength: '8.0',
    nailDiameter: '25',
    nailInclination: '15',
    drillHoleDia: '100',
    groutStrength: '25',
    steelGrade: '500',
    soilUnit: '18',
    soilPhi: '30',
    soilCohesion: '5',
    surcharge: '10',
    facingType: 'shotcrete',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'cutHeight', label: 'Cut Height' },
      { key: 'wallAngle', label: 'Wall Angle' },
      { key: 'nailSpacingH', label: 'Nail Spacing H' },
      { key: 'nailSpacingV', label: 'Nail Spacing V' },
      { key: 'nailLength', label: 'Nail Length' },
      { key: 'nailDiameter', label: 'Nail Diameter' },
      { key: 'nailInclination', label: 'Nail Inclination', allowZero: true },
      { key: 'drillHoleDia', label: 'Drill Hole Dia' },
      { key: 'groutStrength', label: 'Grout Strength' },
      { key: 'soilUnit', label: 'Soil Unit' },
      { key: 'soilPhi', label: 'Soil Phi' },
      { key: 'soilCohesion', label: 'Soil Cohesion' },
      { key: 'surcharge', label: 'Surcharge' },
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
    { key: 'cutHeight', label: 'Cut Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'wallAngle', label: 'Wall Angle', min: 0, max: 100, step: 1, unit: '' },
    { key: 'nailSpacingH', label: 'Nail Spacing H', min: 0, max: 100, step: 1, unit: '' },
    { key: 'nailSpacingV', label: 'Nail Spacing V', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const H = parseFloat(form.cutHeight);
      const beta = (parseFloat(form.wallAngle) * Math.PI) / 180;
      const sh = parseFloat(form.nailSpacingH);
      const sv = parseFloat(form.nailSpacingV);
      const Ln = parseFloat(form.nailLength);
      const dn = parseFloat(form.nailDiameter);
      const alpha = (parseFloat(form.nailInclination) * Math.PI) / 180;
      const Dh = parseFloat(form.drillHoleDia);
      const fcu_grout = parseFloat(form.groutStrength);
      const fyk = parseFloat(form.steelGrade);
      const gamma = parseFloat(form.soilUnit);
      const phi_deg = parseFloat(form.soilPhi);
      const c = parseFloat(form.soilCohesion);
      const q = parseFloat(form.surcharge);

      if (H <= 0 || Ln <= 0 || sh <= 0 || sv <= 0) {
        w.push({ type: 'error', message: 'Invalid inputs' });
        setWarnings(w);
        return;
      }

      const phi = (phi_deg * Math.PI) / 180;

      // Nail tensile capacity
      const As = (Math.PI * dn * dn) / 4;
      const nailTensileCapacity = (As * fyk) / 1.15 / 1000; // kN

      // Grout-nail bond
      const tau_grout = 0.5 * Math.sqrt(fcu_grout); // MPa simplified
      const groutPullout = (tau_grout * Math.PI * dn * Ln * 1000) / 1000; // kN

      // Soil-grout pullout capacity (along bond length)
      // Using alpha method: qs = alpha * sigma_v' where alpha depends on soil type
      const avgDepth = H / 2;
      const sigma_v = gamma * avgDepth + q;
      const mu = Math.tan(phi);
      const qs = mu * sigma_v; // kPa — soil-grout interface shear
      const soilPullout = ((qs * Math.PI * Dh) / 1000) * Ln; // kN

      const nailCapacity = Math.min(nailTensileCapacity, groutPullout, soilPullout);

      // Required nail force per nail (active wedge)
      const Ka = Math.tan(Math.PI / 4 - phi / 2) ** 2;
      const activeForce_per_m2 = Ka * (gamma * H + q);
      const tributaryArea = sh * sv;
      const requiredCapacity = activeForce_per_m2 * tributaryArea;

      const tensileUtil = requiredCapacity / nailTensileCapacity;
      const pulloutUtil = requiredCapacity / Math.min(groutPullout, soilPullout);

      // Simplified global stability (FOS)
      const nRows = Math.floor(H / sv);
      const totalNailResistance = (nRows * nailCapacity) / sh; // kN/m run
      const drivingForce = 0.5 * Ka * gamma * H * H + Ka * q * H;
      const globalFOS = totalNailResistance / Math.max(drivingForce, 0.01);
      const internalFOS = nailCapacity / Math.max(requiredCapacity, 0.01);

      const nailDensity = 1 / (sh * sv); // nails per m²

      if (Ln / H < 0.7)
        w.push({
          type: 'warning',
          message: `Nail length ratio L/H = ${(Ln / H).toFixed(2)} — CIRIA C637 recommends ≥ 0.7`,
        });
      if (globalFOS < 1.5)
        w.push({ type: 'warning', message: `Global FOS = ${globalFOS.toFixed(2)} < 1.5` });
      if (nailDensity > 1.5)
        w.push({ type: 'info', message: `High nail density: ${nailDensity.toFixed(1)} nails/m²` });

      const overallStatus =
        tensileUtil <= 1.0 && pulloutUtil <= 1.0 && globalFOS >= 1.5 ? 'PASS' : 'FAIL';

      setResults({
        nailTensileCapacity,
        groutPullout,
        soilPullout,
        nailCapacity,
        requiredCapacity,
        tensileUtil,
        pulloutUtil,
        globalFOS,
        internalFOS,
        nailDensity,
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
    if (results.globalFOS < 1.5)
      recs.push({
        check: 'Global Stability',
        suggestion: 'Increase nail length, reduce spacing, or add facing',
      });
    if (results.pulloutUtil > 0.85)
      recs.push({ check: 'Pullout', suggestion: 'Increase nail length or drill hole diameter' });
    if (parseFloat(form.nailLength) / parseFloat(form.cutHeight) < 0.7)
      recs.push({ check: 'L/H Ratio', suggestion: 'CIRIA C637 recommends L/H ≥ 0.7' });
    generatePremiumPDF({
      title: 'Soil Nail Wall Design',
      subtitle: 'BS EN 14490 / CIRIA C637',
      projectInfo: [
        { label: 'Calculator', value: 'Soil Nail' },
        { label: 'Code', value: 'BS EN 14490' },
      ],
      inputs: [
        { label: 'Cut Height', value: form.cutHeight, unit: 'm' },
        { label: 'Nail Length', value: form.nailLength, unit: 'm' },
        { label: 'Bar Ø', value: form.nailDiameter, unit: 'mm' },
        { label: 'Spacing', value: `${form.nailSpacingH}×${form.nailSpacingV}`, unit: 'm' },
        { label: 'Soil φ', value: form.soilPhi, unit: '°' },
        { label: 'Surcharge', value: form.surcharge, unit: 'kPa' },
      ],
      checks: [
        {
          name: 'Tensile',
          capacity: `${results.nailTensileCapacity.toFixed(0)} kN`,
          utilisation: `${(results.tensileUtil * 100).toFixed(0)}%`,
          status: results.tensileUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Pullout',
          capacity: `${results.soilPullout.toFixed(0)} kN`,
          utilisation: `${(results.pulloutUtil * 100).toFixed(0)}%`,
          status: results.pulloutUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Global FOS',
          capacity: '≥ 1.50',
          utilisation: results.globalFOS.toFixed(2),
          status: results.globalFOS >= 1.5 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Capacity Breakdown',
          head: [['Component', 'Value']],
          body: [
            ['Nail Tensile', `${results.nailTensileCapacity.toFixed(0)} kN`],
            ['Grout Pullout', `${results.groutPullout.toFixed(0)} kN`],
            ['Soil Pullout', `${results.soilPullout.toFixed(0)} kN`],
            ['Required', `${results.requiredCapacity.toFixed(0)} kN`],
            ['Nail Density', `${results.nailDensity.toFixed(1)} /m²`],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Soil Nail Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.globalFOS < 1.5)
      recs.push({
        check: 'Global Stability',
        suggestion: 'Increase nail length, reduce spacing, or add facing',
      });
    if (results.pulloutUtil > 0.85)
      recs.push({ check: 'Pullout', suggestion: 'Increase nail length or drill hole diameter' });
    if (parseFloat(form.nailLength) / parseFloat(form.cutHeight) < 0.7)
      recs.push({ check: 'L/H Ratio', suggestion: 'CIRIA C637 recommends L/H ≥ 0.7' });
    generateDOCX({
      title: 'Soil Nail Wall Design',
      subtitle: 'BS EN 14490 / CIRIA C637',
      projectInfo: [
        { label: 'Calculator', value: 'Soil Nail' },
        { label: 'Code', value: 'BS EN 14490' },
      ],
      inputs: [
        { label: 'Cut Height', value: form.cutHeight, unit: 'm' },
        { label: 'Nail Length', value: form.nailLength, unit: 'm' },
        { label: 'Bar Ø', value: form.nailDiameter, unit: 'mm' },
        { label: 'Spacing', value: `${form.nailSpacingH}×${form.nailSpacingV}`, unit: 'm' },
        { label: 'Soil φ', value: form.soilPhi, unit: '°' },
        { label: 'Surcharge', value: form.surcharge, unit: 'kPa' },
      ],
      checks: [
        {
          name: 'Tensile',
          capacity: `${results.nailTensileCapacity.toFixed(0)} kN`,
          utilisation: `${(results.tensileUtil * 100).toFixed(0)}%`,
          status: results.tensileUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Pullout',
          capacity: `${results.soilPullout.toFixed(0)} kN`,
          utilisation: `${(results.pulloutUtil * 100).toFixed(0)}%`,
          status: results.pulloutUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Global FOS',
          capacity: '≥ 1.50',
          utilisation: results.globalFOS.toFixed(2),
          status: results.globalFOS >= 1.5 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Capacity Breakdown',
          head: [['Component', 'Value']],
          body: [
            ['Nail Tensile', `${results.nailTensileCapacity.toFixed(0)} kN`],
            ['Grout Pullout', `${results.groutPullout.toFixed(0)} kN`],
            ['Soil Pullout', `${results.soilPullout.toFixed(0)} kN`],
            ['Required', `${results.requiredCapacity.toFixed(0)} kN`],
            ['Nail Density', `${results.nailDensity.toFixed(1)} /m²`],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Soil Nail Design',
    });
  };

  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 via-transparent to-neon-purple/10" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4 bg-gray-900/40">
            <span className="text-neon-cyan font-mono tracking-wider">GEOTECH | SOIL NAIL</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">
            Soil Nail Wall
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Soil nail wall design with tensile, pullout, and global stability checks to BS EN 14490
            and CIRIA C637.
          </p>
        </motion.div>

        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 max-w-fit mx-auto">
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
              {tab === 'input' ? '🔨 Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
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
                  {results.overallStatus === 'PASS' ? 'Wall Adequate' : 'Wall Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  Global FOS: {results.globalFOS.toFixed(2)} | Nail capacity:{' '}
                  {results.nailCapacity.toFixed(0)} kN
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
                calculatorKey="soil-nail"
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
                    onClick={() => toggleSection('wall')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Wall Geometry</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.wall && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.wall && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="Cut Height"
                          value={form.cutHeight}
                          onChange={(v) => setForm((f) => ({ ...f, cutHeight: v }))}
                          unit="m"
                        />
                        <InputField
                          label="Wall Angle"
                          value={form.wallAngle}
                          onChange={(v) => setForm((f) => ({ ...f, wallAngle: v }))}
                          unit="°"
                        />
                        <InputField
                          label="Surcharge"
                          value={form.surcharge}
                          onChange={(v) => setForm((f) => ({ ...f, surcharge: v }))}
                          unit="kPa"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('nail')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">
                        Nail Properties
                      </CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.nail && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.nail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Spacing H"
                            value={form.nailSpacingH}
                            onChange={(v) => setForm((f) => ({ ...f, nailSpacingH: v }))}
                            unit="m"
                          />
                          <InputField
                            label="Spacing V"
                            value={form.nailSpacingV}
                            onChange={(v) => setForm((f) => ({ ...f, nailSpacingV: v }))}
                            unit="m"
                          />
                        </div>
                        <InputField
                          label="Nail Length"
                          value={form.nailLength}
                          onChange={(v) => setForm((f) => ({ ...f, nailLength: v }))}
                          unit="m"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Bar Ø"
                            value={form.nailDiameter}
                            onChange={(v) => setForm((f) => ({ ...f, nailDiameter: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Drill Ø"
                            value={form.drillHoleDia}
                            onChange={(v) => setForm((f) => ({ ...f, drillHoleDia: v }))}
                            unit="mm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Inclination"
                            value={form.nailInclination}
                            onChange={(v) => setForm((f) => ({ ...f, nailInclination: v }))}
                            unit="°"
                          />
                          <InputField
                            label="Steel fyk"
                            value={form.steelGrade}
                            onChange={(v) => setForm((f) => ({ ...f, steelGrade: v }))}
                            unit="MPa"
                          />
                        </div>
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
                    onClick={() => toggleSection('soil')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">
                        Soil Parameters
                      </CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.soil && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.soil && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="γ (unit wt)"
                          value={form.soilUnit}
                          onChange={(v) => setForm((f) => ({ ...f, soilUnit: v }))}
                          unit="kN/m³"
                        />
                        <InputField
                          label="φ (friction)"
                          value={form.soilPhi}
                          onChange={(v) => setForm((f) => ({ ...f, soilPhi: v }))}
                          unit="°"
                        />
                        <InputField
                          label="c (cohesion)"
                          value={form.soilCohesion}
                          onChange={(v) => setForm((f) => ({ ...f, soilCohesion: v }))}
                          unit="kPa"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-2xl shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>
              <div className="lg:col-span-2 space-y-6 sticky top-8">
                <WhatIfPreview
                  title="Soil Nail — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 5, 8]}>
                      <SoilNail3D />
                    </Interactive3DDiagram>
                  )}
                />
                {results && (
                  <div className="grid grid-cols-3 gap-4">
                    <ResultCard
                      label="Tensile"
                      value={`${(results.tensileUtil * 100).toFixed(0)}%`}
                      limit={`${results.nailTensileCapacity.toFixed(0)} kN`}
                      status={results.tensileUtil <= 1 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Pullout"
                      value={`${(results.pulloutUtil * 100).toFixed(0)}%`}
                      limit={`${results.soilPullout.toFixed(0)} kN`}
                      status={results.pulloutUtil <= 1 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Global FOS"
                      value={results.globalFOS.toFixed(2)}
                      limit="≥ 1.50"
                      status={results.globalFOS >= 1.5 ? 'pass' : 'fail'}
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
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {[
                      ['Tensile Cap', `${results.nailTensileCapacity.toFixed(0)} kN`],
                      ['Grout Pullout', `${results.groutPullout.toFixed(0)} kN`],
                      ['Soil Pullout', `${results.soilPullout.toFixed(0)} kN`],
                      ['Nail Cap', `${results.nailCapacity.toFixed(0)} kN`],
                      ['Required', `${results.requiredCapacity.toFixed(0)} kN`],
                      ['Global FOS', results.globalFOS.toFixed(2)],
                      ['Internal FOS', results.internalFOS.toFixed(2)],
                      ['Density', `${results.nailDensity.toFixed(1)} /m²`],
                    ].map(([l, v], i) => (
                      <div key={i} className="bg-black/30 rounded-lg p-3">
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                    <FiCheck className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <h3 className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest">
                    Design Recommendations
                  </h3>
                </div>
                <div className="space-y-2">
                  {results.globalFOS < 1.5 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <FiAlertTriangle className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Low Global FOS</div>
                        <div className="text-xs text-gray-400">
                          Increase nail length, reduce spacing, or add facing reinforcement
                        </div>
                      </div>
                    </div>
                  )}
                  {results.pulloutUtil > 0.85 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">
                          High Pullout Utilisation
                        </div>
                        <div className="text-xs text-gray-400">
                          Increase nail length or drill hole diameter
                        </div>
                      </div>
                    </div>
                  )}
                  {parseFloat(form.nailLength) / parseFloat(form.cutHeight) < 0.7 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Short L/H Ratio</div>
                        <div className="text-xs text-gray-400">CIRIA C637 recommends L/H ≥ 0.7</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <FiCheck className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white">Overall</div>
                      <div className="text-xs text-gray-400">
                        {results.overallStatus === 'PASS'
                          ? 'Soil nail wall is adequate for design conditions'
                          : 'Wall FAILS — redesign required'}
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
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-b from-gray-900 to-black p-4">
                  <Interactive3DDiagram height="500px" cameraPosition={[10, 7, 10]}>
                    <SoilNail3D />
                  </Interactive3DDiagram>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ FULLSCREEN 3D OVERLAY ═══ */}
      <AnimatePresence>
        {previewMaximized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
          >
            {/* Left: 3D Scene */}
            <div className="flex-1 relative">
              <Interactive3DDiagram height="h-full" cameraPosition={[8, 5, 8]}>
                <SoilNail3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700/50 transition-all z-10"
                title="Exit fullscreen"
              >
                <FiMinimize2 size={16} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                Soil Nail — 3D Preview
              </div>
            </div>

            {/* Right: Side Panel */}
            <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
              {/* Live Parameters */}
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <FiSliders className="text-cyan-400" size={14} />
                  Live Parameters
                </h3>
                <div className="space-y-3">
                  {whatIfSliders.map((s) => (
                    <div key={s.key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">{s.label}</span>
                        <span className="text-white font-mono">
                          {form[s.key as keyof FormData]} {s.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={parseFloat(String(form[s.key as keyof FormData])) || s.min}
                        onChange={(e) => updateForm(s.key as keyof FormData, e.target.value)}
                        title={s.label}
                        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Readout */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <FiActivity className="text-cyan-400" size={14} />
                  Live Readout
                </h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Cut Height', value: `${form.cutHeight} m` },
                    { label: 'Nail Length', value: `${form.nailLength} m` },
                    { label: 'H Spacing', value: `${form.nailSpacingH} m` },
                    { label: 'V Spacing', value: `${form.nailSpacingV} m` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-white font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Analysis */}
              {results && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <FiInfo className="text-cyan-400" size={14} />
                    Last Analysis
                  </h3>
                  <div
                    className={cn(
                      'p-3 rounded-lg text-center mb-3',
                      results.overallStatus === 'PASS'
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'bg-red-500/10 border border-red-500/30',
                    )}
                  >
                    <div
                      className={cn(
                        'text-2xl font-black',
                        results.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {results.overallStatus}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      {
                        label: 'Tensile Util',
                        value: `${(results.tensileUtil * 100).toFixed(0)}%`,
                      },
                      {
                        label: 'Pullout Util',
                        value: `${(results.pulloutUtil * 100).toFixed(0)}%`,
                      },
                      { label: 'Global FOS', value: results.globalFOS.toFixed(2) },
                      { label: 'Internal FOS', value: results.internalFOS.toFixed(2) },
                      { label: 'Nail Density', value: `${results.nailDensity.toFixed(1)} /m²` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="text-white font-mono">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Fullscreen */}
              <button
                onClick={() => setPreviewMaximized(false)}
                className="w-full mt-4 px-4 py-3 rounded-xl bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 transition-all text-sm font-medium"
              >
                Close Fullscreen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <div className="text-sm font-semibold text-gray-200 mb-1">
      <ExplainableLabel
        label={`${label}${unit ? ` (${unit})` : ''}`}
        field={field || 'soil-nail'}
      />
    </div>
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
      'p-4 text-center border shadow-lg',
      status === 'pass'
        ? 'border-l-4 border-l-green-500 border-green-500/30 bg-green-950/20 shadow-green-500/5'
        : 'border-l-4 border-l-red-500 border-red-500/30 bg-red-950/20 shadow-red-500/5',
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

export default SoilNail;
