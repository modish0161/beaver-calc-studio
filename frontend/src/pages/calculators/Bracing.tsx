// =============================================================================
// Bracing Design Calculator — Premium Version
// EN 1993-1-1 (Eurocode 3) — Lateral Stability Bracing Systems
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiEye,
    FiInfo,
    FiLayers,
    FiSettings,
    FiTrello,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import { Bracing3D } from '../../components/3d/scenes';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { STEEL_GRADES, TIMBER_GRADES as _TIMBER_GRADES_LIB } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { downloadPDF } from '../../lib/pdf';
import { buildBracingReport } from '../../lib/pdf/builders/bracingBuilder';
import { validateNumericInputs } from '../../lib/validation';
// =============================================================================
// Types
// =============================================================================

interface BracingForm {
  // System Configuration
  bracing_type: string;
  material_type: string;
  steel_grade: string;
  timber_grade: string;
  cable_type: string;

  // Geometry
  span_length: string;
  system_height: string;
  number_of_panels: string;

  // Member Properties
  section_type: string;
  section_size: string;
  custom_area: string;
  custom_iyy: string;
  custom_radius: string;

  // Loading
  wind_load: string;
  seismic_factor: string;
  notional_load: string;
  temp_change: string;

  // Design Parameters
  load_factor_uls: string;
  safety_factor: string;
  slenderness_limit: string;

  // Project Info
  projectName: string;
  reference: string;
}

interface BracingResults {
  // Geometry
  panel_width: number;
  panel_height: number;
  bracing_angle: number;
  bracing_length: number;
  total_members: number;
  slenderness: number;

  // Loading
  wind_force: number;
  seismic_force: number;
  notional_force: number;
  thermal_force: number;
  total_lateral: number;
  force_per_member: number;
  factored_force: number;

  // Section Properties
  area: number;
  iyy: number;
  radius: number;
  fy: number;

  // Resistance Checks
  tension_capacity: number;
  tension_utilisation: number;
  compression_capacity: number;
  compression_utilisation: number;
  buckling_capacity: number;
  buckling_utilisation: number;
  chi: number;
  lambda_bar: number;

  // Connection
  connection_force: number;
  bolt_capacity: number;
  bolts_required: number;
  connection_utilisation: number;

  // System Performance
  system_stiffness: number;
  drift_limit: number;
  actual_drift: number;

