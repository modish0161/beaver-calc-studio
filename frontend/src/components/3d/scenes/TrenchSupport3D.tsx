import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function SoilPressureArrows({ TD, TW, TL }: { TD: number; TW: number; TL: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.3 + Math.sin(clock.getElapsedTime() * 2 + i * 0.6) * 0.3;
      }
    });
  });
  return (
    <group ref={ref}>
      {/* Triangular earth pressure distribution – both sides */}
      {[-1, 1].map(side =>
        Array.from({ length: 5 }).map((_, i) => {
          const y = -TD * (0.15 + i * 0.18);
          const arrowLen = 0.04 + i * 0.035;
          return (
            <mesh key={`${side}-${i}`} position={[TL / 3, y, side * (TW / 2 + arrowLen / 2 + 0.03)]} rotation={[side > 0 ? 0 : Math.PI, 0, 0]}>
              <coneGeometry args={[0.01, arrowLen, 6]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
            </mesh>
          );
        })
      )}
    </group>
  );
}

function StrutStress({ x, y, TW, colour }: { x: number; y: number; TW: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2.5) * 0.3;
  });
  return (
    <mesh ref={ref} position={[x, y, 0]}>
      <boxGeometry args={[0.04, 0.04, TW + 0.04]} />
      <meshStandardMaterial color="#ef4444" emissive={colour} emissiveIntensity={0.3} metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

function WaterSeepage({ TD, TW, TL }: { TD: number; TW: number; TL: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      mesh.position.y = -TD + 0.01 + ((clock.getElapsedTime() * 0.05 + i * 0.15) % 0.1);
      if (mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).opacity =
          0.2 + Math.sin(clock.getElapsedTime() * 3 + i) * 0.15;
      }
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[(i - 2.5) * TL / 6, -TD + 0.02, 0]}>
          <sphereGeometry args={[0.006, 6, 6]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function DimensionLine({ start, end, label, offset = 0.08 }: { start: [number, number, number]; end: [number, number, number]; label: string; offset?: number }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2;
  const mz = (start[2] + end[2]) / 2;
  const len = Math.sqrt((end[0]-start[0])**2 + (end[1]-start[1])**2 + (end[2]-start[2])**2);
  const angle = Math.atan2(end[1]-start[1], end[0]-start[0]);
  return (
    <group>
      <mesh position={[mx + offset, my, mz]} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.003, 0.003]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mx + offset + 0.06, my, mz]} fontSize={0.045} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface TrenchSupport3DProps {
  trenchDepth?: number;
  trenchWidth?: number;
  trenchLength?: number;
  sheetType?: 'timber' | 'steel';
  strutSpacing?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function TrenchSupport3D({
  trenchDepth = 2500,
  trenchWidth = 1200,
  trenchLength = 6000,
  sheetType = 'timber',
  strutSpacing = 1500,
  utilisation = 0,
  status = 'PASS',
}: TrenchSupport3DProps) {
  const s = 1 / 2000;
  const TD = trenchDepth * s;
  const TW = trenchWidth * s;
  const TL = trenchLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const sheetColor = sheetType === 'timber' ? '#d4a574' : '#71717a';
  const numStruts = Math.max(2, Math.floor(trenchLength / strutSpacing));

  return (
    <group>
      {/* Ground surface */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[TL + 1, 0.04, TW + 2]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Soil strata layers */}
      {[0.3, 0.6].map((r, i) => (
        <mesh key={`strata${i}`} position={[0, -TD * r, TW / 2 + 0.5]}>
          <boxGeometry args={[TL + 0.8, 0.003, 0.8]} />
          <meshStandardMaterial color={i === 0 ? '#78350f' : '#44403c'} transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Trench void */}
      <mesh position={[0, -TD / 2, 0]}>
        <boxGeometry args={[TL, TD, TW]} />
        <meshStandardMaterial color="#44403c" transparent opacity={0.3} />
      </mesh>

      {/* Left sheeting */}
      <mesh position={[0, -TD / 2, -TW / 2 - 0.01]}>
        <boxGeometry args={[TL, TD, 0.02]} />
        <meshStandardMaterial color={sheetColor} roughness={0.7} />
      </mesh>

      {/* Right sheeting */}
      <mesh position={[0, -TD / 2, TW / 2 + 0.01]}>
        <boxGeometry args={[TL, TD, 0.02]} />
        <meshStandardMaterial color={sheetColor} roughness={0.7} />
      </mesh>

      {/* Animated struts with stress glow */}
      {Array.from({ length: numStruts }).map((_, i) => {
        const x = (i - (numStruts - 1) / 2) * (TL / numStruts);
        return (
          <group key={`str${i}`}>
            <StrutStress x={x} y={-TD * 0.25} TW={TW} colour={colour} />
            <StrutStress x={x} y={-TD * 0.7} TW={TW} colour={colour} />
          </group>
        );
      })}

      {/* Walers (horizontal along trench) */}
      {[-1, 1].map((side) => (
        <group key={`waler${side}`}>
          <mesh position={[0, -TD * 0.25, side * (TW / 2 + 0.03)]}>
            <boxGeometry args={[TL, 0.04, 0.03]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} />
          </mesh>
          <mesh position={[0, -TD * 0.7, side * (TW / 2 + 0.03)]}>
            <boxGeometry args={[TL, 0.04, 0.03]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Animated soil pressure arrows */}
      <SoilPressureArrows TD={TD} TW={TW} TL={TL} />

      {/* Animated water seepage at base */}
      <WaterSeepage TD={TD} TW={TW} TL={TL} />

      {/* Dimension lines */}
      <DimensionLine
        start={[TL / 2 + 0.12, 0, 0]}
        end={[TL / 2 + 0.12, -TD, 0]}
        label={`D ${(trenchDepth / 1000).toFixed(1)}m`}
      />
      <DimensionLine
        start={[-TL / 2, 0.1, -TW / 2]}
        end={[-TL / 2, 0.1, TW / 2]}
        label={`W ${(trenchWidth / 1000).toFixed(1)}m`}
        offset={0}
      />

      {/* Labels */}
      <Text position={[0, 0.2, 0]} fontSize={0.08} color="#94a3b8">
        {`Trench ${(trenchWidth / 1000).toFixed(1)}m × ${(trenchDepth / 1000).toFixed(1)}m deep`}
      </Text>
      <Text position={[0, -TD - 0.1, 0]} fontSize={0.06} color="#f59e0b">
        {`Struts @ ${strutSpacing}mm`}
      </Text>

      {/* Status */}
      <mesh position={[TL / 2 + 0.05, 0.1, TW / 2 + 0.1]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[TL / 2 + 0.05, 0.18, TW / 2 + 0.1]} fontSize={0.04} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
