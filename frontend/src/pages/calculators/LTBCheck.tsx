// =============================================================================
// Lateral Torsional Buckling Quick Check Calculator — Premium Version
// EN 1993-1-1 (Eurocode 3) — LTB Assessment
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
    FiTarget,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import LTBCheck3D from '../../components/3d/scenes/LTBCheck3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { STEEL_GRADES } from '../../data/materialGrades';
import { validateNumericInputs } from '../../lib/validation';
// Types
// =============================================================================

interface LTBCheckForm {
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
  span: string;
  effective_length_factor: string;
  load_type: string;
  load_position: string;

  // Applied Moment
  design_moment: string;
  moment_diagram: string;

  // Restraint Conditions
  compression_flange_restraint: string;
  end_restraint: string;

  // Factors
  gamma_m0: string;
  gamma_m1: string;

  // Project Info
  projectName: string;
  reference: string;
}

interface LTBCheckResults {
  // Section Properties
  h: number;
  b: number;
  tw: number;
  tf: number;
  A: number;
  Iy: number;
  Iz: number;
  Iw: number;
  It: number;
  Wpl_y: number;

  // Material
  fy: number;
  E: number;
  G: number;

  // LTB Parameters
  L_cr: number;
  C1: number;
  C2: number;
  Mcr: number;
  lambda_LT: number;
  lambda_LT0: number;

  // Imperfection & Reduction
  buckling_curve: string;
  alpha_LT: number;
  phi_LT: number;
  chi_LT: number;

  // Moment Resistance
  Mpl_Rd: number;
  Mb_Rd: number;

  // Utilisation
  moment_util: number;
  ltb_util: number;
  is_ltb_governing: boolean;

  // Assessment
  slenderness_category: string;
  critical_check: string;
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// Steel Section Database (UK sections to EN)
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
    Iw: number;
    It: number;
  }
