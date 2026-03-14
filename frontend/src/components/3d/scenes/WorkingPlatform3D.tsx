import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated helpers ────────────────────────────────────────── */

function DimensionLine({ start, end, color = '#f59e0b' }: { start: [number, number, number]; end: [number, number, number]; color?: string }) {
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
  const len = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2 + (end[2] - start[2]) ** 2);
  const dir = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group>
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.004, 0.004, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.01, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.01, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedLoadArrow({ colour }: { colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.21 + Math.sin(clock.getElapsedTime() * 2) * 0.015;
  });
  return (
    <group ref={ref} position={[0, 0.21, 0]}>
      <mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.025, 0.06, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.008, 0.1, 0.008]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function ConeGlow({ PT, colour }: { PT: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={[0, -PT / 2, 0]}>
      <cylinderGeometry args={[0.08, 0.25, PT, 8]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.15} transparent opacity={0.1} wireframe />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface WorkingPlatform3DProps {
  platformThick?: number;
  platformWidth?: number;
  platformLength?: number;
  bearingCapacity?: number;
  appliedPressure?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function WorkingPlatform3D({
  platformThick = 600,
  platformWidth = 8000,
  platformLength = 12000,
  bearingCapacity = 100,
  appliedPressure = 75,
  utilisation = 72,
  status = 'PASS',
}: WorkingPlatform3DProps) {
  const s = 1 / 5000;
  const PT = platformThick * s;
  const PW = platformWidth * s;
  const PL = platformLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Sub-grade */}
      <mesh position={[0, -PT - 0.04, 0]}>
        <boxGeometry args={[PL + 0.5, 0.06, PW + 0.5]} />
        <meshStandardMaterial color="#78552b" roughness={0.9} />
      </mesh>

      {/* Geotextile (separation layer) */}
      <mesh position={[0, -PT - 0.008, 0]}>
        <boxGeometry args={[PL + 0.1, 0.005, PW + 0.1]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Platform granular fill */}
      <mesh position={[0, -PT / 2, 0]}>
        <boxGeometry args={[PL, PT, PW]} />
        <meshStandardMaterial color="#d4a574" roughness={0.9} />
      </mesh>

      {/* Surface running layer */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[PL, 0.02, PW]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.8} />
      </mesh>

      {/* Crane outrigger footprint */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.3, 0.02, 0.3]} />
        <meshStandardMaterial color="#71717a" metalness={0.7} />
      </mesh>

      {/* Pressure distribution cone — animated glow */}
      <ConeGlow PT={PT} colour="#3b82f6" />

      {/* Load arrow — animated */}
      <AnimatedLoadArrow colour="#ef4444" />

      {/* Dimension lines */}
      <DimensionLine start={[-PL / 2, 0.04, PW / 2 + 0.08]} end={[PL / 2, 0.04, PW / 2 + 0.08]} color="#38bdf8" />
      <Text position={[0, 0.08, PW / 2 + 0.08]} fontSize={0.06} color="#38bdf8">
        {`${(platformLength / 1000).toFixed(0)}m`}
      </Text>
      <DimensionLine start={[PL / 2 + 0.08, 0, 0]} end={[PL / 2 + 0.08, -PT, 0]} color="#d4a574" />
      <Text position={[PL / 2 + 0.2, -PT / 2, 0]} fontSize={0.05} color="#d4a574">
        {`t = ${platformThick}mm`}
      </Text>

      {/* Labels */}
      <Text position={[0, 0.05, PW / 2 + 0.2]} fontSize={0.06} color="#94a3b8">
        {`${(platformWidth / 1000).toFixed(0)}m`}
      </Text>
      <Text position={[0, 0.4, 0]} fontSize={0.07} color="#94a3b8">
        Working Platform (BRE 470)
      </Text>
      <Text position={[0, 0.5, 0]} fontSize={0.06} color="#f59e0b">
        {`Capacity ${bearingCapacity} kPa, Applied ${appliedPressure} kPa`}
      </Text>

      {/* Status indicator */}
      <mesh position={[PL / 2, 0.15, PW / 2]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
