// =============================================================================
// Pile Foundations Calculator — Premium Edition
// EN 1997-1 Deep Foundation Design — Bored, CFA & Driven Piles
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiAnchor,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiEye,
    FiGrid,
    FiLayers,
    FiSettings,
    FiTarget,
    FiTrendingUp,
    FiX,
    FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import PileFoundations3D from '../../components/3d/scenes/PileFoundations3D';
import ErrorBoundary from '../../components/ErrorBoundary';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { CONCRETE_GRADES as _CONCRETE_LIB } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { downloadPDF } from '../../lib/pdf';
import { buildPileFoundationsReport } from '../../lib/pdf/builders/pileFoundationsBuilder';
import { cn } from '../../lib/utils';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Pile Properties
  pile_type: string;
  pile_count: string;
  pile_diameter: string;
  pile_length: string;
  concrete_grade: string;
  steel_grade: string;
  reinforcement_percent: string;
  // Loading
  load_vertical: string;
  load_horizontal: string;
  moment: string;
  load_case: string;
  // Group Layout
  layout: string;
  spacing: string;
  cap_thickness: string;
  cap_width: string;
  // Soil
  soil_profile: string;
  cu_surface: string;
  cu_gradient: string;
  phi_eff: string;
  gamma: string;
  groundwater_depth: string;
  // Factors
  gamma_R1: string;
  gamma_R2: string;
  gamma_R3: string;
  // Project
  projectName: string;
  reference: string;
}

interface PileResult {
  shaft_friction: number;
  end_bearing: number;
  ultimate_capacity: number;
  design_capacity: number;
  axial_util: number;
  lateral_capacity: number;
  lateral_util: number;
  moment_capacity: number;
  moment_util: number;
  settlement: number;
  status: string;
}

