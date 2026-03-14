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
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.003, 0.003, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.008, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.008, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function BondGlow({ position, rotation, length, colour }: { position: [number, number, number]; rotation: [number, number, number]; length: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <cylinderGeometry args={[0.025, 0.025, length, 8]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} />
    </mesh>
  );
}

function TensionPulse({ position, colour, index }: { position: [number, number, number]; colour: string; index: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x = position[0] + Math.sin(clock.getElapsedTime() * 2 + index * 0.8) * 0.015;
    }
  });
  return (
    <group>
      <mesh ref={ref} position={position}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.08, 6]} />
          <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <coneGeometry args={[0.02, 0.03, 6]} />
          <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.6} />
        </mesh>
      </mesh>
    </group>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface GroundAnchor3DProps {
  anchorLength?: number;
  freeLength?: number;
  bondLength?: number;
  inclination?: number;
  anchorLoad?: number;
  numAnchors?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function GroundAnchor3D({
  anchorLength = 15000,
  freeLength = 8000,
  bondLength = 7000,
  inclination = 15,
  anchorLoad = 500,
  numAnchors = 3,
  utilisation = 74,
  status = 'PASS',
}: GroundAnchor3DProps) {
  const s = 1 / 8000;
  const AL = anchorLength * s;
  const FL = freeLength * s;
  const BLn = bondLength * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const incRad = (inclination * Math.PI) / 180;

  return (
    <group>
      {/* Retaining wall face */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.04, 1.2, numAnchors * 0.35 + 0.2]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.7} />
      </mesh>

      {/* Ground behind wall */}
      <mesh position={[AL / 2 + 0.02, 0.2, 0]}>
        <boxGeometry args={[AL + 0.04, 1, numAnchors * 0.4 + 0.4]} />
        <meshStandardMaterial color="#78552b" transparent opacity={0.2} roughness={0.9} />
      </mesh>

      {/* Ground in front */}
      <mesh position={[-0.3, -0.5, 0]}>
        <boxGeometry args={[0.6, 0.3, numAnchors * 0.4 + 0.4]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Anchors */}
      {Array.from({ length: numAnchors }).map((_, i) => {
        const z = (i - (numAnchors - 1) / 2) * 0.3;
        const y = 0.2 - i * 0.15;
        const tipX = AL * Math.cos(incRad);
        const tipY = y - AL * Math.sin(incRad);
        const midX = tipX / 2;
        const midY = (y + tipY) / 2;

        return (
          <group key={`anc${i}`}>
            {/* Tendon (full length) */}
            <mesh
              position={[midX + 0.02, midY, z]}
              rotation={[0, 0, -incRad]}
            >
              <cylinderGeometry args={[0.006, 0.006, AL, 8]} />
              <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Bond length zone (grout body) */}
            <mesh
              position={[
                0.02 + (FL + BLn / 2) * Math.cos(incRad),
                y - (FL + BLn / 2) * Math.sin(incRad),
                z,
              ]}
              rotation={[0, 0, -incRad]}
            >
              <cylinderGeometry args={[0.02, 0.02, BLn, 8]} />
              <meshStandardMaterial color="#3b82f6" transparent opacity={0.4} />
            </mesh>

            {/* Bond zone glow — animated */}
            <BondGlow
              position={[
                0.02 + (FL + BLn / 2) * Math.cos(incRad),
                y - (FL + BLn / 2) * Math.sin(incRad),
                z,
              ]}
              rotation={[0, 0, -incRad]}
              length={BLn}
              colour={colour}
            />

            {/* Anchor head (bearing plate) */}
            <mesh position={[-0.02, y, z]}>
              <boxGeometry args={[0.02, 0.06, 0.06]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.6} />
            </mesh>

            {/* Wedge/lock nut */}
            <mesh position={[-0.04, y, z]}>
              <cylinderGeometry args={[0.015, 0.015, 0.02, 6]} />
              <meshStandardMaterial color="#71717a" metalness={0.8} />
            </mesh>

            {/* Tension pulse arrow — animated */}
            <TensionPulse position={[-0.06, y, z]} colour="#ef4444" index={i} />
          </group>
        );
      })}

      {/* Dimension lines */}
      <DimensionLine
        start={[0.02, 0.55, (numAnchors * 0.35) / 2 + 0.12]}
        end={[0.02 + FL * Math.cos(incRad), 0.55 - FL * Math.sin(incRad), (numAnchors * 0.35) / 2 + 0.12]}
        color="#94a3b8"
      />
      <Text
        position={[FL * Math.cos(incRad) * 0.4, 0.62, (numAnchors * 0.35) / 2 + 0.12]}
        fontSize={0.05}
        color="#94a3b8"
      >
        {`Free ${(freeLength / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine
        start={[0.02 + FL * Math.cos(incRad), 0.55 - FL * Math.sin(incRad), (numAnchors * 0.35) / 2 + 0.12]}
        end={[0.02 + AL * Math.cos(incRad), 0.55 - AL * Math.sin(incRad), (numAnchors * 0.35) / 2 + 0.12]}
        color="#3b82f6"
      />
      <Text
        position={[(FL + BLn / 2) * Math.cos(incRad), 0.62 - (FL + BLn / 2) * Math.sin(incRad), (numAnchors * 0.35) / 2 + 0.12]}
        fontSize={0.05}
        color="#3b82f6"
      >
        {`Bond ${(bondLength / 1000).toFixed(1)}m`}
      </Text>

      {/* Labels */}
      <Text position={[0, 0.75, 0]} fontSize={0.07} color="#94a3b8">
        {`${numAnchors} ground anchors @ ${inclination}°`}
      </Text>
      <Text position={[0, 0.88, 0]} fontSize={0.06} color="#f59e0b">
        {`${anchorLoad} kN each, L = ${(anchorLength / 1000).toFixed(1)}m`}
      </Text>

      {/* Status indicator */}
      <mesh position={[-0.1, 0.65, (numAnchors * 0.35) / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
