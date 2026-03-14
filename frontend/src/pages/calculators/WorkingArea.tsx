// =============================================================================
// Working Area Calculator — Equipment Space Requirements
// Construction Logistics — Site Planning
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBox,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiInfo,
  FiLayers,
  FiMinimize2,
  FiSettings,
  FiSliders,
  FiTarget,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import type { ReportData } from '../../lib/pdf/types';
import { cn } from '../../lib/utils';

import { generateDOCX } from '../../lib/docxGenerator';
import { generatePremiumPDF } from '../../lib/pdfGenerator';

import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import WorkingArea3D from '../../components/3d/scenes/WorkingArea3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import WhatIfPreview from '../../components/WhatIfPreview';
import { validateNumericInputs } from '../../lib/validation';
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  equipmentType: string;
  operationRadius: number;
  tailSwing: number;
  safetyBuffer: number;
  pedestrianBuffer: number;
  materialStorage: number;
  accessWidth: number;
  siteLength: number;
  siteWidth: number;
  existingObstacles: number;
  workingHeight: number;
  groundCondition: string;
}

interface Results {
  overallStatus: 'PASS' | 'FAIL';
  minWorkingArea: number;
  exclusionZoneRadius: number;
  exclusionZoneArea: number;
  totalRequiredArea: number;
  availableSiteArea: number;
  areaUtilisation: number;
  clearanceZone: number;
  overheadClearance: number;
  accessRouteArea: number;
  storageArea: number;
  warnings: string[];
  recommendations: string[];
}

// =============================================================================
// EQUIPMENT DATABASE
// =============================================================================

const EQUIPMENT_TYPES: Record<
  string,
  {
    name: string;
    operationRadius: number;
    tailSwing: number;
    minSafetyBuffer: number;
    category: string;
    workingHeight: number;
    groundPressure: number; // kN/m²
    description: string;
  }
> = {
  excavator_8t: {
    name: 'Excavator 8t',
    operationRadius: 6.5,
    tailSwing: 1.5,
    minSafetyBuffer: 3.0,
    category: 'Earthworks',
    workingHeight: 8.0,
    groundPressure: 45,
    description: 'Mini excavator for confined spaces',
  },
  excavator_13t: {
    name: 'Excavator 13t',
    operationRadius: 8.5,
    tailSwing: 2.0,
    minSafetyBuffer: 3.0,
    category: 'Earthworks',
    workingHeight: 10.0,
    groundPressure: 55,
    description: 'Medium excavator for general works',
  },
  excavator_20t: {
    name: 'Excavator 20t',
    operationRadius: 10.0,
    tailSwing: 2.5,
    minSafetyBuffer: 4.0,
    category: 'Earthworks',
    workingHeight: 12.0,
    groundPressure: 65,
    description: 'Standard site excavator',
  },
  excavator_30t: {
    name: 'Excavator 30t',
    operationRadius: 12.0,
    tailSwing: 3.0,
    minSafetyBuffer: 5.0,
    category: 'Earthworks',
    workingHeight: 14.0,
    groundPressure: 75,
    description: 'Large excavator for major works',
  },
  mobile_crane_30t: {
    name: 'Mobile Crane 30t',
    operationRadius: 25.0,
    tailSwing: 4.0,
    minSafetyBuffer: 6.0,
    category: 'Lifting',
    workingHeight: 35.0,
    groundPressure: 150,
    description: 'General purpose mobile crane',
  },
  mobile_crane_50t: {
    name: 'Mobile Crane 50t',
    operationRadius: 35.0,
    tailSwing: 5.0,
    minSafetyBuffer: 8.0,
    category: 'Lifting',
    workingHeight: 45.0,
    groundPressure: 200,
    description: 'Medium lift capacity crane',
  },
  mobile_crane_100t: {
    name: 'Mobile Crane 100t',
    operationRadius: 50.0,
    tailSwing: 6.0,
    minSafetyBuffer: 10.0,
    category: 'Lifting',
    workingHeight: 60.0,
    groundPressure: 300,
    description: 'Heavy lift crane',
  },
  tower_crane: {
    name: 'Tower Crane',
    operationRadius: 60.0,
    tailSwing: 8.0,
    minSafetyBuffer: 10.0,
    category: 'Lifting',
    workingHeight: 80.0,
    groundPressure: 400,
    description: 'Fixed tower crane',
  },
  telehandler_4t: {
    name: 'Telehandler 4t',
    operationRadius: 10.0,
    tailSwing: 1.5,
    minSafetyBuffer: 3.0,
    category: 'Material Handling',
    workingHeight: 14.0,
    groundPressure: 100,
    description: 'Versatile material handler',
  },
  piling_rig: {
    name: 'Piling Rig',
    operationRadius: 8.0,
    tailSwing: 3.0,
    minSafetyBuffer: 5.0,
    category: 'Foundation',
    workingHeight: 25.0,
    groundPressure: 120,
    description: 'Bored piling equipment',
  },
  concrete_pump: {
    name: 'Concrete Pump',
    operationRadius: 40.0,
    tailSwing: 2.0,
    minSafetyBuffer: 4.0,
    category: 'Concreting',
    workingHeight: 35.0,
    groundPressure: 80,
    description: 'Boom concrete pump',
  },
  mewp_scissor: {
    name: 'Scissor Lift MEWP',
    operationRadius: 3.0,
    tailSwing: 0,
    minSafetyBuffer: 2.0,
    category: 'Access',
    workingHeight: 12.0,
    groundPressure: 35,
    description: 'Vertical access platform',
  },
  mewp_boom: {
    name: 'Boom Lift MEWP',
    operationRadius: 20.0,
    tailSwing: 2.0,
    minSafetyBuffer: 3.0,
    category: 'Access',
    workingHeight: 25.0,
    groundPressure: 50,
    description: 'Articulated boom lift',
  },
};

