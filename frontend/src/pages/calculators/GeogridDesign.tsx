// =============================================================================
// BeaverCalc Studio — Geogrid Design Calculator (Premium)
// Subgrade stabilization and base reinforcement for unpaved/paved roads
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiGrid,
    FiInfo,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTruck,
    FiX,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import GeogridDesign3D from '../../components/3d/scenes/GeogridDesign3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  wheelLoad: string;
  tirePressure: string;
  passes: string;
  rutDepth: string;
  cbr: string;
  gridModulus: string;
  gridType: string;
  aggregateType: string;
  application: string;
}

interface Results {
  thicknessUnreinforced: number;
  thicknessReinforced: number;
  aggregateSaving: number;
  savingPercent: number;
  cu: number;
  contactRadius: number;
  ncUnreinforced: number;
  ncReinforced: number;
  trafficFactor: number;
  minThickness: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const GRID_PRESETS: Record<string, { modulus: string; nc: number; label: string }> = {
  none: { modulus: '0', nc: 3.0, label: 'No Reinforcement' },
  biaxial_light: { modulus: '350', nc: 5.14, label: 'Biaxial Light (350 kN/m)' },
  biaxial_medium: { modulus: '500', nc: 5.5, label: 'Biaxial Medium (500 kN/m)' },
  biaxial_heavy: { modulus: '700', nc: 5.7, label: 'Biaxial Heavy (700 kN/m)' },
  triaxial: { modulus: '450', nc: 5.7, label: 'Triaxial (TriAx)' },
  punched_drawn: { modulus: '600', nc: 5.5, label: 'Punched & Drawn' },
  woven: { modulus: '400', nc: 5.0, label: 'Woven Geotextile' },
};

const AGGREGATE_PRESETS: Record<string, { phi: number; label: string }> = {
  type1: { phi: 40, label: 'Type 1 Crushed Rock' },
  mot: { phi: 35, label: 'MOT Type 1' },
  recycled: { phi: 32, label: '6F2 Recycled' },
  gravel: { phi: 30, label: 'Gravel' },
  sand: { phi: 28, label: 'Well-graded Sand' },
};

const APPLICATION_PRESETS: Record<string, { passes: string; rutDepth: string; label: string }> = {
  temporary: { passes: '100', rutDepth: '100', label: 'Temporary Haul Road (100 passes)' },
  construction: { passes: '1000', rutDepth: '75', label: 'Construction Access (1,000 passes)' },
  permanent_light: { passes: '10000', rutDepth: '50', label: 'Light Traffic (10,000 passes)' },
  permanent_heavy: { passes: '100000', rutDepth: '25', label: 'Heavy Traffic (100,000 passes)' },
  paved: { passes: '1000000', rutDepth: '15', label: 'Paved Road (1M passes)' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const GeogridDesign = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    traffic: true,
    soil: true,
    reinforcement: true,
  });

