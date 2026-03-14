// =============================================================================
// RC Beam Design Calculator — Premium Version
// EN 1992-1-1 — Reinforced Concrete Beam Design
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiBox,
    FiCheck,
    FiCheckCircle,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiGrid,
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

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import RCBeam3D from '../../components/3d/scenes/RCBeam3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { CONCRETE_GRADES, REBAR_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { validateNumericInputs } from '../../lib/validation';
// =============================================================================
// Types
// =============================================================================

interface RCBeamForm {
  // Section Properties
  beam_width: string;
  beam_depth: string;
  cover: string;

  // Span
  span_length: string;
  support_conditions: string;

  // Materials
  concrete_grade: string;
  steel_grade: string;

  // Loading (characteristic)
  dead_load: string;
  imposed_load: string;
  point_load: string;
  point_load_position: string;

  // Load Factors
  gamma_g: string;
  gamma_q: string;

  // Reinforcement
  main_bar_dia: string;
  link_dia: string;
  link_spacing: string;

  // Partial Factors
  gamma_c: string;
  gamma_s: string;

  // Project Info
  projectName: string;
  reference: string;
}

interface RCBeamResults {
  // Geometry
  d: number;
  b: number;
  h: number;
  L: number;

  // Loading
  w_uls: number;
  M_Ed: number;
  V_Ed: number;

  // Flexure
  K: number;
  K_bal: number;
  z: number;
  As_req: number;
  As_min: number;
  As_max: number;
  As_prov: number;
  n_bars: number;
  flexure_util: number;
  flexure_status: string;

  // Shear
  VRd_c: number;
  VRd_s: number;
  VRd_max: number;
  cot_theta: number;
  Asw_s_req: number;
  Asw_s_prov: number;
  shear_util: number;
  shear_status: string;
  shear_reinf_required: boolean;

  // Deflection
  L_d_actual: number;
  L_d_limit: number;
  K_deflection: number;
  deflection_util: number;
  deflection_status: string;

