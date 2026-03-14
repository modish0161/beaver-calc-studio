// =============================================================================
// Spreader Beam Design Calculator — Premium Edition
// BS EN 13155 / EN 1993-1-1 Lifting Beam Design & Verification
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiAnchor,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMaximize2,
  FiMinimize2,
  FiSliders,
  FiTarget,
  FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { buildSpreaderBeamReport } from '../../lib/pdf/builders/spreaderBeamBuilder';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SpreaderBeam3D from '../../components/3d/scenes/SpreaderBeam3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { STEEL_GRADES } from '../../data/materialGrades';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Geometry
  beam_length: string;
  lift_point_spacing: string;
  load_point_spacing: string;
  load_offset: string;
  // Loading
  total_swl: string;
  load_type: string;
  num_pick_points: string;
  dynamic_factor: string;
  sling_angle: string;
  // Section
  beam_section: string;
  steel_grade: string;
  custom_depth: string;
  custom_Ix: string;
  custom_Zx: string;
  custom_Sx: string;
  custom_mass: string;
  // Connection
  lug_type: string;
  lug_thickness: string;
  hole_diameter: string;
  // Factors
  safety_factor: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Loading
  swl_factored: number;
  load_per_lug: number;
  sling_tension: number;
  horizontal_force: number;
  vertical_reaction: number;
  // Bending
  max_moment: number;
  moment_capacity: number;
  bending_util: number;
  bending_status: string;
  // Shear
  max_shear: number;
  shear_capacity: number;
  shear_util: number;
  shear_status: string;
  // LTB Check
  lambda_lt: number;
  chi_lt: number;
  ltb_capacity: number;
  ltb_util: number;
  ltb_status: string;
  // Deflection
  max_deflection: number;
  deflection_limit: number;
  deflection_util: number;
  deflection_status: string;
  // Lug Check
  lug_bearing_stress: number;
  lug_allowable: number;
  lug_util: number;
  lug_status: string;
  // Self-weight
  beam_weight: number;
  total_lifted: number;
  // Overall
  critical_check: string;
  status: string;
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const BEAM_SECTIONS: Record<
  string,
  {
    name: string;
    depth: number;
    width: number;
    tw: number;
    tf: number;
    mass: number;
    A: number;
    Ix: number;
    Zx: number;
    Sx: number;
    Iy: number;
    It: number;
    Iw: number;
  }
> = {
  UC_152x152x23: {
    name: 'UC 152×152×23',
    depth: 152.4,
    width: 152.2,
    tw: 5.8,
    tf: 6.8,
    mass: 23.0,
    A: 2920,
    Ix: 1250 * 10000,
    Zx: 164 * 1000,
    Sx: 182 * 1000,
    Iy: 400 * 10000,
    It: 4.67 * 10000,
    Iw: 0.0211 * 1e12,
  },
  UC_203x203x46: {
    name: 'UC 203×203×46',
    depth: 203.2,
    width: 203.6,
    tw: 7.2,
    tf: 11.0,
    mass: 46.1,
    A: 5870,
    Ix: 4570 * 10000,
    Zx: 450 * 1000,
    Sx: 497 * 1000,
    Iy: 1540 * 10000,
    It: 22.2 * 10000,
    Iw: 0.143 * 1e12,
  },
  UC_254x254x73: {
    name: 'UC 254×254×73',
    depth: 254.1,
    width: 254.6,
    tw: 8.6,
    tf: 14.2,
    mass: 73.1,
    A: 9310,
    Ix: 11400 * 10000,
    Zx: 898 * 1000,
    Sx: 992 * 1000,
    Iy: 3910 * 10000,
    It: 57.6 * 10000,
    Iw: 0.569 * 1e12,
  },
  UC_305x305x97: {
    name: 'UC 305×305×97',
    depth: 307.9,
    width: 305.3,
    tw: 9.9,
    tf: 15.4,
    mass: 96.9,
    A: 12300,
    Ix: 22200 * 10000,
    Zx: 1440 * 1000,
    Sx: 1590 * 1000,
    Iy: 7310 * 10000,
    It: 91.1 * 10000,
    Iw: 1.57 * 1e12,
  },
  UB_305x165x40: {
    name: 'UB 305×165×40',
    depth: 303.4,
    width: 165.0,
    tw: 6.0,
    tf: 10.2,
    mass: 40.3,
    A: 5130,
    Ix: 8500 * 10000,
    Zx: 561 * 1000,
    Sx: 623 * 1000,
    Iy: 763 * 10000,
    It: 14.9 * 10000,
    Iw: 0.163 * 1e12,
  },
  UB_406x178x54: {
    name: 'UB 406×178×54',
    depth: 402.6,
    width: 177.7,
    tw: 7.7,
    tf: 10.9,
    mass: 54.1,
    A: 6900,
    Ix: 18700 * 10000,
    Zx: 930 * 1000,
    Sx: 1050 * 1000,
    Iy: 1020 * 10000,
    It: 25.9 * 10000,
    Iw: 0.383 * 1e12,
  },
  UB_533x210x82: {
    name: 'UB 533×210×82',
    depth: 528.3,
    width: 208.8,
    tw: 9.6,
    tf: 13.2,
    mass: 82.2,
    A: 10500,
    Ix: 47500 * 10000,
    Zx: 1800 * 1000,
    Sx: 2060 * 1000,
    Iy: 2000 * 10000,
    It: 51.5 * 10000,
    Iw: 1.3 * 1e12,
  },
  Custom: {
    name: 'Custom Section',
    depth: 300,
    width: 300,
    tw: 10,
    tf: 10,
    mass: 50,
    A: 6000,
    Ix: 100000000,
    Zx: 1000000,
    Sx: 1100000,
    Iy: 50000000,
    It: 100000,
    Iw: 0.1e12,
  },
};

