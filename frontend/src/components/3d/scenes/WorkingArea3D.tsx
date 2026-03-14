import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface WorkingArea3DProps {
  areaWidth?: number;
  areaLength?: number;
  craneReach?: number;
  exclusionZone?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated crane sweep arm */
function AnimatedCraneArm({ CR }: { CR: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  return (
    <group ref={ref} position={[0, 0.06, 0]}>
      <mesh position={[CR / 2, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.006, CR, 0.006]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
      </mesh>
      {/* Hook at end */}
      <mesh position={[CR - 0.02, -0.01, 0]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** Pulsating crane reach circle */
function PulsingReachCircle({ CR }: { CR: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.3 + Math.sin(clock.getElapsedTime() * 1.5) * 0.15;
  });
  return (
    <mesh ref={ref} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[CR, 0.005, 6, 32]} />
      <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} transparent opacity={0.4} />
    </mesh>
  );
}

/** Flashing exclusion zone borders */
function ExclusionZone({ AL, AW, EZ }: { AL: number; AW: number; EZ: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const o = 0.06 + Math.sin(clock.getElapsedTime() * 2) * 0.04;
    ref.current.children.forEach((c) => {
      (((c as THREE.Mesh).material) as THREE.MeshStandardMaterial).opacity = o;
    });
  });
  return (
    <group ref={ref}>
      {[[-AL / 2 + EZ / 2, 0], [AL / 2 - EZ / 2, 0], [0, -AW / 2 + EZ / 2], [0, AW / 2 - EZ / 2]].map(([x, z], i) => (
        <mesh key={`ez${i}`} position={[x, 0.008, z]}>
          <boxGeometry args={[i < 2 ? EZ : AL * 0.9, 0.003, i < 2 ? AW * 0.9 : EZ]} />
          <meshStandardMaterial color="#ef4444" transparent opacity={0.08} />
        </mesh>
      ))}
    </group>
  );
}

/** Animated worker dots moving around site */
function AnimatedWorkers({ AL, AW }: { AL: number; AW: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.children.forEach((c, i) => {
      const speed = 0.3 + i * 0.1;
      const rx = AL * 0.3;
      const rz = AW * 0.3;
      c.position.x = Math.sin(t * speed + i * 2) * rx;
      c.position.z = Math.cos(t * speed + i * 2) * rz;
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`w${i}`} position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default function WorkingArea3D({
  areaWidth = 30000,
  areaLength = 50000,
  craneReach = 20000,
  exclusionZone = 5000,
  utilisation = 50,
  status = 'PASS',
}: WorkingArea3DProps) {
  const s = 1 / 25000;
  const AW = areaWidth * s;
  const AL = areaLength * s;
  const CR = craneReach * s;
  const EZ = exclusionZone * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';

  return (
    <group>
      {/* Site boundary (ground) */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[AL, 0.02, AW]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.9} />
      </mesh>

      {/* Site boundary outline */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[AL, 0.003, AW]} />
        <meshStandardMaterial color="#ef4444" wireframe />
      </mesh>

      {/* Construction area */}
      <mesh position={[0, 0.008, 0]}>
        <boxGeometry args={[AL * 0.7, 0.005, AW * 0.7]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.15} />
      </mesh>

      {/* Pulsating crane reach circle */}
      <PulsingReachCircle CR={CR} />

      {/* Crane tower base */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.04]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} />
      </mesh>

      {/* Animated crane arm */}
      <AnimatedCraneArm CR={CR} />

      {/* Flashing exclusion zones */}
      <ExclusionZone AL={AL} AW={AW} EZ={EZ} />

      {/* Animated workers */}
      <AnimatedWorkers AL={AL} AW={AW} />

      {/* Heras fence perimeter posts */}
      {Array.from({ length: 20 }).map((_, i) => {
        const isX = i < 10;
        const side = i % 2 === 0 ? -1 : 1;
        const pos = (Math.floor(i / 2) / 4 - 0.5);
        const x = isX ? (pos * AL) : (side * AL / 2);
        const z = isX ? (side * AW / 2) : (pos * AW);
        return (
          <mesh key={`fen${i}`} position={[x, 0.02, z]}>
            <boxGeometry args={[0.01, 0.04, 0.01]} />
            <meshStandardMaterial color="#71717a" />
          </mesh>
        );
      })}

      {/* Access point */}
      <mesh position={[-AL / 2, 0.02, 0]}>
        <boxGeometry args={[0.06, 0.03, 0.15]} />
        <meshStandardMaterial color="#22c55e" transparent opacity={0.5} />
      </mesh>
      <Text position={[-AL / 2, 0.06, 0]} fontSize={0.04} color="#22c55e">
        ACCESS
      </Text>

      {/* Labels */}
      <Text position={[0, 0.2, 0]} fontSize={0.08} color="#00d9ff">
        {`Working Area`}
      </Text>
      <Text position={[0, 0.32, 0]} fontSize={0.06} color="#94a3b8">
        {`Site ${(areaLength / 1000).toFixed(0)}m × ${(areaWidth / 1000).toFixed(0)}m`}
      </Text>
      <Text position={[0, 0.42, 0]} fontSize={0.05} color="#3b82f6">
        {`Crane reach ${(craneReach / 1000).toFixed(0)}m`}
      </Text>
      <Text position={[0, 0.52, 0]} fontSize={0.04} color="#ef4444">
        {`Exclusion ${(exclusionZone / 1000).toFixed(0)}m`}
      </Text>

      {/* Status */}
      <mesh position={[AL / 2, 0.1, AW / 2]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[AL / 2, 0.18, AW / 2]} fontSize={0.04} color={sc}>
        {status}
      </Text>
    </group>
  );
}
