// =============================================================================
// Punching Shear Calculator — Premium Version
// EN 1992-1-1 Clause 6.4 — RC Slab Punching Shear Design
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiBox,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTarget,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import PunchingShear3D from '../../components/3d/scenes/PunchingShear3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { CONCRETE_GRADES } from '../../data/materialGrades';
import { validateNumericInputs } from '../../lib/validation';
// Types
// =============================================================================

interface PunchingShearForm {
  // Slab Properties
  slab_thickness: string;
  effective_depth_x: string;
  effective_depth_y: string;
  concrete_grade: string;

  // Column Properties
  column_type: string;
  column_width: string;
  column_depth: string;
  column_position: string;

  // Reinforcement
  asx_top: string;
  asy_top: string;

  // Loading
  ultimate_reaction: string;
  moment_transfer_x: string;
  moment_transfer_y: string;
  beta_factor: string;

  // Shear Reinforcement
  shear_reinf_type: string;
  stud_diameter: string;
  stud_spacing: string;
  stud_rows: string;

  // Partial Factors
  gamma_c: string;
  gamma_s: string;

  // Project Info
  projectName: string;
  reference: string;
}

interface PunchingShearResults {
  // Geometry
  d_avg: number;
  u0: number;
  u1: number;
  u1_red: number;
  control_perimeter_distance: number;

  // Shear Stresses
  vEd_u0: number;
  vEd_u1: number;
  vRd_max: number;
  vRd_c: number;

  // Reinforcement
  rho_lx: number;
  rho_ly: number;
  rho_l: number;
  k_factor: number;

  // Unreinforced Check
  shear_ratio_u1: number;
  unreinforced_status: string;

  // Maximum Shear Check
  max_shear_ratio: number;
  max_shear_status: string;

  // Reinforcement Required
  reinf_required: boolean;
  vRd_cs: number;
  Asw_req: number;
  Asw_prov: number;

  // Outer Perimeter
  u_out: number;
  u_out_eff: number;

