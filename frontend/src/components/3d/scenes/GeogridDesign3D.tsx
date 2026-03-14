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

function AnimatedPressureArrow({ y, arrowLen, extLen, colour, index }: { y: number; arrowLen: number; extLen: number; colour: string; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = -0.04 - arrowLen / 2 + Math.sin(clock.getElapsedTime() * 2.5 + index * 0.5) * 0.01;
  });
  return (
    <group>
      <group ref={ref}>
        <mesh position={[-0.04 - arrowLen / 2, y, extLen / 2 + 0.05]}>
          <boxGeometry args={[arrowLen, 0.005, 0.005]} />
          <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
        </mesh>
      </group>
      <mesh position={[-0.04, y, extLen / 2 + 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.01, 0.02, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function LayerGlow({ RL, y, extLen, colour }: { RL: number; y: number; extLen: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={[RL / 2 + 0.02, y, extLen / 2 + 0.003]}>
      <planeGeometry args={[RL * 0.95, 0.02]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.2} transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface GeogridDesign3DProps {
  wallHeight?: number;
  reinforcementLength?: number;
  numLayers?: number;
  layerSpacing?: number;
  tensileStrength?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function GeogridDesign3D({
  wallHeight = 4000,
  reinforcementLength = 5000,
  numLayers = 6,
  layerSpacing = 600,
  tensileStrength = 40,
  utilisation = 72,
  status = 'PASS',
}: GeogridDesign3DProps) {
  const s = 1 / 3000;
  const WH = wallHeight * s;
  const RL = reinforcementLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const extLen = 1.0;

  return (
    <group>
      {/* Foundation soil */}
      <mesh position={[RL / 2, -0.04, 0]}>
        <boxGeometry args={[RL + 0.4, 0.06, extLen + 0.2]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Reinforced fill body */}
      <mesh position={[RL / 2, WH / 2, 0]}>
        <boxGeometry args={[RL, WH, extLen]} />
        <meshStandardMaterial color="#d4a574" transparent opacity={0.35} roughness={0.9} />
      </mesh>

      {/* Wall facing */}
      <mesh position={[0, WH / 2, 0]}>
        <boxGeometry args={[0.04, WH, extLen]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>

      {/* Geogrid layers with glow */}
      {Array.from({ length: numLayers }).map((_, i) => {
        const y = (i + 0.5) * (WH / numLayers);
        return (
          <group key={`gl${i}`}>
            {/* Grid sheet */}
            <mesh position={[RL / 2 + 0.02, y, 0]}>
              <boxGeometry args={[RL, 0.004, extLen * 0.95]} />
              <meshStandardMaterial color="#22c55e" transparent opacity={0.6} />
            </mesh>
            {/* Grid pattern lines (longitudinal) */}
            {Array.from({ length: 5 }).map((_, j) => {
              const z = (j - 2) * extLen * 0.2;
              return (
                <mesh key={`gln${i}-${j}`} position={[RL / 2 + 0.02, y + 0.003, z]}>
                  <boxGeometry args={[RL, 0.002, 0.003]} />
                  <meshStandardMaterial color="#16a34a" />
                </mesh>
              );
            })}
            <LayerGlow RL={RL} y={y} extLen={extLen} colour={colour} />
          </group>
        );
      })}

      {/* Soil pressure arrows — animated */}
      {Array.from({ length: 4 }).map((_, i) => {
        const y = (i + 0.5) * WH / 4;
        const arrowLen = 0.05 + (1 - i / 4) * 0.08;
        return <AnimatedPressureArrow key={`sp${i}`} y={y} arrowLen={arrowLen} extLen={extLen} colour="#3b82f6" index={i} />;
      })}

      {/* Dimension lines */}
      <DimensionLine start={[0, -0.1, extLen / 2 + 0.15]} end={[RL, -0.1, extLen / 2 + 0.15]} color="#38bdf8" />
      <Text position={[RL / 2, -0.18, extLen / 2 + 0.15]} fontSize={0.06} color="#38bdf8">
        {`L = ${(reinforcementLength / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[RL + 0.12, 0, 0]} end={[RL + 0.12, WH, 0]} color="#38bdf8" />
      <Text position={[RL + 0.25, WH / 2, 0]} fontSize={0.06} color="#38bdf8">
        {`H = ${(wallHeight / 1000).toFixed(1)}m`}
      </Text>

      {/* Labels */}
      <Text position={[RL / 2, WH + 0.15, 0]} fontSize={0.07} color="#94a3b8">
        {`Geogrid reinforced wall ${(wallHeight / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[RL / 2, WH + 0.28, 0]} fontSize={0.06} color="#22c55e">
        {`${numLayers} layers @ ${layerSpacing}mm, L = ${(reinforcementLength / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[RL / 2, WH + 0.4, 0]} fontSize={0.05} color="#f59e0b">
        {`T_design = ${tensileStrength} kN/m`}
      </Text>

      {/* Status indicator */}
      <mesh position={[RL + 0.05, WH, extLen / 2]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
