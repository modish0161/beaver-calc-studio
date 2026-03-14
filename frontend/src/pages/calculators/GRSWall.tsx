// =============================================================================
// BeaverCalc Studio — GRS Wall Calculator (Premium)
// Geosynthetic Reinforced Soil Wall - Internal and External Stability
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiGrid,
    FiInfo,
    FiLayers,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiX
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import GRSWall3D from '../../components/3d/scenes/GRSWall3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  wallHeight: string;
  wallBatter: string;
  spacing: string;
  stripLength: string;
  tensileStrength: string;
  reductionFactor: string;
  phi_r: string;
  gamma_r: string;
  phi_b: string;
  gamma_b: string;
  surcharge: string;
  foundationBearing: string;
  facingType: string;
  reinforcementType: string;
}

interface Results {
  fosSliding: number;
  fosOverturning: number;
  fosStrength: number;
  fosPullout: number;
  qBearing: number;
  maxTension: number;
  allowableTension: number;
  drivingForce: number;
  resistingForce: number;
  overturningMoment: number;
  resistingMoment: number;
  layers: number;
  criticalLayer: number;
  eccentricity: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const REINFORCEMENT_PRESETS: Record<string, { strength: string; rf: string; label: string }> = {
  geogrid_40: { strength: '40', rf: '1.4', label: 'Geogrid 40 kN/m' },
  geogrid_60: { strength: '60', rf: '1.4', label: 'Geogrid 60 kN/m' },
  geogrid_80: { strength: '80', rf: '1.5', label: 'Geogrid 80 kN/m' },
  geogrid_120: { strength: '120', rf: '1.5', label: 'Geogrid 120 kN/m' },
  strip_galv: { strength: '45', rf: '1.2', label: 'Galv. Steel Strip' },
  strip_ss: { strength: '60', rf: '1.1', label: 'Stainless Strip' },
  weldmesh: { strength: '50', rf: '1.3', label: 'Welded Wire Mesh' },
};

const FACING_PRESETS: Record<string, { label: string }> = {
  modular_block: { label: 'Modular Concrete Block' },
  panel: { label: 'Precast Panel' },
  wire_basket: { label: 'Wire Basket (Terramesh)' },
  gabion: { label: 'Gabion Facing' },
  wrapped: { label: 'Wrapped Face' },
};

const SOIL_PRESETS: Record<string, { phi: string; gamma: string; label: string }> = {
  fill_comp: { phi: '34', gamma: '19', label: 'Compacted Fill' },
  granular: { phi: '36', gamma: '20', label: 'Granular Fill' },
  clay_stiff: { phi: '28', gamma: '19', label: 'Stiff Clay' },
  sand_medium: { phi: '32', gamma: '18', label: 'Medium Sand' },
  crushed_rock: { phi: '40', gamma: '21', label: 'Crushed Rock' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const GRSWall = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    reinforcement: true,
    soil: true,
  });

