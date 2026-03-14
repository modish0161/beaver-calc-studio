// =============================================================================
// Bolted Connection Design Calculator — Premium Version
// EN 1993-1-8 (Eurocode 3) — Bolted Steel Connections
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
    FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import BoltedConnection3D from '../../components/3d/scenes/BoltedConnection3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BOLT_DIMENSIONS, BOLT_GRADES } from '../../data/boltData';
import { STEEL_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// Types
// =============================================================================

interface BoltedConnectionForm {
  // Bolt Properties
  boltDiameter: string;
  boltGrade: string;
  numberOfBolts: string;
  boltPattern: string;
  holeType: string;
  holeClearance: string;

  // Plate Properties
  plateThickness: string;
  plateGrade: string;
  plateWidth: string;
  plateLength: string;

  // Forces
  shearForce: string;
  tensionForce: string;

  // Geometry
  edgeDistanceE1: string;
  edgeDistanceE2: string;
  pitchP1: string;
  pitchP2: string;
  numberOfRows: string;
  numberOfColumns: string;

  // Slip Resistance (for preloaded bolts)
  isPreloaded: boolean;
  frictionCoefficient: string;
  slipFactor: string;
  numberOfFrictionSurfaces: string;

  // Partial Factors
  gammaM2: string;
  gammaM3: string;

  // Project
  projectName: string;
  reference: string;
}

interface BoltedConnectionResults {
  // Bolt Properties
  boltDiameter: number;
  tensileStressArea: number;
  shankArea: number;

  // Material Properties
  fub: number;
  fyb: number;
  fu: number;
  fy: number;

  // Shear Capacity
  shearCapacityPerBolt: number;
  totalShearCapacity: number;
  shearForcePerBolt: number;
  shearUtil: number;
  shearStatus: string;

  // Bearing Capacity
  bearingCapacityPerBolt: number;
  alphab: number;
  k1: number;
  bearingUtil: number;
  bearingStatus: string;

  // Tension Capacity
  tensionCapacityPerBolt: number;
  totalTensionCapacity: number;
  tensionForcePerBolt: number;
  tensionUtil: number;
  tensionStatus: string;

  // Combined Check
  combinedRatio: number;
  combinedUtil: number;
  combinedStatus: string;

  // Slip Resistance (if preloaded)
  preloadForce: number;
  slipResistancePerBolt: number;
  totalSlipResistance: number;
  slipUtil: number;
  slipStatus: string;

  // Block Tearing
  Ant: number;
  Anv: number;
  blockTearingCapacity: number;
  blockTearingUtil: number;
  blockTearingStatus: string;

  // Overall
  maxUtil: number;
  criticalCheck: string;
  status: string;
}

// =============================================================================
// Data Tables
// =============================================================================

const HOLE_TYPES: Record<string, { clearance: number; ks: number }> = {
  standard: { clearance: 2, ks: 1.0 },
  oversized: { clearance: 3, ks: 0.85 },
  slotted_short: { clearance: 2, ks: 0.76 },
  slotted_long: { clearance: 2, ks: 0.63 },
};

const FRICTION_CLASSES: Record<string, { mu: number; description: string }> = {
  A: { mu: 0.5, description: 'Surfaces blasted, loose rust removed' },
  B: { mu: 0.4, description: 'Surfaces blasted, spray-metallized' },
  C: { mu: 0.3, description: 'Surfaces cleaned by wire-brushing' },
  D: { mu: 0.2, description: 'Surfaces not treated' },
};

const PRESETS: Record<string, { name: string; form: Partial<BoltedConnectionForm> }> = {
  light_shear: {
    name: 'Light Shear',
    form: {
      boltDiameter: 'M16',
      boltGrade: '8.8',
      numberOfBolts: '4',
      shearForce: '100',
      tensionForce: '0',
      plateThickness: '10',
      plateGrade: 'S275',
    },
  },
  medium_shear: {
    name: 'Medium Shear',
    form: {
      boltDiameter: 'M20',
      boltGrade: '8.8',
      numberOfBolts: '6',
      shearForce: '250',
      tensionForce: '0',
      plateThickness: '12',
      plateGrade: 'S355',
    },
  },
  heavy_shear: {
    name: 'Heavy Shear',
    form: {
      boltDiameter: 'M24',
      boltGrade: '10.9',
      numberOfBolts: '8',
      shearForce: '500',
      tensionForce: '0',
      plateThickness: '16',
      plateGrade: 'S355',
    },
  },
  combined_loading: {
    name: 'Combined Loading',
    form: {
      boltDiameter: 'M20',
      boltGrade: '8.8',
      numberOfBolts: '6',
      shearForce: '150',
      tensionForce: '100',
      plateThickness: '12',
      plateGrade: 'S355',
    },
  },
  slip_critical: {
    name: 'Slip Critical',
    form: {
      boltDiameter: 'M24',
      boltGrade: '10.9',
      numberOfBolts: '8',
      shearForce: '300',
      tensionForce: '0',
      plateThickness: '16',
      plateGrade: 'S355',
      isPreloaded: true,
      frictionCoefficient: 'A',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const BoltedConnection: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<BoltedConnectionForm>({
    boltDiameter: 'M20',
    boltGrade: '8.8',
    numberOfBolts: '6',
    boltPattern: 'grid',
    holeType: 'standard',
    holeClearance: '2',
    plateThickness: '12',
    plateGrade: 'S355',
    plateWidth: '200',
    plateLength: '300',
    shearForce: '200',
    tensionForce: '50',
    edgeDistanceE1: '40',
    edgeDistanceE2: '35',
    pitchP1: '60',
    pitchP2: '60',
    numberOfRows: '3',
    numberOfColumns: '2',
    isPreloaded: false,
    frictionCoefficient: 'A',
    slipFactor: '0.5',
    numberOfFrictionSurfaces: '1',
    gammaM2: '1.25',
    gammaM3: '1.25',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'numberOfBolts', label: 'Number Of Bolts' },
  { key: 'holeClearance', label: 'Hole Clearance' },
  { key: 'plateThickness', label: 'Plate Thickness' },
  { key: 'plateWidth', label: 'Plate Width' },
  { key: 'plateLength', label: 'Plate Length' },
  { key: 'shearForce', label: 'Shear Force' },
  { key: 'tensionForce', label: 'Tension Force' },
  { key: 'edgeDistanceE1', label: 'Edge Distance E1' },
  { key: 'edgeDistanceE2', label: 'Edge Distance E2' },
  { key: 'pitchP1', label: 'Pitch P1' },
  { key: 'pitchP2', label: 'Pitch P2' },
  { key: 'numberOfRows', label: 'Number Of Rows' },
  { key: 'numberOfColumns', label: 'Number Of Columns' },
  { key: 'slipFactor', label: 'Slip Factor' },
  { key: 'numberOfFrictionSurfaces', label: 'Number Of Friction Surfaces' },
  { key: 'gammaM2', label: 'Gamma M2' },
  { key: 'gammaM3', label: 'Gamma M3' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<BoltedConnectionResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    bolts: true,
    plate: true,
    forces: true,
    geometry: false,
    slip: false,
    factors: false,
  });
  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const updateForm = (field: keyof BoltedConnectionForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // What-If Sliders
  const whatIfSliders = [
    { key: 'appliedShear', label: 'Applied Shear', min: 10, max: 500, step: 10, unit: 'kN' },
    { key: 'appliedTension', label: 'Applied Tension', min: 0, max: 300, step: 10, unit: 'kN' },
    { key: 'plateThickness', label: 'Plate Thickness', min: 6, max: 40, step: 2, unit: 'mm' },
    { key: 'edgeDistance', label: 'Edge Distance', min: 20, max: 100, step: 5, unit: 'mm' },
  ];

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setForm((prev) => ({ ...prev, ...preset.form }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Calculation — EN 1993-1-8
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      // Get bolt properties
      const bolt = BOLT_DIMENSIONS[form.boltDiameter];
      const boltGrade = BOLT_GRADES[form.boltGrade];
      const plateGrade = STEEL_GRADES[form.plateGrade];
      const holeType = HOLE_TYPES[form.holeType];

      const d = bolt.d;
      const As = bolt.As;
      const A = bolt.A;
      const d0 = bolt.d0;
      const fub = boltGrade.fub;
      const fyb = boltGrade.fyb;
      const fu = plateGrade.fu;
      const fy = plateGrade.fy;

      const nBolts = parseInt(form.numberOfBolts);
      const t = parseFloat(form.plateThickness);
      const VEd = parseFloat(form.shearForce);
      const FtEd = parseFloat(form.tensionForce);
      const e1 = parseFloat(form.edgeDistanceE1);
      const e2 = parseFloat(form.edgeDistanceE2);
      const p1 = parseFloat(form.pitchP1);
      const p2 = parseFloat(form.pitchP2);
      const nRows = parseInt(form.numberOfRows);
      const nCols = parseInt(form.numberOfColumns);

      const gammaM2 = parseFloat(form.gammaM2);
      const gammaM3 = parseFloat(form.gammaM3);

      // =========================================================================
      // SHEAR CAPACITY per bolt — EN 1993-1-8 Table 3.4
      // Fv,Rd = αv × fub × A / γM2
      // =========================================================================
      const alphaV = form.boltGrade === '10.9' ? 0.5 : 0.6;
      const Fv_Rd = (alphaV * fub * As) / (gammaM2 * 1000);

      const shearForcePerBolt = VEd / nBolts;
      const totalShearCapacity = Fv_Rd * nBolts;
      const shearUtil = (shearForcePerBolt / Fv_Rd) * 100;
      const shearStatus = shearUtil <= 100 ? 'PASS' : 'FAIL';

      // =========================================================================
      // BEARING CAPACITY per bolt — EN 1993-1-8 Table 3.4
      // Fb,Rd = k1 × αb × fu × d × t / γM2
      // =========================================================================
      const alpha_d_end = e1 / (3 * d0);
      const alpha_d_inner = p1 / (3 * d0) - 0.25;
      const alpha_d = Math.min(alpha_d_end, alpha_d_inner > 0 ? alpha_d_inner : alpha_d_end);
      const alphab = Math.min(alpha_d, fub / fu, 1.0);

      const k1_edge = 2.8 * (e2 / d0) - 1.7;
      const k1_inner = 1.4 * (p2 / d0) - 1.7;
      const k1 = Math.min(Math.min(k1_edge, k1_inner > 0 ? k1_inner : k1_edge), 2.5);

      const Fb_Rd = (k1 * alphab * fu * d * t) / (gammaM2 * 1000);

      const bearingUtil = (shearForcePerBolt / Fb_Rd) * 100;
      const bearingStatus = bearingUtil <= 100 ? 'PASS' : 'FAIL';

      // =========================================================================
      // TENSION CAPACITY per bolt — EN 1993-1-8 Table 3.4
      // Ft,Rd = k2 × fub × As / γM2  (k2 = 0.9)
      // =========================================================================
      const k2 = 0.9;
      const Ft_Rd = (k2 * fub * As) / (gammaM2 * 1000);

      const tensionForcePerBolt = FtEd / nBolts;
      const totalTensionCapacity = Ft_Rd * nBolts;
      const tensionUtil = FtEd > 0 ? (tensionForcePerBolt / Ft_Rd) * 100 : 0;
      const tensionStatus = tensionUtil <= 100 ? 'PASS' : 'FAIL';

      // =========================================================================
      // COMBINED SHEAR + TENSION — EN 1993-1-8 Table 3.4
      // Fv,Ed/Fv,Rd + Ft,Ed/(1.4×Ft,Rd) ≤ 1.0
      // =========================================================================
      const combinedRatio = shearForcePerBolt / Fv_Rd + tensionForcePerBolt / (1.4 * Ft_Rd);
      const combinedUtil = combinedRatio * 100;
      const combinedStatus = combinedRatio <= 1.0 ? 'PASS' : 'FAIL';

      // =========================================================================
      // SLIP RESISTANCE (for preloaded bolts) — EN 1993-1-8 §3.9
      // =========================================================================
      let Fp_C = 0;
      let Fs_Rd = 0;
      let slipUtil = 0;
      let slipStatus = 'N/A';

      if (form.isPreloaded) {
        const frictionClass = FRICTION_CLASSES[form.frictionCoefficient];
        const mu = frictionClass ? frictionClass.mu : 0.5;
        const n = parseInt(form.numberOfFrictionSurfaces);
        const ks = holeType.ks;

        Fp_C = (0.7 * fub * As) / 1000;
        Fs_Rd = (ks * n * mu * Fp_C) / gammaM3;

        slipUtil = (shearForcePerBolt / Fs_Rd) * 100;
        slipStatus = slipUtil <= 100 ? 'PASS' : 'FAIL';
      }

      // =========================================================================
      // BLOCK TEARING — EN 1993-1-8 §3.10.2
      // =========================================================================
      const plateWidth = parseFloat(form.plateWidth);
      const Ant = (plateWidth - (nCols - 1) * p2 - (nCols * d0) / 2) * t;
      const Anv = ((nRows - 1) * p1 + e1 - (nRows - 0.5) * d0) * t * 2;

      const gammaM0 = 1.0;
      const blockTearingCapacity =
        (fu * Ant) / (gammaM2 * 1000) + ((1 / Math.sqrt(3)) * fy * Anv) / (gammaM0 * 1000);
      const blockTearingUtil = (VEd / blockTearingCapacity) * 100;
      const blockTearingStatus = blockTearingUtil <= 100 ? 'PASS' : 'FAIL';

      // =========================================================================
      // OVERALL ASSESSMENT
      // =========================================================================
      const allUtils = [shearUtil, bearingUtil, tensionUtil, combinedUtil, blockTearingUtil];
      if (form.isPreloaded) allUtils.push(slipUtil);

      const maxUtil = Math.max(...allUtils.filter((u) => u > 0 && !isNaN(u)));

      const checkNames = ['Shear', 'Bearing', 'Tension', 'Combined', 'Block Tearing'];
      if (form.isPreloaded) checkNames.push('Slip');

      const criticalIndex = allUtils.indexOf(maxUtil);
      const criticalCheck = checkNames[criticalIndex] || 'Shear';

      const status = maxUtil <= 100 ? 'PASS' : 'FAIL';

      // =========================================================================
      // WARNINGS
      // =========================================================================
      const minEdgeDistance = 1.2 * d0;
      if (e1 < minEdgeDistance) {
        newWarnings.push(
          `End distance e1 = ${e1}mm < min ${minEdgeDistance.toFixed(1)}mm (1.2×d0)`,
        );
      }
      if (e2 < minEdgeDistance) {
        newWarnings.push(
          `Edge distance e2 = ${e2}mm < min ${minEdgeDistance.toFixed(1)}mm (1.2×d0)`,
        );
      }
      const minSpacing = 2.2 * d0;
      if (p1 < minSpacing) {
        newWarnings.push(`Pitch p1 = ${p1}mm < min ${minSpacing.toFixed(1)}mm (2.2×d0)`);
      }
      if (p2 < minSpacing && nCols > 1) {
        newWarnings.push(`Pitch p2 = ${p2}mm < min ${minSpacing.toFixed(1)}mm (2.2×d0)`);
      }
      const maxEdgeDistance = Math.min(12 * t, 150);
      if (e1 > maxEdgeDistance || e2 > maxEdgeDistance) {
        newWarnings.push(
          `Edge distances exceed max ${maxEdgeDistance.toFixed(0)}mm (min of 12t or 150mm)`,
        );
      }
      if (shearUtil > 85 && shearUtil <= 100) {
        newWarnings.push('High shear utilisation — consider additional bolts');
      }
      if (bearingUtil > 85 && bearingUtil <= 100) {
        newWarnings.push('High bearing utilisation — consider thicker plate or larger bolts');
      }
      if (form.boltGrade === '10.9' && !form.isPreloaded) {
        newWarnings.push(
          'Grade 10.9 bolts typically used as preloaded in slip-critical connections',
        );
      }

      setResults({
        boltDiameter: d,
        tensileStressArea: As,
        shankArea: A,
        fub,
        fyb,
        fu,
        fy,
        shearCapacityPerBolt: Fv_Rd,
        totalShearCapacity,
        shearForcePerBolt,
        shearUtil,
        shearStatus,
        bearingCapacityPerBolt: Fb_Rd,
        alphab,
        k1,
        bearingUtil,
        bearingStatus,
        tensionCapacityPerBolt: Ft_Rd,
        totalTensionCapacity,
        tensionForcePerBolt,
        tensionUtil,
        tensionStatus,
        combinedRatio,
        combinedUtil,
        combinedStatus,
        preloadForce: Fp_C,
        slipResistancePerBolt: Fs_Rd,
        totalSlipResistance: Fs_Rd * nBolts,
        slipUtil,
        slipStatus,
        Ant,
        Anv,
        blockTearingCapacity,
        blockTearingUtil,
        blockTearingStatus,
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
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Bolted Connection Design',
      subtitle: `${form.boltDiameter} Grade ${form.boltGrade} — EN 1993-1-8`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'BC001' },
        { label: 'Standard', value: 'EN 1993-1-8' },
      ],
      inputs: [
        { label: 'Bolt Diameter', value: form.boltDiameter },
        { label: 'Bolt Grade', value: form.boltGrade },
        { label: 'Number of Bolts', value: form.numberOfBolts },
        { label: 'Bolt Pattern', value: form.boltPattern },
        { label: 'Hole Type', value: form.holeType },
        { label: 'Plate Thickness', value: form.plateThickness, unit: 'mm' },
        { label: 'Plate Grade', value: form.plateGrade },
        { label: 'Shear Force (V_Ed)', value: form.shearForce, unit: 'kN' },
        { label: 'Tension Force (F_t,Ed)', value: form.tensionForce, unit: 'kN' },
        { label: 'Edge Distance e1', value: form.edgeDistanceE1, unit: 'mm' },
        { label: 'Edge Distance e2', value: form.edgeDistanceE2, unit: 'mm' },
        { label: 'Pitch p1', value: form.pitchP1, unit: 'mm' },
        { label: 'Pitch p2', value: form.pitchP2, unit: 'mm' },
      ],
      sections: [
        {
          title: 'Connection Capacity Analysis',
          head: [['Check', 'Capacity', 'Applied', 'Utilisation', 'Status']],
          body: [
            [
              'Bolt Shear (F_v,Rd)',
              `${results.totalShearCapacity.toFixed(1)} kN`,
              `${parseFloat(form.shearForce).toFixed(1)} kN`,
              `${results.shearUtil.toFixed(1)}%`,
              results.shearStatus,
            ],
            [
              'Bearing (F_b,Rd)',
              `${results.bearingCapacityPerBolt.toFixed(1)} kN/bolt`,
              `${results.shearForcePerBolt.toFixed(1)} kN/bolt`,
              `${results.bearingUtil.toFixed(1)}%`,
              results.bearingStatus,
            ],
            [
              'Bolt Tension (F_t,Rd)',
              `${results.totalTensionCapacity.toFixed(1)} kN`,
              `${parseFloat(form.tensionForce).toFixed(1)} kN`,
              `${results.tensionUtil.toFixed(1)}%`,
              results.tensionStatus,
            ],
            [
              'Combined Shear+Tension',
              '-',
              `Ratio: ${results.combinedRatio.toFixed(3)}`,
              `${results.combinedUtil.toFixed(1)}%`,
              results.combinedStatus,
            ],
            [
              'Block Tearing',
              `${results.blockTearingCapacity.toFixed(1)} kN`,
              `${parseFloat(form.shearForce).toFixed(1)} kN`,
              `${results.blockTearingUtil.toFixed(1)}%`,
              results.blockTearingStatus,
            ],
            ...(form.isPreloaded
              ? [
                  [
                    'Slip Resistance',
                    `${results.totalSlipResistance.toFixed(1)} kN`,
                    `${parseFloat(form.shearForce).toFixed(1)} kN`,
                    `${results.slipUtil.toFixed(1)}%`,
                    results.slipStatus,
                  ],
                ]
              : []),
            ['', '', '', '', ''],
            [
              'Bearing Params',
              `\u03b1b = ${results.alphab.toFixed(3)}`,
              `k1 = ${results.k1.toFixed(3)}`,
              '',
              '',
            ],
            [
              'Bolt Areas',
              `As = ${results.tensileStressArea} mm\u00b2`,
              `A = ${results.shankArea} mm\u00b2`,
              '',
              '',
            ],
            [
              'Material',
              `fub = ${results.fub} MPa`,
              `fu = ${results.fu} MPa`,
              `fy = ${results.fy} MPa`,
              '',
            ],
          ],
        },
      ],
      checks: [
        {
          name: 'Bolt Shear',
          capacity: `${results.totalShearCapacity.toFixed(1)} kN`,
          utilisation: String(`${results.shearUtil.toFixed(1)}%`),
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Bearing',
          capacity: `${results.bearingCapacityPerBolt.toFixed(1)} kN/bolt`,
          utilisation: String(`${results.bearingUtil.toFixed(1)}%`),
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Bolt Tension',
          capacity: `${results.totalTensionCapacity.toFixed(1)} kN`,
          utilisation: String(`${results.tensionUtil.toFixed(1)}%`),
          status: results.tensionStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Combined V+T',
          capacity: `Ratio: ${results.combinedRatio.toFixed(3)}`,
          utilisation: String(`${results.combinedUtil.toFixed(1)}%`),
          status: results.combinedStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Block Tearing',
          capacity: `${results.blockTearingCapacity.toFixed(1)} kN`,
          utilisation: String(`${results.blockTearingUtil.toFixed(1)}%`),
          status: results.blockTearingStatus as 'PASS' | 'FAIL',
        },
        ...(form.isPreloaded
          ? [
              {
                name: 'Slip Resistance' as const,
                capacity: `${results.totalSlipResistance.toFixed(1)} kN`,
                utilisation: String(`${results.slipUtil.toFixed(1)}%`),
                status: results.slipStatus as 'PASS' | 'FAIL',
              },
            ]
          : []),
      ],
      recommendations: [
        {
          check: 'Edge Distances',
          suggestion: `Verify e1 \u2265 ${(1.2 * (BOLT_DIMENSIONS[form.boltDiameter]?.d0 || 22)).toFixed(0)}mm and e2 \u2265 ${(1.2 * (BOLT_DIMENSIONS[form.boltDiameter]?.d0 || 22)).toFixed(0)}mm (1.2\u00d7d0)`,
        },
        {
          check: 'Bolt Spacing',
          suggestion: `Verify p1, p2 \u2265 ${(2.2 * (BOLT_DIMENSIONS[form.boltDiameter]?.d0 || 22)).toFixed(0)}mm (2.2\u00d7d0)`,
        },
        {
          check: 'Connection Ductility',
          suggestion: 'Ensure bearing capacity governs over net section for ductile failure mode',
        },
        {
          check: 'Bolt Tightening',
          suggestion: form.isPreloaded
            ? 'Use calibrated wrench or DTIs for preloaded bolts'
            : 'Snug-tight installation adequate for non-preloaded connections',
        },
      ],
      warnings: warnings,
      footerNote: 'Beaver Bridges Ltd \u2014 EN 1993-1-8 Bolted Connection Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Bolted Connection Design',
      subtitle: `${form.boltDiameter} Grade ${form.boltGrade} — EN 1993-1-8`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'BC001' },
        { label: 'Standard', value: 'EN 1993-1-8' },
      ],
      inputs: [
        { label: 'Bolt Diameter', value: form.boltDiameter },
        { label: 'Bolt Grade', value: form.boltGrade },
        { label: 'Number of Bolts', value: form.numberOfBolts },
        { label: 'Bolt Pattern', value: form.boltPattern },
        { label: 'Hole Type', value: form.holeType },
        { label: 'Plate Thickness', value: form.plateThickness, unit: 'mm' },
        { label: 'Plate Grade', value: form.plateGrade },
        { label: 'Shear Force (V_Ed)', value: form.shearForce, unit: 'kN' },
        { label: 'Tension Force (F_t,Ed)', value: form.tensionForce, unit: 'kN' },
        { label: 'Edge Distance e1', value: form.edgeDistanceE1, unit: 'mm' },
        { label: 'Edge Distance e2', value: form.edgeDistanceE2, unit: 'mm' },
        { label: 'Pitch p1', value: form.pitchP1, unit: 'mm' },
        { label: 'Pitch p2', value: form.pitchP2, unit: 'mm' },
      ],
      sections: [
        {
          title: 'Connection Capacity Analysis',
          head: [['Check', 'Capacity', 'Applied', 'Utilisation', 'Status']],
          body: [
            [
              'Bolt Shear (F_v,Rd)',
              `${results.totalShearCapacity.toFixed(1)} kN`,
              `${parseFloat(form.shearForce).toFixed(1)} kN`,
              `${results.shearUtil.toFixed(1)}%`,
              results.shearStatus,
            ],
            [
              'Bearing (F_b,Rd)',
              `${results.bearingCapacityPerBolt.toFixed(1)} kN/bolt`,
              `${results.shearForcePerBolt.toFixed(1)} kN/bolt`,
              `${results.bearingUtil.toFixed(1)}%`,
              results.bearingStatus,
            ],
            [
              'Bolt Tension (F_t,Rd)',
              `${results.totalTensionCapacity.toFixed(1)} kN`,
              `${parseFloat(form.tensionForce).toFixed(1)} kN`,
              `${results.tensionUtil.toFixed(1)}%`,
              results.tensionStatus,
            ],
            [
              'Combined Shear+Tension',
              '-',
              `Ratio: ${results.combinedRatio.toFixed(3)}`,
              `${results.combinedUtil.toFixed(1)}%`,
              results.combinedStatus,
            ],
            [
              'Block Tearing',
              `${results.blockTearingCapacity.toFixed(1)} kN`,
              `${parseFloat(form.shearForce).toFixed(1)} kN`,
              `${results.blockTearingUtil.toFixed(1)}%`,
              results.blockTearingStatus,
            ],
            ...(form.isPreloaded
              ? [
                  [
                    'Slip Resistance',
                    `${results.totalSlipResistance.toFixed(1)} kN`,
                    `${parseFloat(form.shearForce).toFixed(1)} kN`,
                    `${results.slipUtil.toFixed(1)}%`,
                    results.slipStatus,
                  ],
                ]
              : []),
            ['', '', '', '', ''],
            [
              'Bearing Params',
              `\u03b1b = ${results.alphab.toFixed(3)}`,
              `k1 = ${results.k1.toFixed(3)}`,
              '',
              '',
            ],
            [
              'Bolt Areas',
              `As = ${results.tensileStressArea} mm\u00b2`,
              `A = ${results.shankArea} mm\u00b2`,
              '',
              '',
            ],
            [
              'Material',
              `fub = ${results.fub} MPa`,
              `fu = ${results.fu} MPa`,
              `fy = ${results.fy} MPa`,
              '',
            ],
          ],
        },
      ],
      checks: [
        {
          name: 'Bolt Shear',
          capacity: `${results.totalShearCapacity.toFixed(1)} kN`,
          utilisation: String(`${results.shearUtil.toFixed(1)}%`),
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Bearing',
          capacity: `${results.bearingCapacityPerBolt.toFixed(1)} kN/bolt`,
          utilisation: String(`${results.bearingUtil.toFixed(1)}%`),
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Bolt Tension',
          capacity: `${results.totalTensionCapacity.toFixed(1)} kN`,
          utilisation: String(`${results.tensionUtil.toFixed(1)}%`),
          status: results.tensionStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Combined V+T',
          capacity: `Ratio: ${results.combinedRatio.toFixed(3)}`,
          utilisation: String(`${results.combinedUtil.toFixed(1)}%`),
          status: results.combinedStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Block Tearing',
          capacity: `${results.blockTearingCapacity.toFixed(1)} kN`,
          utilisation: String(`${results.blockTearingUtil.toFixed(1)}%`),
          status: results.blockTearingStatus as 'PASS' | 'FAIL',
        },
        ...(form.isPreloaded
          ? [
              {
                name: 'Slip Resistance' as const,
                capacity: `${results.totalSlipResistance.toFixed(1)} kN`,
                utilisation: String(`${results.slipUtil.toFixed(1)}%`),
                status: results.slipStatus as 'PASS' | 'FAIL',
              },
            ]
          : []),
      ],
      recommendations: [
        {
          check: 'Edge Distances',
          suggestion: `Verify e1 \u2265 ${(1.2 * (BOLT_DIMENSIONS[form.boltDiameter]?.d0 || 22)).toFixed(0)}mm and e2 \u2265 ${(1.2 * (BOLT_DIMENSIONS[form.boltDiameter]?.d0 || 22)).toFixed(0)}mm (1.2\u00d7d0)`,
        },
        {
          check: 'Bolt Spacing',
          suggestion: `Verify p1, p2 \u2265 ${(2.2 * (BOLT_DIMENSIONS[form.boltDiameter]?.d0 || 22)).toFixed(0)}mm (2.2\u00d7d0)`,
        },
        {
          check: 'Connection Ductility',
          suggestion: 'Ensure bearing capacity governs over net section for ductile failure mode',
        },
        {
          check: 'Bolt Tightening',
          suggestion: form.isPreloaded
            ? 'Use calibrated wrench or DTIs for preloaded bolts'
            : 'Snug-tight installation adequate for non-preloaded connections',
        },
      ],
      warnings: warnings,
      footerNote: 'Beaver Bridges Ltd \u2014 EN 1993-1-8 Bolted Connection Design',
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
      className={cn('rounded-2xl border overflow-hidden', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/40 backdrop-blur-md hover:bg-gray-700/40 transition-colors"
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
            className="p-4 bg-gray-900/40 backdrop-blur-sm"
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
    field: keyof BoltedConnectionForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title={label}
          type={type}
          value={form[field] as string}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
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
      {/* Grid pattern */}
      <div
        className="fixed inset-0 z-0 opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 mb-4">
            <FiGrid className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1993-1-8 Compliant</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-4">
            Bolted Connection Design
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Steel bolted connection design with shear, bearing, tension, slip resistance, and block
            tearing checks to Eurocode 3
          </p>
        </motion.div>

        {/* Project Info */}
        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="Project Name" field="projectName" type="text" />
              <InputField label="Reference" field="reference" type="text" />
            </div>
          </CardContent>
        </Card>

        {/* Presets */}
        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
          <CardHeader className="pb-3">
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
                  className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 max-w-xl mx-auto">
          {(['input', 'results', 'visualization'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab)}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Input Column */}
              <div className="lg:col-span-2 space-y-4">
                {/* Bolt Properties */}
                <Section
                  id="bolts"
                  title="Bolt Properties"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-cyan-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Bolt Diameter</label>
                      <select
                        title="Bolt Diameter"
                        value={form.boltDiameter}
                        onChange={(e) => updateForm('boltDiameter', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(BOLT_DIMENSIONS).map(([size, props]) => (
                          <option key={size} value={size}>
                            {size} (As = {props.As} mm²)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Bolt Grade</label>
                      <select
                        title="Bolt Grade"
                        value={form.boltGrade}
                        onChange={(e) => updateForm('boltGrade', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(BOLT_GRADES).map(([grade, props]) => (
                          <option key={grade} value={grade}>
                            Grade {grade} (fub = {props.fub} MPa)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Number of Bolts</label>
                      <select
                        title="Number of Bolts"
                        value={form.numberOfBolts}
                        onChange={(e) => updateForm('numberOfBolts', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {[2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Hole Type</label>
                      <select
                        title="Hole Type"
                        value={form.holeType}
                        onChange={(e) => updateForm('holeType', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        <option value="standard">Standard (ks = 1.0)</option>
                        <option value="oversized">Oversized (ks = 0.85)</option>
                        <option value="slotted_short">Short Slotted (ks = 0.76)</option>
                        <option value="slotted_long">Long Slotted (ks = 0.63)</option>
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Plate Properties */}
                <Section
                  id="plate"
                  title="Plate Properties"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-emerald-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Plate Thickness (t)" field="plateThickness" unit="mm" />
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Plate Grade</label>
                      <select
                        title="Plate Grade"
                        value={form.plateGrade}
                        onChange={(e) => updateForm('plateGrade', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(STEEL_GRADES).map(([grade, props]) => (
                          <option key={grade} value={grade}>
                            {grade} (fy = {props.fy} MPa, fu = {props.fu} MPa)
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Plate Width" field="plateWidth" unit="mm" />
                    <InputField label="Plate Length" field="plateLength" unit="mm" />
                  </div>
                </Section>

                {/* Applied Forces */}
                <Section
                  id="forces"
                  title="Applied Forces"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-purple-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Shear Force (V_Ed)" field="shearForce" unit="kN" />
                    <InputField label="Tension Force (Ft_Ed)" field="tensionForce" unit="kN" />
                  </div>
                </Section>

                {/* Geometry */}
                <Section
                  id="geometry"
                  title="Bolt Layout Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiSliders className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-amber-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="End Distance (e1)" field="edgeDistanceE1" unit="mm" />
                    <InputField label="Edge Distance (e2)" field="edgeDistanceE2" unit="mm" />
                    <InputField label="Pitch (p1) — Load Direction" field="pitchP1" unit="mm" />
                    <InputField label="Pitch (p2) — Perpendicular" field="pitchP2" unit="mm" />
                    <InputField label="Number of Rows" field="numberOfRows" />
                    <InputField label="Number of Columns" field="numberOfColumns" />
                  </div>
                </Section>

                {/* Slip Resistance */}
                <Section
                  id="slip"
                  title="Slip Resistance (Preloaded)"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  color="border-pink-500/30"
                >
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        title="Slip Resistance"
                        type="checkbox"
                        checked={form.isPreloaded}
                        onChange={(e) => updateForm('isPreloaded', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/50"
                      />
                      <span className="text-white">Preloaded (HSFG) Bolts</span>
                    </label>

                    {form.isPreloaded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid md:grid-cols-2 gap-4"
                      >
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-200">Friction Class</label>
                          <select
                            title="Friction Class"
                            value={form.frictionCoefficient}
                            onChange={(e) => updateForm('frictionCoefficient', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                          >
                            {Object.entries(FRICTION_CLASSES).map(([cls, props]) => (
                              <option key={cls} value={cls}>
                                Class {cls} (μ = {props.mu}) — {props.description}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-semibold text-gray-200">
                            Number of Friction Surfaces (n)
                          </label>
                          <select
                            title="Number of Friction Surfaces (n)"
                            value={form.numberOfFrictionSurfaces}
                            onChange={(e) => updateForm('numberOfFrictionSurfaces', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                          >
                            <option value="1">1 (Single shear)</option>
                            <option value="2">2 (Double shear)</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Section>

                {/* Calculate Button */}
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-2xl shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>

              {/* Warnings Sidebar */}
              <div className="space-y-4 sticky top-8">
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <FiAlertTriangle className="text-amber-400" /> Warnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {warnings.length === 0 ? (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <FiCheck /> All geometry OK
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

                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-bold text-white">Design Codes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-xs text-gray-500">
                      <li className="flex items-center gap-2">
                        <FiChevronRight className="text-cyan-500" /> EN 1993-1-8 Table 3.4
                      </li>
                      <li className="flex items-center gap-2">
                        <FiChevronRight className="text-cyan-500" /> Shear Capacity §3.6
                      </li>
                      <li className="flex items-center gap-2">
                        <FiChevronRight className="text-cyan-500" /> Bearing Capacity §3.6
                      </li>
                      <li className="flex items-center gap-2">
                        <FiChevronRight className="text-cyan-500" /> Block Tearing §3.10
                      </li>
                      <li className="flex items-center gap-2">
                        <FiChevronRight className="text-cyan-500" /> HSFG Preload §3.9
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-400"
                  onClick={exportPDF}
                >
                  <FiDownload className="mr-2" /> Export PDF
                </Button>
                <SaveRunButton
                  calculatorKey="bolted-connection"
                  inputs={form as unknown as Record<string, string | number>}
                  results={results}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gray-900/50 border-l-4 border-l-cyan-500 border-cyan-500/30 shadow-lg shadow-cyan-500/10 p-6">
                  <h3 className="text-white font-bold mb-2">Maximum Utilisation</h3>
                  <div
                    className={cn(
                      'text-4xl font-black',
                      results.maxUtil <= 100 ? 'text-cyan-400' : 'text-red-400',
                    )}
                  >
                    {results.maxUtil.toFixed(1)}%
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Critical: {results.criticalCheck}</p>
                </Card>
                <Card
                  className={cn(
                    'bg-gray-900/50 p-6 border-l-4 shadow-lg',
                    results.status === 'PASS'
                      ? 'border-l-emerald-500 border-emerald-500/30 shadow-emerald-500/10'
                      : 'border-l-red-500 border-red-500/30 shadow-red-500/10',
                  )}
                >
                  <h3 className="text-white font-bold mb-2">Status</h3>
                  <div
                    className={cn(
                      'text-2xl font-black',
                      results.status === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {results.status}
                  </div>
                </Card>
                <Card className="bg-gray-900/50 border-l-4 border-l-purple-500 border-purple-500/30 shadow-lg shadow-purple-500/10 p-6">
                  <h3 className="text-white font-bold mb-2">Connection</h3>
                  <div className="text-xl font-bold text-gray-400">
                    {form.boltDiameter} Gr {form.boltGrade}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {form.numberOfBolts} bolts in {form.plateGrade} plate
                  </p>
                </Card>
              </div>

              {/* Check Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: 'Shear',
                    util: results.shearUtil,
                    status: results.shearStatus,
                    cap: `${results.totalShearCapacity.toFixed(1)} kN`,
                  },
                  {
                    name: 'Bearing',
                    util: results.bearingUtil,
                    status: results.bearingStatus,
                    cap: `${results.bearingCapacityPerBolt.toFixed(1)} kN/bolt`,
                  },
                  {
                    name: 'Tension',
                    util: results.tensionUtil,
                    status: results.tensionStatus,
                    cap: `${results.totalTensionCapacity.toFixed(1)} kN`,
                  },
                  {
                    name: 'Combined',
                    util: results.combinedUtil,
                    status: results.combinedStatus,
                    cap: `Ratio: ${results.combinedRatio.toFixed(3)}`,
                  },
                  {
                    name: 'Block Tearing',
                    util: results.blockTearingUtil,
                    status: results.blockTearingStatus,
                    cap: `${results.blockTearingCapacity.toFixed(1)} kN`,
                  },
                  ...(form.isPreloaded
                    ? [
                        {
                          name: 'Slip',
                          util: results.slipUtil,
                          status: results.slipStatus,
                          cap: `${results.totalSlipResistance.toFixed(1)} kN`,
                        },
                      ]
                    : []),
                ].map((check) => (
                  <Card
                    key={check.name}
                    className={cn(
                      'bg-gray-900/50 p-4 shadow-lg border-l-4',
                      check.status === 'FAIL'
                        ? 'border-l-red-500 border-red-500/50 shadow-red-500/10'
                        : check.util > 70
                          ? 'border-l-amber-500 border-amber-500/30 shadow-amber-500/5'
                          : 'border-l-emerald-500 border-gray-800 shadow-emerald-500/5',
                    )}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">{check.name}</span>
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-1 rounded',
                          check.status === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {check.status}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">{check.util.toFixed(1)}%</div>
                    <p className="text-gray-500 text-xs mt-1">{check.cap}</p>
                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          check.util <= 70
                            ? 'bg-emerald-500'
                            : check.util <= 100
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min(check.util, 100)}%` }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
              {/* Recommendations */}
              <Card className="bg-cyan-500/5 border-cyan-500/20 p-6">
                <div className="flex items-center gap-2 text-cyan-400 mb-3">
                  <FiCheck />
                  <span className="font-medium">Recommendations</span>
                </div>
                <ul className="text-sm text-cyan-300/80 space-y-2">
                  <li>• Verify edge distances e1, e2 ≥ 1.2×d0 per EN 1993-1-8 Table 3.3</li>
                  <li>• Ensure bolt spacing p1, p2 ≥ 2.2×d0 for adequate load distribution</li>
                  <li>
                    • Critical check: {results.criticalCheck} at {results.maxUtil.toFixed(1)}%
                    utilisation
                  </li>
                  <li>
                    •{' '}
                    {form.isPreloaded
                      ? 'Preloaded bolts — use calibrated wrench or DTIs for tightening'
                      : 'Non-preloaded — consider HSFG bolts for fatigue-sensitive connections'}
                  </li>
                </ul>
              </Card>
            </motion.div>
          )}

          {activeTab === 'visualization' && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
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
                    <Interactive3DDiagram
                      height="h-full"
                      cameraPosition={[8, 6, 8]}
                      status={results ? (results.status as 'PASS' | 'FAIL') : undefined}
                    >
                      <BoltedConnection3D
                        beamDepth={300}
                        beamWidth={150}
                        columnDepth={300}
                        columnWidth={300}
                        endPlateH={parseFloat(form.plateLength) || 400}
                        endPlateW={parseFloat(form.plateWidth) || 200}
                        endPlateT={parseFloat(form.plateThickness) || 20}
                        boltDiameter={parseFloat(form.boltDiameter?.replace('M', '')) || 20}
                        boltRows={parseInt(form.numberOfRows) || 4}
                        boltCols={parseInt(form.numberOfColumns) || 2}
                        shearForce={parseFloat(form.shearForce) || 0}
                        status={results ? (results.status as 'PASS' | 'FAIL') : undefined}
                      />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                      aria-label="Minimize preview"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      BOLTED CONNECTION — REAL-TIME PREVIEW
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
                        { label: 'Bolt Size', value: form.boltDiameter },
                        { label: 'Bolt Grade', value: form.boltGrade },
                        { label: 'No. Bolts', value: form.numberOfBolts },
                        { label: 'Plate Thickness', value: `${form.plateThickness} mm` },
                        { label: 'Plate Grade', value: form.plateGrade },
                        { label: 'Shear Force', value: `${form.shearForce} kN` },
                        { label: 'Tension Force', value: `${form.tensionForce} kN` },
                      ].map((stat) => (
                        <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                          <span className="text-gray-500">{stat.label}</span>
                          <span className="text-white font-medium">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                    {results && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1">Last Analysis</div>
                        {[
                          { label: 'Shear', util: results.shearUtil.toFixed(1), status: results.shearStatus },
                          { label: 'Bearing', util: results.bearingUtil.toFixed(1), status: results.bearingStatus },
                          { label: 'Tension', util: results.tensionUtil.toFixed(1), status: results.tensionStatus },
                          { label: 'Combined', util: results.combinedUtil.toFixed(1), status: results.combinedStatus },
                          { label: 'Block Tearing', util: results.blockTearingUtil.toFixed(1), status: results.blockTearingStatus },
                        ].map((check) => (
                          <div key={check.label} className="flex justify-between text-xs py-0.5">
                            <span className="text-gray-500">{check.label}</span>
                            <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util || '0')) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                              {check.util}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors"
                    >
                      Close Fullscreen
                    </button>
                  </div>
                </motion.div>
              )}
              <div className="relative">
                <button
                  onClick={() => setPreviewMaximized(true)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                  aria-label="Maximize preview"
                  title="Fullscreen preview"
                >
                  <FiMaximize2 size={16} />
                </button>
                <WhatIfPreview
                  title="Bolted Connection — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram
                      height={fsHeight}
                      cameraPosition={[8, 6, 8]}
                      status={results ? (results.status as 'PASS' | 'FAIL') : undefined}
                    >
                      <BoltedConnection3D
                        beamDepth={300}
                        beamWidth={150}
                        columnDepth={300}
                        columnWidth={300}
                        endPlateH={parseFloat(form.plateLength) || 400}
                        endPlateW={parseFloat(form.plateWidth) || 200}
                        endPlateT={parseFloat(form.plateThickness) || 20}
                        boltDiameter={parseFloat(form.boltDiameter?.replace('M', '')) || 20}
                        boltRows={parseInt(form.numberOfRows) || 4}
                        boltCols={parseInt(form.numberOfColumns) || 2}
                        shearForce={parseFloat(form.shearForce) || 0}
                        status={results ? (results.status as 'PASS' | 'FAIL') : undefined}
                      />
                    </Interactive3DDiagram>
                  )}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BoltedConnection;
