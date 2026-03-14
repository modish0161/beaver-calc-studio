// =============================================================================
// BeaverCalc Studio — Strip Footing Analysis (Premium)
// Per-meter analysis for continuous footings with eccentric loading
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
  FiPackage,
  FiSettings,
  FiSliders,
  FiX,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import StripFooting3D from '../../components/3d/scenes/StripFooting3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  width: string;
  depth: string;
  verticalLoad: string;
  horizontalLoad: string;
  moment: string;
  bearingCapacity: string;
  frictionCoeff: string;
  gamma: string;
  passiveCoeff: string;
  embedDepth: string;
}

interface Results {
  eccentricity: number;
  effectiveWidth: number;
  maxPressure: number;
  minPressure: number;
  bearingUtil: number;
  bearingCheck: boolean;
  slidingResistance: number;
  slidingForce: number;
  slidingFOS: number;
  slidingCheck: boolean;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const SOIL_PRESETS: Record<
  string,
  {
    bearingCapacity: string;
    frictionCoeff: string;
    gamma: string;
    passiveCoeff: string;
    label: string;
  }
> = {
  sand_loose: {
    bearingCapacity: '100',
    frictionCoeff: '0.45',
    gamma: '17',
    passiveCoeff: '2.8',
    label: 'Loose Sand',
  },
  sand_dense: {
    bearingCapacity: '250',
    frictionCoeff: '0.55',
    gamma: '19',
    passiveCoeff: '3.7',
    label: 'Dense Sand',
  },
  gravel: {
    bearingCapacity: '350',
    frictionCoeff: '0.60',
    gamma: '20',
    passiveCoeff: '4.0',
    label: 'Gravel',
  },
  clay_soft: {
    bearingCapacity: '75',
    frictionCoeff: '0.35',
    gamma: '17',
    passiveCoeff: '2.0',
    label: 'Soft Clay',
  },
  clay_stiff: {
    bearingCapacity: '200',
    frictionCoeff: '0.50',
    gamma: '19',
    passiveCoeff: '3.0',
    label: 'Stiff Clay',
  },
  rock_weathered: {
    bearingCapacity: '500',
    frictionCoeff: '0.60',
    gamma: '22',
    passiveCoeff: '5.0',
    label: 'Weathered Rock',
  },
};

const LOAD_PRESETS: Record<
  string,
  { verticalLoad: string; horizontalLoad: string; moment: string; label: string }
> = {
  light_wall: { verticalLoad: '50', horizontalLoad: '5', moment: '10', label: 'Light Wall' },
  masonry_wall: { verticalLoad: '100', horizontalLoad: '10', moment: '20', label: 'Masonry Wall' },
  heavy_wall: { verticalLoad: '200', horizontalLoad: '20', moment: '50', label: 'Heavy Wall' },
  retaining_wall: {
    verticalLoad: '150',
    horizontalLoad: '60',
    moment: '100',
    label: 'Retaining Wall',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const StripFooting = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    loads: true,
    soil: false,
  });

