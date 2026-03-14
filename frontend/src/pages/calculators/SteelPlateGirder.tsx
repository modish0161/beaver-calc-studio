import { motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiFileText,
  FiGlobe,
  FiLayers,
  FiMinimize2,
  FiPackage,
  FiSettings,
  FiSliders,
  FiTarget,
  FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import { SteelPlateGirder3D } from '../../components/3d/scenes';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview, { type WhatIfSlider } from '../../components/WhatIfPreview';
import { STEEL_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { downloadPDF } from '../../lib/pdf';
import { buildSteelPlateGirderReport } from '../../lib/pdf/builders/steelPlateGirderBuilder';

const UNIT_SYSTEMS = {
  metric: {
    length: 1,
    force: 1,
    pressure: 1,
    lengthUnit: 'm',
    forceUnit: 'kN',
    pressureUnit: 'kN/m²',
    smallLength: 'mm',
  },
  imperial: {
    length: 3.281,
    force: 0.2248,
    pressure: 0.0209,
    lengthUnit: 'ft',
    forceUnit: 'kips',
    pressureUnit: 'ksf',
    smallLength: 'in',
  },
};

// Common Steel Plate Girder Presets
const GIRDER_PRESETS = {
  light: {
    name: '900 x 450 (Light)',
    webDepth: '900',
    webThickness: '12',
    flangeWidth: '450',
    flangeThickness: '20',
  },
  standard: {
    name: '1200 x 500 (Standard)',
    webDepth: '1200',
    webThickness: '15',
    flangeWidth: '500',
    flangeThickness: '25',
  },
  heavy: {
    name: '1500 x 600 (Heavy)',
    webDepth: '1500',
    webThickness: '20',
    flangeWidth: '600',
    flangeThickness: '30',
  },
};

interface FormData {
  span: string;
  webDepth: string;
  webThickness: string;
  flangeWidth: string;
  flangeThickness: string;
  deadLoad: string;
  liveLoad: string;
  pointLoadDead: string;
  pointLoadLive: string;
  steelGrade: string;
  lateralRestraintSpacing: string;
  useStiffeners: string;
  stiffenerSpacing: string;
  stiffenerThickness: string;
  stiffenerHeight: string;
  loadPosition: string;
  selfWeightToggle: boolean;
}

const SteelPlateGirder: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    span: '12',
    webDepth: '1200',
    webThickness: '15',
    flangeWidth: '500',
    flangeThickness: '25',
    deadLoad: '10',
    liveLoad: '15',
    pointLoadDead: '0',
    pointLoadLive: '0',
    steelGrade: 'S355',
    lateralRestraintSpacing: '3000',
    useStiffeners: 'no',
    stiffenerSpacing: '2000',
    stiffenerThickness: '12',
    stiffenerHeight: '1200',
    loadPosition: 'midspan',
    selfWeightToggle: true,
  });

  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // New state for enhanced features
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [showPresets, setShowPresets] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [designMode, setDesignMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'inputs' | 'results' | 'diagrams'>('inputs');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const autoCalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const whatIfSliders: WhatIfSlider[] = [
    { key: 'span', label: 'Span', min: 6, max: 40, step: 0.5, unit: 'm' },
    { key: 'webDepth', label: 'Web Depth', min: 600, max: 2500, step: 50, unit: 'mm' },
    { key: 'webThickness', label: 'Web Thickness', min: 8, max: 30, step: 1, unit: 'mm' },
    { key: 'flangeWidth', label: 'Flange Width', min: 200, max: 800, step: 10, unit: 'mm' },
    { key: 'flangeThickness', label: 'Flange Thickness', min: 12, max: 50, step: 1, unit: 'mm' },
    { key: 'deadLoad', label: 'Dead Load', min: 1, max: 30, step: 0.5, unit: 'kN/m' },
    { key: 'liveLoad', label: 'Live Load', min: 1, max: 40, step: 0.5, unit: 'kN/m' },
  ];

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field as string]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  // Unit Conversion Helpers
  const convert = (
    value: number | string,
    type: 'length' | 'force' | 'pressure',
    to: 'metric' | 'imperial',
  ) => {
    const val = typeof value === 'string' ? parseFloat(value) || 0 : value;
    const factor = UNIT_SYSTEMS[to][type];
    return (val * factor).toFixed(2);
  };

  const applyPreset = (key: keyof typeof GIRDER_PRESETS) => {
    const preset = GIRDER_PRESETS[key];
    setFormData((prev) => ({
      ...prev,
      webDepth: preset.webDepth,
      webThickness: preset.webThickness,
      flangeWidth: preset.flangeWidth,
      flangeThickness: preset.flangeThickness,
    }));
    setShowPresets(false);
  };

  const runDesignMode = () => {
    const L = parseFloat(formData.span) || 12;
    const designUDL = (parseFloat(formData.deadLoad) || 10) + (parseFloat(formData.liveLoad) || 15);

    // Rules of thumb for initial sizing:
    // Span/Depth ratio: L/10 to L/15
    const suggestedDepth = Math.round((L * 1000) / 12);
    // Web thickness: Depth / 150
    const suggestedWebThk = Math.max(10, Math.round(suggestedDepth / 80));
    // Flange width: Depth / 3 to Depth / 4
    const suggestedFlangeWidth = Math.round(suggestedDepth / 3.5);
    // Flange thickness: Based on moment capacity (very simplified)
    const suggestedFlangeThk = Math.max(20, Math.round(suggestedWebThk * 1.5));

    setFormData((prev) => ({
      ...prev,
      webDepth: suggestedDepth.toString(),
      webThickness: suggestedWebThk.toString(),
      flangeWidth: suggestedFlangeWidth.toString(),
      flangeThickness: suggestedFlangeThk.toString(),
    }));
    setDesignMode(false);
  };

  const generateWarnings = (res: any) => {
    const newWarnings: string[] = [];
    if (res.bendingResistance.utilisation > 90)
      newWarnings.push('⚠️ High bending utilisation. Consider larger flanges.');
    if (res.deflection.utilisation > 100)
      newWarnings.push('⛔ Deflection limit exceeded. Increase web depth.');
    if (res.lateralTorsionalBuckling.utilisation > 95)
      newWarnings.push('⚠️ LTB governs. Reduce lateral restraint spacing.');
    if (res.sectionProperties.sectionClass === 4)
      newWarnings.push('⚠️ Section is Class 4 (Slender). Reduced capacity applies.');
    if (parseFloat(formData.span) / (parseFloat(formData.webDepth) / 1000) > 25)
      newWarnings.push('⚠️ Girder is very shallow for its span.');
    setWarnings(newWarnings);
  };

  // Helper function to generate recommendations for failed checks
  const getRecommendation = (checkType: string, utilisation: number, results: any): string => {
    if (utilisation < 100) return '';

    switch (checkType) {
      case 'bendingResistance':
        return 'Consider: 1) Increase flange thickness or width, 2) Increase web depth, 3) Reduce span, 4) Use higher strength steel grade';

      case 'lateralTorsionalBuckling':
        if (results.lateralTorsionalBuckling.lambda_LT > 1.2) {
          return 'Consider: 1) Add more lateral restraints (reduce spacing), 2) Increase flange width, 3) Increase compression flange thickness, 4) Reduce span';
        }
        return 'Consider: 1) Reduce lateral restraint spacing significantly, 2) Increase section stiffness (larger flanges)';

      case 'shearResistance':
        return 'Consider: 1) Increase web thickness, 2) Reduce applied shear (add supports), 3) Use higher strength steel';

      case 'shearBuckling':
        if (results.shearBuckling.hw_tw_ratio > results.shearBuckling.hw_tw_limit) {
          return 'Consider: 1) Increase web thickness significantly, 2) Add vertical web stiffeners, 3) Reduce web depth, 4) Use thicker web plate';
        }
        return 'Consider: 1) Increase web thickness, 2) Add intermediate web stiffeners';

      case 'deflection':
        return 'Consider: 1) Increase section depth (web depth), 2) Increase flange size, 3) Add intermediate supports, 4) Reduce span, 5) Use prestressing';

      case 'interaction':
        return 'Consider: 1) Increase both flange size and web thickness, 2) Reduce both moment and shear (add supports), 3) Optimise section for combined loading';

      case 'webBearing':
        return 'Consider: 1) Add bearing stiffeners at load points, 2) Increase web thickness, 3) Use larger bearing plates to distribute load';

      default:
        return 'Consider reviewing section dimensions or reducing applied loads';
    }
  };

  // PDF Export — Premium Engineering Report via React-PDF builder
  const exportToPDF = async () => {
    if (!results) return;
    const reportData = buildSteelPlateGirderReport(formData, results, warnings, {
      projectName: 'Steel Plate Girder Design',
      documentRef: 'SPG-001',
    });
    await downloadPDF(
      reportData as any,
      `SteelPlateGirder_${formData.steelGrade}_${formData.span}m`,
    );
  };

  // DOCX Export — Editable Word document
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Steel Plate Girder Design',
      subtitle: 'EN 1993-1-5 Compliant',
      projectInfo: [
        { label: 'Steel Grade', value: formData.steelGrade },
        { label: 'Span', value: `${formData.span} m` },
      ],
      inputs: [
        { label: 'Span', value: formData.span, unit: 'm' },
        { label: 'Web Depth', value: formData.webDepth, unit: 'mm' },
        { label: 'Web Thickness', value: formData.webThickness, unit: 'mm' },
        { label: 'Flange Width', value: formData.flangeWidth, unit: 'mm' },
        { label: 'Flange Thickness', value: formData.flangeThickness, unit: 'mm' },
        { label: 'Dead Load', value: formData.deadLoad, unit: 'kN/m' },
        { label: 'Live Load', value: formData.liveLoad, unit: 'kN/m' },
        { label: 'Steel Grade', value: formData.steelGrade, unit: '' },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `${results.bending_check?.M_c_Rd?.toFixed(1) || '-'} kNm`,
          utilisation: `${results.bending_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.bending_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `${results.shear_check?.V_bw_Rd?.toFixed(1) || '-'} kN`,
          utilisation: `${results.shear_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.shear_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Web Buckling',
          capacity: `${results.web_buckling_check?.chi_w?.toFixed(3) || '-'}`,
          utilisation: `${results.web_buckling_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.web_buckling_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'LTB',
          capacity: `${results.ltb_check?.M_b_Rd?.toFixed(1) || '-'} kNm`,
          utilisation: `${results.ltb_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.ltb_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${results.maxUtilisation?.toFixed(1) || '-'}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Web Buckling',
          suggestion: 'Consider adding transverse stiffeners if web buckling governs',
        },
        {
          check: 'LTB',
          suggestion: 'Provide lateral restraints at closer spacing to reduce LTB effects',
        },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Steel Plate Girder Design',
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.span || parseFloat(formData.span) <= 0) {
      errors.span = 'Span must be greater than 0';
    }
    if (!formData.webDepth || parseFloat(formData.webDepth) <= 0) {
      errors.webDepth = 'Web depth required';
    }
    if (!formData.webThickness || parseFloat(formData.webThickness) <= 0) {
      errors.webThickness = 'Web thickness required';
    }
    if (!formData.flangeWidth || parseFloat(formData.flangeWidth) <= 0) {
      errors.flangeWidth = 'Flange width required';
    }
    if (!formData.flangeThickness || parseFloat(formData.flangeThickness) <= 0) {
      errors.flangeThickness = 'Flange thickness required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Pure calculation — no UI side-effects, returns results or null
  const runCalculation = useCallback((fd: FormData) => {
    // Validate
    const span = parseFloat(fd.span);
    const wd = parseFloat(fd.webDepth);
    const wt = parseFloat(fd.webThickness);
    const fw = parseFloat(fd.flangeWidth);
    const ft = parseFloat(fd.flangeThickness);
    if (!span || span <= 0 || !wd || wd <= 0 || !wt || wt <= 0 || !fw || fw <= 0 || !ft || ft <= 0)
      return null;

    // Parse inputs
    const L = span * 1000; // m -> mm
    const hw = parseFloat(fd.webDepth);
    const tw = parseFloat(fd.webThickness);
    const bf = parseFloat(fd.flangeWidth);
    const tf = parseFloat(fd.flangeThickness);
    const qDL_in = parseFloat(fd.deadLoad) || 0;
    const qLL = parseFloat(fd.liveLoad) || 0;
    const PDL_in = parseFloat(fd.pointLoadDead) || 0;
    const PLL = parseFloat(fd.pointLoadLive) || 0;
    const Lcr = parseFloat(fd.lateralRestraintSpacing) || L;
    const useStiffeners = fd.useStiffeners === 'yes';
    const stiffSpacing = parseFloat(fd.stiffenerSpacing) || 2000;

    // ====== MATERIAL PROPERTIES ======
    const grade = STEEL_GRADES[fd.steelGrade as keyof typeof STEEL_GRADES];
    const fy = grade.fy;
    const E = grade.E;
    const G = grade.G;
    const nu = 0.3;
    const γM0 = 1.0;
    const γM1 = 1.0;

    // ====== SELF-WEIGHT ======
    const density = 78.5; // kN/m³
    const area_m2 = (2 * bf * tf + hw * tw) / 1e6;
    const sw_kN_m = fd.selfWeightToggle ? area_m2 * density : 0;

    const qDL = qDL_in + sw_kN_m;
    const PDL = PDL_in;

    // ====== GEOMETRIC PROPERTIES ======
    const h = hw + 2 * tf;
    const Aweb = hw * tw;
    const Aflange = bf * tf;
    const A = Aweb + 2 * Aflange;
    const Iy = (bf * Math.pow(h, 3) - (bf - tw) * Math.pow(hw, 3)) / 12;
    const Iz = (2 * tf * Math.pow(bf, 3) + hw * Math.pow(tw, 3)) / 12;
    const Wel_y = Iy / (h / 2);
    const Wpl_y = (tw * hw * hw) / 4 + bf * tf * (hw + tf);
    const iy = Math.sqrt(Iy / A);
    const iz = Math.sqrt(Iz / A);
    const It = (2 * bf * Math.pow(tf, 3) + hw * Math.pow(tw, 3)) / 3;
    const Iw = (Iz * Math.pow(hw + tf, 2)) / 4;

    // ====== CROSS-SECTION CLASSIFICATION ======
    const eps = Math.sqrt(235 / fy);
    const cf_tf = (bf - tw) / (2 * tf);
    const hw_tw = hw / tw;

    let f_class = cf_tf <= 9 * eps ? 1 : cf_tf <= 10 * eps ? 2 : cf_tf <= 14 * eps ? 3 : 4;
    let w_class = hw_tw <= 72 * eps ? 1 : hw_tw <= 83 * eps ? 2 : hw_tw <= 124 * eps ? 3 : 4;
    const s_class = Math.max(f_class, w_class);

    // ====== LOAD COMBINATIONS ======
    const γG = 1.35;
    const γQ = 1.5;
    const q_ULS = γG * qDL + γQ * qLL;
    const P_ULS = γG * PDL + γQ * PLL;
    const q_SLS = qDL + qLL;
    const P_SLS = PDL + PLL;

    // ====== ANALYSIS — Simply Supported Beam ======
    // Use metres for span to keep units clean
    const L_m = parseFloat(fd.span); // m
    const V_Ed_ULS = (q_ULS * L_m) / 2 + P_ULS / 2; // kN
    const M_Ed_ULS = (q_ULS * L_m * L_m) / 8 + (P_ULS * L_m) / 4; // kNm
    const V_Ed_SLS = (q_SLS * L_m) / 2 + P_SLS / 2; // kN
    const M_Ed_SLS = (q_SLS * L_m * L_m) / 8 + (P_SLS * L_m) / 4; // kNm

    // ====== DESIGN CHECKS ======

    // ====== CLASS 4 EFFECTIVE WIDTH (EN 1993-1-5 §4) ======
    // For Class 4 webs, compute reduced effective properties
    let Weff_y = s_class <= 2 ? Wpl_y : Wel_y; // default to gross
    let Iy_eff = Iy;
    if (s_class === 4 && w_class === 4) {
      // Web in pure bending: ψ = -1, k_σ = 23.9 (EN 1993-1-5 Table 4.1)
      const k_sigma = 23.9;
      const b_bar = hw; // full web panel height
      const lambda_p = b_bar / tw / (28.4 * eps * Math.sqrt(k_sigma));
      let rho_eff = 1.0;
      if (lambda_p > 0.673) {
        rho_eff = (lambda_p - 0.055 * (3 + -1)) / (lambda_p * lambda_p); // ψ = -1
        rho_eff = Math.min(1.0, Math.max(0, rho_eff));
      }
      // Compressed zone = hw / 2; effective compressed zone = ρ × hw/2
      const b_c = hw / 2;
      const b_c_eff = rho_eff * b_c;
      const b_e1 = 0.4 * b_c_eff; // near compression flange
      const b_e2 = 0.6 * b_c_eff; // near NA
      // Ineffective strip width
      const d_ineff = b_c - b_c_eff;
      // Distance from NA (mid-depth) to centroid of ineffective strip
      const y_strip = b_e1 + d_ineff / 2; // from compression flange inner face
      const d_from_NA = b_c - y_strip; // from neutral axis (symmetric section)
      // Reduce Iy
      const I_removed = (tw * Math.pow(d_ineff, 3)) / 12 + tw * d_ineff * Math.pow(d_from_NA, 2);
      Iy_eff = Iy - I_removed;
      Weff_y = Iy_eff / (h / 2); // effective elastic section modulus
    } else if (s_class === 3 || (s_class === 4 && w_class <= 3)) {
      Weff_y = Wel_y; // Class 3: use elastic
    }

    // 1. Bending
    const Mc_Rd = (Weff_y * fy) / (γM0 * 1e6);

    // 2. LTB (EN 1993-1-1 Cl. 6.3.2)
    const C1 = 1.13; // Uniform load
    const Mcr =
      (((C1 * Math.pow(Math.PI, 2) * E * Iz) / Math.pow(Lcr, 2)) *
        Math.sqrt(Iw / Iz + (Math.pow(Lcr, 2) * G * It) / (Math.pow(Math.PI, 2) * E * Iz))) /
      1e6;
    const lambda_LT = Math.sqrt((Weff_y * fy) / (Mcr * 1e6));
    // EN 1993-1-1 Table 6.4: welded I-sections h/b ≤ 2 → curve c (αLT = 0.49), h/b > 2 → curve d (αLT = 0.76)
    const alpha_LT = h / bf > 2 ? 0.76 : 0.49;
    const phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + Math.pow(lambda_LT, 2));
    const chi_LT = Math.min(1.0, 1 / (phi_LT + Math.sqrt(phi_LT * phi_LT - lambda_LT * lambda_LT)));
    const Mb_Rd = (chi_LT * Weff_y * fy) / (γM1 * 1e6);

    // 3. Shear
    const Av = hw * tw;
    const Vpl_Rd = (Av * fy) / Math.sqrt(3) / (γM0 * 1000);

    // 4. Shear Buckling (EN 1993-1-5 Cl. 5)
    const eta = 1.2;
    const limit = (72 * eps) / eta;
    // Panel aspect ratio for kτ (EN 1993-1-5 Table 5.1)
    const a = useStiffeners ? stiffSpacing : L; // stiffener panel or full span
    const a_hw = a / hw;
    const k_tau =
      a_hw >= 1 ? 5.34 + 4.0 * Math.pow(1 / a_hw, 2) : 4.0 + 5.34 * Math.pow(1 / a_hw, 2);
    const sigma_e = 190000 * Math.pow(tw / hw, 2);
    const tau_cr = k_tau * sigma_e;
    const lambda_w = 0.76 * Math.sqrt(fy / tau_cr);
    // EN 1993-1-5 Table 5.1 — rigid end post
    let chi_w: number;
    if (lambda_w < 0.83 / eta) {
      chi_w = eta;
    } else if (lambda_w < 1.08) {
      chi_w = 0.83 / lambda_w;
    } else {
      chi_w = 1.37 / (0.7 + lambda_w);
    }
    const Vb_Rd = (chi_w * hw * tw * fy) / (Math.sqrt(3) * γM1) / 1000;

    // 5. Deflection (q_SLS in kN/m = N/mm; P_SLS in kN needs ×1000 for N)
    // Use effective Iy for Class 4 sections
    const Iy_defl = s_class === 4 ? Iy_eff : Iy;
    const delta =
      (5 * q_SLS * Math.pow(L, 4)) / (384 * E * Iy_defl) +
      (P_SLS * 1000 * Math.pow(L, 3)) / (48 * E * Iy_defl);
    const delta_limit = L / 360;

    // 6. Bending–Shear Interaction (EN 1993-1-1 Cl. 6.2.8)
    // When V_Ed > 0.5 × Vpl,Rd the moment resistance is reduced
    const V_ratio = V_Ed_ULS / Vpl_Rd;
    let rho_interaction = 0;
    let M_V_Rd = Mc_Rd; // No reduction by default
    if (V_ratio > 0.5) {
      rho_interaction = Math.pow(2 * V_ratio - 1, 2);
      // Reduced bending resistance accounting for shear
      const Aw = hw * tw;
      const W_for_interaction = s_class <= 2 ? Wpl_y : Weff_y;
      const Wpl_reduced = W_for_interaction - (rho_interaction * Aw * Aw) / (4 * tw);
      M_V_Rd = Math.max(0, (Wpl_reduced * fy) / (γM0 * 1e6));
    }
    const interaction_util = (M_Ed_ULS / M_V_Rd) * 100;

    // 7. Web Bearing / Transverse Force (EN 1993-1-5 §6)
    // Type (a): forces applied through one flange, resisted by shear in web
    const ss = 50; // Stiff bearing length (mm) — default
    // Effective loaded length ly (EN 1993-1-5 §6.5)
    const m1 = (bf * fy) / (tw * fy); // = bf / tw (simplifies)
    const m2 = 0.02 * Math.pow(hw / tf, 2); // EN 1993-1-5 Eq 6.4 (when lambda_F > 0.5)
    const ly_1 = ss + 2 * tf * (1 + Math.sqrt(m1 + m2));
    const ly_prelim = Math.min(ly_1, a); // cannot exceed panel length
    // Critical force F_cr (EN 1993-1-5 §6.4)
    const k_F = useStiffeners ? 6 + 2 * Math.pow(hw / a, 2) : 6; // Type (a)
    const F_cr = (0.9 * k_F * E * Math.pow(tw, 3)) / hw; // N
    // Slenderness λ_F (EN 1993-1-5 §6.5)
    const lambda_F = Math.sqrt((ly_prelim * tw * fy) / F_cr);
    const chi_F = Math.min(1.0, 0.5 / lambda_F); // EN 1993-1-5 Eq 6.3
    // Effective length
    const l_eff = chi_F * ly_prelim;
    const Fy_Rd = (l_eff * tw * fy) / (γM1 * 1000); // kN
    const R_Ed = V_Ed_ULS; // end reaction
    const web_bearing_util = (R_Ed / Fy_Rd) * 100;

    const res = {
      sectionProperties: {
        totalDepth: h.toFixed(1),
        totalArea: (A / 100).toFixed(2),
        Iy: (Iy / 1e4).toFixed(2),
        Iy_eff: s_class === 4 ? (Iy_eff / 1e4).toFixed(2) : undefined,
        Iz: (Iz / 1e4).toFixed(2),
        Wel: (Wel_y / 1e3).toFixed(2),
        Wpl: (Wpl_y / 1e3).toFixed(2),
        Weff: s_class >= 3 ? (Weff_y / 1e3).toFixed(2) : undefined,
        radiusGyration: iy.toFixed(1),
        sectionClass: s_class,
        flangeClass: f_class,
        webClass: w_class,
        selfWeight: sw_kN_m.toFixed(2),
      },
      loads: {
        M_Ed_SLS: M_Ed_SLS.toFixed(2),
        M_Ed_ULS: M_Ed_ULS.toFixed(2),
        V_Ed_SLS: V_Ed_SLS.toFixed(2),
        V_Ed_ULS: V_Ed_ULS.toFixed(2),
        q_ULS: q_ULS.toFixed(2),
        P_ULS: P_ULS.toFixed(2),
      },
      bendingResistance: {
        Mc_Rd: Mc_Rd.toFixed(2),
        utilisation: ((M_Ed_ULS / Mc_Rd) * 100).toFixed(1),
        status: M_Ed_ULS / Mc_Rd < 1.0 ? 'PASS' : 'FAIL',
      },
      lateralTorsionalBuckling: {
        Mcr: Mcr.toFixed(2),
        lambda_LT: lambda_LT.toFixed(3),
        chi_LT: chi_LT.toFixed(3),
        Mb_Rd: Mb_Rd.toFixed(2),
        utilisation: ((M_Ed_ULS / Mb_Rd) * 100).toFixed(1),
        status: M_Ed_ULS / Mb_Rd < 1.0 ? 'PASS' : 'FAIL',
      },
      shearResistance: {
        Vpl_Rd: Vpl_Rd.toFixed(2),
        utilisation: ((V_Ed_ULS / Vpl_Rd) * 100).toFixed(1),
        status: V_Ed_ULS / Vpl_Rd < 1.0 ? 'PASS' : 'FAIL',
      },
      shearBuckling: {
        required: hw_tw > limit,
        hw_tw_ratio: hw_tw.toFixed(1),
        hw_tw_limit: limit.toFixed(1),
        chi_w: chi_w.toFixed(3),
        Vb_Rd: Vb_Rd.toFixed(2),
        utilisation: ((V_Ed_ULS / Vb_Rd) * 100).toFixed(1),
        status: V_Ed_ULS / Vb_Rd < 1.0 ? 'PASS' : 'FAIL',
      },
      deflection: {
        actual: delta.toFixed(2),
        limit: delta_limit.toFixed(2),
        ratio: `L/${Math.round(L / delta)}`,
        utilisation: ((delta / delta_limit) * 100).toFixed(1),
        status: delta < delta_limit ? 'PASS' : 'FAIL',
      },
      interaction: {
        rho: rho_interaction.toFixed(3),
        M_V_Rd: M_V_Rd.toFixed(2),
        utilisation: interaction_util.toFixed(1),
        status: interaction_util < 100 ? 'PASS' : 'FAIL',
      },
      webBearing: {
        Fy_Rd: Fy_Rd.toFixed(2),
        utilisation: web_bearing_util.toFixed(1),
        status: web_bearing_util < 100 ? 'PASS' : 'FAIL',
      },
    };

    return res;
  }, []);

  // Auto-recalculate on every input change (debounced 150ms)
  useEffect(() => {
    if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current);
    autoCalcTimer.current = setTimeout(() => {
      const res = runCalculation(formData);
      if (res) {
        setResults(res);
        generateWarnings(res);
      }
    }, 150);
    return () => {
      if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, runCalculation]);

  // Manual calculate with animation (for the button)
  const calculateResults = async () => {
    if (!validateForm()) return;
    setIsCalculating(true);
    setTimeout(() => {
      const res = runCalculation(formData);
      if (res) {
        setResults(res);
        generateWarnings(res);
      }
      setIsCalculating(false);
      setActiveTab('results');
    }, 800);
  };

  const inputFields = [
    { key: 'span', label: 'Span Length', unit: 'm', icon: '📏', description: 'Total beam span' },
    {
      key: 'webDepth',
      label: 'Web Depth',
      unit: 'mm',
      icon: '📐',
      description: 'Clear height of web',
    },
    {
      key: 'webThickness',
      label: 'Web Thickness',
      unit: 'mm',
      icon: '▭',
      description: 'Thickness of web plate',
    },
    {
      key: 'flangeWidth',
      label: 'Flange Width',
      unit: 'mm',
      icon: '↔️',
      description: 'Width of each flange',
    },
    {
      key: 'flangeThickness',
      label: 'Flange Thickness',
      unit: 'mm',
      icon: '⬜',
      description: 'Thickness of flange plates',
    },
    {
      key: 'deadLoad',
      label: 'Dead Load (UDL)',
      unit: 'kN/m',
      icon: '⬇️',
      description: 'Permanent distributed load',
    },
    {
      key: 'liveLoad',
      label: 'Live Load (UDL)',
      unit: 'kN/m',
      icon: '⚡',
      description: 'Variable distributed load',
    },
    {
      key: 'pointLoadDead',
      label: 'Point Load (Dead)',
      unit: 'kN',
      icon: '🎯',
      description: 'Concentrated permanent load at mid-span',
    },
    {
      key: 'pointLoadLive',
      label: 'Point Load (Live)',
      unit: 'kN',
      icon: '�',
      description: 'Concentrated variable load at mid-span',
    },
    {
      key: 'lateralRestraintSpacing',
      label: 'Lateral Restraint Spacing',
      unit: 'mm',
      icon: '🔗',
      description: 'Distance between lateral restraints (leave blank for unrestrained)',
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
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Steel Plate Girder
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            Interactive Eurocode design assistant with real-time analysis
          </p>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-gray-900/50 p-4 rounded-2xl border border-gray-800 glass">
            {/* Quick Actions Toolbar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="glass"
                  onClick={() => setShowPresets(!showPresets)}
                  className="flex items-center gap-2 border-neon-cyan/30 text-neon-cyan"
                >
                  <FiPackage /> Presets <FiChevronDown />
                </Button>
                {showPresets && (
                  <div className="absolute top-12 left-0 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {Object.entries(GIRDER_PRESETS).map(([key, p]) => (
                      <button
                        key={key}
                        onClick={() => applyPreset(key as any)}
                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-neon-cyan/10 hover:text-neon-cyan transition-colors border-b border-gray-800 last:border-0"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="glass"
                onClick={() => setDesignMode(designMode ? false : true)}
                className={cn(
                  'flex items-center gap-2',
                  designMode
                    ? 'border-neon-purple text-neon-purple'
                    : 'border-gray-700 text-gray-400',
                )}
              >
                <FiTarget /> {designMode ? 'Auto-Sizing Active' : 'Design Mode'}
              </Button>
            </div>

            {/* View Tabs */}
            <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
              {[
                { id: 'inputs', label: 'Inputs', icon: <FiSettings /> },
                { id: 'results', label: 'Analysis', icon: <FiActivity />, disabled: !results },
                { id: 'diagrams', label: 'Diagrams', icon: <FiBarChart2 />, disabled: !results },
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id as any)}
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

            {/* Units & Export */}
            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                onClick={() => setUnitSystem(unitSystem === 'metric' ? 'imperial' : 'metric')}
                className="flex items-center gap-2 border-neon-purple/30 text-neon-purple"
              >
                <FiGlobe /> {unitSystem === 'metric' ? 'Metric' : 'Imperial'}
              </Button>
              {results && (
                <>
                  <Button
                    onClick={exportToPDF}
                    className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
                  >
                    <FiFileText />
                  </Button>
                  <Button
                    onClick={exportDOCX}
                    className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                  >
                    <FiDownload />
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Content */}
          <div className={cn('lg:col-span-2 space-y-6', activeTab !== 'inputs' && 'hidden')}>
            {/* Section Geometry Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-2xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="text-white" size={24} />
                    </motion.div>
                    <span>Section Geometry</span>
                  </CardTitle>
                  <Button
                    variant="glass"
                    onClick={() => setShowWhatIf(!showWhatIf)}
                    className={cn(
                      'flex items-center gap-2',
                      showWhatIf ? 'text-neon-cyan border-neon-cyan/50' : 'text-gray-400',
                    )}
                  >
                    <FiSliders /> {showWhatIf ? 'Hide Sliders' : 'What-If Sliders'}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* WHAT-IF SLIDERS */}
                    {showWhatIf && (
                      <div className="col-span-2 p-4 mb-4 bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-neon-cyan font-mono">
                            <span>WEB DEPTH</span>
                            <span>{formData.webDepth} mm</span>
                          </div>
                          <input
                            title="WEB DEPTH"
                            type="range"
                            min="400"
                            max="3000"
                            step="50"
                            value={formData.webDepth}
                            onChange={(e) => handleInputChange('webDepth', e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                            aria-label="Web Depth"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-neon-cyan font-mono">
                            <span>WEB THICKNESS</span>
                            <span>{formData.webThickness} mm</span>
                          </div>
                          <input
                            title="WEB THICKNESS"
                            type="range"
                            min="6"
                            max="50"
                            step="1"
                            value={formData.webThickness}
                            onChange={(e) => handleInputChange('webThickness', e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                            aria-label="Web Thickness"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-neon-cyan font-mono">
                            <span>FLANGE WIDTH</span>
                            <span>{formData.flangeWidth} mm</span>
                          </div>
                          <input
                            title="FLANGE WIDTH"
                            type="range"
                            min="200"
                            max="1000"
                            step="10"
                            value={formData.flangeWidth}
                            onChange={(e) => handleInputChange('flangeWidth', e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                            aria-label="Flange Width"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-neon-cyan font-mono">
                            <span>FLANGE THICKNESS</span>
                            <span>{formData.flangeThickness} mm</span>
                          </div>
                          <input
                            title="FLANGE THICKNESS"
                            type="range"
                            min="10"
                            max="80"
                            step="1"
                            value={formData.flangeThickness}
                            onChange={(e) => handleInputChange('flangeThickness', e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                            aria-label="Flange Thickness"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-neon-cyan font-mono">
                            <span>SPAN</span>
                            <span>{formData.span} m</span>
                          </div>
                          <input
                            title="SPAN"
                            type="range"
                            min="3"
                            max="40"
                            step="0.5"
                            value={formData.span}
                            onChange={(e) => handleInputChange('span', e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                            aria-label="Span"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-neon-cyan font-mono">
                            <span>LIVE LOAD (UDL)</span>
                            <span>{formData.liveLoad} kN/m</span>
                          </div>
                          <input
                            title="LIVE LOAD"
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={formData.liveLoad}
                            onChange={(e) => handleInputChange('liveLoad', e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                            aria-label="Live Load"
                          />
                        </div>
                      </div>
                    )}

                    {inputFields.slice(0, 5).map((field, index) => (
                      <motion.div
                        key={field.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        className="relative group"
                        onMouseEnter={() => setActiveInput(field.key)}
                        onMouseLeave={() => setActiveInput(null)}
                      >
                        <div className="space-y-2">
                          <label className="flex items-center justify-between text-sm font-semibold text-gray-200">
                            <div className="flex items-center space-x-2">
                              <span className="text-xl">{field.icon}</span>
                              <ExplainableLabel label={field.label} field={field.key} />
                            </div>
                            <span className="text-neon-cyan text-xs">
                              {unitSystem === 'metric'
                                ? field.unit
                                : convert(0, 'length', 'imperial')}
                            </span>
                          </label>

                          <div className="relative">
                            <input
                              title="Input value"
                              type="number"
                              step="0.01"
                              value={formData[field.key as keyof FormData] as string}
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
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Loading & Supports Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card variant="glass" className="border-neon-purple/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-purple to-neon-pink rounded-xl flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      <FiZap className="text-white" size={24} />
                    </motion.div>
                    <span>Loading & Supports</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {inputFields.slice(5).map((field, index) => (
                      <div key={field.key} className="space-y-2">
                        <label className="flex items-center justify-between text-sm font-semibold text-gray-200">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{field.icon}</span>
                            <ExplainableLabel label={field.label} field={field.key} />
                          </div>
                          <span className="text-neon-purple text-xs">{field.unit}</span>
                        </label>
                        <input
                          title={field.label}
                          type="number"
                          value={formData[field.key as keyof FormData] as string}
                          onChange={(e) =>
                            handleInputChange(field.key as keyof FormData, e.target.value)
                          }
                          placeholder={field.label}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-neon-purple transition-all"
                        />
                      </div>
                    ))}

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                        <span className="text-xl">🔩</span>
                        <span>Steel Grade</span>
                      </label>
                      <select
                        title="Steel Grade"
                        value={formData.steelGrade}
                        onChange={(e) => handleInputChange('steelGrade', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple transition-all duration-300"
                      >
                        {Object.keys(STEEL_GRADES).map((grade) => (
                          <option key={grade} value={grade}>
                            {grade} (fy = {STEEL_GRADES[grade as keyof typeof STEEL_GRADES].fy}{' '}
                            N/mm²)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stiffeners Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl border border-gray-800">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">Web Stiffeners</p>
                        <p className="text-xs text-gray-400">Include intermediate stiffeners</p>
                      </div>
                      <button
                        onClick={() =>
                          handleInputChange(
                            'useStiffeners',
                            formData.useStiffeners === 'yes' ? 'no' : 'yes',
                          )
                        }
                        aria-label="Toggle stiffeners"
                        className={cn(
                          'w-12 h-6 rounded-full transition-colors relative',
                          formData.useStiffeners === 'yes' ? 'bg-neon-cyan' : 'bg-gray-700',
                        )}
                      >
                        <motion.div
                          animate={{ x: formData.useStiffeners === 'yes' ? 26 : 2 }}
                          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                        />
                      </button>
                    </div>

                    {/* Stiffener spacing — shown when stiffeners enabled */}
                    {formData.useStiffeners === 'yes' && (
                      <div className="space-y-2">
                        <label className="flex items-center justify-between text-sm font-semibold text-gray-200">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">📐</span>
                            <span>Stiffener Spacing</span>
                          </div>
                          <span className="text-neon-purple text-xs">mm</span>
                        </label>
                        <input
                          title="Stiffener Spacing"
                          type="number"
                          value={formData.stiffenerSpacing}
                          onChange={(e) => handleInputChange('stiffenerSpacing', e.target.value)}
                          placeholder="2000"
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-neon-purple transition-all"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl border border-gray-800">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">Include Self-Weight</p>
                        <p className="text-xs text-gray-400">Auto-calculate girder weight</p>
                      </div>
                      <button
                        onClick={() =>
                          handleInputChange('selfWeightToggle', !formData.selfWeightToggle)
                        }
                        aria-label="Toggle self-weight calculation"
                        className={cn(
                          'w-12 h-6 rounded-full transition-colors relative',
                          formData.selfWeightToggle ? 'bg-neon-cyan' : 'bg-gray-700',
                        )}
                      >
                        <motion.div
                          animate={{ x: formData.selfWeightToggle ? 26 : 2 }}
                          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                        />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Calculate Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center pt-4"
            >
              <Button
                onClick={calculateResults}
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

          {/* Fullscreen Preview Overlay */}
          {previewMaximized && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
            >
              {/* 3D Scene — takes most of the space */}
              <div className="flex-1 relative">
                <Interactive3DDiagram height="h-full" cameraPosition={[7, 5, 7]}>
                  <SteelPlateGirder3D
                    span={parseFloat(formData.span) || 12}
                    webDepth={parseFloat(formData.webDepth) || 1200}
                    webThickness={parseFloat(formData.webThickness) || 15}
                    flangeWidth={parseFloat(formData.flangeWidth) || 500}
                    flangeThickness={parseFloat(formData.flangeThickness) || 25}
                    udl={
                      (parseFloat(formData.deadLoad) || 0) + (parseFloat(formData.liveLoad) || 0)
                    }
                    pointLoad={
                      (parseFloat(formData.pointLoadDead) || 0) +
                      (parseFloat(formData.pointLoadLive) || 0)
                    }
                    useStiffeners={formData.useStiffeners === 'yes'}
                    stiffenerSpacing={parseFloat(formData.stiffenerSpacing) || 2000}
                    lateralRestraintSpacing={parseFloat(formData.lateralRestraintSpacing) || 3000}
                    utilisation={
                      results
                        ? Math.max(
                            parseFloat(results.bendingResistance?.utilisation || '0'),
                            parseFloat(results.lateralTorsionalBuckling?.utilisation || '0'),
                            parseFloat(results.shearResistance?.utilisation || '0'),
                            parseFloat(results.deflection?.utilisation || '0'),
                          )
                        : 0
                    }
                    status={
                      results
                        ? results.bendingResistance?.status === 'FAIL' ||
                          results.lateralTorsionalBuckling?.status === 'FAIL' ||
                          results.shearResistance?.status === 'FAIL' ||
                          results.shearBuckling?.status === 'FAIL' ||
                          results.deflection?.status === 'FAIL' ||
                          results.interaction?.status === 'FAIL'
                          ? 'FAIL'
                          : 'PASS'
                        : 'PASS'
                    }
                    steelGrade={formData.steelGrade}
                  />
                </Interactive3DDiagram>
                {/* Close button */}
                <button
                  onClick={() => setPreviewMaximized(false)}
                  className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                  aria-label="Minimize preview"
                >
                  <FiMinimize2 size={20} />
                </button>
                <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                  STEEL PLATE GIRDER — REAL-TIME PREVIEW
                </div>
              </div>

              {/* Right sidebar — live parameters & stats */}
              <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                  <FiSliders size={14} /> Live Parameters
                </h3>

                {/* Geometry sliders */}
                {[
                  {
                    label: 'Span',
                    field: 'span' as keyof FormData,
                    min: 3,
                    max: 40,
                    step: 0.5,
                    unit: 'm',
                  },
                  {
                    label: 'Web Depth',
                    field: 'webDepth' as keyof FormData,
                    min: 400,
                    max: 3000,
                    step: 50,
                    unit: 'mm',
                  },
                  {
                    label: 'Web Thickness',
                    field: 'webThickness' as keyof FormData,
                    min: 6,
                    max: 50,
                    step: 1,
                    unit: 'mm',
                  },
                  {
                    label: 'Flange Width',
                    field: 'flangeWidth' as keyof FormData,
                    min: 200,
                    max: 1000,
                    step: 10,
                    unit: 'mm',
                  },
                  {
                    label: 'Flange Thickness',
                    field: 'flangeThickness' as keyof FormData,
                    min: 10,
                    max: 80,
                    step: 1,
                    unit: 'mm',
                  },
                  {
                    label: 'Dead Load',
                    field: 'deadLoad' as keyof FormData,
                    min: 0,
                    max: 100,
                    step: 1,
                    unit: 'kN/m',
                  },
                  {
                    label: 'Live Load',
                    field: 'liveLoad' as keyof FormData,
                    min: 0,
                    max: 100,
                    step: 1,
                    unit: 'kN/m',
                  },
                  {
                    label: 'Point Load (D)',
                    field: 'pointLoadDead' as keyof FormData,
                    min: 0,
                    max: 500,
                    step: 5,
                    unit: 'kN',
                  },
                  {
                    label: 'Point Load (L)',
                    field: 'pointLoadLive' as keyof FormData,
                    min: 0,
                    max: 500,
                    step: 5,
                    unit: 'kN',
                  },
                  {
                    label: 'Lateral Restraint',
                    field: 'lateralRestraintSpacing' as keyof FormData,
                    min: 500,
                    max: 12000,
                    step: 100,
                    unit: 'mm',
                  },
                ].map((s) => (
                  <div key={s.field} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">{s.label}</span>
                      <span className="text-white">
                        {formData[s.field] as string} {s.unit}
                      </span>
                    </div>
                    <input
                      title={s.label}
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={formData[s.field] as string}
                      onChange={(e) => handleInputChange(s.field, e.target.value)}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                      aria-label={s.label}
                    />
                  </div>
                ))}

                {/* Divider */}
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                    <FiActivity size={14} /> Live Readout
                  </h3>
                  {[
                    {
                      label: 'Total Depth',
                      value: `${(parseFloat(formData.webDepth) || 0) + 2 * (parseFloat(formData.flangeThickness) || 0)} mm`,
                    },
                    {
                      label: 'Span / Depth',
                      value: `${(((parseFloat(formData.span) || 0) * 1000) / ((parseFloat(formData.webDepth) || 1) + 2 * (parseFloat(formData.flangeThickness) || 0))).toFixed(1)}`,
                    },
                    {
                      label: 'Total UDL',
                      value: `${((parseFloat(formData.deadLoad) || 0) + (parseFloat(formData.liveLoad) || 0)).toFixed(1)} kN/m`,
                    },
                    { label: 'Steel Grade', value: formData.steelGrade },
                    {
                      label: 'Stiffeners',
                      value:
                        formData.useStiffeners === 'yes'
                          ? `Yes @ ${formData.stiffenerSpacing} mm`
                          : 'No',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                    >
                      <span className="text-gray-500">{stat.label}</span>
                      <span className="text-white font-medium">{stat.value}</span>
                    </div>
                  ))}

                  {results && (
                    <div className="mt-3 space-y-1">
                      <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                        Last Analysis
                      </div>
                      {[
                        {
                          label: 'Bending',
                          util: results.bendingResistance?.utilisation,
                          status: results.bendingResistance?.status,
                        },
                        {
                          label: 'LTB',
                          util: results.lateralTorsionalBuckling?.utilisation,
                          status: results.lateralTorsionalBuckling?.status,
                        },
                        {
                          label: 'Shear',
                          util: results.shearResistance?.utilisation,
                          status: results.shearResistance?.status,
                        },
                        {
                          label: 'Shear Buckling',
                          util: results.shearBuckling?.utilisation,
                          status: results.shearBuckling?.status,
                        },
                        {
                          label: 'Deflection',
                          util: results.deflection?.utilisation,
                          status: results.deflection?.status,
                        },
                        {
                          label: 'Interaction',
                          util: results.interaction?.utilisation,
                          status: results.interaction?.status,
                        },
                        {
                          label: 'Web Bearing',
                          util: results.webBearing?.utilisation,
                          status: results.webBearing?.status,
                        },
                      ].map((check) => (
                        <div key={check.label} className="flex justify-between text-xs py-0.5">
                          <span className="text-gray-500">{check.label}</span>
                          <span
                            className={cn(
                              'font-bold',
                              check.status === 'FAIL'
                                ? 'text-red-500'
                                : parseFloat(check.util || '0') > 90
                                  ? 'text-orange-400'
                                  : 'text-emerald-400',
                            )}
                          >
                            {check.util}%
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

          {/* Side Preview / Quick View */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="sticky top-32"
            >
              <WhatIfPreview
                title="Steel Plate Girder — 3D Preview"
                sliders={whatIfSliders}
                form={formData}
                updateForm={handleInputChange}
                status={
                  (results
                    ? results.bendingResistance?.status === 'FAIL' ||
                      results.lateralTorsionalBuckling?.status === 'FAIL' ||
                      results.shearResistance?.status === 'FAIL' ||
                      results.shearBuckling?.status === 'FAIL' ||
                      results.deflection?.status === 'FAIL' ||
                      results.interaction?.status === 'FAIL'
                      ? 'FAIL'
                      : 'PASS'
                    : undefined) as 'PASS' | 'FAIL' | undefined
                }
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram height={fsHeight} cameraPosition={[6, 4, 6]}>
                    <SteelPlateGirder3D
                      span={parseFloat(formData.span) || 12}
                      webDepth={parseFloat(formData.webDepth) || 1200}
                      webThickness={parseFloat(formData.webThickness) || 15}
                      flangeWidth={parseFloat(formData.flangeWidth) || 500}
                      flangeThickness={parseFloat(formData.flangeThickness) || 25}
                      udl={
                        (parseFloat(formData.deadLoad) || 0) + (parseFloat(formData.liveLoad) || 0)
                      }
                      pointLoad={
                        (parseFloat(formData.pointLoadDead) || 0) +
                        (parseFloat(formData.pointLoadLive) || 0)
                      }
                      useStiffeners={formData.useStiffeners === 'yes'}
                      stiffenerSpacing={parseFloat(formData.stiffenerSpacing) || 2000}
                      lateralRestraintSpacing={parseFloat(formData.lateralRestraintSpacing) || 3000}
                      utilisation={
                        results
                          ? Math.max(
                              parseFloat(results.bendingResistance?.utilisation || '0'),
                              parseFloat(results.lateralTorsionalBuckling?.utilisation || '0'),
                              parseFloat(results.shearResistance?.utilisation || '0'),
                              parseFloat(results.deflection?.utilisation || '0'),
                            )
                          : 0
                      }
                      status={
                        results
                          ? results.bendingResistance?.status === 'FAIL' ||
                            results.lateralTorsionalBuckling?.status === 'FAIL' ||
                            results.shearResistance?.status === 'FAIL' ||
                            results.shearBuckling?.status === 'FAIL' ||
                            results.deflection?.status === 'FAIL' ||
                            results.interaction?.status === 'FAIL'
                            ? 'FAIL'
                            : 'PASS'
                          : 'PASS'
                      }
                      steelGrade={formData.steelGrade}
                    />
                  </Interactive3DDiagram>
                )}
              />

              {/* Quick Stats Card */}
              <Card variant="glass" className="border-neon-cyan/30 mt-4 text-white/5">
                <CardContent className="p-4 space-y-2">
                  {[
                    {
                      label: 'Total Depth',
                      value: `${(parseFloat(formData.webDepth) || 0) + 2 * (parseFloat(formData.flangeThickness) || 0)} mm`,
                    },
                    {
                      label: 'Flange',
                      value: `${formData.flangeWidth} × ${formData.flangeThickness} mm`,
                    },
                    { label: 'Web', value: `${formData.webDepth} × ${formData.webThickness} mm` },
                    { label: 'Span', value: `${formData.span} m` },
                    {
                      label: 'UDL',
                      value: `${((parseFloat(formData.deadLoad) || 0) + (parseFloat(formData.liveLoad) || 0)).toFixed(1)} kN/m`,
                    },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className={cn(
                        'flex justify-between items-center text-sm',
                        i < 4 && 'border-b border-gray-800 pb-2',
                      )}
                    >
                      <span className="text-gray-400">{stat.label}</span>
                      <span className="text-white font-bold">{stat.value}</span>
                    </div>
                  ))}
                  {/* Governing check — shows the critical utilisation */}
                  {results ? (
                    (() => {
                      const checks = [
                        {
                          label: 'Bending',
                          util: parseFloat(results.bendingResistance?.utilisation || '0'),
                          status: results.bendingResistance?.status,
                        },
                        {
                          label: 'LTB',
                          util: parseFloat(results.lateralTorsionalBuckling?.utilisation || '0'),
                          status: results.lateralTorsionalBuckling?.status,
                        },
                        {
                          label: 'Shear',
                          util: parseFloat(results.shearResistance?.utilisation || '0'),
                          status: results.shearResistance?.status,
                        },
                        {
                          label: 'Shear Buckling',
                          util: parseFloat(results.shearBuckling?.utilisation || '0'),
                          status: results.shearBuckling?.status,
                        },
                        {
                          label: 'Deflection',
                          util: parseFloat(results.deflection?.utilisation || '0'),
                          status: results.deflection?.status,
                        },
                        {
                          label: 'Interaction',
                          util: parseFloat(results.interaction?.utilisation || '0'),
                          status: results.interaction?.status,
                        },
                        {
                          label: 'Web Bearing',
                          util: parseFloat(results.webBearing?.utilisation || '0'),
                          status: results.webBearing?.status,
                        },
                      ];
                      const governing = checks.reduce(
                        (a, b) => (b.util > a.util ? b : a),
                        checks[0],
                      );
                      const anyFail = checks.some((c) => c.status === 'FAIL');
                      return (
                        <div className="pt-2 mt-1 border-t border-gray-700">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Overall</span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-black',
                                anyFail
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-green-500/20 text-green-400',
                              )}
                            >
                              {anyFail ? 'FAIL' : 'PASS'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm mt-1">
                            <span className="text-gray-500 text-xs">Governing</span>
                            <span
                              className={cn(
                                'font-bold text-xs',
                                governing.util > 100
                                  ? 'text-red-400'
                                  : governing.util > 90
                                    ? 'text-orange-400'
                                    : 'text-neon-cyan',
                              )}
                            >
                              {governing.label} — {governing.util.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                governing.util > 100
                                  ? 'bg-red-500'
                                  : governing.util > 80
                                    ? 'bg-orange-500'
                                    : 'bg-gradient-to-r from-neon-cyan to-neon-blue',
                              )}
                              style={{ width: `${Math.min(governing.util, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex justify-between items-center text-sm pt-1">
                      <span className="text-gray-400">Utilisation</span>
                      <span className="text-gray-600">—</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warnings Card */}
              {warnings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl space-y-2"
                >
                  <p className="text-xs font-bold text-orange-500 flex items-center gap-2 uppercase tracking-wider">
                    <FiAlertTriangle /> Engineering Notes
                  </p>
                  {warnings.map((w, i) => (
                    <p key={i} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span> {w}
                    </p>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* RESULTS & DIAGRAMS CONTENT */}

        {activeTab === 'results' && results && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-12 space-y-8"
          >
            {/* Top Results Summary — 7 checks */}
            <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { label: 'Bending', val: results.bendingResistance, icon: <FiTarget /> },
                {
                  label: 'LT Buckling',
                  val: results.lateralTorsionalBuckling,
                  icon: <FiActivity />,
                },
                { label: 'Shear', val: results.shearResistance, icon: <FiBarChart2 /> },
                { label: 'Shear Buckling', val: results.shearBuckling, icon: <FiLayers /> },
                { label: 'Deflection', val: results.deflection, icon: <FiZap /> },
                { label: 'Interaction', val: results.interaction, icon: <FiSliders /> },
                { label: 'Web Bearing', val: results.webBearing, icon: <FiPackage /> },
              ].map((item, i) => (
                <Card
                  key={i}
                  variant="glass"
                  className={cn(
                    'border-l-4',
                    item.val.status === 'PASS' || item.val.status === 'OK'
                      ? 'border-l-green-500'
                      : 'border-l-red-500',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">{item.icon}</div>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                          item.val.status === 'PASS' || item.val.status === 'OK'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {item.val.status === 'OK' ? 'PASS' : item.val.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                    <p className="text-2xl font-black text-white">{item.val.utilisation}%</p>
                    {/* Utilisation bar */}
                    <div className="mt-2 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(parseFloat(item.val.utilisation), 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={cn(
                          'h-full rounded-full',
                          parseFloat(item.val.utilisation) > 100
                            ? 'bg-red-500'
                            : parseFloat(item.val.utilisation) > 80
                              ? 'bg-orange-500'
                              : 'bg-gradient-to-r from-neon-cyan to-neon-blue',
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Checks Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Cross-Section Properties */}
              <Card variant="glass" className="border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <FiLayers /> Cross-Section Properties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: 'Section Class',
                        value: `Class ${results.sectionProperties.sectionClass}`,
                      },
                      { label: 'Wpl,y', value: `${results.sectionProperties.Wpl} cm³` },
                      { label: 'Iy', value: `${results.sectionProperties.Iy} cm⁴` },
                      { label: 'Iz', value: `${results.sectionProperties.Iz} cm⁴` },
                      { label: 'Total Depth', value: `${results.sectionProperties.totalDepth} mm` },
                      { label: 'Area', value: `${results.sectionProperties.totalArea} cm²` },
                      {
                        label: 'Self-Weight',
                        value: `${results.sectionProperties.selfWeight} kN/m`,
                      },
                      {
                        label: 'Radius iy',
                        value: `${results.sectionProperties.radiusGyration} mm`,
                      },
                    ].map((prop, i) => (
                      <div key={i} className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 block mb-0.5 uppercase tracking-wider">
                          {prop.label}
                        </span>
                        <span className="text-sm font-bold text-white">{prop.value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-neon-cyan">
                    EN 1993-1-1 Cl. 5.5 | Flanges: Class {results.sectionProperties.flangeClass},
                    Web: Class {results.sectionProperties.webClass}
                  </p>
                </CardContent>
              </Card>

              {/* Load Effects */}
              <Card variant="glass" className="border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <FiZap /> Load Effects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      {
                        label: 'ULS Design Moment',
                        symbol: 'M_Ed',
                        value: results.loads.M_Ed_ULS,
                        unit: 'kNm',
                        color: 'text-neon-cyan',
                      },
                      {
                        label: 'ULS Design Shear',
                        symbol: 'V_Ed',
                        value: results.loads.V_Ed_ULS,
                        unit: 'kN',
                        color: 'text-neon-purple',
                      },
                      {
                        label: 'SLS Moment',
                        symbol: 'M_Ed,SLS',
                        value: results.loads.M_Ed_SLS,
                        unit: 'kNm',
                        color: 'text-gray-400',
                      },
                      {
                        label: 'SLS Shear',
                        symbol: 'V_Ed,SLS',
                        value: results.loads.V_Ed_SLS,
                        unit: 'kN',
                        color: 'text-gray-400',
                      },
                      {
                        label: 'Factored UDL',
                        symbol: 'q_Ed',
                        value: results.loads.q_ULS,
                        unit: 'kN/m',
                        color: 'text-gray-400',
                      },
                    ].map((load, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0"
                      >
                        <div>
                          <span className="text-xs text-gray-500 block">{load.label}</span>
                          <span className="text-xs font-mono text-gray-600">{load.symbol}</span>
                        </div>
                        <span className={cn('font-bold', load.color)}>
                          {load.value} {load.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-gray-500">
                    BS EN 1990 | γG = 1.35, γQ = 1.50
                  </p>
                </CardContent>
              </Card>

              {/* Bending & LTB Detail */}
              <Card variant="glass" className="border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <FiTarget /> Bending & LTB
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-500 block mb-0.5 uppercase">
                        Mc,Rd
                      </span>
                      <span className="text-sm font-bold text-white">
                        {results.bendingResistance.Mc_Rd} kNm
                      </span>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-500 block mb-0.5 uppercase">
                        Mb,Rd
                      </span>
                      <span className="text-sm font-bold text-white">
                        {results.lateralTorsionalBuckling.Mb_Rd} kNm
                      </span>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-500 block mb-0.5 uppercase">Mcr</span>
                      <span className="text-sm font-bold text-white">
                        {results.lateralTorsionalBuckling.Mcr} kNm
                      </span>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-500 block mb-0.5 uppercase">λ̄LT</span>
                      <span className="text-sm font-bold text-white">
                        {results.lateralTorsionalBuckling.lambda_LT}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-neon-cyan">
                    χLT = {results.lateralTorsionalBuckling.chi_LT} | EN 1993-1-1 Cl. 6.3.2
                  </p>
                </CardContent>
              </Card>

              {/* Shear & Deflection Detail */}
              <Card variant="glass" className="border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <FiBarChart2 /> Shear & Deflection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-500 block mb-0.5 uppercase">
                        Vpl,Rd
                      </span>
                      <span className="text-sm font-bold text-white">
                        {results.shearResistance.Vpl_Rd} kN
                      </span>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-500 block mb-0.5 uppercase">
                        Vb,Rd
                      </span>
                      <span className="text-sm font-bold text-white">
                        {results.shearBuckling.Vb_Rd} kN
                      </span>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-500 block mb-0.5 uppercase">
                        δ actual
                      </span>
                      <span className="text-sm font-bold text-white">
                        {results.deflection.actual} mm
                      </span>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-500 block mb-0.5 uppercase">
                        δ limit
                      </span>
                      <span className="text-sm font-bold text-white">
                        {results.deflection.limit} mm ({results.deflection.ratio})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-gray-500">
                    hw/tw = {results.shearBuckling.hw_tw_ratio} (limit:{' '}
                    {results.shearBuckling.hw_tw_limit}) | χw = {results.shearBuckling.chi_w}
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'diagrams' && results && (
          <motion.div
            key="diagrams"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-12 space-y-8"
          >
            {/* Cross-Section Diagram */}
            <Card variant="glass" className="border-neon-cyan/30 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                  <FiLayers /> Cross-Section
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-96 bg-gray-950 p-6 flex items-center justify-center">
                  <svg viewBox="0 0 500 400" className="w-full h-full">
                    {/* I-Section Drawing */}
                    {(() => {
                      const hw_v = parseFloat(formData.webDepth) || 1200;
                      const tw_v = parseFloat(formData.webThickness) || 15;
                      const bf_v = parseFloat(formData.flangeWidth) || 500;
                      const tf_v = parseFloat(formData.flangeThickness) || 25;
                      const h_v = hw_v + 2 * tf_v;
                      // Scale to fit
                      const scale = Math.min(300 / h_v, 350 / bf_v);
                      const cx = 250;
                      const cy = 200;
                      const sdH = h_v * scale;
                      const sdBf = bf_v * scale;
                      const sdTw = Math.max(tw_v * scale, 4);
                      const sdTf = Math.max(tf_v * scale, 6);
                      return (
                        <>
                          {/* Top Flange */}
                          <rect
                            x={cx - sdBf / 2}
                            y={cy - sdH / 2}
                            width={sdBf}
                            height={sdTf}
                            fill="rgba(0, 217, 255, 0.3)"
                            stroke="#00D9FF"
                            strokeWidth="1.5"
                          />
                          {/* Web */}
                          <rect
                            x={cx - sdTw / 2}
                            y={cy - sdH / 2 + sdTf}
                            width={sdTw}
                            height={sdH - 2 * sdTf}
                            fill="rgba(0, 217, 255, 0.15)"
                            stroke="#00D9FF"
                            strokeWidth="1.5"
                          />
                          {/* Bottom Flange */}
                          <rect
                            x={cx - sdBf / 2}
                            y={cy + sdH / 2 - sdTf}
                            width={sdBf}
                            height={sdTf}
                            fill="rgba(0, 217, 255, 0.3)"
                            stroke="#00D9FF"
                            strokeWidth="1.5"
                          />
                          {/* Dimension lines: Total Depth */}
                          <line
                            x1={cx + sdBf / 2 + 20}
                            y1={cy - sdH / 2}
                            x2={cx + sdBf / 2 + 20}
                            y2={cy + sdH / 2}
                            stroke="#6B7280"
                            strokeWidth="1"
                          />
                          <line
                            x1={cx + sdBf / 2 + 15}
                            y1={cy - sdH / 2}
                            x2={cx + sdBf / 2 + 25}
                            y2={cy - sdH / 2}
                            stroke="#6B7280"
                            strokeWidth="1"
                          />
                          <line
                            x1={cx + sdBf / 2 + 15}
                            y1={cy + sdH / 2}
                            x2={cx + sdBf / 2 + 25}
                            y2={cy + sdH / 2}
                            stroke="#6B7280"
                            strokeWidth="1"
                          />
                          <text
                            x={cx + sdBf / 2 + 30}
                            y={cy + 4}
                            fill="#00D9FF"
                            fontSize="11"
                            fontWeight="bold"
                          >
                            {h_v.toFixed(0)} mm
                          </text>
                          {/* Dimension lines: Flange Width */}
                          <line
                            x1={cx - sdBf / 2}
                            y1={cy - sdH / 2 - 15}
                            x2={cx + sdBf / 2}
                            y2={cy - sdH / 2 - 15}
                            stroke="#6B7280"
                            strokeWidth="1"
                          />
                          <line
                            x1={cx - sdBf / 2}
                            y1={cy - sdH / 2 - 20}
                            x2={cx - sdBf / 2}
                            y2={cy - sdH / 2 - 10}
                            stroke="#6B7280"
                            strokeWidth="1"
                          />
                          <line
                            x1={cx + sdBf / 2}
                            y1={cy - sdH / 2 - 20}
                            x2={cx + sdBf / 2}
                            y2={cy - sdH / 2 - 10}
                            stroke="#6B7280"
                            strokeWidth="1"
                          />
                          <text
                            x={cx}
                            y={cy - sdH / 2 - 22}
                            fill="#A855F7"
                            fontSize="11"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {bf_v.toFixed(0)} mm
                          </text>
                          {/* Web depth callout */}
                          <line
                            x1={cx - sdBf / 2 - 20}
                            y1={cy - sdH / 2 + sdTf}
                            x2={cx - sdBf / 2 - 20}
                            y2={cy + sdH / 2 - sdTf}
                            stroke="#6B7280"
                            strokeWidth="1"
                            strokeDasharray="4,2"
                          />
                          <text
                            x={cx - sdBf / 2 - 25}
                            y={cy + 4}
                            fill="#6B7280"
                            fontSize="10"
                            textAnchor="end"
                          >
                            hw={hw_v.toFixed(0)}
                          </text>
                          {/* Thickness callouts */}
                          <text x={cx + sdTw / 2 + 8} y={cy} fill="#6B7280" fontSize="9">
                            tw={tw_v.toFixed(0)}
                          </text>
                          <text
                            x={cx}
                            y={cy + sdH / 2 + 16}
                            fill="#6B7280"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            tf={tf_v.toFixed(0)}
                          </text>
                          {/* Centroid marker */}
                          <circle cx={cx} cy={cy} r="3" fill="#D4AF37" />
                          <text x={cx + 8} y={cy - 8} fill="#D4AF37" fontSize="9">
                            C.G.
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Bending Moment Diagram */}
              <Card variant="glass" className="border-neon-cyan/30 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <FiActivity /> Bending Moment Diagram
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80 bg-gray-950 p-6 relative">
                    <svg viewBox="0 0 500 250" className="w-full h-full">
                      {/* Baseline / Beam */}
                      <line
                        x1="50"
                        y1="60"
                        x2="450"
                        y2="60"
                        stroke="#374151"
                        strokeWidth="2"
                        strokeDasharray="6,3"
                      />
                      <line x1="50" y1="60" x2="450" y2="60" stroke="#6B7280" strokeWidth="3" />
                      {/* Support triangles */}
                      <polygon
                        points="50,60 40,78 60,78"
                        fill="none"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points="450,60 440,78 460,78"
                        fill="none"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                      />
                      {/* Moment curve (parabolic for UDL) */}
                      <path
                        d="M 50 60 Q 250 220 450 60"
                        fill="rgba(0, 217, 255, 0.08)"
                        stroke="#00D9FF"
                        strokeWidth="2.5"
                      />
                      {/* Peak annotation line */}
                      <line
                        x1="250"
                        y1="60"
                        x2="250"
                        y2="200"
                        stroke="#00D9FF"
                        strokeWidth="1"
                        strokeDasharray="4,3"
                      />
                      <circle cx="250" cy="200" r="4" fill="#00D9FF" />
                      {/* Value labels */}
                      <text
                        x="250"
                        y="230"
                        fill="#00D9FF"
                        fontSize="13"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        M_Ed = {results.loads.M_Ed_ULS} kNm
                      </text>
                      <text x="250" y="245" fill="#6B7280" fontSize="10" textAnchor="middle">
                        M_Rd = {results.bendingResistance.Mc_Rd} kNm (
                        {results.bendingResistance.utilisation}%)
                      </text>
                      {/* Span label */}
                      <line x1="50" y1="85" x2="450" y2="85" stroke="#4B5563" strokeWidth="0.5" />
                      <text x="250" y="98" fill="#6B7280" fontSize="10" textAnchor="middle">
                        L = {formData.span} m
                      </text>
                      {/* Zero labels */}
                      <text x="40" y="55" fill="#6B7280" fontSize="9" textAnchor="end">
                        0
                      </text>
                      <text x="460" y="55" fill="#6B7280" fontSize="9">
                        0
                      </text>
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* Shear Force Diagram */}
              <Card variant="glass" className="border-neon-purple/30 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <FiBarChart2 /> Shear Force Diagram
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80 bg-gray-950 p-6 relative">
                    <svg viewBox="0 0 500 250" className="w-full h-full">
                      {/* Baseline */}
                      <line
                        x1="50"
                        y1="125"
                        x2="450"
                        y2="125"
                        stroke="#374151"
                        strokeWidth="2"
                        strokeDasharray="6,3"
                      />
                      {/* Support triangles */}
                      <polygon
                        points="50,125 40,143 60,143"
                        fill="none"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points="450,125 440,143 460,143"
                        fill="none"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                      />
                      {/* Positive shear (left) */}
                      <path
                        d="M 50 125 L 50 45 L 250 125"
                        fill="rgba(34, 197, 94, 0.08)"
                        stroke="#22C55E"
                        strokeWidth="2"
                      />
                      {/* Negative shear (right) */}
                      <path
                        d="M 250 125 L 450 205 L 450 125"
                        fill="rgba(239, 68, 68, 0.08)"
                        stroke="#EF4444"
                        strokeWidth="2"
                      />
                      {/* Value labels */}
                      <text x="55" y="38" fill="#22C55E" fontSize="12" fontWeight="bold">
                        +{results.loads.V_Ed_ULS} kN
                      </text>
                      <text
                        x="445"
                        y="222"
                        fill="#EF4444"
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        -{results.loads.V_Ed_ULS} kN
                      </text>
                      {/* Zero crossing */}
                      <circle cx="250" cy="125" r="3" fill="#D4AF37" />
                      <text x="258" y="120" fill="#D4AF37" fontSize="9">
                        V = 0
                      </text>
                      {/* Capacity annotation */}
                      <text x="250" y="240" fill="#6B7280" fontSize="10" textAnchor="middle">
                        V_Rd = {results.shearResistance.Vpl_Rd} kN (
                        {results.shearResistance.utilisation}%)
                      </text>
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* Deflected Shape */}
              <Card variant="glass" className="border-neon-blue/30 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <FiActivity /> Deflected Shape (SLS)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-80 bg-gray-950 p-6 relative">
                    <svg viewBox="0 0 500 250" className="w-full h-full">
                      {/* Original beam (straight) */}
                      <line
                        x1="50"
                        y1="80"
                        x2="450"
                        y2="80"
                        stroke="#374151"
                        strokeWidth="2"
                        strokeDasharray="6,3"
                      />
                      {/* Supports */}
                      <polygon
                        points="50,80 40,98 60,98"
                        fill="none"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points="450,80 440,98 460,98"
                        fill="none"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                      />
                      {/* Deflected shape (sag) */}
                      <path
                        d="M 50 80 Q 250 170 450 80"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        strokeDasharray="8,4"
                      />
                      {/* Peak deflection arrow */}
                      <line x1="250" y1="80" x2="250" y2="155" stroke="#3B82F6" strokeWidth="1" />
                      <polygon points="250,155 246,148 254,148" fill="#3B82F6" />
                      {/* Deflection value */}
                      <text x="260" y="135" fill="#3B82F6" fontSize="12" fontWeight="bold">
                        δ = {results.deflection.actual} mm
                      </text>
                      <text x="260" y="150" fill="#6B7280" fontSize="10">
                        limit = {results.deflection.limit} mm
                      </text>
                      {/* Span-to-deflection ratio */}
                      <text
                        x="250"
                        y="200"
                        fill="#3B82F6"
                        fontSize="16"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {results.deflection.ratio}
                      </text>
                      <text x="250" y="215" fill="#6B7280" fontSize="10" textAnchor="middle">
                        (limit: L/360)
                      </text>
                      <text
                        x="250"
                        y="235"
                        fill={
                          parseFloat(results.deflection.utilisation) > 100 ? '#EF4444' : '#22C55E'
                        }
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {results.deflection.utilisation}% utilisation
                      </text>
                    </svg>
                  </div>
                </CardContent>
              </Card>

              {/* Utilisation Summary Bar Chart */}
              <Card variant="glass" className="border-gray-800 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <FiBarChart2 /> Utilisation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      label: 'Bending',
                      util: parseFloat(results.bendingResistance.utilisation),
                      ref: 'Cl. 6.2.5',
                    },
                    {
                      label: 'LTB',
                      util: parseFloat(results.lateralTorsionalBuckling.utilisation),
                      ref: 'Cl. 6.3.2',
                    },
                    {
                      label: 'Shear',
                      util: parseFloat(results.shearResistance.utilisation),
                      ref: 'Cl. 6.2.6',
                    },
                    {
                      label: 'Shear Buckling',
                      util: parseFloat(results.shearBuckling.utilisation),
                      ref: 'EN 1993-1-5',
                    },
                    {
                      label: 'Deflection',
                      util: parseFloat(results.deflection.utilisation),
                      ref: 'SLS',
                    },
                    {
                      label: 'Interaction',
                      util: parseFloat(results.interaction.utilisation),
                      ref: 'Cl. 6.2.8',
                    },
                    {
                      label: 'Web Bearing',
                      util: parseFloat(results.webBearing.utilisation),
                      ref: 'EN 1993-1-5',
                    },
                  ].map((check, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-400">{check.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 font-mono">{check.ref}</span>
                          <span
                            className={cn(
                              'text-xs font-bold',
                              check.util > 100
                                ? 'text-red-400'
                                : check.util > 80
                                  ? 'text-orange-400'
                                  : 'text-green-400',
                            )}
                          >
                            {check.util.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(check.util, 100)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08 }}
                          className={cn(
                            'h-full rounded-full',
                            check.util > 100
                              ? 'bg-red-500'
                              : check.util > 80
                                ? 'bg-orange-500'
                                : 'bg-gradient-to-r from-green-500 to-emerald-400',
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Export Button Section */}
        {results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-4 mt-12 pb-12"
          >
            <Button
              onClick={exportToPDF}
              variant="glass"
              className="px-8 py-4 border-neon-cyan/50 hover:bg-neon-cyan/20 font-bold group"
            >
              <FiDownload className="mr-2 group-hover:scale-110 transition-transform" size={20} />
              <span>PDF Report</span>
            </Button>
            <Button
              onClick={exportDOCX}
              variant="glass"
              className="px-8 py-4 border-purple-500/50 hover:bg-purple-500/20 font-bold group"
            >
              <FiDownload className="mr-2 group-hover:scale-110 transition-transform" size={20} />
              <span>DOCX Report</span>
            </Button>
            <SaveRunButton
              calculatorKey="steel_plate_girder"
              inputs={formData as unknown as Record<string, string>}
              results={results}
              status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
              summary={results ? `${results.maxUtilisation?.toFixed(1) || '-'}% util` : undefined}
            />
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

export default SteelPlateGirder;
