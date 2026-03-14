import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function ExpandingMember({ children, expScale }: { children: React.ReactNode; expScale: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (Math.sin(clock.getElapsedTime() * 0.8) * 0.5 + 0.5);
    ref.current.scale.x = 1 + t * expScale * 0.8;
    ref.current.position.x = t * expScale * 0.05;
  });
  return <group ref={ref}>{children}</group>;
}

function PulsingExpansionArrow({ position, length, colour }: { position: [number, number, number]; length: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (Math.sin(clock.getElapsedTime() * 0.8) * 0.5 + 0.5);
    ref.current.scale.x = 0.3 + t * 0.7;
    (ref.current.children[0] as THREE.Mesh).material && ((ref.current.children[0] as any).material.emissiveIntensity = 0.3 + t * 0.5);
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[length / 2, 0, 0]}>
        <boxGeometry args={[length + 0.02, 0.005, 0.005]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[length + 0.01, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.01, 0.02, 6]} />
        <meshStandardMaterial color={colour} />
      </mesh>
    </group>
  );
}

function HeatWaveGlow({ position, width, depth, status, utilisation }: { position: [number, number, number]; width: number; depth: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.2 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.2} transparent opacity={0.2} side={THREE.DoubleSide} />
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

export interface ThermalActions3DProps {
  memberLength?: number;
  depth?: number;
  width?: number;
  tempRange?: number;
  expansion?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function ThermalActions3D({
  memberLength = 12000,
  depth = 600,
  width = 300,
  tempRange = 45,
  expansion = 5.4,
  utilisation = 58,
  status = 'PASS',
}: ThermalActions3DProps) {
  const s = 1 / 8000;
  const L = memberLength * s;
  const D = depth * s;
  const W = width * s;
  const expScale = expansion * s * 100;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Original member (wireframe outline) */}
      <mesh position={[0, D / 2, 0]}>
        <boxGeometry args={[L, D, W]} />
        <meshStandardMaterial color="#6b7280" transparent opacity={0.2} wireframe />
      </mesh>

      {/* Animated expanding member */}
      <ExpandingMember expScale={expScale}>
        <mesh position={[0, D / 2, 0]}>
          <boxGeometry args={[L, D, W]} />
          <meshStandardMaterial color="#f97316" transparent opacity={0.55} roughness={0.5} />
        </mesh>
      </ExpandingMember>

      {/* Heat wave glow on top */}
      <HeatWaveGlow position={[0, D + 0.01, 0]} width={L * 1.05} depth={W * 1.2} status={status} utilisation={utilisation} />

      {/* Supports */}
      {[-L / 2, L / 2].map((x, i) => (
        <group key={`sup${i}`}>
          <mesh position={[x, -0.03, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.04, 8]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          {i === 1 && (
            <mesh position={[x, -0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, W * 0.6, 12]} />
              <meshStandardMaterial color="#6b7280" />
            </mesh>
          )}
        </group>
      ))}

      {/* Animated expansion arrow (right end) */}
      <PulsingExpansionArrow position={[L / 2 + 0.02, D / 2, W / 2 + 0.03]} length={expScale} colour="#22c55e" />
      <Text position={[L / 2 + expScale / 2 + 0.02, D / 2 + 0.04, W / 2 + 0.03]} fontSize={0.035} color="#22c55e">
        {`Δ = ${expansion.toFixed(1)}mm`}
      </Text>

      {/* Temperature gradient visualization (color strips) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = i / 7;
        const r = Math.round(200 + t * 55);
        const g = Math.round(80 - t * 30);
        const b = Math.round(30);
        const color = `rgb(${r},${g},${b})`;
        const x = -L / 2 + (i + 0.5) * (L / 8);
        return (
          <mesh key={`tg${i}`} position={[x, D + 0.015, 0]}>
            <boxGeometry args={[L / 8 - 0.002, 0.008, W * 0.6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}

      {/* Dimension lines */}
      <DimensionLine start={[-L / 2, -0.06, W / 2 + 0.04]} end={[L / 2, -0.06, W / 2 + 0.04]} label={`L = ${(memberLength / 1000).toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[0, D + 0.1, 0]} fontSize={0.06} color="#f97316">
        {`ΔT = ${tempRange}°C`}
      </Text>
      <Text position={[0, D + 0.2, 0]} fontSize={0.06} color="#94a3b8">
        {`L = ${(memberLength / 1000).toFixed(1)}m, ${depth}×${width}mm`}
      </Text>
      <Text position={[0, D + 0.3, 0]} fontSize={0.05} color="#94a3b8">
        {`α·ΔT·L = ${expansion.toFixed(1)}mm`}
      </Text>
      <Text position={[0, D + 0.4, 0]} fontSize={0.04} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>

      <mesh position={[L / 2 + 0.1, D + 0.05, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
