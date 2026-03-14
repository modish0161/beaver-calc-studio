// =============================================================================
// Excavation & Sheet Pile Calculator — Premium Edition
// EN 1997-1 & BS 8002 Embedded Retaining Wall Design
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
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiShield,
    FiSliders,
    FiTarget,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildExcavationSheetPileReport } from '../../lib/pdf/builders/excavationSheetPileBuilder';
import { cn } from '../../lib/utils';

import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SheetPile3D from '../../components/3d/scenes/SheetPile3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { PILE_STEEL_GRADES as STEEL_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Excavation
  excavationDepth: string;
  embedmentDepth: string;
  wallType: string;
  // Soil Properties
  soilType: string;
  phi: string;
  gamma: string;
  cohesion: string;
  deltaRatio: string;
  // Loading
  surcharge: string;
  waterDepth: string;
  // Section
  pileSection: string;
  steelGrade: string;
  // Safety
  safetyFactorPassive: string;
  designApproach: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Earth Pressures
  Ka: number;
  Kp: number;
  activeForce: number;
  passiveForce: number;
  surchargeForce: number;
  waterForce: number;
  // Equilibrium
  momentDemand: number;
  momentResisting: number;
  embedmentRatio: number;
  embedmentStatus: string;
  // Section
  requiredModulus: number;
  providedModulus: number;
  sectionUtilisation: number;
  sectionStatus: string;
  // Toe Penetration
  toeCapacity: number;
  toeDemand: number;
  toeUtilisation: number;
  toeStatus: string;
  // Overall
  overallStatus: string;
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const SOIL_TYPES = {
  loose_sand: { name: 'Loose Sand', phi: 28, gamma: 17, coh: 0, color: '#fcd34d' },
  medium_sand: { name: 'Medium Dense Sand', phi: 32, gamma: 18, coh: 0, color: '#f59e0b' },
  dense_sand: { name: 'Dense Sand', phi: 36, gamma: 19, coh: 0, color: '#d97706' },
  gravel: { name: 'Sandy Gravel', phi: 38, gamma: 20, coh: 0, color: '#b45309' },
  soft_clay: { name: 'Soft Clay (Undrained)', phi: 0, gamma: 16, coh: 25, color: '#a8a29e' },
  firm_clay: { name: 'Firm Clay (Undrained)', phi: 0, gamma: 18, coh: 50, color: '#78716c' },
  stiff_clay: { name: 'Stiff Clay (Drained)', phi: 25, gamma: 19, coh: 10, color: '#57534e' },
};

const WALL_TYPES = {
  sheet_pile: { name: 'Steel Sheet Pile', description: 'Interlocking steel sections' },
  soldier_pile: { name: 'Soldier Piles & Lagging', description: 'H-piles with timber lagging' },
  secant: { name: 'Secant Pile Wall', description: 'Overlapping bored piles' },
  contiguous: { name: 'Contiguous Pile Wall', description: 'Adjacent bored piles' },
  diaphragm: { name: 'Diaphragm Wall', description: 'Cast in-situ concrete' },
};

const PILE_SECTIONS = {
  Larssen_6W: { name: 'Larssen 6W', Z: 1730, I: 31000, weight: 102, description: 'Light' },
  Larssen_12: { name: 'Larssen 12', Z: 2100, I: 42000, weight: 115, description: 'Light-Medium' },
  AZ_18: { name: 'AZ 18', Z: 1800, I: 30900, weight: 95, description: 'Medium' },
  AZ_26: { name: 'AZ 26', Z: 2600, I: 47200, weight: 117, description: 'Medium' },
  AZ_36: { name: 'AZ 36', Z: 3600, I: 72000, weight: 145, description: 'Heavy' },
  AZ_50: { name: 'AZ 50', Z: 5000, I: 115000, weight: 185, description: 'Heavy' },
  HZ_880A: { name: 'HZ 880-A', Z: 5600, I: 140000, weight: 208, description: 'Extra Heavy' },
  AU_14: { name: 'AU 14', Z: 1400, I: 21000, weight: 74, description: 'Light' },
  AU_20: { name: 'AU 20', Z: 2000, I: 36000, weight: 100, description: 'Medium' },
  AU_25: { name: 'AU 25', Z: 2500, I: 50000, weight: 127, description: 'Medium-Heavy' },
};