const GROUND_CONDITIONS: Record<
  string,
  {
    name: string;
    bearingCapacity: number;
    description: string;
  }
> = {
  concrete: {
    name: 'Concrete/Hardstanding',
    bearingCapacity: 500,
    description: 'Reinforced concrete slab',
  },
  compacted: {
    name: 'Compacted Aggregate',
    bearingCapacity: 200,
    description: 'Well-compacted granular',
  },
  firm_ground: { name: 'Firm Ground', bearingCapacity: 100, description: 'Undisturbed firm soil' },
  soft_ground: { name: 'Soft Ground', bearingCapacity: 50, description: 'Soft clay or fill' },
  very_soft: { name: 'Very Soft Ground', bearingCapacity: 25, description: 'Wet or organic soil' },
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
        !status && 'border-teal-500/30',
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors rounded-t-xl"
      >
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
              status === 'PASS' && 'from-green-500/20 to-emerald-500/20 text-green-400',
              status === 'FAIL' && 'from-red-500/20 to-rose-500/20 text-red-400',
              !status && 'from-blue-500/20 to-purple-500/20 text-blue-400',
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
  standard_crane: {
    name: 'Crane Working Area',
    areaType: 'crane',
    length: '20',
    width: '15',
  },
  scaffold_zone: {
    name: 'Scaffolding Zone',
    areaType: 'scaffold',
    length: '30',
    width: '3',
  },
  exclusion_zone: {
    name: 'Exclusion Zone',
    areaType: 'exclusion',
    length: '10',
    width: '10',
  },
};

