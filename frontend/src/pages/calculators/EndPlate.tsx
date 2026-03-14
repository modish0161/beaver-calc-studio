// =============================================================================
// End Plate Connection Calculator — Premium Version
// EN 1993-1-8 (Eurocode 3) — Steel Beam End Plate Moment Connections
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiCheckCircle,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiGrid,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTool,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import EndPlate3D from '../../components/3d/scenes/EndPlate3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { BOLT_GRADES } from '../../data/boltData';
import { STEEL_GRADES } from '../../data/materialGrades';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// Types
// =============================================================================

interface EndPlateForm {
  // Connection Type
  connectionType: string;
  endPlateType: string;

  // Beam Section
  beamSection: string;
  beamGrade: string;
  customBeamDepth: string;
  customBeamWidth: string;
  customBeamFlange: string;
  customBeamWeb: string;

  // Column Section
  columnSection: string;
  columnGrade: string;

  // End Plate
  plateWidth: string;
  plateDepth: string;
  plateThickness: string;
  plateGrade: string;

  // Bolts
  boltGrade: string;
  boltDiameter: string;
  boltRows: string;
  boltCols: string;
  gaugeDistance: string;
  pitchDistance: string;
  topRowDistance: string;

  // Design Forces
  momentEd: string;
  shearEd: string;
  axialEd: string;

  // Welds
  flangeWeld: string;
  webWeld: string;

  // Factors
  gammaM0: string;
  gammaM2: string;

  // Project
  projectName: string;
  reference: string;
}

interface EndPlateResults {
  // Classification
  connectionClass: string;
  rotationalStiffness: number;
  momentResistance: number;

  // Bolt Row Forces
  tensionRowForces: number[];
  maxBoltTension: number;
  leverArm: number;

  // T-Stub Analysis
  mode1Resistance: number;
  mode2Resistance: number;
  mode3Resistance: number;
  governingMode: string;
  tStubCapacity: number;

  // Tension Zone Check
  tensionForce: number;
  tensionCapacity: number;
  tensionUtil: number;
  tensionStatus: string;

  // Compression Zone Check
  compressionForce: number;
  columnWebCapacity: number;
  compressionUtil: number;
  compressionStatus: string;

  // Shear Check
  shearForce: number;
  boltShearCapacity: number;
  shearUtil: number;
  shearStatus: string;

  // Weld Checks
  flangeWeldStress: number;
  flangeWeldCapacity: number;
  flangeWeldUtil: number;
  flangeWeldStatus: string;
  webWeldStress: number;
  webWeldCapacity: number;
  webWeldUtil: number;
  webWeldStatus: string;

  // Plate Bending
  plateUtil: number;
  plateStatus: string;

  // Overall
  maxUtil: number;
  criticalCheck: string;
  status: string;
}

// =============================================================================
// Steel Section Database (UKB Sections)
// =============================================================================

const BEAM_SECTIONS: Record<
  string,
  { h: number; b: number; tf: number; tw: number; A: number; Wpl_y: number }
