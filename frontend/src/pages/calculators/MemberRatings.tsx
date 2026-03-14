// =============================================================================
// Member Ratings Calculator — Exceptional Edition
// EN 1993 Steel / EN 1992 Concrete / EN 1995 Timber — Multi-Material Capacity
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiEye,
    FiInfo,
    FiLayers,
    FiPlus,
    FiTarget,
    FiTrash2,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import ExplainableLabel from '../../components/ExplainableLabel';
import WhatIfPreview, { type WhatIfSlider } from '../../components/WhatIfPreview';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import MemberRatings3D from '../../components/3d/scenes/MemberRatings3D'; // =============================================================================
import ErrorBoundary from '../../components/ErrorBoundary';
import MouseSpotlight from '../../components/MouseSpotlight';
// TYPE DEFINITIONS
// =============================================================================

type MaterialType = 'steel' | 'concrete' | 'timber';

interface LoadCase {
  id: string;
  name: string;
  moment: string;
  shear: string;
  axial: string;
  limit: string;
}

interface FormData {
  materialType: MaterialType;
  grade: string;
  memberType: string;
  // Dimensions
  length: string;
  width: string;
  depth: string;
  thickness: string;
  diameter: string;
  // Steel section
  sectionName: string;
  // Concrete reinforcement
  mainBars: string;
  links: string;
  // Timber
  serviceClass: string;
  // Load cases
  loadCases: LoadCase[];
  // Project
  projectName: string;
  reference: string;
}

interface CaseResult {
  name: string;
  bendingUtil: number;
  shearUtil: number;
  axialUtil: number;
  deflectionUtil: number;
  combinedUtil: number;
  ltbUtil: number;
  maxUtil: number;
  status: string;
}