  const [form, setForm] = useState<FormData>({
    width: '1.2',
    depth: '0.4',
    verticalLoad: '100',
    horizontalLoad: '10',
    moment: '20',
    bearingCapacity: '150',
    frictionCoeff: '0.45',
    gamma: '18',
    passiveCoeff: '3.0',
    embedDepth: '0.8',
  });
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedSoil, setSelectedSoil] = useState<string>('sand_loose');
  const [selectedLoad, setSelectedLoad] = useState<string>('masonry_wall');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // What-If Handlers
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  const whatIfSliders = [
    { key: 'width', label: 'Footing Width', min: 0.4, max: 3.0, step: 0.1, unit: 'm' },
    { key: 'depth', label: 'Footing Depth', min: 0.2, max: 1.0, step: 0.05, unit: 'm' },
    { key: 'verticalLoad', label: 'Vertical Load', min: 20, max: 500, step: 10, unit: 'kN/m' },
    { key: 'bearingCapacity', label: 'Bearing Capacity', min: 50, max: 400, step: 10, unit: 'kPa' },
  ];

  // ===========================================================================
  // CALCULATIONS
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'width', label: 'Footing Width' },
      { key: 'depth', label: 'Footing Depth' },
      { key: 'verticalLoad', label: 'Vertical Load' },
      { key: 'horizontalLoad', label: 'Horizontal Load', allowZero: true },
      { key: 'moment', label: 'Moment', allowZero: true },
      { key: 'bearingCapacity', label: 'Bearing Capacity' },
      { key: 'frictionCoeff', label: 'Friction Coefficient' },
      { key: 'gamma', label: 'Unit Weight' },
      { key: 'passiveCoeff', label: 'Passive Coefficient' },
      { key: 'embedDepth', label: 'Embed Depth' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const B = parseFloat(form.width);
    const D = parseFloat(form.depth);
    const V = parseFloat(form.verticalLoad);
    const H = parseFloat(form.horizontalLoad);
    const M = parseFloat(form.moment);
    const q_allow = parseFloat(form.bearingCapacity);
    const mu = parseFloat(form.frictionCoeff);
    const gamma = parseFloat(form.gamma);
    const Kp = parseFloat(form.passiveCoeff);
    const embedD = parseFloat(form.embedDepth);

    if (isNaN(B) || B <= 0 || isNaN(V) || V <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid input parameters' }]);
      return;
    }

    // Eccentricity
    const e = M / V;
    const B_eff = B - 2 * e;

    if (B_eff <= 0) {
      newWarnings.push({ type: 'error', message: 'Eccentricity too large - load outside kern' });
      setResults(null);
      setWarnings(newWarnings);
      return;
    }

    // Pressure distribution (per meter run)
    let q_max: number;
    let q_min: number;

    if (e <= B / 6) {
      // Trapezoid distribution
      q_max = (V / B) * (1 + (6 * e) / B);
      q_min = (V / B) * (1 - (6 * e) / B);
    } else {
      // Triangular (tension cutoff)
      q_max = (2 * V) / (3 * (B / 2 - e));
      q_min = 0;
      newWarnings.push({
        type: 'warning',
        message: 'Eccentricity outside middle third - triangular distribution',
      });
    }

    const bearingUtil = q_max / q_allow;
    const bearingCheck = bearingUtil <= 1.0;

    // Sliding analysis
    const footingWeight = B * D * 24; // Concrete weight per meter
    const totalVertical = V + footingWeight;
    const slidingResistance = mu * totalVertical + Kp * gamma * embedD * embedD * 0.5;
    const slidingFOS = slidingResistance / H;
    const slidingCheck = slidingFOS >= 1.5;

    // Warnings
    if (e > B / 6) {
      newWarnings.push({
        type: 'warning',
        message: `Eccentricity e=${e.toFixed(3)}m > B/6=${(B / 6).toFixed(3)}m`,
      });
    }
    if (bearingUtil > 0.9 && bearingUtil <= 1.0) {
      newWarnings.push({
        type: 'warning',
        message: `Bearing utilisation ${(bearingUtil * 100).toFixed(0)}% - near limit`,
      });
    }
    if (!bearingCheck) {
      newWarnings.push({
        type: 'error',
        message: `Bearing capacity exceeded: ${q_max.toFixed(0)} kPa > ${q_allow} kPa`,
      });
    }
    if (slidingFOS < 1.5 && slidingFOS >= 1.0) {
      newWarnings.push({
        type: 'warning',
        message: `Sliding FOS ${slidingFOS.toFixed(2)} < 1.5 - marginal`,
      });
    }
    if (!slidingCheck && slidingFOS < 1.0) {
      newWarnings.push({
        type: 'error',
        message: `Sliding failure: FOS = ${slidingFOS.toFixed(2)}`,
      });
    }

    const overallStatus = bearingCheck && slidingCheck ? 'PASS' : 'FAIL';

    setResults({
      eccentricity: e,
      effectiveWidth: B_eff,
      maxPressure: q_max,
      minPressure: q_min,
      bearingUtil,
      bearingCheck,
      slidingResistance,
      slidingForce: H,
      slidingFOS,
      slidingCheck,
      overallStatus,
    });

    setWarnings(newWarnings);
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
      setForm((prev) => ({
        ...prev,
        bearingCapacity: preset.bearingCapacity,
        frictionCoeff: preset.frictionCoeff,
        gamma: preset.gamma,
        passiveCoeff: preset.passiveCoeff,
      }));
    }
  };

  const applyLoadPreset = (key: string) => {
    const preset = LOAD_PRESETS[key];
    if (preset) {
      setSelectedLoad(key);
      setForm((prev) => ({
        ...prev,
        verticalLoad: preset.verticalLoad,
        horizontalLoad: preset.horizontalLoad,
        moment: preset.moment,
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

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.bearingUtil > 0.8)
      pdfRecs.push({
        check: 'Bearing',
        suggestion: `${(results.bearingUtil * 100).toFixed(0)}% utilised — consider widening footing or reducing load`,
      });
    if (results.slidingFOS < 2.0 && results.slidingFOS >= 1.5)
      pdfRecs.push({
        check: 'Sliding',
        suggestion: `FOS ${results.slidingFOS.toFixed(2)} — adequate but consider a shear key for extra margin`,
      });
    if (results.eccentricity > parseFloat(form.width) / 6)
      pdfRecs.push({
        check: 'Eccentricity',
        suggestion: `e=${(results.eccentricity * 1000).toFixed(0)}mm exceeds B/6 — load outside middle third`,
      });
    if (results.minPressure < 0)
      pdfRecs.push({
        check: 'Uplift',
        suggestion: 'Negative base pressure — tension not possible, redistribution required',
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion:
        results.overallStatus === 'PASS'
          ? 'All checks satisfied — footing design adequate'
          : 'One or more checks failed — review design',
    });

    generatePremiumPDF({
      title: 'Strip Footing Analysis',
      subtitle: 'Per-Meter Bearing & Sliding Check',
      projectInfo: [
        { label: 'Project', value: 'Strip Footing' },
        { label: 'Reference', value: 'STR001' },
        { label: 'Standard', value: 'Eurocode 7 / BS 8004' },
      ],
      inputs: [
        { label: 'Footing Width', value: `${form.width} m` },
        { label: 'Footing Depth', value: `${form.depth} m` },
        { label: 'Vertical Load', value: `${form.verticalLoad} kN/m` },
        { label: 'Horizontal Load', value: `${form.horizontalLoad} kN/m` },
        { label: 'Applied Moment', value: `${form.moment} kNm/m` },
        { label: 'Bearing Capacity', value: `${form.bearingCapacity} kPa` },
        { label: 'Friction Coefficient', value: form.frictionCoeff },
        { label: 'Soil Unit Weight', value: `${form.gamma} kN/m³` },
        { label: 'Passive Coefficient Kp', value: form.passiveCoeff },
        { label: 'Embed Depth', value: `${form.embedDepth} m` },
      ],
      sections: [
        {
          title: 'Analysis Results',
          head: [['Parameter', 'Value']],
          body: [
            ['Eccentricity', `${(results.eccentricity * 1000).toFixed(0)} mm`],
            ['B/6 Limit', `${((parseFloat(form.width) / 6) * 1000).toFixed(0)} mm`],
            ['Effective Width', `${results.effectiveWidth.toFixed(3)} m`],
            ['Max Pressure', `${results.maxPressure.toFixed(0)} kPa`],
            ['Min Pressure', `${results.minPressure.toFixed(0)} kPa`],
            ['Bearing Utilisation', `${(results.bearingUtil * 100).toFixed(1)}%`],
            ['Sliding Force', `${results.slidingForce.toFixed(1)} kN/m`],
            ['Sliding Resistance', `${results.slidingResistance.toFixed(1)} kN/m`],
            ['Sliding FOS', results.slidingFOS.toFixed(2)],
          ],
        },
      ],
      checks: [
        {
          name: 'Bearing Capacity',
          capacity: `${form.bearingCapacity} kPa`,
          utilisation: `${(results.bearingUtil * 100).toFixed(0)}%`,
          status: results.bearingCheck ? 'PASS' : 'FAIL',
        },
        {
          name: 'Sliding (FOS ≥ 1.5)',
          capacity: `${results.slidingResistance.toFixed(1)} kN/m`,
          utilisation: `FOS ${results.slidingFOS.toFixed(2)}`,
          status: results.slidingCheck ? 'PASS' : 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Strip Footing Analysis',
    });
  };

  const exportDOCX = () => {
    if (!results) return;

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.bearingUtil > 0.8)
      pdfRecs.push({
        check: 'Bearing',
        suggestion: `${(results.bearingUtil * 100).toFixed(0)}% utilised — consider widening footing or reducing load`,
      });
    if (results.slidingFOS < 2.0 && results.slidingFOS >= 1.5)
      pdfRecs.push({
        check: 'Sliding',
        suggestion: `FOS ${results.slidingFOS.toFixed(2)} — adequate but consider a shear key for extra margin`,
      });
    if (results.eccentricity > parseFloat(form.width) / 6)
      pdfRecs.push({
        check: 'Eccentricity',
        suggestion: `e=${(results.eccentricity * 1000).toFixed(0)}mm exceeds B/6 — load outside middle third`,
      });
    if (results.minPressure < 0)
      pdfRecs.push({
        check: 'Uplift',
        suggestion: 'Negative base pressure — tension not possible, redistribution required',
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion:
        results.overallStatus === 'PASS'
          ? 'All checks satisfied — footing design adequate'
          : 'One or more checks failed — review design',
    });

    generateDOCX({
      title: 'Strip Footing Analysis',
      subtitle: 'Per-Meter Bearing & Sliding Check',
      projectInfo: [
        { label: 'Project', value: 'Strip Footing' },
        { label: 'Reference', value: 'STR001' },
        { label: 'Standard', value: 'Eurocode 7 / BS 8004' },
      ],
      inputs: [
        { label: 'Footing Width', value: `${form.width} m` },
        { label: 'Footing Depth', value: `${form.depth} m` },
        { label: 'Vertical Load', value: `${form.verticalLoad} kN/m` },
        { label: 'Horizontal Load', value: `${form.horizontalLoad} kN/m` },
        { label: 'Applied Moment', value: `${form.moment} kNm/m` },
        { label: 'Bearing Capacity', value: `${form.bearingCapacity} kPa` },
        { label: 'Friction Coefficient', value: form.frictionCoeff },
        { label: 'Soil Unit Weight', value: `${form.gamma} kN/m³` },
        { label: 'Passive Coefficient Kp', value: form.passiveCoeff },
        { label: 'Embed Depth', value: `${form.embedDepth} m` },
      ],
      sections: [
        {
          title: 'Analysis Results',
          head: [['Parameter', 'Value']],
          body: [
            ['Eccentricity', `${(results.eccentricity * 1000).toFixed(0)} mm`],
            ['B/6 Limit', `${((parseFloat(form.width) / 6) * 1000).toFixed(0)} mm`],
            ['Effective Width', `${results.effectiveWidth.toFixed(3)} m`],
            ['Max Pressure', `${results.maxPressure.toFixed(0)} kPa`],
            ['Min Pressure', `${results.minPressure.toFixed(0)} kPa`],
            ['Bearing Utilisation', `${(results.bearingUtil * 100).toFixed(1)}%`],
            ['Sliding Force', `${results.slidingForce.toFixed(1)} kN/m`],
            ['Sliding Resistance', `${results.slidingResistance.toFixed(1)} kN/m`],
            ['Sliding FOS', results.slidingFOS.toFixed(2)],
          ],
        },
      ],
      checks: [
        {
          name: 'Bearing Capacity',
          capacity: `${form.bearingCapacity} kPa`,
          utilisation: `${(results.bearingUtil * 100).toFixed(0)}%`,
          status: results.bearingCheck ? 'PASS' : 'FAIL',
        },
        {
          name: 'Sliding (FOS ≥ 1.5)',
          capacity: `${results.slidingResistance.toFixed(1)} kN/m`,
          utilisation: `FOS ${results.slidingFOS.toFixed(2)}`,
          status: results.slidingCheck ? 'PASS' : 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Strip Footing Analysis',
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
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-800/20 via-transparent to-blue-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-gray-800/40 backdrop-blur-md border border-gray-700/50 mb-4">
            <FiLayers className="text-cyan-400" />
            <span className="text-cyan-100 font-mono tracking-wider">
              FOUNDATIONS | GEOTECHNICAL
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">
            Strip Footing
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Per-meter analysis for continuous footings with eccentric loading.
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
                  {results.overallStatus} — Bearing {(results.bearingUtil * 100).toFixed(0)}% |
                  Sliding FOS {results.slidingFOS.toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm">
                  Effective width B' = {results.effectiveWidth.toFixed(3)}m | Eccentricity e ={' '}
                  {results.eccentricity.toFixed(3)}m
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton
                calculatorKey="strip-footing"
                inputs={form as unknown as Record<string, string | number>}
                results={results}
                status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
              />
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
                  className="grid lg:grid-cols-12 gap-6"
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
                            <FiPackage className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Footing Geometry
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
                                label="Width B"
                                value={form.width}
                                onChange={(v) => setForm({ ...form, width: v })}
                                unit="m"
                              />
                              <InputField
                                label="Depth D"
                                value={form.depth}
                                onChange={(v) => setForm({ ...form, depth: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Embed Depth"
                              value={form.embedDepth}
                              onChange={(v) => setForm({ ...form, embedDepth: v })}
                              unit="m"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Loads */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('loads')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Applied Loads
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.loads && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.loads && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Load Type
                              </label>
                              <select
                                title="Load Type"
                                value={selectedLoad}
                                onChange={(e) => applyLoadPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(LOAD_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <InputField
                                label="V"
                                value={form.verticalLoad}
                                onChange={(v) => setForm({ ...form, verticalLoad: v })}
                                unit="kN/m"
                              />
                              <InputField
                                label="H"
                                value={form.horizontalLoad}
                                onChange={(v) => setForm({ ...form, horizontalLoad: v })}
                                unit="kN/m"
                              />
                              <InputField
                                label="M"
                                value={form.moment}
                                onChange={(v) => setForm({ ...form, moment: v })}
                                unit="kNm/m"
                              />
                            </div>
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
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Soil Properties
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
                                label="Bearing Cap."
                                value={form.bearingCapacity}
                                onChange={(v) => setForm({ ...form, bearingCapacity: v })}
                                unit="kPa"
                              />
                              <InputField
                                label="Friction μ"
                                value={form.frictionCoeff}
                                onChange={(v) => setForm({ ...form, frictionCoeff: v })}
                                unit=""
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="γ soil"
                                value={form.gamma}
                                onChange={(v) => setForm({ ...form, gamma: v })}
                                unit="kN/m³"
                              />
                              <InputField
                                label="Kp"
                                value={form.passiveCoeff}
                                onChange={(v) => setForm({ ...form, passiveCoeff: v })}
                                unit=""
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>
                    {/* Calculate Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev }));
                        setActiveTab('results');
                      }}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>
                  </div>

                  {/* Visualization & Results */}
                  <div className="lg:col-span-8 space-y-6 sticky top-8">
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
                            <StripFooting3D />
                          </Interactive3DDiagram>
                          <button
                            onClick={() => setPreviewMaximized(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                            aria-label="Minimize preview"
                          >
                            <FiMinimize2 size={20} />
                          </button>
                          <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                            STRIP FOOTING — REAL-TIME PREVIEW
                          </div>
                        </div>
                        <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                          <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                            <FiSliders size={14} /> Live Parameters
                          </h3>
                          {whatIfSliders.map((s) => (
                            <div key={s.key} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-400">{s.label}</span>
                                <span className="text-white">
                                  {form[s.key as keyof FormData]} {s.unit}
                                </span>
                              </div>
                              <input
                                title={s.label}
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={s.step}
                                value={form[s.key as keyof FormData] as string}
                                onChange={(e) =>
                                  updateForm(s.key as keyof FormData, e.target.value)
                                }
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
                              { label: 'Footing Width', value: `${form.width} m` },
                              { label: 'Footing Depth', value: `${form.depth} m` },
                              { label: 'Embed Depth', value: `${form.embedDepth} m` },
                              { label: 'Bearing Cap.', value: `${form.bearingCapacity} kPa` },
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
                                    label: 'Bearing',
                                    util: (results.bearingUtil * 100).toFixed(1),
                                    status: results.bearingCheck ? 'PASS' : 'FAIL',
                                  },
                                  {
                                    label: 'Sliding FOS',
                                    util: results.slidingFOS.toFixed(2),
                                    status: results.slidingCheck ? 'PASS' : 'FAIL',
                                  },
                                  {
                                    label: 'Max Pressure',
                                    util: `${results.maxPressure.toFixed(0)}`,
                                    status: results.bearingCheck ? 'PASS' : 'FAIL',
                                  },
                                  {
                                    label: 'Eccentricity',
                                    util: `${(results.eccentricity * 1000).toFixed(0)}`,
                                    status:
                                      results.eccentricity <= parseFloat(form.width) / 6
                                        ? 'PASS'
                                        : 'FAIL',
                                  },
                                ].map((check) => (
                                  <div
                                    key={check.label}
                                    className="flex justify-between text-xs py-0.5"
                                  >
                                    <span className="text-gray-500">{check.label}</span>
                                    <span
                                      className={cn(
                                        'font-bold',
                                        check.status === 'FAIL'
                                          ? 'text-red-500'
                                          : 'text-emerald-400',
                                      )}
                                    >
                                      {check.util}
                                      {check.label === 'Bearing'
                                        ? '%'
                                        : check.label === 'Max Pressure'
                                          ? ' kPa'
                                          : check.label === 'Eccentricity'
                                            ? ' mm'
                                            : 'x'}
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
                      title="Strip Footing — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <StripFooting3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard
                          label="Bearing Util."
                          value={`${(results.bearingUtil * 100).toFixed(0)}%`}
                          limit="≤ 100%"
                          status={results.bearingCheck ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Sliding FOS"
                          value={results.slidingFOS.toFixed(2)}
                          limit="≥ 1.5"
                          status={
                            results.slidingCheck
                              ? 'pass'
                              : results.slidingFOS >= 1.0
                                ? 'warning'
                                : 'fail'
                          }
                        />
                        <ResultCard
                          label="Max Pressure"
                          value={`${results.maxPressure.toFixed(0)} kPa`}
                          limit={`≤ ${form.bearingCapacity} kPa`}
                          status={results.bearingCheck ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Eccentricity"
                          value={`${(results.eccentricity * 1000).toFixed(0)} mm`}
                          limit={`≤ ${((parseFloat(form.width) / 6) * 1000).toFixed(0)} mm`}
                          status={
                            results.eccentricity <= parseFloat(form.width) / 6 ? 'pass' : 'warning'
                          }
                        />
                      </div>
                    )}

                    {results && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader className="py-3">
                          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <FiInfo className="text-neon-cyan" />
                            Analysis Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Effective Width
                              </div>
                              <div className="text-white font-mono">
                                {results.effectiveWidth.toFixed(3)}m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Min Pressure
                              </div>
                              <div className="text-white font-mono">
                                {results.minPressure.toFixed(0)} kPa
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Sliding Resistance
                              </div>
                              <div className="text-cyan-400 font-mono">
                                {results.slidingResistance.toFixed(1)} kN/m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Sliding Force
                              </div>
                              <div className="text-amber-400 font-mono">
                                {results.slidingForce.toFixed(1)} kN/m
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results &&
                      (() => {
                        const recs: { check: string; suggestion: string }[] = [];
                        if (results.bearingUtil > 0.8)
                          recs.push({
                            check: 'Bearing',
                            suggestion: `${(results.bearingUtil * 100).toFixed(0)}% utilised — consider widening footing`,
                          });
                        if (results.slidingFOS < 2.0 && results.slidingFOS >= 1.5)
                          recs.push({
                            check: 'Sliding',
                            suggestion: `FOS ${results.slidingFOS.toFixed(2)} — consider adding a shear key`,
                          });
                        if (results.eccentricity > parseFloat(form.width) / 6)
                          recs.push({
                            check: 'Eccentricity',
                            suggestion:
                              'Load outside middle third — review moment/load combination',
                          });
                        recs.push({
                          check: 'Overall',
                          suggestion:
                            results.overallStatus === 'PASS'
                              ? 'All checks satisfied'
                              : 'Review design — one or more checks failed',
                        });
                        return recs.length > 0 ? (
                          <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                            <CardHeader className="py-3">
                              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <FiInfo className="text-neon-cyan" />
                                Recommendations
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {recs.map((r, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <FiCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="text-white font-medium">{r.check}:</span>{' '}
                                    <span className="text-gray-400">{r.suggestion}</span>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ) : null;
                      })()}

                    <div className="lg:hidden">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={exportPDF}
                          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
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
    <label className="text-sm font-semibold text-gray-200 mb-1 block">
      <ExplainableLabel
        label={label}
        field={field ?? label}
        className="text-sm font-semibold text-gray-200"
      />
      {unit && <span className="text-gray-500"> ({unit})</span>}
    </label>
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
  status: 'pass' | 'fail' | 'warning';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 text-center shadow-2xl border-neon-cyan/30',
      status === 'pass' && 'border-l-4 border-l-green-500',
      status === 'fail' && 'border-l-4 border-l-red-500',
      status === 'warning' && 'border-l-4 border-l-amber-500',
    )}
  >
    <div className="text-xs uppercase text-gray-400 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' && 'text-green-400',
        status === 'fail' && 'text-red-400',
        status === 'warning' && 'text-yellow-400',
      )}
    >
      {value}
    </div>
    {limit && <div className="text-xs text-gray-500 mt-1">{limit}</div>}
    <div
      className={cn(
        'text-xs font-bold mt-2',
        status === 'pass' && 'text-green-600',
        status === 'fail' && 'text-red-600',
        status === 'warning' && 'text-yellow-600',
      )}
    >
      {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'MARGINAL'}
    </div>
  </Card>
);

export default StripFooting;
