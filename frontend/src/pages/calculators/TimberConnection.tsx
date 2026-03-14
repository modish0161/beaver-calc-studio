// =============================================================================
// Timber Connection Design Calculator — Premium Edition
// EN 1995-1-1 (Eurocode 5) — Timber Fastener Connection Design
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiGrid,
    FiInfo,
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

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import TimberConnection3D from '../../components/3d/scenes/TimberConnection3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Connection Type
  connection_type: string;
  fastener_type: string;
  // Fastener Properties
  fastener_diameter: string;
  fastener_length: string;
  fastener_grade: string;
  // Timber Properties (Member 1)
  timber_grade_1: string;
  timber_thickness_1: string;
  timber_width_1: string;
  grain_angle_1: string;
  // Timber Properties (Member 2)
  timber_grade_2: string;
  timber_thickness_2: string;
  timber_width_2: string;
  grain_angle_2: string;
  // Loading
  design_load: string;
  load_direction: string;
  load_duration: string;
  service_class: string;
  // Design Factors
  gamma_m: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Fastener Capacity
  Fv_Rk: number; // Characteristic lateral load capacity per fastener
  Fv_Rd: number; // Design lateral load capacity per fastener
  Fax_Rk: number; // Characteristic axial withdrawal capacity
  Fax_Rd: number; // Design axial withdrawal capacity
  // Modification Factors
  kmod: number;
  // Number of Fasteners
  n_required: number;
  n_provided: number;
  n_eff: number; // Effective number accounting for spacing
  // Spacing Requirements
  a1_min: number; // Spacing parallel to grain
  a2_min: number; // Spacing perpendicular to grain
  a3_min: number; // End distance loaded
  a4_min: number; // Edge distance
  a1_provided: number;
  a2_provided: number;
  // Group Capacity
  group_capacity: number;
  // Utilisation
  utilisation: number;
  // Status
  status: string;
  rating: string;
  ratingColor: string;
  warnings: string[];
  // Failure Mode
  failure_mode: string;
}

// =============================================================================
// REFERENCE DATA — EN 1995-1-1 (EC5)
// =============================================================================

const CONNECTION_TYPES: Record<string, { name: string; description: string }> = {
  timber_timber: { name: 'Timber-to-Timber', description: 'Single or double shear' },
  timber_steel: { name: 'Timber-to-Steel', description: 'Steel plate connection' },
  timber_panel: { name: 'Timber-to-Panel', description: 'Plywood/OSB gusset' },
};

const FASTENER_TYPES: Record<string, { name: string; category: string }> = {
  bolt: { name: 'Bolt', category: 'dowel' },
  coach_screw: { name: 'Coach Screw', category: 'screw' },
  wood_screw: { name: 'Wood Screw', category: 'screw' },
  nail_smooth: { name: 'Smooth Nail', category: 'nail' },
  nail_ring: { name: 'Ring Shank Nail', category: 'nail' },
  dowel: { name: 'Timber Dowel', category: 'dowel' },
};

const FASTENER_GRADES: Record<string, { fu: number; fy: number; name: string }> = {
  '4.6': { fu: 400, fy: 240, name: 'Grade 4.6' },
  '5.6': { fu: 500, fy: 300, name: 'Grade 5.6' },
  '8.8': { fu: 800, fy: 640, name: 'Grade 8.8' },
  '10.9': { fu: 1000, fy: 900, name: 'Grade 10.9' },
  stainless_a2: { fu: 500, fy: 210, name: 'Stainless A2' },
  mild_steel: { fu: 400, fy: 240, name: 'Mild Steel' },
};

// Timber grades with characteristic properties (EC5)
const TIMBER_GRADES: Record<
  string,
  {
    name: string;
    rho_k: number; // Characteristic density kg/m³
    fh_0_k: number; // Embedding strength parallel to grain N/mm²
    fc_0_k: number; // Compression strength parallel N/mm²
  }
> = {
  C16: { name: 'C16', rho_k: 310, fh_0_k: 22, fc_0_k: 17 },
  C24: { name: 'C24', rho_k: 350, fh_0_k: 25, fc_0_k: 21 },
  C27: { name: 'C27', rho_k: 370, fh_0_k: 26, fc_0_k: 22 },
  C30: { name: 'C30', rho_k: 380, fh_0_k: 27, fc_0_k: 23 },
  C35: { name: 'C35', rho_k: 400, fh_0_k: 28, fc_0_k: 25 },
  C40: { name: 'C40', rho_k: 420, fh_0_k: 29, fc_0_k: 26 },
  D30: { name: 'D30 (Hardwood)', rho_k: 530, fh_0_k: 35, fc_0_k: 23 },
  D40: { name: 'D40 (Hardwood)', rho_k: 590, fh_0_k: 38, fc_0_k: 26 },
  D50: { name: 'D50 (Hardwood)', rho_k: 650, fh_0_k: 41, fc_0_k: 29 },
  GL24h: { name: 'GL24h (Glulam)', rho_k: 380, fh_0_k: 25, fc_0_k: 24 },
  GL28h: { name: 'GL28h (Glulam)', rho_k: 410, fh_0_k: 27, fc_0_k: 28 },
  GL32h: { name: 'GL32h (Glulam)', rho_k: 430, fh_0_k: 28, fc_0_k: 32 },
};

