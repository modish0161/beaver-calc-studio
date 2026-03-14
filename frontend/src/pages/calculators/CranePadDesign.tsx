// =============================================================================
// Crane Pad Foundation Design — Premium Edition
// BS EN 1997-1 (EC7) / CIRIA C703 / BS 5975 / BS 7121 Compliant
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiGrid,
    FiInfo,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { buildCranePadReport } from '../../lib/pdf/builders';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import CranePad3D from '../../components/3d/scenes/CranePad3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// REFERENCE DATA & DATABASES
// =============================================================================

const CRANE_DATABASE: Record<
  string,
  {
    name: string;
    capacity: string;
    maxOutriggerLoad: number;
    typicalOutriggerLoad: number;
    outriggerPadSize: number;
    outriggerSpacing: number;
    category: 'mobile' | 'crawler' | 'tower';
    description: string;
  }
> = {
  mobile_30t: {
    name: 'Mobile Crane 30t',
    capacity: '30t',
    maxOutriggerLoad: 280,
    typicalOutriggerLoad: 210,
    outriggerPadSize: 0.5,
    outriggerSpacing: 6.0,
    category: 'mobile',
    description: 'Compact mobile crane',
  },
  mobile_50t: {
    name: 'Mobile Crane 50t',
    capacity: '50t',
    maxOutriggerLoad: 450,
    typicalOutriggerLoad: 340,
    outriggerPadSize: 0.6,
    outriggerSpacing: 7.2,
    category: 'mobile',
    description: 'Standard mobile crane',
  },
  mobile_100t: {
    name: 'Mobile Crane 100t',
    capacity: '100t',
    maxOutriggerLoad: 850,
    typicalOutriggerLoad: 640,
    outriggerPadSize: 0.8,
    outriggerSpacing: 8.4,
    category: 'mobile',
    description: 'Medium mobile crane',
  },
  mobile_200t: {
    name: 'Mobile Crane 200t',
    capacity: '200t',
    maxOutriggerLoad: 1600,
    typicalOutriggerLoad: 1200,
    outriggerPadSize: 1.0,
    outriggerSpacing: 10.0,
    category: 'mobile',
    description: 'Large mobile crane',
  },
  mobile_350t: {
    name: 'Mobile Crane 350t',
    capacity: '350t',
    maxOutriggerLoad: 2800,
    typicalOutriggerLoad: 2100,
    outriggerPadSize: 1.2,
    outriggerSpacing: 12.0,
    category: 'mobile',
    description: 'Heavy mobile crane',
  },
  mobile_500t: {
    name: 'Mobile Crane 500t',
    capacity: '500t',
    maxOutriggerLoad: 3800,
    typicalOutriggerLoad: 2850,
    outriggerPadSize: 1.4,
    outriggerSpacing: 13.5,
    category: 'mobile',
    description: 'Very heavy mobile crane',
  },
  crawler_100t: {
    name: 'Crawler Crane 100t',
    capacity: '100t',
    maxOutriggerLoad: 650,
    typicalOutriggerLoad: 490,
    outriggerPadSize: 1.5,
    outriggerSpacing: 5.0,
    category: 'crawler',
    description: 'Track-mounted, no outriggers',
  },
  crawler_300t: {
    name: 'Crawler Crane 300t',
    capacity: '300t',
    maxOutriggerLoad: 1800,
    typicalOutriggerLoad: 1350,
    outriggerPadSize: 2.0,
    outriggerSpacing: 7.0,
    category: 'crawler',
    description: 'Heavy crawler crane',
  },
  tower_base_medium: {
    name: 'Tower Crane Base (Medium)',
    capacity: '8t tip',
    maxOutriggerLoad: 1500,
    typicalOutriggerLoad: 1125,
    outriggerPadSize: 1.5,
    outriggerSpacing: 6.0,
    category: 'tower',
    description: 'Medium tower crane foundation',
  },
};

const GROUND_CONDITIONS: Record<
  string,
  {
    name: string;
    bearingCapacity: number;
    description: string;
    icon: string;
  }
