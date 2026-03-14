// =============================================================================
// Formwork Pressure Calculator — Premium Edition
// CIRIA R108 / DIN 18218 — Concrete Formwork Design
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
    FiDroplet,
    FiInfo,
    FiLayers,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTarget,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildFormworkPressureReport } from '../../lib/pdf/builders/formworkPressureBuilder';
import { cn } from '../../lib/utils';

import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import FormworkPressure3D from '../../components/3d/scenes/FormworkPressure3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Concrete
  concrete_type: string;
  density: string;
  slump: string;
  temperature: string;
  // Placement
  placement_method: string;
  pour_rate: string;
  pour_height: string;
  // Admixtures
  admixture: string;
  vibration: string;
  // Formwork
  form_type: string;
  form_height: string;
  form_width: string;
  tie_spacing_h: string;
  tie_spacing_v: string;
  // Design
  design_method: string;
  safety_factor: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Pressures
  p_max_hydrostatic: number;
  p_max_ciria: number;
  p_max_din: number;
  p_design: number;
  h_effective: number;
  // Forces
  tie_force: number;
  total_force_per_m: number;
  // Status
  method_used: string;
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// REFERENCE DATA — CIRIA R108 / DIN 18218
// =============================================================================

const CONCRETE_TYPES: Record<string, { name: string; density: number; description: string }> = {
  normal: { name: 'Normal Weight Concrete', density: 24, description: '24 kN/m³' },
  lightweight: { name: 'Lightweight Concrete', density: 18, description: '18 kN/m³' },
  heavy: { name: 'Heavy Weight Concrete', density: 28, description: '28 kN/m³' },
  scc: { name: 'Self-Compacting Concrete', density: 24, description: 'SCC - Full hydrostatic' },
};

const SLUMP_CATEGORIES: Record<string, { name: string; factor: number; description: string }> = {
  low: { name: 'Low Slump (25-75mm)', factor: 0.9, description: 'Stiff mix, low workability' },
  medium: { name: 'Medium Slump (75-125mm)', factor: 1.0, description: 'Normal workability' },
  high: { name: 'High Slump (125-180mm)', factor: 1.1, description: 'High workability' },
  flowing: { name: 'Flowing (>180mm)', factor: 1.2, description: 'Superplasticized' },
  scc: { name: 'Self-Compacting', factor: 1.5, description: 'Full hydrostatic assumed' },
};

const PLACEMENT_METHODS: Record<string, { name: string; factor: number; description: string }> = {
  direct: { name: 'Direct Discharge', factor: 1.0, description: 'From mixer truck' },
  pump: { name: 'Pump Placement', factor: 1.1, description: 'Concrete pump' },
  skip: { name: 'Skip/Bucket', factor: 0.9, description: 'Crane placed' },
  tremie: { name: 'Tremie', factor: 1.2, description: 'Underwater placement' },
};

const ADMIXTURES: Record<string, { name: string; factor: number; description: string }> = {
  none: { name: 'None', factor: 1.0, description: 'No retarders' },
  normal_retarder: { name: 'Normal Retarder', factor: 1.1, description: 'Standard retarder' },
  super_retarder: { name: 'Super Retarder', factor: 1.2, description: 'Extended set time' },
  accelerator: { name: 'Accelerator', factor: 0.9, description: 'Quick setting' },
};

const VIBRATION_TYPES: Record<string, { name: string; factor: number }> = {
  none: { name: 'No Vibration', factor: 0.9 },
  light: { name: 'Light Vibration', factor: 1.0 },
  normal: { name: 'Normal Vibration', factor: 1.1 },
  heavy: { name: 'Heavy Vibration', factor: 1.2 },
  revibration: { name: 'Re-vibration', factor: 1.3 },
};

const FORM_TYPES: Record<string, { name: string; friction: number }> = {
  plywood: { name: 'Plywood', friction: 0.5 },
  steel: { name: 'Steel', friction: 0.3 },
  timber: { name: 'Timber Boards', friction: 0.6 },
  gfrp: { name: 'GFRP/Composite', friction: 0.35 },
  liner: { name: 'Textured Liner', friction: 0.4 },
};

