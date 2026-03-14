import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface HaulRoad3DProps {
  roadWidth?: number;
  roadLength?: number;
  cbrValue?: number;
  surfaceThickness?: number;
  maxGradient?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated glow lines along road edges */
function GlowEdge({ status, rL, rW, utilisation, side }: {
  status: 'PASS' | 'FAIL'; rL: number; rW: number; utilisation: number; side: 1 | -1;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.15 + Math.sin(clock.getElapsedTime() * 2) * 0.08;
  });
  return (
    <mesh ref={ref} position={[0, 0.008, side * (rW / 2 + 0.005)]}>
      <boxGeometry args={[rL + 0.02, 0.01, 0.012]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.15} />
    </mesh>
  );
}

/** Vehicle that drives along the haul road */
function AnimatedVehicle({ rL, rW }: { rL: number; rW: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Oscillate back and forth along road
    const t = Math.sin(clock.getElapsedTime() * 0.4);
    ref.current.position.x = t * rL * 0.4;
    ref.current.rotation.y = t > 0 ? 0 : Math.PI; // face direction of travel
  });
  return (
    <group ref={ref} position={[0, 0.035, rW * 0.15]}>
      {/* Cab */}
      <mesh position={[0.04, 0.02, 0]}>
        <boxGeometry args={[0.04, 0.035, 0.05]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.15} transparent opacity={0.65} />
      </mesh>
      {/* Body/trailer */}
      <mesh position={[-0.04, 0.01, 0]}>
        <boxGeometry args={[0.08, 0.025, 0.055]} />
        <meshStandardMaterial color="#d97706" transparent opacity={0.5} />
      </mesh>
      {/* Wheels */}
      {[[-0.06, 0.022], [-0.06, -0.022], [0.05, 0.022], [0.05, -0.022]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, -0.008, dz]}>
          <sphereGeometry args={[0.006, 6, 6]} />
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
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.03, (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0]; const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2]}>
        <boxGeometry args={[dx !== 0 ? len : 0.003, 0.003, dz !== 0 ? len : 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[start, end].map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.003, 0.025, 0.003]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Text position={mid} fontSize={0.05} color={color}>{label}</Text>
    </group>
  );
}

export default function HaulRoad3D({
  roadWidth = 7000,
  roadLength = 30000,
  cbrValue = 5,
  surfaceThickness = 300,
  maxGradient = 8,
  utilisation = 50,
  status = 'PASS',
}: HaulRoad3DProps) {
  const s = 1 / 15000;
  const RW = roadWidth * s;
  const RL = roadLength * s;
  const ST = surfaceThickness * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';

  return (
    <group>
      {/* Animated glow edges */}
      <GlowEdge status={status} rL={RL} rW={RW} utilisation={utilisation} side={1} />
      <GlowEdge status={status} rL={RL} rW={RW} utilisation={utilisation} side={-1} />

      {/* Sub-grade */}
      <mesh position={[0, -ST - 0.02, 0]}>
        <boxGeometry args={[RL, 0.03, RW + 0.3]} />
        <meshStandardMaterial color="#78552b" roughness={0.9} />
      </mesh>

      {/* Sub-base layer */}
      <mesh position={[0, -ST * 0.7, 0]}>
        <boxGeometry args={[RL, ST * 0.4, RW + 0.05]} />
        <meshStandardMaterial color="#92764a" roughness={0.85} />
      </mesh>

      {/* Road pavement layers */}
      <mesh position={[0, -ST / 2, 0]}>
        <boxGeometry args={[RL, ST, RW]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.8} />
      </mesh>

      {/* Running surface */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[RL, 0.01, RW]} />
        <meshStandardMaterial color="#6b7280" roughness={0.7} />
      </mesh>

      {/* Camber (slight crown) */}
      <mesh position={[0, 0.013, 0]}>
        <boxGeometry args={[RL, 0.005, RW * 0.3]} />
        <meshStandardMaterial color="#737373" roughness={0.7} />
      </mesh>

      {/* Road edges / drainage channels */}
      {[1, -1].map(side => (
        <group key={side}>
          <mesh position={[0, -0.01, side * (RW / 2 + 0.02)]}>
            <boxGeometry args={[RL, 0.03, 0.03]} />
            <meshStandardMaterial color="#525252" roughness={0.8} />
          </mesh>
          {/* Drainage ditch */}
          <mesh position={[0, -0.025, side * (RW / 2 + 0.06)]}>
            <boxGeometry args={[RL, 0.015, 0.04]} />
            <meshStandardMaterial color="#4a3728" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Centre line marking */}
      {Array.from({ length: Math.ceil(RL / 0.1) }).map((_, i) => {
        if (i % 2 !== 0) return null;
        const x = -RL / 2 + i * 0.1 + 0.05;
        if (x > RL / 2) return null;
        return (
          <mesh key={`cl${i}`} position={[x, 0.012, 0]}>
            <boxGeometry args={[0.06, 0.002, 0.005]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} />
          </mesh>
        );
      })}

      {/* Animated vehicle */}
      <AnimatedVehicle rL={RL} rW={RW} />

      {/* Turning area at end */}
      <mesh position={[RL / 2 + 0.08, 0.005, 0]}>
        <cylinderGeometry args={[RW * 0.6, RW * 0.6, 0.01, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#6b7280" roughness={0.7} />
      </mesh>

      {/* Dimension: road width */}
      <DimensionLine
        start={[-RL / 2, -ST - 0.06, -RW / 2]}
        end={[-RL / 2, -ST - 0.06, RW / 2]}
        label={`${(roadWidth / 1000).toFixed(0)}m`}
        color="#00d9ff"
      />

      {/* Dimension: road length */}
      <DimensionLine
        start={[-RL / 2, -ST - 0.06, -RW / 2 - 0.08]}
        end={[RL / 2, -ST - 0.06, -RW / 2 - 0.08]}
        label={`${(roadLength / 1000).toFixed(0)}m`}
        color="#00d9ff"
      />

      {/* Dimension: surface thickness (vertical) */}
      <group position={[-RL / 2 - 0.06, 0, RW / 2 + 0.08]}>
        <mesh position={[0, -ST / 2, 0]}>
          <boxGeometry args={[0.003, ST, 0.003]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <Text position={[0.04, -ST / 2, 0]} fontSize={0.04} color="#94a3b8">
          {`${surfaceThickness}mm`}
        </Text>
      </group>

      {/* Labels */}
      <Text position={[0, 0.2, 0]} fontSize={0.08} color="#00d9ff">
        {`Haul Road`}
      </Text>
      <Text position={[0, 0.32, 0]} fontSize={0.06} color="#f59e0b">
        {`CBR ${cbrValue}%, t = ${surfaceThickness}mm, max gradient ${maxGradient}%`}
      </Text>
      <Text position={[0, 0.42, 0]} fontSize={0.05} color="#94a3b8">
        {`${(roadWidth / 1000).toFixed(0)}m wide × ${(roadLength / 1000).toFixed(0)}m long`}
      </Text>

      {/* Status */}
      <mesh position={[RL / 2, 0.12, RW / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[RL / 2, 0.18, RW / 2]} fontSize={0.045} color={sc}>
        {status}
      </Text>
    </group>
  );
}
