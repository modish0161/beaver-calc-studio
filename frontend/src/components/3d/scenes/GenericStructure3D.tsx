// =============================================================================
// 3D Scene: Generic Structural Diagram — fallback for calculators without
// a dedicated 3D scene. Shows a parametric box with loads and labels.
// =============================================================================

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
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.003, 0.003, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.008, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.008, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedLoadArrow({ position, colour }: { position: [number, number, number]; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) { ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.04; }
  });
  return (
    <group ref={ref} position={position}>
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

function BodyGlow({ width, height, depth, colour }: { width: number; height: number; depth: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, height / 2 + 0.1, depth / 2 + 0.003]}>
      <planeGeometry args={[width * 0.95, height * 0.95]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

interface GenericStructure3DProps {
  title?: string;
  width?: number;
  height?: number;
  depth?: number;
  load?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function GenericStructure3D({
  title = 'Structure',
  width = 2,
  height = 1.5,
  depth = 1,
  load = 0,
  utilisation = 70,
  status = 'PASS',
}: GenericStructure3DProps) {
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Main body */}
      <mesh position={[0, height / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#4b5563"
          emissive={colour}
          emissiveIntensity={0.08}
          roughness={0.7}
          transparent
          opacity={0.5}
        />
      </mesh>
      <lineSegments position={[0, height / 2 + 0.1, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.5} />
      </lineSegments>

      {/* Body glow */}
      <BodyGlow width={width} height={height} depth={depth} colour={colour} />

      {/* Ground */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[width + 1, 0.1, depth + 1]} />
        <meshStandardMaterial color="#374151" roughness={1} />
      </mesh>

      {/* Load arrow — animated */}
      {load > 0 && (
        <group>
          <AnimatedLoadArrow position={[0, height + 0.5, 0]} colour="#ef4444" />
          <Text position={[0.3, height + 0.8, 0]} fontSize={0.12} color="#ef4444">
            {`${load} kN`}
          </Text>
        </group>
      )}

      {/* Dimension lines */}
      <DimensionLine start={[-width / 2, 0, depth / 2 + 0.15]} end={[width / 2, 0, depth / 2 + 0.15]} color="#38bdf8" />
      <Text position={[0, -0.08, depth / 2 + 0.15]} fontSize={0.08} color="#38bdf8">
        {`${width.toFixed(1)}m`}
      </Text>
      <DimensionLine start={[width / 2 + 0.15, 0.1, 0]} end={[width / 2 + 0.15, height + 0.1, 0]} color="#38bdf8" />
      <Text position={[width / 2 + 0.3, height / 2 + 0.1, 0]} fontSize={0.08} color="#38bdf8">
        {`${height.toFixed(1)}m`}
      </Text>

      {/* Title */}
      <Text position={[0, height + 1.0, 0]} fontSize={0.18} color="#00d9ff" anchorX="center">
        {title}
      </Text>

      {/* Status indicator */}
      <mesh position={[width / 2 + 0.15, height + 0.6, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
