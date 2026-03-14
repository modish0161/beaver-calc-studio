// =============================================================================
// Hole Pattern DXF Generator — Premium Edition
// Pattern Generation & DXF Export for CNC/CAD Applications
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useState } from 'react';
import {
  FiActivity,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiCircle,
  FiCopy,
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

import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import BoltPattern3D from '../../components/3d/scenes/BoltPattern3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Pattern Type
  pattern_type: string;
  // Linear/Grid Parameters
  num_holes_x: string;
  num_holes_y: string;
  spacing_x: string;
  spacing_y: string;
  start_x: string;
  start_y: string;
  // Circular Parameters
  num_holes_circle: string;
  circle_radius: string;
  center_x: string;
  center_y: string;
  start_angle: string;
  // Hole Properties
  hole_diameter: string;
  hole_type: string;
  // Plate Dimensions (optional)
  plate_width: string;
  plate_height: string;
  show_plate: string;
  // DXF Options
  layer_name: string;
  units: string;
  // Project
  projectName: string;
  reference: string;
}

interface HoleCoordinate {
  x: number;
  y: number;
  id: number;
  diameter: number;
}

interface Results {
  // Generated holes
  holes: HoleCoordinate[];
  total_holes: number;
  // Bounds
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  pattern_width: number;
  pattern_height: number;
  // DXF content
  dxf_content: string;
  // Status
  status: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const PATTERN_TYPES: Record<string, { name: string; description: string }> = {
  linear: { name: 'Linear (Single Row)', description: 'Holes in a straight line' },
  grid: { name: 'Rectangular Grid', description: 'Holes in X and Y grid' },
  circular: { name: 'Circular (Bolt Circle)', description: 'Holes on a circle (PCD)' },
  staggered: { name: 'Staggered Grid', description: 'Offset alternating rows' },
};

const HOLE_TYPES: Record<string, { name: string; description: string }> = {
  through: { name: 'Through Hole', description: 'Standard through hole' },
  counterbore: { name: 'Counterbore', description: 'For socket head screws' },
  countersink: { name: 'Countersink', description: 'For flat head screws' },
  tapped: { name: 'Tapped', description: 'Threaded hole' },
};

const UNITS: Record<string, { name: string; factor: number }> = {
  mm: { name: 'Millimeters', factor: 1 },
  inches: { name: 'Inches', factor: 25.4 },
  m: { name: 'Meters', factor: 1000 },
};

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  flange_4bolt: {
    name: '4-Bolt Flange',
    form: {
      pattern_type: 'circular',
      num_holes_circle: '4',
      circle_radius: '50',
      center_x: '75',
      center_y: '75',
      hole_diameter: '13',
      plate_width: '150',
      plate_height: '150',
      show_plate: 'yes',
    },
  },
  flange_8bolt: {
    name: '8-Bolt Flange',
    form: {
      pattern_type: 'circular',
      num_holes_circle: '8',
      circle_radius: '80',
      center_x: '100',
      center_y: '100',
      hole_diameter: '18',
      plate_width: '200',
      plate_height: '200',
      show_plate: 'yes',
    },
  },
  bracket_grid: {
    name: 'Bracket (6 holes)',
    form: {
      pattern_type: 'grid',
      num_holes_x: '3',
      num_holes_y: '2',
      spacing_x: '50',
      spacing_y: '40',
      start_x: '25',
      start_y: '25',
      hole_diameter: '11',
      plate_width: '150',
      plate_height: '90',
      show_plate: 'yes',
    },
  },
  linear_row: {
    name: 'Linear Row (5)',
    form: {
      pattern_type: 'linear',
      num_holes_x: '5',
      num_holes_y: '1',
      spacing_x: '40',
      spacing_y: '0',
      start_x: '20',
      start_y: '25',
      hole_diameter: '9',
      plate_width: '200',
      plate_height: '50',
      show_plate: 'yes',
    },
  },
};