const LOAD_DURATIONS: Record<
  string,
  { name: string; kmod_1: number; kmod_2: number; kmod_3: number }
> = {
  permanent: { name: 'Permanent', kmod_1: 0.6, kmod_2: 0.6, kmod_3: 0.5 },
  long_term: { name: 'Long Term', kmod_1: 0.7, kmod_2: 0.7, kmod_3: 0.55 },
  medium_term: { name: 'Medium Term', kmod_1: 0.8, kmod_2: 0.8, kmod_3: 0.65 },
  short_term: { name: 'Short Term', kmod_1: 0.9, kmod_2: 0.9, kmod_3: 0.7 },
  instantaneous: { name: 'Instantaneous', kmod_1: 1.1, kmod_2: 1.1, kmod_3: 0.9 },
};

const SERVICE_CLASSES: Record<string, { name: string; description: string }> = {
  '1': { name: 'Service Class 1', description: 'Dry conditions (≤12% MC)' },
  '2': { name: 'Service Class 2', description: 'Protected external (≤20% MC)' },
  '3': { name: 'Service Class 3', description: 'Exposed external (>20% MC)' },
};

const BOLT_DIAMETERS: Record<string, { d: number; d0: number }> = {
  M8: { d: 8, d0: 9 },
  M10: { d: 10, d0: 11 },
  M12: { d: 12, d0: 13 },
  M16: { d: 16, d0: 18 },
  M20: { d: 20, d0: 22 },
  M24: { d: 24, d0: 26 },
};

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  beam_splice: {
    name: 'Beam Splice (4×M16)',
    form: {
      connection_type: 'timber_timber',
      fastener_type: 'bolt',
      fastener_diameter: 'M16',
      fastener_grade: '8.8',
      timber_grade_1: 'C24',
      timber_thickness_1: '100',
      timber_width_1: '200',
      timber_grade_2: 'C24',
      timber_thickness_2: '100',
      design_load: '50',
      load_duration: 'medium_term',
      service_class: '1',
    },
  },
  rafter_tie: {
    name: 'Rafter Tie (2×M12)',
    form: {
      connection_type: 'timber_timber',
      fastener_type: 'bolt',
      fastener_diameter: 'M12',
      fastener_grade: '8.8',
      timber_grade_1: 'C24',
      timber_thickness_1: '47',
      timber_width_1: '150',
      timber_grade_2: 'C24',
      timber_thickness_2: '47',
      design_load: '15',
      load_duration: 'short_term',
      service_class: '1',
    },
  },
  steel_plate: {
    name: 'Steel Plate (4×M20)',
    form: {
      connection_type: 'timber_steel',
      fastener_type: 'bolt',
      fastener_diameter: 'M20',
      fastener_grade: '8.8',
      timber_grade_1: 'GL28h',
      timber_thickness_1: '140',
      timber_width_1: '300',
      timber_grade_2: 'GL28h',
      timber_thickness_2: '140',
      design_load: '100',
      load_duration: 'medium_term',
      service_class: '1',
    },
  },
  coach_screw: {
    name: 'Coach Screw (6×Ø10)',
    form: {
      connection_type: 'timber_timber',
      fastener_type: 'coach_screw',
      fastener_diameter: 'M10',
      fastener_grade: 'mild_steel',
      fastener_length: '100',
      timber_grade_1: 'C24',
      timber_thickness_1: '45',
      timber_width_1: '95',
      timber_grade_2: 'C24',
      timber_thickness_2: '100',
      design_load: '25',
      load_duration: 'medium_term',
      service_class: '1',
    },
  },
};

// =============================================================================
// EC5 CALCULATION FUNCTIONS
// =============================================================================

// Calculate embedding strength (EC5 Eq 8.32)
const calculateEmbeddingStrength = (d: number, rho_k: number, alpha: number): number => {
  // For softwood (simplified)
  const fh_0_k = 0.082 * rho_k * Math.pow(d, -0.3);
  const k90 = 1.35 + 0.015 * d;
  const alpha_rad = (alpha * Math.PI) / 180;
  return fh_0_k / (k90 * Math.pow(Math.sin(alpha_rad), 2) + Math.pow(Math.cos(alpha_rad), 2));
};

// Calculate yield moment for fastener (EC5 Eq 8.14)
const calculateYieldMoment = (d: number, fu: number): number => {
  // For circular cross-section bolts/dowels
  return 0.3 * fu * Math.pow(d, 2.6);
};