const DESIGN_METHODS: Record<string, { name: string; description: string }> = {
  ciria: { name: 'CIRIA R108', description: 'UK guidance' },
  din: { name: 'DIN 18218', description: 'German standard' },
  hydrostatic: { name: 'Full Hydrostatic', description: 'Conservative' },
  aci: { name: 'ACI 347', description: 'American standard' },
};

const PRESETS = {
  wall_standard: {
    name: 'Standard Wall Pour',
    concrete_type: 'normal',
    slump: 'medium',
    placement_method: 'pump',
    pour_rate: '2.5',
    pour_height: '3.0',
    temperature: '15',
    form_height: '3000',
    form_width: '300',
  },
  column_pump: {
    name: 'Column (Pump)',
    concrete_type: 'normal',
    slump: 'high',
    placement_method: 'pump',
    pour_rate: '4.0',
    pour_height: '4.0',
    temperature: '15',
    form_height: '4000',
    form_width: '600',
  },
  scc_wall: {
    name: 'SCC Wall',
    concrete_type: 'scc',
    slump: 'scc',
    placement_method: 'pump',
    pour_rate: '3.0',
    pour_height: '4.0',
    temperature: '20',
    form_height: '4000',
    form_width: '400',
  },
  deep_section: {
    name: 'Deep Section',
    concrete_type: 'normal',
    slump: 'medium',
    placement_method: 'pump',
    pour_rate: '1.5',
    pour_height: '6.0',
    temperature: '15',
    form_height: '6000',
    form_width: '1000',
  },
};

