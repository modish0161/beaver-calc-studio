// =============================================================================
// Weld Sizing Calculator — Premium Version
// EN 1993-1-8 (Eurocode 3) — Fillet, Butt & Partial Penetration Welds
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
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import WeldSizing3D from '../../components/3d/scenes/WeldSizing3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { ELECTRODE_GRADES } from '../../data/boltData';
import { STEEL_GRADES } from '../../data/materialGrades';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// Types
// =============================================================================

interface WeldSizingForm {
  // Weld Configuration
  weldType: string;
  weldLength: string;
  throatThickness: string;
  legLength: string;
  electrodeGrade: string;

  // Parent Material
  parentMaterialGrade: string;
  plateThickness1: string;
  plateThickness2: string;

  // Applied Forces
  appliedForce: string;
  forceAngle: string;
  axialForce: string;
  shearForce: string;

  // Analysis Method
  useDirectionalMethod: boolean;

  // Safety Factors
  gammaM2: string;

  // Project Info
  projectName: string;
  reference: string;
}

interface WeldSizingResults {
  // Material Properties
  fu: number;
  betaW: number;
  fvwd: number;

  // Weld Geometry
  effectiveThroat: number;
  effectiveLength: number;
  weldArea: number;

  // Stress Analysis - Simplified Method
  appliedStress: number;
  simplifiedUtil: number;
  simplifiedStatus: string;

  // Stress Analysis - Directional Method
  sigmaPerpendicular: number;
  tauPerpendicular: number;
  tauParallel: number;
  combinedStress: number;
  sigmaPerpLimit: number;
  directionalUtil1: number;
  directionalUtil2: number;
  directionalStatus: string;

  // Weld Capacity
  Fw_Rd: number;
  appliedForceTotal: number;
  capacityUtil: number;

  // Minimum Weld Checks
  minLegLength: number;
  minThroat: number;
  minLengthRequired: number;
  geometryCheck: string;

  // Overall
  maxUtil: number;
  criticalCheck: string;
  status: string;
}

// =============================================================================
// Material Databases
// =============================================================================



// Minimum leg length per thinnest plate thickness (EN 1993-1-8 Table 4.2)
const MIN_LEG_LENGTHS: { maxThickness: number; minLeg: number }[] = [
  { maxThickness: 6, minLeg: 3 },
  { maxThickness: 10, minLeg: 4 },
  { maxThickness: 15, minLeg: 5 },
  { maxThickness: 20, minLeg: 6 },
  { maxThickness: 30, minLeg: 8 },
  { maxThickness: 50, minLeg: 10 },
  { maxThickness: Infinity, minLeg: 12 },
];

// Weld type options
const WELD_TYPES = [
  { value: 'fillet', label: 'Fillet Weld' },
  { value: 'butt', label: 'Full Penetration Butt Weld' },
  { value: 'partial', label: 'Partial Penetration Butt Weld' },
];

