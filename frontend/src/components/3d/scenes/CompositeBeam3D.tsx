// =============================================================================
// 3D Scene: Composite Beam — steel I-beam with concrete slab, shear studs,
// supports, loads, labels, neutral axis, and utilisation-based colouring.
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface CompositeBeam3DProps {
  /** Beam span in metres */
  span?: number;
  /** Steel section overall depth in mm */
  steelDepth?: number;
  /** Steel flange width in mm */
  flangeWidth?: number;
  /** Steel web thickness in mm */
  webThickness?: number;
  /** Steel flange thickness in mm */
  flangeThickness?: number;
  /** Concrete slab thickness in mm */
  slabThickness?: number;
  /** Concrete slab width (effective breadth) in mm */
  slabWidth?: number;
  /** UDL in kN/m */
  udl?: number;
  /** Number of shear connectors along half-span */
  connectorCount?: number;
  /** Connector spacing in mm */
  connectorSpacing?: number;
  /** Neutral axis position from bottom of steel, mm */
  neutralAxisY?: number;
  /** Overall max utilisation 0-100+ */
  utilisation?: number;
  /** Overall status */
  status?: 'PASS' | 'FAIL';
  /** Steel grade label */
  steelGrade?: string;
  /** Concrete grade label */
  concreteGrade?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PinnedSupport({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <coneGeometry args={[0.18, 0.3, 3]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function RollerSupport({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.035, 0.3, 0.18]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function LoadArrow({
  position,
  magnitude,
  color = '#fbbf24',
}: {
  position: [number, number, number];
  magnitude: number;
  color?: string;
}) {
  const arrowLen = Math.min(0.7, Math.max(0.25, magnitude / 60));
  return (
    <group position={position}>
      <mesh position={[0, arrowLen / 2 + 0.08, 0]}>
        <cylinderGeometry args={[0.018, 0.018, arrowLen, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function UDLArrows({
  start,
  end,
  y,
  magnitude,
}: {
  start: number;
  end: number;
  y: number;
  magnitude: number;
}) {
  const count = Math.max(3, Math.round((end - start) / 0.3));
  const arrows = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= count; i++) arr.push(start + (i / count) * (end - start));
    return arr;
  }, [start, end, count]);
  return (
    <group>
      {arrows.map((x, i) => (
        <LoadArrow key={i} position={[x, y, 0]} magnitude={magnitude} />
      ))}
      {/* Connecting bar across top of arrows */}
      <mesh position={[(start + end) / 2, y + Math.min(0.7, Math.max(0.25, magnitude / 60)) + 0.08, 0]}>
        <boxGeometry args={[end - start, 0.012, 0.012]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** Cross-section end cap */
function CrossSectionEndCap({
  x,
  beamY,
  hWeb,
  tWeb,
  bFlange,
  tFlange,
  hSlab,
  bSlab,
}: {
  x: number;
  beamY: number;
  hWeb: number;
  tWeb: number;
  bFlange: number;
  tFlange: number;
  hSlab: number;
  bSlab: number;
}) {
  const mat = <meshStandardMaterial color="#1e293b" emissive="#00d9ff" emissiveIntensity={0.06} side={THREE.DoubleSide} />;
  return (
    <group position={[x, 0, 0]}>
      {/* Top flange */}
      <mesh position={[0, beamY + hWeb / 2 + tFlange / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[bFlange, tFlange]} />
        {mat}
      </mesh>
      {/* Web */}
      <mesh position={[0, beamY, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[tWeb, hWeb]} />
        {mat}
      </mesh>
      {/* Bottom flange */}
      <mesh position={[0, beamY - hWeb / 2 - tFlange / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[bFlange, tFlange]} />
        {mat}
      </mesh>
      {/* Slab */}
      <mesh position={[0, beamY + hWeb / 2 + tFlange + hSlab / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[bSlab, hSlab]} />
        <meshStandardMaterial color="#1e293b" emissive="#a855f7" emissiveIntensity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Pulsating glow ring */
function GlowRing({
  status,
  radius,
  utilisation,
}: {
  status: 'PASS' | 'FAIL';
  radius: number;
  utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.03;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.08 + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 8, 64]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.8} transparent opacity={0.1} />
    </mesh>
  );
}

/** Shear stud connector */
function ShearStud({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Stud shaft */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.06, 8]} />
        <meshStandardMaterial color="#d4d4d8" emissive="#f59e0b" emissiveIntensity={0.15} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Stud head */}
      <mesh position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.01, 8]} />
        <meshStandardMaterial color="#d4d4d8" emissive="#f59e0b" emissiveIntensity={0.2} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CompositeBeam3D({
  span = 12,
  steelDepth = 603,
  flangeWidth = 228,
  webThickness = 10.5,
  flangeThickness = 14.8,
  slabThickness = 150,
  slabWidth = 2000,
  udl = 15,
  connectorCount = 20,
  connectorSpacing = 300,
  neutralAxisY,
  utilisation = 0,
  status = 'PASS',
  steelGrade = 'S355',
  concreteGrade = 'C30/37',
}: CompositeBeam3DProps) {
  const util = utilisation;

  // Scale: 1 unit = 1 metre
  const beamLen = Math.max(1, span);
  const half = beamLen / 2;

  // Convert mm → metres for 3D scene
  const hWeb = (steelDepth - 2 * flangeThickness) / 1000;
  const tWeb = webThickness / 1000;
  const bFlange = flangeWidth / 1000;
  const tFlange = flangeThickness / 1000;
  const hSlab = slabThickness / 1000;
  const bSlab = slabWidth / 1000;
  const totalSteelH = hWeb + 2 * tFlange;
  const totalH = totalSteelH + hSlab;

  // Centre the beam vertically
  const beamY = 0;

  // Utilisation-based steel colour
  const steelColor = useMemo(() => {
    if (util > 100) return '#ef4444';
    if (util > 90) return '#f97316';
    if (util > 70) return '#64748b';
    return '#94a3b8';
  }, [util]);

  const emissiveColor = useMemo(() => {
    if (util > 100) return '#ef4444';
    if (util > 90) return '#f97316';
    return '#00d9ff';
  }, [util]);

  // Shear stud positions along the beam
  const studs = useMemo(() => {
    const positions: number[] = [];
    const spacing = connectorSpacing / 1000; // mm → m
    const count = Math.min(connectorCount, Math.floor(beamLen / spacing));
    const startX = -half + spacing;
    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      if (x < half - 0.05) positions.push(x);
    }
    return positions;
  }, [connectorCount, connectorSpacing, beamLen, half]);

  // Neutral axis in metres from bottom of steel
  const naY = neutralAxisY != null
    ? neutralAxisY / 1000
    : totalSteelH * 0.6 + hSlab * 0.2; // rough default composite NA

  return (
    <group>
      {/* ============ CONCRETE SLAB ============ */}
      <mesh position={[0, beamY + hWeb / 2 + tFlange + hSlab / 2, 0]} castShadow>
        <boxGeometry args={[beamLen, hSlab, bSlab]} />
        <meshStandardMaterial
          color="#64748b"
          emissive="#a855f7"
          emissiveIntensity={0.06}
          metalness={0.1}
          roughness={0.9}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Slab edges */}
      <lineSegments position={[0, beamY + hWeb / 2 + tFlange + hSlab / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(beamLen, hSlab, bSlab)]} />
        <lineBasicMaterial color="#a855f7" transparent opacity={0.4} />
      </lineSegments>

      {/* Slab reinforcement pattern (subtle grid on top surface) */}
      {Array.from({ length: Math.floor(beamLen / 0.4) }, (_, i) => {
        const x = -half + 0.2 + i * 0.4;
        if (x > half - 0.1) return null;
        return (
          <mesh key={`rebar-x-${i}`} position={[x, beamY + hWeb / 2 + tFlange + hSlab - 0.005, 0]}>
            <boxGeometry args={[0.006, 0.003, bSlab * 0.85]} />
            <meshStandardMaterial color="#78716c" emissive="#a855f7" emissiveIntensity={0.1} transparent opacity={0.4} />
          </mesh>
        );
      })}

      {/* ============ STEEL WEB ============ */}
      <mesh position={[0, beamY, 0]} castShadow>
        <boxGeometry args={[beamLen, hWeb, tWeb]} />
        <meshStandardMaterial
          color={steelColor}
          emissive={emissiveColor}
          emissiveIntensity={0.1}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <lineSegments position={[0, beamY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(beamLen, hWeb, tWeb)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
      </lineSegments>

      {/* ============ TOP FLANGE ============ */}
      <mesh position={[0, beamY + hWeb / 2 + tFlange / 2, 0]} castShadow>
        <boxGeometry args={[beamLen, tFlange, bFlange]} />
        <meshStandardMaterial
          color={steelColor}
          emissive={emissiveColor}
          emissiveIntensity={0.12}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <lineSegments position={[0, beamY + hWeb / 2 + tFlange / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(beamLen, tFlange, bFlange)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.35} />
      </lineSegments>

      {/* ============ BOTTOM FLANGE ============ */}
      <mesh position={[0, beamY - hWeb / 2 - tFlange / 2, 0]} castShadow>
        <boxGeometry args={[beamLen, tFlange, bFlange]} />
        <meshStandardMaterial
          color={steelColor}
          emissive={emissiveColor}
          emissiveIntensity={0.12}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <lineSegments position={[0, beamY - hWeb / 2 - tFlange / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(beamLen, tFlange, bFlange)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.35} />
      </lineSegments>

      {/* ============ SHEAR STUDS ============ */}
      {studs.map((x, i) => (
        <ShearStud
          key={`stud-${i}`}
          position={[x, beamY + hWeb / 2 + tFlange, 0]}
        />
      ))}

      {/* ============ WELD LINES at flange-web junctions ============ */}
      {[
        beamY + hWeb / 2,
        beamY - hWeb / 2,
      ].map((wy, i) => (
        <group key={`weld-${i}`}>
          <mesh position={[0, wy, tWeb / 2 + 0.003]}>
            <boxGeometry args={[beamLen, 0.012, 0.006]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, wy, -tWeb / 2 - 0.003]}>
            <boxGeometry args={[beamLen, 0.012, 0.006]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* ============ SUPPORTS ============ */}
      <PinnedSupport position={[-half + 0.08, beamY - totalSteelH / 2 - 0.15, 0]} />
      <RollerSupport position={[half - 0.08, beamY - totalSteelH / 2 - 0.15, 0]} />

      {/* ============ BEARING PLATES ============ */}
      {[-half + 0.08, half - 0.08].map((x, i) => (
        <mesh key={`bp-${i}`} position={[x, beamY - totalSteelH / 2 - 0.01, 0]}>
          <boxGeometry args={[0.25, 0.025, bFlange * 1.1]} />
          <meshStandardMaterial color="#94a3b8" emissive="#64748b" emissiveIntensity={0.1} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* ============ NEUTRAL AXIS (dashed centre line) ============ */}
      {Array.from({ length: Math.floor(beamLen / 0.2) }, (_, i) => {
        if (i % 2 !== 0) return null;
        const segLen = 0.12;
        const x = -half + 0.1 + i * 0.2;
        return (
          <mesh key={`na-${i}`} position={[x + segLen / 2, beamY - totalSteelH / 2 + naY, bFlange / 2 + 0.08]}>
            <boxGeometry args={[segLen, 0.005, 0.005]} />
            <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.4} transparent opacity={0.5} />
          </mesh>
        );
      })}
      <Text
        position={[half + 0.15, beamY - totalSteelH / 2 + naY, bFlange / 2 + 0.08]}
        fontSize={0.08}
        color="#f97316"
        anchorX="left"
      >
        N.A.
      </Text>

      {/* ============ CROSS-SECTION END CAP (left end) ============ */}
      <CrossSectionEndCap
        x={-half}
        beamY={beamY}
        hWeb={hWeb}
        tWeb={tWeb}
        bFlange={bFlange}
        tFlange={tFlange}
        hSlab={hSlab}
        bSlab={bSlab}
      />

      {/* ============ LOADS ============ */}
      {udl > 0 && (
        <group>
          <UDLArrows
            start={-half + 0.12}
            end={half - 0.12}
            y={beamY + hWeb / 2 + tFlange + hSlab}
            magnitude={udl}
          />
          <Text
            position={[0, beamY + hWeb / 2 + tFlange + hSlab + 1.0, 0]}
            fontSize={0.13}
            color="#fbbf24"
            anchorX="center"
          >
            {`w = ${udl.toFixed(1)} kN/m`}
          </Text>
        </group>
      )}

      {/* ============ DIMENSION LABELS ============ */}
      {/* Span */}
      <group>
        <mesh position={[0, beamY - totalSteelH / 2 - 0.45, 0]}>
          <boxGeometry args={[beamLen, 0.005, 0.005]} />
          <meshStandardMaterial color="#94a3b8" emissive="#94a3b8" emissiveIntensity={0.3} />
        </mesh>
        <Text
          position={[0, beamY - totalSteelH / 2 - 0.55, 0]}
          fontSize={0.12}
          color="#94a3b8"
          anchorX="center"
        >
          {`L = ${span.toFixed(1)} m`}
        </Text>
      </group>

      {/* Total depth (right side) */}
      <group>
        <mesh position={[half + 0.3, beamY - totalSteelH / 2 + totalH / 2, bFlange / 2 + 0.15]}>
          <boxGeometry args={[0.005, totalH, 0.005]} />
          <meshStandardMaterial color="#94a3b8" emissive="#94a3b8" emissiveIntensity={0.3} />
        </mesh>
        <Text
          position={[half + 0.45, beamY - totalSteelH / 2 + totalH / 2, bFlange / 2 + 0.15]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="left"
        >
          {`h = ${(steelDepth + slabThickness).toFixed(0)} mm`}
        </Text>
      </group>

      {/* Slab thickness label */}
      <Text
        position={[half + 0.45, beamY + hWeb / 2 + tFlange + hSlab / 2, 0]}
        fontSize={0.09}
        color="#a855f7"
        anchorX="left"
      >
        {`t_slab = ${slabThickness} mm`}
      </Text>

      {/* Slab width label */}
      <Text
        position={[0, beamY + hWeb / 2 + tFlange + hSlab + 0.1, bSlab / 2 + 0.05]}
        fontSize={0.09}
        color="#a855f7"
        anchorX="center"
      >
        {`b_eff = ${slabWidth} mm`}
      </Text>

      {/* Title & Steel Grade */}
      <Text
        position={[0, beamY + hWeb / 2 + tFlange + hSlab + 1.5, 0]}
        fontSize={0.17}
        color="#00d9ff"
        anchorX="center"
        font={undefined}
      >
        {`Composite Beam — ${steelGrade} / ${concreteGrade}`}
      </Text>

      {/* Utilisation badge */}
      <Text
        position={[half + 0.3, beamY + hWeb / 2 + tFlange + hSlab / 2 + 0.3, 0]}
        fontSize={0.14}
        color={util > 100 ? '#ef4444' : util > 90 ? '#f97316' : '#22c55e'}
        anchorX="center"
      >
        {`${util.toFixed(0)}%`}
      </Text>

      {/* Stud label */}
      {studs.length > 0 && (
        <Text
          position={[studs[0], beamY + hWeb / 2 + tFlange + 0.12, bFlange / 2 + 0.08]}
          fontSize={0.08}
          color="#f59e0b"
          anchorX="center"
        >
          {`${connectorCount} studs @ ${connectorSpacing} mm`}
        </Text>
      )}

      {/* Status glow ring */}
      <GlowRing status={status} radius={Math.max(half, totalH) * 0.85} utilisation={util} />
    </group>
  );
}