const LUG_TYPES: Record<string, { name: string; description: string }> = {
  welded_plate: { name: 'Welded Plate Lug', description: 'CJP weld connection' },
  bolted_cleat: { name: 'Bolted Cleat', description: 'Mechanically fastened' },
  shackle_hole: { name: 'Pin Through Web', description: 'Pin/shackle hole' },
};

const LOAD_TYPES: Record<string, { name: string }> = {
  single_point: { name: 'Single Point Load (Center)' },
  two_point: { name: 'Two Point Loads (Symmetric)' },
  udl: { name: 'Uniformly Distributed Load' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  light_lift: {
    name: 'Light Lift (50 kN)',
    form: {
      beam_length: '3.0',
      lift_point_spacing: '2.5',
      load_point_spacing: '1.5',
      total_swl: '50',
      dynamic_factor: '1.25',
      sling_angle: '60',
      beam_section: 'UC_152x152x23',
      steel_grade: 'S275',
      safety_factor: '2.0',
    },
  },
  medium_lift: {
    name: 'Medium Lift (100 kN)',
    form: {
      beam_length: '4.0',
      lift_point_spacing: '3.5',
      load_point_spacing: '2.0',
      total_swl: '100',
      dynamic_factor: '1.25',
      sling_angle: '60',
      beam_section: 'UC_203x203x46',
      steel_grade: 'S275',
      safety_factor: '2.0',
    },
  },
  heavy_lift: {
    name: 'Heavy Lift (200 kN)',
    form: {
      beam_length: '6.0',
      lift_point_spacing: '5.0',
      load_point_spacing: '3.0',
      total_swl: '200',
      dynamic_factor: '1.25',
      sling_angle: '60',
      beam_section: 'UC_254x254x73',
      steel_grade: 'S355',
      safety_factor: '2.0',
    },
  },
};

const SpreaderBeam: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'calculations'>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    loading: true,
    section: true,
    connection: true,
  });

  const [form, setForm] = useState<FormData>({
    beam_length: '4.0',
    lift_point_spacing: '3.5',
    load_point_spacing: '2.0',
    load_offset: '0',
    total_swl: '100',
    load_type: 'two_point',
    num_pick_points: '2',
    dynamic_factor: '1.25',
    sling_angle: '60',
    beam_section: 'UC_203x203x46',
    steel_grade: 'S275',
    custom_depth: '200',
    custom_Ix: '4000',
    custom_Zx: '400',
    custom_Sx: '450',
    custom_mass: '45',
    lug_type: 'welded_plate',
    lug_thickness: '20',
    hole_diameter: '35',
    safety_factor: '2.0',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'beam_length', label: 'Beam Length' },
  { key: 'lift_point_spacing', label: 'Lift Point Spacing' },
  { key: 'load_point_spacing', label: 'Load Point Spacing' },
  { key: 'load_offset', label: 'Load Offset', allowZero: true },
  { key: 'total_swl', label: 'Total Swl' },
  { key: 'num_pick_points', label: 'Num Pick Points' },
  { key: 'dynamic_factor', label: 'Dynamic Factor' },
  { key: 'sling_angle', label: 'Sling Angle' },
  { key: 'custom_depth', label: 'Custom Depth' },
  { key: 'custom_Ix', label: 'Custom Ix' },
  { key: 'custom_Zx', label: 'Custom Zx' },
  { key: 'custom_Sx', label: 'Custom Sx' },
  { key: 'custom_mass', label: 'Custom Mass' },
  { key: 'lug_thickness', label: 'Lug Thickness' },
  { key: 'hole_diameter', label: 'Hole Diameter' },
  { key: 'safety_factor', label: 'Safety Factor' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'beam_length', label: 'Beam_length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'lift_point_spacing', label: 'Lift_point_spacing', min: 0, max: 100, step: 1, unit: '' },
    { key: 'load_point_spacing', label: 'Load_point_spacing', min: 0, max: 100, step: 1, unit: '' },
    { key: 'load_offset', label: 'Load_offset', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // =============================================================================
  // CALCULATION ENGINE
  // =============================================================================

  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);

    setTimeout(() => {
      try {
        const L = parseFloat(form.beam_length);
        const Ls = parseFloat(form.lift_point_spacing);
        const Lp = parseFloat(form.load_point_spacing);
        const SWL = parseFloat(form.total_swl);
        const DF = parseFloat(form.dynamic_factor);
        const SF = parseFloat(form.safety_factor);
        const angle = parseFloat(form.sling_angle);
        const angleRad = (angle * Math.PI) / 180;

        // Factored Load
        const Ffactored = SWL * DF * SF;

        // Section Properties
        const sec =
          form.beam_section === 'Custom'
            ? {
                ...BEAM_SECTIONS.Custom,
                depth: parseFloat(form.custom_depth),
                Ix: parseFloat(form.custom_Ix) * 10000,
                Zx: parseFloat(form.custom_Zx) * 1000,
                Sx: parseFloat(form.custom_Sx) * 1000,
                mass: parseFloat(form.custom_mass),
              }
            : BEAM_SECTIONS[form.beam_section];

        const fy = STEEL_GRADES[form.steel_grade].fy;
        const E = 210000;
        const G = 80770;

        // Self Weight
        const beamSelfWeight = (sec.mass * 9.81 * L) / 1000; // kN
        const totalLifted = Ffactored + beamSelfWeight;

        // Forces per Lug
        const verticalReaction = totalLifted / 2;
        const slingTension = verticalReaction / Math.sin(angleRad);
        const horizontalForce = verticalReaction / Math.tan(angleRad);

        // Bending Moment Analysis (Worst Case)
        let maxMoment = 0;
        let maxShear = 0;

        if (form.load_type === 'two_point') {
          // Load points at symmetrical distance
          const a = (Ls - Lp) / 2;
          maxMoment = verticalReaction * a;
          maxShear = verticalReaction;
        } else if (form.load_type === 'single_point') {
          maxMoment = (verticalReaction * Ls) / 2;
          maxShear = verticalReaction;
        } else {
          // UDL approximation
          maxMoment = (totalLifted * Ls) / 8;
          maxShear = verticalReaction;
        }

        // Bending Check
        const momentCapacity = (sec.Sx * fy) / 1.0 / 1e6; // kNm
        const bendingUtil = maxMoment / momentCapacity;

        // Shear Check
        const shearArea = sec.depth * sec.tw;
        const shearCapacity = (shearArea * fy) / Math.sqrt(3) / 1.0 / 1000; // kN
        const shearUtil = maxShear / shearCapacity;

        // LTB Check (EC3-1-1)
        const Lcr = Ls * 1000; // Unrestrained length in mm
        const C1 = 1.12; // Approximation for uniform bending
        const Mcr =
          (((C1 * Math.PI ** 2 * E * sec.Iy) / Lcr ** 2) *
            Math.sqrt(sec.Iw / sec.Iy + (Lcr ** 2 * G * sec.It) / (Math.PI ** 2 * E * sec.Iy))) /
          1e6;
        const lambda_lt = Math.sqrt(momentCapacity / Mcr);
        const alpha_lt = 0.34; // Imperfection factor
        const lambda_lt_0 = 0.4;
        const beta = 0.75;
        const phi_lt = 0.5 * (1 + alpha_lt * (lambda_lt - lambda_lt_0) + beta * lambda_lt ** 2);
        const chi_lt = Math.min(1.0, 1 / (phi_lt + Math.sqrt(phi_lt ** 2 - beta * lambda_lt ** 2)));
        const ltbCapacity = chi_lt * momentCapacity;
        const ltbUtil = maxMoment / ltbCapacity;

        // Deflection Check
        const maxDeflection = (5 * totalLifted * (Ls * 1000) ** 3) / (384 * E * sec.Ix);
        const deflectionLimit = (Ls * 1000) / 250;
        const deflectionUtil = maxDeflection / deflectionLimit;

        // Lug Bearing
        const lugThk = parseFloat(form.lug_thickness);
        const holeD = parseFloat(form.hole_diameter);
        const bearingStress = (slingTension * 1000) / (holeD * lugThk);
        const lugAllowable = (1.5 * fy) / 1.25; // Standard allowable bearing per BS EN 13155
        const lugUtil = bearingStress / lugAllowable;

        // Critical Check Determination
        const utils = [
          { name: 'Bending', val: bendingUtil },
          { name: 'Shear', val: shearUtil },
          { name: 'LTB', val: ltbUtil },
          { name: 'Deflection', val: deflectionUtil },
          { name: 'Lug Bearing', val: lugUtil },
        ];
        const critical = utils.reduce((prev, curr) => (curr.val > prev.val ? curr : prev));

        // Generate warnings
        const w: string[] = [];
        if (bendingUtil > 1.0)
          w.push(`Bending FAIL — utilisation ${(bendingUtil * 100).toFixed(0)}% exceeds capacity`);
        if (shearUtil > 1.0)
          w.push(`Shear FAIL — utilisation ${(shearUtil * 100).toFixed(0)}% exceeds capacity`);
        if (ltbUtil > 1.0)
          w.push(`LTB FAIL — utilisation ${(ltbUtil * 100).toFixed(0)}% exceeds capacity`);
        if (deflectionUtil > 1.0) w.push(`Deflection FAIL — exceeds L/250 limit`);
        if (lugUtil > 1.0) w.push(`Lug bearing FAIL — stress exceeds EN 13155 allowable`);
        if (angle < 30)
          w.push(`Sling angle ${angle}° below 30° minimum — excessive horizontal forces`);
        if (angle < 45)
          w.push(`Sling angle ${angle}° below recommended 45° — high horizontal load on lugs`);
        if (beamSelfWeight / Ffactored > 0.15)
          w.push(
            `Beam self-weight is ${((beamSelfWeight / Ffactored) * 100).toFixed(0)}% of factored load — consider lighter section`,
          );
        setWarnings(w);

        setResults({
          swl_factored: Ffactored,
          load_per_lug: verticalReaction,
          sling_tension: slingTension,
          horizontal_force: horizontalForce,
          vertical_reaction: verticalReaction,
          max_moment: maxMoment,
          moment_capacity: momentCapacity,
          bending_util: bendingUtil,
          bending_status: bendingUtil <= 1.0 ? 'PASS' : 'FAIL',
          max_shear: maxShear,
          shear_capacity: shearCapacity,
          shear_util: shearUtil,
          shear_status: shearUtil <= 1.0 ? 'PASS' : 'FAIL',
          lambda_lt: lambda_lt,
          chi_lt: chi_lt,
          ltb_capacity: ltbCapacity,
          ltb_util: ltbUtil,
          ltb_status: ltbUtil <= 1.0 ? 'PASS' : 'FAIL',
          max_deflection: maxDeflection,
          deflection_limit: deflectionLimit,
          deflection_util: deflectionUtil,
          deflection_status: deflectionUtil <= 1.0 ? 'PASS' : 'FAIL',
          lug_bearing_stress: bearingStress,
          lug_allowable: lugAllowable,
          lug_util: lugUtil,
          lug_status: lugUtil <= 1.0 ? 'PASS' : 'FAIL',
          beam_weight: beamSelfWeight,
          total_lifted: totalLifted,
          critical_check: critical.name,
          status: critical.val <= 1.0 ? 'PASS' : 'FAIL',
          rating:
            critical.val < 0.7
              ? 'Under-utilised'
              : critical.val <= 0.9
                ? 'Optimal'
                : critical.val <= 1.0
                  ? 'Tight'
                  : 'CRITICAL',
          ratingColor:
            critical.val < 0.7
              ? '#10b981'
              : critical.val < 0.9
                ? '#3b82f6'
                : critical.val <= 1.0
                  ? '#f59e0b'
                  : '#ef4444',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsCalculating(false);
      }
    }, 600);
  }, [form]);

  useEffect(() => {
    runCalculation();
  }, [runCalculation]);

  // =============================================================================
  // CANVAS VISUALIZATION
  // =============================================================================

  // =============================================================================
  // UI HELPERS
  // =============================================================================

  const updateForm = (field: keyof FormData, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (id: string) => setExpandedSections((p) => ({ ...p, [id]: !p[id] }));

  const handleExportPDF = async () => {
    if (!results) return;
    const report = buildSpreaderBeamReport(form, results, warnings, {
      projectName: form.projectName || 'Lifting Project Alpha',
      clientName: 'Engineering Compliance Ltd',
      preparedBy: 'BeaverCalc Studio',
    });
    // @ts-ignore
    await generatePremiumPDF(report);
  };

  const handleExportDOCX = async () => {
    if (!results) return;
    generateDOCX({
      title: 'Spreader Beam Design',
      subtitle: 'EN 1993-1-1 Eurocode 3 Structural Analysis',
      projectInfo: [
        { label: 'Project', value: form.projectName || 'Lifting Project' },
        { label: 'Reference', value: form.reference || '-' },
        { label: 'Client', value: 'Engineering Compliance Ltd' },
      ],
      inputs: [
        { label: 'Beam Length', value: form.beam_length, unit: 'm' },
        { label: 'Lift Point Spacing', value: form.lift_point_spacing, unit: 'm' },
        { label: 'Total SWL', value: form.total_swl, unit: 'kN' },
        { label: 'Dynamic Factor', value: form.dynamic_factor },
        { label: 'Sling Angle', value: form.sling_angle, unit: '\u00b0' },
        { label: 'Beam Section', value: form.beam_section },
      ],
      sections: [
        {
          title: 'Beam Analysis Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Max Bending Moment', results.max_moment?.toFixed(1) || '-', 'kNm'],
            ['Max Shear Force', results.max_shear?.toFixed(1) || '-', 'kN'],
            ['Bending Utilisation', `${(results.bending_util * 100)?.toFixed(1) || '-'}`, '%'],
            ['Shear Utilisation', `${(results.shear_util * 100)?.toFixed(1) || '-'}`, '%'],
            ['Deflection', results.max_deflection?.toFixed(1) || '-', 'mm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Bending Check',
          capacity: 'Adequate',
          utilisation: `${(results.bending_util * 100)?.toFixed(1) || '-'}%`,
          status: (results.bending_util <= 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear Check',
          capacity: 'Adequate',
          utilisation: `${(results.shear_util * 100)?.toFixed(1) || '-'}%`,
          status: (results.shear_util <= 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Spreader Beam Design',
    });
  };

  const SectionWrapper: React.FC<{
    id: string;
    title: string;
    icon: any;
    color?: string;
    children: any;
  }> = ({ id, title, icon, children }) => (
    <Card
      variant="glass"
      className={cn(
        'border-neon-cyan/30 shadow-2xl overflow-hidden mb-4 transition-all duration-300',
        expandedSections[id] ? 'ring-1 ring-neon-cyan/20' : '',
      )}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full p-4 flex items-center justify-between text-white hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <motion.div
            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            {icon}
          </motion.div>
          <span className="text-2xl text-white font-bold">{title}</span>
        </div>
        <motion.div animate={{ rotate: expandedSections[id] ? 180 : 0 }}>
          <FiChevronDown className="text-gray-500" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expandedSections[id] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-700/50"
          >
            <CardContent className="p-6 space-y-4">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );

  const InputField: React.FC<{
    label: string;
    field: keyof FormData;
    unit?: string;
    tooltip?: string;
    type?: string;
  }> = ({ label, field, unit, tooltip, type = 'number' }) => (
    <div className="space-y-2 flex-1 min-w-[120px]">
      <label className="flex items-center justify-between text-sm font-semibold text-gray-200">
        <div className="flex items-center gap-2">
          <ExplainableLabel
            label={label}
            field={field}
            className="text-sm font-semibold text-gray-200"
          />
          {tooltip && <FiInfo className="text-xs text-gray-500 cursor-help" title={tooltip} />}
        </div>
        {unit && <span className="text-neon-cyan text-xs">{unit}</span>}
      </label>
      <div className="relative group">
        <input
          title={label}
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300 hover:bg-gray-900/70"
        />
      </div>
    </div>
  );

  const UtilisationBar: React.FC<{ label: string; value: number; status: string }> = ({
    label,
    value,
    status,
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          {label}
        </span>
        <span className={cn('text-xs font-black', value > 1 ? 'text-red-400' : 'text-gray-300')}>
          {(value * 100).toFixed(1)}% {status === 'FAIL' ? '⚠️' : '✅'}
        </span>
      </div>
      <div className="h-1.5 bg-gray-950 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value * 100, 100)}%` }}
          className={cn(
            'h-full rounded-full transition-all duration-700',
            value > 1
              ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              : value > 0.9
                ? 'bg-amber-500'
                : 'bg-emerald-500',
          )}
        />
      </div>
    </div>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <Button
              onClick={runCalculation}
              className="bg-gray-800 hover:bg-gray-700 text-white font-bold border border-gray-700 px-6"
            >
              {isCalculating ? (
                <FiActivity className="animate-spin" />
              ) : (
                <FiZap className="mr-2 text-neon-cyan" />
              )}{' '}
              Recalculate
            </Button>
            <Button
              onClick={handleExportPDF}
              className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30 px-6"
            >
              <FiDownload className="mr-2" /> PDF
            </Button>
            <Button
              onClick={handleExportDOCX}
              className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 px-6"
            >
              <FiDownload className="mr-2" /> DOCX
            </Button>
            <SaveRunButton
              calculatorKey="spreader-beam"
              inputs={form as unknown as Record<string, string | number>}
              results={results}
            />
          </div>

          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Spreader Beam
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BS 7121 spreader beam design &amp; checks
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-900/50 p-1 rounded-2xl border border-gray-800/50 mb-8">
          <div className="flex gap-1">
            {(['input', 'results', 'calculations'] as const).map((tab) => (
              <Button
                key={tab}
                variant="ghost"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300',
                  activeTab === tab
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-xl'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50',
                )}
              >
                {tab}
              </Button>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Structural Engine Online
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Workspace */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
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
                  <SectionWrapper
                    id="geometry"
                    title="Symmetric Geometry"
                    icon={<FiGrid className="text-neon-cyan" size={24} />}
                  >
                    <div className="grid md:grid-cols-4 gap-6">
                      <InputField
                        label="Beam Length"
                        field="beam_length"
                        unit="m"
                        tooltip="Total length including overhangs"
                      />
                      <InputField
                        label="Lift Points"
                        field="lift_point_spacing"
                        unit="m"
                        tooltip="Distance between upper lugs"
                      />
                      <InputField
                        label="Load Points"
                        field="load_point_spacing"
                        unit="m"
                        tooltip="Distance between lower load hooks"
                      />
                      <InputField
                        label="Sling Angle"
                        field="sling_angle"
                        unit="°"
                        tooltip="Angle from horizontal plane"
                      />
                    </div>
                  </SectionWrapper>

                  <SectionWrapper
                    id="loading"
                    title="Design Loads"
                    icon={<FiLayers className="text-neon-cyan" size={24} />}
                  >
                    <div className="grid md:grid-cols-3 gap-6">
                      <InputField label="Total SWL" field="total_swl" unit="kN" />
                      <div className="space-y-2 pt-1">
                        <label className="text-sm font-semibold text-gray-200">
                          Load Configuration
                        </label>
                        <select
                          title="Load Type"
                          value={form.load_type}
                          onChange={(e) => updateForm('load_type', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                        >
                          {Object.entries(LOAD_TYPES).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Impact Factor" field="dynamic_factor" />
                        <InputField label="Safety Factor" field="safety_factor" />
                      </div>
                    </div>
                  </SectionWrapper>

                  <SectionWrapper
                    id="section"
                    title="Member Properties"
                    icon={<FiMaximize2 className="text-neon-cyan" size={24} />}
                  >
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-2 pt-1">
                        <label className="text-sm font-semibold text-gray-200">
                          Section Selection
                        </label>
                        <select
                          title="Section"
                          value={form.beam_section}
                          onChange={(e) => updateForm('beam_section', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                        >
                          {Object.entries(BEAM_SECTIONS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 pt-1">
                        <label className="text-sm font-semibold text-gray-200">Steel Grade</label>
                        <select
                          title="Grade"
                          value={form.steel_grade}
                          onChange={(e) => updateForm('steel_grade', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                        >
                          {Object.keys(STEEL_GRADES).map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {form.beam_section === 'Custom' && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        className="grid md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-800/50"
                      >
                        <InputField label="Depth" field="custom_depth" unit="mm" />
                        <InputField label="Ix" field="custom_Ix" unit="cm4" />
                        <InputField label="Sx" field="custom_Sx" unit="cm3" />
                        <InputField label="Mass" field="custom_mass" unit="kg/m" />
                      </motion.div>
                    )}
                  </SectionWrapper>

                  <SectionWrapper
                    id="connection"
                    title="Connection Details"
                    icon={<FiAnchor className="text-neon-cyan" size={24} />}
                  >
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-2 pt-1">
                        <label className="text-sm font-semibold text-gray-200">Lug Interface</label>
                        <select
                          title="Lug"
                          value={form.lug_type}
                          onChange={(e) => updateForm('lug_type', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                        >
                          {Object.entries(LUG_TYPES).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField label="Plate Thickness" field="lug_thickness" unit="mm" />
                      <InputField label="Pin/Hole Dia" field="hole_diameter" unit="mm" />
                    </div>
                  </SectionWrapper>

                  {/* Calculate Button */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center pt-4"
                  >
                    <Button
                      onClick={runCalculation}
                      disabled={isCalculating}
                      className="px-16 py-8 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl"
                    >
                      {isCalculating ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                          ANALYSING...
                        </div>
                      ) : (
                        'RUN FULL ANALYSIS'
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'results' && results && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Border-l-4 Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      {
                        label: 'Bending',
                        util: results.bending_util,
                        status: results.bending_status,
                      },
                      { label: 'Shear', util: results.shear_util, status: results.shear_status },
                      { label: 'LTB', util: results.ltb_util, status: results.ltb_status },
                      {
                        label: 'Deflection',
                        util: results.deflection_util,
                        status: results.deflection_status,
                      },
                      { label: 'Lug Bearing', util: results.lug_util, status: results.lug_status },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className={cn(
                          'border-l-4 bg-gray-900/50 rounded-xl p-4',
                          c.status === 'PASS' ? 'border-emerald-500' : 'border-red-500',
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {c.status === 'PASS' ? (
                            <FiCheck className="text-emerald-400" size={14} />
                          ) : (
                            <FiAlertTriangle className="text-red-400" size={14} />
                          )}
                          <span className="text-xs font-semibold text-gray-400">{c.label}</span>
                        </div>
                        <span
                          className={cn(
                            'text-lg font-black',
                            c.status === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {(c.util * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Summary Status Card */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl overflow-hidden">
                    <div className="flex flex-col md:flex-row items-stretch border border-gray-800 rounded-xl overflow-hidden">
                      <div
                        className="p-8 flex items-center justify-center bg-gray-900/40"
                        style={{ color: results.ratingColor }}
                      >
                        {results.status === 'PASS' ? (
                          <FiCheck size={48} />
                        ) : (
                          <FiAlertTriangle size={48} />
                        )}
                      </div>
                      <div className="flex-1 p-8 bg-gray-900/60 border-l border-gray-800">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                          Structural Status
                        </div>
                        <div className="text-3xl font-black text-white italic transition-all duration-300">
                          Section {results.status === 'PASS' ? 'COMPLIANT' : 'FAILURE'}
                        </div>
                        <p className="text-gray-400 mt-2 font-medium">
                          Design is {results.rating} with {results.critical_check} as the critical
                          limit state.
                        </p>
                      </div>
                      <div className="p-8 bg-gray-950/60 border-l border-gray-800 text-center flex flex-col justify-center min-w-[200px]">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                          Max Utilisation
                        </div>
                        <div
                          className="text-4xl font-black italic tracking-tighter"
                          style={{ color: results.ratingColor }}
                        >
                          {Math.max(
                            results.bending_util,
                            results.shear_util,
                            results.ltb_util,
                            results.deflection_util,
                            results.lug_util,
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Member Checks */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiTarget className="text-neon-cyan" size={24} />
                        </motion.div>
                        <h3 className="text-2xl text-white font-bold">Beam Integrity Checks</h3>
                      </div>
                      <div className="space-y-4">
                        <UtilisationBar
                          label="Bending Moment (My,Ed)"
                          value={results.bending_util}
                          status={results.bending_status}
                        />
                        <UtilisationBar
                          label="Shear Force (Vz,Ed)"
                          value={results.shear_util}
                          status={results.shear_status}
                        />
                        <UtilisationBar
                          label="Lateral Torsional Buckling (LTB)"
                          value={results.ltb_util}
                          status={results.ltb_status}
                        />
                        <UtilisationBar
                          label="Deflection (L/250)"
                          value={results.deflection_util}
                          status={results.deflection_status}
                        />
                      </div>
                    </Card>

                    {/* Connection & Load Checks */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiAnchor className="text-neon-cyan" size={24} />
                        </motion.div>
                        <h3 className="text-2xl text-white font-bold">Connection & Rigging</h3>
                      </div>
                      <div className="space-y-4">
                        <UtilisationBar
                          label="Lug Bearing Stress"
                          value={results.lug_util}
                          status={results.lug_status}
                        />
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800/50">
                            <span className="text-[9px] font-black text-gray-600 uppercase block mb-1">
                              Sling Tension
                            </span>
                            <span className="text-xl font-black text-white">
                              {results.sling_tension.toFixed(2)} kN
                            </span>
                          </div>
                          <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800/50">
                            <span className="text-[9px] font-black text-gray-600 uppercase block mb-1">
                              Axial Force
                            </span>
                            <span className="text-xl font-black text-white">
                              {results.horizontal_force.toFixed(2)} kN
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <Card variant="glass" className="border-amber-500/30 shadow-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
                          <FiAlertTriangle className="text-white text-sm" />
                        </div>
                        <h3 className="text-xs font-bold text-amber-400/80 uppercase tracking-widest">
                          Warnings
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {warnings.map((w, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                          >
                            <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0 w-4 h-4" />
                            <span className="text-sm text-gray-300">{w}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Recommendations */}
                  <Card variant="glass" className="border-emerald-500/30 shadow-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                        <FiCheck className="text-white text-sm" />
                      </div>
                      <h3 className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest">
                        Design Recommendations
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {results.ltb_util > 0.8 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">LTB Sensitivity</div>
                            <div className="text-xs text-gray-400">
                              LTB utilisation at {(results.ltb_util * 100).toFixed(0)}% — consider
                              UC section or intermediate restraint
                            </div>
                          </div>
                        </div>
                      )}
                      {results.deflection_util > 0.7 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">Deflection</div>
                            <div className="text-xs text-gray-400">
                              Deflection at {(results.deflection_util * 100).toFixed(0)}% of L/250
                              limit — increase Ix or reduce span
                            </div>
                          </div>
                        </div>
                      )}
                      {results.lug_util > 0.8 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                          <FiAnchor className="text-purple-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">Lug Connection</div>
                            <div className="text-xs text-gray-400">
                              Lug bearing at {(results.lug_util * 100).toFixed(0)}% — consider
                              thicker plate or larger pin diameter
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <FiCheck className="text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-white">Overall Rating</div>
                          <div className="text-xs text-gray-400">
                            Design is {results.rating} — critical check: {results.critical_check}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'calculations' && results && (
                <motion.div
                  key="calculations"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1"
                >
                  <Card
                    variant="glass"
                    className="border-neon-cyan/30 shadow-2xl p-8 font-mono text-sm overflow-x-auto"
                  >
                    <div className="space-y-8 max-w-2xl mx-auto">
                      <div className="space-y-3">
                        <h4 className="text-neon-cyan font-black border-b border-neon-cyan/20 pb-2 mb-4">
                          1.0 Bending Strength Check (EN 1993-1-1 CL 6.2.5)
                        </h4>
                        <div className="grid grid-cols-2 text-gray-400">
                          <span>Plastic Moment Capacity (Mc,Rd):</span>
                          <span className="text-white text-right">
                            W_pl × f_y / γ_M0 = {results.moment_capacity.toFixed(2)} kNm
                          </span>
                        </div>
                        <div className="grid grid-cols-2 text-gray-400">
                          <span>Analysis Moment (M_y,Ed):</span>
                          <span className="text-white text-right">
                            {results.max_moment.toFixed(2)} kNm
                          </span>
                        </div>
                        <div className="text-right pt-2 border-t border-gray-800">
                          <span className="px-3 py-1 bg-neon-cyan/10 text-neon-cyan rounded-md text-[10px] font-black">
                            UTIL: {(results.bending_util * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-blue-400 font-black border-b border-blue-500/20 pb-2 mb-4">
                          2.0 Torsional Buckling Check (LTB) (EN 1993-1-1 CL 6.3.2)
                        </h4>
                        <div className="grid grid-cols-2 text-gray-400 italic">
                          <span>Elastic Critical Moment (M_cr):</span>
                          <span className="text-white text-right">Calculated via Annex G</span>
                        </div>
                        <div className="grid grid-cols-2 text-gray-400">
                          <span>Reduction Factor (χ_LT):</span>
                          <span className="text-white text-right">{results.chi_lt.toFixed(3)}</span>
                        </div>
                        <div className="grid grid-cols-2 text-gray-400 font-bold">
                          <span>LTB Capacity (M_b,Rd):</span>
                          <span className="text-white text-right">
                            χ_LT × W_pl × f_y / γ_M1 = {results.ltb_capacity.toFixed(2)} kNm
                          </span>
                        </div>
                        <div className="text-right pt-2 border-t border-gray-800">
                          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-md text-[10px] font-black">
                            UTIL: {(results.ltb_util * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-emerald-400 font-black border-b border-emerald-500/20 pb-2 mb-4">
                          3.0 Deflection Limits Analysis (L/250)
                        </h4>
                        <div className="grid grid-cols-2 text-gray-400">
                          <span>Max Midspan Deflection:</span>
                          <span className="text-white text-right">
                            {results.max_deflection.toFixed(2)} mm
                          </span>
                        </div>
                        <div className="grid grid-cols-2 text-gray-400">
                          <span>Allowable limit (L/250):</span>
                          <span className="text-white text-right">
                            {results.deflection_limit.toFixed(2)} mm
                          </span>
                        </div>
                        <div className="text-right pt-2 border-t border-gray-800">
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-[10px] font-black">
                            UTIL: {(results.deflection_util * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Visualization & Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-6">
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
                      <SpreaderBeam3D />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                      aria-label="Minimize preview"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      SPREADER BEAM — REAL-TIME PREVIEW
                    </div>
                  </div>
                  <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                    <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                      <FiSliders size={14} /> Live Parameters
                    </h3>
                    {whatIfSliders.map((s) => (
                      <div key={s.key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">{s.label}</span>
                          <span className="text-white font-mono">
                            {form[s.key as keyof FormData]} {s.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={parseFloat(String(form[s.key as keyof FormData])) || s.min}
                          onChange={(e) => updateForm(s.key as keyof FormData, e.target.value)}
                          title={s.label}
                          className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors"
                    >
                      Close Fullscreen
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Live Diagram */}
              <WhatIfPreview
                title="Spreader Beam — 3D Preview"
                sliders={whatIfSliders}
                form={form}
                updateForm={updateForm}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                onMaximize={() => setPreviewMaximized(true)}
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                    <SpreaderBeam3D />
                  </Interactive3DDiagram>
                )}
              />

              {/* Reference Table */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Beam Parameters</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs py-2 border-b border-gray-800/50">
                    <span className="text-gray-500">Service Life</span>
                    <span className="text-white font-bold">Lifting Service</span>
                  </div>
                  <div className="flex justify-between text-xs py-2 border-b border-gray-800/50">
                    <span className="text-gray-500">Yield Strength (fy)</span>
                    <span className="text-white font-bold">
                      {STEEL_GRADES[form.steel_grade].fy} MPa
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-2 border-b border-gray-800/50">
                    <span className="text-gray-500">Design Standard</span>
                    <span className="text-white font-bold uppercase">BS EN 13155</span>
                  </div>
                  <div className="flex justify-between text-xs py-2 overflow-hidden">
                    <span className="text-gray-500">Stability Limit</span>
                    <span className="text-neon-cyan font-bold uppercase">Buckling Critical</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-700/50">
                  <p className="text-[9px] text-gray-500 leading-relaxed italic">
                    The axial force component enhances buckling sensitivity; LTB is checked against
                    the unrestrained length between lifting points.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpreaderBeam;