> = {
  'UKB 254x146x31': {
    h: 251.4,
    b: 146.1,
    tw: 6.0,
    tf: 8.6,
    A: 3970,
    Iy: 44100000,
    Iz: 4480000,
    Wpl_y: 393000,
    Iw: 71.7e9,
    It: 28800,
  },
  'UKB 254x146x37': {
    h: 256.0,
    b: 146.4,
    tw: 6.3,
    tf: 10.9,
    A: 4720,
    Iy: 55100000,
    Iz: 5710000,
    Wpl_y: 483000,
    Iw: 91.3e9,
    It: 47700,
  },
  'UKB 305x165x40': {
    h: 303.4,
    b: 165.0,
    tw: 6.0,
    tf: 10.2,
    A: 5130,
    Iy: 85000000,
    Iz: 7640000,
    Wpl_y: 623000,
    Iw: 170e9,
    It: 51800,
  },
  'UKB 305x165x46': {
    h: 306.6,
    b: 165.7,
    tw: 6.7,
    tf: 11.8,
    A: 5870,
    Iy: 99600000,
    Iz: 8960000,
    Wpl_y: 723000,
    Iw: 200e9,
    It: 72200,
  },
  'UKB 305x165x54': {
    h: 310.4,
    b: 166.9,
    tw: 7.9,
    tf: 13.7,
    A: 6870,
    Iy: 117000000,
    Iz: 10600000,
    Wpl_y: 846000,
    Iw: 239e9,
    It: 103000,
  },
  'UKB 356x171x45': {
    h: 351.4,
    b: 171.1,
    tw: 7.0,
    tf: 9.7,
    A: 5730,
    Iy: 121000000,
    Iz: 8110000,
    Wpl_y: 775000,
    Iw: 255e9,
    It: 51600,
  },
  'UKB 356x171x51': {
    h: 355.0,
    b: 171.5,
    tw: 7.4,
    tf: 11.5,
    A: 6490,
    Iy: 141000000,
    Iz: 9680000,
    Wpl_y: 896000,
    Iw: 302e9,
    It: 73000,
  },
  'UKB 356x171x57': {
    h: 358.0,
    b: 172.2,
    tw: 8.1,
    tf: 13.0,
    A: 7260,
    Iy: 160000000,
    Iz: 11000000,
    Wpl_y: 1010000,
    Iw: 347e9,
    It: 97400,
  },
  'UKB 406x178x54': {
    h: 402.6,
    b: 177.7,
    tw: 7.7,
    tf: 10.9,
    A: 6870,
    Iy: 187000000,
    Iz: 9700000,
    Wpl_y: 1055000,
    Iw: 430e9,
    It: 73500,
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
    Iw: 499e9,
    It: 103000,
  },
  'UKB 406x178x67': {
    h: 409.4,
    b: 178.8,
    tw: 8.8,
    tf: 14.3,
    A: 8550,
    Iy: 243000000,
    Iz: 12900000,
    Wpl_y: 1346000,
    Iw: 570e9,
    It: 138000,
  },
  'UKB 457x152x52': {
    h: 449.8,
    b: 152.4,
    tw: 7.6,
    tf: 10.9,
    A: 6640,
    Iy: 212000000,
    Iz: 6160000,
    Wpl_y: 1096000,
    Iw: 351e9,
    It: 69100,
  },
  'UKB 457x152x60': {
    h: 454.6,
    b: 152.9,
    tw: 8.1,
    tf: 13.3,
    A: 7620,
    Iy: 254000000,
    Iz: 7510000,
    Wpl_y: 1287000,
    Iw: 428e9,
    It: 104000,
  },
  'UKB 457x191x67': {
    h: 453.4,
    b: 189.9,
    tw: 8.5,
    tf: 12.7,
    A: 8560,
    Iy: 294000000,
    Iz: 14500000,
    Wpl_y: 1471000,
    Iw: 755e9,
    It: 112000,
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
    Iw: 865e9,
    It: 149000,
  },
  'UKB 533x210x82': {
    h: 528.3,
    b: 208.8,
    tw: 9.6,
    tf: 13.2,
    A: 10500,
    Iy: 475000000,
    Iz: 19200000,
    Wpl_y: 2058000,
    Iw: 1326e9,
    It: 146000,
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
    Iw: 1554e9,
    It: 198000,
  },
  'UKB 533x210x101': {
    h: 536.7,
    b: 210.0,
    tw: 10.8,
    tf: 17.4,
    A: 12900,
    Iy: 614000000,
    Iz: 25600000,
    Wpl_y: 2612000,
    Iw: 1741e9,
    It: 257000,
  },
  'UKB 610x229x101': {
    h: 602.6,
    b: 227.6,
    tw: 10.5,
    tf: 14.8,
    A: 12900,
    Iy: 757000000,
    Iz: 29400000,
    Wpl_y: 2879000,
    Iw: 2536e9,
    It: 206000,
  },
  'UKB 610x229x113': {
    h: 607.6,
    b: 228.2,
    tw: 11.1,
    tf: 17.3,
    A: 14400,
    Iy: 874000000,
    Iz: 34300000,
    Wpl_y: 3281000,
    Iw: 2950e9,
    It: 284000,
  },
  'UKB 610x229x125': {
    h: 612.2,
    b: 229.0,
    tw: 11.9,
    tf: 19.6,
    A: 15900,
    Iy: 986000000,
    Iz: 39200000,
    Wpl_y: 3676000,
    Iw: 3372e9,
    It: 378000,
  },
  'UKC 152x152x23': {
    h: 152.4,
    b: 152.2,
    tw: 5.8,
    tf: 6.8,
    A: 2940,
    Iy: 12600000,
    Iz: 4000000,
    Wpl_y: 182000,
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
    Iw: 202e9,
    It: 233000,
  },
  Custom: { h: 0, b: 0, tw: 0, tf: 0, A: 0, Iy: 0, Iz: 0, Wpl_y: 0, Iw: 0, It: 0 },
};

const LOAD_TYPES: Record<string, { C1: number; C2: number }> = {
  'Uniform moment': { C1: 1.0, C2: 0.0 },
  'UDL simply supported': { C1: 1.132, C2: 0.459 },
  'Point load at mid-span': { C1: 1.365, C2: 0.553 },
  'Point load at quarter': { C1: 1.565, C2: 0.0 },
  'Triangular (max at mid)': { C1: 1.046, C2: 0.0 },
  'Cantilever UDL': { C1: 2.05, C2: 0.0 },
  'Cantilever point at tip': { C1: 2.55, C2: 0.0 },
};

