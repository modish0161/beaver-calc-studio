// =============================================================================
// BeaverCalc Studio — Temporary Parapet Calculator (Premium)
// EN 13374 edge protection design for clamp-on systems
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
    FiSettings,
    FiShield,
    FiX,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { generateDOCX } from '../../lib/docxGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import WhatIfPreview from '../../components/WhatIfPreview';
import TemporaryParapet3D from '../../components/3d/scenes/TemporaryParapet3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  protectionClass: string;
  postSpacing: string;
  barrierHeight: string;
  slabThickness: string;
  windPressure: string;
  postSectionKey: string;
  clampType: string;
  concreteGrade: string;
}

interface Results {
  windForce: number;
  staticForce: number;
  designForce: number;
  designMoment: number;
  postCapacity: number;
  clampForce: number;
  clampCapacity: number;
  postUtilisation: number;
  clampUtilisation: number;
  overallStatus: 'PASS' | 'FAIL';
  postStatus: 'PASS' | 'FAIL';
  clampStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// CONSTANTS & PRESETS
// =============================================================================

const EN13374_CLASSES: Record<
  string,
  { name: string; desc: string; staticLoad: number; height: number }
> = {
  A: { name: 'Class A', desc: 'Static loads only (slopes <10°)', staticLoad: 0.3, height: 1.0 },
  B: { name: 'Class B', desc: 'Static + Low Dynamic (slopes <30°)', staticLoad: 0.3, height: 1.0 },
  C: { name: 'Class C', desc: 'High Dynamic (steep slopes ≥30°)', staticLoad: 0.0, height: 1.0 },
};

const POST_SECTIONS: Record<string, { name: string; Mcap: number; Vcap: number }> = {
  '40x40x3': { name: '40×40×3 SHS', Mcap: 2.5, Vcap: 25 },
  '50x50x3': { name: '50×50×3 SHS', Mcap: 4.2, Vcap: 35 },
  '60x60x3': { name: '60×60×3 SHS', Mcap: 6.5, Vcap: 45 },
  '48.3x3.2': { name: '48.3×3.2 CHS', Mcap: 1.8, Vcap: 20 },
  '60.3x3.2': { name: '60.3×3.2 CHS', Mcap: 3.0, Vcap: 30 },
};

const CLAMP_TYPES: Record<string, { name: string; capacity: number; desc: string }> = {
  compression: { name: 'Compression Clamp', capacity: 15, desc: 'Screw-tightened to slab edge' },
  gravity: { name: 'Gravity Base', capacity: 20, desc: 'Weighted counterbalance' },
  drilled: { name: 'Drilled Anchor', capacity: 30, desc: 'M12 resin anchor in concrete' },
  magnetic: { name: 'Magnetic Base', capacity: 8, desc: 'For steel deck applications' },
};

const CONCRETE_GRADES: Record<string, { name: string; fck: number }> = {
  C20: { name: 'C20/25', fck: 20 },
  C25: { name: 'C25/30', fck: 25 },
  C30: { name: 'C30/37', fck: 30 },
  C40: { name: 'C40/50', fck: 40 },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const TemporaryParapet = () => {


  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classification: true,
    geometry: true,
    foundation: false,
  });

