// =============================================================================
// BeaverCalc Studio — Slope Stability Calculator (Premium)
// Bishop's simplified method for circular slip analysis
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
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
    FiX
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SlopeStability3D from '../../components/3d/scenes/SlopeStability3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  height: string;
  angle: string;
  cohesion: string;
  phi: string;
  gamma: string;
  ru: string;
  surcharge: string;
  analysisMethod: string;
  slices: string;
}

interface CriticalCircle {
  centerX: number;
  centerY: number;
  radius: number;
  fos: number;
}

interface Results {
  fos: number;
  criticalCircle: CriticalCircle;
  stabilityStatus: 'STABLE' | 'MARGINAL' | 'UNSTABLE';
  overallStatus: 'PASS' | 'FAIL';
  sliceData: { x: number; weight: number; baseAngle: number; factor: number }[];
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
  { cohesion: string; phi: string; gamma: string; label: string }
> = {
  sand_loose: { cohesion: '0', phi: '28', gamma: '17', label: 'Loose Sand' },
  sand_dense: { cohesion: '0', phi: '35', gamma: '19', label: 'Dense Sand' },
  gravel: { cohesion: '0', phi: '38', gamma: '20', label: 'Gravel' },
  clay_soft: { cohesion: '15', phi: '20', gamma: '17', label: 'Soft Clay' },
  clay_stiff: { cohesion: '40', phi: '25', gamma: '19', label: 'Stiff Clay' },
  fill_granular: { cohesion: '5', phi: '30', gamma: '18', label: 'Granular Fill' },
  rockfill: { cohesion: '0', phi: '42', gamma: '21', label: 'Rockfill' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SlopeStability = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    soil: true,
    analysis: false,
  });

