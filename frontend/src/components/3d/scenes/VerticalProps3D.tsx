import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface VerticalProps3DProps {
  propHeight?: number;
  numProps?: number;
  propLoad?: number;
  beamSpan?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated pulsating load arrows */
function AnimatedLoadArrow({ x, pH, load }: { x: number; pH: number; load: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const bob = Math.sin(clock.getElapsedTime() * 3) * 0.008;
    ref.current.position.y = pH + 0.25 + bob;
  });
  return (
    <group ref={ref} position={[x, pH + 0.25, 0]}>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.02, 0.06, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <Text position={[0, 0.18, 0]} fontSize={0.045} color="#ef4444">
        {`${load} kN`}
      </Text>
    </group>
  );
}

/** Pulsating status glow at base of each prop */
function PropGlow({ x, status, utilisation }: { x: number; status: 'PASS' | 'FAIL'; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.1 + Math.sin(clock.getElapsedTime() * 2) * 0.06;
  });
  return (
    <mesh ref={ref} position={[x, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.035, 0.006, 6, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.12} />
    </mesh>
  );
}

/** Animated deflection indicator on beam */
function BeamDeflection({ span, pH }: { span: number; pH: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const d = Math.sin(clock.getElapsedTime() * 1.5) * 0.003;
    ref.current.position.y = pH + 0.04 + d;
  });
  return (
    <mesh ref={ref} position={[0, pH + 0.04, 0]}>
      <boxGeometry args={[span, 0.08, 0.15]} />
      <meshStandardMaterial color="#71717a" metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

/** Dimension line */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2 + 0.04, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0]; const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, start[2]]}>
        <boxGeometry args={[dx !== 0 ? len : 0.003, dy !== 0 ? len : 0.003, 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[start, end].map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[dy !== 0 ? 0.02 : 0.003, dx !== 0 ? 0.02 : 0.003, 0.003]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Text position={mid} fontSize={0.05} color={color}>{label}</Text>
    </group>
  );
}

export default function VerticalProps3D({
  propHeight = 3200,
  numProps = 3,
  propLoad = 30,
  beamSpan = 6000,
  utilisation = 50,
  status = 'PASS',
}: VerticalProps3DProps) {
  const s = 1 / 2000;
  const PH = propHeight * s;
  const BS = beamSpan * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';

  return (
    <group>
      {/* Floor/ground */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[BS + 0.4, 0.04, 1]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </mesh>

      {/* Animated beam (slight deflection) */}
      <BeamDeflection span={BS} pH={PH} />

      {/* Slab above beam */}
      <mesh position={[0, PH + 0.12, 0]}>
        <boxGeometry args={[BS + 0.3, 0.06, 0.8]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} />
      </mesh>

      {/* UDL arrows on slab */}
      {Array.from({ length: 7 }).map((_, i) => {
        const x = (i / 6 - 0.5) * BS * 0.8;
        return (
          <group key={`udl${i}`} position={[x, PH + 0.18, 0]}>
            <mesh>
              <cylinderGeometry args={[0.004, 0.004, 0.04, 4]} />
              <meshStandardMaterial color="#8b5cf6" transparent opacity={0.4} />
            </mesh>
            <mesh position={[0, -0.025, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.01, 0.02, 4]} />
              <meshStandardMaterial color="#8b5cf6" transparent opacity={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* Props */}
      {Array.from({ length: numProps }).map((_, i) => {
        const x = numProps === 1 ? 0 : (i / (numProps - 1) - 0.5) * BS * 0.8;
        return (
          <group key={`p${i}`}>
            {/* Prop glow ring */}
            <PropGlow x={x} status={status} utilisation={utilisation} />

            {/* Outer tube */}
            <mesh position={[x, PH * 0.35, 0]}>
              <cylinderGeometry args={[0.02, 0.02, PH * 0.7, 8]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Inner tube */}
            <mesh position={[x, PH * 0.75, 0]}>
              <cylinderGeometry args={[0.014, 0.014, PH * 0.5, 8]} />
              <meshStandardMaterial color="#d97706" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Pin detail */}
            <mesh position={[x, PH * 0.55, 0.02]} rotation={[0, Math.PI / 2, Math.PI / 2]}>
              <cylinderGeometry args={[0.004, 0.004, 0.05, 6]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            {/* Base plate */}
            <mesh position={[x, 0.01, 0]}>
              <boxGeometry args={[0.06, 0.02, 0.06]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            {/* Head plate */}
            <mesh position={[x, PH, 0]}>
              <boxGeometry args={[0.06, 0.02, 0.06]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            {/* Animated load arrow */}
            <AnimatedLoadArrow x={x} pH={PH} load={propLoad} />
          </group>
        );
      })}

      {/* Dimension: prop height */}
      <DimensionLine
        start={[BS / 2 * 0.8 + 0.15, 0, 0.3]}
        end={[BS / 2 * 0.8 + 0.15, PH, 0.3]}
        label={`H = ${(propHeight / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />

      {/* Dimension: beam span */}
      <DimensionLine
        start={[-BS / 2, -0.08, 0]}
        end={[BS / 2, -0.08, 0]}
        label={`${(beamSpan / 1000).toFixed(1)}m`}
        color="#94a3b8"
      />

      {/* Labels */}
      <Text position={[0, PH + 0.55, 0]} fontSize={0.08} color="#00d9ff">
        {`Vertical Props`}
      </Text>
      <Text position={[0, PH + 0.66, 0]} fontSize={0.06} color="#f59e0b">
        {`${numProps} props, ${propLoad} kN each`}
      </Text>

      {/* Status */}
      <mesh position={[BS / 2 + 0.1, PH + 0.15, 0.3]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[BS / 2 + 0.1, PH + 0.23, 0.3]} fontSize={0.045} color={sc}>
        {status}
      </Text>
    </group>
  );
}
