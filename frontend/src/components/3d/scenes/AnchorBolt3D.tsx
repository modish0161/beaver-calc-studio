import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface AnchorBolt3DProps {
  boltDiameter?: number;
  embedDepth?: number;
  numBolts?: number;
  edgeDist?: number;
  plateSize?: number;
  plateThick?: number;
  tensionForce?: number;
  shearForce?: number;
  status?: 'PASS' | 'FAIL';
  utilisation?: number;
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
        <boxGeometry args={[len, 0.006, 0.006]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mid[0] + 0.15, mid[1], mid[2]]} fontSize={0.07} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── Animated tension arrow ──────────────────────────────────────────── */
function PulsingTensionArrow({ y, force, colour }: { y: number; force: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  if (force <= 0) return null;
  return (
    <group ref={ref} position={[0, y, 0]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <coneGeometry args={[0.05, 0.08, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0.3, 0.2, 0]} fontSize={0.08} color={colour}>
        {`T = ${force} kN`}
      </Text>
    </group>
  );
}

/* ── Bolt glow (per bolt) ────────────────────────────────────────────── */
function BoltGlow({ x, z, boltR, embed, PT, colour, index }: {
  x: number; z: number; boltR: number; embed: number; PT: number;
  colour: string; index: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const mat = ref.current?.material as THREE.MeshStandardMaterial;
    if (mat) mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2 + index * 0.6) * 0.25;
  });
  return (
    <mesh ref={ref} position={[x, -embed / 2, z]}>
      <cylinderGeometry args={[boltR * 2.2, boltR * 2.2, embed + PT + 0.1, 8]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} />
    </mesh>
  );
}

export default function AnchorBolt3D({
  boltDiameter = 20,
  embedDepth = 200,
  numBolts = 4,
  edgeDist = 100,
  plateSize = 350,
  plateThick = 20,
  tensionForce = 80,
  shearForce = 50,
  status = 'PASS',
  utilisation = 68,
}: AnchorBolt3DProps) {
  const s = 1 / 150;
  const boltR = boltDiameter * s / 2;
  const embed = embedDepth * s;
  const ed = edgeDist * s;
  const PS = plateSize * s;
  const PT = plateThick * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  // Bolt positions in grid pattern
  const positions: [number, number][] = [];
  if (numBolts <= 2) {
    positions.push([-ed, 0], [ed, 0]);
  } else {
    const side = Math.ceil(Math.sqrt(numBolts));
    for (let i = 0; i < numBolts; i++) {
      const r = Math.floor(i / side);
      const c = i % side;
      positions.push([(c - (side - 1) / 2) * ed * 2, (r - (side - 1) / 2) * ed * 2]);
    }
  }

  return (
    <group>
      {/* Concrete block */}
      <mesh position={[0, -embed / 2 - PT, 0]} castShadow>
        <boxGeometry args={[PS + 1, embed + 0.4, PS + 1]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.4} roughness={0.9} />
      </mesh>
      <lineSegments position={[0, -embed / 2 - PT, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(PS + 1, embed + 0.4, PS + 1)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.3} />
      </lineSegments>

      {/* Base plate */}
      <mesh position={[0, PT / 2, 0]} castShadow>
        <boxGeometry args={[PS, PT, PS]} />
        <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Anchor bolts + glow */}
      {positions.map(([x, z], i) => (
        <group key={i}>
          {/* Glow envelope */}
          <BoltGlow x={x} z={z} boltR={boltR} embed={embed} PT={PT} colour={colour} index={i} />
          {/* Shaft embedded in concrete */}
          <mesh position={[x, -embed / 2, z]}>
            <cylinderGeometry args={[boltR, boltR, embed + PT + 0.1, 8]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Nut on top */}
          <mesh position={[x, PT + 0.025, z]}>
            <cylinderGeometry args={[boltR * 1.6, boltR * 1.6, 0.05, 6]} />
            <meshStandardMaterial color="#a3a3a3" metalness={0.9} />
          </mesh>
          {/* Washer */}
          <mesh position={[x, PT + 0.005, z]}>
            <cylinderGeometry args={[boltR * 2, boltR * 2, 0.01, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          {/* Hook/anchor at base */}
          <mesh position={[x, -embed - 0.02, z]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[boltR * 2, boltR, 8, 8, Math.PI]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Breakout cone (dotted outline) */}
      <mesh position={[0, -embed * 0.4, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[embed * 0.7, embed * 0.7, 16, 1, true]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.1} side={THREE.DoubleSide} wireframe />
      </mesh>

      {/* Animated tension arrow */}
      <PulsingTensionArrow y={PT + 0.4} force={tensionForce} colour={colour} />

      {/* Embed depth dimension */}
      <DimensionLine
        from={[PS / 2 + 0.2, 0, 0]}
        to={[PS / 2 + 0.2, -embed, 0]}
        offset={[0.1, 0, 0]}
        label={`hef = ${embedDepth}mm`}
      />

      {/* Labels */}
      <Text position={[PS / 2 + 0.3, 0, 0]} fontSize={0.08} color="#94a3b8">
        {`${numBolts}×M${boltDiameter}`}
      </Text>
      <mesh position={[PS / 2 + 0.1, PT + 0.1, PS / 2]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
