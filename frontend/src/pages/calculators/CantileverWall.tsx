// =============================================================================
// BeaverCalc Studio — RC Cantilever Retaining Wall Calculator
// BS EN 1997-1 & BS EN 1992-1-1
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
import CantileverWall3D from '../../components/3d/scenes/CantileverWall3D';
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
  stemThicknessTop: string;
  stemThicknessBase: string;
  baseWidth: string;
  baseToe: string;
  baseThickness: string;
  soilPhi: string;
  soilGamma: string;
  soilDelta: string;
  surcharge: string;
  waterLevel: string;
  bearingCapacity: string;
  frictionCoeff: string;
  concreteGrade: string;
  steelGrade: string;
  coverStem: string;
  coverBase: string;
}

interface Results {
  Ka: number;
  Kp: number;
  activeForce: number;
  surchargeForce: number;
  passiveForce: number;
  wallWeight: number;
  soilOnHeel: number;
  totalVertical: number;
  fosSliding: number;
  fosOverturning: number;
  fosBearing: number;
  qMax: number;
  qMin: number;
  eccentricity: number;
  stemMoment: number;
  stemShear: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  low_wall: {
    name: 'Low Wall (2.5 m)',
    form: {
      wallHeight: '2.5',
      stemThicknessTop: '250',
      stemThicknessBase: '400',
      baseWidth: '2.0',
      baseToe: '0.5',
      baseThickness: '400',
      soilPhi: '30',
      soilGamma: '18',
      surcharge: '10',
    },
  },
  medium_wall: {
    name: 'Medium Wall (4 m)',
    form: {
      wallHeight: '4.0',
      stemThicknessTop: '300',
      stemThicknessBase: '500',
      baseWidth: '3.0',
      baseToe: '0.6',
      baseThickness: '500',
      soilPhi: '30',
      soilGamma: '18',
      surcharge: '10',
    },
  },
  high_wall: {
    name: 'High Wall (6 m)',
    form: {
      wallHeight: '6.0',
      stemThicknessTop: '350',
      stemThicknessBase: '700',
      baseWidth: '4.5',
      baseToe: '0.8',
      baseThickness: '600',
      soilPhi: '28',
      soilGamma: '19',
      surcharge: '15',
    },
  },
};

