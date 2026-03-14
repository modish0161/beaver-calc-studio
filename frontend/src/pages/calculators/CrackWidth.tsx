// =============================================================================
// Crack Width Calculator — Premium Version
// EN 1992-1-1 Clause 7.3 — Serviceability Crack Width Check
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheckCircle,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTarget,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import CrackWidth3D from '../../components/3d/scenes/CrackWidth3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { EXPOSURE_CLASSES } from '../../data/exposureClasses';
import { CONCRETE_GRADES } from '../../data/materialGrades';
import { validateNumericInputs } from '../../lib/validation';
// Types
// =============================================================================

interface CrackWidthForm {
  // Section Properties
  section_width: string;
  section_depth: string;
  cover: string;

  // Reinforcement
  bar_diameter: string;
  bar_spacing: string;
  no_bars: string;
  arrangement: string;

  // Material Properties
  concrete_grade: string;
  steel_grade: string;

  // Loading
  bending_moment: string;
  axial_force: string;
  stress_source: string;
  steel_stress: string;

  // Exposure & Limits
  exposure_class: string;
  crack_limit: string;

  // Factors
  long_term_factor: string;
  load_duration: string;

  // Project Info
  projectName: string;
  reference: string;
}

interface CrackWidthResults {
  // Section Analysis
  d: number;
  As: number;
  Ac_eff: number;
  hc_eff: number;
  rho_p_eff: number;

  // Concrete Properties
  fct_eff: number;
  Ecm: number;
  Es: number;
  alpha_e: number;

  // Stress & Strain
  sigma_s: number;
  epsilon_sm_epsilon_cm: number;
  epsilon_sm_min: number;
  epsilon_final: number;

  // Crack Spacing
  sr_max: number;
  k1: number;
  k2: number;
  k3: number;
  k4: number;

  // Crack Width
  wk: number;
  wk_limit: number;

  // Checks
  crack_ratio: number;
  status: string;
  classification: string;
  classColor: string;

  // Additional Info
  cracking_moment: number;
  is_cracked: boolean;
}

// =============================================================================
// Data
// =============================================================================

