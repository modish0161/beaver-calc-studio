// =============================================================================
// BeaverCalc Studio — Trench Support Analysis (Premium)
// Rankine earth pressure + strut capacity verification
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMinimize2,
  FiSettings,
  FiSliders,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import TrenchSupport3D from '../../components/3d/scenes/TrenchSupport3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  depth: string;
  width: string;
  surcharge: string;
  soil: string;
  strut: string;
  strutVSpacing: string;
  strutHSpacing: string;
  fos: string;
}

interface Results {
  ka: number;
  basePressure: number;
  totalForcePerMeter: number;
  wedgeWidth: number;
  strutLoad: number;
  strutCapacity: number;
  strutUtil: number;
  strutStatus: 'PASS' | 'FAIL';
  widthOk: boolean;
  widthStatus: 'PASS' | 'FAIL';
  overallStatus: 'PASS' | 'FAIL';
  rating: string;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// SOIL DATABASE
// =============================================================================

const SOILS: Record<
  string,
  { name: string; phi: number; gamma: number; c: number; color: string }
> = {
  stiff_clay: { name: 'Stiff Clay', phi: 22, gamma: 20, c: 50, color: '#7c5e42' },
  firm_clay: { name: 'Firm Clay', phi: 18, gamma: 19, c: 35, color: '#8b6914' },
  soft_clay: { name: 'Soft Clay', phi: 0, gamma: 18, c: 20, color: '#a68b6c' },
  dense_sand: { name: 'Dense Sand', phi: 35, gamma: 20, c: 0, color: '#e6c288' },
  loose_sand: { name: 'Loose Sand', phi: 30, gamma: 18, c: 0, color: '#f4dca8' },
  gravel: { name: 'Gravel / Fill', phi: 38, gamma: 21, c: 0, color: '#9ca3af' },
  made_ground: { name: 'Made Ground', phi: 28, gamma: 17, c: 0, color: '#6b7280' },
};

// =============================================================================
// STRUT DATABASE
// =============================================================================

const STRUTS: Record<string, { name: string; capacity: number; minW: number; maxW: number }> = {
  trench_strut_0: { name: 'Trench Strut 0 (0.3-0.5m)', capacity: 30, minW: 0.3, maxW: 0.5 },
  trench_strut_1: { name: 'Trench Strut 1 (0.5-0.7m)', capacity: 30, minW: 0.5, maxW: 0.7 },
  trench_strut_2: { name: 'Trench Strut 2 (0.7-1.1m)', capacity: 30, minW: 0.7, maxW: 1.1 },
  acrow_1: { name: 'Acrow Size 1 (1.75-3.12m)', capacity: 35, minW: 1.75, maxW: 3.12 },
  acrow_2: { name: 'Acrow Size 2 (1.98-3.40m)', capacity: 35, minW: 1.98, maxW: 3.4 },
  acrow_3: { name: 'Acrow Size 3 (2.59-3.96m)', capacity: 35, minW: 2.59, maxW: 3.96 },
  acrow_4: { name: 'Acrow Size 4 (3.12-4.88m)', capacity: 35, minW: 3.12, maxW: 4.88 },
  hydraulic_box: { name: 'Hydraulic Box Strut', capacity: 100, minW: 0.8, maxW: 3.0 },
  push_pull: { name: 'Push-Pull Prop', capacity: 50, minW: 0.5, maxW: 2.5 },
};

const PRESET_SCENARIOS: Record<
  string,
  { depth: string; width: string; surcharge: string; soil: string; strut: string; label: string }
> = {
  pipe_trench: {
    depth: '1.5',
    width: '0.9',
    surcharge: '10',
    soil: 'loose_sand',
    strut: 'trench_strut_2',
    label: 'Pipe Trench (1.5m)',
  },
  sewer: {
    depth: '2.5',
    width: '1.5',
    surcharge: '10',
    soil: 'soft_clay',
    strut: 'acrow_1',
    label: 'Sewer Trench (2.5m)',
  },
  foundation: {
    depth: '3.5',
    width: '2.0',
    surcharge: '20',
    soil: 'made_ground',
    strut: 'acrow_2',
    label: 'Foundation Strip (3.5m)',
  },
  deep_service: {
    depth: '4.5',
    width: '1.2',
    surcharge: '15',
    soil: 'stiff_clay',
    strut: 'acrow_1',
    label: 'Deep Services (4.5m)',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const TrenchSupport = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    soil: true,
    strut: false,
  });

