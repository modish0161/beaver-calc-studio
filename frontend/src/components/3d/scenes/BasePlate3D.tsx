// =============================================================================
// 3D Scene: Base Plate Connection — column, plate, anchor bolts, foundation
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

interface BasePlate3DProps {
  columnDepth?: number;   // mm
  columnWidth?: number;   // mm
  columnFlange?: number;  // mm
  columnWeb?: number;     // mm
  plateLength?: number;   // mm
  plateWidth?: number;    // mm
  plateThick?: number;    // mm
  nBolts?: number;
  boltDiameter?: number;  // mm
  embedment?: number;     // mm
  groutThick?: number;    // mm
  axialForce?: number;    // kN
  moment?: number;        // kNm
  status?: 'PASS' | 'FAIL';
  utilisation?: number;
}

// I-section column
function ColumnSection({
  h,
  b,
  tf,
  tw,
  height,
}: {
  h: number;
  b: number;
  tf: number;
  tw: number;
  height: number;
}) {
  return (
    <group>
      {/* Web */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[tw, height, h - 2 * tf]} />
        <meshStandardMaterial color="#64748b" emissive="#3b82f6" emissiveIntensity={0.1} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Top flange */}
      <mesh position={[0, height / 2, (h - tf) / 2]} castShadow>
        <boxGeometry args={[b, height, tf]} />
        <meshStandardMaterial color="#64748b" emissive="#3b82f6" emissiveIntensity={0.1} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Bottom flange */}
      <mesh position={[0, height / 2, -(h - tf) / 2]} castShadow>
        <boxGeometry args={[b, height, tf]} />
        <meshStandardMaterial color="#64748b" emissive="#3b82f6" emissiveIntensity={0.1} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Single anchor bolt
function AnchorBolt({
  position,
  diameter,
  embedment,
  plateTop,
}: {
  position: [number, number, number];
  diameter: number;
  embedment: number;
  plateTop: number;
}) {
  const totalH = embedment + plateTop + 0.15;
  return (
    <group position={position}>
      {/* Shaft */}
      <mesh position={[0, plateTop - embedment / 2, 0]}>
        <cylinderGeometry args={[diameter / 2, diameter / 2, totalH, 12]} />
        <meshStandardMaterial color="#a3a3a3" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Nut */}
      <mesh position={[0, plateTop + 0.08, 0]}>
        <cylinderGeometry args={[diameter * 0.9, diameter * 0.9, 0.06, 6]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Washer */}
      <mesh position={[0, plateTop + 0.04, 0]}>
        <cylinderGeometry args={[diameter * 1.2, diameter * 1.2, 0.015, 16]} />
        <meshStandardMaterial color="#d4d4d4" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

/* ── Animated axial load arrow ────────────────────────────────────────── */
function AnimatedAxialArrow({ y, force, colour }: { y: number; force: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  if (force <= 0) return null;
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.12, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.3, 0.4, 0]} fontSize={0.12} color={colour}>
        {`N = ${force.toFixed(0)} kN`}
      </Text>
    </group>
  );
}

