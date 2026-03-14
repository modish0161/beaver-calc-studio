// =============================================================================
// BeaverCalc Studio — RC Slab Calculator
// BS EN 1992-1-1 One-Way / Two-Way Slab Design
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
  FiMaximize2,
  FiMinimize2,
  FiSliders,
  FiTool,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import RCSlab3D from '../../components/3d/scenes/RCSlab3D';
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
  slabType: string;
  spanX: string;
  spanY: string;
  thickness: string;
  concreteGrade: string;
  steelGrade: string;
  cover: string;
  mainBarDia: string;
  distBarDia: string;
  mainBarSpacing: string;
  distBarSpacing: string;
  deadLoad: string;
  imposedLoad: string;
  partitionLoad: string;
  finishesLoad: string;
  supportCondition: string;
}

interface Results {
  selfWeight: number;
  totalULS: number;
  totalSLS: number;
  spanRatio: number;
  slabClass: string;
  MEdX: number;
  MEdY: number;
  AsReqX: number;
  AsReqY: number;
  AsProvX: number;
  AsProvY: number;
  utilX: number;
  utilY: number;
  punchingCheck: number;
  deflectionRatio: number;
  deflectionOk: boolean;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  one_way_office: {
    name: 'One-Way Office Slab',
    form: {
      slabType: 'one_way',
      spanX: '5.0',
      thickness: '175',
      concreteGrade: '30',
      mainBarDia: '12',
      mainBarSpacing: '200',
      imposedLoad: '2.5',
      supportCondition: 'simply_supported',
    },
  },
  two_way_residential: {
    name: 'Two-Way Residential',
    form: {
      slabType: 'two_way',
      spanX: '6.0',
      spanY: '5.0',
      thickness: '225',
      concreteGrade: '30',
      mainBarDia: '16',
      mainBarSpacing: '150',
      imposedLoad: '2.5',
      supportCondition: 'simply_supported',
    },
  },
  heavy_industrial: {
    name: 'Heavy Industrial Slab',
    form: {
      slabType: 'two_way',
      spanX: '8.0',
      spanY: '7.0',
      thickness: '300',
      concreteGrade: '35',
      mainBarDia: '20',
      mainBarSpacing: '125',
      imposedLoad: '5.0',
      supportCondition: 'continuous',
    },
  },
};

