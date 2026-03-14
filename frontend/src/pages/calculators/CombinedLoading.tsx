// =============================================================================
// Combined Loading Calculator — Premium Version
// EN 1993-1-1 Clause 6.2.9 & 6.3.3 — Steel Members Under Combined Actions
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
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import CombinedLoading3D from '../../components/3d/scenes/CombinedLoading3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { STEEL_GRADES } from '../../data/materialGrades';
import { validateNumericInputs } from '../../lib/validation';
// Types
// =============================================================================

interface CombinedLoadingForm {
  // Section
  section_type: string;
  section_size: string;
  custom_h: string;
  custom_b: string;
  custom_tw: string;
  custom_tf: string;

  // Material
  steel_grade: string;

  // Member Configuration
  member_length: string;
  boundary_conditions: string;
  effective_length_y: string;
  effective_length_z: string;
  effective_length_lt: string;

  // Applied Forces
  axial_force: string;
  force_type: string;
  moment_my: string;
  moment_mz: string;
  shear_vz: string;
  shear_vy: string;

  // Moment Distribution
  psi_y: string;
  psi_z: string;

  // Partial Factors
  gamma_m0: string;
  gamma_m1: string;

  // Project Info
  projectName: string;
  reference: string;
}

interface CombinedLoadingResults {
  // Section Properties
  A: number;
  Iy: number;
  Iz: number;
  Wpl_y: number;
  Wpl_z: number;
  iy: number;
  iz: number;
  Av_z: number;
  section_class: number;
  h: number;
  b: number;

  // Material
  fy: number;
  E: number;

  // Axial Resistance
  Npl_Rd: number;
  Ncr_y: number;
  Ncr_z: number;
  lambda_y: number;
  lambda_z: number;
  chi_y: number;
  chi_z: number;
  Nb_Rd_y: number;
  Nb_Rd_z: number;
  Nb_Rd: number;

  // Moment Resistance
  Mpl_y_Rd: number;
  Mpl_z_Rd: number;
  Mb_Rd: number;

  // Shear Resistance
  Vpl_Rd: number;

  // Interaction Factors
  kyy: number;
  kyz: number;
  kzy: number;
  kzz: number;
  Cm_y: number;
  Cm_z: number;
  Cm_LT: number;

  // Interaction Checks (Clause 6.3.3)
  eq_661: number;
  eq_662: number;
  governing_eq: string;

  // Utilisations
  axial_util: number;
  moment_y_util: number;
  moment_z_util: number;
  shear_util: number;
  combined_util: number;

