import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiGrid,
  FiLayers,
  FiMaximize2,
  FiMinimize2,
  FiPlus,
  FiSettings,
  FiSliders,
  FiTarget,
  FiTrash2,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import type { ReportData } from '../../lib/pdf/types';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import Grillage3D from '../../components/3d/scenes/Grillage3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { STEEL_GRADES as _STEEL_LIB } from '../../data/materialGrades';
// COMPREHENSIVE STEEL SECTION DATABASE - BS EN 10365 & AISC
// ═══════════════════════════════════════════════════════════════════════

const SECTION_DATABASE: Record<
  string,
  {
    name: string;
    I: number; // cm4
    A: number; // cm2
    depth: number; // mm
    width: number; // mm
    Zp: number; // cm3 (plastic modulus)
    tw: number; // mm (web thickness)
    tf: number; // mm (flange thickness)
  }
> = {
  // Universal Beams - smaller
  UB_406x140x39: {
    name: 'UB 406×140×39',
    I: 12500,
    A: 49.4,
    depth: 398,
    width: 142,
    Zp: 724,
    tw: 6.4,
    tf: 8.6,
  },
  UB_457x152x52: {
    name: 'UB 457×152×52',
    I: 21400,
    A: 66.6,
    depth: 450,
    width: 152,
    Zp: 1100,
    tw: 7.6,
    tf: 10.9,
  },
  UB_457x152x67: {
    name: 'UB 457×152×67',
    I: 28900,
    A: 85.5,
    depth: 458,
    width: 154,
    Zp: 1470,
    tw: 9.0,
    tf: 15.0,
  },
  // Universal Beams - medium
  UB_533x210x82: {
    name: 'UB 533×210×82',
    I: 47500,
    A: 104.3,
    depth: 528,
    width: 209,
    Zp: 2060,
    tw: 9.6,
    tf: 13.2,
  },
  UB_533x210x101: {
    name: 'UB 533×210×101',
    I: 61700,
    A: 129,
    depth: 537,
    width: 210,
    Zp: 2610,
    tw: 10.8,
    tf: 17.4,
  },
  UB_610x229x101: {
    name: 'UB 610×229×101',
    I: 75800,
    A: 129,
    depth: 603,
    width: 228,
    Zp: 2880,
    tw: 10.5,
    tf: 14.8,
  },
  UB_610x229x125: {
    name: 'UB 610×229×125',
    I: 98600,
    A: 159,
    depth: 612,
    width: 229,
    Zp: 3680,
    tw: 11.9,
    tf: 19.6,
  },
  // Universal Beams - larger
  UB_686x254x125: {
    name: 'UB 686×254×125',
    I: 118000,
    A: 159.6,
    depth: 678,
    width: 253,
    Zp: 3990,
    tw: 11.7,
    tf: 16.2,
  },
  UB_686x254x152: {
    name: 'UB 686×254×152',
    I: 150000,
    A: 194,
    depth: 688,
    width: 254,
    Zp: 4970,
    tw: 13.2,
    tf: 21.0,
  },
  UB_762x267x147: {
    name: 'UB 762×267×147',
    I: 169000,
    A: 187.3,
    depth: 754,
    width: 265,
    Zp: 5170,
    tw: 12.8,
    tf: 17.5,
  },
  UB_762x267x173: {
    name: 'UB 762×267×173',
    I: 205000,
    A: 220,
    depth: 762,
    width: 267,
    Zp: 6200,
    tw: 14.3,
    tf: 21.6,
  },
  // Universal Beams - heavy
  UB_838x292x176: {
    name: 'UB 838×292×176',
    I: 246000,
    A: 224.5,
    depth: 835,
    width: 292,
    Zp: 6810,
    tw: 14.0,
    tf: 18.8,
  },
  UB_838x292x194: {
    name: 'UB 838×292×194',
    I: 279000,
    A: 247,
    depth: 841,
    width: 293,
    Zp: 7650,
    tw: 14.7,
    tf: 21.7,
  },
  UB_914x305x201: {
    name: 'UB 914×305×201',
    I: 325000,
    A: 256.5,
    depth: 903,
    width: 303,
    Zp: 8350,
    tw: 15.1,
    tf: 20.2,
  },
  UB_914x305x224: {
    name: 'UB 914×305×224',
    I: 376000,
    A: 285,
    depth: 911,
    width: 305,
    Zp: 9530,
    tw: 15.9,
    tf: 23.9,
  },
  UB_914x305x253: {
    name: 'UB 914×305×253',
    I: 436000,
    A: 323,
    depth: 919,
    width: 306,
    Zp: 10900,
    tw: 17.3,
    tf: 27.9,
  },
  // Universal Beams - extra heavy
  UB_1016x305x222: {
    name: 'UB 1016×305×222',
    I: 407000,
    A: 283,
    depth: 1000,
    width: 300,
    Zp: 9420,
    tw: 16.0,
    tf: 21.1,
  },
  UB_1016x305x272: {
    name: 'UB 1016×305×272',
    I: 524000,
    A: 347,
    depth: 1016,
    width: 305,
    Zp: 11900,
    tw: 18.0,
    tf: 27.0,
  },
  UB_1016x305x314: {
    name: 'UB 1016×305×314',
    I: 623000,
    A: 400,
    depth: 1026,
    width: 307,
    Zp: 14000,
    tw: 19.7,
    tf: 32.0,
  },
};

// Deck type database with modulus values
const DECK_TYPES: Record<
  string,
  {
    name: string;
    E_deck: number; // MPa
    poisson: number;
    density: number; // kg/m3
    selfWeight: number; // kN/m2 per 100mm
  }
> = {
  steel_ortho: {
    name: 'Steel Orthotropic Deck',
    E_deck: 210000,
    poisson: 0.3,
    density: 7850,
    selfWeight: 1.5,
  },
  composite_normal: {
    name: 'Composite (Normal Concrete)',
    E_deck: 33000,
    poisson: 0.2,
    density: 2500,
    selfWeight: 2.5,
  },
  composite_lw: {
    name: 'Composite (Lightweight)',
    E_deck: 26000,
    poisson: 0.2,
    density: 1900,
    selfWeight: 1.9,
  },
  precast_psc: {
    name: 'Precast Prestressed',
    E_deck: 35000,
    poisson: 0.2,
    density: 2500,
    selfWeight: 2.5,
  },
  precast_rc: {
    name: 'Precast Reinforced',
    E_deck: 32000,
    poisson: 0.2,
    density: 2500,
    selfWeight: 2.5,
  },
  insitu_c32: {
    name: 'In-situ C32/40',
    E_deck: 31000,
    poisson: 0.2,
    density: 2500,
    selfWeight: 2.5,
  },
  insitu_c40: {
    name: 'In-situ C40/50',
    E_deck: 34000,
    poisson: 0.2,
    density: 2500,
    selfWeight: 2.5,
  },
  timber_glulam: {
    name: 'Glulam Timber Deck',
    E_deck: 12600,
    poisson: 0.35,
    density: 480,
    selfWeight: 0.5,
  },
};

