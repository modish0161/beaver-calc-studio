// =============================================================================
// Steel Beam Bending Calculator — Premium Version
// EN 1993-1-1 (Eurocode 3) — Steel Beam Design
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
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SteelBeam3D from '../../components/3d/scenes/SteelBeam3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { STEEL_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { validateNumericInputs } from '../../lib/validation';
// =============================================================================
// Types
// =============================================================================

interface SteelBeamForm {
  // Section
  section_type: string;
  custom_h: string;
  custom_b: string;
  custom_tw: string;
  custom_tf: string;

  // Geometry
  span: string;
  lateral_restraint: string;
  restraint_spacing: string;

  // Loading
  dead_load_udl: string;
  live_load_udl: string;
  dead_load_point: string;
  live_load_point: string;
  point_load_position: string;

  // Material
  steel_grade: string;

  // Factors
  gamma_g: string;
  gamma_q: string;
  gamma_m0: string;
  gamma_m1: string;
  deflection_limit: string;

  // Project Info
  projectName: string;
  reference: string;
}

interface SteelBeamResults {
  // Section Properties
  h: number;
  b: number;
  tw: number;
  tf: number;
  A: number;
  Iy: number;
  Wel_y: number;
  Wpl_y: number;
  iz: number;
  Iw: number;
  It: number;

  // Material
  fy: number;
  E: number;

  // Actions
  M_Ed: number;
  V_Ed: number;

  // Resistance
  Mc_Rd: number;
  Vpl_Rd: number;
  Mb_Rd: number;

  // LTB
  Lcr: number;
  lambda_LT: number;
  chi_LT: number;

  // Utilisation
  bending_util: number;
  shear_util: number;
  ltb_util: number;
  max_util: number;

  // Deflection
  deflection: number;
  deflection_limit: number;
  deflection_ratio: number;

