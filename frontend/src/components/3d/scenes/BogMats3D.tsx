// =============================================================================
// 3D Scene: Bog Mats / Track Mats — ground mat on soil with loading
// =============================================================================

import * as THREE from 'three';
import { Text } from '../BillboardText';

interface BogMats3DProps {
  matLength?: number;    // m
  matWidth?: number;     // m
  matThickness?: number; // mm
  nMats?: number;
  appliedLoad?: number;  // kN
  bearingCapacity?: number; // kPa
  status?: 'PASS' | 'FAIL';
}

// Single timber mat
function TimberMat({
  position,
  length,
  width,
  thickness,
  highlight = false,
}: {
  position: [number, number, number];
  length: number;
  width: number;
  thickness: number;
  highlight?: boolean;
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, thickness, width]} />
        <meshStandardMaterial
          color={highlight ? '#b45309' : '#92400e'}
          emissive={highlight ? '#f59e0b' : '#92400e'}
          emissiveIntensity={highlight ? 0.15 : 0.05}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {/* Wood grain lines */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[(i - 2) * (length / 6), thickness / 2 + 0.001, 0]}>
          <boxGeometry args={[0.01, 0.001, width * 0.9]} />
          <meshStandardMaterial color="#78350f" transparent opacity={0.3} />
        </mesh>
      ))}
      {/* Edge wireframe */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(length, thickness, width)]} />
        <lineBasicMaterial color="#fbbf24" transparent opacity={0.3} />
      </lineSegments>
    </group>
  );
}

// Wheel/track load
function WheelLoad({ position, force }: { position: [number, number, number]; force: number }) {
  return (
    <group position={position}>
      {/* Tyre */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
      {/* Load arrow */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.2, 0.45, 0]} fontSize={0.09} color="#ef4444">
        {`${force} kN`}
      </Text>
    </group>
  );
}

// Bearing pressure visualisation under mat
function BearingPressure({
  length,
  width,
  y,
  capacity,
}: {
  length: number;
  width: number;
  y: number;
  capacity: number;
}) {
  const count = 6;
  const arrows = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < 3; j++) {
      const x = -length / 2 + 0.2 + (i * (length - 0.4)) / (count - 1);
      const z = -width / 2 + 0.15 + (j * (width - 0.3)) / 2;
      arrows.push(
        <group key={`${i}-${j}`} position={[x, y - 0.15, z]}>
          <mesh>
            <cylinderGeometry args={[0.01, 0.01, 0.15, 6]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <coneGeometry args={[0.03, 0.06, 6]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
          </mesh>
        </group>,
      );
    }
  }

  return <group>{arrows}</group>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function BogMats3D({
  matLength = 4.8,
  matWidth = 1.2,
  matThickness = 150,
  nMats = 3,
  appliedLoad = 100,
  bearingCapacity = 50,
  status = 'PASS',
}: BogMats3DProps) {
  const s = 1.5 / Math.max(matLength, matWidth * nMats, 3);
  const mL = matLength * s;
  const mW = matWidth * s;
  const mT = (matThickness / 1000) * s * 5; // exaggerate thickness for visibility

  return (
    <group position={[0, 0, 0]}>
      {/* Ground/soil */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[mL + 2, 0.3, mW * nMats + 2]} />
        <meshStandardMaterial color="#5c4033" roughness={1} />
      </mesh>

      {/* Soft top soil */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[mL + 1.5, 0.02, mW * nMats + 1.5]} />
        <meshStandardMaterial color="#6b4e2c" roughness={1} />
      </mesh>

      {/* Mats laid side by side */}
      {Array.from({ length: nMats }, (_, i) => {
        const zOffset = -((nMats - 1) * mW) / 2 + i * mW;
        return (
          <TimberMat
            key={i}
            position={[0, mT / 2 + 0.02, zOffset]}
            length={mL}
            width={mW * 0.95}
            thickness={mT}
            highlight={i % 2 === 0}
          />
        );
      })}

      {/* Bearing pressure arrows */}
      <BearingPressure
        length={mL}
        width={mW * nMats}
        y={0}
        capacity={bearingCapacity}
      />

      {/* Wheel loads on top */}
      <WheelLoad position={[-mL / 4, mT + 0.17, 0]} force={Math.round(appliedLoad / 2)} />
      <WheelLoad position={[mL / 4, mT + 0.17, 0]} force={Math.round(appliedLoad / 2)} />

      {/* Labels */}
      <Text position={[0, mT + 0.8, 0]} fontSize={0.14} color="#00d9ff" anchorX="center">
        Bog Mats / Track Mats
      </Text>

      <Text position={[mL / 2 + 0.3, mT / 2 + 0.02, 0]} fontSize={0.1} color="#94a3b8" anchorX="left">
        {`${matLength}m × ${matWidth}m × ${matThickness}mm`}
      </Text>

      <Text position={[0, -0.35, 0]} fontSize={0.1} color="#22c55e" anchorX="center">
        {`Bearing: ${bearingCapacity} kPa`}
      </Text>

      {/* Dimension line */}
      <mesh position={[0, -0.05, mW * nMats / 2 + 0.3]}>
        <boxGeometry args={[mL, 0.01, 0.01]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text
        position={[0, -0.12, mW * nMats / 2 + 0.3]}
        fontSize={0.09}
        color="#94a3b8"
        anchorX="center"
      >
        {`L = ${matLength}m`}
      </Text>
    </group>
  );
}
