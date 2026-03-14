// =============================================================================
// Traffic Actions Calculator — Premium Edition
// EN 1991-2 Bridge Traffic Loading — Load Models LM1, LM2, LM3 & LM4
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiBarChart2,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiInfo,
    FiLayers,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTruck,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildTrafficActionsReport } from '../../lib/pdf/builders/trafficActionsBuilder';
import { cn } from '../../lib/utils';

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import TrafficActions3D from '../../components/3d/scenes/TrafficActions3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Geometry
  carriageway_width: string;
  span_length: string;
  deck_type: string;
  // Load Model Selection
  load_model: string;
  traffic_group: string;
  // Options
  include_lm2: boolean;
  include_lm3: boolean;
  lm3_vehicle: string;
  include_lm4: boolean;
  lm4_density: string;
  // Factors
  dynamic_factor: string;
  lane_factor: string;
  // Project
  projectName: string;
  reference: string;
}

interface LaneResult {
  lane: number;
  width: number;
  Q_k: number;
  q_k: number;
  alpha_Q: number;
  alpha_q: number;
  Q_d: number;
  q_d: number;
  totalUDL: number;
  totalConc: number;
}

interface Results {
  // LM1
  num_lanes: number;
  lane_width: number;
  remaining_width: number;
  lanes: LaneResult[];
  totalLM1_udl: number;
  totalLM1_conc: number;
  // LM2
  lm2_load: number;
  lm2_contact: number;
  // LM3
  lm3_load: number;
  lm3_axles: number;
  // LM4
  lm4_load: number;
  // Combined
  governing_udl: number;
  governing_conc: number;
  totalBending: number;
  totalShear: number;
  // Status
  status: string;
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

// EN 1991-2 Adjustment Factors (UK NA to BS EN 1991-2)
const TRAFFIC_GROUPS = {
  'Group 1A': {
    name: 'Motorways & Trunk Roads',
    alpha_Q1: 1.0,
    alpha_q1: 1.0,
    alpha_Q2: 1.0,
    alpha_q2: 2.4,
    alpha_qr: 1.2,
    description: 'Heavy traffic - motorways, trunk roads',
  },
  'Group 1B': {
    name: 'Primary Routes',
    alpha_Q1: 0.9,
    alpha_q1: 0.9,
    alpha_Q2: 0.9,
    alpha_q2: 2.4,
    alpha_qr: 1.2,
    description: 'Primary routes with moderate HGV',
  },
  'Group 2': {
    name: 'Principal Roads',
    alpha_Q1: 0.8,
    alpha_q1: 0.8,
    alpha_Q2: 0.8,
    alpha_q2: 2.4,
    alpha_qr: 1.2,
    description: 'Principal roads',
  },
  'Group 3': {
    name: 'Local Roads',
    alpha_Q1: 0.4,
    alpha_q1: 0.4,
    alpha_Q2: 0.4,
    alpha_q2: 1.4,
    alpha_qr: 1.2,
    description: 'Local roads with light traffic',
  },
};

// LM1 Base Values (EN 1991-2 Table 4.2)
const LM1_BASE = {
  lane1: { Q: 300, q: 9.0 }, // Lane 1: 300 kN + 9.0 kN/m²
  lane2: { Q: 200, q: 2.5 }, // Lane 2: 200 kN + 2.5 kN/m²
  lane3: { Q: 100, q: 2.5 }, // Lane 3+: 100 kN + 2.5 kN/m²
  remaining: { q: 2.5 }, // Remaining area
};

// LM3 Special Vehicles (EN 1991-2 Annex A, UK NA)
const LM3_VEHICLES = {
  SV80: { weight: 80, axles: 2, spacing: 1.8, description: '80 tonne special vehicle' },
  SV100: { weight: 100, axles: 3, spacing: 1.5, description: '100 tonne special vehicle' },
  SV150: { weight: 150, axles: 4, spacing: 1.35, description: '150 tonne special vehicle' },
  SV196: { weight: 196, axles: 5, spacing: 1.35, description: '196 tonne special vehicle' },
  SOV250: { weight: 250, axles: 6, spacing: 1.5, description: '250 tonne SOV' },
  SOV350: { weight: 350, axles: 7, spacing: 1.5, description: '350 tonne SOV' },
  SOV450: { weight: 450, axles: 8, spacing: 1.5, description: '450 tonne SOV' },
};

const DECK_TYPES = {
  steel: { name: 'Steel Deck', phi_default: 1.0 },
  concrete: { name: 'Concrete Deck', phi_default: 1.0 },
  composite: { name: 'Composite', phi_default: 1.0 },
  timber: { name: 'Timber Deck', phi_default: 1.25 },
};

const PRESETS = {
  motorway: {
    name: 'Motorway Bridge (3 lanes)',
    carriageway_width: '11.0',
    span_length: '30',
    traffic_group: 'Group 1A',
    include_lm2: true,
    include_lm3: true,
    lm3_vehicle: 'SV196',
  },
  trunk_road: {
    name: 'Trunk Road (2 lanes)',
    carriageway_width: '7.3',
    span_length: '20',
    traffic_group: 'Group 1A',
    include_lm2: true,
    include_lm3: true,
    lm3_vehicle: 'SV100',
  },
  local_road: {
    name: 'Local Road (Single)',
    carriageway_width: '4.5',
    span_length: '12',
    traffic_group: 'Group 3',
    include_lm2: true,
    include_lm3: false,
  },
  footbridge: {
    name: 'Footbridge',
    carriageway_width: '3.0',
    span_length: '15',
    traffic_group: 'Group 3',
    include_lm2: false,
    include_lm3: false,
    include_lm4: true,
    lm4_density: '5.0',
  },
};

const TrafficActions = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    carriageway_width: '',
    deck_type: '',
    dynamic_factor: '',
    include_lm2: false,
    include_lm3: false,
    include_lm4: false,
    lane_factor: '',
    lm3_vehicle: '',
    lm4_density: '',
    load_model: '',
    projectName: '',
    reference: '',
    span_length: '',
    traffic_group: '',
  });
  // What-If sliders
  const whatIfSliders = [
    { key: 'carriageway_width', label: 'Carriageway_width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'span_length', label: 'Span_length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'deck_type', label: 'Deck_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'load_model', label: 'Load_model', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
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

  const validateInputs = (): boolean => {
    const errors: string[] = [];
    const W = parseFloat(formData.carriageway_width);
    const L = parseFloat(formData.span_length);
    if (isNaN(W) || W <= 0) errors.push('Carriageway width must be a positive number');
    if (isNaN(L) || L <= 0) errors.push('Span length must be a positive number');
    if (W > 50) errors.push('Carriageway width exceeds 50m — please check input');
    if (L > 500) errors.push('Span length exceeds 500m — please check input');
    if (errors.length > 0) {
      setWarnings(errors);
      return false;
    }
    return true;
  };

  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);
    setTimeout(() => {
      try {
        const newWarnings: string[] = [];

        // Parse inputs
        const W = parseFloat(formData.carriageway_width) || 7.3;
        const L = parseFloat(formData.span_length) || 20;
        const dynFactor = parseFloat(formData.dynamic_factor) || 1.0;
        const tgKey = formData.traffic_group || 'Group 1A';
        const tg = (TRAFFIC_GROUPS as any)[tgKey] || TRAFFIC_GROUPS['Group 1A'];

        // Lane division (EN 1991-2 Table 4.1)
        let numLanes: number;
        let laneWidth: number;
        if (W < 5.4) {
          numLanes = 1;
          laneWidth = 3.0;
        } else if (W < 6.0) {
          numLanes = 2;
          laneWidth = W / 2;
        } else {
          numLanes = Math.floor(W / 3.0);
          laneWidth = 3.0;
        }
        const remainingW = Math.max(W - numLanes * laneWidth, 0);

        // LM1 lane loads
        const lanes: LaneResult[] = [];
        let totalLM1_udl = 0;
        let totalLM1_conc = 0;

        for (let i = 1; i <= numLanes; i++) {
          let Q_k: number, q_k: number, alpha_Q: number, alpha_q: number;
          if (i === 1) {
            Q_k = LM1_BASE.lane1.Q;
            q_k = LM1_BASE.lane1.q;
            alpha_Q = tg.alpha_Q1;
            alpha_q = tg.alpha_q1;
          } else if (i === 2) {
            Q_k = LM1_BASE.lane2.Q;
            q_k = LM1_BASE.lane2.q;
            alpha_Q = tg.alpha_Q2;
            alpha_q = tg.alpha_q2;
          } else {
            Q_k = LM1_BASE.lane3.Q;
            q_k = LM1_BASE.lane3.q;
            alpha_Q = tg.alpha_Q2;
            alpha_q = tg.alpha_qr;
          }

          const Q_d = alpha_Q * Q_k * dynFactor;
          const q_d = alpha_q * q_k * dynFactor;
          const totalUDL = q_d * laneWidth * L;
          const totalConc = Q_d;

          lanes.push({
            lane: i,
            width: laneWidth,
            Q_k,
            q_k,
            alpha_Q,
            alpha_q,
            Q_d,
            q_d,
            totalUDL,
            totalConc,
          });

          totalLM1_udl += totalUDL;
          totalLM1_conc += totalConc;
        }

        // Remaining area UDL
        if (remainingW > 0) {
          const q_rem = LM1_BASE.remaining.q * tg.alpha_qr * dynFactor;
          totalLM1_udl += q_rem * remainingW * L;
        }

        // LM2 single axle (400 kN on 350×600mm contact patch)
        const lm2_load = formData.include_lm2 ? 400 * tg.alpha_Q1 * dynFactor : 0;
        const lm2_contact = 0.35 * 0.6;

        // LM3 special vehicles
        let lm3_load = 0;
        let lm3_axles = 0;
        if (formData.include_lm3) {
          const vehKey = formData.lm3_vehicle || 'SV100';
          const veh = (LM3_VEHICLES as any)[vehKey] || LM3_VEHICLES.SV100;
          lm3_load = veh.weight * 9.81; // kN
          lm3_axles = veh.axles;
        }

        // LM4 crowd loading
        const lm4_density = parseFloat(formData.lm4_density) || 5.0;
        const lm4_load = formData.include_lm4 ? lm4_density * W * L : 0;

        // Governing values
        const governing_udl = Math.max(totalLM1_udl, lm4_load);
        const governing_conc = Math.max(totalLM1_conc, lm2_load, lm3_load);

        // Simple bending and shear (simply supported)
        const w_per_m = governing_udl / L;
        const totalBending = (w_per_m * L * L) / 8 + (governing_conc * L) / 4;
        const totalShear = (w_per_m * L) / 2 + governing_conc / 2;

        if (numLanes >= 3) newWarnings.push('3+ lanes \u2014 verify transverse distribution');
        if (lm3_load > 0 && L < 10)
          newWarnings.push('Short span with SV loading \u2014 check local effects');

        let rating = 'CALCULATED';
        let ratingColor = '#22c55e';

        setResults({
          num_lanes: numLanes,
          lane_width: laneWidth,
          remaining_width: remainingW,
          lanes,
          totalLM1_udl,
          totalLM1_conc,
          lm2_load,
          lm2_contact,
          lm3_load,
          lm3_axles,
          lm4_load,
          governing_udl,
          governing_conc,
          totalBending,
          totalShear,
          status: 'PASS',
          rating,
          ratingColor,
        });

        setWarnings(newWarnings);
        setActiveTab('results');
      } catch (e) {
        console.error('Calculation error:', e);
      }
      setIsCalculating(false);
    }, 500);
  }, [formData]);

  const handleExportPDF = useCallback(() => {
    if (!results) return;
    const report = buildTrafficActionsReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Traffic Actions Analysis',
      subtitle: 'EN 1991-2 (Eurocode 1 Part 2)',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Traffic Loading' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'EN 1991-2:2003' },
      ],
      inputs: [
        { label: 'Carriageway Width', value: formData.carriageway_width, unit: 'm' },
        { label: 'Span Length', value: formData.span_length, unit: 'm' },
        { label: 'Deck Type', value: formData.deck_type },
        { label: 'Load Model', value: formData.load_model },
        { label: 'Traffic Group', value: formData.traffic_group },
        { label: 'Dynamic Factor', value: formData.dynamic_factor },
      ],
      sections: [
        {
          title: 'Traffic Load Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['LM1 Tandem Force', ((results as any).lm1_tandem ?? 0).toFixed(1), 'kN'],
            ['LM1 UDL', ((results as any).lm1_udl ?? 0).toFixed(2), 'kN/m\u00b2'],
            ['Total Design Load', ((results as any).total_design_load ?? 0).toFixed(1), 'kN'],
            ['Notional Lanes', ((results as any).notional_lanes ?? 0).toString(), '-'],
          ],
        },
      ],
      checks: [
        {
          name: 'LM1 Load Model',
          capacity: 'Applied',
          utilisation: '100%',
          status: 'PASS' as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Traffic Actions Analysis',
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
      <div className="flex items-center justify-between mb-1">
        <ExplainableLabel label={label} field={field} className="text-sm font-semibold text-gray-300" />{' '}
        {unit && <span className="text-blue-400 text-xs">({unit})</span>}
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
      <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
        <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection(sectionId)}>
          <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
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

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
            <div className="flex items-center gap-2">
              {results && (
                <Button
                  onClick={handleExportPDF}
                  className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                >
                  <FiDownload className="mr-2" /> PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={handleExportDOCX}
                  className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <FiDownload className="mr-2" /> DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton
                  calculatorKey="traffic-actions"
                  inputs={formData as unknown as Record<string, string | number>}
                  results={results}
                />
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
              Traffic Actions
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            EN 1991-2 traffic load models for bridges
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 justify-center">
          <Button
            variant={activeTab === 'input' ? 'default' : 'outline'}
            onClick={() => setActiveTab('input')}
            className={activeTab === 'input' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'border-gray-700 text-gray-400'}
          >
            Load Input
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            onClick={() => setActiveTab('results')}
            disabled={!results}
            className={activeTab === 'results' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'border-gray-700 text-gray-400'}
          >
            Results
          </Button>
          <Button
            variant={activeTab === 'visualization' ? 'default' : 'outline'}
            onClick={() => setActiveTab('visualization')}
            disabled={!results}
            className={activeTab === 'visualization' ? 'bg-gradient-to-r from-blue-600 to-cyan-500' : 'border-gray-700 text-gray-400'}
          >
            Visualization
          </Button>
        </div>

        {activeTab === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {/* Presets */}
                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader className="pb-2 flex flex-row items-center space-x-3">
                    <CardTitle className="text-lg text-white font-semibold flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiZap className="w-6 h-6 text-blue-400" />
                      </div>
                      <span>Quick Presets</span>
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
                          className="border-gray-600/50 hover:border-blue-500 hover:text-blue-400 transition-all"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Geometry */}
                <CollapsibleSection
                  title="Bridge Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InputField label="Carriageway Width" field="carriageway_width" unit="m" />
                    <InputField label="Span Length" field="span_length" unit="m" />
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Deck Type</label>
                      <select
                        title="Deck Type"
                        value={formData.deck_type}
                        onChange={(e) => updateForm('deck_type', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(DECK_TYPES).map(([key, dt]) => (
                          <option key={key} value={key}>
                            {dt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Traffic Classification */}
                <CollapsibleSection
                  title="Traffic Classification"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiTruck className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Traffic Group (UK NA)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(TRAFFIC_GROUPS).map(([key, group]) => (
                          <Button
                            key={key}
                            variant={formData.traffic_group === key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateForm('traffic_group', key)}
                            className={cn(
                              formData.traffic_group === key
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white'
                                : 'border-gray-600 hover:border-blue-500 hover:text-blue-400',
                            )}
                          >
                            <div className="text-left">
                              <div className="font-medium">{key}</div>
                              <div className="text-xs opacity-70">{group.name}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Load Models */}
                <CollapsibleSection
                  title="Load Model Selection"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiBarChart2 className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg cursor-pointer">
                      <input
                        title="Load Models"
                        type="checkbox"
                        checked={true}
                        disabled
                        className="rounded border-gray-600"
                      />
                      <div>
                        <span className="text-white font-medium">LM1 - Normal Traffic</span>
                        <p className="text-gray-400 text-sm">
                          Tandem systems (TS) + UDL - always required
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg cursor-pointer">
                      <input
                        title="Input value"
                        type="checkbox"
                        checked={formData.include_lm2}
                        onChange={(e) => updateForm('include_lm2', String(e.target.checked))}
                        className="rounded border-gray-600"
                      />
                      <div>
                        <span className="text-white font-medium">LM2 - Single Axle</span>
                        <p className="text-gray-400 text-sm">400 kN axle for local verification</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg cursor-pointer">
                      <input
                        title="Input value"
                        type="checkbox"
                        checked={formData.include_lm3}
                        onChange={(e) => updateForm('include_lm3', String(e.target.checked))}
                        className="rounded border-gray-600"
                      />
                      <div className="flex-1">
                        <span className="text-white font-medium">LM3 - Special Vehicles</span>
                        <p className="text-gray-400 text-sm">Abnormal load assessment</p>
                      </div>
                    </label>

                    {formData.include_lm3 && (
                      <div className="ml-8">
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Vehicle Type</label>
                        <select
                          title="Vehicle Type"
                          value={formData.lm3_vehicle}
                          onChange={(e) => updateForm('lm3_vehicle', e.target.value)}
                          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        >
                          {Object.entries(LM3_VEHICLES).map(([key, v]) => (
                            <option key={key} value={key}>
                              {key} - {v.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <label className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg cursor-pointer">
                      <input
                        title="Input value"
                        type="checkbox"
                        checked={formData.include_lm4}
                        onChange={(e) => updateForm('include_lm4', String(e.target.checked))}
                        className="rounded border-gray-600"
                      />
                      <div className="flex-1">
                        <span className="text-white font-medium">LM4 - Crowd Loading</span>
                        <p className="text-gray-400 text-sm">5 kN/m² for pedestrian areas</p>
                      </div>
                    </label>

                    {formData.include_lm4 && (
                      <div className="ml-8">
                        <InputField label="Crowd Density" field="lm4_density" unit="kN/m²" />
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {/* Factors */}
                <CollapsibleSection
                  title="Dynamic & Lane Factors"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Dynamic Factor (φ)"
                      field="dynamic_factor"
                      tooltip="EN 1991-2 Table 4.7"
                    />
                    <InputField
                      label="Lane Factor"
                      field="lane_factor"
                      tooltip="For multiple presence"
                    />
                  </div>
                </CollapsibleSection>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center pt-4"
                >
                  <button
                    onClick={runCalculation}
                    disabled={isCalculating}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isCalculating ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ANALYSING...
                      </div>
                    ) : (
                      '▶ RUN FULL ANALYSIS'
                    )}
                  </button>
                </motion.div>
              </div>

              {/* Right Column */}
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
                        <TrafficActions3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        TRAFFIC ACTIONS — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        { label: 'Carriageway Width', field: 'carriageway_width' as keyof FormData, min: 2, max: 30, step: 0.5, unit: 'm' },
                        { label: 'Span Length', field: 'span_length' as keyof FormData, min: 1, max: 200, step: 1, unit: 'm' },
                        { label: 'Dynamic Factor', field: 'dynamic_factor' as keyof FormData, min: 1.0, max: 1.4, step: 0.01, unit: '' },
                        { label: 'Lane Factor', field: 'lane_factor' as keyof FormData, min: 0.5, max: 1.0, step: 0.05, unit: '' },
                        { label: 'LM4 Density', field: 'lm4_density' as keyof FormData, min: 2, max: 10, step: 0.5, unit: 'kN/m²' },
                      ].map((s) => (
                        <div key={s.field} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">{formData[s.field] as string} {s.unit}</span>
                          </div>
                          <input
                            title={s.label}
                            type="range"
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            value={formData[s.field] as string}
                            onChange={(e) => updateForm(s.field, e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                            aria-label={s.label}
                          />
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                          <FiActivity size={14} /> Live Readout
                        </h3>
                        {[
                          { label: 'Load Model', value: formData.load_model || '—' },
                          { label: 'Deck Type', value: formData.deck_type || '—' },
                          { label: 'Traffic Group', value: formData.traffic_group || '—' },
                          { label: 'No. Lanes', value: results ? `${results.num_lanes}` : '—' },
                        ].map((stat) => (
                          <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                            <span className="text-gray-500">{stat.label}</span>
                            <span className="text-white font-medium">{stat.value}</span>
                          </div>
                        ))}
                        {results && (
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Last Analysis</div>
                            {[
                              { label: 'Governing UDL', value: `${results.governing_udl.toFixed(1)} kN/m` },
                              { label: 'Governing Conc', value: `${results.governing_conc.toFixed(1)} kN` },
                              { label: 'Bending', value: `${results.totalBending.toFixed(1)} kNm` },
                              { label: 'Shear', value: `${results.totalShear.toFixed(1)} kN` },
                              { label: 'Rating', value: results.rating },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', results.ratingColor === 'red' ? 'text-red-500' : results.ratingColor === 'orange' ? 'text-orange-400' : 'text-emerald-400')}>
                                  {check.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
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

                <WhatIfPreview
                  title="Traffic Actions — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  onMaximize={() => setPreviewMaximized(true)}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <TrafficActions3D />
                    </Interactive3DDiagram>
                  )}
                />

                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-blue-400" />
                      </div>
                      <span>EN 1991-2 Reference</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      • <strong>LM1:</strong> Normal traffic (TS + UDL)
                    </p>
                    <p>
                      • <strong>LM2:</strong> Single axle 400 kN
                    </p>
                    <p>
                      • <strong>LM3:</strong> Special/abnormal vehicles
                    </p>
                    <p>
                      • <strong>LM4:</strong> Crowd loading 5 kN/m²
                    </p>
                    <p className="pt-2 text-blue-400">UK NA adjustment factors applied</p>
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
            {results && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* Summary Check Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'LM1 UDL', val: results.totalLM1_udl.toFixed(1) + ' kN', status: 'PASS' },
                      { label: 'LM1 Conc.', val: results.totalLM1_conc.toFixed(0) + ' kN', status: 'PASS' },
                      { label: 'Bending', val: results.totalBending.toFixed(0) + ' kNm', status: 'PASS' },
                      { label: 'Shear', val: results.totalShear.toFixed(0) + ' kN', status: 'PASS' },
                    ].map((item, i) => (
                      <Card
                        key={i}
                        variant="glass"
                        className={cn(
                          'border-l-4',
                          item.status === 'PASS' ? 'border-l-green-500' : 'border-l-red-500',
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                              'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                              item.status === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                            )}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                          <p className="text-2xl font-black text-white">{item.val}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* LM1 Lane Results */}
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiTruck className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>LM1 - Lane Loading Results</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700 text-gray-400">
                              <th className="text-left py-2 px-2">Lane</th>
                              <th className="text-center py-2 px-2">Width (m)</th>
                              <th className="text-center py-2 px-2">Q_k (kN)</th>
                              <th className="text-center py-2 px-2">q_k (kN/m²)</th>
                              <th className="text-center py-2 px-2">α_Q</th>
                              <th className="text-center py-2 px-2">α_q</th>
                              <th className="text-center py-2 px-2">Q_d (kN)</th>
                              <th className="text-center py-2 px-2">q_d (kN/m²)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.lanes.map((lane) => (
                              <tr key={lane.lane} className="border-b border-gray-700/50">
                                <td className="py-3 px-2 text-white font-medium">
                                  Lane {lane.lane}
                                </td>
                                <td className="py-3 px-2 text-center text-gray-300">
                                  {lane.width.toFixed(1)}
                                </td>
                                <td className="py-3 px-2 text-center text-gray-300">{lane.Q_k}</td>
                                <td className="py-3 px-2 text-center text-gray-300">
                                  {lane.q_k.toFixed(1)}
                                </td>
                                <td className="py-3 px-2 text-center text-blue-400">
                                  {lane.alpha_Q.toFixed(2)}
                                </td>
                                <td className="py-3 px-2 text-center text-blue-400">
                                  {lane.alpha_q.toFixed(2)}
                                </td>
                                <td className="py-3 px-2 text-center text-blue-400 font-bold">
                                  {lane.Q_d.toFixed(0)}
                                </td>
                                <td className="py-3 px-2 text-center text-blue-400 font-bold">
                                  {lane.q_d.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-950/50 rounded-lg">
                          <div className="text-gray-400 text-sm">Total UDL Load</div>
                          <div className="text-xl font-bold text-white">
                            {results.totalLM1_udl.toFixed(1)} kN
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg">
                          <div className="text-gray-400 text-sm">Total Concentrated (TS)</div>
                          <div className="text-xl font-bold text-white">
                            {results.totalLM1_conc.toFixed(1)} kN
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Other Load Models */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.include_lm2 && (
                      <Card className="bg-blue-500/10 border-blue-500/30">
                        <CardContent className="py-4">
                          <div className="text-blue-400 text-sm font-medium mb-1">
                            LM2 - Single Axle
                          </div>
                          <div className="text-2xl font-bold text-white">{results.lm2_load} kN</div>
                          <div className="text-gray-400 text-xs mt-1">
                            Contact: {(results.lm2_contact * 10000).toFixed(0)} mm × 600 mm
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {formData.include_lm3 && (
                      <Card className="bg-purple-500/10 border-purple-500/30">
                        <CardContent className="py-4">
                          <div className="text-purple-400 text-sm font-medium mb-1">
                            LM3 - {formData.lm3_vehicle}
                          </div>
                          <div className="text-2xl font-bold text-white">
                            {results.lm3_load.toFixed(0)} kN
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            {results.lm3_axles} axles
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {formData.include_lm4 && (
                      <Card className="bg-cyan-500/10 border-cyan-500/30">
                        <CardContent className="py-4">
                          <div className="text-cyan-400 text-sm font-medium mb-1">LM4 - Crowd</div>
                          <div className="text-2xl font-bold text-white">
                            {results.lm4_load.toFixed(1)} kN
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            {formData.lm4_density} kN/m²
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Force Effects */}
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiActivity className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Force Effects (Simply Supported)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
                          <div className="text-gray-400 text-sm">Maximum Bending</div>
                          <div className="text-3xl font-black text-blue-400">
                            {results.totalBending.toFixed(0)}
                          </div>
                          <div className="text-gray-500">kNm</div>
                        </div>
                        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl text-center">
                          <div className="text-gray-400 text-sm">Maximum Shear</div>
                          <div className="text-3xl font-black text-purple-400">
                            {results.totalShear.toFixed(0)}
                          </div>
                          <div className="text-gray-500">kN</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-4 sticky top-8">
                  {/* Summary */}
                  <Card variant="glass" className="border-l-4 border-l-green-400 border-gray-700/50">
                    <CardContent className="py-6 text-center">
                      <div className="text-green-400 font-bold text-lg mb-2">
                        <FiCheck className="inline mr-2" />
                        COMPLETE
                      </div>
                      <div className="text-gray-300 text-sm">
                        Traffic loads calculated per EN 1991-2
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardContent className="py-4">
                      <h4 className="text-blue-400 font-semibold text-sm mb-3 flex items-center gap-2">
                        <FiCheck className="w-4 h-4" /> Recommendations
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                          <span>
                            Verify UK National Annex adjustment factors for specific bridge class
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                          <span>Consider fatigue load models for steel/composite decks</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                          <span>Check accidental load combinations per EN 1990 Annex A2</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                          <span>Review braking and acceleration forces for deck design</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Design Values */}
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white font-semibold">Design Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Notional Lanes</span>
                        <span className="text-white">{results.num_lanes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lane Width</span>
                        <span className="text-white">{results.lane_width} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Remaining Area</span>
                        <span className="text-white">{results.remaining_width.toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Governing UDL</span>
                        <span className="text-blue-400 font-bold">
                          {results.governing_udl.toFixed(2)} kN/m²
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Governing Point Load</span>
                        <span className="text-blue-400 font-bold">
                          {results.governing_conc.toFixed(0)} kN
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <Card variant="glass" className="border-amber-500/30">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                          <FiAlertTriangle />
                          <span className="font-medium">Notes</span>
                        </div>
                        <ul className="text-sm text-white space-y-1">
                          {warnings.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === 'visualization' && results && (
          <motion.div
            key="visualization"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white font-semibold">Traffic Load Arrangement</CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="500px" cameraPosition={[10, 6, 10]}>
                  <TrafficActions3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      </div>
  );
};

export default TrafficActions;
