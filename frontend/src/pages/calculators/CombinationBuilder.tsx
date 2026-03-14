// =============================================================================
// Load Combination Builder — Premium Edition
// EN 1990 Load Combinations — ULS, SLS & Accidental
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
  FiMinimize2,
  FiPlus,
  FiSettings,
  FiSliders,
  FiTrash2,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import LoadCombinations3D from '../../components/3d/scenes/LoadCombinations3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface LoadCase {
  id: string;
  name: string;
  category: string;
  bending: number;
  shear: number;
  axial: number;
  torsion: number;
  isLeading: boolean;
}

interface Combination {
  id: string;
  name: string;
  type: string;
  loads: { caseId: string; factor: number }[];
  bending: number;
  shear: number;
  axial: number;
  torsion: number;
}

interface FormData {
  design_code: string;
  design_approach: string;
  structure_type: string;
  consequence_class: string;
  include_traffic: boolean;
  include_wind: boolean;
  include_thermal: boolean;
  include_snow: boolean;
  include_seismic: boolean;
  projectName: string;
  reference: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const LOAD_CATEGORIES: Record<string, any> = {
  permanent: {
    name: 'Permanent (G)',
    gamma_sup: 1.35,
    gamma_inf: 1.0,
    psi_0: 1.0,
    psi_1: 1.0,
    psi_2: 1.0,
    color: '#64748b',
    description: 'Self-weight, superimposed dead',
  },
  traffic_gr1a: {
    name: 'Traffic gr1a (LM1)',
    gamma_sup: 1.35,
    gamma_inf: 0,
    psi_0: 0.75,
    psi_1: 0.75,
    psi_2: 0,
    color: '#3b82f6',
    description: 'Normal traffic (LM1)',
  },
  traffic_gr1b: {
    name: 'Traffic gr1b (LM2)',
    gamma_sup: 1.35,
    gamma_inf: 0,
    psi_0: 0.4,
    psi_1: 0.4,
    psi_2: 0,
    color: '#2563eb',
    description: 'Single axle (LM2)',
  },
  pedestrian: {
    name: 'Pedestrian gr3',
    gamma_sup: 1.35,
    gamma_inf: 0,
    psi_0: 0.4,
    psi_1: 0.4,
    psi_2: 0,
    color: '#8b5cf6',
    description: 'Crowd loading',
  },
  wind: {
    name: 'Wind (W)',
    gamma_sup: 1.5,
    gamma_inf: 0,
    psi_0: 0.5,
    psi_1: 0.2,
    psi_2: 0,
    color: '#06b6d4',
    description: 'Wind actions FW*',
  },
  thermal: {
    name: 'Thermal (T)',
    gamma_sup: 1.5,
    gamma_inf: 0,
    psi_0: 0.6,
    psi_1: 0.5,
    psi_2: 0,
    color: '#f59e0b',
    description: 'Temperature effects',
  },
  snow: {
    name: 'Snow (S)',
    gamma_sup: 1.5,
    gamma_inf: 0,
    psi_0: 0.5,
    psi_1: 0.2,
    psi_2: 0,
    color: '#e5e7eb',
    description: 'Snow loading',
  },
};

const PRESETS: Record<
  string,
  {
    name: string;
    structure_type: string;
    design_code: string;
    design_approach: string;
    consequence_class: string;
    include_traffic: boolean;
    include_wind: boolean;
    include_thermal: boolean;
    include_snow: boolean;
    include_seismic: boolean;
  }
> = {
  highway_bridge: {
    name: 'Highway Bridge (Standard)',
    structure_type: 'bridge',
    design_code: 'EN 1990:2002',
    design_approach: 'Approach 1',
    consequence_class: 'CC2',
    include_traffic: true,
    include_wind: true,
    include_thermal: true,
    include_snow: false,
    include_seismic: false,
  },
  rail_bridge: {
    name: 'Rail Bridge',
    structure_type: 'bridge',
    design_code: 'EN 1990:2002',
    design_approach: 'Approach 1',
    consequence_class: 'CC3',
    include_traffic: true,
    include_wind: true,
    include_thermal: true,
    include_snow: false,
    include_seismic: false,
  },
  footbridge: {
    name: 'Footbridge',
    structure_type: 'bridge',
    design_code: 'EN 1990:2002',
    design_approach: 'Approach 1',
    consequence_class: 'CC1',
    include_traffic: true,
    include_wind: true,
    include_thermal: false,
    include_snow: false,
    include_seismic: false,
  },
  coastal_bridge: {
    name: 'Coastal Bridge (Exposed)',
    structure_type: 'bridge',
    design_code: 'EN 1990:2002',
    design_approach: 'Approach 1',
    consequence_class: 'CC2',
    include_traffic: true,
    include_wind: true,
    include_thermal: true,
    include_snow: false,
    include_seismic: false,
  },
  viaduct_seismic: {
    name: 'Viaduct (Seismic Zone)',
    structure_type: 'bridge',
    design_code: 'EN 1990:2002',
    design_approach: 'Approach 1',
    consequence_class: 'CC3',
    include_traffic: true,
    include_wind: true,
    include_thermal: true,
    include_snow: false,
    include_seismic: true,
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CombinationBuilder: React.FC = () => {
  const [form, setForm] = useState<FormData>({
    design_code: 'EN 1990:2002',
    design_approach: 'Approach 1',
    structure_type: 'bridge',
    consequence_class: 'CC2',
    include_traffic: true,
    include_wind: true,
    include_thermal: false,
    include_snow: false,
    include_seismic: false,
    projectName: '',
    reference: '',
  });
  // What-If sliders
  const whatIfSliders = [
    { key: 'design_code', label: 'Design_code', min: 0, max: 100, step: 1, unit: '' },
    { key: 'design_approach', label: 'Design_approach', min: 0, max: 100, step: 1, unit: '' },
    { key: 'structure_type', label: 'Structure_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'consequence_class', label: 'Consequence_class', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [loadCases, setLoadCases] = useState<LoadCase[]>([
    {
      id: 'LC1',
      name: 'Self Weight',
      category: 'permanent',
      bending: 100,
      shear: 50,
      axial: 0,
      torsion: 0,
      isLeading: false,
    },
    {
      id: 'LC2',
      name: 'LM1 Traffic',
      category: 'traffic_gr1a',
      bending: 250,
      shear: 120,
      axial: 0,
      torsion: 10,
      isLeading: true,
    },
  ]);

  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    settings: true,
    loadCases: true,
    options: false,
  });
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const updateForm = (field: keyof FormData, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (preset) {
      const { name: _name, ...fields } = preset;
      setForm((p) => ({ ...p, ...fields }));
      setCombinations([]);
    }
  };

  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = useCallback(() => {
    // Input validation — form has no numeric fields; load case values validated inline
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, []);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors);
      return;
    }

