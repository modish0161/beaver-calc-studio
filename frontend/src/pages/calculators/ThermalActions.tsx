// =============================================================================
// Thermal Actions Calculator — Premium Edition
// EN 1991-1-5 with UK NA — Temperature Effects on Structures
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMinimize2,
  FiSliders,
  FiSun,
  FiTarget,
  FiThermometer,
  FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildThermalActionsReport } from '../../lib/pdf/builders/thermalActionsBuilder';
import { cn } from '../../lib/utils';

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import ThermalActions3D from '../../components/3d/scenes/ThermalActions3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Structure Type
  structure_type: string;
  deck_type: string;
  surfacing_thickness: string;
  // Geometry
  member_length: string;
  depth: string;
  section_area: string;
  moment_of_inertia: string;
  // Material
  material: string;
  custom_alpha: string;
  custom_E: string;
  // Location
  location: string;
  altitude: string;
  coastal: string;
  // Temperature
  initial_temp: string;
  T_max_shade: string;
  T_min_shade: string;
  // Restraint
  restraint_type: string;
  fixity_factor: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Uniform Temperature Component
  Te_max: number;
  Te_min: number;
  delta_TU_con: number;
  delta_TU_exp: number;
  // Differential Component
  delta_TM_heat: number;
  delta_TM_cool: number;
  // Movement
  max_expansion: number;
  max_contraction: number;
  total_range: number;
  // Forces (if restrained)
  axial_force_exp: number;
  axial_force_con: number;
  curvature_heat: number;
  curvature_cool: number;
  moment_heat: number;
  moment_cool: number;
  // Stresses
  thermal_stress_exp: number;
  thermal_stress_con: number;
  // Status
  status: string;
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA — EN 1991-1-5 UK NA
// =============================================================================

const STRUCTURE_TYPES = {
  bridge: { name: 'Bridge', hasDeckType: true, description: 'Bridge deck' },
  building: { name: 'Building', hasDeckType: false, description: 'Building structure' },
  tank_silo: { name: 'Tank/Silo', hasDeckType: false, description: 'Storage structure' },
  industrial: { name: 'Industrial', hasDeckType: false, description: 'Industrial facility' },
};

const DECK_TYPES: Record<
  string,
  { name: string; Te_max_top: number; Te_min_top: number; DeltaT_heat: number; DeltaT_cool: number }
> = {
  type1: {
    name: 'Type 1 - Steel on Steel Box',
    Te_max_top: 24,
    Te_min_top: -3,
    DeltaT_heat: 18,
    DeltaT_cool: 13,
  },
  type2: {
    name: 'Type 2 - Composite Deck',
    Te_max_top: 32,
    Te_min_top: 0,
    DeltaT_heat: 15,
    DeltaT_cool: 18,
  },
  type3: {
    name: 'Type 3 - Concrete Box/Slab',
    Te_max_top: 28,
    Te_min_top: 2,
    DeltaT_heat: 10,
    DeltaT_cool: 5,
  },
};

const SURFACING_ADJUSTMENTS: Record<string, { heat: number; cool: number; name: string }> = {
  '0': { heat: 0, cool: 0, name: 'Unsurfaced' },
  '50': { heat: -3, cool: 1, name: '50mm surfacing' },
  '100': { heat: -8, cool: 3, name: '100mm surfacing' },
  ballast: { heat: -10, cool: 5, name: 'Ballasted track' },
};

const MATERIALS: Record<string, { alpha: number; E: number; name: string }> = {
  steel: { alpha: 12e-6, E: 210000, name: 'Structural Steel' },
  concrete: { alpha: 10e-6, E: 34000, name: 'Concrete' },
  stainless: { alpha: 16e-6, E: 200000, name: 'Stainless Steel' },
  aluminium: { alpha: 23e-6, E: 70000, name: 'Aluminium' },
  timber: { alpha: 5e-6, E: 11000, name: 'Timber' },
  custom: { alpha: 12e-6, E: 210000, name: 'Custom' },
};

const UK_LOCATIONS: Record<string, { Tmax: number; Tmin: number }> = {
  london: { Tmax: 36, Tmin: -14 },
  birmingham: { Tmax: 34, Tmin: -16 },
  manchester: { Tmax: 33, Tmin: -15 },
  edinburgh: { Tmax: 30, Tmin: -18 },
  cardiff: { Tmax: 33, Tmin: -12 },
  belfast: { Tmax: 29, Tmin: -13 },
  default: { Tmax: 34, Tmin: -18 },
};

