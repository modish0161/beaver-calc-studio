// =============================================================================
// Access Ramps Calculator — Premium Edition
// Plant & Vehicle Access Design per Industry Standards
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMap,
    FiMinimize2,
    FiSliders,
    FiTarget,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import AccessRamps3D from '../../components/3d/scenes/AccessRamps3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  height: string;
  length: string;
  width: string;
  sideSlopeRatio: string;
  plantType: string;
  material: string;
  wetConditions: boolean;
  twoWayTraffic: boolean;
  safetyFactor: string;
  projectName: string;
  reference: string;
}

interface Results {
  gradientPercent: number;
  gradientRatio: number;
  slopeAngle: number;
  slopeLength: number;
  totalVolume: number;
  totalMass: number;
  gradeStatus: 'PASS' | 'MARGINAL' | 'FAIL';
  maxGrade: number;
  tractionSF: number;
  tractionStatus: 'PASS' | 'FAIL';
  widthProvided: number;
  widthRequired: number;
  widthStatus: 'PASS' | 'FAIL';
  stoppingDistance: number;
  runawayRisk: boolean;
  overallStatus: 'PASS' | 'FAIL';
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const PLANT_TYPES = {
  adt_30t: { name: 'Articulated Dump Truck (30t)', maxGrade: 25, width: 3.0 },
  adt_40t: { name: 'Articulated Dump Truck (40t)', maxGrade: 20, width: 3.4 },
  excavator_20t: { name: 'Excavator (20t)', maxGrade: 35, width: 2.8 },
  excavator_30t: { name: 'Excavator (30t)', maxGrade: 35, width: 3.2 },
  rigid_truck: { name: 'Rigid Tipper', maxGrade: 15, width: 2.5 },
  mobile_crane_50t: { name: 'Mobile Crane (50t)', maxGrade: 10, width: 3.0 },
  pedestrian: { name: 'Pedestrian Walkway', maxGrade: 8, width: 1.2 },
  disabled_access: { name: 'Disabled Access (Part M)', maxGrade: 5, width: 1.8 },
};

const RAMP_MATERIALS = {
  compacted_granular: { name: 'Compacted Granular (Type 1)', friction: 0.6, density: 2000 },
  crushed_concrete: { name: 'Crushed Concrete (6F2)', friction: 0.55, density: 1900 },
  concrete_slab: { name: 'Concrete Slab', friction: 0.8, density: 2400 },
  steel_plates: {
    name: 'Steel Road Plates',
    friction: 0.3,
    density: 7850,
    warning: 'Low friction - caution in wet conditions',
  },
};

const PRESETS = {
  haul_road_adt: {
    name: 'Haul Road for ADTs',
    height: '5.0',
    length: '50.0',
    width: '8.0',
    sideSlopeRatio: '1.5',
    plantType: 'adt_30t',
    material: 'compacted_granular',
    twoWayTraffic: true,
  },
  excavator_ramp: {
    name: 'Excavator Access Ramp',
    height: '4.0',
    length: '20.0',
    width: '5.0',
    sideSlopeRatio: '1.5',
    plantType: 'excavator_20t',
    material: 'compacted_granular',
    twoWayTraffic: false,
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AccessRamps: React.FC = () => {
  const [form, setForm] = useState<FormData>({
    height: '3.0',
    length: '20.0',
    width: '6.0',
    sideSlopeRatio: '1.5',
    plantType: 'adt_30t',
    material: 'compacted_granular',
    wetConditions: false,
    twoWayTraffic: true,
    safetyFactor: '1.25',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'height', label: 'Height' },
  { key: 'length', label: 'Length' },
  { key: 'width', label: 'Width' },
  { key: 'sideSlopeRatio', label: 'Side Slope Ratio' },
  { key: 'safetyFactor', label: 'Safety Factor' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'height', label: 'Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'length', label: 'Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'width', label: 'Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'sideSlopeRatio', label: 'Side Slope Ratio', min: 0, max: 100, step: 1, unit: '' }
  ];


  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    plant: true,
    quantities: false,
    project: false,
  });


  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyPreset = (id: string) => {
    const preset = PRESETS[id as keyof typeof PRESETS];
    if (preset) {
      setForm((prev) => ({ ...prev, ...preset }));
    }
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    const H = parseFloat(form.height);
    const L = parseFloat(form.length);
    const W = parseFloat(form.width);
    const SSR = parseFloat(form.sideSlopeRatio);
    const SF = parseFloat(form.safetyFactor);

    // Geometry
    const gradientPercent = (H / L) * 100;
    const gradientRatio = L / H;
    const slopeAngle = (Math.atan(H / L) * 180) / Math.PI;
    const slopeLength = Math.sqrt(H * H + L * L);

    // Quantities
    const crossSectionArea = 0.5 * (W + (W + 2 * SSR * H)) * H;
    const totalVolume = crossSectionArea * L;
    const material = RAMP_MATERIALS[form.material as keyof typeof RAMP_MATERIALS];
    const totalMass = (totalVolume * material.density) / 1000;

    // Plant Check
    const plant = PLANT_TYPES[form.plantType as keyof typeof PLANT_TYPES];
    const gradeStatus =
      gradientPercent <= plant.maxGrade
        ? 'PASS'
        : gradientPercent <= plant.maxGrade + 5
          ? 'MARGINAL'
          : 'FAIL';

    // Traction
    let mu = material.friction;
    if (form.wetConditions) mu *= 0.7;
    const tractionSF =
      (mu * Math.cos((slopeAngle * Math.PI) / 180)) /
      (Math.sin((slopeAngle * Math.PI) / 180) || 0.001);
    const tractionStatus = tractionSF >= SF ? 'PASS' : 'FAIL';

    // Width
    const widthRequired = form.twoWayTraffic ? plant.width * 2 + 2 : plant.width + 1;
    const widthStatus = W >= widthRequired ? 'PASS' : 'FAIL';

    // Stopping Distance (v = 10km/h = 2.77m/s)
    const v = 2.77;
    const g = 9.81;
    const theta = (slopeAngle * Math.PI) / 180;
    const a = g * (mu * Math.cos(theta) - Math.sin(theta));
    const runawayRisk = a <= 0;
    const stoppingDistance = runawayRisk ? Infinity : (v * v) / (2 * a);

    // Warnings
    const w: string[] = [];
    if (gradeStatus === 'FAIL')
      w.push(
        `Gradient (${gradientPercent.toFixed(1)}%) exceeds plant max limit (${plant.maxGrade}%).`,
      );
    if (tractionStatus === 'FAIL')
      w.push('Insufficient traction. Risk of sliding, especially in wet conditions.');
    if (widthStatus === 'FAIL')
      w.push(
        `Width provided (${W}m) is less than required (${widthRequired}m) for this plant type.`,
      );
    if (runawayRisk)
      w.push('CRITICAL: Gradient is too steep for braking friction. Runaway risk detected!');
    if ('warning' in material && material.warning) w.push(material.warning as string);

    setResults({
      gradientPercent,
      gradientRatio,
      slopeAngle,
      slopeLength,
      totalVolume,
      totalMass,
      gradeStatus,
      maxGrade: plant.maxGrade,
      tractionSF,
      tractionStatus,
      widthProvided: W,
      widthRequired,
      widthStatus,
      stoppingDistance,
      runawayRisk,
      overallStatus:
        gradeStatus === 'PASS' &&
        tractionStatus === 'PASS' &&
        widthStatus === 'PASS' &&
        !runawayRisk
          ? 'PASS'
          : 'FAIL',
      rating: runawayRisk
        ? 'DANGEROUS'
        : gradeStatus === 'FAIL' || tractionStatus === 'FAIL'
          ? 'POOR'
          : 'EXCELLENT',
      ratingColor: runawayRisk
        ? 'text-red-500'
        : gradeStatus === 'FAIL'
          ? 'text-orange-500'
          : 'text-emerald-500',
    });
    setWarnings(w);
    setIsCalculating(false);
  }, [form]);

  useEffect(() => {
    const timer = setTimeout(calculate, 500);
    return () => clearTimeout(timer);
  }, [calculate]);

  // Canvas Drawing Logic

  const handleExportPDF = async () => {
    if (!results) return;
    try {
      await generatePremiumPDF({
        title: 'Access Ramp Design',
        subtitle: 'Plant & Vehicle Access Analysis',
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Reference', value: form.reference || '-' },
          { label: 'Standard', value: 'Industry Best Practice' },
        ],
        inputs: [
          { label: 'Rise Height', value: form.height, unit: 'm' },
          { label: 'Run Length', value: form.length, unit: 'm' },
          { label: 'Ramp Width', value: form.width, unit: 'm' },
          { label: 'Side Slope Ratio', value: `1:${form.sideSlopeRatio}` },
          {
            label: 'Plant Type',
            value: PLANT_TYPES[form.plantType as keyof typeof PLANT_TYPES].name,
          },
          {
            label: 'Ramp Material',
            value: RAMP_MATERIALS[form.material as keyof typeof RAMP_MATERIALS].name,
          },
          { label: 'Wet Conditions', value: form.wetConditions ? 'Yes' : 'No' },
          { label: 'Two-Way Traffic', value: form.twoWayTraffic ? 'Yes' : 'No' },
        ],
        checks: [
          {
            name: 'Gradient Check',
            capacity: `${results.maxGrade}%`,
            utilisation: `${results.gradientPercent.toFixed(1)}%`,
            status: results.gradeStatus === 'PASS' ? 'PASS' : 'FAIL',
          },
          {
            name: 'Traction Safety',
            capacity: form.safetyFactor,
            utilisation: results.tractionSF.toFixed(2),
            status: results.tractionStatus,
          },
          {
            name: 'Width Check',
            capacity: `${results.widthRequired.toFixed(1)} m`,
            utilisation: `${results.widthProvided} m`,
            status: results.widthStatus,
          },
        ],
        sections: [
          {
            title: 'Ramp Geometry',
            head: [['Parameter', 'Value', 'Unit']],
            body: [
              ['Gradient', results.gradientPercent.toFixed(1), '%'],
              ['Gradient Ratio', `1:${results.gradientRatio.toFixed(1)}`, '-'],
              ['Slope Angle', results.slopeAngle.toFixed(1), '°'],
              ['Slope Length', results.slopeLength.toFixed(2), 'm'],
              ['Total Volume', results.totalVolume.toFixed(0), 'm³'],
              ['Total Mass', results.totalMass.toFixed(0), 'tonnes'],
              [
                'Stopping Distance',
                results.stoppingDistance === Infinity
                  ? 'N/A (Runaway)'
                  : results.stoppingDistance.toFixed(1),
                'm',
              ],
            ],
          },
        ],
        recommendations: [
          ...(results.tractionSF < 1.5
            ? [
                {
                  check: 'Low Traction SF',
                  suggestion: 'Consider surface treatment or reduced gradient',
                },
              ]
            : []),
          ...(results.widthStatus === 'FAIL'
            ? [
                {
                  check: 'Insufficient Width',
                  suggestion: 'Widen ramp to meet minimum plant width',
                },
              ]
            : []),
          ...(results.runawayRisk
            ? [{ check: 'Runaway Risk', suggestion: 'CRITICAL — Gradient too steep for braking' }]
            : []),
          {
            check: 'Overall',
            suggestion:
              results.overallStatus === 'PASS'
                ? 'Design adequate'
                : 'Review gradient, width, and traction',
          },
        ],
        warnings,
        footerNote: 'BeaverCalc Studio — Professional Engineering Tools',
      });
    } catch (error) {
      console.error('PDF Export Error:', error);
    }
  };

