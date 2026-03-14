import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface CranePad3DProps {
  padLength?: number;
  padWidth?: number;
  padDepth?: number;
  matLayers?: number;
  outriggerLoad?: number;
  bearingPressure?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Pulsating glow ring around pad perimeter */
function GlowRing({ status, w, d, utilisation }: { status: 'PASS' | 'FAIL'; w: number; d: number; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.03;
    ref.current.scale.set(s, 1, s);
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.1 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 0.005, 0]}>
      <boxGeometry args={[w + 0.04, 0.008, d + 0.04]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.8} transparent opacity={0.1} />
    </mesh>
  );
}

/** Animated load arrow pulsating down */
function AnimatedLoadArrow({ load }: { load: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const bob = Math.sin(clock.getElapsedTime() * 3) * 0.01;
    ref.current.position.y = 0.6 + bob;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.1, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.35, 0.25, 0]} fontSize={0.09} color="#ef4444">
        {`P = ${load} kN`}
      </Text>
    </group>
  );
}

/** Animated bearing-pressure arrows spreading from base */
function BearingArrows({ pL, pW, layers, pD }: { pL: number; pW: number; layers: number; pD: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2.5) * 0.08;
    ref.current.scale.set(1, s, 1);
  });
  const baseY = -pD * layers - 0.02;
  const positions: [number, number][] = [];
  for (let xi = -1; xi <= 1; xi++) {
    for (let zi = -1; zi <= 1; zi++) {
      positions.push([xi * pL * 0.3, zi * pW * 0.3]);
    }
  }
  return (
    <group ref={ref}>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, baseY, z]}>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, -0.075, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.02, 0.04, 6]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Dimension line with end ticks */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.04, (start[2] + end[2]) / 2];
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
          <boxGeometry args={[0.003, 0.03, 0.003]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Text position={mid} fontSize={0.06} color={color}>{label}</Text>
    </group>
  );
}

export default function CranePad3D({
  padLength = 3000,
  padWidth = 3000,
  padDepth = 200,
  matLayers = 2,
  outriggerLoad = 400,
  bearingPressure = 80,
  utilisation = 50,
  status = 'PASS',
}: CranePad3DProps) {
  const s = 1 / 1500;
  const PL = padLength * s;
  const PW = padWidth * s;
  const PD = padDepth * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';

  return (
    <group>
      {/* Animated glow ring */}
      <GlowRing status={status} w={PL} d={PW} utilisation={utilisation} />

      {/* Ground */}
      <mesh position={[0, -PD * matLayers - 0.05, 0]} receiveShadow>
        <boxGeometry args={[PL + 2, 0.1, PW + 2]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>

      {/* Timber mat layers with alternating grain direction */}
      {Array.from({ length: matLayers }).map((_, i) => (
        <mesh key={i} position={[0, -PD * matLayers + PD * i + PD / 2, 0]} castShadow
              rotation={[0, i % 2 === 0 ? 0 : Math.PI / 2, 0]}>
          <boxGeometry args={[PL, PD * 0.9, PW]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#8B6914' : '#A0782C'}
            roughness={0.9}
          />
        </mesh>
      ))}

      {/* Mat layer edge lines for grain detail */}
      {Array.from({ length: matLayers }).map((_, layer) =>
        Array.from({ length: 5 }).map((__, li) => {
          const y = -PD * matLayers + PD * layer + PD / 2;
          const offset = (li - 2) * PW * 0.2;
          const rotated = layer % 2 !== 0;
          return (
            <mesh key={`g${layer}-${li}`}
                  position={rotated ? [offset, y + PD * 0.46, 0] : [0, y + PD * 0.46, offset]}
                  rotation={rotated ? [0, 0, 0] : [0, 0, 0]}>
              <boxGeometry args={rotated ? [0.003, 0.002, PW * 0.95] : [PL * 0.95, 0.002, 0.003]} />
              <meshStandardMaterial color="#6b4e1b" transparent opacity={0.3} />
            </mesh>
          );
        })
      )}

      {/* Steel distribution plate */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[PL * 0.7, 0.06, PW * 0.7]} />
        <meshStandardMaterial color="#71717a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Outrigger pad (circular) */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 24]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Outrigger beam */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.12, 0.15, 1.5]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Animated load arrow */}
      <AnimatedLoadArrow load={outriggerLoad} />

      {/* Animated bearing-pressure arrows */}
      <BearingArrows pL={PL} pW={PW} layers={matLayers} pD={PD} />

      {/* Bearing pressure zone */}
      <mesh position={[0, -PD * matLayers + 0.01, 0]}>
        <boxGeometry args={[PL * 0.9, 0.015, PW * 0.9]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.2} />
      </mesh>

      {/* Dimension lines */}
      <DimensionLine
        start={[-PL / 2, -PD * matLayers - 0.12, PW / 2 + 0.08]}
        end={[PL / 2, -PD * matLayers - 0.12, PW / 2 + 0.08]}
        label={`${(padLength / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />
      <DimensionLine
        start={[PL / 2 + 0.08, -PD * matLayers - 0.12, -PW / 2]}
        end={[PL / 2 + 0.08, -PD * matLayers - 0.12, PW / 2]}
        label={`${(padWidth / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />

      {/* Labels */}
      <Text position={[0, 0.95, 0]} fontSize={0.09} color="#00d9ff">
        {`Crane Pad Design`}
      </Text>
      <Text position={[PL / 2 + 0.25, -PD, 0]} fontSize={0.07} color="#f59e0b">
        {`q = ${bearingPressure} kPa`}
      </Text>
      <Text position={[0, -PD * matLayers - 0.25, 0]} fontSize={0.06} color="#94a3b8">
        {`${matLayers}× timber mats, ${padDepth}mm thick`}
      </Text>

      {/* Status */}
      <mesh position={[PL / 2 + 0.08, 0.15, PW / 2]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[PL / 2 + 0.08, 0.24, PW / 2]} fontSize={0.05} color={sc}>
        {status}
      </Text>
    </group>
  );
}