  const [form, setForm] = useState<FormData>({
    wallHeight: '4.0',
    wallBatter: '0',
    spacing: '0.6',
    stripLength: '3.0',
    tensileStrength: '60',
    reductionFactor: '1.4',
    phi_r: '34',
    gamma_r: '19',
    phi_b: '30',
    gamma_b: '18',
    surcharge: '10',
    foundationBearing: '150',
    facingType: 'modular_block',
    reinforcementType: 'geogrid_60',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'wallHeight', label: 'Wall Height' },
  { key: 'wallBatter', label: 'Wall Batter' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'stripLength', label: 'Strip Length' },
  { key: 'tensileStrength', label: 'Tensile Strength' },
  { key: 'reductionFactor', label: 'Reduction Factor' },
  { key: 'phi_r', label: 'Phi R' },
  { key: 'gamma_r', label: 'Gamma R' },
  { key: 'phi_b', label: 'Phi B' },
  { key: 'gamma_b', label: 'Gamma B' },
  { key: 'surcharge', label: 'Surcharge' },
  { key: 'foundationBearing', label: 'Foundation Bearing' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map(e => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'wallHeight', label: 'Wall Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'wallBatter', label: 'Wall Batter', min: 0, max: 100, step: 1, unit: '' },
    { key: 'spacing', label: 'Spacing', min: 0, max: 100, step: 1, unit: '' },
    { key: 'stripLength', label: 'Strip Length', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedSoilR, setSelectedSoilR] = useState<string>('fill_comp');
  const [selectedSoilB, setSelectedSoilB] = useState<string>('sand_medium');
  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    if (!validateInputs()) return;
    const newWarnings: Warning[] = [];

    try {
      const H = parseFloat(form.wallHeight);
      const Sv = parseFloat(form.spacing);
      const L = parseFloat(form.stripLength);
      const T_ult = parseFloat(form.tensileStrength);
      const RF = parseFloat(form.reductionFactor);
      const phi_r = (parseFloat(form.phi_r) * Math.PI) / 180;
      const gamma_r = parseFloat(form.gamma_r);
      const phi_b = (parseFloat(form.phi_b) * Math.PI) / 180;
      const gamma_b = parseFloat(form.gamma_b);
      const q = parseFloat(form.surcharge);
      const qf = parseFloat(form.foundationBearing);

      if (H <= 0 || L <= 0 || Sv <= 0) {
        newWarnings.push({ type: 'error', message: 'Dimensions must be positive' });
        setWarnings(newWarnings);
        return;
      }

      const T_allow = T_ult / RF;
      const layers = Math.floor(H / Sv);

      // External Stability - Weight of reinforced block
      const W_block = H * L * gamma_r;

      // Earth pressure coefficients
      const Ka_b = (1 - Math.sin(phi_b)) / (1 + Math.sin(phi_b));
      const Ka_r = (1 - Math.sin(phi_r)) / (1 + Math.sin(phi_r));

      // Driving forces
      const Pa = 0.5 * Ka_b * gamma_b * H * H;
      const Pq = Ka_b * q * H;
      const P_drive = Pa + Pq;

      // Overturning moments
      const Ma_soil = Pa * (H / 3);
      const Ma_q = Pq * (H / 2);
      const M_overturn = Ma_soil + Ma_q;

      // Resisting forces - Sliding
      const mu = Math.tan(phi_r);
      const V_total = W_block + q * L;
      const P_resist = V_total * mu;
      const fosSliding = P_resist / P_drive;

      // Resisting moment - Overturning
      const M_resist = W_block * (L / 2) + q * L * (L / 2);
      const fosOverturning = M_resist / M_overturn;

      // Bearing pressure - Meyerhof
      const M_net = M_resist - M_overturn;
      const x_bar = M_net / V_total;
      const eccentricity = L / 2 - x_bar;
      const B_eff = L - 2 * eccentricity;
      const qBearing = V_total / B_eff;

      // Internal stability - max tension
      const sigma_v_max = gamma_r * H + q;
      const sigma_h_max = Ka_r * sigma_v_max;
      const maxTension = sigma_h_max * Sv;
      const fosStrength = T_allow / maxTension;

      // Pullout check (critical at top layer)
      const z_top = Sv;
      const sigma_v_top = gamma_r * z_top + q;
      const activeZoneWidth = z_top / Math.tan(Math.PI / 4 + phi_r / 2);
      const Le_top = Math.max(0, L - activeZoneWidth);
      const F_star = 0.8 * Math.tan(phi_r);
      const P_pullout = 2 * Le_top * sigma_v_top * F_star;
      const T_req_top = Ka_r * sigma_v_top * Sv;
      const fosPullout = P_pullout / Math.max(T_req_top, 0.1);

      // Critical layer (highest utilisation)
      let maxUtil = 0;
      let criticalLayer = 1;
      for (let i = 1; i <= layers; i++) {
        const z = i * Sv;
        const sigma_v = gamma_r * z + q;
        const T_req = Ka_r * sigma_v * Sv;
        const util = T_req / T_allow;
        if (util > maxUtil) {
          maxUtil = util;
          criticalLayer = i;
        }
      }

      // Warnings
      if (fosSliding < 1.5 && fosSliding >= 1.0) {
        newWarnings.push({
          type: 'warning',
          message: `Sliding FOS ${fosSliding.toFixed(2)} < 1.5`,
        });
      }
      if (fosOverturning < 2.0 && fosOverturning >= 1.5) {
        newWarnings.push({
          type: 'warning',
          message: `Overturning FOS ${fosOverturning.toFixed(2)} < 2.0`,
        });
      }
      if (qBearing > qf * 0.8) {
        newWarnings.push({
          type: 'warning',
          message: `Bearing ${((qBearing / qf) * 100).toFixed(0)}% of allowable`,
        });
      }
      if (eccentricity > L / 6) {
        newWarnings.push({
          type: 'warning',
          message: `Eccentricity ${eccentricity.toFixed(2)}m > L/6`,
        });
      }
      if (L < 0.7 * H) {
        newWarnings.push({
          type: 'info',
          message: `L/H = ${(L / H).toFixed(2)} (recommend ≥ 0.7)`,
        });
      }

      const overallStatus =
        fosSliding >= 1.5 && fosOverturning >= 1.5 && fosStrength >= 1.0 && qBearing <= qf
          ? 'PASS'
          : 'FAIL';

      setResults({
        fosSliding,
        fosOverturning,
        fosStrength,
        fosPullout,
        qBearing,
        maxTension,
        allowableTension: T_allow,
        drivingForce: P_drive,
        resistingForce: P_resist,
        overturningMoment: M_overturn,
        resistingMoment: M_resist,
        layers,
        criticalLayer,
        eccentricity,
        overallStatus,
      });
    } catch {
      newWarnings.push({ type: 'error', message: 'Calculation error' });
    }

    setWarnings(newWarnings);
  };

  useEffect(() => {
    calculate();
  }, [form]);

  // ===========================================================================
  // VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applyReinforcementPreset = (key: string) => {
    const preset = REINFORCEMENT_PRESETS[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        reinforcementType: key,
        tensileStrength: preset.strength,
        reductionFactor: preset.rf,
      }));
    }
  };

  const applySoilPresetR = (key: string) => {
    const preset = SOIL_PRESETS[key];
    if (preset) {
      setSelectedSoilR(key);
      setForm((prev) => ({ ...prev, phi_r: preset.phi, gamma_r: preset.gamma }));
    }
  };

  const applySoilPresetB = (key: string) => {
    const preset = SOIL_PRESETS[key];
    if (preset) {
      setSelectedSoilB(key);
      setForm((prev) => ({ ...prev, phi_b: preset.phi, gamma_b: preset.gamma }));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ===========================================================================
  // PDF EXPORT
  // ===========================================================================

  const exportPDF = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.fosSliding < 1.5)
      pdfRecs.push({
        check: 'Sliding Inadequate',
        suggestion: `FOS ${results.fosSliding.toFixed(2)} < 1.5 — increase strip length or reinforced soil friction`,
      });
    if (results.fosOverturning < 1.5)
      pdfRecs.push({
        check: 'Overturning Inadequate',
        suggestion: `FOS ${results.fosOverturning.toFixed(2)} < 1.5 — increase strip length or add surcharge resistance`,
      });
    if (results.fosStrength < 1.0)
      pdfRecs.push({
        check: 'Reinforcement Overstressed',
        suggestion: `Strength FOS ${results.fosStrength.toFixed(2)} < 1.0 — increase tensile strength or reduce spacing`,
      });
    if (results.qBearing > parseFloat(form.foundationBearing))
      pdfRecs.push({
        check: 'Bearing Exceeded',
        suggestion: `${results.qBearing.toFixed(0)} kPa > ${form.foundationBearing} kPa — widen base or reduce load`,
      });
    if (results.eccentricity > parseFloat(form.stripLength) / 6)
      pdfRecs.push({
        check: 'High Eccentricity',
        suggestion: `e = ${results.eccentricity.toFixed(2)}m > L/6 — increase strip length`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'All stability checks pass to BS 8006',
      });
    generatePremiumPDF({
      title: 'Reinforced Soil Wall',
      subtitle: 'GRS Wall — BS 8006 Stability Check',
      projectInfo: [
        { label: 'Project', value: 'Reinforced Soil Wall' },
        { label: 'Reference', value: 'GRS001' },
        { label: 'Standard', value: 'BS 8006' },
      ],
      inputs: [
        { label: 'Wall Height', value: `${form.wallHeight} m` },
        { label: 'Layer Spacing', value: `${form.spacing} m` },
        { label: 'Strip Length', value: `${form.stripLength} m` },
        { label: 'T_ult', value: `${form.tensileStrength} kN/m` },
        { label: 'Reduction Factor', value: form.reductionFactor },
        { label: 'Reinforced φ\u2032', value: `${form.phi_r}°` },
        { label: 'Reinforced γ', value: `${form.gamma_r} kN/m³` },
        { label: 'Retained φ\u2032', value: `${form.phi_b}°` },
        { label: 'Retained γ', value: `${form.gamma_b} kN/m³` },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
        { label: 'Foundation Bearing', value: `${form.foundationBearing} kPa` },
        { label: 'Facing', value: FACING_PRESETS[form.facingType]?.label || form.facingType },
      ],
      sections: [
        {
          title: 'Internal & External Stability',
          head: [['Check', 'Value', 'Requirement']],
          body: [
            ['Sliding FOS', results.fosSliding.toFixed(2), '≥ 1.5'],
            ['Overturning FOS', results.fosOverturning.toFixed(2), '≥ 1.5'],
            ['Strength FOS', results.fosStrength.toFixed(2), '≥ 1.0'],
            ['Pullout FOS', results.fosPullout.toFixed(2), '≥ 1.5'],
            [
              'Bearing Pressure',
              `${results.qBearing.toFixed(0)} kPa`,
              `≤ ${form.foundationBearing} kPa`,
            ],
            [
              'Max Tension',
              `${results.maxTension.toFixed(1)} kN/m`,
              `T_allow = ${results.allowableTension.toFixed(1)} kN/m`,
            ],
            [
              'Eccentricity',
              `${results.eccentricity.toFixed(2)} m`,
              `≤ L/6 = ${(parseFloat(form.stripLength) / 6).toFixed(2)} m`,
            ],
            ['Layers', String(results.layers), ''],
            ['Critical Layer', String(results.criticalLayer), ''],
          ],
        },
      ],
      checks: [
        {
          name: 'Sliding',
          capacity: 'FOS ≥ 1.5',
          utilisation: String(Math.round((1.5 / results.fosSliding) * 100)),
          status: (results.fosSliding >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning',
          capacity: 'FOS ≥ 1.5',
          utilisation: String(Math.round((1.5 / results.fosOverturning) * 100)),
          status: (results.fosOverturning >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Reinforcement Strength',
          capacity: `${results.allowableTension.toFixed(1)} kN/m`,
          utilisation: String(Math.round((results.maxTension / results.allowableTension) * 100)),
          status: (results.fosStrength >= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Bearing',
          capacity: `${form.foundationBearing} kPa`,
          utilisation: String(
            Math.round((results.qBearing / parseFloat(form.foundationBearing)) * 100),
          ),
          status: (results.qBearing <= parseFloat(form.foundationBearing) ? 'PASS' : 'FAIL') as
            | 'PASS'
            | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Reinforced Soil Wall',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.fosSliding < 1.5)
      pdfRecs.push({
        check: 'Sliding Inadequate',
        suggestion: `FOS ${results.fosSliding.toFixed(2)} < 1.5 — increase strip length or reinforced soil friction`,
      });
    if (results.fosOverturning < 1.5)
      pdfRecs.push({
        check: 'Overturning Inadequate',
        suggestion: `FOS ${results.fosOverturning.toFixed(2)} < 1.5 — increase strip length or add surcharge resistance`,
      });
    if (results.fosStrength < 1.0)
      pdfRecs.push({
        check: 'Reinforcement Overstressed',
        suggestion: `Strength FOS ${results.fosStrength.toFixed(2)} < 1.0 — increase tensile strength or reduce spacing`,
      });
    if (results.qBearing > parseFloat(form.foundationBearing))
      pdfRecs.push({
        check: 'Bearing Exceeded',
        suggestion: `${results.qBearing.toFixed(0)} kPa > ${form.foundationBearing} kPa — widen base or reduce load`,
      });
    if (results.eccentricity > parseFloat(form.stripLength) / 6)
      pdfRecs.push({
        check: 'High Eccentricity',
        suggestion: `e = ${results.eccentricity.toFixed(2)}m > L/6 — increase strip length`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'All stability checks pass to BS 8006',
      });
    generateDOCX({
      title: 'Reinforced Soil Wall',
      subtitle: 'GRS Wall — BS 8006 Stability Check',
      projectInfo: [
        { label: 'Project', value: 'Reinforced Soil Wall' },
        { label: 'Reference', value: 'GRS001' },
        { label: 'Standard', value: 'BS 8006' },
      ],
      inputs: [
        { label: 'Wall Height', value: `${form.wallHeight} m` },
        { label: 'Layer Spacing', value: `${form.spacing} m` },
        { label: 'Strip Length', value: `${form.stripLength} m` },
        { label: 'T_ult', value: `${form.tensileStrength} kN/m` },
        { label: 'Reduction Factor', value: form.reductionFactor },
        { label: 'Reinforced φ\u2032', value: `${form.phi_r}°` },
        { label: 'Reinforced γ', value: `${form.gamma_r} kN/m³` },
        { label: 'Retained φ\u2032', value: `${form.phi_b}°` },
        { label: 'Retained γ', value: `${form.gamma_b} kN/m³` },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
        { label: 'Foundation Bearing', value: `${form.foundationBearing} kPa` },
        { label: 'Facing', value: FACING_PRESETS[form.facingType]?.label || form.facingType },
      ],
      sections: [
        {
          title: 'Internal & External Stability',
          head: [['Check', 'Value', 'Requirement']],
          body: [
            ['Sliding FOS', results.fosSliding.toFixed(2), '≥ 1.5'],
            ['Overturning FOS', results.fosOverturning.toFixed(2), '≥ 1.5'],
            ['Strength FOS', results.fosStrength.toFixed(2), '≥ 1.0'],
            ['Pullout FOS', results.fosPullout.toFixed(2), '≥ 1.5'],
            [
              'Bearing Pressure',
              `${results.qBearing.toFixed(0)} kPa`,
              `≤ ${form.foundationBearing} kPa`,
            ],
            [
              'Max Tension',
              `${results.maxTension.toFixed(1)} kN/m`,
              `T_allow = ${results.allowableTension.toFixed(1)} kN/m`,
            ],
            [
              'Eccentricity',
              `${results.eccentricity.toFixed(2)} m`,
              `≤ L/6 = ${(parseFloat(form.stripLength) / 6).toFixed(2)} m`,
            ],
            ['Layers', String(results.layers), ''],
            ['Critical Layer', String(results.criticalLayer), ''],
          ],
        },
      ],
      checks: [
        {
          name: 'Sliding',
          capacity: 'FOS ≥ 1.5',
          utilisation: String(Math.round((1.5 / results.fosSliding) * 100)),
          status: (results.fosSliding >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning',
          capacity: 'FOS ≥ 1.5',
          utilisation: String(Math.round((1.5 / results.fosOverturning) * 100)),
          status: (results.fosOverturning >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Reinforcement Strength',
          capacity: `${results.allowableTension.toFixed(1)} kN/m`,
          utilisation: String(Math.round((results.maxTension / results.allowableTension) * 100)),
          status: (results.fosStrength >= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Bearing',
          capacity: `${form.foundationBearing} kPa`,
          utilisation: String(
            Math.round((results.qBearing / parseFloat(form.foundationBearing)) * 100),
          ),
          status: (results.qBearing <= parseFloat(form.foundationBearing) ? 'PASS' : 'FAIL') as
            | 'PASS'
            | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Reinforced Soil Wall',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-l from-cyan-900/20 via-transparent to-gray-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-cyan-500/30 mb-4 bg-cyan-950/20">
            <FiGrid className="text-cyan-400" />
            <span className="text-cyan-100 font-mono tracking-wider">RETAINING | GRS WALL</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">
            Reinforced Soil Wall
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Geosynthetic reinforced soil wall design with internal and external stability checks to
            BS 8006.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="inline-flex gap-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2">
            {['input', 'results', 'visualization'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'neon' : 'ghost'}
                onClick={() => setActiveTab(tab as any)}
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
        </div>

        {/* Status Banner */}
        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mb-8 p-4 rounded-xl border-2 shadow-lg flex items-center justify-between',
              results.overallStatus === 'PASS'
                ? 'bg-green-950/30 border-green-500/30'
                : 'bg-red-950/30 border-red-500/30',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  results.overallStatus === 'PASS' ? 'bg-green-500/20' : 'bg-red-500/20',
                )}
              >
                {results.overallStatus === 'PASS' ? (
                  <FiCheck className="w-6 h-6 text-green-400" />
                ) : (
                  <FiX className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div>
                <div
                  className={cn(
                    'text-xl font-bold',
                    results.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400',
                  )}
                >
                  {results.overallStatus === 'PASS' ? 'Design Adequate' : 'Design Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  {results.layers} layers | Sliding FOS: {results.fosSliding.toFixed(2)} |
                  Overturning FOS: {results.fosOverturning.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton calculatorKey="grs-wall" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
            </div>
          </motion.div>
        )}

        {/* Warnings */}

        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6 space-y-2"
          >
            {warnings.map((warning, i) => (
              <div
                key={i}
                className={cn(
                  'px-4 py-3 rounded-lg flex items-center gap-3 text-sm',
                  warning.type === 'error' && 'bg-red-950/50 border border-red-500/30 text-red-300',
                  warning.type === 'warning' &&
                    'bg-yellow-950/50 border border-yellow-500/30 text-yellow-300',
                  warning.type === 'info' &&
                    'bg-blue-950/50 border border-blue-500/30 text-blue-300',
                )}
              >
                {warning.type === 'error' && <FiX className="w-4 h-4" />}
                {warning.type === 'warning' && <FiAlertTriangle className="w-4 h-4" />}
                {warning.type === 'info' && <FiInfo className="w-4 h-4" />}
                {warning.message}
              </div>
            ))}
            {/* Main Grid */}
            <AnimatePresence mode="wait">
              {activeTab === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid lg:grid-cols-12 gap-6"
                >
                  {/* Inputs */}
                  <div className="lg:col-span-4 space-y-4">
                    {/* Geometry */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('geometry')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Wall Geometry</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.geometry && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.geometry && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Height"
                                value={form.wallHeight}
                                onChange={(v) => setForm({ ...form, wallHeight: v })}
                                unit="m"
                              />
                              <InputField
                                label="Strip Length"
                                value={form.stripLength}
                                onChange={(v) => setForm({ ...form, stripLength: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Layer Spacing"
                              value={form.spacing}
                              onChange={(v) => setForm({ ...form, spacing: v })}
                              unit="m"
                            />
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Facing Type
                              </label>
                              <select
                                title="Facing Type"
                                value={form.facingType}
                                onChange={(e) => setForm({ ...form, facingType: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(FACING_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Reinforcement */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('reinforcement')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiGrid className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Reinforcement</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.reinforcement && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.reinforcement && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Reinforcement Type
                              </label>
                              <select
                                title="Reinforcement Type"
                                value={form.reinforcementType}
                                onChange={(e) => applyReinforcementPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(REINFORCEMENT_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="T_ult"
                                value={form.tensileStrength}
                                onChange={(v) => setForm({ ...form, tensileStrength: v })}
                                unit="kN/m"
                              />
                              <InputField
                                label="RF"
                                value={form.reductionFactor}
                                onChange={(v) => setForm({ ...form, reductionFactor: v })}
                                unit=""
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Soil Parameters */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('soil')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Soil Parameters</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.soil && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.soil && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div className="text-xs text-cyan-400 font-bold uppercase mb-2">
                              Reinforced Zone
                            </div>
                            <select
                              title="Reinforced Soil"
                              value={selectedSoilR}
                              onChange={(e) => applySoilPresetR(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                            >
                              {Object.entries(SOIL_PRESETS).map(([key, preset]) => (
                                <option key={key} value={key}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="φ'"
                                value={form.phi_r}
                                onChange={(v) => setForm({ ...form, phi_r: v })}
                                unit="°"
                              />
                              <InputField
                                label="γ"
                                value={form.gamma_r}
                                onChange={(v) => setForm({ ...form, gamma_r: v })}
                                unit="kN/m³"
                              />
                            </div>

                            <div className="text-xs text-orange-400 font-bold uppercase mb-2 mt-4">
                              Retained Soil
                            </div>
                            <select
                              title="Retained Soil"
                              value={selectedSoilB}
                              onChange={(e) => applySoilPresetB(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                            >
                              {Object.entries(SOIL_PRESETS).map(([key, preset]) => (
                                <option key={key} value={key}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="φ'"
                                value={form.phi_b}
                                onChange={(v) => setForm({ ...form, phi_b: v })}
                                unit="°"
                              />
                              <InputField
                                label="γ"
                                value={form.gamma_b}
                                onChange={(v) => setForm({ ...form, gamma_b: v })}
                                unit="kN/m³"
                              />
                            </div>
                            <InputField
                              label="Surcharge"
                              value={form.surcharge}
                              onChange={(v) => setForm({ ...form, surcharge: v })}
                              unit="kPa"
                            />
                            <InputField
                              label="Foundation Bearing"
                              value={form.foundationBearing}
                              onChange={(v) => setForm({ ...form, foundationBearing: v })}
                              unit="kPa"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Calculate Button */}
                    <button
                      onClick={calculate}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-2xl"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>
                  </div>

                  {/* Visualization & Results */}
                  <div className="lg:col-span-8 space-y-6 lg:sticky lg:top-8 lg:self-start">
                    <WhatIfPreview
                      title="GRS Wall — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <GRSWall3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard
                          label="Sliding FOS"
                          value={results.fosSliding.toFixed(2)}
                          limit="≥ 1.5"
                          status={results.fosSliding >= 1.5 ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Overturning FOS"
                          value={results.fosOverturning.toFixed(2)}
                          limit="≥ 1.5"
                          status={results.fosOverturning >= 1.5 ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Strength FOS"
                          value={results.fosStrength.toFixed(2)}
                          limit="≥ 1.0"
                          status={results.fosStrength >= 1.0 ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Bearing Pressure"
                          value={`${results.qBearing.toFixed(0)} kPa`}
                          limit={`≤ ${form.foundationBearing}`}
                          status={
                            results.qBearing <= parseFloat(form.foundationBearing) ? 'pass' : 'fail'
                          }
                        />
                      </div>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiInfo className="text-neon-cyan" />
                            Detailed Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Max Tension
                              </div>
                              <div className="text-white font-mono">
                                {results.maxTension.toFixed(1)} kN/m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Allowable</div>
                              <div className="text-white font-mono">
                                {results.allowableTension.toFixed(1)} kN/m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Critical Layer
                              </div>
                              <div className="text-white font-mono">
                                Layer {results.criticalLayer}
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Eccentricity
                              </div>
                              <div className="text-white font-mono">
                                {results.eccentricity.toFixed(2)} m
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results &&
                      (() => {
                        const recs: { icon: string; text: string }[] = [];
                        if (results.fosSliding < 1.5)
                          recs.push({
                            icon: '🔴',
                            text: `Sliding FOS ${results.fosSliding.toFixed(2)} below 1.5 — increase strip length`,
                          });
                        if (results.fosOverturning < 1.5)
                          recs.push({
                            icon: '🔴',
                            text: `Overturning FOS ${results.fosOverturning.toFixed(2)} below 1.5 — increase strip length`,
                          });
                        if (results.fosStrength < 1.0)
                          recs.push({
                            icon: '🔴',
                            text: 'Reinforcement overstressed — increase tensile strength or reduce spacing',
                          });
                        if (results.qBearing > parseFloat(form.foundationBearing))
                          recs.push({
                            icon: '🔴',
                            text: `Bearing pressure ${results.qBearing.toFixed(0)} kPa exceeds allowable`,
                          });
                        if (results.eccentricity > parseFloat(form.stripLength) / 6)
                          recs.push({
                            icon: '⚠️',
                            text: `Eccentricity ${results.eccentricity.toFixed(2)}m exceeds L/6 — increase base width`,
                          });
                        if (recs.length === 0)
                          recs.push({
                            icon: '✅',
                            text: 'All stability checks pass — wall design is adequate to BS 8006',
                          });
                        return (
                          <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                            <CardHeader className="py-3">
                              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <FiInfo className="text-neon-cyan" />
                                Recommendations
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {recs.map((r, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-gray-300"
                                >
                                  <span>{r.icon}</span>
                                  <span>{r.text}</span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        );
                      })()}

                    <div className="lg:hidden">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={exportPDF}
                          className="w-full bg-gradient-to-r from-cyan-600 to-teal-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-cyan-600 to-teal-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          DOCX
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ═══ FULLSCREEN 3D OVERLAY ═══ */}
      <AnimatePresence>
        {previewMaximized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
          >
            {/* Left: 3D Scene */}
            <div className="flex-1 relative">
              <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                <GRSWall3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700/50 transition-all z-10"
                title="Exit fullscreen"
              >
                <FiMinimize2 size={16} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                GRS Wall — 3D Preview
              </div>
            </div>

            {/* Right: Side Panel */}
            <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
              {/* Live Parameters */}
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <FiSliders className="text-cyan-400" size={14} />
                  Live Parameters
                </h3>
                <div className="space-y-3">
                  {whatIfSliders.map((s) => (
                    <div key={s.key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">{s.label}</span>
                        <span className="text-white font-mono">{form[s.key as keyof FormData]} {s.unit}</span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={parseFloat(String(form[s.key as keyof FormData])) || s.min}
                        onChange={(e) => updateForm(s.key as keyof FormData, e.target.value)}
                        title={s.label}
                        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Readout */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <FiActivity className="text-cyan-400" size={14} />
                  Live Readout
                </h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Wall Height', value: `${form.wallHeight} m` },
                    { label: 'Spacing', value: `${form.spacing} m` },
                    { label: 'Strip Length', value: `${form.stripLength} m` },
                    { label: 'Tensile Strength', value: `${form.tensileStrength} kN/m` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-white font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Analysis */}
              {results && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <FiInfo className="text-cyan-400" size={14} />
                    Last Analysis
                  </h3>
                  <div className={cn(
                    'p-3 rounded-lg text-center mb-3',
                    results.overallStatus === 'PASS'
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  )}>
                    <div className={cn(
                      'text-2xl font-black',
                      results.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {results.overallStatus}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Sliding FOS', value: results.fosSliding.toFixed(2) },
                      { label: 'Overturning FOS', value: results.fosOverturning.toFixed(2) },
                      { label: 'Strength FOS', value: results.fosStrength.toFixed(2) },
                      { label: 'Pullout FOS', value: results.fosPullout.toFixed(2) },
                      { label: 'Bearing', value: `${results.qBearing.toFixed(0)} kPa` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="text-white font-mono">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Fullscreen */}
              <button
                onClick={() => setPreviewMaximized(false)}
                className="w-full mt-4 px-4 py-3 rounded-xl bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 transition-all text-sm font-medium"
              >
                Close Fullscreen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const InputField = ({
  label,
  value,
  onChange,
  unit,
  field,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  field?: string;
}) => (
  <div>
    <ExplainableLabel label={`${label}${unit ? ` (${unit})` : ''}`} field={field || 'grs-wall'} className="text-sm font-semibold text-gray-200" />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono"
    />
  </div>
);

const ResultCard = ({
  label,
  value,
  limit,
  status,
}: {
  label: string;
  value: string;
  limit: string;
  status: 'pass' | 'fail';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 text-center shadow-2xl',
      status === 'pass'
        ? 'border-l-4 border-green-500 bg-green-950/20 shadow-green-500/5'
        : 'border-l-4 border-red-500 bg-red-950/20 shadow-red-500/5',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' ? 'text-green-400' : 'text-red-400',
      )}
    >
      {value}
    </div>
    <div className="text-xs text-gray-500 mt-1">{limit}</div>
    <div
      className={cn(
        'text-xs font-bold mt-2',
        status === 'pass' ? 'text-green-600' : 'text-red-600',
      )}
    >
      {status === 'pass' ? 'PASS' : 'FAIL'}
    </div>
  </Card>
);

export default GRSWall;
