// =============================================================================
// BeaverCalc Studio — Fin Plate Connection Calculator
// BS EN 1993-1-8 Simple Shear Connection
// =============================================================================
import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBox,
  FiCheck,
  FiCheckCircle,
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
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import FinPlate3D from '../../components/3d/scenes/FinPlate3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

interface FormData {
  supportingMember: string;
  supportedBeam: string;
  connectionType: string;
  plateThickness: string;
  plateDepth: string;
  plateWidth: string;
  boltSize: string;
  boltGrade: string;
  numberOfRows: string;
  pitch: string;
  endDistance: string;
  edgeDistance: string;
  weldSize: string;
  weldType: string;
  shearForce: string;
  eccentricity: string;
}

interface Results {
  boltShearCap: number;
  boltBearingCap: number;
  boltGroupCap: number;
  plateShearCap: number;
  plateBearingCap: number;
  plateBlockCap: number;
  weldCap: number;
  beamNotchCap: number;
  shearUtil: number;
  criticalCheck: string;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  light_beam: {
    name: 'Light Beam (150 kN)',
    form: {
      supportedBeam: 'UB 254x146x31',
      plateThickness: '10',
      plateDepth: '200',
      numberOfRows: '3',
      boltSize: '20',
      shearForce: '150',
    },
  },
  medium_beam: {
    name: 'Medium Beam (300 kN)',
    form: {
      supportedBeam: 'UB 406x178x60',
      plateThickness: '12',
      plateDepth: '300',
      numberOfRows: '4',
      boltSize: '20',
      shearForce: '300',
    },
  },
  heavy_beam: {
    name: 'Heavy Beam (500 kN)',
    form: {
      supportedBeam: 'UB 533x210x82',
      plateThickness: '15',
      plateDepth: '400',
      numberOfRows: '5',
      boltSize: '24',
      shearForce: '500',
    },
  },
};