  const [form, setForm] = useState<FormData>({
    protectionClass: 'A',
    postSpacing: '2.4',
    barrierHeight: '1.1',
    slabThickness: '200',
    windPressure: '0.6',
    postSectionKey: '40x40x3',
    clampType: 'compression',
    concreteGrade: 'C25',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'postSpacing', label: 'Post Spacing' },
  { key: 'barrierHeight', label: 'Barrier Height' },
  { key: 'slabThickness', label: 'Slab Thickness' },
  { key: 'windPressure', label: 'Wind Pressure' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map(e => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };

  // What-If sliders for live parameter adjustment
  const whatIfSliders = [
    { key: 'postSpacing', label: 'Post Spacing', min: 1.0, max: 3.0, step: 0.1, unit: 'm' },
    { key: 'barrierHeight', label: 'Barrier Height', min: 0.9, max: 1.5, step: 0.05, unit: 'm' },
    { key: 'windPressure', label: 'Wind Pressure', min: 0.2, max: 1.5, step: 0.1, unit: 'kN/m²' },
    { key: 'slabThickness', label: 'Slab Thickness', min: 100, max: 400, step: 10, unit: 'mm' },
  ];

  // Form update helper
  const updateForm = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    if (!validateInputs()) return;
    const newWarnings: Warning[] = [];

    try {
      const spacing = parseFloat(form.postSpacing);
      const height = parseFloat(form.barrierHeight);
      const thickness = parseFloat(form.slabThickness) / 1000;
      const wind = parseFloat(form.windPressure);

      const cls = EN13374_CLASSES[form.protectionClass];
      const postSection = POST_SECTIONS[form.postSectionKey];
      const clamp = CLAMP_TYPES[form.clampType];

      if (spacing <= 0 || height <= 0 || thickness <= 0) {
        newWarnings.push({ type: 'error', message: 'Invalid geometry' });
        setWarnings(newWarnings);
        return;
      }

      // EN 13374 static loads
      const F_static_point = 0.3; // kN point load at top
      const F_static_udl = 0.2; // kN/m distributed

      // Wind force per post (unfactored)
      const A_wind = height * spacing;
      const F_wind_unfactored = wind * A_wind;

      // Static force per post (max of point or UDL)
      const F_static = Math.max(F_static_point, F_static_udl * spacing);

      // Design forces (factored 1.5)
      const gamma = 1.5;
      const windForce = F_wind_unfactored * gamma;
      const staticForce = F_static * gamma;
      const designForce = Math.max(windForce, staticForce);

      // Design moment at base
      const designMoment = designForce * height;

      // Post capacity check
      const postCapacity = postSection.Mcap;
      const postUtilisation = (designMoment / postCapacity) * 100;
      const postStatus = designMoment <= postCapacity ? 'PASS' : 'FAIL';

      // Clamp force (coupling from moment)
      const leverArm = Math.max(0.1, thickness - 0.05);
      const clampForce = designMoment / leverArm;
      const clampCapacity = clamp.capacity;
      const clampUtilisation = (clampForce / clampCapacity) * 100;
      const clampStatus = clampForce <= clampCapacity ? 'PASS' : 'FAIL';

      // Overall status
      const overallStatus = postStatus === 'PASS' && clampStatus === 'PASS' ? 'PASS' : 'FAIL';

      // Warnings
      if (height < 1.0) {
        newWarnings.push({
          type: 'error',
          message: `Height ${height}m below EN 13374 minimum 1.0m`,
        });
      }
      if (height < 1.1 && form.protectionClass !== 'A') {
        newWarnings.push({
          type: 'warning',
          message: 'Consider 1.1m height for enhanced protection',
        });
      }
      if (spacing > 2.5) {
        newWarnings.push({ type: 'warning', message: 'Post spacing exceeds typical 2.5m max' });
      }
      if (thickness < 0.15) {
        newWarnings.push({ type: 'warning', message: 'Thin slab - verify clamp engagement depth' });
      }
      if (form.clampType === 'compression' && thickness > 0.35) {
        newWarnings.push({
          type: 'info',
          message: 'Thick slab - ensure clamp jaw opening sufficient',
        });
      }
      if (postUtilisation > 85 && postUtilisation <= 100) {
        newWarnings.push({
          type: 'warning',
          message: `High post utilisation: ${postUtilisation.toFixed(0)}%`,
        });
      }
      if (form.protectionClass === 'C') {
        newWarnings.push({
          type: 'info',
          message: 'Class C requires dynamic impact testing verification',
        });
      }

      setResults({
        windForce,
        staticForce,
        designForce,
        designMoment,
        postCapacity,
        clampForce,
        clampCapacity,
        postUtilisation,
        clampUtilisation,
        overallStatus,
        postStatus,
        clampStatus,
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
  // HELPERS
  // ===========================================================================

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ===========================================================================
  // PDF EXPORT
  // ===========================================================================

    const exportPDF = () => {
    if (!results) return;

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.postUtilisation > 80) pdfRecs.push({ check: 'Post Capacity', suggestion: `${results.postUtilisation.toFixed(0)}% utilised — consider upgrading to a larger post section` });
    if (results.clampUtilisation > 80) pdfRecs.push({ check: 'Clamp Capacity', suggestion: `${results.clampUtilisation.toFixed(0)}% utilised — consider a stronger clamp type` });
    if (parseFloat(form.postSpacing) > 2.0) pdfRecs.push({ check: 'Post Spacing', suggestion: `${form.postSpacing}m spacing — reducing to 2.0m improves capacity` });
    if (form.protectionClass === 'C') pdfRecs.push({ check: 'Class C', suggestion: 'Dynamic impact testing verification required per EN 13374' });
    pdfRecs.push({ check: 'Overall', suggestion: results.overallStatus === 'PASS' ? 'All checks satisfied — parapet design adequate' : 'One or more checks failed — review design' });

    generatePremiumPDF({
      title: 'Temporary Parapet Design',
      subtitle: 'EN 13374 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Temporary Parapet' },
        { label: 'Reference', value: 'TEM001' },
        { label: 'Standard', value: 'EN 13374' },
      ],
      inputs: [
        { label: 'Protection Class', value: `${EN13374_CLASSES[form.protectionClass]?.name} — ${EN13374_CLASSES[form.protectionClass]?.desc}` },
        { label: 'Post Spacing', value: `${form.postSpacing} m` },
        { label: 'Barrier Height', value: `${form.barrierHeight} m` },
        { label: 'Slab Thickness', value: `${form.slabThickness} mm` },
        { label: 'Wind Pressure', value: `${form.windPressure} kN/m²` },
        { label: 'Post Section', value: POST_SECTIONS[form.postSectionKey]?.name || form.postSectionKey },
        { label: 'Clamp Type', value: CLAMP_TYPES[form.clampType]?.name || form.clampType },
        { label: 'Concrete Grade', value: CONCRETE_GRADES[form.concreteGrade]?.name || form.concreteGrade },
      ],
      sections: [
        {
          title: 'Force Analysis',
          head: [['Parameter', 'Value']],
          body: [
            ['Wind Force (factored)', `${results.windForce.toFixed(2)} kN`],
            ['Static Force (factored)', `${results.staticForce.toFixed(2)} kN`],
            ['Design Force (governing)', `${results.designForce.toFixed(2)} kN`],
            ['Design Moment at Base', `${results.designMoment.toFixed(2)} kNm`],
            ['Post Moment Capacity', `${results.postCapacity.toFixed(2)} kNm`],
            ['Post Utilisation', `${results.postUtilisation.toFixed(1)}%`],
            ['Clamp Force', `${results.clampForce.toFixed(1)} kN`],
            ['Clamp Capacity', `${results.clampCapacity.toFixed(0)} kN`],
            ['Clamp Utilisation', `${results.clampUtilisation.toFixed(1)}%`],
          ],
        },
      ],
      checks: [
        {
          name: 'Post Bending',
          capacity: `${results.postCapacity.toFixed(2)} kNm`,
          utilisation: `${results.postUtilisation.toFixed(0)}%`,
          status: results.postStatus,
        },
        {
          name: 'Clamp Capacity',
          capacity: `${results.clampCapacity.toFixed(0)} kN`,
          utilisation: `${results.clampUtilisation.toFixed(0)}%`,
          status: results.clampStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map(w => w.message),
      footerNote: 'Beaver Bridges Ltd — Temporary Parapet Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;

    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.postUtilisation > 80) pdfRecs.push({ check: 'Post Capacity', suggestion: `${results.postUtilisation.toFixed(0)}% utilised — consider upgrading to a larger post section` });
    if (results.clampUtilisation > 80) pdfRecs.push({ check: 'Clamp Capacity', suggestion: `${results.clampUtilisation.toFixed(0)}% utilised — consider a stronger clamp type` });
    if (parseFloat(form.postSpacing) > 2.0) pdfRecs.push({ check: 'Post Spacing', suggestion: `${form.postSpacing}m spacing — reducing to 2.0m improves capacity` });
    if (form.protectionClass === 'C') pdfRecs.push({ check: 'Class C', suggestion: 'Dynamic impact testing verification required per EN 13374' });
    pdfRecs.push({ check: 'Overall', suggestion: results.overallStatus === 'PASS' ? 'All checks satisfied — parapet design adequate' : 'One or more checks failed — review design' });

    generateDOCX({
      title: 'Temporary Parapet Design',
      subtitle: 'EN 13374 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Temporary Parapet' },
        { label: 'Reference', value: 'TEM001' },
        { label: 'Standard', value: 'EN 13374' },
      ],
      inputs: [
        { label: 'Protection Class', value: `${EN13374_CLASSES[form.protectionClass]?.name} — ${EN13374_CLASSES[form.protectionClass]?.desc}` },
        { label: 'Post Spacing', value: `${form.postSpacing} m` },
        { label: 'Barrier Height', value: `${form.barrierHeight} m` },
        { label: 'Slab Thickness', value: `${form.slabThickness} mm` },
        { label: 'Wind Pressure', value: `${form.windPressure} kN/m²` },
        { label: 'Post Section', value: POST_SECTIONS[form.postSectionKey]?.name || form.postSectionKey },
        { label: 'Clamp Type', value: CLAMP_TYPES[form.clampType]?.name || form.clampType },
        { label: 'Concrete Grade', value: CONCRETE_GRADES[form.concreteGrade]?.name || form.concreteGrade },
      ],
      sections: [
        {
          title: 'Force Analysis',
          head: [['Parameter', 'Value']],
          body: [
            ['Wind Force (factored)', `${results.windForce.toFixed(2)} kN`],
            ['Static Force (factored)', `${results.staticForce.toFixed(2)} kN`],
            ['Design Force (governing)', `${results.designForce.toFixed(2)} kN`],
            ['Design Moment at Base', `${results.designMoment.toFixed(2)} kNm`],
            ['Post Moment Capacity', `${results.postCapacity.toFixed(2)} kNm`],
            ['Post Utilisation', `${results.postUtilisation.toFixed(1)}%`],
            ['Clamp Force', `${results.clampForce.toFixed(1)} kN`],
            ['Clamp Capacity', `${results.clampCapacity.toFixed(0)} kN`],
            ['Clamp Utilisation', `${results.clampUtilisation.toFixed(1)}%`],
          ],
        },
      ],
      checks: [
        {
          name: 'Post Bending',
          capacity: `${results.postCapacity.toFixed(2)} kNm`,
          utilisation: `${results.postUtilisation.toFixed(0)}%`,
          status: results.postStatus,
        },
        {
          name: 'Clamp Capacity',
          capacity: `${results.clampCapacity.toFixed(0)} kN`,
          utilisation: `${results.clampUtilisation.toFixed(0)}%`,
          status: results.clampStatus,
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map(w => w.message),
      footerNote: 'Beaver Bridges Ltd — Temporary Parapet Design',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 relative overflow-hidden bg-[#0d0d12]">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/20 via-transparent to-teal-900/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-emerald-500/30 mb-4 bg-emerald-950/20">
            <FiShield className="text-emerald-400" />
            <span className="text-emerald-100 font-mono tracking-wider">
              EN 13374 | EDGE PROTECTION
            </span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-2">Temporary Parapet</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Clamp-on edge protection system design to EN 13374.
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
                activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'text-gray-400'
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
                  {EN13374_CLASSES[form.protectionClass]?.name} | {form.barrierHeight}m @{' '}
                  {form.postSpacing}m c/c
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
              onClick={exportPDF}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
            >
              <FiDownload className="mr-2" />
              Export Report
            </Button>
              <Button
              onClick={exportDOCX}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <FiDownload className="mr-2" />
              Export Report
            </Button>
            <SaveRunButton
              calculatorKey="temporary-parapet"
              inputs={form as unknown as Record<string, string | number>}
              results={results}
              status={results?.overallStatus}
              summary={`Post: ${results?.postUtilisation.toFixed(0)}% | Clamp: ${results?.clampUtilisation.toFixed(0)}%`}
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
            {/* Classification */}
            <Card variant="glass" className="border-emerald-500/20">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between py-3"
                onClick={() => toggleSection('classification')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center"><FiShield className="w-3 h-3 text-white" /></div>
                  <CardTitle className="text-white text-sm">EN 13374 Class</CardTitle>
                </div>
                <FiChevronDown
                  className={cn(
                    'text-gray-400 transition-transform',
                    expandedSections.classification && 'rotate-180',
                  )}
                />
              </CardHeader>
              
                {expandedSections.classification && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="space-y-4 pt-0">
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
                          Protection Class
                        </label>
                        <select
                          title="Protection Class"
                          value={form.protectionClass}
                          onChange={(e) => setForm({ ...form, protectionClass: e.target.value })}
                          className="w-full bg-black/40 border border-gray-700/50 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500"
                        >
                          {Object.entries(EN13374_CLASSES).map(([key, cls]) => (
                            <option key={key} value={key}>
                              {cls.name} - {cls.desc}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
                          Post Section
                        </label>
                        <select
                          title="Post Section"
                          value={form.postSectionKey}
                          onChange={(e) => setForm({ ...form, postSectionKey: e.target.value })}
                          className="w-full bg-black/40 border border-gray-700/50 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500"
                        >
                          {Object.entries(POST_SECTIONS).map(([key, section]) => (
                            <option key={key} value={key}>
                              {section.name} (Mcap={section.Mcap} kNm)
                            </option>
                          ))}
                        </select>
                      </div>
                    </CardContent>
                    </motion.div>
                    )}
            </Card>

            {/* Geometry */}
            <Card variant="glass" className="border-teal-500/20">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between py-3"
                onClick={() => toggleSection('geometry')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center"><FiLayers className="w-3 h-3 text-white" /></div>
                  <CardTitle className="text-white text-sm">Geometry & Loading</CardTitle>
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
                          label="Post Spacing"
                          value={form.postSpacing}
                          onChange={(v) => setForm({ ...form, postSpacing: v })}
                          unit="m"
                        />
                        <InputField
                          label="Barrier Height"
                          value={form.barrierHeight}
                          onChange={(v) => setForm({ ...form, barrierHeight: v })}
                          unit="m"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField
                          label="Slab Thickness"
                          value={form.slabThickness}
                          onChange={(v) => setForm({ ...form, slabThickness: v })}
                          unit="mm"
                        />
                        <InputField
                          label="Wind Pressure"
                          value={form.windPressure}
                          onChange={(v) => setForm({ ...form, windPressure: v })}
                          unit="kN/m²"
                        />
                      </div>
                    </CardContent>
                    </motion.div>
                    )}
            </Card>

            {/* Foundation */}
            <Card variant="glass" className="border-cyan-500/20">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between py-3"
                onClick={() => toggleSection('foundation')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"><FiSettings className="w-3 h-3 text-white" /></div>
                  <CardTitle className="text-white text-sm">Clamp & Slab</CardTitle>
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
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
                          Clamp Type
                        </label>
                        <select
                          title="Clamp Type"
                          value={form.clampType}
                          onChange={(e) => setForm({ ...form, clampType: e.target.value })}
                          className="w-full bg-black/40 border border-gray-700/50 rounded-lg p-2.5 text-white text-sm focus:border-cyan-500"
                        >
                          {Object.entries(CLAMP_TYPES).map(([key, clamp]) => (
                            <option key={key} value={key}>
                              {clamp.name} ({clamp.capacity} kN)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
                          Concrete Grade
                        </label>
                        <select
                          title="Concrete Grade"
                          value={form.concreteGrade}
                          onChange={(e) => setForm({ ...form, concreteGrade: e.target.value })}
                          className="w-full bg-black/40 border border-gray-700/50 rounded-lg p-2.5 text-white text-sm focus:border-cyan-500"
                        >
                          {Object.entries(CONCRETE_GRADES).map(([key, grade]) => (
                            <option key={key} value={key}>
                              {grade.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </CardContent>
                    </motion.div>
                    )}
            </Card>
          </div>

          {/* Visualization & Results */}
          <div className="lg:col-span-8 space-y-6">
            <WhatIfPreview
              title="Temporary Parapet — 3D Preview"
              sliders={whatIfSliders}
              form={form}
              updateForm={updateForm}
              status={results?.overallStatus}
              renderScene={(fsHeight) => (
                <Interactive3DDiagram
                height={fsHeight}
                cameraPosition={[8, 6, 8]}
                >
                <TemporaryParapet3D />
                </Interactive3DDiagram>
              )}
            />

            {results && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ResultCard
                  label="Post Moment"
                  value={`${results.designMoment.toFixed(2)} kNm`}
                  util={`${results.postUtilisation.toFixed(0)}%`}
                  status={results.postStatus}
                />
                <ResultCard
                  label="Post Capacity"
                  value={`${results.postCapacity.toFixed(2)} kNm`}
                  util=""
                  status="info"
                />
                <ResultCard
                  label="Clamp Force"
                  value={`${results.clampForce.toFixed(1)} kN`}
                  util={`${results.clampUtilisation.toFixed(0)}%`}
                  status={results.clampStatus}
                />
                <ResultCard
                  label="Clamp Capacity"
                  value={`${results.clampCapacity.toFixed(0)} kN`}
                  util=""
                  status="info"
                />
              </div>
            )}

            {results && (
              <Card variant="glass" className="border-gray-800/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <FiInfo className="text-emerald-400" />
                    Force Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-gray-500 text-xs uppercase mb-1">Wind Force</div>
                      <div className="text-blue-400 font-mono">
                        {results.windForce.toFixed(2)} kN
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-gray-500 text-xs uppercase mb-1">Static Force</div>
                      <div className="text-yellow-400 font-mono">
                        {results.staticForce.toFixed(2)} kN
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-gray-500 text-xs uppercase mb-1">Design Force</div>
                      <div className="text-red-400 font-mono">
                        {results.designForce.toFixed(2)} kN
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-gray-500 text-xs uppercase mb-1">Standard</div>
                      <div className="text-white font-mono">EN 13374
                    </div>
                  </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {results && (() => {
              const recs: { check: string; suggestion: string }[] = [];
              if (results.postUtilisation > 80) recs.push({ check: 'Post Capacity', suggestion: `${results.postUtilisation.toFixed(0)}% — upgrade post section for more headroom` });
              if (results.clampUtilisation > 80) recs.push({ check: 'Clamp', suggestion: `${results.clampUtilisation.toFixed(0)}% — consider stronger clamp type` });
              if (parseFloat(form.postSpacing) > 2.0) recs.push({ check: 'Spacing', suggestion: `${form.postSpacing}m — reducing spacing improves load distribution` });
              if (form.protectionClass === 'C') recs.push({ check: 'Class C', suggestion: 'Requires dynamic impact testing per EN 13374' });
              recs.push({ check: 'Overall', suggestion: results.overallStatus === 'PASS' ? 'All checks satisfied' : 'Review design — one or more checks failed' });
              return recs.length > 0 ? (
                <Card variant="glass" className="border-emerald-500/20">
                  <CardHeader className="py-3">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <FiInfo className="text-emerald-400" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recs.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <div><span className="text-white font-medium">{r.check}:</span>{' '}<span className="text-gray-400">{r.suggestion}</span></div>
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
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600"
                disabled={!results}
              >
                <FiDownload className="mr-2" />
                Export PDF Report
              </Button>
              <Button
                onClick={exportDOCX}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600"
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
      </div>);
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const InputField = ({
  label,
  value,
  onChange,
  unit, field}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string; field?: string}) => (
  <div>
    <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">
      {label} {unit && <span className="text-gray-600">({unit})</span>}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full bg-black/40 border border-gray-700/50 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 font-mono"
    />
  </div>
);

const ResultCard = ({
  label,
  value,
  util,
  status,
}: {
  label: string;
  value: string;
  util: string;
  status: 'PASS' | 'FAIL' | 'info';
}) => (
  <Card
    variant="glass"
    className={cn(
      'p-4 text-center border shadow-lg',
      status === 'PASS' && 'border-green-500/30 bg-green-950/20 shadow-green-500/10',
      status === 'FAIL' && 'border-red-500/30 bg-red-950/20 shadow-red-500/10',
      status === 'info' && 'border-emerald-500/30 bg-emerald-950/20 shadow-emerald-500/10',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-xl font-bold font-mono',
        status === 'PASS' && 'text-green-400',
        status === 'FAIL' && 'text-red-400',
        status === 'info' && 'text-emerald-400',
      )}
    >
      {value}
    </div>
    {util && <div className="text-xs text-gray-500 mt-1">{util}</div>}
    {status !== 'info' && (
      <div
        className={cn(
          'text-xs font-bold mt-2',
          status === 'PASS' ? 'text-green-600' : 'text-red-600',
        )}
      >
        {status}
      </div>
    )}
      
  </Card>
);

export default TemporaryParapet;
