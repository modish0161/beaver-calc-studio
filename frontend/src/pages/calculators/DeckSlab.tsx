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
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import { DeckSlab3D } from '../../components/3d/scenes';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview, { type WhatIfSlider } from '../../components/WhatIfPreview';
import { CONCRETE_GRADES as _CONCRETE_GRADES_LIB, REBAR_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { downloadPDF } from '../../lib/pdf';
import { buildDeckSlabReport } from '../../lib/pdf/builders/deckSlabBuilder';

interface FormData {
  slabType: string;
  lengthX: string;
  lengthY: string;
  thickness: string;
  supportX: string;
  supportY: string;
  deadLoad: string;
  liveLoad: string;
  concreteGrade: string;
  steelGrade: string;
  coverTop: string;
  coverBottom: string;
  barDiameter: string;
  deflectionLimit: string;
}

// ─── EN 1992-1-1 Material Database ────────────────────────────────────────
// Adapter: shared library Ecm is in GPa, this calculator uses MPa
const CONCRETE_GRADES = Object.fromEntries(
  Object.entries(_CONCRETE_GRADES_LIB).map(([k, v]) => [
    k,
    { fck: v.fck, fctm: v.fctm, Ecm: v.Ecm * 1000 },
  ]),
) as Record<string, { fck: number; fctm: number; Ecm: number }>;

// Adapter: map REBAR_GRADES to local shape
const STEEL_GRADES = Object.fromEntries(
  Object.entries(REBAR_GRADES)
    .filter(([k]) => ['B500A', 'B500B', 'B500C'].includes(k))
    .map(([k, v]) => [k, { fyk: v.fyk }]),
) as Record<string, { fyk: number }>;

const BAR_SIZES = [8, 10, 12, 16, 20, 25, 32, 40];

// Bar area in mm² per metre width at given spacing
const barAreaPerMetre = (dia: number, spacing: number) =>
  ((Math.PI * dia * dia) / 4) * (1000 / spacing);

// ─── Two-way slab bending-moment coefficients (BS 8110 Table 3.14 / widely used with EC2) ───
// Index by ly/lx rounded to nearest 0.1, from 1.0 to 2.0
// Case key: e.g. 'cc' = both continuous, 'cs' = X continuous Y simply-supported, etc.
// Returns { beta_sx_pos, beta_sx_neg, beta_sy_pos, beta_sy_neg }
// M = beta * n * lx² where n = ULS load/m², lx = shorter span
interface TwoWayCoeffs {
  sx_pos: number;
  sx_neg: number;
  sy_pos: number;
  sy_neg: number;
}

function getTwoWayCoeffs(ratio: number, caseKey: string): TwoWayCoeffs {
  // Clamp ratio
  const r = Math.min(Math.max(ratio, 1.0), 2.0);
  // Simplified coefficient tables — linear interpolation between 1.0 and 2.0
  const tables: Record<string, { at1: TwoWayCoeffs; at2: TwoWayCoeffs }> = {
    // 4 edges continuous (interior panel)
    cc: {
      at1: { sx_pos: 0.024, sx_neg: 0.031, sy_pos: 0.024, sy_neg: 0.031 },
      at2: { sx_pos: 0.056, sx_neg: 0.063, sy_pos: 0.024, sy_neg: 0.031 },
    },
    // X continuous, Y simply supported
    cs: {
      at1: { sx_pos: 0.029, sx_neg: 0.037, sy_pos: 0.029, sy_neg: 0.0 },
      at2: { sx_pos: 0.07, sx_neg: 0.08, sy_pos: 0.029, sy_neg: 0.0 },
    },
    // X simply supported, Y continuous
    sc: {
      at1: { sx_pos: 0.029, sx_neg: 0.0, sy_pos: 0.029, sy_neg: 0.037 },
      at2: { sx_pos: 0.066, sx_neg: 0.0, sy_pos: 0.024, sy_neg: 0.037 },
    },
    // Both simply supported
    ss: {
      at1: { sx_pos: 0.036, sx_neg: 0.0, sy_pos: 0.036, sy_neg: 0.0 },
      at2: { sx_pos: 0.086, sx_neg: 0.0, sy_pos: 0.036, sy_neg: 0.0 },
    },
  };
  const t = tables[caseKey] || tables['ss'];
  const frac = r - 1.0;
  return {
    sx_pos: t.at1.sx_pos + frac * (t.at2.sx_pos - t.at1.sx_pos),
    sx_neg: t.at1.sx_neg + frac * (t.at2.sx_neg - t.at1.sx_neg),
    sy_pos: t.at1.sy_pos + frac * (t.at2.sy_pos - t.at1.sy_pos),
    sy_neg: t.at1.sy_neg + frac * (t.at2.sy_neg - t.at1.sy_neg),
  };
}

// ─── Calculation engine — EN 1992-1-1 ────────────────────────────────────
function runCalculation(fd: FormData) {
  // ── Parse inputs ──
  const h = parseFloat(fd.thickness) || 200; // mm
  const Lx_m = parseFloat(fd.lengthX) || 6; // m
  const Ly_m = parseFloat(fd.lengthY) || 6; // m
  const gk_sdl = parseFloat(fd.deadLoad) || 0; // kN/m² super-imposed dead
  const qk = parseFloat(fd.liveLoad) || 0; // kN/m² live
  const cover_bot = parseFloat(fd.coverBottom) || 25; // mm
  const cover_top = parseFloat(fd.coverTop) || 25; // mm
  const phi = parseFloat(fd.barDiameter) || 12; // mm
  const conc = CONCRETE_GRADES[fd.concreteGrade] || CONCRETE_GRADES['C30/37'];
  const steel = STEEL_GRADES[fd.steelGrade] || STEEL_GRADES['B500B'];

  // Normalize 'fixed' supports → treat as 'continuous' for analysis
  const supX = fd.supportX === 'fixed' ? 'continuous' : fd.supportX;
  const supY = fd.supportY === 'fixed' ? 'continuous' : fd.supportY;

  // ── Material design values ──
  const gamma_c = 1.5;
  const gamma_s = 1.15;
  const alpha_cc = 0.85; // UK NA
  const fck = conc.fck;
  const fcd = (alpha_cc * fck) / gamma_c;
  const fctm = conc.fctm;
  const Ecm = conc.Ecm;
  const fyk = steel.fyk;
  const fyd = fyk / gamma_s;
  const Es = 200000;

  // ── Self-weight ──
  const g_sw = (h / 1000) * 25; // kN/m²

  // ── Load combinations EN 1990 ──
  const gk_total = g_sw + gk_sdl;
  const n_uls = 1.35 * gk_total + 1.5 * qk;
  const n_sls_char = gk_total + qk;
  const n_sls_qp = gk_total + 0.3 * qk; // ψ₂ = 0.3 for office/residential; 0.6 for storage

  // ── Effective depths ──
  const dx = h - cover_bot - phi / 2; // X-direction (outer layer)
  const dy = h - cover_bot - phi - phi / 2; // Y-direction (inner layer — reduced by one bar dia)
  const d_avg = (dx + dy) / 2;

  // ── Determine shorter/longer span ──
  const Lx_mm = Lx_m * 1000;
  const Ly_mm = Ly_m * 1000;
  const lx_m = Math.min(Lx_m, Ly_m); // shorter span
  const ly_m = Math.max(Lx_m, Ly_m); // longer span
  const ratio = ly_m / lx_m;
  const isOneWay = fd.slabType === 'one_way' || ratio > 2.0;

  // ── Bending moments ──
  let M_Ed_x_pos: number, M_Ed_x_neg: number, M_Ed_y_pos: number, M_Ed_y_neg: number;

  if (isOneWay) {
    // One-way spanning in short direction
    const L = lx_m; // spans in short direction
    const isContX = supX === 'continuous';
    const isContY = supY === 'continuous';
    // Use span = shorter dimension
    if (isContX && isContY) {
      // Both ends continuous
      M_Ed_x_pos = (n_uls * L * L) / 16; // mid-span
      M_Ed_x_neg = (n_uls * L * L) / 12; // support
    } else if (isContX || isContY) {
      // One end continuous
      M_Ed_x_pos = (n_uls * L * L) / 11;
      M_Ed_x_neg = (n_uls * L * L) / 9;
    } else {
      // Simply supported
      M_Ed_x_pos = (n_uls * L * L) / 8;
      M_Ed_x_neg = 0;
    }
    M_Ed_y_pos = 0.2 * M_Ed_x_pos; // distribution steel
    M_Ed_y_neg = 0;
  } else {
    // Two-way slab using coefficient method
    const caseKey = (supX === 'continuous' ? 'c' : 's') + (supY === 'continuous' ? 'c' : 's');
    const coeffs = getTwoWayCoeffs(ratio, caseKey);
    M_Ed_x_pos = coeffs.sx_pos * n_uls * lx_m * lx_m;
    M_Ed_x_neg = coeffs.sx_neg * n_uls * lx_m * lx_m;
    M_Ed_y_pos = coeffs.sy_pos * n_uls * lx_m * lx_m;
    M_Ed_y_neg = coeffs.sy_neg * n_uls * lx_m * lx_m;
  }

  // Design moment = max of positive span moment and negative support moment
  const M_Ed_x = Math.max(M_Ed_x_pos, M_Ed_x_neg);
  const M_Ed_y = Math.max(M_Ed_y_pos, M_Ed_y_neg);

  // ── Reinforcement design (per metre width, b=1000mm) ──
  const b = 1000;
  const designReinf = (M: number, d: number) => {
    const K = (M * 1e6) / (b * d * d * fck); // M in kN·m → N·mm
    const K_prime = 0.167; // singly reinforced limit
    const K_used = Math.min(K, K_prime);
    const z = d * Math.min(0.5 + Math.sqrt(0.25 - K_used / 1.134), 0.95);
    const As_req = (M * 1e6) / (fyd * z); // mm²/m
    // Minimum reinforcement EN 1992-1-1 §9.2.1.1
    const As_min = Math.max(((0.26 * fctm) / fyk) * b * d, 0.0013 * b * d);
    const As_design = Math.max(As_req, As_min);
    // Select spacing for chosen bar diameter
    const A_bar = (Math.PI * phi * phi) / 4;
    const s_max = Math.min(3 * h, 400); // EN 1992-1-1 §9.3.1.1
    let spacing = Math.floor((A_bar * 1000) / As_design / 25) * 25; // round down to 25mm increments
    spacing = Math.max(spacing, 75); // practical minimum
    spacing = Math.min(spacing, s_max);
    const As_prov = barAreaPerMetre(phi, spacing);
    return { As_req: As_design, As_prov, spacing, K, z, isDoubly: K > K_prime };
  };

  const reinfX = designReinf(M_Ed_x, dx);
  const reinfY = designReinf(M_Ed_y, dy);

  // ── Bending resistance ──
  const calcMRd = (As: number, d: number) => {
    const x = (As * fyd) / (0.8 * fcd * b); // neutral axis depth
    const z = d - 0.4 * x;
    return (As * fyd * z) / 1e6; // kN·m
  };
  const M_Rd_x = calcMRd(reinfX.As_prov, dx);
  const M_Rd_y = calcMRd(reinfY.As_prov, dy);

  // ── Shear check EN 1992-1-1 §6.2.2 (no shear reinforcement in slabs) ──
  const V_Ed_x = isOneWay
    ? supX === 'continuous' && supY === 'continuous'
      ? 0.5 * n_uls * lx_m
      : supX === 'continuous' || supY === 'continuous'
        ? 0.6 * n_uls * lx_m
        : 0.5 * n_uls * lx_m
    : 0.5 * n_uls * lx_m;

  const rho_l = Math.min(reinfX.As_prov / (b * dx), 0.02);
  const k_shear = Math.min(1 + Math.sqrt(200 / dx), 2.0);
  const C_Rd_c = 0.18 / gamma_c;
  const v_Rd_c = C_Rd_c * k_shear * Math.pow(100 * rho_l * fck, 1 / 3);
  const v_min = 0.035 * Math.pow(k_shear, 1.5) * Math.sqrt(fck);
  const V_Rd_c = (Math.max(v_Rd_c, v_min) * b * dx) / 1000; // kN/m

  // ── Deflection check EN 1992-1-1 §7.4.2 — span/depth ratio method ──
  const rho_0 = Math.sqrt(fck) * 1e-3;
  const rho = reinfX.As_req / (b * dx);
  const rho_actual = reinfX.As_prov / (b * dx);
  // Structural system factor K
  const isContSomewhere = supX === 'continuous' || supY === 'continuous';
  const isContBoth = supX === 'continuous' && supY === 'continuous';
  const K_factor = isContBoth ? 1.5 : isContSomewhere ? 1.3 : 1.0;
  let ld_basic: number;
  if (rho <= rho_0) {
    ld_basic =
      K_factor *
      (11 +
        (1.5 * Math.sqrt(fck) * rho_0) / rho +
        3.2 * Math.sqrt(fck) * Math.pow(Math.max(rho_0 / rho - 1, 0), 1.5));
  } else {
    ld_basic = K_factor * (11 + (1.5 * Math.sqrt(fck) * rho_0) / (rho - 0));
  }
  // Modification for As_prov / As_req  (capped at 1.5)
  const ld_mod = ld_basic * Math.min(reinfX.As_prov / reinfX.As_req, 1.5);
  // Modification for span > 7m
  const L_eff = lx_m * 1000;
  const ld_final = L_eff > 7000 ? (ld_mod * 7000) / L_eff : ld_mod;
  const actual_ld = L_eff / dx;
  const defl_util = (actual_ld / ld_final) * 100;

  // Also compute actual deflection estimate (5wl⁴/384EI for SS, simplified)
  const I_cracked = ((b * Math.pow(dx, 3)) / 12) * 0.5; // approximate cracked I
  const w_sls = n_sls_qp; // kN/m per m width
  const delta_actual = isContBoth
    ? (((w_sls * Math.pow(lx_m * 1000, 4)) / (384 * Ecm * I_cracked)) * 1) / 1.5
    : (5 * w_sls * Math.pow(lx_m * 1000, 4)) / (384 * Ecm * I_cracked);
  const deflLimitDivisor = parseInt(fd.deflectionLimit.split('/')[1]) || 250;
  const delta_limit = (lx_m * 1000) / deflLimitDivisor;

  // ── Crack width check EN 1992-1-1 §7.3.4 ──
  const sigma_s_sls =
    (((M_Ed_x * n_sls_char) / n_uls) * 1e6) /
    (reinfX.As_prov * (dx - ((dx * reinfX.As_prov * fyd) / (0.8 * fcd * b * dx * fyd)) * 0.4));
  // Simplified: sigma_s ≈ M_sls / (As * 0.87d)
  const M_sls_x = (M_Ed_x * n_sls_char) / n_uls;
  const sigma_s = (M_sls_x * 1e6) / (reinfX.As_prov * 0.87 * dx);
  const alpha_e = Es / Ecm;
  const hc_eff = Math.min(
    2.5 * (h - dx),
    (h - (dx * 0.4 * reinfX.As_prov * fyd) / (0.8 * fcd * b)) / 3,
    h / 2,
  );
  const Ac_eff = b * Math.max(hc_eff, 1);
  const rho_p_eff = Math.min(reinfX.As_prov / Ac_eff, 0.04);
  const kt = 0.4; // long-term
  const k1_crack = 0.8; // high bond
  const k2_crack = 0.5; // bending
  const eps_sm_cm = Math.max(
    (sigma_s - ((kt * fctm) / rho_p_eff) * (1 + alpha_e * rho_p_eff)) / Es,
    (0.6 * sigma_s) / Es,
  );
  const sr_max = 3.4 * cover_bot + (0.425 * k1_crack * k2_crack * phi) / rho_p_eff;
  const w_k = sr_max * eps_sm_cm;
  const w_k_limit = 0.3; // mm — typical limit

  // ── Build results ──
  const bending_util_x = (M_Ed_x / M_Rd_x) * 100;
  const bending_util_y = (M_Ed_y / M_Rd_y) * 100;
  const shear_util = (V_Ed_x / V_Rd_c) * 100;
  const crack_util = (w_k / w_k_limit) * 100;

  const checks = [
    { name: 'bendingX', util: bending_util_x },
    { name: 'bendingY', util: bending_util_y },
    { name: 'shear', util: shear_util },
    { name: 'deflection', util: defl_util },
    { name: 'crackWidth', util: crack_util },
  ];
  const governing = checks.reduce((a, b) => (a.util > b.util ? a : b));

  return {
    // Material
    concrete_fck: fck,
    concrete_fcd: +fcd.toFixed(1),
    fctm,
    Ecm,
    steel_fyk: fyk,
    steel_fyd: +fyd.toFixed(1),
    // Loading
    self_weight_kN_per_m2: +g_sw.toFixed(2),
    total_dead: +gk_total.toFixed(2),
    total_load_uls_kN_per_m2: +n_uls.toFixed(2),
    total_load_sls_kN_per_m2: +n_sls_char.toFixed(2),
    n_sls_qp: +n_sls_qp.toFixed(2),
    // Geometry
    effective_depth_x: +dx.toFixed(0),
    effective_depth_y: +dy.toFixed(0),
    span_ratio: +ratio.toFixed(2),
    isOneWay,
    lx: lx_m,
    ly: ly_m,
    // Design moments
    design_moments: {
      M_Ed_x: +M_Ed_x.toFixed(1),
      M_Ed_y: +M_Ed_y.toFixed(1),
      M_Ed_x_pos: +M_Ed_x_pos.toFixed(1),
      M_Ed_x_neg: +M_Ed_x_neg.toFixed(1),
      M_Ed_y_pos: +M_Ed_y_pos.toFixed(1),
      M_Ed_y_neg: +M_Ed_y_neg.toFixed(1),
    },
    design_shears: { V_Ed: +V_Ed_x.toFixed(1) },
    // Reinforcement
    reinforcement_x: {
      As_required: +reinfX.As_req.toFixed(0),
      As_provided: +reinfX.As_prov.toFixed(0),
      spacing: reinfX.spacing,
      bar_diameter: phi,
      bars_per_meter: +(1000 / reinfX.spacing).toFixed(1),
      K: +reinfX.K.toFixed(4),
    },
    reinforcement_y: {
      As_required: +reinfY.As_req.toFixed(0),
      As_provided: +reinfY.As_prov.toFixed(0),
      spacing: reinfY.spacing,
      bar_diameter: phi,
      bars_per_meter: +(1000 / reinfY.spacing).toFixed(1),
      K: +reinfY.K.toFixed(4),
    },
    // Checks
    bending_check_x: {
      M_Rd: +M_Rd_x.toFixed(1),
      utilisation: +bending_util_x.toFixed(1),
      status: bending_util_x <= 100 ? 'PASS' : 'FAIL',
    },
    bending_check_y: {
      M_Rd: +M_Rd_y.toFixed(1),
      utilisation: +bending_util_y.toFixed(1),
      status: bending_util_y <= 100 ? 'PASS' : 'FAIL',
    },
    shear_check: {
      V_Rd_c: +V_Rd_c.toFixed(1),
      k: +k_shear.toFixed(2),
      rho_l: +(rho_l * 100).toFixed(3),
      utilisation: +shear_util.toFixed(1),
      status: shear_util <= 100 ? 'PASS' : 'FAIL',
    },
    deflection_check: {
      actual_ld: +actual_ld.toFixed(1),
      allowable_ld: +ld_final.toFixed(1),
      delta_actual: +delta_actual.toFixed(1),
      delta_limit: +delta_limit.toFixed(1),
      utilisation: +defl_util.toFixed(1),
      status: defl_util <= 100 ? 'PASS' : 'FAIL',
    },
    crack_width_check: {
      w_k: +Math.max(w_k, 0).toFixed(3),
      w_k_limit,
      sr_max: +sr_max.toFixed(0),
      sigma_s: +sigma_s.toFixed(0),
      utilisation: +crack_util.toFixed(1),
      status: crack_util <= 100 ? 'PASS' : 'FAIL',
    },
    utilisation_summary: {
      bending_x: +bending_util_x.toFixed(1),
      bending_y: +bending_util_y.toFixed(1),
      shear: +shear_util.toFixed(1),
      deflection: +defl_util.toFixed(1),
      crack_width: +crack_util.toFixed(1),
    },
    governing_check: governing.name,
    overall_pass: checks.every((c) => c.util <= 100),
    reinforcement_schedule: {
      bottom_x: {
        bars: `T${phi} @ ${reinfX.spacing}mm c/c`,
        area: +reinfX.As_prov.toFixed(0),
        quantity: `${(1000 / reinfX.spacing).toFixed(1)} bars/m`,
      },
      bottom_y: {
        bars: `T${phi} @ ${reinfY.spacing}mm c/c`,
        area: +reinfY.As_prov.toFixed(0),
        quantity: `${(1000 / reinfY.spacing).toFixed(1)} bars/m`,
      },
      top_x: {
        bars: `T${phi} @ ${Math.min(reinfX.spacing * 2, 400)}mm c/c`,
        area: +barAreaPerMetre(phi, Math.min(reinfX.spacing * 2, 400)).toFixed(0),
        quantity: 'Distribution steel',
      },
      top_y: {
        bars: `T${phi} @ ${Math.min(reinfY.spacing * 2, 400)}mm c/c`,
        area: +barAreaPerMetre(phi, Math.min(reinfY.spacing * 2, 400)).toFixed(0),
        quantity: 'Distribution steel',
      },
    },
  };
}

const PRESETS: Record<
  string,
  {
    name: string;
    slabType: string;
    lengthX: string;
    lengthY: string;
    thickness: string;
    supportX: string;
    supportY: string;
    deadLoad: string;
    liveLoad: string;
    concreteGrade: string;
    steelGrade: string;
    coverBottom: string;
    coverTop: string;
    barDiameter: string;
    deflectionLimit: string;
  }
> = {
  highway_voided: {
    name: '🛣️ Highway Deck — Voided Slab (250mm)',
    slabType: 'one_way',
    lengthX: '3.6',
    lengthY: '16',
    thickness: '250',
    supportX: 'continuous',
    supportY: 'simply_supported',
    deadLoad: '3.0',
    liveLoad: '10',
    concreteGrade: 'C40/50',
    steelGrade: 'B500B',
    coverBottom: '45',
    coverTop: '40',
    barDiameter: '20',
    deflectionLimit: 'L/250',
  },
  highway_solid: {
    name: '🛣️ Highway Deck — Solid Slab (300mm)',
    slabType: 'one_way',
    lengthX: '4.0',
    lengthY: '18',
    thickness: '300',
    supportX: 'continuous',
    supportY: 'continuous',
    deadLoad: '3.5',
    liveLoad: '10',
    concreteGrade: 'C40/50',
    steelGrade: 'B500B',
    coverBottom: '45',
    coverTop: '45',
    barDiameter: '25',
    deflectionLimit: 'L/250',
  },
  highway_integral: {
    name: '🛣️ Integral Bridge Deck (200mm)',
    slabType: 'one_way',
    lengthX: '3.5',
    lengthY: '12',
    thickness: '200',
    supportX: 'fixed',
    supportY: 'continuous',
    deadLoad: '2.5',
    liveLoad: '10',
    concreteGrade: 'C40/50',
    steelGrade: 'B500B',
    coverBottom: '40',
    coverTop: '40',
    barDiameter: '16',
    deflectionLimit: 'L/250',
  },
  composite_deck: {
    name: '🌉 Composite Bridge Deck Slab (220mm)',
    slabType: 'one_way',
    lengthX: '3.2',
    lengthY: '14',
    thickness: '220',
    supportX: 'continuous',
    supportY: 'simply_supported',
    deadLoad: '2.8',
    liveLoad: '10',
    concreteGrade: 'C35/45',
    steelGrade: 'B500B',
    coverBottom: '40',
    coverTop: '35',
    barDiameter: '16',
    deflectionLimit: 'L/250',
  },
  footbridge_urban: {
    name: '🚶 Footbridge Deck — Urban (150mm)',
    slabType: 'one_way',
    lengthX: '2.5',
    lengthY: '10',
    thickness: '150',
    supportX: 'simply_supported',
    supportY: 'simply_supported',
    deadLoad: '1.5',
    liveLoad: '5.0',
    concreteGrade: 'C35/45',
    steelGrade: 'B500B',
    coverBottom: '35',
    coverTop: '35',
    barDiameter: '12',
    deflectionLimit: 'L/300',
  },
  footbridge_wide: {
    name: '🚶 Footbridge Deck — Wide Span (180mm)',
    slabType: 'two_way',
    lengthX: '4.0',
    lengthY: '6.0',
    thickness: '180',
    supportX: 'simply_supported',
    supportY: 'simply_supported',
    deadLoad: '1.8',
    liveLoad: '5.0',
    concreteGrade: 'C35/45',
    steelGrade: 'B500B',
    coverBottom: '35',
    coverTop: '35',
    barDiameter: '16',
    deflectionLimit: 'L/300',
  },
  rail_bridge: {
    name: '🚂 Rail Bridge Deck — Network Rail (350mm)',
    slabType: 'one_way',
    lengthX: '4.5',
    lengthY: '14',
    thickness: '350',
    supportX: 'continuous',
    supportY: 'continuous',
    deadLoad: '5.0',
    liveLoad: '20',
    concreteGrade: 'C50/60',
    steelGrade: 'B500B',
    coverBottom: '50',
    coverTop: '45',
    barDiameter: '32',
    deflectionLimit: 'L/250',
  },
  overbridge_ha: {
    name: '🏗️ Overbridge Deck — HA Loading (280mm)',
    slabType: 'one_way',
    lengthX: '3.65',
    lengthY: '15',
    thickness: '280',
    supportX: 'continuous',
    supportY: 'simply_supported',
    deadLoad: '3.2',
    liveLoad: '12',
    concreteGrade: 'C40/50',
    steelGrade: 'B500B',
    coverBottom: '45',
    coverTop: '40',
    barDiameter: '20',
    deflectionLimit: 'L/250',
  },
};

const DeckSlab: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    slabType: 'two_way',
    lengthX: '6',
    lengthY: '6',
    thickness: '200',
    supportX: 'continuous',
    supportY: 'continuous',
    deadLoad: '2',
    liveLoad: '4',
    concreteGrade: 'C30/37',
    steelGrade: 'B500B',
    coverTop: '25',
    coverBottom: '25',
    barDiameter: '12',
    deflectionLimit: 'L/250',
  });

  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-recalculate on any input change ──
  const doCalculation = useCallback(() => {
    const h = parseFloat(formData.thickness);
    const Lx = parseFloat(formData.lengthX);
    const Ly = parseFloat(formData.lengthY);
    if (!h || h < 50 || !Lx || Lx <= 0 || !Ly || Ly <= 0) return;
    setIsCalculating(true);
    try {
      const r = runCalculation(formData);
      setResults(r);
    } finally {
      setIsCalculating(false);
    }
  }, [formData]);

  useEffect(() => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    calcTimerRef.current = setTimeout(doCalculation, 150);
    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [doCalculation]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setFormData((prev) => ({
      ...prev,
      slabType: preset.slabType,
      lengthX: preset.lengthX,
      lengthY: preset.lengthY,
      thickness: preset.thickness,
      supportX: preset.supportX,
      supportY: preset.supportY,
      deadLoad: preset.deadLoad,
      liveLoad: preset.liveLoad,
      concreteGrade: preset.concreteGrade,
      steelGrade: preset.steelGrade,
      coverBottom: preset.coverBottom,
      coverTop: preset.coverTop,
      barDiameter: preset.barDiameter,
      deflectionLimit: preset.deflectionLimit,
    }));
  };

  const getRecommendation = (checkType: string, utilisation: number, _results: any): string => {
    if (utilisation < 100) return '';
    switch (checkType) {
      case 'bendingX':
        return 'Increase slab thickness, use larger bars, reduce span, or use higher concrete grade';
      case 'bendingY':
        return 'Increase slab thickness, use larger bars, reduce span in Y, or use higher concrete grade';
      case 'shear':
        return 'Increase slab thickness significantly or reduce applied loads';
      case 'deflection':
        return 'Increase slab thickness, use higher concrete grade, or add intermediate supports';
      case 'crackWidth':
        return 'Increase reinforcement area, use smaller bar spacing, or increase concrete cover';
      default:
        return 'Review slab dimensions or reduce applied loads';
    }
  };

  // ── PDF Export ──
  const exportToPDF = async () => {
    if (!results) return;
    const reportData = buildDeckSlabReport(formData, results, [], {
      projectName: 'Deck Slab Design',
      documentRef: 'DEC-001',
    });
    await downloadPDF(
      reportData as any,
      `DeckSlab_${formData.concreteGrade}_${formData.lengthX}x${formData.lengthY}m`,
    );
  };

  // ── DOCX Export ──
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Deck Slab Design',
      subtitle: 'EN 1992-1-1 Compliant',
      projectInfo: [
        { label: 'Slab Type', value: formData.slabType },
        { label: 'Concrete Grade', value: formData.concreteGrade },
      ],
      inputs: [
        { label: 'Span X', value: formData.lengthX, unit: 'm' },
        { label: 'Span Y', value: formData.lengthY, unit: 'm' },
        { label: 'Thickness', value: formData.thickness, unit: 'mm' },
        { label: 'Super-imposed DL', value: formData.deadLoad, unit: 'kN/m²' },
        { label: 'Live Load', value: formData.liveLoad, unit: 'kN/m²' },
        { label: 'Bottom Cover', value: formData.coverBottom, unit: 'mm' },
        { label: 'Top Cover', value: formData.coverTop, unit: 'mm' },
        { label: 'Bar Diameter X', value: formData.barDiameter, unit: 'mm' },
        { label: 'Bar Diameter Y', value: formData.barDiameter, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Bending (X)',
          capacity: `M_Rd = ${results.bendingX_check?.M_Rd?.toFixed(1) || '-'} kNm/m`,
          utilisation: `${results.bendingX_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.bendingX_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Bending (Y)',
          capacity: `M_Rd = ${results.bendingY_check?.M_Rd?.toFixed(1) || '-'} kNm/m`,
          utilisation: `${results.bendingY_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.bendingY_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `V_Rd,c = ${results.shear_check?.V_Rd_c?.toFixed(1) || '-'} kN/m`,
          utilisation: `${results.shear_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.shear_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `L/${results.deflection_check?.L_d_limit?.toFixed(0) || '-'}`,
          utilisation: `${results.deflection_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.deflection_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Crack Width',
          capacity: `w_max = ${results.crackWidth_check?.w_max?.toFixed(2) || '-'} mm`,
          utilisation: `${results.crackWidth_check?.utilisation?.toFixed(1) || '-'}%`,
          status: (results.crackWidth_check?.status || 'PASS') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${results.maxUtilisation?.toFixed(1) || '-'}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        { check: 'Deflection', suggestion: 'Consider pre-cambering or increasing slab thickness' },
        { check: 'Crack Width', suggestion: 'Use smaller bar spacing or larger bar diameter' },
      ],
      warnings: [],
      footerNote: 'Beaver Bridges Ltd — Deck Slab Design',
    });
  };

  // Governing check label
  const governingLabel: Record<string, string> = {
    bendingX: 'Bending (X)',
    bendingY: 'Bending (Y)',
    shear: 'Shear',
    deflection: 'Deflection',
    crackWidth: 'Crack Width',
  };

  const inputFields = [
    {
      key: 'lengthX',
      label: 'Span X',
      unit: 'm',
      icon: '📏',
      description: 'Slab span in X direction',
    },
    {
      key: 'lengthY',
      label: 'Span Y',
      unit: 'm',
      icon: '📐',
      description: 'Slab span in Y direction',
    },
    {
      key: 'thickness',
      label: 'Thickness',
      unit: 'mm',
      icon: '⬜',
      description: 'Overall slab depth h',
    },
    {
      key: 'deadLoad',
      label: 'Super-imposed DL',
      unit: 'kN/m²',
      icon: '⬇️',
      description: 'Dead load excl. self-weight',
    },
    {
      key: 'liveLoad',
      label: 'Live Load',
      unit: 'kN/m²',
      icon: '⚡',
      description: 'Imposed/traffic load',
    },
    {
      key: 'coverBottom',
      label: 'Bottom Cover',
      unit: 'mm',
      icon: '🔧',
      description: 'Nominal cover (bottom)',
    },
    {
      key: 'coverTop',
      label: 'Top Cover',
      unit: 'mm',
      icon: '🔧',
      description: 'Nominal cover (top)',
    },
  ];

  const whatIfSliders: WhatIfSlider[] = [
    { key: 'thickness', label: 'Slab Depth', unit: 'mm', min: 100, max: 500, step: 10 },
    { key: 'lengthX', label: 'Span X', unit: 'm', min: 1, max: 15, step: 0.5 },
    { key: 'lengthY', label: 'Span Y', unit: 'm', min: 1, max: 15, step: 0.5 },
    { key: 'liveLoad', label: 'Live Load', unit: 'kN/m²', min: 0, max: 30, step: 0.5 },
    { key: 'deadLoad', label: 'Dead Load', unit: 'kN/m²', min: 0, max: 20, step: 0.5 },
    { key: 'coverBottom', label: 'Bottom Cover', unit: 'mm', min: 15, max: 60, step: 5 },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

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
            <span className="text-white font-semibold">EN 1992-1-1 | Eurocode 2</span>
          </motion.div>

          {/* Governing Check Indicator */}
          {results && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'inline-flex items-center gap-2 mb-4 px-5 py-2 rounded-full text-sm font-bold',
                results.overall_pass
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40',
              )}
            >
              {results.overall_pass ? <FiCheck /> : <FiAlertTriangle />}
              <span>
                Governing: {governingLabel[results.governing_check] || results.governing_check}
                {' — '}
                {
                  results.utilisation_summary[
                    results.governing_check === 'bendingX'
                      ? 'bending_x'
                      : results.governing_check === 'bendingY'
                        ? 'bending_y'
                        : results.governing_check === 'crackWidth'
                          ? 'crack_width'
                          : results.governing_check
                  ]
                }
                %
              </span>
            </motion.div>
          )}

          <h1 className="text-6xl font-black mb-6">
            <span className="bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
              Deck Slab
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">EN 1992-1-1 RC deck slab design</p>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-8 mt-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 mx-auto w-fit">
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
              <span className="text-sm">One/Two-Way Analysis</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Reinforcement Design</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Shear Check</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Deflection Control</span>
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
                {/* Slab Geometry Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiLayers className="w-6 h-6 text-neon-cyan" />
                        </motion.div>
                        <span>Slab Geometry & Loading</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🏗️</span>
                            <span>Slab Type</span>
                          </label>
                          <select
                            title="Slab Type"
                            value={formData.slabType}
                            onChange={(e) => handleInputChange('slabType', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                          >
                            <option value="one_way">One-Way Slab</option>
                            <option value="two_way">Two-Way Slab</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🏗️</span>
                            <span>Concrete Grade</span>
                          </label>
                          <select
                            title="Concrete Grade"
                            value={formData.concreteGrade}
                            onChange={(e) => handleInputChange('concreteGrade', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                          >
                            {Object.entries(CONCRETE_GRADES).map(([key, v]) => (
                              <option key={key} value={key}>
                                {key} (f_ck = {v.fck} N/mm²)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🔗</span>
                            <span>Support X-direction</span>
                          </label>
                          <select
                            title="Support X"
                            value={formData.supportX}
                            onChange={(e) => handleInputChange('supportX', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                          >
                            <option value="simply_supported">Simply Supported</option>
                            <option value="continuous">Continuous</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🔗</span>
                            <span>Support Y-direction</span>
                          </label>
                          <select
                            title="Support Y"
                            value={formData.supportY}
                            onChange={(e) => handleInputChange('supportY', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                          >
                            <option value="simply_supported">Simply Supported</option>
                            <option value="continuous">Continuous</option>
                            <option value="fixed">Fixed</option>
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
                                  value={formData[field.key as keyof FormData]}
                                  onChange={(e) =>
                                    handleInputChange(field.key as keyof FormData, e.target.value)
                                  }
                                  className={cn(
                                    'w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500',
                                    'focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20',
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

                {/* Reinforcement Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiZap className="w-6 h-6 text-neon-cyan" />
                        </motion.div>
                        <span>Reinforcement Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🔩</span>
                            <span>Steel Grade</span>
                          </label>
                          <select
                            title="Steel Grade"
                            value={formData.steelGrade}
                            onChange={(e) => handleInputChange('steelGrade', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                          >
                            {Object.entries(STEEL_GRADES).map(([key, v]) => (
                              <option key={key} value={key}>
                                {key} (f_yk = {v.fyk} N/mm²)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🔗</span>
                            <span>Bar Diameter</span>
                          </label>
                          <select
                            title="Bar Diameter"
                            value={formData.barDiameter}
                            onChange={(e) => handleInputChange('barDiameter', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                          >
                            {BAR_SIZES.map((d) => (
                              <option key={d} value={String(d)}>
                                T{d} (A = {((Math.PI * d * d) / 4).toFixed(0)} mm²)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">📏</span>
                            <span>Deflection Limit</span>
                          </label>
                          <select
                            title="Deflection Limit"
                            value={formData.deflectionLimit}
                            onChange={(e) => handleInputChange('deflectionLimit', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-white transition-all duration-300"
                          >
                            <option value="L/250">L/250 (General use)</option>
                            <option value="L/300">L/300 (Residential)</option>
                            <option value="L/350">L/350 (Commercial)</option>
                            <option value="L/400">L/400 (Industrial)</option>
                            <option value="L/500">L/500 (Sensitive finishes)</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* RUN FULL ANALYSIS button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center"
                >
                  <Button
                    onClick={doCalculation}
                    className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:shadow-[0_0_40px_rgba(0,217,255,0.4)] transition-all duration-300"
                  >
                    ⚡ RUN FULL ANALYSIS
                  </Button>
                </motion.div>
              </div>

              {/* 3D Preview Sidebar - 1 column */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1"
              >
                <WhatIfPreview
                  title="Real-Time Preview"
                  renderScene={(h) => (
                    <Interactive3DDiagram height={h} cameraPosition={[8, 5, 8]}>
                      <DeckSlab3D
                        spanX={parseFloat(formData.lengthX) || 6}
                        spanY={parseFloat(formData.lengthY) || 6}
                        thickness={parseFloat(formData.thickness) || 200}
                        cover={parseFloat(formData.coverBottom) || 25}
                        barDiameter={parseFloat(formData.barDiameter) || 12}
                        barSpacingX={results?.reinforcement_x?.spacing || 150}
                        barSpacingY={results?.reinforcement_y?.spacing || 150}
                        supportX={formData.supportX}
                        supportY={formData.supportY}
                        udl={results?.total_load_uls_kN_per_m2 || 0}
                        isOneWay={results?.isOneWay ?? formData.slabType === 'one_way'}
                        utilisation={
                          results
                            ? Math.max(
                                results.utilisation_summary.bending_x || 0,
                                results.utilisation_summary.bending_y || 0,
                                results.utilisation_summary.shear || 0,
                                results.utilisation_summary.deflection || 0,
                                results.utilisation_summary.crack_width || 0,
                              )
                            : 0
                        }
                        status={results?.overall_pass === false ? 'FAIL' : 'PASS'}
                        concreteGrade={formData.concreteGrade}
                        steelGrade={formData.steelGrade}
                      />
                    </Interactive3DDiagram>
                  )}
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={handleInputChange}
                  status={results?.overall_pass === false ? 'FAIL' : 'PASS'}
                  utilisation={
                    results
                      ? Math.max(
                          results.utilisation_summary.bending_x || 0,
                          results.utilisation_summary.bending_y || 0,
                          results.utilisation_summary.shear || 0,
                          results.utilisation_summary.deflection || 0,
                          results.utilisation_summary.crack_width || 0,
                        )
                      : 0
                  }
                  liveReadout={
                    results
                      ? [
                          { label: 'Bend X', value: results.utilisation_summary.bending_x },
                          { label: 'Bend Y', value: results.utilisation_summary.bending_y },
                          { label: 'Shear', value: results.utilisation_summary.shear },
                          { label: 'Defl.', value: results.utilisation_summary.deflection },
                          { label: 'Crack', value: results.utilisation_summary.crack_width },
                        ]
                      : []
                  }
                />
              </motion.div>
            </motion.div>
          )}

          {/* Results Section */}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  {
                    label: 'Bending (X)',
                    util: results.bending_check_x.utilisation,
                    status: results.bending_check_x.status,
                  },
                  {
                    label: 'Bending (Y)',
                    util: results.bending_check_y.utilisation,
                    status: results.bending_check_y.status,
                  },
                  {
                    label: 'Shear',
                    util: results.shear_check.utilisation,
                    status: results.shear_check.status,
                  },
                  {
                    label: 'Deflection',
                    util: results.deflection_check.utilisation,
                    status: results.deflection_check.status,
                  },
                  {
                    label: 'Crack Width',
                    util: results.crack_width_check.utilisation,
                    status: results.crack_width_check.status,
                  },
                ].map((check) => (
                  <motion.div
                    key={check.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'p-4 rounded-xl bg-gray-900/60 border-l-4 flex items-center gap-3',
                      check.status === 'PASS' ? 'border-l-green-500' : 'border-l-red-500',
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        check.status === 'PASS'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {check.status === 'PASS' ? (
                        <FiCheck size={16} />
                      ) : (
                        <FiAlertTriangle size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{check.label}</p>
                      <p
                        className={cn(
                          'text-lg font-black',
                          check.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                        )}
                      >
                        {check.util}%
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Material Properties & Loads */}
              <Card variant="glass" className="border-neon-cyan/30">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center space-x-2">
                    <FiLayers className="text-neon-cyan" />
                    <span>Material Properties & Loading</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Concrete f_ck</p>
                      <p className="text-2xl font-bold text-white">{results.concrete_fck} N/mm²</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Steel f_yk</p>
                      <p className="text-2xl font-bold text-white">{results.steel_fyk} N/mm²</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Self-weight</p>
                      <p className="text-2xl font-bold text-white">
                        {results.self_weight_kN_per_m2} kN/m²
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Total ULS Load</p>
                      <p className="text-2xl font-bold text-white">
                        {results.total_load_uls_kN_per_m2} kN/m²
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Design Actions */}
              <Card variant="glass" className="border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center space-x-2">
                    <FiActivity className="text-purple-400" />
                    <span>Design Actions (EN 1990)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">M_Ed,x</p>
                      <p className="text-2xl font-bold text-white">
                        {results.design_moments.M_Ed_x} kN·m
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/50">
                      <p className="text-gray-300 text-xs uppercase mb-2">M_Ed,y</p>
                      <p className="text-2xl font-bold text-purple-300">
                        {results.design_moments.M_Ed_y} kN·m
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">V_Ed</p>
                      <p className="text-2xl font-bold text-white">
                        {results.design_shears.V_Ed} kN
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Check Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Bending X */}
                <motion.div
                  className="h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'h-full border-2 shadow-lg',
                      results.bending_check_x.status === 'PASS'
                        ? 'border-green-500/50'
                        : 'border-red-500/50',
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>Bending Resistance (X)</span>
                          {results.bending_check_x.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  {getRecommendation(
                                    'bendingX',
                                    parseFloat(results.bending_check_x.utilisation),
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
                            results.bending_check_x.status === 'PASS'
                              ? 'bg-green-500'
                              : 'bg-red-500',
                          )}
                        >
                          {results.bending_check_x.status === 'PASS' ? (
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
                          <p className="text-gray-400 text-xs">M_Ed</p>
                          <p className="text-white font-bold">
                            {results.design_moments.M_Ed_x} kN·m
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">M_Rd</p>
                          <p className="text-white font-bold">
                            {results.bending_check_x.M_Rd} kN·m
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">As,req</p>
                          <p className="text-white font-bold">
                            {results.reinforcement_x.As_required} mm²/m
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">As,prov</p>
                          <p className="text-white font-bold">
                            {results.reinforcement_x.As_provided} mm²/m
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Utilisation</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.bending_check_x.status === 'PASS'
                                ? 'text-green-400'
                                : 'text-red-400',
                            )}
                          >
                            {results.bending_check_x.utilisation}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(results.bending_check_x.utilisation, 100)}%`,
                            }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className={cn(
                              'h-full rounded-full',
                              results.bending_check_x.status === 'PASS'
                                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                : 'bg-gradient-to-r from-red-500 to-orange-500',
                            )}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                          results.bending_check_x.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.bending_check_x.status}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Bending Y */}
                <motion.div
                  className="h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'h-full border-2 shadow-lg',
                      results.bending_check_y.status === 'PASS'
                        ? 'border-green-500/50'
                        : 'border-red-500/50',
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>Bending Resistance (Y)</span>
                          {results.bending_check_y.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  {getRecommendation(
                                    'bendingY',
                                    parseFloat(results.bending_check_y.utilisation),
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
                            results.bending_check_y.status === 'PASS'
                              ? 'bg-green-500'
                              : 'bg-red-500',
                          )}
                        >
                          {results.bending_check_y.status === 'PASS' ? (
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
                          <p className="text-gray-400 text-xs">M_Ed</p>
                          <p className="text-white font-bold">
                            {results.design_moments.M_Ed_y} kN·m
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">M_Rd</p>
                          <p className="text-white font-bold">
                            {results.bending_check_y.M_Rd} kN·m
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">As,req</p>
                          <p className="text-white font-bold">
                            {results.reinforcement_y.As_required} mm²/m
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">As,prov</p>
                          <p className="text-white font-bold">
                            {results.reinforcement_y.As_provided} mm²/m
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Utilisation</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.bending_check_y.status === 'PASS'
                                ? 'text-green-400'
                                : 'text-red-400',
                            )}
                          >
                            {results.bending_check_y.utilisation}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(results.bending_check_y.utilisation, 100)}%`,
                            }}
                            transition={{ duration: 1, delay: 0.6 }}
                            className={cn(
                              'h-full rounded-full',
                              results.bending_check_y.status === 'PASS'
                                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                : 'bg-gradient-to-r from-red-500 to-orange-500',
                            )}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                          results.bending_check_y.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.bending_check_y.status}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Shear */}
                <motion.div
                  className="h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'h-full border-2 shadow-lg',
                      results.shear_check.status === 'PASS'
                        ? 'border-green-500/50'
                        : 'border-red-500/50',
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>Shear Resistance</span>
                          {results.shear_check.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  {getRecommendation(
                                    'shear',
                                    parseFloat(results.shear_check.utilisation),
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
                            results.shear_check.status === 'PASS' ? 'bg-green-500' : 'bg-red-500',
                          )}
                        >
                          {results.shear_check.status === 'PASS' ? (
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
                          <p className="text-gray-400 text-xs">V_Ed</p>
                          <p className="text-white font-bold">{results.design_shears.V_Ed} kN</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">V_Rd,c</p>
                          <p className="text-white font-bold">{results.shear_check.V_Rd_c} kN</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">k</p>
                          <p className="text-white font-bold">{results.shear_check.k}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">ρ_l</p>
                          <p className="text-white font-bold">{results.shear_check.rho_l}%</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Utilisation</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.shear_check.status === 'PASS'
                                ? 'text-green-400'
                                : 'text-red-400',
                            )}
                          >
                            {results.shear_check.utilisation}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(results.shear_check.utilisation, 100)}%`,
                            }}
                            transition={{ duration: 1, delay: 0.7 }}
                            className={cn(
                              'h-full rounded-full',
                              results.shear_check.status === 'PASS'
                                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                : 'bg-gradient-to-r from-red-500 to-orange-500',
                            )}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                          results.shear_check.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.shear_check.status}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Deflection */}
                <motion.div
                  className="h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'h-full border-2 shadow-lg',
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
                          <p className="text-gray-400 text-xs">L/d actual</p>
                          <p className="text-white font-bold">
                            {results.deflection_check.actual_ld}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">L/d allowable</p>
                          <p className="text-white font-bold">
                            {results.deflection_check.allowable_ld}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">δ actual</p>
                          <p className="text-white font-bold">
                            {results.deflection_check.delta_actual} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">δ limit</p>
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

                {/* Crack Width */}
                <motion.div
                  className="h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'h-full border-2 shadow-lg',
                      results.crack_width_check.status === 'PASS'
                        ? 'border-green-500/50'
                        : 'border-red-500/50',
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>Crack Width (SLS)</span>
                          {results.crack_width_check.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  {getRecommendation(
                                    'crackWidth',
                                    parseFloat(String(results.crack_width_check.utilisation)),
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
                            results.crack_width_check.status === 'PASS'
                              ? 'bg-green-500'
                              : 'bg-red-500',
                          )}
                        >
                          {results.crack_width_check.status === 'PASS' ? (
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
                          <p className="text-gray-400 text-xs">w_k</p>
                          <p className="text-white font-bold">{results.crack_width_check.w_k} mm</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Limit</p>
                          <p className="text-white font-bold">
                            {results.crack_width_check.w_k_limit} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">s_r,max</p>
                          <p className="text-white font-bold">
                            {results.crack_width_check.sr_max} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">σ_s</p>
                          <p className="text-white font-bold">
                            {results.crack_width_check.sigma_s} MPa
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Utilisation</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.crack_width_check.status === 'PASS'
                                ? 'text-green-400'
                                : 'text-red-400',
                            )}
                          >
                            {results.crack_width_check.utilisation}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(parseFloat(String(results.crack_width_check.utilisation)), 100)}%`,
                            }}
                            transition={{ duration: 1, delay: 0.85 }}
                            className={cn(
                              'h-full rounded-full',
                              results.crack_width_check.status === 'PASS'
                                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                : 'bg-gradient-to-r from-red-500 to-orange-500',
                            )}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                          results.crack_width_check.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.crack_width_check.status}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Reinforcement Schedule */}
              <Card variant="glass" className="border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center space-x-2">
                    <span className="text-2xl">🔩</span>
                    <span>Reinforcement Schedule</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="py-2 text-left text-gray-400">Direction</th>
                          <th className="py-2 text-center text-gray-400">As,req</th>
                          <th className="py-2 text-center text-gray-400">As,prov</th>
                          <th className="py-2 text-center text-gray-400">Bar Spec</th>
                          <th className="py-2 text-center text-gray-400">Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-800">
                          <td className="py-2 text-white font-semibold">X (main)</td>
                          <td className="py-2 text-center text-gray-300">
                            {results.reinforcement_x.As_required} mm²/m
                          </td>
                          <td className="py-2 text-center text-green-400 font-bold">
                            {results.reinforcement_x.As_provided} mm²/m
                          </td>
                          <td className="py-2 text-center text-yellow-400 font-bold">
                            T{results.reinforcement_x.bar_diameter}@
                            {results.reinforcement_x.spacing}
                          </td>
                          <td className="py-2 text-center text-cyan-400">
                            {(
                              results.reinforcement_x.As_provided /
                              results.reinforcement_x.As_required
                            ).toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-white font-semibold">Y (dist.)</td>
                          <td className="py-2 text-center text-gray-300">
                            {results.reinforcement_y.As_required} mm²/m
                          </td>
                          <td className="py-2 text-center text-green-400 font-bold">
                            {results.reinforcement_y.As_provided} mm²/m
                          </td>
                          <td className="py-2 text-center text-yellow-400 font-bold">
                            T{results.reinforcement_y.bar_diameter}@
                            {results.reinforcement_y.spacing}
                          </td>
                          <td className="py-2 text-center text-cyan-400">
                            {(
                              results.reinforcement_y.As_provided /
                              results.reinforcement_y.As_required
                            ).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
                    calculatorKey="deck_slab"
                    inputs={formData as unknown as Record<string, string>}
                    results={results}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    summary={
                      results ? `${results.maxUtilisation?.toFixed(1) || '-'}% util` : undefined
                    }
                  />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Visualization Tab */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.5 }}
              className="mt-12 space-y-6"
            >
              {/* Utilisation Dashboard */}
              <Card variant="glass" className="border-neon-cyan/30">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                    <FiActivity className="text-neon-cyan" />
                    <span>Utilisation Dashboard</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        label: 'Bending (X)',
                        val: results.utilisation_summary.bending_x,
                        color: 'cyan',
                      },
                      {
                        label: 'Bending (Y)',
                        val: results.utilisation_summary.bending_y,
                        color: 'purple',
                      },
                      { label: 'Shear', val: results.utilisation_summary.shear, color: 'blue' },
                      {
                        label: 'Deflection',
                        val: results.utilisation_summary.deflection,
                        color: 'amber',
                      },
                      {
                        label: 'Crack Width',
                        val: results.utilisation_summary.crack_width,
                        color: 'pink',
                      },
                    ].map((item, i) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 text-sm font-medium">{item.label}</span>
                          <span
                            className={cn(
                              'font-bold text-sm',
                              item.val <= 100 ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {item.val}%
                            {item.label === governingLabel[results.governing_check] && (
                              <span className="ml-2 text-xs text-yellow-400">★ governing</span>
                            )}
                          </span>
                        </div>
                        <div className="h-6 bg-gray-800 rounded-full overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(item.val, 100)}%` }}
                            transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                            className={cn(
                              'h-full rounded-full',
                              item.val <= 60
                                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                : item.val <= 90
                                  ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                                  : item.val <= 100
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                                    : 'bg-gradient-to-r from-red-500 to-rose-500',
                            )}
                          />
                          {/* 100% marker line */}
                          <div
                            className="absolute top-0 bottom-0 right-0 w-px bg-white/30"
                            style={{ left: '100%' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 3D Structural Model */}
              <Card variant="glass" className="border-neon-cyan/30">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                    <FiEye className="text-neon-cyan" />
                    <span>3D Structural Model</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Interactive3DDiagram height="h-[500px]" cameraPosition={[10, 6, 10]}>
                    <DeckSlab3D
                      spanX={parseFloat(formData.lengthX) || 6}
                      spanY={parseFloat(formData.lengthY) || 6}
                      thickness={parseFloat(formData.thickness) || 200}
                      cover={parseFloat(formData.coverBottom) || 25}
                      barDiameter={parseFloat(formData.barDiameter) || 12}
                      barSpacingX={results?.reinforcement_x?.spacing || 150}
                      barSpacingY={results?.reinforcement_y?.spacing || 150}
                      supportX={formData.supportX}
                      supportY={formData.supportY}
                      udl={results?.total_load_uls_kN_per_m2 || 0}
                      isOneWay={results?.isOneWay ?? formData.slabType === 'one_way'}
                      utilisation={Math.max(
                        results.utilisation_summary.bending_x || 0,
                        results.utilisation_summary.bending_y || 0,
                        results.utilisation_summary.shear || 0,
                        results.utilisation_summary.deflection || 0,
                        results.utilisation_summary.crack_width || 0,
                      )}
                      status={results.overall_pass ? 'PASS' : 'FAIL'}
                      concreteGrade={formData.concreteGrade}
                      steelGrade={formData.steelGrade}
                    />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>

              {/* Structural Diagrams — BMD / SFD / Deflected Shape */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Bending Moment Diagram */}
                <Card variant="glass" className="border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center space-x-2">
                      <span className="text-purple-400">📊</span>
                      <span>Bending Moment Diagram (X)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full">
                      {/* Beam line */}
                      <line x1="40" y1="100" x2="360" y2="100" stroke="#64748b" strokeWidth="2" />
                      {/* Supports */}
                      <polygon points="40,105 30,120 50,120" fill="#00d9ff" opacity="0.7" />
                      <polygon points="360,105 350,120 370,120" fill="#00d9ff" opacity="0.7" />
                      {formData.supportX === 'continuous' && (
                        <>
                          <line
                            x1="28"
                            y1="121"
                            x2="52"
                            y2="121"
                            stroke="#a855f7"
                            strokeWidth="2"
                          />
                          <line
                            x1="348"
                            y1="121"
                            x2="372"
                            y2="121"
                            stroke="#a855f7"
                            strokeWidth="2"
                          />
                        </>
                      )}

                      {/* Positive BMD (parabola below beam) */}
                      {(() => {
                        const M_pos = results.design_moments.M_Ed_x_pos || 0;
                        const M_neg = results.design_moments.M_Ed_x_neg || 0;
                        const maxM = Math.max(M_pos, M_neg, 1);
                        const posH = (M_pos / maxM) * 60;
                        const negH = (M_neg / maxM) * 40;
                        // Parabolic positive moment (mid-span)
                        const pts: string[] = ['40,100'];
                        for (let i = 0; i <= 20; i++) {
                          const t = i / 20;
                          const x = 40 + t * 320;
                          const y = 100 + posH * 4 * t * (1 - t); // parabola
                          pts.push(`${x.toFixed(0)},${y.toFixed(0)}`);
                        }
                        pts.push('360,100');
                        return (
                          <>
                            <polygon
                              points={pts.join(' ')}
                              fill="rgba(168,85,247,0.2)"
                              stroke="#a855f7"
                              strokeWidth="2"
                            />
                            <text
                              x="200"
                              y={105 + posH * 0.6}
                              fill="#a855f7"
                              fontSize="12"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              +{M_pos.toFixed(1)} kN·m
                            </text>
                            {/* Negative moment at supports */}
                            {M_neg > 0 && (
                              <>
                                <polygon
                                  points={`40,100 40,${100 - negH} 80,${100 - negH * 0.3} 80,100`}
                                  fill="rgba(239,68,68,0.2)"
                                  stroke="#ef4444"
                                  strokeWidth="1.5"
                                />
                                <polygon
                                  points={`320,100 320,${100 - negH * 0.3} 360,${100 - negH} 360,100`}
                                  fill="rgba(239,68,68,0.2)"
                                  stroke="#ef4444"
                                  strokeWidth="1.5"
                                />
                                <text
                                  x="55"
                                  y={95 - negH * 0.5}
                                  fill="#ef4444"
                                  fontSize="11"
                                  textAnchor="middle"
                                >
                                  -{M_neg.toFixed(1)}
                                </text>
                              </>
                            )}
                          </>
                        );
                      })()}
                      <text x="200" y="15" fill="#9ca3af" fontSize="11" textAnchor="middle">
                        ULS Bending Moment (X-direction)
                      </text>
                      <text x="200" y="190" fill="#64748b" fontSize="10" textAnchor="middle">
                        Span = {results.lx} m
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Shear Force Diagram */}
                <Card variant="glass" className="border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center space-x-2">
                      <span className="text-blue-400">📈</span>
                      <span>Shear Force Diagram (X)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full">
                      {/* Beam line */}
                      <line
                        x1="40"
                        y1="100"
                        x2="360"
                        y2="100"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeDasharray="4"
                      />
                      {/* Supports */}
                      <polygon points="40,105 30,120 50,120" fill="#00d9ff" opacity="0.7" />
                      <polygon points="360,105 350,120 370,120" fill="#00d9ff" opacity="0.7" />

                      {(() => {
                        const V = results.design_shears.V_Ed || 0;
                        const maxV = Math.max(V, 1);
                        const shearH = Math.min(60, (V / maxV) * 60);
                        return (
                          <>
                            {/* Positive shear (left) — triangle */}
                            <polygon
                              points={`40,${100 - shearH} 40,100 200,100`}
                              fill="rgba(59,130,246,0.2)"
                              stroke="#3b82f6"
                              strokeWidth="2"
                            />
                            {/* Negative shear (right) — triangle */}
                            <polygon
                              points={`200,100 360,100 360,${100 + shearH}`}
                              fill="rgba(239,68,68,0.15)"
                              stroke="#ef4444"
                              strokeWidth="2"
                            />
                            <text
                              x="100"
                              y={92 - shearH * 0.4}
                              fill="#3b82f6"
                              fontSize="12"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              +{V.toFixed(1)} kN
                            </text>
                            <text
                              x="300"
                              y={115 + shearH * 0.4}
                              fill="#ef4444"
                              fontSize="12"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              -{V.toFixed(1)} kN
                            </text>
                          </>
                        );
                      })()}
                      <text x="200" y="15" fill="#9ca3af" fontSize="11" textAnchor="middle">
                        ULS Shear Force (X-direction)
                      </text>
                      <text x="200" y="190" fill="#64748b" fontSize="10" textAnchor="middle">
                        Span = {results.lx} m
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Deflected Shape */}
                <Card variant="glass" className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center space-x-2">
                      <span className="text-amber-400">📉</span>
                      <span>Deflected Shape</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 180" className="w-full">
                      {/* Original beam line */}
                      <line
                        x1="40"
                        y1="60"
                        x2="360"
                        y2="60"
                        stroke="#64748b"
                        strokeWidth="1"
                        strokeDasharray="6"
                        opacity="0.5"
                      />
                      {/* Supports */}
                      <polygon points="40,65 30,80 50,80" fill="#00d9ff" opacity="0.7" />
                      <polygon points="360,65 350,80 370,80" fill="#00d9ff" opacity="0.7" />

                      {(() => {
                        const delta = results.deflection_check.delta_actual || 0;
                        const deltaLimit = results.deflection_check.delta_limit || 1;
                        const deflH = Math.min(50, Math.max(15, (delta / deltaLimit) * 40));
                        // Deflected curve (parabola)
                        const pts: string[] = [];
                        for (let i = 0; i <= 30; i++) {
                          const t = i / 30;
                          const x = 40 + t * 320;
                          const y = 60 + deflH * 4 * t * (1 - t);
                          pts.push(`${x.toFixed(0)},${y.toFixed(0)}`);
                        }
                        return (
                          <>
                            <polyline
                              points={pts.join(' ')}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="2.5"
                            />
                            {/* Mid-span deflection arrow */}
                            <line
                              x1="200"
                              y1="60"
                              x2="200"
                              y2={60 + deflH}
                              stroke="#f59e0b"
                              strokeWidth="1"
                              strokeDasharray="3"
                            />
                            <text
                              x="210"
                              y={60 + deflH / 2 + 4}
                              fill="#f59e0b"
                              fontSize="11"
                              fontWeight="bold"
                            >
                              δ = {delta.toFixed(1)} mm
                            </text>
                            <text x="210" y={60 + deflH / 2 + 18} fill="#64748b" fontSize="10">
                              Limit: {deltaLimit.toFixed(1)} mm
                            </text>
                          </>
                        );
                      })()}
                      <text x="200" y="15" fill="#9ca3af" fontSize="11" textAnchor="middle">
                        SLS Deflected Shape
                      </text>
                      <text x="200" y="170" fill="#64748b" fontSize="10" textAnchor="middle">
                        Span = {results.lx} m | L/d = {results.deflection_check.actual_ld} (limit{' '}
                        {results.deflection_check.allowable_ld})
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Cross Section Diagram */}
                <Card variant="glass" className="border-cyan-500/30">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center space-x-2">
                      <span className="text-cyan-400">🔍</span>
                      <span>Cross Section Detail</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 400 200" className="w-full">
                      <defs>
                        <linearGradient id="vizSlabGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#6B7280" />
                          <stop offset="50%" stopColor="#9CA3AF" />
                          <stop offset="100%" stopColor="#6B7280" />
                        </linearGradient>
                      </defs>
                      {/* Slab body */}
                      <rect
                        x="60"
                        y="40"
                        width="280"
                        height={Math.min(100, parseFloat(formData.thickness) / 3)}
                        rx="2"
                        fill="url(#vizSlabGrad)"
                        stroke="#00d9ff"
                        strokeWidth="1.5"
                      />

                      {/* Bottom bars (X-direction) */}
                      {(() => {
                        const slabH = Math.min(100, parseFloat(formData.thickness) / 3);
                        const dia = parseFloat(formData.barDiameter) || 12;
                        const r = Math.max(dia / 6, 2);
                        const botY = 40 + slabH - 10;
                        const bars = [80, 110, 140, 170, 200, 230, 260, 290, 320];
                        return bars.map((cx, i) => (
                          <circle
                            key={`vb-${i}`}
                            cx={cx}
                            cy={botY}
                            r={r}
                            fill="#fbbf24"
                            stroke="#f59e0b"
                            strokeWidth="0.8"
                          />
                        ));
                      })()}

                      {/* Top bars (distribution) */}
                      {(() => {
                        const dia = parseFloat(formData.barDiameter) || 12;
                        const r = Math.max(dia / 8, 1.5);
                        const bars = [90, 130, 170, 210, 250, 290, 320];
                        return bars.map((cx, i) => (
                          <circle
                            key={`vt-${i}`}
                            cx={cx}
                            cy={50}
                            r={r}
                            fill="#fb923c"
                            stroke="#f97316"
                            strokeWidth="0.6"
                            opacity="0.7"
                          />
                        ));
                      })()}

                      {/* Dimension: height */}
                      {(() => {
                        const slabH = Math.min(100, parseFloat(formData.thickness) / 3);
                        return (
                          <>
                            <line
                              x1="370"
                              y1="40"
                              x2="370"
                              y2={40 + slabH}
                              stroke="#00d9ff"
                              strokeWidth="1"
                            />
                            <line
                              x1="365"
                              y1="40"
                              x2="375"
                              y2="40"
                              stroke="#00d9ff"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="365"
                              y1={40 + slabH}
                              x2="375"
                              y2={40 + slabH}
                              stroke="#00d9ff"
                              strokeWidth="1.5"
                            />
                            <text
                              x="380"
                              y={40 + slabH / 2 + 4}
                              fill="#00d9ff"
                              fontSize="11"
                              fontWeight="bold"
                            >
                              {formData.thickness}mm
                            </text>
                          </>
                        );
                      })()}

                      {/* Cover indicator */}
                      {(() => {
                        const slabH = Math.min(100, parseFloat(formData.thickness) / 3);
                        return (
                          <text
                            x="35"
                            y={40 + slabH - 5}
                            fill="#ef4444"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            c={formData.coverBottom}
                          </text>
                        );
                      })()}

                      {/* Labels */}
                      <text
                        x="200"
                        y="180"
                        fill="#fbbf24"
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        X: T{results.reinforcement_x.bar_diameter}@{results.reinforcement_x.spacing}
                        c/c
                      </text>
                      <text x="200" y="195" fill="#fb923c" fontSize="10" textAnchor="middle">
                        Y: T{results.reinforcement_y.bar_diameter}@{results.reinforcement_y.spacing}
                        c/c
                      </text>
                    </svg>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Statistics */}
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Concrete Grade',
                    value: formData.concreteGrade,
                    sub: `fck = ${results.concrete_fck} MPa`,
                    icon: '🧱',
                  },
                  {
                    label: 'Eff. Depth (X)',
                    value: `${results.effective_depth_x} mm`,
                    sub: `d_y = ${results.effective_depth_y} mm`,
                    icon: '📐',
                  },
                  {
                    label: 'X-Direction',
                    value: `T${results.reinforcement_x.bar_diameter}@${results.reinforcement_x.spacing}`,
                    sub: `${results.reinforcement_x.As_provided} mm²/m`,
                    icon: '🔗',
                  },
                  {
                    label: 'Y-Direction',
                    value: `T${results.reinforcement_y.bar_diameter}@${results.reinforcement_y.spacing}`,
                    sub: `${results.reinforcement_y.As_provided} mm²/m`,
                    icon: '🔗',
                  },
                ].map((s) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-gray-900/50 border border-gray-700"
                  >
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <p className="text-xs text-gray-400 uppercase">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Design Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card variant="glass" className="border-cyan-500/30">
                  <CardContent className="pt-6">
                    <p className="text-xs text-gray-400 uppercase mb-1">Span Type</p>
                    <p className="text-lg font-bold text-white">
                      {results.isOneWay ? 'One-Way' : 'Two-Way'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Ly/Lx = {results.span_ratio}</p>
                  </CardContent>
                </Card>
                <Card variant="glass" className="border-purple-500/30">
                  <CardContent className="pt-6">
                    <p className="text-xs text-gray-400 uppercase mb-1">ULS Loading</p>
                    <p className="text-lg font-bold text-white">
                      {results.total_load_uls_kN_per_m2} kN/m²
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      SW = {results.self_weight_kN_per_m2} kN/m²
                    </p>
                  </CardContent>
                </Card>
                <Card
                  variant="glass"
                  className={cn(
                    'border-2 shadow-lg',
                    results.overall_pass ? 'border-green-500/50' : 'border-red-500/50',
                  )}
                >
                  <CardContent className="pt-6">
                    <p className="text-xs text-gray-400 uppercase mb-1">Overall Status</p>
                    <p
                      className={cn(
                        'text-lg font-bold',
                        results.overall_pass ? 'text-green-400' : 'text-red-400',
                      )}
                    >
                      {results.overall_pass ? '✅ ALL PASS' : '❌ SOME FAIL'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">5 checks performed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Export button for viz tab too */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-3"
              >
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
                  calculatorKey="deck_slab"
                  inputs={formData as unknown as Record<string, string>}
                  results={results}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  summary={
                    results ? `${results.maxUtilisation?.toFixed(1) || '-'}% util` : undefined
                  }
                />
              </motion.div>
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
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
};

export default DeckSlab;