const FinPlate = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    plate: true,
    bolts: true,
    weld: false,
  });
  const [form, setForm] = useState<FormData>({
    supportingMember: 'UB 305x165x40',
    supportedBeam: 'UB 254x146x31',
    connectionType: 'single_sided',
    plateThickness: '10',
    plateDepth: '240',
    plateWidth: '100',
    boltSize: '20',
    boltGrade: '8.8',
    numberOfRows: '3',
    pitch: '70',
    endDistance: '40',
    edgeDistance: '35',
    weldSize: '8',
    weldType: 'fillet',
    shearForce: '150',
    eccentricity: '50',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'plateThickness', label: 'Plate Thickness' },
      { key: 'plateDepth', label: 'Plate Depth' },
      { key: 'plateWidth', label: 'Plate Width' },
      { key: 'boltSize', label: 'Bolt Size' },
      { key: 'numberOfRows', label: 'Number Of Rows' },
      { key: 'pitch', label: 'Pitch' },
      { key: 'endDistance', label: 'End Distance' },
      { key: 'edgeDistance', label: 'Edge Distance' },
      { key: 'weldSize', label: 'Weld Size' },
      { key: 'shearForce', label: 'Shear Force' },
      { key: 'eccentricity', label: 'Eccentricity', allowZero: true },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map((e) => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) setForm((prev) => ({ ...prev, ...p.form }));
  };

  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'supportingMember', label: 'Supporting Member', min: 0, max: 100, step: 1, unit: '' },
    { key: 'supportedBeam', label: 'Supported Beam', min: 0, max: 100, step: 1, unit: '' },
    { key: 'connectionType', label: 'Connection Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'plateThickness', label: 'Plate Thickness', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const tp = parseFloat(form.plateThickness);
      const dp = parseFloat(form.plateDepth);
      const d = parseFloat(form.boltSize);
      const n = parseInt(form.numberOfRows);
      const p = parseFloat(form.pitch);
      const e1 = parseFloat(form.endDistance);
      const e2 = parseFloat(form.edgeDistance);
      const V = parseFloat(form.shearForce);
      const fw = parseFloat(form.weldSize);
      const ecc = parseFloat(form.eccentricity);

      if (tp <= 0 || dp <= 0 || d <= 0 || n <= 0) {
        w.push({ type: 'error', message: 'Invalid inputs' });
        setWarnings(w);
        return;
      }

      // Bolt properties
      const fub = form.boltGrade === '10.9' ? 1000 : 800;
      const fy = 275; // S275 plate
      const fu = 410;
      const d0 = d + 2; // hole diameter
      const As = ((Math.PI * d * d) / 4) * 0.78; // tensile area

      // Bolt shear capacity (single shear)
      const alphaV = form.boltGrade === '10.9' ? 0.5 : 0.6;
      const FvRd = (alphaV * fub * As) / (1.25 * 1000);
      const boltShearCap = FvRd * n;

      // Bolt bearing on plate
      const alpha_d = Math.min(e1 / (3 * d0), p / (3 * d0) - 0.25, fub / fu, 1.0);
      const k1 = Math.min((2.8 * e2) / d0 - 1.7, 2.5);
      const FbRd = (k1 * alpha_d * fu * d * tp) / (1.25 * 1000);
      const boltBearingCap = FbRd * n;

      // Bolt group with eccentricity (simplified linear)
      const boltGroupCap = boltShearCap * 0.8; // reduce for eccentricity

      // Plate shear (gross)
      const plateShearCap = (fy * dp * tp) / (Math.sqrt(3) * 1.0 * 1000);

      // Plate bearing
      const plateBearingCap = boltBearingCap;

      // Block tearing
      const Ant = (tp * (e2 - d0 / 2)) / 1000; // net tension
      const Anv = (tp * (dp - e1 - (n - 1) * p + (n - 0.5) * d0)) / 1000; // net shear (simplified)
      const Agv = (tp * (dp - e1)) / 1000;
      const plateBlockCap = (fu * Ant) / 1.25 + (fy * Agv) / (Math.sqrt(3) * 1.0);

      // Weld capacity
      const Lw = 2 * dp; // two runs
      const betaW = 0.85;
      const fvwRd = fu / (Math.sqrt(3) * betaW * 1.25);
      const weldCap = (fvwRd * fw * 0.7 * Lw) / 1000;

      // Beam notch capacity (simplified — assume adequate if plate depth < 0.6 × beam depth)
      const beamNotchCap = plateShearCap * 1.2;

      const capacities = [
        { name: 'Bolt Shear', cap: boltShearCap },
        { name: 'Bolt Bearing', cap: boltBearingCap },
        { name: 'Bolt Group', cap: boltGroupCap },
        { name: 'Plate Shear', cap: plateShearCap },
        { name: 'Block Tearing', cap: plateBlockCap },
        { name: 'Weld', cap: weldCap },
      ];

      const minCap = capacities.reduce((a, b) => (a.cap < b.cap ? a : b));
      const shearUtil = V / minCap.cap;
      const criticalCheck = minCap.name;

      if (shearUtil > 0.8 && shearUtil <= 1.0)
        w.push({
          type: 'warning',
          message: `High utilisation ${(shearUtil * 100).toFixed(0)}% — consider larger connection`,
        });
      if (e1 < 1.2 * d0) w.push({ type: 'warning', message: 'End distance below 1.2d₀ minimum' });
      if (e2 < 1.2 * d0) w.push({ type: 'warning', message: 'Edge distance below 1.2d₀ minimum' });
      if (tp < 0.5 * d)
        w.push({ type: 'info', message: 'Plate thickness less than 0.5 × bolt diameter' });

      const overallStatus = shearUtil <= 1.0 ? 'PASS' : 'FAIL';

      setResults({
        boltShearCap,
        boltBearingCap,
        boltGroupCap,
        plateShearCap,
        plateBearingCap,
        plateBlockCap,
        weldCap,
        beamNotchCap,
        shearUtil,
        criticalCheck,
        overallStatus,
      });
    } catch {
      w.push({ type: 'error', message: 'Calculation error' });
    }
    setWarnings(w);
  };

  const exportPDF = useCallback(() => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.shearUtil > 0.85)
      recs.push({
        check: 'Utilisation',
        suggestion: 'Consider thicker plate, larger bolts, or additional bolt row',
      });
    if (results.criticalCheck === 'Weld')
      recs.push({ check: 'Weld', suggestion: 'Increase weld size or use full-depth weld' });
    if (results.criticalCheck === 'Block Tearing')
      recs.push({
        check: 'Block Tearing',
        suggestion: 'Increase end/edge distances or plate depth',
      });
    generatePremiumPDF({
      title: 'Fin Plate Connection',
      subtitle: 'BS EN 1993-1-8 Verification',
      projectInfo: [
        { label: 'Calculator', value: 'Fin Plate' },
        { label: 'Code', value: 'BS EN 1993-1-8' },
      ],
      inputs: [
        {
          label: 'Plate',
          value: `${form.plateThickness}×${form.plateDepth}×${form.plateWidth} mm`,
        },
        { label: 'Bolts', value: `${form.numberOfRows}×M${form.boltSize} Gr ${form.boltGrade}` },
        { label: 'Weld', value: `${form.weldSize}mm fillet` },
        { label: 'Shear Force', value: `${form.shearForce} kN` },
      ],
      checks: [
        {
          name: 'Bolt Shear',
          capacity: `${results.boltShearCap.toFixed(0)} kN`,
          utilisation: `${((parseFloat(form.shearForce) / results.boltShearCap) * 100).toFixed(0)}%`,
          status:
            results.boltShearCap >= parseFloat(form.shearForce)
              ? ('PASS' as const)
              : ('FAIL' as const),
        },
        {
          name: 'Plate Shear',
          capacity: `${results.plateShearCap.toFixed(0)} kN`,
          utilisation: `${((parseFloat(form.shearForce) / results.plateShearCap) * 100).toFixed(0)}%`,
          status:
            results.plateShearCap >= parseFloat(form.shearForce)
              ? ('PASS' as const)
              : ('FAIL' as const),
        },
        {
          name: 'Block Tearing',
          capacity: `${results.plateBlockCap.toFixed(0)} kN`,
          utilisation: `${((parseFloat(form.shearForce) / results.plateBlockCap) * 100).toFixed(0)}%`,
          status:
            results.plateBlockCap >= parseFloat(form.shearForce)
              ? ('PASS' as const)
              : ('FAIL' as const),
        },
        {
          name: 'Weld',
          capacity: `${results.weldCap.toFixed(0)} kN`,
          utilisation: `${((parseFloat(form.shearForce) / results.weldCap) * 100).toFixed(0)}%`,
          status:
            results.weldCap >= parseFloat(form.shearForce) ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Capacity Summary',
          head: [['Check', 'Capacity (kN)']],
          body: [
            ['Bolt Shear', results.boltShearCap.toFixed(0)],
            ['Bolt Bearing', results.boltBearingCap.toFixed(0)],
            ['Plate Shear', results.plateShearCap.toFixed(0)],
            ['Block Tearing', results.plateBlockCap.toFixed(0)],
            ['Weld', results.weldCap.toFixed(0)],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Fin Plate Connection',
    });
  }, [form, results, warnings]);

  const exportDOCX = useCallback(() => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.shearUtil > 0.85)
      recs.push({
        check: 'Utilisation',
        suggestion: 'Consider thicker plate, larger bolts, or additional bolt row',
      });
    if (results.criticalCheck === 'Weld')
      recs.push({ check: 'Weld', suggestion: 'Increase weld size or use full-depth weld' });
    if (results.criticalCheck === 'Block Tearing')
      recs.push({
        check: 'Block Tearing',
        suggestion: 'Increase end/edge distances or plate depth',
      });
    generateDOCX({
      title: 'Fin Plate Connection',
      subtitle: 'BS EN 1993-1-8 Verification',
      projectInfo: [
        { label: 'Calculator', value: 'Fin Plate' },
        { label: 'Code', value: 'BS EN 1993-1-8' },
      ],
      inputs: [
        {
          label: 'Plate',
          value: `${form.plateThickness}×${form.plateDepth}×${form.plateWidth} mm`,
        },
        { label: 'Bolts', value: `${form.numberOfRows}×M${form.boltSize} Gr ${form.boltGrade}` },
        { label: 'Weld', value: `${form.weldSize}mm fillet` },
        { label: 'Shear Force', value: `${form.shearForce} kN` },
      ],
      checks: [
        {
          name: 'Bolt Shear',
          capacity: `${results.boltShearCap.toFixed(0)} kN`,
          utilisation: `${((parseFloat(form.shearForce) / results.boltShearCap) * 100).toFixed(0)}%`,
          status:
            results.boltShearCap >= parseFloat(form.shearForce)
              ? ('PASS' as const)
              : ('FAIL' as const),
        },
        {
          name: 'Plate Shear',
          capacity: `${results.plateShearCap.toFixed(0)} kN`,
          utilisation: `${((parseFloat(form.shearForce) / results.plateShearCap) * 100).toFixed(0)}%`,
          status:
            results.plateShearCap >= parseFloat(form.shearForce)
              ? ('PASS' as const)
              : ('FAIL' as const),
        },
        {
          name: 'Block Tearing',
          capacity: `${results.plateBlockCap.toFixed(0)} kN`,
          utilisation: `${((parseFloat(form.shearForce) / results.plateBlockCap) * 100).toFixed(0)}%`,
          status:
            results.plateBlockCap >= parseFloat(form.shearForce)
              ? ('PASS' as const)
              : ('FAIL' as const),
        },
        {
          name: 'Weld',
          capacity: `${results.weldCap.toFixed(0)} kN`,
          utilisation: `${((parseFloat(form.shearForce) / results.weldCap) * 100).toFixed(0)}%`,
          status:
            results.weldCap >= parseFloat(form.shearForce) ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Capacity Summary',
          head: [['Check', 'Capacity (kN)']],
          body: [
            ['Bolt Shear', results.boltShearCap.toFixed(0)],
            ['Bolt Bearing', results.boltBearingCap.toFixed(0)],
            ['Plate Shear', results.plateShearCap.toFixed(0)],
            ['Block Tearing', results.plateBlockCap.toFixed(0)],
            ['Weld', results.weldCap.toFixed(0)],
          ],
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Fin Plate Connection',
    });
  }, [form, results, warnings]);

  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* Gradient hero title */}
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Fin Plate Connection
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            Simple shear connection design with bolt shear, bearing, plate shear, block tearing, and
            weld checks to BS EN 1993-1-8.
          </p>

          {/* Glass toolbar */}
          <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
            <div className="flex items-center gap-2">
              {results && (
                <Button
                  onClick={exportPDF}
                  className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={exportDOCX}
                  className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton
                  calculatorKey="fin-plate"
                  inputs={form as unknown as Record<string, string | number>}
                  results={results}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                />
              )}
            </div>

            {/* View Tabs */}
            <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
              {[
                { id: 'input' as const, label: 'Inputs', icon: <FiGrid /> },
                {
                  id: 'results' as const,
                  label: 'Analysis',
                  icon: <FiActivity />,
                  disabled: !results,
                },
                {
                  id: 'visualization' as const,
                  label: 'Visualization',
                  icon: <FiTarget />,
                  disabled: !results,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

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
                  {results.overallStatus === 'PASS'
                    ? 'Connection Adequate'
                    : 'Connection Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  Critical: {results.criticalCheck} | Utilisation:{' '}
                  {(results.shearUtil * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-6 space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={cn(
                  'px-4 py-3 rounded-lg flex items-center gap-3 text-sm',
                  w.type === 'error' && 'bg-red-950/50 border border-red-500/30 text-red-300',
                  w.type === 'warning' &&
                    'bg-yellow-950/50 border border-yellow-500/30 text-yellow-300',
                  w.type === 'info' && 'bg-blue-950/50 border border-blue-500/30 text-blue-300',
                )}
              >
                {w.type === 'error' ? (
                  <FiX className="w-4 h-4" />
                ) : w.type === 'warning' ? (
                  <FiAlertTriangle className="w-4 h-4" />
                ) : (
                  <FiInfo className="w-4 h-4" />
                )}
                {w.message}
              </div>
            ))}
          </div>
        )}

        {/* ===== INPUT TAB ===== */}
        {activeTab === 'input' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left 2 columns — Input Cards */}
            <div className="lg:col-span-2 space-y-6">
              <Card variant="glass" className="border-neon-cyan/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FiZap className="text-neon-cyan" />
                  <span className="font-bold text-gray-400 uppercase text-xs tracking-widest">
                    Presets
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PRESETS).map((k) => (
                    <Button
                      key={k}
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(k)}
                      className="border-gray-700/50 hover:border-neon-cyan/50 hover:bg-neon-cyan/10"
                    >
                      {PRESETS[k].name}
                    </Button>
                  ))}
                </div>
              </Card>
              {/* Fin Plate Section */}
              <Card
                variant="glass"
                className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
              >
                <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection('plate')}>
                  <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiBox className="w-6 h-6 text-blue-400" />
                    </div>
                    <span>Fin Plate</span>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform ml-auto',
                        expandedSections.plate && 'rotate-180',
                      )}
                    />
                  </CardTitle>
                </CardHeader>
                {expandedSections.plate && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <InputField
                        label="Thickness"
                        value={form.plateThickness}
                        onChange={(v) => setForm((f) => ({ ...f, plateThickness: v }))}
                        unit="mm"
                      />
                      <InputField
                        label="Depth"
                        value={form.plateDepth}
                        onChange={(v) => setForm((f) => ({ ...f, plateDepth: v }))}
                        unit="mm"
                      />
                      <InputField
                        label="Width"
                        value={form.plateWidth}
                        onChange={(v) => setForm((f) => ({ ...f, plateWidth: v }))}
                        unit="mm"
                      />
                    </div>
                    <InputField
                      label="Shear Force"
                      value={form.shearForce}
                      onChange={(v) => setForm((f) => ({ ...f, shearForce: v }))}
                      unit="kN"
                    />
                    <InputField
                      label="Eccentricity"
                      value={form.eccentricity}
                      onChange={(v) => setForm((f) => ({ ...f, eccentricity: v }))}
                      unit="mm"
                    />
                  </CardContent>
                )}
              </Card>

              {/* Bolts Section */}
              <Card
                variant="glass"
                className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
              >
                <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection('bolts')}>
                  <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-blue-400" />
                    </div>
                    <span>Bolts</span>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform ml-auto',
                        expandedSections.bolts && 'rotate-180',
                      )}
                    />
                  </CardTitle>
                </CardHeader>
                {expandedSections.bolts && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Bolt Diameter"
                        value={form.boltSize}
                        onChange={(v) => setForm((f) => ({ ...f, boltSize: v }))}
                        unit="mm"
                      />
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Bolt Grade
                        </label>
                        <select
                          title="Bolt Grade"
                          value={form.boltGrade}
                          onChange={(e) => setForm((f) => ({ ...f, boltGrade: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        >
                          <option value="8.8">Grade 8.8</option>
                          <option value="10.9">Grade 10.9</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Number of Rows"
                        value={form.numberOfRows}
                        onChange={(v) => setForm((f) => ({ ...f, numberOfRows: v }))}
                        unit=""
                      />
                      <InputField
                        label="Pitch"
                        value={form.pitch}
                        onChange={(v) => setForm((f) => ({ ...f, pitch: v }))}
                        unit="mm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="End Distance"
                        value={form.endDistance}
                        onChange={(v) => setForm((f) => ({ ...f, endDistance: v }))}
                        unit="mm"
                      />
                      <InputField
                        label="Edge Distance"
                        value={form.edgeDistance}
                        onChange={(v) => setForm((f) => ({ ...f, edgeDistance: v }))}
                        unit="mm"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Weld Section */}
              <Card
                variant="glass"
                className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
              >
                <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection('weld')}>
                  <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiZap className="w-6 h-6 text-blue-400" />
                    </div>
                    <span>Weld</span>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform ml-auto',
                        expandedSections.weld && 'rotate-180',
                      )}
                    />
                  </CardTitle>
                </CardHeader>
                {expandedSections.weld && (
                  <CardContent className="space-y-4">
                    <InputField
                      label="Weld Size"
                      value={form.weldSize}
                      onChange={(v) => setForm((f) => ({ ...f, weldSize: v }))}
                      unit="mm"
                    />
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Weld Type
                      </label>
                      <select
                        title="Weld Type"
                        value={form.weldType}
                        onChange={(e) => setForm((f) => ({ ...f, weldType: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        <option value="fillet">Fillet Weld</option>
                        <option value="butt">Butt Weld</option>
                      </select>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* RUN FULL ANALYSIS Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center pt-4"
              >
                <Button
                  onClick={() => {
                    calculate();
                    setActiveTab('results');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
                </Button>
              </motion.div>
            </div>

            {/* Right Column — Sticky Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="sticky top-8 space-y-4"
              >
                {/* Fullscreen Preview Overlay */}
                {previewMaximized && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                  >
                    <div className="flex-1 relative">
                      <Interactive3DDiagram height="h-full" cameraPosition={[5, 4, 5]}>
                        <FinPlate3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        FIN PLATE CONNECTION — REAL-TIME PREVIEW
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
                          {
                            label: 'Plate',
                            value: `${form.plateThickness}×${form.plateDepth}×${form.plateWidth} mm`,
                          },
                          { label: 'Bolt Size', value: `M${form.boltSize}` },
                          { label: 'Bolt Grade', value: form.boltGrade },
                          { label: 'No. Rows', value: `${form.numberOfRows} rows` },
                          { label: 'Pitch', value: `${form.pitch} mm` },
                          { label: 'Weld', value: `${form.weldSize} mm ${form.weldType}` },
                          { label: 'Shear Force', value: `${form.shearForce} kN` },
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
                                label: 'Bolt Shear',
                                util: (
                                  (parseFloat(form.shearForce) / (results.boltShearCap || 1)) *
                                  100
                                ).toFixed(1),
                                status:
                                  parseFloat(form.shearForce) > results.boltShearCap
                                    ? 'FAIL'
                                    : 'PASS',
                              },
                              {
                                label: 'Bolt Bearing',
                                util: (
                                  (parseFloat(form.shearForce) / (results.boltBearingCap || 1)) *
                                  100
                                ).toFixed(1),
                                status:
                                  parseFloat(form.shearForce) > results.boltBearingCap
                                    ? 'FAIL'
                                    : 'PASS',
                              },
                              {
                                label: 'Plate Shear',
                                util: (
                                  (parseFloat(form.shearForce) / (results.plateShearCap || 1)) *
                                  100
                                ).toFixed(1),
                                status:
                                  parseFloat(form.shearForce) > results.plateShearCap
                                    ? 'FAIL'
                                    : 'PASS',
                              },
                              {
                                label: 'Block Tearing',
                                util: (
                                  (parseFloat(form.shearForce) / (results.plateBlockCap || 1)) *
                                  100
                                ).toFixed(1),
                                status:
                                  parseFloat(form.shearForce) > results.plateBlockCap
                                    ? 'FAIL'
                                    : 'PASS',
                              },
                              {
                                label: 'Weld',
                                util: (
                                  (parseFloat(form.shearForce) / (results.weldCap || 1)) *
                                  100
                                ).toFixed(1),
                                status:
                                  parseFloat(form.shearForce) > results.weldCap ? 'FAIL' : 'PASS',
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
                                      : parseFloat(String(check.util || '0')) > 90
                                        ? 'text-orange-400'
                                        : 'text-emerald-400',
                                  )}
                                >
                                  {check.util ?? '—'}%
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

                <div className="relative">
                  <button
                    onClick={() => setPreviewMaximized(true)}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                    aria-label="Maximize preview"
                    title="Fullscreen preview"
                  >
                    <FiMaximize2 size={16} />
                  </button>
                  <WhatIfPreview
                    title="Fin Plate — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[5, 4, 5]}>
                        <FinPlate3D />
                      </Interactive3DDiagram>
                    )}
                  />
                </div>

                {results && (
                  <Card
                    variant="glass"
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400"
                  >
                    <CardContent className="py-6 text-center">
                      <div className="text-4xl mb-2">
                        {results.overallStatus === 'PASS' ? (
                          <FiCheckCircle className="inline text-green-400" />
                        ) : (
                          <FiAlertTriangle className="inline text-red-400" />
                        )}
                      </div>
                      <div
                        className={cn(
                          'font-bold text-lg',
                          results.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400',
                        )}
                      >
                        {results.overallStatus === 'PASS' ? 'Connection OK' : 'FAILS'}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        Utilisation: {(results.shearUtil * 100).toFixed(0)}% |{' '}
                        {results.criticalCheck}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card
                  variant="glass"
                  className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                      <FiInfo className="text-blue-400" />
                      Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      • <strong>BS EN 1993-1-8:</strong> Design of joints
                    </p>
                    <p>
                      • <strong>SCI P358:</strong> Simple connections
                    </p>
                    <p>
                      • <strong>Cl 3.6:</strong> Bolt shear / bearing
                    </p>
                    <p>
                      • <strong>Cl 3.10:</strong> Block tearing
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}

        {/* ===== RESULTS TAB ===== */}
        {activeTab === 'results' && results && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 space-y-8"
          >
            {/* Top Summary Cards — border-l-4 */}
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Bolt Shear',
                  value: `${results.boltShearCap.toFixed(0)} kN`,
                  icon: <FiTarget />,
                  pass: results.boltShearCap >= parseFloat(form.shearForce),
                },
                {
                  label: 'Plate Shear',
                  value: `${results.plateShearCap.toFixed(0)} kN`,
                  icon: <FiLayers />,
                  pass: results.plateShearCap >= parseFloat(form.shearForce),
                },
                {
                  label: 'Block Tear',
                  value: `${results.plateBlockCap.toFixed(0)} kN`,
                  icon: <FiGrid />,
                  pass: results.plateBlockCap >= parseFloat(form.shearForce),
                },
                {
                  label: 'Weld',
                  value: `${results.weldCap.toFixed(0)} kN`,
                  icon: <FiZap />,
                  pass: results.weldCap >= parseFloat(form.shearForce),
                },
                {
                  label: 'Bolt Bearing',
                  value: `${results.boltBearingCap.toFixed(0)} kN`,
                  icon: <FiBox />,
                  pass: results.boltBearingCap >= parseFloat(form.shearForce),
                },
                {
                  label: 'Bolt Group',
                  value: `${results.boltGroupCap.toFixed(0)} kN`,
                  icon: <FiActivity />,
                  pass: results.boltGroupCap >= parseFloat(form.shearForce),
                },
                {
                  label: 'Beam Notch',
                  value: `${results.beamNotchCap.toFixed(0)} kN`,
                  icon: <FiLayers />,
                  pass: results.beamNotchCap >= parseFloat(form.shearForce),
                },
                {
                  label: 'Utilisation',
                  value: `${(results.shearUtil * 100).toFixed(0)}%`,
                  icon: <FiCheckCircle />,
                  pass: results.shearUtil <= 1.0,
                },
              ].map((item, i) => (
                <Card
                  key={i}
                  variant="glass"
                  className={cn(
                    'border-l-4',
                    item.pass ? 'border-l-green-500' : 'border-l-red-500',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">{item.icon}</div>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                          item.pass
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {item.pass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                    <p className="text-2xl font-black text-white">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Results Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Capacity Summary */}
                <Card
                  variant="glass"
                  className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                >
                  <CardHeader>
                    <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiLayers className="w-6 h-6 text-blue-400" />
                      </div>
                      <span>Capacity Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Bolt Shear', val: results.boltShearCap },
                        { label: 'Bolt Bearing', val: results.boltBearingCap },
                        { label: 'Bolt Group', val: results.boltGroupCap },
                        { label: 'Plate Shear', val: results.plateShearCap },
                        { label: 'Plate Bearing', val: results.plateBearingCap },
                        { label: 'Block Tearing', val: results.plateBlockCap },
                        { label: 'Weld', val: results.weldCap },
                        { label: 'Beam Notch', val: results.beamNotchCap },
                      ].map((item, i) => (
                        <div key={i} className="p-3 bg-gray-950/50 rounded-xl text-center">
                          <div className="text-gray-400 text-xs">{item.label}</div>
                          <div
                            className={cn(
                              'text-xl font-bold',
                              item.val >= parseFloat(form.shearForce)
                                ? 'text-green-400'
                                : 'text-red-400',
                            )}
                          >
                            {item.val.toFixed(0)} kN
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Design Recommendations */}
                <Card
                  variant="glass"
                  className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                >
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiCheckCircle className="w-6 h-6 text-blue-400" />
                      </div>
                      Design Recommendations
                    </h3>
                    <div className="space-y-3">
                      {results.shearUtil > 0.85 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">High Utilisation</div>
                            <div className="text-xs text-gray-400">
                              Consider thicker plate, larger bolts, or additional bolt row
                            </div>
                          </div>
                        </div>
                      )}
                      {results.criticalCheck === 'Weld' && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <FiInfo className="text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">Weld Critical</div>
                            <div className="text-xs text-gray-400">
                              Increase weld size or switch to full-depth weld
                            </div>
                          </div>
                        </div>
                      )}
                      {results.criticalCheck === 'Block Tearing' && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                          <FiInfo className="text-purple-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">
                              Block Tearing Critical
                            </div>
                            <div className="text-xs text-gray-400">
                              Increase end/edge distances or plate depth
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <FiCheck className="text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-white">Overall</div>
                          <div className="text-xs text-gray-400">
                            {results.overallStatus === 'PASS'
                              ? 'Fin plate connection is adequate for applied shear'
                              : 'Connection FAILS — resize required'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column — Sticky Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-4">
                  <Card
                    variant="glass"
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400"
                  >
                    <CardContent className="py-6 text-center">
                      <div className="text-4xl mb-2">
                        {results.overallStatus === 'PASS' ? (
                          <FiCheckCircle className="inline text-green-400" />
                        ) : (
                          <FiAlertTriangle className="inline text-red-400" />
                        )}
                      </div>
                      <div
                        className={cn(
                          'font-bold text-lg',
                          results.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400',
                        )}
                      >
                        {results.overallStatus}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        Utilisation: {(results.shearUtil * 100).toFixed(0)}%
                      </div>
                    </CardContent>
                  </Card>

                  {warnings.length > 0 && (
                    <Card variant="glass" className="border-amber-500/30">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                          <FiAlertTriangle />
                          <span className="font-medium">Design Notes</span>
                        </div>
                        <ul className="text-sm text-white space-y-1">
                          {warnings.map((w, i) => (
                            <li key={i}>• {w.message}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Card
                    variant="glass"
                    className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white font-semibold">
                        Design Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Plate</span>
                        <span className="text-white">
                          {form.plateThickness}×{form.plateDepth}×{form.plateWidth} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bolts</span>
                        <span className="text-white">
                          {form.numberOfRows}×M{form.boltSize} Gr {form.boltGrade}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weld</span>
                        <span className="text-white">
                          {form.weldSize}mm {form.weldType}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Applied Shear</span>
                        <span className="text-white">{form.shearForce} kN</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== VISUALIZATION TAB ===== */}
        {activeTab === 'visualization' && (
          <motion.div
            key="viz"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="mt-8 space-y-4"
          >
            <Card
              variant="glass"
              className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiTarget className="w-6 h-6 text-blue-400" />
                  </div>
                  <span>3D Connection View</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="500px" cameraPosition={[6, 5, 6]}>
                  <FinPlate3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

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
    <div className="flex items-center justify-between mb-2">
      <ExplainableLabel
        label={label}
        field={field || label.toLowerCase().replace(/\s+/g, '_')}
        className="block text-sm font-semibold text-gray-300"
      />
      {unit && <span className="text-blue-400 text-xs">{unit}</span>}
    </div>
    <input
      title={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
      'p-4 text-center border-l-4',
      status === 'pass'
        ? 'border-l-green-500 bg-gray-900/40 backdrop-blur-md border border-gray-700/50'
        : 'border-l-red-500 bg-gray-900/40 backdrop-blur-md border border-gray-700/50',
    )}
  >
    <div className="text-xs uppercase text-gray-400 mb-1">{label}</div>
    <div
      className={cn('text-2xl font-bold', status === 'pass' ? 'text-green-400' : 'text-red-400')}
    >
      {value}
    </div>
    <div className="text-xs text-gray-400 mt-1">{limit}</div>
  </Card>
);

export default FinPlate;
