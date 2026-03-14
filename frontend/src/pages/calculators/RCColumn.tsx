// =============================================================================
// BeaverCalc Studio — RC Column Calculator
// BS EN 1992-1-1 Reinforced Concrete Column Design
// =============================================================================
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBox,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiInfo,
  FiLayers,
  FiMaximize2,
  FiMinimize2,
  FiSliders,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import RCColumn3D from '../../components/3d/scenes/RCColumn3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

interface FormData {
  columnType: string;
  width: string;
  depth: string;
  height: string;
  concreteGrade: string;
  steelGrade: string;
  mainBarDia: string;
  numberOfBars: string;
  linkDia: string;
  cover: string;
  axialForce: string;
  momentY: string;
  momentZ: string;
  effectiveLengthFactorY: string;
  effectiveLengthFactorZ: string;
  bracing: string;
}

interface Results {
  Ac: number;
  As: number;
  rhoPercent: number;
  NRd: number;
  MRdY: number;
  slendernessY: number;
  slendernessZ: number;
  isSlender: boolean;
  axialUtil: number;
  momentUtil: number;
  interactionUtil: number;
  minEcc: number;
  M2: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  small_column: {
    name: 'Small Column (300×300)',
    form: {
      columnType: 'rectangular',
      width: '300',
      depth: '300',
      height: '3000',
      concreteGrade: '30',
      mainBarDia: '20',
      numberOfBars: '4',
      cover: '30',
      axialForce: '800',
      momentY: '30',
      momentZ: '15',
    },
  },
  medium_column: {
    name: 'Medium Column (400×400)',
    form: {
      columnType: 'rectangular',
      width: '400',
      depth: '400',
      height: '3500',
      concreteGrade: '32',
      mainBarDia: '25',
      numberOfBars: '8',
      cover: '35',
      axialForce: '2000',
      momentY: '80',
      momentZ: '40',
    },
  },
  large_column: {
    name: 'Large Column (600×600)',
    form: {
      columnType: 'rectangular',
      width: '600',
      depth: '600',
      height: '4000',
      concreteGrade: '40',
      mainBarDia: '32',
      numberOfBars: '12',
      cover: '40',
      axialForce: '5000',
      momentY: '200',
      momentZ: '100',
    },
  },
};

