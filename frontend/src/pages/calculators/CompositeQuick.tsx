// =============================================================================
// Composite Quick Check — Premium Version
// EN 1994-1-1 simplified composite beam check
// =============================================================================
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import CompositeBeam3D from '../../components/3d/scenes/CompositeBeam3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

interface CompositeForm {
  steelSection: string;
  steelDepth: string;
  steelWidth: string;
  steelArea: string;
  steelIy: string;
  steelWy: string;
  fy: string;
  slabDepth: string;
  slabWidth: string;
  fck: string;
  span: string;
  udl: string;
  loadType: string;
  pointLoad: string;
  interactionDegree: string;
  projectName: string;
  reference: string;
}
interface CompositeResults {
  MplRd_steel: number;
  MplRd_composite: number;
  MEd: number;
  VEd: number;
  na_position: number;
  bendingUtil: number;
  deflection_bare: number;
  deflection_composite: number;
  deflLimit: number;
  deflUtil: number;
  requiredStuds: number;
  maxUtil: number;
  bendingStatus: string;
  deflectionStatus: string;
  status: string;
  criticalCheck: string;
}

const STEEL_SECTIONS: Record<
  string,
  { name: string; d: number; b: number; A: number; Iy: number; Wy: number }
> = {
  '254x146x31': { name: '254×146×31 UB', d: 251.4, b: 146.1, A: 3960, Iy: 4413e4, Wy: 351e3 },
  '305x165x40': { name: '305×165×40 UB', d: 303.4, b: 165, A: 5130, Iy: 8503e4, Wy: 560e3 },
  '356x171x51': { name: '356×171×51 UB', d: 355, b: 171.5, A: 6490, Iy: 14136e4, Wy: 796e3 },
  '406x178x60': { name: '406×178×60 UB', d: 406.4, b: 177.9, A: 7640, Iy: 21596e4, Wy: 1063e3 },
  '457x191x67': { name: '457×191×67 UB', d: 453.4, b: 189.9, A: 8550, Iy: 29380e4, Wy: 1296e3 },
  '533x210x82': { name: '533×210×82 UB', d: 528.3, b: 208.8, A: 10450, Iy: 47540e4, Wy: 1800e3 },
  '610x229x101': { name: '610×229×101 UB', d: 602.6, b: 227.6, A: 12900, Iy: 75780e4, Wy: 2515e3 },
};

const PRESETS: Record<string, { name: string; form: Partial<CompositeForm> }> = {
  highway_10m: {
    name: '🛣️ Highway Overbridge (10m)',
    form: {
      steelSection: '533x210x82',
      span: '10',
      udl: '16',
      slabDepth: '200',
      slabWidth: '3650',
      interactionDegree: '100',
    },
  },
  highway_12m: {
    name: '🛣️ Highway Bridge (12m)',
    form: {
      steelSection: '610x229x101',
      span: '12',
      udl: '16',
      slabDepth: '200',
      slabWidth: '3650',
      interactionDegree: '100',
    },
  },
  footbridge: {
    name: '🚶 Footbridge (8m)',
    form: {
      steelSection: '356x171x51',
      span: '8',
      udl: '8.5',
      slabDepth: '150',
      slabWidth: '2500',
      interactionDegree: '100',
    },
  },
  rail_bridge: {
    name: '🚂 Rail Bridge (10m)',
    form: {
      steelSection: '610x229x101',
      span: '10',
      udl: '28',
      slabDepth: '250',
      slabWidth: '3500',
      interactionDegree: '100',
    },
  },
  integral: {
    name: '🌉 Integral Bridge (9m)',
    form: {
      steelSection: '457x191x67',
      span: '9',
      udl: '15.5',
      slabDepth: '200',
      slabWidth: '3650',
      interactionDegree: '100',
    },
  },
};

