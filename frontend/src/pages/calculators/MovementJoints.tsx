// =============================================================================
// Movement Joints Calculator — Premium Edition
// EN 1991-1-5 Bridge Expansion Joint Movement Assessment
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiEye,
  FiLayers,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import MovementJoints3D from '../../components/3d/scenes/MovementJoints3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview, { type WhatIfSlider } from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { buildMovementJointsReport } from '../../lib/pdf/builders/movementJointsBuilder';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface FormData {
  bridgeType: string;
  spanLength: string;
  deckWidth: string;
  jointLocation: string;
  minTemperature: string;
  maxTemperature: string;
  meanTemperature: string;
  thermalCoefficient: string;
  creepCoefficient: string;
  shrinkageStrain: string;
  jointType: string;
  numberOfGaps: string;
  jointDepth: string;
  seismicZone: string;
  seismicDisplacement: string;
  safetyFactor: string;
  serviceLife: string;
}

interface Results {
  thermal_expansion_mm: number;
  thermal_contraction_mm: number;
  thermal_movement_mm: number;
  creep_movement_mm: number;
  shrinkage_movement_mm: number;
  seismic_movement_mm: number;
  total_movement_mm: number;
  design_movement_mm: number;
  design_gap_mm: number;
  joint_width_mm: number;
  total_joint_width_mm: number;
  seal_thickness_mm: number;
  joint_capacity: {
    movement_capacity_percent: number;
    min_gap_mm: number;
    max_gap_mm: number;
  };
  movement_checks: {
    thermal_movement: { utilisation: number; status: string };
    joint_capacity: { utilisation: number; status: string };
    service_life: { utilisation: number; status: string };
  };
  recommendations: string[];
  warnings: string[];
  notes: string[];
}

// =============================================================================
// JOINT TYPE CAPACITIES
// =============================================================================

const JOINT_CAPACITY: Record<string, { maxMovement: number; label: string }> = {
  compression_seal: { maxMovement: 45, label: 'Compression Seal (≤45mm)' },
  strip_seal: { maxMovement: 80, label: 'Strip Seal (≤80mm)' },
  modular_seal: { maxMovement: 600, label: 'Modular Seal (≤600mm)' },
  pot_seal: { maxMovement: 100, label: 'Pot Bearing Seal (≤100mm)' },
  finger_plate: { maxMovement: 300, label: 'Finger Plate (≤300mm)' },
};

// =============================================================================
// PRESETS
// =============================================================================

