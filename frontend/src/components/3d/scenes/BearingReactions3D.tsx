// =============================================================================
// 3D Scene: Bearing Reactions — Bridge with bearings, force arrows,
// utilisation-based colouring, glow ring, dimension annotations
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface BearingReactions3DProps {
  spanLength?: number;
  bearingSpacing?: number;
  numberOfBearings?: number;
  bridgeType?: string;
  bearingType?: string;
  maxVerticalReaction?: number;
  maxHorizontalReaction?: number;
  utilisation?: number;
  status?: string;
}

/* colours by utilisation */
function utilColor(u: number): string {
  if (u > 100) return '#ff4444';
  if (u > 80) return '#ffaa00';
  return '#00ff88';
}

/* Glow ring around the base */
function GlowRing({ radius, color }: { radius: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.3;
      ref.current.material &&
        ((ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.2);
    }
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
      <torusGeometry args={[radius, 0.02, 16, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.7} />
    </mesh>
  );
}

/* Vertical force arrow */
function ForceArrow({ position, magnitude, maxF, color }: { position: [number, number, number]; magnitude: number; maxF: number; color: string }) {
  const scale = Math.max(0.3, Math.min(2.5, (magnitude / Math.max(maxF, 1)) * 2.5));
  return (
    <group position={position}>
      {/* shaft */}
      <mesh position={[0, scale / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, scale, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {/* head */}
      <mesh position={[0, scale + 0.08, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.08, 0.16, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      {/* label */}
      <Text position={[0, scale + 0.4, 0]} fontSize={0.14} color={color}>
        {`${magnitude.toFixed(0)} kN`}
      </Text>
    </group>
  );
}

export default function BearingReactions3D({
  spanLength = 30,
  bearingSpacing = 12,
  numberOfBearings = 2,
  bridgeType = 'simply_supported',
  bearingType = 'pot',
  maxVerticalReaction = 0,
  maxHorizontalReaction = 0,
  utilisation = 0,
  status = 'PASS',
}: BearingReactions3DProps) {
  const groupRef = useRef<THREE.Group>(null!);

  // slow float
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.04;
    }
  });

  const col = utilColor(utilisation);

  // Normalise for visualisation: deck = scaledSpan units long
  const scaledSpan = Math.min(spanLength / 8, 6);
  const deckThickness = 0.2;
  const deckWidth = Math.min(bearingSpacing / 4, 3);

  // Bearing positions along X axis, centred
  const bearingPositions = useMemo(() => {
    const pos: number[] = [];
    for (let i = 0; i < numberOfBearings; i++) {
      pos.push(-((numberOfBearings - 1) * (bearingSpacing / 8)) / 2 + i * (bearingSpacing / 8));
    }
    return pos;
  }, [numberOfBearings, bearingSpacing]);

  // Abutment/pier positions at start and end
  const supportXL = bearingPositions[0] - 0.3;
  const supportXR = bearingPositions[bearingPositions.length - 1] + 0.3;
  const supportY = -1.4;
  const bearingY = -0.4;

  return (
    <group ref={groupRef}>
      <GlowRing radius={scaledSpan * 0.8} color={col} />

      {/* Bridge deck */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[scaledSpan, deckThickness, deckWidth]} />
        <meshStandardMaterial color="#445566" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Deck edge highlight */}
      <mesh position={[0, deckThickness / 2 + 0.01, 0]}>
        <boxGeometry args={[scaledSpan, 0.02, deckWidth]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.3} transparent opacity={0.6} />
      </mesh>

      {/* Girders (two lines under deck) */}
      {[-deckWidth / 3, deckWidth / 3].map((z, gi) => (
        <mesh key={`girder-${gi}`} position={[0, -deckThickness / 2 - 0.06, z]}>
          <boxGeometry args={[scaledSpan - 0.1, 0.12, 0.06]} />
          <meshStandardMaterial color="#667788" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      {/* Bearings */}
      {bearingPositions.map((x, i) => (
        <group key={`bearing-${i}`} position={[x, bearingY, 0]}>
          {/* Bearing body */}
          {bearingType === 'pot' || bearingType === 'spherical' ? (
            <mesh>
              <cylinderGeometry args={[0.15, 0.18, 0.16, 16]} />
              <meshStandardMaterial color="#ffaa00" metalness={0.7} roughness={0.2} emissive="#ffaa00" emissiveIntensity={0.15} />
            </mesh>
          ) : bearingType === 'fixed' ? (
            <mesh>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial color="#ff6644" metalness={0.6} roughness={0.3} emissive="#ff4422" emissiveIntensity={0.2} />
            </mesh>
          ) : (
            <mesh>
              <boxGeometry args={[0.25, 0.1, 0.25]} />
              <meshStandardMaterial color="#44aaff" metalness={0.5} roughness={0.3} emissive="#2288ff" emissiveIntensity={0.15} />
            </mesh>
          )}
          {/* Top plate */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.3, 0.04, 0.3]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Bottom plate */}
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.3, 0.04, 0.3]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Label */}
          <Text position={[0, -0.35, 0]} fontSize={0.12} color="#ffaa00">
            {`B${i + 1}`}
          </Text>
        </group>
      ))}

      {/* Support pedestals (abutments/piers) */}
      {bearingPositions.map((x, i) => (
        <mesh key={`pedestal-${i}`} position={[x, (bearingY + supportY) / 2, 0]}>
          <boxGeometry args={[0.5, Math.abs(bearingY - supportY), 0.5]} />
          <meshStandardMaterial color="#556677" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}

      {/* Ground plane */}
      <mesh position={[0, supportY - 0.05, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[scaledSpan + 2, deckWidth + 2]} />
        <meshStandardMaterial color="#334455" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical reaction arrows (downward, showing bearing takes load) */}
      {maxVerticalReaction > 0 && bearingPositions.map((x, i) => (
        <ForceArrow
          key={`v-${i}`}
          position={[x, deckThickness / 2 + 0.1, 0]}
          magnitude={maxVerticalReaction / numberOfBearings}
          maxF={maxVerticalReaction}
          color="#ff4466"
        />
      ))}

      {/* Horizontal reaction arrows */}
      {maxHorizontalReaction > 10 && (
        <group position={[bearingPositions[0], bearingY, 0]}>
          <mesh position={[-0.6, 0, 0]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.025, 0.025, 0.8, 8]} />
            <meshStandardMaterial color="#44aaff" emissive="#44aaff" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[-1.05, 0, 0]} rotation-z={-Math.PI / 2}>
            <coneGeometry args={[0.06, 0.12, 8]} />
            <meshStandardMaterial color="#44aaff" emissive="#44aaff" emissiveIntensity={0.4} />
          </mesh>
          <Text position={[-0.6, 0.25, 0]} fontSize={0.11} color="#44aaff">
            {`H=${maxHorizontalReaction.toFixed(0)} kN`}
          </Text>
        </group>
      )}

      {/* Span dimension line */}
      <group position={[0, supportY - 0.4, 0]}>
        <mesh>
          <boxGeometry args={[scaledSpan, 0.01, 0.01]} />
          <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.5} />
        </mesh>
        <Text position={[0, -0.2, 0]} fontSize={0.14} color="#00d9ff">
          {`L = ${spanLength} m`}
        </Text>
      </group>

      {/* Status badge */}
      <Text
        position={[0, 1.4, 0]}
        fontSize={0.2}
        color={status === 'PASS' ? '#00ff88' : status === 'FAIL' ? '#ff4444' : '#ffaa00'}
      >
        {status === 'PASS' ? '✓ ADEQUATE' : status === 'FAIL' ? '✗ INADEQUATE' : '⚠ CHECK'}
      </Text>

      {/* Utilisation readout */}
      <Text position={[0, 1.1, 0]} fontSize={0.15} color={col}>
        {`Max Util: ${utilisation.toFixed(1)}%`}
      </Text>
    </group>
  );
}