// Steel grade database — from shared library
const STEEL_GRADES: Record<string, { name: string; fy: number; fu: number }> = Object.fromEntries(
  Object.entries(_STEEL_LIB).map(([k, v]) => [k, { name: v.name ?? k, fy: v.fy, fu: v.fu }]),
);

// Standard highway loading - EN 1991-2
const LOAD_MODELS: Record<
  string,
  {
    name: string;
    tandem_axle: number; // kN per axle
    udl: number; // kN/m2
    tandem_spacing: number; // m
    lane_width: number; // m
  }
> = {
  lm1_lane1: {
    name: 'LM1 Lane 1',
    tandem_axle: 300,
    udl: 9.0,
    tandem_spacing: 1.2,
    lane_width: 3.0,
  },
  lm1_lane2: {
    name: 'LM1 Lane 2',
    tandem_axle: 200,
    udl: 2.5,
    tandem_spacing: 1.2,
    lane_width: 3.0,
  },
  lm1_lane3: {
    name: 'LM1 Lane 3',
    tandem_axle: 100,
    udl: 2.5,
    tandem_spacing: 1.2,
    lane_width: 3.0,
  },
  lm2_single: {
    name: 'LM2 Single Axle',
    tandem_axle: 400,
    udl: 0,
    tandem_spacing: 0,
    lane_width: 0,
  },
  lm3_special: {
    name: 'LM3 Special Vehicle',
    tandem_axle: 150,
    udl: 0,
    tandem_spacing: 1.5,
    lane_width: 4.0,
  },
  pedestrian: {
    name: 'Pedestrian (5 kN/m²)',
    tandem_axle: 0,
    udl: 5.0,
    tandem_spacing: 0,
    lane_width: 2.0,
  },
};

// Preset configurations
const PRESETS: Record<
  string,
  {
    name: string;
    spanLength: string;
    deckWidth: string;
    deckType: string;
    slabThickness: string;
    numLongBeams: string;
    numTransBeams: string;
    longSection: string;
    transSection: string;
    steelGrade: string;
    deflectionLimit: string;
    dynamicFactor: string;
    gammaM0: string;
    gammaM1: string;
  }
> = {
  short_highway: {
    name: 'Short Span Highway (20m)',
    spanLength: '20',
    deckWidth: '10',
    deckType: 'composite_normal',
    slabThickness: '200',
    numLongBeams: '4',
    numTransBeams: '5',
    longSection: 'UB_610x229x125',
    transSection: 'UB_457x152x52',
    steelGrade: 'S355',
    deflectionLimit: '250',
    dynamicFactor: '1.1',
    gammaM0: '1.0',
    gammaM1: '1.1',
  },
  medium_highway: {
    name: 'Medium Span Highway (30m)',
    spanLength: '30',
    deckWidth: '12',
    deckType: 'composite_normal',
    slabThickness: '250',
    numLongBeams: '5',
    numTransBeams: '7',
    longSection: 'UB_762x267x173',
    transSection: 'UB_533x210x82',
    steelGrade: 'S355',
    deflectionLimit: '250',
    dynamicFactor: '1.1',
    gammaM0: '1.0',
    gammaM1: '1.1',
  },
  long_span: {
    name: 'Long Span Bridge (40m)',
    spanLength: '40',
    deckWidth: '14',
    deckType: 'composite_normal',
    slabThickness: '280',
    numLongBeams: '6',
    numTransBeams: '9',
    longSection: 'UB_914x305x253',
    transSection: 'UB_610x229x101',
    steelGrade: 'S355',
    deflectionLimit: '300',
    dynamicFactor: '1.1',
    gammaM0: '1.0',
    gammaM1: '1.1',
  },
  footbridge: {
    name: 'Footbridge (25m)',
    spanLength: '25',
    deckWidth: '4',
    deckType: 'steel_ortho',
    slabThickness: '150',
    numLongBeams: '2',
    numTransBeams: '6',
    longSection: 'UB_533x210x82',
    transSection: 'UB_406x140x39',
    steelGrade: 'S275',
    deflectionLimit: '200',
    dynamicFactor: '1.0',
    gammaM0: '1.0',
    gammaM1: '1.1',
  },
  railway_short: {
    name: 'Railway Underbridge (15m)',
    spanLength: '15',
    deckWidth: '8',
    deckType: 'precast_psc',
    slabThickness: '300',
    numLongBeams: '3',
    numTransBeams: '4',
    longSection: 'UB_838x292x194',
    transSection: 'UB_533x210x101',
    steelGrade: 'S355',
    deflectionLimit: '300',
    dynamicFactor: '1.2',
    gammaM0: '1.0',
    gammaM1: '1.1',
  },
  viaduct_multispan: {
    name: 'Viaduct Multi-Span (35m)',
    spanLength: '35',
    deckWidth: '13',
    deckType: 'composite_normal',
    slabThickness: '260',
    numLongBeams: '5',
    numTransBeams: '8',
    longSection: 'UB_838x292x194',
    transSection: 'UB_533x210x82',
    steelGrade: 'S355',
    deflectionLimit: '300',
    dynamicFactor: '1.1',
    gammaM0: '1.0',
    gammaM1: '1.1',
  },
};

// Load case type
type LoadCase = {
  id: string;
  name: string;
  type: 'point' | 'udl' | 'lane' | 'tandem';
  magnitude: number;
  xPos: number;
  yPos: number;
  length?: number;
  width?: number;
};

// Collapsible Section Component
const CollapsibleSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  accentColor = 'cyan',
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors: Record<string, string> = {
    cyan: 'border-cyan-500/30 text-cyan-400',
    purple: 'border-purple-500/30 text-purple-400',
    green: 'border-green-500/30 text-green-400',
    orange: 'border-orange-500/30 text-orange-400',
    blue: 'border-blue-500/30 text-blue-400',
  };

  return (
    <Card variant="glass" className="border border-neon-cyan/30 shadow-2xl">
      <CardHeader className="cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <CardTitle className="text-2xl text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
            >
              <Icon className="text-neon-cyan" size={20} />
            </motion.div>
            <span>{title}</span>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <FiChevronDown className="text-gray-400" />
          </motion.div>
        </CardTitle>
      </CardHeader>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <CardContent className="pt-0">{children}</CardContent>
        </motion.div>
      )}
    </Card>
  );
};

