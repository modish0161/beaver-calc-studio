import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiAnchor,
    FiBarChart2,
    FiCheck,
    FiChevronDown,
    FiDownload,
    FiEye,
    FiGrid,
    FiInfo,
    FiLayers,
    FiPackage,
    FiTarget,
    FiZap,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import { cn } from '../../lib/utils';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import PierDesign3D from '../../components/3d/scenes/PierDesign3D';
import ErrorBoundary from '../../components/ErrorBoundary';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { CONCRETE_GRADES as _CONCRETE_LIB, REBAR_GRADES } from '../../data/materialGrades';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

interface PierLoadCase {
  name: string;
  vertical: string;
  horizontal: string;
  torsion: string;
  temperature: string;
  seismic: string;
}

const soilLibrary = {
  clay: { phi: 22, c: 35, gamma: 18, Es: 15e3 },
  sand: { phi: 32, c: 0, gamma: 19, Es: 25e3 },
  gravel: { phi: 38, c: 0, gamma: 20, Es: 35e3 },
  rock: { phi: 45, c: 500, gamma: 23, Es: 80e3 },
};

const concreteGrades = {
  C30: { fck: _CONCRETE_LIB['C30/37'].fck, fcd: _CONCRETE_LIB['C30/37'].fcd, Ec: _CONCRETE_LIB['C30/37'].Ecm * 1e3 },
  C35: { fck: _CONCRETE_LIB['C35/45'].fck, fcd: _CONCRETE_LIB['C35/45'].fcd, Ec: _CONCRETE_LIB['C35/45'].Ecm * 1e3 },
  C40: { fck: _CONCRETE_LIB['C40/50'].fck, fcd: _CONCRETE_LIB['C40/50'].fcd, Ec: _CONCRETE_LIB['C40/50'].Ecm * 1e3 },
};

const rebarGrades = {
  B500B: { fyk: REBAR_GRADES.B500B.fyk, fyd: REBAR_GRADES.B500B.fyd, Es: REBAR_GRADES.B500B.Es },
};

type ResultCard = {
  title: string;
  demand: string;
  capacity: string;
  utilisation: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
  unit: string;
  sf?: string;
  check: string;
  codeRef: string; // EN code reference
};

const PRESETS = {
  highway_circular: {
    name: 'Highway Circular Pier Ø1200',
    pierType: 'circular',
    height: '8',
    width: '1.2',
    thickness: '1.2',
    foundationDepth: '3',
    exposure: 'XC3',
    concrete: 'C40',
    steel: 'B500B',
    soil: 'sand',
    pileCap: 'piled',
    pileCount: '4',
    pileDiameter: '0.9',
    pileLength: '18',
    waterDepth: '0',
    scourDepth: '1',
    windPressure: '2.5',
    seismicCoeff: '0.10',
  },
  highway_wall_pier: {
    name: 'Highway Wall Pier 2500×1200',
    pierType: 'rectangular',
    height: '7',
    width: '2.5',
    thickness: '1.2',
    foundationDepth: '2.5',
    exposure: 'XC3',
    concrete: 'C35',
    steel: 'B500B',
    soil: 'gravel',
    pileCap: 'spread',
    pileCount: '0',
    pileDiameter: '0',
    pileLength: '0',
    waterDepth: '0',
    scourDepth: '0',
    windPressure: '2.0',
    seismicCoeff: '0.08',
  },
  rail_bridge_pier: {
    name: 'Rail Bridge Pier',
    pierType: 'rectangular',
    height: '6',
    width: '3.0',
    thickness: '1.5',
    foundationDepth: '3.5',
    exposure: 'XC4',
    concrete: 'C40',
    steel: 'B500B',
    soil: 'gravel',
    pileCap: 'spread',
    pileCount: '0',
    pileDiameter: '0',
    pileLength: '0',
    waterDepth: '0',
    scourDepth: '0',
    windPressure: '2.0',
    seismicCoeff: '0.12',
  },
  viaduct_tall_pier: {
    name: 'Viaduct Tall Pier',
    pierType: 'circular',
    height: '20',
    width: '2.0',
    thickness: '2.0',
    foundationDepth: '4',
    exposure: 'XC4',
    concrete: 'C45',
    steel: 'B500B',
    soil: 'rock',
    pileCap: 'spread',
    pileCount: '0',
    pileDiameter: '0',
    pileLength: '0',
    waterDepth: '0',
    scourDepth: '0',
    windPressure: '3.5',
    seismicCoeff: '0.15',
  },
  river_crossing_pier: {
    name: 'River Crossing Pier',
    pierType: 'circular',
    height: '10',
    width: '1.8',
    thickness: '1.8',
    foundationDepth: '5',
    exposure: 'XC4',
    concrete: 'C40',
    steel: 'B500B',
    soil: 'clay',
    pileCap: 'piled',
    pileCount: '6',
    pileDiameter: '1.2',
    pileLength: '25',
    waterDepth: '3',
    scourDepth: '2.5',
    windPressure: '2.5',
    seismicCoeff: '0.10',
  },
  footbridge_pier: {
    name: 'Footbridge Pier',
    pierType: 'circular',
    height: '5',
    width: '0.6',
    thickness: '0.6',
    foundationDepth: '2',
    exposure: 'XC3',
    concrete: 'C30',
    steel: 'B500B',
    soil: 'sand',
    pileCap: 'spread',
    pileCount: '0',
    pileDiameter: '0',
    pileLength: '0',
    waterDepth: '0',
    scourDepth: '0',
    windPressure: '1.5',
    seismicCoeff: '0.05',
  },
};

