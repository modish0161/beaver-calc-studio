import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function PulsingLoadArrow({ position, index }: { position: [number, number, number]; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2 + index * 0.4) * 0.01;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.1, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.025, 0.04, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function RebarGlow({ position, barR, length, rotation, index, status, utilisation }: { position: [number, number, number]; barR: number; length: number; rotation?: [number, number, number]; index: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2 + index * 0.6) * 0.2;
  });
  return (
    <mesh ref={ref} position={position} rotation={rotation || [0, 0, 0]}>
      <cylinderGeometry args={[barR * 1.4, barR * 1.4, length, 8]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0]; const dy = end[1] - start[1]; const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const vertical = Math.abs(dy) > Math.max(Math.abs(dx), Math.abs(dz));
  const depthwise = Math.abs(dz) > Math.abs(dx) && !vertical;
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={vertical ? [0, 0, Math.PI / 2] : depthwise ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx + (vertical ? 0.1 : 0), my + (vertical ? 0 : 0.05), mz + (depthwise ? 0.1 : 0)]} fontSize={0.06} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface RCSlab3DProps {
  slabLength?: number;
  slabWidth?: number;
  slabDepth?: number;
  mainBarDia?: number;
  mainBarSpacing?: number;
  cover?: number;
  load?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function RCSlab3D({
  slabLength = 6000,
  slabWidth = 5000,
  slabDepth = 250,
  mainBarDia = 16,
  mainBarSpacing = 150,
  cover = 35,
  load = 10,
  utilisation = 74,
  status = 'PASS',
}: RCSlab3DProps) {
  const s = 1 / 2500;
  const SL = Math.min(slabLength * s, 3);
  const SW = Math.min(slabWidth * s, 2.5);
  const SD = Math.max(slabDepth * s, 0.08);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const barR = mainBarDia * s * 2;
  const numBars = Math.min(Math.floor(SW / (mainBarSpacing * s)), 12);

  return (
    <group>
      {/* Supports (columns at corners) */}
      {[[-SL / 2, -SW / 2], [SL / 2, -SW / 2], [-SL / 2, SW / 2], [SL / 2, SW / 2]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.5, z]} castShadow>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#6b7280" roughness={0.7} />
        </mesh>
      ))}

      {/* Slab body (semi-transparent) */}
      <mesh position={[0, SD / 2, 0]} castShadow>
        <boxGeometry args={[SL, SD, SW]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.5} roughness={0.7} />
      </mesh>
      <lineSegments position={[0, SD / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(SL, SD, SW)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
      </lineSegments>

      {/* Bottom reinforcement (main bars - span direction) with glow */}
      {Array.from({ length: numBars }).map((_, i) => {
        const z = (i - (numBars - 1) / 2) * (mainBarSpacing * s);
        return (
          <group key={`m${i}`}>
            <RebarGlow position={[0, cover * s + barR / 2, z]} barR={barR} length={SL * 0.9} rotation={[0, 0, Math.PI / 2]} index={i} status={status} utilisation={utilisation} />
            <mesh position={[0, cover * s + barR / 2, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[barR, barR, SL * 0.9, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* Distribution bars */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = (i - 2.5) * SL / 6;
        return (
          <mesh key={`d${i}`} position={[x, cover * s + barR * 1.5, 0]}>
            <cylinderGeometry args={[barR * 0.7, barR * 0.7, SW * 0.9, 8]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} transparent opacity={0.7} />
          </mesh>
        );
      })}

      {/* Animated distributed load arrows */}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((fx, i) =>
        [-0.4, 0, 0.4].map((fz, j) => (
          <PulsingLoadArrow key={`${i}-${j}`} position={[fx * SL, SD + 0.05, fz * SW]} index={i * 3 + j} />
        ))
      )}

      {/* Dimension lines */}
      <DimensionLine start={[-SL / 2, -0.1, SW / 2 + 0.15]} end={[SL / 2, -0.1, SW / 2 + 0.15]} label={`L=${(slabLength / 1000).toFixed(1)}m`} offset={0} />
      <DimensionLine start={[SL / 2 + 0.15, -0.1, -SW / 2]} end={[SL / 2 + 0.15, -0.1, SW / 2]} label={`W=${(slabWidth / 1000).toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[0, SD + 0.3, 0]} fontSize={0.08} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <Text position={[0, SD + 0.22, 0]} fontSize={0.06} color="#ef4444">
        {`w = ${load} kN/m²`}
      </Text>
      <Text position={[SL / 2 + 0.15, 0, 0]} fontSize={0.06} color="#f59e0b">
        {`T${mainBarDia}@${mainBarSpacing} B.S.`}
      </Text>
      <mesh position={[SL / 2 + 0.1, SD + 0.05, SW / 2]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
