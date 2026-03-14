// =============================================================================
// Sensitivity Analysis Calculator — Exceptional Edition
// Monte Carlo Simulation & Parametric Study — Probabilistic Structural Analysis
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiBarChart2,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiInfo,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiPlay,
    FiSettings,
    FiSliders,
    FiTarget,
    FiTrendingUp,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import Sensitivity3D from '../../components/3d/scenes/Sensitivity3D';
import ErrorBoundary from '../../components/ErrorBoundary';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview, { type WhatIfSlider } from '../../components/WhatIfPreview';
// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Parameter {
  id: string;
  name: string;
  label: string;
  nominal: string;
  min: string;
  max: string;
  unit: string;
  distribution: 'uniform' | 'normal' | 'triangular' | 'lognormal';
  enabled: boolean;
}

interface SimulationResult {
  runNumber: number;
  parameters: Record<string, number>;
  utilisation: number;
  status: 'PASS' | 'FAIL';
}

interface SensitivityIndex {
  parameter: string;
  correlation: number;
  impact: number;
  rank: number;
}

interface Statistics {
  mean: number;
  stdDev: number;
  median: number;
  min: number;
  max: number;
  percentile5: number;
  percentile95: number;
  percentile99: number;
  failureCount: number;
  probabilityOfFailure: number;
  reliabilityIndex: number;
  sensitivities: SensitivityIndex[];
  histogram: { bin: number; count: number }[];
}

interface FormData {
  calculatorType: string;
  numSimulations: string;
  seed: string;
  targetReliability: string;
  projectName: string;
  reference: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const CALCULATOR_TYPES = {
  steel_beam: { name: 'Steel Beam (EN 1993)', defaultParams: 'steel' },
  composite_beam: { name: 'Composite Beam (EN 1994)', defaultParams: 'composite' },
  rc_beam: { name: 'RC Beam (EN 1992)', defaultParams: 'concrete' },
  timber_beam: { name: 'Timber Beam (EN 1995)', defaultParams: 'timber' },
  pad_footing: { name: 'Pad Footing (EN 1997)', defaultParams: 'foundation' },
  sheet_pile: { name: 'Sheet Pile Wall (EN 1997)', defaultParams: 'geotech' },
};

const DEFAULT_PARAMETERS: Record<string, Parameter[]> = {
  steel: [
    {
      id: '1',
      name: 'span',
      label: 'Span Length',
      nominal: '8',
      min: '6',
      max: '10',
      unit: 'm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '2',
      name: 'depth',
      label: 'Section Depth',
      nominal: '450',
      min: '400',
      max: '500',
      unit: 'mm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '3',
      name: 'webThk',
      label: 'Web Thickness',
      nominal: '10',
      min: '8',
      max: '12',
      unit: 'mm',
      distribution: 'uniform',
      enabled: true,
    },
    {
      id: '4',
      name: 'flangeWidth',
      label: 'Flange Width',
      nominal: '190',
      min: '170',
      max: '210',
      unit: 'mm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '5',
      name: 'flangeThk',
      label: 'Flange Thickness',
      nominal: '14',
      min: '12',
      max: '16',
      unit: 'mm',
      distribution: 'uniform',
      enabled: true,
    },
    {
      id: '6',
      name: 'fy',
      label: 'Yield Strength',
      nominal: '355',
      min: '335',
      max: '375',
      unit: 'MPa',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '7',
      name: 'deadLoad',
      label: 'Dead Load',
      nominal: '10',
      min: '8',
      max: '12',
      unit: 'kN/m',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '8',
      name: 'liveLoad',
      label: 'Live Load',
      nominal: '15',
      min: '10',
      max: '20',
      unit: 'kN/m',
      distribution: 'triangular',
      enabled: true,
    },
  ],
  composite: [
    {
      id: '1',
      name: 'span',
      label: 'Span Length',
      nominal: '10',
      min: '8',
      max: '12',
      unit: 'm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '2',
      name: 'depth',
      label: 'Steel Depth',
      nominal: '400',
      min: '350',
      max: '450',
      unit: 'mm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '3',
      name: 'slabDepth',
      label: 'Slab Depth',
      nominal: '130',
      min: '110',
      max: '150',
      unit: 'mm',
      distribution: 'uniform',
      enabled: true,
    },
    {
      id: '4',
      name: 'fck',
      label: 'Concrete fck',
      nominal: '30',
      min: '25',
      max: '35',
      unit: 'MPa',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '5',
      name: 'fy',
      label: 'Steel fy',
      nominal: '355',
      min: '335',
      max: '375',
      unit: 'MPa',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '6',
      name: 'liveLoad',
      label: 'Live Load',
      nominal: '5',
      min: '3',
      max: '7',
      unit: 'kN/m²',
      distribution: 'triangular',
      enabled: true,
    },
  ],
  concrete: [
    {
      id: '1',
      name: 'span',
      label: 'Span Length',
      nominal: '6',
      min: '5',
      max: '7',
      unit: 'm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '2',
      name: 'width',
      label: 'Beam Width',
      nominal: '300',
      min: '250',
      max: '350',
      unit: 'mm',
      distribution: 'uniform',
      enabled: true,
    },
    {
      id: '3',
      name: 'depth',
      label: 'Beam Depth',
      nominal: '500',
      min: '450',
      max: '550',
      unit: 'mm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '4',
      name: 'fck',
      label: 'Concrete fck',
      nominal: '30',
      min: '25',
      max: '35',
      unit: 'MPa',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '5',
      name: 'fyk',
      label: 'Rebar fyk',
      nominal: '500',
      min: '480',
      max: '520',
      unit: 'MPa',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '6',
      name: 'As',
      label: 'Steel Area',
      nominal: '1200',
      min: '1000',
      max: '1400',
      unit: 'mm²',
      distribution: 'uniform',
      enabled: true,
    },
  ],
  timber: [
    {
      id: '1',
      name: 'span',
      label: 'Span Length',
      nominal: '4',
      min: '3',
      max: '5',
      unit: 'm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '2',
      name: 'width',
      label: 'Section Width',
      nominal: '75',
      min: '63',
      max: '100',
      unit: 'mm',
      distribution: 'uniform',
      enabled: true,
    },
    {
      id: '3',
      name: 'depth',
      label: 'Section Depth',
      nominal: '200',
      min: '175',
      max: '225',
      unit: 'mm',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '4',
      name: 'fm_k',
      label: 'Bending Strength',
      nominal: '24',
      min: '20',
      max: '28',
      unit: 'MPa',
      distribution: 'lognormal',
      enabled: true,
    },
    {
      id: '5',
      name: 'liveLoad',
      label: 'Live Load',
      nominal: '2.5',
      min: '1.5',
      max: '3.5',
      unit: 'kN/m²',
      distribution: 'triangular',
      enabled: true,
    },
  ],
  foundation: [
    {
      id: '1',
      name: 'Lf',
      label: 'Footing Length',
      nominal: '2.5',
      min: '2.0',
      max: '3.0',
      unit: 'm',
      distribution: 'uniform',
      enabled: true,
    },
    {
      id: '2',
      name: 'Bf',
      label: 'Footing Width',
      nominal: '2.5',
      min: '2.0',
      max: '3.0',
      unit: 'm',
      distribution: 'uniform',
      enabled: true,
    },
    {
      id: '3',
      name: 'phi',
      label: 'Friction Angle',
      nominal: '32',
      min: '28',
      max: '36',
      unit: '°',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '4',
      name: 'gamma',
      label: 'Soil Unit Weight',
      nominal: '18',
      min: '16',
      max: '20',
      unit: 'kN/m³',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '5',
      name: 'Nk',
      label: 'Characteristic Load',
      nominal: '800',
      min: '700',
      max: '900',
      unit: 'kN',
      distribution: 'normal',
      enabled: true,
    },
  ],
  geotech: [
    {
      id: '1',
      name: 'H',
      label: 'Excavation Depth',
      nominal: '4',
      min: '3',
      max: '5',
      unit: 'm',
      distribution: 'uniform',
      enabled: true,
    },
    {
      id: '2',
      name: 'phi',
      label: 'Friction Angle',
      nominal: '30',
      min: '26',
      max: '34',
      unit: '°',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '3',
      name: 'gamma',
      label: 'Soil Unit Weight',
      nominal: '18',
      min: '16',
      max: '20',
      unit: 'kN/m³',
      distribution: 'normal',
      enabled: true,
    },
    {
      id: '4',
      name: 'surcharge',
      label: 'Surcharge',
      nominal: '10',
      min: '5',
      max: '15',
      unit: 'kPa',
      distribution: 'triangular',
      enabled: true,
    },
  ],
};

const DISTRIBUTION_INFO = {
  uniform: { name: 'Uniform', description: 'Equal probability across range' },
  normal: { name: 'Normal (Gaussian)', description: 'Bell curve centered on nominal' },
  triangular: { name: 'Triangular', description: 'Peak at nominal value' },
  lognormal: { name: 'Log-Normal', description: 'Skewed, always positive' },
};

// =============================================================================
// COLLAPSIBLE SECTION COMPONENT
// =============================================================================

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700/50 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-cyan-400">{icon}</span>
          <span className="font-medium text-white">{title}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronDown className="text-cyan-400" />
        </motion.div>
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-4 bg-gray-950/50">{children}</div>
        </motion.div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PRESETS = {
  steel_girder_sensitivity: {
    name: 'Bridge Steel Girder (1000 sims)',
    calculatorType: 'steel_beam',
    numSimulations: '1000',
    targetReliability: '3.8',
  },
  composite_deck_sensitivity: {
    name: 'Composite Deck Beam (2000 sims)',
    calculatorType: 'composite_beam',
    numSimulations: '2000',
    targetReliability: '3.8',
  },
  rc_pier_sensitivity: {
    name: 'RC Pier / Crosshead (1000 sims)',
    calculatorType: 'rc_beam',
    numSimulations: '1000',
    targetReliability: '3.8',
  },
  pad_footing_sensitivity: {
    name: 'Bridge Pad Footing (1500 sims)',
    calculatorType: 'pad_footing',
    numSimulations: '1500',
    targetReliability: '3.3',
  },
  timber_footbridge_sensitivity: {
    name: 'Timber Footbridge Beam (500 sims)',
    calculatorType: 'timber_beam',
    numSimulations: '500',
    targetReliability: '3.3',
  },
  sheet_pile_sensitivity: {
    name: 'Sheet Pile Abutment (1000 sims)',
    calculatorType: 'sheet_pile',
    numSimulations: '1000',
    targetReliability: '3.3',
  },
};

/** Compact number formatter — keeps large values from overflowing UI cells */
const fmtCompact = (v: number, dp = 1): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(v / 1_000).toFixed(1)}k`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(2)}k`;
  return v.toFixed(dp);
};