  // DOCX Export — Editable Word document
  const handleExportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Access Ramp Design',
      subtitle: 'Plant & Vehicle Access Analysis',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || '-' },
      ],
      inputs: [
        { label: 'Rise Height', value: form.height, unit: 'm' },
        { label: 'Run Length', value: form.length, unit: 'm' },
        { label: 'Ramp Width', value: form.width, unit: 'm' },
        { label: 'Side Slope Ratio', value: `1:${form.sideSlopeRatio}`, unit: '' },
        {
          label: 'Plant Type',
          value: PLANT_TYPES[form.plantType as keyof typeof PLANT_TYPES]?.name || form.plantType,
          unit: '',
        },
        {
          label: 'Ramp Material',
          value:
            RAMP_MATERIALS[form.material as keyof typeof RAMP_MATERIALS]?.name || form.material,
          unit: '',
        },
      ],
      checks: [
        {
          name: 'Gradient',
          capacity: `${results.maxGrade}%`,
          utilisation: `${results.gradientPercent?.toFixed(1) || '-'}%`,
          status: (results.gradeStatus === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Traction Safety',
          capacity: form.safetyFactor,
          utilisation: `${results.tractionSF?.toFixed(2) || '-'}`,
          status: results.tractionStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Width',
          capacity: `${results.widthRequired?.toFixed(1) || '-'} m`,
          utilisation: `${results.widthProvided || '-'} m`,
          status: results.widthStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Overall',
          suggestion:
            results.overallStatus === 'PASS'
              ? 'Design adequate'
              : 'Review gradient, width, and traction',
        },
      ],
      warnings: warnings || [],
      footerNote: 'BeaverCalc Studio — Professional Engineering Tools',
    });
  };

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
      className={cn('rounded-2xl border overflow-hidden shadow-2xl', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/40 backdrop-blur-md hover:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
            {icon}
          </div>
          <span className="text-xl font-bold text-white">{title}</span>
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

  const InputField: React.FC<{
    label: string;
    field: keyof FormData;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} className="text-sm font-semibold text-gray-200" />
      <div className="relative">
        <input
          title={label}
          type={type}
          value={form[field] as string}
          onChange={(e) =>
            updateForm(field, type === 'checkbox' ? e.target.checked : e.target.value)
          }
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
        />
        {unit && <span className="absolute right-3 top-3 text-gray-500 text-sm">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />

      {/* Grid Pattern Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 mt-20">
        {/* Glass Toolbar Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
                Access Ramps Design
              </h1>
              <p className="text-lg text-gray-400 mt-2">Plant & Vehicle Access Analysis</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={calculate}
                disabled={isCalculating}
                className="px-8 py-4 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-lg font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
              >
                {isCalculating ? (
                  <FiActivity className="animate-spin mr-2" />
                ) : (
                  <FiZap className="mr-2" />
                )}
                ⚡ RUN ANALYSIS
              </Button>
              {results && (
                <>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                  >
                    <FiDownload className="mr-2" />
                    PDF
                  </Button>
                  <Button
                    onClick={handleExportDOCX}
                    variant="outline"
                    className="border-neon-purple/50 text-neon-purple hover:bg-neon-purple/10"
                  >
                    <FiDownload className="mr-2" />
                    DOCX
                  </Button>
                  <SaveRunButton
                    calculatorKey="access_ramps"
                    inputs={form as unknown as Record<string, string>}
                    results={results}
                    status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    summary={
                      results ? `${results.gradientPercent?.toFixed(1) || '-'}% grade` : undefined
                    }
                  />
                </>
              )}
            </div>
          </div>
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

        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-4">
                {/* Presets */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiZap className="w-6 h-6 text-neon-cyan" />
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
                          className="border-gray-600 hover:border-neon-cyan hover:text-neon-cyan"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Section
                  id="geometry"
                  title="Ramp Geometry"
                  icon={<FiMap className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Rise Height" field="height" unit="m" />
                    <InputField label="Run Length" field="length" unit="m" />
                    <InputField label="Ramp Width" field="width" unit="m" />
                    <InputField label="Side Slope Ratio (1:x)" field="sideSlopeRatio" />
                  </div>
                </Section>

                <Section
                  id="plant"
                  title="Plant & Material"
                  icon={<FiLayers className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Plant Type</label>
                      <select
                        value={form.plantType}
                        onChange={(e) => updateForm('plantType', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                        title="Plant Type"
                      >
                        {Object.entries(PLANT_TYPES).map(([id, plant]) => (
                          <option key={id} value={id}>
                            {plant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Ramp Material</label>
                      <select
                        value={form.material}
                        onChange={(e) => updateForm('material', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                        title="Ramp Material"
                      >
                        {Object.entries(RAMP_MATERIALS).map(([id, mat]) => (
                          <option key={id} value={id}>
                            {mat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input
                        title="Input value"
                        type="checkbox"
                        id="wet"
                        checked={form.wetConditions}
                        onChange={(e) => updateForm('wetConditions', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-700"
                      />
                      <label htmlFor="wet" className="text-sm font-semibold text-gray-200">
                        Wet Conditions (Reduced Friction)
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input
                        title="Input value"
                        type="checkbox"
                        id="twoway"
                        checked={form.twoWayTraffic}
                        onChange={(e) => updateForm('twoWayTraffic', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-700"
                      />
                      <label htmlFor="twoway" className="text-sm font-semibold text-gray-200">
                        Two-Way Traffic
                      </label>
                    </div>
                  </div>
                </Section>

                <Section
                  id="project"
                  title="Project Information"
                  icon={<FiTarget className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Project Name" field="projectName" type="text" />
                    <InputField label="Reference" field="reference" type="text" />
                  </div>
                </Section>

                {/* Big Calculate Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={calculate}
                  disabled={isCalculating}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300"
                >
                  {isCalculating ? 'CALCULATING...' : '⚡ RUN FULL ANALYSIS'}
                </motion.button>
              </div>

              {/* Right Column - Quick Results Preview */}
              <div className="space-y-4 sticky top-8">
                <Card
                  variant="glass"
                  className={cn(
                    'border-neon-cyan/30 shadow-2xl overflow-hidden',
                    results?.overallStatus === 'PASS'
                      ? 'shadow-emerald-500/10'
                      : results?.overallStatus === 'FAIL'
                        ? 'shadow-red-500/10'
                        : 'shadow-neon-cyan/5',
                  )}
                >
                  <div className="p-4 bg-gray-800/40 backdrop-blur-md border-b border-gray-700/50">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiActivity className="w-6 h-6 text-neon-cyan" />
                      </div>
                      Analysis Preview
                    </h3>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/50 border-l-4 border-l-neon-cyan">
                        <div className="text-xs text-gray-400 mb-1">Gradient</div>
                        <div className="text-lg font-bold">
                          {results?.gradientPercent.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/50 border-l-4 border-l-neon-purple">
                        <div className="text-xs text-gray-400 mb-1">Traction SF</div>
                        <div className="text-lg font-bold">{results?.tractionSF.toFixed(2)}</div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'p-4 rounded-xl border-l-4 shadow-lg text-center font-bold text-lg',
                        results?.overallStatus === 'PASS'
                          ? 'bg-emerald-500/20 border-l-emerald-500 text-emerald-400'
                          : 'bg-red-500/20 border-l-red-500 text-red-400',
                      )}
                    >
                      {results?.overallStatus === 'PASS' ? '✅ SAFE DESIGN' : '⚠️ DESIGN FAILED'}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {results && (
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-4">
                    <h3 className="text-sm font-bold text-neon-cyan mb-3 flex items-center gap-2">
                      <FiCheck className="w-4 h-4" /> Recommendations
                    </h3>
                    <div className="space-y-2">
                      {results.tractionSF < 1.5 && (
                        <div className="flex items-start gap-2 text-xs border-l-4 border-l-amber-500 pl-2">
                          <span className="text-gray-300">
                            Low traction SF — consider surface treatment or reduced gradient
                          </span>
                        </div>
                      )}
                      {results.gradientPercent > results.maxGrade * 0.8 && (
                        <div className="flex items-start gap-2 text-xs border-l-4 border-l-amber-500 pl-2">
                          <span className="text-gray-300">
                            Gradient approaching plant limit — verify with manufacturer
                          </span>
                        </div>
                      )}
                      {results.widthStatus === 'FAIL' && (
                        <div className="flex items-start gap-2 text-xs border-l-4 border-l-red-500 pl-2">
                          <span className="text-gray-300">
                            Widen ramp to meet minimum width for selected plant
                          </span>
                        </div>
                      )}
                      <div className={cn('flex items-start gap-2 text-xs border-l-4 pl-2', results.overallStatus === 'PASS' ? 'border-l-emerald-500' : 'border-l-red-500')}>
                        <span className="text-gray-300">
                          {results.overallStatus === 'PASS'
                            ? 'Design adequate for selected plant and conditions'
                            : 'Review gradient, width, and traction parameters'}
                        </span>
                      </div>
                    </div>
                  </Card>
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
                        <AccessRamps3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        ACCESS RAMPS — REAL-TIME PREVIEW
                      </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        { label: 'Height', field: 'height' as keyof FormData, min: 0.5, max: 10, step: 0.5, unit: 'm' },
                        { label: 'Length', field: 'length' as keyof FormData, min: 5, max: 50, step: 1, unit: 'm' },
                        { label: 'Width', field: 'width' as keyof FormData, min: 3, max: 12, step: 0.5, unit: 'm' },
                        { label: 'Side Slope', field: 'sideSlopeRatio' as keyof FormData, min: 0.5, max: 3.0, step: 0.1, unit: ':1' },
                      ].map((s) => (
                        <div key={s.field} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">{form[s.field] as string} {s.unit}</span>
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
                          { label: 'Plant Type', value: form.plantType },
                          { label: 'Material', value: form.material },
                          { label: 'Wet Conditions', value: form.wetConditions ? 'Yes' : 'No' },
                          { label: 'Two-Way Traffic', value: form.twoWayTraffic ? 'Yes' : 'No' },
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
                              { label: 'Gradient', util: `${results.gradientPercent.toFixed(1)}%`, status: results.gradeStatus },
                              { label: 'Traction SF', util: results.tractionSF.toFixed(2), status: results.tractionStatus },
                              { label: 'Width', util: `${results.widthProvided.toFixed(1)}/${results.widthRequired.toFixed(1)}m`, status: results.widthStatus },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : check.status === 'MARGINAL' ? 'text-orange-400' : 'text-emerald-400')}>
                                  {check.util}
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
                  title="Access Ramps — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <AccessRamps3D />
                    </Interactive3DDiagram>
                  )}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
  );
};

export default AccessRamps;