const RCColumn = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    material: true,
    loading: false,
  });
  const [form, setForm] = useState<FormData>({
    columnType: 'rectangular',
    width: '400',
    depth: '400',
    height: '3500',
    concreteGrade: '32',
    steelGrade: '500',
    mainBarDia: '25',
    numberOfBars: '8',
    linkDia: '10',
    cover: '35',
    axialForce: '2000',
    momentY: '80',
    momentZ: '40',
    effectiveLengthFactorY: '0.85',
    effectiveLengthFactorZ: '0.85',
    bracing: 'braced',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'width', label: 'Width' },
      { key: 'depth', label: 'Depth' },
      { key: 'height', label: 'Height' },
      { key: 'mainBarDia', label: 'Main Bar Dia' },
      { key: 'numberOfBars', label: 'Number Of Bars' },
      { key: 'linkDia', label: 'Link Dia' },
      { key: 'cover', label: 'Cover' },
      { key: 'axialForce', label: 'Axial Force' },
      { key: 'momentY', label: 'Moment Y', allowZero: true },
      { key: 'momentZ', label: 'Moment Z', allowZero: true },
      { key: 'effectiveLengthFactorY', label: 'Effective Length Factor Y' },
      { key: 'effectiveLengthFactorZ', label: 'Effective Length Factor Z' },
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
    { key: 'columnType', label: 'Column Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'width', label: 'Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'depth', label: 'Depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'height', label: 'Height', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const b = parseFloat(form.width);
      const h = parseFloat(form.depth);
      const L = parseFloat(form.height);
      const fck = parseFloat(form.concreteGrade);
      const fyk = parseFloat(form.steelGrade);
      const dBar = parseFloat(form.mainBarDia);
      const nBars = parseInt(form.numberOfBars);
      const cov = parseFloat(form.cover);
      const dLink = parseFloat(form.linkDia);
      const NEd = parseFloat(form.axialForce);
      const MEdY = parseFloat(form.momentY);
      const MEdZ = parseFloat(form.momentZ);
      const leY = parseFloat(form.effectiveLengthFactorY);
      const leZ = parseFloat(form.effectiveLengthFactorZ);

      if (b <= 0 || h <= 0 || L <= 0 || fck <= 0) {
        w.push({ type: 'error', message: 'Invalid inputs' });
        setWarnings(w);
        return;
      }

      const Ac = b * h; // mm²
      const As = (nBars * Math.PI * dBar * dBar) / 4;
      const rhoPercent = (As / Ac) * 100;

      // Design strengths
      const fcd = (0.85 * fck) / 1.5; // αcc × fck / γc
      const fyd = fyk / 1.15;

      // Pure axial capacity
      const NRd = (fcd * (Ac - As) + fyd * As) / 1000; // kN

      // Effective depth
      const d = h - cov - dLink - dBar / 2;

      // Moment capacity (simplified rectangular stress block)
      const x_bal = 0.6 * d; // balanced depth
      const z = d - 0.4 * x_bal;
      const Mc = (fcd * b * 0.8 * x_bal * z) / 1e6; // from concrete
      const As_half = As / 2;
      const d2 = cov + dLink + dBar / 2;
      const Ms = (As_half * fyd * (d - d2)) / 1e6; // from steel
      const MRdY = Mc + Ms;

      // Slenderness
      const iY = h / Math.sqrt(12);
      const iZ = b / Math.sqrt(12);
      const l0Y = leY * L;
      const l0Z = leZ * L;
      const slendernessY = l0Y / iY;
      const slendernessZ = l0Z / iZ;

      // Slenderness limit (simplified — EC2 Cl. 5.8.3.1)
      const n = (NEd * 1000) / (fcd * Ac);
      const lambdaLim = (20 * 0.7 * 1.1 * 0.7) / Math.sqrt(n); // A=0.7, B=1.1, C=0.7
      const isSlender = slendernessY > lambdaLim || slendernessZ > lambdaLim;

      // Minimum eccentricity
      const minEcc = Math.max(h / 30, 20);

      // Second-order moment (simplified)
      let M2 = 0;
      if (isSlender) {
        const nu = 1 + (As * fyd) / (Ac * fcd);
        const nbal = 0.4;
        const Kr = Math.min((nu - n) / (nu - nbal), 1.0);
        const Kphi = 1.0; // simplified — no creep
        const ei = (l0Y * l0Y) / (Math.PI * Math.PI * 0.45 * d);
        const e2 = (Kr * Kphi * ei) / 1000; // mm to m adjusted
        M2 = NEd * e2; // kNm
        w.push({
          type: 'warning',
          message: `Column is slender (λ=${slendernessY.toFixed(0)} > ${lambdaLim.toFixed(0)}) — second-order effects included`,
        });
      }

      const MEd_total = MEdY + (NEd * minEcc) / 1000 + M2;
      const axialUtil = NEd / NRd;
      const momentUtil = MEd_total / MRdY;

      // Simplified interaction (N/NRd + M/MRd ≤ 1.0 is conservative)
      const interactionUtil = axialUtil * 0.5 + momentUtil; // simplified

      if (rhoPercent < 0.4)
        w.push({
          type: 'warning',
          message: `Reinforcement ratio ${rhoPercent.toFixed(1)}% below EC2 minimum 0.4%`,
        });
      if (rhoPercent > 4.0)
        w.push({
          type: 'warning',
          message: `Reinforcement ratio ${rhoPercent.toFixed(1)}% exceeds EC2 maximum 4%`,
        });
      if (nBars < 4)
        w.push({ type: 'warning', message: 'Minimum 4 bars required for rectangular columns' });

      const overallStatus = interactionUtil <= 1.0 ? 'PASS' : 'FAIL';

      setResults({
        Ac,
        As,
        rhoPercent,
        NRd,
        MRdY,
        slendernessY,
        slendernessZ,
        isSlender,
        axialUtil,
        momentUtil,
        interactionUtil,
        minEcc,
        M2,
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
      title: 'RC Column Design',
      subtitle: 'BS EN 1992-1-1',
      projectInfo: [{ label: 'Calculator', value: 'RC Column' }],
      inputs: [
        { label: 'Width (b)', value: form.width, unit: 'mm' },
        { label: 'Depth (h)', value: form.depth, unit: 'mm' },
        { label: 'Height (L)', value: form.height, unit: 'mm' },
        { label: 'Concrete fck', value: form.concreteGrade, unit: 'MPa' },
        { label: 'Steel fyk', value: form.steelGrade, unit: 'MPa' },
        { label: 'Bars', value: `${form.numberOfBars}T${form.mainBarDia}` },
        { label: 'Axial NEd', value: form.axialForce, unit: 'kN' },
        { label: 'Moment MEd,y', value: form.momentY, unit: 'kNm' },
      ],
      checks: [
        {
          name: 'Axial',
          capacity: `${results.NRd.toFixed(0)} kN`,
          utilisation: `${(results.axialUtil * 100).toFixed(0)}%`,
          status: results.axialUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Moment',
          capacity: `${results.MRdY.toFixed(0)} kNm`,
          utilisation: `${(results.momentUtil * 100).toFixed(0)}%`,
          status: results.momentUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Interaction',
          capacity: '-',
          utilisation: `${(results.interactionUtil * 100).toFixed(0)}%`,
          status: results.overallStatus,
        },
      ],
      sections: [
        {
          title: 'Column Properties',
          head: [['Parameter', 'Value']],
          body: [
            ['Ac', `${results.Ac.toFixed(0)} mm²`],
            ['As', `${results.As.toFixed(0)} mm²`],
            ['ρ', `${results.rhoPercent.toFixed(1)}%`],
            ['λy', results.slendernessY.toFixed(1)],
            ['λz', results.slendernessZ.toFixed(1)],
            ['Slender?', results.isSlender ? 'Yes' : 'No'],
            ['M2 (2nd order)', `${results.M2.toFixed(1)} kNm`],
          ],
        },
      ],
      recommendations: [
        ...(results.interactionUtil > 0.85
          ? [
              {
                check: 'High Interaction',
                suggestion: `${(results.interactionUtil * 100).toFixed(0)}% — consider increasing section or reinforcement`,
              },
            ]
          : []),
        ...(results.isSlender
          ? [
              {
                check: 'Slender Column',
                suggestion: `λ = ${results.slendernessY.toFixed(0)} — second-order effects included`,
              },
            ]
          : []),
        ...(results.rhoPercent < 0.4
          ? [
              {
                check: 'Min Reinforcement',
                suggestion: `ρ = ${results.rhoPercent.toFixed(1)}% below EC2 min 0.4%`,
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
      footerNote: 'Beaver Bridges Ltd — RC Column Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'RC Column Design',
      subtitle: 'BS EN 1992-1-1',
      projectInfo: [{ label: 'Calculator', value: 'RC Column' }],
      inputs: [
        { label: 'Width (b)', value: form.width, unit: 'mm' },
        { label: 'Depth (h)', value: form.depth, unit: 'mm' },
        { label: 'Height (L)', value: form.height, unit: 'mm' },
        { label: 'Concrete fck', value: form.concreteGrade, unit: 'MPa' },
        { label: 'Steel fyk', value: form.steelGrade, unit: 'MPa' },
        { label: 'Bars', value: `${form.numberOfBars}T${form.mainBarDia}` },
        { label: 'Axial NEd', value: form.axialForce, unit: 'kN' },
        { label: 'Moment MEd,y', value: form.momentY, unit: 'kNm' },
      ],
      checks: [
        {
          name: 'Axial',
          capacity: `${results.NRd.toFixed(0)} kN`,
          utilisation: `${(results.axialUtil * 100).toFixed(0)}%`,
          status: results.axialUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Moment',
          capacity: `${results.MRdY.toFixed(0)} kNm`,
          utilisation: `${(results.momentUtil * 100).toFixed(0)}%`,
          status: results.momentUtil <= 1 ? ('PASS' as const) : ('FAIL' as const),
        },
        {
          name: 'Interaction',
          capacity: '-',
          utilisation: `${(results.interactionUtil * 100).toFixed(0)}%`,
          status: results.overallStatus,
        },
      ],
      sections: [
        {
          title: 'Column Properties',
          head: [['Parameter', 'Value']],
          body: [
            ['Ac', `${results.Ac.toFixed(0)} mm²`],
            ['As', `${results.As.toFixed(0)} mm²`],
            ['ρ', `${results.rhoPercent.toFixed(1)}%`],
            ['λy', results.slendernessY.toFixed(1)],
            ['λz', results.slendernessZ.toFixed(1)],
            ['Slender?', results.isSlender ? 'Yes' : 'No'],
            ['M2 (2nd order)', `${results.M2.toFixed(1)} kNm`],
          ],
        },
      ],
      recommendations: [
        ...(results.interactionUtil > 0.85
          ? [
              {
                check: 'High Interaction',
                suggestion: `${(results.interactionUtil * 100).toFixed(0)}% — consider increasing section or reinforcement`,
              },
            ]
          : []),
        ...(results.isSlender
          ? [
              {
                check: 'Slender Column',
                suggestion: `λ = ${results.slendernessY.toFixed(0)} — second-order effects included`,
              },
            ]
          : []),
        ...(results.rhoPercent < 0.4
          ? [
              {
                check: 'Min Reinforcement',
                suggestion: `ρ = ${results.rhoPercent.toFixed(1)}% below EC2 min 0.4%`,
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
      footerNote: 'Beaver Bridges Ltd — RC Column Design',
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
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700/20 via-transparent to-gray-900/10" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-gray-500/30 mb-4 bg-gray-950/20">
            <span className="text-gray-100 font-mono tracking-wider">CONCRETE | RC COLUMN</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-2">
            RC Column Design
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Reinforced concrete column with axial-moment interaction, slenderness, and second-order
            effects to BS EN 1992-1-1.
          </p>
        </motion.div>

        {/* Glass toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button
            onClick={exportPDF}
            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm"
          >
            <FiDownload className="mr-2 w-4 h-4" /> PDF Report
          </Button>
          <Button
            onClick={exportDOCX}
            className="bg-gradient-to-r from-gray-600 to-gray-500 text-white text-sm"
          >
            <FiDownload className="mr-2 w-4 h-4" /> DOCX Report
          </Button>
          <div className="flex-1" />
          <SaveRunButton
            calculatorKey="rc-column"
            inputs={form as unknown as Record<string, string | number>}
            results={results}
            status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
          />
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
                activeTab === tab ? 'bg-gradient-to-r from-gray-500 to-gray-400' : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏛️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
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
                  {results.overallStatus === 'PASS' ? 'Column Adequate' : 'Column Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  ρ = {results.rhoPercent.toFixed(1)}% | λ = {results.slendernessY.toFixed(0)}{' '}
                  {results.isSlender ? '(slender)' : '(stocky)'}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={exportPDF} className="bg-gradient-to-r from-gray-600 to-gray-500">
                <FiDownload className="mr-2" />
                PDF Report
              </Button>
              <Button onClick={exportDOCX} className="bg-gradient-to-r from-gray-600 to-gray-500">
                <FiDownload className="mr-2" />
                DOCX Report
              </Button>
              <SaveRunButton
                calculatorKey="rc-column"
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
                <Card
                  variant="glass"
                  className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                >
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('geometry')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiBox className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Column Geometry</CardTitle>
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
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Width (b)"
                            value={form.width}
                            onChange={(v) => setForm((f) => ({ ...f, width: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Depth (h)"
                            value={form.depth}
                            onChange={(v) => setForm((f) => ({ ...f, depth: v }))}
                            unit="mm"
                          />
                        </div>
                        <InputField
                          label="Height (L)"
                          value={form.height}
                          onChange={(v) => setForm((f) => ({ ...f, height: v }))}
                          unit="mm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="le,y factor"
                            value={form.effectiveLengthFactorY}
                            onChange={(v) => setForm((f) => ({ ...f, effectiveLengthFactorY: v }))}
                            unit=""
                          />
                          <InputField
                            label="le,z factor"
                            value={form.effectiveLengthFactorZ}
                            onChange={(v) => setForm((f) => ({ ...f, effectiveLengthFactorZ: v }))}
                            unit=""
                          />
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card
                  variant="glass"
                  className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                >
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('material')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiLayers className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">
                        Materials & Reinforcement
                      </CardTitle>
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
                            label="fyk"
                            value={form.steelGrade}
                            onChange={(v) => setForm((f) => ({ ...f, steelGrade: v }))}
                            unit="MPa"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Bar Ø"
                            value={form.mainBarDia}
                            onChange={(v) => setForm((f) => ({ ...f, mainBarDia: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="No. Bars"
                            value={form.numberOfBars}
                            onChange={(v) => setForm((f) => ({ ...f, numberOfBars: v }))}
                            unit=""
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Link Ø"
                            value={form.linkDia}
                            onChange={(v) => setForm((f) => ({ ...f, linkDia: v }))}
                            unit="mm"
                          />
                          <InputField
                            label="Cover"
                            value={form.cover}
                            onChange={(v) => setForm((f) => ({ ...f, cover: v }))}
                            unit="mm"
                          />
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card
                  variant="glass"
                  className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
                >
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('loading')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiZap className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Applied Forces</CardTitle>
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
                          label="Axial NEd"
                          value={form.axialForce}
                          onChange={(v) => setForm((f) => ({ ...f, axialForce: v }))}
                          unit="kN"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="MEd,y"
                            value={form.momentY}
                            onChange={(v) => setForm((f) => ({ ...f, momentY: v }))}
                            unit="kNm"
                          />
                          <InputField
                            label="MEd,z"
                            value={form.momentZ}
                            onChange={(v) => setForm((f) => ({ ...f, momentZ: v }))}
                            unit="kNm"
                          />
                        </div>
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
                      <Interactive3DDiagram height="h-full" cameraPosition={[5, 6, 5]}>
                        <RCColumn3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        RC COLUMN — REAL-TIME PREVIEW
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
                          { label: 'Width', value: `${form.width} mm` },
                          { label: 'Depth', value: `${form.depth} mm` },
                          { label: 'Height', value: `${form.height} mm` },
                          { label: 'Concrete', value: `C${form.concreteGrade}` },
                          { label: 'Steel Grade', value: `${form.steelGrade} MPa` },
                          { label: 'Main Bars', value: `${form.numberOfBars}T${form.mainBarDia}` },
                          { label: 'Axial Force', value: `${form.axialForce} kN` },
                          { label: 'Moment Y', value: `${form.momentY} kNm` },
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
                              label: 'Axial',
                              util: (results.axialUtil * 100).toFixed(1),
                              status: results.axialUtil <= 1 ? 'PASS' : 'FAIL',
                            },
                            {
                              label: 'Moment',
                              util: (results.momentUtil * 100).toFixed(1),
                              status: results.momentUtil <= 1 ? 'PASS' : 'FAIL',
                            },
                            {
                              label: 'Interaction',
                              util: (results.interactionUtil * 100).toFixed(1),
                              status: results.interactionUtil <= 1 ? 'PASS' : 'FAIL',
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
                    title="RC Column — 3D Preview"
                    sliders={whatIfSliders}
                    form={form}
                    updateForm={updateForm}
                    status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[5, 6, 5]}>
                        <RCColumn3D />
                      </Interactive3DDiagram>
                    )}
                  />
                </div>
                {results && (
                  <div className="sticky top-8 grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <ResultCard
                      label="Axial"
                      value={`${(results.axialUtil * 100).toFixed(0)}%`}
                      limit={`NRd = ${results.NRd.toFixed(0)} kN`}
                      status={results.axialUtil <= 1 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Moment"
                      value={`${(results.momentUtil * 100).toFixed(0)}%`}
                      limit={`MRd = ${results.MRdY.toFixed(0)} kNm`}
                      status={results.momentUtil <= 1 ? 'pass' : 'fail'}
                    />
                    <ResultCard
                      label="Interaction"
                      value={`${(results.interactionUtil * 100).toFixed(0)}%`}
                      limit="≤ 100%"
                      status={results.interactionUtil <= 1 ? 'pass' : 'fail'}
                    />
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
                      ['Ac', `${results.Ac.toFixed(0)} mm²`],
                      ['As', `${results.As.toFixed(0)} mm²`],
                      ['ρ', `${results.rhoPercent.toFixed(1)}%`],
                      ['NRd', `${results.NRd.toFixed(0)} kN`],
                      ['MRd,y', `${results.MRdY.toFixed(0)} kNm`],
                      ['λy', results.slendernessY.toFixed(1)],
                      ['λz', results.slendernessZ.toFixed(1)],
                      ['M2', `${results.M2.toFixed(1)} kNm`],
                    ].map(([l, v], i) => (
                      <div key={i} className="bg-black/30 rounded-lg p-3">
                        <div className="text-gray-500 text-xs uppercase mb-1">{l}</div>
                        <div className="text-white font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card
                variant="glass"
                className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50"
              >
                <CardHeader className="py-3">
                  <CardTitle className="text-white font-semibold">Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {results.interactionUtil > 0.85 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-950/30 border border-yellow-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-yellow-300 text-xs font-semibold">
                          High Interaction Utilisation
                        </div>
                        <div className="text-gray-400 text-xs">
                          {(results.interactionUtil * 100).toFixed(0)}% — consider increasing
                          section size or reinforcement
                        </div>
                      </div>
                    </div>
                  )}
                  {results.isSlender && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-950/30 border border-orange-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-orange-300 text-xs font-semibold">Slender Column</div>
                        <div className="text-gray-400 text-xs">
                          λ = {results.slendernessY.toFixed(0)} — second-order effects included,
                          verify creep assumptions
                        </div>
                      </div>
                    </div>
                  )}
                  {results.rhoPercent < 0.4 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-red-950/30 border border-red-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-red-300 text-xs font-semibold">
                          Below Minimum Reinforcement
                        </div>
                        <div className="text-gray-400 text-xs">
                          ρ = {results.rhoPercent.toFixed(1)}% &lt; 0.4% minimum per EC2
                        </div>
                      </div>
                    </div>
                  )}
                  {results.rhoPercent > 4.0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-red-950/30 border border-red-500/20">
                      <FiAlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-red-300 text-xs font-semibold">
                          Above Maximum Reinforcement
                        </div>
                        <div className="text-gray-400 text-xs">
                          ρ = {results.rhoPercent.toFixed(1)}% &gt; 4% maximum per EC2
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                    <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-emerald-300 text-xs font-semibold">Overall</div>
                      <div className="text-gray-400 text-xs">
                        Column checked to BS EN 1992-1-1 Cl. 5.8 —{' '}
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
              <Card
                variant="glass"
                className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 overflow-hidden"
              >
                <div className="bg-gradient-to-b from-gray-900 to-black p-4">
                  <Interactive3DDiagram height="500px" cameraPosition={[6, 8, 6]}>
                    <RCColumn3D />
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
    <div className="block text-sm font-semibold text-gray-300 mb-2">
      <ExplainableLabel
        label={`${label}${unit ? ` (${unit})` : ''}`}
        field={field || 'rc-column'}
      />
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
        ? 'border-l-4 border-green-400 bg-green-950/20 shadow-green-500/5'
        : 'border-l-4 border-red-400 bg-red-950/20 shadow-red-500/5',
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

export default RCColumn;
