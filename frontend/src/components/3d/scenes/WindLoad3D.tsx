// =============================================================================
// 3D Scene: Wind Load — Building with wind pressure arrows on each face
// BS EN 1991-1-4 Wind Action Visualization
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface WindLoad3DProps {
  buildingHeight?: number;  // m
  buildingWidth?: number;   // m
  buildingDepth?: number;   // m
  wk_windward?: number;     // kN/m²
  wk_leeward?: number;      // kN/m²
  wk_side?: number;          // kN/m²
  wk_roof?: number;          // kN/m²
  qp_z?: number;            // kN/m²
  status?: 'PASS' | 'FAIL';
}

// ─── Pressure arrow pointing along +X ──────────────────────────────────────
function PressureArrow({ position, length, color, label }: {
  position: [number, number, number];
  length: number;
  color: string;
  label?: string;
}) {
  const shaft = Math.max(0.1, length - 0.15);
  return (
    <group position={position}>
      {/* Shaft */}
      <mesh position={[shaft / 2, 0, 0]}>
        <boxGeometry args={[shaft, 0.04, 0.04]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {/* Arrowhead */}
      <mesh position={[shaft + 0.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.15, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {label && (
        <Text position={[shaft + 0.35, 0, 0]} fontSize={0.12} color={color}>
          {label}
        </Text>
      )}
    </group>
  );
}

// ─── Wind direction indicator ───────────────────────────────────────────────
function WindIndicator({ x, y }: { x: number; y: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x = x + Math.sin(clock.getElapsedTime() * 2) * 0.15;
    }
  });
  return (
    <group ref={ref} position={[x, y, 0]}>
      <mesh>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ─── Ground plane ───────────────────────────────────────────────────────────
function Ground({ width }: { width: number }) {
  return (
    <mesh position={[0, -0.03, 0]} receiveShadow>
      <boxGeometry args={[width * 2.5, 0.06, width * 2.5]} />
      <meshStandardMaterial color="#1a1f3a" roughness={1} />
    </mesh>
  );
}

// =============================================================================
// Main Component
// =============================================================================
export default function WindLoad3D({
  buildingHeight = 10,
  buildingWidth = 20,
  buildingDepth = 12,
  wk_windward = 0.8,
  wk_leeward = 0.4,
  wk_side = 0.5,
  wk_roof = 0.6,
  status = 'PASS',
}: WindLoad3DProps) {
  // Scale everything to fit the viewport (normalize to ~4 units max)
  const maxDim = Math.max(buildingHeight, buildingWidth, buildingDepth, 1);
  const s = 3 / maxDim;
  const H = buildingHeight * s;
  const W = buildingWidth * s;
  const D = buildingDepth * s;

  // Arrow lengths proportional to pressure (max ~1.5 units)
  const maxP = Math.max(wk_windward, wk_leeward, wk_side, wk_roof, 0.01);
  const arrowScale = 1.2 / maxP;

  const statusColor = status === 'PASS' ? '#22c55e' : '#ef4444';

  // Generate windward face arrows (3 rows × 2 cols on the -X face)
  const windwardArrows = useMemo(() => {
    const arrows: [number, number, number][] = [];
    const nY = 3, nZ = 2;
    for (let iy = 0; iy < nY; iy++) {
      for (let iz = 0; iz < nZ; iz++) {
        const y = (iy + 0.5) * (H / nY);
        const z = -D / 2 + (iz + 0.5) * (D / nZ);
        arrows.push([-W / 2 - wk_windward * arrowScale - 0.1, y, z]);
      }
    }
    return arrows;
  }, [H, W, D, wk_windward, arrowScale]);

  // Leeward arrows (suction, pointing away from +X face)
  const leewardArrows = useMemo(() => {
    const arrows: [number, number, number][] = [];
    const nY = 3, nZ = 2;
    for (let iy = 0; iy < nY; iy++) {
      for (let iz = 0; iz < nZ; iz++) {
        const y = (iy + 0.5) * (H / nY);
        const z = -D / 2 + (iz + 0.5) * (D / nZ);
        arrows.push([W / 2 + 0.05, y, z]);
      }
    }
    return arrows;
  }, [H, W, D]);

  // Roof arrows (suction, pointing upward from top face)
  const roofArrows = useMemo(() => {
    const arrows: [number, number, number][] = [];
    const nX = 3, nZ = 2;
    for (let ix = 0; ix < nX; ix++) {
      for (let iz = 0; iz < nZ; iz++) {
        const x = -W / 2 + (ix + 0.5) * (W / nX);
        const z = -D / 2 + (iz + 0.5) * (D / nZ);
        arrows.push([x, H + 0.05, z]);
      }
    }
    return arrows;
  }, [H, W, D]);

  return (
    <group position={[0, 0, 0]}>
      <Ground width={Math.max(W, D) + 2} />

      {/* Building */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          color="#334155"
          emissive={statusColor}
          emissiveIntensity={0.05}
          transparent
          opacity={0.85}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Building edges wireframe */}
      <lineSegments position={[0, H / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(W, H, D)]} />
        <lineBasicMaterial color="#64748b" transparent opacity={0.4} />
      </lineSegments>

      {/* Windward arrows (pressure, +X direction into face) */}
      {windwardArrows.map((pos, i) => (
        <PressureArrow
          key={`ww-${i}`}
          position={pos}
          length={wk_windward * arrowScale}
          color="#ef4444"
          label={i === 2 ? `${wk_windward.toFixed(2)}` : undefined}
        />
      ))}

      {/* Leeward arrows (suction, +X direction away from face) */}
      {leewardArrows.map((pos, i) => (
        <PressureArrow
          key={`lw-${i}`}
          position={pos}
          length={wk_leeward * arrowScale}
          color="#f59e0b"
          label={i === 2 ? `${wk_leeward.toFixed(2)}` : undefined}
        />
      ))}

      {/* Roof arrows (suction, upward) */}
      {roofArrows.map((pos, i) => (
        <group key={`rf-${i}`} position={pos} rotation={[0, 0, Math.PI / 2]}>
          <PressureArrow
            position={[0, 0, 0]}
            length={wk_roof * arrowScale}
            color="#38bdf8"
            label={i === 2 ? `${wk_roof.toFixed(2)}` : undefined}
          />
        </group>
      ))}

      {/* Wind flow particles */}
      {[0.3, 0.6, 0.9].map((frac) => (
        <WindIndicator
          key={frac}
          x={-W / 2 - 2}
          y={H * frac}
        />
      ))}

      {/* Labels */}
      <Text position={[0, H + 0.8, 0]} fontSize={0.18} color="#94a3b8">
        Wind Action — BS EN 1991-1-4
      </Text>
      <Text position={[-W / 2 - 1.5, -0.25, 0]} fontSize={0.14} color="#ef4444">
        Windward
      </Text>
      <Text position={[W / 2 + 1.0, -0.25, 0]} fontSize={0.14} color="#f59e0b">
        Leeward
      </Text>
      <Text position={[0, H + 0.5, 0]} fontSize={0.13} color="#38bdf8">
        Roof (suction)
      </Text>

      {/* Dimension: height */}
      <group position={[-W / 2 - 0.3, 0, D / 2 + 0.3]}>
        <mesh position={[0, H / 2, 0]}>
          <boxGeometry args={[0.02, H, 0.02]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        <Text position={[0.2, H / 2, 0]} fontSize={0.12} color="#94a3b8">
          {buildingHeight}m
        </Text>
      </group>

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
      <pointLight position={[-3, 4, 3]} intensity={0.3} color="#38bdf8" />
    </group>
  );
}
