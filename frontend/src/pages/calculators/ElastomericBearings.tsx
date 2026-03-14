// =============================================================================
// Elastomeric Bearings Calculator — Premium Edition
// EN 1337-3 Laminated Elastomeric Bearing Design
// =============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiEye,
  FiLayers,
  FiSettings,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Interactive3DDiagram from '../../components/3d/Interactive3DDiagram';
import ElastomericBearings3D from '../../components/3d/scenes/ElastomericBearings3D';
import ExplainableLabel from '../../components/ExplainableLabel';
import MouseSpotlight from '../../components/MouseSpotlight';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import SaveRunButton from '../../components/ui/SaveRunButton';
import WhatIfPreview from '../../components/WhatIfPreview';
import { generateDOCX } from '../../lib/docxGenerator';
import { buildElastomericBearingsReport } from '../../lib/pdf/builders/elastomericBearingsBuilder';
import { generatePremiumPDF } from '../../lib/pdfGenerator';
import { cn } from '../../lib/utils';
import { validateNumericInputs } from '../../lib/validation';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ElastomerLayer {
  thickness_mm: string;
  shear_modulus_mpa: string;
  bulk_modulus_mpa: string;
}

interface SteelShims {
  number_of_shims: string;
  shim_thickness_mm: string;
  shim_modulus_mpa: string;
}

interface FormData {
  shape: string;
  planArea: string;
  length: string;
  width: string;
  diameter: string;
  elastomerLayers: ElastomerLayer[];
  steelShims: SteelShims;
  topPlateThickness: string;
  bottomPlateThickness: string;
  designVerticalLoad: string;
  designShearLoad: string;
  serviceTemperature: string;
  temperatureRange: string;
  shapeFactorMin: string;
  shapeFactorMax: string;
  strainLimit: string;
  compressionStressLimit: string;
}

interface Results {
  geometry: {
    area_mm2: number;
    perimeter_mm: number;
    total_height_mm: number;
    total_elastomer_thickness_mm: number;
    aspect_ratio: number;
  };
  shape_factors: {
    layer_shape_factors: number[];
    min_shape_factor: number;
    max_shape_factor: number;
    average_shape_factor: number;
  };
  effective_properties: {
    G_eff_mpa: number;
    E_c_mpa: number;
  };
  stability_check: {
    max_eccentricity_mm: number;
    utilisation: number;
    status: string;
  };
  compression_check: {
    nominal_stress_mpa: number;
    allowable_stress_mpa: number;
    utilisation: number;
    status: string;
  };
  shear_check: {
    shear_strain_percent: number;
    utilisation: number;
    status: string;
  };
  strain_check: {
    compression_strain_percent: number;
    shear_strain_percent: number;
    total_strain_percent: number;
    utilisation: number;
    status: string;
  };
  stiffness_properties: {
    vertical_stiffness_kn_mm: number;
    horizontal_stiffness_kn_mm: number;
    rotational_stiffness_knm_rad: number;
    vertical_deflection_mm: number;
    horizontal_deflection_mm: number;
  };
  rotation_capacity: {
    max_rotation_rad: number;
    status: string;
  };
  overall_check: boolean;
  recommendations: string[];
  warnings: string[];
  notes: string[];
}

// =============================================================================
// PRESETS
// =============================================================================

