// =============================================================================
// Shear Stud Design — Premium Version
// EN 1994-1-1 headed stud design for composite beams
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
  FiGrid,
  FiLayers,
  FiMaximize2,
  FiMinimize2,
  FiSliders,
  FiTarget,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import ShearStuds3D from '../../components/3d/scenes/ShearStuds3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';

interface ShearStudForm {
  studDiameter: string;
  studHeight: string;
  studFu: string;
  fck: string;
  Ecm: string;
  slabDepth: string;
  deckType: string;
  beamSpan: string;
  shearForce: string;
  studSpacing: string;
  numberOfRows: string;
  deckOrientation: string;
  projectName: string;
  reference: string;
}
interface ShearStudResults {
  PRd_steel: number;
  PRd_concrete: number;
  PRd: number;
  ktFactor: number;
  PRd_reduced: number;
  studsProvided: number;
  totalCapacity: number;
  shearUtil: number;
  maxSpacing: number;
  minSpacing: number;
  spacingStatus: string;
  status: string;
  maxUtil: number;
  criticalCheck: string;
}

const STUD_SIZES: Record<string, { d: number; h: number; name: string }> = {
  '16x75': { d: 16, h: 75, name: '16mm × 75mm' },
  '19x100': { d: 19, h: 100, name: '19mm × 100mm' },
  '19x125': { d: 19, h: 125, name: '19mm × 125mm' },
  '22x100': { d: 22, h: 100, name: '22mm × 100mm' },
  '25x100': { d: 25, h: 100, name: '25mm × 100mm' },
};
const DECK_TYPES: Record<string, { name: string; kt: number }> = {
  none: { name: 'No Deck (solid slab)', kt: 1.0 },
  parallel: { name: 'Deck Parallel', kt: 0.75 },
  perp_1: { name: 'Deck Perpendicular (1 stud/rib)', kt: 0.85 },
  perp_2: { name: 'Deck Perpendicular (2 studs/rib)', kt: 0.7 },
};

const PRESETS: Record<string, { name: string; form: Partial<ShearStudForm> }> = {
  typical_19: {
    name: 'Typical 19mm Studs',
    form: {
      studDiameter: '19',
      studHeight: '100',
      studFu: '450',
      fck: '30',
      slabDepth: '130',
      deckType: 'none',
      studSpacing: '150',
      numberOfRows: '1',
    },
  },
  deck_perp: {
    name: 'With Deck (perp)',
    form: {
      studDiameter: '19',
      studHeight: '100',
      studFu: '450',
      fck: '30',
      slabDepth: '130',
      deckType: 'perp_1',
      studSpacing: '300',
      numberOfRows: '1',
    },
  },
  heavy_22: {
    name: 'Heavy 22mm Studs',
    form: {
      studDiameter: '22',
      studHeight: '100',
      studFu: '450',
      fck: '35',
      slabDepth: '150',
      deckType: 'none',
      studSpacing: '150',
      numberOfRows: '2',
    },
  },
};

