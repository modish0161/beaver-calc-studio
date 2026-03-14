import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiDownload,
  FiEye,
  FiInfo,
  FiLayers,
  FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import { TransverseMembers3D } from '../../components/3d/scenes';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { downloadPDF } from '../../lib/pdf';
import { buildTransverseMembersReport } from '../../lib/pdf/builders/transverseMembersBuilder';

interface FormData {
  memberType: string;
  span: string;
  depth: string;
  widthTop: string;
  widthBottom: string;
  webThickness: string;
  mainGirderSpacing: string;
  deckWidth: string;
  numberOfGirders: string;
  deadLoad: string;
  liveLoad: string;
  pointLoadDead: string;
  pointLoadLive: string;
  steelGrade: string;
  endConditions: string;
  deflectionLimit: string;
}

const PRESETS = {
  highway_crossbeam: {
    name: '🛣️ Highway Cross Beam (3.5m)',
    span: '3.5',
    memberType: 'cross_beam',
    spacing: '3.5',
    depth: '700',
    widthTop: '300',
    widthBottom: '250',
    webThickness: '12',
    deadLoad: '25',
    liveLoad: '40',
    steelGrade: 'S355',
  },
  rail_crossbeam: {
    name: '🚂 Rail Bridge Cross Beam (3.0m)',
    span: '3.0',
    memberType: 'cross_beam',
    spacing: '3.0',
    depth: '800',
    widthTop: '350',
    widthBottom: '300',
    webThickness: '14',
    deadLoad: '30',
    liveLoad: '60',
    steelGrade: 'S355',
  },
  footbridge_crossbeam: {
    name: '🚶 Footbridge Cross Beam (2.5m)',
    span: '2.5',
    memberType: 'cross_beam',
    spacing: '2.5',
    depth: '400',
    widthTop: '200',
    widthBottom: '180',
    webThickness: '8',
    deadLoad: '10',
    liveLoad: '15',
    steelGrade: 'S355',
  },
  diaphragm_plate: {
    name: '🌉 Intermediate Diaphragm',
    span: '3.5',
    memberType: 'diaphragm',
    spacing: '6.0',
    depth: '600',
    widthTop: '250',
    widthBottom: '250',
    webThickness: '10',
    deadLoad: '15',
    liveLoad: '25',
    steelGrade: 'S355',
  },
  end_diaphragm: {
    name: '🏗️ End Diaphragm (Bearing)',
    span: '3.5',
    memberType: 'diaphragm',
    spacing: '3.5',
    depth: '900',
    widthTop: '400',
    widthBottom: '350',
    webThickness: '16',
    deadLoad: '35',
    liveLoad: '50',
    steelGrade: 'S355',
  },
  viaduct_transverse: {
    name: '🏗️ Viaduct Transverse Beam (4m)',
    span: '4.0',
    memberType: 'beam',
    spacing: '4.0',
    depth: '1000',
    widthTop: '400',
    widthBottom: '350',
    webThickness: '14',
    deadLoad: '30',
    liveLoad: '45',
    steelGrade: 'S355',
  },
};

