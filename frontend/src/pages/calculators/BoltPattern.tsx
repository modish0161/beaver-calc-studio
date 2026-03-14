// =============================================================================
// Bolt Pattern Calculator — Premium Edition
// Bolt Group Analysis — Geometric Properties & Polar Moment of Inertia
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiCircle,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMaximize2,
  FiMinimize2,
  FiSettings,
  FiSliders,
  FiTarget,
  FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import BoltPattern3D from '../../components/3d/scenes/BoltPattern3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { BOLT_DIMENSIONS } from '../../data/boltData';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Pattern Configuration
  pattern_type: string;
  num_bolts_x: string;
  num_bolts_y: string;
  // Spacing
  pitch: string;
  gauge: string;
  // Edge Distances
  edge_x1: string;
  edge_x2: string;
  edge_y1: string;
  edge_y2: string;
  // Bolt Properties
  bolt_diameter: string;
  hole_diameter: string;
  // Applied Loads (for reference)
  applied_shear: string;
  applied_moment: string;
  // Project
  projectName: string;
  reference: string;
}

interface BoltCoordinate {
  x: number;
  y: number;
  id: number;
}

interface Results {
  // Pattern Properties
  total_bolts: number;
  pattern_width: number;
  pattern_height: number;
  plate_width: number;
  plate_height: number;
  // Centroid
  centroid_x: number;
  centroid_y: number;
  // Moments of Inertia
  Ix: number;
  Iy: number;
  Ip: number;
  // Bolt coordinates
  bolt_positions: BoltCoordinate[];
  // Maximum distances
  r_max: number;
  r_min: number;
  // Load distribution (if loads provided)
  max_shear_direct: number;
  max_shear_torsion: number;
  max_shear_total: number;
  // Status
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const PATTERN_TYPES: Record<string, { name: string; description: string }> = {
  rectangular: { name: 'Rectangular Grid', description: 'Standard rectangular pattern' },
  single_row: { name: 'Single Row', description: 'Bolts in a single horizontal row' },
  single_column: { name: 'Single Column', description: 'Bolts in a single vertical column' },
  staggered: { name: 'Staggered', description: 'Offset rows for closer spacing' },
  circular: { name: 'Circular', description: 'Bolts arranged in a circle' },
};

const BOLT_DIAMETERS: Record<string, { d: number; As: number; hole: number }> = Object.fromEntries(
  Object.entries(BOLT_DIMENSIONS).map(([k, v]) => [k, { d: v.d, As: v.As, hole: v.d0 }]),
);

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  splice_4bolt: {
    name: '4-Bolt Splice',
    form: {
      pattern_type: 'rectangular',
      num_bolts_x: '2',
      num_bolts_y: '2',
      pitch: '80',
      gauge: '60',
      edge_x1: '40',
      edge_x2: '40',
      edge_y1: '40',
      edge_y2: '40',
      bolt_diameter: 'M20',
    },
  },
  splice_6bolt: {
    name: '6-Bolt Splice',
    form: {
      pattern_type: 'rectangular',
      num_bolts_x: '2',
      num_bolts_y: '3',
      pitch: '70',
      gauge: '60',
      edge_x1: '35',
      edge_x2: '35',
      edge_y1: '40',
      edge_y2: '40',
      bolt_diameter: 'M20',
    },
  },
  base_plate_4bolt: {
    name: 'Base Plate (4)',
    form: {
      pattern_type: 'rectangular',
      num_bolts_x: '2',
      num_bolts_y: '2',
      pitch: '200',
      gauge: '200',
      edge_x1: '75',
      edge_x2: '75',
      edge_y1: '75',
      edge_y2: '75',
      bolt_diameter: 'M24',
    },
  },
  base_plate_8bolt: {
    name: 'Base Plate (8)',
    form: {
      pattern_type: 'rectangular',
      num_bolts_x: '2',
      num_bolts_y: '4',
      pitch: '100',
      gauge: '250',
      edge_x1: '100',
      edge_x2: '100',
      edge_y1: '75',
      edge_y2: '75',
      bolt_diameter: 'M30',
    },
  },
  flange_single: {
    name: 'Single Row Flange',
    form: {
      pattern_type: 'single_row',
      num_bolts_x: '4',
      num_bolts_y: '1',
      pitch: '70',
      gauge: '0',
      edge_x1: '35',
      edge_x2: '35',
      edge_y1: '35',
      edge_y2: '35',
      bolt_diameter: 'M16',
    },
  },
};

