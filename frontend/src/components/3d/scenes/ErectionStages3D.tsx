import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function AnimatedCraneHook({ x, SL }: { x: number; SL: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = 0.35 + Math.sin(clock.getElapsedTime() * 0.8) * 0.02;
  });
  return (
    <group ref={ref} position={[x, 0.35, 0]}>
      {/* Hoist wire */}
      <mesh>
        <cylinderGeometry args={[0.005, 0.005, 0.15, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      {/* Hook */}
      <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.015, 0.003, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

function BeamLoweringEffect({ x, BD, SL, color }: { x: number; BD: number; SL: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * 0.3) % 1;
    ref.current.position.y = 0.12 + BD / 2 + (1 - t) * 0.08;
    (ref.current.material as THREE.MeshStandardMaterial).opacity = 0.4 + t * 0.35;
  });
  return (
    <mesh ref={ref} position={[x, 0.12 + BD / 2, 0]}>
      <boxGeometry args={[SL * 0.95, BD, 0.06]} />
      <meshStandardMaterial color={color} transparent opacity={0.75} roughness={0.5} metalness={0.6} />
    </mesh>
  );
}

function StageGlow({ x, y, colour }: { x: number; y: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2 + x * 10) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, y - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.06, 0.18]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function AnimatedProgressBar({ totalLen, currentStage, totalStages }: { totalLen: number; currentStage: number; totalStages: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
  });
  const barW = totalLen * 0.8 * currentStage / totalStages;
  return (
    <group position={[0, -0.06, 0.2]}>
      <mesh>
        <boxGeometry args={[totalLen * 0.8, 0.008, 0.008]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh ref={ref} position={[(-totalLen * 0.8 / 2) + barW / 2, 0, 0]}>
        <boxGeometry args={[barW, 0.01, 0.01]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.4} />
      </mesh>
      <Text position={[0, -0.025, 0]} fontSize={0.03} color="#94a3b8">
        {`Stage ${currentStage} of ${totalStages}`}
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
      <Text position={[mx + offset + 0.08, my, mz]} fontSize={0.04} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface ErectionStages3DProps {
  numSpans?: number;
  spanLength?: number;
  beamDepth?: number;
  currentStage?: number;
  totalStages?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function ErectionStages3D({
  numSpans = 3,
  spanLength = 12000,
  beamDepth = 800,
  currentStage = 2,
  totalStages = 4,
  utilisation = 0,
  status = 'PASS',
}: ErectionStages3DProps) {
  const s = 1 / 15000;
  const SL = spanLength * s;
  const BD = beamDepth * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const totalLen = numSpans * SL;
  const stageColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[totalLen + 0.3, 0.01, 0.5]} />
        <meshStandardMaterial color="#92400e" transparent opacity={0.3} />
      </mesh>

      {/* Piers / abutments with glow */}
      {Array.from({ length: numSpans + 1 }).map((_, i) => {
        const x = -totalLen / 2 + i * SL;
        const isAbutment = i === 0 || i === numSpans;
        const h = isAbutment ? 0.12 : 0.2;
        return (
          <group key={`pier${i}`}>
            <mesh position={[x, isAbutment ? 0.06 : 0.1, 0]}>
              <boxGeometry args={[0.04, h, 0.15]} />
              <meshStandardMaterial color="#6b7280" roughness={0.7} />
            </mesh>
            <StageGlow x={x} y={0} colour={colour} />
          </group>
        );
      })}

      {/* Beams per stage */}
      {Array.from({ length: numSpans }).map((_, spanIdx) => {
        const x = -totalLen / 2 + (spanIdx + 0.5) * SL;
        const isErected = spanIdx < currentStage;
        const isCurrent = spanIdx === currentStage - 1;
        const color = isErected ? stageColors[spanIdx % stageColors.length] : '#374151';

        return (
          <group key={`span${spanIdx}`}>
            {/* Current stage beam has lowering animation */}
            {isCurrent ? (
              <BeamLoweringEffect x={x} BD={BD} SL={SL} color={color} />
            ) : (
              <mesh position={[x, isErected ? 0.12 + BD / 2 : 0.08 + BD / 2, 0]}>
                <boxGeometry args={[SL * 0.95, BD, 0.06]} />
                <meshStandardMaterial
                  color={color}
                  transparent
                  opacity={isErected ? 0.75 : 0.2}
                  roughness={0.5}
                  metalness={isErected ? 0.6 : 0}
                />
              </mesh>
            )}

            {isErected && (
              <Text position={[x, 0.12 + BD + 0.06, 0]} fontSize={0.035} color={color}>
                {`Stage ${spanIdx + 1}`}
              </Text>
            )}

            {/* Crane hook + temp supports at current stage */}
            {isCurrent && (
              <group>
                <AnimatedCraneHook x={x} SL={SL} />
                {[-SL * 0.3, SL * 0.3].map((dx, ti) => (
                  <mesh key={`ts${ti}`} position={[x + dx, 0.06, 0]}>
                    <cylinderGeometry args={[0.008, 0.01, 0.12, 8]} />
                    <meshStandardMaterial color="#f59e0b" transparent opacity={0.6} />
                  </mesh>
                ))}
              </group>
            )}

            {!isErected && spanIdx >= currentStage && (
              <Text position={[x, 0.12 + BD + 0.06, 0]} fontSize={0.03} color="#6b7280">{`Future`}</Text>
            )}
          </group>
        );
      })}

      {/* Animated progress bar */}
      <AnimatedProgressBar totalLen={totalLen} currentStage={currentStage} totalStages={totalStages} />

      {/* Dimension lines */}
      <DimensionLine
        start={[-totalLen / 2, -0.04, -0.18]}
        end={[-totalLen / 2 + SL, -0.04, -0.18]}
        label={`${(spanLength / 1000).toFixed(0)}m span`}
        offset={0}
      />

      {/* Labels */}
      <Text position={[0, 0.5, 0]} fontSize={0.06} color="#94a3b8">
        {`${numSpans}-span erection, ${(spanLength / 1000).toFixed(0)}m spans`}
      </Text>

      {/* Status */}
      <mesh position={[totalLen / 2 + 0.08, 0.35, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[totalLen / 2 + 0.08, 0.42, 0]} fontSize={0.04} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