  const [form, setForm] = useState<FormData>({
    depth: '2.5',
    width: '1.2',
    surcharge: '10',
    soil: 'loose_sand',
    strut: 'acrow_1',
    strutVSpacing: '1.0',
    strutHSpacing: '1.5',
    fos: '1.5',
  });
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'depth', label: 'Depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'width', label: 'Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'surcharge', label: 'Surcharge', min: 0, max: 100, step: 1, unit: '' },
    { key: 'soil', label: 'Soil', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATIONS — Rankine Earth Pressure + Strut Load
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'depth', label: 'Trench Depth' },
      { key: 'width', label: 'Trench Width' },
      { key: 'surcharge', label: 'Surcharge', allowZero: true },
      { key: 'strutVSpacing', label: 'Strut Vertical Spacing' },
      { key: 'strutHSpacing', label: 'Strut Horizontal Spacing' },
      { key: 'fos', label: 'Factor of Safety' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const H = parseFloat(form.depth);
    const W = parseFloat(form.width);
    const q = parseFloat(form.surcharge);
    const Sv = parseFloat(form.strutVSpacing);
    const Sh = parseFloat(form.strutHSpacing);
    const fos = parseFloat(form.fos);
    const soil = SOILS[form.soil];
    const strut = STRUTS[form.strut];

    if (isNaN(H) || H <= 0 || isNaN(W) || W <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid geometry' }]);
      return;
    }

    // Rankine active earth pressure coefficient
    const phiRad = (soil.phi * Math.PI) / 180;
    const ka = Math.pow(Math.tan(Math.PI / 4 - phiRad / 2), 2);

    // Lateral pressure at base
    let basePressure = ka * (soil.gamma * H + q) - 2 * soil.c * Math.sqrt(ka);
    if (basePressure < 0) basePressure = 0;

    // Minimum equivalent fluid (5 kN/m³) often required
    const minFluid = 5 * H;
    basePressure = Math.max(basePressure, minFluid);

    // Total force per meter (trapezoidal integration simplified)
    const topPressure = Math.max(0, ka * q - 2 * soil.c * Math.sqrt(ka));
    const totalForce = 0.5 * (topPressure + basePressure) * H;

    // Failure wedge width
    const wedgeWidth = H * Math.tan(Math.PI / 4 - phiRad / 2);

    // Strut load calculation (bottom strut receives max)
    const strutLoad = basePressure * Sv * Sh * fos;
    const strutUtil = (strutLoad / strut.capacity) * 100;
    const strutStatus = strutUtil <= 100 ? 'PASS' : 'FAIL';

    // Width check
    const widthOk = W >= strut.minW && W <= strut.maxW;
    const widthStatus = widthOk ? 'PASS' : 'FAIL';

    // Rating
    let rating: string;
    if (strutStatus === 'PASS' && widthStatus === 'PASS') {
      rating = strutUtil < 70 ? 'OPTIMAL' : 'ADEQUATE';
    } else {
      rating = 'CRITICAL';
    }

    const overallStatus = strutStatus === 'PASS' && widthStatus === 'PASS' ? 'PASS' : 'FAIL';

    // Warnings
    if (strutStatus === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: `Strut overloaded: ${strutLoad.toFixed(1)} kN > ${strut.capacity} kN capacity`,
      });
    }
    if (!widthOk) {
      newWarnings.push({
        type: 'error',
        message: `Trench width ${W}m outside strut range ${strut.minW}-${strut.maxW}m`,
      });
    }
    if (strutUtil > 80 && strutUtil <= 100) {
      newWarnings.push({
        type: 'warning',
        message: `Strut utilisation ${strutUtil.toFixed(0)}% — near limit`,
      });
    }
    if (H > 4.0) {
      newWarnings.push({ type: 'info', message: 'Deep excavation (>4m) — consider CDM review' });
    }
    if (soil.c === 0 && H > 1.2) {
      newWarnings.push({
        type: 'info',
        message: 'Granular soil — assume unsupported cuts unsafe below 1.2m',
      });
    }

    setResults({
      ka,
      basePressure,
      totalForcePerMeter: totalForce,
      wedgeWidth,
      strutLoad,
      strutCapacity: strut.capacity,
      strutUtil,
      strutStatus,
      widthOk,
      widthStatus,
      overallStatus,
      rating,
    });

    setWarnings(newWarnings);
  }, [form]);

  // ===========================================================================
  // CANVAS VISUALIZATION
  // ===========================================================================

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
  ) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const headLen = 6;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6),
      y2 - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6),
      y2 - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  };

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applyPreset = (key: string) => {
    const preset = PRESET_SCENARIOS[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        depth: preset.depth,
        width: preset.width,
        surcharge: preset.surcharge,
        soil: preset.soil,
        strut: preset.strut,
      }));
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
    const soil = SOILS[form.soil];
    const strut = STRUTS[form.strut];
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.strutStatus === 'FAIL')
      pdfRecs.push({
        check: 'Strut Overloaded',
        suggestion: `Strut load ${results.strutLoad.toFixed(1)} kN exceeds capacity ${strut.capacity} kN — use larger strut or reduce spacing`,
      });
    if (!results.widthOk)
      pdfRecs.push({
        check: 'Width Mismatch',
        suggestion: `Trench width ${form.width}m outside strut range ${strut.minW}–${strut.maxW}m`,
      });
    if (results.strutUtil > 80 && results.strutUtil <= 100)
      pdfRecs.push({
        check: 'Near Limit',
        suggestion: `Strut utilisation ${results.strutUtil.toFixed(0)}% — consider next size up`,
      });
    if (parseFloat(form.depth) > 4.0)
      pdfRecs.push({
        check: 'Deep Excavation',
        suggestion: 'Depth > 4m — requires CDM review and temporary works coordinator',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Strut selection and trench geometry are satisfactory',
      });
    generatePremiumPDF({
      title: 'Trench Support',
      subtitle: 'Rankine Earth Pressure & Strut Check',
      projectInfo: [
        { label: 'Project', value: 'Trench Support' },
        { label: 'Reference', value: 'TRE001' },
        { label: 'Standard', value: 'Rankine / BS 6031' },
      ],
      inputs: [
        { label: 'Trench Depth', value: `${form.depth} m` },
        { label: 'Trench Width', value: `${form.width} m` },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
        { label: 'Soil Type', value: soil?.name || form.soil },
        { label: 'Strut Type', value: strut?.name || form.strut },
        { label: 'Vert. Spacing', value: `${form.strutVSpacing} m` },
        { label: 'Horiz. Spacing', value: `${form.strutHSpacing} m` },
        { label: 'Factor of Safety', value: form.fos },
      ],
      sections: [
        {
          title: 'Earth Pressure & Strut Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Active Coefficient (Ka)', results.ka.toFixed(3), ''],
            ['Base Pressure', results.basePressure.toFixed(1), 'kPa'],
            ['Total Force/m', results.totalForcePerMeter.toFixed(1), 'kN/m'],
            ['Failure Wedge Width', results.wedgeWidth.toFixed(2), 'm'],
            ['Strut Load (factored)', results.strutLoad.toFixed(1), 'kN'],
            ['Strut Capacity', String(results.strutCapacity), 'kN'],
            ['Strut Utilisation', results.strutUtil.toFixed(0), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Strut Capacity',
          capacity: `${results.strutCapacity} kN`,
          utilisation: String(Math.round(results.strutUtil)),
          status: results.strutStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Width Compatibility',
          capacity: `${strut.minW}–${strut.maxW} m`,
          utilisation: results.widthOk ? '100' : '0',
          status: results.widthStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Trench Support',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const soil = SOILS[form.soil];
    const strut = STRUTS[form.strut];
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.strutStatus === 'FAIL')
      pdfRecs.push({
        check: 'Strut Overloaded',
        suggestion: `Strut load ${results.strutLoad.toFixed(1)} kN exceeds capacity ${strut.capacity} kN — use larger strut or reduce spacing`,
      });
    if (!results.widthOk)
      pdfRecs.push({
        check: 'Width Mismatch',
        suggestion: `Trench width ${form.width}m outside strut range ${strut.minW}–${strut.maxW}m`,
      });
    if (results.strutUtil > 80 && results.strutUtil <= 100)
      pdfRecs.push({
        check: 'Near Limit',
        suggestion: `Strut utilisation ${results.strutUtil.toFixed(0)}% — consider next size up`,
      });
    if (parseFloat(form.depth) > 4.0)
      pdfRecs.push({
        check: 'Deep Excavation',
        suggestion: 'Depth > 4m — requires CDM review and temporary works coordinator',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Strut selection and trench geometry are satisfactory',
      });
    generateDOCX({
      title: 'Trench Support',
      subtitle: 'Rankine Earth Pressure & Strut Check',
      projectInfo: [
        { label: 'Project', value: 'Trench Support' },
        { label: 'Reference', value: 'TRE001' },
        { label: 'Standard', value: 'Rankine / BS 6031' },
      ],
      inputs: [
        { label: 'Trench Depth', value: `${form.depth} m` },
        { label: 'Trench Width', value: `${form.width} m` },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
        { label: 'Soil Type', value: soil?.name || form.soil },
        { label: 'Strut Type', value: strut?.name || form.strut },
        { label: 'Vert. Spacing', value: `${form.strutVSpacing} m` },
        { label: 'Horiz. Spacing', value: `${form.strutHSpacing} m` },
        { label: 'Factor of Safety', value: form.fos },
      ],
      sections: [
        {
          title: 'Earth Pressure & Strut Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Active Coefficient (Ka)', results.ka.toFixed(3), ''],
            ['Base Pressure', results.basePressure.toFixed(1), 'kPa'],
            ['Total Force/m', results.totalForcePerMeter.toFixed(1), 'kN/m'],
            ['Failure Wedge Width', results.wedgeWidth.toFixed(2), 'm'],
            ['Strut Load (factored)', results.strutLoad.toFixed(1), 'kN'],
            ['Strut Capacity', String(results.strutCapacity), 'kN'],
            ['Strut Utilisation', results.strutUtil.toFixed(0), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Strut Capacity',
          capacity: `${results.strutCapacity} kN`,
          utilisation: String(Math.round(results.strutUtil)),
          status: results.strutStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Width Compatibility',
          capacity: `${strut.minW}–${strut.maxW} m`,
          utilisation: results.widthOk ? '100' : '0',
          status: results.widthStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Trench Support',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 217, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Glass Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50"
        >
          <div className="flex items-center gap-2">
            <FiLayers className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider text-sm">
              GEOTECHNICS | TEMPORARY WORKS
            </span>
          </div>
          <div className="flex items-center gap-2">
            {results && (
              <>
                <Button
                  onClick={exportPDF}
                  className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </Button>
                <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
                <SaveRunButton
                  calculatorKey="trench-support"
                  inputs={form as unknown as Record<string, string | number>}
                  results={results}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                />
              </>
            )}
          </div>
        </motion.div>

        {/* Gradient Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-2">
            Trench Support
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Rankine earth pressure analysis and strutting capacity check for excavation support.
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
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg'
                  : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
            </Button>
          ))}
        </div>

        {/* Preset scenarios */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {Object.entries(PRESET_SCENARIOS).map(([key, preset]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(key)}
              className="bg-gray-800/30 border-gray-700/50 text-gray-300 hover:bg-neon-cyan/10 hover:border-neon-cyan/50"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Status Banner */}
        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mb-8 p-4 rounded-2xl border-2 shadow-lg flex items-center justify-between backdrop-blur-md',
              results.overallStatus === 'PASS'
                ? 'bg-green-950/30 border-green-500/30'
                : 'bg-red-950/30 border-red-500/30',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
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
                  {results.rating} — Strut {results.strutUtil.toFixed(0)}%
                </div>
                <div className="text-gray-400 text-sm">
                  Load: {results.strutLoad.toFixed(1)} kN | Capacity: {results.strutCapacity} kN
                </div>
              </div>
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
                    {/* Geometry */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('geometry')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiGrid className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Trench Geometry
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.geometry && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.geometry && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Depth"
                                value={form.depth}
                                onChange={(v) => setForm({ ...form, depth: v })}
                                unit="m"
                              />
                              <InputField
                                label="Width"
                                value={form.width}
                                onChange={(v) => setForm({ ...form, width: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Surcharge"
                              value={form.surcharge}
                              onChange={(v) => setForm({ ...form, surcharge: v })}
                              unit="kPa"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Soil */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('soil')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Ground Conditions
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.soil && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.soil && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Soil Type
                              </label>
                              <select
                                title="Soil Type"
                                value={form.soil}
                                onChange={(e) => setForm({ ...form, soil: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(SOILS).map(([key, s]) => (
                                  <option key={key} value={key}>
                                    {s.name} (ϕ={s.phi}°)
                                  </option>
                                ))}
                              </select>
                            </div>
                            {SOILS[form.soil] && (
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-black/30 rounded p-2 text-center">
                                  <span className="text-gray-500 block">γ</span>
                                  <span className="text-white">{SOILS[form.soil].gamma} kN/m³</span>
                                </div>
                                <div className="bg-black/30 rounded p-2 text-center">
                                  <span className="text-gray-500 block">c'</span>
                                  <span className="text-white">{SOILS[form.soil].c} kPa</span>
                                </div>
                                <div className="bg-black/30 rounded p-2 text-center">
                                  <span className="text-gray-500 block">ϕ'</span>
                                  <span className="text-white">{SOILS[form.soil].phi}°</span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Calculate Button */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center py-2"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev }));
                          setActiveTab('results');
                        }}
                        className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                      >
                        <FiZap className="inline mr-2" />
                        RUN FULL ANALYSIS
                      </button>
                    </motion.div>

                    {/* Strut */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('strut')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Strut Configuration
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.strut && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.strut && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Strut Type
                              </label>
                              <select
                                title="Strut Type"
                                value={form.strut}
                                onChange={(e) => setForm({ ...form, strut: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(STRUTS).map(([key, s]) => (
                                  <option key={key} value={key}>
                                    {s.name} ({s.capacity}kN)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Vert Spacing"
                                value={form.strutVSpacing}
                                onChange={(v) => setForm({ ...form, strutVSpacing: v })}
                                unit="m"
                              />
                              <InputField
                                label="Horiz Spacing"
                                value={form.strutHSpacing}
                                onChange={(v) => setForm({ ...form, strutHSpacing: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Factor of Safety"
                              value={form.fos}
                              onChange={(v) => setForm({ ...form, fos: v })}
                              unit=""
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>
                  </div>

                  {/* Visualization & Results — Sticky Sidebar */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="sticky top-8">
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
                              <TrenchSupport3D />
                            </Interactive3DDiagram>
                            <button
                              onClick={() => setPreviewMaximized(false)}
                              className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                              aria-label="Minimize preview"
                            >
                              <FiMinimize2 size={20} />
                            </button>
                            <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                              TRENCH SUPPORT — REAL-TIME PREVIEW
                            </div>
                          </div>
                          <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                            <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                              <FiSliders size={14} /> Live Parameters
                            </h3>
                            {whatIfSliders.map((s) => (
                              <div key={s.key} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-400">{s.label}</span>
                                  <span className="text-white font-mono">
                                    {form[s.key as keyof FormData]} {s.unit}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={s.min}
                                  max={s.max}
                                  step={s.step}
                                  value={parseFloat(String(form[s.key as keyof FormData])) || s.min}
                                  onChange={(e) =>
                                    updateForm(s.key as keyof FormData, e.target.value)
                                  }
                                  title={s.label}
                                  className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                                />
                              </div>
                            ))}
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
                        title="Trench Support — 3D Preview"
                        sliders={whatIfSliders}
                        form={form}
                        updateForm={updateForm}
                        status={
                          (results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined
                        }
                        onMaximize={() => setPreviewMaximized(true)}
                        renderScene={(fsHeight) => (
                          <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                            <TrenchSupport3D />
                          </Interactive3DDiagram>
                        )}
                      />

                      {results && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <ResultCard
                            label="Strut Load"
                            value={`${results.strutUtil.toFixed(0)}%`}
                            limit="≤ 100%"
                            status={
                              results.strutStatus === 'PASS'
                                ? results.strutUtil < 70
                                  ? 'pass'
                                  : 'warning'
                                : 'fail'
                            }
                          />
                          <ResultCard
                            label="Strut Width"
                            value={results.widthOk ? 'OK' : 'MISMATCH'}
                            limit={`${STRUTS[form.strut].minW}-${STRUTS[form.strut].maxW}m`}
                            status={results.widthStatus === 'PASS' ? 'pass' : 'fail'}
                          />
                          <ResultCard
                            label="Base Pressure"
                            value={`${results.basePressure.toFixed(0)} kPa`}
                            limit=""
                            status="info"
                          />
                          <ResultCard
                            label="Ka"
                            value={results.ka.toFixed(3)}
                            limit={`Wedge: ${results.wedgeWidth.toFixed(1)}m`}
                            status="info"
                          />
                        </div>
                      )}

                      {results && (
                        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                          <CardHeader className="py-3">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                                <FiInfo className="w-6 h-6 text-neon-cyan" />
                              </div>
                              Design Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Total Force
                                </div>
                                <div className="text-white font-mono">
                                  {results.totalForcePerMeter.toFixed(1)} kN/m
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Strut Load
                                </div>
                                <div className="text-amber-400 font-mono">
                                  {results.strutLoad.toFixed(1)} kN
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Strut Capacity
                                </div>
                                <div className="text-white font-mono">
                                  {results.strutCapacity} kN
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Wedge Width
                                </div>
                                <div className="text-yellow-400 font-mono">
                                  {results.wedgeWidth.toFixed(2)}m
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {results &&
                        (() => {
                          const recs: { icon: string; text: string }[] = [];
                          if (results.strutStatus === 'FAIL')
                            recs.push({
                              icon: '🔴',
                              text: `Strut overloaded (${results.strutUtil.toFixed(0)}%) — use larger strut or reduce spacing`,
                            });
                          if (!results.widthOk)
                            recs.push({
                              icon: '🔴',
                              text: `Trench width outside strut range — select compatible strut`,
                            });
                          if (results.strutUtil > 80 && results.strutUtil <= 100)
                            recs.push({
                              icon: '⚠️',
                              text: 'Strut near capacity limit — consider next size up for margin',
                            });
                          if (parseFloat(form.depth) > 4.0)
                            recs.push({
                              icon: '📐',
                              text: 'Deep excavation (>4m) — CDM review required',
                            });
                          if (recs.length === 0)
                            recs.push({
                              icon: '✅',
                              text: 'Trench support design is adequate — strut and width checks pass',
                            });
                          return (
                            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                              <CardHeader className="py-3">
                                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                                    <FiInfo className="w-6 h-6 text-neon-cyan" />
                                  </div>
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
                            className="w-full bg-gradient-to-r from-neon-cyan to-neon-blue"
                            disabled={!results}
                          >
                            <FiDownload className="mr-2" />
                            Export PDF Report
                          </Button>
                          <Button
                            onClick={exportDOCX}
                            className="w-full bg-gradient-to-r from-neon-purple to-neon-blue"
                            disabled={!results}
                          >
                            <FiDownload className="mr-2" />
                            DOCX
                          </Button>
                        </div>
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
      field={field || 'trench-support'}
    />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono"
    />
  </div>
);

const ResultCard = ({
  label,
  value,
  limit,
  status,
}: {
  label: string;
  value: string;
  limit: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 text-center shadow-2xl border-l-4',
      status === 'pass' && 'border-l-green-500 border-neon-cyan/30',
      status === 'fail' && 'border-l-red-500 border-neon-cyan/30',
      status === 'warning' && 'border-l-yellow-500 border-neon-cyan/30',
      status === 'info' && 'border-l-neon-cyan border-neon-cyan/30',
    )}
  >
    <div className="text-xs uppercase text-gray-400 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' && 'text-green-400',
        status === 'fail' && 'text-red-400',
        status === 'warning' && 'text-yellow-400',
        status === 'info' && 'text-neon-cyan',
      )}
    >
      {value}
    </div>
    {limit && <div className="text-xs text-gray-400 mt-1">{limit}</div>}
    {status !== 'info' && (
      <div
        className={cn(
          'text-xs font-bold mt-2',
          status === 'pass' && 'text-green-500',
          status === 'fail' && 'text-red-500',
          status === 'warning' && 'text-yellow-500',
        )}
      >
        {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'MARGINAL'}
      </div>
    )}
  </Card>
);

export default TrenchSupport;
