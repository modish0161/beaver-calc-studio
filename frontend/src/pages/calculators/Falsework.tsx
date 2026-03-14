// =============================================================================
// Falsework Design Calculator — Premium Edition
// BS 5975 Temporary Works — Scaffolding & Propping Systems
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
    FiInfo,
    FiLayers,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTarget,
    FiX,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildFalseworkReport } from '../../lib/pdf/builders/falseworkBuilder';
import { cn } from '../../lib/utils';

import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import Falsework3D from '../../components/3d/scenes/Falsework3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { STEEL_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // System Geometry
  span: string;
  bay_width: string;
  tier_count: string;
  post_height: string;
  system_type: string;
  // Loading
  dead_load: string;
  live_load: string;
  wind_load: string;
  concrete_thickness: string;
  formwork_weight: string;
  // Materials
  post_section: string;
  steel_grade: string;
  // Foundation
  foundation_type: string;
  ground_condition: string;
  base_plate_size: string;
  // Bracing
  bracing_type: string;
  bracing_spacing: string;
  // Safety Factors
  sf_bearing: string;
  sf_buckling: string;
  dynamic_factor: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Loading Summary
  total_load_per_prop: number;
  total_uls_load: number;
  // Post Checks
  post_area: number;
  post_radius: number;
  post_slenderness: number;
  euler_load: number;
  buckling_factor: number;
  design_resistance: number;
  post_util: number;
  post_status: string;
  // Foundation Checks
  base_area: number;
  bearing_pressure: number;
  allowable_bearing: number;
  bearing_util: number;
  bearing_status: string;
  // Bracing Checks
  bracing_required: boolean;
  horizontal_force: number;
  bracing_capacity: number;
  bracing_status: string;
  // Overall
  num_posts: number;
  effective_length: number;
  critical_check: string;
  status: string;
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const SYSTEM_TYPES = {
  tube_fitting: { name: 'Tube & Fitting', k_factor: 1.0, description: 'Traditional scaffolding' },
  system_scaffold: { name: 'System Scaffold', k_factor: 0.85, description: 'Proprietary system' },
  shoring_tower: { name: 'Shoring Tower', k_factor: 0.7, description: 'Heavy duty towers' },
  props: { name: 'Adjustable Props', k_factor: 1.0, description: 'Standard steel props' },
  modular: { name: 'Modular System', k_factor: 0.8, description: 'Pre-engineered units' },
};

const POST_SECTIONS = {
  'CHS_48.3x3.2': { name: 'CHS 48.3×3.2', A: 454, I: 120000, r: 16.3, fy: 275 },
  'CHS_60.3x3.2': { name: 'CHS 60.3×3.2', A: 574, I: 240000, r: 20.5, fy: 275 },
  'CHS_76.1x3.6': { name: 'CHS 76.1×3.6', A: 820, I: 560000, r: 26.1, fy: 275 },
  'CHS_101.6x3.6': { name: 'CHS 101.6×3.6', A: 1110, I: 1350000, r: 34.9, fy: 275 },
  'CHS_114.3x4.0': { name: 'CHS 114.3×4.0', A: 1390, I: 2140000, r: 39.2, fy: 275 },
  'CHS_139.7x4.0': { name: 'CHS 139.7×4.0', A: 1710, I: 4010000, r: 48.4, fy: 275 },
  'CHS_168.3x4.5': { name: 'CHS 168.3×4.5', A: 2320, I: 7450000, r: 56.7, fy: 275 },
  'CHS_193.7x5.0': { name: 'CHS 193.7×5.0', A: 2960, I: 12600000, r: 65.2, fy: 275 },
};

