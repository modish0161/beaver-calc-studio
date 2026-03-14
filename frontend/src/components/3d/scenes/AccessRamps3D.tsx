import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface AccessRamps3DProps {
  rampLength?: number;
  rampWidth?: number;
  rampGradient?: number;
  riseHeight?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Pulsating glow strip along ramp edges */
function GlowEdge({ status, rL, rH, rW, utilisation, side }: {
  status: 'PASS' | 'FAIL'; rL: number; rH: number; rW: number; utilisation: number; side: 1 | -1;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.15 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
  });
  const len = Math.sqrt(rL * rL + rH * rH);
  return (
    <mesh ref={ref} position={[0, rH / 2, side * (rW / 2 + 0.01)]}
          rotation={[0, 0, Math.atan2(rH, rL)]}>
      <boxGeometry args={[len, 0.015, 0.015]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.2} />
    </mesh>
  );
}

/** Animated vehicle moving up & down the ramp */
function AnimatedVehicle({ rL, rH, rW }: { rL: number; rH: number; rW: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (Math.sin(clock.getElapsedTime() * 0.6) + 1) / 2; // 0-1 oscillation
    const x = -rL / 2 + t * rL;
    const y = t * rH + 0.04;
    ref.current.position.set(x, y, 0);
    ref.current.rotation.set(0, 0, Math.atan2(rH, rL));
  });
  return (
    <group ref={ref}>
      {/* Cab */}
      <mesh position={[0.04, 0.025, 0]}>
        <boxGeometry args={[0.06, 0.04, 0.07]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.15} transparent opacity={0.6} />
      </mesh>
      {/* Body */}
      <mesh position={[-0.03, 0.01, 0]}>
        <boxGeometry args={[0.1, 0.025, 0.06]} />
        <meshStandardMaterial color="#60a5fa" transparent opacity={0.4} />
      </mesh>
      {/* Wheels */}
      {[[-0.06, 0.025], [-0.06, -0.025], [0.06, 0.025], [0.06, -0.025]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, -0.01, dz]}>
          <sphereGeometry args={[0.008, 8, 8]} />
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
    (start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.04, (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0]; const dy = end[1] - start[1]; const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const angle = Math.atan2(dy, dx);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2]}
            rotation={[0, 0, dz === 0 ? angle : 0]}>
        <boxGeometry args={[dz !== 0 ? 0.003 : len, dz !== 0 ? 0.003 : 0.003, dz !== 0 ? len : 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[start, end].map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.003, 0.03, 0.003]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Text position={mid} fontSize={0.05} color={color}>{label}</Text>
    </group>
  );
}

