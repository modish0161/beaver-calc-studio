import { motion } from 'framer-motion';
import React, { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiDownload,
  FiMinimize2,
  FiSettings,
  FiSliders,
  FiTarget,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import PileCapacity3D from '../../components/3d/scenes/PileCapacity3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
interface SoilLayer {
  id: string;
  name: string;
  thickness: number; // m
  soilType: 'clay' | 'sand' | 'gravel' | 'silt' | 'rock';
  sptN: number; // SPT N-value
  cptQc: number; // CPT cone resistance (MPa)
  cu: number; // Undrained shear strength (kPa) for cohesive soils
  phi: number; // Friction angle (degrees) for granular soils
  gamma: number; // Unit weight (kN/m³)
}

interface PileFormInputs {
  pileType: 'bored' | 'driven' | 'cfa';
  pileDiameter: number; // mm
  pileLength: number; // m
  appliedLoad: number; // kN
  baseMethod: 'spt' | 'cpt' | 'analytical';
  shaftMethod: 'spt' | 'cpt' | 'alpha' | 'beta';
  designApproach: 'DA1-1' | 'DA1-2' | 'DA2' | 'DA3';
  correlationFactor: number; // ξ factor based on number of pile tests
  modelFactor: number; // γRd model factor
}

interface CalculationResults {
  baseResistance: number; // kN
  shaftResistance: number; // kN
  ultimateCapacity: number; // kN
  characteristicCapacity: number; // kN
  designCapacity: number; // kN
  utilisationRatio: number;
  settlementEstimate: number; // mm
  layerContributions: {
    layerName: string;
    shaftContribution: number;
    depth: number;
  }[];
  partialFactors: {
    gammaB: number;
    gammaS: number;
    gammaR: number;
  };
  isPassing: boolean;
}

// Default soil layers
const defaultSoilLayers: SoilLayer[] = [
  {
    id: '1',
    name: 'Fill/Topsoil',
    thickness: 1.5,
    soilType: 'sand',
    sptN: 5,
    cptQc: 2,
    cu: 0,
    phi: 28,
    gamma: 17,
  },
  {
    id: '2',
    name: 'Firm Clay',
    thickness: 4.0,
    soilType: 'clay',
    sptN: 12,
    cptQc: 1.5,
    cu: 75,
    phi: 0,
    gamma: 19,
  },
  {
    id: '3',
    name: 'Dense Sand',
    thickness: 8.0,
    soilType: 'sand',
    sptN: 35,
    cptQc: 15,
    cu: 0,
    phi: 36,
    gamma: 20,
  },
  {
    id: '4',
    name: 'Stiff Clay',
    thickness: 10.0,
    soilType: 'clay',
    sptN: 25,
    cptQc: 3,
    cu: 150,
    phi: 0,
    gamma: 20,
  },
];

// Partial factors per EN 1997
const partialFactors = {
  'DA1-1': { gammaB: 1.0, gammaS: 1.0, gammaR: 1.0 },
  'DA1-2': { gammaB: 1.3, gammaS: 1.3, gammaR: 1.0 },
  DA2: { gammaB: 1.1, gammaS: 1.1, gammaR: 1.0 },
  DA3: { gammaB: 1.0, gammaS: 1.0, gammaR: 1.0 },
};

// Pile type factors
const pileTypeFactors = {
  bored: { baseMultiplier: 0.8, shaftMultiplier: 0.9 },
  driven: { baseMultiplier: 1.0, shaftMultiplier: 1.0 },
  cfa: { baseMultiplier: 0.85, shaftMultiplier: 0.95 },
};

const PRESETS = {
  bored_600: {
    name: 'Bored Pile Ø600',
    pileType: 'bored',
    diameter: '600',
    length: '15.0',
  },
  driven_450: {
    name: 'Driven Pile Ø450',
    pileType: 'driven',
    diameter: '450',
    length: '12.0',
  },
  cfa_750: {
    name: 'CFA Pile Ø750',
    pileType: 'cfa',
    diameter: '750',
    length: '20.0',
  },
  steel_h: {
    name: 'Steel H-Pile',
    pileType: 'steel_h',
    diameter: '356',
    length: '18.0',
  },
};

const PileCapacity: React.FC = () => {
  const [form, setForm] = useState<PileFormInputs>({
    pileType: 'bored',
    pileDiameter: 600,
    pileLength: 15,
    appliedLoad: 2500,
    baseMethod: 'spt',
    shaftMethod: 'alpha',
    designApproach: 'DA2',
    correlationFactor: 1.4,
    modelFactor: 1.2,
  });
  // Update form helper for What-If
  const updateForm = (field: keyof PileFormInputs, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as string }));
  };

  // What-If sliders
  const whatIfSliders = [
    { key: 'pileDiameter', label: 'Pile Diameter', min: 300, max: 1500, step: 50, unit: 'mm' },
    { key: 'pileLength', label: 'Pile Length', min: 5, max: 40, step: 1, unit: 'm' },
    { key: 'appliedLoad', label: 'Applied Load', min: 500, max: 10000, step: 250, unit: 'kN' },
    {
      key: 'correlationFactor',
      label: 'Correlation Factor',
      min: 1.0,
      max: 2.0,
      step: 0.1,
      unit: '',
    },
  ];

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (preset) {
      const { name, ...values } = preset;
      setForm((prev: any) => ({ ...prev, ...values }));
    }
  };

  const [soilLayers, setSoilLayers] = useState<SoilLayer[]>(defaultSoilLayers);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'inputs' | 'soil' | 'results' | 'visualization'>(
    'inputs',
  );
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const validateInputs = (): boolean => {
    const errors = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'pileDiameter', label: 'Pile Diameter' },
      { key: 'pileLength', label: 'Pile Length' },
      { key: 'appliedLoad', label: 'Applied Load' },
      { key: 'correlationFactor', label: 'Correlation Factor' },
      { key: 'modelFactor', label: 'Model Factor' },
    ]);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return false;
    }
    return true;
  };

  // Calculate pile capacity
  const calculatePileCapacity = () => {
    if (!validateInputs()) return;
    setIsCalculating(true);

    setTimeout(() => {
      const diameter = form.pileDiameter / 1000; // Convert to m
      const radius = diameter / 2;
      const pileArea = Math.PI * radius * radius;
      const perimeter = Math.PI * diameter;

      // Get pile type factors
      const typeFactors = pileTypeFactors[form.pileType];

      // Calculate base resistance
      let baseResistance = 0;
      let totalDepth = 0;
      let baseLayer: SoilLayer | null = null;

      // Find the layer at pile base
      for (const layer of soilLayers) {
        if (totalDepth + layer.thickness >= form.pileLength) {
          baseLayer = layer;
          break;
        }
        totalDepth += layer.thickness;
      }

      if (baseLayer) {
        if (form.baseMethod === 'spt') {
          // Meyerhof method for SPT
          if (baseLayer.soilType === 'sand' || baseLayer.soilType === 'gravel') {
            const Nb = Math.min(baseLayer.sptN, 50);
            const qb = 400 * Nb * typeFactors.baseMultiplier; // kPa
            baseResistance = qb * pileArea;
          } else {
            // Clay - use Nc method
            const Nc = 9;
            const qb = Nc * baseLayer.cu * typeFactors.baseMultiplier;
            baseResistance = qb * pileArea;
          }
        } else if (form.baseMethod === 'cpt') {
          // CPT method
          const qb = baseLayer.cptQc * 1000 * 0.15 * typeFactors.baseMultiplier; // kPa
          baseResistance = qb * pileArea;
        } else {
          // Analytical method
          if (baseLayer.soilType === 'sand' || baseLayer.soilType === 'gravel') {
            const Nq =
              Math.exp(Math.PI * Math.tan((baseLayer.phi * Math.PI) / 180)) *
              Math.pow((Math.tan(45 + baseLayer.phi / 2) * Math.PI) / 180, 2);
            const sigmav = form.pileLength * baseLayer.gamma;
            const qb = sigmav * Nq * typeFactors.baseMultiplier;
            baseResistance = Math.min(qb * pileArea, 15000 * pileArea); // Limit to 15 MPa
          } else {
            const Nc = 9;
            const qb = Nc * baseLayer.cu * typeFactors.baseMultiplier;
            baseResistance = qb * pileArea;
          }
        }
      }

      // Calculate shaft resistance
      let shaftResistance = 0;
      let currentDepth = 0;
      const layerContributions: { layerName: string; shaftContribution: number; depth: number }[] =
        [];

      for (const layer of soilLayers) {
        const layerTop = currentDepth;
        const layerBottom = currentDepth + layer.thickness;

        // Determine how much of this layer is within pile length
        if (layerTop >= form.pileLength) break;

        const effectiveTop = Math.max(0, layerTop);
        const effectiveBottom = Math.min(form.pileLength, layerBottom);
        const effectiveThickness = effectiveBottom - effectiveTop;

        if (effectiveThickness <= 0) {
          currentDepth += layer.thickness;
          continue;
        }

        let fs = 0; // Unit shaft friction (kPa)

        if (form.shaftMethod === 'spt') {
          // SPT-based method
          if (layer.soilType === 'sand' || layer.soilType === 'gravel') {
            fs = 2 * layer.sptN * typeFactors.shaftMultiplier;
          } else {
            fs = layer.sptN * 2.5 * typeFactors.shaftMultiplier;
          }
        } else if (form.shaftMethod === 'cpt') {
          // CPT-based method
          fs = ((layer.cptQc * 1000) / 200) * typeFactors.shaftMultiplier;
        } else if (form.shaftMethod === 'alpha') {
          // Alpha method for cohesive soils
          if (layer.soilType === 'clay' || layer.soilType === 'silt') {
            const alpha =
              layer.cu <= 25
                ? 1.0
                : layer.cu <= 70
                  ? 1.0 - (0.5 * (layer.cu - 25)) / 45
                  : 0.5 - 0.25 * Math.min((layer.cu - 70) / 130, 1);
            fs = alpha * layer.cu * typeFactors.shaftMultiplier;
          } else {
            // Use beta method for granular
            const beta = 0.25 + 0.01 * layer.phi;
            const sigmav = ((effectiveTop + effectiveBottom) / 2) * layer.gamma;
            fs = beta * sigmav * typeFactors.shaftMultiplier;
          }
        } else {
          // Beta method
          const beta =
            layer.soilType === 'clay' || layer.soilType === 'silt'
              ? 0.2 + (0.005 * layer.cu) / 25
              : 0.25 + 0.01 * layer.phi;
          const sigmav = ((effectiveTop + effectiveBottom) / 2) * layer.gamma;
          fs = beta * sigmav * typeFactors.shaftMultiplier;
        }

        // Limit shaft friction
        fs = Math.min(fs, 200); // Max 200 kPa

        const layerShaftResistance = fs * perimeter * effectiveThickness;
        shaftResistance += layerShaftResistance;

        layerContributions.push({
          layerName: layer.name,
          shaftContribution: layerShaftResistance,
          depth: effectiveBottom,
        });

        currentDepth += layer.thickness;
      }

      // Ultimate capacity
      const ultimateCapacity = baseResistance + shaftResistance;

      // Apply correlation factor for characteristic capacity
      const characteristicCapacity = ultimateCapacity / form.correlationFactor;

      // Get partial factors
      const factors = partialFactors[form.designApproach];

      // Design capacity
      const designCapacity =
        baseResistance / (factors.gammaB * form.modelFactor) +
        shaftResistance / (factors.gammaS * form.modelFactor);

      // Utilisation ratio
      const utilisationRatio = form.appliedLoad / designCapacity;

      // Settlement estimate (simplified elastic method)
      const Es = baseLayer ? (baseLayer.soilType === 'sand' ? 30000 : 15000) : 20000; // kPa
      const I = 0.5; // Influence factor
      const settlementEstimate =
        ((form.appliedLoad * form.pileLength * 1000) / (pileArea * Es)) * I +
        ((form.appliedLoad * diameter * 1000) / (pileArea * Es)) * 0.25;

      setResults({
        baseResistance,
        shaftResistance,
        ultimateCapacity,
        characteristicCapacity,
        designCapacity,
        utilisationRatio,
        settlementEstimate,
        layerContributions,
        partialFactors: factors,
        isPassing: utilisationRatio <= 1.0,
      });

      setIsCalculating(false);
      setActiveTab('results');
    }, 500);
  };

  // Add soil layer
  const addSoilLayer = () => {
    const newLayer: SoilLayer = {
      id: Date.now().toString(),
      name: `Layer ${soilLayers.length + 1}`,
      thickness: 3.0,
      soilType: 'clay',
      sptN: 15,
      cptQc: 2,
      cu: 100,
      phi: 0,
      gamma: 19,
    };
    setSoilLayers([...soilLayers, newLayer]);
  };

  // Remove soil layer
  const removeSoilLayer = (id: string) => {
    if (soilLayers.length > 1) {
      setSoilLayers(soilLayers.filter((layer) => layer.id !== id));
    }
  };

  // Update soil layer
  const updateSoilLayer = (id: string, field: keyof SoilLayer, value: any) => {
    setSoilLayers(
      soilLayers.map((layer) => (layer.id === id ? { ...layer, [field]: value } : layer)),
    );
  };

  // Export to PDF
  // ─────────────────────────────────────────────────────────────────────────────
  // PDF Export
  // ─────────────────────────────────────────────────────────────────────────────
  const exportToPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Pile Capacity Calculator',
      subtitle: 'EN 1997-1 (Eurocode 7) Compliant',
      projectInfo: [
        { label: 'Project', value: 'Pile Capacity Calculator' },
        { label: 'Standard', value: 'EN 1997-1 / BS EN 1997-1' },
        { label: 'Reference', value: 'PIL001' },
      ],
      inputs: [
        { label: 'Pile Type', value: form.pileType },
        { label: 'Pile Diameter', value: String(form.pileDiameter), unit: 'mm' },
        { label: 'Pile Length', value: String(form.pileLength), unit: 'm' },
        { label: 'Applied Load', value: String(form.appliedLoad), unit: 'kN' },
        { label: 'Base Method', value: form.baseMethod },
        { label: 'Shaft Method', value: form.shaftMethod },
        { label: 'Design Approach', value: form.designApproach },
        { label: 'Correlation Factor', value: String(form.correlationFactor) },
        { label: 'Model Factor', value: String(form.modelFactor) },
      ],
      sections: [
        {
          title: 'Pile Capacity Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Base Resistance', results.baseResistance.toFixed(1), 'kN'],
            ['Shaft Resistance', results.shaftResistance.toFixed(1), 'kN'],
            ['Ultimate Capacity', results.ultimateCapacity.toFixed(1), 'kN'],
            ['Characteristic Capacity', results.characteristicCapacity.toFixed(1), 'kN'],
            ['Design Capacity', results.designCapacity.toFixed(1), 'kN'],
            ['Utilisation Ratio', (results.utilisationRatio * 100).toFixed(1) + '%', '-'],
            ['Settlement Estimate', results.settlementEstimate.toFixed(1), 'mm'],
            ['\u03b3B (base)', results.partialFactors.gammaB.toFixed(2), '-'],
            ['\u03b3S (shaft)', results.partialFactors.gammaS.toFixed(2), '-'],
          ],
        },
      ],
      checks: [
        {
          name: 'Pile Bearing Capacity',
          capacity: `${results.designCapacity.toFixed(1)} kN`,
          utilisation: String((results.utilisationRatio * 100).toFixed(1)) + '%',
          status: (results.isPassing ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Settlement Check',
          capacity: '< 25 mm',
          utilisation: String(results.settlementEstimate.toFixed(1)) + ' mm',
          status: (results.settlementEstimate <= 25 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Load Testing',
          suggestion: 'Verify design capacity with maintained load test per BS EN ISO 22477-1',
        },
        {
          check: 'Integrity Testing',
          suggestion: 'Perform low-strain integrity testing on all production piles',
        },
        {
          check: 'Installation Records',
          suggestion: 'Record driving logs or boring records for every pile for correlation',
        },
        {
          check: 'Ground Investigation',
          suggestion: 'Ensure SI data covers full pile depth plus 3D below toe level',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Pile Capacity Calculator',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Pile Capacity Calculator',
      subtitle: 'EN 1997-1 (Eurocode 7) Compliant',
      projectInfo: [
        { label: 'Project', value: 'Pile Capacity Calculator' },
        { label: 'Standard', value: 'EN 1997-1 / BS EN 1997-1' },
        { label: 'Reference', value: 'PIL001' },
      ],
      inputs: [
        { label: 'Pile Type', value: form.pileType },
        { label: 'Pile Diameter', value: String(form.pileDiameter), unit: 'mm' },
        { label: 'Pile Length', value: String(form.pileLength), unit: 'm' },
        { label: 'Applied Load', value: String(form.appliedLoad), unit: 'kN' },
        { label: 'Base Method', value: form.baseMethod },
        { label: 'Shaft Method', value: form.shaftMethod },
        { label: 'Design Approach', value: form.designApproach },
        { label: 'Correlation Factor', value: String(form.correlationFactor) },
        { label: 'Model Factor', value: String(form.modelFactor) },
      ],
      sections: [
        {
          title: 'Pile Capacity Analysis',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Base Resistance', results.baseResistance.toFixed(1), 'kN'],
            ['Shaft Resistance', results.shaftResistance.toFixed(1), 'kN'],
            ['Ultimate Capacity', results.ultimateCapacity.toFixed(1), 'kN'],
            ['Characteristic Capacity', results.characteristicCapacity.toFixed(1), 'kN'],
            ['Design Capacity', results.designCapacity.toFixed(1), 'kN'],
            ['Utilisation Ratio', (results.utilisationRatio * 100).toFixed(1) + '%', '-'],
            ['Settlement Estimate', results.settlementEstimate.toFixed(1), 'mm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Pile Bearing Capacity',
          capacity: `${results.designCapacity.toFixed(1)} kN`,
          utilisation: String((results.utilisationRatio * 100).toFixed(1)) + '%',
          status: (results.isPassing ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Settlement Check',
          capacity: '< 25 mm',
          utilisation: String(results.settlementEstimate.toFixed(1)) + ' mm',
          status: (results.settlementEstimate <= 25 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd — Pile Capacity Calculator',
    });
  };

  // Calculate total soil depth
  const totalSoilDepth = soilLayers.reduce((sum, layer) => sum + layer.thickness, 0);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Fullscreen Preview Overlay */}
        {previewMaximized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex"
          >
            <div className="flex-1 relative">
              <Interactive3DDiagram height="h-full" cameraPosition={[6, 8, 6]}>
                <PileCapacity3D />
              </Interactive3DDiagram>
              <button
                onClick={() => setPreviewMaximized(false)}
                className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                aria-label="Minimize preview"
              >
                <FiMinimize2 size={20} />
              </button>
              <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                PILE CAPACITY — REAL-TIME PREVIEW
              </div>
            </div>
            <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
              <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                <FiSliders size={14} /> Live Parameters
              </h3>
              {[
                {
                  label: 'Pile Diameter',
                  key: 'pileDiameter',
                  min: 150,
                  max: 2000,
                  step: 50,
                  unit: 'mm',
                },
                { label: 'Pile Length', key: 'pileLength', min: 3, max: 60, step: 1, unit: 'm' },
                {
                  label: 'Applied Load',
                  key: 'appliedLoad',
                  min: 100,
                  max: 10000,
                  step: 100,
                  unit: 'kN',
                },
              ].map((s) => (
                <div key={s.key} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">{s.label}</span>
                    <span className="text-white">
                      {(form as any)[s.key]} {s.unit}
                    </span>
                  </div>
                  <input
                    title={s.label}
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={(form as any)[s.key]}
                    onChange={(e) => updateForm(s.key as keyof PileFormInputs, e.target.value)}
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
                  { label: 'Pile Type', value: form.pileType.toUpperCase() },
                  { label: 'Diameter', value: `${form.pileDiameter} mm` },
                  { label: 'Length', value: `${form.pileLength} m` },
                  { label: 'Applied Load', value: `${form.appliedLoad} kN` },
                  { label: 'Design Approach', value: form.designApproach },
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
                        label: 'Base Resistance',
                        value: `${results.baseResistance.toFixed(0)} kN`,
                        ok: true,
                      },
                      {
                        label: 'Shaft Resistance',
                        value: `${results.shaftResistance.toFixed(0)} kN`,
                        ok: true,
                      },
                      {
                        label: 'Design Capacity',
                        value: `${results.designCapacity.toFixed(0)} kN`,
                        ok: results.isPassing,
                      },
                      {
                        label: 'Utilisation',
                        value: `${(results.utilisationRatio * 100).toFixed(1)}%`,
                        ok: results.isPassing,
                      },
                    ].map((check) => (
                      <div key={check.label} className="flex justify-between text-xs py-0.5">
                        <span className="text-gray-500">{check.label}</span>
                        <span
                          className={cn(
                            'font-bold',
                            !check.ok
                              ? 'text-red-500'
                              : results.utilisationRatio > 0.9
                                ? 'text-orange-400'
                                : 'text-emerald-400',
                          )}
                        >
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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
              <FiTarget className="w-6 h-6 text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent">
                Pile Capacity Calculator
              </h1>
              <p className="text-lg text-gray-400">Geotechnical pile design per EN 1997</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-2">
            {['inputs', 'soil', 'results', 'visualization'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  'px-6 py-2 rounded-xl font-medium transition-all duration-200',
                  activeTab === tab
                    ? 'bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white',
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Inputs Tab */}
            {activeTab === 'inputs' && (
              <motion.div
                key="inputs"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Pile Geometry Card */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiSettings className="w-6 h-6 text-neon-cyan" />
                      </div>
                      Pile Geometry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <ExplainableLabel label="Pile Type" field="pile-type" />
                        <select
                          title="Pile Type"
                          value={form.pileType}
                          onChange={(e) => setForm({ ...form, pileType: e.target.value as any })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                        >
                          <option value="bored">Bored Pile</option>
                          <option value="driven">Driven Pile</option>
                          <option value="cfa">CFA Pile</option>
                        </select>
                      </div>
                      <div>
                        <ExplainableLabel label="Diameter (mm)" field="pile-diameter" />
                        <input
                          title="Pile Diameter"
                          type="number"
                          value={form.pileDiameter}
                          onChange={(e) =>
                            setForm({ ...form, pileDiameter: Number(e.target.value) })
                          }
                          min={300}
                          max={2000}
                          step={50}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                        />
                        <p className="text-xs text-gray-500 mt-1">Range: 300-2000mm</p>
                      </div>
                      <div>
                        <ExplainableLabel label="Length (m)" field="pile-length" />
                        <input
                          title="Pile Length"
                          type="number"
                          value={form.pileLength}
                          onChange={(e) => setForm({ ...form, pileLength: Number(e.target.value) })}
                          min={5}
                          max={50}
                          step={0.5}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                        />
                        <p className="text-xs text-gray-500 mt-1">Range: 5-50m</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        Applied Load (kN)
                      </label>
                      <input
                        title="Applied Load"
                        type="number"
                        value={form.appliedLoad}
                        onChange={(e) => setForm({ ...form, appliedLoad: Number(e.target.value) })}
                        min={0}
                        step={100}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Design Method Card */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiSliders className="w-6 h-6 text-neon-cyan" />
                      </div>
                      Design Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-2">
                          Base Resistance Method
                        </label>
                        <select
                          title="Base Method"
                          value={form.baseMethod}
                          onChange={(e) => setForm({ ...form, baseMethod: e.target.value as any })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                        >
                          <option value="spt">SPT Correlation</option>
                          <option value="cpt">CPT Correlation</option>
                          <option value="analytical">Analytical (Bearing Capacity)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-2">
                          Shaft Friction Method
                        </label>
                        <select
                          title="Shaft Method"
                          value={form.shaftMethod}
                          onChange={(e) => setForm({ ...form, shaftMethod: e.target.value as any })}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                        >
                          <option value="alpha">Alpha Method (Cohesive)</option>
                          <option value="beta">Beta Method (Effective Stress)</option>
                          <option value="spt">SPT Correlation</option>
                          <option value="cpt">CPT Correlation</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        Design Approach (EN 1997)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {(['DA1-1', 'DA1-2', 'DA2', 'DA3'] as const).map((da) => (
                          <button
                            key={da}
                            onClick={() => setForm({ ...form, designApproach: da })}
                            className={cn(
                              'px-4 py-2 rounded-lg font-medium transition-all',
                              form.designApproach === da
                                ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                            )}
                          >
                            {da}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-neon-cyan hover:text-neon-cyan/80 transition-colors"
                    >
                      <FiSettings
                        className={cn('transition-transform', showAdvanced && 'rotate-90')}
                      />
                      Advanced Settings
                    </button>

                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-sm font-semibold text-gray-200 mb-2">
                            Correlation Factor (ξ)
                          </label>
                          <input
                            title="Correlation Factor"
                            type="number"
                            value={form.correlationFactor}
                            onChange={(e) =>
                              setForm({ ...form, correlationFactor: Number(e.target.value) })
                            }
                            min={1.0}
                            max={2.0}
                            step={0.05}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Based on pile test data (Table A.9/A.10)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-200 mb-2">
                            Model Factor (γRd)
                          </label>
                          <input
                            title="Model Factor"
                            type="number"
                            value={form.modelFactor}
                            onChange={(e) =>
                              setForm({ ...form, modelFactor: Number(e.target.value) })
                            }
                            min={1.0}
                            max={2.0}
                            step={0.05}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
                          />
                          <p className="text-xs text-gray-500 mt-1">Model uncertainty factor</p>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Soil Layers Tab */}
            {activeTab === 'soil' && (
              <motion.div
                key="soil"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold text-white">Ground Profile</CardTitle>
                    <Button
                      onClick={addSoilLayer}
                      variant="outline"
                      className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white"
                    >
                      Add Layer
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Total Depth: {totalSoilDepth.toFixed(1)}m</span>
                      <span>Pile Length: {form.pileLength}m</span>
                    </div>

                    {soilLayers.map((layer, index) => (
                      <motion.div
                        key={layer.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <input
                            title="Input value"
                            type="text"
                            value={layer.name}
                            onChange={(e) => updateSoilLayer(layer.id, 'name', e.target.value)}
                            className="bg-transparent text-white font-medium focus:outline-none focus:border-b-2 focus:border-amber-500"
                          />
                          <button
                            onClick={() => removeSoilLayer(layer.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                            disabled={soilLayers.length === 1}
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              Thickness (m)
                            </label>
                            <input
                              title="Input value"
                              type="number"
                              value={layer.thickness}
                              onChange={(e) =>
                                updateSoilLayer(layer.id, 'thickness', Number(e.target.value))
                              }
                              min={0.5}
                              step={0.5}
                              className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Soil Type</label>
                            <select
                              title="Soil Type"
                              value={layer.soilType}
                              onChange={(e) =>
                                updateSoilLayer(layer.id, 'soilType', e.target.value)
                              }
                              className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                            >
                              <option value="clay">Clay</option>
                              <option value="sand">Sand</option>
                              <option value="gravel">Gravel</option>
                              <option value="silt">Silt</option>
                              <option value="rock">Rock</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">SPT N-value</label>
                            <input
                              title="Input value"
                              type="number"
                              value={layer.sptN}
                              onChange={(e) =>
                                updateSoilLayer(layer.id, 'sptN', Number(e.target.value))
                              }
                              min={0}
                              max={100}
                              className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">CPT qc (MPa)</label>
                            <input
                              title="Input value"
                              type="number"
                              value={layer.cptQc}
                              onChange={(e) =>
                                updateSoilLayer(layer.id, 'cptQc', Number(e.target.value))
                              }
                              min={0}
                              step={0.5}
                              className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                            />
                          </div>
                          {(layer.soilType === 'clay' || layer.soilType === 'silt') && (
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">cu (kPa)</label>
                              <input
                                title="Input value"
                                type="number"
                                value={layer.cu}
                                onChange={(e) =>
                                  updateSoilLayer(layer.id, 'cu', Number(e.target.value))
                                }
                                min={0}
                                className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                              />
                            </div>
                          )}
                          {(layer.soilType === 'sand' || layer.soilType === 'gravel') && (
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                φ (degrees)
                              </label>
                              <input
                                title="Input value"
                                type="number"
                                value={layer.phi}
                                onChange={(e) =>
                                  updateSoilLayer(layer.id, 'phi', Number(e.target.value))
                                }
                                min={20}
                                max={45}
                                className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">γ (kN/m³)</label>
                            <input
                              title="γ (kN/m³)"
                              type="number"
                              value={layer.gamma}
                              onChange={(e) =>
                                updateSoilLayer(layer.id, 'gamma', Number(e.target.value))
                              }
                              min={14}
                              max={24}
                              step={0.5}
                              className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && results && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Status Banner */}
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'p-6 rounded-xl border-2 flex items-center justify-between shadow-lg',
                    results.isPassing
                      ? 'bg-emerald-900/30 border-emerald-500 shadow-emerald-500/10'
                      : 'bg-red-900/30 border-red-500 shadow-red-500/10',
                  )}
                >
                  <div className="flex items-center gap-4">
                    {results.isPassing ? (
                      <FiCheck className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <FiAlertTriangle className="w-10 h-10 text-red-500" />
                    )}
                    <div>
                      <h3
                        className={cn(
                          'text-2xl font-bold',
                          results.isPassing ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results.isPassing ? 'DESIGN ADEQUATE' : 'DESIGN INADEQUATE'}
                      </h3>
                      <p className="text-gray-400">
                        Utilisation: {(results.utilisationRatio * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {/* Preset Selector */}
                  <div className="flex items-center gap-2 mr-auto">
                    <select
                      value=""
                      onChange={(e) => e.target.value && applyPreset(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-white text-sm"
                      title="Quick Presets"
                    >
                      <option value="">⚡ Quick Presets</option>
                      {Object.entries(PRESETS).map(([key, p]) => (
                        <option key={key} value={key}>
                          {(p as any).name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={exportToPDF}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  >
                    <FiDownload className="mr-2" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={exportDOCX}
                    className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
                  >
                    <FiDownload className="mr-2" />
                    Export DOCX
                  </Button>
                  <SaveRunButton
                    calculatorKey="pile-capacity"
                    inputs={form as unknown as Record<string, string | number>}
                    results={results}
                  />
                </motion.div>

                {/* Recommendations */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiCheck className="w-6 h-6 text-neon-cyan" />
                      </div>
                      Design Recommendations
                    </h3>
                    <div className="space-y-3">
                      {[
                        'Verify design capacity with maintained load test per BS EN ISO 22477-1',
                        'Perform low-strain integrity testing on all production piles',
                        'Record driving logs or boring records for every pile for correlation',
                        'Ensure SI data covers full pile depth plus 3D below toe level',
                      ].map((rec, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <FiCheck className="text-amber-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Capacity Results */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white">
                      Pile Capacity Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-neon-cyan"
                      >
                        <p className="text-gray-400 text-sm">Base Resistance (Rb)</p>
                        <p className="text-2xl font-bold text-white">
                          {results.baseResistance.toFixed(0)}{' '}
                          <span className="text-sm text-gray-400">kN</span>
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-neon-purple"
                      >
                        <p className="text-gray-400 text-sm">Shaft Resistance (Rs)</p>
                        <p className="text-2xl font-bold text-white">
                          {results.shaftResistance.toFixed(0)}{' '}
                          <span className="text-sm text-gray-400">kN</span>
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-amber-500"
                      >
                        <p className="text-gray-400 text-sm">Ultimate Capacity (Rult)</p>
                        <p className="text-2xl font-bold text-amber-500">
                          {results.ultimateCapacity.toFixed(0)}{' '}
                          <span className="text-sm text-gray-400">kN</span>
                        </p>
                      </motion.div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-4 bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-lg border border-amber-700/50"
                      >
                        <p className="text-amber-300 text-sm">Design Capacity (Rc,d)</p>
                        <p className="text-3xl font-bold text-white">
                          {results.designCapacity.toFixed(0)}{' '}
                          <span className="text-lg text-gray-400">kN</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Applied partial factors: γb={results.partialFactors.gammaB}, γs=
                          {results.partialFactors.gammaS}
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-emerald-500"
                      >
                        <p className="text-gray-400 text-sm">Settlement Estimate</p>
                        <p className="text-3xl font-bold text-white">
                          {results.settlementEstimate.toFixed(1)}{' '}
                          <span className="text-lg text-gray-400">mm</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Simplified elastic estimate</p>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>

                {/* Layer Contributions */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white">
                      Shaft Resistance by Layer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.layerContributions.map((layer, index) => {
                        const percentage =
                          (layer.shaftContribution / results.shaftResistance) * 100;
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index }}
                          >
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-300">{layer.layerName}</span>
                              <span className="text-gray-400">
                                {layer.shaftContribution.toFixed(0)} kN ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5, delay: 0.2 + 0.1 * index }}
                                className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple"
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'visualization' && results && (
              <motion.div
                key="visualization"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <WhatIfPreview
                  title="Pile Capacity — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={updateForm}
                  status={((results as any)?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[6, 8, 6]}>
                      <PileCapacity3D />
                    </Interactive3DDiagram>
                  )}
                />
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="sticky top-8 space-y-6">
            {/* Quick Summary Card */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Pile Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Type</p>
                    <p className="text-white font-medium capitalize">{form.pileType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Diameter</p>
                    <p className="text-white font-medium">{form.pileDiameter} mm</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Length</p>
                    <p className="text-white font-medium">{form.pileLength} m</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Applied Load</p>
                    <p className="text-white font-medium">{form.appliedLoad} kN</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Design Approach</p>
                  <p className="text-neon-cyan font-medium">{form.designApproach}</p>
                </div>

                {results && (
                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Utilisation</span>
                      <span
                        className={cn(
                          'font-bold',
                          results.isPassing ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {(results.utilisationRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(results.utilisationRatio * 100, 100)}%` }}
                        className={cn(
                          'h-full transition-colors',
                          results.utilisationRatio <= 0.7
                            ? 'bg-emerald-500'
                            : results.utilisationRatio <= 1.0
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calculate Button */}
            <Button
              onClick={calculatePileCapacity}
              disabled={isCalculating}
              className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest shadow-lg shadow-neon-cyan/25 hover:shadow-neon-cyan/40 transition-all duration-300"
            >
              {isCalculating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                '⚡ RUN FULL ANALYSIS'
              )}
            </Button>

            {/* Design Code Reference */}
            <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Design Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400">Code</p>
                  <p className="text-white">EN 1997-1:2004</p>
                </div>
                <div>
                  <p className="text-gray-400">Verification</p>
                  <p className="text-white">Fc,d ≤ Rc,d</p>
                </div>
                <div>
                  <p className="text-gray-400">Partial Factors ({form.designApproach})</p>
                  <p className="text-white">
                    γb = {partialFactors[form.designApproach].gammaB}, γs ={' '}
                    {partialFactors[form.designApproach].gammaS}
                  </p>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500">Ultimate resistance: Rc,k = Rb,k + Rs,k</p>
                  <p className="text-xs text-gray-500">
                    Design resistance includes model factor γRd
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PileCapacity;
