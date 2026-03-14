// =============================================================================
// RC Slab Bending Calculator — Premium Edition
// EN 1992-1-1:2004 (Eurocode 2) compliant reinforced concrete design
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiGrid,
    FiInfo,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTarget,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildRCSlabBendingReport } from '../../lib/pdf/builders/rcSlabBendingBuilder';
import { cn } from '../../lib/utils';

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import RCSlab3D from '../../components/3d/scenes/RCSlab3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { CONCRETE_GRADES as _CONCRETE_GRADES_LIB, REBAR_GRADES } from '../../data/materialGrades';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Slab Geometry
  slabType: string;
  spanX: string;
  spanY: string;
  thickness: string;
  coverTop: string;
  coverBottom: string;
  // Loading
  selfWeight: string;
  deadLoad: string;
  liveLoad: string;
  loadType: string;
  // Materials
  concreteGrade: string;
  steelGrade: string;
  barDiameter: string;
  // Support Conditions
  supportCondition: string;
  // Project Info
  projectName: string;
  reference: string;
}

interface Results {
  // Loading
  totalULS: number;
  totalSLS: number;
  // Moments
  MEdX: number;
  MEdY: number;
  MEdXneg: number;
  MEdYneg: number;
  // Material Properties
  fck: number;
  fcd: number;
  fyk: number;
  fyd: number;
  // Effective Depths
  dX: number;
  dY: number;
  // Reinforcement X-direction
  KX: number;
  zX: number;
  AsReqX: number;
  AsProvX: string;
  AsProvXarea: number;
  utilisationX: number;
  statusX: string;
  // Reinforcement Y-direction
  KY: number;
  zY: number;
  AsReqY: number;
  AsProvY: string;
  AsProvYarea: number;
  utilisationY: number;
  statusY: string;
  // Minimum reinforcement
  AsMin: number;
  // Shear
  VEd: number;
  VRdc: number;
  shearStatus: string;
  // Deflection
  spanDepthRatio: number;
  spanDepthLimit: number;
  deflectionStatus: string;
  // Crack width
  crackWidth: number;
  crackLimit: number;
  crackStatus: string;
  // Overall
  overallStatus: string;
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

// Adapter: shared library Ecm is in GPa, this calculator uses MPa
const CONCRETE_GRADES = Object.fromEntries(
  Object.entries(_CONCRETE_GRADES_LIB).map(([k, v]) => [k, { fck: v.fck, fctm: v.fctm, Ecm: v.Ecm * 1000 }])
) as Record<string, { fck: number; fctm: number; Ecm: number }>;

// Adapter: map REBAR_GRADES to local shape with description
const STEEL_GRADES = Object.fromEntries(
  Object.entries(REBAR_GRADES)
    .filter(([k]) => ['B500A', 'B500B', 'B500C'].includes(k))
    .map(([k, v]) => [k, {
      fyk: v.fyk,
      Es: v.Es,
      description: v.ductilityClass === 'A' ? 'Fabric reinforcement'
        : v.ductilityClass === 'B' ? 'Standard bars' : 'High ductility',
    }])
) as Record<string, { fyk: number; Es: number; description: string }>;

const BAR_AREAS: Record<string, number> = {
  '8': 50.3,
  '10': 78.5,
  '12': 113.1,
  '16': 201.1,
  '20': 314.2,
  '25': 490.9,
  '32': 804.2,
};

const BAR_SPACINGS = [100, 125, 150, 175, 200, 225, 250, 300];

const SUPPORT_CONDITIONS = {
  simply_supported: {
    name: 'Simply Supported',
    alphaX: 0.125,
    alphaY: 0.125,
    deflectionK: 1.0,
    description: 'Free rotation at all edges',
  },
  continuous_one: {
    name: 'Continuous One End',
    alphaX: 0.096,
    alphaY: 0.096,
    deflectionK: 1.3,
    description: 'Fixed at one end',
  },
  continuous_both: {
    name: 'Continuous Both Ends',
    alphaX: 0.063,
    alphaY: 0.063,
    deflectionK: 1.5,
    description: 'Fixed at both ends',
  },
  cantilever: {
    name: 'Cantilever',
    alphaX: 0.5,
    alphaY: 0.5,
    deflectionK: 0.4,
    description: 'Fixed at one end only',
  },
};

const SLAB_TYPES = {
  one_way: { name: 'One-Way Spanning', description: 'Ly/Lx > 2' },
  two_way: { name: 'Two-Way Spanning', description: 'Ly/Lx ≤ 2' },
  flat_slab: { name: 'Flat Slab', description: 'No beams' },
};

const LOAD_TYPES = {
  residential: { name: 'Residential', psi0: 0.7, psi1: 0.5, psi2: 0.3 },
  office: { name: 'Office', psi0: 0.7, psi1: 0.5, psi2: 0.3 },
  congregation: { name: 'Congregation Areas', psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  storage: { name: 'Storage', psi0: 1.0, psi1: 0.9, psi2: 0.8 },
  parking: { name: 'Car Parking', psi0: 0.7, psi1: 0.7, psi2: 0.6 },
};

const PRESETS = {
  deck_slab_200: {
    name: '🛣️ Bridge Deck Slab 200mm',
    slabType: 'one_way',
    spanX: '3.0',
    spanY: '6.0',
    thickness: '200',
    coverTop: '40',
    coverBottom: '40',
    deadLoad: '2.0',
    liveLoad: '10.0',
    loadType: 'storage',
    concreteGrade: 'C32/40',
    barDiameter: '16',
    supportCondition: 'continuous_both',
  },
  deck_slab_250: {
    name: '🛣️ Bridge Deck Slab 250mm',
    slabType: 'one_way',
    spanX: '3.5',
    spanY: '8.0',
    thickness: '250',
    coverTop: '45',
    coverBottom: '45',
    deadLoad: '2.5',
    liveLoad: '10.0',
    loadType: 'storage',
    concreteGrade: 'C35/45',
    barDiameter: '20',
    supportCondition: 'continuous_both',
  },
  cantilever_edge: {
    name: '🌉 Cantilever Deck Edge',
    slabType: 'one_way',
    spanX: '1.5',
    spanY: '4.0',
    thickness: '250',
    coverTop: '45',
    coverBottom: '45',
    deadLoad: '3.0',
    liveLoad: '5.0',
    loadType: 'congregation',
    concreteGrade: 'C35/45',
    barDiameter: '16',
    supportCondition: 'cantilever',
  },
  approach_slab: {
    name: '🏗️ Approach Slab',
    slabType: 'one_way',
    spanX: '5.0',
    spanY: '10.0',
    thickness: '300',
    coverTop: '45',
    coverBottom: '45',
    deadLoad: '3.0',
    liveLoad: '10.0',
    loadType: 'storage',
    concreteGrade: 'C32/40',
    barDiameter: '20',
    supportCondition: 'simply_supported',
  },
  footbridge_deck: {
    name: '🚶 Footbridge Deck Slab',
    slabType: 'two_way',
    spanX: '2.5',
    spanY: '5.0',
    thickness: '175',
    coverTop: '35',
    coverBottom: '35',
    deadLoad: '1.5',
    liveLoad: '5.0',
    loadType: 'congregation',
    concreteGrade: 'C30/37',
    barDiameter: '12',
    supportCondition: 'continuous_one',
  },
  pier_cap: {
    name: '🏛️ Pier Cap Slab',
    slabType: 'two_way',
    spanX: '4.0',
    spanY: '6.0',
    thickness: '300',
    coverTop: '50',
    coverBottom: '50',
    deadLoad: '5.0',
    liveLoad: '10.0',
    loadType: 'storage',
    concreteGrade: 'C40/50',
    barDiameter: '25',
    supportCondition: 'continuous_both',
  },
};

const RCSlabBending = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    barDiameter: '',
    concreteGrade: '',
    coverBottom: '',
    coverTop: '',
    deadLoad: '',
    liveLoad: '',
    loadType: '',
    projectName: '',
    reference: '',
    selfWeight: '',
    slabType: '',
    spanX: '',
    spanY: '',
    steelGrade: '',
    supportCondition: '',
    thickness: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'barDiameter', label: 'Bar Diameter' },
  { key: 'coverBottom', label: 'Cover Bottom' },
  { key: 'coverTop', label: 'Cover Top' },
  { key: 'deadLoad', label: 'Dead Load' },
  { key: 'liveLoad', label: 'Live Load' },
  { key: 'selfWeight', label: 'Self Weight' },
  { key: 'spanX', label: 'Span X' },
  { key: 'spanY', label: 'Span Y' },
  { key: 'thickness', label: 'Thickness' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'slabType', label: 'Slab Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'spanX', label: 'Span X', min: 0, max: 100, step: 1, unit: '' },
    { key: 'spanY', label: 'Span Y', min: 0, max: 100, step: 1, unit: '' },
    { key: 'thickness', label: 'Thickness', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  // ===== HANDLERS =====
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateForm = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (key: string) => {
    const preset = (PRESETS as any)[key];
    if (preset) {
      setFormData((prev) => ({ ...prev, ...preset }));
    }
  };

  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);
    setTimeout(() => {
      try {
        const newWarnings: string[] = [];

        // Parse inputs
        const Lx = parseFloat(formData.spanX) || 4.0;
        const Ly = parseFloat(formData.spanY) || 6.0;
        const h = parseFloat(formData.thickness) || 150;
        const cBot = parseFloat(formData.coverBottom) || 25;
        const cTop = parseFloat(formData.coverTop) || 25;
        const gk_super = parseFloat(formData.deadLoad) || 1.5;
        const qk = parseFloat(formData.liveLoad) || 1.5;
        const phi = parseFloat(formData.barDiameter) || 10;

        // Material properties
        const concreteKey = formData.concreteGrade || 'C25/30';
        const concrete = (CONCRETE_GRADES as any)[concreteKey] || CONCRETE_GRADES['C25/30'];
        const fck = concrete.fck;
        const fcd = (0.85 * fck) / 1.5; // αcc * fck / γc
        const fctm = concrete.fctm;

        const steelKey = formData.steelGrade || 'B500B';
        const steel = (STEEL_GRADES as any)[steelKey] || STEEL_GRADES.B500B;
        const fyk = steel.fyk;
        const fyd = fyk / 1.15; // fyk / γs

        // Self weight (kN/m²)
        const selfWeight = (h / 1000) * 25;
        const gk = selfWeight + gk_super;

        // ULS and SLS loads per m²
        const totalULS = 1.35 * gk + 1.5 * qk;
        const totalSLS = gk + qk;

        // Support conditions
        const supportKey = formData.supportCondition || 'simply_supported';
        const support =
          (SUPPORT_CONDITIONS as any)[supportKey] || SUPPORT_CONDITIONS.simply_supported;

        // Effective depths
        const dX = h - cBot - phi / 2;
        const dY = h - cBot - phi - phi / 2;

        // Bending moments (per m width)
        const ratio = Ly / Lx;
        const isOneWay = formData.slabType === 'one_way' || ratio > 2;

        let MEdX: number, MEdY: number;
        if (isOneWay) {
          MEdX = support.alphaX * totalULS * Lx * Lx;
          MEdY = 0.2 * MEdX; // secondary reinforcement
        } else {
          // Two-way slab coefficients (simplified)
          const betaX = support.alphaX;
          const betaY = support.alphaY * (1 / (ratio * ratio));
          MEdX = betaX * totalULS * Lx * Lx;
          MEdY = Math.max(betaY * totalULS * Ly * Ly, 0.2 * MEdX);
        }

        // Hogging moments (negative)
        const MEdXneg =
          supportKey.includes('continuous') || supportKey === 'cantilever' ? MEdX * 1.0 : 0;
        const MEdYneg = supportKey.includes('continuous') ? MEdY * 0.8 : 0;

        // Reinforcement design X-direction (per m width, b=1000mm)
        const b = 1000;
        const KX = (MEdX * 1e6) / (b * dX * dX * fcd);
        const Klim = 0.167; // singly reinforced limit
        if (KX > Klim) newWarnings.push("X-direction K > K' — compression reinforcement needed");
        const zX = Math.min(dX * (0.5 + Math.sqrt(0.25 - KX / (2 * 0.85))), 0.95 * dX);
        const AsReqX = (MEdX * 1e6) / (fyd * zX);

        // Reinforcement design Y-direction
        const KY = (MEdY * 1e6) / (b * dY * dY * fcd);
        if (KY > Klim) newWarnings.push("Y-direction K > K' — compression reinforcement needed");
        const zY = Math.min(dY * (0.5 + Math.sqrt(0.25 - KY / (2 * 0.85))), 0.95 * dY);
        const AsReqY = (MEdY * 1e6) / (fyd * zY);

        // Minimum reinforcement (EN 1992-1-1 §9.2.1.1)
        const AsMin = Math.max(0.26 * (fctm / fyk) * b * dX, 0.0013 * b * dX);

        // Provided reinforcement
        const barArea = BAR_AREAS[String(Math.round(phi))] || 78.5;
        const findProvided = (asReq: number) => {
          for (const spacing of BAR_SPACINGS) {
            const asProv = (barArea / spacing) * 1000;
            if (asProv >= Math.max(asReq, AsMin)) {
              return { desc: `T${Math.round(phi)}@${spacing}`, area: asProv };
            }
          }
          return { desc: `T${Math.round(phi)}@100`, area: (barArea / 100) * 1000 };
        };

        const provX = findProvided(AsReqX);
        const provY = findProvided(Math.max(AsReqY, AsMin));
        const utilX = Math.max(AsReqX, AsMin) / provX.area;
        const utilY = Math.max(AsReqY, AsMin) / provY.area;

        // Shear check (EN 1992-1-1 §6.2.2)
        const VEd = (totalULS * Lx) / 2;
        const rhoL = Math.min(provX.area / (b * dX), 0.02);
        const k = Math.min(1 + Math.sqrt(200 / dX), 2.0);
        const VRdc = Math.max(
          (0.12 * k * Math.pow(100 * rhoL * fck, 1 / 3) * b * dX) / 1000,
          (0.035 * Math.pow(k, 1.5) * Math.pow(fck, 0.5) * b * dX) / 1000,
        );
        const shearStatus = VEd <= VRdc ? 'PASS' : 'FAIL';
        if (shearStatus === 'FAIL')
          newWarnings.push('Shear exceeds concrete resistance — shear reinforcement required');

        // Deflection check (simplified span/depth)
        const rho0 = Math.sqrt(fck) / 1000;
        const rhoActual = provX.area / (b * dX);
        let ldBasic: number;
        if (rhoActual <= rho0) {
          ldBasic = 11 + (1.5 * Math.sqrt(fck) * rho0) / rhoActual;
        } else {
          ldBasic = 11 + (1.5 * Math.sqrt(fck) * rho0) / (rhoActual - rho0);
        }
        const spanDepthLimit = ldBasic * support.deflectionK;
        const spanDepthRatio = (Lx * 1000) / dX;
        const deflectionStatus = spanDepthRatio <= spanDepthLimit ? 'PASS' : 'FAIL';
        if (deflectionStatus === 'FAIL')
          newWarnings.push('Span/depth ratio exceeds limit — increase thickness');

        // Crack width (simplified estimate)
        const srMax = 3.4 * cBot + (0.425 * 0.8 * phi) / rhoActual;
        const sigmaS = (MEdX * 1e6) / (provX.area * zX);
        const epsSmCm = Math.max(
          (sigmaS - (0.4 * fctm) / rhoActual) / steel.Es,
          (0.6 * sigmaS) / steel.Es,
        );
        const crackWidth = srMax * epsSmCm;
        const crackLimit = 0.3;
        const crackStatus = crackWidth <= crackLimit ? 'PASS' : 'FAIL';
        if (crackStatus === 'FAIL') newWarnings.push('Crack width exceeds 0.3mm limit');

        // Overall rating
        const allPass = [
          utilX <= 1.0,
          utilY <= 1.0,
          shearStatus === 'PASS',
          deflectionStatus === 'PASS',
          crackStatus === 'PASS',
        ];
        const maxUtil = Math.max(utilX, utilY);
        let rating = 'CRITICAL';
        let ratingColor = '#ef4444';
        if (allPass.every(Boolean)) {
          if (maxUtil <= 0.5) {
            rating = 'EXCELLENT';
            ratingColor = '#22c55e';
          } else if (maxUtil <= 0.75) {
            rating = 'GOOD';
            ratingColor = '#10b981';
          } else if (maxUtil <= 0.9) {
            rating = 'ADEQUATE';
            ratingColor = '#f59e0b';
          } else {
            rating = 'MARGINAL';
            ratingColor = '#f97316';
          }
        }

        setResults({
          totalULS,
          totalSLS,
          MEdX,
          MEdY,
          MEdXneg,
          MEdYneg,
          fck,
          fcd,
          fyk,
          fyd,
          dX,
          dY,
          KX,
          zX,
          AsReqX,
          AsProvX: provX.desc,
          AsProvXarea: provX.area,
          utilisationX: utilX,
          statusX: utilX <= 1.0 ? 'PASS' : 'FAIL',
          KY,
          zY,
          AsReqY,
          AsProvY: provY.desc,
          AsProvYarea: provY.area,
          utilisationY: utilY,
          statusY: utilY <= 1.0 ? 'PASS' : 'FAIL',
          AsMin,
          VEd,
          VRdc,
          shearStatus,
          spanDepthRatio,
          spanDepthLimit,
          deflectionStatus,
          crackWidth,
          crackLimit,
          crackStatus,
          overallStatus: allPass.every(Boolean) ? 'PASS' : 'FAIL',
          rating,
          ratingColor,
        });

        setWarnings(newWarnings);
        setActiveTab('results');
      } catch (e) {
        console.error('Calculation error:', e);
      }
      setIsCalculating(false);
    }, 500);
  }, [formData]);

  const handleExportPDF = useCallback(() => {
    if (!results) return;
    const report = buildRCSlabBendingReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'RC Slab Bending Design',
      subtitle: 'EN 1992-1-1 (Eurocode 2) Analysis',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'RC Slab Design' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'EN 1992-1-1:2004' },
      ],
      inputs: [
        { label: 'Slab Type', value: formData.slabType },
        { label: 'Span X', value: formData.spanX, unit: 'm' },
        { label: 'Span Y', value: formData.spanY, unit: 'm' },
        { label: 'Thickness', value: formData.thickness, unit: 'mm' },
        { label: 'Concrete Grade', value: formData.concreteGrade },
        { label: 'Dead Load', value: formData.deadLoad, unit: 'kN/m\u00b2' },
        { label: 'Live Load', value: formData.liveLoad, unit: 'kN/m\u00b2' },
      ],
      sections: [
        {
          title: 'Bending Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Moment X', ((results as any).moment_x ?? 0).toFixed(1), 'kNm/m'],
            ['Moment Y', ((results as any).moment_y ?? 0).toFixed(1), 'kNm/m'],
            ['Reinforcement X', ((results as any).as_x ?? 0).toFixed(0), 'mm\u00b2/m'],
            ['Reinforcement Y', ((results as any).as_y ?? 0).toFixed(0), 'mm\u00b2/m'],
          ],
        },
      ],
      checks: [
        {
          name: 'X-Direction Utilisation',
          capacity: '100%',
          utilisation: `${(results.utilisationX * 100)?.toFixed(1) || '-'}%`,
          status: (results.utilisationX <= 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Y-Direction Utilisation',
          capacity: '100%',
          utilisation: `${(results.utilisationY * 100)?.toFixed(1) || '-'}%`,
          status: (results.utilisationY <= 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 RC Slab Bending Design',
    });
  }, [formData, results]);


  const InputField = ({
    label,
    field,
    unit,
    tooltip,
  }: {
    label: string;
    field: string;
    unit?: string;
    tooltip?: string;
  }) => (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <ExplainableLabel label={label} field={field} className="text-sm font-semibold text-gray-200" />{' '}
        {unit && <span className="text-xs text-gray-400">({unit})</span>}
      </div>
      <input
        type="number"
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
        placeholder="0"
        title={tooltip || label}
      />
    </div>
  );

  const CollapsibleSection = ({
    title,
    icon,
    variant,
    defaultOpen = true,
    children,
  }: {
    title: string;
    icon?: React.ReactNode;
    variant?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
  }) => {
    const sectionId = title.replace(/\s+/g, '_').toLowerCase();
    if (expandedSections[sectionId] === undefined) {
      expandedSections[sectionId] = defaultOpen;
    }
    return (
      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
        <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection(sectionId)}>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        {expandedSections[sectionId] && <CardContent>{children}</CardContent>}
      </Card>
    );
  };

  // =============================================================================
  // COLLAPSIBLE SECTION COMPONENT
  // =============================================================================

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
      className={cn('rounded-2xl border overflow-hidden', color)}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-white">{title}</span>
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

  const ResultCard: React.FC<{
    title: string;
    value: string;
    unit: string;
    status?: string;
    icon: React.ReactNode;
  }> = ({ title, value, unit, status, icon }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-lg border',
        status === 'PASS'
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : status === 'FAIL'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-gray-800/50 border-gray-700/50',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-neon-cyan">{icon}</span>
        <span className="text-gray-400 text-sm">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-gray-500 text-sm">{unit}</span>
      </div>
      {status && (
        <div
          className={cn(
            'mt-2 text-xs font-medium',
            status === 'PASS' ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {status}
        </div>
      )}
    </motion.div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid Pattern Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
                RC Slab Bending
              </h1>
              <p className="text-lg text-gray-400 mt-2">EN 1992-1-1:2004 Eurocode 2 Design</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={runCalculation}
                disabled={isCalculating}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {isCalculating ? (
                  <FiActivity className="animate-spin mr-2" />
                ) : (
                  <FiZap className="mr-2" />
                )}
                Calculate
              </Button>
              {results && (
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="border-cyan-500 text-cyan-400"
                >
                  <FiDownload className="mr-2" />
                  Export PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={handleExportDOCX}
                  variant="outline"
                  className="border-purple-500 text-purple-400"
                >
                  <FiDownload className="mr-2" />
                  Export DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton
                  calculatorKey="rc-slab-bending"
                  inputs={formData as unknown as Record<string, string | number>}
                  results={results}
                />
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
              {/* Left Column - Inputs */}
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

                {/* Slab Geometry */}
                <CollapsibleSection
                  title="Slab Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiGrid className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Slab Type</label>
                      <select
                        value={formData.slabType}
                        onChange={(e) => updateForm('slabType', e.target.value)}
                        title="Slab Type"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(SLAB_TYPES).map(([key, type]) => (
                          <option key={key} value={key}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Support Condition</label>
                      <select
                        value={formData.supportCondition}
                        onChange={(e) => updateForm('supportCondition', e.target.value)}
                        title="Support Condition"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(SUPPORT_CONDITIONS).map(([key, cond]) => (
                          <option key={key} value={key}>
                            {cond.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <InputField label="Span X (Lx)" field="spanX" unit="m" />
                    <InputField label="Span Y (Ly)" field="spanY" unit="m" />
                    <InputField label="Thickness (h)" field="thickness" unit="mm" />
                    <InputField label="Cover Top" field="coverTop" unit="mm" />
                    <InputField label="Cover Bottom" field="coverBottom" unit="mm" />
                  </div>
                </CollapsibleSection>

                {/* Loading */}
                <CollapsibleSection
                  title="Applied Loads"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InputField label="Superimposed Dead (gk)" field="deadLoad" unit="kN/m²" />
                    <InputField label="Live Load (qk)" field="liveLoad" unit="kN/m²" />
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Load Category</label>
                      <select
                        value={formData.loadType}
                        onChange={(e) => updateForm('loadType', e.target.value)}
                        title="Load Category"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(LOAD_TYPES).map(([key, type]) => (
                          <option key={key} value={key}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Materials */}
                <CollapsibleSection
                  title="Materials & Reinforcement"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Concrete Grade</label>
                      <select
                        value={formData.concreteGrade}
                        onChange={(e) => updateForm('concreteGrade', e.target.value)}
                        title="Concrete Grade"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.keys(CONCRETE_GRADES).map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Steel Grade</label>
                      <select
                        value={formData.steelGrade}
                        onChange={(e) => updateForm('steelGrade', e.target.value)}
                        title="Steel Grade"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(STEEL_GRADES).map(([key, steel]) => (
                          <option key={key} value={key}>
                            {key} - {steel.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Bar Diameter</label>
                      <select
                        value={formData.barDiameter}
                        onChange={(e) => updateForm('barDiameter', e.target.value)}
                        title="Bar Diameter"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.keys(BAR_AREAS).map((dia) => (
                          <option key={dia} value={dia}>
                            T{dia} ({BAR_AREAS[dia].toFixed(0)} mm²)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Project Info */}
                <CollapsibleSection
                  title="Project Information"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Project Name" field="projectName" />
                    <InputField label="Reference" field="reference" />
                  </div>
                </CollapsibleSection>

                {/* Calculate Button */}
                <button
                  onClick={runCalculation}
                  disabled={isCalculating}
                  className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isCalculating ? '⏳ CALCULATING...' : '⚡ RUN FULL ANALYSIS'}
                </button>
              </div>

              {/* Right Column - Visualization & Results */}
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
                        RC SLAB BENDING — REAL-TIME PREVIEW
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
                          { label: 'Span X', value: `${formData.spanX} m` },
                          { label: 'Span Y', value: `${formData.spanY} m` },
                          { label: 'Thickness', value: `${formData.thickness} mm` },
                          { label: 'Concrete', value: formData.concreteGrade || '—' },
                          { label: 'Dead Load', value: `${formData.deadLoad} kN/m²` },
                          { label: 'Live Load', value: `${formData.liveLoad} kN/m²` },
                          { label: 'Bar Dia', value: `${formData.barDiameter} mm` },
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
                            { label: 'Bending X', util: results.utilisationX?.toFixed(1), status: results.statusX },
                            { label: 'Bending Y', util: results.utilisationY?.toFixed(1), status: results.statusY },
                            { label: 'Shear', util: null, status: results.shearStatus },
                            { label: 'Deflection', util: null, status: results.deflectionStatus },
                            { label: 'Cracking', util: null, status: results.crackStatus },
                          ].map((check) => (
                            <div key={check.label} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-500">{check.label}</span>
                              <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : (parseFloat(String(check.util || '0')) > 90 ? 'text-orange-400' : 'text-emerald-400'))}>
                                {check.util ? `${check.util}%` : check.status}
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
                {/* Visualization */}
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
                    title="RC Slab Bending — 3D Preview"
                    sliders={whatIfSliders}
                    form={formData}
                    updateForm={updateForm}
                    status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                    renderScene={(fsHeight) => (
                      <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                        <RCSlab3D />
                      </Interactive3DDiagram>
                    )}
                  />
                </div>

                {/* Results */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Overall Rating */}
                    <Card
                      className="border-2 shadow-lg"
                      style={{
                        borderColor: results.ratingColor,
                        backgroundColor: `${results.ratingColor}10`,
                        boxShadow: `0 10px 15px -3px ${results.ratingColor}20`,
                      }}
                    >
                      <CardContent className="py-4 text-center">
                        <div className="text-3xl font-bold" style={{ color: results.ratingColor }}>
                          {results.rating}
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Max Util:{' '}
                          {(Math.max(results.utilisationX, results.utilisationY) * 100).toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Results */}
                    <div className="grid grid-cols-2 gap-3">
                      <ResultCard
                        title="M_Ed,x"
                        value={results.MEdX.toFixed(1)}
                        unit="kNm/m"
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FiActivity className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="M_Ed,y"
                        value={results.MEdY.toFixed(1)}
                        unit="kNm/m"
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FiActivity className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="As,req X"
                        value={results.AsReqX.toFixed(0)}
                        unit="mm²/m"
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <FiGrid className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="As,prov X"
                        value={results.AsProvX}
                        unit=""
                        status={results.statusX}
                        icon={results.statusX === 'PASS' ? <FiCheck /> : <FiAlertTriangle />}
                      />
                      <ResultCard
                        title="Shear"
                        value={results.VEd.toFixed(1)}
                        unit="kN/m"
                        status={results.shearStatus}
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <FiTarget className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="L/d Ratio"
                        value={results.spanDepthRatio.toFixed(1)}
                        unit={`≤ ${results.spanDepthLimit.toFixed(1)}`}
                        status={results.deflectionStatus}
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FiActivity className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                    </div>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Card className="bg-amber-500/10 border-amber-500/30">
                        <CardContent className="py-3">
                          <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <FiAlertTriangle />
                            <span className="font-medium">Warnings</span>
                          </div>
                          <ul className="text-sm text-white space-y-1">
                            {warnings.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ============= RESULTS TAB ============= */}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className={cn(
                    'border-l-4 shadow-lg',
                    results.overallStatus === 'PASS'
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-emerald-500/20'
                      : 'bg-red-500/10 border-red-500 shadow-red-500/20',
                  )}
                >
                  <CardContent className="py-4 text-center">
                    <div className="text-sm text-gray-400 mb-1">Overall Status</div>
                    <div
                      className={cn(
                        'text-3xl font-bold',
                        results.overallStatus === 'PASS' ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {results.rating}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{results.overallStatus}</div>
                  </CardContent>
                </Card>
                <Card variant="glass" className="border-l-4 border-amber-500">
                  <CardContent className="py-4 text-center">
                    <div className="text-sm text-gray-400 mb-1">Max Utilisation</div>
                    <div className="text-3xl font-bold text-neon-cyan">
                      {(Math.max(results.utilisationX, results.utilisationY) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {results.utilisationX > results.utilisationY
                        ? 'X-direction governs'
                        : 'Y-direction governs'}
                    </div>
                  </CardContent>
                </Card>
                <Card variant="glass" className="border-l-4 border-neon-cyan">
                  <CardContent className="py-4 text-center">
                    <div className="text-sm text-gray-400 mb-1">Slab Configuration</div>
                    <div className="text-xl font-bold text-white">
                      {SLAB_TYPES[formData.slabType as keyof typeof SLAB_TYPES]?.name ||
                        formData.slabType}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formData.thickness}mm thick · {formData.concreteGrade}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Check Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* X-Direction Reinforcement */}
                <Card
                  className={cn(
                    'border',
                    results.statusX === 'PASS'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20',
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-white">X-Direction Reinforcement</span>
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-1 rounded',
                          results.statusX === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.statusX}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          results.utilisationX <= 1 ? 'bg-emerald-500' : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min(results.utilisationX * 100, 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">M_Ed,x:</span>{' '}
                        <span className="text-white">{results.MEdX.toFixed(1)} kNm/m</span>
                      </div>
                      <div>
                        <span className="text-gray-400">K factor:</span>{' '}
                        <span className="text-white">{results.KX.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">As,req:</span>{' '}
                        <span className="text-white">{results.AsReqX.toFixed(0)} mm²/m</span>
                      </div>
                      <div>
                        <span className="text-gray-400">As,prov:</span>{' '}
                        <span className="text-white">{results.AsProvX}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Utilisation:</span>{' '}
                        <span className="text-white">
                          {(results.utilisationX * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">d_x:</span>{' '}
                        <span className="text-white">{results.dX.toFixed(0)} mm</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Y-Direction Reinforcement */}
                <Card
                  className={cn(
                    'border',
                    results.statusY === 'PASS'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20',
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-white">Y-Direction Reinforcement</span>
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-1 rounded',
                          results.statusY === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.statusY}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          results.utilisationY <= 1 ? 'bg-emerald-500' : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min(results.utilisationY * 100, 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">M_Ed,y:</span>{' '}
                        <span className="text-white">{results.MEdY.toFixed(1)} kNm/m</span>
                      </div>
                      <div>
                        <span className="text-gray-400">K factor:</span>{' '}
                        <span className="text-white">{results.KY.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">As,req:</span>{' '}
                        <span className="text-white">{results.AsReqY.toFixed(0)} mm²/m</span>
                      </div>
                      <div>
                        <span className="text-gray-400">As,prov:</span>{' '}
                        <span className="text-white">{results.AsProvY}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Utilisation:</span>{' '}
                        <span className="text-white">
                          {(results.utilisationY * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">d_y:</span>{' '}
                        <span className="text-white">{results.dY.toFixed(0)} mm</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shear Check */}
                <Card
                  className={cn(
                    'border',
                    results.shearStatus === 'PASS'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20',
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-white">Shear Resistance</span>
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-1 rounded',
                          results.shearStatus === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.shearStatus}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          results.VEd <= results.VRdc ? 'bg-emerald-500' : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min((results.VEd / results.VRdc) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">V_Ed:</span>{' '}
                        <span className="text-white">{results.VEd.toFixed(1)} kN/m</span>
                      </div>
                      <div>
                        <span className="text-gray-400">V_Rd,c:</span>{' '}
                        <span className="text-white">{results.VRdc.toFixed(1)} kN/m</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Utilisation:</span>{' '}
                        <span className="text-white">
                          {((results.VEd / results.VRdc) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Deflection Check */}
                <Card
                  className={cn(
                    'border',
                    results.deflectionStatus === 'PASS'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20',
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-white">Deflection (Span/Depth)</span>
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-1 rounded',
                          results.deflectionStatus === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400',
                        )}
                      >
                        {results.deflectionStatus}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          results.spanDepthRatio <= results.spanDepthLimit
                            ? 'bg-emerald-500'
                            : 'bg-red-500',
                        )}
                        style={{
                          width: `${Math.min((results.spanDepthRatio / results.spanDepthLimit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Actual L/d:</span>{' '}
                        <span className="text-white">{results.spanDepthRatio.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Limit L/d:</span>{' '}
                        <span className="text-white">{results.spanDepthLimit.toFixed(1)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Crack Width Check */}
              <Card
                className={cn(
                  'border',
                  results.crackStatus === 'PASS'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20',
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-white">Crack Width Control</span>
                    <span
                      className={cn(
                        'text-xs font-bold px-2 py-1 rounded',
                        results.crackStatus === 'PASS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {results.crackStatus}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        results.crackWidth <= results.crackLimit ? 'bg-emerald-500' : 'bg-red-500',
                      )}
                      style={{
                        width: `${Math.min((results.crackWidth / results.crackLimit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">w_k:</span>{' '}
                      <span className="text-white">{results.crackWidth.toFixed(3)} mm</span>
                    </div>
                    <div>
                      <span className="text-gray-400">w_max:</span>{' '}
                      <span className="text-white">{results.crackLimit.toFixed(2)} mm</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Utilisation:</span>{' '}
                      <span className="text-white">
                        {((results.crackWidth / results.crackLimit) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Material & Loading Properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">Material Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">f_ck:</span>{' '}
                        <span className="text-white">{results.fck} MPa</span>
                      </div>
                      <div>
                        <span className="text-gray-400">f_cd:</span>{' '}
                        <span className="text-white">{results.fcd.toFixed(1)} MPa</span>
                      </div>
                      <div>
                        <span className="text-gray-400">f_yk:</span>{' '}
                        <span className="text-white">{results.fyk} MPa</span>
                      </div>
                      <div>
                        <span className="text-gray-400">f_yd:</span>{' '}
                        <span className="text-white">{results.fyd.toFixed(1)} MPa</span>
                      </div>
                      <div>
                        <span className="text-gray-400">As,min:</span>{' '}
                        <span className="text-white">{results.AsMin.toFixed(0)} mm²/m</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white">Loading Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">ULS Load:</span>{' '}
                        <span className="text-white">{results.totalULS.toFixed(2)} kN/m²</span>
                      </div>
                      <div>
                        <span className="text-gray-400">SLS Load:</span>{' '}
                        <span className="text-white">{results.totalSLS.toFixed(2)} kN/m²</span>
                      </div>
                      <div>
                        <span className="text-gray-400">d_x:</span>{' '}
                        <span className="text-white">{results.dX.toFixed(0)} mm</span>
                      </div>
                      <div>
                        <span className="text-gray-400">d_y:</span>{' '}
                        <span className="text-white">{results.dY.toFixed(0)} mm</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                      <FiAlertTriangle />
                      <span className="font-medium">Warnings</span>
                    </div>
                    <ul className="text-sm text-white space-y-1">
                      {warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              <Card className="bg-emerald-500/5 border-emerald-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-emerald-400">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <FiCheck className="w-2.5 h-2.5 text-white" />
                    </div>
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1.5">
                  {results.overallStatus === 'PASS' ? (
                    <div className="flex items-start gap-2 text-emerald-300">
                      <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                      <span>
                        All design checks satisfied — slab is adequate for the specified loading
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-amber-300">
                      <FiAlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                      <span>Design check failures — increase slab thickness or reinforcement</span>
                    </div>
                  )}
                  {results.utilisationX > 0.85 && results.utilisationX <= 1.0 && (
                    <div className="flex items-start gap-2 text-emerald-300">
                      <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                      <span>X-direction utilisation is high — consider increasing bar size</span>
                    </div>
                  )}
                  {results.utilisationY > 0.85 && results.utilisationY <= 1.0 && (
                    <div className="flex items-start gap-2 text-emerald-300">
                      <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                      <span>Y-direction utilisation is high — consider closer bar spacing</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Export */}
              <div className="flex justify-end gap-3">
                <Button onClick={handleExportPDF} className="bg-cyan-600 hover:bg-cyan-700">
                  <FiDownload className="mr-2" /> Export PDF Report
                </Button>
                <Button onClick={handleExportDOCX} className="bg-purple-600 hover:bg-purple-700">
                  <FiDownload className="mr-2" /> Export DOCX
                </Button>
              </div>

              {/* Design Codes */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <FiInfo className="text-neon-cyan" />
                    Design Codes &amp; References
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-cyan-400 font-medium">EN 1992-1-1:2004</span>
                      <p className="text-gray-400">Eurocode 2 — Design of concrete structures</p>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-medium">§6.1 Bending</span>
                      <p className="text-gray-400">ULS bending and axial force</p>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-medium">§6.2 Shear</span>
                      <p className="text-gray-400">Members without shear reinforcement</p>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-medium">§7.4 Deflection</span>
                      <p className="text-gray-400">Span-to-depth ratio limiting</p>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-medium">§7.3 Crack Control</span>
                      <p className="text-gray-400">Crack width limitation</p>
                    </div>
                    <div>
                      <span className="text-cyan-400 font-medium">UK National Annex</span>
                      <p className="text-gray-400">NA to BS EN 1992-1-1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ============= VISUALIZATION TAB ============= */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-white">3D Slab Visualisation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                    <RCSlab3D />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
  );
};

export default RCSlabBending;
