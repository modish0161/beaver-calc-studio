import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function PulsingLoadArrow({ position, index }: { position: [number, number, number]; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2 + index * 0.5) * 0.015;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.2, 6]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.04, 0.07, 6]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function BearingGlow({ position, width, depth, status, utilisation }: { position: [number, number, number]; width: number; depth: number; status: string; utilisation: number }) {
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
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.3} side={THREE.DoubleSide} />
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
      <Text position={[mx, my + 0.03, mz]} fontSize={0.06} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface StripFooting3DProps {
  footingWidth?: number;
  footingDepth?: number;
  wallWidth?: number;
  wallHeight?: number;
  footingLength?: number;
  bearingPressure?: number;
  loadPerMeter?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function StripFooting3D({
  footingWidth = 900,
  footingDepth = 400,
  wallWidth = 300,
  wallHeight = 3000,
  footingLength = 5000,
  bearingPressure = 100,
  loadPerMeter = 45,
  utilisation = 72,
  status = 'PASS',
}: StripFooting3DProps) {
  const s = 1 / 1500;
  const FW = footingWidth * s;
  const FD = footingDepth * s;
  const FL = Math.min(footingLength * s, 4);
  const WW = wallWidth * s;
  const WH = Math.min(wallHeight * s, 3);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -FD - 0.05, 0]} receiveShadow>
        <boxGeometry args={[FW + 1.5, 0.1, FL + 1]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>

      {/* Bearing pressure glow */}
      <BearingGlow position={[0, -FD + 0.02, 0]} width={FW * 0.95} depth={FL * 0.95} status={status} utilisation={utilisation} />

      {/* Bearing pressure */}
      <mesh position={[0, -FD + 0.01, 0]}>
        <boxGeometry args={[FW * 0.9, 0.02, FL * 0.95]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.3} />
      </mesh>

      {/* Strip footing */}
      <mesh position={[0, -FD / 2, 0]} castShadow>
        <boxGeometry args={[FW, FD, FL]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      <lineSegments position={[0, -FD / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(FW, FD, FL)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
      </lineSegments>

      {/* Wall on footing */}
      <mesh position={[0, WH / 2, 0]} castShadow>
        <boxGeometry args={[WW, WH, FL]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </mesh>

      {/* Animated distributed load arrows */}
      {[-0.8, -0.4, 0, 0.4, 0.8].map((frac, i) => {
        const z = frac * FL / 2;
        return <PulsingLoadArrow key={i} position={[0, WH + 0.1, z]} index={i} />;
      })}

      {/* Dimension lines */}
      <DimensionLine start={[-FW / 2, -FD - 0.12, FL / 2 + 0.15]} end={[FW / 2, -FD - 0.12, FL / 2 + 0.15]} label={`W=${(footingWidth / 1000).toFixed(2)}m`} offset={0} />
      <DimensionLine start={[FW / 2 + 0.15, -FD, 0]} end={[FW / 2 + 0.15, 0, 0]} label={`D=${(footingDepth / 1000).toFixed(0)}m`} offset={0.02} />

      {/* Labels */}
      <Text position={[0, WH + 0.4, 0]} fontSize={0.1} color="#ef4444">
        {`w = ${loadPerMeter} kN/m`}
      </Text>
      <Text position={[FW / 2 + 0.2, -FD / 2, 0]} fontSize={0.08} color="#f59e0b">
        {`q = ${bearingPressure} kPa`}
      </Text>
      <Text position={[0, WH + 0.55, 0]} fontSize={0.08} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <mesh position={[FW / 2, WH, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
