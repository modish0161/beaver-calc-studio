// =============================================================================
// BeaverCalc Studio — Gravity Retaining Wall Calculator (Premium)
// Mass concrete/masonry gravity wall stability analysis
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
    FiShield,
    FiSliders,
    FiX
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import GravityWall3D from '../../components/3d/scenes/GravityWall3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  topWidth: string;
  baseWidth: string;
  height: string;
  batteredFront: string;
  wallDensity: string;
  soilPhi: string;
  soilGamma: string;
  surcharge: string;
  frictionCoeff: string;
  bearingCapacity: string;
  wallType: string;
}

interface Results {
  fosSliding: number;
  fosOverturning: number;
  fosBearing: number;
  qMax: number;
  qMin: number;
  eccentricity: number;
  wallWeight: number;
  drivingForce: number;
  resistingForce: number;
  overturningMoment: number;
  resistingMoment: number;
  Ka: number;
  B: number;
  H: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const WALL_PRESETS: Record<
  string,
  { topWidth: string; baseWidth: string; density: string; label: string }
> = {
  mass_concrete: { topWidth: '0.4', baseWidth: '1.2', density: '24', label: 'Mass Concrete' },
  brick_masonry: { topWidth: '0.35', baseWidth: '1.0', density: '19', label: 'Brick Masonry' },
  stone_masonry: { topWidth: '0.5', baseWidth: '1.5', density: '22', label: 'Stone Masonry' },
  gabion: { topWidth: '0.5', baseWidth: '1.8', density: '16', label: 'Gabion Basket' },
  concrete_block: { topWidth: '0.4', baseWidth: '1.0', density: '21', label: 'Concrete Block' },
};

const SOIL_PRESETS: Record<string, { phi: string; gamma: string; label: string }> = {
  sand_loose: { phi: '28', gamma: '17', label: 'Loose Sand' },
  sand_medium: { phi: '32', gamma: '18', label: 'Medium Sand' },
  sand_dense: { phi: '36', gamma: '19', label: 'Dense Sand' },
  gravel: { phi: '38', gamma: '20', label: 'Gravel' },
  clay_stiff: { phi: '25', gamma: '19', label: 'Stiff Clay' },
  fill_granular: { phi: '30', gamma: '18', label: 'Granular Fill' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const GravityWall = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    soil: true,
    foundation: false,
  });