const PRESETS: Record<string, { name: string } & Partial<FormData>> = {
  highway_laminated: {
    name: 'Highway Bridge — Laminated 400×300',
    shape: 'rectangular',
    length: '400',
    width: '300',
    topPlateThickness: '25',
    bottomPlateThickness: '25',
    designVerticalLoad: '500',
    designShearLoad: '50',
    serviceTemperature: '15',
    temperatureRange: '50',
    shapeFactorMin: '5',
    shapeFactorMax: '20',
    strainLimit: '5',
    compressionStressLimit: '20',
  },
  rail_heavy: {
    name: 'Rail Bridge — Heavy Duty 500×400',
    shape: 'rectangular',
    length: '500',
    width: '400',
    topPlateThickness: '30',
    bottomPlateThickness: '30',
    designVerticalLoad: '1200',
    designShearLoad: '100',
    serviceTemperature: '10',
    temperatureRange: '60',
    shapeFactorMin: '6',
    shapeFactorMax: '20',
    strainLimit: '5',
    compressionStressLimit: '20',
  },
  footbridge_plain: {
    name: 'Footbridge — Plain Pad 200×150',
    shape: 'rectangular',
    length: '200',
    width: '150',
    topPlateThickness: '15',
    bottomPlateThickness: '15',
    designVerticalLoad: '100',
    designShearLoad: '10',
    serviceTemperature: '15',
    temperatureRange: '40',
    shapeFactorMin: '4',
    shapeFactorMax: '15',
    strainLimit: '5',
    compressionStressLimit: '15',
  },
  circular_pot: {
    name: 'Circular Pot Bearing Ø300',
    shape: 'circular',
    diameter: '300',
    topPlateThickness: '30',
    bottomPlateThickness: '30',
    designVerticalLoad: '600',
    designShearLoad: '60',
    serviceTemperature: '15',
    temperatureRange: '50',
    shapeFactorMin: '5',
    shapeFactorMax: '20',
    strainLimit: '5',
    compressionStressLimit: '20',
  },
  viaduct_large: {
    name: 'Viaduct — Large 600×500',
    shape: 'rectangular',
    length: '600',
    width: '500',
    topPlateThickness: '40',
    bottomPlateThickness: '40',
    designVerticalLoad: '2000',
    designShearLoad: '150',
    serviceTemperature: '10',
    temperatureRange: '60',
    shapeFactorMin: '6',
    shapeFactorMax: '25',
    strainLimit: '5',
    compressionStressLimit: '25',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

const ElastomericBearings: React.FC = () => {
  // ===== STATE =====
  const [formData, setFormData] = useState<FormData>({
    shape: 'rectangular',
    planArea: '',
    length: '400',
    width: '300',
    diameter: '300',
    elastomerLayers: [
      { thickness_mm: '12', shear_modulus_mpa: '0.9', bulk_modulus_mpa: '2000' },
      { thickness_mm: '12', shear_modulus_mpa: '0.9', bulk_modulus_mpa: '2000' },
      { thickness_mm: '12', shear_modulus_mpa: '0.9', bulk_modulus_mpa: '2000' },
    ],
    steelShims: { number_of_shims: '2', shim_thickness_mm: '3', shim_modulus_mpa: '200000' },
    topPlateThickness: '25',
    bottomPlateThickness: '25',
    designVerticalLoad: '500',
    designShearLoad: '50',
    serviceTemperature: '15',
    temperatureRange: '50',
    shapeFactorMin: '5',
    shapeFactorMax: '20',
    strainLimit: '5',
    compressionStressLimit: '20',
  });

  const validateInputs = (): boolean => {
    const errs = validateNumericInputs(formData as unknown as Record<string, unknown>, [
      { key: 'length', label: 'Length' },
      { key: 'width', label: 'Width' },
      { key: 'diameter', label: 'Diameter' },
      { key: 'thickness_mm', label: 'Thickness Mm' },
      { key: 'shear_modulus_mpa', label: 'Shear Modulus Mpa' },
      { key: 'bulk_modulus_mpa', label: 'Bulk Modulus Mpa' },
      { key: 'thickness_mm', label: 'Thickness Mm' },
      { key: 'shear_modulus_mpa', label: 'Shear Modulus Mpa' },
      { key: 'bulk_modulus_mpa', label: 'Bulk Modulus Mpa' },
      { key: 'thickness_mm', label: 'Thickness Mm' },
      { key: 'shear_modulus_mpa', label: 'Shear Modulus Mpa' },
      { key: 'bulk_modulus_mpa', label: 'Bulk Modulus Mpa' },
      { key: 'number_of_shims', label: 'Number Of Shims' },
      { key: 'shim_thickness_mm', label: 'Shim Thickness Mm' },
      { key: 'shim_modulus_mpa', label: 'Shim Modulus Mpa' },
      { key: 'topPlateThickness', label: 'Top Plate Thickness' },
      { key: 'bottomPlateThickness', label: 'Bottom Plate Thickness' },
      { key: 'designVerticalLoad', label: 'Design Vertical Load' },
      { key: 'designShearLoad', label: 'Design Shear Load' },
      { key: 'serviceTemperature', label: 'Service Temperature' },
      { key: 'temperatureRange', label: 'Temperature Range' },
      { key: 'shapeFactorMin', label: 'Shape Factor Min' },
      { key: 'shapeFactorMax', label: 'Shape Factor Max' },
      { key: 'strainLimit', label: 'Strain Limit' },
      { key: 'compressionStressLimit', label: 'Compression Stress Limit' },
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

  const [showPresets, setShowPresets] = useState(false);
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== HANDLERS =====
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateForm = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLayerChange = (index: number, field: keyof ElastomerLayer, value: string) => {
    setFormData((prev) => {
      const layers = [...prev.elastomerLayers];
      layers[index] = { ...layers[index], [field]: value };
      return { ...prev, elastomerLayers: layers };
    });
  };

  const handleShimsChange = (field: keyof SteelShims, value: string) => {
    setFormData((prev) => ({
      ...prev,
      steelShims: { ...prev.steelShims, [field]: value },
    }));
  };

  const addElastomerLayer = () => {
    setFormData((prev) => ({
      ...prev,
      elastomerLayers: [
        ...prev.elastomerLayers,
        { thickness_mm: '12', shear_modulus_mpa: '0.9', bulk_modulus_mpa: '2000' },
      ],
    }));
  };

  const removeElastomerLayer = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      elastomerLayers: prev.elastomerLayers.filter((_, i) => i !== index),
    }));
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    const { name: _name, ...fields } = preset;
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  // ===== CALCULATION =====
  const runCalculation = useCallback(() => {
    if (!validateInputs()) return;
    setIsCalculating(true);
    setWarnings([]);
    setTimeout(() => {
      try {
        const w: string[] = [];

        // Parse dimensions
        const shape = formData.shape;
        const L = parseFloat(formData.length) || 400;
        const W = parseFloat(formData.width) || 300;
        const D = parseFloat(formData.diameter) || 300;

        // Geometry
        let area_mm2: number, perimeter_mm: number;
        if (shape === 'circular') {
          area_mm2 = Math.PI * (D / 2) ** 2;
          perimeter_mm = Math.PI * D;
        } else {
          area_mm2 = L * W;
          perimeter_mm = 2 * (L + W);
        }
        const aspect_ratio = shape === 'circular' ? 1 : L / W;

        // Layers
        const layers = formData.elastomerLayers;
        const layerThicknesses = layers.map((l) => parseFloat(l.thickness_mm) || 12);
        const layerG = layers.map((l) => parseFloat(l.shear_modulus_mpa) || 0.9);
        const layerK = layers.map((l) => parseFloat(l.bulk_modulus_mpa) || 2000);

        const totalElastomerThickness = layerThicknesses.reduce((s, t) => s + t, 0);
        const nShims = parseInt(formData.steelShims.number_of_shims) || 0;
        const shimThickness = parseFloat(formData.steelShims.shim_thickness_mm) || 3;
        const topPlate = parseFloat(formData.topPlateThickness) || 25;
        const bottomPlate = parseFloat(formData.bottomPlateThickness) || 25;
        const totalHeight =
          totalElastomerThickness + nShims * shimThickness + topPlate + bottomPlate;

        // Shape factors per layer (S = A / (perimeter × t))
        const shapeFactors = layerThicknesses.map((t) => area_mm2 / (perimeter_mm * t));
        const S_min = Math.min(...shapeFactors);
        const S_max = Math.max(...shapeFactors);
        const S_avg = shapeFactors.reduce((a, b) => a + b, 0) / shapeFactors.length;

        // Effective shear modulus (weighted average)
        const G_eff =
          layerG.reduce((s, g, i) => s + g * layerThicknesses[i], 0) / totalElastomerThickness;

        // Compressive modulus (E_c = 3G(1 + 2κS²), κ ≈ 0.73 for rectangular)
        const kappa = shape === 'circular' ? 0.73 : 0.73;
        const E_c = 3 * G_eff * (1 + 2 * kappa * S_avg * S_avg);

        // Loading
        const Fv = parseFloat(formData.designVerticalLoad) || 500;
        const Fh = parseFloat(formData.designShearLoad) || 50;
        const sigma_c = (Fv * 1000) / area_mm2; // N/mm² = MPa

        // Compression check (EN 1337-3 §5.3.3.3)
        const K_L = 1.0;
        const allowable_stress = 2 * G_eff * S_avg * K_L;
        const compressionUtil = sigma_c / allowable_stress;

        // Shear check (EN 1337-3 §5.3.3.4)
        const v_xy = ((Fh * 1000) / area_mm2) * totalElastomerThickness;
        const epsilon_q = (Fh * 1000) / (area_mm2 * G_eff);
        const shearStrainPct = epsilon_q * 100;
        const shearUtil = epsilon_q / 1.0; // limit = 1.0 (100%)

        // Compression strain (EN 1337-3)
        const epsilon_c = (1.5 * sigma_c) / (G_eff * S_avg);
        const compressionStrainPct = epsilon_c * 100;

        // Total strain
        const totalStrain = epsilon_c + epsilon_q;
        const strainLimit = parseFloat(formData.strainLimit) || 5;
        const strainUtil = totalStrain / (strainLimit / 100);

        // Stability check (EN 1337-3 §5.3.3.5)
        const a_prime = shape === 'circular' ? D : Math.min(L, W);
        const stabilityStress = (2 * a_prime * G_eff * S_avg) / (3 * totalElastomerThickness);
        const stabilityUtil = sigma_c / stabilityStress;
        const maxEccentricity = a_prime / 6;

        // Stiffness properties
        const K_v = (E_c * area_mm2) / totalElastomerThickness / 1000; // kN/mm
        const K_h = (G_eff * area_mm2) / totalElastomerThickness / 1000; // kN/mm
        const I = shape === 'circular' ? (Math.PI * D ** 4) / 64 : (L * W ** 3) / 12;
        const K_rot = (E_c * I) / totalElastomerThickness / 1e6; // kNm/rad

        const vertDeflection = Fv / K_v;
        const horizDeflection = Fh / K_h;

        // Rotation capacity
        const maxRotation =
          (2 * totalElastomerThickness * (strainLimit / 100 - totalStrain)) /
          (shape === 'circular' ? D : W);

        // Status determination
        const compressionStatus = compressionUtil <= 1.0 ? 'PASS' : 'FAIL';
        const shearStatus = shearUtil <= 1.0 ? 'PASS' : 'FAIL';
        const strainStatus = strainUtil <= 1.0 ? 'PASS' : 'FAIL';
        const stabilityStatus = stabilityUtil <= 1.0 ? 'PASS' : 'FAIL';
        const rotationStatus = maxRotation > 0 ? 'PASS' : 'FAIL';
        const overall =
          compressionStatus === 'PASS' &&
          shearStatus === 'PASS' &&
          strainStatus === 'PASS' &&
          stabilityStatus === 'PASS';

        // Warnings
        if (compressionUtil > 1.0)
          w.push('Compression stress exceeds allowable — increase bearing area or reduce load');
        if (shearUtil > 0.8) w.push('High shear strain — review horizontal loading');
        if (strainUtil > 1.0) w.push('Total strain exceeds limit — add layers or increase area');
        if (stabilityUtil > 0.8) w.push('Approaching stability limit — check bearing proportions');
        if (S_avg < 5) w.push('Low shape factor — bearing may be too flexible');
        if (S_avg > 20) w.push('High shape factor — bearing may be too stiff');

        const recommendations: string[] = [
          `Shape factor S_avg = ${S_avg.toFixed(1)} — typical range 5–20`,
          `${layers.length} elastomer layers, ${nShims} steel shims`,
        ];
        if (!overall)
          recommendations.push('Review bearing dimensions to achieve PASS on all checks');

        const notes: string[] = [
          `EN 1337-3: G_eff=${G_eff.toFixed(2)} MPa, E_c=${E_c.toFixed(0)} MPa`,
          `σ_c=${sigma_c.toFixed(2)} MPa, limit=${allowable_stress.toFixed(2)} MPa`,
          `Shear strain ε_q=${shearStrainPct.toFixed(1)}%, Compression strain ε_c=${compressionStrainPct.toFixed(1)}%`,
          `Total strain=${(totalStrain * 100).toFixed(1)}%, Limit=${strainLimit}%`,
        ];

        setResults({
          geometry: {
            area_mm2,
            perimeter_mm,
            total_height_mm: totalHeight,
            total_elastomer_thickness_mm: totalElastomerThickness,
            aspect_ratio,
          },
          shape_factors: {
            layer_shape_factors: shapeFactors,
            min_shape_factor: S_min,
            max_shape_factor: S_max,
            average_shape_factor: S_avg,
          },
          effective_properties: { G_eff_mpa: G_eff, E_c_mpa: E_c },
          stability_check: {
            max_eccentricity_mm: maxEccentricity,
            utilisation: stabilityUtil,
            status: stabilityStatus,
          },
          compression_check: {
            nominal_stress_mpa: sigma_c,
            allowable_stress_mpa: allowable_stress,
            utilisation: compressionUtil,
            status: compressionStatus,
          },
          shear_check: {
            shear_strain_percent: shearStrainPct,
            utilisation: shearUtil,
            status: shearStatus,
          },
          strain_check: {
            compression_strain_percent: compressionStrainPct,
            shear_strain_percent: shearStrainPct,
            total_strain_percent: totalStrain * 100,
            utilisation: strainUtil,
            status: strainStatus,
          },
          stiffness_properties: {
            vertical_stiffness_kn_mm: K_v,
            horizontal_stiffness_kn_mm: K_h,
            rotational_stiffness_knm_rad: K_rot,
            vertical_deflection_mm: vertDeflection,
            horizontal_deflection_mm: horizDeflection,
          },
          rotation_capacity: {
            max_rotation_rad: maxRotation,
            status: rotationStatus,
          },
          overall_check: overall,
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

  // ===== PDF EXPORT =====
  const handleExportPDF = useCallback(async () => {
    if (!results) return;
    const reportData = buildElastomericBearingsReport(
      {
        shape: formData.shape,
        planArea: results.geometry.area_mm2,
        length: parseFloat(formData.length) || 0,
        width: parseFloat(formData.width) || 0,
        diameter: parseFloat(formData.diameter) || 0,
        topPlateThickness: parseFloat(formData.topPlateThickness) || 0,
        bottomPlateThickness: parseFloat(formData.bottomPlateThickness) || 0,
        designVerticalLoad: parseFloat(formData.designVerticalLoad) || 0,
        designShearLoad: parseFloat(formData.designShearLoad) || 0,
        serviceTemperature: parseFloat(formData.serviceTemperature) || 0,
        temperatureRange: parseFloat(formData.temperatureRange) || 0,
        shapeFactorMin: parseFloat(formData.shapeFactorMin) || 0,
        shapeFactorMax: parseFloat(formData.shapeFactorMax) || 0,
        strainLimit: parseFloat(formData.strainLimit) || 0,
        compressionStressLimit: parseFloat(formData.compressionStressLimit) || 0,
        elastomerLayers: formData.elastomerLayers.map((l) => ({
          thickness_mm: parseFloat(l.thickness_mm) || 0,
          shear_modulus_mpa: parseFloat(l.shear_modulus_mpa) || 0,
          bulk_modulus_mpa: parseFloat(l.bulk_modulus_mpa) || 0,
        })),
        steelShims: {
          number_of_shims: parseInt(formData.steelShims.number_of_shims) || 0,
          shim_thickness_mm: parseFloat(formData.steelShims.shim_thickness_mm) || 0,
          shim_modulus_mpa: parseFloat(formData.steelShims.shim_modulus_mpa) || 0,
        },
      },
      {
        status: results.overall_check ? 'PASS' : 'FAIL',
        maxUtilisation: Math.max(
          results.compression_check.utilisation,
          results.shear_check.utilisation,
          results.strain_check.utilisation,
          results.stability_check.utilisation,
        ),
        criticalCheck: (() => {
          const checks = [
            { name: 'Compression', u: results.compression_check.utilisation },
            { name: 'Shear', u: results.shear_check.utilisation },
            { name: 'Strain', u: results.strain_check.utilisation },
            { name: 'Stability', u: results.stability_check.utilisation },
          ];
          return checks.sort((a, b) => b.u - a.u)[0].name;
        })(),
        shapeFactor: results.shape_factors.average_shape_factor,
        compressiveStrain: results.strain_check.compression_strain_percent / 100,
        shearStrain: results.shear_check.shear_strain_percent / 100,
        rotationStrain: 0,
        totalStrain: results.strain_check.total_strain_percent / 100,
        compressiveStress: results.compression_check.nominal_stress_mpa,
        stabilityFactor: 1 / (results.stability_check.utilisation || 1),
      },
      warnings.map((w) => ({ type: 'warning' as const, message: w })),
      { projectName: 'Elastomeric Bearing Design', clientName: '', preparedBy: '' },
    );
    await generatePremiumPDF(reportData as any);
  }, [formData, results, warnings]);

  // DOCX Export — Editable Word document
  const handleExportDOCX = useCallback(() => {
    if (!results) return;
    generateDOCX({
      title: 'Elastomeric Bearing Design',
      subtitle: 'EN 1337-3 Compliant',
      projectInfo: [
        { label: 'Shape', value: formData.shape },
        { label: 'Plan Area', value: `${results.geometry.area_mm2?.toFixed(0) || '-'} mm²` },
      ],
      inputs: [
        { label: 'Shape', value: formData.shape, unit: '' },
        { label: 'Length', value: formData.length, unit: 'mm' },
        { label: 'Width', value: formData.width, unit: 'mm' },
        { label: 'Design Vertical Load', value: formData.designVerticalLoad, unit: 'kN' },
        { label: 'Design Shear Load', value: formData.designShearLoad, unit: 'kN' },
        { label: 'Service Temperature', value: formData.serviceTemperature, unit: '°C' },
      ],
      checks: [
        {
          name: 'Compression',
          capacity: `${results.compression_check.allowable_stress_mpa?.toFixed(1) || '-'} MPa`,
          utilisation: `${(results.compression_check.utilisation * 100).toFixed(1)}%`,
          status: (results.compression_check.utilisation <= 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Shear',
          capacity: `${((results.shear_check as any).shearCapacity ?? 0).toFixed(1)} kN`,
          utilisation: `${(results.shear_check.utilisation * 100).toFixed(1)}%`,
          status: (results.shear_check.utilisation <= 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Strain',
          capacity: `${formData.strainLimit}`,
          utilisation: `${(results.strain_check.utilisation * 100).toFixed(1)}%`,
          status: (results.strain_check.utilisation <= 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
        {
          name: 'Stability',
          capacity: '-',
          utilisation: `${(results.stability_check.utilisation * 100).toFixed(1)}%`,
          status: (results.stability_check.utilisation <= 1 ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        },
      ],
      recommendations: [
        {
          check: 'Overall',
          suggestion: results.overall_check
            ? 'Design adequate per EN 1337-3'
            : 'Revise bearing dimensions or loading',
        },
      ],
      warnings: warnings || [],
      footerNote: 'Beaver Bridges Ltd — Elastomeric Bearing Design',
    });
  }, [formData, results, warnings]);

  // ─── Derived values ───
  const maxUtil = results
    ? Math.max(
        results.compression_check.utilisation,
        results.shear_check.utilisation,
        results.strain_check.utilisation,
        results.stability_check.utilisation,
      ) * 100
    : 0;
  const overallStatus: 'PASS' | 'FAIL' | 'WARNING' = results
    ? maxUtil > 100
      ? 'FAIL'
      : maxUtil > 85
        ? 'WARNING'
        : 'PASS'
    : 'PASS';

  // ─── Auto-calculate on mount ───
  useEffect(() => {
    const timer = setTimeout(runCalculation, 300);
    return () => clearTimeout(timer);
  }, [runCalculation]);

  // ─── Debounced What-If recalc ───
  useEffect(() => {
    if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    calcTimerRef.current = setTimeout(runCalculation, 150);
    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [formData, runCalculation]);

  // ─── What-If sliders ───
  const whatIfSliders = [
    {
      key: 'designVerticalLoad' as keyof FormData,
      label: 'Vertical Load',
      min: 50,
      max: 5000,
      step: 50,
      unit: 'kN',
    },
    {
      key: 'designShearLoad' as keyof FormData,
      label: 'Shear Load',
      min: 0,
      max: 500,
      step: 10,
      unit: 'kN',
    },
    { key: 'length' as keyof FormData, label: 'Length', min: 100, max: 800, step: 10, unit: 'mm' },
    { key: 'width' as keyof FormData, label: 'Width', min: 100, max: 600, step: 10, unit: 'mm' },
  ];

  // ===== HELPER COMPONENTS =====

  const InputField = ({ label, field, unit }: { label: string; field: string; unit?: string }) => (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <ExplainableLabel
          label={label}
          field={field}
          className="text-sm text-gray-200 font-semibold"
        />{' '}
        {unit && <span className="text-xs text-neon-cyan">({unit})</span>}
      </div>
      <div className="relative">
        <input
          type="number"
          value={(formData as any)[field] || ''}
          onChange={(e) => updateForm(field as keyof FormData, e.target.value)}
          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300 hover:bg-gray-900/70"
          placeholder="0"
          title={label}
        />
        {(formData as any)[field] && (
          <div className="absolute right-3 top-3 text-neon-cyan">
            <FiCheck size={20} />
          </div>
        )}
      </div>
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
      <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
        <CardHeader className="cursor-pointer py-3" onClick={() => toggleSection(sectionId)}>
          <CardTitle className="text-2xl text-white flex items-center space-x-3">
            {icon}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        {expandedSections[sectionId] && <CardContent>{children}</CardContent>}
      </Card>
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
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
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
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-black mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">
              Elastomeric Bearings
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            EN 1337-3 laminated elastomeric bearing design with shape factor analysis, strain
            verification and stability assessment
          </p>

          {/* Consolidated Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-gray-900/50 p-4 rounded-2xl border border-gray-800 glass">
            {/* Presets Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="glass"
                  onClick={() => setShowPresets(!showPresets)}
                  className="flex items-center gap-2 border-neon-cyan/30 text-neon-cyan"
                >
                  <FiZap /> Presets <FiChevronDown />
                </Button>
                {showPresets && (
                  <div className="absolute top-12 left-0 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {Object.entries(PRESETS).map(([key, p]) => (
                      <button
                        key={key}
                        onClick={() => {
                          applyPreset(key);
                          setShowPresets(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-neon-cyan/10 hover:text-neon-cyan transition-colors border-b border-gray-800 last:border-0"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex bg-gray-950/50 p-1 rounded-xl border border-gray-800">
              {[
                { id: 'input', label: 'Inputs', icon: <FiSettings /> },
                { id: 'results', label: 'Results', icon: <FiActivity />, disabled: !results },
                {
                  id: 'visualization',
                  label: 'Diagrams',
                  icon: <FiBarChart2 />,
                  disabled: !results,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed',
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <SaveRunButton
                calculatorKey="elastomeric_bearings"
                inputs={formData as unknown as Record<string, string | number>}
                results={results}
              />
              <Button
                variant="glass"
                disabled={!results}
                onClick={handleExportPDF}
                className="flex items-center gap-2 border-neon-cyan/30 text-neon-cyan disabled:opacity-30"
              >
                <FiDownload /> PDF
              </Button>
              <Button
                variant="glass"
                disabled={!results}
                onClick={handleExportDOCX}
                className="flex items-center gap-2 border-neon-purple/30 text-neon-purple disabled:opacity-30"
              >
                <FiDownload /> DOCX
              </Button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 space-y-4">
                {/* Bearing Geometry */}
                <CollapsibleSection
                  title="Bearing Geometry"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiLayers className="text-white" size={24} />
                    </motion.div>
                  }
                  variant="cyan"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-200 font-semibold mb-1">
                        Shape
                      </label>
                      <select
                        value={formData.shape}
                        onChange={(e) => updateForm('shape', e.target.value)}
                        title="Shape"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                      >
                        <option value="rectangular">Rectangular</option>
                        <option value="circular">Circular</option>
                      </select>
                    </div>
                    {formData.shape === 'rectangular' ? (
                      <>
                        <InputField label="Length" field="length" unit="mm" />
                        <InputField label="Width" field="width" unit="mm" />
                      </>
                    ) : (
                      <InputField label="Diameter" field="diameter" unit="mm" />
                    )}
                    <InputField label="Top Plate" field="topPlateThickness" unit="mm" />
                    <InputField label="Bottom Plate" field="bottomPlateThickness" unit="mm" />
                  </div>
                </CollapsibleSection>

                {/* Elastomer Layers */}
                <CollapsibleSection
                  title={`Elastomer Layers (${formData.elastomerLayers.length})`}
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-neon-purple to-pink-500 rounded-xl flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      <FiLayers className="text-white" size={24} />
                    </motion.div>
                  }
                  variant="purple"
                >
                  <div className="space-y-3">
                    {formData.elastomerLayers.map((layer, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-900/30 rounded-xl border border-gray-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-400 font-bold text-sm">
                            Layer #{index + 1}
                          </span>
                          {formData.elastomerLayers.length > 1 && (
                            <Button
                              onClick={() => removeElastomerLayer(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                            >
                              <FiTrash2 size={14} />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {
                              key: 'thickness_mm' as keyof ElastomerLayer,
                              label: 'Thickness',
                              unit: 'mm',
                            },
                            {
                              key: 'shear_modulus_mpa' as keyof ElastomerLayer,
                              label: 'Shear Mod.',
                              unit: 'MPa',
                            },
                            {
                              key: 'bulk_modulus_mpa' as keyof ElastomerLayer,
                              label: 'Bulk Mod.',
                              unit: 'MPa',
                            },
                          ].map((f) => (
                            <div key={f.key}>
                              <label className="text-xs text-gray-200 font-semibold block mb-1">
                                {f.label} ({f.unit})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={layer[f.key]}
                                onChange={(e) => handleLayerChange(index, f.key, e.target.value)}
                                title={f.label}
                                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple transition-all duration-300"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={addElastomerLayer}
                      variant="outline"
                      size="sm"
                      className="border-purple-500/40 text-purple-400 hover:border-purple-400 hover:bg-purple-500/20 hover:text-white w-full"
                    >
                      + Add Layer
                    </Button>
                  </div>
                </CollapsibleSection>

                {/* Steel Shims */}
                <CollapsibleSection
                  title="Steel Shim Plates"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiActivity className="text-white" size={24} />
                    </motion.div>
                  }
                  variant="amber"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-200 font-semibold mb-1">
                        No. of Shims
                      </label>
                      <input
                        type="number"
                        value={formData.steelShims.number_of_shims}
                        onChange={(e) => handleShimsChange('number_of_shims', e.target.value)}
                        title="Number of Shims"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-200 font-semibold mb-1">
                        Thickness (mm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.steelShims.shim_thickness_mm}
                        onChange={(e) => handleShimsChange('shim_thickness_mm', e.target.value)}
                        title="Shim Thickness"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-200 font-semibold mb-1">
                        Modulus (MPa)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        value={formData.steelShims.shim_modulus_mpa}
                        onChange={(e) => handleShimsChange('shim_modulus_mpa', e.target.value)}
                        title="Shim Modulus"
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan transition-all duration-300"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Loading */}
                <CollapsibleSection
                  title="Loading & Design Parameters"
                  icon={
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      <FiZap className="text-white" size={24} />
                    </motion.div>
                  }
                  variant="orange"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InputField label="Vertical Load" field="designVerticalLoad" unit="kN" />
                    <InputField label="Shear Load" field="designShearLoad" unit="kN" />
                    <InputField label="Service Temp" field="serviceTemperature" unit="°C" />
                    <InputField label="Temp Range" field="temperatureRange" unit="°C" />
                    <InputField label="Strain Limit" field="strainLimit" unit="%" />
                    <InputField label="Stress Limit" field="compressionStressLimit" unit="MPa" />
                    <InputField label="Min Shape Factor" field="shapeFactorMin" />
                    <InputField label="Max Shape Factor" field="shapeFactorMax" />
                  </div>
                </CollapsibleSection>

                {/* Calculate Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={() => {
                      runCalculation();
                      setActiveTab('results');
                    }}
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
              </div>

              {/* Right Column — 3D + What-If */}
              <div className="space-y-4 lg:sticky lg:top-32">
                <WhatIfPreview
                  title="Elastomeric Bearings — 3D Preview"
                  sliders={whatIfSliders}
                  form={formData}
                  updateForm={updateForm}
                  status={
                    results
                      ? results.overall_check
                        ? ('PASS' as const)
                        : ('FAIL' as const)
                      : undefined
                  }
                  utilisation={maxUtil}
                  renderScene={(fsHeight) => (
                    <Interactive3DDiagram height={fsHeight} cameraPosition={[6, 4, 6]}>
                      <ElastomericBearings3D
                        shape={formData.shape}
                        length={parseFloat(formData.length) || 400}
                        width={parseFloat(formData.width) || 300}
                        diameter={parseFloat(formData.diameter) || 300}
                        nLayers={formData.elastomerLayers.length}
                        layerThickness={parseFloat(formData.elastomerLayers[0]?.thickness_mm) || 12}
                        nShims={parseInt(formData.steelShims.number_of_shims) || 2}
                        shimThickness={parseFloat(formData.steelShims.shim_thickness_mm) || 3}
                        topPlate={parseFloat(formData.topPlateThickness) || 25}
                        bottomPlate={parseFloat(formData.bottomPlateThickness) || 25}
                        load={parseFloat(formData.designVerticalLoad) || 0}
                        status={results ? (results.overall_check ? 'PASS' : 'FAIL') : 'PASS'}
                      />
                    </Interactive3DDiagram>
                  )}
                />

                {/* Quick Presets */}
                <Card variant="glass" className="border-neon-cyan/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-200 flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center">
                        <FiZap className="w-2.5 h-2.5 text-white" />
                      </div>{' '}
                      Quick Presets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-1.5">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => applyPreset(key)}
                          className="w-full px-3 py-2 text-left text-xs text-gray-300 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-neon-cyan hover:text-neon-cyan hover:bg-neon-cyan/5 transition-colors truncate"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Live Results */}
                {results && (
                  <Card variant="glass" className="border-neon-cyan/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                          <FiEye className="w-2.5 h-2.5 text-white" />
                        </div>{' '}
                        Live Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Shape Factor</span>
                        <span className="text-cyan-400">
                          {results.shape_factors.average_shape_factor.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Compression</span>
                        <span
                          className={
                            results.compression_check.utilisation > 1
                              ? 'text-red-400'
                              : 'text-white'
                          }
                        >
                          {(results.compression_check.utilisation * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Shear</span>
                        <span
                          className={
                            results.shear_check.utilisation > 1 ? 'text-red-400' : 'text-white'
                          }
                        >
                          {(results.shear_check.utilisation * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Strain</span>
                        <span
                          className={
                            results.strain_check.utilisation > 1 ? 'text-red-400' : 'text-white'
                          }
                        >
                          {results.strain_check.total_strain_percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Stability</span>
                        <span
                          className={
                            results.stability_check.utilisation > 1 ? 'text-red-400' : 'text-white'
                          }
                        >
                          {(results.stability_check.utilisation * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">K_v</span>
                        <span className="text-cyan-400">
                          {results.stiffness_properties.vertical_stiffness_kn_mm.toFixed(1)} kN/mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">K_h</span>
                        <span className="text-cyan-400">
                          {results.stiffness_properties.horizontal_stiffness_kn_mm.toFixed(1)} kN/mm
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
              className="space-y-6"
            >
              {/* Top Results Summary — 4 checks */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Compression', val: results.compression_check, icon: <FiActivity /> },
                  { label: 'Shear', val: results.shear_check, icon: <FiBarChart2 /> },
                  { label: 'Total Strain', val: results.strain_check, icon: <FiLayers /> },
                  { label: 'Stability', val: results.stability_check, icon: <FiZap /> },
                ].map((item, i) => (
                  <Card
                    key={i}
                    variant="glass"
                    className={cn(
                      'border-l-4',
                      item.val.status === 'PASS' ? 'border-l-green-500' : 'border-l-red-500',
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-1.5 bg-gray-800 rounded-lg text-gray-400">
                          {item.icon}
                        </div>
                        <span
                          className={cn(
                            'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
                            item.val.status === 'PASS'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400',
                          )}
                        >
                          {item.val.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                      <p className="text-2xl font-black text-white">
                        {(item.val.utilisation * 100).toFixed(1)}%
                      </p>
                      <div className="mt-2 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(item.val.utilisation * 100, 100)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className={cn(
                            'h-full rounded-full',
                            item.val.utilisation > 1
                              ? 'bg-red-500'
                              : item.val.utilisation > 0.8
                                ? 'bg-orange-500'
                                : 'bg-gradient-to-r from-neon-cyan to-neon-blue',
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* Geometry */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-blue rounded-xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiLayers className="text-white" size={24} />
                        </motion.div>
                        <span>Shape Factors & Geometry</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          {
                            label: 'Plan Area',
                            value: (results.geometry.area_mm2 / 1e6).toFixed(3),
                            unit: 'm²',
                          },
                          {
                            label: 'Perimeter',
                            value: (results.geometry.perimeter_mm / 1000).toFixed(2),
                            unit: 'm',
                          },
                          {
                            label: 'Elastomer',
                            value: `${results.geometry.total_elastomer_thickness_mm}`,
                            unit: 'mm',
                          },
                          {
                            label: 'Shape Factor',
                            value: results.shape_factors.average_shape_factor.toFixed(1),
                            unit: 'S_avg',
                            highlight: true,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-3 bg-gray-900/50 rounded-xl border border-gray-800"
                          >
                            <span className="text-[10px] text-gray-500 block mb-0.5 uppercase tracking-wider">
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                'text-sm font-bold',
                                item.highlight ? 'text-neon-cyan' : 'text-white',
                              )}
                            >
                              {item.value}{' '}
                              <span className="text-[10px] text-gray-500 font-normal">
                                {item.unit}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Design Checks */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-blue to-indigo-600 rounded-xl flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <FiActivity className="text-white" size={24} />
                        </motion.div>
                        <span>Design Check Utilisations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <UtilisationBar
                        label="Compression Stress"
                        value={results.compression_check.utilisation}
                      />
                      <UtilisationBar
                        label="Shear Strain"
                        value={results.shear_check.utilisation}
                      />
                      <UtilisationBar
                        label="Total Strain"
                        value={results.strain_check.utilisation}
                      />
                      <UtilisationBar
                        label="Stability"
                        value={results.stability_check.utilisation}
                      />
                      <p className="text-xs font-mono text-neon-cyan mt-3">
                        EN 1337-3 §5.3.3 | G_eff ={' '}
                        {results.effective_properties.G_eff_mpa.toFixed(2)} MPa, E_c ={' '}
                        {results.effective_properties.E_c_mpa.toFixed(0)} MPa
                      </p>
                    </CardContent>
                  </Card>

                  {/* Stiffness */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-2xl text-white flex items-center space-x-3">
                        <motion.div
                          className="w-12 h-12 bg-gradient-to-br from-neon-purple to-pink-500 rounded-xl flex items-center justify-center"
                          whileHover={{ scale: 1.1 }}
                        >
                          <FiActivity className="text-white" size={24} />
                        </motion.div>
                        <span>Stiffness & Deformation</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          {
                            label: 'K_v',
                            value: results.stiffness_properties.vertical_stiffness_kn_mm.toFixed(1),
                            unit: 'kN/mm',
                          },
                          {
                            label: 'K_h',
                            value:
                              results.stiffness_properties.horizontal_stiffness_kn_mm.toFixed(1),
                            unit: 'kN/mm',
                          },
                          {
                            label: 'K_rot',
                            value:
                              results.stiffness_properties.rotational_stiffness_knm_rad.toFixed(1),
                            unit: 'kNm/rad',
                          },
                          {
                            label: 'δ_v',
                            value: results.stiffness_properties.vertical_deflection_mm.toFixed(2),
                            unit: 'mm',
                          },
                          {
                            label: 'δ_h',
                            value: results.stiffness_properties.horizontal_deflection_mm.toFixed(2),
                            unit: 'mm',
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-3 bg-gray-900/50 rounded-xl border border-gray-800"
                          >
                            <span className="text-[10px] text-gray-500 block mb-0.5 uppercase tracking-wider">
                              {item.label}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {item.value}{' '}
                              <span className="text-[10px] text-gray-500 font-normal">
                                {item.unit}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <Card
                    className={cn(
                      'border-2 shadow-lg',
                      results.overall_check
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30',
                    )}
                    style={{
                      boxShadow: results.overall_check
                        ? '0 10px 15px -3px rgba(16,185,129,0.2)'
                        : '0 10px 15px -3px rgba(239,68,68,0.2)',
                    }}
                  >
                    <CardContent className="py-6 text-center">
                      <div
                        className={cn(
                          'text-4xl mb-2',
                          results.overall_check ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results.overall_check ? (
                          <FiCheck className="inline" />
                        ) : (
                          <FiX className="inline" />
                        )}
                      </div>
                      <div
                        className={cn(
                          'font-bold text-lg',
                          results.overall_check ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results.overall_check ? 'ALL CHECKS PASS' : 'DESIGN CHECK FAILURE'}
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        Max Utilisation: {maxUtil.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>

                  {/* Warnings */}
                  {warnings.length > 0 && (
                    <Card className="bg-amber-500/10 border-amber-500/30">
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

                  {/* Recommendations */}
                  {results.recommendations.length > 0 && (
                    <Card className="bg-blue-500/10 border-blue-500/30">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                          <FiCheck />
                          <span className="font-medium">Recommendations</span>
                        </div>
                        <ul className="text-sm text-blue-300 space-y-1">
                          {results.recommendations.map((r, i) => (
                            <li key={i}>• {r}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Design Notes */}
                  <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Design Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1.5 text-white">
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
                      className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-teal-600 rounded-xl flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <FiActivity className="text-white" size={24} />
                    </motion.div>
                    <span>Utilisation Dashboard</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      {
                        label: 'Compression',
                        value: results.compression_check.utilisation,
                        color: 'cyan',
                      },
                      { label: 'Shear', value: results.shear_check.utilisation, color: 'blue' },
                      {
                        label: 'Total Strain',
                        value: results.strain_check.utilisation,
                        color: 'purple',
                      },
                      {
                        label: 'Stability',
                        value: results.stability_check.utilisation,
                        color: 'emerald',
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
                {/* Bearing Cross-Section */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Bearing Cross-Section</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 200" className="w-full h-48">
                      {/* Bottom plate */}
                      <rect
                        x="30"
                        y="150"
                        width="140"
                        height="10"
                        fill="#94a3b8"
                        stroke="#60a5fa"
                        strokeWidth="0.5"
                      />
                      <text x="175" y="158" fill="#94a3b8" fontSize="7">
                        {formData.bottomPlateThickness}mm
                      </text>
                      {/* Elastomer layers + shims */}
                      {formData.elastomerLayers.map((_, i) => {
                        const yBase = 150 - (i + 1) * 25;
                        return (
                          <g key={i}>
                            <rect
                              x="30"
                              y={yBase}
                              width="140"
                              height="20"
                              fill="#06b6d4"
                              opacity="0.4"
                              stroke="#06b6d4"
                              strokeWidth="0.5"
                            />
                            <text
                              x="100"
                              y={yBase + 13}
                              textAnchor="middle"
                              fill="white"
                              fontSize="8"
                            >
                              Layer {i + 1}
                            </text>
                            {i < (parseInt(formData.steelShims.number_of_shims) || 0) &&
                              i < formData.elastomerLayers.length - 1 && (
                                <rect
                                  x="30"
                                  y={yBase - 4}
                                  width="140"
                                  height="4"
                                  fill="#fbbf24"
                                  stroke="#f59e0b"
                                  strokeWidth="0.3"
                                />
                              )}
                          </g>
                        );
                      })}
                      {/* Top plate */}
                      <rect
                        x="30"
                        y={150 - formData.elastomerLayers.length * 25 - 10}
                        width="140"
                        height="10"
                        fill="#94a3b8"
                        stroke="#60a5fa"
                        strokeWidth="0.5"
                      />
                      <text x="100" y="190" textAnchor="middle" fill="#94a3b8" fontSize="9">
                        {formData.shape === 'circular'
                          ? `Ø${formData.diameter}mm`
                          : `${formData.length}×${formData.width}mm`}
                      </text>
                    </svg>
                  </CardContent>
                </Card>

                {/* Strain Breakdown */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Strain Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {(() => {
                        const limit = parseFloat(formData.strainLimit) || 5;
                        const scale = 140 / limit;
                        const compH =
                          (results.strain_check.compression_strain_percent * scale) / 100;
                        const shearH = (results.strain_check.shear_strain_percent * scale) / 100;
                        return (
                          <>
                            <rect
                              x="30"
                              y={150 - compH}
                              width="50"
                              height={compH}
                              fill="#06b6d4"
                              rx="2"
                            />
                            <text
                              x="55"
                              y={145 - compH}
                              textAnchor="middle"
                              fill="#06b6d4"
                              fontSize="9"
                            >
                              {results.strain_check.compression_strain_percent.toFixed(1)}%
                            </text>
                            <text x="55" y="165" textAnchor="middle" fill="#94a3b8" fontSize="8">
                              ε_c
                            </text>
                            <rect
                              x="100"
                              y={150 - shearH}
                              width="50"
                              height={shearH}
                              fill="#a855f7"
                              rx="2"
                            />
                            <text
                              x="125"
                              y={145 - shearH}
                              textAnchor="middle"
                              fill="#a855f7"
                              fontSize="9"
                            >
                              {results.strain_check.shear_strain_percent.toFixed(1)}%
                            </text>
                            <text x="125" y="165" textAnchor="middle" fill="#94a3b8" fontSize="8">
                              ε_q
                            </text>
                            <line
                              x1="25"
                              y1={150 - (limit * scale) / 100}
                              x2="175"
                              y2={150 - (limit * scale) / 100}
                              stroke="#ef4444"
                              strokeWidth="1"
                              strokeDasharray="4 2"
                            />
                            <text
                              x="178"
                              y={153 - (limit * scale) / 100}
                              fill="#ef4444"
                              fontSize="8"
                            >
                              Limit={limit}%
                            </text>
                            <text x="100" y="178" textAnchor="middle" fill="#94a3b8" fontSize="9">
                              Total: {results.strain_check.total_strain_percent.toFixed(1)}%
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </CardContent>
                </Card>

                {/* Stiffness Diagram */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Stiffness Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {(() => {
                        const kv = results.stiffness_properties.vertical_stiffness_kn_mm;
                        const kh = results.stiffness_properties.horizontal_stiffness_kn_mm;
                        const maxK = Math.max(kv, kh, 1);
                        const kvH = (kv / maxK) * 100;
                        const khH = (kh / maxK) * 100;
                        return (
                          <>
                            <rect
                              x="40"
                              y={140 - kvH}
                              width="45"
                              height={kvH}
                              fill="#06b6d4"
                              rx="3"
                              opacity="0.7"
                            />
                            <text
                              x="62"
                              y={135 - kvH}
                              textAnchor="middle"
                              fill="#06b6d4"
                              fontSize="9"
                            >
                              {kv.toFixed(1)}
                            </text>
                            <text x="62" y="155" textAnchor="middle" fill="#94a3b8" fontSize="8">
                              K_v
                            </text>
                            <rect
                              x="110"
                              y={140 - khH}
                              width="45"
                              height={khH}
                              fill="#a855f7"
                              rx="3"
                              opacity="0.7"
                            />
                            <text
                              x="132"
                              y={135 - khH}
                              textAnchor="middle"
                              fill="#a855f7"
                              fontSize="9"
                            >
                              {kh.toFixed(1)}
                            </text>
                            <text x="132" y="155" textAnchor="middle" fill="#94a3b8" fontSize="8">
                              K_h
                            </text>
                            <text x="100" y="172" textAnchor="middle" fill="#94a3b8" fontSize="9">
                              kN/mm
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </CardContent>
                </Card>

                {/* Shape Factor Analysis */}
                <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Shape Factor per Layer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <svg viewBox="0 0 200 180" className="w-full h-48">
                      {(() => {
                        const factors = results.shape_factors.layer_shape_factors;
                        const maxS = Math.max(...factors, 1);
                        const barW = Math.min(30, 140 / factors.length);
                        return (
                          <>
                            {factors.map((s, i) => {
                              const x = 30 + i * (barW + 5);
                              const h = (s / maxS) * 110;
                              return (
                                <g key={i}>
                                  <rect
                                    x={x}
                                    y={140 - h}
                                    width={barW}
                                    height={h}
                                    fill="#22c55e"
                                    rx="2"
                                    opacity="0.7"
                                  />
                                  <text
                                    x={x + barW / 2}
                                    y={135 - h}
                                    textAnchor="middle"
                                    fill="#22c55e"
                                    fontSize="8"
                                  >
                                    {s.toFixed(1)}
                                  </text>
                                  <text
                                    x={x + barW / 2}
                                    y="155"
                                    textAnchor="middle"
                                    fill="#94a3b8"
                                    fontSize="7"
                                  >
                                    L{i + 1}
                                  </text>
                                </g>
                              );
                            })}
                            <line
                              x1="25"
                              y1={140 - ((parseFloat(formData.shapeFactorMin) || 5) / maxS) * 110}
                              x2="180"
                              y2={140 - ((parseFloat(formData.shapeFactorMin) || 5) / maxS) * 110}
                              stroke="#f59e0b"
                              strokeWidth="1"
                              strokeDasharray="3 2"
                            />
                            <text
                              x="183"
                              y={143 - ((parseFloat(formData.shapeFactorMin) || 5) / maxS) * 110}
                              fill="#f59e0b"
                              fontSize="7"
                            >
                              min
                            </text>
                            <text x="100" y="172" textAnchor="middle" fill="#94a3b8" fontSize="9">
                              Avg: {results.shape_factors.average_shape_factor.toFixed(1)}
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
                  <CardTitle className="text-lg">3D Bearing View</CardTitle>
                </CardHeader>
                <CardContent>
                  <Interactive3DDiagram
                    height="500px"
                    cameraPosition={[4, 4, 4]}
                    status={results ? (results.overall_check ? 'PASS' : 'FAIL') : undefined}
                  >
                    <ElastomericBearings3D
                      shape={formData.shape}
                      length={parseFloat(formData.length) || 400}
                      width={parseFloat(formData.width) || 300}
                      diameter={parseFloat(formData.diameter) || 300}
                      nLayers={formData.elastomerLayers.length}
                      layerThickness={parseFloat(formData.elastomerLayers[0]?.thickness_mm) || 12}
                      nShims={parseInt(formData.steelShims.number_of_shims) || 2}
                      shimThickness={parseFloat(formData.steelShims.shim_thickness_mm) || 3}
                      topPlate={parseFloat(formData.topPlateThickness) || 25}
                      bottomPlate={parseFloat(formData.bottomPlateThickness) || 25}
                      load={parseFloat(formData.designVerticalLoad) || 0}
                      status={results ? (results.overall_check ? 'PASS' : 'FAIL') : 'PASS'}
                    />
                  </Interactive3DDiagram>
                </CardContent>
              </Card>

              {/* Design Summary */}
              <Card variant="glass" className="border-neon-cyan/30 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Design Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block">Shape</span>
                      <span className="text-white font-medium capitalize">{formData.shape}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Dimensions</span>
                      <span className="text-white font-medium">
                        {formData.shape === 'circular'
                          ? `Ø${formData.diameter}`
                          : `${formData.length}×${formData.width}`}{' '}
                        mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Layers</span>
                      <span className="text-white font-medium">
                        {formData.elastomerLayers.length} elast. +{' '}
                        {formData.steelShims.number_of_shims} shims
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Shape Factor</span>
                      <span className="text-cyan-400 font-medium">
                        {results.shape_factors.average_shape_factor.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Vertical Load</span>
                      <span className="text-white font-medium">
                        {formData.designVerticalLoad} kN
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">K_v / K_h</span>
                      <span className="text-cyan-400 font-medium">
                        {results.stiffness_properties.vertical_stiffness_kn_mm.toFixed(0)} /{' '}
                        {results.stiffness_properties.horizontal_stiffness_kn_mm.toFixed(1)} kN/mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Total Strain</span>
                      <span
                        className={cn(
                          'font-medium',
                          results.strain_check.utilisation > 1
                            ? 'text-red-400'
                            : 'text-emerald-400',
                        )}
                      >
                        {results.strain_check.total_strain_percent.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Status</span>
                      <span
                        className={cn(
                          'font-bold',
                          results.overall_check ? 'text-emerald-400' : 'text-red-400',
                        )}
                      >
                        {results.overall_check ? 'PASS' : 'FAIL'}
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

export default ElastomericBearings;
