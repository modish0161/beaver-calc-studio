// =============================================================================
// BeaverCalc Studio — Sheet Pile Wall Calculator
// BS EN 1997-1 Cantilever & Propped Sheet Pile Design
// =============================================================================
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FiActivity, FiAlertTriangle, FiCheck, FiChevronDown, FiDownload, FiInfo, FiMinimize2, FiSliders, FiX } from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SheetPile3D from '../../components/3d/scenes/SheetPile3D';
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
  wallType: string;
  pileSection: string;
  retainedHeight: string;
  embedDepth: string;
  surcharge: string;
  soilUnit: string;
  soilPhi: string;
  soilCohesion: string;
  waterLevel: string;
  steelGrade: string;
  sectionModulus: string;
  momentCapacity: string;
}

interface Results {
  Ka: number;
  Kp: number;
  activeForce: number;
  passiveForce: number;
  netMoment: number;
  requiredEmbed: number;
  maxBendingMoment: number;
  maxShearForce: number;
  momentUtil: number;
  embedUtil: number;
  FOS_overturn: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PILE_PRESETS: Record<string, { Zxx: string; My: string; label: string }> = {
  AZ18: { Zxx: '1800', My: '450', label: 'AZ 18-700 (Zxx=1800cm³/m)' },
  AZ26: { Zxx: '2600', My: '650', label: 'AZ 26-700 (Zxx=2600cm³/m)' },
  AZ36: { Zxx: '3600', My: '900', label: 'AZ 36-700N (Zxx=3600cm³/m)' },
  AZ48: { Zxx: '4800', My: '1200', label: 'AZ 48-700N (Zxx=4800cm³/m)' },
  custom: { Zxx: '0', My: '0', label: 'Custom Section' },
};

const SheetPile = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    wall: true,
    soil: true,
    section: false,
  });
  const [form, setForm] = useState<FormData>({
    wallType: 'cantilever',
    pileSection: 'AZ26',
    retainedHeight: '4.0',
    embedDepth: '5.0',
    surcharge: '10',
    soilUnit: '18',
    soilPhi: '30',
    soilCohesion: '0',
    waterLevel: '2.0',
    steelGrade: 'S355',
    sectionModulus: '2600',
    momentCapacity: '650',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'retainedHeight', label: 'Retained Height' },
  { key: 'embedDepth', label: 'Embed Depth' },
  { key: 'surcharge', label: 'Surcharge' },
  { key: 'soilUnit', label: 'Soil Unit' },
  { key: 'soilPhi', label: 'Soil Phi' },
  { key: 'soilCohesion', label: 'Soil Cohesion' },
  { key: 'waterLevel', label: 'Water Level' },
  { key: 'sectionModulus', label: 'Section Modulus' },
  { key: 'momentCapacity', label: 'Moment Capacity' },
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
    { key: 'wallType', label: 'Wall Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'pileSection', label: 'Pile Section', min: 0, max: 100, step: 1, unit: '' },
    { key: 'retainedHeight', label: 'Retained Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'embedDepth', label: 'Embed Depth', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  useEffect(() => {
    const preset = PILE_PRESETS[form.pileSection];
    if (preset && form.pileSection !== 'custom') {
      setForm((f) => ({ ...f, sectionModulus: preset.Zxx, momentCapacity: preset.My }));
    }
  }, [form.pileSection]);

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const H = parseFloat(form.retainedHeight);
      const D = parseFloat(form.embedDepth);
      const q = parseFloat(form.surcharge);
      const gamma = parseFloat(form.soilUnit);
      const phi_deg = parseFloat(form.soilPhi);
      const c = parseFloat(form.soilCohesion);
      const hw = parseFloat(form.waterLevel);
      const Zxx = parseFloat(form.sectionModulus);
      const My = parseFloat(form.momentCapacity);
      const isCantilever = form.wallType === 'cantilever';

      if (H <= 0 || D <= 0 || phi_deg <= 0) {
        w.push({ type: 'error', message: 'Invalid geometry' });
        setWarnings(w);
        return;
      }

      const phi = (phi_deg * Math.PI) / 180;
      const Ka = Math.tan(Math.PI / 4 - phi / 2) ** 2;
      const Kp = Math.tan(Math.PI / 4 + phi / 2) ** 2;

      const gammaW = 9.81;
      const gammaEff = gamma - (hw < H ? gammaW : 0);

      // Active earth pressure resultant
      // Triangular + surcharge component on retained side
      const sigma_a_base = Ka * (gamma * H + q) - 2 * c * Math.sqrt(Ka);
      const activeForce = 0.5 * Ka * gammaEff * H * H + Ka * q * H; // kN/m

      // Passive earth pressure resultant
      const sigma_p_base = Kp * gamma * D + 2 * c * Math.sqrt(Kp);
      const passiveForce = 0.5 * Kp * gamma * D * D + 2 * c * Math.sqrt(Kp) * D; // kN/m

      // Overturning moments about toe
      const M_active = 0.5 * Ka * gammaEff * H * H * (D + H / 3) + Ka * q * H * (D + H / 2);
      const M_passive = 0.5 * Kp * gamma * D * D * (D / 3) + 2 * c * Math.sqrt(Kp) * D * (D / 2);

      const FOS_overturn = M_passive / Math.max(M_active, 0.01);

      // Required embedment (simplified — Blum's method factor)
      const Fd = isCantilever ? 1.2 : 1.0;
      const requiredEmbed = Fd * H * Math.pow(Ka / Kp, 1 / 3) * 1.5;

      const embedUtil = requiredEmbed / D;

      // Max bending moment (cantilever: at dredge level approx)
      const maxBendingMoment = isCantilever
        ? (0.5 * Ka * gammaEff * H * H * H) / 6 + (Ka * q * H * H) / 2 // kNm/m
        : (0.5 * Ka * gammaEff * H * H * H) / 8 + (Ka * q * H * H) / 4; // propped reduces

      const maxShearForce = activeForce;

      // Bending capacity of section
      const fy = form.steelGrade === 'S355' ? 355 : form.steelGrade === 'S430' ? 430 : 275;
      const MRd = My > 0 ? My : (Zxx * fy) / 1e3; // kNm/m
      const momentUtil = maxBendingMoment / MRd;

      if (FOS_overturn < 2.0)
        w.push({ type: 'warning', message: `FOS overturning = ${FOS_overturn.toFixed(2)} < 2.0` });
      if (embedUtil > 1.0) w.push({ type: 'warning', message: 'Embedment depth insufficient' });
      if (momentUtil > 0.85) w.push({ type: 'warning', message: 'Section near bending capacity' });

      const overallStatus =
        momentUtil <= 1.0 && embedUtil <= 1.0 && FOS_overturn >= 1.5 ? 'PASS' : 'FAIL';
      const netMoment = M_active - M_passive;

      setResults({
        Ka,
        Kp,
        activeForce,
        passiveForce,
        netMoment,
        requiredEmbed,
        maxBendingMoment,
        maxShearForce,
        momentUtil,
        embedUtil,
        FOS_overturn,
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
    generatePremiumPDF({
      title: 'Sheet Pile Wall Design',
      subtitle: 'BS EN 1997-1',
      projectInfo: [{ label: 'Calculator', value: 'Sheet Pile' }],
      inputs: [
        { label: 'Wall Type', value: form.wallType },
        { label: 'Retained Height', value: form.retainedHeight, unit: 'm' },
        { label: 'Embedment Depth', value: form.embedDepth, unit: 'm' },
        { label: 'Surcharge', value: form.surcharge, unit: 'kPa' },
        { label: 'Soil Unit Weight', value: form.soilUnit, unit: 'kN/m³' },
        { label: 'Friction Angle', value: form.soilPhi, unit: '°' },
        { label: 'Pile Section', value: form.pileSection },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `MRd`,
          utilisation: `${(results.momentUtil * 100).toFixed(0)}%`,
          status: results.momentUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Embedment',
          capacity: `D=${form.embedDepth}m`,
          utilisation: `${(results.embedUtil * 100).toFixed(0)}%`,
          status: results.embedUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Overturning',
          capacity: 'FOS ≥ 1.5',
          utilisation: `FOS = ${results.FOS_overturn.toFixed(2)}`,
          status: results.FOS_overturn >= 1.5 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Earth Pressure Summary',
          head: [['Parameter', 'Value']],
          body: [
            ['Ka', results.Ka.toFixed(3)],
            ['Kp', results.Kp.toFixed(3)],
            ['Active Force', `${results.activeForce.toFixed(0)} kN/m`],
            ['Passive Force', `${results.passiveForce.toFixed(0)} kN/m`],
            ['Max Bending Moment', `${results.maxBendingMoment.toFixed(0)} kNm/m`],
            ['Max Shear Force', `${results.maxShearForce.toFixed(0)} kN/m`],
            ['Required Embedment', `${results.requiredEmbed.toFixed(1)} m`],
          ],
        },
      ],
      recommendations: [
        ...(results.momentUtil > 0.85
          ? [
              {
                check: 'High Bending',
                suggestion: `${(results.momentUtil * 100).toFixed(0)}% — consider heavier section`,
              },
            ]
          : []),
        ...(results.embedUtil > 1.0
          ? [
              {
                check: 'Insuffient Embedment',
                suggestion: `Req ${results.requiredEmbed.toFixed(1)}m vs ${form.embedDepth}m provided`,
              },
            ]
          : []),
        ...(results.FOS_overturn < 2.0
          ? [
              {
                check: 'Low FOS',
                suggestion: `FOS = ${results.FOS_overturn.toFixed(2)} — consider props or deeper embed`,
              },
            ]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.overallStatus === 'PASS'
              ? 'All checks satisfied per BS EN 1997-1'
              : 'Design inadequate',
        },
      ],
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Sheet Pile Wall Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Sheet Pile Wall Design',
      subtitle: 'BS EN 1997-1',
      projectInfo: [{ label: 'Calculator', value: 'Sheet Pile' }],
      inputs: [
        { label: 'Wall Type', value: form.wallType },
        { label: 'Retained Height', value: form.retainedHeight, unit: 'm' },
        { label: 'Embedment Depth', value: form.embedDepth, unit: 'm' },
        { label: 'Surcharge', value: form.surcharge, unit: 'kPa' },
        { label: 'Soil Unit Weight', value: form.soilUnit, unit: 'kN/m³' },
        { label: 'Friction Angle', value: form.soilPhi, unit: '°' },
        { label: 'Pile Section', value: form.pileSection },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `MRd`,
          utilisation: `${(results.momentUtil * 100).toFixed(0)}%`,
          status: results.momentUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Embedment',
          capacity: `D=${form.embedDepth}m`,
          utilisation: `${(results.embedUtil * 100).toFixed(0)}%`,
          status: results.embedUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Overturning',
          capacity: 'FOS ≥ 1.5',
          utilisation: `FOS = ${results.FOS_overturn.toFixed(2)}`,
          status: results.FOS_overturn >= 1.5 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Earth Pressure Summary',
          head: [['Parameter', 'Value']],
          body: [
            ['Ka', results.Ka.toFixed(3)],
            ['Kp', results.Kp.toFixed(3)],
            ['Active Force', `${results.activeForce.toFixed(0)} kN/m`],
            ['Passive Force', `${results.passiveForce.toFixed(0)} kN/m`],
            ['Max Bending Moment', `${results.maxBendingMoment.toFixed(0)} kNm/m`],
            ['Max Shear Force', `${results.maxShearForce.toFixed(0)} kN/m`],
            ['Required Embedment', `${results.requiredEmbed.toFixed(1)} m`],
          ],
        },
      ],
      recommendations: [
        ...(results.momentUtil > 0.85
          ? [
              {
                check: 'High Bending',
                suggestion: `${(results.momentUtil * 100).toFixed(0)}% — consider heavier section`,
              },
            ]
          : []),
        ...(results.embedUtil > 1.0
          ? [
              {
                check: 'Insuffient Embedment',
                suggestion: `Req ${results.requiredEmbed.toFixed(1)}m vs ${form.embedDepth}m provided`,
              },
            ]
          : []),
        ...(results.FOS_overturn < 2.0
          ? [
              {
                check: 'Low FOS',
                suggestion: `FOS = ${results.FOS_overturn.toFixed(2)} — consider props or deeper embed`,
              },
            ]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.overallStatus === 'PASS'
              ? 'All checks satisfied per BS EN 1997-1'
              : 'Design inadequate',
        },
      ],
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Sheet Pile Wall Design',
    });
  };

  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4 bg-gray-900/40">
            <span className="text-neon-cyan font-mono tracking-wider">GEOTECH | SHEET PILE</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">Sheet Pile Wall</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Cantilever and propped sheet pile wall design with earth pressure, embedment, and
            structural checks to BS EN 1997-1.
          </p>
        </motion.div>

        <div className="flex justify-center gap-2 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 max-w-xl mx-auto">
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as any)}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white'
                  : 'text-gray-400 hover:text-white',
              )}
            >
              {tab === 'input' ? '🔩 Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
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
                  Ka={results.Ka.toFixed(3)} | Kp={results.Kp.toFixed(3)} | FOS=
                  {results.FOS_overturn.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={exportPDF} className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton calculatorKey="sheet-pile" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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
                <Card
                  variant="glass"
                  className="border-neon-cyan/30 shadow-2xl"
                >
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('wall')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Wall Configuration</CardTitle>
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
                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1 block">
                            Wall Type
                          </label>
                          <select
                            title="Wall Type"
                            value={form.wallType}
                            onChange={(e) => setForm((f) => ({ ...f, wallType: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                          >
                            <option value="cantilever">Cantilever</option>
                            <option value="propped">Single Propped</option>
                            <option value="anchored">Anchored</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Retained H"
                            value={form.retainedHeight}
                            onChange={(v) => setForm((f) => ({ ...f, retainedHeight: v }))}
                            unit="m"
                          />
                          <InputField
                            label="Embed D"
                            value={form.embedDepth}
                            onChange={(v) => setForm((f) => ({ ...f, embedDepth: v }))}
                            unit="m"
                          />
                        </div>
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
                    onClick={() => toggleSection('soil')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Soil Parameters</CardTitle>
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
                        <InputField
                          label="Water level"
                          value={form.waterLevel}
                          onChange={(v) => setForm((f) => ({ ...f, waterLevel: v }))}
                          unit="m BGL"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('section')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Pile Section</CardTitle>
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
                          <label className="text-sm font-semibold text-gray-200 mb-1 block">
                            Section
                          </label>
                          <select
                            title="Pile Section"
                            value={form.pileSection}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, pileSection: e.target.value }))
                            }
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                          >
                            {Object.entries(PILE_PRESETS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <InputField
                          label="Zxx"
                          value={form.sectionModulus}
                          onChange={(v) => setForm((f) => ({ ...f, sectionModulus: v }))}
                          unit="cm³/m"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-2xl shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>
              <div className="lg:col-span-2 space-y-6 sticky top-8">
                <WhatIfPreview
                  title="Sheet Pile — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[6, 5, 6]}>
                      <SheetPile3D />
                    </Interactive3DDiagram>
                  )}
                />
                {results && (
                  <div className="grid grid-cols-3 gap-4">
                    <ResultCard
                      label="Bending"
                      value={`${(results.momentUtil * 100).toFixed(0)}%`}
                      limit={`M=${results.maxBendingMoment.toFixed(0)} kNm/m`}
                      status={results.momentUtil <= 1 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Embedment"
                      value={`${(results.embedUtil * 100).toFixed(0)}%`}
                      limit={`Req: ${results.requiredEmbed.toFixed(1)}m`}
                      status={results.embedUtil <= 1 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="FOS Overturn"
                      value={results.FOS_overturn.toFixed(2)}
                      limit="≥ 1.50"
                      status={results.FOS_overturn >= 1.5 ? 'pass' : 'fail'}
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
              className="space-y-6"
            >
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {[
                      ['Ka', results.Ka.toFixed(3)],
                      ['Kp', results.Kp.toFixed(3)],
                      ['Active F', `${results.activeForce.toFixed(0)} kN/m`],
                      ['Passive F', `${results.passiveForce.toFixed(0)} kN/m`],
                      ['Max BM', `${results.maxBendingMoment.toFixed(0)} kNm/m`],
                      ['Max Shear', `${results.maxShearForce.toFixed(0)} kN/m`],
                      ['Req Embed', `${results.requiredEmbed.toFixed(1)} m`],
                      ['FOS', results.FOS_overturn.toFixed(2)],
                    ].map(([l, v], i) => (
                      <div key={i} className="bg-black/30 rounded-lg p-3">
                        <div className="text-gray-500 text-xs uppercase mb-1">{l}</div>
                        <div className="text-white font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="py-3">
                  <CardTitle className="text-xl font-bold text-white">Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {results.momentUtil > 0.85 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-950/30 border border-yellow-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-yellow-300 text-xs font-semibold">
                          High Bending Utilisation
                        </div>
                        <div className="text-gray-400 text-xs">
                          {(results.momentUtil * 100).toFixed(0)}% — consider a heavier pile section
                        </div>
                      </div>
                    </div>
                  )}
                  {results.embedUtil > 1.0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-red-950/30 border border-red-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-red-300 text-xs font-semibold">
                          Insufficient Embedment
                        </div>
                        <div className="text-gray-400 text-xs">
                          Required {results.requiredEmbed.toFixed(1)}m vs provided {form.embedDepth}
                          m — increase embedment depth
                        </div>
                      </div>
                    </div>
                  )}
                  {results.FOS_overturn < 2.0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-950/30 border border-orange-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-orange-300 text-xs font-semibold">
                          Low Overturning FOS
                        </div>
                        <div className="text-gray-400 text-xs">
                          FOS = {results.FOS_overturn.toFixed(2)} &lt; 2.0 — consider props or
                          deeper embedment
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                    <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-emerald-300 text-xs font-semibold">Overall</div>
                      <div className="text-gray-400 text-xs">
                        {form.wallType} sheet pile checked to BS EN 1997-1 —{' '}
                        {results.overallStatus === 'PASS'
                          ? 'all checks satisfied'
                          : 'design inadequate'}
                      </div>
                    </div>
                  </div>
                </CardContent>
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
                  <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                    <SheetPile3D />
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
              <Interactive3DDiagram height="h-full" cameraPosition={[6, 5, 6]}>
                <SheetPile3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700/50 transition-all z-10"
                title="Exit fullscreen"
              >
                <FiMinimize2 size={16} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                Sheet Pile — 3D Preview
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
                        <span className="text-white font-mono">{form[s.key as keyof FormData]} {s.unit}</span>
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
                    { label: 'Retained Height', value: `${form.retainedHeight} m` },
                    { label: 'Embed Depth', value: `${form.embedDepth} m` },
                    { label: 'Surcharge', value: `${form.surcharge} kPa` },
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
                  <div className={cn(
                    'p-3 rounded-lg text-center mb-3',
                    results.overallStatus === 'PASS'
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  )}>
                    <div className={cn(
                      'text-2xl font-black',
                      results.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {results.overallStatus}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Bending Util', value: `${(results.momentUtil * 100).toFixed(0)}%` },
                      { label: 'Embed Util', value: `${(results.embedUtil * 100).toFixed(0)}%` },
                      { label: 'FOS Overturn', value: results.FOS_overturn.toFixed(2) },
                      { label: 'Max BM', value: `${results.maxBendingMoment.toFixed(0)} kNm/m` },
                      { label: 'Max Shear', value: `${results.maxShearForce.toFixed(0)} kN/m` },
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
    <div className="flex items-center gap-1.5 mb-1">
      <ExplainableLabel
        label={label}
        field={field || label.toLowerCase().replace(/\s+/g, '_')}
        className="text-sm font-semibold text-gray-200"
      />{' '}
      {unit && <span className="text-gray-600 text-xs">({unit})</span>}
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

export default SheetPile;