interface Results {
  single_pile: PileResult;
  group_capacity: number;
  group_efficiency: number;
  governing_util: number;
  cap_design: {
    width: number;
    depth: number;
    shear_check: number;
    punching_check: number;
  };
  cost_estimate: {
    piling: number;
    reinforcement: number;
    pile_cap: number;
    total: number;
  };
  status: string;
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const PILE_TYPES = {
  bored: { name: 'Bored Cast-In-Place', factor: 0.9, description: 'Bored using casing or slurry' },
  cfa: { name: 'Continuous Flight Auger', factor: 0.85, description: 'CFA pile with grout' },
  driven_precast: { name: 'Driven Precast', factor: 1.0, description: 'Precast concrete driven' },
  driven_steel: {
    name: 'Driven Steel H-pile',
    factor: 0.95,
    description: 'Steel H-section driven',
  },
  micropile: { name: 'Micropile', factor: 0.75, description: 'Small diameter grouted pile' },
};

const SOIL_PROFILES = {
  soft_clay: { name: 'Soft Clay', cu_typ: 25, gamma: 16, alpha: 1.0, description: 'Cu < 40 kPa' },
  firm_clay: { name: 'Firm Clay', cu_typ: 60, gamma: 18, alpha: 0.7, description: 'Cu 40-75 kPa' },
  stiff_clay: {
    name: 'Stiff Clay',
    cu_typ: 100,
    gamma: 19,
    alpha: 0.5,
    description: 'Cu 75-150 kPa',
  },
  very_stiff_clay: {
    name: 'Very Stiff Clay',
    cu_typ: 150,
    gamma: 20,
    alpha: 0.45,
    description: 'Cu > 150 kPa',
  },
  loose_sand: { name: 'Loose Sand', phi: 28, gamma: 17, Ks: 0.8, description: 'N < 10' },
  medium_sand: { name: 'Medium Dense Sand', phi: 33, gamma: 18, Ks: 1.0, description: 'N 10-30' },
  dense_sand: { name: 'Dense Sand', phi: 38, gamma: 19, Ks: 1.2, description: 'N > 30' },
  gravel: { name: 'Gravel', phi: 40, gamma: 20, Ks: 1.4, description: 'Well graded gravel' },
  weathered_rock: {
    name: 'Weathered Rock',
    phi: 42,
    gamma: 22,
    Ks: 1.5,
    description: 'Grade IV-V rock',
  },
};

const CONCRETE_GRADES = {
  C25: { fck: _CONCRETE_LIB['C25/30'].fck, name: _CONCRETE_LIB['C25/30'].name },
  C30: { fck: _CONCRETE_LIB['C30/37'].fck, name: _CONCRETE_LIB['C30/37'].name },
  C35: { fck: _CONCRETE_LIB['C35/45'].fck, name: _CONCRETE_LIB['C35/45'].name },
  C40: { fck: _CONCRETE_LIB['C40/50'].fck, name: _CONCRETE_LIB['C40/50'].name },
  C50: { fck: _CONCRETE_LIB['C50/60'].fck, name: _CONCRETE_LIB['C50/60'].name },
};

const LAYOUTS = {
  single: { name: 'Single Pile', efficiency: 1.0 },
  pair: { name: 'Pile Pair (2)', efficiency: 0.95 },
  triangle: { name: 'Triangle (3)', efficiency: 0.9 },
  square: { name: 'Square (4)', efficiency: 0.85 },
  rectangle: { name: 'Rectangle (6)', efficiency: 0.8 },
  grid_9: { name: 'Grid 3×3 (9)', efficiency: 0.75 },
  grid_12: { name: 'Grid 3×4 (12)', efficiency: 0.7 },
};

const PRESETS = {
  highway_pier: {
    name: 'Highway Bridge Pier',
    pile_type: 'bored',
    pile_count: '4',
    pile_diameter: '1.2',
    pile_length: '25',
    load_vertical: '6000',
    load_horizontal: '400',
    soil_profile: 'stiff_clay',
    layout: 'square',
    spacing: '3.6',
    cap_thickness: '1.5',
    cap_width: '4.8',
  },
  rail_bridge_pier: {
    name: 'Rail Bridge Pier',
    pile_type: 'bored',
    pile_count: '6',
    pile_diameter: '1.5',
    pile_length: '30',
    load_vertical: '10000',
    load_horizontal: '600',
    soil_profile: 'dense_sand',
    layout: 'rectangular',
    spacing: '4.5',
    cap_thickness: '2.0',
    cap_width: '7.0',
  },
  abutment_piles: {
    name: 'Abutment Pile Group',
    pile_type: 'bored',
    pile_count: '8',
    pile_diameter: '0.9',
    pile_length: '18',
    load_vertical: '5000',
    load_horizontal: '800',
    soil_profile: 'firm_clay',
    layout: 'rectangular',
    spacing: '2.7',
    cap_thickness: '1.2',
    cap_width: '6.0',
  },
  river_crossing: {
    name: 'River Crossing Pier',
    pile_type: 'driven_steel',
    pile_count: '6',
    pile_diameter: '0.914',
    pile_length: '35',
    load_vertical: '8000',
    load_horizontal: '1000',
    soil_profile: 'medium_sand',
    groundwater_depth: '0',
    layout: 'circular',
    spacing: '2.7',
    cap_thickness: '1.8',
    cap_width: '5.5',
  },
  footbridge_pier: {
    name: 'Footbridge Pier',
    pile_type: 'cfa',
    pile_count: '2',
    pile_diameter: '0.6',
    pile_length: '12',
    load_vertical: '800',
    load_horizontal: '60',
    soil_profile: 'medium_sand',
    layout: 'line',
    spacing: '1.8',
    cap_thickness: '0.8',
    cap_width: '2.4',
  },
  viaduct_pier: {
    name: 'Viaduct Tall Pier',
    pile_type: 'bored',
    pile_count: '9',
    pile_diameter: '1.5',
    pile_length: '40',
    load_vertical: '15000',
    load_horizontal: '1200',
    soil_profile: 'stiff_clay',
    layout: 'square',
    spacing: '4.5',
    cap_thickness: '2.5',
    cap_width: '9.0',
  },
};

const PileFoundations = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    cap_thickness: '',
    cap_width: '',
    concrete_grade: '',
    cu_gradient: '',
    cu_surface: '',
    gamma: '',
    gamma_R1: '',
    gamma_R2: '',
    gamma_R3: '',
    groundwater_depth: '',
    layout: '',
    load_case: '',
    load_horizontal: '',
    load_vertical: '',
    moment: '',
    phi_eff: '',
    pile_count: '',
    pile_diameter: '',
    pile_length: '',
    pile_type: '',
    projectName: '',
    reference: '',
    reinforcement_percent: '',
    soil_profile: '',
    spacing: '',
    steel_grade: '',
  });
  const [results, setResults] = useState<Results | null>(null);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([12, 10, 12]);
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const D = parseFloat(formData.pile_diameter);
    const L = parseFloat(formData.pile_length);
    const n = parseInt(formData.pile_count);
    const Pv = parseFloat(formData.load_vertical);
    if (isNaN(D) || D <= 0) errors.push('Pile diameter must be a positive number');
    if (isNaN(L) || L <= 0) errors.push('Pile length must be a positive number');
    if (isNaN(n) || n < 1) errors.push('Pile count must be at least 1');
    if (isNaN(Pv) || Pv <= 0) errors.push('Vertical load must be a positive number');
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
        const D = parseFloat(formData.pile_diameter) || 0.6;
        const L = parseFloat(formData.pile_length) || 15;
        const nPiles = parseInt(formData.pile_count) || 1;
        const Pv = parseFloat(formData.load_vertical) || 1000;
        const Ph = parseFloat(formData.load_horizontal) || 0;
        const M = parseFloat(formData.moment) || 0;
        const spacing = parseFloat(formData.spacing) || 3 * D;

        // Soil properties
        const soil = (SOIL_PROFILES as any)[formData.soil_profile] || SOIL_PROFILES.firm_clay;
        const cu_surface = parseFloat(formData.cu_surface) || soil.cu_typ || 0;
        const cu_gradient = parseFloat(formData.cu_gradient) || 0;
        const phi_eff = parseFloat(formData.phi_eff) || soil.phi || 0;
        const gamma_soil = parseFloat(formData.gamma) || soil.gamma;
        const gw_depth = parseFloat(formData.groundwater_depth) || L;

        // Pile type
        const pileType =
          PILE_TYPES[formData.pile_type as keyof typeof PILE_TYPES] || PILE_TYPES.bored;
        const typeFactor = pileType.factor;

        // Resistance factors (DA1-C2 defaults)
        const gamma_R1 = parseFloat(formData.gamma_R1) || 1.0;
        const gamma_R2 = parseFloat(formData.gamma_R2) || 1.3;
        const gamma_R3 = parseFloat(formData.gamma_R3) || 1.0;

        // Pile geometry
        const Ap = (Math.PI / 4) * D * D; // Base area m²
        const perimeter = Math.PI * D; // Perimeter m

        // --- SINGLE PILE CAPACITY ---
        let shaft_friction = 0;
        let end_bearing = 0;

        if (cu_surface > 0) {
          // Cohesive soil — alpha method (EN 1997-1)
          const alpha = soil.alpha || 0.5;
          const cu_avg = cu_surface + (cu_gradient * L) / 2;
          const cu_base = cu_surface + cu_gradient * L;
          shaft_friction = alpha * cu_avg * perimeter * L * typeFactor;
          end_bearing = 9 * cu_base * Ap;
          w.push(`Alpha method: α=${alpha}, cu_avg=${cu_avg.toFixed(0)} kPa`);
        } else if (phi_eff > 0) {
          // Granular soil — beta method
          const phi_rad = (phi_eff * Math.PI) / 180;
          const K0 = 1 - Math.sin(phi_rad);
          const Ks = (soil.Ks || 1.0) * K0;
          const delta = phi_eff * 0.75; // Wall friction ~ 0.75φ
          const delta_rad = (delta * Math.PI) / 180;

          // Effective stress at mid-depth
          const gamma_eff = gamma_soil - (gw_depth < L ? (9.81 * (L - gw_depth)) / L : 0);
          const sigma_v_avg = gamma_eff * (L / 2);
          const sigma_v_base = gamma_eff * L;

          shaft_friction = Ks * sigma_v_avg * Math.tan(delta_rad) * perimeter * L * typeFactor;
          const Nq =
            Math.exp(Math.PI * Math.tan(phi_rad)) *
            Math.pow(Math.tan(Math.PI / 4 + phi_rad / 2), 2);
          end_bearing = Nq * sigma_v_base * Ap;
          w.push(`Beta method: Ks=${Ks.toFixed(2)}, Nq=${Nq.toFixed(1)}`);
        }

        const ultimate_capacity = shaft_friction + end_bearing;
        const design_capacity_shaft = shaft_friction / gamma_R2;
        const design_capacity_base = end_bearing / gamma_R3;
        const design_capacity = design_capacity_shaft + design_capacity_base;

        // Load per pile
        const load_per_pile = Pv / nPiles;
        const axial_util = design_capacity > 0 ? load_per_pile / design_capacity : 999;

        // Lateral capacity (simplified Broms)
        const lateral_capacity =
          cu_surface > 0
            ? (9 * cu_surface * D * L * 0.5) / 1.4
            : (3 * gamma_soil * D * L * L * Math.tan((phi_eff * Math.PI) / 180)) / 6;
        const lateral_per_pile = Ph / nPiles;
        const lateral_util = lateral_capacity > 0 ? lateral_per_pile / lateral_capacity : 0;

        // Moment capacity (rough estimate)
        const moment_capacity = design_capacity * D * 0.5;
        const moment_util = moment_capacity > 0 ? M / nPiles / moment_capacity : 0;

        // Settlement estimate (elastic shortening + Randolph & Wroth simplified)
        const Ec_pile = 30000; // MPa for concrete
        const elastic_settlement = ((load_per_pile * 1000 * L) / (Ec_pile * Ap * 1e6)) * 1000; // mm
        const base_settlement = (load_per_pile / ultimate_capacity) * D * 1000 * 0.1; // ~10% D at ult
        const settlement = elastic_settlement + base_settlement;

        const governing_util = Math.max(axial_util, lateral_util);
        let pileStatus = 'PASS';
        if (governing_util > 1.0) pileStatus = 'FAIL';
        else if (governing_util > 0.9) pileStatus = 'MARGINAL';

        // --- GROUP EFFECTS ---
        const layout = LAYOUTS[formData.layout as keyof typeof LAYOUTS] || LAYOUTS.single;
        const group_efficiency =
          spacing > 0
            ? Math.min(1.0, layout.efficiency + (spacing / D - 3) * 0.02)
            : layout.efficiency;
        const group_capacity = design_capacity * nPiles * group_efficiency;

        // --- PILE CAP ---
        const capW =
          parseFloat(formData.cap_width) ||
          (nPiles <= 2 ? spacing + D + 0.3 : spacing * 1.5 + D + 0.3);
        const capD = parseFloat(formData.cap_thickness) || Math.max(0.6, D * 1.5);
        const cap_shear_check = governing_util; // simplified
        const cap_punching = governing_util * 0.85;

        // --- COST ESTIMATE ---
        const pile_volume = Ap * L * nPiles;
        const piling_cost = pile_volume * 300; // ~£300/m³
        const rebar_cost = pile_volume * 0.01 * 7850 * 1.2; // 1% rebar
        const cap_volume = capW * capW * capD;
        const cap_cost = cap_volume * 250;

        // Warnings
        if (axial_util > 1.0) w.push('Pile axial capacity exceeded');
        if (lateral_util > 0.8) w.push('High lateral loading — consider raking piles');
        if (settlement > 25) w.push('Settlement > 25mm — review serviceability');
        if (spacing / D < 2.5) w.push('Pile spacing < 2.5D — group effects significant');
        if (L / D > 60) w.push('Slender pile (L/D > 60) — check buckling');

        // Rating
        let rating = 'PASS';
        let ratingColor = '#22c55e';
        if (governing_util > 1.0) {
          rating = 'FAIL';
          ratingColor = '#ef4444';
        } else if (governing_util > 0.85) {
          rating = 'ADEQUATE';
          ratingColor = '#f59e0b';
        } else if (governing_util > 0.6) {
          rating = 'GOOD';
          ratingColor = '#3b82f6';
        }

        setResults({
          single_pile: {
            shaft_friction,
            end_bearing,
            ultimate_capacity,
            design_capacity,
            axial_util,
            lateral_capacity,
            lateral_util,
            moment_capacity,
            moment_util,
            settlement,
            status: pileStatus,
          },
          group_capacity,
          group_efficiency,
          governing_util,
          cap_design: {
            width: capW,
            depth: capD,
            shear_check: cap_shear_check,
            punching_check: cap_punching,
          },
          cost_estimate: {
            piling: piling_cost,
            reinforcement: rebar_cost,
            pile_cap: cap_cost,
            total: piling_cost + rebar_cost + cap_cost,
          },
          status: `${nPiles}× Ø${(D * 1000).toFixed(0)}mm × ${L}m — ${rating}`,
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

  const handleExportPDF = useCallback(async () => {
    if (!results) return;
    const sp = results.single_pile;
    const reportData = buildPileFoundationsReport(
      {
        pileType:
          PILE_TYPES[formData.pile_type as keyof typeof PILE_TYPES]?.name || formData.pile_type,
        pileDiameter: formData.pile_diameter,
        pileLength: formData.pile_length,
        numberOfPiles: formData.pile_count,
        pileSpacing: formData.spacing,
        layout: formData.layout,
        soilProfile: (SOIL_PROFILES as any)[formData.soil_profile]?.name || formData.soil_profile,
        loadVertical: formData.load_vertical,
        loadHorizontal: formData.load_horizontal,
        moment: formData.moment,
        concreteGrade: formData.concrete_grade,
        projectName: formData.projectName || 'Pile Foundation Design',
        reference: formData.reference || 'PIL001',
      },
      {
        shaftFriction: sp.shaft_friction,
        endBearing: sp.end_bearing,
        ultimateCapacity: sp.ultimate_capacity,
        designCapacity: sp.design_capacity,
        axialUtil: sp.axial_util,
        lateralCapacity: sp.lateral_capacity,
        lateralUtil: sp.lateral_util,
        momentCapacity: sp.moment_capacity,
        momentUtil: sp.moment_util,
        settlement: sp.settlement,
        groupCapacity: results.group_capacity,
        groupEfficiency: results.group_efficiency,
        governingUtil: results.governing_util,
        capShearCheck: results.cap_design.shear_check,
        capPunchingCheck: results.cap_design.punching_check,
        status: results.rating,
      },
      warnings,
      {
        projectName: formData.projectName || 'Pile Foundation Design',
        clientName: '',
        preparedBy: '',
      },
    );
    await downloadPDF(
      reportData as any,
      `PileFoundations_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  }, [formData, results, warnings]);

  // ─── DOCX Export ───
  const exportDOCX = useCallback(() => {
    if (!results) return;
    const sp = results.single_pile;
    generateDOCX({
      title: 'Pile Foundation Design',
      subtitle: 'EN 1997-1 Compliant',
      projectInfo: [
        { label: 'Pile Type', value: formData.pile_type },
        { label: 'Concrete Grade', value: formData.concrete_grade },
      ],
      inputs: [
        { label: 'Pile Diameter', value: formData.pile_diameter, unit: 'm' },
        { label: 'Pile Length', value: formData.pile_length, unit: 'm' },
        { label: 'Number of Piles', value: formData.pile_count, unit: '' },
        { label: 'Vertical Load', value: formData.load_vertical, unit: 'kN' },
        { label: 'Horizontal Load', value: formData.load_horizontal, unit: 'kN' },
        { label: 'Moment Load', value: (formData as any).load_moment ?? '0', unit: 'kNm' },
        { label: 'Soil Type', value: (formData as any).soil_type ?? '', unit: '' },
        { label: 'Undrained Strength', value: (formData as any).cu ?? '0', unit: 'kPa' },
      ],
      checks: [
        {
          name: 'Axial Capacity',
          capacity: `${sp?.design_capacity?.toFixed(0) || '-'} kN`,
          utilisation: `${((sp?.axial_util || 0) * 100).toFixed(1)}%`,
          status: ((sp?.axial_util || 0) <= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Lateral Capacity',
          capacity: `${sp?.lateral_capacity?.toFixed(0) || '-'} kN`,
          utilisation: `${((sp?.lateral_util || 0) * 100).toFixed(1)}%`,
          status: ((sp?.lateral_util || 0) <= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Moment Capacity',
          capacity: `${sp?.moment_capacity?.toFixed(0) || '-'} kNm`,
          utilisation: `${((sp?.moment_util || 0) * 100).toFixed(1)}%`,
          status: ((sp?.moment_util || 0) <= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Settlement',
          capacity: `${sp?.settlement?.toFixed(1) || '-'} mm`,
          utilisation: `${results.rating}`,
          status: (results.rating === 'PASS' || results.rating === 'WARNING' ? 'PASS' : 'FAIL') as
            | 'PASS'
            | 'FAIL',
        },
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${(results.governing_util * 100).toFixed(1)}%`,
          status: (results.rating === 'FAIL' ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        { check: 'Axial', suggestion: 'Increase pile length or diameter if capacity insufficient' },
        { check: 'Settlement', suggestion: 'Consider pile group effects for settlement' },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Pile Foundation Design',
    });
  }, [formData, results, warnings]);

  // ─── Derived values ───
  const maxUtil = results ? results.governing_util * 100 : 0;
  const overallStatus = results
    ? results.governing_util > 1.0
      ? 'FAIL'
      : results.governing_util > 0.85
        ? 'WARNING'
        : 'PASS'
    : 'PASS';

  // ─── Auto-calculate on mount ───

  // ─── Debounced What-If recalc ───
  useEffect(() => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    calcTimerRef.current = setTimeout(runCalculation, 150);
    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [formData, runCalculation]);

  // ─── What-If sliders ───
  const whatIfSliders = [
    {
      key: 'pile_diameter' as keyof FormData,
      label: 'Pile Diameter',
      min: 0.3,
      max: 2.5,
      step: 0.05,
      unit: 'm',
    },
    {
      key: 'pile_length' as keyof FormData,
      label: 'Pile Length',
      min: 5,
      max: 60,
      step: 1,
      unit: 'm',
    },
    {
      key: 'pile_count' as keyof FormData,
      label: 'Pile Count',
      min: 1,
      max: 20,
      step: 1,
      unit: '',
    },
    {
      key: 'load_vertical' as keyof FormData,
      label: 'Vertical Load',
      min: 100,
      max: 30000,
      step: 100,
      unit: 'kN',
    },
  ];

  // ─── Camera Presets ───
  const cameraPresets = [
    { label: '3D View', icon: '🎯', pos: [12, 10, 12] as [number, number, number] },
    { label: 'Front', icon: '🔲', pos: [0, 6, 18] as [number, number, number] },
    { label: 'Side', icon: '📐', pos: [18, 6, 0] as [number, number, number] },
    { label: 'Top', icon: '🔽', pos: [0, 20, 0.1] as [number, number, number] },
    { label: 'Close', icon: '🔍', pos: [6, 4, 6] as [number, number, number] },
  ];

  // ─── Overall pass/fail ───
  const overallPass = useMemo(() => {
    if (!results) return true;
    return results.governing_util <= 1.0;
  }, [results]);

  // ─── 3D Scene helper with ErrorBoundary ───
  const render3DScene = (height: string) => (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-full bg-gray-950/50 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">3D preview unavailable</p>
        </div>
      }
    >
      <Interactive3DDiagram
        height={height}
        cameraPosition={cameraPos}
        status={results ? (results.governing_util > 1.0 ? 'FAIL' : 'PASS') : undefined}
      >
        <PileFoundations3D
          pileLength={parseFloat(formData.pile_length) || 15}
          pileDiameter={parseFloat(formData.pile_diameter) || 0.6}
          nPiles={parseInt(formData.pile_count) || 4}
          pileCapLength={parseFloat(formData.cap_width) || 3}
          pileCapWidth={parseFloat(formData.cap_width) || 3}
          pileCapDepth={parseFloat(formData.cap_thickness) || 1}
          columnLoad={parseFloat(formData.load_vertical) || 0}
          soilType={formData.soil_profile || 'clay'}
          status={results ? (results.governing_util > 1.0 ? 'FAIL' : 'PASS') : undefined}
        />
      </Interactive3DDiagram>
    </ErrorBoundary>
  );

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
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
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

  const UtilisationBar: React.FC<{ label: string; value: number; unit?: string }> = ({
    label,
    value,
    unit,
  }) => {
    const percent = Math.min(value * 100, 100);
    const color = value <= 0.7 ? 'bg-emerald-500' : value <= 1.0 ? 'bg-amber-500' : 'bg-red-500';

    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">{label}</span>
          <span
            className={cn('font-medium font-mono', value <= 1.0 ? 'text-white' : 'text-red-400')}
          >
            {(value * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn('h-full rounded-full', color)}
          />
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-32 pb-20">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-full glass border border-cyan-500/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiAnchor className="text-cyan-400" size={24} />
            <span className="text-white font-semibold">EN 1997-1 Deep Foundation Design</span>
          </motion.div>

          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
            Pile Foundations
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">EN 1997-1 pile foundation design</p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {['Deep Foundation', 'Group Analysis', 'Settlement', 'Cost Estimate', '3D Preview'].map(
              (badge) => (
                <span
                  key={badge}
                  className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium"
                >
                  {badge}
                </span>
              ),
            )}
          </div>

          {/* Preset Quick-Select */}
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => applyPreset(key)}
                className="px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-400 text-xs hover:text-cyan-400 hover:border-cyan-500/40 transition-all"
              >
                {preset.name}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Neon Pill Tab Navigation */}
        <div className="flex justify-center gap-3 mb-8">
          {(
            [
              { key: 'input', label: 'Design Input', icon: <FiLayers size={16} /> },
              { key: 'results', label: 'Results', icon: <FiTarget size={16} /> },
              { key: 'visualization', label: 'Visualization', icon: <FiEye size={16} /> },
            ] as const
          ).map((tab) => (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.key)}
              disabled={tab.key !== 'input' && !results}
              className={cn(
                'relative px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2 transition-all duration-300',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-gray-800/60 text-gray-400 border border-gray-700/40 hover:text-white hover:border-gray-500',
                tab.key !== 'input' && !results && 'opacity-50 cursor-not-allowed',
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'results' && results && (
                <span
                  className={cn(
                    'ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                    overallPass
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400',
                  )}
                >
                  {overallPass ? 'PASS' : 'FAIL'}
                </span>
              )}
            </motion.button>
          ))}
        </div>
        <AnimatePresence mode="wait">
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
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                          <FiZap className="w-5 h-5 text-neon-cyan" />
                        </motion.div>
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
                            className="border-gray-600 hover:border-cyan-500 hover:text-cyan-400"
                          >
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pile Properties */}
                  <CollapsibleSection
                    title="Pile Properties"
                    icon={
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiAnchor className="w-5 h-5 text-neon-cyan" />
                      </motion.div>
                    }
                    variant="cyan"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-200 mb-1">Pile Type</label>
                        <select
                          value={formData.pile_type}
                          onChange={(e) => updateForm('pile_type', e.target.value)}
                          title="Pile Type"
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                        >
                          {Object.entries(PILE_TYPES).map(([key, pt]) => (
                            <option key={key} value={key}>
                              {pt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField label="Pile Count" field="pile_count" />
                      <InputField label="Diameter" field="pile_diameter" unit="m" />
                      <InputField label="Length" field="pile_length" unit="m" />
                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-1">Concrete Grade</label>
                        <select
                          value={formData.concrete_grade}
                          onChange={(e) => updateForm('concrete_grade', e.target.value)}
                          title="Concrete Grade"
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                        >
                          {Object.entries(CONCRETE_GRADES).map(([key, cg]) => (
                            <option key={key} value={key}>
                              {cg.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField label="Rebar %" field="reinforcement_percent" unit="%" />
                    </div>
                  </CollapsibleSection>

                  {/* Loading */}
                  <CollapsibleSection
                    title="Applied Loads"
                    icon={
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiTrendingUp className="w-5 h-5 text-neon-cyan" />
                      </motion.div>
                    }
                    variant="blue"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <InputField label="Vertical Load" field="load_vertical" unit="kN" />
                      <InputField label="Horizontal Load" field="load_horizontal" unit="kN" />
                      <InputField label="Moment" field="moment" unit="kNm" />
                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-1">Load Case</label>
                        <select
                          value={formData.load_case}
                          onChange={(e) => updateForm('load_case', e.target.value)}
                          title="Load Case"
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                        >
                          <option value="ULS">ULS (Factored)</option>
                          <option value="SLS">SLS (Service)</option>
                          <option value="Accidental">Accidental</option>
                        </select>
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* Group Layout */}
                  <CollapsibleSection
                    title="Group Layout & Cap"
                    icon={
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiGrid className="w-5 h-5 text-neon-cyan" />
                      </motion.div>
                    }
                    variant="emerald"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-200 mb-1">Layout</label>
                        <select
                          value={formData.layout}
                          onChange={(e) => updateForm('layout', e.target.value)}
                          title="Layout"
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                        >
                          {Object.entries(LAYOUTS).map(([key, l]) => (
                            <option key={key} value={key}>
                              {l.name} (η={l.efficiency})
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField
                        label="Spacing"
                        field="spacing"
                        unit="m"
                        tooltip="Center-to-center"
                      />
                      <InputField label="Cap Thickness" field="cap_thickness" unit="m" />
                      <InputField label="Cap Width" field="cap_width" unit="m" />
                    </div>
                  </CollapsibleSection>

                  {/* Soil Profile */}
                  <CollapsibleSection
                    title="Soil Profile"
                    icon={
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiLayers className="w-5 h-5 text-neon-cyan" />
                      </motion.div>
                    }
                    variant="purple"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-200 mb-1">Soil Type</label>
                        <select
                          value={formData.soil_profile}
                          onChange={(e) => updateForm('soil_profile', e.target.value)}
                          title="Soil Type"
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                        >
                          {Object.entries(SOIL_PROFILES).map(([key, sp]) => (
                            <option key={key} value={key}>
                              {sp.name} - {sp.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputField
                        label="Cu (surface)"
                        field="cu_surface"
                        unit="kPa"
                        tooltip="Undrained shear strength"
                      />
                      <InputField label="Cu gradient" field="cu_gradient" unit="kPa/m" />
                      <InputField label="γ (Unit Weight)" field="gamma" unit="kN/m³" />
                      <InputField
                        label="Groundwater"
                        field="groundwater_depth"
                        unit="m"
                        tooltip="Depth below ground"
                      />
                    </div>
                  </CollapsibleSection>

                  {/* Factors */}
                  <CollapsibleSection
                    title="Partial Factors (DA1-1)"
                    icon={
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                        <FiSettings className="w-5 h-5 text-neon-cyan" />
                      </motion.div>
                    }
                    defaultOpen={false}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <InputField
                        label="γR,1 (Base)"
                        field="gamma_R1"
                        tooltip="EN 1997-1 Table A.6"
                      />
                      <InputField
                        label="γR,2 (Shaft)"
                        field="gamma_R2"
                        tooltip="EN 1997-1 Table A.6"
                      />
                      <InputField
                        label="γR,3 (Total)"
                        field="gamma_R3"
                        tooltip="EN 1997-1 Table A.7"
                      />
                    </div>
                  </CollapsibleSection>

                  {/* Calculate Button */}
                  <div className="flex justify-center pt-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={runCalculation}
                      disabled={isCalculating}
                      className="px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/40 transition-all duration-300 disabled:opacity-50"
                    >
                      {isCalculating ? 'CALCULATING...' : 'RUN FULL ANALYSIS'}
                    </motion.button>
                  </div>
                </div>

                {/* Right Column — 3D + What-If Explorer */}
                <div className="space-y-4">
                  <WhatIfPreview
                    title="Pile Group Layout"
                    renderScene={render3DScene}
                    sliders={whatIfSliders}
                    form={formData}
                    updateForm={updateForm}
                    status={results ? (results.governing_util > 1.0 ? 'FAIL' : 'PASS') : undefined}
                    utilisation={results ? results.governing_util * 100 : undefined}
                    liveReadout={results ? [
                      { label: 'Axial', value: results.single_pile.axial_util * 100 },
                      { label: 'Lateral', value: results.single_pile.lateral_util * 100 },
                      { label: 'Moment', value: results.single_pile.moment_util * 100 },
                      { label: 'Settle', value: (results.single_pile.settlement / 25) * 100 },
                    ] : undefined}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border-l-4 border-emerald-500 bg-gray-900/50 rounded-r-xl p-4 flex items-center gap-3">
                      <FiCheck className="text-emerald-400 w-6 h-6 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-gray-200">Design Capacity</div>
                        <div className="text-xl font-bold text-emerald-400">{results.single_pile.design_capacity.toFixed(0)} kN</div>
                      </div>
                    </div>
                    <div className="border-l-4 border-emerald-500 bg-gray-900/50 rounded-r-xl p-4 flex items-center gap-3">
                      <FiCheck className="text-emerald-400 w-6 h-6 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-gray-200">Group Capacity</div>
                        <div className="text-xl font-bold text-emerald-400">{results.group_capacity.toFixed(0)} kN</div>
                      </div>
                    </div>
                    <div className={cn("border-l-4 bg-gray-900/50 rounded-r-xl p-4 flex items-center gap-3", results.governing_util <= 1.0 ? "border-emerald-500" : "border-red-500")}>
                      <FiCheck className={cn("w-6 h-6 flex-shrink-0", results.governing_util <= 1.0 ? "text-emerald-400" : "text-red-400")} />
                      <div>
                        <div className="text-sm font-semibold text-gray-200">Governing Util.</div>
                        <div className={cn("text-xl font-bold", results.governing_util <= 1.0 ? "text-emerald-400" : "text-red-400")}>{(results.governing_util * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Single Pile Capacity */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                          <FiAnchor className="text-neon-cyan" size={20} />
                        </motion.div>
                        Single Pile Capacity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">Shaft Friction</div>
                          <div className="text-xl font-bold text-white">
                            {results.single_pile.shaft_friction.toFixed(0)}
                          </div>
                          <div className="text-gray-500 text-xs">kN</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">End Bearing</div>
                          <div className="text-xl font-bold text-white">
                            {results.single_pile.end_bearing.toFixed(0)}
                          </div>
                          <div className="text-gray-500 text-xs">kN</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">Ultimate</div>
                          <div className="text-xl font-bold text-cyan-400">
                            {results.single_pile.ultimate_capacity.toFixed(0)}
                          </div>
                          <div className="text-gray-500 text-xs">kN</div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">Design Capacity</div>
                          <div className="text-xl font-bold text-emerald-400">
                            {results.single_pile.design_capacity.toFixed(0)}
                          </div>
                          <div className="text-gray-500 text-xs">kN</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Group Results */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                          <FiGrid className="text-neon-cyan" size={20} />
                        </motion.div>
                        Pile Group Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">Group Capacity</div>
                          <div className="text-2xl font-bold text-blue-400">
                            {results.group_capacity.toFixed(0)}
                          </div>
                          <div className="text-gray-500 text-xs">kN (with efficiency)</div>
                        </div>
                        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
                          <div className="text-gray-400 text-sm">Group Efficiency</div>
                          <div className="text-2xl font-bold text-purple-400">
                            {(results.group_efficiency * 100).toFixed(0)}%
                          </div>
                          <div className="text-gray-500 text-xs">η factor</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <UtilisationBar
                          label="Axial Utilisation"
                          value={results.single_pile.axial_util}
                        />
                        <UtilisationBar
                          label="Lateral Utilisation"
                          value={results.single_pile.lateral_util}
                        />
                        <UtilisationBar
                          label="Moment Utilisation"
                          value={results.single_pile.moment_util}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Settlement & Cap */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardContent className="py-4">
                        <div className="text-gray-400 text-sm mb-1">Settlement</div>
                        <div className="text-2xl font-bold text-white">
                          {results.single_pile.settlement.toFixed(1)} mm
                        </div>
                        <div
                          className={cn(
                            'text-xs mt-1',
                            results.single_pile.settlement <= 25
                              ? 'text-emerald-400'
                              : 'text-red-400',
                          )}
                        >
                          {results.single_pile.settlement <= 25
                            ? '✓ Within 25mm limit'
                            : '✗ Exceeds 25mm limit'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardContent className="py-4">
                        <div className="text-gray-400 text-sm mb-1">Pile Cap Check</div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Shear:</span>
                          <span
                            className={
                              results.cap_design.shear_check <= 1
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          >
                            {(results.cap_design.shear_check * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Punching:</span>
                          <span
                            className={
                              results.cap_design.punching_check <= 1
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          >
                            {(results.cap_design.punching_check * 100).toFixed(0)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cost Estimate */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                          <span className="text-neon-cyan font-bold text-lg">£</span>
                        </motion.div>
                        Cost Estimate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-gray-400 text-xs">Piling</div>
                          <div className="font-bold text-white">
                            £{(results.cost_estimate.piling / 1000).toFixed(0)}k
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs">Reinforcement</div>
                          <div className="font-bold text-white">
                            £{(results.cost_estimate.reinforcement / 1000).toFixed(0)}k
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs">Pile Cap</div>
                          <div className="font-bold text-white">
                            £{(results.cost_estimate.pile_cap / 1000).toFixed(0)}k
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs">Total</div>
                          <div className="font-bold text-cyan-400">
                            £{(results.cost_estimate.total / 1000).toFixed(0)}k
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-4 sticky top-32 self-start">
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
                        Governing Utilisation: {(results.governing_util * 100).toFixed(1)}%
                      </div>
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

                  {/* Quick Summary */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                          <FiLayers className="text-neon-cyan" size={20} />
                        </motion.div>
                        Design Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pile Type</span>
                        <span className="text-white">
                          {PILE_TYPES[formData.pile_type as keyof typeof PILE_TYPES]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Configuration</span>
                        <span className="text-white">
                          {formData.pile_count} × Ø{formData.pile_diameter}m ×{' '}
                          {formData.pile_length}m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Soil Profile</span>
                        <span className="text-white">
                          {SOIL_PROFILES[formData.soil_profile as keyof typeof SOIL_PROFILES]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Applied Load</span>
                        <span className="text-cyan-400">{formData.load_vertical} kN</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Group Capacity</span>
                        <span className="text-emerald-400">
                          {results.group_capacity.toFixed(0)} kN
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Utilisation Dashboard */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl text-white flex items-center space-x-3">
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center">
                      <FiActivity className="text-neon-cyan" size={20} />
                    </motion.div>
                    Utilisation Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { label: 'Axial', value: results.single_pile.axial_util, color: 'cyan' },
                      { label: 'Lateral', value: results.single_pile.lateral_util, color: 'blue' },
                      { label: 'Moment', value: results.single_pile.moment_util, color: 'purple' },
                      {
                        label: 'Settlement',
                        value: results.single_pile.settlement / 25,
                        color: 'emerald',
                      },
                    ].map((item) => {
                      const pct = Math.min(item.value * 100, 100);
                      const status =
                        item.value > 1 ? 'FAIL' : item.value > 0.85 ? 'WARNING' : 'PASS';
                      return (
                        <div key={item.label} className="text-center">
                          <div className="relative w-24 h-24 mx-auto mb-2">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="currentColor"
                                className="text-gray-700"
                                strokeWidth="8"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="currentColor"
                                className={
                                  status === 'FAIL'
                                    ? 'text-red-500'
                                    : status === 'WARNING'
                                      ? 'text-amber-500'
                                      : `text-${item.color}-500`
                                }
                                strokeWidth="8"
                                strokeDasharray={`${pct * 2.64} 264`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                className={cn(
                                  'text-lg font-bold',
                                  status === 'FAIL'
                                    ? 'text-red-400'
                                    : status === 'WARNING'
                                      ? 'text-amber-400'
                                      : 'text-white',
                                )}
                              >
                                {(item.value * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* SVG Diagrams Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pile Cross Section */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pile Cross Section</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 200" className="w-full h-48">
                      <circle
                        cx="100"
                        cy="100"
                        r="70"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="55"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="4 2"
                      />
                      {Array.from({
                        length: Math.max(
                          6,
                          Math.round(parseFloat(formData.reinforcement_percent) * 2),
                        ),
                      }).map((_, i, arr) => {
                        const angle = (2 * Math.PI * i) / arr.length;
                        return (
                          <circle
                            key={i}
                            cx={100 + 55 * Math.cos(angle)}
                            cy={100 + 55 * Math.sin(angle)}
                            r="4"
                            fill="#60a5fa"
                          />
                        );
                      })}
                      <text
                        x="100"
                        y="100"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#f59e0b"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        Ø{formData.pile_diameter}m
                      </text>
                      <text x="100" y="185" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        {formData.concrete_grade.toUpperCase()} — {formData.reinforcement_percent}%
                        rebar
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Capacity Breakdown */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Capacity Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {(() => {
                        const total = results.single_pile.ultimate_capacity || 1;
                        const shaftPct = (results.single_pile.shaft_friction / total) * 140;
                        const basePct = (results.single_pile.end_bearing / total) * 140;
                        return (
                          <>
                            <rect
                              x="30"
                              y="10"
                              width="40"
                              height={shaftPct}
                              fill="#f59e0b"
                              rx="3"
                              opacity="0.8"
                            />
                            <rect
                              x="30"
                              y={10 + shaftPct}
                              width="40"
                              height={basePct}
                              fill="#3b82f6"
                              rx="3"
                              opacity="0.8"
                            />
                            <text
                              x="50"
                              y={10 + shaftPct / 2}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="9"
                              fontWeight="bold"
                            >
                              {results.single_pile.shaft_friction.toFixed(0)}
                            </text>
                            <text
                              x="50"
                              y={10 + shaftPct + basePct / 2}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="9"
                              fontWeight="bold"
                            >
                              {results.single_pile.end_bearing.toFixed(0)}
                            </text>
                            <line
                              x1="85"
                              y1="25"
                              x2="120"
                              y2="25"
                              stroke="#f59e0b"
                              strokeWidth="2"
                            />
                            <text x="125" y="28" fill="#f59e0b" fontSize="10">
                              Shaft (
                              {((results.single_pile.shaft_friction / total) * 100).toFixed(0)}%)
                            </text>
                            <line
                              x1="85"
                              y1="50"
                              x2="120"
                              y2="50"
                              stroke="#3b82f6"
                              strokeWidth="2"
                            />
                            <text x="125" y="53" fill="#3b82f6" fontSize="10">
                              Base ({((results.single_pile.end_bearing / total) * 100).toFixed(0)}%)
                            </text>
                            <text x="100" y="170" textAnchor="middle" fill="#94a3b8" fontSize="10">
                              Ultimate: {total.toFixed(0)} kN | Design:{' '}
                              {results.single_pile.design_capacity.toFixed(0)} kN
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </CardContent>
                </Card>

                {/* Load Distribution */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Load Path</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {/* Column load arrow */}
                      <line
                        x1="100"
                        y1="10"
                        x2="100"
                        y2="35"
                        stroke="#ef4444"
                        strokeWidth="3"
                        markerEnd="url(#arrowRed)"
                      />
                      <defs>
                        <marker
                          id="arrowRed"
                          markerWidth="8"
                          markerHeight="6"
                          refX="8"
                          refY="3"
                          orient="auto"
                        >
                          <path d="M0,0 L8,3 L0,6" fill="#ef4444" />
                        </marker>
                      </defs>
                      <text x="100" y="8" textAnchor="middle" fill="#ef4444" fontSize="9">
                        {formData.load_vertical} kN
                      </text>
                      {/* Pile cap */}
                      <rect
                        x="25"
                        y="35"
                        width="150"
                        height="20"
                        fill="#475569"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        rx="2"
                      />
                      <text x="100" y="48" textAnchor="middle" fill="white" fontSize="8">
                        Pile Cap
                      </text>
                      {/* Piles */}
                      {Array.from({ length: Math.min(parseInt(formData.pile_count) || 4, 6) }).map(
                        (_, i, arr) => {
                          const x = 40 + (i * 120) / Math.max(arr.length - 1, 1);
                          const pileLoad = parseFloat(formData.load_vertical) / arr.length;
                          return (
                            <g key={i}>
                              <rect
                                x={x - 6}
                                y="55"
                                width="12"
                                height="80"
                                fill="#f59e0b"
                                opacity="0.7"
                                rx="2"
                              />
                              <text
                                x={x}
                                y="95"
                                textAnchor="middle"
                                fill="white"
                                fontSize="7"
                                transform={`rotate(-90,${x},95)`}
                              >
                                {pileLoad.toFixed(0)} kN
                              </text>
                              {/* Soil arrows */}
                              <line
                                x1={x - 14}
                                y1="75"
                                x2={x - 7}
                                y2="75"
                                stroke="#10b981"
                                strokeWidth="1"
                              />
                              <line
                                x1={x - 14}
                                y1="90"
                                x2={x - 7}
                                y2="90"
                                stroke="#10b981"
                                strokeWidth="1"
                              />
                              <line
                                x1={x - 14}
                                y1="105"
                                x2={x - 7}
                                y2="105"
                                stroke="#10b981"
                                strokeWidth="1"
                              />
                              <line
                                x1={x - 14}
                                y1="120"
                                x2={x - 7}
                                y2="120"
                                stroke="#10b981"
                                strokeWidth="1"
                              />
                            </g>
                          );
                        },
                      )}
                      {/* Soil hatching */}
                      <line
                        x1="15"
                        y1="55"
                        x2="185"
                        y2="55"
                        stroke="#10b981"
                        strokeWidth="0.5"
                        strokeDasharray="6 3"
                      />
                      <text x="10" y="150" fill="#10b981" fontSize="8">
                        {(SOIL_PROFILES as any)[formData.soil_profile]?.name || 'Soil'}
                      </text>
                      <text x="100" y="170" textAnchor="middle" fill="#94a3b8" fontSize="9">
                        η = {results.group_efficiency.toFixed(2)} | Group:{' '}
                        {results.group_capacity.toFixed(0)} kN
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Soil Profile */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Soil Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {/* Ground line */}
                      <line x1="10" y1="20" x2="190" y2="20" stroke="#10b981" strokeWidth="2" />
                      <text x="15" y="15" fill="#10b981" fontSize="9">
                        GL
                      </text>
                      {/* Soil layers */}
                      <rect
                        x="10"
                        y="20"
                        width="80"
                        height="130"
                        fill="#92400e"
                        opacity="0.3"
                        stroke="#92400e"
                        strokeWidth="0.5"
                      />
                      <text x="50" y="50" textAnchor="middle" fill="#d97706" fontSize="9">
                        {(SOIL_PROFILES as any)[formData.soil_profile]?.name}
                      </text>
                      <text x="50" y="65" textAnchor="middle" fill="#94a3b8" fontSize="8">
                        cu={formData.cu_surface} kPa
                      </text>
                      <text x="50" y="78" textAnchor="middle" fill="#94a3b8" fontSize="8">
                        γ={formData.gamma} kN/m³
                      </text>
                      {/* Pile */}
                      <rect
                        x="110"
                        y="20"
                        width="16"
                        height={Math.min(parseFloat(formData.pile_length) * 8, 130)}
                        fill="#f59e0b"
                        opacity="0.7"
                        rx="2"
                      />
                      <text
                        x="118"
                        y={20 + Math.min(parseFloat(formData.pile_length) * 4, 65)}
                        textAnchor="middle"
                        fill="white"
                        fontSize="8"
                        transform={`rotate(-90,118,${20 + Math.min(parseFloat(formData.pile_length) * 4, 65)})`}
                      >
                        {formData.pile_length}m
                      </text>
                      {/* GWT */}
                      {parseFloat(formData.groundwater_depth) <
                        parseFloat(formData.pile_length) && (
                        <>
                          <line
                            x1="10"
                            y1={20 + parseFloat(formData.groundwater_depth) * 8}
                            x2="190"
                            y2={20 + parseFloat(formData.groundwater_depth) * 8}
                            stroke="#38bdf8"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                          />
                          <text
                            x="155"
                            y={17 + parseFloat(formData.groundwater_depth) * 8}
                            fill="#38bdf8"
                            fontSize="8"
                          >
                            GWT {formData.groundwater_depth}m
                          </text>
                        </>
                      )}
                      <text x="100" y="170" textAnchor="middle" fill="#94a3b8" fontSize="9">
                        Settlement: {results.single_pile.settlement.toFixed(1)}mm
                      </text>
                    </svg>
                  </CardContent>
                </Card>
              </div>

              {/* 3D Interactive View */}
              <Card variant="glass" className="border-cyan-500/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FiEye className="text-cyan-400" /> 3D Pile Group View
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {cameraPresets.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setCameraPos(preset.pos)}
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium transition-all',
                            JSON.stringify(cameraPos) === JSON.stringify(preset.pos)
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                              : 'bg-gray-800/60 text-gray-400 border border-gray-700 hover:text-white',
                          )}
                        >
                          {preset.icon} {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>{render3DScene('h-[500px]')}</CardContent>
              </Card>

              {/* Design Summary */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Design Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block">Pile Type</span>
                      <span className="text-white font-medium">
                        {PILE_TYPES[formData.pile_type as keyof typeof PILE_TYPES]?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Configuration</span>
                      <span className="text-white font-medium">
                        {formData.pile_count} × Ø{formData.pile_diameter}m × {formData.pile_length}m
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Group Capacity</span>
                      <span className="text-emerald-400 font-medium">
                        {results.group_capacity.toFixed(0)} kN
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Governing Util.</span>
                      <span
                        className={cn(
                          'font-medium',
                          results.governing_util > 1
                            ? 'text-red-400'
                            : results.governing_util > 0.85
                              ? 'text-amber-400'
                              : 'text-emerald-400',
                        )}
                      >
                        {(results.governing_util * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Settlement</span>
                      <span className="text-white font-medium">
                        {results.single_pile.settlement.toFixed(1)} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Cap Shear</span>
                      <span
                        className={cn(
                          'font-medium',
                          results.cap_design.shear_check > 1 ? 'text-red-400' : 'text-emerald-400',
                        )}
                      >
                        {(results.cap_design.shear_check * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Est. Cost</span>
                      <span className="text-cyan-400 font-medium">
                        £{(results.cost_estimate.total / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Status</span>
                      <span className="font-bold" style={{ color: results.ratingColor }}>
                        {results.rating}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default PileFoundations;
