import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function BoltStressGlow({ position, boltLen, boltRadius, index, status, utilisation }: { position: [number, number, number]; boltLen: number; boltRadius: number; index: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2 + index * 0.7) * 0.3;
  });
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[boltRadius * 1.5, boltRadius * 1.5, boltLen * 1.05, 8]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.25} />
    </mesh>
  );
}

function PulsingLoadArrow({ position, direction }: { position: [number, number, number]; direction: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = position[0] + Math.sin(clock.getElapsedTime() * 2) * 0.015 * direction;
  });
  return (
    <group ref={ref} position={position}>
      <mesh rotation={[0, 0, -Math.PI / 2 * direction]}>
        <coneGeometry args={[0.02, 0.05, 6]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[-0.04 * direction, 0, 0]}>
        <boxGeometry args={[0.06, 0.008, 0.008]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function ShearPlaneGlow({ position, width, depth, status, utilisation }: { position: [number, number, number]; width: number; depth: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.2 + Math.sin(clock.getElapsedTime() * 1.5) * 0.2;
  });
  return (
    <mesh ref={ref} position={position} rotation={[0, 0, 0]}>
      <planeGeometry args={[0.003, depth * 0.85]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.2} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz) || Math.abs(end[1] - start[1]);
  const angle = Math.atan2(dz, dx);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx, my + 0.025, mz]} fontSize={0.03} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface TimberConnection3DProps {
  memberWidth?: number;
  memberDepth?: number;
  boltDiameter?: number;
  numBolts?: number;
  connectionType?: 'single-shear' | 'double-shear';
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function TimberConnection3D({
  memberWidth = 100,
  memberDepth = 200,
  boltDiameter = 12,
  numBolts = 4,
  connectionType = 'double-shear',
  utilisation = 70,
  status = 'PASS',
}: TimberConnection3DProps) {
  const s = 1 / 200;
  const MW = memberWidth * s;
  const MD = memberDepth * s;
  const BD = boltDiameter * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const isDouble = connectionType === 'double-shear';

  const rows = Math.ceil(numBolts / 2);
  const cols = 2;

  return (
    <group>
      {/* Main timber member */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.2, MD, MW]} />
        <meshStandardMaterial color="#d4a574" roughness={0.8} />
      </mesh>

      {/* Shear plane glow indicators */}
      <ShearPlaneGlow position={[0, 0, MW / 2 + 0.005]} width={0.003} depth={MD} status={status} utilisation={utilisation} />
      {isDouble && <ShearPlaneGlow position={[0, 0, -MW / 2 - 0.005]} width={0.003} depth={MD} status={status} utilisation={utilisation} />}

      {/* Side plates (timber or steel) */}
      <mesh position={[0, 0, MW / 2 + 0.02]}>
        <boxGeometry args={[0.6, MD * 0.8, 0.03]} />
        <meshStandardMaterial color={isDouble ? '#71717a' : '#d4a574'} metalness={isDouble ? 0.6 : 0} roughness={isDouble ? 0.3 : 0.8} />
      </mesh>
      {isDouble && (
        <mesh position={[0, 0, -MW / 2 - 0.02]}>
          <boxGeometry args={[0.6, MD * 0.8, 0.03]} />
          <meshStandardMaterial color="#71717a" metalness={0.6} roughness={0.3} />
        </mesh>
      )}

      {/* Bolts with stress glow */}
      {Array.from({ length: rows }).map((_, i) =>
        Array.from({ length: cols }).map((_, j) => {
          const x = (i - (rows - 1) / 2) * 0.12;
          const y = (j - 0.5) * MD * 0.4;
          const totalLen = MW + (isDouble ? 0.1 : 0.06);
          return (
            <group key={`b${i}-${j}`}>
              {/* Bolt stress glow */}
              <BoltStressGlow position={[x, y, 0]} boltLen={totalLen} boltRadius={BD / 2} index={i * cols + j} status={status} utilisation={utilisation} />
              {/* Bolt shaft */}
              <mesh position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[BD / 2, BD / 2, totalLen, 8]} />
                <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Washers */}
              <mesh position={[x, y, totalLen / 2 + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[BD, BD, 0.01, 6]} />
                <meshStandardMaterial color="#71717a" metalness={0.8} />
              </mesh>
              <mesh position={[x, y, -totalLen / 2 - 0.005]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[BD, BD, 0.01, 6]} />
                <meshStandardMaterial color="#71717a" metalness={0.8} />
              </mesh>
            </group>
          );
        })
      )}

      {/* Animated load arrows */}
      <PulsingLoadArrow position={[-0.75, 0, 0]} direction={1} />
      <PulsingLoadArrow position={[0.75, 0, 0]} direction={-1} />

      {/* Dimension lines */}
      <DimensionLine start={[-0.3, -MD / 2 - 0.04, MW / 2 + 0.06]} end={[0.3, -MD / 2 - 0.04, MW / 2 + 0.06]} label={`${numBolts}× M${boltDiameter}`} offset={0} />

      {/* Labels */}
      <Text position={[0, MD / 2 + 0.15, 0]} fontSize={0.08} color="#94a3b8">
        {`${connectionType} timber joint`}
      </Text>
      <Text position={[0, MD / 2 + 0.28, 0]} fontSize={0.06} color="#f59e0b">
        {`${numBolts}× M${boltDiameter} bolts, ${memberWidth}×${memberDepth}`}
      </Text>
      <Text position={[0, MD / 2 + 0.4, 0]} fontSize={0.05} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>

      <mesh position={[0.5, MD / 2 + 0.05, MW / 2]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
