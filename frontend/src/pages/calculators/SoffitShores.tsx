// =============================================================================
// Soffit Shores Calculator — Premium Edition
// BS 5975 / BS EN 12812 — Slab Formwork Propping Design
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
    FiLayers,
    FiMinimize2,
    FiPackage,
    FiSettings,
    FiSliders,
    FiTarget,
    FiX,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildSoffitShoresReport } from '../../lib/pdf/builders/soffitShoresBuilder';
import { cn } from '../../lib/utils';

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SoffitShores3D from '../../components/3d/scenes/SoffitShores3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Slab
  slab_thickness: string;
  concrete_density: string;
  imposed_load: string;
  construction_load: string;
  // Geometry
  bay_length_x: string;
  bay_length_y: string;
  soffit_height: string;
  // Props
  prop_type: string;
  custom_capacity: string;
  custom_min_length: string;
  custom_max_length: string;
  // Beams
  primary_spacing: string;
  secondary_spacing: string;
  beam_type: string;
  // Design
  safety_factor: string;
  load_factor: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Loads
  dead_load: number;
  imposed_load: number;
  total_load: number;
  factored_load: number;
  // Layout
  props_x: number;
  props_y: number;
  total_props: number;
  actual_spacing_x: number;
  actual_spacing_y: number;
  // Prop Check
  tributary_area: number;
  prop_load: number;
  prop_capacity: number;
  utilisation: number;
  // Status
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// REFERENCE DATA — BS 5975 / PROP MANUFACTURERS
// =============================================================================

const PROP_CATALOGUE: Record<
  string,
  {
    name: string;
    minLength: number;
    maxLength: number;
    weight: number;
    capacity: number;
    brand: string;
  }
> = {
  acrow_0: {
    name: 'Acrow No.0',
    minLength: 1.07,
    maxLength: 1.83,
    weight: 14.5,
    capacity: 34,
    brand: 'Acrow',
  },
  acrow_1: {
    name: 'Acrow No.1',
    minLength: 1.75,
    maxLength: 3.12,
    weight: 17.1,
    capacity: 34,
    brand: 'Acrow',
  },
  acrow_2: {
    name: 'Acrow No.2',
    minLength: 1.98,
    maxLength: 3.35,
    weight: 19.5,
    capacity: 34,
    brand: 'Acrow',
  },
  acrow_3: {
    name: 'Acrow No.3',
    minLength: 2.59,
    maxLength: 3.96,
    weight: 21.7,
    capacity: 34,
    brand: 'Acrow',
  },
  acrow_4: {
    name: 'Acrow No.4',
    minLength: 3.2,
    maxLength: 4.88,
    weight: 27.9,
    capacity: 34,
    brand: 'Acrow',
  },
  slimshore_1: {
    name: 'Slimshore Size 1',
    minLength: 0.6,
    maxLength: 3.0,
    weight: 25,
    capacity: 100,
    brand: 'RMD',
  },
  slimshore_2: {
    name: 'Slimshore Size 2',
    minLength: 2.0,
    maxLength: 5.5,
    weight: 45,
    capacity: 95,
    brand: 'RMD',
  },
  titan_hv: {
    name: 'Titan HV',
    minLength: 1.7,
    maxLength: 2.9,
    weight: 22,
    capacity: 100,
    brand: 'Titan',
  },
  titan_super: {
    name: 'Titan Super',
    minLength: 2.4,
    maxLength: 4.2,
    weight: 28,
    capacity: 120,
    brand: 'Titan',
  },
  peri_pep: {
    name: 'PERI PEP Ergo',
    minLength: 1.5,
    maxLength: 4.0,
    weight: 20,
    capacity: 40,
    brand: 'PERI',
  },
  doka_eurex: {
    name: 'Doka Eurex 60',
    minLength: 1.2,
    maxLength: 4.5,
    weight: 23,
    capacity: 60,
    brand: 'Doka',
  },
  custom: {
    name: 'Custom Prop',
    minLength: 0,
    maxLength: 20,
    weight: 0,
    capacity: 0,
    brand: 'Custom',
  },
};

