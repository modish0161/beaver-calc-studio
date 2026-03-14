import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface CantileverWall3DProps {
  wallHeight?: number;
  wallThickness?: number;
  baseWidth?: number;
  baseThick?: number;
  toeLength?: number;
  heelLength?: number;
  soilPressure?: number;
  status?: 'PASS' | 'FAIL';
  utilisation?: number;
}

/* ── Dimension line helper ───────────────────────────────────────────── */
function DimensionLine({ from, to, offset = [0, 0, 0], label }: {
  from: [number, number, number]; to: [number, number, number];
  offset?: [number, number, number]; label: string;
}) {
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2 + offset[0],
    (from[1] + to[1]) / 2 + offset[1],
    (from[2] + to[2]) / 2 + offset[2],
  ];
  const len = Math.sqrt(
    (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2,
  );
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <group>
      <mesh position={mid} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.008, 0.008]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mid[0], mid[1] + 0.1, mid[2]]} fontSize={0.09} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── Animated soil pressure arrow ─────────────────────────────────────── */
function AnimatedPressureArrow({ x, y, arrowLen, colour, index }: {
  x: number; y: number; arrowLen: number; colour: string; index: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.x = 1 + Math.sin(clock.getElapsedTime() * 2 + index * 0.5) * 0.15;
  });
  return (
    <group ref={ref} position={[x + arrowLen / 2 + 0.05, y, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, arrowLen, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-arrowLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.08, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/* ── Stem glow ────────────────────────────────────────────────────────── */
function WallGlow({ x, y, h, d, colour }: {
  x: number; y: number; h: number; d: number; colour: string;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial;
    if (mat) mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={[x - 0.01, y, d / 2 + 0.01]}>
      <planeGeometry args={[0.02, h]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function CantileverWall3D({
  wallHeight = 4000,
  wallThickness = 400,
  baseWidth = 3000,
  baseThick = 500,
  toeLength = 600,
  heelLength = 2000,
  soilPressure = 35,
  status = 'PASS',
  utilisation = 74,
}: CantileverWall3DProps) {
  const s = 1 / 1200;
  const H = wallHeight * s;
  const tw = wallThickness * s;
  const Bw = baseWidth * s;
  const tb = baseThick * s;
  const toe = toeLength * s;
  const heel = heelLength * s;
  const depth = 2;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  const stemX = -Bw / 2 + toe + tw / 2;

  return (
    <group>
      {/* Ground behind wall */}
      <mesh position={[-toe + Bw / 2 - tw / 2, H / 2, 0]}>
        <boxGeometry args={[heel + 0.3, H, depth]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={0.35} />
      </mesh>
      {/* Base slab */}
      <mesh position={[0, tb / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[Bw, tb, depth]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>
      {/* Stem wall */}
      <mesh position={[stemX, tb + H / 2, 0]} castShadow>
        <boxGeometry args={[tw, H, depth]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>

      {/* Wall status glow */}
      <WallGlow x={stemX - tw / 2} y={tb + H / 2} h={H} d={depth} colour={colour} />

      {/* Animated soil pressure arrows */}
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac, i) => (
        <AnimatedPressureArrow
          key={i}
          x={stemX + tw / 2}
          y={tb + H * frac}
          arrowLen={frac * 0.6}
          colour="#f59e0b"
          index={i}
        />
      ))}

      {/* Height dimension */}
      <DimensionLine
        from={[-Bw / 2 - 0.3, tb, depth / 2 + 0.2]}
        to={[-Bw / 2 - 0.3, tb + H, depth / 2 + 0.2]}
        offset={[0, 0, 0]}
        label={`H = ${(wallHeight / 1000).toFixed(1)}m`}
      />
      {/* Base width dimension */}
      <DimensionLine
        from={[-Bw / 2, -0.1, depth / 2 + 0.2]}
        to={[Bw / 2, -0.1, depth / 2 + 0.2]}
        offset={[0, 0, 0]}
        label={`Base = ${(baseWidth / 1000).toFixed(1)}m`}
      />

      {/* Labels */}
      <Text position={[stemX + tw + 0.8, tb + H * 0.5, depth / 2 + 0.2]} fontSize={0.1} color="#f59e0b">
        {`Ka·γ·H = ${soilPressure} kPa`}
      </Text>
      {/* Status indicator */}
      <mesh position={[Bw / 2 + 0.15, tb + H, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