  // Overall
  overall_util: number;
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// Data
// =============================================================================

const STEEL_GRADES: Record<string, { fyk: number }> = {
  '500B': { fyk: REBAR_GRADES.B500B.fyk },
  '500C': { fyk: REBAR_GRADES.B500C.fyk },
  '400': { fyk: REBAR_GRADES.B400.fyk },
};

const SUPPORT_CONDITIONS: Record<
  string,
  { factor: number; K_deflection: number; description: string }
> = {
  simply_supported: { factor: 0.125, K_deflection: 1.0, description: 'Simply Supported' },
  continuous_end: { factor: 0.0625, K_deflection: 1.3, description: 'Continuous (End Span)' },
  continuous_internal: { factor: 0.0417, K_deflection: 1.5, description: 'Continuous (Internal)' },
  cantilever: { factor: 0.5, K_deflection: 0.4, description: 'Cantilever' },
  fixed_fixed: { factor: 0.0833, K_deflection: 1.5, description: 'Fixed Both Ends' },
};

const BAR_AREAS: Record<string, number> = {
  '8': 50.3,
  '10': 78.5,
  '12': 113.1,
  '16': 201.1,
  '20': 314.2,
  '25': 490.9,
  '32': 804.2,
  '40': 1256.6,
};

const PRESETS: Record<string, { name: string; form: Partial<RCBeamForm> }> = {
  floor_beam: {
    name: 'Floor Beam',
    form: {
      beam_width: '300',
      beam_depth: '500',
      cover: '35',
      span_length: '6000',
      support_conditions: 'simply_supported',
      concrete_grade: 'C32/40',
      steel_grade: '500B',
      dead_load: '15',
      imposed_load: '10',
      main_bar_dia: '20',
      link_dia: '10',
      link_spacing: '200',
    },
  },
  transfer_beam: {
    name: 'Transfer Beam',
    form: {
      beam_width: '450',
      beam_depth: '800',
      cover: '40',
      span_length: '8000',
      support_conditions: 'simply_supported',
      concrete_grade: 'C40/50',
      steel_grade: '500B',
      dead_load: '35',
      imposed_load: '20',
      main_bar_dia: '32',
      link_dia: '12',
      link_spacing: '150',
    },
  },
  lintel: {
    name: 'Lintel',
    form: {
      beam_width: '225',
      beam_depth: '300',
      cover: '30',
      span_length: '2400',
      support_conditions: 'simply_supported',
      concrete_grade: 'C30/37',
      steel_grade: '500B',
      dead_load: '12',
      imposed_load: '5',
      main_bar_dia: '16',
      link_dia: '8',
      link_spacing: '250',
    },
  },
  cantilever: {
    name: 'Cantilever Beam',
    form: {
      beam_width: '300',
      beam_depth: '600',
      cover: '35',
      span_length: '2500',
      support_conditions: 'cantilever',
      concrete_grade: 'C35/45',
      steel_grade: '500B',
      dead_load: '20',
      imposed_load: '10',
      main_bar_dia: '25',
      link_dia: '10',
      link_spacing: '150',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const RCBeam: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<RCBeamForm>({
    beam_width: '300',
    beam_depth: '500',
    cover: '35',
    span_length: '6000',
    support_conditions: 'simply_supported',
    concrete_grade: 'C32/40',
    steel_grade: '500B',
    dead_load: '15',
    imposed_load: '10',
    point_load: '0',
    point_load_position: '50',
    gamma_g: '1.35',
    gamma_q: '1.5',
    main_bar_dia: '20',
    link_dia: '10',
    link_spacing: '200',
    gamma_c: '1.5',
    gamma_s: '1.15',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'beam_width', label: 'Beam Width' },
  { key: 'beam_depth', label: 'Beam Depth' },
  { key: 'cover', label: 'Cover' },
  { key: 'span_length', label: 'Span Length' },
  { key: 'dead_load', label: 'Dead Load' },
  { key: 'imposed_load', label: 'Imposed Load' },
  { key: 'point_load', label: 'Point Load' },
  { key: 'point_load_position', label: 'Point Load Position' },
  { key: 'gamma_g', label: 'Gamma G' },
  { key: 'gamma_q', label: 'Gamma Q' },
  { key: 'main_bar_dia', label: 'Main Bar Dia' },
  { key: 'link_dia', label: 'Link Dia' },
  { key: 'link_spacing', label: 'Link Spacing' },
  { key: 'gamma_c', label: 'Gamma C' },
  { key: 'gamma_s', label: 'Gamma S' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'beam_width', label: 'Beam_width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'beam_depth', label: 'Beam_depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'cover', label: 'Cover', min: 0, max: 100, step: 1, unit: '' },
    { key: 'span_length', label: 'Span_length', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const [results, setResults] = useState<RCBeamResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    loading: true,
    reinforcement: true,
    factors: false,
  });
  const updateForm = (field: keyof RCBeamForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
  // Calculation (EN 1992-1-1)
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      // Geometry
      const b = parseFloat(form.beam_width);
      const h = parseFloat(form.beam_depth);
      const c = parseFloat(form.cover);
      const L = parseFloat(form.span_length);
      const phi_main = parseFloat(form.main_bar_dia);
      const phi_link = parseFloat(form.link_dia);

      const d = h - c - phi_link - phi_main / 2;

      // Materials
      const concrete = CONCRETE_GRADES[form.concrete_grade];
      const fck = concrete.fck;
      const fctm = concrete.fctm;
      const gamma_c = parseFloat(form.gamma_c);
      const fcd = fck / gamma_c;

      const steel = STEEL_GRADES[form.steel_grade];
      const fyk = steel.fyk;
      const gamma_s = parseFloat(form.gamma_s);
      const fyd = fyk / gamma_s;

      // Loading
      const gk = parseFloat(form.dead_load); // kN/m
      const qk = parseFloat(form.imposed_load); // kN/m
      const gamma_g = parseFloat(form.gamma_g);
      const gamma_q = parseFloat(form.gamma_q);
      const P = parseFloat(form.point_load);

      const w_uls = gamma_g * gk + gamma_q * qk; // kN/m

      // Support conditions
      const support = SUPPORT_CONDITIONS[form.support_conditions];
      const M_factor = support.factor;
      const K_deflection = support.K_deflection;

      // Bending moment and shear
      let M_Ed: number;
      let V_Ed: number;

      if (form.support_conditions === 'cantilever') {
        M_Ed = ((w_uls * L ** 2) / 2 + P * L) / 1e6; // kNm
        V_Ed = (w_uls * L) / 1000 + P; // kN
      } else {
        M_Ed = (M_factor * w_uls * L ** 2) / 1e6; // kNm (convert from N.mm)
        V_Ed = (w_uls * L) / 2000 + P / 2; // kN
      }

      // ── FLEXURE (Clause 6.1) ──
      const K = (M_Ed * 1e6) / (b * d ** 2 * fck);
      const K_bal = 0.167; // For x/d = 0.45

      if (K > K_bal) {
        newWarnings.push('Compression reinforcement may be required (K > K_bal)');
      }

      const z = Math.min(0.95 * d, d * (0.5 + Math.sqrt(0.25 - K / 1.134)));

      const As_req = (M_Ed * 1e6) / (fyd * z);

      // Minimum reinforcement (Clause 9.2.1.1)
      const As_min = Math.max(0.26 * (fctm / fyk) * b * d, 0.0013 * b * d);

      // Maximum reinforcement
      const As_max = 0.04 * b * h;

      // Provided reinforcement
      const bar_area = BAR_AREAS[form.main_bar_dia];
      const As_design = Math.max(As_req, As_min);
      const n_bars = Math.ceil(As_design / bar_area);
      const As_prov = n_bars * bar_area;

      const flexure_util = (As_req / As_prov) * 100;
      const flexure_status = As_prov >= As_req ? 'PASS' : 'FAIL';

      // ── SHEAR (Clause 6.2) ──
      // Concrete shear resistance without reinforcement
      const rho_l = Math.min(0.02, As_prov / (b * d));
      const k_shear = Math.min(2.0, 1 + Math.sqrt(200 / d));
      const v_min = 0.035 * Math.pow(k_shear, 1.5) * Math.sqrt(fck);
      const CRd_c = 0.18 / gamma_c;
      const VRd_c = Math.max(
        (CRd_c * k_shear * Math.pow(100 * rho_l * fck, 1 / 3) * b * d) / 1000,
        (v_min * b * d) / 1000,
      ); // kN

      // Check if shear reinforcement needed
      const shear_reinf_required = V_Ed > VRd_c;

      // Shear reinforcement (if needed)
      const link_area = 2 * BAR_AREAS[form.link_dia]; // 2 legs
      const s = parseFloat(form.link_spacing);
      const Asw_s_prov = link_area / s;

      // Variable strut angle
      const nu = 0.6 * (1 - fck / 250);
      const alpha_cw = 1.0;

      // Solve for theta
      const v_Ed = (V_Ed * 1000) / (b * 0.9 * d);
      let cot_theta: number;
      if (shear_reinf_required) {
        const tan_theta_sq = v_Ed / (alpha_cw * nu * fcd) - 1;
        if (tan_theta_sq > 0) {
          cot_theta = 1 / Math.sqrt(tan_theta_sq);
          cot_theta = Math.max(1.0, Math.min(2.5, cot_theta));
        } else {
          cot_theta = 2.5;
        }
      } else {
        cot_theta = 2.5;
      }

      // VRd,max
      const VRd_max = (alpha_cw * b * 0.9 * d * nu * fcd) / ((cot_theta + 1 / cot_theta) * 1000);

      // VRd,s
      const fywd = (0.8 * fyk) / gamma_s;
      const VRd_s = (Asw_s_prov * 0.9 * d * fywd * cot_theta) / 1000;

      // Required shear reinforcement
      const Asw_s_req = shear_reinf_required ? (V_Ed * 1000) / (0.9 * d * fywd * cot_theta) : 0;

      const shear_util = shear_reinf_required
        ? (V_Ed / Math.min(VRd_s, VRd_max)) * 100
        : (V_Ed / VRd_c) * 100;
      const shear_status = (shear_reinf_required ? VRd_s >= V_Ed && VRd_max >= V_Ed : VRd_c >= V_Ed)
        ? 'PASS'
        : 'FAIL';

      // ── DEFLECTION (Clause 7.4.2) ──
      const rho_0 = Math.sqrt(fck) / 1000;
      const rho = As_prov / (b * d);

      let L_d_limit: number;
      if (rho <= rho_0) {
        L_d_limit =
          K_deflection *
          (11 +
            (1.5 * Math.sqrt(fck) * rho_0) / rho +
            3.2 * Math.sqrt(fck) * Math.pow(rho_0 / rho - 1, 1.5));
      } else {
        L_d_limit = K_deflection * (11 + (1.5 * Math.sqrt(fck) * rho_0) / (rho - rho_0 / 2));
      }

      // Modification for steel stress
      const sigma_s = (fyk / gamma_s) * (As_req / As_prov);
      const factor_310 = 310 / sigma_s;
      L_d_limit = L_d_limit * factor_310;

      // Modification for flanged sections (none for rectangular)
      // Modification for long spans (none for span < 7m)

      const L_d_actual = L / d;
      const deflection_util = (L_d_actual / L_d_limit) * 100;
      const deflection_status = L_d_actual <= L_d_limit ? 'PASS' : 'FAIL';

      // ── OVERALL ASSESSMENT ──
      const overall_util = Math.max(flexure_util, shear_util, deflection_util);

      let classification: string;
      let classColor: string;
      if (overall_util <= 70) {
        classification = 'Optimal';
        classColor = 'text-green-400';
      } else if (overall_util <= 90) {
        classification = 'Efficient';
        classColor = 'text-emerald-400';
      } else if (overall_util <= 100) {
        classification = 'Adequate';
        classColor = 'text-amber-400';
      } else {
        classification = 'Overstressed';
        classColor = 'text-red-400';
      }

      const status =
        flexure_status === 'PASS' && shear_status === 'PASS' && deflection_status === 'PASS'
          ? 'PASS'
          : 'FAIL';

      // Warnings
      if (K > 0.167) {
        newWarnings.push('Section is doubly reinforced — compression steel required');
      }
      if (n_bars > 6) {
        newWarnings.push(`${n_bars} bars required — check bar spacing`);
      }
      if (d < 200) {
        newWarnings.push('Shallow beam — shear may govern');
      }
      if (L / d > 20 && form.support_conditions !== 'cantilever') {
        newWarnings.push('Slender beam — check deflection carefully');
      }

      setResults({
        d,
        b,
        h,
        L,
        w_uls,
        M_Ed,
        V_Ed,
        K,
        K_bal,
        z,
        As_req,
        As_min,
        As_max,
        As_prov,
        n_bars,
        flexure_util,
        flexure_status,
        VRd_c,
        VRd_s,
        VRd_max,
        cot_theta,
        Asw_s_req,
        Asw_s_prov,
        shear_util,
        shear_status,
        shear_reinf_required,
        L_d_actual,
        L_d_limit,
        K_deflection,
        deflection_util,
        deflection_status,
        overall_util,
        status,
        classification,
        classColor,
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
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'RC Beam Design',
      subtitle: 'EN 1992-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'RCB001' },
        { label: 'Standard', value: 'EN 1992-1-1:2004 (Eurocode 2)' },
      ],
      inputs: [
        { label: 'Beam Width', value: String(form.beam_width), unit: 'mm' },
        { label: 'Beam Depth', value: String(form.beam_depth), unit: 'mm' },
        { label: 'Cover', value: String(form.cover), unit: 'mm' },
        { label: 'Span Length', value: String(form.span_length), unit: 'mm' },
        {
          label: 'Support Conditions',
          value:
            SUPPORT_CONDITIONS[form.support_conditions]?.description || form.support_conditions,
        },
        { label: 'Concrete Grade', value: form.concrete_grade },
        { label: 'Steel Grade', value: form.steel_grade },
        { label: 'Dead Load', value: String(form.dead_load), unit: 'kN/m' },
        { label: 'Imposed Load', value: String(form.imposed_load), unit: 'kN/m' },
        { label: 'Point Load', value: String(form.point_load), unit: 'kN' },
        { label: '\u03b3_G / \u03b3_Q', value: `${form.gamma_g} / ${form.gamma_q}` },
        { label: '\u03b3_c / \u03b3_s', value: `${form.gamma_c} / ${form.gamma_s}` },
      ],
      sections: [
        {
          title: 'Design Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Effective Depth d', results.d.toFixed(1), 'mm'],
            ['M_Ed', results.M_Ed.toFixed(1), 'kNm'],
            ['V_Ed', results.V_Ed.toFixed(1), 'kN'],
            ['K', results.K.toFixed(4), '-'],
            ['K_bal', results.K_bal.toFixed(4), '-'],
            ['Lever Arm z', results.z.toFixed(1), 'mm'],
            ['As,req', results.As_req.toFixed(0), 'mm\u00b2'],
            ['As,min', results.As_min.toFixed(0), 'mm\u00b2'],
            [
              'As,prov',
              `${results.n_bars}T${form.main_bar_dia} = ${results.As_prov.toFixed(0)}`,
              'mm\u00b2',
            ],
            ['VRd,c', results.VRd_c.toFixed(1), 'kN'],
            ['VRd,s', results.VRd_s.toFixed(1), 'kN'],
            ['Links', `R${form.link_dia}@${form.link_spacing}`, 'mm'],
            ['L/d Actual', results.L_d_actual.toFixed(1), '-'],
            ['L/d Limit', results.L_d_limit.toFixed(1), '-'],
          ],
        },
      ],
      checks: [
        {
          name: 'Flexure',
          capacity: `As,prov = ${results.As_prov.toFixed(0)} mm\u00b2`,
          utilisation: String(results.flexure_util.toFixed(1)) + '%',
          status: (results.flexure_status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `VRd = ${Math.min(results.VRd_s, results.VRd_max).toFixed(1)} kN`,
          utilisation: String(results.shear_util.toFixed(1)) + '%',
          status: (results.shear_status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `L/d limit = ${results.L_d_limit.toFixed(1)}`,
          utilisation: String(results.deflection_util.toFixed(1)) + '%',
          status: (results.deflection_status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Flexure',
          suggestion:
            'Consider increasing bar diameter or number of bars if utilisation exceeds 90%',
        },
        {
          check: 'Shear',
          suggestion: 'Reduce link spacing near supports where shear demand is highest',
        },
        {
          check: 'Deflection',
          suggestion: 'Increase beam depth or add compression steel to improve span/depth ratio',
        },
      ],
      warnings: warnings.map((w) => ({ message: w })),
      footerNote: 'Beaver Bridges Ltd \u2014 RC Beam Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'RC Beam Design',
      subtitle: 'EN 1992-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'RCB001' },
        { label: 'Standard', value: 'EN 1992-1-1:2004 (Eurocode 2)' },
      ],
      inputs: [
        { label: 'Beam Width', value: String(form.beam_width), unit: 'mm' },
        { label: 'Beam Depth', value: String(form.beam_depth), unit: 'mm' },
        { label: 'Cover', value: String(form.cover), unit: 'mm' },
        { label: 'Span Length', value: String(form.span_length), unit: 'mm' },
        {
          label: 'Support Conditions',
          value:
            SUPPORT_CONDITIONS[form.support_conditions]?.description || form.support_conditions,
        },
        { label: 'Concrete Grade', value: form.concrete_grade },
        { label: 'Steel Grade', value: form.steel_grade },
        { label: 'Dead Load', value: String(form.dead_load), unit: 'kN/m' },
        { label: 'Imposed Load', value: String(form.imposed_load), unit: 'kN/m' },
        { label: 'Point Load', value: String(form.point_load), unit: 'kN' },
        { label: '\u03b3_G / \u03b3_Q', value: `${form.gamma_g} / ${form.gamma_q}` },
        { label: '\u03b3_c / \u03b3_s', value: `${form.gamma_c} / ${form.gamma_s}` },
      ],
      sections: [
        {
          title: 'Design Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Effective Depth d', results.d.toFixed(1), 'mm'],
            ['M_Ed', results.M_Ed.toFixed(1), 'kNm'],
            ['V_Ed', results.V_Ed.toFixed(1), 'kN'],
            ['K', results.K.toFixed(4), '-'],
            ['K_bal', results.K_bal.toFixed(4), '-'],
            ['Lever Arm z', results.z.toFixed(1), 'mm'],
            ['As,req', results.As_req.toFixed(0), 'mm\u00b2'],
            ['As,min', results.As_min.toFixed(0), 'mm\u00b2'],
            [
              'As,prov',
              `${results.n_bars}T${form.main_bar_dia} = ${results.As_prov.toFixed(0)}`,
              'mm\u00b2',
            ],
            ['VRd,c', results.VRd_c.toFixed(1), 'kN'],
            ['VRd,s', results.VRd_s.toFixed(1), 'kN'],
            ['Links', `R${form.link_dia}@${form.link_spacing}`, 'mm'],
            ['L/d Actual', results.L_d_actual.toFixed(1), '-'],
            ['L/d Limit', results.L_d_limit.toFixed(1), '-'],
          ],
        },
      ],
      checks: [
        {
          name: 'Flexure',
          capacity: `As,prov = ${results.As_prov.toFixed(0)} mm\u00b2`,
          utilisation: String(results.flexure_util.toFixed(1)) + '%',
          status: (results.flexure_status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `VRd = ${Math.min(results.VRd_s, results.VRd_max).toFixed(1)} kN`,
          utilisation: String(results.shear_util.toFixed(1)) + '%',
          status: (results.shear_status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `L/d limit = ${results.L_d_limit.toFixed(1)}`,
          utilisation: String(results.deflection_util.toFixed(1)) + '%',
          status: (results.deflection_status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Flexure',
          suggestion:
            'Consider increasing bar diameter or number of bars if utilisation exceeds 90%',
        },
        {
          check: 'Shear',
          suggestion: 'Reduce link spacing near supports where shear demand is highest',
        },
        {
          check: 'Deflection',
          suggestion: 'Increase beam depth or add compression steel to improve span/depth ratio',
        },
      ],
      warnings: warnings.map((w) => ({ message: w })),
      footerNote: 'Beaver Bridges Ltd \u2014 RC Beam Design',
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
      className={cn('rounded-2xl border overflow-hidden bg-gray-900/40 backdrop-blur-md', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Input Component
  // ─────────────────────────────────────────────────────────────────────────────
  const InputField: React.FC<{
    label: string;
    field: keyof RCBeamForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} className="block text-sm font-semibold text-gray-300 mb-2" />
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
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1992-1-1</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            RC Beam Design
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Reinforced concrete beam design for flexure, shear, and deflection to Eurocode 2
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button
            onClick={exportPDF}
            disabled={!results}
            className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-40"
          >
            <FiDownload className="mr-2 w-4 h-4" />
            PDF
          </Button>
          <Button
            onClick={exportDOCX}
            disabled={!results}
            className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-40"
          >
            <FiDownload className="mr-2 w-4 h-4" />
            DOCX
          </Button>
          {results && (
            <SaveRunButton
              calculatorKey="rc-beam"
              inputs={form as unknown as Record<string, string | number>}
              results={results}
              status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
            />
          )}
          <div className="flex-1" />
          {/* View Tabs */}
          <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
            {[
              { id: 'input', label: 'Inputs', icon: <FiGrid className="w-4 h-4" /> },
              { id: 'results', label: 'Analysis', icon: <FiTarget className="w-4 h-4" />, disabled: !results },
              { id: 'visualization', label: 'Visualization', icon: <FiBox className="w-4 h-4" />, disabled: !results },
            ].map((tab) => (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Presets */}
        <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-3 text-white font-semibold">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <FiZap className="w-6 h-6 text-blue-400" />
              </div>
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
                {/* Geometry */}
                <Section
                  id="geometry"
                  title="Section & Span"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Beam Width b" field="beam_width" unit="mm" />
                    <InputField label="Beam Depth h" field="beam_depth" unit="mm" />
                    <InputField label="Cover to Links" field="cover" unit="mm" />
                    <InputField label="Span Length L" field="span_length" unit="mm" />
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Support Conditions</label>
                      <select
                        title="Support Conditions"
                        value={form.support_conditions}
                        onChange={(e) => updateForm('support_conditions', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(SUPPORT_CONDITIONS).map(([key, val]) => (
                          <option key={key} value={key}>
                            {val.description}
                          </option>
                        ))}
                      </select>
                    </div>
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

                {/* Loading */}
                <Section
                  id="loading"
                  title="Loading"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Dead Load (Characteristic)" field="dead_load" unit="kN/m" />
                    <InputField
                      label="Imposed Load (Characteristic)"
                      field="imposed_load"
                      unit="kN/m"
                    />
                    <InputField label="Point Load" field="point_load" unit="kN" />
                    <InputField label="γ_G (Dead Load Factor)" field="gamma_g" />
                    <InputField label="γ_Q (Imposed Load Factor)" field="gamma_q" />
                  </div>
                </Section>

                {/* Reinforcement */}
                <Section
                  id="reinforcement"
                  title="Reinforcement"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiSliders className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Main Bar Diameter</label>
                      <select
                        title="Main Bar Diameter"
                        value={form.main_bar_dia}
                        onChange={(e) => updateForm('main_bar_dia', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(BAR_AREAS).map((dia) => (
                          <option key={dia} value={dia}>
                            T{dia} ({BAR_AREAS[dia].toFixed(0)} mm²)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Link Diameter</label>
                      <select
                        title="Link Diameter"
                        value={form.link_dia}
                        onChange={(e) => updateForm('link_dia', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {['8', '10', '12'].map((dia) => (
                          <option key={dia} value={dia}>
                            R{dia}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Link Spacing" field="link_spacing" unit="mm" />
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Steel Grade</label>
                      <select
                        title="Steel Grade"
                        value={form.steel_grade}
                        onChange={(e) => updateForm('steel_grade', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(STEEL_GRADES).map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Partial Factors */}
                <Section
                  id="factors"
                  title="Partial Factors"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="γ_c (Concrete)" field="gamma_c" />
                    <InputField label="γ_s (Steel)" field="gamma_s" />
                  </div>
                </Section>

                {/* RUN FULL ANALYSIS Button */}
                <button
                  onClick={() => {
                    calculate();
                    setActiveTab('results');
                  }}
                  disabled={isCalculating}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isCalculating ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      ANALYSING...
                    </span>
                  ) : (
                    '\u25B6 RUN FULL ANALYSIS'
                  )}
                </button>
              </div>

              {/* Results Sidebar — Sticky */}
              <div className="space-y-4">
                <div className="sticky top-8 space-y-4">
                {/* Fullscreen Preview Overlay */}
                {previewMaximized && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex">
                    <div className="flex-1 relative">
                      <Interactive3DDiagram
                        height="h-full"
                        cameraPosition={[5, 3, 5]}
                        status={(results?.status || null) as 'PASS' | 'FAIL' | null}
                      >
                        <RCBeam3D
                          width={parseFloat(form.beam_width) || 300}
                          depth={parseFloat(form.beam_depth) || 500}
                          span={parseFloat(form.span_length) || 6}
                          cover={parseFloat(form.cover) || 35}
                          mainBarDia={parseFloat(form.main_bar_dia) || 20}
                          nBars={results?.n_bars || 3}
                          linkDia={parseFloat(form.link_dia) || 10}
                          linkSpacing={parseFloat(form.link_spacing) || 200}
                          udl={
                            (parseFloat(form.dead_load) || 0) + (parseFloat(form.imposed_load) || 0)
                          }
                          pointLoad={parseFloat(form.point_load) || 0}
                          pointLoadPos={(parseFloat(form.point_load_position) || 50) / 100}
                          status={(results?.status || 'PASS') as 'PASS' | 'FAIL'}
                        />
                      </Interactive3DDiagram>
                      <button onClick={() => setPreviewMaximized(false)}
                        title="Exit fullscreen"
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10">
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        RC BEAM — REAL-TIME PREVIEW
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
                          { label: 'Width', value: `${form.beam_width} mm` },
                          { label: 'Depth', value: `${form.beam_depth} mm` },
                          { label: 'Span', value: `${form.span_length} mm` },
                          { label: 'Cover', value: `${form.cover} mm` },
                          { label: 'Concrete', value: form.concrete_grade },
                          { label: 'Dead Load', value: `${form.dead_load} kN/m` },
                          { label: 'Imposed Load', value: `${form.imposed_load} kN/m` },
                          { label: 'Main Bar Ø', value: `${form.main_bar_dia} mm` },
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
                            { label: 'Flexure', util: (results.flexure_util * 100).toFixed(1), status: results.flexure_util > 1 ? 'FAIL' : 'PASS' },
                            { label: 'Shear', util: (results.shear_util * 100).toFixed(1), status: results.shear_util > 1 ? 'FAIL' : 'PASS' },
                            { label: 'Deflection', util: (results.deflection_util * 100).toFixed(1), status: results.deflection_util > 1 ? 'FAIL' : 'PASS' },
                            { label: 'Overall', util: (results.overall_util * 100).toFixed(1), status: results.overall_util > 1 ? 'FAIL' : 'PASS' },
                            { label: 'As,req', util: results.As_req.toFixed(0) + ' mm²', status: results.status === 'PASS' ? 'PASS' : 'FAIL' },
                          ].map((check) => (
                            <div key={check.label} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-500">{check.label}</span>
                              <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util)) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                                {check.util}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setPreviewMaximized(false)}
                        className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors">
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
                {/* 3D Interactive Diagram */}
                <WhatIfPreview
                  title="RC Beam — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram
                      height={fsHeight}
                      cameraPosition={[5, 3, 5]}
                      status={(results?.status || null) as 'PASS' | 'FAIL' | null}
                    >
                      <RCBeam3D
                        width={parseFloat(form.beam_width) || 300}
                        depth={parseFloat(form.beam_depth) || 500}
                        span={parseFloat(form.span_length) || 6}
                        cover={parseFloat(form.cover) || 35}
                        mainBarDia={parseFloat(form.main_bar_dia) || 20}
                        nBars={results?.n_bars || 3}
                        linkDia={parseFloat(form.link_dia) || 10}
                        linkSpacing={parseFloat(form.link_spacing) || 200}
                        udl={
                          (parseFloat(form.dead_load) || 0) + (parseFloat(form.imposed_load) || 0)
                        }
                        pointLoad={parseFloat(form.point_load) || 0}
                        pointLoadPos={(parseFloat(form.point_load_position) || 50) / 100}
                        status={(results?.status || 'PASS') as 'PASS' | 'FAIL'}
                      />
                    </Interactive3DDiagram>
                  )}
                />

                {/* Results */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    {/* Status */}
                    <Card
                      variant="glass"
                      className={cn(
                        'border-l-4 shadow-lg bg-gray-900/40 backdrop-blur-md border border-gray-700/50',
                        results.status === 'PASS'
                          ? 'border-l-green-400'
                          : 'border-l-red-400',
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
                        <p className={cn('text-sm', results.classColor)}>
                          {results.classification} — {results.overall_util.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>

                    {/* Design Checks */}
                    <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          {
                            name: 'Flexure',
                            util: results.flexure_util,
                            status: results.flexure_status,
                          },
                          { name: 'Shear', util: results.shear_util, status: results.shear_status },
                          {
                            name: 'Deflection',
                            util: results.deflection_util,
                            status: results.deflection_status,
                          },
                        ].map((check) => (
                          <div key={check.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">{check.name}</span>
                              <span
                                className={cn(
                                  check.util <= 100 ? 'text-green-400' : 'text-red-400',
                                )}
                              >
                                {check.util.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(check.util, 100)}%` }}
                                className={cn(
                                  'h-full rounded-full',
                                  check.util <= 70
                                    ? 'bg-green-500'
                                    : check.util <= 90
                                      ? 'bg-emerald-500'
                                      : check.util <= 100
                                        ? 'bg-amber-500'
                                        : 'bg-red-500',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Flexure Summary */}
                    <Card variant="glass" className="border-l-4 border-l-blue-400 bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Flexure</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">M_Ed</p>
                          <p className="text-white font-mono">{results.M_Ed.toFixed(1)} kNm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">As,req</p>
                          <p className="text-white font-mono">{results.As_req.toFixed(0)} mm²</p>
                        </div>
                        <div>
                          <p className="text-gray-500">As,prov</p>
                          <p className="text-white font-mono">{results.As_prov.toFixed(0)} mm²</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Bars</p>
                          <p className="text-white font-mono">
                            {results.n_bars}T{form.main_bar_dia}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Shear Summary */}
                    <Card variant="glass" className="border-l-4 border-l-yellow-400 bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Shear</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">V_Ed</p>
                          <p className="text-white font-mono">{results.V_Ed.toFixed(1)} kN</p>
                        </div>
                        <div>
                          <p className="text-gray-500">VRd,c</p>
                          <p className="text-white font-mono">{results.VRd_c.toFixed(1)} kN</p>
                        </div>
                        <div>
                          <p className="text-gray-500">VRd,s</p>
                          <p className="text-white font-mono">{results.VRd_s.toFixed(1)} kN</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Links</p>
                          <p className="text-white font-mono">
                            R{form.link_dia}@{form.link_spacing}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recommendations */}
                    <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                      <CardHeader>
                        <CardTitle className="text-white font-semibold flex items-center gap-2">
                          <FiCheckCircle className="w-5 h-5 text-blue-400" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            Increase bar size or number if flexure utilisation exceeds 90%
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            Reduce link spacing near supports for high shear demand
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            Add compression steel to improve span/depth ratio
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            Verify detailing for crack width control per EN 1992-1-1 §7.3
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-amber-500/30">
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

                    {/* Export */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                      >
                        <FiDownload className="w-4 h-4 mr-2" />
                        Export PDF Report
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FiDownload className="w-4 h-4 mr-2" />
                        DOCX
                      </Button>
                    </div>
                  </motion.div>
                )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
  );
};

export default RCBeam;
