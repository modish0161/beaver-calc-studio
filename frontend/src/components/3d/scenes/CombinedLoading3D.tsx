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

function AnimatedAxialArrow({ D, colour }: { D: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = D / 2 + 0.04 + Math.sin(clock.getElapsedTime() * 2) * 0.015;
  });
  return (
    <group ref={ref} position={[0, D / 2 + 0.04, 0]}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.1, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.015, 0.03, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function SectionGlow({ D, BF, colour }: { D: number; BF: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, 0, BF * 0.2 + 0.003]}>
      <planeGeometry args={[BF * 0.9, D * 0.9]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface CombinedLoading3DProps {
  sectionDepth?: number;
  sectionWidth?: number;
  flangeThickness?: number;
  webThickness?: number;
  axialLoad?: number;
  momentX?: number;
  momentY?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function CombinedLoading3D({
  sectionDepth = 400,
  sectionWidth = 200,
  flangeThickness = 16,
  webThickness = 10,
  axialLoad = 800,
  momentX = 150,
  momentY = 30,
  utilisation = 0.78,
  status = 'PASS',
}: CombinedLoading3DProps) {
  const s = 1 / 800;
  const D = sectionDepth * s;
  const BF = sectionWidth * s;
  const TF = flangeThickness * s;
  const TW = webThickness * s;
  const util = utilisation * 100;
  const colour = status === 'FAIL' ? '#ef4444' : util > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* I-section column */}
      <group>
        {/* Top flange */}
        <mesh position={[0, D / 2 - TF / 2, 0]}>
          <boxGeometry args={[BF, TF, BF * 0.4]} />
          <meshStandardMaterial color="#60a5fa" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Web */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[TW, D - 2 * TF, BF * 0.4]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Bottom flange */}
        <mesh position={[0, -D / 2 + TF / 2, 0]}>
          <boxGeometry args={[BF, TF, BF * 0.4]} />
          <meshStandardMaterial color="#60a5fa" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>

      {/* Section glow — animated */}
      <SectionGlow D={D} BF={BF} colour={colour} />

      {/* Axial load arrow — animated */}
      <AnimatedAxialArrow D={D} colour="#ef4444" />
      <Text position={[0.08, D / 2 + 0.09, 0]} fontSize={0.035} color="#ef4444">
        {`N = ${axialLoad} kN`}
      </Text>

      {/* Moment Mx arrows (bending about major axis) */}
      {[-1, 1].map((side) => (
        <group key={`mx${side}`} position={[BF / 2 + 0.04, side * D * 0.25, 0]}>
          <mesh>
            <boxGeometry args={[0.04, 0.005, 0.005]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[0.02, 0, 0]} rotation={[0, 0, -side * Math.PI / 4]}>
            <coneGeometry args={[0.008, 0.015, 6]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        </group>
      ))}
      <Text position={[BF / 2 + 0.1, 0, 0]} fontSize={0.035} color="#f59e0b">
        {`Mx = ${momentX} kNm`}
      </Text>

      {/* Moment My arrows (bending about minor axis) */}
      {[-1, 1].map((side) => (
        <group key={`my${side}`} position={[side * BF * 0.25, 0, BF * 0.2 + 0.04]}>
          <mesh>
            <boxGeometry args={[0.005, 0.005, 0.04]} />
            <meshStandardMaterial color="#a855f7" />
          </mesh>
          <mesh position={[0, 0, 0.02]} rotation={[side * Math.PI / 4, 0, 0]}>
            <coneGeometry args={[0.008, 0.015, 6]} />
            <meshStandardMaterial color="#a855f7" />
          </mesh>
        </group>
      ))}
      <Text position={[0, 0, BF * 0.2 + 0.1]} fontSize={0.035} color="#a855f7">
        {`My = ${momentY} kNm`}
      </Text>

      {/* Interaction diagram (simplified circle/ellipse) */}
      <group position={[0, -D / 2 - 0.2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1, 0.002, 8, 32]} />
          <meshStandardMaterial color="#6b7280" transparent opacity={0.5} />
        </mesh>
        {/* Utilisation point */}
        <mesh position={[(util / 100) * 0.1, 0, 0]}>
          <sphereGeometry args={[0.008, 12, 12]} />
          <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.6} />
        </mesh>
        <Text position={[0, -0.04, 0]} fontSize={0.03} color="#94a3b8">
          {`Utilisation = ${util.toFixed(0)}%`}
        </Text>
      </group>

      {/* Dimension lines */}
      <DimensionLine start={[-BF / 2 - 0.06, -D / 2, 0]} end={[-BF / 2 - 0.06, D / 2, 0]} color="#38bdf8" />
      <Text position={[-BF / 2 - 0.12, 0, 0]} fontSize={0.03} color="#38bdf8">
        {`${sectionDepth}mm`}
      </Text>

      {/* Labels */}
      <Text position={[0, D / 2 + 0.25, 0]} fontSize={0.06} color="#94a3b8">
        {`Combined Loading: ${sectionDepth}×${sectionWidth} UB`}
      </Text>

      {/* Status indicator */}
      <mesh position={[BF / 2 + 0.15, D / 2 + 0.1, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