/* ── Plate glow ───────────────────────────────────────────────────────── */
function PlateGlow({ pL, pW, y, colour }: { pL: number; pW: number; y: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial;
    if (mat) mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[pL + 0.04, pW + 0.04]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}

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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function BasePlate3D({
  columnDepth = 260,
  columnWidth = 260,
  columnFlange = 17,
  columnWeb = 10,
  plateLength = 400,
  plateWidth = 400,
  plateThick = 25,
  nBolts = 4,
  boltDiameter = 24,
  embedment = 300,
  groutThick = 25,
  axialForce = 500,
  moment = 0,
  status = 'PASS',
  utilisation = 72,
}: BasePlate3DProps) {
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  // Scale everything to scene units
  const s = 1 / 200; // 200mm = 1 unit
  const colH = columnDepth * s;
  const colW = columnWidth * s;
  const colTf = columnFlange * s;
  const colTw = columnWeb * s;
  const pL = plateLength * s;
  const pW = plateWidth * s;
  const pT = plateThick * s;
  const bD = boltDiameter * s;
  const emb = embedment * s;
  const grout = groutThick * s;
  const columnHeight = 2.5; // visual column height

  const plateTop = grout + pT;

  // Bolt pattern — place at corners and edges
  const boltPositions: [number, number, number][] = [];
  const edgeDist = 0.15;
  if (nBolts === 4) {
    boltPositions.push([-pL / 2 + edgeDist, 0, -pW / 2 + edgeDist]);
    boltPositions.push([pL / 2 - edgeDist, 0, -pW / 2 + edgeDist]);
    boltPositions.push([-pL / 2 + edgeDist, 0, pW / 2 - edgeDist]);
    boltPositions.push([pL / 2 - edgeDist, 0, pW / 2 - edgeDist]);
  } else if (nBolts === 6) {
    boltPositions.push([-pL / 2 + edgeDist, 0, -pW / 2 + edgeDist]);
    boltPositions.push([0, 0, -pW / 2 + edgeDist]);
    boltPositions.push([pL / 2 - edgeDist, 0, -pW / 2 + edgeDist]);
    boltPositions.push([-pL / 2 + edgeDist, 0, pW / 2 - edgeDist]);
    boltPositions.push([0, 0, pW / 2 - edgeDist]);
    boltPositions.push([pL / 2 - edgeDist, 0, pW / 2 - edgeDist]);
  } else {
    // Default: distribute evenly in 2 rows
    const rows = 2;
    const perRow = Math.ceil(nBolts / rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < perRow; c++) {
        if (boltPositions.length >= nBolts) break;
        const x = perRow > 1 ? -pL / 2 + edgeDist + (c * (pL - 2 * edgeDist)) / (perRow - 1) : 0;
        const z = r === 0 ? -pW / 2 + edgeDist : pW / 2 - edgeDist;
        boltPositions.push([x, 0, z]);
      }
    }
  }

  return (
    <group position={[0, 0, 0]}>
      {/* Foundation block */}
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[pL + 0.5, 0.6, pW + 0.5]} />
        <meshStandardMaterial color="#4b5563" roughness={0.95} metalness={0.05} transparent opacity={0.6} />
      </mesh>
      <lineSegments position={[0, -0.3, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(pL + 0.5, 0.6, pW + 0.5)]} />
        <lineBasicMaterial color="#6b7280" />
      </lineSegments>

      {/* Grout layer */}
      <mesh position={[0, grout / 2, 0]}>
        <boxGeometry args={[pL + 0.05, grout, pW + 0.05]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.8} />
      </mesh>

      {/* Base plate */}
      <mesh position={[0, grout + pT / 2, 0]} castShadow>
        <boxGeometry args={[pL, pT, pW]} />
        <meshStandardMaterial
          color="#94a3b8"
          emissive="#3b82f6"
          emissiveIntensity={0.1}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Column */}
      <group position={[0, plateTop, 0]}>
        <ColumnSection h={colH} b={colW} tf={colTf} tw={colTw} height={columnHeight} />
      </group>

      {/* Anchor bolts */}
      {boltPositions.map((pos, i) => (
        <AnchorBolt
          key={i}
          position={pos}
          diameter={bD}
          embedment={emb}
          plateTop={plateTop}
        />
      ))}

      {/* Plate status glow */}
      <PlateGlow pL={pL} pW={pW} y={grout + pT + 0.01} colour={colour} />

      {/* Animated axial force arrow */}
      <AnimatedAxialArrow y={plateTop + columnHeight} force={axialForce} colour={colour} />

      {/* Dimension: plate size */}
      <DimensionLine
        from={[-pL / 2, -0.05, pW / 2 + 0.2]}
        to={[pL / 2, -0.05, pW / 2 + 0.2]}
        offset={[0, 0, 0]}
        label={`${plateLength}×${plateWidth}×${plateThick}`}
      />

      {/* Labels */}
      <Text position={[0, -0.7, 0]} fontSize={0.15} color="#94a3b8" anchorX="center">
        {`Plate: ${plateLength}×${plateWidth}×${plateThick}`}
      </Text>

      <Text position={[0, -0.9, 0]} fontSize={0.12} color="#00d9ff" anchorX="center">
        {`${nBolts} × M${boltDiameter} bolts`}
      </Text>
    </group>
  );
}