const RESTRAINT_TYPES: Record<string, { name: string; factor: number }> = {
  free: { name: 'Free Expansion', factor: 0 },
  partially: { name: 'Partially Restrained', factor: 0.5 },
  fully: { name: 'Fully Restrained', factor: 1.0 },
};

const PRESETS = {
  steel_bridge: {
    name: 'Steel Bridge',
    structure_type: 'bridge',
    deck_type: 'type1',
    material: 'steel',
    member_length: '50',
    depth: '2000',
    surfacing_thickness: '50',
    section_area: '45000',
    moment_of_inertia: '1.5e10',
    location: 'midlands',
    altitude: '60',
    coastal: 'no',
    initial_temp: '10',
    restraint_type: 'free',
    fixity_factor: '0.5',
  },
  composite_bridge: {
    name: 'Composite Bridge',
    structure_type: 'bridge',
    deck_type: 'type2',
    material: 'steel',
    member_length: '35',
    depth: '1500',
    surfacing_thickness: '100',
    section_area: '55000',
    moment_of_inertia: '2.0e10',
    location: 'midlands',
    altitude: '40',
    coastal: 'no',
    initial_temp: '10',
    restraint_type: 'partially',
    fixity_factor: '0.5',
  },
  concrete_bridge: {
    name: 'Concrete Bridge',
    structure_type: 'bridge',
    deck_type: 'type3',
    material: 'concrete',
    member_length: '25',
    depth: '1200',
    surfacing_thickness: '100',
    section_area: '480000',
    moment_of_inertia: '5.8e10',
    location: 'south_east',
    altitude: '30',
    coastal: 'no',
    initial_temp: '10',
    restraint_type: 'partially',
    fixity_factor: '0.5',
  },
  rail_bridge: {
    name: 'Rail Bridge (Concrete)',
    structure_type: 'bridge',
    deck_type: 'type3',
    material: 'concrete',
    member_length: '20',
    depth: '1400',
    surfacing_thickness: '150',
    section_area: '560000',
    moment_of_inertia: '7.5e10',
    location: 'north',
    altitude: '80',
    coastal: 'no',
    initial_temp: '10',
    restraint_type: 'partially',
    fixity_factor: '0.6',
  },
  viaduct_long_span: {
    name: 'Viaduct (Long Span)',
    structure_type: 'bridge',
    deck_type: 'type2',
    material: 'steel',
    member_length: '120',
    depth: '3000',
    surfacing_thickness: '80',
    section_area: '80000',
    moment_of_inertia: '4.5e10',
    location: 'wales_sw',
    altitude: '150',
    coastal: 'yes',
    initial_temp: '10',
    restraint_type: 'free',
    fixity_factor: '0.5',
  },
  footbridge: {
    name: 'Footbridge (Steel)',
    structure_type: 'bridge',
    deck_type: 'type1',
    material: 'steel',
    member_length: '30',
    depth: '800',
    surfacing_thickness: '30',
    section_area: '12000',
    moment_of_inertia: '3.0e9',
    location: 'south_east',
    altitude: '20',
    coastal: 'no',
    initial_temp: '10',
    restraint_type: 'free',
    fixity_factor: '0.5',
  },
};

