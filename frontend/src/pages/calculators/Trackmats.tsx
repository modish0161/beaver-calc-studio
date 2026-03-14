import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMinimize2,
  FiSliders,
  FiTruck,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import type { ReportData } from '../../lib/pdf/types';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import TrackMat3D from '../../components/3d/scenes/TrackMat3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TRACKMAT MATERIAL DATABASE - BS 5975 / EN 1993 / Manufacturer Data
// ═══════════════════════════════════════════════════════════════════════════════
const MAT_MATERIALS: Record<
  string,
  {
    name: string;
    type: 'composite' | 'aluminium' | 'steel' | 'timber';
    density: number; // kg/m³
    bendingStrength: number; // N/mm² (design)
    shearStrength: number; // N/mm²
    modulus: number; // N/mm² (E)
    description: string;
    icon: string;
    color: string;
  }
> = {
  hdpe_standard: {
    name: 'HDPE Composite (Standard)',
    type: 'composite',
    density: 950,
    bendingStrength: 28,
    shearStrength: 10,
    modulus: 12000,
    description: 'Standard duty HDPE matting',
    icon: '🔷',
    color: '#3b82f6',
  },
  hdpe_heavy: {
    name: 'HDPE Composite (Heavy)',
    type: 'composite',
    density: 980,
    bendingStrength: 35,
    shearStrength: 14,
    modulus: 15000,
    description: 'Heavy duty reinforced HDPE',
    icon: '🔷',
    color: '#1d4ed8',
  },
  hdpe_ultra: {
    name: 'HDPE Ultra (EuroMat)',
    type: 'composite',
    density: 1000,
    bendingStrength: 42,
    shearStrength: 16,
    modulus: 18000,
    description: 'Ultra-heavy duty composite',
    icon: '💎',
    color: '#0ea5e9',
  },
  aluminium_std: {
    name: 'Aluminium Trackway',
    type: 'aluminium',
    density: 2700,
    bendingStrength: 85,
    shearStrength: 35,
    modulus: 70000,
    description: 'Lightweight aluminium panels',
    icon: '⬜',
    color: '#94a3b8',
  },
  aluminium_heavy: {
    name: 'Aluminium (HD)',
    type: 'aluminium',
    density: 2700,
    bendingStrength: 110,
    shearStrength: 45,
    modulus: 70000,
    description: 'Heavy duty aluminium',
    icon: '⬜',
    color: '#64748b',
  },
  steel_s275: {
    name: 'Steel S275',
    type: 'steel',
    density: 7850,
    bendingStrength: 165,
    shearStrength: 95,
    modulus: 210000,
    description: 'Steel plate matting S275',
    icon: '⚙️',
    color: '#6b7280',
  },
  steel_s355: {
    name: 'Steel S355',
    type: 'steel',
    density: 7850,
    bendingStrength: 215,
    shearStrength: 125,
    modulus: 210000,
    description: 'High strength steel S355',
    icon: '⚙️',
    color: '#4b5563',
  },
  timber_c24: {
    name: 'Timber C24',
    type: 'timber',
    density: 420,
    bendingStrength: 24,
    shearStrength: 4.0,
    modulus: 11000,
    description: 'Structural softwood C24',
    icon: '🌲',
    color: '#a3e635',
  },
  timber_d40: {
    name: 'Timber D40',
    type: 'timber',
    density: 700,
    bendingStrength: 40,
    shearStrength: 4.0,
    modulus: 13000,
    description: 'Hardwood D40 grade',
    icon: '🌳',
    color: '#84cc16',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD TRACKMAT SIZES - Commercial Products
// ═══════════════════════════════════════════════════════════════════════════════
const TRACKMAT_SIZES: Array<{
  name: string;
  length: number; // mm
  width: number; // mm
  thickness: number; // mm
  weight: number; // kg (approx)
  material: string;
  loadCapacity: string;
}> = [
  {
    name: 'DURA-MAT 3x1',
    length: 3000,
    width: 1000,
    thickness: 12,
    weight: 35,
    material: 'hdpe_standard',
    loadCapacity: '40t axle',
  },
  {
    name: 'DURA-MAT 4x1',
    length: 4000,
    width: 1000,
    thickness: 12,
    weight: 47,
    material: 'hdpe_standard',
    loadCapacity: '40t axle',
  },
  {
    name: 'EuroMat 2.4x1.2',
    length: 2400,
    width: 1200,
    thickness: 15,
    weight: 45,
    material: 'hdpe_heavy',
    loadCapacity: '60t axle',
  },
  {
    name: 'EuroMat 3x1.5',
    length: 3000,
    width: 1500,
    thickness: 18,
    weight: 85,
    material: 'hdpe_ultra',
    loadCapacity: '80t axle',
  },
  {
    name: 'AluTrack 3x1',
    length: 3000,
    width: 1000,
    thickness: 40,
    weight: 110,
    material: 'aluminium_std',
    loadCapacity: '60t axle',
  },
  {
    name: 'SteelMat 3x1.5',
    length: 3000,
    width: 1500,
    thickness: 8,
    weight: 280,
    material: 'steel_s275',
    loadCapacity: '100t axle',
  },
  {
    name: 'Timber Mat 4.8x1.2',
    length: 4800,
    width: 1200,
    thickness: 150,
    weight: 360,
    material: 'timber_c24',
    loadCapacity: '30t axle',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE DATABASE - Typical Site Plant Wheel/Track Loads
// ═══════════════════════════════════════════════════════════════════════════════
const VEHICLE_DATABASE: Record<
  string,
  {
    name: string;
    axleLoad: number; // kN (max axle load)
    wheelLoad: number; // kN (per wheel)
    contactArea: number; // m² (per wheel/track)
    groundPressure: number; // kN/m² (typical)
    category: string;
  }
> = {
  car: {
    name: 'Car / Light Van',
    axleLoad: 20,
    wheelLoad: 10,
    contactArea: 0.04,
    groundPressure: 250,
    category: 'Light',
  },
  lwb_van: {
    name: 'LWB Van (3.5t)',
    axleLoad: 35,
    wheelLoad: 17.5,
    contactArea: 0.06,
    groundPressure: 290,
    category: 'Light',
  },
  pickup_4x4: {
    name: 'Pickup / 4x4',
    axleLoad: 30,
    wheelLoad: 15,
    contactArea: 0.05,
    groundPressure: 300,
    category: 'Light',
  },
  rigid_7_5t: {
    name: 'Rigid HGV (7.5t)',
    axleLoad: 75,
    wheelLoad: 37.5,
    contactArea: 0.08,
    groundPressure: 470,
    category: 'HGV',
  },
  rigid_18t: {
    name: 'Rigid HGV (18t)',
    axleLoad: 105,
    wheelLoad: 52.5,
    contactArea: 0.1,
    groundPressure: 525,
    category: 'HGV',
  },
  artic_44t: {
    name: 'Articulated (44t)',
    axleLoad: 115,
    wheelLoad: 57.5,
    contactArea: 0.12,
    groundPressure: 480,
    category: 'HGV',
  },
  tipper_32t: {
    name: 'Tipper (32t Loaded)',
    axleLoad: 130,
    wheelLoad: 65,
    contactArea: 0.11,
    groundPressure: 590,
    category: 'HGV',
  },
  excavator_8t: {
    name: 'Excavator (8t)',
    axleLoad: 80,
    wheelLoad: 40,
    contactArea: 0.35,
    groundPressure: 114,
    category: 'Plant',
  },
  excavator_13t: {
    name: 'Excavator (13t)',
    axleLoad: 130,
    wheelLoad: 65,
    contactArea: 0.5,
    groundPressure: 130,
    category: 'Plant',
  },
  excavator_20t: {
    name: 'Excavator (20t)',
    axleLoad: 200,
    wheelLoad: 100,
    contactArea: 0.7,
    groundPressure: 143,
    category: 'Plant',
  },
  excavator_30t: {
    name: 'Excavator (30t)',
    axleLoad: 300,
    wheelLoad: 150,
    contactArea: 0.9,
    groundPressure: 167,
    category: 'Plant',
  },
  telehandler: {
    name: 'Telehandler (4t)',
    axleLoad: 80,
    wheelLoad: 40,
    contactArea: 0.15,
    groundPressure: 267,
    category: 'Plant',
  },
  crane_30t: {
    name: 'Mobile Crane (30t)',
    axleLoad: 160,
    wheelLoad: 80,
    contactArea: 0.2,
    groundPressure: 400,
    category: 'Crane',
  },
  crane_50t: {
    name: 'Mobile Crane (50t)',
    axleLoad: 200,
    wheelLoad: 100,
    contactArea: 0.25,
    groundPressure: 400,
    category: 'Crane',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GROUND CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════════
const GROUND_CONDITIONS: Record<
  string,
  {
    name: string;
    bearingCapacity: number; // kN/m² (typical allowable)
    cbr: number; // CBR %
    description: string;
  }
> = {
  soft_clay: { name: 'Soft Clay', bearingCapacity: 50, cbr: 2, description: 'Cu < 25 kPa' },
  firm_clay: { name: 'Firm Clay', bearingCapacity: 100, cbr: 4, description: 'Cu 25-50 kPa' },
  stiff_clay: { name: 'Stiff Clay', bearingCapacity: 200, cbr: 6, description: 'Cu 50-100 kPa' },
  loose_sand: { name: 'Loose Sand', bearingCapacity: 100, cbr: 5, description: 'N < 10' },
  dense_sand: { name: 'Dense Sand', bearingCapacity: 300, cbr: 15, description: 'N 30-50' },
  gravel: { name: 'Gravel', bearingCapacity: 400, cbr: 20, description: 'Well graded' },
  made_ground: { name: 'Made Ground', bearingCapacity: 75, cbr: 3, description: 'Variable fill' },
  topsoil: { name: 'Topsoil', bearingCapacity: 40, cbr: 2, description: 'Organic layer' },
  peat: { name: 'Peat', bearingCapacity: 25, cbr: 1, description: 'Highly compressible' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════════════════════
const PRESETS: Record<
  string,
  {
    name: string;
    description: string;
    matMaterial: string;
    matLength: number;
    matWidth: number;
    matThickness: number;
    numberOfMats: number;
    spanLength: number;
    vehicle: string;
    groundType: string;
    safetyFactor: number;
  }
> = {
  site_access: {
    name: 'Site Access Road',
    description: 'Standard access for HGV deliveries',
    matMaterial: 'hdpe_heavy',
    matLength: 3000,
    matWidth: 1000,
    matThickness: 15,
    numberOfMats: 20,
    spanLength: 500,
    vehicle: 'artic_44t',
    groundType: 'firm_clay',
    safetyFactor: 1.5,
  },
  crane_pad: {
    name: 'Crane Hardstanding',
    description: 'Mobile crane setup area',
    matMaterial: 'steel_s275',
    matLength: 3000,
    matWidth: 1500,
    matThickness: 10,
    numberOfMats: 12,
    spanLength: 300,
    vehicle: 'crane_50t',
    groundType: 'firm_clay',
    safetyFactor: 2.0,
  },
  excavator_track: {
    name: 'Excavator Tracking',
    description: 'Access for tracked plant',
    matMaterial: 'hdpe_standard',
    matLength: 3000,
    matWidth: 1000,
    matThickness: 12,
    numberOfMats: 30,
    spanLength: 400,
    vehicle: 'excavator_20t',
    groundType: 'soft_clay',
    safetyFactor: 1.5,
  },
  event_access: {
    name: 'Event Ground Protection',
    description: 'Temporary access for events',
    matMaterial: 'aluminium_std',
    matLength: 3000,
    matWidth: 1000,
    matThickness: 40,
    numberOfMats: 50,
    spanLength: 300,
    vehicle: 'rigid_7_5t',
    groundType: 'topsoil',
    safetyFactor: 1.5,
  },
};

interface FormData {
  matMaterial: string;
  matLength: number;
  matWidth: number;
  matThickness: number;
  numberOfMats: number;
  spanLength: number;
  vehicle: string;
  customWheelLoad: number;
  customContactArea: number;
  useCustomVehicle: boolean;
  groundType: string;
  customBearing: number;
  useCustomBearing: boolean;
  platformThickness: number;
  safetyFactor: number;
  loadType: 'point' | 'distributed';
}

interface Results {
  overallStatus: 'PASS' | 'FAIL';
  warnings: string[];
  matProperties: {
    singleMatArea: number;
    totalMatArea: number;
    singleMatWeight: number;
    totalMatWeight: number;
    materialName: string;
  };
  loadAnalysis: {
    appliedLoad: number;
    contactPressure: number;
    distributedPressure: number;
    pressureReduction: number;
  };
  bendingCheck: {
    moment: number;
    stress: number;
    allowable: number;
    utilisation: number;
    status: 'PASS' | 'FAIL';
  };
  shearCheck: {
    force: number;
    stress: number;
    allowable: number;
    utilisation: number;
    status: 'PASS' | 'FAIL';
  };
  deflectionCheck: {
    actual: number;
    limit: number;
    spanRatio: number;
    utilisation: number;
    status: 'PASS' | 'FAIL';
  };
  bearingCheck: {
    appliedPressure: number;
    allowableBearing: number;
    utilisation: number;
    status: 'PASS' | 'FAIL';
  };
  punchingCheck: {
    punchingStress: number;
    allowablePunching: number;
    utilisation: number;
    status: 'PASS' | 'FAIL';
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  status,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  status?: 'PASS' | 'FAIL' | null;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card
      variant="glass"
      className={cn(
        'border transition-all duration-300 shadow-2xl',
        status === 'PASS' && 'border-green-500/30',
        status === 'FAIL' && 'border-red-500/30',
        !status && 'border-neon-cyan/30',
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-t-xl"
      >
        <div className="flex items-center space-x-3">
          {icon}
          <span className="text-white font-semibold text-lg">{title}</span>
          {status && (
            <span
              className={cn(
                'px-2 py-1 rounded text-xs font-bold',
                status === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
              )}
            >
              {status}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronDown className="text-gray-400" size={20} />
        </motion.div>
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <CardContent className="pt-0">{children}</CardContent>
        </motion.div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Trackmats: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    matMaterial: 'hdpe_heavy',
    matLength: 3000,
    matWidth: 1000,
    matThickness: 15,
    numberOfMats: 20,
    spanLength: 500,
    vehicle: 'artic_44t',
    customWheelLoad: 60,
    customContactArea: 0.12,
    useCustomVehicle: false,
    groundType: 'firm_clay',
    customBearing: 100,
    useCustomBearing: false,
    platformThickness: 300,
    safetyFactor: 1.5,
    loadType: 'point',
  });

  // What-If sliders
  const whatIfSliders = [
    { key: 'matMaterial', label: 'Mat Material', min: 0, max: 100, step: 1, unit: '' },
    { key: 'vehicle', label: 'Vehicle', min: 0, max: 100, step: 1, unit: '' },
    { key: 'groundType', label: 'Ground Type', min: 0, max: 100, step: 1, unit: '' },
  ];

  // What-If helper
  const updateForm = (field: keyof FormData, value: string | boolean | number) => {
    setFormData((prev: FormData) => ({ ...prev, [field]: value }));
  };

  const [results, setResults] = useState<Results | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'visualization'>('input');
  const [previewMaximized, setPreviewMaximized] = useState(false);

  const validateInputs = (): boolean => {
    const errors = validateNumericInputs(formData as unknown as Record<string, unknown>, [
      { key: 'matLength', label: 'Mat Length' },
      { key: 'matWidth', label: 'Mat Width' },
      { key: 'matThickness', label: 'Mat Thickness' },
      { key: 'numberOfMats', label: 'Number of Mats' },
      { key: 'spanLength', label: 'Span Length' },
      { key: 'platformThickness', label: 'Platform Thickness' },
      { key: 'safetyFactor', label: 'Safety Factor' },
    ]);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return false;
    }
    return true;
  };

  const handleInputChange = (key: keyof FormData, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [key]:
        typeof value === 'string' &&
        !isNaN(Number(value)) &&
        !['matMaterial', 'vehicle', 'groundType', 'loadType'].includes(key)
          ? Number(value)
          : value,
    }));
    setResults(null);
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setFormData((prev) => ({
      ...prev,
      matMaterial: preset.matMaterial,
      matLength: preset.matLength,
      matWidth: preset.matWidth,
      matThickness: preset.matThickness,
      numberOfMats: preset.numberOfMats,
      spanLength: preset.spanLength,
      vehicle: preset.vehicle,
      groundType: preset.groundType,
      safetyFactor: preset.safetyFactor,
      useCustomVehicle: false,
      useCustomBearing: false,
    }));
    setResults(null);
  };

  const calculateResults = () => {
    if (!validateInputs()) return;
    setIsCalculating(true);

    setTimeout(() => {
      const material = MAT_MATERIALS[formData.matMaterial];
      const vehicleData = VEHICLE_DATABASE[formData.vehicle];
      const groundData = GROUND_CONDITIONS[formData.groundType];

      const warnings: string[] = [];

      // Mat geometry
      const matL = formData.matLength / 1000; // m
      const matW = formData.matWidth / 1000; // m
      const matT = formData.matThickness; // mm
      const singleMatArea = matL * matW; // m²
      const totalMatArea = singleMatArea * formData.numberOfMats;
      const singleMatVolume = singleMatArea * (matT / 1000); // m³
      const singleMatWeight = (singleMatVolume * material.density * 9.81) / 1000; // kN
      const totalMatWeight = singleMatWeight * formData.numberOfMats;

      // Loading
      const wheelLoad = formData.useCustomVehicle
        ? formData.customWheelLoad
        : vehicleData.wheelLoad; // kN
      const contactArea = formData.useCustomVehicle
        ? formData.customContactArea
        : vehicleData.contactArea; // m²

      const contactPressure = wheelLoad / contactArea; // kN/m²
      const distributedPressure = wheelLoad / singleMatArea; // kN/m²
      const pressureReduction = ((contactPressure - distributedPressure) / contactPressure) * 100;

      // Ground bearing
      const groundBearing = formData.useCustomBearing
        ? formData.customBearing
        : groundData.bearingCapacity; // kN/m²
      const allowableBearing = groundBearing / formData.safetyFactor;

      // Section properties
      const span = formData.spanLength; // mm
      const effectiveWidth = formData.matWidth; // mm
      const sectionModulus = (effectiveWidth * Math.pow(matT, 2)) / 6; // mm³
      const secondMoment = (effectiveWidth * Math.pow(matT, 3)) / 12; // mm⁴

      // Factored load for ULS
      const factoredLoad = wheelLoad * formData.safetyFactor; // kN

      // Bending analysis
      let maxMoment: number;
      if (formData.loadType === 'point') {
        maxMoment = (factoredLoad * span) / 4 / 1000; // kNm
      } else {
        const lineLoad = factoredLoad / matW; // kN/m
        maxMoment = (lineLoad * Math.pow(span / 1000, 2)) / 8; // kNm
      }

      const bendingStress = (maxMoment * 1e6) / sectionModulus; // N/mm²
      const bendingUtilisation = (bendingStress / material.bendingStrength) * 100;
      const bendingStatus = bendingUtilisation <= 100 ? ('PASS' as const) : ('FAIL' as const);

      if (bendingStatus === 'FAIL') {
        warnings.push('Mat bending capacity exceeded - use thicker mat or stronger material');
      }

      // Shear analysis
      let maxShear: number;
      if (formData.loadType === 'point') {
        maxShear = factoredLoad / 2; // kN
      } else {
        const lineLoad = factoredLoad / matW; // kN/m
        maxShear = (lineLoad * (span / 1000)) / 2; // kN
      }

      const shearArea = effectiveWidth * matT; // mm²
      const shearStress = (1.5 * maxShear * 1000) / shearArea; // N/mm² (rect factor)
      const shearUtilisation = (shearStress / material.shearStrength) * 100;
      const shearStatus = shearUtilisation <= 100 ? ('PASS' as const) : ('FAIL' as const);

      if (shearStatus === 'FAIL') {
        warnings.push('Mat shear capacity exceeded');
      }

      // Deflection (SLS - unfactored load)
      let deflection: number;
      if (formData.loadType === 'point') {
        deflection =
          (wheelLoad * 1000 * Math.pow(span, 3)) / (48 * material.modulus * secondMoment); // mm
      } else {
        const lineLoad = wheelLoad / matW; // kN/m per mm width... need to adjust
        deflection =
          (5 * wheelLoad * 1000 * Math.pow(span, 3)) / (384 * material.modulus * secondMoment); // approx
      }

      const deflectionLimit = span / 150; // mm (L/150 for temporary works)
      const deflectionUtilisation = (deflection / deflectionLimit) * 100;
      const spanRatio = deflection > 0 ? span / deflection : 999;
      const deflectionStatus = deflectionUtilisation <= 100 ? ('PASS' as const) : ('FAIL' as const);

      if (deflectionStatus === 'FAIL') {
        warnings.push('Excessive deflection - reduce span or use stiffer material');
      }

      // Bearing check
      const totalAppliedPressure = distributedPressure + singleMatWeight / singleMatArea;
      const bearingUtilisation = (totalAppliedPressure / allowableBearing) * 100;
      const bearingStatus = bearingUtilisation <= 100 ? ('PASS' as const) : ('FAIL' as const);

      if (bearingStatus === 'FAIL') {
        warnings.push('Ground bearing capacity exceeded - add sub-base or reduce load');
      }

      // Punching shear (localized compression)
      const punchingPerimeter = Math.sqrt(contactArea) * 4 * 1000; // mm (approx square contact)
      const punchingStress = (factoredLoad * 1000) / (punchingPerimeter * matT); // N/mm²
      const allowablePunching = material.shearStrength * 0.8; // Reduced for punching
      const punchingUtilisation = (punchingStress / allowablePunching) * 100;
      const punchingStatus = punchingUtilisation <= 100 ? ('PASS' as const) : ('FAIL' as const);

      // Overall status
      const overallStatus =
        bendingStatus === 'PASS' &&
        shearStatus === 'PASS' &&
        deflectionStatus === 'PASS' &&
        bearingStatus === 'PASS' &&
        punchingStatus === 'PASS'
          ? 'PASS'
          : 'FAIL';

      setResults({
        overallStatus,
        warnings,
        matProperties: {
          singleMatArea,
          totalMatArea,
          singleMatWeight,
          totalMatWeight,
          materialName: material.name,
        },
        loadAnalysis: {
          appliedLoad: wheelLoad,
          contactPressure,
          distributedPressure,
          pressureReduction,
        },
        bendingCheck: {
          moment: maxMoment,
          stress: bendingStress,
          allowable: material.bendingStrength,
          utilisation: bendingUtilisation,
          status: bendingStatus,
        },
        shearCheck: {
          force: maxShear,
          stress: shearStress,
          allowable: material.shearStrength,
          utilisation: shearUtilisation,
          status: shearStatus,
        },
        deflectionCheck: {
          actual: deflection,
          limit: deflectionLimit,
          spanRatio,
          utilisation: deflectionUtilisation,
          status: deflectionStatus,
        },
        bearingCheck: {
          appliedPressure: totalAppliedPressure,
          allowableBearing,
          utilisation: bearingUtilisation,
          status: bearingStatus,
        },
        punchingCheck: {
          punchingStress,
          allowablePunching,
          utilisation: punchingUtilisation,
          status: punchingStatus,
        },
      });

      setActiveTab('results');
      setIsCalculating(false);
    }, 1500);
  };

  // Canvas visualization

  const buildReportData = (): ReportData => {
    const material = MAT_MATERIALS[formData.matMaterial];
    const vehicleData = VEHICLE_DATABASE[formData.vehicle];
    const groundData = GROUND_CONDITIONS[formData.groundType];

    return {
      title: 'Trackmat Design Report',
      subtitle: 'Temporary Access Matting Analysis - BS 5975',
      projectInfo: [
        { label: 'Mat Material', value: material.name },
        { label: 'Vehicle/Plant', value: formData.useCustomVehicle ? 'Custom' : vehicleData.name },
        {
          label: 'Ground Condition',
          value: formData.useCustomBearing ? 'Custom' : groundData.name,
        },
        { label: 'Safety Factor', value: formData.safetyFactor.toFixed(1) },
      ],
      inputs: [
        { label: 'Mat Length', value: formData.matLength, unit: 'mm' },
        { label: 'Mat Width', value: formData.matWidth, unit: 'mm' },
        { label: 'Mat Thickness', value: formData.matThickness, unit: 'mm' },
        { label: 'Number of Mats', value: formData.numberOfMats },
        { label: 'Span Length', value: formData.spanLength, unit: 'mm' },
        { label: 'Wheel Load', value: results?.loadAnalysis.appliedLoad || 0, unit: 'kN' },
        {
          label: 'Ground Bearing',
          value: formData.useCustomBearing ? formData.customBearing : groundData.bearingCapacity,
          unit: 'kN/m²',
        },
      ],
      results: results
        ? [
            {
              label: 'Single Mat Area',
              value: results.matProperties.singleMatArea.toFixed(2),
              unit: 'm²',
            },
            {
              label: 'Total Mat Area',
              value: results.matProperties.totalMatArea.toFixed(2),
              unit: 'm²',
            },
            {
              label: 'Total Mat Weight',
              value: results.matProperties.totalMatWeight.toFixed(1),
              unit: 'kN',
            },
            {
              label: 'Contact Pressure',
              value: results.loadAnalysis.contactPressure.toFixed(1),
              unit: 'kN/m²',
            },
            {
              label: 'Distributed Pressure',
              value: results.loadAnalysis.distributedPressure.toFixed(1),
              unit: 'kN/m²',
            },
            {
              label: 'Pressure Reduction',
              value: results.loadAnalysis.pressureReduction.toFixed(0),
              unit: '%',
            },
          ]
        : [],
      checks: results
        ? [
            {
              name: 'Mat Bending',
              capacity: `${results.bendingCheck.allowable.toFixed(1)} N/mm²`,
              utilisation: `${results.bendingCheck.utilisation.toFixed(1)}%`,
              status: results.bendingCheck.status,
            },
            {
              name: 'Mat Shear',
              capacity: `${results.shearCheck.allowable.toFixed(1)} N/mm²`,
              utilisation: `${results.shearCheck.utilisation.toFixed(1)}%`,
              status: results.shearCheck.status,
            },
            {
              name: 'Deflection (L/150)',
              capacity: `${results.deflectionCheck.limit.toFixed(1)} mm`,
              utilisation: `${results.deflectionCheck.utilisation.toFixed(1)}%`,
              status: results.deflectionCheck.status,
            },
            {
              name: 'Ground Bearing',
              capacity: `${results.bearingCheck.allowableBearing.toFixed(1)} kN/m²`,
              utilisation: `${results.bearingCheck.utilisation.toFixed(1)}%`,
              status: results.bearingCheck.status,
            },
            {
              name: 'Punching Shear',
              capacity: `${results.punchingCheck.allowablePunching.toFixed(1)} N/mm²`,
              utilisation: `${results.punchingCheck.utilisation.toFixed(1)}%`,
              status: results.punchingCheck.status,
            },
          ]
        : [],
      sections: [
        {
          title: 'Design Basis',
          content:
            'This analysis follows BS 5975 for temporary works and general engineering principles for mat structural design. Trackmats distribute concentrated wheel/track loads over a larger ground contact area to prevent bearing failure and rutting.',
        },
      ],
      warnings: results?.warnings || [],
      notes: [
        'Mats should be inspected regularly for damage',
        'Ensure proper interlocking/overlapping at joints',
        'Maintain drainage to prevent water ponding',
        'Remove debris from mat surfaces to prevent slipping',
      ],
      recommendations: [
        { check: 'Installation', suggestion: 'Lay mats on prepared level surface' },
        { check: 'Maintenance', suggestion: 'Clean and inspect weekly during use' },
      ],
      overallStatus: results?.overallStatus || 'FAIL',
      footerNote: 'Beaver Bridges Ltd • Trackmat Design Report • BS 5975',
    };
  };

  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Trackmat Design',
      subtitle: 'BS 5975 Compliant',
      projectInfo: [
        {
          label: 'Mat Material',
          value: MAT_MATERIALS[formData.matMaterial]?.name || formData.matMaterial,
        },
        { label: 'Vehicle', value: VEHICLE_DATABASE[formData.vehicle]?.name || formData.vehicle },
      ],
      inputs: [
        { label: 'Mat Length', value: `${formData.matLength} mm` },
        { label: 'Mat Width', value: `${formData.matWidth} mm` },
        { label: 'Mat Thickness', value: `${formData.matThickness} mm` },
        { label: 'Number of Mats', value: `${formData.numberOfMats}` },
        { label: 'Span Length', value: `${formData.spanLength} m` },
        {
          label: 'Ground Type',
          value: GROUND_CONDITIONS[formData.groundType]?.name || formData.groundType,
        },
        { label: 'Safety Factor', value: `${formData.safetyFactor}` },
      ],
      checks: [
        {
          name: 'Mat Bending',
          capacity: `${results.bendingCheck.allowable.toFixed(1)} N/mm²`,
          utilisation: `${results.bendingCheck.utilisation.toFixed(1)}%`,
          status: results.bendingCheck.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Mat Shear',
          capacity: `${results.shearCheck.allowable.toFixed(1)} N/mm²`,
          utilisation: `${results.shearCheck.utilisation.toFixed(1)}%`,
          status: results.shearCheck.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `${results.deflectionCheck.limit.toFixed(1)} mm`,
          utilisation: `${results.deflectionCheck.utilisation.toFixed(1)}%`,
          status: results.deflectionCheck.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Ground Bearing',
          capacity: `${results.bearingCheck.allowableBearing.toFixed(1)} kN/m²`,
          utilisation: `${results.bearingCheck.utilisation.toFixed(1)}%`,
          status: results.bearingCheck.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Punching Shear',
          capacity: `${results.punchingCheck.allowablePunching.toFixed(1)} N/mm²`,
          utilisation: `${results.punchingCheck.utilisation.toFixed(1)}%`,
          status: results.punchingCheck.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Installation',
          suggestion: 'Lay mats on prepared level surface with no voids beneath',
        },
        { check: 'Maintenance', suggestion: 'Clean and inspect mats weekly during use' },
        { check: 'Joints', suggestion: 'Ensure proper interlocking/overlapping at mat joints' },
      ],
      warnings: results.warnings || [],
      footerNote: 'Beaver Bridges Ltd — Trackmat Design',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Trackmat Design',
      subtitle: 'BS 5975 Compliant',
      projectInfo: [
        {
          label: 'Mat Material',
          value: MAT_MATERIALS[formData.matMaterial]?.name || formData.matMaterial,
        },
        { label: 'Vehicle', value: VEHICLE_DATABASE[formData.vehicle]?.name || formData.vehicle },
      ],
      inputs: [
        { label: 'Mat Length', value: `${formData.matLength} mm` },
        { label: 'Mat Width', value: `${formData.matWidth} mm` },
        { label: 'Mat Thickness', value: `${formData.matThickness} mm` },
        { label: 'Number of Mats', value: `${formData.numberOfMats}` },
        { label: 'Span Length', value: `${formData.spanLength} m` },
        {
          label: 'Ground Type',
          value: GROUND_CONDITIONS[formData.groundType]?.name || formData.groundType,
        },
        { label: 'Safety Factor', value: `${formData.safetyFactor}` },
      ],
      checks: [
        {
          name: 'Mat Bending',
          capacity: `${results.bendingCheck.allowable.toFixed(1)} N/mm²`,
          utilisation: `${results.bendingCheck.utilisation.toFixed(1)}%`,
          status: results.bendingCheck.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Mat Shear',
          capacity: `${results.shearCheck.allowable.toFixed(1)} N/mm²`,
          utilisation: `${results.shearCheck.utilisation.toFixed(1)}%`,
          status: results.shearCheck.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Deflection',
          capacity: `${results.deflectionCheck.limit.toFixed(1)} mm`,
          utilisation: `${results.deflectionCheck.utilisation.toFixed(1)}%`,
          status: results.deflectionCheck.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Ground Bearing',
          capacity: `${results.bearingCheck.allowableBearing.toFixed(1)} kN/m²`,
          utilisation: `${results.bearingCheck.utilisation.toFixed(1)}%`,
          status: results.bearingCheck.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Punching Shear',
          capacity: `${results.punchingCheck.allowablePunching.toFixed(1)} N/mm²`,
          utilisation: `${results.punchingCheck.utilisation.toFixed(1)}%`,
          status: results.punchingCheck.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Installation',
          suggestion: 'Lay mats on prepared level surface with no voids beneath',
        },
        { check: 'Maintenance', suggestion: 'Clean and inspect mats weekly during use' },
        { check: 'Joints', suggestion: 'Ensure proper interlocking/overlapping at mat joints' },
      ],
      warnings: results.warnings || [],
      footerNote: 'Beaver Bridges Ltd — Trackmat Design',
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 mb-4">
            <FiTruck className="text-neon-cyan" />
            <span className="text-neon-cyan text-sm font-medium">BS 5975 Compliant</span>
          </div>
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Trackmat Design
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BS 5975 trackmat &amp; bog mat assessment
          </p>
        </motion.div>

        {/* Status Banner */}

        {activeTab === 'results' && results && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'mb-6 p-4 rounded-xl border-2 shadow-lg flex items-center justify-between',
              results.overallStatus === 'PASS'
                ? 'bg-green-500/10 border-green-500/50'
                : 'bg-red-500/10 border-red-500/50',
            )}
          >
            <div className="flex items-center space-x-3">
              {results.overallStatus === 'PASS' ? (
                <FiCheck className="text-green-400" size={24} />
              ) : (
                <FiAlertTriangle className="text-red-400" size={24} />
              )}
              <div>
                <span
                  className={cn(
                    'font-bold text-lg',
                    results.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400',
                  )}
                >
                  {results.overallStatus === 'PASS' ? 'DESIGN ADEQUATE' : 'DESIGN INADEQUATE'}
                </span>
                <p className="text-gray-400 text-sm">
                  {results.loadAnalysis.pressureReduction.toFixed(0)}% pressure reduction achieved
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={exportPDF} variant="ghost" className="border border-neon-cyan/50">
                <FiDownload className="mr-2" /> Export PDF
              </Button>
              <Button onClick={exportDOCX} variant="ghost" className="border border-neon-cyan/50">
                <FiDownload className="mr-2" /> DOCX
              </Button>
              <SaveRunButton
                calculatorKey="trackmats"
                inputs={formData as unknown as Record<string, string | number>}
                results={results}
                status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
              />
            </div>
          </motion.div>
        )}

        {/* Warnings */}

        {results && results.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
          >
            <div className="flex items-start space-x-3">
              <FiAlertTriangle className="text-yellow-400 mt-0.5" />
              <div>
                <span className="font-semibold text-yellow-400">Design Warnings</span>
                <ul className="mt-2 space-y-1">
                  {results.warnings.map((w, i) => (
                    <li key={i} className="text-yellow-200 text-sm">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
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
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-blue'
                  : 'text-gray-400',
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
              <div className="lg:col-span-2 space-y-6">
                {/* Presets */}
                <CollapsibleSection
                  title="Quick Presets"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <motion.button
                        key={key}
                        onClick={() => applyPreset(key)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition-all text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white">{preset.name}</span>
                          <span className="text-2xl">
                            {MAT_MATERIALS[preset.matMaterial]?.icon}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">{preset.description}</p>
                      </motion.button>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* Material Selection */}
                <CollapsibleSection
                  title="Mat Material"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiGrid className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-3 gap-3">
                    {Object.entries(MAT_MATERIALS).map(([key, mat]) => (
                      <motion.button
                        key={key}
                        onClick={() => handleInputChange('matMaterial', key)}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all text-left',
                          formData.matMaterial === key
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 bg-gray-800/30 hover:border-gray-600',
                        )}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xl">{mat.icon}</span>
                          <span className="text-white font-medium text-sm">{mat.name}</span>
                        </div>
                        <p className="text-gray-500 text-xs">{mat.description}</p>
                        <div className="mt-2 text-xs text-gray-400">
                          fb: {mat.bendingStrength} N/mm²
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* Mat Dimensions */}
                <CollapsibleSection
                  title="Mat Dimensions & Configuration"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <ExplainableLabel label="Mat Length" field="matLength" className="text-sm font-semibold text-gray-200" />
                        <span className="text-neon-cyan text-xs">(mm)</span>
                      </div>
                      <input
                        title="Mat Length (mm)"
                        type="number"
                        value={formData.matLength}
                        onChange={(e) => handleInputChange('matLength', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <ExplainableLabel label="Mat Width" field="matWidth" className="text-sm font-semibold text-gray-200" />
                        <span className="text-neon-cyan text-xs">(mm)</span>
                      </div>
                      <input
                        title="Mat Width (mm)"
                        type="number"
                        value={formData.matWidth}
                        onChange={(e) => handleInputChange('matWidth', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <ExplainableLabel label="Thickness" field="matThickness" className="text-sm font-semibold text-gray-200" />
                        <span className="text-neon-cyan text-xs">(mm)</span>
                      </div>
                      <input
                        title="Thickness (mm)"
                        type="number"
                        value={formData.matThickness}
                        onChange={(e) => handleInputChange('matThickness', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <ExplainableLabel label="Number of Mats" field="numberOfMats" className="text-sm font-semibold text-gray-200" />
                      <input
                        title="Number of Mats"
                        type="number"
                        value={formData.numberOfMats}
                        onChange={(e) => handleInputChange('numberOfMats', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <ExplainableLabel label="Span Length" field="spanLength" className="text-sm font-semibold text-gray-200" />
                        <span className="text-neon-cyan text-xs">(mm)</span>
                      </div>
                      <input
                        title="Span Length (mm)"
                        type="number"
                        value={formData.spanLength}
                        onChange={(e) => handleInputChange('spanLength', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <ExplainableLabel label="Safety Factor" field="safetyFactor" className="text-sm font-semibold text-gray-200" />
                      <input
                        title="Safety Factor"
                        type="number"
                        step="0.1"
                        value={formData.safetyFactor}
                        onChange={(e) => handleInputChange('safetyFactor', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Vehicle & Ground */}
                <CollapsibleSection
                  title="Vehicle & Ground Conditions"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiTruck className="text-neon-cyan" size={24} />
                    </motion.div>
                  }
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <ExplainableLabel label="Vehicle/Plant Type" field="vehicle" className="text-sm font-semibold text-gray-200" />
                        <select
                          title="Vehicle/Plant Type"
                          value={formData.vehicle}
                          onChange={(e) => handleInputChange('vehicle', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                          disabled={formData.useCustomVehicle}
                        >
                          {Object.entries(VEHICLE_DATABASE).map(([key, v]) => (
                            <option key={key} value={key}>
                              {v.name} ({v.wheelLoad}kN/wheel)
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          title="Input value"
                          type="checkbox"
                          checked={formData.useCustomVehicle}
                          onChange={(e) => handleInputChange('useCustomVehicle', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-600 text-neon-cyan"
                        />
                        <span className="text-gray-300 text-sm">Use Custom Load</span>
                      </label>

                      {formData.useCustomVehicle && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <ExplainableLabel label="Wheel Load" field="customWheelLoad" className="text-sm font-semibold text-gray-200" />
                              <span className="text-neon-cyan text-xs">(kN)</span>
                            </div>
                            <input
                              title="Wheel Load (kN)"
                              type="number"
                              value={formData.customWheelLoad}
                              onChange={(e) => handleInputChange('customWheelLoad', e.target.value)}
                              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white text-sm transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <ExplainableLabel label="Contact Area" field="customContactArea" className="text-sm font-semibold text-gray-200" />
                              <span className="text-neon-cyan text-xs">(m²)</span>
                            </div>
                            <input
                              title="Contact Area (m²)"
                              type="number"
                              step="0.01"
                              value={formData.customContactArea}
                              onChange={(e) =>
                                handleInputChange('customContactArea', e.target.value)
                              }
                              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white text-sm transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <ExplainableLabel label="Ground Condition" field="groundType" className="text-sm font-semibold text-gray-200" />
                        <select
                          title="Ground Condition"
                          value={formData.groundType}
                          onChange={(e) => handleInputChange('groundType', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white transition-all"
                          disabled={formData.useCustomBearing}
                        >
                          {Object.entries(GROUND_CONDITIONS).map(([key, g]) => (
                            <option key={key} value={key}>
                              {g.name} ({g.bearingCapacity} kN/m²)
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          title="Input value"
                          type="checkbox"
                          checked={formData.useCustomBearing}
                          onChange={(e) => handleInputChange('useCustomBearing', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-600 text-neon-cyan"
                        />
                        <span className="text-gray-300 text-sm">Use Custom Bearing</span>
                      </label>

                      {formData.useCustomBearing && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <ExplainableLabel label="Bearing Capacity" field="customBearing" className="text-sm font-semibold text-gray-200" />
                            <span className="text-neon-cyan text-xs">(kN/m²)</span>
                          </div>
                          <input
                            title="Bearing Capacity (kN/m²)"
                            type="number"
                            value={formData.customBearing}
                            onChange={(e) => handleInputChange('customBearing', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white text-sm transition-all"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={calculateResults}
                    disabled={isCalculating}
                    className="px-16 py-8 text-xl font-black bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,217,255,0.3)] rounded-2xl"
                  >
                    {isCalculating ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ANALYSING...
                      </div>
                    ) : (
                      'RUN FULL ANALYSIS'
                    )}
                  </Button>
                </motion.div>

                {/* Results */}

                {results && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Border-l-4 Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'Bending', data: results.bendingCheck },
                        { label: 'Shear', data: results.shearCheck },
                        { label: 'Deflection', data: results.deflectionCheck },
                        { label: 'Bearing', data: results.bearingCheck },
                        { label: 'Punching', data: results.punchingCheck },
                      ].map((item, i) => (
                        <Card
                          key={i}
                          variant="glass"
                          className={cn(
                            'border-l-4',
                            item.data.status === 'PASS' ? 'border-l-green-500' : 'border-l-red-500',
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">
                                <FiCheck size={14} />
                              </div>
                              <span
                                className={cn(
                                  'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                                  item.data.status === 'PASS'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400',
                                )}
                              >
                                {item.data.status}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                            <p className="text-2xl font-black text-white">
                              {item.data.utilisation.toFixed(1)}%
                            </p>
                            <div className="mt-2 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(item.data.utilisation, 100)}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                className={cn(
                                  'h-full rounded-full',
                                  item.data.utilisation > 100
                                    ? 'bg-red-500'
                                    : item.data.utilisation > 80
                                      ? 'bg-orange-500'
                                      : 'bg-gradient-to-r from-neon-cyan to-neon-blue',
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <CollapsibleSection
                      title="Structural Checks"
                      icon={
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiCheck className="text-neon-cyan" size={24} />
                        </motion.div>
                      }
                      defaultOpen={true}
                    >
                      <div className="space-y-4">
                        {[
                          {
                            name: 'Mat Bending',
                            data: results.bendingCheck,
                            applied: `${results.bendingCheck.stress.toFixed(1)} N/mm²`,
                            capacity: `${results.bendingCheck.allowable.toFixed(1)} N/mm²`,
                          },
                          {
                            name: 'Mat Shear',
                            data: results.shearCheck,
                            applied: `${results.shearCheck.stress.toFixed(2)} N/mm²`,
                            capacity: `${results.shearCheck.allowable.toFixed(1)} N/mm²`,
                          },
                          {
                            name: 'Deflection',
                            data: results.deflectionCheck,
                            applied: `${results.deflectionCheck.actual.toFixed(1)} mm`,
                            capacity: `${results.deflectionCheck.limit.toFixed(1)} mm`,
                          },
                          {
                            name: 'Ground Bearing',
                            data: results.bearingCheck,
                            applied: `${results.bearingCheck.appliedPressure.toFixed(1)} kN/m²`,
                            capacity: `${results.bearingCheck.allowableBearing.toFixed(1)} kN/m²`,
                          },
                          {
                            name: 'Punching',
                            data: results.punchingCheck,
                            applied: `${results.punchingCheck.punchingStress.toFixed(2)} N/mm²`,
                            capacity: `${results.punchingCheck.allowablePunching.toFixed(1)} N/mm²`,
                          },
                        ].map((check) => (
                          <div
                            key={check.name}
                            className="p-4 rounded-lg bg-gray-800/30 border border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">{check.name}</span>
                              <span
                                className={cn(
                                  'px-3 py-1 rounded-full text-sm font-bold',
                                  check.data.status === 'PASS'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400',
                                )}
                              >
                                {check.data.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                              <span>Applied: {check.applied}</span>
                              <span>Capacity: {check.capacity}</span>
                            </div>
                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(check.data.utilisation, 100)}%` }}
                                transition={{ duration: 0.8 }}
                                className={cn(
                                  'h-full rounded-full',
                                  check.data.utilisation <= 70 && 'bg-green-500',
                                  check.data.utilisation > 70 &&
                                    check.data.utilisation <= 100 &&
                                    'bg-yellow-500',
                                  check.data.utilisation > 100 && 'bg-red-500',
                                )}
                              />
                            </div>
                            <p className="text-right text-sm mt-1 text-gray-400">
                              <span
                                className={
                                  check.data.utilisation <= 100 ? 'text-green-400' : 'text-red-400'
                                }
                              >
                                {check.data.utilisation.toFixed(1)}%
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  </motion.div>
                )}
              </div>

              {/* Right Column — Sticky */}
              <div className="space-y-6 sticky top-32">
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
                        <TrackMat3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        TRACKMATS — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        {
                          label: 'Mat Length',
                          field: 'matLength' as keyof FormData,
                          min: 1000,
                          max: 6000,
                          step: 100,
                          unit: 'mm',
                        },
                        {
                          label: 'Mat Width',
                          field: 'matWidth' as keyof FormData,
                          min: 500,
                          max: 3000,
                          step: 100,
                          unit: 'mm',
                        },
                        {
                          label: 'Mat Thickness',
                          field: 'matThickness' as keyof FormData,
                          min: 5,
                          max: 50,
                          step: 1,
                          unit: 'mm',
                        },
                        {
                          label: 'No. of Mats',
                          field: 'numberOfMats' as keyof FormData,
                          min: 1,
                          max: 100,
                          step: 1,
                          unit: '',
                        },
                        {
                          label: 'Span Length',
                          field: 'spanLength' as keyof FormData,
                          min: 100,
                          max: 2000,
                          step: 50,
                          unit: 'mm',
                        },
                        {
                          label: 'Platform Thickness',
                          field: 'platformThickness' as keyof FormData,
                          min: 100,
                          max: 1000,
                          step: 50,
                          unit: 'mm',
                        },
                        {
                          label: 'Safety Factor',
                          field: 'safetyFactor' as keyof FormData,
                          min: 1.0,
                          max: 3.0,
                          step: 0.1,
                          unit: '',
                        },
                      ].map((s) => (
                        <div key={s.field} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{s.label}</span>
                            <span className="text-white">
                              {formData[s.field]} {s.unit}
                            </span>
                          </div>
                          <input
                            title={s.label}
                            type="range"
                            min={s.min}
                            max={s.max}
                            step={s.step}
                            value={formData[s.field] as number}
                            onChange={(e) => updateForm(s.field, e.target.value)}
                            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                          />
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2 mb-3">
                          <FiActivity size={14} /> Live Readout
                        </h3>
                        {[
                          {
                            label: 'Material',
                            value:
                              MAT_MATERIALS[formData.matMaterial]?.name || formData.matMaterial,
                          },
                          { label: 'Vehicle', value: formData.vehicle.replace(/_/g, ' ') },
                          { label: 'Ground', value: formData.groundType.replace(/_/g, ' ') },
                          {
                            label: 'Mat Size',
                            value: `${formData.matLength}×${formData.matWidth}×${formData.matThickness}mm`,
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
                              {
                                label: 'Bending',
                                util: (results.bendingCheck.utilisation * 100).toFixed(0),
                                status: results.bendingCheck.status,
                              },
                              {
                                label: 'Shear',
                                util: (results.shearCheck.utilisation * 100).toFixed(0),
                                status: results.shearCheck.status,
                              },
                              {
                                label: 'Deflection',
                                util: (results.deflectionCheck.utilisation * 100).toFixed(0),
                                status: results.deflectionCheck.status,
                              },
                              {
                                label: 'Bearing',
                                util: (results.bearingCheck.utilisation * 100).toFixed(0),
                                status: results.bearingCheck.status,
                              },
                              {
                                label: 'Punching',
                                util: (results.punchingCheck.utilisation * 100).toFixed(0),
                                status: results.punchingCheck.status,
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
                                      : parseFloat(check.util) > 90
                                        ? 'text-orange-400'
                                        : 'text-emerald-400',
                                  )}
                                >
                                  {check.util}%
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
                  title="Trackmats — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <TrackMat3D />
                    </Interactive3DDiagram>
                  )}
                />

                {/* Standard Sizes */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FiInfo className="text-neon-cyan" size={24} />
                      </motion.div>
                      <span>Standard Mat Sizes</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {TRACKMAT_SIZES.map((size) => (
                        <div
                          key={size.name}
                          className="flex items-center justify-between p-2 rounded bg-gray-800/30 text-sm"
                        >
                          <div>
                            <p className="text-white font-medium">{size.name}</p>
                            <p className="text-gray-500 text-xs">{size.loadCapacity}</p>
                          </div>
                          <p className="text-cyan-400 text-xs">
                            {size.length}×{size.width}×{size.thickness}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Vehicle Reference */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        className="w-12 h-12 bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 rounded-2xl flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FiTruck className="text-neon-cyan" size={24} />
                      </motion.div>
                      <span>Vehicle Wheel Loads</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
                      {Object.entries(VEHICLE_DATABASE)
                        .slice(0, 8)
                        .map(([key, v]) => (
                          <div
                            key={key}
                            className="flex justify-between p-2 rounded bg-gray-800/30"
                          >
                            <span className="text-gray-300">{v.name}</span>
                            <span className="text-pink-400">{v.wheelLoad} kN</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Additional CSS for grid pattern */}
      <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
};

export default Trackmats;
