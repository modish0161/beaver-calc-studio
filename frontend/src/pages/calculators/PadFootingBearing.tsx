// =============================================================================
// Pad Footing Bearing Calculator — Premium Edition
// EN 1997-1:2004 (Eurocode 7) compliant geotechnical analysis
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
    FiLayers,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTarget,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import PadFooting3D from '../../components/3d/scenes/PadFooting3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Footing Geometry
  footingLength: string;
  footingWidth: string;
  footingDepth: string;
  embedmentDepth: string;
  // Loading
  verticalLoad: string;
  horizontalLoadX: string;
  horizontalLoadY: string;
  momentX: string;
  momentY: string;
  // Soil Properties
  soilType: string;
  bearingCapacity: string;
  unitWeight: string;
  frictionAngle: string;
  cohesion: string;
  // Design Parameters
  designApproach: string;
  partialFactorBearing: string;
  partialFactorSliding: string;
  // Project Info
  projectName: string;
  reference: string;
}

interface Results {
  // Geometry
  footingArea: number;
  aspectRatio: number;
  // Eccentricity
  eccentricityX: number;
  eccentricityY: number;
  effectiveLengthX: number;
  effectiveLengthY: number;
  effectiveArea: number;
  // Bearing
  bearingPressure: number;
  allowableBearing: number;
  bearingUtilisation: number;
  bearingStatus: string;
  // Sliding
  slidingResistance: number;
  slidingDemand: number;
  slidingUtilisation: number;
  slidingStatus: string;
  // Overturning
  overturningMoment: number;
  resistingMoment: number;
  overturningFOS: number;
  overturningStatus: string;
  // Settlement
  immediateSettlement: number;
  consolidationSettlement: number;
  totalSettlement: number;
  // Overall
  overallStatus: string;
  rating: string;
  ratingColor: string;
}

// =============================================================================
// REFERENCE DATA
// =============================================================================

const SOIL_TYPES = {
  soft_clay: {
    name: 'Soft Clay',
    bearing: 75,
    gamma: 16,
    phi: 0,
    cohesion: 25,
    description: 'Cu < 25 kPa',
  },
  firm_clay: {
    name: 'Firm Clay',
    bearing: 150,
    gamma: 18,
    phi: 0,
    cohesion: 50,
    description: 'Cu 25-50 kPa',
  },
  stiff_clay: {
    name: 'Stiff Clay',
    bearing: 300,
    gamma: 19,
    phi: 0,
    cohesion: 100,
    description: 'Cu 50-100 kPa',
  },
  loose_sand: {
    name: 'Loose Sand',
    bearing: 100,
    gamma: 17,
    phi: 28,
    cohesion: 0,
    description: "N' < 10",
  },
  medium_sand: {
    name: 'Medium Dense Sand',
    bearing: 200,
    gamma: 18,
    phi: 32,
    cohesion: 0,
    description: "N' 10-30",
  },
  dense_sand: {
    name: 'Dense Sand',
    bearing: 400,
    gamma: 20,
    phi: 36,
    cohesion: 0,
    description: "N' 30-50",
  },
  gravel: {
    name: 'Gravel',
    bearing: 600,
    gamma: 21,
    phi: 40,
    cohesion: 0,
    description: 'Well-graded',
  },
  rock: {
    name: 'Weak Rock',
    bearing: 1000,
    gamma: 24,
    phi: 45,
    cohesion: 200,
    description: 'Weathered rock',
  },
};

const DESIGN_APPROACHES = {
  DA1_C1: { name: 'DA1 Combination 1', gammaG: 1.35, gammaQ: 1.5, gammaRv: 1.0, gammaRh: 1.0 },
  DA1_C2: { name: 'DA1 Combination 2', gammaG: 1.0, gammaQ: 1.3, gammaRv: 1.4, gammaRh: 1.1 },
  DA2: { name: 'DA2 (Factored Actions)', gammaG: 1.35, gammaQ: 1.5, gammaRv: 1.4, gammaRh: 1.1 },
  DA3: { name: 'DA3 (Factored Soil)', gammaG: 1.35, gammaQ: 1.5, gammaRv: 1.0, gammaRh: 1.0 },
  SLS: { name: 'SLS (Serviceability)', gammaG: 1.0, gammaQ: 1.0, gammaRv: 1.0, gammaRh: 1.0 },
};

