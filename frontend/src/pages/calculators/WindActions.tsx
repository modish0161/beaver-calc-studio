// =============================================================================
// Wind Actions Calculator — Premium Edition
// EN 1991-1-4 with UK NA — Wind Loading Analysis
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiCheckCircle,
    FiChevronDown,
    FiChevronRight,
    FiDownload,
    FiGrid,
    FiInfo,
    FiLayers,
    FiMapPin,
    FiMinimize2,
    FiSliders,
    FiTarget,
    FiWind,
    FiZap
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { buildWindActionsReport } from '../../lib/pdf/builders/windActionsBuilder';
import { cn } from '../../lib/utils';

import SaveRunButton from '../../components/ui/SaveRunButton';
import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import WindLoad3D from '../../components/3d/scenes/WindLoad3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import WhatIfPreview from '../../components/WhatIfPreview';
import MouseSpotlight from '../../components/MouseSpotlight';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  // Location
  wind_zone: string;
  terrain_category: string;
  orography: string;
  altitude: string;
  distance_sea: string;
  // Structure
  structure_type: string;
  height: string;
  width: string;
  depth: string;
  reference_height: string;
  // Factors
  cseason: string;
  cdir: string;
  cprob: string;
  // Force Coefficients
  cf: string;
  cpe_windward: string;
  cpe_leeward: string;
  cpi: string;
  // Project
  projectName: string;
  reference: string;
}

interface Results {
  // Basic Wind Velocity
  vb_0: number;
  vb: number;
  // Mean Wind Velocity
  cr: number;
  co: number;
  vm: number;
  // Turbulence
  Iv: number;
  kl: number;
  // Peak Velocity Pressure
  qp: number;
  qb: number;
  ce: number;
  // Wind Pressure
  we_windward: number;
  we_leeward: number;
  wi_pos: number;
  wi_neg: number;
  net_pressure: number;
  // Wind Force
  wind_force: number;
  area: number;
  cscd: number;
  // Status
  status: string;
  classification: string;
  classColor: string;
}

// =============================================================================
// REFERENCE DATA — EN 1991-1-4 UK NA
// =============================================================================

const UK_WIND_ZONES: Record<string, { name: string; vb_0: number; description: string }> = {
  zone1: { name: 'Zone 1 (London/SE)', vb_0: 21.8, description: 'Southeast England' },
  zone2: { name: 'Zone 2 (Midlands)', vb_0: 22.7, description: 'Midlands & Eastern' },
  zone3: { name: 'Zone 3 (Wales/SW)', vb_0: 24.3, description: 'Wales & Southwest' },
  zone4: { name: 'Zone 4 (Northern)', vb_0: 25.4, description: 'Northern England' },
  zone5: { name: 'Zone 5 (Scotland)', vb_0: 26.5, description: 'Scotland' },
  zone6: { name: 'Zone 6 (Exposed)', vb_0: 30.0, description: 'Exposed coastal/highland' },
};

const TERRAIN_CATEGORIES: Record<
  string,
  { name: string; z0: number; zmin: number; kr: number; description: string }
> = {
  '0': {
    name: 'Category 0 - Sea/Coastal',
    z0: 0.003,
    zmin: 1,
    kr: 0.156,
    description: 'Open sea, coastal areas exposed to open sea',
  },
  I: {
    name: 'Category I - Lakes/Flat',
    z0: 0.01,
    zmin: 1,
    kr: 0.17,
    description: 'Lakes, flat country with negligible vegetation',
  },
  II: {
    name: 'Category II - Rural',
    z0: 0.05,
    zmin: 2,
    kr: 0.19,
    description: 'Low vegetation, isolated obstacles',
  },
  III: {
    name: 'Category III - Suburban',
    z0: 0.3,
    zmin: 5,
    kr: 0.22,
    description: 'Regular vegetation/buildings up to 15m',
  },
  IV: {
    name: 'Category IV - Urban',
    z0: 1.0,
    zmin: 10,
    kr: 0.24,
    description: 'At least 15% surface covered buildings >15m',
  },
};