const ThermalActions = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    altitude: '',
    coastal: '',
    custom_alpha: '',
    custom_E: '',
    deck_type: '',
    depth: '',
    fixity_factor: '',
    initial_temp: '',
    location: '',
    material: '',
    member_length: '',
    moment_of_inertia: '',
    projectName: '',
    reference: '',
    restraint_type: '',
    section_area: '',
    structure_type: '',
    surfacing_thickness: '',
    T_max_shade: '',
    T_min_shade: '',
  });
  // What-If sliders
  const whatIfSliders = [
    { key: 'structure_type', label: 'Structure_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'deck_type', label: 'Deck_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'surfacing_thickness', label: 'Surfacing_thickness', min: 0, max: 100, step: 1, unit: '' },
    { key: 'member_length', label: 'Member_length', min: 0, max: 100, step: 1, unit: '' }
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
    const L = parseFloat(formData.member_length);
    const h = parseFloat(formData.depth);
    const A = parseFloat(formData.section_area);
    const I = parseFloat(formData.moment_of_inertia);
    if (isNaN(L) || L <= 0) errors.push('Member length must be a positive number');
    if (isNaN(h) || h <= 0) errors.push('Section depth must be a positive number');
    if (isNaN(A) || A <= 0) errors.push('Section area must be a positive number');
    if (isNaN(I) || I <= 0) errors.push('Moment of inertia must be a positive number');
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
        const w: string[] = [];

        // Parse inputs
        const L = parseFloat(formData.member_length) || 30;
        const h = parseFloat(formData.depth) || 1000;
        const A = parseFloat(formData.section_area) || 10000;
        const I = parseFloat(formData.moment_of_inertia) || 1e9;
        const T0 = parseFloat(formData.initial_temp) || 10;

        // Material properties
        const mat = MATERIALS[formData.material] || MATERIALS.steel;
        const alpha =
          formData.material === 'custom'
            ? (parseFloat(formData.custom_alpha) || 12) * 1e-6
            : mat.alpha;
        const E = formData.material === 'custom' ? parseFloat(formData.custom_E) || 210000 : mat.E;

        // Shade temperatures from UK location or user input
        const loc = UK_LOCATIONS[formData.location] || UK_LOCATIONS.default;
        const Tmax_shade = parseFloat(formData.T_max_shade) || loc.Tmax;
        const Tmin_shade = parseFloat(formData.T_min_shade) || loc.Tmin;

        // Altitude correction per UK NA
        const alt = parseFloat(formData.altitude) || 0;
        const Tmax_corrected = Tmax_shade - 0.5 * (alt / 100);
        const Tmin_corrected = Tmin_shade - 1.0 * (alt / 100);

        // Effective bridge temperatures (EN 1991-1-5 Table 6.1)
        let Te_max: number;
        let Te_min: number;
        let delta_TM_heat = 0;
        let delta_TM_cool = 0;

        if (formData.structure_type === 'bridge' && DECK_TYPES[formData.deck_type]) {
          const deck = DECK_TYPES[formData.deck_type];
          Te_max = Tmax_corrected + deck.Te_max_top - 24;
          Te_min = Tmin_corrected + deck.Te_min_top + 3;

          // Differential temperature components (Table 6.2)
          delta_TM_heat = deck.DeltaT_heat;
          delta_TM_cool = deck.DeltaT_cool;

          // Surfacing adjustments
          const surfAdj = SURFACING_ADJUSTMENTS[formData.surfacing_thickness];
          if (surfAdj) {
            delta_TM_heat += surfAdj.heat;
            delta_TM_cool += surfAdj.cool;
          }
          w.push(`Bridge deck type: ${deck.name}`);
        } else {
          Te_max = Tmax_corrected;
          Te_min = Tmin_corrected;
          w.push('Building/structure: using shade temperatures directly');
        }

        // Uniform temperature components
        const delta_TU_exp = Te_max - T0;
        const delta_TU_con = T0 - Te_min;

        // Free thermal movement (mm)
        const L_mm = L * 1000;
        const max_expansion = alpha * delta_TU_exp * L_mm;
        const max_contraction = alpha * delta_TU_con * L_mm;
        const total_range = max_expansion + max_contraction;

        // Restraint effects
        const restraint = RESTRAINT_TYPES[formData.restraint_type] || RESTRAINT_TYPES.free;
        const fixity = restraint.factor;

        // Restrained axial forces: N = E × A × α × ΔT × fixity
        const axial_force_exp = (E * A * alpha * delta_TU_exp * fixity) / 1000;
        const axial_force_con = (E * A * alpha * delta_TU_con * fixity) / 1000;

        // Thermal stresses
        const thermal_stress_exp = A > 0 ? (axial_force_exp * 1000) / A : 0;
        const thermal_stress_con = A > 0 ? (axial_force_con * 1000) / A : 0;

        // Curvature from differential temperature: κ = α × ΔTM / h
        const curvature_heat = h > 0 ? (alpha * delta_TM_heat) / (h / 1000) : 0;
        const curvature_cool = h > 0 ? (alpha * delta_TM_cool) / (h / 1000) : 0;

        // Moments from differential temperature (if restrained)
        const moment_heat = (E * I * curvature_heat * fixity) / 1e6;
        const moment_cool = (E * I * curvature_cool * fixity) / 1e6;

        // Warnings
        if (total_range > 100) w.push('Large movement range — consider expansion joints');
        if (total_range > 50) w.push('Movement > 50mm — check bearing capacity');
        if (thermal_stress_exp > 0.5 * (mat.name === 'Concrete' ? 30 : 275)) {
          w.push('High thermal stress — review restraint conditions');
        }
        if (delta_TU_exp > 40) w.push('ΔTU expansion > 40°C — verify shade temperature data');

        // Rating
        let rating = 'Low Movement';
        let ratingColor = '#22c55e';
        if (total_range > 100) {
          rating = 'Very Large Movement';
          ratingColor = '#ef4444';
        } else if (total_range > 50) {
          rating = 'Large Movement';
          ratingColor = '#f59e0b';
        } else if (total_range > 20) {
          rating = 'Moderate Movement';
          ratingColor = '#3b82f6';
        }

        setResults({
          Te_max,
          Te_min,
          delta_TU_con,
          delta_TU_exp,
          delta_TM_heat,
          delta_TM_cool,
          max_expansion,
          max_contraction,
          total_range,
          axial_force_exp,
          axial_force_con,
          curvature_heat,
          curvature_cool,
          moment_heat,
          moment_cool,
          thermal_stress_exp,
          thermal_stress_con,
          status: `Total range ${total_range.toFixed(1)}mm — ${rating}`,
          rating,
          ratingColor,
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
    const report = buildThermalActionsReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Thermal Actions Analysis',
      subtitle: 'EN 1991-1-5 (Eurocode 1) Compliant',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Thermal Analysis' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'EN 1991-1-5:2003' },
      ],
      inputs: [
        { label: 'Structure Type', value: formData.structure_type },
        { label: 'Deck Type', value: formData.deck_type },
        { label: 'Member Length', value: formData.member_length, unit: 'm' },
        { label: 'Material', value: formData.material },
        { label: 'Location', value: formData.location },
      ],
      sections: [
        {
          title: 'Thermal Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Uniform Temperature Change', ((results as any).delta_Tu ?? 0).toFixed(1), '\u00b0C'],
            ['Thermal Expansion', ((results as any).thermal_expansion ?? 0).toFixed(2), 'mm'],
            ['Thermal Force', ((results as any).thermal_force ?? 0).toFixed(1), 'kN'],
            ['Thermal Stress', ((results as any).thermal_stress ?? 0).toFixed(1), 'MPa'],
          ],
        },
      ],
      checks: [
        {
          name: 'Thermal Movement Check',
          capacity: 'Movement Joints Adequate',
          utilisation: `${((results as any).thermal_expansion ?? 0).toFixed(1)} mm`,
          status: 'PASS' as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Thermal Actions Analysis',
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
      <div className="flex items-center justify-between mb-2">
        <ExplainableLabel label={label} field={field} className="block text-sm font-semibold text-gray-300" />
        {unit && <span className="text-blue-400 text-xs">{unit}</span>}
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
          <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
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
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
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
                  <FiDownload className="mr-2" />
                  PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={handleExportDOCX}
                  className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton
                  calculatorKey="thermal-actions"
                  inputs={formData as unknown as Record<string, string | number>}
                  results={results}
                />
              )}
            </div>

            {/* View Tabs */}
            <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
              {[
                { id: 'input', label: 'Inputs', icon: <FiGrid /> },
                { id: 'results', label: 'Analysis', icon: <FiActivity />, disabled: !results },
                { id: 'visualization', label: 'Visualization', icon: <FiTarget />, disabled: !results },
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
              Thermal Actions
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            EN 1991-1-5 thermal loading analysis
          </p>
        </motion.div>

        {activeTab === 'input' && (
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Input Content */}
          <div className="lg:col-span-2 space-y-6">
                {/* Presets */}
                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
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
                          variant="glass"
                          size="sm"
                          onClick={() => applyPreset(key)}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Structure Type */}
                <CollapsibleSection
                  title="Structure Type"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiGrid className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="amber"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Structure Type</label>
                      <select
                        title="Structure Type"
                        value={formData.structure_type}
                        onChange={(e) => updateForm('structure_type', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(STRUCTURE_TYPES).map(([key, st]) => (
                          <option key={key} value={key}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {formData.structure_type === 'bridge' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Deck Type (EN 1991-1-5)
                          </label>
                          <select
                            title="Deck type"
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
                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">Surfacing</label>
                          <select
                            title="Surfacing"
                            value={formData.surfacing_thickness}
                            onChange={(e) => updateForm('surfacing_thickness', e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          >
                            {Object.entries(SURFACING_ADJUSTMENTS).map(([key, sa]) => (
                              <option key={key} value={key}>
                                {sa.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleSection>

                {/* Geometry */}
                <CollapsibleSection
                  title="Member Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="blue"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Member Length" field="member_length" unit="m" />
                    <InputField label="Section Depth" field="depth" unit="mm" />
                    <InputField label="Section Area" field="section_area" unit="mm²" />
                    <InputField
                      label="Moment of Inertia"
                      field="moment_of_inertia"
                      unit="mm⁴"
                      tooltip="e.g. 5.0e9"
                    />
                  </div>
                </CollapsibleSection>

                {/* Material */}
                <CollapsibleSection
                  title="Material Properties"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="emerald"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Material</label>
                      <select
                        title="Material"
                        value={formData.material}
                        onChange={(e) => updateForm('material', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(MATERIALS).map(([key, m]) => (
                          <option key={key} value={key}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {formData.material === 'custom' && (
                      <>
                        <InputField label="α (×10⁻⁶)" field="custom_alpha" unit="/°C" />
                        <InputField label="E" field="custom_E" unit="MPa" />
                      </>
                    )}
                  </div>
                  <div className="mt-3 p-3 bg-gray-900/50 rounded text-sm text-gray-400">
                    <strong>Material:</strong> {MATERIALS[formData.material]?.name || 'Custom'} — α
                    ={' '}
                    {(formData.material === 'custom'
                      ? parseFloat(formData.custom_alpha)
                      : MATERIALS[formData.material].alpha * 1e6
                    ).toFixed(0)}
                    ×10⁻⁶/°C, E ={' '}
                    {formData.material === 'custom'
                      ? formData.custom_E
                      : MATERIALS[formData.material].E}{' '}
                    MPa
                  </div>
                </CollapsibleSection>

                {/* Temperature */}
                <CollapsibleSection
                  title="Temperature Data"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiThermometer className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="purple"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">UK Location</label>
                      <select
                        title="UK Location"
                        value={formData.location}
                        onChange={(e) => updateForm('location', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="default">UK General</option>
                        <option value="london">London</option>
                        <option value="birmingham">Birmingham</option>
                        <option value="manchester">Manchester</option>
                        <option value="edinburgh">Edinburgh</option>
                        <option value="cardiff">Cardiff</option>
                        <option value="belfast">Belfast</option>
                      </select>
                    </div>
                    <InputField label="Initial Temp T₀" field="initial_temp" unit="°C" />
                    <InputField label="Max Shade Temp" field="T_max_shade" unit="°C" />
                    <InputField label="Min Shade Temp" field="T_min_shade" unit="°C" />
                  </div>
                </CollapsibleSection>

                {/* Restraint */}
                <CollapsibleSection
                  title="Restraint Conditions"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiSun className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="amber"
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Restraint Type</label>
                      <select
                        title="Restraint Type"
                        value={formData.restraint_type}
                        onChange={(e) => updateForm('restraint_type', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(RESTRAINT_TYPES).map(([key, rt]) => (
                          <option key={key} value={key}>
                            {rt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end text-sm text-gray-400 pb-2">
                      Restraint Factor: {RESTRAINT_TYPES[formData.restraint_type]?.factor || 0}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={() => {
                      runCalculation();
                      setActiveTab('results');
                    }}
                    disabled={isCalculating}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isCalculating ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ANALYSING...
                      </div>
                    ) : (
                      '▶ RUN FULL ANALYSIS'
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Right Column — Sticky Sidebar */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="sticky top-8 space-y-4"
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
                          <ThermalActions3D />
                        </Interactive3DDiagram>
                        <button
                          onClick={() => setPreviewMaximized(false)}
                          className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                          aria-label="Minimize preview"
                        >
                          <FiMinimize2 size={20} />
                        </button>
                        <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                          THERMAL ACTIONS — REAL-TIME PREVIEW
                        </div>
                      </div>
                      <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                          <FiSliders size={14} /> Live Parameters
                        </h3>
                        {[
                          { label: 'Member Length', field: 'member_length' as keyof FormData, min: 1, max: 200, step: 1, unit: 'm' },
                          { label: 'Surfacing', field: 'surfacing_thickness' as keyof FormData, min: 0, max: 200, step: 5, unit: 'mm' },
                          { label: 'Initial Temp', field: 'initial_temp' as keyof FormData, min: -10, max: 40, step: 1, unit: '°C' },
                          { label: 'Fixity Factor', field: 'fixity_factor' as keyof FormData, min: 0, max: 1, step: 0.05, unit: '' },
                          { label: 'Section Area', field: 'section_area' as keyof FormData, min: 1000, max: 100000, step: 500, unit: 'mm²' },
                          { label: 'Depth', field: 'depth' as keyof FormData, min: 100, max: 5000, step: 50, unit: 'mm' },
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
                            { label: 'Structure Type', value: formData.structure_type || '—' },
                            { label: 'Deck Type', value: formData.deck_type || '—' },
                            { label: 'Material', value: formData.material || '—' },
                            { label: 'Location', value: formData.location || '—' },
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
                                { label: 'Te,max', value: `${results.Te_max.toFixed(1)} °C` },
                                { label: 'Te,min', value: `${results.Te_min.toFixed(1)} °C` },
                                { label: 'Expansion', value: `${results.max_expansion.toFixed(1)} mm` },
                                { label: 'Contraction', value: `${results.max_contraction.toFixed(1)} mm` },
                                { label: 'Total Range', value: `${results.total_range.toFixed(1)} mm` },
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
                  title="Thermal Actions — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  onMaximize={() => setPreviewMaximized(true)}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <ThermalActions3D />
                    </Interactive3DDiagram>
                  )}
                />

                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                      <FiInfo className="text-blue-400" />
                      Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      • <strong>EN 1991-1-5:</strong> Thermal actions
                    </p>
                    <p>
                      • <strong>UK NA:</strong> UK shade air temps
                    </p>
                    <p>
                      • <strong>Table 6.1:</strong> Bridge deck types
                    </p>
                    <p>
                      • <strong>Table 6.2:</strong> Surfacing adjustments
                    </p>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
          </div>
        )}

        {/* Results Tab Content */}
        {activeTab === 'results' && results && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 space-y-8"
          >
            {/* Top Summary Check Cards — border-l-4 */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Temp Range', value: `${(results.Te_max - results.Te_min).toFixed(0)}°C`, icon: <FiThermometer />, pass: true },
                { label: 'Expansion', value: `+${results.max_expansion.toFixed(1)} mm`, icon: <FiSun />, pass: results.max_expansion < 80 },
                { label: 'Contraction', value: `-${results.max_contraction.toFixed(1)} mm`, icon: <FiTarget />, pass: results.max_contraction < 80 },
                { label: 'Total Range', value: `${results.total_range.toFixed(1)} mm`, icon: <FiLayers />, pass: results.total_range < 100 },
                { label: 'ΔTU Exp', value: `+${results.delta_TU_exp.toFixed(0)}°C`, icon: <FiZap />, pass: results.delta_TU_exp < 40 },
                { label: 'Rating', value: results.rating, icon: <FiActivity />, pass: results.total_range < 100 },
              ].map((item, i) => (
                <Card
                  key={i}
                  variant="glass"
                  className={cn(
                    'border-l-4',
                    item.pass ? 'border-l-green-500' : 'border-l-red-500',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">{item.icon}</div>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                          item.pass
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {item.pass ? 'OK' : 'CHECK'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                    <p className="text-2xl font-black text-white">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Results Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Uniform Temperature */}
                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiThermometer className="w-6 h-6 text-blue-400" />
                      </div>
                      <span>Uniform Temperature Component (ΔT<sub>U</sub>)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                        <div className="text-gray-400 text-xs">T<sub>e,max</sub></div>
                        <div className="text-xl font-bold text-red-400">+{results.Te_max.toFixed(0)}°C</div>
                      </div>
                      <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                        <div className="text-gray-400 text-xs">T<sub>e,min</sub></div>
                        <div className="text-xl font-bold text-blue-400">{results.Te_min.toFixed(0)}°C</div>
                      </div>
                      <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                        <div className="text-gray-400 text-xs">ΔT<sub>U,exp</sub></div>
                        <div className="text-xl font-bold text-red-400">+{results.delta_TU_exp.toFixed(0)}°C</div>
                      </div>
                      <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                        <div className="text-gray-400 text-xs">ΔT<sub>U,con</sub></div>
                        <div className="text-xl font-bold text-blue-400">-{results.delta_TU_con.toFixed(0)}°C</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Differential Temperature */}
                {formData.structure_type === 'bridge' && (
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiActivity className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Differential Temperature (ΔT<sub>M</sub>)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Heating (top warmer)</div>
                          <div className="text-xl font-bold text-red-400">+{results.delta_TM_heat.toFixed(0)}°C</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Cooling (top cooler)</div>
                          <div className="text-xl font-bold text-blue-400">+{results.delta_TM_cool.toFixed(0)}°C</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Curvature (heat)</div>
                          <div className="text-lg font-bold text-white">{(results.curvature_heat * 1000).toFixed(3)}/km</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Curvature (cool)</div>
                          <div className="text-lg font-bold text-white">{(results.curvature_cool * 1000).toFixed(3)}/km</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Movement */}
                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiLayers className="w-6 h-6 text-blue-400" />
                      </div>
                      <span>Free Thermal Movement</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                        <div className="text-gray-400 text-xs">Max Expansion</div>
                        <div className="text-xl font-bold text-red-400">+{results.max_expansion.toFixed(1)} mm</div>
                      </div>
                      <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                        <div className="text-gray-400 text-xs">Max Contraction</div>
                        <div className="text-xl font-bold text-blue-400">-{results.max_contraction.toFixed(1)} mm</div>
                      </div>
                      <div
                        className="p-3 bg-gray-950/50 rounded-xl text-center border-2"
                        style={{ borderColor: results.ratingColor }}
                      >
                        <div className="text-gray-400 text-xs">Total Range</div>
                        <div className="text-xl font-bold" style={{ color: results.ratingColor }}>
                          {results.total_range.toFixed(1)} mm
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Restrained Forces */}
                {formData.restraint_type !== 'free' && (
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiZap className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Restrained Thermal Effects</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Axial (Expansion)</div>
                          <div className="text-lg font-bold text-red-400">{results.axial_force_exp.toFixed(0)} kN</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Axial (Contraction)</div>
                          <div className="text-lg font-bold text-blue-400">{results.axial_force_con.toFixed(0)} kN</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Stress (Exp)</div>
                          <div className="text-lg font-bold text-white">{results.thermal_stress_exp.toFixed(1)} MPa</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">Stress (Con)</div>
                          <div className="text-lg font-bold text-white">{results.thermal_stress_con.toFixed(1)} MPa</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column — Sticky */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-4">
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                    <CardContent className="py-6 text-center">
                      <div className="text-4xl mb-2 text-blue-400">
                        <FiThermometer className="inline" />
                      </div>
                      <div className="font-bold text-lg" style={{ color: results.ratingColor }}>
                        {results.rating}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        Movement Range: {results.total_range.toFixed(0)} mm
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
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiCheckCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        Design Recommendations
                      </h3>
                      <div className="space-y-3">
                        {[
                          'Provide movement joints at intervals not exceeding 60m for concrete structures',
                          'Account for locked-in stresses if construction occurs during extreme temperatures',
                          'Consider differential temperature effects between internal and external members',
                          'Verify bearing capacity and movement range accommodates full thermal range',
                        ].map((rec, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <FiCheck className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white font-semibold">Design Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Structure</span>
                        <span className="text-white">
                          {(STRUCTURE_TYPES as Record<string, any>)[formData.structure_type]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Material</span>
                        <span className="text-white">{MATERIALS[formData.material]?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Member Length</span>
                        <span className="text-white">{formData.member_length} m</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Restraint</span>
                        <span className="text-white">
                          {RESTRAINT_TYPES[formData.restraint_type]?.name}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Visualization Tab */}
        {activeTab === 'visualization' && results && (
          <motion.div
            key="visualization"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="mt-8 space-y-4"
          >
            <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiTarget className="w-6 h-6 text-blue-400" />
                  </div>
                  <span>Temperature Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                  <ThermalActions3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      </div>
  );
};

export default ThermalActions;
