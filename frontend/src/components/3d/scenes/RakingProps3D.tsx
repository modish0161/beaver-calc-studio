import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface RakingProps3DProps {
  propLength?: number;
  propAngle?: number;
  numProps?: number;
  wallHeight?: number;
  propLoad?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Pulsating glow ring at prop foot */
function PropGlow({ x, z, status, utilisation }: { x: number; z: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.04, 0.005, 6, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.12} />
    </mesh>
  );
}

/** Animated wall sway (being propped) */
function SwayingWall({ WH }: { WH: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.8) * 0.003;
  });
  return (
    <mesh ref={ref} position={[-0.05, WH / 2, 0]}>
      <boxGeometry args={[0.1, WH, 1.5]} />
      <meshStandardMaterial color="#94a3b8" roughness={0.7} />
    </mesh>
  );
}

/** Animated load transfer arrows along props */
function LoadArrows({ midX, midY, z, angleRad, load }: { midX: number; midY: number; z: number; angleRad: number; load: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.scale.setScalar(0.9 + Math.sin(clock.getElapsedTime() * 3 + z * 5) * 0.15);
  });
  return (
    <group ref={ref} position={[midX, midY + 0.06, z]}>
      <mesh rotation={[0, 0, angleRad + Math.PI / 2]}>
        <coneGeometry args={[0.012, 0.03, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
    </group>
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

export default function RakingProps3D({
  propLength = 4000,
  propAngle = 60,
  numProps = 4,
  wallHeight = 3500,
  propLoad = 15,
  utilisation = 50,
  status = 'PASS',
}: RakingProps3DProps) {
  const s = 1 / 2000;
  const WH = wallHeight * s;
  const PL = propLength * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';
  const angleRad = (propAngle * Math.PI) / 180;
  const footX = PL * Math.cos(angleRad);

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[3, 0.04, 2]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Swaying wall being propped */}
      <SwayingWall WH={WH} />

      {/* Wall crack detail */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={`cr${i}`} position={[-0.001, WH * (0.3 + i * 0.2), 0.2 - i * 0.15]}>
          <boxGeometry args={[0.002, WH * 0.08, 0.002]} />
          <meshStandardMaterial color="#ef4444" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Raking props with glow and load arrows */}
      {Array.from({ length: numProps }).map((_, i) => {
        const z = (i - (numProps - 1) / 2) * 0.35;
        const midX = footX / 2;
        const midY = (PL * Math.sin(angleRad)) / 2;
        return (
          <group key={`rp${i}`}>
            {/* Prop tube */}
            <mesh position={[midX, midY, z]} rotation={[0, 0, angleRad - Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, PL, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Foot pad */}
            <mesh position={[footX, 0.01, z]}>
              <boxGeometry args={[0.08, 0.02, 0.08]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            {/* Wall bracket */}
            <mesh position={[0.01, WH * 0.7, z]}>
              <boxGeometry args={[0.06, 0.08, 0.06]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            <PropGlow x={footX} z={z} status={status} utilisation={utilisation} />
            <LoadArrows midX={midX} midY={midY} z={z} angleRad={angleRad} load={propLoad} />
          </group>
        );
      })}

      {/* Sole plate at foot */}
      <mesh position={[footX, 0.005, 0]}>
        <boxGeometry args={[0.15, 0.01, numProps * 0.35 + 0.2]} />
        <meshStandardMaterial color="#8B6914" roughness={0.8} />
      </mesh>

      {/* Angle arc */}
      <mesh position={[footX * 0.3, 0.02, (numProps * 0.35) / 2 + 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.003, 4, 16, angleRad]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <Text position={[footX * 0.35, 0.08, (numProps * 0.35) / 2 + 0.2]} fontSize={0.05} color="#3b82f6">
        {`${propAngle}°`}
      </Text>

      {/* Dimension: prop length */}
      <DimensionLine
        start={[footX, 0, (numProps * 0.35) / 2 + 0.25]}
        end={[0, PL * Math.sin(angleRad), (numProps * 0.35) / 2 + 0.25]}
        label={`L = ${(propLength / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />
      {/* Dimension: wall height */}
      <DimensionLine
        start={[-0.2, 0, 0]}
        end={[-0.2, WH, 0]}
        label={`${(wallHeight / 1000).toFixed(1)}m`}
      />

      {/* Labels */}
      <Text position={[0.5, WH + 0.15, 0]} fontSize={0.08} color="#00d9ff">
        {`Raking Props`}
      </Text>
      <Text position={[footX / 2, PL * Math.sin(angleRad) / 2 + 0.15, 0]} fontSize={0.06} color="#f59e0b">
        {`${numProps} props, ${propLoad} kN each`}
      </Text>

      {/* Status */}
      <mesh position={[-0.15, WH + 0.05, (numProps * 0.35) / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[-0.15, WH + 0.13, (numProps * 0.35) / 2]} fontSize={0.04} color={sc}>
        {status}
      </Text>
    </group>
  );
}
