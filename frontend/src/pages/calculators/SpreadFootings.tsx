// =============================================================================
// BeaverCalc Studio — Spread Footing Designer (Premium)
// Comprehensive pad footing design with bearing, punching, sliding, settlement
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBox,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiDollarSign,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLayers,
  FiPackage,
  FiSettings,
  FiTarget,
  FiTool,
  FiTrendingUp,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SpreadFooting3D from '../../components/3d/scenes/SpreadFooting3D';
import ErrorBoundary from '../../components/ErrorBoundary';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { CONCRETE_GRADES as _CONCRETE_LIB } from '../../data/materialGrades';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  length: string;
  width: string;
  thickness: string;
  columnLoad: string;
  columnMomentX: string;
  columnMomentY: string;
  columnWidth: string;
  soilType: string;
  bearingCapacity: string;
  safetyFactor: string;
  concreteGrade: string;
  coverDepth: string;
}

interface CheckResult {
  title: string;
  demand: number;
  capacity: number;
  utilisation: number;
  status: 'PASS' | 'WARNING' | 'FAIL';
  unit: string;
}

interface Results {
  checks: CheckResult[];
  eccentricityX: number;
  eccentricityY: number;
  effectiveLength: number;
  effectiveWidth: number;
  maxPressure: number;
  minPressure: number;
  punchingShear: number;
  settlement: number;
  concreteVolume: number;
  overallStatus: 'PASS' | 'FAIL';
  // Enhanced fields
  bendingMoment: number;
  requiredAs: number;
  oneWayShear: number;
  oneWayShearCapacity: number;
  effectiveDepth: number;
  costEstimate: {
    concrete: number;
    rebar: number;
    formwork: number;
    excavation: number;
    total: number;
  };
  materialQuantities: {
    concreteVolume: number;
    rebarWeight: number;
    formworkArea: number;
    excavationVolume: number;
  };
  recommendations: string[];
  avgUtilisation: number;
  efficiencyRating: string;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const SOIL_PRESETS: Record<
  string,
  { bearingCapacity: string; gamma: string; Es: string; nu: string; label: string }
> = {
  clay_soft: { bearingCapacity: '100', gamma: '17', Es: '10000', nu: '0.45', label: 'Soft Clay' },
  clay_stiff: { bearingCapacity: '200', gamma: '19', Es: '25000', nu: '0.40', label: 'Stiff Clay' },
  sand_loose: { bearingCapacity: '150', gamma: '17', Es: '20000', nu: '0.35', label: 'Loose Sand' },
  sand_dense: { bearingCapacity: '350', gamma: '19', Es: '50000', nu: '0.30', label: 'Dense Sand' },
  gravel: { bearingCapacity: '500', gamma: '20', Es: '80000', nu: '0.25', label: 'Gravel' },
  rock_weathered: {
    bearingCapacity: '1200',
    gamma: '23',
    Es: '200000',
    nu: '0.20',
    label: 'Weathered Rock',
  },
};

const CONCRETE_PRESETS: Record<string, { fck: number; label: string }> = {
  C25: { fck: _CONCRETE_LIB['C25/30'].fck, label: _CONCRETE_LIB['C25/30'].name },
  C30: { fck: _CONCRETE_LIB['C30/37'].fck, label: _CONCRETE_LIB['C30/37'].name },
  C35: { fck: _CONCRETE_LIB['C35/45'].fck, label: _CONCRETE_LIB['C35/45'].name },
  C40: { fck: _CONCRETE_LIB['C40/50'].fck, label: _CONCRETE_LIB['C40/50'].name },
};

const BRIDGE_PRESETS: Record<string, { name: string } & Partial<FormData>> = {
  highway_pier: {
    name: 'Highway Pier Footing',
    length: '4.0',
    width: '4.0',
    thickness: '1.0',
    columnLoad: '3500',
    columnMomentX: '250',
    columnMomentY: '100',
    columnWidth: '1.2',
    soilType: 'sand_dense',
    bearingCapacity: '350',
    safetyFactor: '1.5',
    concreteGrade: 'C35',
    coverDepth: '0.075',
  },
  rail_bridge_pier: {
    name: 'Rail Bridge Pier Footing',
    length: '5.0',
    width: '3.5',
    thickness: '1.2',
    columnLoad: '5000',
    columnMomentX: '400',
    columnMomentY: '150',
    columnWidth: '1.5',
    soilType: 'gravel',
    bearingCapacity: '500',
    safetyFactor: '1.5',
    concreteGrade: 'C40',
    coverDepth: '0.075',
  },
  abutment_base: {
    name: 'Abutment Base Slab',
    length: '6.0',
    width: '3.0',
    thickness: '0.8',
    columnLoad: '2000',
    columnMomentX: '300',
    columnMomentY: '50',
    columnWidth: '0.6',
    soilType: 'clay_stiff',
    bearingCapacity: '200',
    safetyFactor: '1.5',
    concreteGrade: 'C35',
    coverDepth: '0.075',
  },
  footbridge_pier: {
    name: 'Footbridge Pier Footing',
    length: '1.5',
    width: '1.5',
    thickness: '0.5',
    columnLoad: '400',
    columnMomentX: '30',
    columnMomentY: '15',
    columnWidth: '0.4',
    soilType: 'sand_loose',
    bearingCapacity: '150',
    safetyFactor: '1.5',
    concreteGrade: 'C30',
    coverDepth: '0.075',
  },
  viaduct_pier: {
    name: 'Viaduct Pier Footing',
    length: '7.0',
    width: '5.0',
    thickness: '1.5',
    columnLoad: '8000',
    columnMomentX: '600',
    columnMomentY: '200',
    columnWidth: '2.0',
    soilType: 'rock_weathered',
    bearingCapacity: '1200',
    safetyFactor: '1.5',
    concreteGrade: 'C40',
    coverDepth: '0.075',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SpreadFootings = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    loads: true,
    soil: false,
    concrete: false,
  });

