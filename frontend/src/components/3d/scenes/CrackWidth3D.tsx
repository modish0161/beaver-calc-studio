import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated helpers ────────────────────────────────────────── */

function DimensionLine({ start, end, color = '#f59e0b' }: { start: [number, number, number]; end: [number, number, number]; color?: string }) {
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
  const len = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2 + (end[2] - start[2]) ** 2);
  const dir = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group>
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.002, 0.002, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.005, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.005, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function CrackGlow({ position, crackH, index }: { position: [number, number, number]; crackH: number; index: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + Math.sin(t * 3 + index * 0.7) * 0.3;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.008, crackH * 1.1, 0.001]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} transparent opacity={0.6} />
    </mesh>
  );
}

function BeamGlow({ width, depth, length, colour }: { width: number; depth: number; length: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, depth / 2, width / 2 + 0.002]}>
      <planeGeometry args={[length * 0.95, depth * 0.95]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface CrackWidth3DProps {
  beamLength?: number;
  beamDepth?: number;
  beamWidth?: number;
  crackWidth?: number;
  crackSpacing?: number;
  coverDepth?: number;
  barDiameter?: number;
  numBars?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function CrackWidth3D({
  beamLength = 6000,
  beamDepth = 500,
  beamWidth = 300,
  crackWidth = 0.25,
  crackSpacing = 150,
  coverDepth = 40,
  barDiameter = 16,
  numBars = 4,
  utilisation = 75,
  status = 'PASS',
}: CrackWidth3DProps) {
  const s = 1 / 4000;
  const L = beamLength * s;
  const D = beamDepth * s;
  const W = beamWidth * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  // Number of visible cracks — deterministic heights
  const numCracks = Math.max(2, Math.min(12, Math.floor(L * 0.7 / (crackSpacing * s))));

  return (
    <group>
      {/* Beam body */}
      <mesh position={[0, D / 2, 0]}>
        <boxGeometry args={[L, D, W]} />
        <meshStandardMaterial color="#9ca3af" transparent opacity={0.4} roughness={0.7} />
      </mesh>

      {/* Beam status glow */}
      <BeamGlow width={W} depth={D} length={L} colour={colour} />

      {/* Reinforcement bars (bottom) */}
      {Array.from({ length: numBars }).map((_, i) => {
        const z = -W / 2 + coverDepth * s + (i + 0.5) * ((W - 2 * coverDepth * s) / numBars);
        const barR = (barDiameter / 2) * s;
        return (
          <mesh key={`bar${i}`} position={[0, coverDepth * s + barR, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[barR, barR, L * 0.95, 10]} />
            <meshStandardMaterial color="#1e40af" roughness={0.3} metalness={0.8} />
          </mesh>
        );
      })}

      {/* Cracks (vertical lines on front face) with glow */}
      {Array.from({ length: numCracks }).map((_, i) => {
        const x = -L * 0.35 + i * (L * 0.7 / Math.max(1, numCracks - 1));
        const crackH = D * (0.4 + (((i * 7 + 3) % 11) / 11) * 0.3); // deterministic varied heights
        const cwVis = Math.max(0.002, crackWidth * s * 30);
        return (
          <group key={`cr${i}`}>
            {/* Crack line on front face */}
            <mesh position={[x, crackH / 2, W / 2 + 0.001]}>
              <boxGeometry args={[cwVis, crackH, 0.001]} />
              <meshStandardMaterial color="#ef4444" transparent opacity={0.8} />
            </mesh>
            {/* Animated crack glow */}
            <CrackGlow position={[x, crackH / 2, W / 2 + 0.003]} crackH={crackH} index={i} />
            {/* Crack line on bottom */}
            <mesh position={[x, 0, 0]}>
              <boxGeometry args={[cwVis, 0.001, W * 0.6]} />
              <meshStandardMaterial color="#ef4444" transparent opacity={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* Cover depth indicator */}
      <mesh position={[L / 2 + 0.02, coverDepth * s / 2, W / 2 + 0.015]}>
        <boxGeometry args={[0.003, coverDepth * s, 0.003]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <Text position={[L / 2 + 0.06, coverDepth * s / 2, W / 2 + 0.02]} fontSize={0.03} color="#f59e0b">
        {`c = ${coverDepth}mm`}
      </Text>

      {/* Crack width callout */}
      <mesh position={[0, D * 0.35, W / 2 + 0.025]}>
        <boxGeometry args={[0.06, 0.003, 0.003]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <Text position={[0.06, D * 0.35, W / 2 + 0.03]} fontSize={0.035} color="#ef4444">
        {`wk = ${crackWidth}mm`}
      </Text>

      {/* Dimension lines */}
      <DimensionLine start={[-L / 2, -0.06, W / 2 + 0.03]} end={[L / 2, -0.06, W / 2 + 0.03]} color="#38bdf8" />
      <Text position={[0, -0.09, W / 2 + 0.03]} fontSize={0.03} color="#38bdf8">
        {`L = ${(beamLength / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[L / 2 + 0.04, 0, W / 2 + 0.03]} end={[L / 2 + 0.04, D, W / 2 + 0.03]} color="#38bdf8" />
      <Text position={[L / 2 + 0.08, D / 2, W / 2 + 0.03]} fontSize={0.025} color="#38bdf8">
        {`${beamDepth}mm`}
      </Text>

      {/* Supports */}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`sup${i}`} position={[x, -0.02, 0]}>
          <cylinderGeometry args={[0.02, 0.03, 0.03, 3]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}

      {/* Labels */}
      <Text position={[0, D + 0.12, 0]} fontSize={0.06} color="#94a3b8">
        {`RC Beam ${beamDepth}×${beamWidth}mm, L=${(beamLength / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[0, D + 0.22, 0]} fontSize={0.05} color="#94a3b8">
        {`${numBars}T${barDiameter} @ ${crackSpacing}mm crack spacing`}
      </Text>

      <mesh position={[L / 2 + 0.06, D + 0.05, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
