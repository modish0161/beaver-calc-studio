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
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.002, 0.002, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.005, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.005, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedCutArrow({ position, colour }: { position: [number, number, number]; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) { ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.02; }
  });
  return (
    <group ref={ref} position={position} rotation={[0, 0, Math.PI]}>
      <mesh><coneGeometry args={[0.02, 0.05, 6]} /><meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} /></mesh>
    </group>
  );
}

function ZoneGlow({ position, dims, colour }: { position: [number, number, number]; dims: [number, number, number]; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={dims} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.15} transparent opacity={0.12} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface CutFillVolumes3DProps {
  cutDepth?: number;
  fillHeight?: number;
  sectionWidth?: number;
  sectionLength?: number;
  cutVolume?: number;
  fillVolume?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function CutFillVolumes3D({
  cutDepth = 3000,
  fillHeight = 2000,
  sectionWidth = 10000,
  sectionLength = 8000,
  cutVolume = 500,
  fillVolume = 350,
  utilisation = 70,
  status = 'PASS',
}: CutFillVolumes3DProps) {
  const s = 1 / 6000;
  const CD = cutDepth * s;
  const FH = fillHeight * s;
  const SW = sectionWidth * s;
  const SL = sectionLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Existing ground (sloping) */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[SW + 0.4, 0.03, SL]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} transparent opacity={0.5} />
      </mesh>

      {/* Formation level (flat) */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[SW + 0.4, 0.015, SL]} />
        <meshStandardMaterial color="#71717a" roughness={0.8} />
      </mesh>

      {/* Cut zone (left side, above formation) */}
      <mesh position={[-SW / 4, CD / 2, 0]}>
        <boxGeometry args={[SW / 2, CD, SL * 0.95]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.2} />
      </mesh>
      <mesh position={[-SW / 4, CD / 2, 0]}>
        <boxGeometry args={[SW / 2, CD, SL * 0.95]} />
        <meshStandardMaterial color="#ef4444" wireframe />
      </mesh>
      <ZoneGlow position={[-SW / 4, CD / 2, 0]} dims={[SW / 2 * 1.02, CD * 1.02, SL * 0.96]} colour="#ef4444" />

      {/* Fill zone (right side, below formation) */}
      <mesh position={[SW / 4, -FH / 2, 0]}>
        <boxGeometry args={[SW / 2, FH, SL * 0.95]} />
        <meshStandardMaterial color="#22c55e" transparent opacity={0.2} />
      </mesh>
      <mesh position={[SW / 4, -FH / 2, 0]}>
        <boxGeometry args={[SW / 2, FH, SL * 0.95]} />
        <meshStandardMaterial color="#22c55e" wireframe />
      </mesh>
      <ZoneGlow position={[SW / 4, -FH / 2, 0]} dims={[SW / 2 * 1.02, FH * 1.02, SL * 0.96]} colour="#22c55e" />

      {/* Animated arrows showing cut/fill direction */}
      <AnimatedCutArrow position={[-SW / 4, CD + 0.05, 0]} colour="#ef4444" />
      <AnimatedCutArrow position={[SW / 4, -FH - 0.05, 0]} colour="#22c55e" />

      {/* Cross-section reference lines */}
      {Array.from({ length: 4 }).map((_, i) => {
        const z = (i - 1.5) * SL * 0.25;
        return (
          <mesh key={`cs${i}`} position={[0, 0.02, z]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.003, SW + 0.2, 0.003]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
          </mesh>
        );
      })}

      {/* Dimension lines */}
      <DimensionLine start={[-SW / 2 - 0.06, 0, SL / 2 + 0.04]} end={[-SW / 2 - 0.06, CD, SL / 2 + 0.04]} color="#ef4444" />
      <Text position={[-SW / 2 - 0.12, CD / 2, SL / 2 + 0.04]} fontSize={0.04} color="#ef4444">
        {`${(cutDepth / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[SW / 2 + 0.06, 0, SL / 2 + 0.04]} end={[SW / 2 + 0.06, -FH, SL / 2 + 0.04]} color="#22c55e" />
      <Text position={[SW / 2 + 0.12, -FH / 2, SL / 2 + 0.04]} fontSize={0.04} color="#22c55e">
        {`${(fillHeight / 1000).toFixed(1)}m`}
      </Text>

      {/* Labels */}
      <Text position={[-SW / 4, CD + 0.12, 0]} fontSize={0.06} color="#ef4444">
        {`CUT ${cutVolume} m³`}
      </Text>
      <Text position={[SW / 4, -FH - 0.12, 0]} fontSize={0.06} color="#22c55e">
        {`FILL ${fillVolume} m³`}
      </Text>
      <Text position={[0, CD + 0.25, 0]} fontSize={0.08} color="#94a3b8">
        Cut/Fill Volumes
      </Text>
      <Text position={[0, CD + 0.38, 0]} fontSize={0.06} color="#f59e0b">
        {`Net: ${cutVolume - fillVolume > 0 ? '+' : ''}${cutVolume - fillVolume} m³ surplus`}
      </Text>

      <mesh position={[SW / 2 + 0.05, CD, SL / 2]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
