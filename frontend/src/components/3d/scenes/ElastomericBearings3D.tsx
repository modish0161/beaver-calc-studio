// =============================================================================
// 3D Scene: Elastomeric Bearing — laminated elastomer layers + steel shims
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
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.003, 0.003, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.008, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.008, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedLoadArrow({ totalH, load, colour }: { totalH: number; load: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) { ref.current.position.y = totalH + 0.6 + Math.sin(clock.getElapsedTime() * 2) * 0.05; }
  });
  return (
    <group ref={ref} position={[0, totalH + 0.6, 0]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.08, 0.25, 12]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} />
      </mesh>
      <Text position={[0, 0.7, 0]} fontSize={0.15} color={colour}>
        {load} kN
      </Text>
    </group>
  );
}

function BearingGlow({ totalH, lx, lz, isCircular, d, colour }: { totalH: number; lx: number; lz: number; isCircular: boolean; d: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[isCircular ? d / 2 + 0.15 : lx / 2 + 0.05, totalH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[isCircular ? d : lz, totalH * 0.9]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface ElastomericBearings3DProps {
  shape?: string;
  length?: number;        // mm
  width?: number;         // mm
  diameter?: number;      // mm
  nLayers?: number;
  layerThickness?: number; // mm
  nShims?: number;
  shimThickness?: number;  // mm
  topPlate?: number;       // mm
  bottomPlate?: number;    // mm
  load?: number;           // kN
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

function SteelPlate({
  position,
  dims,
  isCircular,
  diameter,
}: {
  position: [number, number, number];
  dims: [number, number, number];
  isCircular?: boolean;
  diameter?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      {isCircular ? (
        <cylinderGeometry args={[(diameter || 1) / 2, (diameter || 1) / 2, dims[1], 32]} />
      ) : (
        <boxGeometry args={dims} />
      )}
      <meshStandardMaterial
        color="#94a3b8"
        emissive="#60a5fa"
        emissiveIntensity={0.1}
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  );
}

function ElastomerLayer({
  position,
  dims,
  isCircular,
  diameter,
  index,
}: {
  position: [number, number, number];
  dims: [number, number, number];
  isCircular?: boolean;
  diameter?: number;
  index: number;
}) {
  const hue = 0.55 + index * 0.05;
  const color = `hsl(${hue * 360}, 70%, 40%)`;
  return (
    <mesh position={position} castShadow>
      {isCircular ? (
        <cylinderGeometry args={[(diameter || 1) / 2, (diameter || 1) / 2, dims[1], 32]} />
      ) : (
        <boxGeometry args={dims} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.15}
        roughness={0.8}
        metalness={0.0}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function SteelShim({
  position,
  dims,
  isCircular,
  diameter,
}: {
  position: [number, number, number];
  dims: [number, number, number];
  isCircular?: boolean;
  diameter?: number;
}) {
  return (
    <mesh position={position} castShadow>
      {isCircular ? (
        <cylinderGeometry args={[(diameter || 1) / 2, (diameter || 1) / 2, dims[1], 32]} />
      ) : (
        <boxGeometry args={dims} />
      )}
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={0.15}
        roughness={0.4}
        metalness={0.7}
      />
    </mesh>
  );
}

export default function ElastomericBearings3D({
  shape = 'rectangular',
  length = 400,
  width = 300,
  diameter = 300,
  nLayers = 3,
  layerThickness = 12,
  nShims = 2,
  shimThickness = 3,
  topPlate = 25,
  bottomPlate = 25,
  load = 500,
  utilisation = 72,
  status = 'PASS',
}: ElastomericBearings3DProps) {
  const isCircular = shape === 'circular';
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  const { parts, totalH } = useMemo(() => {
    const scale = 0.005;  // mm → scene units
    const lx = length * scale;
    const lz = width * scale;
    const d = diameter * scale;
    const tLayer = Math.max(layerThickness * scale, 0.02);
    const tShim = Math.max(shimThickness * scale, 0.005);
    const tTop = topPlate * scale;
    const tBot = bottomPlate * scale;

    const list: { type: 'plate' | 'layer' | 'shim'; y: number; h: number; idx: number }[] = [];
    let y = 0;

    // Bottom plate
    list.push({ type: 'plate', y: y + tBot / 2, h: tBot, idx: 0 });
    y += tBot;

    // Interleave layers and shims
    for (let i = 0; i < nLayers; i++) {
      list.push({ type: 'layer', y: y + tLayer / 2, h: tLayer, idx: i });
      y += tLayer;
      if (i < nShims && i < nLayers - 1) {
        list.push({ type: 'shim', y: y + tShim / 2, h: tShim, idx: i });
        y += tShim;
      }
    }

    // Top plate
    list.push({ type: 'plate', y: y + tTop / 2, h: tTop, idx: 1 });
    y += tTop;

    return { parts: list.map(p => ({ ...p, lx, lz, d })), totalH: y };
  }, [length, width, diameter, nLayers, layerThickness, nShims, shimThickness, topPlate, bottomPlate]);

  return (
    <group>
      {/* Base surface */}
      <mesh position={[0, -0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Bearing assembly */}
      <group position={[0, 0, 0]}>
        {parts.map((p, i) => {
          const pos: [number, number, number] = [0, p.y, 0];
          const dims: [number, number, number] = [p.lx, p.h, p.lz];
          if (p.type === 'plate') {
            return <SteelPlate key={i} position={pos} dims={dims} isCircular={isCircular} diameter={p.d} />;
          }
          if (p.type === 'layer') {
            return <ElastomerLayer key={i} position={pos} dims={dims} isCircular={isCircular} diameter={p.d} index={p.idx} />;
          }
          return <SteelShim key={i} position={pos} dims={dims} isCircular={isCircular} diameter={p.d} />;
        })}
      </group>

      {/* Load arrow — animated */}
      {load > 0 && <AnimatedLoadArrow totalH={totalH} load={load} colour={colour} />}

      {/* Bearing glow */}
      <BearingGlow totalH={totalH} lx={parts[0]?.lx ?? 1} lz={parts[0]?.lz ?? 1} isCircular={isCircular} d={parts[0]?.d ?? 1} colour={colour} />

      {/* Status badge */}
      <Text position={[0, totalH + 1.2, 0]} fontSize={0.18} color={colour}>
        {status}
      </Text>

      {/* Dimension lines */}
      <DimensionLine start={[0, 0, (isCircular ? diameter * 0.005 : width * 0.005) / 2 + 0.2]} end={[0, totalH, (isCircular ? diameter * 0.005 : width * 0.005) / 2 + 0.2]} color="#38bdf8" />
      <Text position={[0.25, totalH / 2, (isCircular ? diameter * 0.005 : width * 0.005) / 2 + 0.2]} fontSize={0.1} color="#38bdf8">
        {`h = ${(totalH / 0.005).toFixed(0)}mm`}
      </Text>

      {/* Dimension labels */}
      {isCircular ? (
        <Text position={[0, -0.2, diameter * 0.005 / 2 + 0.3]} fontSize={0.12} color="#94a3b8">
          Ø{diameter} mm
        </Text>
      ) : (
        <>
          <Text position={[length * 0.005 / 2 + 0.3, totalH / 2, 0]} fontSize={0.12} color="#94a3b8">
            {length}×{width} mm
          </Text>
        </>
      )}

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
      <pointLight position={[-3, 4, -3]} intensity={0.3} color="#60a5fa" />
    </group>
  );
}
