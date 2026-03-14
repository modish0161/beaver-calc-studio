// =============================================================================
// Sling Checks Calculator — Premium Edition
// BS EN 1492 / LEEA Guidance — Lifting Sling Selection & Verification
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
    FiGrid,
    FiInfo,
    FiLayers,
    FiLink,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiX,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildSlingChecksReport } from '../../lib/pdf/builders/slingChecksBuilder';
import { cn } from '../../lib/utils';

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SlingChecks3D from '../../components/3d/scenes/SlingChecks3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Sling Selection
  sling_type: string;
  sling_config: string;
  sling_length: string;
  num_legs: string;
  // Loading
  load_weight: string;
  dynamic_factor: string;
  cog_offset: string;
  environmental_factor: string;
  // Geometry
  sling_angle: string;
  spread_width: string;
  lift_height: string;
  // Fittings
  top_fitting: string;
  bottom_fitting: string;
  // Safety
  design_factor: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Load distribution
  load_per_leg: number;
  factored_load: number;
  angle_factor: number;
  adjusted_wll: number;
  // Sling capacity
  sling_wll_single: number;
  sling_mbl: number;
  sling_capacity_config: number;
  efficiency: number;
  // Utilisation
  utilisation: number;
  status: string;
  // Calculated geometry
  actual_angle: number;
  actual_length_req: number;
  // Recommendations
  min_sling_size: string;
  recommended_sling: string;
  // Overall
  rating: string;
  ratingColor: string;
  warnings: string[];
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const SLING_TYPES: Record<
  string,
  {
    name: string;
    color: string;
    wll_single: number;
    weight_per_m: number;
    material: string;
    safety_factor: number;
  }
