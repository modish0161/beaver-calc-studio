// =============================================================================
// BeaverCalc Studio — Legato Wall Calculator (Premium)
// Interlocking concrete block wall stability analysis
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiBox,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiInfo,
    FiLayers,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiX
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import LegatoWall3D from '../../components/3d/scenes/LegatoWall3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  courses: string;
  configuration: string;
  surcharge: string;
  soilPhi: string;
  soilGamma: string;
  frictionCoeff: string;
  bearingCapacity: string;
  backfillSlope: string;
}

interface Results {
  height: number;
  fosSliding: number;
  fosOverturning: number;
  fosBearing: number;
  qMax: number;
  qMin: number;
  eccentricity: number;
  drivingForce: number;
  resistingForce: number;
  overturningMoment: number;
  resistingMoment: number;
  wallWeight: number;
  baseWidth: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// CONSTANTS & PRESETS
// =============================================================================

const BLOCK_DIMENSIONS = {
  height: 0.8,
  width: 0.8,
  length: 1.6,
  density: 24, // kN/m³
};

const CONFIG_PRESETS: Record<string, { width: number; label: string; description: string }> = {
  single: { width: 0.8, label: 'Single Stack', description: '800mm width' },
  double: { width: 1.6, label: 'Double Stack', description: '1600mm width' },
  stepped: { width: 1.2, label: 'Stepped (1.5B)', description: '1200mm avg width' },
  pyramid: { width: 2.0, label: 'Pyramid Base', description: '2000mm base' },
};

const SOIL_PRESETS: Record<string, { phi: string; gamma: string; label: string }> = {
  sand_loose: { phi: '28', gamma: '17', label: 'Loose Sand' },
  sand_medium: { phi: '32', gamma: '18', label: 'Medium Sand' },
  sand_dense: { phi: '36', gamma: '19', label: 'Dense Sand' },
  gravel: { phi: '38', gamma: '20', label: 'Gravel' },
  clay_stiff: { phi: '25', gamma: '19', label: 'Stiff Clay' },
  fill: { phi: '30', gamma: '18', label: 'Granular Fill' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const LegatoWall = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    soil: true,
    foundation: false,
  });

