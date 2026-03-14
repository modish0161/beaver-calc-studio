import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface GravityWall3DProps {
  wallHeight?: number;
  topWidth?: number;
  baseWidth?: number;
  wallDepth?: number;
  soilPressure?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated glow ring around base */
function GlowBase({ status, bw, d, utilisation }: {
  status: 'PASS' | 'FAIL'; bw: number; d: number; utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.02;
    ref.current.scale.set(s, 1, s);
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.12 + Math.sin(clock.getElapsedTime() * 2) * 0.06;
  });
  return (
    <mesh ref={ref} position={[0, 0.005, 0]}>
      <boxGeometry args={[bw + 0.06, 0.01, d + 0.06]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.7} transparent opacity={0.12} />
    </mesh>
  );
}

/** Animated earth pressure arrows (Ka triangular) */
function PressureArrows({ H, tw, bw, d, batter }: {
  H: number; tw: number; bw: number; d: number; batter: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2.5) * 0.12;
    ref.current.scale.set(s, 1, 1);
  });
  return (
    <group ref={ref}>
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac, i) => {
        const y = H * frac;
        const len = frac * 0.5;
        const wallX = tw / 2 + (bw - tw) / 2 * (1 - frac);
        return (
          <group key={i} position={[wallX + len / 2 + 0.08, y, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, len, 6]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.6} />
            </mesh>
            <mesh position={[-len / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.025, 0.05, 6]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Animated overturning moment indicator */
function OverturnIndicator({ bw, H }: { bw: number; H: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.08 + Math.sin(clock.getElapsedTime() * 1.5) * 0.06;
  });
  return (
    <mesh ref={ref} position={[-bw / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.08, 0.004, 4, 16, Math.PI]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} transparent opacity={0.1} />
    </mesh>
  );
}

/** Dimension line */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2 + 0.03, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0]; const dy = end[1] - start[1]; const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2]}>
        <boxGeometry args={[dx !== 0 ? len : 0.003, dy !== 0 ? len : 0.003, dz !== 0 ? len : 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[start, end].map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[dy !== 0 ? 0.025 : 0.003, dx !== 0 ? 0.025 : 0.003, 0.003]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Text position={mid} fontSize={0.07} color={color}>{label}</Text>
    </group>
  );
}

export default function GravityWall3D({
  wallHeight = 3000,
  topWidth = 600,
  baseWidth = 2000,
  wallDepth = 1000,
  soilPressure = 30,
  utilisation = 50,
  status = 'PASS',
}: GravityWall3DProps) {
  const s = 1 / 1000;
  const H = wallHeight * s;
  const tw = topWidth * s;
  const bw = baseWidth * s;
  const d = Math.min(wallDepth * s, 2.5);
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';

  // Trapezoidal shape via custom geometry
  const shape = new THREE.Shape();
  shape.moveTo(-bw / 2, 0);
  shape.lineTo(bw / 2, 0);
  shape.lineTo(tw / 2, H);
  shape.lineTo(-tw / 2, H);
  shape.closePath();

  const extrudeSettings = { depth: d, bevelEnabled: false };

  return (
    <group>
      {/* Animated glow base */}
      <GlowBase status={status} bw={bw} d={d} utilisation={utilisation} />

      {/* Ground */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[bw + 2.5, 0.1, d + 1]} />
        <meshStandardMaterial color="#5c4033" roughness={1} />
      </mesh>

      {/* Blinding / foundation */}
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[bw + 0.1, 0.03, d + 0.05]} />
        <meshStandardMaterial color="#737373" roughness={0.8} />
      </mesh>

      {/* Wall body */}
      <mesh position={[0, 0, -d / 2]} castShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial color="#a1a1aa" roughness={0.8} />
      </mesh>

      {/* Wall centreline */}
      <mesh position={[0, H / 2, d / 2 + 0.01]}>
        <boxGeometry args={[0.002, H, 0.002]} />
        <meshStandardMaterial color="#525252" transparent opacity={0.3} />
      </mesh>

      {/* Retained soil */}
      <mesh position={[bw / 2 + 0.4, H / 2, 0]}>
        <boxGeometry args={[0.8, H, d]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={0.25} />
      </mesh>

      {/* Soil hatch lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`sh${i}`}
              position={[bw / 2 + 0.4, H * (i + 0.5) / 8, d / 2 + 0.005]}
              rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.1, 0.002, 0.002]} />
          <meshStandardMaterial color="#6b5c3d" transparent opacity={0.35} />
        </mesh>
      ))}

      {/* Animated earth pressure arrows */}
      <PressureArrows H={H} tw={tw} bw={bw} d={d} batter={0} />

      {/* Overturning indicator */}
      <OverturnIndicator bw={bw} H={H} />

      {/* Self-weight arrow */}
      <group position={[0, H + 0.15, 0]}>
        <mesh>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, -0.08, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.03, 0.05, 6]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.3} />
        </mesh>
        <Text position={[0.12, 0, 0]} fontSize={0.05} color="#8b5cf6">W</Text>
      </group>

      {/* Dimension: wall height */}
      <DimensionLine
        start={[-bw / 2 - 0.2, 0, d / 2 + 0.05]}
        end={[-bw / 2 - 0.2, H, d / 2 + 0.05]}
        label={`H = ${(wallHeight / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />

      {/* Dimension: base width */}
      <DimensionLine
        start={[-bw / 2, -0.12, d / 2 + 0.05]}
        end={[bw / 2, -0.12, d / 2 + 0.05]}
        label={`${(baseWidth / 1000).toFixed(1)}m`}
        color="#94a3b8"
      />

      {/* Dimension: top width */}
      <DimensionLine
        start={[-tw / 2, H + 0.06, d / 2 + 0.05]}
        end={[tw / 2, H + 0.06, d / 2 + 0.05]}
        label={`${(topWidth / 1000).toFixed(0)}mm`}
        color="#94a3b8"
      />

      {/* Labels */}
      <Text position={[0, H + 0.35, 0]} fontSize={0.1} color="#00d9ff">
        {`Gravity Wall`}
      </Text>
      <Text position={[bw / 2 + 0.8, H * 0.6, 0]} fontSize={0.08} color="#f59e0b">
        {`σ = ${soilPressure} kPa`}
      </Text>

      {/* Status */}
      <mesh position={[-bw / 2 - 0.1, H + 0.15, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[-bw / 2 - 0.1, H + 0.26, 0]} fontSize={0.06} color={sc}>
        {status}
      </Text>
    </group>
  );
}
