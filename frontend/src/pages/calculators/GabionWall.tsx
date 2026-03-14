// =============================================================================
// BeaverCalc Studio — Gabion Wall Calculator
// Gabion basket retaining wall stability to BS EN 1997-1
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
  FiShield,
  FiSliders,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import GabionWall3D from '../../components/3d/scenes/GabionWall3D';
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
  wallHeight: string;
  numberOfCourses: string;
  baseWidth: string;
  topWidth: string;
  gabionHeight: string;
  gabionLength: string;
  batter: string;
  meshType: string;
  wireDiameter: string;
  stoneDensity: string;
  porosity: string;
  stoneSize: string;
  soilPhi: string;
  soilGamma: string;
  surcharge: string;
  bearingCapacity: string;
  frictionCoeff: string;
}

interface Results {
  wallWeight: number;
  Ka: number;
  activeForce: number;
  surchargeForce: number;
  fosSliding: number;
  fosOverturning: number;
  fosBearing: number;
  qMax: number;
  qMin: number;
  eccentricity: number;
  overrideRatio: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  low_wall: {
    name: 'Low Gabion (2 m)',
    form: {
      wallHeight: '2.0',
      numberOfCourses: '2',
      baseWidth: '1.5',
      topWidth: '1.0',
      gabionHeight: '1000',
      soilPhi: '30',
      soilGamma: '18',
      surcharge: '5',
    },
  },
  standard_wall: {
    name: 'Standard (3 m)',
    form: {
      wallHeight: '3.0',
      numberOfCourses: '3',
      baseWidth: '2.0',
      topWidth: '1.0',
      gabionHeight: '1000',
      soilPhi: '30',
      soilGamma: '18',
      surcharge: '10',
    },
  },
  tall_wall: {
    name: 'Tall Gabion (5 m)',
    form: {
      wallHeight: '5.0',
      numberOfCourses: '5',
      baseWidth: '3.0',
      topWidth: '1.0',
      gabionHeight: '1000',
      soilPhi: '28',
      soilGamma: '19',
      surcharge: '15',
    },
  },
};

