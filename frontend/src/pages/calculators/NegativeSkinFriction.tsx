// =============================================================================
// BeaverCalc Studio — Negative Skin Friction Calculator (Premium)
// Pile drag load analysis due to settling soils and surcharge
// =============================================================================

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiArrowDown,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiInfo,
    FiLayers,
    FiMaximize2,
    FiMinimize2,
    FiSettings,
    FiSliders,
    FiTrendingDown,
    FiX,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import NegSkinFriction3D from '../../components/3d/scenes/NegSkinFriction3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
import { validateNumericInputs } from '../../lib/validation';
// TYPES
// =============================================================================

interface FormData {
  pileDiameter: string;
  pileLength: string;
  pileType: string;
  surchargeLoad: string;
  fillThickness: string;
  compressibleThickness: string;
  neutralPlaneDepth: string;
  soilGamma: string;
  adhesionFactor: string;
  appliedLoad: string;
  concreteStrength: string;
  steelArea: string;
}

interface Results {
  dragLoad: number;
  positiveShaftResistance: number;
  endBearing: number;
  totalResistance: number;
  structuralCapacity: number;
  totalLoad: number;
  geoUtilisation: number;
  structUtilisation: number;
  neutralPlaneDepth: number;
  perimeter: number;
  avgStressAboveNP: number;
  avgStressBelowNP: number;
  overallStatus: 'PASS' | 'FAIL';
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const PILE_PRESETS: Record<string, { fcu: string; label: string }> = {
  cfa450: { fcu: '30', label: 'CFA 450mm (C30)' },
  cfa600: { fcu: '35', label: 'CFA 600mm (C35)' },
  bored750: { fcu: '35', label: 'Bored 750mm (C35)' },
  bored900: { fcu: '40', label: 'Bored 900mm (C40)' },
  driven300: { fcu: '50', label: 'Precast 300×300 (C50)' },
  driven350: { fcu: '50', label: 'Precast 350×350 (C50)' },
  steel: { fcu: '0', label: 'Steel Tube Pile' },
};

const SOIL_PRESETS: Record<string, { gamma: string; beta: string; label: string }> = {
  soft_clay: { gamma: '17', beta: '0.20', label: 'Soft Clay' },
  firm_clay: { gamma: '19', beta: '0.30', label: 'Firm Clay' },
  stiff_clay: { gamma: '20', beta: '0.40', label: 'Stiff Clay' },
  loose_sand: { gamma: '18', beta: '0.25', label: 'Loose Sand' },
  medium_sand: { gamma: '19', beta: '0.35', label: 'Medium Dense Sand' },
  dense_sand: { gamma: '20', beta: '0.45', label: 'Dense Sand' },
  peat: { gamma: '12', beta: '0.15', label: 'Peat/Organic' },
  alluvium: { gamma: '18', beta: '0.25', label: 'Alluvium' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const NegativeSkinFriction = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pile: true,
    soil: true,
    loads: true,
  });

  const [previewMaximized, setPreviewMaximized] = useState(false);