const ShearStuds: React.FC = () => {
  const [form, setForm] = useState<ShearStudForm>({
    studDiameter: '19',
    studHeight: '100',
    studFu: '450',
    fck: '30',
    Ecm: '33000',
    slabDepth: '130',
    deckType: 'none',
    beamSpan: '7.5',
    shearForce: '500',
    studSpacing: '150',
    numberOfRows: '1',
    deckOrientation: 'perpendicular',
    projectName: '',
    reference: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'studDiameter', label: 'Stud Diameter' },
  { key: 'studHeight', label: 'Stud Height' },
  { key: 'studFu', label: 'Stud Fu' },
  { key: 'fck', label: 'Fck' },
  { key: 'Ecm', label: 'Ecm' },
  { key: 'slabDepth', label: 'Slab Depth' },
  { key: 'beamSpan', label: 'Beam Span' },
  { key: 'shearForce', label: 'Shear Force' },
  { key: 'studSpacing', label: 'Stud Spacing' },
  { key: 'numberOfRows', label: 'Number Of Rows' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'studDiameter', label: 'Stud Diameter', min: 0, max: 100, step: 1, unit: '' },
    { key: 'studHeight', label: 'Stud Height', min: 0, max: 100, step: 1, unit: '' },
    { key: 'studFu', label: 'Stud Fu', min: 0, max: 100, step: 1, unit: '' },
    { key: 'fck', label: 'Fck', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<ShearStudResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stud: true,
    slab: true,
    layout: true,
  });
  const [previewMaximized, setPreviewMaximized] = useState(false);


  const updateForm = (field: keyof ShearStudForm, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));
  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));
  const applyPreset = (k: string) => {
    const p = PRESETS[k];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  const calculate = useCallback(() => {
    if (!validateInputs()) return;
    const w: string[] = [];
    const d = parseFloat(form.studDiameter);
    const hsc = parseFloat(form.studHeight);
    const fu = parseFloat(form.studFu);
    const fck = parseFloat(form.fck);
    const Ecm = parseFloat(form.Ecm);
    const gammaV = 1.25;
    const span = parseFloat(form.beamSpan) * 1000; // mm
    const VEd = parseFloat(form.shearForce); // kN total longitudinal shear
    const spacing = parseFloat(form.studSpacing);
    const nRows = parseInt(form.numberOfRows);
    const deck = DECK_TYPES[form.deckType];

    // EN 1994-1-1 Cl 6.6.3.1
    // Steel failure: PRd = 0.8 × fu × π × d² / 4 / γV
    const PRd_steel = (0.8 * fu * Math.PI * d * d) / 4 / (gammaV * 1000); // kN

    // Concrete failure: PRd = 0.29 × α × d² × √(fck × Ecm) / γV
    const alpha = hsc / d >= 4 ? 1.0 : 0.2 * (hsc / d + 1);
    const PRd_concrete = (0.29 * alpha * d * d * Math.sqrt(fck * Ecm)) / (gammaV * 1000); // kN

    const PRd = Math.min(PRd_steel, PRd_concrete);
    const ktFactor = deck.kt;
    const PRd_reduced = PRd * ktFactor;

    // Layout
    const halfSpan = span / 2;
    const studsPerHalf = Math.floor(halfSpan / spacing) + 1;
    const studsProvided = studsPerHalf * 2 * nRows;
    const totalCapacity = studsProvided * PRd_reduced;
    const shearUtil = (VEd / totalCapacity) * 100;

    // Spacing checks (EN 1994-1-1 Cl 6.6.5)
    const maxSpacing = Math.min(800, 6 * parseFloat(form.slabDepth)); // mm
    const minSpacing = 5 * d; // mm
    const spacingOK = spacing >= minSpacing && spacing <= maxSpacing;
    const spacingStatus = spacingOK ? 'PASS' : 'FAIL';

    const maxUtil = Math.max(shearUtil, spacingOK ? 0 : 101);
    const criticalCheck = !spacingOK ? 'Spacing' : 'Shear';
    const status = maxUtil <= 100 ? 'PASS' : 'FAIL';

    if (spacing < minSpacing) w.push(`Spacing ${spacing}mm < minimum ${minSpacing}mm (5d)`);
    if (spacing > maxSpacing) w.push(`Spacing ${spacing}mm > maximum ${maxSpacing}mm`);
    if (hsc / d < 3) w.push('Height/diameter ratio < 3 — stud too short');
    if (shearUtil > 90 && shearUtil <= 100) w.push('Shear utilisation >90% — limited reserve');

    setResults({
      PRd_steel,
      PRd_concrete,
      PRd,
      ktFactor,
      PRd_reduced,
      studsProvided,
      totalCapacity,
      shearUtil,
      maxSpacing,
      minSpacing,
      spacingStatus,
      status,
      maxUtil,
      criticalCheck,
    });
    setWarnings(w);
  }, [form]);

  useEffect(() => {
    const t = setTimeout(calculate, 300);
    return () => clearTimeout(t);
  }, [calculate]);

  const exportPDF = async () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.shearUtil > 90)
      recs.push({
        check: 'Shear Utilisation',
        suggestion: 'Reduce spacing, add row of studs, or increase stud diameter',
      });
    if (results.spacingStatus === 'FAIL')
      recs.push({
        check: 'Spacing',
        suggestion: `Adjust spacing to ${results.minSpacing}-${results.maxSpacing}mm range`,
      });
    if (results.ktFactor < 0.8)
      recs.push({
        check: 'Deck Reduction',
        suggestion: 'Consider solid slab or perpendicular deck with single stud per rib',
      });
    try {
      await generatePremiumPDF({
        title: 'Shear Stud Design',
        subtitle: `ø${form.studDiameter}×${form.studHeight}mm`,
        projectInfo: [
          { label: 'Project', value: form.projectName || '-' },
          { label: 'Ref', value: form.reference || '-' },
          { label: 'Code', value: 'EN 1994-1-1' },
        ],
        inputs: [
          { label: 'Stud', value: `ø${form.studDiameter} × ${form.studHeight}mm`, unit: '' },
          { label: 'fu', value: form.studFu, unit: 'MPa' },
          { label: 'fck', value: form.fck, unit: 'MPa' },
          { label: 'Deck', value: DECK_TYPES[form.deckType]?.name },
          { label: 'Spacing', value: form.studSpacing, unit: 'mm' },
          { label: 'Span', value: form.beamSpan, unit: 'm' },
        ],
        tables: [
          {
            title: 'Results',
            head: [['Parameter', 'Value', 'Unit']],
            body: [
              ['PRd (steel)', results.PRd_steel.toFixed(1), 'kN'],
              ['PRd (concrete)', results.PRd_concrete.toFixed(1), 'kN'],
              ['PRd (governing)', results.PRd.toFixed(1), 'kN'],
              ['kt factor', results.ktFactor.toFixed(2), ''],
              ['PRd (reduced)', results.PRd_reduced.toFixed(1), 'kN'],
              ['Studs provided', results.studsProvided.toString(), 'nr'],
              ['Total capacity', results.totalCapacity.toFixed(0), 'kN'],
              ['Applied shear', form.shearForce, 'kN'],
            ],
          },
        ],
        checks: [
          {
            name: 'Shear',
            capacity: `${results.totalCapacity.toFixed(0)} kN`,
            utilisation: `${results.shearUtil.toFixed(1)}%`,
            status: (results.shearUtil <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
          },
          {
            name: 'Spacing',
            capacity: `${results.minSpacing}-${results.maxSpacing} mm`,
            utilisation: form.studSpacing + ' mm',
            status: results.spacingStatus as 'PASS' | 'FAIL',
          },
        ],
        recommendations: recs,
        warnings,
        footerNote: 'BeaverCalc Studio — EN 1994-1-1 Shear Studs',
      });
    } catch (e) {
      console.error(e);
    }
  };

  // DOCX Export
  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Shear Stud Design',
      subtitle: `ø${form.studDiameter}×${form.studHeight}mm`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Ref', value: form.reference || '-' },
        { label: 'Code', value: 'EN 1994-1-1' },
      ],
      inputs: [
        { label: 'Stud', value: `ø${form.studDiameter} × ${form.studHeight}mm` },
        { label: 'fu', value: form.studFu, unit: 'MPa' },
        { label: 'fck', value: form.fck, unit: 'MPa' },
        { label: 'Deck', value: DECK_TYPES[form.deckType]?.name },
        { label: 'Spacing', value: form.studSpacing, unit: 'mm' },
        { label: 'Span', value: form.beamSpan, unit: 'm' },
      ],
      checks: [
        {
          name: 'Shear',
          capacity: `${results.totalCapacity.toFixed(0)} kN`,
          utilisation: `${results.shearUtil.toFixed(1)}%`,
          status: (results.shearUtil <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Spacing',
          capacity: `${results.minSpacing}-${results.maxSpacing} mm`,
          utilisation: form.studSpacing + ' mm',
          status: results.spacingStatus as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [],
      footerNote: 'BeaverCalc Studio \u2014 EN 1994-1-1 Shear Studs',
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
      className={cn('rounded-2xl border overflow-hidden shadow-lg bg-gray-900/40 backdrop-blur-md', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            {icon}
          </div>
          <span className="text-white font-semibold">{title}</span>
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
    field: keyof ShearStudForm;
    unit?: string;
    type?: string;
  }> = ({ label, field, unit, type = 'number' }) => (
    <div className="space-y-1">
      <ExplainableLabel label={label} field={field} />
      <div className="relative">
        <input
          title={label}
          placeholder={label}
          type={type}
          value={form[field]}
          onChange={(e) => updateForm(field, e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 mb-4">
            <FiLayers className="w-4 h-4" />
            <span className="text-sm font-medium">EN 1994-1-1</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Shear Stud Design
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Headed shear stud resistance, spacing, and layout design to Eurocode 4
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button onClick={exportPDF} className="bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300">
            <FiDownload className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button onClick={exportDOCX} className="bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300">
            <FiDownload className="w-4 h-4 mr-2" /> DOCX
          </Button>
          <div className="flex-1" />
          <SaveRunButton calculatorKey="shear-studs" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
        </div>

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

        <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField label="Project" field="projectName" type="text" />
              <InputField label="Reference" field="reference" type="text" />
            </div>
          </CardContent>
        </Card>
        <WhatIfPreview
          title="Shear Studs — 3D Preview"
          sliders={whatIfSliders}
          form={form}
          updateForm={updateForm}
          status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
          renderScene={(fsHeight) => (
            <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
              <CardContent className="p-4">
                <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                  <ShearStuds3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          )}
        />
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
                  id="stud"
                  title="Stud Properties"
                  icon={<FiLayers className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Stud Size</label>
                      <select
                        value={`${form.studDiameter}x${form.studHeight}`}
                        onChange={(e) => {
                          const s = STUD_SIZES[e.target.value];
                          if (s)
                            setForm((p) => ({
                              ...p,
                              studDiameter: s.d.toString(),
                              studHeight: s.h.toString(),
                            }));
                        }}
                        title="Stud Size"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(STUD_SIZES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Stud fu" field="studFu" unit="MPa" />
                    <InputField label="Stud Diameter" field="studDiameter" unit="mm" />
                    <InputField label="Stud Height" field="studHeight" unit="mm" />
                  </div>
                </Section>
                <Section
                  id="slab"
                  title="Concrete Slab & Deck"
                  icon={<FiGrid className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Concrete fck" field="fck" unit="MPa" />
                    <InputField label="Ecm" field="Ecm" unit="MPa" />
                    <InputField label="Slab Depth" field="slabDepth" unit="mm" />
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Deck Type</label>
                      <select
                        value={form.deckType}
                        onChange={(e) => updateForm('deckType', e.target.value)}
                        title="Deck Type"
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(DECK_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.name} (kt={v.kt})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>
                <Section
                  id="layout"
                  title="Layout & Loading"
                  icon={<FiTarget className="w-6 h-6 text-blue-400" />}
                  color="border-gray-700/50"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <InputField label="Beam Span" field="beamSpan" unit="m" />
                    <InputField label="Longitudinal Shear Force" field="shearForce" unit="kN" />
                    <InputField label="Stud Spacing" field="studSpacing" unit="mm" />
                    <InputField label="Rows of Studs" field="numberOfRows" />
                  </div>
                </Section>
                <button
                  onClick={calculate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
                </button>
              </div>
              <div className="space-y-4 sticky top-8">
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
                        <ShearStuds3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        title="Close fullscreen"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        SHEAR STUDS — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        { label: 'Stud Diameter', value: `${form.studDiameter} mm` },
                        { label: 'Stud Height', value: `${form.studHeight} mm` },
                        { label: 'fu', value: `${form.studFu} MPa` },
                        { label: 'fck', value: `${form.fck} MPa` },
                        { label: 'Slab Depth', value: `${form.slabDepth} mm` },
                        { label: 'Spacing', value: `${form.studSpacing} mm` },
                        { label: 'Rows', value: form.numberOfRows },
                        { label: 'Beam Span', value: `${form.beamSpan} m` },
                      ].map((p) => (
                        <div key={p.label} className="flex justify-between text-xs py-1 border-b border-gray-800/50">
                          <span className="text-gray-500">{p.label}</span>
                          <span className="text-white font-medium">{p.value}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                          <FiActivity size={14} /> Live Readout
                        </h3>
                        {[
                          { label: 'PRd (reduced)', value: results ? `${results.PRd_reduced.toFixed(1)} kN` : '—' },
                          { label: 'Studs Provided', value: results ? `${results.studsProvided}` : '—' },
                          { label: 'Total Capacity', value: results ? `${results.totalCapacity.toFixed(1)} kN` : '—' },
                          { label: 'Shear Util', value: results ? `${results.shearUtil.toFixed(1)}%` : '—' },
                          { label: 'Max Util', value: results ? `${results.maxUtil.toFixed(1)}%` : '—' },
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
                            { label: 'Shear Check', util: results.shearUtil.toFixed(1), status: results.status },
                            { label: 'Spacing Check', util: results.maxUtil.toFixed(1), status: results.spacingStatus },
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
                <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                      <FiLayers className="w-4 h-4 text-blue-400" /> 3D Preview
                    </CardTitle>
                    <button
                      onClick={() => setPreviewMaximized(true)}
                      className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                      title="Fullscreen preview"
                    >
                      <FiMaximize2 size={16} />
                    </button>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Interactive3DDiagram height="350px" cameraPosition={[8, 6, 8]}>
                      <ShearStuds3D />
                    </Interactive3DDiagram>
                  </CardContent>
                </Card>
                {results && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <Card
                      className={cn(
                        'border-2 shadow-lg',
                        results.status === 'PASS'
                          ? 'bg-green-900/20 border-green-500/50 shadow-green-500/5'
                          : 'bg-red-900/20 border-red-500/50 shadow-red-500/5',
                      )}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {results.status === 'PASS' ? (
                            <FiCheck className="w-6 h-6 text-green-400" />
                          ) : (
                            <FiAlertTriangle className="w-6 h-6 text-red-400" />
                          )}
                          <span
                            className={cn(
                              'text-2xl font-bold',
                              results.status === 'PASS' ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {results.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          Max Util: {results.maxUtil.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Critical: {results.criticalCheck}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 shadow-lg shadow-gray-500/5 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Design Checks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { name: 'Shear Capacity', util: results.shearUtil },
                          { name: 'Spacing', util: results.spacingStatus === 'PASS' ? 50 : 110 },
                        ].map((c) => (
                          <div key={c.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">{c.name}</span>
                              <span className={c.util <= 100 ? 'text-green-400' : 'text-red-400'}>
                                {c.name === 'Spacing'
                                  ? results.spacingStatus
                                  : `${c.util.toFixed(1)}%`}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(c.util, 100)}%` }}
                                className={cn(
                                  'h-full rounded-full',
                                  c.util <= 70
                                    ? 'bg-green-500'
                                    : c.util <= 90
                                      ? 'bg-emerald-500'
                                      : c.util <= 100
                                        ? 'bg-amber-500'
                                        : 'bg-red-500',
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 shadow-lg shadow-blue-500/5 border-l-4 border-l-blue-400">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-white font-semibold">Stud Capacity</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">PRd (steel)</p>
                          <p className="text-white font-mono">{results.PRd_steel.toFixed(1)} kN</p>
                        </div>
                        <div>
                          <p className="text-gray-500">PRd (conc)</p>
                          <p className="text-white font-mono">
                            {results.PRd_concrete.toFixed(1)} kN
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">PRd (gov)</p>
                          <p className="text-white font-mono text-lg">
                            {results.PRd_reduced.toFixed(1)} kN
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">kt factor</p>
                          <p className="text-white font-mono">{results.ktFactor.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Studs</p>
                          <p className="text-white font-mono">{results.studsProvided} nr</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Cap.</p>
                          <p className="text-white font-mono">
                            {results.totalCapacity.toFixed(0)} kN
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    {warnings.length > 0 && (
                      <Card className="bg-amber-900/20 border-amber-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FiAlertTriangle className="text-amber-400" />
                            <span className="text-amber-400 font-medium">Warnings</span>
                          </div>
                          <ul className="space-y-1">
                            {warnings.map((w, i) => (
                              <li key={i} className="text-sm text-amber-200/80">
                                • {w}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> Export PDF Report
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        <FiDownload className="w-4 h-4 mr-2" /> DOCX
                      </Button>
                      <SaveRunButton calculatorKey="shear-studs" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ShearStuds;