> = {
  soft_clay: {
    name: 'Soft Clay',
    bearingCapacity: 50,
    description: 'Very soft to soft cohesive',
    icon: '🔵',
  },
  firm_clay: {
    name: 'Firm Clay',
    bearingCapacity: 100,
    description: 'Firm cohesive soil',
    icon: '🟤',
  },
  stiff_clay: {
    name: 'Stiff Clay',
    bearingCapacity: 200,
    description: 'Stiff to very stiff clay',
    icon: '⬛',
  },
  loose_sand: {
    name: 'Loose Sand',
    bearingCapacity: 100,
    description: 'Loose granular',
    icon: '🟡',
  },
  medium_sand: {
    name: 'Medium Dense Sand',
    bearingCapacity: 200,
    description: 'Medium dense sand/gravel',
    icon: '🟠',
  },
  dense_sand: {
    name: 'Dense Sand',
    bearingCapacity: 400,
    description: 'Dense to very dense',
    icon: '🔴',
  },
  gravel: {
    name: 'Compacted Gravel',
    bearingCapacity: 400,
    description: 'Compacted crushed stone',
    icon: '⚪',
  },
  hardcore: {
    name: 'Crushed Hardcore',
    bearingCapacity: 300,
    description: 'Type 1 sub-base',
    icon: '🔘',
  },
};

const MAT_MATERIALS: Record<
  string,
  {
    name: string;
    modulus: number;
    bendingStrength: number;
    shearStrength: number;
    density: number;
    icon: string;
  }
