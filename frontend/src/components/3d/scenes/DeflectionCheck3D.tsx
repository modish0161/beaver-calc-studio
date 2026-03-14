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
      <mesh position={mid} quaternion={quat}><cylinderGeometry args={[0.002, 0.002, len, 4]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={start}><sphereGeometry args={[0.005, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={end}><sphereGeometry args={[0.005, 6, 6]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function AnimatedLoadArrow({ position, index }: { position: [number, number, number]; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) { ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2.5 + index * 0.4) * 0.008; }
  });
  return (
    <group ref={ref} position={position}>
      <mesh><cylinderGeometry args={[0.003, 0.003, 0.04, 6]} /><meshStandardMaterial color="#f59e0b" /></mesh>
      <mesh position={[0, -0.025, 0]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.007, 0.015, 6]} /><meshStandardMaterial color="#f59e0b" /></mesh>
    </group>
  );
}

function DeflectedBeamGlow({ L, D, W, defScale, colour }: { L: number; D: number; W: number; defScale: number; colour: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
    }
  });
  return (
    <mesh ref={ref} position={[0, D / 2 - defScale, W / 2 + 0.002]}>
      <planeGeometry args={[L * 0.5, D * 0.6]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── main component ──────────────────────────────────────────── */

export interface DeflectionCheck3DProps {
  beamLength?: number;
  beamDepth?: number;
  beamWidth?: number;
  deflection?: number;
  deflectionLimit?: number;
  loadType?: 'udl' | 'point';
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function DeflectionCheck3D({
  beamLength = 8000,
  beamDepth = 400,
  beamWidth = 200,
  deflection = 22,
  deflectionLimit = 32,
  loadType = 'udl',
  utilisation = 69,
  status = 'PASS',
}: DeflectionCheck3DProps) {
  const s = 1 / 6000;
  const L = beamLength * s;
  const D = beamDepth * s;
  const W = beamWidth * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const defScale = deflection * s * 20; // exaggerated for visibility

  const curvePoints = 20;

  return (
    <group>
      {/* Original beam position (wireframe) */}
      <mesh position={[0, D / 2, 0]}>
        <boxGeometry args={[L, D, W]} />
        <meshStandardMaterial color="#6b7280" transparent opacity={0.15} wireframe />
      </mesh>

      {/* Deflected beam segments */}
      {Array.from({ length: curvePoints }).map((_, i) => {
        const t = (i + 0.5) / curvePoints;
        const x = -L / 2 + t * L;
        const segW = L / curvePoints;
        const def = -defScale * 4 * t * (1 - t);
        return (
          <mesh key={`seg${i}`} position={[x, D / 2 + def, 0]}>
            <boxGeometry args={[segW * 1.01, D, W]} />
            <meshStandardMaterial color="#60a5fa" transparent opacity={0.6} roughness={0.5} metalness={0.5} />
          </mesh>
        );
      })}

      {/* Deflected beam midspan glow */}
      <DeflectedBeamGlow L={L} D={D} W={W} defScale={defScale} colour={colour} />

      {/* Deflection dimension (vertical at midspan) */}
      <group position={[0, 0, W / 2 + 0.03]}>
        <mesh position={[0, D / 2 - defScale / 2, 0]}>
          <boxGeometry args={[0.003, defScale, 0.003]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, D / 2, 0]}>
          <boxGeometry args={[0.015, 0.002, 0.002]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, D / 2 - defScale, 0]}>
          <boxGeometry args={[0.015, 0.002, 0.002]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <Text position={[0.06, D / 2 - defScale / 2, 0]} fontSize={0.035} color="#ef4444">
          {`δ = ${deflection.toFixed(1)}mm`}
        </Text>
      </group>

      {/* Load arrows — animated */}
      {loadType === 'udl' ? (
        Array.from({ length: 8 }).map((_, i) => {
          const x = -L * 0.4 + i * L * 0.8 / 7;
          return <AnimatedLoadArrow key={`udl${i}`} position={[x, D + 0.05, 0]} index={i} />;
        })
      ) : (
        <AnimatedLoadArrow position={[0, D + 0.06, 0]} index={0} />
      )}

      {/* Supports */}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`sup${i}`} position={[x, -0.02, 0]}>
          <cylinderGeometry args={[0.02, 0.03, 0.03, 3]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}

      {/* Limit line */}
      <mesh position={[0, D / 2 - deflectionLimit * s * 20, W / 2 + 0.04]}>
        <boxGeometry args={[L * 0.6, 0.002, 0.002]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <Text position={[L * 0.35, D / 2 - deflectionLimit * s * 20, W / 2 + 0.04]} fontSize={0.03} color="#22c55e">
        {`limit = L/${Math.round(beamLength / deflectionLimit)}`}
      </Text>

      {/* Dimension lines */}
      <DimensionLine start={[-L / 2, -0.06, W / 2 + 0.03]} end={[L / 2, -0.06, W / 2 + 0.03]} color="#38bdf8" />
      <Text position={[0, -0.09, W / 2 + 0.03]} fontSize={0.03} color="#38bdf8">
        {`L = ${(beamLength / 1000).toFixed(1)}m`}
      </Text>

      {/* Labels */}
      <Text position={[0, D + 0.12, 0]} fontSize={0.06} color="#94a3b8">
        {`Deflection Check: ${beamDepth}×${beamWidth}, L=${(beamLength / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[0, D + 0.22, 0]} fontSize={0.05} color={colour}>
        {`δ = ${deflection.toFixed(1)}mm ≤ ${deflectionLimit.toFixed(1)}mm → ${status}`}
      </Text>

      <mesh position={[L / 2 + 0.06, D + 0.05, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
