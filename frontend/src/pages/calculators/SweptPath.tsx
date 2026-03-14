// =============================================================================
// Swept Path Calculator — Vehicle Turning Analysis
// Construction Logistics — Vehicle Access Planning
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiDownload,
  FiInfo,
  FiMinimize2,
  FiNavigation,
  FiSettings,
  FiSliders,
  FiTarget,
  FiTruck,
} from 'react-icons/fi';
import ExplainableLabel from '../../components/ExplainableLabel';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import type { ReportData } from '../../lib/pdf/types';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import SweptPath3D from '../../components/3d/scenes/SweptPath3D';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  vehicleType: string;
  vehicleLength: number;
  vehicleWidth: number;
  wheelbase: number;
  frontOverhang: number;
  rearOverhang: number;
  turningRadius: number;
  articulationAngle: number;
  roadWidth: number;
  cornerRadius: number;
  clearanceBuffer: number;
  speedLimit: number;
}

interface Results {
  overallStatus: 'PASS' | 'FAIL';
  innerSweptRadius: number;
  outerSweptRadius: number;
  sweptPathWidth: number;
  requiredRoadWidth: number;
  clearanceMargin: number;
  rearSwing: number;
  frontSwing: number;
  trackingDifference: number;
  minCornerRadius: number;
  speedReduction: number;
  warnings: string[];
}

// =============================================================================
// VEHICLE DATABASE
// =============================================================================

const VEHICLE_TYPES: Record<
  string,
  {
    name: string;
    length: number;
    width: number;
    wheelbase: number;
    frontOverhang: number;
    rearOverhang: number;
    turningRadius: number;
    articulationAngle: number;
    category: string;
  }