const WorkingArea: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    equipmentType: 'mobile_crane_50t',
    operationRadius: 35.0,
    tailSwing: 5.0,
    safetyBuffer: 8.0,
    pedestrianBuffer: 2.0,
    materialStorage: 50,
    accessWidth: 6.0,
    siteLength: 80,
    siteWidth: 60,
    existingObstacles: 0,
    workingHeight: 45.0,
    groundCondition: 'compacted',
  });
  // What-If sliders
  const whatIfSliders = [
    { key: 'operationRadius', label: 'Operation Radius', min: 3, max: 60, step: 1, unit: 'm' },
    { key: 'safetyBuffer', label: 'Safety Buffer', min: 2, max: 15, step: 0.5, unit: 'm' },
    { key: 'siteLength', label: 'Site Length', min: 20, max: 200, step: 5, unit: 'm' },
    { key: 'siteWidth', label: 'Site Width', min: 10, max: 150, step: 5, unit: 'm' },
    { key: 'materialStorage', label: 'Material Storage', min: 0, max: 200, step: 10, unit: 'm²' },
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
      { key: 'operationRadius', label: 'Operation Radius' },
      { key: 'tailSwing', label: 'Tail Swing', allowZero: true },
      { key: 'safetyBuffer', label: 'Safety Buffer' },
      { key: 'pedestrianBuffer', label: 'Pedestrian Buffer', allowZero: true },
      { key: 'materialStorage', label: 'Material Storage', allowZero: true },
      { key: 'accessWidth', label: 'Access Width' },
      { key: 'siteLength', label: 'Site Length' },
      { key: 'siteWidth', label: 'Site Width' },
      { key: 'existingObstacles', label: 'Existing Obstacles', allowZero: true },
      { key: 'workingHeight', label: 'Working Height' },
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
        typeof value === 'string' &&
        !isNaN(Number(value)) &&
        !['equipmentType', 'groundCondition'].includes(key)
          ? Number(value)
          : value,
    }));
    setResults(null);
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key as keyof typeof PRESETS];
    if (!preset) return;
    setFormData((prev) => ({
      ...prev,
      siteLength: Number(preset.length),
      siteWidth: Number(preset.width),
    }));
    setResults(null);
  };

  const applyEquipmentType = (type: string) => {
    const equipment = EQUIPMENT_TYPES[type];
    if (!equipment) return;
    setFormData((prev) => ({
      ...prev,
      equipmentType: type,
      operationRadius: equipment.operationRadius,
      tailSwing: equipment.tailSwing,
      safetyBuffer: equipment.minSafetyBuffer,
      workingHeight: equipment.workingHeight,
    }));
    setResults(null);
  };

  const calculateResults = () => {
    if (!validateInputs()) return;
    setIsCalculating(true);

    setTimeout(() => {
      const equipment = EQUIPMENT_TYPES[formData.equipmentType];
      const ground = GROUND_CONDITIONS[formData.groundCondition];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Exclusion zone calculation (swing radius + safety buffer)
      const exclusionZoneRadius = Math.max(
        formData.operationRadius,
        formData.tailSwing + formData.safetyBuffer,
      );

      // Circular exclusion zone area
      const exclusionZoneArea = Math.PI * Math.pow(exclusionZoneRadius, 2);

      // Pedestrian buffer zone
      const clearanceZone = exclusionZoneRadius + formData.pedestrianBuffer;
      const totalExclusionArea = Math.PI * Math.pow(clearanceZone, 2);

      // Access route area (rectangular approach)
      const accessRouteArea = formData.accessWidth * (exclusionZoneRadius + 10);

      // Material storage area
      const storageArea = formData.materialStorage;

      // Minimum working area (equipment zone + access + storage)
      const minWorkingArea = totalExclusionArea + accessRouteArea + storageArea;

      // Total required area with contingency
      const totalRequiredArea = minWorkingArea * 1.15; // 15% contingency

      // Available site area
      const availableSiteArea =
        formData.siteLength * formData.siteWidth - formData.existingObstacles;

      // Area utilisation
      const areaUtilisation = (totalRequiredArea / availableSiteArea) * 100;

      // Overhead clearance requirement
      const overheadClearance = formData.workingHeight + 2.0; // 2m clearance

      // Ground condition check
      if (equipment && ground) {
        if (equipment.groundPressure > ground.bearingCapacity) {
          warnings.push(
            `Ground bearing capacity (${ground.bearingCapacity} kN/m²) insufficient for equipment (${equipment.groundPressure} kN/m²)`,
          );
          recommendations.push('Install crane mats or improve ground preparation');
        }
      }

      // Space check
      if (areaUtilisation > 100) {
        warnings.push(
          `Insufficient site area: need ${totalRequiredArea.toFixed(0)}m², have ${availableSiteArea.toFixed(0)}m²`,
        );
        recommendations.push('Consider phased operations or alternative equipment');
      }

      if (areaUtilisation > 80) {
        warnings.push('Site utilisation above 80% - limited maneuvering space');
        recommendations.push('Plan careful sequencing of operations');
      }

      // Access width check
      if (formData.accessWidth < 4.0) {
        warnings.push('Access width below 4.0m - restricted vehicle access');
        recommendations.push('Ensure one-way traffic management');
      }

      // Pedestrian exclusion
      if (formData.pedestrianBuffer < 2.0) {
        warnings.push('Pedestrian buffer below recommended 2.0m minimum');
      }

      // Overhead hazards
      if (formData.workingHeight > 20) {
        recommendations.push('Establish overhead exclusion zone for falling objects');
        recommendations.push('Consider wind speed monitoring for lifts');
      }

      const overallStatus: 'PASS' | 'FAIL' =
        areaUtilisation <= 100 &&
        (equipment && ground ? equipment.groundPressure <= ground.bearingCapacity : true)
          ? 'PASS'
          : 'FAIL';

      setResults({
        overallStatus,
        minWorkingArea,
        exclusionZoneRadius,
        exclusionZoneArea,
        totalRequiredArea,
        availableSiteArea,
        areaUtilisation,
        clearanceZone,
        overheadClearance,
        accessRouteArea,
        storageArea,
        warnings,
        recommendations,
      });

      setActiveTab('results');
      setIsCalculating(false);
    }, 1000);
  };

  // Canvas visualization

  const buildReportData = (): ReportData => {
    const equipment = EQUIPMENT_TYPES[formData.equipmentType];
    const ground = GROUND_CONDITIONS[formData.groundCondition];

    return {
      title: 'Working Area Requirements Report',
      subtitle: 'Equipment Space & Exclusion Zone Assessment',
      projectInfo: [
        { label: 'Equipment Type', value: equipment?.name || 'Custom' },
        { label: 'Equipment Category', value: equipment?.category || 'N/A' },
        { label: 'Ground Condition', value: ground?.name || 'Unknown' },
        { label: 'Site Dimensions', value: `${formData.siteLength}m × ${formData.siteWidth}m` },
      ],
      inputs: [
        { label: 'Operation Radius', value: formData.operationRadius, unit: 'm' },
        { label: 'Tail Swing', value: formData.tailSwing, unit: 'm' },
        { label: 'Safety Buffer', value: formData.safetyBuffer, unit: 'm' },
        { label: 'Pedestrian Buffer', value: formData.pedestrianBuffer, unit: 'm' },
        { label: 'Material Storage Area', value: formData.materialStorage, unit: 'm²' },
        { label: 'Access Width', value: formData.accessWidth, unit: 'm' },
        { label: 'Working Height', value: formData.workingHeight, unit: 'm' },
      ],
      results: results
        ? [
            {
              label: 'Exclusion Zone Radius',
              value: results.exclusionZoneRadius.toFixed(2),
              unit: 'm',
            },
            {
              label: 'Exclusion Zone Area',
              value: results.exclusionZoneArea.toFixed(0),
              unit: 'm²',
            },
            { label: 'Clearance Zone', value: results.clearanceZone.toFixed(2), unit: 'm' },
            { label: 'Minimum Working Area', value: results.minWorkingArea.toFixed(0), unit: 'm²' },
            {
              label: 'Total Required Area',
              value: results.totalRequiredArea.toFixed(0),
              unit: 'm²',
            },
            {
              label: 'Available Site Area',
              value: results.availableSiteArea.toFixed(0),
              unit: 'm²',
            },
            { label: 'Area Utilisation', value: results.areaUtilisation.toFixed(1), unit: '%' },
            { label: 'Overhead Clearance', value: results.overheadClearance.toFixed(1), unit: 'm' },
          ]
        : [],
      checks: results
        ? [
            {
              name: 'Site Area Adequacy',
              capacity: `${results.availableSiteArea.toFixed(0)} m² available`,
              utilisation: `${results.areaUtilisation.toFixed(0)}%`,
              status: results.areaUtilisation <= 100 ? 'PASS' : 'FAIL',
            },
            {
              name: 'Ground Bearing',
              capacity: `${ground?.bearingCapacity || 0} kN/m²`,
              utilisation: equipment
                ? `${((equipment.groundPressure / (ground?.bearingCapacity || 1)) * 100).toFixed(0)}%`
                : 'N/A',
              status:
                equipment && ground && equipment.groundPressure <= ground.bearingCapacity
                  ? 'PASS'
                  : 'FAIL',
            },
          ]
        : [],
      sections: [
        {
          title: 'Design Basis',
          content:
            'Working area requirements calculated based on equipment operating envelope, tail swing clearance, and safety buffer zones in accordance with construction site planning best practices.',
        },
      ],
      warnings: results?.warnings || [],
      notes: [
        'Exclusion zones must be clearly marked on site',
        'Banksman required for all equipment movements',
        'Regular ground condition monitoring during operations',
        'Wind speed limits apply for high-level operations',
      ],
      recommendations:
        results?.recommendations.map((r) => ({ check: 'Site Setup', suggestion: r })) || [],
      overallStatus: results?.overallStatus || 'FAIL',
      footerNote: 'Beaver Bridges Ltd • Working Area Requirements Report',
    };
  };

  const exportPDF = () => {
    if (!results) return;
    generatePremiumPDF({
      title: 'Working Area Assessment',
      subtitle: 'Site Layout Analysis',
      projectInfo: [
        { label: 'Project', value: '-' },
        { label: 'Reference', value: 'WOR001' },
        { label: 'Standard', value: 'CDM 2015 / BS 5975' },
      ],
      inputs: [
        { label: 'Equipment Type', value: formData.equipmentType },
        { label: 'Operation Radius', value: String(formData.operationRadius), unit: 'm' },
        { label: 'Tail Swing', value: String(formData.tailSwing), unit: 'm' },
        { label: 'Safety Buffer', value: String(formData.safetyBuffer), unit: 'm' },
        { label: 'Pedestrian Buffer', value: String(formData.pedestrianBuffer), unit: 'm' },
        {
          label: 'Site Dimensions',
          value: `${formData.siteLength} × ${formData.siteWidth}`,
          unit: 'm',
        },
        { label: 'Working Height', value: String(formData.workingHeight), unit: 'm' },
        { label: 'Ground Condition', value: formData.groundCondition },
      ],
      sections: [
        {
          title: 'Area Requirements',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Min Working Area', results.minWorkingArea.toFixed(1), 'm²'],
            ['Exclusion Zone Radius', results.exclusionZoneRadius.toFixed(1), 'm'],
            ['Exclusion Zone Area', results.exclusionZoneArea.toFixed(1), 'm²'],
            ['Access Route Area', results.accessRouteArea.toFixed(1), 'm²'],
            ['Storage Area', results.storageArea.toFixed(1), 'm²'],
            ['Total Required Area', results.totalRequiredArea.toFixed(1), 'm²'],
            ['Available Site Area', results.availableSiteArea.toFixed(1), 'm²'],
            ['Overhead Clearance', results.overheadClearance.toFixed(1), 'm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Area Adequacy',
          capacity: `${results.availableSiteArea.toFixed(1)} m²`,
          utilisation: String(results.areaUtilisation.toFixed(1)) + '%',
          status: results.overallStatus,
        },
      ],
      recommendations: results.recommendations.map((r) => ({ check: 'Site Setup', suggestion: r })),
      warnings: results.warnings,
      footerNote: 'Beaver Bridges Ltd — Working Area Assessment',
    });
  };

  const exportDOCX = () => {
    if (!results) return;
    generateDOCX({
      title: 'Working Area Assessment',
      subtitle: 'Site Layout Analysis',
      projectInfo: [
        { label: 'Project', value: '-' },
        { label: 'Reference', value: 'WOR001' },
        { label: 'Standard', value: 'CDM 2015 / BS 5975' },
      ],
      inputs: [
        { label: 'Equipment Type', value: formData.equipmentType },
        { label: 'Operation Radius', value: String(formData.operationRadius), unit: 'm' },
        { label: 'Tail Swing', value: String(formData.tailSwing), unit: 'm' },
        { label: 'Safety Buffer', value: String(formData.safetyBuffer), unit: 'm' },
        { label: 'Pedestrian Buffer', value: String(formData.pedestrianBuffer), unit: 'm' },
        {
          label: 'Site Dimensions',
          value: `${formData.siteLength} × ${formData.siteWidth}`,
          unit: 'm',
        },
        { label: 'Working Height', value: String(formData.workingHeight), unit: 'm' },
        { label: 'Ground Condition', value: formData.groundCondition },
      ],
      sections: [
        {
          title: 'Area Requirements',
          head: [['Parameter', 'Value', 'Unit']],
          body: [
            ['Min Working Area', results.minWorkingArea.toFixed(1), 'm²'],
            ['Exclusion Zone Radius', results.exclusionZoneRadius.toFixed(1), 'm'],
            ['Exclusion Zone Area', results.exclusionZoneArea.toFixed(1), 'm²'],
            ['Access Route Area', results.accessRouteArea.toFixed(1), 'm²'],
            ['Storage Area', results.storageArea.toFixed(1), 'm²'],
            ['Total Required Area', results.totalRequiredArea.toFixed(1), 'm²'],
            ['Available Site Area', results.availableSiteArea.toFixed(1), 'm²'],
            ['Overhead Clearance', results.overheadClearance.toFixed(1), 'm'],
          ],
        },
      ],
      checks: [
        {
          name: 'Area Adequacy',
          capacity: `${results.availableSiteArea.toFixed(1)} m²`,
          utilisation: String(results.areaUtilisation.toFixed(1)) + '%',
          status: results.overallStatus,
        },
      ],
      recommendations: results.recommendations.map((r) => ({ check: 'Site Setup', suggestion: r })),
      warnings: results.warnings,
      footerNote: 'Beaver Bridges Ltd — Working Area Assessment',
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
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/30 mb-4">
            <FiTarget className="text-teal-400" />
            <span className="text-teal-300 text-sm font-medium">Construction Logistics</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Working Area Calculator
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Calculate minimum working areas, exclusion zones, and site space requirements for
            construction equipment
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
                  {results.overallStatus === 'PASS' ? 'ADEQUATE SPACE' : 'INSUFFICIENT SPACE'}
                </span>
                <p className="text-gray-400 text-sm">
                  Required: {results.totalRequiredArea.toFixed(0)}m² | Utilisation:{' '}
                  {results.areaUtilisation.toFixed(0)}%
                </p>
              </div>
            </div>
            {/* Preset Selector */}
            <div className="flex items-center gap-2 mr-auto">
              <select
                value=""
                onChange={(e) => e.target.value && applyPreset(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-3 bg-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-xl p-3">
                <Button onClick={exportPDF} variant="ghost" className="border border-gray-700/50">
                  <FiDownload className="mr-2" /> Export PDF
                </Button>
                <Button onClick={exportDOCX} variant="ghost" className="border border-gray-700/50">
                  <FiDownload className="mr-2" /> DOCX
                </Button>
                <SaveRunButton
                  calculatorKey="working-area"
                  inputs={formData as unknown as Record<string, string | number>}
                  results={results}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                />
              </div>
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
                <span className="font-semibold text-yellow-400">Warnings</span>
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
                {/* Equipment Selection */}
                <CollapsibleSection
                  title="Equipment Selection"
                  icon={<FiBox className="w-6 h-6" />}
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-3 gap-3">
                    {Object.entries(EQUIPMENT_TYPES).map(([key, equipment]) => (
                      <motion.button
                        key={key}
                        onClick={() => applyEquipmentType(key)}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all text-left',
                          formData.equipmentType === key
                            ? 'border-teal-500 bg-teal-500/10'
                            : 'border-gray-700 bg-gray-800/30 hover:border-gray-600',
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm">{equipment.name}</span>
                        </div>
                        <p className="text-gray-500 text-xs">{equipment.category}</p>
                        <div className="mt-2 text-xs text-gray-400">
                          R: {equipment.operationRadius}m, H: {equipment.workingHeight}m
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </CollapsibleSection>

                {/* Equipment Parameters */}
                <CollapsibleSection
                  title="Equipment Parameters"
                  icon={<FiSettings className="w-6 h-6" />}
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <ExplainableLabel
                        label="Operation Radius (m)"
                        field="workarea-operation-radius"
                      />
                      <input
                        title="Operation Radius (m)"
                        type="number"
                        step="0.5"
                        value={formData.operationRadius}
                        onChange={(e) => handleInputChange('operationRadius', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <ExplainableLabel label="Tail Swing (m)" field="workarea-tail-swing" />
                      <input
                        title="Tail Swing (m)"
                        type="number"
                        step="0.1"
                        value={formData.tailSwing}
                        onChange={(e) => handleInputChange('tailSwing', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <ExplainableLabel label="Safety Buffer (m)" field="workarea-safety-buffer" />
                      <input
                        title="Safety Buffer (m)"
                        type="number"
                        step="0.5"
                        value={formData.safetyBuffer}
                        onChange={(e) => handleInputChange('safetyBuffer', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Pedestrian Buffer (m)
                      </label>
                      <input
                        title="Pedestrian Buffer (m)"
                        type="number"
                        step="0.5"
                        value={formData.pedestrianBuffer}
                        onChange={(e) => handleInputChange('pedestrianBuffer', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Working Height (m)
                      </label>
                      <input
                        title="Working Height (m)"
                        type="number"
                        step="1"
                        value={formData.workingHeight}
                        onChange={(e) => handleInputChange('workingHeight', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Ground Condition
                      </label>
                      <select
                        title="Ground Condition"
                        value={formData.groundCondition}
                        onChange={(e) => handleInputChange('groundCondition', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      >
                        {Object.entries(GROUND_CONDITIONS).map(([key, g]) => (
                          <option key={key} value={key}>
                            {g.name} ({g.bearingCapacity} kN/m²)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Site Constraints */}
                <CollapsibleSection
                  title="Site Constraints"
                  icon={<FiTarget className="w-6 h-6" />}
                  defaultOpen={true}
                >
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <ExplainableLabel label="Site Length (m)" field="workarea-site-length" />
                      <input
                        title="Site Length (m)"
                        type="number"
                        step="1"
                        value={formData.siteLength}
                        onChange={(e) => handleInputChange('siteLength', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <ExplainableLabel label="Site Width (m)" field="workarea-site-width" />
                      <input
                        title="Site Width (m)"
                        type="number"
                        step="1"
                        value={formData.siteWidth}
                        onChange={(e) => handleInputChange('siteWidth', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Material Storage (m²)
                      </label>
                      <input
                        title="Material Storage (m²)"
                        type="number"
                        step="5"
                        value={formData.materialStorage}
                        onChange={(e) => handleInputChange('materialStorage', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Access Width (m)
                      </label>
                      <input
                        title="Access Width (m)"
                        type="number"
                        step="0.5"
                        value={formData.accessWidth}
                        onChange={(e) => handleInputChange('accessWidth', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Calculate Button */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <button
                    onClick={calculateResults}
                    disabled={isCalculating}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isCalculating ? (
                      <span className="flex items-center justify-center space-x-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Calculating Requirements...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center space-x-2">
                        <span>▶ RUN FULL ANALYSIS</span>
                      </span>
                    )}
                  </button>
                </motion.div>

                {/* Results */}

                {results && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <CollapsibleSection
                      title="Area Requirements"
                      icon={<FiLayers className="w-6 h-6" />}
                      defaultOpen={true}
                      status={results.overallStatus}
                    >
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 border-l-4 border-l-amber-400">
                          <div className="text-gray-400 text-sm mb-1">Exclusion Zone Radius</div>
                          <div className="text-2xl font-bold text-amber-400">
                            {results.exclusionZoneRadius.toFixed(2)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 border-l-4 border-l-red-400">
                          <div className="text-gray-400 text-sm mb-1">Clearance Zone Radius</div>
                          <div className="text-2xl font-bold text-red-400">
                            {results.clearanceZone.toFixed(2)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 border-l-4 border-l-blue-400">
                          <div className="text-gray-400 text-sm mb-1">Exclusion Zone Area</div>
                          <div className="text-2xl font-bold text-white">
                            {results.exclusionZoneArea.toFixed(0)} m²
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 border-l-4 border-l-blue-400">
                          <div className="text-gray-400 text-sm mb-1">Minimum Working Area</div>
                          <div className="text-2xl font-bold text-teal-400">
                            {results.minWorkingArea.toFixed(0)} m²
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 border-l-4 border-l-green-400">
                          <div className="text-gray-400 text-sm mb-1">Total Required Area</div>
                          <div className="text-2xl font-bold text-emerald-400">
                            {results.totalRequiredArea.toFixed(0)} m²
                          </div>
                        </div>
                        <div
                          className={cn(
                            'p-4 rounded-lg border',
                            results.areaUtilisation <= 100
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-red-500/10 border-red-500/30',
                          )}
                        >
                          <div className="text-gray-400 text-sm mb-1">Site Utilisation</div>
                          <div
                            className={cn(
                              'text-2xl font-bold',
                              results.areaUtilisation <= 100 ? 'text-green-400' : 'text-red-400',
                            )}
                          >
                            {results.areaUtilisation.toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 border-l-4 border-l-blue-400">
                          <div className="text-gray-400 text-sm mb-1">Overhead Clearance</div>
                          <div className="text-2xl font-bold text-white">
                            {results.overheadClearance.toFixed(1)} m
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 border-l-4 border-l-blue-400">
                          <div className="text-gray-400 text-sm mb-1">Available Site Area</div>
                          <div className="text-2xl font-bold text-white">
                            {results.availableSiteArea.toFixed(0)} m²
                          </div>
                        </div>

                        {results.recommendations.length > 0 && (
                          <div className="mt-4 p-4 rounded-lg bg-teal-500/10 border border-teal-500/30">
                            <h4 className="text-teal-400 font-semibold text-sm mb-3 flex items-center gap-2">
                              <FiCheck className="w-4 h-4" /> Recommendations
                            </h4>
                            <ul className="space-y-2">
                              {results.recommendations.map((r, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-gray-300"
                                >
                                  <FiCheck className="w-3 h-3 text-teal-400 mt-1 flex-shrink-0" />
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  </motion.div>
                )}
              </div>

              {/* Right Column - Visualization */}
              <div className="space-y-6 sticky top-8">
                <WhatIfPreview
                  title="Working Area — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={(results?.overallStatus ?? undefined) as 'PASS' | 'FAIL' | undefined}
                  onMaximize={() => setPreviewMaximized(true)}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[8, 6, 8]}>
                      <WorkingArea3D />
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
                        <WorkingArea3D />
                      </Interactive3DDiagram>
                      <button
                        onClick={() => setPreviewMaximized(false)}
                        className="absolute top-4 right-4 p-2 bg-gray-900/80 border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-gray-800 transition-colors z-10"
                        aria-label="Minimize preview"
                      >
                        <FiMinimize2 size={20} />
                      </button>
                      <div className="absolute top-4 left-4 text-neon-cyan/60 text-xs font-mono z-10">
                        WORKING AREA — REAL-TIME PREVIEW
                      </div>
                    </div>
                    <div className="w-80 bg-gray-900/90 border-l border-neon-cyan/20 overflow-y-auto p-5 space-y-4">
                      <h3 className="text-sm font-bold text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                        <FiSliders size={14} /> Live Parameters
                      </h3>
                      {[
                        {
                          label: 'Operation Radius',
                          field: 'operationRadius' as keyof FormData,
                          min: 5,
                          max: 80,
                          step: 1,
                          unit: 'm',
                        },
                        {
                          label: 'Tail Swing',
                          field: 'tailSwing' as keyof FormData,
                          min: 0,
                          max: 15,
                          step: 0.5,
                          unit: 'm',
                        },
                        {
                          label: 'Safety Buffer',
                          field: 'safetyBuffer' as keyof FormData,
                          min: 1,
                          max: 20,
                          step: 0.5,
                          unit: 'm',
                        },
                        {
                          label: 'Access Width',
                          field: 'accessWidth' as keyof FormData,
                          min: 3,
                          max: 12,
                          step: 0.5,
                          unit: 'm',
                        },
                        {
                          label: 'Site Length',
                          field: 'siteLength' as keyof FormData,
                          min: 20,
                          max: 200,
                          step: 5,
                          unit: 'm',
                        },
                        {
                          label: 'Site Width',
                          field: 'siteWidth' as keyof FormData,
                          min: 20,
                          max: 200,
                          step: 5,
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
                          { label: 'Op. Radius', value: `${formData.operationRadius}m` },
                          {
                            label: 'Site',
                            value: `${formData.siteLength}m × ${formData.siteWidth}m`,
                          },
                          { label: 'Working Height', value: `${formData.workingHeight}m` },
                          { label: 'Safety Buffer', value: `${formData.safetyBuffer}m` },
                          { label: 'Ground', value: formData.groundCondition },
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
                                label: 'Exclusion Zone',
                                value: `${results.exclusionZoneRadius.toFixed(1)}m R`,
                                status: results.overallStatus,
                              },
                              {
                                label: 'Total Req. Area',
                                value: `${results.totalRequiredArea.toFixed(0)} m²`,
                                status: results.overallStatus,
                              },
                              {
                                label: 'Available Area',
                                value: `${results.availableSiteArea.toFixed(0)} m²`,
                                status: results.overallStatus,
                              },
                              {
                                label: 'Area Util.',
                                value: `${results.areaUtilisation.toFixed(0)}%`,
                                status:
                                  results.areaUtilisation > 100
                                    ? ('FAIL' as const)
                                    : results.areaUtilisation > 80
                                      ? ('WARNING' as const)
                                      : ('PASS' as const),
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
                                    check.status === 'FAIL'
                                      ? 'text-red-500'
                                      : check.status === 'WARNING'
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

                {/* Reference Info */}
                <Card
                  variant="glass"
                  className="border border-gray-700/50 border-l-4 border-l-blue-400"
                >
                  <CardHeader>
                    <CardTitle className="text-white font-semibold flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <FiInfo className="w-6 h-6 text-blue-400" />
                      </div>
                      <span>Safety Guidelines</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-400 space-y-2">
                    <p>
                      <strong>Exclusion Zone:</strong> No unauthorized personnel within this area
                      during operations.
                    </p>
                    <p>
                      <strong>Minimum Buffers:</strong>
                    </p>
                    <ul className="list-disc list-inside ml-2">
                      <li>Excavators: 3-5m from swing</li>
                      <li>Mobile Cranes: 6-10m from counterweight</li>
                      <li>Pedestrians: minimum 2m from all zones</li>
                    </ul>
                    <p>
                      <strong>Ground Preparation:</strong> Verify bearing capacity before
                      positioning heavy equipment.
                    </p>
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

export default WorkingArea;
