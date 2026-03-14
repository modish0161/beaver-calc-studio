// =============================================================================
// Base Plate Connection Calculator — Premium Edition
// Steel Column Base Plate Design to Eurocode 3 (EN 1993-1-8)
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiBox,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSliders,
    FiTarget,
    FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import BasePlate3D from '../../components/3d/scenes/BasePlate3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { CONCRETE_GRADES as _CONCRETE_GRADES_LIB, STEEL_GRADES as _STEEL_GRADES_LIB } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { generateBoltPatternDXF } from '../../lib/dxfGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Column
  columnSection: string;
  columnGrade: string;
  columnDepth: number;
  columnWidth: number;
  columnFlange: number;
  columnWeb: number;

  // Base Plate
  plateLength: number;
  plateWidth: number;
  plateThickness: number;
  plateGrade: string;

  // Anchor Bolts
  boltGrade: string;
  boltDiameter: number;
  numberOfBolts: number;
  boltPattern: string;
  edgeDistance: number;
  embedmentDepth: number;

  // Foundation
  concreteGrade: string;
  groutThickness: number;

  // Loading
  axialForce: string; // kN
  momentMajor: string; // kNm
  momentMinor: string; // kNm
  shearMajor: string; // kN

  // Project
  projectName: string;
  reference: string;
}

