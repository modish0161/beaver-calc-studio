import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function WeldGlow({ position, size, rotation, status, utilisation }: { position: [number, number, number]; size: [number, number, number]; rotation?: [number, number, number]; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={position} rotation={rotation || [0, 0, 0]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} />
    </mesh>
  );
}

function PulsingForceArrow({ position, force }: { position: [number, number, number]; force: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.z = position[2] + Math.sin(clock.getElapsedTime() * 2) * 0.02;
  });
  return (
    <group ref={ref} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.17]}>
        <coneGeometry args={[0.05, 0.08, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.3, 0, 0]} fontSize={0.09} color="#ef4444">
        {`F = ${force} kN`}
      </Text>
    </group>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dz = end[2] - start[2]; const dy = end[1] - start[1];
  const len = Math.sqrt(dz * dz + dy * dy) || Math.abs(end[0] - start[0]);
  const depth = Math.abs(dz) > Math.abs(dy);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={depth ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx, my + 0.06, mz + (depth ? 0.08 : 0)]} fontSize={0.07} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface WeldSizing3DProps {
  weldLength?: number;
  weldThroat?: number;
  weldType?: 'fillet' | 'butt';
  plateThick1?: number;
  plateThick2?: number;
  force?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function WeldSizing3D({
  weldLength = 200,
  weldThroat = 6,
  weldType = 'fillet',
  plateThick1 = 12,
  plateThick2 = 10,
  force = 150,
  utilisation = 66,
  status = 'PASS',
}: WeldSizing3DProps) {
  const s = 1 / 80;
  const WL = weldLength * s;
  const WT = Math.max(weldThroat * s, 0.05);
  const PT1 = plateThick1 * s;
  const PT2 = plateThick2 * s;
  const plateW = 1.5;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Horizontal plate */}
      <mesh position={[0, -PT1 / 2, 0]} castShadow>
        <boxGeometry args={[plateW, PT1, WL + 0.5]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vertical plate */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[PT2, 1, WL + 0.3]} />
        <meshStandardMaterial color="#71717a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Weld (fillet or butt) with glow */}
      {weldType === 'fillet' ? (
        <>
          <mesh position={[-PT2 / 2 - WT / 2, WT / 2, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[WT, WT, WL]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
          </mesh>
          <WeldGlow position={[-PT2 / 2 - WT / 2, WT / 2, 0]} size={[WT * 1.6, WT * 1.6, WL]} rotation={[0, 0, Math.PI / 4]} status={status} utilisation={utilisation} />
          <mesh position={[PT2 / 2 + WT / 2, WT / 2, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[WT, WT, WL]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
          </mesh>
          <WeldGlow position={[PT2 / 2 + WT / 2, WT / 2, 0]} size={[WT * 1.6, WT * 1.6, WL]} rotation={[0, 0, -Math.PI / 4]} status={status} utilisation={utilisation} />
        </>
      ) : (
        <>
          <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[PT2 + 0.02, WT, WL]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
          </mesh>
          <WeldGlow position={[0, 0.01, 0]} size={[PT2 + 0.06, WT * 1.5, WL]} status={status} utilisation={utilisation} />
        </>
      )}

      {/* Weld symbol annotation line */}
      <mesh position={[plateW / 2 + 0.3, 0.3, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.008, 0.008, 0.5, 4]} />
        <meshStandardMaterial color="#00d9ff" />
      </mesh>

      {/* Animated force arrow */}
      <PulsingForceArrow position={[0, 0.8, WL / 2 + 0.3]} force={force} />

      {/* Dimension lines */}
      <DimensionLine start={[-plateW / 2, -PT1 - 0.1, -WL / 2]} end={[-plateW / 2, -PT1 - 0.1, WL / 2]} label={`L=${weldLength}mm`} offset={0} />

      {/* Labels */}
      <Text position={[plateW / 2 + 0.5, 0.5, 0]} fontSize={0.08} color="#f59e0b">
        {`a = ${weldThroat}mm ${weldType}`}
      </Text>
      <Text position={[0, 1.3, 0]} fontSize={0.1} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <mesh position={[plateW / 2, 1, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