const PRESETS: Record<string, { name: string; form: Partial<CrackWidthForm> }> = {
  internal_beam: {
    name: 'Internal Beam',
    form: {
      section_width: '300',
      section_depth: '500',
      cover: '35',
      bar_diameter: '20',
      bar_spacing: '100',
      no_bars: '4',
      concrete_grade: 'C32/40',
      exposure_class: 'XC1',
      bending_moment: '150',
    },
  },
  external_beam: {
    name: 'External Beam',
    form: {
      section_width: '300',
      section_depth: '600',
      cover: '45',
      bar_diameter: '25',
      bar_spacing: '100',
      no_bars: '4',
      concrete_grade: 'C35/45',
      exposure_class: 'XC4',
      bending_moment: '200',
    },
  },
  floor_slab: {
    name: 'Floor Slab',
    form: {
      section_width: '1000',
      section_depth: '200',
      cover: '25',
      bar_diameter: '12',
      bar_spacing: '150',
      no_bars: '7',
      concrete_grade: 'C30/37',
      exposure_class: 'XC1',
      bending_moment: '40',
    },
  },
  basement_wall: {
    name: 'Basement Wall',
    form: {
      section_width: '1000',
      section_depth: '300',
      cover: '40',
      bar_diameter: '16',
      bar_spacing: '175',
      no_bars: '6',
      concrete_grade: 'C32/40',
      exposure_class: 'XC2',
      bending_moment: '60',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const CrackWidth: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<CrackWidthForm>({
    section_width: '300',
    section_depth: '500',
    cover: '35',
    bar_diameter: '20',
    bar_spacing: '100',
    no_bars: '4',
    arrangement: 'single',
    concrete_grade: 'C32/40',
    steel_grade: '500',
    bending_moment: '150',
    axial_force: '0',
    stress_source: 'calculated',
    steel_stress: '300',
    exposure_class: 'XC1',
    crack_limit: '0.3',
    long_term_factor: '0.4',
    load_duration: 'long',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'section_width', label: 'Section Width' },
  { key: 'section_depth', label: 'Section Depth' },
  { key: 'cover', label: 'Cover' },
  { key: 'bar_diameter', label: 'Bar Diameter' },
  { key: 'bar_spacing', label: 'Bar Spacing' },
  { key: 'no_bars', label: 'No Bars' },
  { key: 'bending_moment', label: 'Bending Moment' },
  { key: 'axial_force', label: 'Axial Force' },
  { key: 'steel_stress', label: 'Steel Stress' },
  { key: 'crack_limit', label: 'Crack Limit' },
  { key: 'long_term_factor', label: 'Long Term Factor' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'section_width', label: 'Section_width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'section_depth', label: 'Section_depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'cover', label: 'Cover', min: 0, max: 100, step: 1, unit: '' },
    { key: 'bar_diameter', label: 'Bar_diameter', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<CrackWidthResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    reinforcement: true,
    loading: true,
    exposure: false,
  });
  const [previewMaximized, setPreviewMaximized] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const updateForm = (field: keyof CrackWidthForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Auto-update crack limit based on exposure
    if (field === 'exposure_class') {
      const exposure = EXPOSURE_CLASSES[value];
      if (exposure) {
        setForm((prev) => ({ ...prev, crack_limit: exposure.wmax.toString() }));
      }
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setForm((prev) => ({ ...prev, ...preset.form }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Calculation (EN 1992-1-1 Clause 7.3)
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      // Section geometry
      const b = parseFloat(form.section_width);
      const h = parseFloat(form.section_depth);
      const c = parseFloat(form.cover);
      const phi = parseFloat(form.bar_diameter);
      const n_bars = parseFloat(form.no_bars);

      // Effective depth
      const d = h - c - phi / 2;

      // Reinforcement
      const As = (n_bars * Math.PI * phi ** 2) / 4;

      // Concrete properties
      const concrete = CONCRETE_GRADES[form.concrete_grade];
      const fck = concrete.fck;
      const fctm = concrete.fctm;
      const fct_eff = fctm; // For crack width, fct,eff = fctm
      const Ecm = concrete.Ecm * 1000; // MPa

      // Steel properties
      const Es = 200000; // MPa
      const alpha_e = Es / Ecm;

      // ── Effective tension area (Clause 7.3.2) ──
      const x = ((d * alpha_e * As) / (b * d)) * (Math.sqrt(1 + (2 * b * d) / (alpha_e * As)) - 1);
      const hc_eff = Math.min(2.5 * (h - d), (h - x) / 3, h / 2);
      const Ac_eff = b * hc_eff;
      const rho_p_eff = As / Ac_eff;

      // ── Steel stress ──
      let sigma_s: number;
      if (form.stress_source === 'direct') {
        sigma_s = parseFloat(form.steel_stress);
      } else {
        // Calculate from moment
        const M_Ed = parseFloat(form.bending_moment) * 1e6; // Nmm
        const N_Ed = parseFloat(form.axial_force) * 1000; // N

        // Lever arm (simplified)
        const z = 0.9 * d;
        sigma_s = M_Ed / (As * z) + N_Ed / As;
      }

      // Check if section is cracked
      const W_c = (b * h ** 2) / 6; // Section modulus
      const M_cr = (fct_eff * W_c) / 1e6; // kNm
      const M_Ed = parseFloat(form.bending_moment);
      const is_cracked = M_Ed > M_cr;

      if (!is_cracked) {
        newWarnings.push('Section is uncracked — crack width check not applicable');
      }

      // ── Strain calculations (Clause 7.3.4) ──
      // Factor for load duration
      const kt = form.load_duration === 'long' ? 0.4 : 0.6;

      // εsm - εcm
      const epsilon_sm_epsilon_cm_calc =
        (sigma_s - kt * (fct_eff / rho_p_eff) * (1 + alpha_e * rho_p_eff)) / Es;
      const epsilon_sm_min = (0.6 * sigma_s) / Es;
      const epsilon_final = Math.max(epsilon_sm_epsilon_cm_calc, epsilon_sm_min);

      // ── Maximum crack spacing (Clause 7.3.4) ──
      // k1: 0.8 for high bond bars, 1.6 for smooth bars
      const k1 = 0.8;
      // k2: 0.5 for bending, 1.0 for pure tension
      const k2 = 0.5;
      // k3: UK NA = 3.4
      const k3 = 3.4;
      // k4: UK NA = 0.425
      const k4 = 0.425;

      const sr_max = k3 * c + (k1 * k2 * k4 * phi) / rho_p_eff;

      // ── Crack width ──
      const wk = sr_max * epsilon_final;
      const wk_limit = parseFloat(form.crack_limit);

      // ── Result assessment ──
      const crack_ratio = (wk / wk_limit) * 100;

      let classification: string;
      let classColor: string;
      if (crack_ratio <= 50) {
        classification = 'Excellent';
        classColor = 'text-green-400';
      } else if (crack_ratio <= 75) {
        classification = 'Good';
        classColor = 'text-emerald-400';
      } else if (crack_ratio <= 100) {
        classification = 'Acceptable';
        classColor = 'text-amber-400';
      } else {
        classification = 'Excessive';
        classColor = 'text-red-400';
      }

      const status = wk <= wk_limit ? 'PASS' : 'FAIL';

      // Warnings
      if (sigma_s > 0.8 * 500) {
        newWarnings.push('High steel stress — consider increasing reinforcement');
      }
      if (rho_p_eff < 0.004) {
        newWarnings.push('Low reinforcement ratio — minimum steel may govern');
      }
      if (c < 25) {
        newWarnings.push('Cover less than 25mm — check durability requirements');
      }
      if (wk > 0.4) {
        newWarnings.push('Crack width exceeds 0.4mm — appearance may be affected');
      }

      setResults({
        d,
        As,
        Ac_eff,
        hc_eff,
        rho_p_eff,
        fct_eff,
        Ecm,
        Es,
        alpha_e,
        sigma_s,
        epsilon_sm_epsilon_cm: epsilon_sm_epsilon_cm_calc,
        epsilon_sm_min,
        epsilon_final,
        sr_max,
        k1,
        k2,
        k3,
        k4,
        wk,
        wk_limit,
        crack_ratio,
        status,
        classification,
        classColor,
        cracking_moment: M_cr,
        is_cracked,
      });

      setWarnings(newWarnings);
    } catch (error) {
      console.error('Calculation error:', error);
      newWarnings.push('Calculation error occurred');
      setWarnings(newWarnings);
    } finally {
      setIsCalculating(false);
    }
  }, [form]);

  useEffect(() => {
    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [calculate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Canvas Drawing
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Crack Width Check',
      subtitle: 'EN 1992-1-1 Clause 7.3 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'CRA001' },
        { label: 'Standard', value: 'EN 1992-1-1 Cl. 7.3' },
      ],
      inputs: [
        { label: 'Section Width', value: form.section_width, unit: 'mm' },
        { label: 'Section Depth', value: form.section_depth, unit: 'mm' },
        { label: 'Cover', value: form.cover, unit: 'mm' },
        { label: 'Bar Diameter', value: form.bar_diameter, unit: 'mm' },
        { label: 'No. Bars', value: form.no_bars },
        { label: 'Bar Spacing', value: form.bar_spacing, unit: 'mm' },
        { label: 'Concrete Grade', value: form.concrete_grade },
        { label: 'Steel Grade', value: `${form.steel_grade} MPa` },
        { label: 'Bending Moment', value: form.bending_moment, unit: 'kNm' },
        { label: 'Axial Force', value: form.axial_force, unit: 'kN' },
        { label: 'Exposure Class', value: form.exposure_class },
        { label: 'Crack Limit', value: form.crack_limit, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Crack Width Check',
          capacity: `${results.wk_limit} mm`,
          utilisation: `${results.crack_ratio.toFixed(1)}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      sections: [
        {
          title: 'Calculation Breakdown',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Effective Depth d', results.d.toFixed(1), 'mm'],
            ['Steel Area As', results.As.toFixed(0), 'mm²'],
            ['Effective Tension Area Ac,eff', results.Ac_eff.toFixed(0), 'mm²'],
            ['Reinforcement Ratio ρp,eff', results.rho_p_eff.toFixed(4), '-'],
            ['Steel Stress σs', results.sigma_s.toFixed(1), 'MPa'],
            ['Max Crack Spacing sr,max', results.sr_max.toFixed(1), 'mm'],
            ['Strain (εsm - εcm)', results.epsilon_final.toFixed(6), '-'],
            ['Crack Width wk', results.wk.toFixed(3), 'mm'],
            ['Crack Limit wk,lim', results.wk_limit.toFixed(1), 'mm'],
          ],
        },
      ],
      recommendations: [
        ...(results.sigma_s > 0.8 * 500
          ? [
              {
                check: 'High Stress',
                suggestion: 'Steel stress high — consider increasing reinforcement',
              },
            ]
          : []),
        ...(results.rho_p_eff < 0.004
          ? [
              {
                check: 'Low Ratio',
                suggestion: 'Low reinforcement ratio — minimum steel may govern',
              },
            ]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.status === 'PASS'
              ? 'Crack width within limits'
              : 'Increase reinforcement or reduce bar spacing',
        },
      ],
      warnings,
      footerNote: 'Beaver Bridges Ltd — Crack Width Check (EN 1992-1-1 Cl. 7.3)',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Crack Width Check',
      subtitle: 'EN 1992-1-1 Clause 7.3 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'CRA001' },
        { label: 'Standard', value: 'EN 1992-1-1 Cl. 7.3' },
      ],
      inputs: [
        { label: 'Section Width', value: form.section_width, unit: 'mm' },
        { label: 'Section Depth', value: form.section_depth, unit: 'mm' },
        { label: 'Cover', value: form.cover, unit: 'mm' },
        { label: 'Bar Diameter', value: form.bar_diameter, unit: 'mm' },
        { label: 'No. Bars', value: form.no_bars },
        { label: 'Bar Spacing', value: form.bar_spacing, unit: 'mm' },
        { label: 'Concrete Grade', value: form.concrete_grade },
        { label: 'Steel Grade', value: `${form.steel_grade} MPa` },
        { label: 'Bending Moment', value: form.bending_moment, unit: 'kNm' },
        { label: 'Axial Force', value: form.axial_force, unit: 'kN' },
        { label: 'Exposure Class', value: form.exposure_class },
        { label: 'Crack Limit', value: form.crack_limit, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Crack Width Check',
          capacity: `${results.wk_limit} mm`,
          utilisation: `${results.crack_ratio.toFixed(1)}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      sections: [
        {
          title: 'Calculation Breakdown',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Effective Depth d', results.d.toFixed(1), 'mm'],
            ['Steel Area As', results.As.toFixed(0), 'mm²'],
            ['Effective Tension Area Ac,eff', results.Ac_eff.toFixed(0), 'mm²'],
            ['Reinforcement Ratio ρp,eff', results.rho_p_eff.toFixed(4), '-'],
            ['Steel Stress σs', results.sigma_s.toFixed(1), 'MPa'],
            ['Max Crack Spacing sr,max', results.sr_max.toFixed(1), 'mm'],
            ['Strain (εsm - εcm)', results.epsilon_final.toFixed(6), '-'],
            ['Crack Width wk', results.wk.toFixed(3), 'mm'],
            ['Crack Limit wk,lim', results.wk_limit.toFixed(1), 'mm'],
          ],
        },
      ],
      recommendations: [
        ...(results.sigma_s > 0.8 * 500
          ? [
              {
                check: 'High Stress',
                suggestion: 'Steel stress high — consider increasing reinforcement',
              },
            ]
          : []),
        ...(results.rho_p_eff < 0.004
          ? [
              {
                check: 'Low Ratio',
                suggestion: 'Low reinforcement ratio — minimum steel may govern',
              },
            ]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.status === 'PASS'
              ? 'Crack width within limits'
              : 'Increase reinforcement or reduce bar spacing',
        },
      ],
      warnings,
      footerNote: 'Beaver Bridges Ltd — Crack Width Check (EN 1992-1-1 Cl. 7.3)',
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Collapsible Section Component
  // ─────────────────────────────────────────────────────────────────────────────
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
      className={cn('rounded-2xl border overflow-hidden bg-gray-900/40 backdrop-blur-md border-gray-700/50', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            {icon}
          </div>
          <span className="text-white font-semibold">{title}</span>
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Input Component
  // ─────────────────────────────────────────────────────────────────────────────
  const InputField: React.FC<{
    label: string;
    field: keyof CrackWidthForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          title={label}
          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1992-1-1 Clause 7.3</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Crack Width
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Serviceability crack width verification to Eurocode 2
          </p>
          <div className="flex items-center justify-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mt-4 mx-auto max-w-lg">
            <Button
              onClick={exportPDF}
              disabled={!results}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <FiDownload className="mr-2" />
              PDF
            </Button>
            <Button
              onClick={exportDOCX}
              disabled={!results}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <FiDownload className="mr-2" />
              DOCX
            </Button>
            <SaveRunButton calculatorKey="crack-width" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
          </div>
        </motion.div>

        {/* Presets */}
        <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-3 text-white font-semibold">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"><FiZap className="w-6 h-6 text-blue-400" /></div>
              Quick Presets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(key)}
                  className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

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
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Input Column */}
              <div className="lg:col-span-2 space-y-4">
                {/* Section Geometry */}
                <Section
                  id="geometry"
                  title="Section Geometry"
                  icon={<FiLayers className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Section Width b" field="section_width" unit="mm" />
                    <InputField label="Section Depth h" field="section_depth" unit="mm" />
                    <InputField label="Cover to Reinforcement c" field="cover" unit="mm" />
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Concrete Grade</label>
                      <select
                        title="Concrete Grade"
                        value={form.concrete_grade}
                        onChange={(e) => updateForm('concrete_grade', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(CONCRETE_GRADES).map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Reinforcement */}
                <Section
                  id="reinforcement"
                  title="Reinforcement"
                  icon={<FiSliders className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Bar Diameter ϕ" field="bar_diameter" unit="mm" />
                    <InputField label="Number of Bars" field="no_bars" />
                    <InputField label="Bar Spacing" field="bar_spacing" unit="mm" />
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Bar Arrangement</label>
                      <select
                        title="Bar Arrangement"
                        value={form.arrangement}
                        onChange={(e) => updateForm('arrangement', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="single">Single Layer</option>
                        <option value="double">Double Layer</option>
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Loading */}
                <Section
                  id="loading"
                  title="Loading"
                  icon={<FiZap className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Steel Stress Source</label>
                      <select
                        title="Steel Stress Source"
                        value={form.stress_source}
                        onChange={(e) => updateForm('stress_source', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="calculated">Calculate from Moment</option>
                        <option value="direct">Enter Directly</option>
                      </select>
                    </div>

                    {form.stress_source === 'calculated' ? (
                      <>
                        <InputField label="Bending Moment M_Ed" field="bending_moment" unit="kNm" />
                        <InputField label="Axial Force N_Ed" field="axial_force" unit="kN" />
                      </>
                    ) : (
                      <InputField label="Steel Stress σ_s" field="steel_stress" unit="MPa" />
                    )}

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Load Duration</label>
                      <select
                        title="Load Duration"
                        value={form.load_duration}
                        onChange={(e) => updateForm('load_duration', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="long">Long-term (kt = 0.4)</option>
                        <option value="short">Short-term (kt = 0.6)</option>
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Exposure */}
                <Section
                  id="exposure"
                  title="Exposure & Limits"
                  icon={<FiSettings className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Exposure Class</label>
                      <select
                        title="Exposure Class"
                        value={form.exposure_class}
                        onChange={(e) => updateForm('exposure_class', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(EXPOSURE_CLASSES).map(([cls, data]) => (
                          <option key={cls} value={cls}>
                            {cls} — {data.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Crack Width Limit w_k,lim" field="crack_limit" unit="mm" />
                  </div>
                </Section>

                {/* RUN FULL ANALYSIS Button */}
                <button
                  onClick={calculate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
                </button>
              </div>

              {/* Sticky Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <div className="sticky top-8 space-y-4">
                  {/* Results Summary */}
                  {results && (
                    <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-4 space-y-3">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <FiTarget className="w-5 h-5 text-blue-400" /> Results Summary
                      </h3>
                      <div className={`border-l-4 ${results.status === 'PASS' ? 'border-green-400' : 'border-red-400'} pl-3 py-2`}>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className={`text-lg font-bold ${results.status === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>
                          {results.status === 'PASS' ? <><FiCheckCircle className="inline w-5 h-5 mr-1" /> PASS</> : <><FiAlertTriangle className="inline w-5 h-5 mr-1" /> FAIL</>}
                        </p>
                      </div>
                      <div className="border-l-4 border-blue-400 pl-3 py-2">
                        <p className="text-sm text-gray-400">Crack Width w<sub>k</sub></p>
                        <p className="text-lg font-bold text-white">{results.wk.toFixed(3)} mm</p>
                      </div>
                      <div className="border-l-4 border-blue-400 pl-3 py-2">
                        <p className="text-sm text-gray-400">Limit w<sub>k,lim</sub></p>
                        <p className="text-lg font-bold text-white">{results.wk_limit.toFixed(1)} mm</p>
                      </div>
                      <div className={`border-l-4 ${results.crack_ratio <= 75 ? 'border-green-400' : results.crack_ratio <= 100 ? 'border-yellow-400' : 'border-red-400'} pl-3 py-2`}>
                        <p className="text-sm text-gray-400">Utilisation</p>
                        <p className={`text-lg font-bold ${results.classColor}`}>{results.crack_ratio.toFixed(1)}% — {results.classification}</p>
                      </div>
                      {warnings.length > 0 && (
                        <div className="border-l-4 border-yellow-400 pl-3 py-2">
                          <p className="text-sm text-gray-400">Warnings</p>
                          {warnings.map((w, i) => (
                            <p key={i} className="text-sm text-yellow-300 flex items-center gap-1">
                              <FiAlertTriangle className="w-3 h-3" /> {w}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
                          <CrackWidth3D />
                        </Interactive3DDiagram>
                        <button
                          onClick={() => setPreviewMaximized(false)}
                          className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                          title="Close fullscreen"
                        >
                          <FiMinimize2 size={20} />
                        </button>
                        <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                          CRACK WIDTH — REAL-TIME PREVIEW
                        </div>
                      </div>
                      <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                          <FiSliders size={14} /> Live Parameters
                        </h3>
                        {[
                          { label: 'Width', value: `${form.section_width} mm` },
                          { label: 'Depth', value: `${form.section_depth} mm` },
                          { label: 'Cover', value: `${form.cover} mm` },
                          { label: 'Bar Ø', value: `${form.bar_diameter} mm` },
                          { label: 'Bar Spacing', value: `${form.bar_spacing} mm` },
                          { label: 'Concrete', value: form.concrete_grade },
                          { label: 'Moment', value: `${form.bending_moment} kNm` },
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
                            { label: 'wk', value: results ? `${results.wk.toFixed(3)} mm` : '—' },
                            { label: 'wk limit', value: results ? `${results.wk_limit.toFixed(1)} mm` : '—' },
                            { label: 'Crack Ratio', value: results ? `${results.crack_ratio.toFixed(1)}%` : '—' },
                            { label: 'sr,max', value: results ? `${results.sr_max.toFixed(1)} mm` : '—' },
                            { label: 'σs', value: results ? `${results.sigma_s.toFixed(1)} MPa` : '—' },
                            { label: 'As', value: results ? `${results.As.toFixed(0)} mm²` : '—' },
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
                              { label: 'Crack Width', util: results.crack_ratio.toFixed(1), status: results.status },
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
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={() => setPreviewMaximized(true)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                      title="Fullscreen preview"
                    >
                      <FiMaximize2 size={16} />
                    </button>
                  </div>
                  <WhatIfPreview
                    title="Crack Width — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                        <CrackWidth3D />
                      </Interactive3DDiagram>
                    )}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CrackWidth;
