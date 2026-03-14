import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function SoilPressureArrow({ position, len, index }: { position: [number, number, number]; len: number; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.scale.x = 1 + Math.sin(clock.getElapsedTime() * 2 + index * 0.8) * 0.15;
  });
  return (
    <group ref={ref} position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, len, 6]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function WallGlow({ position, height, depth, status, utilisation }: { position: [number, number, number]; height: number; depth: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={position} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[depth, height]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dy = end[1] - start[1];
  const len = Math.abs(dy) || Math.sqrt((end[0] - start[0]) ** 2 + (end[2] - start[2]) ** 2);
  const vertical = Math.abs(dy) > 0.01;
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={vertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx + (vertical ? 0.08 : 0), my + (vertical ? 0 : 0.04), mz]} fontSize={0.06} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface SheetPile3DProps {
  wallHeight?: number;
  embedDepth?: number;
  sheetWidth?: number;
  numPiles?: number;
  excavationDepth?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function SheetPile3D({
  wallHeight = 6000,
  embedDepth = 3000,
  sheetWidth = 600,
  numPiles = 5,
  excavationDepth = 4000,
  utilisation = 72,
  status = 'PASS',
}: SheetPile3DProps) {
  const s = 1 / 2000;
  const H = wallHeight * s;
  const embed = embedDepth * s;
  const sw = sheetWidth * s;
  const totalH = H + embed;
  const excD = excavationDepth * s;
  const depth = numPiles * sw;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group position={[0, -embed, 0]}>
      {/* Ground level left (excavation side) */}
      <mesh position={[-1.2, embed - excD / 2, 0]} receiveShadow>
        <boxGeometry args={[2, excD, depth + 0.5]} />
        <meshStandardMaterial color="#6b5b45" transparent opacity={0.3} />
      </mesh>
      {/* Ground level right (retained side) */}
      <mesh position={[0.8, embed / 2, 0]} receiveShadow>
        <boxGeometry args={[1.2, embed, depth + 0.5]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={0.4} />
      </mesh>

      {/* Wall glow */}
      <WallGlow position={[0.01, totalH / 2, 0]} height={totalH} depth={depth} status={status} utilisation={utilisation} />

      {/* Sheet piles - Z-profile approximation */}
      {Array.from({ length: numPiles }).map((_, i) => {
        const z = (i - (numPiles - 1) / 2) * sw;
        return (
          <group key={i} position={[0, totalH / 2, z]}>
            <mesh castShadow>
              <boxGeometry args={[0.04, totalH, sw * 0.9]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Flange offsets for Z-shape */}
            <mesh position={[0.03, 0, -sw * 0.3]}>
              <boxGeometry args={[0.02, totalH, sw * 0.3]} />
              <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[-0.03, 0, sw * 0.3]}>
              <boxGeometry args={[0.02, totalH, sw * 0.3]} />
              <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        );
      })}

      {/* Waling beam */}
      <mesh position={[0.06, embed + 0.15, 0]}>
        <boxGeometry args={[0.08, 0.12, depth + 0.2]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Animated soil pressure diagram (active side) */}
      {[0.2, 0.4, 0.6, 0.8].map((frac, i) => {
        const y = embed * frac;
        const len = frac * 0.4;
        return <SoilPressureArrow key={i} position={[len / 2 + 0.08, y, depth / 2 + 0.2]} len={len} index={i} />;
      })}

      {/* Dimension lines */}
      <DimensionLine start={[-0.5, 0, depth / 2 + 0.3]} end={[-0.5, totalH, depth / 2 + 0.3]} label={`Total=${((wallHeight + embedDepth) / 1000).toFixed(1)}m`} offset={0} />
      <DimensionLine start={[-0.5, 0, depth / 2 + 0.5]} end={[-0.5, embed, depth / 2 + 0.5]} label={`Embed=${(embedDepth / 1000).toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[0, totalH + 0.2, 0]} fontSize={0.08} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <mesh position={[0, totalH + 0.05, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