const Grillage = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'geometry' | 'loads' | 'results'>('geometry');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const [form, setForm] = useState({
    spanLength: '30',
    deckWidth: '12',
    deckType: 'composite_normal',
    slabThickness: '250',
    numLongBeams: '5',
    numTransBeams: '7',
    longSection: 'UB_762x267x147',
    transSection: 'UB_533x210x82',
    steelGrade: 'S355',
    deflectionLimit: '250', // L/xxx
    dynamicFactor: '1.1',
    gammaM0: '1.0',
    gammaM1: '1.1',
  });
  // What-If sliders
  const whatIfSliders = [
    { key: 'spanLength', label: 'Span Length', min: 10, max: 60, step: 1, unit: 'm' },
    { key: 'deckWidth', label: 'Deck Width', min: 4, max: 20, step: 0.5, unit: 'm' },
    { key: 'slabThickness', label: 'Slab Thickness', min: 150, max: 400, step: 10, unit: 'mm' },
    { key: 'numLongBeams', label: 'Longitudinal Beams', min: 2, max: 10, step: 1, unit: '' },
    { key: 'numTransBeams', label: 'Transverse Beams', min: 3, max: 15, step: 1, unit: '' },
  ];

  const [loadCases, setLoadCases] = useState<LoadCase[]>([
    { id: '1', name: 'LM1 Tandem', type: 'tandem', magnitude: 300, xPos: 15, yPos: 3, length: 1.2 },
    {
      id: '2',
      name: 'UDL Lane 1',
      type: 'udl',
      magnitude: 9,
      xPos: 0,
      yPos: 1.5,
      length: 30,
      width: 3,
    },
  ]);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setResults(null);
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      const { name: _name, ...fields } = preset;
      setForm((prev) => ({ ...prev, ...fields }));
      setResults(null);
    }
  };

  const addLoadCase = () => {
    const newId = (loadCases.length + 1).toString();
    setLoadCases([
      ...loadCases,
      {
        id: newId,
        name: `Load ${newId}`,
        type: 'point',
        magnitude: 100,
        xPos: parseFloat(form.spanLength) / 2,
        yPos: parseFloat(form.deckWidth) / 2,
      },
    ]);
  };

  const removeLoadCase = (id: string) => {
    if (loadCases.length > 1) {
      setLoadCases(loadCases.filter((lc) => lc.id !== id));
    }
  };

  const updateLoadCase = (id: string, field: keyof LoadCase, value: any) => {
    setLoadCases(loadCases.map((lc) => (lc.id === id ? { ...lc, [field]: value } : lc)));
  };

  // Canvas visualization

  const validateInputs = (): boolean => {
    const errors: string[] = [];
    const L = parseFloat(form.spanLength);
    const W = parseFloat(form.deckWidth);
    const t = parseFloat(form.slabThickness);
    const nL = parseInt(form.numLongBeams);
    const nT = parseInt(form.numTransBeams);
    if (isNaN(L) || L <= 0) errors.push('Span length must be a positive number');
    if (isNaN(W) || W <= 0) errors.push('Deck width must be a positive number');
    if (isNaN(t) || t <= 0) errors.push('Slab thickness must be a positive number');
    if (isNaN(nL) || nL < 2) errors.push('Number of longitudinal beams must be at least 2');
    if (isNaN(nT) || nT < 2) errors.push('Number of transverse beams must be at least 2');
    if (!SECTION_DATABASE[form.longSection])
      errors.push('Please select a valid longitudinal section');
    if (!SECTION_DATABASE[form.transSection])
      errors.push('Please select a valid transverse section');
    if (errors.length > 0) {
      setWarnings(errors);
      return false;
    }
    return true;
  };

  const runAnalysis = () => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);
    const newWarnings: string[] = [];

    setTimeout(() => {
      const L = parseFloat(form.spanLength);
      const W = parseFloat(form.deckWidth);
      const t_slab = parseFloat(form.slabThickness) / 1000;
      const nLong = parseInt(form.numLongBeams);
      const nTrans = parseInt(form.numTransBeams);
      const deckType = DECK_TYPES[form.deckType];
      const steelGrade = STEEL_GRADES[form.steelGrade];
      const deflLimit = parseFloat(form.deflectionLimit);
      const dynFactor = parseFloat(form.dynamicFactor);
      const gammaM0 = parseFloat(form.gammaM0);
      const gammaM1 = parseFloat(form.gammaM1);

      const longSection = SECTION_DATABASE[form.longSection];
      const transSection = SECTION_DATABASE[form.transSection];

      // Beam spacing
      const beamSpacing = W / (nLong - 1);
      const transSpacing = L / (nTrans - 1);

      // Composite section analysis
      const E_steel = 210000; // MPa
      const n = E_steel / deckType.E_deck; // Modular ratio

      // Effective flange width (EN 1994-2)
      const b_eff = Math.min(
        beamSpacing * 1000,
        (L * 1000) / 8,
        longSection.width + 8 * t_slab * 1000,
      );

      // Transformed section properties
      const A_slab = (b_eff * t_slab * 1000) / n; // mm2 (transformed)
      const A_beam = longSection.A * 100; // mm2

      // Neutral axis from bottom of steel beam
      const y_steel = longSection.depth / 2;
      const y_slab = longSection.depth + (t_slab * 1000) / 2;

      const A_total = A_beam + A_slab;
      const y_na = (A_beam * y_steel + A_slab * y_slab) / A_total;

      // Composite second moment of area
      const I_steel = longSection.I * 10000; // mm4
      const I_slab = (b_eff * Math.pow(t_slab * 1000, 3)) / (12 * n);

      const d_steel = y_na - y_steel;
      const d_slab = y_slab - y_na;

      const I_composite =
        I_steel + A_beam * Math.pow(d_steel, 2) + I_slab + A_slab * Math.pow(d_slab, 2);

      // Section moduli
      const Z_bot = I_composite / y_na;
      const Z_top = I_composite / (longSection.depth + t_slab * 1000 - y_na);

      // Grillage stiffnesses (kNm2)
      const D_long = (E_steel * I_composite) / 1e9;
      const D_trans = (E_steel * transSection.I * 1e4) / 1e9;

      // Calculate total loads with dynamic factor
      let totalPointLoads = 0;
      let totalUDL = 0;

      loadCases.forEach((lc) => {
        if (lc.type === 'point') {
          totalPointLoads += lc.magnitude * dynFactor;
        } else if (lc.type === 'tandem') {
          totalPointLoads += lc.magnitude * 2 * dynFactor; // 2 axles
        } else if (lc.type === 'udl') {
          const area = (lc.length || L) * (lc.width || W);
          totalUDL += lc.magnitude * area * dynFactor;
        }
      });

      // Self-weight
      const slabSelfWeight = deckType.selfWeight * (parseFloat(form.slabThickness) / 100) * L * W;
      const steelSelfWeight =
        ((longSection.A * 78.5) / 10000) * L * nLong +
        ((transSection.A * 78.5) / 10000) * W * nTrans;

      const totalLoad = totalPointLoads + totalUDL + slabSelfWeight + steelSelfWeight;

      // Load distribution using Courbon's method
      const beamDistribution: number[] = [];
      const avgLoadY =
        loadCases.reduce((sum, lc) => sum + lc.yPos * (lc.magnitude || 0), 0) /
        loadCases.reduce((sum, lc) => sum + (lc.magnitude || 0), 0);
      const eccentricity = avgLoadY - W / 2;

      const sumYsq = Array.from({ length: nLong }, (_, j) =>
        Math.pow(j * beamSpacing - W / 2, 2),
      ).reduce((a, b) => a + b, 0);

      for (let i = 0; i < nLong; i++) {
        const beamY = i * beamSpacing;
        let factor = 1 / nLong;
        factor += ((beamY - W / 2) * eccentricity) / (nLong * sumYsq || 1);
        beamDistribution.push(Math.max(0, factor));
      }

      const totalDist = beamDistribution.reduce((a, b) => a + b, 0);
      const normalizedDist = beamDistribution.map((d) => d / totalDist);

      // Calculate beam forces
      const beamResults = normalizedDist.map((dist, i) => {
        const beamLoad = totalLoad * dist;
        const udlPerM = beamLoad / L;
        const M_max = (udlPerM * Math.pow(L, 2)) / 8;
        const V_max = (udlPerM * L) / 2;
        const deflection = (5 * beamLoad * Math.pow(L * 1000, 3)) / (384 * E_steel * I_composite);

        return {
          beam: i + 1,
          distribution: dist * 100,
          load: beamLoad,
          moment: M_max,
          shear: V_max,
          deflection: deflection,
        };
      });

      // Find governing values
      const maxMoment = Math.max(...beamResults.map((b) => b.moment));
      const maxShear = Math.max(...beamResults.map((b) => b.shear));
      const maxDeflection = Math.max(...beamResults.map((b) => b.deflection));
      const governingBeam = beamResults.find((b) => b.moment === maxMoment);

      // Transverse beam analysis
      const transResults = [];
      for (let i = 0; i < nTrans; i++) {
        const x = i * transSpacing;
        let transLoad = 0;

        loadCases.forEach((lc) => {
          if (
            (lc.type === 'point' || lc.type === 'tandem') &&
            Math.abs(lc.xPos - x) < transSpacing / 2
          ) {
            transLoad += lc.magnitude * dynFactor;
          } else if (lc.type === 'udl') {
            transLoad += (lc.magnitude * transSpacing * (lc.width || W) * dynFactor) / nTrans;
          }
        });

        transResults.push({
          location: x,
          load: transLoad,
          moment: (transLoad * beamSpacing) / 8,
          shear: transLoad / 2,
        });
      }

      // Design checks
      const f_y = steelGrade.fy / gammaM0;
      const M_Rd = (longSection.Zp * 1000 * f_y) / 1e6; // kNm (plastic moment)
      const momentUtil = maxMoment / M_Rd;

      // Shear resistance
      const A_v = (longSection.A * 100 * longSection.tw) / longSection.depth; // Approx shear area
      const V_Rd = (A_v * (f_y / Math.sqrt(3))) / 1000; // kN
      const shearUtil = maxShear / V_Rd;

      // Deflection check
      const deflectionLimit = (L * 1000) / deflLimit;
      const deflectionUtil = maxDeflection / deflectionLimit;

      // Section class check (simplified)
      const c_f = (longSection.width - longSection.tw) / 2;
      const epsilon = Math.sqrt(235 / steelGrade.fy);
      const flangeClass =
        c_f / longSection.tf <= 9 * epsilon
          ? 1
          : c_f / longSection.tf <= 10 * epsilon
            ? 2
            : c_f / longSection.tf <= 14 * epsilon
              ? 3
              : 4;

      // Web class
      const c_w = longSection.depth - 2 * longSection.tf;
      const webClass =
        c_w / longSection.tw <= 72 * epsilon
          ? 1
          : c_w / longSection.tw <= 83 * epsilon
            ? 2
            : c_w / longSection.tw <= 124 * epsilon
              ? 3
              : 4;

      const sectionClass = Math.max(flangeClass, webClass);

      // Generate warnings
      if (momentUtil > 0.9)
        newWarnings.push(
          `High moment utilisation (${(momentUtil * 100).toFixed(1)}%) - consider larger section`,
        );
      if (shearUtil > 0.9)
        newWarnings.push(
          `High shear utilisation (${(shearUtil * 100).toFixed(1)}%) - check web thickness`,
        );
      if (deflectionUtil > 1.0)
        newWarnings.push(`Deflection exceeds L/${deflLimit} limit - increase beam stiffness`);
      if (sectionClass > 2)
        newWarnings.push(`Section is Class ${sectionClass} - plastic analysis may not be valid`);
      if (beamSpacing > 4)
        newWarnings.push(
          `Beam spacing ${beamSpacing.toFixed(1)}m exceeds 4m - check transverse distribution`,
        );
      if (transSpacing > 6)
        newWarnings.push(
          `Transverse spacing ${transSpacing.toFixed(1)}m is large - may affect load distribution accuracy`,
        );

      const overallStatus =
        momentUtil <= 1.0 && shearUtil <= 1.0 && deflectionUtil <= 1.0 ? 'PASS' : 'FAIL';

      setWarnings(newWarnings);
      setResults({
        geometry: {
          span: L,
          width: W,
          nLongBeams: nLong,
          nTransBeams: nTrans,
          beamSpacing: beamSpacing,
          transSpacing: transSpacing,
          slabThickness: parseFloat(form.slabThickness),
        },
        sections: {
          longSection: longSection.name,
          transSection: transSection.name,
          steelGrade: steelGrade.name,
          deckType: deckType.name,
        },
        composite: {
          modularRatio: n,
          b_eff: b_eff,
          y_na: y_na,
          I_composite: I_composite / 1e8, // cm4
          Z_bot: Z_bot / 1e3, // cm3
          Z_top: Z_top / 1e3,
          D_long: D_long,
          D_trans: D_trans,
          sectionClass: sectionClass,
        },
        loads: {
          totalPointLoads: totalPointLoads,
          totalUDL: totalUDL,
          slabSelfWeight: slabSelfWeight,
          steelSelfWeight: steelSelfWeight,
          totalLoad: totalLoad,
          dynamicFactor: dynFactor,
        },
        beamResults: beamResults,
        transResults: transResults,
        distribution: normalizedDist.map((d, i) => ({ beam: i + 1, factor: d * 100 })),
        governing: {
          beam: governingBeam?.beam,
          moment: maxMoment,
          shear: maxShear,
          deflection: maxDeflection,
        },
        capacity: {
          M_Rd: M_Rd,
          V_Rd: V_Rd,
          deflectionLimit: deflectionLimit,
        },
        utilisation: {
          moment: momentUtil * 100,
          shear: shearUtil * 100,
          deflection: deflectionUtil * 100,
        },
        status: overallStatus,
      });

      setIsCalculating(false);
      setActiveTab('results');
    }, 1500);
  };

  const buildReportData = (): ReportData => {
    const inputRows = [
      { label: 'Span Length', value: `${form.spanLength} m` },
      { label: 'Deck Width', value: `${form.deckWidth} m` },
      { label: 'Deck Type', value: DECK_TYPES[form.deckType]?.name || form.deckType },
      { label: 'Slab Thickness', value: `${form.slabThickness} mm` },
      { label: 'Longitudinal Beams', value: form.numLongBeams },
      { label: 'Transverse Beams', value: form.numTransBeams },
      {
        label: 'Long. Section',
        value: SECTION_DATABASE[form.longSection]?.name || form.longSection,
      },
      {
        label: 'Trans. Section',
        value: SECTION_DATABASE[form.transSection]?.name || form.transSection,
      },
      { label: 'Steel Grade', value: form.steelGrade },
      { label: 'Deflection Limit', value: `L/${form.deflectionLimit}` },
      { label: 'Dynamic Factor', value: form.dynamicFactor },
    ];

    const resultRows = results
      ? [
          {
            label: 'Beam Spacing',
            value: `${results.geometry.beamSpacing.toFixed(2)} m`,
            status: 'info' as const,
          },
          {
            label: 'Transverse Spacing',
            value: `${results.geometry.transSpacing.toFixed(2)} m`,
            status: 'info' as const,
          },
          {
            label: 'Modular Ratio (n)',
            value: results.composite.modularRatio.toFixed(1),
            status: 'info' as const,
          },
          {
            label: 'Effective Width',
            value: `${results.composite.b_eff.toFixed(0)} mm`,
            status: 'info' as const,
          },
          {
            label: 'Composite I',
            value: `${results.composite.I_composite.toFixed(0)} cm⁴`,
            status: 'info' as const,
          },
          {
            label: 'Section Class',
            value: `Class ${results.composite.sectionClass}`,
            status: results.composite.sectionClass <= 2 ? ('pass' as const) : ('warning' as const),
          },
          {
            label: 'Total Applied Load',
            value: `${results.loads.totalLoad.toFixed(1)} kN`,
            status: 'info' as const,
          },
          {
            label: 'Governing Beam',
            value: `Beam ${results.governing.beam}`,
            status: 'info' as const,
          },
          {
            label: 'Max Moment',
            value: `${results.governing.moment.toFixed(1)} kNm`,
            status: results.utilisation.moment <= 100 ? ('pass' as const) : ('fail' as const),
          },
          {
            label: 'Moment Capacity',
            value: `${results.capacity.M_Rd.toFixed(1)} kNm`,
            status: 'info' as const,
          },
          {
            label: 'Moment Utilisation',
            value: `${results.utilisation.moment.toFixed(1)}%`,
            status: results.utilisation.moment <= 100 ? ('pass' as const) : ('fail' as const),
          },
          {
            label: 'Max Shear',
            value: `${results.governing.shear.toFixed(1)} kN`,
            status: results.utilisation.shear <= 100 ? ('pass' as const) : ('fail' as const),
          },
          {
            label: 'Shear Capacity',
            value: `${results.capacity.V_Rd.toFixed(1)} kN`,
            status: 'info' as const,
          },
          {
            label: 'Shear Utilisation',
            value: `${results.utilisation.shear.toFixed(1)}%`,
            status: results.utilisation.shear <= 100 ? ('pass' as const) : ('fail' as const),
          },
          {
            label: 'Max Deflection',
            value: `${results.governing.deflection.toFixed(2)} mm`,
            status: results.utilisation.deflection <= 100 ? ('pass' as const) : ('fail' as const),
          },
          {
            label: 'Deflection Limit',
            value: `${results.capacity.deflectionLimit.toFixed(1)} mm`,
            status: 'info' as const,
          },
          {
            label: 'Deflection Utilisation',
            value: `${results.utilisation.deflection.toFixed(1)}%`,
            status: results.utilisation.deflection <= 100 ? ('pass' as const) : ('fail' as const),
          },
        ]
      : [];

    return {
      title: 'Grillage Analysis Report',
      subtitle: 'Bridge Deck Load Distribution Analysis',
      projectInfo: {
        client: 'Structural Engineering Project',
        project: `${form.spanLength}m Span Grillage`,
        engineer: 'Beaver Bridges',
        date: new Date().toLocaleDateString(),
      },
      summary: {
        status: results?.status || 'PENDING',
        message:
          results?.status === 'PASS'
            ? 'All design checks satisfied. Section is adequate.'
            : 'One or more checks exceeded - review section sizes.',
      },
      inputs: inputRows,
      results: resultRows,
      methodology: [
        'Composite section properties calculated using transformed area method (EN 1994-2)',
        'Modular ratio based on short-term concrete/steel moduli',
        'Effective flange width per EN 1994-2 Clause 5.4.1.2',
        "Load distribution by Courbon's method for eccentric loading",
        'Simply supported beam model for moment/shear/deflection',
        'Section class determined per EN 1993-1-1 Table 5.2',
        'Plastic moment capacity used for Class 1 and 2 sections',
        'Dynamic amplification applied to live loads',
      ],
      references: [
        'EN 1993-1-1: Eurocode 3 - Design of Steel Structures',
        'EN 1994-2: Eurocode 4 - Composite Steel and Concrete Bridges',
        'EN 1991-2: Eurocode 1 - Traffic Loads on Bridges',
        'SCI P356: Composite Highway Bridge Design',
        'PD 6695-2: Recommendations for Composite Highway Bridges',
      ],
      warnings: warnings,
      footer: 'Beaver Bridges Ltd | Grillage Analysis Module',
    };
  };

  const exportPDF = () => {
    if (!results) return;

    const getStatus = (util: number): 'PASS' | 'FAIL' => (util <= 100 ? 'PASS' : 'FAIL');

    generatePremiumPDF({
      title: 'Grillage Analysis Report',
      subtitle: 'Bridge Deck Load Distribution — EN 1993-1-1 / EN 1994-2',
      projectInfo: [
        { label: 'Project', value: `${form.spanLength}m Span Grillage` },
        { label: 'Reference', value: 'GRI001' },
      ],
      inputs: [
        { label: 'Span Length', value: `${form.spanLength} m` },
        { label: 'Deck Width', value: `${form.deckWidth} m` },
        { label: 'Slab Thickness', value: `${form.slabThickness} mm` },
        { label: 'Long. Beams', value: `${form.numLongBeams} × ${form.longSection}` },
        { label: 'Trans. Beams', value: `${form.numTransBeams} × ${form.transSection}` },
        { label: 'Steel Grade', value: form.steelGrade },
        { label: 'Deflection Limit', value: `L/${form.deflectionLimit}` },
        { label: 'Dynamic Factor', value: form.dynamicFactor },
        {
          label: 'Composite Ixx',
          value: `${results.composite?.I_composite?.toFixed(0) ?? '-'} cm⁴`,
        },
        { label: 'Section Class', value: `Class ${results.composite?.sectionClass ?? '-'}` },
        { label: 'Governing Beam', value: `Beam ${results.governing?.beam ?? '-'}` },
      ],
      checks: [
        {
          name: 'Bending Capacity (EN 1993-1-1 §6.2.5)',
          capacity: `${results.governing?.moment?.toFixed(1) ?? '-'} / ${results.capacity?.M_Rd?.toFixed(1) ?? '-'} kNm`,
          utilisation: `${results.utilisation?.moment?.toFixed(1) ?? '-'}%`,
          status: getStatus(results.utilisation?.moment ?? 0),
        },
        {
          name: 'Shear Capacity (EN 1993-1-1 §6.2.6)',
          capacity: `${results.governing?.shear?.toFixed(1) ?? '-'} / ${results.capacity?.V_Rd?.toFixed(1) ?? '-'} kN`,
          utilisation: `${results.utilisation?.shear?.toFixed(1) ?? '-'}%`,
          status: getStatus(results.utilisation?.shear ?? 0),
        },
        {
          name: 'Deflection (EN 1993-2 §7.2)',
          capacity: `${results.governing?.deflection?.toFixed(2) ?? '-'} / ${results.capacity?.deflectionLimit?.toFixed(1) ?? '-'} mm`,
          utilisation: `${results.utilisation?.deflection?.toFixed(1) ?? '-'}%`,
          status: getStatus(results.utilisation?.deflection ?? 0),
        },
      ],
      footerNote: 'Beaver Bridges Ltd — Grillage Analysis per EN 1993-1-1 / EN 1994-2',
    });
  };

  const exportDOCX = () => {
    if (!results) return;

    const getStatus = (util: number): 'PASS' | 'FAIL' => (util <= 100 ? 'PASS' : 'FAIL');

    generateDOCX({
      title: 'Grillage Analysis Report',
      subtitle: 'Bridge Deck Load Distribution — EN 1993-1-1 / EN 1994-2',
      projectInfo: [
        { label: 'Project', value: `${form.spanLength}m Span Grillage` },
        { label: 'Reference', value: 'GRI001' },
      ],
      inputs: [
        { label: 'Span Length', value: `${form.spanLength} m` },
        { label: 'Deck Width', value: `${form.deckWidth} m` },
        { label: 'Slab Thickness', value: `${form.slabThickness} mm` },
        { label: 'Long. Beams', value: `${form.numLongBeams} × ${form.longSection}` },
        { label: 'Trans. Beams', value: `${form.numTransBeams} × ${form.transSection}` },
        { label: 'Steel Grade', value: form.steelGrade },
        { label: 'Deflection Limit', value: `L/${form.deflectionLimit}` },
        { label: 'Dynamic Factor', value: form.dynamicFactor },
        {
          label: 'Composite Ixx',
          value: `${results.composite?.I_composite?.toFixed(0) ?? '-'} cm⁴`,
        },
        { label: 'Section Class', value: `Class ${results.composite?.sectionClass ?? '-'}` },
        { label: 'Governing Beam', value: `Beam ${results.governing?.beam ?? '-'}` },
      ],
      checks: [
        {
          name: 'Bending Capacity (EN 1993-1-1 §6.2.5)',
          capacity: `${results.governing?.moment?.toFixed(1) ?? '-'} / ${results.capacity?.M_Rd?.toFixed(1) ?? '-'} kNm`,
          utilisation: `${results.utilisation?.moment?.toFixed(1) ?? '-'}%`,
          status: getStatus(results.utilisation?.moment ?? 0),
        },
        {
          name: 'Shear Capacity (EN 1993-1-1 §6.2.6)',
          capacity: `${results.governing?.shear?.toFixed(1) ?? '-'} / ${results.capacity?.V_Rd?.toFixed(1) ?? '-'} kN`,
          utilisation: `${results.utilisation?.shear?.toFixed(1) ?? '-'}%`,
          status: getStatus(results.utilisation?.shear ?? 0),
        },
        {
          name: 'Deflection (EN 1993-2 §7.2)',
          capacity: `${results.governing?.deflection?.toFixed(2) ?? '-'} / ${results.capacity?.deflectionLimit?.toFixed(1) ?? '-'} mm`,
          utilisation: `${results.utilisation?.deflection?.toFixed(1) ?? '-'}%`,
          status: getStatus(results.utilisation?.deflection ?? 0),
        },
      ],
      footerNote: 'Beaver Bridges Ltd — Grillage Analysis per EN 1993-1-1 / EN 1994-2',
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-4 px-6 py-3 rounded-full glass border border-cyan-500/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiGrid className="text-cyan-400" size={24} />
            <span className="text-white font-semibold">Bridge Deck Analysis</span>
          </motion.div>
          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent text-center">
            Grillage Analysis Studio
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Grillage analysis & load distribution
          </p>
        </motion.div>

        {/* Status Banner */}
        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mb-6 p-4 rounded-xl border-2 shadow-lg flex items-center justify-between',
              results.status === 'PASS'
                ? 'bg-green-500/10 border-green-500/50'
                : 'bg-red-500/10 border-red-500/50',
            )}
          >
            <div className="flex items-center gap-3">
              {results.status === 'PASS' ? (
                <FiCheck className="text-green-400 text-2xl" />
              ) : (
                <FiAlertTriangle className="text-red-400 text-2xl" />
              )}
              <div>
                <p
                  className={cn(
                    'font-bold text-lg',
                    results.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                  )}
                >
                  {results.status === 'PASS' ? 'ALL CHECKS PASS' : 'DESIGN CHECK FAILED'}
                </p>
                <p className="text-gray-400 text-sm">
                  Governing beam: {results.governing.beam} | Max utilisation:{' '}
                  {Math.max(
                    results.utilisation.moment,
                    results.utilisation.shear,
                    results.utilisation.deflection,
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                variant="neon"
                className="bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                <FiDownload className="mr-2" /> Export PDF
              </Button>
              <Button
                onClick={exportDOCX}
                variant="neon"
                className="bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                <FiDownload className="mr-2" /> DOCX
              </Button>
              <SaveRunButton
                calculatorKey="grillage"
                inputs={form as unknown as Record<string, string | number>}
                results={results}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
              />
            </div>
          </motion.div>
        )}

        {/* Glass Toolbar */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex gap-2 p-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl">
            {['geometry', 'loads', 'results'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'neon' : 'ghost'}
                onClick={() => setActiveTab(tab as any)}
                disabled={tab === 'results' && !results}
                className={cn(
                  'px-6 py-2 rounded-xl font-semibold capitalize',
                  activeTab === tab
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    : 'text-gray-400',
                )}
              >
                {tab === 'geometry' ? '📐 Geometry' : tab === 'loads' ? '📊 Loads' : '📈 Results'}
              </Button>
            ))}
          </div>
        </div>

        {activeTab === 'geometry' ? (
          <motion.div
            key="geometry"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            {/* Left Column - Inputs */}
            <div className="space-y-6">
              {/* Preset */}
              <CollapsibleSection
                title="Quick Presets"
                icon={FiSettings}
                defaultOpen={true}
                accentColor="blue"
              >
                <select
                  title="Selection"
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a preset configuration...
                  </option>
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </CollapsibleSection>

              {/* Deck Geometry */}
              <CollapsibleSection
                title="Deck Geometry"
                icon={FiMaximize2}
                defaultOpen={true}
                accentColor="cyan"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <ExplainableLabel label="Span Length (m)" field="grillage-span" />
                      <input
                        title="Span Length (m)"
                        type="number"
                        value={form.spanLength}
                        onChange={(e) => updateForm('spanLength', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                      />
                    </div>
                    <div>
                      <ExplainableLabel label="Deck Width (m)" field="grillage-width" />
                      <input
                        title="Deck Width (m)"
                        type="number"
                        value={form.deckWidth}
                        onChange={(e) => updateForm('deckWidth', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">
                      Deck Type
                    </label>
                    <select
                      title="Deck Type"
                      value={form.deckType}
                      onChange={(e) => updateForm('deckType', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    >
                      {Object.entries(DECK_TYPES).map(([key, dt]) => (
                        <option key={key} value={key}>
                          {dt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">
                      Slab Thickness <span className="text-neon-cyan text-xs">(mm)</span>
                    </label>
                    <input
                      title="Slab Thickness"
                      type="number"
                      value={form.slabThickness}
                      onChange={(e) => updateForm('slabThickness', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-200 block mb-1">
                        No. Long. Beams
                      </label>
                      <input
                        title="No. Long. Beams"
                        type="number"
                        value={form.numLongBeams}
                        onChange={(e) => updateForm('numLongBeams', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                        min="2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-200 block mb-1">
                        No. Trans. Beams
                      </label>
                      <input
                        title="No. Trans. Beams"
                        type="number"
                        value={form.numTransBeams}
                        onChange={(e) => updateForm('numTransBeams', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                        min="2"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Beam Sections */}
              <CollapsibleSection
                title="Beam Sections"
                icon={FiLayers}
                defaultOpen={true}
                accentColor="purple"
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">
                      Longitudinal Section
                    </label>
                    <select
                      title="Long Section"
                      value={form.longSection}
                      onChange={(e) => updateForm('longSection', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    >
                      {Object.entries(SECTION_DATABASE).map(([key, sec]) => (
                        <option key={key} value={key}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">
                      Transverse Section
                    </label>
                    <select
                      title="Transverse Section"
                      value={form.transSection}
                      onChange={(e) => updateForm('transSection', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    >
                      {Object.entries(SECTION_DATABASE).map(([key, sec]) => (
                        <option key={key} value={key}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">
                      Steel Grade
                    </label>
                    <select
                      title="Steel Grade"
                      value={form.steelGrade}
                      onChange={(e) => updateForm('steelGrade', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    >
                      {Object.entries(STEEL_GRADES).map(([key, grade]) => (
                        <option key={key} value={key}>
                          {grade.name} (fy = {grade.fy} MPa)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Design Parameters */}
              <CollapsibleSection
                title="Design Parameters"
                icon={FiSettings}
                defaultOpen={false}
                accentColor="orange"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">
                      Deflection Limit <span className="text-neon-cyan text-xs">(L/...)</span>
                    </label>
                    <input
                      title="Deflection Limit"
                      type="number"
                      value={form.deflectionLimit}
                      onChange={(e) => updateForm('deflectionLimit', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">
                      Dynamic Factor
                    </label>
                    <input
                      title="Dynamic Factor"
                      type="number"
                      step="0.05"
                      value={form.dynamicFactor}
                      onChange={(e) => updateForm('dynamicFactor', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">γM0</label>
                    <input
                      title="γM0"
                      type="number"
                      step="0.05"
                      value={form.gammaM0}
                      onChange={(e) => updateForm('gammaM0', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-1">γM1</label>
                    <input
                      title="γM1"
                      type="number"
                      step="0.05"
                      value={form.gammaM1}
                      onChange={(e) => updateForm('gammaM1', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {/* Right Column - Visualization */}
            <div className="space-y-6 sticky top-8">
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
                      <Grillage3D />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                      aria-label="Minimize preview"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      GRILLAGE — REAL-TIME PREVIEW
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
                            {form[s.key as keyof typeof form]} {s.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={parseFloat(String(form[s.key as keyof typeof form])) || s.min}
                          onChange={(e) => updateForm(s.key, e.target.value)}
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
                title="Grillage — 3D Preview"
                sliders={whatIfSliders}
                form={form}
                updateForm={updateForm}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                onMaximize={() => setPreviewMaximized(true)}
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                    <Grillage3D />
                  </Interactive3DDiagram>
                )}
              />

              {/* Section Properties Summary */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardContent className="py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <p className="text-gray-500 text-xs">Long. I</p>
                      <p className="text-white font-bold">
                        {SECTION_DATABASE[form.longSection]?.I.toLocaleString()} cm⁴
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <p className="text-gray-500 text-xs">Trans. I</p>
                      <p className="text-white font-bold">
                        {SECTION_DATABASE[form.transSection]?.I.toLocaleString()} cm⁴
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <p className="text-gray-500 text-xs">Long. Depth</p>
                      <p className="text-white font-bold">
                        {SECTION_DATABASE[form.longSection]?.depth} mm
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <p className="text-gray-500 text-xs">Trans. Depth</p>
                      <p className="text-white font-bold">
                        {SECTION_DATABASE[form.transSection]?.depth} mm
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => setActiveTab('loads')}
                variant="neon"
                className="w-full py-4 text-lg font-bold bg-gradient-to-r from-cyan-500 to-blue-500"
              >
                Continue to Loads →
              </Button>
            </div>
          </motion.div>
        ) : activeTab === 'loads' ? (
          <motion.div
            key="loads"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Load Cases */}
            <CollapsibleSection
              title={`Load Cases (${loadCases.length})`}
              icon={FiBarChart2}
              defaultOpen={true}
              accentColor="orange"
            >
              <div className="flex justify-end mb-4">
                <Button
                  onClick={addLoadCase}
                  variant="neon"
                  className="bg-gradient-to-r from-orange-500 to-red-500"
                >
                  <FiPlus className="mr-2" /> Add Load
                </Button>
              </div>
              <div className="space-y-3">
                {loadCases.map((lc) => (
                  <div
                    key={lc.id}
                    className="grid grid-cols-12 gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700 items-end"
                  >
                    <div className="col-span-2">
                      <label className="text-gray-500 text-xs block mb-1">Name</label>
                      <input
                        title="Name"
                        type="text"
                        value={lc.name}
                        onChange={(e) => updateLoadCase(lc.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-gray-500 text-xs block mb-1">Type</label>
                      <select
                        title="Type"
                        value={lc.type}
                        onChange={(e) => updateLoadCase(lc.id, 'type', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                      >
                        <option value="point">Point</option>
                        <option value="tandem">Tandem</option>
                        <option value="udl">UDL</option>
                        <option value="lane">Lane</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-gray-500 text-xs block mb-1">
                        {lc.type === 'udl' ? 'kN/m²' : 'kN'}
                      </label>
                      <input
                        title="Input value"
                        type="number"
                        value={lc.magnitude}
                        onChange={(e) =>
                          updateLoadCase(lc.id, 'magnitude', parseFloat(e.target.value))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-gray-500 text-xs block mb-1">X Pos (m)</label>
                      <input
                        title="X Pos (m)"
                        type="number"
                        value={lc.xPos}
                        onChange={(e) => updateLoadCase(lc.id, 'xPos', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-gray-500 text-xs block mb-1">Y Pos (m)</label>
                      <input
                        title="Y Pos (m)"
                        type="number"
                        value={lc.yPos}
                        onChange={(e) => updateLoadCase(lc.id, 'yPos', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                      />
                    </div>
                    {lc.type === 'udl' && (
                      <div className="col-span-1">
                        <label className="text-gray-500 text-xs block mb-1">Width</label>
                        <input
                          title="Width"
                          type="number"
                          value={lc.width || 3}
                          onChange={(e) =>
                            updateLoadCase(lc.id, 'width', parseFloat(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                        />
                      </div>
                    )}
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLoadCase(lc.id)}
                        disabled={loadCases.length <= 1}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <FiTrash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Standard Load Models Reference */}
            <CollapsibleSection
              title="Standard Load Models (EN 1991-2)"
              icon={FiTarget}
              defaultOpen={false}
              accentColor="blue"
            >
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(LOAD_MODELS).map(([key, model]) => (
                  <div
                    key={key}
                    className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-sm"
                  >
                    <p className="text-white font-semibold">{model.name}</p>
                    <p className="text-gray-400">Tandem: {model.tandem_axle} kN</p>
                    <p className="text-gray-400">UDL: {model.udl} kN/m²</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Calculate Button */}
            <div className="pt-4">
              <Button
                disabled={isCalculating}
                onClick={runAnalysis}
                variant="neon"
                className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all"
              >
                {isCalculating ? (
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analysing Grillage...
                  </div>
                ) : (
                  <span className="flex items-center gap-3">⚡ RUN FULL ANALYSIS</span>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Warnings */}
            {warnings.length > 0 && (
              <Card variant="glass" className="border-yellow-500/40">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle className="text-yellow-400 text-xl flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-yellow-400 font-semibold mb-2">Design Warnings</p>
                      <ul className="space-y-1 text-sm text-gray-300">
                        {warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {results && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="border-l-4 border-green-400 bg-gray-800/50 rounded-r-xl p-4 flex items-center gap-3">
                    <FiCheck className="text-green-400 text-xl" />
                    <div>
                      <p className="text-xs text-gray-400">Max Moment</p>
                      <p className="text-white font-bold">
                        {results.governing.moment.toFixed(1)} kNm
                      </p>
                    </div>
                  </div>
                  <div className="border-l-4 border-amber-400 bg-gray-800/50 rounded-r-xl p-4 flex items-center gap-3">
                    <FiCheck className="text-amber-400 text-xl" />
                    <div>
                      <p className="text-xs text-gray-400">Max Shear</p>
                      <p className="text-white font-bold">
                        {results.governing.shear.toFixed(1)} kN
                      </p>
                    </div>
                  </div>
                  <div className="border-l-4 border-red-400 bg-gray-800/50 rounded-r-xl p-4 flex items-center gap-3">
                    <FiCheck className="text-red-400 text-xl" />
                    <div>
                      <p className="text-xs text-gray-400">Max Deflection</p>
                      <p className="text-white font-bold">
                        {results.governing.deflection.toFixed(2)} mm
                      </p>
                    </div>
                  </div>
                </div>

                {/* Composite Section Properties */}
                <CollapsibleSection
                  title="Composite Section Properties"
                  icon={FiLayers}
                  defaultOpen={true}
                  accentColor="purple"
                >
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
                      <p className="text-gray-500 text-xs">Modular Ratio</p>
                      <p className="text-2xl font-bold text-white">
                        {results.composite.modularRatio.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
                      <p className="text-gray-500 text-xs">Effective Width</p>
                      <p className="text-2xl font-bold text-white">
                        {results.composite.b_eff.toFixed(0)} <span className="text-sm">mm</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
                      <p className="text-gray-500 text-xs">Composite I</p>
                      <p className="text-2xl font-bold text-cyan-400">
                        {results.composite.I_composite.toFixed(0)}{' '}
                        <span className="text-sm">cm⁴</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
                      <p className="text-gray-500 text-xs">Section Class</p>
                      <p
                        className={cn(
                          'text-2xl font-bold',
                          results.composite.sectionClass <= 2
                            ? 'text-green-400'
                            : 'text-yellow-400',
                        )}
                      >
                        Class {results.composite.sectionClass}
                      </p>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Load Distribution */}
                <CollapsibleSection
                  title="Load Distribution (Courbon)"
                  icon={FiBarChart2}
                  defaultOpen={true}
                  accentColor="cyan"
                >
                  <div className="flex items-end justify-center gap-4 h-48">
                    {results.distribution.map((d: any, idx: number) => (
                      <div key={idx} className="text-center flex-1">
                        <div className="h-32 flex items-end justify-center mb-2">
                          <motion.div
                            className="w-full max-w-12 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t"
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.min(d.factor, 100)}%` }}
                            transition={{ delay: idx * 0.1 }}
                          />
                        </div>
                        <p className="text-white font-bold text-sm">{d.factor.toFixed(1)}%</p>
                        <p className="text-gray-500 text-xs">Beam {d.beam}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* Beam Results Table */}
                <CollapsibleSection
                  title="Longitudinal Beam Forces"
                  icon={FiLayers}
                  defaultOpen={true}
                  accentColor="blue"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-gray-400">Beam</th>
                          <th className="text-center p-3 text-gray-400">Distribution</th>
                          <th className="text-center p-3 text-gray-400">Load (kN)</th>
                          <th className="text-center p-3 text-gray-400">Moment (kNm)</th>
                          <th className="text-center p-3 text-gray-400">Shear (kN)</th>
                          <th className="text-center p-3 text-gray-400">Deflection (mm)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.beamResults.map((beam: any) => (
                          <tr
                            key={beam.beam}
                            className={cn(
                              'border-b border-gray-800',
                              beam.beam === results.governing.beam ? 'bg-cyan-500/10' : '',
                            )}
                          >
                            <td className="p-3 text-white font-semibold">Beam {beam.beam}</td>
                            <td className="text-center p-3 text-cyan-400">
                              {beam.distribution.toFixed(1)}%
                            </td>
                            <td className="text-center p-3 text-white">{beam.load.toFixed(1)}</td>
                            <td className="text-center p-3 text-white">{beam.moment.toFixed(1)}</td>
                            <td className="text-center p-3 text-white">{beam.shear.toFixed(1)}</td>
                            <td className="text-center p-3 text-white">
                              {beam.deflection.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>

                {/* Utilisation Checks */}
                <CollapsibleSection
                  title="Design Check Utilisation"
                  icon={FiTarget}
                  defaultOpen={true}
                  accentColor="green"
                >
                  <div className="space-y-4">
                    {[
                      {
                        name: 'Moment',
                        value: results.utilisation.moment,
                        capacity: `${results.capacity.M_Rd.toFixed(0)} kNm`,
                      },
                      {
                        name: 'Shear',
                        value: results.utilisation.shear,
                        capacity: `${results.capacity.V_Rd.toFixed(0)} kN`,
                      },
                      {
                        name: 'Deflection',
                        value: results.utilisation.deflection,
                        capacity: `${results.capacity.deflectionLimit.toFixed(1)} mm`,
                      },
                    ].map((check) => (
                      <div key={check.name} className="flex items-center gap-4">
                        <div className="w-28 text-gray-400 text-sm">{check.name}</div>
                        <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className={cn(
                              'h-full rounded-full',
                              check.value <= 70
                                ? 'bg-green-500'
                                : check.value <= 90
                                  ? 'bg-yellow-500'
                                  : check.value <= 100
                                    ? 'bg-orange-500'
                                    : 'bg-red-500',
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(check.value, 100)}%` }}
                          />
                        </div>
                        <div className="w-20 text-right">
                          <span
                            className={cn(
                              'font-bold',
                              check.value <= 100 ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {check.value.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-24 text-gray-500 text-xs">Cap: {check.capacity}</div>
                        <div className="w-12">
                          {check.value <= 100 ? (
                            <FiCheck className="text-green-400" />
                          ) : (
                            <FiAlertTriangle className="text-red-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              </>
            )}
          </motion.div>
        )}
      </div>

      <style>{`
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(6,182,212,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.07) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
};

export default Grillage;