const PRESETS = {
  column_light: {
    name: 'Light Column Footing',
    footingLength: '1.5',
    footingWidth: '1.5',
    footingDepth: '0.4',
    embedmentDepth: '0.6',
    verticalLoad: '400',
    horizontalLoadX: '20',
    horizontalLoadY: '0',
    momentX: '50',
    momentY: '0',
    soilType: 'medium_sand',
  },
  column_medium: {
    name: 'Medium Column Footing',
    footingLength: '2.5',
    footingWidth: '2.5',
    footingDepth: '0.6',
    embedmentDepth: '0.8',
    verticalLoad: '1200',
    horizontalLoadX: '60',
    horizontalLoadY: '0',
    momentX: '150',
    momentY: '0',
    soilType: 'medium_sand',
  },
  column_heavy: {
    name: 'Heavy Column Footing',
    footingLength: '4.0',
    footingWidth: '4.0',
    footingDepth: '1.0',
    embedmentDepth: '1.2',
    verticalLoad: '3500',
    horizontalLoadX: '150',
    horizontalLoadY: '0',
    momentX: '400',
    momentY: '0',
    soilType: 'dense_sand',
  },
  wall_footing: {
    name: 'Wall Strip Footing',
    footingLength: '6.0',
    footingWidth: '1.2',
    footingDepth: '0.5',
    embedmentDepth: '0.6',
    verticalLoad: '600',
    horizontalLoadX: '30',
    horizontalLoadY: '0',
    momentX: '80',
    momentY: '0',
    soilType: 'firm_clay',
  },
  eccentric: {
    name: 'Eccentric Loading',
    footingLength: '3.0',
    footingWidth: '2.0',
    footingDepth: '0.6',
    embedmentDepth: '0.8',
    verticalLoad: '800',
    horizontalLoadX: '100',
    horizontalLoadY: '50',
    momentX: '250',
    momentY: '100',
    soilType: 'stiff_clay',
  },
};