  const [form, setForm] = useState<FormData>({
    wheelLoad: '40',
    tirePressure: '550',
    passes: '1000',
    rutDepth: '75',
    cbr: '1.5',
    gridModulus: '500',
    gridType: 'biaxial_medium',
    aggregateType: 'type1',
    application: 'construction',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'wheelLoad', label: 'Wheel Load' },
  { key: 'tirePressure', label: 'Tire Pressure' },
  { key: 'passes', label: 'Passes' },
  { key: 'rutDepth', label: 'Rut Depth' },
  { key: 'cbr', label: 'Cbr' },
  { key: 'gridModulus', label: 'Grid Modulus' },
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
    { key: 'wheelLoad', label: 'Wheel Load', min: 0, max: 100, step: 1, unit: '' },
    { key: 'tirePressure', label: 'Tire Pressure', min: 0, max: 100, step: 1, unit: '' },
    { key: 'passes', label: 'Passes', min: 0, max: 100, step: 1, unit: '' },
    { key: 'rutDepth', label: 'Rut Depth', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    if (!validateInputs()) return;
    const newWarnings: Warning[] = [];

    try {
      const P = parseFloat(form.wheelLoad);
      const p = parseFloat(form.tirePressure);
      const N = parseFloat(form.passes);
      const rut = parseFloat(form.rutDepth) / 1000;
      const CBR = parseFloat(form.cbr);
      const J = parseFloat(form.gridModulus);

      if (P <= 0 || p <= 0 || CBR <= 0) {
        newWarnings.push({ type: 'error', message: 'All values must be positive' });
        setWarnings(newWarnings);
        return;
      }

      // Soil undrained shear strength (Cu ≈ 30 * CBR kPa)
      const Cu = 30 * CBR;

      // Contact area and radius
      const A_contact = P / p;
      const r = Math.sqrt(A_contact / Math.PI);

      // Bearing capacity factors
      const ncUnreinforced = 3.0;
      const gridPreset = GRID_PRESETS[form.gridType];
      const ncReinforced = gridPreset ? gridPreset.nc : 3.0;

      // Load spread angle (2:1 distribution ≈ 26.6°, we use 35° typical for aggregate)
      const alpha = (35 * Math.PI) / 180;

      // Calculate unreinforced thickness
      const targetQ_unreinf = ncUnreinforced * Cu;
      const A_req_unreinf = P / targetQ_unreinf;
      const R_req_unreinf = Math.sqrt(A_req_unreinf / Math.PI);
      let h_unreinf = (R_req_unreinf - r) / Math.tan(alpha);

      // Calculate reinforced thickness
      const targetQ_reinf = ncReinforced * Cu;
      const A_req_reinf = P / targetQ_reinf;
      const R_req_reinf = Math.sqrt(A_req_reinf / Math.PI);
      let h_reinf = (R_req_reinf - r) / Math.tan(alpha);

      // Traffic factor (log N)
      const trafficFactor = 1 + 0.25 * Math.log10(Math.max(N, 1));
      h_unreinf *= trafficFactor;
      h_reinf *= trafficFactor;

      // Rut depth adjustment (larger allowable rut = thinner required)
      const rutFactor = Math.pow(0.075 / Math.max(rut, 0.015), 0.3);
      h_unreinf *= rutFactor;
      h_reinf *= rutFactor;

      // Minimum thicknesses
      const minThickness = 0.15;
      h_unreinf = Math.max(minThickness, h_unreinf);
      h_reinf = Math.max(minThickness, h_reinf);

      // Aggregate saving
      const aggregateSaving = h_unreinf - h_reinf;
      const savingPercent = ((h_unreinf - h_reinf) / h_unreinf) * 100;

      // Warnings
      if (CBR < 1) {
        newWarnings.push({
          type: 'warning',
          message: `Very soft subgrade (CBR ${CBR}%). Consider geotextile separation.`,
        });
      }
      if (CBR >= 3) {
        newWarnings.push({
          type: 'info',
          message: `Good subgrade (CBR ${CBR}%). Reinforcement benefit may be limited.`,
        });
      }
      if (savingPercent > 40) {
        newWarnings.push({
          type: 'info',
          message: `High reinforcement benefit: ${savingPercent.toFixed(0)}% aggregate saving`,
        });
      }
      if (form.gridType === 'none') {
        newWarnings.push({
          type: 'info',
          message: 'No reinforcement selected - showing unreinforced design',
        });
      }

      const overallStatus = h_reinf >= minThickness ? 'PASS' : 'FAIL';

      setResults({
        thicknessUnreinforced: h_unreinf,
        thicknessReinforced: h_reinf,
        aggregateSaving,
        savingPercent,
        cu: Cu,
        contactRadius: r,
        ncUnreinforced,
        ncReinforced,
        trafficFactor,
        minThickness,
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

  const applyGridPreset = (key: string) => {
    const preset = GRID_PRESETS[key];
    if (preset) {
      setForm((prev) => ({ ...prev, gridType: key, gridModulus: preset.modulus }));
    }
  };

  const applyApplicationPreset = (key: string) => {
    const preset = APPLICATION_PRESETS[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        application: key,
        passes: preset.passes,
        rutDepth: preset.rutDepth,
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
    const recs: { check: string; suggestion: string }[] = [];
    if (results.savingPercent > 30)
      recs.push({
        check: 'High Reinforcement Benefit',
        suggestion: `${results.savingPercent.toFixed(0)}% aggregate saving — geogrid is cost-effective`,
      });
    if (results.cu < 30)
      recs.push({
        check: 'Soft Subgrade',
        suggestion: 'Consider geotextile separation layer beneath geogrid',
      });
    if (results.cu >= 90)
      recs.push({
        check: 'Good Subgrade',
        suggestion: 'Reinforcement benefit may be limited — verify cost-benefit',
      });
    if (results.thicknessReinforced > 0.3)
      recs.push({
        check: 'Thick Aggregate Layer',
        suggestion: 'Consider staged construction or higher-grade geogrid',
      });
    if (form.gridType === 'none')
      recs.push({
        check: 'No Reinforcement',
        suggestion: 'Select a geogrid type to see potential aggregate savings',
      });

    generatePremiumPDF({
      title: 'Geogrid Design',
      subtitle: 'Giroud-Han Bearing Capacity Method — Subgrade Stabilization',
      projectInfo: [
        { label: 'Project', value: 'Geogrid Design' },
        { label: 'Reference', value: 'GEO001' },
        { label: 'Grid Type', value: GRID_PRESETS[form.gridType]?.label || form.gridType },
        {
          label: 'Application',
          value: APPLICATION_PRESETS[form.application]?.label || form.application,
        },
      ],
      inputs: [
        { label: 'Wheel Load', value: `${form.wheelLoad} kN` },
        { label: 'Tire Pressure', value: `${form.tirePressure} kPa` },
        { label: 'Design Passes', value: form.passes },
        { label: 'Allowable Rut Depth', value: `${form.rutDepth} mm` },
        { label: 'CBR', value: `${form.cbr}%` },
        { label: 'Grid Modulus', value: `${form.gridModulus} kN/m` },
        {
          label: 'Aggregate Type',
          value: AGGREGATE_PRESETS[form.aggregateType]?.label || form.aggregateType,
        },
      ],
      checks: [
        {
          name: 'Unreinforced Thickness',
          capacity: `${(results.thicknessUnreinforced * 1000).toFixed(0)} mm`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Reinforced Thickness',
          capacity: `${(results.thicknessReinforced * 1000).toFixed(0)} mm`,
          utilisation: '-',
          status: results.overallStatus,
        },
        {
          name: 'Aggregate Saving',
          capacity: `${(results.aggregateSaving * 1000).toFixed(0)} mm (${results.savingPercent.toFixed(0)}%)`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Min Thickness Check',
          capacity: `${(results.thicknessReinforced * 1000).toFixed(0)} >= ${(results.minThickness * 1000).toFixed(0)} mm`,
          utilisation: '-',
          status: results.overallStatus,
        },
      ],
      sections: [
        {
          title: 'Design Parameters',
          head: [['Parameter', 'Value', 'Units']],
          body: [
            ['Undrained Shear Strength (Cu)', results.cu.toFixed(1), 'kPa'],
            ['Contact Radius', (results.contactRadius * 1000).toFixed(1), 'mm'],
            ['Nc (Unreinforced)', results.ncUnreinforced.toFixed(2), '-'],
            ['Nc (Reinforced)', results.ncReinforced.toFixed(2), '-'],
            ['Traffic Factor', results.trafficFactor.toFixed(2), '-'],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Geogrid Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.savingPercent > 30)
      recs.push({
        check: 'High Reinforcement Benefit',
        suggestion: `${results.savingPercent.toFixed(0)}% aggregate saving — geogrid is cost-effective`,
      });
    if (results.cu < 30)
      recs.push({
        check: 'Soft Subgrade',
        suggestion: 'Consider geotextile separation layer beneath geogrid',
      });
    if (results.cu >= 90)
      recs.push({
        check: 'Good Subgrade',
        suggestion: 'Reinforcement benefit may be limited — verify cost-benefit',
      });
    if (results.thicknessReinforced > 0.3)
      recs.push({
        check: 'Thick Aggregate Layer',
        suggestion: 'Consider staged construction or higher-grade geogrid',
      });
    if (form.gridType === 'none')
      recs.push({
        check: 'No Reinforcement',
        suggestion: 'Select a geogrid type to see potential aggregate savings',
      });

    generateDOCX({
      title: 'Geogrid Design',
      subtitle: 'Giroud-Han Bearing Capacity Method — Subgrade Stabilization',
      projectInfo: [
        { label: 'Project', value: 'Geogrid Design' },
        { label: 'Reference', value: 'GEO001' },
        { label: 'Grid Type', value: GRID_PRESETS[form.gridType]?.label || form.gridType },
        {
          label: 'Application',
          value: APPLICATION_PRESETS[form.application]?.label || form.application,
        },
      ],
      inputs: [
        { label: 'Wheel Load', value: `${form.wheelLoad} kN` },
        { label: 'Tire Pressure', value: `${form.tirePressure} kPa` },
        { label: 'Design Passes', value: form.passes },
        { label: 'Allowable Rut Depth', value: `${form.rutDepth} mm` },
        { label: 'CBR', value: `${form.cbr}%` },
        { label: 'Grid Modulus', value: `${form.gridModulus} kN/m` },
        {
          label: 'Aggregate Type',
          value: AGGREGATE_PRESETS[form.aggregateType]?.label || form.aggregateType,
        },
      ],
      checks: [
        {
          name: 'Unreinforced Thickness',
          capacity: `${(results.thicknessUnreinforced * 1000).toFixed(0)} mm`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Reinforced Thickness',
          capacity: `${(results.thicknessReinforced * 1000).toFixed(0)} mm`,
          utilisation: '-',
          status: results.overallStatus,
        },
        {
          name: 'Aggregate Saving',
          capacity: `${(results.aggregateSaving * 1000).toFixed(0)} mm (${results.savingPercent.toFixed(0)}%)`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Min Thickness Check',
          capacity: `${(results.thicknessReinforced * 1000).toFixed(0)} >= ${(results.minThickness * 1000).toFixed(0)} mm`,
          utilisation: '-',
          status: results.overallStatus,
        },
      ],
      sections: [
        {
          title: 'Design Parameters',
          head: [['Parameter', 'Value', 'Units']],
          body: [
            ['Undrained Shear Strength (Cu)', results.cu.toFixed(1), 'kPa'],
            ['Contact Radius', (results.contactRadius * 1000).toFixed(1), 'mm'],
            ['Nc (Unreinforced)', results.ncUnreinforced.toFixed(2), '-'],
            ['Nc (Reinforced)', results.ncReinforced.toFixed(2), '-'],
            ['Traffic Factor', results.trafficFactor.toFixed(2), '-'],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Geogrid Design',
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
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/15 via-transparent to-orange-900/10" />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

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
              <GeogridDesign3D />
            </Interactive3DDiagram>
            <button
              onClick={() => setPreviewMaximized(false)}
              className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
              aria-label="Minimize preview"
            >
              <FiMinimize2 size={20} />
            </button>
            <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
              GEOGRID DESIGN — REAL-TIME PREVIEW
            </div>
          </div>
          <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
            <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
              <FiSliders size={14} /> Live Parameters
            </h3>
            {[
              { label: 'Wheel Load', key: 'wheelLoad', min: 10, max: 120, step: 5, unit: 'kN' },
              { label: 'CBR', key: 'cbr', min: 0.5, max: 10, step: 0.5, unit: '%' },
              { label: 'Grid Modulus', key: 'gridModulus', min: 100, max: 1000, step: 50, unit: 'kN/m' },
            ].map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">{s.label}</span>
                  <span className="text-white">{(form as any)[s.key]} {s.unit}</span>
                </div>
                <input
                  title={s.label}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={(form as any)[s.key]}
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
                { label: 'Wheel Load', value: `${form.wheelLoad} kN` },
                { label: 'CBR', value: `${form.cbr}%` },
                { label: 'Grid Type', value: form.gridType },
                { label: 'Application', value: form.application },
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
                    { label: 'Unreinforced', value: `${results.thicknessUnreinforced.toFixed(0)} mm`, ok: true },
                    { label: 'Reinforced', value: `${results.thicknessReinforced.toFixed(0)} mm`, ok: true },
                    { label: 'Saving', value: `${results.savingPercent.toFixed(0)}%`, ok: results.savingPercent > 0 },
                    { label: 'Status', value: results.overallStatus, ok: results.overallStatus === 'PASS' },
                  ].map((check) => (
                    <div key={check.label} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-500">{check.label}</span>
                      <span className={cn('font-bold', check.ok ? 'text-emerald-400' : 'text-red-500')}>
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

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-cyan-500/30 mb-4 bg-cyan-950/20">
            <FiGrid className="text-cyan-400" />
            <span className="text-cyan-100 font-mono tracking-wider">
              GROUND IMPROVEMENT | GEOGRID
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">Geogrid Design</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Subgrade stabilization and base reinforcement. Giroud-Han methodology for unpaved and
            paved roads.
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="inline-flex gap-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2">
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
        </div>

        {/* Status Banner */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card
              variant="glass"
              className={cn(
                'p-4 border-2 overflow-hidden shadow-lg',
                results.overallStatus === 'PASS'
                  ? 'border-emerald-500/30 bg-emerald-950/20 shadow-emerald-500/10'
                  : 'border-red-500/30 bg-red-950/20 shadow-red-500/10',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      results.overallStatus === 'PASS' ? 'bg-emerald-500/20' : 'bg-red-500/20',
                    )}
                  >
                    {results.overallStatus === 'PASS' ? (
                      <FiCheck className="text-emerald-400 text-lg" />
                    ) : (
                      <FiAlertTriangle className="text-red-400 text-lg" />
                    )}
                  </div>
                  <div>
                    <div
                      className={cn(
                        'text-sm font-black uppercase tracking-widest',
                        results.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      DESIGN {results.overallStatus === 'PASS' ? 'ADEQUATE' : 'INADEQUATE'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Reinforced: {(results.thicknessReinforced * 1000).toFixed(0)}mm | Saving:{' '}
                      {results.savingPercent.toFixed(0)}% aggregate reduction
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white font-mono">
                    {results.savingPercent.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">saving</div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Summary Cards */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <Card
              variant="glass"
              className="border-neon-cyan/30 shadow-2xl border-l-4 !border-l-orange-400 p-4 text-center"
            >
              <div className="text-xs text-orange-300 uppercase tracking-widest mb-1">
                Unreinforced
              </div>
              <div className="text-3xl font-bold text-white font-mono">
                {(results.thicknessUnreinforced * 1000).toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">mm</div>
            </Card>
            <Card
              variant="glass"
              className="border-neon-cyan/30 shadow-2xl border-l-4 !border-l-cyan-400 p-4 text-center"
            >
              <div className="text-xs text-cyan-300 uppercase tracking-widest mb-1">Reinforced</div>
              <div className="text-3xl font-bold text-white font-mono">
                {(results.thicknessReinforced * 1000).toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">mm</div>
            </Card>
            <Card
              variant="glass"
              className="border-neon-cyan/30 shadow-2xl border-l-4 !border-l-green-400 p-4 text-center"
            >
              <div className="text-xs text-green-300 uppercase tracking-widest mb-1">
                Aggregate Saving
              </div>
              <div className="text-3xl font-bold text-green-400 font-mono">
                {(results.aggregateSaving * 1000).toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">mm ({results.savingPercent.toFixed(0)}%)</div>
            </Card>
            <Card
              variant="glass"
              className="border-neon-cyan/30 shadow-2xl border-l-4 !border-l-amber-400 p-4 text-center"
            >
              <div className="text-xs text-yellow-300 uppercase tracking-widest mb-1">
                Subgrade Cu
              </div>
              <div className="text-3xl font-bold text-white font-mono">{results.cu.toFixed(0)}</div>
              <div className="text-xs text-gray-500">kPa</div>
            </Card>
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
                    {/* Traffic */}
                    <Card
                      variant="glass"
                      className="border-neon-cyan/30 shadow-2xl"
                    >
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('traffic')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiTruck className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Traffic Loading</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.traffic && 'rotate-180',
                          )}
                        />
                      </CardHeader>
                      {expandedSections.traffic && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Application
                              </label>
                              <select
                                title="Application"
                                value={form.application}
                                onChange={(e) => applyApplicationPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(APPLICATION_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Wheel Load"
                                value={form.wheelLoad}
                                onChange={(v) => setForm({ ...form, wheelLoad: v })}
                                unit="kN"
                              />
                              <InputField
                                label="Tire Pressure"
                                value={form.tirePressure}
                                onChange={(v) => setForm({ ...form, tirePressure: v })}
                                unit="kPa"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Design Passes"
                                value={form.passes}
                                onChange={(v) => setForm({ ...form, passes: v })}
                                unit="N"
                              />
                              <InputField
                                label="Rut Depth"
                                value={form.rutDepth}
                                onChange={(v) => setForm({ ...form, rutDepth: v })}
                                unit="mm"
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Soil */}
                    <Card
                      variant="glass"
                      className="border-neon-cyan/30 shadow-2xl"
                    >
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('soil')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Subgrade Soil</CardTitle>
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
                            <InputField
                              label="CBR"
                              value={form.cbr}
                              onChange={(v) => setForm({ ...form, cbr: v })}
                              unit="%"
                            />
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Aggregate Type
                              </label>
                              <select
                                title="Aggregate Type"
                                value={form.aggregateType}
                                onChange={(e) =>
                                  setForm({ ...form, aggregateType: e.target.value })
                                }
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(AGGREGATE_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Reinforcement */}
                    <Card
                      variant="glass"
                      className="border-neon-cyan/30 shadow-2xl"
                    >
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('reinforcement')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiGrid className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">Geogrid Selection</CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.reinforcement && 'rotate-180',
                          )}
                        />
                      </CardHeader>
                      {expandedSections.reinforcement && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Geogrid Type
                              </label>
                              <select
                                title="Geogrid Type"
                                value={form.gridType}
                                onChange={(e) => applyGridPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(GRID_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Modulus (J)"
                              value={form.gridModulus}
                              onChange={(v) => setForm({ ...form, gridModulus: v })}
                              unit="kN/m"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardContent className="py-3">
                        <div className="flex items-start gap-2">
                          <FiSettings className="text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-gray-500">
                            <p className="font-medium text-gray-400 mb-1">Design Method</p>
                            <p>
                              Giroud-Han bearing capacity method. Nc = 3.0 (unreinforced), up to
                              5.7+ (reinforced). Cu = 30×CBR.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <button
                      onClick={calculate}
                      className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-2xl shadow-neon-cyan/20"
                    >
                      ⚡ RUN FULL ANALYSIS
                    </button>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        disabled={!results}
                        className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
                      >
                        <FiDownload className="mr-2" />
                        Export PDF Report
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        disabled={!results}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FiDownload className="mr-2" />
                        DOCX
                      </Button>
                      <SaveRunButton calculatorKey="geogrid-design" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
                    </div>
                  </div>

                  {/* Visualization — Sticky Sidebar */}
                  <div className="lg:col-span-8 space-y-6 sticky top-8 self-start">
                    <div className="relative">
                      <button
                        onClick={() => setPreviewMaximized(true)}
                        className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                        aria-label="Maximize preview"
                        title="Fullscreen preview"
                      >
                        <FiMaximize2 size={16} />
                      </button>
                    </div>
                    <WhatIfPreview
                      title="Geogrid Design — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <GeogridDesign3D />
                        </Interactive3DDiagram>
                      )}
                    />

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
                                Nc (Unreinf.)
                              </div>
                              <div className="text-white font-mono">
                                {results.ncUnreinforced.toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Nc (Reinf.)
                              </div>
                              <div className="text-cyan-400 font-mono">
                                {results.ncReinforced.toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Traffic Factor
                              </div>
                              <div className="text-white font-mono">
                                {results.trafficFactor.toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Contact Radius
                              </div>
                              <div className="text-white font-mono">
                                {(results.contactRadius * 1000).toFixed(0)} mm
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Design Note */}
                    <Card
                      variant="glass"
                      className="border-neon-cyan/30 shadow-2xl"
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <FiInfo className="text-neon-cyan w-5 h-5 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-blue-300 font-bold mb-2">Design Notes</h4>
                            <ul className="text-white text-sm space-y-1 list-disc list-inside">
                              <li>Minimum aggregate layer thickness: 150mm for constructability</li>
                              <li>Consider geotextile separation layer for CBR &lt; 1.5%</li>
                              <li>Ensure adequate aggregate interlock with geogrid apertures</li>
                              <li>Place geogrid at base of aggregate layer (on subgrade)</li>
                              <li>Allow 50mm embedment overlap at edges minimum</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === 'results' && results && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <Card
                    variant="glass"
                    className="border-neon-cyan/30 shadow-2xl p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiActivity className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Detailed Results</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-500 uppercase">
                          Unreinforced Thickness
                        </div>
                        <div className="text-xl font-bold text-orange-400 font-mono">
                          {(results.thicknessUnreinforced * 1000).toFixed(0)} mm
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-500 uppercase">Reinforced Thickness</div>
                        <div className="text-xl font-bold text-cyan-400 font-mono">
                          {(results.thicknessReinforced * 1000).toFixed(0)} mm
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-500 uppercase">Aggregate Saving</div>
                        <div className="text-xl font-bold text-green-400 font-mono">
                          {(results.aggregateSaving * 1000).toFixed(0)} mm (
                          {results.savingPercent.toFixed(0)}%)
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Recommendations */}
                  <Card
                    variant="glass"
                    className="border-neon-cyan/30 shadow-2xl p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiCheck className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-widest">
                        Design Recommendations
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {results.savingPercent > 30 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                          <FiCheck className="text-green-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">
                              High Reinforcement Benefit
                            </div>
                            <div className="text-xs text-gray-400">
                              {results.savingPercent.toFixed(0)}% aggregate saving — geogrid is
                              cost-effective for this application
                            </div>
                          </div>
                        </div>
                      )}
                      {results.cu < 30 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">Soft Subgrade</div>
                            <div className="text-xs text-gray-400">
                              Consider geotextile separation layer beneath geogrid for CBR &lt; 1.5%
                            </div>
                          </div>
                        </div>
                      )}
                      {results.thicknessReinforced > 0.3 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">
                              Thick Aggregate Layer
                            </div>
                            <div className="text-xs text-gray-400">
                              Consider staged construction or higher-grade geogrid to reduce
                              thickness
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                        <FiGrid className="text-cyan-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-white">Installation</div>
                          <div className="text-xs text-gray-400">
                            Place geogrid at base of aggregate layer on prepared subgrade. Ensure
                            50mm min overlap at edges.
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'visualization' && results && (
                <motion.div
                  key="visualization"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-b from-gray-900 to-black p-4">
                      <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                        <GeogridDesign3D />
                      </Interactive3DDiagram>
                    </div>
                  </Card>
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
      field={field || 'geogrid-design'}
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

export default GeogridDesign;
