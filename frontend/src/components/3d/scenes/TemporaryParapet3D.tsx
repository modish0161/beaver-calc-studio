import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function ImpactPulse({ position, PH }: { position: [number, number, number]; PH: number }) {
  const arrowRef = useRef<THREE.Mesh>(null!);
  const shaftRef = useRef<THREE.Mesh>(null!);
  const zoneRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.8 + Math.sin(t * 3) * 0.2;
    if (arrowRef.current) arrowRef.current.scale.setScalar(pulse);
    if (shaftRef.current) shaftRef.current.scale.z = pulse;
    if (zoneRef.current) {
      (zoneRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.15 + Math.sin(t * 2.5) * 0.15;
    }
  });
  return (
    <group>
      {/* Impact zone */}
      <mesh ref={zoneRef} position={[position[0], PH * 0.6, -0.45]}>
        <boxGeometry args={[0.3, 0.15, 0.01]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.3} />
      </mesh>
      {/* Arrow head */}
      <mesh ref={arrowRef} position={[position[0], PH * 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.025, 0.06, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      {/* Arrow shaft */}
      <mesh ref={shaftRef} position={[position[0], PH * 0.6, 0.2]}>
        <boxGeometry args={[0.008, 0.008, 0.3]} />
        <meshStandardMaterial color="#ef4444" />
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
    <mesh ref={ref} position={[x, 0.005, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.04, 0.005, 8, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.6} />
    </mesh>
  );
}

function FlexingRail({ PH, PL, ratio }: { PH: number; PL: number; ratio: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.z = -0.5 + Math.sin(clock.getElapsedTime() * 1.5) * 0.003;
  });
  return (
    <mesh ref={ref} position={[0, PH * ratio, -0.5]} rotation={[0, 0, Math.PI / 2]}>
      <boxGeometry args={[ratio > 0.8 ? 0.04 : 0.03, PL, ratio > 0.8 ? 0.04 : 0.03]} />
      <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
    </mesh>
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
      <Text position={[mx + offset + 0.06, my, mz]} fontSize={0.045} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface TemporaryParapet3DProps {
  parapetHeight?: number;
  parapetLength?: number;
  postSpacing?: number;
  impactLoad?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function TemporaryParapet3D({
  parapetHeight = 1500,
  parapetLength = 6000,
  postSpacing = 2000,
  impactLoad = 100,
  utilisation = 0,
  status = 'PASS',
}: TemporaryParapet3DProps) {
  const s = 1 / 2000;
  const PH = parapetHeight * s;
  const PL = parapetLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const numPosts = Math.max(2, Math.floor(parapetLength / postSpacing) + 1);

  return (
    <group>
      {/* Bridge deck / slab */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[PL + 0.4, 0.1, 1.2]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>

      {/* Posts with base glow */}
      {Array.from({ length: numPosts }).map((_, i) => {
        const x = (i - (numPosts - 1) / 2) * (PL / (numPosts - 1));
        return (
          <group key={`p${i}`}>
            <mesh position={[x, PH / 2, -0.5]}>
              <boxGeometry args={[0.04, PH, 0.04]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Base clamp */}
            <mesh position={[x, 0.02, -0.5]}>
              <boxGeometry args={[0.08, 0.04, 0.08]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            {/* Anchor bolts */}
            <mesh position={[x - 0.025, 0.005, -0.5]}>
              <cylinderGeometry args={[0.004, 0.004, 0.05, 6]} />
              <meshStandardMaterial color="#71717a" metalness={0.8} />
            </mesh>
            <mesh position={[x + 0.025, 0.005, -0.5]}>
              <cylinderGeometry args={[0.004, 0.004, 0.05, 6]} />
              <meshStandardMaterial color="#71717a" metalness={0.8} />
            </mesh>
            {/* Base glow ring */}
            <PostGlow x={x} colour={colour} />
          </group>
        );
      })}

      {/* Animated flexing horizontal rails */}
      <FlexingRail PH={PH} PL={PL} ratio={1} />
      <FlexingRail PH={PH} PL={PL} ratio={0.5} />

      {/* Animated impact pulse */}
      <ImpactPulse position={[0, 0, 0]} PH={PH} />

      {/* Road surface marking */}
      <mesh position={[0, 0.005, 0.25]}>
        <boxGeometry args={[PL * 0.8, 0.005, 0.02]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Chevron warning stripes on deck edge */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`chev${i}`} position={[(i - 2.5) * PL / 6, 0.006, -0.1]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.04, 0.005, 0.005]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      ))}

      {/* Dimension lines */}
      <DimensionLine
        start={[PL / 2 + 0.12, 0, -0.5]}
        end={[PL / 2 + 0.12, PH, -0.5]}
        label={`H ${parapetHeight}mm`}
      />
      <DimensionLine
        start={[-PL / 2, PH + 0.1, -0.5]}
        end={[PL / 2, PH + 0.1, -0.5]}
        label={`L ${(parapetLength / 1000).toFixed(0)}m`}
        offset={0}
      />

      {/* Labels */}
      <Text position={[0, PH + 0.25, -0.5]} fontSize={0.08} color="#94a3b8">
        {`Temp parapet, ${(parapetLength / 1000).toFixed(0)}m`}
      </Text>
      <Text position={[0.3, PH * 0.6, 0.25]} fontSize={0.06} color="#ef4444">
        {`${impactLoad} kN impact`}
      </Text>

      {/* Status */}
      <mesh position={[PL / 2, PH + 0.05, -0.5]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[PL / 2, PH + 0.13, -0.5]} fontSize={0.04} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