const TransverseMembers: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    memberType: 'beam',
    span: '8',
    depth: '800',
    widthTop: '400',
    widthBottom: '300',
    webThickness: '12',
    mainGirderSpacing: '3',
    deckWidth: '12',
    numberOfGirders: '4',
    deadLoad: '20',
    liveLoad: '30',
    pointLoadDead: '0',
    pointLoadLive: '0',
    steelGrade: 'S355',
    endConditions: 'continuous',
    deflectionLimit: 'L/300',
  });

  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyPreset = (key: string) => {
    const preset = PRESETS[key as keyof typeof PRESETS];
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        memberType: preset.memberType,
        span: preset.span,
        mainGirderSpacing: preset.spacing,
        depth: preset.depth,
        widthTop: preset.widthTop,
        widthBottom: preset.widthBottom,
        webThickness: preset.webThickness,
        deadLoad: preset.deadLoad,
        liveLoad: preset.liveLoad,
        steelGrade: preset.steelGrade,
      }));
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
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

  // ── Debounced auto-recalculation for What-If mode ──
  const doCalculation = useCallback(() => {
    // Simplified inline calculation (same engine, no UI feedback delays)
    const fd = formData;
    const span_mm = parseFloat(fd.span) * 1000;
    if (!span_mm || span_mm <= 0) return;
    const h = parseFloat(fd.depth);
    if (!h || h <= 0) return;
    const bTop = parseFloat(fd.widthTop) || 300;
    const bBot = parseFloat(fd.widthBottom) || 250;
    const tw = parseFloat(fd.webThickness) || 12;
    const spacing = parseFloat(fd.mainGirderSpacing) || 3;
    const wDL = parseFloat(fd.deadLoad) || 0;
    const wLL = parseFloat(fd.liveLoad) || 0;
    const P_DL = parseFloat(fd.pointLoadDead) || 0;
    const P_LL = parseFloat(fd.pointLoadLive) || 0;
    const fyMap: Record<string, number> = { S275: 275, S355: 355, S460: 460 };
    const fy = fyMap[fd.steelGrade] || 355;
    const gammaM0 = 1.0;
    const gammaM1 = 1.0;
    const tf = Math.max(((bTop + bBot) / 2 - tw) * 0.08, 10);
    const hw = h - 2 * tf;
    const A_top = bTop * tf;
    const A_bot = bBot * tf;
    const A_web = hw * tw;
    const A = A_top + A_bot + A_web;
    const y_bot = tf / 2;
    const y_web = tf + hw / 2;
    const y_top = tf + hw + tf / 2;
    const y_bar = (A_bot * y_bot + A_web * y_web + A_top * y_top) / A;
    const I_bot = (bBot * tf ** 3) / 12 + A_bot * (y_bar - y_bot) ** 2;
    const I_web = (tw * hw ** 3) / 12 + A_web * (y_bar - y_web) ** 2;
    const I_top = (bTop * tf ** 3) / 12 + A_top * (y_bar - y_top) ** 2;
    const Iy = I_bot + I_web + I_top;
    const W_pl = (bTop * tf * (h - tf) + (tw * hw ** 2) / 4 + bBot * tf * (h - tf)) / 2;
    const A_v = Math.max(A - 2 * bTop * tf + (tw + 0) * tf, tw * hw);
    const tributaryWidth = spacing;
    const w_DL_per_m = wDL * tributaryWidth;
    const w_LL_per_m = wLL * tributaryWidth;
    const total_DL = w_DL_per_m * parseFloat(fd.span);
    const total_LL = w_LL_per_m * parseFloat(fd.span);
    const gammaG = 1.35;
    const gammaQ = 1.5;
    const w_ULS = gammaG * w_DL_per_m + gammaQ * w_LL_per_m;
    const P_ULS_total = gammaG * P_DL + gammaQ * P_LL;
    const L = parseFloat(fd.span);
    let M_Ed: number, V_Ed: number;
    if (fd.endConditions === 'continuous') {
      M_Ed = (w_ULS * L ** 2) / 10 + (P_ULS_total * L) / 8;
      V_Ed = (w_ULS * L) / 2 + P_ULS_total / 2;
    } else {
      M_Ed = (w_ULS * L ** 2) / 8 + (P_ULS_total * L) / 4;
      V_Ed = (w_ULS * L) / 2 + P_ULS_total / 2;
    }
    const R_Ed = V_Ed;
    const M_pl_Rd = (W_pl * fy) / (gammaM0 * 1e6);
    const bendingUtil = (M_Ed / M_pl_Rd) * 100;
    const V_pl_Rd = (A_v * (fy / Math.sqrt(3))) / (gammaM0 * 1000);
    const shearUtil = (V_Ed / V_pl_Rd) * 100;
    const s_s = 50;
    const F_b_Rd =
      ((s_s + 2 * tf * (1 + Math.sqrt((fy * tf) / (tw * fy)))) * tw * fy) / (gammaM1 * 1000);
    const webBearingUtil = (R_Ed / F_b_Rd) * 100;
    const E = 210000;
    const w_SLS = w_DL_per_m + w_LL_per_m;
    const delta_actual = ((5 * w_SLS * (L * 1000) ** 4) / (384 * E * Iy)) * 1e-3;
    const deflLimitMap: Record<string, number> = {
      'L/200': 200,
      'L/250': 250,
      'L/300': 300,
      'L/350': 350,
      'L/400': 400,
      'L/500': 500,
    };
    const deflDiv = deflLimitMap[fd.deflectionLimit] || 300;
    const delta_limit = (L * 1000) / deflDiv;
    const deflectionUtil = (delta_actual / delta_limit) * 100;
    const Lcr = fd.endConditions === 'continuous' ? L * 1000 * 0.7 : L * 1000;
    const Iz_top = (tf * bTop ** 3) / 12;
    const Iz_bot = (tf * bBot ** 3) / 12;
    const Iz = Iz_top + Iz_bot + (hw * tw ** 3) / 12;
    const Iw = (Iz * (h - tf) ** 2) / 4;
    const It = (2 * bTop * tf ** 3 + hw * tw ** 3) / 3;
    const G = 81000;
    const Mcr =
      (Math.PI / Lcr) * Math.sqrt(E * Iz * G * It + ((Math.PI * E) / Lcr) ** 2 * E * Iz * Iw);
    const lambda_LT = Math.sqrt((W_pl * fy) / Mcr);
    const alpha_LT = 0.34;
    const phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT ** 2);
    const chi_LT = Math.min(1.0, 1 / (phi_LT + Math.sqrt(phi_LT ** 2 - lambda_LT ** 2)));
    const M_b_Rd = (chi_LT * W_pl * fy) / (gammaM1 * 1e6);
    const bucklingUtil = (M_Ed / M_b_Rd) * 100;
    const boltCap = fd.steelGrade === 'S460' ? 60 : 50;
    const boltsRequired = Math.ceil(R_Ed / boltCap);
    const overallPass =
      bendingUtil <= 100 &&
      shearUtil <= 100 &&
      webBearingUtil <= 100 &&
      deflectionUtil <= 100 &&
      bucklingUtil <= 100;
    const w: string[] = [];
    const recommendations: string[] = [];
    if (bucklingUtil > 100) {
      w.push(`High LTB utilisation (${bucklingUtil.toFixed(0)}%)`);
      recommendations.push('Add lateral restraints');
    }
    if (bendingUtil > 100) {
      w.push(`Bending capacity exceeded (${bendingUtil.toFixed(0)}%)`);
      recommendations.push('Increase depth or flange width');
    }
    if (shearUtil > 100) {
      w.push(`Shear capacity exceeded (${shearUtil.toFixed(0)}%)`);
      recommendations.push('Increase web thickness');
    }
    if (deflectionUtil > 100) {
      w.push(`Deflection limit exceeded`);
      recommendations.push('Increase member depth');
    }
    if (webBearingUtil > 100) {
      w.push(`Web bearing exceeded`);
      recommendations.push('Add bearing stiffeners');
    }
    if (overallPass) {
      recommendations.push('All checks pass — design is satisfactory');
    }

    const calcResults = {
      member_properties: {
        A: Math.round(A),
        I_y: Math.round(Iy / 1e4),
        W_pl: Math.round(W_pl),
        A_v: Math.round(A_v),
        h,
        b_top: bTop,
        b_bottom: bBot,
        t_w: tw,
        t_f: Math.round(tf * 10) / 10,
      },
      load_distribution: {
        tributary_width: tributaryWidth,
        w_DL_per_m: Math.round(w_DL_per_m * 10) / 10,
        w_LL_per_m: Math.round(w_LL_per_m * 10) / 10,
        P_DL_per_girder: P_DL,
        P_LL_per_girder: P_LL,
        total_DL: Math.round(total_DL * 10) / 10,
        total_LL: Math.round(total_LL * 10) / 10,
      },
      design_actions: {
        M_Ed: Math.round(M_Ed * 10) / 10,
        V_Ed: Math.round(V_Ed * 10) / 10,
        R_Ed: Math.round(R_Ed * 10) / 10,
        w_ULS: Math.round(w_ULS * 10) / 10,
        P_ULS_total: Math.round(P_ULS_total * 10) / 10,
      },
      bending_resistance_check: {
        M_pl_Rd: Math.round(M_pl_Rd * 10) / 10,
        utilisation: Math.round(bendingUtil * 10) / 10,
        status: bendingUtil <= 100 ? 'PASS' : 'FAIL',
      },
      shear_resistance_check: {
        V_pl_Rd: Math.round(V_pl_Rd * 10) / 10,
        utilisation: Math.round(shearUtil * 10) / 10,
        status: shearUtil <= 100 ? 'PASS' : 'FAIL',
      },
      web_bearing_check: {
        F_b_Rd: Math.round(F_b_Rd * 10) / 10,
        utilisation: Math.round(webBearingUtil * 10) / 10,
        status: webBearingUtil <= 100 ? 'PASS' : 'FAIL',
      },
      deflection_check: {
        delta_actual: Math.round(delta_actual * 10) / 10,
        delta_limit: Math.round(delta_limit * 10) / 10,
        utilisation: Math.round(deflectionUtil * 10) / 10,
        status: deflectionUtil <= 100 ? 'PASS' : 'FAIL',
      },
      buckling_check: {
        M_b_Rd: Math.round(M_b_Rd * 10) / 10,
        L_cr: Math.round(Lcr) / 1000,
        utilisation: Math.round(bucklingUtil * 10) / 10,
        status: bucklingUtil <= 100 ? 'PASS' : 'FAIL',
      },
      connection_design: {
        connection_type: 'Bolted',
        reaction_per_connection: Math.round(R_Ed * 10) / 10,
        bolts_required: boltsRequired,
        bolt_grade: '8.8',
        bolt_diameter: 'M20',
        weld_size: tw <= 10 ? '6mm' : '8mm',
      },
      utilisation_summary: {
        bending: Math.round(bendingUtil * 10) / 10,
        shear: Math.round(shearUtil * 10) / 10,
        web_bearing: Math.round(webBearingUtil * 10) / 10,
        deflection: Math.round(deflectionUtil * 10) / 10,
        lt_buckling: Math.round(bucklingUtil * 10) / 10,
      },
      overall_check: overallPass,
      recommendations,
      warnings: w,
      notes: [
        'EN 1993-1-1 §6.2.5 Bending resistance',
        'EN 1993-1-1 §6.2.6 Shear resistance',
        'EN 1993-1-1 §6.3.2 Lateral-torsional buckling',
        `Member type: ${fd.memberType}`,
        `End conditions: ${fd.endConditions}`,
        `f_y = ${fy} N/mm², γ_M0 = ${gammaM0}, γ_M1 = ${gammaM1}`,
      ],
    };
    setResults(calcResults);
    setWarnings(calcResults.warnings || []);
  }, [formData]);

  // Debounced auto-recalculation for What-If sliders
  useEffect(() => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    calcTimerRef.current = setTimeout(() => {
      doCalculation();
    }, 150);
    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [formData, doCalculation]);

  // Helper function to generate recommendations for failed checks
  const getRecommendation = (checkType: string, utilisation: number, results: any): string => {
    if (utilisation < 100) return '';

    switch (checkType) {
      case 'bending':
        return 'Consider: 1) Increase member depth, 2) Use wider flanges, 3) Use higher strength steel, 4) Add intermediate supports';

      case 'shear':
        return 'Consider: 1) Increase web thickness, 2) Use steel plates to strengthen web, 3) Reduce applied loads';

      case 'webBearing':
        return 'Consider: 1) Add bearing stiffeners, 2) Increase bearing length, 3) Use bearing plates';

      case 'deflection':
        return 'Consider: 1) Increase member depth significantly, 2) Add intermediate diaphragms, 3) Use stiffer sections';

      case 'buckling':
        return 'Consider: 1) Add lateral restraints, 2) Use continuous end conditions, 3) Increase flange size';

      default:
        return 'Consider reviewing member dimensions or reducing applied loads';
    }
  };

  // PDF Export — Premium @react-pdf/renderer
  // ─────────────────────────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    if (!results) return;
    const reportData = buildTransverseMembersReport(formData as any, results, warnings, {
      projectName: 'Transverse Members Design',
      documentRef: 'TRA001',
    });
    await downloadPDF(
      reportData as any,
      `TransverseMembers_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  };

  // DOCX Export — Editable Word document
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Transverse Members Design',
      subtitle: 'EN 1993-1-1 Compliant',
      projectInfo: [
        { label: 'Member Type', value: formData.memberType },
        { label: 'Span', value: `${formData.span} m` },
      ],
      inputs: [
        { label: 'Member Type', value: formData.memberType, unit: '' },
        { label: 'Span', value: formData.span, unit: 'm' },
        { label: 'Depth', value: formData.depth, unit: 'mm' },
        { label: 'Width Top', value: formData.widthTop, unit: 'mm' },
        { label: 'Web Thickness', value: formData.webThickness, unit: 'mm' },
        { label: 'Girder Spacing', value: formData.mainGirderSpacing, unit: 'm' },
        { label: 'Dead Load', value: formData.deadLoad, unit: 'kN/m' },
        { label: 'Live Load', value: formData.liveLoad, unit: 'kN/m' },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `${results.bending_resistance_check?.M_Ed?.toFixed(1) || '-'} kNm`,
          utilisation: `${results.bending_resistance_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.bending_resistance_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `${results.shear_resistance_check?.V_Ed?.toFixed(1) || '-'} kN`,
          utilisation: `${results.shear_resistance_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.shear_resistance_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Web Bearing',
          capacity: `${results.web_bearing_check?.F_Rd?.toFixed(1) || '-'} kN`,
          utilisation: `${results.web_bearing_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.web_bearing_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `${results.deflection_check?.actual_deflection?.toFixed(2) || '-'} mm`,
          utilisation: `${results.deflection_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.deflection_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'LT Buckling',
          capacity: `${results.buckling_check?.chi_LT?.toFixed(3) || '-'}`,
          utilisation: `${results.buckling_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.buckling_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${results.maxUtilisation?.toFixed(1) || '-'}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        { check: 'Deflection', suggestion: 'Increase section depth if deflection governs' },
        {
          check: 'LT Buckling',
          suggestion: 'Provide closer lateral restraints for slender members',
        },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Transverse Members Design',
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.span || parseFloat(formData.span) <= 0) {
      errors.span = 'Span must be greater than 0';
    }
    if (!formData.depth || parseFloat(formData.depth) <= 0) {
      errors.depth = 'Depth must be greater than 0';
    }
    if (!formData.mainGirderSpacing || parseFloat(formData.mainGirderSpacing) <= 0) {
      errors.mainGirderSpacing = 'Girder spacing must be greater than 0';
    }
    if (!formData.numberOfGirders || parseInt(formData.numberOfGirders) < 2) {
      errors.numberOfGirders = 'Must have at least 2 girders';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateResults = async () => {
    if (!validateForm()) return;

    setIsCalculating(true);

    // EN 1993-1-1 calculation engine
    const run = () => {
      const fd = formData;
      const span = parseFloat(fd.span) * 1000; // mm
      const h = parseFloat(fd.depth); // mm
      const bTop = parseFloat(fd.widthTop); // mm
      const bBot = parseFloat(fd.widthBottom); // mm
      const tw = parseFloat(fd.webThickness); // mm
      const spacing = parseFloat(fd.mainGirderSpacing); // m
      const nGirders = parseInt(fd.numberOfGirders);
      const wDL = parseFloat(fd.deadLoad); // kN/m
      const wLL = parseFloat(fd.liveLoad); // kN/m
      const P_DL = parseFloat(fd.pointLoadDead) || 0; // kN
      const P_LL = parseFloat(fd.pointLoadLive) || 0; // kN

      // Steel yield strength
      const fyMap: Record<string, number> = { S275: 275, S355: 355, S460: 460 };
      const fy = fyMap[fd.steelGrade] || 355;
      const gammaM0 = 1.0; // EN 1993-1-1 §6.1
      const gammaM1 = 1.0;

      // Assume symmetric I-section with given flange widths
      // Flange thickness estimated from total depth, web, and flanges
      const tf = Math.max(((bTop + bBot) / 2 - tw) * 0.08, 10); // approx flange thickness
      const hw = h - 2 * tf; // web clear height

      // Section properties (I-section with potentially unequal flanges)
      const A_top = bTop * tf;
      const A_bot = bBot * tf;
      const A_web = hw * tw;
      const A = A_top + A_bot + A_web;

      // Centroid from bottom
      const y_bot = tf / 2;
      const y_web = tf + hw / 2;
      const y_top = tf + hw + tf / 2;
      const y_bar = (A_bot * y_bot + A_web * y_web + A_top * y_top) / A;

      // Second moment of area
      const I_bot = (bBot * tf ** 3) / 12 + A_bot * (y_bar - y_bot) ** 2;
      const I_web = (tw * hw ** 3) / 12 + A_web * (y_bar - y_web) ** 2;
      const I_top = (bTop * tf ** 3) / 12 + A_top * (y_bar - y_top) ** 2;
      const Iy = I_bot + I_web + I_top; // mm⁴

      // Plastic section modulus (approximate for doubly symmetric)
      const W_pl = (bTop * tf * (h - tf) + (tw * hw ** 2) / 4 + bBot * tf * (h - tf)) / 2;

      // Shear area EN 1993-1-1 §6.2.6
      const A_v = Math.max(A - 2 * bTop * tf + (tw + 0) * tf, tw * hw);

      // ── Load distribution ──
      const tributaryWidth = spacing; // m
      const w_DL_per_m = wDL * tributaryWidth; // kN/m along transverse beam
      const w_LL_per_m = wLL * tributaryWidth;
      const total_DL = w_DL_per_m * parseFloat(fd.span); // kN (total)
      const total_LL = w_LL_per_m * parseFloat(fd.span);

      // ULS load combination EN 1990 Eq 6.10
      const gammaG = 1.35;
      const gammaQ = 1.5;
      const w_ULS = gammaG * w_DL_per_m + gammaQ * w_LL_per_m; // kN/m
      const P_ULS_total = gammaG * P_DL + gammaQ * P_LL; // kN (point load)

      // ── Design actions (simply supported beam under UDL + midspan point) ──
      const L = parseFloat(fd.span); // m

      let M_Ed: number, V_Ed: number;
      if (fd.endConditions === 'continuous') {
        M_Ed = (w_ULS * L ** 2) / 10 + (P_ULS_total * L) / 8; // kN·m (approx continuous)
        V_Ed = (w_ULS * L) / 2 + P_ULS_total / 2;
      } else {
        M_Ed = (w_ULS * L ** 2) / 8 + (P_ULS_total * L) / 4; // kN·m
        V_Ed = (w_ULS * L) / 2 + P_ULS_total / 2;
      }

      const R_Ed = V_Ed; // reaction = shear at supports

      // ── Bending resistance EN 1993-1-1 §6.2.5 ──
      const M_pl_Rd = (W_pl * fy) / (gammaM0 * 1e6); // kN·m
      const bendingUtil = (M_Ed / M_pl_Rd) * 100;

      // ── Shear resistance EN 1993-1-1 §6.2.6 ──
      const V_pl_Rd = (A_v * (fy / Math.sqrt(3))) / (gammaM0 * 1000); // kN
      const shearUtil = (V_Ed / V_pl_Rd) * 100;

      // ── Web bearing / transverse force EN 1993-1-1 §6.2.4 & simplified web crippling ──
      const s_s = 50; // assumed bearing length mm
      const F_b_Rd =
        ((s_s + 2 * tf * (1 + Math.sqrt((fy * tf) / (tw * fy)))) * tw * fy) / (gammaM1 * 1000); // kN simplified
      const webBearingUtil = (R_Ed / F_b_Rd) * 100;

      // ── Deflection check (SLS) EN 1993-1-1 ──
      const E = 210000; // N/mm²
      const w_SLS = w_DL_per_m + w_LL_per_m; // kN/m unfactored
      const delta_actual = ((5 * w_SLS * (L * 1000) ** 4) / (384 * E * Iy)) * 1e-3; // mm (w in N/mm)
      const deflLimitMap: Record<string, number> = {
        'L/200': 200,
        'L/250': 250,
        'L/300': 300,
        'L/350': 350,
        'L/400': 400,
        'L/500': 500,
      };
      const deflDiv = deflLimitMap[fd.deflectionLimit] || 300;
      const delta_limit = (L * 1000) / deflDiv;
      const deflectionUtil = (delta_actual / delta_limit) * 100;

      // ── Lateral-torsional buckling EN 1993-1-1 §6.3.2 ──
      const Lcr = fd.endConditions === 'continuous' ? L * 1000 * 0.7 : L * 1000; // mm
      const Iz_top = (tf * bTop ** 3) / 12;
      const Iz_bot = (tf * bBot ** 3) / 12;
      const Iz = Iz_top + Iz_bot + (hw * tw ** 3) / 12;
      const Iw = (Iz * (h - tf) ** 2) / 4; // warping constant approx
      const It = (2 * bTop * tf ** 3 + hw * tw ** 3) / 3; // torsion constant approx
      const G = 81000; // N/mm²
      const Mcr =
        (Math.PI / Lcr) * Math.sqrt(E * Iz * G * It + ((Math.PI * E) / Lcr) ** 2 * E * Iz * Iw);
      const Mcr_kNm = Mcr / 1e6;
      const lambda_LT = Math.sqrt((W_pl * fy) / Mcr);
      const alpha_LT = 0.34; // buckling curve b (rolled I)
      const phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT ** 2);
      const chi_LT = Math.min(1.0, 1 / (phi_LT + Math.sqrt(phi_LT ** 2 - lambda_LT ** 2)));
      const M_b_Rd = (chi_LT * W_pl * fy) / (gammaM1 * 1e6);
      const bucklingUtil = (M_Ed / M_b_Rd) * 100;

      // ── Connection design (simplified) ──
      const boltCap = fd.steelGrade === 'S460' ? 60 : 50; // kN per M20 8.8
      const boltsRequired = Math.ceil(R_Ed / boltCap);

      const overallPass =
        bendingUtil <= 100 &&
        shearUtil <= 100 &&
        webBearingUtil <= 100 &&
        deflectionUtil <= 100 &&
        bucklingUtil <= 100;

      const warnings: string[] = [];
      const recommendations: string[] = [];
      if (bucklingUtil > 100) {
        warnings.push(`High LTB utilisation (${bucklingUtil.toFixed(0)}%)`);
        recommendations.push('Add lateral restraints to prevent buckling failure');
      }
      if (bendingUtil > 100) {
        warnings.push(`Bending capacity exceeded (${bendingUtil.toFixed(0)}%)`);
        recommendations.push('Increase member depth or flange width');
      }
      if (shearUtil > 100) {
        warnings.push(`Shear capacity exceeded (${shearUtil.toFixed(0)}%)`);
        recommendations.push('Increase web thickness');
      }
      if (deflectionUtil > 100) {
        warnings.push(`Deflection limit exceeded`);
        recommendations.push('Increase member depth to reduce deflection');
      }
      if (webBearingUtil > 100) {
        warnings.push(`Web bearing exceeded`);
        recommendations.push('Add bearing stiffeners at supports');
      }
      if (bucklingUtil <= 100 && bendingUtil <= 100 && shearUtil <= 100) {
        recommendations.push('All checks pass — member design is satisfactory');
      }

      const calcResults = {
        member_properties: {
          A: Math.round(A),
          I_y: Math.round(Iy / 1e4), // cm⁴
          W_pl: Math.round(W_pl),
          A_v: Math.round(A_v),
          h,
          b_top: bTop,
          b_bottom: bBot,
          t_w: tw,
          t_f: Math.round(tf * 10) / 10,
        },
        load_distribution: {
          tributary_width: tributaryWidth,
          w_DL_per_m: Math.round(w_DL_per_m * 10) / 10,
          w_LL_per_m: Math.round(w_LL_per_m * 10) / 10,
          P_DL_per_girder: P_DL,
          P_LL_per_girder: P_LL,
          total_DL: Math.round(total_DL * 10) / 10,
          total_LL: Math.round(total_LL * 10) / 10,
        },
        design_actions: {
          M_Ed: Math.round(M_Ed * 10) / 10,
          V_Ed: Math.round(V_Ed * 10) / 10,
          R_Ed: Math.round(R_Ed * 10) / 10,
          w_ULS: Math.round(w_ULS * 10) / 10,
          P_ULS_total: Math.round(P_ULS_total * 10) / 10,
        },
        bending_resistance_check: {
          M_pl_Rd: Math.round(M_pl_Rd * 10) / 10,
          utilisation: Math.round(bendingUtil * 10) / 10,
          status: bendingUtil <= 100 ? 'PASS' : 'FAIL',
        },
        shear_resistance_check: {
          V_pl_Rd: Math.round(V_pl_Rd * 10) / 10,
          utilisation: Math.round(shearUtil * 10) / 10,
          status: shearUtil <= 100 ? 'PASS' : 'FAIL',
        },
        web_bearing_check: {
          F_b_Rd: Math.round(F_b_Rd * 10) / 10,
          utilisation: Math.round(webBearingUtil * 10) / 10,
          status: webBearingUtil <= 100 ? 'PASS' : 'FAIL',
        },
        deflection_check: {
          delta_actual: Math.round(delta_actual * 10) / 10,
          delta_limit: Math.round(delta_limit * 10) / 10,
          utilisation: Math.round(deflectionUtil * 10) / 10,
          status: deflectionUtil <= 100 ? 'PASS' : 'FAIL',
        },
        buckling_check: {
          M_b_Rd: Math.round(M_b_Rd * 10) / 10,
          L_cr: Math.round(Lcr) / 1000,
          utilisation: Math.round(bucklingUtil * 10) / 10,
          status: bucklingUtil <= 100 ? 'PASS' : 'FAIL',
        },
        connection_design: {
          connection_type: 'Bolted',
          reaction_per_connection: Math.round(R_Ed * 10) / 10,
          bolts_required: boltsRequired,
          bolt_grade: '8.8',
          bolt_diameter: 'M20',
          weld_size: tw <= 10 ? '6mm' : '8mm',
        },
        utilisation_summary: {
          bending: Math.round(bendingUtil * 10) / 10,
          shear: Math.round(shearUtil * 10) / 10,
          web_bearing: Math.round(webBearingUtil * 10) / 10,
          deflection: Math.round(deflectionUtil * 10) / 10,
        },
        overall_check: overallPass,
        recommendations,
        warnings,
        notes: [
          'EN 1993-1-1 §6.2.5 Bending resistance',
          'EN 1993-1-1 §6.2.6 Shear resistance',
          'EN 1993-1-1 §6.3.2 Lateral-torsional buckling',
          `Member type: ${fd.memberType}`,
          `End conditions: ${fd.endConditions}`,
          `f_y = ${fy} N/mm², γ_M0 = ${gammaM0}, γ_M1 = ${gammaM1}`,
        ],
      };

      setResults(calcResults);
      setWarnings(calcResults.warnings || []);
      setActiveTab('results');
      setIsCalculating(false);
    };

    // Small delay for UI feedback
    setTimeout(run, 300);
  };

  // Compute max utilisation for 3D visualisation
  const maxUtil = results
    ? Math.max(
        results.bending_resistance_check.utilisation,
        results.shear_resistance_check.utilisation,
        results.web_bearing_check.utilisation,
        results.deflection_check.utilisation,
        results.buckling_check.utilisation,
      )
    : 0;
  const overallStatus: 'PASS' | 'FAIL' = results
    ? results.overall_check
      ? 'PASS'
      : 'FAIL'
    : 'PASS';

  // What-If slider definitions
  const whatIfSliders = [
    { key: 'span' as const, label: 'Span', min: 1, max: 12, step: 0.1, unit: 'm' },
    { key: 'depth' as const, label: 'Depth', min: 200, max: 1500, step: 10, unit: 'mm' },
    { key: 'widthTop' as const, label: 'Top Flange', min: 100, max: 600, step: 5, unit: 'mm' },
    { key: 'widthBottom' as const, label: 'Bot Flange', min: 100, max: 600, step: 5, unit: 'mm' },
    { key: 'webThickness' as const, label: 'Web t_w', min: 6, max: 25, step: 0.5, unit: 'mm' },
    { key: 'deadLoad' as const, label: 'Dead Load', min: 0, max: 60, step: 1, unit: 'kN/m' },
    { key: 'liveLoad' as const, label: 'Live Load', min: 0, max: 80, step: 1, unit: 'kN/m' },
  ];

  const inputFields = [
    {
      key: 'span',
      label: 'Span Length',
      unit: 'm',
      icon: '📏',
      description: 'Transverse member span',
    },
    {
      key: 'depth',
      label: 'Member Depth',
      unit: 'mm',
      icon: '📐',
      description: 'Total member depth',
    },
    {
      key: 'widthTop',
      label: 'Top Width',
      unit: 'mm',
      icon: '↔️',
      description: 'Top flange width',
    },
    {
      key: 'widthBottom',
      label: 'Bottom Width',
      unit: 'mm',
      icon: '⬜',
      description: 'Bottom flange width',
    },
    {
      key: 'webThickness',
      label: 'Web Thickness',
      unit: 'mm',
      icon: '▭',
      description: 'Web plate thickness',
    },
    {
      key: 'mainGirderSpacing',
      label: 'Girder Spacing',
      unit: 'm',
      icon: '🔗',
      description: 'Spacing between main girders',
    },
    {
      key: 'numberOfGirders',
      label: 'Number of Girders',
      unit: '',
      icon: '📊',
      description: 'Total number of main girders',
    },
    {
      key: 'deadLoad',
      label: 'Dead Load',
      unit: 'kN/m',
      icon: '⬇️',
      description: 'Dead load from deck',
    },
    {
      key: 'liveLoad',
      label: 'Live Load',
      unit: 'kN/m',
      icon: '⚡',
      description: 'Live load from deck',
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
            <span className="text-white font-semibold">EN 1993-1-1 | Eurocode 3</span>
          </motion.div>

          <h1 className="text-6xl font-black mb-6">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Transverse Members
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            EN 1993-2 transverse member design
          </p>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-8 mt-8">
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
          <div className="flex items-center justify-center space-x-6 mt-8">
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Load Distribution</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Connection Design</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Web Bearing</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Stability Analysis</span>
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
                {/* Member Geometry Card */}
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
                        <span>Member Geometry & Bridge Configuration</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🏗️</span>
                            <span>Member Type</span>
                          </label>
                          <select
                            title="Member Type"
                            value={formData.memberType}
                            onChange={(e) => handleInputChange('memberType', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                          >
                            <option value="beam">Transverse Beam</option>
                            <option value="diaphragm">Diaphragm</option>
                            <option value="cross_beam">Cross Beam</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🔩</span>
                            <span>Steel Grade</span>
                          </label>
                          <select
                            title="Steel Grade"
                            value={formData.steelGrade}
                            onChange={(e) => handleInputChange('steelGrade', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                          >
                            <option value="S275">S275 (f_y = 275 N/mm²)</option>
                            <option value="S355">S355 (f_y = 355 N/mm²)</option>
                            <option value="S460">S460 (f_y = 460 N/mm²)</option>
                          </select>
                        </div>

                        {inputFields.slice(0, 7).map((field, index) => (
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
                                  value={formData[field.key as keyof FormData]}
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

                {/* Loading Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiZap className="text-white" size={24} />
                        </motion.div>
                        <span>Loading from Bridge Deck</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {inputFields.slice(7).map((field, index) => (
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
                                  value={formData[field.key as keyof FormData]}
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
                        <span>Calculating...</span>
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

              {/* Bridge Visualization - 1 column */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1 space-y-4"
              >
                <WhatIfPreview
                  title="Bridge Section"
                  renderScene={(h) => (
                    <Interactive3DDiagram height={h} cameraPosition={[4, 3, 4]}>
                      <TransverseMembers3D
                        span={parseFloat(formData.span) || 3.5}
                        depth={parseFloat(formData.depth) || 800}
                        widthTop={parseFloat(formData.widthTop) || 300}
                        widthBottom={parseFloat(formData.widthBottom) || 250}
                        webThickness={parseFloat(formData.webThickness) || 12}
                        girderSpacing={parseFloat(formData.mainGirderSpacing) || 3}
                        numberOfGirders={parseInt(formData.numberOfGirders) || 4}
                        deadLoad={parseFloat(formData.deadLoad) || 0}
                        liveLoad={parseFloat(formData.liveLoad) || 0}
                        endConditions={formData.endConditions}
                        steelGrade={formData.steelGrade}
                        memberType={formData.memberType}
                        utilisation={maxUtil}
                        status={overallStatus}
                      />
                    </Interactive3DDiagram>
                  )}
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={handleInputChange}
                  status={overallStatus}
                  utilisation={maxUtil}
                  liveReadout={
                    results
                      ? [
                          { label: 'Bend', value: results.bending_resistance_check.utilisation },
                          { label: 'Shear', value: results.shear_resistance_check.utilisation },
                          { label: 'Web', value: results.web_bearing_check.utilisation },
                          { label: 'Defl', value: results.deflection_check.utilisation },
                          { label: 'LTB', value: results.buckling_check.utilisation },
                        ]
                      : undefined
                  }
                />

                {/* Preset Selector */}
                <select
                  value=""
                  onChange={(e) => e.target.value && applyPreset(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm"
                  title="Quick Presets"
                >
                  <option value="">⚡ Quick Presets</option>
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <option key={key} value={key}>
                      {(p as any).name}
                    </option>
                  ))}
                </select>

                {/* Quick Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                    <span className="text-gray-400 text-sm">Member Type</span>
                    <span className="text-white font-bold">
                      {formData.memberType === 'beam'
                        ? 'Transverse Beam'
                        : formData.memberType === 'diaphragm'
                          ? 'Diaphragm'
                          : 'Cross Beam'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                    <span className="text-gray-400 text-sm">Girders</span>
                    <span className="text-white font-bold">
                      {formData.numberOfGirders ? `${formData.numberOfGirders} main girders` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                    <span className="text-gray-400 text-sm">Load Distribution</span>
                    <span className="text-white font-bold">
                      {formData.mainGirderSpacing ? `${formData.mainGirderSpacing}m spacing` : '—'}
                    </span>
                  </div>
                  {results && (
                    <div
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        results.overall_check
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-red-500/10 border-red-500/30',
                      )}
                    >
                      <span className="text-gray-400 text-sm">Overall</span>
                      <span
                        className={cn(
                          'font-bold',
                          results.overall_check ? 'text-green-400' : 'text-red-400',
                        )}
                      >
                        {results.overall_check ? '✓ PASS' : '✗ FAIL'} — {maxUtil.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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

            {/* Border-l-4 Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                {
                  label: 'Bending',
                  util: results.bending_resistance_check.utilisation,
                  status: results.bending_resistance_check.status,
                },
                {
                  label: 'Shear',
                  util: results.shear_resistance_check.utilisation,
                  status: results.shear_resistance_check.status,
                },
                {
                  label: 'Web Bearing',
                  util: results.web_bearing_check.utilisation,
                  status: results.web_bearing_check.status,
                },
                {
                  label: 'Deflection',
                  util: results.deflection_check.utilisation,
                  status: results.deflection_check.status,
                },
                {
                  label: 'LT Buckling',
                  util: results.buckling_check.utilisation,
                  status: results.buckling_check.status,
                },
              ].map((check) => (
                <div
                  key={check.label}
                  className={cn(
                    'p-4 rounded-xl border-l-4 bg-gray-900/50',
                    check.status === 'PASS' ? 'border-green-500' : 'border-red-500',
                  )}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {check.status === 'PASS' ? (
                      <FiCheck className="text-green-400" size={16} />
                    ) : (
                      <FiAlertTriangle className="text-red-400" size={16} />
                    )}
                    <span className="text-sm font-semibold text-gray-200">{check.label}</span>
                  </div>
                  <p
                    className={cn(
                      'text-2xl font-black',
                      check.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                    )}
                  >
                    {check.util.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            {/* Member Properties */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center space-x-2">
                  <FiLayers className="text-neon-cyan" />
                  <span>Member Properties</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase mb-2">Cross-sectional Area</p>
                    <p className="text-2xl font-bold text-white">
                      {results.member_properties.A} mm²
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase mb-2">Second Moment of Area</p>
                    <p className="text-2xl font-bold text-white">
                      {results.member_properties.I_y} cm⁴
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase mb-2">Plastic Section Modulus</p>
                    <p className="text-2xl font-bold text-white">
                      {results.member_properties.W_pl} mm³
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase mb-2">Shear Area</p>
                    <p className="text-2xl font-bold text-white">
                      {results.member_properties.A_v} mm²
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Design Actions */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center space-x-2">
                  <FiActivity className="text-purple-400" />
                  <span>Design Actions (EN 1990)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase mb-2">M_Ed</p>
                    <p className="text-2xl font-bold text-white">
                      {results.design_actions.M_Ed} kN·m
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/50">
                    <p className="text-gray-300 text-xs uppercase mb-2">V_Ed</p>
                    <p className="text-2xl font-bold text-purple-300">
                      {results.design_actions.V_Ed} kN
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase mb-2">R_Ed</p>
                    <p className="text-2xl font-bold text-white">
                      {results.design_actions.R_Ed} kN
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                    <p className="text-gray-400 text-xs uppercase mb-2">w_ULS</p>
                    <p className="text-2xl font-bold text-white">
                      {results.design_actions.w_ULS} kN/m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check Results Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Bending */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card
                  variant="glass"
                  className={cn(
                    'border-2 shadow-lg',
                    results.bending_resistance_check.status === 'PASS'
                      ? 'border-green-500/50'
                      : 'border-red-500/50',
                  )}
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>Bending Resistance</span>
                        {results.bending_resistance_check.status === 'FAIL' && (
                          <div className="group relative">
                            <FiInfo className="text-orange-400 cursor-help" size={18} />
                            <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                              <p className="text-xs text-orange-300 font-semibold mb-1">
                                💡 How to fix this:
                              </p>
                              <p className="text-xs text-gray-300">
                                {getRecommendation(
                                  'bending',
                                  parseFloat(results.bending_resistance_check.utilisation),
                                  results,
                                )}
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
                          results.bending_resistance_check.status === 'PASS'
                            ? 'bg-green-500'
                            : 'bg-red-500',
                        )}
                      >
                        {results.bending_resistance_check.status === 'PASS' ? (
                          <FiCheck size={24} />
                        ) : (
                          <FiAlertTriangle size={24} />
                        )}
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">M_pl,Rd</span>
                      <span className="text-white font-bold">
                        {results.bending_resistance_check.M_pl_Rd} kN·m
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Utilisation</span>
                        <span
                          className={cn(
                            'font-bold',
                            results.bending_resistance_check.status === 'PASS'
                              ? 'text-green-400'
                              : 'text-red-400',
                          )}
                        >
                          {results.bending_resistance_check.utilisation}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(results.bending_resistance_check.utilisation, 100)}%`,
                          }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={cn(
                            'h-full rounded-full',
                            results.bending_resistance_check.status === 'PASS'
                              ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                              : 'bg-gradient-to-r from-red-500 to-orange-500',
                          )}
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                        results.bending_resistance_check.status === 'PASS'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {results.bending_resistance_check.status}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Shear */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card
                  variant="glass"
                  className={cn(
                    'border-2 shadow-lg',
                    results.shear_resistance_check.status === 'PASS'
                      ? 'border-green-500/50'
                      : 'border-red-500/50',
                  )}
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>Shear Resistance</span>
                        {results.shear_resistance_check.status === 'FAIL' && (
                          <div className="group relative">
                            <FiInfo className="text-orange-400 cursor-help" size={18} />
                            <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                              <p className="text-xs text-orange-300 font-semibold mb-1">
                                💡 How to fix this:
                              </p>
                              <p className="text-xs text-gray-300">
                                {getRecommendation(
                                  'shear',
                                  parseFloat(results.shear_resistance_check.utilisation),
                                  results,
                                )}
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
                          results.shear_resistance_check.status === 'PASS'
                            ? 'bg-green-500'
                            : 'bg-red-500',
                        )}
                      >
                        {results.shear_resistance_check.status === 'PASS' ? (
                          <FiCheck size={24} />
                        ) : (
                          <FiAlertTriangle size={24} />
                        )}
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">V_pl,Rd</span>
                      <span className="text-white font-bold">
                        {results.shear_resistance_check.V_pl_Rd} kN
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Utilisation</span>
                        <span
                          className={cn(
                            'font-bold',
                            results.shear_resistance_check.status === 'PASS'
                              ? 'text-green-400'
                              : 'text-red-400',
                          )}
                        >
                          {results.shear_resistance_check.utilisation}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(results.shear_resistance_check.utilisation, 100)}%`,
                          }}
                          transition={{ duration: 1, delay: 0.6 }}
                          className={cn(
                            'h-full rounded-full',
                            results.shear_resistance_check.status === 'PASS'
                              ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                              : 'bg-gradient-to-r from-red-500 to-orange-500',
                          )}
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                        results.shear_resistance_check.status === 'PASS'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {results.shear_resistance_check.status}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Web Bearing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card
                  variant="glass"
                  className={cn(
                    'border-2 shadow-lg',
                    results.web_bearing_check.status === 'PASS'
                      ? 'border-green-500/50'
                      : 'border-red-500/50',
                  )}
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>Web Bearing</span>
                        {results.web_bearing_check.status === 'FAIL' && (
                          <div className="group relative">
                            <FiInfo className="text-orange-400 cursor-help" size={18} />
                            <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                              <p className="text-xs text-orange-300 font-semibold mb-1">
                                💡 How to fix this:
                              </p>
                              <p className="text-xs text-gray-300">
                                {getRecommendation(
                                  'webBearing',
                                  parseFloat(results.web_bearing_check.utilisation),
                                  results,
                                )}
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
                          results.web_bearing_check.status === 'PASS'
                            ? 'bg-green-500'
                            : 'bg-red-500',
                        )}
                      >
                        {results.web_bearing_check.status === 'PASS' ? (
                          <FiCheck size={24} />
                        ) : (
                          <FiAlertTriangle size={24} />
                        )}
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">F_b,Rd</span>
                      <span className="text-white font-bold">
                        {results.web_bearing_check.F_b_Rd} kN
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Utilisation</span>
                        <span
                          className={cn(
                            'font-bold',
                            results.web_bearing_check.status === 'PASS'
                              ? 'text-green-400'
                              : 'text-red-400',
                          )}
                        >
                          {results.web_bearing_check.utilisation}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(results.web_bearing_check.utilisation, 100)}%`,
                          }}
                          transition={{ duration: 1, delay: 0.7 }}
                          className={cn(
                            'h-full rounded-full',
                            results.web_bearing_check.status === 'PASS'
                              ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                              : 'bg-gradient-to-r from-red-500 to-orange-500',
                          )}
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                        results.web_bearing_check.status === 'PASS'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {results.web_bearing_check.status}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Deflection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card
                  variant="glass"
                  className={cn(
                    'border-2 shadow-lg',
                    results.deflection_check.status === 'PASS'
                      ? 'border-green-500/50'
                      : 'border-red-500/50',
                  )}
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>Deflection (SLS)</span>
                        {results.deflection_check.status === 'FAIL' && (
                          <div className="group relative">
                            <FiInfo className="text-orange-400 cursor-help" size={18} />
                            <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                              <p className="text-xs text-orange-300 font-semibold mb-1">
                                💡 How to fix this:
                              </p>
                              <p className="text-xs text-gray-300">
                                {getRecommendation(
                                  'deflection',
                                  parseFloat(results.deflection_check.utilisation),
                                  results,
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: 360 }}
                        transition={{ delay: 0.8 }}
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          results.deflection_check.status === 'PASS'
                            ? 'bg-green-500'
                            : 'bg-red-500',
                        )}
                      >
                        {results.deflection_check.status === 'PASS' ? (
                          <FiCheck size={24} />
                        ) : (
                          <FiAlertTriangle size={24} />
                        )}
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">Actual δ</p>
                        <p className="text-white font-bold">
                          {results.deflection_check.delta_actual} mm
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Limit δ</p>
                        <p className="text-white font-bold">
                          {results.deflection_check.delta_limit} mm
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Utilisation</span>
                        <span
                          className={cn(
                            'font-bold',
                            results.deflection_check.status === 'PASS'
                              ? 'text-green-400'
                              : 'text-red-400',
                          )}
                        >
                          {results.deflection_check.utilisation}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(results.deflection_check.utilisation, 100)}%`,
                          }}
                          transition={{ duration: 1, delay: 0.8 }}
                          className={cn(
                            'h-full rounded-full',
                            results.deflection_check.status === 'PASS'
                              ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                              : 'bg-gradient-to-r from-red-500 to-orange-500',
                          )}
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                        results.deflection_check.status === 'PASS'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {results.deflection_check.status}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* LT Buckling */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <Card
                  variant="glass"
                  className={cn(
                    'border-2 shadow-lg',
                    results.buckling_check.status === 'PASS'
                      ? 'border-green-500/50'
                      : 'border-red-500/50',
                  )}
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>LT Buckling</span>
                        {results.buckling_check.status === 'FAIL' && (
                          <div className="group relative">
                            <FiInfo className="text-orange-400 cursor-help" size={18} />
                            <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                              <p className="text-xs text-orange-300 font-semibold mb-1">
                                💡 How to fix this:
                              </p>
                              <p className="text-xs text-gray-300">
                                {getRecommendation(
                                  'buckling',
                                  parseFloat(results.buckling_check.utilisation),
                                  results,
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: 360 }}
                        transition={{ delay: 0.85 }}
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          results.buckling_check.status === 'PASS' ? 'bg-green-500' : 'bg-red-500',
                        )}
                      >
                        {results.buckling_check.status === 'PASS' ? (
                          <FiCheck size={24} />
                        ) : (
                          <FiAlertTriangle size={24} />
                        )}
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">M_b,Rd</p>
                        <p className="text-white font-bold">{results.buckling_check.M_b_Rd} kN·m</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">L_cr</p>
                        <p className="text-white font-bold">{results.buckling_check.L_cr} m</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Utilisation</span>
                        <span
                          className={cn(
                            'font-bold',
                            results.buckling_check.status === 'PASS'
                              ? 'text-green-400'
                              : 'text-red-400',
                          )}
                        >
                          {results.buckling_check.utilisation}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(results.buckling_check.utilisation, 100)}%`,
                          }}
                          transition={{ duration: 1, delay: 0.85 }}
                          className={cn(
                            'h-full rounded-full',
                            results.buckling_check.status === 'PASS'
                              ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                              : 'bg-gradient-to-r from-red-500 to-orange-500',
                          )}
                        />
                      </div>
                    </div>
                    <div
                      className={cn(
                        'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                        results.buckling_check.status === 'PASS'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {results.buckling_check.status}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Warnings */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
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
              <Button
                onClick={exportToPDF}
                variant="glass"
                className="px-8 py-4 border-neon-cyan/50 hover:bg-neon-cyan/10"
              >
                <FiDownload className="mr-2" size={20} />
                <span>PDF Report</span>
              </Button>
              <Button
                onClick={exportDOCX}
                variant="glass"
                className="px-8 py-4 border-purple-500/50 hover:bg-purple-500/20"
              >
                <FiDownload className="mr-2" size={20} />
                <span>DOCX Report</span>
              </Button>
              <SaveRunButton
                calculatorKey="transverse_members"
                inputs={formData as unknown as Record<string, string>}
                results={results}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                summary={results ? `${results.maxUtilisation?.toFixed(1) || '-'}% util` : undefined}
              />
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
            className="mt-6 space-y-6"
          >
            {/* Utilisation Dashboard */}
            <Card variant="glass" className="border-neon-cyan/30">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center space-x-2">
                  <FiActivity className="text-neon-cyan" />
                  <span>Utilisation Dashboard</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      name: 'Bending',
                      util: results.bending_resistance_check.utilisation,
                      ref: '§6.2.5',
                    },
                    {
                      name: 'Shear',
                      util: results.shear_resistance_check.utilisation,
                      ref: '§6.2.6',
                    },
                    {
                      name: 'Web Bearing',
                      util: results.web_bearing_check.utilisation,
                      ref: '§6.2.4',
                    },
                    { name: 'Deflection', util: results.deflection_check.utilisation, ref: 'SLS' },
                    {
                      name: 'LT Buckling',
                      util: results.buckling_check.utilisation,
                      ref: '§6.3.2',
                    },
                  ].map((check, i) => (
                    <div key={check.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 font-medium">
                          {check.name} <span className="text-gray-500 text-xs">({check.ref})</span>
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
              {/* Bending Moment Diagram */}
              <Card variant="glass" className="border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Bending Moment Diagram</CardTitle>
                </CardHeader>
                <CardContent>
                  <svg viewBox="0 0 400 200" className="w-full h-48">
                    <defs>
                      <linearGradient id="bmd-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    {/* Baseline */}
                    <line
                      x1="40"
                      y1="100"
                      x2="360"
                      y2="100"
                      stroke="#64748b"
                      strokeWidth="1.5"
                      strokeDasharray="4"
                    />
                    {/* Support markers */}
                    <polygon points="40,110 30,130 50,130" fill="#00d9ff" opacity="0.6" />
                    <polygon points="360,110 350,130 370,130" fill="#00d9ff" opacity="0.6" />
                    {/* BMD parabola */}
                    {(() => {
                      const pts: string[] = [];
                      const n = 40;
                      const maxDefl = formData.endConditions === 'continuous' ? 50 : 70;
                      for (let i = 0; i <= n; i++) {
                        const x = 40 + (i / n) * 320;
                        const t = i / n;
                        const y =
                          formData.endConditions === 'continuous'
                            ? 100 -
                              maxDefl * (4 * t * (1 - t)) +
                              15 * Math.sin(Math.PI * t) * (t < 0.1 || t > 0.9 ? -3 : 0)
                            : 100 - maxDefl * (4 * t * (1 - t));
                        pts.push(`${x},${y}`);
                      }
                      return (
                        <>
                          <polygon
                            points={`40,100 ${pts.join(' ')} 360,100`}
                            fill="url(#bmd-fill)"
                          />
                          <polyline
                            points={pts.join(' ')}
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="2.5"
                          />
                        </>
                      );
                    })()}
                    {/* Labels */}
                    <text
                      x="200"
                      y="42"
                      fill="#a855f7"
                      fontSize="12"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      M_Ed = {results.design_actions.M_Ed} kN·m
                    </text>
                    <text x="200" y="190" fill="#64748b" fontSize="10" textAnchor="middle">
                      Span = {formData.span} m
                    </text>
                  </svg>
                </CardContent>
              </Card>

              {/* Shear Force Diagram */}
              <Card variant="glass" className="border-orange-500/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Shear Force Diagram</CardTitle>
                </CardHeader>
                <CardContent>
                  <svg viewBox="0 0 400 200" className="w-full h-48">
                    {/* Baseline */}
                    <line
                      x1="40"
                      y1="100"
                      x2="360"
                      y2="100"
                      stroke="#64748b"
                      strokeWidth="1.5"
                      strokeDasharray="4"
                    />
                    {/* Support markers */}
                    <polygon points="40,110 30,130 50,130" fill="#00d9ff" opacity="0.6" />
                    <polygon points="360,110 350,130 370,130" fill="#00d9ff" opacity="0.6" />
                    {/* SFD — triangular for UDL */}
                    <polygon points="40,40 40,100 360,100 360,160" fill="#f97316" opacity="0.15" />
                    <line x1="40" y1="40" x2="360" y2="160" stroke="#f97316" strokeWidth="2.5" />
                    {/* Zero crossing */}
                    <circle cx="200" cy="100" r="4" fill="#f97316" />
                    {/* Labels */}
                    <text x="55" y="35" fill="#f97316" fontSize="11" fontWeight="bold">
                      +{results.design_actions.V_Ed} kN
                    </text>
                    <text x="295" y="175" fill="#f97316" fontSize="11" fontWeight="bold">
                      -{results.design_actions.V_Ed} kN
                    </text>
                  </svg>
                </CardContent>
              </Card>

              {/* Deflected Shape */}
              <Card variant="glass" className="border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Deflected Shape</CardTitle>
                </CardHeader>
                <CardContent>
                  <svg viewBox="0 0 400 200" className="w-full h-48">
                    {/* Original beam */}
                    <line
                      x1="40"
                      y1="80"
                      x2="360"
                      y2="80"
                      stroke="#64748b"
                      strokeWidth="2"
                      strokeDasharray="6"
                    />
                    {/* Supports */}
                    <polygon points="40,90 30,110 50,110" fill="#00d9ff" opacity="0.6" />
                    <polygon points="360,90 350,110 370,110" fill="#00d9ff" opacity="0.6" />
                    {/* Deflected curve */}
                    {(() => {
                      const pts: string[] = [];
                      const n = 40;
                      const scale = Math.min(
                        60,
                        Math.max(20, results.deflection_check.delta_actual * 3),
                      );
                      for (let i = 0; i <= n; i++) {
                        const x = 40 + (i / n) * 320;
                        const t = i / n;
                        const y = 80 + scale * Math.sin(Math.PI * t);
                        pts.push(`${x},${y}`);
                      }
                      return (
                        <polyline
                          points={pts.join(' ')}
                          fill="none"
                          stroke="#00d9ff"
                          strokeWidth="2.5"
                        />
                      );
                    })()}
                    {/* Max deflection annotation */}
                    <line
                      x1="200"
                      y1="80"
                      x2="200"
                      y2={
                        80 + Math.min(60, Math.max(20, results.deflection_check.delta_actual * 3))
                      }
                      stroke="#00d9ff"
                      strokeWidth="1"
                      strokeDasharray="3"
                    />
                    <text
                      x="220"
                      y={85 + Math.min(30, results.deflection_check.delta_actual * 1.5)}
                      fill="#00d9ff"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {'δ'} = {results.deflection_check.delta_actual} mm
                    </text>
                    <text x="200" y="185" fill="#64748b" fontSize="10" textAnchor="middle">
                      Limit: {results.deflection_check.delta_limit} mm ({formData.deflectionLimit})
                    </text>
                  </svg>
                </CardContent>
              </Card>

              {/* Cross Section Detail */}
              <Card variant="glass" className="border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Cross Section Detail</CardTitle>
                </CardHeader>
                <CardContent>
                  <svg viewBox="0 0 400 220" className="w-full h-48">
                    {(() => {
                      const cx = 200;
                      const bT = parseFloat(formData.widthTop) || 300;
                      const bB = parseFloat(formData.widthBottom) || 250;
                      const hVal = parseFloat(formData.depth) || 800;
                      const twVal = parseFloat(formData.webThickness) || 12;
                      const tfVal = Math.max(((bT + bB) / 2 - twVal) * 0.08, 10);
                      const scale = Math.min(180 / hVal, 350 / Math.max(bT, bB));
                      const sH = hVal * scale;
                      const sBT = bT * scale;
                      const sBB = bB * scale;
                      const sTW = Math.max(twVal * scale, 3);
                      const sTF = Math.max(tfVal * scale, 4);
                      const topY = (220 - sH) / 2;
                      const col = maxUtil > 100 ? '#ef4444' : maxUtil > 90 ? '#f97316' : '#3b82f6';
                      return (
                        <>
                          <rect
                            x={cx - sBT / 2}
                            y={topY}
                            width={sBT}
                            height={sTF}
                            fill={col}
                            opacity="0.5"
                            stroke={col}
                            strokeWidth="1.5"
                          />
                          <rect
                            x={cx - sTW / 2}
                            y={topY + sTF}
                            width={sTW}
                            height={sH - 2 * sTF}
                            fill={col}
                            opacity="0.3"
                            stroke={col}
                            strokeWidth="1"
                          />
                          <rect
                            x={cx - sBB / 2}
                            y={topY + sH - sTF}
                            width={sBB}
                            height={sTF}
                            fill={col}
                            opacity="0.5"
                            stroke={col}
                            strokeWidth="1.5"
                          />
                          <line
                            x1={cx + sBT / 2 + 20}
                            y1={topY}
                            x2={cx + sBT / 2 + 20}
                            y2={topY + sH}
                            stroke="#f97316"
                            strokeWidth="1"
                          />
                          <text
                            x={cx + sBT / 2 + 28}
                            y={topY + sH / 2 + 4}
                            fill="#f97316"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            {hVal}mm
                          </text>
                          <line
                            x1={cx - sBT / 2}
                            y1={topY - 10}
                            x2={cx + sBT / 2}
                            y2={topY - 10}
                            stroke="#a78bfa"
                            strokeWidth="1"
                          />
                          <text
                            x={cx}
                            y={topY - 15}
                            fill="#a78bfa"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {bT}mm
                          </text>
                          <text x={cx + sTW / 2 + 8} y={topY + sH / 2} fill="#94a3b8" fontSize="9">
                            tw={twVal}
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* 3D Scene in Visualization Tab */}
            <Card variant="glass" className="border-neon-cyan/30">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center space-x-2">
                  <FiEye className="text-neon-cyan" />
                  <span>3D Interactive View</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="h-[500px]" cameraPosition={[5, 4, 5]}>
                  <TransverseMembers3D
                    span={parseFloat(formData.span) || 3.5}
                    depth={parseFloat(formData.depth) || 800}
                    widthTop={parseFloat(formData.widthTop) || 300}
                    widthBottom={parseFloat(formData.widthBottom) || 250}
                    webThickness={parseFloat(formData.webThickness) || 12}
                    girderSpacing={parseFloat(formData.mainGirderSpacing) || 3}
                    numberOfGirders={parseInt(formData.numberOfGirders) || 4}
                    deadLoad={parseFloat(formData.deadLoad) || 0}
                    liveLoad={parseFloat(formData.liveLoad) || 0}
                    endConditions={formData.endConditions}
                    steelGrade={formData.steelGrade}
                    memberType={formData.memberType}
                    utilisation={maxUtil}
                    status={overallStatus}
                  />
                </Interactive3DDiagram>
              </CardContent>
            </Card>

            {/* Connection Design Summary */}
            <Card variant="glass" className="border-neon-purple/30">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center space-x-2">
                  <FiLayers className="text-neon-purple" />
                  <span>Connection Design Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Type', value: results.connection_design.connection_type },
                    {
                      label: 'Reaction',
                      value: `${results.connection_design.reaction_per_connection} kN`,
                    },
                    {
                      label: 'Bolts',
                      value: `${results.connection_design.bolts_required} × ${results.connection_design.bolt_diameter}`,
                    },
                    { label: 'Bolt Grade', value: results.connection_design.bolt_grade },
                    { label: 'Weld Size', value: results.connection_design.weld_size },
                    { label: 'Overall', value: results.overall_check ? '✓ PASS' : '✗ FAIL' },
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
    </div>
  );
};

export default TransverseMembers;
