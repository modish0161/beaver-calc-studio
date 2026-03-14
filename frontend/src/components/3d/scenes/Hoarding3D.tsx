import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface Hoarding3DProps {
  boardingHeight?: number;
  boardingLength?: number;
  postSpacing?: number;
  windLoad?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated wind arrows with swaying motion */
function AnimatedWindArrows({ BL, BH }: { BL: number; BH: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.z = -0.12 + Math.sin(t * 2.5) * 0.02;
    ref.current.children.forEach((c, i) => {
      (c as THREE.Object3D).scale.setScalar(0.85 + Math.sin(t * 3 + i) * 0.2);
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 5 }).map((_, i) => {
        const x = (i - 2) * BL * 0.18;
        return (
          <group key={`wa${i}`} position={[x, BH * 0.5, 0]}>
            <mesh>
              <boxGeometry args={[0.005, 0.005, 0.2]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.012, 0.03, 6]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Subtle board sway under wind */
function SwayingBoard({ BH, BL, windLoad }: { BH: number; BL: number; windLoad: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 1.2) * 0.005 * windLoad;
  });
  return (
    <mesh ref={ref} position={[0, BH / 2, 0]}>
      <boxGeometry args={[BL, BH, 0.015]} />
      <meshStandardMaterial color="#d4a574" roughness={0.8} />
    </mesh>
  );
}

/** Glow base at post positions */
function GlowBase({ x, status, utilisation }: { x: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, 0.005, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.06, 0.005, 6, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.12} />
    </mesh>
  );
}

/** Dimension line */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.04, (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0]; const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, start[2]]}>
        <boxGeometry args={[dx !== 0 ? len : 0.003, dy !== 0 ? len : 0.003, 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={mid} fontSize={0.05} color={color}>{label}</Text>
    </group>
  );
}

export default function Hoarding3D({
  boardingHeight = 2400,
  boardingLength = 8000,
  postSpacing = 2400,
  windLoad = 0.6,
  utilisation = 50,
  status = 'PASS',
}: Hoarding3DProps) {
  const s = 1 / 3000;
  const BH = boardingHeight * s;
  const BL = boardingLength * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';
  const numPosts = Math.max(2, Math.floor(boardingLength / postSpacing) + 1);

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[BL + 0.5, 0.04, 1]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Swaying board panels */}
      <SwayingBoard BH={BH} BL={BL} windLoad={windLoad} />

      {/* Posts with glow bases */}
      {Array.from({ length: numPosts }).map((_, i) => {
        const x = (i - (numPosts - 1) / 2) * (BL / (numPosts - 1));
        return (
          <group key={`hp${i}`}>
            <mesh position={[x, BH / 2, 0.015]}>
              <boxGeometry args={[0.03, BH, 0.03]} />
              <meshStandardMaterial color="#78716c" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[x, 0.04, 0.04]}>
              <boxGeometry args={[0.1, 0.08, 0.15]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.8} />
            </mesh>
            <mesh position={[x, BH * 0.35, 0.15]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[0.02, BH * 0.65, 0.02]} />
              <meshStandardMaterial color="#78716c" metalness={0.5} />
            </mesh>
            <GlowBase x={x} status={status} utilisation={utilisation} />
          </group>
        );
      })}

      {/* Top rail */}
      <mesh position={[0, BH, 0.015]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.025, BL, 0.025]} />
        <meshStandardMaterial color="#78716c" metalness={0.5} />
      </mesh>

      {/* Animated wind arrows */}
      <AnimatedWindArrows BL={BL} BH={BH} />

      {/* Warning stripes */}
      {Array.from({ length: Math.ceil(BL / 0.15) }).map((_, i) => {
        const x = -BL / 2 + i * 0.15 + 0.075;
        if (x > BL / 2 - 0.05) return null;
        return (
          <mesh key={`ws${i}`} position={[x, BH - 0.05, -0.009]}>
            <boxGeometry args={[0.06, 0.08, 0.001]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#f59e0b' : '#1e293b'} />
          </mesh>
        );
      })}

      {/* Dimension: height */}
      <DimensionLine
        start={[BL / 2 + 0.12, 0, 0]}
        end={[BL / 2 + 0.12, BH, 0]}
        label={`${(boardingHeight / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />
      {/* Dimension: length */}
      <DimensionLine
        start={[-BL / 2, -0.06, 0]}
        end={[BL / 2, -0.06, 0]}
        label={`${(boardingLength / 1000).toFixed(1)}m`}
      />

      {/* Labels */}
      <Text position={[0, BH + 0.15, 0]} fontSize={0.08} color="#00d9ff">
        {`Hoarding`}
      </Text>
      <Text position={[0, BH + 0.28, 0]} fontSize={0.06} color="#3b82f6">
        {`Wind ${windLoad} kN/m², posts @ ${(postSpacing / 1000).toFixed(1)}m`}
      </Text>

      {/* Status */}
      <mesh position={[BL / 2, BH + 0.05, 0.1]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[BL / 2, BH + 0.13, 0.1]} fontSize={0.04} color={sc}>
        {status}
      </Text>
    </group>
  );
}