  // Summary
  critical_check: string;
  max_utilisation: number;
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// Databases
// =============================================================================

const BRACING_TYPES: Record<string, { name: string; factor: number; members_per_panel: number }> = {
  cross: { name: 'Cross Bracing (X)', factor: 1.0, members_per_panel: 2 },
  single_diagonal: { name: 'Single Diagonal', factor: 1.0, members_per_panel: 1 },
  k_bracing: { name: 'K-Bracing', factor: 0.85, members_per_panel: 2 },
  v_bracing: { name: 'V-Bracing (Chevron)', factor: 0.9, members_per_panel: 2 },
  inverted_v: { name: 'Inverted V-Bracing', factor: 0.9, members_per_panel: 2 },
  eccentric: { name: 'Eccentric Bracing', factor: 0.7, members_per_panel: 2 },
};

// Adapter: Bracing uses fc0k/ft0k/E shorthand
const TIMBER_GRADES: Record<string, { fc0k: number; ft0k: number; E: number }> = Object.fromEntries(
  Object.entries(_TIMBER_GRADES_LIB)
    .filter(([k]) => ['C16', 'C24', 'C30', 'GL24h', 'GL28h', 'GL32h'].includes(k))
    .map(([k, v]) => [k, { fc0k: v.fc_0_k, ft0k: v.ft_0_k, E: v.E_mean }])
);

const CABLE_TYPES: Record<string, { fu: number; E: number }> = {
  spiral_strand: { fu: 1570, E: 150000 },
  locked_coil: { fu: 1470, E: 160000 },
  parallel_wire: { fu: 1670, E: 205000 },
  galvanized: { fu: 1370, E: 145000 },
};

const STEEL_SECTIONS: Record<string, { A: number; Iyy: number; r: number }> = {
  'CHS 60.3x5.0': { A: 870, Iyy: 341000, r: 19.8 },
  'CHS 76.1x5.0': { A: 1120, Iyy: 721000, r: 25.4 },
  'CHS 88.9x5.0': { A: 1320, Iyy: 1160000, r: 29.7 },
  'CHS 114.3x5.0': { A: 1720, Iyy: 2520000, r: 38.3 },
  'CHS 114.3x6.3': { A: 2140, Iyy: 3060000, r: 37.8 },
  'CHS 139.7x6.3': { A: 2640, Iyy: 5760000, r: 46.7 },
  'CHS 168.3x6.3': { A: 3210, Iyy: 10300000, r: 56.6 },
  'CHS 193.7x8.0': { A: 4670, Iyy: 19600000, r: 64.8 },
  'CHS 219.1x8.0': { A: 5310, Iyy: 28700000, r: 73.5 },
  'CHS 244.5x10.0': { A: 7370, Iyy: 50300000, r: 82.6 },
  'SHS 80x80x5': { A: 1470, Iyy: 1350000, r: 30.3 },
  'SHS 100x100x5': { A: 1870, Iyy: 2800000, r: 38.7 },
  'SHS 120x120x6': { A: 2700, Iyy: 5730000, r: 46.1 },
  'SHS 150x150x8': { A: 4430, Iyy: 13800000, r: 55.8 },
  'SHS 200x200x10': { A: 7410, Iyy: 41100000, r: 74.5 },
  'RHS 120x60x5': { A: 1670, Iyy: 2860000, r: 41.4 },
  'RHS 150x100x6': { A: 2820, Iyy: 7200000, r: 50.6 },
  'RHS 200x100x8': { A: 4430, Iyy: 15900000, r: 60.0 },
  'L 80x80x8': { A: 1230, Iyy: 723000, r: 24.2 },
  'L 100x100x10': { A: 1920, Iyy: 1770000, r: 30.4 },
  'L 120x120x12': { A: 2750, Iyy: 3670000, r: 36.5 },
  'L 150x150x15': { A: 4300, Iyy: 8980000, r: 45.7 },
  Custom: { A: 0, Iyy: 0, r: 0 },
};

const PRESETS: Record<string, { name: string; form: Partial<BracingForm> }> = {
  highway_truss: {
    name: 'Highway Bridge Truss — 40 m',
    form: {
      bracing_type: 'cross',
      material_type: 'steel',
      steel_grade: 'S355',
      span_length: '8',
      system_height: '5',
      number_of_panels: '2',
      section_type: 'CHS 168.3x6.3',
      wind_load: '1.8',
      seismic_factor: '0.1',
      notional_load: '0.5',
      temp_change: '30',
    },
  },
  rail_bridge: {
    name: 'Rail Bridge Plan Bracing — 30 m',
    form: {
      bracing_type: 'cross',
      material_type: 'steel',
      steel_grade: 'S355',
      span_length: '6',
      system_height: '4',
      number_of_panels: '2',
      section_type: 'CHS 193.7x8.0',
      wind_load: '2.0',
      seismic_factor: '0.15',
      notional_load: '0.8',
      temp_change: '25',
    },
  },
  footbridge_lateral: {
    name: 'Footbridge Lateral Bracing — 25 m',
    form: {
      bracing_type: 'k_bracing',
      material_type: 'steel',
      steel_grade: 'S275',
      span_length: '5',
      system_height: '2.5',
      number_of_panels: '1',
      section_type: 'CHS 88.9x5.0',
      wind_load: '1.0',
      seismic_factor: '0.05',
      notional_load: '0.3',
      temp_change: '20',
    },
  },
  arch_bridge: {
    name: 'Arch Bridge Wind Bracing',
    form: {
      bracing_type: 'cross',
      material_type: 'steel',
      steel_grade: 'S355',
      span_length: '10',
      system_height: '6',
      number_of_panels: '2',
      section_type: 'CHS 219.1x8.0',
      wind_load: '2.5',
      seismic_factor: '0.15',
      notional_load: '1.0',
      temp_change: '35',
    },
  },
  viaduct_cross: {
    name: 'Viaduct Cross-Frame — Tall Pier',
    form: {
      bracing_type: 'v_bracing',
      material_type: 'steel',
      steel_grade: 'S355',
      span_length: '6',
      system_height: '8',
      number_of_panels: '2',
      section_type: 'CHS 139.7x6.3',
      wind_load: '2.0',
      seismic_factor: '0.2',
      notional_load: '0.6',
      temp_change: '30',
    },
  },
  cable_stayed_lateral: {
    name: 'Cable-Stayed Deck Lateral Bracing',
    form: {
      bracing_type: 'single_diagonal',
      material_type: 'steel',
      steel_grade: 'S460',
      span_length: '12',
      system_height: '4',
      number_of_panels: '3',
      section_type: 'CHS 244.5x10.0',
      wind_load: '3.0',
      seismic_factor: '0.2',
      notional_load: '1.2',
      temp_change: '35',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const Bracing: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<BracingForm>({
    bracing_type: 'cross',
    material_type: 'steel',
    steel_grade: 'S355',
    timber_grade: 'C24',
    cable_type: 'spiral_strand',
    span_length: '12',
    system_height: '8',
    number_of_panels: '2',
    section_type: 'CHS 114.3x6.3',
    section_size: '',
    custom_area: '2000',
    custom_iyy: '3000000',
    custom_radius: '38',
    wind_load: '1.2',
    seismic_factor: '0.1',
    notional_load: '0.5',
    temp_change: '20',
    load_factor_uls: '1.5',
    safety_factor: '1.0',
    slenderness_limit: '200',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'span_length', label: 'Span Length' },
  { key: 'system_height', label: 'System Height' },
  { key: 'number_of_panels', label: 'Number Of Panels' },
  { key: 'custom_area', label: 'Custom Area' },
  { key: 'custom_iyy', label: 'Custom Iyy' },
  { key: 'custom_radius', label: 'Custom Radius' },
  { key: 'wind_load', label: 'Wind Load' },
  { key: 'seismic_factor', label: 'Seismic Factor' },
  { key: 'notional_load', label: 'Notional Load' },
  { key: 'temp_change', label: 'Temp Change' },
  { key: 'load_factor_uls', label: 'Load Factor Uls' },
  { key: 'safety_factor', label: 'Safety Factor' },
  { key: 'slenderness_limit', label: 'Slenderness Limit' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<BracingResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    config: true,
    geometry: true,
    loading: false,
    design: false,
  });


  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const updateForm = (field: keyof BracingForm, value: string) => {
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
  // Calculation
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      const bracingConfig = BRACING_TYPES[form.bracing_type];
      const nPanels = parseInt(form.number_of_panels) || 1;
      const spanLength = parseFloat(form.span_length) || 12;
      const systemHeight = parseFloat(form.system_height) || 8;

      // Geometry calculations
      const panelWidth = spanLength / nPanels;
      const panelHeight = systemHeight;
      const bracingLength = Math.sqrt(panelWidth ** 2 + panelHeight ** 2);
      const bracingAngle = Math.atan(panelHeight / panelWidth) * (180 / Math.PI);
      const totalMembers = nPanels * bracingConfig.members_per_panel;

      // Section properties
      let area: number, iyy: number, radius: number, fy: number, E: number;

      if (form.section_type === 'Custom') {
        area = parseFloat(form.custom_area) || 2000;
        iyy = parseFloat(form.custom_iyy) || 3000000;
        radius = parseFloat(form.custom_radius) || 38;
      } else {
        const section = STEEL_SECTIONS[form.section_type];
        area = section.A;
        iyy = section.Iyy;
        radius = section.r;
      }

      if (form.material_type === 'steel') {
        const grade = STEEL_GRADES[form.steel_grade];
        fy = grade.fy;
        E = grade.E;
      } else if (form.material_type === 'timber') {
        const grade = TIMBER_GRADES[form.timber_grade];
        fy = grade.fc0k;
        E = grade.E;
      } else {
        const cable = CABLE_TYPES[form.cable_type];
        fy = cable.fu * 0.5; // Working stress
        E = cable.E;
      }

      // Slenderness
      const slenderness = (bracingLength * 1000) / radius;
      const slendernessLimit = parseFloat(form.slenderness_limit) || 200;

      if (slenderness > slendernessLimit) {
        newWarnings.push(
          `Slenderness ratio ${slenderness.toFixed(0)} exceeds limit of ${slendernessLimit}`,
        );
      }

      // Loading
      const windLoad = parseFloat(form.wind_load) || 0;
      const seismicFactor = parseFloat(form.seismic_factor) || 0;
      const notionalLoad = parseFloat(form.notional_load) || 0;
      const tempChange = parseFloat(form.temp_change) || 0;

      // Assume tributary width of 6m and building height for wind
      const tributaryWidth = 6;
      const windForce = windLoad * systemHeight * tributaryWidth;
      const deadLoad = 50; // Assumed dead load kN per panel
      const seismicForce = seismicFactor * deadLoad * nPanels;
      const notionalForce = (notionalLoad * deadLoad * nPanels) / 100;

      // Thermal force (restrained expansion)
      const alpha = 12e-6; // Steel coefficient
      const thermalForce =
        form.material_type === 'steel'
          ? (E * area * alpha * tempChange) / 1000 // kN
          : 0;

      const totalLateral = windForce + seismicForce + notionalForce + Math.abs(thermalForce);

      // Force per member (simplified truss analysis)
      const forcePerMember =
        totalLateral / (totalMembers * Math.cos((bracingAngle * Math.PI) / 180));

      const loadFactorULS = parseFloat(form.load_factor_uls) || 1.5;
      const factoredForce = forcePerMember * loadFactorULS;

      // Resistance calculations (EN 1993-1-1)
      const gammaM0 = 1.0;
      const gammaM1 = 1.0;

      // Tension resistance
      const tensionCapacity = (fy * area) / (gammaM0 * 1000); // kN

      // Compression resistance (plastic)
      const compressionCapacity = (fy * area) / (gammaM0 * 1000); // kN

      // Buckling resistance
      const lambda1 = Math.PI * Math.sqrt(E / fy);
      const lambdaBar = slenderness / lambda1;

      // Imperfection factor (curve c for CHS/SHS)
      const alpha_imp = 0.49;
      const phi = 0.5 * (1 + alpha_imp * (lambdaBar - 0.2) + lambdaBar ** 2);
      const chi = Math.min(1.0, 1 / (phi + Math.sqrt(phi ** 2 - lambdaBar ** 2)));

      const bucklingCapacity = (chi * fy * area) / (gammaM1 * 1000); // kN

      // Utilisations
      const tensionUtilisation = (factoredForce / tensionCapacity) * 100;
      const compressionUtilisation = (factoredForce / compressionCapacity) * 100;
      const bucklingUtilisation = (factoredForce / bucklingCapacity) * 100;

      // Connection check (simplified)
      const boltCapacity = 50; // M16 Grade 8.8 in shear
      const connectionForce = factoredForce;
      const boltsRequired = Math.ceil(connectionForce / boltCapacity);
      const connectionUtilisation = (connectionForce / (boltsRequired * boltCapacity)) * 100;

      // System stiffness
      const memberStiffness = (E * area) / (bracingLength * 1000); // kN/mm
      const systemStiffness =
        memberStiffness * Math.cos((bracingAngle * Math.PI) / 180) ** 2 * totalMembers;
      const driftLimit = (systemHeight * 1000) / 500; // H/500
      const actualDrift = totalLateral / systemStiffness;

      // Determine critical check
      const utilisations = {
        Tension: tensionUtilisation,
        Compression: compressionUtilisation,
        Buckling: bucklingUtilisation,
        Connection: connectionUtilisation,
      };

      const maxUtil = Math.max(...Object.values(utilisations));
      const criticalCheck =
        Object.entries(utilisations).find(([, v]) => v === maxUtil)?.[0] || 'Buckling';

      // Classification
      let classification: string;
      let classColor: string;
      if (maxUtil <= 70) {
        classification = 'Optimal';
        classColor = 'text-green-400';
      } else if (maxUtil <= 90) {
        classification = 'Efficient';
        classColor = 'text-emerald-400';
      } else if (maxUtil <= 100) {
        classification = 'Adequate';
        classColor = 'text-amber-400';
      } else {
        classification = 'Overstressed';
        classColor = 'text-red-400';
      }

      const status = maxUtil <= 100 ? 'PASS' : 'FAIL';

      if (actualDrift > driftLimit) {
        newWarnings.push(
          `Drift ${actualDrift.toFixed(1)}mm exceeds limit of ${driftLimit.toFixed(1)}mm`,
        );
      }

      if (maxUtil > 100) {
        newWarnings.push(`${criticalCheck} check fails at ${maxUtil.toFixed(1)}% utilisation`);
      }

      setResults({
        panel_width: panelWidth,
        panel_height: panelHeight,
        bracing_angle: bracingAngle,
        bracing_length: bracingLength,
        total_members: totalMembers,
        slenderness,
        wind_force: windForce,
        seismic_force: seismicForce,
        notional_force: notionalForce,
        thermal_force: thermalForce,
        total_lateral: totalLateral,
        force_per_member: forcePerMember,
        factored_force: factoredForce,
        area,
        iyy,
        radius,
        fy,
        tension_capacity: tensionCapacity,
        tension_utilisation: tensionUtilisation,
        compression_capacity: compressionCapacity,
        compression_utilisation: compressionUtilisation,
        buckling_capacity: bucklingCapacity,
        buckling_utilisation: bucklingUtilisation,
        chi,
        lambda_bar: lambdaBar,
        connection_force: connectionForce,
        bolt_capacity: boltCapacity,
        bolts_required: boltsRequired,
        connection_utilisation: connectionUtilisation,
        system_stiffness: systemStiffness,
        drift_limit: driftLimit,
        actual_drift: actualDrift,
        critical_check: criticalCheck,
        max_utilisation: maxUtil,
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

  // Debounced auto-recalculation for What-If sliders (faster)
  useEffect(() => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    calcTimerRef.current = setTimeout(() => {
      calculate();
    }, 150);
    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [form, calculate]);



  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export - Premium @react-pdf/renderer
  // ─────────────────────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!results) return;
    const reportData = buildBracingReport(form as any, results, warnings, {
      projectName: form.projectName || 'Bracing Design',
      documentRef: form.reference || 'BRA001',
    });
    await downloadPDF(reportData as any, `Bracing_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Bracing Design',
      subtitle: `${form.bracing_type} — EN 1993-1-1`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
      ],
      inputs: [
        { label: 'Bracing Type', value: form.bracing_type },
        { label: 'Material', value: form.material_type },
        { label: 'Span Length', value: form.span_length, unit: 'm' },
        { label: 'System Height', value: form.system_height, unit: 'm' },
        { label: 'Number of Panels', value: form.number_of_panels },
      ],
      checks: [
        {
          name: 'Overall Utilisation',
          capacity: '100%',
          utilisation: `${results.max_utilisation?.toFixed(1) || '-'}%`,
          status: (results.max_utilisation <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations:
        ((results as any).recommendations ?? []).map((r: string) => ({ check: 'General', suggestion: r })) || [],
      footerNote: 'Beaver Bridges Ltd — Bracing Design',
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
    field: keyof BracingForm;
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
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan/20 focus:border-neon-cyan/50 transition-all duration-300"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neon-cyan text-xs">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────────
  const maxUtil = results
    ? Math.max(
        results.tension_utilisation,
        results.compression_utilisation,
        results.buckling_utilisation,
        results.connection_utilisation,
      )
    : 0;
  const overallStatus: 'PASS' | 'FAIL' = results ? (results.status as 'PASS' | 'FAIL') : 'PASS';

  // What-If slider definitions
  const whatIfSliders = [
    {
      key: 'span_length' as keyof BracingForm,
      label: 'Span Length',
      min: 2,
      max: 20,
      step: 0.5,
      unit: 'm',
    },
    {
      key: 'system_height' as keyof BracingForm,
      label: 'System Height',
      min: 1,
      max: 15,
      step: 0.5,
      unit: 'm',
    },
    {
      key: 'wind_load' as keyof BracingForm,
      label: 'Wind Load',
      min: 0,
      max: 5,
      step: 0.1,
      unit: 'kN/m²',
    },
    {
      key: 'seismic_factor' as keyof BracingForm,
      label: 'Seismic Factor',
      min: 0,
      max: 0.5,
      step: 0.01,
      unit: '',
    },
    {
      key: 'notional_load' as keyof BracingForm,
      label: 'Notional Load',
      min: 0,
      max: 3,
      step: 0.1,
      unit: '%',
    },
    {
      key: 'temp_change' as keyof BracingForm,
      label: 'Temp Change',
      min: 0,
      max: 60,
      step: 1,
      unit: '°C',
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
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
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
              Bracing Systems
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">EN 1993-1-1 compliant bracing analysis</p>
        </motion.div>

        {/* Presets */}
        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}
                className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-xl flex items-center justify-center">
                <FiZap className="w-6 h-6 text-neon-cyan" />
              </motion.div>
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
        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 mx-auto w-fit">
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
                {/* System Configuration */}
                <Section
                  id="config"
                  title="System Configuration"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-xl flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Bracing Type</label>
                      <select
                        value={form.bracing_type}
                        onChange={(e) => updateForm('bracing_type', e.target.value)}
                        title="Bracing Type"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/20 focus:border-neon-cyan/50 transition-all duration-300"
                      >
                        {Object.entries(BRACING_TYPES).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Material</label>
                      <select
                        value={form.material_type}
                        onChange={(e) => updateForm('material_type', e.target.value)}
                        title="Material"
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/20 focus:border-neon-cyan/50 transition-all duration-300"
                      >
                        <option value="steel">Steel</option>
                        <option value="timber">Timber</option>
                        <option value="cable">Cable</option>
                      </select>
                    </div>

                    {form.material_type === 'steel' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-200">Steel Grade</label>
                          <select
                            value={form.steel_grade}
                            onChange={(e) => updateForm('steel_grade', e.target.value)}
                            title="Steel Grade"
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/20 focus:border-neon-cyan/50 transition-all duration-300"
                          >
                            {Object.keys(STEEL_GRADES).map((grade) => (
                              <option key={grade} value={grade}>
                                {grade} (fy = {STEEL_GRADES[grade].fy} MPa)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-200">Section</label>
                          <select
                            value={form.section_type}
                            onChange={(e) => updateForm('section_type', e.target.value)}
                            title="Section"
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/20 focus:border-neon-cyan/50 transition-all duration-300"
                          >
                            {Object.keys(STEEL_SECTIONS).map((section) => (
                              <option key={section} value={section}>
                                {section}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {form.material_type === 'timber' && (
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-200">Timber Grade</label>
                        <select
                          value={form.timber_grade}
                          onChange={(e) => updateForm('timber_grade', e.target.value)}
                          title="Timber Grade"
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/20 focus:border-neon-cyan/50 transition-all duration-300"
                        >
                          {Object.keys(TIMBER_GRADES).map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {form.material_type === 'cable' && (
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-200">Cable Type</label>
                        <select
                          value={form.cable_type}
                          onChange={(e) => updateForm('cable_type', e.target.value)}
                          title="Cable Type"
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/20 focus:border-neon-cyan/50 transition-all duration-300"
                        >
                          {Object.entries(CABLE_TYPES).map(([key, cable]) => (
                            <option key={key} value={key}>
                              {key.replace('_', ' ')} (fu = {cable.fu} MPa)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {form.section_type === 'Custom' && (
                      <>
                        <InputField label="Area" field="custom_area" unit="mm²" />
                        <InputField label="I_yy" field="custom_iyy" unit="mm⁴" />
                        <InputField label="Radius of Gyration" field="custom_radius" unit="mm" />
                      </>
                    )}
                  </div>
                </Section>

                {/* Geometry */}
                <Section
                  id="geometry"
                  title="System Geometry"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-xl flex items-center justify-center">
                      <FiTrello className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-emerald-500/30"
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <InputField label="Span Length" field="span_length" unit="m" />
                    <InputField label="System Height" field="system_height" unit="m" />
                    <InputField label="Number of Panels" field="number_of_panels" />
                  </div>
                </Section>

                {/* Loading */}
                <Section
                  id="loading"
                  title="Loading"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-xl flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-amber-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Wind Load" field="wind_load" unit="kN/m²" />
                    <InputField label="Seismic Factor (α)" field="seismic_factor" />
                    <InputField label="Notional Load (%)" field="notional_load" unit="%" />
                    <InputField label="Temperature Change" field="temp_change" unit="°C" />
                  </div>
                </Section>

                {/* Design Parameters */}
                <Section
                  id="design"
                  title="Design Parameters"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-xl flex items-center justify-center">
                      <FiInfo className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-purple-500/30"
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <InputField label="Load Factor (ULS)" field="load_factor_uls" />
                    <InputField label="Safety Factor" field="safety_factor" />
                    <InputField label="Slenderness Limit" field="slenderness_limit" />
                  </div>
                </Section>

                {/* Calculate Button */}
                <motion.div className="flex justify-center py-6">
                  <Button
                    onClick={calculate}
                    className="w-full px-16 py-8 text-2xl font-black uppercase tracking-widest bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl text-white"
                  >
                    ⚡ RUN FULL ANALYSIS
                  </Button>
                </motion.div>
              </div>

              {/* Results Column — Premium Sidebar */}
              <div className="space-y-4">
                {/* 3D Visualization with What-If & Fullscreen */}
                <WhatIfPreview
                  title="Bracing — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  utilisation={maxUtil}
                  liveReadout={
                    results
                      ? [
                          { label: 'Tens', value: results.tension_utilisation },
                          { label: 'Comp', value: results.compression_utilisation },
                          { label: 'Buck', value: results.buckling_utilisation },
                          { label: 'Conn', value: results.connection_utilisation },
                        ]
                      : undefined
                  }
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[10, 6, 10]} status={overallStatus}>
                      <Bracing3D
                        bayWidth={parseFloat(form.span_length) || 6}
                        bayHeight={parseFloat(form.system_height) || 4}
                        bracingType={form.bracing_type || 'cross'}
                        numberOfPanels={parseInt(form.number_of_panels) || 2}
                        memberSize={form.section_type}
                        windLoad={parseFloat(form.wind_load) || 0}
                        lateralForce={results?.total_lateral || 0}
                        forcePerMember={results?.force_per_member || 0}
                        sectionType={form.section_type}
                        steelGrade={form.steel_grade}
                        utilisation={maxUtil}
                        status={overallStatus}
                      />
                    </Interactive3DDiagram>
                  )}
                />

                {/* Preset Selector */}
                <div className="mt-2">
                  <select
                    value=""
                    onChange={(e) => e.target.value && applyPreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm"
                    title="Quick Presets"
                  >
                    <option value="">⚡ Quick Presets</option>
                    {Object.entries(PRESETS).map(([key, p]) => (
                      <option key={key} value={key}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Results Summary */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    {/* Summary Check Cards */}
                    <div className="space-y-2">
                      {[
                        { label: 'Tension', util: results.tension_utilisation, icon: '⚡' },
                        { label: 'Buckling', util: results.buckling_utilisation, icon: '🔧' },
                        { label: 'Connection', util: results.connection_utilisation, icon: '🔗' },
                      ].map((c) => (
                        <div key={c.label} className={cn(
                          'border-l-4 rounded-r-lg p-3 bg-gray-900/60 flex items-center justify-between',
                          c.util <= 70 ? 'border-green-400' : c.util <= 100 ? 'border-amber-400' : 'border-red-400'
                        )}>
                          <span className="text-sm text-gray-300">{c.icon} {c.label}</span>
                          <span className={cn('text-sm font-bold', c.util <= 100 ? 'text-green-400' : 'text-red-400')}>
                            {c.util.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Status Card */}
                    <Card
                      className={cn(
                        'border-2 shadow-lg',
                        results.status === 'PASS'
                          ? 'bg-green-900/20 border-green-500/50'
                          : 'bg-red-900/20 border-red-500/50',
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
                          {results.classification} — {results.max_utilisation.toFixed(1)}%
                          Utilisation
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Critical: {results.critical_check}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Key Results */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { name: 'Tension', util: results.tension_utilisation },
                          { name: 'Compression', util: results.compression_utilisation },
                          { name: 'Buckling', util: results.buckling_utilisation },
                          { name: 'Connection', util: results.connection_utilisation },
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

                    {/* Warnings */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-gray-400">
                          <FiAlertTriangle className="text-amber-400" /> Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {warnings.length === 0 ? (
                          <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <FiCheck /> All checks OK
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {warnings.map((w, i) => (
                              <li key={i} className="text-amber-400 text-xs flex items-start gap-2">
                                <FiAlertTriangle className="mt-0.5 flex-shrink-0" /> {w}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>

                    {/* Design Recommendations */}
                    {results && (
                      <Card
                        variant="glass"
                        className="border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2 text-emerald-400/80">
                            <FiCheck className="text-emerald-400" /> Design Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {results.max_utilisation > 85 && (
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    High Utilisation
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Max utilisation {results.max_utilisation.toFixed(1)}% — consider
                                    upsizing section or reducing span
                                  </div>
                                </div>
                              </div>
                            )}
                            {results.bracing_angle < 30 && (
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                  <div className="text-sm font-semibold text-white">
                                    Shallow Angle
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Bracing angle {results.bracing_angle.toFixed(1)}° — consider K
                                    or X bracing for better efficiency
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                              <FiCheck className="text-emerald-400 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-sm font-semibold text-white">Overall</div>
                                <div className="text-xs text-gray-400">
                                  {results.status === 'PASS'
                                    ? `Bracing system adequate — ${results.total_members} members at ${results.max_utilisation.toFixed(1)}% max utilisation`
                                    : 'Bracing system FAILS — increase section size or revise layout'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Design Codes */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-gray-400">Design Codes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-xs text-gray-500">
                          <li className="flex items-center gap-2">
                            <FiChevronRight className="text-cyan-500" /> EN 1993-1-1 §6.3.1 Buckling
                          </li>
                          <li className="flex items-center gap-2">
                            <FiChevronRight className="text-cyan-500" /> EN 1993-1-1 §6.2.3 Tension
                          </li>
                          <li className="flex items-center gap-2">
                            <FiChevronRight className="text-cyan-500" /> EN 1993-1-1 §6.2.4
                            Compression
                          </li>
                          <li className="flex items-center gap-2">
                            <FiChevronRight className="text-cyan-500" /> EN 1993-1-1 §6.3.1.2
                            Imperfection Factor
                          </li>
                          <li className="flex items-center gap-2">
                            <FiChevronRight className="text-cyan-500" /> EN 1993-1-8 §3.6 Connection
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Button
                      variant="outline"
                      className="w-full border-gray-700 text-gray-400"
                      onClick={exportPDF}
                    >
                      <FiDownload className="mr-2" /> Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-purple-500/50 text-purple-400"
                      onClick={exportDOCX}
                    >
                      <FiDownload className="mr-2" /> Export DOCX
                    </Button>
                    <SaveRunButton calculatorKey="bracing" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6">
                  <h3 className="text-white font-bold mb-2">Maximum Utilisation</h3>
                  <div
                    className={cn(
                      'text-4xl font-black',
                      results.max_utilisation <= 100 ? 'text-cyan-400' : 'text-red-400',
                    )}
                  >
                    {results.max_utilisation.toFixed(1)}%
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Critical: {results.critical_check}</p>
                </Card>
                <Card variant="glass" className="border-emerald-500/30 shadow-2xl p-6">
                  <h3 className="text-white font-bold mb-2">Status</h3>
                  <div
                    className={cn(
                      'text-2xl font-black',
                      results.status === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {results.status}
                  </div>
                  <p className={cn('text-sm mt-1', results.classColor)}>{results.classification}</p>
                </Card>
                <Card variant="glass" className="border-purple-500/30 shadow-2xl p-6">
                  <h3 className="text-white font-bold mb-2">System</h3>
                  <div className="text-xl font-bold text-gray-400">
                    {BRACING_TYPES[form.bracing_type]?.name}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {form.section_type} — {form.steel_grade}
                  </p>
                </Card>
              </div>

              {/* Check Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: 'Tension',
                    util: results.tension_utilisation,
                    cap: `${results.tension_capacity.toFixed(1)} kN`,
                  },
                  {
                    name: 'Compression',
                    util: results.compression_utilisation,
                    cap: `${results.compression_capacity.toFixed(1)} kN`,
                  },
                  {
                    name: 'Buckling',
                    util: results.buckling_utilisation,
                    cap: `${results.buckling_capacity.toFixed(1)} kN (χ=${results.chi.toFixed(3)})`,
                  },
                  {
                    name: 'Connection',
                    util: results.connection_utilisation,
                    cap: `${results.bolts_required} × M16 Gr 8.8`,
                  },
                  {
                    name: 'Drift',
                    util: (results.actual_drift / results.drift_limit) * 100,
                    cap: `${results.actual_drift.toFixed(1)}mm / ${results.drift_limit.toFixed(1)}mm`,
                  },
                  {
                    name: 'Slenderness',
                    util: (results.slenderness / parseFloat(form.slenderness_limit || '200')) * 100,
                    cap: `λ = ${results.slenderness.toFixed(0)} / ${form.slenderness_limit}`,
                  },
                ].map((check) => {
                  const status = check.util <= 100 ? 'PASS' : 'FAIL';
                  return (
                    <Card
                      key={check.name}
                      variant="glass"
                      className={cn(
                        'border-neon-cyan/30 shadow-2xl p-4',
                        status === 'FAIL' && 'border-red-500/50',
                      )}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-semibold">{check.name}</span>
                        <span
                          className={cn(
                            'text-xs font-bold px-2 py-1 rounded',
                            status === 'PASS'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400',
                          )}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white">{check.util.toFixed(1)}%</div>
                      <p className="text-gray-500 text-xs mt-1">{check.cap}</p>
                      <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            check.util <= 70
                              ? 'bg-emerald-500'
                              : check.util <= 100
                                ? 'bg-amber-500'
                                : 'bg-red-500',
                          )}
                          style={{ width: `${Math.min(check.util, 100)}%` }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Utilisation Dashboard */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <FiActivity className="text-cyan-400" />
                    <span>Utilisation Dashboard</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'Tension', util: results.tension_utilisation, ref: '§6.2.3' },
                      { name: 'Compression', util: results.compression_utilisation, ref: '§6.2.4' },
                      { name: 'Buckling', util: results.buckling_utilisation, ref: '§6.3.1' },
                      { name: 'Connection', util: results.connection_utilisation, ref: '§3.6' },
                      {
                        name: 'Drift',
                        util: (results.actual_drift / results.drift_limit) * 100,
                        ref: 'SLS',
                      },
                    ].map((check, i) => (
                      <div key={check.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300 font-medium">
                            {check.name}{' '}
                            <span className="text-gray-500 text-xs">({check.ref})</span>
                          </span>
                          <span
                            className={cn(
                              'font-bold',
                              check.util > 100
                                ? 'text-red-400'
                                : check.util > 90
                                  ? 'text-amber-400'
                                  : 'text-green-400',
                            )}
                          >
                            {check.util.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(check.util, 100)}%` }}
                            transition={{ duration: 1.2, delay: i * 0.15 }}
                            className={cn(
                              'h-full rounded-full',
                              check.util > 100
                                ? 'bg-gradient-to-r from-red-600 to-red-400'
                                : check.util > 90
                                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                                  : 'bg-gradient-to-r from-green-600 to-cyan-400',
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* SVG Structural Diagrams */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Axial Force Diagram */}
                <Card variant="glass" className="border-purple-500/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Axial Force Diagram</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full h-48">
                      <defs>
                        <linearGradient id="force-fill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      {/* Baseline */}
                      <line
                        x1="40"
                        y1="100"
                        x2="360"
                        y2="100"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        strokeDasharray="4"
                      />
                      {/* Support markers */}
                      <polygon points="40,110 30,130 50,130" fill="#00d9ff" opacity="0.6" />
                      <polygon points="360,110 350,130 370,130" fill="#00d9ff" opacity="0.6" />
                      {/* Force distribution — uniform axial */}
                      <rect x="40" y="55" width="320" height="45" fill="url(#force-fill)" />
                      <line x1="40" y1="55" x2="360" y2="55" stroke="#a855f7" strokeWidth="2.5" />
                      {/* Force arrows */}
                      {[80, 140, 200, 260, 320].map((x) => (
                        <line
                          key={x}
                          x1={x}
                          y1="100"
                          x2={x}
                          y2="55"
                          stroke="#a855f7"
                          strokeWidth="1"
                          strokeDasharray="3"
                        />
                      ))}
                      {/* Labels */}
                      <text
                        x="200"
                        y="45"
                        fill="#a855f7"
                        fontSize="12"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        N_Ed = {results.factored_force.toFixed(1)} kN
                      </text>
                      <text x="200" y="190" fill="#64748b" fontSize="10" textAnchor="middle">
                        Span = {form.span_length} m
                      </text>
                      <text x="55" y="72" fill="#f97316" fontSize="9">
                        Compression
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Buckling Curve */}
                <Card variant="glass" className="border-orange-500/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Buckling Curve (χ vs λ̄)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full h-48">
                      {/* Axes */}
                      <line x1="50" y1="170" x2="380" y2="170" stroke="#64748b" strokeWidth="1" />
                      <line x1="50" y1="170" x2="50" y2="20" stroke="#64748b" strokeWidth="1" />
                      {/* Axis labels */}
                      <text x="210" y="195" fill="#64748b" fontSize="10" textAnchor="middle">
                        λ̄ (non-dimensional slenderness)
                      </text>
                      <text
                        x="15"
                        y="95"
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="middle"
                        transform="rotate(-90, 15, 95)"
                      >
                        χ (reduction factor)
                      </text>
                      {/* Curve c (α=0.49) */}
                      {(() => {
                        const pts: string[] = [];
                        for (let i = 0; i <= 50; i++) {
                          const lambdaB = (i / 50) * 3;
                          const alpha_c = 0.49;
                          const phiB = 0.5 * (1 + alpha_c * (lambdaB - 0.2) + lambdaB * lambdaB);
                          const chiB =
                            lambdaB < 0.2
                              ? 1
                              : Math.min(
                                  1,
                                  1 /
                                    (phiB +
                                      Math.sqrt(Math.max(0, phiB * phiB - lambdaB * lambdaB))),
                                );
                          const x = 50 + (lambdaB / 3) * 330;
                          const y = 170 - chiB * 150;
                          pts.push(`${x},${y}`);
                        }
                        return (
                          <polyline
                            points={pts.join(' ')}
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="2.5"
                          />
                        );
                      })()}
                      {/* Design point */}
                      {(() => {
                        const x = 50 + (results.lambda_bar / 3) * 330;
                        const y = 170 - results.chi * 150;
                        return (
                          <>
                            <circle
                              cx={x}
                              cy={y}
                              r="5"
                              fill="#ef4444"
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                            <line
                              x1={x}
                              y1={y}
                              x2={x}
                              y2="170"
                              stroke="#ef4444"
                              strokeWidth="1"
                              strokeDasharray="3"
                            />
                            <text
                              x={x + 8}
                              y={y - 8}
                              fill="#ef4444"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              χ = {results.chi.toFixed(3)}
                            </text>
                            <text x={x} y="185" fill="#ef4444" fontSize="9" textAnchor="middle">
                              λ̄ = {results.lambda_bar.toFixed(2)}
                            </text>
                          </>
                        );
                      })()}
                      {/* Scale marks */}
                      {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((v) => (
                        <text
                          key={v}
                          x={50 + (v / 3) * 330}
                          y="182"
                          fill="#64748b"
                          fontSize="8"
                          textAnchor="middle"
                        >
                          {v}
                        </text>
                      ))}
                      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                        <text
                          key={v}
                          x="42"
                          y={170 - v * 150 + 4}
                          fill="#64748b"
                          fontSize="8"
                          textAnchor="end"
                        >
                          {v}
                        </text>
                      ))}
                      <text x="320" y="65" fill="#f97316" fontSize="9" opacity="0.7">
                        Curve c (α=0.49)
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Bracing Layout Plan */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Bracing Layout / Geometry</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full h-48">
                      {(() => {
                        const nP = parseInt(form.number_of_panels) || 2;
                        const pw = 300 / nP;
                        const ox = 50;
                        const H = 140;
                        const type = form.bracing_type;
                        const elements: React.ReactNode[] = [];

                        // Frame columns & beams
                        for (let i = 0; i <= nP; i++) {
                          const x = ox + i * pw;
                          elements.push(
                            <line
                              key={`col-${i}`}
                              x1={x}
                              y1={20}
                              x2={x}
                              y2={H + 20}
                              stroke="#475569"
                              strokeWidth="2.5"
                            />,
                          );
                        }
                        elements.push(
                          <line
                            key="top"
                            x1={ox}
                            y1={20}
                            x2={ox + nP * pw}
                            y2={20}
                            stroke="#475569"
                            strokeWidth="2.5"
                          />,
                        );
                        elements.push(
                          <line
                            key="bot"
                            x1={ox}
                            y1={H + 20}
                            x2={ox + nP * pw}
                            y2={H + 20}
                            stroke="#475569"
                            strokeWidth="2.5"
                          />,
                        );

                        // Diagonals per panel
                        for (let i = 0; i < nP; i++) {
                          const x0 = ox + i * pw;
                          const x1 = x0 + pw;
                          const midX = (x0 + x1) / 2;
                          const col =
                            maxUtil > 100 ? '#ef4444' : maxUtil > 90 ? '#f97316' : '#22c55e';

                          if (type === 'cross') {
                            elements.push(
                              <line
                                key={`d1-${i}`}
                                x1={x0}
                                y1={H + 20}
                                x2={x1}
                                y2={20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                            elements.push(
                              <line
                                key={`d2-${i}`}
                                x1={x1}
                                y1={H + 20}
                                x2={x0}
                                y2={20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                          } else if (type === 'single_diagonal') {
                            elements.push(
                              <line
                                key={`d-${i}`}
                                x1={x0}
                                y1={H + 20}
                                x2={x1}
                                y2={20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                          } else if (type === 'k_bracing') {
                            elements.push(
                              <line
                                key={`d1-${i}`}
                                x1={x0}
                                y1={20 + H / 2}
                                x2={x1}
                                y2={20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                            elements.push(
                              <line
                                key={`d2-${i}`}
                                x1={x0}
                                y1={20 + H / 2}
                                x2={x1}
                                y2={H + 20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                          } else if (type === 'v_bracing') {
                            elements.push(
                              <line
                                key={`d1-${i}`}
                                x1={x0}
                                y1={H + 20}
                                x2={midX}
                                y2={20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                            elements.push(
                              <line
                                key={`d2-${i}`}
                                x1={x1}
                                y1={H + 20}
                                x2={midX}
                                y2={20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                          } else if (type === 'inverted_v') {
                            elements.push(
                              <line
                                key={`d1-${i}`}
                                x1={x0}
                                y1={20}
                                x2={midX}
                                y2={H + 20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                            elements.push(
                              <line
                                key={`d2-${i}`}
                                x1={x1}
                                y1={20}
                                x2={midX}
                                y2={H + 20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                          } else if (type === 'eccentric') {
                            const eccPt = x0 + pw * 0.25;
                            elements.push(
                              <line
                                key={`d1-${i}`}
                                x1={x0}
                                y1={H + 20}
                                x2={eccPt}
                                y2={20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                            elements.push(
                              <line
                                key={`d2-${i}`}
                                x1={x1}
                                y1={H + 20}
                                x2={eccPt}
                                y2={20}
                                stroke={col}
                                strokeWidth="2"
                              />,
                            );
                          }

                          // Gusset plate indicators
                          elements.push(
                            <circle key={`g1-${i}`} cx={x0} cy={H + 20} r="4" fill="#fbbf24" />,
                          );
                          elements.push(
                            <circle key={`g2-${i}`} cx={x1} cy={20} r="4" fill="#fbbf24" />,
                          );
                        }

                        // Supports
                        elements.push(
                          <polygon
                            key="sup1"
                            points={`${ox},${H + 25} ${ox - 8},${H + 40} ${ox + 8},${H + 40}`}
                            fill="#00d9ff"
                            opacity="0.6"
                          />,
                        );
                        elements.push(
                          <polygon
                            key="sup2"
                            points={`${ox + nP * pw},${H + 25} ${ox + nP * pw - 8},${H + 40} ${ox + nP * pw + 8},${H + 40}`}
                            fill="#00d9ff"
                            opacity="0.6"
                          />,
                        );

                        // Dimension lines
                        elements.push(
                          <text
                            key="dimW"
                            x={ox + (nP * pw) / 2}
                            y={H + 55}
                            fill="#00d9ff"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {form.span_length} m
                          </text>,
                        );
                        elements.push(
                          <text
                            key="dimH"
                            x={ox + nP * pw + 20}
                            y={20 + H / 2}
                            fill="#f97316"
                            fontSize="10"
                            textAnchor="start"
                          >
                            {form.system_height} m
                          </text>,
                        );
                        elements.push(
                          <text
                            key="angle"
                            x={ox + pw * 0.55}
                            y={H / 2 + 26}
                            fill="#a78bfa"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            θ = {results.bracing_angle.toFixed(1)}°
                          </text>,
                        );

                        return elements;
                      })()}
                    </svg>
                  </CardContent>
                </Card>

                {/* Cross Section Detail */}
                <Card variant="glass" className="border-blue-500/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Cross Section Detail</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 220" className="w-full h-48">
                      {(() => {
                        const cx = 200;
                        const cy = 110;
                        const sectionName = form.section_type;
                        const col =
                          maxUtil > 100 ? '#ef4444' : maxUtil > 90 ? '#f97316' : '#3b82f6';

                        if (sectionName.startsWith('CHS')) {
                          // Circular Hollow Section
                          const match = sectionName.match(/CHS\s+([\d.]+)[x×]([\d.]+)/);
                          const D = match ? parseFloat(match[1]) : 114.3;
                          const t = match ? parseFloat(match[2]) : 6.3;
                          const scale = 150 / D;
                          const rOuter = (D / 2) * scale;
                          const rInner = (D / 2 - t) * scale;
                          return (
                            <>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={rOuter}
                                fill={col}
                                opacity="0.3"
                                stroke={col}
                                strokeWidth="2"
                              />
                              <circle
                                cx={cx}
                                cy={cy}
                                r={rInner}
                                fill="#111827"
                                stroke={col}
                                strokeWidth="1"
                              />
                              <line
                                x1={cx}
                                y1={cy - rOuter - 10}
                                x2={cx + rOuter + 10}
                                y2={cy - rOuter - 10}
                                stroke="#94a3b8"
                                strokeWidth="0.5"
                              />
                              <text
                                x={cx + rOuter / 2}
                                y={cy - rOuter - 15}
                                fill="#00d9ff"
                                fontSize="10"
                                textAnchor="middle"
                              >
                                D = {D}mm
                              </text>
                              <text x={cx + rOuter + 8} y={cy} fill="#f97316" fontSize="10">
                                t = {t}mm
                              </text>
                              <text
                                x={cx}
                                y={cy + rOuter + 25}
                                fill="#94a3b8"
                                fontSize="10"
                                textAnchor="middle"
                              >
                                A = {results.area} mm²
                              </text>
                            </>
                          );
                        } else if (sectionName.startsWith('SHS') || sectionName.startsWith('RHS')) {
                          // Square/Rectangular Hollow Section
                          const match = sectionName.match(
                            /(SHS|RHS)\s+([\d.]+)[x×]([\d.]+)[x×]([\d.]+)/,
                          );
                          const W = match ? parseFloat(match[2]) : 100;
                          const H = match ? parseFloat(match[3]) : 100;
                          const t = match ? parseFloat(match[4]) : 5;
                          const scale = Math.min(150 / W, 150 / H);
                          const sW = W * scale;
                          const sH = H * scale;
                          const sT = t * scale;
                          return (
                            <>
                              <rect
                                x={cx - sW / 2}
                                y={cy - sH / 2}
                                width={sW}
                                height={sH}
                                fill={col}
                                opacity="0.3"
                                stroke={col}
                                strokeWidth="2"
                              />
                              <rect
                                x={cx - sW / 2 + sT}
                                y={cy - sH / 2 + sT}
                                width={sW - 2 * sT}
                                height={sH - 2 * sT}
                                fill="#111827"
                                stroke={col}
                                strokeWidth="1"
                              />
                              <text
                                x={cx}
                                y={cy - sH / 2 - 10}
                                fill="#00d9ff"
                                fontSize="10"
                                textAnchor="middle"
                              >
                                {W} × {H}mm
                              </text>
                              <text x={cx + sW / 2 + 8} y={cy} fill="#f97316" fontSize="10">
                                t = {t}mm
                              </text>
                              <text
                                x={cx}
                                y={cy + sH / 2 + 20}
                                fill="#94a3b8"
                                fontSize="10"
                                textAnchor="middle"
                              >
                                A = {results.area} mm²
                              </text>
                            </>
                          );
                        } else if (sectionName.startsWith('L')) {
                          // Angle section
                          const match = sectionName.match(/L\s+([\d.]+)[x×]([\d.]+)[x×]([\d.]+)/);
                          const legW = match ? parseFloat(match[1]) : 100;
                          const legH = match ? parseFloat(match[2]) : 100;
                          const t = match ? parseFloat(match[3]) : 10;
                          const scale = 150 / Math.max(legW, legH);
                          const sW = legW * scale;
                          const sH = legH * scale;
                          const sT = t * scale;
                          return (
                            <>
                              <rect
                                x={cx - sW / 2}
                                y={cy + sH / 2 - sT}
                                width={sW}
                                height={sT}
                                fill={col}
                                opacity="0.5"
                                stroke={col}
                                strokeWidth="1.5"
                              />
                              <rect
                                x={cx - sW / 2}
                                y={cy - sH / 2}
                                width={sT}
                                height={sH}
                                fill={col}
                                opacity="0.5"
                                stroke={col}
                                strokeWidth="1.5"
                              />
                              <text
                                x={cx}
                                y={cy - sH / 2 - 10}
                                fill="#00d9ff"
                                fontSize="10"
                                textAnchor="middle"
                              >
                                {legW} × {legH} × {t}mm
                              </text>
                              <text
                                x={cx}
                                y={cy + sH / 2 + 25}
                                fill="#94a3b8"
                                fontSize="10"
                                textAnchor="middle"
                              >
                                A = {results.area} mm²
                              </text>
                            </>
                          );
                        }
                        // Fallback
                        return (
                          <text x={cx} y={cy} fill="#94a3b8" fontSize="12" textAnchor="middle">
                            {sectionName}
                          </text>
                        );
                      })()}
                    </svg>
                  </CardContent>
                </Card>
              </div>

              {/* 3D Interactive View */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <FiEye className="text-cyan-400" />
                    <span>3D Interactive View</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram
                    height="h-[500px]"
                    cameraPosition={[10, 6, 10]}
                    status={overallStatus}
                  >
                    <Bracing3D
                      bayWidth={parseFloat(form.span_length) || 6}
                      bayHeight={parseFloat(form.system_height) || 4}
                      bracingType={form.bracing_type || 'cross'}
                      numberOfPanels={parseInt(form.number_of_panels) || 2}
                      memberSize={form.section_type}
                      windLoad={parseFloat(form.wind_load) || 0}
                      lateralForce={results?.total_lateral || 0}
                      forcePerMember={results?.force_per_member || 0}
                      sectionType={form.section_type}
                      steelGrade={form.steel_grade}
                      utilisation={maxUtil}
                      status={overallStatus}
                    />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>

              {/* Connection Design Summary */}
              <Card variant="glass" className="border-purple-500/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <FiLayers className="text-purple-400" />
                    <span>Connection Design Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      {
                        label: 'Type',
                        value: form.bracing_type
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase()),
                      },
                      { label: 'Axial Force', value: `${results.factored_force.toFixed(1)} kN` },
                      { label: 'Bolts', value: `${results.bolts_required} × M16` },
                      { label: 'Bolt Grade', value: 'Gr 8.8' },
                      { label: 'Bolt Cap.', value: `${results.bolt_capacity.toFixed(0)} kN ea.` },
                      { label: 'Overall', value: results.status === 'PASS' ? '✓ PASS' : '✗ FAIL' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-3 rounded-lg bg-gray-900/50 border border-gray-700 text-center"
                      >
                        <p className="text-gray-400 text-xs uppercase mb-1">{item.label}</p>
                        <p className="text-white font-bold text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


    </div>
  );
};

export default Bracing;