> = {
  // Grade 80 Chains
  chain_8_G80: {
    name: 'Grade 80 Chain 8mm',
    color: 'Black',
    wll_single: 2.0,
    weight_per_m: 1.4,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  chain_10_G80: {
    name: 'Grade 80 Chain 10mm',
    color: 'Black',
    wll_single: 3.15,
    weight_per_m: 2.2,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  chain_13_G80: {
    name: 'Grade 80 Chain 13mm',
    color: 'Black',
    wll_single: 5.3,
    weight_per_m: 3.8,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  chain_16_G80: {
    name: 'Grade 80 Chain 16mm',
    color: 'Black',
    wll_single: 8.0,
    weight_per_m: 5.6,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  chain_20_G80: {
    name: 'Grade 80 Chain 20mm',
    color: 'Black',
    wll_single: 12.5,
    weight_per_m: 8.0,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  chain_26_G80: {
    name: 'Grade 80 Chain 26mm',
    color: 'Black',
    wll_single: 21.2,
    weight_per_m: 13.8,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  // Grade 100 Chains
  chain_10_G100: {
    name: 'Grade 100 Chain 10mm',
    color: 'Yellow',
    wll_single: 4.0,
    weight_per_m: 2.0,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  chain_13_G100: {
    name: 'Grade 100 Chain 13mm',
    color: 'Yellow',
    wll_single: 6.7,
    weight_per_m: 3.4,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  chain_16_G100: {
    name: 'Grade 100 Chain 16mm',
    color: 'Yellow',
    wll_single: 10.0,
    weight_per_m: 5.0,
    material: 'Alloy Steel',
    safety_factor: 4,
  },
  // Wire Rope (6x36)
  wire_12: {
    name: 'Wire Rope 12mm 6x36',
    color: 'Silver',
    wll_single: 1.25,
    weight_per_m: 0.63,
    material: 'Steel Wire',
    safety_factor: 5,
  },
  wire_16: {
    name: 'Wire Rope 16mm 6x36',
    color: 'Silver',
    wll_single: 2.2,
    weight_per_m: 1.12,
    material: 'Steel Wire',
    safety_factor: 5,
  },
  wire_20: {
    name: 'Wire Rope 20mm 6x36',
    color: 'Silver',
    wll_single: 3.5,
    weight_per_m: 1.75,
    material: 'Steel Wire',
    safety_factor: 5,
  },
  wire_26: {
    name: 'Wire Rope 26mm 6x36',
    color: 'Silver',
    wll_single: 5.9,
    weight_per_m: 2.95,
    material: 'Steel Wire',
    safety_factor: 5,
  },
  wire_32: {
    name: 'Wire Rope 32mm 6x36',
    color: 'Silver',
    wll_single: 9.0,
    weight_per_m: 4.48,
    material: 'Steel Wire',
    safety_factor: 5,
  },
  // Webbing Slings
  web_25_purple: {
    name: 'Webbing 25mm Purple 1t',
    color: 'Purple',
    wll_single: 1.0,
    weight_per_m: 0.05,
    material: 'Polyester',
    safety_factor: 7,
  },
  web_50_green: {
    name: 'Webbing 50mm Green 2t',
    color: 'Green',
    wll_single: 2.0,
    weight_per_m: 0.1,
    material: 'Polyester',
    safety_factor: 7,
  },
  web_60_yellow: {
    name: 'Webbing 60mm Yellow 3t',
    color: 'Yellow',
    wll_single: 3.0,
    weight_per_m: 0.12,
    material: 'Polyester',
    safety_factor: 7,
  },
  web_90_grey: {
    name: 'Webbing 90mm Grey 4t',
    color: 'Grey',
    wll_single: 4.0,
    weight_per_m: 0.18,
    material: 'Polyester',
    safety_factor: 7,
  },
  web_120_red: {
    name: 'Webbing 120mm Red 5t',
    color: 'Red',
    wll_single: 5.0,
    weight_per_m: 0.24,
    material: 'Polyester',
    safety_factor: 7,
  },
  // Round Slings (EN 1492-2 color coding)
  round_1_violet: {
    name: 'Round Sling 1t Violet',
    color: 'Violet',
    wll_single: 1.0,
    weight_per_m: 0.4,
    material: 'Polyester Core',
    safety_factor: 7,
  },
  round_2_green: {
    name: 'Round Sling 2t Green',
    color: 'Green',
    wll_single: 2.0,
    weight_per_m: 0.7,
    material: 'Polyester Core',
    safety_factor: 7,
  },
  round_3_yellow: {
    name: 'Round Sling 3t Yellow',
    color: 'Yellow',
    wll_single: 3.0,
    weight_per_m: 1.0,
    material: 'Polyester Core',
    safety_factor: 7,
  },
  round_5_red: {
    name: 'Round Sling 5t Red',
    color: 'Red',
    wll_single: 5.0,
    weight_per_m: 1.5,
    material: 'Polyester Core',
    safety_factor: 7,
  },
  round_8_blue: {
    name: 'Round Sling 8t Blue',
    color: 'Blue',
    wll_single: 8.0,
    weight_per_m: 2.5,
    material: 'Polyester Core',
    safety_factor: 7,
  },
  round_10_orange: {
    name: 'Round Sling 10t Orange',
    color: 'Orange',
    wll_single: 10.0,
    weight_per_m: 3.2,
    material: 'Polyester Core',
    safety_factor: 7,
  },
  round_20_orange: {
    name: 'Round Sling 20t Orange',
    color: 'Orange',
    wll_single: 20.0,
    weight_per_m: 6.0,
    material: 'Polyester Core',
    safety_factor: 7,
  },
};

const SLING_CONFIGS: Record<
  string,
  { name: string; legs: number; mode_factor: number; description: string }
> = {
  single_vertical: {
    name: 'Single Vertical',
    legs: 1,
    mode_factor: 1.0,
    description: 'Straight lift',
  },
  single_choke: { name: 'Single Choke', legs: 1, mode_factor: 0.8, description: 'Choke hitch' },
  single_basket: { name: 'Single Basket', legs: 1, mode_factor: 2.0, description: 'Basket hitch' },
  two_leg_60: {
    name: '2-Leg @ 60°',
    legs: 2,
    mode_factor: 1.73,
    description: '2 legs at 60° to vertical',
  },
  two_leg_45: {
    name: '2-Leg @ 45°',
    legs: 2,
    mode_factor: 1.41,
    description: '2 legs at 45° to vertical',
  },
  four_leg_60: {
    name: '4-Leg @ 60°',
    legs: 4,
    mode_factor: 2.6,
    description: 'Assumes only 3 legs active',
  },
  four_leg_45: {
    name: '4-Leg @ 45°',
    legs: 4,
    mode_factor: 2.1,
    description: 'Assumes only 3 legs active',
  },
  custom: { name: 'Custom Config', legs: 2, mode_factor: 1.0, description: 'User defined' },
};

const END_FITTINGS: Record<string, { name: string; efficiency: number }> = {
  master_link: { name: 'Master Link', efficiency: 1.0 },
  soft_eye: { name: 'Soft Eye', efficiency: 1.0 },
  thimble_eye: { name: 'Thimble Eye', efficiency: 1.0 },
  self_lock_hook: { name: 'Self-Locking Hook', efficiency: 0.95 },
  sling_hook: { name: 'Sling Hook', efficiency: 0.95 },
  grab_hook: { name: 'Grab Hook', efficiency: 0.9 },
  shackle: { name: 'Shackle', efficiency: 0.9 },
};

const PRESETS = {
  light_lift: {
    name: 'Light Lift (500kg)',
    load_weight: '5',
    sling_type: 'web_50_green',
    sling_config: 'two_leg_60',
    sling_length: '2.0',
  },
  medium_chain: {
    name: 'Medium Chain (5t)',
    load_weight: '50',
    sling_type: 'chain_13_G80',
    sling_config: 'two_leg_60',
    sling_length: '3.0',
  },
  heavy_wire: {
    name: 'Heavy Wire (15t)',
    load_weight: '150',
    sling_type: 'wire_26',
    sling_config: 'four_leg_60',
    sling_length: '4.0',
  },
  round_basket: {
    name: 'Round Sling Basket',
    load_weight: '30',
    sling_type: 'round_5_red',
    sling_config: 'single_basket',
    sling_length: '3.0',
  },
};

const SlingChecks = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    bottom_fitting: '',
    cog_offset: '',
    design_factor: '',
    dynamic_factor: '',
    environmental_factor: '',
    lift_height: '',
    load_weight: '',
    num_legs: '',
    projectName: '',
    reference: '',
    sling_angle: '',
    sling_config: '',
    sling_length: '',
    sling_type: '',
    spread_width: '',
    top_fitting: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'bottom_fitting', label: 'Bottom Fitting' },
  { key: 'cog_offset', label: 'Cog Offset' },
  { key: 'design_factor', label: 'Design Factor' },
  { key: 'dynamic_factor', label: 'Dynamic Factor' },
  { key: 'environmental_factor', label: 'Environmental Factor' },
  { key: 'lift_height', label: 'Lift Height' },
  { key: 'load_weight', label: 'Load Weight' },
  { key: 'num_legs', label: 'Num Legs' },
  { key: 'sling_angle', label: 'Sling Angle' },
  { key: 'sling_config', label: 'Sling Config' },
  { key: 'sling_length', label: 'Sling Length' },
  { key: 'sling_type', label: 'Sling Type' },
  { key: 'spread_width', label: 'Spread Width' },
  { key: 'top_fitting', label: 'Top Fitting' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'sling_type', label: 'Sling_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'sling_config', label: 'Sling_config', min: 0, max: 100, step: 1, unit: '' },
    { key: 'sling_length', label: 'Sling_length', min: 0, max: 100, step: 1, unit: '' },
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
        const newWarnings: string[] = [];

        // Parse inputs
        const slingTypeKey = formData.sling_type || 'chain_13_G80';
        const slingType = SLING_TYPES[slingTypeKey] || SLING_TYPES.chain_13_G80;
        const configKey = formData.sling_config || 'two_leg_60';
        const config = SLING_CONFIGS[configKey] || SLING_CONFIGS.two_leg_60;
        const W = parseFloat(formData.load_weight) || 10; // kN
        const dynFactor = parseFloat(formData.dynamic_factor) || 1.1;
        const envFactor = parseFloat(formData.environmental_factor) || 1.0;
        const cogOffset = parseFloat(formData.cog_offset) || 0;
        const slingLength = parseFloat(formData.sling_length) || 2.0;
        const spreadW = parseFloat(formData.spread_width) || 1.0;
        const liftH = parseFloat(formData.lift_height) || 2.0;
        const designSF = parseFloat(formData.design_factor) || 1.0;

        // Fittings
        const topFit = formData.top_fitting
          ? END_FITTINGS[formData.top_fitting] || { efficiency: 1.0 }
          : { efficiency: 1.0 };
        const botFit = formData.bottom_fitting
          ? END_FITTINGS[formData.bottom_fitting] || { efficiency: 1.0 }
          : { efficiency: 1.0 };
        const fittingEff = Math.min(topFit.efficiency, botFit.efficiency);

        // Factored load
        const factoredLoad = W * dynFactor * envFactor * designSF;

        // Sling angle calculation (from geometry)
        const halfSpread = spreadW / 2;
        const actualAngle = Math.atan2(halfSpread, liftH) * (180 / Math.PI); // from vertical
        const angleRad = (actualAngle * Math.PI) / 180;

        // Angle reduction factor (LEEA table)
        let angleFactor: number;
        if (actualAngle <= 0) angleFactor = 1.0;
        else if (actualAngle <= 30) angleFactor = 1.0 / Math.cos(angleRad);
        else if (actualAngle <= 45) angleFactor = 1.0 / Math.cos(angleRad);
        else if (actualAngle <= 60) angleFactor = 1.0 / Math.cos(angleRad);
        else {
          angleFactor = 1.0 / Math.cos(angleRad);
          newWarnings.push('Sling angle > 60° from vertical — DANGEROUS');
        }

        // Actual sling length required
        const actualLengthReq = Math.sqrt(liftH * liftH + halfSpread * halfSpread);
        if (actualLengthReq > slingLength)
          newWarnings.push('Required sling length exceeds specified length');

        // Mode factor from config
        const modeFactor = config.mode_factor;

        // Sling capacity
        const wllSingle = slingType.wll_single; // tonnes
        const mbl = wllSingle * slingType.safety_factor; // tonnes
        const configCapacity = wllSingle * modeFactor * fittingEff; // tonnes at rated angle

        // Adjusted WLL at actual angle (derate for angle)
        const adjustedWLL = configCapacity / angleFactor;

        // Load per leg (kN to tonnes)
        const loadTonnes = factoredLoad / 9.81;
        const numLegs = config.legs;
        const loadPerLeg = loadTonnes / Math.max(numLegs, 1);

        // COG offset factor
        const cogFactor = cogOffset > 0 ? 1 + cogOffset / (spreadW || 1) : 1.0;
        const adjustedLoadPerLeg = loadPerLeg * cogFactor;

        // Utilisation
        const utilisation = adjustedLoadPerLeg / (adjustedWLL / numLegs);
        const status = utilisation <= 1.0 ? 'PASS' : 'FAIL';

        // Efficiency
        const efficiency = fittingEff * 100;

        // Find minimum sling size
        const requiredWLL = (loadTonnes * angleFactor) / modeFactor;
        let minSlingSize = 'N/A';
        let recommendedSling = slingType.name;
        for (const [key, s] of Object.entries(SLING_TYPES)) {
          if (s.material === slingType.material && s.wll_single >= requiredWLL) {
            minSlingSize = s.name;
            recommendedSling = s.name;
            break;
          }
        }

        if (actualAngle > 45)
          newWarnings.push('Sling angle > 45° — consider wider spread or longer slings');
        if (cogOffset > spreadW * 0.1)
          newWarnings.push('COG offset is significant — unequal leg loading');
        if (status === 'FAIL')
          newWarnings.push('Sling capacity exceeded — select larger sling or change configuration');

        // Rating
        let rating = 'CRITICAL';
        let ratingColor = '#ef4444';
        if (status === 'PASS') {
          if (utilisation <= 0.5) {
            rating = 'EXCELLENT';
            ratingColor = '#22c55e';
          } else if (utilisation <= 0.75) {
            rating = 'GOOD';
            ratingColor = '#10b981';
          } else if (utilisation <= 0.9) {
            rating = 'ADEQUATE';
            ratingColor = '#f59e0b';
          } else {
            rating = 'MARGINAL';
            ratingColor = '#f97316';
          }
        }

        setResults({
          load_per_leg: adjustedLoadPerLeg,
          factored_load: factoredLoad,
          angle_factor: angleFactor,
          adjusted_wll: adjustedWLL,
          sling_wll_single: wllSingle,
          sling_mbl: mbl,
          sling_capacity_config: configCapacity,
          efficiency,
          utilisation,
          status,
          actual_angle: actualAngle,
          actual_length_req: actualLengthReq,
          min_sling_size: minSlingSize,
          recommended_sling: recommendedSling,
          rating,
          ratingColor,
          warnings: newWarnings,
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
    const report = buildSlingChecksReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Sling Checks Report',
      subtitle: 'BS EN 1492 / LEEA Guidance - Lifting Sling Selection & Verification',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Untitled' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'BS EN 1492 / LEEA Code of Practice' },
      ],
      inputs: [
        { label: 'Sling Type', value: formData.sling_type },
        { label: 'Sling Config', value: formData.sling_config },
        { label: 'Sling Length', value: String(formData.sling_length), unit: 'm' },
        { label: 'Number of Legs', value: String(formData.num_legs) },
        { label: 'Load Weight', value: String(formData.load_weight), unit: 'kg' },
        { label: 'Dynamic Factor', value: String(formData.dynamic_factor) },
        { label: 'Sling Angle', value: String(formData.sling_angle), unit: '\u00b0' },
      ],
      sections: [
        {
          title: 'Sling Check Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Required WLL', ((results as any).required_wll ?? 0).toFixed(2), 't'],
            ['Sling Utilisation', (results.utilisation * 100)?.toFixed(1) || '-', '%'],
            ['Safety Factor', ((results as any).safety_factor ?? 0).toFixed(2), '-'],
          ],
        },
      ],
      checks: [
        {
          name: 'Sling Capacity Check',
          capacity: 'WLL Adequate',
          utilisation: `${(results.utilisation * 100)?.toFixed(1) || '-'}%`,
          status: ((results as any).is_adequate ?? false ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Sling Checks Report',
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
        {unit && <span className="text-xs text-neon-cyan">({unit})</span>}
      </div>
      <input
        type="number"
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white placeholder-gray-500 transition-all"
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
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-gray-900/50 p-4 rounded-2xl border border-gray-800 glass">
            <div className="flex items-center gap-2">
              {results && (
                <Button
                  onClick={handleExportPDF}
                  className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
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
                <SaveRunButton calculatorKey="sling-checks" inputs={formData as unknown as Record<string, string | number>} results={results} />
              )}
            </div>

            {/* View Tabs */}
            <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
              {[
                { key: 'input', label: 'Sling Selection' },
                { key: 'results', label: 'Results' },
                { key: 'visualization', label: 'Visualization' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  disabled={tab.key !== 'input' && !results}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === tab.key
                      ? 'bg-neon-cyan/20 text-neon-cyan shadow-lg'
                      : 'text-gray-400 hover:text-white',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Sling Checks
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BS 7121 sling capacity & safety checks
          </p>
        </motion.div>

        {activeTab === 'input' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                {/* Presets */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
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
                          className="border-gray-600 hover:border-neon-cyan"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Sling Selection */}
                <CollapsibleSection
                  title="Sling Selection"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLink className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  variant="amber"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Sling Type</label>
                      <select
                        title="Sling Type"
                        value={formData.sling_type}
                        onChange={(e) => updateForm('sling_type', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        <optgroup label="Grade 80 Chain">
                          {Object.entries(SLING_TYPES)
                            .filter(([k]) => k.includes('chain') && k.includes('G80'))
                            .map(([key, st]) => (
                              <option key={key} value={key}>
                                {st.name} ({st.wll_single}t)
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Grade 100 Chain">
                          {Object.entries(SLING_TYPES)
                            .filter(([k]) => k.includes('G100'))
                            .map(([key, st]) => (
                              <option key={key} value={key}>
                                {st.name} ({st.wll_single}t)
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Wire Rope">
                          {Object.entries(SLING_TYPES)
                            .filter(([k]) => k.includes('wire'))
                            .map(([key, st]) => (
                              <option key={key} value={key}>
                                {st.name} ({st.wll_single}t)
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Webbing Slings">
                          {Object.entries(SLING_TYPES)
                            .filter(([k]) => k.includes('web'))
                            .map(([key, st]) => (
                              <option key={key} value={key}>
                                {st.name} ({st.wll_single}t)
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Round Slings">
                          {Object.entries(SLING_TYPES)
                            .filter(([k]) => k.includes('round'))
                            .map(([key, st]) => (
                              <option key={key} value={key}>
                                {st.name} ({st.wll_single}t)
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Configuration</label>
                      <select
                        title="Configuration"
                        value={formData.sling_config}
                        onChange={(e) => updateForm('sling_config', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(SLING_CONFIGS).map(([key, sc]) => (
                          <option key={key} value={key}>
                            {sc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Sling Length" field="sling_length" unit="m" />
                    <InputField
                      label="Sling Angle"
                      field="sling_angle"
                      unit="°"
                      tooltip="From vertical"
                    />
                  </div>
                </CollapsibleSection>

                {/* Loading */}
                <CollapsibleSection
                  title="Loading"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  variant="blue"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Load Weight" field="load_weight" unit="kN" />
                    <InputField
                      label="Dynamic Factor"
                      field="dynamic_factor"
                      tooltip="Typically 1.1"
                    />
                    <InputField
                      label="Environmental Factor"
                      field="environmental_factor"
                      tooltip="Temperature, corrosion"
                    />
                    <InputField
                      label="COG Offset"
                      field="cog_offset"
                      unit="m"
                      tooltip="From centre"
                    />
                  </div>
                </CollapsibleSection>

                {/* Geometry */}
                <CollapsibleSection
                  title="Lift Geometry"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiGrid className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  variant="emerald"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InputField
                      label="Lift Height"
                      field="lift_height"
                      unit="m"
                      tooltip="Hook to load"
                    />
                    <InputField
                      label="Spread Width"
                      field="spread_width"
                      unit="m"
                      tooltip="Between attachment points"
                    />
                    <InputField
                      label="Design Factor"
                      field="design_factor"
                      tooltip="Additional factor"
                    />
                  </div>
                </CollapsibleSection>

                {/* Fittings */}
                <CollapsibleSection
                  title="End Fittings"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  variant="purple"
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Top Fitting</label>
                      <select
                        title="Top Fitting"
                        value={formData.top_fitting}
                        onChange={(e) => updateForm('top_fitting', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(END_FITTINGS).map(([key, ef]) => (
                          <option key={key} value={key}>
                            {ef.name} ({(ef.efficiency * 100).toFixed(0)}%)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Bottom Fitting</label>
                      <select
                        title="Bottom Fitting"
                        value={formData.bottom_fitting}
                        onChange={(e) => updateForm('bottom_fitting', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                      >
                        {Object.entries(END_FITTINGS).map(([key, ef]) => (
                          <option key={key} value={key}>
                            {ef.name} ({(ef.efficiency * 100).toFixed(0)}%)
                          </option>
                        ))}
                      </select>
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

              {/* Right Column — Sticky Sidebar */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="sticky top-32 space-y-4"
                >
                <WhatIfPreview
                  title="Sling Checks — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <SlingChecks3D />
                    </Interactive3DDiagram>
                  )}
                />

                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <FiInfo className="text-neon-cyan" />
                      Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      • <strong>BS EN 1492:</strong> Textile slings
                    </p>
                    <p>
                      • <strong>BS EN 818:</strong> Chain slings
                    </p>
                    <p>
                      • <strong>BS EN 13414:</strong> Wire rope slings
                    </p>
                    <p>
                      • <strong>LEEA:</strong> Code of Practice
                    </p>
                    <p className="pt-2 text-neon-cyan">LOLER inspection required</p>
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
                { label: 'Applied Load', value: `${formData.load_weight} kN`, icon: <FiLayers />, pass: true },
                { label: 'Factored Load', value: `${results.factored_load.toFixed(1)} kN`, icon: <FiZap />, pass: true },
                { label: 'Load/Leg', value: `${results.load_per_leg.toFixed(2)} t`, icon: <FiActivity />, pass: results.status === 'PASS' },
                { label: 'Angle', value: `${results.actual_angle.toFixed(1)}°`, icon: <FiGrid />, pass: results.actual_angle <= 60 },
                { label: 'Utilisation', value: `${(results.utilisation * 100).toFixed(1)}%`, icon: <FiLink />, pass: results.utilisation <= 1.0 },
                { label: 'Rating', value: results.rating, icon: <FiCheck />, pass: results.status === 'PASS' },
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

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Sling Capacity */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FiLink className="w-6 h-6 text-neon-cyan" />
                      </motion.div>
                      <span>Sling Capacity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <div className="text-gray-400 text-xs">Single Leg WLL</div>
                        <div className="text-lg font-bold text-white">
                          {results.sling_wll_single.toFixed(1)} t
                        </div>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <div className="text-gray-400 text-xs">MBL</div>
                        <div className="text-lg font-bold text-white">
                          {results.sling_mbl.toFixed(1)} t
                        </div>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <div className="text-gray-400 text-xs">Config Capacity</div>
                        <div className="text-lg font-bold text-emerald-400">
                          {(results.sling_capacity_config * 10).toFixed(0)} kN
                        </div>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <div className="text-gray-400 text-xs">Efficiency</div>
                        <div className="text-lg font-bold text-white">
                          {(results.efficiency * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Utilisation bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Utilisation</span>
                        <span
                          className={cn(
                            'font-medium',
                            results.status === 'PASS' ? 'text-white' : 'text-red-400',
                          )}
                        >
                          {(results.utilisation * 100).toFixed(1)}% — {results.status}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all',
                            results.utilisation <= 0.7
                              ? 'bg-emerald-500'
                              : results.utilisation <= 1.0
                                ? 'bg-amber-500'
                                : 'bg-red-500',
                          )}
                          style={{ width: `${Math.min(results.utilisation * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Geometry Check */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FiGrid className="w-6 h-6 text-neon-cyan" />
                      </motion.div>
                      <span>Geometry Verification</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <div className="text-gray-400 text-xs">Required Length</div>
                        <div className="text-lg font-bold text-white">
                          {results.actual_length_req.toFixed(2)} m
                        </div>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <div className="text-gray-400 text-xs">Provided Length</div>
                        <div className="text-lg font-bold text-white">
                          {formData.sling_length} m
                        </div>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl">
                        <div className="text-gray-400 text-xs">Calculated Angle</div>
                        <div className="text-lg font-bold text-white">
                          {results.actual_angle.toFixed(1)}°
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column — Sticky */}
              <div className="sticky top-32 space-y-4 self-start">
                <Card
                  variant="glass"
                  className={cn(
                    'border-2 shadow-2xl',
                    results.status === 'PASS'
                      ? 'border-emerald-500/30 shadow-emerald-500/20'
                      : 'border-red-500/30 shadow-red-500/20',
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
                      {(results.utilisation * 100).toFixed(0)}% Utilised
                    </div>
                  </CardContent>
                </Card>

                {results.warnings.length > 0 && (
                  <Card variant="glass" className="border-amber-500/30 shadow-2xl">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <FiAlertTriangle />
                        <span className="font-medium">Warnings</span>
                      </div>
                      <ul className="text-sm text-white space-y-1">
                        {results.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                        <FiCheck className="w-3 h-3 text-white" />
                      </div>
                      Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p className="text-gray-400">{results.min_sling_size}</p>
                    <div className="flex justify-between pt-2 border-t border-gray-700">
                      <span className="text-gray-400">Sling Type</span>
                      <span className="text-white">{SLING_TYPES[formData.sling_type]?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Configuration</span>
                      <span className="text-white">
                        {SLING_CONFIGS[formData.sling_config]?.name}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* Visualization Tab */}
        {activeTab === 'visualization' && results && (
          <motion.div
            key="visualization"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 space-y-4"
          >
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-white">Sling Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="500px" cameraPosition={[6, 5, 6]}>
                  <SlingChecks3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
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
                  <SlingChecks3D />
                </Interactive3DDiagram>
                <button
                  onClick={() => setPreviewMaximized(false)}
                  className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                  aria-label="Minimize preview"
                >
                  <FiMinimize2 size={20} />
                </button>
                <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                  SLING CHECKS — REAL-TIME PREVIEW
                </div>
              </div>
              <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                  <FiSliders size={14} /> Live Parameters
                </h3>
                {[
                  { label: 'Sling Type', value: formData.sling_type || '-' },
                  { label: 'Config', value: formData.sling_config || '-' },
                  { label: 'Sling Length', value: `${formData.sling_length || '0'} m` },
                  { label: 'No. Legs', value: formData.num_legs || '-' },
                  { label: 'Load Weight', value: `${formData.load_weight || '0'} kN` },
                  { label: 'Sling Angle', value: `${formData.sling_angle || '0'}°` },
                  { label: 'Dynamic Factor', value: formData.dynamic_factor || '-' },
                  { label: 'Design Factor', value: formData.design_factor || '-' },
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
                  {results ? (
                    <>
                      {[
                        { label: 'Load/Leg', value: `${results.load_per_leg.toFixed(2)} t` },
                        { label: 'Factored Load', value: `${results.factored_load.toFixed(1)} kN` },
                        { label: 'Angle Factor', value: results.angle_factor.toFixed(3) },
                        { label: 'Utilisation', value: `${(results.utilisation * 100).toFixed(1)}%` },
                        { label: 'Status', value: results.status },
                      ].map((stat) => (
                        <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                          <span className="text-gray-500">{stat.label}</span>
                          <span className={cn('font-medium', results.status === 'FAIL' ? 'text-red-400' : 'text-emerald-400')}>{stat.value}</span>
                        </div>
                      ))}
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Last Analysis</div>
                        {[
                          { label: 'Sling WLL', value: `${results.sling_wll_single.toFixed(1)} t`, pass: true },
                          { label: 'Capacity (config)', value: `${results.sling_capacity_config.toFixed(1)} t`, pass: true },
                          { label: 'Efficiency', value: `${(results.efficiency * 100).toFixed(0)}%`, pass: results.efficiency >= 0.8 },
                        ].map((check) => (
                          <div key={check.label} className="flex justify-between text-xs py-0.5">
                            <span className="text-gray-500">{check.label}</span>
                            <span className={cn('font-bold', check.pass ? 'text-emerald-400' : 'text-red-500')}>{check.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
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

export default SlingChecks;