  const [form, setForm] = useState<FormData>({
    length: '2.5',
    width: '2.5',
    thickness: '0.6',
    columnLoad: '1200',
    columnMomentX: '100',
    columnMomentY: '50',
    columnWidth: '0.4',
    soilType: 'sand_dense',
    bearingCapacity: '350',
    safetyFactor: '1.5',
    concreteGrade: 'C30',
    coverDepth: '0.075',
  });
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedSoil, setSelectedSoil] = useState<string>('sand_dense');
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([8, 6, 8]);
  // ===========================================================================
  // CALCULATIONS
  // ===========================================================================

  useEffect(() => {
    // Input validation
    const validationErrors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'length', label: 'Footing Length' },
      { key: 'width', label: 'Footing Width' },
      { key: 'thickness', label: 'Footing Thickness' },
      { key: 'columnLoad', label: 'Column Load' },
      { key: 'columnMomentX', label: 'Moment X', allowZero: true },
      { key: 'columnMomentY', label: 'Moment Y', allowZero: true },
      { key: 'columnWidth', label: 'Column Width' },
      { key: 'bearingCapacity', label: 'Bearing Capacity' },
      { key: 'safetyFactor', label: 'Safety Factor' },
      { key: 'coverDepth', label: 'Cover Depth' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    const L = parseFloat(form.length);
    const B = parseFloat(form.width);
    const t = parseFloat(form.thickness);
    const P = parseFloat(form.columnLoad);
    const Mx = parseFloat(form.columnMomentX);
    const My = parseFloat(form.columnMomentY);
    const colW = parseFloat(form.columnWidth);
    const q_allow = parseFloat(form.bearingCapacity) / parseFloat(form.safetyFactor);
    const soil = SOIL_PRESETS[selectedSoil];
    const Es = parseFloat(soil?.Es || '50000');
    const nu = parseFloat(soil?.nu || '0.30');

    if (isNaN(L) || L <= 0 || isNaN(B) || B <= 0 || isNaN(P) || P <= 0) {
      setResults(null);
      setWarnings([{ type: 'error', message: 'Invalid input parameters' }]);
      return;
    }

    const A = L * B;

    // Eccentricities
    const ex = Mx / P;
    const ey = My / P;
    const L_eff = L - 2 * Math.abs(ex);
    const B_eff = B - 2 * Math.abs(ey);

    if (L_eff <= 0 || B_eff <= 0) {
      newWarnings.push({ type: 'error', message: 'Eccentricity too large - load outside kern' });
      setResults(null);
      setWarnings(newWarnings);
      return;
    }

    // Bearing pressure (Meyerhof - on effective area for biaxial bending)
    const A_eff = L_eff * B_eff;
    const q_max = P / A_eff;
    const q_min = Math.max(0, (P / A) * (1 - (6 * ex) / L - (6 * ey) / B));

    const bearingUtil = q_max / q_allow;
    const bearingStatus = bearingUtil <= 0.9 ? 'PASS' : bearingUtil <= 1.0 ? 'WARNING' : 'FAIL';

    // Punching shear (simplified)
    const d = t - parseFloat(form.coverDepth) - 0.012; // Effective depth
    const criticalPerimeter = 2 * (colW + d + (colW + d));
    const punchingShear = (P * 1000) / (criticalPerimeter * d * 1000); // N/mm²
    const fck = CONCRETE_PRESETS[form.concreteGrade as keyof typeof CONCRETE_PRESETS]?.fck || 30;
    const vRdc = 0.12 * Math.pow(100 * 0.01 * fck, 1 / 3); // Simplified EC2
    const punchingUtil = punchingShear / vRdc;
    const punchingStatus = punchingUtil <= 0.9 ? 'PASS' : punchingUtil <= 1.0 ? 'WARNING' : 'FAIL';

    // Sliding (simplified - assumed horizontal = 5% vertical)
    const H = P * 0.05;
    const selfWeight = A * t * 25;
    const slidingResist = (P + selfWeight) * 0.5;
    const slidingUtil = H / slidingResist;
    const slidingStatus = slidingUtil <= 0.9 ? 'PASS' : slidingUtil <= 1.0 ? 'WARNING' : 'FAIL';

    // Settlement (elastic immediate)
    const settlement = (q_max * B * 1000 * (1 - nu * nu)) / Es; // mm
    const settlementStatus = settlement <= 25 ? 'PASS' : settlement <= 40 ? 'WARNING' : 'FAIL';

    // Bending moment at face of column (cantilever)
    const overhangX = (L - colW) / 2;
    const overhangY = (B - colW) / 2;
    const M_ed = (q_max * B * overhangX * overhangX) / 2; // kNm per m width

    // Required reinforcement (simplified EC2)
    const d_mm = d * 1000;
    const fcd = (0.85 * fck) / 1.5; // Design compressive strength
    const K = (M_ed * 1e6) / (1000 * d_mm * d_mm * fcd);
    const z = d_mm * Math.min(0.95, 0.5 + Math.sqrt(0.25 - K / 1.134));
    const fyd = 500 / 1.15; // fyk=500 MPa
    const As_req = Math.max((M_ed * 1e6) / (z * fyd), 0.0013 * 1000 * d_mm); // mm²/m

    // One-way shear at d from face of column
    const V_ed = q_max * B * (overhangX - d); // kN/m
    const v_ed = Math.max(0, (V_ed * 1000) / (B * 1000 * d_mm)); // N/mm²
    const rho_l = Math.min(As_req / (1000 * d_mm), 0.02);
    const v_rdc_1way = Math.max(
      0.12 * Math.pow(200 / d_mm + 1, 0.5) * Math.pow(100 * rho_l * fck, 1 / 3),
      0.035 * Math.pow(200 / d_mm + 1, 0.75) * Math.sqrt(fck),
    );
    const oneWayUtil = v_ed / v_rdc_1way;
    const oneWayStatus = oneWayUtil <= 0.9 ? 'PASS' : oneWayUtil <= 1.0 ? 'WARNING' : 'FAIL';

    // Bending utilisation (simplified)
    const bendingUtil = K / 0.167; // K/K_bal
    const bendingStatus = bendingUtil <= 0.9 ? 'PASS' : bendingUtil <= 1.0 ? 'WARNING' : 'FAIL';

    const checks: CheckResult[] = [
      {
        title: 'Bearing Pressure',
        demand: q_max,
        capacity: q_allow,
        utilisation: bearingUtil,
        status: bearingStatus,
        unit: 'kPa',
      },
      {
        title: 'Punching Shear',
        demand: punchingShear,
        capacity: vRdc,
        utilisation: punchingUtil,
        status: punchingStatus,
        unit: 'N/mm²',
      },
      {
        title: 'Sliding',
        demand: H,
        capacity: slidingResist,
        utilisation: slidingUtil,
        status: slidingStatus,
        unit: 'kN',
      },
      {
        title: 'Settlement',
        demand: settlement,
        capacity: 25,
        utilisation: settlement / 25,
        status: settlementStatus,
        unit: 'mm',
      },
      {
        title: 'Bending',
        demand: M_ed,
        capacity: M_ed / Math.max(bendingUtil, 0.01),
        utilisation: bendingUtil,
        status: bendingStatus,
        unit: 'kNm/m',
      },
      {
        title: 'One-Way Shear',
        demand: v_ed,
        capacity: v_rdc_1way,
        utilisation: oneWayUtil,
        status: oneWayStatus,
        unit: 'N/mm²',
      },
    ];

    // Warnings
    if (ex > L / 6 || ey > B / 6) {
      newWarnings.push({ type: 'warning', message: 'Eccentricity outside middle third' });
    }
    if (bearingStatus === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: `Bearing capacity exceeded: ${q_max.toFixed(0)} kPa > ${q_allow.toFixed(0)} kPa`,
      });
    }
    if (punchingStatus === 'FAIL') {
      newWarnings.push({ type: 'error', message: 'Punching shear capacity exceeded' });
    }
    if (oneWayStatus === 'FAIL') {
      newWarnings.push({ type: 'error', message: 'One-way shear capacity exceeded' });
    }
    if (bendingStatus === 'FAIL') {
      newWarnings.push({
        type: 'error',
        message: 'Bending capacity exceeded — increase footing depth',
      });
    }
    if (settlement > 40) {
      newWarnings.push({
        type: 'warning',
        message: `Excessive settlement: ${settlement.toFixed(0)}mm`,
      });
    }

    const overallStatus = checks.every((c) => c.status !== 'FAIL') ? 'PASS' : 'FAIL';

    // Cost estimation (UK market rates)
    const concVol = A * t;
    const rebarWeight = (As_req / 1e6) * 7850 * (2 * (L + B)) * t; // kg approximate
    const formworkArea = 2 * (L + B) * t; // m² side formwork
    const excavationVol = A * (t + 0.3); // m³ with 300mm overdig
    const costEstimate = {
      concrete: concVol * 180,
      rebar: rebarWeight * 1.2,
      formwork: formworkArea * 45,
      excavation: excavationVol * 35,
      total: concVol * 180 + rebarWeight * 1.2 + formworkArea * 45 + excavationVol * 35,
    };

    const materialQuantities = {
      concreteVolume: concVol,
      rebarWeight,
      formworkArea,
      excavationVolume: excavationVol,
    };

    // Recommendations
    const recommendations: string[] = [];
    if (bearingUtil > 0.9 && bearingStatus !== 'FAIL') {
      recommendations.push('Bearing pressure near limit — consider increasing footing area');
    }
    if (punchingUtil > 0.85) {
      recommendations.push(
        'Punching shear high — consider increasing footing depth or adding shear reinforcement',
      );
    }
    if (settlement > 15) {
      recommendations.push(
        'Settlement significant — consider ground improvement or deeper foundation',
      );
    }
    if (bendingUtil < 0.3) {
      recommendations.push(
        'Footing over-designed for bending — thickness could potentially be reduced',
      );
    }
    if (ex > L / 10 || ey > B / 10) {
      recommendations.push(
        'Significant eccentricity — review load path and consider moment redistribution',
      );
    }
    if (overallStatus === 'PASS' && recommendations.length === 0) {
      recommendations.push('Design is satisfactory for all checks');
    }

    // Efficiency rating
    const avgUtil = (checks.reduce((sum, c) => sum + c.utilisation, 0) / checks.length) * 100;
    const efficiencyRating =
      avgUtil > 70
        ? 'Excellent'
        : avgUtil > 50
          ? 'Good'
          : avgUtil > 30
            ? 'Moderate'
            : 'Over-designed';

    setResults({
      checks,
      eccentricityX: ex,
      eccentricityY: ey,
      effectiveLength: L_eff,
      effectiveWidth: B_eff,
      maxPressure: q_max,
      minPressure: q_min,
      punchingShear,
      settlement,
      concreteVolume: A * t,
      overallStatus,
      bendingMoment: M_ed,
      requiredAs: As_req,
      oneWayShear: v_ed,
      oneWayShearCapacity: v_rdc_1way,
      effectiveDepth: d,
      costEstimate,
      materialQuantities,
      recommendations,
      avgUtilisation: Math.round(avgUtil),
      efficiencyRating,
    });

    setWarnings(newWarnings);
  }, [form, selectedSoil]);

  // ===========================================================================
  // VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applySoilPreset = (key: string) => {
    const preset = SOIL_PRESETS[key];
    if (preset) {
      setSelectedSoil(key);
      setForm((prev) => ({
        ...prev,
        bearingCapacity: preset.bearingCapacity,
        soilType: key,
      }));
    }
  };

  const applyBridgePreset = (key: string) => {
    const preset = BRIDGE_PRESETS[key];
    if (!preset) return;
    const { name: _name, ...fields } = preset;
    setForm((prev) => ({ ...prev, ...fields }));
    if (fields.soilType) setSelectedSoil(fields.soilType);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ===========================================================================
  // PDF EXPORT
  // ===========================================================================

  const exportPDF = async () => {
    if (!results) return;

    // Capture 3D diagram
    let diagramImage: string | undefined;
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) diagramImage = canvas.toDataURL('image/png');
    } catch {
      /* ignore capture errors */
    }

    generatePremiumPDF({
      title: 'Spread Footing Designer',
      subtitle: 'EN 1997-1 / EN 1992-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Bridge Spread Footing Design' },
        { label: 'Reference', value: 'SPR001' },
        { label: 'Design Status', value: results.overallStatus },
        { label: 'Efficiency', value: `${results.avgUtilisation}% — ${results.efficiencyRating}` },
      ],
      inputs: [
        { label: 'Footing Length', value: `${form.length} m` },
        { label: 'Footing Width', value: `${form.width} m` },
        { label: 'Footing Depth', value: `${form.thickness} m` },
        { label: 'Column Load', value: `${form.columnLoad} kN` },
        { label: 'Moment X', value: `${form.columnMomentX} kNm` },
        { label: 'Moment Y', value: `${form.columnMomentY} kNm` },
        { label: 'Column Width', value: `${form.columnWidth} m` },
        { label: 'Soil Type', value: SOIL_PRESETS[selectedSoil]?.label || form.soilType },
        { label: 'Bearing Capacity', value: `${form.bearingCapacity} kPa` },
        { label: 'Safety Factor', value: form.safetyFactor },
        {
          label: 'Concrete Grade',
          value: CONCRETE_PRESETS[form.concreteGrade]?.label || form.concreteGrade,
        },
        { label: 'Cover Depth', value: `${parseFloat(form.coverDepth) * 1000} mm` },
      ],
      sections: [
        {
          title: 'Pressure & Eccentricity',
          head: [['Parameter', 'Value']],
          body: [
            ['Max Bearing Pressure', `${results.maxPressure.toFixed(1)} kPa`],
            ['Min Bearing Pressure', `${results.minPressure.toFixed(1)} kPa`],
            ['Eccentricity X', `${(results.eccentricityX * 1000).toFixed(0)} mm`],
            ['Eccentricity Y', `${(results.eccentricityY * 1000).toFixed(0)} mm`],
            ['Effective Length', `${results.effectiveLength.toFixed(2)} m`],
            ['Effective Width', `${results.effectiveWidth.toFixed(2)} m`],
          ],
        },
        {
          title: 'Reinforcement Design',
          head: [['Parameter', 'Value']],
          body: [
            ['Bending Moment', `${results.bendingMoment.toFixed(1)} kNm/m`],
            ['Required As', `${results.requiredAs.toFixed(0)} mm²/m`],
            ['Effective Depth', `${(results.effectiveDepth * 1000).toFixed(0)} mm`],
            ['One-Way Shear', `${results.oneWayShear.toFixed(3)} N/mm²`],
            ['One-Way Shear Capacity', `${results.oneWayShearCapacity.toFixed(3)} N/mm²`],
          ],
        },
        {
          title: 'Material Quantities',
          head: [['Item', 'Quantity']],
          body: [
            ['Concrete Volume', `${results.materialQuantities.concreteVolume.toFixed(2)} m³`],
            ['Reinforcement Weight', `${results.materialQuantities.rebarWeight.toFixed(0)} kg`],
            ['Formwork Area', `${results.materialQuantities.formworkArea.toFixed(1)} m²`],
            ['Excavation Volume', `${results.materialQuantities.excavationVolume.toFixed(1)} m³`],
          ],
        },
        {
          title: 'Cost Estimation',
          head: [['Item', 'Cost (£)']],
          body: [
            ['Concrete', `£${results.costEstimate.concrete.toFixed(0)}`],
            ['Reinforcement', `£${results.costEstimate.rebar.toFixed(0)}`],
            ['Formwork', `£${results.costEstimate.formwork.toFixed(0)}`],
            ['Excavation', `£${results.costEstimate.excavation.toFixed(0)}`],
            ['TOTAL', `£${results.costEstimate.total.toFixed(0)}`],
          ],
        },
      ],
      checks: results.checks.map((c) => ({
        name: c.title,
        capacity: `${typeof c.capacity === 'number' ? c.capacity.toFixed(1) : c.capacity} ${c.unit}`,
        utilisation: `${(c.utilisation * 100).toFixed(1)}%`,
        status: (c.status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      })),
      recommendations: results.recommendations.map((rec) => ({
        check: 'Design',
        suggestion: rec,
      })),
      warnings: warnings.map((w) => w.message),
      diagramImage,
      footerNote: 'Beaver Bridges Ltd — Spread Footing Design per EN 1997-1 / EN 1992-1-1',
    });
  };

  const exportDOCX = async () => {
    if (!results) return;
    generateDOCX({
      title: 'Spread Footing Designer',
      subtitle: 'EN 1997-1 / EN 1992-1-1 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Bridge Spread Footing Design' },
        { label: 'Reference', value: 'SPR001' },
        { label: 'Design Status', value: results.overallStatus },
        {
          label: 'Efficiency',
          value: `${results.avgUtilisation}% \u2014 ${results.efficiencyRating}`,
        },
      ],
      inputs: [
        { label: 'Footing Length', value: `${form.length} m` },
        { label: 'Footing Width', value: `${form.width} m` },
        { label: 'Footing Depth', value: `${form.thickness} m` },
        { label: 'Column Load', value: `${form.columnLoad} kN` },
        { label: 'Moment X', value: `${form.columnMomentX} kNm` },
        { label: 'Moment Y', value: `${form.columnMomentY} kNm` },
        { label: 'Soil Type', value: SOIL_PRESETS[selectedSoil]?.label || form.soilType },
        { label: 'Bearing Capacity', value: `${form.bearingCapacity} kPa` },
        {
          label: 'Concrete Grade',
          value: CONCRETE_PRESETS[form.concreteGrade]?.label || form.concreteGrade,
        },
      ],
      sections: [
        {
          title: 'Pressure & Eccentricity',
          head: [['Parameter', 'Value']],
          body: [
            ['Max Bearing Pressure', `${results.maxPressure.toFixed(1)} kPa`],
            ['Min Bearing Pressure', `${results.minPressure.toFixed(1)} kPa`],
            ['Eccentricity X', `${(results.eccentricityX * 1000).toFixed(0)} mm`],
            ['Eccentricity Y', `${(results.eccentricityY * 1000).toFixed(0)} mm`],
          ],
        },
        {
          title: 'Material Quantities',
          head: [['Item', 'Quantity']],
          body: [
            ['Concrete Volume', `${results.materialQuantities.concreteVolume.toFixed(2)} m\u00b3`],
            ['Reinforcement Weight', `${results.materialQuantities.rebarWeight.toFixed(0)} kg`],
            ['Formwork Area', `${results.materialQuantities.formworkArea.toFixed(1)} m\u00b2`],
          ],
        },
      ],
      checks: results.checks.map((c) => ({
        name: c.title,
        capacity: `${typeof c.capacity === 'number' ? c.capacity.toFixed(1) : c.capacity} ${c.unit}`,
        utilisation: `${(c.utilisation * 100).toFixed(1)}%`,
        status: (c.status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      })),
      footerNote: 'Beaver Bridges Ltd \u2014 Spread Footing Design',
    });
  };

  // ===========================================================================
  // GOLD STANDARD CONFIGS
  // ===========================================================================

  const whatIfSliders = [
    { key: 'length', label: 'Length', unit: 'm', min: 1, max: 10, step: 0.1 },
    { key: 'width', label: 'Width', unit: 'm', min: 1, max: 10, step: 0.1 },
    { key: 'thickness', label: 'Depth', unit: 'm', min: 0.3, max: 3, step: 0.05 },
    { key: 'columnLoad', label: 'Column Load', unit: 'kN', min: 100, max: 15000, step: 50 },
    {
      key: 'bearingCapacity',
      label: 'Bearing Capacity',
      unit: 'kPa',
      min: 50,
      max: 2000,
      step: 25,
    },
  ];

  const cameraPresets = [
    { label: '3D View', icon: '🎯', pos: [8, 6, 8] },
    { label: 'Front', icon: '👁️', pos: [0, 4, 12] },
    { label: 'Side', icon: '📐', pos: [12, 4, 0] },
    { label: 'Top', icon: '🔝', pos: [0, 14, 0.1] },
    { label: 'Close', icon: '🔍', pos: [4, 3, 4] },
  ];

  const overallPass = useMemo(
    () => results?.checks.every((c) => c.status !== 'FAIL') ?? false,
    [results],
  );

  const statusColor = (status: string) =>
    status === 'PASS'
      ? 'text-green-400'
      : status === 'WARNING'
        ? 'text-yellow-400'
        : 'text-red-400';

  const render3DScene = (height: string) => (
    <ErrorBoundary>
      <Interactive3DDiagram
        height={height === 'h-full' ? '100%' : height.replace('h-[', '').replace(']', '')}
        cameraPosition={cameraPos}
      >
        <SpreadFooting3D />
      </Interactive3DDiagram>
    </ErrorBoundary>
  );

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-cyan-500/30 mb-4 bg-cyan-950/20">
            <FiGrid className="text-cyan-400" />
            <span className="text-cyan-100 font-mono tracking-wider">EN 1997-1 | EN 1992-1-1</span>
          </div>
          <h1 className="text-6xl font-black tracking-tight mb-3">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Spread Footing Designer
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">EN 1997-1 spread footing design</p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['Bearing Pressure', 'Punching Shear', 'Sliding', 'Settlement'].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {Object.entries(BRIDGE_PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => applyBridgePreset(key)}
                className="px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-300 text-xs hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                ⚡ {p.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Neon Pill Tabs */}
        <div className="flex justify-center gap-3 mb-8">
          {(
            [
              { key: 'input', label: 'Input', icon: <FiSettings size={16} /> },
              { key: 'results', label: 'Results', icon: <FiActivity size={16} /> },
              { key: 'visualization', label: '3D View', icon: <FiTarget size={16} /> },
            ] as const
          ).map((tab) => (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.key as any)}
              disabled={tab.key !== 'input' && !results}
              className={cn(
                'px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-cyan-500/30 hover:text-gray-200',
                tab.key !== 'input' && !results && 'opacity-50 cursor-not-allowed',
              )}
            >
              {tab.icon} {tab.label}
            </motion.button>
          ))}
          {results && (
            <div
              className={cn(
                'ml-2 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2',
                overallPass
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400',
              )}
            >
              {overallPass ? <FiCheck /> : <FiX />}
              {overallPass ? 'ALL PASS' : 'FAIL'}
            </div>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-6 space-y-2">
            {warnings.map((warning, i) => (
              <div
                key={i}
                className={cn(
                  'px-4 py-3 rounded-lg flex items-center gap-3 text-sm',
                  warning.type === 'error' && 'bg-red-950/50 border border-red-500/30 text-red-300',
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
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* === INPUT TAB === */}
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-12 gap-6"
            >
              {/* Left Column - Inputs */}
              <div className="lg:col-span-5 space-y-4">
                {/* Bridge Presets */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardContent className="py-3">
                    <ExplainableLabel
                      label="Bridge Preset"
                      field="footing-bridge-preset"
                      className="text-sm font-semibold text-gray-200 mb-1 block"
                    />
                    <select
                      title="Bridge Preset"
                      defaultValue=""
                      onChange={(e) => e.target.value && applyBridgePreset(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                    >
                      <option value="">Select a bridge preset...</option>
                      {Object.entries(BRIDGE_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>

                {/* Geometry */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('geometry')}
                  >
                    <div className="flex items-center space-x-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      >
                        <FiPackage className="text-neon-cyan" size={20} />
                      </motion.div>
                      <CardTitle className="text-2xl text-white">Footing Geometry</CardTitle>
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
                        <div className="grid grid-cols-3 gap-2">
                          <InputField
                            label="Length"
                            value={form.length}
                            onChange={(v) => setForm({ ...form, length: v })}
                            unit="m"
                          />
                          <InputField
                            label="Width"
                            value={form.width}
                            onChange={(v) => setForm({ ...form, width: v })}
                            unit="m"
                          />
                          <InputField
                            label="Depth"
                            value={form.thickness}
                            onChange={(v) => setForm({ ...form, thickness: v })}
                            unit="m"
                          />
                        </div>
                        <InputField
                          label="Column Width"
                          value={form.columnWidth}
                          onChange={(v) => setForm({ ...form, columnWidth: v })}
                          unit="m"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>

                {/* Loads */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('loads')}
                  >
                    <div className="flex items-center space-x-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      >
                        <FiLayers className="text-neon-cyan" size={20} />
                      </motion.div>
                      <CardTitle className="text-2xl text-white">Column Loads</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.loads && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.loads && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="Axial Load P"
                          value={form.columnLoad}
                          onChange={(v) => setForm({ ...form, columnLoad: v })}
                          unit="kN"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Moment Mx"
                            value={form.columnMomentX}
                            onChange={(v) => setForm({ ...form, columnMomentX: v })}
                            unit="kNm"
                          />
                          <InputField
                            label="Moment My"
                            value={form.columnMomentY}
                            onChange={(v) => setForm({ ...form, columnMomentY: v })}
                            unit="kNm"
                          />
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>

                {/* Soil */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('soil')}
                  >
                    <div className="flex items-center space-x-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      >
                        <FiSettings className="text-neon-cyan" size={20} />
                      </motion.div>
                      <CardTitle className="text-2xl text-white">Soil Properties</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.soil && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.soil && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1 block">
                            Soil Type
                          </label>
                          <select
                            title="Soil Type"
                            value={selectedSoil}
                            onChange={(e) => applySoilPreset(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                          >
                            {Object.entries(SOIL_PRESETS).map(([key, preset]) => (
                              <option key={key} value={key}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Bearing Cap."
                            value={form.bearingCapacity}
                            onChange={(v) => setForm({ ...form, bearingCapacity: v })}
                            unit="kPa"
                          />
                          <InputField
                            label="Safety Factor"
                            value={form.safetyFactor}
                            onChange={(v) => setForm({ ...form, safetyFactor: v })}
                            unit=""
                          />
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>

                {/* Concrete */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('concrete')}
                  >
                    <div className="flex items-center space-x-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      >
                        <FiGrid className="text-neon-cyan" size={20} />
                      </motion.div>
                      <CardTitle className="text-2xl text-white">Concrete</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.concrete && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.concrete && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <label className="text-sm font-semibold text-gray-200 mb-1 block">
                            Grade
                          </label>
                          <select
                            title="Concrete Grade"
                            value={form.concreteGrade}
                            onChange={(e) => setForm({ ...form, concreteGrade: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                          >
                            {Object.entries(CONCRETE_PRESETS).map(([key, preset]) => (
                              <option key={key} value={key}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <InputField
                          label="Cover"
                          value={form.coverDepth}
                          onChange={(v) => setForm({ ...form, coverDepth: v })}
                          unit="m"
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>

                {/* RUN FULL ANALYSIS Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setForm((prev) => ({ ...prev }));
                    setActiveTab('results');
                  }}
                  className="w-full px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300"
                >
                  <span className="flex items-center justify-center gap-3">
                    <FiZap size={24} />
                    RUN FULL ANALYSIS
                  </span>
                </motion.button>
              </div>

              {/* Right Column - 3D Preview & What-If */}
              <div className="lg:col-span-7 space-y-4">
                <WhatIfPreview
                  title="Spread Footing Preview"
                  renderScene={render3DScene}
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
                  status={results?.overallStatus}
                  utilisation={results?.avgUtilisation}
                  liveReadout={results?.checks.map((c) => ({
                    label: c.title,
                    value: c.utilisation * 100,
                  }))}
                />

                {/* Quick Stats */}
                {results && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-700">
                      <p className="text-xs text-gray-500 uppercase">Max Pressure</p>
                      <p className="text-cyan-400 font-bold">
                        {results.maxPressure.toFixed(0)} kPa
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-700">
                      <p className="text-xs text-gray-500 uppercase">Settlement</p>
                      <p className="text-cyan-400 font-bold">{results.settlement.toFixed(1)} mm</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-700">
                      <p className="text-xs text-gray-500 uppercase">Concrete Volume</p>
                      <p className="text-white font-bold">{results.concreteVolume.toFixed(2)} m³</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-900/40 border border-gray-700">
                      <p className="text-xs text-gray-500 uppercase">Effective Area</p>
                      <p className="text-white font-bold">
                        {results.effectiveLength.toFixed(2)} × {results.effectiveWidth.toFixed(2)} m
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-gray-900/30 border border-gray-800">
                  <p className="text-xs text-gray-500">
                    Design Code: EN 1997-1 (Bearing/Sliding), EN 1992-1-1 (Punching Shear)
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* === RESULTS TAB === */}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="mt-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-white">Analysis Results</h2>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={exportPDF}
                    variant="neon"
                    className="px-6 py-3 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-xl text-white font-bold flex items-center gap-3 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300"
                  >
                    <FiDownload size={18} />
                    Export PDF
                  </Button>
                  <Button
                    onClick={exportDOCX}
                    variant="neon"
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl text-white font-bold flex items-center gap-3 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
                  >
                    <FiDownload size={18} />
                    DOCX
                  </Button>
                  <SaveRunButton
                    calculatorKey="spread-footings"
                    inputs={form as unknown as Record<string, string | number>}
                    results={results}
                  />
                </div>
              </div>

              {/* Overall Status Banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'p-6 rounded-2xl border-2 text-center',
                  overallPass
                    ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5'
                    : 'border-red-500/50 bg-gradient-to-r from-red-500/5 to-orange-500/5',
                )}
              >
                <div
                  className={cn(
                    'text-5xl font-black mb-2',
                    overallPass ? 'text-emerald-400' : 'text-red-400',
                  )}
                >
                  {overallPass ? 'PASS' : 'FAIL'}
                </div>
                <div className="text-gray-300 text-sm">
                  Average Utilisation:{' '}
                  <span className="text-white font-bold">{results.avgUtilisation}%</span>
                  <span className="mx-3 text-gray-600">|</span>
                  Efficiency:{' '}
                  <span className="text-white font-bold">{results.efficiencyRating}</span>
                  <span className="mx-3 text-gray-600">|</span>
                  Checks:{' '}
                  <span className="text-white font-bold">
                    {results.checks.filter((c) => c.status !== 'FAIL').length}/
                    {results.checks.length} passed
                  </span>
                </div>
              </motion.div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="border-l-4 border-neon-cyan p-4 rounded-r-xl bg-gray-900/50">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCheckCircle className="text-neon-cyan" size={16} />
                    <span className="text-sm font-semibold text-gray-200">
                      Max Bearing Pressure
                    </span>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {results.maxPressure.toFixed(0)}{' '}
                    <span className="text-sm text-gray-400">kPa</span>
                  </p>
                </div>
                <div className="border-l-4 border-neon-blue p-4 rounded-r-xl bg-gray-900/50">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCheckCircle className="text-neon-blue" size={16} />
                    <span className="text-sm font-semibold text-gray-200">Settlement</span>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {results.settlement.toFixed(1)}{' '}
                    <span className="text-sm text-gray-400">mm</span>
                  </p>
                </div>
                <div className="border-l-4 border-neon-purple p-4 rounded-r-xl bg-gray-900/50">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCheckCircle className="text-neon-purple" size={16} />
                    <span className="text-sm font-semibold text-gray-200">Efficiency</span>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {results.avgUtilisation}%{' '}
                    <span className="text-sm text-gray-400">{results.efficiencyRating}</span>
                  </p>
                </div>
              </div>

              {/* ── Design Checks ── */}
              <div className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FiTarget size={12} /> Design Checks
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.checks.map((check, idx) => (
                  <motion.div
                    key={check.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      variant="glass"
                      className={cn(
                        'border overflow-visible shadow-lg h-full',
                        check.status === 'PASS'
                          ? 'border-green-500/40 shadow-green-500/5'
                          : check.status === 'WARNING'
                            ? 'border-yellow-500/40 shadow-yellow-500/5'
                            : 'border-red-500/50 shadow-red-500/5',
                      )}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-base flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center',
                                check.status === 'PASS'
                                  ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                                  : check.status === 'WARNING'
                                    ? 'bg-gradient-to-br from-yellow-500 to-amber-500'
                                    : 'bg-gradient-to-br from-red-500 to-orange-500',
                              )}
                            >
                              {check.status === 'PASS' ? (
                                <FiCheck className="text-white" size={14} />
                              ) : check.status === 'WARNING' ? (
                                <FiAlertTriangle className="text-white" size={14} />
                              ) : (
                                <FiX className="text-white" size={14} />
                              )}
                            </div>
                            {check.title}
                          </div>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded-full font-bold',
                              statusColor(check.status),
                            )}
                          >
                            {check.status}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs uppercase">Demand</p>
                            <p className="text-white font-bold">
                              {check.demand.toFixed(1)} {check.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase">Capacity</p>
                            <p className="text-white font-bold">
                              {check.capacity.toFixed(1)} {check.unit}
                            </p>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Utilisation</span>
                            <span className={cn('font-bold', statusColor(check.status))}>
                              {(check.utilisation * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-3 bg-gray-800 rounded-full overflow-hidden mt-1">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(check.utilisation * 100, 100)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={cn(
                                'h-full rounded-full',
                                check.status === 'PASS'
                                  ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                  : check.status === 'WARNING'
                                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                                    : 'bg-gradient-to-r from-red-500 to-orange-500',
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* ── Detailed Analysis ── */}
              <div className="text-xs font-bold text-purple-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                <FiActivity size={12} /> Detailed Analysis
              </div>

              {/* Pressure & Eccentricity + Reinforcement Design side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card
                    variant="glass"
                    className="border border-purple-500/40 shadow-lg shadow-purple-500/5 h-full"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                          <FiTrendingUp className="text-white" size={14} />
                        </div>
                        Pressure & Eccentricity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            label: 'Max Pressure',
                            value: `${results.maxPressure.toFixed(0)} kPa`,
                            color: 'text-purple-400',
                          },
                          {
                            label: 'Min Pressure',
                            value: `${results.minPressure.toFixed(0)} kPa`,
                            color: 'text-purple-400',
                          },
                          {
                            label: 'Eccentricity X',
                            value: `${(results.eccentricityX * 1000).toFixed(0)} mm`,
                            color: 'text-cyan-400',
                          },
                          {
                            label: 'Eccentricity Y',
                            value: `${(results.eccentricityY * 1000).toFixed(0)} mm`,
                            color: 'text-cyan-400',
                          },
                          {
                            label: 'Effective Length',
                            value: `${results.effectiveLength.toFixed(2)} m`,
                            color: 'text-white',
                          },
                          {
                            label: 'Effective Width',
                            value: `${results.effectiveWidth.toFixed(2)} m`,
                            color: 'text-white',
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-3 rounded-xl bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30"
                          >
                            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                            <p className={cn('font-bold font-mono text-lg', item.color)}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <Card
                    variant="glass"
                    className="border border-blue-500/40 shadow-lg shadow-blue-500/5 h-full"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <FiZap className="text-white" size={14} />
                        </div>
                        Reinforcement Design
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            label: 'Bending Moment',
                            value: `${results.bendingMoment.toFixed(1)} kNm/m`,
                          },
                          { label: 'Required As', value: `${results.requiredAs.toFixed(0)} mm²/m` },
                          {
                            label: 'Effective Depth',
                            value: `${(results.effectiveDepth * 1000).toFixed(0)} mm`,
                          },
                          {
                            label: 'Concrete Grade',
                            value:
                              CONCRETE_PRESETS[form.concreteGrade]?.label || form.concreteGrade,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-3 rounded-xl bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30"
                          >
                            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                            <p className="text-blue-400 font-bold font-mono text-lg">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ── Material & Efficiency ── */}
              <div className="text-xs font-bold text-orange-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                <FiBox size={12} /> Material & Cost
              </div>

              {/* Material Quantities - full width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card
                  variant="glass"
                  className="border border-orange-500/40 shadow-lg shadow-orange-500/5"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <FiPackage className="text-white" size={14} />
                      </div>
                      Material Quantities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {
                          label: 'Concrete',
                          value: `${results.materialQuantities.concreteVolume.toFixed(2)}`,
                          unit: 'm³',
                        },
                        {
                          label: 'Reinforcement',
                          value: `${results.materialQuantities.rebarWeight.toFixed(0)}`,
                          unit: 'kg',
                        },
                        {
                          label: 'Formwork',
                          value: `${results.materialQuantities.formworkArea.toFixed(1)}`,
                          unit: 'm²',
                        },
                        {
                          label: 'Excavation',
                          value: `${results.materialQuantities.excavationVolume.toFixed(1)}`,
                          unit: 'm³',
                        },
                      ].map((q) => (
                        <div
                          key={q.label}
                          className="p-4 rounded-xl bg-gradient-to-br from-orange-900/20 to-orange-800/10 border border-orange-700/30 text-center"
                        >
                          <p className="text-xs text-gray-500 uppercase">{q.label}</p>
                          <p className="text-2xl font-black text-white">{q.value}</p>
                          <p className="text-orange-400 text-sm font-medium">{q.unit}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cost Estimation + Design Efficiency side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <Card
                    variant="glass"
                    className="border border-green-500/40 shadow-lg shadow-green-500/5 h-full"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                          <FiDollarSign className="text-white" size={14} />
                        </div>
                        Cost Estimation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[
                          { label: 'Concrete', value: results.costEstimate.concrete },
                          { label: 'Reinforcement', value: results.costEstimate.rebar },
                          { label: 'Formwork', value: results.costEstimate.formwork },
                          { label: 'Excavation', value: results.costEstimate.excavation },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex justify-between py-2 border-b border-green-800/30"
                          >
                            <span className="text-gray-400 text-sm">{item.label}</span>
                            <span className="text-white font-mono font-bold">
                              £{item.value.toFixed(0)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between py-3 mt-1">
                          <span className="text-green-400 font-bold">Total</span>
                          <span className="text-green-400 font-mono font-black text-lg">
                            £{results.costEstimate.total.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card
                    variant="glass"
                    className="border border-yellow-500/30 shadow-lg shadow-yellow-500/5 h-full"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                          <FiTool className="text-white" size={14} />
                        </div>
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {results.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 p-3 rounded-xl bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-700/30"
                          >
                            <FiCheckCircle
                              className="text-yellow-400 mt-0.5 flex-shrink-0"
                              size={14}
                            />
                            <span className="text-gray-300 text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <Card className="bg-gray-900/50 border-amber-500/40 shadow-lg shadow-amber-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
                          <FiAlertTriangle className="text-white" size={14} />
                        </div>
                        Warnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {warnings.map((w, i) => (
                          <li
                            key={i}
                            className="text-amber-400 text-sm flex items-start gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-700/20"
                          >
                            <FiAlertTriangle className="mt-0.5 flex-shrink-0" /> {w.message}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* === VISUALIZATION TAB === */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="mt-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-white">3D Visualization</h2>
                <div className="flex items-center gap-3">
                  {cameraPresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setCameraPos(preset.pos as [number, number, number])}
                      className="px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-300 text-xs hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
                    >
                      {preset.icon} {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {render3DScene('h-[500px]')}

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {results.checks.map((check) => (
                  <div
                    key={check.title}
                    className={cn(
                      'p-4 rounded-xl border',
                      check.status === 'PASS'
                        ? 'border-green-500/30 bg-green-500/5'
                        : check.status === 'WARNING'
                          ? 'border-yellow-500/30 bg-yellow-500/5'
                          : 'border-red-500/30 bg-red-500/5',
                    )}
                  >
                    <p className="text-xs text-gray-400 uppercase">{check.title}</p>
                    <p className={cn('text-2xl font-black', statusColor(check.status))}>
                      {(check.utilisation * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">{check.status}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          .bg-grid-pattern {
            background-image:
              linear-gradient(rgba(0,217,255,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,217,255,0.07) 1px, transparent 1px);
            background-size: 50px 50px;
          }
        `}</style>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

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
    <label className="text-sm font-semibold text-gray-200 mb-1 block">
      {label} {unit && <span className="text-neon-cyan text-xs">({unit})</span>}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white font-mono"
    />
  </div>
);

export default SpreadFootings;