const Sensitivity: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'results' | 'visualization'>('setup');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([10, 6, 10]);

  const histogramRef = useRef<HTMLCanvasElement>(null);

  const cameraPresets = [
    { label: '3D', icon: '🎯', pos: [10, 6, 10] as [number, number, number] },
    { label: 'Front', icon: '👁️', pos: [0, 3, 12] as [number, number, number] },
    { label: 'Top', icon: '⬇️', pos: [0, 14, 0.1] as [number, number, number] },
    { label: 'Side', icon: '➡️', pos: [12, 3, 0] as [number, number, number] },
  ];

  const [form, setForm] = useState<FormData>({
    calculatorType: 'steel_beam',
    numSimulations: '1000',
    seed: '',
    targetReliability: '3.8',
    projectName: 'Sensitivity Analysis',
    reference: 'SA-001',
  });

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (preset) {
      const { name, ...values } = preset;
      setForm((prev: any) => ({ ...prev, ...values }));
    }
  };

  const [parameters, setParameters] = useState<Parameter[]>(DEFAULT_PARAMETERS.steel);


  const updateForm = (field: keyof FormData, value: string) => {
    setForm((prev) => {
      const newForm = { ...prev, [field]: value };
      if (field === 'calculatorType') {
        const calcType = CALCULATOR_TYPES[value as keyof typeof CALCULATOR_TYPES];
        if (calcType) {
          setParameters(DEFAULT_PARAMETERS[calcType.defaultParams] || DEFAULT_PARAMETERS.steel);
        }
      }
      return newForm;
    });
  };

  const updateParameter = (id: string, field: keyof Parameter, value: any) => {
    setParameters((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  // Random value generation
  const generateRandomValue = useCallback((param: Parameter): number => {
    const min = parseFloat(param.min);
    const max = parseFloat(param.max);
    const nominal = parseFloat(param.nominal);

    switch (param.distribution) {
      case 'uniform':
        return min + Math.random() * (max - min);

      case 'normal': {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const stdDev = (max - min) / 6;
        return Math.max(min, Math.min(max, nominal + z * stdDev));
      }

      case 'triangular': {
        const u = Math.random();
        const fc = (nominal - min) / (max - min);
        if (u < fc) {
          return min + Math.sqrt(u * (max - min) * (nominal - min));
        } else {
          return max - Math.sqrt((1 - u) * (max - min) * (max - nominal));
        }
      }

      case 'lognormal': {
        const mu = Math.log(nominal);
        const sigma = Math.log(max / nominal) / 2;
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(min, Math.min(max, Math.exp(mu + sigma * z)));
      }

      default:
        return nominal;
    }
  }, []);

  // Simplified calculation (representative)
  const runCalculation = useCallback(
    (params: Record<string, number>): number => {
      const calcType = form.calculatorType;

      if (calcType === 'steel_beam') {
        const L = (params.span || 8) * 1000;
        const h = params.depth || 450;
        const tw = params.webThk || 10;
        const bf = params.flangeWidth || 190;
        const tf = params.flangeThk || 14;
        const fy = params.fy || 355;
        const qDL = params.deadLoad || 10;
        const qLL = params.liveLoad || 15;

        const Wpl = bf * tf * (h - tf) + (tw * (h - 2 * tf) ** 2) / 4;
        const qULS = 1.35 * qDL + 1.5 * qLL;
        const MEd = (qULS * L ** 2) / 8 / 1e6;
        const McRd = (Wpl * fy) / 1e6;

        return (MEd / McRd) * 100;
      }

      if (calcType === 'rc_beam') {
        const L = (params.span || 6) * 1000;
        const b = params.width || 300;
        const d = (params.depth || 500) - 50;
        const fck = params.fck || 30;
        const fyk = params.fyk || 500;
        const As = params.As || 1200;

        const fcd = (0.85 * fck) / 1.5;
        const fyd = fyk / 1.15;
        const z = 0.9 * d;
        const MRd = (As * fyd * z) / 1e6;

        const qULS = 1.35 * 10 + 1.5 * 5;
        const MEd = (qULS * L ** 2) / 8 / 1e6;

        return (MEd / MRd) * 100;
      }

      if (calcType === 'pad_footing') {
        const Lf = params.Lf || 2.5;
        const Bf = params.Bf || 2.5;
        const phi = params.phi || 32;
        const gamma = params.gamma || 18;
        const Nk = params.Nk || 800;

        const phiRad = (phi * Math.PI) / 180;
        const Nq = Math.exp(Math.PI * Math.tan(phiRad)) * Math.tan(Math.PI / 4 + phiRad / 2) ** 2;
        const Nc = (Nq - 1) / Math.tan(phiRad);
        const Ngamma = 2 * (Nq - 1) * Math.tan(phiRad);

        const q0 = gamma * 1.0; // 1m embedment
        const qu = (0.5 * gamma * Bf * Ngamma + q0 * Nq) / 3;
        const Rd = qu * Lf * Bf;

        return ((Nk * 1.35) / Rd) * 100;
      }

      if (calcType === 'composite_beam') {
        // EN 1994 — simplified composite beam bending
        const L = (params.span || 10) * 1000; // mm
        const h_s = params.depth || 400; // mm steel depth
        const h_c = params.slabDepth || 130; // mm slab depth
        const fck = params.fck || 30; // MPa
        const fy = params.fy || 355; // MPa
        const qLL = params.liveLoad || 5; // kN/m²
        const trib = 3; // m tributary width assumed

        const qULS = (1.35 * 5 + 1.5 * qLL) * trib; // kN/m (DL=5 assumed)
        const MEd = (qULS * L ** 2) / 8 / 1e6; // kNm

        // Steel: approximate IPE/HEA — Wpl ≈ b*tf*(h-tf) + tw*(h-2tf)²/4
        const bf = 180;
        const tf = 13;
        const tw = 9;
        const Wpl_steel = bf * tf * (h_s - tf) + (tw * (h_s - 2 * tf) ** 2) / 4; // mm³
        const Na_s = ((Wpl_steel * fy) / (h_s / 2)) * 1e-3; // approximate axial in steel (kN)

        // Concrete compression
        const beff = Math.min(L / 4, trib * 1000); // effective width mm
        const fcd = (0.85 * fck) / 1.5;
        const Nc_slab = (fcd * beff * h_c) / 1e3; // kN

        const F_comp = Math.min(Na_s, Nc_slab);
        const lever = h_s / 2 + h_c / 2; // mm — simplified NA
        const MRd = (F_comp * lever) / 1e6; // kNm

        return MRd > 0 ? (MEd / MRd) * 100 : 100;
      }

      if (calcType === 'timber_beam') {
        // EN 1995 — timber beam bending check
        const L = (params.span || 4) * 1000; // mm
        const b = params.width || 75; // mm
        const h = params.depth || 200; // mm
        const fm_k = params.fm_k || 24; // MPa
        const qLL = params.liveLoad || 2.5; // kN/m²
        const trib = 0.6; // m spacing assumed

        const kmod = 0.8; // medium-term
        const gamma_M = 1.3; // timber
        const fm_d = (kmod * fm_k) / gamma_M;

        const qULS = (1.35 * 0.5 + 1.5 * qLL) * trib; // kN/m
        const MEd = (qULS * L ** 2) / 8 / 1e6; // kNm
        const Wel = (b * h ** 2) / 6 / 1e9; // m³
        const MRd = fm_d * Wel * 1e3; // kNm

        return MRd > 0 ? (MEd / MRd) * 100 : 100;
      }

      if (calcType === 'sheet_pile') {
        // EN 1997 — simplified Rankine earth pressure check
        const H = params.H || 4; // m
        const phi = params.phi || 30; // °
        const gamma = params.gamma || 18; // kN/m³
        const q = params.surcharge || 10; // kPa

        const phiRad = (phi * Math.PI) / 180;
        const Ka = (1 - Math.sin(phiRad)) / (1 + Math.sin(phiRad));
        const Kp = 1 / Ka;

        // Active side driving moment about toe
        const pa_soil = Ka * gamma * H; // kPa at base
        const pa_surcharge = Ka * q; // kPa uniform
        const Fa_soil = 0.5 * pa_soil * H; // kN/m
        const Fa_surcharge = pa_surcharge * H; // kN/m
        const Ma = (Fa_soil * H) / 3 + (Fa_surcharge * H) / 2;

        // Passive side resisting moment (embedment = 0.6H assumed)
        const d = 0.6 * H;
        const pp_base = Kp * gamma * d;
        const Fp = 0.5 * pp_base * d;
        const Mp = (Fp * d) / 3;

        return Mp > 0 ? (Ma / Mp) * 100 : 100;
      }

      // Default: generic utilisation
      return 50 + Math.random() * 50;
    },
    [form.calculatorType],
  );

  // Validation
  const validateInputs = (): boolean => {
    const errors: string[] = [];
    const numSim = parseInt(form.numSimulations);
    if (isNaN(numSim) || numSim < 1) errors.push('Number of simulations must be at least 1');
    if (numSim > 100000) errors.push('Number of simulations should not exceed 100,000');
    const enabledParams = parameters.filter((p) => p.enabled);
    if (enabledParams.length === 0) errors.push('At least one parameter must be enabled');
    enabledParams.forEach((p) => {
      const nom = parseFloat(p.nominal);
      const min = parseFloat(p.min);
      const max = parseFloat(p.max);
      if (isNaN(nom)) errors.push(`${p.label}: nominal value must be a number`);
      if (isNaN(min) || isNaN(max)) errors.push(`${p.label}: min and max must be numbers`);
      else if (min >= max) errors.push(`${p.label}: min must be less than max`);
    });
    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }
    setValidationErrors([]);
    return true;
  };

  // Run Monte Carlo
  const runMonteCarloSimulation = async () => {
    if (!validateInputs()) return;
    setIsRunning(true);
    setProgress(0);
    setActiveTab('results');

    const numSim = parseInt(form.numSimulations) || 1000;
    const simulationResults: SimulationResult[] = [];
    const enabledParams = parameters.filter((p) => p.enabled);

    for (let i = 0; i < numSim; i++) {
      const paramValues: Record<string, number> = {};

      parameters.forEach((param) => {
        paramValues[param.name] = param.enabled
          ? generateRandomValue(param)
          : parseFloat(param.nominal);
      });

      const utilisation = runCalculation(paramValues);

      simulationResults.push({
        runNumber: i + 1,
        parameters: paramValues,
        utilisation,
        status: utilisation <= 100 ? 'PASS' : 'FAIL',
      });

      if (i % 50 === 0) {
        setProgress(((i + 1) / numSim) * 100);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    setResults(simulationResults);
    calculateStatistics(simulationResults, enabledParams);
    setIsRunning(false);
    setProgress(100);
  };

  const calculateStatistics = (simResults: SimulationResult[], enabledParams: Parameter[]) => {
    const utilisations = simResults.map((r) => r.utilisation);
    const n = utilisations.length;
    const mean = utilisations.reduce((a, b) => a + b, 0) / n;
    const variance = utilisations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const sorted = [...utilisations].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[n - 1];
    const median = sorted[Math.floor(n / 2)];
    const percentile5 = sorted[Math.floor(n * 0.05)];
    const percentile95 = sorted[Math.floor(n * 0.95)];
    const percentile99 = sorted[Math.floor(n * 0.99)];
    const failureCount = simResults.filter((r) => r.status === 'FAIL').length;
    const probabilityOfFailure = (failureCount / n) * 100;

    // Reliability index (simplified)
    const reliabilityIndex = (100 - mean) / stdDev;

    // Sensitivities
    const sensitivities: SensitivityIndex[] = enabledParams
      .map((param) => {
        const paramValues = simResults.map((r) => r.parameters[param.name]);
        const meanParam = paramValues.reduce((a, b) => a + b, 0) / n;

        let covariance = 0;
        let varParam = 0;

        for (let i = 0; i < n; i++) {
          covariance += (paramValues[i] - meanParam) * (utilisations[i] - mean);
          varParam += Math.pow(paramValues[i] - meanParam, 2);
        }

        const correlation = varParam > 0 ? covariance / Math.sqrt(varParam * variance) : 0;

        return {
          parameter: param.label,
          correlation: Math.abs(correlation),
          impact: correlation * stdDev,
          rank: 0,
        };
      })
      .sort((a, b) => b.correlation - a.correlation)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    // Histogram
    const numBins = 20;
    const binWidth = (max - min) / numBins;
    const histogram = Array.from({ length: numBins }, (_, i) => ({
      bin: min + (i + 0.5) * binWidth,
      count: 0,
    }));
    utilisations.forEach((u) => {
      const binIndex = Math.min(Math.floor((u - min) / binWidth), numBins - 1);
      histogram[binIndex].count++;
    });

    setStatistics({
      mean,
      stdDev,
      median,
      min,
      max,
      percentile5,
      percentile95,
      percentile99,
      failureCount,
      probabilityOfFailure,
      reliabilityIndex,
      sensitivities,
      histogram,
    });

    // Generate warnings
    const w: string[] = [];
    const targetBeta = parseFloat(form.targetReliability) || 3.8;
    if (reliabilityIndex < targetBeta)
      w.push(
        `Reliability index \u03B2=${reliabilityIndex.toFixed(2)} below target ${targetBeta.toFixed(1)}`,
      );
    if (probabilityOfFailure > 1)
      w.push(
        `Probability of failure ${probabilityOfFailure.toFixed(2)}% exceeds 1% \u2014 review design`,
      );
    if (percentile95 > 100)
      w.push(`95th percentile utilisation ${percentile95.toFixed(1)}% exceeds capacity`);
    if (stdDev > 30)
      w.push(`High variability (\u03C3=${stdDev.toFixed(1)}%) \u2014 consider tighter tolerances`);
    setWarnings(w);
  };

  // Draw histogram
  useEffect(() => {
    if (!statistics || !histogramRef.current) return;
    const canvas = histogramRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const { histogram, mean, percentile95 } = statistics;
    const maxCount = Math.max(...histogram.map((h) => h.count));
    const padding = { left: 50, right: 20, top: 30, bottom: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = chartWidth / histogram.length - 2;

    // Background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Bars
    histogram.forEach((h, i) => {
      const barHeight = (h.count / maxCount) * chartHeight;
      const x = padding.left + i * (chartWidth / histogram.length) + 1;
      const y = padding.top + chartHeight - barHeight;

      // Color based on utilisation
      ctx.fillStyle = h.bin > 100 ? '#ef4444' : h.bin > 85 ? '#f59e0b' : '#22c55e';
      ctx.fillRect(x, y, barWidth, barHeight);
    });

    // Mean line
    const meanX =
      padding.left + ((mean - statistics.min) / (statistics.max - statistics.min)) * chartWidth;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(meanX, padding.top);
    ctx.lineTo(meanX, padding.top + chartHeight);
    ctx.stroke();

    // 95th percentile line
    const p95X =
      padding.left +
      ((percentile95 - statistics.min) / (statistics.max - statistics.min)) * chartWidth;
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(p95X, padding.top);
    ctx.lineTo(p95X, padding.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // 100% threshold
    const threshold100 =
      padding.left + ((100 - statistics.min) / (statistics.max - statistics.min)) * chartWidth;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(threshold100, padding.top);
    ctx.lineTo(threshold100, padding.top + chartHeight);
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Utilisation (%)', width / 2, height - 5);
    ctx.fillText(`${statistics.min.toFixed(0)}%`, padding.left, height - 25);
    ctx.fillText(`${statistics.max.toFixed(0)}%`, width - padding.right, height - 25);

    // Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(`Mean: ${mean.toFixed(1)}%`, padding.left, 15);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`P95: ${percentile95.toFixed(1)}%`, padding.left + 100, 15);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('Limit: 100%', padding.left + 200, 15);
  }, [statistics]);

  // Draw tornado

  // ─── Computed values for 3D ───────────────────────────────────────────────
  const overallPass = statistics
    ? statistics.reliabilityIndex >= parseFloat(form.targetReliability)
    : true;
  const calcName = (CALCULATOR_TYPES as any)[form.calculatorType]?.name || form.calculatorType;

  const whatIfSliders: WhatIfSlider[] = [
    { key: 'numSimulations', label: 'Simulation Count', min: 100, max: 10000, step: 100, unit: 'runs' },
    { key: 'targetReliability', label: 'Target Reliability β', min: 1.0, max: 5.0, step: 0.1, unit: '' },
  ];

  // 3D scene element (shared across usages)
  const render3DScene = (height: string) => (
    <ErrorBoundary
      fallback={
        <div
          className={`relative ${height} w-full rounded-xl overflow-hidden border border-gray-700/50 bg-gray-950 flex items-center justify-center`}
        >
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-gray-400 text-sm">3D preview unavailable</p>
            <p className="text-gray-500 text-xs">Your browser may have limited WebGL support</p>
          </div>
        </div>
      }
    >
      <Interactive3DDiagram
        height={height}
        cameraPosition={cameraPos}
        cameraTarget={[0, 1.0, 0]}
        status={overallPass ? 'PASS' : 'FAIL'}
      >
        <Sensitivity3D
          calculatorType={form.calculatorType}
          mean={statistics?.mean ?? 65}
          stdDev={statistics?.stdDev ?? 12}
          percentile95={statistics?.percentile95 ?? 85}
          reliabilityIndex={statistics?.reliabilityIndex ?? 3.5}
          targetReliability={parseFloat(form.targetReliability) || 3.8}
          probabilityOfFailure={statistics?.probabilityOfFailure ?? 0}
          sensitivities={
            statistics?.sensitivities?.map((s) => ({
              parameter: s.parameter,
              correlation: s.correlation,
              rank: s.rank,
            })) ?? []
          }
          histogram={statistics?.histogram ?? []}
          simCount={results.length || parseInt(form.numSimulations) || 1000}
          status={overallPass ? 'PASS' : 'FAIL'}
        />
      </Interactive3DDiagram>
    </ErrorBoundary>
  );

  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!statistics || results.length === 0) return;

    const maxUtil = Math.max(...results.map((r) => r.utilisation));
    const getStatus = (pass: boolean): 'PASS' | 'FAIL' => (pass ? 'PASS' : 'FAIL');
    const calcName = (CALCULATOR_TYPES as any)[form.calculatorType]?.name || form.calculatorType;
    const targetBeta = parseFloat(form.targetReliability) || 3.8;

    // Build recommendations based on results
    const recommendations: { check: string; suggestion: string }[] = [];
    if (statistics.reliabilityIndex < targetBeta)
      recommendations.push({
        check: 'Reliability Index',
        suggestion: `β = ${statistics.reliabilityIndex.toFixed(2)} is below target ${targetBeta.toFixed(1)}. Consider increasing member capacity or reducing load variability.`,
      });
    if (statistics.probabilityOfFailure > 1)
      recommendations.push({
        check: 'Failure Probability',
        suggestion: `Pf = ${statistics.probabilityOfFailure.toFixed(2)}% is excessive. Increase section size or upgrade material grade.`,
      });
    if (statistics.percentile95 > 100)
      recommendations.push({
        check: '95th Percentile',
        suggestion: `P95 = ${statistics.percentile95.toFixed(1)}% exceeds capacity. Stiffen the design or reduce load uncertainty.`,
      });
    if (statistics.stdDev > 30)
      recommendations.push({
        check: 'High Variability',
        suggestion: `σ = ${statistics.stdDev.toFixed(1)}% indicates significant scatter. Tighten material/load tolerances.`,
      });

    generatePremiumPDF({
      title: 'Sensitivity & Reliability Analysis',
      subtitle: `Monte Carlo Simulation — ${calcName}`,
      projectInfo: [
        { label: 'Project', value: form.projectName || 'Sensitivity Analysis' },
        { label: 'Reference', value: form.reference || 'SA-001' },
        {
          label: 'Design Code',
          value: form.calculatorType.includes('steel')
            ? 'EN 1993-1-1'
            : form.calculatorType.includes('composite')
              ? 'EN 1994-1-1'
              : form.calculatorType.includes('rc')
                ? 'EN 1992-1-1'
                : form.calculatorType.includes('timber')
                  ? 'EN 1995-1-1'
                  : 'EN 1997-1',
        },
        { label: 'Assessment Method', value: 'Monte Carlo Simulation (MCS)' },
      ],
      inputs: [
        { label: 'Calculator Type', value: calcName },
        { label: 'Simulations', value: results.length.toLocaleString() },
        { label: 'Target Reliability', value: `β = ${form.targetReliability}` },
        { label: 'Achieved Reliability', value: `β = ${statistics.reliabilityIndex.toFixed(2)}` },
        { label: 'Mean Utilisation', value: `${statistics.mean.toFixed(1)}%` },
        { label: 'Std Deviation', value: `${statistics.stdDev.toFixed(2)}%` },
        { label: 'Minimum', value: `${statistics.min.toFixed(1)}%` },
        { label: 'Maximum', value: `${statistics.max.toFixed(1)}%` },
        { label: '5th Percentile', value: `${statistics.percentile5.toFixed(1)}%` },
        { label: '95th Percentile', value: `${statistics.percentile95.toFixed(1)}%` },
        { label: '99th Percentile', value: `${statistics.percentile99.toFixed(1)}%` },
        { label: 'Median', value: `${statistics.median.toFixed(1)}%` },
        { label: 'Failure Count', value: `${statistics.failureCount} / ${results.length}` },
        {
          label: 'Probability of Failure',
          value: `${statistics.probabilityOfFailure.toFixed(3)}%`,
        },
      ],
      sections: [
        {
          title: 'Input Parameter Distributions',
          head: [['Parameter', 'Nominal', 'Min', 'Max', 'Unit', 'Distribution']],
          body: parameters
            .filter((p) => p.enabled)
            .map((p) => [
              p.label,
              p.nominal,
              p.min,
              p.max,
              p.unit,
              DISTRIBUTION_INFO[p.distribution].name,
            ]),
        },
        {
          title: 'Sensitivity Ranking (Correlation Index)',
          head: [['Rank', 'Parameter', 'Correlation', 'Impact']],
          body: statistics.sensitivities.map((s) => [
            `#${s.rank}`,
            s.parameter,
            `${(s.correlation * 100).toFixed(1)}%`,
            s.impact.toFixed(3),
          ]),
        },
      ],
      checks: [
        {
          name: 'Reliability Index (β ≥ target)',
          capacity: `β = ${statistics.reliabilityIndex.toFixed(2)}`,
          utilisation: `Target: ${form.targetReliability}`,
          status: getStatus(statistics.reliabilityIndex >= targetBeta),
        },
        {
          name: 'Probability of Failure (Pf < 5%)',
          capacity: `Pf = ${statistics.probabilityOfFailure.toFixed(3)}%`,
          utilisation: `${statistics.failureCount} failures`,
          status: getStatus(statistics.probabilityOfFailure < 5),
        },
        {
          name: '95th Percentile Utilisation (≤ 100%)',
          capacity: `${statistics.percentile95.toFixed(1)}%`,
          utilisation: `${statistics.percentile95.toFixed(1)}%`,
          status: getStatus(statistics.percentile95 <= 100),
        },
        {
          name: 'Maximum Utilisation',
          capacity: `${maxUtil.toFixed(1)}%`,
          utilisation: `${maxUtil.toFixed(1)}%`,
          status: getStatus(maxUtil <= 100),
        },
        {
          name: 'Mean Utilisation (< 85% target)',
          capacity: `${statistics.mean.toFixed(1)}%`,
          utilisation: `${statistics.mean.toFixed(1)}%`,
          status: getStatus(statistics.mean <= 85),
        },
        {
          name: 'Coefficient of Variation (σ/μ < 0.3)',
          capacity: `${(statistics.stdDev / statistics.mean).toFixed(3)}`,
          utilisation: `σ = ${statistics.stdDev.toFixed(2)}%`,
          status: getStatus(statistics.stdDev / statistics.mean < 0.3),
        },
      ],
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      footerNote:
        'Beaver Bridges Ltd — Sensitivity & Reliability Analysis (Monte Carlo Simulation)',
    });
  };

  const handleExportDOCX = () => {
    if (!statistics || results.length === 0) return;
    const calcName = (CALCULATOR_TYPES as any)[form.calculatorType]?.name || form.calculatorType;
    const targetBeta = parseFloat(form.targetReliability) || 3.8;
    generateDOCX({
      title: 'Sensitivity & Reliability Analysis',
      subtitle: `Monte Carlo Simulation — ${calcName}`,
      projectInfo: [
        { label: 'Project', value: form.projectName || 'Sensitivity Analysis' },
        { label: 'Reference', value: form.reference || 'SA-001' },
        { label: 'Assessment Method', value: 'Monte Carlo Simulation (MCS)' },
      ],
      inputs: [
        { label: 'Calculator Type', value: calcName },
        { label: 'Simulations', value: results.length.toLocaleString() },
        { label: 'Target Reliability', value: `β = ${form.targetReliability}` },
        { label: 'Achieved Reliability', value: `β = ${statistics.reliabilityIndex.toFixed(2)}` },
        { label: 'Mean Utilisation', value: `${statistics.mean.toFixed(1)}%` },
        { label: 'Std Deviation', value: `${statistics.stdDev.toFixed(2)}%` },
        {
          label: 'Probability of Failure',
          value: `${statistics.probabilityOfFailure.toFixed(3)}%`,
        },
      ],
      sections: [
        {
          title: 'Sensitivity Ranking',
          head: [['Rank', 'Parameter', 'Correlation', 'Impact']],
          body: statistics.sensitivities.map((s) => [
            `#${s.rank}`,
            s.parameter,
            `${(s.correlation * 100).toFixed(1)}%`,
            s.impact.toFixed(3),
          ]),
        },
      ],
      checks: [
        {
          name: 'Reliability Index',
          capacity: `β ≥ ${targetBeta.toFixed(1)}`,
          utilisation: `β = ${statistics.reliabilityIndex.toFixed(2)}`,
          status: (statistics.reliabilityIndex >= targetBeta ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Failure Probability',
          capacity: '< 1%',
          utilisation: `${statistics.probabilityOfFailure.toFixed(2)}%`,
          status: (statistics.probabilityOfFailure < 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — Sensitivity Analysis',
    });
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-full glass border border-cyan-500/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiActivity className="text-cyan-400" size={24} />
            <span className="text-white font-semibold">Probabilistic Assessment</span>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-8">
            {(['setup', 'results', 'visualization'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'neon' : 'ghost'}
                onClick={() => setActiveTab(tab)}
                disabled={tab !== 'setup' && !statistics}
                className={cn(
                  'px-8 py-3 rounded-xl font-semibold capitalize',
                  activeTab === tab
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    : 'text-gray-400',
                )}
              >
                {tab === 'setup'
                  ? '🎲 Setup'
                  : tab === 'results'
                    ? '📊 Results'
                    : '🎨 Visualization'}
              </Button>
            ))}
          </div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-6">
              Sensitivity Analysis
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">Parametric sensitivity & what-if analysis</p>
          <div className="flex items-center justify-center space-x-6 mt-8">
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Monte Carlo Engine</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Reliability Index β</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Sensitivity Ranking</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">6 Eurocode Types</span>
            </div>
          </div>

          {/* Glass Toolbar */}
          <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6 justify-center mt-8">
            <Button
              onClick={runMonteCarloSimulation}
              disabled={isRunning}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] max-w-md"
            >
              {isRunning ? (
                <>
                  <FiActivity className="animate-spin mr-2" />
                  Simulating...
                </>
              ) : (
                '▶ RUN FULL ANALYSIS'
              )}
            </Button>
            <select
              value=""
              onChange={(e) => e.target.value && applyPreset(e.target.value)}
              className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
              title="Quick Presets"
            >
              <option value="">⚡ Quick Presets</option>
              {Object.entries(PRESETS).map(([key, p]) => (
                <option key={key} value={key}>
                  {(p as any).name}
                </option>
              ))}
            </select>
            {statistics && (
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-6 py-3 rounded-xl"
              >
                <FiDownload className="mr-2" />
                Export PDF
              </Button>
            )}
            {statistics && (
              <Button
                onClick={handleExportDOCX}
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 px-6 py-3 rounded-xl"
              >
                <FiDownload className="mr-2" />
                Export DOCX
              </Button>
            )}
            {statistics && (
              <SaveRunButton calculatorKey="sensitivity" inputs={form as unknown as Record<string, string | number>} results={statistics} />
            )}
          </div>

          {/* Validation Error Alert */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 max-w-2xl mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FiAlertTriangle className="text-red-400" />
                  <span className="text-red-400 font-semibold text-sm">Validation Errors</span>
                </div>
                <ul className="space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i} className="text-red-300 text-xs flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span> {err}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Progress Bar */}
        {isRunning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2 text-center">
              {progress.toFixed(0)}% — Running {form.numSimulations} simulations...
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* Simulation Settings */}
                  <CollapsibleSection
                    title="Simulation Settings"
                    icon={
                      <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                        <FiSettings className="w-5 h-5 text-blue-400" />
                      </motion.div>
                    }
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <ExplainableLabel
                          label="Calculator Type"
                          field="sensitivity-calculator-type"
                          className="block text-sm font-semibold text-gray-300 mb-2"
                        />
                        <select
                          title="Calculator Type"
                          value={form.calculatorType}
                          onChange={(e) => updateForm('calculatorType', e.target.value)}
                          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        >
                          {Object.entries(CALCULATOR_TYPES).map(([key, ct]) => (
                            <option key={key} value={key}>
                              {ct.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <ExplainableLabel
                          label="Simulations"
                          field="sensitivity-simulations"
                          className="block text-sm font-semibold text-gray-300 mb-2"
                        />
                        <input
                          title="Simulations"
                          type="number"
                          value={form.numSimulations}
                          onChange={(e) => updateForm('numSimulations', e.target.value)}
                          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <ExplainableLabel
                          label="Target β"
                          field="sensitivity-target-beta"
                          className="block text-sm font-semibold text-gray-300 mb-2"
                        />
                        <input
                          title="Target β"
                          type="number"
                          value={form.targetReliability}
                          onChange={(e) => updateForm('targetReliability', e.target.value)}
                          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <ExplainableLabel
                          label="Random Seed"
                          field="sensitivity-random-seed"
                          className="block text-sm font-semibold text-gray-300 mb-2"
                        />
                        <input
                          title="Random Seed"
                          type="text"
                          value={form.seed}
                          onChange={(e) => updateForm('seed', e.target.value)}
                          placeholder="Optional"
                          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* Parameters */}
                  <CollapsibleSection
                    title="Input Parameters"
                    icon={
                      <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                        <FiSliders className="w-5 h-5 text-blue-400" />
                      </motion.div>
                    }
                  >
                    <div className="space-y-3">
                      {parameters.map((param) => (
                        <div
                          key={param.id}
                          className={cn(
                            'p-3 rounded-xl border transition-colors',
                            param.enabled
                              ? 'bg-gray-800/50 border-gray-700'
                              : 'bg-gray-900/50 border-gray-800 opacity-50',
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2">
                              <input
                                title="Input value"
                                type="checkbox"
                                checked={param.enabled}
                                onChange={(e) =>
                                  updateParameter(param.id, 'enabled', e.target.checked)
                                }
                                className="rounded border-gray-600"
                              />
                              <span className="text-white font-medium">{param.label}</span>
                              <span className="text-blue-400 text-xs">({param.unit})</span>
                            </label>
                            <select
                              title="Selection"
                              value={param.distribution}
                              onChange={(e) =>
                                updateParameter(param.id, 'distribution', e.target.value)
                              }
                              disabled={!param.enabled}
                              className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                            >
                              {Object.entries(DISTRIBUTION_INFO).map(([key, dist]) => (
                                <option key={key} value={key}>
                                  {dist.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-semibold text-gray-300 mb-2">Min</label>
                              <input
                                title="Min"
                                type="number"
                                value={param.min}
                                onChange={(e) => updateParameter(param.id, 'min', e.target.value)}
                                disabled={!param.enabled}
                                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-300 mb-2">Nominal</label>
                              <input
                                title="Nominal"
                                type="number"
                                value={param.nominal}
                                onChange={(e) =>
                                  updateParameter(param.id, 'nominal', e.target.value)
                                }
                                disabled={!param.enabled}
                                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-300 mb-2">Max</label>
                              <input
                                title="Max"
                                type="number"
                                value={param.max}
                                onChange={(e) => updateParameter(param.id, 'max', e.target.value)}
                                disabled={!param.enabled}
                                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>
                </div>

                {/* Right Column - Info & 3D Preview */}
                <div className="space-y-4 sticky top-8">
                  {/* 3D Preview */}
                  <WhatIfPreview
                    title="Sensitivity — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(overallPass ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL'}
                    renderScene={(fsHeight) => render3DScene(fsHeight)}
                  />

                  <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                          <FiInfo className="w-5 h-5 text-blue-400" />
                        </motion.div>
                        <span>About Monte Carlo</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-400 space-y-2">
                      <p>
                        Monte Carlo simulation randomly samples input parameters to assess
                        structural reliability.
                      </p>
                      <p>Key outputs:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Probability of failure (Pf)</li>
                        <li>Reliability index (β)</li>
                        <li>Parameter sensitivity ranking</li>
                        <li>Utilisation distribution</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white font-semibold">Distribution Types</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {Object.entries(DISTRIBUTION_INFO).map(([key, dist]) => (
                        <div key={key}>
                          <span className="text-cyan-400 font-medium">{dist.name}:</span>
                          <span className="text-gray-400 ml-2">{dist.description}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {statistics && (
                <>
                  {/* Overall Status Banner */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-6 rounded-2xl border-2 text-center mb-6',
                      overallPass
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-red-500/5 border-red-500/30',
                    )}
                  >
                    <div
                      className={cn(
                        'text-4xl font-black mb-1',
                        overallPass ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {overallPass ? 'ADEQUATE' : 'REQUIRES REVIEW'}
                    </div>
                    <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mt-2">
                      <span>
                        Reliability:{' '}
                        <span className="text-white font-bold">
                          β = {statistics.reliabilityIndex.toFixed(2)}
                        </span>
                      </span>
                      <span>
                        Mean Utilisation:{' '}
                        <span className="text-white font-bold">{statistics.mean.toFixed(1)}%</span>
                      </span>
                      <span>
                        P(failure):{' '}
                        <span className="text-white font-bold">
                          {statistics.probabilityOfFailure.toFixed(2)}%
                        </span>
                      </span>
                      <span>
                        Simulations:{' '}
                        <span className="text-white font-bold">
                          {results.length.toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                  {/* Border-l-4 Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border-l-4 border-blue-400 bg-gray-800/50 rounded-r-xl p-4 flex items-center space-x-3">
                      <FiCheck className="text-blue-400 w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Reliability Index</div>
                        <div className="text-white font-bold">β = {statistics.reliabilityIndex.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="border-l-4 border-green-400 bg-gray-800/50 rounded-r-xl p-4 flex items-center space-x-3">
                      <FiCheck className="text-green-400 w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Mean Utilisation</div>
                        <div className="text-white font-bold">{statistics.mean.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="border-l-4 border-yellow-400 bg-gray-800/50 rounded-r-xl p-4 flex items-center space-x-3">
                      <FiCheck className="text-yellow-400 w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">Failure Probability</div>
                        <div className="text-white font-bold">{statistics.probabilityOfFailure.toFixed(2)}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                        <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                            <CardContent className="py-4 text-center">
                              <div className="text-gray-400 text-sm">Mean Utilisation</div>
                              <div className="text-2xl font-bold text-white">
                                {statistics.mean.toFixed(1)}%
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                        >
                        <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                            <CardContent className="py-4 text-center">
                              <div className="text-gray-400 text-sm">Std Deviation</div>
                              <div className="text-2xl font-bold text-white">
                                {statistics.stdDev.toFixed(2)}%
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                        <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                            <CardContent className="py-4 text-center">
                              <div className="text-gray-400 text-sm">95th Percentile</div>
                              <div className="text-2xl font-bold text-amber-400">
                                {statistics.percentile95.toFixed(1)}%
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                        >
                          <Card
                            variant="glass"
                            className={cn(
                              'border-2',
                              statistics.probabilityOfFailure < 1
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-red-500/10 border-red-500/30',
                            )}
                          >
                            <CardContent className="py-4 text-center">
                              <div className="text-gray-400 text-sm">Failure Probability</div>
                              <div
                                className={cn(
                                  'text-2xl font-bold',
                                  statistics.probabilityOfFailure < 1
                                    ? 'text-emerald-400'
                                    : 'text-red-400',
                                )}
                              >
                                {statistics.probabilityOfFailure.toFixed(2)}%
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </div>

                      {/* Histogram */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                              <motion.div
                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.6 }}
                              >
                                <FiBarChart2 className="text-blue-400" size={18} />
                              </motion.div>
                              <span>Utilisation Distribution</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <canvas
                              ref={histogramRef}
                              width={600}
                              height={250}
                              className="w-full rounded-lg"
                            />
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Sensitivity Ranking — Tornado Chart */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                      >
                        <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                              <motion.div
                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.6 }}
                              >
                                <FiTrendingUp className="text-blue-400" size={18} />
                              </motion.div>
                              <span>Sensitivity Ranking — Tornado Chart</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {statistics.sensitivities.slice(0, 8).map((s, i) => {
                                const barWidth = Math.max(5, s.correlation * 100);
                                const hue =
                                  i === 0
                                    ? 'from-cyan-500 to-blue-500'
                                    : i < 3
                                      ? 'from-indigo-500 to-blue-500'
                                      : 'from-gray-600 to-gray-500';
                                return (
                                  <div key={i} className="flex items-center gap-3">
                                    <div className="w-6 text-right text-xs text-gray-500 font-mono">
                                      #{s.rank}
                                    </div>
                                    <div className="w-32 text-sm text-gray-300 truncate">
                                      {s.parameter}
                                    </div>
                                    <div className="flex-1 relative h-6 bg-gray-900 rounded-lg overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${barWidth}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.1 }}
                                        className={`h-full bg-gradient-to-r ${hue} rounded-lg`}
                                      />
                                      <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">
                                        {(s.correlation * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4 sticky top-8">
                      {/* 3D Scene */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Card
                          variant="glass"
                          className="border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                              <div className="flex items-center gap-2">
                                <motion.div
                                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
                                  whileHover={{ rotate: 360 }}
                                  transition={{ duration: 0.6 }}
                                >
                                  <FiTarget className="text-blue-400" size={18} />
                                </motion.div>
                                3D Probabilistic View
                              </div>
                              <button
                                onClick={() => setPreviewMaximized(true)}
                                className="p-1.5 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700/50 transition-all"
                                title="Fullscreen"
                              >
                                <FiMaximize2 size={14} />
                              </button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>{render3DScene('h-[350px]')}</CardContent>
                        </Card>
                      </motion.div>

                      {/* Reliability */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Card
                          variant="glass"
                          className={cn(
                            'border-2',
                            statistics.reliabilityIndex >= parseFloat(form.targetReliability)
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-amber-500/10 border-amber-500/30',
                          )}
                        >
                          <CardContent className="py-6 text-center">
                            <div className="text-gray-400 text-sm mb-2">Reliability Index (β)</div>
                            <div
                              className={cn(
                                'text-4xl font-bold',
                                statistics.reliabilityIndex >= parseFloat(form.targetReliability)
                                  ? 'text-emerald-400'
                                  : 'text-amber-400',
                              )}
                            >
                              {statistics.reliabilityIndex.toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-sm mt-2">
                              Target: β ≥ {form.targetReliability}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Detailed Stats */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-2xl text-white font-semibold">Detailed Statistics</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Simulations</span>
                              <span className="text-white">{results.length.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Minimum</span>
                              <span className="text-white">{statistics.min.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Maximum</span>
                              <span className="text-white">{statistics.max.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Median</span>
                              <span className="text-white">{statistics.median.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">5th Percentile</span>
                              <span className="text-white">
                                {statistics.percentile5.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">99th Percentile</span>
                              <span className="text-white">
                                {statistics.percentile99.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-700">
                              <span className="text-gray-400">Failures (U &gt; 100%)</span>
                              <span
                                className={
                                  statistics.failureCount > 0 ? 'text-red-400' : 'text-emerald-400'
                                }
                              >
                                {statistics.failureCount.toLocaleString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Top Sensitivities */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-2xl text-white font-semibold">Top 5 Sensitive Parameters</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {statistics.sensitivities.slice(0, 5).map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className="text-gray-400 text-sm">
                                    {i + 1}. {s.parameter}
                                  </span>
                                  <span className="text-cyan-400 font-mono">
                                    {s.correlation.toFixed(3)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </div>
                </>
              )}

              {/* Warnings */}
              <div className="text-xs font-bold text-amber-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                <FiAlertTriangle size={12} /> Warnings & Notes
              </div>
              {warnings.length > 0 && (
                <Card variant="glass" className="border-amber-500/40 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white font-semibold text-sm flex items-center gap-2">
                      <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                        <FiAlertTriangle className="text-amber-400" size={18} />
                      </motion.div>
                      Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {warnings.map((w, i) => (
                        <li key={i} className="text-amber-400 text-xs flex items-start gap-2">
                          <FiAlertTriangle className="mt-0.5 flex-shrink-0" /> {w}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'visualization' && statistics && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Full 3D Scene */}
                <div className="lg:col-span-2">
                  <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <div className="flex items-center gap-2">
                          <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                            <FiLayers className="text-blue-400" size={18} />
                          </motion.div>
                          <span>Interactive 3D — Monte Carlo Distribution</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Camera presets */}
                          {cameraPresets.map((p) => (
                            <button
                              key={p.label}
                              onClick={() => setCameraPos(p.pos)}
                              className={cn(
                                'px-2 py-1 rounded-lg text-xs font-medium border transition-all',
                                cameraPos[0] === p.pos[0] &&
                                  cameraPos[1] === p.pos[1] &&
                                  cameraPos[2] === p.pos[2]
                                  ? 'bg-cyan-500/30 border-cyan-500/50 text-cyan-400'
                                  : 'bg-gray-900/60 border-gray-700/40 text-gray-400 hover:text-white',
                              )}
                            >
                              {p.icon} {p.label}
                            </button>
                          ))}
                          <button
                            onClick={() => setPreviewMaximized(true)}
                            className="p-1.5 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700/50 transition-all"
                            title="Fullscreen"
                          >
                            <FiMaximize2 size={14} />
                          </button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>{render3DScene('h-[500px]')}</CardContent>
                  </Card>
                </div>

                {/* Right Column — Summary */}
                <div className="space-y-4 sticky top-8">
                  {/* Assessment Summary */}
                  <Card
                    variant="glass"
                    className={cn(
                      'border-2',
                      overallPass
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30',
                    )}
                  >
                    <CardContent className="py-6 text-center">
                      <div
                        className="text-6xl font-black mb-2"
                        style={{ color: overallPass ? '#22c55e' : '#ef4444' }}
                      >
                        {overallPass ? '✓' : '✗'}
                      </div>
                      <div className="text-white font-bold text-lg">
                        {overallPass ? 'ADEQUATE' : 'REQUIRES REVIEW'}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        β = {statistics.reliabilityIndex.toFixed(2)} vs target{' '}
                        {form.targetReliability}
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-gray-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (statistics.reliabilityIndex / 6) * 100)}%`,
                          }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: overallPass ? '#22c55e' : '#ef4444' }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Metrics */}
                  <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center" whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                          <FiZap className="text-blue-400" size={18} />
                        </motion.div>
                        <span>Key Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {[
                        { label: 'Calculator', value: calcName },
                        { label: 'Simulations', value: results.length.toLocaleString() },
                        { label: 'Mean μ', value: `${statistics.mean.toFixed(1)}%` },
                        { label: 'Std Dev σ', value: `${statistics.stdDev.toFixed(2)}%` },
                        { label: 'P95', value: `${statistics.percentile95.toFixed(1)}%` },
                        {
                          label: 'P(failure)',
                          value: `${statistics.probabilityOfFailure.toFixed(2)}%`,
                        },
                        {
                          label: 'Min / Max',
                          value: `${statistics.min.toFixed(1)}% / ${statistics.max.toFixed(1)}%`,
                        },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="text-white font-mono">{item.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Sensitivity Ranking */}
                  <Card variant="glass" className="border-gray-700/50 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white font-semibold">Parameter Ranking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {statistics.sensitivities.slice(0, 5).map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span
                              className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                                i === 0
                                  ? 'bg-cyan-500/30 text-cyan-400'
                                  : 'bg-gray-700 text-gray-400',
                              )}
                            >
                              {s.rank}
                            </span>
                            <span className="text-gray-300 text-sm flex-1 truncate">
                              {s.parameter}
                            </span>
                            <span className="text-cyan-400 font-mono text-sm">
                              {(s.correlation * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          FULLSCREEN 3D OVERLAY
          ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {previewMaximized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex"
          >
            {/* ── 3D Canvas ── */}
            <div className="flex-1 relative">
              {render3DScene('h-full')}
              {/* Camera Presets Floating */}
              <div className="absolute top-4 left-4 flex gap-2 z-10">
                {cameraPresets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setCameraPos(p.pos)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border backdrop-blur-sm transition-all',
                      cameraPos[0] === p.pos[0] &&
                        cameraPos[1] === p.pos[1] &&
                        cameraPos[2] === p.pos[2]
                        ? 'bg-cyan-500/30 border-cyan-500/50 text-cyan-400'
                        : 'bg-gray-900/60 border-gray-700/40 text-gray-400 hover:text-white hover:border-gray-500',
                    )}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Side Panel ── */}
            <motion.div
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="w-[380px] bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-950/95 border-l border-cyan-500/20 flex flex-col overflow-hidden backdrop-blur-md"
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <h3 className="text-base font-bold text-white tracking-wide">
                      Sensitivity Analysis
                    </h3>
                  </div>
                  <button
                    onClick={() => setPreviewMaximized(false)}
                    className="p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700/50 transition-all duration-200"
                    title="Exit fullscreen"
                  >
                    <FiMinimize2 size={14} />
                  </button>
                </div>

                {/* Reliability Hero */}
                {statistics ? (
                  <div
                    className="p-4 rounded-xl border-2 text-center"
                    style={{
                      borderColor: overallPass ? '#22c55e' : '#ef4444',
                      background: overallPass ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
                    }}
                  >
                    <div
                      className="text-3xl font-black tracking-tight"
                      style={{ color: overallPass ? '#22c55e' : '#ef4444' }}
                    >
                      β = {statistics.reliabilityIndex.toFixed(2)}
                    </div>
                    <div className="text-lg font-bold text-white mt-1 truncate">
                      {fmtCompact(statistics.mean)}%
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        mean utilisation
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, statistics.mean)}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: overallPass ? '#22c55e' : '#ef4444' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-0.5">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-gray-700/50 bg-gray-800/30 text-center space-y-3">
                    <div className="text-4xl">🎲</div>
                    <div className="text-gray-400 text-sm font-medium">Ready to Simulate</div>
                    <div className="text-gray-500 text-xs">
                      Configure parameters and run Monte Carlo simulation
                    </div>
                    <button
                      onClick={() => {
                        setPreviewMaximized(false);
                        runMonteCarloSimulation();
                      }}
                      className="mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold hover:from-cyan-400 hover:to-blue-400 transition-all"
                    >
                      <FiPlay className="inline mr-1.5" size={11} />
                      Run Simulation
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin scrollbar-thumb-gray-700">
                {/* ── Simulation Properties (ALWAYS visible) ── */}
                <div>
                  <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-2">
                    Simulation Properties
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Calculator', value: calcName },
                      {
                        label: 'Design Code',
                        value: form.calculatorType.includes('steel')
                          ? 'EN 1993'
                          : form.calculatorType.includes('composite')
                            ? 'EN 1994'
                            : form.calculatorType.includes('rc')
                              ? 'EN 1992'
                              : form.calculatorType.includes('timber')
                                ? 'EN 1995'
                                : 'EN 1997',
                      },
                      {
                        label: 'Simulations',
                        value: statistics ? results.length.toLocaleString() : form.numSimulations,
                      },
                      { label: 'Target β', value: form.targetReliability },
                      {
                        label: 'Parameters',
                        value: `${parameters.filter((p) => p.enabled).length} of ${parameters.length} active`,
                      },
                      { label: 'Method', value: 'Monte Carlo (MCS)' },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-800/40 border border-gray-700/30"
                      >
                        <span className="text-[11px] text-gray-400">{row.label}</span>
                        <span className="text-[11px] text-white font-medium font-mono">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {statistics && (
                  <>
                    {/* ── Reliability Checks — Animated Bars ── */}
                    <div>
                      <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-2">
                        Reliability Checks
                      </div>
                      <div className="space-y-3">
                        {[
                          {
                            label: 'Reliability Index β',
                            val: Math.min(
                              100,
                              Math.max(
                                0,
                                (statistics.reliabilityIndex / parseFloat(form.targetReliability)) *
                                  100,
                              ),
                            ),
                            display: `${statistics.reliabilityIndex.toFixed(2)} / ${form.targetReliability}`,
                            clause: 'EN 1990',
                          },
                          {
                            label: 'Mean Utilisation μ',
                            val: Math.min(100, statistics.mean),
                            display: `${fmtCompact(statistics.mean)}%`,
                            clause: 'ULS',
                          },
                          {
                            label: '95th Percentile P95',
                            val: Math.min(100, statistics.percentile95),
                            display: `${fmtCompact(statistics.percentile95)}%`,
                            clause: 'ULS',
                          },
                          {
                            label: 'Failure Probability Pf',
                            val: Math.min(100, statistics.probabilityOfFailure * 10),
                            display: `${statistics.probabilityOfFailure.toFixed(2)}%`,
                            clause: 'SLS',
                          },
                          {
                            label: 'Std Deviation σ',
                            val: Math.min(
                              100,
                              statistics.mean !== 0
                                ? (statistics.stdDev / Math.abs(statistics.mean)) * 100
                                : 0,
                            ),
                            display: `${fmtCompact(statistics.stdDev)}%`,
                            clause: 'COV',
                          },
                        ].map((bar) => (
                          <div key={bar.label}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-gray-300 font-medium">
                                  {bar.label}
                                </span>
                                <span className="text-[9px] text-gray-600">{bar.clause}</span>
                              </div>
                              <span
                                className={cn(
                                  'text-[11px] font-bold font-mono min-w-[60px] max-w-[100px] text-right truncate',
                                  bar.val > 100
                                    ? 'text-red-400'
                                    : bar.val > 80
                                      ? 'text-amber-400'
                                      : 'text-emerald-400',
                                )}
                              >
                                {bar.display}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, bar.val)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                                className={cn(
                                  'h-full rounded-full',
                                  bar.val > 100
                                    ? 'bg-red-500'
                                    : bar.val > 80
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Key Metrics Grid ── */}
                    <div>
                      <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-2">
                        Key Metrics
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            label: 'β',
                            val: statistics.reliabilityIndex.toFixed(2),
                            unit: 'index',
                          },
                          { label: 'μ', val: fmtCompact(statistics.mean), unit: '%' },
                          { label: 'σ', val: fmtCompact(statistics.stdDev), unit: '%' },
                          { label: 'P5', val: fmtCompact(statistics.percentile5), unit: '%' },
                          { label: 'P95', val: fmtCompact(statistics.percentile95), unit: '%' },
                          {
                            label: 'Pf',
                            val:
                              statistics.probabilityOfFailure > 99.99
                                ? '100'
                                : statistics.probabilityOfFailure.toFixed(2),
                            unit: '%',
                          },
                        ].map((c) => (
                          <div
                            key={c.label}
                            className="p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/30 text-center overflow-hidden"
                          >
                            <div className="text-[9px] text-gray-500 font-mono">{c.label}</div>
                            <div className="text-sm font-bold text-white mt-0.5 truncate">
                              {c.val}
                            </div>
                            <div className="text-[9px] text-cyan-400/70">{c.unit}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Sensitivity Ranking — Animated Bars ── */}
                    <div>
                      <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-2">
                        Sensitivity Ranking
                      </div>
                      <div className="text-[10px] text-gray-500 mb-2">
                        Governing: {statistics.sensitivities[0]?.parameter || '—'}
                      </div>
                      <div className="space-y-2.5">
                        {statistics.sensitivities.slice(0, 8).map((s, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                                    i === 0
                                      ? 'bg-cyan-500/30 text-cyan-400'
                                      : i < 3
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-gray-700 text-gray-400',
                                  )}
                                >
                                  {s.rank}
                                </span>
                                <span className="text-[11px] text-gray-300 font-medium truncate max-w-[140px]">
                                  {s.parameter}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  'text-[11px] font-bold font-mono',
                                  i === 0
                                    ? 'text-cyan-400'
                                    : i < 3
                                      ? 'text-blue-400'
                                      : 'text-gray-400',
                                )}
                              >
                                {(s.correlation * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, s.correlation * 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 * i }}
                                className={cn(
                                  'h-full rounded-full',
                                  i === 0
                                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                                    : i < 3
                                      ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                                      : 'bg-gray-600',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Statistical Summary ── */}
                    <div>
                      <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-2">
                        Detailed Statistics
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: 'Simulations', value: results.length.toLocaleString() },
                          {
                            label: 'Min / Max',
                            value: `${fmtCompact(statistics.min)}% / ${fmtCompact(statistics.max)}%`,
                          },
                          { label: 'Median', value: `${fmtCompact(statistics.median)}%` },
                          {
                            label: '5th Percentile',
                            value: `${fmtCompact(statistics.percentile5)}%`,
                          },
                          {
                            label: '99th Percentile',
                            value: `${fmtCompact(statistics.percentile99)}%`,
                          },
                          {
                            label: 'Failures (U > 100%)',
                            value: `${statistics.failureCount.toLocaleString()}`,
                          },
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between text-xs gap-2">
                            <span className="text-gray-500 shrink-0">{item.label}</span>
                            <span className="text-gray-200 font-mono truncate text-right">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Warnings ── */}
                    {warnings.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <FiAlertTriangle size={10} /> Warnings
                        </div>
                        <div className="space-y-1">
                          {warnings.map((w, i) => (
                            <div
                              key={i}
                              className="text-[10px] text-amber-300/80 py-1.5 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                            >
                              {w}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── Input Parameter Ranges (always visible) ── */}
                <div>
                  <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest mb-2">
                    Parameter Ranges
                  </div>
                  <div className="space-y-1.5">
                    {parameters
                      .filter((p) => p.enabled)
                      .slice(0, 8)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-800/30 border border-gray-700/20"
                        >
                          <span className="text-[11px] text-gray-300">{p.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-500 font-mono">
                              {p.min}–{p.max} {p.unit}
                            </span>
                            <span
                              className={cn(
                                'text-[9px] px-1.5 py-0.5 rounded font-bold',
                                p.distribution === 'normal'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : p.distribution === 'lognormal'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : p.distribution === 'triangular'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-gray-500/20 text-gray-400',
                              )}
                            >
                              {p.distribution.charAt(0).toUpperCase() + p.distribution.slice(0, 3)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* ── Live Readout ── */}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                    <FiActivity size={14} /> Live Readout
                  </h3>
                  {[
                    { label: 'Calculator', value: form.calculatorType },
                    { label: 'Simulations', value: form.numSimulations },
                    { label: 'Target β', value: form.targetReliability },
                    { label: 'Active Params', value: `${parameters.filter((p) => p.enabled).length}` },
                    { label: 'Project', value: form.projectName },
                    { label: 'Reference', value: form.reference },
                  ].map((stat) => (
                    <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                      <span className="text-gray-500">{stat.label}</span>
                      <span className="text-white font-medium">{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* ── Last Analysis ── */}
                {statistics && (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">Last Analysis</div>
                    {[
                      { label: 'Reliability Index β', util: statistics.reliabilityIndex.toFixed(1), status: statistics.reliabilityIndex >= parseFloat(form.targetReliability) ? 'PASS' : 'FAIL' },
                      { label: 'Mean Utilisation', util: fmtCompact(statistics.mean), status: statistics.mean <= 100 ? 'PASS' : 'FAIL' },
                      { label: 'Failure Probability', util: statistics.probabilityOfFailure.toFixed(1), status: statistics.probabilityOfFailure < 5 ? 'PASS' : 'FAIL' },
                      { label: '95th Percentile', util: fmtCompact(statistics.percentile95), status: statistics.percentile95 <= 100 ? 'PASS' : 'FAIL' },
                    ].map((check) => (
                      <div key={check.label} className="flex justify-between text-xs py-0.5">
                        <span className="text-gray-500">{check.label}</span>
                        <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util || '0')) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                          {check.util ?? '—'}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Close Fullscreen ── */}
                <button
                  onClick={() => setPreviewMaximized(false)}
                  className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors"
                >
                  Close Fullscreen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sensitivity;