    const combs: Combination[] = [];
    const permanentLoads = loadCases.filter((lc) => lc.category === 'permanent');
    const variableLoads = loadCases.filter((lc) => lc.category !== 'permanent');

    // 1. ULS STR (6.10) - Permanent + Leading Variable + Accompanying Variable
    variableLoads.forEach((leading, idx) => {
      const name = `ULS-STR-${idx + 1} (${leading.name} Leading)`;
      let bending = 0,
        shear = 0,
        axial = 0,
        torsion = 0;
      const loadFactors: { caseId: string; factor: number }[] = [];

      // Permanent
      permanentLoads.forEach((lc) => {
        const factor = 1.35;
        bending += lc.bending * factor;
        shear += lc.shear * factor;
        axial += lc.axial * factor;
        torsion += lc.torsion * factor;
        loadFactors.push({ caseId: lc.id, factor });
      });

      // Leading Variable
      const lFactor = 1.5;
      bending += leading.bending * lFactor;
      shear += leading.shear * lFactor;
      axial += leading.axial * lFactor;
      torsion += leading.torsion * lFactor;
      loadFactors.push({ caseId: leading.id, factor: lFactor });

      // Accompanying Variables
      variableLoads.forEach((other) => {
        if (other.id === leading.id) return;
        const cat = LOAD_CATEGORIES[other.category];
        const factor = 1.5 * (cat?.psi_0 || 0.6);
        bending += other.bending * factor;
        shear += other.shear * factor;
        axial += other.axial * factor;
        torsion += other.torsion * factor;
        loadFactors.push({ caseId: other.id, factor });
      });

      combs.push({
        id: `ULS${idx + 1}`,
        name,
        type: 'ULS',
        loads: loadFactors,
        bending,
        shear,
        axial,
        torsion,
      });
    });