  // Overall
  critical_check: string;
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// Steel Section Database
// =============================================================================

const STEEL_SECTIONS: Record<
  string,
  {
    h: number;
    b: number;
    tw: number;
    tf: number;
    A: number;
    Iy: number;
    Iz: number;
    Wpl_y: number;
    Wpl_z: number;
    iy: number;
    iz: number;
    Iw: number;
    It: number;
  }
> = {
  'UKC 152x152x23': {
    h: 152.4,
    b: 152.2,
    tw: 5.8,
    tf: 6.8,
    A: 2940,
    Iy: 12600000,
    Iz: 4000000,
    Wpl_y: 182000,
    Wpl_z: 80900,
    iy: 65.4,
    iz: 36.9,
    Iw: 7.0e9,
    It: 8970,
  },
  'UKC 152x152x30': {
    h: 157.6,
    b: 152.9,
    tw: 6.5,
    tf: 9.4,
    A: 3830,
    Iy: 17500000,
    Iz: 5600000,
    Wpl_y: 248000,
    Wpl_z: 113000,
    iy: 67.6,
    iz: 38.2,
    Iw: 10.2e9,
    It: 19000,
  },
  'UKC 203x203x46': {
    h: 203.2,
    b: 203.6,
    tw: 7.2,
    tf: 11.0,
    A: 5870,
    Iy: 45700000,
    Iz: 15300000,
    Wpl_y: 498000,
    Wpl_z: 230000,
    iy: 88.2,
    iz: 51.0,
    Iw: 43.0e9,
    It: 50200,
  },
  'UKC 203x203x60': {
    h: 209.6,
    b: 205.8,
    tw: 9.4,
    tf: 14.2,
    A: 7640,
    Iy: 61300000,
    Iz: 20500000,
    Wpl_y: 654000,
    Wpl_z: 305000,
    iy: 89.6,
    iz: 51.8,
    Iw: 60.1e9,
    It: 102000,
  },
  'UKC 254x254x73': {
    h: 254.1,
    b: 254.6,
    tw: 8.6,
    tf: 14.2,
    A: 9320,
    Iy: 113000000,
    Iz: 38800000,
    Wpl_y: 992000,
    Wpl_z: 465000,
    iy: 110.1,
    iz: 64.5,
    Iw: 156e9,
    It: 142000,
  },
  'UKC 254x254x89': {
    h: 260.3,
    b: 256.3,
    tw: 10.3,
    tf: 17.3,
    A: 11400,
    Iy: 143000000,
    Iz: 48500000,
    Wpl_y: 1224000,
    Wpl_z: 575000,
    iy: 112.0,
    iz: 65.3,
    Iw: 202e9,
    It: 233000,
  },
  'UKC 254x254x107': {
    h: 266.7,
    b: 258.8,
    tw: 12.8,
    tf: 20.5,
    A: 13600,
    Iy: 175000000,
    Iz: 59200000,
    Wpl_y: 1484000,
    Wpl_z: 698000,
    iy: 113.5,
    iz: 66.0,
    Iw: 254e9,
    It: 373000,
  },
  'UKC 305x305x97': {
    h: 307.9,
    b: 305.3,
    tw: 9.9,
    tf: 15.4,
    A: 12400,
    Iy: 223000000,
    Iz: 73900000,
    Wpl_y: 1592000,
    Wpl_z: 740000,
    iy: 134.3,
    iz: 77.2,
    Iw: 410e9,
    It: 232000,
  },
  'UKC 305x305x118': {
    h: 314.5,
    b: 307.4,
    tw: 12.0,
    tf: 18.7,
    A: 15000,
    Iy: 277000000,
    Iz: 90500000,
    Wpl_y: 1958000,
    Wpl_z: 902000,
    iy: 135.9,
    iz: 77.7,
    Iw: 517e9,
    It: 387000,
  },
  'UKC 305x305x137': {
    h: 320.5,
    b: 309.2,
    tw: 13.8,
    tf: 21.7,
    A: 17400,
    Iy: 327000000,
    Iz: 108000000,
    Wpl_y: 2297000,
    Wpl_z: 1073000,
    iy: 137.0,
    iz: 78.8,
    Iw: 623e9,
    It: 581000,
  },
  'UKB 406x178x60': {
    h: 406.4,
    b: 177.9,
    tw: 7.9,
    tf: 12.8,
    A: 7640,
    Iy: 215000000,
    Iz: 11400000,
    Wpl_y: 1199000,
    Wpl_z: 196000,
    iy: 167.8,
    iz: 38.6,
    Iw: 499e9,
    It: 103000,
  },
  'UKB 457x191x74': {
    h: 457.0,
    b: 190.4,
    tw: 9.0,
    tf: 14.5,
    A: 9450,
    Iy: 333000000,
    Iz: 16600000,
    Wpl_y: 1653000,
    Wpl_z: 267000,
    iy: 187.8,
    iz: 41.9,
    Iw: 865e9,
    It: 149000,
  },
  'UKB 533x210x92': {
    h: 533.1,
    b: 209.3,
    tw: 10.1,
    tf: 15.6,
    A: 11700,
    Iy: 553000000,
    Iz: 22800000,
    Wpl_y: 2360000,
    Wpl_z: 334000,
    iy: 217.4,
    iz: 44.1,
    Iw: 1554e9,
    It: 198000,
  },
  Custom: {
    h: 0,
    b: 0,
    tw: 0,
    tf: 0,
    A: 0,
    Iy: 0,
    Iz: 0,
    Wpl_y: 0,
    Wpl_z: 0,
    iy: 0,
    iz: 0,
    Iw: 0,
    It: 0,
  },
};

const BOUNDARY_CONDITIONS: Record<string, { ky: number; kz: number }> = {
  'Pinned-Pinned': { ky: 1.0, kz: 1.0 },
  'Fixed-Fixed': { ky: 0.5, kz: 0.5 },
  'Fixed-Pinned': { ky: 0.7, kz: 0.7 },
  'Fixed-Free (Cantilever)': { ky: 2.0, kz: 2.0 },
};

const PRESETS: Record<string, { name: string; form: Partial<CombinedLoadingForm> }> = {
  column_axial: {
    name: 'Column (Axial + Minor Moment)',
    form: {
      section_size: 'UKC 254x254x89',
      member_length: '4.0',
      boundary_conditions: 'Pinned-Pinned',
      axial_force: '1500',
      force_type: 'Compression',
      moment_my: '50',
      moment_mz: '25',
      steel_grade: 'S355',
    },
  },
  beam_column: {
    name: 'Beam-Column',
    form: {
      section_size: 'UKB 406x178x60',
      member_length: '5.0',
      boundary_conditions: 'Fixed-Pinned',
      axial_force: '500',
      force_type: 'Compression',
      moment_my: '200',
      moment_mz: '0',
      steel_grade: 'S355',
    },
  },
  strut: {
    name: 'Compression Strut',
    form: {
      section_size: 'UKC 203x203x46',
      member_length: '3.0',
      boundary_conditions: 'Pinned-Pinned',
      axial_force: '800',
      force_type: 'Compression',
      moment_my: '0',
      moment_mz: '0',
      steel_grade: 'S355',
    },
  },
  biaxial_bending: {
    name: 'Biaxial Bending',
    form: {
      section_size: 'UKC 305x305x118',
      member_length: '4.5',
      boundary_conditions: 'Fixed-Pinned',
      axial_force: '1000',
      force_type: 'Compression',
      moment_my: '150',
      moment_mz: '75',
      steel_grade: 'S355',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const CombinedLoading: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<CombinedLoadingForm>({
    section_type: 'UKC',
    section_size: 'UKC 254x254x89',
    custom_h: '260',
    custom_b: '256',
    custom_tw: '10',
    custom_tf: '17',
    steel_grade: 'S355',
    member_length: '4.0',
    boundary_conditions: 'Pinned-Pinned',
    effective_length_y: '4.0',
    effective_length_z: '4.0',
    effective_length_lt: '4.0',
    axial_force: '1200',
    force_type: 'Compression',
    moment_my: '100',
    moment_mz: '30',
    shear_vz: '50',
    shear_vy: '0',
    psi_y: '0',
    psi_z: '0',
    gamma_m0: '1.0',
    gamma_m1: '1.0',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'custom_h', label: 'Custom H' },
  { key: 'custom_b', label: 'Custom B' },
  { key: 'custom_tw', label: 'Custom Tw' },
  { key: 'custom_tf', label: 'Custom Tf' },
  { key: 'member_length', label: 'Member Length' },
  { key: 'effective_length_y', label: 'Effective Length Y' },
  { key: 'effective_length_z', label: 'Effective Length Z' },
  { key: 'effective_length_lt', label: 'Effective Length Lt' },
  { key: 'axial_force', label: 'Axial Force' },
  { key: 'moment_my', label: 'Moment My' },
  { key: 'moment_mz', label: 'Moment Mz' },
  { key: 'shear_vz', label: 'Shear Vz' },
  { key: 'shear_vy', label: 'Shear Vy' },
  { key: 'psi_y', label: 'Psi Y' },
  { key: 'psi_z', label: 'Psi Z' },
  { key: 'gamma_m0', label: 'Gamma M0' },
  { key: 'gamma_m1', label: 'Gamma M1' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'section_type', label: 'Section_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'section_size', label: 'Section_size', min: 0, max: 100, step: 1, unit: '' },
    { key: 'custom_h', label: 'Custom_h', min: 0, max: 100, step: 1, unit: '' },
    { key: 'custom_b', label: 'Custom_b', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<CombinedLoadingResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<{ check: string; suggestion: string }[]>(
    [],
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    section: true,
    geometry: true,
    loading: true,
    factors: false,
  });


  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const updateForm = (field: keyof CombinedLoadingForm, value: string) => {
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

  // Update effective lengths when boundary conditions change
  useEffect(() => {
    const bc = BOUNDARY_CONDITIONS[form.boundary_conditions];
    if (bc) {
      const length = parseFloat(form.member_length);
      setForm((prev) => ({
        ...prev,
        effective_length_y: (bc.ky * length).toFixed(2),
        effective_length_z: (bc.kz * length).toFixed(2),
        effective_length_lt: (bc.ky * length).toFixed(2),
      }));
    }
  }, [form.boundary_conditions, form.member_length]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Calculation (EN 1993-1-1 Clause 6.2.9 & 6.3.3)
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      // Get section properties
      const section = STEEL_SECTIONS[form.section_size];
      const h = section.h;
      const b = section.b;
      const tw = section.tw;
      const tf = section.tf;
      const A = section.A;
      const Iy = section.Iy;
      const Iz = section.Iz;
      const Wpl_y = section.Wpl_y;
      const Wpl_z = section.Wpl_z;
      const iy = section.iy;
      const iz = section.iz;
      const Iw = section.Iw;
      const It = section.It;
      const Av_z = A - 2 * b * tf + (tw + 2 * 0) * tf;

      // Material
      const grade = STEEL_GRADES[form.steel_grade];
      const fy = grade.fy;
      const E = 210000;
      const G = 81000;

      // Partial factors
      const gamma_m0 = parseFloat(form.gamma_m0);
      const gamma_m1 = parseFloat(form.gamma_m1);

      // Member lengths
      const L = parseFloat(form.member_length) * 1000;
      const Lcr_y = parseFloat(form.effective_length_y) * 1000;
      const Lcr_z = parseFloat(form.effective_length_z) * 1000;
      const Lcr_LT = parseFloat(form.effective_length_lt) * 1000;

      // Applied forces
      const N_Ed = Math.abs(parseFloat(form.axial_force)) * 1000; // N
      const M_y_Ed = parseFloat(form.moment_my) * 1e6; // Nmm
      const M_z_Ed = parseFloat(form.moment_mz) * 1e6; // Nmm
      const V_Ed = parseFloat(form.shear_vz) * 1000; // N

      // Moment ratios
      const psi_y = parseFloat(form.psi_y);
      const psi_z = parseFloat(form.psi_z);

      // Section class (assume Class 1 for UKC/UKB sections)
      const section_class = 1;

      // ── Cross-section resistance ──

      // Plastic axial resistance (Clause 6.2.4)
      const Npl_Rd = (A * fy) / gamma_m0;

      // Plastic moment resistances (Clause 6.2.5)
      const Mpl_y_Rd = (Wpl_y * fy) / gamma_m0;
      const Mpl_z_Rd = (Wpl_z * fy) / gamma_m0;

      // Shear resistance (Clause 6.2.6)
      const Vpl_Rd = (Av_z * fy) / Math.sqrt(3) / gamma_m0;

      // ── Buckling resistance ──

      // Euler critical loads
      const Ncr_y = (Math.PI ** 2 * E * Iy) / Lcr_y ** 2;
      const Ncr_z = (Math.PI ** 2 * E * Iz) / Lcr_z ** 2;

      // Non-dimensional slenderness
      const lambda_1 = Math.PI * Math.sqrt(E / fy);
      const lambda_y = Lcr_y / iy / lambda_1;
      const lambda_z = Lcr_z / iz / lambda_1;

      // Buckling curve selection (Table 6.2)
      let alpha_y: number, alpha_z: number;
      const h_b = h / b;
      const tf_lim = 40;

      if (h_b > 1.2) {
        // Rolled I-sections h/b > 1.2
        alpha_y = tf <= tf_lim ? 0.21 : 0.34; // curve a or b
        alpha_z = tf <= tf_lim ? 0.34 : 0.49; // curve b or c
      } else {
        // Rolled I-sections h/b <= 1.2
        alpha_y = tf <= tf_lim ? 0.34 : 0.49; // curve b or c
        alpha_z = tf <= tf_lim ? 0.49 : 0.76; // curve c or d
      }

      // Reduction factors χ (Clause 6.3.1.2)
      const phi_y = 0.5 * (1 + alpha_y * (lambda_y - 0.2) + lambda_y ** 2);
      const chi_y =
        lambda_y <= 0.2 ? 1.0 : Math.min(1.0, 1 / (phi_y + Math.sqrt(phi_y ** 2 - lambda_y ** 2)));

      const phi_z = 0.5 * (1 + alpha_z * (lambda_z - 0.2) + lambda_z ** 2);
      const chi_z =
        lambda_z <= 0.2 ? 1.0 : Math.min(1.0, 1 / (phi_z + Math.sqrt(phi_z ** 2 - lambda_z ** 2)));

      // Buckling resistance
      const Nb_Rd_y = (chi_y * A * fy) / gamma_m1;
      const Nb_Rd_z = (chi_z * A * fy) / gamma_m1;
      const Nb_Rd = Math.min(Nb_Rd_y, Nb_Rd_z);

      // LTB resistance (simplified for combined loading)
      const Mcr =
        ((1.132 * Math.PI ** 2 * E * Iz) / Lcr_LT ** 2) *
        Math.sqrt(Iw / Iz + (Lcr_LT ** 2 * G * It) / (Math.PI ** 2 * E * Iz));
      const lambda_LT = Math.sqrt((Wpl_y * fy) / Mcr);
      const alpha_LT = 0.49;
      const phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.4) + 0.75 * lambda_LT ** 2);
      const chi_LT =
        lambda_LT <= 0.4
          ? 1.0
          : Math.min(1.0, 1 / (phi_LT + Math.sqrt(phi_LT ** 2 - 0.75 * lambda_LT ** 2)));
      const Mb_Rd = (chi_LT * Wpl_y * fy) / gamma_m1;

      // ── Interaction factors (Annex B, Table B.1/B.2) ──

      // Equivalent uniform moment factors
      const Cm_y = 0.6 + 0.4 * psi_y >= 0.4 ? 0.6 + 0.4 * psi_y : 0.4;
      const Cm_z = 0.6 + 0.4 * psi_z >= 0.4 ? 0.6 + 0.4 * psi_z : 0.4;
      const Cm_LT = Cm_y;

      // Interaction factors for Class 1/2 sections (Table B.1)
      const N_ratio = N_Ed / ((chi_y * Npl_Rd) / gamma_m1);

      const kyy = Cm_y * (1 + Math.min(0.8, (lambda_y - 0.2) * N_ratio));
      const kyz = 0.6 * kzz_calc();
      const kzy = 0.6 * kyy;
      const kzz = kzz_calc();

      function kzz_calc() {
        const n_ratio_z = N_Ed / ((chi_z * Npl_Rd) / gamma_m1);
        return Cm_z * (1 + Math.min(1.4, (2 * lambda_z - 0.6) * n_ratio_z));
      }

      // ── Interaction checks (Clause 6.3.3) ──

      // Equation 6.61
      const eq_661 =
        N_Ed / ((chi_y * Npl_Rd) / gamma_m1) +
        (kyy * M_y_Ed) / ((chi_LT * Mpl_y_Rd) / gamma_m1) +
        (kyz * M_z_Ed) / (Mpl_z_Rd / gamma_m1);

      // Equation 6.62
      const eq_662 =
        N_Ed / ((chi_z * Npl_Rd) / gamma_m1) +
        (kzy * M_y_Ed) / ((chi_LT * Mpl_y_Rd) / gamma_m1) +
        (kzz * M_z_Ed) / (Mpl_z_Rd / gamma_m1);

      const governing_eq = eq_661 >= eq_662 ? 'Eq. 6.61' : 'Eq. 6.62';
      const max_interaction = Math.max(eq_661, eq_662);

      // ── Utilisations ──
      const axial_util = (N_Ed / Nb_Rd) * 100;
      const moment_y_util = (M_y_Ed / Mb_Rd) * 100;
      const moment_z_util = (M_z_Ed / Mpl_z_Rd) * 100;
      const shear_util = (V_Ed / Vpl_Rd) * 100;
      const combined_util = max_interaction * 100;

      // Classification
      const max_util = Math.max(combined_util, axial_util, moment_y_util, shear_util);
      let classification: string;
      let classColor: string;
      if (max_util <= 70) {
        classification = 'Optimal';
        classColor = 'text-green-400';
      } else if (max_util <= 90) {
        classification = 'Efficient';
        classColor = 'text-emerald-400';
      } else if (max_util <= 100) {
        classification = 'Adequate';
        classColor = 'text-amber-400';
      } else {
        classification = 'Overstressed';
        classColor = 'text-red-400';
      }

      const status = max_util <= 100 ? 'PASS' : 'FAIL';
      const critical_check =
        combined_util >= axial_util ? `Combined (${governing_eq})` : 'Axial Buckling';

      // Warnings
      if (combined_util > 100) {
        newWarnings.push(
          `Combined interaction ${governing_eq} fails at ${combined_util.toFixed(1)}%`,
        );
      }
      if (lambda_y > 1.5 || lambda_z > 1.5) {
        newWarnings.push('High slenderness — consider reducing effective length');
      }
      if (shear_util > 50) {
        newWarnings.push('High shear — consider shear-moment interaction');
      }
      if (N_Ed / Npl_Rd > 0.25 && (M_y_Ed > 0 || M_z_Ed > 0)) {
        newWarnings.push('Significant axial load with bending — check plastic interaction');
      }

      setResults({
        A,
        Iy,
        Iz,
        Wpl_y,
        Wpl_z,
        iy,
        iz,
        Av_z,
        section_class,
        h,
        b,
        fy,
        E,
        Npl_Rd: Npl_Rd / 1000,
        Ncr_y: Ncr_y / 1000,
        Ncr_z: Ncr_z / 1000,
        lambda_y,
        lambda_z,
        chi_y,
        chi_z,
        Nb_Rd_y: Nb_Rd_y / 1000,
        Nb_Rd_z: Nb_Rd_z / 1000,
        Nb_Rd: Nb_Rd / 1000,
        Mpl_y_Rd: Mpl_y_Rd / 1e6,
        Mpl_z_Rd: Mpl_z_Rd / 1e6,
        Mb_Rd: Mb_Rd / 1e6,
        Vpl_Rd: Vpl_Rd / 1000,
        kyy,
        kyz,
        kzy,
        kzz: kzz_calc(),
        Cm_y,
        Cm_z,
        Cm_LT,
        eq_661,
        eq_662,
        governing_eq,
        axial_util,
        moment_y_util,
        moment_z_util,
        shear_util,
        combined_util,
        critical_check,
        status,
        classification,
        classColor,
      });

      setWarnings(newWarnings);

      // Recommendations
      const recs: { check: string; suggestion: string }[] = [];
      if (combined_util < 40)
        recs.push({
          check: 'Combined Utilisation',
          suggestion:
            'Member is significantly under-utilised — a lighter section may be more economical',
        });
      if (combined_util > 85)
        recs.push({
          check: 'Combined Utilisation',
          suggestion:
            'Combined utilisation is high — consider a heavier section for additional safety margin',
        });
      if (shear_util > 50)
        recs.push({
          check: 'Shear Utilisation',
          suggestion:
            'Shear utilisation exceeds 50% — consider moment-shear interaction effects per Clause 6.2.8',
        });
      if (lambda_y > 1.5 || lambda_z > 1.5)
        recs.push({
          check: 'Slenderness',
          suggestion:
            'High slenderness ratio — consider reducing effective length or increasing section size',
        });
      if (eq_661 > 0.9 && eq_662 > 0.9)
        recs.push({
          check: 'Interaction Equations',
          suggestion:
            'Both interaction equations close to limit — review loading assumptions and effective lengths',
        });
      if (recs.length === 0)
        recs.push({
          check: 'Design Status',
          suggestion: 'All checks within acceptable limits — design is satisfactory',
        });
      setRecommendations(recs);
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
      title: 'Combined Loading',
      subtitle: 'EN 1993-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'COM001' },
      ],
      inputs: [
        { label: 'Section_type', value: String(form.section_type) },
        { label: 'Section_size', value: String(form.section_size) },
        { label: 'Steel_grade', value: String(form.steel_grade) },
        { label: 'Member_length', value: String(form.member_length), unit: 'mm' },
        { label: 'Boundary_conditions', value: String(form.boundary_conditions) },
        { label: 'Effective_length_y', value: String(form.effective_length_y), unit: 'mm' },
        { label: 'Effective_length_z', value: String(form.effective_length_z), unit: 'mm' },
        { label: 'Effective_length_lt', value: String(form.effective_length_lt), unit: 'mm' },
        { label: 'Axial_force', value: String(form.axial_force), unit: 'kN' },
        { label: 'Force_type', value: String(form.force_type), unit: 'kN' },
        { label: 'Moment_my', value: String(form.moment_my), unit: 'kNm' },
        { label: 'Moment_mz', value: String(form.moment_mz), unit: 'kNm' },
      ],
      checks: [
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${results.combined_util?.toFixed(1) || '0'}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — Combined Loading',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Combined Loading',
      subtitle: 'EN 1993-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'COM001' },
      ],
      inputs: [
        { label: 'Section_type', value: String(form.section_type) },
        { label: 'Section_size', value: String(form.section_size) },
        { label: 'Steel_grade', value: String(form.steel_grade) },
        { label: 'Member_length', value: String(form.member_length), unit: 'mm' },
        { label: 'Boundary_conditions', value: String(form.boundary_conditions) },
        { label: 'Effective_length_y', value: String(form.effective_length_y), unit: 'mm' },
        { label: 'Effective_length_z', value: String(form.effective_length_z), unit: 'mm' },
        { label: 'Effective_length_lt', value: String(form.effective_length_lt), unit: 'mm' },
        { label: 'Axial_force', value: String(form.axial_force), unit: 'kN' },
        { label: 'Force_type', value: String(form.force_type), unit: 'kN' },
        { label: 'Moment_my', value: String(form.moment_my), unit: 'kNm' },
        { label: 'Moment_mz', value: String(form.moment_mz), unit: 'kNm' },
      ],
      checks: [
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${results.combined_util?.toFixed(1) || '0'}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — Combined Loading',
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
      className={cn('rounded-2xl border overflow-hidden', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/40 backdrop-blur-md hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Input Component
  // ─────────────────────────────────────────────────────────────────────────────
  const InputField: React.FC<{
    label: string;
    field: keyof CombinedLoadingForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title="{label}"
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
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
        {/* Grid Pattern Background */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1993-1-1 Clause 6.2.9 & 6.3.3</span>
          </div>
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
              Combined Loading
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Steel member design under combined axial force and bending moments to Eurocode 3
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-2 bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50">
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant="glass"
                size="sm"
                onClick={() => applyPreset(key)}
                className="text-gray-300 border-gray-700/50 hover:border-neon-cyan/30 hover:text-neon-cyan"
              >
                {preset.name}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={exportPDF}
              disabled={!results}
              className="flex items-center gap-2 border-neon-cyan/30 text-neon-cyan"
            >
              <FiDownload className="w-4 h-4" /> PDF
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={exportDOCX}
              disabled={!results}
              className="flex items-center gap-2 border-neon-purple/30 text-neon-purple"
            >
              <FiDownload className="w-4 h-4" /> DOCX
            </Button>
          </div>
        </div>

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
                activeTab === tab ? 'bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white' : 'text-gray-400',
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
                {/* Section Selection */}
                <Section
                  id="section"
                  title="Section Selection"
                  icon={
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Steel Section</label>
                      <select
                        title="Steel Section"
                        value={form.section_size}
                        onChange={(e) => updateForm('section_size', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.keys(STEEL_SECTIONS).map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Steel Grade</label>
                      <select
                        title="Steel Grade"
                        value={form.steel_grade}
                        onChange={(e) => updateForm('steel_grade', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.entries(STEEL_GRADES).map(([grade, props]) => (
                          <option key={grade} value={grade}>
                            {grade} (fy = {props.fy} MPa)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Member Configuration */}
                <Section
                  id="geometry"
                  title="Member Configuration"
                  icon={
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      <FiSliders className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Member Length" field="member_length" unit="m" />

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Boundary Conditions</label>
                      <select
                        title="Boundary Conditions"
                        value={form.boundary_conditions}
                        onChange={(e) => updateForm('boundary_conditions', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.keys(BOUNDARY_CONDITIONS).map((bc) => (
                          <option key={bc} value={bc}>
                            {bc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <InputField
                      label="Effective Length Lcr,y (major)"
                      field="effective_length_y"
                      unit="m"
                    />
                    <InputField
                      label="Effective Length Lcr,z (minor)"
                      field="effective_length_z"
                      unit="m"
                    />
                    <InputField label="LTB Effective Length" field="effective_length_lt" unit="m" />
                  </div>
                </Section>

                {/* Applied Forces */}
                <Section
                  id="loading"
                  title="Applied Forces (ULS)"
                  icon={
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      <FiZap className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Axial Force N_Ed" field="axial_force" unit="kN" />

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Force Type</label>
                      <select
                        title="Force Type"
                        value={form.force_type}
                        onChange={(e) => updateForm('force_type', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        <option value="Compression">Compression</option>
                        <option value="Tension">Tension</option>
                      </select>
                    </div>

                    <InputField label="Moment M_y,Ed (major axis)" field="moment_my" unit="kNm" />
                    <InputField label="Moment M_z,Ed (minor axis)" field="moment_mz" unit="kNm" />
                    <InputField label="Shear V_z,Ed" field="shear_vz" unit="kN" />
                    <InputField label="ψ_y (moment ratio)" field="psi_y" />
                  </div>
                </Section>

                {/* Partial Factors */}
                <Section
                  id="factors"
                  title="Partial Factors"
                  icon={
                    <motion.div
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="γ_M0" field="gamma_m0" />
                    <InputField label="γ_M1" field="gamma_m1" />
                  </div>
                </Section>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={calculate}
                    disabled={isCalculating}
                    className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)]"
                  >
                    {isCalculating ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ANALYSING...
                      </div>
                    ) : (
                      '⚡ RUN FULL ANALYSIS'
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Results Column — Sticky Sidebar */}
              <div className="space-y-4 sticky top-8 self-start">
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
                        <CombinedLoading3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        COMBINED LOADING — REAL-TIME PREVIEW
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
                          { label: 'Section', value: form.section_size },
                          { label: 'Steel Grade', value: form.steel_grade },
                          { label: 'Length', value: `${form.member_length} m` },
                          { label: 'Axial Force', value: `${form.axial_force} kN` },
                          { label: 'Force Type', value: form.force_type },
                          { label: 'Moment My', value: `${form.moment_my} kNm` },
                          { label: 'Moment Mz', value: `${form.moment_mz} kNm` },
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
                            { label: 'Eq. 6.61', util: results.eq_661.toFixed(1), status: results.eq_661 > 100 ? 'FAIL' : 'PASS' },
                            { label: 'Eq. 6.62', util: results.eq_662.toFixed(1), status: results.eq_662 > 100 ? 'FAIL' : 'PASS' },
                            { label: 'Axial', util: results.axial_util.toFixed(1), status: results.axial_util > 100 ? 'FAIL' : 'PASS' },
                            { label: 'Moment Y', util: results.moment_y_util.toFixed(1), status: results.moment_y_util > 100 ? 'FAIL' : 'PASS' },
                            { label: 'Shear', util: results.shear_util.toFixed(1), status: results.shear_util > 100 ? 'FAIL' : 'PASS' },
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
                    title="Combined Loading — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                        <CombinedLoading3D />
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
                      variant="glass"
                      className={cn(
                        'border-l-4 border-2 shadow-lg',
                        results.status === 'PASS'
                          ? 'border-l-green-500 bg-green-900/20 border-green-500/50'
                          : 'border-l-red-500 bg-red-900/20 border-red-500/50',
                      )}
                      style={{
                        boxShadow:
                          results.status === 'PASS'
                            ? '0 10px 15px -3px rgba(34,197,94,0.2)'
                            : '0 10px 15px -3px rgba(239,68,68,0.2)',
                      }}
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
                          {results.classification} — {results.combined_util.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Critical: {results.critical_check}</p>
                      </CardContent>
                    </Card>

                    {/* Interaction Equations */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">
                          Interaction Equations (Clause 6.3.3)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          {
                            name: 'Eq. 6.61',
                            value: results.eq_661,
                            isGoverning: results.governing_eq === 'Eq. 6.61',
                          },
                          {
                            name: 'Eq. 6.62',
                            value: results.eq_662,
                            isGoverning: results.governing_eq === 'Eq. 6.62',
                          },
                        ].map((eq) => (
                          <div key={eq.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span
                                className={cn(
                                  'text-gray-400',
                                  eq.isGoverning && 'font-bold text-white',
                                )}
                              >
                                {eq.name} {eq.isGoverning && '(Governing)'}
                              </span>
                              <span
                                className={cn(eq.value <= 1.0 ? 'text-green-400' : 'text-red-400')}
                              >
                                {eq.value.toFixed(3)} ≤ 1.0
                              </span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(eq.value * 100, 100)}%` }}
                                className={cn(
                                  'h-full rounded-full',
                                  eq.value <= 0.7
                                    ? 'bg-green-500'
                                    : eq.value <= 0.9
                                      ? 'bg-emerald-500'
                                      : eq.value <= 1.0
                                        ? 'bg-amber-500'
                                        : 'bg-red-500',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Individual Checks */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Component Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          {
                            name: 'Axial Buckling',
                            util: results.axial_util,
                            cap: results.Nb_Rd,
                            unit: 'kN',
                          },
                          {
                            name: 'Major Axis Bending',
                            util: results.moment_y_util,
                            cap: results.Mb_Rd,
                            unit: 'kNm',
                          },
                          {
                            name: 'Minor Axis Bending',
                            util: results.moment_z_util,
                            cap: results.Mpl_z_Rd,
                            unit: 'kNm',
                          },
                          {
                            name: 'Shear',
                            util: results.shear_util,
                            cap: results.Vpl_Rd,
                            unit: 'kN',
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
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Buckling Parameters</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">λ_y</p>
                          <p className="text-white font-mono">{results.lambda_y.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">λ_z</p>
                          <p className="text-white font-mono">{results.lambda_z.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">χ_y</p>
                          <p className="text-white font-mono">{results.chi_y.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">χ_z</p>
                          <p className="text-white font-mono">{results.chi_z.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">k_yy</p>
                          <p className="text-white font-mono">{results.kyy.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">k_zz</p>
                          <p className="text-white font-mono">{results.kzz.toFixed(3)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Card variant="glass" className="border-l-4 border-l-amber-500 bg-amber-900/20 border-amber-500/30">
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

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                      <Card variant="glass" className="border-l-4 border-l-blue-500 bg-blue-500/10 border-blue-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FiCheck className="text-blue-400" />
                            <span className="text-blue-400 font-medium">Recommendations</span>
                          </div>
                          <ul className="space-y-2">
                            {recommendations.map((r, i) => (
                              <li key={i} className="text-sm text-blue-300">
                                <span className="text-blue-400 font-medium">{r.check}:</span>{' '}
                                {r.suggestion}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Export */}
                    <div className="flex gap-2 flex-wrap">
                      <SaveRunButton calculatorKey="combined-loading" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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

export default CombinedLoading;
