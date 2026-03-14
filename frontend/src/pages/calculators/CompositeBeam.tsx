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
  FiMinimize2,
  FiSliders,
  FiZap,
} from 'react-icons/fi';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { cn } from '../../lib/utils';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import { CompositeBeam3D } from '../../components/3d/scenes';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview, { type WhatIfSlider } from '../../components/WhatIfPreview';
import {
  CONCRETE_GRADES as _CONCRETE_LIB,
  STEEL_GRADES as _STEEL_LIB,
} from '../../data/materialGrades';
import { downloadPDF } from '../../lib/pdf';
import { buildCompositeBeamReport } from '../../lib/pdf/builders/compositeBeamBuilder';

interface FormData {
  steelSection: string;
  slabThickness: string;
  slabWidth: string;
  concreteGrade: string;
  shearConnectorType: string;
  shearConnectorDiameter: string;
  shearConnectorHeight: string;
  connectorsPerRow: string;
  connectorRows: string;
  connectorSpacing: string;
  span: string;
  deadLoad: string;
  liveLoad: string;
  pointLoadDead: string;
  pointLoadLive: string;
  steelGrade: string;
  lateralRestraint: string;
}

const PRESETS = {
  highway_12m: {
    name: '🛣️ Highway Overbridge — 12m Span',
    span: '12.0',
    steelSection: 'UKB 610x229x101',
    slabDepth: '200',
    slabWidth: '3650',
    deadLoad: '5.5',
    liveLoad: '10.0',
    concreteGrade: 'C35/45',
    steelGrade: 'S355',
    shearConnectorDiameter: '19',
    shearConnectorHeight: '100',
    connectorsPerRow: '2',
    connectorRows: '52',
  },
  highway_18m: {
    name: '🛣️ Highway Bridge — 18m Span',
    span: '18.0',
    steelSection: 'UKB 762x267x173',
    slabDepth: '220',
    slabWidth: '4000',
    deadLoad: '6.0',
    liveLoad: '10.0',
    concreteGrade: 'C35/45',
    steelGrade: 'S355',
    shearConnectorDiameter: '22',
    shearConnectorHeight: '125',
    connectorsPerRow: '2',
    connectorRows: '76',
  },
  highway_25m: {
    name: '🛣️ Highway Bridge — 25m Span',
    span: '25.0',
    steelSection: 'UKB 914x305x201',
    slabDepth: '250',
    slabWidth: '4000',
    deadLoad: '7.0',
    liveLoad: '10.0',
    concreteGrade: 'C40/50',
    steelGrade: 'S355',
    shearConnectorDiameter: '22',
    shearConnectorHeight: '125',
    connectorsPerRow: '2',
    connectorRows: '96',
  },
  rail_bridge: {
    name: '🚂 Rail Bridge — Network Rail (15m)',
    span: '15.0',
    steelSection: 'UKB 686x254x125',
    slabDepth: '250',
    slabWidth: '3500',
    deadLoad: '8.0',
    liveLoad: '20.0',
    concreteGrade: 'C40/50',
    steelGrade: 'S355',
    shearConnectorDiameter: '22',
    shearConnectorHeight: '125',
    connectorsPerRow: '2',
    connectorRows: '72',
  },
  footbridge_urban: {
    name: '🚶 Footbridge — Urban (20m)',
    span: '20.0',
    steelSection: 'UKB 457x191x67',
    slabDepth: '150',
    slabWidth: '2500',
    deadLoad: '3.5',
    liveLoad: '5.0',
    concreteGrade: 'C30/37',
    steelGrade: 'S355',
    shearConnectorDiameter: '19',
    shearConnectorHeight: '100',
    connectorsPerRow: '2',
    connectorRows: '60',
  },
  footbridge_wide: {
    name: '🚶 Footbridge — Wide Deck (15m)',
    span: '15.0',
    steelSection: 'UKB 533x210x82',
    slabDepth: '160',
    slabWidth: '4000',
    deadLoad: '4.0',
    liveLoad: '5.0',
    concreteGrade: 'C30/37',
    steelGrade: 'S355',
    shearConnectorDiameter: '19',
    shearConnectorHeight: '100',
    connectorsPerRow: '2',
    connectorRows: '56',
  },
  integral_bridge: {
    name: '🌉 Integral Bridge Deck (16m)',
    span: '16.0',
    steelSection: 'UKB 610x229x113',
    slabDepth: '200',
    slabWidth: '3650',
    deadLoad: '5.5',
    liveLoad: '10.0',
    concreteGrade: 'C35/45',
    steelGrade: 'S355',
    shearConnectorDiameter: '19',
    shearConnectorHeight: '100',
    connectorsPerRow: '2',
    connectorRows: '62',
  },
  approach_viaduct: {
    name: '🏗️ Approach Viaduct — Multi-span (30m)',
    span: '30.0',
    steelSection: 'UKB 914x305x253',
    slabDepth: '250',
    slabWidth: '4000',
    deadLoad: '8.0',
    liveLoad: '10.0',
    concreteGrade: 'C40/50',
    steelGrade: 'S355',
    shearConnectorDiameter: '22',
    shearConnectorHeight: '125',
    connectorsPerRow: '2',
    connectorRows: '110',
  },
};

