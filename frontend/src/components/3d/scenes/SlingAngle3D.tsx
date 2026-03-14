import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function SwayingLoad({ spread, hookHeight, colour }: { spread: number; hookHeight: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.z = Math.sin(t * 0.8) * 0.02;
    ref.current.rotation.x = Math.cos(t * 0.6) * 0.015;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[spread * 1.8, 0.1, spread * 1.8]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.4} roughness={0.6} />
      </mesh>
      {/* lifting lug markers */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * spread * 0.7, 0.01, sz * spread * 0.7]}>
          <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
          <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function PulsingHook({ y }: { y: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 1.2) * 0.005;
  });
  return (
    <group>
      <mesh ref={ref} position={[0, y + 0.03, 0]}>
        <torusGeometry args={[0.04, 0.01, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.7} />
      </mesh>
      <mesh position={[0, y + 0.05, 0]}>
        <boxGeometry args={[0.02, 0.04, 0.02]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.7} />
      </mesh>
    </group>
  );
}

function AngleArc({ hookHeight, spread, angle }: { hookHeight: number; spread: number; angle: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
  });
  const arcAngle = (angle * Math.PI) / 180;
  return (
    <mesh ref={ref} position={[0, hookHeight, 0]} rotation={[Math.PI / 2, 0, -arcAngle / 2]}>
      <torusGeometry args={[spread * 0.35, 0.004, 4, 24, arcAngle]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
    </mesh>
  );
}

function LegTensionGlow({ position, colour }: { position: [number, number, number]; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2.5) * 0.3;
  });
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[0.018, 0.004, 8, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.7} />
    </mesh>
  );
}

function DimensionLine({ start, end, label, offset = 0.08 }: { start: [number, number, number]; end: [number, number, number]; label: string; offset?: number }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2;
  const mz = (start[2] + end[2]) / 2;
  const len = Math.sqrt((end[0]-start[0])**2 + (end[1]-start[1])**2 + (end[2]-start[2])**2);
  const dx = end[0]-start[0]; const dy = end[1]-start[1];
  const angle = Math.atan2(dy, dx);
  return (
    <group>
      <mesh position={[mx + offset * 0.3, my, mz]} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.003, 0.003]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mx + offset, my + offset * 0.3, mz]} fontSize={0.045} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface SlingAngle3DProps {
  slingLength?: number;
  slingAngle?: number;
  numLegs?: number;
  liftLoad?: number;
  slingCapacity?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function SlingAngle3D({
  slingLength = 3000,
  slingAngle = 60,
  numLegs = 4,
  liftLoad = 10,
  slingCapacity = 15,
  utilisation = 0,
  status = 'PASS',
}: SlingAngle3DProps) {
  const s = 1 / 2000;
  const SL = slingLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const angleRad = (slingAngle * Math.PI) / 180;
  const hookHeight = SL * Math.cos(angleRad / 2);
  const spread = SL * Math.sin(angleRad / 2);

  const legAngles = numLegs === 2
    ? [0, Math.PI]
    : numLegs === 3
    ? [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
    : [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

  return (
    <group>
      {/* Animated swaying load */}
      <SwayingLoad spread={spread} hookHeight={hookHeight} colour={colour} />

      {/* Pulsing hook */}
      <PulsingHook y={hookHeight} />

      {/* Crane wire above hook */}
      <mesh position={[0, hookHeight + 0.15, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.15, 6]} />
        <meshStandardMaterial color="#71717a" metalness={0.8} />
      </mesh>

      {/* Sling legs with tension glow */}
      {legAngles.map((a, i) => {
        const endX = spread * Math.cos(a);
        const endZ = spread * Math.sin(a);
        const midX = endX / 2;
        const midZ = endZ / 2;
        const midY = hookHeight / 2;
        const legLen = Math.sqrt(endX * endX + hookHeight * hookHeight + endZ * endZ);
        const pitch = Math.atan2(hookHeight, Math.sqrt(endX * endX + endZ * endZ));
        const yaw = Math.atan2(endZ, endX);

        return (
          <group key={`leg${i}`}>
            <mesh position={[midX, midY, midZ]} rotation={[0, -yaw, pitch - Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, legLen, 6]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Shackle at bottom */}
            <mesh position={[endX, 0.02, endZ]}>
              <torusGeometry args={[0.015, 0.005, 6, 8]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            {/* Tension glow at connection point */}
            <LegTensionGlow position={[endX, 0.02, endZ]} colour={colour} />
          </group>
        );
      })}

      {/* Animated angle arc */}
      <AngleArc hookHeight={hookHeight} spread={spread} angle={slingAngle} />

      {/* Dimension lines */}
      <DimensionLine
        start={[spread + 0.05, 0, 0]}
        end={[spread + 0.05, hookHeight, 0]}
        label={`H ${hookHeight.toFixed(2)}m`}
      />
      <DimensionLine
        start={[0, -0.15, 0]}
        end={[spread, -0.15, 0]}
        label={`Spread ${(spread * 2000).toFixed(0)}mm`}
        offset={0.06}
      />

      {/* Angle arc label */}
      <Text position={[spread * 0.3, hookHeight * 0.7, spread * 0.3]} fontSize={0.06} color="#3b82f6">
        {`${slingAngle}°`}
      </Text>

      {/* Labels */}
      <Text position={[0, hookHeight + 0.35, 0]} fontSize={0.08} color="#94a3b8">
        {`${numLegs}-leg sling, ${slingAngle}° included`}
      </Text>
      <Text position={[0, -0.2, 0]} fontSize={0.07} color="#ef4444">
        {`Load ${liftLoad}t, SWL ${slingCapacity}t`}
      </Text>
      <Text position={[spread + 0.1, hookHeight * 0.4, 0]} fontSize={0.05} color="#f59e0b">
        {`L = ${(slingLength / 1000).toFixed(1)}m`}
      </Text>

      {/* Status indicator */}
      <mesh position={[spread + 0.05, hookHeight + 0.1, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[spread + 0.05, hookHeight + 0.18, 0]} fontSize={0.04} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