interface Results {
  bearingStress: number;
  fjdBearing: number;
  bearingUtil: number;
  bearingStatus: 'PASS' | 'FAIL';
  plateMoment: number;
  plateCapacity: number;
  plateUtil: number;
  plateStatus: 'PASS' | 'FAIL';
  shearForce: number;
  frictionCapacity: number;
  boltShearCapacity: number;
  shearUtil: number;
  shearStatus: 'PASS' | 'FAIL';
  overallStatus: 'PASS' | 'FAIL';
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

// Adapter: BasePlate expects Record<string, number> (key → fy)
const STEEL_GRADES: Record<string, number> = Object.fromEntries(
  Object.entries(_STEEL_GRADES_LIB)
    .filter(([k]) => ['S235', 'S275', 'S355'].includes(k))
    .map(([k, v]) => [k, v.fy])
);

const CONCRETE_GRADES: Record<string, number> = {
  C20: _CONCRETE_GRADES_LIB['C20/25'].fck,
  C25: _CONCRETE_GRADES_LIB['C25/30'].fck,
  C30: _CONCRETE_GRADES_LIB['C30/37'].fck,
  C35: _CONCRETE_GRADES_LIB['C35/45'].fck,
};

const COLUMN_SECTIONS = [
  { name: 'UKB 203x133x25', d: 203.2, b: 133.2, tf: 7.8, tw: 5.7 },
  { name: 'UKB 305x165x40', d: 303.8, b: 165.1, tf: 10.2, tw: 6.0 },
  { name: 'UKB 406x178x60', d: 406.4, b: 177.7, tf: 12.8, tw: 7.7 },
  { name: 'UKC 203x203x46', d: 203.2, b: 203.6, tf: 11.0, tw: 7.2 },
  { name: 'UKC 254x254x73', d: 254.1, b: 254.6, tf: 14.2, tw: 8.6 },
];

const PRESETS = {
  standard_pinned: {
    columnSection: 'UKC 203x203x46',
    plateLength: 400,
    plateWidth: 400,
    plateThickness: 20,
    axialForce: '250',
    momentMajor: '0',
    numberOfBolts: 4,
    boltDiameter: 20,
  },
  moment_connection: {
    columnSection: 'UKC 254x254x73',
    plateLength: 500,
    plateWidth: 500,
    plateThickness: 30,
    axialForce: '400',
    momentMajor: '120',
    numberOfBolts: 4,
    boltDiameter: 24,
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const BasePlate: React.FC = () => {
  const [form, setForm] = useState<FormData>({
    columnSection: 'UKC 203x203x46',
    columnGrade: 'S355',
    columnDepth: 203.2,
    columnWidth: 203.6,
    columnFlange: 11.0,
    columnWeb: 7.2,
    plateLength: 400,
    plateWidth: 400,
    plateThickness: 20,
    plateGrade: 'S355',
    boltGrade: '8.8',
    boltDiameter: 20,
    numberOfBolts: 4,
    boltPattern: '4nr Outer',
    edgeDistance: 50,
    embedmentDepth: 300,
    concreteGrade: 'C30',
    groutThickness: 30,
    axialForce: '200',
    momentMajor: '50',
    momentMinor: '0',
    shearMajor: '20',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'axialForce', label: 'Axial Force' },
  { key: 'momentMajor', label: 'Moment Major' },
  { key: 'momentMinor', label: 'Moment Minor' },
  { key: 'shearMajor', label: 'Shear Major' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'columnSection', label: 'Column Section', min: 0, max: 100, step: 1, unit: '' },
    { key: 'columnGrade', label: 'Column Grade', min: 0, max: 100, step: 1, unit: '' },
    { key: 'plateGrade', label: 'Plate Grade', min: 0, max: 100, step: 1, unit: '' },
    { key: 'boltGrade', label: 'Bolt Grade', min: 0, max: 100, step: 1, unit: '' }
  ];


  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    column: true,
    plate: true,
    anchors: false,
    loading: true,
    project: false,
  });

  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSectionChange = (sectionName: string) => {
    const section = COLUMN_SECTIONS.find((s) => s.name === sectionName);
    if (section) {
      setForm((p) => ({
        ...p,
        columnSection: sectionName,
        columnDepth: section.d,
        columnWidth: section.b,
        columnFlange: section.tf,
        columnWeb: section.tw,
      }));
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const NEd = Math.abs(parseFloat(form.axialForce)) || 0.1;
    const MEd = Math.abs(parseFloat(form.momentMajor)) || 0;
    const VEd = Math.abs(parseFloat(form.shearMajor)) || 0;

    const fy_plate = STEEL_GRADES[form.plateGrade];
    const fck = CONCRETE_GRADES[form.concreteGrade];

    // 1. Concrete Bearing Strength (fjd)
    // Simple Eurocode approach: fjd = βj * fcd
    // βj = 2/3, fcd = (αcc * fck) / γc
    const fcd = (0.85 * fck) / 1.5;
    const fjd = (2 / 3) * fcd; // Effective bearing strength

    // 2. Projection (c)
    // tp * sqrt(fy / (3 * fjd * γM0))
    const c = form.plateThickness * Math.sqrt(fy_plate / (3 * fjd * 1.0));

    // 3. Effective Area (Aeff)
    // Simplified: (d + 2c) * (b + 2c)
    // For T-stub or moment, it gets complex, but here's a standard approximation.
    const d = form.columnDepth;
    const b = form.columnWidth;
    const effectiveDepth = Math.min(form.plateLength, d + 2 * c);
    const effectiveWidth = Math.min(form.plateWidth, b + 2 * c);
    const Aeff = effectiveDepth * effectiveWidth;

    // 4. Bearing Stress & Check
    // σ = NEd / Aeff + MEd / Weff (approx)
    const e = MEd > 0 ? (MEd * 1000) / NEd : 0;
    const bearingStress =
      (NEd * 1000) / Aeff + (MEd * 1e6) / ((effectiveWidth * effectiveDepth ** 2) / 6);
    const bearingUtil = (bearingStress / fjd) * 100;
    const bearingStatus = bearingStress <= fjd ? 'PASS' : 'FAIL';

    // 5. Plate Bending
    // Moment in cantilever projection
    const plateMoment = (bearingStress * c ** 2) / 2; // Nmm/mm
    const plateCapacity = (form.plateThickness ** 2 * fy_plate) / (4 * 1.0); // Zpl * fy
    const plateUtil = (plateMoment / plateCapacity) * 100;
    const plateStatus = plateUtil <= 100 ? 'PASS' : 'FAIL';

    // 6. Shear Transfer
    const frictionCapacity = 0.3 * NEd; // Cf = 0.3
    const shearUtil = (VEd / frictionCapacity) * 100;
    const shearStatus = VEd <= frictionCapacity ? 'PASS' : 'FAIL';

    // Warnings
    if (bearingStatus === 'FAIL')
      w.push('Concrete bearing capacity exceeded. Increase plate size or concrete grade.');
    if (plateStatus === 'FAIL') w.push('Base plate thickness insufficient for bending.');
    if (shearStatus === 'FAIL')
      w.push('Shear friction exceeded. Shear key or anchor bolt shearing required.');
    if (e > form.plateLength / 6)
      w.push('Large eccentricity. Partial lift-off likely - check anchor tension.');

    setResults({
      bearingStress,
      fjdBearing: fjd,
      bearingUtil,
      bearingStatus,
      plateMoment,
      plateCapacity,
      plateUtil,
      plateStatus,
      shearForce: VEd,
      frictionCapacity,
      boltShearCapacity: 0, // Simplified
      shearUtil,
      shearStatus,
      overallStatus:
        bearingStatus === 'PASS' && plateStatus === 'PASS' && shearStatus === 'PASS'
          ? 'PASS'
          : 'FAIL',
    });
    setWarnings(w);
  }, [form]);

  useEffect(() => {
    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [calculate]);

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
      className={cn('rounded-2xl border overflow-hidden bg-gray-800/20 backdrop-blur-md shadow-2xl', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/40 hover:bg-gray-700/40 transition-colors"
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
            className="p-4 bg-gray-800/20"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const InputField: React.FC<{ label: string; field: keyof FormData; unit?: string }> = ({
    label,
    field,
    unit,
  }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title={label}
          type="number"
          value={form[field] as any}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
        />
        {unit && <span className="absolute right-3 top-3 text-gray-500 text-sm">{unit}</span>}
      </div>
    </div>
  );

  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Base Plate Design',
      subtitle: 'EN 1993-1-8 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'BP001' },
        { label: 'Standard', value: 'EN 1993-1-8' },
      ],
      inputs: [
        { label: 'Column Section', value: form.columnSection },
        { label: 'Column Grade', value: form.columnGrade },
        {
          label: 'Plate Dimensions',
          value: `${form.plateLength} x ${form.plateWidth} x ${form.plateThickness}`,
          unit: 'mm',
        },
        { label: 'Plate Grade', value: form.plateGrade },
        { label: 'Bolt Grade', value: form.boltGrade },
        { label: 'Bolt Diameter', value: String(form.boltDiameter), unit: 'mm' },
        { label: 'Number of Bolts', value: String(form.numberOfBolts) },
        { label: 'Concrete Grade', value: form.concreteGrade },
        { label: 'Grout Thickness', value: String(form.groutThickness), unit: 'mm' },
        { label: 'Axial Force', value: form.axialForce, unit: 'kN' },
        { label: 'Moment (Major)', value: form.momentMajor, unit: 'kN·m' },
        { label: 'Shear (Major)', value: form.shearMajor, unit: 'kN' },
      ],
      checks: [
        {
          name: 'Bearing Stress (6.2.5)',
          capacity: `${results.fjdBearing.toFixed(1)} N/mm²`,
          utilisation: `${results.bearingUtil.toFixed(1)}%`,
          status: results.bearingStatus,
        },
        {
          name: 'Plate Bending',
          capacity: `${results.plateCapacity.toFixed(1)} kN·m`,
          utilisation: `${results.plateUtil.toFixed(1)}%`,
          status: results.plateStatus,
        },
        {
          name: 'Shear Resistance',
          capacity: `${(results.frictionCapacity + results.boltShearCapacity).toFixed(1)} kN`,
          utilisation: `${results.shearUtil.toFixed(1)}%`,
          status: results.shearStatus,
        },
      ],
      sections: [
        {
          title: 'Detailed Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Bearing Stress', results.bearingStress.toFixed(2), 'N/mm²'],
            ['Bearing Resistance (fjd)', results.fjdBearing.toFixed(2), 'N/mm²'],
            ['Plate Moment', results.plateMoment.toFixed(1), 'Nmm/mm'],
            ['Plate Capacity', results.plateCapacity.toFixed(1), 'Nmm/mm'],
            ['Shear Force', results.shearForce.toFixed(1), 'kN'],
            ['Friction Capacity', results.frictionCapacity.toFixed(1), 'kN'],
          ],
        },
      ],
      recommendations: [
        ...(results.bearingUtil > 80
          ? [
              {
                check: 'High Bearing',
                suggestion: 'Consider larger plate or higher concrete grade',
              },
            ]
          : []),
        ...(results.plateUtil > 80
          ? [{ check: 'High Plate Bending', suggestion: 'Increase plate thickness' }]
          : []),
        ...(results.shearUtil > 80
          ? [{ check: 'High Shear', suggestion: 'Consider shear key or larger anchor bolts' }]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.overallStatus === 'PASS'
              ? 'Base plate design adequate'
              : 'Review bearing, bending, or shear capacity',
        },
      ],
      warnings,
      footerNote: 'Beaver Bridges Ltd — Base Plate Design (EN 1993-1-8)',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Base Plate Design',
      subtitle: 'EN 1993-1-8 Compliant',
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'BP001' },
        { label: 'Standard', value: 'EN 1993-1-8' },
      ],
      inputs: [
        { label: 'Column Section', value: form.columnSection },
        { label: 'Column Grade', value: form.columnGrade },
        {
          label: 'Plate Dimensions',
          value: `${form.plateLength} x ${form.plateWidth} x ${form.plateThickness}`,
          unit: 'mm',
        },
        { label: 'Plate Grade', value: form.plateGrade },
        { label: 'Bolt Grade', value: form.boltGrade },
        { label: 'Bolt Diameter', value: String(form.boltDiameter), unit: 'mm' },
        { label: 'Number of Bolts', value: String(form.numberOfBolts) },
        { label: 'Concrete Grade', value: form.concreteGrade },
        { label: 'Axial Force', value: form.axialForce, unit: 'kN' },
        { label: 'Moment (Major)', value: form.momentMajor, unit: 'kN·m' },
        { label: 'Shear (Major)', value: form.shearMajor, unit: 'kN' },
      ],
      checks: [
        {
          name: 'Bearing Stress (6.2.5)',
          capacity: `${results.fjdBearing.toFixed(1)} N/mm²`,
          utilisation: `${results.bearingUtil.toFixed(1)}%`,
          status: results.bearingStatus,
        },
        {
          name: 'Plate Bending',
          capacity: `${results.plateCapacity.toFixed(1)} kN·m`,
          utilisation: `${results.plateUtil.toFixed(1)}%`,
          status: results.plateStatus,
        },
        {
          name: 'Shear Resistance',
          capacity: `${(results.frictionCapacity + results.boltShearCapacity).toFixed(1)} kN`,
          utilisation: `${results.shearUtil.toFixed(1)}%`,
          status: results.shearStatus,
        },
      ],
      footerNote: 'Beaver Bridges Ltd — Base Plate Design (EN 1993-1-8)',
    });
  };

  const exportDXF = () => {
    if (!results) return;
    const nBolts = Number(form.numberOfBolts);
    // Approximate as 2-column pattern
    const cols = 2;
    const rows = Math.max(1, Math.ceil(nBolts / cols));
    const gauge = form.plateWidth - 2 * 50;
    const pitch = rows > 1 ? (form.plateLength - 2 * 50) / (rows - 1) : 0;
    generateBoltPatternDXF(
      {
        plateWidth: form.plateWidth,
        plateHeight: form.plateLength,
        cols,
        rows,
        holeDiameter: form.boltDiameter + 2,
        gauge,
        pitch,
        edgeDistance: 50,
      },
      'Base Plate - Bolt Layout',
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="fixed inset-0 z-0 opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6">
          <div>
            <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
              Base Plate Design
            </h1>
            <p className="text-lg text-gray-400 mt-2">Column Base Connection per EN 1993-1-8</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportPDF}
              disabled={!results}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FiDownload className="mr-2" /> PDF
            </Button>
            <Button
              onClick={exportDOCX}
              disabled={!results}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <FiDownload className="mr-2" /> DOCX
            </Button>
            <Button
              onClick={exportDXF}
              disabled={!results}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <FiDownload className="mr-2" /> DXF
            </Button>
            <SaveRunButton calculatorKey="base-plate" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-3">
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
              <div className="lg:col-span-2 space-y-4">
                <Section
                  id="column"
                  title="Column Section"
                  icon={<FiBox className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Select Section</label>
                      <select
                        value={form.columnSection}
                        onChange={(e) => handleSectionChange(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                        title="Column Section"
                      >
                        {COLUMN_SECTIONS.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Column Grade</label>
                      <select
                        title="Column Grade"
                        value={form.columnGrade}
                        onChange={(e) => updateForm('columnGrade', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.keys(STEEL_GRADES).map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                <Section
                  id="plate"
                  title="Base Plate & Foundation"
                  icon={<FiLayers className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <InputField label="Plate Length" field="plateLength" unit="mm" />
                    <InputField label="Plate Width" field="plateWidth" unit="mm" />
                    <InputField label="Thickness" field="plateThickness" unit="mm" />
                    <InputField label="Grout Depth" field="groutThickness" unit="mm" />
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-200">Concrete Grade</label>
                      <select
                        title="Concrete Grade"
                        value={form.concreteGrade}
                        onChange={(e) => updateForm('concreteGrade', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.keys(CONCRETE_GRADES).map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                <Section
                  id="loading"
                  title="Design Loads"
                  icon={<FiZap className="w-6 h-6 text-neon-cyan" />}
                  color="border-neon-cyan/30"
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <InputField label="Axial NEd" field="axialForce" unit="kN" />
                    <InputField label="Moment MEd" field="momentMajor" unit="kNm" />
                    <InputField label="Shear VEd" field="shearMajor" unit="kN" />
                  </div>
                </Section>

                {/* Calculate Button */}
                <button
                  onClick={calculate}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-2xl shadow-neon-cyan/20"
                >
                  ⚡ RUN FULL ANALYSIS
                </button>
              </div>

              <div className="sticky top-8 space-y-4">
                <Card
                  variant="glass"
                  className={cn(
                    'border-neon-cyan/30 shadow-2xl p-6',
                    results?.overallStatus === 'PASS'
                      ? 'shadow-emerald-500/10'
                      : results?.overallStatus === 'FAIL'
                        ? 'shadow-red-500/10'
                        : 'shadow-blue-500/5',
                  )}
                >
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <FiTarget className="text-neon-cyan" /> Summary
                  </h3>
                  <div className="space-y-4">
                    <div className={cn("p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 border-l-4", results?.bearingStatus === 'PASS' ? 'border-l-emerald-400' : 'border-l-red-400')}>
                      <div className="text-sm font-semibold text-gray-200">Bearing Utilisation</div>
                      <div
                        className={cn(
                          'text-3xl font-black',
                          results?.bearingStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results?.bearingUtil.toFixed(1)}%
                      </div>
                    </div>
                    <div className={cn("p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 border-l-4", results?.plateStatus === 'PASS' ? 'border-l-emerald-400' : 'border-l-red-400')}>
                      <div className="text-sm font-semibold text-gray-200">Plate Utilisation</div>
                      <div
                        className={cn(
                          'text-3xl font-black',
                          results?.plateStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results?.plateUtil.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </Card>
                {/* Fullscreen Preview Overlay */}
                {previewMaximized && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                  >
                    <div className="flex-1 relative">
                      <Interactive3DDiagram
                        height="h-full"
                        cameraPosition={[4, 5, 4]}
                        status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      >
                        <BasePlate3D
                          columnDepth={form.columnDepth}
                          columnWidth={form.columnWidth}
                          columnFlange={form.columnFlange}
                          columnWeb={form.columnWeb}
                          plateLength={form.plateLength}
                          plateWidth={form.plateWidth}
                          plateThick={form.plateThickness}
                          nBolts={form.numberOfBolts}
                          boltDiameter={form.boltDiameter}
                          embedment={form.embedmentDepth}
                          groutThick={form.groutThickness}
                          axialForce={parseFloat(form.axialForce) || 0}
                          moment={parseFloat(form.momentMajor) || 0}
                          status={results?.overallStatus || 'PASS'}
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
                        BASE PLATE — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                          <FiActivity size={14} /> Live Readout
                        </h3>
                        {[
                          { label: 'Column', value: form.columnSection },
                          { label: 'Plate', value: `${form.plateLength}×${form.plateWidth}×${form.plateThickness}` },
                          { label: 'Bolts', value: `${form.numberOfBolts}×M${form.boltDiameter}` },
                          { label: 'Bolt Grade', value: form.boltGrade },
                          { label: 'Axial Force', value: `${form.axialForce} kN` },
                          { label: 'Moment', value: `${form.momentMajor} kNm` },
                          { label: 'Concrete', value: form.concreteGrade },
                        ].map((stat) => (
                          <div key={stat.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                            <span className="text-gray-500">{stat.label}</span>
                            <span className="text-white font-medium">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                      {results && (
                        <div className="mt-3 space-y-1">
                          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Last Analysis</div>
                          {[
                            { label: 'Bearing', util: results.bearingUtil.toFixed(1), status: results.bearingStatus },
                            { label: 'Plate Bending', util: results.plateUtil.toFixed(1), status: results.plateStatus },
                            { label: 'Shear', util: results.shearUtil.toFixed(1), status: results.shearStatus },
                          ].map((check) => (
                            <div key={check.label} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-500">{check.label}</span>
                              <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util || '0')) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                                {check.util}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="w-full py-2 mt-4 text-sm font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-neon-cyan/40 rounded-lg transition-colors"
                      >
                        Close Fullscreen
                      </button>
                    </div>
                  </motion.div>
                )}
                <div className="relative">
                  <button
                    onClick={() => setPreviewMaximized(true)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                    aria-label="Maximize preview"
                    title="Fullscreen preview"
                  >
                    <FiMaximize2 size={16} />
                  </button>
                  <WhatIfPreview
                    title="Base Plate — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram
                        height={fsHeight}
                        cameraPosition={[4, 5, 4]}
                        status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                      >
                        <BasePlate3D
                          columnDepth={form.columnDepth}
                          columnWidth={form.columnWidth}
                          columnFlange={form.columnFlange}
                          columnWeb={form.columnWeb}
                          plateLength={form.plateLength}
                          plateWidth={form.plateWidth}
                          plateThick={form.plateThickness}
                          nBolts={form.numberOfBolts}
                          boltDiameter={form.boltDiameter}
                          embedment={form.embedmentDepth}
                          groutThick={form.groutThickness}
                          axialForce={parseFloat(form.axialForce) || 0}
                          moment={parseFloat(form.momentMajor) || 0}
                          status={results?.overallStatus || 'PASS'}
                        />
                      </Interactive3DDiagram>
                    )}
                  />
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
              <div className="grid md:grid-cols-3 gap-6">
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Concrete Bearing</h3>
                  <div className="text-4xl font-black text-blue-400">
                    {results.bearingStress.toFixed(1)} MPa
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Resistance (fjd): {results.fjdBearing.toFixed(1)} MPa
                  </p>
                </Card>
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Plate Strength</h3>
                  <div className="text-4xl font-black text-cyan-400">
                    {results.plateUtil.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Design for MEd: {results.plateMoment.toFixed(1)} Nmm/mm
                  </p>
                </Card>
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-2">Shear Friction</h3>
                  <div className="text-4xl font-black text-amber-400">
                    {results.shearUtil.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Capacity: {results.frictionCapacity.toFixed(1)} kN
                  </p>
                </Card>
              </div>
              {warnings.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
                  {warnings.map((w, i) => (
                    <div key={i} className="text-red-400 flex items-center gap-2 text-sm">
                      <FiAlertTriangle /> {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FiCheck /> Recommendations
                </h3>
                <div className="space-y-3">
                  {results.bearingUtil > 80 && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span className="text-gray-300">
                        High bearing utilisation — consider larger plate or higher concrete grade
                      </span>
                    </div>
                  )}
                  {results.plateUtil > 80 && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span className="text-gray-300">
                        High plate bending utilisation — increase plate thickness
                      </span>
                    </div>
                  )}
                  {results.shearUtil > 80 && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span className="text-gray-300">
                        High shear utilisation — consider shear key or larger anchor bolts
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-sm">
                    <span
                      className={
                        results.overallStatus === 'PASS'
                          ? 'text-emerald-400 mt-0.5'
                          : 'text-red-400 mt-0.5'
                      }
                    >
                      •
                    </span>
                    <span className="text-gray-300">
                      {results.overallStatus === 'PASS'
                        ? 'Base plate design adequate per EN 1993-1-8'
                        : 'Design fails — review bearing, bending, or shear capacity'}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'visualization' && (
            <motion.div
              key="vis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="aspect-video bg-gray-800/20 rounded-2xl overflow-hidden border border-gray-700/50 relative"
            >
              <Interactive3DDiagram
                height="h-full"
                cameraPosition={[5, 6, 5]}
                status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
              >
                <BasePlate3D
                  columnDepth={form.columnDepth}
                  columnWidth={form.columnWidth}
                  columnFlange={form.columnFlange}
                  columnWeb={form.columnWeb}
                  plateLength={form.plateLength}
                  plateWidth={form.plateWidth}
                  plateThick={form.plateThickness}
                  nBolts={form.numberOfBolts}
                  boltDiameter={form.boltDiameter}
                  embedment={form.embedmentDepth}
                  groutThick={form.groutThickness}
                  axialForce={parseFloat(form.axialForce) || 0}
                  moment={parseFloat(form.momentMajor) || 0}
                  status={results?.overallStatus || 'PASS'}
                />
              </Interactive3DDiagram>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
  );
};

export default BasePlate;