  // Summary
  critical_check: string;
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// Steel Section Database (UK sections to EN)
// =============================================================================

const STEEL_SECTIONS: Record<
  string,
  {
    h: number;
    b: number;
    tw: number;
    tf: number;
    A: number;
    Iy: number;
    Wel_y: number;
    Wpl_y: number;
    iz: number;
    Iw: number;
    It: number;
  }
> = {
  'UKB 127x76x13': {
    h: 127.0,
    b: 76.0,
    tw: 4.0,
    tf: 7.6,
    A: 1650,
    Iy: 4730000,
    Wel_y: 74500,
    Wpl_y: 84200,
    iz: 16.6,
    Iw: 2.85e9,
    It: 10300,
  },
  'UKB 152x89x16': {
    h: 152.4,
    b: 88.7,
    tw: 4.5,
    tf: 7.7,
    A: 2030,
    Iy: 8340000,
    Wel_y: 109000,
    Wpl_y: 123000,
    iz: 19.4,
    Iw: 6.14e9,
    It: 13300,
  },
  'UKB 178x102x19': {
    h: 177.8,
    b: 101.2,
    tw: 4.8,
    tf: 7.9,
    A: 2430,
    Iy: 13600000,
    Wel_y: 153000,
    Wpl_y: 171000,
    iz: 21.8,
    Iw: 11.7e9,
    It: 16300,
  },
  'UKB 203x102x23': {
    h: 203.2,
    b: 101.8,
    tw: 5.4,
    tf: 9.3,
    A: 2940,
    Iy: 21000000,
    Wel_y: 207000,
    Wpl_y: 234000,
    iz: 22.2,
    Iw: 17.9e9,
    It: 27300,
  },
  'UKB 203x133x25': {
    h: 203.2,
    b: 133.2,
    tw: 5.7,
    tf: 7.8,
    A: 3200,
    Iy: 23400000,
    Wel_y: 230000,
    Wpl_y: 258000,
    iz: 30.1,
    Iw: 32.0e9,
    It: 18600,
  },
  'UKB 203x133x30': {
    h: 206.8,
    b: 133.9,
    tw: 6.4,
    tf: 9.6,
    A: 3820,
    Iy: 29000000,
    Wel_y: 280000,
    Wpl_y: 314000,
    iz: 30.4,
    Iw: 40.3e9,
    It: 29600,
  },
  'UKB 254x102x22': {
    h: 254.0,
    b: 101.6,
    tw: 5.7,
    tf: 6.8,
    A: 2800,
    Iy: 28400000,
    Wel_y: 224000,
    Wpl_y: 259000,
    iz: 21.5,
    Iw: 23.8e9,
    It: 13700,
  },
  'UKB 254x102x25': {
    h: 257.2,
    b: 101.9,
    tw: 6.0,
    tf: 8.4,
    A: 3200,
    Iy: 34100000,
    Wel_y: 265000,
    Wpl_y: 306000,
    iz: 21.8,
    Iw: 29.2e9,
    It: 21400,
  },
  'UKB 254x102x28': {
    h: 260.4,
    b: 102.2,
    tw: 6.3,
    tf: 10.0,
    A: 3600,
    Iy: 40100000,
    Wel_y: 308000,
    Wpl_y: 353000,
    iz: 22.0,
    Iw: 35.0e9,
    It: 31400,
  },
  'UKB 254x146x31': {
    h: 251.4,
    b: 146.1,
    tw: 6.0,
    tf: 8.6,
    A: 3970,
    Iy: 44100000,
    Wel_y: 351000,
    Wpl_y: 393000,
    iz: 32.6,
    Iw: 71.7e9,
    It: 28800,
  },
  'UKB 254x146x37': {
    h: 256.0,
    b: 146.4,
    tw: 6.3,
    tf: 10.9,
    A: 4720,
    Iy: 55100000,
    Wel_y: 431000,
    Wpl_y: 483000,
    iz: 33.1,
    Iw: 91.3e9,
    It: 47700,
  },
  'UKB 254x146x43': {
    h: 259.6,
    b: 147.3,
    tw: 7.2,
    tf: 12.7,
    A: 5470,
    Iy: 64700000,
    Wel_y: 498000,
    Wpl_y: 566000,
    iz: 33.5,
    Iw: 109e9,
    It: 71400,
  },
  'UKB 305x102x25': {
    h: 305.1,
    b: 101.6,
    tw: 5.8,
    tf: 7.0,
    A: 3160,
    Iy: 44900000,
    Wel_y: 294000,
    Wpl_y: 342000,
    iz: 21.6,
    Iw: 37.3e9,
    It: 16500,
  },
  'UKB 305x102x28': {
    h: 308.7,
    b: 101.8,
    tw: 6.0,
    tf: 8.8,
    A: 3590,
    Iy: 53700000,
    Wel_y: 348000,
    Wpl_y: 403000,
    iz: 21.9,
    Iw: 45.3e9,
    It: 26000,
  },
  'UKB 305x102x33': {
    h: 312.7,
    b: 102.4,
    tw: 6.6,
    tf: 10.8,
    A: 4180,
    Iy: 65000000,
    Wel_y: 416000,
    Wpl_y: 481000,
    iz: 22.2,
    Iw: 56.0e9,
    It: 40500,
  },
  'UKB 305x127x37': {
    h: 304.4,
    b: 123.4,
    tw: 7.1,
    tf: 10.7,
    A: 4720,
    Iy: 68600000,
    Wel_y: 451000,
    Wpl_y: 514000,
    iz: 27.0,
    Iw: 77.1e9,
    It: 47100,
  },
  'UKB 305x127x42': {
    h: 307.2,
    b: 124.3,
    tw: 8.0,
    tf: 12.1,
    A: 5340,
    Iy: 78800000,
    Wel_y: 513000,
    Wpl_y: 584000,
    iz: 27.3,
    Iw: 89.9e9,
    It: 64700,
  },
  'UKB 305x127x48': {
    h: 311.0,
    b: 125.3,
    tw: 9.0,
    tf: 14.0,
    A: 6090,
    Iy: 91800000,
    Wel_y: 591000,
    Wpl_y: 674000,
    iz: 27.6,
    Iw: 107e9,
    It: 91000,
  },
  'UKB 305x165x40': {
    h: 303.4,
    b: 165.0,
    tw: 6.0,
    tf: 10.2,
    A: 5130,
    Iy: 85000000,
    Wel_y: 560000,
    Wpl_y: 623000,
    iz: 38.1,
    Iw: 170e9,
    It: 51800,
  },
  'UKB 305x165x46': {
    h: 306.6,
    b: 165.7,
    tw: 6.7,
    tf: 11.8,
    A: 5870,
    Iy: 99600000,
    Wel_y: 650000,
    Wpl_y: 723000,
    iz: 38.5,
    Iw: 200e9,
    It: 72200,
  },
  'UKB 305x165x54': {
    h: 310.4,
    b: 166.9,
    tw: 7.9,
    tf: 13.7,
    A: 6870,
    Iy: 117000000,
    Wel_y: 754000,
    Wpl_y: 846000,
    iz: 39.0,
    Iw: 239e9,
    It: 103000,
  },
  'UKB 356x127x33': {
    h: 349.0,
    b: 125.4,
    tw: 6.0,
    tf: 8.5,
    A: 4210,
    Iy: 82200000,
    Wel_y: 471000,
    Wpl_y: 543000,
    iz: 27.0,
    Iw: 91.9e9,
    It: 31200,
  },
  'UKB 356x127x39': {
    h: 353.4,
    b: 126.0,
    tw: 6.6,
    tf: 10.7,
    A: 4980,
    Iy: 101000000,
    Wel_y: 572000,
    Wpl_y: 659000,
    iz: 27.5,
    Iw: 115e9,
    It: 50100,
  },
  'UKB 356x171x45': {
    h: 351.4,
    b: 171.1,
    tw: 7.0,
    tf: 9.7,
    A: 5730,
    Iy: 121000000,
    Wel_y: 688000,
    Wpl_y: 775000,
    iz: 39.3,
    Iw: 255e9,
    It: 51600,
  },
  'UKB 356x171x51': {
    h: 355.0,
    b: 171.5,
    tw: 7.4,
    tf: 11.5,
    A: 6490,
    Iy: 141000000,
    Wel_y: 794000,
    Wpl_y: 896000,
    iz: 39.8,
    Iw: 302e9,
    It: 73000,
  },
  'UKB 356x171x57': {
    h: 358.0,
    b: 172.2,
    tw: 8.1,
    tf: 13.0,
    A: 7260,
    Iy: 160000000,
    Wel_y: 894000,
    Wpl_y: 1010000,
    iz: 40.3,
    Iw: 347e9,
    It: 97400,
  },
  'UKB 356x171x67': {
    h: 363.4,
    b: 173.2,
    tw: 9.1,
    tf: 15.7,
    A: 8550,
    Iy: 194000000,
    Wel_y: 1067000,
    Wpl_y: 1210000,
    iz: 41.0,
    Iw: 428e9,
    It: 147000,
  },
  'UKB 406x140x39': {
    h: 398.0,
    b: 141.8,
    tw: 6.4,
    tf: 8.6,
    A: 4980,
    Iy: 125000000,
    Wel_y: 628000,
    Wpl_y: 721000,
    iz: 31.0,
    Iw: 176e9,
    It: 37100,
  },
  'UKB 406x140x46': {
    h: 403.2,
    b: 142.2,
    tw: 6.8,
    tf: 11.2,
    A: 5870,
    Iy: 156000000,
    Wel_y: 774000,
    Wpl_y: 888000,
    iz: 31.6,
    Iw: 222e9,
    It: 61500,
  },
  'UKB 406x178x54': {
    h: 402.6,
    b: 177.7,
    tw: 7.7,
    tf: 10.9,
    A: 6870,
    Iy: 187000000,
    Wel_y: 929000,
    Wpl_y: 1055000,
    iz: 41.4,
    Iw: 430e9,
    It: 73500,
  },
  'UKB 406x178x60': {
    h: 406.4,
    b: 177.9,
    tw: 7.9,
    tf: 12.8,
    A: 7640,
    Iy: 215000000,
    Wel_y: 1058000,
    Wpl_y: 1199000,
    iz: 41.9,
    Iw: 499e9,
    It: 103000,
  },
  'UKB 406x178x67': {
    h: 409.4,
    b: 178.8,
    tw: 8.8,
    tf: 14.3,
    A: 8550,
    Iy: 243000000,
    Wel_y: 1187000,
    Wpl_y: 1346000,
    iz: 42.4,
    Iw: 570e9,
    It: 138000,
  },
  'UKB 406x178x74': {
    h: 412.8,
    b: 179.5,
    tw: 9.5,
    tf: 16.0,
    A: 9450,
    Iy: 274000000,
    Wel_y: 1328000,
    Wpl_y: 1507000,
    iz: 42.9,
    Iw: 649e9,
    It: 177000,
  },
  'UKB 457x152x52': {
    h: 449.8,
    b: 152.4,
    tw: 7.6,
    tf: 10.9,
    A: 6640,
    Iy: 212000000,
    Wel_y: 942000,
    Wpl_y: 1096000,
    iz: 33.5,
    Iw: 351e9,
    It: 69100,
  },
  'UKB 457x152x60': {
    h: 454.6,
    b: 152.9,
    tw: 8.1,
    tf: 13.3,
    A: 7620,
    Iy: 254000000,
    Wel_y: 1118000,
    Wpl_y: 1287000,
    iz: 34.1,
    Iw: 428e9,
    It: 104000,
  },
  'UKB 457x152x67': {
    h: 458.0,
    b: 153.8,
    tw: 9.0,
    tf: 15.0,
    A: 8560,
    Iy: 289000000,
    Wel_y: 1262000,
    Wpl_y: 1453000,
    iz: 34.6,
    Iw: 492e9,
    It: 140000,
  },
  'UKB 457x152x74': {
    h: 462.0,
    b: 154.4,
    tw: 9.6,
    tf: 17.0,
    A: 9450,
    Iy: 326000000,
    Wel_y: 1411000,
    Wpl_y: 1627000,
    iz: 35.1,
    Iw: 561e9,
    It: 185000,
  },
  'UKB 457x152x82': {
    h: 465.8,
    b: 155.3,
    tw: 10.5,
    tf: 18.9,
    A: 10500,
    Iy: 366000000,
    Wel_y: 1572000,
    Wpl_y: 1811000,
    iz: 35.6,
    Iw: 636e9,
    It: 236000,
  },
  'UKB 457x191x67': {
    h: 453.4,
    b: 189.9,
    tw: 8.5,
    tf: 12.7,
    A: 8560,
    Iy: 294000000,
    Wel_y: 1296000,
    Wpl_y: 1471000,
    iz: 43.5,
    Iw: 755e9,
    It: 112000,
  },
  'UKB 457x191x74': {
    h: 457.0,
    b: 190.4,
    tw: 9.0,
    tf: 14.5,
    A: 9450,
    Iy: 333000000,
    Wel_y: 1458000,
    Wpl_y: 1653000,
    iz: 44.0,
    Iw: 865e9,
    It: 149000,
  },
  'UKB 457x191x82': {
    h: 460.0,
    b: 191.3,
    tw: 9.9,
    tf: 16.0,
    A: 10500,
    Iy: 370000000,
    Wel_y: 1610000,
    Wpl_y: 1830000,
    iz: 44.5,
    Iw: 967e9,
    It: 188000,
  },
  'UKB 457x191x89': {
    h: 463.4,
    b: 191.9,
    tw: 10.5,
    tf: 17.7,
    A: 11400,
    Iy: 410000000,
    Wel_y: 1769000,
    Wpl_y: 2010000,
    iz: 45.0,
    Iw: 1073e9,
    It: 237000,
  },
  'UKB 457x191x98': {
    h: 467.2,
    b: 192.8,
    tw: 11.4,
    tf: 19.6,
    A: 12500,
    Iy: 457000000,
    Wel_y: 1955000,
    Wpl_y: 2232000,
    iz: 45.5,
    Iw: 1206e9,
    It: 304000,
  },
  'UKB 533x210x82': {
    h: 528.3,
    b: 208.8,
    tw: 9.6,
    tf: 13.2,
    A: 10500,
    Iy: 475000000,
    Wel_y: 1798000,
    Wpl_y: 2058000,
    iz: 47.5,
    Iw: 1326e9,
    It: 146000,
  },
  'UKB 533x210x92': {
    h: 533.1,
    b: 209.3,
    tw: 10.1,
    tf: 15.6,
    A: 11700,
    Iy: 553000000,
    Wel_y: 2075000,
    Wpl_y: 2360000,
    iz: 48.2,
    Iw: 1554e9,
    It: 198000,
  },
  'UKB 533x210x101': {
    h: 536.7,
    b: 210.0,
    tw: 10.8,
    tf: 17.4,
    A: 12900,
    Iy: 614000000,
    Wel_y: 2289000,
    Wpl_y: 2612000,
    iz: 48.7,
    Iw: 1741e9,
    It: 257000,
  },
  'UKB 533x210x109': {
    h: 539.5,
    b: 210.8,
    tw: 11.6,
    tf: 18.8,
    A: 13900,
    Iy: 666000000,
    Wel_y: 2469000,
    Wpl_y: 2827000,
    iz: 49.2,
    Iw: 1903e9,
    It: 310000,
  },
  'UKB 533x210x122': {
    h: 544.5,
    b: 211.9,
    tw: 12.7,
    tf: 21.3,
    A: 15600,
    Iy: 760000000,
    Wel_y: 2792000,
    Wpl_y: 3196000,
    iz: 49.8,
    Iw: 2198e9,
    It: 408000,
  },
  'UKB 610x229x101': {
    h: 602.6,
    b: 227.6,
    tw: 10.5,
    tf: 14.8,
    A: 12900,
    Iy: 757000000,
    Wel_y: 2513000,
    Wpl_y: 2879000,
    iz: 52.3,
    Iw: 2536e9,
    It: 206000,
  },
  'UKB 610x229x113': {
    h: 607.6,
    b: 228.2,
    tw: 11.1,
    tf: 17.3,
    A: 14400,
    Iy: 874000000,
    Wel_y: 2877000,
    Wpl_y: 3281000,
    iz: 53.0,
    Iw: 2950e9,
    It: 284000,
  },
  'UKB 610x229x125': {
    h: 612.2,
    b: 229.0,
    tw: 11.9,
    tf: 19.6,
    A: 15900,
    Iy: 986000000,
    Wel_y: 3220000,
    Wpl_y: 3676000,
    iz: 53.7,
    Iw: 3372e9,
    It: 378000,
  },
  'UKB 610x229x140': {
    h: 617.2,
    b: 230.2,
    tw: 13.1,
    tf: 22.1,
    A: 17800,
    Iy: 1120000000,
    Wel_y: 3630000,
    Wpl_y: 4142000,
    iz: 54.3,
    Iw: 3866e9,
    It: 504000,
  },
  'UKB 610x305x149': {
    h: 612.4,
    b: 304.8,
    tw: 11.8,
    tf: 19.7,
    A: 19000,
    Iy: 1260000000,
    Wel_y: 4113000,
    Wpl_y: 4594000,
    iz: 72.1,
    Iw: 8140e9,
    It: 477000,
  },
  'UKB 610x305x179': {
    h: 620.2,
    b: 307.1,
    tw: 14.1,
    tf: 23.6,
    A: 22800,
    Iy: 1530000000,
    Wel_y: 4932000,
    Wpl_y: 5521000,
    iz: 73.1,
    Iw: 10000e9,
    It: 753000,
  },
  Custom: { h: 0, b: 0, tw: 0, tf: 0, A: 0, Iy: 0, Wel_y: 0, Wpl_y: 0, iz: 0, Iw: 0, It: 0 },
};

const PRESETS: Record<string, { name: string; form: Partial<SteelBeamForm> }> = {
  floor_beam: {
    name: 'Floor Beam',
    form: {
      section_type: 'UKB 305x165x40',
      span: '6.0',
      dead_load_udl: '5.0',
      live_load_udl: '3.0',
      steel_grade: 'S355',
      lateral_restraint: 'continuous',
    },
  },
  roof_beam: {
    name: 'Roof Beam',
    form: {
      section_type: 'UKB 356x171x51',
      span: '8.0',
      dead_load_udl: '3.0',
      live_load_udl: '0.75',
      steel_grade: 'S355',
      lateral_restraint: 'continuous',
    },
  },
  transfer_beam: {
    name: 'Transfer Beam',
    form: {
      section_type: 'UKB 610x229x140',
      span: '10.0',
      dead_load_udl: '15.0',
      live_load_udl: '10.0',
      steel_grade: 'S355',
      lateral_restraint: 'unrestrained',
      restraint_spacing: '2.5',
    },
  },
  crane_beam: {
    name: 'Crane Runway Beam',
    form: {
      section_type: 'UKB 457x191x98',
      span: '7.5',
      dead_load_udl: '2.0',
      live_load_udl: '0',
      dead_load_point: '50',
      live_load_point: '150',
      point_load_position: '50',
      steel_grade: 'S355',
      lateral_restraint: 'unrestrained',
      restraint_spacing: '3.75',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const SteelBeamBending: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<SteelBeamForm>({
    section_type: 'UKB 406x178x60',
    custom_h: '400',
    custom_b: '180',
    custom_tw: '8',
    custom_tf: '13',
    span: '6.0',
    lateral_restraint: 'continuous',
    restraint_spacing: '3.0',
    dead_load_udl: '10.0',
    live_load_udl: '5.0',
    dead_load_point: '0',
    live_load_point: '0',
    point_load_position: '50',
    steel_grade: 'S355',
    gamma_g: '1.35',
    gamma_q: '1.5',
    gamma_m0: '1.0',
    gamma_m1: '1.0',
    deflection_limit: '360',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'custom_h', label: 'Custom H' },
  { key: 'custom_b', label: 'Custom B' },
  { key: 'custom_tw', label: 'Custom Tw' },
  { key: 'custom_tf', label: 'Custom Tf' },
  { key: 'span', label: 'Span' },
  { key: 'restraint_spacing', label: 'Restraint Spacing' },
  { key: 'dead_load_udl', label: 'Dead Load Udl' },
  { key: 'live_load_udl', label: 'Live Load Udl' },
  { key: 'dead_load_point', label: 'Dead Load Point' },
  { key: 'live_load_point', label: 'Live Load Point' },
  { key: 'point_load_position', label: 'Point Load Position' },
  { key: 'gamma_g', label: 'Gamma G' },
  { key: 'gamma_q', label: 'Gamma Q' },
  { key: 'gamma_m0', label: 'Gamma M0' },
  { key: 'gamma_m1', label: 'Gamma M1' },
  { key: 'deflection_limit', label: 'Deflection Limit' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'section_type', label: 'Section_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'custom_h', label: 'Custom_h', min: 0, max: 100, step: 1, unit: '' },
    { key: 'custom_b', label: 'Custom_b', min: 0, max: 100, step: 1, unit: '' },
    { key: 'custom_tw', label: 'Custom_tw', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<SteelBeamResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    section: true,
    geometry: true,
    loading: false,
    factors: false,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const updateForm = (field: keyof SteelBeamForm, value: string) => {
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Calculation
  // ─────────────────────────────────────────────────────────────────────────────
  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const newWarnings: string[] = [];

    try {
      // Get section properties
      let h: number, b: number, tw: number, tf: number;
      let A: number, Iy: number, Wel_y: number, Wpl_y: number;
      let iz: number, Iw: number, It: number;

      if (form.section_type === 'Custom') {
        h = parseFloat(form.custom_h) || 400;
        b = parseFloat(form.custom_b) || 180;
        tw = parseFloat(form.custom_tw) || 8;
        tf = parseFloat(form.custom_tf) || 13;
        // Approximate I-section properties
        A = 2 * b * tf + (h - 2 * tf) * tw;
        Iy = (b * h ** 3 - (b - tw) * (h - 2 * tf) ** 3) / 12;
        Wel_y = Iy / (h / 2);
        Wpl_y = Wel_y * 1.15; // Approximate
        iz = Math.sqrt(((b ** 3 * tf * 2) / 12 + ((h - 2 * tf) * tw ** 3) / 12) / A);
        Iw = (Iy * (h - tf) ** 2) / 4; // Approximate
        It = (2 * b * tf ** 3 + (h - 2 * tf) * tw ** 3) / 3; // Approximate
      } else {
        const section = STEEL_SECTIONS[form.section_type];
        h = section.h;
        b = section.b;
        tw = section.tw;
        tf = section.tf;
        A = section.A;
        Iy = section.Iy;
        Wel_y = section.Wel_y;
        Wpl_y = section.Wpl_y;
        iz = section.iz;
        Iw = section.Iw;
        It = section.It;
      }

      // Material properties
      const grade = STEEL_GRADES[form.steel_grade];
      const fy = grade.fy;
      const E = 210000; // MPa
      const G = 81000; // MPa

      // Geometry
      const span = parseFloat(form.span) * 1000; // mm
      const span_m = parseFloat(form.span);

      // Loading (convert to N/mm for calculations)
      const gamma_g = parseFloat(form.gamma_g);
      const gamma_q = parseFloat(form.gamma_q);
      const gamma_m0 = parseFloat(form.gamma_m0);
      const gamma_m1 = parseFloat(form.gamma_m1);

      const gk_udl = parseFloat(form.dead_load_udl) || 0; // kN/m
      const qk_udl = parseFloat(form.live_load_udl) || 0; // kN/m
      const gk_point = parseFloat(form.dead_load_point) || 0; // kN
      const qk_point = parseFloat(form.live_load_point) || 0; // kN
      const pointPos = parseFloat(form.point_load_position) / 100; // fraction

      // Factored UDL
      const w_Ed = gamma_g * gk_udl + gamma_q * qk_udl; // kN/m

      // Factored point load
      const P_Ed = gamma_g * gk_point + gamma_q * qk_point; // kN

      // Calculate design moment (simply supported)
      const M_udl = (w_Ed * span_m ** 2) / 8; // kNm from UDL

      // Point load moment at position a from left support (assuming position is at max moment)
      const a = pointPos * span_m;
      const b_span = span_m - a;
      const M_point = (P_Ed * a * b_span) / span_m; // kNm

      const M_Ed = M_udl + M_point; // kNm total

      // Calculate design shear
      const V_udl = (w_Ed * span_m) / 2; // kN
      const V_point = (P_Ed * Math.max(a, b_span)) / span_m; // kN
      const V_Ed = V_udl + V_point; // kN

      // Moment resistance (Class 1/2 section assumed)
      const Mc_Rd = (Wpl_y * fy) / gamma_m0 / 1e6; // kNm

      // Shear resistance
      const Av = A - 2 * b * tf + (tw + 2 * 0) * tf; // Simplified shear area
      const Av_eff = Math.max(Av, h * tw);
      const Vpl_Rd = (Av_eff * fy) / Math.sqrt(3) / gamma_m0 / 1000; // kN

      // LTB resistance
      let Lcr: number;
      let Mb_Rd: number;
      let lambda_LT: number;
      let chi_LT: number;

      if (form.lateral_restraint === 'continuous') {
        Lcr = 0;
        Mb_Rd = Mc_Rd; // Fully restrained
        lambda_LT = 0;
        chi_LT = 1.0;
      } else {
        Lcr =
          form.lateral_restraint === 'unrestrained'
            ? span
            : parseFloat(form.restraint_spacing) * 1000;

        // Elastic critical moment (simplified Mcr)
        const C1 = 1.132; // Uniform moment
        const kz = 1.0;
        const kw = 1.0;

        const Mcr =
          (((C1 * Math.PI ** 2 * E * Iy) / (kz * Lcr) ** 2) *
            Math.sqrt(Iw / Iy + ((kz * Lcr) ** 2 * G * It) / (Math.PI ** 2 * E * Iy))) /
          1e6; // kNm

        // Non-dimensional slenderness
        lambda_LT = Math.sqrt((Wpl_y * fy) / 1e6 / Mcr);

        // LTB reduction factor (general case)
        const alpha_LT = 0.49; // Rolled I-sections h/b > 2
        const lambda_LT0 = 0.4;
        const beta = 0.75;

        if (lambda_LT <= lambda_LT0) {
          chi_LT = 1.0;
        } else {
          const phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - lambda_LT0) + beta * lambda_LT ** 2);
          chi_LT = Math.min(1.0, 1 / (phi_LT + Math.sqrt(phi_LT ** 2 - beta * lambda_LT ** 2)));
        }

        Mb_Rd = (chi_LT * Wpl_y * fy) / gamma_m1 / 1e6; // kNm
      }

      // Utilisations
      const bending_util = (M_Ed / Mc_Rd) * 100;
      const shear_util = (V_Ed / Vpl_Rd) * 100;
      const ltb_util = (M_Ed / Mb_Rd) * 100;
      const max_util = Math.max(bending_util, shear_util, ltb_util);

      // Deflection (serviceability, unfactored)
      const w_sls = gk_udl + qk_udl; // kN/m
      const P_sls = gk_point + qk_point; // kN

      // Deflection from UDL: 5wL^4 / 384EI
      const delta_udl = (5 * w_sls * (span_m * 1000) ** 4) / (384 * E * Iy);

      // Deflection from point load: Pa(L^2 - a^2)^(3/2) / (9√3 EIL) for max deflection
      const delta_point =
        P_sls > 0
          ? (P_sls * 1000 * (span ** 2 - (pointPos * span) ** 2) ** 1.5) /
            (9 * Math.sqrt(3) * E * Iy * span)
          : 0;

      const deflection = delta_udl + delta_point;
      const deflection_limit_ratio = parseFloat(form.deflection_limit);
      const deflection_limit = span / deflection_limit_ratio;
      const deflection_ratio = (deflection / deflection_limit) * 100;

      // Critical check
      const utilisations = {
        Bending: bending_util,
        Shear: shear_util,
        LTB: ltb_util,
      };
      const criticalCheck = Object.entries(utilisations).reduce((a, b) => (a[1] > b[1] ? a : b))[0];

      // Classification
      let classification: string;
      let classColor: string;
      if (max_util <= 70) {
        classification = 'Optimal';
        classColor = 'text-green-400';
      } else if (max_util <= 90) {
        classification = 'Efficient';
        classColor = 'text-emerald-400';
      } else if (max_util <= 100) {
        classification = 'Adequate';
        classColor = 'text-amber-400';
      } else {
        classification = 'Overstressed';
        classColor = 'text-red-400';
      }

      const status = max_util <= 100 && deflection_ratio <= 100 ? 'PASS' : 'FAIL';

      if (deflection_ratio > 100) {
        newWarnings.push(
          `Deflection ${deflection.toFixed(1)}mm exceeds limit of ${deflection_limit.toFixed(1)}mm`,
        );
      }

      if (max_util > 100) {
        newWarnings.push(`${criticalCheck} check fails at ${max_util.toFixed(1)}% utilisation`);
      }

      if (shear_util > 50) {
        newWarnings.push('High shear utilisation — check shear-moment interaction');
      }

      setResults({
        h,
        b,
        tw,
        tf,
        A,
        Iy,
        Wel_y,
        Wpl_y,
        iz,
        Iw,
        It,
        fy,
        E,
        M_Ed,
        V_Ed,
        Mc_Rd,
        Vpl_Rd,
        Mb_Rd,
        Lcr: Lcr / 1000,
        lambda_LT,
        chi_LT,
        bending_util,
        shear_util,
        ltb_util,
        max_util,
        deflection,
        deflection_limit,
        deflection_ratio,
        critical_check: criticalCheck,
        status,
        classification,
        classColor,
      });

      setWarnings(newWarnings);
    } catch (error) {
      console.error('Calculation error:', error);
      newWarnings.push('Calculation error occurred');
      setWarnings(newWarnings);
    } finally {
      setIsCalculating(false);
    }
  }, [form]);

  useEffect(() => {
    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [calculate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export - Premium @react-pdf/renderer
  // ─────────────────────────────────────────────────────────────────────────────
    const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Steel Beam Design',
      subtitle: 'EN 1993-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'STE001' },
      ],
      inputs: [
        { label: 'Section_type', value: String(form.section_type) },
        { label: 'Span', value: String(form.span), unit: 'mm' },
        { label: 'Lateral_restraint', value: String(form.lateral_restraint) },
        { label: 'Restraint_spacing', value: String(form.restraint_spacing), unit: 'mm' },
        { label: 'Dead_load_udl', value: String(form.dead_load_udl), unit: 'kN' },
        { label: 'Live_load_udl', value: String(form.live_load_udl), unit: 'kN' },
        { label: 'Dead_load_point', value: String(form.dead_load_point), unit: 'kN' },
        { label: 'Live_load_point', value: String(form.live_load_point), unit: 'kN' },
        { label: 'Point_load_position', value: String(form.point_load_position), unit: 'kN' },
        { label: 'Steel_grade', value: String(form.steel_grade) },
        { label: 'Gamma_g', value: String(form.gamma_g) },
        { label: 'Gamma_q', value: String(form.gamma_q) }
      ],
      checks: [
        { name: 'Bending', capacity: `${results.Mc_Rd.toFixed(1)} kNm`, utilisation: `${results.bending_util.toFixed(1)}%`, status: (results.bending_util <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' },
        { name: 'Shear', capacity: `${results.Vpl_Rd.toFixed(1)} kN`, utilisation: `${results.shear_util.toFixed(1)}%`, status: (results.shear_util <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' },
        { name: 'LTB', capacity: `${results.Mb_Rd.toFixed(1)} kNm`, utilisation: `${results.ltb_util.toFixed(1)}%`, status: (results.ltb_util <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' },
        { name: 'Deflection', capacity: `L/${form.deflection_limit}`, utilisation: `${results.deflection_ratio.toFixed(1)}%`, status: (results.deflection_ratio <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' },
        { name: 'Overall', capacity: '-', utilisation: `${results.max_util.toFixed(1)}%`, status: (results.status || 'PASS') as 'PASS' | 'FAIL' },
      ],
      recommendations: [
        { check: 'LTB', suggestion: 'Provide lateral restraints at closer spacing to reduce LTB effects' },
        { check: 'Deflection', suggestion: 'Consider increasing section depth if deflection governs' },
        { check: 'Shear', suggestion: 'Use stiffened web if shear utilisation is high' },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Steel Beam Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Steel Beam Design',
      subtitle: 'EN 1993-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'STE001' },
      ],
      inputs: [
        { label: 'Section_type', value: String(form.section_type) },
        { label: 'Span', value: String(form.span), unit: 'mm' },
        { label: 'Lateral_restraint', value: String(form.lateral_restraint) },
        { label: 'Restraint_spacing', value: String(form.restraint_spacing), unit: 'mm' },
        { label: 'Dead_load_udl', value: String(form.dead_load_udl), unit: 'kN' },
        { label: 'Live_load_udl', value: String(form.live_load_udl), unit: 'kN' },
        { label: 'Dead_load_point', value: String(form.dead_load_point), unit: 'kN' },
        { label: 'Live_load_point', value: String(form.live_load_point), unit: 'kN' },
        { label: 'Point_load_position', value: String(form.point_load_position), unit: 'kN' },
        { label: 'Steel_grade', value: String(form.steel_grade) },
        { label: 'Gamma_g', value: String(form.gamma_g) },
        { label: 'Gamma_q', value: String(form.gamma_q) }
      ],
      checks: [
        { name: 'Bending', capacity: `${results.Mc_Rd.toFixed(1)} kNm`, utilisation: `${results.bending_util.toFixed(1)}%`, status: (results.bending_util <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' },
        { name: 'Shear', capacity: `${results.Vpl_Rd.toFixed(1)} kN`, utilisation: `${results.shear_util.toFixed(1)}%`, status: (results.shear_util <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' },
        { name: 'LTB', capacity: `${results.Mb_Rd.toFixed(1)} kNm`, utilisation: `${results.ltb_util.toFixed(1)}%`, status: (results.ltb_util <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' },
        { name: 'Deflection', capacity: `L/${form.deflection_limit}`, utilisation: `${results.deflection_ratio.toFixed(1)}%`, status: (results.deflection_ratio <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL' },
        { name: 'Overall', capacity: '-', utilisation: `${results.max_util.toFixed(1)}%`, status: (results.status || 'PASS') as 'PASS' | 'FAIL' },
      ],
      recommendations: [
        { check: 'LTB', suggestion: 'Provide lateral restraints at closer spacing to reduce LTB effects' },
        { check: 'Deflection', suggestion: 'Consider increasing section depth if deflection governs' },
        { check: 'Shear', suggestion: 'Use stiffened web if shear utilisation is high' },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Steel Beam Design',
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
        className="w-full flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-700/40 transition-colors"
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
    field: keyof SteelBeamForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          title={label}
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
        className="pointer-events-none fixed inset-0 z-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
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
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1993-1-1 Compliant</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-4">
            Steel Beam Design
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Comprehensive steel beam bending, shear, LTB, and deflection analysis to Eurocode 3
          </p>
        </motion.div>

        {/* Presets */}
        <Card variant="glass" className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"><FiZap className="w-6 h-6 text-neon-cyan" /></div>
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
        <div className="flex justify-center gap-4 mb-8">
          {['input', 'results', 'visualization'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab as any)}
              disabled={tab !== 'input' && !results}
              className={cn(
                'px-8 py-3 rounded-xl font-semibold capitalize',
                activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'text-gray-400'
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
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Input Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Section Selection */}
            <Section
              id="section"
              title="Section Selection"
              icon={<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"><FiLayers className="w-6 h-6 text-neon-cyan" /></div>}
              color="border-cyan-500/30"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-200">Steel Section</label>
                  <select
                    value={form.section_type}
                    onChange={(e) => updateForm('section_type', e.target.value)}
                    title="Steel Section"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                  >
                    {Object.keys(STEEL_SECTIONS).map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-200">Steel Grade</label>
                  <select
                    value={form.steel_grade}
                    onChange={(e) => updateForm('steel_grade', e.target.value)}
                    title="Steel Grade"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                  >
                    {Object.entries(STEEL_GRADES).map(([grade, props]) => (
                      <option key={grade} value={grade}>
                        {grade} (fy = {props.fy} MPa)
                      </option>
                    ))}
                  </select>
                </div>

                {form.section_type === 'Custom' && (
                  <>
                    <InputField label="Depth h" field="custom_h" unit="mm" />
                    <InputField label="Width b" field="custom_b" unit="mm" />
                    <InputField label="Web tw" field="custom_tw" unit="mm" />
                    <InputField label="Flange tf" field="custom_tf" unit="mm" />
                  </>
                )}
      
              </div>
            </Section>

            {/* Geometry */}
            <Section
              id="geometry"
              title="Geometry & Restraint"
              icon={<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"><FiSliders className="w-6 h-6 text-neon-cyan" /></div>}
              color="border-emerald-500/30"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <InputField label="Span" field="span" unit="m" />

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-200">Lateral Restraint</label>
                  <select
                    value={form.lateral_restraint}
                    onChange={(e) => updateForm('lateral_restraint', e.target.value)}
                    title="Lateral Restraint"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                  >
                    <option value="continuous">Continuous (Full restraint)</option>
                    <option value="discrete">Discrete (At intervals)</option>
                    <option value="unrestrained">Unrestrained</option>
                  </select>
                </div>

                {form.lateral_restraint === 'discrete' && (
                  <InputField label="Restraint Spacing" field="restraint_spacing" unit="m" />
                )}
              </div>
            </Section>

            {/* Loading */}
            <Section
              id="loading"
              title="Loading"
              icon={<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"><FiZap className="w-6 h-6 text-neon-cyan" /></div>}
              color="border-amber-500/30"
            >
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <InputField label="Dead Load (UDL)" field="dead_load_udl" unit="kN/m" />
                  <InputField label="Live Load (UDL)" field="live_load_udl" unit="kN/m" />
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="text-sm text-gray-500 mb-3">Point Loads (optional)</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <InputField label="Dead Load (Point)" field="dead_load_point" unit="kN" />
                    <InputField label="Live Load (Point)" field="live_load_point" unit="kN" />
                    <InputField label="Position from Left" field="point_load_position" unit="%" />
                </div>
              </div>
              </div>
            </Section>

            {/* Design Factors */}
            <Section
              id="factors"
              title="Design Factors"
              icon={<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"><FiSettings className="w-6 h-6 text-neon-cyan" /></div>}
              color="border-purple-500/30"
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InputField label="γ_G (Dead)" field="gamma_g" />
                <InputField label="γ_Q (Live)" field="gamma_q" />
                <InputField label="γ_M0" field="gamma_m0" />
                <InputField label="γ_M1" field="gamma_m1" />
                <InputField label="Deflection Limit" field="deflection_limit" unit="L/" />
              </div>
            </Section>

            {/* Calculate Button */}
            <button
              onClick={calculate}
              className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-neon-cyan/25 transition-all duration-300"
            >
              ⚡ RUN FULL ANALYSIS
            </button>
          </div>

          {/* Results Column */}
          <div className="space-y-4 sticky top-8">
            {/* Fullscreen Preview Overlay */}
            {previewMaximized && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex">
                <div className="flex-1 relative">
                  <Interactive3DDiagram
                    height="h-full"
                    cameraPosition={[5, 3, 4]}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  >
                    <SteelBeam3D
                      span={parseFloat(form.span) || 6}
                      depth={results?.h || 400}
                      width={results?.b || 200}
                      flangeThk={results?.tf || 16}
                      webThk={results?.tw || 10}
                      udl={(parseFloat(form.dead_load_udl) || 0) + (parseFloat(form.live_load_udl) || 0)}
                      pointLoad={(parseFloat(form.dead_load_point) || 0) + (parseFloat(form.live_load_point) || 0)}
                      pointLoadPos={(parseFloat(form.point_load_position) || 50) / 100}
                      utilisation={results?.max_util || 0}
                      status={(results?.status as 'PASS' | 'FAIL') || 'PASS'}
                    />
                  </Interactive3DDiagram>
                  <button onClick={() => setPreviewMaximized(false)}
                    title="Exit fullscreen"
                    className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10">
                    <FiMinimize2 size={20} />
                  </button>
                  <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                    STEEL BEAM BENDING — REAL-TIME PREVIEW
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
                      { label: 'Section', value: form.section_type },
                      { label: 'Span', value: `${form.span} m` },
                      { label: 'Steel Grade', value: form.steel_grade },
                      { label: 'Dead UDL', value: `${form.dead_load_udl} kN/m` },
                      { label: 'Live UDL', value: `${form.live_load_udl} kN/m` },
                      { label: 'Lateral Restraint', value: form.lateral_restraint },
                      { label: 'Deflection Limit', value: `L/${form.deflection_limit}` },
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
                        { label: 'Bending', util: (results.bending_util * 100).toFixed(1), status: results.bending_util > 1 ? 'FAIL' : 'PASS' },
                        { label: 'Shear', util: (results.shear_util * 100).toFixed(1), status: results.shear_util > 1 ? 'FAIL' : 'PASS' },
                        { label: 'LTB', util: (results.ltb_util * 100).toFixed(1), status: results.ltb_util > 1 ? 'FAIL' : 'PASS' },
                        { label: 'Deflection', util: (results.deflection_ratio * 100).toFixed(1), status: results.deflection_ratio > 1 ? 'FAIL' : 'PASS' },
                        { label: 'Max Util', util: (results.max_util * 100).toFixed(1), status: results.max_util > 1 ? 'FAIL' : 'PASS' },
                      ].map((check) => (
                        <div key={check.label} className="flex justify-between text-xs py-0.5">
                          <span className="text-gray-500">{check.label}</span>
                          <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util)) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                            {check.util}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setPreviewMaximized(false)}
                    className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors">
                    Close Fullscreen
                  </button>
                </div>
              </motion.div>
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-mono uppercase">3D Preview</span>
              <button
                onClick={() => setPreviewMaximized(true)}
                className="p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                title="Fullscreen preview"
              >
                <FiMaximize2 size={16} />
              </button>
            </div>
            {/* 3D Interactive Diagram */}
            <WhatIfPreview
              title="Steel Beam Bending — 3D Preview"
              sliders={whatIfSliders}
              form={form}
              updateForm={updateForm}
              status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
              renderScene={(fsHeight) => (
                <Interactive3DDiagram
                height={fsHeight}
                cameraPosition={[5, 3, 4]}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                >
                <SteelBeam3D
                span={parseFloat(form.span) || 6}
                depth={results?.h || 400}
                width={results?.b || 200}
                flangeThk={results?.tf || 16}
                webThk={results?.tw || 10}
                udl={(parseFloat(form.dead_load_udl) || 0) + (parseFloat(form.live_load_udl) || 0)}
                pointLoad={(parseFloat(form.dead_load_point) || 0) + (parseFloat(form.live_load_point) || 0)}
                pointLoadPos={(parseFloat(form.point_load_position) || 50) / 100}
                utilisation={results?.max_util || 0}
                status={(results?.status as 'PASS' | 'FAIL') || 'PASS'}
                />
                </Interactive3DDiagram>
              )}
            />

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
                    'shadow-2xl border-l-4',
                    results.status === 'PASS'
                      ? 'bg-green-900/20 border-l-green-500'
                      : 'bg-red-900/20 border-l-red-500',
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
                    <p className={cn('text-sm', results.classColor)}>
                      {results.classification} — {results.max_util.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Critical: {results.critical_check}</p>
                  </CardContent>
                </Card>

                {/* Design Checks */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">Design Checks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      {
                        name: 'Bending',
                        util: results.bending_util,
                        cap: results.Mc_Rd,
                        unit: 'kNm',
                      },
                      { name: 'Shear', util: results.shear_util, cap: results.Vpl_Rd, unit: 'kN' },
                      { name: 'LTB', util: results.ltb_util, cap: results.Mb_Rd, unit: 'kNm' },
                      {
                        name: 'Deflection',
                        util: results.deflection_ratio,
                        cap: results.deflection_limit,
                        unit: 'mm',
                      },
                    ].map((check) => (
                      <div key={check.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{check.name}</span>
                          <span
                            className={cn(check.util <= 100 ? 'text-green-400' : 'text-red-400')}
                          >
                            {check.util.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(check.util, 100)}%` }}
                            className={cn(
                              'h-full rounded-full',
                              check.util <= 70
                                ? 'bg-green-500'
                                : check.util <= 90
                                  ? 'bg-emerald-500'
                                  : check.util <= 100
                                    ? 'bg-amber-500'
                                    : 'bg-red-500',
                            )}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Capacity: {check.cap.toFixed(1)} {check.unit}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Key Values */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">Design Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">M_Ed</p>
                      <p className="text-white font-mono">{results.M_Ed.toFixed(1)} kNm</p>
                    </div>
                    <div>
                      <p className="text-gray-500">V_Ed</p>
                      <p className="text-white font-mono">{results.V_Ed.toFixed(1)} kN</p>
                    </div>
                    <div>
                      <p className="text-gray-500">λ_LT</p>
                      <p className="text-white font-mono">{results.lambda_LT.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">χ_LT</p>
                      <p className="text-white font-mono">{results.chi_LT.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Deflection</p>
                      <p className="text-white font-mono">{results.deflection.toFixed(1)} mm</p>
                    </div>
                    <div>
                      <p className="text-gray-500">L_cr</p>
                      <p className="text-white font-mono">{results.Lcr.toFixed(2)} m</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <Card className="bg-amber-900/20 border-amber-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FiAlertTriangle className="text-amber-400" />
                        <span className="text-amber-400 font-medium">Warnings</span>
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

                {/* Export */}
                <div className="flex gap-2">
                  <Button
                    onClick={exportPDF}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                  >
                    <FiDownload className="w-4 h-4 mr-2" />
                    Export PDF Report
                  </Button>
            <Button
                    onClick={exportDOCX}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <FiDownload className="w-4 h-4 mr-2" />
                    DOCX
                  </Button>
                  <SaveRunButton
                    calculatorKey="steel_beam_bending"
                    inputs={form as unknown as Record<string, string>}
                    results={results}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    summary={results ? `${results.max_util.toFixed(1)}% util` : undefined}
                  />
                </div>

                {/* Design Codes */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">Design Codes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-gray-500">
                    <p>EN 1993-1-1 — General rules for steel structures</p>
                    <p>EN 1990 — Basis of structural design</p>
                    <p>EN 1991-1-1 — Actions on structures</p>
                    <p>NA to BS EN 1993-1-1 — UK National Annex</p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card variant="glass" className="border-l-4 border-l-cyan-500 border-neon-cyan/30 shadow-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Maximum Utilisation</h3>
                  <div className={cn("text-4xl font-black", results.max_util <= 100 ? "text-cyan-400" : "text-red-400")}>
                    {results.max_util.toFixed(1)}%
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Critical: {results.critical_check}</p>
                </Card>
                <Card variant="glass" className="border-l-4 border-l-emerald-500 border-neon-cyan/30 shadow-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Status</h3>
                  <div className={cn("text-2xl font-black", results.status === 'PASS' ? "text-emerald-400" : "text-red-400")}>
                    {results.status}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{results.classification}</p>
                </Card>
                <Card variant="glass" className="border-l-4 border-l-purple-500 border-neon-cyan/30 shadow-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Section</h3>
                  <div className="text-xl font-bold text-gray-400">{form.section_type}</div>
                  <p className="text-gray-500 text-xs mt-1">{form.steel_grade} — Span {form.span} m</p>
                </Card>
              </div>

              {/* Individual Check Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Bending', util: results.bending_util, cap: `${results.Mc_Rd.toFixed(1)} kNm`, demand: `M_Ed = ${results.M_Ed.toFixed(1)} kNm` },
                  { name: 'Shear', util: results.shear_util, cap: `${results.Vpl_Rd.toFixed(1)} kN`, demand: `V_Ed = ${results.V_Ed.toFixed(1)} kN` },
                  { name: 'LTB', util: results.ltb_util, cap: `${results.Mb_Rd.toFixed(1)} kNm`, demand: `λ_LT = ${results.lambda_LT.toFixed(2)}, χ_LT = ${results.chi_LT.toFixed(3)}` },
                  { name: 'Deflection', util: results.deflection_ratio, cap: `L/${form.deflection_limit}`, demand: `δ = ${results.deflection.toFixed(1)} mm` },
                ].map((check) => (
                  <Card key={check.name} variant="glass" className={cn("border-neon-cyan/30 shadow-2xl p-4", check.util > 100 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500')}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">{check.name}</span>
                      <span className={cn("text-xs font-bold px-2 py-1 rounded", check.util <= 100 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                        {check.util <= 100 ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">{check.util.toFixed(1)}%</div>
                    <p className="text-gray-500 text-xs mt-1">Capacity: {check.cap}</p>
                    <p className="text-gray-500 text-xs">{check.demand}</p>
                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(check.util, 100)}%` }}
                        className={cn("h-full rounded-full", check.util <= 70 ? "bg-emerald-500" : check.util <= 100 ? "bg-amber-500" : "bg-red-500")}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Section Properties Summary */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-white">Section Properties</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-gray-500">Depth h</p><p className="text-white font-mono">{results.h} mm</p></div>
                  <div><p className="text-gray-500">Width b</p><p className="text-white font-mono">{results.b} mm</p></div>
                  <div><p className="text-gray-500">Web tw</p><p className="text-white font-mono">{results.tw} mm</p></div>
                  <div><p className="text-gray-500">Flange tf</p><p className="text-white font-mono">{results.tf} mm</p></div>
                  <div><p className="text-gray-500">Area A</p><p className="text-white font-mono">{results.A.toFixed(0)} mm²</p></div>
                  <div><p className="text-gray-500">I_y</p><p className="text-white font-mono">{results.Iy.toFixed(0)} cm⁴</p></div>
                  <div><p className="text-gray-500">W_pl,y</p><p className="text-white font-mono">{results.Wpl_y.toFixed(0)} cm³</p></div>
                  <div><p className="text-gray-500">f_y</p><p className="text-white font-mono">{results.fy} MPa</p></div>
                </CardContent>
              </Card>

              {/* Warnings in Results */}
              {warnings.length > 0 && (
                <Card className="bg-amber-900/20 border-amber-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiAlertTriangle className="text-amber-400" />
                      <span className="text-amber-400 font-medium">Warnings</span>
                    </div>
                    <ul className="space-y-1">
                      {warnings.map((w, i) => (
                        <li key={i} className="text-sm text-amber-200/80">• {w}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Export in Results */}
              <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
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
              <Card variant="glass" className="overflow-hidden border-neon-cyan/30 shadow-2xl p-4">
                <div className="relative rounded-xl overflow-hidden bg-gray-900 shadow-2xl">
                  <Interactive3DDiagram
                    height="500px"
                    cameraPosition={[5, 3, 4]}
                    status={results ? (results.status as 'PASS' | 'FAIL') : undefined}
                  >
                    <SteelBeam3D
                      span={parseFloat(form.span) || 6}
                      depth={results?.h || 400}
                      width={results?.b || 200}
                      flangeThk={results?.tf || 16}
                      webThk={results?.tw || 10}
                      udl={(parseFloat(form.dead_load_udl) || 0) + (parseFloat(form.live_load_udl) || 0)}
                      pointLoad={(parseFloat(form.dead_load_point) || 0) + (parseFloat(form.live_load_point) || 0)}
                      pointLoadPos={(parseFloat(form.point_load_position) || 50) / 100}
                      utilisation={results?.max_util || 0}
                      status={(results?.status as 'PASS' | 'FAIL') || 'PASS'}
                    />
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

export default SteelBeamBending;