> = {
  car: {
    name: 'Car / Light Van',
    length: 4.5,
    width: 1.8,
    wheelbase: 2.7,
    frontOverhang: 0.9,
    rearOverhang: 0.9,
    turningRadius: 5.5,
    articulationAngle: 0,
    category: 'Light',
  },
  lwb_van: {
    name: 'LWB Van (3.5t)',
    length: 6.0,
    width: 2.1,
    wheelbase: 3.5,
    frontOverhang: 1.0,
    rearOverhang: 1.5,
    turningRadius: 6.5,
    articulationAngle: 0,
    category: 'Light',
  },
  rigid_7_5t: {
    name: 'Rigid HGV (7.5t)',
    length: 8.0,
    width: 2.5,
    wheelbase: 5.0,
    frontOverhang: 1.2,
    rearOverhang: 1.8,
    turningRadius: 8.5,
    articulationAngle: 0,
    category: 'HGV',
  },
  rigid_18t: {
    name: 'Rigid HGV (18t)',
    length: 10.5,
    width: 2.5,
    wheelbase: 6.5,
    frontOverhang: 1.5,
    rearOverhang: 2.5,
    turningRadius: 10.5,
    articulationAngle: 0,
    category: 'HGV',
  },
  artic_13_6m: {
    name: 'Articulated (13.6m trailer)',
    length: 16.5,
    width: 2.55,
    wheelbase: 6.0,
    frontOverhang: 1.5,
    rearOverhang: 9.0,
    turningRadius: 12.5,
    articulationAngle: 70,
    category: 'Articulated',
  },
  artic_drawbar: {
    name: 'Drawbar Combination',
    length: 18.75,
    width: 2.55,
    wheelbase: 6.5,
    frontOverhang: 1.5,
    rearOverhang: 10.75,
    turningRadius: 14.0,
    articulationAngle: 55,
    category: 'Articulated',
  },
  low_loader: {
    name: 'Low Loader',
    length: 20.0,
    width: 3.0,
    wheelbase: 7.0,
    frontOverhang: 2.0,
    rearOverhang: 11.0,
    turningRadius: 15.0,
    articulationAngle: 65,
    category: 'Special',
  },
  mobile_crane: {
    name: 'Mobile Crane',
    length: 14.0,
    width: 2.75,
    wheelbase: 6.0,
    frontOverhang: 2.5,
    rearOverhang: 5.5,
    turningRadius: 12.0,
    articulationAngle: 0,
    category: 'Special',
  },
  concrete_mixer: {
    name: 'Concrete Mixer',
    length: 9.5,
    width: 2.5,
    wheelbase: 5.5,
    frontOverhang: 1.3,
    rearOverhang: 2.7,
    turningRadius: 9.5,
    articulationAngle: 0,
    category: 'HGV',
  },
  fire_engine: {
    name: 'Fire Engine',
    length: 10.0,
    width: 2.5,
    wheelbase: 5.8,
    frontOverhang: 1.4,
    rearOverhang: 2.8,
    turningRadius: 10.0,
    articulationAngle: 0,
    category: 'Emergency',
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
  status?: 'PASS' | 'FAIL' | null;
}> = ({ title, icon, children, defaultOpen = true, status }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card
      variant="glass"
      className={cn(
        'border transition-all duration-300',
        status === 'PASS' && 'border-green-500/30',
        status === 'FAIL' && 'border-red-500/30',
        !status && 'border-blue-500/30',
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-t-xl"
      >
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              status === 'PASS' && 'bg-green-500/20 text-green-400',
              status === 'FAIL' && 'bg-red-500/20 text-red-400',
              !status && 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400',
            )}
          >
            {icon}
          </div>
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
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PRESETS = {
  rigid_truck: {
    name: 'Rigid Truck (7.5t)',
    vehicleType: 'rigid_7_5t',
    turningRadius: '10.0',
  },
  artic_16_5m: {
    name: 'Articulated 16.5m',
    vehicleType: 'artic_16_5',
    turningRadius: '12.5',
  },
  fire_engine: {
    name: 'Fire Engine',
    vehicleType: 'fire_engine',
    turningRadius: '8.5',
  },
  refuse_vehicle: {
    name: 'Refuse Vehicle',
    vehicleType: 'refuse',
    turningRadius: '11.0',
  },
};

const SweptPath: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    vehicleType: 'artic_13_6m',
    vehicleLength: 16.5,
    vehicleWidth: 2.55,
    wheelbase: 6.0,
    frontOverhang: 1.5,
    rearOverhang: 9.0,
    turningRadius: 12.5,
    articulationAngle: 70,
    roadWidth: 7.3,
    cornerRadius: 10.0,
    clearanceBuffer: 0.5,
    speedLimit: 20,
  });
  // What-If sliders
  const whatIfSliders = [
    { key: 'turningRadius', label: 'Turning Radius', min: 4, max: 20, step: 0.5, unit: 'm' },
    { key: 'roadWidth', label: 'Road Width', min: 3, max: 15, step: 0.5, unit: 'm' },
    { key: 'vehicleLength', label: 'Vehicle Length', min: 4, max: 20, step: 0.5, unit: 'm' },
    { key: 'articulationAngle', label: 'Articulation Angle', min: 0, max: 90, step: 5, unit: '°' },
    { key: 'cornerRadius', label: 'Corner Radius', min: 3, max: 25, step: 0.5, unit: 'm' },
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
      { key: 'vehicleLength', label: 'Vehicle Length' },
      { key: 'vehicleWidth', label: 'Vehicle Width' },
      { key: 'wheelbase', label: 'Wheelbase' },
      { key: 'frontOverhang', label: 'Front Overhang' },
      { key: 'rearOverhang', label: 'Rear Overhang' },
      { key: 'turningRadius', label: 'Turning Radius' },
      { key: 'articulationAngle', label: 'Articulation Angle', allowZero: true },
      { key: 'roadWidth', label: 'Road Width' },
      { key: 'cornerRadius', label: 'Corner Radius' },
      { key: 'clearanceBuffer', label: 'Clearance Buffer', allowZero: true },
      { key: 'speedLimit', label: 'Speed Limit' },
    ]);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return false;
    }
    return true;
  };

  const handleInputChange = (key: keyof FormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [key]:
        typeof value === 'string' && !isNaN(Number(value)) && key !== 'vehicleType'
          ? Number(value)
          : value,
    }));
    setResults(null);
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key as keyof typeof PRESETS];
    if (!preset) return;
    applyVehicleType(preset.vehicleType);
    if (preset.turningRadius) {
      setFormData((prev) => ({ ...prev, turningRadius: Number(preset.turningRadius) }));
    }
    setResults(null);
  };

  const applyVehicleType = (type: string) => {
    const vehicle = VEHICLE_TYPES[type];
    if (!vehicle) return;
    setFormData((prev) => ({
      ...prev,
      vehicleType: type,
      vehicleLength: vehicle.length,
      vehicleWidth: vehicle.width,
      wheelbase: vehicle.wheelbase,
      frontOverhang: vehicle.frontOverhang,
      rearOverhang: vehicle.rearOverhang,
      turningRadius: vehicle.turningRadius,
      articulationAngle: vehicle.articulationAngle,
    }));
    setResults(null);
  };

  const calculateResults = () => {
    if (!validateInputs()) return;
    setIsCalculating(true);

    setTimeout(() => {
      const warnings: string[] = [];

      // Inner swept radius (rear inner wheel track)
      const minTurningRadius = formData.turningRadius;
      const innerSweptRadius = Math.sqrt(
        Math.pow(minTurningRadius, 2) - Math.pow(formData.wheelbase, 2),
      );

      // Outer swept radius (front outer corner of vehicle)
      const frontOverhangDiag = Math.sqrt(
        Math.pow(formData.frontOverhang, 2) + Math.pow(formData.vehicleWidth / 2, 2),
      );
      const outerSweptRadius = minTurningRadius + frontOverhangDiag;

      // Rear swing (tail swing) - important for articulated vehicles
      const rearSwing =
        formData.rearOverhang * Math.sin((formData.articulationAngle * Math.PI) / 180);

      // Front swing
      const frontSwing =
        formData.frontOverhang * Math.sin(Math.asin(formData.wheelbase / minTurningRadius));

      // Swept path width
      const sweptPathWidth = outerSweptRadius - innerSweptRadius + formData.vehicleWidth / 2;

      // Tracking difference (off-tracking)
      const trackingDifference = minTurningRadius - innerSweptRadius;

      // Required road width with safety buffers
      const requiredRoadWidth = sweptPathWidth + 2 * formData.clearanceBuffer;

      // Clearance margin
      const clearanceMargin = formData.roadWidth - requiredRoadWidth;

      // Minimum corner radius check
      const minCornerRadius = outerSweptRadius + formData.clearanceBuffer;

      // Speed reduction factor for tight turns
      const speedReduction =
        formData.cornerRadius < minCornerRadius
          ? Math.max(5, formData.speedLimit * (formData.cornerRadius / minCornerRadius))
          : formData.speedLimit;

      // Warnings
      if (clearanceMargin < 0) {
        warnings.push(
          `Insufficient road width: need ${requiredRoadWidth.toFixed(1)}m, available ${formData.roadWidth.toFixed(1)}m`,
        );
      }

      if (formData.cornerRadius < minCornerRadius) {
        warnings.push(
          `Corner radius too tight: need ${minCornerRadius.toFixed(1)}m minimum, provided ${formData.cornerRadius.toFixed(1)}m`,
        );
      }

      if (rearSwing > 1.0) {
        warnings.push(
          `Significant rear swing of ${rearSwing.toFixed(2)}m - ensure clearance for pedestrians/obstacles`,
        );
      }

      if (trackingDifference > 2.5) {
        warnings.push(
          `Large off-tracking of ${trackingDifference.toFixed(2)}m - vehicle will cut corner significantly`,
        );
      }

      if (formData.vehicleWidth > 2.55 && formData.roadWidth < 4.5) {
        warnings.push('Wide load may require escort vehicle and traffic management');
      }

      const overallStatus: 'PASS' | 'FAIL' =
        clearanceMargin >= 0 && formData.cornerRadius >= minCornerRadius * 0.9 ? 'PASS' : 'FAIL';

      setResults({
        overallStatus,
        innerSweptRadius,
        outerSweptRadius,
        sweptPathWidth,
        requiredRoadWidth,
        clearanceMargin,
        rearSwing,
        frontSwing,
        trackingDifference,
        minCornerRadius,
        speedReduction,
        warnings,
      });

      setActiveTab('results');
      setIsCalculating(false);
    }, 1000);
  };

  // Canvas visualization

  const buildReportData = (): ReportData => {
    const vehicle = VEHICLE_TYPES[formData.vehicleType];

    return {
      title: 'Swept Path Analysis Report',
      subtitle: 'Vehicle Turning & Access Assessment',
      projectInfo: [
        { label: 'Vehicle Type', value: vehicle?.name || 'Custom' },
        { label: 'Vehicle Category', value: vehicle?.category || 'N/A' },
        { label: 'Road Width', value: `${formData.roadWidth} m` },
        { label: 'Corner Radius', value: `${formData.cornerRadius} m` },
      ],
      inputs: [
        { label: 'Vehicle Length', value: formData.vehicleLength, unit: 'm' },
        { label: 'Vehicle Width', value: formData.vehicleWidth, unit: 'm' },
        { label: 'Wheelbase', value: formData.wheelbase, unit: 'm' },
        { label: 'Front Overhang', value: formData.frontOverhang, unit: 'm' },
        { label: 'Rear Overhang', value: formData.rearOverhang, unit: 'm' },
        { label: 'Min Turning Radius', value: formData.turningRadius, unit: 'm' },
        { label: 'Articulation Angle', value: formData.articulationAngle, unit: '°' },
        { label: 'Clearance Buffer', value: formData.clearanceBuffer, unit: 'm' },
      ],
      results: results
        ? [
            { label: 'Inner Swept Radius', value: results.innerSweptRadius.toFixed(2), unit: 'm' },
            { label: 'Outer Swept Radius', value: results.outerSweptRadius.toFixed(2), unit: 'm' },
            { label: 'Swept Path Width', value: results.sweptPathWidth.toFixed(2), unit: 'm' },
            {
              label: 'Required Road Width',
              value: results.requiredRoadWidth.toFixed(2),
              unit: 'm',
            },
            { label: 'Clearance Margin', value: results.clearanceMargin.toFixed(2), unit: 'm' },
            { label: 'Rear Swing', value: results.rearSwing.toFixed(2), unit: 'm' },
            { label: 'Off-Tracking', value: results.trackingDifference.toFixed(2), unit: 'm' },
            { label: 'Min Corner Radius', value: results.minCornerRadius.toFixed(2), unit: 'm' },
          ]
        : [],
      checks: results
        ? [
            {
              name: 'Road Width Adequacy',
              capacity: `${formData.roadWidth.toFixed(1)} m available`,
              utilisation: `${((results.requiredRoadWidth / formData.roadWidth) * 100).toFixed(0)}%`,
              status: results.clearanceMargin >= 0 ? 'PASS' : 'FAIL',
            },
            {
              name: 'Corner Radius',
              capacity: `${formData.cornerRadius.toFixed(1)} m provided`,
              utilisation: `${((results.minCornerRadius / formData.cornerRadius) * 100).toFixed(0)}%`,
              status: formData.cornerRadius >= results.minCornerRadius ? 'PASS' : 'FAIL',
            },
          ]
        : [],
      sections: [
        {
          title: 'Design Basis',
          content:
            'Swept path analysis based on vehicle geometric properties and Ackermann steering geometry. Off-tracking calculated using standard formulae for rigid and articulated vehicles.',
        },
      ],
      warnings: results?.warnings || [],
      notes: [
        'Analysis assumes ideal road surface conditions',
        'Driver skill and visibility not accounted for',
        'Consider banksman for complex maneuvers',
        'Speed should be reduced in tight corners',
      ],
      recommendations: [
        { check: 'Access Route', suggestion: 'Survey and clear route before delivery' },
        {
          check: 'Traffic Management',
          suggestion: 'Consider temporary traffic control for large vehicles',
        },
      ],
      overallStatus: results?.overallStatus || 'FAIL',
      footerNote: 'Beaver Bridges Ltd • Swept Path Analysis Report',
    };
  };

  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Swept Path Analysis',
      subtitle: 'Vehicle Tracking Assessment',
      projectInfo: [
        { label: 'Project', value: '-' },
        { label: 'Reference', value: 'SWE001' },
      ],
      inputs: [
        { label: 'Vehicle Type', value: formData.vehicleType },
        { label: 'Vehicle Length', value: String(formData.vehicleLength), unit: 'm' },
        { label: 'Vehicle Width', value: String(formData.vehicleWidth), unit: 'm' },
        { label: 'Wheelbase', value: String(formData.wheelbase), unit: 'm' },
        { label: 'Turning Radius', value: String(formData.turningRadius), unit: 'm' },
        { label: 'Road Width', value: String(formData.roadWidth), unit: 'm' },
        { label: 'Corner Radius', value: String(formData.cornerRadius), unit: 'm' },
      ],
      sections: [
        {
          title: 'Swept Path Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Inner Swept Radius', results.innerSweptRadius.toFixed(2), 'm'],
            ['Outer Swept Radius', results.outerSweptRadius.toFixed(2), 'm'],
            ['Swept Path Width', results.sweptPathWidth.toFixed(2), 'm'],
            ['Required Road Width', results.requiredRoadWidth.toFixed(2), 'm'],
            ['Clearance Margin', results.clearanceMargin.toFixed(2), 'm'],
            ['Rear Swing', results.rearSwing.toFixed(2), 'm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Clearance Check',
          capacity: `${results.requiredRoadWidth.toFixed(1)} m required`,
          utilisation: `${Math.max(0, (1 - results.clearanceMargin / formData.roadWidth) * 100).toFixed(1)}%`,
          status: results.overallStatus,
        },
      ],
      recommendations: [
        { check: 'Access Route', suggestion: 'Survey and clear route before delivery' },
        {
          check: 'Traffic Management',
          suggestion: 'Consider temporary traffic control for large vehicles',
        },
        {
          check: 'Rear Swing',
          suggestion: 'Provide banksman guidance where tail swing exceeds 0.5 m',
        },
      ],
      warnings: results?.warnings || [],
      footerNote: 'Beaver Bridges Ltd — Swept Path Analysis',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Swept Path Analysis',
      subtitle: 'Vehicle Tracking Assessment',
      projectInfo: [
        { label: 'Project', value: '-' },
        { label: 'Reference', value: 'SWE001' },
      ],
      inputs: [
        { label: 'Vehicle Type', value: formData.vehicleType },
        { label: 'Vehicle Length', value: String(formData.vehicleLength), unit: 'm' },
        { label: 'Vehicle Width', value: String(formData.vehicleWidth), unit: 'm' },
        { label: 'Wheelbase', value: String(formData.wheelbase), unit: 'm' },
        { label: 'Turning Radius', value: String(formData.turningRadius), unit: 'm' },
        { label: 'Road Width', value: String(formData.roadWidth), unit: 'm' },
        { label: 'Corner Radius', value: String(formData.cornerRadius), unit: 'm' },
      ],
      sections: [
        {
          title: 'Swept Path Results',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Inner Swept Radius', results.innerSweptRadius.toFixed(2), 'm'],
            ['Outer Swept Radius', results.outerSweptRadius.toFixed(2), 'm'],
            ['Swept Path Width', results.sweptPathWidth.toFixed(2), 'm'],
            ['Required Road Width', results.requiredRoadWidth.toFixed(2), 'm'],
            ['Clearance Margin', results.clearanceMargin.toFixed(2), 'm'],
            ['Rear Swing', results.rearSwing.toFixed(2), 'm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Clearance Check',
          capacity: `${results.requiredRoadWidth.toFixed(1)} m required`,
          utilisation: `${Math.max(0, (1 - results.clearanceMargin / formData.roadWidth) * 100).toFixed(1)}%`,
          status: results.overallStatus,
        },
      ],
      recommendations: [
        { check: 'Access Route', suggestion: 'Survey and clear route before delivery' },
        {
          check: 'Traffic Management',
          suggestion: 'Consider temporary traffic control for large vehicles',
        },
        {
          check: 'Rear Swing',
          suggestion: 'Provide banksman guidance where tail swing exceeds 0.5 m',
        },
      ],
      warnings: results?.warnings || [],
      footerNote: 'Beaver Bridges Ltd — Swept Path Analysis',
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      {/* Grid pattern background */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-4">
            <FiTruck className="text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">Construction Logistics</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Swept Path Analysis
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Vehicle turning analysis for site access planning, road design, and delivery route
            assessment
          </p>
        </motion.div>

        {/* Glass Toolbar */}
        <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3 mb-6">
          <Button
            onClick={exportPDF}
            disabled={!results}
            variant="ghost"
            className="border border-blue-500/50"
          >
            <FiDownload className="mr-2" /> Export PDF
          </Button>
          <Button
            onClick={exportDOCX}
            disabled={!results}
            variant="ghost"
            className="border border-blue-500/50"
          >
            <FiDownload className="mr-2" /> DOCX
          </Button>
          <div className="flex-1" />
          {results && (
            <SaveRunButton
              calculatorKey="swept-path"
              inputs={formData as unknown as Record<string, string | number>}
              results={results}
              status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
            />
          )}
        </div>

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
                activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'text-gray-400',
              )}
            >
              {tab === 'input' ? '🏗️ Input' : tab === 'results' ? '📊 Results' : '🎨 Visualization'}
            </Button>
          ))}
        </div>

        {/* Status Banner */}

        {activeTab === 'results' && results && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'mb-6 p-4 rounded-xl border-2 flex items-center justify-between',
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
                  {results.overallStatus === 'PASS' ? 'ACCESS FEASIBLE' : 'ACCESS RESTRICTED'}
                </span>
                <p className="text-gray-400 text-sm">
                  Swept path width: {results.sweptPathWidth.toFixed(2)}m, Clearance:{' '}
                  {results.clearanceMargin.toFixed(2)}m
                </p>
              </div>
            </div>
            {/* Preset Selector */}
            <div className="flex items-center gap-2 mr-auto">
              <select
                value=""
                onChange={(e) => e.target.value && applyPreset(e.target.value)}
                className="bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-sm"
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
            <div className="flex gap-2 flex-wrap">
              <Button onClick={exportPDF} variant="ghost" className="border border-blue-500/50">
                <FiDownload className="mr-2" /> Export PDF
              </Button>
              <Button onClick={exportDOCX} variant="ghost" className="border border-blue-500/50">
                <FiDownload className="mr-2" /> DOCX
              </Button>
              <SaveRunButton
                calculatorKey="swept-path"
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
                <span className="font-semibold text-yellow-400">Access Warnings</span>
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
                {/* Vehicle Selection */}
                <CollapsibleSection
                  title="Vehicle Selection"
                  icon={<FiTruck className="w-6 h-6 text-blue-400" />}
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-3 gap-3">
                    {Object.entries(VEHICLE_TYPES).map(([key, vehicle]) => (
                      <motion.button
                        key={key}
                        onClick={() => applyVehicleType(key)}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all text-left',
                          formData.vehicleType === key
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-800/30 hover:border-gray-600',
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm">{vehicle.name}</span>
                        </div>
                        <p className="text-gray-500 text-xs">{vehicle.category}</p>
                        <div className="mt-2 text-xs text-gray-400">
                          L: {vehicle.length}m, R: {vehicle.turningRadius}m
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* Vehicle Dimensions */}
                <CollapsibleSection
                  title="Vehicle Dimensions"
                  icon={<FiSettings className="w-6 h-6 text-blue-400" />}
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <ExplainableLabel
                        label="Vehicle Length (m)"
                        field="sweptpath-vehicle-length"
                      />
                      <input
                        title="Vehicle Length (m)"
                        type="number"
                        step="0.1"
                        value={formData.vehicleLength}
                        onChange={(e) => handleInputChange('vehicleLength', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <ExplainableLabel label="Vehicle Width (m)" field="sweptpath-vehicle-width" />
                      <input
                        title="Vehicle Width (m)"
                        type="number"
                        step="0.01"
                        value={formData.vehicleWidth}
                        onChange={(e) => handleInputChange('vehicleWidth', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <ExplainableLabel label="Wheelbase (m)" field="sweptpath-wheelbase" />
                      <input
                        title="Wheelbase (m)"
                        type="number"
                        step="0.1"
                        value={formData.wheelbase}
                        onChange={(e) => handleInputChange('wheelbase', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Front Overhang (m)
                      </label>
                      <input
                        title="Front Overhang (m)"
                        type="number"
                        step="0.1"
                        value={formData.frontOverhang}
                        onChange={(e) => handleInputChange('frontOverhang', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Rear Overhang (m)
                      </label>
                      <input
                        title="Rear Overhang (m)"
                        type="number"
                        step="0.1"
                        value={formData.rearOverhang}
                        onChange={(e) => handleInputChange('rearOverhang', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Min Turning Radius (m)
                      </label>
                      <input
                        title="Turning Radius"
                        type="number"
                        step="0.1"
                        value={formData.turningRadius}
                        onChange={(e) => handleInputChange('turningRadius', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Articulation Angle (°)
                      </label>
                      <input
                        title="Articulation Angle"
                        type="number"
                        step="1"
                        value={formData.articulationAngle}
                        onChange={(e) => handleInputChange('articulationAngle', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Road Geometry */}
                <CollapsibleSection
                  title="Road Geometry"
                  icon={<FiNavigation className="w-6 h-6 text-blue-400" />}
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <ExplainableLabel label="Road Width (m)" field="sweptpath-road-width" />
                      <input
                        title="Road Width (m)"
                        type="number"
                        step="0.1"
                        value={formData.roadWidth}
                        onChange={(e) => handleInputChange('roadWidth', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <ExplainableLabel label="Corner Radius (m)" field="sweptpath-corner-radius" />
                      <input
                        title="Corner Radius (m)"
                        type="number"
                        step="0.5"
                        value={formData.cornerRadius}
                        onChange={(e) => handleInputChange('cornerRadius', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Clearance Buffer (m)
                      </label>
                      <input
                        title="Clearance Buffer (m)"
                        type="number"
                        step="0.1"
                        value={formData.clearanceBuffer}
                        onChange={(e) => handleInputChange('clearanceBuffer', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Speed Limit (km/h)
                      </label>
                      <input
                        title="Speed Limit (km/h)"
                        type="number"
                        step="5"
                        value={formData.speedLimit}
                        onChange={(e) => handleInputChange('speedLimit', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Calculate Button */}
                <button
                  onClick={calculateResults}
                  disabled={isCalculating}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isCalculating ? (
                    <span className="flex items-center justify-center space-x-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Analysing Swept Path...</span>
                    </span>
                  ) : (
                    '▶ RUN FULL ANALYSIS'
                  )}
                </button>

                {/* Results */}

                {results && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <CollapsibleSection
                      title="Swept Path Results"
                      icon={<FiTarget className="w-6 h-6 text-blue-400" />}
                      defaultOpen={true}
                      status={results.overallStatus}
                    >
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="text-gray-400 text-sm mb-1">Inner Swept Radius</div>
                          <div className="text-2xl font-bold text-white">
                            {results.innerSweptRadius.toFixed(2)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="text-gray-400 text-sm mb-1">Outer Swept Radius</div>
                          <div className="text-2xl font-bold text-white">
                            {results.outerSweptRadius.toFixed(2)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="text-gray-400 text-sm mb-1">Swept Path Width</div>
                          <div className="text-2xl font-bold text-cyan-400">
                            {results.sweptPathWidth.toFixed(2)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="text-gray-400 text-sm mb-1">Required Road Width</div>
                          <div className="text-2xl font-bold text-blue-400">
                            {results.requiredRoadWidth.toFixed(2)} m
                          </div>
                        </div>
                        <div
                          className={cn(
                            'p-4 rounded-lg border shadow-lg',
                            results.clearanceMargin >= 0
                              ? 'bg-green-500/10 border-green-500/30 shadow-green-500/10'
                              : 'bg-red-500/10 border-red-500/30 shadow-red-500/10',
                          )}
                        >
                          <div className="text-gray-400 text-sm mb-1">Clearance Margin</div>
                          <div
                            className={cn(
                              'text-2xl font-bold',
                              results.clearanceMargin >= 0 ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {results.clearanceMargin >= 0 ? '+' : ''}
                            {results.clearanceMargin.toFixed(2)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="text-gray-400 text-sm mb-1">Rear Swing</div>
                          <div className="text-2xl font-bold text-amber-400">
                            {results.rearSwing.toFixed(2)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="text-gray-400 text-sm mb-1">Off-Tracking</div>
                          <div className="text-2xl font-bold text-white">
                            {results.trackingDifference.toFixed(2)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="text-gray-400 text-sm mb-1">Min Corner Radius</div>
                          <div className="text-2xl font-bold text-white">
                            {results.minCornerRadius.toFixed(2)} m
                          </div>
                        </div>
                      </div>
                    </CollapsibleSection>

                    {/* Recommendations */}
                    <Card variant="glass" className="border border-gray-700/50">
                      <CardHeader>
                        <CardTitle className="text-white font-semibold flex items-center gap-2">
                          <FiCheckCircle className="w-5 h-5 text-blue-400" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            Survey and clear access route before delivery
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            Consider temporary traffic control for large vehicles
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            Provide banksman guidance where tail swing exceeds 0.5 m
                          </li>
                          <li className="flex items-start gap-2 text-gray-300">
                            <FiCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            Reduce speed in tight corners and confined areas
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Right Column - Visualization */}
              <div className="space-y-6 sticky top-8">
                <WhatIfPreview
                  title="Swept Path — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <SweptPath3D />
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
                        <SweptPath3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        SWEPT PATH — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        {
                          label: 'Vehicle Length',
                          field: 'vehicleLength' as keyof FormData,
                          min: 4,
                          max: 25,
                          step: 0.5,
                          unit: 'm',
                        },
                        {
                          label: 'Vehicle Width',
                          field: 'vehicleWidth' as keyof FormData,
                          min: 1.5,
                          max: 4,
                          step: 0.05,
                          unit: 'm',
                        },
                        {
                          label: 'Wheelbase',
                          field: 'wheelbase' as keyof FormData,
                          min: 2,
                          max: 12,
                          step: 0.5,
                          unit: 'm',
                        },
                        {
                          label: 'Turning Radius',
                          field: 'turningRadius' as keyof FormData,
                          min: 5,
                          max: 25,
                          step: 0.5,
                          unit: 'm',
                        },
                        {
                          label: 'Road Width',
                          field: 'roadWidth' as keyof FormData,
                          min: 3,
                          max: 15,
                          step: 0.1,
                          unit: 'm',
                        },
                        {
                          label: 'Corner Radius',
                          field: 'cornerRadius' as keyof FormData,
                          min: 3,
                          max: 25,
                          step: 0.5,
                          unit: 'm',
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
                            value={formData[s.field]}
                            onChange={(e) => handleInputChange(s.field, parseFloat(e.target.value))}
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
                          {
                            label: 'Vehicle',
                            value: `${formData.vehicleLength}m × ${formData.vehicleWidth}m`,
                          },
                          { label: 'Wheelbase', value: `${formData.wheelbase}m` },
                          { label: 'Min Turn Radius', value: `${formData.turningRadius}m` },
                          { label: 'Road Width', value: `${formData.roadWidth}m` },
                          { label: 'Speed Limit', value: `${formData.speedLimit} km/h` },
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
                                label: 'Swept Width',
                                value: `${results.sweptPathWidth.toFixed(1)}m`,
                                status: results.overallStatus,
                              },
                              {
                                label: 'Req. Road Width',
                                value: `${results.requiredRoadWidth.toFixed(1)}m`,
                                status: results.overallStatus,
                              },
                              {
                                label: 'Off-tracking',
                                value: `${results.trackingDifference.toFixed(2)}m`,
                                status:
                                  results.trackingDifference > 2.5
                                    ? ('FAIL' as const)
                                    : ('PASS' as const),
                              },
                              {
                                label: 'Rear Swing',
                                value: `${results.rearSwing.toFixed(2)}m`,
                                status:
                                  results.rearSwing > 1 ? ('FAIL' as const) : ('PASS' as const),
                              },
                              {
                                label: 'Overall',
                                value: results.overallStatus,
                                status: results.overallStatus,
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
                                    check.status === 'FAIL' ? 'text-red-500' : 'text-emerald-400',
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

                {/* Reference Info */}
                <Card
                  variant="glass"
                  className="border border-gray-700/50 border-l-4 border-l-blue-400"
                >
                  <CardHeader>
                    <CardTitle className="text-white font-semibold flex items-center space-x-2">
                      <FiInfo className="text-gray-400" />
                      <span>Reference</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      <strong>Off-tracking:</strong> The difference between the path of the front
                      and rear wheels when turning.
                    </p>
                    <p>
                      <strong>Rear Swing:</strong> The outward movement of the rear of the vehicle
                      during a turn (tail swing).
                    </p>
                    <p>
                      <strong>Standard UK road widths:</strong>
                    </p>
                    <ul className="list-disc list-inside ml-2">
                      <li>Single carriageway: 6.0-7.3m</li>
                      <li>Two-way minor road: 5.5m</li>
                      <li>Access road: 4.1-4.8m</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SweptPath;
