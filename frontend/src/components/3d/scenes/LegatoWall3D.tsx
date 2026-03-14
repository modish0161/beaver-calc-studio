import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function SettlingBlock({ position, size, hue, pinPositions }: {
  position: [number, number, number];
  size: [number, number, number];
  hue: number;
  pinPositions: [number, number][];
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.3 + position[0] * 5) * 0.001;
  });
  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={`hsl(${hue}, 10%, 60%)`} roughness={0.9} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color="#888" transparent opacity={0.5} />
      </lineSegments>
      {pinPositions.map(([px, py], k) => (
        <mesh key={k} position={[px, py, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 8]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
    </group>
  );
}

function EarthPressureArrows({ wallH, wallW, colour }: { wallH: number; wallW: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.3 + Math.sin(clock.getElapsedTime() * 2 + i * 0.5) * 0.3;
      }
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 5 }).map((_, i) => {
        const y = wallH * (0.15 + i * 0.18);
        const arrowLen = 0.05 + i * 0.03;
        return (
          <mesh key={i} position={[wallW / 2 + arrowLen / 2 + 0.05, y, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.012, arrowLen, 6]} />
            <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

function GlowBase({ wallW, wallH, colour }: { wallW: number; wallH: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[wallW + 0.1, 0.6]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} transparent opacity={0.3} side={THREE.DoubleSide} />
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
      <Text position={[mx + offset + 0.08, my, mz]} fontSize={0.05} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface LegatoWall3DProps {
  wallHeight?: number;
  blockLength?: number;
  blockHeight?: number;
  blockDepth?: number;
  numCourses?: number;
  numBlocksPerCourse?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function LegatoWall3D({
  wallHeight = 2400,
  blockLength = 1600,
  blockHeight = 800,
  blockDepth = 800,
  numCourses = 3,
  numBlocksPerCourse = 4,
  utilisation = 0,
  status = 'PASS',
}: LegatoWall3DProps) {
  const s = 1 / 1500;
  const bl = blockLength * s;
  const bh = blockHeight * s;
  const bd = blockDepth * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const wallW = numBlocksPerCourse * bl;

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[wallW * 1.2, 0.1, bd + 1]} />
        <meshStandardMaterial color="#5c4033" roughness={1} />
      </mesh>

      {/* Animated glow base */}
      <GlowBase wallW={wallW} wallH={numCourses * bh} colour={colour} />

      {/* Legato blocks with subtle settling animation */}
      {Array.from({ length: numCourses }).map((_, row) => {
        const stagger = row % 2 === 1 ? bl / 2 : 0;
        return Array.from({ length: numBlocksPerCourse }).map((_, col) => {
          const x = (col - (numBlocksPerCourse - 1) / 2) * bl + stagger;
          const y = row * bh + bh / 2;
          const hue = 35 + (row * 3 + col * 2) % 10;
          return (
            <SettlingBlock
              key={`${row}-${col}`}
              position={[x, y, 0]}
              size={[bl * 0.96, bh * 0.96, bd]}
              hue={hue}
              pinPositions={[[-bl * 0.25, bh * 0.48], [bl * 0.25, bh * 0.48]]}
            />
          );
        });
      })}

      {/* Animated earth pressure arrows */}
      <EarthPressureArrows wallH={numCourses * bh} wallW={wallW / 2} colour="#3b82f6" />

      {/* Dimension lines */}
      <DimensionLine
        start={[-wallW / 2 - 0.12, 0, 0]}
        end={[-wallW / 2 - 0.12, numCourses * bh, 0]}
        label={`H ${(wallHeight / 1000).toFixed(1)}m`}
        offset={-0.1}
      />
      <DimensionLine
        start={[-wallW / 2, numCourses * bh + 0.08, 0]}
        end={[wallW / 2, numCourses * bh + 0.08, 0]}
        label={`${numBlocksPerCourse} blocks`}
        offset={0}
      />

      {/* Labels */}
      <Text position={[0, numCourses * bh + 0.2, 0]} fontSize={0.1} color="#94a3b8">
        {`${numCourses} courses = ${(wallHeight / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[0, -0.2, 0]} fontSize={0.09} color="#94a3b8">
        {`${numBlocksPerCourse} blocks × ${(blockLength / 1000).toFixed(1)}m`}
      </Text>

      {/* Status */}
      <mesh position={[-(numBlocksPerCourse * bl) / 2 - 0.15, numCourses * bh, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[-(numBlocksPerCourse * bl) / 2 - 0.15, numCourses * bh + 0.1, 0]} fontSize={0.05} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
