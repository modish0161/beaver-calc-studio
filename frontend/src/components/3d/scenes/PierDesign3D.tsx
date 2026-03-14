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
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.003, 0.003, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.008, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.008, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedBearingArrow({ x, baseY, colour }: { x: number; baseY: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = baseY + Math.sin(clock.getElapsedTime() * 2) * 0.008;
  });
  return (
    <group ref={ref} position={[x, baseY, 0]}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.08, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.005, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.01, 0.02, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function PierGlow({ PW, PH, PD, colour }: { PW: number; PH: number; PD: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, PH / 2, PD / 2 + 0.004]}>
      <planeGeometry args={[PW * 0.95, PH * 0.95]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface PierDesign3DProps {
  pierHeight?: number;
  pierWidth?: number;
  pierDepth?: number;
  capWidth?: number;
  capDepth?: number;
  capHeight?: number;
  numBearings?: number;
  axialLoad?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function PierDesign3D({
  pierHeight = 8000,
  pierWidth = 1500,
  pierDepth = 2000,
  capWidth = 3000,
  capDepth = 2500,
  capHeight = 1200,
  numBearings = 2,
  axialLoad = 3500,
  utilisation = 74,
  status = 'PASS',
}: PierDesign3DProps) {
  const s = 1 / 8000;
  const PH = pierHeight * s;
  const PW = pierWidth * s;
  const PD = pierDepth * s;
  const CW = capWidth * s;
  const CD = capDepth * s;
  const CH = capHeight * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Foundation block */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[CW * 1.2, 0.06, CD * 1.2]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>

      {/* Pier shaft */}
      <mesh position={[0, PH / 2, 0]}>
        <boxGeometry args={[PW, PH, PD]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.7} />
      </mesh>

      {/* Pier glow — animated */}
      <PierGlow PW={PW} PH={PH} PD={PD} colour={colour} />

      {/* Pier cap */}
      <mesh position={[0, PH + CH / 2, 0]}>
        <boxGeometry args={[CW, CH, CD]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.6} />
      </mesh>

      {/* Bearings on cap — animated arrows */}
      {Array.from({ length: numBearings }).map((_, i) => {
        const x = (i - (numBearings - 1) / 2) * (CW * 0.6 / Math.max(1, numBearings - 1));
        return (
          <group key={`brg${i}`}>
            <mesh position={[x, PH + CH + 0.015, 0]}>
              <boxGeometry args={[0.04, 0.02, 0.04]} />
              <meshStandardMaterial color="#1f2937" roughness={0.5} />
            </mesh>
            <AnimatedBearingArrow x={x} baseY={PH + CH + 0.08} colour="#ef4444" />
          </group>
        );
      })}

      {/* Pier reinforcement hints (vertical lines) */}
      {[-PW * 0.35, PW * 0.35].map((x, i) => (
        <mesh key={`rv${i}`} position={[x, PH / 2, PD / 2 + 0.002]}>
          <boxGeometry args={[0.003, PH * 0.9, 0.001]} />
          <meshStandardMaterial color="#1e40af" />
        </mesh>
      ))}

      {/* Horizontal ties */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = (i + 1) * PH / 6;
        return (
          <mesh key={`ht${i}`} position={[0, y, PD / 2 + 0.002]}>
            <boxGeometry args={[PW * 0.8, 0.002, 0.001]} />
            <meshStandardMaterial color="#1e40af" transparent opacity={0.7} />
          </mesh>
        );
      })}

      {/* Ground line */}
      <mesh position={[0, -0.005, 0]}>
        <boxGeometry args={[CW * 2, 0.002, CD * 2]} />
        <meshStandardMaterial color="#92400e" transparent opacity={0.3} />
      </mesh>

      {/* Dimension lines */}
      <DimensionLine start={[PW / 2 + 0.08, 0, 0]} end={[PW / 2 + 0.08, PH, 0]} color="#38bdf8" />
      <Text position={[PW / 2 + 0.16, PH / 2, 0]} fontSize={0.04} color="#38bdf8">
        {`H = ${(pierHeight / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[-CW / 2, PH + CH + 0.05, CD / 2 + 0.04]} end={[CW / 2, PH + CH + 0.05, CD / 2 + 0.04]} color="#38bdf8" />
      <Text position={[0, PH + CH + 0.1, CD / 2 + 0.04]} fontSize={0.03} color="#38bdf8">
        {`${(capWidth / 1000).toFixed(1)}m`}
      </Text>

      {/* Labels */}
      <Text position={[0, PH + CH + 0.18, 0]} fontSize={0.06} color="#ef4444">
        {`P = ${axialLoad} kN`}
      </Text>
      <Text position={[0, PH + CH + 0.28, 0]} fontSize={0.06} color="#94a3b8">
        {`Pier ${pierWidth}×${pierDepth}mm, Cap ${capWidth}×${capDepth}mm`}
      </Text>

      {/* Status indicator */}
      <mesh position={[CW / 2 + 0.06, PH + CH + 0.15, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
