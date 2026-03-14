// =============================================================================
// Bog Mats / Ground Mats Calculator — Premium Edition
// Heavy Equipment Ground Support Analysis per BS 6031 & EC5
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTarget
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import BogMats3D from '../../components/3d/scenes/BogMats3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Equipment
  machineType: string;
  grossWeight: string; // tonnes
  trackLength: string; // m
  trackWidth: string; // m
  numberOfTracks: string;

  // Ground
  groundType: string;
  groundBearing: string; // kPa
  groundCBR: string; // %

  // Mats
  matType: string;
  matLength: string; // m
  matWidth: string; // m
  matThickness: string; // mm
  matMaterial: string;
  layerCount: string;
  orientation: 'parallel' | 'perpendicular';

  // Project
  projectTitle: string;
  reference: string;
}

interface Results {
  trackContactPressure: number;
  matContactPressure: number;
  effectiveArea: number;
  pressureAtGround: number;
  allowableBearing: number;
  bearingUtilisation: number;
  bearingStatus: 'PASS' | 'FAIL';
  bendingStress: number;
  allowableBending: number;
  bendingUtilisation: number;
  bendingStatus: 'PASS' | 'FAIL';
  overallStatus: 'PASS' | 'FAIL';
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const EQUIPMENT_PRESETS = {
  excavator_20t: { name: '20t Excavator', weight: '22', L: '3.5', W: '0.6', n: '2' },
  excavator_35t: { name: '35t Excavator', weight: '36', L: '4.2', W: '0.7', n: '2' },
  adt_30t: { name: '30t ADT (Full)', weight: '52', L: '0.8', W: '0.7', n: '6' }, // Tyre patches
  crane_100t: { name: '100t Crane (Travel)', weight: '60', L: '1.2', W: '0.5', n: '8' },
};

const MAT_PRESETS = {
  standard_timber: {
    name: 'Standard Timber (5m)',
    L: '5.0',
    W: '1.0',
    T: '150',
    mat: 'Oak/Ekki',
    matType: 'Timber',
  },
  heavy_timber: {
    name: 'Heavy Timber (5m)',
    L: '5.0',
    W: '1.0',
    T: '200',
    mat: 'Ekki',
    matType: 'Timber',
  },
  crane_mat: {
    name: 'Steel Mat (6m)',
    L: '6.0',
    W: '1.5',
    T: '300',
    mat: 'Steel',
    matType: 'Steel',
  },
};

const GROUND_PRESETS = {
  soft_clay: { name: 'Soft Clay', q: '50', cbr: '2' },
  firm_clay: { name: 'Firm Clay', q: '100', cbr: '5' },
  loose_sand: { name: 'Loose Sand', q: '75', cbr: '10' },
  compact_gravel: { name: 'Compact Gravel', q: '200', cbr: '25' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const BogMats: React.FC = () => {

  const [form, setForm] = useState<FormData>({
    machineType: 'excavator_20t',
    grossWeight: '22',
    trackLength: '3.5',
    trackWidth: '0.6',
    numberOfTracks: '2',
    groundType: 'soft_clay',
    groundBearing: '50',
    groundCBR: '2',
    matType: 'standard_timber',
    matLength: '5.0',
    matWidth: '1.0',
    matThickness: '150',
    matMaterial: 'Oak/Ekki',
    layerCount: '1',
    orientation: 'perpendicular',
    projectTitle: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'grossWeight', label: 'Gross Weight' },
  { key: 'trackLength', label: 'Track Length' },
  { key: 'trackWidth', label: 'Track Width' },
  { key: 'numberOfTracks', label: 'Number Of Tracks' },
  { key: 'groundBearing', label: 'Ground Bearing' },
  { key: 'groundCBR', label: 'Ground CBR' },
  { key: 'matLength', label: 'Mat Length' },
  { key: 'matWidth', label: 'Mat Width' },
  { key: 'matThickness', label: 'Mat Thickness' },
  { key: 'layerCount', label: 'Layer Count' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'machineType', label: 'Machine Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'grossWeight', label: 'Gross Weight', min: 0, max: 100, step: 1, unit: '' },
    { key: 'trackLength', label: 'Track Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'trackWidth', label: 'Track Width', min: 0, max: 100, step: 1, unit: '' }
  ];


  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    equipment: true,
    ground: true,
    mats: true,
    project: false,
  });

  const updateForm = (field: keyof FormData, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  const applyEquipment = (k: string) => {
    const p = EQUIPMENT_PRESETS[k as keyof typeof EQUIPMENT_PRESETS];
    if (p) {
      setForm((prev) => ({
        ...prev,
        machineType: k,
        grossWeight: p.weight,
        trackLength: p.L,
        trackWidth: p.W,
        numberOfTracks: p.n,
      }));
    }
  };

  const applyMat = (k: string) => {
    const p = MAT_PRESETS[k as keyof typeof MAT_PRESETS];
    if (p) {
      setForm((prev) => ({
        ...prev,
        matType: k,
        matLength: p.L,
        matWidth: p.W,
        matThickness: p.T,
        matMaterial: p.mat,
      }));
    }
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const weight = parseFloat(form.grossWeight) || 0;
    const tL = parseFloat(form.trackLength) || 1;
    const tW = parseFloat(form.trackWidth) || 0.1;
    const nT = parseFloat(form.numberOfTracks) || 1;
    const qAllow = parseFloat(form.groundBearing) || 10;
    const thickness = parseFloat(form.matThickness) || 100;
    const layerCount = parseFloat(form.layerCount) || 1;

    // Load
    const totalForce = weight * 9.81; // kN
    const trackArea = tL * tW * nT;
    const trackContactPressure = totalForce / trackArea;

    // Load Spread through mats (CIRIA 2:1 approach)
    // Assume load spreads out from tracks through mat thickness at 2:1
    const totalT = thickness * layerCount;
    const spread = totalT / 1000; // m
    const effL = tL + spread;
    const effW = tW + spread;
    const effectiveArea = effL * effW * nT;

    // Distribute force over the mats
    const pressureAtGround = totalForce / effectiveArea;
    const bearingUtil = (pressureAtGround / qAllow) * 100;
    const bearingStatus = pressureAtGround <= qAllow ? 'PASS' : 'FAIL';

    // Mat Structural Approximation (Bending)
    // Assume cantilever if overhanging or local point load
    const span = parseFloat(form.matWidth);
    const bendingMoment = (pressureAtGround * span ** 2) / 8; // Simplified kNm/m
    const fb_allow = form.matMaterial.includes('Steel') ? 165 : 12; // MPa estimate
    const Wz = (1000 * thickness ** 2) / 6; // Section modulus per meter
    const bendingStress = (bendingMoment * 1e6) / Wz;
    const bendingUtil = (bendingStress / fb_allow) * 100;
    const bendingStatus = bendingStress <= fb_allow ? 'PASS' : 'FAIL';

    if (bearingStatus === 'FAIL')
      w.push('Ground bearing capacity exceeded. Add more mat layers or use larger mats.');
    if (bendingStatus === 'FAIL')
      w.push('Mat structural capacity (bending) exceeded. Use thicker or stronger mats.');
    if (parseFloat(form.groundCBR) < 3)
      w.push('Very soft ground (CBR < 3%). Ensure mats are interlocked.');

    setResults({
      trackContactPressure,
      matContactPressure: trackContactPressure,
      effectiveArea,
      pressureAtGround,
      allowableBearing: qAllow,
      bearingUtilisation: bearingUtil,
      bearingStatus,
      bendingStress,
      allowableBending: fb_allow,
      bendingUtilisation: bendingUtil,
      bendingStatus,
      overallStatus: bearingStatus === 'PASS' && bendingStatus === 'PASS' ? 'PASS' : 'FAIL',
    });
    setWarnings(w);
  }, [form]);

  useEffect(() => {
    const t = setTimeout(calculate, 300);
    return () => clearTimeout(t);
  }, [calculate]);

  const SectionComp: React.FC<{
    id: string;
    title: string;
    icon: any;
    color: string;
    children: any;
  }> = ({ id, title, icon, color, children }) => (
    <Card
      variant="glass"
      className={cn(
        'border-neon-cyan/30 shadow-2xl overflow-hidden',
        color,
      )}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full p-4 flex items-center justify-between border-b border-gray-800 bg-gray-900/30"
      >
        <CardTitle className="text-2xl text-white flex items-center space-x-3">
          <motion.div
            className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            {icon}
          </motion.div>
          <span>{title}</span>
        </CardTitle>
        {expandedSections[id] ? <FiChevronDown /> : <FiChevronRight />}
      </button>
      <AnimatePresence>
        {expandedSections[id] && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="p-4 space-y-4">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );

  const InputField: React.FC<{ label: string; field: keyof FormData; unit?: string }> = ({
    label,
    field,
    unit,
  }) => (
    <div className="space-y-1">
      <label className="flex items-center justify-between text-sm font-semibold text-gray-200">
        <ExplainableLabel label={label} field={field} className="text-sm font-semibold text-gray-200" />
        {unit && <span className="text-neon-cyan text-xs">{unit}</span>}
      </label>
      <div className="relative">
        <input
          id={`bogmats-${field}`}
          title={label}
          type="number"
          value={form[field] as string}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300 hover:bg-gray-900/70"
        />
      </div>
    </div>
  );

  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Bog Mats Analysis',
      subtitle: 'BS 6031 / EN 1995-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectTitle || '-' },
        { label: 'Reference', value: form.reference || 'BM001' },
        { label: 'Standard', value: 'BS 6031 / EN 1995-1-1' },
      ],
      inputs: [
        { label: 'Machine Type', value: form.machineType },
        { label: 'Gross Weight', value: form.grossWeight, unit: 'tonnes' },
        { label: 'Track Length', value: form.trackLength, unit: 'm' },
        { label: 'Track Width', value: form.trackWidth, unit: 'm' },
        { label: 'No. of Tracks', value: form.numberOfTracks },
        { label: 'Ground Bearing', value: form.groundBearing, unit: 'kPa' },
        { label: 'Ground CBR', value: form.groundCBR, unit: '%' },
        { label: 'Mat Type', value: form.matType },
        {
          label: 'Mat Dimensions',
          value: `${form.matLength} x ${form.matWidth} x ${form.matThickness}`,
          unit: 'm/mm',
        },
        { label: 'Mat Material', value: form.matMaterial },
        { label: 'Layers', value: form.layerCount },
      ],
      checks: [
        {
          name: 'Bearing Capacity',
          capacity: `${results.allowableBearing.toFixed(1)} kPa`,
          utilisation: `${results.bearingUtilisation.toFixed(1)}%`,
          status: results.bearingStatus,
        },
        {
          name: 'Mat Bending Stress',
          capacity: `${results.allowableBending.toFixed(1)} N/mm²`,
          utilisation: `${results.bendingUtilisation.toFixed(1)}%`,
          status: results.bendingStatus,
        },
      ],
      sections: [
        {
          title: 'Detailed Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Track Contact Pressure', results.trackContactPressure.toFixed(1), 'kPa'],
            ['Effective Spread Area', results.effectiveArea.toFixed(2), 'm²'],
            ['Pressure at Ground', results.pressureAtGround.toFixed(1), 'kPa'],
            ['Bending Stress', results.bendingStress.toFixed(1), 'N/mm²'],
            ['Allowable Bending', results.allowableBending.toFixed(1), 'N/mm²'],
          ],
        },
      ],
      recommendations: [
        ...(results.bearingUtilisation > 80
          ? [{ check: 'High Bearing', suggestion: 'Add more mat layers or use larger mats' }]
          : []),
        ...(results.bendingUtilisation > 80
          ? [{ check: 'High Bending', suggestion: 'Use thicker or stronger mats' }]
          : []),
        ...(parseFloat(form.groundCBR) < 3
          ? [{ check: 'Soft Ground', suggestion: 'CBR <3% — ensure mats are interlocked' }]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.overallStatus === 'PASS'
              ? 'Ground support design adequate'
              : 'Revise mat selection or ground treatment',
        },
      ],
      warnings,
      footerNote: 'Beaver Bridges Ltd — Bog Mats Analysis (BS 6031 / EN 1995-1-1)',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Bog Mats Analysis',
      subtitle: 'BS 6031 / EN 1995-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectTitle || '-' },
        { label: 'Reference', value: form.reference || 'BM001' },
        { label: 'Standard', value: 'BS 6031 / EN 1995-1-1' },
      ],
      inputs: [
        { label: 'Machine Type', value: form.machineType },
        { label: 'Gross Weight', value: form.grossWeight, unit: 'tonnes' },
        { label: 'Track Length', value: form.trackLength, unit: 'm' },
        { label: 'Track Width', value: form.trackWidth, unit: 'm' },
        { label: 'No. of Tracks', value: form.numberOfTracks },
        { label: 'Ground Bearing', value: form.groundBearing, unit: 'kPa' },
        { label: 'Ground CBR', value: form.groundCBR, unit: '%' },
        { label: 'Mat Type', value: form.matType },
        {
          label: 'Mat Dimensions',
          value: `${form.matLength} x ${form.matWidth} x ${form.matThickness}`,
          unit: 'm/mm',
        },
        { label: 'Mat Material', value: form.matMaterial },
        { label: 'Layers', value: form.layerCount },
      ],
      checks: [
        {
          name: 'Bearing Capacity',
          capacity: `${results.allowableBearing.toFixed(1)} kPa`,
          utilisation: `${results.bearingUtilisation.toFixed(1)}%`,
          status: results.bearingStatus,
        },
        {
          name: 'Mat Bending Stress',
          capacity: `${results.allowableBending.toFixed(1)} N/mm²`,
          utilisation: `${results.bendingUtilisation.toFixed(1)}%`,
          status: results.bendingStatus,
        },
      ],
      sections: [
        {
          title: 'Detailed Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Track Contact Pressure', results.trackContactPressure.toFixed(1), 'kPa'],
            ['Effective Spread Area', results.effectiveArea.toFixed(2), 'm²'],
            ['Pressure at Ground', results.pressureAtGround.toFixed(1), 'kPa'],
            ['Bending Stress', results.bendingStress.toFixed(1), 'N/mm²'],
            ['Allowable Bending', results.allowableBending.toFixed(1), 'N/mm²'],
          ],
        },
      ],
      recommendations: [
        ...(results.bearingUtilisation > 80
          ? [{ check: 'High Bearing', suggestion: 'Add more mat layers or use larger mats' }]
          : []),
        ...(results.bendingUtilisation > 80
          ? [{ check: 'High Bending', suggestion: 'Use thicker or stronger mats' }]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.overallStatus === 'PASS'
              ? 'Ground support design adequate'
              : 'Revise mat selection or ground treatment',
        },
      ],
      warnings,
      footerNote: 'Beaver Bridges Ltd — Bog Mats Analysis (BS 6031 / EN 1995-1-1)',
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Bog Mats Analysis
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">BS 5975 bog mat bearing capacity design</p>
          <div className="flex justify-center gap-2 mt-6">
            <Button
              onClick={exportPDF}
              disabled={!results}
              className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
            >
              <FiDownload className="mr-2" /> Export PDF
            </Button>
            <Button
              onClick={exportDOCX}
              disabled={!results}
              className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
            >
              <FiDownload className="mr-2" /> Export DOCX
            </Button>
            <SaveRunButton calculatorKey="bog-mats" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
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
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-300',
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
              className="grid lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <SectionComp
                  id="equipment"
                  title="Plant & Loading"
                  icon={
                    <FiSettings className="text-neon-cyan" size={24} />
                  }
                  color="border-neon-cyan/20"
                >
                  <div className="flex gap-2 flex-wrap mb-4">
                    {Object.keys(EQUIPMENT_PRESETS).map((k) => (
                      <Button key={k} variant="outline" size="sm" onClick={() => applyEquipment(k)}>
                        {EQUIPMENT_PRESETS[k as keyof typeof EQUIPMENT_PRESETS].name}
                      </Button>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <InputField label="Gross Weight" field="grossWeight" unit="t" />
                    <InputField label="Track Length" field="trackLength" unit="m" />
                    <InputField label="Track Width" field="trackWidth" unit="m" />
                  </div>
                </SectionComp>

                <SectionComp
                  id="mats"
                  title="Mat Selection"
                  icon={
                    <FiLayers className="text-neon-cyan" size={24} />
                  }
                  color="border-neon-blue/20"
                >
                  <div className="flex gap-2 flex-wrap mb-4">
                    {Object.keys(MAT_PRESETS).map((k) => (
                      <Button key={k} variant="outline" size="sm" onClick={() => applyMat(k)}>
                        {MAT_PRESETS[k as keyof typeof MAT_PRESETS].name}
                      </Button>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <InputField label="Mat Length" field="matLength" unit="m" />
                    <InputField label="Mat Width" field="matWidth" unit="m" />
                    <InputField label="Thickness" field="matThickness" unit="mm" />
                    <InputField label="Layers" field="layerCount" />
                    <div className="space-y-1">
                      <label className="flex items-center justify-between text-sm font-semibold text-gray-200">
                        Material
                      </label>
                      <select
                        title="Material"
                        value={form.matMaterial}
                        onChange={(e) => updateForm('matMaterial', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                      >
                        <option>Oak/Ekki</option>
                        <option>Ekki (Premium)</option>
                        <option>Steel Plate</option>
                        <option>Composite</option>
                      </select>
                    </div>
                  </div>
                </SectionComp>

                <SectionComp
                  id="ground"
                  title="Ground Conditions"
                  icon={
                    <FiActivity className="text-neon-cyan" size={24} />
                  }
                  color="border-neon-purple/20"
                >
                  <div className="flex gap-2 mb-4">
                    {Object.keys(GROUND_PRESETS).map((k) => (
                      <Button
                        key={k}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const p = GROUND_PRESETS[k as keyof typeof GROUND_PRESETS];
                          setForm((prev) => ({
                            ...prev,
                            groundType: k,
                            groundBearing: p.q,
                            groundCBR: p.cbr,
                          }));
                        }}
                      >
                        {GROUND_PRESETS[k as keyof typeof GROUND_PRESETS].name}
                      </Button>
                    ))}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Allowable Bearing" field="groundBearing" unit="kPa" />
                    <InputField label="Ground CBR" field="groundCBR" unit="%" />
                  </div>
                </SectionComp>

                {/* Calculate Button */}
                <div className="flex justify-center pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={calculate}
                    className="px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/40 transition-all duration-300"
                  >
                    RUN FULL ANALYSIS
                  </motion.button>
                </div>
              </div>

              <div className="space-y-6 sticky top-32">
                {/* Border-l-4 summary cards */}
                <Card
                  variant="glass"
                  className={cn(
                    'p-6 border-neon-cyan/30 shadow-2xl',
                    results?.overallStatus === 'PASS'
                      ? 'shadow-emerald-500/10'
                      : 'shadow-red-500/10',
                  )}
                >
                  <h3 className="text-sm font-bold text-neon-cyan mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <FiTarget /> Results Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-950/40 rounded-xl border-l-4 border-neon-cyan">
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><FiCheck className="text-neon-cyan" /> Pressure at Ground</div>
                      <div className="text-2xl font-bold text-white">
                        {results?.pressureAtGround.toFixed(1)} kPa
                      </div>
                    </div>
                    <div className="p-4 bg-gray-950/40 rounded-xl border-l-4 border-neon-blue">
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><FiCheck className="text-neon-blue" /> Bearing Util.</div>
                      <div
                        className={cn(
                          'text-2xl font-bold',
                          results?.bearingStatus === 'PASS' ? 'text-emerald-400' : 'text-red-500',
                        )}
                      >
                        {results?.bearingUtilisation.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-4 bg-gray-950/40 rounded-xl border-l-4 border-neon-purple">
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1"><FiCheck className="text-neon-purple" /> Bending Util.</div>
                      <div
                        className={cn(
                          'text-2xl font-bold',
                          results?.bendingStatus === 'PASS' ? 'text-emerald-400' : 'text-red-500',
                        )}
                      >
                        {results?.bendingUtilisation.toFixed(1)}%
                      </div>
                    </div>
                    <div
                      className={cn(
                        'p-4 rounded-xl text-center font-bold',
                        results?.overallStatus === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-500 border border-red-500/20',
                      )}
                    >
                      {results?.overallStatus === 'PASS' ? 'SAFE FOR OPERATION' : 'DESIGN FAILED'}
                    </div>
                  </div>
                </Card>

                {/* Recommendations */}
                {results && (
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-5">
                    <h3 className="text-xs font-black text-neon-cyan uppercase tracking-widest mb-3 flex items-center gap-2">
                      <FiCheck /> Recommendations
                    </h3>
                    <div className="space-y-2 text-sm">
                      {results.bearingUtilisation > 80 && (
                        <div className="text-amber-400">
                          ⚠ High bearing utilisation — add layers or use larger mats
                        </div>
                      )}
                      {results.bendingUtilisation > 80 && (
                        <div className="text-amber-400">
                          ⚠ High bending stress — use thicker or stronger mats
                        </div>
                      )}
                      {parseFloat(form.groundCBR) < 3 && (
                        <div className="text-amber-400">
                          ⚠ Very soft ground (CBR &lt;3%) — interlock mats
                        </div>
                      )}
                      <div
                        className={
                          results.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400'
                        }
                      >
                        {results.overallStatus === 'PASS'
                          ? '✓ Ground support design adequate'
                          : '✗ Design fails — revise mat selection or ground treatment'}
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
                    <div className="flex-1 relative">
                      <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]} status={results ? (results.overallStatus as 'PASS' | 'FAIL') : undefined}>
                        <BogMats3D
                          matLength={parseFloat(form.matLength) || 4.8}
                          matWidth={parseFloat(form.matWidth) || 1.2}
                          matThickness={parseFloat(form.matThickness) || 150}
                          nMats={parseInt(form.layerCount) || 5}
                          appliedLoad={parseFloat(form.grossWeight) * 9.81 || 0}
                          bearingCapacity={parseFloat(form.groundBearing) || 50}
                          status={results ? (results.overallStatus as 'PASS' | 'FAIL') : undefined}
                        />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        BOG MATS — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        { label: 'Gross Weight', field: 'grossWeight' as keyof FormData, min: 5, max: 120, step: 1, unit: 't' },
                        { label: 'Track Length', field: 'trackLength' as keyof FormData, min: 0.5, max: 8, step: 0.1, unit: 'm' },
                        { label: 'Track Width', field: 'trackWidth' as keyof FormData, min: 0.2, max: 2, step: 0.1, unit: 'm' },
                        { label: 'Ground Bearing', field: 'groundBearing' as keyof FormData, min: 10, max: 300, step: 5, unit: 'kPa' },
                        { label: 'Mat Length', field: 'matLength' as keyof FormData, min: 2, max: 8, step: 0.1, unit: 'm' },
                        { label: 'Mat Width', field: 'matWidth' as keyof FormData, min: 0.5, max: 2, step: 0.1, unit: 'm' },
                        { label: 'Mat Thickness', field: 'matThickness' as keyof FormData, min: 50, max: 400, step: 10, unit: 'mm' },
                        { label: 'Layers', field: 'layerCount' as keyof FormData, min: 1, max: 3, step: 1, unit: '' },
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
                            value={form[s.field] as string}
                            onChange={(e) => updateForm(s.field, e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                          />
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                          <FiActivity size={14} /> Live Readout
                        </h3>
                        {[
                          { label: 'Machine', value: form.machineType.replace(/_/g, ' ') },
                          { label: 'Total Weight', value: `${form.grossWeight} t` },
                          { label: 'Ground Type', value: form.groundType.replace(/_/g, ' ') },
                          { label: 'Mat', value: `${form.matLength}×${form.matWidth}m × ${form.matThickness}mm` },
                          { label: 'Orientation', value: form.orientation },
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
                              { label: 'Bearing', util: (results.bearingUtilisation * 100).toFixed(0), status: results.bearingStatus },
                              { label: 'Bending', util: (results.bendingUtilisation * 100).toFixed(0), status: results.bendingStatus },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : parseFloat(check.util) > 90 ? 'text-orange-400' : 'text-emerald-400')}>
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

                <WhatIfPreview
                  title="Bog Mats — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram
                      height={fsHeight}
                      cameraPosition={[8, 6, 8]}
                      status={results ? (results.overallStatus as 'PASS' | 'FAIL') : undefined}
                    >
                      <BogMats3D
                        matLength={parseFloat(form.matLength) || 4.8}
                        matWidth={parseFloat(form.matWidth) || 1.2}
                        matThickness={parseFloat(form.matThickness) || 150}
                        nMats={parseInt(form.layerCount) || 5}
                        appliedLoad={parseFloat(form.grossWeight) * 9.81 || 0}
                        bearingCapacity={parseFloat(form.groundBearing) || 50}
                        status={results ? (results.overallStatus as 'PASS' | 'FAIL') : undefined}
                      />
                    </Interactive3DDiagram>
                  )}
                />
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
              <div className="grid md:grid-cols-3 gap-6">
                <Card variant="glass" className="p-6 border-neon-cyan/30 shadow-2xl">
                  <h3 className="text-gray-400 font-bold mb-1">Contact Details</h3>
                  <div className="text-3xl font-black text-emerald-400">
                    {results.trackContactPressure.toFixed(1)} kPa
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Effective Spread Area: {results.effectiveArea.toFixed(2)} m²
                  </p>
                </Card>
                <Card variant="glass" className="p-6 border-neon-cyan/30 shadow-2xl">
                  <h3 className="text-gray-400 font-bold mb-1">Mat Bending</h3>
                  <div className="text-3xl font-black text-cyan-400">
                    {results.bendingUtilisation.toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Stress: {results.bendingStress.toFixed(1)} MPa (Allow:{' '}
                    {results.allowableBending} MPa)
                  </p>
                </Card>
                <Card variant="glass" className="p-6 border-neon-cyan/30 shadow-2xl">
                  <h3 className="text-gray-400 font-bold mb-1">Ground Integrity</h3>
                  <div className="text-3xl font-black text-emerald-400">
                    {results.bearingUtilisation.toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Allowable Bearing: {results.allowableBearing} kPa
                  </p>
                </Card>
              </div>
              {warnings.length > 0 && (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2">
                  {warnings.map((w, i) => (
                    <div key={i} className="text-red-400 text-sm flex items-center gap-2">
                      <FiAlertTriangle /> {w}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'visualization' && (
            <motion.div
              key="vis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-950 border border-gray-900 rounded-2xl overflow-hidden relative"
            >
              <Interactive3DDiagram
                height="500px"
                cameraPosition={[10, 8, 10]}
                status={results ? (results.overallStatus as 'PASS' | 'FAIL') : undefined}
              >
                <BogMats3D
                  matLength={parseFloat(form.matLength) || 4.8}
                  matWidth={parseFloat(form.matWidth) || 1.2}
                  matThickness={parseFloat(form.matThickness) || 150}
                  nMats={parseInt(form.layerCount) || 5}
                  appliedLoad={parseFloat(form.grossWeight) * 9.81 || 0}
                  bearingCapacity={parseFloat(form.groundBearing) || 50}
                  status={results ? (results.overallStatus as 'PASS' | 'FAIL') : undefined}
                />
              </Interactive3DDiagram>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BogMats;
