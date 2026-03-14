// =============================================================================
// BeaverCalc Studio — Raking Prop Design (Premium)
// Angled props for temporary works - formwork, walls, excavations
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiInfo,
  FiLayers,
  FiMaximize2,
  FiMinimize2,
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
import RakingProps3D from '../../components/3d/scenes/RakingProps3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  propType: string;
  wallHeight: string;
  baseDistance: string;
  horizontalLoad: string;
  safetyFactor: string;
  propSpacing: string;
}

interface Results {
  propLength: number;
  propAngle: number;
  axialForce: number;
  verticalReaction: number;
  horizontalReaction: number;
  propCapacity: number;
  utilisation: number;
  status: 'PASS' | 'FAIL';
  rating: string;
  ratingColor: string;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const PROP_TYPES: Record<
  string,
  { name: string; maxLoad: number; minLength: number; maxLength: number }
> = {
  std_acrow: { name: 'Standard Acrow Prop', maxLoad: 35, minLength: 1.75, maxLength: 3.12 },
  acrow_no2: { name: 'Acrow No.2 Prop', maxLoad: 30, minLength: 2.44, maxLength: 4.12 },
  acrow_no3: { name: 'Acrow No.3 Prop', maxLoad: 25, minLength: 3.2, maxLength: 4.88 },
  push_pull: { name: 'Push-Pull Prop (Heavy)', maxLoad: 60, minLength: 2.0, maxLength: 5.0 },
  titan: { name: 'Titan / Heavy Shore', maxLoad: 100, minLength: 2.0, maxLength: 6.0 },
  ischebeck: { name: 'Ischebeck Titan 65S', maxLoad: 120, minLength: 1.5, maxLength: 4.5 },
};

const LOAD_PRESETS: Record<string, { horizontalLoad: string; label: string }> = {
  formwork_light: { horizontalLoad: '5', label: 'Light Formwork' },
  formwork_heavy: { horizontalLoad: '15', label: 'Heavy Formwork' },
  wind_normal: { horizontalLoad: '8', label: 'Normal Wind' },
  wind_high: { horizontalLoad: '12', label: 'High Wind' },
  concrete_pressure: { horizontalLoad: '25', label: 'Concrete Pressure' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const RakingProps = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    prop: true,
    loads: false,
  });

