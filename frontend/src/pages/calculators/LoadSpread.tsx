// =============================================================================
// BeaverCalc Studio — Load Spread & Stress Distribution (Premium)
// Boussinesq / 2:1 / Westergaard methods with pressure bulb visualization
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
  FiSliders,
  FiTarget,
  FiX,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import LoadSpread3D from '../../components/3d/scenes/LoadSpread3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  method: string;
  foundationType: string;
  load: string;
  length: string;
  width: string;
  diameter: string;
  soil: string;
  targetDepth: string;
  maxDepth: string;
  allowablePressure: string;
}

interface StressPoint {
  depth: number;
  stress: number;
  ratio: number;
}

interface Results {
  contactArea: number;
  contactPressure: number;
  stressProfile: StressPoint[];
  stressAtTarget: number;
  bulbDepth: number;
  significantDepth: number;
  settlement: number;
  stressRatio: number;
  status: 'PASS' | 'FAIL';
  rating: string;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// DATABASES
// =============================================================================

const SPREAD_METHODS: Record<string, { name: string; desc: string }> = {
  boussinesq: { name: 'Boussinesq (Elastic)', desc: 'Elastic half-space - most accurate' },
  two_to_one: { name: '2:1 Approximate', desc: 'Simple 2H:1V spread - conservative' },
  westergaard: { name: 'Westergaard', desc: 'Layered/stratified soils' },
};

const FOUNDATION_TYPES: Record<string, { name: string; desc: string }> = {
  rectangular: { name: 'Rectangular Footing', desc: 'L × B dimensions' },
  circular: { name: 'Circular Footing', desc: 'Diameter D' },
  strip: { name: 'Strip Footing', desc: 'Infinite length, finite width' },
  point: { name: 'Point Load', desc: 'Concentrated load' },
};

const SOILS: Record<string, { name: string; E: number; nu: number; gamma: number }> = {
  soft_clay: { name: 'Soft Clay', E: 5, nu: 0.45, gamma: 17 },
  firm_clay: { name: 'Firm Clay', E: 15, nu: 0.4, gamma: 18 },
  stiff_clay: { name: 'Stiff Clay', E: 40, nu: 0.35, gamma: 19 },
  loose_sand: { name: 'Loose Sand', E: 20, nu: 0.3, gamma: 17 },
  medium_sand: { name: 'Medium Dense Sand', E: 40, nu: 0.3, gamma: 18 },
  dense_sand: { name: 'Dense Sand', E: 80, nu: 0.25, gamma: 20 },
  gravel: { name: 'Gravel', E: 100, nu: 0.25, gamma: 21 },
};

const PRESET_SCENARIOS: Record<
  string,
  { load: string; length: string; width: string; soil: string; label: string }
> = {
  pad_footing: {
    load: '500',
    length: '2.5',
    width: '2.0',
    soil: 'medium_sand',
    label: 'Pad Footing 500kN',
  },
  strip_wall: {
    load: '100',
    length: '1.0',
    width: '0.6',
    soil: 'stiff_clay',
    label: 'Strip (100kN/m)',
  },
  crane_outrigger: {
    load: '800',
    length: '1.5',
    width: '1.5',
    soil: 'firm_clay',
    label: 'Crane Outrigger 800kN',
  },
  piling_rig: {
    load: '1200',
    length: '3.0',
    width: '2.0',
    soil: 'soft_clay',
    label: 'Piling Rig Pad 1200kN',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const LoadSpread = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    loading: true,
    geometry: true,
    ground: false,
  });

