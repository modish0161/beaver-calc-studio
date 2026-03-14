// =============================================================================
// C24/C16 Timber Member Calculator — Premium Version
// EN 1995-1-1 (Eurocode 5) timber bending and shear checks
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
import TimberMember3D from '../../components/3d/scenes/TimberMember3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { TIMBER_GRADES as _TIMBER_LIB, TIMBER_KMOD } from '../../data/materialGrades';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

interface TimberMemberForm {
  gradeClass: string;
  width: string;
  depth: string;
  span: string;
  loadType: string;
  udl: string;
  pointLoad: string;
  pointLoadPos: string;
  serviceClass: string;
  loadDuration: string;
  lateralRestraint: string;
  projectName: string;
  reference: string;
}
interface TimberMemberResults {
  fm_k: number;
  fv_k: number;
  E_mean: number;
  kmod: number;
  gamma_M: number;
  fm_d: number;
  fv_d: number;
  Iy: number;
  Wy: number;
  A: number;
  MEd: number;
  VEd: number;
  sigma_m: number;
  tau: number;
  bendingUtil: number;
  shearUtil: number;
  deflection: number;
  deflectionLimit: number;
  deflectionUtil: number;
  maxUtil: number;
  bendingStatus: string;
  shearStatus: string;
  deflectionStatus: string;
  status: string;
  criticalCheck: string;
}

const TIMBER_GRADES: Record<
  string,
  { name: string; fm_k: number; fv_k: number; E_mean: number; rho_k: number }
> = Object.fromEntries(
  Object.entries(_TIMBER_LIB).map(([k, v]) => [k, { name: v.name, fm_k: v.fm_k, fv_k: v.fv_k, E_mean: v.E_mean, rho_k: v.rho_k }])
);
const KMOD: Record<string, Record<string, number>> = {
  permanent: TIMBER_KMOD.permanent,
  long: TIMBER_KMOD.long_term,
  medium: TIMBER_KMOD.medium_term,
  short: TIMBER_KMOD.short_term,
  instantaneous: TIMBER_KMOD.instantaneous,
};

const PRESETS: Record<string, { name: string; form: Partial<TimberMemberForm> }> = {
  floor_joist: {
    name: 'Floor Joist (C24 47×200)',
    form: {
      gradeClass: 'C24',
      width: '47',
      depth: '200',
      span: '4.0',
      loadType: 'udl',
      udl: '3.5',
      serviceClass: '1',
      loadDuration: 'medium',
    },
  },
  rafter: {
    name: 'Roof Rafter (C16 47×150)',
    form: {
      gradeClass: 'C16',
      width: '47',
      depth: '150',
      span: '3.5',
      loadType: 'udl',
      udl: '2.5',
      serviceClass: '1',
      loadDuration: 'short',
    },
  },
  lintel: {
    name: 'Lintel (C24 100×200)',
    form: {
      gradeClass: 'C24',
      width: '100',
      depth: '200',
      span: '2.4',
      loadType: 'udl',
      udl: '8',
      serviceClass: '1',
      loadDuration: 'medium',
    },
  },
  temp_beam: {
    name: 'Temp Works Beam (C24 100×250)',
    form: {
      gradeClass: 'C24',
      width: '100',
      depth: '250',
      span: '3.0',
      loadType: 'udl',
      udl: '12',
      serviceClass: '2',
      loadDuration: 'short',
    },
  },
  trench_strut: {
    name: 'Trench Strut (C16 100×100)',
    form: {
      gradeClass: 'C16',
      width: '100',
      depth: '100',
      span: '2.5',
      loadType: 'point',
      pointLoad: '5',
      pointLoadPos: '1.25',
      serviceClass: '2',
      loadDuration: 'short',
    },
  },
};

