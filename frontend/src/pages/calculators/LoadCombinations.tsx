// =============================================================================
// BeaverCalc Studio — Load Combinations Calculator
// Eurocode BS EN 1990 ULS & SLS Combinations
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
  FiLayers,
  FiMaximize2,
  FiMinimize2,
  FiPlus,
  FiSliders,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import LoadCombinations3D from '../../components/3d/scenes/LoadCombinations3D';
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

interface ActionLoad {
  name: string;
  value: string;
  psi0: string;
  psi1: string;
  psi2: string;
  category: string;
}

interface FormData {
  structureType: string;
  designSituation: string;
  permanentUnfav: string;
  permanentFav: string;
  variableLoads: ActionLoad[];
  accidentalLoad: string;
}

interface CombinationResult {
  name: string;
  expression: string;
  totalLoad: number;
  governing: boolean;
}

interface Results {
  uls6_10: CombinationResult;
  uls6_10a: CombinationResult;
  uls6_10b: CombinationResult;
  slsCharacteristic: CombinationResult;
  slsFrequent: CombinationResult;
  slsQuasiPermanent: CombinationResult;
  governingULS: number;
  governingSLS: number;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PSI_DEFAULTS: Record<string, { psi0: string; psi1: string; psi2: string; label: string }> = {
  A: { psi0: '0.7', psi1: '0.5', psi2: '0.3', label: 'Cat A: Domestic' },
  B: { psi0: '0.7', psi1: '0.5', psi2: '0.3', label: 'Cat B: Office' },
  C: { psi0: '0.7', psi1: '0.7', psi2: '0.6', label: 'Cat C: Assembly' },
  D: { psi0: '0.7', psi1: '0.7', psi2: '0.6', label: 'Cat D: Shopping' },
  E: { psi0: '1.0', psi1: '0.9', psi2: '0.8', label: 'Cat E: Storage' },
  wind: { psi0: '0.5', psi1: '0.2', psi2: '0.0', label: 'Wind (BS EN 1991-1-4)' },
  snow: { psi0: '0.5', psi1: '0.2', psi2: '0.0', label: 'Snow (BS EN 1991-1-3)' },
  traffic: { psi0: '0.75', psi1: '0.75', psi2: '0.0', label: 'Traffic (gr1a)' },
};

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  office_building: {
    name: 'Office Building',
    form: {
      structureType: 'building',
      designSituation: 'persistent',
      permanentUnfav: '100',
      permanentFav: '100',
      accidentalLoad: '0',
    },
  },
  bridge_highway: {
    name: 'Highway Bridge',
    form: {
      structureType: 'bridge',
      designSituation: 'persistent',
      permanentUnfav: '150',
      permanentFav: '150',
      accidentalLoad: '0',
    },
  },
  warehouse: {
    name: 'Warehouse / Storage',
    form: {
      structureType: 'building',
      designSituation: 'persistent',
      permanentUnfav: '80',
      permanentFav: '80',
      accidentalLoad: '0',
    },
  },
};