const PadFootingBearing = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    bearingCapacity: '',
    cohesion: '',
    designApproach: '',
    embedmentDepth: '',
    footingDepth: '',
    footingLength: '',
    footingWidth: '',
    frictionAngle: '',
    horizontalLoadX: '',
    horizontalLoadY: '',
    momentX: '',
    momentY: '',
    partialFactorBearing: '',
    partialFactorSliding: '',
    projectName: '',
    reference: '',
    soilType: '',
    unitWeight: '',
    verticalLoad: '',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'bearingCapacity', label: 'Bearing Capacity' },
  { key: 'cohesion', label: 'Cohesion' },
  { key: 'designApproach', label: 'Design Approach' },
  { key: 'embedmentDepth', label: 'Embedment Depth' },
  { key: 'footingDepth', label: 'Footing Depth' },
  { key: 'footingLength', label: 'Footing Length' },
  { key: 'footingWidth', label: 'Footing Width' },
  { key: 'frictionAngle', label: 'Friction Angle' },
  { key: 'horizontalLoadX', label: 'Horizontal Load X' },
  { key: 'horizontalLoadY', label: 'Horizontal Load Y' },
  { key: 'momentX', label: 'Moment X' },
  { key: 'momentY', label: 'Moment Y', allowZero: true },
  { key: 'partialFactorBearing', label: 'Partial Factor Bearing' },
  { key: 'partialFactorSliding', label: 'Partial Factor Sliding' },
  { key: 'unitWeight', label: 'Unit Weight' },
  { key: 'verticalLoad', label: 'Vertical Load' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };
  // What-If sliders
  const whatIfSliders = [
    { key: 'footingLength', label: 'Footing Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'footingWidth', label: 'Footing Width', min: 0, max: 100, step: 1, unit: '' },
    { key: 'footingDepth', label: 'Footing Depth', min: 0, max: 100, step: 1, unit: '' },
    { key: 'embedmentDepth', label: 'Embedment Depth', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewMaximized, setPreviewMaximized] = useState(false);
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

  const applySoilType = (key: string) => {
    const soil = (SOIL_TYPES as any)[key];
    if (soil) {
      setFormData((prev) => ({
        ...prev,
        soilType: key,
        phi: String(soil.phi),
        gamma: String(soil.gamma),
        cohesion: String(soil.coh),
      }));
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
        const L = parseFloat(formData.footingLength) || 1.5;
        const B = parseFloat(formData.footingWidth) || 1.5;
        const D = parseFloat(formData.footingDepth) || 0.4;
        const Df = parseFloat(formData.embedmentDepth) || 0.6;
        const V = parseFloat(formData.verticalLoad) || 0;
        const Hx = parseFloat(formData.horizontalLoadX) || 0;
        const Hy = parseFloat(formData.horizontalLoadY) || 0;
        const Mx = parseFloat(formData.momentX) || 0;
        const My = parseFloat(formData.momentY) || 0;

        // Soil properties
        const soil = formData.soilType ? (SOIL_TYPES as any)[formData.soilType] : null;
        const qallow = parseFloat(formData.bearingCapacity) || (soil ? soil.bearing : 150);
        const gamma = parseFloat(formData.unitWeight) || (soil ? soil.gamma : 18);
        const phi = parseFloat(formData.frictionAngle) || (soil ? soil.phi : 30);
        const c = parseFloat(formData.cohesion) || (soil ? soil.cohesion : 0);

        // Design approach
        const daKey = formData.designApproach || 'DA1_C1';
        const da = (DESIGN_APPROACHES as any)[daKey] || DESIGN_APPROACHES.DA1_C1;

        // Self weight of footing (concrete 25 kN/m3)
        const Wfooting = L * B * D * 25;
        const Wsoil = L * B * Df * gamma;
        const Vtotal = V + Wfooting + Wsoil;

        if (Vtotal <= 0) {
          newWarnings.push('Vertical load must be positive');
          setWarnings(newWarnings);
          setIsCalculating(false);
          return;
        }

        // Eccentricity (Meyerhof)
        const ex = Math.abs(Mx) / Vtotal;
        const ey = Math.abs(My) / Vtotal;

        // Effective dimensions
        const Leff = Math.max(L - 2 * ex, 0.1);
        const Beff = Math.max(B - 2 * ey, 0.1);
        const Aeff = Leff * Beff;
        const Atotal = L * B;

        if (ex > L / 6) newWarnings.push('Eccentricity exceeds L/6 — tension may develop');
        if (ey > B / 6) newWarnings.push('Eccentricity exceeds B/6 — tension may develop');

        // Bearing pressure on effective area
        const qapplied = Vtotal / Aeff;

        // Factored allowable bearing
        const qdesign = qallow / da.gammaRv;
        const bearingUtil = qapplied / qdesign;
        const bearingStatus = bearingUtil <= 1.0 ? 'PASS' : 'FAIL';

        // Sliding check
        const Htotal = Math.sqrt(Hx * Hx + Hy * Hy);
        const phiRad = (phi * Math.PI) / 180;
        const slidingResistance = Vtotal * Math.tan(phiRad) + c * Atotal;
        const slidingDesign = slidingResistance / da.gammaRh;
        const slidingUtil = Htotal > 0 ? Htotal / slidingDesign : 0;
        const slidingStatus = slidingUtil <= 1.0 ? 'PASS' : 'FAIL';

        if (slidingStatus === 'FAIL') newWarnings.push('Sliding resistance insufficient');

        // Overturning check
        const Mtotal = Math.sqrt(Mx * Mx + My * My) + Htotal * Df;
        const Mresist = (Vtotal * Math.min(L, B)) / 2;
        const otFOS = Mtotal > 0 ? Mresist / Mtotal : 99;
        const otStatus = otFOS >= 1.5 ? 'PASS' : otFOS >= 1.0 ? 'MARGINAL' : 'FAIL';

        if (otStatus === 'FAIL') newWarnings.push('Overturning factor of safety < 1.0');
        if (otStatus === 'MARGINAL') newWarnings.push('Overturning FOS between 1.0 and 1.5');

        // Settlement (simplified elastic)
        const Es = phi > 0 ? 2000 * Math.tan(phiRad) * (1 + (2 * Df) / B) : 5 * c;
        const Esafe = Math.max(Es, 1);
        const nu = phi > 0 ? 0.3 : 0.5;
        const Is = 1.0; // shape factor for square
        const imm = ((qapplied * B * (1 - nu * nu)) / Esafe) * Is * 1000; // mm
        const consol = phi === 0 ? imm * 0.5 : 0; // consolidation for clays
        const totalSettle = imm + consol;

        if (totalSettle > 25) newWarnings.push('Total settlement exceeds 25mm limit');

        // Overall rating
        const maxUtil = Math.max(bearingUtil, slidingUtil);
        let rating = 'CRITICAL';
        let ratingColor = '#ef4444';
        if (bearingStatus === 'PASS' && slidingStatus === 'PASS' && otStatus !== 'FAIL') {
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

        const overallStatus =
          bearingStatus === 'PASS' && slidingStatus === 'PASS' && otStatus !== 'FAIL'
            ? 'PASS'
            : 'FAIL';

        setResults({
          footingArea: Atotal,
          aspectRatio: L / B,
          eccentricityX: ex,
          eccentricityY: ey,
          effectiveLengthX: Leff,
          effectiveLengthY: Beff,
          effectiveArea: Aeff,
          bearingPressure: qapplied,
          allowableBearing: qdesign,
          bearingUtilisation: bearingUtil,
          bearingStatus,
          slidingResistance: slidingDesign,
          slidingDemand: Htotal,
          slidingUtilisation: slidingUtil,
          slidingStatus,
          overturningMoment: Mtotal,
          resistingMoment: Mresist,
          overturningFOS: otFOS,
          overturningStatus: otStatus,
          immediateSettlement: imm,
          consolidationSettlement: consol,
          totalSettlement: totalSettle,
          overallStatus,
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
    generatePremiumPDF({
      title: 'Pad Footing Bearing Calculator',
      subtitle: 'EN 1997-1:2004 Geotechnical Design',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Untitled' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'EN 1997-1:2004 (Eurocode 7)' },
      ],
      inputs: [
        {
          label: 'Footing L × B',
          value: `${formData.footingLength} × ${formData.footingWidth}`,
          unit: 'm',
        },
        { label: 'Depth', value: formData.footingDepth, unit: 'm' },
        { label: 'Embedment', value: formData.embedmentDepth, unit: 'm' },
        { label: 'Vertical Load', value: formData.verticalLoad, unit: 'kN' },
        {
          label: 'Horizontal X / Y',
          value: `${formData.horizontalLoadX} / ${formData.horizontalLoadY}`,
          unit: 'kN',
        },
        { label: 'Moment X / Y', value: `${formData.momentX} / ${formData.momentY}`, unit: 'kNm' },
        { label: 'Bearing Capacity', value: formData.bearingCapacity, unit: 'kPa' },
        { label: 'Friction Angle', value: formData.frictionAngle, unit: '°' },
        { label: 'Cohesion', value: formData.cohesion, unit: 'kPa' },
      ],
      sections: [
        {
          title: 'Geotechnical Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Effective Area', results.effectiveArea.toFixed(2), 'm²'],
            ['Bearing Pressure', results.bearingPressure.toFixed(1), 'kPa'],
            ['Allowable Bearing', results.allowableBearing.toFixed(1), 'kPa'],
            ['Sliding Resistance', results.slidingResistance.toFixed(1), 'kN'],
            ['Sliding Demand', results.slidingDemand.toFixed(1), 'kN'],
            ['Overturning FOS', results.overturningFOS.toFixed(2), '-'],
            ['Immediate Settlement', results.immediateSettlement.toFixed(1), 'mm'],
            ['Consolidation Settlement', results.consolidationSettlement.toFixed(1), 'mm'],
            ['Total Settlement', results.totalSettlement.toFixed(1), 'mm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Bearing',
          capacity: `${results.allowableBearing.toFixed(1)} kPa`,
          utilisation: `${(results.bearingUtilisation * 100).toFixed(1)}%`,
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Sliding',
          capacity: `${results.slidingResistance.toFixed(1)} kN`,
          utilisation: `${(results.slidingUtilisation * 100).toFixed(1)}%`,
          status: results.slidingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning',
          capacity: `FOS ${results.overturningFOS.toFixed(2)}`,
          utilisation:
            results.overturningFOS >= 1.5
              ? '<67%'
              : `${(100 / results.overturningFOS).toFixed(0)}%`,
          status: results.overturningStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Settlement',
          capacity: '25 mm limit',
          utilisation: `${((results.totalSettlement / 25) * 100).toFixed(0)}%`,
          status: (results.totalSettlement <= 25 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Bearing Capacity',
          suggestion:
            'Consider ground improvement or deeper embedment if bearing utilisation exceeds 80%',
        },
        {
          check: 'Sliding Resistance',
          suggestion: 'Provide a shear key at footing base if sliding FOS is marginal',
        },
        {
          check: 'Settlement',
          suggestion: 'Monitor for long-term consolidation on cohesive soils',
        },
      ],
      warnings: warnings.map((w) => ({ message: w })),
      footerNote: 'Beaver Bridges Ltd — Pad Footing Bearing Calculator',
    });
  }, [results, formData, warnings]);

  // DOCX Export — Editable Word document
  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Pad Footing Bearing Calculator',
      subtitle: 'EN 1997-1:2004 Geotechnical Design',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Untitled' },
        { label: 'Reference', value: formData.reference || '-' },
      ],
      inputs: [
        {
          label: 'Footing L × B',
          value: `${formData.footingLength} × ${formData.footingWidth}`,
          unit: 'm',
        },
        { label: 'Depth', value: formData.footingDepth, unit: 'm' },
        { label: 'Embedment', value: formData.embedmentDepth, unit: 'm' },
        { label: 'Vertical Load', value: formData.verticalLoad, unit: 'kN' },
        { label: 'Bearing Capacity', value: formData.bearingCapacity, unit: 'kPa' },
      ],
      checks: [
        {
          name: 'Bearing',
          capacity: `${results.allowableBearing?.toFixed(1) || '-'} kPa`,
          utilisation: `${(results.bearingUtilisation * 100).toFixed(1)}%`,
          status: results.bearingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Sliding',
          capacity: `${results.slidingResistance?.toFixed(1) || '-'} kN`,
          utilisation: `${(results.slidingUtilisation * 100).toFixed(1)}%`,
          status: results.slidingStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Overturning',
          capacity: `FOS ${results.overturningFOS?.toFixed(2) || '-'}`,
          utilisation: `${results.overturningFOS >= 1.5 ? '<67' : (100 / results.overturningFOS).toFixed(0)}%`,
          status: results.overturningStatus as 'PASS' | 'FAIL',
        },
        {
          name: 'Settlement',
          capacity: '25 mm limit',
          utilisation: `${((results.totalSettlement / 25) * 100).toFixed(0)}%`,
          status: (results.totalSettlement <= 25 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Bearing Capacity',
          suggestion:
            'Consider ground improvement or deeper embedment if bearing utilisation exceeds 80%',
        },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Pad Footing Bearing',
    });
  }, [results, formData, warnings]);


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
        'p-4 rounded-lg border-l-4',
        status === 'PASS' || status === 'OPTIMAL'
          ? 'bg-emerald-500/10 border-emerald-500/50'
          : status === 'FAIL' || status === 'CRITICAL'
            ? 'bg-red-500/10 border-red-500/50'
            : status === 'MARGINAL'
              ? 'bg-amber-500/10 border-amber-500/50'
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
            status === 'PASS' || status === 'OPTIMAL'
              ? 'text-emerald-400'
              : status === 'FAIL' || status === 'CRITICAL'
                ? 'text-red-400'
                : 'text-amber-400',
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
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
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
          <div className="flex items-center justify-between bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6">
            <div>
              <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
                Pad Footing Bearing
              </h1>
              <p className="text-lg text-gray-400 mt-2">EN 1997-1:2004 Geotechnical Design</p>
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
                <>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="border-cyan-500 text-cyan-400"
                  >
                    <FiDownload className="mr-2" />
                    PDF
                  </Button>
                  <Button
                    onClick={handleExportDOCX}
                    variant="outline"
                    className="border-purple-500 text-purple-400"
                  >
                    <FiDownload className="mr-2" />
                    DOCX
                  </Button>
                </>
              )}
              {results && (
                <SaveRunButton
                  calculatorKey="pad_footing_bearing"
                  inputs={formData as unknown as Record<string, string>}
                  results={results}
                />
              )}
            </div>
          </div>
        </motion.div>
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

                {/* Footing Geometry */}
                <CollapsibleSection
                  title="Footing Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Length (L)" field="footingLength" unit="m" />
                    <InputField label="Width (B)" field="footingWidth" unit="m" />
                    <InputField label="Depth (D)" field="footingDepth" unit="m" />
                    <InputField label="Embedment (Df)" field="embedmentDepth" unit="m" />
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
                    <InputField label="Vertical Load (V)" field="verticalLoad" unit="kN" />
                    <InputField label="Horizontal X (Hx)" field="horizontalLoadX" unit="kN" />
                    <InputField label="Horizontal Y (Hy)" field="horizontalLoadY" unit="kN" />
                    <InputField label="Moment X (Mx)" field="momentX" unit="kNm" />
                    <InputField label="Moment Y (My)" field="momentY" unit="kNm" />
                  </div>
                </CollapsibleSection>

                {/* Soil Properties */}
                <CollapsibleSection
                  title="Soil Properties"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                >
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Soil Type</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(SOIL_TYPES).map(([key, soil]) => (
                        <Button
                          key={key}
                          variant={formData.soilType === key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => applySoilType(key)}
                          className={cn(
                            formData.soilType === key
                              ? 'bg-cyan-600 text-white'
                              : 'border-gray-600 hover:border-neon-cyan',
                          )}
                        >
                          {soil.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Bearing Capacity" field="bearingCapacity" unit="kPa" />
                    <InputField label="Unit Weight (γ)" field="unitWeight" unit="kN/m³" />
                    <InputField label="Friction Angle (φ)" field="frictionAngle" unit="°" />
                    <InputField label="Cohesion (c)" field="cohesion" unit="kPa" />
                  </div>
                </CollapsibleSection>

                {/* Design Parameters */}
                <CollapsibleSection
                  title="Design Parameters"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                      <FiSettings className="w-6 h-6 text-neon-cyan" />
                    </div>
                  }
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-1">Design Approach</label>
                      <select
                        title="Design Approach"
                        value={formData.designApproach}
                        onChange={(e) => updateForm('designApproach', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 focus:outline-none"
                      >
                        {Object.entries(DESIGN_APPROACHES).map(([key, da]) => (
                          <option key={key} value={key}>
                            {da.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="γ Bearing" field="partialFactorBearing" />
                    <InputField label="γ Sliding" field="partialFactorSliding" />
                  </div>
                </CollapsibleSection>

                {/* Run Full Analysis Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4"
                >
                  <button
                    onClick={runCalculation}
                    disabled={isCalculating}
                    className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCalculating ? '⏳ CALCULATING...' : '⚡ RUN FULL ANALYSIS'}
                  </button>
                </motion.div>
              </div>

              {/* Right Column - Visualization & Results */}
              <div className="sticky top-8 space-y-4">
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
                        <PadFooting3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        PAD FOOTING BEARING — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {whatIfSliders.map((s) => (
                        <div key={s.key} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">{formData[s.key as keyof FormData]} {s.unit}</span>
                          </div>
                          <input
                            title={s.label}
                            type="range"
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            value={formData[s.key as keyof FormData] as string}
                            onChange={(e) => updateForm(s.key as keyof FormData, e.target.value)}
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
                          { label: 'Footing Area', value: `${((parseFloat(formData.footingLength) || 0) * (parseFloat(formData.footingWidth) || 0)).toFixed(2)} m²` },
                          { label: 'Aspect Ratio', value: `${((parseFloat(formData.footingLength) || 1) / (parseFloat(formData.footingWidth) || 1)).toFixed(2)}` },
                          { label: 'Depth', value: `${formData.footingDepth || '—'} m` },
                          { label: 'Embedment', value: `${formData.embedmentDepth || '—'} m` },
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
                              { label: 'Bearing', util: (results.bearingUtilisation * 100).toFixed(1), status: results.bearingStatus },
                              { label: 'Sliding', util: (results.slidingUtilisation * 100).toFixed(1), status: results.slidingStatus },
                              { label: 'Overturning', util: results.overturningFOS.toFixed(2), status: results.overturningStatus },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', check.status === 'FAIL' ? 'text-red-500' : parseFloat(check.util) > 90 ? 'text-orange-400' : 'text-emerald-400')}>
                                  {check.util}{check.label === 'Overturning' ? 'x' : '%'}
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

                {/* Visualization */}
                <WhatIfPreview
                  title="Pad Footing Bearing — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <PadFooting3D />
                    </Interactive3DDiagram>
                  )}
                />

                {/* Results */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Overall Rating */}
                    <Card
                      variant="glass"
                      className="border-2 shadow-2xl"
                      style={{
                        borderColor: results.ratingColor,
                        backgroundColor: `${results.ratingColor}10`,
                        boxShadow: `0 10px 15px -3px ${results.ratingColor}15`,
                      }}
                    >
                      <CardContent className="py-4 text-center">
                        <div className="text-3xl font-bold" style={{ color: results.ratingColor }}>
                          {results.rating}
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Max Utilisation:{' '}
                          {(
                            Math.max(results.bearingUtilisation, results.slidingUtilisation) * 100
                          ).toFixed(1)}
                          %
                        </div>
                      </CardContent>
                    </Card>

                    {/* Key Results */}
                    <div className="grid grid-cols-2 gap-3">
                      <ResultCard
                        title="Bearing Pressure"
                        value={results.bearingPressure.toFixed(1)}
                        unit="kPa"
                        status={results.bearingStatus}
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FiActivity className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="Bearing Util."
                        value={(results.bearingUtilisation * 100).toFixed(1)}
                        unit="%"
                        status={results.bearingStatus}
                        icon={results.bearingStatus === 'PASS' ? <FiCheck /> : <FiAlertTriangle />}
                      />
                      <ResultCard
                        title="Sliding Util."
                        value={(results.slidingUtilisation * 100).toFixed(1)}
                        unit="%"
                        status={results.slidingStatus}
                        icon={results.slidingStatus === 'PASS' ? <FiCheck /> : <FiAlertTriangle />}
                      />
                      <ResultCard
                        title="Overturn FOS"
                        value={results.overturningFOS.toFixed(2)}
                        unit=""
                        status={results.overturningStatus}
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <FiTarget className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="Effective Area"
                        value={results.effectiveArea.toFixed(2)}
                        unit="m²"
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                            <FiLayers className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                      <ResultCard
                        title="Settlement"
                        value={results.totalSettlement.toFixed(1)}
                        unit="mm"
                        status={results.totalSettlement <= 25 ? 'PASS' : 'MARGINAL'}
                        icon={
                          <div className="w-4 h-4 rounded-md bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                            <FiActivity className="w-2.5 h-2.5 text-white" />
                          </div>
                        }
                      />
                    </div>

                    {/* Recommendations */}
                    <Card variant="glass" className="border-emerald-500/30 shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                          <FiCheck className="w-5 h-5" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            Consider ground improvement or deeper embedment if bearing utilisation
                            exceeds 80%
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            Provide a shear key at footing base if sliding FOS is marginal
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            Monitor for long-term consolidation settlement on cohesive soils
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            Verify groundwater table position — buoyancy may reduce effective stress
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <Card variant="glass" className="border-amber-500/30 shadow-2xl">
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
          {activeTab === 'results' && results && (
            <motion.div
              key="results-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Overall Rating */}
              <Card
                variant="glass"
                className="border-2 shadow-2xl"
                style={{
                  borderColor: results.ratingColor,
                  backgroundColor: `${results.ratingColor}10`,
                }}
              >
                <CardContent className="py-4 text-center">
                  <div className="text-3xl font-bold" style={{ color: results.ratingColor }}>
                    {results.rating}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Max Utilisation:{' '}
                    {(
                      Math.max(results.bearingUtilisation, results.slidingUtilisation) * 100
                    ).toFixed(1)}
                    %
                  </div>
                </CardContent>
              </Card>

              {/* Key Results */}
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  title="Bearing Pressure"
                  value={results.bearingPressure.toFixed(1)}
                  unit="kPa"
                  status={results.bearingStatus}
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <FiActivity className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
                <ResultCard
                  title="Bearing Util."
                  value={(results.bearingUtilisation * 100).toFixed(1)}
                  unit="%"
                  status={results.bearingStatus}
                  icon={results.bearingStatus === 'PASS' ? <FiCheck /> : <FiAlertTriangle />}
                />
                <ResultCard
                  title="Sliding Util."
                  value={(results.slidingUtilisation * 100).toFixed(1)}
                  unit="%"
                  status={results.slidingStatus}
                  icon={results.slidingStatus === 'PASS' ? <FiCheck /> : <FiAlertTriangle />}
                />
                <ResultCard
                  title="Overturn FOS"
                  value={results.overturningFOS.toFixed(2)}
                  unit=""
                  status={results.overturningStatus}
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <FiTarget className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
                <ResultCard
                  title="Effective Area"
                  value={results.effectiveArea.toFixed(2)}
                  unit="m²"
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
                      <FiLayers className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
                <ResultCard
                  title="Settlement"
                  value={results.totalSettlement.toFixed(1)}
                  unit="mm"
                  status={results.totalSettlement <= 25 ? 'PASS' : 'MARGINAL'}
                  icon={
                    <div className="w-4 h-4 rounded-md bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                      <FiActivity className="w-2.5 h-2.5 text-white" />
                    </div>
                  }
                />
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <Card variant="glass" className="border-amber-500/30 shadow-2xl">
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
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-white">Footing Plan View</CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                    <PadFooting3D />
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

export default PadFootingBearing;