const PRESETS: Record<string, { name: string } & Partial<FormData>> = {
  highway_concrete: {
    name: 'Highway Concrete 30m',
    bridgeType: 'concrete',
    spanLength: '30',
    deckWidth: '12',
    jointLocation: 'abutment',
    minTemperature: '-15',
    maxTemperature: '40',
    meanTemperature: '10',
    thermalCoefficient: '12',
    creepCoefficient: '2.0',
    shrinkageStrain: '300',
    jointType: 'strip_seal',
    numberOfGaps: '1',
    jointDepth: '100',
    seismicZone: 'low',
    seismicDisplacement: '0',
    safetyFactor: '1.3',
    serviceLife: '50',
  },
  highway_steel: {
    name: 'Highway Steel 40m',
    bridgeType: 'steel',
    spanLength: '40',
    deckWidth: '12',
    jointLocation: 'abutment',
    minTemperature: '-20',
    maxTemperature: '45',
    meanTemperature: '10',
    thermalCoefficient: '12',
    creepCoefficient: '0',
    shrinkageStrain: '0',
    jointType: 'strip_seal',
    numberOfGaps: '1',
    jointDepth: '120',
    seismicZone: 'low',
    seismicDisplacement: '0',
    safetyFactor: '1.3',
    serviceLife: '50',
  },
  rail_bridge: {
    name: 'Rail Bridge 50m',
    bridgeType: 'concrete',
    spanLength: '50',
    deckWidth: '8',
    jointLocation: 'abutment',
    minTemperature: '-20',
    maxTemperature: '40',
    meanTemperature: '10',
    thermalCoefficient: '12',
    creepCoefficient: '2.5',
    shrinkageStrain: '350',
    jointType: 'modular_seal',
    numberOfGaps: '2',
    jointDepth: '150',
    seismicZone: 'low',
    seismicDisplacement: '0',
    safetyFactor: '1.5',
    serviceLife: '100',
  },
  viaduct_long: {
    name: 'Viaduct 200m',
    bridgeType: 'concrete',
    spanLength: '200',
    deckWidth: '14',
    jointLocation: 'abutment',
    minTemperature: '-15',
    maxTemperature: '40',
    meanTemperature: '12',
    thermalCoefficient: '12',
    creepCoefficient: '2.0',
    shrinkageStrain: '300',
    jointType: 'modular_seal',
    numberOfGaps: '4',
    jointDepth: '200',
    seismicZone: 'moderate',
    seismicDisplacement: '15',
    safetyFactor: '1.3',
    serviceLife: '100',
  },
  footbridge: {
    name: 'Footbridge 20m',
    bridgeType: 'steel',
    spanLength: '20',
    deckWidth: '3',
    jointLocation: 'abutment',
    minTemperature: '-10',
    maxTemperature: '35',
    meanTemperature: '12',
    thermalCoefficient: '12',
    creepCoefficient: '0',
    shrinkageStrain: '0',
    jointType: 'compression_seal',
    numberOfGaps: '1',
    jointDepth: '50',
    seismicZone: 'low',
    seismicDisplacement: '0',
    safetyFactor: '1.2',
    serviceLife: '50',
  },
  seismic_zone: {
    name: 'Seismic Zone Bridge',
    bridgeType: 'concrete',
    spanLength: '60',
    deckWidth: '12',
    jointLocation: 'abutment',
    minTemperature: '-10',
    maxTemperature: '45',
    meanTemperature: '15',
    thermalCoefficient: '12',
    creepCoefficient: '2.0',
    shrinkageStrain: '300',
    jointType: 'modular_seal',
    numberOfGaps: '3',
    jointDepth: '180',
    seismicZone: 'high',
    seismicDisplacement: '50',
    safetyFactor: '1.5',
    serviceLife: '75',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

const MovementJoints: React.FC = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    bridgeType: 'concrete',
    spanLength: '30',
    deckWidth: '12',
    jointLocation: 'abutment',
    minTemperature: '-15',
    maxTemperature: '40',
    meanTemperature: '10',
    thermalCoefficient: '12',
    creepCoefficient: '2.0',
    shrinkageStrain: '300',
    jointType: 'strip_seal',
    numberOfGaps: '1',
    jointDepth: '100',
    seismicZone: 'low',
    seismicDisplacement: '0',
    safetyFactor: '1.3',
    serviceLife: '50',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
  { key: 'spanLength', label: 'Span Length' },
  { key: 'deckWidth', label: 'Deck Width' },
  { key: 'minTemperature', label: 'Min Temperature' },
  { key: 'maxTemperature', label: 'Max Temperature' },
  { key: 'meanTemperature', label: 'Mean Temperature' },
  { key: 'thermalCoefficient', label: 'Thermal Coefficient' },
  { key: 'creepCoefficient', label: 'Creep Coefficient' },
  { key: 'shrinkageStrain', label: 'Shrinkage Strain' },
  { key: 'numberOfGaps', label: 'Number Of Gaps' },
  { key: 'jointDepth', label: 'Joint Depth' },
  { key: 'seismicDisplacement', label: 'Seismic Displacement' },
  { key: 'safetyFactor', label: 'Safety Factor' },
  { key: 'serviceLife', label: 'Service Life' },
    ]);
    if (errs.length > 0) {
      setWarnings(errs);
      return false;
    }
    return true;
  };

  const [results, setResults] = useState<Results | null>(null);
  const [activeTab, setActiveTab] = useState<string>('input');
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== HANDLERS =====
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateForm = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    const { name: _name, ...fields } = preset;
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  // ===== CALCULATION — EN 1991-1-5 =====
  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);
    setTimeout(() => {
      try {
        const w: string[] = [];

        // Parse inputs
        const L = (parseFloat(formData.spanLength) || 30) * 1000; // m → mm
        const T_min = parseFloat(formData.minTemperature) || -15;
        const T_max = parseFloat(formData.maxTemperature) || 40;
        const T_mean = parseFloat(formData.meanTemperature) || 10;
        const alpha = (parseFloat(formData.thermalCoefficient) || 12) * 1e-6; // ×10⁻⁶/°C → 1/°C
        const phi = parseFloat(formData.creepCoefficient) || 0;
        const eps_cs = (parseFloat(formData.shrinkageStrain) || 0) * 1e-6; // ×10⁻⁶ → strain
        const nGaps = parseInt(formData.numberOfGaps) || 1;
        const jointDepth = parseFloat(formData.jointDepth) || 100;
        const seismicDisp = parseFloat(formData.seismicDisplacement) || 0;
        const FoS = parseFloat(formData.safetyFactor) || 1.3;
        const serviceLife = parseFloat(formData.serviceLife) || 50;
        const jointType = formData.jointType;

        // EN 1991-1-5 §6.1.3 — Thermal movement
        const dT_exp = T_max - T_mean; // expansion
        const dT_con = T_mean - T_min; // contraction
        const thermal_expansion = alpha * L * dT_exp;
        const thermal_contraction = alpha * L * dT_con;
        const thermal_movement = thermal_expansion + thermal_contraction;

        // EN 1992-1-1 §3.1.4 — Creep movement
        const epsilon_cc = 0.3e-3; // characteristic creep strain
        const creep_movement = phi * L * epsilon_cc;

        // Shrinkage movement
        const shrinkage_movement = eps_cs * L;

        // EN 1998-2 §2.3 — Seismic movement
        const seismic_movement = seismicDisp;

        // Total & design movements
        const total = thermal_movement + creep_movement + shrinkage_movement + seismic_movement;
        const design_movement = total * FoS;

        // Joint sizing
        const design_gap = design_movement / nGaps;
        const joint_width = design_gap + 10; // 10mm tolerance
        const total_joint_width = joint_width * nGaps;
        const seal_thickness = Math.max(design_gap * 0.3, 10);

        // Joint capacity check
        const capacity = JOINT_CAPACITY[jointType] || { maxMovement: 80 };
        const capacityPct = (design_gap / capacity.maxMovement) * 100;

        // Movement checks
        const thermalUtil = thermal_movement / (capacity.maxMovement * nGaps);
        const capacityUtil = design_gap / capacity.maxMovement;
        const lifeUtil = Math.min(serviceLife / 100, 1);

        const thermalStatus = thermalUtil <= 1.0 ? 'PASS' : 'FAIL';
        const capacityStatus = capacityUtil <= 1.0 ? 'PASS' : 'FAIL';
        const lifeStatus = lifeUtil <= 1.0 ? 'PASS' : 'FAIL';

        // Warnings
        if (capacityUtil > 1.0)
          w.push(
            `Joint gap ${design_gap.toFixed(0)}mm exceeds ${jointType} capacity ${capacity.maxMovement}mm`,
          );
        if (capacityUtil > 0.85 && capacityUtil <= 1.0)
          w.push('Joint approaching capacity — consider next size up');
        if (seismic_movement > 0 && seismic_movement > thermal_movement)
          w.push('Seismic movement dominates design — review isolation options');
        if (thermal_movement > 50)
          w.push('Large thermal movement — consider intermediate expansion joints');
        if (serviceLife > 75) w.push('Extended service life — specify enhanced durability joint');

        const recommendations: string[] = [
          `Select ${JOINT_CAPACITY[jointType]?.label ?? jointType} joint system`,
          `Minimum gap: ${design_gap.toFixed(0)}mm per gap (${nGaps} gap${nGaps > 1 ? 's' : ''})`,
          `Seal depth: ${seal_thickness.toFixed(0)}mm`,
        ];
        if (capacityUtil > 0.9)
          recommendations.push('Consider modular joint for additional capacity');

        const notes: string[] = [
          `EN 1991-1-5: α=${(alpha * 1e6).toFixed(0)}×10⁻⁶/°C, ΔT_exp=${dT_exp}°C, ΔT_con=${dT_con}°C`,
          `Thermal: ${thermal_movement.toFixed(1)}mm, Creep: ${creep_movement.toFixed(1)}mm, Shrinkage: ${shrinkage_movement.toFixed(1)}mm`,
          `Total: ${total.toFixed(1)}mm × FoS ${FoS} = ${design_movement.toFixed(1)}mm design`,
          `Capacity: ${capacityPct.toFixed(0)}% of ${capacity.maxMovement}mm joint capacity`,
        ];

        setResults({
          thermal_expansion_mm: thermal_expansion,
          thermal_contraction_mm: thermal_contraction,
          thermal_movement_mm: thermal_movement,
          creep_movement_mm: creep_movement,
          shrinkage_movement_mm: shrinkage_movement,
          seismic_movement_mm: seismic_movement,
          total_movement_mm: total,
          design_movement_mm: design_movement,
          design_gap_mm: design_gap,
          joint_width_mm: joint_width,
          total_joint_width_mm: total_joint_width,
          seal_thickness_mm: seal_thickness,
          joint_capacity: {
            movement_capacity_percent: capacityPct,
            min_gap_mm: design_gap * 0.5,
            max_gap_mm: design_gap * 1.5,
          },
          movement_checks: {
            thermal_movement: { utilisation: thermalUtil, status: thermalStatus },
            joint_capacity: { utilisation: capacityUtil, status: capacityStatus },
            service_life: { utilisation: lifeUtil, status: lifeStatus },
          },
          recommendations,
          warnings: w,
          notes,
        });
        setWarnings(w);
      } catch (e) {
        console.error('Calculation error:', e);
      }
      setIsCalculating(false);
    }, 500);
  }, [formData]);

  // ─── Derived values (before callbacks) ───
  const overallPass = results
    ? results.movement_checks.joint_capacity.status === 'PASS' &&
      results.movement_checks.thermal_movement.status === 'PASS'
    : true;

  // ===== PDF EXPORT =====
  const handleExportPDF = useCallback(async () => {
    if (!results) return;
    const maxU = Math.max(
      results.movement_checks.thermal_movement.utilisation,
      results.movement_checks.joint_capacity.utilisation,
      results.movement_checks.service_life.utilisation,
    );
    const overall =
      results.movement_checks.joint_capacity.status === 'PASS' &&
      results.movement_checks.thermal_movement.status === 'PASS';
    const reportData = buildMovementJointsReport(
      {
        bridgeType: formData.bridgeType,
        spanLength: parseFloat(formData.spanLength) || 0,
        deckWidth: parseFloat(formData.deckWidth) || 0,
        jointLocation: formData.jointLocation,
        minTemperature: parseFloat(formData.minTemperature) || 0,
        maxTemperature: parseFloat(formData.maxTemperature) || 0,
        meanTemperature: parseFloat(formData.meanTemperature) || 0,
        thermalCoefficient: parseFloat(formData.thermalCoefficient) || 0,
        creepCoefficient: parseFloat(formData.creepCoefficient) || 0,
        shrinkageStrain: parseFloat(formData.shrinkageStrain) || 0,
        jointType: formData.jointType,
        numberOfGaps: parseInt(formData.numberOfGaps) || 1,
        jointDepth: parseFloat(formData.jointDepth) || 0,
        seismicZone: formData.seismicZone,
        seismicDisplacement: parseFloat(formData.seismicDisplacement) || 0,
        safetyFactor: parseFloat(formData.safetyFactor) || 0,
        serviceLife: parseFloat(formData.serviceLife) || 0,
      },
      {
        status: overall ? 'PASS' : 'FAIL',
        maxUtilisation: maxU,
        criticalCheck:
          results.movement_checks.joint_capacity.utilisation >=
          results.movement_checks.thermal_movement.utilisation
            ? 'Joint Capacity'
            : 'Thermal Movement',
        thermalMovement: results.thermal_movement_mm,
        creepMovement: results.creep_movement_mm,
        shrinkageMovement: results.shrinkage_movement_mm,
        totalMovement: results.total_movement_mm,
        jointCapacity: JOINT_CAPACITY[formData.jointType]?.maxMovement ?? 80,
        seismicMovement: results.seismic_movement_mm,
      },
      warnings.map((w) => ({ type: 'warning' as const, message: w })),
      { projectName: 'Movement Joint Design', clientName: '', preparedBy: '' },
    );
    await generatePremiumPDF(reportData as any);
  }, [formData, results, warnings]);

  // DOCX Export — Editable Word document
  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Movement Joint Design',
      subtitle: 'EN 1991-1-5 Compliant',
      projectInfo: [
        { label: 'Bridge Type', value: formData.bridgeType },
        { label: 'Joint Type', value: formData.jointType },
      ],
      inputs: [
        { label: 'Span Length', value: formData.spanLength, unit: 'm' },
        { label: 'Deck Width', value: formData.deckWidth, unit: 'm' },
        { label: 'Min Temperature', value: formData.minTemperature, unit: '°C' },
        { label: 'Max Temperature', value: formData.maxTemperature, unit: '°C' },
        { label: 'Joint Location', value: formData.jointLocation, unit: '' },
        { label: 'Number of Gaps', value: formData.numberOfGaps, unit: '' },
      ],
      checks: [
        {
          name: 'Thermal Movement',
          capacity: `${results.thermal_movement_mm?.toFixed(1) || '-'} mm`,
          utilisation: `${(results.movement_checks.thermal_movement.utilisation * 100).toFixed(1)}%`,
          status: results.movement_checks.thermal_movement.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Joint Capacity',
          capacity: `${JOINT_CAPACITY[formData.jointType]?.maxMovement || '-'} mm`,
          utilisation: `${(results.movement_checks.joint_capacity.utilisation * 100).toFixed(1)}%`,
          status: results.movement_checks.joint_capacity.status as 'PASS' | 'FAIL',
        },
        {
          name: 'Service Life',
          capacity: `${formData.serviceLife} years`,
          utilisation: `${(results.movement_checks.service_life.utilisation * 100).toFixed(1)}%`,
          status: results.movement_checks.service_life.status as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Overall',
          suggestion: overallPass
            ? 'Joint design adequate per EN 1991-1-5'
            : 'Revise joint type or span configuration',
        },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Movement Joint Design',
    });
  }, [formData, results, warnings, overallPass]);

  // ─── Derived values ───
  const maxUtil = results
    ? Math.max(
        results.movement_checks.thermal_movement.utilisation,
        results.movement_checks.joint_capacity.utilisation,
      ) * 100
    : 0;
  const overallStatus: 'PASS' | 'FAIL' | 'WARNING' = results
    ? maxUtil > 100
      ? 'FAIL'
      : maxUtil > 85
        ? 'WARNING'
        : 'PASS'
    : 'PASS';

  // ─── Auto-calculate ───
  useEffect(() => {
    const timer = setTimeout(runCalculation, 300);
    return () => clearTimeout(timer);
  }, [runCalculation]);

  // ─── Debounced What-If ───
  useEffect(() => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    calcTimerRef.current = setTimeout(runCalculation, 150);
    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [formData, runCalculation]);

  // ─── What-If sliders ───
  const whatIfSliders: WhatIfSlider[] = [
    {
      key: 'spanLength' as keyof FormData,
      label: 'Span Length',
      min: 5,
      max: 300,
      step: 5,
      unit: 'm',
    },
    {
      key: 'minTemperature' as keyof FormData,
      label: 'Min Temperature',
      min: -40,
      max: 10,
      step: 1,
      unit: '°C',
    },
    {
      key: 'maxTemperature' as keyof FormData,
      label: 'Max Temperature',
      min: 20,
      max: 60,
      step: 1,
      unit: '°C',
    },
    {
      key: 'safetyFactor' as keyof FormData,
      label: 'Safety Factor',
      min: 1.0,
      max: 2.0,
      step: 0.1,
      unit: '',
    },
    {
      key: 'creepCoefficient' as keyof FormData,
      label: 'Creep Coefficient',
      min: 0.5,
      max: 4.0,
      step: 0.1,
      unit: '',
    },
    {
      key: 'shrinkageStrain' as keyof FormData,
      label: 'Shrinkage Strain',
      min: 100,
      max: 600,
      step: 25,
      unit: 'µε',
    },
    {
      key: 'thermalCoefficient' as keyof FormData,
      label: 'Thermal Coefficient',
      min: 8,
      max: 16,
      step: 0.5,
      unit: '×10⁻⁶/°C',
    },
  ];

  // ===== HELPER COMPONENTS =====

  const InputField = ({
    label,
    field,
    unit,
    type = 'number',
  }: {
    label: string;
    field: string;
    unit?: string;
    type?: string;
  }) => (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <ExplainableLabel
          label={label}
          field={field}
          className="text-sm font-semibold text-gray-200"
        />{' '}
        {unit && <span className="text-neon-cyan text-xs">({unit})</span>}
      </div>
      <input
        type={type}
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
        placeholder="0"
        title={label}
      />
    </div>
  );

  const SelectField = ({
    label,
    field,
    options,
  }: {
    label: string;
    field: string;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-200 mb-1">{label}</label>
      <select
        value={(formData as any)[field] || ''}
        onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan text-white"
        title={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  const Section: React.FC<{
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
  }> = ({ id, title, icon, color, defaultOpen = true, children }) => {
    if (expandedSections[id] === undefined) expandedSections[id] = defaultOpen;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('rounded-2xl border overflow-hidden shadow-2xl', color)}
      >
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {icon}
            <span className="text-2xl font-semibold text-white">{title}</span>
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
  };

  const UtilisationBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const percent = Math.min(value * 100, 100);
    const color = value <= 0.7 ? 'bg-emerald-500' : value <= 1.0 ? 'bg-amber-500' : 'bg-red-500';
    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">{label}</span>
          <span className={cn('font-medium', value <= 1.0 ? 'text-white' : 'text-red-400')}>
            {(value * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={cn('h-full transition-all', color)} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="relative min-h-screen overflow-hidden">
      <MouseSpotlight />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center space-x-3 mb-6 px-6 py-3 rounded-full glass border border-neon-cyan/30"
            whileHover={{ scale: 1.05 }}
          >
            <FiLayers className="text-neon-cyan" size={24} />
            <span className="text-white font-semibold">EN 1991-1-5 | Eurocode</span>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-8">
            {['input', 'results', 'visualization'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'neon' : 'ghost'}
                onClick={() => setActiveTab(tab)}
                disabled={tab !== 'input' && !results}
                className={cn(
                  'px-8 py-3 rounded-xl font-semibold capitalize',
                  activeTab === tab
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    : 'text-gray-400',
                )}
              >
                {tab === 'input'
                  ? '🏗️ Input'
                  : tab === 'results'
                    ? '📊 Results'
                    : '🎨 Visualization'}
              </Button>
            ))}
          </div>

          <h1 className="text-6xl font-black mb-6">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Movement Joints
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Bridge movement joint design &amp; analysis
          </p>
          <div className="flex items-center justify-center space-x-6 mt-8">
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Thermal Movement</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Creep &amp; Shrinkage</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Joint Sizing</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <FiCheck className="text-green-400" />
              <span className="text-sm">Seismic Assessment</span>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ═══════════════ INPUT TAB ═══════════════ */}
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-4">
                {/* Presets */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FiZap className="w-6 h-6 text-neon-cyan" />
                      </motion.div>
                      <span>Quick Presets</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <Button
                          key={key}
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreset(key)}
                          className="border-gray-600 hover:border-cyan-500 hover:text-cyan-400"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Bridge Configuration */}
                <Section
                  id="bridge"
                  title="Bridge Configuration"
                  icon={
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiActivity className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SelectField
                      label="Bridge Type"
                      field="bridgeType"
                      options={[
                        { value: 'concrete', label: 'Concrete' },
                        { value: 'steel', label: 'Steel' },
                        { value: 'composite', label: 'Composite' },
                      ]}
                    />
                    <InputField label="Span Length" field="spanLength" unit="m" />
                    <InputField label="Deck Width" field="deckWidth" unit="m" />
                    <SelectField
                      label="Joint Location"
                      field="jointLocation"
                      options={[
                        { value: 'abutment', label: 'Abutment' },
                        { value: 'pier', label: 'Pier' },
                        { value: 'midspan', label: 'Mid-span' },
                      ]}
                    />
                  </div>
                </Section>

                {/* Environmental Conditions */}
                <Section
                  id="environment"
                  title="Environmental Conditions"
                  icon={
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiActivity className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Min Temp" field="minTemperature" unit="°C" />
                    <InputField label="Max Temp" field="maxTemperature" unit="°C" />
                    <InputField label="Mean Temp" field="meanTemperature" unit="°C" />
                    <InputField label="Thermal Coeff" field="thermalCoefficient" unit="×10⁻⁶/°C" />
                    <InputField label="Creep Coeff" field="creepCoefficient" unit="φ" />
                    <InputField label="Shrinkage Strain" field="shrinkageStrain" unit="×10⁻⁶" />
                    <SelectField
                      label="Seismic Zone"
                      field="seismicZone"
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'high', label: 'High' },
                      ]}
                    />
                    <InputField label="Seismic Disp" field="seismicDisplacement" unit="mm" />
                  </div>
                </Section>

                {/* Joint Configuration */}
                <Section
                  id="joint"
                  title="Joint Configuration"
                  icon={
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiActivity className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                  }
                  color="border-neon-cyan/30"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SelectField
                      label="Joint Type"
                      field="jointType"
                      options={Object.entries(JOINT_CAPACITY).map(([k, v]) => ({
                        value: k,
                        label: v.label,
                      }))}
                    />
                    <InputField label="No. of Gaps" field="numberOfGaps" />
                    <InputField label="Joint Depth" field="jointDepth" unit="mm" />
                    <InputField label="Safety Factor" field="safetyFactor" />
                    <InputField label="Service Life" field="serviceLife" unit="years" />
                  </div>
                </Section>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center gap-4"
                >
                  <Button
                    onClick={() => {
                      runCalculation();
                      setActiveTab('results');
                    }}
                    disabled={isCalculating}
                    className="px-16 py-8 text-xl font-black rounded-2xl bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple hover:scale-105 transition-transform duration-300 shadow-2xl cyber-glow-blue"
                  >
                    {isCalculating ? (
                      <motion.div
                        className="flex items-center space-x-3"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Analysing...</span>
                      </motion.div>
                    ) : (
                      <span className="flex items-center space-x-3">
                        <FiZap size={24} />
                        <span>RUN FULL ANALYSIS</span>
                        <FiActivity size={24} />
                      </span>
                    )}
                  </Button>
                  {results && (
                    <>
                      <Button
                        onClick={handleExportPDF}
                        variant="outline"
                        className="px-8 py-6 text-lg font-bold border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                      >
                        <FiDownload className="mr-2" size={20} /> PDF
                      </Button>
                      <Button
                        onClick={handleExportDOCX}
                        variant="outline"
                        className="px-8 py-6 text-lg font-bold border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      >
                        <FiDownload className="mr-2" size={20} /> DOCX
                      </Button>
                      <SaveRunButton
                        calculatorKey="movement_joints"
                        inputs={formData as unknown as Record<string, string>}
                        results={results}
                        status={overallStatus}
                        summary={results ? `${maxUtil.toFixed(1)}% util` : undefined}
                      />
                    </>
                  )}
                </motion.div>
              </div>

              {/* Right Column — 3D + What-If */}
              <div className="space-y-4 sticky top-32">
                <WhatIfPreview
                  title="Movement Joints — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={overallPass ? 'PASS' : 'FAIL'}
                  utilisation={maxUtil}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram
                      height={fsHeight}
                      cameraPosition={[4, 3, 4]}
                      status={results ? (overallPass ? 'PASS' : 'FAIL') : undefined}
                    >
                      <MovementJoints3D
                        spanLength={parseFloat(formData.spanLength) || 30}
                        deckWidth={parseFloat(formData.deckWidth) || 12}
                        jointGap={results?.design_gap_mm ?? 50}
                        jointDepth={parseFloat(formData.jointDepth) || 100}
                        totalMovement={results?.total_movement_mm ?? 0}
                        jointType={formData.jointType}
                        bridgeType={formData.bridgeType}
                        thermalMovement={results?.thermal_movement_mm ?? 0}
                        creepMovement={results?.creep_movement_mm ?? 0}
                        utilisation={maxUtil}
                        status={overallPass ? 'PASS' : 'FAIL'}
                      />
                    </Interactive3DDiagram>
                  )}
                />

                {/* Quick Presets */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white flex items-center space-x-3">
                      <motion.div
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FiZap className="w-6 h-6 text-neon-cyan" />
                      </motion.div>
                      <span>Quick Presets</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <Button
                          key={key}
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreset(key)}
                          className="border-gray-600 hover:border-cyan-500 hover:text-cyan-400 text-xs h-7"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Live Results */}
                {results && (
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiEye className="w-6 h-6 text-neon-cyan" />
                        </motion.div>
                        <span>Live Results</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Thermal</span>
                        <span className="text-cyan-400">
                          {results.thermal_movement_mm.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Creep</span>
                        <span className="text-white">
                          {results.creep_movement_mm.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Shrinkage</span>
                        <span className="text-white">
                          {results.shrinkage_movement_mm.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Seismic</span>
                        <span className="text-white">
                          {results.seismic_movement_mm.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-gray-700 pt-1">
                        <span className="text-gray-400">Design Gap</span>
                        <span
                          className={
                            results.movement_checks.joint_capacity.utilisation > 1
                              ? 'text-red-400'
                              : 'text-cyan-400'
                          }
                        >
                          {results.design_gap_mm.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Capacity</span>
                        <span
                          className={
                            results.movement_checks.joint_capacity.utilisation > 1
                              ? 'text-red-400'
                              : 'text-white'
                          }
                        >
                          {results.joint_capacity.movement_capacity_percent.toFixed(0)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════════ RESULTS TAB ═══════════════ */}
          {activeTab === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Summary Cards */}
              {results && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border-l-4 border-emerald-500 bg-gray-900/50 rounded-r-xl p-4 flex items-center space-x-3">
                    <FiCheck className="w-6 h-6 text-emerald-400" />
                    <div>
                      <div className="text-sm text-gray-400">Total Movement</div>
                      <div className="text-lg font-bold text-white">
                        {results.total_movement_mm.toFixed(1)} mm
                      </div>
                    </div>
                  </div>
                  <div className="border-l-4 border-emerald-500 bg-gray-900/50 rounded-r-xl p-4 flex items-center space-x-3">
                    <FiCheck className="w-6 h-6 text-emerald-400" />
                    <div>
                      <div className="text-sm text-gray-400">Design Gap</div>
                      <div className="text-lg font-bold text-white">
                        {results.design_gap_mm.toFixed(1)} mm
                      </div>
                    </div>
                  </div>
                  <div className="border-l-4 border-emerald-500 bg-gray-900/50 rounded-r-xl p-4 flex items-center space-x-3">
                    <FiCheck className="w-6 h-6 text-emerald-400" />
                    <div>
                      <div className="text-sm text-gray-400">Capacity Used</div>
                      <div className="text-lg font-bold text-white">
                        {results.joint_capacity.movement_capacity_percent.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* Movement Components */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiActivity className="w-6 h-6 text-neon-cyan" />
                        </motion.div>
                        <span>Movement Components</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          {
                            label: 'Thermal',
                            value: results.thermal_movement_mm,
                            color: 'text-cyan-400',
                          },
                          {
                            label: 'Creep',
                            value: results.creep_movement_mm,
                            color: 'text-blue-400',
                          },
                          {
                            label: 'Shrinkage',
                            value: results.shrinkage_movement_mm,
                            color: 'text-purple-400',
                          },
                          {
                            label: 'Seismic',
                            value: results.seismic_movement_mm,
                            color: 'text-amber-400',
                          },
                          { label: 'Total', value: results.total_movement_mm, color: 'text-white' },
                          {
                            label: 'Design',
                            value: results.design_movement_mm,
                            color: 'text-cyan-400',
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-3 bg-gray-950/50 rounded-lg text-center"
                          >
                            <div className="text-gray-400 text-sm">{item.label}</div>
                            <div className={cn('text-xl font-bold', item.color)}>
                              {item.value.toFixed(1)}
                            </div>
                            <div className="text-gray-500 text-xs">mm</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Joint Sizing */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiActivity className="w-6 h-6 text-neon-cyan" />
                        </motion.div>
                        <span>Joint Sizing &amp; Capacity</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                          {
                            label: 'Design Gap',
                            value: results.design_gap_mm.toFixed(1),
                            unit: 'mm',
                          },
                          {
                            label: 'Joint Width',
                            value: results.joint_width_mm.toFixed(1),
                            unit: 'mm',
                          },
                          {
                            label: 'Seal Depth',
                            value: results.seal_thickness_mm.toFixed(1),
                            unit: 'mm',
                          },
                          {
                            label: 'Capacity Used',
                            value: results.joint_capacity.movement_capacity_percent.toFixed(0),
                            unit: '%',
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-3 bg-gray-950/50 rounded-lg text-center"
                          >
                            <div className="text-gray-400 text-sm">{item.label}</div>
                            <div className="text-xl font-bold text-white">{item.value}</div>
                            <div className="text-gray-500 text-xs">{item.unit}</div>
                          </div>
                        ))}
                      </div>
                      <UtilisationBar
                        label="Thermal Movement"
                        value={results.movement_checks.thermal_movement.utilisation}
                      />
                      <UtilisationBar
                        label="Joint Capacity"
                        value={results.movement_checks.joint_capacity.utilisation}
                      />
                      <UtilisationBar
                        label="Service Life"
                        value={results.movement_checks.service_life.utilisation}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-4 sticky top-32">
                  <Card
                    className={cn(
                      'border-2 shadow-lg',
                      overallPass
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/30 shadow-red-500/20',
                    )}
                  >
                    <CardContent className="py-6 text-center">
                      <div
                        className={cn(
                          'text-4xl mb-2',
                          overallPass ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {overallPass ? <FiCheck className="inline" /> : <FiX className="inline" />}
                      </div>
                      <div
                        className={cn(
                          'font-bold text-lg',
                          overallPass ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {overallPass ? 'ALL CHECKS PASS' : 'DESIGN CHECK FAILURE'}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        Max Utilisation: {maxUtil.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>

                  {warnings.length > 0 && (
                    <Card variant="glass" className="border-amber-500/30 shadow-2xl">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                          <FiAlertTriangle />
                          <span className="font-medium">Warnings</span>
                        </div>
                        <ul className="text-sm text-white space-y-1">
                          {warnings.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {results.recommendations && results.recommendations.length > 0 && (
                    <Card variant="glass" className="border-emerald-500/30 shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-2xl text-white flex items-center space-x-3">
                          <motion.div
                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <FiCheck className="w-6 h-6 text-emerald-400" />
                          </motion.div>
                          <span className="text-emerald-400">Recommendations</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1.5">
                        {results.recommendations.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-emerald-300">
                            <FiCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-white">Design Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1.5 text-gray-400">
                      {results.notes.map((n, i) => (
                        <div key={i}>• {n}</div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════ VISUALIZATION TAB ═══════════════ */}
          {activeTab === 'visualization' && results && (
            <motion.div
              key="visualization"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Utilisation Dashboard */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center space-x-3">
                    <motion.div
                      className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiActivity className="w-6 h-6 text-neon-cyan" />
                    </motion.div>
                    <span>Utilisation Dashboard</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[
                      {
                        label: 'Thermal Movement',
                        value: results.movement_checks.thermal_movement.utilisation,
                        color: 'cyan',
                      },
                      {
                        label: 'Joint Capacity',
                        value: results.movement_checks.joint_capacity.utilisation,
                        color: 'blue',
                      },
                      {
                        label: 'Service Life',
                        value: results.movement_checks.service_life.utilisation,
                        color: 'purple',
                      },
                    ].map((item) => {
                      const pct = Math.min(item.value * 100, 100);
                      const status =
                        item.value > 1 ? 'FAIL' : item.value > 0.85 ? 'WARNING' : 'PASS';
                      return (
                        <div key={item.label} className="text-center">
                          <div className="relative w-24 h-24 mx-auto mb-2">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="currentColor"
                                className="text-gray-700"
                                strokeWidth="8"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="currentColor"
                                className={
                                  status === 'FAIL'
                                    ? 'text-red-500'
                                    : status === 'WARNING'
                                      ? 'text-amber-500'
                                      : `text-${item.color}-500`
                                }
                                strokeWidth="8"
                                strokeDasharray={`${pct * 2.64} 264`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                className={cn(
                                  'text-lg font-bold',
                                  status === 'FAIL'
                                    ? 'text-red-400'
                                    : status === 'WARNING'
                                      ? 'text-amber-400'
                                      : 'text-white',
                                )}
                              >
                                {(item.value * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* SVG Diagrams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Movement Breakdown */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white">Movement Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 220 180" className="w-full h-48">
                      {(() => {
                        const items = [
                          { label: 'Thermal', val: results.thermal_movement_mm, color: '#06b6d4' },
                          { label: 'Creep', val: results.creep_movement_mm, color: '#3b82f6' },
                          {
                            label: 'Shrinkage',
                            val: results.shrinkage_movement_mm,
                            color: '#a855f7',
                          },
                          { label: 'Seismic', val: results.seismic_movement_mm, color: '#f59e0b' },
                        ];
                        const maxV = Math.max(...items.map((i) => i.val), 1);
                        return items.map((it, i) => {
                          const h = (it.val / maxV) * 100;
                          const x = 25 + i * 50;
                          return (
                            <g key={it.label}>
                              <rect
                                x={x}
                                y={145 - h}
                                width={35}
                                height={h}
                                fill={it.color}
                                rx="3"
                                opacity="0.75"
                              />
                              <text
                                x={x + 17}
                                y={140 - h}
                                textAnchor="middle"
                                fill={it.color}
                                fontSize="9"
                              >
                                {it.val.toFixed(1)}
                              </text>
                              <text
                                x={x + 17}
                                y="160"
                                textAnchor="middle"
                                fill="#94a3b8"
                                fontSize="7"
                              >
                                {it.label}
                              </text>
                            </g>
                          );
                        });
                      })()}
                      <text x="110" y="175" textAnchor="middle" fill="#94a3b8" fontSize="9">
                        Total: {results.total_movement_mm.toFixed(1)}mm
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Joint Gap Diagram */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white">Joint Gap Sizing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {/* Deck sections */}
                      <rect x="10" y="40" width="70" height="60" fill="#475569" rx="2" />
                      <rect x="120" y="40" width="70" height="60" fill="#475569" rx="2" />
                      {/* Gap */}
                      <rect
                        x="82"
                        y="35"
                        width="36"
                        height="70"
                        fill="#1e293b"
                        stroke="#06b6d4"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                      />
                      {/* Seal */}
                      <rect
                        x="85"
                        y="55"
                        width="30"
                        height="30"
                        fill="#3b82f6"
                        opacity="0.5"
                        rx="2"
                      />
                      <text x="100" y="73" textAnchor="middle" fill="white" fontSize="8">
                        Seal
                      </text>
                      {/* Labels */}
                      <text x="100" y="25" textAnchor="middle" fill="#06b6d4" fontSize="10">
                        {results.design_gap_mm.toFixed(0)}mm
                      </text>
                      <line x1="82" y1="28" x2="82" y2="35" stroke="#06b6d4" strokeWidth="0.5" />
                      <line x1="118" y1="28" x2="118" y2="35" stroke="#06b6d4" strokeWidth="0.5" />
                      <line x1="82" y1="30" x2="118" y2="30" stroke="#06b6d4" strokeWidth="1" />
                      {/* Movement arrows */}
                      <line
                        x1="45"
                        y1="120"
                        x2="25"
                        y2="120"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        markerEnd="url(#arrowMj)"
                      />
                      <line
                        x1="155"
                        y1="120"
                        x2="175"
                        y2="120"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        markerEnd="url(#arrowMj)"
                      />
                      <defs>
                        <marker
                          id="arrowMj"
                          markerWidth="6"
                          markerHeight="4"
                          refX="6"
                          refY="2"
                          orient="auto"
                        >
                          <polygon points="0 0, 6 2, 0 4" fill="#f59e0b" />
                        </marker>
                      </defs>
                      <text x="100" y="135" textAnchor="middle" fill="#f59e0b" fontSize="8">
                        Δ = {results.total_movement_mm.toFixed(1)}mm
                      </text>
                      <text x="100" y="170" textAnchor="middle" fill="#94a3b8" fontSize="9">
                        {JOINT_CAPACITY[formData.jointType]?.label ?? formData.jointType}
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Temperature Profile */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white">Temperature Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {(() => {
                        const tMin = parseFloat(formData.minTemperature) || -15;
                        const tMax = parseFloat(formData.maxTemperature) || 40;
                        const tMean = parseFloat(formData.meanTemperature) || 10;
                        const range = tMax - tMin;
                        const scale = 120 / Math.max(range, 1);
                        const yMin = 150;
                        const yMean = yMin - (tMean - tMin) * scale;
                        const yMax = yMin - range * scale;
                        return (
                          <>
                            <rect
                              x="60"
                              y={yMax}
                              width="80"
                              height={yMean - yMax}
                              fill="#ef4444"
                              opacity="0.2"
                            />
                            <rect
                              x="60"
                              y={yMean}
                              width="80"
                              height={yMin - yMean}
                              fill="#3b82f6"
                              opacity="0.2"
                            />
                            <line
                              x1="55"
                              y1={yMin}
                              x2="145"
                              y2={yMin}
                              stroke="#3b82f6"
                              strokeWidth="1"
                            />
                            <line
                              x1="55"
                              y1={yMean}
                              x2="145"
                              y2={yMean}
                              stroke="#94a3b8"
                              strokeWidth="1"
                              strokeDasharray="4 2"
                            />
                            <line
                              x1="55"
                              y1={yMax}
                              x2="145"
                              y2={yMax}
                              stroke="#ef4444"
                              strokeWidth="1"
                            />
                            <text x="50" y={yMin + 4} textAnchor="end" fill="#3b82f6" fontSize="9">
                              {tMin}°C
                            </text>
                            <text x="50" y={yMean + 4} textAnchor="end" fill="#94a3b8" fontSize="9">
                              {tMean}°C
                            </text>
                            <text x="50" y={yMax + 4} textAnchor="end" fill="#ef4444" fontSize="9">
                              {tMax}°C
                            </text>
                            <text
                              x="100"
                              y={(yMax + yMean) / 2 + 4}
                              textAnchor="middle"
                              fill="#ef4444"
                              fontSize="10"
                            >
                              +{(tMax - tMean).toFixed(0)}°C
                            </text>
                            <text
                              x="100"
                              y={(yMean + yMin) / 2 + 4}
                              textAnchor="middle"
                              fill="#3b82f6"
                              fontSize="10"
                            >
                              -{(tMean - tMin).toFixed(0)}°C
                            </text>
                            <text x="100" y="170" textAnchor="middle" fill="#94a3b8" fontSize="9">
                              ΔT_range = {range}°C
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </CardContent>
                </Card>

                {/* Capacity Chart */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl text-white">Joint Capacity vs Demand</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {(() => {
                        const cap = JOINT_CAPACITY[formData.jointType]?.maxMovement ?? 80;
                        const demand = results.design_gap_mm;
                        const maxV = Math.max(cap, demand) * 1.2;
                        const capH = (cap / maxV) * 120;
                        const demH = (demand / maxV) * 120;
                        return (
                          <>
                            <rect
                              x="40"
                              y={145 - capH}
                              width="50"
                              height={capH}
                              fill="#22c55e"
                              rx="4"
                              opacity="0.6"
                            />
                            <text
                              x="65"
                              y={140 - capH}
                              textAnchor="middle"
                              fill="#22c55e"
                              fontSize="10"
                            >
                              {cap}mm
                            </text>
                            <text x="65" y="158" textAnchor="middle" fill="#94a3b8" fontSize="8">
                              Capacity
                            </text>
                            <rect
                              x="110"
                              y={145 - demH}
                              width="50"
                              height={demH}
                              fill={demand > cap ? '#ef4444' : '#06b6d4'}
                              rx="4"
                              opacity="0.6"
                            />
                            <text
                              x="135"
                              y={140 - demH}
                              textAnchor="middle"
                              fill={demand > cap ? '#ef4444' : '#06b6d4'}
                              fontSize="10"
                            >
                              {demand.toFixed(0)}mm
                            </text>
                            <text x="135" y="158" textAnchor="middle" fill="#94a3b8" fontSize="8">
                              Demand
                            </text>
                            <text x="100" y="175" textAnchor="middle" fill="#94a3b8" fontSize="9">
                              {results.joint_capacity.movement_capacity_percent.toFixed(0)}%
                              utilised
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </CardContent>
                </Card>
              </div>

              {/* 3D Interactive View */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">3D Joint View</CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram
                    height="h-[500px]"
                    cameraPosition={[5, 4, 5]}
                    status={overallPass ? 'PASS' : 'FAIL'}
                  >
                    <MovementJoints3D
                      spanLength={parseFloat(formData.spanLength) || 30}
                      deckWidth={parseFloat(formData.deckWidth) || 12}
                      jointGap={results.design_gap_mm}
                      jointDepth={parseFloat(formData.jointDepth) || 100}
                      totalMovement={results.total_movement_mm}
                      jointType={formData.jointType}
                      bridgeType={formData.bridgeType}
                      thermalMovement={results.thermal_movement_mm}
                      creepMovement={results.creep_movement_mm}
                      utilisation={maxUtil}
                      status={overallPass ? 'PASS' : 'FAIL'}
                    />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>

              {/* Design Summary */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Design Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block">Bridge Type</span>
                      <span className="text-white font-medium capitalize">
                        {formData.bridgeType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Span Length</span>
                      <span className="text-white font-medium">{formData.spanLength} m</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Joint Type</span>
                      <span className="text-white font-medium capitalize">
                        {formData.jointType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">No. of Gaps</span>
                      <span className="text-white font-medium">{formData.numberOfGaps}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Total Movement</span>
                      <span className="text-cyan-400 font-medium">
                        {results.total_movement_mm.toFixed(1)} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Design Gap</span>
                      <span className="text-cyan-400 font-medium">
                        {results.design_gap_mm.toFixed(1)} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Capacity Used</span>
                      <span
                        className={cn(
                          'font-medium',
                          results.movement_checks.joint_capacity.utilisation > 1
                            ? 'text-red-400'
                            : 'text-emerald-400',
                        )}
                      >
                        {results.joint_capacity.movement_capacity_percent.toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Status</span>
                      <span
                        className={cn(
                          'font-bold',
                          overallPass ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {overallPass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

export default MovementJoints;
