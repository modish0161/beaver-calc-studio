// =============================================================================
// 3D Scene: Pile Foundations — pile cap with piles in soil
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated helpers ────────────────────────────────────────── */

function DimensionLine({ start, end, color = '#f59e0b' }: { start: [number, number, number]; end: [number, number, number]; color?: string }) {
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
  const len = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2 + (end[2] - start[2]) ** 2);
  const dir = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group>
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.005, 0.005, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.012, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.012, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedLoadArrow({ y, colour }: { y: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.12, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function CapGlow({ capL, capD, capW, colour }: { capL: number; capD: number; capW: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, capD / 2, capW / 2 + 0.005]}>
      <planeGeometry args={[capL * 0.95, capD * 0.95]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── sub-components ──────────────────────────────────────────── */

interface PileFoundations3DProps {
  pileLength?: number;      // m
  pileDiameter?: number;    // mm
  nPiles?: number;
  pileCapLength?: number;   // m
  pileCapWidth?: number;    // m
  pileCapDepth?: number;    // m
  columnLoad?: number;      // kN
  soilType?: string;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

// Single pile with animated tip glow
function Pile({
  position,
  diameter,
  length,
  index,
  colour,
}: {
  position: [number, number, number];
  diameter: number;
  length: number;
  index: number;
  colour: string;
}) {
  const tipRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (tipRef.current) {
      (tipRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.1 + Math.sin(clock.getElapsedTime() * 2 + index * 0.7) * 0.15;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, -length / 2, 0]} castShadow>
        <cylinderGeometry args={[diameter / 2, diameter / 2, length, 16]} />
        <meshStandardMaterial
          color="#9ca3af"
          emissive="#3b82f6"
          emissiveIntensity={0.08}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      {/* Pile tip — animated glow */}
      <mesh ref={tipRef} position={[0, -length, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[diameter / 2, diameter * 0.8, 16]} />
        <meshStandardMaterial
          color="#64748b"
          emissive={colour}
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* Pile top ring */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[diameter / 2 + 0.02, diameter / 2 + 0.02, 0.05, 16]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// Soil layers
function SoilLayers() {
  return (
    <group>
      {/* Top soil */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[6, 1, 6]} />
        <meshStandardMaterial color="#5c4033" transparent opacity={0.25} roughness={1} />
      </mesh>
      {/* Clay */}
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[6, 2, 6]} />
        <meshStandardMaterial color="#8b7355" transparent opacity={0.15} roughness={1} />
      </mesh>
      {/* Dense layer */}
      <mesh position={[0, -4.5, 0]}>
        <boxGeometry args={[6, 3, 6]} />
        <meshStandardMaterial color="#6b7280" transparent opacity={0.12} roughness={1} />
      </mesh>
      {/* Layer lines */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[6, 0.01, 6]} />
        <meshStandardMaterial color="#a67c52" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, -3, 0]}>
        <boxGeometry args={[6, 0.01, 6]} />
        <meshStandardMaterial color="#8b7355" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// Column stub on top of pile cap
function ColumnStub({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.35, 1.2, 0.35]} />
        <meshStandardMaterial color="#64748b" emissive="#3b82f6" emissiveIntensity={0.1} metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function PileFoundations3D({
  pileLength = 12,
  pileDiameter = 600,
  nPiles = 4,
  pileCapLength = 2,
  pileCapWidth = 2,
  pileCapDepth = 1,
  columnLoad = 1500,
  soilType = 'clay',
  utilisation = 72,
  status = 'PASS',
}: PileFoundations3DProps) {
  // Scale
  const maxDim = Math.max(pileLength, pileCapLength, 5);
  const s = 4 / maxDim;

  const pL = pileLength * s;
  const pD = (pileDiameter / 1000) * s;
  const capL = pileCapLength * s;
  const capW = pileCapWidth * s;
  const capD = pileCapDepth * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  // Pile layout positions
  const pilePositions = useMemo(() => {
    const pos: [number, number, number][] = [];
    const edge = 0.15;

    if (nPiles === 1) {
      pos.push([0, 0, 0]);
    } else if (nPiles === 2) {
      pos.push([-capL / 2 + edge + pD / 2, 0, 0]);
      pos.push([capL / 2 - edge - pD / 2, 0, 0]);
    } else if (nPiles === 3) {
      pos.push([0, 0, -capW / 3]);
      pos.push([-capL / 3, 0, capW / 4]);
      pos.push([capL / 3, 0, capW / 4]);
    } else if (nPiles === 4) {
      const ox = capL / 2 - edge - pD / 2;
      const oz = capW / 2 - edge - pD / 2;
      pos.push([-ox, 0, -oz]);
      pos.push([ox, 0, -oz]);
      pos.push([-ox, 0, oz]);
      pos.push([ox, 0, oz]);
    } else if (nPiles === 6) {
      const ox = capL / 2 - edge - pD / 2;
      const oz = capW / 2 - edge - pD / 2;
      pos.push([-ox, 0, -oz]);
      pos.push([0, 0, -oz]);
      pos.push([ox, 0, -oz]);
      pos.push([-ox, 0, oz]);
      pos.push([0, 0, oz]);
      pos.push([ox, 0, oz]);
    } else {
      // Grid pattern
      const cols = Math.ceil(Math.sqrt(nPiles));
      const rows = Math.ceil(nPiles / cols);
      let count = 0;
      for (let r = 0; r < rows && count < nPiles; r++) {
        for (let c = 0; c < cols && count < nPiles; c++) {
          const x = cols > 1 ? -capL / 2 + edge + pD / 2 + (c * (capL - 2 * edge - pD)) / (cols - 1) : 0;
          const z = rows > 1 ? -capW / 2 + edge + pD / 2 + (r * (capW - 2 * edge - pD)) / (rows - 1) : 0;
          pos.push([x, 0, z]);
          count++;
        }
      }
    }

    return pos;
  }, [nPiles, capL, capW, pD]);

  const capTop = capD;

  return (
    <group position={[0, 0.5, 0]}>
      {/* Soil layers */}
      <SoilLayers />

      {/* Pile cap */}
      <mesh position={[0, capD / 2, 0]} castShadow>
        <boxGeometry args={[capL, capD, capW]} />
        <meshStandardMaterial color="#6b7280" roughness={0.85} transparent opacity={0.7} />
      </mesh>
      <lineSegments position={[0, capD / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(capL, capD, capW)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.6} />
      </lineSegments>

      {/* Cap glow — animated */}
      <CapGlow capL={capL} capD={capD} capW={capW} colour={colour} />

      {/* Piles — with animated tip glow */}
      {pilePositions.map((pos, i) => (
        <Pile key={i} position={pos} diameter={pD} length={pL} index={i} colour={colour} />
      ))}

      {/* Column stub */}
      <ColumnStub position={[0, capTop + 0.6, 0]} />

      {/* Load arrow — animated */}
      {columnLoad > 0 && (
        <group>
          <AnimatedLoadArrow y={capTop + 1.5} colour="#ef4444" />
          <Text position={[0.35, capTop + 1.8, 0]} fontSize={0.13} color="#ef4444">
            {`${columnLoad} kN`}
          </Text>
        </group>
      )}

      {/* Dimension lines */}
      <DimensionLine start={[capL / 2 + 0.2, 0, capW / 2 + 0.1]} end={[capL / 2 + 0.2, -pL, capW / 2 + 0.1]} color="#38bdf8" />
      <Text position={[capL / 2 + 0.5, -pL / 2, capW / 2 + 0.1]} fontSize={0.1} color="#38bdf8">
        {`L = ${pileLength}m`}
      </Text>
      <DimensionLine start={[-capL / 2, capD + 0.1, capW / 2 + 0.15]} end={[capL / 2, capD + 0.1, capW / 2 + 0.15]} color="#38bdf8" />
      <Text position={[0, capD + 0.25, capW / 2 + 0.15]} fontSize={0.09} color="#38bdf8">
        {`${pileCapLength}m`}
      </Text>

      {/* Labels */}
      <Text position={[0, capD + 2.5, 0]} fontSize={0.16} color="#00d9ff" anchorX="center">
        Pile Foundation
      </Text>

      <Text position={[capL / 2 + 0.3, capD / 2, 0]} fontSize={0.1} color="#94a3b8" anchorX="left">
        {`Cap: ${pileCapLength}×${pileCapWidth}×${pileCapDepth}m`}
      </Text>

      <Text position={[capL / 2 + 0.3, -pL / 3, 0]} fontSize={0.1} color="#94a3b8" anchorX="left">
        {`${nPiles}× Ø${pileDiameter}mm, L=${pileLength}m`}
      </Text>

      {/* Status indicator */}
      <mesh position={[capL / 2 + 0.15, capD + 2.5, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