  const [form, setForm] = useState<FormData>({
    height: '10',
    angle: '45',
    cohesion: '10',
    phi: '30',
    gamma: '18',
    ru: '0',
    surcharge: '10',
    analysisMethod: 'bishop',
    slices: '20',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'height', label: 'Height' },
  { key: 'angle', label: 'Angle' },
  { key: 'cohesion', label: 'Cohesion' },
  { key: 'phi', label: 'Phi' },
  { key: 'gamma', label: 'Gamma' },
  { key: 'ru', label: 'Ru' },
  { key: 'surcharge', label: 'Surcharge' },
  { key: 'slices', label: 'Slices' },
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
    { key: 'height', label: 'Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'angle', label: 'Angle', min: 0, max: 100, step: 1, unit: '' },
    { key: 'cohesion', label: 'Cohesion', min: 0, max: 100, step: 1, unit: '' },
    { key: 'phi', label: 'Phi', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [selectedSoil, setSelectedSoil] = useState<string>('fill_granular');

  // ===========================================================================
  // BISHOP'S METHOD ANALYSIS
  // ===========================================================================

  const runAnalysis = () => {
    if (!validateInputs()) return;
    setIsAnalysing(true);
    const newWarnings: Warning[] = [];

    setTimeout(() => {
      try {
        const H = parseFloat(form.height);
        const beta = (parseFloat(form.angle) * Math.PI) / 180;
        const c = parseFloat(form.cohesion);
        const phi = (parseFloat(form.phi) * Math.PI) / 180;
        const gamma = parseFloat(form.gamma);
        const ru = parseFloat(form.ru);
        const numSlices = parseInt(form.slices) || 20;

        if (H <= 0 || parseFloat(form.angle) <= 0) {
          newWarnings.push({ type: 'error', message: 'Invalid slope geometry' });
          setWarnings(newWarnings);
          setIsAnalysing(false);
          return;
        }

        // Grid search for critical circle
        let minFOS = 999;
        let criticalCircle: CriticalCircle | null = null;
        let bestSliceData: any[] = [];

        const slopeW = H / Math.tan(beta);

        // Search grid (relative to toe at origin)
        for (let xc = -H * 0.5; xc <= H * 1.5; xc += H / 8) {
          for (let yc = H * 0.8; yc <= H * 2.5; yc += H / 8) {
            // Circle passing through toe
            const R = Math.sqrt(xc * xc + yc * yc);

            const { fos, sliceData } = calculateBishopFOS(
              xc,
              yc,
              R,
              H,
              beta,
              c,
              phi,
              gamma,
              ru,
              numSlices,
            );

            if (fos > 0 && fos < minFOS) {
              minFOS = fos;
              criticalCircle = { centerX: xc, centerY: yc, radius: R, fos };
              bestSliceData = sliceData;
            }
          }
        }

        if (!criticalCircle) {
          newWarnings.push({ type: 'error', message: 'Could not find valid slip circle' });
          setWarnings(newWarnings);
          setIsAnalysing(false);
          return;
        }

        // Determine status
        let stabilityStatus: 'STABLE' | 'MARGINAL' | 'UNSTABLE';
        if (minFOS >= 1.5) {
          stabilityStatus = 'STABLE';
        } else if (minFOS >= 1.0) {
          stabilityStatus = 'MARGINAL';
        } else {
          stabilityStatus = 'UNSTABLE';
        }

        const overallStatus = minFOS >= 1.3 ? 'PASS' : 'FAIL';

        // Warnings
        if (minFOS < 1.0) {
          newWarnings.push({
            type: 'error',
            message: `FOS ${minFOS.toFixed(2)} < 1.0 - slope failure likely`,
          });
        } else if (minFOS < 1.3) {
          newWarnings.push({
            type: 'warning',
            message: `FOS ${minFOS.toFixed(2)} < 1.3 - marginal stability`,
          });
        }
        if (ru > 0.5) {
          newWarnings.push({
            type: 'warning',
            message: 'High pore pressure ratio - consider drainage',
          });
        }
        if (parseFloat(form.angle) > 60) {
          newWarnings.push({ type: 'info', message: 'Steep slope - may require reinforcement' });
        }

        setResults({
          fos: minFOS,
          criticalCircle,
          stabilityStatus,
          overallStatus,
          sliceData: bestSliceData,
        });
      } catch {
        newWarnings.push({ type: 'error', message: 'Analysis error' });
      }

      setWarnings(newWarnings);
      setActiveTab('results');
      setIsAnalysing(false);
    }, 800);
  };

  const calculateBishopFOS = (
    xc: number,
    yc: number,
    R: number,
    H: number,
    beta: number,
    c: number,
    phi: number,
    gamma: number,
    ru: number,
    numSlices: number,
  ): { fos: number; sliceData: any[] } => {
    // Find intersection points of circle with ground surface
    const slopeW = H / Math.tan(beta);

    // Entry point (left side, at toe level y=0)
    // Circle: (x-xc)² + (y-yc)² = R²
    // At y=0: x = xc ± sqrt(R² - yc²)
    const sqrtTerm = R * R - yc * yc;
    if (sqrtTerm < 0) return { fos: 0, sliceData: [] };

    const xEntry = xc - Math.sqrt(sqrtTerm);
    const xExit = xc + Math.sqrt(R * R - (H - yc) * (H - yc));

    if (isNaN(xEntry) || isNaN(xExit) || xEntry >= xExit) return { fos: 0, sliceData: [] };

    const sliceWidth = (xExit - xEntry) / numSlices;
    let sumNumerator = 0;
    let sumDenominator = 0;
    const sliceData: any[] = [];

    // Initial FOS guess for iteration
    let fosGuess = 1.5;

    for (let iter = 0; iter < 10; iter++) {
      sumNumerator = 0;
      sumDenominator = 0;

      for (let i = 0; i < numSlices; i++) {
        const x = xEntry + (i + 0.5) * sliceWidth;

        // Circle equation for base of slice
        const yBase = yc - Math.sqrt(Math.max(0, R * R - (x - xc) * (x - xc)));

        // Ground surface height
        let yTop: number;
        if (x < 0) {
          yTop = 0;
        } else if (x < slopeW) {
          yTop = (x / slopeW) * H;
        } else {
          yTop = H;
        }

        const sliceHeight = yTop - yBase;
        if (sliceHeight <= 0) continue;

        const W = gamma * sliceHeight * sliceWidth;
        const baseAngle = Math.atan2(x - xc, yc - yBase);

        // Bishop's simplified
        const u = ru * gamma * sliceHeight;
        const N_prime = W - u * sliceWidth;
        const m_alpha = Math.cos(baseAngle) + (Math.sin(baseAngle) * Math.tan(phi)) / fosGuess;

        if (m_alpha <= 0.1) continue;

        const resistance = (c * sliceWidth + N_prime * Math.tan(phi)) / m_alpha;
        const driving = W * Math.sin(baseAngle);

        sumNumerator += resistance;
        sumDenominator += driving;

        if (iter === 9) {
          sliceData.push({ x, weight: W, baseAngle: (baseAngle * 180) / Math.PI, factor: m_alpha });
        }
      }

      if (sumDenominator <= 0) return { fos: 0, sliceData: [] };

      fosGuess = sumNumerator / sumDenominator;
    }

    return { fos: fosGuess, sliceData };
  };

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
        cohesion: preset.cohesion,
        phi: preset.phi,
        gamma: preset.gamma,
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
    if (results.fos < 1.5 && results.fos >= 1.3)
      pdfRecs.push({
        check: 'Stability',
        suggestion: `FOS ${results.fos.toFixed(2)} adequate but limited margin — consider drainage or soil nails`,
      });
    if (results.fos < 1.3 && results.fos >= 1.0)
      pdfRecs.push({
        check: 'Marginal FOS',
        suggestion: `FOS ${results.fos.toFixed(2)} below 1.3 — slope reinforcement recommended`,
      });
    if (parseFloat(form.ru) > 0.3)
      pdfRecs.push({
        check: 'Pore Pressure',
        suggestion: `ru = ${form.ru} — consider dewatering or drainage measures`,
      });
    if (parseFloat(form.angle) > 45)
      pdfRecs.push({
        check: 'Steep Slope',
        suggestion: `${form.angle}° — consider reducing angle or adding retaining structure`,
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion:
        results.overallStatus === 'PASS'
          ? `FOS ${results.fos.toFixed(2)} ≥ 1.3 — slope stability adequate`
          : `FOS ${results.fos.toFixed(2)} < 1.3 — remedial measures required`,
    });

    generatePremiumPDF({
      title: 'Slope Stability Analysis',
      subtitle: "Bishop's Simplified Method",
      projectInfo: [
        { label: 'Project', value: 'Slope Stability' },
        { label: 'Reference', value: 'SLO001' },
        { label: 'Method', value: "Bishop's Simplified" },
      ],
      inputs: [
        { label: 'Slope Height', value: `${form.height} m` },
        { label: 'Slope Angle', value: `${form.angle}°` },
        { label: "Cohesion (c')", value: `${form.cohesion} kPa` },
        { label: "Friction Angle (φ')", value: `${form.phi}°` },
        { label: 'Unit Weight (γ)', value: `${form.gamma} kN/m³` },
        { label: 'Pore Pressure Ratio (ru)', value: form.ru },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
        { label: 'Number of Slices', value: form.slices },
      ],
      sections: [
        {
          title: 'Critical Slip Circle',
          head: [['Parameter', 'Value']],
          body: [
            ['Factor of Safety', results.fos.toFixed(3)],
            ['Stability Status', results.stabilityStatus],
            ['Circle Center X', `${results.criticalCircle.centerX.toFixed(1)} m`],
            ['Circle Center Y', `${results.criticalCircle.centerY.toFixed(1)} m`],
            ['Circle Radius', `${results.criticalCircle.radius.toFixed(1)} m`],
            ['Number of Slices', form.slices],
          ],
        },
      ],
      checks: [
        {
          name: 'Global Stability (FOS ≥ 1.3)',
          capacity: 'FOS 1.30',
          utilisation: `FOS ${results.fos.toFixed(2)}`,
          status: results.overallStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Slope Stability Analysis',
    });
  };

  const exportDOCX = () => {
    if (!results) return;

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.fos < 1.5 && results.fos >= 1.3)
      pdfRecs.push({
        check: 'Stability',
        suggestion: `FOS ${results.fos.toFixed(2)} adequate but limited margin — consider drainage or soil nails`,
      });
    if (results.fos < 1.3 && results.fos >= 1.0)
      pdfRecs.push({
        check: 'Marginal FOS',
        suggestion: `FOS ${results.fos.toFixed(2)} below 1.3 — slope reinforcement recommended`,
      });
    if (parseFloat(form.ru) > 0.3)
      pdfRecs.push({
        check: 'Pore Pressure',
        suggestion: `ru = ${form.ru} — consider dewatering or drainage measures`,
      });
    if (parseFloat(form.angle) > 45)
      pdfRecs.push({
        check: 'Steep Slope',
        suggestion: `${form.angle}° — consider reducing angle or adding retaining structure`,
      });
    pdfRecs.push({
      check: 'Overall',
      suggestion:
        results.overallStatus === 'PASS'
          ? `FOS ${results.fos.toFixed(2)} ≥ 1.3 — slope stability adequate`
          : `FOS ${results.fos.toFixed(2)} < 1.3 — remedial measures required`,
    });

    generateDOCX({
      title: 'Slope Stability Analysis',
      subtitle: "Bishop's Simplified Method",
      projectInfo: [
        { label: 'Project', value: 'Slope Stability' },
        { label: 'Reference', value: 'SLO001' },
        { label: 'Method', value: "Bishop's Simplified" },
      ],
      inputs: [
        { label: 'Slope Height', value: `${form.height} m` },
        { label: 'Slope Angle', value: `${form.angle}°` },
        { label: "Cohesion (c')", value: `${form.cohesion} kPa` },
        { label: "Friction Angle (φ')", value: `${form.phi}°` },
        { label: 'Unit Weight (γ)', value: `${form.gamma} kN/m³` },
        { label: 'Pore Pressure Ratio (ru)', value: form.ru },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
        { label: 'Number of Slices', value: form.slices },
      ],
      sections: [
        {
          title: 'Critical Slip Circle',
          head: [['Parameter', 'Value']],
          body: [
            ['Factor of Safety', results.fos.toFixed(3)],
            ['Stability Status', results.stabilityStatus],
            ['Circle Center X', `${results.criticalCircle.centerX.toFixed(1)} m`],
            ['Circle Center Y', `${results.criticalCircle.centerY.toFixed(1)} m`],
            ['Circle Radius', `${results.criticalCircle.radius.toFixed(1)} m`],
            ['Number of Slices', form.slices],
          ],
        },
      ],
      checks: [
        {
          name: 'Global Stability (FOS ≥ 1.3)',
          capacity: 'FOS 1.30',
          utilisation: `FOS ${results.fos.toFixed(2)}`,
          status: results.overallStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Slope Stability Analysis',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-800/20 via-transparent to-purple-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl mb-4">
            <FiActivity className="text-neon-cyan" />
            <span className="text-gray-200 font-mono tracking-wider">
              GEOTECHNICAL | STABILITY
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">Slope Stability</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Bishop's simplified circular slip analysis with automated critical circle search.
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
        {activeTab === 'results' && results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mb-8 p-4 rounded-xl border flex items-center justify-between',
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
                  FOS = {results.fos.toFixed(2)} — {results.stabilityStatus}
                </div>
                <div className="text-gray-400 text-sm">
                  Critical circle: R = {results.criticalCircle.radius.toFixed(1)}m at (
                  {results.criticalCircle.centerX.toFixed(1)},{' '}
                  {results.criticalCircle.centerY.toFixed(1)})
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton calculatorKey="slope-stability" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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
                            <FiActivity className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Slope Geometry</CardTitle>
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
                                label="Height"
                                value={form.height}
                                onChange={(v) => setForm({ ...form, height: v })}
                                unit="m"
                              />
                              <InputField
                                label="Slope Angle"
                                value={form.angle}
                                onChange={(v) => setForm({ ...form, angle: v })}
                                unit="°"
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
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Soil Properties</CardTitle>
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
                            <div className="grid grid-cols-3 gap-2">
                              <InputField
                                label="c'"
                                value={form.cohesion}
                                onChange={(v) => setForm({ ...form, cohesion: v })}
                                unit="kPa"
                              />
                              <InputField
                                label="φ'"
                                value={form.phi}
                                onChange={(v) => setForm({ ...form, phi: v })}
                                unit="°"
                              />
                              <InputField
                                label="γ"
                                value={form.gamma}
                                onChange={(v) => setForm({ ...form, gamma: v })}
                                unit="kN/m³"
                              />
                            </div>
                            <InputField
                              label="Pore Pressure Ratio (ru)"
                              value={form.ru}
                              onChange={(v) => setForm({ ...form, ru: v })}
                              unit=""
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Analysis Options */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('analysis')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Analysis Options</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.analysis && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.analysis && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <InputField
                              label="Number of Slices"
                              value={form.slices}
                              onChange={(v) => setForm({ ...form, slices: v })}
                              unit=""
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Run Button */}
                    <Button
                      onClick={runAnalysis}
                      disabled={isAnalysing}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest"
                    >
                      {isAnalysing ? (
                        <span className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          Analysing...
                        </span>
                      ) : (
                        '⚡ RUN FULL ANALYSIS'
                      )}
                    </Button>
                  </div>

                  {/* Visualization & Results */}
                  <div className="lg:col-span-8 space-y-6 sticky top-8">
                    <WhatIfPreview
                      title="Slope Stability — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <SlopeStability3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard
                          label="Factor of Safety"
                          value={results.fos.toFixed(2)}
                          limit="≥ 1.3"
                          status={
                            results.fos >= 1.3 ? 'pass' : results.fos >= 1.0 ? 'warning' : 'fail'
                          }
                        />
                        <ResultCard
                          label="Circle Radius"
                          value={`${results.criticalCircle.radius.toFixed(1)}m`}
                          limit=""
                          status="info"
                        />
                        <ResultCard
                          label="Center X"
                          value={`${results.criticalCircle.centerX.toFixed(1)}m`}
                          limit=""
                          status="info"
                        />
                        <ResultCard
                          label="Center Y"
                          value={`${results.criticalCircle.centerY.toFixed(1)}m`}
                          limit=""
                          status="info"
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
                                Slope Height
                              </div>
                              <div className="text-white font-mono">{form.height}m</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Slope Angle
                              </div>
                              <div className="text-white font-mono">{form.angle}°</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Method</div>
                              <div className="text-neon-cyan font-mono">Bishop</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Slices Used
                              </div>
                              <div className="text-white font-mono">{form.slices}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results &&
                      (() => {
                        const recs: { check: string; suggestion: string }[] = [];
                        if (results.fos < 1.5 && results.fos >= 1.3)
                          recs.push({
                            check: 'Stability',
                            suggestion: `FOS ${results.fos.toFixed(2)} — adequate but limited margin`,
                          });
                        if (results.fos < 1.3)
                          recs.push({
                            check: 'Marginal FOS',
                            suggestion: `FOS ${results.fos.toFixed(2)} below 1.3 — reinforcement recommended`,
                          });
                        if (parseFloat(form.ru) > 0.3)
                          recs.push({
                            check: 'Pore Pressure',
                            suggestion: `ru = ${form.ru} — consider drainage measures`,
                          });
                        if (parseFloat(form.angle) > 45)
                          recs.push({
                            check: 'Steep Slope',
                            suggestion: `${form.angle}° — consider reducing angle or adding retention`,
                          });
                        recs.push({
                          check: 'Overall',
                          suggestion:
                            results.overallStatus === 'PASS'
                              ? `FOS ${results.fos.toFixed(2)} ≥ 1.3 — adequate`
                              : 'Remedial measures required',
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
                                  <FiCheck className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
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
                          className="w-full bg-gradient-to-r from-amber-600 to-yellow-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-amber-600 to-yellow-600"
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

      {/* ═══ FULLSCREEN 3D OVERLAY ═══ */}
      <AnimatePresence>
        {previewMaximized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
          >
            {/* Left: 3D Scene */}
            <div className="flex-1 relative">
              <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                <SlopeStability3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700/50 transition-all z-10"
                title="Exit fullscreen"
              >
                <FiMinimize2 size={16} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                Slope Stability — 3D Preview
              </div>
            </div>

            {/* Right: Side Panel */}
            <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
              {/* Live Parameters */}
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <FiSliders className="text-cyan-400" size={14} />
                  Live Parameters
                </h3>
                <div className="space-y-3">
                  {whatIfSliders.map((s) => (
                    <div key={s.key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">{s.label}</span>
                        <span className="text-white font-mono">{form[s.key as keyof FormData]} {s.unit}</span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={parseFloat(String(form[s.key as keyof FormData])) || s.min}
                        onChange={(e) => updateForm(s.key as keyof FormData, e.target.value)}
                        title={s.label}
                        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Readout */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <FiActivity className="text-cyan-400" size={14} />
                  Live Readout
                </h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Slope Height', value: `${form.height} m` },
                    { label: 'Slope Angle', value: `${form.angle}°` },
                    { label: 'Cohesion', value: `${form.cohesion} kPa` },
                    { label: 'Friction φ', value: `${form.phi}°` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-white font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last Analysis */}
              {results && (
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <FiInfo className="text-cyan-400" size={14} />
                    Last Analysis
                  </h3>
                  <div className={cn(
                    'p-3 rounded-lg text-center mb-3',
                    results.overallStatus === 'PASS'
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  )}>
                    <div className={cn(
                      'text-2xl font-black',
                      results.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {results.overallStatus}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Factor of Safety', value: results.fos.toFixed(2) },
                      { label: 'Circle Radius', value: `${results.criticalCircle.radius.toFixed(1)} m` },
                      { label: 'Center X', value: `${results.criticalCircle.centerX.toFixed(1)} m` },
                      { label: 'Center Y', value: `${results.criticalCircle.centerY.toFixed(1)} m` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="text-white font-mono">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Fullscreen */}
              <button
                onClick={() => setPreviewMaximized(false)}
                className="w-full mt-4 px-4 py-3 rounded-xl bg-gray-800 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 transition-all text-sm font-medium"
              >
                Close Fullscreen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <div className="text-sm font-semibold text-gray-200 mb-1">
      <ExplainableLabel
        label={`${label}${unit ? ` (${unit})` : ''}`}
        field={field || 'slope-stability'}
      />
    </div>
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
      'p-4 text-center border shadow-lg',
      status === 'pass' && 'border-l-4 border-l-green-500 border-green-500/30 bg-green-950/20 shadow-green-500/10',
      status === 'fail' && 'border-l-4 border-l-red-500 border-red-500/30 bg-red-950/20 shadow-red-500/10',
      status === 'warning' && 'border-l-4 border-l-amber-500 border-yellow-500/30 bg-yellow-950/20 shadow-yellow-500/10',
      status === 'info' && 'border-l-4 border-l-neon-cyan border-gray-500/30 bg-gray-950/20 shadow-gray-500/10',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
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
    {limit && <div className="text-xs text-gray-500 mt-1">{limit}</div>}
    {status !== 'info' && (
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
    )}
  </Card>
);

export default SlopeStability;
