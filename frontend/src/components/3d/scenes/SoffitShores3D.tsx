import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface SoffitShores3DProps {
  shoreHeight?: number;
  slabThick?: number;
  shoreSpacing?: number;
  numShoresX?: number;
  numShoresZ?: number;
  loadPerShore?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Pulsating glow ring at shore base */
function ShoreGlow({ x, z, status, utilisation }: { x: number; z: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.035, 0.005, 6, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.12} />
    </mesh>
  );
}

/** Animated load arrow per shore */
function AnimatedLoadArrow({ x, z, SH, load }: { x: number; z: number; SH: number; load: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = SH + 0.2 + Math.sin(clock.getElapsedTime() * 3 + x * 5) * 0.008;
  });
  return (
    <group ref={ref} position={[x, SH + 0.2, z]}>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.015, 0.04, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.06, 4]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

/** Animated concrete pour effect on slab */
function PourEffect({ SH, ST, spanX, spanZ }: { SH: number; ST: number; spanX: number; spanZ: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.35 + Math.sin(clock.getElapsedTime() * 0.8) * 0.1;
  });
  return (
    <mesh ref={ref} position={[0, SH + 0.08 + ST / 2, 0]}>
      <boxGeometry args={[spanX, ST, spanZ]} />
      <meshStandardMaterial color="#94a3b8" transparent opacity={0.45} roughness={0.7} />
    </mesh>
  );
}

/** Dimension line */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2 + 0.04, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0]; const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, start[2]]}>
        <boxGeometry args={[dx !== 0 ? len : 0.003, dy !== 0 ? len : 0.003, 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={mid} fontSize={0.05} color={color}>{label}</Text>
    </group>
  );
}

export default function SoffitShores3D({
  shoreHeight = 3000,
  slabThick = 250,
  shoreSpacing = 1200,
  numShoresX = 4,
  numShoresZ = 3,
  loadPerShore = 25,
  utilisation = 50,
  status = 'PASS',
}: SoffitShores3DProps) {
  const s = 1 / 2000;
  const SH = shoreHeight * s;
  const ST = slabThick * s;
  const sp = shoreSpacing * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';
  const propR = 0.015;

  return (
    <group>
      {/* Floor slab below */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[(numShoresX + 1) * sp, 0.1, (numShoresZ + 1) * sp]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </mesh>

      {/* Props/shores with glow rings and animated arrows */}
      {Array.from({ length: numShoresX }).map((_, i) =>
        Array.from({ length: numShoresZ }).map((_, j) => {
          const x = (i - (numShoresX - 1) / 2) * sp;
          const z = (j - (numShoresZ - 1) / 2) * sp;
          return (
            <group key={`${i}-${j}`}>
              <ShoreGlow x={x} z={z} status={status} utilisation={utilisation} />
              {/* Outer tube */}
              <mesh position={[x, SH / 3, z]}>
                <cylinderGeometry args={[propR, propR, SH * 0.65, 8]} />
                <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
              </mesh>
              {/* Inner tube */}
              <mesh position={[x, SH * 0.7, z]}>
                <cylinderGeometry args={[propR * 0.7, propR * 0.7, SH * 0.6, 8]} />
                <meshStandardMaterial color="#d97706" metalness={0.5} roughness={0.4} />
              </mesh>
              {/* Pin detail */}
              <mesh position={[x, SH * 0.5, z + 0.02]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
                <cylinderGeometry args={[0.003, 0.003, 0.04, 6]} />
                <meshStandardMaterial color="#71717a" metalness={0.7} />
              </mesh>
              {/* Base plate */}
              <mesh position={[x, 0.01, z]}>
                <boxGeometry args={[0.06, 0.02, 0.06]} />
                <meshStandardMaterial color="#71717a" metalness={0.7} />
              </mesh>
              {/* Head plate */}
              <mesh position={[x, SH - 0.01, z]}>
                <boxGeometry args={[0.06, 0.02, 0.06]} />
                <meshStandardMaterial color="#71717a" metalness={0.7} />
              </mesh>
              <AnimatedLoadArrow x={x} z={z} SH={SH + ST} load={loadPerShore} />
            </group>
          );
        })
      )}

      {/* Primary beams (runners) */}
      {Array.from({ length: numShoresZ }).map((_, j) => {
        const z = (j - (numShoresZ - 1) / 2) * sp;
        return (
          <mesh key={`r${j}`} position={[0, SH + 0.02, z]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.04, numShoresX * sp, 0.08]} />
            <meshStandardMaterial color="#8B6914" roughness={0.8} />
          </mesh>
        );
      })}

      {/* Secondary beams */}
      {Array.from({ length: numShoresX + 2 }).map((_, i) => {
        const x = (i - (numShoresX + 1) / 2) * sp * 0.5;
        return (
          <mesh key={`s${i}`} position={[x, SH + 0.06, 0]}>
            <boxGeometry args={[0.04, 0.04, numShoresZ * sp]} />
            <meshStandardMaterial color="#A0782C" roughness={0.8} />
          </mesh>
        );
      })}

      {/* Slab being cast (animated pour effect) */}
      <PourEffect SH={SH} ST={ST} spanX={(numShoresX + 0.5) * sp} spanZ={(numShoresZ + 0.5) * sp} />

      {/* Dimension: height */}
      <DimensionLine
        start={[(numShoresX * sp) / 2 + 0.15, 0, 0]}
        end={[(numShoresX * sp) / 2 + 0.15, SH, 0]}
        label={`H = ${(shoreHeight / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />
      {/* Dimension: spacing */}
      <DimensionLine
        start={[-(numShoresX - 1) / 2 * sp, -0.12, 0]}
        end={[-(numShoresX - 1) / 2 * sp + sp, -0.12, 0]}
        label={`${(shoreSpacing / 1000).toFixed(1)}m`}
      />

      {/* Labels */}
      <Text position={[0, SH + ST + 0.2, 0]} fontSize={0.08} color="#00d9ff">
        {`Soffit Shores`}
      </Text>
      <Text position={[0, SH + ST + 0.32, 0]} fontSize={0.06} color="#f59e0b">
        {`Slab ${slabThick}mm, ${numShoresX}×${numShoresZ} props @ ${shoreSpacing}mm`}
      </Text>
      <Text position={[0, -0.2, 0]} fontSize={0.06} color="#ef4444">
        {`${loadPerShore} kN/prop`}
      </Text>

      {/* Status */}
      <mesh position={[(numShoresX * sp) / 2, SH + ST + 0.1, (numShoresZ * sp) / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[(numShoresX * sp) / 2, SH + ST + 0.18, (numShoresZ * sp) / 2]} fontSize={0.04} color={sc}>
        {status}
      </Text>
    </group>
  );
}
