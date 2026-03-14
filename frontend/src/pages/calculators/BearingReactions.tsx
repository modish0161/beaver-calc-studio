import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useRef, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiDownload,
    FiEye,
    FiInfo,
    FiLayers,
    FiPlus,
    FiSliders,
    FiTrash2,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import { BearingReactions3D } from '../../components/3d/scenes';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview, { type WhatIfSlider } from '../../components/WhatIfPreview';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { downloadPDF } from '../../lib/pdf';
import { buildBearingReactionsReport } from '../../lib/pdf/builders/bearingReactionsBuilder';

interface LoadCase {
  name: string;
  vertical_force: string;
  longitudinal_force: string;
  transverse_force: string;
  moment_longitudinal: string;
  moment_transverse: string;
  torsion: string;
}

interface FormData {
  bridgeType: string;
  spanLength: string;
  numberOfSpans: string;
  bearingType: string;
  numberOfBearings: string;
  bearingSpacing: string;
  loadCases: LoadCase[];
  includeTemperatureEffects: boolean;
  includeCreepShrinkage: boolean;
  includeDynamicEffects: boolean;
  temperatureRange: string;
  thermalExpansionCoeff: string;
}

const PRESETS = {
  highway_ss: {
    name: 'Highway Bridge — Simply Supported 30 m',
    bridgeType: 'simply_supported',
    spanLength: '30',
    numberOfSpans: '1',
    bearingType: 'pot',
    numberOfBearings: '2',
    bearingSpacing: '12',
    temperatureRange: '40',
    loadCases: [
      {
        name: 'Dead Load (G)',
        vertical_force: '2400',
        longitudinal_force: '0',
        transverse_force: '0',
        moment_longitudinal: '0',
        moment_transverse: '0',
        torsion: '0',
      },
      {
        name: 'gr1a — TS + UDL',
        vertical_force: '1200',
        longitudinal_force: '120',
        transverse_force: '60',
        moment_longitudinal: '150',
        moment_transverse: '80',
        torsion: '40',
      },
      {
        name: 'Wind (W)',
        vertical_force: '0',
        longitudinal_force: '50',
        transverse_force: '180',
        moment_longitudinal: '0',
        moment_transverse: '200',
        torsion: '30',
      },
    ],
  },
  highway_cont: {
    name: 'Highway Bridge — Continuous 2-Span 40 m',
    bridgeType: 'continuous',
    spanLength: '40',
    numberOfSpans: '2',
    bearingType: 'spherical',
    numberOfBearings: '3',
    bearingSpacing: '12',
    temperatureRange: '45',
    loadCases: [
      {
        name: 'Dead Load (G)',
        vertical_force: '3600',
        longitudinal_force: '0',
        transverse_force: '0',
        moment_longitudinal: '0',
        moment_transverse: '0',
        torsion: '0',
      },
      {
        name: 'gr1a — TS + UDL',
        vertical_force: '1800',
        longitudinal_force: '180',
        transverse_force: '90',
        moment_longitudinal: '250',
        moment_transverse: '120',
        torsion: '60',
      },
      {
        name: 'Braking (Q_lk)',
        vertical_force: '0',
        longitudinal_force: '600',
        transverse_force: '0',
        moment_longitudinal: '0',
        moment_transverse: '0',
        torsion: '0',
      },
    ],
  },
  rail_bridge: {
    name: 'Rail Bridge — 25 m Single Track',
    bridgeType: 'simply_supported',
    spanLength: '25',
    numberOfSpans: '1',
    bearingType: 'pot',
    numberOfBearings: '2',
    bearingSpacing: '6',
    temperatureRange: '35',
    loadCases: [
      {
        name: 'Dead Load (G)',
        vertical_force: '3000',
        longitudinal_force: '0',
        transverse_force: '0',
        moment_longitudinal: '0',
        moment_transverse: '0',
        torsion: '0',
      },
      {
        name: 'LM71 — Rail Traffic',
        vertical_force: '2500',
        longitudinal_force: '500',
        transverse_force: '80',
        moment_longitudinal: '200',
        moment_transverse: '100',
        torsion: '50',
      },
      {
        name: 'Nosing Force',
        vertical_force: '0',
        longitudinal_force: '0',
        transverse_force: '100',
        moment_longitudinal: '0',
        moment_transverse: '50',
        torsion: '0',
      },
    ],
  },
  footbridge: {
    name: 'Footbridge — 20 m',
    bridgeType: 'simply_supported',
    spanLength: '20',
    numberOfSpans: '1',
    bearingType: 'guided',
    numberOfBearings: '2',
    bearingSpacing: '3.5',
    temperatureRange: '30',
    loadCases: [
      {
        name: 'Dead Load (G)',
        vertical_force: '400',
        longitudinal_force: '0',
        transverse_force: '0',
        moment_longitudinal: '0',
        moment_transverse: '0',
        torsion: '0',
      },
      {
        name: 'Crowd Load (5 kPa)',
        vertical_force: '350',
        longitudinal_force: '0',
        transverse_force: '10',
        moment_longitudinal: '0',
        moment_transverse: '20',
        torsion: '5',
      },
      {
        name: 'Wind (W)',
        vertical_force: '0',
        longitudinal_force: '15',
        transverse_force: '60',
        moment_longitudinal: '0',
        moment_transverse: '40',
        torsion: '10',
      },
    ],
  },
  viaduct_pier: {
    name: 'Viaduct — 5-Span 150 m',
    bridgeType: 'continuous',
    spanLength: '30',
    numberOfSpans: '5',
    bearingType: 'spherical',
    numberOfBearings: '6',
    bearingSpacing: '14',
    temperatureRange: '50',
    loadCases: [
      {
        name: 'Dead Load (G)',
        vertical_force: '9000',
        longitudinal_force: '0',
        transverse_force: '0',
        moment_longitudinal: '0',
        moment_transverse: '0',
        torsion: '0',
      },
      {
        name: 'gr1a — TS + UDL',
        vertical_force: '4000',
        longitudinal_force: '400',
        transverse_force: '200',
        moment_longitudinal: '500',
        moment_transverse: '300',
        torsion: '150',
      },
      {
        name: 'Seismic (E)',
        vertical_force: '0',
        longitudinal_force: '1200',
        transverse_force: '800',
        moment_longitudinal: '600',
        moment_transverse: '400',
        torsion: '200',
      },
    ],
  },
};

