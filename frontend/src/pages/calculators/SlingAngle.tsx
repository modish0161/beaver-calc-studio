// =============================================================================
// Sling Angle Calculator — Premium Edition
// BS EN 1492 / LEEA Guidance — Sling Capacity & Angle Analysis
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
    FiLink,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTarget,
    FiTriangle,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SlingAngle3D from '../../components/3d/scenes/SlingAngle3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Load
  load_weight: string;
  load_unit: string;
  dynamic_factor: string;
  // Sling Configuration
  num_legs: string;
  sling_length: string;
  sling_type: string;
  sling_wll: string;
  // Geometry
  spread_x: string;
  spread_y: string;
  hook_height: string;
  cog_below_hook: string;
  // Safety
  design_safety_factor: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Geometry
  sling_angle_from_vertical: number;
  sling_angle_from_horizontal: number;
  actual_sling_length_required: number;
  // Factors
  mode_factor: number;
  angle_reduction_factor: number;
  // Load Distribution
  total_factored_load: number;
  load_per_sling: number;
  tension_per_sling: number;
  horizontal_force_per_sling: number;
  // Capacity
  sling_capacity_at_angle: number;
  min_sling_wll_required: number;
  // Utilisation
  utilisation: number;
  safety_factor_actual: number;
  // Status
  status: string;
  rating: string;
  ratingColor: string;
  warnings: string[];
}

// =============================================================================
// REFERENCE DATA — BS EN 1492 / LEEA
// =============================================================================

const SLING_TYPES: Record<string, { name: string; safety_factor: number; description: string }> = {
  chain_g80: { name: 'Grade 80 Chain', safety_factor: 4, description: 'Alloy steel chain' },
  chain_g100: { name: 'Grade 100 Chain', safety_factor: 4, description: 'High-strength chain' },
  wire_rope: { name: 'Wire Rope (6x36)', safety_factor: 5, description: 'Steel wire rope' },
  webbing: { name: 'Webbing Sling', safety_factor: 7, description: 'Polyester webbing' },
  round_sling: { name: 'Round Sling', safety_factor: 7, description: 'Polyester core' },
};

const NUM_LEGS_CONFIG: Record<
  string,
  { name: string; mode_factor_60: number; mode_factor_45: number; description: string }
> = {
  '1': {
    name: 'Single Leg (Vertical)',
    mode_factor_60: 1.0,
    mode_factor_45: 1.0,
    description: 'Straight vertical lift',
  },
  '2': {
    name: '2-Leg Bridle',
    mode_factor_60: 1.73,
    mode_factor_45: 1.41,
    description: 'Two-point lift',
  },
  '3': {
    name: '3-Leg Bridle',
    mode_factor_60: 2.0,
    mode_factor_45: 1.73,
    description: 'Three-point lift',
  },
  '4': {
    name: '4-Leg Bridle',
    mode_factor_60: 2.12,
    mode_factor_45: 1.73,
    description: 'Four-point (3 assumed active)',
  },
};

const LOAD_UNITS: Record<string, { name: string; to_kn: number }> = {
  kN: { name: 'kN', to_kn: 1 },
  tonnes: { name: 'Tonnes', to_kn: 9.81 },
  kg: { name: 'kg', to_kn: 0.00981 },
  lbs: { name: 'lbs', to_kn: 0.00445 },
};

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  light_2leg: {
    name: 'Light 2-Leg (1t)',
    form: {
      load_weight: '10',
      load_unit: 'kN',
      num_legs: '2',
      sling_length: '2.0',
      spread_x: '1.5',
      spread_y: '0',
      hook_height: '2.0',
      sling_type: 'webbing',
      sling_wll: '2',
    },
  },
  medium_4leg: {
    name: 'Medium 4-Leg (5t)',
    form: {
      load_weight: '50',
      load_unit: 'kN',
      num_legs: '4',
      sling_length: '3.0',
      spread_x: '2.0',
      spread_y: '2.0',
      hook_height: '2.5',
      sling_type: 'chain_g80',
      sling_wll: '5.3',
    },
  },
  heavy_2leg: {
    name: 'Heavy 2-Leg (15t)',
    form: {
      load_weight: '150',
      load_unit: 'kN',
      num_legs: '2',
      sling_length: '4.0',
      spread_x: '3.0',
      spread_y: '0',
      hook_height: '3.5',
      sling_type: 'wire_rope',
      sling_wll: '12.5',
    },
  },
  crane_basket: {
    name: 'Basket Hitch',
    form: {
      load_weight: '30',
      load_unit: 'kN',
      num_legs: '2',
      sling_length: '3.0',
      spread_x: '0.5',
      spread_y: '0',
      hook_height: '2.8',
      sling_type: 'round_sling',
      sling_wll: '5',
    },
  },
};

