import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface HerasFence3DProps {
  panelHeight?: number;
  panelWidth?: number;
  numPanels?: number;
  windLoad?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated wind arrows that pulse and sway */
function AnimatedWindArrows({ totalLen, PH, windLoad }: { totalLen: number; PH: number; windLoad: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.z = -0.08 + Math.sin(t * 2) * 0.02;
    ref.current.children.forEach((c, i) => {
      (c as THREE.Object3D).scale.setScalar(0.9 + Math.sin(t * 3 + i * 1.2) * 0.15);
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 4 }).map((_, i) => {
        const x = (i - 1.5) * totalLen * 0.22;
        return (
          <group key={`wa${i}`} position={[x, PH * 0.5, 0]}>
            <mesh>
              <boxGeometry args={[0.005, 0.005, 0.15]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.012, 0.03, 6]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Panel sway animation under wind */
function SwayingPanel({ x, PH, PW, windLoad }: { x: number; PH: number; PW: number; windLoad: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 1.5) * 0.008 * windLoad;
  });
  return (
    <group ref={ref} position={[x, PH / 2 + 0.02, 0]}>
      {/* Panel frame */}
      <mesh>
        <boxGeometry args={[PW - 0.01, PH, 0.008]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.3} wireframe />
      </mesh>
      {/* Panel mesh fill */}
      <mesh>
        <boxGeometry args={[PW - 0.02, PH - 0.02, 0.003]} />
        <meshStandardMaterial color="#a1a1aa" transparent opacity={0.05} />
      </mesh>
      {/* Horizontal bars */}
      {Array.from({ length: 5 }).map((_, j) => (
        <mesh key={`hb${j}`} position={[0, -PH / 2 + 0.03 + j * PH * 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.003, 0.003, PW - 0.02, 6]} />
          <meshStandardMaterial color="#a1a1aa" metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Status glow ring */
function GlowBase({ x, z, status, utilisation }: { x: number; z: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.04, 0.005, 6, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.15} />
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

export default function HerasFence3D({
  panelHeight = 2000,
  panelWidth = 3450,
  numPanels = 4,
  windLoad = 0.5,
  utilisation = 50,
  status = 'PASS',
}: HerasFence3DProps) {
  const s = 1 / 3000;
  const PH = panelHeight * s;
  const PW = panelWidth * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';
  const totalLen = numPanels * PW;

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[totalLen + 0.4, 0.04, 0.8]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Swaying panels under wind */}
      {Array.from({ length: numPanels }).map((_, i) => {
        const x = (i - (numPanels - 1) / 2) * PW;
        return <SwayingPanel key={`fp${i}`} x={x} PH={PH} PW={PW} windLoad={windLoad} />;
      })}

      {/* Feet/bases with glow */}
      {Array.from({ length: numPanels + 1 }).map((_, i) => {
        const x = (i - numPanels / 2) * PW;
        return (
          <group key={`fb${i}`}>
            <mesh position={[x, 0.015, 0]}>
              <boxGeometry args={[0.06, 0.03, 0.15]} />
              <meshStandardMaterial color="#525252" roughness={0.8} />
            </mesh>
            <mesh position={[x, PH + 0.025, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.04, 8]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
            <GlowBase x={x} z={0} status={status} utilisation={utilisation} />
          </group>
        );
      })}

      {/* Anti-lift weights */}
      {Array.from({ length: Math.ceil((numPanels + 1) / 2) }).map((_, i) => {
        const x = (i * 2 - numPanels / 2) * PW;
        return (
          <mesh key={`wt${i}`} position={[x, 0.05, 0.12]}>
            <boxGeometry args={[0.08, 0.06, 0.08]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} />
          </mesh>
        );
      })}

      {/* Animated wind arrows */}
      <AnimatedWindArrows totalLen={totalLen} PH={PH} windLoad={windLoad} />

      {/* Dimension: panel height */}
      <DimensionLine
        start={[totalLen / 2 + 0.1, 0, 0.2]}
        end={[totalLen / 2 + 0.1, PH, 0.2]}
        label={`${(panelHeight / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />
      {/* Dimension: total length */}
      <DimensionLine
        start={[-totalLen / 2, -0.06, 0]}
        end={[totalLen / 2, -0.06, 0]}
        label={`${numPanels} × ${(panelWidth / 1000).toFixed(1)}m`}
      />

      {/* Labels */}
      <Text position={[0, PH + 0.12, 0]} fontSize={0.07} color="#00d9ff">
        {`Heras Fencing`}
      </Text>
      <Text position={[0, PH + 0.25, 0]} fontSize={0.06} color="#3b82f6">
        {`Wind ${windLoad} kN/m²`}
      </Text>

      {/* Status indicator */}
      <mesh position={[totalLen / 2, PH + 0.05, 0.1]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[totalLen / 2, PH + 0.13, 0.1]} fontSize={0.04} color={sc}>
        {status}
      </Text>
    </group>
  );
}
