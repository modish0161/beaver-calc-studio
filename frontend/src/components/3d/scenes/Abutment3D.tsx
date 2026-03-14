// =============================================================================
// 3D Scene: Abutment — retaining wall, stem, base, backfill, bridge deck
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

interface Abutment3DProps {
  abutmentHeight?: number;  // m
  abutmentWidth?: number;   // m
  spanLength?: number;       // m
  backfillHeight?: number;   // m
  foundationType?: string;
  bridgeType?: string;
  status?: 'PASS' | 'FAIL';
  utilisation?: number;
}

/* ── Dimension line helper ───────────────────────────────────────────── */
function DimensionLine({ from, to, offset = [0, 0, 0.3], label }: {
  from: [number, number, number]; to: [number, number, number];
  offset?: [number, number, number]; label: string;
}) {
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2 + offset[0],
    (from[1] + to[1]) / 2 + offset[1],
    (from[2] + to[2]) / 2 + offset[2],
  ];
  const len = Math.sqrt(
    (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2,
  );
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <group>
      <mesh position={mid} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.008, 0.008]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mid[0], mid[1] + 0.12, mid[2]]} fontSize={0.1} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── Animated pressure arrow ─────────────────────────────────────────── */
function AnimatedPressureArrow({ x, y, baseLen, direction, color, index }: {
  x: number; y: number; baseLen: number; direction: number; color: string; index: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2 + index * 0.4) * 0.15;
    if (ref.current) ref.current.scale.x = pulse;
  });
  return (
    <group ref={ref} position={[x, y, 0]}>
      <mesh position={[direction * baseLen / 2, 0, 0]}>
        <boxGeometry args={[baseLen, 0.02, 0.02]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[direction * baseLen, 0, 0]} rotation={[0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.08, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/* ── Stem glow ────────────────────────────────────────────────────────── */
function StemGlow({ w, h, d, py, colour }: {
  w: number; h: number; d: number; py: number; colour: string;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial;
    if (mat) mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={[-w / 2 - 0.01, py, d / 2 + 0.01]}>
      <planeGeometry args={[0.02, h]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function Abutment3D({
  abutmentHeight = 6,
  abutmentWidth = 3,
  spanLength = 12,
  backfillHeight = 5,
  foundationType = 'spread',
  bridgeType = 'beam',
  status = 'PASS',
  utilisation = 70,
}: Abutment3DProps) {
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  // Scale to fit scene
  const maxDim = Math.max(abutmentHeight, abutmentWidth, 6);
  const s = 3 / maxDim;

  const stemH = abutmentHeight * s;
  const stemW = 0.4; // wall thickness
  const baseW = abutmentWidth * s;
  const baseH = 0.3;
  const baseD = 1.2;
  const backfillH = Math.min(backfillHeight, abutmentHeight) * s;
  const deckThick = 0.15;

  // Pressure arrow data
  const arrowCount = 5;
  const yTop = baseH + stemH * 0.1;
  const yBot = baseH + backfillH * 0.9;
  const step = (yBot - yTop) / (arrowCount - 1);

  return (
    <group position={[0, 0, 0]}>
      {/* Ground fill */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[8, 0.3, 4]} />
        <meshStandardMaterial color="#4a3728" roughness={1} />
      </mesh>

      {/* Foundation base */}
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[baseW, baseH, baseD]} />
        <meshStandardMaterial color="#6b7280" roughness={0.85} metalness={0.05} />
      </mesh>
      <lineSegments position={[0, baseH / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(baseW, baseH, baseD)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
      </lineSegments>

      {/* Abutment stem */}
      <mesh position={[0, baseH + stemH / 2, 0]} castShadow>
        <boxGeometry args={[stemW, stemH, baseD]} />
        <meshStandardMaterial
          color="#9ca3af"
          emissive="#00d9ff"
          emissiveIntensity={0.05}
          roughness={0.8}
        />
      </mesh>
      <lineSegments position={[0, baseH + stemH / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(stemW, stemH, baseD)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.5} />
      </lineSegments>

      {/* Stem status glow */}
      <StemGlow w={stemW} h={stemH} d={baseD} py={baseH + stemH / 2} colour={colour} />

      {/* Backfill (behind stem) */}
      <mesh position={[stemW / 2 + 0.8, baseH + backfillH / 2, 0]}>
        <boxGeometry args={[1.6, backfillH, baseD + 0.5]} />
        <meshStandardMaterial color="#a67c52" transparent opacity={0.35} roughness={1} />
      </mesh>

      {/* Backfill surface pattern */}
      <lineSegments position={[stemW / 2 + 0.8, baseH + backfillH / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.6, backfillH, baseD + 0.5)]} />
        <lineBasicMaterial color="#c4956a" transparent opacity={0.3} />
      </lineSegments>

      {/* Animated earth pressure arrows */}
      {Array.from({ length: arrowCount }).map((_, i) => (
        <AnimatedPressureArrow
          key={i}
          x={stemW / 2 + 0.05}
          y={yTop + i * step}
          baseLen={0.2 + (i / (arrowCount - 1)) * 0.6}
          direction={-1}
          color="#ef4444"
          index={i}
        />
      ))}
      <Text position={[stemW / 2 + 0.05 + -1 * 1.1, (yTop + yBot) / 2, 0]} fontSize={0.12} color="#ef4444" anchorX="center">
        Active
      </Text>

      {/* Bridge deck */}
      <mesh position={[-1.5, baseH + stemH + deckThick / 2, 0]} castShadow>
        <boxGeometry args={[3.5, deckThick, baseD + 0.2]} />
        <meshStandardMaterial color="#64748b" emissive="#3b82f6" emissiveIntensity={0.1} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Bearing pad */}
      <mesh position={[0, baseH + stemH + 0.02, 0]}>
        <boxGeometry args={[0.2, 0.04, 0.4]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>

      {/* Dimension lines */}
      <DimensionLine
        from={[-baseW / 2 - 0.4, baseH, baseD / 2 + 0.3]}
        to={[-baseW / 2 - 0.4, baseH + stemH, baseD / 2 + 0.3]}
        offset={[0, 0, 0]}
        label={`H = ${abutmentHeight.toFixed(1)} m`}
      />
      <DimensionLine
        from={[-baseW / 2, -0.05, baseD / 2 + 0.3]}
        to={[baseW / 2, -0.05, baseD / 2 + 0.3]}
        offset={[0, 0, 0]}
        label={`W = ${abutmentWidth.toFixed(1)} m`}
      />

      {/* Labels */}
      <Text position={[0, baseH + stemH + 0.5, 0]} fontSize={0.16} color="#00d9ff" anchorX="center">
        Abutment
      </Text>

      <Text position={[stemW / 2 + 0.8, baseH + backfillH + 0.2, 0]} fontSize={0.1} color="#a67c52" anchorX="center">
        Backfill
      </Text>

      <Text position={[-1.5, baseH + stemH + 0.35, 0]} fontSize={0.1} color="#3b82f6" anchorX="center">
        Deck
      </Text>

      <Text position={[0, 0.1, baseD / 2 + 0.15]} fontSize={0.1} color="#6b7280" anchorX="center">
        Foundation
      </Text>
    </group>
  );
}