  const [form, setForm] = useState<FormData>({
    courses: '4',
    configuration: 'single',
    surcharge: '10',
    soilPhi: '30',
    soilGamma: '18',
    frictionCoeff: '0.5',
    bearingCapacity: '150',
    backfillSlope: '0',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'courses', label: 'Courses' },
  { key: 'surcharge', label: 'Surcharge' },
  { key: 'soilPhi', label: 'Soil Phi' },
  { key: 'soilGamma', label: 'Soil Gamma' },
  { key: 'frictionCoeff', label: 'Friction Coeff' },
  { key: 'bearingCapacity', label: 'Bearing Capacity' },
  { key: 'backfillSlope', label: 'Backfill Slope' },
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
    { key: 'courses', label: 'Courses', min: 0, max: 100, step: 1, unit: '' },
    { key: 'configuration', label: 'Configuration', min: 0, max: 100, step: 1, unit: '' },
    { key: 'surcharge', label: 'Surcharge', min: 0, max: 100, step: 1, unit: '' },
    { key: 'soilPhi', label: 'Soil Phi', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedSoil, setSelectedSoil] = useState<string>('fill');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    if (!validateInputs()) return;
    const newWarnings: Warning[] = [];

    try {
      const N = parseInt(form.courses) || 1;
      const H = N * BLOCK_DIMENSIONS.height;
      const phi = (parseFloat(form.soilPhi) * Math.PI) / 180;
      const gamma = parseFloat(form.soilGamma);
      const q = parseFloat(form.surcharge);
      const mu = parseFloat(form.frictionCoeff);
      const qBearing = parseFloat(form.bearingCapacity);
      const beta = (parseFloat(form.backfillSlope) * Math.PI) / 180;

      const config = CONFIG_PRESETS[form.configuration];
      const B = config ? config.width : 0.8;

      if (N <= 0 || H <= 0) {
        newWarnings.push({ type: 'error', message: 'Invalid wall geometry' });
        setWarnings(newWarnings);
        return;
      }

      // Wall weight per meter run
      const wallWeight = H * B * BLOCK_DIMENSIONS.density;

      // Active earth pressure coefficient (Rankine with backfill slope)
      let Ka: number;
      if (beta > 0) {
        Ka =
          (Math.cos(beta) *
            (Math.cos(beta) -
              Math.sqrt(Math.pow(Math.cos(beta), 2) - Math.pow(Math.cos(phi), 2)))) /
          (Math.cos(beta) + Math.sqrt(Math.pow(Math.cos(beta), 2) - Math.pow(Math.cos(phi), 2)));
      } else {
        Ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
      }

      // Driving forces
      const Pa_soil = 0.5 * Ka * gamma * H * H;
      const Pa_q = Ka * q * H;
      const drivingForce = Pa_soil + Pa_q;

      // Overturning moments about toe
      const Ma_soil = Pa_soil * (H / 3);
      const Ma_q = Pa_q * (H / 2);
      const overturningMoment = Ma_soil + Ma_q;

      // Resisting forces
      const resistingForce = wallWeight * mu;
      const resistingMoment = wallWeight * (B / 2);

      // Factors of safety
      const fosSliding = resistingForce / drivingForce;
      const fosOverturning = resistingMoment / overturningMoment;

      // Bearing pressure (Meyerhof)
      const M_net = resistingMoment - overturningMoment;
      const x_bar = M_net / wallWeight;
      const eccentricity = B / 2 - x_bar;

      let qMax: number;
      let qMin: number;

      if (eccentricity > B / 6) {
        // Triangular distribution
        qMax = (2 * wallWeight) / (3 * x_bar);
        qMin = 0;
        newWarnings.push({
          type: 'warning',
          message: 'Resultant outside middle third - base tension',
        });
      } else {
        qMax = (wallWeight / B) * (1 + (6 * eccentricity) / B);
        qMin = (wallWeight / B) * (1 - (6 * eccentricity) / B);
      }

      const fosBearing = qBearing / qMax;

      // Warnings
      if (fosSliding < 1.5 && fosSliding >= 1.0) {
        newWarnings.push({
          type: 'warning',
          message: `Sliding FOS ${fosSliding.toFixed(2)} < 1.5`,
        });
      }
      if (fosOverturning < 2.0 && fosOverturning >= 1.5) {
        newWarnings.push({
          type: 'warning',
          message: `Overturning FOS ${fosOverturning.toFixed(2)} < 2.0`,
        });
      }
      if (fosBearing < 3.0 && fosBearing >= 2.0) {
        newWarnings.push({
          type: 'warning',
          message: `Bearing FOS ${fosBearing.toFixed(2)} < 3.0`,
        });
      }
      if (N > 6) {
        newWarnings.push({
          type: 'info',
          message: 'Consider double-stack or stepped configuration for heights > 4.8m',
        });
      }

      const overallStatus =
        fosSliding >= 1.5 && fosOverturning >= 1.5 && fosBearing >= 2.0 ? 'PASS' : 'FAIL';

      setResults({
        height: H,
        fosSliding,
        fosOverturning,
        fosBearing,
        qMax,
        qMin,
        eccentricity,
        drivingForce,
        resistingForce,
        overturningMoment,
        resistingMoment,
        wallWeight,
        baseWidth: B,
        overallStatus,
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

  const applySoilPreset = (key: string) => {
    const preset = SOIL_PRESETS[key];
    if (preset) {
      setSelectedSoil(key);
      setForm((prev) => ({ ...prev, soilPhi: preset.phi, soilGamma: preset.gamma }));
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
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.fosSliding < 1.5)
      pdfRecs.push({
        check: 'Sliding',
        suggestion: `FOS ${results.fosSliding.toFixed(2)} < 1.5 — increase base width or friction`,
      });
    if (results.fosOverturning < 2.0)
      pdfRecs.push({
        check: 'Overturning',
        suggestion: `FOS ${results.fosOverturning.toFixed(2)} < 2.0 — widen base or reduce height`,
      });
    if (results.fosBearing < 3.0)
      pdfRecs.push({
        check: 'Bearing',
        suggestion: `FOS ${results.fosBearing.toFixed(2)} < 3.0 — improve foundation or reduce bearing stress`,
      });
    if (results.eccentricity > results.baseWidth / 6)
      pdfRecs.push({
        check: 'Eccentricity',
        suggestion: 'Resultant outside middle third — base tension present',
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion: `Wall ${results.overallStatus === 'PASS' ? 'adequate' : 'inadequate'} — ${form.courses} courses, H=${results.height.toFixed(1)}m, B=${results.baseWidth.toFixed(1)}m`,
    });

    generatePremiumPDF({
      title: 'Legato Block Wall',
      subtitle: 'Interlocking Concrete Block Stability Analysis',
      projectInfo: [
        { label: 'Project', value: 'Legato Block Wall' },
        { label: 'Reference', value: 'LEG001' },
        { label: 'Block Size', value: '800×800×1600mm' },
      ],
      inputs: [
        { label: 'Number of Courses', value: form.courses },
        {
          label: 'Configuration',
          value: CONFIG_PRESETS[form.configuration]?.label || form.configuration,
        },
        { label: 'Base Width', value: results.baseWidth.toFixed(1), unit: 'm' },
        { label: 'Wall Height', value: results.height.toFixed(1), unit: 'm' },
        { label: "Soil φ'", value: form.soilPhi, unit: '°' },
        { label: 'Soil γ', value: form.soilGamma, unit: 'kN/m³' },
        { label: 'Surcharge', value: form.surcharge, unit: 'kPa' },
        { label: 'Base Friction (μ)', value: form.frictionCoeff },
        { label: 'Bearing Capacity', value: form.bearingCapacity, unit: 'kPa' },
        { label: 'Backfill Slope', value: form.backfillSlope, unit: '°' },
      ],
      sections: [
        {
          title: 'Stability Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Wall Weight', results.wallWeight.toFixed(1), 'kN/m'],
            ['Driving Force', results.drivingForce.toFixed(1), 'kN/m'],
            ['Resisting Force', results.resistingForce.toFixed(1), 'kN/m'],
            ['Overturning Moment', results.overturningMoment.toFixed(2), 'kNm/m'],
            ['Resisting Moment', results.resistingMoment.toFixed(2), 'kNm/m'],
            ['Eccentricity', (results.eccentricity * 1000).toFixed(0), 'mm'],
            ['Max Bearing Pressure', results.qMax.toFixed(0), 'kPa'],
            ['Min Bearing Pressure', results.qMin.toFixed(0), 'kPa'],
          ],
        },
      ],
      checks: [
        {
          name: 'Sliding (FOS ≥ 1.5)',
          capacity: `${results.fosSliding.toFixed(2)}`,
          utilisation: `${((1.5 / results.fosSliding) * 100).toFixed(0)}%`,
          status: (results.fosSliding >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning (FOS ≥ 1.5)',
          capacity: `${results.fosOverturning.toFixed(2)}`,
          utilisation: `${((1.5 / results.fosOverturning) * 100).toFixed(0)}%`,
          status: (results.fosOverturning >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Bearing (FOS ≥ 2.0)',
          capacity: `${results.fosBearing.toFixed(2)}`,
          utilisation: `${((2.0 / results.fosBearing) * 100).toFixed(0)}%`,
          status: (results.fosBearing >= 2.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Legato Block Wall Analysis',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.fosSliding < 1.5)
      pdfRecs.push({
        check: 'Sliding',
        suggestion: `FOS ${results.fosSliding.toFixed(2)} < 1.5 — increase base width or friction`,
      });
    if (results.fosOverturning < 2.0)
      pdfRecs.push({
        check: 'Overturning',
        suggestion: `FOS ${results.fosOverturning.toFixed(2)} < 2.0 — widen base or reduce height`,
      });
    if (results.fosBearing < 3.0)
      pdfRecs.push({
        check: 'Bearing',
        suggestion: `FOS ${results.fosBearing.toFixed(2)} < 3.0 — improve foundation or reduce bearing stress`,
      });
    if (results.eccentricity > results.baseWidth / 6)
      pdfRecs.push({
        check: 'Eccentricity',
        suggestion: 'Resultant outside middle third — base tension present',
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion: `Wall ${results.overallStatus === 'PASS' ? 'adequate' : 'inadequate'} — ${form.courses} courses, H=${results.height.toFixed(1)}m, B=${results.baseWidth.toFixed(1)}m`,
    });

    generateDOCX({
      title: 'Legato Block Wall',
      subtitle: 'Interlocking Concrete Block Stability Analysis',
      projectInfo: [
        { label: 'Project', value: 'Legato Block Wall' },
        { label: 'Reference', value: 'LEG001' },
        { label: 'Block Size', value: '800×800×1600mm' },
      ],
      inputs: [
        { label: 'Number of Courses', value: form.courses },
        {
          label: 'Configuration',
          value: CONFIG_PRESETS[form.configuration]?.label || form.configuration,
        },
        { label: 'Base Width', value: results.baseWidth.toFixed(1), unit: 'm' },
        { label: 'Wall Height', value: results.height.toFixed(1), unit: 'm' },
        { label: "Soil φ'", value: form.soilPhi, unit: '°' },
        { label: 'Soil γ', value: form.soilGamma, unit: 'kN/m³' },
        { label: 'Surcharge', value: form.surcharge, unit: 'kPa' },
        { label: 'Base Friction (μ)', value: form.frictionCoeff },
        { label: 'Bearing Capacity', value: form.bearingCapacity, unit: 'kPa' },
        { label: 'Backfill Slope', value: form.backfillSlope, unit: '°' },
      ],
      sections: [
        {
          title: 'Stability Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Wall Weight', results.wallWeight.toFixed(1), 'kN/m'],
            ['Driving Force', results.drivingForce.toFixed(1), 'kN/m'],
            ['Resisting Force', results.resistingForce.toFixed(1), 'kN/m'],
            ['Overturning Moment', results.overturningMoment.toFixed(2), 'kNm/m'],
            ['Resisting Moment', results.resistingMoment.toFixed(2), 'kNm/m'],
            ['Eccentricity', (results.eccentricity * 1000).toFixed(0), 'mm'],
            ['Max Bearing Pressure', results.qMax.toFixed(0), 'kPa'],
            ['Min Bearing Pressure', results.qMin.toFixed(0), 'kPa'],
          ],
        },
      ],
      checks: [
        {
          name: 'Sliding (FOS ≥ 1.5)',
          capacity: `${results.fosSliding.toFixed(2)}`,
          utilisation: `${((1.5 / results.fosSliding) * 100).toFixed(0)}%`,
          status: (results.fosSliding >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning (FOS ≥ 1.5)',
          capacity: `${results.fosOverturning.toFixed(2)}`,
          utilisation: `${((1.5 / results.fosOverturning) * 100).toFixed(0)}%`,
          status: (results.fosOverturning >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Bearing (FOS ≥ 2.0)',
          capacity: `${results.fosBearing.toFixed(2)}`,
          utilisation: `${((2.0 / results.fosBearing) * 100).toFixed(0)}%`,
          status: (results.fosBearing >= 2.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Legato Block Wall Analysis',
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
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-transparent to-gray-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gray-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl mb-4">
            <FiBox className="text-gray-400" />
            <span className="text-gray-100 font-mono tracking-wider">RETAINING | LEGATO WALL</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">Legato Block Wall</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Interlocking concrete block gravity wall stability analysis. 800×800×1600mm blocks.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 max-w-xl mx-auto">
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
                  {form.courses} courses | H = {results.height.toFixed(1)}m | B ={' '}
                  {results.baseWidth.toFixed(1)}m
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-gray-600 to-gray-600 hover:from-gray-500 hover:to-gray-500"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton calculatorKey="legato-wall" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiBox className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Wall Geometry</CardTitle>
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
                            <InputField
                              label="Number of Courses"
                              value={form.courses}
                              onChange={(v) => setForm({ ...form, courses: v })}
                              unit=""
                            />
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Configuration
                              </label>
                              <select
                                title="Configuration"
                                value={form.configuration}
                                onChange={(e) =>
                                  setForm({ ...form, configuration: e.target.value })
                                }
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(CONFIG_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label} - {preset.description}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Backfill Slope"
                              value={form.backfillSlope}
                              onChange={(v) => setForm({ ...form, backfillSlope: v })}
                              unit="°"
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
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Backfill Properties</CardTitle>
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
                                value={selectedSoil}
                                onChange={(e) => applySoilPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(SOIL_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="φ'"
                                value={form.soilPhi}
                                onChange={(v) => setForm({ ...form, soilPhi: v })}
                                unit="°"
                              />
                              <InputField
                                label="γ"
                                value={form.soilGamma}
                                onChange={(v) => setForm({ ...form, soilGamma: v })}
                                unit="kN/m³"
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

                    {/* Foundation */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('foundation')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Foundation</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.foundation && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.foundation && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <InputField
                              label="Base Friction (μ)"
                              value={form.frictionCoeff}
                              onChange={(v) => setForm({ ...form, frictionCoeff: v })}
                              unit=""
                            />
                            <InputField
                              label="Bearing Capacity"
                              value={form.bearingCapacity}
                              onChange={(v) => setForm({ ...form, bearingCapacity: v })}
                              unit="kPa"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Calculate Button */}
                    <button
                      onClick={calculate}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-neon-cyan/20"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>
                  </div>

                  {/* Visualization & Results */}
                  <div className="lg:col-span-8 space-y-6 sticky top-8">
                    <WhatIfPreview
                      title="Legato Wall — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <LegatoWall3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard
                          label="Sliding FOS"
                          value={results.fosSliding.toFixed(2)}
                          limit="≥ 1.5"
                          status={results.fosSliding >= 1.5 ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Overturning FOS"
                          value={results.fosOverturning.toFixed(2)}
                          limit="≥ 1.5"
                          status={results.fosOverturning >= 1.5 ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Bearing FOS"
                          value={results.fosBearing.toFixed(2)}
                          limit="≥ 2.0"
                          status={results.fosBearing >= 2.0 ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Max Pressure"
                          value={`${results.qMax.toFixed(0)} kPa`}
                          limit={`≤ ${form.bearingCapacity}`}
                          status={
                            results.qMax <= parseFloat(form.bearingCapacity) ? 'pass' : 'fail'
                          }
                        />
                      </div>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiInfo className="text-neon-cyan" />
                            Detailed Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Wall Weight
                              </div>
                              <div className="text-white font-mono">
                                {results.wallWeight.toFixed(1)} kN/m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Driving Force
                              </div>
                              <div className="text-red-400 font-mono">
                                {results.drivingForce.toFixed(1)} kN/m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Eccentricity
                              </div>
                              <div className="text-white font-mono">
                                {(results.eccentricity * 1000).toFixed(0)} mm
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Min Pressure
                              </div>
                              <div
                                className={cn(
                                  'font-mono',
                                  results.qMin >= 0 ? 'text-green-400' : 'text-red-400',
                                )}
                              >
                                {results.qMin.toFixed(0)} kPa
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiCheck className="text-green-400" />
                            Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {results.fosSliding < 1.5 && (
                            <div className="flex items-start gap-2 text-red-300">
                              <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>
                                Sliding FOS {results.fosSliding.toFixed(2)} &lt; 1.5 — increase base
                                width or friction
                              </span>
                            </div>
                          )}
                          {results.fosOverturning < 2.0 && (
                            <div className="flex items-start gap-2 text-red-300">
                              <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>
                                Overturning FOS {results.fosOverturning.toFixed(2)} &lt; 2.0 — widen
                                base
                              </span>
                            </div>
                          )}
                          {results.fosBearing < 3.0 && (
                            <div className="flex items-start gap-2 text-amber-300">
                              <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>
                                Bearing FOS {results.fosBearing.toFixed(2)} &lt; 3.0 — improve
                                foundation
                              </span>
                            </div>
                          )}
                          <div className="flex items-start gap-2 text-green-400">
                            <FiCheck className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>
                              Wall {results.overallStatus === 'PASS' ? 'adequate' : 'inadequate'} —{' '}
                              {form.courses} courses, H={results.height.toFixed(1)}m
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="lg:hidden">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={exportPDF}
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-600"
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
                <LegatoWall3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                aria-label="Minimize preview"
              >
                <FiMinimize2 size={20} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                LEGATO WALL — REAL-TIME PREVIEW
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
              <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                <FiSliders size={14} /> Live Parameters
              </h3>
              {[
                { label: 'Courses', field: 'courses' as keyof FormData, min: 1, max: 20, step: 1, unit: '' },
                { label: 'Surcharge', field: 'surcharge' as keyof FormData, min: 0, max: 100, step: 1, unit: 'kPa' },
                { label: 'Soil Phi', field: 'soilPhi' as keyof FormData, min: 15, max: 45, step: 1, unit: '°' },
                { label: 'Soil Gamma', field: 'soilGamma' as keyof FormData, min: 10, max: 25, step: 0.5, unit: 'kN/m³' },
                { label: 'Friction Coeff', field: 'frictionCoeff' as keyof FormData, min: 0.1, max: 1.0, step: 0.05, unit: '' },
                { label: 'Bearing Capacity', field: 'bearingCapacity' as keyof FormData, min: 50, max: 500, step: 10, unit: 'kPa' },
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
                    value={form[s.field]}
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
                  { label: 'Wall Height', value: `${((parseInt(form.courses) || 0) * 200).toFixed(0)} mm` },
                  { label: 'Configuration', value: form.configuration },
                  { label: 'Surcharge', value: `${form.surcharge} kPa` },
                  { label: 'Soil Phi', value: `${form.soilPhi}°` },
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
                      { label: 'Sliding FOS', util: ((1 / results.fosSliding) * 100).toFixed(0), status: results.fosSliding >= 1.5 ? 'PASS' : 'FAIL' },
                      { label: 'Overturning FOS', util: ((1 / results.fosOverturning) * 100).toFixed(0), status: results.fosOverturning >= 1.5 ? 'PASS' : 'FAIL' },
                      { label: 'Bearing FOS', util: ((1 / results.fosBearing) * 100).toFixed(0), status: results.fosBearing >= 2.0 ? 'PASS' : 'FAIL' },
                    ].map((check) => (
                      <div key={check.label} className="flex justify-between text-xs py-0.5">
                        <span className="text-gray-500">{check.label}</span>
                        <span className={cn(
                          'font-bold',
                          check.status === 'FAIL' ? 'text-red-500' : parseFloat(check.util) > 90 ? 'text-orange-400' : 'text-emerald-400'
                        )}>
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
      field={field || 'legato-wall'}
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
  status: 'pass' | 'fail';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 text-center border shadow-lg',
      status === 'pass'
        ? 'border-l-4 border-l-green-500 border-green-500/30 bg-green-950/20 shadow-green-500/10'
        : 'border-l-4 border-l-red-500 border-red-500/30 bg-red-950/20 shadow-red-500/10',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' ? 'text-green-400' : 'text-red-400',
      )}
    >
      {value}
    </div>
    <div className="text-xs text-gray-500 mt-1">{limit}</div>
    <div
      className={cn(
        'text-xs font-bold mt-2',
        status === 'pass' ? 'text-green-600' : 'text-red-600',
      )}
    >
      {status === 'pass' ? 'PASS' : 'FAIL'}
    </div>
  </Card>
);

export default LegatoWall;
