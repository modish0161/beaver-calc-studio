// =============================================================================
// 3D Scene: RC Column — Reinforced concrete column with rebars and load arrows
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function PulsingLoadArrow({ position, force }: { position: [number, number, number]; force: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.02;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.13, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.5, 0.35, 0]} fontSize={0.13} color="#ef4444">
        {`N = ${force.toFixed(0)} kN`}
      </Text>
    </group>
  );
}

function ColumnGlow({ W, D, H, status, utilisation }: { W: number; D: number; H: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, H / 2, D / 2 + 0.01]}>
      <planeGeometry args={[W, H]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
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
      <Text position={[mx + (vertical ? 0.15 : 0), my + (vertical ? 0 : 0.06), mz]} fontSize={0.1} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface RCColumn3DProps {
  width?: number;
  depth?: number;
  height?: number;
  cover?: number;
  nBarsX?: number;
  nBarsY?: number;
  barDia?: number;
  linkDia?: number;
  linkSpacing?: number;
  axialForce?: number;
  moment?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

function RebarRing({ positions, diameter, height, color }: {
  positions: [number, number][];
  diameter: number;
  height: number;
  color: string;
}) {
  return (
    <group>
      {positions.map((p, i) => (
        <mesh key={i} position={[p[0], height / 2, p[1]]}>
          <cylinderGeometry args={[diameter / 2, diameter / 2, height, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function LinkStirrup({ w, d, y, thick }: { w: number; d: number; y: number; thick: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = w / 2, hd = d / 2;
    s.moveTo(-hw, -hd);
    s.lineTo(hw, -hd);
    s.lineTo(hw, hd);
    s.lineTo(-hw, hd);
    s.closePath();
    const hole = new THREE.Path();
    const ihw = hw - thick, ihd = hd - thick;
    hole.moveTo(-ihw, -ihd);
    hole.lineTo(ihw, -ihd);
    hole.lineTo(ihw, ihd);
    hole.lineTo(-ihw, ihd);
    hole.closePath();
    s.holes.push(hole);
    return s;
  }, [w, d, thick]);

  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <extrudeGeometry args={[shape, { depth: thick * 0.8, bevelEnabled: false }]} />
      <meshStandardMaterial color="#a3a3a3" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

export default function RCColumn3D({
  width = 400,
  depth = 400,
  height = 3000,
  cover = 35,
  nBarsX = 3,
  nBarsY = 3,
  barDia = 25,
  linkDia = 10,
  linkSpacing = 200,
  axialForce = 1500,
  moment = 0,
  utilisation = 75,
  status = 'PASS',
}: RCColumn3DProps) {
  const s = 1 / 400;
  const W = width * s;
  const D = depth * s;
  const H = height * s;
  const cov = cover * s;
  const bDia = barDia * s;
  const lDia = linkDia * s;

  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  const barPositions = useMemo(() => {
    const bars: [number, number][] = [];
    const startX = -W / 2 + cov + bDia / 2;
    const endX = W / 2 - cov - bDia / 2;
    const startZ = -D / 2 + cov + bDia / 2;
    const endZ = D / 2 - cov - bDia / 2;

    for (let ix = 0; ix < nBarsX; ix++) {
      const x = nBarsX > 1 ? startX + (endX - startX) * ix / (nBarsX - 1) : 0;
      for (let iz = 0; iz < nBarsY; iz++) {
        const z = nBarsY > 1 ? startZ + (endZ - startZ) * iz / (nBarsY - 1) : 0;
        if (ix === 0 || ix === nBarsX - 1 || iz === 0 || iz === nBarsY - 1) {
          bars.push([x, z]);
        }
      }
    }
    return bars;
  }, [W, D, cov, bDia, nBarsX, nBarsY]);

  const linkCount = Math.max(2, Math.floor(height / linkSpacing));

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[W + 2, 0.1, D + 2]} />
        <meshStandardMaterial color="#1a1f3a" roughness={1} />
      </mesh>

      {/* Concrete column */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} emissive={colour} emissiveIntensity={0.05} roughness={0.8} />
      </mesh>

      {/* Wireframe */}
      <lineSegments position={[0, H / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(W, H, D)]} />
        <lineBasicMaterial color="#64748b" transparent opacity={0.5} />
      </lineSegments>

      {/* Column glow */}
      <ColumnGlow W={W} D={D} H={H} status={status} utilisation={utilisation} />

      {/* Reinforcement bars */}
      <RebarRing positions={barPositions} diameter={bDia} height={H - cov * 2} color="#3b82f6" />

      {/* Links / stirrups */}
      {Array.from({ length: linkCount }).map((_, i) => (
        <LinkStirrup key={i} w={W - cov * 2} d={D - cov * 2} y={cov + (i / (linkCount - 1)) * (H - cov * 2)} thick={lDia} />
      ))}

      {/* Animated axial load arrow */}
      {axialForce > 0 && <PulsingLoadArrow position={[0, H + 0.3, 0]} force={axialForce} />}

      {/* Moment label */}
      {moment > 0 && (
        <Text position={[W / 2 + 0.5, H / 2, 0]} fontSize={0.12} color="#f59e0b">
          {`M = ${moment.toFixed(0)} kNm`}
        </Text>
      )}

      {/* Dimension lines */}
      <DimensionLine start={[-W / 2 - 0.3, 0, 0]} end={[-W / 2 - 0.3, H, 0]} label={`h=${height}mm`} offset={0} />

      {/* Labels */}
      <Text position={[0, H + 0.9, 0]} fontSize={0.12} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <Text position={[0, -0.25, D / 2 + 0.3]} fontSize={0.1} color="#94a3b8">
        {`${width} × ${depth} mm`}
      </Text>
    </group>
  );
}