const GabionWall = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    fill: true,
    soil: false,
  });
  const [form, setForm] = useState<FormData>({
    wallHeight: '3.0',
    numberOfCourses: '3',
    baseWidth: '2.0',
    topWidth: '1.0',
    gabionHeight: '1000',
    gabionLength: '2000',
    batter: '5',
    meshType: 'welded',
    wireDiameter: '4.0',
    stoneDensity: '2600',
    porosity: '0.35',
    stoneSize: '100-200',
    soilPhi: '30',
    soilGamma: '18',
    surcharge: '10',
    bearingCapacity: '100',
    frictionCoeff: '0.5',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'wallHeight', label: 'Wall Height' },
      { key: 'numberOfCourses', label: 'Number Of Courses' },
      { key: 'baseWidth', label: 'Base Width' },
      { key: 'topWidth', label: 'Top Width' },
      { key: 'gabionHeight', label: 'Gabion Height' },
      { key: 'gabionLength', label: 'Gabion Length' },
      { key: 'batter', label: 'Batter' },
      { key: 'wireDiameter', label: 'Wire Diameter' },
      { key: 'stoneDensity', label: 'Stone Density' },
      { key: 'porosity', label: 'Porosity' },
      { key: 'soilPhi', label: 'Soil Phi' },
      { key: 'soilGamma', label: 'Soil Gamma' },
      { key: 'surcharge', label: 'Surcharge' },
      { key: 'bearingCapacity', label: 'Bearing Capacity' },
      { key: 'frictionCoeff', label: 'Friction Coeff' },
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
    { key: 'wallHeight', label: 'Wall Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'numberOfCourses', label: 'Number Of Courses', min: 0, max: 100, step: 1, unit: '' },
    { key: 'baseWidth', label: 'Base Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'topWidth', label: 'Top Width', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const H = parseFloat(form.wallHeight);
      const nCourses = parseInt(form.numberOfCourses);
      const wBase = parseFloat(form.baseWidth);
      const wTop = parseFloat(form.topWidth);
      const phi = (parseFloat(form.soilPhi) * Math.PI) / 180;
      const gammaS = parseFloat(form.soilGamma);
      const q = parseFloat(form.surcharge);
      const qBearing = parseFloat(form.bearingCapacity);
      const mu = parseFloat(form.frictionCoeff);
      const rhoStone = parseFloat(form.stoneDensity);
      const porosity = parseFloat(form.porosity);

      if (H <= 0 || nCourses <= 0 || wBase <= 0) {
        w.push({ type: 'error', message: 'Invalid geometry' });
        setWarnings(w);
        return;
      }

      // Gabion unit weight
      const gammaGabion = (rhoStone * (1 - porosity) * 9.81) / 1000; // kN/m³

      // Wall area (trapezoidal)
      const A = 0.5 * (wBase + wTop) * H;
      const wallWeight = A * gammaGabion;

      // Centroid from toe
      const xBar = (wBase * wBase + wBase * wTop + wTop * wTop) / (3 * (wBase + wTop));

      // Active earth pressure
      const Ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
      const activeForce = 0.5 * Ka * gammaS * H * H;
      const surchargeForce = Ka * q * H;

      // Resisting / overturning
      const resistingMoment = wallWeight * xBar;
      const overturningMoment = (activeForce * H) / 3 + (surchargeForce * H) / 2;

      const fosSliding = (wallWeight * mu) / (activeForce + surchargeForce);
      const fosOverturning = resistingMoment / overturningMoment;

      // Bearing pressure
      const Mnet = resistingMoment - overturningMoment;
      const xR = Mnet / wallWeight;
      const eccentricity = wBase / 2 - xR;
      let qMax: number, qMin: number;
      if (Math.abs(eccentricity) <= wBase / 6) {
        qMax = (wallWeight / wBase) * (1 + (6 * eccentricity) / wBase);
        qMin = (wallWeight / wBase) * (1 - (6 * eccentricity) / wBase);
      } else {
        qMax = (2 * wallWeight) / (3 * xR);
        qMin = 0;
        w.push({ type: 'warning', message: 'Resultant outside middle third' });
      }
      const fosBearing = qBearing / qMax;

      // Inter-course sliding check
      const overrideRatio = fosSliding; // simplified — same friction interface

      if (fosSliding < 1.5)
        w.push({ type: 'warning', message: `Sliding FOS ${fosSliding.toFixed(2)} below 1.5` });
      if (fosOverturning < 2.0)
        w.push({
          type: 'warning',
          message: `Overturning FOS ${fosOverturning.toFixed(2)} below 2.0`,
        });
      if (H > 5)
        w.push({
          type: 'info',
          message: 'Gabion walls above 5m may need geotechnical specialist review',
        });

      const overallStatus =
        fosSliding >= 1.5 && fosOverturning >= 2.0 && fosBearing >= 2.0 ? 'PASS' : 'FAIL';

      setResults({
        wallWeight,
        Ka,
        activeForce,
        surchargeForce,
        fosSliding,
        fosOverturning,
        fosBearing,
        qMax,
        qMin,
        eccentricity,
        overrideRatio,
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
    if (results.fosSliding < 1.5)
      recs.push({ check: 'Sliding', suggestion: 'Increase base width or add shear key' });
    if (results.fosOverturning < 2.0)
      recs.push({ check: 'Overturning', suggestion: 'Widen base or step courses back further' });
    if (results.eccentricity > parseFloat(form.baseWidth) / 6)
      recs.push({ check: 'Eccentricity', suggestion: 'Resultant outside middle third' });
    generatePremiumPDF({
      title: 'Gabion Wall Design',
      subtitle: 'BS EN 1997-1 Stability',
      projectInfo: [
        { label: 'Calculator', value: 'Gabion Wall' },
        { label: 'Code', value: 'BS EN 1997-1' },
      ],
      inputs: [
        { label: 'Wall Height', value: form.wallHeight, unit: 'm' },
        { label: 'Base Width', value: form.baseWidth, unit: 'm' },
        { label: 'Top Width', value: form.topWidth, unit: 'm' },
        { label: 'Courses', value: form.numberOfCourses },
        { label: 'Soil φ', value: form.soilPhi, unit: '°' },
        { label: 'Surcharge', value: form.surcharge, unit: 'kPa' },
      ],
      checks: [
        {
          name: 'Sliding',
          capacity: results.fosSliding.toFixed(2),
          utilisation: `FOS ≥ 1.5`,
          status: results.fosSliding >= 1.5 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Overturning',
          capacity: results.fosOverturning.toFixed(2),
          utilisation: `FOS ≥ 2.0`,
          status: results.fosOverturning >= 2.0 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Bearing',
          capacity: results.fosBearing.toFixed(2),
          utilisation: `FOS ≥ 2.0`,
          status: results.fosBearing >= 2.0 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Force Summary',
          head: [['Parameter', 'Value']],
          body: [
            ['Wall Weight', `${results.wallWeight.toFixed(1)} kN/m`],
            ['Active Force', `${results.activeForce.toFixed(1)} kN/m`],
            ['Surcharge Force', `${results.surchargeForce.toFixed(1)} kN/m`],
            ['qMax', `${results.qMax.toFixed(0)} kPa`],
            ['qMin', `${results.qMin.toFixed(0)} kPa`],
            ['Ka', results.Ka.toFixed(3)],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Gabion Wall',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.fosSliding < 1.5)
      recs.push({ check: 'Sliding', suggestion: 'Increase base width or add shear key' });
    if (results.fosOverturning < 2.0)
      recs.push({ check: 'Overturning', suggestion: 'Widen base or step courses back further' });
    if (results.eccentricity > parseFloat(form.baseWidth) / 6)
      recs.push({ check: 'Eccentricity', suggestion: 'Resultant outside middle third' });
    generateDOCX({
      title: 'Gabion Wall Design',
      subtitle: 'BS EN 1997-1 Stability',
      projectInfo: [
        { label: 'Calculator', value: 'Gabion Wall' },
        { label: 'Code', value: 'BS EN 1997-1' },
      ],
      inputs: [
        { label: 'Wall Height', value: form.wallHeight, unit: 'm' },
        { label: 'Base Width', value: form.baseWidth, unit: 'm' },
        { label: 'Top Width', value: form.topWidth, unit: 'm' },
        { label: 'Courses', value: form.numberOfCourses },
        { label: 'Soil φ', value: form.soilPhi, unit: '°' },
        { label: 'Surcharge', value: form.surcharge, unit: 'kPa' },
      ],
      checks: [
        {
          name: 'Sliding',
          capacity: results.fosSliding.toFixed(2),
          utilisation: `FOS ≥ 1.5`,
          status: results.fosSliding >= 1.5 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Overturning',
          capacity: results.fosOverturning.toFixed(2),
          utilisation: `FOS ≥ 2.0`,
          status: results.fosOverturning >= 2.0 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Bearing',
          capacity: results.fosBearing.toFixed(2),
          utilisation: `FOS ≥ 2.0`,
          status: results.fosBearing >= 2.0 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Force Summary',
          head: [['Parameter', 'Value']],
          body: [
            ['Wall Weight', `${results.wallWeight.toFixed(1)} kN/m`],
            ['Active Force', `${results.activeForce.toFixed(1)} kN/m`],
            ['Surcharge Force', `${results.surchargeForce.toFixed(1)} kN/m`],
            ['qMax', `${results.qMax.toFixed(0)} kPa`],
            ['qMin', `${results.qMin.toFixed(0)} kPa`],
            ['Ka', results.Ka.toFixed(3)],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Gabion Wall',
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
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-800/20 via-transparent to-purple-900/10" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4 bg-gray-950/20">
            <FiShield className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">RETAINING | GABION WALL</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">
            Gabion Wall Design
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Gabion basket retaining wall stability with sliding, overturning, and bearing checks to
            BS EN 1997-1.
          </p>
        </motion.div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl">
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
                {tab === 'input'
                  ? '🪨 Input'
                  : tab === 'results'
                    ? '📊 Results'
                    : '🎨 Visualization'}
              </Button>
            ))}
          </div>
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
                  {results.overallStatus === 'PASS' ? 'Wall Stable' : 'Wall Unstable'}
                </div>
                <div className="text-gray-400 text-sm">
                  W = {results.wallWeight.toFixed(1)} kN/m | Ka = {results.Ka.toFixed(3)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-neon-cyan to-neon-purple"
              >
                <FiDownload className="mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={exportDOCX}
                className="bg-gradient-to-r from-neon-cyan to-neon-purple"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton
                calculatorKey="gabion-wall"
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
                    onClick={() => toggleSection('geometry')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiShield className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Wall Geometry</CardTitle>
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
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="Wall Height"
                          value={form.wallHeight}
                          onChange={(v) => setForm((f) => ({ ...f, wallHeight: v }))}
                          unit="m"
                        />
                        <InputField
                          label="Courses"
                          value={form.numberOfCourses}
                          onChange={(v) => setForm((f) => ({ ...f, numberOfCourses: v }))}
                          unit=""
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Base Width"
                            value={form.baseWidth}
                            onChange={(v) => setForm((f) => ({ ...f, baseWidth: v }))}
                            unit="m"
                          />
                          <InputField
                            label="Top Width"
                            value={form.topWidth}
                            onChange={(v) => setForm((f) => ({ ...f, topWidth: v }))}
                            unit="m"
                          />
                        </div>
                        <InputField
                          label="Batter"
                          value={form.batter}
                          onChange={(v) => setForm((f) => ({ ...f, batter: v }))}
                          unit="°"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('fill')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Fill & Mesh</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.fill && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.fill && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="Stone Density"
                          value={form.stoneDensity}
                          onChange={(v) => setForm((f) => ({ ...f, stoneDensity: v }))}
                          unit="kg/m³"
                        />
                        <InputField
                          label="Porosity"
                          value={form.porosity}
                          onChange={(v) => setForm((f) => ({ ...f, porosity: v }))}
                          unit=""
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
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">
                        Soil & Foundation
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
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="φ'"
                            value={form.soilPhi}
                            onChange={(v) => setForm((f) => ({ ...f, soilPhi: v }))}
                            unit="°"
                          />
                          <InputField
                            label="γ"
                            value={form.soilGamma}
                            onChange={(v) => setForm((f) => ({ ...f, soilGamma: v }))}
                            unit="kN/m³"
                          />
                        </div>
                        <InputField
                          label="Surcharge"
                          value={form.surcharge}
                          onChange={(v) => setForm((f) => ({ ...f, surcharge: v }))}
                          unit="kPa"
                        />
                        <InputField
                          label="Bearing"
                          value={form.bearingCapacity}
                          onChange={(v) => setForm((f) => ({ ...f, bearingCapacity: v }))}
                          unit="kPa"
                        />
                        <InputField
                          label="Friction (μ)"
                          value={form.frictionCoeff}
                          onChange={(v) => setForm((f) => ({ ...f, frictionCoeff: v }))}
                          unit=""
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-2xl shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>
              <div className="lg:col-span-2 space-y-6 sticky top-8">
                <WhatIfPreview
                  title="Gabion Wall — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <GabionWall3D />
                    </Interactive3DDiagram>
                  )}
                />
                {results && (
                  <div className="grid grid-cols-3 gap-4">
                    <ResultCard
                      label="Sliding FOS"
                      value={results.fosSliding.toFixed(2)}
                      limit="≥ 1.5"
                      status={results.fosSliding >= 1.5 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Overturning FOS"
                      value={results.fosOverturning.toFixed(2)}
                      limit="≥ 2.0"
                      status={results.fosOverturning >= 2.0 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Bearing FOS"
                      value={results.fosBearing.toFixed(2)}
                      limit="≥ 2.0"
                      status={results.fosBearing >= 2.0 ? 'pass' : 'fail'}
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
                      ['Wall Weight', `${results.wallWeight.toFixed(1)} kN/m`],
                      ['Active Force', `${results.activeForce.toFixed(1)} kN/m`],
                      ['Surcharge Force', `${results.surchargeForce.toFixed(1)} kN/m`],
                      ['qMax', `${results.qMax.toFixed(0)} kPa`],
                      ['qMin', `${results.qMin.toFixed(0)} kPa`],
                      ['Eccentricity', `${(results.eccentricity * 1000).toFixed(0)} mm`],
                      ['Ka', results.Ka.toFixed(3)],
                    ].map(([l, v], i) => (
                      <div key={i} className="bg-black/30 rounded-lg p-3">
                        <div className="text-gray-500 text-xs uppercase mb-1">{l}</div>
                        <div className="text-white font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6 mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                    <FiCheck className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <h3 className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest">
                    Design Recommendations
                  </h3>
                </div>
                <div className="space-y-2">
                  {results.fosSliding < 1.5 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <FiAlertTriangle className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Sliding Failure</div>
                        <div className="text-xs text-gray-400">
                          Increase base width or add shear key at base
                        </div>
                      </div>
                    </div>
                  )}
                  {results.fosOverturning < 2.0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Overturning Concern</div>
                        <div className="text-xs text-gray-400">
                          Widen base or step gabion courses back further
                        </div>
                      </div>
                    </div>
                  )}
                  {results.eccentricity > parseFloat(form.baseWidth) / 6 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <FiInfo className="text-purple-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Eccentric Loading</div>
                        <div className="text-xs text-gray-400">
                          Resultant outside middle third — tension develops at heel
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
                          ? 'Gabion wall is stable under applied loading'
                          : 'Wall FAILS stability checks — redesign required'}
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
                  <Interactive3DDiagram height="500px" cameraPosition={[10, 8, 10]}>
                    <GabionWall3D />
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
              <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                <GabionWall3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700/50 transition-all z-10"
                title="Exit fullscreen"
              >
                <FiMinimize2 size={16} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                Gabion Wall — 3D Preview
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
                    { label: 'Wall Height', value: `${form.wallHeight} m` },
                    { label: 'Base Width', value: `${form.baseWidth} m` },
                    { label: 'Stone Density', value: `${form.stoneDensity} kN/m³` },
                    { label: 'Soil φ', value: `${form.soilPhi}°` },
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
                      { label: 'Sliding FOS', value: results.fosSliding.toFixed(2) },
                      { label: 'Overturning FOS', value: results.fosOverturning.toFixed(2) },
                      { label: 'Bearing FOS', value: results.fosBearing.toFixed(2) },
                      { label: 'Wall Weight', value: `${results.wallWeight.toFixed(1)} kN/m` },
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
        field={field || 'gabion-wall'}
      />
    </div>
    <input
      title={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono text-sm"
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
      'p-4 text-center shadow-2xl border-l-4',
      status === 'pass'
        ? 'border-l-green-500 border-green-500/30 bg-green-950/20'
        : 'border-l-red-500 border-red-500/30 bg-red-950/20',
    )}
  >
    <div className="text-xs uppercase text-gray-400 mb-1">{label}</div>
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

export default GabionWall;
