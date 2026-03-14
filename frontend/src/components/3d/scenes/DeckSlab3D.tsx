// =============================================================================
// 3D Scene: Deck Slab — reinforced concrete slab with rebar layers, supports,
// UDL arrows, dimension labels, and utilisation-based colouring.
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface DeckSlab3DProps {
  /** Span in X-direction (metres) */
  spanX?: number;
  /** Span in Y-direction (metres) */
  spanY?: number;
  /** Overall slab thickness (mm) */
  thickness?: number;
  /** Bottom cover (mm) */
  cover?: number;
  /** Bar diameter (mm) */
  barDiameter?: number;
  /** Bar spacing X-direction (mm) */
  barSpacingX?: number;
  /** Bar spacing Y-direction (mm) */
  barSpacingY?: number;
  /** Support condition X ('simply_supported' | 'continuous') */
  supportX?: string;
  /** Support condition Y ('simply_supported' | 'continuous') */
  supportY?: string;
  /** UDL in kN/m² */
  udl?: number;
  /** One-way slab flag */
  isOneWay?: boolean;
  /** Overall max utilisation 0-100+ */
  utilisation?: number;
  /** Overall status */
  status?: 'PASS' | 'FAIL';
  /** Concrete grade label */
  concreteGrade?: string;
  /** Steel grade label */
  steelGrade?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SupportTriangle({
  position,
  rotation = [0, 0, 0],
  continuous = false,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  continuous?: boolean;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <coneGeometry args={[0.15, 0.25, 3]} />
        <meshStandardMaterial
          color={continuous ? '#a855f7' : '#00d9ff'}
          emissive={continuous ? '#a855f7' : '#00d9ff'}
          emissiveIntensity={0.4}
        />
      </mesh>
      {continuous && (
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.35, 0.03, 0.15]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function LoadArrow({
  position,
  magnitude,
  color = '#fbbf24',
}: {
  position: [number, number, number];
  magnitude: number;
  color?: string;
}) {
  const arrowLen = Math.min(0.6, Math.max(0.2, magnitude / 40));
  return (
    <group position={position}>
      <mesh position={[0, arrowLen / 2 + 0.06, 0]}>
        <cylinderGeometry args={[0.015, 0.015, arrowLen, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.045, 0.09, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function UDLGrid({
  lx,
  lz,
  y,
  magnitude,
}: {
  lx: number;
  lz: number;
  y: number;
  magnitude: number;
}) {
  const positions = useMemo(() => {
    const pts: [number, number, number][] = [];
    const nx = Math.max(3, Math.round(lx / 0.8));
    const nz = Math.max(2, Math.round(lz / 0.8));
    for (let ix = 0; ix <= nx; ix++) {
      for (let iz = 0; iz <= nz; iz++) {
        pts.push([
          -lx / 2 + (ix / nx) * lx,
          y,
          -lz / 2 + (iz / nz) * lz,
        ]);
      }
    }
    return pts;
  }, [lx, lz, y]);

  return (
    <group>
      {positions.map((p, i) => (
        <LoadArrow key={i} position={p} magnitude={magnitude} />
      ))}
    </group>
  );
}

/** Pulsating glow ring around the slab */
function GlowRing({
  status,
  lx,
  lz,
  utilisation,
}: {
  status: 'PASS' | 'FAIL';
  lx: number;
  lz: number;
  utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const radius = Math.sqrt(lx * lx + lz * lz) / 2 + 0.15;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.03;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.08 + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 8, 64]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.8} transparent opacity={0.1} />
    </mesh>
  );
}

/** Single rebar line running along one axis */
function RebarLine({
  start,
  end,
  y,
  diameter,
  color = '#fbbf24',
}: {
  start: [number, number, number];
  end: [number, number, number];
  y?: number;
  diameter: number;
  color?: string;
}) {
  const dir = new THREE.Vector3().subVectors(
    new THREE.Vector3(...end),
    new THREE.Vector3(...start),
  );
  const length = dir.length();
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    y ?? (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const rotation = new THREE.Euler(0, 0, 0);
  // Determine orientation
  if (Math.abs(dir.x) > Math.abs(dir.z)) {
    // runs along X
    rotation.set(0, 0, Math.PI / 2);
  } else {
    // runs along Z
    rotation.set(Math.PI / 2, 0, 0);
  }
  const r = diameter / 2000; // mm → m radius
  return (
    <mesh position={mid} rotation={rotation}>
      <cylinderGeometry args={[r, r, length, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        metalness={0.6}
        roughness={0.4}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DeckSlab3D({
  spanX = 6,
  spanY = 6,
  thickness = 200,
  cover = 25,
  barDiameter = 12,
  barSpacingX = 150,
  barSpacingY = 150,
  supportX = 'continuous',
  supportY = 'continuous',
  udl = 15,
  isOneWay = false,
  utilisation = 0,
  status = 'PASS',
  concreteGrade = 'C30/37',
  steelGrade = 'B500B',
}: DeckSlab3DProps) {
  const util = utilisation;

  // Scale: 1 unit = 1 metre
  const lx = Math.max(1, spanX);
  const lz = Math.max(1, spanY);
  const h = thickness / 1000; // mm → m
  const halfX = lx / 2;
  const halfZ = lz / 2;
  const coverM = cover / 1000;
  const barR = barDiameter / 2000;

  // Vertical centre of slab at y=0
  const slabY = 0;

  // Utilisation-based concrete colour
  const concreteColor = useMemo(() => {
    if (util > 100) return '#7f1d1d'; // deep red tint
    if (util > 90) return '#78350f'; // amber/brown tint
    return '#64748b'; // default slate
  }, [util]);

  const emissiveColor = useMemo(() => {
    if (util > 100) return '#ef4444';
    if (util > 90) return '#f97316';
    return '#a855f7'; // purple for concrete
  }, [util]);

  // Bottom rebar positions (X-direction = outer layer, main bars)
  const rebarsX = useMemo(() => {
    const spacing = barSpacingX / 1000;
    const count = Math.floor(lz / spacing) + 1;
    const startZ = -lz / 2 + spacing * 0.5;
    const y = slabY - h / 2 + coverM + barR;
    const result: { z: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const z = startZ + i * spacing;
      if (z <= lz / 2) result.push({ z, y });
    }
    return result;
  }, [barSpacingX, lz, h, coverM, barR, slabY]);

  // Bottom rebar positions (Y-direction = inner layer, distribution/secondary bars)
  const rebarsY = useMemo(() => {
    const spacing = barSpacingY / 1000;
    const count = Math.floor(lx / spacing) + 1;
    const startX = -lx / 2 + spacing * 0.5;
    const y = slabY - h / 2 + coverM + barR * 2 + barR; // above X-bars
    const result: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      if (x <= lx / 2) result.push({ x, y });
    }
    return result;
  }, [barSpacingY, lx, h, coverM, barR, slabY]);

  // Support positions
  const isContX = supportX === 'continuous' || supportX === 'fixed';
  const isContY = supportY === 'continuous' || supportY === 'fixed';

  return (
    <group>
      {/* ============ CONCRETE SLAB BODY ============ */}
      <mesh position={[0, slabY, 0]} castShadow>
        <boxGeometry args={[lx, h, lz]} />
        <meshStandardMaterial
          color={concreteColor}
          emissive={emissiveColor}
          emissiveIntensity={0.06}
          metalness={0.1}
          roughness={0.9}
          transparent
          opacity={0.75}
        />
      </mesh>
      {/* Slab edges */}
      <lineSegments position={[0, slabY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(lx, h, lz)]} />
        <lineBasicMaterial color="#a855f7" transparent opacity={0.5} />
      </lineSegments>

      {/* ============ BOTTOM REBAR — X-DIRECTION (main bars, run along X) ============ */}
      {rebarsX.map((bar, i) => (
        <RebarLine
          key={`rx-${i}`}
          start={[-halfX + 0.05, bar.y, bar.z]}
          end={[halfX - 0.05, bar.y, bar.z]}
          diameter={barDiameter}
          color="#fbbf24"
        />
      ))}

      {/* ============ BOTTOM REBAR — Y-DIRECTION (distribution, run along Z) ============ */}
      {rebarsY.map((bar, i) => (
        <RebarLine
          key={`ry-${i}`}
          start={[bar.x, bar.y, -halfZ + 0.05]}
          end={[bar.x, bar.y, halfZ - 0.05]}
          diameter={barDiameter * (isOneWay ? 0.8 : 1)}
          color="#fb923c"
        />
      ))}

      {/* ============ TOP SURFACE GRID TEXTURE (subtle) ============ */}
      {Array.from({ length: Math.min(20, Math.floor(lx / 0.4)) }, (_, i) => {
        const x = -halfX + 0.2 + i * (lx / Math.min(20, Math.floor(lx / 0.4)));
        if (x > halfX - 0.1) return null;
        return (
          <mesh key={`tg-x-${i}`} position={[x, slabY + h / 2 - 0.003, 0]}>
            <boxGeometry args={[0.004, 0.002, lz * 0.9]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} />
          </mesh>
        );
      })}
      {Array.from({ length: Math.min(20, Math.floor(lz / 0.4)) }, (_, i) => {
        const z = -halfZ + 0.2 + i * (lz / Math.min(20, Math.floor(lz / 0.4)));
        if (z > halfZ - 0.1) return null;
        return (
          <mesh key={`tg-z-${i}`} position={[0, slabY + h / 2 - 0.003, z]}>
            <boxGeometry args={[lx * 0.9, 0.002, 0.004]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} />
          </mesh>
        );
      })}

      {/* ============ SUPPORTS — X edges (front/back at z = ±halfZ) ============ */}
      {[-halfZ, halfZ].map((z, zi) => {
        const count = Math.max(2, Math.round(lx / 1.5));
        return Array.from({ length: count }, (_, i) => {
          const x = -halfX + (i / (count - 1)) * lx;
          return (
            <SupportTriangle
              key={`sx-${zi}-${i}`}
              position={[x, slabY - h / 2 - 0.15, z]}
              continuous={isContY}
            />
          );
        });
      })}

      {/* ============ SUPPORTS — Y edges (left/right at x = ±halfX) ============ */}
      {[-halfX, halfX].map((x, xi) => {
        const count = Math.max(2, Math.round(lz / 1.5));
        return Array.from({ length: count }, (_, i) => {
          const z = -halfZ + (i / (count - 1)) * lz;
          return (
            <SupportTriangle
              key={`sy-${xi}-${i}`}
              position={[x, slabY - h / 2 - 0.15, z]}
              rotation={[0, Math.PI / 2, 0]}
              continuous={isContX}
            />
          );
        });
      })}

      {/* ============ BEARING LEDGES (continuous support lines) ============ */}
      {/* X-direction bearing edges */}
      {[-halfZ, halfZ].map((z, i) => (
        <mesh key={`bx-${i}`} position={[0, slabY - h / 2 - 0.01, z]}>
          <boxGeometry args={[lx, 0.02, 0.12]} />
          <meshStandardMaterial
            color={isContY ? '#a855f7' : '#00d9ff'}
            emissive={isContY ? '#a855f7' : '#00d9ff'}
            emissiveIntensity={0.2}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
      {/* Y-direction bearing edges */}
      {[-halfX, halfX].map((x, i) => (
        <mesh key={`by-${i}`} position={[x, slabY - h / 2 - 0.01, 0]}>
          <boxGeometry args={[0.12, 0.02, lz]} />
          <meshStandardMaterial
            color={isContX ? '#a855f7' : '#00d9ff'}
            emissive={isContX ? '#a855f7' : '#00d9ff'}
            emissiveIntensity={0.2}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* ============ UDL ARROWS ON TOP SURFACE ============ */}
      <UDLGrid lx={lx * 0.85} lz={lz * 0.85} y={slabY + h / 2} magnitude={udl} />

      {/* ============ DIMENSION LABELS ============ */}
      {/* Span X label (front edge) */}
      <Text
        position={[0, slabY - h / 2 - 0.55, halfZ + 0.3]}
        fontSize={0.15}
        color="#00d9ff"
        anchorX="center"
      >
        {spanX.toFixed(1)} m
      </Text>
      {/* Span X dimension lines */}
      <mesh position={[0, slabY - h / 2 - 0.45, halfZ + 0.3]}>
        <boxGeometry args={[lx, 0.008, 0.008]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.3} />
      </mesh>
      {[-halfX, halfX].map((x, i) => (
        <mesh key={`dx-${i}`} position={[x, slabY - h / 2 - 0.45, halfZ + 0.3]}>
          <boxGeometry args={[0.008, 0.12, 0.008]} />
          <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Span Y label (right edge) */}
      <Text
        position={[halfX + 0.3, slabY - h / 2 - 0.55, 0]}
        fontSize={0.15}
        color="#a855f7"
        anchorX="center"
      >
        {spanY.toFixed(1)} m
      </Text>
      {/* Span Y dimension lines */}
      <mesh position={[halfX + 0.3, slabY - h / 2 - 0.45, 0]}>
        <boxGeometry args={[0.008, 0.008, lz]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} />
      </mesh>
      {[-halfZ, halfZ].map((z, i) => (
        <mesh key={`dy-${i}`} position={[halfX + 0.3, slabY - h / 2 - 0.45, z]}>
          <boxGeometry args={[0.008, 0.12, 0.008]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Thickness label (side) */}
      <Text
        position={[-halfX - 0.35, slabY, halfZ + 0.05]}
        fontSize={0.1}
        color="#f97316"
        anchorX="center"
      >
        h={thickness}mm
      </Text>
      {/* Thickness dimension ticks */}
      {[slabY - h / 2, slabY + h / 2].map((y, i) => (
        <mesh key={`dh-${i}`} position={[-halfX - 0.25, y, halfZ + 0.05]}>
          <boxGeometry args={[0.1, 0.006, 0.006]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[-halfX - 0.25, slabY, halfZ + 0.05]}>
        <boxGeometry args={[0.006, h, 0.006]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
      </mesh>

      {/* ============ MATERIAL LABELS ============ */}
      <Text
        position={[0, slabY + h / 2 + 0.8, 0]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="center"
      >
        {concreteGrade} / {steelGrade}
      </Text>

      {/* UDL label */}
      <Text
        position={[0, slabY + h / 2 + 1.0, 0]}
        fontSize={0.13}
        color="#fbbf24"
        anchorX="center"
      >
        UDL = {udl.toFixed(1)} kN/m²
      </Text>

      {/* Slab type label */}
      <Text
        position={[0, slabY + h / 2 + 0.6, 0]}
        fontSize={0.1}
        color="#22d3ee"
        anchorX="center"
      >
        {isOneWay ? 'ONE-WAY SLAB' : 'TWO-WAY SLAB'}
      </Text>

      {/* Bar specification labels */}
      <Text
        position={[0, slabY - h / 2 - 0.3, -halfZ - 0.2]}
        fontSize={0.09}
        color="#fbbf24"
        anchorX="center"
      >
        X: T{barDiameter}@{barSpacingX}c/c
      </Text>
      <Text
        position={[0, slabY - h / 2 - 0.45, -halfZ - 0.2]}
        fontSize={0.09}
        color="#fb923c"
        anchorX="center"
      >
        Y: T{barDiameter}@{barSpacingY}c/c
      </Text>

      {/* ============ STATUS GLOW ============ */}
      <GlowRing status={status} lx={lx} lz={lz} utilisation={util} />

      {/* ============ COVER INDICATOR (corner detail) ============ */}
      {/* Small highlight showing cover depth at front-left corner */}
      <mesh position={[-halfX + 0.15, slabY - h / 2 + coverM / 2, halfZ - 0.15]}>
        <boxGeometry args={[0.02, coverM, 0.02]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>
      <Text
        position={[-halfX + 0.15, slabY - h / 2 + coverM + 0.05, halfZ - 0.05]}
        fontSize={0.06}
        color="#ef4444"
        anchorX="center"
      >
        c={cover}
      </Text>
    </group>
  );
}
