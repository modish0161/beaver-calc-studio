import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function AnimatedVehicle({
  radius,
  vehicleWidth,
  vehicleLength,
  sweepRad,
}: {
  radius: number;
  vehicleWidth: number;
  vehicleLength: number;
  sweepRad: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const progress = ((Math.sin(t * 0.4) + 1) / 2) * sweepRad;
    const x = radius * Math.cos(progress);
    const y = radius * Math.sin(progress);
    ref.current.position.set(x, y, 0.02);
    ref.current.rotation.z = progress;
  });
  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[vehicleWidth, vehicleLength, 0.025]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
      </mesh>
      {/* Cab */}
      <mesh position={[0, vehicleLength * 0.35, 0.015]}>
        <boxGeometry args={[vehicleWidth * 0.9, vehicleLength * 0.25, 0.02]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.5} />
      </mesh>
      {/* Direction arrow */}
      <mesh position={[0, vehicleLength * 0.5, 0.02]} rotation={[0, 0, 0]}>
        <coneGeometry args={[vehicleWidth * 0.2, vehicleLength * 0.12, 4]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

function PulsingPath({ segments, getRadius, sweepRad, colour }: {
  segments: number;
  getRadius: number;
  sweepRad: number;
  colour: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2 + i * 0.5) * 0.3;
      }
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: segments }).map((_, i) => {
        const a1 = (i / segments) * sweepRad;
        const a2 = ((i + 1) / segments) * sweepRad;
        const x1 = getRadius * Math.cos(a1);
        const y1 = getRadius * Math.sin(a1);
        const x2 = getRadius * Math.cos(a2);
        const y2 = getRadius * Math.sin(a2);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        return (
          <mesh key={i} position={[mx, my, 0.005]} rotation={[0, 0, ang]}>
            <boxGeometry args={[len, 0.008, 0.008]} />
            <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

function TyreTracks({ radius, sweepRad, vehicleWidth }: { radius: number; sweepRad: number; vehicleWidth: number }) {
  const numMarks = 16;
  return (
    <group>
      {[-1, 1].map(side => (
        <group key={side}>
          {Array.from({ length: numMarks }).map((_, i) => {
            const a = (i / numMarks) * sweepRad;
            const r = radius + side * vehicleWidth * 0.4;
            const x = r * Math.cos(a);
            const y = r * Math.sin(a);
            return (
              <mesh key={i} position={[x, y, 0.002]} rotation={[0, 0, a]}>
                <boxGeometry args={[0.003, 0.012, 0.002]} />
                <meshStandardMaterial color="#44403c" transparent opacity={0.3} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/* ── main component ── */

export interface SweptPath3DProps {
  vehicleLength?: number;
  vehicleWidth?: number;
  turningRadius?: number;
  sweepAngle?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function SweptPath3D({
  vehicleLength = 12000,
  vehicleWidth = 2500,
  turningRadius = 12000,
  sweepAngle = 90,
  utilisation = 0,
  status = 'PASS',
}: SweptPath3DProps) {
  const s = 1 / 8000;
  const VL = vehicleLength * s;
  const VW = vehicleWidth * s;
  const TR = turningRadius * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const sweepRad = (sweepAngle * Math.PI) / 180;
  const numSegments = 16;
  const innerR = TR - VW / 2;
  const outerR = Math.sqrt((TR + VW / 2) ** 2 + VL * VL) * 0.7 + TR * 0.3;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {/* Ground plane */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[TR * 2.5, TR * 2.5, 0.02]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </mesh>

      {/* Turn centre marker with glow */}
      <mesh position={[0, 0, 0.005]}>
        <cylinderGeometry args={[0.02, 0.02, 0.01, 12]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Animated inner swept path */}
      <PulsingPath segments={numSegments} getRadius={innerR} sweepRad={sweepRad} colour="#f59e0b" />

      {/* Animated outer swept path */}
      <PulsingPath segments={numSegments} getRadius={outerR} sweepRad={sweepRad} colour="#ef4444" />

      {/* Tyre tracks */}
      <TyreTracks radius={TR} sweepRad={sweepRad} vehicleWidth={VW} />

      {/* Animated vehicle sweeping the path */}
      <AnimatedVehicle radius={TR} vehicleWidth={VW} vehicleLength={VL} sweepRad={sweepRad} />

      {/* Ghost vehicle at start position */}
      <mesh position={[TR, -VL / 2 + 0.1, 0.01]}>
        <boxGeometry args={[VW, VL, 0.015]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.15} />
      </mesh>

      {/* Ghost vehicle at end position */}
      <mesh
        position={[
          TR * Math.cos(sweepRad) - VL / 2 * Math.sin(sweepRad),
          TR * Math.sin(sweepRad) + VL / 2 * Math.cos(sweepRad) - VL / 2,
          0.01,
        ]}
        rotation={[0, 0, sweepRad]}
      >
        <boxGeometry args={[VW, VL, 0.015]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.15} />
      </mesh>

      {/* Radius line */}
      <mesh position={[TR / 2, 0, 0.003]}>
        <boxGeometry args={[TR, 0.003, 0.003]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.5} />
      </mesh>

      {/* Labels */}
      <Text position={[0, TR + 0.3, 0.05]} fontSize={0.08} color="#94a3b8" rotation={[Math.PI / 2, 0, 0]}>
        {`Swept path R = ${(turningRadius / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[0, TR + 0.18, 0.05]} fontSize={0.06} color="#f59e0b" rotation={[Math.PI / 2, 0, 0]}>
        {`Vehicle ${(vehicleLength / 1000).toFixed(1)}m × ${(vehicleWidth / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[TR * 0.5, -0.15, 0.05]} fontSize={0.05} color={colour} rotation={[Math.PI / 2, 0, 0]}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
