import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface NeedleBeam3DProps {
  beamSpan?: number;
  beamDepth?: number;
  wallThick?: number;
  loadPerNeedle?: number;
  numNeedles?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated load arrows from wall above */
function AnimatedLoadArrow({ x, y }: { x: number; y: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 3 + x * 5) * 0.008;
    ref.current.scale.setScalar(0.9 + Math.sin(clock.getElapsedTime() * 2 + x * 3) * 0.15);
  });
  return (
    <group ref={ref} position={[x, y, 0]}>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.02, 0.05, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.05, 4]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

/** Glow ring around needle beam support point */
function NeedleGlow({ x, z, status, utilisation }: { x: number; z: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.03, 0.005, 6, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.12} />
    </mesh>
  );
}

/** Animated packing stress indicator between beam and wall */
function PackingStress({ z, BD, BS }: { z: number; BD: number; BS: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 1.5 + z * 10) * 0.2;
  });
  return (
    <mesh ref={ref} position={[0, BD + 0.01, z]}>
      <boxGeometry args={[BS * 0.5, 0.02, 0.05]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
    </mesh>
  );
}

/** Dimension line */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2 + 0.04, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0]; const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, start[2]]}>
        <boxGeometry args={[dx !== 0 ? len : 0.003, dy !== 0 ? len : 0.003, 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={mid} fontSize={0.05} color={color}>{label}</Text>
    </group>
  );
}

export default function NeedleBeam3D({
  beamSpan = 3000,
  beamDepth = 305,
  wallThick = 400,
  loadPerNeedle = 50,
  numNeedles = 3,
  utilisation = 50,
  status = 'PASS',
}: NeedleBeam3DProps) {
  const s = 1 / 2000;
  const BS = beamSpan * s;
  const BD = beamDepth * s;
  const WT = wallThick * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';
  const wallH = BS * 0.6;

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[BS + 0.6, 0.04, numNeedles * 0.35 + 0.5]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Masonry wall with brick detail */}
      <mesh position={[0, BD + wallH / 2 + 0.02, 0]}>
        <boxGeometry args={[BS * 0.65, wallH, WT]} />
        <meshStandardMaterial color="#dc8a5a" roughness={0.8} />
      </mesh>
      {/* Brick courses */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`bc${i}`} position={[0, BD + 0.04 + i * wallH / 8, WT / 2 + 0.001]}>
          <boxGeometry args={[BS * 0.65, 0.002, 0.001]} />
          <meshStandardMaterial color="#b87333" />
        </mesh>
      ))}

      {/* Opening being created below wall */}
      <mesh position={[0, BD / 2 + 0.01, 0]}>
        <boxGeometry args={[BS * 0.5, BD * 0.8, WT + 0.02]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.2} />
      </mesh>

      {/* Needle beams with support glows */}
      {Array.from({ length: numNeedles }).map((_, i) => {
        const z = (i - (numNeedles - 1) / 2) * 0.3;
        return (
          <group key={`n${i}`}>
            {/* Needle beam I-section */}
            <mesh position={[0, BD / 2, z]}>
              <boxGeometry args={[BS, BD, 0.06]} />
              <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Left prop */}
            <mesh position={[-BS / 2 + 0.05, BD / 4, z]}>
              <cylinderGeometry args={[0.015, 0.015, BD * 0.4, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} />
            </mesh>
            {/* Right prop */}
            <mesh position={[BS / 2 - 0.05, BD / 4, z]}>
              <cylinderGeometry args={[0.015, 0.015, BD * 0.4, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} />
            </mesh>
            {/* Support glow rings */}
            <NeedleGlow x={-BS / 2 + 0.05} z={z} status={status} utilisation={utilisation} />
            <NeedleGlow x={BS / 2 - 0.05} z={z} status={status} utilisation={utilisation} />
          </group>
        );
      })}

      {/* Animated packing/wedges */}
      {Array.from({ length: numNeedles }).map((_, i) => {
        const z = (i - (numNeedles - 1) / 2) * 0.3;
        return <PackingStress key={`pk${i}`} z={z} BD={BD} BS={BS} />;
      })}

      {/* Animated load arrows from wall above */}
      {[-0.15, 0, 0.15].map((x, i) => (
        <AnimatedLoadArrow key={`la${i}`} x={x} y={BD + wallH + 0.1} />
      ))}

      {/* Dimension: beam span */}
      <DimensionLine
        start={[-BS / 2, -0.06, numNeedles * 0.2]}
        end={[BS / 2, -0.06, numNeedles * 0.2]}
        label={`Span ${(beamSpan / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />
      {/* Dimension: beam depth */}
      <DimensionLine
        start={[BS / 2 + 0.1, 0, 0]}
        end={[BS / 2 + 0.1, BD, 0]}
        label={`${beamDepth}mm`}
      />

      {/* Labels */}
      <Text position={[0, BD + wallH + 0.25, 0]} fontSize={0.08} color="#00d9ff">
        {`Needle Beams`}
      </Text>
      <Text position={[0, BD + wallH + 0.4, 0]} fontSize={0.06} color="#ef4444">
        {`${numNeedles} needles, ${loadPerNeedle} kN each`}
      </Text>

      {/* Status */}
      <mesh position={[BS / 2 + 0.1, BD + wallH + 0.05, WT / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[BS / 2 + 0.1, BD + wallH + 0.13, WT / 2]} fontSize={0.04} color={sc}>
        {status}
      </Text>
    </group>
  );
}