// Johansen yield theory - single shear timber-timber (EC5 Eq 8.6)
const calculateSingleShearTT = (
  fh1: number,
  fh2: number,
  t1: number,
  t2: number,
  d: number,
  My: number,
): { Fv_Rk: number; mode: string } => {
  const beta = fh2 / fh1;

  // Failure modes (a) to (j) per EC5
  const modes: { value: number; name: string }[] = [
    { value: fh1 * t1 * d, name: 'Mode (a) - Bearing in member 1' },
    { value: fh2 * t2 * d, name: 'Mode (b) - Bearing in member 2' },
    {
      value:
        ((fh1 * t1 * d) / (1 + beta)) *
        (Math.sqrt(
          beta +
            2 * beta * beta * (1 + t2 / t1 + (t2 / t1) ** 2) +
            beta * beta * beta * (t2 / t1) ** 2,
        ) -
          beta * (1 + t2 / t1)),
      name: 'Mode (c)',
    },
    {
      value:
        1.05 *
        ((fh1 * t1 * d) / (2 + beta)) *
        (Math.sqrt(2 * beta * (1 + beta) + (4 * beta * (2 + beta) * My) / (fh1 * d * t1 * t1)) -
          beta),
      name: 'Mode (d)',
    },
    {
      value:
        1.05 *
        ((fh1 * t2 * d) / (1 + 2 * beta)) *
        (Math.sqrt(
          2 * beta * beta * (1 + beta) + (4 * beta * (1 + 2 * beta) * My) / (fh1 * d * t2 * t2),
        ) -
          beta),
      name: 'Mode (e)',
    },
    {
      value: 1.15 * Math.sqrt((2 * beta) / (1 + beta)) * Math.sqrt(2 * My * fh1 * d),
      name: 'Mode (f) - Double plastic hinge',
    },
  ];

  // Find minimum (critical) mode
  const critical = modes.reduce((min, curr) => (curr.value < min.value ? curr : min));

  return { Fv_Rk: critical.value, mode: critical.name };
};

// Calculate minimum spacing requirements (EC5 Table 8.4)
const calculateSpacingRequirements = (
  d: number,
  alpha: number,
): {
  a1: number;
  a2: number;
  a3_t: number;
  a3_c: number;
  a4_t: number;
  a4_c: number;
} => {
  const cosAlpha = Math.abs(Math.cos((alpha * Math.PI) / 180));
  const sinAlpha = Math.abs(Math.sin((alpha * Math.PI) / 180));

  return {
    a1: (4 + Math.abs(cosAlpha)) * d, // Parallel to grain
    a2: 4 * d, // Perpendicular to grain
    a3_t: Math.max(7 * d, 80), // Loaded end
    a3_c: Math.max(4 * d, 60), // Unloaded end
    a4_t: Math.max((2 + 2 * sinAlpha) * d, 3 * d), // Loaded edge
    a4_c: 3 * d, // Unloaded edge
  };
};

// Effective number of fasteners (EC5 Eq 8.34)
const calculateEffectiveNumber = (n: number, a1: number, d: number): number => {
  const n_eff = Math.pow(n, 0.9) * Math.pow(Math.min(a1 / (13 * d), 1), 0.25);
  return Math.min(n_eff, n);
};

