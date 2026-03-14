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

function LayerPulse({ position, width, depth, colour, index }: { position: [number, number, number]; width: number; depth: number; colour: string; index: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + Math.sin(clock.getElapsedTime() * 2 + index * 0.6) * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={[position[0], position[1] + 0.006, position[2] + depth / 2 + 0.003]}>
      <planeGeometry args={[width * 0.9, 0.015]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.2} transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

function FacingGlow({ x, height, depth, colour }: { x: number; height: number; depth: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[x - 0.07, height / 2, depth / 2 + 0.003]}>
      <planeGeometry args={[0.15, height * 0.95]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface GRSWall3DProps {
  wallHeight?: number;
  reinforcementLength?: number;
  reinforcementSpacing?: number;
  numLayers?: number;
  facingType?: 'block' | 'wrap';
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function GRSWall3D({
  wallHeight = 4000,
  reinforcementLength = 4000,
  reinforcementSpacing = 600,
  numLayers = 6,
  facingType = 'block',
  utilisation = 72,
  status = 'PASS',
}: GRSWall3DProps) {
  const s = 1 / 1500;
  const H = wallHeight * s;
  const rl = reinforcementLength * s;
  const rs = reinforcementSpacing * s;
  const depth = 2;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[rl + 1, 0.1, depth + 1]} />
        <meshStandardMaterial color="#5c4033" roughness={1} />
      </mesh>

      {/* Reinforced soil mass */}
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[rl, H, depth]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={0.25} />
      </mesh>

      {/* Geosynthetic reinforcement layers with pulse glow */}
      {Array.from({ length: numLayers }).map((_, i) => {
        const y = (i + 1) * rs;
        if (y > H) return null;
        return (
          <group key={i}>
            <mesh position={[0, y, 0]}>
              <boxGeometry args={[rl, 0.01, depth]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} transparent opacity={0.7} />
            </mesh>
            <LayerPulse position={[0, y, 0]} width={rl} depth={depth} colour={colour} index={i} />
          </group>
        );
      })}

      {/* Facing */}
      {facingType === 'block' ? (
        Array.from({ length: Math.ceil(H / 0.15) }).map((_, i) => {
          const y = i * 0.15 + 0.075;
          if (y > H) return null;
          return (
            <mesh key={i} position={[-rl / 2, y, 0]} castShadow>
              <boxGeometry args={[0.12, 0.14, depth]} />
              <meshStandardMaterial color="#a1a1aa" roughness={0.8} />
            </mesh>
          );
        })
      ) : (
        <mesh position={[-rl / 2, H / 2, 0]}>
          <boxGeometry args={[0.06, H, depth]} />
          <meshStandardMaterial color="#16a34a" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Facing glow */}
      <FacingGlow x={-rl / 2} height={H} depth={depth} colour={colour} />

      {/* Dimension lines */}
      <DimensionLine start={[-rl / 2, 0, depth / 2 + 0.2]} end={[rl / 2, 0, depth / 2 + 0.2]} color="#38bdf8" />
      <Text position={[0, -0.08, depth / 2 + 0.2]} fontSize={0.08} color="#38bdf8">
        {`L = ${(reinforcementLength / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[rl / 2 + 0.15, 0, 0]} end={[rl / 2 + 0.15, H, 0]} color="#38bdf8" />
      <Text position={[rl / 2 + 0.3, H / 2, 0]} fontSize={0.08} color="#38bdf8">
        {`H = ${(wallHeight / 1000).toFixed(1)}m`}
      </Text>

      {/* Labels */}
      <Text position={[0, -0.25, 0]} fontSize={0.09} color="#94a3b8">
        {`GRS Wall — ${facingType} facing`}
      </Text>
      <Text position={[rl / 2 + 0.15, H / 2 + 0.2, 0]} fontSize={0.07} color="#22c55e">
        {`${numLayers} layers @ ${reinforcementSpacing}mm`}
      </Text>

      {/* Status indicator */}
      <mesh position={[-rl / 2, H + 0.1, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
