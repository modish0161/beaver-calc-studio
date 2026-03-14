// =============================================================================
// BeaverCalc Studio — Anchor Bolt Calculator
// Concrete anchor bolt capacity to BS EN 1992-4
// =============================================================================
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBox,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMinimize2,
  FiSettings,
  FiSliders,
  FiTarget,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import AnchorBolt3D from '../../components/3d/scenes/AnchorBolt3D';
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
  boltDiameter: string;
  embedmentDepth: string;
  numberOfBolts: string;
  spacingX: string;
  spacingY: string;
  edgeDistX: string;
  edgeDistY: string;
  concreteGrade: string;
  steelGrade: string;
  tensionForce: string;
  shearForce: string;
  eccentricityT: string;
  eccentricityV: string;
  crackedConcrete: string;
}

interface Results {
  steelTension: number;
  coneTension: number;
  pulloutTension: number;
  steelShear: number;
  pryConeShear: number;
  edgeShear: number;
  tensionUtil: number;
  shearUtil: number;
  interactionUtil: number;
  criticalCheck: string;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const ANCHOR_PRESETS: Record<string, { diameter: string; embedment: string; label: string }> = {
  m12: { diameter: '12', embedment: '100', label: 'M12' },
  m16: { diameter: '16', embedment: '130', label: 'M16' },
  m20: { diameter: '20', embedment: '170', label: 'M20' },
  m24: { diameter: '24', embedment: '210', label: 'M24' },
};

const AnchorBolt = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    material: true,
    loading: false,
  });
  const [form, setForm] = useState<FormData>({
    anchorType: 'cast_in',
    boltDiameter: '16',
    embedmentDepth: '130',
    numberOfBolts: '4',
    spacingX: '200',
    spacingY: '200',
    edgeDistX: '150',
    edgeDistY: '150',
    concreteGrade: '30',
    steelGrade: '8.8',
    tensionForce: '40',
    shearForce: '20',
    eccentricityT: '0',
    eccentricityV: '0',
    crackedConcrete: 'yes',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'boltDiameter', label: 'Bolt Diameter' },
      { key: 'embedmentDepth', label: 'Embedment Depth' },
      { key: 'numberOfBolts', label: 'Number Of Bolts' },
      { key: 'spacingX', label: 'Spacing X' },
      { key: 'spacingY', label: 'Spacing Y' },
      { key: 'edgeDistX', label: 'Edge Dist X' },
      { key: 'edgeDistY', label: 'Edge Dist Y' },
      { key: 'tensionForce', label: 'Tension Force' },
      { key: 'shearForce', label: 'Shear Force' },
      { key: 'eccentricityT', label: 'Eccentricity T' },
      { key: 'eccentricityV', label: 'Eccentricity V' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map((e) => ({ type: 'error' as const, message: e })));
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
    { key: 'anchorType', label: 'Anchor Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'boltDiameter', label: 'Bolt Diameter', min: 0, max: 100, step: 1, unit: '' },
    { key: 'embedmentDepth', label: 'Embedment Depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'numberOfBolts', label: 'Number Of Bolts', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const d = parseFloat(form.boltDiameter);
      const hef = parseFloat(form.embedmentDepth);
      const n = parseInt(form.numberOfBolts);
      const fck = parseFloat(form.concreteGrade);
      const Nt = parseFloat(form.tensionForce);
      const Vt = parseFloat(form.shearForce);
      const sx = parseFloat(form.spacingX);
      const c1 = parseFloat(form.edgeDistX);
      const cracked = form.crackedConcrete === 'yes';

      if (d <= 0 || hef <= 0 || n <= 0 || fck <= 0) {
        w.push({ type: 'error', message: 'Invalid inputs' });
        setWarnings(w);
        return;
      }

      // Steel tensile strength — Grade 8.8
      const fub = form.steelGrade === '10.9' ? 1000 : form.steelGrade === '8.8' ? 800 : 400;
      const As = (Math.PI * (d * 0.9) ** 2) / 4; // tensile stress area
      const NRk_s = (As * fub) / 1000; // kN per bolt
      const steelTension = (NRk_s * n) / 1.5; // design

      // Concrete cone breakout — EN 1992-4: NRk,c = k₁ · √fck · hef^1.5
      const k1 = cracked ? 8.9 : 12.7;
      const NRk_c0 = (k1 * Math.sqrt(fck) * Math.pow(hef / 10, 1.5)) / 1000; // kN, single anchor
      const scr = 3 * hef;
      const ccr = 1.5 * hef;
      const Ac0 = scr * scr;
      const effSx = Math.min(sx, scr);
      const effC = Math.min(c1, ccr);
      const Ac = (effSx + effC) * (effSx + effC); // simplified
      const psiS = 0.7 + (0.3 * effC) / ccr;
      const coneTension = (NRk_c0 * (Ac / Ac0) * psiS * n) / 1.8;

      // Pullout
      const pulloutTension = steelTension * 0.9;

      // Steel shear per bolt
      const VRk_s = (0.5 * fub * As) / 1000;
      const steelShear = (VRk_s * n) / 1.25;

      // Pry-out shear
      const k_pry = hef >= 60 ? 2 : 1;
      const pryConeShear = k_pry * coneTension;

      // Concrete edge shear (simplified)
      const k5 = cracked ? 1.7 : 2.4;
      const VRk_c0 = (k5 * Math.sqrt(fck) * Math.pow(c1, 1.5) * Math.sqrt(d)) / 1000;
      const edgeShear = (VRk_c0 * n) / 1.8;

      const minTension = Math.min(steelTension, coneTension, pulloutTension);
      const minShear = Math.min(steelShear, pryConeShear, edgeShear);
      const tensionUtil = Nt / minTension;
      const shearUtil = Vt / minShear;
      const interactionUtil = Math.pow(tensionUtil, 5 / 3) + Math.pow(shearUtil, 5 / 3);

      let criticalCheck = 'Steel Tension';
      if (coneTension < steelTension && coneTension < pulloutTension)
        criticalCheck = 'Concrete Cone';
      if (pulloutTension < steelTension && pulloutTension < coneTension) criticalCheck = 'Pullout';

      if (tensionUtil > 0.8 && tensionUtil <= 1.0)
        w.push({
          type: 'warning',
          message: `Tension utilisation ${(tensionUtil * 100).toFixed(0)}% — nearing capacity`,
        });
      if (c1 < 3 * d)
        w.push({ type: 'warning', message: 'Edge distance less than 3d — check splitting' });
      if (hef < 4 * d)
        w.push({ type: 'info', message: 'Shallow embedment — cone breakout likely governs' });

      const overallStatus = interactionUtil <= 1.0 ? 'PASS' : 'FAIL';

      setResults({
        steelTension,
        coneTension,
        pulloutTension,
        steelShear,
        pryConeShear,
        edgeShear,
        tensionUtil,
        shearUtil,
        interactionUtil,
        criticalCheck,
        overallStatus,
      });
    } catch {
      w.push({ type: 'error', message: 'Calculation error' });
    }
    setWarnings(w);
  };

  const exportPDF = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.interactionUtil > 0.85)
      recs.push({
        check: 'High Interaction',
        suggestion: 'Consider larger bolt diameter or additional anchors',
      });
    if (results.criticalCheck === 'Concrete Cone')
      recs.push({
        check: 'Cone Breakout Governs',
        suggestion: 'Increase embedment depth or add supplementary reinforcement',
      });
    if (parseFloat(form.edgeDistX) < 3 * parseFloat(form.boltDiameter))
      recs.push({
        check: 'Edge Distance',
        suggestion: 'Edge distance < 3d — check splitting and provide hanger reinforcement',
      });
    generatePremiumPDF({
      title: 'Anchor Bolt Design',
      subtitle: 'BS EN 1992-4 Verification',
      projectInfo: [
        { label: 'Calculator', value: 'Anchor Bolt' },
        { label: 'Code', value: 'BS EN 1992-4' },
      ],
      inputs: [
        { label: 'Bolt', value: `M${form.boltDiameter} × ${form.numberOfBolts}nr` },
        { label: 'Embedment', value: `${form.embedmentDepth} mm` },
        { label: 'Spacing', value: `${form.spacingX} × ${form.spacingY} mm` },
        { label: 'Concrete', value: `C${form.concreteGrade}` },
        { label: 'Steel', value: `Grade ${form.steelGrade}` },
      ],
      checks: [
        {
          name: 'Tension',
          capacity: `${Math.min(results.steelTension, results.coneTension, results.pulloutTension).toFixed(1)} kN`,
          utilisation: `${(results.tensionUtil * 100).toFixed(0)}%`,
          status: results.tensionUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Shear',
          capacity: `${Math.min(results.steelShear, results.pryConeShear, results.edgeShear).toFixed(1)} kN`,
          utilisation: `${(results.shearUtil * 100).toFixed(0)}%`,
          status: results.shearUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Interaction',
          capacity: '≤ 1.0',
          utilisation: `${results.interactionUtil.toFixed(2)}`,
          status: results.interactionUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Capacity Summary',
          head: [['Mode', 'Tension (kN)', 'Shear (kN)']],
          body: [
            ['Steel', results.steelTension.toFixed(1), results.steelShear.toFixed(1)],
            ['Concrete Cone', results.coneTension.toFixed(1), results.pryConeShear.toFixed(1)],
            ['Pullout / Edge', results.pulloutTension.toFixed(1), results.edgeShear.toFixed(1)],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Anchor Bolt Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.interactionUtil > 0.85)
      recs.push({
        check: 'High Interaction',
        suggestion: 'Consider larger bolt diameter or additional anchors',
      });
    if (results.criticalCheck === 'Concrete Cone')
      recs.push({
        check: 'Cone Breakout Governs',
        suggestion: 'Increase embedment depth or add supplementary reinforcement',
      });
    if (parseFloat(form.edgeDistX) < 3 * parseFloat(form.boltDiameter))
      recs.push({
        check: 'Edge Distance',
        suggestion: 'Edge distance < 3d — check splitting and provide hanger reinforcement',
      });
    generateDOCX({
      title: 'Anchor Bolt Design',
      subtitle: 'BS EN 1992-4 Verification',
      projectInfo: [
        { label: 'Calculator', value: 'Anchor Bolt' },
        { label: 'Code', value: 'BS EN 1992-4' },
      ],
      inputs: [
        { label: 'Bolt', value: `M${form.boltDiameter} × ${form.numberOfBolts}nr` },
        { label: 'Embedment', value: `${form.embedmentDepth} mm` },
        { label: 'Spacing', value: `${form.spacingX} × ${form.spacingY} mm` },
        { label: 'Concrete', value: `C${form.concreteGrade}` },
        { label: 'Steel', value: `Grade ${form.steelGrade}` },
      ],
      checks: [
        {
          name: 'Tension',
          capacity: `${Math.min(results.steelTension, results.coneTension, results.pulloutTension).toFixed(1)} kN`,
          utilisation: `${(results.tensionUtil * 100).toFixed(0)}%`,
          status: results.tensionUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Shear',
          capacity: `${Math.min(results.steelShear, results.pryConeShear, results.edgeShear).toFixed(1)} kN`,
          utilisation: `${(results.shearUtil * 100).toFixed(0)}%`,
          status: results.shearUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Interaction',
          capacity: '≤ 1.0',
          utilisation: `${results.interactionUtil.toFixed(2)}`,
          status: results.interactionUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Capacity Summary',
          head: [['Mode', 'Tension (kN)', 'Shear (kN)']],
          body: [
            ['Steel', results.steelTension.toFixed(1), results.steelShear.toFixed(1)],
            ['Concrete Cone', results.coneTension.toFixed(1), results.pryConeShear.toFixed(1)],
            ['Pullout / Edge', results.pulloutTension.toFixed(1), results.edgeShear.toFixed(1)],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Anchor Bolt Design',
    });
  };

  const applyPreset = (key: string) => {
    const p = ANCHOR_PRESETS[key];
    if (p) setForm((f) => ({ ...f, boltDiameter: p.diameter, embedmentDepth: p.embedment }));
  };
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Anchor Bolt Design
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            Cast-in or post-installed anchor bolt verification to BS EN 1992-4
          </p>

          {/* Glass toolbar */}
          <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
            <div className="flex items-center gap-2">
              {results && (
                <Button
                  onClick={exportPDF}
                  className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={exportDOCX}
                  className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton
                  calculatorKey="anchor-bolt"
                  inputs={form as unknown as Record<string, string | number>}
                  results={results}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                />
              )}
            </div>

            {/* View Tabs */}
            <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
              {[
                { id: 'input', label: 'Inputs', icon: <FiGrid /> },
                { id: 'results', label: 'Analysis', icon: <FiActivity />, disabled: !results },
                {
                  id: 'visualization',
                  label: 'Visualization',
                  icon: <FiTarget />,
                  disabled: !results,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

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
                  {results.overallStatus === 'PASS' ? 'Anchor Adequate' : 'Anchor Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  Critical: {results.criticalCheck} | Interaction ={' '}
                  {results.interactionUtil.toFixed(2)}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Warnings */}
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
          {/* INPUT TAB */}
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Anchor Geometry */}
                  <Card
                    variant="glass"
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                  >
                    <CardHeader
                      className="cursor-pointer py-3"
                      onClick={() => toggleSection('geometry')}
                    >
                      <CardTitle className="text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiBox className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Anchor Geometry</span>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform ml-auto',
                            expandedSections.geometry && 'rotate-180',
                          )}
                        />
                      </CardTitle>
                    </CardHeader>
                    {expandedSections.geometry && (
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                              Anchor Type
                            </label>
                            <select
                              title="Anchor Type"
                              value={form.anchorType}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, anchorType: e.target.value }))
                              }
                              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            >
                              <option value="cast_in">Cast-In</option>
                              <option value="post_installed">Post-Installed</option>
                              <option value="undercut">Undercut</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                              Bolt Size Preset
                            </label>
                            <select
                              title="Bolt Size"
                              value=""
                              onChange={(e) => applyPreset(e.target.value)}
                              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            >
                              <option value="">Select...</option>
                              {Object.entries(ANCHOR_PRESETS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <InputField
                            label="Bolt Diameter"
                            value={form.boltDiameter}
                            onChange={(v) => setForm((f) => ({ ...f, boltDiameter: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Embedment Depth"
                            value={form.embedmentDepth}
                            onChange={(v) => setForm((f) => ({ ...f, embedmentDepth: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Number of Bolts"
                            value={form.numberOfBolts}
                            onChange={(v) => setForm((f) => ({ ...f, numberOfBolts: v }))}
                            unit=""
                          />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <InputField
                            label="Spacing X"
                            value={form.spacingX}
                            onChange={(v) => setForm((f) => ({ ...f, spacingX: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Spacing Y"
                            value={form.spacingY}
                            onChange={(v) => setForm((f) => ({ ...f, spacingY: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Edge Dist X"
                            value={form.edgeDistX}
                            onChange={(v) => setForm((f) => ({ ...f, edgeDistX: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Edge Dist Y"
                            value={form.edgeDistY}
                            onChange={(v) => setForm((f) => ({ ...f, edgeDistY: v }))}
                            unit="mm"
                          />
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Materials */}
                  <Card
                    variant="glass"
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                  >
                    <CardHeader
                      className="cursor-pointer py-3"
                      onClick={() => toggleSection('material')}
                    >
                      <CardTitle className="text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiSettings className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Materials</span>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform ml-auto',
                            expandedSections.material && 'rotate-180',
                          )}
                        />
                      </CardTitle>
                    </CardHeader>
                    {expandedSections.material && (
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <InputField
                            label="Concrete Grade (fck)"
                            value={form.concreteGrade}
                            onChange={(v) => setForm((f) => ({ ...f, concreteGrade: v }))}
                            unit="MPa"
                          />
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                              Steel Grade
                            </label>
                            <select
                              title="Steel Grade"
                              value={form.steelGrade}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, steelGrade: e.target.value }))
                              }
                              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            >
                              <option value="4.6">Grade 4.6</option>
                              <option value="8.8">Grade 8.8</option>
                              <option value="10.9">Grade 10.9</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                              Cracked Concrete
                            </label>
                            <select
                              title="Cracked Concrete"
                              value={form.crackedConcrete}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, crackedConcrete: e.target.value }))
                              }
                              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            >
                              <option value="yes">Yes (cracked)</option>
                              <option value="no">No (uncracked)</option>
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Loading */}
                  <Card
                    variant="glass"
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                  >
                    <CardHeader
                      className="cursor-pointer py-3"
                      onClick={() => toggleSection('loading')}
                    >
                      <CardTitle className="text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiZap className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Loading</span>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform ml-auto',
                            expandedSections.loading && 'rotate-180',
                          )}
                        />
                      </CardTitle>
                    </CardHeader>
                    {expandedSections.loading && (
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <InputField
                            label="Tension Force"
                            value={form.tensionForce}
                            onChange={(v) => setForm((f) => ({ ...f, tensionForce: v }))}
                            unit="kN"
                          />
                          <InputField
                            label="Shear Force"
                            value={form.shearForce}
                            onChange={(v) => setForm((f) => ({ ...f, shearForce: v }))}
                            unit="kN"
                          />
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* RUN FULL ANALYSIS Button */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center pt-4"
                  >
                    <button
                      onClick={() => {
                        calculate();
                        setActiveTab('results');
                      }}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      ▶ RUN FULL ANALYSIS
                    </button>
                  </motion.div>
                </div>

                {/* Fullscreen Preview Overlay */}
                {previewMaximized && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                  >
                    <div className="flex-1 relative">
                      <Interactive3DDiagram height="h-full" cameraPosition={[6, 5, 6]}>
                        <AnchorBolt3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        ANCHOR BOLT — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        {
                          label: 'Bolt Diameter',
                          field: 'boltDiameter' as keyof FormData,
                          min: 8,
                          max: 36,
                          step: 2,
                          unit: 'mm',
                        },
                        {
                          label: 'Embedment Depth',
                          field: 'embedmentDepth' as keyof FormData,
                          min: 50,
                          max: 400,
                          step: 10,
                          unit: 'mm',
                        },
                        {
                          label: 'No. Bolts',
                          field: 'numberOfBolts' as keyof FormData,
                          min: 1,
                          max: 16,
                          step: 1,
                          unit: '',
                        },
                        {
                          label: 'Spacing X',
                          field: 'spacingX' as keyof FormData,
                          min: 50,
                          max: 500,
                          step: 10,
                          unit: 'mm',
                        },
                        {
                          label: 'Spacing Y',
                          field: 'spacingY' as keyof FormData,
                          min: 50,
                          max: 500,
                          step: 10,
                          unit: 'mm',
                        },
                        {
                          label: 'Edge Dist X',
                          field: 'edgeDistX' as keyof FormData,
                          min: 50,
                          max: 400,
                          step: 10,
                          unit: 'mm',
                        },
                        {
                          label: 'Tension Force',
                          field: 'tensionForce' as keyof FormData,
                          min: 0,
                          max: 200,
                          step: 5,
                          unit: 'kN',
                        },
                        {
                          label: 'Shear Force',
                          field: 'shearForce' as keyof FormData,
                          min: 0,
                          max: 200,
                          step: 5,
                          unit: 'kN',
                        },
                      ].map((s) => (
                        <div key={s.field} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">
                              {form[s.field]} {s.unit}
                            </span>
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
                          {
                            label: 'Anchor Type',
                            value: form.anchorType === 'cast_in' ? 'Cast-in' : 'Post-installed',
                          },
                          { label: 'Bolt Diameter', value: `M${form.boltDiameter}` },
                          { label: 'Concrete Grade', value: `C${form.concreteGrade}` },
                          { label: 'Steel Grade', value: `Grade ${form.steelGrade}` },
                          {
                            label: 'Grid',
                            value: `${form.numberOfBolts} bolts @ ${form.spacingX}×${form.spacingY}`,
                          },
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
                                label: 'Tension',
                                util: results.tensionUtil.toFixed(0),
                                status: results.tensionUtil <= 100 ? 'PASS' : 'FAIL',
                              },
                              {
                                label: 'Shear',
                                util: results.shearUtil.toFixed(0),
                                status: results.shearUtil <= 100 ? 'PASS' : 'FAIL',
                              },
                              {
                                label: 'Interaction',
                                util: results.interactionUtil.toFixed(0),
                                status: results.interactionUtil <= 100 ? 'PASS' : 'FAIL',
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
                                    check.status === 'FAIL'
                                      ? 'text-red-500'
                                      : parseFloat(check.util) > 90
                                        ? 'text-orange-400'
                                        : 'text-emerald-400',
                                  )}
                                >
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

                {/* Right Column — Sticky Sidebar */}
                <div className="lg:col-span-1">
                  <div className="sticky top-8 space-y-4">
                    <WhatIfPreview
                      title="Anchor Bolt — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[6, 5, 6]}>
                          <AnchorBolt3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    <Card
                      variant="glass"
                      className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                          <FiInfo className="text-blue-400" />
                          Reference
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-gray-400 space-y-2">
                        <p>
                          • <strong>BS EN 1992-4:</strong> Fastener design
                        </p>
                        <p>
                          • <strong>Concrete Cone:</strong> Breakout capacity
                        </p>
                        <p>
                          • <strong>Interaction:</strong> Combined tension &amp; shear
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULTS TAB */}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Top Summary Cards with border-l-4 */}
              <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  {
                    label: 'Tension',
                    value: `${(results.tensionUtil * 100).toFixed(0)}%`,
                    icon: <FiTarget />,
                    pass: results.tensionUtil <= 1,
                  },
                  {
                    label: 'Shear',
                    value: `${(results.shearUtil * 100).toFixed(0)}%`,
                    icon: <FiZap />,
                    pass: results.shearUtil <= 1,
                  },
                  {
                    label: 'Interaction',
                    value: results.interactionUtil.toFixed(2),
                    icon: <FiActivity />,
                    pass: results.interactionUtil <= 1,
                  },
                  {
                    label: 'Steel Tension',
                    value: `${results.steelTension.toFixed(0)} kN`,
                    icon: <FiBox />,
                    pass: true,
                  },
                  {
                    label: 'Cone Tension',
                    value: `${results.coneTension.toFixed(0)} kN`,
                    icon: <FiLayers />,
                    pass: results.coneTension >= parseFloat(form.tensionForce),
                  },
                  {
                    label: 'Status',
                    value: results.overallStatus,
                    icon: <FiCheckCircle />,
                    pass: results.overallStatus === 'PASS',
                  },
                ].map((item, i) => (
                  <Card
                    key={i}
                    variant="glass"
                    className={cn(
                      'border-l-4',
                      item.pass ? 'border-l-green-500' : 'border-l-red-500',
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">
                          {item.icon}
                        </div>
                        <span
                          className={cn(
                            'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                            item.pass
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400',
                          )}
                        >
                          {item.pass ? 'OK' : 'FAIL'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                      <p className="text-2xl font-black text-white">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detailed Results */}
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Capacity Table */}
                  <Card
                    variant="glass"
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                  >
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiGrid className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Capacity Summary</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <ResultCard
                          label="Steel Tension"
                          value={`${results.steelTension.toFixed(1)} kN`}
                          limit="NRd,s"
                          status="pass"
                        />
                        <ResultCard
                          label="Cone Tension"
                          value={`${results.coneTension.toFixed(1)} kN`}
                          limit="NRd,c"
                          status={
                            results.coneTension >= parseFloat(form.tensionForce) ? 'pass' : 'fail'
                          }
                        />
                        <ResultCard
                          label="Pullout Tension"
                          value={`${results.pulloutTension.toFixed(1)} kN`}
                          limit="NRd,p"
                          status="pass"
                        />
                        <ResultCard
                          label="Steel Shear"
                          value={`${results.steelShear.toFixed(1)} kN`}
                          limit="VRd,s"
                          status="pass"
                        />
                        <ResultCard
                          label="Pry-out Shear"
                          value={`${results.pryConeShear.toFixed(1)} kN`}
                          limit="VRd,cp"
                          status={
                            results.pryConeShear >= parseFloat(form.shearForce) ? 'pass' : 'fail'
                          }
                        />
                        <ResultCard
                          label="Edge Shear"
                          value={`${results.edgeShear.toFixed(1)} kN`}
                          limit="VRd,c"
                          status={
                            results.edgeShear >= parseFloat(form.shearForce) ? 'pass' : 'fail'
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card
                    variant="glass"
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                  >
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiCheckCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        Design Recommendations
                      </h3>
                      <div className="space-y-3">
                        {results.interactionUtil > 0.85 && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-white">
                                High Interaction
                              </div>
                              <div className="text-xs text-gray-400">
                                Consider larger bolt diameter or additional anchors
                              </div>
                            </div>
                          </div>
                        )}
                        {results.criticalCheck === 'Concrete Cone' && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                            <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-white">
                                Cone Breakout Governs
                              </div>
                              <div className="text-xs text-gray-400">
                                Increase embedment depth or add supplementary reinforcement
                              </div>
                            </div>
                          </div>
                        )}
                        {parseFloat(form.edgeDistX) < 3 * parseFloat(form.boltDiameter) && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                            <FiInfo className="text-purple-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-white">
                                Small Edge Distance
                              </div>
                              <div className="text-xs text-gray-400">
                                Edge distance &lt; 3d — check splitting and provide hanger
                                reinforcement
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
                                ? 'Anchor group is adequate for applied loading'
                                : 'Anchor group FAILS — resize or add anchors'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column — Sticky Sidebar */}
                <div className="lg:col-span-1">
                  <div className="sticky top-8 space-y-4">
                    <Card
                      variant="glass"
                      className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400"
                    >
                      <CardContent className="py-6 text-center">
                        <div className="text-4xl mb-2 text-blue-400">
                          <FiTarget className="inline" />
                        </div>
                        <div
                          className={cn(
                            'font-bold text-lg',
                            results.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400',
                          )}
                        >
                          {results.overallStatus}
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Interaction: {results.interactionUtil.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>

                    {warnings.length > 0 && (
                      <Card variant="glass" className="border-amber-500/30">
                        <CardContent className="py-4">
                          <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <FiAlertTriangle />
                            <span className="font-medium">Design Notes</span>
                          </div>
                          <ul className="text-sm text-white space-y-1">
                            {warnings.map((w, i) => (
                              <li key={i}>• {w.message}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    <Card
                      variant="glass"
                      className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-white font-semibold">
                          Design Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bolt</span>
                          <span className="text-white">
                            M{form.boltDiameter} × {form.numberOfBolts}nr
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Embedment</span>
                          <span className="text-white">{form.embedmentDepth} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Concrete</span>
                          <span className="text-white">C{form.concreteGrade}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-700">
                          <span className="text-gray-400">Critical</span>
                          <span className="text-white">{results.criticalCheck}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* VISUALIZATION TAB */}
          {activeTab === 'visualization' && (
            <motion.div
              key="viz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <Card
                variant="glass"
                className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-white font-semibold flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-blue-400" />
                    </div>
                    <span>3D Visualization</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                    <AnchorBolt3D />
                  </Interactive3DDiagram>
                </CardContent>
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
    <div className="flex items-center justify-between mb-2">
      <ExplainableLabel
        label={label}
        field={field || 'anchor-bolt'}
        className="block text-sm font-semibold text-gray-300"
      />
      {unit && <span className="text-blue-400 text-xs">{unit}</span>}
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
      'bg-gray-900/40 backdrop-blur-md border border-gray-700/50 p-4 text-center border-l-4',
      status === 'pass' ? 'border-l-green-500' : 'border-l-red-500',
    )}
  >
    <div className="text-xs uppercase text-gray-400 mb-1 font-semibold">{label}</div>
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

export default AnchorBolt;
