import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function PulsingLoadArrow({ totalD }: { totalD: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = totalD + 0.12 + Math.sin(clock.getElapsedTime() * 2) * 0.015;
    ref.current.children.forEach(child => {
      const m = child as THREE.Mesh;
      if (m.material && (m.material as THREE.MeshStandardMaterial).emissive) {
        (m.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.4 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
      }
    });
  });
  return (
    <group ref={ref} position={[0, totalD + 0.12, 0]}>
      <mesh>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.07, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.018, 0.03, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function ContactGlow({ CW, totalD, colour }: { CW: number; totalD: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[0, totalD + 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[CW + 0.06, CW + 0.06]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PressureWaveLayer({ index, y0, layerD, avgW, topW, botW, CW, depth1s, tanA, appliedLoad, contactWidth, depth1, spreadAngle }: {
  index: number; y0: number; layerD: number; avgW: number; topW: number; botW: number; CW: number; depth1s: number; tanA: number; appliedLoad: number; contactWidth: number; depth1: number; spreadAngle: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const wave = Math.sin(clock.getElapsedTime() * 1.5 - index * 0.8);
    (ref.current.material as THREE.MeshStandardMaterial).opacity = 0.08 + wave * 0.08;
  });
  const colors = ['#d4a574', '#b8956c', '#a07850'];
  return (
    <group>
      <mesh position={[0, y0 + layerD / 2, 0]}>
        <boxGeometry args={[avgW + 0.3, layerD, avgW + 0.3]} />
        <meshStandardMaterial color={colors[index % 3]} transparent opacity={0.35} roughness={0.9} />
      </mesh>
      <mesh ref={ref} position={[0, y0 + layerD / 2, 0]}>
        <boxGeometry args={[avgW, layerD * 0.98, avgW]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.12} wireframe />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`spr${index}${side}`} position={[side * (CW / 2 + (index + 0.5) * depth1s * tanA), y0 + layerD / 2, avgW / 2 + 0.02]}>
          <boxGeometry args={[0.003, layerD, 0.003]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      ))}
      <Text position={[avgW / 2 + 0.15, y0 + 0.02, 0]} fontSize={0.04} color="#f59e0b">
        {`${(appliedLoad / Math.pow((contactWidth + 2 * (index + 1) * depth1 * Math.tan((spreadAngle * Math.PI) / 180)) / 1000, 2)).toFixed(0)} kPa`}
      </Text>
    </group>
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

export interface LoadSpread3DProps {
  appliedLoad?: number;
  contactWidth?: number;
  depth1?: number;
  depth2?: number;
  spreadAngle?: number;
  numLayers?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function LoadSpread3D({
  appliedLoad = 200,
  contactWidth = 600,
  depth1 = 300,
  depth2 = 300,
  spreadAngle = 26.6,
  numLayers = 3,
  utilisation = 0,
  status = 'PASS',
}: LoadSpread3DProps) {
  const s = 1 / 1500;
  const CW = contactWidth * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const tanA = Math.tan((spreadAngle * Math.PI) / 180);
  const totalD = numLayers * depth1 * s;

  return (
    <group>
      {/* Contact pad / footing */}
      <mesh position={[0, totalD + 0.02, 0]}>
        <boxGeometry args={[CW, 0.04, CW]} />
        <meshStandardMaterial color="#6b7280" roughness={0.6} />
      </mesh>

      {/* Contact glow */}
      <ContactGlow CW={CW} totalD={totalD} colour={colour} />

      {/* Pulsing load arrow */}
      <PulsingLoadArrow totalD={totalD} />

      {/* Soil layers with animated pressure wave */}
      {Array.from({ length: numLayers }).map((_, i) => {
        const y0 = (numLayers - i - 1) * depth1 * s;
        const layerD = depth1 * s;
        const topW = CW + i * depth1 * s * tanA * 2;
        const botW = CW + (i + 1) * depth1 * s * tanA * 2;
        const avgW = (topW + botW) / 2;
        return (
          <PressureWaveLayer
            key={`lay${i}`}
            index={i}
            y0={y0}
            layerD={layerD}
            avgW={avgW}
            topW={topW}
            botW={botW}
            CW={CW}
            depth1s={depth1 * s}
            tanA={tanA}
            appliedLoad={appliedLoad}
            contactWidth={contactWidth}
            depth1={depth1}
            spreadAngle={spreadAngle}
          />
        );
      })}

      {/* Dimension lines */}
      <DimensionLine
        start={[-(CW / 2 + totalD * tanA) - 0.1, 0, 0]}
        end={[-(CW / 2 + totalD * tanA) - 0.1, totalD, 0]}
        label={`D ${(numLayers * depth1 / 1000).toFixed(1)}m`}
        offset={-0.08}
      />
      <DimensionLine
        start={[-CW / 2, totalD + 0.06, 0]}
        end={[CW / 2, totalD + 0.06, 0]}
        label={`${contactWidth}mm`}
        offset={0}
      />

      {/* Labels */}
      <Text position={[0, totalD + 0.25, 0]} fontSize={0.06} color="#ef4444">
        {`P = ${appliedLoad} kN`}
      </Text>
      <Text position={[0, totalD + 0.36, 0]} fontSize={0.06} color="#94a3b8">
        {`${spreadAngle}° spread through ${numLayers} layers`}
      </Text>

      {/* Status */}
      <mesh position={[CW / 2 + 0.2 + totalD * tanA, totalD + 0.15, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[CW / 2 + 0.2 + totalD * tanA, totalD + 0.22, 0]} fontSize={0.04} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
