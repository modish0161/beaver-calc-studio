import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function BobbingLoadArrow({
  position,
  colour,
}: {
  position: [number, number, number];
  colour: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.008;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.06, 8]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.01, 0.02, 8]} />
        <meshStandardMaterial color={colour} />
      </mesh>
    </group>
  );
}

function BearingGlow({
  position,
  width,
  depth,
  status,
  utilisation,
}: {
  position: [number, number, number];
  width: number;
  depth: number;
  status: string;
  utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        color={colour}
        emissive={colour}
        emissiveIntensity={0.3}
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function MatSettleEffect({
  position,
  index,
  children,
}: {
  position: [number, number, number];
  index: number;
  children?: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y =
      position[1] + Math.sin(clock.getElapsedTime() * 1.5 + index * 0.5) * 0.002;
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

function DimensionLine({
  start,
  end,
  offset = 0.06,
  label,
  colour = '#64748b',
}: {
  start: [number, number, number];
  end: [number, number, number];
  offset?: number;
  label: string;
  colour?: string;
}) {
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

export interface TrackMat3DProps {
  matLength?: number;
  matWidth?: number;
  matThickness?: number;
  numMats?: number;
  appliedLoad?: number;
  bearingPressure?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function TrackMat3D({
  matLength = 5000,
  matWidth = 1000,
  matThickness = 150,
  numMats = 4,
  appliedLoad = 250,
  bearingPressure = 45,
  utilisation = 72,
  status = 'PASS',
}: TrackMat3DProps) {
  const s = 1 / 6000;
  const ML = matLength * s;
  const MW = matWidth * s;
  const MT = matThickness * s;
  const totalW = numMats * (MW + 0.005) - 0.005;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Ground surface */}
      <mesh position={[0, -MT / 2 - 0.005, 0]}>
        <boxGeometry args={[ML * 1.3, 0.006, totalW * 1.4]} />
        <meshStandardMaterial color="#92400e" roughness={0.95} />
      </mesh>

      {/* Bearing pressure glow under mats */}
      <BearingGlow
        position={[0, -MT / 2 - 0.003, 0]}
        width={ML * 1.05}
        depth={totalW * 1.05}
        status={status}
        utilisation={utilisation}
      />

      {/* Track mats laid side by side with settle animation */}
      {Array.from({ length: numMats }).map((_, i) => {
        const z = (i - (numMats - 1) / 2) * (MW + 0.005);
        return (
          <MatSettleEffect key={`mat${i}`} position={[0, 0, z]} index={i}>
            <mesh position={[0, 0, z]}>
              <boxGeometry args={[ML, MT, MW]} />
              <meshStandardMaterial color="#a07850" roughness={0.85} />
            </mesh>
            {/* Timber grain lines */}
            {Array.from({ length: 6 }).map((_, j) => {
              const x = -ML * 0.4 + j * ML * 0.16;
              return (
                <mesh key={`grain${i}-${j}`} position={[x, MT / 2 + 0.001, z]}>
                  <boxGeometry args={[0.002, 0.001, MW * 0.85]} />
                  <meshStandardMaterial color="#8b6f47" />
                </mesh>
              );
            })}
          </MatSettleEffect>
        );
      })}

      {/* Vehicle/load representation */}
      <mesh position={[0, MT + 0.025, 0]}>
        <boxGeometry args={[ML * 0.4, 0.03, totalW * 0.5]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.5} />
      </mesh>

      {/* Animated load arrows */}
      {[-ML * 0.1, ML * 0.1].map((x, i) => (
        <BobbingLoadArrow key={`la${i}`} position={[x, MT + 0.045, 0]} colour="#ef4444" />
      ))}

      {/* Bearing pressure arrows (under mats) */}
      {Array.from({ length: 5 }).map((_, i) => {
        const x = -ML * 0.3 + i * ML * 0.15;
        return (
          <group key={`bp${i}`}>
            <mesh position={[x, -MT / 2 - 0.025, 0]}>
              <cylinderGeometry args={[0.003, 0.003, 0.03, 6]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
            <mesh position={[x, -MT / 2 - 0.01, 0]}>
              <coneGeometry args={[0.007, 0.015, 6]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          </group>
        );
      })}

      {/* Dimension lines */}
      <DimensionLine
        start={[-ML / 2, MT / 2, totalW / 2 + 0.04]}
        end={[ML / 2, MT / 2, totalW / 2 + 0.04]}
        label={`${(matLength / 1000).toFixed(1)}m`}
      />
      <DimensionLine
        start={[ML / 2 + 0.04, MT / 2, -totalW / 2]}
        end={[ML / 2 + 0.04, MT / 2, totalW / 2]}
        label={`${numMats}× ${(matWidth / 1000).toFixed(1)}m`}
      />

      {/* Labels */}
      <Text position={[0, MT + 0.18, 0]} fontSize={0.05} color="#ef4444">
        {`P = ${appliedLoad} kN`}
      </Text>
      <Text position={[0, MT + 0.26, 0]} fontSize={0.05} color="#94a3b8">
        {`${numMats}× mats ${(matLength / 1000).toFixed(1)}m × ${(matWidth / 1000).toFixed(1)}m × ${matThickness}mm`}
      </Text>
      <Text position={[0, -MT / 2 - 0.07, 0]} fontSize={0.04} color="#22c55e">
        {`q = ${bearingPressure} kPa`}
      </Text>
      <Text position={[0, MT + 0.34, 0]} fontSize={0.04} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>

      <mesh position={[ML / 2 + 0.06, MT + 0.1, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
