import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface TurningPlatform3DProps {
  platformRadius?: number;
  platformThick?: number;
  surfaceType?: string;
  vehicleLength?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated glow ring pulsating around platform edge */
function GlowRing({ status, radius, utilisation }: { status: 'PASS' | 'FAIL'; radius: number; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.03;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.1 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.015, 8, 48]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.8} transparent opacity={0.1} />
    </mesh>
  );
}

/** Animated vehicle sweeping around the turning circle */
function AnimatedVehicle({ radius, y, vehicleLen }: { radius: number; y: number; vehicleLen: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const angle = clock.getElapsedTime() * 0.3;
    const r = radius * 0.65;
    ref.current.position.set(r * Math.cos(angle), y, r * Math.sin(angle));
    ref.current.rotation.set(0, -angle + Math.PI / 2, 0);
  });
  return (
    <group ref={ref}>
      {/* Cab */}
      <mesh position={[vehicleLen * 0.3, 0.03, 0]}>
        <boxGeometry args={[vehicleLen * 0.3, 0.05, vehicleLen * 0.14]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.15} transparent opacity={0.6} />
      </mesh>
      {/* Body */}
      <mesh position={[-vehicleLen * 0.1, 0.015, 0]}>
        <boxGeometry args={[vehicleLen * 0.6, 0.03, vehicleLen * 0.15]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.4} />
      </mesh>
      {/* Wheels */}
      {[[-0.35, 0.07], [-0.35, -0.07], [0.35, 0.07], [0.35, -0.07]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx * vehicleLen, -0.01, dz * vehicleLen]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.01, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
    </group>
  );
}

/** Dimension line with end ticks */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.04, (start[2] + end[2]) / 2];
  const dx = end[0] - start[0]; const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[len, 0.003, 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[start, end].map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.003, 0.04, 0.003]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Text position={mid} fontSize={0.055} color={color}>{label}</Text>
    </group>
  );
}

export default function TurningPlatform3D({
  platformRadius = 12000,
  platformThick = 400,
  surfaceType = 'Type 1 granular',
  vehicleLength = 12000,
  utilisation = 50,
  status = 'PASS',
}: TurningPlatform3DProps) {
  const s = 1 / 8000;
  const PR = platformRadius * s;
  const PT = platformThick * s;
  const VL = vehicleLength * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';

  return (
    <group>
      {/* Animated glow ring */}
      <GlowRing status={status} radius={PR} utilisation={utilisation} />

      {/* Sub-grade */}
      <mesh position={[0, -PT - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[PR + 0.1, PR + 0.1, 0.03, 24]} />
        <meshStandardMaterial color="#78552b" roughness={0.9} />
      </mesh>

      {/* Platform fill */}
      <mesh position={[0, -PT / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[PR, PR, PT, 24]} />
        <meshStandardMaterial color="#d4a574" roughness={0.8} />
      </mesh>

      {/* Running surface */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[PR, PR, 0.01, 24]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.7} />
      </mesh>

      {/* Edge kerb */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PR, 0.015, 8, 24]} />
        <meshStandardMaterial color="#525252" roughness={0.8} />
      </mesh>

      {/* Swept path arc (ghost trail) */}
      <mesh position={[0, 0.008, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PR * 0.65, VL * 0.08, 4, 48]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.08} />
      </mesh>

      {/* Animated vehicle sweeping around */}
      <AnimatedVehicle radius={PR} y={0.015} vehicleLen={VL} />

      {/* Turn arc direction arrows */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = PR * 0.75;
        return (
          <mesh key={`ta${i}`} position={[r * Math.cos(a), 0.012, r * Math.sin(a)]} rotation={[-Math.PI / 2, 0, a + Math.PI / 2]}>
            <coneGeometry args={[0.01, 0.025, 6]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.5} />
          </mesh>
        );
      })}

      {/* Radius dimension line */}
      <DimensionLine
        start={[0, 0.02, 0.05]}
        end={[PR, 0.02, 0.05]}
        label={`R = ${(platformRadius / 1000).toFixed(0)}m`}
        color="#ef4444"
      />

      {/* Thickness dimension */}
      <DimensionLine
        start={[PR + 0.08, 0, 0]}
        end={[PR + 0.08, -PT, 0]}
        label={`${platformThick}mm`}
        color="#94a3b8"
      />

      {/* Labels */}
      <Text position={[0, 0.28, 0]} fontSize={0.08} color="#00d9ff">
        {`Turning Platform`}
      </Text>
      <Text position={[0, 0.40, 0]} fontSize={0.06} color="#f59e0b">
        {`${surfaceType}, t = ${platformThick}mm`}
      </Text>
      <Text position={[0, -PT - 0.12, 0]} fontSize={0.055} color="#94a3b8">
        {`Vehicle length: ${(vehicleLength / 1000).toFixed(0)}m`}
      </Text>

      {/* Status indicator */}
      <mesh position={[PR + 0.05, 0.15, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[PR + 0.05, 0.22, 0]} fontSize={0.05} color={sc}>
        {status}
      </Text>
    </group>
  );
}