const CompositeQuick: React.FC = () => {
  const [form, setForm] = useState<CompositeForm>({
    steelSection: '406x178x60',
    steelDepth: '406.4',
    steelWidth: '177.9',
    steelArea: '7640',
    steelIy: '21596',
    steelWy: '1063',
    fy: '355',
    slabDepth: '130',
    slabWidth: '3000',
    fck: '30',
    span: '7.5',
    udl: '8',
    loadType: 'udl',
    pointLoad: '50',
    interactionDegree: '100',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'steelDepth', label: 'Steel Depth' },
  { key: 'steelWidth', label: 'Steel Width' },
  { key: 'steelArea', label: 'Steel Area' },
  { key: 'steelIy', label: 'Steel Iy' },
  { key: 'steelWy', label: 'Steel Wy' },
  { key: 'fy', label: 'Fy' },
  { key: 'slabDepth', label: 'Slab Depth' },
  { key: 'slabWidth', label: 'Slab Width' },
  { key: 'fck', label: 'Fck' },
  { key: 'span', label: 'Span' },
  { key: 'udl', label: 'Udl' },
  { key: 'pointLoad', label: 'Point Load' },
  { key: 'interactionDegree', label: 'Interaction Degree' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'steelSection', label: 'Steel Section', min: 0, max: 100, step: 1, unit: '' },
    { key: 'steelDepth', label: 'Steel Depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'steelWidth', label: 'Steel Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'steelArea', label: 'Steel Area', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<CompositeResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    steel: true,
    slab: true,
    loading: true,
    interaction: false,
  });
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const updateForm = (field: keyof CompositeForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  const onSectionChange = (key: string) => {
    const s = STEEL_SECTIONS[key];
    if (s)
      setForm((p) => ({
        ...p,
        steelSection: key,
        steelDepth: s.d.toString(),
        steelWidth: s.b.toString(),
        steelArea: s.A.toString(),
        steelIy: (s.Iy / 1e4).toString(),
        steelWy: (s.Wy / 1e3).toString(),
      }));
  };
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) {
      setForm((prev) => ({ ...prev, ...p.form }));
      if (p.form.steelSection) onSectionChange(p.form.steelSection);
    }
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const fy = parseFloat(form.fy);
    const fck = parseFloat(form.fck);
    const As = parseFloat(form.steelArea); // mm²
    const ds = parseFloat(form.steelDepth);
    const Iy_s = parseFloat(form.steelIy) * 1e4; // mm⁴
    const Wy_s = parseFloat(form.steelWy) * 1e3; // mm³
    const hc = parseFloat(form.slabDepth); // mm
    const beff = parseFloat(form.slabWidth); // mm
    const L = parseFloat(form.span) * 1000; // mm
    const eta = parseFloat(form.interactionDegree) / 100;
    const gammaM0 = 1.0;
    const gammaC = 1.5;
    const Es = 210000;
    const Ec = 33000;

    // Bare steel moment capacity
    const MplRd_steel = (Wy_s * fy) / (gammaM0 * 1e6); // kNm

    // Concrete compression force
    const Fc = (0.85 * fck * beff * hc) / (gammaC * 1000); // kN
    const Fs = (As * fy) / (gammaM0 * 1000); // kN
    const Fsc = Math.min(Fc, Fs); // Smaller governs

    // NA within slab or steel
    const na_position = Fsc <= Fc ? (Fsc * 1000 * gammaC) / (0.85 * fck * beff) : hc; // mm into slab

    // Composite moment (full interaction)
    const leverArm = ds / 2 + hc - na_position / 2;
    const MplRd_composite_full = (Fsc * leverArm) / 1000; // kNm
    const MplRd_composite = MplRd_steel + eta * (MplRd_composite_full - MplRd_steel);

    // Applied loads
    const wLoad = parseFloat(form.udl);
    const MEd = (wLoad * (L / 1000) * (L / 1000)) / 8;
    const VEd = (wLoad * (L / 1000)) / 2;

    // Utilisation
    const bendingUtil = (MEd / MplRd_composite) * 100;

    // Deflection
    const n = Es / Ec; // modular ratio
    const Ac_eff = (beff * hc) / n;
    const ybar = ((As * ds) / 2 + Ac_eff * (ds + hc / 2)) / (As + Ac_eff);
    const Iy_c =
      Iy_s +
      As * Math.pow(ds / 2 - ybar, 2) +
      (beff * Math.pow(hc, 3)) / (12 * n) +
      Ac_eff * Math.pow(ds + hc / 2 - ybar, 2);
    const deflection_bare = ((5 * wLoad * Math.pow(L, 4)) / (384 * Es * Iy_s)) * 1e-3; // mm
    const deflection_composite = ((5 * wLoad * Math.pow(L, 4)) / (384 * Es * Iy_c)) * 1e-3; // mm
    const deflLimit = L / 360;
    const deflUtil = (deflection_composite / deflLimit) * 100;

    // Shear studs (19mm dia, PRd ≈ 73kN per stud for C30)
    const PRd = 73; // kN typical
    const requiredStuds = Math.ceil((Fsc * eta) / PRd) * 2; // both halves of beam

    const maxUtil = Math.max(bendingUtil, deflUtil);
    const criticalCheck = bendingUtil >= deflUtil ? 'Bending' : 'Deflection';
    const status = maxUtil <= 100 ? 'PASS' : 'FAIL';

    if (eta < 0.4) w.push('Interaction degree <40% — minimum per EN 1994-1-1');
    if (bendingUtil > 90 && bendingUtil <= 100)
      w.push('Bending utilisation >90% — limited reserve');
    if ((L / 1000 / ds) * 1000 > 25)
      w.push('Span/depth ratio >25 — check construction stage deflection');

    setResults({
      MplRd_steel,
      MplRd_composite,
      MEd,
      VEd,
      na_position,
      bendingUtil,
      deflection_bare,
      deflection_composite,
      deflLimit,
      deflUtil,
      requiredStuds,
      maxUtil,
      bendingStatus: bendingUtil <= 100 ? 'PASS' : 'FAIL',
      deflectionStatus: deflUtil <= 100 ? 'PASS' : 'FAIL',
      status,
      criticalCheck,
    });
    setWarnings(w);
  }, [form]);

  useEffect(() => {
    const t = setTimeout(calculate, 300);
    return () => clearTimeout(t);
  }, [calculate]);

  const exportPDF = async () => {
    if (!results) return;
    const sec = STEEL_SECTIONS[form.steelSection];
    const recs: { check: string; suggestion: string }[] = [];
    if (results.bendingUtil > 85)
      recs.push({ check: 'Bending', suggestion: 'Near capacity — consider next section size up' });
    if (results.deflUtil > 80)
      recs.push({
        check: 'Deflection',
        suggestion: 'High deflection — increase section depth or use propped construction',
      });
    if (parseFloat(form.interactionDegree) < 50)
      recs.push({
        check: 'Interaction',
        suggestion: 'Low interaction degree — verify minimum stud requirements per EN 1994-1-1',
      });
    if (results.requiredStuds > 40)
      recs.push({
        check: 'Shear Studs',
        suggestion: `${results.requiredStuds} studs required — check spacing and edge distances`,
      });
    try {
      await generatePremiumPDF({
        title: 'Composite Quick Check',
        subtitle: sec?.name || form.steelSection,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Ref', value: form.reference || '-' },
          { label: 'Code', value: 'EN 1994-1-1' },
        ],
        inputs: [
          { label: 'Steel Section', value: sec?.name || form.steelSection },
          { label: 'Slab', value: `${form.slabDepth}mm deep, ${form.slabWidth}mm wide` },
          { label: 'Span', value: form.span, unit: 'm' },
          { label: 'UDL', value: form.udl, unit: 'kN/m' },
          { label: 'Interaction', value: form.interactionDegree, unit: '%' },
        ],
        tables: [
          {
            title: 'Design Checks',
            head: [['Check', 'Applied', 'Capacity', 'Util', 'Status']],
            body: [
              [
                'Bending',
                `${results.MEd.toFixed(0)} kNm`,
                `${results.MplRd_composite.toFixed(0)} kNm`,
                `${results.bendingUtil.toFixed(1)}%`,
                results.bendingStatus,
              ],
              [
                'Deflection',
                `${results.deflection_composite.toFixed(1)} mm`,
                `${results.deflLimit.toFixed(1)} mm`,
                `${results.deflUtil.toFixed(1)}%`,
                results.deflectionStatus,
              ],
              ['Shear Studs', `${results.requiredStuds} nr`, '-', '-', 'INFO'],
            ],
          },
        ],
        checks: [
          {
            name: 'Bending',
            capacity: `${results.MplRd_composite.toFixed(0)} kNm`,
            utilisation: `${results.bendingUtil.toFixed(1)}%`,
            status: results.bendingStatus as 'PASS' | 'FAIL',
          },
          {
            name: 'Deflection',
            capacity: `L/360`,
            utilisation: `${results.deflUtil.toFixed(1)}%`,
            status: results.deflectionStatus as 'PASS' | 'FAIL',
          },
        ],
        sections: [
          {
            title: 'Section Properties',
            head: [['Property', 'Value']],
            body: [
              ['MplRd (steel)', `${results.MplRd_steel.toFixed(0)} kNm`],
              ['MplRd (composite)', `${results.MplRd_composite.toFixed(0)} kNm`],
              ['NA depth', `${results.na_position.toFixed(1)} mm`],
              ['δ bare', `${results.deflection_bare.toFixed(1)} mm`],
              ['δ composite', `${results.deflection_composite.toFixed(1)} mm`],
            ],
          },
        ],
        recommendations: recs,
        warnings,
        footerNote: 'BeaverCalc Studio — EN 1994-1-1 Composite Quick Check',
      });
    } catch (e) {
      console.error(e);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    const sec = STEEL_SECTIONS[form.steelSection];
    generateDOCX({
      title: 'Composite Quick Check',
      subtitle: sec?.name || form.steelSection,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
      ],
      inputs: [
        { label: 'Steel Section', value: sec?.name || form.steelSection },
        { label: 'Slab Depth', value: form.slabDepth, unit: 'mm' },
        { label: 'Slab Width', value: form.slabWidth, unit: 'mm' },
        { label: 'Span', value: form.span, unit: 'm' },
        { label: 'UDL', value: form.udl, unit: 'kN/m' },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `${results.MplRd_composite.toFixed(0)} kNm`,
          utilisation: `${results.bendingUtil.toFixed(1)}%`,
          status: results.bendingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: 'L/360',
          utilisation: `${results.deflUtil.toFixed(1)}%`,
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio — Composite Quick Check',
    });
  };

  const Section: React.FC<{
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    children: React.ReactNode;
  }> = ({ id, title, icon, color, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border overflow-hidden shadow-2xl bg-gray-800/20 backdrop-blur-md', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-700/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
            {icon}
          </div>
          <span className="text-xl font-bold text-white">{title}</span>
        </div>
        {expandedSections[id] ? (
          <FiChevronDown className="text-gray-400" />
        ) : (
          <FiChevronRight className="text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {expandedSections[id] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-gray-800/30"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
  const InputField: React.FC<{
    label: string;
    field: keyof CompositeForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title={label}
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="relative z-20 max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1994-1-1</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-4">
            Composite Quick Check
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Simplified composite steel-concrete beam check with shear stud requirements
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 max-w-2xl mx-auto">
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

        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="Project" field="projectName" type="text" />
              <InputField label="Reference" field="reference" type="text" />
            </div>
          </CardContent>
        </Card>
        <WhatIfPreview
          title="Composite Quick — 3D Preview"
          sliders={whatIfSliders}
          form={form}
          updateForm={updateForm}
          status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
          renderScene={(fsHeight) => (
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardContent className="p-4">
                <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                  <CompositeBeam3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          )}
        />
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-4">
                <Section
                  id="steel"
                  title="Steel Section"
                  icon={<FiLayers className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Steel Section</label>
                      <select
                        value={form.steelSection}
                        onChange={(e) => onSectionChange(e.target.value)}
                        title="Steel Section"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(STEEL_SECTIONS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Yield Strength fy" field="fy" unit="MPa" />
                    <InputField label="Depth" field="steelDepth" unit="mm" />
                    <InputField label="Width" field="steelWidth" unit="mm" />
                  </div>
                </Section>
                <Section
                  id="slab"
                  title="Concrete Slab"
                  icon={<FiSettings className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Slab Depth" field="slabDepth" unit="mm" />
                    <InputField label="Effective Width" field="slabWidth" unit="mm" />
                    <InputField label="Concrete fck" field="fck" unit="MPa" />
                  </div>
                </Section>
                <Section
                  id="loading"
                  title="Loading"
                  icon={<FiSettings className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Span" field="span" unit="m" />
                    <InputField label="Total UDL" field="udl" unit="kN/m" />
                  </div>
                </Section>
                <Section
                  id="interaction"
                  title="Shear Interaction"
                  icon={<FiSettings className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Degree of Interaction" field="interactionDegree" unit="%" />
                  </div>
                </Section>
                {/* Calculate Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-2xl hover:shadow-neon-cyan/25 transition-all duration-300"
                >
                  ⚡ RUN FULL ANALYSIS
                </motion.button>
              </div>
              <div className="space-y-4 sticky top-8">
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
                        <CompositeBeam3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        title="Close fullscreen"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        COMPOSITE QUICK — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        { label: 'Steel Section', value: form.steelSection },
                        { label: 'Span', value: `${form.span} m` },
                        { label: 'UDL', value: `${form.udl} kN/m` },
                        { label: 'Slab Depth', value: `${form.slabDepth} mm` },
                        { label: 'Slab Width', value: `${form.slabWidth} mm` },
                        { label: 'fy', value: `${form.fy} MPa` },
                        { label: 'Interaction', value: `${form.interactionDegree}%` },
                      ].map((p) => (
                        <div key={p.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                          <span className="text-gray-500">{p.label}</span>
                          <span className="text-white font-medium">{p.value}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                          <FiActivity size={14} /> Live Readout
                        </h3>
                        {[
                          { label: 'Bending Util', value: results ? `${results.bendingUtil.toFixed(1)}%` : '—' },
                          { label: 'Deflection Util', value: results ? `${results.deflUtil.toFixed(1)}%` : '—' },
                          { label: 'Max Util', value: results ? `${results.maxUtil.toFixed(1)}%` : '—' },
                          { label: 'MEd', value: results ? `${results.MEd.toFixed(1)} kNm` : '—' },
                          { label: 'MplRd (comp)', value: results ? `${results.MplRd_composite.toFixed(1)} kNm` : '—' },
                          { label: 'Required Studs', value: results ? `${results.requiredStuds}` : '—' },
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
                            { label: 'Bending', util: results.bendingUtil.toFixed(1), status: results.bendingStatus },
                            { label: 'Deflection', util: results.deflUtil.toFixed(1), status: results.deflectionStatus },
                          ].map((check) => (
                            <div key={check.label} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-500">{check.label}</span>
                              <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util || '0')) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                                {check.util}%
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
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                      <FiLayers className="w-4 h-4 text-neon-cyan" /> 3D Preview
                    </CardTitle>
                    <button
                      onClick={() => setPreviewMaximized(true)}
                      className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                      title="Fullscreen preview"
                    >
                      <FiMaximize2 size={16} />
                    </button>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Interactive3DDiagram height="350px" cameraPosition={[8, 6, 8]}>
                      <CompositeBeam3D />
                    </Interactive3DDiagram>
                  </CardContent>
                </Card>
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <Card
                      variant="glass"
                      className={cn(
                        'border-l-4 shadow-2xl',
                        results.status === 'PASS'
                          ? 'border-l-green-500 border-green-500/30 shadow-green-500/10'
                          : 'border-l-red-500 border-red-500/30 shadow-red-500/10',
                      )}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {results.status === 'PASS' ? (
                            <FiCheck className="w-6 h-6 text-green-400" />
                          ) : (
                            <FiAlertTriangle className="w-6 h-6 text-red-400" />
                          )}
                          <span
                            className={cn(
                              'text-2xl font-bold',
                              results.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {results.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          Max Util: {results.maxUtil.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Critical: {results.criticalCheck}</p>
                      </CardContent>
                    </Card>
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl border-l-4 border-l-amber-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { name: 'Bending', util: results.bendingUtil },
                          { name: 'Deflection', util: results.deflUtil },
                        ].map((c) => (
                          <div key={c.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">{c.name}</span>
                              <span className={c.util <= 100 ? 'text-green-400' : 'text-red-400'}>
                                {c.util.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(c.util, 100)}%` }}
                                className={cn(
                                  'h-full rounded-full',
                                  c.util <= 70
                                    ? 'bg-green-500'
                                    : c.util <= 90
                                      ? 'bg-emerald-500'
                                      : c.util <= 100
                                        ? 'bg-amber-500'
                                        : 'bg-red-500',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl border-l-4 border-l-neon-cyan">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Results</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">MRd (comp)</p>
                          <p className="text-white font-mono">
                            {results.MplRd_composite.toFixed(0)} kNm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">MEd</p>
                          <p className="text-white font-mono">{results.MEd.toFixed(0)} kNm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">δ (comp)</p>
                          <p className="text-white font-mono">
                            {results.deflection_composite.toFixed(1)} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">δ (bare)</p>
                          <p className="text-white font-mono">
                            {results.deflection_bare.toFixed(1)} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Studs Req'd</p>
                          <p className="text-white font-mono text-lg">{results.requiredStuds} nr</p>
                        </div>
                        <div>
                          <p className="text-gray-500">NA depth</p>
                          <p className="text-white font-mono">
                            {results.na_position.toFixed(1)} mm
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    {warnings.length > 0 && (
                      <Card variant="glass" className="border-l-4 border-l-amber-500 border-amber-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FiAlertTriangle className="text-amber-400" />
                            <span className="text-amber-400 font-medium">Warnings</span>
                          </div>
                          <ul className="space-y-1">
                            {warnings.map((w, i) => (
                              <li key={i} className="text-sm text-amber-200/80">
                                • {w}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> Export PDF Report
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> DOCX
                      </Button>
                      <SaveRunButton calculatorKey="composite-quick" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CompositeQuick;