  const [form, setForm] = useState<FormData>({
    method: 'boussinesq',
    foundationType: 'rectangular',
    load: '500',
    length: '2.5',
    width: '2.0',
    diameter: '2.0',
    soil: 'medium_sand',
    targetDepth: '3.0',
    maxDepth: '10.0',
    allowablePressure: '150',
  });
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'method', label: 'Method', min: 0, max: 100, step: 1, unit: '' },
    { key: 'foundationType', label: 'Foundation Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'load', label: 'Load', min: 0, max: 100, step: 1, unit: '' },
    { key: 'length', label: 'Length', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // ===========================================================================
  // CALCULATIONS — Boussinesq / 2:1 / Westergaard
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'load', label: 'Applied Load' },
      { key: 'length', label: 'Length' },
      { key: 'width', label: 'Width' },
      { key: 'diameter', label: 'Diameter', optional: true },
      { key: 'targetDepth', label: 'Target Depth' },
      { key: 'maxDepth', label: 'Max Depth' },
      { key: 'allowablePressure', label: 'Allowable Pressure' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const P = parseFloat(form.load);
    const L = parseFloat(form.length);
    const B = parseFloat(form.width);
    const D = parseFloat(form.diameter);
    const zTarget = parseFloat(form.targetDepth);
    const zMax = parseFloat(form.maxDepth);
    const qAllow = parseFloat(form.allowablePressure);
    const soil = SOILS[form.soil];
    const method = form.method;
    const foundType = form.foundationType;

    if (isNaN(P) || P <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid load' }]);
      return;
    }

    // Contact area and pressure
    let A = 0;
    let effectiveB = B;
    if (foundType === 'rectangular' || foundType === 'strip') {
      A = L * B;
    } else if (foundType === 'circular') {
      A = Math.PI * Math.pow(D / 2, 2);
      effectiveB = D;
    } else {
      A = 1;
      effectiveB = 1;
    }
    const qContact = P / A;

    // Build stress profile
    const stressProfile: StressPoint[] = [];
    const dz = 0.25;

    for (let z = dz; z <= zMax; z += dz) {
      let sigma = 0;

      if (method === 'boussinesq') {
        if (foundType === 'rectangular' || foundType === 'strip') {
          // Approximate influence factor for rectangular
          const m = L / (2 * z);
          const n = B / (2 * z);
          const I =
            (1 / (2 * Math.PI)) *
            (Math.atan((m * n) / Math.sqrt(1 + m * m + n * n)) +
              (m * n * Math.sqrt(1 + m * m + n * n)) / ((1 + m * m) * (1 + n * n)));
          sigma = 4 * qContact * I;
        } else if (foundType === 'circular') {
          const r = D / 2;
          sigma = qContact * (1 - Math.pow(1 / (1 + Math.pow(r / z, 2)), 1.5));
        } else {
          sigma = (3 * P) / (2 * Math.PI * z * z);
        }
      } else if (method === 'two_to_one') {
        const Leff = L + z;
        const Beff = B + z;
        sigma = P / (Leff * Beff);
      } else {
        // Westergaard simplified
        const m = L / z;
        const n = B / z;
        const Iw =
          (1 / Math.PI) * Math.atan((m * n) / (2 * Math.sqrt(1 + (m * m) / 4 + (n * n) / 4)));
        sigma = 4 * qContact * Iw;
      }

      const ratio = (sigma / qContact) * 100;
      stressProfile.push({
        depth: parseFloat(z.toFixed(2)),
        stress: parseFloat(sigma.toFixed(2)),
        ratio: parseFloat(ratio.toFixed(1)),
      });
    }

    // Find stress at target depth
    const targetPoint = stressProfile.find((p) => Math.abs(p.depth - zTarget) < dz / 2) || {
      stress: 0,
      ratio: 0,
    };

    // Pressure bulb (10%) and significant (20%) depths
    const bulbDepth = stressProfile.find((p) => p.ratio <= 10)?.depth || zMax;
    const significantDepth = stressProfile.find((p) => p.ratio <= 20)?.depth || zMax;

    // Settlement estimate (elastic)
    const settlement = (qContact * effectiveB * (1 - soil.nu * soil.nu)) / soil.E;

    // Status
    const stressRatio = (targetPoint.stress / qAllow) * 100;
    const status = targetPoint.stress <= qAllow ? 'PASS' : 'FAIL';

    let rating: string;
    if (stressRatio <= 50) rating = 'OPTIMAL';
    else if (stressRatio <= 75) rating = 'EFFICIENT';
    else if (stressRatio <= 100) rating = 'ACCEPTABLE';
    else rating = 'CRITICAL';

    // Warnings
    if (status === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: `Stress at ${zTarget}m = ${targetPoint.stress.toFixed(0)} kPa > allowable ${qAllow} kPa`,
      });
    }
    if (stressRatio > 80 && stressRatio <= 100) {
      newWarnings.push({
        type: 'warning',
        message: `Stress ratio ${stressRatio.toFixed(0)}% - near limit`,
      });
    }
    if (qContact > 300) {
      newWarnings.push({
        type: 'info',
        message: `High contact pressure ${qContact.toFixed(0)} kPa - verify bearing capacity`,
      });
    }
    if (settlement * 1000 > 25) {
      newWarnings.push({
        type: 'warning',
        message: `Estimated settlement ${(settlement * 1000).toFixed(0)}mm may exceed typical limits`,
      });
    }

    setResults({
      contactArea: A,
      contactPressure: qContact,
      stressProfile,
      stressAtTarget: targetPoint.stress,
      bulbDepth,
      significantDepth,
      settlement: settlement * 1000,
      stressRatio,
      status,
      rating,
    });

    setWarnings(newWarnings);
  }, [form]);

  // ===========================================================================
  // CANVAS VISUALIZATION — Pressure bulb
  // ===========================================================================

  // ===========================================================================
  // PRESETS & HELPERS
  // ===========================================================================

  const applyPreset = (key: string) => {
    const preset = PRESET_SCENARIOS[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        load: preset.load,
        length: preset.length,
        width: preset.width,
        soil: preset.soil,
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
    const method = SPREAD_METHODS[form.method];
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.status === 'FAIL')
      pdfRecs.push({
        check: 'Stress Exceeded',
        suggestion: `Stress at ${form.targetDepth}m = ${results.stressAtTarget.toFixed(0)} kPa > allowable ${form.allowablePressure} kPa — increase foundation size or reduce load`,
      });
    if (results.settlement > 25)
      pdfRecs.push({
        check: 'Settlement High',
        suggestion: `Estimated ${results.settlement.toFixed(0)}mm exceeds 25mm limit — consider ground improvement`,
      });
    if (results.stressRatio > 80 && results.stressRatio <= 100)
      pdfRecs.push({
        check: 'Near Limit',
        suggestion: `Stress ratio ${results.stressRatio.toFixed(0)}% — limited margin, consider reducing load`,
      });
    if (results.contactPressure > 300)
      pdfRecs.push({
        check: 'High Contact Pressure',
        suggestion: `${results.contactPressure.toFixed(0)} kPa — verify bearing capacity independently`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Stress distribution within allowable limits',
      });
    generatePremiumPDF({
      title: 'Load Spread Analysis',
      subtitle: 'Stress Distribution & Pressure Bulb',
      projectInfo: [
        { label: 'Project', value: 'Load Spread Analysis' },
        { label: 'Reference', value: 'LOA001' },
        { label: 'Standard', value: method?.name || 'Boussinesq' },
      ],
      inputs: [
        { label: 'Method', value: method?.name || form.method },
        {
          label: 'Foundation Type',
          value: FOUNDATION_TYPES[form.foundationType]?.name || form.foundationType,
        },
        { label: 'Applied Load', value: `${form.load} kN` },
        { label: 'Length', value: `${form.length} m` },
        { label: 'Width', value: `${form.width} m` },
        { label: 'Soil Type', value: soil?.name || form.soil },
        { label: 'Target Depth', value: `${form.targetDepth} m` },
        { label: 'Allowable Pressure', value: `${form.allowablePressure} kPa` },
      ],
      sections: [
        {
          title: 'Stress Distribution Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Contact Area', results.contactArea.toFixed(2), 'm²'],
            ['Contact Pressure', results.contactPressure.toFixed(0), 'kPa'],
            ['Stress at Target Depth', results.stressAtTarget.toFixed(1), 'kPa'],
            ['Pressure Bulb Depth (10%)', results.bulbDepth.toFixed(1), 'm'],
            ['Significant Depth (20%)', results.significantDepth.toFixed(1), 'm'],
            ['Elastic Settlement', results.settlement.toFixed(1), 'mm'],
            ['Stress Ratio', results.stressRatio.toFixed(0), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Stress at Depth',
          capacity: `${form.allowablePressure} kPa`,
          utilisation: String(Math.round(results.stressRatio)),
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Load Spread Analysis',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const soil = SOILS[form.soil];
    const method = SPREAD_METHODS[form.method];
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.status === 'FAIL')
      pdfRecs.push({
        check: 'Stress Exceeded',
        suggestion: `Stress at ${form.targetDepth}m = ${results.stressAtTarget.toFixed(0)} kPa > allowable ${form.allowablePressure} kPa — increase foundation size or reduce load`,
      });
    if (results.settlement > 25)
      pdfRecs.push({
        check: 'Settlement High',
        suggestion: `Estimated ${results.settlement.toFixed(0)}mm exceeds 25mm limit — consider ground improvement`,
      });
    if (results.stressRatio > 80 && results.stressRatio <= 100)
      pdfRecs.push({
        check: 'Near Limit',
        suggestion: `Stress ratio ${results.stressRatio.toFixed(0)}% — limited margin, consider reducing load`,
      });
    if (results.contactPressure > 300)
      pdfRecs.push({
        check: 'High Contact Pressure',
        suggestion: `${results.contactPressure.toFixed(0)} kPa — verify bearing capacity independently`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Stress distribution within allowable limits',
      });
    generateDOCX({
      title: 'Load Spread Analysis',
      subtitle: 'Stress Distribution & Pressure Bulb',
      projectInfo: [
        { label: 'Project', value: 'Load Spread Analysis' },
        { label: 'Reference', value: 'LOA001' },
        { label: 'Standard', value: method?.name || 'Boussinesq' },
      ],
      inputs: [
        { label: 'Method', value: method?.name || form.method },
        {
          label: 'Foundation Type',
          value: FOUNDATION_TYPES[form.foundationType]?.name || form.foundationType,
        },
        { label: 'Applied Load', value: `${form.load} kN` },
        { label: 'Length', value: `${form.length} m` },
        { label: 'Width', value: `${form.width} m` },
        { label: 'Soil Type', value: soil?.name || form.soil },
        { label: 'Target Depth', value: `${form.targetDepth} m` },
        { label: 'Allowable Pressure', value: `${form.allowablePressure} kPa` },
      ],
      sections: [
        {
          title: 'Stress Distribution Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Contact Area', results.contactArea.toFixed(2), 'm²'],
            ['Contact Pressure', results.contactPressure.toFixed(0), 'kPa'],
            ['Stress at Target Depth', results.stressAtTarget.toFixed(1), 'kPa'],
            ['Pressure Bulb Depth (10%)', results.bulbDepth.toFixed(1), 'm'],
            ['Significant Depth (20%)', results.significantDepth.toFixed(1), 'm'],
            ['Elastic Settlement', results.settlement.toFixed(1), 'mm'],
            ['Stress Ratio', results.stressRatio.toFixed(0), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Stress at Depth',
          capacity: `${form.allowablePressure} kPa`,
          utilisation: String(Math.round(results.stressRatio)),
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Load Spread Analysis',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
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
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-800/20 via-transparent to-purple-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
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
              <LoadSpread3D />
            </Interactive3DDiagram>
            <button
              onClick={() => setPreviewMaximized(false)}
              className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
              aria-label="Minimize preview"
            >
              <FiMinimize2 size={20} />
            </button>
            <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
              LOAD SPREAD — REAL-TIME PREVIEW
            </div>
          </div>
          <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
            <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
              <FiSliders size={14} /> Live Parameters
            </h3>
            {[
              { label: 'Applied Load', key: 'load', min: 50, max: 3000, step: 50, unit: 'kN' },
              {
                label: 'Target Depth',
                key: 'targetDepth',
                min: 0.5,
                max: 20,
                step: 0.5,
                unit: 'm',
              },
              { label: 'Width', key: 'width', min: 0.5, max: 10, step: 0.5, unit: 'm' },
            ].map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">{s.label}</span>
                  <span className="text-white">
                    {(form as any)[s.key]} {s.unit}
                  </span>
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
                { label: 'Method', value: form.method },
                { label: 'Foundation', value: form.foundationType },
                { label: 'Load', value: `${form.load} kN` },
                { label: 'Dimensions', value: `${form.length} × ${form.width} m` },
                { label: 'Soil', value: form.soil },
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
                      label: 'Contact Pressure',
                      value: `${results.contactPressure.toFixed(0)} kPa`,
                      ok: true,
                    },
                    {
                      label: 'Stress at Depth',
                      value: `${results.stressAtTarget.toFixed(0)} kPa`,
                      ok: results.status === 'PASS',
                    },
                    { label: 'Bulb Depth', value: `${results.bulbDepth.toFixed(1)} m`, ok: true },
                    { label: 'Status', value: results.status, ok: results.status === 'PASS' },
                  ].map((check) => (
                    <div key={check.label} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-500">{check.label}</span>
                      <span
                        className={cn('font-bold', check.ok ? 'text-emerald-400' : 'text-red-500')}
                      >
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
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4 bg-gray-950/20">
            <FiTarget className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">
              GEOTECHNICS | STRESS ANALYSIS
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-2">
            Load Spread Analysis
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Boussinesq, 2:1, and Westergaard stress distribution with pressure bulb visualization.
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(PRESET_SCENARIOS).map(([key, preset]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(key)}
                className="bg-black/30 border-gray-700 text-gray-300 hover:bg-gray-950/30 hover:border-neon-cyan/50"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
            {['input', 'results', 'visualization'].map((tab) => (
              <button
                key={tab}
                disabled={tab !== 'input' && !results}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 capitalize',
                  activeTab === tab
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                )}
              >
                {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 3D View'}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            {results && (
              <>
                <Button
                  onClick={exportPDF}
                  className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
                >
                  <FiDownload className="mr-1" /> PDF
                </Button>
                <Button
                  onClick={exportDOCX}
                  className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <FiDownload className="mr-1" /> DOCX
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'mb-8 p-4 rounded-xl border-2 shadow-lg flex items-center justify-between',
              results.status === 'PASS'
                ? 'bg-green-950/30 border-green-500/30'
                : 'bg-red-950/30 border-red-500/30',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  results.status === 'PASS' ? 'bg-green-500/20' : 'bg-red-500/20',
                )}
              >
                {results.status === 'PASS' ? (
                  <FiCheck className="w-6 h-6 text-green-400" />
                ) : (
                  <FiX className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div>
                <div
                  className={cn(
                    'text-xl font-bold',
                    results.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                  )}
                >
                  {results.rating} — {results.stressRatio.toFixed(0)}% Utilisation
                </div>
                <div className="text-gray-400 text-sm">
                  σ at {form.targetDepth}m = {results.stressAtTarget.toFixed(0)} kPa | Bulb depth ={' '}
                  {results.bulbDepth.toFixed(1)}m
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <SaveRunButton
                calculatorKey="load-spread"
                inputs={form as unknown as Record<string, string | number>}
                results={results}
                status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
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
          </motion.div>
        )}
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
                {/* Loading */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('loading')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiTarget className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <CardTitle className="text-xl font-bold text-white">Loading</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.loading && 'rotate-180',
                      )}
                    />
                  </CardHeader>

                  {expandedSections.loading && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="Applied Load"
                          value={form.load}
                          onChange={(v) => setForm({ ...form, load: v })}
                          unit="kN"
                        />
                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1 block">
                            Method
                          </label>
                          <select
                            title="Method"
                            value={form.method}
                            onChange={(e) => setForm({ ...form, method: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                          >
                            {Object.entries(SPREAD_METHODS).map(([key, m]) => (
                              <option key={key} value={key}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>

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
                        Foundation Geometry
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
                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1 block">
                            Foundation Type
                          </label>
                          <select
                            title="Foundation Type"
                            value={form.foundationType}
                            onChange={(e) => setForm({ ...form, foundationType: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                          >
                            {Object.entries(FOUNDATION_TYPES).map(([key, f]) => (
                              <option key={key} value={key}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {form.foundationType === 'circular' ? (
                          <InputField
                            label="Diameter"
                            value={form.diameter}
                            onChange={(v) => setForm({ ...form, diameter: v })}
                            unit="m"
                          />
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <InputField
                              label="Length"
                              value={form.length}
                              onChange={(v) => setForm({ ...form, length: v })}
                              unit="m"
                            />
                            <InputField
                              label="Width"
                              value={form.width}
                              onChange={(v) => setForm({ ...form, width: v })}
                              unit="m"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Target Depth"
                            value={form.targetDepth}
                            onChange={(v) => setForm({ ...form, targetDepth: v })}
                            unit="m"
                          />
                          <InputField
                            label="Max Depth"
                            value={form.maxDepth}
                            onChange={(v) => setForm({ ...form, maxDepth: v })}
                            unit="m"
                          />
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>

                {/* Ground */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('ground')}
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
                        expandedSections.ground && 'rotate-180',
                      )}
                    />
                  </CardHeader>

                  {expandedSections.ground && (
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
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <InputField
                          label="Allowable Pressure"
                          value={form.allowablePressure}
                          onChange={(v) => setForm({ ...form, allowablePressure: v })}
                          unit="kPa"
                        />
                        {SOILS[form.soil] && (
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-black/30 rounded p-2 text-center">
                              <span className="text-gray-500 block">E</span>
                              <span className="text-white">{SOILS[form.soil].E} MPa</span>
                            </div>
                            <div className="bg-black/30 rounded p-2 text-center">
                              <span className="text-gray-500 block">ν</span>
                              <span className="text-white">{SOILS[form.soil].nu}</span>
                            </div>
                            <div className="bg-black/30 rounded p-2 text-center">
                              <span className="text-gray-500 block">γ</span>
                              <span className="text-white">{SOILS[form.soil].gamma} kN/m³</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
              </div>

              {/* Calculate Button */}
              <div className="lg:col-span-4 mt-2">
                <button
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                  onClick={() => setForm({ ...form })}
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>

              {/* Visualization & Results */}
              <div className="lg:col-span-8 space-y-6 sticky top-8">
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
                  title="Load Spread — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <LoadSpread3D />
                    </Interactive3DDiagram>
                  )}
                />

                {results && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <ResultCard
                      label="Stress at Depth"
                      value={`${results.stressAtTarget.toFixed(0)} kPa`}
                      limit={`≤ ${form.allowablePressure} kPa`}
                      status={results.status === 'PASS' ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Bulb Depth (10%)"
                      value={`${results.bulbDepth.toFixed(1)}m`}
                      limit=""
                      status="info"
                    />
                    <ResultCard
                      label="Settlement"
                      value={`${results.settlement.toFixed(1)}mm`}
                      limit="Elastic estimate"
                      status={results.settlement > 25 ? 'warning' : 'pass'}
                    />
                    <ResultCard
                      label="Contact Pressure"
                      value={`${results.contactPressure.toFixed(0)} kPa`}
                      limit={`A = ${results.contactArea.toFixed(2)} m²`}
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
                        Stress Profile (Top 5m)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        {results.stressProfile
                          .slice(0, 20)
                          .filter((_, i) => i % 4 === 0)
                          .map((p: StressPoint, i: number) => (
                            <div key={i} className="bg-black/30 rounded p-2 text-center">
                              <div className="text-gray-500">{p.depth}m</div>
                              <div className="text-neon-cyan font-mono">
                                {p.stress.toFixed(0)} kPa
                              </div>
                              <div className="text-gray-600">{p.ratio.toFixed(0)}%</div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {results &&
                  (() => {
                    const recs: { icon: string; text: string }[] = [];
                    if (results.status === 'FAIL')
                      recs.push({
                        icon: '🔴',
                        text: `Stress at depth exceeds allowable — increase foundation area or reduce load`,
                      });
                    if (results.settlement > 25)
                      recs.push({
                        icon: '⚠️',
                        text: `Settlement ${results.settlement.toFixed(0)}mm exceeds 25mm limit — consider ground improvement`,
                      });
                    if (results.stressRatio > 80 && results.stressRatio <= 100)
                      recs.push({
                        icon: '📐',
                        text: 'Near stress limit — limited safety margin available',
                      });
                    if (results.contactPressure > 300)
                      recs.push({
                        icon: '📐',
                        text: `High contact pressure ${results.contactPressure.toFixed(0)} kPa — verify bearing capacity`,
                      });
                    if (recs.length === 0)
                      recs.push({
                        icon: '✅',
                        text: 'Stress distribution is within allowable limits — design adequate',
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
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
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
                      className="w-full bg-gradient-to-r from-neon-blue to-neon-purple"
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
      field={field || 'load-spread'}
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
      'p-4 text-center shadow-2xl',
      status === 'pass' && 'border-l-4 border-green-500 bg-green-950/20 shadow-green-500/5',
      status === 'fail' && 'border-l-4 border-red-500 bg-red-950/20 shadow-red-500/5',
      status === 'warning' && 'border-l-4 border-yellow-500 bg-yellow-950/20 shadow-yellow-500/5',
      status === 'info' && 'border-l-4 border-neon-cyan bg-gray-950/20 shadow-neon-cyan/5',
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
        {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'CHECK'}
      </div>
    )}
  </Card>
);

export default LoadSpread;