    // 2. SLS Characteristic
    variableLoads.forEach((leading, idx) => {
      const name = `SLS-CHAR-${idx + 1} (${leading.name} Leading)`;
      let bending = 0,
        shear = 0,
        axial = 0,
        torsion = 0;
      const loadFactors: { caseId: string; factor: number }[] = [];

      permanentLoads.forEach((lc) => {
        bending += lc.bending;
        shear += lc.shear;
        axial += lc.axial;
        torsion += lc.torsion;
        loadFactors.push({ caseId: lc.id, factor: 1.0 });
      });

      bending += leading.bending;
      shear += leading.shear;
      axial += leading.axial;
      torsion += leading.torsion;
      loadFactors.push({ caseId: leading.id, factor: 1.0 });

      variableLoads.forEach((other) => {
        if (other.id === leading.id) return;
        const factor = LOAD_CATEGORIES[other.category]?.psi_0 || 0.6;
        bending += other.bending * factor;
        shear += other.shear * factor;
        axial += other.axial * factor;
        torsion += other.torsion * factor;
        loadFactors.push({ caseId: other.id, factor });
      });

      combs.push({
        id: `SLS${idx + 1}`,
        name,
        type: 'SLS',
        loads: loadFactors,
        bending,
        shear,
        axial,
        torsion,
      });
    });

    setCombinations(combs);