const FOUNDATION_TYPES = {
  timber_sole: { name: 'Timber Sole Plate', factor: 0.6, description: '200×50mm softwood' },
  steel_base: { name: 'Steel Base Plate', factor: 1.0, description: '200×200×10mm' },
  spread_pad: { name: 'Spread Pad Footing', factor: 1.2, description: 'Concrete pad' },
  ground_bearing: { name: 'Direct on Ground', factor: 0.5, description: 'Compacted only' },
  existing_slab: { name: 'Existing Concrete Slab', factor: 1.5, description: 'Min 150mm thick' },
};

const GROUND_CONDITIONS = {
  soft_clay: { name: 'Soft Clay', bearing: 50, description: 'Cu < 25 kPa' },
  firm_clay: { name: 'Firm Clay', bearing: 100, description: 'Cu 25-50 kPa' },
  stiff_clay: { name: 'Stiff Clay', bearing: 150, description: 'Cu 50-100 kPa' },
  loose_sand: { name: 'Loose Sand', bearing: 100, description: 'N < 10' },
  medium_sand: { name: 'Medium Dense Sand', bearing: 200, description: 'N 10-30' },
  dense_sand: { name: 'Dense Sand/Gravel', bearing: 300, description: 'N > 30' },
  hardcore: { name: 'Compacted Hardcore', bearing: 250, description: 'Min 300mm thick' },
  concrete: { name: 'Concrete Slab', bearing: 500, description: 'Min 150mm thick' },
};

const BRACING_TYPES = {
  none: { name: 'No Bracing', capacity: 0, description: 'Freestanding' },
  ledger: { name: 'Ledger Bracing', capacity: 5, description: 'Horizontal ties' },
  diagonal: { name: 'Diagonal Bracing', capacity: 15, description: 'Cross bracing' },
  plan_bracing: { name: 'Plan Bracing', capacity: 10, description: 'In-plane ties' },
  full_bracing: { name: 'Full Bracing System', capacity: 25, description: 'All directions' },
};

const PRESETS = {
  slab_formwork: {
    name: 'Slab Formwork',
    system_type: 'props',
    span: '3.0',
    bay_width: '1.5',
    post_height: '3.5',
    concrete_thickness: '250',
    post_section: 'CHS_76.1x3.6',
  },
  bridge_falsework: {
    name: 'Bridge Falsework',
    system_type: 'shoring_tower',
    span: '6.0',
    bay_width: '3.0',
    post_height: '8.0',
    concrete_thickness: '500',
    post_section: 'CHS_139.7x4.0',
  },
  facade_scaffold: {
    name: 'Façade Scaffold',
    system_type: 'tube_fitting',
    span: '2.4',
    bay_width: '1.8',
    post_height: '2.0',
    concrete_thickness: '0',
    post_section: 'CHS_48.3x3.2',
    tier_count: '10',
  },
  heavy_propping: {
    name: 'Heavy Propping',
    system_type: 'modular',
    span: '4.0',
    bay_width: '2.0',
    post_height: '5.0',
    concrete_thickness: '400',
    post_section: 'CHS_168.3x4.5',
  },
};

