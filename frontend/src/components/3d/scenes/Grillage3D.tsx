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

function AnimatedLoadArrow({ position, colour }: { position: [number, number, number]; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.1, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function PlateGlow({ gridW, gridL, BD, colour }: { gridW: number; gridL: number; BD: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, BD + 0.08, gridL / 2 + 0.12]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[gridW * 0.9, 0.08]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface Grillage3DProps {
  numBeamsX?: number;
  numBeamsZ?: number;
  beamLength?: number;
  beamDepth?: number;
  beamWidth?: number;
  spacing?: number;
  load?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function Grillage3D({
  numBeamsX = 3,
  numBeamsZ = 5,
  beamLength = 3000,
  beamDepth = 300,
  beamWidth = 200,
  spacing = 500,
  load = 400,
  utilisation = 72,
  status = 'PASS',
}: Grillage3DProps) {
  const s = 1 / 1500;
  const BL = beamLength * s;
  const BD = beamDepth * s;
  const BW = beamWidth * s;
  const sp = spacing * s;
  const gridW = (numBeamsX - 1) * sp;
  const gridL = (numBeamsZ - 1) * sp;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Ground/base */}
      <mesh position={[0, -BD - 0.05, 0]} receiveShadow>
        <boxGeometry args={[BL + 1, 0.1, gridL + 1]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>

      {/* Bottom layer beams (X direction) */}
      {Array.from({ length: numBeamsZ }).map((_, i) => {
        const z = (i - (numBeamsZ - 1) / 2) * sp;
        return (
          <mesh key={`z${i}`} position={[0, -BD / 2, z]} castShadow>
            <boxGeometry args={[BL, BD, BW]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
          </mesh>
        );
      })}

      {/* Top layer beams (Z direction) */}
      {Array.from({ length: numBeamsX }).map((_, i) => {
        const x = (i - (numBeamsX - 1) / 2) * sp;
        return (
          <mesh key={`x${i}`} position={[x, BD / 2, 0]} castShadow>
            <boxGeometry args={[BW, BD, gridL + BW]} />
            <meshStandardMaterial color="#71717a" metalness={0.6} roughness={0.3} />
          </mesh>
        );
      })}

      {/* Base plate on top */}
      <mesh position={[0, BD + 0.04, 0]}>
        <boxGeometry args={[gridW + 0.2, 0.06, gridL + 0.2]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Plate glow — animated */}
      <PlateGlow gridW={gridW} gridL={gridL} BD={BD} colour={colour} />

      {/* Load arrow — animated */}
      <AnimatedLoadArrow position={[0, BD + 0.4, 0]} colour="#ef4444" />
      <Text position={[0.35, BD + 0.7, 0]} fontSize={0.1} color="#ef4444">
        {`P = ${load} kN`}
      </Text>

      {/* Dimension lines */}
      <DimensionLine start={[-BL / 2, -BD - 0.15, gridL / 2 + 0.2]} end={[BL / 2, -BD - 0.15, gridL / 2 + 0.2]} color="#38bdf8" />
      <Text position={[0, -BD - 0.25, gridL / 2 + 0.2]} fontSize={0.07} color="#38bdf8">
        {`L = ${(beamLength / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[BL / 2 + 0.15, -BD, 0]} end={[BL / 2 + 0.15, BD + 0.07, 0]} color="#38bdf8" />
      <Text position={[BL / 2 + 0.3, 0, 0]} fontSize={0.07} color="#38bdf8">
        {`d = ${beamDepth}mm`}
      </Text>

      {/* Labels */}
      <Text position={[0, -BD - 0.35, gridL / 2 + 0.3]} fontSize={0.09} color="#94a3b8">
        {`${numBeamsX}×${numBeamsZ} grillage @ ${spacing}mm c/c`}
      </Text>

      {/* Status indicator */}
      <mesh position={[BL / 2 + 0.15, BD, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
