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
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.005, 0.005, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.012, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.012, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedLoadArrow({ y, colour }: { y: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 2) * 0.03;
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.1, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function FootingGlow({ FL, FD, FW, colour }: { FL: number; FD: number; FW: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, -0.001, FW / 2 + 0.003]} rotation={[0, 0, 0]}>
      <planeGeometry args={[FL * 0.95, FD * 0.95]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface PadFooting3DProps {
  footingLength?: number;
  footingWidth?: number;
  footingDepth?: number;
  columnWidth?: number;
  columnDepth?: number;
  bearingPressure?: number;
  load?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function PadFooting3D({
  footingLength = 2000,
  footingWidth = 2000,
  footingDepth = 600,
  columnWidth = 400,
  columnDepth = 400,
  bearingPressure = 150,
  load = 500,
  utilisation = 72,
  status = 'PASS',
}: PadFooting3DProps) {
  const s = 1 / 1000;
  const FL = footingLength * s;
  const FW = footingWidth * s;
  const FD = footingDepth * s;
  const CW = columnWidth * s;
  const CD = columnDepth * s;
  const colH = 1.5;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Soil below */}
      <mesh position={[0, -FD - 0.1, 0]} receiveShadow>
        <boxGeometry args={[FL + 1.5, 0.2, FW + 1.5]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>

      {/* Bearing pressure diagram */}
      <mesh position={[0, -FD + 0.01, 0]}>
        <boxGeometry args={[FL * 0.95, 0.02, FW * 0.95]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.4} />
      </mesh>

      {/* Footing */}
      <mesh position={[0, -FD / 2, 0]} castShadow>
        <boxGeometry args={[FL, FD, FW]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      <lineSegments position={[0, -FD / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(FL, FD, FW)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
      </lineSegments>

      {/* Footing glow — animated */}
      <FootingGlow FL={FL} FD={FD} FW={FW} colour={colour} />

      {/* Column stub */}
      <mesh position={[0, colH / 2, 0]} castShadow>
        <boxGeometry args={[CW, colH, CD]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>

      {/* Load arrow — animated */}
      <AnimatedLoadArrow y={colH + 0.3} colour="#ef4444" />
      <Text position={[0.35, colH + 0.55, 0]} fontSize={0.1} color="#ef4444">
        {`N = ${load} kN`}
      </Text>

      {/* Dimension lines */}
      <DimensionLine start={[-FL / 2, -FD - 0.22, FW / 2 + 0.1]} end={[FL / 2, -FD - 0.22, FW / 2 + 0.1]} color="#38bdf8" />
      <Text position={[0, -FD - 0.35, FW / 2 + 0.1]} fontSize={0.08} color="#38bdf8">
        {`${(footingLength / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[FL / 2 + 0.15, -FD, 0]} end={[FL / 2 + 0.15, 0, 0]} color="#38bdf8" />
      <Text position={[FL / 2 + 0.35, -FD / 2, 0]} fontSize={0.08} color="#38bdf8">
        {`${footingDepth}mm`}
      </Text>

      {/* Labels */}
      <Text position={[0, -FD - 0.5, FW / 2 + 0.2]} fontSize={0.09} color="#94a3b8">
        {`${(footingLength / 1000).toFixed(1)}m × ${(footingWidth / 1000).toFixed(1)}m × ${footingDepth}mm`}
      </Text>
      <Text position={[FL / 2 + 0.3, -FD / 2, 0]} fontSize={0.08} color="#f59e0b">
        {`q = ${bearingPressure} kPa`}
      </Text>

      {/* Status indicator */}
      <mesh position={[FL / 2 + 0.1, colH, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
