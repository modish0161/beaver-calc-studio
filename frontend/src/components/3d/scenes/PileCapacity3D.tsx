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

function AnimatedLoadArrow({ y, colour }: { y: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 2) * 0.03;
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.1, 8]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function SkinFrictionArrow({ r, yOff, index }: { r: number; yOff: number; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = r + 0.03 + Math.sin(clock.getElapsedTime() * 2.5 + index * 0.6) * 0.01;
  });
  return (
    <group ref={ref} position={[r + 0.03, yOff, 0]}>
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.015, 0.04, 4]} />
        <meshStandardMaterial color="#22c55e" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function EndBearingGlow({ r, y, colour }: { r: number; y: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <cylinderGeometry args={[r + 0.02, r + 0.04, 0.04, 16]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.5} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface PileCapacity3DProps {
  pileDiameter?: number;
  pileLength?: number;
  numPiles?: number;
  embedDepth?: number;
  load?: number;
  capacity?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function PileCapacity3D({
  pileDiameter = 600,
  pileLength = 12000,
  numPiles = 1,
  embedDepth = 2000,
  load = 1200,
  capacity = 1500,
  utilisation = 72,
  status = 'PASS',
}: PileCapacity3DProps) {
  const s = 1 / 4000;
  const r = Math.max(pileDiameter * s / 2, 0.04);
  const PL = pileLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  // Pile group layout (1, 2, 3, 4, 6, 9 piles)
  const positions: [number, number][] = [];
  if (numPiles <= 1) {
    positions.push([0, 0]);
  } else if (numPiles === 2) {
    positions.push([-0.2, 0], [0.2, 0]);
  } else if (numPiles <= 4) {
    positions.push([-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]);
  } else {
    const n = Math.ceil(Math.sqrt(numPiles));
    for (let i = 0; i < numPiles && i < 9; i++) {
      const row = Math.floor(i / n);
      const col = i % n;
      positions.push([(col - (n - 1) / 2) * 0.3, (row - (n - 1) / 2) * 0.3]);
    }
  }

  return (
    <group>
      {/* Ground surface */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[2, 0.05, 2]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>

      {/* Soil layers */}
      <mesh position={[0, -PL / 2, 0]}>
        <boxGeometry args={[1.6, PL, 1.6]} />
        <meshStandardMaterial color="#6b5b45" transparent opacity={0.15} />
      </mesh>

      {/* Pile cap */}
      {numPiles > 1 && (
        <group>
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.8, 0.2, 0.8]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.7} />
          </mesh>
          <lineSegments position={[0, 0.12, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(0.8, 0.2, 0.8)]} />
            <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
          </lineSegments>
        </group>
      )}

      {/* Piles */}
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, -PL / 2, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[r, r, PL, 16]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.6} />
          </mesh>
          {/* Skin friction arrows — animated */}
          {[0.2, 0.4, 0.6, 0.8].map((frac, j) => (
            <SkinFrictionArrow key={j} r={r} yOff={PL / 2 - PL * frac} index={j} />
          ))}
          {/* End bearing — animated glow */}
          <EndBearingGlow r={r} y={-PL / 2 - 0.02} colour="#f59e0b" />
        </group>
      ))}

      {/* Load arrow — animated */}
      <AnimatedLoadArrow y={numPiles > 1 ? 0.5 : 0.3} colour="#ef4444" />
      <Text position={[0.35, (numPiles > 1 ? 0.5 : 0.3) + 0.3, 0]} fontSize={0.1} color="#ef4444">
        {`P = ${load} kN`}
      </Text>

      {/* Dimension lines */}
      <DimensionLine start={[0.55, 0, 0]} end={[0.55, -PL, 0]} color="#38bdf8" />
      <Text position={[0.75, -PL / 2, 0]} fontSize={0.08} color="#38bdf8">
        {`L = ${(pileLength / 1000).toFixed(0)}m`}
      </Text>

      {/* Labels */}
      <Text position={[0, -PL - 0.15, 0]} fontSize={0.09} color="#94a3b8">
        {`Ø${pileDiameter}mm × ${numPiles} pile${numPiles > 1 ? 's' : ''}`}
      </Text>
      <Text position={[-0.6, -PL * 0.7, 0]} fontSize={0.08} color="#22c55e">
        {`Qult = ${capacity} kN`}
      </Text>

      {/* Status indicator */}
      <mesh position={[0.5, 0.3, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