// Angle reduction factors per BS EN 1492
const getAngleReductionFactor = (angleDeg: number): number => {
  if (angleDeg <= 45) return 1.0;
  if (angleDeg <= 60) return 0.866; // cos(30°)
  if (angleDeg <= 90) return 0.707; // cos(45°)
  return 0.5; // Conservative for very shallow angles
};

const getModeFactorFromAngle = (numLegs: string, angleDeg: number): number => {
  const config = NUM_LEGS_CONFIG[numLegs];
  if (!config) return 1.0;
  if (numLegs === '1') return 1.0;

  // Linear interpolation between 45° and 60° factors
  if (angleDeg <= 45) {
    // At 45° from vertical (45° angle)
    return config.mode_factor_45;
  } else if (angleDeg >= 60) {
    // At 60° from vertical
    return config.mode_factor_60;
  } else {
    // Interpolate
    const ratio = (angleDeg - 45) / 15;
    return config.mode_factor_45 + ratio * (config.mode_factor_60 - config.mode_factor_45);
  }
};

const SlingAngle = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    cog_below_hook: '',
    design_safety_factor: '',
    dynamic_factor: '',
    hook_height: '',
    load_unit: '',
    load_weight: '',
    num_legs: '',
    projectName: '',
    reference: '',
    sling_length: '',
    sling_type: '',
    sling_wll: '',
    spread_x: '',
    spread_y: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'cog_below_hook', label: 'Cog Below Hook' },
  { key: 'design_safety_factor', label: 'Design Safety Factor' },
  { key: 'dynamic_factor', label: 'Dynamic Factor' },
  { key: 'hook_height', label: 'Hook Height' },
  { key: 'load_unit', label: 'Load Unit' },
  { key: 'load_weight', label: 'Load Weight' },
  { key: 'num_legs', label: 'Num Legs' },
  { key: 'sling_length', label: 'Sling Length' },
  { key: 'sling_type', label: 'Sling Type' },
  { key: 'sling_wll', label: 'Sling Wll' },
  { key: 'spread_x', label: 'Spread X' },
  { key: 'spread_y', label: 'Spread Y' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'load_weight', label: 'Load_weight', min: 0, max: 100, step: 1, unit: '' },
    { key: 'load_unit', label: 'Load_unit', min: 0, max: 100, step: 1, unit: '' },
    { key: 'dynamic_factor', label: 'Dynamic_factor', min: 0, max: 100, step: 1, unit: '' },
    { key: 'num_legs', label: 'Num_legs', min: 0, max: 100, step: 1, unit: '' }
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
        const loadWeight = parseFloat(formData.load_weight) || 10;
        const loadUnit = LOAD_UNITS[formData.load_unit] || LOAD_UNITS.kN;
        const loadKN = loadWeight * loadUnit.to_kn;
        const dynamicFactor = parseFloat(formData.dynamic_factor) || 1.0;
        const numLegs = formData.num_legs || '2';
        const slingLength = parseFloat(formData.sling_length) || 2.0;
        const slingWLL = parseFloat(formData.sling_wll) || 5;
        const spreadX = parseFloat(formData.spread_x) || 1.0;
        const spreadY = parseFloat(formData.spread_y) || 0;
        const hookHeight = parseFloat(formData.hook_height) || 2.0;
        const cogOffset = parseFloat(formData.cog_below_hook) || 0;
        const designSF = parseFloat(formData.design_safety_factor) || 1.0;

        // Geometry calculation
        const halfSpread = Math.sqrt(spreadX * spreadX + spreadY * spreadY) / 2;
        const verticalDist = hookHeight - cogOffset;
        const actualSlingLengthRequired = Math.sqrt(
          halfSpread * halfSpread + verticalDist * verticalDist,
        );

        // Sling angle from vertical
        const angleFromVertical =
          verticalDist > 0 ? Math.atan(halfSpread / verticalDist) * (180 / Math.PI) : 90;
        const angleFromHorizontal = 90 - angleFromVertical;

        // Factors using existing helpers
        const modeFactor = getModeFactorFromAngle(numLegs, angleFromVertical);
        const angleReductionFactor = getAngleReductionFactor(angleFromVertical);

        // Load distribution
        const totalFactoredLoad = loadKN * dynamicFactor * designSF;
        const nLegs = parseInt(numLegs) || 1;
        const loadPerSling = totalFactoredLoad / Math.max(nLegs, 1);

        // Tension in each sling (based on angle)
        const cosAngle = Math.cos((angleFromVertical * Math.PI) / 180);
        const sinAngle = Math.sin((angleFromVertical * Math.PI) / 180);
        const tensionPerSling = cosAngle > 0.01 ? loadPerSling / cosAngle : loadPerSling * 100;
        const horizontalForcePerSling = tensionPerSling * sinAngle;

        // Capacity at angle
        const slingCapacityAtAngle = slingWLL * angleReductionFactor * loadUnit.to_kn;
        const minSlingWLLRequired = tensionPerSling / (angleReductionFactor * loadUnit.to_kn);

        // Utilisation
        const utilisation = slingCapacityAtAngle > 0 ? tensionPerSling / slingCapacityAtAngle : 999;
        const safetyFactorActual = utilisation > 0 ? 1 / utilisation : 999;

        // Warnings
        if (angleFromVertical > 60)
          w.push('CRITICAL: Sling angle > 60\u00b0 from vertical \u2014 LEEA limit');
        else if (angleFromVertical > 45)
          w.push('WARNING: Sling angle > 45\u00b0 \u2014 significant capacity reduction');
        if (utilisation > 1.0)
          w.push('Sling capacity EXCEEDED \u2014 increase WLL or reduce angle');
        if (utilisation > 0.8) w.push('Utilisation > 80% \u2014 limited margin');
        if (actualSlingLengthRequired > slingLength * 1.05)
          w.push('Sling too short for geometry \u2014 increase sling length');
        if (dynamicFactor > 1.5) w.push('High dynamic factor \u2014 verify lifting conditions');

        // Rating
        let rating = 'SAFE';
        let ratingColor = '#22c55e';
        if (utilisation > 1.0 || angleFromVertical > 60) {
          rating = 'UNSAFE';
          ratingColor = '#ef4444';
        } else if (utilisation > 0.8 || angleFromVertical > 45) {
          rating = 'CAUTION';
          ratingColor = '#f59e0b';
        } else if (utilisation > 0.5) {
          rating = 'ACCEPTABLE';
          ratingColor = '#3b82f6';
        }

        setResults({
          sling_angle_from_vertical: angleFromVertical,
          sling_angle_from_horizontal: angleFromHorizontal,
          actual_sling_length_required: actualSlingLengthRequired,
          mode_factor: modeFactor,
          angle_reduction_factor: angleReductionFactor,
          total_factored_load: totalFactoredLoad,
          load_per_sling: loadPerSling,
          tension_per_sling: tensionPerSling,
          horizontal_force_per_sling: horizontalForcePerSling,
          sling_capacity_at_angle: slingCapacityAtAngle,
          min_sling_wll_required: minSlingWLLRequired,
          utilisation,
          safety_factor_actual: safetyFactorActual,
          status: `${angleFromVertical.toFixed(0)}\u00b0 from vertical \u2014 ${rating}`,
          rating,
          ratingColor,
          warnings: w,
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
    generatePremiumPDF({
      title: 'Sling Angle Analysis',
      subtitle: 'BS EN 1492 / LEEA Guidance',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Untitled' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'BS EN 1492 / LEEA Code of Practice' },
      ],
      inputs: [
        { label: 'Load Weight', value: String(formData.load_weight), unit: formData.load_unit },
        { label: 'Dynamic Factor', value: String(formData.dynamic_factor) },
        { label: 'Number of Legs', value: String(formData.num_legs) },
        { label: 'Sling Type', value: formData.sling_type },
        { label: 'Sling Length', value: String(formData.sling_length), unit: 'm' },
        { label: 'Sling WLL', value: String(formData.sling_wll), unit: 't' },
        { label: 'Spread', value: `${formData.spread_x} \u00d7 ${formData.spread_y}`, unit: 'm' },
        { label: 'Hook Height', value: String(formData.hook_height), unit: 'm' },
      ],
      sections: [
        {
          title: 'Sling Analysis Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Sling Angle (from vertical)', results.sling_angle_from_vertical.toFixed(1), '\u00b0'],
            [
              'Sling Angle (from horizontal)',
              results.sling_angle_from_horizontal.toFixed(1),
              '\u00b0',
            ],
            ['Required Sling Length', results.actual_sling_length_required.toFixed(2), 'm'],
            ['Mode Factor', results.mode_factor.toFixed(2), '-'],
            ['Angle Reduction Factor', results.angle_reduction_factor.toFixed(3), '-'],
            ['Total Factored Load', results.total_factored_load.toFixed(1), 'kN'],
            ['Load per Sling', results.load_per_sling.toFixed(1), 'kN'],
            ['Tension per Sling', results.tension_per_sling.toFixed(1), 'kN'],
            ['Horizontal Force per Sling', results.horizontal_force_per_sling.toFixed(1), 'kN'],
            ['Sling Capacity at Angle', results.sling_capacity_at_angle.toFixed(1), 'kN'],
            ['Min WLL Required (per leg)', results.min_sling_wll_required.toFixed(2), 't'],
          ],
        },
      ],
      checks: [
        {
          name: 'Sling Capacity',
          capacity: `${results.sling_capacity_at_angle.toFixed(1)} kN`,
          utilisation: String(results.utilisation.toFixed(1)) + '%',
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Sling Angle',
          suggestion: 'Keep sling angle within 45\u00b0 from vertical for full capacity',
        },
        { check: 'WLL', suggestion: 'Select slings with WLL \u2265 calculated minimum per leg' },
        {
          check: 'Inspection',
          suggestion: 'Ensure all slings are inspected and certified before use',
        },
      ],
      warnings: results.warnings.map((w) => ({ message: w })),
      footerNote: 'Beaver Bridges Ltd \u2014 Sling Angle Analysis',
    });
  }, [formData, results]);

  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Sling Angle Analysis',
      subtitle: 'BS EN 1492 / LEEA Guidance',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Untitled' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'BS EN 1492 / LEEA Code of Practice' },
      ],
      inputs: [
        { label: 'Load Weight', value: String(formData.load_weight), unit: formData.load_unit },
        { label: 'Dynamic Factor', value: String(formData.dynamic_factor) },
        { label: 'Number of Legs', value: String(formData.num_legs) },
        { label: 'Sling Type', value: formData.sling_type },
        { label: 'Sling Length', value: String(formData.sling_length), unit: 'm' },
        { label: 'Sling WLL', value: String(formData.sling_wll), unit: 't' },
        { label: 'Spread', value: `${formData.spread_x} \u00d7 ${formData.spread_y}`, unit: 'm' },
        { label: 'Hook Height', value: String(formData.hook_height), unit: 'm' },
      ],
      sections: [
        {
          title: 'Sling Analysis Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Sling Angle (from vertical)', results.sling_angle_from_vertical.toFixed(1), '\u00b0'],
            [
              'Sling Angle (from horizontal)',
              results.sling_angle_from_horizontal.toFixed(1),
              '\u00b0',
            ],
            ['Required Sling Length', results.actual_sling_length_required.toFixed(2), 'm'],
            ['Mode Factor', results.mode_factor.toFixed(2), '-'],
            ['Angle Reduction Factor', results.angle_reduction_factor.toFixed(3), '-'],
            ['Total Factored Load', results.total_factored_load.toFixed(1), 'kN'],
            ['Load per Sling', results.load_per_sling.toFixed(1), 'kN'],
            ['Tension per Sling', results.tension_per_sling.toFixed(1), 'kN'],
            ['Sling Capacity at Angle', results.sling_capacity_at_angle.toFixed(1), 'kN'],
            ['Min WLL Required (per leg)', results.min_sling_wll_required.toFixed(2), 't'],
          ],
        },
      ],
      checks: [
        {
          name: 'Sling Capacity',
          capacity: `${results.sling_capacity_at_angle.toFixed(1)} kN`,
          utilisation: String(results.utilisation.toFixed(1)) + '%',
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Sling Angle Analysis',
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
      <div className="flex items-center gap-1.5 mb-2">
        <ExplainableLabel label={label} field={field} className="text-sm font-semibold text-gray-300" />{' '}
        {unit && <span className="text-xs text-gray-400">({unit})</span>}
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
      <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
        <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection(sectionId)}>
          <CardTitle className="text-lg flex items-center gap-3 text-white font-semibold">
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

  const ResultItem: React.FC<{
    label: string;
    value: string | number;
    unit?: string;
    highlight?: boolean;
    color?: string;
  }> = ({ label, value, unit, highlight, color }) => (
    <div
      className={cn(
        'flex justify-between py-2 border-b border-gray-700/50',
        highlight && 'bg-blue-500/10 px-2 -mx-2 rounded',
      )}
    >
      <span className="text-gray-400">{label}</span>
      <span
        className={cn(
          'font-mono',
          color || (highlight ? 'text-blue-400 font-semibold' : 'text-white'),
        )}
        style={color ? { color } : undefined}
      >
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span className="text-gray-500 ml-1">{unit}</span>}
      </span>
    </div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                Sling Angle Calculator
              </h1>
              <p className="text-gray-400 mt-2">
                BS EN 1492 / LEEA — Sling Capacity & Load Distribution Analysis
              </p>
            </div>
            <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3">
              <Button
                onClick={() => {
                  runCalculation();
                  setActiveTab('results');
                }}
                disabled={isCalculating}
                className="py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isCalculating ? (
                  <FiActivity className="animate-spin mr-2" />
                ) : (
                  <FiZap className="mr-2" />
                )}
                ▶ RUN FULL ANALYSIS
              </Button>
              {results && (
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <FiDownload className="mr-2" />
                  Export PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={handleExportDOCX}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <FiDownload className="mr-2" />
                  Export DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton calculatorKey="sling-angle" inputs={formData as unknown as Record<string, string | number>} results={results} />
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'input' ? 'default' : 'outline'}
            onClick={() => setActiveTab('input')}
            className={activeTab === 'input' ? 'bg-blue-600' : ''}
          >
            <FiSettings className="mr-2" />
            Input
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            onClick={() => setActiveTab('results')}
            className={activeTab === 'results' ? 'bg-blue-600' : ''}
            disabled={!results}
          >
            <FiTarget className="mr-2" />
            Results
          </Button>
        </div>

        {activeTab === 'input' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Input Column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Presets */}
              <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3 text-white font-semibold">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-blue-400" />
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
                        className="text-gray-300 border-gray-600 hover:bg-gray-700"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Load Information */}
              <CollapsibleSection
                title="Load Information"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiTarget className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="orange"
              >
                <div className="grid md:grid-cols-3 gap-4">
                  <InputField label="Load Weight" field="load_weight" />
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Unit</label>
                    <select
                      title="Unit"
                      value={formData.load_unit}
                      onChange={(e) => updateForm('load_unit', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(LOAD_UNITS).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField
                    label="Dynamic Factor"
                    field="dynamic_factor"
                    tooltip="1.0-1.3 typical"
                  />
                </div>
              </CollapsibleSection>

              {/* Sling Configuration */}
              <CollapsibleSection
                title="Sling Configuration"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiLink className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="blue"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Number of Legs</label>
                    <select
                      title="Number of Legs"
                      value={formData.num_legs}
                      onChange={(e) => updateForm('num_legs', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(NUM_LEGS_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Sling Type</label>
                    <select
                      title="Sling Type"
                      value={formData.sling_type}
                      onChange={(e) => updateForm('sling_type', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(SLING_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField label="Sling Length" field="sling_length" unit="m" />
                  <InputField
                    label="Sling WLL (each)"
                    field="sling_wll"
                    unit="t"
                    tooltip="Working Load Limit per leg"
                  />
                </div>
              </CollapsibleSection>

              {/* Geometry */}
              <CollapsibleSection
                title="Lift Geometry"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiTriangle className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="purple"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <InputField
                    label="Spread (X direction)"
                    field="spread_x"
                    unit="m"
                    tooltip="Total spread between attachment points"
                  />
                  <InputField
                    label="Spread (Y direction)"
                    field="spread_y"
                    unit="m"
                    tooltip="For 4-leg configuration, 0 for 2-leg"
                  />
                  <InputField
                    label="Hook Height Above Load"
                    field="hook_height"
                    unit="m"
                    tooltip="Vertical distance from hook to load attachment"
                  />
                  <InputField
                    label="COG Below Attachment"
                    field="cog_below_hook"
                    unit="m"
                    tooltip="How far COG is below the sling attachment points"
                  />
                </div>
              </CollapsibleSection>

              {/* Safety Factors */}
              <CollapsibleSection
                title="Safety & Project"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiSettings className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="emerald"
                defaultOpen={false}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <InputField
                    label="Design Safety Factor"
                    field="design_safety_factor"
                    tooltip="Applied to load (1.0-1.5 typical)"
                  />
                  <div></div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Project Name</label>
                    <input
                      title="Project Name"
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => updateForm('projectName', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Reference</label>
                    <input
                      title="Reference"
                      type="text"
                      value={formData.reference}
                      onChange={(e) => updateForm('reference', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {/* Preview Column */}
            <div className="space-y-4">
              <WhatIfPreview
                title="Sling Angle — 3D Preview"
                sliders={whatIfSliders}
                form={formData}
                updateForm={updateForm}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                onMaximize={() => setPreviewMaximized(true)}
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                    <SlingAngle3D />
                  </Interactive3DDiagram>
                )}
              />

              {/* Quick Reference */}
              <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white font-semibold">Angle Capacity Factors</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">0-45° from vertical:</span>
                    <span className="text-green-400">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">45-60° from vertical:</span>
                    <span className="text-yellow-400">86.6%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">&gt;60° from vertical:</span>
                    <span className="text-red-400">Not recommended</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Results Display */}
            {results && (
              <>
                <div className="lg:col-span-2 space-y-4">
                  {/* Status Card */}
                  <Card
                    className={cn(
                      'bg-gray-900/40 backdrop-blur-md border border-gray-700/50 shadow-lg',
                      results.status === 'PASS' ? 'shadow-green-500/10' : 'shadow-red-500/10',
                    )}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Sling Check</p>
                          <p className="text-3xl font-bold" style={{ color: results.ratingColor }}>
                            {results.rating}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            Utilisation: {results.utilisation.toFixed(1)}%
                          </p>
                        </div>
                        <div
                          className={cn(
                            'w-20 h-20 rounded-full flex items-center justify-center',
                            results.status === 'PASS' ? 'bg-green-500/20' : 'bg-red-500/20',
                          )}
                        >
                          {results.status === 'PASS' ? (
                            <FiCheck className="w-10 h-10 text-green-400" />
                          ) : (
                            <FiAlertTriangle className="w-10 h-10 text-red-400" />
                          )}
                        </div>
                      </div>

                      {/* Utilisation Bar */}
                      <div className="mt-4">
                        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(results.utilisation, 100)}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: results.ratingColor,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Geometry Results */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiTriangle className="w-6 h-6 text-blue-400" />
                        </div>
                        Sling Geometry
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem
                        label="Sling Angle (from vertical)"
                        value={results.sling_angle_from_vertical}
                        unit="°"
                        highlight
                        color={
                          results.sling_angle_from_vertical <= 45
                            ? '#22c55e'
                            : results.sling_angle_from_vertical <= 60
                              ? '#eab308'
                              : '#ef4444'
                        }
                      />
                      <ResultItem
                        label="Sling Angle (from horizontal)"
                        value={results.sling_angle_from_horizontal}
                        unit="°"
                      />
                      <ResultItem
                        label="Required Sling Length"
                        value={results.actual_sling_length_required}
                        unit="m"
                      />
                      <ResultItem label="Mode Factor" value={results.mode_factor} />
                      <ResultItem
                        label="Angle Reduction Factor"
                        value={results.angle_reduction_factor}
                      />
                    </CardContent>
                  </Card>

                  {/* Load Distribution */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiTarget className="w-6 h-6 text-blue-400" />
                        </div>
                        Load Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem
                        label="Total Factored Load"
                        value={results.total_factored_load}
                        unit="kN"
                      />
                      <ResultItem
                        label="Load per Sling (vertical component)"
                        value={results.load_per_sling}
                        unit="kN"
                      />
                      <ResultItem
                        label="Tension per Sling (along sling)"
                        value={results.tension_per_sling}
                        unit="kN"
                        highlight
                      />
                      <ResultItem
                        label="Horizontal Force per Sling"
                        value={results.horizontal_force_per_sling}
                        unit="kN"
                      />
                    </CardContent>
                  </Card>

                  {/* Capacity Check */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiLink className="w-6 h-6 text-blue-400" />
                        </div>
                        Capacity Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem
                        label="Sling Capacity at Angle"
                        value={results.sling_capacity_at_angle}
                        unit="kN"
                      />
                      <ResultItem
                        label="Minimum WLL Required (per leg)"
                        value={results.min_sling_wll_required}
                        unit="tonnes"
                        highlight
                      />
                      <ResultItem
                        label="Utilisation"
                        value={results.utilisation}
                        unit="%"
                        color={results.ratingColor}
                      />
                      <ResultItem
                        label="Actual Safety Factor"
                        value={results.safety_factor_actual}
                      />
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardHeader>
                      <CardTitle className="text-blue-400 font-semibold flex items-center gap-2">
                        <FiCheck className="w-5 h-5" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2 text-gray-300">
                          <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          Keep sling angle within 45\u00b0 from vertical for full capacity
                        </li>
                        <li className="flex items-start gap-2 text-gray-300">
                          <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          Select slings with WLL \u2265 calculated minimum per leg
                        </li>
                        <li className="flex items-start gap-2 text-gray-300">
                          <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          Ensure all slings are inspected and certified before use
                        </li>
                        <li className="flex items-start gap-2 text-gray-300">
                          <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          Use a spreader beam if angle exceeds 60\u00b0 from vertical
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Warnings */}
                  {results.warnings.length > 0 && (
                    <Card className="bg-yellow-500/10 border-yellow-500/30">
                      <CardHeader>
                        <CardTitle className="text-yellow-400 flex items-center gap-2">
                          <FiAlertTriangle />
                          Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {results.warnings.map((warning, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-yellow-300 text-sm"
                            >
                              <FiAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Visualization Column */}
                <div className="space-y-4">
                  {/* Sticky Sidebar Summary */}
                  <div className="sticky top-8 space-y-4">
                    {/* Summary Cards */}
                    <div className="space-y-3">
                      <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-lg p-3 border-l-4 border-l-blue-400">
                        <p className="text-xs text-gray-400">Sling Angle</p>
                        <p className="text-lg font-bold text-white">{results.sling_angle_from_vertical.toFixed(1)}°</p>
                      </div>
                      <div className={`bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-lg p-3 border-l-4 ${results.utilisation <= 0.8 ? 'border-l-green-400' : results.utilisation <= 1.0 ? 'border-l-yellow-400' : 'border-l-red-400'}`}>
                        <p className="text-xs text-gray-400">Utilisation</p>
                        <p className="text-lg font-bold text-white">{results.utilisation.toFixed(1)}%</p>
                      </div>
                      <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-lg p-3 border-l-4" style={{ borderLeftColor: results.ratingColor }}>
                        <p className="text-xs text-gray-400">Rating</p>
                        <p className="text-lg font-bold" style={{ color: results.ratingColor }}>{results.rating}</p>
                      </div>
                    </div>

                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-3 text-white font-semibold">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiTriangle className="w-6 h-6 text-blue-400" />
                        </div>
                        Lift Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                        <SlingAngle3D />
                      </Interactive3DDiagram>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-gray-400">Hook point</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5 bg-blue-500"></div>
                          <span className="text-gray-400">Sling legs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-gray-400">Center of gravity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5 bg-yellow-500"></div>
                          <span className="text-gray-400">Sling angle</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>

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
                  <SlingAngle3D />
                </Interactive3DDiagram>
                <button
                  onClick={() => setPreviewMaximized(false)}
                  className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                  aria-label="Minimize preview"
                >
                  <FiMinimize2 size={20} />
                </button>
                <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                  SLING ANGLE — REAL-TIME PREVIEW
                </div>
              </div>
              <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                  <FiSliders size={14} /> Live Parameters
                </h3>
                {[
                  { label: 'Load Weight', value: `${formData.load_weight || '0'} ${formData.load_unit || 'kN'}` },
                  { label: 'No. Legs', value: formData.num_legs || '-' },
                  { label: 'Sling Length', value: `${formData.sling_length || '0'} m` },
                  { label: 'Sling WLL', value: `${formData.sling_wll || '0'} t` },
                  { label: 'Spread X', value: `${formData.spread_x || '0'} m` },
                  { label: 'Spread Y', value: `${formData.spread_y || '0'} m` },
                  { label: 'Hook Height', value: `${formData.hook_height || '0'} m` },
                  { label: 'Dynamic Factor', value: formData.dynamic_factor || '-' },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                    <span className="text-gray-500">{stat.label}</span>
                    <span className="text-white font-medium">{stat.value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                    <FiActivity size={14} /> Live Readout
                  </h3>
                  {results ? [
                    { label: 'Angle (from vert)', value: `${results.sling_angle_from_vertical.toFixed(1)}°` },
                    { label: 'Tension/Sling', value: `${results.tension_per_sling.toFixed(2)} kN` },
                    { label: 'Utilisation', value: `${results.utilisation.toFixed(1)}%` },
                    { label: 'Status', value: results.status },
                    { label: 'Rating', value: results.rating },
                  ].map((stat) => (
                    <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                      <span className="text-gray-500">{stat.label}</span>
                      <span className={cn('font-medium', results.status === 'FAIL' ? 'text-red-400' : 'text-emerald-400')}>{stat.value}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-600 italic">Run analysis to see results</p>
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
      </div>
  );
};

export default SlingAngle;
