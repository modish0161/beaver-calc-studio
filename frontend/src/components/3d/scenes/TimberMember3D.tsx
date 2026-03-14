import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function BeamDeflection({ children, span }: { children: React.ReactNode; span: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = Math.sin(clock.getElapsedTime() * 1.2) * span * 0.003;
  });
  return <group ref={ref}>{children}</group>;
}

function PulsingUDLArrow({ position, index }: { position: [number, number, number]; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2 + index * 0.5) * 0.006;
  });
  return (
    <group ref={ref} position={position}>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.01, 0.03, 6]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.003, 0.04, 0.003]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function GlowBase({ position, width, depth, status, utilisation }: { position: [number, number, number]; width: number; depth: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz) || Math.abs(end[1] - start[1]);
  const angle = Math.atan2(dz, dx);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx, my + 0.025, mz]} fontSize={0.03} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface TimberMember3DProps {
  width?: number;
  depth?: number;
  span?: number;
  load?: number;
  gradeClass?: string;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function TimberMember3D({
  width = 75,
  depth = 225,
  span = 4000,
  load = 5,
  gradeClass = 'C24',
  utilisation = 65,
  status = 'PASS',
}: TimberMember3DProps) {
  const s = 1 / 2500;
  const W = width * s;
  const D = depth * s;
  const SP = span * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      <BeamDeflection span={SP}>
        {/* Timber beam */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[SP, D, W]} />
          <meshStandardMaterial color="#d4a574" roughness={0.8} />
        </mesh>

        {/* Beam glow */}
        <GlowBase position={[0, -D / 2 - 0.003, 0]} width={SP} depth={W * 1.3} status={status} utilisation={utilisation} />

        {/* Grain lines */}
        {Array.from({ length: 8 }).map((_, i) => {
          const x = -SP / 2 + (i + 1) * SP / 9;
          return (
            <mesh key={`g${i}`} position={[x, 0, W / 2 + 0.001]}>
              <boxGeometry args={[0.002, D * 0.8, 0.001]} />
              <meshStandardMaterial color="#b8860b" transparent opacity={0.3} />
            </mesh>
          );
        })}
      </BeamDeflection>

      {/* Supports */}
      <mesh position={[-SP / 2 + 0.02, -D / 2 - 0.03, 0]}>
        <boxGeometry args={[0.06, 0.04, W + 0.02]} />
        <meshStandardMaterial color="#71717a" metalness={0.5} />
      </mesh>
      <mesh position={[SP / 2 - 0.02, -D / 2 - 0.03, 0]}>
        <boxGeometry args={[0.06, 0.04, W + 0.02]} />
        <meshStandardMaterial color="#71717a" metalness={0.5} />
      </mesh>

      {/* Animated UDL arrows */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -SP / 2 + (i + 0.5) * SP / 6;
        return <PulsingUDLArrow key={`udl${i}`} position={[x, D / 2 + 0.06, 0]} index={i} />;
      })}
      {/* UDL line */}
      <mesh position={[0, D / 2 + 0.11, 0]}>
        <boxGeometry args={[SP * 0.9, 0.003, 0.003]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Dimension lines */}
      <DimensionLine start={[-SP / 2, -D / 2 - 0.06, W / 2 + 0.04]} end={[SP / 2, -D / 2 - 0.06, W / 2 + 0.04]} label={`Span ${(span / 1000).toFixed(1)}m`} offset={0} />
      <DimensionLine start={[SP / 2 + 0.04, -D / 2, 0]} end={[SP / 2 + 0.04, D / 2, 0]} label={`${depth}mm`} offset={0.02} />

      {/* Labels */}
      <Text position={[0, D / 2 + 0.2, 0]} fontSize={0.07} color="#94a3b8">
        {`${gradeClass} timber ${width}×${depth}`}
      </Text>
      <Text position={[0, D / 2 + 0.32, 0]} fontSize={0.06} color="#ef4444">
        {`${load} kN/m UDL`}
      </Text>
      <Text position={[0, D / 2 + 0.42, 0]} fontSize={0.05} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>

      <mesh position={[SP / 2 + 0.05, D / 2, 0]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
