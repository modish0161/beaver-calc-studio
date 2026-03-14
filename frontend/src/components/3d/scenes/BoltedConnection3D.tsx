// =============================================================================
// 3D Scene: Bolted Connection — end plate, bolts, beam-to-column
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

interface BoltedConnection3DProps {
  beamDepth?: number;     // mm
  beamWidth?: number;     // mm
  columnDepth?: number;   // mm
  columnWidth?: number;   // mm
  endPlateH?: number;     // mm
  endPlateW?: number;     // mm
  endPlateT?: number;     // mm
  boltDiameter?: number;  // mm
  boltRows?: number;
  boltCols?: number;
  shearForce?: number;    // kN
  status?: 'PASS' | 'FAIL';
  utilisation?: number;
}

// Bolt
function Bolt({
  position,
  diameter,
}: {
  position: [number, number, number];
  diameter: number;
}) {
  return (
    <group position={position}>
      {/* Shank */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[diameter / 2, diameter / 2, 0.15, 12]} />
        <meshStandardMaterial color="#a3a3a3" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[diameter * 0.85, diameter * 0.85, 0.04, 6]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Nut (other side) */}
      <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[diameter * 0.85, diameter * 0.85, 0.04, 6]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// I-Section member
function ISectionMember({
  h,
  b,
  length,
  color,
  rotation = [0, 0, 0] as [number, number, number],
  position = [0, 0, 0] as [number, number, number],
}: {
  h: number;
  b: number;
  length: number;
  color: string;
  rotation?: [number, number, number];
  position?: [number, number, number];
}) {
  const tf = h * 0.08;
  const tw = h * 0.04;

  return (
    <group position={position} rotation={rotation}>
      {/* Web */}
      <mesh castShadow>
        <boxGeometry args={[length, h - 2 * tf, tw]} />
        <meshStandardMaterial color={color} emissive="#3b82f6" emissiveIntensity={0.08} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Top flange */}
      <mesh position={[0, (h - tf) / 2, 0]} castShadow>
        <boxGeometry args={[length, tf, b]} />
        <meshStandardMaterial color={color} emissive="#3b82f6" emissiveIntensity={0.08} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Bottom flange */}
      <mesh position={[0, -(h - tf) / 2, 0]} castShadow>
        <boxGeometry args={[length, tf, b]} />
        <meshStandardMaterial color={color} emissive="#3b82f6" emissiveIntensity={0.08} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Animated helpers
// ---------------------------------------------------------------------------

/* ── Dimension line helper ───────────────────────────────────────────── */
function DimensionLine({ from, to, offset = [0, 0, 0], label }: {
  from: [number, number, number]; to: [number, number, number];
  offset?: [number, number, number]; label: string;
}) {
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2 + offset[0],
    (from[1] + to[1]) / 2 + offset[1],
    (from[2] + to[2]) / 2 + offset[2],
  ];
  const len = Math.sqrt(
    (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2,
  );
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <group>
      <mesh position={mid} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.008, 0.008]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mid[0], mid[1] + 0.1, mid[2]]} fontSize={0.09} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── Animated shear arrow ─────────────────────────────────────────────── */
function AnimatedShearArrow({ position, force, colour }: {
  position: [number, number, number]; force: number; colour: string;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  if (force <= 0) return null;
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.58, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.3, -0.3, 0]} fontSize={0.1} color={colour}>
        {`V = ${force} kN`}
      </Text>
    </group>
  );
}