// Quick presets
const PRESETS: Record<string, { name: string; form: Partial<WeldSizingForm> }> = {
  light_fillet: {
    name: 'Light Fillet (6mm)',
    form: {
      weldType: 'fillet',
      legLength: '6',
      throatThickness: '4.2',
      weldLength: '200',
      parentMaterialGrade: 'S275',
      plateThickness1: '10',
      plateThickness2: '10',
      appliedForce: '50',
      forceAngle: '0',
    },
  },
  medium_fillet: {
    name: 'Medium Fillet (8mm)',
    form: {
      weldType: 'fillet',
      legLength: '8',
      throatThickness: '5.6',
      weldLength: '300',
      parentMaterialGrade: 'S355',
      plateThickness1: '15',
      plateThickness2: '12',
      appliedForce: '120',
      forceAngle: '0',
    },
  },
  heavy_fillet: {
    name: 'Heavy Fillet (12mm)',
    form: {
      weldType: 'fillet',
      legLength: '12',
      throatThickness: '8.5',
      weldLength: '400',
      parentMaterialGrade: 'S355',
      plateThickness1: '25',
      plateThickness2: '20',
      appliedForce: '300',
      forceAngle: '0',
    },
  },
  transverse_fillet: {
    name: 'Transverse Load (90°)',
    form: {
      weldType: 'fillet',
      legLength: '8',
      throatThickness: '5.6',
      weldLength: '250',
      parentMaterialGrade: 'S355',
      plateThickness1: '15',
      plateThickness2: '15',
      appliedForce: '100',
      forceAngle: '90',
      useDirectionalMethod: true,
    },
  },
  butt_weld: {
    name: 'Full Penetration Butt',
    form: {
      weldType: 'butt',
      legLength: '0',
      throatThickness: '12',
      weldLength: '200',
      parentMaterialGrade: 'S355',
      plateThickness1: '12',
      plateThickness2: '12',
      appliedForce: '150',
      forceAngle: '0',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const WeldSizing: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<WeldSizingForm>({
    weldType: 'fillet',
    weldLength: '250',
    throatThickness: '5.6',
    legLength: '8',
    electrodeGrade: 'E42',
    parentMaterialGrade: 'S355',
    plateThickness1: '15',
    plateThickness2: '12',
    appliedForce: '100',
    forceAngle: '0',
    axialForce: '0',
    shearForce: '0',
    useDirectionalMethod: false,
    gammaM2: '1.25',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'weldLength', label: 'Weld Length' },
  { key: 'throatThickness', label: 'Throat Thickness' },
  { key: 'legLength', label: 'Leg Length' },
  { key: 'plateThickness1', label: 'Plate Thickness1' },
  { key: 'plateThickness2', label: 'Plate Thickness2' },
  { key: 'appliedForce', label: 'Applied Force' },
  { key: 'forceAngle', label: 'Force Angle' },
  { key: 'axialForce', label: 'Axial Force' },
  { key: 'shearForce', label: 'Shear Force' },
  { key: 'gammaM2', label: 'Gamma M2' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<WeldSizingResults | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    weld: true,
    material: true,
    forces: true,
    project: false,
  });

  // Mouse spotlight
  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const updateForm = (field: keyof WeldSizingForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setForm((prev) => ({ ...prev, ...preset.form }));
    }
  };

  // Auto-calculate throat thickness from leg length
  const updateLegLength = (value: string) => {
    const leg = parseFloat(value);
    if (!isNaN(leg) && leg > 0) {
      const throat = (leg * 0.7071).toFixed(1); // a = s × cos(45°) ≈ 0.7071 × s
      setForm((prev) => ({ ...prev, legLength: value, throatThickness: throat }));
    } else {
      setForm((prev) => ({ ...prev, legLength: value }));
    }
  };

  // What-If Sliders
  const whatIfSliders = [
    { key: 'legLength', label: 'Leg Length', min: 3, max: 25, step: 1, unit: 'mm' },
    { key: 'weldLength', label: 'Weld Length', min: 50, max: 1000, step: 10, unit: 'mm' },
    { key: 'appliedForce', label: 'Applied Force', min: 10, max: 500, step: 10, unit: 'kN' },
    { key: 'plateThickness1', label: 'Plate Thickness', min: 5, max: 50, step: 1, unit: 'mm' },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // Calculation - EN 1993-1-8
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      // Parse inputs
      const weldType = form.weldType;
      const L = parseFloat(form.weldLength);
      const a = parseFloat(form.throatThickness);
      const legLength = parseFloat(form.legLength);
      const t1 = parseFloat(form.plateThickness1);
      const t2 = parseFloat(form.plateThickness2);
      const F = parseFloat(form.appliedForce) * 1000; // kN to N
      const theta = (parseFloat(form.forceAngle) * Math.PI) / 180; // degrees to radians
      const Fa = parseFloat(form.axialForce) * 1000; // kN to N
      const Fv = parseFloat(form.shearForce) * 1000; // kN to N
      const gammaM2 = parseFloat(form.gammaM2);

      // Material properties
      const steelGrade = STEEL_GRADES[form.parentMaterialGrade];
      const fu = steelGrade.fu;
      const betaW = steelGrade.betaW;

      // ─────────────────────────────────────────────────────────────────────
      // Design shear strength (EN 1993-1-8 Equation 4.4)
      // fvw.d = fu / (√3 × βw × γM2)
      // ─────────────────────────────────────────────────────────────────────
      const fvwd = fu / (Math.sqrt(3) * betaW * gammaM2);

      // ─────────────────────────────────────────────────────────────────────
      // Effective throat thickness
      // ─────────────────────────────────────────────────────────────────────
      let effectiveThroat: number;
      if (weldType === 'butt') {
        // Full penetration butt weld - throat = min plate thickness
        effectiveThroat = Math.min(t1, t2);
      } else if (weldType === 'partial') {
        // Partial penetration - user specified throat
        effectiveThroat = a;
      } else {
        // Fillet weld - throat = 0.7 × leg length (or user specified)
        effectiveThroat = a > 0 ? a : legLength * 0.7071;
      }

      // ─────────────────────────────────────────────────────────────────────
      // Effective length (EN 1993-1-8 Section 4.5.1)
      // Leff = L - 2a (for fillet welds, deduct crater at ends)
      // ─────────────────────────────────────────────────────────────────────
      const Leff = weldType === 'fillet' ? Math.max(L - 2 * effectiveThroat, L * 0.9) : L;

      // Weld area
      const weldArea = effectiveThroat * Leff;

      // ─────────────────────────────────────────────────────────────────────
      // Applied forces resolution
      // ─────────────────────────────────────────────────────────────────────
      // Total applied force considering angle and separate components
      const Fx = F * Math.cos(theta) + Fa; // Force parallel to weld
      const Fy = F * Math.sin(theta) + Fv; // Force perpendicular to weld
      const totalForce = Math.sqrt(Fx * Fx + Fy * Fy);

      // ─────────────────────────────────────────────────────────────────────
      // Simplified Method (EN 1993-1-8 Section 4.5.3.3)
      // Fw,Ed ≤ Fw,Rd = fvw.d × a × Leff
      // ─────────────────────────────────────────────────────────────────────
      const Fw_Rd = (fvwd * weldArea) / 1000; // N to kN
      const appliedForceTotal = totalForce / 1000; // N to kN
      const appliedStress = totalForce / weldArea;
      const simplifiedUtil = (appliedStress / fvwd) * 100;
      const simplifiedStatus = simplifiedUtil <= 100 ? 'PASS' : 'FAIL';

      // ─────────────────────────────────────────────────────────────────────
      // Directional Method (EN 1993-1-8 Section 4.5.3.2)
      // √(σ⊥² + 3(τ⊥² + τ∥²)) ≤ fu / (βw × γM2)
      // and σ⊥ ≤ 0.9 × fu / γM2
      // ─────────────────────────────────────────────────────────────────────

      // Stress components on weld throat plane
      // For a transverse load (perpendicular to weld axis):
      // σ⊥ = τ⊥ = Fy / (a × L × √2)
      // For a longitudinal load (parallel to weld axis):
      // τ∥ = Fx / (a × L)

      const sigmaPerpendicular = Fy / (weldArea * Math.sqrt(2));
      const tauPerpendicular = Fy / (weldArea * Math.sqrt(2));
      const tauParallel = Fx / weldArea;

      // Combined stress criterion
      const combinedStress = Math.sqrt(
        sigmaPerpendicular * sigmaPerpendicular +
          3 * (tauPerpendicular * tauPerpendicular + tauParallel * tauParallel),
      );

      const directionalLimit = fu / (betaW * gammaM2);
      const sigmaPerpLimit = (0.9 * fu) / gammaM2;

      const directionalUtil1 = (combinedStress / directionalLimit) * 100;
      const directionalUtil2 = (Math.abs(sigmaPerpendicular) / sigmaPerpLimit) * 100;
      const directionalStatus =
        directionalUtil1 <= 100 && directionalUtil2 <= 100 ? 'PASS' : 'FAIL';

      // ─────────────────────────────────────────────────────────────────────
      // Minimum Weld Size Checks (EN 1993-1-8 Table 4.2)
      // ─────────────────────────────────────────────────────────────────────
      const tMin = Math.min(t1, t2);
      let minLegLength = 3;
      for (const rule of MIN_LEG_LENGTHS) {
        if (tMin <= rule.maxThickness) {
          minLegLength = rule.minLeg;
          break;
        }
      }

      const minThroat = minLegLength * 0.7071;
      const minLengthRequired = Math.max(30, 6 * effectiveThroat);

      let geometryCheck = 'PASS';
      if (weldType === 'fillet') {
        if (legLength < minLegLength) {
          geometryCheck = 'FAIL';
          newWarnings.push(
            `Leg length ${legLength}mm < minimum ${minLegLength}mm for ${tMin}mm plate`,
          );
        }
        if (effectiveThroat < minThroat) {
          geometryCheck = 'FAIL';
          newWarnings.push(
            `Throat ${effectiveThroat.toFixed(1)}mm < minimum ${minThroat.toFixed(1)}mm`,
          );
        }
        if (Leff < minLengthRequired) {
          newWarnings.push(
            `Effective length ${Leff.toFixed(0)}mm approaching minimum ${minLengthRequired.toFixed(0)}mm`,
          );
        }
        // Maximum leg length check
        if (legLength > 0.7 * tMin) {
          newWarnings.push(
            `Leg length exceeds 0.7 × min plate thickness - may cause lamellar tearing`,
          );
        }
      }

      // Additional warnings
      if (simplifiedUtil > 85 && simplifiedUtil <= 100) {
        newWarnings.push('High utilisation - consider increasing weld size for robustness');
      }

      // Electrode matching check
      const electrode = ELECTRODE_GRADES[form.electrodeGrade];
      if (electrode.fu < fu) {
        newWarnings.push(
          `Electrode strength (${electrode.fu} MPa) < parent metal (${fu} MPa) - use higher grade electrode`,
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // Overall Assessment
      // ─────────────────────────────────────────────────────────────────────
      const checkingMethod = form.useDirectionalMethod;
      const maxUtil = checkingMethod
        ? Math.max(directionalUtil1, directionalUtil2)
        : simplifiedUtil;

      const criticalCheck = checkingMethod
        ? directionalUtil1 >= directionalUtil2
          ? 'Combined stress criterion'
          : 'Normal stress criterion'
        : 'Simplified method';

      const status =
        (checkingMethod ? directionalStatus : simplifiedStatus) === 'PASS' &&
        geometryCheck === 'PASS'
          ? 'PASS'
          : 'FAIL';

      setResults({
        fu,
        betaW,
        fvwd,
        effectiveThroat,
        effectiveLength: Leff,
        weldArea,
        appliedStress,
        simplifiedUtil,
        simplifiedStatus,
        sigmaPerpendicular,
        tauPerpendicular,
        tauParallel,
        combinedStress,
        sigmaPerpLimit,
        directionalUtil1,
        directionalUtil2,
        directionalStatus,
        Fw_Rd,
        appliedForceTotal,
        capacityUtil: (appliedForceTotal / Fw_Rd) * 100,
        minLegLength,
        minThroat,
        minLengthRequired,
        geometryCheck,
        maxUtil,
        criticalCheck,
        status,
      });

      setWarnings(newWarnings);
    } catch (error) {
      console.error('Calculation error:', error);
      setWarnings(['Calculation error occurred']);
    } finally {
      setIsCalculating(false);
    }
  }, [form]);

  useEffect(() => {
    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [calculate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Canvas Drawing - Weld Cross Section Visualization
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Weld Sizing Calculation',
      subtitle: `${WELD_TYPES.find((t) => t.value === form.weldType)?.label || form.weldType} — EN 1993-1-8`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'WSC001' },
      ],
      inputs: [
        {
          label: 'Weld Type',
          value: WELD_TYPES.find((t) => t.value === form.weldType)?.label || form.weldType,
        },
        { label: 'Leg Length', value: form.legLength, unit: 'mm' },
        { label: 'Throat Thickness', value: results.effectiveThroat.toFixed(1), unit: 'mm' },
        { label: 'Effective Length', value: results.effectiveLength.toFixed(0), unit: 'mm' },
        { label: 'Parent Material', value: form.parentMaterialGrade },
        { label: 'Plate Thickness 1', value: form.plateThickness1, unit: 'mm' },
        { label: 'Plate Thickness 2', value: form.plateThickness2, unit: 'mm' },
        { label: 'Applied Force', value: results.appliedForceTotal.toFixed(1), unit: 'kN' },
        { label: 'Force Angle', value: form.forceAngle, unit: '°' },
        { label: 'Method', value: form.useDirectionalMethod ? 'Directional' : 'Simplified' },
      ],
      checks: [
        {
          name: 'Simplified Method',
          capacity: `${results.Fw_Rd.toFixed(1)} kN`,
          utilisation: `${results.simplifiedUtil.toFixed(1)}%`,
          status: results.simplifiedStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Directional Method',
          capacity: `${results.Fw_Rd.toFixed(1)} kN`,
          utilisation: `${Math.max(results.directionalUtil1, results.directionalUtil2).toFixed(1)}%`,
          status: results.directionalStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Capacity Check',
          capacity: `${results.Fw_Rd.toFixed(1)} kN`,
          utilisation: `${results.capacityUtil.toFixed(1)}%`,
          status: (results.capacityUtil <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Geometry Check',
          capacity: `Min leg: ${results.minLegLength.toFixed(0)} mm`,
          utilisation: '-',
          status: results.geometryCheck as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — EN 1993-1-8 Weld Sizing',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Weld Sizing Calculation',
      subtitle: `${WELD_TYPES.find((t) => t.value === form.weldType)?.label || form.weldType} — EN 1993-1-8`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'WSC001' },
      ],
      inputs: [
        {
          label: 'Weld Type',
          value: WELD_TYPES.find((t) => t.value === form.weldType)?.label || form.weldType,
        },
        { label: 'Leg Length', value: form.legLength, unit: 'mm' },
        { label: 'Throat Thickness', value: results.effectiveThroat.toFixed(1), unit: 'mm' },
        { label: 'Effective Length', value: results.effectiveLength.toFixed(0), unit: 'mm' },
        { label: 'Parent Material', value: form.parentMaterialGrade },
        { label: 'Plate Thickness 1', value: form.plateThickness1, unit: 'mm' },
        { label: 'Plate Thickness 2', value: form.plateThickness2, unit: 'mm' },
        { label: 'Applied Force', value: results.appliedForceTotal.toFixed(1), unit: 'kN' },
        { label: 'Force Angle', value: form.forceAngle, unit: '°' },
        { label: 'Method', value: form.useDirectionalMethod ? 'Directional' : 'Simplified' },
      ],
      checks: [
        {
          name: 'Simplified Method',
          capacity: `${results.Fw_Rd.toFixed(1)} kN`,
          utilisation: `${results.simplifiedUtil.toFixed(1)}%`,
          status: results.simplifiedStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Directional Method',
          capacity: `${results.Fw_Rd.toFixed(1)} kN`,
          utilisation: `${Math.max(results.directionalUtil1, results.directionalUtil2).toFixed(1)}%`,
          status: results.directionalStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Capacity Check',
          capacity: `${results.Fw_Rd.toFixed(1)} kN`,
          utilisation: `${results.capacityUtil.toFixed(1)}%`,
          status: (results.capacityUtil <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Geometry Check',
          capacity: `Min leg: ${results.minLegLength.toFixed(0)} mm`,
          utilisation: '-',
          status: results.geometryCheck as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — EN 1993-1-8 Weld Sizing',
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Collapsible Section Component
  // ─────────────────────────────────────────────────────────────────────────────
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
      className={cn('rounded-2xl border overflow-hidden backdrop-blur-md', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="flex items-center justify-between w-full p-4 transition-colors bg-gray-900/50 hover:bg-gray-800/50"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-xl font-bold text-white">{title}</span>
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Input Component
  // ─────────────────────────────────────────────────────────────────────────────
  const InputField: React.FC<{
    label: string;
    field: keyof WeldSizingForm;
    unit?: string;
    type?: string;
    disabled?: boolean;
  }> = ({ label, field, unit, type = 'number', disabled = false }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          type={type}
          value={form[field] as string}
          onChange={(e) => updateForm(field, e.target.value)}
          disabled={disabled}
          title={label}
          className={cn(
            'w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
        {unit && (
          <span className="absolute text-sm text-gray-500 -translate-y-1/2 right-3 top-1/2">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 mx-auto space-y-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 border rounded-full bg-cyan-500/20 border-cyan-500/30 text-cyan-400">
            <FiGrid className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1993-1-8 Compliant</span>
          </div>
          <h1 className="mb-4 text-5xl font-black text-transparent md:text-6xl bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text">
            Weld Sizing Calculator
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-400">
            Fillet, butt & partial penetration welds with directional method stress analysis per
            Eurocode 3
          </p>
        </motion.div>

        {/* Presets */}
        <Card variant="glass" className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20">
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
                  className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 p-2 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl">
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as any)}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab ? 'bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white' : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
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
              className="grid gap-6 lg:grid-cols-3"
            >
              {/* Input Column */}
              <div className="space-y-4 lg:col-span-2">
                {/* Weld Configuration */}
                <Section
                  id="weld"
                  title="Weld Configuration"
                  icon={
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Weld Type</label>
                      <select
                        value={form.weldType}
                        onChange={(e) => updateForm('weldType', e.target.value)}
                        title="Weld Type"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {WELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <InputField label="Weld Length (L)" field="weldLength" unit="mm" />

                    {form.weldType === 'fillet' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-200">Leg Length (s)</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={form.legLength}
                              onChange={(e) => updateLegLength(e.target.value)}
                              title="Leg Length (s)"
                              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                            />
                            <span className="absolute text-sm text-gray-500 -translate-y-1/2 right-3 top-1/2">
                              mm
                            </span>
                          </div>
                        </div>

                        <InputField
                          label="Throat Thickness (a)"
                          field="throatThickness"
                          unit="mm"
                        />
                      </>
                    )}

                    {(form.weldType === 'butt' || form.weldType === 'partial') && (
                      <InputField label="Throat Thickness (a)" field="throatThickness" unit="mm" />
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Electrode Grade</label>
                      <select
                        value={form.electrodeGrade}
                        onChange={(e) => updateForm('electrodeGrade', e.target.value)}
                        title="Electrode Grade"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(ELECTRODE_GRADES).map(([grade, data]) => (
                          <option key={grade} value={grade}>
                            {data.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Material Properties */}
                <Section
                  id="material"
                  title="Parent Material"
                  icon={
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20">
                      <FiSliders className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Steel Grade</label>
                      <select
                        value={form.parentMaterialGrade}
                        onChange={(e) => updateForm('parentMaterialGrade', e.target.value)}
                        title="Steel Grade"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.keys(STEEL_GRADES).map((grade) => (
                          <option key={grade} value={grade}>
                            {grade} (βw = {STEEL_GRADES[grade].betaW})
                          </option>
                        ))}
                      </select>
                    </div>

                    <InputField label="Plate Thickness 1" field="plateThickness1" unit="mm" />
                    <InputField label="Plate Thickness 2" field="plateThickness2" unit="mm" />
                  </div>

                  {results && (
                    <div className="p-3 mt-4 rounded-lg bg-gray-800/30">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">fu:</span>
                          <span className="ml-2 text-white">{results.fu} MPa</span>
                        </div>
                        <div>
                          <span className="text-gray-500">βw:</span>
                          <span className="ml-2 text-cyan-400">{results.betaW}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">fvw,d:</span>
                          <span className="ml-2 text-white">{results.fvwd.toFixed(1)} MPa</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Section>

                {/* Applied Forces */}
                <Section
                  id="forces"
                  title="Applied Forces"
                  icon={
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20">
                      <FiZap className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="Applied Force" field="appliedForce" unit="kN" />
                    <InputField label="Force Angle (θ)" field="forceAngle" unit="°" />
                    <InputField label="Additional Axial Force" field="axialForce" unit="kN" />
                    <InputField label="Additional Shear Force" field="shearForce" unit="kN" />

                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                        <input
                          title="Input value"
                          type="checkbox"
                          id="directionalMethod"
                          checked={form.useDirectionalMethod}
                          onChange={(e) => updateForm('useDirectionalMethod', e.target.checked)}
                          className="w-4 h-4 bg-gray-800 border-gray-600 rounded text-cyan-500 focus:ring-cyan-500/50"
                        />
                        <label htmlFor="directionalMethod" className="text-sm text-gray-300">
                          Use Directional Method (EN 1993-1-8 §4.5.3.2) - more accurate for angled
                          loads
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 mt-4 border rounded-lg bg-purple-900/20 border-purple-500/20">
                    <p className="text-xs text-purple-300">
                      <strong>θ = 0°:</strong> Force parallel to weld axis (longitudinal shear)
                      <br />
                      <strong>θ = 90°:</strong> Force perpendicular to weld axis (transverse
                      tension)
                    </p>
                  </div>
                </Section>

                {/* Project Info */}
                <Section
                  id="project"
                  title="Project Information"
                  icon={
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="Project Name" field="projectName" type="text" />
                    <InputField label="Reference" field="reference" type="text" />
                    <InputField label="γM2 (Weld Factor)" field="gammaM2" />
                  </div>
                </Section>

                {/* Code Reference Box */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardContent className="p-4">
                    <h4 className="mb-3 text-sm font-semibold text-gray-200">
                      EN 1993-1-8 Reference
                    </h4>
                    <div className="space-y-2 font-mono text-xs text-gray-400">
                      <p>
                        <span className="text-cyan-400">Simplified:</span> σw = Fw,Ed / (a × Leff) ≤
                        fvw,d = fu / (√3 × βw × γM2)
                      </p>
                      <p>
                        <span className="text-purple-400">Directional:</span> √(σ⊥² + 3(τ⊥² + τ∥²))
                        ≤ fu / (βw × γM2)
                      </p>
                      <p className="text-gray-500">and σ⊥ ≤ 0.9 × fu / γM2</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results Column — sticky sidebar */}
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
                        <WeldSizing3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        WELD SIZING — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                          <FiActivity size={14} /> Live Readout
                        </h3>
                        {[
                          { label: 'Weld Type', value: form.weldType },
                          { label: 'Weld Length', value: `${form.weldLength} mm` },
                          { label: 'Throat', value: `${form.throatThickness} mm` },
                          { label: 'Leg Length', value: `${form.legLength} mm` },
                          { label: 'Applied Force', value: `${form.appliedForce} kN` },
                          { label: 'Steel Grade', value: form.parentMaterialGrade },
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
                              { label: 'Simplified', util: ((results.simplifiedUtil || 0) * 100).toFixed(1), status: results.simplifiedStatus },
                              { label: 'Directional', util: ((results.directionalUtil1 || 0) * 100).toFixed(1), status: results.directionalStatus },
                              { label: 'Capacity', util: ((results.capacityUtil || 0) * 100).toFixed(1), status: results.status },
                              { label: 'Geometry', util: results.geometryCheck === 'PASS' ? '0' : '100', status: results.geometryCheck },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util || '0')) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                                  {check.util ?? '—'}%
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

                {/* Canvas Visualization */}
                <div className="relative">
                  <button
                    onClick={() => setPreviewMaximized(true)}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                    aria-label="Maximize preview"
                    title="Fullscreen preview"
                  >
                    <FiMaximize2 size={16} />
                  </button>
                  <WhatIfPreview
                    title="Weld Sizing — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                        <WeldSizing3D />
                      </Interactive3DDiagram>
                    )}
                  />
                </div>

                {/* Results */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    {/* Status */}
                    <Card
                      variant="glass"
                      className={cn(
                        'border-2 shadow-2xl',
                        results.status === 'PASS'
                          ? 'bg-green-900/20 border-l-4 border-l-green-500 border-green-500/50 shadow-green-500/20'
                          : 'bg-red-900/20 border-l-4 border-l-red-500 border-red-500/50 shadow-red-500/20',
                      )}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {results.status === 'PASS' ? (
                            <FiCheck className="w-6 h-6 text-green-400" />
                          ) : (
                            <FiAlertTriangle className="w-6 h-6 text-red-400" />
                          )}
                          <span
                            className={cn(
                              'text-2xl font-bold',
                              results.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {results.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          Fw,Rd = {results.Fw_Rd.toFixed(1)} kN
                        </p>
                        <p className="text-xs text-gray-500">{results.criticalCheck}</p>
                      </CardContent>
                    </Card>

                    {/* Design Checks */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Main utilisation */}
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="text-gray-400">
                              {form.useDirectionalMethod
                                ? 'Directional Method'
                                : 'Simplified Method'}
                            </span>
                            <span
                              className={cn(
                                form.useDirectionalMethod
                                  ? results.directionalUtil1 <= 100
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                  : results.simplifiedUtil <= 100
                                    ? 'text-green-400'
                                    : 'text-red-400',
                              )}
                            >
                              {(form.useDirectionalMethod
                                ? results.directionalUtil1
                                : results.simplifiedUtil
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden bg-gray-800 rounded-full">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(
                                  form.useDirectionalMethod
                                    ? results.directionalUtil1
                                    : results.simplifiedUtil,
                                  100,
                                )}%`,
                              }}
                              className={cn(
                                'h-full rounded-full',
                                (form.useDirectionalMethod
                                  ? results.directionalUtil1
                                  : results.simplifiedUtil) <= 70
                                  ? 'bg-green-500'
                                  : (form.useDirectionalMethod
                                        ? results.directionalUtil1
                                        : results.simplifiedUtil) <= 90
                                    ? 'bg-emerald-500'
                                    : (form.useDirectionalMethod
                                          ? results.directionalUtil1
                                          : results.simplifiedUtil) <= 100
                                      ? 'bg-amber-500'
                                      : 'bg-red-500',
                              )}
                            />
                          </div>
                        </div>

                        {/* Additional check for directional method */}
                        {form.useDirectionalMethod && (
                          <div>
                            <div className="flex justify-between mb-1 text-sm">
                              <span className="text-gray-400">σ⊥ ≤ 0.9fu/γM2</span>
                              <span
                                className={cn(
                                  results.directionalUtil2 <= 100
                                    ? 'text-green-400'
                                    : 'text-red-400',
                                )}
                              >
                                {results.directionalUtil2.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden bg-gray-800 rounded-full">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(results.directionalUtil2, 100)}%` }}
                                className={cn(
                                  'h-full rounded-full',
                                  results.directionalUtil2 <= 70
                                    ? 'bg-green-500'
                                    : results.directionalUtil2 <= 90
                                      ? 'bg-emerald-500'
                                      : results.directionalUtil2 <= 100
                                        ? 'bg-amber-500'
                                        : 'bg-red-500',
                                )}
                              />
                            </div>
                          </div>
                        )}

                        {/* Geometry check */}
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="text-gray-400">Geometry (min sizes)</span>
                            <span
                              className={cn(
                                results.geometryCheck === 'PASS'
                                  ? 'text-green-400'
                                  : 'text-red-400',
                              )}
                            >
                              {results.geometryCheck}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Values */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Weld Properties</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Eff. Throat (a)</p>
                          <p className="font-mono text-white">
                            {results.effectiveThroat.toFixed(1)} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Eff. Length</p>
                          <p className="font-mono text-white">
                            {results.effectiveLength.toFixed(0)} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Weld Area</p>
                          <p className="font-mono text-white">{results.weldArea.toFixed(0)} mm²</p>
                        </div>
                        <div>
                          <p className="text-gray-500">βw</p>
                          <p className="font-mono text-cyan-400">{results.betaW}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Min Leg</p>
                          <p className="font-mono text-white">{results.minLegLength} mm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">fvw,d</p>
                          <p className="font-mono text-white">{results.fvwd.toFixed(0)} MPa</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stress Components (Directional Method) */}
                    {form.useDirectionalMethod && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xl font-bold text-white">Stress Components</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">σ⊥</p>
                            <p className="font-mono text-white">
                              {results.sigmaPerpendicular.toFixed(1)} MPa
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">τ⊥</p>
                            <p className="font-mono text-white">
                              {results.tauPerpendicular.toFixed(1)} MPa
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">τ∥</p>
                            <p className="font-mono text-white">
                              {results.tauParallel.toFixed(1)} MPa
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">σvm (combined)</p>
                            <p className="font-mono text-purple-400">
                              {results.combinedStress.toFixed(1)} MPa
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Card variant="glass" className="border-l-4 border-l-amber-500 border-amber-500/30 shadow-2xl">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FiAlertTriangle className="text-amber-400" />
                            <span className="font-medium text-amber-400">Warnings</span>
                          </div>
                          <ul className="space-y-1">
                            {warnings.map((w, i) => (
                              <li key={i} className="text-sm text-amber-200/80">
                                • {w}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    <Card variant="glass" className="border-l-4 border-l-emerald-500 border-emerald-500/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-emerald-400">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20">
                            <FiCheck className="w-6 h-6 text-neon-cyan" />
                          </div>
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5">
                        {results.status === 'PASS' ? (
                          <div className="flex items-start gap-2 text-emerald-300">
                            <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                            <span>Weld capacity is adequate for the applied loading</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-amber-300">
                            <FiAlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                            <span>
                              Weld capacity insufficient — increase leg length or weld length
                            </span>
                          </div>
                        )}
                        {results.maxUtil > 85 && results.maxUtil <= 100 && (
                          <div className="flex items-start gap-2 text-emerald-300">
                            <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                            <span>
                              Utilisation is high — consider increasing weld size for robustness
                            </span>
                          </div>
                        )}
                        {results.geometryCheck === 'FAIL' && (
                          <div className="flex items-start gap-2 text-amber-300">
                            <FiAlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                            <span>Weld size does not meet minimum geometry requirements</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Calculate + Export */}
                    <div className="space-y-3">
                      <button
                        onClick={calculate}
                        className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-neon-cyan/20"
                      >
                        ⚡ RUN FULL ANALYSIS
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={exportPDF}
                          className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500"
                        >
                          <FiDownload className="w-4 h-4 mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                        >
                          <FiDownload className="w-4 h-4 mr-2" />
                          DOCX
                        </Button>
                        <SaveRunButton
                          calculatorKey="weld-sizing"
                          inputs={form as unknown as Record<string, string | number>}
                          results={results}
                          status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                        />
                      </div>
                    </div>

                    {/* Design Codes */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white">Design Codes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 text-xs text-gray-500">
                        <p>EN 1993-1-8 — Design of joints</p>
                        <p>EN 1993-1-8 §4.5 — Fillet welds</p>
                        <p>EN 1993-1-8 Table 4.1 — Correlation factor βw</p>
                        <p>NA to BS EN 1993-1-8 — UK National Annex</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ───────────── Results Tab ───────────── */}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card variant="glass" className="p-6 border-l-4 border-l-orange-500 border-neon-cyan/30 shadow-2xl">
                  <h3 className="mb-2 text-xl font-bold text-white">Maximum Utilisation</h3>
                  <div
                    className={cn(
                      'text-4xl font-black',
                      results.maxUtil <= 100 ? 'text-orange-400' : 'text-red-400',
                    )}
                  >
                    {results.maxUtil.toFixed(1)}%
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Critical: {results.criticalCheck}</p>
                </Card>
                <Card variant="glass" className="p-6 border-l-4 border-l-emerald-500 border-neon-cyan/30 shadow-2xl">
                  <h3 className="mb-2 text-xl font-bold text-white">Status</h3>
                  <div
                    className={cn(
                      'text-2xl font-black',
                      results.status === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {results.status}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Fw,Rd = {results.Fw_Rd.toFixed(1)} kN
                  </p>
                </Card>
                <Card variant="glass" className="p-6 border-l-4 border-l-purple-500 border-neon-cyan/30 shadow-2xl">
                  <h3 className="mb-2 text-xl font-bold text-white">Configuration</h3>
                  <div className="text-xl font-bold text-gray-400">
                    {WELD_TYPES.find((t) => t.value === form.weldType)?.label}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {form.parentMaterialGrade} — a = {results.effectiveThroat.toFixed(1)} mm
                  </p>
                </Card>
              </div>

              {/* Individual Check Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    name: 'Simplified Method',
                    util: results.simplifiedUtil,
                    cap: `${results.Fw_Rd.toFixed(1)} kN`,
                    demand: `σw = ${results.appliedStress.toFixed(1)} MPa`,
                  },
                  {
                    name: 'Directional (Combined)',
                    util: results.directionalUtil1,
                    cap: `${(results.fu / (results.betaW * parseFloat(form.gammaM2))).toFixed(1)} MPa`,
                    demand: `σvm = ${results.combinedStress.toFixed(1)} MPa`,
                  },
                  {
                    name: 'Directional (σ⊥)',
                    util: results.directionalUtil2,
                    cap: `${results.sigmaPerpLimit.toFixed(1)} MPa`,
                    demand: `σ⊥ = ${Math.abs(results.sigmaPerpendicular).toFixed(1)} MPa`,
                  },
                  {
                    name: 'Capacity',
                    util: results.capacityUtil,
                    cap: `${results.Fw_Rd.toFixed(1)} kN`,
                    demand: `F = ${results.appliedForceTotal.toFixed(1)} kN`,
                  },
                ].map((check) => (
                  <Card
                    key={check.name}
                    variant="glass"
                    className={cn(
                      'p-4 shadow-2xl',
                      check.util > 100 ? 'border-red-500/50' : 'border-neon-cyan/30',
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{check.name}</span>
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-1 rounded',
                          check.util <= 100
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {check.util <= 100 ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">{check.util.toFixed(1)}%</div>
                    <p className="mt-1 text-xs text-gray-500">Capacity: {check.cap}</p>
                    <p className="text-xs text-gray-500">{check.demand}</p>
                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(check.util, 100)}%` }}
                        className={cn(
                          'h-full rounded-full',
                          check.util <= 70
                            ? 'bg-emerald-500'
                            : check.util <= 100
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Weld Properties & Stress Components */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">Weld Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Eff. Throat (a)</p>
                      <p className="font-mono text-white">
                        {results.effectiveThroat.toFixed(1)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Eff. Length</p>
                      <p className="font-mono text-white">
                        {results.effectiveLength.toFixed(0)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Weld Area</p>
                      <p className="font-mono text-white">{results.weldArea.toFixed(0)} mm²</p>
                    </div>
                    <div>
                      <p className="text-gray-500">βw</p>
                      <p className="font-mono text-cyan-400">{results.betaW}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Min Leg</p>
                      <p className="font-mono text-white">{results.minLegLength} mm</p>
                    </div>
                    <div>
                      <p className="text-gray-500">fvw,d</p>
                      <p className="font-mono text-white">{results.fvwd.toFixed(0)} MPa</p>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">
                      Stress Components (Directional)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">σ⊥</p>
                      <p className="font-mono text-white">
                        {results.sigmaPerpendicular.toFixed(1)} MPa
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">τ⊥</p>
                      <p className="font-mono text-white">
                        {results.tauPerpendicular.toFixed(1)} MPa
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">τ∥</p>
                      <p className="font-mono text-white">{results.tauParallel.toFixed(1)} MPa</p>
                    </div>
                    <div>
                      <p className="text-gray-500">σvm (combined)</p>
                      <p className="font-mono text-purple-400">
                        {results.combinedStress.toFixed(1)} MPa
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">fu</p>
                      <p className="font-mono text-white">{results.fu} MPa</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Geometry</p>
                      <p
                        className={cn(
                          'font-mono',
                          results.geometryCheck === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results.geometryCheck}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Warnings in Results */}
              {warnings.length > 0 && (
                <Card variant="glass" className="border-l-4 border-l-amber-500 border-amber-500/30 shadow-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiAlertTriangle className="text-amber-400" />
                      <span className="font-medium text-amber-400">Warnings</span>
                    </div>
                    <ul className="space-y-1">
                      {warnings.map((w, i) => (
                        <li key={i} className="text-sm text-amber-200/80">
                          • {w}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Calculate + Export in Results */}
              <div className="space-y-3">
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={exportPDF}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500"
                  >
                    <FiDownload className="w-4 h-4 mr-2" />
                    Export PDF Report
                  </Button>
                  <Button onClick={exportDOCX} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <FiDownload className="w-4 h-4 mr-2" />
                    DOCX
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ───────────── Visualization Tab ───────────── */}
          {activeTab === 'visualization' && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <Card variant="glass" className="p-4 overflow-hidden border-neon-cyan/30 shadow-2xl">
                <div className="relative overflow-hidden bg-gray-900 shadow-2xl rounded-xl">
                  <Interactive3DDiagram
                    height="500px"
                    cameraPosition={[8, 6, 8]}
                    status={results ? (results.status as 'PASS' | 'FAIL') : undefined}
                  >
                    <WeldSizing3D />
                  </Interactive3DDiagram>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
  );
};

export default WeldSizing;