> = {
  'UKB 254x102x22': { h: 254.0, b: 101.6, tf: 6.8, tw: 5.7, A: 2800, Wpl_y: 259000 },
  'UKB 254x102x28': { h: 260.4, b: 102.2, tf: 10.0, tw: 6.3, A: 3600, Wpl_y: 353000 },
  'UKB 305x102x25': { h: 305.1, b: 101.6, tf: 7.0, tw: 5.8, A: 3160, Wpl_y: 342000 },
  'UKB 305x102x33': { h: 312.7, b: 102.4, tf: 10.8, tw: 6.6, A: 4180, Wpl_y: 481000 },
  'UKB 305x127x37': { h: 304.4, b: 123.4, tf: 10.7, tw: 7.1, A: 4720, Wpl_y: 514000 },
  'UKB 305x127x48': { h: 311.0, b: 125.3, tf: 14.0, tw: 9.0, A: 6090, Wpl_y: 674000 },
  'UKB 305x165x40': { h: 303.4, b: 165.0, tf: 10.2, tw: 6.0, A: 5130, Wpl_y: 623000 },
  'UKB 305x165x54': { h: 310.4, b: 166.9, tf: 13.7, tw: 7.9, A: 6870, Wpl_y: 846000 },
  'UKB 356x127x33': { h: 349.0, b: 125.4, tf: 8.5, tw: 6.0, A: 4210, Wpl_y: 543000 },
  'UKB 356x127x39': { h: 353.4, b: 126.0, tf: 10.7, tw: 6.6, A: 4980, Wpl_y: 659000 },
  'UKB 356x171x45': { h: 351.4, b: 171.1, tf: 9.7, tw: 7.0, A: 5730, Wpl_y: 775000 },
  'UKB 356x171x57': { h: 358.0, b: 172.2, tf: 13.0, tw: 8.1, A: 7260, Wpl_y: 1010000 },
  'UKB 406x140x39': { h: 398.0, b: 141.8, tf: 8.6, tw: 6.4, A: 4980, Wpl_y: 721000 },
  'UKB 406x140x46': { h: 403.2, b: 142.2, tf: 11.2, tw: 6.8, A: 5870, Wpl_y: 888000 },
  'UKB 406x178x54': { h: 402.6, b: 177.7, tf: 10.9, tw: 7.7, A: 6870, Wpl_y: 1055000 },
  'UKB 406x178x67': { h: 409.4, b: 178.8, tf: 14.3, tw: 8.8, A: 8550, Wpl_y: 1346000 },
  'UKB 457x152x52': { h: 449.8, b: 152.4, tf: 10.9, tw: 7.6, A: 6640, Wpl_y: 1096000 },
  'UKB 457x152x67': { h: 458.0, b: 153.8, tf: 15.0, tw: 9.0, A: 8560, Wpl_y: 1453000 },
  'UKB 457x191x67': { h: 453.4, b: 189.9, tf: 12.7, tw: 8.5, A: 8560, Wpl_y: 1471000 },
  'UKB 457x191x82': { h: 460.0, b: 191.3, tf: 16.0, tw: 9.9, A: 10500, Wpl_y: 1830000 },
  'UKB 533x210x82': { h: 528.3, b: 208.8, tf: 13.2, tw: 9.6, A: 10500, Wpl_y: 2058000 },
  'UKB 533x210x101': { h: 536.7, b: 210.0, tf: 17.4, tw: 10.8, A: 12900, Wpl_y: 2612000 },
  'UKB 533x210x122': { h: 544.5, b: 211.9, tf: 21.3, tw: 12.7, A: 15600, Wpl_y: 3196000 },
  'UKB 610x229x101': { h: 602.6, b: 227.6, tf: 14.8, tw: 10.5, A: 12900, Wpl_y: 2879000 },
  'UKB 610x229x125': { h: 612.2, b: 229.0, tf: 19.6, tw: 11.9, A: 15900, Wpl_y: 3676000 },
  'UKB 610x229x140': { h: 617.2, b: 230.2, tf: 22.1, tw: 13.1, A: 17800, Wpl_y: 4142000 },
  Custom: { h: 400, b: 180, tf: 13, tw: 8, A: 8000, Wpl_y: 1200000 },
};

const COLUMN_SECTIONS: Record<string, { h: number; b: number; tf: number; tw: number; A: number }> =
  {
    'UC 203x203x46': { h: 203.2, b: 203.6, tf: 11.0, tw: 7.2, A: 5870 },
    'UC 203x203x60': { h: 209.6, b: 205.8, tf: 14.2, tw: 9.4, A: 7640 },
    'UC 203x203x86': { h: 222.2, b: 209.1, tf: 20.5, tw: 12.7, A: 11000 },
    'UC 254x254x73': { h: 254.1, b: 254.6, tf: 14.2, tw: 8.6, A: 9320 },
    'UC 254x254x89': { h: 260.3, b: 256.3, tf: 17.3, tw: 10.3, A: 11400 },
    'UC 254x254x107': { h: 266.7, b: 258.8, tf: 20.5, tw: 12.8, A: 13600 },
    'UC 305x305x97': { h: 307.9, b: 305.3, tf: 15.4, tw: 9.9, A: 12300 },
    'UC 305x305x137': { h: 320.5, b: 309.2, tf: 21.7, tw: 13.8, A: 17400 },
    'UC 305x305x198': { h: 339.9, b: 314.5, tf: 31.4, tw: 19.1, A: 25200 },
    'UC 356x368x129': { h: 355.6, b: 368.6, tf: 17.5, tw: 10.4, A: 16400 },
    'UC 356x368x177': { h: 368.2, b: 372.6, tf: 23.8, tw: 14.4, A: 22600 },
    'UC 356x406x235': { h: 381.0, b: 394.8, tf: 30.2, tw: 18.4, A: 29900 },
    'UC 356x406x340': { h: 406.4, b: 403.0, tf: 42.9, tw: 26.6, A: 43300 },
  };

const BOLT_DIAMETERS: Record<string, { d: number; As: number; d0: number; dm: number }> = {
  M16: { d: 16, As: 157, d0: 18, dm: 27.7 },
  M20: { d: 20, As: 245, d0: 22, dm: 34.6 },
  M24: { d: 24, As: 353, d0: 26, dm: 41.6 },
  M27: { d: 27, As: 459, d0: 30, dm: 47.3 },
  M30: { d: 30, As: 561, d0: 33, dm: 53.1 },
  M36: { d: 36, As: 817, d0: 39, dm: 63.5 },
};

