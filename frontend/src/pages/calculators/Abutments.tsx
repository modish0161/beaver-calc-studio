import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiBox,
    FiCheck,
    FiDownload,
    FiEye,
    FiInfo,
    FiLayers,
    FiPlus,
    FiTarget,
    FiTrash2,
    FiTrendingUp,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import Abutment3D from '../../components/3d/scenes/Abutment3D';
import ErrorBoundary from '../../components/ErrorBoundary';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { CONCRETE_GRADES as _CONCRETE_LIB, REBAR_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
interface LoadCase {
  name: string;
  dead_load: string;
  live_load: string;
  wind_load: string;
  earthquake_load: string;
  temperature_load: string;
  braking_force: string;
}

interface FormData {
  bridgeType: string;
  spanLength: string;
  abutmentHeight: string;
  abutmentWidth: string;
  foundationType: string;
  soilType: string;
  bearingCapacity: string;
  concreteGrade: string;
  reinforcementGrade: string;
  loadCases: LoadCase[];
  includeWindLoads: boolean;
  includeEarthquakeLoads: boolean;
  includeTemperatureEffects: boolean;
  backfillHeight: string;
  backfillDensity: string;
  waterTableDepth: string;
  surchargePressure: string;
  seismicCoefficient: string;
  exposureClass: string;
}

const PRESETS = {
  highway_full_height: {
    name: 'Highway Full-Height Abutment',
    bridgeType: 'simply_supported',
    spanLength: '30',
    abutmentHeight: '8',
    abutmentWidth: '12',
    foundationType: 'spread_footing',
    soilType: 'sand',
    bearingCapacity: '200',
    concreteGrade: 'C35',
    reinforcementGrade: 'B500B',
    backfillHeight: '6.5',
    backfillDensity: '19',
    waterTableDepth: '12',
    surchargePressure: '10',
    seismicCoefficient: '0.08',
    exposureClass: 'XC3',
  },
  highway_integral: {
    name: 'Integral Highway Abutment',
    bridgeType: 'integral',
    spanLength: '25',
    abutmentHeight: '6',
    abutmentWidth: '10',
    foundationType: 'piled',
    soilType: 'clay',
    bearingCapacity: '120',
    concreteGrade: 'C32',
    reinforcementGrade: 'B500B',
    backfillHeight: '5',
    backfillDensity: '18',
    waterTableDepth: '8',
    surchargePressure: '10',
    seismicCoefficient: '0.08',
    exposureClass: 'XC2',
  },
  rail_bridge: {
    name: 'Rail Bridge Abutment',
    bridgeType: 'simply_supported',
    spanLength: '20',
    abutmentHeight: '7',
    abutmentWidth: '8',
    foundationType: 'spread_footing',
    soilType: 'gravel',
    bearingCapacity: '250',
    concreteGrade: 'C40',
    reinforcementGrade: 'B500B',
    backfillHeight: '5.5',
    backfillDensity: '20',
    waterTableDepth: '15',
    surchargePressure: '20',
    seismicCoefficient: '0.10',
    exposureClass: 'XC3',
  },
  bank_seat: {
    name: 'Bank Seat Abutment',
    bridgeType: 'simply_supported',
    spanLength: '15',
    abutmentHeight: '3',
    abutmentWidth: '6',
    foundationType: 'spread_footing',
    soilType: 'gravel',
    bearingCapacity: '300',
    concreteGrade: 'C30',
    reinforcementGrade: 'B500B',
    backfillHeight: '2',
    backfillDensity: '19',
    waterTableDepth: '10',
    surchargePressure: '5',
    seismicCoefficient: '0.05',
    exposureClass: 'XC2',
  },
  footbridge: {
    name: 'Footbridge Abutment',
    bridgeType: 'simply_supported',
    spanLength: '20',
    abutmentHeight: '4',
    abutmentWidth: '4',
    foundationType: 'spread_footing',
    soilType: 'sand',
    bearingCapacity: '150',
    concreteGrade: 'C30',
    reinforcementGrade: 'B500B',
    backfillHeight: '3',
    backfillDensity: '18',
    waterTableDepth: '8',
    surchargePressure: '5',
    seismicCoefficient: '0.05',
    exposureClass: 'XC2',
  },
  viaduct_abutment: {
    name: 'Viaduct End Abutment',
    bridgeType: 'continuous',
    spanLength: '40',
    abutmentHeight: '10',
    abutmentWidth: '14',
    foundationType: 'piled',
    soilType: 'clay',
    bearingCapacity: '100',
    concreteGrade: 'C40',
    reinforcementGrade: 'B500B',
    backfillHeight: '8',
    backfillDensity: '18',
    waterTableDepth: '6',
    surchargePressure: '15',
    seismicCoefficient: '0.12',
    exposureClass: 'XC3',
  },
};

const Abutments: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    bridgeType: 'simply_supported',
    spanLength: '30',
    abutmentHeight: '6',
    abutmentWidth: '8',
    foundationType: 'spread_footing',
    soilType: 'sand',
    bearingCapacity: '150',
    concreteGrade: 'C30',
    reinforcementGrade: 'B500B',
    loadCases: [
      {
        name: 'Dead Load + Live Load',
        dead_load: '500',
        live_load: '300',
        wind_load: '0',
        earthquake_load: '0',
        temperature_load: '0',
        braking_force: '50',
      },
    ],
    includeWindLoads: true,
    includeEarthquakeLoads: false,
    includeTemperatureEffects: true,
    backfillHeight: '4.5',
    backfillDensity: '18',
    waterTableDepth: '10',
    surchargePressure: '10',
    seismicCoefficient: '0.15',
    exposureClass: 'XC2',
  });

  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([12, 8, 12]);


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
          dead_load: '0',
          live_load: '0',
          wind_load: '0',
          earthquake_load: '0',
          temperature_load: '0',
          braking_force: '0',
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.spanLength || parseFloat(formData.spanLength) <= 0) {
      errors.spanLength = 'Span length must be greater than 0';
    }
    if (!formData.abutmentHeight || parseFloat(formData.abutmentHeight) <= 0) {
      errors.abutmentHeight = 'Abutment height must be greater than 0';
    }
    if (!formData.bearingCapacity || parseFloat(formData.bearingCapacity) <= 0) {
      errors.bearingCapacity = 'Bearing capacity must be greater than 0';
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

  // Get material properties
  const getMaterialProperties = () => {
    const concreteProps: Record<string, { fck: number; fcd: number; Ecm: number }> = {
      C20: { fck: _CONCRETE_LIB['C20/25'].fck, fcd: _CONCRETE_LIB['C20/25'].fcd, Ecm: _CONCRETE_LIB['C20/25'].Ecm * 1000 },
      C25: { fck: _CONCRETE_LIB['C25/30'].fck, fcd: _CONCRETE_LIB['C25/30'].fcd, Ecm: _CONCRETE_LIB['C25/30'].Ecm * 1000 },
      C30: { fck: _CONCRETE_LIB['C30/37'].fck, fcd: _CONCRETE_LIB['C30/37'].fcd, Ecm: _CONCRETE_LIB['C30/37'].Ecm * 1000 },
      C35: { fck: _CONCRETE_LIB['C35/45'].fck, fcd: _CONCRETE_LIB['C35/45'].fcd, Ecm: _CONCRETE_LIB['C35/45'].Ecm * 1000 },
      C40: { fck: _CONCRETE_LIB['C40/50'].fck, fcd: _CONCRETE_LIB['C40/50'].fcd, Ecm: _CONCRETE_LIB['C40/50'].Ecm * 1000 },
    };

    const steelProps: Record<string, { fyk: number; fyd: number; Es: number }> = {
      B500B: { fyk: REBAR_GRADES.B500B.fyk, fyd: REBAR_GRADES.B500B.fyd, Es: REBAR_GRADES.B500B.Es },
      B500A: { fyk: REBAR_GRADES.B500A.fyk, fyd: REBAR_GRADES.B500A.fyd, Es: REBAR_GRADES.B500A.Es },
    };

    const soilProps: Record<
      string,
      { phi: number; gamma: number; c: number; Ka: number; Kp: number }
    > = {
      clay: { phi: 0, gamma: 18, c: 50, Ka: 1.0, Kp: 1.0 },
      sand: { phi: 32, gamma: 18, c: 0, Ka: 0.307, Kp: 3.25 },
      gravel: { phi: 38, gamma: 19, c: 0, Ka: 0.238, Kp: 4.2 },
      rock: { phi: 45, gamma: 25, c: 100, Ka: 0.172, Kp: 5.83 },
    };

    return {
      concrete: concreteProps[formData.concreteGrade] || concreteProps['C30'],
      steel: steelProps[formData.reinforcementGrade] || steelProps['B500B'],
      soil: soilProps[formData.soilType] || soilProps['sand'],
    };
  };

  // Get recommendations for failed checks
  const getRecommendation = (checkType: string, utilisation: number, results: any): string => {
    const recommendations: Record<string, string> = {
      bearing_capacity:
        utilisation > 1.0
          ? `Foundation bearing pressure exceeds soil capacity. Consider: increasing foundation width to ${(results.foundation_dimensions.width_m * Math.sqrt(utilisation) * 1.1).toFixed(1)}m, improving soil bearing capacity with ground improvement, or using pile foundation.`
          : utilisation > 0.8
            ? `Bearing capacity utilisation is high (${(utilisation * 100).toFixed(1)}%). Consider increasing foundation width by 10-15% for additional safety margin.`
            : `Bearing capacity check satisfactory. Current design provides adequate safety margin.`,

      sliding_stability:
        utilisation > 1.0
          ? `Sliding resistance insufficient. Consider: increasing foundation width to ${(results.foundation_dimensions.width_m * utilisation * 1.2).toFixed(1)}m, adding shear keys (increase passive resistance by 40-60%), or improving base friction with roughened surface.`
          : utilisation > 0.7
            ? `Sliding safety factor below 1.5. Recommend adding shear key with depth of ${(results.foundation_dimensions.depth_m * 0.3).toFixed(2)}m to increase passive resistance.`
            : `Sliding stability satisfactory. Design meets Eurocode 7 requirements.`,

      overturning_stability:
        utilisation > 1.0
          ? `Overturning moment exceeds resisting moment. Increase foundation width to ${(results.foundation_dimensions.width_m * utilisation * 1.3).toFixed(1)}m or increase abutment base thickness to shift center of gravity.`
          : utilisation > 0.6
            ? `Overturning safety factor below 2.0. Consider increasing foundation width by 15-20% or adding counterweight to heel.`
            : `Overturning stability excellent. Design provides good factor of safety.`,

      settlement:
        utilisation > 1.0
          ? `Estimated settlement exceeds allowable limits. Consider: pile foundation to transfer loads to deeper, stronger strata, or ground improvement (stone columns, vibro-compaction) to reduce settlement.`
          : utilisation > 0.8
            ? `Settlement is approaching limit. Monitor settlement during construction and consider ground improvement if soil conditions are variable.`
            : `Settlement within acceptable limits for bridge structures.`,

      stem_bending:
        utilisation > 1.0
          ? `Stem bending capacity insufficient. Increase stem thickness to ${(results.abutment_design.stem_thickness_m * utilisation * 1.1).toFixed(2)}m or add more reinforcement: ${Math.ceil(results.reinforcement[0].number_of_bars * utilisation * 1.2)} bars of ${results.reinforcement[0].bar_diameter_mm}mm diameter.`
          : utilisation > 0.85
            ? `Stem bending utilisation high. Consider increasing reinforcement by 10% or using higher grade concrete (next grade up from ${formData.concreteGrade}).`
            : `Stem bending design adequate per EN 1992-1-1.`,

      base_bending:
        utilisation > 1.0
          ? `Base slab bending capacity insufficient. Increase base thickness to ${(results.abutment_design.base_thickness_m * utilisation * 1.1).toFixed(2)}m or increase reinforcement to ${Math.ceil(results.reinforcement[1].area_required_mm2 * utilisation * 1.15)}mm².`
          : utilisation > 0.85
            ? `Base slab bending utilisation high. Recommend increasing thickness by 100-150mm or adding additional reinforcement layer.`
            : `Base slab bending design satisfactory.`,

      crack_control:
        utilisation > 0.003
          ? `Crack width exceeds 0.3mm limit for moderate exposure. Reduce bar spacing to ${Math.floor(results.reinforcement[0].bar_spacing_mm * 0.7)}mm or use smaller diameter bars at closer spacing to improve crack distribution.`
          : utilisation > 0.002
            ? `Crack width approaching limit. Consider reducing bar spacing by 20% or adding secondary reinforcement.`
            : `Crack control satisfactory per EN 1992-1-1 clause 7.3.`,
    };

    return recommendations[checkType] || 'No specific recommendations for this check.';
  };

  const calculateResults = async () => {
    if (!validateForm()) return;

    setIsCalculating(true);

    // Simulate calculation delay
    setTimeout(() => {
      // Get material properties
      const materials = getMaterialProperties();
      const { concrete, steel, soil } = materials;

      // Parse input values
      const L = parseFloat(formData.spanLength);
      const H = parseFloat(formData.abutmentHeight);
      const B_abutment = parseFloat(formData.abutmentWidth);
      const H_backfill = parseFloat(formData.backfillHeight);
      const gamma_soil = parseFloat(formData.backfillDensity);
      const q_a = parseFloat(formData.bearingCapacity);
      const water_table_depth = parseFloat(formData.waterTableDepth);
      const surcharge = parseFloat(formData.surchargePressure);
      const ag = parseFloat(formData.seismicCoefficient);

      // Load combination per EN 1990
      let maxVerticalLoad = 0;
      let maxHorizontalLoad = 0;
      let maxMoment = 0;

      formData.loadCases.forEach((lc) => {
        const DL = parseFloat(lc.dead_load) || 0;
        const LL = parseFloat(lc.live_load) || 0;
        const WL = parseFloat(lc.wind_load) || 0;
        const EQ = parseFloat(lc.earthquake_load) || 0;
        const BF = parseFloat(lc.braking_force) || 0;

        // ULS Combination: 1.35 DL + 1.5 LL + 1.5 WL (EN 1990)
        const V_ULS = 1.35 * DL + 1.5 * LL;
        const H_ULS = 1.5 * WL + 1.0 * BF + 1.0 * EQ;

        if (V_ULS > maxVerticalLoad) maxVerticalLoad = V_ULS;
        if (H_ULS > maxHorizontalLoad) maxHorizontalLoad = H_ULS;
      });

      // Earth pressure calculations (Rankine theory - EN 1997-1)
      const Ka = soil.Ka;
      const Kp = soil.Kp;

      // Active earth pressure with surcharge
      const Pa_soil = 0.5 * Ka * gamma_soil * Math.pow(H_backfill, 2); // kN/m
      const Pa_surcharge = Ka * surcharge * H_backfill; // Additional pressure from surcharge
      const Pa = Pa_soil + Pa_surcharge; // Total active pressure
      const Pa_y = H_backfill / 3; // Location of resultant (from bottom)

      // Water pressure if water table is high
      const gamma_water = 10; // kN/m³
      const h_water = Math.max(0, H_backfill - water_table_depth);
      const Pw = h_water > 0 ? 0.5 * gamma_water * Math.pow(h_water, 2) : 0; // Water pressure

      // Passive earth pressure (assuming embedment depth)
      const d_embed = 1.5; // m (typical embedment)
      const Pp = 0.5 * Kp * gamma_soil * Math.pow(d_embed, 2); // kN/m

      // Foundation design (simplified)
      const B_foundation = B_abutment + 2.5; // Foundation width > abutment width
      const L_foundation = B_abutment; // Foundation length
      const D_foundation = Math.max(1.5, H / 4); // Foundation depth
      const A_foundation = B_foundation * L_foundation; // Foundation area

      // Self-weight of abutment and foundation
      const gamma_concrete = 25; // kN/m³
      const t_stem = Math.max(0.4, H / 12); // Stem thickness (H/12 min)
      const t_base = Math.max(0.6, H / 10); // Base thickness

      const V_stem = t_stem * H * L_foundation; // Stem volume
      const V_base = t_base * B_foundation * L_foundation; // Base volume
      const V_foundation_total = V_stem + V_base;

      const W_stem = V_stem * gamma_concrete;
      const W_base = V_base * gamma_concrete;
      const W_soil_on_heel =
        gamma_soil * (B_foundation - B_abutment / 2 - t_stem) * H_backfill * L_foundation;

      // Seismic horizontal force (EN 1998-5)
      const seismic_force = formData.includeEarthquakeLoads ? ag * (W_stem + W_base) * 0.5 : 0;

      // Total horizontal forces
      const H_total = maxHorizontalLoad + Pa + Pw + seismic_force;

      // Total vertical load
      const V_total = maxVerticalLoad + W_stem + W_base + W_soil_on_heel;

      // Bearing capacity check (EN 1997-1)
      const q_applied = V_total / A_foundation; // Applied bearing pressure
      const bearing_utilisation = q_applied / q_a;
      const bearing_status = bearing_utilisation <= 1.0 ? 'PASS' : 'FAIL';

      // Sliding stability (EN 1997-1, DA1-C2: partial factors)
      const mu = 0.45; // Friction coefficient (typical for concrete on soil)
      const R_sliding = mu * V_total + Pp; // Sliding resistance
      const sliding_safety_factor = R_sliding / H_total;
      const sliding_utilisation = H_total / R_sliding;
      const sliding_status =
        sliding_safety_factor >= 1.5
          ? 'STABLE'
          : sliding_safety_factor >= 1.25
            ? 'WARNING'
            : 'UNSTABLE';

      // Overturning stability
      const x_stem = B_abutment / 2 - t_stem / 2; // Distance to toe
      const x_base = B_foundation / 2; // Distance to toe
      const x_soil = B_abutment / 2 + t_stem + (B_foundation - B_abutment / 2 - t_stem) / 2;
      const x_superload = B_abutment / 2;

      const M_resisting =
        W_stem * x_stem + W_base * x_base + W_soil_on_heel * x_soil + maxVerticalLoad * x_superload;
      const M_overturning = H_total * (H / 2) + Pa * Pa_y;

      const overturning_safety_factor = M_resisting / M_overturning;
      const overturning_utilisation = M_overturning / M_resisting;
      const overturning_status =
        overturning_safety_factor >= 2.0
          ? 'STABLE'
          : overturning_safety_factor >= 1.5
            ? 'WARNING'
            : 'UNSTABLE';

      // Settlement check (simplified Terzaghi)
      const E_soil =
        formData.soilType === 'rock'
          ? 50000
          : formData.soilType === 'gravel'
            ? 30000
            : formData.soilType === 'sand'
              ? 20000
              : 10000; // kPa
      const settlement_immediate = ((q_applied * B_foundation * (1 - 0.3 * 0.3)) / E_soil) * 1000; // mm
      const settlement_allowable = 50; // mm (typical for bridge abutments)
      const settlement_utilisation = settlement_immediate / settlement_allowable;
      const settlement_status = settlement_utilisation <= 1.0 ? 'PASS' : 'FAIL';

      // Reinforcement design for stem (EN 1992-1-1)
      const M_stem = Pa * Pa_y; // Bending moment at base of stem
      const d_stem = t_stem - 0.05 - 0.02; // Effective depth (50mm cover + 20mm bar)
      const K =
        (M_stem * 1000000) / (L_foundation * 1000 * Math.pow(d_stem * 1000, 2) * concrete.fcd); // K factor
      const z_stem = d_stem * (0.5 + Math.sqrt(0.25 - K / 1.134)); // Lever arm
      const As_stem_req = (M_stem * 1000000) / (z_stem * 1000 * steel.fyd); // mm²

      const bar_diameter_stem = 20; // mm
      const bar_area_stem = (Math.PI * Math.pow(bar_diameter_stem, 2)) / 4;
      const n_bars_stem = Math.ceil(As_stem_req / bar_area_stem);
      const spacing_stem = Math.floor((L_foundation * 1000) / n_bars_stem);
      const As_stem_prov = n_bars_stem * bar_area_stem;
      const stem_utilisation = As_stem_req / As_stem_prov;
      const stem_status = stem_utilisation <= 1.0 ? 'PASS' : 'FAIL';

      // Reinforcement design for base slab
      const M_base_toe = (q_applied * Math.pow(B_foundation / 4, 2)) / 2; // Simplified
      const d_base = t_base - 0.075 - 0.016;
      const K_base =
        (M_base_toe * 1000000) / (L_foundation * 1000 * Math.pow(d_base * 1000, 2) * concrete.fcd);
      const z_base = d_base * (0.5 + Math.sqrt(0.25 - K_base / 1.134));
      const As_base_req = (M_base_toe * 1000000) / (z_base * 1000 * steel.fyd);

      const bar_diameter_base = 16;
      const bar_area_base = (Math.PI * Math.pow(bar_diameter_base, 2)) / 4;
      const n_bars_base = Math.ceil(As_base_req / bar_area_base);
      const spacing_base = Math.floor((L_foundation * 1000) / n_bars_base);
      const As_base_prov = n_bars_base * bar_area_base;
      const base_utilisation = As_base_req / As_base_prov;
      const base_status = base_utilisation <= 1.0 ? 'PASS' : 'FAIL';

      // Crack control (EN 1992-1-1, Clause 7.3)
      const stress_s = steel.fyk * 0.8; // Service stress (80% of yield)
      const crack_width = 3.4 * (stress_s / steel.Es) * spacing_stem * 0.001; // Simplified formula
      const crack_limit = 0.3; // mm for moderate exposure
      const crack_utilisation = crack_width / crack_limit;
      const crack_status = crack_utilisation <= 1.0 ? 'PASS' : 'FAIL';

      // Cost Estimation
      const concrete_cost_per_m3 = 150; // £/m³ (typical UK prices)
      const steel_cost_per_kg = 1.2; // £/kg
      const excavation_cost_per_m3 = 25; // £/m³

      const total_steel_weight =
        (((As_stem_prov + As_base_prov * 2) / 1000000) * L_foundation * 7850) / 1000; // tonnes
      const excavation_volume = B_foundation * L_foundation * D_foundation;

      const concrete_cost = V_foundation_total * concrete_cost_per_m3;
      const steel_cost = total_steel_weight * 1000 * steel_cost_per_kg;
      const excavation_cost = excavation_volume * excavation_cost_per_m3;
      const total_cost = concrete_cost + steel_cost + excavation_cost;

      // Design efficiency metrics
      const concrete_utilisation_avg = (stem_utilisation + base_utilisation) / 2;
      const design_efficiency = 1 - Math.abs(0.85 - concrete_utilisation_avg); // Optimal around 85%

      // Optimisation suggestions
      const optimisation_suggestions = [];
      if (bearing_utilisation < 0.5) {
        optimisation_suggestions.push(
          `Foundation is oversized. Consider reducing width to ${(B_foundation * 0.85).toFixed(1)}m to save ${((B_foundation - B_foundation * 0.85) * L_foundation * D_foundation * concrete_cost_per_m3).toFixed(0)}£`,
        );
      }
      if (stem_utilisation < 0.6) {
        optimisation_suggestions.push(
          `Stem reinforcement is conservative. Consider reducing bar diameter or spacing`,
        );
      }
      if (sliding_safety_factor > 2.5) {
        optimisation_suggestions.push(
          `Sliding safety factor is very high (${sliding_safety_factor.toFixed(1)}). Foundation could be optimised`,
        );
      }
      if (overturning_safety_factor > 3.5) {
        optimisation_suggestions.push(
          `Overturning safety factor is very high (${overturning_safety_factor.toFixed(1)}). Consider reducing foundation width`,
        );
      }
      if (concrete_utilisation_avg > 0.9) {
        optimisation_suggestions.push(
          `Design is highly efficient but has minimal safety margin. Consider 10% increase in dimensions for robustness`,
        );
      }

      const mockResults = {
        analysis_summary: {
          bridge_type: formData.bridgeType,
          span_length: L,
          abutment_height: H,
          foundation_type: formData.foundationType,
          soil_type: formData.soilType,
          bearing_capacity: q_a,
          concrete_grade: formData.concreteGrade,
          steel_grade: formData.reinforcementGrade,
        },
        load_combinations: {
          ULS: {
            vertical_load_kN: maxVerticalLoad.toFixed(1),
            horizontal_load_kN: maxHorizontalLoad.toFixed(1),
            earth_pressure_kN: Pa.toFixed(1),
            total_vertical_kN: V_total.toFixed(1),
            total_horizontal_kN: H_total.toFixed(1),
          },
        },
        material_properties: {
          concrete: {
            grade: formData.concreteGrade,
            fck_MPa: concrete.fck,
            fcd_MPa: concrete.fcd.toFixed(1),
            Ecm_MPa: concrete.Ecm,
          },
          steel: {
            grade: formData.reinforcementGrade,
            fyk_MPa: steel.fyk,
            fyd_MPa: steel.fyd.toFixed(1),
          },
          soil: {
            type: formData.soilType,
            phi_deg: soil.phi,
            Ka: Ka.toFixed(3),
            Kp: Kp.toFixed(3),
            gamma_kN_m3: gamma_soil,
          },
        },
        foundation_dimensions: {
          length_m: parseFloat(L_foundation.toFixed(2)),
          width_m: parseFloat(B_foundation.toFixed(2)),
          depth_m: parseFloat(D_foundation.toFixed(2)),
          area_m2: parseFloat(A_foundation.toFixed(2)),
          volume_m3: parseFloat(V_foundation_total.toFixed(2)),
        },
        foundation_checks: [
          {
            check_type: 'bearing_capacity',
            description: 'Bearing pressure vs soil capacity (EN 1997-1)',
            demand: q_applied.toFixed(1),
            capacity: q_a.toFixed(1),
            utilisation: bearing_utilisation,
            status: bearing_status,
            unit: 'kPa',
          },
          {
            check_type: 'sliding_stability',
            description: 'Horizontal force vs sliding resistance (EN 1997-1)',
            demand: H_total.toFixed(1),
            capacity: R_sliding.toFixed(1),
            utilisation: sliding_utilisation,
            status: sliding_status,
            safety_factor: sliding_safety_factor.toFixed(2),
            unit: 'kN',
          },
          {
            check_type: 'overturning_stability',
            description: 'Overturning moment vs resisting moment (EN 1997-1)',
            demand: M_overturning.toFixed(1),
            capacity: M_resisting.toFixed(1),
            utilisation: overturning_utilisation,
            status: overturning_status,
            safety_factor: overturning_safety_factor.toFixed(2),
            unit: 'kNm',
          },
          {
            check_type: 'settlement',
            description: 'Immediate settlement vs allowable (Terzaghi)',
            demand: settlement_immediate.toFixed(1),
            capacity: settlement_allowable.toFixed(1),
            utilisation: settlement_utilisation,
            status: settlement_status,
            unit: 'mm',
          },
          {
            check_type: 'stem_bending',
            description: 'Stem reinforcement (EN 1992-1-1)',
            demand: As_stem_req.toFixed(0),
            capacity: As_stem_prov.toFixed(0),
            utilisation: stem_utilisation,
            status: stem_status,
            unit: 'mm²',
          },
          {
            check_type: 'base_bending',
            description: 'Base slab reinforcement (EN 1992-1-1)',
            demand: As_base_req.toFixed(0),
            capacity: As_base_prov.toFixed(0),
            utilisation: base_utilisation,
            status: base_status,
            unit: 'mm²',
          },
          {
            check_type: 'crack_control',
            description: 'Crack width control (EN 1992-1-1, Cl. 7.3)',
            demand: crack_width.toFixed(3),
            capacity: crack_limit.toFixed(3),
            utilisation: crack_utilisation,
            status: crack_status,
            unit: 'mm',
          },
        ],
        abutment_design: {
          stem_thickness_m: t_stem.toFixed(3),
          base_thickness_m: t_base.toFixed(3),
          concrete_volume_m3: V_foundation_total.toFixed(2),
          material: formData.concreteGrade,
          stem_weight_kN: W_stem.toFixed(1),
          base_weight_kN: W_base.toFixed(1),
        },
        reinforcement: [
          {
            location: 'stem',
            direction: 'longitudinal',
            area_required_mm2: As_stem_req.toFixed(0),
            area_provided_mm2: As_stem_prov.toFixed(0),
            bar_diameter_mm: bar_diameter_stem,
            bar_spacing_mm: spacing_stem,
            number_of_bars: n_bars_stem,
            utilisation: stem_utilisation,
            status: stem_status,
          },
          {
            location: 'base_toe',
            direction: 'longitudinal',
            area_required_mm2: As_base_req.toFixed(0),
            area_provided_mm2: As_base_prov.toFixed(0),
            bar_diameter_mm: bar_diameter_base,
            bar_spacing_mm: spacing_base,
            number_of_bars: n_bars_base,
            utilisation: base_utilisation,
            status: base_status,
          },
          {
            location: 'base_heel',
            direction: 'longitudinal',
            area_required_mm2: (As_base_req * 0.8).toFixed(0),
            area_provided_mm2: (As_base_prov * 0.8).toFixed(0),
            bar_diameter_mm: bar_diameter_base,
            bar_spacing_mm: spacing_base,
            number_of_bars: Math.ceil(n_bars_base * 0.8),
            utilisation: base_utilisation * 0.8,
            status: 'PASS',
          },
        ],
        stability_analysis: {
          active_earth_pressure_kN: Pa.toFixed(1),
          passive_earth_pressure_kN: Pp.toFixed(1),
          sliding_safety_factor: sliding_safety_factor.toFixed(2),
          overturning_safety_factor: overturning_safety_factor.toFixed(2),
          sliding_status,
          overturning_status,
          backfill_pressure_kPa: (Ka * gamma_soil * H_backfill).toFixed(1),
          lateral_earth_coefficient_Ka: Ka.toFixed(3),
          passive_earth_coefficient_Kp: Kp.toFixed(3),
        },
        settlement_analysis: {
          immediate_settlement_mm: settlement_immediate.toFixed(1),
          allowable_settlement_mm: settlement_allowable.toFixed(1),
          settlement_ratio: settlement_utilisation.toFixed(3),
          status: settlement_status,
        },
        cost_estimate: {
          concrete_volume_m3: V_foundation_total.toFixed(2),
          concrete_cost_gbp: concrete_cost.toFixed(0),
          steel_weight_tonnes: total_steel_weight.toFixed(2),
          steel_cost_gbp: steel_cost.toFixed(0),
          excavation_volume_m3: excavation_volume.toFixed(2),
          excavation_cost_gbp: excavation_cost.toFixed(0),
          total_cost_gbp: total_cost.toFixed(0),
          cost_per_linear_meter: (total_cost / L_foundation).toFixed(0),
        },
        design_metrics: {
          design_efficiency: (design_efficiency * 100).toFixed(1),
          average_utilisation: (concrete_utilisation_avg * 100).toFixed(1),
          safety_margin: ((1 - concrete_utilisation_avg) * 100).toFixed(1),
          water_pressure_kN: Pw.toFixed(1),
          seismic_force_kN: seismic_force.toFixed(1),
          surcharge_effect_kN: Pa_surcharge.toFixed(1),
        },
        optimisation_suggestions,
        material_quantities: {
          concrete_m3: V_foundation_total.toFixed(2),
          reinforcement_kg: (total_steel_weight * 1000).toFixed(0),
          excavation_m3: excavation_volume.toFixed(2),
          formwork_m2: (
            2 * (t_stem * H + B_foundation * L_foundation) +
            2 * H * L_foundation
          ).toFixed(1),
          backfill_m3: (
            (B_foundation - B_abutment / 2 - t_stem) *
            H_backfill *
            L_foundation
          ).toFixed(1),
        },
        recommendations: [
          bearing_utilisation > 0.8
            ? 'Consider increasing foundation width for additional bearing capacity margin'
            : null,
          sliding_safety_factor < 1.5
            ? 'Sliding safety factor below recommended 1.5 - add shear key'
            : null,
          overturning_safety_factor < 2.0
            ? 'Overturning safety factor below recommended 2.0 - increase foundation width'
            : null,
          crack_utilisation > 0.8 ? 'Reduce bar spacing for better crack control' : null,
          'Consider drainage system behind abutment to reduce earth pressures',
          'Waterproofing membrane recommended on backfill side',
          settlement_utilisation > 0.7 ? 'Monitor settlement during and after construction' : null,
        ].filter(Boolean),
        warnings: [
          bearing_status === 'FAIL'
            ? '⚠ Bearing capacity exceeded - foundation redesign required'
            : null,
          sliding_status === 'UNSTABLE'
            ? '⚠ Sliding stability insufficient - add shear key or increase width'
            : null,
          overturning_status === 'UNSTABLE'
            ? '⚠ Overturning stability insufficient - increase foundation width'
            : null,
          stem_status === 'FAIL' ? '⚠ Stem reinforcement insufficient' : null,
          base_status === 'FAIL' ? '⚠ Base reinforcement insufficient' : null,
        ].filter(Boolean),
        notes: [
          'Calculations based on EN 1992-1-1 (Eurocode 2) for concrete design',
          'Geotechnical design per EN 1997-1 (Eurocode 7)',
          'Earth pressures calculated using Rankine theory with Ka and Kp coefficients',
          'Load combinations per EN 1990 (ULS: 1.35 DL + 1.5 LL)',
          'Settlement analysis based on elastic theory (simplified)',
          `Foundation assumes spread footing on ${formData.soilType} with bearing capacity ${q_a} kPa`,
          'Detailed site investigation recommended to confirm soil parameters',
          'Seismic design per EN 1998-5 not included (set earthquake loads if required)',
        ],
      };

      setResults(mockResults);
      setWarnings((mockResults.warnings || []) as string[]);
      setActiveTab('results');
      setIsCalculating(false);
    }, 2000);
  };

  // PDF Export Function
  // -----------------------------------------------------------------------------
  const exportToPDF = () => {
    if (!results) return;
    const fc = results.foundation_checks || [];
    const getCheck = (type: string) => fc.find((c: any) => c.check_type === type);
    const fmtCheck = (c: any) => ({
      name: c?.description || '-',
      capacity: c ? `${c.capacity} ${c.unit}` : '-',
      utilisation: c ? `${(c.utilisation * 100).toFixed(1)}%` : '-',
      status: (c?.status === 'PASS' || c?.status === 'STABLE' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
    });

    // Build recommendations from failed/high-utilisation checks
    const recommendations: { check: string; suggestion: string }[] = [];
    fc.forEach((c: any) => {
      if (c.status === 'FAIL' || c.status === 'UNSTABLE' || c.utilisation > 0.85) {
        const rec = getRecommendation(c.check_type, c.utilisation, results);
        recommendations.push({ check: c.description || c.check_type, suggestion: rec });
      }
    });
    if (results.recommendations) {
      results.recommendations.forEach((r: string) => {
        if (!recommendations.some((existing) => existing.suggestion === r)) {
          recommendations.push({ check: 'General', suggestion: r });
        }
      });
    }

    // Capture 3D diagram if available
    let diagramImage: string | undefined;
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) diagramImage = canvas.toDataURL('image/png');
    } catch {
      /* ignore */
    }

    generatePremiumPDF({
      title: 'Abutments Design',
      subtitle: `${formData.bridgeType} � EN 1992-1-1 / EN 1997-1 Compliant`,
      projectInfo: [
        { label: 'Project', value: 'Bridge Abutment Design' },
        { label: 'Reference', value: 'ABU-001' },
        { label: 'Design Code', value: 'EN 1992-1-1 / EN 1997-1' },
        { label: 'Assessment Method', value: 'Eurocode ULS & SLS Verification' },
      ],
      inputs: [
        { label: 'Bridge Type', value: formData.bridgeType },
        { label: 'Span Length', value: `${formData.spanLength} m` },
        { label: 'Abutment Height', value: `${formData.abutmentHeight} m` },
        { label: 'Abutment Width', value: `${formData.abutmentWidth} m` },
        { label: 'Foundation Type', value: formData.foundationType },
        { label: 'Backfill Density', value: `${formData.backfillDensity} kN/m�` },
        { label: 'Soil Type', value: formData.soilType },
        { label: 'Bearing Capacity', value: `${formData.bearingCapacity} kPa` },
        { label: 'Concrete Grade', value: formData.concreteGrade },
        { label: 'Rebar Grade', value: formData.reinforcementGrade },
        { label: 'Backfill Height', value: `${formData.backfillHeight} m` },
        { label: 'Water Table Depth', value: `${formData.waterTableDepth} m` },
        { label: 'Surcharge Pressure', value: `${formData.surchargePressure} kPa` },
        { label: 'Exposure Class', value: formData.exposureClass },
      ],
      sections: [
        {
          title: 'Stability Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: results.stability_analysis
            ? [
                [
                  'Active Earth Pressure',
                  results.stability_analysis.active_earth_pressure_kN,
                  'kN',
                ],
                [
                  'Passive Earth Pressure',
                  results.stability_analysis.passive_earth_pressure_kN,
                  'kN',
                ],
                ['Sliding Safety Factor', results.stability_analysis.sliding_safety_factor, '�'],
                [
                  'Overturning Safety Factor',
                  results.stability_analysis.overturning_safety_factor,
                  '�',
                ],
                ['Backfill Pressure', results.stability_analysis.backfill_pressure_kPa, 'kPa'],
                ['Ka Coefficient', results.stability_analysis.lateral_earth_coefficient_Ka, '�'],
                ['Kp Coefficient', results.stability_analysis.passive_earth_coefficient_Kp, '�'],
              ]
            : [],
        },
        ...(results.reinforcement && results.reinforcement.length > 0
          ? [
              {
                title: 'Reinforcement Schedule',
                head: [
                  [
                    'Location',
                    'As,req (mm�)',
                    'As,prov (mm�)',
                    'Bar � (mm)',
                    'Spacing (mm)',
                    'Utilisation',
                  ],
                ],
                body: results.reinforcement.map((r: any) => [
                  r.location,
                  r.area_required_mm2,
                  r.area_provided_mm2,
                  r.bar_diameter_mm,
                  r.bar_spacing_mm,
                  `${(r.utilisation * 100).toFixed(1)}%`,
                ]),
              },
            ]
          : []),
        ...(results.settlement_analysis
          ? [
              {
                title: 'Settlement Analysis',
                head: [['Parameter', 'Value', 'Unit']],
                body: [
                  [
                    'Immediate Settlement',
                    results.settlement_analysis.immediate_settlement_mm,
                    'mm',
                  ],
                  [
                    'Allowable Settlement',
                    results.settlement_analysis.allowable_settlement_mm,
                    'mm',
                  ],
                  ['Settlement Ratio', results.settlement_analysis.settlement_ratio, '�'],
                  ['Status', results.settlement_analysis.status, '�'],
                ],
              },
            ]
          : []),
        ...(results.cost_estimate
          ? [
              {
                title: 'Cost Estimate',
                head: [['Item', 'Quantity', 'Cost (�)']],
                body: [
                  [
                    'Concrete',
                    `${results.cost_estimate.concrete_volume_m3} m�`,
                    results.cost_estimate.concrete_cost_gbp,
                  ],
                  [
                    'Reinforcement',
                    `${results.cost_estimate.steel_weight_tonnes} t`,
                    results.cost_estimate.steel_cost_gbp,
                  ],
                  [
                    'Excavation',
                    `${results.cost_estimate.excavation_volume_m3} m�`,
                    results.cost_estimate.excavation_cost_gbp,
                  ],
                  ['Total', '�', results.cost_estimate.total_cost_gbp],
                ],
              },
            ]
          : []),
      ],
      checks: [
        fmtCheck(getCheck('bearing_capacity')),
        fmtCheck(getCheck('sliding_stability')),
        fmtCheck(getCheck('overturning_stability')),
        fmtCheck(getCheck('settlement')),
        fmtCheck(getCheck('stem_bending')),
        fmtCheck(getCheck('base_bending')),
        fmtCheck(getCheck('crack_control')),
      ],
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      diagramImage,
      footerNote: 'Beaver Bridges Ltd � Abutment Design per EN 1992-1-1 / EN 1997-1',
    });
  };

  // DOCX Export Function
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Abutments Design',
      subtitle: `${formData.bridgeType} — EN 1992-1-1 / EN 1997-1`,
      projectInfo: [
        { label: 'Project', value: 'Bridge Abutment Design' },
        { label: 'Reference', value: 'ABU-001' },
      ],
      inputs: [
        { label: 'Bridge Type', value: formData.bridgeType },
        { label: 'Span Length', value: formData.spanLength, unit: 'm' },
        { label: 'Abutment Height', value: formData.abutmentHeight, unit: 'm' },
        { label: 'Abutment Width', value: formData.abutmentWidth, unit: 'm' },
        { label: 'Foundation Type', value: formData.foundationType },
        { label: 'Soil Type', value: formData.soilType },
        { label: 'Bearing Capacity', value: formData.bearingCapacity, unit: 'kPa' },
        { label: 'Concrete Grade', value: formData.concreteGrade },
      ],
      checks: [
        {
          name: 'Bearing Capacity',
          capacity: '-',
          utilisation: `${((results.foundation_checks?.find((c: any) => c.check_type === 'bearing_capacity')?.utilisation || 0) * 100).toFixed(1)}%`,
          status:
            results.foundation_checks?.find((c: any) => c.check_type === 'bearing_capacity')
              ?.status === 'PASS'
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Sliding Stability',
          capacity: '-',
          utilisation: `${((results.foundation_checks?.find((c: any) => c.check_type === 'sliding_stability')?.utilisation || 0) * 100).toFixed(1)}%`,
          status:
            results.foundation_checks?.find((c: any) => c.check_type === 'sliding_stability')
              ?.status === 'PASS'
              ? 'PASS'
              : 'FAIL',
        },
        {
          name: 'Overturning',
          capacity: '-',
          utilisation: `${((results.foundation_checks?.find((c: any) => c.check_type === 'overturning_stability')?.utilisation || 0) * 100).toFixed(1)}%`,
          status:
            results.foundation_checks?.find((c: any) => c.check_type === 'overturning_stability')
              ?.status === 'PASS'
              ? 'PASS'
              : 'FAIL',
        },
      ],
      recommendations:
        results.recommendations?.map((r: string) => ({ check: 'General', suggestion: r })) || [],
      footerNote: 'Beaver Bridges Ltd — Abutment Design',
    });
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (!preset) return;
    const { name: _name, ...fields } = preset;
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const inputFields = [
    {
      key: 'spanLength',
      label: 'Span Length',
      unit: 'm',
      icon: '📏',
      description: 'Bridge span length',
    },
    {
      key: 'abutmentHeight',
      label: 'Abutment Height',
      unit: 'm',
      icon: '🏗️',
      description: 'Height of abutment',
    },
    {
      key: 'abutmentWidth',
      label: 'Abutment Width',
      unit: 'm',
      icon: '📐',
      description: 'Width of abutment',
    },
    {
      key: 'bearingCapacity',
      label: 'Bearing Capacity',
      unit: 'kPa',
      icon: '🌍',
      description: 'Soil bearing capacity',
    },
    {
      key: 'backfillHeight',
      label: 'Backfill Height',
      unit: 'm',
      icon: '🏔️',
      description: 'Backfill height behind abutment',
    },
    {
      key: 'waterTableDepth',
      label: 'Water Table Depth',
      unit: 'm',
      icon: '💧',
      description: 'Depth to water table from surface',
    },
    {
      key: 'surchargePressure',
      label: 'Surcharge Pressure',
      unit: 'kPa',
      icon: '📦',
      description: 'Additional surface loading',
    },
    {
      key: 'seismicCoefficient',
      label: 'Seismic Coefficient (ag)',
      unit: 'g',
      icon: '🌊',
      description: 'Design ground acceleration (EN 1998)',
    },
  ];

  // What-if sliders config
  const whatIfSliders = [
    {
      key: 'abutmentHeight' as keyof FormData,
      label: 'Abutment Height',
      unit: 'm',
      min: 2,
      max: 15,
      step: 0.5,
    },
    {
      key: 'abutmentWidth' as keyof FormData,
      label: 'Abutment Width',
      unit: 'm',
      min: 2,
      max: 20,
      step: 0.5,
    },
    {
      key: 'backfillHeight' as keyof FormData,
      label: 'Backfill Height',
      unit: 'm',
      min: 1,
      max: 12,
      step: 0.5,
    },
    {
      key: 'bearingCapacity' as keyof FormData,
      label: 'Bearing Capacity',
      unit: 'kPa',
      min: 50,
      max: 500,
      step: 10,
    },
    {
      key: 'surchargePressure' as keyof FormData,
      label: 'Surcharge',
      unit: 'kPa',
      min: 0,
      max: 50,
      step: 1,
    },
  ];

  // Camera presets
  const cameraPresets: { label: string; icon: string; pos: [number, number, number] }[] = [
    { label: '3D', icon: '🎯', pos: [12, 8, 12] },
    { label: 'Front', icon: '🏠', pos: [0, 4, 14] },
    { label: 'Side', icon: '↔️', pos: [14, 4, 0] },
    { label: 'Top', icon: '⬇️', pos: [0, 16, 0.1] },
    { label: 'Close', icon: '🔍', pos: [5, 3, 5] },
  ];

  // Computed overall status
  const overallPass = useMemo(() => {
    if (!results?.foundation_checks) return true;
    return results.foundation_checks.every(
      (c: any) => c.status === 'PASS' || c.status === 'STABLE',
    );
  }, [results]);

  // 3D scene element (shared across usages)
  const render3DScene = (height: string) => (
    <ErrorBoundary
      fallback={
        <div
          className={`relative ${height} w-full rounded-xl overflow-hidden border border-gray-700/50 bg-gray-950 flex items-center justify-center`}
        >
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
              <FiLayers className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-gray-400 text-sm">3D preview unavailable</p>
            <p className="text-gray-500 text-xs">Your browser may have limited WebGL support</p>
          </div>
        </div>
      }
    >
      <Interactive3DDiagram
        height={height}
        cameraPosition={cameraPos}
        cameraTarget={[0, 1, 0]}
        status={overallPass ? 'PASS' : 'FAIL'}
      >
        <Abutment3D
          abutmentHeight={parseFloat(formData.abutmentHeight) || 6}
          abutmentWidth={parseFloat(formData.abutmentWidth) || 8}
          spanLength={parseFloat(formData.spanLength) || 30}
          backfillHeight={parseFloat(formData.backfillHeight) || 5}
          foundationType={formData.foundationType}
          bridgeType={formData.bridgeType}
          status={overallPass ? 'PASS' : 'FAIL'}
        />
      </Interactive3DDiagram>
    </ErrorBoundary>
  );

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
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-full glass border border-neon-cyan/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiLayers className="text-neon-cyan" size={24} />
            <span className="text-white font-semibold">EN 1992-1-1 | EN 1997-1</span>
          </motion.div>

          <h1 className="text-6xl font-black mb-6">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Abutments Design
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">EN 1997/1992 abutment wall design</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6">
            {[
              'Foundation Design',
              'Stability Analysis',
              'Reinforcement Design',
              'Earth Pressure Analysis',
              'Cost Estimation',
            ].map((f) => (
              <div key={f} className="flex items-center space-x-2 text-gray-400">
                <FiCheck className="text-green-400" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>

          {/* Preset Quick-Select */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <span className="text-xs text-gray-500 mr-1">Presets:</span>
            {Object.entries(PRESETS).map(([key, p]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => applyPreset(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300"
              >
                {(p as any).name}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Tab Navigation (Neon Pills) ── */}
        <div className="flex justify-center gap-3 mb-10">
          {(
            [
              { key: 'input', icon: <FiLayers size={16} />, label: 'Input' },
              { key: 'results', icon: <FiTarget size={16} />, label: 'Results' },
              { key: 'visualization', icon: <FiEye size={16} />, label: 'Visualization' },
            ] as const
          ).map((tab) => (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.key as any)}
              disabled={tab.key !== 'input' && !results}
              className={cn(
                'px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 border',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-500',
                tab.key !== 'input' && !results && 'opacity-40 cursor-not-allowed',
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'results' && results && (
                <span
                  className={cn(
                    'ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold',
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
              key="input-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid lg:grid-cols-3 gap-8">
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
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiLayers className="text-white" size={24} />
                          </motion.div>
                          <span>Bridge & Foundation Configuration</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label
                              htmlFor="bridgeType"
                              className="flex items-center space-x-2 text-sm font-semibold text-gray-200"
                            >
                              <span className="text-xl">🌉</span>
                              <span>Bridge Type</span>
                            </label>
                            <select
                              title="Bridge Type"
                              id="bridgeType"
                              value={formData.bridgeType}
                              onChange={(e) => handleInputChange('bridgeType', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                            >
                              <option value="simply_supported">Simply Supported</option>
                              <option value="continuous">Continuous</option>
                              <option value="cantilever">Cantilever</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label
                              htmlFor="foundationType"
                              className="flex items-center space-x-2 text-sm font-semibold text-gray-200"
                            >
                              <span className="text-xl">🏗️</span>
                              <span>Foundation Type</span>
                            </label>
                            <select
                              title="Foundation Type"
                              id="foundationType"
                              value={formData.foundationType}
                              onChange={(e) => handleInputChange('foundationType', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                            >
                              <option value="spread_footing">Spread Footing</option>
                              <option value="pile_foundation">Pile Foundation</option>
                              <option value="caisson">Caisson</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label
                              htmlFor="soilType"
                              className="flex items-center space-x-2 text-sm font-semibold text-gray-200"
                            >
                              <span className="text-xl">🌍</span>
                              <span>Soil Type</span>
                            </label>
                            <select
                              title="Soil Type"
                              id="soilType"
                              value={formData.soilType}
                              onChange={(e) => handleInputChange('soilType', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                            >
                              <option value="clay">Clay</option>
                              <option value="sand">Sand</option>
                              <option value="gravel">Gravel</option>
                              <option value="rock">Rock</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label
                              htmlFor="concreteGrade"
                              className="flex items-center space-x-2 text-sm font-semibold text-gray-200"
                            >
                              <span className="text-xl">🏗️</span>
                              <span>Concrete Grade</span>
                            </label>
                            <select
                              title="Concrete Grade"
                              id="concreteGrade"
                              value={formData.concreteGrade}
                              onChange={(e) => handleInputChange('concreteGrade', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                            >
                              <option value="C20">C20</option>
                              <option value="C25">C25</option>
                              <option value="C30">C30</option>
                              <option value="C35">C35</option>
                              <option value="C40">C40</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label
                              htmlFor="exposureClass"
                              className="flex items-center space-x-2 text-sm font-semibold text-gray-200"
                            >
                              <span className="text-xl">🛡️</span>
                              <span>Exposure Class</span>
                            </label>
                            <select
                              title="Exposure Class"
                              id="exposureClass"
                              value={formData.exposureClass}
                              onChange={(e) => handleInputChange('exposureClass', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all duration-300"
                            >
                              <option value="XC1">XC1 - Dry / Permanent wet</option>
                              <option value="XC2">XC2 - Wet, rarely dry</option>
                              <option value="XC3">XC3 - Moderate humidity</option>
                              <option value="XC4">XC4 - Cyclic wet/dry</option>
                              <option value="XD1">XD1 - Moderate chloride</option>
                              <option value="XD2">XD2 - Wet chloride</option>
                              <option value="XS1">XS1 - Sea air</option>
                              <option value="XS2">XS2 - Submerged</option>
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
                                <label
                                  htmlFor={field.key}
                                  className="flex items-center justify-between text-sm font-semibold text-gray-200"
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xl">{field.icon}</span>
                                    <ExplainableLabel label={field.label} field={field.key} />
                                  </div>
                                  <span className="text-neon-cyan text-xs">{field.unit}</span>
                                </label>

                                <div className="relative">
                                  <input
                                    title="{field.label}"
                                    id={field.key}
                                    type="number"
                                    step="0.01"
                                    value={formData[field.key as keyof FormData] as string}
                                    onChange={(e) =>
                                      handleInputChange(field.key as keyof FormData, e.target.value)
                                    }
                                    className={cn(
                                      'w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500',
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
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <motion.div
                              className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                              whileHover={{ rotate: 360 }}
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
                                  <label htmlFor={`loadCase-name-${index}`} className="sr-only">
                                    Load Case Name
                                  </label>
                                  <input
                                    title="Input value"
                                    id={`loadCase-name-${index}`}
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
                                  { key: 'dead_load', label: 'Dead', unit: 'kN' },
                                  { key: 'live_load', label: 'Live', unit: 'kN' },
                                  { key: 'wind_load', label: 'Wind', unit: 'kN' },
                                  { key: 'earthquake_load', label: 'EQ', unit: 'kN' },
                                  { key: 'temperature_load', label: 'Temp', unit: 'kN' },
                                  { key: 'braking_force', label: 'Braking', unit: 'kN' },
                                ].map((field) => (
                                  <div key={field.key} className="space-y-1">
                                    <label
                                      htmlFor={`load-${index}-${field.key}`}
                                      className="text-xs text-gray-400 text-center block"
                                    >
                                      {field.label}
                                    </label>
                                    <input
                                      title="Input value"
                                      id={`load-${index}-${field.key}`}
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
                      onClick={calculateResults}
                      disabled={isCalculating}
                      className="px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-transform duration-300 shadow-2xl cyber-glow-blue"
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
                          <span>RUN FULL ANALYSIS</span>
                          <FiActivity size={24} />
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </div>

                {/* Abutment Visualization - 1 column */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-1"
                >
                  <WhatIfPreview
                    title="Abutments — 3D Preview"
                    sliders={whatIfSliders}
                    form={formData}
                    updateForm={(key, value) => handleInputChange(key as keyof FormData, value)}
                    status={(results?.overallStatus ?? (overallPass ? 'PASS' : 'FAIL')) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => render3DScene(fsHeight)}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
            RESULTS TAB
            ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'results' && results && (
            <motion.div
              key="results-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Results Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <motion.h2
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-black"
                  >
                    <span
                      className={cn(
                        'bg-clip-text text-transparent bg-gradient-to-r',
                        overallPass ? 'from-emerald-400 to-cyan-400' : 'from-red-400 to-orange-400',
                      )}
                    >
                      {overallPass ? 'All Checks Pass' : 'Design Review Required'}
                    </span>
                  </motion.h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {results.foundation_checks?.length || 0} design checks evaluated per EN 1992-1-1
                    / EN 1997-1
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setActiveTab('visualization')}
                    variant="ghost"
                    className="px-4 py-2 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-xl text-sm font-medium"
                  >
                    <FiEye className="mr-2" size={14} />
                    3D View
                  </Button>
                  <Button
                    onClick={exportToPDF}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl text-white font-medium transition-all duration-300 shadow-lg shadow-cyan-500/25 flex items-center gap-2"
                  >
                    <FiDownload size={14} />
                    PDF
                  </Button>
                  <Button
                    onClick={exportDOCX}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all duration-300 shadow-lg shadow-purple-500/25 flex items-center gap-2"
                  >
                    <FiDownload size={14} />
                    DOCX
                  </Button>
                  <SaveRunButton
                    calculatorKey="abutments"
                    inputs={formData as unknown as Record<string, string>}
                    results={results}
                    status={overallPass ? 'PASS' : 'FAIL'}
                    summary={
                      results
                        ? `${results.design_metrics?.average_utilisation || '-'}% util`
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* ── Border-l-4 Summary Cards ── */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: 'Bearing Capacity', key: 'bearing_capacity', color: 'border-emerald-500' },
                  { label: 'Sliding Stability', key: 'sliding_stability', color: 'border-cyan-500' },
                  { label: 'Overturning', key: 'overturning_stability', color: 'border-blue-500' },
                ].map((item) => {
                  const check = results.foundation_checks?.find((c: any) => c.check_type === item.key);
                  const isPassing = check?.status === 'PASS' || check?.status === 'STABLE';
                  return (
                    <div key={item.key} className={cn('border-l-4 p-4 rounded-r-xl bg-gray-900/50', isPassing ? item.color : 'border-red-500')}>
                      <div className="flex items-center gap-2">
                        {isPassing ? <FiCheck className="text-emerald-400" size={16} /> : <FiAlertTriangle className="text-red-400" size={16} />}
                        <span className="text-white font-semibold text-sm">{item.label}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {check ? `${(check.utilisation * 100).toFixed(1)}% utilisation` : 'N/A'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Overall Status Banner ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'p-6 rounded-2xl border-2 text-center',
                  overallPass
                    ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5'
                    : 'border-red-500/50 bg-gradient-to-r from-red-500/5 to-orange-500/5',
                )}
              >
                <div
                  className={cn(
                    'text-5xl font-black mb-2',
                    overallPass ? 'text-emerald-400' : 'text-red-400',
                  )}
                >
                  {overallPass ? 'PASS' : 'FAIL'}
                </div>
                <div className="text-gray-300 text-sm">
                  Average Utilisation:{' '}
                  <span className="text-white font-bold">
                    {results.design_metrics?.average_utilisation || '—'}%
                  </span>
                  <span className="mx-3 text-gray-600">|</span>
                  Safety Margin:{' '}
                  <span className="text-white font-bold">
                    {results.design_metrics?.safety_margin || '—'}%
                  </span>
                  <span className="mx-3 text-gray-600">|</span>
                  Efficiency:{' '}
                  <span className="text-white font-bold">
                    {results.design_metrics?.design_efficiency || '—'}%
                  </span>
                </div>
              </motion.div>

              {/* ── Foundation Checks — Animated Utilisation Bars ── */}
              <div>
                <div className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FiTarget size={12} /> Design Checks
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.foundation_checks.map((check: any, index: number) => {
                    const isPassing = check.status === 'PASS' || check.status === 'STABLE';
                    const util =
                      typeof check.utilisation === 'number'
                        ? check.utilisation
                        : parseFloat(check.utilisation) || 0;
                    const barColor =
                      util > 100 ? 'bg-red-500' : util > 80 ? 'bg-amber-500' : 'bg-emerald-500';
                    const borderColor = isPassing ? 'border-emerald-500/40' : 'border-red-500/40';
                    const shadowColor = isPassing ? 'shadow-emerald-500/5' : 'shadow-red-500/5';

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <Card
                          variant="glass"
                          className={cn(
                            'border',
                            borderColor,
                            'shadow-lg',
                            shadowColor,
                            'relative overflow-hidden',
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-medium text-white truncate">
                                  {check.description}
                                </span>
                                {!isPassing && (
                                  <div
                                    className="relative group z-[9999]"
                                    onMouseEnter={() => setShowTooltip(check.check_type)}
                                    onMouseLeave={() => setShowTooltip(null)}
                                  >
                                    <FiInfo
                                      className="text-red-400 cursor-help flex-shrink-0"
                                      size={14}
                                    />
                                    {showTooltip === check.check_type && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="absolute z-[9999] bottom-full left-0 mb-2 w-72 p-3 bg-gray-900 border border-orange-500/50 rounded-xl shadow-2xl"
                                        style={{ pointerEvents: 'none' }}
                                      >
                                        <div className="flex items-start gap-2 mb-1">
                                          <FiAlertTriangle
                                            className="text-orange-400 flex-shrink-0 mt-0.5"
                                            size={12}
                                          />
                                          <p className="text-[10px] font-bold text-orange-400 uppercase">
                                            Recommendation
                                          </p>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                          {getRecommendation(
                                            check.check_type,
                                            check.utilisation,
                                            results,
                                          )}
                                        </p>
                                      </motion.div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={cn(
                                  'px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0',
                                  isPassing
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400',
                                )}
                              >
                                {check.status}
                              </motion.span>
                            </div>

                            {/* Utilisation Bar */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-gray-500 font-mono">
                                {check.eurocode_ref || check.check_type}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {check.capacity ? `${check.capacity} ${check.unit || ''}` : ''}
                                </span>
                                <span
                                  className={cn(
                                    'text-xs font-bold font-mono',
                                    util > 100
                                      ? 'text-red-400'
                                      : util > 80
                                        ? 'text-amber-400'
                                        : 'text-emerald-400',
                                  )}
                                >
                                  {util.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, util)}%` }}
                                transition={{
                                  duration: 0.8,
                                  ease: 'easeOut',
                                  delay: 0.2 + index * 0.05,
                                }}
                                className={cn('h-full rounded-full', barColor)}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── Reinforcement Summary ── */}
              <div className="text-xs font-bold text-purple-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                <FiActivity size={12} /> Reinforcement Design
              </div>
              {results.reinforcement && results.reinforcement.length > 0 && (
                <Card
                  variant="glass"
                  className="border border-purple-500/40 shadow-lg shadow-purple-500/5"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                        <FiActivity className="text-white" size={14} />
                      </div>
                      Reinforcement Design
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      {results.reinforcement.map((r: any, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30"
                        >
                          <p className="text-purple-400 text-xs uppercase font-bold mb-2">
                            {r.location}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Bars</span>
                              <span className="text-white font-mono font-bold">
                                {r.bar_size}mm @ {r.spacing}mm
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">As,req</span>
                              <span className="text-white font-mono">{r.As_required} mm²/m</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">As,prov</span>
                              <span className="text-cyan-400 font-mono">{r.As_provided} mm²/m</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── Cost Estimation ── */}
              <div className="text-xs font-bold text-green-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                <FiBox size={12} /> Cost & Materials
              </div>
              {results.cost_estimate && (
                <Card
                  variant="glass"
                  className="border border-green-500/40 shadow-lg shadow-green-500/5"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <FiBox className="text-white" size={14} />
                      </div>
                      Cost Estimation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {[
                        {
                          label: 'Concrete',
                          cost: results.cost_estimate.concrete_cost_gbp,
                          detail: `${results.cost_estimate.concrete_volume_m3} m³`,
                          color: 'cyan',
                        },
                        {
                          label: 'Reinforcement',
                          cost: results.cost_estimate.steel_cost_gbp,
                          detail: `${results.cost_estimate.steel_weight_tonnes} t`,
                          color: 'orange',
                        },
                        {
                          label: 'Excavation',
                          cost: results.cost_estimate.excavation_cost_gbp,
                          detail: `${results.cost_estimate.excavation_volume_m3} m³`,
                          color: 'purple',
                        },
                        {
                          label: 'Total Cost',
                          cost: results.cost_estimate.total_cost_gbp,
                          detail: `£${results.cost_estimate.cost_per_linear_meter}/m`,
                          color: 'green',
                        },
                      ].map((item, i) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                          className={`p-4 rounded-xl bg-gradient-to-br from-${item.color}-900/30 to-${item.color}-800/20 border border-${item.color}-700/30`}
                        >
                          <p className={`text-${item.color}-400 text-xs uppercase font-bold mb-2`}>
                            {item.label}
                          </p>
                          <p className="text-2xl font-bold text-white">
                            £{parseInt(item.cost).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{item.detail}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Material Quantities */}
                    {results.material_quantities && (
                      <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-700">
                        <p className="text-cyan-400 font-bold mb-3 text-xs uppercase">
                          Material Quantities
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                          {[
                            {
                              label: 'Concrete',
                              val: `${results.material_quantities.concrete_m3} m³`,
                            },
                            {
                              label: 'Reinforcement',
                              val: `${results.material_quantities.reinforcement_kg} kg`,
                            },
                            {
                              label: 'Excavation',
                              val: `${results.material_quantities.excavation_m3} m³`,
                            },
                            {
                              label: 'Formwork',
                              val: `${results.material_quantities.formwork_m2} m²`,
                            },
                            {
                              label: 'Backfill',
                              val: `${results.material_quantities.backfill_m3} m³`,
                            },
                          ].map((q) => (
                            <div key={q.label}>
                              <p className="text-gray-400">{q.label}</p>
                              <p className="text-white font-bold">{q.val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── Design Metrics & Optimisation ── */}
              <div className="text-xs font-bold text-blue-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                <FiTrendingUp size={12} /> Design Metrics & Optimisation
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Design Efficiency */}
                {results.design_metrics && (
                  <Card
                    variant="glass"
                    className="border border-blue-500/40 shadow-lg shadow-blue-500/5"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <FiActivity className="text-white" size={14} />
                        </div>
                        Design Efficiency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          {
                            label: 'Design Efficiency',
                            value: `${results.design_metrics.design_efficiency}%`,
                            color: 'text-white',
                          },
                          {
                            label: 'Average Utilisation',
                            value: `${results.design_metrics.average_utilisation}%`,
                            color: 'text-cyan-400',
                          },
                          {
                            label: 'Safety Margin',
                            value: `${results.design_metrics.safety_margin}%`,
                            color: 'text-emerald-400',
                          },
                          {
                            label: 'Water Pressure',
                            value: `${results.design_metrics.water_pressure_kN} kN`,
                            color: 'text-blue-400',
                          },
                        ].map((m) => (
                          <div
                            key={m.label}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-800/40 border border-gray-700/30"
                          >
                            <span className="text-gray-400 text-sm">{m.label}</span>
                            <span className={cn('font-bold text-lg font-mono', m.color)}>
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Optimisation Suggestions */}
                <Card
                  variant="glass"
                  className="border border-yellow-500/30 shadow-lg shadow-yellow-500/5"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                        <FiInfo className="text-white" size={14} />
                      </div>
                      Optimisation Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {results.optimisation_suggestions &&
                    results.optimisation_suggestions.length > 0 ? (
                      <div className="space-y-2">
                        {results.optimisation_suggestions.map(
                          (suggestion: string, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * index }}
                              className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2"
                            >
                              <FiZap className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                              <p className="text-sm text-gray-300">{suggestion}</p>
                            </motion.div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="p-6 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                        <FiCheck className="text-green-400 mx-auto mb-2" size={28} />
                        <p className="text-green-400 font-bold mb-1">Well Optimised</p>
                        <p className="text-sm text-gray-400">
                          Good balance between economy and safety
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── Warnings ── */}
              <div className="text-xs font-bold text-amber-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                <FiAlertTriangle size={12} /> Warnings & Notes
              </div>
              <Card className="bg-gray-900/50 border-amber-500/40 shadow-lg shadow-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
                      <FiAlertTriangle className="text-white" size={14} />
                    </div>
                    Warnings & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {warnings.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <FiCheck /> All checks OK — no warnings
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {warnings.map((w, i) => (
                        <div
                          key={i}
                          className="text-amber-400 text-xs flex items-start gap-2 py-1.5 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                        >
                          <FiAlertTriangle className="mt-0.5 flex-shrink-0" size={12} /> {w}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VISUALIZATION TAB
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="viz-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Viz Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-black">
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      3D Visualization
                    </span>
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Interactive abutment model with real-time parameter exploration
                  </p>
                </div>

              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* 3D Scene */}
                <div className="lg:col-span-2">
                  <Card variant="glass" className="border-cyan-500/30">
                    <CardContent className="p-4">
                      {render3DScene('h-[550px]')}
                      {/* Camera Presets */}
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {cameraPresets.map((p) => (
                          <button
                            key={p.label}
                            onClick={() => setCameraPos(p.pos)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                              cameraPos[0] === p.pos[0] &&
                                cameraPos[1] === p.pos[1] &&
                                cameraPos[2] === p.pos[2]
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-gray-800/60 border-gray-700/40 text-gray-400 hover:text-white hover:border-gray-500',
                            )}
                          >
                            {p.icon} {p.label}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Side Panel */}
                <div className="space-y-4">
                  {/* Status Card */}
                  <Card variant="glass" className="border-cyan-500/30">
                    <CardContent className="p-4">
                      <div
                        className={cn(
                          'p-4 rounded-xl border-2 text-center',
                          overallPass
                            ? 'border-emerald-500/50 bg-emerald-500/5'
                            : 'border-red-500/50 bg-red-500/5',
                        )}
                      >
                        <div
                          className={cn(
                            'text-3xl font-black',
                            overallPass ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {overallPass ? 'PASS' : 'FAIL'}
                        </div>
                        <div className="text-sm text-gray-300 mt-1">
                          {results.design_metrics?.average_utilisation || '—'}% avg. utilisation
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, parseFloat(results.design_metrics?.average_utilisation) || 0)}%`,
                            }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            className={cn(
                              'h-full rounded-full',
                              overallPass ? 'bg-emerald-500' : 'bg-red-500',
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Utilisation Bars */}
                  <Card variant="glass" className="border-cyan-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <FiTarget className="text-cyan-400" size={14} />
                        Utilisation Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-3">
                        {results.foundation_checks.map((check: any, i: number) => {
                          const u =
                            typeof check.utilisation === 'number'
                              ? check.utilisation
                              : parseFloat(check.utilisation) || 0;
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-gray-300 font-medium truncate max-w-[120px]">
                                    {check.description}
                                  </span>
                                  <span className="text-[9px] text-gray-600">
                                    {check.eurocode_ref || ''}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    'text-[11px] font-bold font-mono',
                                    u > 100
                                      ? 'text-red-400'
                                      : u > 80
                                        ? 'text-amber-400'
                                        : 'text-emerald-400',
                                  )}
                                >
                                  {u.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, u)}%` }}
                                  transition={{
                                    duration: 0.8,
                                    ease: 'easeOut',
                                    delay: 0.2 + i * 0.05,
                                  }}
                                  className={cn(
                                    'h-full rounded-full',
                                    u > 100
                                      ? 'bg-red-500'
                                      : u > 80
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500',
                                  )}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>



                  {/* Cost Summary */}
                  {results.cost_estimate && (
                    <Card variant="glass" className="border-green-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white flex items-center gap-2">
                          <span className="text-green-400">£</span>
                          Cost Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-center">
                          <p className="text-3xl font-black text-white">
                            £{parseInt(results.cost_estimate.total_cost_gbp).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            £{results.cost_estimate.cost_per_linear_meter}/linear meter
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid pattern CSS */}
      <style>{`
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(0, 217, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
};

export default Abutments;