const BEAM_TYPES: Record<string, { name: string; weight: number; span: number }> = {
  h20_timber: { name: 'H20 Timber Beam', weight: 5.2, span: 2.5 },
  aluma_225: { name: 'Aluma 225', weight: 7.8, span: 3.5 },
  rmd_225: { name: 'RMD 225 Primary', weight: 8.5, span: 3.0 },
  peri_gt24: { name: 'PERI GT24', weight: 4.9, span: 3.0 },
  steel_rsj: { name: 'Steel RSJ', weight: 25, span: 6.0 },
};

const PRESETS = {
  light_slab: {
    name: 'Light Slab (150mm)',
    slab_thickness: '150',
    concrete_density: '25',
    soffit_height: '2.8',
    bay_length_x: '4.0',
    bay_length_y: '4.0',
    prop_type: 'acrow_1',
    primary_spacing: '1200',
    secondary_spacing: '600',
  },
  standard_slab: {
    name: 'Standard Slab (250mm)',
    slab_thickness: '250',
    concrete_density: '25',
    soffit_height: '3.5',
    bay_length_x: '6.0',
    bay_length_y: '6.0',
    prop_type: 'acrow_2',
    primary_spacing: '1200',
    secondary_spacing: '400',
  },
  heavy_slab: {
    name: 'Heavy Slab (400mm)',
    slab_thickness: '400',
    concrete_density: '25',
    soffit_height: '4.0',
    bay_length_x: '5.0',
    bay_length_y: '5.0',
    prop_type: 'slimshore_1',
    primary_spacing: '1000',
    secondary_spacing: '400',
  },
  transfer_slab: {
    name: 'Transfer Slab (600mm)',
    slab_thickness: '600',
    concrete_density: '25',
    soffit_height: '3.5',
    bay_length_x: '4.0',
    bay_length_y: '4.0',
    prop_type: 'titan_super',
    primary_spacing: '800',
    secondary_spacing: '400',
  },
};