  // Overall
  governing_check: string;
  overall_util: number;
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// Concrete Data
// =============================================================================

const COLUMN_POSITIONS: Record<string, number> = {
  Internal: 1.0,
  'Edge (perpendicular)': 1.4,
  'Edge (parallel)': 1.15,
  Corner: 1.5,
};

const PRESETS: Record<string, { name: string; form: Partial<PunchingShearForm> }> = {
  flat_slab_internal: {
    name: 'Flat Slab Internal Column',
    form: {
      slab_thickness: '300',
      effective_depth_x: '260',
      effective_depth_y: '240',
      concrete_grade: 'C32/40',
      column_type: 'rectangular',
      column_width: '400',
      column_depth: '400',
      column_position: 'Internal',
      asx_top: '1005',
      asy_top: '1005',
      ultimate_reaction: '800',
      beta_factor: '1.15',
    },
  },
  flat_slab_edge: {
    name: 'Flat Slab Edge Column',
    form: {
      slab_thickness: '275',
      effective_depth_x: '235',
      effective_depth_y: '215',
      concrete_grade: 'C32/40',
      column_type: 'rectangular',
      column_width: '350',
      column_depth: '350',
      column_position: 'Edge (perpendicular)',
      asx_top: '785',
      asy_top: '785',
      ultimate_reaction: '500',
      beta_factor: '1.40',
    },
  },
  pad_footing: {
    name: 'Pad Footing',
    form: {
      slab_thickness: '500',
      effective_depth_x: '440',
      effective_depth_y: '420',
      concrete_grade: 'C30/37',
      column_type: 'rectangular',
      column_width: '450',
      column_depth: '450',
      column_position: 'Internal',
      asx_top: '1570',
      asy_top: '1570',
      ultimate_reaction: '1500',
      beta_factor: '1.0',
    },
  },
  corner_column: {
    name: 'Corner Column',
    form: {
      slab_thickness: '250',
      effective_depth_x: '210',
      effective_depth_y: '190',
      concrete_grade: 'C32/40',
      column_type: 'rectangular',
      column_width: '300',
      column_depth: '300',
      column_position: 'Corner',
      asx_top: '565',
      asy_top: '565',
      ultimate_reaction: '300',
      beta_factor: '1.50',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const PunchingShear: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<PunchingShearForm>({
    slab_thickness: '300',
    effective_depth_x: '260',
    effective_depth_y: '240',
    concrete_grade: 'C32/40',
    column_type: 'rectangular',
    column_width: '400',
    column_depth: '400',
    column_position: 'Internal',
    asx_top: '1005',
    asy_top: '1005',
    ultimate_reaction: '800',
    moment_transfer_x: '0',
    moment_transfer_y: '0',
    beta_factor: '1.15',
    shear_reinf_type: 'none',
    stud_diameter: '12',
    stud_spacing: '150',
    stud_rows: '3',
    gamma_c: '1.5',
    gamma_s: '1.15',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'slab_thickness', label: 'Slab Thickness' },
  { key: 'effective_depth_x', label: 'Effective Depth X' },
  { key: 'effective_depth_y', label: 'Effective Depth Y' },
  { key: 'column_width', label: 'Column Width' },
  { key: 'column_depth', label: 'Column Depth' },
  { key: 'asx_top', label: 'Asx Top' },
  { key: 'asy_top', label: 'Asy Top' },
  { key: 'ultimate_reaction', label: 'Ultimate Reaction' },
  { key: 'moment_transfer_x', label: 'Moment Transfer X' },
  { key: 'moment_transfer_y', label: 'Moment Transfer Y' },
  { key: 'beta_factor', label: 'Beta Factor' },
  { key: 'stud_diameter', label: 'Stud Diameter' },
  { key: 'stud_spacing', label: 'Stud Spacing' },
  { key: 'stud_rows', label: 'Stud Rows' },
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
    { key: 'slab_thickness', label: 'Slab_thickness', min: 0, max: 100, step: 1, unit: '' },
    { key: 'effective_depth_x', label: 'Effective_depth_x', min: 0, max: 100, step: 1, unit: '' },
    { key: 'effective_depth_y', label: 'Effective_depth_y', min: 0, max: 100, step: 1, unit: '' },
    { key: 'concrete_grade', label: 'Concrete_grade', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<PunchingShearResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    slab: true,
    column: true,
    loading: true,
    reinforcement: false,
  });
  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const updateForm = (field: keyof PunchingShearForm, value: string) => {
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
  // Calculation (EN 1992-1-1 Clause 6.4)
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      // Slab properties
      const h = parseFloat(form.slab_thickness);
      const dx = parseFloat(form.effective_depth_x);
      const dy = parseFloat(form.effective_depth_y);
      const d_avg = (dx + dy) / 2;

      // Concrete
      const concrete = CONCRETE_GRADES[form.concrete_grade];
      const fck = concrete.fck;
      const gamma_c = parseFloat(form.gamma_c);
      const fcd = fck / gamma_c;

      // Column
      const c1 = parseFloat(form.column_width);
      const c2 = parseFloat(form.column_depth);
      const beta = parseFloat(form.beta_factor);

      // Loading
      const V_Ed = parseFloat(form.ultimate_reaction) * 1000; // N

      // Reinforcement
      const Asx = parseFloat(form.asx_top);
      const Asy = parseFloat(form.asy_top);

      // ── Control perimeters (Clause 6.4.2) ──

      // u0 - column perimeter
      let u0: number;
      if (form.column_type === 'circular') {
        u0 = Math.PI * c1;
      } else {
        u0 = 2 * (c1 + c2);
      }

      // u1 - basic control perimeter at 2d
      const control_distance = 2 * d_avg;
      let u1: number;
      if (form.column_type === 'circular') {
        u1 = Math.PI * (c1 + 2 * control_distance);
      } else {
        u1 = 2 * (c1 + c2) + 2 * Math.PI * control_distance;
      }

      // Reduced perimeter for edge/corner columns
      let u1_red = u1;
      if (form.column_position === 'Edge (perpendicular)') {
        u1_red = c1 + 2 * c2 + Math.PI * control_distance;
      } else if (form.column_position === 'Edge (parallel)') {
        u1_red = 2 * c1 + c2 + Math.PI * control_distance;
      } else if (form.column_position === 'Corner') {
        u1_red = c1 + c2 + (Math.PI * control_distance) / 2;
      }

      // ── Shear stresses ──

      // At column face (u0)
      const vEd_u0 = (beta * V_Ed) / (u0 * d_avg);

      // At control perimeter (u1)
      const vEd_u1 = (beta * V_Ed) / (u1_red * d_avg);

      // ── Concrete shear resistance (Clause 6.4.4) ──

      // Size effect factor
      const k_factor = Math.min(2.0, 1 + Math.sqrt(200 / d_avg));

      // Reinforcement ratios
      const rho_lx = Asx / (1000 * dx);
      const rho_ly = Asy / (1000 * dy);
      const rho_l = Math.min(0.02, Math.sqrt(rho_lx * rho_ly));

      // Minimum shear stress
      const vmin = 0.035 * Math.pow(k_factor, 1.5) * Math.sqrt(fck);

      // vRd,c - concrete shear resistance
      const CRd_c = 0.18 / gamma_c;
      const vRd_c = Math.max(vmin, CRd_c * k_factor * Math.pow(100 * rho_l * fck, 1 / 3));

      // vRd,max - maximum punching shear at column face
      const nu = 0.6 * (1 - fck / 250);
      const vRd_max = 0.5 * nu * fcd;

      // ── Check unreinforced ──
      const shear_ratio_u1 = vEd_u1 / vRd_c;
      const unreinforced_status = shear_ratio_u1 <= 1.0 ? 'PASS' : 'FAIL';

      // ── Check maximum shear ──
      const max_shear_ratio = vEd_u0 / vRd_max;
      const max_shear_status = max_shear_ratio <= 1.0 ? 'PASS' : 'FAIL';

      // ── Shear reinforcement if required ──
      let reinf_required = shear_ratio_u1 > 1.0;
      let vRd_cs = 0;
      let Asw_req = 0;
      let Asw_prov = 0;
      let u_out = 0;
      let u_out_eff = 0;

      if (form.shear_reinf_type !== 'none' || reinf_required) {
        // Shear reinforcement design (Clause 6.4.5)
        const fywd_eff = 250 + 0.25 * d_avg; // MPa (for studs)
        const sr = parseFloat(form.stud_spacing);
        const n_rows = parseFloat(form.stud_rows);
        const stud_dia = parseFloat(form.stud_diameter);
        const Asw_per_stud = (Math.PI * stud_dia ** 2) / 4;

        // Required Asw per perimeter
        Asw_req = ((vEd_u1 - 0.75 * vRd_c) * sr * u1_red) / (1.5 * d_avg * fywd_eff);

        // Provided (assuming studs around perimeter)
        const studs_per_row = Math.ceil(u1_red / (sr * 1.5));
        Asw_prov = studs_per_row * n_rows * Asw_per_stud;

        // vRd,cs with reinforcement
        vRd_cs = 0.75 * vRd_c + ((1.5 * d_avg) / sr) * (Asw_prov / u1_red) * fywd_eff * (1 / d_avg);

        // Outer control perimeter
        u_out = (beta * V_Ed) / (vRd_c * d_avg);
        u_out_eff = u_out;
      }

      // ── Overall status ──
      let overall_util: number;
      let governing_check: string;

      if (reinf_required && form.shear_reinf_type !== 'none') {
        const reinforced_util = vEd_u1 / vRd_cs;
        overall_util = Math.max(max_shear_ratio, reinforced_util) * 100;
        governing_check = max_shear_ratio > reinforced_util ? 'Max shear (u0)' : 'Reinforced (u1)';
      } else {
        overall_util = Math.max(max_shear_ratio, shear_ratio_u1) * 100;
        governing_check = max_shear_ratio > shear_ratio_u1 ? 'Max shear (u0)' : 'Unreinforced (u1)';
      }

      // Classification
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

      const status = overall_util <= 100 ? 'PASS' : 'FAIL';

      // Warnings
      if (max_shear_ratio > 1.0) {
        newWarnings.push(
          'Maximum shear at column face exceeded — increase slab depth or column size',
        );
      }
      if (reinf_required && form.shear_reinf_type === 'none') {
        newWarnings.push('Shear reinforcement required — consider adding studs or links');
      }
      if (rho_l < 0.002) {
        newWarnings.push('Low reinforcement ratio — check minimum requirements');
      }
      if (d_avg < 200) {
        newWarnings.push('Thin slab — punching shear capacity may be limited');
      }

      setResults({
        d_avg,
        u0,
        u1,
        u1_red,
        control_perimeter_distance: control_distance,
        vEd_u0,
        vEd_u1,
        vRd_max,
        vRd_c,
        rho_lx,
        rho_ly,
        rho_l,
        k_factor,
        shear_ratio_u1,
        unreinforced_status,
        max_shear_ratio,
        max_shear_status,
        reinf_required,
        vRd_cs,
        Asw_req,
        Asw_prov,
        u_out,
        u_out_eff,
        governing_check,
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
  // Canvas Drawing
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.max_shear_status === 'FAIL')
      pdfRecs.push({
        check: 'Max Shear Exceeded',
        suggestion: 'Increase slab depth or column dimensions to reduce face shear',
      });
    if (results.reinf_required && form.shear_reinf_type === 'none')
      pdfRecs.push({
        check: 'Reinforcement Needed',
        suggestion: 'Add shear studs or links — unreinforced capacity insufficient',
      });
    if (results.overall_util > 90 && results.overall_util <= 100)
      pdfRecs.push({
        check: 'Near Capacity',
        suggestion: `Utilisation ${results.overall_util.toFixed(0)}% — limited margin, consider increasing depth`,
      });
    if (results.rho_l < 0.002)
      pdfRecs.push({
        check: 'Low Reinforcement',
        suggestion: 'Reinforcement ratio below 0.2% — check minimum provisions',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Punching shear capacity satisfactory to EN 1992-1-1 Cl. 6.4',
      });
    generatePremiumPDF({
      title: 'Punching Shear',
      subtitle: 'EN 1992-1-1 Clause 6.4',
      projectInfo: [
        { label: 'Project', value: form.projectName || 'Punching Shear' },
        { label: 'Reference', value: form.reference || 'PUN001' },
        { label: 'Standard', value: 'EN 1992-1-1' },
      ],
      inputs: [
        { label: 'Slab Thickness', value: `${form.slab_thickness} mm` },
        { label: 'Effective Depth dx', value: `${form.effective_depth_x} mm` },
        { label: 'Effective Depth dy', value: `${form.effective_depth_y} mm` },
        { label: 'Concrete Grade', value: form.concrete_grade },
        { label: 'Column Type', value: form.column_type },
        { label: 'Column Size', value: `${form.column_width} × ${form.column_depth} mm` },
        { label: 'Column Position', value: form.column_position },
        { label: 'Asx (top)', value: `${form.asx_top} mm²/m` },
        { label: 'Asy (top)', value: `${form.asy_top} mm²/m` },
        { label: 'Ultimate Reaction', value: `${form.ultimate_reaction} kN` },
        { label: 'β Factor', value: form.beta_factor },
      ],
      sections: [
        {
          title: 'Punching Shear Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Average Depth d', results.d_avg.toFixed(0), 'mm'],
            ['Column Perimeter u₀', results.u0.toFixed(0), 'mm'],
            ['Control Perimeter u₁', results.u1_red.toFixed(0), 'mm'],
            ['vEd at u₀', results.vEd_u0.toFixed(3), 'MPa'],
            ['vEd at u₁', results.vEd_u1.toFixed(3), 'MPa'],
            ['vRd,max', results.vRd_max.toFixed(3), 'MPa'],
            ['vRd,c', results.vRd_c.toFixed(3), 'MPa'],
            ['k factor', results.k_factor.toFixed(2), ''],
            ['ρl', (results.rho_l * 100).toFixed(3), '%'],
            ['Max Shear Ratio', (results.max_shear_ratio * 100).toFixed(1), '%'],
            ['Unreinforced Ratio', (results.shear_ratio_u1 * 100).toFixed(1), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Max Shear (u₀)',
          capacity: `${results.vRd_max.toFixed(3)} MPa`,
          utilisation: String(Math.round(results.max_shear_ratio * 100)),
          status: results.max_shear_status as 'PASS' | 'FAIL',
        },
        {
          name: 'Unreinforced (u₁)',
          capacity: `${results.vRd_c.toFixed(3)} MPa`,
          utilisation: String(Math.round(results.shear_ratio_u1 * 100)),
          status: results.unreinforced_status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings,
      footerNote: 'Beaver Bridges Ltd — Punching Shear',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.max_shear_status === 'FAIL')
      pdfRecs.push({
        check: 'Max Shear Exceeded',
        suggestion: 'Increase slab depth or column dimensions to reduce face shear',
      });
    if (results.reinf_required && form.shear_reinf_type === 'none')
      pdfRecs.push({
        check: 'Reinforcement Needed',
        suggestion: 'Add shear studs or links — unreinforced capacity insufficient',
      });
    if (results.overall_util > 90 && results.overall_util <= 100)
      pdfRecs.push({
        check: 'Near Capacity',
        suggestion: `Utilisation ${results.overall_util.toFixed(0)}% — limited margin, consider increasing depth`,
      });
    if (results.rho_l < 0.002)
      pdfRecs.push({
        check: 'Low Reinforcement',
        suggestion: 'Reinforcement ratio below 0.2% — check minimum provisions',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Punching shear capacity satisfactory to EN 1992-1-1 Cl. 6.4',
      });
    generateDOCX({
      title: 'Punching Shear',
      subtitle: 'EN 1992-1-1 Clause 6.4',
      projectInfo: [
        { label: 'Project', value: form.projectName || 'Punching Shear' },
        { label: 'Reference', value: form.reference || 'PUN001' },
        { label: 'Standard', value: 'EN 1992-1-1' },
      ],
      inputs: [
        { label: 'Slab Thickness', value: `${form.slab_thickness} mm` },
        { label: 'Effective Depth dx', value: `${form.effective_depth_x} mm` },
        { label: 'Effective Depth dy', value: `${form.effective_depth_y} mm` },
        { label: 'Concrete Grade', value: form.concrete_grade },
        { label: 'Column Type', value: form.column_type },
        { label: 'Column Size', value: `${form.column_width} × ${form.column_depth} mm` },
        { label: 'Column Position', value: form.column_position },
        { label: 'Asx (top)', value: `${form.asx_top} mm²/m` },
        { label: 'Asy (top)', value: `${form.asy_top} mm²/m` },
        { label: 'Ultimate Reaction', value: `${form.ultimate_reaction} kN` },
        { label: 'β Factor', value: form.beta_factor },
      ],
      sections: [
        {
          title: 'Punching Shear Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Average Depth d', results.d_avg.toFixed(0), 'mm'],
            ['Column Perimeter u₀', results.u0.toFixed(0), 'mm'],
            ['Control Perimeter u₁', results.u1_red.toFixed(0), 'mm'],
            ['vEd at u₀', results.vEd_u0.toFixed(3), 'MPa'],
            ['vEd at u₁', results.vEd_u1.toFixed(3), 'MPa'],
            ['vRd,max', results.vRd_max.toFixed(3), 'MPa'],
            ['vRd,c', results.vRd_c.toFixed(3), 'MPa'],
            ['k factor', results.k_factor.toFixed(2), ''],
            ['ρl', (results.rho_l * 100).toFixed(3), '%'],
            ['Max Shear Ratio', (results.max_shear_ratio * 100).toFixed(1), '%'],
            ['Unreinforced Ratio', (results.shear_ratio_u1 * 100).toFixed(1), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Max Shear (u₀)',
          capacity: `${results.vRd_max.toFixed(3)} MPa`,
          utilisation: String(Math.round(results.max_shear_ratio * 100)),
          status: results.max_shear_status as 'PASS' | 'FAIL',
        },
        {
          name: 'Unreinforced (u₁)',
          capacity: `${results.vRd_c.toFixed(3)} MPa`,
          utilisation: String(Math.round(results.shear_ratio_u1 * 100)),
          status: results.unreinforced_status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings,
      footerNote: 'Beaver Bridges Ltd — Punching Shear',
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
        className="w-full flex items-center justify-between p-4 bg-gray-900/40 hover:bg-gray-800/50 transition-colors"
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
            className="p-4 bg-gray-900/30 backdrop-blur-md"
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
    field: keyof PunchingShearForm;
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
      <div
        className="pointer-events-none absolute inset-0 z-0"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1992-1-1 Clause 6.4</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Punching Shear
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            RC slab punching shear design for column-slab connections to Eurocode 2
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <FiTarget className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Punching Shear Calculator</h2>
              <p className="text-xs text-gray-400">EN 1992-1-1 Clause 6.4</p>
            </div>
          </div>
          <Button
            onClick={exportPDF}
            disabled={!results}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white"
          >
            <FiDownload className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button
            onClick={exportDOCX}
            disabled={!results}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <FiDownload className="w-4 h-4 mr-2" />
            DOCX
          </Button>
        </div>

        {/* Presets */}
        <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
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
                {/* Slab Properties */}
                <Section
                  id="slab"
                  title="Slab Properties"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Slab Thickness h" field="slab_thickness" unit="mm" />
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
                    <InputField label="Effective Depth d_x" field="effective_depth_x" unit="mm" />
                    <InputField label="Effective Depth d_y" field="effective_depth_y" unit="mm" />
                  </div>
                </Section>

                {/* Column Properties */}
                <Section
                  id="column"
                  title="Column Properties"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiBox className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Column Type</label>
                      <select
                        title="Column Type"
                        value={form.column_type}
                        onChange={(e) => updateForm('column_type', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="rectangular">Rectangular</option>
                        <option value="circular">Circular</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Column Position</label>
                      <select
                        title="Column Position"
                        value={form.column_position}
                        onChange={(e) => updateForm('column_position', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(COLUMN_POSITIONS).map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>

                    <InputField label="Column Width c₁" field="column_width" unit="mm" />
                    <InputField label="Column Depth c₂" field="column_depth" unit="mm" />
                  </div>
                </Section>

                {/* Loading */}
                <Section
                  id="loading"
                  title="Loading & Reinforcement"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField
                      label="Ultimate Reaction V_Ed"
                      field="ultimate_reaction"
                      unit="kN"
                    />
                    <InputField label="β Factor" field="beta_factor" />
                    <InputField label="Top Steel A_sx (per m)" field="asx_top" unit="mm²" />
                    <InputField label="Top Steel A_sy (per m)" field="asy_top" unit="mm²" />
                  </div>
                </Section>

                {/* Shear Reinforcement */}
                <Section
                  id="reinforcement"
                  title="Shear Reinforcement"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Reinforcement Type</label>
                      <select
                        title="Reinforcement Type"
                        value={form.shear_reinf_type}
                        onChange={(e) => updateForm('shear_reinf_type', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="none">None</option>
                        <option value="studs">Shear Studs</option>
                        <option value="links">Shear Links</option>
                      </select>
                    </div>

                    {form.shear_reinf_type !== 'none' && (
                      <>
                        <InputField label="Stud/Link Diameter" field="stud_diameter" unit="mm" />
                        <InputField label="Radial Spacing" field="stud_spacing" unit="mm" />
                        <InputField label="Number of Rows" field="stud_rows" />
                      </>
                    )}
                  </div>
                </Section>

                {/* RUN FULL ANALYSIS Button */}
                <button
                  onClick={calculate}
                  disabled={isCalculating}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isCalculating ? '⏳ Calculating...' : '▶ RUN FULL ANALYSIS'}
                </button>
              </div>

              {/* Results Column */}
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
                        <PunchingShear3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        PUNCHING SHEAR — REAL-TIME PREVIEW
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
                          { label: 'Slab Thickness', value: `${form.slab_thickness} mm` },
                          { label: 'Concrete', value: form.concrete_grade },
                          { label: 'Column Type', value: form.column_type },
                          { label: 'Column Size', value: `${form.column_width}×${form.column_depth} mm` },
                          { label: 'Position', value: form.column_position },
                          { label: 'Reaction', value: `${form.ultimate_reaction} kN` },
                          { label: 'Reinf Type', value: form.shear_reinf_type },
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
                            { label: 'Max Shear (u₀)', util: (results.max_shear_ratio * 100).toFixed(1), status: results.max_shear_status },
                            { label: 'Unreinforced (u₁)', util: (results.shear_ratio_u1 * 100).toFixed(1), status: results.unreinforced_status },
                            { label: 'Overall', util: results.overall_util.toFixed(1), status: results.status },
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
                {/* Canvas */}
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
                    title="Punching Shear — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                        <PunchingShear3D />
                      </Interactive3DDiagram>
                    )}
                  />
                </div>

                {/* Results */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    {/* Status */}
                    <Card
                      className={cn(
                        'border-2 shadow-lg border-l-4',
                        results.status === 'PASS'
                          ? 'bg-gray-900/40 backdrop-blur-md border-green-500/50 shadow-green-500/5 border-l-green-400'
                          : 'bg-gray-900/40 backdrop-blur-md border-red-500/50 shadow-red-500/5 border-l-red-400',
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
                        <p className="text-xs text-gray-500">
                          Governing: {results.governing_check}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Design Checks */}
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          {
                            name: 'Max Shear (u₀)',
                            util: results.max_shear_ratio * 100,
                            status: results.max_shear_status,
                          },
                          {
                            name: 'Unreinforced (u₁)',
                            util: results.shear_ratio_u1 * 100,
                            status: results.unreinforced_status,
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

                    {/* Key Values */}
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Shear Stresses</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">vEd (u₁)</p>
                          <p className="text-white font-mono">{results.vEd_u1.toFixed(2)} MPa</p>
                        </div>
                        <div>
                          <p className="text-gray-500">vRd,c</p>
                          <p className="text-white font-mono">{results.vRd_c.toFixed(2)} MPa</p>
                        </div>
                        <div>
                          <p className="text-gray-500">vEd (u₀)</p>
                          <p className="text-white font-mono">{results.vEd_u0.toFixed(2)} MPa</p>
                        </div>
                        <div>
                          <p className="text-gray-500">vRd,max</p>
                          <p className="text-white font-mono">{results.vRd_max.toFixed(2)} MPa</p>
                        </div>
                        <div>
                          <p className="text-gray-500">u₁</p>
                          <p className="text-white font-mono">{results.u1_red.toFixed(0)} mm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">k factor</p>
                          <p className="text-white font-mono">{results.k_factor.toFixed(2)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reinforcement Status */}
                    <Card
                      className={cn(
                        'border border-l-4 bg-gray-900/40 backdrop-blur-md border-gray-700/50',
                        results.reinf_required
                          ? 'border-l-amber-400'
                          : 'border-l-green-400',
                      )}
                    >
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-1">
                          {results.reinf_required
                            ? '⚠️ Shear Reinforcement Required'
                            : '✓ No Shear Reinforcement Needed'}
                        </p>
                        <p className="text-xs text-gray-400">
                          ρ_l = {(results.rho_l * 100).toFixed(3)}%
                        </p>
                      </CardContent>
                    </Card>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Card className="bg-amber-900/20 border border-gray-700/50 backdrop-blur-md">
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

                    {results &&
                      (() => {
                        const recs: { icon: string; text: string }[] = [];
                        if (results.max_shear_status === 'FAIL')
                          recs.push({
                            icon: '🔴',
                            text: 'Max shear at column face exceeded — increase slab depth or column size',
                          });
                        if (results.reinf_required && form.shear_reinf_type === 'none')
                          recs.push({
                            icon: '⚠️',
                            text: 'Shear reinforcement required — add studs or links',
                          });
                        if (results.overall_util > 90 && results.overall_util <= 100)
                          recs.push({
                            icon: '📐',
                            text: `Utilisation ${results.overall_util.toFixed(0)}% — near capacity limit`,
                          });
                        if (results.rho_l < 0.002)
                          recs.push({
                            icon: '📐',
                            text: 'Low reinforcement ratio — check minimum requirements',
                          });
                        if (recs.length === 0)
                          recs.push({
                            icon: '✅',
                            text: 'Punching shear design adequate to EN 1992-1-1 Cl. 6.4',
                          });
                        return (
                          <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-white font-semibold flex items-center gap-2">
                                <FiAlertTriangle className="text-orange-400" />
                                Recommendations
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {recs.map((r, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-gray-300"
                                >
                                  <span>{r.icon}</span>
                                  <span>{r.text}</span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        );
                      })()}

                    {/* Export */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500"
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
                      <SaveRunButton calculatorKey="punching-shear" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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

export default PunchingShear;
