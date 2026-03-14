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

function AnimatedShearArrow({ position, colour }: { position: [number, number, number]; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) { ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.04; }
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, -0.38, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.08, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function FinPlateGlow({ PD, PW, PT, colour }: { PD: number; PW: number; PT: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[PT / 2 + 0.002, 0, 0.3 + PW / 2]}>
      <planeGeometry args={[PD * 0.9, PW * 0.9]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface FinPlate3DProps {
  beamDepth?: number;
  plateDepth?: number;
  plateWidth?: number;
  plateThick?: number;
  numBolts?: number;
  boltDiameter?: number;
  shear?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function FinPlate3D({
  beamDepth = 406,
  plateDepth = 300,
  plateWidth = 150,
  plateThick = 10,
  numBolts = 3,
  boltDiameter = 20,
  shear = 180,
  utilisation = 74,
  status = 'PASS',
}: FinPlate3DProps) {
  const s = 1 / 300;
  const BD = beamDepth * s;
  const PD = plateDepth * s;
  const PW = plateWidth * s;
  const PT = plateThick * s;
  const boltR = boltDiameter * s / 2;
  const beamLen = 2;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  return (
    <group>
      {/* Supporting column/beam web */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 3, 0.6]} />
        <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Fin plate (welded to column) */}
      <mesh position={[0, 0, 0.3 + PW / 2]} castShadow>
        <boxGeometry args={[PT, PD, PW]} />
        <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Fin plate glow */}
      <FinPlateGlow PD={PD} PW={PW} PT={PT} colour={colour} />

      {/* Weld lines */}
      <mesh position={[0, 0, 0.3 + 0.005]}>
        <boxGeometry args={[PT + 0.01, PD * 0.9, 0.01]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
      </mesh>

      {/* Beam (bolted to fin plate) */}
      <group position={[0, 0, 0.3 + PW + beamLen / 2]}>
        <mesh>
          <boxGeometry args={[0.03, BD, beamLen]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, BD / 2 - 0.02, 0]}>
          <boxGeometry args={[BD * 0.4, 0.04, beamLen]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -BD / 2 + 0.02, 0]}>
          <boxGeometry args={[BD * 0.4, 0.04, beamLen]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Bolts through fin plate + beam web */}
      {Array.from({ length: numBolts }).map((_, i) => {
        const y = (i - (numBolts - 1) / 2) * (PD / (numBolts + 1));
        return (
          <group key={i}>
            <mesh position={[0, y, 0.3 + PW / 2]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[boltR, boltR, PW + 0.04, 8]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Bolt heads */}
            <mesh position={[PT / 2 + 0.01, y, 0.3 + PW / 2]}>
              <cylinderGeometry args={[boltR * 1.4, boltR * 1.4, 0.015, 6]} />
              <meshStandardMaterial color="#a3a3a3" metalness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Animated shear arrow */}
      <AnimatedShearArrow position={[0.3, 0, 0.3 + PW + beamLen]} colour={colour} />
      <Text position={[0.5, -0.25, 0.3 + PW + beamLen]} fontSize={0.09} color={colour}>
        {`V = ${shear} kN`}
      </Text>

      {/* Dimension lines */}
      <DimensionLine start={[-PT / 2 - 0.15, -PD / 2, 0.3 + PW / 2]} end={[-PT / 2 - 0.15, PD / 2, 0.3 + PW / 2]} color="#38bdf8" />
      <Text position={[-PT / 2 - 0.3, 0, 0.3 + PW / 2]} fontSize={0.06} color="#38bdf8">
        {`${plateDepth}mm`}
      </Text>

      {/* Labels */}
      <Text position={[PW + 0.15, PD / 2 + 0.1, 0.3 + PW / 2]} fontSize={0.07} color="#94a3b8">
        {`${numBolts}×M${boltDiameter}`}
      </Text>
      <Text position={[0, -BD / 2 - 0.15, 0.3 + PW + beamLen / 2]} fontSize={0.08} color="#94a3b8">
        {`Fin plate: ${plateDepth}×${plateWidth}×${plateThick}`}
      </Text>
      <mesh position={[0.3, BD / 2, 0.3 + PW]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
