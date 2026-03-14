import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function LegStressGlow({ x, z, H, colour }: { x: number; z: number; H: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2 + x * 10 + z * 7) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, H / 2, z]}>
      <cylinderGeometry args={[0.015, 0.015, H, 8]} />
      <meshStandardMaterial color="#f59e0b" emissive={colour} emissiveIntensity={0.3} metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

function AnimatedLoadArrow({ fx, H, baysX, bw }: { fx: number; H: number; baysX: number; bw: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = H + 0.15 + Math.sin(clock.getElapsedTime() * 2 + fx * 5) * 0.02;
  });
  return (
    <group ref={ref} position={[fx * baysX * bw, H + 0.15, 0]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.035, 0.06, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function SwayingTower({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.002;
    ref.current.rotation.z = Math.cos(clock.getElapsedTime() * 0.4) * 0.002;
  });
  return <group ref={ref}>{children}</group>;
}

function DimensionLine({ start, end, label, offset = 0.08 }: { start: [number, number, number]; end: [number, number, number]; label: string; offset?: number }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2;
  const mz = (start[2] + end[2]) / 2;
  const len = Math.sqrt((end[0]-start[0])**2 + (end[1]-start[1])**2 + (end[2]-start[2])**2);
  const angle = Math.atan2(end[1]-start[1], end[0]-start[0]);
  return (
    <group>
      <mesh position={[mx + offset, my, mz]} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.003, 0.003]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mx + offset + 0.08, my, mz]} fontSize={0.05} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface Falsework3DProps {
  bayWidth?: number;
  bayDepth?: number;
  height?: number;
  numBaysX?: number;
  numBaysZ?: number;
  numLifts?: number;
  load?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function Falsework3D({
  bayWidth = 1200,
  bayDepth = 1200,
  height = 6000,
  numBaysX = 3,
  numBaysZ = 2,
  numLifts = 3,
  load = 30,
  utilisation = 0,
  status = 'PASS',
}: Falsework3DProps) {
  const s = 1 / 3000;
  const bw = bayWidth * s;
  const bd = bayDepth * s;
  const H = height * s;
  const liftH = H / numLifts;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const legR = 0.015;

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[numBaysX * bw + 1, 0.1, numBaysZ * bd + 1]} />
        <meshStandardMaterial color="#5c4033" roughness={1} />
      </mesh>

      <SwayingTower>
        {/* Standards (vertical legs) with stress glow */}
        {Array.from({ length: numBaysX + 1 }).map((_, i) =>
          Array.from({ length: numBaysZ + 1 }).map((_, j) => {
            const x = (i - numBaysX / 2) * bw;
            const z = (j - numBaysZ / 2) * bd;
            return <LegStressGlow key={`${i}-${j}`} x={x} z={z} H={H} colour={colour} />;
          })
        )}

        {/* Ledgers (horizontal - X direction) at each lift */}
        {Array.from({ length: numLifts + 1 }).map((_, lift) =>
          Array.from({ length: numBaysZ + 1 }).map((_, j) => {
            const y = lift * liftH;
            const z = (j - numBaysZ / 2) * bd;
            return (
              <mesh key={`lx-${lift}-${j}`} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[legR * 0.8, legR * 0.8, numBaysX * bw, 6]} />
                <meshStandardMaterial color="#3b82f6" metalness={0.5} />
              </mesh>
            );
          })
        )}

        {/* Transoms (horizontal - Z direction) at each lift */}
        {Array.from({ length: numLifts + 1 }).map((_, lift) =>
          Array.from({ length: numBaysX + 1 }).map((_, i) => {
            const y = lift * liftH;
            const x = (i - numBaysX / 2) * bw;
            return (
              <mesh key={`tz-${lift}-${i}`} position={[x, y, 0]}>
                <cylinderGeometry args={[legR * 0.8, legR * 0.8, numBaysZ * bd, 6]} />
                <meshStandardMaterial color="#3b82f6" metalness={0.5} />
              </mesh>
            );
          })
        )}

        {/* Diagonal braces */}
        {Array.from({ length: numBaysX }).map((_, i) => {
          const x1 = (i - numBaysX / 2) * bw;
          const x2 = x1 + bw;
          const z = -numBaysZ / 2 * bd;
          const len = Math.sqrt(bw * bw + liftH * liftH);
          const angle = Math.atan2(liftH, bw);
          return (
            <mesh key={`d${i}`} position={[(x1 + x2) / 2, liftH / 2, z]} rotation={[0, 0, angle]}>
              <cylinderGeometry args={[legR * 0.5, legR * 0.5, len, 6]} />
              <meshStandardMaterial color="#ef4444" transparent opacity={0.7} />
            </mesh>
          );
        })}

        {/* Top platform/deck */}
        <mesh position={[0, H + 0.02, 0]}>
          <boxGeometry args={[numBaysX * bw + 0.1, 0.04, numBaysZ * bd + 0.1]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
      </SwayingTower>

      {/* Animated load arrows */}
      {[-0.3, 0, 0.3].map((fx, i) => (
        <AnimatedLoadArrow key={i} fx={fx} H={H} baysX={numBaysX} bw={bw} />
      ))}

      {/* Dimension lines */}
      <DimensionLine
        start={[numBaysX * bw / 2 + 0.12, 0, 0]}
        end={[numBaysX * bw / 2 + 0.12, H, 0]}
        label={`H ${(height / 1000).toFixed(1)}m`}
        offset={0.05}
      />
      <DimensionLine
        start={[-numBaysX * bw / 2, -0.08, -numBaysZ * bd / 2]}
        end={[numBaysX * bw / 2, -0.08, -numBaysZ * bd / 2]}
        label={`${numBaysX}×${bayWidth}mm`}
        offset={0}
      />

      {/* Labels */}
      <Text position={[0, H + 0.35, 0]} fontSize={0.08} color="#ef4444">
        {`w = ${load} kN/m²`}
      </Text>
      <Text position={[0, -0.15, 0]} fontSize={0.07} color="#94a3b8">
        {`${numBaysX}×${numBaysZ} bays @ ${bayWidth}mm`}
      </Text>

      {/* Status */}
      <mesh position={[numBaysX * bw / 2, H + 0.05, numBaysZ * bd / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[numBaysX * bw / 2, H + 0.13, numBaysZ * bd / 2]} fontSize={0.045} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
