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
      <mesh position={start}><sphereGeometry args={[0.006, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.006, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedMomentArrow({ position, colour }: { position: [number, number, number]; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) { ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.5) * 0.08; }
  });
  return (
    <group ref={ref} position={position}>
      <mesh><torusGeometry args={[0.12, 0.012, 8, 24, Math.PI * 1.5]} /><meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} /></mesh>
      <mesh position={[0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.03, 0.06, 6]} /><meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} /></mesh>
    </group>
  );
}

function PlateGlow({ PW, PH, BD, PT, colour }: { PW: number; PH: number; BD: number; PT: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, 0, BD / 2 + PT + 0.002]}>
      <planeGeometry args={[PW * 0.95, PH * 0.95]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface EndPlate3DProps {
  beamDepth?: number;
  beamWidth?: number;
  plateHeight?: number;
  plateWidth?: number;
  plateThick?: number;
  numBolts?: number;
  boltDiameter?: number;
  moment?: number;
  shear?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function EndPlate3D({
  beamDepth = 457,
  beamWidth = 191,
  plateHeight = 550,
  plateWidth = 220,
  plateThick = 20,
  numBolts = 6,
  boltDiameter = 20,
  moment = 180,
  shear = 120,
  utilisation = 72,
  status = 'PASS',
}: EndPlate3DProps) {
  const s = 1 / 300;
  const BD = beamDepth * s;
  const BW = beamWidth * s;
  const PH = plateHeight * s;
  const PW = plateWidth * s;
  const PT = plateThick * s;
  const boltR = boltDiameter * s / 2;
  const beamLen = 2.5;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  // Bolt positions (2 columns)
  const boltPositions: [number, number][] = [];
  const rows = numBolts / 2;
  for (let i = 0; i < rows; i++) {
    const y = (i - (rows - 1) / 2) * (PH / (rows + 1));
    boltPositions.push([-PW * 0.3, y]);
    boltPositions.push([PW * 0.3, y]);
  }

  return (
    <group>
      {/* Column (vertical I-section) */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 3, BD]} />
        <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Column flanges */}
      <mesh position={[BW / 2, 0, 0]} castShadow>
        <boxGeometry args={[0.04, 3, 0.06]} />
        <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-BW / 2, 0, 0]} castShadow>
        <boxGeometry args={[0.04, 3, 0.06]} />
        <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* End plate */}
      <mesh position={[0, 0, BD / 2 + PT / 2]} castShadow>
        <boxGeometry args={[PW, PH, PT]} />
        <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Plate glow */}
      <PlateGlow PW={PW} PH={PH} BD={BD} PT={PT} colour={colour} />

      {/* Bolts */}
      {boltPositions.map(([x, y], i) => (
        <group key={i}>
          <mesh position={[x, y, BD / 2 + PT + 0.01]}>
            <cylinderGeometry args={[boltR * 1.5, boltR * 1.5, 0.02, 6]} />
            <meshStandardMaterial color="#a3a3a3" metalness={0.9} />
          </mesh>
          <mesh position={[x, y, BD / 2 + PT / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[boltR, boltR, PT + 0.08, 8]} />
            <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Beam (coming out from plate) */}
      <group position={[0, 0, BD / 2 + PT + beamLen / 2]}>
        {/* Web */}
        <mesh>
          <boxGeometry args={[0.03, BD, beamLen]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Top flange */}
        <mesh position={[0, BD / 2 - 0.02, 0]}>
          <boxGeometry args={[BW, 0.04, beamLen]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Bottom flange */}
        <mesh position={[0, -BD / 2 + 0.02, 0]}>
          <boxGeometry args={[BW, 0.04, beamLen]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Weld lines at plate-to-beam */}
      <mesh position={[0, 0, BD / 2 + PT]}>
        <boxGeometry args={[0.035, BD * 0.9, 0.01]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
      </mesh>

      {/* Animated moment arrow */}
      <AnimatedMomentArrow position={[PW / 2 + 0.25, 0, BD / 2 + PT + beamLen / 2]} colour="#ef4444" />

      {/* Dimension lines */}
      <DimensionLine start={[-PW / 2 - 0.12, -PH / 2, BD / 2 + PT]} end={[-PW / 2 - 0.12, PH / 2, BD / 2 + PT]} color="#38bdf8" />
      <Text position={[-PW / 2 - 0.25, 0, BD / 2 + PT]} fontSize={0.07} color="#38bdf8">
        {`${plateHeight}mm`}
      </Text>

      {/* Labels */}
      <Text position={[PW / 2 + 0.2, 0.3, BD / 2 + PT]} fontSize={0.08} color="#94a3b8">
        {`${numBolts}×M${boltDiameter}`}
      </Text>
      <Text position={[0, PH / 2 + 0.15, BD / 2 + PT + beamLen / 2]} fontSize={0.09} color="#ef4444">
        {`M = ${moment} kNm`}
      </Text>
      <Text position={[0, -PH / 2 - 0.1, BD / 2 + PT + beamLen / 2]} fontSize={0.08} color="#f59e0b">
        {`V = ${shear} kN`}
      </Text>
      <mesh position={[PW / 2 + 0.1, PH / 2, BD / 2 + PT]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