> = {
  timber_softwood_c24: {
    name: 'Softwood C24',
    modulus: 11000,
    bendingStrength: 7.5,
    shearStrength: 2.5,
    density: 420,
    icon: '🌲',
  },
  timber_hardwood_d40: {
    name: 'Hardwood D40',
    modulus: 13000,
    bendingStrength: 12.5,
    shearStrength: 4.0,
    density: 700,
    icon: '🌳',
  },
  timber_ekki: {
    name: 'Ekki (Azobe)',
    modulus: 16500,
    bendingStrength: 22.0,
    shearStrength: 6.0,
    density: 1050,
    icon: '🌴',
  },
  steel_s275: {
    name: 'Steel S275',
    modulus: 210000,
    bendingStrength: 275,
    shearStrength: 160,
    density: 7850,
    icon: '⚙️',
  },
  steel_s355: {
    name: 'Steel S355',
    modulus: 210000,
    bendingStrength: 355,
    shearStrength: 205,
    density: 7850,
    icon: '⚙️',
  },
  composite_hdpe: {
    name: 'HDPE Composite',
    modulus: 15000,
    bendingStrength: 35,
    shearStrength: 12,
    density: 980,
    icon: '🔷',
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface FormData {
  projectName: string;
  reference: string;
  craneType: string;
  outriggerLoad: string;
  groundType: string;
  allowableBearing: string;
  matMaterial: string;
  matLength: string;
  matWidth: string;
  matThickness: string;
  numLayers: string;
  dynamicFactor: string;
  safetyFactor: string;
}

interface Results {
  designLoad: number;
  q_applied: number;
  q_allowable: number;
  L_eff: number;
  B_eff: number;
  A_eff: number;
  bearingUtil: number;
  bendingStress: number;
  bendingAllow: number;
  bendingUtil: number;
  shearStress: number;
  shearAllow: number;
  shearUtil: number;
  punchingStress: number;
  punchingAllow: number;
  punchingUtil: number;
  settlement: number;
  deflection: number;
  deflectionLimit: number;
  deflectionUtil: number;
  status: 'PASS' | 'FAIL';
  maxUtil: number;
  rating: string;
  ratingColor: string;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card variant="glass" className="mb-4 overflow-hidden border-neon-cyan/30 shadow-2xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-cyan-400">{icon}</span>
          <h3 className="text-2xl text-white font-bold">{title}</h3>
        </div>
        <FiChevronDown
          className={cn('text-gray-500 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="p-6 space-y-4 border-t border-gray-800/50">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  info?: string;
  field?: string;
}> = ({ label, value, onChange, unit, info, field }) => (
  <div className="space-y-1.5 flex-1 min-w-[200px]">
    <div className="flex items-center justify-between">
      <ExplainableLabel
        label={label}
        field={field || label.toLowerCase().replace(/\s+/g, '_')}
        className="text-sm font-semibold text-gray-200"
      />
      {info && <FiInfo className="text-gray-600 w-3 h-3 cursor-help" title={info} />}
    </div>
    <div className="relative group">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all outline-none"
        title={label}
      />
      {unit && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neon-cyan text-xs">
          {unit}
        </span>
      )}
    </div>
  </div>
);

const ResultCard: React.FC<{
  label: string;
  value: string;
  unit?: string;
  util: number;
  status: 'PASS' | 'FAIL';
  description?: string;
}> = ({ label, value, unit, util, status, description }) => (
  <div
    className={cn(
      'p-4 rounded-2xl border transition-all',
      status === 'PASS'
        ? util > 90
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-cyan-500/5 border-cyan-500/20'
        : 'bg-red-500/5 border-red-500/20',
    )}
  >
    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
      {label}
    </div>
    <div className="flex items-end gap-2 mb-3">
      <div
        className={cn(
          'text-2xl font-black italic tracking-tighter',
          status === 'FAIL' ? 'text-red-400' : util > 90 ? 'text-amber-400' : 'text-white',
        )}
      >
        {value}
      </div>
      {unit && <div className="text-[10px] font-bold text-gray-600 mb-1.5">{unit}</div>}
    </div>
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-gray-500">UTILISATION</span>
        <span className={cn(status === 'FAIL' ? 'text-red-400' : 'text-gray-400')}>
          {util.toFixed(1)}%
        </span>
      </div>
      <div className="h-1 bg-black/40 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(util, 100)}%` }}
          className={cn(
            'h-full rounded-full transition-all duration-700',
            status === 'FAIL' ? 'bg-red-500' : util > 90 ? 'bg-amber-500' : 'bg-cyan-500',
          )}
        />
      </div>
    </div>
    {description && (
      <p className="text-[10px] text-gray-600 mt-2 italic leading-tight">{description}</p>
    )}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CranePadDesign: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'logic' | 'visualization'>(
    'input',
  );
  const [form, setForm] = useState<FormData>({
    projectName: '',
    reference: 'CRA/001',
    craneType: 'mobile_100t',
    outriggerLoad: '850',
    groundType: 'firm_clay',
    allowableBearing: '100',
    matMaterial: 'timber_hardwood_d40',
    matLength: '3000',
    matWidth: '3000',
    matThickness: '200',
    numLayers: '2',
    dynamicFactor: '1.20',
    safetyFactor: '2.00',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'outriggerLoad', label: 'Outrigger Load' },
  { key: 'allowableBearing', label: 'Allowable Bearing' },
  { key: 'matLength', label: 'Mat Length' },
  { key: 'matWidth', label: 'Mat Width' },
  { key: 'matThickness', label: 'Mat Thickness' },
  { key: 'numLayers', label: 'Num Layers' },
  { key: 'dynamicFactor', label: 'Dynamic Factor' },
  { key: 'safetyFactor', label: 'Safety Factor' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map(e => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'projectName', label: 'Project Name', min: 0, max: 100, step: 1, unit: '' },
    { key: 'reference', label: 'Reference', min: 0, max: 100, step: 1, unit: '' },
    { key: 'craneType', label: 'Crane Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'outriggerLoad', label: 'Outrigger Load', min: 0, max: 100, step: 1, unit: '' }
  ];


  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // ENGINE: CALCULATIONS
  // ===========================================================================

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const crane = CRANE_DATABASE[form.craneType];
    const mat = MAT_MATERIALS[form.matMaterial];

    // Inputs
    const P = parseFloat(form.outriggerLoad);
    const qa = parseFloat(form.allowableBearing);
    const L = parseFloat(form.matLength) / 1000;
    const B = parseFloat(form.matWidth) / 1000;
    const t = parseFloat(form.matThickness) / 1000;
    const n = parseInt(form.numLayers);
    const DF = parseFloat(form.dynamicFactor);
    const SF = parseFloat(form.safetyFactor);

    if (isNaN(P) || isNaN(qa) || isNaN(L)) return;

    // 1. Design Load
    const P_design = P * DF * SF;

    // 2. Load Spread (CIRIA C703 / BS 5975)
    // 45 degree spread rule
    const foot_size = crane.outriggerPadSize;
    const total_t = t * n;
    const L_eff = Math.min(L, foot_size + 2 * total_t);
    const B_eff = Math.min(B, foot_size + 2 * total_t);
    const A_eff = L_eff * B_eff;

    // 3. Bearing Check
    const q_applied = P_design / A_eff;
    const bearingUtil = (q_applied / qa) * 100;

    // 4. Bending Check (Per layer / composite approx)
    // Moment at face of outrigger
    const cantilever = (L - foot_size) / 2;
    const M_ed = (q_applied * Math.pow(cantilever, 2)) / 2; // kNm/m
    const Z = (1.0 * Math.pow(total_t, 2)) / 6; // Section modulus per m width
    const sigma_b = M_ed / Z / 1000; // MPa
    const sigma_allow = mat.bendingStrength;
    const bendingUtil = (sigma_b / sigma_allow) * 100;

    // 5. Shear Check
    const V_ed = q_applied * cantilever; // kN/m
    const tau = V_ed / (1.0 * total_t) / 1000; // MPa
    const tau_allow = mat.shearStrength;
    const shearUtil = (tau / tau_allow) * 100;

    // 6. Punching Shear
    const perimeter = 4 * foot_size;
    const v_punch = P_design / (perimeter * total_t) / 1000; // MPa
    const punchingUtil = (v_punch / (tau_allow * 1.5)) * 100; // 1.5 increase for confined punching

    // 7. Deflection Check
    const E = mat.modulus;
    const I = (1.0 * Math.pow(total_t, 3)) / 12;
    const delta = ((q_applied * Math.pow(cantilever, 4)) / (8 * (E * 1000) * I)) * 1000; // mm
    const delta_limit = (cantilever * 1000) / 100;
    const deflectionUtil = (delta / delta_limit) * 100;

    // 8. Settlement (Elastic approx)
    const E_soil = qa * 150; // Approximated soil modulus
    const settlement = ((q_applied * B * (1 - 0.25)) / (E_soil / 1000)) * 1.1; // mm

    // Status & Rating
    const maxUtil = Math.max(bearingUtil, bendingUtil, shearUtil, punchingUtil, deflectionUtil);
    let rating = 'ACCEPTABLE';
    let ratingColor = '#f59e0b';
    if (maxUtil < 60) {
      rating = 'OPTIMAL';
      ratingColor = '#10b981';
    } else if (maxUtil <= 85) {
      rating = 'EFFICIENT';
      ratingColor = '#06b6d4';
    } else if (maxUtil > 100) {
      rating = 'CRITICAL FAILURE';
      ratingColor = '#ef4444';
    }

    setResults({
      designLoad: P_design,
      q_applied,
      q_allowable: qa,
      L_eff,
      B_eff,
      A_eff,
      bearingUtil,
      bendingStress: sigma_b,
      bendingAllow: sigma_allow,
      bendingUtil,
      shearStress: tau,
      shearAllow: tau_allow,
      shearUtil,
      punchingStress: v_punch,
      punchingAllow: tau_allow * 1.5,
      punchingUtil,
      settlement,
      deflection: delta,
      deflectionLimit: delta_limit,
      deflectionUtil,
      status: maxUtil <= 100 ? 'PASS' : 'FAIL',
      maxUtil,
      rating,
      ratingColor,
    });

    const newWarnings: Warning[] = [];
    if (bearingUtil > 100)
      newWarnings.push({
        type: 'error',
        message: 'Ground bearing capacity exceeded. Increase pad size.',
      });
    if (bendingUtil > 100)
      newWarnings.push({
        type: 'error',
        message: 'Pad flexural failure. Increase thickness or use stronger material.',
      });
    if (cantilever > 1.5)
      newWarnings.push({
        type: 'warning',
        message: 'Large cantilever length found. Verify pad stiffness.',
      });
    if (settlement > 25)
      newWarnings.push({
        type: 'warning',
        message: 'Estimated settlement exceeds 25mm. Verify crane verticality.',
      });
    if (total_t < 0.15)
      newWarnings.push({
        type: 'info',
        message: 'Minimum mat thickness should generally be ≥150mm for stability.',
      });

    setWarnings(newWarnings);
  }, [form]);


  // ===========================================================================
  // CANVAS ENGINE: VISUALIZATION
  // ===========================================================================

  const updateForm = (key: keyof FormData, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const applyCranePreset = (type: string) => {
    const crane = CRANE_DATABASE[type];
    if (crane) {
      setForm((prev) => ({
        ...prev,
        craneType: type,
        outriggerLoad: crane.maxOutriggerLoad.toString(),
      }));
    }
  };

  const applyGroundPreset = (type: string) => {
    const ground = GROUND_CONDITIONS[type];
    if (ground) {
      setForm((prev) => ({
        ...prev,
        groundType: type,
        allowableBearing: ground.bearingCapacity.toString(),
      }));
    }
  };

  const exportPDF = () => {
    if (!results) return;
    const reportData = buildCranePadReport(
      {
        projectName: form.projectName,
        reference: form.reference,
        craneType: form.craneType,
        outriggerLoad: parseFloat(form.outriggerLoad),
        groundType: form.groundType,
        allowableBearing: parseFloat(form.allowableBearing),
        matMaterial: form.matMaterial,
        matLength: parseFloat(form.matLength),
        matWidth: parseFloat(form.matWidth),
        matThickness: parseFloat(form.matThickness),
        numLayers: parseInt(form.numLayers),
        dynamicFactor: parseFloat(form.dynamicFactor),
        safetyFactor: parseFloat(form.safetyFactor),
      } as any,
      results as any,
      warnings as any,
      {
        projectName: form.projectName,
        clientName: 'Standard Client',
        preparedBy: 'BeaverCalc Engine',
      },
    );
    generatePremiumPDF(reportData);
  };

  const exportDOCX = () => {
    if (!results) return;
    const reportData = buildCranePadReport(
      {
        projectName: form.projectName,
        reference: form.reference,
        craneType: form.craneType,
        outriggerLoad: parseFloat(form.outriggerLoad),
        groundType: form.groundType,
        allowableBearing: parseFloat(form.allowableBearing),
        matMaterial: form.matMaterial,
        matLength: parseFloat(form.matLength),
        matWidth: parseFloat(form.matWidth),
        matThickness: parseFloat(form.matThickness),
        numLayers: parseInt(form.numLayers),
        dynamicFactor: parseFloat(form.dynamicFactor),
        safetyFactor: parseFloat(form.safetyFactor),
      } as any,
      results as any,
      warnings as any,
      {
        projectName: form.projectName,
        clientName: 'Standard Client',
        preparedBy: 'BeaverCalc Engine',
      },
    );
    generateDOCX(reportData);
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent mb-4">
            Crane Pad Foundation
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">BS 5975 crane pad & outrigger design</p>
          <div className="flex gap-3 justify-center mt-6">
            <Button
              variant="outline"
              className="border-gray-800 text-gray-400 hover:bg-gray-800"
              onClick={() => setActiveTab('visualization')}
            >
              <FiMaximize2 className="mr-2" /> Visualization
            </Button>
            <Button
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 text-white font-bold"
              onClick={exportPDF}
            >
              <FiDownload className="mr-2" /> Export Report
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              onClick={exportDOCX}
            >
              <FiDownload className="mr-2" /> DOCX
            </Button>
            <SaveRunButton calculatorKey="crane-pad-design" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Workspace (Left) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit mb-4">
              {['input', 'results', 'logic'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    'px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                    activeTab === tab
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                      : 'text-gray-500 hover:text-gray-300',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <CollapsibleSection
                    title="Crane & Loading"
                    icon={
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiActivity className="w-5 h-5 text-neon-cyan" />
                      </motion.div>
                    }
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 flex-1">
                        <label className="text-sm font-semibold text-gray-200 block">
                          Crane Model
                        </label>
                        <select
                          title="Crane Selection"
                          value={form.craneType}
                          onChange={(e) => applyCranePreset(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all outline-none"
                        >
                          {Object.entries(CRANE_DATABASE).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.name} ({v.capacity})
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField
                        label="Characteristic Outrigger Load"
                        value={form.outriggerLoad}
                        onChange={(v) => updateForm('outriggerLoad', v)}
                        unit="kN"
                        info="Maximum working load from crane data sheet."
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <InputField
                        label="Dynamic Impact Factor"
                        value={form.dynamicFactor}
                        onChange={(v) => updateForm('dynamicFactor', v)}
                        info="Typical 1.10 - 1.25 for lifting operations."
                      />
                      <InputField
                        label="Safety Factor (Geotech)"
                        value={form.safetyFactor}
                        onChange={(v) => updateForm('safetyFactor', v)}
                        info="Typical 2.0 or 3.0 depending on ground risk."
                      />
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Ground Conditions"
                    icon={
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiLayers className="w-5 h-5 text-neon-cyan" />
                      </motion.div>
                    }
                    defaultOpen={false}
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 flex-1">
                        <label className="text-sm font-semibold text-gray-200 block">
                          Formation Soil
                        </label>
                        <select
                          title="Ground Condition"
                          value={form.groundType}
                          onChange={(e) => applyGroundPreset(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all outline-none"
                        >
                          {Object.entries(GROUND_CONDITIONS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.icon} {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField
                        label="Allowable Bearing Pressure"
                        value={form.allowableBearing}
                        onChange={(v) => updateForm('allowableBearing', v)}
                        unit="kN/m²"
                      />
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Pad Configuration"
                    icon={
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiGrid className="w-5 h-5 text-neon-cyan" />
                      </motion.div>
                    }
                  >
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-1.5 flex-1">
                        <label className="text-sm font-semibold text-gray-200 block">
                          Mat Material
                        </label>
                        <select
                          title="Mat Material"
                          value={form.matMaterial}
                          onChange={(e) => updateForm('matMaterial', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all outline-none"
                        >
                          {Object.entries(MAT_MATERIALS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.icon} {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField
                        label="Mat Length"
                        value={form.matLength}
                        onChange={(v) => updateForm('matLength', v)}
                        unit="mm"
                      />
                      <InputField
                        label="Mat Width"
                        value={form.matWidth}
                        onChange={(v) => updateForm('matWidth', v)}
                        unit="mm"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <InputField
                        label="Layer Thickness"
                        value={form.matThickness}
                        onChange={(v) => updateForm('matThickness', v)}
                        unit="mm"
                      />
                      <InputField
                        label="Number of Layers"
                        value={form.numLayers}
                        onChange={(v) => updateForm('numLayers', v)}
                      />
                    </div>
                  </CollapsibleSection>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Project Name"
                      value={form.projectName}
                      onChange={(v) => updateForm('projectName', v)}
                      unit=""
                    />
                    <InputField
                      label="Site Reference"
                      value={form.reference}
                      onChange={(v) => updateForm('reference', v)}
                      unit=""
                    />
                  </div>

                  {/* RUN FULL ANALYSIS Button */}
                  <div className="flex justify-center pt-6">
                    <Button
                      onClick={calculate}
                      className="px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:shadow-[0_0_40px_rgba(0,217,255,0.3)] transition-all duration-300 text-white"
                    >
                      RUN FULL ANALYSIS
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'results' && results && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Border-l-4 Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border-l-4 border-emerald-500 bg-gray-900/50 rounded-r-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FiCheck className="text-emerald-400" />
                        <span className="text-sm font-semibold text-gray-200">Bearing</span>
                      </div>
                      <div className="text-xl font-black text-white">{results.bearingUtil.toFixed(1)}%</div>
                    </div>
                    <div className="border-l-4 border-cyan-500 bg-gray-900/50 rounded-r-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FiCheck className="text-cyan-400" />
                        <span className="text-sm font-semibold text-gray-200">Bending</span>
                      </div>
                      <div className="text-xl font-black text-white">{results.bendingUtil.toFixed(1)}%</div>
                    </div>
                    <div className="border-l-4 border-amber-500 bg-gray-900/50 rounded-r-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FiCheck className="text-amber-400" />
                        <span className="text-sm font-semibold text-gray-200">Punching</span>
                      </div>
                      <div className="text-xl font-black text-white">{results.punchingUtil.toFixed(1)}%</div>
                    </div>
                    <div className="border-l-4 border-blue-500 bg-gray-900/50 rounded-r-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FiCheck className="text-blue-400" />
                        <span className="text-sm font-semibold text-gray-200">Deflection</span>
                      </div>
                      <div className="text-xl font-black text-white">{results.deflectionUtil.toFixed(1)}%</div>
                    </div>
                  </div>

                  <Card
                    variant="glass"
                    className="p-1 border-neon-cyan/30 shadow-2xl overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row items-stretch border border-white/10 rounded-2xl overflow-hidden">
                      <div
                        className="p-8 flex items-center justify-center bg-black/40"
                        style={{ color: results.ratingColor }}
                      >
                        {results.status === 'PASS' ? (
                          <FiCheck
                            size={48}
                            className="drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                          />
                        ) : (
                          <FiAlertTriangle
                            size={48}
                            className="drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                          />
                        )}
                      </div>
                      <div className="flex-1 p-8 bg-black/20 border-l border-white/5">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                          Structural Status
                        </div>
                        <div className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">
                          Calculations{' '}
                          <span style={{ color: results.ratingColor }}>{results.status}</span>
                        </div>
                        <p className="text-gray-500 text-xs font-medium">
                          Foundations are rated <span className="text-white">{results.rating}</span>{' '}
                          based on a critical utilisation of{' '}
                          <span className="text-white">{results.maxUtil.toFixed(1)}%</span>.
                        </p>
                      </div>
                      <div className="p-8 bg-black/40 border-l border-white/5 min-w-[180px] flex flex-col justify-center text-center">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                          Max Utilisation
                        </div>
                        <div
                          className="text-4xl font-black italic tracking-tighter"
                          style={{ color: results.ratingColor }}
                        >
                          {results.maxUtil.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <ResultCard
                        label="Ground Bearing"
                        value={results.q_applied.toFixed(1)}
                        unit="kPa"
                        util={results.bearingUtil}
                        status={results.bearingUtil <= 100 ? 'PASS' : 'FAIL'}
                        description="Pressure at formation level after 45° spread."
                      />
                      <ResultCard
                        label="Flexural Strength"
                        value={results.bendingStress.toFixed(1)}
                        unit="MPa"
                        util={results.bendingUtil}
                        status={results.bendingUtil <= 100 ? 'PASS' : 'FAIL'}
                        description="Maximum bending stress in the mat material."
                      />
                    </div>
                    <div className="space-y-4">
                      <ResultCard
                        label="Punching Shear"
                        value={results.punchingStress.toFixed(2)}
                        unit="MPa"
                        util={results.punchingUtil}
                        status={results.punchingUtil <= 100 ? 'PASS' : 'FAIL'}
                        description="Check for outrigger punching through mats."
                      />
                      <ResultCard
                        label="Deflection"
                        value={results.deflection.toFixed(1)}
                        unit="mm"
                        util={results.deflectionUtil}
                        status={results.deflectionUtil <= 100 ? 'PASS' : 'FAIL'}
                        description="Vertical pad displacement under load."
                      />
                    </div>
                  </div>

                  {warnings.length > 0 && (
                    <div className="space-y-2">
                      {warnings.map((w, i) => (
                        <div
                          key={i}
                          className={cn(
                            'px-4 py-3 rounded-xl border flex items-center gap-3 text-xs font-bold',
                            w.type === 'error'
                              ? 'bg-red-500/10 border-red-500/20 text-red-400'
                              : w.type === 'warning'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
                          )}
                        >
                          {w.type === 'error' ? <FiZap /> : <FiAlertTriangle />}
                          {w.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Design Recommendations */}
                  {results && (
                    <Card
                      variant="glass"
                      className="border-neon-cyan/30 shadow-2xl"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                            <FiCheck className="text-white text-[10px]" />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">
                            Design Recommendations
                          </span>
                        </div>
                        <div className="space-y-2">
                          {results.bearingUtil > 80 && (
                            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs">
                              <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                              <span className="text-gray-300">
                                Bearing utilisation {results.bearingUtil.toFixed(0)}% — consider
                                larger pad or deeper spreading layer
                              </span>
                            </div>
                          )}
                          {results.settlement > 15 && (
                            <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs">
                              <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                              <span className="text-gray-300">
                                Settlement {results.settlement.toFixed(1)}mm — monitor crane
                                verticality during lifts
                              </span>
                            </div>
                          )}
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs">
                            <FiCheck className="text-emerald-400 mt-0.5 shrink-0" />
                            <span className="text-gray-300">
                              {results.status === 'PASS'
                                ? `Crane pad adequate — max util ${results.maxUtil.toFixed(0)}% with ${form.matMaterial} mats`
                                : 'Crane pad FAILS — increase pad dimensions or improve ground'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {activeTab === 'logic' && results && (
                <motion.div
                  key="logic"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card
                    variant="glass"
                    className="p-8 border-neon-cyan/30 shadow-2xl"
                  >
                    <div className="space-y-12 font-mono text-xs leading-relaxed text-gray-400">
                      {/* Section 1 */}
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <span className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                            01
                          </span>
                          <h4 className="text-white font-bold uppercase tracking-widest">
                            Factored Loading & Load Spread
                          </h4>
                        </div>
                        <div className="pl-12 space-y-4">
                          <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                            <p className="mb-2 text-white">
                              Characteristic Load ($P_k$) = {form.outriggerLoad} kN
                            </p>
                            <p className="mb-2 text-white">
                              {'Design Load ($P_d$) = $P_k \times \gamma_{dyn} \times \gamma_{SF}$'}
                            </p>
                            <p className="text-cyan-400">{`$P_d = ${form.outriggerLoad} \times ${form.dynamicFactor} \times ${form.safetyFactor} = ${results.designLoad.toFixed(2)} \text{ kN}$`}</p>
                          </div>
                          <p>Effective Load Spread Area based on 45° distribution rule:</p>
                          <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                            <p className="mb-2">
                              {'$L_{eff} = \\min(L, foot + 2 \\times thickness)$'}
                            </p>
                            <p className="text-cyan-400">{`$L_{eff} = \\min(${parseFloat(form.matLength) / 1000}, ${CRANE_DATABASE[form.craneType].outriggerPadSize} + 2 \\times ${results.L_eff}) = ${results.L_eff.toFixed(3)} \text{ m}$`}</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2 */}
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            02
                          </span>
                          <h4 className="text-white font-bold uppercase tracking-widest">
                            Geotechnical Bearing Capacity
                          </h4>
                        </div>
                        <div className="pl-12 space-y-4">
                          <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                            <p className="mb-2">
                              {'Applied Pressure ($q_{Ed}$) = $P_d / A_{eff}$'}
                            </p>
                            <p className="text-emerald-400">{`$q_{Ed} = ${results.designLoad.toFixed(2)} / ${results.A_eff.toFixed(3)} = ${results.q_applied.toFixed(2)} \text{ kN/m}^2$`}</p>
                          </div>
                          <p>Limit State Check:</p>
                          <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                            <p className="mb-2">
                              {'Utilisation = $(q_{Ed} / q_{allowable}) \\times 100$'}
                            </p>
                            <p
                              className={
                                results.bearingUtil > 100 ? 'text-red-400' : 'text-emerald-400'
                              }
                            >
                              {`$(${results.q_applied.toFixed(2)} / ${results.q_allowable.toFixed(1)}) \times 100 = ${results.bearingUtil.toFixed(1)}\%$`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section 3 */}
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                            03
                          </span>
                          <h4 className="text-white font-bold uppercase tracking-widest">
                            Mat Structural Integrity
                          </h4>
                        </div>
                        <div className="pl-12 space-y-4">
                          <p>
                            {'Max Bending Stress ($\\sigma_{b,max}$) calculated per metre width:'}
                          </p>
                          <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                            <p className="mb-2">{'$M_{Ed} = (q_{Ed} \\times a^2) / 2$'}</p>
                            <p className="text-amber-400">{`$\\sigma_{b,max} = ${results.bendingStress.toFixed(2)} \\text{ MPa} \\leq ${results.bendingAllow} \\text{ MPa}$`}</p>
                          </div>
                          <p>Punching Shear Check around outrigger perimeter:</p>
                          <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                            <p className="mb-2">{'$v_{Ed} = P_d / (u \\times t)$'}</p>
                            <p className="text-amber-400">{`$v_{Ed} = ${results.punchingStress.toFixed(2)} \\text{ MPa} \\leq ${results.punchingAllow.toFixed(2)} \\text{ MPa}$`}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'visualization' && (
                <motion.div
                  key="viz"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
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
                          <CranePad3D />
                        </Interactive3DDiagram>
                        <button
                          onClick={() => setPreviewMaximized(false)}
                          className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                          aria-label="Minimize preview"
                        >
                          <FiMinimize2 size={20} />
                        </button>
                        <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                          CRANE PAD DESIGN — REAL-TIME PREVIEW
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
                              <span className="text-white font-mono">{form[s.key as keyof FormData]} {s.unit}</span>
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

                  <WhatIfPreview
                    title="Crane Pad Design — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    onMaximize={() => setPreviewMaximized(true)}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                        <CranePad3D />
                      </Interactive3DDiagram>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 bg-black/40 border-white/5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-black">
                        Est. Settlement
                      </div>
                      <div className="text-xl font-black text-white">
                        {results?.settlement.toFixed(1)}mm
                      </div>
                    </Card>
                    <Card className="p-4 bg-black/40 border-white/5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-black">
                        Effective Span
                      </div>
                      <div className="text-xl font-black text-white">
                        {results?.L_eff.toFixed(2)}m
                      </div>
                    </Card>
                    <Card className="p-4 bg-black/40 border-white/5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-black">
                        Max Deflection
                      </div>
                      <div className="text-xl font-black text-white">
                        {results?.deflection.toFixed(1)}mm
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar (Right) */}
          <div className="lg:col-span-4 space-y-6 sticky top-32 self-start">
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader className="py-4">
                <CardTitle className="text-2xl text-white flex items-center space-x-3">
                  <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                    <FiSettings className="text-neon-cyan text-lg" />
                  </motion.div>
                  <span>Technical Reference</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[
                    'BS EN 1997-1 (EC7)',
                    'CIRIA C703',
                    'BS 5975:2019',
                    'LEEA Guidance on Lifting',
                  ].map((r) => (
                    <div
                      key={r}
                      className="flex items-center justify-between py-2 border-b border-white/5 text-[11px]"
                    >
                      <span className="text-gray-400 font-medium">{r}</span>
                      <FiCheck className="text-emerald-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card
              variant="glass"
              className="p-6 border-neon-cyan/30 shadow-2xl"
            >
              <h4 className="text-2xl text-white font-bold mb-3 flex items-center space-x-3">
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                  <FiLayers className="text-neon-cyan text-lg" />
                </motion.div>
                <span>Geotech Insights</span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-4 italic">
                Allowable bearing pressure ($q_a$) must include a conservative factor of safety for
                mobile crane operations due to uneven site gradients.
              </p>
              <div className="p-4 bg-black/40 rounded-xl space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500 uppercase">Subgrade Group</span>
                  <span className="text-white font-bold">
                    {GROUND_CONDITIONS[form.groundType].name}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500 uppercase">Design Risk</span>
                  <span className="text-amber-400 font-bold uppercase">Medium</span>
                </div>
              </div>
            </Card>

            <Button
              variant="outline"
              className="w-full py-6 border-dashed border-gray-800 text-gray-500 hover:text-white hover:border-cyan-500/50 transition-all font-black uppercase tracking-widest text-[10px]"
              onClick={() => applyCranePreset('mobile_30t')}
            >
              Reset to Standard 30t Config
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CranePadDesign;
