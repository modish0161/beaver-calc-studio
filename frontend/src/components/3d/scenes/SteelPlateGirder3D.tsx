// =============================================================================
// 3D Scene: Steel Plate Girder — I-section with web, flanges, stiffeners,
// supports, loads, labels, and utilisation-based colouring.
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface SteelPlateGirder3DProps {
  /** Beam span in metres */
  span?: number;
  /** Web depth in mm */
  webDepth?: number;
  /** Web thickness in mm */
  webThickness?: number;
  /** Flange width in mm */
  flangeWidth?: number;
  /** Flange thickness in mm */
  flangeThickness?: number;
  /** UDL in kN/m */
  udl?: number;
  /** Point load at midspan in kN */
  pointLoad?: number;
  /** Whether stiffeners are shown */
  useStiffeners?: boolean;
  /** Stiffener spacing in mm */
  stiffenerSpacing?: number;
  /** Lateral restraint spacing in mm */
  lateralRestraintSpacing?: number;
  /** Overall max utilisation 0-100+ */
  utilisation?: number;
  /** Overall status */
  status?: 'PASS' | 'FAIL';
  /** Steel grade label */
  steelGrade?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Pinned (triangle) support */
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

/** Roller support */
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

/** Single downward load arrow */
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

/** UDL arrows along the beam */
function UDLArrows({
  start,
  end,
  y,
  magnitude,
  count = 9,
}: {
  start: number;
  end: number;
  y: number;
  magnitude: number;
  count?: number;
}) {
  if (magnitude <= 0) return null;
  const step = (end - start) / (count - 1);
  const arrows = [];
  for (let i = 0; i < count; i++) {
    arrows.push(
      <LoadArrow key={i} position={[start + i * step, y, 0]} magnitude={magnitude} color="#fbbf24" />,
    );
  }
  return (
    <group>
      {arrows}
      <mesh position={[(start + end) / 2, y + Math.min(0.7, Math.max(0.25, magnitude / 60)) + 0.08, 0]}>
        <boxGeometry args={[end - start, 0.015, 0.015]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** Animated glow ring for status */
function GlowRing({ status, radius = 2.0, utilisation = 0 }: { status?: 'PASS' | 'FAIL'; radius?: number; utilisation?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.4;
      ref.current.rotation.z += delta * 0.25;
    }
    // Pulse intensity based on utilisation
    if (matRef.current) {
      const pulse = 0.2 + 0.15 * Math.sin(state.clock.elapsedTime * (utilisation > 90 ? 4 : 2));
      matRef.current.opacity = pulse;
    }
  });
  const color = status === 'FAIL' ? '#ef4444' : '#22c55e';
  return (
    <mesh ref={ref} position={[0, 0.5, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 64]} />
      <meshStandardMaterial ref={matRef} color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.3} />
    </mesh>
  );
}

/** Cross-section end-cap: shows the I-section profile at one end of the beam */
function CrossSectionEndCap({
  x,
  beamY,
  hWeb,
  tWeb,
  bFlange,
  tFlange,
}: {
  x: number;
  beamY: number;
  hWeb: number;
  tWeb: number;
  bFlange: number;
  tFlange: number;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = hWeb / 2;
    const bw = bFlange / 2;
    const twh = tWeb / 2;
    // I-section profile: start bottom-left of bottom flange, go clockwise
    s.moveTo(-bw, -hw - tFlange);
    s.lineTo(bw, -hw - tFlange);
    s.lineTo(bw, -hw);
    s.lineTo(twh, -hw);
    s.lineTo(twh, hw);
    s.lineTo(bw, hw);
    s.lineTo(bw, hw + tFlange);
    s.lineTo(-bw, hw + tFlange);
    s.lineTo(-bw, hw);
    s.lineTo(-twh, hw);
    s.lineTo(-twh, -hw);
    s.lineTo(-bw, -hw);
    s.closePath();
    return s;
  }, [hWeb, tWeb, bFlange, tFlange]);

  return (
    <mesh position={[x, beamY, 0]} rotation={[0, Math.PI / 2, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color="#00d9ff"
        emissive="#00d9ff"
        emissiveIntensity={0.15}
        transparent
        opacity={0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Dimension line with label */
function DimensionLine({
  from,
  to,
  label,
  offset = [0, 0, 0],
}: {
  from: [number, number, number];
  to: [number, number, number];
  label: string;
  offset?: [number, number, number];
}) {
  const mx = (from[0] + to[0]) / 2 + offset[0];
  const my = (from[1] + to[1]) / 2 + offset[1];
  const mz = (from[2] + to[2]) / 2 + offset[2];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const angle = Math.atan2(dy, dx);

  return (
    <group>
      {/* Line */}
      <mesh position={[mx, my, mz]} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.008, 0.008]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.6} />
      </mesh>
      {/* End ticks */}
      <mesh position={[from[0] + offset[0], from[1] + offset[1], from[2] + offset[2]]} rotation={[0, 0, angle + Math.PI / 2]}>
        <boxGeometry args={[0.1, 0.008, 0.008]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.6} />
      </mesh>
      <mesh position={[to[0] + offset[0], to[1] + offset[1], to[2] + offset[2]]} rotation={[0, 0, angle + Math.PI / 2]}>
        <boxGeometry args={[0.1, 0.008, 0.008]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.6} />
      </mesh>
      {/* Label */}
      <Text position={[mx, my + 0.1, mz]} fontSize={0.12} color="#94a3b8" anchorX="center">
        {label}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SteelPlateGirder3D({
  span = 12,
  webDepth = 1200,
  webThickness = 15,
  flangeWidth = 500,
  flangeThickness = 25,
  udl = 25,
  pointLoad = 0,
  useStiffeners = false,
  stiffenerSpacing = 2000,
  lateralRestraintSpacing = 3000,
  utilisation = 50,
  status = 'PASS',
  steelGrade = 'S355',
}: SteelPlateGirder3DProps) {
  // Scale everything to fit nicely in the viewport
  // Aim for beam length ~5 units in 3D space
  const targetLen = 5;
  const scale = targetLen / Math.max(span, 1);

  const beamLen = span * scale; // 3D length units
  const half = beamLen / 2;

  // Convert mm dimensions to 3D units, exaggerating thickness for visibility
  const thicknessScale = scale * 8; // exaggerate plate thicknesses so they're visible
  const depthScale = scale * 3;     // section depth scale

  const hWeb = Math.max(0.3, (webDepth / 1000) * depthScale);
  const tWeb = Math.max(0.02, (webThickness / 1000) * thicknessScale);
  const bFlange = Math.max(0.15, (flangeWidth / 1000) * depthScale);
  const tFlange = Math.max(0.03, (flangeThickness / 1000) * thicknessScale);

  const totalH = hWeb + 2 * tFlange;
  const beamY = 0.6; // lift beam off ground

  // Utilisation-based colours
  const util = Math.max(0, Math.min(150, utilisation));
  const steelColor = useMemo(() => {
    if (util > 100) return '#ef4444';       // red — exceeded
    if (util > 90) return '#f97316';        // orange — close
    if (util > 70) return '#eab308';        // yellow — moderate
    return '#64748b';                       // slate — comfortable
  }, [util]);

  const emissiveColor = useMemo(() => {
    if (util > 100) return '#ef4444';
    if (util > 90) return '#f97316';
    if (util > 70) return '#eab308';
    return '#3b82f6';
  }, [util]);

  // Stiffener positions
  const stiffeners = useMemo(() => {
    if (!useStiffeners || stiffenerSpacing <= 0) return [];
    const spacingScaled = (stiffenerSpacing / 1000) * scale;
    const positions: number[] = [];
    // Place stiffeners along the span
    let x = -half + spacingScaled;
    while (x < half - spacingScaled * 0.3) {
      positions.push(x);
      x += spacingScaled;
    }
    return positions;
  }, [useStiffeners, stiffenerSpacing, scale, half]);

  // Lateral restraint markers
  const restraints = useMemo(() => {
    if (lateralRestraintSpacing <= 0) return [];
    const spacingScaled = (lateralRestraintSpacing / 1000) * scale;
    const positions: number[] = [];
    let x = -half + spacingScaled;
    while (x < half - spacingScaled * 0.3) {
      positions.push(x);
      x += spacingScaled;
    }
    return positions;
  }, [lateralRestraintSpacing, scale, half]);

  return (
    <group>
      {/* ============ WEB ============ */}
      <mesh position={[0, beamY, 0]} castShadow>
        <boxGeometry args={[beamLen, hWeb, tWeb]} />
        <meshStandardMaterial
          color={steelColor}
          emissive={emissiveColor}
          emissiveIntensity={0.1}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Web edges */}
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

      {/* ============ STIFFENERS ============ */}
      {stiffeners.map((x, i) => (
        <group key={`stiff-${i}`}>
          {/* Stiffener plate (perpendicular to web, both sides) */}
          <mesh position={[x, beamY, bFlange * 0.25]} castShadow>
            <boxGeometry args={[tWeb * 0.8, hWeb, bFlange * 0.35]} />
            <meshStandardMaterial
              color="#475569"
              emissive="#06b6d4"
              emissiveIntensity={0.08}
              metalness={0.6}
              roughness={0.4}
              transparent
              opacity={0.7}
            />
          </mesh>
          <mesh position={[x, beamY, -bFlange * 0.25]} castShadow>
            <boxGeometry args={[tWeb * 0.8, hWeb, bFlange * 0.35]} />
            <meshStandardMaterial
              color="#475569"
              emissive="#06b6d4"
              emissiveIntensity={0.08}
              metalness={0.6}
              roughness={0.4}
              transparent
              opacity={0.7}
            />
          </mesh>
          {/* Stiffener edge lines */}
          <lineSegments position={[x, beamY, bFlange * 0.25]}>
            <edgesGeometry args={[new THREE.BoxGeometry(tWeb * 0.8, hWeb, bFlange * 0.35)]} />
            <lineBasicMaterial color="#06b6d4" transparent opacity={0.3} />
          </lineSegments>
          <lineSegments position={[x, beamY, -bFlange * 0.25]}>
            <edgesGeometry args={[new THREE.BoxGeometry(tWeb * 0.8, hWeb, bFlange * 0.35)]} />
            <lineBasicMaterial color="#06b6d4" transparent opacity={0.3} />
          </lineSegments>
        </group>
      ))}

      {/* ============ LATERAL RESTRAINT MARKERS ============ */}
      {restraints.map((x, i) => (
        <group key={`restraint-${i}`}>
          {/* Small cross at top flange */}
          <mesh position={[x, beamY + hWeb / 2 + tFlange + 0.06, 0]}>
            <boxGeometry args={[0.08, 0.08, bFlange + 0.15]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.6} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}

      {/* ============ SUPPORTS ============ */}
      <PinnedSupport position={[-half + 0.08, beamY - totalH / 2 - 0.15, 0]} />
      <RollerSupport position={[half - 0.08, beamY - totalH / 2 - 0.15, 0]} />

      {/* ============ BEARING PLATES at supports ============ */}
      {[-half + 0.08, half - 0.08].map((x, i) => (
        <mesh key={`bp-${i}`} position={[x, beamY - totalH / 2 - 0.01, 0]}>
          <boxGeometry args={[0.25, 0.025, bFlange * 1.1]} />
          <meshStandardMaterial color="#94a3b8" emissive="#64748b" emissiveIntensity={0.1} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* ============ WELD LINES at flange-web junctions ============ */}
      {[
        beamY + hWeb / 2,   // top of web
        beamY - hWeb / 2,   // bottom of web
      ].map((wy, i) => (
        <group key={`weld-${i}`}>
          {/* front weld */}
          <mesh position={[0, wy, tWeb / 2 + 0.003]}>
            <boxGeometry args={[beamLen, 0.012, 0.006]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
          </mesh>
          {/* back weld */}
          <mesh position={[0, wy, -tWeb / 2 - 0.003]}>
            <boxGeometry args={[beamLen, 0.012, 0.006]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* ============ NEUTRAL AXIS (dashed centre line) ============ */}
      {Array.from({ length: Math.floor(beamLen / 0.2) }, (_, i) => {
        if (i % 2 !== 0) return null;
        const segLen = 0.12;
        const x = -half + 0.1 + i * 0.2;
        return (
          <mesh key={`na-${i}`} position={[x + segLen / 2, beamY, bFlange / 2 + 0.08]}>
            <boxGeometry args={[segLen, 0.005, 0.005]} />
            <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.4} transparent opacity={0.5} />
          </mesh>
        );
      })}
      <Text
        position={[half + 0.15, beamY, bFlange / 2 + 0.08]}
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
      />

      {/* ============ LOADS ============ */}
      {/* UDL */}
      {udl > 0 && (
        <group>
          <UDLArrows
            start={-half + 0.12}
            end={half - 0.12}
            y={beamY + totalH / 2}
            magnitude={udl}
          />
          <Text
            position={[0, beamY + totalH / 2 + 1.0, 0]}
            fontSize={0.13}
            color="#fbbf24"
            anchorX="center"
          >
            {`w = ${udl.toFixed(1)} kN/m`}
          </Text>
        </group>
      )}

      {/* Point load at midspan */}
      {pointLoad > 0 && (
        <group>
          <LoadArrow
            position={[0, beamY + totalH / 2, 0]}
            magnitude={pointLoad}
            color="#ef4444"
          />
          <Text position={[0.4, beamY + totalH / 2 + 0.6, 0]} fontSize={0.12} color="#ef4444">
            {`P = ${pointLoad.toFixed(0)} kN`}
          </Text>
        </group>
      )}

      {/* ============ LABELS ============ */}
      {/* Span dimension */}
      <DimensionLine
        from={[-half, beamY - totalH / 2 - 0.45, 0]}
        to={[half, beamY - totalH / 2 - 0.45, 0]}
        label={`L = ${span.toFixed(1)} m`}
      />

      {/* Depth dimension (right side) */}
      <DimensionLine
        from={[half + 0.3, beamY - totalH / 2, bFlange / 2 + 0.15]}
        to={[half + 0.3, beamY + totalH / 2, bFlange / 2 + 0.15]}
        label={`h = ${(webDepth + 2 * flangeThickness).toFixed(0)} mm`}
      />

      {/* Flange width dimension (front) */}
      <Text
        position={[0, beamY - totalH / 2 - 0.25, bFlange / 2 + 0.2]}
        fontSize={0.1}
        color="#94a3b8"
        anchorX="center"
      >
        {`b = ${flangeWidth.toFixed(0)} mm`}
      </Text>

      {/* Title & Grade */}
      <Text
        position={[0, beamY + totalH / 2 + 1.45, 0]}
        fontSize={0.17}
        color="#00d9ff"
        anchorX="center"
        font={undefined}
      >
        {`Steel Plate Girder — ${steelGrade}`}
      </Text>

      {/* Utilisation badge */}
      <Text
        position={[half + 0.3, beamY + totalH / 2 + 0.3, 0]}
        fontSize={0.14}
        color={util > 100 ? '#ef4444' : util > 90 ? '#f97316' : '#22c55e'}
        anchorX="center"
      >
        {`${util.toFixed(0)}%`}
      </Text>

      {/* Stiffener label when present */}
      {useStiffeners && stiffeners.length > 0 && (
        <Text
          position={[stiffeners[0], beamY - totalH / 2 - 0.15, bFlange * 0.4]}
          fontSize={0.09}
          color="#06b6d4"
          anchorX="center"
        >
          {`Stiffeners @ ${stiffenerSpacing} mm`}
        </Text>
      )}

      {/* Lateral restraint label when present */}
      {restraints.length > 0 && (
        <Text
          position={[restraints[0], beamY + totalH / 2 + 0.2, bFlange / 2 + 0.2]}
          fontSize={0.09}
          color="#a855f7"
          anchorX="center"
        >
          {`Lcr = ${lateralRestraintSpacing} mm`}
        </Text>
      )}

      {/* Status glow ring */}
      <GlowRing status={status} radius={Math.max(half, totalH) * 0.85} utilisation={util} />
    </group>
  );
}
