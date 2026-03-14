import { Text } from '../BillboardText';

export interface BoltPattern3DProps {
  numBolts?: number;
  boltDiameter?: number;
  rows?: number;
  cols?: number;
  gaugeSpacing?: number;
  pitchSpacing?: number;
  plateWidth?: number;
  plateDepth?: number;
  eccentricity?: number;
  shearForce?: number;
  status?: 'PASS' | 'FAIL';
}

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export interface BoltPattern3DProps {
  numBolts?: number;
  boltDiameter?: number;
  rows?: number;
  cols?: number;
  gaugeSpacing?: number;
  pitchSpacing?: number;
  plateWidth?: number;
  plateDepth?: number;
  eccentricity?: number;
  shearForce?: number;
  status?: 'PASS' | 'FAIL';
  utilisation?: number;
}

/* ── Animated bolt glow ──────────────────────────────────────────────── */
function BoltGlow({ x, y, BR, colour, index }: {
  x: number; y: number; BR: number; colour: string; index: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial;
    if (mat) mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2 + index * 0.5) * 0.25;
  });
  return (
    <mesh ref={ref} position={[x, y, 0.016]}>
      <cylinderGeometry args={[BR * 2.5, BR * 2.5, 0.003, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.25} />
    </mesh>
  );
}

/* ── Animated shear arrow ─────────────────────────────────────────────── */
function AnimatedShearArrow({ x, PD, force, colour }: {
  x: number; PD: number; force: number; colour: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.getElapsedTime() * 2) * 0.01;
  });
  return (
    <group ref={ref} position={[x, 0, 0.01]}>
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.08, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.01, 0.02, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.06, -0.04, 0]} fontSize={0.03} color={colour}>
        {`V = ${force} kN`}
      </Text>
    </group>
  );
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
        <boxGeometry args={[len, 0.003, 0.003]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mid[0], mid[1] + 0.04, mid[2]]} fontSize={0.025} color="#94a3b8">{label}</Text>
    </group>
  );
}

export default function BoltPattern3D({
  numBolts = 6,
  boltDiameter = 20,
  rows = 3,
  cols = 2,
  gaugeSpacing = 100,
  pitchSpacing = 70,
  plateWidth = 300,
  plateDepth = 350,
  eccentricity = 80,
  shearForce = 150,
  status = 'PASS',
  utilisation = 72,
}: BoltPattern3DProps) {
  const s = 1 / 600;
  const PW = plateWidth * s;
  const PD = plateDepth * s;
  const GS = gaugeSpacing * s;
  const PS = pitchSpacing * s;
  const BR = (boltDiameter / 2) * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  let boltIdx = 0;

  return (
    <group>
      {/* Back plate */}
      <mesh position={[0, 0, -0.015]}>
        <boxGeometry args={[PW, PD, 0.015]} />
        <meshStandardMaterial color="#374151" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Front plate */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[PW * 0.8, PD, 0.015]} />
        <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Bolt group with glow */}
      {Array.from({ length: rows }).map((_, ri) => {
        const y = (ri - (rows - 1) / 2) * PS;
        return Array.from({ length: cols }).map((_, ci) => {
          const x = (ci - (cols - 1) / 2) * GS;
          const idx = boltIdx++;
          return (
            <group key={`bolt${ri}-${ci}`} position={[x, y, 0.015]}>
              {/* Glow */}
              <BoltGlow x={0} y={0} BR={BR} colour={colour} index={idx} />
              {/* Bolt shank */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[BR, BR, 0.04, 12]} />
                <meshStandardMaterial color="#1e40af" roughness={0.3} metalness={0.8} />
              </mesh>
              {/* Bolt head */}
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[BR * 1.5, BR * 1.5, 0.005, 6]} />
                <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.8} />
              </mesh>
            </group>
          );
        });
      })}

      {/* Centroid marker */}
      <mesh position={[0, 0, 0.025]}>
        <sphereGeometry args={[0.006, 12, 12]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Centroid cross */}
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[0.03, 0.002, 0.002]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[0.002, 0.03, 0.002]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>

      {/* Animated shear force arrow */}
      <AnimatedShearArrow x={PW / 2 + 0.04} PD={PD} force={shearForce} colour={colour} />

      {/* Eccentricity line */}
      {eccentricity > 0 && (
        <group>
          <mesh position={[eccentricity * s / 2 + PW / 2 + 0.04, 0, 0.025]}>
            <boxGeometry args={[eccentricity * s, 0.002, 0.002]} />
            <meshStandardMaterial color="#a855f7" />
          </mesh>
          <Text position={[PW / 2 + 0.04, 0.025, 0.025]} fontSize={0.025} color="#a855f7">
            {`e = ${eccentricity}mm`}
          </Text>
        </group>
      )}

      {/* Bolt force vectors (simplified ICR method visualization) */}
      {Array.from({ length: rows }).map((_, ri) => {
        const y = (ri - (rows - 1) / 2) * PS;
        return Array.from({ length: cols }).map((_, ci) => {
          const x = (ci - (cols - 1) / 2) * GS;
          const dist = Math.sqrt(x * x + y * y) || 0.01;
          const angle = Math.atan2(-x, y);
          const force = dist * 0.3;
          return (
            <mesh
              key={`fv${ri}-${ci}`}
              position={[x + Math.sin(angle) * force / 2, y + Math.cos(angle) * force / 2, 0.03]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[0.002, force, 0.002]} />
              <meshStandardMaterial color="#22c55e" transparent opacity={0.7} />
            </mesh>
          );
        });
      })}

      {/* Gauge dimension */}
      <DimensionLine
        from={[-(cols - 1) / 2 * GS, -PD / 2 - 0.04, 0.015]}
        to={[(cols - 1) / 2 * GS, -PD / 2 - 0.04, 0.015]}
        offset={[0, -0.02, 0]}
        label={`g = ${gaugeSpacing}mm`}
      />

      {/* Labels */}
      <Text position={[0, PD / 2 + 0.08, 0]} fontSize={0.05} color="#94a3b8">
        {`${rows}×${cols} M${boltDiameter} bolt pattern`}
      </Text>
      <Text position={[0, PD / 2 + 0.16, 0]} fontSize={0.04} color="#94a3b8">
        {`Gauge ${gaugeSpacing}mm, Pitch ${pitchSpacing}mm`}
      </Text>

      <mesh position={[PW / 2 + 0.08, PD / 2, 0]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