const DESIGN_APPROACHES = {
  DA1_C1: { name: 'DA1 Combination 1', gammaG: 1.35, gammaQ: 1.5, gammaPhi: 1.0, gammaR: 1.0 },
  DA1_C2: { name: 'DA1 Combination 2', gammaG: 1.0, gammaQ: 1.3, gammaPhi: 1.25, gammaR: 1.0 },
  DA2: { name: 'DA2', gammaG: 1.35, gammaQ: 1.5, gammaPhi: 1.0, gammaR: 1.4 },
  BS8002: { name: 'BS 8002 (FOS)', gammaG: 1.0, gammaQ: 1.0, gammaPhi: 1.0, gammaR: 1.5 },
};

const PRESETS = {
  shallow_sand: {
    name: 'Shallow in Sand (3m)',
    excavationDepth: '3.0',
    embedmentDepth: '3.0',
    wallType: 'sheet_pile',
    soilType: 'medium_sand',
    surcharge: '10',
    waterDepth: '10',
    pileSection: 'AZ_18',
  },
  deep_sand: {
    name: 'Deep in Sand (6m)',
    excavationDepth: '6.0',
    embedmentDepth: '6.0',
    wallType: 'sheet_pile',
    soilType: 'medium_sand',
    surcharge: '10',
    waterDepth: '10',
    pileSection: 'AZ_36',
  },
  clay_cantilever: {
    name: 'Clay Cantilever (4m)',
    excavationDepth: '4.0',
    embedmentDepth: '4.0',
    wallType: 'sheet_pile',
    soilType: 'stiff_clay',
    surcharge: '10',
    waterDepth: '15',
    pileSection: 'AZ_26',
  },
  basement: {
    name: 'Basement Excavation (5m)',
    excavationDepth: '5.0',
    embedmentDepth: '5.0',
    wallType: 'secant',
    soilType: 'firm_clay',
    surcharge: '15',
    waterDepth: '8',
    pileSection: 'AZ_36',
  },
};