const SoffitShores = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    bay_length_x: '',
    bay_length_y: '',
    beam_type: '',
    concrete_density: '',
    construction_load: '',
    custom_capacity: '',
    custom_max_length: '',
    custom_min_length: '',
    imposed_load: '',
    load_factor: '',
    primary_spacing: '',
    projectName: '',
    prop_type: '',
    reference: '',
    safety_factor: '',
    secondary_spacing: '',
    slab_thickness: '',
    soffit_height: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'bay_length_x', label: 'Bay Length X' },
  { key: 'bay_length_y', label: 'Bay Length Y' },
  { key: 'beam_type', label: 'Beam Type' },
  { key: 'concrete_density', label: 'Concrete Density' },
  { key: 'construction_load', label: 'Construction Load' },
  { key: 'custom_capacity', label: 'Custom Capacity' },
  { key: 'custom_max_length', label: 'Custom Max Length' },
  { key: 'custom_min_length', label: 'Custom Min Length' },
  { key: 'imposed_load', label: 'Imposed Load' },
  { key: 'load_factor', label: 'Load Factor' },
  { key: 'primary_spacing', label: 'Primary Spacing' },
  { key: 'prop_type', label: 'Prop Type' },
  { key: 'safety_factor', label: 'Safety Factor' },
  { key: 'secondary_spacing', label: 'Secondary Spacing' },
  { key: 'slab_thickness', label: 'Slab Thickness' },
  { key: 'soffit_height', label: 'Soffit Height' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'slab_thickness', label: 'Slab_thickness', min: 0, max: 100, step: 1, unit: '' },
    { key: 'concrete_density', label: 'Concrete_density', min: 0, max: 100, step: 1, unit: '' },
    { key: 'imposed_load', label: 'Imposed_load', min: 0, max: 100, step: 1, unit: '' },
    { key: 'construction_load', label: 'Construction_load', min: 0, max: 100, step: 1, unit: '' },
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
        const w: string[] = [];

        // Parse inputs
        const slabThk = parseFloat(formData.slab_thickness) || 200; // mm
        const concDensity = parseFloat(formData.concrete_density) || 25; // kN/m³
        const imposedLoad = parseFloat(formData.imposed_load) || 1.5; // kN/m²
        const constructionLoad = parseFloat(formData.construction_load) || 0.75; // kN/m²
        const bayX = parseFloat(formData.bay_length_x) || 6.0; // m
        const bayY = parseFloat(formData.bay_length_y) || 6.0; // m
        const soffitH = parseFloat(formData.soffit_height) || 3.0; // m
        const primarySp = parseFloat(formData.primary_spacing) || 1200; // mm
        const secondarySp = parseFloat(formData.secondary_spacing) || 600; // mm
        const SF = parseFloat(formData.safety_factor) || 1.0;
        const LF = parseFloat(formData.load_factor) || 1.35;

        // Prop capacity
        const propKey = formData.prop_type || 'acrow_1';
        const prop =
          PROP_CATALOGUE[propKey as keyof typeof PROP_CATALOGUE] || PROP_CATALOGUE.acrow_1;
        const propCapacity =
          propKey === 'custom' ? parseFloat(formData.custom_capacity) || 34 : prop.capacity;

        // Check height feasibility
        if (prop.maxLength > 0 && soffitH > prop.maxLength) {
          w.push(`Soffit height ${soffitH}m exceeds prop max length ${prop.maxLength}m`);
        }
        if (prop.minLength > 0 && soffitH < prop.minLength) {
          w.push(`Soffit height ${soffitH}m below prop min length ${prop.minLength}m`);
        }

        // --- LOAD CALCULATION ---
        const dead_load = (slabThk / 1000) * concDensity; // kN/m²
        const total_load = dead_load + imposedLoad + constructionLoad;
        const factored_load = total_load * LF;

        // --- PROP LAYOUT ---
        // Number of props based on spacing
        const propSpX = primarySp / 1000; // m
        const propSpY = secondarySp / 1000; // m
        const props_x = Math.ceil(bayX / propSpX) + 1;
        const props_y = Math.ceil(bayY / propSpY) + 1;
        const total_props = props_x * props_y;

        // Actual spacing
        const actual_spacing_x = bayX / (props_x - 1);
        const actual_spacing_y = bayY / (props_y - 1);

        // Tributary area per prop
        const tributary_area = actual_spacing_x * actual_spacing_y;

        // --- PROP LOAD ---
        const prop_load = factored_load * tributary_area * SF;

        // Utilisation
        const utilisation = propCapacity > 0 ? prop_load / propCapacity : 999;

        // Status
        let classification = 'PASS';
        let classColor = '#22c55e';
        if (utilisation > 1.0) {
          classification = 'FAIL';
          classColor = '#ef4444';
        } else if (utilisation > 0.85) {
          classification = 'MARGINAL';
          classColor = '#f59e0b';
        } else if (utilisation > 0.6) {
          classification = 'ADEQUATE';
          classColor = '#3b82f6';
        }

        // Warnings
        if (utilisation > 1.0)
          w.push('Prop capacity exceeded \u2014 reduce spacing or use higher capacity props');
        if (slabThk > 350) w.push('Thick slab \u2014 consider striking sequence per BS 5975');
        if (soffitH > 4.5) w.push('High soffit \u2014 consider bracing between props');
        if (tributary_area > 4) w.push('Large tributary area \u2014 check beam capacity');

        setResults({
          dead_load,
          imposed_load: imposedLoad,
          total_load,
          factored_load,
          props_x,
          props_y,
          total_props,
          actual_spacing_x,
          actual_spacing_y,
          tributary_area,
          prop_load,
          prop_capacity: propCapacity,
          utilisation,
          status: `${total_props} props @ ${actual_spacing_x.toFixed(2)}\u00d7${actual_spacing_y.toFixed(2)}m \u2014 ${classification}`,
          classification,
          classColor,
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
    const report = buildSoffitShoresReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Soffit Shoring Design',
      subtitle: 'BS EN 12812 / BS 5975 Compliant',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Soffit Shoring' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'BS EN 12812 / BS 5975' },
      ],
      inputs: [
        { label: 'Slab Thickness', value: formData.slab_thickness, unit: 'mm' },
        { label: 'Concrete Density', value: formData.concrete_density, unit: 'kN/m\u00b3' },
        { label: 'Imposed Load', value: formData.imposed_load, unit: 'kN/m\u00b2' },
        { label: 'Construction Load', value: formData.construction_load, unit: 'kN/m\u00b2' },
        { label: 'Bay Length X', value: formData.bay_length_x, unit: 'm' },
        { label: 'Bay Length Y', value: formData.bay_length_y, unit: 'm' },
        { label: 'Prop Type', value: formData.prop_type },
      ],
      sections: [
        {
          title: 'Shoring Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Total Load per Prop', ((results as any).load_per_prop ?? 0).toFixed(1), 'kN'],
            ['Props Required', ((results as any).props_required ?? 0).toString(), '-'],
            ['Prop Spacing X', ((results as any).prop_spacing_x ?? 0).toFixed(2), 'm'],
            ['Prop Spacing Y', ((results as any).prop_spacing_y ?? 0).toFixed(2), 'm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Prop Capacity',
          capacity: `${results.prop_capacity?.toFixed(1) || '-'} kN`,
          utilisation: `${(results.utilisation * 100)?.toFixed(1) || '-'}%`,
          status: (results.status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Soffit Shoring Design',
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
        {unit && <span className="text-xs text-gray-400">({unit})</span>}
      </div>
      <input
        type="number"
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
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
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
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

  const selectedProp = PROP_CATALOGUE[formData.prop_type];

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Glass Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
                Soffit Shores
              </h1>
              <p className="text-lg text-gray-400 mt-2">
                BS 5975 / BS EN 12812 — Slab Formwork Propping Design
              </p>
            </div>
            <div className="flex gap-3">
              {results && (
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="border-neon-cyan/50 text-neon-cyan"
                >
                  <FiDownload className="mr-2" />
                  Export PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={handleExportDOCX}
                  variant="outline"
                  className="border-neon-purple/50 text-neon-purple"
                >
                  <FiDownload className="mr-2" />
                  Export DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton
                  calculatorKey="soffit-shores"
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
            className={activeTab === 'input' ? 'bg-gradient-to-r from-neon-cyan to-neon-blue' : ''}
          >
            Input Data
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            onClick={() => setActiveTab('results')}
            disabled={!results}
            className={activeTab === 'results' ? 'bg-gradient-to-r from-neon-cyan to-neon-blue' : ''}
          >
            Results
          </Button>
          <Button
            variant={activeTab === 'visualization' ? 'default' : 'outline'}
            onClick={() => setActiveTab('visualization')}
            disabled={!results}
            className={activeTab === 'visualization' ? 'bg-gradient-to-r from-neon-cyan to-neon-blue' : ''}
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
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiZap className="w-6 h-6 text-neon-cyan" />
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
                          className="border-gray-600 hover:border-neon-cyan"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Slab Properties */}
                <CollapsibleSection
                  title="Slab Properties"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  variant="amber"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Slab Thickness" field="slab_thickness" unit="mm" />
                    <InputField label="Concrete Density" field="concrete_density" unit="kN/m³" />
                    <InputField label="Imposed Load" field="imposed_load" unit="kN/m²" />
                    <InputField
                      label="Construction Load"
                      field="construction_load"
                      unit="kN/m²"
                      tooltip="BS 5975 minimum 0.75 kN/m²"
                    />
                  </div>
                </CollapsibleSection>

                {/* Bay Geometry */}
                <CollapsibleSection
                  title="Bay Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiGrid className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  variant="blue"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <InputField label="Bay Length X" field="bay_length_x" unit="m" />
                    <InputField label="Bay Length Y" field="bay_length_y" unit="m" />
                    <InputField label="Soffit Height" field="soffit_height" unit="m" />
                  </div>
                </CollapsibleSection>

                {/* Props */}
                <CollapsibleSection
                  title="Prop Selection"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiPackage className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  variant="emerald"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Prop Type</label>
                      <select
                        title="Prop Type"
                        value={formData.prop_type}
                        onChange={(e) => updateForm('prop_type', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.entries(PROP_CATALOGUE).map(([key, prop]) => (
                          <option key={key} value={key}>
                            {prop.name} ({prop.brand}) - {prop.capacity}kN
                          </option>
                        ))}
                      </select>
                    </div>
                    {formData.prop_type === 'custom' && (
                      <>
                        <InputField label="Capacity" field="custom_capacity" unit="kN" />
                        <InputField label="Min Length" field="custom_min_length" unit="m" />
                        <InputField label="Max Length" field="custom_max_length" unit="m" />
                      </>
                    )}
                  </div>
                  {selectedProp && formData.prop_type !== 'custom' && (
                    <div className="mt-3 p-3 bg-gray-800/30 rounded-xl text-sm text-gray-400">
                      <strong>{selectedProp.name}</strong>: Capacity {selectedProp.capacity}kN,
                      Range {selectedProp.minLength}-{selectedProp.maxLength}m
                    </div>
                  )}
                </CollapsibleSection>

                {/* Spacing */}
                <CollapsibleSection
                  title="Beam & Prop Spacing"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  variant="purple"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InputField label="Primary Beam Spacing" field="primary_spacing" unit="mm" />
                    <InputField
                      label="Secondary Beam Spacing"
                      field="secondary_spacing"
                      unit="mm"
                    />
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Beam Type</label>
                      <select
                        title="Beam Type"
                        value={formData.beam_type}
                        onChange={(e) => updateForm('beam_type', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.entries(BEAM_TYPES).map(([key, beam]) => (
                          <option key={key} value={key}>
                            {beam.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Design Factors */}
                <CollapsibleSection
                  title="Design Factors"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  variant="amber"
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Load Factor (DL)" field="load_factor" />
                    <InputField label="Safety Factor" field="safety_factor" />
                  </div>
                </CollapsibleSection>

                {/* Big Calculate Button */}
                <button
                  onClick={() => {
                    runCalculation();
                    setActiveTab('results');
                  }}
                  disabled={isCalculating}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCalculating ? '⏳ CALCULATING...' : '⚡ RUN FULL ANALYSIS'}
                </button>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
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
                        <SoffitShores3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        SOFFIT SHORES — REAL-TIME PREVIEW
                      </div>
                    </div>

                    {/* Right sidebar — live parameters & stats */}
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>

                      {[
                        { label: 'Slab Thickness', field: 'slab_thickness' as keyof FormData, min: 100, max: 500, step: 25, unit: 'mm' },
                        { label: 'Concrete Density', field: 'concrete_density' as keyof FormData, min: 18, max: 28, step: 1, unit: 'kN/m³' },
                        { label: 'Imposed Load', field: 'imposed_load' as keyof FormData, min: 0, max: 20, step: 0.5, unit: 'kN/m²' },
                        { label: 'Construction Load', field: 'construction_load' as keyof FormData, min: 0, max: 5, step: 0.25, unit: 'kN/m²' },
                        { label: 'Bay Length X', field: 'bay_length_x' as keyof FormData, min: 500, max: 3000, step: 100, unit: 'mm' },
                        { label: 'Bay Length Y', field: 'bay_length_y' as keyof FormData, min: 500, max: 3000, step: 100, unit: 'mm' },
                        { label: 'Soffit Height', field: 'soffit_height' as keyof FormData, min: 1000, max: 6000, step: 100, unit: 'mm' },
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
                          { label: 'Prop Type', value: formData.prop_type || '—' },
                          { label: 'Beam Type', value: formData.beam_type || '—' },
                          { label: 'Primary Spacing', value: `${formData.primary_spacing || '—'} mm` },
                          { label: 'Secondary Spacing', value: `${formData.secondary_spacing || '—'} mm` },
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
                              { label: 'Utilisation', util: results.utilisation?.toFixed(0), status: results.status },
                              { label: 'Prop Load', util: null, status: `${results.prop_load?.toFixed(1)} kN` },
                              { label: 'Prop Capacity', util: null, status: `${results.prop_capacity?.toFixed(1)} kN` },
                              { label: 'Total Props', util: null, status: `${results.total_props}` },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', check.label === 'Utilisation' && check.status === 'FAIL' ? 'text-red-500' : check.label === 'Utilisation' ? 'text-emerald-400' : 'text-white')}>
                                  {check.util ? `${check.util}%` : check.status}
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
                  title="Soffit Shores — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <SoffitShores3D />
                    </Interactive3DDiagram>
                  )}
                />

                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">Quick Reference</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      <strong>BS 5975:</strong> Temporary works guidance
                    </p>
                    <p>
                      <strong>BS EN 12812:</strong> Falsework performance
                    </p>
                    <p>
                      <strong>Min. construction load:</strong> 0.75 kN/m²
                    </p>
                    <p>
                      <strong>Typical safety factor:</strong> 1.5
                    </p>
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
                  {/* Loading */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                          <FiLayers className="w-6 h-6 text-neon-cyan" />
                        </div>
                        Loading Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Dead Load</div>
                          <div className="text-lg font-bold text-white">
                            {results.dead_load.toFixed(2)} kN/m²
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Imposed Load</div>
                          <div className="text-lg font-bold text-white">
                            {results.imposed_load.toFixed(2)} kN/m²
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Total (Unfact)</div>
                          <div className="text-lg font-bold text-white">
                            {results.total_load.toFixed(2)} kN/m²
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center border-2 border-neon-cyan/30">
                          <div className="text-gray-400 text-xs">Factored</div>
                          <div className="text-xl font-bold text-neon-cyan">
                            {results.factored_load.toFixed(2)} kN/m²
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Layout */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white">Prop Layout</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Props X-dir</div>
                          <div className="text-lg font-bold text-white">{results.props_x}</div>
                        </div>
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Props Y-dir</div>
                          <div className="text-lg font-bold text-white">{results.props_y}</div>
                        </div>
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Total Props</div>
                          <div className="text-xl font-bold text-neon-cyan">
                            {results.total_props}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Tributary Area</div>
                          <div className="text-lg font-bold text-white">
                            {results.tributary_area.toFixed(2)} m²
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Prop Check */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                          <FiTarget className="w-6 h-6 text-neon-cyan" />
                        </div>
                        Prop Capacity Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Prop Load</div>
                          <div className="text-lg font-bold text-white">
                            {results.prop_load.toFixed(1)} kN
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/30 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Prop Capacity</div>
                          <div className="text-lg font-bold text-white">
                            {results.prop_capacity.toFixed(0)} kN
                          </div>
                        </div>
                        <div
                          className="p-3 bg-gray-900/30 rounded-xl text-center border-2"
                          style={{ borderColor: results.classColor }}
                        >
                          <div className="text-gray-400 text-xs">Utilisation</div>
                          <div className="text-xl font-bold" style={{ color: results.classColor }}>
                            {results.utilisation.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-gray-800/30 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          {results.utilisation <= 100 ? (
                            <FiCheck className="text-emerald-400" />
                          ) : (
                            <FiX className="text-red-400" />
                          )}
                          <span className="font-medium" style={{ color: results.classColor }}>
                            {results.status}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{
                              width: `${Math.min(results.utilisation, 100)}%`,
                              backgroundColor: results.classColor,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="sticky top-8 space-y-4">
                  <Card
                    variant="glass"
                    className={cn(
                      'border-l-4 shadow-2xl',
                      results.classification === 'PASS' || results.classification === 'ADEQUATE'
                        ? 'border-l-emerald-500 border-emerald-500/30 shadow-emerald-500/10'
                        : results.classification === 'FAIL'
                          ? 'border-l-red-500 border-red-500/30 shadow-red-500/10'
                          : 'border-l-amber-500 border-amber-500/30 shadow-amber-500/10',
                    )}
                  >
                    <CardContent className="py-6 text-center">
                      <div className="text-4xl mb-2 text-neon-cyan">
                        <FiPackage className="inline" />
                      </div>
                      <div className="font-bold text-lg" style={{ color: results.classColor }}>
                        {results.classification}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        {results.total_props} props @ {results.utilisation.toFixed(0)}%
                      </div>
                    </CardContent>
                  </Card>

                  {warnings.length > 0 && (
                    <Card variant="glass" className="border-l-4 border-l-amber-500 border-amber-500/30 shadow-2xl">
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
                  <Card variant="glass" className="border-l-4 border-l-neon-cyan border-neon-cyan/30 shadow-2xl">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 text-neon-cyan mb-3">
                        <FiCheck />
                        <span className="font-medium">Recommendations</span>
                      </div>
                      <ul className="text-sm text-gray-300 space-y-2">
                        <li>
                          • Verify prop capacity ({results.prop_capacity.toFixed(0)} kN) exceeds
                          factored load ({results.prop_load.toFixed(1)} kN)
                        </li>
                        <li>
                          • Check soffit height ({formData.soffit_height}m) is within prop range
                        </li>
                        <li>• Ensure props are plumb and base plates seated on firm surface</li>
                        <li>• Follow BS 5975 for striking times and backpropping requirements</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-white">Design Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Slab Thickness</span>
                        <span className="text-white">{formData.slab_thickness} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Soffit Height</span>
                        <span className="text-white">{formData.soffit_height} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Prop Type</span>
                        <span className="text-white">{selectedProp?.name}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Factored Load</span>
                        <span className="text-white">{results.factored_load.toFixed(2)} kN/m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Prop Load</span>
                        <span className="text-white">{results.prop_load.toFixed(1)} kN</span>
                      </div>
                    </CardContent>
                  </Card>
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
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-white">Propping Layout</CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                  <SoffitShores3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      </div>
  );
};

export default SoffitShores;
