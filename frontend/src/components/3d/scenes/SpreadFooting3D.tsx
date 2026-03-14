import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function PulsingLoadArrow({ position, load, moment }: { position: [number, number, number]; load: number; moment: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.03;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.1, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.4, 0.35, 0]} fontSize={0.1} color="#ef4444">
        {`N=${load}kN  M=${moment}kNm`}
      </Text>
    </group>
  );
}

function BearingGlow({ position, width, depth, status, utilisation }: { position: [number, number, number]; width: number; depth: number; status: string; utilisation: number }) {
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
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.25} side={THREE.DoubleSide} />
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
      <Text position={[mx, my + 0.03, mz]} fontSize={0.06} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface SpreadFooting3DProps {
  footingLength?: number;
  footingWidth?: number;
  footingDepth?: number;
  pedestalWidth?: number;
  pedestalHeight?: number;
  load?: number;
  moment?: number;
  bearingPressure?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function SpreadFooting3D({
  footingLength = 2500,
  footingWidth = 2500,
  footingDepth = 700,
  pedestalWidth = 500,
  pedestalHeight = 800,
  load = 800,
  moment = 120,
  bearingPressure = 180,
  utilisation = 68,
  status = 'PASS',
}: SpreadFooting3DProps) {
  const s = 1 / 1200;
  const FL = footingLength * s;
  const FW = footingWidth * s;
  const FD = footingDepth * s;
  const PW = pedestalWidth * s;
  const PH = pedestalHeight * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Soil */}
      <mesh position={[0, -FD - 0.1, 0]} receiveShadow>
        <boxGeometry args={[FL + 2, 0.2, FW + 2]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>

      {/* Bearing glow */}
      <BearingGlow position={[0, -FD + 0.03, 0]} width={FL * 0.95} depth={FW * 0.95} status={status} utilisation={utilisation} />

      {/* Trapezoidal bearing pressure (linear variation) */}
      <group position={[0, -FD + 0.02, 0]}>
        <mesh position={[-FL * 0.15, 0, 0]}>
          <boxGeometry args={[FL * 0.7, 0.015, FW * 0.9]} />
          <meshStandardMaterial color="#f59e0b" transparent opacity={0.4} />
        </mesh>
        <mesh position={[FL * 0.25, 0, 0]}>
          <boxGeometry args={[FL * 0.45, 0.008, FW * 0.9]} />
          <meshStandardMaterial color="#f59e0b" transparent opacity={0.2} />
        </mesh>
      </group>

      {/* Footing */}
      <mesh position={[0, -FD / 2, 0]} castShadow>
        <boxGeometry args={[FL, FD, FW]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>
      <lineSegments position={[0, -FD / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(FL, FD, FW)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
      </lineSegments>

      {/* Pedestal */}
      <mesh position={[0, PH / 2, 0]} castShadow>
        <boxGeometry args={[PW, PH, PW]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>

      {/* Reinforcement indicators (bottom mat) */}
      {[-0.35, -0.15, 0.05, 0.25, 0.45].map((frac, i) => (
        <mesh key={`x${i}`} position={[frac * FL, -FD + 0.04, 0]}>
          <cylinderGeometry args={[0.012, 0.012, FW * 0.9, 6]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.5} />
        </mesh>
      ))}
      {[-0.35, -0.15, 0.05, 0.25, 0.45].map((frac, i) => (
        <mesh key={`z${i}`} position={[0, -FD + 0.06, frac * FW]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, FL * 0.9, 6]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.5} />
        </mesh>
      ))}

      {/* Animated load + moment arrow */}
      <PulsingLoadArrow position={[0, PH + 0.3, 0]} load={load} moment={moment} />

      {/* Dimension lines */}
      <DimensionLine start={[-FL / 2, -FD - 0.15, FW / 2 + 0.2]} end={[FL / 2, -FD - 0.15, FW / 2 + 0.2]} label={`L=${(footingLength / 1000).toFixed(1)}m`} offset={0} />
      <DimensionLine start={[-FL / 2 - 0.2, -FD - 0.15, -FW / 2]} end={[-FL / 2 - 0.2, -FD - 0.15, FW / 2]} label={`W=${(footingWidth / 1000).toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[FL / 2 + 0.3, -FD / 2, 0]} fontSize={0.08} color="#f59e0b">
        {`q = ${bearingPressure} kPa`}
      </Text>
      <Text position={[0, PH + 0.85, 0]} fontSize={0.08} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <mesh position={[FL / 2 + 0.1, PH, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