  const [form, setForm] = useState<FormData>({
    topWidth: '0.4',
    baseWidth: '1.2',
    height: '2.5',
    batteredFront: '0',
    wallDensity: '24',
    soilPhi: '30',
    soilGamma: '18',
    surcharge: '10',
    frictionCoeff: '0.5',
    bearingCapacity: '150',
    wallType: 'mass_concrete',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'topWidth', label: 'Top Width' },
  { key: 'baseWidth', label: 'Base Width' },
  { key: 'height', label: 'Height' },
  { key: 'batteredFront', label: 'Battered Front' },
  { key: 'wallDensity', label: 'Wall Density' },
  { key: 'soilPhi', label: 'Soil Phi' },
  { key: 'soilGamma', label: 'Soil Gamma' },
  { key: 'surcharge', label: 'Surcharge' },
  { key: 'frictionCoeff', label: 'Friction Coeff' },
  { key: 'bearingCapacity', label: 'Bearing Capacity' },
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
    { key: 'topWidth', label: 'Top Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'baseWidth', label: 'Base Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'height', label: 'Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'batteredFront', label: 'Battered Front', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedSoil, setSelectedSoil] = useState<string>('fill_granular');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    if (!validateInputs()) return;
    const newWarnings: Warning[] = [];

    try {
      const wTop = parseFloat(form.topWidth);
      const wBase = parseFloat(form.baseWidth);
      const H = parseFloat(form.height);
      const gammaCon = parseFloat(form.wallDensity);
      const phi = (parseFloat(form.soilPhi) * Math.PI) / 180;
      const gammaS = parseFloat(form.soilGamma);
      const q = parseFloat(form.surcharge);
      const mu = parseFloat(form.frictionCoeff);
      const qBearing = parseFloat(form.bearingCapacity);

      if (wTop <= 0 || wBase <= 0 || H <= 0) {
        newWarnings.push({ type: 'error', message: 'Invalid wall geometry' });
        setWarnings(newWarnings);
        return;
      }

      // Wall geometry - trapezoidal cross-section
      // Area = 0.5 * (wTop + wBase) * H
      const A_wall = 0.5 * (wTop + wBase) * H;
      const wallWeight = A_wall * gammaCon; // kN/m run

      // Centroid of trapezoid from back face (soil side)
      // Assuming back face vertical, front face battered
      // For trapezoidal with parallel sides wTop (top) and wBase (bottom):
      // Centroid from wider base = (H/3) * (wBase + 2*wTop) / (wBase + wTop)
      // Horizontal centroid from back = wBase - (wTop + wBase)/3 ... complex
      // Simplified: treat as rectangle + triangle
      // Rectangle: wTop * H, centroid at wBase - wTop/2
      // Triangle: 0.5 * (wBase - wTop) * H, centroid at (wBase - wTop)/3

      const W_rect = wTop * H * gammaCon;
      const x_rect = wBase - wTop / 2;

      const W_tri = 0.5 * (wBase - wTop) * H * gammaCon;
      const x_tri = (wBase - wTop) / 3;

      const totalW = W_rect + W_tri;
      const x_bar_weight = (W_rect * x_rect + W_tri * x_tri) / totalW;

      // Rankine active earth pressure
      const Ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));

      // Soil pressure
      const Pa_soil = 0.5 * Ka * gammaS * H * H;
      const y_soil = H / 3;

      // Surcharge pressure (uniform on backfill)
      const Pa_q = Ka * q * H;
      const y_q = H / 2;

      // Total horizontal force
      const drivingForce = Pa_soil + Pa_q;

      // Overturning moments about toe
      const Mo_soil = Pa_soil * y_soil;
      const Mo_q = Pa_q * y_q;
      const overturningMoment = Mo_soil + Mo_q;

      // Resisting moment = W * lever arm
      const resistingMoment = totalW * x_bar_weight;

      // Resisting force (sliding)
      const resistingForce = totalW * mu;

      // Factors of safety
      const fosSliding = resistingForce / drivingForce;
      const fosOverturning = resistingMoment / overturningMoment;

      // Bearing pressure
      const M_net = resistingMoment - overturningMoment;
      const x_resultant = M_net / totalW;
      const eccentricity = wBase / 2 - x_resultant;

      let qMax: number;
      let qMin: number;

      if (Math.abs(eccentricity) <= wBase / 6) {
        // Trapezoidal distribution
        qMax = (totalW / wBase) * (1 + (6 * eccentricity) / wBase);
        qMin = (totalW / wBase) * (1 - (6 * eccentricity) / wBase);
      } else {
        // Triangular distribution (resultant outside middle third)
        qMax = (2 * totalW) / (3 * x_resultant);
        qMin = 0;
        newWarnings.push({
          type: 'warning',
          message: 'Resultant outside middle third - base tension possible',
        });
      }

      const fosBearing = qBearing / qMax;

      // Design checks
      if (fosSliding < 1.5 && fosSliding >= 1.0) {
        newWarnings.push({
          type: 'warning',
          message: `Sliding FOS ${fosSliding.toFixed(2)} below recommended 1.5`,
        });
      }
      if (fosOverturning < 2.0 && fosOverturning >= 1.5) {
        newWarnings.push({
          type: 'warning',
          message: `Overturning FOS ${fosOverturning.toFixed(2)} below recommended 2.0`,
        });
      }
      if (fosBearing < 3.0 && fosBearing >= 2.0) {
        newWarnings.push({
          type: 'warning',
          message: `Bearing FOS ${fosBearing.toFixed(2)} below recommended 3.0`,
        });
      }
      if (wBase / H < 0.4) {
        newWarnings.push({
          type: 'info',
          message: 'Base width/height ratio < 0.4 - wall may be slender',
        });
      }
      if (H > 4.0) {
        newWarnings.push({
          type: 'info',
          message: 'Consider cantilever or reinforced wall for heights > 4m',
        });
      }

      const overallStatus =
        fosSliding >= 1.5 && fosOverturning >= 1.5 && fosBearing >= 2.0 ? 'PASS' : 'FAIL';

      setResults({
        fosSliding,
        fosOverturning,
        fosBearing,
        qMax,
        qMin,
        eccentricity,
        wallWeight: totalW,
        drivingForce,
        resistingForce,
        overturningMoment,
        resistingMoment,
        Ka,
        B: wBase,
        H,
        overallStatus,
      });
    } catch {
      newWarnings.push({ type: 'error', message: 'Calculation error' });
    }