const HolePatternDXF = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    center_x: '',
    center_y: '',
    circle_radius: '',
    hole_diameter: '',
    hole_type: '',
    layer_name: '',
    num_holes_circle: '',
    num_holes_x: '',
    num_holes_y: '',
    pattern_type: '',
    plate_height: '',
    plate_width: '',
    projectName: '',
    reference: '',
    show_plate: '',
    spacing_x: '',
    spacing_y: '',
    start_angle: '',
    start_x: '',
    start_y: '',
    units: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
      { key: 'center_x', label: 'Center X' },
      { key: 'center_y', label: 'Center Y' },
      { key: 'circle_radius', label: 'Circle Radius' },
      { key: 'hole_diameter', label: 'Hole Diameter' },
      { key: 'hole_type', label: 'Hole Type' },
      { key: 'layer_name', label: 'Layer Name' },
      { key: 'num_holes_circle', label: 'Num Holes Circle' },
      { key: 'num_holes_x', label: 'Num Holes X' },
      { key: 'num_holes_y', label: 'Num Holes Y' },
      { key: 'pattern_type', label: 'Pattern Type' },
      { key: 'plate_height', label: 'Plate Height' },
      { key: 'plate_width', label: 'Plate Width' },
      { key: 'show_plate', label: 'Show Plate' },
      { key: 'spacing_x', label: 'Spacing X' },
      { key: 'spacing_y', label: 'Spacing Y' },
      { key: 'start_angle', label: 'Start Angle' },
      { key: 'start_x', label: 'Start X' },
      { key: 'start_y', label: 'Start Y' },
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
    { key: 'num_holes_x', label: 'Num_holes_x', min: 0, max: 100, step: 1, unit: '' },
    { key: 'num_holes_y', label: 'Num_holes_y', min: 0, max: 100, step: 1, unit: '' },
    { key: 'spacing_x', label: 'Spacing_x', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [copySuccess, setCopySuccess] = useState(false);

  const handleDownloadDXF = useCallback(() => {
    if (!results) return;
    let dxf = '0\nSECTION\n2\nENTITIES\n';
    results.holes.forEach((h: HoleCoordinate) => {
      dxf += `0\nCIRCLE\n8\n${formData.layer_name || 'HOLES'}\n10\n${h.x}\n20\n${h.y}\n40\n${h.diameter / 2}\n`;
    });
    dxf += '0\nENDSEC\n0\nEOF\n';
    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.projectName || 'hole_pattern'}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results, formData]);

  const handleCopyCoordinates = useCallback(() => {
    if (!results) return;
    const text = results.holes
      .map((h: HoleCoordinate) => `${h.id}\t${h.x.toFixed(3)}\t${h.y.toFixed(3)}\t${h.diameter}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [results]);

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

  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);

    setTimeout(() => {
      try {
        const patternType = formData.pattern_type || 'grid';
        const holeDia = parseFloat(formData.hole_diameter) || 10;
        const holes: HoleCoordinate[] = [];
        let id = 1;

        if (patternType === 'circular') {
          // Circular bolt pattern (PCD)
          const n = parseInt(formData.num_holes_circle) || 4;
          const radius = parseFloat(formData.circle_radius) || 50;
          const cx = parseFloat(formData.center_x) || 0;
          const cy = parseFloat(formData.center_y) || 0;
          const startAngle = parseFloat(formData.start_angle) || 0;

          for (let i = 0; i < n; i++) {
            const angle = ((startAngle + (360 / n) * i) * Math.PI) / 180;
            holes.push({
              id: id++,
              x: cx + radius * Math.cos(angle),
              y: cy + radius * Math.sin(angle),
              diameter: holeDia,
            });
          }
        } else if (patternType === 'linear') {
          // Single row
          const nx = parseInt(formData.num_holes_x) || 5;
          const sx = parseFloat(formData.spacing_x) || 40;
          const ox = parseFloat(formData.start_x) || 0;
          const oy = parseFloat(formData.start_y) || 0;

          for (let i = 0; i < nx; i++) {
            holes.push({ id: id++, x: ox + i * sx, y: oy, diameter: holeDia });
          }
        } else if (patternType === 'staggered') {
          // Staggered grid
          const nx = parseInt(formData.num_holes_x) || 4;
          const ny = parseInt(formData.num_holes_y) || 3;
          const sx = parseFloat(formData.spacing_x) || 40;
          const sy = parseFloat(formData.spacing_y) || 40;
          const ox = parseFloat(formData.start_x) || 0;
          const oy = parseFloat(formData.start_y) || 0;

          for (let j = 0; j < ny; j++) {
            const offset = j % 2 === 1 ? sx / 2 : 0;
            for (let i = 0; i < nx; i++) {
              holes.push({ id: id++, x: ox + i * sx + offset, y: oy + j * sy, diameter: holeDia });
            }
          }
        } else {
          // Rectangular grid (default)
          const nx = parseInt(formData.num_holes_x) || 3;
          const ny = parseInt(formData.num_holes_y) || 2;
          const sx = parseFloat(formData.spacing_x) || 50;
          const sy = parseFloat(formData.spacing_y) || 50;
          const ox = parseFloat(formData.start_x) || 0;
          const oy = parseFloat(formData.start_y) || 0;

          for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
              holes.push({ id: id++, x: ox + i * sx, y: oy + j * sy, diameter: holeDia });
            }
          }
        }

        // Bounds
        const xs = holes.map((h) => h.x);
        const ys = holes.map((h) => h.y);
        const min_x = Math.min(...xs);
        const max_x = Math.max(...xs);
        const min_y = Math.min(...ys);
        const max_y = Math.max(...ys);

        // Generate DXF content (R12 format)
        const layerName = formData.layer_name || 'HOLES';
        let dxf = '0\nSECTION\n2\nENTITIES\n';

        // Optional plate outline
        if (formData.show_plate === 'yes') {
          const pw = parseFloat(formData.plate_width) || max_x + holeDia * 2;
          const ph = parseFloat(formData.plate_height) || max_y + holeDia * 2;
          dxf += `0\nLWPOLYLINE\n8\nPLATE\n90\n4\n70\n1\n`;
          dxf += `10\n0\n20\n0\n10\n${pw}\n20\n0\n10\n${pw}\n20\n${ph}\n10\n0\n20\n${ph}\n`;
        }

        // Holes as circles
        for (const hole of holes) {
          dxf += `0\nCIRCLE\n8\n${layerName}\n10\n${hole.x.toFixed(3)}\n20\n${hole.y.toFixed(3)}\n40\n${(hole.diameter / 2).toFixed(3)}\n`;
          // Center mark
          dxf += `0\nPOINT\n8\n${layerName}\n10\n${hole.x.toFixed(3)}\n20\n${hole.y.toFixed(3)}\n`;
        }

        dxf += '0\nENDSEC\n0\nEOF\n';

        setResults({
          holes,
          total_holes: holes.length,
          min_x,
          max_x,
          min_y,
          max_y,
          pattern_width: max_x - min_x,
          pattern_height: max_y - min_y,
          dxf_content: dxf,
          status: `${holes.length} holes generated — ${PATTERN_TYPES[patternType]?.name || patternType}`,
        });
      } catch (e) {
        console.error('Calculation error:', e);
      }
      setIsCalculating(false);
    }, 500);
  }, [formData]);

  const handleExportPDF = useCallback(() => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Hole Pattern Report',
      subtitle: 'CNC/CAD Hole Pattern Generation',
      projectInfo: [
        { label: 'Project', value: formData.projectName || '-' },
        { label: 'Reference', value: formData.reference || 'HP001' },
        { label: 'Standard', value: 'DXF R12 / ISO 128' },
      ],
      inputs: [
        {
          label: 'Pattern Type',
          value: PATTERN_TYPES[formData.pattern_type]?.name || formData.pattern_type,
        },
        { label: 'Hole Type', value: HOLE_TYPES[formData.hole_type]?.name || formData.hole_type },
        { label: 'Hole Diameter', value: formData.hole_diameter, unit: 'mm' },
        { label: 'Holes X', value: formData.num_holes_x },
        { label: 'Holes Y', value: formData.num_holes_y },
        { label: 'Spacing X', value: formData.spacing_x, unit: 'mm' },
        { label: 'Spacing Y', value: formData.spacing_y, unit: 'mm' },
        { label: 'Plate Width', value: formData.plate_width, unit: 'mm' },
        { label: 'Plate Height', value: formData.plate_height, unit: 'mm' },
      ],
      sections: [
        {
          title: 'Pattern Summary',
          head: [['Parameter', 'Value']],
          body: [
            ['Total Holes', String(results.total_holes)],
            ['Pattern Width', `${results.pattern_width.toFixed(1)} mm`],
            ['Pattern Height', `${results.pattern_height.toFixed(1)} mm`],
            ['Min X', `${results.min_x.toFixed(1)} mm`],
            ['Max X', `${results.max_x.toFixed(1)} mm`],
            ['Min Y', `${results.min_y.toFixed(1)} mm`],
            ['Max Y', `${results.max_y.toFixed(1)} mm`],
          ],
        },
        {
          title: 'Hole Coordinates (first 20)',
          head: [['Hole ID', 'X (mm)', 'Y (mm)', 'Diameter (mm)']],
          body: results.holes
            .slice(0, 20)
            .map((h) => [String(h.id), h.x.toFixed(1), h.y.toFixed(1), String(h.diameter)]),
        },
      ],
      checks: [
        {
          name: 'Pattern Generated',
          capacity: `${results.total_holes} holes`,
          utilisation: '100%',
          status: results.total_holes > 0 ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      footerNote: 'Beaver Bridges Ltd — CNC/CAD Hole Pattern Generation',
    });
  }, [formData, results]);

  // DOCX Export — Editable Word document
  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Hole Pattern Report',
      subtitle: 'CNC/CAD Hole Pattern Generation',
      projectInfo: [
        { label: 'Project', value: formData.projectName || '-' },
        { label: 'Reference', value: formData.reference || 'HP001' },
      ],
      inputs: [
        {
          label: 'Pattern Type',
          value: PATTERN_TYPES[formData.pattern_type]?.name || formData.pattern_type,
          unit: '',
        },
        {
          label: 'Hole Type',
          value: HOLE_TYPES[formData.hole_type]?.name || formData.hole_type,
          unit: '',
        },
        { label: 'Hole Diameter', value: formData.hole_diameter, unit: 'mm' },
        { label: 'Holes X', value: formData.num_holes_x, unit: '' },
        { label: 'Holes Y', value: formData.num_holes_y, unit: '' },
        { label: 'Spacing X', value: formData.spacing_x, unit: 'mm' },
        { label: 'Spacing Y', value: formData.spacing_y, unit: 'mm' },
      ],
      checks: [
        {
          name: 'Pattern Generated',
          capacity: `${results.total_holes} holes`,
          utilisation: '100%',
          status: (results.total_holes > 0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Pattern',
          suggestion: 'Verify edge distances and hole interference before fabrication',
        },
      ],
      warnings: [],
      footerNote: 'Beaver Bridges Ltd — Hole Pattern Generation',
    });
  }, [formData, results]);

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
      <div className="flex items-center gap-1.5 mb-2">
        <ExplainableLabel
          label={label}
          field={field}
          className="text-sm font-semibold text-gray-300"
        />{' '}
        {unit && <span className="text-xs text-gray-400">({unit})</span>}
      </div>
      <input
        type="number"
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
      <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
        <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection(sectionId)}>
          <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
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

  const ResultItem: React.FC<{
    label: string;
    value: string | number;
    unit?: string;
    highlight?: boolean;
  }> = ({ label, value, unit, highlight }) => (
    <div
      className={cn(
        'flex justify-between py-2 border-b border-gray-700/50',
        highlight && 'bg-emerald-500/10 px-2 -mx-2 rounded',
      )}
    >
      <span className="text-gray-400">{label}</span>
      <span
        className={cn('font-mono', highlight ? 'text-emerald-400 font-semibold' : 'text-white')}
      >
        {typeof value === 'number' ? value.toFixed(3) : value}
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
        className="fixed inset-0 pointer-events-none"
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
              Hole Pattern DXF Generator
            </h1>
            <p className="text-gray-400 mt-2">
              Generate hole patterns for CNC machining and CAD applications
            </p>
          </div>
          {/* Glass toolbar */}
          <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
            {results && (
              <>
                <Button
                  onClick={handleDownloadDXF}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  <FiDownload className="mr-2" />
                  DXF
                </Button>
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </Button>
                <Button
                  onClick={handleExportDOCX}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
                <SaveRunButton
                  calculatorKey="hole_pattern_dxf"
                  inputs={formData as unknown as Record<string, string>}
                  results={results}
                  status={results?.total_holes > 0 ? 'PASS' : 'FAIL'}
                  summary={results ? `${results.total_holes} holes` : undefined}
                />
              </>
            )}
          </div>
        </motion.div>

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

              {/* Pattern Type */}
              <CollapsibleSection
                title="Pattern Type"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiGrid className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="emerald"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Pattern Type
                    </label>
                    <select
                      title="Pattern Type"
                      value={formData.pattern_type}
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
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Hole Type
                    </label>
                    <select
                      title="Hole Type"
                      value={formData.hole_type}
                      onChange={(e) => updateForm('hole_type', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {Object.entries(HOLE_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputField label="Hole Diameter" field="hole_diameter" unit="mm" />
                </div>
              </CollapsibleSection>

              {/* Circular Pattern Parameters */}
              {formData.pattern_type === 'circular' && (
                <CollapsibleSection
                  title="Circular Pattern (PCD)"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiCircle className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="blue"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Number of Holes" field="num_holes_circle" unit="" />
                    <InputField
                      label="PCD Radius"
                      field="circle_radius"
                      unit="mm"
                      tooltip="Pitch Circle Diameter / 2"
                    />
                    <InputField label="Center X" field="center_x" unit="mm" />
                    <InputField label="Center Y" field="center_y" unit="mm" />
                    <InputField
                      label="Start Angle"
                      field="start_angle"
                      unit="°"
                      tooltip="Angle of first hole from horizontal"
                    />
                  </div>
                </CollapsibleSection>
              )}

              {/* Grid/Linear Pattern Parameters */}
              {(formData.pattern_type === 'grid' ||
                formData.pattern_type === 'linear' ||
                formData.pattern_type === 'staggered') && (
                <CollapsibleSection
                  title="Grid Pattern Parameters"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="blue"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Holes in X" field="num_holes_x" unit="" />
                    {formData.pattern_type !== 'linear' && (
                      <InputField label="Holes in Y" field="num_holes_y" unit="" />
                    )}
                    <InputField label="Spacing X" field="spacing_x" unit="mm" />
                    {formData.pattern_type !== 'linear' && (
                      <InputField label="Spacing Y" field="spacing_y" unit="mm" />
                    )}
                    <InputField
                      label="Start X"
                      field="start_x"
                      unit="mm"
                      tooltip="X position of first hole"
                    />
                    <InputField
                      label="Start Y"
                      field="start_y"
                      unit="mm"
                      tooltip="Y position of first hole"
                    />
                  </div>
                </CollapsibleSection>
              )}

              {/* Plate Outline */}
              <CollapsibleSection
                title="Plate Outline (Optional)"
                icon={
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiTarget className="w-6 h-6 text-blue-400" />
                  </div>
                }
                variant="purple"
                defaultOpen={false}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Show Plate
                    </label>
                    <select
                      title="Show Plate"
                      value={formData.show_plate}
                      onChange={(e) => updateForm('show_plate', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <InputField label="Layer Name" field="layer_name" unit="" />
                  <InputField label="Plate Width" field="plate_width" unit="mm" />
                  <InputField label="Plate Height" field="plate_height" unit="mm" />
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
                variant="amber"
                defaultOpen={false}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Project Name
                    </label>
                    <input
                      title="Project Name"
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => updateForm('projectName', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Reference
                    </label>
                    <input
                      title="Reference"
                      type="text"
                      value={formData.reference}
                      onChange={(e) => updateForm('reference', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* RUN FULL ANALYSIS */}
              <button
                onClick={() => {
                  runCalculation();
                  setActiveTab('results');
                }}
                disabled={isCalculating}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isCalculating ? '⏳ Generating...' : '▶ RUN FULL ANALYSIS'}
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
                      HOLE PATTERN DXF — REAL-TIME PREVIEW
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
                        { label: 'Pattern', value: formData.pattern_type || 'grid' },
                        { label: 'Hole Diameter', value: `${formData.hole_diameter || '10'} mm` },
                        { label: 'Holes X', value: formData.num_holes_x || '—' },
                        { label: 'Holes Y', value: formData.num_holes_y || '—' },
                        { label: 'Spacing X', value: `${formData.spacing_x || '—'} mm` },
                        { label: 'Spacing Y', value: `${formData.spacing_y || '—'} mm` },
                        {
                          label: 'Plate',
                          value:
                            formData.show_plate === 'yes'
                              ? `${formData.plate_width}×${formData.plate_height} mm`
                              : 'None',
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
                            { label: 'Total Holes', value: String(results.total_holes) },
                            {
                              label: 'Pattern Size',
                              value: `${results.pattern_width.toFixed(1)}×${results.pattern_height.toFixed(1)} mm`,
                            },
                            {
                              label: 'Bounds X',
                              value: `${results.min_x.toFixed(1)} to ${results.max_x.toFixed(1)}`,
                            },
                            {
                              label: 'Bounds Y',
                              value: `${results.min_y.toFixed(1)} to ${results.max_y.toFixed(1)}`,
                            },
                            { label: 'Status', value: results.status },
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
                  title="Hole Pattern DXF — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
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
                  {/* Summary Card */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-gray-400 text-sm">Total Holes</p>
                          <p className="text-3xl font-bold text-emerald-400">
                            {results.total_holes}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Pattern Width</p>
                          <p className="text-2xl font-bold text-white">
                            {results.pattern_width.toFixed(1)} mm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Pattern Height</p>
                          <p className="text-2xl font-bold text-white">
                            {results.pattern_height.toFixed(1)} mm
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pattern Bounds */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiGrid className="w-6 h-6 text-blue-400" />
                        </div>
                        Pattern Bounds
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultItem label="Min X" value={results.min_x} unit="mm" />
                      <ResultItem label="Max X" value={results.max_x} unit="mm" />
                      <ResultItem label="Min Y" value={results.min_y} unit="mm" />
                      <ResultItem label="Max Y" value={results.max_y} unit="mm" />
                    </CardContent>
                  </Card>

                  {/* Hole Coordinates Table */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-white font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <FiCircle className="w-6 h-6 text-blue-400" />
                          </div>
                          Hole Coordinates
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyCoordinates}
                          className="border-gray-600 text-gray-300"
                        >
                          <FiCopy className="mr-2" />
                          {copySuccess ? 'Copied!' : 'Copy All'}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-800">
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-2 text-gray-400">Hole #</th>
                              <th className="text-right py-2 text-gray-400">X (mm)</th>
                              <th className="text-right py-2 text-gray-400">Y (mm)</th>
                              <th className="text-right py-2 text-gray-400">Dia (mm)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.holes.map((hole) => (
                              <tr key={hole.id} className="border-b border-gray-700/50">
                                <td className="py-2 text-emerald-400">{hole.id + 1}</td>
                                <td className="text-right py-2 font-mono">{hole.x.toFixed(3)}</td>
                                <td className="text-right py-2 font-mono">{hole.y.toFixed(3)}</td>
                                <td className="text-right py-2 font-mono">
                                  {hole.diameter.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Visualization Column */}
                <div className="space-y-4 sticky top-8">
                  {/* Summary sidebar */}
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardContent className="pt-4 space-y-3">
                      <div className="border-l-4 border-blue-400 pl-3 py-1">
                        <p className="text-gray-400 text-xs">Total Holes</p>
                        <p className="text-xl font-bold text-white">{results.total_holes}</p>
                      </div>
                      <div className="border-l-4 border-green-400 pl-3 py-1">
                        <p className="text-gray-400 text-xs">Pattern Size</p>
                        <p className="text-xl font-bold text-white">
                          {results.pattern_width.toFixed(1)} × {results.pattern_height.toFixed(1)}{' '}
                          mm
                        </p>
                      </div>
                      <div className="border-l-4 border-emerald-400 pl-3 py-1">
                        <p className="text-gray-400 text-xs">Status</p>
                        <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                          <FiCheckCircle className="w-4 h-4" /> {results.status}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-white font-semibold">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        DXF Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                        <BoltPattern3D />
                      </Interactive3DDiagram>
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                          <span className="text-gray-400">Hole positions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border border-gray-500"></div>
                          <span className="text-gray-400">Plate outline</span>
                        </div>
                        {formData.pattern_type === 'circular' && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 bg-amber-500"></div>
                            <span className="text-gray-400">PCD circle</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <Button
                          onClick={handleDownloadDXF}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <FiDownload className="mr-2" />
                          Download DXF File
                        </Button>
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

export default HolePatternDXF;
