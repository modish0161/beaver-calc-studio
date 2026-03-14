// =============================================================================
// BeaverCalc Studio — Needle Beam Calculator (Premium)
// Steel needle beam design for masonry wall support
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiInfo,
    FiLayers,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiX,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import NeedleBeam3D from '../../components/3d/scenes/NeedleBeam3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  sectionKey: string;
  span: string;
  wallLoad: string;
  wallThickness: string;
  wallHeight: string;
  numNeedles: string;
  needleSpacing: string;
  designStrength: string;
  deflectionLimit: string;
  customIx: string;
  customZx: string;
  customDepth: string;
}

interface Results {
  moment: number;
  shear: number;
  stress: number;
  deflection: number;
  allowableDeflection: number;
  utilisationStress: number;
  utilisationDeflection: number;
  loadPerNeedle: number;
  requiredIx: number;
  overallStatus: 'PASS' | 'FAIL';
  stressStatus: 'PASS' | 'FAIL';
  deflectionStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// BEAM SECTIONS DATABASE
// =============================================================================

const BEAM_SECTIONS: Record<
  string,
  { name: string; Ix: number; Zx: number; depth: number; mass: number }
> = {
  '127x76x13UB': { name: '127×76×13 UB', Ix: 475, Zx: 75, depth: 127, mass: 13 },
  '152x89x16UB': { name: '152×89×16 UB', Ix: 834, Zx: 109, depth: 152, mass: 16 },
  '178x102x19UB': { name: '178×102×19 UB', Ix: 1360, Zx: 153, depth: 178, mass: 19 },
  '203x102x23UB': { name: '203×102×23 UB', Ix: 2100, Zx: 207, depth: 203, mass: 23 },
  '203x133x25UB': { name: '203×133×25 UB', Ix: 2340, Zx: 230, depth: 203, mass: 25 },
  '254x102x22UB': { name: '254×102×22 UB', Ix: 2840, Zx: 224, depth: 254, mass: 22 },
  '254x102x25UB': { name: '254×102×25 UB', Ix: 3410, Zx: 266, depth: 254, mass: 25 },
  '254x146x31UB': { name: '254×146×31 UB', Ix: 4410, Zx: 351, depth: 254, mass: 31 },
  '305x102x25UB': { name: '305×102×25 UB', Ix: 4460, Zx: 292, depth: 305, mass: 25 },
  '305x127x37UB': { name: '305×127×37 UB', Ix: 6990, Zx: 459, depth: 305, mass: 37 },
  '305x165x40UB': { name: '305×165×40 UB', Ix: 8500, Zx: 561, depth: 305, mass: 40 },
  '356x127x33UB': { name: '356×127×33 UB', Ix: 8250, Zx: 462, depth: 356, mass: 33 },
  '356x171x45UB': { name: '356×171×45 UB', Ix: 12100, Zx: 680, depth: 356, mass: 45 },
  '152x152x23UC': { name: '152×152×23 UC', Ix: 1250, Zx: 164, depth: 152, mass: 23 },
  '152x152x30UC': { name: '152×152×30 UC', Ix: 1750, Zx: 222, depth: 157, mass: 30 },
  '203x203x46UC': { name: '203×203×46 UC', Ix: 4570, Zx: 450, depth: 203, mass: 46 },
  '203x203x60UC': { name: '203×203×60 UC', Ix: 6120, Zx: 584, depth: 209, mass: 60 },
  custom: { name: 'Custom Section', Ix: 1000, Zx: 100, depth: 200, mass: 25 },
};

const WALL_PRESETS: Record<string, { load: string; thickness: string; label: string }> = {
  half_brick: { load: '12', thickness: '102', label: 'Half Brick (102mm)' },
  single_brick: { load: '22', thickness: '215', label: 'Single Brick (215mm)' },
  cavity: { load: '35', thickness: '275', label: 'Cavity Wall (275mm)' },
  double: { load: '45', thickness: '330', label: 'Double Leaf (330mm)' },
  blockwork: { load: '28', thickness: '200', label: 'Blockwork (200mm)' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const NeedleBeam = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    beam: true,
    wall: true,
    design: false,
  });