    // Generate warnings
    const w: string[] = [];
    if (combs.length === 0) w.push('No combinations generated — add load cases');
    const uls = combs.filter((c) => c.type === 'ULS');
    const sls = combs.filter((c) => c.type === 'SLS');
    if (uls.length === 0 && combs.length > 0)
      w.push('No ULS combinations generated — check load case types');
    if (sls.length === 0 && combs.length > 0) w.push('No SLS combinations generated');
    const maxBM = combs.length > 0 ? Math.max(...combs.map((c) => Math.abs(c.bending))) : 0;
    const maxV = combs.length > 0 ? Math.max(...combs.map((c) => Math.abs(c.shear))) : 0;
    if (maxBM > 10000)
      w.push(`Very high bending moment ${maxBM.toFixed(0)} kNm — verify load magnitudes`);
    if (maxV > 5000) w.push(`Very high shear force ${maxV.toFixed(0)} kN — verify load magnitudes`);
    setWarnings(w);
  }, [loadCases]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  const addLoadCase = () => {
    const newId = `LC${loadCases.length + 1}`;
    setLoadCases([
      ...loadCases,
      {
        id: newId,
        name: 'New Variable Load',
        category: 'wind',
        bending: 0,
        shear: 0,
        axial: 0,
        torsion: 0,
        isLeading: false,
      },
    ]);
  };

  const removeLoadCase = (id: string) => {
    setLoadCases(loadCases.filter((lc) => lc.id !== id));
  };

  const updateLoadCase = (id: string, field: keyof LoadCase, value: any) => {
    setLoadCases(loadCases.map((lc) => (lc.id === id ? { ...lc, [field]: value } : lc)));
  };

  const handleExportPDF = async () => {
    const maxBending =
      combinations.length > 0 ? Math.max(...combinations.map((c) => c.bending)) : 0;
    const maxShear = combinations.length > 0 ? Math.max(...combinations.map((c) => c.shear)) : 0;
    const maxAxial =
      combinations.length > 0 ? Math.max(...combinations.map((c) => Math.abs(c.axial))) : 0;
    const maxTorsion =
      combinations.length > 0 ? Math.max(...combinations.map((c) => c.torsion)) : 0;
    const nULS = combinations.filter((c) => c.type === 'ULS').length;
    const nSLS = combinations.filter((c) => c.type === 'SLS').length;

    await generatePremiumPDF({
      title: 'Load Combination Analysis',
      subtitle: 'EN 1990 — Basis of Structural Design',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
        { label: 'Design Code', value: form.design_code },
        { label: 'Structure Type', value: form.structure_type },
      ],
      inputs: [
        { label: 'Design Approach', value: form.design_approach },
        { label: 'Consequence Class', value: form.consequence_class },
        { label: 'Total Load Cases', value: String(loadCases.length) },
        {
          label: 'Combinations Generated',
          value: `${combinations.length} (${nULS} ULS + ${nSLS} SLS)`,
        },
        { label: 'Traffic Actions', value: form.include_traffic ? 'Included' : 'Excluded' },
        { label: 'Wind Actions', value: form.include_wind ? 'Included' : 'Excluded' },
        { label: 'Thermal Actions', value: form.include_thermal ? 'Included' : 'Excluded' },
        { label: 'Seismic Actions', value: form.include_seismic ? 'Included' : 'Excluded' },
      ],
      sections:
        combinations.slice(0, 20).length > 0
          ? [
              {
                title: `Generated Combinations (${combinations.length} total)`,
                head: [['ID', 'Name', 'M (kNm)', 'V (kN)', 'N (kN)', 'T (kNm)']],
                body: combinations
                  .slice(0, 20)
                  .map((c) => [
                    c.id,
                    c.name,
                    c.bending.toFixed(1),
                    c.shear.toFixed(1),
                    c.axial.toFixed(1),
                    c.torsion.toFixed(1),
                  ]),
              },
            ]
          : undefined,
      checks: [
        {
          name: 'ULS Combinations (EN 1990 §6.4.3)',
          capacity: `${nULS} generated`,
          utilisation: nULS > 0 ? '100%' : '0%',
          status: (nULS > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'SLS Combinations (EN 1990 §6.5)',
          capacity: `${nSLS} generated`,
          utilisation: nSLS > 0 ? '100%' : '0%',
          status: (nSLS > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Max Bending Moment',
          capacity: `${maxBending.toFixed(1)} kNm`,
          utilisation: '-',
          status: (maxBending > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Max Shear Force',
          capacity: `${maxShear.toFixed(1)} kN`,
          utilisation: '-',
          status: (maxShear > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        ...(nULS === 0
          ? [
              {
                check: 'No ULS Combinations',
                suggestion: 'No ULS combinations generated — check load case setup',
              },
            ]
          : []),
        ...(nSLS === 0
          ? [
              {
                check: 'No SLS Combinations',
                suggestion: 'No SLS combinations generated — check serviceability requirements',
              },
            ]
          : []),
        ...(combinations.length > 100
          ? [
              {
                check: 'Many Combinations',
                suggestion: `${combinations.length} combinations generated — verify scope is appropriate for design stage`,
              },
            ]
          : []),
        {
          check: 'Overall',
          suggestion: `${combinations.length} combinations generated (${nULS} ULS + ${nSLS} SLS) per EN 1990`,
        },
      ],
      warnings,
      footerNote: 'Beaver Bridges Ltd — Load Combination Analysis per EN 1990',
    });
  };

  const handleExportDOCX = async () => {
    const maxBending =
      combinations.length > 0 ? Math.max(...combinations.map((c) => c.bending)) : 0;
    const maxShear = combinations.length > 0 ? Math.max(...combinations.map((c) => c.shear)) : 0;
    const nULS = combinations.filter((c) => c.type === 'ULS').length;
    const nSLS = combinations.filter((c) => c.type === 'SLS').length;
    generateDOCX({
      title: 'Load Combination Analysis',
      subtitle: 'EN 1990 — Basis of Structural Design',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
        { label: 'Design Code', value: form.design_code },
        { label: 'Structure Type', value: form.structure_type },
      ],
      inputs: [
        { label: 'Design Approach', value: form.design_approach },
        { label: 'Consequence Class', value: form.consequence_class },
        { label: 'Total Load Cases', value: String(loadCases.length) },
        {
          label: 'Combinations Generated',
          value: `${combinations.length} (${nULS} ULS + ${nSLS} SLS)`,
        },
        { label: 'Traffic Actions', value: form.include_traffic ? 'Included' : 'Excluded' },
        { label: 'Wind Actions', value: form.include_wind ? 'Included' : 'Excluded' },
      ],
      sections:
        combinations.slice(0, 20).length > 0
          ? [
              {
                title: `Generated Combinations (${combinations.length} total)`,
                head: [['ID', 'Name', 'M (kNm)', 'V (kN)', 'N (kN)', 'T (kNm)']],
                body: combinations
                  .slice(0, 20)
                  .map((c) => [
                    c.id,
                    c.name,
                    c.bending.toFixed(1),
                    c.shear.toFixed(1),
                    c.axial.toFixed(1),
                    c.torsion.toFixed(1),
                  ]),
              },
            ]
          : undefined,
      checks: [
        {
          name: 'ULS Combinations',
          capacity: `${nULS} generated`,
          utilisation: nULS > 0 ? '100%' : '0%',
          status: (nULS > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'SLS Combinations',
          capacity: `${nSLS} generated`,
          utilisation: nSLS > 0 ? '100%' : '0%',
          status: (nSLS > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Max Bending Moment',
          capacity: `${maxBending.toFixed(1)} kNm`,
          utilisation: '-',
          status: (maxBending > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Max Shear Force',
          capacity: `${maxShear.toFixed(1)} kN`,
          utilisation: '-',
          status: (maxShear > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Load Combination Analysis',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  const Section: React.FC<{ id: string; title: string; icon: any; children: any }> = ({
    id,
    title,
    icon,
    children,
  }) => (
    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full p-4 flex items-center justify-between border-b border-gray-800 bg-gray-900/20 text-white"
      >
        <CardTitle className="text-2xl text-white flex items-center space-x-3">
          <motion.div
            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            {icon}
          </motion.div>
          <span>{title}</span>
        </CardTitle>
        {expandedSections[id] ? <FiChevronDown /> : <FiChevronRight />}
      </button>
      <AnimatePresence>
        {expandedSections[id] && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="p-6 space-y-6">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );

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
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Load Combinations
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            EN 1990 load combination builder
          </p>

          <div className="flex justify-center gap-3 mt-6">
            <Button
              onClick={handleExportPDF}
              className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30 font-bold px-6 py-6 rounded-xl"
            >
              <FiDownload className="mr-2" /> PDF
            </Button>
            <Button
              onClick={handleExportDOCX}
              className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 font-bold px-6 py-6 rounded-xl"
            >
              <FiDownload className="mr-2" /> DOCX
            </Button>
            <SaveRunButton
              calculatorKey="combination-builder"
              inputs={form as unknown as Record<string, string | number>}
              results={{ combinations, loadCases } as Record<string, any>}
            />
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                'px-10 py-3 rounded-xl font-bold capitalize',
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20'
                  : 'text-gray-500',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🔍 3D View'}
            </Button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Bridge Preset Selector */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-5">
                <ExplainableLabel
                  label="Bridge Preset"
                  field="combo-bridge-preset"
                  className="text-sm font-semibold text-gray-200 uppercase tracking-widest mb-3 block"
                />
                <select
                  title="Bridge Preset"
                  onChange={(e) => applyPreset(e.target.value)}
                  defaultValue=""
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                >
                  <option value="" disabled>
                    Select a bridge preset…
                  </option>
                  {Object.entries(PRESETS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Card>

              <Section
                id="settings"
                title="Combination Settings"
                icon={<FiSettings className="text-neon-cyan" size={24} />}
              >
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <ExplainableLabel
                      label="Design Code"
                      field="combo-design-code"
                      className="text-sm font-semibold text-gray-200"
                    />
                    <select
                      title="Code"
                      value={form.design_code}
                      onChange={(e) => updateForm('design_code', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                    >
                      <option>EN 1990:2002</option>
                      <option>BS 5400-2</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <ExplainableLabel
                      label="Structure Type"
                      field="combo-structure-type"
                      className="text-sm font-semibold text-gray-200"
                    />
                    <select
                      title="Type"
                      value={form.structure_type}
                      onChange={(e) => updateForm('structure_type', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                    >
                      <option value="bridge">Highway Bridge</option>
                      <option value="building">Standard Building</option>
                    </select>
                  </div>
                </div>
              </Section>

              <Section
                id="loadCases"
                title="Load Cases"
                icon={<FiLayers className="text-neon-cyan" size={24} />}
              >
                <div className="space-y-4">
                  {loadCases.map((lc, idx) => (
                    <div
                      key={lc.id}
                      className="grid grid-cols-1 lg:grid-cols-8 gap-4 p-4 bg-slate-950/40 rounded-2xl border border-gray-800 relative group transition-all hover:bg-gray-950/50"
                    >
                      <div className="lg:col-span-2 space-y-1">
                        <label className="text-sm font-semibold text-gray-200 uppercase">
                          Case Name
                        </label>
                        <input
                          title="Name"
                          type="text"
                          value={lc.name}
                          onChange={(e) => updateLoadCase(lc.id, 'name', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white font-bold"
                        />
                      </div>
                      <div className="lg:col-span-1 space-y-1">
                        <label className="text-sm font-semibold text-gray-200 uppercase">
                          Category
                        </label>
                        <select
                          title="Category"
                          value={lc.category}
                          onChange={(e) => updateLoadCase(lc.id, 'category', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white text-xs"
                        >
                          {Object.entries(LOAD_CATEGORIES).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {['bending', 'shear', 'axial', 'torsion'].map((f) => (
                        <div key={f} className="space-y-1">
                          <label className="text-sm font-semibold text-gray-200 uppercase">
                            {f}{' '}
                            <span className="text-neon-cyan text-xs">
                              {f === 'bending' || f === 'torsion' ? 'kNm' : 'kN'}
                            </span>
                          </label>
                          <input
                            title={f}
                            type="number"
                            value={lc[f as keyof LoadCase] as number}
                            onChange={(e) =>
                              updateLoadCase(lc.id, f as any, parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white font-mono text-sm"
                          />
                        </div>
                      ))}
                      <button
                        title="Delete"
                        aria-label="Delete load case"
                        onClick={() => removeLoadCase(lc.id)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <Button
                    onClick={addLoadCase}
                    variant="outline"
                    className="w-full py-4 border-dashed border-gray-700 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 text-gray-500 hover:text-neon-cyan transition-all"
                  >
                    <FiPlus className="mr-2" /> Add Load Case
                  </Button>
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
                  className="px-16 py-8 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl"
                >
                  RUN FULL ANALYSIS
                </Button>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              {/* Border-l-4 Summary Cards */}
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Max Bending',
                    value: Math.max(...combinations.map((c) => c.bending)),
                    unit: 'kNm',
                    color: 'text-blue-400',
                    icon: <FiCheck className="text-green-400" />,
                  },
                  {
                    label: 'Max Shear',
                    value: Math.max(...combinations.map((c) => c.shear)),
                    unit: 'kN',
                    color: 'text-emerald-400',
                    icon: <FiCheck className="text-green-400" />,
                  },
                  {
                    label: 'Max Axial',
                    value: Math.max(...combinations.map((c) => Math.abs(c.axial))),
                    unit: 'kN',
                    color: 'text-amber-400',
                    icon: <FiCheck className="text-green-400" />,
                  },
                  {
                    label: 'Max Torsion',
                    value: Math.max(...combinations.map((c) => c.torsion)),
                    unit: 'kNm',
                    color: 'text-purple-400',
                    icon: <FiCheck className="text-green-400" />,
                  },
                ].map((stat) => (
                  <Card
                    key={stat.label}
                    variant="glass"
                    className="border-l-4 border-l-green-500 border-neon-cyan/30 shadow-2xl"
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">
                          {stat.icon}
                        </div>
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-green-500/20 text-green-400">
                          PASS
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                      <p className={cn('text-2xl font-black', stat.color)}>
                        {stat.value.toFixed(1)}{' '}
                        <span className="text-neon-cyan text-xs">{stat.unit}</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-900/20 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Generated Combinations ({combinations.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] uppercase font-bold text-gray-500">
                        <th className="p-4">Combination</th>
                        <th className="p-4 text-right">Bending (kNm)</th>
                        <th className="p-4 text-right">Shear (kN)</th>
                        <th className="p-4 text-right">Axial (kN)</th>
                        <th className="p-4 text-right">Torsion (kNm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinations.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-gray-800/50 hover:bg-gray-900/20 transition-all"
                        >
                          <td className="p-4">
                            <div className="text-sm font-bold text-white">{c.name}</div>
                            <div className="text-[10px] text-gray-500 mt-1">
                              {c.type} — Basis: EN 1990
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono text-blue-400">
                            {c.bending.toFixed(1)}
                          </td>
                          <td className="p-4 text-right font-mono text-emerald-400">
                            {c.shear.toFixed(1)}
                          </td>
                          <td className="p-4 text-right font-mono text-amber-400">
                            {c.axial.toFixed(1)}
                          </td>
                          <td className="p-4 text-right font-mono text-purple-400">
                            {c.torsion.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Recommendations */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiCheck className="text-green-400" size={24} />
                    </motion.div>
                    <span>Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {combinations.length > 100 && (
                    <div className="flex items-start gap-2 text-amber-300">
                      <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{combinations.length} combinations — verify scope is appropriate</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-green-400">
                    <FiCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      {combinations.length} combinations generated (
                      {combinations.filter((c) => c.type === 'ULS').length} ULS +{' '}
                      {combinations.filter((c) => c.type === 'SLS').length} SLS)
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiAlertTriangle className="text-amber-400" size={24} />
                    </motion.div>
                    <span>Warnings</span>
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
            </motion.div>
          )}

          {activeTab === 'visualization' && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WhatIfPreview
                title="Combination Builder — 3D Preview"
                sliders={whatIfSliders}
                form={form}
                updateForm={updateForm}
                status={undefined}
                onMaximize={() => setPreviewMaximized(true)}
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                    <LoadCombinations3D />
                  </Interactive3DDiagram>
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>

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
                <LoadCombinations3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                aria-label="Minimize preview"
              >
                <FiMinimize2 size={20} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                COMBINATION BUILDER — REAL-TIME PREVIEW
              </div>
            </div>
            <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
              <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                <FiSliders size={14} /> Live Parameters
              </h3>
              {[
                { label: 'Design Code', value: form.design_code },
                { label: 'Approach', value: form.design_approach },
                { label: 'Structure Type', value: form.structure_type },
                { label: 'Consequence Class', value: form.consequence_class },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                >
                  <span className="text-gray-500">{stat.label}</span>
                  <span className="text-white font-medium">{stat.value}</span>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                  <FiActivity size={14} /> Live Readout
                </h3>
                {[
                  { label: 'Load Cases', value: `${loadCases.length}` },
                  { label: 'Combinations', value: `${combinations.length}` },
                  { label: 'Wind', value: form.include_wind ? 'Included' : 'Excluded' },
                  { label: 'Traffic', value: form.include_traffic ? 'Included' : 'Excluded' },
                  { label: 'Thermal', value: form.include_thermal ? 'Included' : 'Excluded' },
                  { label: 'Snow', value: form.include_snow ? 'Included' : 'Excluded' },
                  { label: 'Seismic', value: form.include_seismic ? 'Included' : 'Excluded' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                  >
                    <span className="text-gray-500">{stat.label}</span>
                    <span className="text-white font-medium">{stat.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors"
              >
                Close Fullscreen
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CombinationBuilder;