const PRESETS: Record<string, { name: string; form: Partial<EndPlateForm> }> = {
  flush_light: {
    name: 'Flush (Light)',
    form: {
      endPlateType: 'flush',
      beamSection: 'UKB 305x165x40',
      columnSection: 'UC 254x254x73',
      plateDepth: '310',
      plateWidth: '200',
      plateThickness: '15',
      boltRows: '4',
      boltDiameter: 'M20',
      momentEd: '80',
      shearEd: '100',
    },
  },
  flush_medium: {
    name: 'Flush (Medium)',
    form: {
      endPlateType: 'flush',
      beamSection: 'UKB 406x178x60',
      columnSection: 'UC 305x305x97',
      plateDepth: '410',
      plateWidth: '220',
      plateThickness: '20',
      boltRows: '4',
      boltDiameter: 'M24',
      momentEd: '150',
      shearEd: '150',
    },
  },
  extended_light: {
    name: 'Extended (Light)',
    form: {
      endPlateType: 'extended',
      beamSection: 'UKB 406x178x54',
      columnSection: 'UC 254x254x89',
      plateDepth: '520',
      plateWidth: '220',
      plateThickness: '20',
      boltRows: '6',
      boltDiameter: 'M24',
      momentEd: '200',
      shearEd: '120',
    },
  },
  extended_heavy: {
    name: 'Extended (Heavy)',
    form: {
      endPlateType: 'extended',
      beamSection: 'UKB 533x210x101',
      columnSection: 'UC 305x305x137',
      plateDepth: '680',
      plateWidth: '250',
      plateThickness: '30',
      boltRows: '8',
      boltDiameter: 'M30',
      momentEd: '450',
      shearEd: '200',
    },
  },
};

// =============================================================================
// Component
// =============================================================================

