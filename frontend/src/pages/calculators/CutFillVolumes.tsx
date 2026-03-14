// =============================================================================
// BeaverCalc Studio — Cut & Fill Volumes Calculator (Premium)
// Average End Area method for earthworks with Mass Haul optimisation
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiInfo,
  FiLayers,
  FiMinimize2,
  FiMinus,
  FiPlus,
  FiSettings,
  FiSliders,
  FiTarget,
  FiTrendingUp,
  FiTruck,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import CutFillVolumes3D from '../../components/3d/scenes/CutFillVolumes3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPES
// =============================================================================

interface SectionData {
  id: number;
  chainage: number;
  areaCut: number;
  areaFill: number;
  description?: string;
}

interface SegmentResult {
  startCh: number;
  endCh: number;
  cutVolume: number;
  fillVolume: number;
  netVolume: number;
  cumulativeMass: number;
}

interface Results {
  totalCut: number;
  totalFill: number;
  netBalance: number;
  segments: SegmentResult[];
  massHaulPoints: { chainage: number; mass: number }[];
  shrinkage: number;
  adjustedFill: number;
  balancePoint: number | null;
  haulMoment: number;
  freeHaulLimit: number;
  overhaul: number;
}

interface ProjectSettings {
  shrinkageFactor: number;
  swellFactor: number;
  freeHaulDistance: number;
  bulkingFactor: number;
  compactionFactor: number;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  message: string;
}

// =============================================================================
// PRESETS
// =============================================================================