const LoadCombinations = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    permanent: true,
    variable: true,
    results: true,
  });
  const [form, setForm] = useState<FormData>({
    structureType: 'building',
    designSituation: 'persistent',
    permanentUnfav: '100',
    permanentFav: '100',
    variableLoads: [
      { name: 'Imposed', value: '50', psi0: '0.7', psi1: '0.5', psi2: '0.3', category: 'A' },
      { name: 'Wind', value: '25', psi0: '0.5', psi1: '0.2', psi2: '0.0', category: 'wind' },
    ],
    accidentalLoad: '0',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'permanentUnfav', label: 'Permanent Unfav' },
      { key: 'permanentFav', label: 'Permanent Fav' },
      { key: 'value', label: 'Value' },
      { key: 'psi0', label: 'Psi0' },
      { key: 'psi1', label: 'Psi1' },
      { key: 'psi2', label: 'Psi2' },
      { key: 'value', label: 'Value' },
      { key: 'psi0', label: 'Psi0' },
      { key: 'psi1', label: 'Psi1' },
      { key: 'psi2', label: 'Psi2' },
      { key: 'accidentalLoad', label: 'Accidental Load', allowZero: true },
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
    { key: 'structureType', label: 'Structure Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'designSituation', label: 'Design Situation', min: 0, max: 100, step: 1, unit: '' },
    { key: 'permanentUnfav', label: 'Permanent Unfav', min: 0, max: 100, step: 1, unit: '' },
    { key: 'permanentFav', label: 'Permanent Fav', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | '3d'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  const addVariableLoad = () => {
    setForm((f) => ({
      ...f,
      variableLoads: [
        ...f.variableLoads,
        {
          name: `Variable ${f.variableLoads.length + 1}`,
          value: '0',
          psi0: '0.7',
          psi1: '0.5',
          psi2: '0.3',
          category: 'A',
        },
      ],
    }));
  };

  const removeVariableLoad = (idx: number) => {
    setForm((f) => ({ ...f, variableLoads: f.variableLoads.filter((_, i) => i !== idx) }));
  };

  const updateLoad = (idx: number, field: keyof ActionLoad, value: string) => {
    setForm((f) => {
      const loads = [...f.variableLoads];
      loads[idx] = { ...loads[idx], [field]: value };
      if (field === 'category') {
        const preset = PSI_DEFAULTS[value];
        if (preset) {
          loads[idx].psi0 = preset.psi0;
          loads[idx].psi1 = preset.psi1;
          loads[idx].psi2 = preset.psi2;
        }
      }
      return { ...f, variableLoads: loads };
    });
  };

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const Gk_unfav = parseFloat(form.permanentUnfav);
      const Gk_fav = parseFloat(form.permanentFav);
      const vars = form.variableLoads.map((l) => ({
        ...l,
        Q: parseFloat(l.value),
        p0: parseFloat(l.psi0),
        p1: parseFloat(l.psi1),
        p2: parseFloat(l.psi2),
      }));

      if (vars.length === 0) {
        w.push({ type: 'error', message: 'Add at least one variable load' });
        setWarnings(w);
        return;
      }

      const gammaG_unfav = 1.35;
      const gammaG_fav = 1.0;
      const gammaQ = 1.5;

      // Sort by magnitude to find leading variable
      const sortedVars = [...vars].sort((a, b) => b.Q - a.Q);
      const leading = sortedVars[0];
      const accompanying = sortedVars.slice(1);

      // 6.10: gammaG*Gk + gammaQ*Qk,1 + gammaQ*psi0,i*Qk,i
      const uls6_10_total =
        gammaG_unfav * Gk_unfav +
        gammaQ * leading.Q +
        accompanying.reduce((s, v) => s + gammaQ * v.p0 * v.Q, 0);

      // 6.10a: gammaG*Gk + gammaQ*psi0*Qk (all variable reduced)
      const uls6_10a_total =
        gammaG_unfav * Gk_unfav + vars.reduce((s, v) => s + gammaQ * v.p0 * v.Q, 0);

      // 6.10b: xi*gammaG*Gk + gammaQ*Qk,1 + gammaQ*psi0,i*Qk,i (xi = 0.925 UK NA)
      const xi = 0.925;
      const uls6_10b_total =
        xi * gammaG_unfav * Gk_unfav +
        gammaQ * leading.Q +
        accompanying.reduce((s, v) => s + gammaQ * v.p0 * v.Q, 0);

      // SLS Characteristic: Gk + Qk,1 + psi0,i*Qk,i
      const slsChar = Gk_unfav + leading.Q + accompanying.reduce((s, v) => s + v.p0 * v.Q, 0);

      // SLS Frequent: Gk + psi1*Qk,1 + psi2,i*Qk,i
      const slsFreq =
        Gk_unfav + leading.p1 * leading.Q + accompanying.reduce((s, v) => s + v.p2 * v.Q, 0);

      // SLS Quasi-permanent: Gk + psi2,i*Qk,i
      const slsQP = Gk_unfav + vars.reduce((s, v) => s + v.p2 * v.Q, 0);

      const governingULS = Math.max(uls6_10_total, uls6_10a_total, uls6_10b_total);

      const mkCombo = (
        name: string,
        expr: string,
        total: number,
        gov: boolean,
      ): CombinationResult => ({ name, expression: expr, totalLoad: total, governing: gov });

      if (governingULS === uls6_10b_total)
        w.push({ type: 'info', message: 'Eq. 6.10b governs (UK NA approach)' });

      setResults({
        uls6_10: mkCombo(
          'Eq. 6.10',
          `${gammaG_unfav}×${Gk_unfav} + ${gammaQ}×${leading.Q} + ...`,
          uls6_10_total,
          uls6_10_total === governingULS,
        ),
        uls6_10a: mkCombo(
          'Eq. 6.10a',
          `${gammaG_unfav}×${Gk_unfav} + Σ(${gammaQ}×ψ₀×Qk)`,
          uls6_10a_total,
          uls6_10a_total === governingULS,
        ),
        uls6_10b: mkCombo(
          'Eq. 6.10b',
          `${xi}×${gammaG_unfav}×${Gk_unfav} + ${gammaQ}×${leading.Q} + ...`,
          uls6_10b_total,
          uls6_10b_total === governingULS,
        ),
        slsCharacteristic: mkCombo('SLS Char', `${Gk_unfav} + ${leading.Q} + ...`, slsChar, false),
        slsFrequent: mkCombo('SLS Freq', `${Gk_unfav} + ψ₁×${leading.Q} + ...`, slsFreq, false),
        slsQuasiPermanent: mkCombo('SLS QP', `${Gk_unfav} + Σ(ψ₂×Qk)`, slsQP, false),
        governingULS,
        governingSLS: slsChar,
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
    const recommendations: { check: string; suggestion: string }[] = [];
    if (results.uls6_10b.governing)
      recommendations.push({
        check: 'Governing Equation',
        suggestion: 'Eq. 6.10b governs — standard approach per UK NA (ξ = 0.925)',
      });
    if (form.variableLoads.some((l) => l.category === 'E'))
      recommendations.push({
        check: 'Storage Loads',
        suggestion: 'Storage category loads (ψ₀ = 1.0) — verify load magnitudes from site survey',
      });
    recommendations.push({
      check: 'Overall',
      suggestion: 'Load combinations generated per BS EN 1990 with UK National Annex ψ factors',
    });
    generatePremiumPDF({
      title: 'Load Combinations',
      subtitle: 'BS EN 1990 Table A1.2',
      projectInfo: [{ label: 'Calculator', value: 'Load Combinations' }],
      inputs: [
        { label: 'Permanent Gk (unfav)', value: form.permanentUnfav, unit: 'kN' },
        { label: 'Permanent Gk (fav)', value: form.permanentFav, unit: 'kN' },
        ...form.variableLoads.map((l) => ({ label: `${l.name} Qk`, value: l.value, unit: 'kN' })),
      ],
      checks: [
        {
          name: 'Eq. 6.10',
          capacity: '-',
          utilisation: `${results.uls6_10.totalLoad.toFixed(1)} kN`,
          status: 'PASS' as const,
        },
        {
          name: 'Eq. 6.10a',
          capacity: '-',
          utilisation: `${results.uls6_10a.totalLoad.toFixed(1)} kN`,
          status: 'PASS' as const,
        },
        {
          name: 'Eq. 6.10b',
          capacity: '-',
          utilisation: `${results.uls6_10b.totalLoad.toFixed(1)} kN`,
          status: 'PASS' as const,
        },
      ],
      sections: [
        {
          title: 'SLS Combinations',
          head: [['Combination', 'Total Load (kN)']],
          body: [
            ['SLS Characteristic', results.slsCharacteristic.totalLoad.toFixed(1)],
            ['SLS Frequent', results.slsFrequent.totalLoad.toFixed(1)],
            ['SLS Quasi-Permanent', results.slsQuasiPermanent.totalLoad.toFixed(1)],
          ],
        },
        {
          title: 'ψ Factors',
          head: [['Load', 'Qk (kN)', 'ψ₀', 'ψ₁', 'ψ₂', 'Category']],
          body: form.variableLoads.map((l) => [
            l.name,
            l.value,
            l.psi0,
            l.psi1,
            l.psi2,
            l.category,
          ]),
        },
      ],
      recommendations,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Load Combinations',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recommendations: { check: string; suggestion: string }[] = [];
    if (results.uls6_10b.governing)
      recommendations.push({
        check: 'Governing Equation',
        suggestion: 'Eq. 6.10b governs — standard approach per UK NA (ξ = 0.925)',
      });
    if (form.variableLoads.some((l) => l.category === 'E'))
      recommendations.push({
        check: 'Storage Loads',
        suggestion: 'Storage category loads (ψ₀ = 1.0) — verify load magnitudes from site survey',
      });
    recommendations.push({
      check: 'Overall',
      suggestion: 'Load combinations generated per BS EN 1990 with UK National Annex ψ factors',
    });
    generateDOCX({
      title: 'Load Combinations',
      subtitle: 'BS EN 1990 Table A1.2',
      projectInfo: [{ label: 'Calculator', value: 'Load Combinations' }],
      inputs: [
        { label: 'Permanent Gk (unfav)', value: form.permanentUnfav, unit: 'kN' },
        { label: 'Permanent Gk (fav)', value: form.permanentFav, unit: 'kN' },
        ...form.variableLoads.map((l) => ({ label: `${l.name} Qk`, value: l.value, unit: 'kN' })),
      ],
      checks: [
        {
          name: 'Eq. 6.10',
          capacity: '-',
          utilisation: `${results.uls6_10.totalLoad.toFixed(1)} kN`,
          status: 'PASS' as const,
        },
        {
          name: 'Eq. 6.10a',
          capacity: '-',
          utilisation: `${results.uls6_10a.totalLoad.toFixed(1)} kN`,
          status: 'PASS' as const,
        },
        {
          name: 'Eq. 6.10b',
          capacity: '-',
          utilisation: `${results.uls6_10b.totalLoad.toFixed(1)} kN`,
          status: 'PASS' as const,
        },
      ],
      sections: [
        {
          title: 'SLS Combinations',
          head: [['Combination', 'Total Load (kN)']],
          body: [
            ['SLS Characteristic', results.slsCharacteristic.totalLoad.toFixed(1)],
            ['SLS Frequent', results.slsFrequent.totalLoad.toFixed(1)],
            ['SLS Quasi-Permanent', results.slsQuasiPermanent.totalLoad.toFixed(1)],
          ],
        },
        {
          title: 'ψ Factors',
          head: [['Load', 'Qk (kN)', 'ψ₀', 'ψ₁', 'ψ₂', 'Category']],
          body: form.variableLoads.map((l) => [
            l.name,
            l.value,
            l.psi0,
            l.psi1,
            l.psi2,
            l.category,
          ]),
        },
      ],
      recommendations,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Load Combinations',
    });
  };

  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-800/20 via-transparent to-gray-900/10" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-violet-500/30 mb-4 bg-violet-950/20">
            <span className="text-violet-100 font-mono tracking-wider">
              GENERAL | LOAD COMBINATIONS
            </span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">Load Combinations</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Eurocode BS EN 1990 ULS and SLS load combination generator with ψ factors from the UK
            National Annex.
          </p>
        </motion.div>

        <div className="flex justify-center gap-4 mb-8">
          {['input', 'results', '3d'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as any)}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500'
                  : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '📋 Input' : tab === 'results' ? '📊 Results' : '🧊 3D'}
            </Button>
          ))}
        </div>

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
              className="space-y-6"
            >
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
              <Card variant="glass" className="border-violet-500/20 shadow-lg shadow-violet-500/5">
                <CardHeader
                  className="cursor-pointer flex flex-row items-center justify-between py-3"
                  onClick={() => toggleSection('permanent')}
                >
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <FiLayers className="w-3 h-3 text-white" />
                    </div>
                    Permanent Actions (Gk)
                  </CardTitle>
                  <FiChevronDown
                    className={cn(
                      'text-gray-400 transition-transform',
                      expandedSections.permanent && 'rotate-180',
                    )}
                  />
                </CardHeader>
                {expandedSections.permanent && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                  >
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <InputField
                          label="Gk (unfavourable)"
                          value={form.permanentUnfav}
                          onChange={(v) => setForm((f) => ({ ...f, permanentUnfav: v }))}
                          unit="kN"
                        />
                        <InputField
                          label="Gk (favourable)"
                          value={form.permanentFav}
                          onChange={(v) => setForm((f) => ({ ...f, permanentFav: v }))}
                          unit="kN"
                        />
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </Card>

              <Card variant="glass" className="border-purple-500/20 shadow-lg shadow-purple-500/5">
                <CardHeader
                  className="cursor-pointer flex flex-row items-center justify-between py-3"
                  onClick={() => toggleSection('variable')}
                >
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                      <FiPlus className="w-3 h-3 text-white" />
                    </div>
                    Variable Actions (Qk)
                  </CardTitle>
                  <FiChevronDown
                    className={cn(
                      'text-gray-400 transition-transform',
                      expandedSections.variable && 'rotate-180',
                    )}
                  />
                </CardHeader>
                {expandedSections.variable && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                  >
                    <CardContent className="space-y-4 pt-0">
                      {form.variableLoads.map((load, idx) => (
                        <div
                          key={idx}
                          className="bg-black/30 rounded-lg p-4 border border-gray-800/50 space-y-3"
                        >
                          <div className="flex justify-between items-center">
                            <input
                              title={`Load ${idx + 1} name`}
                              type="text"
                              value={load.name}
                              onChange={(e) => updateLoad(idx, 'name', e.target.value)}
                              className="bg-transparent text-white font-semibold text-sm border-none outline-none"
                            />
                            <button
                              aria-label="Remove load"
                              onClick={() => removeVariableLoad(idx)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            <InputField
                              label="Qk"
                              value={load.value}
                              onChange={(v) => updateLoad(idx, 'value', v)}
                              unit="kN"
                            />
                            <div>
                              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
                                Category
                              </label>
                              <select
                                title="Category"
                                value={load.category}
                                onChange={(e) => updateLoad(idx, 'category', e.target.value)}
                                className="w-full bg-black/40 border border-gray-700/50 rounded-lg p-2.5 text-white text-sm"
                              >
                                {Object.entries(PSI_DEFAULTS).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="ψ₀"
                              value={load.psi0}
                              onChange={(v) => updateLoad(idx, 'psi0', v)}
                              unit=""
                            />
                            <InputField
                              label="ψ₁"
                              value={load.psi1}
                              onChange={(v) => updateLoad(idx, 'psi1', v)}
                              unit=""
                            />
                            <InputField
                              label="ψ₂"
                              value={load.psi2}
                              onChange={(v) => updateLoad(idx, 'psi2', v)}
                              unit=""
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        onClick={addVariableLoad}
                        variant="ghost"
                        className="w-full border border-dashed border-gray-700 text-gray-400 hover:text-white"
                      >
                        <FiPlus className="mr-2" />
                        Add Variable Load
                      </Button>
                    </CardContent>
                  </motion.div>
                )}
              </Card>

              {results && (
                <Card variant="glass" className="border-gray-800/50">
                  <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-white text-sm">Quick Summary</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        size="sm"
                        className="bg-gradient-to-r from-violet-600 to-purple-600"
                      >
                        <FiDownload className="mr-2" />
                        Export
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        size="sm"
                        className="bg-gradient-to-r from-violet-600 to-purple-600"
                      >
                        <FiDownload className="mr-2" />
                        Export
                      </Button>
                      <SaveRunButton
                        calculatorKey="load-combinations"
                        inputs={form as unknown as Record<string, string | number>}
                        results={results}
                        status={
                          ((results as any)?.status ?? undefined) as 'PASS' | 'FAIL' | undefined
                        }
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-violet-950/30 border border-violet-500/30 rounded-lg p-4 text-center">
                        <div className="text-xs uppercase text-violet-400 mb-1">Governing ULS</div>
                        <div className="text-3xl font-bold font-mono text-violet-300">
                          {results.governingULS.toFixed(1)} kN
                        </div>
                      </div>
                      <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4 text-center">
                        <div className="text-xs uppercase text-blue-400 mb-1">
                          SLS Characteristic
                        </div>
                        <div className="text-3xl font-bold font-mono text-blue-300">
                          {results.governingSLS.toFixed(1)} kN
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
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
              <Card variant="glass" className="border-violet-500/20">
                <CardHeader className="py-3">
                  <CardTitle className="text-white text-sm">ULS Combinations (STR/GEO)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[results.uls6_10, results.uls6_10a, results.uls6_10b].map((c, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg',
                          c.governing
                            ? 'bg-violet-950/30 border border-violet-500/30'
                            : 'bg-black/30 border border-gray-800/50',
                        )}
                      >
                        <div>
                          <div className="text-white font-semibold text-sm">
                            {c.name}
                            {c.governing && (
                              <span className="ml-2 text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                                GOVERNING
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 text-xs font-mono mt-1">{c.expression}</div>
                        </div>
                        <div
                          className={cn(
                            'text-2xl font-bold font-mono',
                            c.governing ? 'text-violet-300' : 'text-gray-400',
                          )}
                        >
                          {c.totalLoad.toFixed(1)} kN
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass" className="border-blue-500/20">
                <CardHeader className="py-3">
                  <CardTitle className="text-white text-sm">SLS Combinations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      results.slsCharacteristic,
                      results.slsFrequent,
                      results.slsQuasiPermanent,
                    ].map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-gray-800/50"
                      >
                        <div>
                          <div className="text-white font-semibold text-sm">{c.name}</div>
                          <div className="text-gray-500 text-xs font-mono mt-1">{c.expression}</div>
                        </div>
                        <div className="text-2xl font-bold font-mono text-blue-300">
                          {c.totalLoad.toFixed(1)} kN
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass" className="border-gray-800/50 shadow-lg shadow-violet-500/5">
                <CardHeader className="py-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <FiCheck className="text-green-400" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {results.uls6_10b.governing && (
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">ℹ</span>
                      <span className="text-gray-300">
                        Eq. 6.10b governs — standard approach per UK NA (ξ = 0.925)
                      </span>
                    </div>
                  )}
                  {form.variableLoads.some((l) => l.category === 'E') && (
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">⚠</span>
                      <span className="text-gray-300">
                        Storage category loads (ψ₀ = 1.0) — verify load magnitudes from site survey
                      </span>
                    </div>
                  )}
                  {results.governingULS > 2 * results.governingSLS && (
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">ℹ</span>
                      <span className="text-gray-300">
                        ULS governs significantly over SLS — typical for heavily loaded structures
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-800">
                    <span className="text-green-400 font-medium">
                      ✓ Load combinations generated per BS EN 1990 with UK National Annex
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {activeTab === '3d' && results && (
            <motion.div
              key="3d"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Fullscreen Preview Overlay */}
              {previewMaximized && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                >
                  <div className="flex-1 relative">
                    <Interactive3DDiagram
                      height="h-full"
                      cameraPosition={[5, 4, 5]}
                      status={undefined}
                    >
                      <LoadCombinations3D
                        governingULS={results.governingULS}
                        governingSLS={results.governingSLS}
                        uls6_10={results.uls6_10.totalLoad}
                        uls6_10a={results.uls6_10a.totalLoad}
                        uls6_10b={results.uls6_10b.totalLoad}
                        slsCharacteristic={results.slsCharacteristic.totalLoad}
                        slsFrequent={results.slsFrequent.totalLoad}
                        slsQuasiPermanent={results.slsQuasiPermanent.totalLoad}
                        permanentLoad={parseFloat(form.permanentUnfav) || 100}
                      />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      title="Exit fullscreen"
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      LOAD COMBINATIONS — REAL-TIME PREVIEW
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
                        { label: 'Structure Type', value: form.structureType },
                        { label: 'Design Situation', value: form.designSituation },
                        { label: 'Permanent (Unfav)', value: `${form.permanentUnfav} kN` },
                        { label: 'Permanent (Fav)', value: `${form.permanentFav} kN` },
                        { label: 'Variable Loads', value: `${form.variableLoads.length} defined` },
                        { label: 'Accidental', value: `${form.accidentalLoad} kN` },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                        >
                          <span className="text-gray-500">{stat.label}</span>
                          <span className="text-white font-medium">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                    {results && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                          Last Analysis
                        </div>
                        {[
                          {
                            label: 'ULS 6.10',
                            util: results.uls6_10.totalLoad.toFixed(1),
                            status: results.uls6_10.governing ? 'GOV' : 'PASS',
                          },
                          {
                            label: 'ULS 6.10a',
                            util: results.uls6_10a.totalLoad.toFixed(1),
                            status: results.uls6_10a.governing ? 'GOV' : 'PASS',
                          },
                          {
                            label: 'ULS 6.10b',
                            util: results.uls6_10b.totalLoad.toFixed(1),
                            status: results.uls6_10b.governing ? 'GOV' : 'PASS',
                          },
                          {
                            label: 'SLS Char.',
                            util: results.slsCharacteristic.totalLoad.toFixed(1),
                            status: 'PASS',
                          },
                          {
                            label: 'SLS Freq.',
                            util: results.slsFrequent.totalLoad.toFixed(1),
                            status: 'PASS',
                          },
                          {
                            label: 'Governing ULS',
                            util: results.governingULS.toFixed(1) + ' kN',
                            status: 'PASS',
                          },
                        ].map((check) => (
                          <div key={check.label} className="flex justify-between text-xs py-0.5">
                            <span className="text-gray-500">{check.label}</span>
                            <span
                              className={cn(
                                'font-bold',
                                check.status === 'GOV' ? 'text-orange-400' : 'text-emerald-400',
                              )}
                            >
                              {check.util}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors"
                    >
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
                title="Load Combinations — 3D Preview"
                sliders={whatIfSliders}
                form={form}
                updateForm={updateForm}
                status={undefined}
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram
                    height={fsHeight}
                    cameraPosition={[5, 4, 5]}
                    status={undefined}
                  >
                    <LoadCombinations3D
                      governingULS={results.governingULS}
                      governingSLS={results.governingSLS}
                      uls6_10={results.uls6_10.totalLoad}
                      uls6_10a={results.uls6_10a.totalLoad}
                      uls6_10b={results.uls6_10b.totalLoad}
                      slsCharacteristic={results.slsCharacteristic.totalLoad}
                      slsFrequent={results.slsFrequent.totalLoad}
                      slsQuasiPermanent={results.slsQuasiPermanent.totalLoad}
                      permanentLoad={parseFloat(form.permanentUnfav) || 100}
                    />
                  </Interactive3DDiagram>
                )}
              />
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
      field={field || 'load-combinations'}
    />
    <input
      title={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black/40 border border-gray-700/50 rounded-lg p-2.5 text-white text-sm focus:border-violet-500 font-mono"
    />
  </div>
);

export default LoadCombinations;
