// =============================================================================
// BeaverCalc Studio — Turning Platform Design (Premium)
// Site logistics & swept path analysis for heavy plant
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
  FiMinimize2,
  FiRotateCw,
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
import TurningPlatform3D from '../../components/3d/scenes/TurningPlatform3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  width: string;
  length: string;
  thickness: string;
  vehicle: string;
  bearingCapacity: string;
  subgradeCBR: string;
}

interface Results {
  requiredDiameter: number;
  providedDimension: number;
  outerRadius: number;
  innerRadius: number;
  tailSwing: number;
  areaStatus: 'PASS' | 'FAIL';
  surfacePressure: number;
  subgradePressure: number;
  bearingUtil: number;
  bearingStatus: 'PASS' | 'FAIL';
  rating: string;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// VEHICLE DATABASE
// =============================================================================

const VEHICLES: Record<
  string,
  {
    name: string;
    length: number;
    width: number;
    turnRadius: number;
    tailSwing: number;
    mass: number;
    pressure: number;
  }
> = {
  piling_rig_60t: {
    name: 'Piling Rig (60t)',
    length: 8.5,
    width: 4.5,
    turnRadius: 6.0,
    tailSwing: 4.5,
    mass: 60,
    pressure: 150,
  },
  piling_rig_80t: {
    name: 'Piling Rig (80t)',
    length: 9.5,
    width: 5.0,
    turnRadius: 6.5,
    tailSwing: 5.0,
    mass: 80,
    pressure: 180,
  },
  piling_rig_100t: {
    name: 'Piling Rig (100t)',
    length: 10.5,
    width: 5.5,
    turnRadius: 7.0,
    tailSwing: 5.5,
    mass: 100,
    pressure: 200,
  },
  mobile_crane_50t: {
    name: '50t Mobile Crane',
    length: 11.0,
    width: 2.6,
    turnRadius: 9.0,
    tailSwing: 3.5,
    mass: 36,
    pressure: 0,
  },
  mobile_crane_100t: {
    name: '100t Mobile Crane',
    length: 13.5,
    width: 2.8,
    turnRadius: 10.0,
    tailSwing: 4.0,
    mass: 48,
    pressure: 0,
  },
  crawler_crane_100t: {
    name: '100t Crawler Crane',
    length: 7.0,
    width: 5.0,
    turnRadius: 5.0,
    tailSwing: 6.0,
    mass: 100,
    pressure: 120,
  },
  adt_30t: {
    name: 'ADT 30t Dump Truck',
    length: 10.0,
    width: 3.0,
    turnRadius: 8.0,
    tailSwing: 0,
    mass: 50,
    pressure: 400,
  },
  adt_40t: {
    name: 'ADT 40t Dump Truck',
    length: 11.5,
    width: 3.2,
    turnRadius: 9.0,
    tailSwing: 0,
    mass: 72,
    pressure: 450,
  },
  low_loader: {
    name: 'Artic Low Loader (16m)',
    length: 16.5,
    width: 2.6,
    turnRadius: 13.5,
    tailSwing: 0.5,
    mass: 44,
    pressure: 600,
  },
  excavator_20t: {
    name: '20t Excavator',
    length: 6.5,
    width: 2.8,
    turnRadius: 4.0,
    tailSwing: 2.5,
    mass: 20,
    pressure: 60,
  },
  excavator_30t: {
    name: '30t Excavator',
    length: 8.0,
    width: 3.2,
    turnRadius: 5.0,
    tailSwing: 3.0,
    mass: 30,
    pressure: 80,
  },
};

const GROUND_PRESETS: Record<string, { bearingCapacity: string; cbr: string; label: string }> = {
  soft_clay: { bearingCapacity: '50', cbr: '2', label: 'Soft Clay' },
  firm_clay: { bearingCapacity: '100', cbr: '5', label: 'Firm Clay' },
  stiff_clay: { bearingCapacity: '200', cbr: '8', label: 'Stiff Clay' },
  loose_sand: { bearingCapacity: '100', cbr: '5', label: 'Loose Sand' },
  dense_sand: { bearingCapacity: '300', cbr: '15', label: 'Dense Sand' },
  gravel: { bearingCapacity: '400', cbr: '25', label: 'Gravel' },
  granular_fill: { bearingCapacity: '150', cbr: '10', label: 'Granular Fill' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const TurningPlatform = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    platform: true,
    vehicle: true,
    ground: false,
  });

