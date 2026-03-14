// =============================================================================
// 3D Scene: Movement Joint — Exceptional Edition
// Bridge deck gap with expansion joint, animated movement, glow ring,
// joint-type-specific geometry, abutments, dimension lines, temperature bar
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

interface MovementJoints3DProps {
  spanLength?: number;       // m
  deckWidth?: number;        // m
  jointGap?: number;         // mm
  jointDepth?: number;       // mm
  totalMovement?: number;    // mm
  jointType?: string;
  bridgeType?: string;
  thermalMovement?: number;  // mm
  creepMovement?: number;    // mm
  utilisation?: number;      // 0–100+
  status?: 'PASS' | 'FAIL';
}

/* Colour by utilisation level */
function utilColor(u: number): string {
  if (u > 100) return '#ff4444';
  if (u > 80) return '#ffaa00';
  return '#00ff88';
}

/* Animated glow ring at base */
function GlowRing({ radius, color }: { radius: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.3;
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    }
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
      <torusGeometry args={[radius, 0.02, 16, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.7} />
    </mesh>
  );
}

/* Animated horizontal movement arrow (pulses) */
function MovementArrow({
  position,
  direction,
  length: arrowLen,
  color = '#f59e0b',
}: {
  position: [number, number, number];
  direction: 1 | -1;
  length: number;
  color?: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.position.x = position[0] + direction * Math.sin(t * 1.5) * 0.03;
      const mat = ref.current.children[0]?.children[0] as THREE.Mesh | undefined;
      if (mat?.material) {
        (mat.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.5 + Math.sin(t * 3) * 0.3;
      }
    }
  });
  return (
    <group ref={ref} position={position}>
      <group>
        {/* Arrow head */}
        <mesh rotation={[0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2]}>
          <coneGeometry args={[0.05, 0.12, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        {/* Shaft */}
        <mesh position={[-direction * arrowLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, arrowLen, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/* Bridge deck segment with edge beams */
function DeckSegment({
  position,
  dims,
  color,
  deckWidth,
}: {
  position: [number, number, number];
  dims: [number, number, number];
  color: string;
  deckWidth: number;
}) {
  return (
    <group position={position}>
      {/* Main deck slab */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={dims} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.55} />
      </mesh>
      {/* Wearing course (thin dark layer on top) */}
      <mesh position={[0, dims[1] / 2 + 0.008, 0]}>
        <boxGeometry args={[dims[0], 0.015, dims[2]]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.95} />
      </mesh>
      {/* Edge beams / parapets */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, dims[1] / 2 + 0.06, side * (deckWidth / 2 - 0.03)]}>
          <boxGeometry args={[dims[0], 0.12, 0.06]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/* Abutment / pier structure */
function Abutment({
  position,
  width,
  isConcrete,
}: {
  position: [number, number, number];
  width: number;
  isConcrete: boolean;
}) {
  return (
    <group position={position}>
      {/* Main pier body */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.8, width * 0.85]} />
        <meshStandardMaterial
          color={isConcrete ? '#6b7280' : '#78716c'}
          metalness={isConcrete ? 0.15 : 0.55}
          roughness={isConcrete ? 0.85 : 0.35}
        />
      </mesh>
      {/* Bearing shelf / cap beam */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.55, 0.1, width * 0.9]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Base pad */}
      <mesh position={[0, -0.45, 0]}>
        <boxGeometry args={[0.5, 0.1, width * 0.88]} />
        <meshStandardMaterial color="#475569" metalness={0.2} roughness={0.8} />
      </mesh>
    </group>
  );
}

/* Finger plate joint detail */
function FingerPlateJoint({
  gapW,
  deckW,
  deckH,
}: {
  gapW: number;
  deckW: number;
  deckH: number;
}) {
  const nFingers = 7;
  const fingerWidth = (deckW * 0.9) / (nFingers * 2);
  return (
    <group>
      {Array.from({ length: nFingers }).map((_, i) => {
        const z = -deckW * 0.45 + (i * 2 + 0.5) * fingerWidth;
        return (
          <group key={i}>
            {/* Left finger reaching right */}
            <mesh position={[-gapW * 0.1, deckH / 2 - 0.02, z]}>
              <boxGeometry args={[gapW * 1.2, 0.025, fingerWidth * 0.7]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} emissive="#60a5fa" emissiveIntensity={0.08} />
            </mesh>
            {/* Right finger reaching left */}
            <mesh position={[gapW * 0.1, deckH / 2 - 0.02, z + fingerWidth]}>
              <boxGeometry args={[gapW * 1.2, 0.025, fingerWidth * 0.7]} />
              <meshStandardMaterial color="#78716c" metalness={0.8} roughness={0.2} emissive="#f59e0b" emissiveIntensity={0.08} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* Modular expansion joint detail */
function ModularJoint({
  gapW,
  deckW,
  deckH,
  sealDepth,
}: {
  gapW: number;
  deckW: number;
  deckH: number;
  sealDepth: number;
}) {
  const nCells = 3;
  const cellW = gapW / nCells;
  return (
    <group>
      {Array.from({ length: nCells }).map((_, i) => {
        const x = -gapW / 2 + cellW * (i + 0.5);
        return (
          <group key={i}>
            {/* Centre beam */}
            <mesh position={[x, -sealDepth * 0.3, 0]}>
              <boxGeometry args={[0.02, sealDepth * 0.6, deckW * 0.92]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Elastomer seal between cells */}
            <mesh position={[x + cellW / 2, -sealDepth * 0.2, 0]}>
              <boxGeometry args={[cellW * 0.4, sealDepth * 0.4, deckW * 0.9]} />
              <meshStandardMaterial color="#8b5cf6" transparent opacity={0.6} emissive="#8b5cf6" emissiveIntensity={0.15} />
            </mesh>
          </group>
        );
      })}
      {/* Edge beams */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * gapW / 2, -sealDepth * 0.3, 0]}>
          <boxGeometry args={[0.04, sealDepth * 0.7, deckW * 0.93]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/* Strip seal detail */
function StripSealJoint({
  gapW,
  deckW,
  sealDepth,
}: {
  gapW: number;
  deckW: number;
  sealDepth: number;
}) {
  return (
    <group>
      {/* Neoprene strip */}
      <mesh position={[0, -sealDepth * 0.3, 0]}>
        <boxGeometry args={[gapW * 0.7, sealDepth * 0.6, deckW * 0.94]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.7} emissive="#3b82f6" emissiveIntensity={0.2} roughness={0.9} />
      </mesh>
      {/* Steel extrusions at edges */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * gapW * 0.42, -sealDepth * 0.15, 0]}>
          <boxGeometry args={[0.025, sealDepth * 0.5, deckW * 0.93]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/* Compression seal detail */
function CompressionSealJoint({
  gapW,
  deckW,
  sealDepth,
}: {
  gapW: number;
  deckW: number;
  sealDepth: number;
}) {
  return (
    <group>
      {/* Main cross-section — compressed elastomer */}
      <mesh position={[0, -sealDepth * 0.25, 0]}>
        <boxGeometry args={[gapW * 0.9, sealDepth * 0.55, deckW * 0.93]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.65} emissive="#f59e0b" emissiveIntensity={0.15} roughness={0.85} />
      </mesh>
      {/* Internal web pattern (horizontal cells) */}
      {[-1, 0, 1].map((row) => (
        <mesh key={row} position={[0, -sealDepth * 0.25 + row * sealDepth * 0.15, 0]}>
          <boxGeometry args={[gapW * 0.5, 0.01, deckW * 0.88]} />
          <meshStandardMaterial color="#d97706" metalness={0.1} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* Temperature gradient bar */
function TemperatureBar({
  position,
  height,
  thermalMovement,
}: {
  position: [number, number, number];
  height: number;
  thermalMovement: number;
}) {
  return (
    <group position={position}>
      {/* Cold zone (bottom, blue) */}
      <mesh position={[0, -height / 4, 0]}>
        <boxGeometry args={[0.06, height / 2, 0.06]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
      </mesh>
      {/* Hot zone (top, red/orange) */}
      <mesh position={[0, height / 4, 0]}>
        <boxGeometry args={[0.06, height / 2, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <Text position={[0, height / 2 + 0.15, 0]} fontSize={0.08} color="#ef4444">
        HOT
      </Text>
      <Text position={[0, -height / 2 - 0.15, 0]} fontSize={0.08} color="#3b82f6">
        COLD
      </Text>
      <Text position={[0.2, 0, 0]} fontSize={0.08} color="#f59e0b">
        {`Δth=${thermalMovement.toFixed(1)}mm`}
      </Text>
    </group>
  );
}

/* Dimension line with end ticks */
function DimensionLine({
  start,
  end,
  label,
  offset = 0,
  color = '#00d9ff',
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  offset?: number;
  color?: string;
}) {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2 + offset;
  const midZ = (start[2] + end[2]) / 2;
  const lineLen = Math.sqrt(
    (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2 + (end[2] - start[2]) ** 2,
  );
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

  return (
    <group>
      {/* Main line */}
      <mesh position={[midX, midY, midZ]} rotation={[0, 0, angle]}>
        <boxGeometry args={[lineLen, 0.008, 0.008]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {/* End ticks */}
      {[start, end].map((pt, i) => (
        <mesh key={i} position={[pt[0], pt[1] + offset, pt[2]]}>
          <boxGeometry args={[0.008, 0.08, 0.008]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Label */}
      <Text position={[midX, midY + 0.12, midZ]} fontSize={0.1} color={color}>
        {label}
      </Text>
    </group>
  );
}

export default function MovementJoints3D({
  spanLength = 30,
  deckWidth = 10,
  jointGap = 50,
  jointDepth = 100,
  totalMovement = 20,
  jointType = 'strip_seal',
  bridgeType = 'concrete',
  thermalMovement = 15,
  creepMovement = 3,
  utilisation = 0,
  status = 'PASS',
}: MovementJoints3DProps) {
  const groupRef = useRef<THREE.Group>(null!);

  // Slow floating animation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.04;
    }
  });

  const sc = 0.15;
  const gapSc = 0.005;

  const deckLen = Math.min(spanLength * sc, 3);
  const deckW = Math.min(deckWidth * sc, 2);
  const deckH = 0.3;
  const gapW = Math.max(jointGap * gapSc, 0.08);
  const sealDepth = Math.max(jointDepth * gapSc, 0.15);

  const statusColor = status === 'PASS' ? '#22c55e' : '#ef4444';
  const col = utilisation > 0 ? utilColor(utilisation) : statusColor;
  const isConcrete = bridgeType !== 'steel';
  const deckColor = isConcrete ? '#475569' : '#556677';

  const sealColor = useMemo(() => {
    switch (jointType) {
      case 'compression_seal': return '#f59e0b';
      case 'strip_seal': return '#3b82f6';
      case 'modular_seal': return '#8b5cf6';
      case 'finger_plate': return '#94a3b8';
      case 'pot_seal': return '#ef4444';
      default: return '#06b6d4';
    }
  }, [jointType]);

  const movementArrowLen = Math.min(totalMovement * gapSc, gapW * 0.9);
  const halfDeck = deckLen / 2 + gapW / 2;

  return (
    <group ref={groupRef}>
      {/* Glow ring */}
      <GlowRing radius={halfDeck + 0.8} color={col} />

      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} castShadow />
      <pointLight position={[-3, 4, -3]} intensity={0.35} color="#06b6d4" />
      <pointLight position={[0, 2, 3]} intensity={0.2} color="#f59e0b" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -deckH / 2 - 0.95, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Abutments */}
      {[-1, 1].map((side) => (
        <Abutment
          key={side}
          position={[side * (halfDeck / 2 + 0.1), -deckH / 2 - 0.45, 0]}
          width={deckW}
          isConcrete={isConcrete}
        />
      ))}

      {/* Left deck segment */}
      <DeckSegment
        position={[-halfDeck / 2, 0, 0]}
        dims={[deckLen / 2, deckH, deckW]}
        color={deckColor}
        deckWidth={deckW}
      />

      {/* Right deck segment */}
      <DeckSegment
        position={[halfDeck / 2, 0, 0]}
        dims={[deckLen / 2, deckH, deckW]}
        color={deckColor}
        deckWidth={deckW}
      />

      {/* Road lane markings */}
      {[-1, 1].map((side) => (
        <group key={`lane-${side}`}>
          {/* Centre line dashes */}
          {Array.from({ length: 4 }).map((_, i) => {
            const x = side * (halfDeck / 4 + gapW / 4) + side * (i * 0.18 - 0.27);
            return (
              <mesh key={i} position={[x, deckH / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.08, 0.02]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} side={THREE.DoubleSide} />
              </mesh>
            );
          })}
          {/* Edge line (solid) */}
          <mesh position={[side * halfDeck / 2, deckH / 2 + 0.02, deckW * 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[deckLen / 2, 0.015]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[side * halfDeck / 2, deckH / 2 + 0.02, -deckW * 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[deckLen / 2, 0.015]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ─── Joint-type-specific geometry ─── */}
      {jointType === 'finger_plate' ? (
        <FingerPlateJoint gapW={gapW} deckW={deckW} deckH={deckH} />
      ) : jointType === 'modular_seal' ? (
        <ModularJoint gapW={gapW} deckW={deckW} deckH={deckH} sealDepth={sealDepth} />
      ) : jointType === 'strip_seal' ? (
        <StripSealJoint gapW={gapW} deckW={deckW} sealDepth={sealDepth} />
      ) : jointType === 'compression_seal' ? (
        <CompressionSealJoint gapW={gapW} deckW={deckW} sealDepth={sealDepth} />
      ) : (
        /* Generic / default seal body */
        <mesh position={[0, -sealDepth / 2 + deckH / 4, 0]} castShadow>
          <boxGeometry args={[gapW * 0.85, sealDepth, deckW * 0.95]} />
          <meshStandardMaterial color={sealColor} metalness={0.2} roughness={0.8} transparent opacity={0.75} />
        </mesh>
      )}

      {/* Gap edge highlights */}
      {[-1, 1].map((side) => (
        <mesh key={`edge-${side}`} position={[side * gapW / 2, 0, 0]}>
          <boxGeometry args={[0.02, deckH * 1.02, deckW * 1.01]} />
          <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Animated movement arrows */}
      {movementArrowLen > 0.01 && (
        <>
          <MovementArrow
            position={[gapW * 0.15, deckH / 2 + 0.18, 0]}
            direction={1}
            length={movementArrowLen}
          />
          <MovementArrow
            position={[-gapW * 0.15, deckH / 2 + 0.18, 0]}
            direction={-1}
            length={movementArrowLen}
          />
        </>
      )}

      {/* Joint type label */}
      <Text
        position={[0, -sealDepth - 0.1, deckW / 2 + 0.2]}
        fontSize={0.08}
        color={sealColor}
      >
        {jointType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
      </Text>

      {/* Temperature gradient bar */}
      <TemperatureBar
        position={[halfDeck / 2 + deckLen / 4 + 0.4, 0, -deckW / 2 - 0.3]}
        height={deckH * 2}
        thermalMovement={thermalMovement}
      />

      {/* ─── Dimension lines ─── */}
      {/* Span */}
      <DimensionLine
        start={[-halfDeck / 2 - deckLen / 4, -deckH / 2 - 1.0, 0]}
        end={[halfDeck / 2 + deckLen / 4, -deckH / 2 - 1.0, 0]}
        label={`L = ${spanLength} m`}
      />
      {/* Gap */}
      <DimensionLine
        start={[-gapW / 2, deckH / 2 + 0.45, deckW / 2 + 0.15]}
        end={[gapW / 2, deckH / 2 + 0.45, deckW / 2 + 0.15]}
        label={`Gap: ${jointGap.toFixed(0)} mm`}
        color="#f59e0b"
      />

      {/* Status badge */}
      <Text position={[0, deckH / 2 + 0.9, 0]} fontSize={0.18} color={statusColor}>
        {status === 'PASS' ? '✓ ADEQUATE' : '✗ INADEQUATE'}
      </Text>

      {/* Movement readout */}
      <Text position={[0, deckH / 2 + 0.7, 0]} fontSize={0.12} color="#f59e0b">
        {`Δtotal = ${totalMovement.toFixed(1)} mm`}
      </Text>

      {/* Utilisation readout */}
      {utilisation > 0 && (
        <Text position={[0, deckH / 2 + 1.15, 0]} fontSize={0.12} color={col}>
          {`Util: ${utilisation.toFixed(1)}%`}
        </Text>
      )}
    </group>
  );
}