const PRESETS: Record<string, { name: string; form: Partial<LTBCheckForm> }> = {
  floor_beam: {
    name: 'Floor Beam (Restrained)',
    form: {
      section_size: 'UKB 406x178x60',
      span: '2.0',
      effective_length_factor: '1.0',
      load_type: 'UDL simply supported',
      design_moment: '250',
      steel_grade: 'S355',
      compression_flange_restraint: 'continuous',
    },
  },
  roof_beam: {
    name: 'Roof Purlin',
    form: {
      section_size: 'UKB 305x165x40',
      span: '4.0',
      effective_length_factor: '1.0',
      load_type: 'UDL simply supported',
      design_moment: '120',
      steel_grade: 'S355',
      compression_flange_restraint: 'none',
    },
  },
  cantilever: {
    name: 'Cantilever Beam',
    form: {
      section_size: 'UKB 457x191x74',
      span: '3.0',
      effective_length_factor: '2.0',
      load_type: 'Cantilever UDL',
      design_moment: '300',
      steel_grade: 'S355',
      compression_flange_restraint: 'none',
    },
  },
  crane_beam: {
    name: 'Crane Runway',
    form: {
      section_size: 'UKB 533x210x101',
      span: '6.0',
      effective_length_factor: '1.0',
      load_type: 'Point load at mid-span',
      design_moment: '450',
      steel_grade: 'S355',
      compression_flange_restraint: 'none',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const LTBCheck: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<LTBCheckForm>({
    section_type: 'UKB',
    section_size: 'UKB 406x178x60',
    custom_h: '400',
    custom_b: '180',
    custom_tw: '8',
    custom_tf: '14',
    steel_grade: 'S355',
    span: '4.0',
    effective_length_factor: '1.0',
    load_type: 'UDL simply supported',
    load_position: 'shear_centre',
    design_moment: '200',
    moment_diagram: 'parabolic',
    compression_flange_restraint: 'none',
    end_restraint: 'both_fixed',
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
  { key: 'span', label: 'Span' },
  { key: 'effective_length_factor', label: 'Effective Length Factor' },
  { key: 'design_moment', label: 'Design Moment' },
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

  const [results, setResults] = useState<LTBCheckResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<{ check: string; suggestion: string }[]>(
    [],
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    section: true,
    geometry: true,
    loading: false,
    factors: false,
  });

  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const updateForm = (field: keyof LTBCheckForm, value: string) => {
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
  // Calculation (EN 1993-1-1)
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      // Get section properties
      let h: number, b: number, tw: number, tf: number;
      let A: number, Iy: number, Iz: number, Wpl_y: number;
      let Iw: number, It: number;

      if (form.section_size === 'Custom') {
        h = parseFloat(form.custom_h) || 400;
        b = parseFloat(form.custom_b) || 180;
        tw = parseFloat(form.custom_tw) || 8;
        tf = parseFloat(form.custom_tf) || 14;
        // Approximate I-section properties
        A = 2 * b * tf + (h - 2 * tf) * tw;
        Iy = (b * h ** 3 - (b - tw) * (h - 2 * tf) ** 3) / 12;
        Iz = (2 * tf * b ** 3 + (h - 2 * tf) * tw ** 3) / 12;
        Wpl_y = b * tf * (h - tf) + ((h - 2 * tf) ** 2 * tw) / 4;
        Iw = (Iz * (h - tf) ** 2) / 4;
        It = (2 * b * tf ** 3 + (h - 2 * tf) * tw ** 3) / 3;
      } else {
        const section = STEEL_SECTIONS[form.section_size];
        h = section.h;
        b = section.b;
        tw = section.tw;
        tf = section.tf;
        A = section.A;
        Iy = section.Iy;
        Iz = section.Iz;
        Wpl_y = section.Wpl_y;
        Iw = section.Iw;
        It = section.It;
      }

      // Material properties
      const grade = STEEL_GRADES[form.steel_grade];
      const fy = grade.fy;
      const E = 210000; // MPa
      const G = 81000; // MPa

      // Geometry
      const span = parseFloat(form.span) * 1000; // mm
      const k = parseFloat(form.effective_length_factor);
      const L_cr = k * span; // Effective length for LTB

      // Load factors for C1, C2
      const loadParams = LOAD_TYPES[form.load_type] || LOAD_TYPES['Uniform moment'];
      let C1 = loadParams.C1;
      let C2 = loadParams.C2;

      // Adjust C2 for load position
      if (form.load_position === 'top_flange') {
        C2 = C2 * 1.0; // Destabilizing
      } else if (form.load_position === 'bottom_flange') {
        C2 = -C2; // Stabilizing
      } else {
        C2 = 0; // Shear centre
      }

      // Partial factors
      const gamma_m0 = parseFloat(form.gamma_m0);
      const gamma_m1 = parseFloat(form.gamma_m1);

      // Applied moment
      const M_Ed = parseFloat(form.design_moment); // kNm

      // Elastic critical moment Mcr (EN 1993-1-1, NCCI)
      // Mcr = C1 * (π²EIz / L²) * sqrt(Iw/Iz + L²GIt/(π²EIz)) for point of load at shear centre
      const kz = 1.0;
      const kw = 1.0;

      // z_g is distance from shear centre to point of load application
      let z_g = 0;
      if (form.load_position === 'top_flange') {
        z_g = h / 2; // Destabilizing
      } else if (form.load_position === 'bottom_flange') {
        z_g = -h / 2; // Stabilizing
      }

      // Full Mcr formula (NCCI SN003a-EN-EU)
      const Mcr_part1 = (C1 * Math.PI ** 2 * E * Iz) / (kz * L_cr) ** 2;
      const Mcr_part2 = Math.sqrt(
        (kz / kw) ** 2 * (Iw / Iz) +
          ((kz * L_cr) ** 2 * G * It) / (Math.PI ** 2 * E * Iz) +
          (C2 * z_g) ** 2,
      );
      const Mcr_part3 = C2 * z_g;
      const Mcr = (Mcr_part1 * (Mcr_part2 - Mcr_part3)) / 1e6; // kNm

      // Plastic moment resistance
      const Mpl_Rd = (Wpl_y * fy) / gamma_m0 / 1e6; // kNm

      // Non-dimensional slenderness
      const lambda_LT = Math.sqrt((Wpl_y * fy) / 1e6 / Mcr);

      // Buckling curve selection (EN 1993-1-1 Table 6.4)
      let buckling_curve: string;
      let alpha_LT: number;
      const h_b_ratio = h / b;

      if (h_b_ratio <= 2) {
        buckling_curve = 'b';
        alpha_LT = 0.34;
      } else {
        buckling_curve = 'c';
        alpha_LT = 0.49;
      }

      // LTB reduction factor (General case - Clause 6.3.2.3)
      const lambda_LT0 = 0.4; // Plateau length
      const beta = 0.75;

      let chi_LT: number;
      let phi_LT: number;

      if (lambda_LT <= lambda_LT0) {
        chi_LT = 1.0;
        phi_LT = 0.5;
      } else {
        phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - lambda_LT0) + beta * lambda_LT ** 2);
        chi_LT = Math.min(1.0, 1 / (phi_LT + Math.sqrt(phi_LT ** 2 - beta * lambda_LT ** 2)));
      }

      // Apply f factor modification (Clause 6.3.2.3(2))
      const f = Math.min(1.0, 1 - 0.5 * (1 - 1.0)); // kc=1.0 conservative
      chi_LT = Math.min(chi_LT, 1 / lambda_LT ** 2);

      // LTB moment resistance
      const Mb_Rd = (chi_LT * Wpl_y * fy) / gamma_m1 / 1e6; // kNm

      // Continuous restraint check
      let effective_Mb_Rd = Mb_Rd;
      if (form.compression_flange_restraint === 'continuous') {
        effective_Mb_Rd = Mpl_Rd; // No LTB if continuously restrained
      }

      // Utilisations
      const moment_util = (M_Ed / Mpl_Rd) * 100;
      const ltb_util = (M_Ed / effective_Mb_Rd) * 100;
      const max_util = Math.max(moment_util, ltb_util);
      const is_ltb_governing = ltb_util > moment_util;

      // Slenderness category
      let slenderness_category: string;
      if (lambda_LT <= 0.4) {
        slenderness_category = 'Stocky (no LTB reduction)';
      } else if (lambda_LT <= 1.0) {
        slenderness_category = 'Intermediate';
      } else {
        slenderness_category = 'Slender';
      }

      // Classification
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
      const critical_check = is_ltb_governing ? 'LTB' : 'Cross-section Bending';

      // Warnings
      if (max_util > 100) {
        newWarnings.push(`${critical_check} check fails at ${max_util.toFixed(1)}% utilisation`);
      }

      if (lambda_LT > 1.5) {
        newWarnings.push('High slenderness — consider additional restraints');
      }

      if (chi_LT < 0.5) {
        newWarnings.push('Significant LTB reduction — section may be inefficient');
      }

      if (form.load_position === 'top_flange') {
        newWarnings.push('Top flange loading is destabilizing — increases LTB susceptibility');
      }

      setResults({
        h,
        b,
        tw,
        tf,
        A,
        Iy,
        Iz,
        Iw,
        It,
        Wpl_y,
        fy,
        E,
        G,
        L_cr: L_cr / 1000,
        C1,
        C2,
        Mcr,
        lambda_LT,
        lambda_LT0,
        buckling_curve,
        alpha_LT,
        phi_LT,
        chi_LT,
        Mpl_Rd,
        Mb_Rd: effective_Mb_Rd,
        moment_util,
        ltb_util,
        is_ltb_governing,
        slenderness_category,
        critical_check,
        status,
        classification,
        classColor,
      });

      setWarnings(newWarnings);

      // Recommendations
      const recs: { check: string; suggestion: string }[] = [];
      if (ltb_util < 0.4 && moment_util < 0.4)
        recs.push({
          check: 'Member Utilisation',
          suggestion:
            'Member is significantly under-utilised — a lighter section may be more economical',
        });
      if (ltb_util > 0.85)
        recs.push({
          check: 'LTB Utilisation',
          suggestion:
            'LTB utilisation is high — consider reducing unrestrained length or increasing section size',
        });
      if (lambda_LT > 1.2)
        recs.push({
          check: 'Slenderness',
          suggestion:
            'High LTB slenderness — consider adding intermediate lateral restraints to reduce effective length',
        });
      if (is_ltb_governing)
        recs.push({
          check: 'Governing Check',
          suggestion:
            'LTB governs over cross-section resistance — lateral restraint is more effective than increasing section size',
        });
      if (!is_ltb_governing && moment_util > 0.85)
        recs.push({
          check: 'Cross-Section',
          suggestion: 'Cross-section moment resistance governs — a larger section is required',
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
      title: 'LTB Quick Check',
      subtitle: 'EN 1993-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'LTB001' },
      ],
      inputs: [
        { label: 'Section_type', value: String(form.section_type) },
        { label: 'Section_size', value: String(form.section_size) },
        { label: 'Steel_grade', value: String(form.steel_grade) },
        { label: 'Span', value: String(form.span), unit: 'mm' },
        {
          label: 'Effective_length_factor',
          value: String(form.effective_length_factor),
          unit: 'mm',
        },
        { label: 'Load_type', value: String(form.load_type), unit: 'kN' },
        { label: 'Load_position', value: String(form.load_position), unit: 'kN' },
        { label: 'Design_moment', value: String(form.design_moment), unit: 'kNm' },
        { label: 'Moment_diagram', value: String(form.moment_diagram), unit: 'kNm' },
        { label: 'Compression_flange_restraint', value: String(form.compression_flange_restraint) },
        { label: 'End_restraint', value: String(form.end_restraint) },
        { label: 'Gamma_m0', value: String(form.gamma_m0) },
      ],
      checks: [
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${Math.max(results.moment_util ?? 0, results.ltb_util ?? 0).toFixed(1) || '0'}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — LTB Quick Check',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'LTB Quick Check',
      subtitle: 'EN 1993-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'LTB001' },
      ],
      inputs: [
        { label: 'Section_type', value: String(form.section_type) },
        { label: 'Section_size', value: String(form.section_size) },
        { label: 'Steel_grade', value: String(form.steel_grade) },
        { label: 'Span', value: String(form.span), unit: 'mm' },
        {
          label: 'Effective_length_factor',
          value: String(form.effective_length_factor),
          unit: 'mm',
        },
        { label: 'Load_type', value: String(form.load_type), unit: 'kN' },
        { label: 'Load_position', value: String(form.load_position), unit: 'kN' },
        { label: 'Design_moment', value: String(form.design_moment), unit: 'kNm' },
        { label: 'Moment_diagram', value: String(form.moment_diagram), unit: 'kNm' },
        { label: 'Compression_flange_restraint', value: String(form.compression_flange_restraint) },
        { label: 'End_restraint', value: String(form.end_restraint) },
        { label: 'Gamma_m0', value: String(form.gamma_m0) },
      ],
      checks: [
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${Math.max(results.moment_util ?? 0, results.ltb_util ?? 0).toFixed(1) || '0'}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — LTB Quick Check',
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
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
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
            className="p-4"
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
    field: keyof LTBCheckForm;
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
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1993-1-1 Compliant</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
            LTB Quick Check
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Lateral Torsional Buckling assessment for steel beams to Eurocode 3
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button onClick={exportPDF} disabled={!results} className="bg-gray-800/50 border border-gray-600/50 text-white hover:bg-gray-700/50 rounded-lg px-4 py-2">
            <FiDownload className="w-4 h-4 mr-2" />Export PDF
          </Button>
          <Button onClick={exportDOCX} disabled={!results} className="bg-gray-800/50 border border-gray-600/50 text-white hover:bg-gray-700/50 rounded-lg px-4 py-2">
            <FiDownload className="w-4 h-4 mr-2" />Export DOCX
          </Button>
          <SaveRunButton calculatorKey="ltb-check" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
          <div className="flex-1" />
          <input type="text" placeholder="Project Name" value={form.projectName} onChange={(e) => updateForm('projectName', e.target.value)} className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 w-48" />
          <input type="text" placeholder="Reference" value={form.reference} onChange={(e) => updateForm('reference', e.target.value)} className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 w-36" />
        </div>

        {/* Presets */}
        <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
              <FiZap className="text-amber-400" />
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
                {/* Section Selection */}
                <Section
                  id="section"
                  title="Section Selection"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-cyan-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Steel Section</label>
                      <select
                        title="Steel Section"
                        value={form.section_size}
                        onChange={(e) => updateForm('section_size', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(STEEL_SECTIONS).map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Steel Grade</label>
                      <select
                        title="Steel Grade"
                        value={form.steel_grade}
                        onChange={(e) => updateForm('steel_grade', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(STEEL_GRADES).map(([grade, props]) => (
                          <option key={grade} value={grade}>
                            {grade} (fy = {props.fy} MPa)
                          </option>
                        ))}
                      </select>
                    </div>

                    {form.section_size === 'Custom' && (
                      <>
                        <InputField label="Depth h" field="custom_h" unit="mm" />
                        <InputField label="Width b" field="custom_b" unit="mm" />
                        <InputField label="Web tw" field="custom_tw" unit="mm" />
                        <InputField label="Flange tf" field="custom_tf" unit="mm" />
                      </>
                    )}
                  </div>
                </Section>

                {/* Member Configuration */}
                <Section
                  id="geometry"
                  title="Member Configuration"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-emerald-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Unrestrained Length" field="span" unit="m" />
                    <InputField label="Effective Length Factor k" field="effective_length_factor" />

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Load Type</label>
                      <select
                        title="Load Type"
                        value={form.load_type}
                        onChange={(e) => updateForm('load_type', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(LOAD_TYPES).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Load Position</label>
                      <select
                        title="Load Position"
                        value={form.load_position}
                        onChange={(e) => updateForm('load_position', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="shear_centre">Shear Centre</option>
                        <option value="top_flange">Top Flange (Destabilizing)</option>
                        <option value="bottom_flange">Bottom Flange (Stabilizing)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Compression Flange Restraint</label>
                      <select
                        title="Compression Flange Restraint"
                        value={form.compression_flange_restraint}
                        onChange={(e) => updateForm('compression_flange_restraint', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="none">None</option>
                        <option value="intermediate">Intermediate Restraints</option>
                        <option value="continuous">Continuous (Full Restraint)</option>
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Loading */}
                <Section
                  id="loading"
                  title="Applied Moment"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-amber-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Design Moment M_Ed" field="design_moment" unit="kNm" />
                  </div>
                </Section>

                {/* Design Factors */}
                <Section
                  id="factors"
                  title="Partial Factors"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-purple-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="γ_M0 (Cross-section)" field="gamma_m0" />
                    <InputField label="γ_M1 (Buckling)" field="gamma_m1" />
                  </div>
                </Section>

                {/* Calculate Button */}
                <button
                  onClick={calculate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
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
                        <LTBCheck3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        title="Close fullscreen"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        LTB CHECK — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        { label: 'Section', value: form.section_size },
                        { label: 'Span', value: `${form.span} m` },
                        { label: 'Steel Grade', value: form.steel_grade },
                        { label: 'Design Moment', value: `${form.design_moment} kNm` },
                        { label: 'Load Type', value: form.load_type },
                        { label: 'Le Factor', value: form.effective_length_factor },
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
                          { label: 'Moment Util', value: results ? `${results.moment_util.toFixed(1)}%` : '—' },
                          { label: 'LTB Util', value: results ? `${results.ltb_util.toFixed(1)}%` : '—' },
                          { label: 'Mb,Rd', value: results ? `${results.Mb_Rd.toFixed(1)} kNm` : '—' },
                          { label: 'χ_LT', value: results ? `${results.chi_LT.toFixed(3)}` : '—' },
                          { label: 'λ_LT', value: results ? `${results.lambda_LT.toFixed(3)}` : '—' },
                          { label: 'Mcr', value: results ? `${results.Mcr.toFixed(1)} kNm` : '—' },
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
                            { label: 'Moment Check', util: results.moment_util.toFixed(1), status: results.status },
                            { label: 'LTB Check', util: results.ltb_util.toFixed(1), status: results.status },
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
                  title="LTB Check — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <LTBCheck3D />
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
                      className={cn(
                        'border-2 shadow-lg',
                        results.status === 'PASS'
                          ? 'bg-green-900/20 border-green-500/50'
                          : 'bg-red-900/20 border-red-500/50',
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
                          {results.classification} —{' '}
                          {Math.max(results.moment_util, results.ltb_util).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Critical: {results.critical_check}</p>
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
                            name: 'Cross-section Bending',
                            util: results.moment_util,
                            cap: results.Mpl_Rd,
                            unit: 'kNm',
                          },
                          {
                            name: 'Lateral Torsional Buckling',
                            util: results.ltb_util,
                            cap: results.Mb_Rd,
                            unit: 'kNm',
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
                            <p className="text-xs text-gray-500 mt-0.5">
                              Capacity: {check.cap.toFixed(1)} {check.unit}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* LTB Parameters */}
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">LTB Parameters</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Mcr</p>
                          <p className="text-white font-mono">{results.Mcr.toFixed(0)} kNm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">λ_LT</p>
                          <p className="text-white font-mono">{results.lambda_LT.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">χ_LT</p>
                          <p className="text-white font-mono">{results.chi_LT.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Curve</p>
                          <p className="text-white font-mono">{results.buckling_curve}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">α_LT</p>
                          <p className="text-white font-mono">{results.alpha_LT.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">L_cr</p>
                          <p className="text-white font-mono">{results.L_cr.toFixed(2)} m</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Slenderness Category */}
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-400 mb-1">Slenderness Category</p>
                        <p className="text-white font-medium">{results.slenderness_category}</p>
                      </CardContent>
                    </Card>

                    {/* Warnings */}
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

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                      <Card className="bg-blue-500/10 border-blue-500/30">
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
                      <Button
                        onClick={exportPDF}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
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
                      <SaveRunButton calculatorKey="ltb-check" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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

export default LTBCheck;