  const [form, setForm] = useState<FormData>({
    width: '15',
    length: '15',
    thickness: '500',
    vehicle: 'piling_rig_60t',
    bearingCapacity: '100',
    subgradeCBR: '3',
  });
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'width', label: 'Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'length', label: 'Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'thickness', label: 'Thickness', min: 0, max: 100, step: 1, unit: '' },
    { key: 'vehicle', label: 'Vehicle', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedGround, setSelectedGround] = useState<string>('firm_clay');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATIONS
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'width', label: 'Platform Width' },
      { key: 'length', label: 'Platform Length' },
      { key: 'thickness', label: 'Platform Thickness' },
      { key: 'bearingCapacity', label: 'Bearing Capacity' },
      { key: 'subgradeCBR', label: 'Subgrade CBR' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const width = parseFloat(form.width);
    const length = parseFloat(form.length);
    const thickness = parseFloat(form.thickness);
    const allowBearing = parseFloat(form.bearingCapacity);
    const vehicle = VEHICLES[form.vehicle];

    if (isNaN(width) || width <= 0 || isNaN(length) || length <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid platform dimensions' }]);
      return;
    }

    // Swept path analysis
    const outerRadius = vehicle.turnRadius + vehicle.width / 2 + 0.5;
    const innerRadius = Math.max(0, vehicle.turnRadius - vehicle.width / 2 - 0.5);
    const requiredDiameter = 2 * outerRadius;
    const providedDimension = Math.min(width, length);
    const areaStatus = providedDimension >= requiredDiameter ? 'PASS' : 'FAIL';

    // Bearing pressure analysis
    let surfacePressure = vehicle.pressure;
    if (surfacePressure === 0) {
      // Estimate from tracked/wheeled contact
      const trackL = vehicle.length * 0.6;
      const trackW = 0.8;
      const area = 2 * trackL * trackW;
      surfacePressure = (vehicle.mass * 9.81) / area;
      surfacePressure *= 1.3; // Dynamic factor
    } else {
      if (form.vehicle.includes('piling')) surfacePressure *= 1.2;
    }

    // Load spread through platform (2:1 method)
    const d = thickness / 1000;
    const W_track = 0.8;
    const spreadFactor = W_track / (W_track + d);
    const subgradePressure = surfacePressure * spreadFactor;

    const bearingUtil = (subgradePressure / allowBearing) * 100;
    const bearingStatus = subgradePressure <= allowBearing ? 'PASS' : 'FAIL';

    // Rating
    let rating: string;
    if (areaStatus === 'PASS' && bearingStatus === 'PASS') {
      rating = bearingUtil < 70 ? 'OPTIMAL' : 'ADEQUATE';
    } else {
      rating = 'CRITICAL';
    }

    // Warnings
    if (areaStatus === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: `Platform ${providedDimension.toFixed(1)}m < required ${requiredDiameter.toFixed(1)}m diameter`,
      });
    }
    if (bearingStatus === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: `Subgrade pressure ${subgradePressure.toFixed(0)} kPa > allowable ${allowBearing} kPa`,
      });
    }
    if (bearingUtil > 80 && bearingUtil <= 100) {
      newWarnings.push({
        type: 'warning',
        message: `Bearing utilisation ${bearingUtil.toFixed(0)}% - near limit`,
      });
    }
    if (vehicle.tailSwing > 0) {
      newWarnings.push({
        type: 'info',
        message: `Tail swing clearance: ${vehicle.tailSwing.toFixed(1)}m required`,
      });
    }

    const overallStatus = areaStatus === 'PASS' && bearingStatus === 'PASS' ? 'PASS' : 'FAIL';

    setResults({
      requiredDiameter,
      providedDimension,
      outerRadius,
      innerRadius,
      tailSwing: vehicle.tailSwing,
      areaStatus,
      surfacePressure,
      subgradePressure,
      bearingUtil,
      bearingStatus,
      rating,
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

  const applyGroundPreset = (key: string) => {
    const preset = GROUND_PRESETS[key];
    if (preset) {
      setSelectedGround(key);
      setForm((prev) => ({
        ...prev,
        bearingCapacity: preset.bearingCapacity,
        subgradeCBR: preset.cbr,
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
    const vehicle = VEHICLES[form.vehicle];
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.bearingUtil > 80 && results.bearingUtil <= 100)
      pdfRecs.push({
        check: 'Bearing Near Limit',
        suggestion: `Utilisation at ${results.bearingUtil.toFixed(0)}% — consider thicker platform or ground improvement`,
      });
    if (results.areaStatus === 'FAIL')
      pdfRecs.push({
        check: 'Insufficient Area',
        suggestion: `Platform ${results.providedDimension.toFixed(1)}m < required ${results.requiredDiameter.toFixed(1)}m — increase dimensions`,
      });
    if (results.bearingStatus === 'FAIL')
      pdfRecs.push({
        check: 'Bearing Failure',
        suggestion: 'Subgrade pressure exceeds allowable — increase thickness or improve ground',
      });
    if (results.tailSwing > 0)
      pdfRecs.push({
        check: 'Tail Swing',
        suggestion: `${results.tailSwing.toFixed(1)}m tail swing clearance required — ensure no obstructions`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Platform dimensions and bearing capacity are satisfactory',
      });
    generatePremiumPDF({
      title: 'Turning Platform Design',
      subtitle: 'Swept Path & Ground Bearing Analysis',
      projectInfo: [
        { label: 'Project', value: 'Turning Platform' },
        { label: 'Reference', value: 'TUR001' },
        { label: 'Standard', value: 'BS 5975 / BRE Digest' },
      ],
      inputs: [
        { label: 'Platform Width', value: `${form.width} m` },
        { label: 'Platform Length', value: `${form.length} m` },
        { label: 'Platform Thickness', value: `${form.thickness} mm` },
        { label: 'Vehicle', value: vehicle ? vehicle.name : form.vehicle },
        { label: 'Vehicle Mass', value: vehicle ? `${vehicle.mass} t` : '-' },
        { label: 'Allowable Bearing', value: `${form.bearingCapacity} kPa` },
        { label: 'Subgrade CBR', value: `${form.subgradeCBR} %` },
      ],
      sections: [
        {
          title: 'Swept Path & Bearing Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Required Diameter', results.requiredDiameter.toFixed(2), 'm'],
            ['Provided Dimension', results.providedDimension.toFixed(2), 'm'],
            ['Outer Radius', results.outerRadius.toFixed(2), 'm'],
            ['Inner Radius', results.innerRadius.toFixed(2), 'm'],
            ['Tail Swing', results.tailSwing.toFixed(2), 'm'],
            ['Surface Pressure', results.surfacePressure.toFixed(1), 'kPa'],
            ['Subgrade Pressure', results.subgradePressure.toFixed(1), 'kPa'],
            ['Bearing Utilisation', results.bearingUtil.toFixed(1), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Swept Path Area',
          capacity: `${results.requiredDiameter.toFixed(1)}m req`,
          utilisation: results.areaStatus === 'PASS' ? '50' : '120',
          status: results.areaStatus,
        },
        {
          name: 'Ground Bearing',
          capacity: `${form.bearingCapacity} kPa`,
          utilisation: String(Math.round(results.bearingUtil)),
          status: results.bearingStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Turning Platform Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const vehicle = VEHICLES[form.vehicle];
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.bearingUtil > 80 && results.bearingUtil <= 100)
      pdfRecs.push({
        check: 'Bearing Near Limit',
        suggestion: `Utilisation at ${results.bearingUtil.toFixed(0)}% — consider thicker platform or ground improvement`,
      });
    if (results.areaStatus === 'FAIL')
      pdfRecs.push({
        check: 'Insufficient Area',
        suggestion: `Platform ${results.providedDimension.toFixed(1)}m < required ${results.requiredDiameter.toFixed(1)}m — increase dimensions`,
      });
    if (results.bearingStatus === 'FAIL')
      pdfRecs.push({
        check: 'Bearing Failure',
        suggestion: 'Subgrade pressure exceeds allowable — increase thickness or improve ground',
      });
    if (results.tailSwing > 0)
      pdfRecs.push({
        check: 'Tail Swing',
        suggestion: `${results.tailSwing.toFixed(1)}m tail swing clearance required — ensure no obstructions`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Platform dimensions and bearing capacity are satisfactory',
      });
    generateDOCX({
      title: 'Turning Platform Design',
      subtitle: 'Swept Path & Ground Bearing Analysis',
      projectInfo: [
        { label: 'Project', value: 'Turning Platform' },
        { label: 'Reference', value: 'TUR001' },
        { label: 'Standard', value: 'BS 5975 / BRE Digest' },
      ],
      inputs: [
        { label: 'Platform Width', value: `${form.width} m` },
        { label: 'Platform Length', value: `${form.length} m` },
        { label: 'Platform Thickness', value: `${form.thickness} mm` },
        { label: 'Vehicle', value: vehicle ? vehicle.name : form.vehicle },
        { label: 'Vehicle Mass', value: vehicle ? `${vehicle.mass} t` : '-' },
        { label: 'Allowable Bearing', value: `${form.bearingCapacity} kPa` },
        { label: 'Subgrade CBR', value: `${form.subgradeCBR} %` },
      ],
      sections: [
        {
          title: 'Swept Path & Bearing Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Required Diameter', results.requiredDiameter.toFixed(2), 'm'],
            ['Provided Dimension', results.providedDimension.toFixed(2), 'm'],
            ['Outer Radius', results.outerRadius.toFixed(2), 'm'],
            ['Inner Radius', results.innerRadius.toFixed(2), 'm'],
            ['Tail Swing', results.tailSwing.toFixed(2), 'm'],
            ['Surface Pressure', results.surfacePressure.toFixed(1), 'kPa'],
            ['Subgrade Pressure', results.subgradePressure.toFixed(1), 'kPa'],
            ['Bearing Utilisation', results.bearingUtil.toFixed(1), '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Swept Path Area',
          capacity: `${results.requiredDiameter.toFixed(1)}m req`,
          utilisation: results.areaStatus === 'PASS' ? '50' : '120',
          status: results.areaStatus,
        },
        {
          name: 'Ground Bearing',
          capacity: `${form.bearingCapacity} kPa`,
          utilisation: String(Math.round(results.bearingUtil)),
          status: results.bearingStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Turning Platform Design',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-gray-800/40 backdrop-blur-md border border-gray-700/50 mb-4">
            <FiRotateCw className="text-neon-cyan" />
            <span className="text-gray-100 font-mono tracking-wider">
              SITE LOGISTICS | PLANT MOVEMENTS
            </span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent mb-2">
            Turning Platform
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Verify platform dimensions for vehicle swept paths and ground bearing capacity.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8 p-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl max-w-xl mx-auto">
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
                        {results.rating} — Bearing {results.bearingUtil.toFixed(0)}%
                      </div>
                      <div className="text-gray-400 text-sm">
                        Required: {results.requiredDiameter.toFixed(1)}m diameter | Provided:{' '}
                        {results.providedDimension.toFixed(1)}m
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={exportPDF}
                      className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500"
                    >
                      <FiDownload className="mr-2" />
                      Export Report
                    </Button>
                    <Button onClick={exportDOCX} className="bg-indigo-600 hover:bg-indigo-700">
                      <FiDownload className="mr-2" />
                      Export Report
                    </Button>
                    <SaveRunButton
                      calculatorKey="turning-platform"
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
                        warning.type === 'error' &&
                          'bg-red-950/50 border border-red-500/30 text-red-300',
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

                  {/* Inputs */}
                  <div className="lg:col-span-4 space-y-4">
                    {/* Platform */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('platform')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiGrid className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Platform Dimensions
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.platform && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.platform && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Width"
                                value={form.width}
                                onChange={(v) => setForm({ ...form, width: v })}
                                unit="m"
                              />
                              <InputField
                                label="Length"
                                value={form.length}
                                onChange={(v) => setForm({ ...form, length: v })}
                                unit="m"
                              />
                            </div>
                            <InputField
                              label="Thickness"
                              value={form.thickness}
                              onChange={(v) => setForm({ ...form, thickness: v })}
                              unit="mm"
                            />
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Vehicle */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('vehicle')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiTruck className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Design Vehicle
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.vehicle && 'rotate-180',
                          )}
                        />
                      </CardHeader>

                      {expandedSections.vehicle && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <label className="text-sm font-semibold text-gray-200 mb-1 block">
                                Vehicle Type
                              </label>
                              <select
                                title="Vehicle"
                                value={form.vehicle}
                                onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(VEHICLES).map(([key, v]) => (
                                  <option key={key} value={key}>
                                    {v.name} ({v.mass}t)
                                  </option>
                                ))}
                              </select>
                            </div>
                            {VEHICLES[form.vehicle] && (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-black/30 rounded p-2">
                                  <span className="text-gray-500">Length:</span>{' '}
                                  <span className="text-white">
                                    {VEHICLES[form.vehicle].length}m
                                  </span>
                                </div>
                                <div className="bg-black/30 rounded p-2">
                                  <span className="text-gray-500">Width:</span>{' '}
                                  <span className="text-white">
                                    {VEHICLES[form.vehicle].width}m
                                  </span>
                                </div>
                                <div className="bg-black/30 rounded p-2">
                                  <span className="text-gray-500">Turn R:</span>{' '}
                                  <span className="text-white">
                                    {VEHICLES[form.vehicle].turnRadius}m
                                  </span>
                                </div>
                                <div className="bg-black/30 rounded p-2">
                                  <span className="text-gray-500">Tail:</span>{' '}
                                  <span className="text-white">
                                    {VEHICLES[form.vehicle].tailSwing}m
                                  </span>
                                </div>
                              </div>
                            )}
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
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiGrid className="w-6 h-6 text-neon-cyan" />
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
                                Ground Type
                              </label>
                              <select
                                title="Ground Type"
                                value={selectedGround}
                                onChange={(e) => applyGroundPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                              >
                                {Object.entries(GROUND_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <InputField
                                label="Bearing"
                                value={form.bearingCapacity}
                                onChange={(v) => setForm({ ...form, bearingCapacity: v })}
                                unit="kPa"
                              />
                              <InputField
                                label="CBR"
                                value={form.subgradeCBR}
                                onChange={(v) => setForm({ ...form, subgradeCBR: v })}
                                unit="%"
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Calculate Button */}
                    <button
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
                    <WhatIfPreview
                      title="Turning Platform — 3D Preview"
                      sliders={whatIfSliders}
                      form={form}
                      updateForm={updateForm}
                      status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <TurningPlatform3D />
                        </Interactive3DDiagram>
                      )}
                    />

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
                            <TurningPlatform3D />
                          </Interactive3DDiagram>
                          <button
                            onClick={() => setPreviewMaximized(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                            aria-label="Minimize preview"
                          >
                            <FiMinimize2 size={20} />
                          </button>
                          <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                            TURNING PLATFORM — REAL-TIME PREVIEW
                          </div>
                        </div>
                        <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                          <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                            <FiSliders size={14} /> Live Parameters
                          </h3>
                          {[
                            {
                              label: 'Width',
                              field: 'width' as keyof FormData,
                              min: 5,
                              max: 40,
                              step: 0.5,
                              unit: 'm',
                            },
                            {
                              label: 'Length',
                              field: 'length' as keyof FormData,
                              min: 5,
                              max: 40,
                              step: 0.5,
                              unit: 'm',
                            },
                            {
                              label: 'Thickness',
                              field: 'thickness' as keyof FormData,
                              min: 100,
                              max: 1000,
                              step: 50,
                              unit: 'mm',
                            },
                            {
                              label: 'Bearing Capacity',
                              field: 'bearingCapacity' as keyof FormData,
                              min: 20,
                              max: 500,
                              step: 10,
                              unit: 'kPa',
                            },
                            {
                              label: 'Subgrade CBR',
                              field: 'subgradeCBR' as keyof FormData,
                              min: 0.5,
                              max: 15,
                              step: 0.5,
                              unit: '%',
                            },
                          ].map((s) => (
                            <div key={s.field} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-400">{s.label}</span>
                                <span className="text-white">
                                  {form[s.field] as string} {s.unit}
                                </span>
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
                              { label: 'Platform', value: `${form.width}m × ${form.length}m` },
                              { label: 'Thickness', value: `${form.thickness}mm` },
                              { label: 'Bearing Cap.', value: `${form.bearingCapacity} kPa` },
                              { label: 'Subgrade CBR', value: `${form.subgradeCBR}%` },
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
                                    label: 'Swept Path',
                                    value: results.areaStatus,
                                    status: results.areaStatus,
                                  },
                                  {
                                    label: 'Req. Diameter',
                                    value: `${results.requiredDiameter.toFixed(1)}m`,
                                    status: results.areaStatus,
                                  },
                                  {
                                    label: 'Bearing Util.',
                                    value: `${results.bearingUtil.toFixed(0)}%`,
                                    status: results.bearingStatus,
                                  },
                                  {
                                    label: 'Surface P.',
                                    value: `${results.surfacePressure.toFixed(0)} kPa`,
                                    status: 'PASS' as const,
                                  },
                                  {
                                    label: 'Overall',
                                    value: results.overallStatus,
                                    status: results.overallStatus,
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

                    {results && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ResultCard
                          label="Swept Path"
                          value={results.areaStatus}
                          limit={`Need ${results.requiredDiameter.toFixed(1)}m`}
                          status={results.areaStatus === 'PASS' ? 'pass' : 'fail'}
                        />
                        <ResultCard
                          label="Bearing"
                          value={`${results.bearingUtil.toFixed(0)}%`}
                          limit="≤ 100%"
                          status={
                            results.bearingStatus === 'PASS'
                              ? results.bearingUtil < 70
                                ? 'pass'
                                : 'warning'
                              : 'fail'
                          }
                        />
                        <ResultCard
                          label="Surface Pressure"
                          value={`${results.surfacePressure.toFixed(0)} kPa`}
                          limit=""
                          status="info"
                        />
                        <ResultCard
                          label="Subgrade Pressure"
                          value={`${results.subgradePressure.toFixed(0)} kPa`}
                          limit={`≤ ${form.bearingCapacity} kPa`}
                          status={results.bearingStatus === 'PASS' ? 'pass' : 'fail'}
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
                            Geometry Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Outer Radius
                              </div>
                              <div className="text-white font-mono">
                                {results.outerRadius.toFixed(1)}m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Inner Radius
                              </div>
                              <div className="text-white font-mono">
                                {results.innerRadius.toFixed(1)}m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">Tail Swing</div>
                              <div className="text-purple-400 font-mono">
                                {results.tailSwing.toFixed(1)}m
                              </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">
                                Min Dimension
                              </div>
                              <div
                                className={cn(
                                  'font-mono',
                                  results.areaStatus === 'PASS' ? 'text-green-400' : 'text-red-400',
                                )}
                              >
                                {results.providedDimension.toFixed(1)}m
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results &&
                      (() => {
                        const recs: { icon: string; text: string }[] = [];
                        if (results.bearingUtil > 80 && results.bearingUtil <= 100)
                          recs.push({
                            icon: '⚠️',
                            text: `Bearing at ${results.bearingUtil.toFixed(0)}% — consider thicker platform or ground improvement`,
                          });
                        if (results.areaStatus === 'FAIL')
                          recs.push({
                            icon: '🔴',
                            text: `Platform too small: ${results.providedDimension.toFixed(1)}m < ${results.requiredDiameter.toFixed(1)}m required`,
                          });
                        if (results.bearingStatus === 'FAIL')
                          recs.push({
                            icon: '🔴',
                            text: 'Subgrade pressure exceeds allowable bearing capacity',
                          });
                        if (results.tailSwing > 0)
                          recs.push({
                            icon: '📐',
                            text: `Tail swing clearance: ${results.tailSwing.toFixed(1)}m — ensure no obstructions within this radius`,
                          });
                        if (recs.length === 0)
                          recs.push({
                            icon: '✅',
                            text: 'Platform dimensions and bearing capacity are satisfactory',
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
                          className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600"
                          disabled={!results}
                        >
                          <FiDownload className="mr-2" />
                          Export PDF Report
                        </Button>
                        <Button
                          onClick={exportDOCX}
                          className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600"
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
      field={field || 'turning-platform'}
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
      'p-4 text-center border-l-4 shadow-2xl',
      status === 'pass' && 'border-green-500 bg-green-950/20 shadow-green-500/5',
      status === 'fail' && 'border-red-500 bg-red-950/20 shadow-red-500/5',
      status === 'warning' && 'border-yellow-500 bg-yellow-950/20 shadow-yellow-500/5',
      status === 'info' && 'border-neon-cyan bg-gray-950/20 shadow-neon-cyan/5',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' && 'text-green-400',
        status === 'fail' && 'text-red-400',
        status === 'warning' && 'text-yellow-400',
        status === 'info' && 'text-purple-400',
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

export default TurningPlatform;