  const [form, setForm] = useState<FormData>({
    propType: 'std_acrow',
    wallHeight: '3.0',
    baseDistance: '2.0',
    horizontalLoad: '10',
    safetyFactor: '1.5',
    propSpacing: '2.0',
  });
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'propType', label: 'Prop Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'wallHeight', label: 'Wall Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'baseDistance', label: 'Base Distance', min: 0, max: 100, step: 1, unit: '' },
    { key: 'horizontalLoad', label: 'Horizontal Load', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<string>('wind_normal');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATIONS
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'wallHeight', label: 'Wall Height' },
      { key: 'baseDistance', label: 'Base Distance' },
      { key: 'horizontalLoad', label: 'Horizontal Load' },
      { key: 'safetyFactor', label: 'Safety Factor' },
      { key: 'propSpacing', label: 'Prop Spacing' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const h = parseFloat(form.wallHeight);
    const b = parseFloat(form.baseDistance);
    const H_load = parseFloat(form.horizontalLoad);
    const fos = parseFloat(form.safetyFactor);
    const spacing = parseFloat(form.propSpacing);
    const prop = PROP_TYPES[form.propType as keyof typeof PROP_TYPES];

    if (isNaN(h) || h <= 0 || isNaN(b) || b <= 0 || isNaN(H_load) || H_load <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid input parameters' }]);
      return;
    }

    // Geometry
    const L = Math.sqrt(h * h + b * b);
    const thetaRad = Math.atan(h / b);
    const thetaDeg = (thetaRad * 180) / Math.PI;

    // Force resolution
    const cosTheta = Math.cos(thetaRad);
    const sinTheta = Math.sin(thetaRad);
    const axialForce = (H_load * spacing) / cosTheta; // kN per prop
    const verticalReaction = axialForce * sinTheta;
    const horizontalReaction = H_load * spacing;

    // Capacity with length derating (Euler buckling approximation)
    let lengthFactor = 1.0;
    if (L > 2.5) lengthFactor = 2.5 / L;
    if (L > 4.5) lengthFactor = 0.3;

    const propCapacity = (prop.maxLoad * lengthFactor) / fos;
    const utilisation = (axialForce / propCapacity) * 100;
    const status = utilisation <= 100 ? 'PASS' : 'FAIL';

    // Rating
    let rating: string;
    let ratingColor: string;
    if (status === 'PASS') {
      if (utilisation < 70) {
        rating = 'OPTIMAL';
        ratingColor = '#10B981';
      } else {
        rating = 'ADEQUATE';
        ratingColor = '#F59E0B';
      }
    } else {
      rating = 'CRITICAL';
      ratingColor = '#EF4444';
    }

    // Warnings
    if (L < prop.minLength) {
      newWarnings.push({
        type: 'warning',
        message: `Prop length ${L.toFixed(2)}m < min ${prop.minLength}m`,
      });
    }
    if (L > prop.maxLength) {
      newWarnings.push({
        type: 'error',
        message: `Prop length ${L.toFixed(2)}m > max ${prop.maxLength}m`,
      });
    }
    if (thetaDeg < 30) {
      newWarnings.push({
        type: 'warning',
        message: `Prop angle ${thetaDeg.toFixed(0)}° < 30° - too shallow`,
      });
    }
    if (thetaDeg > 70) {
      newWarnings.push({
        type: 'warning',
        message: `Prop angle ${thetaDeg.toFixed(0)}° > 70° - too steep`,
      });
    }
    if (utilisation > 100) {
      newWarnings.push({
        type: 'error',
        message: `Utilisation ${utilisation.toFixed(0)}% exceeds capacity`,
      });
    }
    if (utilisation > 80 && utilisation <= 100) {
      newWarnings.push({
        type: 'warning',
        message: `High utilisation ${utilisation.toFixed(0)}% - near capacity`,
      });
    }

    const overallStatus = status;

    setResults({
      propLength: L,
      propAngle: thetaDeg,
      axialForce,
      verticalReaction,
      horizontalReaction,
      propCapacity,
      utilisation,
      status,
      rating,
      ratingColor,
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

  const applyLoadPreset = (key: string) => {
    const preset = LOAD_PRESETS[key];
    if (preset) {
      setSelectedLoad(key);
      setForm((prev) => ({
        ...prev,
        horizontalLoad: preset.horizontalLoad,
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
    if (results.utilisation > 80 && results.utilisation <= 100)
      pdfRecs.push({
        check: 'High Utilisation',
        suggestion: `Utilisation at ${results.utilisation.toFixed(0)}% — consider larger prop or additional props`,
      });
    if (results.status === 'FAIL')
      pdfRecs.push({
        check: 'Over Capacity',
        suggestion: 'Axial force exceeds prop capacity — use higher-rated prop or reduce spacing',
      });
    if (results.propAngle < 30)
      pdfRecs.push({
        check: 'Shallow Angle',
        suggestion: `Prop angle ${results.propAngle.toFixed(0)}° < 30° — increase wall height or reduce base distance`,
      });
    if (results.propAngle > 70)
      pdfRecs.push({
        check: 'Steep Angle',
        suggestion: `Prop angle ${results.propAngle.toFixed(0)}° > 70° — increase base distance`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Prop capacity and geometry within acceptable limits',
      });
    generatePremiumPDF({
      title: 'Raking Prop Design',
      subtitle: 'BS 5975 Compliant',
      projectInfo: [
        { label: 'Project', value: '-' },
        { label: 'Reference', value: 'RAK001' },
        { label: 'Standard', value: 'BS 5975' },
      ],
      inputs: [
        { label: 'Prop Type', value: PROP_TYPES[form.propType]?.name || form.propType },
        { label: 'Wall Height', value: `${form.wallHeight} m` },
        { label: 'Base Distance', value: `${form.baseDistance} m` },
        { label: 'Horizontal Load', value: `${form.horizontalLoad} kN/m` },
        { label: 'Prop Spacing', value: `${form.propSpacing} m` },
        { label: 'Safety Factor', value: form.safetyFactor },
      ],
      sections: [
        {
          title: 'Geometry & Force Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Prop Length', results.propLength.toFixed(2), 'm'],
            ['Prop Angle', results.propAngle.toFixed(1), '°'],
            ['Axial Force', results.axialForce.toFixed(1), 'kN'],
            ['Vertical Reaction', results.verticalReaction.toFixed(1), 'kN'],
            ['Horizontal Reaction', results.horizontalReaction.toFixed(1), 'kN'],
            ['Prop Capacity (derated)', results.propCapacity.toFixed(1), 'kN'],
            ['Utilisation', results.utilisation.toFixed(1), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Prop Capacity',
          capacity: `${results.propCapacity.toFixed(1)} kN`,
          utilisation: String(Math.round(results.utilisation)),
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Raking Prop Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.utilisation > 80 && results.utilisation <= 100)
      pdfRecs.push({
        check: 'High Utilisation',
        suggestion: `Utilisation at ${results.utilisation.toFixed(0)}% — consider larger prop or additional props`,
      });
    if (results.status === 'FAIL')
      pdfRecs.push({
        check: 'Over Capacity',
        suggestion: 'Axial force exceeds prop capacity — use higher-rated prop or reduce spacing',
      });
    if (results.propAngle < 30)
      pdfRecs.push({
        check: 'Shallow Angle',
        suggestion: `Prop angle ${results.propAngle.toFixed(0)}° < 30° — increase wall height or reduce base distance`,
      });
    if (results.propAngle > 70)
      pdfRecs.push({
        check: 'Steep Angle',
        suggestion: `Prop angle ${results.propAngle.toFixed(0)}° > 70° — increase base distance`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Prop capacity and geometry within acceptable limits',
      });
    generateDOCX({
      title: 'Raking Prop Design',
      subtitle: 'BS 5975 Compliant',
      projectInfo: [
        { label: 'Project', value: '-' },
        { label: 'Reference', value: 'RAK001' },
        { label: 'Standard', value: 'BS 5975' },
      ],
      inputs: [
        { label: 'Prop Type', value: PROP_TYPES[form.propType]?.name || form.propType },
        { label: 'Wall Height', value: `${form.wallHeight} m` },
        { label: 'Base Distance', value: `${form.baseDistance} m` },
        { label: 'Horizontal Load', value: `${form.horizontalLoad} kN/m` },
        { label: 'Prop Spacing', value: `${form.propSpacing} m` },
        { label: 'Safety Factor', value: form.safetyFactor },
      ],
      sections: [
        {
          title: 'Geometry & Force Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Prop Length', results.propLength.toFixed(2), 'm'],
            ['Prop Angle', results.propAngle.toFixed(1), '°'],
            ['Axial Force', results.axialForce.toFixed(1), 'kN'],
            ['Vertical Reaction', results.verticalReaction.toFixed(1), 'kN'],
            ['Horizontal Reaction', results.horizontalReaction.toFixed(1), 'kN'],
            ['Prop Capacity (derated)', results.propCapacity.toFixed(1), 'kN'],
            ['Utilisation', results.utilisation.toFixed(1), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Prop Capacity',
          capacity: `${results.propCapacity.toFixed(1)} kN`,
          utilisation: String(Math.round(results.utilisation)),
          status: results.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Raking Prop Design',
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
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 mb-4 bg-gray-900/50">
            <FiMaximize2 className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">
              PROPPING & SHORING | BS 5975
            </span>
          </div>
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Raking Prop Design
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BS 5975 raking prop design &amp; stability
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          {(['input', 'results', 'visualization'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'neon' : 'ghost'}
              onClick={() => setActiveTab(tab)}
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
                  {results.rating} — Utilisation {results.utilisation.toFixed(0)}%
                </div>
                <div className="text-gray-400 text-sm">
                  Length: {results.propLength.toFixed(2)}m at {results.propAngle.toFixed(0)}° |
                  Axial: {results.axialForce.toFixed(1)} kN
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportPDF}
                className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button
                onClick={exportDOCX}
                className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
              >
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton
                calculatorKey="raking-props"
                inputs={form as unknown as Record<string, string | number>}
                results={results}
                status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
              />
            </div>
          </motion.div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 space-y-2">
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
            {/* Tab Content */}
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
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiMaximize2 className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Geometry</span>
                        </CardTitle>
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
                                label="Wall Height"
                                value={form.wallHeight}
                                onChange={(v) => setForm({ ...form, wallHeight: v })}
                                unit="m"
                              />
                              <InputField
                                label="Base Distance"
                                value={form.baseDistance}
                                onChange={(v) => setForm({ ...form, baseDistance: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Prop Spacing"
                              value={form.propSpacing}
                              onChange={(v) => setForm({ ...form, propSpacing: v })}
                              unit="m"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Prop Type */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('prop')}
                      >
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiSettings className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Prop Selection</span>
                        </CardTitle>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.prop && 'rotate-180',
                          )}
                        />
                      </CardHeader>
                      {expandedSections.prop && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="flex items-center justify-between text-sm font-semibold text-gray-200 mb-1.5">
                                <span>Prop Type</span>
                              </label>
                              <select
                                title="Prop Type"
                                value={form.propType}
                                onChange={(e) => setForm({ ...form, propType: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all"
                              >
                                {Object.entries(PROP_TYPES).map(([key, prop]) => (
                                  <option key={key} value={key}>
                                    {prop.name} ({prop.maxLoad} kN)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Safety Factor"
                              value={form.safetyFactor}
                              onChange={(v) => setForm({ ...form, safetyFactor: v })}
                              unit=""
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
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiLayers className="text-neon-cyan" size={24} />
                          </motion.div>
                          <span>Applied Loads</span>
                        </CardTitle>
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
                              <label className="flex items-center justify-between text-sm font-semibold text-gray-200 mb-1.5">
                                <span>Load Case</span>
                              </label>
                              <select
                                title="Load Case"
                                value={selectedLoad}
                                onChange={(e) => applyLoadPreset(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all"
                              >
                                {Object.entries(LOAD_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <InputField
                              label="Horizontal Load"
                              value={form.horizontalLoad}
                              onChange={(v) => setForm({ ...form, horizontalLoad: v })}
                              unit="kN/m"
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
                        onClick={() => {
                          setForm((prev) => ({ ...prev }));
                          setActiveTab('results');
                        }}
                        className="px-16 py-8 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl"
                      >
                        RUN FULL ANALYSIS
                      </Button>
                    </motion.div>
                  </div>

                  {/* Visualization & Results — Sticky Right Column */}
                  <div className="lg:col-span-8">
                    <div className="sticky top-32 space-y-6">
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
                              <RakingProps3D />
                            </Interactive3DDiagram>
                            <button
                              onClick={() => setPreviewMaximized(false)}
                              className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                              aria-label="Minimize preview"
                            >
                              <FiMinimize2 size={20} />
                            </button>
                            <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                              RAKING PROPS — REAL-TIME PREVIEW
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
                        title="Raking Props — 3D Preview"
                        sliders={whatIfSliders}
                        form={form}
                        updateForm={updateForm}
                        status={
                          (results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined
                        }
                        onMaximize={() => setPreviewMaximized(true)}
                        renderScene={(fsHeight) => (
                          <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                            <RakingProps3D />
                          </Interactive3DDiagram>
                        )}
                      />

                      {results && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <ResultCard
                            label="Utilisation"
                            value={`${results.utilisation.toFixed(0)}%`}
                            limit="≤ 100%"
                            status={
                              results.status === 'PASS'
                                ? results.utilisation < 70
                                  ? 'pass'
                                  : 'warning'
                                : 'fail'
                            }
                          />
                          <ResultCard
                            label="Prop Length"
                            value={`${results.propLength.toFixed(2)}m`}
                            limit=""
                            status="info"
                          />
                          <ResultCard
                            label="Prop Angle"
                            value={`${results.propAngle.toFixed(0)}°`}
                            limit="30-70°"
                            status={
                              results.propAngle >= 30 && results.propAngle <= 70
                                ? 'pass'
                                : 'warning'
                            }
                          />
                          <ResultCard
                            label="Axial Force"
                            value={`${results.axialForce.toFixed(1)} kN`}
                            limit={`≤ ${results.propCapacity.toFixed(0)} kN`}
                            status={results.status === 'PASS' ? 'pass' : 'fail'}
                          />
                        </div>
                      )}

                      {results && (
                        <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                          <CardHeader className="py-3">
                            <CardTitle className="text-white text-sm flex items-center gap-2">
                              <FiInfo className="text-neon-cyan" />
                              Force Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Vertical Reaction
                                </div>
                                <div className="text-white font-mono">
                                  {results.verticalReaction.toFixed(1)} kN
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Horizontal Reaction
                                </div>
                                <div className="text-white font-mono">
                                  {results.horizontalReaction.toFixed(1)} kN
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Prop Capacity
                                </div>
                                <div className="text-neon-cyan font-mono">
                                  {results.propCapacity.toFixed(0)} kN
                                </div>
                              </div>
                              <div className="bg-black/30 rounded-lg p-3">
                                <div className="text-gray-500 text-xs uppercase mb-1">
                                  Prop Type
                                </div>
                                <div className="text-amber-400 font-mono text-xs">
                                  {PROP_TYPES[form.propType as keyof typeof PROP_TYPES]?.name}
                                </div>
                              </div>
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
                              text: `Axial force ${results.axialForce.toFixed(1)} kN exceeds capacity ${results.propCapacity.toFixed(0)} kN`,
                            });
                          if (results.utilisation > 80 && results.utilisation <= 100)
                            recs.push({
                              icon: '⚠️',
                              text: `High utilisation at ${results.utilisation.toFixed(0)}% — consider larger prop or closer spacing`,
                            });
                          if (results.propAngle < 30)
                            recs.push({
                              icon: '⚠️',
                              text: `Prop angle ${results.propAngle.toFixed(0)}° too shallow — increase height or reduce base distance`,
                            });
                          if (results.propAngle > 70)
                            recs.push({
                              icon: '⚠️',
                              text: `Prop angle ${results.propAngle.toFixed(0)}° too steep — increase base distance`,
                            });
                          if (recs.length === 0)
                            recs.push({
                              icon: '✅',
                              text: 'Prop capacity and geometry within acceptable limits',
                            });
                          return (
                            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                              <CardHeader className="py-3">
                                <CardTitle className="text-white text-sm flex items-center gap-2">
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
                            className="w-full bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
                            disabled={!results}
                          >
                            <FiDownload className="mr-2" />
                            Export PDF Report
                          </Button>
                          <Button
                            onClick={exportDOCX}
                            className="w-full bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple"
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

              {activeTab === 'results' && results && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card variant="glass" className="p-6 border-l-4 border-l-neon-cyan shadow-2xl">
                      <h3 className="text-white font-bold mb-2">Maximum Utilisation</h3>
                      <div
                        className={cn(
                          'text-4xl font-black',
                          results.utilisation <= 100 ? 'text-neon-cyan' : 'text-red-400',
                        )}
                      >
                        {results.utilisation.toFixed(1)}%
                      </div>
                    </Card>
                    <Card
                      variant="glass"
                      className="p-6 border-l-4 border-l-emerald-500 shadow-2xl"
                    >
                      <h3 className="text-white font-bold mb-2">Status</h3>
                      <div className="flex items-center gap-2">
                        {results.status === 'PASS' && (
                          <FiCheck className="text-emerald-400" size={24} />
                        )}
                        <div
                          className={cn(
                            'text-2xl font-black',
                            results.status === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {results.status}
                        </div>
                      </div>
                    </Card>
                    <Card variant="glass" className="p-6 border-l-4 border-l-purple-500 shadow-2xl">
                      <h3 className="text-white font-bold mb-2">Prop Details</h3>
                      <div className="text-xl font-bold text-gray-400">
                        {PROP_TYPES[form.propType]?.name}
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {results.propLength.toFixed(2)}m at {results.propAngle.toFixed(0)}°
                      </p>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === 'visualization' && (
                <motion.div
                  key="visualization"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <Card
                    variant="glass"
                    className="overflow-hidden border-neon-cyan/30 shadow-2xl p-4"
                  >
                    <div className="aspect-video relative rounded-xl overflow-hidden bg-gray-900 shadow-2xl">
                      <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                        <RakingProps3D />
                      </Interactive3DDiagram>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Additional CSS for grid pattern */}
      <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
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
    <label className="flex items-center justify-between text-sm font-semibold text-gray-200 mb-1.5">
      <ExplainableLabel label={label} field={field || 'raking-props'} />
      {unit && <span className="text-neon-cyan text-xs">{unit}</span>}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all font-mono"
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
      'p-4 border-l-4 shadow-lg',
      status === 'pass' && 'border-l-green-500 bg-green-950/20 shadow-green-500/5',
      status === 'fail' && 'border-l-red-500 bg-red-950/20 shadow-red-500/5',
      status === 'warning' && 'border-l-yellow-500 bg-yellow-950/20 shadow-yellow-500/5',
      status === 'info' && 'border-l-neon-cyan bg-gray-900/30 shadow-neon-cyan/5',
    )}
  >
    <div className="flex justify-between items-start mb-2">
      <div className="text-xs uppercase text-gray-400">{label}</div>
      {status !== 'info' && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
            status === 'pass' && 'bg-green-500/20 text-green-400',
            status === 'fail' && 'bg-red-500/20 text-red-400',
            status === 'warning' && 'bg-yellow-500/20 text-yellow-400',
          )}
        >
          {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'MARGINAL'}
        </span>
      )}
    </div>
    <div className="flex items-center gap-2">
      {status === 'pass' && <FiCheck className="text-green-400" />}
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
    </div>
    {limit && <div className="text-xs text-gray-500 mt-1">{limit}</div>}
  </Card>
);

export default RakingProps;
