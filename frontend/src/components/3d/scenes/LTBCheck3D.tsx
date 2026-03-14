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

function BuckleGlow({ buckleCurve, colour }: { buckleCurve: THREE.CatmullRomCurve3; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref}>
      <tubeGeometry args={[buckleCurve, 40, 0.022, 8, false]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.18} />
    </mesh>
  );
}

function AnimatedMomentArrow({ x, BD, colour }: { x: number; BD: number; colour: string }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 1.5) * 0.08;
    }
  });
  return (
    <group ref={ref} position={[x, BD / 2 + 0.15, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.008, 6, 20, Math.PI]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.06, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <coneGeometry args={[0.015, 0.025, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface LTBCheck3DProps {
  beamLength?: number;
  beamDepth?: number;
  beamWidth?: number;
  flangeThick?: number;
  webThick?: number;
  buckleAmplitude?: number;
  moment?: number;
  chiLT?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function LTBCheck3D({
  beamLength = 6000,
  beamDepth = 457,
  beamWidth = 191,
  flangeThick = 14,
  webThick = 9,
  buckleAmplitude = 0.15,
  moment = 250,
  chiLT = 0.72,
  utilisation = 72,
  status = 'PASS',
}: LTBCheck3DProps) {
  const s = 1 / 2000;
  const BL = Math.min(beamLength * s, 4);
  const BD = beamDepth * s;
  const BW = beamWidth * s;
  const TF = flangeThick * s;
  const TW = webThick * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  // Buckled shape: sinusoidal lateral displacement
  const segments = 20;
  const buckleCurve = useMemo(() => {
    const bucklePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (t - 0.5) * BL;
      const z = Math.sin(t * Math.PI) * buckleAmplitude;
      bucklePoints.push(new THREE.Vector3(x, BD / 2, z));
    }
    return new THREE.CatmullRomCurve3(bucklePoints);
  }, [BL, BD, buckleAmplitude]);

  return (
    <group>
      {/* Supports */}
      {[-BL / 2, BL / 2].map((x, i) => (
        <group key={i} position={[x, -0.15, 0]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.08, 0.2, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Straight beam (unbuckled) - ghost */}
      <group position={[0, 0, 0]}>
        <mesh>
          <boxGeometry args={[BL, BD, TW]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.15} />
        </mesh>
        <mesh position={[0, BD / 2 - TF / 2, 0]}>
          <boxGeometry args={[BL, TF, BW]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.15} />
        </mesh>
        <mesh position={[0, -BD / 2 + TF / 2, 0]}>
          <boxGeometry args={[BL, TF, BW]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.15} />
        </mesh>
      </group>

      {/* Buckled beam shape */}
      <mesh>
        <tubeGeometry args={[buckleCurve, 40, 0.015, 8, false]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>

      {/* Buckle glow — animated */}
      <BuckleGlow buckleCurve={buckleCurve} colour={colour} />

      {/* Buckled top flange centerline for visibility */}
      <mesh position={[0, BD / 2, buckleAmplitude * 0.5]}>
        <boxGeometry args={[BL * 0.8, TF, BW]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.2} />
      </mesh>

      {/* Unrestrained length indicators */}
      <mesh position={[0, BD / 2 + 0.1, 0]}>
        <boxGeometry args={[BL, 0.005, 0.005]} />
        <meshStandardMaterial color="#00d9ff" />
      </mesh>

      {/* Moment arrows at ends — animated */}
      <AnimatedMomentArrow x={-BL / 2 + 0.1} BD={BD} colour="#3b82f6" />
      <AnimatedMomentArrow x={BL / 2 - 0.1} BD={BD} colour="#3b82f6" />

      {/* Dimension lines */}
      <DimensionLine start={[-BL / 2, -0.3, 0]} end={[BL / 2, -0.3, 0]} color="#38bdf8" />
      <Text position={[0, -0.38, 0]} fontSize={0.07} color="#38bdf8">
        {`L = ${(beamLength / 1000).toFixed(1)}m`}
      </Text>
      <DimensionLine start={[BL / 2 + 0.12, -BD / 2, 0]} end={[BL / 2 + 0.12, BD / 2, 0]} color="#38bdf8" />
      <Text position={[BL / 2 + 0.25, 0, 0]} fontSize={0.06} color="#38bdf8">
        {`${beamDepth}mm`}
      </Text>

      {/* Labels */}
      <Text position={[0, BD + 0.25, 0]} fontSize={0.08} color="#ef4444">
        {`M = ${moment} kNm`}
      </Text>
      <Text position={[BL / 2 + 0.15, BD / 2 + 0.15, 0]} fontSize={0.07} color="#f59e0b">
        {`χLT = ${chiLT.toFixed(2)}`}
      </Text>

      {/* Status indicator */}
      <mesh position={[BL / 2 + 0.05, BD + 0.05, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