const BearingReactions: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    bridgeType: 'simply_supported',
    spanLength: '30',
    numberOfSpans: '1',
    bearingType: 'pot',
    numberOfBearings: '2',
    bearingSpacing: '15',
    loadCases: [
      {
        name: 'Dead Load',
        vertical_force: '1000',
        longitudinal_force: '0',
        transverse_force: '0',
        moment_longitudinal: '0',
        moment_transverse: '0',
        torsion: '0',
      },
      {
        name: 'Live Load',
        vertical_force: '500',
        longitudinal_force: '50',
        transverse_force: '20',
        moment_longitudinal: '100',
        moment_transverse: '50',
        torsion: '25',
      },
    ],
    includeTemperatureEffects: true,
    includeCreepShrinkage: true,
    includeDynamicEffects: false,
    temperatureRange: '30',
    thermalExpansionCoeff: '0.000012',
  });

  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [warnings, setWarnings] = useState<string[]>([]);
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (!preset) return;
    const { name: _name, ...fields } = preset;
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleLoadCaseChange = (index: number, field: keyof LoadCase, value: string) => {
    setFormData((prev) => ({
      ...prev,
      loadCases: prev.loadCases.map((lc, i) => (i === index ? { ...lc, [field]: value } : lc)),
    }));
  };

  const addLoadCase = () => {
    setFormData((prev) => ({
      ...prev,
      loadCases: [
        ...prev.loadCases,
        {
          name: `Load Case ${prev.loadCases.length + 1}`,
          vertical_force: '0',
          longitudinal_force: '0',
          transverse_force: '0',
          moment_longitudinal: '0',
          moment_transverse: '0',
          torsion: '0',
        },
      ],
    }));
  };

  const removeLoadCase = (index: number) => {
    if (formData.loadCases.length > 1) {
      setFormData((prev) => ({
        ...prev,
        loadCases: prev.loadCases.filter((_, i) => i !== index),
      }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export — Premium @react-pdf/renderer
  // ─────────────────────────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    if (!results) return;
    const reportData = buildBearingReactionsReport(
      {
        bridgeType: formData.bridgeType,
        spanLength: parseFloat(formData.spanLength) || 0,
        numberOfSpans: parseInt(formData.numberOfSpans) || 1,
        bearingType: formData.bearingType,
        numberOfBearings: parseInt(formData.numberOfBearings) || 2,
        bearingSpacing: parseFloat(formData.bearingSpacing) || 0,
        includeTemperatureEffects: formData.includeTemperatureEffects,
        includeCreepShrinkage: formData.includeCreepShrinkage,
        includeDynamicEffects: formData.includeDynamicEffects,
        temperatureRange: parseFloat(formData.temperatureRange) || 0,
        thermalExpansionCoeff: parseFloat(formData.thermalExpansionCoeff) || 0.000012,
        loadCases: formData.loadCases.map((lc) => ({
          name: lc.name,
          vertical_force: parseFloat(lc.vertical_force) || 0,
          longitudinal_force: parseFloat(lc.longitudinal_force) || 0,
          transverse_force: parseFloat(lc.transverse_force) || 0,
          moment_longitudinal: parseFloat(lc.moment_longitudinal) || 0,
          moment_transverse: parseFloat(lc.moment_transverse) || 0,
          torsion: parseFloat(lc.torsion) || 0,
        })),
      },
      {
        status: overallStatus,
        maxUtilisation: maxUtil / 100,
        criticalCheck: results.capacity_checks?.vertical_capacity?.critical_bearing || 'N/A',
        maxVerticalReaction: Math.max(
          ...Object.values(results.envelope_max || {}).map((e: any) =>
            Math.abs(e.vertical_reaction || 0),
          ),
        ),
        maxHorizontalReaction: Math.max(
          ...Object.values(results.envelope_max || {}).map((e: any) =>
            Math.sqrt((e.longitudinal_reaction || 0) ** 2 + (e.transverse_reaction || 0) ** 2),
          ),
        ),
        maxMoment: Math.max(
          ...Object.values(results.envelope_max || {}).map((e: any) =>
            Math.sqrt((e.moment_longitudinal || 0) ** 2 + (e.moment_transverse || 0) ** 2),
          ),
        ),
        thermalMovement: formData.includeTemperatureEffects
          ? parseFloat(formData.spanLength) *
            parseFloat(formData.thermalExpansionCoeff) *
            parseFloat(formData.temperatureRange) *
            1000
          : 0,
      },
      warnings.map((w) => ({ type: 'warning' as const, message: w })),
      { projectName: 'Bearing Reaction Analysis', clientName: '', preparedBy: '' },
    );
    await downloadPDF(
      reportData as any,
      `BearingReactions_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCX Export — Editable Word document
  // ─────────────────────────────────────────────────────────────────────────────
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Bearing Reactions Analysis',
      subtitle: 'EN 1990 | EN 1337 Compliant',
      projectInfo: [
        { label: 'Bridge Type', value: formData.bridgeType.replace('_', ' ') },
        { label: 'Bearing Type', value: formData.bearingType },
      ],
      inputs: [
        { label: 'Span Length', value: formData.spanLength, unit: 'm' },
        { label: 'Number of Spans', value: formData.numberOfSpans, unit: '' },
        { label: 'Number of Bearings', value: formData.numberOfBearings, unit: '' },
        { label: 'Bearing Spacing', value: formData.bearingSpacing, unit: 'm' },
        { label: 'Temperature Range', value: formData.temperatureRange, unit: '°C' },
        { label: 'Thermal Expansion Coeff', value: formData.thermalExpansionCoeff, unit: '/°C' },
        {
          label: 'Temperature Effects',
          value: formData.includeTemperatureEffects ? 'Included' : 'Excluded',
          unit: '',
        },
        {
          label: 'Creep/Shrinkage',
          value: formData.includeCreepShrinkage ? 'Included' : 'Excluded',
          unit: '',
        },
      ],
      checks: [
        {
          name: 'Vertical Capacity',
          capacity: 'V_Rd',
          utilisation: `${((results.capacity_checks?.vertical_capacity?.max_utilisation || 0) * 100).toFixed(1)}%`,
          status: (results.capacity_checks?.vertical_capacity?.status as 'PASS' | 'FAIL') || 'PASS',
        },
        {
          name: 'Horizontal Capacity',
          capacity: 'H_Rd',
          utilisation: `${((results.capacity_checks?.horizontal_capacity?.max_utilisation || 0) * 100).toFixed(1)}%`,
          status:
            (results.capacity_checks?.horizontal_capacity?.status as 'PASS' | 'FAIL') || 'PASS',
        },
        {
          name: 'Moment Capacity',
          capacity: 'M_Rd',
          utilisation: `${((results.capacity_checks?.moment_capacity?.max_utilisation || 0) * 100).toFixed(1)}%`,
          status: (results.capacity_checks?.moment_capacity?.status as 'PASS' | 'FAIL') || 'PASS',
        },
        {
          name: 'Stability',
          capacity: `Ratio: ${results.system_stability?.stability_ratio?.toFixed(2) || '∞'}`,
          utilisation: results.system_stability?.stability_status || 'STABLE',
          status: results.system_stability?.stability_status === 'STABLE' ? 'PASS' : 'FAIL',
        },
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${maxUtil.toFixed(1)}%`,
          status: overallStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations:
        results.recommendations?.map((r: string) => ({ check: 'Design', suggestion: r })) || [],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Bearing Reactions Analysis',
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.spanLength || parseFloat(formData.spanLength) <= 0) {
      errors.spanLength = 'Span length must be greater than 0';
    }
    if (!formData.bearingSpacing || parseFloat(formData.bearingSpacing) <= 0) {
      errors.bearingSpacing = 'Bearing spacing must be greater than 0';
    }
    if (!formData.numberOfBearings || parseInt(formData.numberOfBearings) < 1) {
      errors.numberOfBearings = 'Must have at least 1 bearing';
    }
    if (formData.loadCases.length === 0) {
      errors.loadCases = 'At least one load case is required';
    }

    // Validate load cases
    formData.loadCases.forEach((lc, index) => {
      if (!lc.name || lc.name.trim() === '') {
        errors[`loadCase_${index}_name`] = 'Load case name cannot be empty';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateResults = useCallback(async () => {
    if (!validateForm()) return;

    setIsCalculating(true);

    // Real bearing reaction analysis per EN 1990/EN 1991-2
    await new Promise((r) => setTimeout(r, 400));

    const L = parseFloat(formData.spanLength);
    const nSpans = parseInt(formData.numberOfSpans);
    const nB = parseInt(formData.numberOfBearings);
    const sB = parseFloat(formData.bearingSpacing);
    const tempRange = parseFloat(formData.temperatureRange);
    const alpha = parseFloat(formData.thermalExpansionCoeff);

    // Bearing positions from centroid of group
    const bearingPositions: number[] = [];
    for (let i = 0; i < nB; i++) {
      bearingPositions.push(-((nB - 1) * sB) / 2 + i * sB);
    }
    const sumY2 = bearingPositions.reduce((s, y) => s + y * y, 0);

    // Bearing type properties — friction coefficient and nominal capacities
    const bearingProps: Record<
      string,
      { mu: number; V_Rd: number; H_Rd_ratio: number; M_Rd: number }
    > = {
      pot: { mu: 0.03, V_Rd: 5000, H_Rd_ratio: 0.1, M_Rd: 200 },
      spherical: { mu: 0.03, V_Rd: 10000, H_Rd_ratio: 0.1, M_Rd: 500 },
      cylindrical: { mu: 0.05, V_Rd: 4000, H_Rd_ratio: 0.08, M_Rd: 150 },
      fixed: { mu: 1.0, V_Rd: 6000, H_Rd_ratio: 0.3, M_Rd: 500 },
      guided: { mu: 0.02, V_Rd: 3000, H_Rd_ratio: 0.05, M_Rd: 100 },
      free: { mu: 0.01, V_Rd: 2000, H_Rd_ratio: 0.0, M_Rd: 0 },
    };
    const bProps = bearingProps[formData.bearingType] || bearingProps.pot;

    // ULS partial factors (EN 1990 Table A2.4(B))
    const gamma_G = 1.35;
    const gamma_Q = 1.5;

    // Process each load case and build per-bearing reactions
    type BearingReaction = {
      vertical_reaction: number;
      longitudinal_reaction: number;
      transverse_reaction: number;
      moment_longitudinal: number;
      moment_transverse: number;
      torsion: number;
    };
    const perBearingPerCase: BearingReaction[][] = [];

    formData.loadCases.forEach((lc, lcIdx) => {
      const V_total = parseFloat(lc.vertical_force) || 0;
      const H_long = parseFloat(lc.longitudinal_force) || 0;
      const H_trans = parseFloat(lc.transverse_force) || 0;
      const M_long = parseFloat(lc.moment_longitudinal) || 0;
      const M_trans = parseFloat(lc.moment_transverse) || 0;
      const T = parseFloat(lc.torsion) || 0;

      // Apply ULS factor: first case assumed permanent, rest variable
      const gamma = lcIdx === 0 ? gamma_G : gamma_Q;
      const Vu = V_total * gamma;
      const Hlu = H_long * gamma;
      const Htu = H_trans * gamma;
      const Mlu = M_long * gamma;
      const Mtu = M_trans * gamma;
      const Tu = T * gamma;

      const reactions: BearingReaction[] = bearingPositions.map((y_i) => {
        // Vertical: V/N + M_trans * y_i / Σy² (lever arm distribution)
        const Rv = Vu / nB + (sumY2 > 0 ? (Mtu * y_i) / sumY2 : 0);

        // Longitudinal: distributed equally for free/guided, all to fixed
        let Rl = 0;
        if (formData.bearingType === 'fixed') {
          Rl = Hlu; // all longitudinal to fixed bearing (first one)
        } else {
          Rl = Hlu / nB;
        }

        // Transverse: V/N + eccentricity from torsion
        const Rt = Htu / nB + (sumY2 > 0 ? (Tu * y_i) / sumY2 : 0);

        // Moment distribution: equally shared
        const Rml = Mlu / nB;
        const Rmt = Mtu / nB;
        const Rt_t = Tu / nB;

        return {
          vertical_reaction: Rv,
          longitudinal_reaction: Rl,
          transverse_reaction: Rt,
          moment_longitudinal: Rml,
          moment_transverse: Rmt,
          torsion: Rt_t,
        };
      });
      perBearingPerCase.push(reactions);
    });

    // Add temperature friction force if enabled
    if (formData.includeTemperatureEffects && tempRange > 0) {
      // Friction force from thermal movement: H_temp = μ × V_dead (first load case)
      const V_dead_total = (parseFloat(formData.loadCases[0]?.vertical_force) || 0) * gamma_G;
      const H_friction = bProps.mu * V_dead_total;

      // Add as additional reactions distributed equally
      const tempReactions: BearingReaction[] = bearingPositions.map(() => ({
        vertical_reaction: 0,
        longitudinal_reaction: H_friction / nB,
        transverse_reaction: 0,
        moment_longitudinal: 0,
        moment_transverse: 0,
        torsion: 0,
      }));
      perBearingPerCase.push(tempReactions);
    }

    // Add creep/shrinkage friction if enabled
    if (formData.includeCreepShrinkage) {
      const V_dead_total = (parseFloat(formData.loadCases[0]?.vertical_force) || 0) * gamma_G;
      const H_cs = bProps.mu * V_dead_total * 0.5; // ~50% of thermal friction for creep+shrinkage
      const csReactions: BearingReaction[] = bearingPositions.map(() => ({
        vertical_reaction: 0,
        longitudinal_reaction: H_cs / nB,
        transverse_reaction: 0,
        moment_longitudinal: 0,
        moment_transverse: 0,
        torsion: 0,
      }));
      perBearingPerCase.push(csReactions);
    }

    // Build envelope max and min across all cases (additive for permanent + max variable)
    const envelope_max: Record<string, BearingReaction> = {};
    const envelope_min: Record<string, BearingReaction> = {};

    for (let b = 0; b < nB; b++) {
      const key = `Bearing_${b + 1}`;
      const allV = perBearingPerCase.map((c) => c[b].vertical_reaction);
      const allHL = perBearingPerCase.map((c) => c[b].longitudinal_reaction);
      const allHT = perBearingPerCase.map((c) => c[b].transverse_reaction);
      const allML = perBearingPerCase.map((c) => c[b].moment_longitudinal);
      const allMT = perBearingPerCase.map((c) => c[b].moment_transverse);
      const allT = perBearingPerCase.map((c) => c[b].torsion);

      // Envelope: sum of permanent (index 0) + max positive/negative of variable cases
      const perm = perBearingPerCase[0][b];
      const varCases = perBearingPerCase.slice(1);

      const sumPos = (arr: number[]) => arr.filter((v) => v > 0).reduce((s, v) => s + v, 0);
      const sumNeg = (arr: number[]) => arr.filter((v) => v < 0).reduce((s, v) => s + v, 0);

      const varV = varCases.map((c) => c[b].vertical_reaction);
      const varHL = varCases.map((c) => c[b].longitudinal_reaction);
      const varHT = varCases.map((c) => c[b].transverse_reaction);
      const varML = varCases.map((c) => c[b].moment_longitudinal);
      const varMT = varCases.map((c) => c[b].moment_transverse);
      const varT_arr = varCases.map((c) => c[b].torsion);

      envelope_max[key] = {
        vertical_reaction: parseFloat((perm.vertical_reaction + sumPos(varV)).toFixed(1)),
        longitudinal_reaction: parseFloat((perm.longitudinal_reaction + sumPos(varHL)).toFixed(1)),
        transverse_reaction: parseFloat((perm.transverse_reaction + sumPos(varHT)).toFixed(1)),
        moment_longitudinal: parseFloat((perm.moment_longitudinal + sumPos(varML)).toFixed(1)),
        moment_transverse: parseFloat((perm.moment_transverse + sumPos(varMT)).toFixed(1)),
        torsion: parseFloat((perm.torsion + sumPos(varT_arr)).toFixed(1)),
      };
      envelope_min[key] = {
        vertical_reaction: parseFloat((perm.vertical_reaction + sumNeg(varV)).toFixed(1)),
        longitudinal_reaction: parseFloat((perm.longitudinal_reaction + sumNeg(varHL)).toFixed(1)),
        transverse_reaction: parseFloat((perm.transverse_reaction + sumNeg(varHT)).toFixed(1)),
        moment_longitudinal: parseFloat((perm.moment_longitudinal + sumNeg(varML)).toFixed(1)),
        moment_transverse: parseFloat((perm.moment_transverse + sumNeg(varMT)).toFixed(1)),
        torsion: parseFloat((perm.torsion + sumNeg(varT_arr)).toFixed(1)),
      };
    }

    // Capacity checks
    const V_Rd = bProps.V_Rd;
    const H_Rd = bProps.H_Rd_ratio * V_Rd;
    const M_Rd = bProps.M_Rd;

    let maxVutil = 0,
      maxHutil = 0,
      maxMutil = 0;
    let critV = 'Bearing_1',
      critH = 'Bearing_1',
      critM = 'Bearing_1';

    for (let b = 0; b < nB; b++) {
      const key = `Bearing_${b + 1}`;
      const env = envelope_max[key];

      const vUtil = Math.abs(env.vertical_reaction) / V_Rd;
      const hUtil =
        Math.sqrt(env.longitudinal_reaction ** 2 + env.transverse_reaction ** 2) / (H_Rd || 1);
      const mUtil =
        Math.sqrt(env.moment_longitudinal ** 2 + env.moment_transverse ** 2) / (M_Rd || 1);

      if (vUtil > maxVutil) {
        maxVutil = vUtil;
        critV = key;
      }
      if (hUtil > maxHutil) {
        maxHutil = hUtil;
        critH = key;
      }
      if (mUtil > maxMutil) {
        maxMutil = mUtil;
        critM = key;
      }
    }

    const getStatus = (u: number) => (u > 1.0 ? 'FAIL' : u > 0.8 ? 'WARNING' : 'PASS');

    // System stability — check for uplift (min vertical < 0)
    let minVertical = Infinity;
    let totalVertical = 0;
    let totalOverturningMoment = 0;

    for (let b = 0; b < nB; b++) {
      const key = `Bearing_${b + 1}`;
      const minV = envelope_min[key].vertical_reaction;
      const maxV = envelope_max[key].vertical_reaction;
      if (minV < minVertical) minVertical = minV;
      totalVertical += maxV;
      totalOverturningMoment += Math.abs(envelope_max[key].moment_transverse);
    }

    const upliftDetected = minVertical < 0;
    const stabilityRatio =
      totalOverturningMoment > 0 ? (totalVertical * sB) / 2 / totalOverturningMoment : Infinity;

    // Recommendations
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (maxVutil > 0.8)
      recommendations.push(
        `Vertical utilisation high at ${critV} — consider larger bearing capacity`,
      );
    if (maxHutil > 0.8)
      recommendations.push(`Horizontal utilisation high at ${critH} — review bearing restraint`);
    if (maxMutil > 0.8)
      recommendations.push(`Moment utilisation high at ${critM} — check bearing rotation capacity`);
    if (upliftDetected) {
      warnings.push(`Uplift detected at minimum envelope — verify hold-down devices`);
      recommendations.push('Install hold-down bolts or increase dead load');
    }
    if (stabilityRatio < 1.5)
      warnings.push(
        `Stability ratio ${stabilityRatio.toFixed(2)} < 1.5 — review overturning resistance`,
      );
    recommendations.push('Verify bearing connection details per EN 1337-1');
    recommendations.push('Check substructure capacity for max bearing reactions');

    const notes = [
      `Analysis per EN 1990 Eq 6.10 (γ_G=${gamma_G}, γ_Q=${gamma_Q})`,
      `Bridge type: ${formData.bridgeType.replace('_', ' ')}`,
      `Bearing type: ${formData.bearingType} (V_Rd=${V_Rd} kN, H_Rd=${H_Rd.toFixed(0)} kN)`,
      `${nB} bearings at ${sB} m spacing — lever arm distribution`,
      formData.includeTemperatureEffects
        ? `Temperature ±${tempRange}°C, α=${alpha}/°C — friction force included`
        : 'Temperature effects excluded',
      formData.includeCreepShrinkage
        ? 'Creep & shrinkage friction forces included'
        : 'Creep & shrinkage excluded',
    ];

    setResults({
      analysis_summary: {
        bridge_type: formData.bridgeType,
        span_length: L,
        number_of_spans: nSpans,
        bearing_type: formData.bearingType,
        number_of_bearings: nB,
        bearing_spacing: sB,
        number_of_load_cases: formData.loadCases.length,
        analysis_options: {
          temperature_effects: formData.includeTemperatureEffects,
          creep_shrinkage: formData.includeCreepShrinkage,
          dynamic_effects: formData.includeDynamicEffects,
        },
      },
      envelope_max,
      envelope_min,
      capacity_checks: {
        vertical_capacity: {
          status: getStatus(maxVutil),
          max_utilisation: parseFloat(maxVutil.toFixed(3)),
          critical_bearing: critV,
        },
        horizontal_capacity: {
          status: getStatus(maxHutil),
          max_utilisation: parseFloat(maxHutil.toFixed(3)),
          critical_bearing: critH,
        },
        moment_capacity: {
          status: getStatus(maxMutil),
          max_utilisation: parseFloat(maxMutil.toFixed(3)),
          critical_bearing: critM,
        },
      },
      system_stability: {
        uplift_detected: upliftDetected,
        stability_ratio: parseFloat(stabilityRatio.toFixed(2)),
        stability_status: upliftDetected || stabilityRatio < 1.0 ? 'UNSTABLE' : 'STABLE',
        total_vertical_load: parseFloat(totalVertical.toFixed(1)),
        total_overturning_moment: parseFloat(totalOverturningMoment.toFixed(1)),
      },
      recommendations,
      warnings,
      notes,
    });

    setWarnings(warnings);
    setIsCalculating(false);
  }, [formData]);

  // Derived values
  const maxUtil = results
    ? Math.max(
        (results.capacity_checks?.vertical_capacity?.max_utilisation || 0) * 100,
        (results.capacity_checks?.horizontal_capacity?.max_utilisation || 0) * 100,
        (results.capacity_checks?.moment_capacity?.max_utilisation || 0) * 100,
      )
    : 0;

  const overallStatus = results
    ? results.capacity_checks?.vertical_capacity?.status === 'FAIL' ||
      results.capacity_checks?.horizontal_capacity?.status === 'FAIL' ||
      results.capacity_checks?.moment_capacity?.status === 'FAIL' ||
      results.system_stability?.stability_status === 'UNSTABLE'
      ? 'FAIL'
      : maxUtil > 80
        ? 'WARNING'
        : 'PASS'
    : 'PASS';

  // Debounced auto-recalculation in What-If mode

  // What-If sliders configuration
  const whatIfSliders: WhatIfSlider[] = [
    { key: 'spanLength', label: 'Span Length', min: 5, max: 200, step: 1, unit: 'm' },
    { key: 'numberOfBearings', label: 'No. Bearings', min: 1, max: 12, step: 1, unit: '' },
    { key: 'bearingSpacing', label: 'Bearing Spacing', min: 1, max: 30, step: 0.5, unit: 'm' },
    { key: 'temperatureRange', label: 'Temp Range', min: 0, max: 60, step: 5, unit: '°C' },
  ];

  const inputFields = [
    {
      key: 'spanLength',
      label: 'Span Length',
      unit: 'm',
      icon: '📏',
      description: 'Total bridge span length',
    },
    {
      key: 'numberOfSpans',
      label: 'Number of Spans',
      unit: '',
      icon: '🔢',
      description: 'Number of bridge spans',
    },
    {
      key: 'numberOfBearings',
      label: 'Number of Bearings',
      unit: '',
      icon: '🎯',
      description: 'Total number of bearings',
    },
    {
      key: 'bearingSpacing',
      label: 'Bearing Spacing',
      unit: 'm',
      icon: '📐',
      description: 'Spacing between bearings',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-full glass border border-neon-cyan/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiLayers className="text-neon-cyan" size={24} />
            <span className="text-white font-semibold">EN 1990 | Eurocode 0</span>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-8">
            {['input', 'results', 'visualization'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'neon' : 'ghost'}
                onClick={() => setActiveTab(tab as any)}
                disabled={tab !== 'input' && !results}
                className={cn(
                  'px-8 py-3 rounded-xl font-semibold capitalize',
                  activeTab === tab
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    : 'text-gray-400',
                )}
              >
                {tab === 'input'
                  ? '🏗️ Input'
                  : tab === 'results'
                    ? '📊 Results'
                    : '🎨 Visualization'}
              </Button>
            ))}
          </div>

          <h1 className="text-6xl font-black mb-6">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Bearing Reactions
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            EN 1990/1991-2 compliant bearing reaction analysis
          </p>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mt-3">
            Advanced bearing reaction envelope analysis from multiple load cases with comprehensive
            stability assessment
          </p>
          <div className="flex items-center justify-center space-x-6 mt-8">
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Load Case Envelopes</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Stability Analysis</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Capacity Verification</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Multiple Bearing Types</span>
            </div>
          </div>
        </motion.div>
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Input Form - 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bridge Configuration Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiLayers className="text-white" size={24} />
                        </motion.div>
                        <span>Bridge Configuration</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🌉</span>
                            <span>Bridge Type</span>
                          </label>
                          <select
                            title="Bridge Type"
                            value={formData.bridgeType}
                            onChange={(e) => handleInputChange('bridgeType', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                          >
                            <option value="simply_supported">Simply Supported</option>
                            <option value="continuous">Continuous</option>
                            <option value="cantilever">Cantilever</option>
                            <option value="arch">Arch</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🎯</span>
                            <span>Bearing Type</span>
                          </label>
                          <select
                            title="Bearing Type"
                            value={formData.bearingType}
                            onChange={(e) => handleInputChange('bearingType', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                          >
                            <option value="pot">Pot Bearing</option>
                            <option value="spherical">Spherical Bearing</option>
                            <option value="cylindrical">Cylindrical Bearing</option>
                            <option value="fixed">Fixed Bearing</option>
                            <option value="guided">Guided Bearing</option>
                            <option value="free">Free Bearing</option>
                          </select>
                        </div>

                        {inputFields.map((field, index) => (
                          <motion.div
                            key={field.key}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="relative group"
                            onMouseEnter={() => setActiveInput(field.key)}
                            onMouseLeave={() => setActiveInput(null)}
                          >
                            {/* Spotlight effect on active input */}

                            {activeInput === field.key && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-cyan/10 to-neon-blue/10 blur-xl -z-10"
                              />
                            )}

                            <div className="space-y-2">
                              <label className="flex items-center justify-between text-sm font-semibold text-gray-200">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xl">{field.icon}</span>
                                  <ExplainableLabel label={field.label} field={field.key} />
                                </div>
                                <span className="text-neon-cyan text-xs">{field.unit}</span>
                              </label>

                              <div className="relative">
                                <input
                                  title="{field.label}"
                                  type="number"
                                  step="0.01"
                                  value={String(formData[field.key as keyof FormData] ?? '')}
                                  onChange={(e) =>
                                    handleInputChange(field.key as keyof FormData, e.target.value)
                                  }
                                  className={cn(
                                    'w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white placeholder-gray-500',
                                    'focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan',
                                    'transition-all duration-300 hover:bg-gray-900/70',
                                    validationErrors[field.key] &&
                                      'border-red-500 focus:ring-red-500/50',
                                  )}
                                  placeholder="0.00"
                                />
                                {formData[field.key as keyof FormData] && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute right-3 top-3 text-neon-cyan"
                                  >
                                    <FiCheck size={20} />
                                  </motion.div>
                                )}
                              </div>

                              {validationErrors[field.key] && (
                                <motion.p
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-red-400 text-xs flex items-center space-x-1"
                                >
                                  <FiAlertTriangle size={12} />
                                  <span>{validationErrors[field.key]}</span>
                                </motion.p>
                              )}

                              <p className="text-xs text-gray-400">{field.description}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Load Cases Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card variant="glass" className="border-purple-500/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center"
                            whileHover={{ scale: 1.1 }}
                          >
                            <FiActivity className="text-white" size={24} />
                          </motion.div>
                          <span>Load Cases</span>
                        </div>
                        <Button
                          onClick={addLoadCase}
                          variant="glass"
                          size="sm"
                          className="border-purple-500/50 hover:bg-purple-500/10"
                        >
                          <FiPlus size={16} className="mr-2" />
                          Add Load Case
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {formData.loadCases.map((loadCase, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="p-4 rounded-xl bg-gray-900/30 border border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <span className="text-purple-400 font-bold">#{index + 1}</span>
                                <input
                                  title="Input value"
                                  type="text"
                                  value={loadCase.name}
                                  onChange={(e) =>
                                    handleLoadCaseChange(index, 'name', e.target.value)
                                  }
                                  className="px-3 py-1 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  placeholder="Load case name"
                                />
                              </div>
                              {formData.loadCases.length > 1 && (
                                <Button
                                  onClick={() => removeLoadCase(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <FiTrash2 size={16} />
                                </Button>
                              )}
                            </div>

                            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
                              {[
                                { key: 'vertical_force', label: 'V', unit: 'kN' },
                                { key: 'longitudinal_force', label: 'Long', unit: 'kN' },
                                { key: 'transverse_force', label: 'Trans', unit: 'kN' },
                                { key: 'moment_longitudinal', label: 'M_long', unit: 'kNm' },
                                { key: 'moment_transverse', label: 'M_trans', unit: 'kNm' },
                                { key: 'torsion', label: 'Torsion', unit: 'kNm' },
                              ].map((field) => (
                                <div key={field.key} className="space-y-1">
                                  <label className="text-xs text-gray-400 text-center block">
                                    {field.label}
                                  </label>
                                  <input
                                    title="Input value"
                                    type="number"
                                    step="0.01"
                                    value={loadCase[field.key as keyof LoadCase]}
                                    onChange={(e) =>
                                      handleLoadCaseChange(
                                        index,
                                        field.key as keyof LoadCase,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    placeholder="0.00"
                                  />
                                  <span className="text-xs text-purple-400 text-center block">
                                    {field.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center"
                >
                  <Button
                    onClick={() => { calculateResults().then(() => setActiveTab('results')); }}
                    disabled={isCalculating}
                    className="px-12 py-6 text-lg font-bold bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-transform duration-300 shadow-2xl cyber-glow-blue"
                  >
                    {isCalculating ? (
                      <motion.div
                        className="flex items-center space-x-3"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Analysing...</span>
                      </motion.div>
                    ) : (
                      <span className="flex items-center space-x-3">
                        <FiZap size={24} />
                        <span>Run Analysis</span>
                        <FiActivity size={24} />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* 3D Preview Sidebar with What-If & Fullscreen */}
              <div className="space-y-4">
                <WhatIfPreview
                  title="Bridge Preview"
                  renderScene={(h) => (
                    <Interactive3DDiagram
                      height={h}
                      cameraPosition={[8, 5, 8]}
                      status={overallStatus === 'FAIL' ? 'FAIL' : 'PASS'}
                    >
                      <BearingReactions3D
                        spanLength={parseFloat(formData.spanLength) || 30}
                        bearingSpacing={parseFloat(formData.bearingSpacing) || 12}
                        numberOfBearings={parseInt(formData.numberOfBearings) || 2}
                        bridgeType={formData.bridgeType}
                        bearingType={formData.bearingType}
                        maxVerticalReaction={
                          results
                            ? Math.max(
                                ...Object.values(results.envelope_max || {}).map((e: any) =>
                                  Math.abs(e.vertical_reaction || 0),
                                ),
                              )
                            : 0
                        }
                        maxHorizontalReaction={
                          results
                            ? Math.max(
                                ...Object.values(results.envelope_max || {}).map((e: any) =>
                                  Math.sqrt(
                                    (e.longitudinal_reaction || 0) ** 2 +
                                      (e.transverse_reaction || 0) ** 2,
                                  ),
                                ),
                              )
                            : 0
                        }
                        utilisation={maxUtil}
                        status={overallStatus}
                      />
                    </Interactive3DDiagram>
                  )}
                  sliders={whatIfSliders}
                  form={formData as unknown as Record<string, any>}
                  updateForm={handleInputChange}
                  status={overallStatus === 'FAIL' ? 'FAIL' : 'PASS'}
                  utilisation={maxUtil}
                />
                {/* Preset Selector */}
                <div className="mt-2">
                  <select
                    value=""
                    onChange={(e) => e.target.value && applyPreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm"
                    title="Quick Presets"
                  >
                    <option value="">Quick Presets</option>
                    {Object.entries(PRESETS).map(([key, p]) => (
                      <option key={key} value={key}>
                        {(p as any).name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Results Summary */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardContent className="p-4 space-y-3">
                        <div
                          className={cn(
                            'p-3 rounded-lg text-center',
                            overallStatus === 'PASS'
                              ? 'bg-green-500/20 border-2 border-green-500/30'
                              : overallStatus === 'WARNING'
                                ? 'bg-amber-500/20 border-2 border-amber-500/30'
                                : 'bg-red-500/20 border-2 border-red-500/30',
                          )}
                        >
                          <div
                            className={cn(
                              'text-2xl font-black',
                              overallStatus === 'PASS'
                                ? 'text-green-400'
                                : overallStatus === 'WARNING'
                                  ? 'text-amber-400'
                                  : 'text-red-400',
                            )}
                          >
                            {overallStatus}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Max Util: {maxUtil.toFixed(1)}%
                          </div>
                        </div>
                        {[
                          {
                            label: 'Vertical',
                            val:
                              (results.capacity_checks?.vertical_capacity?.max_utilisation || 0) *
                              100,
                          },
                          {
                            label: 'Horizontal',
                            val:
                              (results.capacity_checks?.horizontal_capacity?.max_utilisation || 0) *
                              100,
                          },
                          {
                            label: 'Moment',
                            val:
                              (results.capacity_checks?.moment_capacity?.max_utilisation || 0) *
                              100,
                          },
                        ].map((c, i) => (
                          <div key={c.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">{c.label}</span>
                              <span
                                className={cn(
                                  'font-bold',
                                  c.val > 100
                                    ? 'text-red-400'
                                    : c.val > 80
                                      ? 'text-amber-400'
                                      : 'text-green-400',
                                )}
                              >
                                {c.val.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(c.val, 100)}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                className={cn(
                                  'h-full rounded-full',
                                  c.val > 100
                                    ? 'bg-gradient-to-r from-red-600 to-red-400'
                                    : c.val > 80
                                      ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                                      : 'bg-gradient-to-r from-green-600 to-cyan-400',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Results Section */}
          {activeTab === 'results' && results && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.5 }}
              className="mt-12 space-y-6"
            >
              {/* Results Header */}
              <div className="text-center">
                <motion.h2
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-4xl font-black text-white mb-4"
                >
                  <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                    Analysis Results
                  </span>
                </motion.h2>
              </div>

              {/* Summary Check Cards */}
              <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                {[
                  {
                    label: 'Vertical Capacity',
                    value: ((results.capacity_checks?.vertical_capacity?.max_utilisation || 0) * 100).toFixed(1),
                    util: (results.capacity_checks?.vertical_capacity?.max_utilisation || 0) * 100,
                    status: results.capacity_checks?.vertical_capacity?.status === 'FAIL' ? 'FAIL' : 'PASS',
                    icon: <FiActivity size={14} />,
                  },
                  {
                    label: 'Horizontal Capacity',
                    value: ((results.capacity_checks?.horizontal_capacity?.max_utilisation || 0) * 100).toFixed(1),
                    util: (results.capacity_checks?.horizontal_capacity?.max_utilisation || 0) * 100,
                    status: results.capacity_checks?.horizontal_capacity?.status === 'FAIL' ? 'FAIL' : 'PASS',
                    icon: <FiSliders size={14} />,
                  },
                  {
                    label: 'Moment Capacity',
                    value: ((results.capacity_checks?.moment_capacity?.max_utilisation || 0) * 100).toFixed(1),
                    util: (results.capacity_checks?.moment_capacity?.max_utilisation || 0) * 100,
                    status: results.capacity_checks?.moment_capacity?.status === 'FAIL' ? 'FAIL' : 'PASS',
                    icon: <FiLayers size={14} />,
                  },
                  {
                    label: 'System Stability',
                    value: results.system_stability?.stability_status === 'STABLE' ? '\u2713' : '\u2717',
                    util: results.system_stability?.stability_ratio < Infinity ? Math.min((1.5 / results.system_stability.stability_ratio) * 100, 150) : 10,
                    status: results.system_stability?.stability_status === 'STABLE' ? 'PASS' : 'FAIL',
                    icon: <FiAlertTriangle size={14} />,
                  },
                  {
                    label: 'Overall',
                    value: maxUtil.toFixed(1),
                    util: maxUtil,
                    status: overallStatus === 'FAIL' ? 'FAIL' : 'PASS',
                    icon: <FiZap size={14} />,
                  },
                ].map((item, i) => (
                  <Card key={i} variant="glass" className={cn('border-l-4', item.status === 'PASS' ? 'border-l-green-500' : 'border-l-red-500')}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-1.5 bg-gray-800 rounded-lg text-gray-400">{item.icon}</span>
                        <span className={cn('px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                          item.status === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                      <p className="text-2xl font-black text-white">{item.value}{item.label !== 'System Stability' ? '%' : ''}</p>
                      <div className="mt-2 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(item.util, 100)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className={cn('h-full rounded-full', item.util > 100 ? 'bg-red-500' : item.util > 80 ? 'bg-orange-500' : 'bg-gradient-to-r from-neon-cyan to-neon-blue')}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Envelope Results */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="text-white" size={24} />
                    </motion.div>
                    <span>Reaction Envelopes (ULS)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">
                            Bearing
                          </th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">
                            V_max (kN)
                          </th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">
                            Long_max (kN)
                          </th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">
                            Trans_max (kN)
                          </th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">
                            M_long_max (kNm)
                          </th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">
                            M_trans_max (kNm)
                          </th>
                          <th className="text-center py-3 px-4 text-gray-400 font-semibold">
                            T_max (kNm)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.envelope_max).map(
                          ([bearingId, env]: [string, any]) => (
                            <tr key={bearingId} className="border-b border-gray-800">
                              <td className="py-3 px-4 text-white font-medium">{bearingId}</td>
                              <td className="py-3 px-4 text-center text-white">
                                {env.vertical_reaction.toFixed(1)}
                              </td>
                              <td className="py-3 px-4 text-center text-white">
                                {env.longitudinal_reaction.toFixed(1)}
                              </td>
                              <td className="py-3 px-4 text-center text-white">
                                {env.transverse_reaction.toFixed(1)}
                              </td>
                              <td className="py-3 px-4 text-center text-white">
                                {env.moment_longitudinal.toFixed(1)}
                              </td>
                              <td className="py-3 px-4 text-center text-white">
                                {env.moment_transverse.toFixed(1)}
                              </td>
                              <td className="py-3 px-4 text-center text-white">
                                {env.torsion.toFixed(1)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Capacity Checks */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Vertical Capacity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'border-2',
                      results.capacity_checks.vertical_capacity.status === 'PASS'
                        ? 'border-green-500/50'
                        : results.capacity_checks.vertical_capacity.status === 'WARNING'
                          ? 'border-yellow-500/50'
                          : 'border-red-500/50',
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>Vertical Capacity</span>
                          {results.capacity_checks.vertical_capacity.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  Increase bearing vertical capacity or redistribute loads
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: 360 }}
                          transition={{ delay: 0.5 }}
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            results.capacity_checks.vertical_capacity.status === 'PASS'
                              ? 'bg-green-500'
                              : results.capacity_checks.vertical_capacity.status === 'WARNING'
                                ? 'bg-yellow-500'
                                : 'bg-red-500',
                          )}
                        >
                          {results.capacity_checks.vertical_capacity.status === 'PASS' ? (
                            <FiCheck size={24} />
                          ) : results.capacity_checks.vertical_capacity.status === 'WARNING' ? (
                            <FiAlertTriangle size={24} />
                          ) : (
                            <FiAlertTriangle size={24} />
                          )}
                        </motion.div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Critical Bearing</span>
                        <span className="text-white font-bold">
                          {results.capacity_checks.vertical_capacity.critical_bearing}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Utilisation</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.capacity_checks.vertical_capacity.status === 'PASS'
                                ? 'text-green-400'
                                : results.capacity_checks.vertical_capacity.status === 'WARNING'
                                  ? 'text-yellow-400'
                                  : 'text-red-400',
                            )}
                          >
                            {(
                              results.capacity_checks.vertical_capacity.max_utilisation * 100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(results.capacity_checks.vertical_capacity.max_utilisation * 100, 100)}%`,
                            }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className={cn(
                              'h-full rounded-full',
                              results.capacity_checks.vertical_capacity.status === 'PASS'
                                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                : results.capacity_checks.vertical_capacity.status === 'WARNING'
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gradient-to-r from-red-500 to-orange-500',
                            )}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                          results.capacity_checks.vertical_capacity.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : results.capacity_checks.vertical_capacity.status === 'WARNING'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.capacity_checks.vertical_capacity.status}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Horizontal Capacity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'border-2',
                      results.capacity_checks.horizontal_capacity.status === 'PASS'
                        ? 'border-green-500/50'
                        : results.capacity_checks.horizontal_capacity.status === 'WARNING'
                          ? 'border-yellow-500/50'
                          : 'border-red-500/50',
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>Horizontal Capacity</span>
                          {results.capacity_checks.horizontal_capacity.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  Add horizontal restraint or increase bearing sliding capacity
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: 360 }}
                          transition={{ delay: 0.6 }}
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            results.capacity_checks.horizontal_capacity.status === 'PASS'
                              ? 'bg-green-500'
                              : results.capacity_checks.horizontal_capacity.status === 'WARNING'
                                ? 'bg-yellow-500'
                                : 'bg-red-500',
                          )}
                        >
                          {results.capacity_checks.horizontal_capacity.status === 'PASS' ? (
                            <FiCheck size={24} />
                          ) : results.capacity_checks.horizontal_capacity.status === 'WARNING' ? (
                            <FiAlertTriangle size={24} />
                          ) : (
                            <FiAlertTriangle size={24} />
                          )}
                        </motion.div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Critical Bearing</span>
                        <span className="text-white font-bold">
                          {results.capacity_checks.horizontal_capacity.critical_bearing}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Utilisation</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.capacity_checks.horizontal_capacity.status === 'PASS'
                                ? 'text-green-400'
                                : results.capacity_checks.horizontal_capacity.status === 'WARNING'
                                  ? 'text-yellow-400'
                                  : 'text-red-400',
                            )}
                          >
                            {(
                              results.capacity_checks.horizontal_capacity.max_utilisation * 100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(results.capacity_checks.horizontal_capacity.max_utilisation * 100, 100)}%`,
                            }}
                            transition={{ duration: 1, delay: 0.6 }}
                            className={cn(
                              'h-full rounded-full',
                              results.capacity_checks.horizontal_capacity.status === 'PASS'
                                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                : results.capacity_checks.horizontal_capacity.status === 'WARNING'
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gradient-to-r from-red-500 to-orange-500',
                            )}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                          results.capacity_checks.horizontal_capacity.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : results.capacity_checks.horizontal_capacity.status === 'WARNING'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.capacity_checks.horizontal_capacity.status}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Moment Capacity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'border-2',
                      results.capacity_checks.moment_capacity.status === 'PASS'
                        ? 'border-green-500/50'
                        : results.capacity_checks.moment_capacity.status === 'WARNING'
                          ? 'border-yellow-500/50'
                          : 'border-red-500/50',
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>Moment Capacity</span>
                          {results.capacity_checks.moment_capacity.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  Use bearings with higher moment capacity or add fixity
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: 360 }}
                          transition={{ delay: 0.7 }}
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            results.capacity_checks.moment_capacity.status === 'PASS'
                              ? 'bg-green-500'
                              : results.capacity_checks.moment_capacity.status === 'WARNING'
                                ? 'bg-yellow-500'
                                : 'bg-red-500',
                          )}
                        >
                          {results.capacity_checks.moment_capacity.status === 'PASS' ? (
                            <FiCheck size={24} />
                          ) : results.capacity_checks.moment_capacity.status === 'WARNING' ? (
                            <FiAlertTriangle size={24} />
                          ) : (
                            <FiAlertTriangle size={24} />
                          )}
                        </motion.div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Critical Bearing</span>
                        <span className="text-white font-bold">
                          {results.capacity_checks.moment_capacity.critical_bearing}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Utilisation</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.capacity_checks.moment_capacity.status === 'PASS'
                                ? 'text-green-400'
                                : results.capacity_checks.moment_capacity.status === 'WARNING'
                                  ? 'text-yellow-400'
                                  : 'text-red-400',
                            )}
                          >
                            {(
                              results.capacity_checks.moment_capacity.max_utilisation * 100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(results.capacity_checks.moment_capacity.max_utilisation * 100, 100)}%`,
                            }}
                            transition={{ duration: 1, delay: 0.7 }}
                            className={cn(
                              'h-full rounded-full',
                              results.capacity_checks.moment_capacity.status === 'PASS'
                                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                : results.capacity_checks.moment_capacity.status === 'WARNING'
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gradient-to-r from-red-500 to-orange-500',
                            )}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                          results.capacity_checks.moment_capacity.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : results.capacity_checks.moment_capacity.status === 'WARNING'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.capacity_checks.moment_capacity.status}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* System Stability */}
              <Card variant="glass" className="border-orange-500/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiActivity className="text-white" size={24} />
                    </motion.div>
                    <span>System Stability Assessment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Uplift Detected</p>
                      <p
                        className={cn(
                          'text-2xl font-bold',
                          results.system_stability.uplift_detected
                            ? 'text-red-400'
                            : 'text-green-400',
                        )}
                      >
                        {results.system_stability.uplift_detected ? 'YES' : 'NO'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Stability Ratio</p>
                      <p className="text-2xl font-bold text-white">
                        {results.system_stability.stability_ratio === Infinity
                          ? '∞'
                          : results.system_stability.stability_ratio.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Stability Status</p>
                      <p
                        className={cn(
                          'text-2xl font-bold',
                          results.system_stability.stability_status === 'STABLE'
                            ? 'text-green-400'
                            : 'text-red-400',
                        )}
                      >
                        {results.system_stability.stability_status}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Total Vertical Load</p>
                      <p className="text-2xl font-bold text-white">
                        {results.system_stability.total_vertical_load.toFixed(1)} kN
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings */}
              <Card variant="glass" className="border-amber-500/30 shadow-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-gray-400">
                    <FiAlertTriangle className="text-amber-400" /> Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {warnings.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <FiCheck /> All checks OK
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

              {/* Export Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex justify-center"
              >
                {/* Preset Selector */}
                <div className="flex items-center gap-2 mr-auto">
                  <select
                    value=""
                    onChange={(e) => e.target.value && applyPreset(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm"
                    title="Quick Presets"
                  >
                    <option value="">⚡ Quick Presets</option>
                    {Object.entries(PRESETS).map(([key, p]) => (
                      <option key={key} value={key}>
                        {(p as any).name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={exportToPDF}
                    variant="glass"
                    className="px-6 py-3 border-neon-cyan/50 hover:bg-neon-cyan/10"
                  >
                    <FiDownload className="mr-2" size={18} />
                    <span>PDF</span>
                  </Button>
                  <Button
                    onClick={exportDOCX}
                    variant="glass"
                    className="px-6 py-3 border-purple-500/50 hover:bg-purple-500/10"
                  >
                    <FiDownload className="mr-2" size={18} />
                    <span>DOCX</span>
                  </Button>
                  <SaveRunButton
                    calculatorKey="bearing_reactions"
                    inputs={formData as unknown as Record<string, string>}
                    results={results}
                    status={overallStatus}
                    summary={results ? `${maxUtil.toFixed(1)}% util` : undefined}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════ VISUALIZATION TAB ═══════ */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Utilisation Dashboard */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <FiActivity className="text-cyan-400" />
                    <span>Utilisation Dashboard</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        name: 'Vertical Capacity',
                        util:
                          (results.capacity_checks?.vertical_capacity?.max_utilisation || 0) * 100,
                        ref: 'EN 1337',
                      },
                      {
                        name: 'Horizontal Capacity',
                        util:
                          (results.capacity_checks?.horizontal_capacity?.max_utilisation || 0) *
                          100,
                        ref: 'EN 1337',
                      },
                      {
                        name: 'Moment Capacity',
                        util:
                          (results.capacity_checks?.moment_capacity?.max_utilisation || 0) * 100,
                        ref: 'EN 1337',
                      },
                      {
                        name: 'Stability',
                        util:
                          results.system_stability?.stability_ratio < Infinity
                            ? Math.min((1.5 / results.system_stability.stability_ratio) * 100, 150)
                            : 10,
                        ref: 'EN 1990',
                      },
                    ].map((check, i) => (
                      <div key={check.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300 font-medium">
                            {check.name}{' '}
                            <span className="text-gray-500 text-xs">({check.ref})</span>
                          </span>
                          <span
                            className={cn(
                              'font-bold',
                              check.util > 100
                                ? 'text-red-400'
                                : check.util > 90
                                  ? 'text-amber-400'
                                  : 'text-green-400',
                            )}
                          >
                            {check.util.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(check.util, 100)}%` }}
                            transition={{ duration: 1.2, delay: i * 0.15 }}
                            className={cn(
                              'h-full rounded-full',
                              check.util > 100
                                ? 'bg-gradient-to-r from-red-600 to-red-400'
                                : check.util > 90
                                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                                  : 'bg-gradient-to-r from-green-600 to-cyan-400',
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* SVG Structural Diagrams */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Bearing Layout Plan */}
                <Card className="bg-gray-900/50 border-cyan-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Bearing Layout Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full h-48">
                      {(() => {
                        const nB = parseInt(formData.numberOfBearings) || 2;
                        const ox = 40;
                        const deckY = 60;
                        const deckW = 320;
                        const bSpacing = deckW / Math.max(nB + 1, 2);
                        const elements: React.ReactNode[] = [];

                        // Bridge deck
                        elements.push(
                          <rect
                            key="deck"
                            x={ox}
                            y={deckY}
                            width={deckW}
                            height={12}
                            fill="#445566"
                            stroke="#667788"
                            strokeWidth="1.5"
                            rx="2"
                          />,
                        );
                        elements.push(
                          <line
                            key="deck-top"
                            x1={ox}
                            y1={deckY}
                            x2={ox + deckW}
                            y2={deckY}
                            stroke="#00d9ff"
                            strokeWidth="1.5"
                          />,
                        );

                        // Bearings
                        for (let i = 0; i < nB; i++) {
                          const bx = ox + bSpacing * (i + 1);
                          const statusCol = results
                            ? (results.capacity_checks?.vertical_capacity?.max_utilisation || 0) > 1
                              ? '#ef4444'
                              : (results.capacity_checks?.vertical_capacity?.max_utilisation || 0) >
                                  0.8
                                ? '#f97316'
                                : '#22c55e'
                            : '#fbbf24';
                          elements.push(
                            <circle
                              key={`b-${i}`}
                              cx={bx}
                              cy={deckY + 24}
                              r={8}
                              fill={statusCol}
                              stroke="#fff"
                              strokeWidth="1.5"
                            />,
                          );
                          elements.push(
                            <text
                              key={`bl-${i}`}
                              x={bx}
                              y={deckY + 48}
                              fill="#fbbf24"
                              fontSize="10"
                              textAnchor="middle"
                              fontWeight="bold"
                            >{`B${i + 1}`}</text>,
                          );
                          // Pedestal
                          elements.push(
                            <rect
                              key={`ped-${i}`}
                              x={bx - 12}
                              y={deckY + 32}
                              width={24}
                              height={40}
                              fill="#556677"
                              stroke="#667788"
                              strokeWidth="1"
                              rx="1"
                            />,
                          );
                          // Ground line under pedestal
                          elements.push(
                            <line
                              key={`gl-${i}`}
                              x1={bx - 18}
                              y1={deckY + 72}
                              x2={bx + 18}
                              y2={deckY + 72}
                              stroke="#64748b"
                              strokeWidth="1.5"
                            />,
                          );
                        }

                        // Span dimension
                        elements.push(
                          <line
                            key="dim"
                            x1={ox}
                            y1={185}
                            x2={ox + deckW}
                            y2={185}
                            stroke="#00d9ff"
                            strokeWidth="1"
                            strokeDasharray="4"
                          />,
                        );
                        elements.push(
                          <line
                            key="dim-l"
                            x1={ox}
                            y1={180}
                            x2={ox}
                            y2={190}
                            stroke="#00d9ff"
                            strokeWidth="1.5"
                          />,
                        );
                        elements.push(
                          <line
                            key="dim-r"
                            x1={ox + deckW}
                            y1={180}
                            x2={ox + deckW}
                            y2={190}
                            stroke="#00d9ff"
                            strokeWidth="1.5"
                          />,
                        );
                        elements.push(
                          <text
                            key="dim-t"
                            x={ox + deckW / 2}
                            y={198}
                            fill="#00d9ff"
                            fontSize="11"
                            textAnchor="middle"
                            fontWeight="bold"
                          >{`${formData.spanLength} m`}</text>,
                        );

                        // Bearing spacing
                        if (nB >= 2) {
                          const bx1 = ox + bSpacing;
                          const bx2 = ox + bSpacing * 2;
                          elements.push(
                            <line
                              key="bs"
                              x1={bx1}
                              y1={45}
                              x2={bx2}
                              y2={45}
                              stroke="#f97316"
                              strokeWidth="1"
                              strokeDasharray="3"
                            />,
                          );
                          elements.push(
                            <text
                              key="bs-t"
                              x={(bx1 + bx2) / 2}
                              y={40}
                              fill="#f97316"
                              fontSize="9"
                              textAnchor="middle"
                            >{`s = ${formData.bearingSpacing} m`}</text>,
                          );
                        }

                        // Bridge type label
                        elements.push(
                          <text
                            key="type"
                            x={ox + deckW / 2}
                            y={20}
                            fill="#94a3b8"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {formData.bridgeType.replace('_', ' ').toUpperCase()}
                          </text>,
                        );

                        return elements;
                      })()}
                    </svg>
                  </CardContent>
                </Card>

                {/* Reaction Envelope Bar Chart */}
                <Card className="bg-gray-900/50 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Reaction Envelope (Max)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full h-48">
                      {(() => {
                        const nB = Object.keys(results.envelope_max || {}).length;
                        if (nB === 0)
                          return (
                            <text x="200" y="100" fill="#94a3b8" fontSize="12" textAnchor="middle">
                              No results
                            </text>
                          );
                        const maxV = Math.max(
                          ...Object.values(results.envelope_max).map((e: any) =>
                            Math.abs(e.vertical_reaction || 0),
                          ),
                          1,
                        );
                        const barW = Math.min(40, 300 / nB);
                        const ox = 50;
                        const baseY = 170;
                        const maxH = 130;
                        const elements: React.ReactNode[] = [];

                        // Axes
                        elements.push(
                          <line
                            key="ax-y"
                            x1={ox}
                            y1={20}
                            x2={ox}
                            y2={baseY}
                            stroke="#64748b"
                            strokeWidth="1"
                          />,
                        );
                        elements.push(
                          <line
                            key="ax-x"
                            x1={ox}
                            y1={baseY}
                            x2={380}
                            y2={baseY}
                            stroke="#64748b"
                            strokeWidth="1"
                          />,
                        );
                        elements.push(
                          <text
                            key="ax-label"
                            x="15"
                            y="95"
                            fill="#64748b"
                            fontSize="9"
                            textAnchor="middle"
                            transform="rotate(-90, 15, 95)"
                          >
                            V_max (kN)
                          </text>,
                        );

                        // Scale ticks
                        for (let i = 0; i <= 4; i++) {
                          const y = baseY - (i / 4) * maxH;
                          const val = (i / 4) * maxV;
                          elements.push(
                            <line
                              key={`tick-${i}`}
                              x1={ox - 5}
                              y1={y}
                              x2={ox}
                              y2={y}
                              stroke="#64748b"
                              strokeWidth="0.5"
                            />,
                          );
                          elements.push(
                            <text
                              key={`tv-${i}`}
                              x={ox - 8}
                              y={y + 3}
                              fill="#64748b"
                              fontSize="8"
                              textAnchor="end"
                            >
                              {val.toFixed(0)}
                            </text>,
                          );
                        }

                        Object.entries(results.envelope_max).forEach(
                          ([bearingId, env]: [string, any], i) => {
                            const barH = (Math.abs(env.vertical_reaction) / maxV) * maxH;
                            const cx = ox + 20 + i * (barW + 10);
                            const util = Math.abs(env.vertical_reaction) / 5000;
                            const col = util > 1 ? '#ef4444' : util > 0.8 ? '#f97316' : '#22c55e';
                            elements.push(
                              <rect
                                key={`bar-${i}`}
                                x={cx}
                                y={baseY - barH}
                                width={barW}
                                height={barH}
                                fill={col}
                                opacity="0.8"
                                rx="2"
                              />,
                            );
                            elements.push(
                              <text
                                key={`bv-${i}`}
                                x={cx + barW / 2}
                                y={baseY - barH - 5}
                                fill={col}
                                fontSize="9"
                                textAnchor="middle"
                                fontWeight="bold"
                              >
                                {env.vertical_reaction.toFixed(0)}
                              </text>,
                            );
                            elements.push(
                              <text
                                key={`bn-${i}`}
                                x={cx + barW / 2}
                                y={baseY + 12}
                                fill="#94a3b8"
                                fontSize="8"
                                textAnchor="middle"
                              >
                                {bearingId.replace('Bearing_', 'B')}
                              </text>,
                            );
                          },
                        );

                        return elements;
                      })()}
                    </svg>
                  </CardContent>
                </Card>

                {/* Force Distribution Diagram */}
                <Card className="bg-gray-900/50 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Force Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full h-48">
                      {(() => {
                        const nB = parseInt(formData.numberOfBearings) || 2;
                        const ox = 40;
                        const deckY = 50;
                        const deckW = 320;
                        const bSpacing = deckW / Math.max(nB + 1, 2);
                        const elements: React.ReactNode[] = [];

                        // Deck
                        elements.push(
                          <rect
                            key="deck"
                            x={ox}
                            y={deckY}
                            width={deckW}
                            height={8}
                            fill="#445566"
                            rx="1"
                          />,
                        );

                        // Load arrows from top
                        for (let i = 1; i <= 5; i++) {
                          const ax = ox + (deckW * i) / 6;
                          elements.push(
                            <line
                              key={`la-${i}`}
                              x1={ax}
                              y1={10}
                              x2={ax}
                              y2={deckY - 2}
                              stroke="#ff4466"
                              strokeWidth="1.5"
                            />,
                          );
                          elements.push(
                            <polygon
                              key={`lah-${i}`}
                              points={`${ax - 4},${deckY - 2} ${ax + 4},${deckY - 2} ${ax},${deckY + 2}`}
                              fill="#ff4466"
                            />,
                          );
                        }
                        elements.push(
                          <text
                            key="load-l"
                            x={ox + deckW / 2}
                            y={8}
                            fill="#ff4466"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            Applied Loads
                          </text>,
                        );

                        // Bearings with reaction arrows
                        for (let i = 0; i < nB; i++) {
                          const bx = ox + bSpacing * (i + 1);
                          // Bearing symbol
                          elements.push(
                            <circle
                              key={`b-${i}`}
                              cx={bx}
                              cy={deckY + 18}
                              r={6}
                              fill="#fbbf24"
                              stroke="#fff"
                              strokeWidth="1"
                            />,
                          );

                          // Vertical reaction arrow (downward from bearing)
                          const envKey = `Bearing_${i + 1}`;
                          const vReact = results.envelope_max?.[envKey]?.vertical_reaction || 0;
                          const arrowLen = Math.max(20, Math.min(60, Math.abs(vReact) / 50));
                          elements.push(
                            <line
                              key={`ra-${i}`}
                              x1={bx}
                              y1={deckY + 26}
                              x2={bx}
                              y2={deckY + 26 + arrowLen}
                              stroke="#22c55e"
                              strokeWidth="2.5"
                            />,
                          );
                          elements.push(
                            <polygon
                              key={`rah-${i}`}
                              points={`${bx - 5},${deckY + 26 + arrowLen} ${bx + 5},${deckY + 26 + arrowLen} ${bx},${deckY + 32 + arrowLen}`}
                              fill="#22c55e"
                            />,
                          );
                          elements.push(
                            <text
                              key={`rv-${i}`}
                              x={bx}
                              y={deckY + 42 + arrowLen}
                              fill="#22c55e"
                              fontSize="9"
                              textAnchor="middle"
                              fontWeight="bold"
                            >{`${vReact.toFixed(0)} kN`}</text>,
                          );
                        }

                        // Support symbol (hatched ground)
                        elements.push(
                          <line
                            key="ground"
                            x1={ox - 10}
                            y1={180}
                            x2={ox + deckW + 10}
                            y2={180}
                            stroke="#64748b"
                            strokeWidth="1.5"
                          />,
                        );
                        for (let i = 0; i < 20; i++) {
                          const hx = ox - 10 + i * 18;
                          elements.push(
                            <line
                              key={`hatch-${i}`}
                              x1={hx}
                              y1={180}
                              x2={hx - 8}
                              y2={190}
                              stroke="#64748b"
                              strokeWidth="0.5"
                            />,
                          );
                        }

                        return elements;
                      })()}
                    </svg>
                  </CardContent>
                </Card>

                {/* Bearing Type Detail */}
                <Card className="bg-gray-900/50 border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Bearing Detail</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 220" className="w-full h-48">
                      {(() => {
                        const cx = 200;
                        const cy = 110;
                        const bType = formData.bearingType;
                        const col =
                          maxUtil > 100 ? '#ef4444' : maxUtil > 90 ? '#f97316' : '#3b82f6';

                        const elements: React.ReactNode[] = [];

                        if (bType === 'pot' || bType === 'spherical') {
                          // Pot/spherical bearing
                          elements.push(
                            <rect
                              key="base"
                              x={cx - 50}
                              y={cy + 20}
                              width={100}
                              height={12}
                              fill="#888"
                              rx="2"
                            />,
                          );
                          elements.push(
                            <rect
                              key="body"
                              x={cx - 40}
                              y={cy - 10}
                              width={80}
                              height={30}
                              fill={col}
                              opacity="0.5"
                              stroke={col}
                              strokeWidth="2"
                              rx="4"
                            />,
                          );
                          elements.push(
                            <ellipse
                              key="top"
                              cx={cx}
                              cy={cy - 15}
                              rx={35}
                              ry={10}
                              fill={col}
                              opacity="0.3"
                              stroke={col}
                              strokeWidth="1.5"
                            />,
                          );
                          elements.push(
                            <rect
                              key="plate"
                              x={cx - 50}
                              y={cy - 30}
                              width={100}
                              height={8}
                              fill="#888"
                              rx="2"
                            />,
                          );
                          elements.push(
                            <text
                              key="label"
                              x={cx}
                              y={cy + 55}
                              fill={col}
                              fontSize="12"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {bType === 'pot' ? 'Pot Bearing' : 'Spherical Bearing'}
                            </text>,
                          );
                        } else if (bType === 'fixed') {
                          elements.push(
                            <rect
                              key="base"
                              x={cx - 45}
                              y={cy + 15}
                              width={90}
                              height={12}
                              fill="#888"
                              rx="2"
                            />,
                          );
                          elements.push(
                            <rect
                              key="body"
                              x={cx - 35}
                              y={cy - 15}
                              width={70}
                              height={30}
                              fill={col}
                              opacity="0.5"
                              stroke={col}
                              strokeWidth="2"
                              rx="2"
                            />,
                          );
                          elements.push(
                            <line
                              key="fix1"
                              x1={cx - 20}
                              y1={cy - 5}
                              x2={cx + 20}
                              y2={cy + 5}
                              stroke={col}
                              strokeWidth="2"
                            />,
                          );
                          elements.push(
                            <line
                              key="fix2"
                              x1={cx + 20}
                              y1={cy - 5}
                              x2={cx - 20}
                              y2={cy + 5}
                              stroke={col}
                              strokeWidth="2"
                            />,
                          );
                          elements.push(
                            <rect
                              key="plate"
                              x={cx - 45}
                              y={cy - 28}
                              width={90}
                              height={8}
                              fill="#888"
                              rx="2"
                            />,
                          );
                          elements.push(
                            <text
                              key="label"
                              x={cx}
                              y={cy + 50}
                              fill={col}
                              fontSize="12"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              Fixed Bearing
                            </text>,
                          );
                        } else {
                          // Guided/free/cylindrical
                          elements.push(
                            <rect
                              key="base"
                              x={cx - 50}
                              y={cy + 15}
                              width={100}
                              height={10}
                              fill="#888"
                              rx="2"
                            />,
                          );
                          elements.push(
                            <rect
                              key="slide"
                              x={cx - 40}
                              y={cy - 5}
                              width={80}
                              height={20}
                              fill={col}
                              opacity="0.4"
                              stroke={col}
                              strokeWidth="1.5"
                              rx="3"
                            />,
                          );
                          elements.push(
                            <line
                              key="arrow"
                              x1={cx - 25}
                              y1={cy + 5}
                              x2={cx + 25}
                              y2={cy + 5}
                              stroke={col}
                              strokeWidth="2"
                              markerEnd="url(#arrow)"
                            />,
                          );
                          elements.push(
                            <rect
                              key="plate"
                              x={cx - 50}
                              y={cy - 20}
                              width={100}
                              height={8}
                              fill="#888"
                              rx="2"
                            />,
                          );
                          elements.push(
                            <text
                              key="label"
                              x={cx}
                              y={cy + 50}
                              fill={col}
                              fontSize="12"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {bType.charAt(0).toUpperCase() + bType.slice(1)} Bearing
                            </text>,
                          );
                        }

                        // Capacity info
                        const bearingProps: Record<string, { V_Rd: number; M_Rd: number }> = {
                          pot: { V_Rd: 5000, M_Rd: 200 },
                          spherical: { V_Rd: 10000, M_Rd: 500 },
                          cylindrical: { V_Rd: 4000, M_Rd: 150 },
                          fixed: { V_Rd: 6000, M_Rd: 500 },
                          guided: { V_Rd: 3000, M_Rd: 100 },
                          free: { V_Rd: 2000, M_Rd: 0 },
                        };
                        const bp = bearingProps[bType] || bearingProps.pot;
                        elements.push(
                          <text
                            key="vrd"
                            x={cx}
                            y={cy + 70}
                            fill="#94a3b8"
                            fontSize="10"
                            textAnchor="middle"
                          >{`V_Rd = ${bp.V_Rd} kN   M_Rd = ${bp.M_Rd} kNm`}</text>,
                        );
                        elements.push(
                          <text
                            key="util"
                            x={cx}
                            y={cy + 85}
                            fill={maxUtil > 100 ? '#ef4444' : '#22c55e'}
                            fontSize="10"
                            textAnchor="middle"
                            fontWeight="bold"
                          >{`Max Util: ${maxUtil.toFixed(1)}%`}</text>,
                        );

                        return elements;
                      })()}
                    </svg>
                  </CardContent>
                </Card>
              </div>

              {/* 3D Interactive View */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <FiEye className="text-cyan-400" />
                    <span>3D Interactive View</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram
                    height="h-[500px]"
                    cameraPosition={[10, 6, 10]}
                    status={overallStatus === 'FAIL' ? 'FAIL' : 'PASS'}
                  >
                    <BearingReactions3D
                      spanLength={parseFloat(formData.spanLength) || 30}
                      bearingSpacing={parseFloat(formData.bearingSpacing) || 12}
                      numberOfBearings={parseInt(formData.numberOfBearings) || 2}
                      bridgeType={formData.bridgeType}
                      bearingType={formData.bearingType}
                      maxVerticalReaction={Math.max(
                        ...Object.values(results.envelope_max || {}).map((e: any) =>
                          Math.abs(e.vertical_reaction || 0),
                        ),
                      )}
                      maxHorizontalReaction={Math.max(
                        ...Object.values(results.envelope_max || {}).map((e: any) =>
                          Math.sqrt(
                            (e.longitudinal_reaction || 0) ** 2 + (e.transverse_reaction || 0) ** 2,
                          ),
                        ),
                      )}
                      utilisation={maxUtil}
                      status={overallStatus}
                    />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>

              {/* Bearing Summary Table */}
              <Card className="bg-gray-900/50 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <FiLayers className="text-purple-400" />
                    <span>Bearing Configuration Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      {
                        label: 'Type',
                        value:
                          formData.bearingType.charAt(0).toUpperCase() +
                          formData.bearingType.slice(1),
                      },
                      { label: 'No. Bearings', value: formData.numberOfBearings },
                      { label: 'Spacing', value: `${formData.bearingSpacing} m` },
                      { label: 'Span', value: `${formData.spanLength} m` },
                      {
                        label: 'Max V',
                        value: `${Math.max(...Object.values(results.envelope_max || {}).map((e: any) => Math.abs(e.vertical_reaction || 0))).toFixed(0)} kN`,
                      },
                      { label: 'Overall', value: overallStatus === 'PASS' ? 'PASS' : 'FAIL' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-3 rounded-lg bg-gray-900/50 border border-gray-700 text-center"
                      >
                        <p className="text-gray-400 text-xs uppercase mb-1">{item.label}</p>
                        <p className="text-white font-bold text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
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

export default BearingReactions;
