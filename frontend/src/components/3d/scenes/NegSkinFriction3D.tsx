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

function AnimatedFrictionArrow({ baseX, y, direction, index, colour }: { baseX: number; y: number; direction: 'down' | 'up'; index: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 2.5 + index * 0.6) * 0.012 * (direction === 'down' ? -1 : 1);
    }
  });
  return (
    <group ref={ref} position={[baseX, y, 0]}>
      {direction === 'down' ? (
        <>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
            <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, -0.08, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.02, 0.03, 6]} />
            <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
            <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <coneGeometry args={[0.02, 0.03, 6]} />
            <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}

function NeutralPlaneGlow({ np, colour }: { np: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    }
  });
  return (
    <mesh ref={ref} position={[0, -np, 0]}>
      <boxGeometry args={[0.6, 0.015, 0.6]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface NegSkinFriction3DProps {
  pileDiameter?: number;
  pileLength?: number;
  fillDepth?: number;
  neutralPlane?: number;
  dragForce?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function NegSkinFriction3D({
  pileDiameter = 600,
  pileLength = 15000,
  fillDepth = 5000,
  neutralPlane = 7000,
  dragForce = 450,
  utilisation = 72,
  status = 'PASS',
}: NegSkinFriction3DProps) {
  const s = 1 / 5000;
  const r = Math.max(pileDiameter * s / 2, 0.03);
  const PL = pileLength * s;
  const fill = fillDepth * s;
  const np = neutralPlane * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Ground surface */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[2, 0.04, 1.5]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>

      {/* Fill layer (causing downdrag) */}
      <mesh position={[0, -fill / 2, 0]}>
        <boxGeometry args={[1.8, fill, 1.3]} />
        <meshStandardMaterial color="#a08060" transparent opacity={0.25} />
      </mesh>

      {/* Original soil below fill */}
      <mesh position={[0, -fill - (PL - fill) / 2, 0]}>
        <boxGeometry args={[1.8, PL - fill, 1.3]} />
        <meshStandardMaterial color="#6b5b45" transparent opacity={0.15} />
      </mesh>

      {/* Pile */}
      <mesh position={[0, -PL / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, PL, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.6} />
      </mesh>

      {/* Neutral plane indicator — animated glow */}
      <NeutralPlaneGlow np={np} colour="#f59e0b" />

      {/* Negative skin friction arrows — animated (pointing down along pile) */}
      {[0.15, 0.3, 0.45, 0.6].map((frac, i) => (
        <AnimatedFrictionArrow key={`neg${i}`} baseX={r + 0.05} y={-frac * np} direction="down" index={i} colour="#ef4444" />
      ))}

      {/* Positive skin friction arrows — animated (pointing up below NP) */}
      {[0.3, 0.5, 0.7, 0.9].map((frac, i) => (
        <AnimatedFrictionArrow key={`pos${i}`} baseX={r + 0.05} y={-np - (PL - np) * frac} direction="up" index={i + 4} colour="#22c55e" />
      ))}

      {/* Dimension lines */}
      <DimensionLine start={[-0.45, 0, 0.75]} end={[-0.45, -fill, 0.75]} color="#a08060" />
      <Text position={[-0.65, -fill / 2, 0.75]} fontSize={0.07} color="#a08060">
        {`${(fillDepth / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[0.45, 0, 0.75]} end={[0.45, -PL, 0.75]} color="#38bdf8" />
      <Text position={[0.65, -PL / 2, 0.75]} fontSize={0.07} color="#38bdf8">
        {`L = ${(pileLength / 1000).toFixed(0)}m`}
      </Text>

      {/* Labels */}
      <Text position={[-0.5, -fill / 2, 0]} fontSize={0.08} color="#a08060">
        Fill
      </Text>
      <Text position={[0.5, -np, 0]} fontSize={0.08} color="#f59e0b">
        {`Neutral Plane`}
      </Text>
      <Text position={[-0.5, -np / 2, 0]} fontSize={0.07} color="#ef4444">
        {`Qn = ${dragForce} kN ↓`}
      </Text>
      <Text position={[0, -PL - 0.12, 0]} fontSize={0.08} color="#94a3b8">
        {`Ø${pileDiameter}mm, L=${(pileLength / 1000).toFixed(0)}m`}
      </Text>

      {/* Status indicator */}
      <mesh position={[0.4, 0.1, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
