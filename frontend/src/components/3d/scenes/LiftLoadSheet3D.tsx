import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function SlewingBoom({ BL, angleRad, colour, children }: { BL: number; angleRad: number; colour: string; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.15;
  });
  const boomTipX = BL * Math.cos(angleRad);
  const boomTipY = BL * Math.sin(angleRad);
  return (
    <group ref={ref}>
      {/* Boom */}
      <mesh position={[boomTipX / 2, 0.1 + boomTipY / 2, 0]} rotation={[0, 0, angleRad]}>
        <boxGeometry args={[0.04, BL, 0.04]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Boom tip */}
      <mesh position={[boomTipX, 0.1 + boomTipY, 0]}>
        <boxGeometry args={[0.06, 0.03, 0.06]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} />
      </mesh>
      {children}
    </group>
  );
}

function SwingingLoad({ boomTipX, boomTipY }: { boomTipX: number; boomTipY: number }) {
  const wireRef = useRef<THREE.Mesh>(null!);
  const loadRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!loadRef.current) return;
    const swing = Math.sin(clock.getElapsedTime() * 1.2) * 0.02;
    loadRef.current.position.x = boomTipX + swing;
    loadRef.current.position.y = 0.05 + Math.sin(clock.getElapsedTime() * 0.8) * 0.01;
  });
  return (
    <>
      {/* Hoist wire */}
      <mesh ref={wireRef} position={[boomTipX, 0.1 + boomTipY / 2, 0]}>
        <cylinderGeometry args={[0.003, 0.003, boomTipY, 6]} />
        <meshStandardMaterial color="#71717a" metalness={0.8} />
      </mesh>
      {/* Load block */}
      <mesh position={[boomTipX, 0.15, 0]}>
        <boxGeometry args={[0.04, 0.04, 0.04]} />
        <meshStandardMaterial color="#71717a" metalness={0.7} />
      </mesh>
      {/* Lifted load */}
      <group ref={loadRef} position={[boomTipX, 0.05, 0]}>
        <mesh>
          <boxGeometry args={[0.15, 0.08, 0.1]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
      </group>
    </>
  );
}

function PulsingRadiusLine({ boomTipX }: { boomTipX: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[boomTipX / 2, 0.005, 0]}>
      <boxGeometry args={[boomTipX, 0.006, 0.006]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
    </mesh>
  );
}

function OutriggerGlow({ x, z, colour }: { x: number; z: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 1.5 + x * 10 + z * 7) * 0.3;
  });
  return (
    <group>
      <mesh position={[x, 0.01, z]}>
        <boxGeometry args={[0.08, 0.02, 0.08]} />
        <meshStandardMaterial color="#8B6914" roughness={0.8} />
      </mesh>
      <mesh ref={ref} position={[x, 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.006, 8, 24]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.6} />
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
      <Text position={[mx + offset + 0.08, my, mz]} fontSize={0.05} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface LiftLoadSheet3DProps {
  craneRadius?: number;
  boomLength?: number;
  liftLoad?: number;
  craneCapacity?: number;
  boomAngle?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function LiftLoadSheet3D({
  craneRadius = 15000,
  boomLength = 25000,
  liftLoad = 8,
  craneCapacity = 12,
  boomAngle = 55,
  utilisation = 0,
  status = 'PASS',
}: LiftLoadSheet3DProps) {
  const s = 1 / 15000;
  const BR = craneRadius * s;
  const BL = boomLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const angleRad = (boomAngle * Math.PI) / 180;
  const boomTipX = BL * Math.cos(angleRad);
  const boomTipY = BL * Math.sin(angleRad);

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[3, 0.04, 2]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Crane base / slew ring */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.1, 12]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Crane cabin */}
      <mesh position={[-0.08, 0.15, 0]}>
        <boxGeometry args={[0.12, 0.1, 0.1]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Counterweight */}
      <mesh position={[-0.2, 0.12, 0]}>
        <boxGeometry args={[0.15, 0.08, 0.1]} />
        <meshStandardMaterial color="#71717a" metalness={0.6} />
      </mesh>

      {/* Slewing boom assembly */}
      <SlewingBoom BL={BL} angleRad={angleRad} colour={colour}>
        <SwingingLoad boomTipX={boomTipX} boomTipY={boomTipY} />
      </SlewingBoom>

      {/* Pulsing radius line */}
      <PulsingRadiusLine boomTipX={boomTipX} />

      {/* Outrigger pads with glow */}
      {[[-0.25, -0.25], [-0.25, 0.25], [0.15, -0.25], [0.15, 0.25]].map(([x, z], i) => (
        <OutriggerGlow key={`op${i}`} x={x} z={z} colour={colour} />
      ))}

      {/* Dimension lines */}
      <DimensionLine
        start={[0, -0.06, 0.15]}
        end={[boomTipX, -0.06, 0.15]}
        label={`R ${(craneRadius / 1000).toFixed(1)}m`}
        offset={0}
      />
      <DimensionLine
        start={[-0.2, 0.1, -0.15]}
        end={[-0.2, 0.1 + boomTipY, -0.15]}
        label={`Boom ${(boomLength / 1000).toFixed(0)}m`}
        offset={-0.1}
      />

      {/* Labels */}
      <Text position={[boomTipX + 0.15, 0.05, 0]} fontSize={0.07} color="#3b82f6">
        {`${liftLoad}t`}
      </Text>
      <Text position={[0, boomTipY + 0.3, 0]} fontSize={0.08} color="#94a3b8">
        {`Crane Lift – ${boomAngle}° boom`}
      </Text>
      <Text position={[0, boomTipY + 0.15, 0]} fontSize={0.06} color="#f59e0b">
        {`Capacity ${craneCapacity}t @ ${(craneRadius / 1000).toFixed(0)}m`}
      </Text>

      {/* Status */}
      <mesh position={[boomTipX + 0.1, boomTipY, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[boomTipX + 0.1, boomTipY + 0.08, 0]} fontSize={0.045} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