interface Results {
  sectionProperties: {
    area: number;
    Ixx: number;
    Wel: number;
    Wpl: number;
  };
  capacities: {
    Mc_Rd: number;
    Vc_Rd: number;
    Nc_Rd: number;
    Mb_Rd: number;
  };
  sectionClass: number;
  caseResults: CaseResult[];
  overallUtilisation: number;
  overallStatus: string;
  rating: string;
  ratingColor: string;
  recommendations: string[];
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const MEMBER_TYPES: Record<MaterialType, { label: string; value: string }[]> = {
  steel: [
    { label: 'Universal Beam (UKB)', value: 'ukb' },
    { label: 'Universal Column (UKC)', value: 'ukc' },
    { label: 'RHS - Rectangular Hollow', value: 'rhs' },
    { label: 'SHS - Square Hollow', value: 'shs' },
    { label: 'CHS - Circular Hollow', value: 'chs' },
    { label: 'PFC - Parallel Flange Channel', value: 'pfc' },
  ],
  concrete: [
    { label: 'Rectangular Beam', value: 'rc_beam' },
    { label: 'Rectangular Column', value: 'rc_column' },
    { label: 'Circular Column', value: 'circ_column' },
    { label: 'T-Beam', value: 't_beam' },
  ],
  timber: [
    { label: 'Solid Rectangular', value: 'solid' },
    { label: 'Glulam', value: 'glulam' },
    { label: 'LVL', value: 'lvl' },
    { label: 'I-Joist', value: 'ijoist' },
  ],
};

const MATERIAL_GRADES: Record<MaterialType, { value: string; fy: number; label: string }[]> = {
  steel: [
    { value: 'S235', fy: 235, label: 'S235 (fy=235 MPa)' },
    { value: 'S275', fy: 275, label: 'S275 (fy=275 MPa)' },
    { value: 'S355', fy: 355, label: 'S355 (fy=355 MPa)' },
    { value: 'S420', fy: 420, label: 'S420 (fy=420 MPa)' },
    { value: 'S460', fy: 460, label: 'S460 (fy=460 MPa)' },
  ],
  concrete: [
    { value: 'C20/25', fy: 20, label: 'C20/25 (fck=20 MPa)' },
    { value: 'C25/30', fy: 25, label: 'C25/30 (fck=25 MPa)' },
    { value: 'C30/37', fy: 30, label: 'C30/37 (fck=30 MPa)' },
    { value: 'C35/45', fy: 35, label: 'C35/45 (fck=35 MPa)' },
    { value: 'C40/50', fy: 40, label: 'C40/50 (fck=40 MPa)' },
    { value: 'C50/60', fy: 50, label: 'C50/60 (fck=50 MPa)' },
  ],
  timber: [
    { value: 'C16', fy: 16, label: 'C16 Softwood' },
    { value: 'C24', fy: 24, label: 'C24 Softwood' },
    { value: 'C30', fy: 30, label: 'C30 Softwood' },
    { value: 'D30', fy: 30, label: 'D30 Hardwood' },
    { value: 'D40', fy: 40, label: 'D40 Hardwood' },
    { value: 'GL24h', fy: 24, label: 'GL24h Glulam' },
    { value: 'GL28h', fy: 28, label: 'GL28h Glulam' },
    { value: 'GL32h', fy: 32, label: 'GL32h Glulam' },
  ],
};

const STEEL_SECTIONS: Record<
  string,
  {
    A: number;
    Iy: number;
    Wel_y: number;
    Wpl_y: number;
    h: number;
    b: number;
    tw: number;
    tf: number;
  }
> = {
  'UKB 457x191x67': {
    A: 85.4,
    Iy: 29400,
    Wel_y: 1296,
    Wpl_y: 1471,
    h: 453.4,
    b: 189.9,
    tw: 8.5,
    tf: 12.7,
  },
  'UKB 406x178x60': {
    A: 76.5,
    Iy: 21600,
    Wel_y: 1063,
    Wpl_y: 1199,
    h: 406.4,
    b: 177.9,
    tw: 7.9,
    tf: 12.8,
  },
  'UKB 356x171x51': {
    A: 64.9,
    Iy: 14100,
    Wel_y: 794,
    Wpl_y: 896,
    h: 355.0,
    b: 171.5,
    tw: 7.4,
    tf: 11.5,
  },
  'UKB 305x165x40': {
    A: 51.5,
    Iy: 8500,
    Wel_y: 556,
    Wpl_y: 623,
    h: 303.4,
    b: 165.0,
    tw: 6.0,
    tf: 10.2,
  },
  'UKB 254x146x31': {
    A: 40.0,
    Iy: 4413,
    Wel_y: 353,
    Wpl_y: 393,
    h: 251.4,
    b: 146.1,
    tw: 6.0,
    tf: 8.6,
  },
  'UKC 305x305x97': {
    A: 123,
    Iy: 22500,
    Wel_y: 1446,
    Wpl_y: 1592,
    h: 307.9,
    b: 305.3,
    tw: 9.9,
    tf: 15.4,
  },
  'UKC 254x254x73': {
    A: 93.1,
    Iy: 11400,
    Wel_y: 898,
    Wpl_y: 992,
    h: 254.1,
    b: 254.6,
    tw: 8.6,
    tf: 14.2,
  },
  'UKC 203x203x46': {
    A: 58.7,
    Iy: 4568,
    Wel_y: 450,
    Wpl_y: 497,
    h: 203.2,
    b: 203.6,
    tw: 7.2,
    tf: 11.0,
  },
};

const SERVICE_CLASSES = [
  { value: '1', label: 'SC1: Interior - MC ≤ 12%', kmod: 0.8 },
  { value: '2', label: 'SC2: Covered - MC ≤ 20%', kmod: 0.7 },
  { value: '3', label: 'SC3: Exposed - MC > 20%', kmod: 0.5 },
];

const PRESETS: Record<string, Partial<FormData>> = {
  bridge_main_girder: {
    materialType: 'steel',
    grade: 'S355',
    memberType: 'ukb',
    sectionName: 'UKB 762x267x173',
    length: '30',
  },
  bridge_crossbeam: {
    materialType: 'steel',
    grade: 'S355',
    memberType: 'ukb',
    sectionName: 'UKB 533x210x82',
    length: '12',
  },
  bridge_pier_column: {
    materialType: 'concrete',
    grade: 'C40/50',
    memberType: 'rc_beam',
    width: '1200',
    depth: '1200',
    mainBars: '12T32',
    links: 'T12@200',
    length: '8',
  },
  deck_slab_strip: {
    materialType: 'concrete',
    grade: 'C35/45',
    memberType: 'rc_beam',
    width: '1000',
    depth: '250',
    mainBars: '6T16',
    links: 'T10@200',
    length: '3',
  },
  bridge_bracing_member: {
    materialType: 'steel',
    grade: 'S275',
    memberType: 'ukc',
    sectionName: 'UKC 203x203x46',
    length: '5',
  },
  footbridge_timber_beam: {
    materialType: 'timber',
    grade: 'GL28h',
    memberType: 'solid',
    width: '200',
    depth: '600',
    serviceClass: '2',
    length: '15',
  },
};

// =============================================================================
// COLLAPSIBLE SECTION COMPONENT
// =============================================================================

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: string;
}> = ({ title, icon, children, defaultOpen = true, color = 'cyan' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colorClasses = {
    cyan: 'border-cyan-500/20 text-cyan-400',
    purple: 'border-purple-500/20 text-purple-400',
    green: 'border-emerald-500/20 text-emerald-400',
    amber: 'border-amber-500/20 text-amber-400',
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden mb-4',
        colorClasses[color as keyof typeof colorClasses],
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={colorClasses[color as keyof typeof colorClasses].split(' ')[1]}>
            {icon}
          </span>
          <span className="text-xl font-bold text-white">{title}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronDown
            className={colorClasses[color as keyof typeof colorClasses].split(' ')[1]}
          />
        </motion.div>
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-4 bg-gray-950/50">{children}</div>
        </motion.div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const MemberRatings: React.FC = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [cameraPos, setCameraPos] = useState<[number, number, number]>([4.5, 2.5, 4.5]);
  const [form, setForm] = useState<FormData>({
    materialType: 'steel',
    grade: 'S355',
    memberType: 'ukb',
    length: '6',
    width: '300',
    depth: '500',
    thickness: '10',
    diameter: '300',
    sectionName: 'UKB 406x178x60',
    mainBars: '4T20',
    links: 'T10@150',
    serviceClass: '1',
    loadCases: [
      { id: '1', name: 'ULS Combo 1', moment: '150', shear: '80', axial: '50', limit: '25' },
    ],
    projectName: 'Member Capacity Analysis',
    reference: 'MR-001',
  });

  useEffect(() => {
    if (results) runCalculation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.materialType,
    form.grade,
    form.sectionName,
    form.length,
    form.width,
    form.depth,
    form.mainBars,
    form.links,
    form.serviceClass,
  ]);


  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => {
      const newForm = { ...prev, [field]: value };
      if (field === 'materialType') {
        newForm.grade = MATERIAL_GRADES[value as MaterialType][0].value;
        newForm.memberType = MEMBER_TYPES[value as MaterialType][0].value;
      }
      return newForm;
    });
  };

  const addLoadCase = () => {
    const newId = (form.loadCases.length + 1).toString();
    setForm((prev) => ({
      ...prev,
      loadCases: [
        ...prev.loadCases,
        { id: newId, name: `Load Case ${newId}`, moment: '0', shear: '0', axial: '0', limit: '25' },
      ],
    }));
  };

  const updateLoadCase = (id: string, field: keyof LoadCase, value: string) => {
    setForm((prev) => ({
      ...prev,
      loadCases: prev.loadCases.map((lc) => (lc.id === id ? { ...lc, [field]: value } : lc)),
    }));
  };

  const removeLoadCase = (id: string) => {
    if (form.loadCases.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      loadCases: prev.loadCases.filter((lc) => lc.id !== id),
    }));
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (preset) {
      setForm((prev) => ({
        ...prev,
        ...preset,
        loadCases: prev.loadCases,
      }));
    }
  };

  // =============================================================================
  // VALIDATION
  // =============================================================================

  const validateInputs = (): boolean => {
    const errors: string[] = [];
    const len = parseFloat(form.length);
    const dep = parseFloat(form.depth);
    const wid = parseFloat(form.width);
    if (form.materialType !== 'steel' || !STEEL_SECTIONS[form.sectionName]) {
      if (isNaN(dep) || dep <= 0) errors.push('Member depth must be a positive number');
      if (isNaN(wid) || wid <= 0) errors.push('Member width must be a positive number');
    }
    if (isNaN(len) || len <= 0) errors.push('Member length must be a positive number');
    const hasLoad = form.loadCases.some(
      (lc) =>
        parseFloat(lc.moment) !== 0 || parseFloat(lc.shear) !== 0 || parseFloat(lc.axial) !== 0,
    );
    if (!hasLoad) errors.push('At least one load case must have non-zero loading');
    if (errors.length > 0) {
      setWarnings(errors);
      return false;
    }
    return true;
  };

  // =============================================================================
  // CALCULATION
  // =============================================================================

  const runCalculation = () => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);

    setTimeout(() => {
      try {
        const newWarnings: string[] = [];
        const gradeData = MATERIAL_GRADES[form.materialType].find((g) => g.value === form.grade);
        const fy = gradeData?.fy || 355;

        let sectionProperties = { area: 0, Ixx: 0, Wel: 0, Wpl: 0 };
        let capacities = { Mc_Rd: 0, Vc_Rd: 0, Nc_Rd: 0, Mb_Rd: 0 };
        let sectionClass = 1;

        if (form.materialType === 'steel') {
          const section = STEEL_SECTIONS[form.sectionName];
          if (section) {
            sectionProperties = {
              area: section.A * 100,
              Ixx: section.Iy * 10000,
              Wel: section.Wel_y * 1000,
              Wpl: section.Wpl_y * 1000,
            };

            // ── Section classification EN 1993-1-1 Table 5.2 ──
            const epsilon = Math.sqrt(235 / fy);
            const cFlange = (section.b - section.tw) / 2; // outstand flange
            const cf_tf = cFlange / section.tf;
            const cWeb = section.h - 2 * section.tf;
            const cw_tw = cWeb / section.tw;
            if (cf_tf <= 9 * epsilon && cw_tw <= 72 * epsilon) sectionClass = 1;
            else if (cf_tf <= 10 * epsilon && cw_tw <= 83 * epsilon) sectionClass = 2;
            else if (cf_tf <= 14 * epsilon && cw_tw <= 124 * epsilon) sectionClass = 3;
            else sectionClass = 4;

            if (sectionClass >= 4)
              newWarnings.push(
                'Class 4 section — effective properties required (not implemented, using gross)',
              );

            const Wuse = sectionClass <= 2 ? sectionProperties.Wpl : sectionProperties.Wel;
            capacities.Mc_Rd = (Wuse * fy) / (1.0 * 1e6);

            // EN 1993-1-1 §6.2.6 shear area
            const Av = Math.max(
              section.A * 100 - 2 * section.b * section.tf + (section.tw + 2 * 0) * section.tf,
              section.h * section.tw,
            );
            capacities.Vc_Rd = (Av * fy) / (Math.sqrt(3) * 1.0 * 1e3);
            capacities.Nc_Rd = (sectionProperties.area * fy) / (1.0 * 1e3);

            // ── LTB — EN 1993-1-1 §6.3.2 simplified approach ──
            const L_mm = parseFloat(form.length) * 1000;
            const Iz_approx =
              (2 * section.b * Math.pow(section.tf, 3)) / 12 +
              ((section.tf * Math.pow(section.b, 3)) / 12) * 2; // approximate weak-axis I
            const hw = section.h - 2 * section.tf;
            const Iw = (Iz_approx * hw * hw) / 4; // warping constant approx
            const It = (2 * section.b * Math.pow(section.tf, 3) + hw * Math.pow(section.tw, 3)) / 3; // torsion constant
            const E = 210000;
            const G = 81000;
            const Mcr =
              (Math.PI / L_mm) *
              Math.sqrt(
                E * Iz_approx * G * It + Math.pow((Math.PI * E) / L_mm, 2) * E * Iz_approx * Iw,
              );
            if (Mcr > 0 && Wuse > 0) {
              const lambda_LT = Math.sqrt((Wuse * fy) / Mcr);
              // Rolled I-sections: buckling curve b → αLT = 0.34
              const alpha_LT = 0.34;
              const phi_LT = 0.5 * (1 + alpha_LT * (lambda_LT - 0.2) + lambda_LT * lambda_LT);
              const chi_LT = Math.min(
                1.0,
                1.0 / (phi_LT + Math.sqrt(phi_LT * phi_LT - lambda_LT * lambda_LT)),
              );
              capacities.Mb_Rd = chi_LT * capacities.Mc_Rd;
            } else {
              capacities.Mb_Rd = capacities.Mc_Rd;
            }
          } else {
            const b = parseFloat(form.width);
            const d = parseFloat(form.depth);
            const t = parseFloat(form.thickness);
            sectionProperties.area = b * d - (b - 2 * t) * (d - 2 * t);
            sectionProperties.Wel = (b * d * d) / 6;
            capacities.Mc_Rd = (sectionProperties.Wel * fy) / 1e6;
            capacities.Mb_Rd = capacities.Mc_Rd;
            capacities.Vc_Rd = (sectionProperties.area * 0.6 * fy) / (Math.sqrt(3) * 1e3);
            capacities.Nc_Rd = (sectionProperties.area * fy) / 1e3;
          }
        } else if (form.materialType === 'concrete') {
          const b = parseFloat(form.width);
          const h = parseFloat(form.depth);
          const fck = fy;
          const fcd = (0.85 * fck) / 1.5;
          const barMatch = form.mainBars.match(/(\d+)T(\d+)/i);
          const nBars = barMatch ? parseInt(barMatch[1]) : 4;
          const barDia = barMatch ? parseInt(barMatch[2]) : 20;
          const As = nBars * Math.PI * (barDia / 2) * (barDia / 2);
          const fyd = 500 / 1.15;
          const cover = 35;
          const d_eff = h - cover - barDia / 2;
          const z = Math.min(0.95 * d_eff, d_eff - (0.4 * (As * fyd)) / (fcd * b));
          capacities.Mc_Rd = (As * fyd * z) / 1e6;
          capacities.Mb_Rd = capacities.Mc_Rd;

          // EN 1992-1-1 §6.2.2 — V_Rd,c
          const rho_l = Math.min(As / (b * d_eff), 0.02);
          const k = Math.min(1 + Math.sqrt(200 / d_eff), 2.0);
          const vRd_c = Math.max(
            0.12 * k * Math.pow(100 * rho_l * fck, 1 / 3),
            0.035 * Math.pow(k, 1.5) * Math.sqrt(fck),
          );
          let Vc_Rd = (vRd_c * b * d_eff) / 1e3;

          // EN 1992-1-1 §6.2.3 — V_Rd,s from shear links
          const linkMatch = form.links.match(/T(\d+)@(\d+)/i);
          if (linkMatch) {
            const linkDia = parseInt(linkMatch[1]);
            const linkSpacing = parseInt(linkMatch[2]);
            const Asw = 2 * Math.PI * (linkDia / 2) * (linkDia / 2); // 2-leg stirrup
            const fywd = Math.min(fyd, 500 / 1.15);
            const cotTheta = 2.5; // θ=21.8° (max cot)
            const VRd_s = ((Asw / linkSpacing) * z * fywd * cotTheta) / 1e3;
            // V_Rd,max — crushing of compression strut
            const nu = 0.6 * (1 - fck / 250);
            const VRd_max = (nu * fcd * b * z * (cotTheta / (1 + cotTheta * cotTheta))) / 1e3;
            Vc_Rd = Math.min(VRd_s, VRd_max);
          }
          capacities.Vc_Rd = Vc_Rd;
          capacities.Nc_Rd = (0.567 * fck * b * h + As * fyd) / 1e3;
          sectionProperties = {
            area: b * h,
            Ixx: (b * h * h * h) / 12,
            Wel: (b * h * h) / 6,
            Wpl: (b * h * h) / 4,
          };
        } else {
          // Timber EN 1995-1-1
          const b = parseFloat(form.width);
          const h = parseFloat(form.depth);
          const fm_k = fy;
          const timberShearMap: Record<string, number> = {
            C16: 3.2,
            C24: 4.0,
            C30: 4.0,
            C35: 4.0,
            C40: 4.0,
            GL24h: 3.5,
            GL28h: 3.5,
            GL32h: 3.5,
          };
          const timberE0Map: Record<string, number> = {
            C16: 8000,
            C24: 11000,
            C30: 12000,
            C35: 13000,
            C40: 14000,
            GL24h: 11500,
            GL28h: 12600,
            GL32h: 13700,
          };
          const fv_k = timberShearMap[form.grade] ?? fm_k * 0.1;
          const fc_0_k = fm_k * 0.8;
          const E0_05 = (timberE0Map[form.grade] ?? 11000) * 0.67; // 5th percentile
          const kmod = SERVICE_CLASSES.find((sc) => sc.value === form.serviceClass)?.kmod || 0.8;
          const gamma_M = 1.3;
          const fm_d = (kmod * fm_k) / gamma_M;
          const fv_d = (kmod * fv_k) / gamma_M;
          const fc_0_d = (kmod * fc_0_k) / gamma_M;

          sectionProperties = {
            area: b * h,
            Ixx: (b * h * h * h) / 12,
            Wel: (b * h * h) / 6,
            Wpl: (b * h * h) / 4,
          };
          capacities.Mc_Rd = (sectionProperties.Wel * fm_d) / 1e6;
          capacities.Vc_Rd = ((2 / 3) * b * h * fv_d) / 1e3;
          capacities.Nc_Rd = (b * h * fc_0_d) / 1e3;

          // EN 1995-1-1 §6.3.3 — column buckling
          const L_mm = parseFloat(form.length) * 1000;
          const i_y = Math.sqrt(sectionProperties.Ixx / (b * h)); // radius of gyration
          const lambda_y = L_mm / i_y;
          const lambda_rel = (lambda_y / Math.PI) * Math.sqrt(fc_0_k / E0_05);
          if (lambda_rel > 0.3) {
            const betaC = 0.2; // solid timber
            const ky = 0.5 * (1 + betaC * (lambda_rel - 0.3) + lambda_rel * lambda_rel);
            const kc_y = 1.0 / (ky + Math.sqrt(ky * ky - lambda_rel * lambda_rel));
            capacities.Nc_Rd = (kc_y * b * h * fc_0_d) / 1e3;
          }
          capacities.Mb_Rd = capacities.Mc_Rd; // timber LTB not typically critical for rectangular
        }

        // ── Per-load-case checks ──
        const L_m = parseFloat(form.length);
        const L = L_m * 1000;
        const caseResults: CaseResult[] = form.loadCases.map((lc) => {
          const M = parseFloat(lc.moment) || 0;
          const V = parseFloat(lc.shear) || 0;
          const N = parseFloat(lc.axial) || 0;
          const defLimit = parseFloat(lc.limit) || 25;

          const bendingUtil = capacities.Mc_Rd > 0 ? (M / capacities.Mc_Rd) * 100 : 0;
          const shearUtil = capacities.Vc_Rd > 0 ? (V / capacities.Vc_Rd) * 100 : 0;
          const axialUtil = capacities.Nc_Rd > 0 ? (N / capacities.Nc_Rd) * 100 : 0;
          const ltbUtil = capacities.Mb_Rd > 0 ? (M / capacities.Mb_Rd) * 100 : 0;

          // Deflection — derive equivalent UDL from M = wL²/8, then δ = 5wL⁴/(384EI)
          const E_mod =
            form.materialType === 'steel'
              ? 210000
              : form.materialType === 'concrete'
                ? 33000
                : 11000;
          const I = sectionProperties.Ixx;
          let delta = 0;
          if (I > 0 && L > 0 && M > 0) {
            const w = (8 * M * 1e6) / (L * L); // N/mm from M = wL²/8
            delta = (5 * w * Math.pow(L, 4)) / (384 * E_mod * I); // mm
          }
          const deflectionUtil = defLimit > 0 ? (delta / defLimit) * 100 : 0;

          // Combined M-N interaction — EN 1993-1-1 §6.2.9 (Class 1/2 I-sections)
          let combinedUtil: number;
          if (form.materialType === 'steel' && sectionClass <= 2 && N > 0 && M > 0) {
            const n = ((N / capacities.Nc_Rd) * 100) / 100; // ratio 0..1
            const a = Math.min(
              0.5,
              (sectionProperties.area - 2 * (steelSec?.b ?? 200) * (steelSec?.tf ?? 12)) /
                sectionProperties.area,
            );
            const MN_Rd = capacities.Mc_Rd * Math.min(1, (1 - n) / (1 - 0.5 * a));
            combinedUtil = MN_Rd > 0 ? (M / MN_Rd) * 100 : 0;
          } else if (form.materialType === 'timber' && N > 0 && M > 0) {
            // EN 1995-1-1 §6.3.2 — combined bending + compression with km = 0.7
            const km = 0.7;
            combinedUtil = ((N * 1e3) / (capacities.Nc_Rd * 1e3)) * 100 + km * bendingUtil;
          } else {
            combinedUtil = (bendingUtil / 100 + axialUtil / 100) * 100;
          }

          const maxUtil = Math.max(
            bendingUtil,
            shearUtil,
            axialUtil,
            deflectionUtil,
            ltbUtil,
            combinedUtil,
          );

          return {
            name: lc.name,
            bendingUtil,
            shearUtil,
            axialUtil,
            deflectionUtil,
            ltbUtil,
            combinedUtil,
            maxUtil,
            status: maxUtil <= 100 ? 'PASS' : maxUtil <= 110 ? 'MARGINAL' : 'FAIL',
          };
        });

        const overallUtil = Math.max(...caseResults.map((r) => r.maxUtil));
        const overallPass = overallUtil <= 100;

        if (overallUtil > 100)
          newWarnings.push('Member capacity exceeded — consider increasing section size');
        if (caseResults.some((r) => r.ltbUtil > r.bendingUtil && r.ltbUtil > 80))
          newWarnings.push('LTB governs over cross-section bending — check lateral restraint');
        if (caseResults.some((r) => r.combinedUtil > 80))
          newWarnings.push('Combined utilisation >80% — check buckling interaction');
        if (sectionClass >= 3 && form.materialType === 'steel')
          newWarnings.push(`Section is Class ${sectionClass} — elastic capacity used`);

        let rating = 'CRITICAL';
        let ratingColor = '#EF4444';
        if (overallUtil <= 70) {
          rating = 'OPTIMAL';
          ratingColor = '#10B981';
        } else if (overallUtil <= 85) {
          rating = 'EFFICIENT';
          ratingColor = '#22D3EE';
        } else if (overallUtil <= 100) {
          rating = 'ACCEPTABLE';
          ratingColor = '#F59E0B';
        }

        const recommendations: string[] = [];
        if (!overallPass) {
          recommendations.push('Increase section size to reduce utilisation');
          recommendations.push('Consider higher material grade');
          recommendations.push('Reduce span length if possible');
        }
        if (capacities.Mb_Rd < capacities.Mc_Rd * 0.95 && form.materialType === 'steel') {
          recommendations.push(
            'LTB reduces moment capacity — provide lateral restraints or reduce unbraced length',
          );
        }
        if (sectionClass >= 3 && form.materialType === 'steel') {
          recommendations.push('Class 3/4 section — consider compact section for plastic capacity');
        }

        setResults({
          sectionProperties,
          capacities,
          sectionClass,
          caseResults,
          overallUtilisation: overallUtil,
          overallStatus: overallPass ? 'PASS' : 'FAIL',
          rating,
          ratingColor,
          recommendations,
        });

        setWarnings(newWarnings);
        setIsCalculating(false);
        setActiveTab('results');
      } catch (err) {
        console.error('[MemberRatings] Calculation error:', err);
        setWarnings([`Calculation error: ${err instanceof Error ? err.message : String(err)}`]);
        setIsCalculating(false);
      }
    }, 600);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!results) return;

    const matCode =
      form.materialType === 'steel'
        ? 'EN 1993-1-1'
        : form.materialType === 'concrete'
          ? 'EN 1992-1-1'
          : 'EN 1995-1-1';
    const governing = results.caseResults.reduce(
      (max, c) => (c.maxUtil > max.maxUtil ? c : max),
      results.caseResults[0],
    );
    const getStatus = (u: number): 'PASS' | 'FAIL' => (u <= 100 ? 'PASS' : 'FAIL');

    generatePremiumPDF({
      title: 'Member Ratings Report',
      subtitle: `${matCode} — ${form.grade} ${form.sectionName || `${form.width}×${form.depth}`}`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'MR-001' },
      ],
      inputs: [
        {
          label: 'Material',
          value: form.materialType.charAt(0).toUpperCase() + form.materialType.slice(1),
        },
        { label: 'Grade', value: form.grade },
        { label: 'Section', value: form.sectionName || `${form.width}×${form.depth} mm` },
        { label: 'Span Length', value: `${form.length} m` },
        ...(form.materialType === 'concrete'
          ? [
              { label: 'Main Bars', value: form.mainBars },
              { label: 'Links', value: form.links },
            ]
          : []),
        ...(form.materialType === 'timber'
          ? [{ label: 'Service Class', value: form.serviceClass }]
          : []),
      ],
      sections: [
        {
          title: 'Section Capacities',
          items: [
            {
              label: 'Moment Capacity (M_Rd)',
              value: `${results.capacities.Mc_Rd.toFixed(1)} kNm`,
              highlight: true,
            },
            {
              label: 'Shear Capacity (V_Rd)',
              value: `${results.capacities.Vc_Rd.toFixed(1)} kN`,
              highlight: true,
            },
            {
              label: 'Axial Capacity (N_Rd)',
              value: `${results.capacities.Nc_Rd.toFixed(1)} kN`,
              highlight: true,
            },
            ...(form.materialType === 'steel' && results.capacities.Mb_Rd > 0
              ? [
                  {
                    label: 'LTB Capacity (M_b,Rd)',
                    value: `${results.capacities.Mb_Rd.toFixed(1)} kNm`,
                    highlight: true,
                  },
                ]
              : []),
            ...(form.materialType === 'steel'
              ? [
                  {
                    label: 'Section Class',
                    value: `Class ${results.sectionClass}`,
                    highlight: false,
                  },
                ]
              : []),
            { label: 'Overall Rating', value: results.rating, highlight: true },
            { label: 'Governing Case', value: governing?.name || '-' },
          ],
        },
        {
          title: 'Load Case Results',
          head: [
            [
              'Load Case',
              'Bending %',
              'Shear %',
              'Axial %',
              ...(form.materialType === 'steel' ? ['LTB %'] : []),
              'Deflection %',
              'Combined %',
              'Status',
            ],
          ],
          body: results.caseResults.map((cr) => [
            cr.name,
            cr.bendingUtil.toFixed(1),
            cr.shearUtil.toFixed(1),
            cr.axialUtil.toFixed(1),
            ...(form.materialType === 'steel' ? [cr.ltbUtil.toFixed(1)] : []),
            cr.deflectionUtil.toFixed(1),
            cr.combinedUtil.toFixed(1),
            cr.status,
          ]),
        },
      ],
      checks: [
        {
          name: `Bending (${matCode} §6.2.5)`,
          capacity: `${results.capacities.Mc_Rd.toFixed(1)} kNm`,
          utilisation: `${governing?.bendingUtil?.toFixed(1) ?? '0'}%`,
          status: getStatus(governing?.bendingUtil ?? 0),
        },
        {
          name: `Shear (${matCode} §6.2.6)`,
          capacity: `${results.capacities.Vc_Rd.toFixed(1)} kN`,
          utilisation: `${governing?.shearUtil?.toFixed(1) ?? '0'}%`,
          status: getStatus(governing?.shearUtil ?? 0),
        },
        {
          name: `Axial (${matCode} §6.2.4)`,
          capacity: `${results.capacities.Nc_Rd.toFixed(1)} kN`,
          utilisation: `${governing?.axialUtil?.toFixed(1) ?? '0'}%`,
          status: getStatus(governing?.axialUtil ?? 0),
        },
        {
          name: 'Deflection (Serviceability)',
          capacity: '-',
          utilisation: `${governing?.deflectionUtil?.toFixed(1) ?? '0'}%`,
          status: getStatus(governing?.deflectionUtil ?? 0),
        },
        ...(form.materialType === 'steel' && results.capacities.Mb_Rd > 0
          ? [
              {
                name: `LTB Buckling (${matCode} §6.3.2)`,
                capacity: `${results.capacities.Mb_Rd.toFixed(1)} kNm`,
                utilisation: `${governing?.ltbUtil?.toFixed(1) ?? '0'}%`,
                status: getStatus(governing?.ltbUtil ?? 0),
              },
            ]
          : []),
        {
          name: 'Combined Interaction',
          capacity: '-',
          utilisation: `${governing?.combinedUtil?.toFixed(1) ?? '0'}%`,
          status: getStatus(governing?.combinedUtil ?? 0),
        },
      ],
      recommendations:
        results.recommendations.length > 0
          ? results.recommendations.map((r) => ({ check: 'Design', suggestion: r }))
          : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      footerNote: `Beaver Bridges Ltd — Member Rating per ${matCode}`,
    });
  };

  // DOCX Export — Editable Word document
  const handleExportDOCX = () => {
    if (!results) return;
    const matCode =
      form.materialType === 'steel'
        ? 'EN 1993-1-1'
        : form.materialType === 'concrete'
          ? 'EN 1992-1-1'
          : 'EN 1995-1-1';
    const governing = results.caseResults.reduce(
      (max, c) => (c.maxUtil > max.maxUtil ? c : max),
      results.caseResults[0],
    );
    generateDOCX({
      title: 'Member Ratings Report',
      subtitle: `${matCode} — ${form.grade} ${form.sectionName || `${form.width}×${form.depth}`}`,
      projectInfo: [
        { label: 'Project', value: form.projectName || '-' },
        { label: 'Reference', value: form.reference || 'MR-001' },
      ],
      inputs: [
        {
          label: 'Material',
          value: form.materialType.charAt(0).toUpperCase() + form.materialType.slice(1),
          unit: '',
        },
        { label: 'Grade', value: form.grade, unit: '' },
        { label: 'Section', value: form.sectionName || `${form.width}×${form.depth} mm`, unit: '' },
        { label: 'Span Length', value: form.length, unit: 'm' },
      ],
      checks: [
        {
          name: 'Bending',
          capacity: `${results.capacities.Mc_Rd?.toFixed(1) || '-'} kNm`,
          utilisation: `${governing?.bendingUtil?.toFixed(1) || '-'}%`,
          status: ((governing?.bendingUtil || 0) <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `${results.capacities.Vc_Rd?.toFixed(1) || '-'} kN`,
          utilisation: `${governing?.shearUtil?.toFixed(1) || '-'}%`,
          status: ((governing?.shearUtil || 0) <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Axial',
          capacity: `${results.capacities.Nc_Rd?.toFixed(1) || '-'} kN`,
          utilisation: `${governing?.axialUtil?.toFixed(1) || '-'}%`,
          status: ((governing?.axialUtil || 0) <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Combined',
          capacity: '-',
          utilisation: `${governing?.combinedUtil?.toFixed(1) || '-'}%`,
          status: ((governing?.combinedUtil || 0) <= 100 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations:
        results.recommendations?.length > 0
          ? results.recommendations.map((r) => ({ check: 'Design', suggestion: r }))
          : [{ check: 'Overall', suggestion: 'Design adequate' }],
      warnings: warnings || [],
      footerNote: `Beaver Bridges Ltd — Member Rating per ${matCode}`,
    });
  };

  // =============================================================================
  // DERIVED VALUES
  // =============================================================================
  const overallPass = results ? results.overallStatus === 'PASS' : true;
  const maxUtil = results?.overallUtilisation ?? 0;
  const matCode =
    form.materialType === 'steel'
      ? 'EN 1993-1-1'
      : form.materialType === 'concrete'
        ? 'EN 1992-1-1'
        : 'EN 1995-1-1';
  const governing = results?.caseResults?.reduce(
    (max, c) => (c.maxUtil > max.maxUtil ? c : max),
    results.caseResults[0],
  );

  // Section props for 3D
  const steelSec = STEEL_SECTIONS[form.sectionName];
  const sec3dDepth = steelSec ? steelSec.h : parseFloat(form.depth) || 500;
  const sec3dWidth = steelSec ? steelSec.b : parseFloat(form.width) || 300;
  const sec3dTf = steelSec ? steelSec.tf : 12;
  const sec3dTw = steelSec ? steelSec.tw : 8;

  // What-if sliders config
  const whatIfSliders = [
    {
      key: 'length' as keyof FormData,
      label: 'Span Length',
      unit: 'm',
      min: 1,
      max: 40,
      step: 0.5,
    },
    ...(form.materialType !== 'steel'
      ? [
          {
            key: 'depth' as keyof FormData,
            label: 'Section Depth',
            unit: 'mm',
            min: 100,
            max: 2000,
            step: 25,
          },
          {
            key: 'width' as keyof FormData,
            label: 'Section Width',
            unit: 'mm',
            min: 50,
            max: 1000,
            step: 25,
          },
        ]
      : []),
  ];

  // Camera presets
  const cameraPresets: { label: string; icon: string; pos: [number, number, number] }[] = [
    { label: '3D', icon: '🎯', pos: [4.5, 2.5, 4.5] },
    { label: 'Front', icon: '🏠', pos: [0, 1.2, 6] },
    { label: 'Side', icon: '↔️', pos: [6, 1.2, 0] },
    { label: 'Top', icon: '⬇️', pos: [0, 8, 0.1] },
    { label: 'Section', icon: '🔍', pos: [0.3, 1, 0.3] },
  ];

  // 3D scene element (shared across usages)
  const render3DScene = (height: string) => (
    <ErrorBoundary
      fallback={
        <div
          className={`relative ${height} w-full rounded-xl overflow-hidden border border-gray-700/50 bg-gray-950 flex items-center justify-center`}
        >
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
              <FiLayers className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-gray-400 text-sm">3D preview unavailable</p>
            <p className="text-gray-500 text-xs">Your browser may have limited WebGL support</p>
          </div>
        </div>
      }
    >
      <Interactive3DDiagram
        height={height}
        cameraPosition={cameraPos}
        cameraTarget={[0, 0.8, 0]}
        status={overallPass ? 'PASS' : 'FAIL'}
      >
        <MemberRatings3D
          materialType={form.materialType}
          memberType={form.memberType}
          spanLength={parseFloat(form.length) || 6}
          sectionDepth={sec3dDepth}
          sectionWidth={sec3dWidth}
          flangeThk={sec3dTf}
          webThk={sec3dTw}
          appliedMoment={(() => {
            const gc = governing
              ? form.loadCases.find((lc) => lc.name === governing.name)
              : form.loadCases[0];
            return parseFloat(gc?.moment ?? '0') || (governing ? 0 : 150);
          })()}
          appliedShear={(() => {
            const gc = governing
              ? form.loadCases.find((lc) => lc.name === governing.name)
              : form.loadCases[0];
            return parseFloat(gc?.shear ?? '0') || (governing ? 0 : 80);
          })()}
          appliedAxial={(() => {
            const gc = governing
              ? form.loadCases.find((lc) => lc.name === governing.name)
              : form.loadCases[0];
            return parseFloat(gc?.axial ?? '0') || 0;
          })()}
          momentCapacity={results?.capacities.Mc_Rd ?? 0}
          shearCapacity={results?.capacities.Vc_Rd ?? 0}
          utilisation={maxUtil}
          rating={results?.rating ?? 'OPTIMAL'}
          status={overallPass ? 'PASS' : 'FAIL'}
        />
      </Interactive3DDiagram>
    </ErrorBoundary>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-full glass border border-neon-cyan/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiLayers className="text-neon-cyan" size={24} />
            <span className="text-white font-semibold">{matCode}</span>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-8 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2 mx-auto w-fit">
            {['input', 'results', 'visualization'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'neon' : 'ghost'}
                onClick={() => setActiveTab(tab as any)}
                disabled={tab !== 'input' && !results}
                className={cn(
                  'px-8 py-3 rounded-xl font-semibold capitalize',
                  activeTab === tab
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    : 'text-gray-400',
                )}
              >
                {tab === 'input'
                  ? '🏗️ Input'
                  : tab === 'results'
                    ? '📊 Results'
                    : '🎨 Visualization'}
              </Button>
            ))}
          </div>

          <h1 className="text-6xl font-black mb-6">
            <span className="bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
              Member Ratings
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">EN 1993-2 structural member capacity checks</p>
          <div className="flex items-center justify-center space-x-6 mt-8">
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Bending Capacity</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Shear & Axial</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Combined Interaction</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Deflection Check</span>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════════════════
              INPUT TAB
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Left Column — Inputs */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bridge Presets */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                          <FiZap className="text-neon-cyan w-6 h-6" />
                        </motion.div>
                        <span>Quick Presets</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(PRESETS).map(([key]) => (
                          <Button
                            key={key}
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreset(key)}
                            className="border-gray-600 hover:border-neon-cyan hover:text-neon-cyan transition-all duration-300"
                          >
                            {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Material & Section */}
                <CollapsibleSection
                  title="Material & Section"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiLayers className="text-neon-cyan w-6 h-6" />
                    </motion.div>
                  }
                  color="purple"
                >
                  <div className="space-y-4">
                    {/* Material Type Toggle */}
                    <div>
                      <ExplainableLabel
                        label="Material Type"
                        field="rating-material-type"
                        className="block text-sm font-semibold text-gray-200 mb-2"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {(['steel', 'concrete', 'timber'] as const).map((mat) => (
                          <Button
                            key={mat}
                            variant={form.materialType === mat ? 'neon' : 'outline'}
                            onClick={() => updateForm('materialType', mat)}
                            className={cn(
                              'transition-all duration-300',
                              form.materialType === mat
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                : 'border-gray-600 hover:border-neon-cyan',
                            )}
                          >
                            {mat.charAt(0).toUpperCase() + mat.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <ExplainableLabel
                          label="Material Grade"
                          field="rating-material-grade"
                          className="block text-sm font-semibold text-gray-200 mb-1"
                        />
                        <select
                          title="Grade"
                          value={form.grade}
                          onChange={(e) => updateForm('grade', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                        >
                          {MATERIAL_GRADES[form.materialType].map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <ExplainableLabel
                          label="Member Type"
                          field="rating-member-type"
                          className="block text-sm font-semibold text-gray-200 mb-1"
                        />
                        <select
                          title="Member Type"
                          value={form.memberType}
                          onChange={(e) => updateForm('memberType', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                        >
                          {MEMBER_TYPES[form.materialType].map((mt) => (
                            <option key={mt.value} value={mt.value}>
                              {mt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Steel Section Selection */}
                    {form.materialType === 'steel' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-1">Section</label>
                        <select
                          title="Section"
                          value={form.sectionName}
                          onChange={(e) => updateForm('sectionName', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                        >
                          {Object.keys(STEEL_SECTIONS).map((sec) => (
                            <option key={sec} value={sec}>
                              {sec}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Concrete/Timber Dimensions */}
                    {form.materialType !== 'steel' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-200 mb-1">Width <span className="text-neon-cyan text-xs">(mm)</span></label>
                          <input
                            title="Width (mm)"
                            type="number"
                            value={form.width}
                            onChange={(e) => updateForm('width', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-200 mb-1">Depth <span className="text-neon-cyan text-xs">(mm)</span></label>
                          <input
                            title="Depth (mm)"
                            type="number"
                            value={form.depth}
                            onChange={(e) => updateForm('depth', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                          />
                        </div>
                      </div>
                    )}

                    {/* Timber Service Class */}
                    {form.materialType === 'timber' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-1">Service Class</label>
                        <select
                          title="Service Class"
                          value={form.serviceClass}
                          onChange={(e) => updateForm('serviceClass', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                        >
                          {SERVICE_CLASSES.map((sc) => (
                            <option key={sc.value} value={sc.value}>
                              {sc.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Span Length */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Span Length <span className="text-neon-cyan text-xs">(m)</span></label>
                      <input
                        title="Span Length (m)"
                        type="number"
                        value={form.length}
                        onChange={(e) => updateForm('length', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-300"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Load Cases */}
                <CollapsibleSection
                  title="Load Cases"
                  icon={
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiTarget className="text-neon-cyan w-6 h-6" />
                    </motion.div>
                  }
                  color="cyan"
                >
                  <div className="space-y-4">
                    {form.loadCases.map((lc) => (
                      <div
                        key={lc.id}
                        className="p-4 bg-gray-900/40 rounded-xl border border-gray-700/50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <input
                            title="Load case name"
                            type="text"
                            value={lc.name}
                            onChange={(e) => updateLoadCase(lc.id, 'name', e.target.value)}
                            className="bg-transparent text-white font-medium focus:outline-none border-b border-transparent focus:border-neon-cyan"
                          />
                          {form.loadCases.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLoadCase(lc.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <FiTrash2 />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { field: 'moment' as const, label: 'Moment (kNm)', val: lc.moment },
                            { field: 'shear' as const, label: 'Shear (kN)', val: lc.shear },
                            { field: 'axial' as const, label: 'Axial (kN)', val: lc.axial },
                            { field: 'limit' as const, label: 'Def. Limit (mm)', val: lc.limit },
                          ].map(({ field, label, val }) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1">{label}</label>
                              <input
                                title={label}
                                type="number"
                                value={val}
                                onChange={(e) => updateLoadCase(lc.id, field, e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/20 transition-all"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={addLoadCase}
                      className="w-full border-dashed border-gray-600 hover:border-neon-cyan hover:text-neon-cyan transition-all"
                    >
                      <FiPlus className="mr-2" />
                      Add Load Case
                    </Button>
                  </div>
                </CollapsibleSection>

                {/* Calculate & Export Buttons */}
                <div className="flex justify-center gap-4 pt-4">
                  <Button
                    onClick={runCalculation}
                    disabled={isCalculating}
                    className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:scale-105 transition-transform duration-300 shadow-2xl cyber-glow-blue"
                  >
                    {isCalculating ? (
                      <FiActivity className="animate-spin mr-2" />
                    ) : null}
                    ⚡ RUN FULL ANALYSIS
                  </Button>
                  {results && (
                    <>
                      <Button
                        onClick={handleExportPDF}
                        variant="outline"
                        className="px-8 py-6 border-neon-cyan/50 hover:bg-neon-cyan/10 text-lg"
                      >
                        <FiDownload className="mr-2" />
                        PDF
                      </Button>
                      <Button
                        onClick={handleExportDOCX}
                        variant="outline"
                        className="px-8 py-6 border-purple-500/50 hover:bg-purple-500/10 text-lg"
                      >
                        <FiDownload className="mr-2" />
                        DOCX
                      </Button>
                      <SaveRunButton
                        calculatorKey="member_ratings"
                        inputs={form as unknown as Record<string, string>}
                        results={results}
                        status={overallPass ? 'PASS' : 'FAIL'}
                        summary={results ? `${maxUtil.toFixed(1)}% util` : undefined}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Right Column — 3D Preview */}
              <div className="space-y-4 lg:sticky lg:top-8">
                <WhatIfPreview
                  title="Section Preview"
                  renderScene={render3DScene}
                  sliders={whatIfSliders as WhatIfSlider[]}
                  form={form as unknown as Record<string, any>}
                  updateForm={updateForm}
                  status={overallPass ? 'PASS' : 'FAIL'}
                  utilisation={maxUtil}
                />

                {/* Design Code Reference */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiInfo className="text-neon-cyan w-6 h-6" />
                      </motion.div>
                      <span>Design Code Reference</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-1">
                    {form.materialType === 'steel' && (
                      <>
                        <p>• EN 1993-1-1 Steel Design</p>
                        <p>• Clause 6.2 — Cross-section resistance</p>
                        <p>• Class 1/2 plastic capacity assumed</p>
                        <p>• γ_M0 = 1.0 for cross-section checks</p>
                      </>
                    )}
                    {form.materialType === 'concrete' && (
                      <>
                        <p>• EN 1992-1-1 Concrete Design</p>
                        <p>• Rectangular stress block (α_cc = 0.85)</p>
                        <p>• Reinforcement f_yk = 500 MPa, γ_s = 1.15</p>
                        <p>• Shear per Clause 6.2.2</p>
                      </>
                    )}
                    {form.materialType === 'timber' && (
                      <>
                        <p>• EN 1995-1-1 Timber Design</p>
                        <p>• k_mod applied per service class</p>
                        <p>• γ_M = 1.3 material partial factor</p>
                        <p>• Combined bending/axial per §6.3</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              RESULTS TAB
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Results Cards */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Overall Rating */}
                  <div className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FiTarget size={12} /> Overall Assessment
                  </div>

                  {/* Border-l-4 Summary Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="border-l-4 border-neon-cyan bg-gray-900/50 rounded-r-xl p-4 flex items-center space-x-3">
                      <FiCheck className="text-neon-cyan w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-400">Overall Status</div>
                        <div className="text-lg font-bold text-white">{results.overallStatus}</div>
                      </div>
                    </div>
                    <div className="border-l-4 border-purple-400 bg-gray-900/50 rounded-r-xl p-4 flex items-center space-x-3">
                      <FiCheck className="text-purple-400 w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-400">Peak Utilisation</div>
                        <div className="text-lg font-bold text-white">{results.overallUtilisation.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="border-l-4 border-emerald-400 bg-gray-900/50 rounded-r-xl p-4 flex items-center space-x-3">
                      <FiCheck className="text-emerald-400 w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-400">Load Cases</div>
                        <div className="text-lg font-bold text-white">{results.caseResults.length} checked</div>
                      </div>
                    </div>
                    <div className="border-l-4 border-amber-400 bg-gray-900/50 rounded-r-xl p-4 flex items-center space-x-3">
                      <FiCheck className="text-amber-400 w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-gray-400">Rating</div>
                        <div className="text-lg font-bold" style={{ color: results.ratingColor }}>{results.rating}</div>
                      </div>
                    </div>
                  </div>
                  <Card
                    className="border-2 shadow-lg"
                    style={{
                      borderColor: results.ratingColor,
                      backgroundColor: `${results.ratingColor}10`,
                      boxShadow: `0 10px 15px -3px ${results.ratingColor}15`,
                    }}
                  >
                    <CardContent className="py-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white">Overall Assessment</h3>
                          <p className="text-gray-400">
                            Maximum utilisation across all load cases
                          </p>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-4xl font-bold"
                            style={{ color: results.ratingColor }}
                          >
                            {results.rating}
                          </div>
                          <div className="text-2xl text-white">
                            {results.overallUtilisation.toFixed(1)}%
                          </div>
                          {form.materialType === 'steel' && results.sectionClass > 0 && (
                            <div className="mt-1">
                              <span
                                className={cn(
                                  'text-xs px-2 py-0.5 rounded-full font-medium',
                                  results.sectionClass <= 2
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/20 text-amber-400',
                                )}
                              >
                                Class {results.sectionClass}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Load Case Results Table */}
                  <div className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-6">
                    <FiActivity size={12} /> Load Case Results
                  </div>
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                          <FiActivity className="text-neon-cyan w-6 h-6" />
                        </motion.div>
                        <span>Load Case Utilisations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700 text-gray-400">
                              <th className="text-left py-2 px-2">Load Case</th>
                              <th className="text-center py-2 px-2">Bending</th>
                              <th className="text-center py-2 px-2">Shear</th>
                              <th className="text-center py-2 px-2">Axial</th>
                              {form.materialType === 'steel' && (
                                <th className="text-center py-2 px-2">LTB</th>
                              )}
                              <th className="text-center py-2 px-2">Deflection</th>
                              <th className="text-center py-2 px-2">Combined</th>
                              <th className="text-center py-2 px-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.caseResults.map((cr, idx) => (
                              <tr key={idx} className="border-b border-gray-700/50">
                                <td className="py-3 px-2 text-white font-medium">{cr.name}</td>
                                {(
                                  [
                                    'bendingUtil',
                                    'shearUtil',
                                    'axialUtil',
                                    ...(form.materialType === 'steel' ? ['ltbUtil' as const] : []),
                                    'deflectionUtil',
                                    'combinedUtil',
                                  ] as const
                                ).map((u) => (
                                  <td key={u} className="py-3 px-2 text-center">
                                    <span
                                      className={
                                        (cr[u as keyof typeof cr] as number) > 100
                                          ? 'text-red-400'
                                          : (cr[u as keyof typeof cr] as number) > 80
                                            ? 'text-amber-400'
                                            : 'text-gray-300'
                                      }
                                    >
                                      {(cr[u as keyof typeof cr] as number).toFixed(1)}%
                                    </span>
                                  </td>
                                ))}
                                <td className="py-3 px-2 text-center">
                                  <span
                                    className={cn(
                                      'px-2 py-1 rounded text-xs font-bold',
                                      cr.status === 'PASS'
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : cr.status === 'MARGINAL'
                                          ? 'bg-amber-500/20 text-amber-400'
                                          : 'bg-red-500/20 text-red-400',
                                    )}
                                  >
                                    {cr.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section Capacities */}
                  <Card
                    variant="glass"
                    className="border-neon-cyan/30 shadow-2xl"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                          <FiTarget className="text-neon-cyan w-6 h-6" />
                        </motion.div>
                        <span>Section Capacities ({matCode})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          {
                            label: 'Moment Capacity',
                            val: results.capacities.Mc_Rd,
                            unit: 'kNm',
                            clause: '§6.2.5',
                          },
                          {
                            label: 'Shear Capacity',
                            val: results.capacities.Vc_Rd,
                            unit: 'kN',
                            clause: '§6.2.6',
                          },
                          {
                            label: 'Axial Capacity',
                            val: results.capacities.Nc_Rd,
                            unit: 'kN',
                            clause: '§6.2.4',
                          },
                          ...(form.materialType === 'steel' && results.capacities.Mb_Rd > 0
                            ? [
                                {
                                  label: 'LTB Capacity',
                                  val: results.capacities.Mb_Rd,
                                  unit: 'kNm',
                                  clause: '§6.3.2',
                                },
                              ]
                            : []),
                        ].map((cap) => (
                          <div
                            key={cap.label}
                            className="p-4 bg-gray-900/50 rounded-xl text-center border border-gray-700/30"
                          >
                            <div className="text-gray-400 text-sm mb-1">{cap.label}</div>
                            <div className="text-2xl font-bold text-white">
                              {cap.val.toFixed(1)}
                            </div>
                            <div className="text-neon-cyan text-xs">{cap.unit}</div>
                            <div className="text-gray-500 text-xs mt-1">{cap.clause}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column — Summary */}
                <div className="space-y-4 lg:sticky lg:top-8">
                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <Card className="bg-amber-500/10 border-amber-500/40 shadow-2xl">
                      <CardContent className="py-4">
                        <div className="flex items-center space-x-3 text-amber-400 mb-3">
                          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiAlertTriangle className="text-amber-400 w-6 h-6" />
                          </motion.div>
                          <span className="text-xl font-bold text-white">Warnings</span>
                        </div>
                        <ul className="text-sm text-white space-y-2">
                          {warnings.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {results.recommendations.length > 0 && (
                    <Card
                      variant="glass"
                      className="border-neon-cyan/30 shadow-2xl"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiInfo className="text-neon-cyan w-6 h-6" />
                          </motion.div>
                          <span>Recommendations</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm text-gray-300 space-y-2">
                          {results.recommendations.map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-neon-cyan mt-1">→</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Design Summary */}
                  <Card
                    variant="glass"
                    className="border-neon-cyan/30 shadow-2xl"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                          <FiLayers className="text-neon-cyan w-6 h-6" />
                        </motion.div>
                        <span>Design Summary</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {[
                        {
                          label: 'Material',
                          value:
                            form.materialType.charAt(0).toUpperCase() + form.materialType.slice(1),
                        },
                        { label: 'Grade', value: form.grade },
                        ...(form.materialType === 'steel'
                          ? [{ label: 'Section', value: form.sectionName }]
                          : []),
                        { label: 'Span', value: `${form.length} m` },
                        { label: 'Load Cases', value: String(form.loadCases.length) },
                        { label: 'Design Code', value: matCode },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between">
                          <span className="text-gray-400">{row.label}</span>
                          <span className="text-white">{row.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              VISUALIZATION TAB
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiEye className="text-neon-cyan w-6 h-6" />
                          </motion.div>
                          <span>3D Structural Model</span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Camera Preset Buttons */}
                      <div className="flex gap-2 mb-3">
                        {cameraPresets.map((p) => (
                          <button
                            key={p.label}
                            onClick={() => setCameraPos(p.pos)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                              cameraPos[0] === p.pos[0] &&
                                cameraPos[1] === p.pos[1] &&
                                cameraPos[2] === p.pos[2]
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-gray-800/40 border-gray-700/30 text-gray-400 hover:text-white hover:border-gray-600',
                            )}
                          >
                            {p.icon} {p.label}
                          </button>
                        ))}
                      </div>
                      {render3DScene('h-[500px]')}
                    </CardContent>
                  </Card>
                </div>

                {/* Utilisation Breakdown */}
                <div className="space-y-4 lg:sticky lg:top-8">
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                          <FiActivity className="text-neon-cyan w-6 h-6" />
                        </motion.div>
                        <span>Utilisation Breakdown</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {governing && (
                        <>
                          <div className="text-sm text-gray-400 mb-2">
                            Governing: {governing.name}
                          </div>
                          {[
                            { label: 'Bending', val: governing.bendingUtil, clause: '§6.2.5' },
                            { label: 'Shear', val: governing.shearUtil, clause: '§6.2.6' },
                            { label: 'Axial', val: governing.axialUtil, clause: '§6.2.4' },
                            ...(form.materialType === 'steel' && results.capacities.Mb_Rd > 0
                              ? [{ label: 'LTB', val: governing.ltbUtil, clause: '§6.3.2' }]
                              : []),
                            { label: 'Deflection', val: governing.deflectionUtil, clause: 'SLS' },
                            { label: 'Combined', val: governing.combinedUtil, clause: '§6.2.1' },
                          ].map((bar) => (
                            <div key={bar.label}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">
                                  {bar.label} <span className="text-gray-600">({bar.clause})</span>
                                </span>
                                <span
                                  className={
                                    bar.val > 100
                                      ? 'text-red-400'
                                      : bar.val > 80
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                  }
                                >
                                  {bar.val.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, bar.val)}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={cn(
                                    'h-full rounded-full',
                                    bar.val > 100
                                      ? 'bg-red-500'
                                      : bar.val > 80
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500',
                                  )}
                                />
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Section Properties */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-white flex items-center space-x-3">
                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }} className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                          <FiLayers className="text-neon-cyan w-6 h-6" />
                        </motion.div>
                        <span>Section Properties</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {[
                        {
                          label: 'Area',
                          value: `${results.sectionProperties.area.toFixed(0)} mm²`,
                        },
                        {
                          label: 'I_xx',
                          value: `${(results.sectionProperties.Ixx / 1e4).toFixed(0)} cm⁴`,
                        },
                        {
                          label: 'W_el',
                          value: `${(results.sectionProperties.Wel / 1e3).toFixed(1)} cm³`,
                        },
                        {
                          label: 'W_pl',
                          value: `${(results.sectionProperties.Wpl / 1e3).toFixed(1)} cm³`,
                        },
                      ].map((p) => (
                        <div key={p.label} className="flex justify-between">
                          <span className="text-gray-400 font-mono">{p.label}</span>
                          <span className="text-white font-mono">{p.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid pattern CSS */}
      <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 217, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
};

export default MemberRatings;
