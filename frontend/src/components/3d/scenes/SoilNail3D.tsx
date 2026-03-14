import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function NailTensionGlow({ position, rotation, nl, row, col, status, utilisation }: {
  position: [number, number, number]; rotation: [number, number, number]; nl: number; row: number; col: number; status: string; utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2 + row * 0.7 + col * 0.3) * 0.25;
  });
  return (
    <group position={position} rotation={rotation}>
      {/* Nail bar */}
      <mesh position={[nl / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, nl, 6]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Tension glow around nail */}
      <mesh ref={ref} position={[nl / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, nl * 0.6, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} />
      </mesh>
      {/* Grout zone */}
      <mesh position={[nl * 0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, nl * 0.4, 8]} />
        <meshStandardMaterial color="#9ca3af" transparent opacity={0.3} />
      </mesh>
      {/* Face plate */}
      <mesh position={[-0.02, 0, 0]}>
        <boxGeometry args={[0.02, 0.1, 0.1]} />
        <meshStandardMaterial color="#71717a" metalness={0.8} />
      </mesh>
    </group>
  );
}

function SoilPressureGlow({ position, h, depth, status, utilisation }: { position: [number, number, number]; h: number; depth: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.2 + Math.sin(clock.getElapsedTime() * 1.5) * 0.15;
  });
  return (
    <mesh ref={ref} position={position} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[depth, h]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.2} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dy = end[1] - start[1];
  const dx = end[0] - start[0];
  const len = Math.abs(dy) || Math.abs(dx);
  const vertical = Math.abs(dy) > Math.abs(dx);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={vertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx + (vertical ? 0.06 : 0), my + (vertical ? 0 : 0.04), mz]} fontSize={0.06} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface SoilNail3DProps {
  wallHeight?: number;
  nailLength?: number;
  nailSpacingV?: number;
  nailSpacingH?: number;
  nailAngle?: number;
  numRows?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function SoilNail3D({
  wallHeight = 6000,
  nailLength = 6000,
  nailSpacingV = 1500,
  nailSpacingH = 1500,
  nailAngle = 15,
  numRows = 4,
  utilisation = 70,
  status = 'PASS',
}: SoilNail3DProps) {
  const s = 1 / 2000;
  const H = wallHeight * s;
  const nl = nailLength * s;
  const sv = nailSpacingV * s;
  const sh = nailSpacingH * s;
  const depth = 3 * sh;
  const angleRad = (nailAngle * Math.PI) / 180;
  const nailsPerRow = Math.max(1, Math.floor(depth / sh));
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Soil mass */}
      <mesh position={[nl / 2, H / 2, 0]}>
        <boxGeometry args={[nl + 0.3, H + 0.2, depth + 0.5]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={0.25} />
      </mesh>

      {/* Soil pressure glow on face */}
      <SoilPressureGlow position={[0.04, H / 2, 0]} h={H} depth={depth} status={status} utilisation={utilisation} />

      {/* Shotcrete face */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <boxGeometry args={[0.06, H, depth]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} />
      </mesh>

      {/* Wire mesh on face */}
      <lineSegments position={[0, H / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(0.07, H, depth)]} />
        <lineBasicMaterial color="#666" transparent opacity={0.5} />
      </lineSegments>

      {/* Soil nails with tension glow */}
      {Array.from({ length: numRows }).map((_, row) => {
        const y = (row + 0.5) * sv;
        if (y > H) return null;
        return Array.from({ length: nailsPerRow }).map((_, col) => {
          const z = (col - (nailsPerRow - 1) / 2) * sh;
          return (
            <NailTensionGlow
              key={`${row}-${col}`}
              position={[0, y, z]}
              rotation={[0, 0, -angleRad]}
              nl={nl}
              row={row}
              col={col}
              status={status}
              utilisation={utilisation}
            />
          );
        });
      })}

      {/* Dimension lines */}
      <DimensionLine start={[-0.3, 0, 0]} end={[-0.3, H, 0]} label={`H=${(wallHeight / 1000).toFixed(1)}m`} offset={0} />
      <DimensionLine start={[0, -0.15, 0]} end={[nl, -0.15, 0]} label={`Nail=${(nailLength / 1000).toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[nl / 2, -0.3, 0]} fontSize={0.08} color="#94a3b8">
        {`Spacing ${nailSpacingV}×${nailSpacingH}mm  @${nailAngle}°`}
      </Text>
      <Text position={[-0.3, H + 0.15, 0]} fontSize={0.07} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <mesh position={[-0.15, H + 0.1, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