const Falsework = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    base_plate_size: '',
    bay_width: '',
    bracing_spacing: '',
    bracing_type: '',
    concrete_thickness: '',
    dead_load: '',
    dynamic_factor: '',
    formwork_weight: '',
    foundation_type: '',
    ground_condition: '',
    live_load: '',
    post_height: '',
    post_section: '',
    projectName: '',
    reference: '',
    sf_bearing: '',
    sf_buckling: '',
    span: '',
    steel_grade: '',
    system_type: '',
    tier_count: '',
    wind_load: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'base_plate_size', label: 'Base Plate Size' },
  { key: 'bay_width', label: 'Bay Width' },
  { key: 'bracing_spacing', label: 'Bracing Spacing' },
  { key: 'bracing_type', label: 'Bracing Type' },
  { key: 'concrete_thickness', label: 'Concrete Thickness' },
  { key: 'dead_load', label: 'Dead Load' },
  { key: 'dynamic_factor', label: 'Dynamic Factor' },
  { key: 'formwork_weight', label: 'Formwork Weight' },
  { key: 'foundation_type', label: 'Foundation Type' },
  { key: 'ground_condition', label: 'Ground Condition' },
  { key: 'live_load', label: 'Live Load' },
  { key: 'post_height', label: 'Post Height' },
  { key: 'post_section', label: 'Post Section' },
  { key: 'sf_bearing', label: 'Sf Bearing' },
  { key: 'sf_buckling', label: 'Sf Buckling' },
  { key: 'span', label: 'Span' },
  { key: 'system_type', label: 'System Type' },
  { key: 'tier_count', label: 'Tier Count' },
  { key: 'wind_load', label: 'Wind Load' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'span', label: 'Span', min: 0, max: 100, step: 1, unit: '' },
    { key: 'bay_width', label: 'Bay_width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'tier_count', label: 'Tier_count', min: 0, max: 100, step: 1, unit: '' },
    { key: 'post_height', label: 'Post_height', min: 0, max: 100, step: 1, unit: '' }
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
        const span = parseFloat(formData.span) || 3.0;
        const bayW = parseFloat(formData.bay_width) || 1.5;
        const postH = parseFloat(formData.post_height) || 3.5;
        const tiers = parseInt(formData.tier_count) || 1;
        const concThk = parseFloat(formData.concrete_thickness) || 250;
        const gk_extra = parseFloat(formData.dead_load) || 0;
        const qk = parseFloat(formData.live_load) || 0.75;
        const wk = parseFloat(formData.wind_load) || 0;
        const fwkWeight = parseFloat(formData.formwork_weight) || 0.5;
        const dynamicF = parseFloat(formData.dynamic_factor) || 1.1;

        // System
        const sysKey = formData.system_type || 'props';
        const system = (SYSTEM_TYPES as any)[sysKey] || SYSTEM_TYPES.props;

        // Post section
        const postKey = formData.post_section || 'CHS_76.1x3.2';
        const post = (POST_SECTIONS as any)[postKey] || POST_SECTIONS['CHS_76.1x3.6'];

        // Steel grade
        const gradeKey = formData.steel_grade || 'S275';
        const grade = (STEEL_GRADES as any)[gradeKey] || STEEL_GRADES.S275;
        const fy = grade.fy;

        // Foundation
        const foundKey = formData.foundation_type || 'steel_base';
        const foundation = (FOUNDATION_TYPES as any)[foundKey] || FOUNDATION_TYPES.steel_base;
        const groundKey = formData.ground_condition || 'medium_sand';
        const ground = (GROUND_CONDITIONS as any)[groundKey] || GROUND_CONDITIONS.medium_sand;
        const basePlate = parseFloat(formData.base_plate_size) || 200;

        // Bracing
        const bracingKey = formData.bracing_type || 'diagonal';
        const bracing = (BRACING_TYPES as any)[bracingKey] || BRACING_TYPES.diagonal;

        // Tributary area per post
        const tribArea = span * bayW;

        // Loading per m² (kN/m²)
        const concreteSW = (concThk / 1000) * 25; // concrete self-weight
        const totalDead = concreteSW + fwkWeight + gk_extra;
        const totalCharacteristic = totalDead + qk;
        const totalULS = (1.35 * totalDead + 1.5 * qk) * dynamicF;

        // Load per post
        const loadPerPost = totalCharacteristic * tribArea;
        const ulsPerPost = totalULS * tribArea;

        // Number of posts
        const numPosts = Math.ceil((span / bayW + 1) * 2);

        // Effective length (BS 5975)
        const Le = postH * tiers * system.k_factor * 1000; // mm

        // Slenderness
        const lambda = Le / post.r;

        // Euler buckling load
        const E = 205000; // N/mm²
        const Ncr = (Math.PI * Math.PI * E * post.I) / (Le * Le); // N
        const NcrKN = Ncr / 1000;

        // Buckling reduction factor (Perry-Robertson simplified)
        const lambda1 = Math.PI * Math.sqrt(E / fy);
        const lambdaBar = lambda / lambda1;
        const alpha = 0.49; // buckling curve 'c' for CHS
        const phiB = 0.5 * (1 + alpha * (lambdaBar - 0.2) + lambdaBar * lambdaBar);
        const chi = Math.min(1.0, 1.0 / (phiB + Math.sqrt(phiB * phiB - lambdaBar * lambdaBar)));

        // Design resistance
        const NbRd = (chi * post.A * fy) / (1.0 * 1000); // kN (γM1 = 1.0 for temp works)
        const sfBuckling = parseFloat(formData.sf_buckling) || 1.0;
        const designCap = NbRd / sfBuckling;
        const postUtil = ulsPerPost / designCap;
        const postStatus = postUtil <= 1.0 ? 'PASS' : 'FAIL';

        if (postStatus === 'FAIL')
          newWarnings.push('Post buckling check fails — increase section size or reduce height');
        if (lambda > 180)
          newWarnings.push('Slenderness ratio > 180 — section too slender for temp works');

        // Foundation / bearing check
        const baseArea = (basePlate / 1000) * (basePlate / 1000); // m²
        const bearingPressure = ulsPerPost / (baseArea * foundation.factor);
        const allowBearing = ground.bearing;
        const sfBearing = parseFloat(formData.sf_bearing) || 1.0;
        const bearingUtil = bearingPressure / (allowBearing / sfBearing);
        const bearingStatus = bearingUtil <= 1.0 ? 'PASS' : 'FAIL';

        if (bearingStatus === 'FAIL')
          newWarnings.push('Ground bearing exceeded — enlarge base or improve ground');

        // Bracing check
        const horizForce = (wk > 0 ? wk : totalULS * 0.025) * tribArea; // 2.5% notional lateral
        const bracingReq = horizForce > 0;
        const bracingCap = bracing.capacity;
        const bracingStatus =
          bracingCap >= horizForce ? 'PASS' : bracingKey === 'none' ? 'FAIL' : 'MARGINAL';

        if (bracingKey === 'none' && postH > 3)
          newWarnings.push('Bracing recommended for heights > 3m');

        // Overall rating
        const maxUtil = Math.max(postUtil, bearingUtil);
        let rating = 'CRITICAL';
        let ratingColor = '#ef4444';
        const overallPass = postStatus === 'PASS' && bearingStatus === 'PASS';
        if (overallPass) {
          if (maxUtil <= 0.5) {
            rating = 'EXCELLENT';
            ratingColor = '#22c55e';
          } else if (maxUtil <= 0.75) {
            rating = 'GOOD';
            ratingColor = '#10b981';
          } else if (maxUtil <= 0.9) {
            rating = 'ADEQUATE';
            ratingColor = '#f59e0b';
          } else {
            rating = 'MARGINAL';
            ratingColor = '#f97316';
          }
        }

        setResults({
          total_load_per_prop: loadPerPost,
          total_uls_load: ulsPerPost,
          post_area: post.A,
          post_radius: post.r,
          post_slenderness: lambda,
          euler_load: NcrKN,
          buckling_factor: chi,
          design_resistance: designCap,
          post_util: postUtil,
          post_status: postStatus,
          base_area: baseArea,
          bearing_pressure: bearingPressure,
          allowable_bearing: allowBearing,
          bearing_util: bearingUtil,
          bearing_status: bearingStatus,
          bracing_required: bracingReq,
          horizontal_force: horizForce,
          bracing_capacity: bracingCap,
          bracing_status: bracingStatus,
          num_posts: numPosts,
          effective_length: Le,
          critical_check: postUtil > bearingUtil ? 'Buckling' : 'Bearing',
          status: overallPass ? 'PASS' : 'FAIL',
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
    const report = buildFalseworkReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  // DOCX Export — Editable Word document
  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Falsework Design',
      subtitle: 'BS 5975 Compliant',
      projectInfo: [
        { label: 'Project', value: (formData as any).projectName || '-' },
        { label: 'Reference', value: (formData as any).reference || '-' },
      ],
      inputs: [
        { label: 'Height', value: (formData as any).height || '0', unit: 'm' },
        { label: 'Span', value: (formData as any).span || '0', unit: 'm' },
        { label: 'Load', value: (formData as any).load || '0', unit: 'kN/m²' },
        { label: 'Prop Type', value: (formData as any).propType || '-', unit: '' },
      ],
      checks: [
        {
          name: 'Prop Capacity',
          capacity: `${(results as any).prop_capacity?.toFixed(1) || '-'} kN`,
          utilisation: `${(results as any).prop_utilisation?.toFixed(1) || '-'}%`,
          status: ((results as any).prop_check || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Buckling',
          capacity: `${(results as any).buckling_capacity?.toFixed(1) || '-'} kN`,
          utilisation: `${(results as any).buckling_utilisation?.toFixed(1) || '-'}%`,
          status: ((results as any).buckling_check || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `${(results as any).deflection_limit?.toFixed(1) || '-'} mm`,
          utilisation: `${(results as any).deflection_utilisation?.toFixed(1) || '-'}%`,
          status: ((results as any).deflection_check || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Overall',
          suggestion:
            (results as any).overall_status === 'PASS'
              ? 'Design adequate per BS 5975'
              : 'Revise prop spacing or selection',
        },
      ],
      warnings: [],
      footerNote: 'Beaver Bridges Ltd — Falsework Design',
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
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
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

  const UtilisationBar: React.FC<{ label: string; value: number; status: string }> = ({
    label,
    value,
    status,
  }) => {
    const percent = Math.min(value * 100, 100);
    const color = value <= 0.7 ? 'bg-emerald-500' : value <= 1.0 ? 'bg-amber-500' : 'bg-red-500';

    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">{label}</span>
          <span className={cn('font-medium', status === 'PASS' ? 'text-white' : 'text-red-400')}>
            {(value * 100).toFixed(1)}% — {status}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={cn('h-full transition-all', color)} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

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
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {results && (
              <>
                <Button
                  onClick={handleExportPDF}
                  variant="glass"
                  className="border-neon-cyan/30 text-neon-cyan"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </Button>
                <Button
                  onClick={handleExportDOCX}
                  variant="glass"
                  className="border-purple-500/30 text-purple-400"
                >
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
                <SaveRunButton
                  calculatorKey="falsework"
                  inputs={formData as unknown as Record<string, string>}
                  results={results}
                  status={(results as any)?.overall_status}
                  summary={
                    results
                      ? `${(results as any).max_utilisation?.toFixed(1) || '-'}% util`
                      : undefined
                  }
                />
              </>
            )}
          </div>
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Falsework Design
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BS 5975 falsework posts &amp; ledgers design
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800 mb-6 w-fit mx-auto">
          {[
            { id: 'input', label: 'Design Input', icon: <FiSettings /> },
            { id: 'results', label: 'Results', icon: <FiActivity />, disabled: !results },
            { id: 'visualization', label: 'Visualization', icon: <FiGrid />, disabled: !results },
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
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiZap className="w-6 h-6 text-neon-cyan" />
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
                          className="border-gray-600 hover:border-neon-cyan hover:text-neon-cyan"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Geometry */}
                <CollapsibleSection
                  title="System Geometry"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                      <FiGrid className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  variant="amber"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-200 mb-1">System Type</label>
                      <select
                        title="System Type"
                        value={formData.system_type}
                        onChange={(e) => updateForm('system_type', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(SYSTEM_TYPES).map(([key, st]) => (
                          <option key={key} value={key}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Span" field="span" unit="m" />
                    <InputField label="Bay Width" field="bay_width" unit="m" />
                    <InputField label="Post Height" field="post_height" unit="m" />
                    <InputField label="Tiers" field="tier_count" />
                  </div>
                </CollapsibleSection>

                {/* Loading */}
                <CollapsibleSection
                  title="Loading"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  variant="blue"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Concrete Thickness" field="concrete_thickness" unit="mm" />
                    <InputField
                      label="Dead Load"
                      field="dead_load"
                      unit="kN/m²"
                      tooltip="Excl. concrete"
                    />
                    <InputField label="Live Load" field="live_load" unit="kN/m²" />
                    <InputField label="Wind Load" field="wind_load" unit="kN/m²" />
                    <InputField label="Formwork Weight" field="formwork_weight" unit="kN/m²" />
                    <InputField
                      label="Dynamic Factor"
                      field="dynamic_factor"
                      tooltip="Typically 1.1"
                    />
                  </div>
                </CollapsibleSection>

                {/* Materials */}
                <CollapsibleSection
                  title="Post & Materials"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  variant="emerald"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Post Section</label>
                      <select
                        title="Post Section"
                        value={formData.post_section}
                        onChange={(e) => updateForm('post_section', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(POST_SECTIONS).map(([key, ps]) => (
                          <option key={key} value={key}>
                            {ps.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Steel Grade</label>
                      <select
                        title="Steel Grade"
                        value={formData.steel_grade}
                        onChange={(e) => updateForm('steel_grade', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(STEEL_GRADES).map(([key, sg]) => (
                          <option key={key} value={key}>
                            {sg.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Base Plate Size" field="base_plate_size" unit="mm" />
                  </div>
                </CollapsibleSection>

                {/* Foundation */}
                <CollapsibleSection
                  title="Foundation & Bracing"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  variant="purple"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Foundation Type</label>
                      <select
                        title="Foundation Type"
                        value={formData.foundation_type}
                        onChange={(e) => updateForm('foundation_type', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(FOUNDATION_TYPES).map(([key, ft]) => (
                          <option key={key} value={key}>
                            {ft.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Ground Condition</label>
                      <select
                        title="Ground condition"
                        value={formData.ground_condition}
                        onChange={(e) => updateForm('ground_condition', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(GROUND_CONDITIONS).map(([key, gc]) => (
                          <option key={key} value={key}>
                            {gc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Bracing Type</label>
                      <select
                        title="Bracing Type"
                        value={formData.bracing_type}
                        onChange={(e) => updateForm('bracing_type', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                      >
                        {Object.entries(BRACING_TYPES).map(([key, bt]) => (
                          <option key={key} value={key}>
                            {bt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Bracing Spacing" field="bracing_spacing" unit="m" />
                  </div>
                </CollapsibleSection>

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
                        <Falsework3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        FALSEWORK — REAL-TIME PREVIEW
                      </div>
                    </div>

                    {/* Right sidebar — live parameters & stats */}
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>

                      {[
                        { label: 'Span', field: 'span' as keyof FormData, min: 1, max: 20, step: 0.5, unit: 'm' },
                        { label: 'Bay Width', field: 'bay_width' as keyof FormData, min: 0.5, max: 5, step: 0.1, unit: 'm' },
                        { label: 'Post Height', field: 'post_height' as keyof FormData, min: 1, max: 10, step: 0.5, unit: 'm' },
                        { label: 'Tier Count', field: 'tier_count' as keyof FormData, min: 1, max: 5, step: 1, unit: '' },
                        { label: 'Dead Load', field: 'dead_load' as keyof FormData, min: 0, max: 50, step: 0.5, unit: 'kN/m²' },
                        { label: 'Live Load', field: 'live_load' as keyof FormData, min: 0, max: 30, step: 0.5, unit: 'kN/m²' },
                        { label: 'Wind Load', field: 'wind_load' as keyof FormData, min: 0, max: 5, step: 0.1, unit: 'kN/m²' },
                        { label: 'Concrete Thk', field: 'concrete_thickness' as keyof FormData, min: 100, max: 600, step: 25, unit: 'mm' },
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
                          { label: 'System Type', value: formData.system_type || '—' },
                          { label: 'Steel Grade', value: formData.steel_grade || '—' },
                          { label: 'Post Section', value: formData.post_section || '—' },
                          { label: 'Foundation', value: formData.foundation_type || '—' },
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
                              { label: 'Post Check', util: results.post_util?.toFixed(0), status: results.post_status },
                              { label: 'Bearing', util: results.bearing_util?.toFixed(0), status: results.bearing_status },
                              { label: 'Bracing', util: null, status: results.bracing_status },
                              { label: 'Overall', util: null, status: results.status },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : 'text-emerald-400')}>
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
                  title="Falsework — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <Falsework3D />
                    </Interactive3DDiagram>
                  )}
                />

                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-neon-cyan" />
                      </motion.div>
                      <span>BS 5975 Reference</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      • <strong>BS 5975:</strong> Temporary works procedures
                    </p>
                    <p>
                      • <strong>EN 1993-1-1:</strong> Steel buckling design
                    </p>
                    <p>
                      • <strong>Slenderness limit:</strong> λ ≤ 180
                    </p>
                    <p>
                      • <strong>Bracing:</strong> Required if H &gt; 4m
                    </p>
                    <p className="pt-2 text-neon-cyan">
                      Temporary Works Coordinator review required
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
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Post Buckling', status: results.post_status, util: results.post_util },
                      { label: 'Foundation Bearing', status: results.bearing_status, util: results.bearing_util },
                      { label: 'Bracing', status: results.bracing_status, util: 0 },
                    ].map((item, i) => (
                      <Card
                        key={i}
                        variant="glass"
                        className={cn(
                          'border-l-4',
                          item.status === 'PASS'
                            ? 'border-l-green-500'
                            : 'border-l-red-500',
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">
                              {item.status === 'PASS' ? <FiCheck /> : <FiAlertTriangle />}
                            </div>
                            <span
                              className={cn(
                                'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                                item.status === 'PASS'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400',
                              )}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                          <p className="text-2xl font-black text-white">
                            {item.util ? `${(item.util * 100).toFixed(1)}%` : item.status}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Loading Summary */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <FiLayers className="text-neon-cyan" />
                        Loading Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-900/50 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">Posts Required</div>
                          <div className="text-2xl font-bold text-white">{results.num_posts}</div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">Load per Post (SLS)</div>
                          <div className="text-xl font-bold text-white">
                            {results.total_load_per_prop.toFixed(1)} kN
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">ULS Load</div>
                          <div className="text-xl font-bold text-amber-400">
                            {results.total_uls_load.toFixed(1)} kN
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">Effective Length</div>
                          <div className="text-xl font-bold text-white">
                            {results.effective_length.toFixed(2)} m
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Post Buckling Check */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <FiTarget className="text-neon-cyan" />
                        Post Buckling Check (EN 1993-1-1)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Slenderness λ</div>
                          <div className="text-lg font-bold text-white">
                            {results.post_slenderness.toFixed(0)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Buckling Factor χ</div>
                          <div className="text-lg font-bold text-white">
                            {results.buckling_factor.toFixed(3)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Euler Load</div>
                          <div className="text-lg font-bold text-white">
                            {results.euler_load.toFixed(0)} kN
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Design Resistance</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {results.design_resistance.toFixed(0)} kN
                          </div>
                        </div>
                      </div>
                      <UtilisationBar
                        label="Post Utilisation"
                        value={results.post_util}
                        status={results.post_status}
                      />
                    </CardContent>
                  </Card>

                  {/* Foundation Check */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <FiLayers className="text-neon-cyan" />
                        Foundation Bearing Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Base Area</div>
                          <div className="text-lg font-bold text-white">
                            {(results.base_area * 10000).toFixed(0)} cm²
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Bearing Pressure</div>
                          <div className="text-lg font-bold text-amber-400">
                            {results.bearing_pressure.toFixed(0)} kPa
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Allowable</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {results.allowable_bearing.toFixed(0)} kPa
                          </div>
                        </div>
                      </div>
                      <UtilisationBar
                        label="Bearing Utilisation"
                        value={results.bearing_util}
                        status={results.bearing_status}
                      />
                    </CardContent>
                  </Card>

                  {/* Bracing Check */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white">Bracing Check</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Horizontal Force</div>
                          <div className="text-lg font-bold text-white">
                            {results.horizontal_force.toFixed(1)} kN
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-gray-400 text-xs">Bracing Capacity</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {results.bracing_capacity.toFixed(0)} kN
                          </div>
                        </div>
                        <div
                          className={cn(
                            'p-3 rounded-lg text-center',
                            results.bracing_status === 'PASS'
                              ? 'bg-emerald-500/20'
                              : 'bg-red-500/20',
                          )}
                        >
                          <div className="text-xs text-gray-400">Status</div>
                          <div
                            className={cn(
                              'text-lg font-bold',
                              results.bracing_status === 'PASS'
                                ? 'text-emerald-400'
                                : 'text-red-400',
                            )}
                          >
                            {results.bracing_status}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="sticky top-32 space-y-4">
                  {/* Status */}
                  <Card
                    className={cn(
                      'border-2 shadow-lg',
                      results.status === 'PASS'
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/10'
                        : 'bg-red-500/10 border-red-500/30 shadow-red-500/10',
                    )}
                  >
                    <CardContent className="py-6 text-center">
                      <div
                        className={cn(
                          'text-4xl mb-2',
                          results.status === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results.status === 'PASS' ? (
                          <FiCheck className="inline" />
                        ) : (
                          <FiX className="inline" />
                        )}
                      </div>
                      <div className="font-bold text-lg" style={{ color: results.ratingColor }}>
                        {results.rating}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        Critical: {results.critical_check}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card className="bg-cyan-500/10 border-cyan-500/30">
                    <CardContent className="py-4">
                      <h4 className="text-cyan-400 font-semibold text-sm mb-3 flex items-center gap-2">
                        <FiCheck className="w-4 h-4" /> Recommendations
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-cyan-400 mt-1 flex-shrink-0" />
                          <span>
                            Install sole plates under all base jacks on compressible ground
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-cyan-400 mt-1 flex-shrink-0" />
                          <span>Ensure bracing connections are fully tightened before loading</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-cyan-400 mt-1 flex-shrink-0" />
                          <span>
                            Check vertical alignment of posts at each lift during erection
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-3 h-3 text-cyan-400 mt-1 flex-shrink-0" />
                          <span>Monitor for settlement and lateral displacement during pour</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <Card className="bg-amber-500/10 border-amber-500/30">
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

                  {/* Summary */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white">Design Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">System Type</span>
                        <span className="text-white">
                          {SYSTEM_TYPES[formData.system_type as keyof typeof SYSTEM_TYPES]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Post Section</span>
                        <span className="text-white">
                          {POST_SECTIONS[formData.post_section as keyof typeof POST_SECTIONS]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Height</span>
                        <span className="text-white">
                          {(
                            parseFloat(formData.post_height) * parseInt(formData.tier_count)
                          ).toFixed(1)}{' '}
                          m
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Ground</span>
                        <span className="text-white">
                          {
                            GROUND_CONDITIONS[
                              formData.ground_condition as keyof typeof GROUND_CONDITIONS
                            ]?.name
                          }
                        </span>
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
                <CardTitle className="text-2xl text-white">Falsework Assembly</CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                  <Falsework3D />
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

export default Falsework;