const PierDesign = () => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);

  const [form, setForm] = useState({
    pierType: 'solid',
    height: '8',
    width: '2.5',
    thickness: '1.2',
    foundationDepth: '2.5',
    exposure: 'XC3',
    concrete: 'C35',
    steel: 'B500B',
    soil: 'sand',
    pileCap: 'spread',
    pileCount: '4',
    pileDiameter: '0.9',
    pileLength: '15',
    waterDepth: '0',
    scourDepth: '1',
    windPressure: '2.5',
    seismicCoeff: '0.15',
    includeSeismic: false,
    loadCases: [
      {
        name: 'ULS Combo',
        vertical: '1500',
        horizontal: '120',
        torsion: '50',
        temperature: '0',
        seismic: '0',
      },
    ] as PierLoadCase[],
  });
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [warnings, setWarnings] = useState<string[]>([]);

  const [cameraPos, setCameraPos] = useState<[number, number, number]>([6, 5, 6]);

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey as keyof typeof PRESETS];
    if (preset) {
      const { name, ...values } = preset;
      setForm((prev: any) => ({ ...prev, ...values }));
    }
  };

  const handleField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      const next = { ...validationErrors };
      delete next[field];
      setValidationErrors(next);
    }
  };

  const handleLoad = (index: number, field: keyof PierLoadCase, value: string) => {
    setForm((prev) => ({
      ...prev,
      loadCases: prev.loadCases.map((lc, i) => (i === index ? { ...lc, [field]: value } : lc)),
    }));
  };

  const addCase = () =>
    setForm((prev) => ({
      ...prev,
      loadCases: [
        ...prev.loadCases,
        {
          name: `Case ${prev.loadCases.length + 1}`,
          vertical: '0',
          horizontal: '0',
          torsion: '0',
          temperature: '0',
          seismic: '0',
        },
      ],
    }));

  const removeCase = (index: number) =>
    setForm((prev) => ({ ...prev, loadCases: prev.loadCases.filter((_, i) => i !== index) }));

  const validate = () => {
    const errors: Record<string, string> = {};
    if (parseFloat(form.height) <= 0) errors.height = 'Pier height required';
    if (parseFloat(form.width) <= 0) errors.width = 'Pier width required';
    if (form.loadCases.some((lc) => !lc.name.trim())) errors.loadCases = 'Case names required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getRecommendation = (type: string) => {
    switch (type) {
      case 'axial':
        return 'Increase pier section area or upgrade concrete grade to raise axial capacity.';
      case 'bending':
        return 'Increase pier width/thickness or provide additional longitudinal reinforcement.';
      case 'shear':
        return 'Add shear reinforcement (links) or increase section dimensions.';
      case 'slender':
        return 'Add transverse tie beams, increase diameter, or reduce unsupported height.';
      case 'pile':
        return 'Increase pile count/diameter or extend piles to stronger strata.';
      default:
        return 'Review input parameters.';
    }
  };

  const runCalc = () => {
    if (!validate()) return;
    setIsCalculating(true);

    setTimeout(() => {
      const h = parseFloat(form.height);
      const b = parseFloat(form.width);
      const t = parseFloat(form.thickness);
      const fd = parseFloat(form.foundationDepth);
      const pileCount = parseInt(form.pileCount);
      const pileDia = parseFloat(form.pileDiameter);
      const pileLength = parseFloat(form.pileLength);
      const wind = parseFloat(form.windPressure);
      const ag = parseFloat(form.seismicCoeff);
      const soil = soilLibrary[form.soil as keyof typeof soilLibrary];
      const concrete = concreteGrades[form.concrete as keyof typeof concreteGrades];
      const steel = rebarGrades[form.steel as keyof typeof rebarGrades];

      let maxV = 0;
      let maxH = 0;
      let maxT = 0;

      form.loadCases.forEach((lc) => {
        const V = 1.35 * (parseFloat(lc.vertical) || 0);
        const H = 1.5 * (parseFloat(lc.horizontal) || 0);
        const T = 1.5 * (parseFloat(lc.torsion) || 0);
        if (V > maxV) maxV = V;
        if (H > maxH) maxH = H;
        if (T > maxT) maxT = T;
      });

      const windMoment = (wind * h ** 2) / 2;
      const seismicForce = form.includeSeismic ? ag * maxV * 0.5 : 0;
      const totalH = maxH + windMoment / h + seismicForce;
      const sectionArea = b * t;
      const axialCapacity = sectionArea * concrete.fcd * 1000;
      const axialUtil = maxV / axialCapacity;
      const axialStatus = axialUtil <= 0.9 ? 'PASS' : axialUtil <= 1.0 ? 'WARNING' : 'FAIL';

      const I = (b * Math.pow(t, 3)) / 12;
      const y = t / 2;
      const bendingStress = (maxT * h * 1000) / I;
      const bendingCapacity = concrete.fcd * 1000;
      const bendingUtil = bendingStress / bendingCapacity;
      const bendingStatus = bendingUtil <= 0.9 ? 'PASS' : bendingUtil <= 1.0 ? 'WARNING' : 'FAIL';

      const shearCapacity = 0.6 * concrete.fcd * sectionArea * 1000;
      const shearUtil = totalH / shearCapacity;
      const shearStatus = shearUtil <= 0.8 ? 'PASS' : shearUtil <= 1.0 ? 'WARNING' : 'FAIL';

      const slenderness = (h * 1000) / Math.sqrt(I / sectionArea);
      const slenderStatus = slenderness <= 80 ? 'PASS' : slenderness <= 120 ? 'WARNING' : 'FAIL';

      const pileArea = Math.PI * Math.pow(pileDia / 2, 2);
      const pileCapacity =
        (soil.c * pileArea +
          soil.gamma * pileArea * pileLength * Math.tan((soil.phi * Math.PI) / 180)) *
        pileCount *
        100;
      const pileUtil = maxV / pileCapacity;
      const pileStatus = pileUtil <= 0.9 ? 'PASS' : pileUtil <= 1.0 ? 'WARNING' : 'FAIL';

      const settlement = (maxV / (sectionArea * soil.Es)) * h * 1000;
      const settlementStatus = settlement <= 25 ? 'PASS' : settlement <= 40 ? 'WARNING' : 'FAIL';

      // Crack Control Check (EN 1992-1-1 Clause 7.3)
      const cover = 40; // mm - typical cover from exposure class
      const barDia = 25; // mm - main bar diameter
      const barSpacing = 150; // mm - typical spacing
      const steelStress = (maxV / (sectionArea * 1000)) * 0.8; // Simplified service stress
      const crackWidth =
        3.4 * cover * (steelStress / steel.Es) * (1 + (1.5 * barDia) / (barSpacing - barDia));
      const crackLimit = form.exposure.startsWith('X') && form.exposure.includes('S') ? 0.2 : 0.3;
      const crackUtil = crackWidth / crackLimit;
      const crackStatus = crackUtil <= 0.9 ? 'PASS' : crackUtil <= 1.0 ? 'WARNING' : 'FAIL';

      // Reinforcement Schedule
      const As_req_main = (maxV * 1000) / (steel.fyd * 0.87); // mm²
      const As_req_shear = (totalH * 1000) / (steel.fyd * 0.87 * 0.5); // mm²
      const n_main_bars = Math.ceil(As_req_main / (Math.PI * Math.pow(barDia / 2, 2)));
      const link_dia = 12;
      const link_spacing = Math.min(200, 15 * barDia, (Math.min(b, t) * 1000) / 3);

      const cards: ResultCard[] = [
        {
          title: 'Axial Capacity',
          demand: `${maxV.toFixed(1)}`,
          capacity: `${axialCapacity.toFixed(1)}`,
          utilisation: axialUtil,
          status: axialStatus,
          unit: 'kN',
          check: 'axial',
          codeRef: 'EN 1992-1-1 Cl. 6.1',
        },
        {
          title: 'Bending Stress',
          demand: `${bendingStress.toFixed(1)}`,
          capacity: `${bendingCapacity.toFixed(1)}`,
          utilisation: bendingUtil,
          status: bendingStatus,
          unit: 'kN/m²',
          check: 'bending',
          codeRef: 'EN 1992-1-1 Cl. 6.1',
        },
        {
          title: 'Shear / Lateral',
          demand: `${totalH.toFixed(1)}`,
          capacity: `${shearCapacity.toFixed(1)}`,
          utilisation: shearUtil,
          status: shearStatus,
          unit: 'kN',
          check: 'shear',
          codeRef: 'EN 1992-1-1 Cl. 6.2',
        },
        {
          title: 'Slenderness',
          demand: `${slenderness.toFixed(0)}`,
          capacity: '80',
          utilisation: slenderness / 80,
          status: slenderStatus,
          unit: 'λ',
          check: 'slender',
          sf: slenderness.toFixed(0),
          codeRef: 'EN 1992-1-1 Cl. 5.8',
        },
        {
          title: 'Pile Capacity',
          demand: `${maxV.toFixed(1)}`,
          capacity: `${pileCapacity.toFixed(1)}`,
          utilisation: pileUtil,
          status: pileStatus,
          unit: 'kN',
          check: 'pile',
          codeRef: 'EN 1997-1 Cl. 7.6',
        },
        {
          title: 'Settlement',
          demand: `${settlement.toFixed(1)}`,
          capacity: '25',
          utilisation: settlement / 25,
          status: settlementStatus,
          unit: 'mm',
          check: 'settlement',
          codeRef: 'EN 1997-1 Cl. 6.6',
        },
        {
          title: 'Crack Control',
          demand: `${(crackWidth * 1000).toFixed(2)}`,
          capacity: `${(crackLimit * 1000).toFixed(0)}`,
          utilisation: crackUtil,
          status: crackStatus,
          unit: 'μm',
          check: 'crack',
          codeRef: 'EN 1992-1-1 Cl. 7.3',
        },
      ];

      // Material Quantities
      const concreteVol = b * t * h + 0.3 * b * t * fd;
      const steelWeight = sectionArea * h * 7850 * 0.02;
      const formworkArea = 2 * (b + t) * h + b * t; // Perimeter × height + top
      const rebarTonnage = steelWeight / 1000;

      // Design Efficiency (optimal around 75-85% utilisation)
      const avgUtil = cards.reduce((sum, c) => sum + c.utilisation, 0) / cards.length;
      const designEfficiency =
        avgUtil < 0.5
          ? 'OVERSIZED'
          : avgUtil < 0.75
            ? 'CONSERVATIVE'
            : avgUtil < 0.95
              ? 'OPTIMAL'
              : 'CRITICAL';
      const efficiencyScore = avgUtil < 0.5 ? 50 : avgUtil < 0.75 ? 70 : avgUtil < 0.95 ? 95 : 60;

      const cost = {
        concrete: concreteVol * 150,
        steel: (steelWeight / 1000) * 1200,
        piling: pileCount * pileLength * pileDia * 400,
        total: 0,
      };
      cost.total = cost.concrete + cost.steel + (form.pileCap === 'pile' ? cost.piling : 0);

      setResults({
        cards,
        summary: {
          pierType: form.pierType,
          height: h,
          width: b,
          thickness: t,
          soil: form.soil,
          concrete: form.concrete,
          steel: form.steel,
          exposure: form.exposure,
          foundationDepth: fd,
          pileCount,
          pileDiameter: pileDia,
          pileLength,
        },
        reinforcement: {
          mainBars: {
            diameter: barDia,
            count: n_main_bars,
            As_req: As_req_main.toFixed(0),
            spacing: barSpacing,
          },
          links: { diameter: link_dia, spacing: link_spacing.toFixed(0) },
          cover,
        },
        quantities: {
          concreteVolume: concreteVol.toFixed(2),
          rebarTonnage: rebarTonnage.toFixed(2),
          formworkArea: formworkArea.toFixed(1),
        },
        efficiency: {
          avgUtilisation: (avgUtil * 100).toFixed(1),
          rating: designEfficiency,
          score: efficiencyScore,
        },
        settlement,
        slenderness,
        windMoment,
        seismicForce,
        cost,
      });

      const w: string[] = [];
      cards.forEach((c) => {
        if (c.status === 'FAIL')
          w.push(`${c.title}: capacity exceeded (${(c.utilisation * 100).toFixed(0)}%)`);
        else if (c.status === 'WARNING')
          w.push(`${c.title}: high utilisation (${(c.utilisation * 100).toFixed(0)}%)`);
      });
      if (slenderness > 120)
        w.push(`Slenderness ratio ${slenderness.toFixed(0)} exceeds limit — check P-delta effects`);
      if (settlement > 40) w.push(`Settlement ${settlement.toFixed(1)}mm exceeds 40mm limit`);
      setWarnings(w);
      setActiveTab('results');
      setIsCalculating(false);
    }, 1200);
  };

  const exportPDF = () => {
    if (!results) return;
    const cards = results.cards || [];

    // Build recommendations from optimisation logic
    const recs: { check: string; suggestion: string }[] = [];
    if (results.efficiency.rating === 'OVERSIZED') {
      recs.push({
        check: 'Section Size',
        suggestion: 'Section oversized — consider reducing pier dimensions to save material costs.',
      });
    }
    if (results.efficiency.rating === 'CRITICAL') {
      recs.push({
        check: 'Utilisation',
        suggestion:
          'High utilisation — increase section size or upgrade concrete grade for adequate safety margin.',
      });
    }
    if (results.efficiency.rating === 'CONSERVATIVE') {
      recs.push({
        check: 'Economy',
        suggestion:
          'Conservative design — utilisation can be increased for a more economical section.',
      });
    }
    if (results.slenderness > 80) {
      recs.push({
        check: 'Slenderness',
        suggestion: `High slenderness (${results.slenderness.toFixed(0)}) — consider transverse tie beams or increased diameter.`,
      });
    }

    // Capture diagram
    const canvas = document.querySelector('#pier-3d-container canvas') as HTMLCanvasElement | null;
    const diagramImage = canvas?.toDataURL('image/png');

    generatePremiumPDF({
      title: 'Pier Design Studio',
      subtitle: 'EN 1992-1-1 / EN 1997-1 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Bridge Pier Design' },
        { label: 'Reference', value: 'PIE001' },
        { label: 'Pier Type', value: form.pierType },
        { label: 'Foundation', value: form.pileCap },
        { label: 'Reference', value: 'PIE001' },
      ],
      inputs: [
        { label: 'Pier Type', value: form.pierType },
        { label: 'Height', value: `${form.height} m` },
        { label: 'Width', value: `${form.width} m` },
        { label: 'Thickness', value: `${form.thickness} m` },
        { label: 'Concrete', value: form.concrete },
        { label: 'Steel', value: form.steel },
        { label: 'Soil', value: form.soil },
        { label: 'Wind Pressure', value: `${form.windPressure} kN/m²` },
        { label: 'Seismic Coeff', value: form.seismicCoeff },
      ],
      checks: cards.map((c: any) => ({
        name: `${c.title} (${c.codeRef})`,
        capacity: `${c.capacity} ${c.unit}`,
        utilisation: `${(c.utilisation * 100).toFixed(1)}%`,
        status: (c.status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      })),
      sections: [
        {
          title: 'Material Quantities',
          head: [['Item', 'Value', 'Unit']],
          body: [
            ['Concrete Volume', results.quantities.concreteVolume, 'm³'],
            ['Rebar Tonnage', results.quantities.rebarTonnage, 'tonnes'],
            ['Formwork Area', results.quantities.formworkArea, 'm²'],
          ],
        },
        {
          title: 'Cost Estimation',
          head: [['Item', 'Cost (£)']],
          body: [
            ['Concrete', `£${results.cost.concrete.toFixed(0)}`],
            ['Steel', `£${results.cost.steel.toFixed(0)}`],
            ...(form.pileCap === 'pile' ? [['Piling', `£${results.cost.piling.toFixed(0)}`]] : []),
            ['Total', `£${results.cost.total.toFixed(0)}`],
          ],
        },
        {
          title: 'Advanced Metrics',
          head: [['Metric', 'Value']],
          body: [
            ['Slenderness Ratio', results.slenderness.toFixed(0)],
            ['Wind Overturning', `${results.windMoment.toFixed(1)} kNm`],
            ['Seismic Force', `${results.seismicForce.toFixed(1)} kN`],
            ['Settlement', `${results.settlement.toFixed(1)} mm`],
            ['Efficiency Rating', results.efficiency.rating],
            ['Avg. Utilisation', `${results.efficiency.avgUtilisation}%`],
          ],
        },
      ],
      recommendations: recs,
      warnings,
      diagramImage,
      footerNote: 'Beaver Bridges Ltd — Pier Design per EN 1992-1-1 / EN 1997-1',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const cards = results.cards || [];

    // Build recommendations from optimisation logic
    const recs: { check: string; suggestion: string }[] = [];
    if (results.efficiency.rating === 'OVERSIZED') {
      recs.push({
        check: 'Section Size',
        suggestion: 'Section oversized — consider reducing pier dimensions to save material costs.',
      });
    }
    if (results.efficiency.rating === 'CRITICAL') {
      recs.push({
        check: 'Utilisation',
        suggestion:
          'High utilisation — increase section size or upgrade concrete grade for adequate safety margin.',
      });
    }
    if (results.efficiency.rating === 'CONSERVATIVE') {
      recs.push({
        check: 'Economy',
        suggestion:
          'Conservative design — utilisation can be increased for a more economical section.',
      });
    }
    if (results.slenderness > 80) {
      recs.push({
        check: 'Slenderness',
        suggestion: `High slenderness (${results.slenderness.toFixed(0)}) — consider transverse tie beams or increased diameter.`,
      });
    }

    // Capture diagram
    const canvas = document.querySelector('#pier-3d-container canvas') as HTMLCanvasElement | null;
    const diagramImage = canvas?.toDataURL('image/png');

    generateDOCX({
      title: 'Pier Design Studio',
      subtitle: 'EN 1992-1-1 / EN 1997-1 Compliant',
      projectInfo: [
        { label: 'Project', value: 'Bridge Pier Design' },
        { label: 'Reference', value: 'PIE001' },
        { label: 'Pier Type', value: form.pierType },
        { label: 'Foundation', value: form.pileCap },
        { label: 'Reference', value: 'PIE001' },
      ],
      inputs: [
        { label: 'Pier Type', value: form.pierType },
        { label: 'Height', value: `${form.height} m` },
        { label: 'Width', value: `${form.width} m` },
        { label: 'Thickness', value: `${form.thickness} m` },
        { label: 'Concrete', value: form.concrete },
        { label: 'Steel', value: form.steel },
        { label: 'Soil', value: form.soil },
        { label: 'Wind Pressure', value: `${form.windPressure} kN/m²` },
        { label: 'Seismic Coeff', value: form.seismicCoeff },
      ],
      checks: cards.map((c: any) => ({
        name: `${c.title} (${c.codeRef})`,
        capacity: `${c.capacity} ${c.unit}`,
        utilisation: `${(c.utilisation * 100).toFixed(1)}%`,
        status: (c.status === 'PASS' ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      })),
      sections: [
        {
          title: 'Material Quantities',
          head: [['Item', 'Value', 'Unit']],
          body: [
            ['Concrete Volume', results.quantities.concreteVolume, 'm³'],
            ['Rebar Tonnage', results.quantities.rebarTonnage, 'tonnes'],
            ['Formwork Area', results.quantities.formworkArea, 'm²'],
          ],
        },
        {
          title: 'Cost Estimation',
          head: [['Item', 'Cost (£)']],
          body: [
            ['Concrete', `£${results.cost.concrete.toFixed(0)}`],
            ['Steel', `£${results.cost.steel.toFixed(0)}`],
            ...(form.pileCap === 'pile' ? [['Piling', `£${results.cost.piling.toFixed(0)}`]] : []),
            ['Total', `£${results.cost.total.toFixed(0)}`],
          ],
        },
        {
          title: 'Advanced Metrics',
          head: [['Metric', 'Value']],
          body: [
            ['Slenderness Ratio', results.slenderness.toFixed(0)],
            ['Wind Overturning', `${results.windMoment.toFixed(1)} kNm`],
            ['Seismic Force', `${results.seismicForce.toFixed(1)} kN`],
            ['Settlement', `${results.settlement.toFixed(1)} mm`],
            ['Efficiency Rating', results.efficiency.rating],
            ['Avg. Utilisation', `${results.efficiency.avgUtilisation}%`],
          ],
        },
      ],
      recommendations: recs,
      warnings,
      diagramImage,
      footerNote: 'Beaver Bridges Ltd — Pier Design per EN 1992-1-1 / EN 1997-1',
    });
  };

  const statusColor = (status: string) =>
    status === 'PASS'
      ? 'text-green-400'
      : status === 'WARNING'
        ? 'text-yellow-400'
        : 'text-red-400';

  const whatIfSliders = [
    { key: 'height', label: 'Pier Height', unit: 'm', min: 3, max: 30, step: 0.5 },
    { key: 'width', label: 'Pier Width', unit: 'm', min: 0.4, max: 5, step: 0.1 },
    { key: 'thickness', label: 'Pier Thickness', unit: 'm', min: 0.3, max: 3, step: 0.1 },
    { key: 'windPressure', label: 'Wind Pressure', unit: 'kN/m²', min: 0.5, max: 5, step: 0.1 },
    { key: 'seismicCoeff', label: 'Seismic Coeff', unit: 'g', min: 0, max: 0.5, step: 0.01 },
  ];

  const cameraPresets = [
    { label: '3D View', icon: '🎯', pos: [6, 5, 6] as [number, number, number] },
    { label: 'Front', icon: '🏗️', pos: [0, 4, 8] as [number, number, number] },
    { label: 'Side', icon: '📐', pos: [8, 4, 0] as [number, number, number] },
    { label: 'Top', icon: '🔍', pos: [0, 10, 0.1] as [number, number, number] },
    { label: 'Close', icon: '🔬', pos: [3, 3, 3] as [number, number, number] },
  ];

  const overallPass = useMemo(() => {
    if (!results) return true;
    return results.cards.every((c: ResultCard) => c.status !== 'FAIL');
  }, [results]);

  const render3DScene = (height: string) => (
    <ErrorBoundary>
      <Interactive3DDiagram
        height={height}
        cameraPosition={cameraPos}
        status={results ? (overallPass ? 'PASS' : 'FAIL') : undefined}
      >
        <PierDesign3D />
      </Interactive3DDiagram>
    </ErrorBoundary>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-full glass border border-neon-cyan/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiAnchor className="text-neon-cyan" size={24} />
            <span className="text-white font-semibold">EN 1992-1-1 | EN 1997-1</span>
          </motion.div>

          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent leading-tight">
            Pier Design Studio
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            EN 1992/1997 bridge pier design
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              'Axial & Bending',
              'Shear & Slenderness',
              'Pile Capacity',
              'Settlement',
              'Cost Est.',
              '3D Preview',
            ].map((badge) => (
              <span
                key={badge}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-800/60 text-gray-300 border border-gray-700/50"
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Preset Quick-Select */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <motion.button
                key={key}
                onClick={() => applyPreset(key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 rounded-lg text-xs bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                ⚡ {preset.name}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Neon Pill Tabs */}
        <div className="flex justify-center gap-3 mb-8">
          {(
            [
              { key: 'input', label: 'Input', icon: FiLayers },
              { key: 'results', label: 'Results', icon: FiTarget },
              { key: 'visualization', label: '3D View', icon: FiEye },
            ] as const
          ).map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              disabled={tab.key !== 'input' && !results}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:text-white',
                tab.key !== 'input' && !results && 'opacity-40 cursor-not-allowed',
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.key === 'results' && results && (
                <span
                  className={cn(
                    'ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                    overallPass
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400',
                  )}
                >
                  {overallPass ? 'PASS' : 'FAIL'}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center gap-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiLayers className="text-neon-cyan" size={24} />
                        </motion.div>
                        <span>Geometry & Materials</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {[
                          {
                            key: 'pierType',
                            label: 'Pier Type',
                            options: ['solid', 'hollow', 'twin'],
                            icon: '🏗️',
                          },
                          {
                            key: 'pileCap',
                            label: 'Foundation',
                            options: ['spread', 'pile'],
                            icon: '🧱',
                          },
                          {
                            key: 'soil',
                            label: 'Soil',
                            options: ['clay', 'sand', 'gravel', 'rock'],
                            icon: '🌍',
                          },
                          {
                            key: 'concrete',
                            label: 'Concrete',
                            options: Object.keys(concreteGrades),
                            icon: '🧱',
                          },
                          {
                            key: 'steel',
                            label: 'Rebar',
                            options: Object.keys(rebarGrades),
                            icon: '🔩',
                          },
                          {
                            key: 'exposure',
                            label: 'Exposure',
                            options: ['XC1', 'XC2', 'XC3', 'XC4', 'XS1', 'XS2'],
                            icon: '🛡️',
                          },
                        ].map((select) => (
                          <div key={select.key} className="space-y-1">
                            <label
                              htmlFor={select.key}
                              className="text-sm font-semibold text-gray-200 flex items-center gap-1"
                            >
                              <span>{select.icon}</span>
                              <ExplainableLabel label={select.label} field={select.key} className="text-sm font-semibold text-gray-200" />
                            </label>
                            <select
                              title="{select.icon}"
                              id={select.key}
                              value={form[select.key as keyof typeof form] as string}
                              onChange={(e) => handleField(select.key, e.target.value)}
                              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                            >
                              {select.options.map((o) => (
                                <option key={o} value={o}>
                                  {o.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mt-6">
                        {[
                          { key: 'height', label: 'Pier Height', unit: 'm' },
                          { key: 'width', label: 'Pier Width', unit: 'm' },
                          { key: 'thickness', label: 'Pier Thickness', unit: 'm' },
                          { key: 'foundationDepth', label: 'Foundation Depth', unit: 'm' },
                          { key: 'pileCount', label: 'Pile Count', unit: '-' },
                          { key: 'pileDiameter', label: 'Pile Diameter', unit: 'm' },
                          { key: 'pileLength', label: 'Pile Length', unit: 'm' },
                          { key: 'waterDepth', label: 'Water Depth', unit: 'm' },
                          { key: 'scourDepth', label: 'Scour Depth', unit: 'm' },
                        ].map((input) => (
                          <div key={input.key}>
                            <label htmlFor={input.key} className="text-sm font-semibold text-gray-200">
                              {input.label}
                              <ExplainableLabel label="" field={input.key} />
                            </label>
                            <input
                              title="Input value"
                              id={input.key}
                              type="number"
                              value={form[input.key as keyof typeof form] as string}
                              onChange={(e) => handleField(input.key, e.target.value)}
                              className={cn(
                                'w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white',
                                validationErrors[input.key] &&
                                  'border-red-500 focus:ring-red-400/40',
                              )}
                            />
                            <p className="text-neon-cyan text-xs mt-1">{input.unit}</p>
                            {validationErrors[input.key] && (
                              <p className="text-xs text-red-400 mt-1">
                                {validationErrors[input.key]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mt-6">
                        <div>
                          <label htmlFor="windPressure" className="text-sm font-semibold text-gray-200">
                            Wind Pressure
                          </label>
                          <input
                            title="Wind Pressure"
                            id="windPressure"
                            type="number"
                            value={form.windPressure}
                            onChange={(e) => handleField('windPressure', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                          />
                          <p className="text-neon-cyan text-xs mt-1">kN/m²</p>
                        </div>
                        <div>
                          <label htmlFor="seismicCoeff" className="text-sm font-semibold text-gray-200">
                            Seismic Coefficient
                          </label>
                          <input
                            title="Seismic Coeff"
                            id="seismicCoeff"
                            type="number"
                            value={form.seismicCoeff}
                            onChange={(e) => handleField('seismicCoeff', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
                          />
                          <p className="text-neon-cyan text-xs mt-1">ag (g)</p>
                        </div>
                        <div className="flex items-center mt-6">
                          <input
                            title="Input value"
                            id="seismic"
                            type="checkbox"
                            checked={form.includeSeismic}
                            onChange={(e) => handleField('includeSeismic', e.target.checked)}
                            className="mr-2"
                          />
                          <label htmlFor="seismic" className="text-sm text-gray-300">
                            Include Seismic Loading
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center gap-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiActivity className="text-neon-cyan" size={24} />
                        </motion.div>
                        <span>Load Cases</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {form.loadCases.map((lc, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-xl bg-gray-900/40 border border-gray-700"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <label htmlFor={`caseName-${index}`} className="sr-only">
                                Case Name
                              </label>
                              <input
                                title="Input value"
                                id={`caseName-${index}`}
                                className="bg-transparent border border-gray-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                                value={lc.name}
                                onChange={(e) => handleLoad(index, 'name', e.target.value)}
                              />
                              {form.loadCases.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeCase(index)}
                                >
                                  <FiAlertTriangle className="text-red-400" />
                                </Button>
                              )}
                            </div>
                            <div className="grid md:grid-cols-5 gap-3">
                              {[
                                { key: 'vertical', label: 'Vertical', unit: 'kN' },
                                { key: 'horizontal', label: 'Horizontal', unit: 'kN' },
                                { key: 'torsion', label: 'Moment', unit: 'kNm' },
                                { key: 'temperature', label: 'Temp', unit: 'kN' },
                                { key: 'seismic', label: 'Seismic', unit: 'kN' },
                              ].map((field) => (
                                <div key={field.key}>
                                  <label
                                    htmlFor={`load-${index}-${field.key}`}
                                    className="text-xs text-gray-400"
                                  >
                                    {field.label}
                                  </label>
                                  <input
                                    title="Input value"
                                    id={`load-${index}-${field.key}`}
                                    type="number"
                                    className="w-full px-2 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm text-center focus:ring-1 focus:ring-purple-400"
                                    value={lc[field.key as keyof PierLoadCase]}
                                    onChange={(e) =>
                                      handleLoad(
                                        index,
                                        field.key as keyof PierLoadCase,
                                        e.target.value,
                                      )
                                    }
                                  />
                                  <p className="text-xs text-purple-400 text-center mt-1">
                                    {field.unit}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={addCase}
                        variant="glass"
                        className="mt-4 border-purple-500/40 hover:bg-purple-500/10"
                      >
                        Add Load Case
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="flex justify-center">
                    <Button
                      disabled={isCalculating}
                      onClick={runCalc}
                      className="px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300"
                    >
                      {isCalculating ? (
                        <div className="flex items-center gap-3 animate-pulse">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Calculating...
                        </div>
                      ) : (
                        <span className="flex items-center gap-3">
                          <FiZap className="text-xl" />
                          RUN FULL ANALYSIS
                          <FiBarChart2 className="text-xl" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                <WhatIfPreview
                  title="Pier Design — 3D Preview"
                  sliders={whatIfSliders}
                  form={form}
                  updateForm={handleField}
                  status={results ? (overallPass ? 'PASS' : 'FAIL') : undefined}
                  renderScene={(fsHeight) => render3DScene(fsHeight)}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
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
                    className="px-6 py-3 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-xl text-white font-bold flex items-center gap-3 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300"
                  >
                    <FiDownload size={18} />
                    DOCX
                  </Button>
                  <SaveRunButton calculatorKey="pier-design" inputs={form as unknown as Record<string, string | number>} results={results} status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined} />
                </div>
              </div>

              {/* Border-l-4 Summary Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Pier Type', value: form.pierType.toUpperCase(), color: 'border-neon-cyan' },
                  { label: 'Height', value: `${form.height} m`, color: 'border-neon-blue' },
                  { label: 'Concrete', value: form.concrete, color: 'border-neon-purple' },
                  { label: 'Foundation', value: form.pileCap.toUpperCase(), color: 'border-green-400' },
                ].map((s) => (
                  <div key={s.label} className={`p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 border-l-4 ${s.color} flex items-center gap-3`}>
                    <FiCheck className="text-neon-cyan flex-shrink-0" size={18} />
                    <div>
                      <p className="text-xs text-gray-400 uppercase">{s.label}</p>
                      <p className="text-white font-bold">{s.value}</p>
                    </div>
                  </div>
                ))}
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
                  <span className="text-white font-bold">{results.efficiency.avgUtilisation}%</span>
                  <span className="mx-3 text-gray-600">|</span>
                  Efficiency:{' '}
                  <span className="text-white font-bold">{results.efficiency.rating}</span>
                  <span className="mx-3 text-gray-600">|</span>
                  Checks:{' '}
                  <span className="text-white font-bold">
                    {results.cards.filter((c: ResultCard) => c.status === 'PASS').length}/
                    {results.cards.length} passed
                  </span>
                </div>
              </motion.div>

              {/* ── Design Checks ── */}
              <div className="text-xs font-bold text-cyan-400/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FiTarget size={12} /> Design Checks
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-visible">
                {results.cards.map((card: ResultCard, idx: number) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="overflow-visible"
                  >
                    <Card
                      variant="glass"
                      className={cn(
                        'border overflow-visible shadow-lg',
                        card.status === 'PASS'
                          ? 'border-green-500/40 shadow-green-500/5'
                          : card.status === 'WARNING'
                            ? 'border-yellow-500/40 shadow-yellow-500/5'
                            : 'border-red-500/50 shadow-red-500/5',
                      )}
                    >
                      <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center justify-between">
                          {card.title}
                          {card.status !== 'PASS' && (
                            <div
                              onMouseEnter={() => setShowTooltip(card.check)}
                              onMouseLeave={() => setShowTooltip(null)}
                              className="relative z-[9999]"
                            >
                              <FiInfo className="text-yellow-400 cursor-help" />
                              {showTooltip === card.check && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute z-[9999] right-0 top-full mt-2 w-64 bg-gray-900 border border-yellow-500/40 rounded-xl p-3 text-xs text-gray-200 shadow-2xl"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  {getRecommendation(card.check)}
                                </motion.div>
                              )}
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs uppercase">Demand</p>
                            <p className="text-white font-bold">
                              {card.demand} {card.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase">Capacity</p>
                            <p className="text-white font-bold">
                              {card.capacity} {card.unit}
                            </p>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Utilisation</span>
                            <span className={cn('font-bold', statusColor(card.status))}>
                              {(card.utilisation * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-3 bg-gray-800 rounded-full overflow-hidden mt-1">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(card.utilisation * 100, 100)}%` }}
                              className={cn(
                                'h-full rounded-full',
                                card.status === 'PASS'
                                  ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                                  : card.status === 'WARNING'
                                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                                    : 'bg-gradient-to-r from-red-500 to-orange-500',
                              )}
                            />
                          </div>
                        </div>
                        <div
                          className={cn(
                            'px-3 py-2 rounded-lg text-center text-sm font-bold',
                            card.status === 'PASS'
                              ? 'bg-green-500/20 text-green-400'
                              : card.status === 'WARNING'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400',
                          )}
                        >
                          {card.status}
                        </div>
                        <div className="text-xs text-gray-500 text-center italic border-t border-gray-700 pt-2">
                          {card.codeRef}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* ── Detailed Analysis ── */}
              <div className="text-xs font-bold text-purple-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-2">
                <FiActivity size={12} /> Detailed Analysis
              </div>

              {/* Reinforcement Schedule — Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card
                  variant="glass"
                  className="border border-purple-500/40 shadow-lg shadow-purple-500/5"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                        <FiActivity className="text-white" size={16} />
                      </div>
                      Reinforcement Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30">
                        <p className="text-purple-400 text-xs uppercase font-bold mb-3">
                          Main Bars
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-gray-500 text-xs">Diameter</p>
                            <p className="text-white font-bold">
                              {results.reinforcement.mainBars.diameter}mm
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Count</p>
                            <p className="text-white font-bold">
                              {results.reinforcement.mainBars.count} nr
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">As,req</p>
                            <p className="text-white font-bold">
                              {results.reinforcement.mainBars.As_req} mm²
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/30">
                        <p className="text-purple-400 text-xs uppercase font-bold mb-3">
                          Links / Stirrups
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-gray-500 text-xs">Diameter</p>
                            <p className="text-white font-bold">
                              {results.reinforcement.links.diameter}mm
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Spacing</p>
                            <p className="text-white font-bold">
                              {results.reinforcement.links.spacing}mm
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 mt-3">
                          <span className="text-gray-400 text-sm">Cover</span>
                          <span className="text-purple-400 font-bold">
                            {results.reinforcement.cover}mm
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cost Estimation + Advanced Metrics — Side by Side */}
              <div className="grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card
                    variant="glass"
                    className="border border-green-500/40 shadow-lg shadow-green-500/5 h-full"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">£</span>
                        </div>
                        Cost Estimation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Concrete', cost: results.cost.concrete },
                          { label: 'Steel', cost: results.cost.steel },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-4 rounded-xl bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30"
                          >
                            <p className="text-green-400 text-xs uppercase font-bold">
                              {item.label}
                            </p>
                            <p className="text-2xl font-bold text-white mt-1">
                              £{item.cost.toFixed(0)}
                            </p>
                          </div>
                        ))}
                        {form.pileCap === 'pile' && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 col-span-2">
                            <p className="text-green-400 text-xs uppercase font-bold">Piling</p>
                            <p className="text-2xl font-bold text-white mt-1">
                              £{results.cost.piling.toFixed(0)}
                            </p>
                          </div>
                        )}
                        <div className="col-span-2 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex justify-between items-center">
                          <span className="text-green-400 font-semibold">Total</span>
                          <span className="text-white font-bold text-2xl">
                            £{results.cost.total.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <Card
                    variant="glass"
                    className="border border-blue-500/40 shadow-lg shadow-blue-500/5 h-full"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <FiGrid className="text-white" size={16} />
                        </div>
                        Advanced Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          {
                            label: 'Slenderness Ratio',
                            value: results.slenderness.toFixed(0),
                            unit: '',
                          },
                          {
                            label: 'Wind Overturning',
                            value: results.windMoment.toFixed(1),
                            unit: 'kNm',
                          },
                          {
                            label: 'Seismic Force',
                            value: results.seismicForce.toFixed(1),
                            unit: 'kN',
                          },
                          { label: 'Settlement', value: results.settlement.toFixed(1), unit: 'mm' },
                        ].map((m) => (
                          <div
                            key={m.label}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/40 border border-gray-700/30"
                          >
                            <span className="text-gray-400 text-sm">{m.label}</span>
                            <span className="text-white font-bold font-mono">
                              {m.value} {m.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ── Material & Efficiency ── */}
              <div className="text-xs font-bold text-orange-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-2">
                <FiPackage size={12} /> Material & Efficiency
              </div>

              {/* Material Quantities — Full Width Inline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card
                  variant="glass"
                  className="border border-orange-500/40 shadow-lg shadow-orange-500/5"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <FiPackage className="text-white" size={16} />
                      </div>
                      Material Quantities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Concrete', value: results.quantities.concreteVolume, unit: 'm³' },
                        { label: 'Rebar', value: results.quantities.rebarTonnage, unit: 'tonnes' },
                        { label: 'Formwork', value: results.quantities.formworkArea, unit: 'm²' },
                      ].map((q) => (
                        <div
                          key={q.label}
                          className="p-4 rounded-xl bg-gradient-to-br from-orange-900/20 to-orange-800/10 border border-orange-700/30 text-center"
                        >
                          <p className="text-xs text-gray-400 uppercase">{q.label}</p>
                          <p className="text-2xl font-bold text-white">{q.value}</p>
                          <p className="text-orange-400 text-sm">{q.unit}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Design Efficiency + Optimisation — Side by Side */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Design Efficiency Meter */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <Card
                    variant="glass"
                    className={cn(
                      'border shadow-lg h-full',
                      results.efficiency.rating === 'OPTIMAL'
                        ? 'border-green-500/50 shadow-green-500/5'
                        : results.efficiency.rating === 'CONSERVATIVE'
                          ? 'border-blue-500/50 shadow-blue-500/5'
                          : results.efficiency.rating === 'OVERSIZED'
                            ? 'border-yellow-500/50 shadow-yellow-500/5'
                            : 'border-red-500/50 shadow-red-500/5',
                    )}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br',
                            results.efficiency.rating === 'OPTIMAL'
                              ? 'from-green-500 to-emerald-500'
                              : results.efficiency.rating === 'CONSERVATIVE'
                                ? 'from-blue-500 to-cyan-500'
                                : results.efficiency.rating === 'OVERSIZED'
                                  ? 'from-yellow-500 to-amber-500'
                                  : 'from-red-500 to-orange-500',
                          )}
                        >
                          <FiTarget className="text-white" size={16} />
                        </div>
                        Design Efficiency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center space-y-4">
                        <div
                          className={cn(
                            'text-4xl font-black',
                            results.efficiency.rating === 'OPTIMAL'
                              ? 'text-green-400'
                              : results.efficiency.rating === 'CONSERVATIVE'
                                ? 'text-blue-400'
                                : results.efficiency.rating === 'OVERSIZED'
                                  ? 'text-yellow-400'
                                  : 'text-red-400',
                          )}
                        >
                          {results.efficiency.rating}
                        </div>
                        <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden">
                          <div className="absolute inset-y-0 left-1/4 w-px bg-gray-600" />
                          <div className="absolute inset-y-0 left-1/2 w-px bg-gray-600" />
                          <div className="absolute inset-y-0 left-3/4 w-px bg-gray-600" />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${results.efficiency.score}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={cn(
                              'h-full rounded-full',
                              results.efficiency.rating === 'OPTIMAL'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                : results.efficiency.rating === 'CONSERVATIVE'
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                  : results.efficiency.rating === 'OVERSIZED'
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                                    : 'bg-gradient-to-r from-red-500 to-orange-400',
                            )}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Oversized</span>
                          <span>Conservative</span>
                          <span>Optimal</span>
                          <span>Critical</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          Avg. Utilisation:{' '}
                          <span className="text-white font-bold">
                            {results.efficiency.avgUtilisation}%
                          </span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Optimisation Suggestions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card
                    variant="glass"
                    className="border border-yellow-500/30 shadow-lg shadow-yellow-500/5 h-full"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                          <FiZap className="text-white" size={16} />
                        </div>
                        Optimisation Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {results.efficiency.rating === 'OVERSIZED' && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                            <FiZap className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                            <p className="text-sm text-gray-300">
                              Section oversized — consider reducing pier dimensions to save material
                              costs.
                            </p>
                          </div>
                        )}
                        {results.efficiency.rating === 'CRITICAL' && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                            <FiAlertTriangle
                              className="text-red-400 flex-shrink-0 mt-0.5"
                              size={14}
                            />
                            <p className="text-sm text-gray-300">
                              High utilisation — increase section size or upgrade concrete grade for
                              adequate safety margin.
                            </p>
                          </div>
                        )}
                        {results.slenderness > 80 && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                            <FiZap className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                            <p className="text-sm text-gray-300">
                              High slenderness ({results.slenderness.toFixed(0)}) — consider
                              transverse tie beams or increased diameter.
                            </p>
                          </div>
                        )}
                        {results.cards.some(
                          (c: ResultCard) => c.check === 'pile' && c.status !== 'PASS',
                        ) && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                            <FiZap className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                            <p className="text-sm text-gray-300">
                              Pile capacity marginal — increase pile count/diameter or extend to
                              stronger strata.
                            </p>
                          </div>
                        )}
                        {results.efficiency.rating === 'OPTIMAL' &&
                          !results.cards.some((c: ResultCard) => c.status === 'FAIL') &&
                          results.slenderness <= 80 && (
                            <div className="p-6 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                              <FiCheck className="text-green-400 mx-auto mb-2" size={28} />
                              <p className="text-green-400 font-bold mb-1">Well Optimised</p>
                              <p className="text-sm text-gray-400">
                                Good balance between economy and safety
                              </p>
                            </div>
                          )}
                        {results.efficiency.rating === 'CONSERVATIVE' && (
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-2">
                            <FiInfo className="text-blue-400 flex-shrink-0 mt-0.5" size={14} />
                            <p className="text-sm text-gray-300">
                              Conservative design — utilisation can be increased for a more
                              economical section.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Input Summary Panel (Collapsible) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card variant="glass" className="border border-gray-600/40 shadow-lg">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => setShowSummary(!showSummary)}
                  >
                    <CardTitle className="text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiLayers className="text-gray-400" />
                        Input Summary
                      </div>
                      <motion.div animate={{ rotate: showSummary ? 180 : 0 }}>
                        <FiChevronDown className="text-gray-400" />
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  {showSummary && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent>
                        <div className="grid md:grid-cols-4 gap-4">
                          {[
                            { label: 'Pier Type', value: results.summary.pierType },
                            { label: 'Height', value: `${results.summary.height.toFixed(2)} m` },
                            { label: 'Width', value: `${results.summary.width.toFixed(2)} m` },
                            {
                              label: 'Thickness',
                              value: `${results.summary.thickness.toFixed(2)} m`,
                            },
                            { label: 'Soil Type', value: results.summary.soil },
                            { label: 'Concrete', value: results.summary.concrete },
                            { label: 'Steel Grade', value: results.summary.steel },
                            { label: 'Exposure', value: results.summary.exposure },
                            { label: 'Foundation', value: form.pileCap.toUpperCase() },
                            { label: 'Pile Count', value: results.summary.pileCount },
                            { label: 'Pile Diameter', value: `${results.summary.pileDiameter} m` },
                            { label: 'Pile Length', value: `${results.summary.pileLength} m` },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="p-3 rounded-lg bg-gray-900/40 border border-gray-700"
                            >
                              <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                              <p className="text-white font-semibold">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
              </motion.div>

              {/* Warnings */}
              <div className="text-xs font-bold text-amber-400/80 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                <FiAlertTriangle size={12} /> Warnings & Notes
              </div>
              <Card className="bg-gray-900/50 border-amber-500/40 shadow-lg shadow-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
                      <FiAlertTriangle className="text-white" size={14} />
                    </div>
                    Warnings & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {warnings.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <FiCheck /> All checks passed — design is within acceptable limits.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {warnings.map((w, i) => (
                        <li key={i} className="text-amber-400 text-xs flex items-start gap-2">
                          <FiAlertTriangle className="mt-0.5 flex-shrink-0" /> {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* === VISUALIZATION TAB === */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-white">3D Visualization</h2>
                <div className="flex items-center gap-3">
                  {cameraPresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setCameraPos(preset.pos as [number, number, number])}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border backdrop-blur-sm transition-all',
                        cameraPos[0] === preset.pos[0] &&
                          cameraPos[1] === preset.pos[1] &&
                          cameraPos[2] === preset.pos[2]
                          ? 'bg-cyan-500/30 border-cyan-500/50 text-cyan-400'
                          : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-cyan-500/50 hover:text-cyan-400',
                      )}
                    >
                      {preset.icon} {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {render3DScene('h-[500px]')}

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {results.cards.slice(0, 4).map((card: ResultCard) => (
                  <div
                    key={card.title}
                    className={cn(
                      'p-4 rounded-xl border',
                      card.status === 'PASS'
                        ? 'border-green-500/30 bg-green-500/5'
                        : card.status === 'WARNING'
                          ? 'border-yellow-500/30 bg-yellow-500/5'
                          : 'border-red-500/30 bg-red-500/5',
                    )}
                  >
                    <p className="text-xs text-gray-400 uppercase">{card.title}</p>
                    <p className={cn('text-2xl font-black', statusColor(card.status))}>
                      {(card.utilisation * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">{card.status}</p>
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

export default PierDesign;