const OROGRAPHY_FACTORS: Record<string, { name: string; co: number }> = {
  flat: { name: 'Flat terrain', co: 1.0 },
  hills: { name: 'Hills/Cliffs (H≤0.5L)', co: 1.1 },
  escarpment: { name: 'Escarpments', co: 1.2 },
  ridges: { name: 'Ridges/Peaks', co: 1.3 },
};

const STRUCTURE_TYPES: Record<string, { name: string; cdirDefault: number; cfDefault: number }> = {
  building: { name: 'Building', cdirDefault: 1.0, cfDefault: 1.3 },
  bridge: { name: 'Bridge Deck', cdirDefault: 0.85, cfDefault: 1.8 },
  tower: { name: 'Tower/Mast', cdirDefault: 1.0, cfDefault: 1.5 },
  signage: { name: 'Signage/Hoarding', cdirDefault: 1.0, cfDefault: 1.8 },
  cylinder: { name: 'Cylindrical', cdirDefault: 1.0, cfDefault: 0.8 },
  truss: { name: 'Open Truss', cdirDefault: 1.0, cfDefault: 2.0 },
};

const PRESETS = {
  highway_bridge_deck: {
    name: 'Highway Bridge Deck',
    structure_type: 'bridge',
    wind_zone: 'zone3',
    terrain_category: 'II',
    height: '8',
    width: '12',
    depth: '40',
    orography: 'flat',
    altitude: '50',
    distance_sea: '30',
    reference_height: '8',
    cseason: '1.0',
    cdir: '0.85',
    cprob: '1.0',
    cf: '1.8',
    cpe_windward: '0.8',
    cpe_leeward: '-0.5',
    cpi: '0.2',
  },
  viaduct_deck: {
    name: 'Viaduct Deck (Elevated)',
    structure_type: 'bridge',
    wind_zone: 'zone4',
    terrain_category: 'II',
    height: '25',
    width: '14',
    depth: '60',
    orography: 'flat',
    altitude: '120',
    distance_sea: '50',
    reference_height: '25',
    cseason: '1.0',
    cdir: '0.85',
    cprob: '1.0',
    cf: '1.8',
    cpe_windward: '0.8',
    cpe_leeward: '-0.5',
    cpi: '0.2',
  },
  footbridge_deck: {
    name: 'Footbridge Deck',
    structure_type: 'bridge',
    wind_zone: 'zone2',
    terrain_category: 'III',
    height: '5',
    width: '3',
    depth: '30',
    orography: 'flat',
    altitude: '30',
    distance_sea: '40',
    reference_height: '5',
    cseason: '1.0',
    cdir: '0.85',
    cprob: '1.0',
    cf: '2.0',
    cpe_windward: '0.8',
    cpe_leeward: '-0.5',
    cpi: '0.3',
  },
  rail_bridge_deck: {
    name: 'Rail Bridge Deck',
    structure_type: 'bridge',
    wind_zone: 'zone3',
    terrain_category: 'II',
    height: '10',
    width: '13',
    depth: '50',
    orography: 'flat',
    altitude: '60',
    distance_sea: '25',
    reference_height: '10',
    cseason: '1.0',
    cdir: '0.85',
    cprob: '1.0',
    cf: '1.8',
    cpe_windward: '0.8',
    cpe_leeward: '-0.5',
    cpi: '0.2',
  },
  cable_stayed_pylon: {
    name: 'Cable-Stayed Pylon',
    structure_type: 'tower',
    wind_zone: 'zone5',
    terrain_category: 'I',
    height: '45',
    width: '5',
    depth: '5',
    orography: 'hills',
    altitude: '80',
    distance_sea: '10',
    reference_height: '45',
    cseason: '1.0',
    cdir: '1.0',
    cprob: '1.0',
    cf: '1.5',
    cpe_windward: '0.8',
    cpe_leeward: '-0.6',
    cpi: '0.0',
  },
  open_truss_bridge: {
    name: 'Open Truss Bridge',
    structure_type: 'truss',
    wind_zone: 'zone4',
    terrain_category: 'II',
    height: '12',
    width: '8',
    depth: '45',
    orography: 'flat',
    altitude: '70',
    distance_sea: '20',
    reference_height: '12',
    cseason: '1.0',
    cdir: '1.0',
    cprob: '1.0',
    cf: '2.0',
    cpe_windward: '0.8',
    cpe_leeward: '-0.6',
    cpi: '0.0',
  },
};