const RCSlab = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    material: true,
    loading: false,
  });
  const [form, setForm] = useState<FormData>({
    slabType: 'two_way',
    spanX: '6.0',
    spanY: '5.0',
    thickness: '225',
    concreteGrade: '30',
    steelGrade: '500',
    cover: '25',
    mainBarDia: '16',
    distBarDia: '12',
    mainBarSpacing: '150',
    distBarSpacing: '200',
    deadLoad: '1.5',
    imposedLoad: '2.5',
    partitionLoad: '1.0',
    finishesLoad: '1.0',
    supportCondition: 'simply_supported',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'spanX', label: 'Span X' },
      { key: 'spanY', label: 'Span Y' },
      { key: 'thickness', label: 'Thickness' },
      { key: 'cover', label: 'Cover' },
      { key: 'mainBarDia', label: 'Main Bar Dia' },
      { key: 'distBarDia', label: 'Dist Bar Dia' },
      { key: 'mainBarSpacing', label: 'Main Bar Spacing' },
      { key: 'distBarSpacing', label: 'Dist Bar Spacing' },
      { key: 'deadLoad', label: 'Dead Load' },
      { key: 'imposedLoad', label: 'Imposed Load' },
      { key: 'partitionLoad', label: 'Partition Load' },
      { key: 'finishesLoad', label: 'Finishes Load' },
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
    { key: 'slabType', label: 'Slab Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'spanX', label: 'Span X', min: 0, max: 100, step: 1, unit: '' },
    { key: 'spanY', label: 'Span Y', min: 0, max: 100, step: 1, unit: '' },
    { key: 'thickness', label: 'Thickness', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const lx = parseFloat(form.spanX) * 1000;
      const ly = parseFloat(form.spanY) * 1000;
      const h = parseFloat(form.thickness);
      const fck = parseFloat(form.concreteGrade);
      const fyk = parseFloat(form.steelGrade);
      const cov = parseFloat(form.cover);
      const dMain = parseFloat(form.mainBarDia);
      const dDist = parseFloat(form.distBarDia);
      const sMain = parseFloat(form.mainBarSpacing);
      const sDist = parseFloat(form.distBarSpacing);
      const gk_extra = parseFloat(form.deadLoad);
      const qk = parseFloat(form.imposedLoad);
      const part = parseFloat(form.partitionLoad);
      const fin = parseFloat(form.finishesLoad);

      if (lx <= 0 || ly <= 0 || h <= 0) {
        w.push({ type: 'error', message: 'Invalid geometry' });
        setWarnings(w);
        return;
      }

      // Self-weight
      const selfWeight = (25 * h) / 1000; // kN/m²
      const gk = selfWeight + gk_extra + part + fin;
      const totalULS = 1.35 * gk + 1.5 * qk;
      const totalSLS = gk + qk;

      // Span ratio
      const spanRatio = ly / lx;
      const isOneWay = form.slabType === 'one_way' || spanRatio > 2;
      const slabClass = isOneWay ? 'One-Way' : 'Two-Way';

      // Effective depth
      const d = h - cov - dMain / 2;
      const d2 = h - cov - dMain - dDist / 2;

      // Bending moments (per m width)
      let MEdX: number, MEdY: number;
      if (isOneWay) {
        MEdX = (totalULS * lx * lx) / (8 * 1e6); // simply supported
        MEdY = 0.2 * MEdX; // distribution steel
      } else {
        // Simplified Hillerborg strip — two-way
        const alpha_sx = form.supportCondition === 'simply_supported' ? 0.062 : 0.042;
        const alpha_sy = form.supportCondition === 'simply_supported' ? 0.062 : 0.042;
        MEdX = (alpha_sx * totalULS * lx * lx) / 1e6;
        MEdY = ((alpha_sy * totalULS * ly * ly) / 1e6) * (lx / ly) * (lx / ly); // adjusted
      }

      // Design strengths
      const fcd = (0.85 * fck) / 1.5;
      const fyd = fyk / 1.15;

      // Required reinforcement per m width
      const K_x = (MEdX * 1e6) / (1000 * d * d * fcd);
      const z_x = d * Math.min(0.5 + Math.sqrt(0.25 - K_x / 1.134), 0.95);
      const AsReqX = (MEdX * 1e6) / (fyd * z_x);

      const K_y = (MEdY * 1e6) / (1000 * d2 * d2 * fcd);
      const z_y = d2 * Math.min(0.5 + Math.sqrt(0.25 - Math.max(K_y, 0) / 1.134), 0.95);
      const AsReqY = MEdY > 0 ? (MEdY * 1e6) / (fyd * z_y) : 0;

      // Provided reinforcement per m width
      const AsProvX = ((Math.PI * dMain * dMain) / 4) * (1000 / sMain);
      const AsProvY = ((Math.PI * dDist * dDist) / 4) * (1000 / sDist);

      const utilX = AsReqX / AsProvX;
      const utilY = AsReqY > 0 ? AsReqY / AsProvY : 0;

      // Minimum reinforcement
      const AsMin = ((0.26 * (0.3 * Math.pow(fck, 2 / 3))) / fyk) * 1000 * d;
      if (AsProvX < AsMin) w.push({ type: 'warning', message: 'Main steel below EC2 minimum' });

      // Deflection check (span/depth)
      const rho = AsProvX / (1000 * d);
      const rho0 = Math.sqrt(fck) / 1000;
      let basicRatio = form.supportCondition === 'simply_supported' ? 20 : 26;
      const deflectionRatio = basicRatio * (rho0 / rho) * 0.8;
      const actualRatio = lx / d;
      const deflectionOk = actualRatio <= deflectionRatio;

      if (!deflectionOk)
        w.push({
          type: 'warning',
          message: `l/d = ${actualRatio.toFixed(0)} exceeds limit ${deflectionRatio.toFixed(0)}`,
        });

      const punchingCheck = 0; // N/A for typical slabs without point loads

      const overallStatus =
        utilX <= 1.0 && (utilY <= 1.0 || AsReqY === 0) && deflectionOk ? 'PASS' : 'FAIL';

      setResults({
        selfWeight,
        totalULS,
        totalSLS,
        spanRatio,
        slabClass,
        MEdX,
        MEdY,
        AsReqX,
        AsReqY,
        AsProvX,
        AsProvY,
        utilX,
        utilY,
        punchingCheck,
        deflectionRatio,
        deflectionOk,
        overallStatus,
      });
    } catch {
      w.push({ type: 'error', message: 'Calculation error' });
    }
    setWarnings(w);
  };

  useEffect(() => {
    calculate();
  }, [form]);

  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'RC Slab Design',
      subtitle: 'BS EN 1992-1-1',
      projectInfo: [{ label: 'Calculator', value: 'RC Slab' }],
      inputs: [
        { label: 'Slab Type', value: results.slabClass },
        { label: 'Span X', value: form.spanX, unit: 'm' },
        { label: 'Span Y', value: form.spanY, unit: 'm' },
        { label: 'Thickness', value: form.thickness, unit: 'mm' },
        { label: 'Concrete fck', value: form.concreteGrade, unit: 'MPa' },
        { label: 'Main Bars', value: `T${form.mainBarDia}@${form.mainBarSpacing}` },
        { label: 'Dist Bars', value: `T${form.distBarDia}@${form.distBarSpacing}` },
        { label: 'Imposed Load', value: form.imposedLoad, unit: 'kN/m²' },
      ],
      checks: [
        {
          name: 'Bending X',
          capacity: `AsReq=${results.AsReqX.toFixed(0)}mm²/m`,
          utilisation: `${(results.utilX * 100).toFixed(0)}%`,
          status: results.utilX <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Bending Y',
          capacity: `AsReq=${results.AsReqY.toFixed(0)}mm²/m`,
          utilisation: `${(results.utilY * 100).toFixed(0)}%`,
          status: results.utilY <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Deflection',
          capacity: `l/d=${results.deflectionRatio.toFixed(0)}`,
          utilisation: results.deflectionOk ? 'OK' : 'FAIL',
          status: results.deflectionOk ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Loading Summary',
          head: [['Parameter', 'Value']],
          body: [
            ['Self-weight', `${results.selfWeight.toFixed(1)} kN/m²`],
            ['ULS Load', `${results.totalULS.toFixed(1)} kN/m²`],
            ['SLS Load', `${results.totalSLS.toFixed(1)} kN/m²`],
            ['Span Ratio', results.spanRatio.toFixed(2)],
          ],
        },
        {
          title: 'Reinforcement Summary',
          head: [['Direction', 'MEdkNm/m', 'AsReq mm²/m', 'AsProv mm²/m', 'Util']],
          body: [
            [
              'X (main)',
              results.MEdX.toFixed(1),
              results.AsReqX.toFixed(0),
              results.AsProvX.toFixed(0),
              `${(results.utilX * 100).toFixed(0)}%`,
            ],
            [
              'Y (dist)',
              results.MEdY.toFixed(1),
              results.AsReqY.toFixed(0),
              results.AsProvY.toFixed(0),
              `${(results.utilY * 100).toFixed(0)}%`,
            ],
          ],
        },
      ],
      recommendations: [
        ...(results.utilX > 0.85
          ? [
              {
                check: 'High Bending X',
                suggestion: `${(results.utilX * 100).toFixed(0)}% — consider increasing thickness or bar size`,
              },
            ]
          : []),
        ...(!results.deflectionOk
          ? [
              {
                check: 'Deflection Limit',
                suggestion: 'Increase slab thickness or add compression steel',
              },
            ]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.overallStatus === 'PASS' ? 'All checks satisfied per EC2' : 'Design inadequate',
        },
      ],
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — RC Slab Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'RC Slab Design',
      subtitle: 'BS EN 1992-1-1',
      projectInfo: [{ label: 'Calculator', value: 'RC Slab' }],
      inputs: [
        { label: 'Slab Type', value: results.slabClass },
        { label: 'Span X', value: form.spanX, unit: 'm' },
        { label: 'Span Y', value: form.spanY, unit: 'm' },
        { label: 'Thickness', value: form.thickness, unit: 'mm' },
        { label: 'Concrete fck', value: form.concreteGrade, unit: 'MPa' },
        { label: 'Main Bars', value: `T${form.mainBarDia}@${form.mainBarSpacing}` },
        { label: 'Dist Bars', value: `T${form.distBarDia}@${form.distBarSpacing}` },
        { label: 'Imposed Load', value: form.imposedLoad, unit: 'kN/m²' },
      ],
      checks: [
        {
          name: 'Bending X',
          capacity: `AsReq=${results.AsReqX.toFixed(0)}mm²/m`,
          utilisation: `${(results.utilX * 100).toFixed(0)}%`,
          status: results.utilX <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Bending Y',
          capacity: `AsReq=${results.AsReqY.toFixed(0)}mm²/m`,
          utilisation: `${(results.utilY * 100).toFixed(0)}%`,
          status: results.utilY <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Deflection',
          capacity: `l/d=${results.deflectionRatio.toFixed(0)}`,
          utilisation: results.deflectionOk ? 'OK' : 'FAIL',
          status: results.deflectionOk ? ('PASS' as const) : ('FAIL' as const),
        },
      ],
      sections: [
        {
          title: 'Loading Summary',
          head: [['Parameter', 'Value']],
          body: [
            ['Self-weight', `${results.selfWeight.toFixed(1)} kN/m²`],
            ['ULS Load', `${results.totalULS.toFixed(1)} kN/m²`],
            ['SLS Load', `${results.totalSLS.toFixed(1)} kN/m²`],
            ['Span Ratio', results.spanRatio.toFixed(2)],
          ],
        },
        {
          title: 'Reinforcement Summary',
          head: [['Direction', 'MEdkNm/m', 'AsReq mm²/m', 'AsProv mm²/m', 'Util']],
          body: [
            [
              'X (main)',
              results.MEdX.toFixed(1),
              results.AsReqX.toFixed(0),
              results.AsProvX.toFixed(0),
              `${(results.utilX * 100).toFixed(0)}%`,
            ],
            [
              'Y (dist)',
              results.MEdY.toFixed(1),
              results.AsReqY.toFixed(0),
              results.AsProvY.toFixed(0),
              `${(results.utilY * 100).toFixed(0)}%`,
            ],
          ],
        },
      ],
      recommendations: [
        ...(results.utilX > 0.85
          ? [
              {
                check: 'High Bending X',
                suggestion: `${(results.utilX * 100).toFixed(0)}% — consider increasing thickness or bar size`,
              },
            ]
          : []),
        ...(!results.deflectionOk
          ? [
              {
                check: 'Deflection Limit',
                suggestion: 'Increase slab thickness or add compression steel',
              },
            ]
          : []),
        {
          check: 'Overall',
          suggestion:
            results.overallStatus === 'PASS' ? 'All checks satisfied per EC2' : 'Design inadequate',
        },
      ],
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — RC Slab Design',
    });
  };

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
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-800/20 via-transparent to-gray-900/10" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-cyan-500/30 mb-4 bg-cyan-950/20">
            <span className="text-cyan-100 font-mono tracking-wider">CONCRETE | RC SLAB</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
            RC Slab Design
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            One-way and two-way reinforced concrete slab with bending, reinforcement, and deflection
            checks to BS EN 1992-1-1.
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button
            onClick={exportPDF}
            disabled={!results}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm px-4 py-2 rounded-lg"
          >
            <FiDownload className="mr-2 w-4 h-4" />
            PDF Report
          </Button>
          <Button
            onClick={exportDOCX}
            disabled={!results}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm px-4 py-2 rounded-lg"
          >
            <FiDownload className="mr-2 w-4 h-4" />
            DOCX Report
          </Button>
        </div>

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
              {tab === 'input' ? '📐 Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
            </Button>
          ))}
        </div>

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
                  {results.overallStatus === 'PASS' ? 'Slab Adequate' : 'Slab Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  {results.slabClass} | ULS = {results.totalULS.toFixed(1)} kN/m²
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={exportPDF} className="bg-gradient-to-r from-cyan-600 to-blue-600">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <Button onClick={exportDOCX} className="bg-gradient-to-r from-cyan-600 to-blue-600">
                <FiDownload className="mr-2" />
                Export Report
              </Button>
              <SaveRunButton
                calculatorKey="rc-slab"
                inputs={form as unknown as Record<string, string | number>}
                results={results}
                status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
              />
            </div>
          </motion.div>
        )}

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

        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-1 space-y-4">
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
                <Card variant="glass" className="border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('geometry')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiGrid className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Slab Geometry</CardTitle>
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
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Slab Type
                          </label>
                          <select
                            title="Slab Type"
                            value={form.slabType}
                            onChange={(e) => setForm((f) => ({ ...f, slabType: e.target.value }))}
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          >
                            <option value="one_way">One-Way</option>
                            <option value="two_way">Two-Way</option>
                            <option value="flat_slab">Flat Slab</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Span X"
                            value={form.spanX}
                            onChange={(v) => setForm((f) => ({ ...f, spanX: v }))}
                            unit="m"
                          />
                          <InputField
                            label="Span Y"
                            value={form.spanY}
                            onChange={(v) => setForm((f) => ({ ...f, spanY: v }))}
                            unit="m"
                          />
                        </div>
                        <InputField
                          label="Thickness"
                          value={form.thickness}
                          onChange={(v) => setForm((f) => ({ ...f, thickness: v }))}
                          unit="mm"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-blue-500/20 shadow-lg shadow-blue-500/5">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('material')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiTool className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Reinforcement</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.material && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.material && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="fck"
                            value={form.concreteGrade}
                            onChange={(v) => setForm((f) => ({ ...f, concreteGrade: v }))}
                            unit="MPa"
                          />
                          <InputField
                            label="Cover"
                            value={form.cover}
                            onChange={(v) => setForm((f) => ({ ...f, cover: v }))}
                            unit="mm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Main Ø"
                            value={form.mainBarDia}
                            onChange={(v) => setForm((f) => ({ ...f, mainBarDia: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="@ spacing"
                            value={form.mainBarSpacing}
                            onChange={(v) => setForm((f) => ({ ...f, mainBarSpacing: v }))}
                            unit="mm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Dist Ø"
                            value={form.distBarDia}
                            onChange={(v) => setForm((f) => ({ ...f, distBarDia: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="@ spacing"
                            value={form.distBarSpacing}
                            onChange={(v) => setForm((f) => ({ ...f, distBarSpacing: v }))}
                            unit="mm"
                          />
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-red-500/20 shadow-lg shadow-red-500/5">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('loading')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiZap className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Loading</CardTitle>
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
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="SDL"
                          value={form.deadLoad}
                          onChange={(v) => setForm((f) => ({ ...f, deadLoad: v }))}
                          unit="kN/m²"
                        />
                        <InputField
                          label="Imposed"
                          value={form.imposedLoad}
                          onChange={(v) => setForm((f) => ({ ...f, imposedLoad: v }))}
                          unit="kN/m²"
                        />
                        <InputField
                          label="Partitions"
                          value={form.partitionLoad}
                          onChange={(v) => setForm((f) => ({ ...f, partitionLoad: v }))}
                          unit="kN/m²"
                        />
                        <InputField
                          label="Finishes"
                          value={form.finishesLoad}
                          onChange={(v) => setForm((f) => ({ ...f, finishesLoad: v }))}
                          unit="kN/m²"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <button
                  onClick={calculate}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  ▶ RUN FULL ANALYSIS
                </button>
              </div>
              <div className="lg:col-span-2 space-y-6">
                {/* Fullscreen Preview Overlay */}
                {previewMaximized && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
                  >
                    <div className="flex-1 relative">
                      <Interactive3DDiagram height="h-full" cameraPosition={[8, 5, 8]}>
                        <RCSlab3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        RC SLAB — REAL-TIME PREVIEW
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
                          { label: 'Span X', value: `${form.spanX} m` },
                          { label: 'Span Y', value: `${form.spanY} m` },
                          { label: 'Thickness', value: `${form.thickness} mm` },
                          { label: 'Concrete', value: `C${form.concreteGrade}` },
                          { label: 'Dead Load', value: `${form.deadLoad} kN/m²` },
                          { label: 'Imposed Load', value: `${form.imposedLoad} kN/m²` },
                          {
                            label: 'Main Bar',
                            value: `T${form.mainBarDia}@${form.mainBarSpacing}`,
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="flex justify-between text-xs py-1 border-b border-gray-800/50"
                          >
                            <span className="text-gray-500">{stat.label}</span>
                            <span className="text-white font-medium">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                      {results && (
                        <div className="mt-3 space-y-1">
                          <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                            Last Analysis
                          </div>
                          {[
                            {
                              label: 'Bending X',
                              util: (results.utilX * 100).toFixed(1),
                              status: results.utilX <= 1 ? 'PASS' : 'FAIL',
                            },
                            {
                              label: 'Bending Y',
                              util: (results.utilY * 100).toFixed(1),
                              status: results.utilY <= 1 ? 'PASS' : 'FAIL',
                            },
                            {
                              label: 'Deflection',
                              util: results.deflectionOk ? '—' : '100',
                              status: results.deflectionOk ? 'PASS' : 'FAIL',
                            },
                          ].map((check) => (
                            <div key={check.label} className="flex justify-between text-xs py-0.5">
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
                                {check.util === '—' ? 'OK' : `${check.util}%`}
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
                    title="RC Slab — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 5, 8]}>
                        <RCSlab3D />
                      </Interactive3DDiagram>
                    )}
                  />
                </div>
                {results && (
                  <div className="sticky top-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <ResultCard
                        label="Bending X"
                        value={`${(results.utilX * 100).toFixed(0)}%`}
                        limit={`MEdX=${results.MEdX.toFixed(1)} kNm/m`}
                        status={results.utilX <= 1 ? 'pass' : 'fail'}
                      />
                      <ResultCard
                        label="Bending Y"
                        value={`${(results.utilY * 100).toFixed(0)}%`}
                        limit={`MEdY=${results.MEdY.toFixed(1)} kNm/m`}
                        status={results.utilY <= 1 ? 'pass' : 'fail'}
                      />
                      <ResultCard
                        label="AsReq X"
                        value={`${results.AsReqX.toFixed(0)} mm²/m`}
                        limit={`Prov: ${results.AsProvX.toFixed(0)}`}
                        status={results.AsProvX >= results.AsReqX ? 'pass' : 'fail'}
                      />
                      <ResultCard
                        label="Deflection"
                        value={results.deflectionOk ? 'OK' : 'FAIL'}
                        limit={`L/d limit: ${results.deflectionRatio.toFixed(0)}`}
                        status={results.deflectionOk ? 'pass' : 'fail'}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card
                variant="glass"
                className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
              >
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {[
                      ['Self-weight', `${results.selfWeight.toFixed(1)} kN/m²`],
                      ['ULS Load', `${results.totalULS.toFixed(1)} kN/m²`],
                      ['SLS Load', `${results.totalSLS.toFixed(1)} kN/m²`],
                      ['Span Ratio', results.spanRatio.toFixed(2)],
                      ['MEdX', `${results.MEdX.toFixed(1)} kNm/m`],
                      ['MEdY', `${results.MEdY.toFixed(1)} kNm/m`],
                      ['AsReqX', `${results.AsReqX.toFixed(0)} mm²/m`],
                      ['AsProvX', `${results.AsProvX.toFixed(0)} mm²/m`],
                    ].map(([l, v], i) => (
                      <div key={i} className="bg-black/30 rounded-lg p-3">
                        <div className="text-gray-500 text-xs uppercase mb-1">{l}</div>
                        <div className="text-white font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass" className="border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                <CardHeader className="py-3">
                  <CardTitle className="text-white font-semibold">Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {results.utilX > 0.85 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-950/30 border border-yellow-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-yellow-300 text-xs font-semibold">
                          High Bending Utilisation
                        </div>
                        <div className="text-gray-400 text-xs">
                          {(results.utilX * 100).toFixed(0)}% — consider increasing slab thickness
                          or bar size
                        </div>
                      </div>
                    </div>
                  )}
                  {!results.deflectionOk && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-red-950/30 border border-red-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-red-300 text-xs font-semibold">
                          Deflection Exceeds Limit
                        </div>
                        <div className="text-gray-400 text-xs">
                          Increase slab thickness or add compression steel
                        </div>
                      </div>
                    </div>
                  )}
                  {results.spanRatio > 2 && form.slabType === 'two_way' && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-950/30 border border-blue-500/20">
                      <FiInfo className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-blue-300 text-xs font-semibold">One-Way Behaviour</div>
                        <div className="text-gray-400 text-xs">
                          Ly/Lx = {results.spanRatio.toFixed(1)} &gt; 2.0 — slab behaves as one-way
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                    <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-emerald-300 text-xs font-semibold">Overall</div>
                      <div className="text-gray-400 text-xs">
                        {results.slabClass} slab checked to EC2 —{' '}
                        {results.overallStatus === 'PASS'
                          ? 'all checks satisfied'
                          : 'design inadequate'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {activeTab === 'visualization' && (
            <motion.div
              key="viz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card variant="glass" className="border-gray-800/50 overflow-hidden">
                <div className="bg-gradient-to-b from-gray-900 to-black p-4">
                  <Interactive3DDiagram height="500px" cameraPosition={[10, 6, 10]}>
                    <RCSlab3D />
                  </Interactive3DDiagram>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
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
    <div className="flex items-center gap-1.5 mb-1">
      <ExplainableLabel
        label={label}
        field={field || label.toLowerCase().replace(/\s+/g, '_')}
        className="block text-sm font-semibold text-gray-300 mb-2"
      />{' '}
      {unit && <span className="text-gray-600 text-xs">({unit})</span>}
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
      'p-4 text-center border shadow-lg',
      status === 'pass'
        ? 'border-l-4 border-l-green-400 border-green-500/30 bg-green-950/20 shadow-green-500/5'
        : 'border-l-4 border-l-red-400 border-red-500/30 bg-red-950/20 shadow-red-500/5',
    )}
  >
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div
      className={cn(
        'text-2xl font-bold font-mono',
        status === 'pass' ? 'text-green-400' : 'text-red-400',
      )}
    >
      {value}
    </div>
    <div className="text-xs text-gray-500 mt-1">{limit}</div>
  </Card>
);

export default RCSlab;