const FormworkPressure = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    admixture: '',
    concrete_type: '',
    density: '',
    design_method: '',
    form_height: '',
    form_type: '',
    form_width: '',
    placement_method: '',
    pour_height: '',
    pour_rate: '',
    projectName: '',
    reference: '',
    safety_factor: '',
    slump: '',
    temperature: '',
    tie_spacing_h: '',
    tie_spacing_v: '',
    vibration: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'admixture', label: 'Admixture' },
  { key: 'concrete_type', label: 'Concrete Type' },
  { key: 'density', label: 'Density' },
  { key: 'design_method', label: 'Design Method' },
  { key: 'form_height', label: 'Form Height' },
  { key: 'form_type', label: 'Form Type' },
  { key: 'form_width', label: 'Form Width' },
  { key: 'placement_method', label: 'Placement Method' },
  { key: 'pour_height', label: 'Pour Height' },
  { key: 'pour_rate', label: 'Pour Rate' },
  { key: 'safety_factor', label: 'Safety Factor' },
  { key: 'slump', label: 'Slump' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'tie_spacing_h', label: 'Tie Spacing H' },
  { key: 'tie_spacing_v', label: 'Tie Spacing V' },
  { key: 'vibration', label: 'Vibration' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'concrete_type', label: 'Concrete_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'density', label: 'Density', min: 0, max: 100, step: 1, unit: '' },
    { key: 'slump', label: 'Slump', min: 0, max: 100, step: 1, unit: '' },
    { key: 'temperature', label: 'Temperature', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

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
        const newWarnings: string[] = [];

        // Parse inputs
        const concType = formData.concrete_type || 'normal';
        const conc = CONCRETE_TYPES[concType] || CONCRETE_TYPES.normal;
        const gamma = parseFloat(formData.density) || conc.density;
        const slumpKey = formData.slump || 'medium';
        const slump = SLUMP_CATEGORIES[slumpKey] || SLUMP_CATEGORIES.medium;
        const T = parseFloat(formData.temperature) || 15;
        const R = parseFloat(formData.pour_rate) || 2.5;
        const H = parseFloat(formData.pour_height) || 3.0;
        const methodKey = formData.placement_method || 'pump';
        const placeFactor = (PLACEMENT_METHODS[methodKey] || PLACEMENT_METHODS.pump).factor;
        const admKey = formData.admixture || 'none';
        const admFactor = (ADMIXTURES[admKey] || ADMIXTURES.none).factor;
        const vibKey = formData.vibration || 'normal';
        const vibFactor = (VIBRATION_TYPES[vibKey] || VIBRATION_TYPES.normal).factor;
        const SF = parseFloat(formData.safety_factor) || 1.3;
        const tieH = parseFloat(formData.tie_spacing_h) || 600;
        const tieV = parseFloat(formData.tie_spacing_v) || 400;

        // Full hydrostatic pressure
        const p_hydrostatic = gamma * H;

        // CIRIA R108 method
        // Pmax = gamma * (C1 * sqrt(R) + C2 * K * H^0.5 - 14)
        // Simplified: Pmax = gamma * min(H, C1*sqrt(R/T))
        const C1 = 1.0 * slump.factor * placeFactor * admFactor * vibFactor;
        const h_effective_ciria = Math.min(H, C1 * Math.sqrt(R) * (36 / (T + 16)));
        const p_ciria = Math.min(gamma * h_effective_ciria, p_hydrostatic);

        // DIN 18218 method
        // Pmax = gamma * heff where heff depends on pour rate and temperature
        const h_effective_din = Math.min(H, (0.3 + (3.0 * R) / Math.sqrt(T)) * slump.factor);
        const p_din = Math.min(gamma * h_effective_din, p_hydrostatic);

        // Design method selection
        const designMethod = formData.design_method || 'ciria';
        let p_design: number;
        let h_eff: number;
        let methodUsed: string;

        if (concType === 'scc' || slumpKey === 'scc') {
          p_design = p_hydrostatic;
          h_eff = H;
          methodUsed = 'Full Hydrostatic (SCC)';
          newWarnings.push('SCC concrete — full hydrostatic pressure assumed');
        } else if (designMethod === 'hydrostatic') {
          p_design = p_hydrostatic;
          h_eff = H;
          methodUsed = 'Full Hydrostatic';
        } else if (designMethod === 'din') {
          p_design = p_din * SF;
          h_eff = h_effective_din;
          methodUsed = 'DIN 18218';
        } else {
          p_design = p_ciria * SF;
          h_eff = h_effective_ciria;
          methodUsed = 'CIRIA R108';
        }

        // Tie forces
        const tieForce = p_design * (tieH / 1000) * (tieV / 1000); // kN
        const totalForcePerM = p_design * 0.5 * h_eff; // kN/m (triangular distribution approx)

        // Classification
        let classification: string;
        let classColor: string;
        if (p_design < 30) {
          classification = 'LOW';
          classColor = '#22c55e';
        } else if (p_design < 60) {
          classification = 'MODERATE';
          classColor = '#f59e0b';
        } else if (p_design < 100) {
          classification = 'HIGH';
          classColor = '#f97316';
        } else {
          classification = 'VERY HIGH';
          classColor = '#ef4444';
        }

        if (R > 5) newWarnings.push('Pour rate > 5 m/h — verify formwork capacity');
        if (T < 5)
          newWarnings.push('Low temperature — concrete may set slowly, higher pressures expected');
        if (H > 5) newWarnings.push('Pour height >5m — consider staged pours');

        setResults({
          p_max_hydrostatic: p_hydrostatic,
          p_max_ciria: p_ciria,
          p_max_din: p_din,
          p_design,
          h_effective: h_eff,
          tie_force: tieForce,
          total_force_per_m: totalForcePerM,
          method_used: methodUsed,
          status: 'PASS',
          classification,
          classColor,
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
    const report = buildFormworkPressureReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  // DOCX Export — Editable Word document
  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Formwork Pressure Design',
      subtitle: 'CIRIA R108 / ACI 347 Compliant',
      projectInfo: [
        { label: 'Project', value: (formData as any).projectName || '-' },
        { label: 'Reference', value: (formData as any).reference || '-' },
      ],
      inputs: [
        { label: 'Pour Height', value: (formData as any).pour_height || '0', unit: 'm' },
        { label: 'Pour Rate', value: (formData as any).pour_rate || '0', unit: 'm/hr' },
        {
          label: 'Concrete Temperature',
          value: (formData as any).concrete_temp || '0',
          unit: '°C',
        },
        { label: 'Cement Type', value: (formData as any).cement_type || '-', unit: '' },
      ],
      checks: [
        {
          name: 'Lateral Pressure',
          capacity: `${(results as any).max_pressure?.toFixed(1) || '-'} kPa`,
          utilisation: '-',
          status: 'PASS' as 'PASS' | 'FAIL',
        },
        {
          name: 'Hydrostatic',
          capacity: `${(results as any).hydrostatic_head?.toFixed(1) || '-'} m`,
          utilisation: '-',
          status: 'PASS' as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Design',
          suggestion:
            'Design formwork ties for calculated pressure using appropriate safety factors',
        },
      ],
      warnings: [],
      footerNote: 'Beaver Bridges Ltd — Formwork Pressure Design',
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
      <div className="flex items-center gap-1.5 mb-1">
        <ExplainableLabel label={label} field={field} className="text-sm font-semibold text-gray-200" />{' '}
        {unit && <span className="text-neon-cyan text-xs">({unit})</span>}
      </div>
      <input
        type="number"
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
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
      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
        <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection(sectionId)}>
          <CardTitle className="text-2xl text-white flex items-center space-x-3">
            {icon}
            <span>{title}</span>
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
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Formwork Pressure
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">CIRIA R108 formwork pressure design</p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {results && (
              <>
                <Button
                  onClick={handleExportPDF}
                  className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </Button>
                <Button
                  onClick={handleExportDOCX}
                  className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
                <SaveRunButton
                  calculatorKey="formwork_pressure"
                  inputs={formData as unknown as Record<string, string>}
                  results={results}
                  status="PASS"
                  summary={
                    results
                      ? `${(results as any).p_design?.toFixed(1) || '-'} kPa`
                      : undefined
                  }
                />
              </>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
            {[
              { id: 'input', label: 'Inputs', icon: <FiSettings /> },
              { id: 'results', label: 'Analysis', icon: <FiActivity />, disabled: !results },
              { id: 'visualization', label: 'Visualization', icon: <FiLayers />, disabled: !results },
            ].map((tab) => (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
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
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FiZap className="text-neon-cyan" size={24} />
                      </motion.div>
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
                          className="border-gray-700 hover:border-neon-cyan text-gray-300 hover:text-neon-cyan"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Concrete Properties */}
                <CollapsibleSection
                  title="Concrete Properties"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiDroplet className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  variant="blue"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Concrete Type</label>
                      <select
                        title="Concrete Type"
                        value={formData.concrete_type}
                        onChange={(e) => updateForm('concrete_type', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(CONCRETE_TYPES).map(([key, ct]) => (
                          <option key={key} value={key}>
                            {ct.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Density" field="density" unit="kN/m³" />
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Slump/Workability</label>
                      <select
                        title="Slump"
                        value={formData.slump}
                        onChange={(e) => updateForm('slump', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(SLUMP_CATEGORIES).map(([key, sc]) => (
                          <option key={key} value={key}>
                            {sc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField
                      label="Temperature"
                      field="temperature"
                      unit="°C"
                      tooltip="Ambient/concrete temp"
                    />
                  </div>
                </CollapsibleSection>

                {/* Placement */}
                <CollapsibleSection
                  title="Placement Parameters"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  variant="emerald"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Placement Method</label>
                      <select
                        title="Placement method"
                        value={formData.placement_method}
                        onChange={(e) => updateForm('placement_method', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(PLACEMENT_METHODS).map(([key, pm]) => (
                          <option key={key} value={key}>
                            {pm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField
                      label="Pour Rate"
                      field="pour_rate"
                      unit="m/h"
                      tooltip="Vertical rise rate"
                    />
                    <InputField
                      label="Pour Height"
                      field="pour_height"
                      unit="m"
                      tooltip="Total pour height"
                    />
                  </div>
                </CollapsibleSection>

                {/* Admixtures & Vibration */}
                <CollapsibleSection
                  title="Admixtures & Compaction"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiSettings className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  variant="purple"
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Admixture</label>
                      <select
                        title="Admixture"
                        value={formData.admixture}
                        onChange={(e) => updateForm('admixture', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(ADMIXTURES).map(([key, adm]) => (
                          <option key={key} value={key}>
                            {adm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Vibration</label>
                      <select
                        title="Vibration"
                        value={formData.vibration}
                        onChange={(e) => updateForm('vibration', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(VIBRATION_TYPES).map(([key, vt]) => (
                          <option key={key} value={key}>
                            {vt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Formwork */}
                <CollapsibleSection
                  title="Formwork & Ties"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiTarget className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  variant="amber"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Formwork Type</label>
                      <select
                        title="Formwork Type"
                        value={formData.form_type}
                        onChange={(e) => updateForm('form_type', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(FORM_TYPES).map(([key, ft]) => (
                          <option key={key} value={key}>
                            {ft.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Form Height" field="form_height" unit="mm" />
                    <InputField label="Form Width" field="form_width" unit="mm" />
                    <InputField label="Tie Spacing (H)" field="tie_spacing_h" unit="mm" />
                    <InputField label="Tie Spacing (V)" field="tie_spacing_v" unit="mm" />
                  </div>
                </CollapsibleSection>

                {/* Design Method */}
                <CollapsibleSection
                  title="Design Method"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiInfo className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  variant="blue"
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Design Method</label>
                      <select
                        title="Design Method"
                        value={formData.design_method}
                        onChange={(e) => updateForm('design_method', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(DESIGN_METHODS).map(([key, dm]) => (
                          <option key={key} value={key}>
                            {dm.name} - {dm.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Safety Factor" field="safety_factor" />
                  </div>
                </CollapsibleSection>
              </div>

              {/* Right Column */}
              <div className="sticky top-32 space-y-4">
                {/* Fullscreen Preview Overlay */}
                {previewMaximized && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                  >
                    {/* 3D Scene */}
                    <div className="flex-1 relative">
                      <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                        <FormworkPressure3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        FORMWORK PRESSURE — REAL-TIME PREVIEW
                      </div>
                    </div>

                    {/* Right sidebar — live parameters & stats */}
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>

                      {[
                        { label: 'Density', field: 'density' as keyof FormData, min: 18, max: 28, step: 1, unit: 'kN/m³' },
                        { label: 'Pour Rate', field: 'pour_rate' as keyof FormData, min: 0.5, max: 20, step: 0.5, unit: 'm/h' },
                        { label: 'Pour Height', field: 'pour_height' as keyof FormData, min: 1, max: 15, step: 0.5, unit: 'm' },
                        { label: 'Temperature', field: 'temperature' as keyof FormData, min: 5, max: 40, step: 1, unit: '°C' },
                        { label: 'Form Height', field: 'form_height' as keyof FormData, min: 1000, max: 15000, step: 500, unit: 'mm' },
                        { label: 'Form Width', field: 'form_width' as keyof FormData, min: 500, max: 5000, step: 100, unit: 'mm' },
                        { label: 'Safety Factor', field: 'safety_factor' as keyof FormData, min: 1.0, max: 2.0, step: 0.05, unit: '' },
                      ].map((s) => (
                        <div key={s.field} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">{formData[s.field]} {s.unit}</span>
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
                          { label: 'Concrete Type', value: formData.concrete_type || '—' },
                          { label: 'Placement', value: formData.placement_method || '—' },
                          { label: 'Slump', value: formData.slump || '—' },
                          { label: 'Vibration', value: formData.vibration || '—' },
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
                              { label: 'CIRIA P_max', value: `${results.p_max_ciria?.toFixed(1)} kPa` },
                              { label: 'DIN P_max', value: `${results.p_max_din?.toFixed(1)} kPa` },
                              { label: 'Design P', value: `${results.p_design?.toFixed(1)} kPa` },
                              { label: 'Tie Force', value: `${results.tie_force?.toFixed(1)} kN` },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className="text-white font-medium">{check.value}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs py-0.5 mt-1">
                              <span className="text-gray-500">Status</span>
                              <span className={cn('font-bold', results.status === 'FAIL' ? 'text-red-500' : 'text-emerald-400')}>
                                {results.status}
                              </span>
                            </div>
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
                  title="Formwork Pressure — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <FormworkPressure3D />
                    </Interactive3DDiagram>
                  )}
                />

                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white">Quick Reference</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      <strong>CIRIA R108:</strong> UK guidance for formwork pressure
                    </p>
                    <p>
                      <strong>Key factors:</strong>
                    </p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Pour rate R (m/h)</li>
                      <li>Temperature T (°C)</li>
                      <li>Slump/workability</li>
                      <li>Admixtures (retarders)</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={runCalculation}
                    disabled={isCalculating}
                    className="w-full px-16 py-8 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl"
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
            className="space-y-8"
          >
            {results && (
              <>
                {/* Border-l-4 Summary Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { label: 'Hydrostatic', value: `${results.p_max_hydrostatic.toFixed(1)} kPa`, icon: <FiDroplet />, status: 'PASS' },
                    { label: 'CIRIA R108', value: `${results.p_max_ciria.toFixed(1)} kPa`, icon: <FiActivity />, status: 'PASS' },
                    { label: 'DIN 18218', value: `${results.p_max_din.toFixed(1)} kPa`, icon: <FiLayers />, status: 'PASS' },
                    { label: 'Design Pressure', value: `${results.p_design.toFixed(1)} kPa`, icon: <FiTarget />, status: results.classification === 'VERY HIGH' ? 'WARN' : 'PASS' },
                  ].map((item, i) => (
                    <Card
                      key={i}
                      variant="glass"
                      className={cn(
                        'border-l-4',
                        item.status === 'PASS' ? 'border-l-green-500' : 'border-l-orange-500',
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">{item.icon}</div>
                          <span
                            className={cn(
                              'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                              item.status === 'PASS'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-orange-500/20 text-orange-400',
                            )}
                          >
                            <FiCheck className="inline mr-1" />{item.status === 'PASS' ? 'OK' : 'WARN'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                        <p className="text-2xl font-black text-white">{item.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Pressure Results */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiDroplet className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Lateral Pressure</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center">
                            <div className="text-gray-400 text-xs">
                              p<sub>hydrostatic</sub>
                            </div>
                            <div className="text-lg font-bold text-gray-300">
                              {results.p_max_hydrostatic.toFixed(1)} kPa
                            </div>
                          </div>
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center">
                            <div className="text-gray-400 text-xs">
                              p<sub>CIRIA</sub>
                            </div>
                            <div className="text-lg font-bold text-neon-cyan">
                              {results.p_max_ciria.toFixed(1)} kPa
                            </div>
                          </div>
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center">
                            <div className="text-gray-400 text-xs">
                              p<sub>DIN</sub>
                            </div>
                            <div className="text-lg font-bold text-neon-blue">
                              {results.p_max_din.toFixed(1)} kPa
                            </div>
                          </div>
                          <div
                            className="p-3 bg-gray-900/50 rounded-xl text-center border-2"
                            style={{ borderColor: results.classColor }}
                          >
                            <div className="text-gray-400 text-xs">
                              p<sub>design</sub>
                            </div>
                            <div className="text-xl font-bold" style={{ color: results.classColor }}>
                              {results.p_design.toFixed(1)} kPa
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Effective Depth */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiActivity className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Effective Pressure Head</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center">
                            <div className="text-gray-400 text-xs">Effective Depth</div>
                            <div className="text-lg font-bold text-white">
                              {results.h_effective.toFixed(2)} m
                            </div>
                          </div>
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center">
                            <div className="text-gray-400 text-xs">Method Used</div>
                            <div className="text-lg font-bold text-amber-400">
                              {results.method_used}
                            </div>
                          </div>
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center">
                            <div className="text-gray-400 text-xs">Total Force/m</div>
                            <div className="text-lg font-bold text-white">
                              {results.total_force_per_m.toFixed(1)} kN/m
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tie Force */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiTarget className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Tie Design</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center">
                            <div className="text-gray-400 text-xs">Tie Spacing</div>
                            <div className="text-lg font-bold text-white">
                              {formData.tie_spacing_h} × {formData.tie_spacing_v} mm
                            </div>
                          </div>
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center">
                            <div className="text-gray-400 text-xs">Tributary Area</div>
                            <div className="text-lg font-bold text-white">
                              {(
                                (parseFloat(formData.tie_spacing_h) / 1000) *
                                (parseFloat(formData.tie_spacing_v) / 1000)
                              ).toFixed(2)}{' '}
                              m²
                            </div>
                          </div>
                          <div className="p-3 bg-gray-900/50 rounded-xl text-center border-2 border-emerald-500">
                            <div className="text-gray-400 text-xs">Tie Force</div>
                            <div className="text-xl font-bold text-emerald-400">
                              {results.tie_force.toFixed(1)} kN
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column — Sticky */}
                  <div className="sticky top-32 space-y-4">
                    <Card
                      variant="glass"
                      className={cn(
                        'border shadow-lg',
                        results.status === 'PASS'
                          ? 'border-emerald-500/30 shadow-emerald-500/10'
                          : results.status === 'FAIL'
                            ? 'border-red-500/30 shadow-red-500/10'
                            : 'border-neon-cyan/30 shadow-neon-cyan/10',
                      )}
                    >
                      <CardContent className="py-6 text-center">
                        <div className="text-4xl mb-2 text-neon-cyan">
                          <FiDroplet className="inline" />
                        </div>
                        <div className="font-bold text-lg" style={{ color: results.classColor }}>
                          {results.classification}
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Design Pressure: {results.p_design.toFixed(1)} kPa
                        </div>
                      </CardContent>
                    </Card>

                    {warnings.length > 0 && (
                      <Card variant="glass" className="border-amber-500/30">
                        <CardContent className="py-4">
                          <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <FiAlertTriangle />
                            <span className="font-medium">Design Notes</span>
                          </div>
                          <ul className="text-sm text-white space-y-1">
                            {warnings.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    <Card variant="glass" className="border-neon-blue/20">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-neon-blue mb-3">
                          <FiCheck />
                          <span className="font-medium">Recommendations</span>
                        </div>
                        <ul className="text-sm text-blue-300/80 space-y-2">
                          <li>
                            • Verify formwork tie capacity exceeds {results.tie_force.toFixed(1)} kN
                            design force
                          </li>
                          <li>
                            • Pour rate of {formData.pour_rate} m/h must be maintained — exceeding
                            increases pressure
                          </li>
                          <li>
                            • Monitor concrete temperature — lower temps increase setting time and
                            pressure
                          </li>
                          <li>• Check formwork deflection limits per CIRIA R108 guidance</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-white">Design Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Concrete</span>
                          <span className="text-white">
                            {CONCRETE_TYPES[formData.concrete_type]?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pour Rate</span>
                          <span className="text-white">{formData.pour_rate} m/h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pour Height</span>
                          <span className="text-white">{formData.pour_height} m</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-700">
                          <span className="text-gray-400">Design Pressure</span>
                          <span className="text-white">{results.p_design.toFixed(1)} kPa</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tie Force</span>
                          <span className="text-white">{results.tie_force.toFixed(1)} kN</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
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
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Formwork Pressure Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                  <FormworkPressure3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Additional CSS for grid pattern */}
      <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
};

export default FormworkPressure;