    setWarnings(newWarnings);
  };


  // ===========================================================================
  // VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applyWallPreset = (key: string) => {
    const preset = WALL_PRESETS[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        wallType: key,
        topWidth: preset.topWidth,
        baseWidth: preset.baseWidth,
        wallDensity: preset.density,
      }));
    }
  };

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
        check: 'Sliding FOS',
        suggestion: `FOS ${results.fosSliding.toFixed(2)} < 1.5 — increase base width or friction coefficient`,
      });
    if (results.fosOverturning < 2.0)
      pdfRecs.push({
        check: 'Overturning FOS',
        suggestion: `FOS ${results.fosOverturning.toFixed(2)} < 2.0 — widen base or increase wall mass`,
      });
    if (results.fosBearing < 3.0)
      pdfRecs.push({
        check: 'Bearing FOS',
        suggestion: `FOS ${results.fosBearing.toFixed(2)} < 3.0 — reduce bearing pressure or improve foundation`,
      });
    if (results.qMin < 0)
      pdfRecs.push({
        check: 'Base Tension',
        suggestion: 'Negative pressure at heel — resultant outside middle third',
      });
    if (results.eccentricity > parseFloat(form.baseWidth) / 6)
      pdfRecs.push({
        check: 'Eccentricity',
        suggestion: 'Resultant outside middle third — consider widening base',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'All stability checks pass with adequate factors of safety',
      });
    generatePremiumPDF({
      title: 'Gravity Retaining Wall',
      subtitle: 'Stability Analysis',
      projectInfo: [
        { label: 'Project', value: 'Gravity Retaining Wall' },
        { label: 'Reference', value: 'GRA001' },
        { label: 'Standard', value: 'BS 8002 / Eurocode 7' },
      ],
      inputs: [
        { label: 'Wall Height', value: `${form.height} m` },
        { label: 'Top Width', value: `${form.topWidth} m` },
        { label: 'Base Width', value: `${form.baseWidth} m` },
        { label: 'Wall Density', value: `${form.wallDensity} kN/m³` },
        { label: 'Soil \u03c6\u2032', value: `${form.soilPhi}°` },
        { label: 'Soil \u03b3', value: `${form.soilGamma} kN/m³` },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
        { label: 'Base Friction (μ)', value: form.frictionCoeff },
        { label: 'Bearing Capacity', value: `${form.bearingCapacity} kPa` },
      ],
      sections: [
        {
          title: 'Stability Analysis Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Active Pressure Coeff (Ka)', results.Ka.toFixed(4), '-'],
            ['Wall Self-Weight', results.wallWeight.toFixed(1), 'kN/m'],
            ['Driving Force', results.drivingForce.toFixed(1), 'kN/m'],
            ['Resisting Force', results.resistingForce.toFixed(1), 'kN/m'],
            ['Overturning Moment', results.overturningMoment.toFixed(1), 'kNm/m'],
            ['Resisting Moment', results.resistingMoment.toFixed(1), 'kNm/m'],
            ['Eccentricity', (results.eccentricity * 1000).toFixed(0), 'mm'],
            ['Max Base Pressure', results.qMax.toFixed(1), 'kPa'],
            ['Min Base Pressure', results.qMin.toFixed(1), 'kPa'],
            ['FOS Sliding', results.fosSliding.toFixed(2), '≥ 1.5'],
            ['FOS Overturning', results.fosOverturning.toFixed(2), '≥ 2.0'],
            ['FOS Bearing', results.fosBearing.toFixed(2), '≥ 3.0'],
          ],
        },
      ],
      checks: [
        {
          name: 'Sliding',
          capacity: '≥ 1.5',
          utilisation: String(Math.round((1.5 / results.fosSliding) * 100)),
          status: (results.fosSliding >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning',
          capacity: '≥ 2.0',
          utilisation: String(Math.round((2.0 / results.fosOverturning) * 100)),
          status: (results.fosOverturning >= 2.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Bearing',
          capacity: `${form.bearingCapacity} kPa`,
          utilisation: String(Math.round((results.qMax / parseFloat(form.bearingCapacity)) * 100)),
          status: (results.fosBearing >= 3.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Gravity Retaining Wall',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.fosSliding < 1.5)
      pdfRecs.push({
        check: 'Sliding FOS',
        suggestion: `FOS ${results.fosSliding.toFixed(2)} < 1.5 — increase base width or friction coefficient`,
      });
    if (results.fosOverturning < 2.0)
      pdfRecs.push({
        check: 'Overturning FOS',
        suggestion: `FOS ${results.fosOverturning.toFixed(2)} < 2.0 — widen base or increase wall mass`,
      });
    if (results.fosBearing < 3.0)
      pdfRecs.push({
        check: 'Bearing FOS',
        suggestion: `FOS ${results.fosBearing.toFixed(2)} < 3.0 — reduce bearing pressure or improve foundation`,
      });
    if (results.qMin < 0)
      pdfRecs.push({
        check: 'Base Tension',
        suggestion: 'Negative pressure at heel — resultant outside middle third',
      });
    if (results.eccentricity > parseFloat(form.baseWidth) / 6)
      pdfRecs.push({
        check: 'Eccentricity',
        suggestion: 'Resultant outside middle third — consider widening base',
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'All stability checks pass with adequate factors of safety',
      });
    generateDOCX({
      title: 'Gravity Retaining Wall',
      subtitle: 'Stability Analysis',
      projectInfo: [
        { label: 'Project', value: 'Gravity Retaining Wall' },
        { label: 'Reference', value: 'GRA001' },
        { label: 'Standard', value: 'BS 8002 / Eurocode 7' },
      ],
      inputs: [
        { label: 'Wall Height', value: `${form.height} m` },
        { label: 'Top Width', value: `${form.topWidth} m` },
        { label: 'Base Width', value: `${form.baseWidth} m` },
        { label: 'Wall Density', value: `${form.wallDensity} kN/m³` },
        { label: 'Soil \u03c6\u2032', value: `${form.soilPhi}°` },
        { label: 'Soil \u03b3', value: `${form.soilGamma} kN/m³` },
        { label: 'Surcharge', value: `${form.surcharge} kPa` },
        { label: 'Base Friction (μ)', value: form.frictionCoeff },
        { label: 'Bearing Capacity', value: `${form.bearingCapacity} kPa` },
      ],
      sections: [
        {
          title: 'Stability Analysis Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Active Pressure Coeff (Ka)', results.Ka.toFixed(4), '-'],
            ['Wall Self-Weight', results.wallWeight.toFixed(1), 'kN/m'],
            ['Driving Force', results.drivingForce.toFixed(1), 'kN/m'],
            ['Resisting Force', results.resistingForce.toFixed(1), 'kN/m'],
            ['Overturning Moment', results.overturningMoment.toFixed(1), 'kNm/m'],
            ['Resisting Moment', results.resistingMoment.toFixed(1), 'kNm/m'],
            ['Eccentricity', (results.eccentricity * 1000).toFixed(0), 'mm'],
            ['Max Base Pressure', results.qMax.toFixed(1), 'kPa'],
            ['Min Base Pressure', results.qMin.toFixed(1), 'kPa'],
            ['FOS Sliding', results.fosSliding.toFixed(2), '≥ 1.5'],
            ['FOS Overturning', results.fosOverturning.toFixed(2), '≥ 2.0'],
            ['FOS Bearing', results.fosBearing.toFixed(2), '≥ 3.0'],
          ],
        },
      ],
      checks: [
        {
          name: 'Sliding',
          capacity: '≥ 1.5',
          utilisation: String(Math.round((1.5 / results.fosSliding) * 100)),
          status: (results.fosSliding >= 1.5 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning',
          capacity: '≥ 2.0',
          utilisation: String(Math.round((2.0 / results.fosOverturning) * 100)),
          status: (results.fosOverturning >= 2.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Bearing',
          capacity: `${form.bearingCapacity} kPa`,
          utilisation: String(Math.round((results.qMax / parseFloat(form.bearingCapacity)) * 100)),
          status: (results.fosBearing >= 3.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Gravity Retaining Wall',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gray-800/40 backdrop-blur-md border border-gray-700/50 mb-4">
            <FiShield className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">
              RETAINING | GRAVITY WALL
            </span>
          </div>
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
              Gravity Retaining Wall
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Mass concrete or masonry gravity wall stability analysis with sliding, overturning, and
            bearing checks.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-4">
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
                  {results.overallStatus === 'PASS' ? 'Wall Stable' : 'Wall Unstable'}
                </div>
                <div className="text-gray-400 text-sm">
                  H = {results.H.toFixed(1)}m | B = {results.B.toFixed(1)}m | Ka ={' '}
                  {results.Ka.toFixed(3)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton calculatorKey="gravity-wall" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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
                  className="grid lg:grid-cols-3 gap-8"
                >
                  {/* Inputs */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Wall Geometry */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('geometry')}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiShield className="w-6 h-6 text-neon-cyan" />
                          </motion.div>
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
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Wall Type
                              </label>
                              <select
                                title="Wall Type"
                                value={form.wallType}
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
                            <InputField
                              label="Height"
                              value={form.height}
                              onChange={(v) => setForm({ ...form, height: v })}
                              unit="m"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Top Width"
                                value={form.topWidth}
                                onChange={(v) => setForm({ ...form, topWidth: v })}
                                unit="m"
                              />
                              <InputField
                                label="Base Width"
                                value={form.baseWidth}
                                onChange={(v) => setForm({ ...form, baseWidth: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Wall Density"
                              value={form.wallDensity}
                              onChange={(v) => setForm({ ...form, wallDensity: v })}
                              unit="kN/m³"
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
                          <motion.div
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </motion.div>
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
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
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
                          <motion.div
                            className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </motion.div>
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
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center pt-4"
                    >
                      <Button
                        onClick={calculate}
                        className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)]"
                      >
                        ⚡ RUN FULL ANALYSIS
                      </Button>
                    </motion.div>
                  </div>

                  {/* Results & Visualization */}
                  <div className="lg:col-span-2 space-y-6 sticky top-8">
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
                            <GravityWall3D />
                          </Interactive3DDiagram>
                          <button
                            onClick={() => setPreviewMaximized(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                            aria-label="Minimize preview"
                          >
                            <FiMinimize2 size={20} />
                          </button>
                          <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                            GRAVITY WALL — REAL-TIME PREVIEW
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
                                <span className="text-white">{form[s.key as keyof FormData]} {s.unit}</span>
                              </div>
                              <input
                                title={s.label}
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={s.step}
                                value={form[s.key as keyof FormData] as string}
                                onChange={(e) => updateForm(s.key as keyof FormData, e.target.value)}
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
                              { label: 'Top Width', value: `${form.topWidth} m` },
                              { label: 'Base Width', value: `${form.baseWidth} m` },
                              { label: 'Height', value: `${form.height} m` },
                              { label: 'Wall Density', value: `${form.wallDensity} kN/m³` },
                              { label: 'Soil φ', value: `${form.soilPhi}°` },
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
                                  { label: 'Sliding FOS', value: results.fosSliding.toFixed(2), ok: results.fosSliding >= 1.5 },
                                  { label: 'Overturning FOS', value: results.fosOverturning.toFixed(2), ok: results.fosOverturning >= 2.0 },
                                  { label: 'Bearing FOS', value: results.fosBearing.toFixed(2), ok: results.fosBearing >= 3.0 },
                                  { label: 'Max Pressure', value: `${results.qMax.toFixed(0)} kPa`, ok: results.qMax <= parseFloat(form.bearingCapacity) },
                                ].map((check) => (
                                  <div key={check.label} className="flex justify-between text-xs py-0.5">
                                    <span className="text-gray-500">{check.label}</span>
                                    <span className={cn('font-bold', !check.ok ? 'text-red-500' : 'text-emerald-400')}>
                                      {check.value}
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
                      title="Gravity Wall — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <GravityWall3D />
                        </Interactive3DDiagram>
                      )}
                    />

                    {results && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ResultCard
                          label="Sliding FOS"
                          value={results.fosSliding.toFixed(2)}
                          limit="≥ 1.5"
                          status={results.fosSliding >= 1.5 ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Overturning FOS"
                          value={results.fosOverturning.toFixed(2)}
                          limit="≥ 2.0"
                          status={results.fosOverturning >= 2.0 ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Bearing FOS"
                          value={results.fosBearing.toFixed(2)}
                          limit="≥ 3.0"
                          status={results.fosBearing >= 3.0 ? 'pass' : 'fail'}
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

                    {results &&
                      (() => {
                        const recs: { icon: string; text: string }[] = [];
                        if (results.fosSliding < 1.5)
                          recs.push({
                            icon: '🔴',
                            text: `Sliding FOS ${results.fosSliding.toFixed(2)} < 1.5 — increase base width or friction`,
                          });
                        if (results.fosOverturning < 2.0)
                          recs.push({
                            icon: '🔴',
                            text: `Overturning FOS ${results.fosOverturning.toFixed(2)} < 2.0 — widen base or increase mass`,
                          });
                        if (results.fosBearing < 3.0)
                          recs.push({
                            icon: '⚠️',
                            text: `Bearing FOS ${results.fosBearing.toFixed(2)} < 3.0 — improve foundation or reduce pressure`,
                          });
                        if (results.qMin < 0)
                          recs.push({
                            icon: '⚠️',
                            text: 'Negative base pressure — tension at heel, consider widening base',
                          });
                        if (parseFloat(form.baseWidth) / parseFloat(form.height) < 0.4)
                          recs.push({
                            icon: '📐',
                            text: 'Slender wall (B/H < 0.4) — consider cantilever design',
                          });
                        if (recs.length === 0)
                          recs.push({
                            icon: '✅',
                            text: 'All stability checks pass with adequate factors of safety',
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
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-700"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-700"
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

      {/* Grid Pattern CSS */}
      <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
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
      field={field || 'gravity-wall'}
    />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono text-sm"
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
      'p-4 text-center shadow-lg border-l-4',
      status === 'pass'
        ? 'border-l-green-500 border-green-500/30 bg-green-950/20 shadow-green-500/5'
        : 'border-l-red-500 border-red-500/30 bg-red-950/20 shadow-red-500/5',
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

export default GravityWall;