const ExcavationSheetPile = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    cohesion: '',
    deltaRatio: '',
    designApproach: '',
    embedmentDepth: '',
    excavationDepth: '',
    gamma: '',
    phi: '',
    pileSection: '',
    projectName: '',
    reference: '',
    safetyFactorPassive: '',
    soilType: '',
    steelGrade: '',
    surcharge: '',
    wallType: '',
    waterDepth: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'cohesion', label: 'Cohesion' },
  { key: 'deltaRatio', label: 'Delta Ratio' },
  { key: 'designApproach', label: 'Design Approach' },
  { key: 'embedmentDepth', label: 'Embedment Depth' },
  { key: 'excavationDepth', label: 'Excavation Depth' },
  { key: 'gamma', label: 'Gamma' },
  { key: 'phi', label: 'Phi' },
  { key: 'pileSection', label: 'Pile Section' },
  { key: 'safetyFactorPassive', label: 'Safety Factor Passive' },
  { key: 'surcharge', label: 'Surcharge' },
  { key: 'waterDepth', label: 'Water Depth' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'excavationDepth', label: 'Excavation Depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'embedmentDepth', label: 'Embedment Depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'wallType', label: 'Wall Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'soilType', label: 'Soil Type', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<{ check: string; suggestion: string }[]>(
    [],
  );
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

  const applySoilType = (key: string) => {
    const soil = (SOIL_TYPES as any)[key];
    if (soil) {
      setFormData((prev) => ({
        ...prev,
        soilType: key,
        phi: String(soil.phi),
        gamma: String(soil.gamma),
        cohesion: String(soil.coh),
      }));
    }
  };

  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);
    setRecommendations([]);
    setTimeout(() => {
      try {
        const w: string[] = [];

        // Parse inputs
        const H = parseFloat(formData.excavationDepth) || 3.0;
        const D = parseFloat(formData.embedmentDepth) || H;
        const phi = parseFloat(formData.phi) || 30;
        const gamma = parseFloat(formData.gamma) || 18;
        const coh = parseFloat(formData.cohesion) || 0;
        const deltaRatio = parseFloat(formData.deltaRatio) || 0.67;
        const surcharge = parseFloat(formData.surcharge) || 10;
        const waterDepth = parseFloat(formData.waterDepth) || H + D;

        // Design approach
        const da =
          DESIGN_APPROACHES[formData.designApproach as keyof typeof DESIGN_APPROACHES] ||
          DESIGN_APPROACHES.DA1_C2;
        const gammaPhi = da.gammaPhi;
        const gammaR = da.gammaR;

        // Factored soil parameters
        const phi_d = Math.atan(Math.tan((phi * Math.PI) / 180) / gammaPhi) * (180 / Math.PI);
        const phi_d_rad = (phi_d * Math.PI) / 180;
        const delta_d = phi_d * deltaRatio;
        const delta_d_rad = (delta_d * Math.PI) / 180;

        // Rankine earth pressure coefficients
        const Ka = Math.pow(Math.tan(Math.PI / 4 - phi_d_rad / 2), 2);
        const Kp = Math.pow(Math.tan(Math.PI / 4 + phi_d_rad / 2), 2);

        // Cohesion reduction
        const Kac = 2 * Math.sqrt(Ka);
        const Kpc = 2 * Math.sqrt(Kp);
        const c_d = coh / gammaPhi;

        // Active forces (on retained side, from 0 to H+D)
        const totalH = H + D;
        const sigma_a_base = gamma * totalH * Ka + surcharge * Ka - Kac * c_d;
        const activeForce =
          0.5 * gamma * Ka * totalH * totalH + surcharge * Ka * totalH - Kac * c_d * totalH;

        // Surcharge force
        const surchargeForce = surcharge * Ka * totalH;

        // Passive forces (on excavated side, from 0 to D)
        const sigma_p_base = gamma * D * Kp + Kpc * c_d;
        const passiveForce = (0.5 * gamma * Kp * D * D + Kpc * c_d * D) / gammaR;

        // Water force (if water present within wall)
        let waterForce = 0;
        if (waterDepth < totalH) {
          const hw = totalH - waterDepth;
          waterForce = 0.5 * 9.81 * hw * hw;
        }

        // Moment equilibrium about toe (cantilever)
        const momentActive =
          (gamma * Ka * totalH * totalH * totalH) / 6 +
          (surcharge * Ka * totalH * totalH) / 2 -
          (Kac * c_d * totalH * totalH) / 2;
        const momentPassive = ((gamma * Kp * D * D * D) / 6 + (Kpc * c_d * D * D) / 2) / gammaR;

        const momentDemand = momentActive + (waterForce * (totalH - waterDepth)) / 3;
        const momentResisting = momentPassive;
        const embedmentRatio = momentResisting > 0 ? momentResisting / momentDemand : 0;
        const embedmentStatus = embedmentRatio >= 1.0 ? 'ADEQUATE' : 'INSUFFICIENT';

        // Section check
        const section =
          PILE_SECTIONS[formData.pileSection as keyof typeof PILE_SECTIONS] || PILE_SECTIONS.AZ_26;
        const grade =
          STEEL_GRADES[formData.steelGrade as keyof typeof STEEL_GRADES] || STEEL_GRADES.S355GP;
        const requiredModulus = (momentDemand * 1e6) / grade.fy; // cm³
        const providedModulus = section.Z;
        const sectionUtilisation = requiredModulus / providedModulus;
        const sectionStatus = sectionUtilisation <= 1.0 ? 'PASS' : 'FAIL';

        // Toe check
        const toeCapacity = passiveForce;
        const toeDemand = activeForce + waterForce - passiveForce;
        const toeUtilisation = toeCapacity > 0 ? Math.abs(toeDemand) / toeCapacity : 999;
        const toeStatus = toeUtilisation <= 1.0 ? 'PASS' : 'FAIL';

        // Warnings
        if (embedmentRatio < 1.0) w.push('Embedment depth insufficient — increase D');
        if (sectionUtilisation > 1.0) w.push('Section modulus exceeded — use heavier section');
        if (D / H < 0.8) w.push('Embedment/excavation ratio < 0.8 — check stability');
        if (waterForce > 0) w.push('Water pressure acting on wall');
        if (surcharge > 20) w.push('High surcharge loading');

        // Overall rating
        const maxUtil = Math.max(sectionUtilisation, 1 / embedmentRatio);
        let rating = 'PASS';
        let ratingColor = '#22c55e';
        if (maxUtil > 1.0) {
          rating = 'FAIL';
          ratingColor = '#ef4444';
        } else if (maxUtil > 0.85) {
          rating = 'MARGINAL';
          ratingColor = '#f59e0b';
        } else if (maxUtil > 0.6) {
          rating = 'ADEQUATE';
          ratingColor = '#3b82f6';
        }

        setResults({
          Ka,
          Kp,
          activeForce,
          passiveForce,
          surchargeForce,
          waterForce,
          momentDemand,
          momentResisting,
          embedmentRatio,
          embedmentStatus,
          requiredModulus,
          providedModulus,
          sectionUtilisation,
          sectionStatus,
          toeCapacity,
          toeDemand,
          toeUtilisation,
          toeStatus,
          overallStatus: `${H}m excavation, ${D}m embedment — ${rating}`,
          rating,
          ratingColor,
        });

        // Recommendations
        const recs: { check: string; suggestion: string }[] = [];
        if (sectionUtilisation < 0.4)
          recs.push({
            check: 'Section Utilisation',
            suggestion:
              'Section is significantly under-utilised — consider a lighter pile section to reduce cost',
          });
        if (sectionUtilisation > 0.85)
          recs.push({
            check: 'Section Utilisation',
            suggestion:
              'Section utilisation is high — consider increasing section modulus for additional safety margin',
          });
        if (D / H < 1.0)
          recs.push({
            check: 'Embedment Depth',
            suggestion:
              'Embedment-to-excavation ratio is below 1.0 — deeper embedment improves stability',
          });
        if (D / H > 2.0)
          recs.push({
            check: 'Embedment Depth',
            suggestion:
              'Embedment-to-excavation ratio exceeds 2.0 — may be possible to reduce embedment depth',
          });
        if (waterForce > 0)
          recs.push({
            check: 'Water Pressure',
            suggestion:
              'Water pressure is present — consider dewatering or drainage to reduce lateral loads',
          });
        if (surcharge > 10)
          recs.push({
            check: 'Surcharge Loading',
            suggestion:
              'Significant surcharge present — ensure construction traffic is controlled near the excavation',
          });
        if (recs.length === 0)
          recs.push({
            check: 'Design Status',
            suggestion: 'All checks within acceptable limits — design is satisfactory',
          });
        setRecommendations(recs);
        setWarnings(w);
      } catch (e) {
        console.error('Calculation error:', e);
      }
      setIsCalculating(false);
    }, 500);
  }, [formData]);

  const handleExportPDF = useCallback(() => {
    if (!results) return;
    const report = buildExcavationSheetPileReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  // DOCX Export — Editable Word document
  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Excavation Sheet Pile Design',
      subtitle: 'EC7 / BS 8002 Compliant',
      projectInfo: [
        { label: 'Project', value: (formData as any).projectName || '-' },
        { label: 'Reference', value: (formData as any).reference || '-' },
      ],
      inputs: [
        { label: 'Excavation Depth', value: (formData as any).excavation_depth || '0', unit: 'm' },
        { label: 'Embedment Depth', value: (formData as any).embedment_depth || '0', unit: 'm' },
        { label: 'Soil Type', value: (formData as any).soil_type || '-', unit: '' },
        { label: 'Water Level', value: (formData as any).water_level || '0', unit: 'm' },
      ],
      checks: [
        {
          name: 'Embedment',
          capacity: `${(results as any).required_embedment?.toFixed(2) || '-'} m`,
          utilisation: `${(results as any).embedment_ratio?.toFixed(1) || '-'}%`,
          status: ((results as any).embedment_check || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Bending',
          capacity: `${(results as any).moment_capacity?.toFixed(1) || '-'} kNm/m`,
          utilisation: `${(results as any).bending_utilisation?.toFixed(1) || '-'}%`,
          status: ((results as any).bending_check || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Stability',
          capacity: '-',
          utilisation: `${(results as any).stability_ratio?.toFixed(1) || '-'}%`,
          status: ((results as any).stability_check || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Overall',
          suggestion:
            (results as any).overall_status === 'PASS'
              ? 'Design adequate'
              : 'Revise embedment or section',
        },
      ],
      warnings: [],
      footerNote: 'Beaver Bridges Ltd — Excavation Sheet Pile Design',
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

  const ResultCard: React.FC<{
    title: string;
    value: string;
    unit: string;
    status?: string;
    icon: React.ReactNode;
  }> = ({ title, value, unit, status, icon }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border shadow-lg',
        status === 'PASS'
          ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/5 border-l-4 border-l-emerald-500'
          : status === 'FAIL'
            ? 'bg-red-500/10 border-red-500/30 shadow-red-500/5 border-l-4 border-l-red-500'
            : 'bg-gray-800/50 border-gray-700/50 shadow-gray-500/5',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-neon-cyan">{icon}</span>
        <span className="text-gray-400 text-sm">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-gray-500 text-sm">{unit}</span>
      </div>
      {status && (
        <div
          className={cn(
            'mt-2 text-xs font-medium',
            status === 'PASS' ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {status}
        </div>
      )}
    </motion.div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid Pattern Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

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
              <SheetPile3D />
            </Interactive3DDiagram>
            <button
              onClick={() => setPreviewMaximized(false)}
              className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
              aria-label="Minimize preview"
            >
              <FiMinimize2 size={20} />
            </button>
            <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
              SHEET PILE DESIGN — REAL-TIME PREVIEW
            </div>
          </div>
          <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
            <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
              <FiSliders size={14} /> Live Parameters
            </h3>
            {[
              { label: 'Excavation Depth', key: 'excavationDepth', min: 1, max: 20, step: 0.5, unit: 'm' },
              { label: 'Embedment Depth', key: 'embedmentDepth', min: 1, max: 20, step: 0.5, unit: 'm' },
              { label: 'Surcharge', key: 'surcharge', min: 0, max: 50, step: 5, unit: 'kPa' },
            ].map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">{s.label}</span>
                  <span className="text-white">{(formData as any)[s.key]} {s.unit}</span>
                </div>
                <input
                  title={s.label}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={(formData as any)[s.key]}
                  onChange={(e) => updateForm(s.key as keyof FormData, e.target.value)}
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
                { label: 'Wall Type', value: formData.wallType },
                { label: 'Excavation', value: `${formData.excavationDepth} m` },
                { label: 'Embedment', value: `${formData.embedmentDepth} m` },
                { label: 'Soil Type', value: formData.soilType },
                { label: 'Pile Section', value: formData.pileSection },
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
                    { label: 'Embedment Ratio', value: `${results.embedmentRatio.toFixed(2)}`, ok: results.embedmentStatus !== 'FAIL' },
                    { label: 'Section Util', value: `${(results.sectionUtilisation * 100).toFixed(0)}%`, ok: results.sectionUtilisation <= 1 },
                    { label: 'Toe Util', value: `${(results.toeUtilisation * 100).toFixed(0)}%`, ok: results.toeUtilisation <= 1 },
                    { label: 'Status', value: results.overallStatus, ok: results.overallStatus === 'PASS' },
                  ].map((check) => (
                    <div key={check.label} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-500">{check.label}</span>
                      <span className={cn('font-bold', check.ok ? 'text-emerald-400' : 'text-red-500')}>
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6">
            <div>
              <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
                Sheet Pile Design
              </h1>
              <p className="text-lg text-gray-400 mt-2">EN 1997-1 & BS 8002 Embedded Retaining Wall</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  runCalculation();
                  setActiveTab('results');
                }}
                disabled={isCalculating}
                className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
              >
                {isCalculating ? (
                  <FiActivity className="animate-spin mr-2" />
                ) : (
                  <FiZap className="mr-2" />
                )}
                ⚡ ANALYSE
              </Button>
              {results && (
                <>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="border-neon-cyan/50 text-neon-cyan"
                  >
                    <FiDownload className="mr-2" />
                    PDF
                  </Button>
                  <Button
                    onClick={handleExportDOCX}
                    variant="outline"
                    className="border-neon-purple/50 text-neon-purple"
                  >
                    <FiDownload className="mr-2" />
                    DOCX
                  </Button>
                  <SaveRunButton
                    calculatorKey="excavation_sheet_pile"
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
          </div>
        </motion.div>
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab as any)}
              disabled={tab !== 'input' && !results}
              className={activeTab === tab ? 'bg-gradient-to-r from-neon-cyan to-neon-blue w-32' : 'w-32'}
            >
              {tab === 'input' && 'Design Input'}
              {tab === 'results' && 'Results'}
              {tab === 'visualization' && 'Diagram'}
            </Button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Left Column - Inputs */}
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
                          className="border-gray-600 hover:border-neon-cyan hover:text-neon-cyan"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Excavation Geometry */}
                <CollapsibleSection
                  title="Excavation Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <InputField label="Excavation Depth (H)" field="excavationDepth" unit="m" />
                    <InputField label="Embedment Depth (D)" field="embedmentDepth" unit="m" />
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Wall Type</label>
                      <select
                        title="Wall Type"
                        value={formData.wallType}
                        onChange={(e) => updateForm('wallType', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(WALL_TYPES).map(([key, type]) => (
                          <option key={key} value={key}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Soil Properties */}
                <CollapsibleSection
                  title="Soil Properties"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiShield className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Soil Type</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(SOIL_TYPES).map(([key, soil]) => (
                        <Button
                          key={key}
                          variant={formData.soilType === key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => applySoilType(key)}
                          className={cn(
                            formData.soilType === key
                              ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white'
                              : 'border-gray-600 hover:border-neon-cyan',
                          )}
                        >
                          {soil.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Friction Angle (φ)" field="phi" unit="°" />
                    <InputField label="Unit Weight (γ)" field="gamma" unit="kN/m³" />
                    <InputField label="Cohesion (c)" field="cohesion" unit="kPa" />
                    <InputField label="Wall Friction (δ/φ)" field="deltaRatio" />
                  </div>
                </CollapsibleSection>

                {/* Loading & Water */}
                <CollapsibleSection
                  title="Loading & Water"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Surcharge (q)" field="surcharge" unit="kPa" />
                    <InputField label="Water Depth (below GL)" field="waterDepth" unit="m" />
                  </div>
                </CollapsibleSection>

                {/* Section Selection */}
                <CollapsibleSection
                  title="Section & Material"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Pile Section</label>
                      <select
                        title="Pile Section"
                        value={formData.pileSection}
                        onChange={(e) => updateForm('pileSection', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(PILE_SECTIONS).map(([key, sec]) => (
                          <option key={key} value={key}>
                            {sec.name} (Z={sec.Z} cm³/m)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Steel Grade</label>
                      <select
                        title="Steel Grade"
                        value={formData.steelGrade}
                        onChange={(e) => updateForm('steelGrade', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(STEEL_GRADES).map(([key, grade]) => (
                          <option key={key} value={key}>
                            {key} (fy={grade.fy} MPa)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Design Parameters */}
                <CollapsibleSection
                  title="Design Parameters"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Design Approach</label>
                      <select
                        title="Design Approach"
                        value={formData.designApproach}
                        onChange={(e) => updateForm('designApproach', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(DESIGN_APPROACHES).map(([key, da]) => (
                          <option key={key} value={key}>
                            {da.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Passive FOS" field="safetyFactorPassive" />
                  </div>
                </CollapsibleSection>

                {/* Full-Width Calculate Button */}
                <button
                  onClick={() => { runCalculation(); setActiveTab('results'); }}
                  disabled={isCalculating}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCalculating ? '⏳ CALCULATING...' : '⚡ RUN FULL ANALYSIS'}
                </button>
              </div>

              {/* Right Column - Visualization & Results */}
              <div className="sticky top-8 space-y-4">
                {/* Visualization */}
                <div className="relative">
                  <button
                    onClick={() => setPreviewMaximized(true)}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                    aria-label="Maximize preview"
                    title="Fullscreen preview"
                  >
                    <FiMaximize2 size={16} />
                  </button>
                </div>
                <WhatIfPreview
                  title="Excavation Sheet Pile — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <SheetPile3D />
                    </Interactive3DDiagram>
                  )}
                />

                {/* Results */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Overall Rating */}
                    <Card
                      className="border-2 shadow-lg"
                      style={{
                        borderColor: results.ratingColor,
                        backgroundColor: `${results.ratingColor}10`,
                        boxShadow: `0 10px 15px -3px ${results.ratingColor}20`,
                      }}
                    >
                      <CardContent className="py-4 text-center">
                        <div className="text-3xl font-bold" style={{ color: results.ratingColor }}>
                          {results.rating}
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Max Util:{' '}
                          {(
                            Math.max(
                              1 / results.embedmentRatio,
                              results.sectionUtilisation,
                              results.toeUtilisation,
                            ) * 100
                          ).toFixed(1)}
                          %
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Results */}
                    <div className="grid grid-cols-2 gap-3">
                      <ResultCard
                        title="Ka"
                        value={results.Ka.toFixed(3)}
                        unit=""
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FiActivity className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="Kp"
                        value={results.Kp.toFixed(3)}
                        unit=""
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FiActivity className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="Embedment"
                        value={(results.embedmentRatio * 100).toFixed(0)}
                        unit="%"
                        status={results.embedmentStatus}
                        icon={
                          results.embedmentStatus === 'PASS' ? <FiCheck /> : <FiAlertTriangle />
                        }
                      />
                      <ResultCard
                        title="Section"
                        value={(results.sectionUtilisation * 100).toFixed(0)}
                        unit="%"
                        status={results.sectionStatus}
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <FiShield className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="Active Force"
                        value={results.activeForce.toFixed(1)}
                        unit="kN/m"
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <FiTarget className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="Passive Force"
                        value={results.passiveForce.toFixed(1)}
                        unit="kN/m"
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <FiTarget className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                    </div>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Card className="bg-amber-500/10 border-amber-500/30 border-l-4 border-l-amber-500">
                        <CardContent className="py-3">
                          <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <FiAlertTriangle />
                            <span className="font-medium">Warnings</span>
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
                    {recommendations.length > 0 && (
                      <Card className="bg-blue-500/10 border-blue-500/30 border-l-4 border-l-blue-500">
                        <CardContent className="py-3">
                          <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <FiCheck />
                            <span className="font-medium">Recommendations</span>
                          </div>
                          <ul className="text-sm text-blue-300 space-y-2">
                            {recommendations.map((r, i) => (
                              <li key={i}>
                                <span className="text-blue-400 font-medium">{r.check}:</span>{' '}
                                {r.suggestion}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
          {activeTab === 'results' && results && (
            <motion.div
              key="results-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Overall Rating */}
              <Card
                className="border-2 shadow-lg"
                style={{
                  borderColor: results.ratingColor,
                  backgroundColor: `${results.ratingColor}10`,
                  boxShadow: `0 10px 15px -3px ${results.ratingColor}20`,
                }}
              >
                <CardContent className="py-4 text-center">
                  <div className="text-3xl font-bold" style={{ color: results.ratingColor }}>
                    {results.rating}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Max Util:{' '}
                    {(
                      Math.max(
                        1 / results.embedmentRatio,
                        results.sectionUtilisation,
                        results.toeUtilisation,
                      ) * 100
                    ).toFixed(1)}
                    %
                  </div>
                </CardContent>
              </Card>

              {/* Key Results */}
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  title="Ka"
                  value={results.Ka.toFixed(3)}
                  unit=""
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <FiActivity className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
                <ResultCard
                  title="Kp"
                  value={results.Kp.toFixed(3)}
                  unit=""
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <FiActivity className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
                <ResultCard
                  title="Embedment"
                  value={(results.embedmentRatio * 100).toFixed(0)}
                  unit="%"
                  status={results.embedmentStatus}
                  icon={results.embedmentStatus === 'PASS' ? <FiCheck /> : <FiAlertTriangle />}
                />
                <ResultCard
                  title="Section"
                  value={(results.sectionUtilisation * 100).toFixed(0)}
                  unit="%"
                  status={results.sectionStatus}
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <FiShield className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
                <ResultCard
                  title="Active Force"
                  value={results.activeForce.toFixed(1)}
                  unit="kN/m"
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <FiTarget className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
                <ResultCard
                  title="Passive Force"
                  value={results.passiveForce.toFixed(1)}
                  unit="kN/m"
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <FiTarget className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <Card className="bg-amber-500/10 border-amber-500/30 border-l-4 border-l-amber-500">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                      <FiAlertTriangle />
                      <span className="font-medium">Warnings</span>
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
              {recommendations.length > 0 && (
                <Card className="bg-blue-500/10 border-blue-500/30 border-l-4 border-l-blue-500">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <FiCheck />
                      <span className="font-medium">Recommendations</span>
                    </div>
                    <ul className="text-sm text-blue-300 space-y-2">
                      {recommendations.map((r, i) => (
                        <li key={i}>
                          <span className="text-blue-400 font-medium">{r.check}:</span>{' '}
                          {r.suggestion}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-white">Wall Cross Section</CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                    <SheetPile3D />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
  );
};

export default ExcavationSheetPile;
