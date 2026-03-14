import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function StudGlow({ position, radius, height, index, status, utilisation }: { position: [number, number, number]; radius: number; height: number; index: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2 + index * 0.5) * 0.25;
  });
  return (
    <mesh ref={ref} position={position}>
      <cylinderGeometry args={[radius * 1.6, radius * 1.6, height * 1.1, 10]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} />
    </mesh>
  );
}

function ShearFlowArrow({ position, index }: { position: [number, number, number]; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = position[0] + Math.sin(clock.getElapsedTime() * 3 + index * 0.7) * 0.008;
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <boxGeometry args={[0.03, 0.003, 0.003]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.015, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.005, 0.01, 6]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const vertical = Math.abs(dy) > Math.abs(dx);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={vertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx + (vertical ? 0.08 : 0), my + (vertical ? 0 : 0.04), mz]} fontSize={0.05} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface ShearStuds3DProps {
  beamLength?: number;
  beamDepth?: number;
  flangeWidth?: number;
  slabDepth?: number;
  studDiameter?: number;
  studHeight?: number;
  numStuds?: number;
  studSpacing?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function ShearStuds3D({
  beamLength = 8000,
  beamDepth = 400,
  flangeWidth = 200,
  slabDepth = 150,
  studDiameter = 19,
  studHeight = 100,
  numStuds = 24,
  studSpacing = 300,
  utilisation = 68,
  status = 'PASS',
}: ShearStuds3DProps) {
  const s = 1 / 6000;
  const L = beamLength * s;
  const D = beamDepth * s;
  const FW = flangeWidth * s;
  const SD = slabDepth * s;
  const STH = studHeight * s;
  const STR = (studDiameter / 2) * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const visStuds = Math.min(numStuds, 16);

  return (
    <group>
      {/* Steel beam (I-section simplified) */}
      <mesh position={[0, D / 2, 0]}>
        <boxGeometry args={[L, D, FW * 0.5]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.4} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Top flange */}
      <mesh position={[0, D - 0.005, 0]}>
        <boxGeometry args={[L, 0.01, FW]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Bottom flange */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[L, 0.01, FW]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Concrete slab */}
      <mesh position={[0, D + SD / 2, 0]}>
        <boxGeometry args={[L * 1.05, SD, FW * 3]} />
        <meshStandardMaterial color="#9ca3af" transparent opacity={0.35} roughness={0.8} />
      </mesh>

      {/* Shear studs with glow */}
      {Array.from({ length: visStuds }).map((_, i) => {
        const x = -L * 0.44 + i * (L * 0.88 / (visStuds - 1));
        return (
          <group key={`stud${i}`}>
            <StudGlow position={[x, D + STH / 2, 0]} radius={STR} height={STH} index={i} status={status} utilisation={utilisation} />
            {/* Stud shank */}
            <mesh position={[x, D + STH / 2, 0]}>
              <cylinderGeometry args={[STR, STR, STH, 10]} />
              <meshStandardMaterial color="#1e40af" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Stud head */}
            <mesh position={[x, D + STH, 0]}>
              <cylinderGeometry args={[STR * 1.8, STR * 1.8, STR, 10]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        );
      })}

      {/* Animated shear flow arrows along interface */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -L * 0.3 + i * L * 0.12;
        return <ShearFlowArrow key={`sf${i}`} position={[x, D - 0.005, FW * 1.5 + 0.02]} index={i} />;
      })}

      {/* Supports */}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`sup${i}`} position={[x, -0.02, 0]}>
          <cylinderGeometry args={[0.02, 0.03, 0.03, 3]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}

      {/* Dimension lines */}
      <DimensionLine start={[-L / 2, -0.08, FW * 1.5 + 0.1]} end={[L / 2, -0.08, FW * 1.5 + 0.1]} label={`L=${(beamLength / 1000).toFixed(1)}m`} offset={0} />
      <DimensionLine start={[L / 2 + 0.1, 0, 0]} end={[L / 2 + 0.1, D + SD, 0]} label={`D=${beamDepth + slabDepth}mm`} offset={0} />

      {/* Labels */}
      <Text position={[0, D + SD + 0.12, 0]} fontSize={0.06} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <Text position={[0, D + SD + 0.2, 0]} fontSize={0.05} color="#1e40af">
        {`${numStuds}× Ø${studDiameter} studs @ ${studSpacing}mm`}
      </Text>

      <mesh position={[L / 2 + 0.06, D + SD / 2, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
