import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
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

function AnimatedUpArrow({ colour }: { colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = -0.2 + Math.sin(clock.getElapsedTime() * 2) * 0.025;
  });
  return (
    <group ref={ref} position={[0, -0.2, 0]}>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.13, 0]}>
        <coneGeometry args={[0.06, 0.1, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function ConeGlow({ critW, CW, SD, colour }: { critW: number; CW: number; SD: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    }
  });
  return (
    <mesh ref={ref} position={[0, SD / 2, 0]} rotation={[Math.PI, 0, 0]}>
      <cylinderGeometry args={[critW / 1.6, CW / 1.6, SD * 0.95, 4, 1, true]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.2} transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface PunchingShear3DProps {
  slabDepth?: number;
  columnWidth?: number;
  columnDepth?: number;
  perimeterDist?: number;
  load?: number;
  vEd?: number;
  vRd?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function PunchingShear3D({
  slabDepth = 300,
  columnWidth = 400,
  columnDepth = 400,
  perimeterDist = 600,
  load = 500,
  vEd = 0.8,
  vRd = 1.1,
  utilisation = 72,
  status = 'PASS',
}: PunchingShear3DProps) {
  const s = 1 / 500;
  const SD = Math.max(slabDepth * s, 0.15);
  const CW = columnWidth * s;
  const CD = columnDepth * s;
  const pd = perimeterDist * s;
  const slabSize = 3;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  // Critical perimeter (2d from column face)
  const critW = CW + 2 * pd;
  const critD = CD + 2 * pd;

  return (
    <group>
      {/* Column below */}
      <mesh position={[0, -1.2, 0]} castShadow>
        <boxGeometry args={[CW, 2, CD]} />
        <meshStandardMaterial color="#6b7280" roughness={0.7} />
      </mesh>

      {/* Slab (semi-transparent to show punch-through zone) */}
      <mesh position={[0, SD / 2, 0]} castShadow>
        <boxGeometry args={[slabSize, SD, slabSize]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.4} roughness={0.7} />
      </mesh>
      <lineSegments position={[0, SD / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(slabSize, SD, slabSize)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.3} />
      </lineSegments>

      {/* Punching shear failure cone — animated glow */}
      <ConeGlow critW={critW} CW={CW} SD={SD} colour={colour} />

      {/* Critical perimeter outline (at 2d) */}
      <lineSegments position={[0, SD + 0.02, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(critW, 0.01, critD)]} />
        <lineBasicMaterial color="#f59e0b" linewidth={2} />
      </lineSegments>

      {/* Column outline at slab soffit */}
      <lineSegments position={[0, 0.01, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(CW, 0.01, CD)]} />
        <lineBasicMaterial color="#ef4444" />
      </lineSegments>

      {/* Shear reinforcement studs */}
      {[[-0.6, -0.6], [-0.6, 0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]].map(([dx, dz], i) => {
        const x = dx * pd * 0.6;
        const z = dz * pd * 0.6;
        return (
          <mesh key={i} position={[x, SD / 2, z]}>
            <cylinderGeometry args={[0.015, 0.015, SD * 0.85, 6]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.6} />
          </mesh>
        );
      })}

      {/* Load arrow — animated */}
      <AnimatedUpArrow colour="#ef4444" />

      {/* Dimension lines */}
      <DimensionLine start={[slabSize / 2 + 0.1, 0, 0]} end={[slabSize / 2 + 0.1, SD, 0]} color="#38bdf8" />
      <Text position={[slabSize / 2 + 0.25, SD / 2, 0]} fontSize={0.08} color="#38bdf8">
        {`h = ${slabDepth}mm`}
      </Text>
      <DimensionLine start={[-critW / 2, SD + 0.06, critD / 2 + 0.06]} end={[critW / 2, SD + 0.06, critD / 2 + 0.06]} color="#f59e0b" />

      {/* Labels */}
      <Text position={[0, SD + 0.2, critD / 2 + 0.1]} fontSize={0.08} color="#f59e0b">
        {`u₁ = critical perimeter at 2d`}
      </Text>
      <Text position={[0, -1.5, CW]} fontSize={0.09} color="#ef4444">
        {`V = ${load} kN`}
      </Text>
      <Text position={[0, SD + 0.35, 0]} fontSize={0.09} color={colour}>
        {`vEd/vRd = ${(vEd / vRd).toFixed(2)}`}
      </Text>

      {/* Status indicator */}
      <mesh position={[slabSize / 2, SD, slabSize / 2]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