const EndPlate: React.FC = () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<EndPlateForm>({
    connectionType: 'beam-column',
    endPlateType: 'extended',
    beamSection: 'UKB 406x178x60',
    beamGrade: 'S355',
    customBeamDepth: '406',
    customBeamWidth: '178',
    customBeamFlange: '13',
    customBeamWeb: '8',
    columnSection: 'UC 305x305x97',
    columnGrade: 'S355',
    plateWidth: '220',
    plateDepth: '520',
    plateThickness: '20',
    plateGrade: 'S275',
    boltGrade: '8.8',
    boltDiameter: 'M24',
    boltRows: '6',
    boltCols: '2',
    gaugeDistance: '90',
    pitchDistance: '90',
    topRowDistance: '40',
    momentEd: '180',
    shearEd: '120',
    axialEd: '0',
    flangeWeld: '10',
    webWeld: '8',
    gammaM0: '1.0',
    gammaM2: '1.25',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'customBeamDepth', label: 'Custom Beam Depth' },
  { key: 'customBeamWidth', label: 'Custom Beam Width' },
  { key: 'customBeamFlange', label: 'Custom Beam Flange' },
  { key: 'customBeamWeb', label: 'Custom Beam Web' },
  { key: 'plateWidth', label: 'Plate Width' },
  { key: 'plateDepth', label: 'Plate Depth' },
  { key: 'plateThickness', label: 'Plate Thickness' },
  { key: 'boltRows', label: 'Bolt Rows' },
  { key: 'boltCols', label: 'Bolt Cols' },
  { key: 'gaugeDistance', label: 'Gauge Distance' },
  { key: 'pitchDistance', label: 'Pitch Distance' },
  { key: 'topRowDistance', label: 'Top Row Distance' },
  { key: 'momentEd', label: 'Moment Ed' },
  { key: 'shearEd', label: 'Shear Ed' },
  { key: 'axialEd', label: 'Axial Ed' },
  { key: 'flangeWeld', label: 'Flange Weld' },
  { key: 'webWeld', label: 'Web Weld' },
  { key: 'gammaM0', label: 'Gamma M0' },
  { key: 'gammaM2', label: 'Gamma M2' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'connectionType', label: 'Connection Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'endPlateType', label: 'End Plate Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'beamSection', label: 'Beam Section', min: 0, max: 100, step: 1, unit: '' },
    { key: 'beamGrade', label: 'Beam Grade', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<EndPlateResults | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    beam: true,
    plate: true,
    bolts: false,
    loading: false,
    welds: false,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const updateForm = (field: keyof EndPlateForm, value: string) => {
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
      // Get beam properties
      let hb: number, bb: number, tfb: number, twb: number;
      if (form.beamSection === 'Custom') {
        hb = parseFloat(form.customBeamDepth);
        bb = parseFloat(form.customBeamWidth);
        tfb = parseFloat(form.customBeamFlange);
        twb = parseFloat(form.customBeamWeb);
      } else {
        const beam = BEAM_SECTIONS[form.beamSection];
        hb = beam.h;
        bb = beam.b;
        tfb = beam.tf;
        twb = beam.tw;
      }

      // Get column properties
      const column = COLUMN_SECTIONS[form.columnSection];
      const hc = column.h;
      const tfc = column.tf;
      const twc = column.tw;

      // Material properties
      const beamGrade = STEEL_GRADES[form.beamGrade];
      const columnGrade = STEEL_GRADES[form.columnGrade];
      const plateGrade = STEEL_GRADES[form.plateGrade];
      const boltGrade = BOLT_GRADES[form.boltGrade];
      const boltSize = BOLT_DIAMETERS[form.boltDiameter];

      const fyb = beamGrade.fy;
      const fyc = columnGrade.fy;
      const fyp = plateGrade.fy;
      const fub = boltGrade.fub;

      // Partial factors
      const gammaM0 = parseFloat(form.gammaM0);
      const gammaM2 = parseFloat(form.gammaM2);

      // End plate geometry
      const bp = parseFloat(form.plateWidth);
      const hp = parseFloat(form.plateDepth);
      const tp = parseFloat(form.plateThickness);

      // Bolt geometry
      const nRows = parseInt(form.boltRows);
      const nCols = parseInt(form.boltCols);
      const gauge = parseFloat(form.gaugeDistance);
      const pitch = parseFloat(form.pitchDistance);
      const topRow = parseFloat(form.topRowDistance);

      // Bolt properties
      const As = boltSize.As;
      const d = boltSize.d;
      const d0 = boltSize.d0;
      const dm = boltSize.dm;

      // Design forces
      const MEd = parseFloat(form.momentEd); // kNm
      const VEd = parseFloat(form.shearEd); // kN
      const NEd = parseFloat(form.axialEd); // kN

      // Weld sizes
      const aw_flange = parseFloat(form.flangeWeld);
      const aw_web = parseFloat(form.webWeld);

      // ─────────────────────────────────────────────────────────────────────
      // T-Stub Analysis (EN 1993-1-8 Table 6.2)
      // ─────────────────────────────────────────────────────────────────────

      // Effective width for T-stub (simplified)
      const m = gauge / 2 - twb / 2 - 0.8 * aw_flange * Math.sqrt(2);
      const e = Math.min(bp / 2 - gauge / 2, topRow);
      const n_eff = Math.min(e, 1.25 * m);

      // Effective length (circular and non-circular patterns)
      const leff_cp = 2 * Math.PI * m; // Circular pattern
      const leff_nc = 4 * m + 1.25 * e; // Non-circular
      const leff = Math.min(leff_cp, leff_nc);

      // T-stub resistance modes (per bolt row)
      // Mode 1: Complete yielding of flange
      const Mpl_1 = (0.25 * leff * tp * tp * fyp) / gammaM0;
      const FT_1_Rd = (4 * Mpl_1) / m;

      // Mode 2: Bolt failure with flange yielding
      const Ft_Rd = (0.9 * fub * As) / (gammaM2 * 1000); // kN per bolt
      const FT_2_Rd = (2 * Mpl_1 + n_eff * 2 * Ft_Rd * 1000) / (m + n_eff);

      // Mode 3: Bolt failure
      const FT_3_Rd = 2 * Ft_Rd * 1000; // 2 bolts per row

      // Governing T-stub mode
      const FT_Rd = Math.min(FT_1_Rd, FT_2_Rd, FT_3_Rd) / 1000; // kN
      let governingMode: string;
      if (FT_Rd * 1000 === FT_1_Rd) governingMode = 'Mode 1';
      else if (FT_Rd * 1000 === FT_2_Rd) governingMode = 'Mode 2';
      else governingMode = 'Mode 3';

      // ─────────────────────────────────────────────────────────────────────
      // Lever Arm and Bolt Row Forces
      // ─────────────────────────────────────────────────────────────────────

      const isExtended = form.endPlateType === 'extended';
      const tensionRows = isExtended ? Math.ceil(nRows / 2) : Math.floor(nRows / 2);

      // Calculate lever arm (simplified - distance from compression to tension centroid)
      const zCompression = hb - tfb / 2; // Compression at bottom flange
      const zTension = tfb / 2 + (isExtended ? topRow : pitch / 2);

      // Triangular distribution of bolt row forces
      const leverArm = hb - tfb;
      const tensionRowForces: number[] = [];
      let totalZ = 0;

      for (let i = 0; i < tensionRows; i++) {
        const zi = leverArm - i * pitch;
        totalZ += zi;
      }

      const maxBoltForce = (MEd * 1000) / totalZ;
      for (let i = 0; i < tensionRows; i++) {
        const zi = leverArm - i * pitch;
        const Fi = (maxBoltForce * zi) / leverArm;
        tensionRowForces.push(Fi);
      }

      const totalTension = tensionRowForces.reduce((a, b) => a + b, 0);
      const maxBoltTension = Math.max(...tensionRowForces);

      // Tension zone check
      const tensionCapacity = tensionRows * FT_Rd;
      const tensionUtil = (totalTension / 1000 / tensionCapacity) * 100;
      const tensionStatus = tensionUtil <= 100 ? 'PASS' : 'FAIL';

      // ─────────────────────────────────────────────────────────────────────
      // Compression Zone Check
      // ─────────────────────────────────────────────────────────────────────

      const compressionForce = totalTension / 1000 + NEd; // kN
      const beff_wc = tfb + 2 * Math.sqrt(2) * aw_flange + 5 * (tfc + Math.sqrt(2) * aw_flange);
      const Fc_wc_Rd = (beff_wc * twc * fyc) / (gammaM0 * 1000); // kN
      const compressionUtil = (compressionForce / Fc_wc_Rd) * 100;
      const compressionStatus = compressionUtil <= 100 ? 'PASS' : 'FAIL';

      // ─────────────────────────────────────────────────────────────────────
      // Shear Check
      // ─────────────────────────────────────────────────────────────────────

      const Fv_Rd = (0.6 * fub * As) / (gammaM2 * 1000); // kN per bolt
      const totalShearResistance = nRows * nCols * Fv_Rd;
      const shearUtil = (VEd / totalShearResistance) * 100;
      const shearStatus = shearUtil <= 100 ? 'PASS' : 'FAIL';

      // ─────────────────────────────────────────────────────────────────────
      // Weld Checks
      // ─────────────────────────────────────────────────────────────────────

      // Flange weld - tension from moment
      const flangeForce = (MEd / (hb - tfb)) * 1000; // kN to N
      const flangeWeldLength = 2 * (bb - twb);
      const flangeWeldArea = flangeWeldLength * aw_flange * 0.7;
      const flangeWeldStress = (flangeForce * 1000) / flangeWeldArea; // N/mm²

      const fu = plateGrade.fu;
      const betaW = 0.9; // For S275/S355
      const fvwd = fu / (Math.sqrt(3) * betaW * gammaM2);
      const flangeWeldUtil = (flangeWeldStress / fvwd) * 100;
      const flangeWeldStatus = flangeWeldUtil <= 100 ? 'PASS' : 'FAIL';

      // Web weld - shear
      const webWeldLength = hb - 2 * tfb;
      const webWeldArea = 2 * webWeldLength * aw_web * 0.7;
      const webWeldStress = (VEd * 1000) / webWeldArea; // N/mm²
      const webWeldUtil = (webWeldStress / fvwd) * 100;
      const webWeldStatus = webWeldUtil <= 100 ? 'PASS' : 'FAIL';

      // ─────────────────────────────────────────────────────────────────────
      // Plate Bending Check
      // ─────────────────────────────────────────────────────────────────────

      // Simplified check based on T-stub mode
      const plateUtil = governingMode === 'Mode 1' ? tensionUtil * 0.9 : tensionUtil;
      const plateStatus = plateUtil <= 100 ? 'PASS' : 'FAIL';

      // ─────────────────────────────────────────────────────────────────────
      // Connection Moment Resistance
      // ─────────────────────────────────────────────────────────────────────

      let MRd = 0;
      for (let i = 0; i < tensionRows; i++) {
        const zi = leverArm - i * pitch;
        MRd += (FT_Rd * zi) / 1000;
      }

      // Rotational stiffness (simplified)
      const E = 210000; // MPa
      const z = leverArm;
      const Sj = (E * z * z) / (1 / ((nRows * As) / 10) + z / (0.5 * tp * tp * tp));
      const Sj_ini = Sj / 1e6; // kNm/rad

      // Connection classification
      let connectionClass: string;
      if (Sj_ini > 25 * E * 1e-6 * z) connectionClass = 'Rigid';
      else if (Sj_ini > 0.5 * E * 1e-6 * z) connectionClass = 'Semi-rigid';
      else connectionClass = 'Nominally pinned';

      // ─────────────────────────────────────────────────────────────────────
      // Overall Assessment
      // ─────────────────────────────────────────────────────────────────────

      const allUtils = [
        tensionUtil,
        compressionUtil,
        shearUtil,
        flangeWeldUtil,
        webWeldUtil,
        plateUtil,
      ];
      const maxUtil = Math.max(...allUtils);
      const checkNames = [
        'Tension Zone',
        'Compression Zone',
        'Bolt Shear',
        'Flange Weld',
        'Web Weld',
        'Plate Bending',
      ];
      const criticalIndex = allUtils.indexOf(maxUtil);
      const criticalCheck = checkNames[criticalIndex];

      const status =
        tensionStatus === 'PASS' &&
        compressionStatus === 'PASS' &&
        shearStatus === 'PASS' &&
        flangeWeldStatus === 'PASS' &&
        webWeldStatus === 'PASS' &&
        plateStatus === 'PASS'
          ? 'PASS'
          : 'FAIL';

      // Warnings
      if (tp < 0.8 * tfb) {
        newWarnings.push('End plate thinner than beam flange - may be undersized');
      }
      if (gauge < 2.2 * d0) {
        newWarnings.push('Gauge distance may be too small for bolt installation');
      }
      if (governingMode === 'Mode 3') {
        newWarnings.push('Bolt tension governs - consider larger bolts or more rows');
      }
      if (tensionUtil > 85) {
        newWarnings.push('High tension utilisation - check prying action');
      }
      if (connectionClass === 'Nominally pinned') {
        newWarnings.push('Connection classified as pinned - moment transfer limited');
      }

      setResults({
        connectionClass,
        rotationalStiffness: Sj_ini,
        momentResistance: MRd,
        tensionRowForces,
        maxBoltTension,
        leverArm,
        mode1Resistance: FT_1_Rd / 1000,
        mode2Resistance: FT_2_Rd / 1000,
        mode3Resistance: FT_3_Rd / 1000,
        governingMode,
        tStubCapacity: FT_Rd,
        tensionForce: totalTension / 1000,
        tensionCapacity,
        tensionUtil,
        tensionStatus,
        compressionForce,
        columnWebCapacity: Fc_wc_Rd,
        compressionUtil,
        compressionStatus,
        shearForce: VEd,
        boltShearCapacity: totalShearResistance,
        shearUtil,
        shearStatus,
        flangeWeldStress,
        flangeWeldCapacity: fvwd,
        flangeWeldUtil,
        flangeWeldStatus,
        webWeldStress,
        webWeldCapacity: fvwd,
        webWeldUtil,
        webWeldStatus,
        plateUtil,
        plateStatus,
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
  // Canvas Drawing
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'End Plate Connection Design',
      subtitle: `${form.endPlateType} — ${form.beamSection} — EN 1993-1-8`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'EP001' },
      ],
      inputs: [
        { label: 'Connection Type', value: form.endPlateType },
        { label: 'Beam Section', value: form.beamSection },
        { label: 'Column Section', value: form.columnSection },
        {
          label: 'Plate Size',
          value: `${form.plateDepth} × ${form.plateWidth} × ${form.plateThickness}`,
          unit: 'mm',
        },
        { label: 'Bolt Size', value: form.boltDiameter },
        { label: 'Bolt Grade', value: form.boltGrade },
        { label: 'Bolt Rows', value: form.boltRows },
        { label: 'Moment (MEd)', value: form.momentEd, unit: 'kNm' },
        { label: 'Shear (VEd)', value: form.shearEd, unit: 'kN' },
        { label: 'Flange Weld', value: form.flangeWeld, unit: 'mm' },
        { label: 'Web Weld', value: form.webWeld, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Tension Zone',
          capacity: `${results.tensionCapacity.toFixed(1)} kN`,
          utilisation: `${results.tensionUtil.toFixed(1)}%`,
          status: results.tensionStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Compression Zone',
          capacity: `${results.columnWebCapacity.toFixed(1)} kN`,
          utilisation: `${results.compressionUtil.toFixed(1)}%`,
          status: results.compressionStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Bolt Shear',
          capacity: `${results.boltShearCapacity.toFixed(1)} kN`,
          utilisation: `${results.shearUtil.toFixed(1)}%`,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Flange Weld',
          capacity: `${results.flangeWeldCapacity.toFixed(1)} MPa`,
          utilisation: `${results.flangeWeldUtil.toFixed(1)}%`,
          status: results.flangeWeldStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Web Weld',
          capacity: `${results.webWeldCapacity.toFixed(1)} MPa`,
          utilisation: `${results.webWeldUtil.toFixed(1)}%`,
          status: results.webWeldStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Plate Bending',
          capacity: '-',
          utilisation: `${results.plateUtil.toFixed(1)}%`,
          status: results.plateStatus as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — EN 1993-1-8 End Plate Connection',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'End Plate Connection Design',
      subtitle: `${form.endPlateType} — ${form.beamSection} — EN 1993-1-8`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'EP001' },
      ],
      inputs: [
        { label: 'Connection Type', value: form.endPlateType },
        { label: 'Beam Section', value: form.beamSection },
        { label: 'Column Section', value: form.columnSection },
        {
          label: 'Plate Size',
          value: `${form.plateDepth} × ${form.plateWidth} × ${form.plateThickness}`,
          unit: 'mm',
        },
        { label: 'Bolt Size', value: form.boltDiameter },
        { label: 'Bolt Grade', value: form.boltGrade },
        { label: 'Bolt Rows', value: form.boltRows },
        { label: 'Moment (MEd)', value: form.momentEd, unit: 'kNm' },
        { label: 'Shear (VEd)', value: form.shearEd, unit: 'kN' },
        { label: 'Flange Weld', value: form.flangeWeld, unit: 'mm' },
        { label: 'Web Weld', value: form.webWeld, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Tension Zone',
          capacity: `${results.tensionCapacity.toFixed(1)} kN`,
          utilisation: `${results.tensionUtil.toFixed(1)}%`,
          status: results.tensionStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Compression Zone',
          capacity: `${results.columnWebCapacity.toFixed(1)} kN`,
          utilisation: `${results.compressionUtil.toFixed(1)}%`,
          status: results.compressionStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Bolt Shear',
          capacity: `${results.boltShearCapacity.toFixed(1)} kN`,
          utilisation: `${results.shearUtil.toFixed(1)}%`,
          status: results.shearStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Flange Weld',
          capacity: `${results.flangeWeldCapacity.toFixed(1)} MPa`,
          utilisation: `${results.flangeWeldUtil.toFixed(1)}%`,
          status: results.flangeWeldStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Web Weld',
          capacity: `${results.webWeldCapacity.toFixed(1)} MPa`,
          utilisation: `${results.webWeldUtil.toFixed(1)}%`,
          status: results.webWeldStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Plate Bending',
          capacity: '-',
          utilisation: `${results.plateUtil.toFixed(1)}%`,
          status: results.plateStatus as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — EN 1993-1-8 End Plate Connection',
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
      className={cn('rounded-2xl border overflow-hidden bg-gray-900/40 backdrop-blur-md border-gray-700/50', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-white font-semibold">{title}</span>
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
    field: keyof EndPlateForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title="{label}"
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
      {/* Grid pattern background */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            End Plate Connections
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Flush and extended end plate moment connections with T-stub analysis, bolt forces, and
            weld checks
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button onClick={exportPDF} disabled={!results} className="bg-blue-600/80 hover:bg-blue-500/80 text-white text-sm">
            <FiDownload className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button onClick={exportDOCX} disabled={!results} className="bg-indigo-600/80 hover:bg-indigo-500/80 text-white text-sm">
            <FiDownload className="w-4 h-4 mr-2" /> Export DOCX
          </Button>
          <div className="flex-1" />
          <SaveRunButton calculatorKey="end-plate" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
        </div>

        {/* Presets */}
        <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"><FiZap className="w-6 h-6 text-blue-400" /></div>
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
                activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'text-gray-400',
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
                {/* Beam Section */}
                <Section
                  id="beam"
                  title="Beam & Column"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-cyan-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">End Plate Type</label>
                      <select
                        title="End Plate Type"
                        value={form.endPlateType}
                        onChange={(e) => updateForm('endPlateType', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="flush">Flush End Plate</option>
                        <option value="extended">Extended End Plate</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Beam Section</label>
                      <select
                        title="Beam Section"
                        value={form.beamSection}
                        onChange={(e) => updateForm('beamSection', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(BEAM_SECTIONS).map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Column Section</label>
                      <select
                        title="Column Section"
                        value={form.columnSection}
                        onChange={(e) => updateForm('columnSection', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(COLUMN_SECTIONS).map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Steel Grade</label>
                      <select
                        title="Steel Grade"
                        value={form.beamGrade}
                        onChange={(e) => updateForm('beamGrade', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(STEEL_GRADES).map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                {/* End Plate */}
                <Section
                  id="plate"
                  title="End Plate Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiSliders className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-emerald-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Plate Width (bp)" field="plateWidth" unit="mm" />
                    <InputField label="Plate Depth (hp)" field="plateDepth" unit="mm" />
                    <InputField label="Plate Thickness (tp)" field="plateThickness" unit="mm" />

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Plate Grade</label>
                      <select
                        title="Plate Grade"
                        value={form.plateGrade}
                        onChange={(e) => updateForm('plateGrade', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(STEEL_GRADES).map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Bolts */}
                <Section
                  id="bolts"
                  title="Bolt Arrangement"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-amber-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Bolt Grade</label>
                      <select
                        title="Bolt Grade"
                        value={form.boltGrade}
                        onChange={(e) => updateForm('boltGrade', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(BOLT_GRADES).map((grade) => (
                          <option key={grade} value={grade}>
                            Grade {grade}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Bolt Diameter</label>
                      <select
                        title="Bolt Diameter"
                        value={form.boltDiameter}
                        onChange={(e) => updateForm('boltDiameter', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.keys(BOLT_DIAMETERS).map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Number of Rows</label>
                      <select
                        title="Number of Rows"
                        value={form.boltRows}
                        onChange={(e) => updateForm('boltRows', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="4">4 rows</option>
                        <option value="6">6 rows</option>
                        <option value="8">8 rows</option>
                      </select>
                    </div>

                    <InputField label="Gauge Distance" field="gaugeDistance" unit="mm" />
                    <InputField label="Pitch Distance" field="pitchDistance" unit="mm" />
                    <InputField label="Top Row Distance" field="topRowDistance" unit="mm" />
                  </div>
                </Section>

                {/* Loading */}
                <Section
                  id="loading"
                  title="Design Forces"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-purple-500/30"
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <InputField label="Moment (M_Ed)" field="momentEd" unit="kNm" />
                    <InputField label="Shear (V_Ed)" field="shearEd" unit="kN" />
                    <InputField label="Axial (N_Ed)" field="axialEd" unit="kN" />
                  </div>
                </Section>

                {/* Welds */}
                <Section
                  id="welds"
                  title="Weld Sizes"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiTool className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  color="border-rose-500/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Flange Weld (leg)" field="flangeWeld" unit="mm" />
                    <InputField label="Web Weld (leg)" field="webWeld" unit="mm" />
                  </div>
                </Section>

                {/* RUN FULL ANALYSIS Button */}
                <button
                  onClick={calculate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
                </button>
              </div>

              {/* Results Column */}
              <div className="lg:col-span-1 space-y-4 sticky top-8">
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
                        <EndPlate3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        END PLATE CONNECTION — REAL-TIME PREVIEW
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
                          { label: 'Plate Type', value: form.endPlateType },
                          { label: 'Beam Section', value: form.beamSection },
                          { label: 'Plate Size', value: `${form.plateWidth}×${form.plateDepth}×${form.plateThickness} mm` },
                          { label: 'Bolt Grade', value: form.boltGrade },
                          { label: 'Bolt Diameter', value: form.boltDiameter },
                          { label: 'Moment Ed', value: `${form.momentEd} kNm` },
                          { label: 'Shear Ed', value: `${form.shearEd} kN` },
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
                              { label: 'Tension', util: ((results.tensionUtil || 0) * 100).toFixed(1), status: results.tensionStatus },
                              { label: 'Compression', util: ((results.compressionUtil || 0) * 100).toFixed(1), status: results.compressionStatus },
                              { label: 'Shear', util: ((results.shearUtil || 0) * 100).toFixed(1), status: results.shearStatus },
                              { label: 'Flange Weld', util: ((results.flangeWeldUtil || 0) * 100).toFixed(1), status: results.flangeWeldStatus },
                              { label: 'Web Weld', util: ((results.webWeldUtil || 0) * 100).toFixed(1), status: results.webWeldStatus },
                              { label: 'Plate Bending', util: ((results.plateUtil || 0) * 100).toFixed(1), status: results.plateStatus },
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

                {/* Canvas */}
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
                    title="End Plate — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                        <EndPlate3D />
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
                      className={cn(
                        'border-2 shadow-lg backdrop-blur-md',
                        results.status === 'PASS'
                          ? 'bg-green-900/20 border-green-500/50 shadow-green-500/10 border-l-4 border-l-green-400'
                          : 'bg-red-900/20 border-red-500/50 shadow-red-500/10 border-l-4 border-l-red-400',
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
                          M_Rd = {results.momentResistance.toFixed(0)} kNm
                        </p>
                        <p className="text-xs text-gray-500">
                          {results.connectionClass} • {results.governingMode}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Design Checks */}
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white font-semibold">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { name: 'Tension Zone', util: results.tensionUtil },
                          { name: 'Compression', util: results.compressionUtil },
                          { name: 'Bolt Shear', util: results.shearUtil },
                          { name: 'Flange Weld', util: results.flangeWeldUtil },
                          { name: 'Web Weld', util: results.webWeldUtil },
                        ].map((check) => (
                          <div key={check.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">{check.name}</span>
                              <span
                                className={cn(
                                  check.util <= 100 ? 'text-green-400' : 'text-red-400',
                                )}
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
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Key Values */}
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white font-semibold">T-Stub Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Mode 1</p>
                          <p className="text-white font-mono">
                            {results.mode1Resistance.toFixed(0)} kN
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Mode 2</p>
                          <p className="text-white font-mono">
                            {results.mode2Resistance.toFixed(0)} kN
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Mode 3</p>
                          <p className="text-white font-mono">
                            {results.mode3Resistance.toFixed(0)} kN
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Governing</p>
                          <p className="text-cyan-400 font-mono">{results.governingMode}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Lever Arm</p>
                          <p className="text-white font-mono">{results.leverArm.toFixed(0)} mm</p>
                        </div>
                        <div>
                          <p className="text-gray-500">S_j,ini</p>
                          <p className="text-white font-mono">
                            {(results.rotationalStiffness / 1000).toFixed(0)}k
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Card className="bg-amber-900/20 border-amber-500/30 border-l-4 border-l-yellow-400 backdrop-blur-md">
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

                    {/* Recommendations */}
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <FiCheckCircle className="w-6 h-6 text-blue-400" />
                          </div>
                          Design Recommendations
                        </h3>
                        <div className="space-y-3">
                          {[
                            'Verify bolt edge/end distances satisfy EN 1993-1-8 Table 3.3 minimum requirements',
                            'Check column flange stiffening if T-stub prying forces exceed unstiffened capacity',
                            'Ensure weld sizes match fabrication capabilities and NSSS tolerances',
                            'Consider connection ductility class for seismic or accidental design situations',
                          ].map((rec, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <FiCheck className="text-cyan-400 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-300 text-sm">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Export */}
                    <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3">
                      <Button
                        onClick={exportPDF}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                      >
                        <FiDownload className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500"
                      >
                        <FiDownload className="w-4 h-4 mr-2" />
                        DOCX
                      </Button>
                      <SaveRunButton calculatorKey="end-plate" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EndPlate;