const TimberMember: React.FC = () => {
  const [form, setForm] = useState<TimberMemberForm>({
    gradeClass: 'C24',
    width: '47',
    depth: '200',
    span: '4.0',
    loadType: 'udl',
    udl: '3.5',
    pointLoad: '5',
    pointLoadPos: '2.0',
    serviceClass: '1',
    loadDuration: 'medium',
    lateralRestraint: 'full',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'width', label: 'Width' },
  { key: 'depth', label: 'Depth' },
  { key: 'span', label: 'Span' },
  { key: 'udl', label: 'Udl' },
  { key: 'pointLoad', label: 'Point Load' },
  { key: 'pointLoadPos', label: 'Point Load Pos' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'gradeClass', label: 'Grade Class', min: 0, max: 100, step: 1, unit: '' },
    { key: 'width', label: 'Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'depth', label: 'Depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'span', label: 'Span', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<TimberMemberResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    section: true,
    loading: true,
    factors: false,
  });

  const updateForm = (field: keyof TimberMemberForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const grade = TIMBER_GRADES[form.gradeClass];
    if (!grade) return;
    const b = parseFloat(form.width);
    const d = parseFloat(form.depth);
    const L = parseFloat(form.span) * 1000; // mm
    const sc = form.serviceClass;
    const kmod = KMOD[form.loadDuration]?.[sc] || 0.8;
    const gamma_M = 1.3;

    const A = b * d;
    const Iy = (b * d * d * d) / 12;
    const Wy = (b * d * d) / 6;
    const fm_d = (grade.fm_k * kmod) / gamma_M;
    const fv_d = (grade.fv_k * kmod) / gamma_M;

    let MEd: number, VEd: number, delta: number;
    if (form.loadType === 'udl') {
      const w_load = parseFloat(form.udl); // kN/m
      MEd = (w_load * (L / 1000) * (L / 1000)) / 8; // kNm
      VEd = (w_load * (L / 1000)) / 2; // kN
      delta = ((5 * w_load * Math.pow(L, 4)) / (384 * grade.E_mean * Iy)) * 1e6; // mm (w in N/mm)
    } else {
      const P = parseFloat(form.pointLoad); // kN
      const a = parseFloat(form.pointLoadPos) * 1000; // mm
      const bPos = L - a;
      MEd = (P * a * bPos) / (L * 1000); // kNm
      VEd = Math.max((P * bPos) / L, (P * a) / L); // kN
      delta = (P * 1000 * a * a * bPos * bPos) / (3 * grade.E_mean * Iy * L); // mm
    }

    const sigma_m = (MEd * 1e6) / Wy; // N/mm² = MPa
    const tau = (1.5 * VEd * 1000) / A; // N/mm²
    const bendingUtil = (sigma_m / fm_d) * 100;
    const shearUtil = (tau / fv_d) * 100;
    const deflectionLimit = L / 300; // mm
    const deflectionUtil = (delta / deflectionLimit) * 100;
    const maxUtil = Math.max(bendingUtil, shearUtil, deflectionUtil);
    const criticalCheck =
      bendingUtil >= shearUtil && bendingUtil >= deflectionUtil
        ? 'Bending'
        : shearUtil >= deflectionUtil
          ? 'Shear'
          : 'Deflection';
    const status = maxUtil <= 100 ? 'PASS' : 'FAIL';

    if (d / b > 7) w.push('Depth/width ratio >7 — check lateral torsional buckling');
    if (sigma_m > grade.fm_k * 0.9) w.push('Bending stress approaching characteristic strength');
    if (delta > L / 200) w.push('Deflection exceeds L/200 — may cause visible sagging');

    setResults({
      fm_k: grade.fm_k,
      fv_k: grade.fv_k,
      E_mean: grade.E_mean,
      kmod,
      gamma_M,
      fm_d,
      fv_d,
      Iy,
      Wy,
      A,
      MEd,
      VEd,
      sigma_m,
      tau,
      bendingUtil,
      shearUtil,
      deflection: delta,
      deflectionLimit,
      deflectionUtil,
      maxUtil,
      bendingStatus: bendingUtil <= 100 ? 'PASS' : 'FAIL',
      shearStatus: shearUtil <= 100 ? 'PASS' : 'FAIL',
      deflectionStatus: deflectionUtil <= 100 ? 'PASS' : 'FAIL',
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
    const grade = TIMBER_GRADES[form.gradeClass];
    try {
      await generatePremiumPDF({
        title: 'Timber Member Design',
        subtitle: `${grade?.name} ${form.width}×${form.depth}mm`,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Ref', value: form.reference || '-' },
          { label: 'Code', value: 'EN 1995-1-1' },
        ],
        inputs: [
          { label: 'Grade', value: grade?.name || form.gradeClass },
          { label: 'Section', value: `${form.width} × ${form.depth}`, unit: 'mm' },
          { label: 'Span', value: form.span, unit: 'm' },
          {
            label: 'Loading',
            value: form.loadType === 'udl' ? `${form.udl} kN/m UDL` : `${form.pointLoad} kN point`,
          },
          { label: 'Service Class', value: form.serviceClass },
          { label: 'Load Duration', value: form.loadDuration },
          { label: 'kmod', value: results.kmod.toFixed(2) },
        ],
        tables: [
          {
            title: 'Design Checks',
            head: [['Check', 'Applied', 'Capacity', 'Util %', 'Status']],
            body: [
              [
                'Bending',
                `${results.sigma_m.toFixed(1)} MPa`,
                `${results.fm_d.toFixed(1)} MPa`,
                `${results.bendingUtil.toFixed(1)}`,
                results.bendingStatus,
              ],
              [
                'Shear',
                `${results.tau.toFixed(2)} MPa`,
                `${results.fv_d.toFixed(2)} MPa`,
                `${results.shearUtil.toFixed(1)}`,
                results.shearStatus,
              ],
              [
                'Deflection',
                `${results.deflection.toFixed(1)} mm`,
                `${results.deflectionLimit.toFixed(1)} mm`,
                `${results.deflectionUtil.toFixed(1)}`,
                results.deflectionStatus,
              ],
            ],
          },
        ],
        checks: [
          {
            name: 'Bending',
            capacity: `${results.fm_d.toFixed(1)} MPa`,
            utilisation: `${results.bendingUtil.toFixed(1)}%`,
            status: results.bendingStatus as 'PASS' | 'FAIL',
          },
          {
            name: 'Shear',
            capacity: `${results.fv_d.toFixed(2)} MPa`,
            utilisation: `${results.shearUtil.toFixed(1)}%`,
            status: results.shearStatus as 'PASS' | 'FAIL',
          },
          {
            name: 'Deflection',
            capacity: `L/${((parseFloat(form.span) * 1000) / results.deflectionLimit).toFixed(0)}`,
            utilisation: `${results.deflectionUtil.toFixed(1)}%`,
            status: results.deflectionStatus as 'PASS' | 'FAIL',
          },
        ],
        sections: [
          {
            title: 'Section Properties',
            head: [['Parameter', 'Value']],
            body: [
              ['Area', `${results.A.toFixed(0)} mm²`],
              ['Iy', `${(results.Iy / 1e6).toFixed(1)} × 10⁶ mm⁴`],
              ['Wy', `${(results.Wy / 1e3).toFixed(1)} × 10³ mm³`],
              ['fm,d', `${results.fm_d.toFixed(1)} MPa`],
              ['fv,d', `${results.fv_d.toFixed(2)} MPa`],
            ],
          },
        ],
        recommendations: [
          ...(results.bendingUtil > 85
            ? [
                {
                  check: 'High Bending',
                  suggestion: `${results.bendingUtil.toFixed(0)}% — consider deeper section`,
                },
              ]
            : []),
          ...(results.deflectionUtil > 85
            ? [
                {
                  check: 'High Deflection',
                  suggestion: `${results.deflection.toFixed(1)}mm — increase depth or stiffness`,
                },
              ]
            : []),
          {
            check: 'Overall',
            suggestion: `Critical check: ${results.criticalCheck} at ${results.maxUtil.toFixed(0)}%`,
          },
        ],
        warnings: warnings.map((w) => (typeof w === 'string' ? w : w)),
        footerNote: 'BeaverCalc Studio — EN 1995-1-1 Timber Member',
      });
    } catch (e) {
      console.error(e);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    const grade = TIMBER_GRADES[form.gradeClass];
    generateDOCX({
      title: 'Timber Member Design',
      subtitle: `${grade?.name} ${form.width}×${form.depth}mm`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Ref', value: form.reference || '-' },
        { label: 'Code', value: 'EN 1995-1-1' },
      ],
      inputs: [
        { label: 'Grade', value: grade?.name || form.gradeClass },
        { label: 'Section', value: `${form.width} × ${form.depth}`, unit: 'mm' },
        { label: 'Span', value: form.span, unit: 'm' },
        {
          label: 'Loading',
          value: form.loadType === 'udl' ? `${form.udl} kN/m UDL` : `${form.pointLoad} kN point`,
        },
        { label: 'Service Class', value: form.serviceClass },
        { label: 'kmod', value: results.kmod.toFixed(2) },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `${results.fm_d.toFixed(1)} MPa`,
          utilisation: `${results.bendingUtil.toFixed(1)}%`,
          status: results.bendingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `${results.fv_d.toFixed(2)} MPa`,
          utilisation: `${results.shearUtil.toFixed(1)}%`,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `L/${((parseFloat(form.span) * 1000) / results.deflectionLimit).toFixed(0)}`,
          utilisation: `${results.deflectionUtil.toFixed(1)}%`,
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio \u2014 EN 1995-1-1 Timber Member',
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
      className={cn('rounded-2xl border overflow-hidden shadow-lg', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            {icon}
          </div>
          <span className="font-semibold text-white">{title}</span>
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
            className="p-4 bg-gray-900/30"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
  const InputField: React.FC<{
    label: string;
    field: keyof TimberMemberForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title={label}
          placeholder={label}
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1995-1-1</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-400 bg-clip-text text-transparent mb-4">
            Timber Member Design
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            C16/C24 timber bending, shear, and deflection checks to Eurocode 5
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

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="Project" field="projectName" type="text" />
              <InputField label="Reference" field="reference" type="text" />
            </div>
          </CardContent>
        </Card>
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
                <TimberMember3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                aria-label="Minimize preview"
              >
                <FiMinimize2 size={20} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                TIMBER MEMBER — REAL-TIME PREVIEW
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
                  { label: 'Grade', value: form.gradeClass },
                  { label: 'Section', value: `${form.width}×${form.depth} mm` },
                  { label: 'Span', value: `${form.span} m` },
                  { label: 'Load Type', value: form.loadType },
                  { label: 'UDL', value: `${form.udl} kN/m` },
                  { label: 'Service Class', value: form.serviceClass },
                  { label: 'Duration', value: form.loadDuration },
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
                    { label: 'Shear', util: results.shearUtil.toFixed(1), status: results.shearStatus },
                    { label: 'Deflection', util: results.deflectionUtil.toFixed(1), status: results.deflectionStatus },
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
        <div className="relative">
          <button
            onClick={() => setPreviewMaximized(true)}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
            aria-label="Maximize preview"
            title="Fullscreen preview"
          >
            <FiMaximize2 size={16} />
          </button>
          <WhatIfPreview
            title="Timber Member — 3D Preview"
            sliders={whatIfSliders}
            form={form}
            updateForm={updateForm}
            status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
            renderScene={(fsHeight) => (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4">
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                    <TimberMember3D />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>
            )}
          />
        </div>
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
                  id="section"
                  title="Section Properties"
                  icon={
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <FiLayers className="w-3 h-3 text-white" />
                    </div>
                  }
                  color="border-amber-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-400">Strength Class</label>
                      <select
                        value={form.gradeClass}
                        onChange={(e) => updateForm('gradeClass', e.target.value)}
                        title="Strength Class"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        {Object.entries(TIMBER_GRADES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name} (fm,k={v.fm_k} MPa)
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Width (b)" field="width" unit="mm" />
                    <InputField label="Depth (d)" field="depth" unit="mm" />
                    <InputField label="Span" field="span" unit="m" />
                  </div>
                </Section>
                <Section
                  id="loading"
                  title="Loading"
                  icon={
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <FiSettings className="w-3 h-3 text-white" />
                    </div>
                  }
                  color="border-amber-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-400">Load Type</label>
                      <select
                        value={form.loadType}
                        onChange={(e) => updateForm('loadType', e.target.value)}
                        title="Load Type"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="udl">UDL (kN/m)</option>
                        <option value="point">Point Load (kN)</option>
                      </select>
                    </div>
                    {form.loadType === 'udl' ? (
                      <InputField label="UDL" field="udl" unit="kN/m" />
                    ) : (
                      <>
                        <InputField label="Point Load" field="pointLoad" unit="kN" />
                        <InputField label="Load Position from Left" field="pointLoadPos" unit="m" />
                      </>
                    )}
                  </div>
                </Section>
                <Section
                  id="factors"
                  title="Design Factors"
                  icon={
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                      <FiSettings className="w-3 h-3 text-white" />
                    </div>
                  }
                  color="border-gray-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-400">Service Class</label>
                      <select
                        value={form.serviceClass}
                        onChange={(e) => updateForm('serviceClass', e.target.value)}
                        title="Service Class"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                      >
                        <option value="1">Class 1 (indoor)</option>
                        <option value="2">Class 2 (covered outdoor)</option>
                        <option value="3">Class 3 (exposed)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-gray-400">Load Duration</label>
                      <select
                        value={form.loadDuration}
                        onChange={(e) => updateForm('loadDuration', e.target.value)}
                        title="Load Duration"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                      >
                        <option value="permanent">Permanent</option>
                        <option value="long">Long Term</option>
                        <option value="medium">Medium Term</option>
                        <option value="short">Short Term</option>
                        <option value="instantaneous">Instantaneous</option>
                      </select>
                    </div>
                  </div>
                </Section>
              </div>
              <div className="space-y-4">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4">
                    <Interactive3DDiagram height="350px" cameraPosition={[8, 6, 8]}>
                      <TimberMember3D />
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
                      className={cn(
                        'border-2 shadow-lg',
                        results.status === 'PASS'
                          ? 'bg-green-900/20 border-green-500/50 shadow-green-500/5'
                          : 'bg-red-900/20 border-red-500/50 shadow-red-500/5',
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
                    <Card className="bg-gray-900/50 border-gray-800 shadow-lg shadow-slate-500/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { name: 'Bending', util: results.bendingUtil },
                          { name: 'Shear', util: results.shearUtil },
                          { name: 'Deflection', util: results.deflectionUtil },
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
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400">Results</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">MEd</p>
                          <p className="text-white font-mono">{results.MEd.toFixed(2)} kNm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">VEd</p>
                          <p className="text-white font-mono">{results.VEd.toFixed(2)} kN</p>
                        </div>
                        <div>
                          <p className="text-gray-500">σm</p>
                          <p className="text-white font-mono">{results.sigma_m.toFixed(1)} MPa</p>
                        </div>
                        <div>
                          <p className="text-gray-500">τ</p>
                          <p className="text-white font-mono">{results.tau.toFixed(2)} MPa</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Deflection</p>
                          <p className="text-white font-mono">{results.deflection.toFixed(1)} mm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Limit</p>
                          <p className="text-white font-mono">
                            {results.deflectionLimit.toFixed(1)} mm
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    {warnings.length > 0 && (
                      <Card className="bg-amber-900/20 border-amber-500/30">
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
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> Export PDF Report
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> DOCX
                      </Button>
                      <SaveRunButton calculatorKey="timber-member" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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

export default TimberMember;