/* ── End plate glow ───────────────────────────────────────────────────── */
function EndPlateGlow({ epW, epH, py, pz, colour }: {
  epW: number; epH: number; py: number; pz: number; colour: string;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial;
    if (mat) mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, py, pz - 0.01]}>
      <planeGeometry args={[epW + 0.04, epH + 0.04]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function BoltedConnection3D({
  beamDepth = 400,
  beamWidth = 180,
  columnDepth = 305,
  columnWidth = 305,
  endPlateH = 500,
  endPlateW = 200,
  endPlateT = 20,
  boltDiameter = 20,
  boltRows = 4,
  boltCols = 2,
  shearForce = 200,
  status = 'PASS',
  utilisation = 70,
}: BoltedConnection3DProps) {
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const s = 1 / 200;
  const bH = beamDepth * s;
  const bW = beamWidth * s;
  const cH = columnDepth * s;
  const cW = columnWidth * s;
  const epH = endPlateH * s;
  const epW = endPlateW * s;
  const epT = endPlateT * s;
  const bD = boltDiameter * s;

  const beamLen = 2.5;
  const colLen = 3.5;

  // Bolt grid positions on end plate
  const boltPositions: [number, number, number][] = [];
  const edgeDist = 0.12;
  for (let r = 0; r < boltRows; r++) {
    for (let c = 0; c < boltCols; c++) {
      const y = boltRows > 1
        ? -epH / 2 + edgeDist + (r * (epH - 2 * edgeDist)) / (boltRows - 1)
        : 0;
      const x = boltCols > 1
        ? -epW / 2 + edgeDist + (c * (epW - 2 * edgeDist)) / (boltCols - 1)
        : 0;
      boltPositions.push([x, y, 0]);
    }
  }

  const connectionZ = 0;

  return (
    <group position={[0, 0, 0]}>
      {/* Column (vertical) */}
      <ISectionMember
        h={cH}
        b={cW}
        length={colLen}
        color="#475569"
        rotation={[0, 0, Math.PI / 2]}
        position={[0, colLen / 2 - 1, connectionZ - cH * 0.04 / 2 - epT / 2]}
      />

      {/* End plate */}
      <mesh position={[0, bH * 0.5 - 0.1, connectionZ]} castShadow>
        <boxGeometry args={[epW, epH, epT]} />
        <meshStandardMaterial
          color="#94a3b8"
          emissive="#00d9ff"
          emissiveIntensity={0.08}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* End plate glow */}
      <EndPlateGlow epW={epW} epH={epH} py={bH * 0.5 - 0.1} pz={connectionZ} colour={colour} />

      {/* Bolts */}
      {boltPositions.map((pos, i) => (
        <Bolt
          key={i}
          position={[pos[0], pos[1] + bH * 0.5 - 0.1, connectionZ]}
          diameter={bD}
        />
      ))}

      {/* Beam (horizontal, connecting to end plate) */}
      <ISectionMember
        h={bH}
        b={bW}
        length={beamLen}
        color="#64748b"
        position={[0, bH * 0.5 - 0.1, connectionZ + epT / 2 + beamLen / 2]}
      />

      {/* Animated shear force arrow */}
      <AnimatedShearArrow
        position={[0, bH * 0.5 - 0.1, connectionZ + epT / 2 + beamLen + 0.2]}
        force={shearForce}
        colour={colour}
      />

      {/* Beam depth dimension */}
      <DimensionLine
        from={[epW / 2 + 0.15, -0.1 - bH / 2, connectionZ + epT / 2 + beamLen / 2]}
        to={[epW / 2 + 0.15, -0.1 + bH / 2, connectionZ + epT / 2 + beamLen / 2]}
        offset={[0.05, 0, 0]}
        label={`${beamDepth}mm`}
      />

      {/* Labels */}
      <Text position={[0, colLen - 0.5, connectionZ - 0.5]} fontSize={0.13} color="#94a3b8" anchorX="center">
        Column
      </Text>
      <Text position={[0, bH * 0.5 + 0.3, connectionZ + epT / 2 + beamLen / 2]} fontSize={0.13} color="#94a3b8" anchorX="center">
        Beam
      </Text>
      <Text position={[epW / 2 + 0.15, bH * 0.5 - 0.1, connectionZ]} fontSize={0.1} color="#00d9ff" anchorX="left">
        End Plate
      </Text>
      <Text position={[0, -0.5, connectionZ]} fontSize={0.1} color="#fbbf24" anchorX="center">
        {`${boltRows * boltCols}× M${boltDiameter}`}
      </Text>
    </group>
  );
}
