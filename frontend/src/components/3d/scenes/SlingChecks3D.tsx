import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function SwayingAssembly({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.z = Math.sin(t * 0.7) * 0.015;
    ref.current.rotation.x = Math.cos(t * 0.5) * 0.01;
  });
  return <group ref={ref}>{children}</group>;
}

function InspectionGlow({ position, pass }: { position: [number, number, number]; pass: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2.5) * 0.4;
  });
  const c = pass ? '#22c55e' : '#ef4444';
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[0.018, 0.004, 8, 16]} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.5} transparent opacity={0.7} />
    </mesh>
  );
}

function WearIndicator({ position, colour }: { position: [number, number, number]; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.4 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
  });
  return (
    <mesh ref={ref} position={position}>
      <ringGeometry args={[0.01, 0.016, 12]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.5} side={THREE.DoubleSide} />
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
      <mesh position={[mx + offset * 0.3, my, mz]} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.003, 0.003]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mx + offset, my + 0.03, mz]} fontSize={0.04} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface SlingChecks3DProps {
  slingType?: 'wire' | 'chain' | 'webbing';
  slingLength?: number;
  numLegs?: number;
  swl?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function SlingChecks3D({
  slingType = 'chain',
  slingLength = 2500,
  numLegs = 2,
  swl = 5.0,
  utilisation = 0,
  status = 'PASS',
}: SlingChecks3DProps) {
  const s = 1 / 2000;
  const SL = slingLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const slingColor = slingType === 'wire' ? '#a1a1aa' : slingType === 'chain' ? '#f59e0b' : '#22c55e';
  const hookH = SL * 0.7;
  const spread = SL * 0.4;
  const pass = status === 'PASS';

  return (
    <group>
      <SwayingAssembly>
        {/* Load being lifted */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[spread * 2, 0.15, 0.3]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.4} />
        </mesh>

        {/* Master link */}
        <mesh position={[0, hookH + 0.03, 0]}>
          <torusGeometry args={[0.03, 0.008, 8, 16]} />
          <meshStandardMaterial color="#71717a" metalness={0.8} />
        </mesh>

        {/* Sling legs with inspection detail */}
        {Array.from({ length: numLegs }).map((_, i) => {
          const xEnd = numLegs === 1 ? 0 : (i / (numLegs - 1) - 0.5) * spread * 2;
          const midX = xEnd / 2;
          const midY = hookH / 2 + 0.08;
          const legLen = Math.sqrt(xEnd * xEnd + hookH * hookH);
          const angle = Math.atan2(xEnd, hookH);
          return (
            <group key={`sl${i}`}>
              <mesh position={[midX, midY, 0]} rotation={[0, 0, -angle]}>
                <cylinderGeometry args={[0.008, 0.008, legLen, 6]} />
                <meshStandardMaterial color={slingColor} metalness={0.5} roughness={0.4} />
              </mesh>
              {/* Lower hook */}
              <mesh position={[xEnd, 0.12, 0]}>
                <torusGeometry args={[0.015, 0.005, 6, 8, Math.PI]} />
                <meshStandardMaterial color="#71717a" metalness={0.7} />
              </mesh>
              {/* ID tag */}
              <mesh position={[xEnd, hookH * 0.5, 0.02]}>
                <boxGeometry args={[0.03, 0.04, 0.002]} />
                <meshStandardMaterial color="#fef08a" />
              </mesh>
              {/* Animated inspection glow at each connection */}
              <InspectionGlow position={[xEnd, 0.12, 0]} pass={pass} />
              {/* Wear indicator at mid-leg */}
              <WearIndicator position={[midX, midY, 0.02]} colour={pass ? '#22c55e' : '#ef4444'} />
            </group>
          );
        })}

        {/* Inspection markers per leg */}
        {Array.from({ length: numLegs }).map((_, i) => {
          const xEnd = numLegs === 1 ? 0 : (i / (numLegs - 1) - 0.5) * spread * 2;
          return (
            <mesh key={`ic${i}`} position={[xEnd * 0.3, hookH * 0.3, 0.015]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
            </mesh>
          );
        })}
      </SwayingAssembly>

      {/* Dimension lines */}
      <DimensionLine
        start={[spread + 0.12, 0, 0]}
        end={[spread + 0.12, hookH, 0]}
        label={`L ${(slingLength / 1000).toFixed(1)}m`}
      />

      {/* Labels */}
      <Text position={[0, hookH + 0.15, 0]} fontSize={0.08} color="#94a3b8">
        {`${numLegs}-leg ${slingType} sling`}
      </Text>
      <Text position={[0, hookH + 0.28, 0]} fontSize={0.06} color="#f59e0b">
        {`SWL ${swl}t, L = ${(slingLength / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[0, -0.15, 0]} fontSize={0.06} color={colour}>
        {pass ? 'INSPECTION: PASS' : 'INSPECTION: FAIL'}
      </Text>

      {/* Status indicator */}
      <mesh position={[spread + 0.1, hookH, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[spread + 0.1, hookH + 0.08, 0]} fontSize={0.04} color={colour}>
        {pass ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