const CantileverWall = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    soil: true,
    foundation: false,
    reinforcement: false,
  });
  const [form, setForm] = useState<FormData>({
    wallHeight: '4.0',
    stemThicknessTop: '300',
    stemThicknessBase: '500',
    baseWidth: '3.0',
    baseToe: '0.6',
    baseThickness: '500',
    soilPhi: '30',
    soilGamma: '18',
    soilDelta: '20',
    surcharge: '10',
    waterLevel: '0',
    bearingCapacity: '150',
    frictionCoeff: '0.5',
    concreteGrade: '30',
    steelGrade: '500',
    coverStem: '40',
    coverBase: '50',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'wallHeight', label: 'Wall Height' },
      { key: 'stemThicknessTop', label: 'Stem Thickness Top' },
      { key: 'stemThicknessBase', label: 'Stem Thickness Base' },
      { key: 'baseWidth', label: 'Base Width' },
      { key: 'baseToe', label: 'Base Toe' },
      { key: 'baseThickness', label: 'Base Thickness' },
      { key: 'soilPhi', label: 'Soil Phi' },
      { key: 'soilGamma', label: 'Soil Gamma' },
      { key: 'soilDelta', label: 'Soil Delta' },
      { key: 'surcharge', label: 'Surcharge' },
      { key: 'waterLevel', label: 'Water Level' },
      { key: 'bearingCapacity', label: 'Bearing Capacity' },
      { key: 'frictionCoeff', label: 'Friction Coeff' },
      { key: 'coverStem', label: 'Cover Stem' },
      { key: 'coverBase', label: 'Cover Base' },
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
    { key: 'stemThicknessTop', label: 'Stem Thickness Top', min: 0, max: 100, step: 1, unit: '' },
    { key: 'stemThicknessBase', label: 'Stem Thickness Base', min: 0, max: 100, step: 1, unit: '' },
    { key: 'baseWidth', label: 'Base Width', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const H = parseFloat(form.wallHeight);
      const tTop = parseFloat(form.stemThicknessTop) / 1000;
      const tBase = parseFloat(form.stemThicknessBase) / 1000;
      const B = parseFloat(form.baseWidth);
      const toe = parseFloat(form.baseToe);
      const tb = parseFloat(form.baseThickness) / 1000;
      const phi = (parseFloat(form.soilPhi) * Math.PI) / 180;
      const gamma = parseFloat(form.soilGamma);
      const q = parseFloat(form.surcharge);
      const qBearing = parseFloat(form.bearingCapacity);
      const mu = parseFloat(form.frictionCoeff);
      const gammaCon = 25; // kN/m³

      if (H <= 0 || B <= 0 || tb <= 0) {
        w.push({ type: 'error', message: 'Invalid geometry' });
        setWarnings(w);
        return;
      }

      const Htotal = H + tb;
      const heel = B - toe - (tTop + tBase) / 2;

      // Active/passive earth pressure coefficients
      const Ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
      const Kp = (1 + Math.sin(phi)) / (1 - Math.sin(phi));

      // Forces
      const activeForce = 0.5 * Ka * gamma * Htotal * Htotal;
      const surchargeForce = Ka * q * Htotal;
      const passiveForce = 0.5 * Kp * gamma * tb * tb; // passive at toe

      // Vertical loads
      const stemVol = ((tTop + tBase) / 2) * H;
      const baseVol = B * tb;
      const wallWeight = (stemVol + baseVol) * gammaCon;
      const soilOnHeel = heel * H * gamma + heel * q;
      const totalVertical = wallWeight + soilOnHeel;

      // Moments about toe
      const xStem = toe + (tTop + tBase) / 2 / 2;
      const xBase = B / 2;
      const xSoilHeel = toe + (tTop + tBase) / 2 + heel / 2;

      const resistingMoment =
        stemVol * gammaCon * xStem +
        baseVol * gammaCon * xBase +
        soilOnHeel * xSoilHeel +
        (passiveForce * tb) / 3;
      const overturningMoment = (activeForce * Htotal) / 3 + (surchargeForce * Htotal) / 2;

      const fosSliding = (totalVertical * mu + passiveForce) / (activeForce + surchargeForce);
      const fosOverturning = resistingMoment / overturningMoment;

      // Bearing pressure
      const Mnet = resistingMoment - overturningMoment;
      const xR = Mnet / totalVertical;
      const eccentricity = B / 2 - xR;
      let qMax: number, qMin: number;
      if (Math.abs(eccentricity) <= B / 6) {
        qMax = (totalVertical / B) * (1 + (6 * eccentricity) / B);
        qMin = (totalVertical / B) * (1 - (6 * eccentricity) / B);
      } else {
        qMax = (2 * totalVertical) / (3 * xR);
        qMin = 0;
        w.push({ type: 'warning', message: 'Resultant outside middle third' });
      }
      const fosBearing = qBearing / qMax;

      // Stem design moments
      const stemMoment = (0.5 * Ka * gamma * H * H * H) / 3 + (Ka * q * H * H) / 2;
      const stemShear = 0.5 * Ka * gamma * H * H + Ka * q * H;

      if (fosSliding < 1.5)
        w.push({ type: 'warning', message: `Sliding FOS ${fosSliding.toFixed(2)} below 1.5` });
      if (fosOverturning < 2.0)
        w.push({
          type: 'warning',
          message: `Overturning FOS ${fosOverturning.toFixed(2)} below 2.0`,
        });
      if (fosBearing < 3.0)
        w.push({ type: 'warning', message: `Bearing FOS ${fosBearing.toFixed(2)} below 3.0` });
      if (heel < 0.4 * B)
        w.push({ type: 'info', message: 'Consider increasing heel length for economy' });

      const overallStatus =
        fosSliding >= 1.5 && fosOverturning >= 2.0 && fosBearing >= 2.0 ? 'PASS' : 'FAIL';

      setResults({
        Ka,
        Kp,
        activeForce,
        surchargeForce,
        passiveForce,
        wallWeight,
        soilOnHeel,
        totalVertical,
        fosSliding,
        fosOverturning,
        fosBearing,
        qMax,
        qMin,
        eccentricity,
        stemMoment,
        stemShear,
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
    if (results.fosSliding < 2.0)
      recs.push({ check: 'Sliding FOS', suggestion: 'Consider adding a shear key at the base' });
    if (results.fosOverturning < 2.5)
      recs.push({
        check: 'Overturning FOS',
        suggestion: 'Increase base width or heel to improve overturning stability',
      });
    if (results.qMin <= 0)
      recs.push({
        check: 'Bearing Pressure',
        suggestion: 'Resultant outside middle third — widen base',
      });
    generatePremiumPDF({
      title: 'RC Cantilever Wall',
      subtitle: 'BS EN 1997-1 Stability Check',
      projectInfo: [
        { label: 'Calculator', value: 'Cantilever Wall' },
        { label: 'Code', value: 'BS EN 1997-1 / 1992-1-1' },
      ],
      inputs: [
        { label: 'Wall Height', value: `${form.wallHeight} m` },
        { label: 'Base Width', value: `${form.baseWidth} m` },
        { label: "Soil φ'", value: `${form.soilPhi}°` },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
      ],
      checks: [
        {
          name: 'Sliding',
          capacity: `FOS ${results.fosSliding.toFixed(2)}`,
          utilisation: `≥ 1.5`,
          status: results.fosSliding >= 1.5 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Overturning',
          capacity: `FOS ${results.fosOverturning.toFixed(2)}`,
          utilisation: `≥ 2.0`,
          status: results.fosOverturning >= 2.0 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Bearing',
          capacity: `FOS ${results.fosBearing.toFixed(2)}`,
          utilisation: `≥ 2.0`,
          status: results.fosBearing >= 2.0 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Force Summary',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Active Force', results.activeForce.toFixed(1), 'kN/m'],
            ['Surcharge Force', results.surchargeForce.toFixed(1), 'kN/m'],
            ['Wall Weight', results.wallWeight.toFixed(1), 'kN/m'],
            ['qMax', results.qMax.toFixed(0), 'kPa'],
            ['qMin', results.qMin.toFixed(0), 'kPa'],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Cantilever Wall',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.fosSliding < 2.0)
      recs.push({ check: 'Sliding FOS', suggestion: 'Consider adding a shear key at the base' });
    if (results.fosOverturning < 2.5)
      recs.push({
        check: 'Overturning FOS',
        suggestion: 'Increase base width or heel to improve overturning stability',
      });
    if (results.qMin <= 0)
      recs.push({
        check: 'Bearing Pressure',
        suggestion: 'Resultant outside middle third — widen base',
      });
    generateDOCX({
      title: 'RC Cantilever Wall',
      subtitle: 'BS EN 1997-1 Stability Check',
      projectInfo: [
        { label: 'Calculator', value: 'Cantilever Wall' },
        { label: 'Code', value: 'BS EN 1997-1 / 1992-1-1' },
      ],
      inputs: [
        { label: 'Wall Height', value: `${form.wallHeight} m` },
        { label: 'Base Width', value: `${form.baseWidth} m` },
        { label: "Soil φ'", value: `${form.soilPhi}°` },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
      ],
      checks: [
        {
          name: 'Sliding',
          capacity: `FOS ${results.fosSliding.toFixed(2)}`,
          utilisation: `≥ 1.5`,
          status: results.fosSliding >= 1.5 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Overturning',
          capacity: `FOS ${results.fosOverturning.toFixed(2)}`,
          utilisation: `≥ 2.0`,
          status: results.fosOverturning >= 2.0 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Bearing',
          capacity: `FOS ${results.fosBearing.toFixed(2)}`,
          utilisation: `≥ 2.0`,
          status: results.fosBearing >= 2.0 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Force Summary',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Active Force', results.activeForce.toFixed(1), 'kN/m'],
            ['Surcharge Force', results.surchargeForce.toFixed(1), 'kN/m'],
            ['Wall Weight', results.wallWeight.toFixed(1), 'kN/m'],
            ['qMax', results.qMax.toFixed(0), 'kPa'],
            ['qMin', results.qMin.toFixed(0), 'kPa'],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Cantilever Wall',
    });
  };

  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
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
            <FiShield className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">
              RETAINING | CANTILEVER WALL
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">
            RC Cantilever Wall
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Reinforced concrete cantilever retaining wall with sliding, overturning, and bearing
            stability checks to BS EN 1997-1.
          </p>
        </motion.div>

        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 mx-auto w-fit">
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
                  {results.overallStatus === 'PASS' ? 'Wall Stable' : 'Wall Unstable'}
                </div>
                <div className="text-gray-400 text-sm">
                  Ka = {results.Ka.toFixed(3)} | qMax = {results.qMax.toFixed(0)} kPa
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={exportPDF} className="bg-gradient-to-r from-neon-cyan to-neon-blue">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-gradient-to-r from-neon-cyan to-neon-blue">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton
                calculatorKey="cantilever-wall"
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
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Stem Top"
                            value={form.stemThicknessTop}
                            onChange={(v) => setForm((f) => ({ ...f, stemThicknessTop: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Stem Base"
                            value={form.stemThicknessBase}
                            onChange={(v) => setForm((f) => ({ ...f, stemThicknessBase: v }))}
                            unit="mm"
                          />
                        </div>
                        <InputField
                          label="Base Width"
                          value={form.baseWidth}
                          onChange={(v) => setForm((f) => ({ ...f, baseWidth: v }))}
                          unit="m"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Toe Length"
                            value={form.baseToe}
                            onChange={(v) => setForm((f) => ({ ...f, baseToe: v }))}
                            unit="m"
                          />
                          <InputField
                            label="Base Thick"
                            value={form.baseThickness}
                            onChange={(v) => setForm((f) => ({ ...f, baseThickness: v }))}
                            unit="mm"
                          />
                        </div>
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
                      <CardTitle className="text-xl font-bold text-white">Soil & Loading</CardTitle>
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
                          label="Soil φ'"
                          value={form.soilPhi}
                          onChange={(v) => setForm((f) => ({ ...f, soilPhi: v }))}
                          unit="°"
                        />
                        <InputField
                          label="Soil γ"
                          value={form.soilGamma}
                          onChange={(v) => setForm((f) => ({ ...f, soilGamma: v }))}
                          unit="kN/m³"
                        />
                        <InputField
                          label="Surcharge"
                          value={form.surcharge}
                          onChange={(v) => setForm((f) => ({ ...f, surcharge: v }))}
                          unit="kPa"
                        />
                        <InputField
                          label="Bearing Capacity"
                          value={form.bearingCapacity}
                          onChange={(v) => setForm((f) => ({ ...f, bearingCapacity: v }))}
                          unit="kPa"
                        />
                        <InputField
                          label="Friction Coeff (μ)"
                          value={form.frictionCoeff}
                          onChange={(v) => setForm((f) => ({ ...f, frictionCoeff: v }))}
                          unit=""
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-6">
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
                        <CantileverWall3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        CANTILEVER WALL — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {whatIfSliders.map((s) => (
                        <div key={s.key} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">
                              {form[s.key as keyof FormData]} {s.unit}
                            </span>
                          </div>
                          <input
                            title={s.label}
                            type="range"
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            value={form[s.key as keyof FormData] as string}
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
                          { label: 'Wall Height', value: `${form.wallHeight} m` },
                          { label: 'Base Width', value: `${form.baseWidth} m` },
                          { label: 'Soil φ', value: `${form.soilPhi}°` },
                          { label: 'Surcharge', value: `${form.surcharge} kPa` },
                          { label: 'Bearing Cap.', value: `${form.bearingCapacity} kPa` },
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
                                label: 'Sliding FOS',
                                value: results.fosSliding.toFixed(2),
                                ok: results.fosSliding >= 1.5,
                              },
                              {
                                label: 'Overturning FOS',
                                value: results.fosOverturning.toFixed(2),
                                ok: results.fosOverturning >= 2.0,
                              },
                              {
                                label: 'Bearing FOS',
                                value: results.fosBearing.toFixed(2),
                                ok: results.fosBearing >= 2.0,
                              },
                              {
                                label: 'Max Pressure',
                                value: `${results.qMax.toFixed(0)} kPa`,
                                ok: results.qMax <= parseFloat(form.bearingCapacity),
                              },
                            ].map((check) => (
                              <div
                                key={check.label}
                                className="flex justify-between text-xs py-0.5"
                              >
                                <span className="text-gray-500">{check.label}</span>
                                <span
                                  className={cn(
                                    'font-bold',
                                    !check.ok ? 'text-red-500' : 'text-emerald-400',
                                  )}
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

                <WhatIfPreview
                  title="Cantilever Wall — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <CantileverWall3D />
                    </Interactive3DDiagram>
                  )}
                />
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-2xl shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
                {results && (
                  <div className="sticky top-8 grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                <CardHeader className="py-3">
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiInfo className="w-6 h-6 text-neon-cyan" />
                    </div>
                    Detailed Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {[
                      ['Active Force', `${results.activeForce.toFixed(1)} kN/m`],
                      ['Surcharge Force', `${results.surchargeForce.toFixed(1)} kN/m`],
                      ['Wall Weight', `${results.wallWeight.toFixed(1)} kN/m`],
                      ['Soil on Heel', `${results.soilOnHeel.toFixed(1)} kN/m`],
                      ['qMax', `${results.qMax.toFixed(0)} kPa`],
                      ['qMin', `${results.qMin.toFixed(0)} kPa`],
                      ['Eccentricity', `${(results.eccentricity * 1000).toFixed(0)} mm`],
                      ['Stem Moment', `${results.stemMoment.toFixed(1)} kNm/m`],
                    ].map(([l, v], i) => (
                      <div key={i} className="bg-black/30 rounded-lg p-3">
                        <div className="text-gray-500 text-xs uppercase mb-1">{l}</div>
                        <div className="text-white font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
                  {results.fosSliding < 2.0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Low Sliding FOS</div>
                        <div className="text-xs text-gray-400">
                          Consider a shear key at the base to increase sliding resistance
                        </div>
                      </div>
                    </div>
                  )}
                  {results.fosOverturning < 2.5 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Overturning Margin</div>
                        <div className="text-xs text-gray-400">
                          Increase base width or heel length to improve overturning stability
                        </div>
                      </div>
                    </div>
                  )}
                  {results.qMin <= 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <FiAlertTriangle className="text-purple-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Tension at Heel</div>
                        <div className="text-xs text-gray-400">
                          Resultant outside middle third — consider widening base
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/10">
                    <FiCheck className="text-neon-cyan mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-white">Overall</div>
                      <div className="text-xs text-gray-400">
                        {results.overallStatus === 'PASS'
                          ? 'Wall satisfies all stability criteria'
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
                    <CantileverWall3D />
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
    <div className="text-sm font-semibold text-gray-200 mb-1">
      <ExplainableLabel
        label={`${label}${unit ? ` (${unit})` : ''}`}
        field={field || 'cantilever-wall'}
      />
    </div>
    <input
      title={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono transition-all"
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
        ? 'border-l-4 border-green-500 bg-green-950/20'
        : 'border-l-4 border-red-500 bg-red-950/20',
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

export default CantileverWall;
