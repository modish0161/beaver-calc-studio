// =============================================================================
// 3D Scene: Steel Column — I-section column with axial load and buckling viz
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function BucklingSway({ children, colHeight }: { children: React.ReactNode; colHeight: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.z = Math.sin(t * 1.2) * 0.008;
    ref.current.rotation.x = Math.sin(t * 0.9 + 1) * 0.005;
  });
  return <group ref={ref} position={[0, 0, 0]}>{children}</group>;
}

function PulsingLoadArrow({ position, force }: { position: [number, number, number]; force: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.13, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.5, 0.35, 0]} fontSize={0.12} color="#ef4444">
        {`N = ${force.toFixed(0)} kN`}
      </Text>
    </group>
  );
}

function AnimatedUtilBar({ position, colHeight, utilisation, color }: { position: [number, number, number]; colHeight: number; utilisation: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <group position={position}>
      <mesh position={[0, colHeight / 2, 0]}>
        <boxGeometry args={[0.08, colHeight, 0.08]} />
        <meshStandardMaterial color="#374151" transparent opacity={0.3} />
      </mesh>
      <mesh ref={ref} position={[0, (colHeight * utilisation) / 2, 0]}>
        <boxGeometry args={[0.1, colHeight * utilisation, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <Text position={[0, colHeight * utilisation + 0.15, 0]} fontSize={0.1} color={color}>
        {`${(utilisation * 100).toFixed(0)}%`}
      </Text>
    </group>
  );
}

function ColumnGlow({ colHeight, h, status, utilisation }: { colHeight: number; h: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.2 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
  });
  return (
    <mesh ref={ref} position={[0, colHeight / 2 + 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
      <planeGeometry args={[colHeight, h * 1.2]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.2} transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const len = Math.abs(end[1] - start[1]) || Math.sqrt((end[0] - start[0]) ** 2 + (end[2] - start[2]) ** 2);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx + 0.15, my, mz]} fontSize={0.08} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface SteelColumn3DProps {
  sectionDepth?: number;   // mm
  sectionWidth?: number;   // mm
  flangeThick?: number;    // mm
  webThick?: number;       // mm
  length?: number;         // mm
  axialForce?: number;     // kN
  effectiveLength?: number; // mm
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

function ISectionColumn({ h, b, tf, tw, height, color }: {
  h: number; b: number; tf: number; tw: number; height: number; color: string;
}) {
  return (
    <group>
      {/* Web */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[tw, height, h - 2 * tf]} />
        <meshStandardMaterial color="#64748b" emissive={color} emissiveIntensity={0.1} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Front flange */}
      <mesh position={[0, height / 2, (h - tf) / 2]} castShadow>
        <boxGeometry args={[b, height, tf]} />
        <meshStandardMaterial color="#64748b" emissive={color} emissiveIntensity={0.1} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Back flange */}
      <mesh position={[0, height / 2, -(h - tf) / 2]} castShadow>
        <boxGeometry args={[b, height, tf]} />
        <meshStandardMaterial color="#64748b" emissive={color} emissiveIntensity={0.1} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function SteelColumn3D({
  sectionDepth = 254,
  sectionWidth = 254,
  flangeThick = 14,
  webThick = 8,
  length = 4000,
  axialForce = 800,
  utilisation = 0.65,
  status = 'PASS',
}: SteelColumn3DProps) {
  const s = 1 / 300;
  const H = Math.min(sectionDepth * s, 1.2);
  const B = Math.min(sectionWidth * s, 1.2);
  const TF = Math.max(flangeThick * s, 0.03);
  const TW = Math.max(webThick * s, 0.02);
  const colHeight = Math.min(length * s, 6);
  const statusColor = status === 'PASS' ? '#22c55e' : '#ef4444';
  const util = utilisation;
  const utilPct = util * 100;
  const utilColor = util > 0.9 ? '#ef4444' : util > 0.7 ? '#f59e0b' : '#22c55e';

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[B + 2, 0.1, H + 2]} />
        <meshStandardMaterial color="#1a1f3a" roughness={1} />
      </mesh>

      {/* Base plate */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[B + 0.3, 0.08, H + 0.3]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* I-Section column with subtle buckling sway */}
      <BucklingSway colHeight={colHeight}>
        <group position={[0, 0.08, 0]}>
          <ISectionColumn h={H} b={B} tf={TF} tw={TW} height={colHeight} color={statusColor} />
        </group>

        {/* Top plate */}
        <mesh position={[0, 0.08 + colHeight + 0.04, 0]}>
          <boxGeometry args={[B + 0.2, 0.08, H + 0.2]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Axial load arrow — animated */}
        {axialForce > 0 && (
          <PulsingLoadArrow position={[0, 0.08 + colHeight + 0.3, 0]} force={axialForce} />
        )}
      </BucklingSway>

      {/* Column glow */}
      <ColumnGlow colHeight={colHeight} h={H} status={status} utilisation={utilPct} />

      {/* Animated utilisation bar */}
      <AnimatedUtilBar position={[-B / 2 - 0.5, 0.08, 0]} colHeight={colHeight} utilisation={util} color={utilColor} />

      {/* Dimension lines */}
      <DimensionLine start={[B / 2 + 0.25, 0.08, 0]} end={[B / 2 + 0.25, 0.08 + colHeight, 0]} label={`L=${(length / 1000).toFixed(1)}m`} />

      {/* Status label */}
      <Text position={[0, -0.25, H / 2 + 0.3]} fontSize={0.1} color="#94a3b8">
        {`${sectionDepth}×${sectionWidth} UKC`}
      </Text>
      <Text position={[0, 0.08 + colHeight + 0.9, 0]} fontSize={0.08} color={utilColor}>
        {`Utilisation ${utilPct.toFixed(0)}% — ${status}`}
      </Text>
      <mesh position={[B / 2 + 0.1, 0.08 + colHeight + 0.04, H / 2 + 0.1]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