const CompositeBeam: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    steelSection: 'UKB 610x229x101',
    slabThickness: '150',
    slabWidth: '2000',
    concreteGrade: 'C30/37',
    shearConnectorType: 'stud',
    shearConnectorDiameter: '20',
    shearConnectorHeight: '100',
    connectorsPerRow: '2',
    connectorRows: '10',
    connectorSpacing: '300',
    span: '12',
    deadLoad: '5',
    liveLoad: '10',
    pointLoadDead: '0',
    pointLoadLive: '0',
    steelGrade: 'S355',
    lateralRestraint: 'unrestrained',
  });

  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const autoCalcTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const whatIfSliders: WhatIfSlider[] = [
    { key: 'span', label: 'Span', min: 6, max: 30, step: 0.5, unit: 'm' },
    { key: 'slabThickness', label: 'Slab Thickness', min: 100, max: 300, step: 10, unit: 'mm' },
    {
      key: 'slabWidth',
      label: 'Effective Slab Width',
      min: 1000,
      max: 5000,
      step: 100,
      unit: 'mm',
    },
    { key: 'deadLoad', label: 'Dead Load (UDL)', min: 1, max: 20, step: 0.5, unit: 'kN/m' },
    { key: 'liveLoad', label: 'Live Load (UDL)', min: 1, max: 30, step: 0.5, unit: 'kN/m' },
  ];

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

  const applyPreset = (key: string) => {
    const preset = PRESETS[key as keyof typeof PRESETS];
    if (!preset) return;
    setFormData((prev) => ({
      ...prev,
      span: preset.span,
      steelSection: preset.steelSection,
      slabThickness: preset.slabDepth,
      ...(preset.deadLoad ? { deadLoad: preset.deadLoad } : {}),
      ...(preset.liveLoad ? { liveLoad: preset.liveLoad } : {}),
      ...(preset.concreteGrade ? { concreteGrade: preset.concreteGrade } : {}),
      ...(preset.steelGrade ? { steelGrade: preset.steelGrade } : {}),
      ...(preset.slabWidth ? { slabWidth: preset.slabWidth } : {}),
      ...(preset.shearConnectorDiameter
        ? { shearConnectorDiameter: preset.shearConnectorDiameter }
        : {}),
      ...(preset.shearConnectorHeight ? { shearConnectorHeight: preset.shearConnectorHeight } : {}),
      ...(preset.connectorsPerRow ? { connectorsPerRow: preset.connectorsPerRow } : {}),
      ...(preset.connectorRows ? { connectorRows: preset.connectorRows } : {}),
    }));
  };

  // Helper function to generate recommendations for failed checks
  const getRecommendation = (checkType: string, utilisation: number, results: any): string => {
    if (utilisation < 100) return '';

    switch (checkType) {
      case 'bendingResistance':
        return 'Consider: 1) Increase steel section size, 2) Increase slab thickness, 3) Reduce span, 4) Use higher strength materials';

      case 'shearResistance':
        return 'Consider: 1) Increase web thickness, 2) Add intermediate supports, 3) Use higher strength steel';

      case 'shearConnection':
        return 'Consider: 1) Increase number of shear connectors, 2) Use larger diameter studs, 3) Reduce connector spacing';

      case 'deflection':
        return 'Consider: 1) Increase steel section depth, 2) Increase slab thickness, 3) Add intermediate supports';

      case 'lateralTorsionalBuckling':
        return 'Consider: 1) Add lateral restraints, 2) Increase flange size, 3) Reduce span length';

      default:
        return 'Consider reviewing section dimensions or reducing applied loads';
    }
  };

  // PDF Export Function - Premium @react-pdf/renderer
  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    if (!results) return;
    const reportData = buildCompositeBeamReport(formData, results, warnings, {
      projectName: 'Composite Beam Design',
      documentRef: 'COM-001',
    });
    await downloadPDF(
      reportData as any,
      `CompositeBeam_${formData.steelSection}_${formData.span}m`,
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DOCX Export — Editable Word document
  // ─────────────────────────────────────────────────────────────────────────────
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Composite Beam Design',
      subtitle: 'EN 1994-1-1 Compliant',
      projectInfo: [
        { label: 'Steel Section', value: formData.steelSection },
        { label: 'Concrete Grade', value: formData.concreteGrade },
      ],
      inputs: [
        { label: 'Span', value: formData.span, unit: 'm' },
        { label: 'Slab Thickness', value: formData.slabThickness, unit: 'mm' },
        { label: 'Slab Width', value: formData.slabWidth, unit: 'mm' },
        { label: 'Steel Grade', value: formData.steelGrade, unit: '' },
        { label: 'Dead Load', value: formData.deadLoad, unit: 'kN/m' },
        { label: 'Live Load', value: formData.liveLoad, unit: 'kN/m' },
        { label: 'Shear Connectors/Row', value: formData.connectorsPerRow, unit: '' },
        { label: 'Connector Rows', value: formData.connectorRows, unit: '' },
        { label: 'Connector Spacing', value: formData.connectorSpacing, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `${results.Mpl_Rd?.toFixed(1) || '-'} kNm`,
          utilisation: `${results.bending_util?.toFixed(1) || '-'}%`,
          status: ((results.bending_util || 0) <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `${results.Vpl_Rd?.toFixed(1) || '-'} kN`,
          utilisation: `${results.shear_util?.toFixed(1) || '-'}%`,
          status: ((results.shear_util || 0) <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `L/${formData.span ? ((parseFloat(formData.span) * 1000) / 300).toFixed(0) : '250'}`,
          utilisation: `${results.deflection_ratio?.toFixed(1) || '-'}%`,
          status: ((results.deflection_ratio || 0) <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear Connection',
          capacity: `${results.P_Rd?.toFixed(1) || '-'} kN`,
          utilisation: `${results.shear_connection_util?.toFixed(1) || '-'}%`,
          status: ((results.shear_connection_util || 0) <= 100 ? 'PASS' : 'FAIL') as
            | 'PASS'
            | 'FAIL',
        },
        {
          name: 'Overall',
          capacity: '-',
          utilisation: `${results.max_util?.toFixed(1) || '-'}%`,
          status: (results.status || 'PASS') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Shear Connection',
          suggestion: 'Verify shear connector spacing for partial interaction',
        },
        { check: 'Deflection', suggestion: 'Consider pre-cambering for long spans' },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Composite Beam Design',
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.span || parseFloat(formData.span) <= 0) {
      errors.span = 'Span must be greater than 0';
    }
    if (!formData.slabThickness || parseFloat(formData.slabThickness) <= 0) {
      errors.slabThickness = 'Slab thickness required';
    }
    if (!formData.slabWidth || parseFloat(formData.slabWidth) <= 0) {
      errors.slabWidth = 'Slab width required';
    }
    if (!formData.connectorRows || parseInt(formData.connectorRows) <= 0) {
      errors.connectorRows = 'Number of connector rows required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Steel section database (UKB properties per Tata Steel Blue Book)
  const SECTION_DB: Record<
    string,
    {
      h: number;
      b: number;
      tw: number;
      tf: number;
      r: number;
      A: number;
      Iy: number;
      Wpl_y: number;
      Wel_y: number;
      iy: number;
      Iw: number;
      It: number;
    }
  > = {
    // --- Tata Steel Blue Book UKB properties ---
    'UKB 914x305x201': {
      h: 903.0,
      b: 303.3,
      tw: 15.1,
      tf: 20.2,
      r: 19.1,
      A: 256.0,
      Iy: 325000,
      Wpl_y: 8350,
      Wel_y: 7200,
      iy: 35.6,
      Iw: 13800000,
      It: 291,
    },
    'UKB 762x267x173': {
      h: 762.2,
      b: 266.7,
      tw: 14.3,
      tf: 21.6,
      r: 16.5,
      A: 220.0,
      Iy: 205000,
      Wpl_y: 6200,
      Wel_y: 5390,
      iy: 30.5,
      Iw: 6850000,
      It: 268,
    },
    'UKB 686x254x125': {
      h: 677.9,
      b: 253.0,
      tw: 11.7,
      tf: 16.2,
      r: 15.2,
      A: 159.0,
      Iy: 118000,
      Wpl_y: 4000,
      Wel_y: 3480,
      iy: 27.2,
      Iw: 3530000,
      It: 116,
    },
    'UKB 610x229x140': {
      h: 617.2,
      b: 230.2,
      tw: 13.1,
      tf: 22.1,
      r: 12.7,
      A: 178.0,
      Iy: 112000,
      Wpl_y: 4140,
      Wel_y: 3620,
      iy: 25.0,
      Iw: 2730000,
      It: 216,
    },
    'UKB 610x229x101': {
      h: 602.6,
      b: 227.6,
      tw: 10.5,
      tf: 14.8,
      r: 12.7,
      A: 129.0,
      Iy: 75780,
      Wpl_y: 2880,
      Wel_y: 2515,
      iy: 24.2,
      Iw: 1570000,
      It: 77.0,
    },
    'UKB 533x210x101': {
      h: 536.7,
      b: 210.0,
      tw: 10.8,
      tf: 17.4,
      r: 12.7,
      A: 129.0,
      Iy: 61500,
      Wpl_y: 2610,
      Wel_y: 2290,
      iy: 21.8,
      Iw: 1260000,
      It: 101,
    },
    'UKB 533x210x82': {
      h: 528.3,
      b: 208.8,
      tw: 9.6,
      tf: 13.2,
      r: 12.7,
      A: 104.0,
      Iy: 47500,
      Wpl_y: 2060,
      Wel_y: 1800,
      iy: 21.3,
      Iw: 916000,
      It: 51.5,
    },
    'UKB 457x191x89': {
      h: 463.4,
      b: 191.9,
      tw: 10.5,
      tf: 17.7,
      r: 10.2,
      A: 114.0,
      Iy: 41000,
      Wpl_y: 2010,
      Wel_y: 1770,
      iy: 19.0,
      Iw: 706000,
      It: 89.2,
    },
    'UKB 457x191x67': {
      h: 453.4,
      b: 189.9,
      tw: 8.5,
      tf: 12.7,
      r: 10.2,
      A: 85.5,
      Iy: 29380,
      Wpl_y: 1470,
      Wel_y: 1296,
      iy: 18.5,
      Iw: 705000,
      It: 37.1,
    },
    'UKB 406x178x74': {
      h: 412.8,
      b: 179.5,
      tw: 9.5,
      tf: 16.0,
      r: 10.2,
      A: 94.5,
      Iy: 27300,
      Wpl_y: 1500,
      Wel_y: 1320,
      iy: 17.0,
      Iw: 404000,
      It: 62.8,
    },
    'UKB 406x178x54': {
      h: 402.6,
      b: 177.7,
      tw: 7.7,
      tf: 10.9,
      r: 10.2,
      A: 68.4,
      Iy: 18700,
      Wpl_y: 1050,
      Wel_y: 930,
      iy: 16.5,
      Iw: 253000,
      It: 23.1,
    },
    'UKB 356x171x67': {
      h: 363.4,
      b: 173.2,
      tw: 9.1,
      tf: 15.7,
      r: 10.2,
      A: 85.5,
      Iy: 19500,
      Wpl_y: 1210,
      Wel_y: 1070,
      iy: 15.1,
      Iw: 270000,
      It: 57.1,
    },
    'UKB 356x171x45': {
      h: 351.4,
      b: 171.1,
      tw: 7.0,
      tf: 9.7,
      r: 10.2,
      A: 57.3,
      Iy: 12100,
      Wpl_y: 775,
      Wel_y: 688,
      iy: 14.5,
      Iw: 153000,
      It: 15.8,
    },
    'UKB 305x165x54': {
      h: 310.4,
      b: 166.9,
      tw: 7.9,
      tf: 13.7,
      r: 8.9,
      A: 68.8,
      Iy: 11700,
      Wpl_y: 846,
      Wel_y: 754,
      iy: 13.0,
      Iw: 117000,
      It: 34.8,
    },
    'UKB 305x165x40': {
      h: 303.4,
      b: 165.0,
      tw: 6.0,
      tf: 10.2,
      r: 8.9,
      A: 51.3,
      Iy: 8503,
      Wpl_y: 623,
      Wel_y: 561,
      iy: 12.9,
      Iw: 85200,
      It: 15.2,
    },
    'UKB 254x146x37': {
      h: 256.3,
      b: 146.4,
      tw: 6.3,
      tf: 10.9,
      r: 7.6,
      A: 47.2,
      Iy: 5540,
      Wpl_y: 484,
      Wel_y: 433,
      iy: 10.8,
      Iw: 44200,
      It: 15.3,
    },
    'UKB 203x133x25': {
      h: 203.2,
      b: 133.2,
      tw: 5.7,
      tf: 7.8,
      r: 7.6,
      A: 32.0,
      Iy: 2340,
      Wpl_y: 258,
      Wel_y: 230,
      iy: 8.56,
      Iw: 14200,
      It: 5.02,
    },
  };

  // Concrete properties — sourced from library (Ecm converted GPa → MPa)
  const CONCRETE_DB: Record<string, { fck: number; Ecm: number }> = {
    'C20/25': { fck: _CONCRETE_LIB['C20/25'].fck, Ecm: _CONCRETE_LIB['C20/25'].Ecm * 1000 },
    'C25/30': { fck: _CONCRETE_LIB['C25/30'].fck, Ecm: _CONCRETE_LIB['C25/30'].Ecm * 1000 },
    'C30/37': { fck: _CONCRETE_LIB['C30/37'].fck, Ecm: _CONCRETE_LIB['C30/37'].Ecm * 1000 },
    'C35/45': { fck: _CONCRETE_LIB['C35/45'].fck, Ecm: _CONCRETE_LIB['C35/45'].Ecm * 1000 },
    'C40/50': { fck: _CONCRETE_LIB['C40/50'].fck, Ecm: _CONCRETE_LIB['C40/50'].Ecm * 1000 },
    'C50/60': { fck: _CONCRETE_LIB['C50/60'].fck, Ecm: _CONCRETE_LIB['C50/60'].Ecm * 1000 },
  };

  // Steel yield strength — sourced from library
  const STEEL_FY: Record<string, number> = {
    S235: _STEEL_LIB.S235.fy,
    S275: _STEEL_LIB.S275.fy,
    S355: _STEEL_LIB.S355.fy,
    S460: _STEEL_LIB.S460.fy,
  };

  // Pure calculation — no UI side-effects, returns results or null
  const runCalculation = useCallback((fd: FormData) => {
    const sec = SECTION_DB[fd.steelSection];
    const conc = CONCRETE_DB[fd.concreteGrade];
    if (!sec || !conc) return null;
    const fy = STEEL_FY[fd.steelGrade] ?? 355;

    const L = parseFloat(fd.span);
    const h_slab = parseFloat(fd.slabThickness);
    const b_eff = parseFloat(fd.slabWidth);
    const w_dead = parseFloat(fd.deadLoad);
    const w_live = parseFloat(fd.liveLoad);
    const n_per_row = parseInt(fd.connectorsPerRow);
    const n_rows = parseInt(fd.connectorRows);
    const d_stud = parseFloat(fd.shearConnectorDiameter);
    const h_stud = parseFloat(fd.shearConnectorHeight);

    if (!L || L <= 0 || !h_slab || h_slab <= 0 || !b_eff || b_eff <= 0) return null;
    if (!n_per_row || n_per_row <= 0 || !n_rows || n_rows <= 0) return null;

    // Partial safety factors (EN 1994-1-1 §2.4)
    const gamma_c = 1.5; // concrete
    const gamma_a = 1.0; // structural steel
    const gamma_v = 1.25; // shear connectors

    try {
      // ------ Steel section properties ------
      const h_w = sec.h - 2 * sec.tf;
      const Av = (h_w * sec.tw) / 100; // cm² → shear area (web only) EN 1993-1-1 §6.2.6

      // ------ Concrete properties ------
      const fcd = (0.85 * conc.fck) / gamma_c; // EN 1992-1-1 §3.1.6
      const Es = 210000; // N/mm²
      const n0 = Es / conc.Ecm; // short-term modular ratio
      const nL = 2 * n0; // long-term modular ratio (EN 1994-1-1 §5.4.2.2)

      // ------ Composite section (transformed) - short term ------
      const b_c = b_eff / n0; // transformed concrete width, mm
      const A_c = (b_c * h_slab) / 100; // cm²  (concrete in steel units)
      const A_comp = sec.A + A_c;

      // Neutral axis from bottom of steel beam
      const y_steel = sec.h / 2; // centroid of steel from bottom
      const y_conc = sec.h + h_slab / 2; // centroid of concrete from bottom of steel
      const y_bar = (sec.A * y_steel + A_c * y_conc) / A_comp; // mm from bottom

      // Second moment of area (parallel axis theorem)
      const I_steel = sec.Iy; // cm⁴
      const I_conc_own = (b_c * Math.pow(h_slab, 3)) / 12 / 10000; // cm⁴
      const I_comp =
        I_steel +
        sec.A * Math.pow((y_bar - y_steel) / 10, 2) +
        I_conc_own +
        A_c * Math.pow((y_conc - y_bar) / 10, 2); // cm⁴

      // Elastic section modulus of composite section
      const W_el_comp = I_comp / (Math.max(y_bar, sec.h + h_slab - y_bar) / 10); // cm³

      // ------ Self-weight ------
      const w_self = (sec.A * 1e-4 * 7850 * 9.81) / 1000; // kN/m (steel self-weight: A cm² → m²)
      const w_slab = (((b_eff / 1000) * h_slab) / 1000) * 25; // kN/m (concrete slab, 25 kN/m³)
      const w_total_dead = w_dead + w_self + w_slab;

      // ------ Design actions EN 1990 §6.4.3.2 ------
      const w_ULS = 1.35 * w_total_dead + 1.5 * w_live; // STR combination
      const w_SLS = w_total_dead + w_live; // Characteristic SLS

      const M_Ed_ULS = (w_ULS * L * L) / 8; // kN·m
      const M_Ed_SLS = (w_SLS * L * L) / 8;
      const V_Ed_ULS = (w_ULS * L) / 2; // kN
      const V_Ed_SLS = (w_SLS * L) / 2;

      // ------ Bending resistance (EN 1994-1-1 §6.2.1) ------
      // Full interaction: plastic resistance of composite section
      const N_a = (sec.A * 100 * fy) / 1000; // kN - force in steel (A in cm² → mm²)
      const N_c = (0.85 * conc.fck * b_eff * h_slab) / 1000 / gamma_c; // kN - concrete compression

      let M_pl_Rd: number;
      if (N_a <= N_c) {
        // PNA in concrete slab
        const x = (N_a * 1000) / ((0.85 * conc.fck * b_eff) / gamma_c); // depth of compression block, mm
        M_pl_Rd = (N_a * (sec.h / 2 + h_slab - x / 2)) / 1000; // kN·m
      } else {
        // PNA in steel section — concrete fully compressed
        // Stress-block method per EN 1994-1-1 §6.2.1.2
        const N_steel_comp = (N_a - N_c) / 2; // kN — compressive force required in steel
        const N_top_flange = (sec.b * sec.tf * fy) / gamma_a / 1000; // kN — capacity of top flange

        if (N_steel_comp <= N_top_flange) {
          // PNA in top flange
          const y_pna = (N_steel_comp * 1000 * gamma_a) / (sec.b * fy); // mm from top of steel
          // Moments about PNA of all stress blocks:
          // Concrete: Nc at (y_pna + h_slab/2) above PNA
          const M_conc = (N_c * (y_pna + h_slab / 2)) / 1000; // kN·m
          // Steel flange above PNA (compression): N_steel_comp at y_pna/2
          const M_flange_comp = (N_steel_comp * (y_pna / 2)) / 1000;
          // Steel flange below PNA (tension): area = b × (tf - y_pna)
          const N_flange_below = (sec.b * (sec.tf - y_pna) * fy) / gamma_a / 1000;
          const M_flange_ten = (N_flange_below * ((sec.tf - y_pna) / 2)) / 1000;
          // Web (tension): area = tw × hw
          const N_web = (sec.tw * h_w * fy) / gamma_a / 1000;
          const M_web = (N_web * (sec.tf - y_pna + h_w / 2)) / 1000;
          // Bottom flange (tension): area = b × tf
          const N_bot_flange = (sec.b * sec.tf * fy) / gamma_a / 1000;
          const M_bot = (N_bot_flange * (sec.h - sec.tf / 2 - y_pna)) / 1000;
          M_pl_Rd = M_conc + M_flange_comp + M_flange_ten + M_web + M_bot;
        } else {
          // PNA in web
          const N_in_web = N_steel_comp - N_top_flange; // kN remaining after top flange
          const y_web = (N_in_web * 1000 * gamma_a) / (sec.tw * fy); // mm below top of web
          const y_pna = sec.tf + y_web; // mm from top of steel
          // Moments about PNA:
          const M_conc = (N_c * (y_pna + h_slab / 2)) / 1000;
          const M_top_flange = (N_top_flange * (y_pna - sec.tf / 2)) / 1000;
          const N_web_comp = (sec.tw * y_web * fy) / gamma_a / 1000;
          const M_web_comp = (N_web_comp * (y_web / 2)) / 1000;
          // Web below PNA (tension)
          const hw_below = h_w - y_web;
          const N_web_ten = (sec.tw * hw_below * fy) / gamma_a / 1000;
          const M_web_ten = (N_web_ten * (hw_below / 2)) / 1000;
          // Bottom flange (tension)
          const N_bot_flange = (sec.b * sec.tf * fy) / gamma_a / 1000;
          const M_bot = (N_bot_flange * (sec.h - sec.tf / 2 - y_pna)) / 1000;
          M_pl_Rd = M_conc + M_top_flange + M_web_comp + M_web_ten + M_bot;
        }
      }

      const bending_util = (M_Ed_ULS / M_pl_Rd) * 100;
      const bending_status = bending_util <= 100 ? 'PASS' : 'FAIL';

      // ------ Shear resistance (EN 1993-1-1 §6.2.6) ------
      const V_pl_Rd = (Av * 100 * (fy / Math.sqrt(3))) / gamma_a / 1000; // kN
      const shear_util = (V_Ed_ULS / V_pl_Rd) * 100;
      const shear_status = shear_util <= 100 ? 'PASS' : 'FAIL';

      // ------ Shear connection (EN 1994-1-1 §6.6.3) ------
      const fu = 450; // N/mm² for 19mm and 22mm headed studs (EN 1994-1-1 §6.6.3.1)
      const alpha_stud = Math.min(1.0, 0.2 * (h_stud / d_stud + 1));
      const P_Rd_1 = (0.8 * fu * Math.PI * d_stud * d_stud) / 4 / gamma_v / 1000; // kN
      const P_Rd_2 =
        (0.29 * alpha_stud * d_stud * d_stud * Math.sqrt(conc.fck * conc.Ecm)) / gamma_v / 1000; // kN (N → kN)
      const P_Rd = Math.min(P_Rd_1, P_Rd_2);
      const n_connectors = n_per_row * n_rows; // total connectors on full beam
      const n_half = n_connectors / 2; // connectors per half-span (EN 1994-1-1 §6.6.1.1)
      const V_Rd_total = n_half * P_Rd; // resistance per half-span
      const V_longitudinal = Math.min(N_a, N_c); // longitudinal shear = min of steel/concrete force
      const shear_conn_util = (V_longitudinal / V_Rd_total) * 100;
      const shear_conn_status = shear_conn_util <= 100 ? 'PASS' : 'FAIL';

      // ------ Deflection (SLS) EN 1994-1-1 §7.3 ------
      // Long-term composite I (using nL for creep)
      const A_c_long = ((b_eff / nL) * h_slab) / 100; // cm² (long-term transformed concrete)
      const A_comp_long = sec.A + A_c_long;
      const y_bar_long = (sec.A * y_steel + A_c_long * y_conc) / A_comp_long; // mm from bottom
      const I_comp_long =
        I_steel +
        sec.A * Math.pow((y_bar_long - y_steel) / 10, 2) +
        ((b_eff / nL) * Math.pow(h_slab, 3)) / 12 / 10000 +
        A_c_long * Math.pow((y_conc - y_bar_long) / 10, 2);

      const delta_dead =
        ((5 * w_total_dead * Math.pow(L, 4)) / ((384 * Es * 1000 * I_comp_long) / 1e8)) * 1000; // mm
      const delta_live =
        ((5 * w_live * Math.pow(L, 4)) / ((384 * Es * 1000 * I_comp) / 1e8)) * 1000; // mm
      const delta_total = delta_dead + delta_live;
      const delta_limit = (L * 1000) / 360; // L/360 for composite beams (EN 1994-1-1 §7.3.1)
      const defl_util = (delta_total / delta_limit) * 100;
      const defl_status = defl_util <= 100 ? 'PASS' : 'FAIL';

      // ------ LTB check (EN 1993-1-1 §6.3.2) ------
      // For construction stage (steel beam alone, no slab yet)
      const L_cr = fd.lateralRestraint === 'restrained' ? L * 0.5 : L; // m
      const G = 81000; // N/mm²
      // Minor axis second moment of area (computed from section geometry)
      const Iz = (2 * sec.tf * Math.pow(sec.b, 3) + h_w * Math.pow(sec.tw, 3)) / 12; // mm⁴
      const Iz_mm4 = Iz; // already in mm⁴
      const It_mm4 = sec.It * 1e4; // cm⁴ → mm⁴
      const Iw_mm6 = sec.Iw * 1e6; // cm⁶ → mm⁶
      const L_cr_mm = L_cr * 1000;
      // M_cr = (π/L) × √(E·Iz·(G·It + π²·E·Iw/L²)) per SN003a / EN 1993-1-1 Annex F
      const M_cr =
        ((Math.PI / L_cr_mm) *
          Math.sqrt(
            Es * Iz_mm4 * G * It_mm4 +
              (Math.pow(Math.PI, 2) * Es * Es * Iz_mm4 * Iw_mm6) / Math.pow(L_cr_mm, 2),
          )) /
        1e6; // N·mm → kN·m

      const lambda_LT = Math.sqrt((sec.Wpl_y * fy) / 1e3 / M_cr);
      const alpha_LT = sec.h / sec.b > 2 ? 0.34 : 0.21; // curve a or b
      const phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT * lambda_LT);
      const chi_LT = Math.min(
        1.0,
        1 / (phi_LT + Math.sqrt(phi_LT * phi_LT - lambda_LT * lambda_LT)),
      );
      const M_b_Rd = (chi_LT * sec.Wpl_y * fy) / gamma_a / 1e3; // kN·m
      const ltb_util = (M_Ed_ULS / M_b_Rd) * 100;
      const ltb_status = ltb_util <= 100 ? 'PASS' : 'FAIL';

      // ------ Build results ------
      const overall =
        bending_status === 'PASS' &&
        shear_status === 'PASS' &&
        shear_conn_status === 'PASS' &&
        defl_status === 'PASS' &&
        ltb_status === 'PASS';

      const recommendations: string[] = [];
      const warnings: string[] = [];
      if (bending_util > 80)
        warnings.push(`High bending utilisation (${bending_util.toFixed(1)}%)`);
      if (ltb_status === 'FAIL')
        recommendations.push(
          'Add lateral restraints to the compression flange during construction',
        );
      if (shear_conn_util > 90) recommendations.push('Increase shear connectors or reduce spacing');
      if (defl_util > 80)
        recommendations.push('Consider increasing section depth or slab thickness');
      if (bending_status === 'FAIL')
        recommendations.push('Select a larger steel section or increase slab depth');

      const calcResults = {
        steel_section_properties: {
          A: sec.A,
          h: sec.h,
          b: sec.b,
          I_y: sec.Iy,
          W_pl_y: sec.Wpl_y,
        },
        concrete_fck: conc.fck,
        concrete_fcd: fcd,
        composite_section_properties: {
          A_comp: Math.round(A_comp * 10) / 10,
          I_comp: Math.round(I_comp),
          W_el_comp: Math.round(W_el_comp),
          y_bar: Math.round(y_bar * 10) / 10,
          modular_ratio: Math.round(n0 * 100) / 100,
        },
        shear_connection_capacity: {
          P_Rd_per_connector: Math.round(P_Rd * 10) / 10,
          n_connectors,
          V_Rd_total: Math.round(V_Rd_total * 10) / 10,
        },
        design_actions: {
          M_Ed_SLS: Math.round(M_Ed_SLS * 10) / 10,
          M_Ed_ULS: Math.round(M_Ed_ULS * 10) / 10,
          V_Ed_SLS: Math.round(V_Ed_SLS * 10) / 10,
          V_Ed_ULS: Math.round(V_Ed_ULS * 10) / 10,
        },
        bending_resistance_check: {
          M_pl_Rd: Math.round(M_pl_Rd * 10) / 10,
          utilisation: Math.round(bending_util * 10) / 10,
          status: bending_status,
        },
        shear_resistance_check: {
          V_pl_Rd: Math.round(V_pl_Rd * 10) / 10,
          utilisation: Math.round(shear_util * 10) / 10,
          status: shear_status,
        },
        shear_connection_check: {
          V_Rd: Math.round(V_Rd_total * 10) / 10,
          utilisation: Math.round(shear_conn_util * 10) / 10,
          status: shear_conn_status,
        },
        deflection_check: {
          delta_actual: Math.round(delta_total * 10) / 10,
          delta_limit: Math.round(delta_limit * 10) / 10,
          utilisation: Math.round(defl_util * 10) / 10,
          status: defl_status,
        },
        lateral_torsional_buckling_check: {
          M_b_Rd: Math.round(M_b_Rd * 10) / 10,
          L_cr,
          utilisation: Math.round(ltb_util * 10) / 10,
          status: ltb_status,
        },
        utilisation_summary: {
          bending: Math.round(bending_util * 10) / 10,
          shear: Math.round(shear_util * 10) / 10,
          shear_connection: Math.round(shear_conn_util * 10) / 10,
          deflection: Math.round(defl_util * 10) / 10,
        },
        overall_check: overall,
        recommendations,
        warnings,
        notes: [
          'Calculations per EN 1994-1-1:2004 (Eurocode 4)',
          `Self-weight: steel ${w_self.toFixed(1)} kN/m + slab ${w_slab.toFixed(1)} kN/m`,
          `Total shear connectors: ${n_connectors} (${n_per_row} x ${n_rows} rows)`,
          `Modular ratio: n₀=${n0.toFixed(2)} (short-term), nL=${nL.toFixed(2)} (long-term)`,
        ],
      };

      return calcResults;
    } catch (err) {
      console.error('Calculation error:', err);
      return null;
    }
  }, []);

  const generateWarnings = (res: any) => {
    const newWarnings: string[] = [];
    if (res.bending_resistance_check.utilisation > 90)
      newWarnings.push('⚠️ High bending utilisation. Consider larger steel section.');
    if (res.deflection_check.utilisation > 100)
      newWarnings.push('⛔ Deflection limit exceeded. Increase section depth or slab thickness.');
    if (res.lateral_torsional_buckling_check?.utilisation > 95)
      newWarnings.push('⚠️ LTB governs. Add lateral restraints during construction.');
    if (res.shear_connection_check.utilisation > 90)
      newWarnings.push('⚠️ High shear connection utilisation. Add more studs.');
    setWarnings(newWarnings);
  };

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
      key: 'slabThickness',
      label: 'Slab Thickness',
      unit: 'mm',
      icon: '⬜',
      description: 'Concrete slab thickness',
    },
    {
      key: 'slabWidth',
      label: 'Slab Width',
      unit: 'mm',
      icon: '↔️',
      description: 'Effective slab width',
    },
    {
      key: 'deadLoad',
      label: 'Dead Load (UDL)',
      unit: 'kN/m',
      icon: '⬇️',
      description: 'Dead load excluding self-weight',
    },
    {
      key: 'liveLoad',
      label: 'Live Load (UDL)',
      unit: 'kN/m',
      icon: '⚡',
      description: 'Live load',
    },
    {
      key: 'connectorsPerRow',
      label: 'Connectors per Row',
      unit: '',
      icon: '🔗',
      description: 'Shear connectors per row',
    },
    {
      key: 'connectorRows',
      label: 'Connector Rows',
      unit: '',
      icon: '📊',
      description: 'Number of connector rows',
    },
    {
      key: 'connectorSpacing',
      label: 'Connector Spacing',
      unit: 'mm',
      icon: '📐',
      description: 'Spacing between rows',
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
            <span className="text-white font-semibold">EN 1994-1-1 | Eurocode 4</span>
          </motion.div>

          <h1 className="text-6xl font-black mb-6">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Composite Beam
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">EN 1994-2 composite beam design</p>

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
              <span className="text-sm">Composite Action</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Shear Connection</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Full Interaction</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">LTB Analysis</span>
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
                {/* Steel Section Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiLayers className="text-neon-cyan" size={24} />
                        </motion.div>
                        <span>Steel Section & Concrete Slab</span>
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
                            {[
                              {
                                label: 'SPAN',
                                field: 'span' as keyof FormData,
                                min: 3,
                                max: 25,
                                step: 0.5,
                                unit: 'm',
                              },
                              {
                                label: 'SLAB THICKNESS',
                                field: 'slabThickness' as keyof FormData,
                                min: 80,
                                max: 300,
                                step: 5,
                                unit: 'mm',
                              },
                              {
                                label: 'SLAB WIDTH',
                                field: 'slabWidth' as keyof FormData,
                                min: 500,
                                max: 4000,
                                step: 50,
                                unit: 'mm',
                              },
                              {
                                label: 'DEAD LOAD',
                                field: 'deadLoad' as keyof FormData,
                                min: 0,
                                max: 50,
                                step: 0.5,
                                unit: 'kN/m',
                              },
                              {
                                label: 'LIVE LOAD',
                                field: 'liveLoad' as keyof FormData,
                                min: 0,
                                max: 50,
                                step: 0.5,
                                unit: 'kN/m',
                              },
                              {
                                label: 'CONNECTOR SPACING',
                                field: 'connectorSpacing' as keyof FormData,
                                min: 100,
                                max: 600,
                                step: 10,
                                unit: 'mm',
                              },
                            ].map((s) => (
                              <div key={s.field} className="space-y-2">
                                <div className="flex justify-between text-xs text-neon-cyan font-mono">
                                  <span>{s.label}</span>
                                  <span>
                                    {formData[s.field]} {s.unit}
                                  </span>
                                </div>
                                <input
                                  title={s.label}
                                  type="range"
                                  min={s.min}
                                  max={s.max}
                                  step={s.step}
                                  value={formData[s.field]}
                                  onChange={(e) => handleInputChange(s.field, e.target.value)}
                                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                                  aria-label={s.label}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🔩</span>
                            <span>Steel Section</span>
                          </label>
                          <select
                            title="Steel Section"
                            value={formData.steelSection}
                            onChange={(e) => handleInputChange('steelSection', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                          >
                            <option value="UKB 610x229x101">UKB 610x229x101</option>
                            <option value="UKB 457x191x67">UKB 457x191x67</option>
                            <option value="UKB 305x165x40">UKB 305x165x40</option>
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
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                          >
                            <option value="C25/30">C25/30 (f_ck = 25 N/mm²)</option>
                            <option value="C30/37">C30/37 (f_ck = 30 N/mm²)</option>
                            <option value="C35/45">C35/45 (f_ck = 35 N/mm²)</option>
                          </select>
                        </div>

                        {inputFields.slice(0, 4).map((field, index) => (
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

                {/* Shear Connection Card */}
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
                          <FiZap className="text-neon-cyan" size={24} />
                        </motion.div>
                        <span>Shear Connection</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                            <span className="text-xl">🔧</span>
                            <span>Connector Type</span>
                          </label>
                          <select
                            title="Connector Type"
                            value={formData.shearConnectorType}
                            onChange={(e) =>
                              handleInputChange('shearConnectorType', e.target.value)
                            }
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                          >
                            <option value="stud">Stud Connector</option>
                            <option value="perfobond">Perfobond Connector</option>
                            <option value="channel">Channel Connector</option>
                          </select>
                        </div>

                        {inputFields.slice(4).map((field, index) => (
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
                      <CompositeBeam3D
                        span={parseFloat(formData.span) || 12}
                        steelDepth={SECTION_DB[formData.steelSection]?.h || 603}
                        flangeWidth={SECTION_DB[formData.steelSection]?.b || 228}
                        webThickness={SECTION_DB[formData.steelSection]?.tw || 10.5}
                        flangeThickness={SECTION_DB[formData.steelSection]?.tf || 14.8}
                        slabThickness={parseFloat(formData.slabThickness) || 150}
                        slabWidth={parseFloat(formData.slabWidth) || 2000}
                        udl={
                          (parseFloat(formData.deadLoad) || 0) +
                          (parseFloat(formData.liveLoad) || 0)
                        }
                        connectorCount={
                          parseInt(formData.connectorsPerRow || '2') *
                          parseInt(formData.connectorRows || '10')
                        }
                        connectorSpacing={parseFloat(formData.connectorSpacing) || 300}
                        neutralAxisY={results?.composite_section_properties?.y_bar}
                        utilisation={
                          results
                            ? Math.max(
                                results.bending_resistance_check?.utilisation || 0,
                                results.shear_resistance_check?.utilisation || 0,
                                results.shear_connection_check?.utilisation || 0,
                                results.deflection_check?.utilisation || 0,
                                results.lateral_torsional_buckling_check?.utilisation || 0,
                              )
                            : 0
                        }
                        status={
                          results
                            ? results.bending_resistance_check?.status === 'FAIL' ||
                              results.shear_resistance_check?.status === 'FAIL' ||
                              results.shear_connection_check?.status === 'FAIL' ||
                              results.deflection_check?.status === 'FAIL' ||
                              results.lateral_torsional_buckling_check?.status === 'FAIL'
                              ? 'FAIL'
                              : 'PASS'
                            : 'PASS'
                        }
                        steelGrade={formData.steelGrade}
                        concreteGrade={formData.concreteGrade}
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
                      COMPOSITE BEAM — REAL-TIME PREVIEW
                    </div>
                  </div>

                  {/* Right sidebar — live parameters & stats */}
                  <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                    <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                      <FiSliders size={14} /> Live Parameters
                    </h3>
                    {[
                      {
                        label: 'Span',
                        field: 'span' as keyof FormData,
                        min: 3,
                        max: 25,
                        step: 0.5,
                        unit: 'm',
                      },
                      {
                        label: 'Slab Thickness',
                        field: 'slabThickness' as keyof FormData,
                        min: 80,
                        max: 300,
                        step: 5,
                        unit: 'mm',
                      },
                      {
                        label: 'Slab Width',
                        field: 'slabWidth' as keyof FormData,
                        min: 500,
                        max: 4000,
                        step: 50,
                        unit: 'mm',
                      },
                      {
                        label: 'Dead Load',
                        field: 'deadLoad' as keyof FormData,
                        min: 0,
                        max: 50,
                        step: 0.5,
                        unit: 'kN/m',
                      },
                      {
                        label: 'Live Load',
                        field: 'liveLoad' as keyof FormData,
                        min: 0,
                        max: 50,
                        step: 0.5,
                        unit: 'kN/m',
                      },
                      {
                        label: 'Connectors/Row',
                        field: 'connectorsPerRow' as keyof FormData,
                        min: 1,
                        max: 4,
                        step: 1,
                        unit: '',
                      },
                      {
                        label: 'Connector Rows',
                        field: 'connectorRows' as keyof FormData,
                        min: 2,
                        max: 40,
                        step: 1,
                        unit: '',
                      },
                      {
                        label: 'Connector Spacing',
                        field: 'connectorSpacing' as keyof FormData,
                        min: 100,
                        max: 600,
                        step: 10,
                        unit: 'mm',
                      },
                    ].map((s) => (
                      <div key={s.field} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-gray-400">{s.label}</span>
                          <span className="text-white">
                            {formData[s.field]} {s.unit}
                          </span>
                        </div>
                        <input
                          title={s.label}
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={formData[s.field]}
                          onChange={(e) => handleInputChange(s.field, e.target.value)}
                          className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                          aria-label={s.label}
                        />
                      </div>
                    ))}

                    <div className="border-t border-gray-700 pt-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                        <FiActivity size={14} /> Live Readout
                      </h3>
                      {[
                        {
                          label: 'Total Depth',
                          value: `${(SECTION_DB[formData.steelSection]?.h || 0) + (parseFloat(formData.slabThickness) || 0)} mm`,
                        },
                        { label: 'Steel Section', value: formData.steelSection },
                        {
                          label: 'Total UDL',
                          value: `${((parseFloat(formData.deadLoad) || 0) + (parseFloat(formData.liveLoad) || 0)).toFixed(1)} kN/m`,
                        },
                        { label: 'Concrete', value: formData.concreteGrade },
                        { label: 'Steel Grade', value: formData.steelGrade },
                        {
                          label: 'Connectors',
                          value: `${parseInt(formData.connectorsPerRow || '0') * parseInt(formData.connectorRows || '0')}`,
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
                              util: results.bending_resistance_check?.utilisation,
                              status: results.bending_resistance_check?.status,
                            },
                            {
                              label: 'Shear',
                              util: results.shear_resistance_check?.utilisation,
                              status: results.shear_resistance_check?.status,
                            },
                            {
                              label: 'Shear Conn.',
                              util: results.shear_connection_check?.utilisation,
                              status: results.shear_connection_check?.status,
                            },
                            {
                              label: 'Deflection',
                              util: results.deflection_check?.utilisation,
                              status: results.deflection_check?.status,
                            },
                            {
                              label: 'LTB',
                              util: results.lateral_torsional_buckling_check?.utilisation,
                              status: results.lateral_torsional_buckling_check?.status,
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
                    title="Composite Beam — 3D Preview"
                    sliders={whatIfSliders}
                    form={formData}
                    updateForm={handleInputChange}
                    status={
                      (results
                        ? results.bending_resistance_check?.status === 'FAIL' ||
                          results.shear_resistance_check?.status === 'FAIL' ||
                          results.shear_connection_check?.status === 'FAIL' ||
                          results.deflection_check?.status === 'FAIL' ||
                          results.lateral_torsional_buckling_check?.status === 'FAIL'
                          ? 'FAIL'
                          : 'PASS'
                        : undefined) as 'PASS' | 'FAIL' | undefined
                    }
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[6, 4, 6]}>
                        <CompositeBeam3D
                          span={parseFloat(formData.span) || 12}
                          steelDepth={SECTION_DB[formData.steelSection]?.h || 603}
                          flangeWidth={SECTION_DB[formData.steelSection]?.b || 228}
                          webThickness={SECTION_DB[formData.steelSection]?.tw || 10.5}
                          flangeThickness={SECTION_DB[formData.steelSection]?.tf || 14.8}
                          slabThickness={parseFloat(formData.slabThickness) || 150}
                          slabWidth={parseFloat(formData.slabWidth) || 2000}
                          udl={
                            (parseFloat(formData.deadLoad) || 0) +
                            (parseFloat(formData.liveLoad) || 0)
                          }
                          connectorCount={
                            parseInt(formData.connectorsPerRow || '2') *
                            parseInt(formData.connectorRows || '10')
                          }
                          connectorSpacing={parseFloat(formData.connectorSpacing) || 300}
                          neutralAxisY={results?.composite_section_properties?.y_bar}
                          utilisation={
                            results
                              ? Math.max(
                                  results.bending_resistance_check?.utilisation || 0,
                                  results.shear_resistance_check?.utilisation || 0,
                                  results.shear_connection_check?.utilisation || 0,
                                  results.deflection_check?.utilisation || 0,
                                  results.lateral_torsional_buckling_check?.utilisation || 0,
                                )
                              : 0
                          }
                          status={
                            results
                              ? results.bending_resistance_check?.status === 'FAIL' ||
                                results.shear_resistance_check?.status === 'FAIL' ||
                                results.shear_connection_check?.status === 'FAIL' ||
                                results.deflection_check?.status === 'FAIL' ||
                                results.lateral_torsional_buckling_check?.status === 'FAIL'
                                ? 'FAIL'
                                : 'PASS'
                              : 'PASS'
                          }
                          steelGrade={formData.steelGrade}
                          concreteGrade={formData.concreteGrade}
                        />
                      </Interactive3DDiagram>
                    )}
                  />

                  {/* Quick Stats Card */}
                  <Card variant="glass" className="border-neon-cyan/30 overflow-hidden mt-4">
                    <CardContent className="p-0">
                      <div className="p-4 space-y-2 bg-gray-900/50">
                        {[
                          {
                            label: 'Total Depth',
                            value: `${(SECTION_DB[formData.steelSection]?.h || 0) + (parseFloat(formData.slabThickness) || 0)} mm`,
                          },
                          { label: 'Section', value: formData.steelSection },
                          {
                            label: 'Slab',
                            value: `${formData.slabThickness} × ${formData.slabWidth} mm`,
                          },
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
                                util: results.bending_resistance_check?.utilisation || 0,
                                status: results.bending_resistance_check?.status,
                              },
                              {
                                label: 'Shear',
                                util: results.shear_resistance_check?.utilisation || 0,
                                status: results.shear_resistance_check?.status,
                              },
                              {
                                label: 'Shear Conn.',
                                util: results.shear_connection_check?.utilisation || 0,
                                status: results.shear_connection_check?.status,
                              },
                              {
                                label: 'Deflection',
                                util: results.deflection_check?.utilisation || 0,
                                status: results.deflection_check?.status,
                              },
                              {
                                label: 'LTB',
                                util: results.lateral_torsional_buckling_check?.utilisation || 0,
                                status: results.lateral_torsional_buckling_check?.status,
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
                      </div>
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

              {/* Summary Cards — border-l-4 */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Bending',
                    util: results.bending_resistance_check?.utilisation || 0,
                    status: results.bending_resistance_check?.status,
                    capacity: `${results.bending_resistance_check?.M_pl_Rd} kN·m`,
                  },
                  {
                    label: 'Shear',
                    util: results.shear_resistance_check?.utilisation || 0,
                    status: results.shear_resistance_check?.status,
                    capacity: `${results.shear_resistance_check?.V_pl_Rd} kN`,
                  },
                  {
                    label: 'Shear Conn.',
                    util: results.shear_connection_check?.utilisation || 0,
                    status: results.shear_connection_check?.status,
                    capacity: `${results.shear_connection_check?.V_Rd} kN`,
                  },
                  {
                    label: 'Deflection',
                    util: results.deflection_check?.utilisation || 0,
                    status: results.deflection_check?.status,
                    capacity: `${results.deflection_check?.delta_actual} / ${results.deflection_check?.delta_limit} mm`,
                  },
                ].map((c) => (
                  <motion.div
                    key={c.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-4 rounded-xl bg-gray-900/60 border-l-4',
                      c.status === 'PASS' ? 'border-green-500' : 'border-red-500',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white">{c.label}</span>
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center',
                          c.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {c.status === 'PASS' ? (
                          <FiCheck size={14} />
                        ) : (
                          <FiAlertTriangle size={14} />
                        )}
                      </div>
                    </div>
                    <p
                      className={cn(
                        'text-2xl font-black',
                        c.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                      )}
                    >
                      {c.util}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{c.capacity}</p>
                  </motion.div>
                ))}
              </div>

              {/* Composite Section Properties */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="text-neon-cyan" size={24} />
                    </motion.div>
                    <span>Composite Section Properties</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Steel Area (A_a)</p>
                      <p className="text-2xl font-bold text-white">
                        {results.steel_section_properties.A} cm²
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">
                        Concrete Area (A_c,eff)
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {(
                          results.composite_section_properties.A_comp -
                          results.steel_section_properties.A
                        ).toFixed(1)}{' '}
                        cm²
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">Total Area (A_comp)</p>
                      <p className="text-2xl font-bold text-white">
                        {results.composite_section_properties.A_comp} cm²
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">I_comp</p>
                      <p className="text-2xl font-bold text-white">
                        {results.composite_section_properties.I_comp} cm⁴
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">W_el,comp</p>
                      <p className="text-2xl font-bold text-white">
                        {results.composite_section_properties.W_el_comp} cm³
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Design Actions */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiActivity className="text-neon-cyan" size={24} />
                    </motion.div>
                    <span>Design Actions (EN 1990)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">
                        M<sub>Ed,SLS</sub>
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {results.design_actions.M_Ed_SLS} kN·m
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/50">
                      <p className="text-gray-300 text-xs uppercase mb-2">
                        M<sub>Ed,ULS</sub>
                      </p>
                      <p className="text-2xl font-bold text-purple-300">
                        {results.design_actions.M_Ed_ULS} kN·m
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                      <p className="text-gray-400 text-xs uppercase mb-2">
                        V<sub>Ed,SLS</sub>
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {results.design_actions.V_Ed_SLS} kN
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/50">
                      <p className="text-gray-300 text-xs uppercase mb-2">
                        V<sub>Ed,ULS</sub>
                      </p>
                      <p className="text-2xl font-bold text-purple-300">
                        {results.design_actions.V_Ed_ULS} kN
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Check Results Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Bending Resistance */}
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
                      <CardTitle className="text-2xl text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span>Bending Resistance (6.2.5)</span>
                          {results.bending_resistance_check.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  {getRecommendation(
                                    'bendingResistance',
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
                        <span className="text-gray-400">
                          M<sub>c,Rd</sub>
                        </span>
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

                {/* Shear Resistance */}
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
                      <CardTitle className="text-2xl text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span>Shear Resistance (6.2.6)</span>
                          {results.shear_resistance_check.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  {getRecommendation(
                                    'shearResistance',
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
                        <span className="text-gray-400">
                          V<sub>pl,Rd</sub>
                        </span>
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

                {/* Shear Connection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'border-2 shadow-lg',
                      results.shear_connection_check.status === 'PASS'
                        ? 'border-green-500/50'
                        : 'border-red-500/50',
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span>Shear Connection (6.6.3)</span>
                          {results.shear_connection_check.status === 'FAIL' && (
                            <div className="group relative">
                              <FiInfo className="text-orange-400 cursor-help" size={18} />
                              <div className="absolute left-0 top-8 w-80 p-3 bg-gray-900 border border-orange-400 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                <p className="text-xs text-orange-300 font-semibold mb-1">
                                  💡 How to fix this:
                                </p>
                                <p className="text-xs text-gray-300">
                                  {getRecommendation(
                                    'shearConnection',
                                    parseFloat(results.shear_connection_check.utilisation),
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
                            results.shear_connection_check.status === 'PASS'
                              ? 'bg-green-500'
                              : 'bg-red-500',
                          )}
                        >
                          {results.shear_connection_check.status === 'PASS' ? (
                            <FiCheck size={24} />
                          ) : (
                            <FiAlertTriangle size={24} />
                          )}
                        </motion.div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">
                          V<sub>Rd</sub>
                        </span>
                        <span className="text-white font-bold">
                          {results.shear_connection_check.V_Rd} kN
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Utilisation</span>
                          <span
                            className={cn(
                              'font-bold',
                              results.shear_connection_check.status === 'PASS'
                                ? 'text-green-400'
                                : 'text-red-400',
                            )}
                          >
                            {results.shear_connection_check.utilisation}%
                          </span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(results.shear_connection_check.utilisation, 100)}%`,
                            }}
                            transition={{ duration: 1, delay: 0.7 }}
                            className={cn(
                              'h-full rounded-full',
                              results.shear_connection_check.status === 'PASS'
                                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                : 'bg-gradient-to-r from-red-500 to-orange-500',
                            )}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          'mt-4 px-3 py-2 rounded-lg text-center font-bold text-sm',
                          results.shear_connection_check.status === 'PASS'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.shear_connection_check.status}
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
                      <CardTitle className="text-2xl text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
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
              </div>

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
                    calculatorKey="composite_beam"
                    inputs={formData as unknown as Record<string, string>}
                    results={results}
                    status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    summary={results ? `${results.max_util?.toFixed(1) || '-'}% util` : undefined}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─────── Visualization Tab ─────── */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Full-width 3D Scene */}
              <Card variant="glass" className="border-neon-cyan/30 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10">
                  <CardTitle className="text-lg text-white flex items-center gap-3">
                    <FiEye className="text-neon-cyan" />
                    <span>3D Interactive Model</span>
                    <span className="ml-auto text-xs text-gray-500 font-mono">
                      Orbit • Zoom • Pan
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Interactive3DDiagram height="h-[500px]" cameraPosition={[8, 5, 8]}>
                    <CompositeBeam3D
                      span={parseFloat(formData.span) || 12}
                      steelDepth={SECTION_DB[formData.steelSection]?.h || 603}
                      flangeWidth={SECTION_DB[formData.steelSection]?.b || 228}
                      webThickness={SECTION_DB[formData.steelSection]?.tw || 10.5}
                      flangeThickness={SECTION_DB[formData.steelSection]?.tf || 14.8}
                      slabThickness={parseFloat(formData.slabThickness) || 150}
                      slabWidth={parseFloat(formData.slabWidth) || 2000}
                      udl={
                        (parseFloat(formData.deadLoad) || 0) + (parseFloat(formData.liveLoad) || 0)
                      }
                      connectorCount={
                        parseInt(formData.connectorsPerRow || '2') *
                        parseInt(formData.connectorRows || '10')
                      }
                      connectorSpacing={parseFloat(formData.connectorSpacing) || 300}
                      neutralAxisY={results?.composite_section_properties?.y_bar}
                      utilisation={Math.max(
                        results.bending_resistance_check?.utilisation || 0,
                        results.shear_resistance_check?.utilisation || 0,
                        results.shear_connection_check?.utilisation || 0,
                        results.deflection_check?.utilisation || 0,
                        results.lateral_torsional_buckling_check?.utilisation || 0,
                      )}
                      status={
                        results.bending_resistance_check?.status === 'FAIL' ||
                        results.shear_resistance_check?.status === 'FAIL' ||
                        results.shear_connection_check?.status === 'FAIL' ||
                        results.deflection_check?.status === 'FAIL' ||
                        results.lateral_torsional_buckling_check?.status === 'FAIL'
                          ? 'FAIL'
                          : 'PASS'
                      }
                      steelGrade={formData.steelGrade}
                      concreteGrade={formData.concreteGrade}
                    />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>

              {/* Engineering Dashboard — 4-column grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Overall Status */}
                <Card
                  variant="glass"
                  className={cn(
                    'border',
                    results.overall_check ? 'border-green-500/40' : 'border-red-500/40',
                  )}
                >
                  <CardContent className="p-5 text-center">
                    <div
                      className={cn(
                        'text-5xl font-black mb-2',
                        results.overall_check ? 'text-green-400' : 'text-red-400',
                      )}
                    >
                      {results.overall_check ? 'PASS' : 'FAIL'}
                    </div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider">
                      Overall Verdict
                    </p>
                    <div className="mt-3 text-xs text-gray-500">
                      {(() => {
                        const checks = [
                          {
                            label: 'Bending',
                            util: results.bending_resistance_check?.utilisation || 0,
                          },
                          {
                            label: 'Shear',
                            util: results.shear_resistance_check?.utilisation || 0,
                          },
                          {
                            label: 'Shear Conn.',
                            util: results.shear_connection_check?.utilisation || 0,
                          },
                          { label: 'Deflection', util: results.deflection_check?.utilisation || 0 },
                          {
                            label: 'LTB',
                            util: results.lateral_torsional_buckling_check?.utilisation || 0,
                          },
                        ];
                        const gov = checks.reduce((a, b) => (b.util > a.util ? b : a), checks[0]);
                        return (
                          <span>
                            Governing:{' '}
                            <span className="text-white font-bold">
                              {gov.label} ({gov.util}%)
                            </span>
                          </span>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Design Actions */}
                <Card variant="glass" className="border-gray-700/50">
                  <CardContent className="p-5">
                    <p className="text-xs font-bold text-neon-cyan uppercase tracking-wider mb-3">
                      Design Actions
                    </p>
                    {[
                      { label: 'M_Ed (ULS)', value: `${results.design_actions?.M_Ed_ULS} kN·m` },
                      { label: 'V_Ed (ULS)', value: `${results.design_actions?.V_Ed_ULS} kN` },
                      { label: 'M_Ed (SLS)', value: `${results.design_actions?.M_Ed_SLS} kN·m` },
                      { label: 'V_Ed (SLS)', value: `${results.design_actions?.V_Ed_SLS} kN` },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                      >
                        <span className="text-gray-500 font-mono">{item.label}</span>
                        <span className="text-white font-bold">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Composite Properties */}
                <Card variant="glass" className="border-gray-700/50">
                  <CardContent className="p-5">
                    <p className="text-xs font-bold text-neon-purple uppercase tracking-wider mb-3">
                      Section Properties
                    </p>
                    {[
                      {
                        label: 'A_comp',
                        value: `${results.composite_section_properties?.A_comp} cm²`,
                      },
                      {
                        label: 'I_comp',
                        value: `${results.composite_section_properties?.I_comp} cm⁴`,
                      },
                      {
                        label: 'ȳ (NA)',
                        value: `${results.composite_section_properties?.y_bar} mm`,
                      },
                      {
                        label: 'n₀ (mod. ratio)',
                        value: `${results.composite_section_properties?.modular_ratio}`,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                      >
                        <span className="text-gray-500 font-mono">{item.label}</span>
                        <span className="text-white font-bold">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Shear Connection */}
                <Card variant="glass" className="border-gray-700/50">
                  <CardContent className="p-5">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
                      Shear Connection
                    </p>
                    {(() => {
                      const vRdTotal = results.shear_connection_capacity?.V_Rd_total || 0;
                      const Na =
                        ((SECTION_DB[formData.steelSection]?.A || 1) *
                          100 *
                          (STEEL_FY[formData.steelGrade] || 355)) /
                        1000;
                      const Nc =
                        (0.85 *
                          (CONCRETE_DB[formData.concreteGrade]?.fck || 30) *
                          parseFloat(formData.slabWidth || '2000') *
                          parseFloat(formData.slabThickness || '150')) /
                        1000 /
                        1.5;
                      const degreeEta = Math.min(
                        100,
                        Math.round((vRdTotal / (Math.min(Na, Nc) || 1)) * 100),
                      );
                      return [
                        {
                          label: 'P_Rd / stud',
                          value: `${results.shear_connection_capacity?.P_Rd_per_connector} kN`,
                        },
                        {
                          label: 'Total studs',
                          value: `${results.shear_connection_capacity?.n_connectors}`,
                        },
                        { label: 'Total V_Rd', value: `${vRdTotal} kN` },
                        { label: 'Degree η', value: `${degreeEta}%` },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                        >
                          <span className="text-gray-500 font-mono">{item.label}</span>
                          <span className="text-white font-bold">{item.value}</span>
                        </div>
                      ));
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Utilisation Bars — visual summary of all 5 checks */}
              <Card variant="glass" className="border-neon-cyan/20">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <FiActivity className="text-neon-cyan" />
                    <span>Utilisation Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      label: 'Bending Resistance',
                      clause: 'EN 1994-1-1 §6.2.1',
                      util: results.bending_resistance_check?.utilisation || 0,
                      status: results.bending_resistance_check?.status,
                      capacity: `M_pl,Rd = ${results.bending_resistance_check?.M_pl_Rd} kN·m`,
                    },
                    {
                      label: 'Shear Resistance',
                      clause: 'EN 1993-1-1 §6.2.6',
                      util: results.shear_resistance_check?.utilisation || 0,
                      status: results.shear_resistance_check?.status,
                      capacity: `V_pl,Rd = ${results.shear_resistance_check?.V_pl_Rd} kN`,
                    },
                    {
                      label: 'Shear Connection',
                      clause: 'EN 1994-1-1 §6.6.3',
                      util: results.shear_connection_check?.utilisation || 0,
                      status: results.shear_connection_check?.status,
                      capacity: `V_Rd = ${results.shear_connection_check?.V_Rd} kN`,
                    },
                    {
                      label: 'Deflection (SLS)',
                      clause: 'EN 1994-1-1 §7.3',
                      util: results.deflection_check?.utilisation || 0,
                      status: results.deflection_check?.status,
                      capacity: `δ_limit = ${results.deflection_check?.delta_limit} mm`,
                    },
                    {
                      label: 'LTB (Construction)',
                      clause: 'EN 1993-1-1 §6.3.2',
                      util: results.lateral_torsional_buckling_check?.utilisation || 0,
                      status: results.lateral_torsional_buckling_check?.status,
                      capacity: `M_b,Rd = ${results.lateral_torsional_buckling_check?.M_b_Rd} kN·m`,
                    },
                  ].map((check) => (
                    <div key={check.label} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm text-white font-semibold">{check.label}</span>
                          <span className="ml-2 text-xs text-gray-500 font-mono">
                            {check.clause}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 font-mono">{check.capacity}</span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-black',
                              check.status === 'PASS'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400',
                            )}
                          >
                            {check.util}% — {check.status}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(check.util, 100)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={cn(
                            'h-full rounded-full',
                            check.util > 100
                              ? 'bg-red-500'
                              : check.util > 80
                                ? 'bg-orange-500'
                                : 'bg-gradient-to-r from-neon-cyan to-neon-blue',
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Notes & Recommendations */}
              <div className="grid md:grid-cols-2 gap-4">
                {results.notes?.length > 0 && (
                  <Card variant="glass" className="border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <FiInfo className="text-neon-cyan" /> Calculation Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {results.notes.map((note: string, i: number) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-neon-cyan mt-0.5">•</span> {note}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {(results.recommendations?.length > 0 || results.warnings?.length > 0) && (
                  <Card variant="glass" className="border-orange-500/30">
                    <CardHeader>
                      <CardTitle className="text-sm text-white flex items-center gap-2">
                        <FiAlertTriangle className="text-orange-400" /> Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {[...(results.recommendations || []), ...(results.warnings || [])].map(
                          (r: string, i: number) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                              <span className="text-orange-400 mt-0.5">⚠</span> {r}
                            </li>
                          ),
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Export */}
              <div className="flex justify-center gap-3">
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
                  calculatorKey="composite_beam"
                  inputs={formData as unknown as Record<string, string>}
                  results={results}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  summary={results ? `${results.max_util?.toFixed(1) || '-'}% util` : undefined}
                />
              </div>
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

export default CompositeBeam;