const SOIL_PRESETS: Record<string, { shrinkage: number; swell: number; label: string }> = {
  clay: { shrinkage: 0.9, swell: 1.3, label: 'Clay' },
  silt: { shrinkage: 0.92, swell: 1.25, label: 'Silt' },
  sand: { shrinkage: 0.95, swell: 1.15, label: 'Sand' },
  gravel: { shrinkage: 0.97, swell: 1.1, label: 'Gravel' },
  rock: { shrinkage: 0.85, swell: 1.5, label: 'Rock' },
  topsoil: { shrinkage: 0.88, swell: 1.25, label: 'Topsoil' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CutFillVolumes = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sections: true,
    settings: false,
    segments: false,
  });

  const [sections, setSections] = useState<SectionData[]>([
    { id: 1, chainage: 0, areaCut: 0, areaFill: 0, description: 'Start' },
    { id: 2, chainage: 20, areaCut: 12, areaFill: 2, description: 'Cut zone' },
    { id: 3, chainage: 40, areaCut: 8, areaFill: 5, description: 'Transition' },
    { id: 4, chainage: 60, areaCut: 2, areaFill: 15, description: 'Fill zone' },
    { id: 5, chainage: 80, areaCut: 0, areaFill: 10, description: 'Deep fill' },
    { id: 6, chainage: 100, areaCut: 5, areaFill: 3, description: 'End' },
  ]);

  const [settings, setSettings] = useState<ProjectSettings>({
    shrinkageFactor: 0.9,
    swellFactor: 1.25,
    freeHaulDistance: 100,
    bulkingFactor: 1.2,
    compactionFactor: 0.95,
  });
  // What-If sliders
  const whatIfSliders = [
    { key: 'shrinkageFactor', label: 'Shrinkage Factor', min: 0.7, max: 1.0, step: 0.01, unit: '' },
    { key: 'swellFactor', label: 'Swell Factor', min: 1.0, max: 1.6, step: 0.05, unit: '' },
    {
      key: 'freeHaulDistance',
      label: 'Free-Haul Distance',
      min: 50,
      max: 500,
      step: 25,
      unit: 'm',
    },
    {
      key: 'compactionFactor',
      label: 'Compaction Factor',
      min: 0.8,
      max: 1.0,
      step: 0.01,
      unit: '',
    },
  ];

  // What-If helper
  const updateForm = (field: keyof ProjectSettings, value: string | boolean | number) => {
    setSettings((prev: ProjectSettings) => ({ ...prev, [field]: value }));
  };

  const [results, setResults] = useState<Results | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [selectedSoil, setSelectedSoil] = useState<string>('clay');
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // ===========================================================================
  // CALCULATION ENGINE
  // ===========================================================================

  const calculate = () => {
    // Input validation
    const validationErrors = validateNumericInputs(settings as unknown as Record<string, unknown>, [
      { key: 'shrinkageFactor', label: 'Shrinkage Factor' },
      { key: 'swellFactor', label: 'Swell Factor' },
      { key: 'freeHaulDistance', label: 'Free-Haul Distance' },
      { key: 'bulkingFactor', label: 'Bulking Factor' },
      { key: 'compactionFactor', label: 'Compaction Factor' },
    ]);
    if (validationErrors.length > 0) {
      setWarnings(validationErrors.map((e) => ({ type: 'error' as const, message: e })));
      setResults(null);
      return;
    }

    const newWarnings: Warning[] = [];

    try {
      if (sections.length < 2) {
        newWarnings.push({ type: 'error', message: 'At least 2 sections required' });
        setWarnings(newWarnings);
        return;
      }

      // Sort sections by chainage
      const sortedSections = [...sections].sort((a, b) => a.chainage - b.chainage);

      let totalCut = 0;
      let totalFill = 0;
      let cumulativeMass = 0;
      const segments: SegmentResult[] = [];
      const massHaulPoints: { chainage: number; mass: number }[] = [
        { chainage: sortedSections[0].chainage, mass: 0 },
      ];

      // Average End Area Method
      for (let i = 0; i < sortedSections.length - 1; i++) {
        const s1 = sortedSections[i];
        const s2 = sortedSections[i + 1];
        const L = s2.chainage - s1.chainage;

        if (L <= 0) {
          newWarnings.push({
            type: 'warning',
            message: `Zero or negative spacing at Ch ${s1.chainage}`,
          });
          continue;
        }

        const cutVol = ((s1.areaCut + s2.areaCut) / 2) * L;
        const fillVol = ((s1.areaFill + s2.areaFill) / 2) * L;
        const netVol = cutVol - fillVol;
        cumulativeMass += netVol;

        totalCut += cutVol;
        totalFill += fillVol;

        segments.push({
          startCh: s1.chainage,
          endCh: s2.chainage,
          cutVolume: cutVol,
          fillVolume: fillVol,
          netVolume: netVol,
          cumulativeMass,
        });

        massHaulPoints.push({ chainage: s2.chainage, mass: cumulativeMass });
      }

      // Apply shrinkage
      const adjustedFill = totalFill / settings.shrinkageFactor;
      const netBalance = totalCut - adjustedFill;

      // Find balance point (where mass haul crosses zero)
      let balancePoint: number | null = null;
      for (let i = 0; i < massHaulPoints.length - 1; i++) {
        const p1 = massHaulPoints[i];
        const p2 = massHaulPoints[i + 1];
        if ((p1.mass <= 0 && p2.mass >= 0) || (p1.mass >= 0 && p2.mass <= 0)) {
          // Linear interpolation
          if (p2.mass !== p1.mass) {
            balancePoint =
              p1.chainage + ((0 - p1.mass) / (p2.mass - p1.mass)) * (p2.chainage - p1.chainage);
          }
          break;
        }
      }

      // Calculate haul moment and overhaul
      let haulMoment = 0;
      let overhaul = 0;
      for (const seg of segments) {
        const haulDist = Math.abs(seg.endCh - seg.startCh);
        haulMoment += Math.abs(seg.netVolume) * haulDist;
        if (haulDist > settings.freeHaulDistance) {
          overhaul += Math.abs(seg.netVolume) * (haulDist - settings.freeHaulDistance);
        }
      }

      // Warnings
      if (netBalance > 0) {
        newWarnings.push({
          type: 'info',
          message: `Surplus of ${netBalance.toFixed(0)} m³ (export required)`,
        });
      } else if (netBalance < 0) {
        newWarnings.push({
          type: 'warning',
          message: `Deficit of ${Math.abs(netBalance).toFixed(0)} m³ (import required)`,
        });
      }

      if (overhaul > 0) {
        newWarnings.push({
          type: 'info',
          message: `Overhaul: ${overhaul.toFixed(0)} m³·m`,
        });
      }

      setResults({
        totalCut,
        totalFill,
        netBalance,
        segments,
        massHaulPoints,
        shrinkage: settings.shrinkageFactor,
        adjustedFill,
        balancePoint,
        haulMoment,
        freeHaulLimit: settings.freeHaulDistance,
        overhaul,
      });
    } catch {
      newWarnings.push({ type: 'error', message: 'Calculation error' });
    }

    setWarnings(newWarnings);
  };

  useEffect(() => {
    calculate();
  }, [sections, settings]);

  // ===========================================================================
  // MASS HAUL VISUALIZATION
  // ===========================================================================

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const updateSection = (id: number, field: keyof SectionData, value: number | string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const addSection = () => {
    const last = sections[sections.length - 1];
    setSections([
      ...sections,
      { id: Date.now(), chainage: last.chainage + 20, areaCut: 0, areaFill: 0, description: '' },
    ]);
  };

  const removeSection = (id: number) => {
    if (sections.length > 2) {
      setSections(sections.filter((s) => s.id !== id));
    }
  };

  const applySoilPreset = (key: string) => {
    const preset = SOIL_PRESETS[key];
    if (preset) {
      setSelectedSoil(key);
      setSettings((prev) => ({
        ...prev,
        shrinkageFactor: preset.shrinkage,
        swellFactor: preset.swell,
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
    const recs: { check: string; suggestion: string }[] = [];
    if (results.netBalance > 0)
      recs.push({
        check: 'Surplus Material',
        suggestion: `${results.netBalance.toFixed(0)} m³ surplus — arrange export or stockpile area`,
      });
    if (results.netBalance < 0)
      recs.push({
        check: 'Material Deficit',
        suggestion: `${Math.abs(results.netBalance).toFixed(0)} m³ deficit — arrange import from borrow pit`,
      });
    if (results.overhaul > 0)
      recs.push({
        check: 'Overhaul Distance',
        suggestion: `Overhaul of ${results.overhaul.toFixed(0)} m³·m exceeds free haul — consider staged construction`,
      });
    if (results.balancePoint !== null)
      recs.push({
        check: 'Balance Point',
        suggestion: `Material balance at Ch ${results.balancePoint.toFixed(1)}m — optimal haul route pivot`,
      });
    if (Math.abs(results.netBalance) < 10)
      recs.push({
        check: 'Balanced Cut/Fill',
        suggestion: 'Near-balanced earthworks — minimal import/export required',
      });

    generatePremiumPDF({
      title: 'Cut & Fill Analysis',
      subtitle: 'Average End Area Method — Earthworks Volume Calculation',
      projectInfo: [
        { label: 'Project', value: 'Cut & Fill Analysis' },
        { label: 'Reference', value: 'CUT001' },
        { label: 'Sections', value: `${sections.length} cross-sections` },
        { label: 'Soil Type', value: SOIL_PRESETS[selectedSoil]?.label || selectedSoil },
      ],
      inputs: [
        { label: 'Number of Sections', value: String(sections.length) },
        {
          label: 'Total Length',
          value: `${(sections[sections.length - 1]?.chainage ?? 0) - (sections[0]?.chainage ?? 0)} m`,
        },
        { label: 'Shrinkage Factor', value: String(settings.shrinkageFactor) },
        { label: 'Swell Factor', value: String(settings.swellFactor) },
        { label: 'Free Haul Distance', value: `${settings.freeHaulDistance} m` },
      ],
      checks: [
        {
          name: 'Total Cut Volume',
          capacity: `${results.totalCut.toFixed(1)} m³`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Total Fill Volume',
          capacity: `${results.totalFill.toFixed(1)} m³`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Adjusted Fill (shrinkage)',
          capacity: `${results.adjustedFill.toFixed(1)} m³`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Net Balance',
          capacity: `${results.netBalance.toFixed(1)} m³`,
          utilisation: '-',
          status: (Math.abs(results.netBalance) < 50 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overhaul',
          capacity: `${results.overhaul.toFixed(0)} m³·m`,
          utilisation: '-',
          status: 'PASS' as const,
        },
      ],
      sections: [
        {
          title: 'Segment Breakdown',
          head: [['Segment', 'Cut (m³)', 'Fill (m³)', 'Net (m³)', 'Cumulative']],
          body: results.segments.map((seg) => [
            `Ch ${seg.startCh}-${seg.endCh}m`,
            seg.cutVolume.toFixed(1),
            seg.fillVolume.toFixed(1),
            seg.netVolume.toFixed(1),
            seg.cumulativeMass.toFixed(1),
          ]),
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Cut & Fill Analysis',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    const recs: { check: string; suggestion: string }[] = [];
    if (results.netBalance > 0)
      recs.push({
        check: 'Surplus Material',
        suggestion: `${results.netBalance.toFixed(0)} m³ surplus — arrange export or stockpile area`,
      });
    if (results.netBalance < 0)
      recs.push({
        check: 'Material Deficit',
        suggestion: `${Math.abs(results.netBalance).toFixed(0)} m³ deficit — arrange import from borrow pit`,
      });
    if (results.overhaul > 0)
      recs.push({
        check: 'Overhaul Distance',
        suggestion: `Overhaul of ${results.overhaul.toFixed(0)} m³·m exceeds free haul — consider staged construction`,
      });
    if (results.balancePoint !== null)
      recs.push({
        check: 'Balance Point',
        suggestion: `Material balance at Ch ${results.balancePoint.toFixed(1)}m — optimal haul route pivot`,
      });
    if (Math.abs(results.netBalance) < 10)
      recs.push({
        check: 'Balanced Cut/Fill',
        suggestion: 'Near-balanced earthworks — minimal import/export required',
      });

    generateDOCX({
      title: 'Cut & Fill Analysis',
      subtitle: 'Average End Area Method — Earthworks Volume Calculation',
      projectInfo: [
        { label: 'Project', value: 'Cut & Fill Analysis' },
        { label: 'Reference', value: 'CUT001' },
        { label: 'Sections', value: `${sections.length} cross-sections` },
        { label: 'Soil Type', value: SOIL_PRESETS[selectedSoil]?.label || selectedSoil },
      ],
      inputs: [
        { label: 'Number of Sections', value: String(sections.length) },
        {
          label: 'Total Length',
          value: `${(sections[sections.length - 1]?.chainage ?? 0) - (sections[0]?.chainage ?? 0)} m`,
        },
        { label: 'Shrinkage Factor', value: String(settings.shrinkageFactor) },
        { label: 'Swell Factor', value: String(settings.swellFactor) },
        { label: 'Free Haul Distance', value: `${settings.freeHaulDistance} m` },
      ],
      checks: [
        {
          name: 'Total Cut Volume',
          capacity: `${results.totalCut.toFixed(1)} m³`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Total Fill Volume',
          capacity: `${results.totalFill.toFixed(1)} m³`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Adjusted Fill (shrinkage)',
          capacity: `${results.adjustedFill.toFixed(1)} m³`,
          utilisation: '-',
          status: 'PASS' as const,
        },
        {
          name: 'Net Balance',
          capacity: `${results.netBalance.toFixed(1)} m³`,
          utilisation: '-',
          status: (Math.abs(results.netBalance) < 50 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Overhaul',
          capacity: `${results.overhaul.toFixed(0)} m³·m`,
          utilisation: '-',
          status: 'PASS' as const,
        },
      ],
      sections: [
        {
          title: 'Segment Breakdown',
          head: [['Segment', 'Cut (m³)', 'Fill (m³)', 'Net (m³)', 'Cumulative']],
          body: results.segments.map((seg) => [
            `Ch ${seg.startCh}-${seg.endCh}m`,
            seg.cutVolume.toFixed(1),
            seg.fillVolume.toFixed(1),
            seg.netVolume.toFixed(1),
            seg.cumulativeMass.toFixed(1),
          ]),
        },
      ],
      recommendations: recs,
      warnings: warnings.map((w) => w.message),
      footerNote: 'Beaver Bridges Ltd — Cut & Fill Analysis',
    });
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/10 via-transparent to-red-900/10" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-gray-800/40 backdrop-blur-md border border-gray-700/50 mb-4">
            <FiBarChart2 className="text-neon-cyan" />
            <span className="text-gray-300 font-mono tracking-wider">EARTHWORKS | VOLUMES</span>
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan via-white to-neon-purple bg-clip-text text-transparent tracking-tight mb-2">
            Cut & Fill Analysis
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Average End Area method with Mass Haul optimisation and shrinkage adjustment.
          </p>
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
                'px-8 py-3 rounded-2xl font-semibold capitalize bg-gray-800/40 backdrop-blur-md border border-gray-700/50',
                activeTab === tab
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-blue border-neon-cyan/50'
                  : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
            </Button>
          ))}
        </div>

        {/* Status Banner */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card
              variant="glass"
              className={cn(
                'p-4 border-2 overflow-hidden shadow-lg',
                Math.abs(results.netBalance) < 10
                  ? 'border-emerald-500/30 bg-emerald-950/20 shadow-emerald-500/10'
                  : results.netBalance > 0
                    ? 'border-amber-500/30 bg-amber-950/20 shadow-amber-500/10'
                    : 'border-red-500/30 bg-red-950/20 shadow-red-500/10',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      Math.abs(results.netBalance) < 10
                        ? 'bg-emerald-500/20'
                        : results.netBalance > 0
                          ? 'bg-amber-500/20'
                          : 'bg-red-500/20',
                    )}
                  >
                    {Math.abs(results.netBalance) < 10 ? (
                      <FiCheck className="text-emerald-400 text-lg" />
                    ) : (
                      <FiTrendingUp
                        className={cn(
                          'text-lg',
                          results.netBalance > 0 ? 'text-amber-400' : 'text-red-400',
                        )}
                      />
                    )}
                  </div>
                  <div>
                    <div
                      className={cn(
                        'text-sm font-black uppercase tracking-widest',
                        Math.abs(results.netBalance) < 10
                          ? 'text-emerald-400'
                          : results.netBalance > 0
                            ? 'text-amber-400'
                            : 'text-red-400',
                      )}
                    >
                      {Math.abs(results.netBalance) < 10
                        ? 'BALANCED'
                        : results.netBalance > 0
                          ? 'SURPLUS — EXPORT REQUIRED'
                          : 'DEFICIT — IMPORT REQUIRED'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Net Balance: {results.netBalance >= 0 ? '+' : ''}
                      {results.netBalance.toFixed(0)} m³ | Overhaul: {results.overhaul.toFixed(0)}{' '}
                      m³·m
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white font-mono">
                    {Math.abs(results.netBalance).toFixed(0)}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">
                    m³ {results.netBalance >= 0 ? 'surplus' : 'deficit'}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Summary Cards */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
          >
            <Card
              variant="glass"
              className="border-neon-cyan/30 shadow-2xl border-l-4 border-l-red-500 p-4 text-center"
            >
              <div className="text-xs text-red-300 uppercase tracking-widest mb-1">Total Cut</div>
              <div className="text-2xl font-bold text-white font-mono">
                {results.totalCut.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">m³</div>
            </Card>
            <Card
              variant="glass"
              className="border-neon-cyan/30 shadow-2xl border-l-4 border-l-green-500 p-4 text-center"
            >
              <div className="text-xs text-green-300 uppercase tracking-widest mb-1">
                Total Fill
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {results.totalFill.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">m³</div>
            </Card>
            <Card
              variant="glass"
              className="border-neon-cyan/30 shadow-2xl border-l-4 border-l-amber-500 p-4 text-center"
            >
              <div className="text-xs text-yellow-300 uppercase tracking-widest mb-1">
                Adjusted Fill
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {results.adjustedFill.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">
                @ {(settings.shrinkageFactor * 100).toFixed(0)}%
              </div>
            </Card>
            <Card
              variant="glass"
              className={cn(
                'border-neon-cyan/30 shadow-2xl p-4 text-center border-l-4',
                results.netBalance >= 0 ? 'border-l-red-500' : 'border-l-green-500',
              )}
            >
              <div className="text-xs text-gray-300 uppercase tracking-widest mb-1">
                Net Balance
              </div>
              <div
                className={cn(
                  'text-2xl font-bold font-mono',
                  results.netBalance >= 0 ? 'text-red-400' : 'text-green-400',
                )}
              >
                {results.netBalance >= 0 ? '+' : ''}
                {results.netBalance.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">
                {results.netBalance >= 0 ? 'Export' : 'Import'}
              </div>
            </Card>
            <Card
              variant="glass"
              className="border-neon-cyan/30 shadow-2xl border-l-4 border-l-blue-500 p-4 text-center"
            >
              <div className="text-xs text-blue-300 uppercase tracking-widest mb-1">Overhaul</div>
              <div className="text-2xl font-bold text-white font-mono">
                {results.overhaul.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">m³·m</div>
            </Card>
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
                {warning.type === 'error' && <FiAlertTriangle className="w-4 h-4" />}
                {warning.type === 'warning' && <FiTruck className="w-4 h-4" />}
                {warning.type === 'info' && <FiInfo className="w-4 h-4" />}
                {warning.message}
              </div>
            ))}
            {/* Main Grid */}
            <AnimatePresence mode="wait">
              {activeTab === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid lg:grid-cols-12 gap-6"
                >
                  {/* Inputs */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Section Data */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('sections')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiLayers className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Section Data
                          </CardTitle>
                          <span className="text-xs text-gray-500">
                            ({sections.length} sections)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addSection();
                            }}
                            className="bg-blue-600 hover:bg-blue-500 h-7 px-2"
                          >
                            <FiPlus className="w-3 h-3" />
                          </Button>
                          <FiChevronDown
                            className={cn(
                              'text-gray-400 transition-transform',
                              expandedSections.sections && 'rotate-180',
                            )}
                          />
                        </div>
                      </CardHeader>
                      {expandedSections.sections && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="pt-0 max-h-[400px] overflow-y-auto space-y-3">
                            {sections.map((s, idx) => (
                              <div
                                key={s.id}
                                className="grid grid-cols-12 gap-2 items-end bg-gray-800/30 p-3 rounded-xl border border-gray-700/50"
                              >
                                <div className="col-span-1 text-gray-500 font-mono text-xs pt-6">
                                  #{idx + 1}
                                </div>
                                <div className="col-span-3">
                                  <label className="text-sm font-semibold text-gray-200">
                                    Ch (m)
                                  </label>
                                  <input
                                    type="number"
                                    title="Chainage"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-sm font-mono"
                                    value={s.chainage}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        'chainage',
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </div>
                                <div className="col-span-3">
                                  <label className="text-sm font-semibold text-gray-200">
                                    Cut (m²)
                                  </label>
                                  <input
                                    type="number"
                                    title="Cut Area"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-sm font-mono"
                                    value={s.areaCut}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        'areaCut',
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </div>
                                <div className="col-span-3">
                                  <label className="text-sm font-semibold text-gray-200">
                                    Fill (m²)
                                  </label>
                                  <input
                                    type="number"
                                    title="Fill Area"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-sm font-mono"
                                    value={s.areaFill}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        'areaFill',
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-red-500 hover:bg-red-950/30 w-7 h-7"
                                    onClick={() => removeSection(s.id)}
                                    disabled={sections.length <= 2}
                                  >
                                    <FiMinus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Settings */}
                    <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                      <CardHeader
                        className="cursor-pointer flex flex-row items-center justify-between py-3"
                        onClick={() => toggleSection('settings')}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                            <FiSettings className="w-6 h-6 text-neon-cyan" />
                          </div>
                          <CardTitle className="text-xl font-bold text-white">
                            Project Settings
                          </CardTitle>
                        </div>
                        <FiChevronDown
                          className={cn(
                            'text-gray-400 transition-transform',
                            expandedSections.settings && 'rotate-180',
                          )}
                        />
                      </CardHeader>
                      {expandedSections.settings && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="pt-0 space-y-4">
                            <div>
                              <ExplainableLabel label="Soil Type Preset" field="cut-fill-soil" />
                              <select
                                title="Soil Type"
                                value={selectedSoil}
                                onChange={(e) => applySoilPreset(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-sm"
                              >
                                {Object.entries(SOIL_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <ExplainableLabel
                                  label="Shrinkage Factor"
                                  field="cut-fill-shrinkage"
                                />
                                <input
                                  type="number"
                                  title="Shrinkage Factor"
                                  step="0.01"
                                  className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-sm font-mono"
                                  value={settings.shrinkageFactor}
                                  onChange={(e) =>
                                    setSettings({
                                      ...settings,
                                      shrinkageFactor: parseFloat(e.target.value) || 0.9,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <ExplainableLabel label="Swell Factor" field="cut-fill-swell" />
                                <input
                                  type="number"
                                  title="Swell Factor"
                                  step="0.01"
                                  className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-sm font-mono"
                                  value={settings.swellFactor}
                                  onChange={(e) =>
                                    setSettings({
                                      ...settings,
                                      swellFactor: parseFloat(e.target.value) || 1.25,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <ExplainableLabel
                                label="Free Haul Distance (m)"
                                field="cut-fill-haul"
                              />
                              <input
                                type="number"
                                title="Free Haul Distance"
                                className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 text-sm font-mono"
                                value={settings.freeHaulDistance}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    freeHaulDistance: parseFloat(e.target.value) || 100,
                                  })
                                }
                              />
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </Card>

                    {/* Export Button */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={exportPDF}
                        disabled={!results}
                        className="w-full px-16 py-8 bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple rounded-2xl text-white text-2xl font-black uppercase tracking-widest hover:shadow-lg hover:shadow-neon-cyan/25 transition-all"
                      >
                        ⚡ RUN FULL ANALYSIS
                      </Button>
                      <Button
                        onClick={exportDOCX}
                        disabled={!results}
                        className="w-full bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl hover:border-neon-cyan/50 text-gray-300 hover:text-white"
                      >
                        <FiDownload className="mr-2" />
                        DOCX
                      </Button>
                      <SaveRunButton
                        calculatorKey="cut-fill-volumes"
                        inputs={settings as unknown as Record<string, string | number>}
                        results={results}
                        status={
                          ((results as any)?.status ?? undefined) as 'PASS' | 'FAIL' | undefined
                        }
                      />
                    </div>
                  </div>

                  {/* Visualizations */}
                  <div className="lg:col-span-7 space-y-6 sticky top-8">
                    {/* Mass Haul Diagram */}
                    <WhatIfPreview
                      title="Cut Fill Volumes — 3D Preview"
                      sliders={whatIfSliders}
                      form={settings}
                      updateForm={updateForm}
                      status={
                        ((results as any)?.status ?? undefined) as 'PASS' | 'FAIL' | undefined
                      }
                      onMaximize={() => setPreviewMaximized(true)}
                      renderScene={(fsHeight) => (
                        <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                          <CutFillVolumes3D />
                        </Interactive3DDiagram>
                      )}
                    />

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
                            <CutFillVolumes3D />
                          </Interactive3DDiagram>
                          <button
                            onClick={() => setPreviewMaximized(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                            aria-label="Minimize preview"
                          >
                            <FiMinimize2 size={20} />
                          </button>
                          <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                            CUT &amp; FILL VOLUMES — REAL-TIME PREVIEW
                          </div>
                        </div>
                        <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                          <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                            <FiSliders size={14} /> Live Parameters
                          </h3>
                          {[
                            {
                              label: 'Shrinkage Factor',
                              field: 'shrinkageFactor' as keyof ProjectSettings,
                              min: 0.7,
                              max: 1.0,
                              step: 0.01,
                              unit: '',
                            },
                            {
                              label: 'Swell Factor',
                              field: 'swellFactor' as keyof ProjectSettings,
                              min: 1.0,
                              max: 1.6,
                              step: 0.01,
                              unit: '',
                            },
                            {
                              label: 'Free Haul Dist.',
                              field: 'freeHaulDistance' as keyof ProjectSettings,
                              min: 50,
                              max: 500,
                              step: 10,
                              unit: 'm',
                            },
                            {
                              label: 'Bulking Factor',
                              field: 'bulkingFactor' as keyof ProjectSettings,
                              min: 1.0,
                              max: 1.5,
                              step: 0.01,
                              unit: '',
                            },
                            {
                              label: 'Compaction Factor',
                              field: 'compactionFactor' as keyof ProjectSettings,
                              min: 0.8,
                              max: 1.0,
                              step: 0.01,
                              unit: '',
                            },
                          ].map((s) => (
                            <div key={s.field} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-gray-400">{s.label}</span>
                                <span className="text-white">
                                  {settings[s.field]} {s.unit}
                                </span>
                              </div>
                              <input
                                title={s.label}
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={s.step}
                                value={settings[s.field] as number}
                                onChange={(e) => updateForm(s.field, parseFloat(e.target.value))}
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
                              { label: 'Sections', value: `${sections.length}` },
                              { label: 'Shrinkage', value: `${settings.shrinkageFactor}` },
                              { label: 'Swell', value: `${settings.swellFactor}` },
                              { label: 'Free Haul', value: `${settings.freeHaulDistance}m` },
                              { label: 'Bulking', value: `${settings.bulkingFactor}` },
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
                                    label: 'Total Cut',
                                    value: `${results.totalCut.toFixed(0)} m³`,
                                    status: 'PASS' as const,
                                  },
                                  {
                                    label: 'Total Fill',
                                    value: `${results.totalFill.toFixed(0)} m³`,
                                    status: 'PASS' as const,
                                  },
                                  {
                                    label: 'Net Balance',
                                    value: `${results.netBalance.toFixed(0)} m³`,
                                    status:
                                      results.netBalance >= 0
                                        ? ('PASS' as const)
                                        : ('FAIL' as const),
                                  },
                                  {
                                    label: 'Adj. Fill',
                                    value: `${results.adjustedFill.toFixed(0)} m³`,
                                    status: 'PASS' as const,
                                  },
                                  {
                                    label: 'Overhaul',
                                    value: `${results.overhaul.toFixed(0)} m³·m`,
                                    status:
                                      results.overhaul > 0 ? ('FAIL' as const) : ('PASS' as const),
                                  },
                                ].map((check) => (
                                  <div
                                    key={check.label}
                                    className="flex justify-between text-xs py-0.5"
                                  >
                                    <span className="text-gray-500">{check.label}</span>
                                    <span
                                      className={cn(
                                        'font-bold',
                                        check.status === 'FAIL'
                                          ? 'text-red-500'
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

                    {/* Profile Diagram */}
                    <Card
                      variant="glass"
                      className="border-neon-cyan/30 shadow-2xl overflow-hidden"
                    >
                      <div className="bg-gradient-to-b from-gray-900 to-black p-4">
                        <Interactive3DDiagram height="250px" cameraPosition={[6, 4, 6]}>
                          <CutFillVolumes3D />
                        </Interactive3DDiagram>
                      </div>
                    </Card>

                    {/* Segment Breakdown */}
                    {results && results.segments.length > 0 && (
                      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                        <CardHeader
                          className="cursor-pointer flex flex-row items-center justify-between py-3"
                          onClick={() => toggleSection('segments')}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                              <FiActivity className="w-6 h-6 text-neon-cyan" />
                            </div>
                            <CardTitle className="text-xl font-bold text-white">
                              Segment Breakdown
                            </CardTitle>
                          </div>
                          <FiChevronDown
                            className={cn(
                              'text-gray-400 transition-transform',
                              expandedSections.segments && 'rotate-180',
                            )}
                          />
                        </CardHeader>
                        {expandedSections.segments && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            <CardContent className="pt-0">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                                      <th className="text-left py-2 px-2">Segment</th>
                                      <th className="text-right py-2 px-2">Cut (m³)</th>
                                      <th className="text-right py-2 px-2">Fill (m³)</th>
                                      <th className="text-right py-2 px-2">Net (m³)</th>
                                      <th className="text-right py-2 px-2">Cumulative</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {results.segments.map((seg, i) => (
                                      <tr
                                        key={i}
                                        className="border-b border-gray-800/50 hover:bg-gray-900/30"
                                      >
                                        <td className="py-2 px-2 font-mono text-gray-400">
                                          {seg.startCh}-{seg.endCh}m
                                        </td>
                                        <td className="py-2 px-2 text-right font-mono text-red-400">
                                          {seg.cutVolume.toFixed(1)}
                                        </td>
                                        <td className="py-2 px-2 text-right font-mono text-green-400">
                                          {seg.fillVolume.toFixed(1)}
                                        </td>
                                        <td
                                          className={cn(
                                            'py-2 px-2 text-right font-mono',
                                            seg.netVolume >= 0 ? 'text-red-300' : 'text-green-300',
                                          )}
                                        >
                                          {seg.netVolume >= 0 ? '+' : ''}
                                          {seg.netVolume.toFixed(1)}
                                        </td>
                                        <td className="py-2 px-2 text-right font-mono text-blue-400">
                                          {seg.cumulativeMass.toFixed(1)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'results' && results && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiBarChart2 className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Detailed Results</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 border-l-4 border-l-red-500">
                        <div className="text-xs text-gray-500 uppercase">Total Cut</div>
                        <div className="text-xl font-bold text-red-400 font-mono">
                          {results.totalCut.toFixed(1)} m³
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 border-l-4 border-l-green-500">
                        <div className="text-xs text-gray-500 uppercase">Total Fill</div>
                        <div className="text-xl font-bold text-green-400 font-mono">
                          {results.totalFill.toFixed(1)} m³
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 border-l-4 border-l-amber-500">
                        <div className="text-xs text-gray-500 uppercase">Adjusted Fill</div>
                        <div className="text-xl font-bold text-yellow-400 font-mono">
                          {results.adjustedFill.toFixed(1)} m³
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 border-l-4 border-l-neon-cyan">
                        <div className="text-xs text-gray-500 uppercase">Net Balance</div>
                        <div
                          className={cn(
                            'text-xl font-bold font-mono',
                            results.netBalance >= 0 ? 'text-red-400' : 'text-green-400',
                          )}
                        >
                          {results.netBalance >= 0 ? '+' : ''}
                          {results.netBalance.toFixed(1)} m³
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 border-l-4 border-l-neon-cyan">
                        <div className="text-xs text-gray-500 uppercase">Balance Point</div>
                        <div className="text-xl font-bold text-cyan-400 font-mono">
                          {results.balancePoint !== null
                            ? `${results.balancePoint.toFixed(1)} m`
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 border-l-4 border-l-blue-500">
                        <div className="text-xs text-gray-500 uppercase">Overhaul</div>
                        <div className="text-xl font-bold text-blue-400 font-mono">
                          {results.overhaul.toFixed(0)} m³·m
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Recommendations */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                        <FiCheck className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Design Recommendations</h3>
                    </div>
                    <div className="space-y-3">
                      {results.netBalance > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <FiTruck className="text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">Surplus Material</div>
                            <div className="text-xs text-gray-400">
                              {results.netBalance.toFixed(0)} m³ surplus — arrange export or
                              designate stockpile area
                            </div>
                          </div>
                        </div>
                      )}
                      {results.netBalance < 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                          <FiTruck className="text-red-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">Material Deficit</div>
                            <div className="text-xs text-gray-400">
                              {Math.abs(results.netBalance).toFixed(0)} m³ deficit — arrange import
                              from borrow pit
                            </div>
                          </div>
                        </div>
                      )}
                      {results.overhaul > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <FiTrendingUp className="text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">
                              Overhaul Optimisation
                            </div>
                            <div className="text-xs text-gray-400">
                              Overhaul of {results.overhaul.toFixed(0)} m³·m — consider staged
                              construction or haul route optimisation
                            </div>
                          </div>
                        </div>
                      )}
                      {results.balancePoint !== null && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                          <FiTarget className="text-cyan-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-white">Balance Point</div>
                            <div className="text-xs text-gray-400">
                              Material balance at Ch {results.balancePoint.toFixed(1)}m — optimal
                              haul route pivot location
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'visualization' && results && (
                <motion.div
                  key="visualization"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-b from-gray-900 to-black p-4">
                      <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                        <CutFillVolumes3D />
                      </Interactive3DDiagram>
                    </div>
                  </Card>
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-b from-gray-900 to-black p-4">
                      <Interactive3DDiagram height="250px" cameraPosition={[6, 4, 6]}>
                        <CutFillVolumes3D />
                      </Interactive3DDiagram>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CutFillVolumes;