  const [form, setForm] = useState<FormData>({
    sectionKey: '203x102x23UB',
    span: '1.8',
    wallLoad: '22',
    wallThickness: '215',
    wallHeight: '3.0',
    numNeedles: '2',
    needleSpacing: '1.5',
    designStrength: '275',
    deflectionLimit: '360',
    customIx: '2000',
    customZx: '200',
    customDepth: '200',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'span', label: 'Span' },
  { key: 'wallLoad', label: 'Wall Load' },
  { key: 'wallThickness', label: 'Wall Thickness' },
  { key: 'wallHeight', label: 'Wall Height' },
  { key: 'numNeedles', label: 'Num Needles' },
  { key: 'needleSpacing', label: 'Needle Spacing' },
  { key: 'designStrength', label: 'Design Strength' },
  { key: 'deflectionLimit', label: 'Deflection Limit' },
  { key: 'customIx', label: 'Custom Ix' },
  { key: 'customZx', label: 'Custom Zx' },
  { key: 'customDepth', label: 'Custom Depth' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map(e => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'sectionKey', label: 'Section Key', min: 0, max: 100, step: 1, unit: '' },
    { key: 'span', label: 'Span', min: 0, max: 100, step: 1, unit: '' },
    { key: 'wallLoad', label: 'Wall Load', min: 0, max: 100, step: 1, unit: '' },
    { key: 'wallThickness', label: 'Wall Thickness', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedWall, setSelectedWall] = useState<string>('single_brick');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    if (!validateInputs()) return;
    const newWarnings: Warning[] = [];

    try {
      const L = parseFloat(form.span); // m
      const w = parseFloat(form.wallLoad); // kN/m UDL
      const py = parseFloat(form.designStrength); // MPa
      const defLimit = parseFloat(form.deflectionLimit);
      const nNeedles = parseInt(form.numNeedles) || 1;
      const H_wall = parseFloat(form.wallHeight);

      let Ix: number, Zx: number, depth: number;
      if (form.sectionKey === 'custom') {
        Ix = parseFloat(form.customIx);
        Zx = parseFloat(form.customZx);
        depth = parseFloat(form.customDepth);
      } else {
        const section = BEAM_SECTIONS[form.sectionKey];
        Ix = section.Ix;
        Zx = section.Zx;
        depth = section.depth;
      }

      if (L <= 0 || w <= 0) {
        newWarnings.push({ type: 'error', message: 'Invalid span or load' });
        setWarnings(newWarnings);
        return;
      }

      // Load per needle
      const tributaryLength = parseFloat(form.needleSpacing) || L;
      const wallLineLoad = w * H_wall; // kN/m of wall height * height = kN/m run
      const loadPerNeedle = (wallLineLoad * tributaryLength) / nNeedles;

      // UDL on needle (distributed wall thickness over beam)
      const wallThk = parseFloat(form.wallThickness) / 1000; // m
      const q = loadPerNeedle / wallThk; // kN/m

      // Simply supported beam analysis
      const M_max = (q * L * L) / 8; // kNm (wall load as UDL over needle)
      const V_max = (q * L) / 2; // kN

      // Stresses (convert units)
      const M_Nmm = M_max * 1e6;
      const Z_mm3 = Zx * 1e3;
      const stress = M_Nmm / Z_mm3; // MPa

      // Deflection
      const E = 205000; // MPa
      const L_mm = L * 1000;
      const I_mm4 = Ix * 1e4;
      const q_Nmm = q; // kN/m ≈ N/mm
      const deflection = (5 * q_Nmm * Math.pow(L_mm, 4)) / (384 * E * I_mm4);

      const allowableDeflection = L_mm / defLimit;

      // Utilisations
      const utilisationStress = (stress / py) * 100;
      const utilisationDeflection = (deflection / allowableDeflection) * 100;

      // Status
      const stressStatus = stress <= py ? 'PASS' : 'FAIL';
      const deflectionStatus = deflection <= allowableDeflection ? 'PASS' : 'FAIL';
      const overallStatus =
        stressStatus === 'PASS' && deflectionStatus === 'PASS' ? 'PASS' : 'FAIL';

      // Required Ix for deflection
      const requiredIx = (5 * q_Nmm * Math.pow(L_mm, 4)) / (384 * E * allowableDeflection) / 1e4;

      // Warnings
      if (utilisationStress > 85 && utilisationStress <= 100) {
        newWarnings.push({
          type: 'warning',
          message: `High stress utilisation: ${utilisationStress.toFixed(0)}%`,
        });
      }
      if (L > 3.0) {
        newWarnings.push({ type: 'info', message: 'Long span - consider intermediate support' });
      }
      if (stress > py) {
        newWarnings.push({
          type: 'error',
          message: `Stress ${stress.toFixed(0)} MPa exceeds capacity ${py} MPa`,
        });
      }
      if (nNeedles === 1 && loadPerNeedle > 50) {
        newWarnings.push({
          type: 'warning',
          message: 'High load on single needle - consider pairs',
        });
      }

      setResults({
        moment: M_max,
        shear: V_max,
        stress,
        deflection,
        allowableDeflection,
        utilisationStress,
        utilisationDeflection,
        loadPerNeedle,
        requiredIx,
        overallStatus,
        stressStatus,
        deflectionStatus,
      });
    } catch {
      newWarnings.push({ type: 'error', message: 'Calculation error' });
    }

    setWarnings(newWarnings);
  };

  useEffect(() => {
    calculate();
  }, [form]);

  // ===========================================================================
  // VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applyWallPreset = (key: string) => {
    const preset = WALL_PRESETS[key];
    if (preset) {
      setSelectedWall(key);
      setForm((prev) => ({ ...prev, wallLoad: preset.load, wallThickness: preset.thickness }));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ===========================================================================
  // PDF EXPORT
  // ===========================================================================

  const exportPDF = () => {
    if (!results) return;
    const section = BEAM_SECTIONS[form.sectionKey];
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.utilisationStress > 85 && results.utilisationStress <= 100)
      pdfRecs.push({
        check: 'High Stress',
        suggestion: `Stress at ${results.utilisationStress.toFixed(0)}% — consider larger section`,
      });
    if (results.stressStatus === 'FAIL')
      pdfRecs.push({
        check: 'Stress Failure',
        suggestion: `Stress ${results.stress.toFixed(0)} MPa exceeds py ${form.designStrength} MPa — increase section size`,
      });
    if (results.deflectionStatus === 'FAIL')
      pdfRecs.push({
        check: 'Deflection Failure',
        suggestion: `Deflection exceeds L/${form.deflectionLimit} limit — increase Ix (need ≥${results.requiredIx.toFixed(0)} cm⁴)`,
      });
    if (parseFloat(form.span) > 3.0)
      pdfRecs.push({
        check: 'Long Span',
        suggestion: 'Span > 3.0m — consider intermediate support or paired needles',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Bending stress and deflection within allowable limits',
      });
    generatePremiumPDF({
      title: 'Needle Beam Design',
      subtitle: 'Steel Beam Analysis for Temporary Support',
      projectInfo: [
        { label: 'Project', value: 'Needle Beam Design' },
        { label: 'Reference', value: 'NEE001' },
        { label: 'Standard', value: 'BS 5975 / BS 449' },
      ],
      inputs: [
        { label: 'Section', value: section ? section.name : 'Custom' },
        { label: 'Effective Span', value: `${form.span} m` },
        { label: 'Wall Load', value: `${form.wallLoad} kN/m²` },
        { label: 'Wall Thickness', value: `${form.wallThickness} mm` },
        { label: 'Wall Height', value: `${form.wallHeight} m` },
        { label: 'No. Needles', value: form.numNeedles },
        { label: 'Needle Spacing', value: `${form.needleSpacing} m` },
        { label: 'Design Strength (py)', value: `${form.designStrength} MPa` },
        { label: 'Deflection Limit', value: `L/${form.deflectionLimit}` },
      ],
      sections: [
        {
          title: 'Beam Analysis Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Load per Needle', results.loadPerNeedle.toFixed(1), 'kN'],
            ['Max Moment', results.moment.toFixed(2), 'kNm'],
            ['Max Shear', results.shear.toFixed(1), 'kN'],
            ['Bending Stress', results.stress.toFixed(1), 'MPa'],
            ['Stress Utilisation', results.utilisationStress.toFixed(1), '%'],
            ['Deflection', results.deflection.toFixed(2), 'mm'],
            ['Allowable Deflection', results.allowableDeflection.toFixed(2), 'mm'],
            ['Deflection Utilisation', results.utilisationDeflection.toFixed(1), '%'],
            ['Required Ix', results.requiredIx.toFixed(0), 'cm⁴'],
          ],
        },
      ],
      checks: [
        {
          name: 'Bending Stress',
          capacity: `${form.designStrength} MPa`,
          utilisation: String(Math.round(results.utilisationStress)),
          status: results.stressStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `L/${form.deflectionLimit}`,
          utilisation: String(Math.round(results.utilisationDeflection)),
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Needle Beam Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const section = BEAM_SECTIONS[form.sectionKey];
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.utilisationStress > 85 && results.utilisationStress <= 100)
      pdfRecs.push({
        check: 'High Stress',
        suggestion: `Stress at ${results.utilisationStress.toFixed(0)}% — consider larger section`,
      });
    if (results.stressStatus === 'FAIL')
      pdfRecs.push({
        check: 'Stress Failure',
        suggestion: `Stress ${results.stress.toFixed(0)} MPa exceeds py ${form.designStrength} MPa — increase section size`,
      });
    if (results.deflectionStatus === 'FAIL')
      pdfRecs.push({
        check: 'Deflection Failure',
        suggestion: `Deflection exceeds L/${form.deflectionLimit} limit — increase Ix (need ≥${results.requiredIx.toFixed(0)} cm⁴)`,
      });
    if (parseFloat(form.span) > 3.0)
      pdfRecs.push({
        check: 'Long Span',
        suggestion: 'Span > 3.0m — consider intermediate support or paired needles',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Bending stress and deflection within allowable limits',
      });
    generateDOCX({
      title: 'Needle Beam Design',
      subtitle: 'Steel Beam Analysis for Temporary Support',
      projectInfo: [
        { label: 'Project', value: 'Needle Beam Design' },
        { label: 'Reference', value: 'NEE001' },
        { label: 'Standard', value: 'BS 5975 / BS 449' },
      ],
      inputs: [
        { label: 'Section', value: section ? section.name : 'Custom' },
        { label: 'Effective Span', value: `${form.span} m` },
        { label: 'Wall Load', value: `${form.wallLoad} kN/m²` },
        { label: 'Wall Thickness', value: `${form.wallThickness} mm` },
        { label: 'Wall Height', value: `${form.wallHeight} m` },
        { label: 'No. Needles', value: form.numNeedles },
        { label: 'Needle Spacing', value: `${form.needleSpacing} m` },
        { label: 'Design Strength (py)', value: `${form.designStrength} MPa` },
        { label: 'Deflection Limit', value: `L/${form.deflectionLimit}` },
      ],
      sections: [
        {
          title: 'Beam Analysis Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Load per Needle', results.loadPerNeedle.toFixed(1), 'kN'],
            ['Max Moment', results.moment.toFixed(2), 'kNm'],
            ['Max Shear', results.shear.toFixed(1), 'kN'],
            ['Bending Stress', results.stress.toFixed(1), 'MPa'],
            ['Stress Utilisation', results.utilisationStress.toFixed(1), '%'],
            ['Deflection', results.deflection.toFixed(2), 'mm'],
            ['Allowable Deflection', results.allowableDeflection.toFixed(2), 'mm'],
            ['Deflection Utilisation', results.utilisationDeflection.toFixed(1), '%'],
            ['Required Ix', results.requiredIx.toFixed(0), 'cm⁴'],
          ],
        },
      ],
      checks: [
        {
          name: 'Bending Stress',
          capacity: `${form.designStrength} MPa`,
          utilisation: String(Math.round(results.utilisationStress)),
          status: results.stressStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `L/${form.deflectionLimit}`,
          utilisation: String(Math.round(results.utilisationDeflection)),
          status: results.deflectionStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Needle Beam Design',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.05,
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-800/20 via-transparent to-orange-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl mb-4">
            <FiZap className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">TEMPORARY | PROPPING</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-2">Needle Beam Design</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Steel needle beam analysis for masonry wall support during structural alterations.
          </p>
        </motion.div>

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

        {/* Status Banner */}
        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mb-8 p-4 rounded-xl border-2 shadow-lg flex items-center justify-between',
              results.overallStatus === 'PASS'
                ? 'bg-green-950/30 border-green-500/30'
                : 'bg-red-950/30 border-red-500/30',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  results.overallStatus === 'PASS' ? 'bg-green-500/20' : 'bg-red-500/20',
                )}
              >
                {results.overallStatus === 'PASS' ? (
                  <FiCheck className="w-6 h-6 text-green-400" />
                ) : (
                  <FiX className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div>
                <div
                  className={cn(
                    'text-xl font-bold',
                    results.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400',
                  )}
                >
                  {results.overallStatus === 'PASS' ? 'Design Adequate' : 'Design Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  {BEAM_SECTIONS[form.sectionKey]?.name || 'Custom'} | L = {form.span}m | M ={' '}
                  {results.moment.toFixed(2)} kNm
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton calculatorKey="needle-beam" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
            </div>
          </motion.div>
        )}

        {/* Warnings */}

        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6 space-y-2"
          >
            {warnings.map((warning, i) => (
              <div
                key={i}
                className={cn(
                  'px-4 py-3 rounded-lg flex items-center gap-3 text-sm',
                  warning.type === 'error' && 'bg-red-950/50 border border-red-500/30 text-red-300',
                  warning.type === 'warning' &&
                    'bg-yellow-950/50 border border-yellow-500/30 text-yellow-300',
                  warning.type === 'info' &&
                    'bg-blue-950/50 border border-blue-500/30 text-blue-300',
                )}
              >
                {warning.type === 'error' && <FiX className="w-4 h-4" />}
                {warning.type === 'warning' && <FiAlertTriangle className="w-4 h-4" />}
                {warning.type === 'info' && <FiInfo className="w-4 h-4" />}
                {warning.message}
              </div>
            ))}
            {/* Main Grid */}
            <AnimatePresence mode="wait">
              {activeTab === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid lg:grid-cols-3 gap-6"
                >
                  {/* Inputs */}
                  <div className="lg:col-span-4 space-y-4">
                    {/* Beam Section */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('beam')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiZap className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Beam Section</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.beam && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.beam && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Steel Section
                              </label>
                              <select
                                title="Steel Section"
                                value={form.sectionKey}
                                onChange={(e) => setForm({ ...form, sectionKey: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(BEAM_SECTIONS).map(([key, section]) => (
                                  <option key={key} value={key}>
                                    {section.name}{' '}
                                    {section.mass > 0 ? `(${section.mass} kg/m)` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {form.sectionKey === 'custom' && (
                              <div className="grid grid-cols-3 gap-2">
                                <InputField
                                  label="Ix"
                                  value={form.customIx}
                                  onChange={(v) => setForm({ ...form, customIx: v })}
                                  unit="cm⁴"
                                />
                                <InputField
                                  label="Zx"
                                  value={form.customZx}
                                  onChange={(v) => setForm({ ...form, customZx: v })}
                                  unit="cm³"
                                />
                                <InputField
                                  label="Depth"
                                  value={form.customDepth}
                                  onChange={(v) => setForm({ ...form, customDepth: v })}
                                  unit="mm"
                                />
                              </div>
                            )}
                            <InputField
                              label="Effective Span"
                              value={form.span}
                              onChange={(v) => setForm({ ...form, span: v })}
                              unit="m"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Wall Loading */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('wall')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Wall Loading</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.wall && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.wall && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Wall Type
                              </label>
                              <select
                                title="Wall Type"
                                value={selectedWall}
                                onChange={(e) => applyWallPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(WALL_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Wall Load"
                                value={form.wallLoad}
                                onChange={(v) => setForm({ ...form, wallLoad: v })}
                                unit="kN/m"
                              />
                              <InputField
                                label="Wall Height"
                                value={form.wallHeight}
                                onChange={(v) => setForm({ ...form, wallHeight: v })}
                                unit="m"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Num. Needles"
                                value={form.numNeedles}
                                onChange={(v) => setForm({ ...form, numNeedles: v })}
                                unit=""
                              />
                              <InputField
                                label="Spacing"
                                value={form.needleSpacing}
                                onChange={(v) => setForm({ ...form, needleSpacing: v })}
                                unit="m"
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Design Parameters */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('design')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Design Parameters</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.design && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.design && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <InputField
                              label="Design Strength (py)"
                              value={form.designStrength}
                              onChange={(v) => setForm({ ...form, designStrength: v })}
                              unit="MPa"
                            />
                            <InputField
                              label="Deflection Limit (L/n)"
                              value={form.deflectionLimit}
                              onChange={(v) => setForm({ ...form, deflectionLimit: v })}
                              unit=""
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>
                  </div>

                  {/* Visualization & Results */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Calculate Button */}
                    <button
                      type="button"
                      onClick={calculate}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>

                    {/* Fullscreen Preview Overlay */}
                    {previewMaximized && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                      >
                        {/* 3D Scene */}
                        <div className="flex-1 relative">
                          <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                            <NeedleBeam3D />
                          </Interactive3DDiagram>
                          <button
                            onClick={() => setPreviewMaximized(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                            aria-label="Minimize preview"
                          >
                            <FiMinimize2 size={20} />
                          </button>
                          <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                            NEEDLE BEAM — REAL-TIME PREVIEW
                          </div>
                        </div>

                        {/* Right sidebar — live parameters & stats */}
                        <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                          <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                            <FiSliders size={14} /> Live Parameters
                          </h3>

                          {[
                            { label: 'Span', field: 'span' as keyof FormData, min: 0.5, max: 6, step: 0.1, unit: 'm' },
                            { label: 'Wall Load', field: 'wallLoad' as keyof FormData, min: 5, max: 100, step: 1, unit: 'kN/m' },
                            { label: 'Wall Thickness', field: 'wallThickness' as keyof FormData, min: 100, max: 500, step: 5, unit: 'mm' },
                            { label: 'Wall Height', field: 'wallHeight' as keyof FormData, min: 1, max: 6, step: 0.1, unit: 'm' },
                            { label: 'Num Needles', field: 'numNeedles' as keyof FormData, min: 1, max: 10, step: 1, unit: '' },
                            { label: 'Needle Spacing', field: 'needleSpacing' as keyof FormData, min: 0.3, max: 3, step: 0.1, unit: 'm' },
                            { label: 'Design Strength', field: 'designStrength' as keyof FormData, min: 235, max: 460, step: 5, unit: 'MPa' },
                          ].map((s) => (
                            <div key={s.field} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-400">{s.label}</span>
                                <span className="text-white">{form[s.field]} {s.unit}</span>
                              </div>
                              <input
                                title={s.label}
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={s.step}
                                value={form[s.field] as string}
                                onChange={(e) => updateForm(s.field, e.target.value)}
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
                              { label: 'Section', value: form.sectionKey || '—' },
                              { label: 'Deflection Limit', value: `L/${form.deflectionLimit}` },
                              { label: 'Total Needles', value: form.numNeedles },
                              { label: 'Spacing', value: `${form.needleSpacing} m` },
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
                                  { label: 'Bending', util: results.utilisationStress?.toFixed(0), status: results.stressStatus },
                                  { label: 'Deflection', util: results.utilisationDeflection?.toFixed(0), status: results.deflectionStatus },
                                  { label: 'Overall', util: null, status: results.overallStatus },
                                ].map((check) => (
                                  <div key={check.label} className="flex justify-between text-xs py-0.5">
                                    <span className="text-gray-500">{check.label}</span>
                                    <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : parseFloat(check.util || '0') > 90 ? 'text-orange-400' : 'text-emerald-400')}>
                                      {check.util ? `${check.util}%` : check.status}
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

                    <WhatIfPreview
                      title="Needle Beam — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <NeedleBeam3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="sticky top-8">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard
                          label="Bending Stress"
                          value={`${results.stress.toFixed(0)} MPa`}
                          util={`${results.utilisationStress.toFixed(0)}%`}
                          status={results.stressStatus}
                        />
                        <ResultCard
                          label="Deflection"
                          value={`${results.deflection.toFixed(1)} mm`}
                          util={`${results.utilisationDeflection.toFixed(0)}%`}
                          status={results.deflectionStatus}
                        />
                        <ResultCard
                          label="Max Moment"
                          value={`${results.moment.toFixed(2)} kNm`}
                          util=""
                          status="info"
                        />
                        <ResultCard
                          label="Load/Needle"
                          value={`${results.loadPerNeedle.toFixed(1)} kN`}
                          util=""
                          status="info"
                        />
                        </div>
                      </div>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiInfo className="text-neon-cyan" />
                            Design Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Max Shear</div>
                              <div className="text-white font-mono">
                                {results.shear.toFixed(1)} kN
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Allowable Defl
                              </div>
                              <div className="text-green-400 font-mono">
                                {results.allowableDeflection.toFixed(1)} mm
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Required Ix
                              </div>
                              <div className="text-amber-400 font-mono">
                                {results.requiredIx.toFixed(0)} cm⁴
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Beam Weight
                              </div>
                              <div className="text-white font-mono">
                                {(
                                  (BEAM_SECTIONS[form.sectionKey]?.mass || 25) *
                                  parseFloat(form.span)
                                ).toFixed(1)}{' '}
                                kg
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results &&
                      (() => {
                        const recs: { icon: string; text: string }[] = [];
                        if (results.stressStatus === 'FAIL')
                          recs.push({
                            icon: '🔴',
                            text: `Bending stress ${results.stress.toFixed(0)} MPa exceeds py ${form.designStrength} MPa`,
                          });
                        if (results.deflectionStatus === 'FAIL')
                          recs.push({
                            icon: '🔴',
                            text: `Deflection exceeds L/${form.deflectionLimit} — need Ix ≥ ${results.requiredIx.toFixed(0)} cm⁴`,
                          });
                        if (results.utilisationStress > 85 && results.utilisationStress <= 100)
                          recs.push({
                            icon: '⚠️',
                            text: `Stress utilisation at ${results.utilisationStress.toFixed(0)}% — consider larger section`,
                          });
                        if (parseFloat(form.span) > 3.0)
                          recs.push({
                            icon: '📐',
                            text: 'Span > 3.0m — consider intermediate support or paired needles',
                          });
                        if (recs.length === 0)
                          recs.push({
                            icon: '✅',
                            text: 'Bending stress and deflection within allowable limits',
                          });
                        return (
                          <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                            <CardHeader className="py-3">
                              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <FiInfo className="text-neon-cyan" />
                                Recommendations
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {recs.map((r, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-gray-300"
                                >
                                  <span>{r.icon}</span>
                                  <span>{r.text}</span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        );
                      })()}

                    <div className="lg:hidden">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={exportPDF}
                          className="w-full bg-gradient-to-r from-amber-600 to-orange-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-amber-600 to-orange-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          DOCX
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const InputField = ({
  label,
  value,
  onChange,
  unit,
  field,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  field?: string;
}) => (
  <div>
    <ExplainableLabel
      label={`${label}${unit ? ` (${unit})` : ''}`}
      field={field || 'needle-beam'}
    />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono"
    />
  </div>
);

const ResultCard = ({
  label,
  value,
  util,
  status,
}: {
  label: string;
  value: string;
  util: string;
  status: 'PASS' | 'FAIL' | 'info';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 text-center shadow-2xl',
      status === 'PASS' && 'border-l-4 border-green-500 bg-green-950/20 shadow-green-500/5',
      status === 'FAIL' && 'border-l-4 border-red-500 bg-red-950/20 shadow-red-500/5',
      status === 'info' && 'border-l-4 border-amber-500 bg-amber-950/20 shadow-amber-500/5',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-xl font-bold font-mono',
        status === 'PASS' && 'text-green-400',
        status === 'FAIL' && 'text-red-400',
        status === 'info' && 'text-amber-400',
      )}
    >
      {value}
    </div>
    {util && <div className="text-xs text-gray-500 mt-1">{util}</div>}
    {status !== 'info' && (
      <div
        className={cn(
          'text-xs font-bold mt-2',
          status === 'PASS' ? 'text-green-600' : 'text-red-600',
        )}
      >
        {status}
      </div>
    )}
  </Card>
);

export default NeedleBeam;