  const [form, setForm] = useState<FormData>({
    pileDiameter: '0.60',
    pileLength: '20',
    pileType: 'cfa600',
    surchargeLoad: '20',
    fillThickness: '5',
    compressibleThickness: '8',
    neutralPlaneDepth: '12',
    soilGamma: '18',
    adhesionFactor: '0.25',
    appliedLoad: '1500',
    concreteStrength: '35',
    steelArea: '2500',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
  { key: 'pileDiameter', label: 'Pile Diameter' },
  { key: 'pileLength', label: 'Pile Length' },
  { key: 'surchargeLoad', label: 'Surcharge Load' },
  { key: 'fillThickness', label: 'Fill Thickness' },
  { key: 'compressibleThickness', label: 'Compressible Thickness' },
  { key: 'neutralPlaneDepth', label: 'Neutral Plane Depth' },
  { key: 'soilGamma', label: 'Soil Gamma' },
  { key: 'adhesionFactor', label: 'Adhesion Factor' },
  { key: 'appliedLoad', label: 'Applied Load' },
  { key: 'concreteStrength', label: 'Concrete Strength' },
  { key: 'steelArea', label: 'Steel Area' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs.map(e => ({ type: 'error' as const, message: e })));
      return false;
    }
    return true;
  };
  // Update form helper for What-If
  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'pileDiameter', label: 'Pile Diameter', min: 0, max: 100, step: 1, unit: '' },
    { key: 'pileLength', label: 'Pile Length', min: 0, max: 100, step: 1, unit: '' },
    { key: 'pileType', label: 'Pile Type', min: 0, max: 100, step: 1, unit: '' },
    { key: 'surchargeLoad', label: 'Surcharge Load', min: 0, max: 100, step: 1, unit: '' }
  ];

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedSoil, setSelectedSoil] = useState<string>('soft_clay');


  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    if (!validateInputs()) return;
    const newWarnings: Warning[] = [];

    try {
      const D = parseFloat(form.pileDiameter);
      const L = parseFloat(form.pileLength);
      const q_surcharge = parseFloat(form.surchargeLoad);
      const z_np = parseFloat(form.neutralPlaneDepth);
      const gamma = parseFloat(form.soilGamma);
      const beta = parseFloat(form.adhesionFactor);
      const P_applied = parseFloat(form.appliedLoad);
      const fcu = parseFloat(form.concreteStrength);
      const As = parseFloat(form.steelArea);

      if (D <= 0 || L <= 0) {
        newWarnings.push({ type: 'error', message: 'Pile dimensions must be positive' });
        setWarnings(newWarnings);
        return;
      }

      if (z_np > L) {
        newWarnings.push({ type: 'warning', message: 'Neutral plane deeper than pile toe' });
      }

      const perimeter = Math.PI * D;
      const area = (Math.PI * D * D) / 4;
      const limitDepth = Math.min(z_np, L);

      // Drag load calculation (integration of beta * sigma_v' * perimeter)
      // sigma_v = q_surcharge + gamma * z
      // Integral from 0 to z_np: q*z + gamma*z²/2
      const integratedStress = q_surcharge * limitDepth + (gamma * limitDepth * limitDepth) / 2;
      const dragLoad = beta * integratedStress * perimeter;
      const avgStressAboveNP = integratedStress / limitDepth;

      // Positive shaft friction below neutral plane
      const remainingLength = Math.max(0, L - z_np);
      const stressAtNP = q_surcharge + gamma * z_np;
      const stressAtTip = q_surcharge + gamma * L;
      const avgStressBelowNP = (stressAtNP + stressAtTip) / 2;

      const positiveShaftResistance =
        remainingLength > 0
          ? beta * 1.5 * avgStressBelowNP * perimeter * remainingLength // Higher beta for stable soil
          : 0;

      // End bearing (Nq ≈ 30 for dense bearing stratum)
      const Nq = 30;
      const endBearing = stressAtTip * Nq * area;

      // Structural capacity
      const fcd = fcu / 1.5; // Design concrete strength
      const fy = 500;
      const structuralCapacity = 0.35 * fcd * 1000 * area + (0.67 * fy * As) / 1000000;

      const totalResistance = positiveShaftResistance + endBearing;
      const totalLoad = P_applied + dragLoad;
      const geoUtilisation = totalLoad / totalResistance;
      const structUtilisation = totalLoad / structuralCapacity;

      // Warnings
      if (geoUtilisation > 0.9 && geoUtilisation <= 1.0) {
        newWarnings.push({
          type: 'warning',
          message: `Geotechnical utilisation at ${(geoUtilisation * 100).toFixed(0)}%`,
        });
      }
      if (structUtilisation > 0.9 && structUtilisation <= 1.0) {
        newWarnings.push({
          type: 'warning',
          message: `Structural utilisation at ${(structUtilisation * 100).toFixed(0)}%`,
        });
      }
      if (dragLoad > P_applied * 0.5) {
        newWarnings.push({
          type: 'info',
          message: `Drag load is ${((dragLoad / P_applied) * 100).toFixed(0)}% of applied load`,
        });
      }

      const overallStatus = geoUtilisation <= 1.0 && structUtilisation <= 1.0 ? 'PASS' : 'FAIL';

      setResults({
        dragLoad,
        positiveShaftResistance,
        endBearing,
        totalResistance,
        structuralCapacity,
        totalLoad,
        geoUtilisation,
        structUtilisation,
        neutralPlaneDepth: z_np,
        perimeter,
        avgStressAboveNP,
        avgStressBelowNP,
        overallStatus,
      });
    } catch {
      newWarnings.push({ type: 'error', message: 'Calculation error' });
    }

    setWarnings(newWarnings);
  };

  useEffect(() => {
    calculate();
  }, [form]);

  // ===========================================================================
  // VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  const applyPilePreset = (key: string) => {
    const preset = PILE_PRESETS[key];
    if (preset) {
      setForm((prev) => ({ ...prev, pileType: key, concreteStrength: preset.fcu }));
    }
  };

  const applySoilPreset = (key: string) => {
    const preset = SOIL_PRESETS[key];
    if (preset) {
      setSelectedSoil(key);
      setForm((prev) => ({
        ...prev,
        soilGamma: preset.gamma,
        adhesionFactor: preset.beta,
      }));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ===========================================================================
  // PDF EXPORT
  // ===========================================================================

  const exportPDF = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.geoUtilisation > 1.0)
      pdfRecs.push({
        check: 'Geotechnical Overload',
        suggestion:
          'Pile capacity insufficient for total load including drag — increase diameter or length',
      });
    if (results.structUtilisation > 1.0)
      pdfRecs.push({
        check: 'Structural Overload',
        suggestion:
          'Pile structural capacity insufficient — increase concrete grade or reinforcement',
      });
    if (results.dragLoad > parseFloat(form.appliedLoad) * 0.5)
      pdfRecs.push({
        check: 'High Drag Load',
        suggestion: `Drag is ${((results.dragLoad / parseFloat(form.appliedLoad)) * 100).toFixed(0)}% of applied — consider bitumen coating above neutral plane`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Pile geotechnical and structural capacity are satisfactory',
      });
    generatePremiumPDF({
      title: 'Negative Skin Friction',
      subtitle: 'Pile Drag Load Analysis',
      projectInfo: [
        { label: 'Project', value: 'Negative Skin Friction' },
        { label: 'Reference', value: 'NEG001' },
        { label: 'Standard', value: 'Eurocode 7 / β Method' },
      ],
      inputs: [
        { label: 'Pile Diameter', value: `${form.pileDiameter} m` },
        { label: 'Pile Length', value: `${form.pileLength} m` },
        { label: 'Concrete Strength', value: `${form.concreteStrength} MPa` },
        { label: 'Unit Weight (γ)', value: `${form.soilGamma} kN/m³` },
        { label: 'Adhesion Factor (β)', value: form.adhesionFactor },
        { label: 'Neutral Plane', value: `${form.neutralPlaneDepth} m` },
        { label: 'Surcharge', value: `${form.surchargeLoad} kPa` },
        { label: 'Applied Load', value: `${form.appliedLoad} kN` },
      ],
      sections: [
        {
          title: 'Drag Load & Capacity Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Pile Perimeter', results.perimeter.toFixed(2), 'm'],
            ['Drag Load (NSF)', results.dragLoad.toFixed(0), 'kN'],
            ['Positive Shaft Resistance', results.positiveShaftResistance.toFixed(0), 'kN'],
            ['End Bearing', results.endBearing.toFixed(0), 'kN'],
            ['Total Resistance', results.totalResistance.toFixed(0), 'kN'],
            ['Total Load (Applied + Drag)', results.totalLoad.toFixed(0), 'kN'],
            ['Structural Capacity', results.structuralCapacity.toFixed(0), 'kN'],
            ['Geotechnical Utilisation', `${(results.geoUtilisation * 100).toFixed(0)}`, '%'],
            ['Structural Utilisation', `${(results.structUtilisation * 100).toFixed(0)}`, '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Geotechnical',
          capacity: `${results.totalResistance.toFixed(0)} kN`,
          utilisation: String(Math.round(results.geoUtilisation * 100)),
          status: (results.geoUtilisation <= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Structural',
          capacity: `${results.structuralCapacity.toFixed(0)} kN`,
          utilisation: String(Math.round(results.structUtilisation * 100)),
          status: (results.structUtilisation <= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Negative Skin Friction',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const pdfRecs: { check: string; suggestion: string }[] = [];
    if (results.geoUtilisation > 1.0)
      pdfRecs.push({
        check: 'Geotechnical Overload',
        suggestion:
          'Pile capacity insufficient for total load including drag — increase diameter or length',
      });
    if (results.structUtilisation > 1.0)
      pdfRecs.push({
        check: 'Structural Overload',
        suggestion:
          'Pile structural capacity insufficient — increase concrete grade or reinforcement',
      });
    if (results.dragLoad > parseFloat(form.appliedLoad) * 0.5)
      pdfRecs.push({
        check: 'High Drag Load',
        suggestion: `Drag is ${((results.dragLoad / parseFloat(form.appliedLoad)) * 100).toFixed(0)}% of applied — consider bitumen coating above neutral plane`,
      });
    if (pdfRecs.length === 0)
      pdfRecs.push({
        check: 'Design Adequate',
        suggestion: 'Pile geotechnical and structural capacity are satisfactory',
      });
    generateDOCX({
      title: 'Negative Skin Friction',
      subtitle: 'Pile Drag Load Analysis',
      projectInfo: [
        { label: 'Project', value: 'Negative Skin Friction' },
        { label: 'Reference', value: 'NEG001' },
        { label: 'Standard', value: 'Eurocode 7 / β Method' },
      ],
      inputs: [
        { label: 'Pile Diameter', value: `${form.pileDiameter} m` },
        { label: 'Pile Length', value: `${form.pileLength} m` },
        { label: 'Concrete Strength', value: `${form.concreteStrength} MPa` },
        { label: 'Unit Weight (γ)', value: `${form.soilGamma} kN/m³` },
        { label: 'Adhesion Factor (β)', value: form.adhesionFactor },
        { label: 'Neutral Plane', value: `${form.neutralPlaneDepth} m` },
        { label: 'Surcharge', value: `${form.surchargeLoad} kPa` },
        { label: 'Applied Load', value: `${form.appliedLoad} kN` },
      ],
      sections: [
        {
          title: 'Drag Load & Capacity Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Pile Perimeter', results.perimeter.toFixed(2), 'm'],
            ['Drag Load (NSF)', results.dragLoad.toFixed(0), 'kN'],
            ['Positive Shaft Resistance', results.positiveShaftResistance.toFixed(0), 'kN'],
            ['End Bearing', results.endBearing.toFixed(0), 'kN'],
            ['Total Resistance', results.totalResistance.toFixed(0), 'kN'],
            ['Total Load (Applied + Drag)', results.totalLoad.toFixed(0), 'kN'],
            ['Structural Capacity', results.structuralCapacity.toFixed(0), 'kN'],
            ['Geotechnical Utilisation', `${(results.geoUtilisation * 100).toFixed(0)}`, '%'],
            ['Structural Utilisation', `${(results.structUtilisation * 100).toFixed(0)}`, '%'],
          ],
        },
      ],
      checks: [
        {
          name: 'Geotechnical',
          capacity: `${results.totalResistance.toFixed(0)} kN`,
          utilisation: String(Math.round(results.geoUtilisation * 100)),
          status: (results.geoUtilisation <= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Structural',
          capacity: `${results.structuralCapacity.toFixed(0)} kN`,
          utilisation: String(Math.round(results.structUtilisation * 100)),
          status: (results.structUtilisation <= 1.0 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: pdfRecs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Negative Skin Friction',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />

      {/* 2. Grid pattern background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-grid-pattern" />

      {/* Ambient glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 via-transparent to-neon-purple/10" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl" />
      </div>

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
              <NegSkinFriction3D />
            </Interactive3DDiagram>
            <button
              onClick={() => setPreviewMaximized(false)}
              className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
              aria-label="Minimize preview"
            >
              <FiMinimize2 size={20} />
            </button>
            <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
              NEGATIVE SKIN FRICTION — REAL-TIME PREVIEW
            </div>
          </div>
          <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
            <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
              <FiSliders size={14} /> Live Parameters
            </h3>
            {[
              { label: 'Pile Diameter', key: 'pileDiameter', min: 0.3, max: 2.0, step: 0.05, unit: 'm' },
              { label: 'Pile Length', key: 'pileLength', min: 5, max: 50, step: 1, unit: 'm' },
              { label: 'Applied Load', key: 'appliedLoad', min: 100, max: 5000, step: 100, unit: 'kN' },
            ].map((s) => (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">{s.label}</span>
                  <span className="text-white">{(form as any)[s.key]} {s.unit}</span>
                </div>
                <input
                  title={s.label}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={(form as any)[s.key]}
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
                { label: 'Pile Type', value: form.pileType },
                { label: 'Diameter', value: `${form.pileDiameter} m` },
                { label: 'Length', value: `${form.pileLength} m` },
                { label: 'Applied Load', value: `${form.appliedLoad} kN` },
                { label: 'Fill Thickness', value: `${form.fillThickness} m` },
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
                    { label: 'Drag Load', value: `${results.dragLoad.toFixed(0)} kN`, ok: true },
                    { label: 'Geo Util', value: `${(results.geoUtilisation * 100).toFixed(1)}%`, ok: results.geoUtilisation <= 1 },
                    { label: 'Struct Util', value: `${(results.structUtilisation * 100).toFixed(1)}%`, ok: results.structUtilisation <= 1 },
                    { label: 'Status', value: results.overallStatus, ok: results.overallStatus === 'PASS' },
                  ].map((check) => (
                    <div key={check.label} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-500">{check.label}</span>
                      <span className={cn('font-bold', check.ok ? 'text-emerald-400' : 'text-red-500')}>
                        {check.value}
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

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 3. Glass toolbar + 4. Gradient hero title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-neon-cyan/30 bg-neon-cyan/5">
              <FiTrendingDown className="text-neon-cyan" />
              <span className="text-gray-200 font-mono tracking-wider text-sm">GEOTECHNICS | FOUNDATIONS</span>
            </div>
            <div className="flex items-center gap-2">
              {results && (
                <>
                  <Button
                    onClick={exportPDF}
                    className="bg-neon-blue/20 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/30"
                  >
                    <FiDownload className="mr-1" /> PDF
                  </Button>
                  <Button
                    onClick={exportDOCX}
                    className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                  >
                    <FiDownload className="mr-1" /> DOCX
                  </Button>
                </>
              )}
            </div>
          </div>

          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
              Negative Skin Friction
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Pile drag load analysis for settling soils, surcharge effects, and neutral plane
            determination.
          </p>
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
                  {results.overallStatus === 'PASS' ? 'Design Adequate' : 'Design Inadequate'}
                </div>
                <div className="text-gray-400 text-sm">
                  Drag Load: {results.dragLoad.toFixed(0)} kN | Total:{' '}
                  {results.totalLoad.toFixed(0)} kN
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <SaveRunButton calculatorKey="negative-skin-friction" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined} />
            </div>
          </motion.div>
        )}

        {/* Warnings */}

        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6 space-y-2"
          >
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
          </motion.div>
        )}

        {/* Main Grid — inputs left, sticky results right */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: Inputs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pile Properties */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between py-4"
                onClick={() => toggleSection('pile')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                    <FiLayers className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <CardTitle className="text-xl font-bold text-white">Pile Properties</CardTitle>
                </div>
                <FiChevronDown
                  className={cn(
                    'text-gray-400 transition-transform',
                    expandedSections.pile && 'rotate-180',
                  )}
                />
              </CardHeader>

              {expandedSections.pile && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <CardContent className="space-y-4 pt-0">
                    <div>
                      <label className="text-sm font-semibold text-gray-200 mb-1 block">
                        Pile Type
                      </label>
                      <select
                        title="Pile Type"
                        value={form.pileType}
                        onChange={(e) => applyPilePreset(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      >
                        {Object.entries(PILE_PRESETS).map(([key, preset]) => (
                          <option key={key} value={key}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="Diameter"
                        value={form.pileDiameter}
                        onChange={(v) => setForm({ ...form, pileDiameter: v })}
                        unit="m"
                      />
                      <InputField
                        label="Length"
                        value={form.pileLength}
                        onChange={(v) => setForm({ ...form, pileLength: v })}
                        unit="m"
                      />
                    </div>
                    <InputField
                      label="Concrete Strength"
                      value={form.concreteStrength}
                      onChange={(v) => setForm({ ...form, concreteStrength: v })}
                      unit="MPa"
                    />
                  </CardContent>
                </motion.div>
              )}
            </Card>

            {/* Soil Properties */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between py-4"
                onClick={() => toggleSection('soil')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                    <FiArrowDown className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <CardTitle className="text-xl font-bold text-white">Settling Soil</CardTitle>
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
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
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
                        label="Unit Weight"
                        value={form.soilGamma}
                        onChange={(v) => setForm({ ...form, soilGamma: v })}
                        unit="kN/m³"
                      />
                      <InputField
                        label="Beta (β)"
                        value={form.adhesionFactor}
                        onChange={(v) => setForm({ ...form, adhesionFactor: v })}
                        unit=""
                      />
                    </div>
                    <InputField
                      label="Neutral Plane Depth"
                      value={form.neutralPlaneDepth}
                      onChange={(v) => setForm({ ...form, neutralPlaneDepth: v })}
                      unit="m"
                    />
                    <InputField
                      label="Surcharge"
                      value={form.surchargeLoad}
                      onChange={(v) => setForm({ ...form, surchargeLoad: v })}
                      unit="kPa"
                    />
                  </CardContent>
                </motion.div>
              )}
            </Card>

            {/* Applied Loads */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between py-4"
                onClick={() => toggleSection('loads')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                    <FiActivity className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <CardTitle className="text-xl font-bold text-white">Applied Loads</CardTitle>
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
                      label="Axial Load (SLS)"
                      value={form.appliedLoad}
                      onChange={(v) => setForm({ ...form, appliedLoad: v })}
                      unit="kN"
                    />
                  </CardContent>
                </motion.div>
              )}
            </Card>

            {/* Analysis method info */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardContent className="py-3">
                <div className="flex items-start gap-2">
                  <FiSettings className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-500">
                    <p className="font-medium text-gray-400 mb-1">Analysis Method</p>
                    <p>
                      Beta method per Eurocode 7. Drag force = β·σ'v·perimeter. Consider
                      bitumen coating to reduce β above NP.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 10. Calculate button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center pt-4"
            >
              <Button
                onClick={calculate}
                className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl text-white text-2xl font-black uppercase tracking-widest"
              >
                ⚡ RUN FULL ANALYSIS
              </Button>
            </motion.div>

            {/* What-If + 3D Preview */}
            <div className="relative">
              <button
                onClick={() => setPreviewMaximized(true)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-gray-400 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                aria-label="Maximize preview"
                title="Fullscreen preview"
              >
                <FiMaximize2 size={16} />
              </button>
            </div>
            <WhatIfPreview
              title="Negative Skin Friction — 3D Preview"
              sliders={whatIfSliders}
              form={form}
              updateForm={updateForm}
              status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
              renderScene={(fsHeight) => (
                <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                  <NegSkinFriction3D />
                </Interactive3DDiagram>
              )}
            />

            {/* Mobile export buttons */}
            <div className="lg:hidden">
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={exportPDF}
                  className="w-full bg-gradient-to-r from-neon-cyan to-neon-blue"
                  disabled={!results}
                >
                  <FiDownload className="mr-2" />
                  Export PDF Report
                </Button>
                <Button
                  onClick={exportDOCX}
                  className="w-full bg-gradient-to-r from-neon-purple to-purple-600"
                  disabled={!results}
                >
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
              </div>
            </div>
          </div>

          {/* 11. RIGHT: Sticky sidebar with results */}
          <div className="lg:col-span-1 sticky top-8 self-start space-y-6">
            {results && (
              <>
                {/* Summary cards with border-l-4 */}
                <div className="grid grid-cols-1 gap-4">
                  <ResultCard
                    label="Drag Load"
                    value={results.dragLoad.toFixed(0)}
                    unit="kN"
                    icon={FiTrendingDown}
                    color="red"
                  />
                  <ResultCard
                    label="Total Load"
                    value={results.totalLoad.toFixed(0)}
                    unit="kN"
                    icon={FiActivity}
                    color="orange"
                  />
                  <ResultCard
                    label="Geo Capacity"
                    value={results.totalResistance.toFixed(0)}
                    unit="kN"
                    icon={FiLayers}
                    color="green"
                  />
                  <ResultCard
                    label="Geo Utilisation"
                    value={(results.geoUtilisation * 100).toFixed(0)}
                    unit="%"
                    icon={FiAlertTriangle}
                    color={results.geoUtilisation <= 1.0 ? 'green' : 'red'}
                    status={results.geoUtilisation <= 1.0 ? 'PASS' : 'FAIL'}
                  />
                </div>

                {/* Detailed Results */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="py-3">
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <FiInfo className="text-neon-cyan" />
                      Detailed Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="text-gray-400 text-xs uppercase mb-1">Positive Shaft</div>
                        <div className="text-white font-mono">{results.positiveShaftResistance.toFixed(0)} kN</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="text-gray-400 text-xs uppercase mb-1">End Bearing</div>
                        <div className="text-white font-mono">{results.endBearing.toFixed(0)} kN</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="text-gray-400 text-xs uppercase mb-1">Structural Cap.</div>
                        <div className="text-white font-mono">{results.structuralCapacity.toFixed(0)} kN</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-3">
                        <div className="text-gray-400 text-xs uppercase mb-1">Struct. Util.</div>
                        <div
                          className={cn(
                            'font-mono font-bold',
                            results.structUtilisation <= 1.0 ? 'text-green-400' : 'text-red-400',
                          )}
                        >
                          {(results.structUtilisation * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {(() => {
                  const recs: { icon: string; text: string }[] = [];
                  if (results.geoUtilisation > 1.0)
                    recs.push({ icon: '🔴', text: 'Geotechnical capacity exceeded — increase pile diameter or length' });
                  if (results.structUtilisation > 1.0)
                    recs.push({ icon: '🔴', text: 'Structural capacity exceeded — increase concrete grade or reinforcement' });
                  if (results.dragLoad > parseFloat(form.appliedLoad) * 0.5)
                    recs.push({ icon: '⚠️', text: `Drag load is ${((results.dragLoad / parseFloat(form.appliedLoad)) * 100).toFixed(0)}% of applied — consider bitumen coating` });
                  if (results.geoUtilisation > 0.85 && results.geoUtilisation <= 1.0)
                    recs.push({ icon: '📐', text: 'Near geotechnical capacity limit — review with conservative parameters' });
                  if (recs.length === 0)
                    recs.push({ icon: '✅', text: 'Pile design is adequate for applied load plus negative skin friction' });
                  return (
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader className="py-3">
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                          <FiInfo className="text-neon-cyan" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {recs.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <span>{r.icon}</span>
                            <span>{r.text}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid pattern CSS */}
      <style>{`
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
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
    <ExplainableLabel
      label={`${label}${unit ? ` (${unit})` : ''}`}
      field={field || 'negative-skin-friction'}
    />
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label}
      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 font-mono"
    />
  </div>
);

const ResultCard = ({
  label,
  value,
  unit,
  icon: Icon,
  color,
  status,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'red' | 'green' | 'orange' | 'blue';
  status?: string;
}) => {
  const borderColor = {
    red: 'border-l-red-500',
    green: 'border-l-green-500',
    orange: 'border-l-amber-500',
    blue: 'border-l-blue-500',
  };

  return (
    <Card variant="glass" className={cn('border-l-4 p-4', borderColor[color], 'border-neon-cyan/30 shadow-2xl')}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-neon-cyan" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-200">{label}</div>
          <div className="text-2xl font-bold font-mono text-white">
            {value}
            <span className="text-sm text-gray-400 ml-1">{unit}</span>
          </div>
        </div>
        {status && (
          <div
            className={cn(
              'px-2 py-1 rounded-md text-xs font-bold uppercase',
              status === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
            )}
          >
            {status}
          </div>
        )}
      </div>
    </Card>
  );
};

export default NegativeSkinFriction;