const WindActions = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    altitude: '',
    cdir: '',
    cf: '',
    cpe_leeward: '',
    cpe_windward: '',
    cpi: '',
    cprob: '',
    cseason: '',
    depth: '',
    distance_sea: '',
    height: '',
    orography: '',
    projectName: '',
    reference: '',
    reference_height: '',
    structure_type: '',
    terrain_category: '',
    width: '',
    wind_zone: '',
  });
  // What-If sliders
  const whatIfSliders = [
    { key: 'wind_zone', label: 'Wind_zone', min: 0, max: 100, step: 1, unit: '' },
    { key: 'terrain_category', label: 'Terrain_category', min: 0, max: 100, step: 1, unit: '' },
    { key: 'orography', label: 'Orography', min: 0, max: 100, step: 1, unit: '' },
    { key: 'altitude', label: 'Altitude', min: 0, max: 100, step: 1, unit: '' }
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

  const validateInputs = (): boolean => {
    const errors: string[] = [];
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.width);
    const d = parseFloat(formData.depth);
    if (isNaN(h) || h <= 0) errors.push('Structure height must be a positive number');
    if (isNaN(w) || w <= 0) errors.push('Structure width must be a positive number');
    if (isNaN(d) || d <= 0) errors.push('Structure depth must be a positive number');
    if (h > 300) errors.push('Height exceeds 300m — EN 1991-1-4 may not apply');
    if (errors.length > 0) {
      setWarnings(errors);
      return false;
    }
    return true;
  };

  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);
    setTimeout(() => {
      try {
        const newWarnings: string[] = [];

        // Parse inputs
        const zoneKey = formData.wind_zone || 'zone2';
        const zone = UK_WIND_ZONES[zoneKey] || UK_WIND_ZONES.zone2;
        const terrKey = formData.terrain_category || 'II';
        const terr = TERRAIN_CATEGORIES[terrKey] || TERRAIN_CATEGORIES['II'];
        const oroKey = formData.orography || 'flat';
        const oro = OROGRAPHY_FACTORS[oroKey] || OROGRAPHY_FACTORS.flat;
        const structKey = formData.structure_type || 'building';
        const struct = STRUCTURE_TYPES[structKey] || STRUCTURE_TYPES.building;

        const h = parseFloat(formData.height) || 10;
        const w = parseFloat(formData.width) || 10;
        const d = parseFloat(formData.depth) || 10;
        const alt = parseFloat(formData.altitude) || 0;
        const cseason = parseFloat(formData.cseason) || 1.0;
        const cdir = parseFloat(formData.cdir) || struct.cdirDefault;
        const cprob = parseFloat(formData.cprob) || 1.0;
        const cf = parseFloat(formData.cf) || struct.cfDefault;
        const cpe_w = parseFloat(formData.cpe_windward) || 0.8;
        const cpe_l = parseFloat(formData.cpe_leeward) || -0.5;
        const cpi = parseFloat(formData.cpi) || 0.2;

        // EN 1991-1-4 §4.2 Basic wind velocity
        const vb_0 = zone.vb_0;
        const vb = vb_0 * cdir * cseason * cprob;

        // Altitude correction (UK NA)
        const calt = 1 + 0.001 * alt;
        const vb_alt = vb * calt;

        // Reference height
        const z = parseFloat(formData.reference_height) || h;
        const zeff = Math.max(z, terr.zmin);

        // Roughness factor cr(z)
        const cr = terr.kr * Math.log(zeff / terr.z0);

        // Orography factor
        const co = oro.co;

        // Mean wind velocity
        const vm = cr * co * vb_alt;

        // Turbulence intensity
        const kl = 1.0;
        const Iv = kl / (co * Math.log(zeff / terr.z0));

        // Air density
        const rho = 1.226;

        // Basic velocity pressure
        const qb = (0.5 * rho * vb_alt * vb_alt) / 1000; // kN/m²

        // Exposure factor
        const ce = (1 + 7 * Iv) * cr * cr * co * co;

        // Peak velocity pressure
        const qp = ce * qb; // kN/m²

        // External wind pressures
        const we_windward = qp * cpe_w;
        const we_leeward = qp * cpe_l;

        // Internal wind pressures
        const wi_pos = qp * cpi;
        const wi_neg = qp * -cpi;

        // Net pressure (worst case: windward + internal suction)
        const net_pressure = we_windward - wi_neg;

        // Structural factor cscd (simplified)
        const cscd = 1.0;

        // Total wind force
        const area = h * w;
        const wind_force = cscd * cf * qp * area;

        // Classification
        let classification: string;
        let classColor: string;
        if (qp < 0.5) {
          classification = 'LOW';
          classColor = '#22c55e';
        } else if (qp < 1.0) {
          classification = 'MODERATE';
          classColor = '#f59e0b';
        } else if (qp < 1.5) {
          classification = 'HIGH';
          classColor = '#f97316';
        } else {
          classification = 'VERY HIGH';
          classColor = '#ef4444';
        }

        if (h > 50)
          newWarnings.push(
            'Height > 50m — dynamic response procedure may be needed (EN 1991-1-4 §6.3)',
          );
        if (terrKey === '0' || terrKey === 'I')
          newWarnings.push('Exposed terrain — verify orography effects');
        if (alt > 300)
          newWarnings.push('Altitude > 300m — significant altitude correction applied');

        setResults({
          vb_0,
          vb: vb_alt,
          cr,
          co,
          vm,
          Iv,
          kl,
          qp,
          qb,
          ce,
          we_windward,
          we_leeward,
          wi_pos,
          wi_neg,
          net_pressure,
          wind_force,
          area,
          cscd,
          status: 'PASS',
          classification,
          classColor,
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
    const report = buildWindActionsReport(formData as any, results as any);
    generatePremiumPDF(report);
  }, [formData, results]);

  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Wind Actions Analysis',
      subtitle: 'EN 1991-1-4 (Eurocode 1 Part 1-4)',
      projectInfo: [
        { label: 'Project', value: formData.projectName || 'Wind Loading' },
        { label: 'Reference', value: formData.reference || '-' },
        { label: 'Standard', value: 'EN 1991-1-4:2005' },
      ],
      inputs: [
        { label: 'Wind Zone', value: formData.wind_zone },
        { label: 'Terrain Category', value: formData.terrain_category },
        { label: 'Height', value: formData.height, unit: 'm' },
        { label: 'Width', value: formData.width, unit: 'm' },
        { label: 'Depth', value: formData.depth, unit: 'm' },
        { label: 'Altitude', value: formData.altitude, unit: 'm' },
      ],
      sections: [
        {
          title: 'Wind Load Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Basic Wind Velocity', results.vb_0?.toFixed(1) || '-', 'm/s'],
            ['Peak Velocity Pressure', results.qp?.toFixed(2) || '-', 'kN/m\u00b2'],
            ['Wind Force X', ((results as any).Fw_x ?? 0).toFixed(1), 'kN'],
            ['Wind Force Y', ((results as any).Fw_y ?? 0).toFixed(1), 'kN'],
            ['Overturning Moment', ((results as any).M_overturn ?? 0).toFixed(1), 'kNm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Wind Load Applied',
          capacity: 'Calculated',
          utilisation: `qp = ${results.qp?.toFixed(2) || '-'} kN/m\u00b2`,
          status: 'PASS' as 'PASS' | 'FAIL',
        },
      ],
      footerNote: 'Beaver Bridges Ltd \u2014 Wind Actions Analysis',
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
      <div className="flex items-center justify-between mb-2">
        <ExplainableLabel label={label} field={field} className="block text-sm font-semibold text-gray-300" />
        {unit && <span className="text-blue-400 text-xs">{unit}</span>}
      </div>
      <input
        type="number"
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
      <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
        <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection(sectionId)}>
          <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
            {icon}
            <span>{title}</span>
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

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
            <div className="flex items-center gap-2">
              {results && (
                <Button
                  onClick={handleExportPDF}
                  className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </Button>
              )}
              {results && (
                <Button
                  onClick={handleExportDOCX}
                  className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <FiDownload className="mr-2" />
                  DOCX
                </Button>
              )}
              {results && (
                <SaveRunButton calculatorKey="wind-actions" inputs={formData as unknown as Record<string, string | number>} results={results} />
              )}
            </div>

            {/* View Tabs */}
            <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
              {[
                { id: 'input', label: 'Inputs', icon: <FiGrid /> },
                { id: 'results', label: 'Analysis', icon: <FiActivity />, disabled: !results },
                { id: 'visualization', label: 'Visualization', icon: <FiTarget />, disabled: !results },
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
              Wind Actions
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            EN 1991-1-4 wind loading analysis
          </p>
        </motion.div>

        {activeTab === 'input' && (
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Input Content */}
          <div className="lg:col-span-2 space-y-6">
                {/* Presets */}
                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiZap className="w-6 h-6 text-blue-400" />
                      </div>
                      <span>Quick Presets</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <Button
                          key={key}
                          variant="glass"
                          size="sm"
                          onClick={() => applyPreset(key)}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <CollapsibleSection
                  title="Location & Terrain"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiMapPin className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="blue"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">UK Wind Zone</label>
                      <select
                        title="UK Wind Zone"
                        value={formData.wind_zone}
                        onChange={(e) => updateForm('wind_zone', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(UK_WIND_ZONES).map(([key, z]) => (
                          <option key={key} value={key}>
                            {z.name} (vb,0={z.vb_0} m/s)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Terrain Category</label>
                      <select
                        title="Terrain Category"
                        value={formData.terrain_category}
                        onChange={(e) => updateForm('terrain_category', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(TERRAIN_CATEGORIES).map(([key, tc]) => (
                          <option key={key} value={key}>
                            {tc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Orography</label>
                      <select
                        title="Orography"
                        value={formData.orography}
                        onChange={(e) => updateForm('orography', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(OROGRAPHY_FACTORS).map(([key, of]) => (
                          <option key={key} value={key}>
                            {of.name} (co={of.co})
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Altitude" field="altitude" unit="m" />
                    <InputField label="Distance to Sea" field="distance_sea" unit="km" />
                  </div>
                </CollapsibleSection>

                {/* Structure */}
                <CollapsibleSection
                  title="Structure Geometry"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiGrid className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="emerald"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Structure Type</label>
                      <select
                        title="Structure Type"
                        value={formData.structure_type}
                        onChange={(e) => updateForm('structure_type', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(STRUCTURE_TYPES).map(([key, st]) => (
                          <option key={key} value={key}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <InputField label="Height" field="height" unit="m" />
                    <InputField label="Width (perpendicular to wind)" field="width" unit="m" />
                    <InputField label="Depth (parallel to wind)" field="depth" unit="m" />
                    <InputField
                      label="Reference Height z"
                      field="reference_height"
                      unit="m"
                      tooltip="Usually building height"
                    />
                  </div>
                </CollapsibleSection>

                {/* Factors */}
                <CollapsibleSection
                  title="Modification Factors"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiTarget className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="purple"
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                    <InputField
                      label="c_season"
                      field="cseason"
                      tooltip="Seasonal factor (usually 1.0)"
                    />
                    <InputField label="c_dir" field="cdir" tooltip="Directional factor" />
                    <InputField
                      label="c_prob"
                      field="cprob"
                      tooltip="Probability factor (return period)"
                    />
                    <InputField
                      label="c_f (force coeff)"
                      field="cf"
                      tooltip="Force coefficient for structure"
                    />
                  </div>
                </CollapsibleSection>

                {/* Pressure Coefficients */}
                <CollapsibleSection
                  title="Pressure Coefficients"
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <FiLayers className="w-6 h-6 text-blue-400" />
                    </div>
                  }
                  variant="amber"
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField
                      label="cpe (windward)"
                      field="cpe_windward"
                      tooltip="External pressure coefficient - windward"
                    />
                    <InputField
                      label="cpe (leeward)"
                      field="cpe_leeward"
                      tooltip="External pressure coefficient - leeward (negative)"
                    />
                    <InputField
                      label="cpi (internal)"
                      field="cpi"
                      tooltip="Internal pressure coefficient"
                    />
                  </div>
                  <div className="mt-3 p-3 bg-gray-900/50 rounded-xl text-sm text-gray-400">
                    <strong>Typical values:</strong> Windward +0.8, Leeward -0.5, Internal ±0.2
                    (openings controlled)
                  </div>
                </CollapsibleSection>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={() => {
                      runCalculation();
                      setActiveTab('results');
                    }}
                    disabled={isCalculating}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isCalculating ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ANALYSING...
                      </div>
                    ) : (
                      '▶ RUN FULL ANALYSIS'
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Right Column — Sticky Sidebar */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="sticky top-8 space-y-4"
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
                      <Interactive3DDiagram height="h-full" cameraPosition={[8, 6, 8]}>
                        <WindLoad3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        WIND ACTIONS — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        { label: 'Altitude', field: 'altitude' as keyof FormData, min: 0, max: 500, step: 5, unit: 'm' },
                        { label: 'Height', field: 'height' as keyof FormData, min: 1, max: 100, step: 1, unit: 'm' },
                        { label: 'Width', field: 'width' as keyof FormData, min: 1, max: 100, step: 1, unit: 'm' },
                        { label: 'Depth', field: 'depth' as keyof FormData, min: 1, max: 100, step: 1, unit: 'm' },
                        { label: 'Ref Height', field: 'reference_height' as keyof FormData, min: 1, max: 100, step: 1, unit: 'm' },
                        { label: 'Force Coeff', field: 'cf' as keyof FormData, min: 0.5, max: 3.0, step: 0.1, unit: '' },
                        { label: 'Cpe Windward', field: 'cpe_windward' as keyof FormData, min: -1.5, max: 1.5, step: 0.1, unit: '' },
                        { label: 'Cpe Leeward', field: 'cpe_leeward' as keyof FormData, min: -1.5, max: 0, step: 0.1, unit: '' },
                      ].map((s) => (
                        <div key={s.field} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">{formData[s.field]} {s.unit}</span>
                          </div>
                          <input
                            title={s.label}
                            type="range"
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            value={formData[s.field] as string}
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
                          { label: 'Wind Zone', value: formData.wind_zone || '—' },
                          { label: 'Terrain', value: formData.terrain_category || '—' },
                          { label: 'Structure', value: formData.structure_type || '—' },
                          { label: 'Building HxWxD', value: `${formData.height || 0} × ${formData.width || 0} × ${formData.depth || 0} m` },
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
                              { label: 'vb', value: `${results.vb.toFixed(1)} m/s` },
                              { label: 'qp', value: `${results.qp.toFixed(1)} Pa` },
                              { label: 'We (windward)', value: `${results.we_windward.toFixed(1)} Pa` },
                              { label: 'We (leeward)', value: `${results.we_leeward.toFixed(1)} Pa` },
                              { label: 'Net Pressure', value: `${results.net_pressure.toFixed(1)} Pa` },
                              { label: 'Wind Force', value: `${results.wind_force.toFixed(1)} kN` },
                            ].map((check) => (
                              <div key={check.label} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{check.label}</span>
                                <span className={cn('font-bold', results.status === 'FAIL' ? 'text-red-500' : 'text-emerald-400')}>
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

                <WhatIfPreview
                  title="Wind Actions — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  onMaximize={() => setPreviewMaximized(true)}
                  status={(results?.status ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <WindLoad3D />
                    </Interactive3DDiagram>
                  )}
                />

                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                      <FiWind className="text-blue-400" />
                      Zone Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      <strong>Selected:</strong> {UK_WIND_ZONES[formData.wind_zone]?.name}
                    </p>
                    <p>
                      <strong>vb,0:</strong> {UK_WIND_ZONES[formData.wind_zone]?.vb_0} m/s
                    </p>
                    <p>
                      <strong>Description:</strong> {UK_WIND_ZONES[formData.wind_zone]?.description}
                    </p>
                    <hr className="border-gray-700 my-2" />
                    <p>
                      <strong>Terrain:</strong>{' '}
                      {TERRAIN_CATEGORIES[formData.terrain_category]?.name}
                    </p>
                    <p>{TERRAIN_CATEGORIES[formData.terrain_category]?.description}</p>
                  </CardContent>
                </Card>

                <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                      <FiInfo className="text-blue-400" />
                      Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      • <strong>EN 1991-1-4:</strong> Wind actions
                    </p>
                    <p>
                      • <strong>UK NA:</strong> Wind zones & terrain
                    </p>
                    <p>
                      • <strong>Table NA.1:</strong> Fundamental wind velocity
                    </p>
                    <p>
                      • <strong>Clause 4.5:</strong> Peak velocity pressure
                    </p>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
            </div>
        )}
        {activeTab === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {results && (
              <div className="space-y-8">
                {/* Top Results Summary — border-l-4 check cards */}
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Wind Velocity', value: `${results.vb.toFixed(1)} m/s`, icon: <FiWind />, status: 'PASS' },
                    { label: 'Peak Pressure', value: `${results.qp.toFixed(2)} kN/m²`, icon: <FiActivity />, status: results.classification === 'VERY HIGH' ? 'WARN' : 'PASS' },
                    { label: 'Roughness', value: results.cr.toFixed(3), icon: <FiLayers />, status: 'PASS' },
                    { label: 'Turbulence', value: results.Iv.toFixed(3), icon: <FiTarget />, status: 'PASS' },
                    { label: 'Net Pressure', value: `${(results.net_pressure / 1000).toFixed(2)} kN/m²`, icon: <FiGrid />, status: 'PASS' },
                    { label: 'Wind Force', value: `${results.wind_force.toFixed(1)} kN`, icon: <FiZap />, status: 'PASS' },
                  ].map((item, i) => (
                    <Card
                      key={i}
                      variant="glass"
                      className={cn(
                        'border-l-4',
                        item.status === 'PASS' ? 'border-l-green-500' : 'border-l-amber-500',
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">{item.icon}</div>
                          <span
                            className={cn(
                              'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                              item.status === 'PASS'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-amber-500/20 text-amber-400',
                            )}
                          >
                            {item.status === 'WARN' ? results.classification : 'OK'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                        <p className="text-xl font-black text-white">{item.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Wind Velocity */}
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiWind className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Basic Wind Velocity</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            v<sub>b,0</sub> (fundamental)
                          </div>
                          <div className="text-xl font-bold text-white">
                            {results.vb_0.toFixed(1)} m/s
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            v<sub>b</sub> (basic)
                          </div>
                          <div className="text-xl font-bold text-blue-400">
                            {results.vb.toFixed(1)} m/s
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            c<sub>r</sub> (roughness)
                          </div>
                          <div className="text-xl font-bold text-white">
                            {results.cr.toFixed(3)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            v<sub>m</sub> (mean)
                          </div>
                          <div className="text-xl font-bold text-white">
                            {results.vm.toFixed(1)} m/s
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Peak Velocity Pressure */}
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiActivity className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Peak Velocity Pressure</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            q<sub>b</sub> (basic)
                          </div>
                          <div className="text-lg font-bold text-white">
                            {results.qb.toFixed(0)} Pa
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            c<sub>e</sub> (exposure)
                          </div>
                          <div className="text-lg font-bold text-white">
                            {results.ce.toFixed(2)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            I<sub>v</sub> (turbulence)
                          </div>
                          <div className="text-lg font-bold text-white">
                            {results.Iv.toFixed(3)}
                          </div>
                        </div>
                        <div
                          className="p-3 bg-gray-950/50 rounded-lg text-center border-2"
                          style={{ borderColor: results.classColor }}
                        >
                          <div className="text-gray-400 text-xs">
                            q<sub>p</sub> (peak)
                          </div>
                          <div className="text-xl font-bold" style={{ color: results.classColor }}>
                            {results.qp.toFixed(0)} Pa
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Wind Pressure */}
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiLayers className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Wind Pressure</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            w<sub>e</sub> (windward)
                          </div>
                          <div className="text-lg font-bold text-blue-400">
                            +{results.we_windward.toFixed(0)} Pa
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            w<sub>e</sub> (leeward)
                          </div>
                          <div className="text-lg font-bold text-cyan-400">
                            {results.we_leeward.toFixed(0)} Pa
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">Net Pressure</div>
                          <div className="text-xl font-bold text-amber-400">
                            {results.net_pressure.toFixed(0)} Pa
                          </div>
                          <div className="text-xs text-gray-500">
                            {(results.net_pressure / 1000).toFixed(2)} kN/m²
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Wind Force */}
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiZap className="w-6 h-6 text-blue-400" />
                        </div>
                        <span>Total Wind Force</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">Reference Area</div>
                          <div className="text-lg font-bold text-white">
                            {results.area.toFixed(0)} m²
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center">
                          <div className="text-gray-400 text-xs">
                            c<sub>s</sub>c<sub>d</sub> (structural)
                          </div>
                          <div className="text-lg font-bold text-white">
                            {results.cscd.toFixed(2)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-950/50 rounded-lg text-center border-2 border-blue-500">
                          <div className="text-gray-400 text-xs">
                            Wind Force F<sub>w</sub>
                          </div>
                          <div className="text-2xl font-bold text-blue-400">
                            {results.wind_force.toFixed(1)} kN
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column — Sticky */}
                <div className="lg:col-span-1">
                  <div className="sticky top-8 space-y-4">
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50 border-l-4 border-l-blue-400">
                    <CardContent className="py-6 text-center">
                      <div className="text-4xl mb-2 text-blue-400">
                        <FiWind className="inline" />
                      </div>
                      <div className="font-bold text-lg" style={{ color: results.classColor }}>
                        {results.classification}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        Peak Pressure: {results.qp.toFixed(0)} Pa
                      </div>
                      <div className="text-gray-400 text-sm">
                        ({(results.qp / 1000).toFixed(2)} kN/m²)
                      </div>
                    </CardContent>
                  </Card>

                  {warnings.length > 0 && (
                    <Card className="bg-amber-500/10 border-amber-500/30">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                          <FiAlertTriangle />
                          <span className="font-medium">Design Notes</span>
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
                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FiCheckCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        Design Recommendations
                      </h3>
                      <div className="space-y-3">
                        {[
                          'Verify orography factor for sites near hills, cliffs or escarpments per NA.2.4',
                          'Consider directional factor c_dir if dominant wind direction is known from met data',
                          'Check for vortex shedding and aeroelastic effects on slender structures (h/b > 4)',
                          'Apply appropriate internal pressure coefficients for enclosed vs dominant opening cases',
                        ].map((rec, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <FiCheck className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white font-semibold">Design Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wind Zone</span>
                        <span className="text-white">
                          {UK_WIND_ZONES[formData.wind_zone]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Terrain</span>
                        <span className="text-white">{formData.terrain_category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Structure</span>
                        <span className="text-white">
                          {STRUCTURE_TYPES[formData.structure_type]?.name}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-700">
                        <span className="text-gray-400">
                          v<sub>b</sub>
                        </span>
                        <span className="text-white">{results.vb.toFixed(1)} m/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">
                          q<sub>p</sub>
                        </span>
                        <span className="text-white">{results.qp.toFixed(0)} Pa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">
                          F<sub>w</sub>
                        </span>
                        <span className="text-white">{results.wind_force.toFixed(1)} kN</span>
                      </div>
                    </CardContent>
                  </Card>
                  </div>{/* end sticky */}
                </div>
              </div>
              </div>
            )}
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
            <Card variant="glass" className="bg-gray-900/40 backdrop-blur-md border border-gray-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-white font-semibold flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <FiTarget className="w-6 h-6 text-blue-400" />
                  </div>
                  <span>Wind Pressure Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Interactive3DDiagram height="500px" cameraPosition={[8, 6, 8]}>
                  <WindLoad3D />
                </Interactive3DDiagram>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      </div>
  );
};

export default WindActions;