export default function AccessRamps3D({
  rampLength = 15000,
  rampWidth = 4000,
  rampGradient = 10,
  riseHeight = 2500,
  utilisation = 50,
  status = 'PASS',
}: AccessRamps3DProps) {
  const s = 1 / 8000;
  const RL = rampLength * s;
  const RW = rampWidth * s;
  const RH = riseHeight * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';

  return (
    <group>
      {/* Glow edges */}
      <GlowEdge status={status} rL={RL} rH={RH} rW={RW} utilisation={utilisation} side={1} />
      <GlowEdge status={status} rL={RL} rH={RH} rW={RW} utilisation={utilisation} side={-1} />

      {/* Ground level */}
      <mesh position={[-RL / 2 - 0.2, -0.02, 0]}>
        <boxGeometry args={[0.5, 0.04, RW + 0.5]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Upper platform */}
      <mesh position={[RL / 2 + 0.2, RH - 0.02, 0]}>
        <boxGeometry args={[0.5, 0.04, RW + 0.5]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Ramp surface */}
      <mesh position={[0, RH / 2 - 0.015, 0]} rotation={[0, 0, Math.atan2(RH, RL)]}>
        <boxGeometry args={[Math.sqrt(RL * RL + RH * RH), 0.03, RW]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.8} />
      </mesh>

      {/* Ramp surface tread marks */}
      {Array.from({ length: 10 }).map((_, i) => {
        const t = (i + 0.5) / 10;
        const x = -RL / 2 + t * RL;
        const y = t * RH;
        return (
          <mesh key={`tread${i}`} position={[x, y + 0.005, 0]} rotation={[0, 0, Math.atan2(RH, RL)]}>
            <boxGeometry args={[0.003, 0.003, RW * 0.8]} />
            <meshStandardMaterial color="#737373" transparent opacity={0.4} />
          </mesh>
        );
      })}

      {/* Embankment sides */}
      <mesh position={[0, RH / 4, RW / 2 + 0.02]}>
        <boxGeometry args={[RL, RH / 2, 0.03]} />
        <meshStandardMaterial color="#78552b" roughness={0.9} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, RH / 4, -RW / 2 - 0.02]}>
        <boxGeometry args={[RL, RH / 2, 0.03]} />
        <meshStandardMaterial color="#78552b" roughness={0.9} transparent opacity={0.6} />
      </mesh>

      {/* Edge protection posts + rails */}
      {Array.from({ length: 6 }).map((_, i) => {
        const t = i / 5;
        const x = -RL / 2 + t * RL;
        const y = t * RH;
        return (
          <group key={`ep${i}`}>
            {[1, -1].map(side => (
              <group key={side}>
                <mesh position={[x, y + 0.05, side * (RW / 2 + 0.03)]}>
                  <cylinderGeometry args={[0.006, 0.006, 0.1, 6]} />
                  <meshStandardMaterial color="#f59e0b" />
                </mesh>
                {/* Handrail */}
                <mesh position={[x, y + 0.1, side * (RW / 2 + 0.03)]}>
                  <sphereGeometry args={[0.008, 6, 6]} />
                  <meshStandardMaterial color="#f59e0b" />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
      {/* Horizontal rail bars */}
      {[1, -1].map(side => (
        <mesh key={`rail${side}`}
              position={[0, RH / 2 + 0.1, side * (RW / 2 + 0.03)]}
              rotation={[0, 0, Math.atan2(RH, RL)]}>
          <boxGeometry args={[Math.sqrt(RL * RL + RH * RH), 0.005, 0.005]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      ))}

      {/* Animated vehicle on ramp */}
      <AnimatedVehicle rL={RL} rH={RH} rW={RW} />

      {/* Gradient arrow */}
      <group position={[0, RH / 2 + 0.18, RW / 2 + 0.2]}>
        <mesh rotation={[0, 0, Math.atan2(RH, RL)]}>
          <boxGeometry args={[RL / 2, 0.005, 0.005]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[RL / 4, RH / 4, 0]} rotation={[0, 0, Math.atan2(RH, RL)]}>
          <coneGeometry args={[0.015, 0.04, 6]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <Text position={[0, 0.05, 0]} fontSize={0.05} color="#3b82f6">
          {`1:${rampGradient}`}
        </Text>
      </group>

      {/* Dimension: ramp length */}
      <DimensionLine
        start={[-RL / 2, -0.08, -RW / 2 - 0.12]}
        end={[RL / 2, -0.08, -RW / 2 - 0.12]}
        label={`${(rampLength / 1000).toFixed(0)}m`}
        color="#00d9ff"
      />

      {/* Dimension: rise height */}
      <DimensionLine
        start={[RL / 2 + 0.12, 0, 0]}
        end={[RL / 2 + 0.12, RH, 0]}
        label={`${(riseHeight / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />

      {/* Dimension: width */}
      <DimensionLine
        start={[-RL / 2 - 0.08, -0.06, -RW / 2]}
        end={[-RL / 2 - 0.08, -0.06, RW / 2]}
        label={`${(rampWidth / 1000).toFixed(1)}m`}
        color="#94a3b8"
      />

      {/* Labels */}
      <Text position={[0, RH + 0.2, 0]} fontSize={0.08} color="#00d9ff">
        {`Access Ramp`}
      </Text>
      <Text position={[0, RH + 0.32, 0]} fontSize={0.06} color="#f59e0b">
        {`${(rampLength / 1000).toFixed(0)}m long, ${(rampWidth / 1000).toFixed(0)}m wide, 1:${rampGradient}`}
      </Text>

      {/* Status */}
      <mesh position={[RL / 2 + 0.15, RH + 0.05, RW / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[RL / 2 + 0.15, RH + 0.12, RW / 2]} fontSize={0.045} color={sc}>
        {status}
      </Text>
    </group>
  );
}
