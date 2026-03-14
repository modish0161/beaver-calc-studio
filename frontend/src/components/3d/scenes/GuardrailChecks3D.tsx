import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function LoadPulse({ totalLen, PH }: { totalLen: number; PH: number }) {
  const arrowRef = useRef<THREE.Mesh>(null!);
  const shaftRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.8 + Math.sin(t * 2.5) * 0.2;
    if (arrowRef.current) arrowRef.current.scale.setScalar(pulse);
    if (shaftRef.current) {
      (shaftRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.3 + Math.sin(t * 2.5) * 0.3;
    }
  });
  return (
    <group>
      <mesh ref={arrowRef} position={[totalLen / 4, PH, -0.5]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.015, 0.04, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={shaftRef} position={[totalLen / 4, PH, -0.35]}>
        <boxGeometry args={[0.006, 0.006, 0.2]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function PostGlow({ x, colour }: { x: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, 0.005, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.035, 0.005, 8, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.6} />
    </mesh>
  );
}

function FlexingRail({ PH, totalLen, ratio }: { PH: number; totalLen: number; ratio: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.z = -0.28 + Math.sin(clock.getElapsedTime() * 1.5) * 0.002;
  });
  const radius = ratio > 0.9 ? 0.012 : 0.01;
  return (
    <mesh ref={ref} position={[0, PH * ratio, -0.28]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, totalLen, 8]} />
      <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

function AnimatedPerson({ PH }: { PH: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.15;
  });
  return (
    <group ref={ref}>
      {/* Body */}
      <mesh position={[0, PH * 0.4, 0.05]}>
        <cylinderGeometry args={[0.04, 0.04, PH * 0.7, 8]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.15} />
      </mesh>
      {/* Head */}
      <mesh position={[0, PH * 0.85, 0.05]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.15} />
      </mesh>
    </group>
  );
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
      <Text position={[mx + offset + 0.06, my, mz]} fontSize={0.04} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface GuardrailChecks3DProps {
  postHeight?: number;
  postSpacing?: number;
  numBays?: number;
  edgeHeight?: number;
  loadPerMetre?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function GuardrailChecks3D({
  postHeight = 1100,
  postSpacing = 2400,
  numBays = 3,
  edgeHeight = 150,
  loadPerMetre = 0.74,
  utilisation = 0,
  status = 'PASS',
}: GuardrailChecks3DProps) {
  const s = 1 / 1500;
  const PH = postHeight * s;
  const PS = postSpacing * s;
  const EH = edgeHeight * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const totalLen = numBays * PS;
  const numPosts = numBays + 1;

  return (
    <group>
      {/* Platform/slab edge */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[totalLen + 0.3, 0.04, 0.6]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>

      {/* Toe board */}
      <mesh position={[0, EH / 2, -0.28]}>
        <boxGeometry args={[totalLen, EH, 0.015]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>

      {/* Posts with glow */}
      {Array.from({ length: numPosts }).map((_, i) => {
        const x = (i - (numPosts - 1) / 2) * PS;
        return (
          <group key={`post${i}`}>
            <mesh position={[x, PH / 2, -0.28]}>
              <boxGeometry args={[0.025, PH, 0.025]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Base clamp */}
            <mesh position={[x, 0.02, -0.28]}>
              <boxGeometry args={[0.06, 0.04, 0.06]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            <PostGlow x={x} colour={colour} />
          </group>
        );
      })}

      {/* Animated flexing rails */}
      <FlexingRail PH={PH} totalLen={totalLen} ratio={1} />
      <FlexingRail PH={PH} totalLen={totalLen} ratio={0.5} />

      {/* Animated person reference */}
      <AnimatedPerson PH={PH} />

      {/* Animated load pulse arrow */}
      <LoadPulse totalLen={totalLen} PH={PH} />

      {/* Dimension lines */}
      <DimensionLine
        start={[totalLen / 2 + 0.12, 0, -0.28]}
        end={[totalLen / 2 + 0.12, PH, -0.28]}
        label={`H ${postHeight}mm`}
      />
      <DimensionLine
        start={[-totalLen / 2, PH + 0.08, -0.28]}
        end={[totalLen / 2, PH + 0.08, -0.28]}
        label={`${numBays} bays @ ${postSpacing}mm`}
        offset={0}
      />

      {/* Labels */}
      <Text position={[0, PH + 0.2, -0.28]} fontSize={0.07} color="#94a3b8">
        {`${numBays} bays @ ${postSpacing}mm`}
      </Text>
      <Text position={[0, PH + 0.33, -0.28]} fontSize={0.06} color="#f59e0b">
        {`${loadPerMetre} kN/m`}
      </Text>

      {/* Status */}
      <mesh position={[totalLen / 2, PH + 0.05, -0.28]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[totalLen / 2, PH + 0.12, -0.28]} fontSize={0.04} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