const TimberConnection = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    connection_type: '',
    design_load: '',
    fastener_diameter: '',
    fastener_grade: '',
    fastener_length: '',
    fastener_type: '',
    gamma_m: '',
    grain_angle_1: '',
    grain_angle_2: '',
    load_direction: '',
    load_duration: '',
    projectName: '',
    reference: '',
    service_class: '',
    timber_grade_1: '',
    timber_grade_2: '',
    timber_thickness_1: '',
    timber_thickness_2: '',
    timber_width_1: '',
    timber_width_2: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'connection_type', label: 'Connection Type' },
  { key: 'design_load', label: 'Design Load' },
  { key: 'fastener_diameter', label: 'Fastener Diameter' },
  { key: 'fastener_grade', label: 'Fastener Grade' },
  { key: 'fastener_length', label: 'Fastener Length' },
  { key: 'fastener_type', label: 'Fastener Type' },
  { key: 'gamma_m', label: 'Gamma M' },
  { key: 'grain_angle_1', label: 'Grain Angle 1' },
  { key: 'grain_angle_2', label: 'Grain Angle 2' },
  { key: 'load_direction', label: 'Load Direction' },
  { key: 'load_duration', label: 'Load Duration' },
  { key: 'service_class', label: 'Service Class' },
  { key: 'timber_grade_1', label: 'Timber Grade 1' },
  { key: 'timber_grade_2', label: 'Timber Grade 2' },
  { key: 'timber_thickness_1', label: 'Timber Thickness 1' },
  { key: 'timber_thickness_2', label: 'Timber Thickness 2' },
  { key: 'timber_width_1', label: 'Timber Width 1' },
  { key: 'timber_width_2', label: 'Timber Width 2' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'connection_type', label: 'Connection_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'fastener_type', label: 'Fastener_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'fastener_diameter', label: 'Fastener_diameter', min: 0, max: 100, step: 1, unit: '' },
    { key: 'fastener_length', label: 'Fastener_length', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  // ===== HANDLERS =====
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateForm = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (key: string) => {
    const preset = (PRESETS as any)[key];
    if (preset) {
      setFormData((prev) => ({ ...prev, ...preset }));
    }
  };

  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);
    setTimeout(() => {
      try {
        const w: string[] = [];

        // Parse inputs
        const connType = formData.connection_type || 'timber_timber';
        const fastType = formData.fastener_type || 'bolt';
        const diaKey = formData.fastener_diameter || 'M16';
        const boltData = BOLT_DIAMETERS[diaKey as keyof typeof BOLT_DIAMETERS];
        const d = boltData ? boltData.d : parseFloat(formData.fastener_diameter) || 16;

        const gradeKey = formData.fastener_grade || '8.8';
        const grade =
          FASTENER_GRADES[gradeKey as keyof typeof FASTENER_GRADES] || FASTENER_GRADES['8.8'];
        const fu = grade.fu;

        // Timber properties
        const timber1 =
          TIMBER_GRADES[formData.timber_grade_1 as keyof typeof TIMBER_GRADES] || TIMBER_GRADES.C24;
        const timber2 =
          TIMBER_GRADES[formData.timber_grade_2 as keyof typeof TIMBER_GRADES] || TIMBER_GRADES.C24;
        const t1 = parseFloat(formData.timber_thickness_1) || 47;
        const t2 = parseFloat(formData.timber_thickness_2) || 100;
        const alpha1 = parseFloat(formData.grain_angle_1) || 0;
        const alpha2 = parseFloat(formData.grain_angle_2) || 0;

        const designLoad = parseFloat(formData.design_load) || 30; // kN
        const loadDir = parseFloat(formData.load_direction) || 0;

        // kmod from load duration and service class
        const sc = formData.service_class || '1';
        const ldKey = formData.load_duration || 'medium_term';
        const ldData = LOAD_DURATIONS[ldKey as keyof typeof LOAD_DURATIONS];
        const kmod = ldData ? (ldData as any)[`kmod_${sc}`] || 0.8 : 0.8;

        const gamma_m = parseFloat(formData.gamma_m) || 1.3;

        // EC5 calculations using existing helpers
        const fh1 = calculateEmbeddingStrength(d, timber1.rho_k, alpha1);
        const fh2 =
          connType === 'timber_steel'
            ? fh1 * 100 // Steel plate: effectively infinite embedding
            : calculateEmbeddingStrength(d, timber2.rho_k, alpha2);

        const My = calculateYieldMoment(d, fu);

        // Johansen yield theory
        const { Fv_Rk, mode } = calculateSingleShearTT(fh1, fh2, t1, t2, d, My);

        // Rope effect (axial withdrawal contribution) - simplified
        // For bolts: up to 25% of Johansen part
        let Fax_Rk = 0;
        if (fastType === 'bolt' || fastType === 'coach_screw') {
          Fax_Rk = Fv_Rk * 0.25; // Conservative 25% rope effect
        } else if (fastType === 'nail_ring') {
          Fax_Rk = Fv_Rk * 0.15;
        }

        // Design capacity per fastener
        const Fv_Rd = (Fv_Rk * kmod) / gamma_m / 1000; // kN
        const Fax_Rd = (Fax_Rk * kmod) / gamma_m / 1000; // kN

        // Number of fasteners required
        const n_required = Fv_Rd > 0 ? Math.ceil(designLoad / Fv_Rd) : 999;
        const n_provided = Math.max(n_required, 2); // Min 2 fasteners

        // Spacing requirements
        const spacing = calculateSpacingRequirements(d, loadDir);
        const a1_min = spacing.a1;
        const a2_min = spacing.a2;
        const a3_min = spacing.a3_t;
        const a4_min = spacing.a4_t;

        // Provided spacing (assume minimum + margin)
        const a1_provided = a1_min * 1.1;
        const a2_provided = a2_min * 1.1;

        // Effective number
        const n_eff = calculateEffectiveNumber(n_provided, a1_provided, d);

        // Group capacity
        const group_capacity = n_eff * Fv_Rd;

        // Utilisation
        const utilisation = group_capacity > 0 ? designLoad / group_capacity : 999;

        // Check timber width for spacing
        const w1 = parseFloat(formData.timber_width_1) || 100;
        if (
          n_provided > 1 &&
          a2_provided * (Math.ceil(Math.sqrt(n_provided)) - 1) + 2 * a4_min > w1
        ) {
          w.push('Timber width may be insufficient for bolt spacing layout');
        }

        // Warnings
        if (utilisation > 1.0) w.push('Connection capacity exceeded \u2014 add more fasteners');
        if (n_eff < n_provided * 0.7) w.push('Significant row effect \u2014 consider staggering');
        if (t1 < 5 * d) w.push(`Member 1 thickness < 5d (${(5 * d).toFixed(0)}mm required)`);
        if (alpha1 > 30) w.push('Load at angle to grain \u2014 review splitting risk');

        // Rating
        let rating = 'PASS';
        let ratingColor = '#22c55e';
        if (utilisation > 1.0) {
          rating = 'FAIL';
          ratingColor = '#ef4444';
        } else if (utilisation > 0.85) {
          rating = 'ADEQUATE';
          ratingColor = '#f59e0b';
        } else if (utilisation > 0.5) {
          rating = 'GOOD';
          ratingColor = '#3b82f6';
        }

        setResults({
          Fv_Rk,
          Fv_Rd,
          Fax_Rk,
          Fax_Rd,
          kmod,
          n_required,
          n_provided,
          n_eff,
          a1_min,
          a2_min,
          a3_min,
          a4_min,
          a1_provided,
          a2_provided,
          group_capacity,
          utilisation,
          status: `${n_provided}\u00d7 ${diaKey} ${fastType} \u2014 ${rating}`,
          rating,
          ratingColor,
          warnings: w,
          failure_mode: mode,
        });
        setWarnings(w);
      } catch (e) {
        console.error('Calculation error:', e);
      }
      setIsCalculating(false);
    }, 500);
  }, [formData]);

  const handleExportPDF = useCallback(() => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Timber Connection Design',
      subtitle: 'EN 1995-1-1 (Eurocode 5)',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Untitled' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Date', value: new Date().toLocaleDateString() },
      ],
      inputs: [
        {
          label: 'Connection Type',
          value: CONNECTION_TYPES[formData.connection_type]?.name || formData.connection_type,
        },
        {
          label: 'Fastener Type',
          value: FASTENER_TYPES[formData.fastener_type]?.name || formData.fastener_type,
        },
        { label: 'Fastener Diameter', value: formData.fastener_diameter, unit: 'mm' },
        { label: 'Fastener Length', value: formData.fastener_length, unit: 'mm' },
        {
          label: 'Fastener Grade',
          value:
            FASTENER_GRADES[formData.fastener_grade as keyof typeof FASTENER_GRADES]?.name ||
            formData.fastener_grade,
        },
        {
          label: 'Timber 1',
          value: `${TIMBER_GRADES[formData.timber_grade_1 as keyof typeof TIMBER_GRADES]?.name || ''} ${formData.timber_thickness_1}×${formData.timber_width_1}mm`,
        },
        {
          label: 'Timber 2',
          value: `${TIMBER_GRADES[formData.timber_grade_2 as keyof typeof TIMBER_GRADES]?.name || ''} ${formData.timber_thickness_2}×${formData.timber_width_2}mm`,
        },
        { label: 'Design Load', value: formData.design_load, unit: 'kN' },
        {
          label: 'Load Duration',
          value:
            LOAD_DURATIONS[formData.load_duration as keyof typeof LOAD_DURATIONS]?.name ||
            formData.load_duration,
        },
        {
          label: 'Service Class',
          value:
            SERVICE_CLASSES[formData.service_class as keyof typeof SERVICE_CLASSES]?.name ||
            formData.service_class,
        },
      ],
      checks: [
        {
          name: 'Fastener Capacity',
          capacity: `${results.Fv_Rd.toFixed(1)} kN`,
          utilisation: String(results.utilisation.toFixed(1)) + '%',
          status: results.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Group Capacity',
          capacity: `${results.group_capacity.toFixed(1)} kN`,
          utilisation:
            String(
              (results.group_capacity > 0
                ? (parseFloat(formData.design_load) / results.group_capacity) * 100
                : 0
              ).toFixed(1),
            ) + '%',
          status: results.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Spacing Check',
          capacity: `a1=${results.a1_min.toFixed(0)} mm`,
          utilisation: '-',
          status: (results.a1_provided >= results.a1_min ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      sections: [
        {
          title: 'Detailed Results',
          head: [['Parameter', 'Value']],
          body: [
            ['Fv,Rk (characteristic)', `${results.Fv_Rk.toFixed(0)} N`],
            ['kmod', results.kmod.toFixed(2)],
            ['Fasteners Required', String(results.n_required)],
            ['Fasteners Provided', String(results.n_provided)],
            ['n_eff', results.n_eff.toFixed(2)],
            ['Failure Mode', results.failure_mode],
          ],
        },
      ],
      recommendations: [
        {
          check: 'Connection Capacity',
          suggestion:
            results.status === 'PASS'
              ? 'Connection is adequate for the design load'
              : 'Increase fastener size or quantity',
        },
        { check: 'Failure Mode', suggestion: `Governing failure mode: ${results.failure_mode}` },
      ],
      warnings: results.warnings,
    });
  }, [formData, results]);

  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Timber Connection Design',
      subtitle: 'EN 1995-1-1 (Eurocode 5)',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Untitled' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'EN 1995-1-1:2004' },
      ],
      inputs: [
        {
          label: 'Connection Type',
          value: CONNECTION_TYPES[formData.connection_type]?.name || formData.connection_type,
        },
        {
          label: 'Fastener Type',
          value: FASTENER_TYPES[formData.fastener_type]?.name || formData.fastener_type,
        },
        { label: 'Fastener Diameter', value: formData.fastener_diameter, unit: 'mm' },
        { label: 'Design Load', value: formData.design_load, unit: 'kN' },
        {
          label: 'Load Duration',
          value:
            LOAD_DURATIONS[formData.load_duration as keyof typeof LOAD_DURATIONS]?.name ||
            formData.load_duration,
        },
        {
          label: 'Service Class',
          value:
            SERVICE_CLASSES[formData.service_class as keyof typeof SERVICE_CLASSES]?.name ||
            formData.service_class,
        },
      ],
      sections: [
        {
          title: 'Connection Results',
          head: [['Parameter', 'Value']],
          body: [
            ['Fv,Rd (design capacity)', `${results.Fv_Rd.toFixed(1)} kN`],
            ['kmod', results.kmod.toFixed(2)],
            ['Fasteners Required', String(results.n_required)],
            ['Fasteners Provided', String(results.n_provided)],
            ['n_eff', results.n_eff.toFixed(2)],
            ['Failure Mode', results.failure_mode],
          ],
        },
      ],
      checks: [
        {
          name: 'Fastener Capacity',
          capacity: `${results.Fv_Rd.toFixed(1)} kN`,
          utilisation: `${results.utilisation.toFixed(1)}%`,
          status: results.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Group Capacity',
          capacity: `${results.group_capacity.toFixed(1)} kN`,
          utilisation: `${((parseFloat(formData.design_load) / results.group_capacity) * 100).toFixed(1)}%`,
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Timber Connection Design',
    });
  }, [formData, results]);


  const InputField = ({
    label,
    field,
    unit,
    tooltip,
  }: {
    label: string;
    field: string;
    unit?: string;
    tooltip?: string;
  }) => (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <ExplainableLabel label={label} field={field} className="text-sm font-semibold text-gray-300" />{' '}
        {unit && <span className="text-xs text-gray-400">({unit})</span>}
      </div>
      <input
        type="number"
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        placeholder="0"
        title={tooltip || label}
      />
    </div>
  );

  const CollapsibleSection = ({
    title,
    icon,
    variant,
    defaultOpen = true,
    children,
  }: {
    title: string;
    icon?: React.ReactNode;
    variant?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
  }) => {
    const sectionId = title.replace(/\s+/g, '_').toLowerCase();
    if (expandedSections[sectionId] === undefined) {
      expandedSections[sectionId] = defaultOpen;
    }
    return (
      <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
        <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection(sectionId)}>
          <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        {expandedSections[sectionId] && <CardContent>{children}</CardContent>}
      </Card>
    );
  };

  // =============================================================================
  // COLLAPSIBLE SECTION COMPONENT
  // =============================================================================

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

  const ResultItem: React.FC<{
    label: string;
    value: string | number;
    unit?: string;
    highlight?: boolean;
    color?: string;
  }> = ({ label, value, unit, highlight, color }) => (
    <div
      className={cn(
        'flex justify-between py-2 border-b border-gray-700/50',
        highlight && 'bg-blue-500/10 px-2 -mx-2 rounded',
      )}
    >
      <span className="text-gray-400">{label}</span>
      <span
        className={cn(
          'font-mono',
          color || (highlight ? 'text-blue-400 font-semibold' : 'text-white'),
        )}
        style={color ? { color } : undefined}
      >
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span className="text-gray-500 ml-1">{unit}</span>}
      </span>
    </div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                Timber Connection Design
              </h1>
              <p className="text-gray-400 mt-2">
                EN 1995-1-1 (Eurocode 5) — Dowel-Type Fastener Connections
              </p>
            </div>
            <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3">
              {results && (
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="border-cyan-500 text-cyan-400"
                >
                  <FiDownload className="mr-2" />
                  Export PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={handleExportDOCX}
                  variant="outline"
                  className="border-purple-500 text-purple-400"
                >
                  <FiDownload className="mr-2" />
                  Export DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton
                  calculatorKey="timber-connection"
                  inputs={formData as unknown as Record<string, string | number>}
                  results={results}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'input' ? 'default' : 'outline'}
            onClick={() => setActiveTab('input')}
            className={activeTab === 'input' ? 'bg-blue-600' : ''}
          >
            <FiSettings className="mr-2" />
            Input
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            onClick={() => setActiveTab('results')}
            className={activeTab === 'results' ? 'bg-blue-600' : ''}
            disabled={!results}
          >
            <FiTarget className="mr-2" />
            Results
          </Button>
        </div>

        {activeTab === 'input' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Input Column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Presets */}
              <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
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
                        className="text-gray-300 border-gray-600 hover:bg-gray-700"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Connection Configuration */}
              <CollapsibleSection
                title="Connection Configuration"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiGrid className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="amber"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Connection Type</label>
                    <select
                      title="Connection Type"
                      value={formData.connection_type}
                      onChange={(e) => updateForm('connection_type', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(CONNECTION_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Fastener Type</label>
                    <select
                      title="Fastener Type"
                      value={formData.fastener_type}
                      onChange={(e) => updateForm('fastener_type', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(FASTENER_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Fastener Size</label>
                    <select
                      title="Fastener Size"
                      value={formData.fastener_diameter}
                      onChange={(e) => updateForm('fastener_diameter', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.keys(BOLT_DIAMETERS).map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Fastener Grade</label>
                    <select
                      title="Fastener Grade"
                      value={formData.fastener_grade}
                      onChange={(e) => updateForm('fastener_grade', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(FASTENER_GRADES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Timber Member 1 */}
              <CollapsibleSection
                title="Timber Member 1"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiLayers className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="brown"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Timber Grade</label>
                    <select
                      title="Timber Grade"
                      value={formData.timber_grade_1}
                      onChange={(e) => updateForm('timber_grade_1', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(TIMBER_GRADES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name} (ρk = {val.rho_k} kg/m³)
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField label="Thickness (t₁)" field="timber_thickness_1" unit="mm" />
                  <InputField label="Width" field="timber_width_1" unit="mm" />
                  <InputField
                    label="Load-Grain Angle"
                    field="grain_angle_1"
                    unit="°"
                    tooltip="Angle between load and grain direction"
                  />
                </div>
              </CollapsibleSection>

              {/* Timber Member 2 */}
              <CollapsibleSection
                title="Timber Member 2"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiLayers className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="brown"
                defaultOpen={false}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Timber Grade</label>
                    <select
                      title="Timber Grade"
                      value={formData.timber_grade_2}
                      onChange={(e) => updateForm('timber_grade_2', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(TIMBER_GRADES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name} (ρk = {val.rho_k} kg/m³)
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField label="Thickness (t₂)" field="timber_thickness_2" unit="mm" />
                  <InputField label="Width" field="timber_width_2" unit="mm" />
                  <InputField label="Load-Grain Angle" field="grain_angle_2" unit="°" />
                </div>
              </CollapsibleSection>

              {/* Loading */}
              <CollapsibleSection
                title="Loading & Service Conditions"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiTarget className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="purple"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <InputField label="Design Load (Fd)" field="design_load" unit="kN" />
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Load Duration Class</label>
                    <select
                      title="Load duration"
                      value={formData.load_duration}
                      onChange={(e) => updateForm('load_duration', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(LOAD_DURATIONS).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Service Class</label>
                    <select
                      title="Service Class"
                      value={formData.service_class}
                      onChange={(e) => updateForm('service_class', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(SERVICE_CLASSES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField
                    label="γM (Connection)"
                    field="gamma_m"
                    tooltip="Partial safety factor for connections"
                  />
                </div>
              </CollapsibleSection>

              {/* Project Info */}
              <CollapsibleSection
                title="Project Information"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiInfo className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="emerald"
                defaultOpen={false}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Project Name</label>
                    <input
                      title="Project Name"
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => updateForm('projectName', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Reference</label>
                    <input
                      title="Reference"
                      type="text"
                      value={formData.reference}
                      onChange={(e) => updateForm('reference', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* RUN FULL ANALYSIS */}
              <button
                onClick={() => {
                  runCalculation();
                  setActiveTab('results');
                }}
                disabled={isCalculating}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isCalculating ? <FiActivity className="animate-spin inline mr-2" /> : null}
                ▶ RUN FULL ANALYSIS
              </button>
            </div>

            {/* Preview Column */}
            <div className="space-y-4">
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
                      <TimberConnection3D />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                      aria-label="Minimize preview"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      TIMBER CONNECTION — REAL-TIME PREVIEW
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
                        { label: 'Connection', value: formData.connection_type },
                        { label: 'Fastener', value: formData.fastener_type },
                        { label: 'Diameter', value: `${formData.fastener_diameter} mm` },
                        { label: 'Length', value: `${formData.fastener_length} mm` },
                        { label: 'Design Load', value: `${formData.design_load} kN` },
                        { label: 'Timber Grade', value: formData.timber_grade_1 },
                        { label: 'Service Class', value: formData.service_class },
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
                          { label: 'Utilisation', util: results.utilisation.toFixed(1), status: results.status },
                          { label: 'Fasteners Req', util: `${results.n_required}`, status: results.n_provided >= results.n_required ? 'PASS' : 'FAIL' },
                          { label: 'Fv,Rd', util: results.Fv_Rd.toFixed(1), status: 'PASS' },
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
                  title="Timber Connection — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <TimberConnection3D />
                    </Interactive3DDiagram>
                  )}
                />
              </div>

              {/* Quick Reference */}
              <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white font-semibold">EC5 Quick Reference</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min edge distance:</span>
                    <span className="text-blue-400">3d - 4d</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min end distance:</span>
                    <span className="text-blue-400">4d - 7d</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min spacing:</span>
                    <span className="text-blue-400">4d - 5d</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">γM connections:</span>
                    <span className="text-blue-400">1.3</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Results Display */}
            {results && (
              <>
                <div className="lg:col-span-2 space-y-4">
                  {/* Status Card */}
                  <Card
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 shadow-lg"
                    style={{
                      borderColor: results.ratingColor,
                      boxShadow: `0 10px 15px -3px ${results.ratingColor}20`,
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Connection Check</p>
                          <p className="text-3xl font-bold" style={{ color: results.ratingColor }}>
                            {results.rating}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            Utilisation: {results.utilisation.toFixed(1)}%
                          </p>
                        </div>
                        <div
                          className={cn(
                            'w-20 h-20 rounded-full flex items-center justify-center',
                            results.status === 'PASS' ? 'bg-green-500/20' : 'bg-red-500/20',
                          )}
                        >
                          {results.status === 'PASS' ? (
                            <FiCheck className="w-10 h-10 text-green-400" />
                          ) : (
                            <FiAlertTriangle className="w-10 h-10 text-red-400" />
                          )}
                        </div>
                      </div>

                      {/* Utilisation Bar */}
                      <div className="mt-4">
                        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(results.utilisation, 100)}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: results.ratingColor,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fastener Capacity */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiGrid className="w-6 h-6 text-blue-400" />
                        </div>
                        Fastener Capacity (per fastener)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem
                        label="Characteristic Lateral Capacity (Fv,Rk)"
                        value={results.Fv_Rk / 1000}
                        unit="kN"
                      />
                      <ResultItem
                        label="Design Lateral Capacity (Fv,Rd)"
                        value={results.Fv_Rd}
                        unit="kN"
                        highlight
                      />
                      <ResultItem
                        label="Characteristic Axial Capacity (Fax,Rk)"
                        value={results.Fax_Rk / 1000}
                        unit="kN"
                      />
                      <ResultItem
                        label="Design Axial Capacity (Fax,Rd)"
                        value={results.Fax_Rd}
                        unit="kN"
                      />
                      <ResultItem label="kmod Factor" value={results.kmod} />
                      <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400">
                        Critical: {results.failure_mode}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Number of Fasteners */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiTarget className="w-6 h-6 text-blue-400" />
                        </div>
                        Number of Fasteners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem label="Fasteners Required" value={results.n_required} highlight />
                      <ResultItem label="Fasteners Provided" value={results.n_provided} />
                      <ResultItem label="Effective Number (nef)" value={results.n_eff} />
                      <ResultItem
                        label="Group Capacity"
                        value={results.group_capacity}
                        unit="kN"
                        color={results.ratingColor}
                      />
                    </CardContent>
                  </Card>

                  {/* Spacing Requirements */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiLayers className="w-6 h-6 text-blue-400" />
                        </div>
                        Minimum Spacing Requirements (EC5 Table 8.4)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem label="a1 (parallel to grain)" value={results.a1_min} unit="mm" />
                      <ResultItem
                        label="a2 (perpendicular to grain)"
                        value={results.a2_min}
                        unit="mm"
                      />
                      <ResultItem label="a3,t (loaded end)" value={results.a3_min} unit="mm" />
                      <ResultItem label="a4,t (loaded edge)" value={results.a4_min} unit="mm" />
                    </CardContent>
                  </Card>

                  {/* Warnings */}
                  {results.warnings.length > 0 && (
                    <Card className="bg-yellow-500/10 border-yellow-500/30">
                      <CardHeader>
                        <CardTitle className="text-yellow-400 flex items-center gap-2">
                          <FiAlertTriangle />
                          Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {results.warnings.map((warning, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-yellow-300 text-sm"
                            >
                              <FiAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  <Card className="bg-emerald-500/5 border-emerald-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-emerald-400">
                        <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                          <FiCheck className="w-2.5 h-2.5 text-white" />
                        </div>
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1.5">
                      {results.status === 'PASS' ? (
                        <div className="flex items-start gap-2 text-emerald-300">
                          <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                          <span>Connection capacity is adequate for the design load</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-amber-300">
                          <FiAlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                          <span>
                            Connection capacity insufficient — increase fastener size or quantity
                          </span>
                        </div>
                      )}
                      {results.utilisation > 85 && results.utilisation <= 100 && (
                        <div className="flex items-start gap-2 text-emerald-300">
                          <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                          <span>
                            Utilisation is high — consider adding fasteners for robustness
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-emerald-300">
                        <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                        <span>Failure mode: {results.failure_mode}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Visualization Column */}
                <div className="space-y-4">
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400 sticky top-8">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiLayers className="w-6 h-6 text-blue-400" />
                        </div>
                        Connection Detail
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                        <TimberConnection3D />
                      </Interactive3DDiagram>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-700 rounded"></div>
                          <span className="text-gray-400">Timber member 1</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-700 rounded"></div>
                          <span className="text-gray-400">Timber member 2</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-zinc-500"></div>
                          <span className="text-gray-400">Fasteners</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5 bg-red-500"></div>
                          <span className="text-gray-400">Applied load</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
      </div>
  );
};

export default TimberConnection;