// =============================================================================
// BOLT PATTERN CALCULATOR COMPONENT
// =============================================================================

const BoltPattern: React.FC = () => {
  const [form, setForm] = useState<FormData>({
    pattern_type: 'rectangular',
    num_bolts_x: '2',
    num_bolts_y: '2',
    pitch: '80',
    gauge: '60',
    edge_x1: '40',
    edge_x2: '40',
    edge_y1: '40',
    edge_y2: '40',
    bolt_diameter: 'M20',
    hole_diameter: '22',
    applied_shear: '0',
    applied_moment: '0',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'num_bolts_x', label: 'Num Bolts X' },
      { key: 'num_bolts_y', label: 'Num Bolts Y' },
      { key: 'pitch', label: 'Pitch' },
      { key: 'gauge', label: 'Gauge' },
      { key: 'edge_x1', label: 'Edge X1' },
      { key: 'edge_x2', label: 'Edge X2' },
      { key: 'edge_y1', label: 'Edge Y1' },
      { key: 'edge_y2', label: 'Edge Y2' },
      { key: 'hole_diameter', label: 'Hole Diameter' },
      { key: 'applied_shear', label: 'Applied Shear' },
      { key: 'applied_moment', label: 'Applied Moment' },
    ]);
    if (errs.length > 0) {
      alert(errs.join('\n'));
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'pattern_type', label: 'Pattern_type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'num_bolts_x', label: 'Num_bolts_x', min: 0, max: 100, step: 1, unit: '' },
    { key: 'num_bolts_y', label: 'Num_bolts_y', min: 0, max: 100, step: 1, unit: '' },
    { key: 'pitch', label: 'Pitch', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pattern: true,
    edges: false,
    loads: false,
    project: false,
  });
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateForm = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (preset) {
      setForm((prev) => ({ ...prev, ...preset.form }));
    }
  };

  // Generate bolt positions
  const generateBoltPositions = useCallback((): BoltCoordinate[] => {
    const nx = parseInt(form.num_bolts_x) || 2;
    const ny = parseInt(form.num_bolts_y) || 2;
    const px = parseFloat(form.pitch) || 80;
    const gy = parseFloat(form.gauge) || 60;
    const bolts: BoltCoordinate[] = [];
    let id = 0;

    if (form.pattern_type === 'circular') {
      const r = px;
      for (let i = 0; i < nx; i++) {
        const angle = (2 * Math.PI * i) / nx;
        bolts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle), id: id++ });
      }
    } else if (form.pattern_type === 'single_row') {
      for (let i = 0; i < nx; i++) {
        bolts.push({ x: i * px, y: 0, id: id++ });
      }
    } else if (form.pattern_type === 'single_column') {
      for (let i = 0; i < ny; i++) {
        bolts.push({ x: 0, y: i * gy, id: id++ });
      }
    } else if (form.pattern_type === 'staggered') {
      for (let j = 0; j < ny; j++) {
        const offset = j % 2 === 1 ? px / 2 : 0;
        for (let i = 0; i < nx; i++) {
          bolts.push({ x: i * px + offset, y: j * gy, id: id++ });
        }
      }
    } else {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          bolts.push({ x: i * px, y: j * gy, id: id++ });
        }
      }
    }
    return bolts;
  }, [form]);

  // Run calculation
  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setTimeout(() => {
      const bolts = generateBoltPositions();
      const n = bolts.length;
      if (n === 0) {
        setIsCalculating(false);
        return;
      }

      // Centroid
      const cx = bolts.reduce((sum, b) => sum + b.x, 0) / n;
      const cy = bolts.reduce((sum, b) => sum + b.y, 0) / n;

      // Moments of inertia about centroid
      const Ix = bolts.reduce((sum, b) => sum + (b.y - cy) ** 2, 0);
      const Iy = bolts.reduce((sum, b) => sum + (b.x - cx) ** 2, 0);
      const Ip = Ix + Iy;

      // Radii
      const radii = bolts.map((b) => Math.sqrt((b.x - cx) ** 2 + (b.y - cy) ** 2));
      const rMax = Math.max(...radii);
      const rMin = Math.min(...radii);

      // Pattern dimensions
      const xs = bolts.map((b) => b.x);
      const ys = bolts.map((b) => b.y);
      const patW = Math.max(...xs) - Math.min(...xs);
      const patH = Math.max(...ys) - Math.min(...ys);

      const e1 = parseFloat(form.edge_x1) || 40;
      const e2 = parseFloat(form.edge_x2) || 40;
      const e3 = parseFloat(form.edge_y1) || 40;
      const e4 = parseFloat(form.edge_y2) || 40;
      const plateW = patW + e1 + e2;
      const plateH = patH + e3 + e4;

      // Load distribution (if provided)
      const V = parseFloat(form.applied_shear) || 0;
      const M = parseFloat(form.applied_moment) || 0;
      const directShear = n > 0 ? V / n : 0;
      const torsionShear = Ip > 0 ? (M * 1000 * rMax) / Ip : 0;
      const totalShear = Math.sqrt(directShear ** 2 + torsionShear ** 2);

      // Classification
      let classification = 'Standard Pattern';
      let classColor = '#22d3ee';
      if (n >= 8) {
        classification = 'High-Capacity Group';
        classColor = '#a78bfa';
      } else if (n >= 4) {
        classification = 'Standard Group';
        classColor = '#34d399';
      } else {
        classification = 'Minimal Group';
        classColor = '#fbbf24';
      }

      setResults({
        total_bolts: n,
        pattern_width: patW,
        pattern_height: patH,
        plate_width: plateW,
        plate_height: plateH,
        centroid_x: cx + e1,
        centroid_y: cy + e3,
        Ix,
        Iy,
        Ip,
        bolt_positions: bolts.map((b) => ({ ...b, x: b.x + e1, y: b.y + e3 })),
        r_max: rMax,
        r_min: rMin,
        max_shear_direct: directShear,
        max_shear_torsion: torsionShear,
        max_shear_total: totalShear,
        status: 'PASS',
        classification,
        classColor,
      });

      setActiveTab('results');
      setIsCalculating(false);
    }, 300);
  }, [form, generateBoltPositions]);

  // Canvas drawing

  // PDF export
  const handleExportPDF = useCallback(() => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Bolt Pattern Analysis',
      subtitle: 'Bolt Group Properties & Load Distribution',
      projectInfo: [
        { label: 'Project', value: form.projectName || 'Untitled' },
        { label: 'Reference', value: form.reference || '-' },
        { label: 'Standard', value: 'EN 1993-1-8' },
      ],
      inputs: [
        {
          label: 'Pattern Type',
          value: PATTERN_TYPES[form.pattern_type]?.name || form.pattern_type,
        },
        { label: 'Bolt Size', value: form.bolt_diameter },
        { label: 'Grid', value: `${form.num_bolts_x} × ${form.num_bolts_y}` },
        { label: 'Pitch (X spacing)', value: form.pitch, unit: 'mm' },
        { label: 'Gauge (Y spacing)', value: form.gauge, unit: 'mm' },
        { label: 'Edge X1 / X2', value: `${form.edge_x1} / ${form.edge_x2}`, unit: 'mm' },
        { label: 'Edge Y1 / Y2', value: `${form.edge_y1} / ${form.edge_y2}`, unit: 'mm' },
        { label: 'Applied Shear', value: form.applied_shear || '0', unit: 'kN' },
        { label: 'Applied Moment', value: form.applied_moment || '0', unit: 'kNm' },
      ],
      sections: [
        {
          title: 'Pattern Geometry & Inertia',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Total Bolts', String(results.total_bolts), '-'],
            ['Pattern Width', results.pattern_width.toFixed(1), 'mm'],
            ['Pattern Height', results.pattern_height.toFixed(1), 'mm'],
            ['Plate Width', results.plate_width.toFixed(1), 'mm'],
            ['Plate Height', results.plate_height.toFixed(1), 'mm'],
            ['Centroid X', results.centroid_x.toFixed(2), 'mm'],
            ['Centroid Y', results.centroid_y.toFixed(2), 'mm'],
            ['Ix', results.Ix.toFixed(2), 'mm\u00b2'],
            ['Iy', results.Iy.toFixed(2), 'mm\u00b2'],
            ['Ip (Polar)', results.Ip.toFixed(2), 'mm\u00b2'],
            ['r_max', results.r_max.toFixed(2), 'mm'],
            ['r_min', results.r_min.toFixed(2), 'mm'],
            ...(parseFloat(form.applied_shear) > 0 || parseFloat(form.applied_moment) > 0
              ? [
                  ['Direct Shear per Bolt', results.max_shear_direct.toFixed(2), 'kN'],
                  ['Torsional Shear (max)', results.max_shear_torsion.toFixed(2), 'kN'],
                  ['Total Shear (max bolt)', results.max_shear_total.toFixed(2), 'kN'],
                ]
              : []),
          ],
        },
      ],
      checks: [
        {
          name: 'Bolt Group Adequacy',
          capacity: results.classification,
          utilisation: String(results.status === 'PASS' ? '100' : '0') + '%',
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Edge Distances',
          suggestion: 'Verify edge distances comply with EN 1993-1-8 Table 3.3 (min 1.2d₀)',
        },
        {
          check: 'Bolt Spacing',
          suggestion: 'Ensure pitch ≥ 2.2d₀ and gauge ≥ 2.4d₀ per code requirements',
        },
        {
          check: 'Load Path',
          suggestion:
            'Confirm bolt group centroid aligns with applied load to minimise eccentricity',
        },
      ],
      warnings: [],
      footerNote: 'Beaver Bridges Ltd \u2014 Bolt Pattern Analysis',
    });
  }, [results, form]);

  // DOCX Export
  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Bolt Pattern Analysis',
      subtitle: 'Bolt Group Properties & Load Distribution',
      projectInfo: [
        { label: 'Project', value: form.projectName || 'Untitled' },
        { label: 'Reference', value: form.reference || '-' },
      ],
      inputs: [
        {
          label: 'Pattern Type',
          value: PATTERN_TYPES[form.pattern_type]?.name || form.pattern_type,
        },
        { label: 'Bolt Size', value: form.bolt_diameter },
        { label: 'Grid', value: `${form.num_bolts_x} × ${form.num_bolts_y}` },
        { label: 'Pitch', value: form.pitch, unit: 'mm' },
        { label: 'Gauge', value: form.gauge, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Bolt Group Adequacy',
          capacity: results.classification,
          utilisation: `${results.status === 'PASS' ? '100' : '0'}%`,
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        { check: 'Edge Distances', suggestion: 'Verify edge distances comply with EN 1993-1-8' },
      ],
      footerNote: 'Beaver Bridges Ltd — Bolt Pattern Analysis',
    });
  }, [results, form]);

  // InputField sub-component
  const InputField: React.FC<{
    label: string;
    field: keyof FormData;
    unit?: string;
    tooltip?: string;
  }> = ({ label, field, unit, tooltip }) => (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <ExplainableLabel
          label={label}
          field={field}
          className="text-sm font-semibold text-gray-300"
        />{' '}
        {unit && <span className="text-gray-500">({unit})</span>}
      </div>
      <input
        type="number"
        value={form[field]}
        onChange={(e) => updateForm(field, e.target.value)}
        title={tooltip || label}
        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
      />
    </div>
  );

  // CollapsibleSection sub-component
  const CollapsibleSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    variant?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
  }> = ({ title, icon, variant = 'cyan', defaultOpen = true, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    const colors: Record<string, string> = {
      cyan: 'border-cyan-500/30',
      blue: 'border-blue-500/30',
      purple: 'border-purple-500/30',
      emerald: 'border-emerald-500/30',
    };
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl border overflow-hidden bg-gray-900/40 backdrop-blur-md border-gray-700/50',
          colors[variant] || colors.cyan,
        )}
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-white">{title}</span>
          </div>
          <FiChevronDown
            className={cn('text-gray-400 transition-transform', open && 'rotate-180')}
          />
        </button>
        <AnimatePresence>
          {open && (
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
  };

  const ResultItem: React.FC<{
    label: string;
    value: string | number;
    unit?: string;
    highlight?: boolean;
  }> = ({ label, value, unit, highlight }) => (
    <div
      className={cn(
        'flex justify-between py-2 border-b border-gray-700/50',
        highlight && 'bg-blue-500/10 px-2 -mx-2 rounded',
      )}
    >
      <span className="text-gray-400">{label}</span>
      <span className={cn('font-mono', highlight ? 'text-blue-400 font-semibold' : 'text-white')}>
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span className="text-gray-500 ml-1">{unit}</span>}
      </span>
    </div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
            Bolt Pattern Calculator
          </h1>
          <p className="text-gray-400 mt-2">
            Bolt Group Analysis — Geometric Properties & Polar Moment of Inertia
          </p>
        </motion.div>

        {/* Glass toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          {results && (
            <>
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="border-blue-500/50 text-blue-400"
              >
                <FiDownload className="mr-2" />
                PDF
              </Button>
              <Button
                onClick={handleExportDOCX}
                variant="outline"
                className="border-purple-500/50 text-purple-400"
              >
                <FiDownload className="mr-2" />
                DOCX
              </Button>
              <SaveRunButton
                calculatorKey="bolt_pattern"
                inputs={form as unknown as Record<string, string>}
                results={results}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                summary={results ? `${results.total_bolts} bolts` : undefined}
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'input' ? 'default' : 'outline'}
            onClick={() => setActiveTab('input')}
            className={activeTab === 'input' ? 'bg-blue-600' : ''}
          >
            <FiSettings className="mr-2" />
            Input
          </Button>
          <Button
            variant={activeTab === 'results' ? 'default' : 'outline'}
            onClick={() => setActiveTab('results')}
            className={activeTab === 'results' ? 'bg-blue-600' : ''}
            disabled={!results}
          >
            <FiTarget className="mr-2" />
            Results
          </Button>
        </div>

        {activeTab === 'input' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Input Column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Presets */}
              <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-blue-400" />
                    </div>
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
                        className="text-gray-300 border-gray-600 hover:bg-gray-700"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pattern Configuration */}
              <CollapsibleSection
                title="Pattern Configuration"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiGrid className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="cyan"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="bp-pattern-type"
                      className="block text-sm font-semibold text-gray-300 mb-2"
                    >
                      Pattern Type
                    </label>
                    <select
                      id="bp-pattern-type"
                      title="Pattern Type"
                      value={form.pattern_type}
                      onChange={(e) => updateForm('pattern_type', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(PATTERN_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="bp-bolt-size"
                      className="block text-sm font-semibold text-gray-300 mb-2"
                    >
                      Bolt Size
                    </label>
                    <select
                      id="bp-bolt-size"
                      title="Bolt Size"
                      value={form.bolt_diameter}
                      onChange={(e) => updateForm('bolt_diameter', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.keys(BOLT_DIAMETERS).map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField label="Bolts in X Direction" field="num_bolts_x" unit="" />
                  <InputField label="Bolts in Y Direction" field="num_bolts_y" unit="" />
                  <InputField
                    label="Pitch (X spacing)"
                    field="pitch"
                    unit="mm"
                    tooltip="Center-to-center spacing in X"
                  />
                  <InputField
                    label="Gauge (Y spacing)"
                    field="gauge"
                    unit="mm"
                    tooltip="Center-to-center spacing in Y"
                  />
                </div>
              </CollapsibleSection>

              {/* Edge Distances */}
              <CollapsibleSection
                title="Edge Distances"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiLayers className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="blue"
                defaultOpen={false}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <InputField label="Edge X1 (Left)" field="edge_x1" unit="mm" />
                  <InputField label="Edge X2 (Right)" field="edge_x2" unit="mm" />
                  <InputField label="Edge Y1 (Bottom)" field="edge_y1" unit="mm" />
                  <InputField label="Edge Y2 (Top)" field="edge_y2" unit="mm" />
                </div>
              </CollapsibleSection>

              {/* Applied Loads (Optional) */}
              <CollapsibleSection
                title="Applied Loads (Optional)"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiTarget className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="purple"
                defaultOpen={false}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <InputField
                    label="Applied Shear"
                    field="applied_shear"
                    unit="kN"
                    tooltip="Total shear force on bolt group"
                  />
                  <InputField
                    label="Applied Moment"
                    field="applied_moment"
                    unit="kNm"
                    tooltip="Torsional moment on bolt group"
                  />
                </div>
              </CollapsibleSection>

              {/* Project Info */}
              <CollapsibleSection
                title="Project Information"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiInfo className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="emerald"
                defaultOpen={false}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="bp-project-name"
                      className="block text-sm font-semibold text-gray-300 mb-2"
                    >
                      Project Name
                    </label>
                    <input
                      id="bp-project-name"
                      title="Project Name"
                      type="text"
                      value={form.projectName}
                      onChange={(e) => updateForm('projectName', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bp-reference"
                      className="block text-sm font-semibold text-gray-300 mb-2"
                    >
                      Reference
                    </label>
                    <input
                      id="bp-reference"
                      title="Reference"
                      type="text"
                      value={form.reference}
                      onChange={(e) => updateForm('reference', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* RUN FULL ANALYSIS Button */}
              <button
                onClick={runCalculation}
                disabled={isCalculating}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isCalculating ? '⏳ Calculating...' : '▶ RUN FULL ANALYSIS'}
              </button>
            </div>

            {/* Preview Column */}
            <div className="space-y-4">
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
                      <BoltPattern3D />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                      aria-label="Minimize preview"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      BOLT PATTERN — REAL-TIME PREVIEW
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
                        { label: 'Pattern', value: form.pattern_type },
                        { label: 'Bolts X', value: form.num_bolts_x },
                        { label: 'Bolts Y', value: form.num_bolts_y },
                        { label: 'Pitch', value: `${form.pitch} mm` },
                        { label: 'Gauge', value: `${form.gauge} mm` },
                        { label: 'Bolt Size', value: form.bolt_diameter },
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
                            { label: 'Total Bolts', value: String(results.total_bolts) },
                            {
                              label: 'Pattern Size',
                              value: `${results.pattern_width.toFixed(1)}×${results.pattern_height.toFixed(1)} mm`,
                            },
                            { label: 'Ip (polar)', value: `${results.Ip.toFixed(0)} mm⁴` },
                            { label: 'r_max', value: `${results.r_max.toFixed(1)} mm` },
                            { label: 'Status', value: results.classification },
                          ].map((item) => (
                            <div key={item.label} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-500">{item.label}</span>
                              <span className="text-emerald-400 font-bold">{item.value}</span>
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
                  title="Bolt Pattern — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <BoltPattern3D />
                    </Interactive3DDiagram>
                  )}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Results Display */}
            {results && (
              <>
                <div className="lg:col-span-2 space-y-4">
                  {/* Status Card */}
                  <Card
                    className={cn(
                      'bg-gray-900/40 backdrop-blur-md border border-gray-700/50 shadow-lg',
                      results.status === 'PASS' ? 'shadow-green-500/10' : 'shadow-yellow-500/10',
                    )}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Pattern Status</p>
                          <p className="text-2xl font-bold" style={{ color: results.classColor }}>
                            {results.classification}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'w-16 h-16 rounded-full flex items-center justify-center',
                            results.status === 'PASS' ? 'bg-green-500/20' : 'bg-yellow-500/20',
                          )}
                        >
                          {results.status === 'PASS' ? (
                            <FiCheck className="w-8 h-8 text-green-400" />
                          ) : (
                            <FiAlertTriangle className="w-8 h-8 text-yellow-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pattern Geometry */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiGrid className="w-6 h-6 text-blue-400" />
                        </div>
                        Pattern Geometry
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem label="Total Bolts" value={results.total_bolts} />
                      <ResultItem label="Pattern Width" value={results.pattern_width} unit="mm" />
                      <ResultItem label="Pattern Height" value={results.pattern_height} unit="mm" />
                      <ResultItem
                        label="Plate Width"
                        value={results.plate_width}
                        unit="mm"
                        highlight
                      />
                      <ResultItem
                        label="Plate Height"
                        value={results.plate_height}
                        unit="mm"
                        highlight
                      />
                    </CardContent>
                  </Card>

                  {/* Centroid & Inertia */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiTarget className="w-6 h-6 text-blue-400" />
                        </div>
                        Centroid & Moments of Inertia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem
                        label="Centroid X (from left)"
                        value={results.centroid_x}
                        unit="mm"
                      />
                      <ResultItem
                        label="Centroid Y (from bottom)"
                        value={results.centroid_y}
                        unit="mm"
                      />
                      <ResultItem label="Moment of Inertia Ix" value={results.Ix} unit="mm²" />
                      <ResultItem label="Moment of Inertia Iy" value={results.Iy} unit="mm²" />
                      <ResultItem
                        label="Polar Moment of Inertia Ip"
                        value={results.Ip}
                        unit="mm²"
                        highlight
                      />
                      <ResultItem label="Maximum Radius (r_max)" value={results.r_max} unit="mm" />
                      <ResultItem label="Minimum Radius (r_min)" value={results.r_min} unit="mm" />
                    </CardContent>
                  </Card>

                  {/* Load Distribution */}
                  {(parseFloat(form.applied_shear) > 0 || parseFloat(form.applied_moment) > 0) && (
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                      <CardHeader>
                        <CardTitle className="text-white font-semibold flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <FiActivity className="w-6 h-6 text-blue-400" />
                          </div>
                          Load Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResultItem
                          label="Direct Shear per Bolt"
                          value={results.max_shear_direct}
                          unit="kN"
                        />
                        <ResultItem
                          label="Torsional Shear (max)"
                          value={results.max_shear_torsion}
                          unit="kN"
                        />
                        <ResultItem
                          label="Total Shear (max bolt)"
                          value={results.max_shear_total}
                          unit="kN"
                          highlight
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Bolt Coordinates */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        Bolt Coordinates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-2 text-gray-400">Bolt #</th>
                              <th className="text-right py-2 text-gray-400">X (mm)</th>
                              <th className="text-right py-2 text-gray-400">Y (mm)</th>
                              <th className="text-right py-2 text-gray-400">r (mm)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.bolt_positions.map((bolt) => {
                              const dx = bolt.x - results.centroid_x;
                              const dy = bolt.y - results.centroid_y;
                              const r = Math.sqrt(dx * dx + dy * dy);
                              return (
                                <tr key={bolt.id} className="border-b border-gray-700/50">
                                  <td className="py-2 text-blue-400">{bolt.id + 1}</td>
                                  <td className="text-right py-2 font-mono">{bolt.x.toFixed(1)}</td>
                                  <td className="text-right py-2 font-mono">{bolt.y.toFixed(1)}</td>
                                  <td className="text-right py-2 font-mono">{r.toFixed(1)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 sticky top-8">
                  <CardHeader>
                    <CardTitle className="text-white font-semibold flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiCheck className="w-6 h-6 text-blue-400" />
                      </div>
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2 text-gray-300 border-l-4 border-blue-400 pl-3">
                        <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        Verify edge distances comply with EN 1993-1-8 Table 3.3 (min 1.2d₀)
                      </li>
                      <li className="flex items-start gap-2 text-gray-300 border-l-4 border-green-400 pl-3">
                        <FiCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        Ensure pitch ≥ 2.2d₀ and gauge ≥ 2.4d₀ per code requirements
                      </li>
                      <li className="flex items-start gap-2 text-gray-300 border-l-4 border-blue-400 pl-3">
                        <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        Confirm bolt group centroid aligns with applied load to minimise
                        eccentricity
                      </li>
                      <li className="flex items-start gap-2 text-gray-300 border-l-4 border-yellow-400 pl-3">
                        <FiCheck className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        Check bolt grade suitability for connection type and loading conditions
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Visualization Column */}
                <div className="space-y-4">
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 sticky top-8">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        Pattern Visualization
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                        <BoltPattern3D />
                      </Interactive3DDiagram>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-gray-400">Bolt positions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5 bg-green-500"></div>
                          <span className="text-gray-400">Centroid axes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-0.5 bg-amber-500"
                            style={{ borderStyle: 'dashed' }}
                          ></div>
                          <span className="text-gray-400">r_max circle</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BoltPattern;
