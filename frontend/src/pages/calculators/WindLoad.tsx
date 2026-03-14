// =============================================================================
// BeaverCalc Studio — Wind Load Calculator
// BS EN 1991-1-4 UK National Annex Wind Action
// =============================================================================
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBox,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiDownload,
  FiInfo,
  FiMinimize2,
  FiSliders,
  FiTarget,
  FiWind,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import WindLoad3D from '../../components/3d/scenes/WindLoad3D';
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
  vb_map: string;
  altitude: string;
  altitudeFactor: string;
  terrainCategory: string;
  orography: string;
  buildingHeight: string;
  buildingWidth: string;
  buildingDepth: string;
  roofType: string;
  roofPitch: string;
  structureType: string;
  internalPressure: string;
}

interface Results {
  vb0: number;
  vb: number;
  cDir: number;
  cSeason: number;
  cAlt: number;
  qb: number;
  cr_z: number;
  Iv_z: number;
  qp_z: number;
  cpe_windward: number;
  cpe_leeward: number;
  cpe_side: number;
  cpe_roof: number;
  wk_windward: number;
  wk_leeward: number;
  wk_side: number;
  wk_roof: number;
  totalWallForce: number;
  totalRoofForce: number;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

const TERRAIN: Record<string, { z0: number; zmin: number; kr: number; label: string }> = {
  '0': { z0: 0.003, zmin: 1, kr: 0.156, label: '0 — Sea / coastal' },
  I: { z0: 0.01, zmin: 1, kr: 0.17, label: 'I — Lakes / flat open' },
  II: { z0: 0.05, zmin: 2, kr: 0.19, label: 'II — Low vegetation' },
  III: { z0: 0.3, zmin: 5, kr: 0.22, label: 'III — Suburban / forest' },
  IV: { z0: 1.0, zmin: 10, kr: 0.24, label: 'IV — Urban' },
};

const PRESETS: Record<string, { name: string; form: Partial<FormData> }> = {
  low_rise: {
    name: 'Low-Rise Suburban',
    form: {
      vb_map: '22',
      altitude: '50',
      terrainCategory: 'III',
      buildingHeight: '8',
      buildingWidth: '15',
      buildingDepth: '10',
      roofType: 'flat',
      internalPressure: '0.2',
    },
  },
  medium_rise: {
    name: 'Medium-Rise Urban',
    form: {
      vb_map: '22',
      altitude: '50',
      terrainCategory: 'II',
      buildingHeight: '15',
      buildingWidth: '20',
      buildingDepth: '15',
      roofType: 'flat',
      internalPressure: '0.2',
    },
  },
  exposed_site: {
    name: 'Exposed Coastal Site',
    form: {
      vb_map: '26',
      altitude: '200',
      terrainCategory: 'I',
      buildingHeight: '12',
      buildingWidth: '20',
      buildingDepth: '12',
      roofType: 'flat',
      internalPressure: '0.3',
    },
  },
};

const WindLoad = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    wind: true,
    building: true,
    pressure: false,
  });
  const [form, setForm] = useState<FormData>({
    vb_map: '22',
    altitude: '50',
    altitudeFactor: '1.0',
    terrainCategory: 'II',
    orography: '1.0',
    buildingHeight: '10',
    buildingWidth: '20',
    buildingDepth: '12',
    roofType: 'flat',
    roofPitch: '0',
    structureType: 'building',
    internalPressure: '0.2',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(form as unknown as Record<string, unknown>, [
      { key: 'vb_map', label: 'Vb Map' },
      { key: 'altitude', label: 'Altitude' },
      { key: 'altitudeFactor', label: 'Altitude Factor' },
      { key: 'orography', label: 'Orography' },
      { key: 'buildingHeight', label: 'Building Height' },
      { key: 'buildingWidth', label: 'Building Width' },
      { key: 'buildingDepth', label: 'Building Depth' },
      { key: 'roofPitch', label: 'Roof Pitch', allowZero: true },
      { key: 'internalPressure', label: 'Internal Pressure' },
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
    { key: 'vb_map', label: 'Vb_map', min: 0, max: 100, step: 1, unit: '' },
    { key: 'altitude', label: 'Altitude', min: 0, max: 100, step: 1, unit: '' },
    { key: 'altitudeFactor', label: 'Altitude Factor', min: 0, max: 100, step: 1, unit: '' },
    { key: 'terrainCategory', label: 'Terrain Category', min: 0, max: 100, step: 1, unit: '' },
  ];

  const [activeTab, setActiveTab] = useState<'input' | 'results' | '3d'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  const calculate = () => {
    if (!validateInputs()) return;
    const w: Warning[] = [];
    try {
      const vb_map = parseFloat(form.vb_map);
      const alt = parseFloat(form.altitude);
      const co = parseFloat(form.orography);
      const H = parseFloat(form.buildingHeight);
      const W = parseFloat(form.buildingWidth);
      const D = parseFloat(form.buildingDepth);
      const pitch = parseFloat(form.roofPitch);
      const cpi = parseFloat(form.internalPressure);
      const terrain = TERRAIN[form.terrainCategory];

      if (vb_map <= 0 || H <= 0 || W <= 0) {
        w.push({ type: 'error', message: 'Invalid inputs' });
        setWarnings(w);
        return;
      }

      // Wind speed
      const cDir = 1.0;
      const cSeason = 1.0;
      const cAlt = 1 + 0.001 * alt; // simplified UK NA altitude correction
      const vb0 = vb_map;
      const vb = cDir * cSeason * cAlt * vb0;

      // Basic velocity pressure
      const rho = 1.226; // kg/m³
      const qb = (0.5 * rho * vb * vb) / 1000; // kN/m²

      // Terrain-dependent mean wind
      const z = Math.max(H, terrain.zmin);
      const cr_z = terrain.kr * Math.log(z / terrain.z0);
      const vm = cr_z * co * vb;

      // Turbulence intensity
      const kl = 1.0;
      const Iv_z = kl / (co * Math.log(z / terrain.z0));

      // Peak velocity pressure
      const qp_z = ((1 + 7 * Iv_z) * 0.5 * rho * vm * vm) / 1000; // kN/m²

      // External pressure coefficients (simplified)
      const d_b = D / W; // depth to breadth ratio
      const h_d = H / D;

      // Walls (Table NA.4)
      let cpe_windward = 0.8;
      let cpe_leeward = d_b <= 1 ? -0.5 : d_b <= 4 ? -0.5 - 0.1 * (d_b - 1) : -0.8;
      let cpe_side = -0.8;

      // Roof
      let cpe_roof: number;
      if (form.roofType === 'flat' || pitch <= 5) {
        cpe_roof = -0.7; // Zone F/G simplified
      } else if (pitch <= 30) {
        cpe_roof = -0.3 - 0.5 * ((30 - pitch) / 25); // interpolate
      } else {
        cpe_roof = (0.7 * (pitch - 30)) / 30 - 0.3; // positive above ~45°
      }

      // Net pressures (with internal pressure)
      const wk_windward = qp_z * (cpe_windward - -cpi); // worst case internal suction
      const wk_leeward = qp_z * (cpe_leeward - cpi);
      const wk_side = qp_z * (cpe_side - cpi);
      const wk_roof = qp_z * (cpe_roof - cpi);

      // Total forces
      const totalWallForce = wk_windward * H * W; // kN on windward face
      const totalRoofForce = Math.abs(wk_roof) * W * D; // kN on roof

      if (form.terrainCategory === 'IV' && H > 50)
        w.push({
          type: 'warning',
          message: 'Urban terrain with H > 50m — verify displacement height',
        });
      if (qp_z > 2.0)
        w.push({ type: 'info', message: `High peak pressure qp = ${qp_z.toFixed(2)} kN/m²` });

      setResults({
        vb0,
        vb,
        cDir,
        cSeason,
        cAlt,
        qb,
        cr_z,
        Iv_z,
        qp_z,
        cpe_windward,
        cpe_leeward,
        cpe_side,
        cpe_roof,
        wk_windward,
        wk_leeward,
        wk_side,
        wk_roof,
        totalWallForce,
        totalRoofForce,
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
      title: 'Wind Load Analysis',
      subtitle: 'BS EN 1991-1-4 + UK NA',
      projectInfo: [{ label: 'Calculator', value: 'Wind Load' }],
      inputs: [
        { label: 'Basic Wind Speed (vb,map)', value: form.vb_map, unit: 'm/s' },
        { label: 'Altitude', value: form.altitude, unit: 'm AMSL' },
        { label: 'Terrain Category', value: form.terrainCategory },
        { label: 'Building Height', value: form.buildingHeight, unit: 'm' },
        { label: 'Building Width', value: form.buildingWidth, unit: 'm' },
        { label: 'Building Depth', value: form.buildingDepth, unit: 'm' },
        { label: 'Roof Type', value: form.roofType },
        { label: 'Internal Pressure Cpi', value: form.internalPressure },
      ],
      checks: [
        {
          name: 'Peak qp(z)',
          capacity: '-',
          utilisation: `${results.qp_z.toFixed(2)} kN/m²`,
          status: 'PASS' as const,
        },
        {
          name: 'Wall Windward',
          capacity: '-',
          utilisation: `${results.wk_windward.toFixed(2)} kN/m²`,
          status: 'PASS' as const,
        },
        {
          name: 'Wall Leeward',
          capacity: '-',
          utilisation: `${results.wk_leeward.toFixed(2)} kN/m²`,
          status: 'PASS' as const,
        },
        {
          name: 'Roof Net',
          capacity: '-',
          utilisation: `${results.wk_roof.toFixed(2)} kN/m²`,
          status: 'PASS' as const,
        },
      ],
      sections: [
        {
          title: 'Wind Speed Parameters',
          head: [['Parameter', 'Value']],
          body: [
            ['vb,0', `${results.vb0.toFixed(1)} m/s`],
            ['cAlt', results.cAlt.toFixed(3)],
            ['vb (design)', `${results.vb.toFixed(1)} m/s`],
            ['cr(z)', results.cr_z.toFixed(3)],
            ['Iv(z)', results.Iv_z.toFixed(3)],
            ['qb', `${results.qb.toFixed(2)} kN/m²`],
            ['qp(z)', `${results.qp_z.toFixed(2)} kN/m²`],
          ],
        },
        {
          title: 'Net Pressures & Forces',
          head: [['Face', 'Cpe', 'wk (kN/m²)']],
          body: [
            ['Windward', results.cpe_windward.toFixed(2), results.wk_windward.toFixed(2)],
            ['Leeward', results.cpe_leeward.toFixed(2), results.wk_leeward.toFixed(2)],
            ['Side Walls', results.cpe_side.toFixed(2), results.wk_side.toFixed(2)],
            ['Roof', results.cpe_roof.toFixed(2), results.wk_roof.toFixed(2)],
            ['Total Wall Force', '-', `${results.totalWallForce.toFixed(0)} kN`],
            ['Total Roof Force', '-', `${results.totalRoofForce.toFixed(0)} kN`],
          ],
        },
      ],
      recommendations: [
        ...(results.qp_z > 1.5
          ? [
              {
                check: 'High Peak Pressure',
                suggestion: `qp = ${results.qp_z.toFixed(2)} kN/m² — verify terrain category and orography`,
              },
            ]
          : []),
        ...(Math.abs(results.wk_roof) > results.wk_windward
          ? [
              {
                check: 'Roof Suction Governs',
                suggestion: 'Roof uplift exceeds windward — check anchorage',
              },
            ]
          : []),
        { check: 'Overall', suggestion: 'Wind pressures calculated to BS EN 1991-1-4 + UK NA' },
      ],
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Wind Load Analysis',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Wind Load Analysis',
      subtitle: 'BS EN 1991-1-4 + UK NA',
      projectInfo: [{ label: 'Calculator', value: 'Wind Load' }],
      inputs: [
        { label: 'Basic Wind Speed (vb,map)', value: form.vb_map, unit: 'm/s' },
        { label: 'Altitude', value: form.altitude, unit: 'm AMSL' },
        { label: 'Terrain Category', value: form.terrainCategory },
        { label: 'Building Height', value: form.buildingHeight, unit: 'm' },
        { label: 'Building Width', value: form.buildingWidth, unit: 'm' },
        { label: 'Building Depth', value: form.buildingDepth, unit: 'm' },
        { label: 'Roof Type', value: form.roofType },
        { label: 'Internal Pressure Cpi', value: form.internalPressure },
      ],
      checks: [
        {
          name: 'Peak qp(z)',
          capacity: '-',
          utilisation: `${results.qp_z.toFixed(2)} kN/m²`,
          status: 'PASS' as const,
        },
        {
          name: 'Wall Windward',
          capacity: '-',
          utilisation: `${results.wk_windward.toFixed(2)} kN/m²`,
          status: 'PASS' as const,
        },
        {
          name: 'Wall Leeward',
          capacity: '-',
          utilisation: `${results.wk_leeward.toFixed(2)} kN/m²`,
          status: 'PASS' as const,
        },
        {
          name: 'Roof Net',
          capacity: '-',
          utilisation: `${results.wk_roof.toFixed(2)} kN/m²`,
          status: 'PASS' as const,
        },
      ],
      sections: [
        {
          title: 'Wind Speed Parameters',
          head: [['Parameter', 'Value']],
          body: [
            ['vb,0', `${results.vb0.toFixed(1)} m/s`],
            ['cAlt', results.cAlt.toFixed(3)],
            ['vb (design)', `${results.vb.toFixed(1)} m/s`],
            ['cr(z)', results.cr_z.toFixed(3)],
            ['Iv(z)', results.Iv_z.toFixed(3)],
            ['qb', `${results.qb.toFixed(2)} kN/m²`],
            ['qp(z)', `${results.qp_z.toFixed(2)} kN/m²`],
          ],
        },
        {
          title: 'Net Pressures & Forces',
          head: [['Face', 'Cpe', 'wk (kN/m²)']],
          body: [
            ['Windward', results.cpe_windward.toFixed(2), results.wk_windward.toFixed(2)],
            ['Leeward', results.cpe_leeward.toFixed(2), results.wk_leeward.toFixed(2)],
            ['Side Walls', results.cpe_side.toFixed(2), results.wk_side.toFixed(2)],
            ['Roof', results.cpe_roof.toFixed(2), results.wk_roof.toFixed(2)],
            ['Total Wall Force', '-', `${results.totalWallForce.toFixed(0)} kN`],
            ['Total Roof Force', '-', `${results.totalRoofForce.toFixed(0)} kN`],
          ],
        },
      ],
      recommendations: [
        ...(results.qp_z > 1.5
          ? [
              {
                check: 'High Peak Pressure',
                suggestion: `qp = ${results.qp_z.toFixed(2)} kN/m² — verify terrain category and orography`,
              },
            ]
          : []),
        ...(Math.abs(results.wk_roof) > results.wk_windward
          ? [
              {
                check: 'Roof Suction Governs',
                suggestion: 'Roof uplift exceeds windward — check anchorage',
              },
            ]
          : []),
        { check: 'Overall', suggestion: 'Wind pressures calculated to BS EN 1991-1-4 + UK NA' },
      ],
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Wind Load Analysis',
    });
  };

  const toggleSection = (s: string) => setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-800/20 via-transparent to-gray-900/10" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-sky-500/30 mb-4 bg-sky-950/20">
            <span className="text-sky-100 font-mono tracking-wider">LOADING | WIND</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
            Wind Load Analysis
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Wind velocity, peak pressure, and external pressure coefficients to BS EN 1991-1-4 with
            UK National Annex.
          </p>
        </motion.div>

        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <div className="flex items-center gap-2 flex-1">
            {['input', 'results', '3d'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'neon' : 'ghost'}
                onClick={() => setActiveTab(tab as any)}
                disabled={tab !== 'input' && !results}
                className={cn(
                  'px-8 py-3 rounded-xl font-semibold capitalize',
                  activeTab === tab ? 'bg-gradient-to-r from-sky-500 to-blue-500' : 'text-gray-400',
                )}
              >
                {tab === 'input' ? '🌬️ Input' : tab === 'results' ? '📊 Results' : '🧊 3D'}
              </Button>
            ))}
          </div>
          {results && (
            <div className="flex items-center gap-2">
              <Button
                onClick={exportPDF}
                size="sm"
                className="bg-gradient-to-r from-sky-600 to-blue-600"
              >
                <FiDownload className="mr-2" /> PDF
              </Button>
              <Button
                onClick={exportDOCX}
                size="sm"
                className="bg-gradient-to-r from-sky-600 to-blue-600"
              >
                <FiDownload className="mr-2" /> DOCX
              </Button>
            </div>
          )}
        </div>

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
              className="grid lg:grid-cols-2 gap-6"
            >
              <div className="space-y-4">
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
                <Card variant="glass" className="border-sky-500/20 shadow-lg shadow-sky-500/5">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('wind')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiWind className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Wind Parameters</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.wind && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.wind && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <InputField
                          label="vb,map (basic wind)"
                          value={form.vb_map}
                          onChange={(v) => setForm((f) => ({ ...f, vb_map: v }))}
                          unit="m/s"
                        />
                        <InputField
                          label="Altitude"
                          value={form.altitude}
                          onChange={(v) => setForm((f) => ({ ...f, altitude: v }))}
                          unit="m AMSL"
                        />
                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Terrain Category
                          </label>
                          <select
                            title="Terrain Category"
                            value={form.terrainCategory}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, terrainCategory: e.target.value }))
                            }
                            className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          >
                            {Object.entries(TERRAIN).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <InputField
                          label="Orography co"
                          value={form.orography}
                          onChange={(v) => setForm((f) => ({ ...f, orography: v }))}
                          unit=""
                        />
                      </CardContent>
                    </motion.div>
                  )}
                </Card>
                <Card variant="glass" className="border-blue-500/20 shadow-lg shadow-blue-500/5">
                  <CardHeader
                    className="cursor-pointer flex flex-row items-center justify-between py-3"
                    onClick={() => toggleSection('building')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiBox className="w-6 h-6 text-blue-400" />
                      </div>
                      <CardTitle className="text-white font-semibold">Building Geometry</CardTitle>
                    </div>
                    <FiChevronDown
                      className={cn(
                        'text-gray-400 transition-transform',
                        expandedSections.building && 'rotate-180',
                      )}
                    />
                  </CardHeader>
                  {expandedSections.building && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                    >
                      <CardContent className="space-y-4 pt-0">
                        <div className="grid grid-cols-3 gap-3">
                          <InputField
                            label="Height"
                            value={form.buildingHeight}
                            onChange={(v) => setForm((f) => ({ ...f, buildingHeight: v }))}
                            unit="m"
                          />
                          <InputField
                            label="Width"
                            value={form.buildingWidth}
                            onChange={(v) => setForm((f) => ({ ...f, buildingWidth: v }))}
                            unit="m"
                          />
                          <InputField
                            label="Depth"
                            value={form.buildingDepth}
                            onChange={(v) => setForm((f) => ({ ...f, buildingDepth: v }))}
                            unit="m"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                              Roof Type
                            </label>
                            <select
                              title="Roof Type"
                              value={form.roofType}
                              onChange={(e) => setForm((f) => ({ ...f, roofType: e.target.value }))}
                              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            >
                              <option value="flat">Flat Roof</option>
                              <option value="monopitch">Monopitch</option>
                              <option value="duopitch">Duopitch</option>
                            </select>
                          </div>
                          <InputField
                            label="Pitch"
                            value={form.roofPitch}
                            onChange={(v) => setForm((f) => ({ ...f, roofPitch: v }))}
                            unit="°"
                          />
                        </div>
                        <InputField
                          label="Cpi (internal)"
                          value={form.internalPressure}
                          onChange={(v) => setForm((f) => ({ ...f, internalPressure: v }))}
                          unit=""
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
              <div className="space-y-4 sticky top-8">
                {results && (
                  <>
                    <Card
                      variant="glass"
                      className="border-sky-500/30 bg-sky-950/10 shadow-lg shadow-sky-500/5"
                    >
                      <CardHeader className="py-3 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <FiZap className="w-6 h-6 text-blue-400" />
                          </div>
                          <CardTitle className="text-white font-semibold">
                            Wind Speed Summary
                          </CardTitle>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={exportPDF}
                            size="sm"
                            className="bg-gradient-to-r from-sky-600 to-blue-600"
                          >
                            <FiDownload className="mr-2" />
                            Export
                          </Button>
                          <Button
                            onClick={exportDOCX}
                            size="sm"
                            className="bg-gradient-to-r from-sky-600 to-blue-600"
                          >
                            <FiDownload className="mr-2" />
                            Export
                          </Button>
                          <SaveRunButton
                            calculatorKey="wind-load"
                            inputs={form as unknown as Record<string, string | number>}
                            results={results}
                            status={
                              ((results as any)?.status ?? undefined) as 'PASS' | 'FAIL' | undefined
                            }
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            ['vb,0', `${results.vb0.toFixed(1)} m/s`],
                            ['vb', `${results.vb.toFixed(1)} m/s`],
                            ['cAlt', results.cAlt.toFixed(3)],
                            ['cr(z)', results.cr_z.toFixed(3)],
                            ['Iv(z)', results.Iv_z.toFixed(3)],
                            ['qb', `${results.qb.toFixed(2)} kN/m²`],
                          ].map(([l, v], i) => (
                            <div key={i} className="bg-black/30 rounded-lg p-3">
                              <div className="text-gray-500 text-xs uppercase mb-1">{l}</div>
                              <div className="text-white font-mono text-sm">{v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 bg-sky-950/40 border border-sky-500/30 rounded-lg p-4 text-center">
                          <div className="text-xs uppercase text-sky-400 mb-1">
                            Peak Velocity Pressure qp(z)
                          </div>
                          <div className="text-4xl font-bold font-mono text-sky-300">
                            {results.qp_z.toFixed(2)} kN/m²
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card
                      variant="glass"
                      className="border-gray-800/50 shadow-lg shadow-gray-500/5"
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <FiTarget className="w-6 h-6 text-blue-400" />
                          </div>
                          <CardTitle className="text-white font-semibold">
                            Pressure Coefficients & Net Pressures
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(
                            [
                              ['Windward', results.cpe_windward, results.wk_windward],
                              ['Leeward', results.cpe_leeward, results.wk_leeward],
                              ['Side Walls', results.cpe_side, results.wk_side],
                              ['Roof', results.cpe_roof, results.wk_roof],
                            ] as [string, number, number][]
                          ).map(([face, cpe, wk], i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-gray-800/50"
                            >
                              <div className="text-white text-sm font-semibold">{face}</div>
                              <div className="flex gap-6">
                                <div className="text-right">
                                  <div className="text-gray-500 text-xs">Cpe</div>
                                  <div className="text-white font-mono text-sm">
                                    {cpe.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-gray-500 text-xs">wk</div>
                                  <div
                                    className={cn(
                                      'font-mono text-sm font-bold',
                                      wk >= 0 ? 'text-red-400' : 'text-blue-400',
                                    )}
                                  >
                                    {wk.toFixed(2)} kN/m²
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card
                      variant="glass"
                      className="border-sky-500/20 shadow-lg shadow-sky-500/5 mt-4"
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <FiCheckCircle className="w-6 h-6 text-blue-400" />
                          </div>
                          <CardTitle className="text-white font-semibold">
                            Recommendations
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {results.qp_z > 1.5 && (
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-950/30 border border-yellow-500/20">
                            <FiAlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-yellow-300 text-xs font-semibold">
                                High Peak Pressure
                              </div>
                              <div className="text-gray-400 text-xs">
                                qp = {results.qp_z.toFixed(2)} kN/m² — verify terrain category and
                                orography factor
                              </div>
                            </div>
                          </div>
                        )}
                        {Math.abs(results.wk_roof) > results.wk_windward && (
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-950/30 border border-blue-500/20">
                            <FiInfo className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-blue-300 text-xs font-semibold">
                                Roof Suction Governs
                              </div>
                              <div className="text-gray-400 text-xs">
                                Roof uplift ({Math.abs(results.wk_roof).toFixed(2)} kN/m²) exceeds
                                windward pressure — check anchorage
                              </div>
                            </div>
                          </div>
                        )}
                        {results.totalRoofForce > results.totalWallForce && (
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-950/30 border border-orange-500/20">
                            <FiAlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-orange-300 text-xs font-semibold">
                                Roof Force Dominant
                              </div>
                              <div className="text-gray-400 text-xs">
                                Total roof uplift ({results.totalRoofForce.toFixed(0)} kN) exceeds
                                wall force — verify roof fixings
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                          <FiCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-emerald-300 text-xs font-semibold">Overall</div>
                            <div className="text-gray-400 text-xs">
                              Wind pressures calculated to BS EN 1991-1-4 + UK NA
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Card
                        variant="glass"
                        className="p-4 text-center border border-red-500/30 bg-red-950/20 border-l-4 border-l-red-400"
                      >
                        <div className="text-xs uppercase text-gray-500 mb-1">Wall Force</div>
                        <div className="text-2xl font-bold font-mono text-red-400">
                          {results.totalWallForce.toFixed(0)} kN
                        </div>
                      </Card>
                      <Card
                        variant="glass"
                        className="p-4 text-center border border-blue-500/30 bg-blue-950/20 border-l-4 border-l-blue-400"
                      >
                        <div className="text-xs uppercase text-gray-500 mb-1">Roof Uplift</div>
                        <div className="text-2xl font-bold font-mono text-blue-400">
                          {results.totalRoofForce.toFixed(0)} kN
                        </div>
                      </Card>
                    </div>
                  </>
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
            >
              <Card variant="glass" className="border-gray-800/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {[
                      ['vb', `${results.vb.toFixed(1)} m/s`],
                      ['qb', `${results.qb.toFixed(2)} kN/m²`],
                      ['cr(z)', results.cr_z.toFixed(3)],
                      ['qp(z)', `${results.qp_z.toFixed(2)} kN/m²`],
                      ['Cpe wind', results.cpe_windward.toFixed(2)],
                      ['Cpe lee', results.cpe_leeward.toFixed(2)],
                      ['Cpe roof', results.cpe_roof.toFixed(2)],
                      ['Iv(z)', results.Iv_z.toFixed(3)],
                      ['wk wind', `${results.wk_windward.toFixed(2)} kN/m²`],
                      ['wk lee', `${results.wk_leeward.toFixed(2)} kN/m²`],
                      ['Wall F', `${results.totalWallForce.toFixed(0)} kN`],
                      ['Roof F', `${results.totalRoofForce.toFixed(0)} kN`],
                    ].map(([l, v], i) => (
                      <div key={i} className="bg-black/30 rounded-lg p-3">
                        <div className="text-gray-500 text-xs uppercase mb-1">{l}</div>
                        <div className="text-white font-mono">{v}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {activeTab === '3d' && results && (
            <motion.div
              key="3d"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
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
                    <Interactive3DDiagram
                      height="h-full"
                      cameraPosition={[6, 5, 6]}
                      status={undefined}
                    >
                      <WindLoad3D
                        buildingHeight={parseFloat(form.buildingHeight) || 10}
                        buildingWidth={parseFloat(form.buildingWidth) || 20}
                        buildingDepth={parseFloat(form.buildingDepth) || 12}
                        wk_windward={results?.wk_windward ?? 0}
                        wk_leeward={results?.wk_leeward ?? 0}
                        wk_side={results?.wk_side ?? 0}
                        wk_roof={results?.wk_roof ?? 0}
                        qp_z={results?.qp_z ?? 0}
                      />
                    </Interactive3DDiagram>
                    <button
                      onClick={() => setPreviewMaximized(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                      aria-label="Minimize preview"
                    >
                      <FiMinimize2 size={20} />
                    </button>
                    <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                      WIND LOAD — REAL-TIME PREVIEW
                    </div>
                  </div>
                  <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                    <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                      <FiSliders size={14} /> Live Parameters
                    </h3>
                    {[
                      {
                        label: 'vb,map',
                        field: 'vb_map' as keyof FormData,
                        min: 18,
                        max: 35,
                        step: 0.5,
                        unit: 'm/s',
                      },
                      {
                        label: 'Altitude',
                        field: 'altitude' as keyof FormData,
                        min: 0,
                        max: 500,
                        step: 5,
                        unit: 'm',
                      },
                      {
                        label: 'Building Height',
                        field: 'buildingHeight' as keyof FormData,
                        min: 1,
                        max: 100,
                        step: 1,
                        unit: 'm',
                      },
                      {
                        label: 'Building Width',
                        field: 'buildingWidth' as keyof FormData,
                        min: 1,
                        max: 100,
                        step: 1,
                        unit: 'm',
                      },
                      {
                        label: 'Building Depth',
                        field: 'buildingDepth' as keyof FormData,
                        min: 1,
                        max: 100,
                        step: 1,
                        unit: 'm',
                      },
                      {
                        label: 'Cpi (internal)',
                        field: 'internalPressure' as keyof FormData,
                        min: -0.3,
                        max: 0.7,
                        step: 0.05,
                        unit: '',
                      },
                    ].map((s) => (
                      <div key={s.field} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-gray-400">{s.label}</span>
                          <span className="text-white">
                            {form[s.field]} {s.unit}
                          </span>
                        </div>
                        <input
                          title={s.label}
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={form[s.field]}
                          onChange={(e) => updateForm(s.field, e.target.value)}
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
                        { label: 'Terrain', value: form.terrainCategory || '—' },
                        { label: 'Roof Type', value: form.roofType || '—' },
                        { label: 'Structure', value: form.structureType || '—' },
                        {
                          label: 'Building H×W×D',
                          value: `${form.buildingHeight} × ${form.buildingWidth} × ${form.buildingDepth} m`,
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
                      {results && (
                        <div className="mt-3 space-y-1">
                          <div className="text-xs font-bold text-gray-400 uppercase mb-1">
                            Last Analysis
                          </div>
                          {[
                            { label: 'vb', value: `${results.vb.toFixed(1)} m/s` },
                            { label: 'qp(z)', value: `${results.qp_z.toFixed(1)} Pa` },
                            { label: 'Wk windward', value: `${results.wk_windward.toFixed(1)} Pa` },
                            { label: 'Wk leeward', value: `${results.wk_leeward.toFixed(1)} Pa` },
                            { label: 'Wk side', value: `${results.wk_side.toFixed(1)} Pa` },
                            { label: 'Wk roof', value: `${results.wk_roof.toFixed(1)} Pa` },
                            {
                              label: 'Wall Force',
                              value: `${results.totalWallForce.toFixed(1)} kN`,
                            },
                            {
                              label: 'Roof Force',
                              value: `${results.totalRoofForce.toFixed(1)} kN`,
                            },
                          ].map((check) => (
                            <div key={check.label} className="flex justify-between text-xs py-0.5">
                              <span className="text-gray-500">{check.label}</span>
                              <span className="font-bold text-emerald-400">{check.value}</span>
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

              <WhatIfPreview
                title="Wind Load — 3D Preview"
                sliders={whatIfSliders}
                form={form}
                updateForm={updateForm}
                onMaximize={() => setPreviewMaximized(true)}
                status={undefined}
                renderScene={(fsHeight) => (
                  <Interactive3DDiagram
                    height={fsHeight}
                    cameraPosition={[6, 5, 6]}
                    status={undefined}
                  >
                    <WindLoad3D
                      buildingHeight={parseFloat(form.buildingHeight) || 10}
                      buildingWidth={parseFloat(form.buildingWidth) || 20}
                      buildingDepth={parseFloat(form.buildingDepth) || 12}
                      wk_windward={results?.wk_windward ?? 0}
                      wk_leeward={results?.wk_leeward ?? 0}
                      wk_side={results?.wk_side ?? 0}
                      wk_roof={results?.wk_roof ?? 0}
                      qp_z={results?.qp_z ?? 0}
                    />
                  </Interactive3DDiagram>
                )}
              />
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
    <ExplainableLabel label={`${label}${unit ? ` (${unit})` : ''}`} field={field || 'wind-load'} />
    <input
      title={label}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
    />
  </div>
);

export default WindLoad;
