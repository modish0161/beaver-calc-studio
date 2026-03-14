// =============================================================================
// 3D Scene: Load Combinations — Bar chart of ULS & SLS combinations
// BS EN 1990 Eurocode Basis of Structural Design
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface LoadCombinations3DProps {
  governingULS?: number;
  governingSLS?: number;
  uls6_10?: number;
  uls6_10a?: number;
  uls6_10b?: number;
  slsCharacteristic?: number;
  slsFrequent?: number;
  slsQuasiPermanent?: number;
  permanentLoad?: number;
  status?: 'PASS' | 'FAIL';
}

// ─── Animated bar ───────────────────────────────────────────────────────────
function Bar({ position, width, depth, targetHeight, color, label, value }: {
  position: [number, number, number];
  width: number;
  depth: number;
  targetHeight: number;
  color: string;
  label: string;
  value: string;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const currentH = useRef(0.01);

  useFrame(() => {
    if (ref.current) {
      currentH.current += (targetHeight - currentH.current) * 0.05;
      ref.current.scale.y = Math.max(0.01, currentH.current);
      ref.current.position.y = currentH.current / 2;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref} castShadow>
        <boxGeometry args={[width, 1, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.4}
          roughness={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Label below */}
      <Text position={[0, -0.2, depth / 2 + 0.15]} fontSize={0.1} color="#94a3b8" anchorY="top">
        {label}
      </Text>
      {/* Value on top */}
      <Text position={[0, targetHeight + 0.15, 0]} fontSize={0.11} color={color}>
        {value}
      </Text>
    </group>
  );
}

// ─── Ground plane ───────────────────────────────────────────────────────────
function Ground() {
  return (
    <mesh position={[0, -0.03, 0]} receiveShadow>
      <boxGeometry args={[8, 0.06, 5]} />
      <meshStandardMaterial color="#1a1f3a" roughness={1} />
    </mesh>
  );
}

// ─── Governing indicator ────────────────────────────────────────────────────
function GoverningMarker({ position, height }: { position: [number, number, number]; height: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = height + 0.35 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// =============================================================================
// Main Component
// =============================================================================
export default function LoadCombinations3D({
  governingULS = 200,
  governingSLS = 150,
  uls6_10 = 190,
  uls6_10a = 180,
  uls6_10b = 200,
  slsCharacteristic = 150,
  slsFrequent = 120,
  slsQuasiPermanent = 100,
  permanentLoad = 100,
}: LoadCombinations3DProps) {
  // Scale bars to fit scene (max bar height ~3 units)
  const allVals = [uls6_10, uls6_10a, uls6_10b, slsCharacteristic, slsFrequent, slsQuasiPermanent, permanentLoad];
  const maxVal = Math.max(...allVals, 1);
  const scale = 3 / maxVal;

  const barWidth = 0.4;
  const barDepth = 0.5;
  const gap = 0.65;

  // Find governing ULS bar
  const ulsBars = [
    { val: uls6_10, label: '6.10', color: '#ef4444' },
    { val: uls6_10a, label: '6.10a', color: '#f97316' },
    { val: uls6_10b, label: '6.10b', color: '#a855f7' },
  ];
  const governingIdx = ulsBars.reduce((gi, b, i) => b.val > ulsBars[gi].val ? i : gi, 0);

  const slsBars = useMemo(() => [
    { val: slsCharacteristic, label: 'Char', color: '#3b82f6' },
    { val: slsFrequent, label: 'Freq', color: '#06b6d4' },
    { val: slsQuasiPermanent, label: 'QP', color: '#22d3ee' },
  ], [slsCharacteristic, slsFrequent, slsQuasiPermanent]);

  // Permanent load bar
  const permX = -3;
  const ulsStartX = -1.3;
  const slsStartX = 1.3;

  return (
    <group position={[0, 0, 0]}>
      <Ground />

      {/* Permanent load bar */}
      <Bar
        position={[permX, 0, 0]}
        width={barWidth}
        depth={barDepth}
        targetHeight={permanentLoad * scale}
        color="#64748b"
        label="G_k"
        value={`${permanentLoad.toFixed(0)} kN`}
      />

      {/* ULS bars */}
      {ulsBars.map((b, i) => (
        <group key={`uls-${i}`}>
          <Bar
            position={[ulsStartX + i * gap, 0, 0]}
            width={barWidth}
            depth={barDepth}
            targetHeight={b.val * scale}
            color={b.color}
            label={b.label}
            value={`${b.val.toFixed(0)} kN`}
          />
          {i === governingIdx && (
            <GoverningMarker
              position={[ulsStartX + i * gap, 0, 0]}
              height={b.val * scale}
            />
          )}
        </group>
      ))}

      {/* SLS bars */}
      {slsBars.map((b, i) => (
        <Bar
          key={`sls-${i}`}
          position={[slsStartX + i * gap, 0, 0]}
          width={barWidth}
          depth={barDepth}
          targetHeight={b.val * scale}
          color={b.color}
          label={b.label}
          value={`${b.val.toFixed(0)} kN`}
        />
      ))}

      {/* Section labels */}
      <Text position={[permX, -0.5, 0]} fontSize={0.14} color="#64748b">
        Permanent
      </Text>
      <Text position={[ulsStartX + gap, -0.5, 0]} fontSize={0.14} color="#ef4444">
        ULS
      </Text>
      <Text position={[slsStartX + gap, -0.5, 0]} fontSize={0.14} color="#3b82f6">
        SLS
      </Text>

      {/* Title */}
      <Text position={[0, 3.8, 0]} fontSize={0.16} color="#94a3b8">
        Load Combinations — BS EN 1990
      </Text>

      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={0.7} castShadow />
      <pointLight position={[-3, 3, 3]} intensity={0.3} color="#a855f7" />
    </group>
  );
}
