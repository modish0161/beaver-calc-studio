import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface GabionWall3DProps {
  wallHeight?: number;
  basketWidth?: number;
  basketHeight?: number;
  numCourses?: number;
  batter?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Gabion basket with wire edges and random stone fill texture */
function GabionBasket({ w, h, d, yOff, courseIdx }: { w: number; h: number; d: number; yOff: number; courseIdx: number }) {
  // Generate some random "stones" inside the basket
  const stones = useMemo(() => {
    const arr: { pos: [number, number, number]; size: number; color: string }[] = [];
    const colors = ['#8B8682', '#9E9A96', '#A0998F', '#7A7571', '#B0A99F'];
    for (let i = 0; i < 20; i++) {
      arr.push({
        pos: [
          (Math.random() - 0.5) * w * 0.8,
          (Math.random() - 0.5) * h * 0.7,
          (Math.random() - 0.5) * d * 0.8,
        ],
        size: 0.02 + Math.random() * 0.04,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIdx]);

  return (
    <group position={[0, yOff, 0]}>
      {/* Basket wireframe */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h * 0.95, d)]} />
        <lineBasicMaterial color="#666" linewidth={1} />
      </lineSegments>
      {/* Semi-transparent fill */}
      <mesh castShadow>
        <boxGeometry args={[w, h * 0.95, d]} />
        <meshStandardMaterial color="#8B8682" roughness={0.9} transparent opacity={0.35} />
      </mesh>
      {/* Stone fill */}
      {stones.map((st, i) => (
        <mesh key={i} position={st.pos}>
          <dodecahedronGeometry args={[st.size, 0]} />
          <meshStandardMaterial color={st.color} roughness={0.95} />
        </mesh>
      ))}
      {/* Wire mesh divider */}
      <mesh>
        <boxGeometry args={[w * 0.005, h * 0.95, d]} />
        <meshStandardMaterial color="#888" metalness={0.5} />
      </mesh>
    </group>
  );
}

/** Animated glow line along wall base indicating stability */
function GlowBase({ status, w, d, utilisation }: {
  status: 'PASS' | 'FAIL'; w: number; d: number; utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.5 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.15 + Math.sin(clock.getElapsedTime() * 2) * 0.08;
  });
  return (
    <mesh ref={ref} position={[0, 0.005, 0]}>
      <boxGeometry args={[w + 0.06, 0.01, d + 0.06]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.15} />
    </mesh>
  );
}

/** Animated earth pressure arrows against the retained side */
function EarthPressureArrows({ numCourses, bh, bw, d }: {
  numCourses: number; bh: number; bw: number; d: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
    ref.current.scale.set(s, 1, 1);
  });
  return (
    <group ref={ref}>
      {Array.from({ length: numCourses }).map((_, i) => {
        const y = (i + 0.5) * bh;
        const arrowLen = 0.08 + (i / numCourses) * 0.12; // triangular pressure
        return (
          <group key={i} position={[bw / 2 + 0.6 + arrowLen / 2, y, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, arrowLen, 6]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.6} />
            </mesh>
            <mesh position={[-arrowLen / 2 - 0.01, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.02, 0.04, 6]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Dimension line with end ticks */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2 + 0.02, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2,
  ];
  const dy = end[1] - start[1]; const dx = end[0] - start[0]; const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2]}>
        <boxGeometry args={[dx !== 0 ? len : 0.003, dy !== 0 ? len : 0.003, dz !== 0 ? len : 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[start, end].map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.02, 0.003, 0.003]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Text position={mid} fontSize={0.07} color={color}>{label}</Text>
    </group>
  );
}

export default function GabionWall3D({
  wallHeight = 3000,
  basketWidth = 1000,
  basketHeight = 1000,
  numCourses = 3,
  batter = 0,
  utilisation = 50,
  status = 'PASS',
}: GabionWall3DProps) {
  const s = 1 / 1200;
  const bw = basketWidth * s;
  const bh = basketHeight * s;
  const depth = 2.5;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';

  return (
    <group>
      {/* Animated glow base */}
      <GlowBase status={status} w={bw} d={depth} utilisation={utilisation} />

      {/* Ground */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[bw + 2.5, 0.1, depth + 1]} />
        <meshStandardMaterial color="#5c4033" roughness={1} />
      </mesh>

      {/* Foundation pad */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[bw + 0.15, 0.04, depth + 0.1]} />
        <meshStandardMaterial color="#737373" roughness={0.8} />
      </mesh>

      {/* Gabion baskets */}
      {Array.from({ length: numCourses }).map((_, i) => (
        <GabionBasket key={i} w={bw - i * batter * s} h={bh} d={depth}
                      yOff={i * bh + bh / 2 + 0.04} courseIdx={i} />
      ))}

      {/* Retained soil */}
      <mesh position={[bw / 2 + 0.5, (numCourses * bh) / 2, 0]}>
        <boxGeometry args={[1, numCourses * bh, depth]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={0.25} />
      </mesh>

      {/* Soil hatch lines */}
      {Array.from({ length: Math.min(numCourses * 3, 12) }).map((_, i) => (
        <mesh key={`h${i}`}
              position={[bw / 2 + 0.5, i * numCourses * bh / 12 + bh * 0.2, 0]}
              rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.15, 0.002, depth * 0.9]} />
          <meshStandardMaterial color="#6b5c3d" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Earth pressure arrows (animated) */}
      <EarthPressureArrows numCourses={numCourses} bh={bh} bw={bw} d={depth} />

      {/* Dimension: wall height */}
      <DimensionLine
        start={[-bw / 2 - 0.25, 0.04, 0]}
        end={[-bw / 2 - 0.25, numCourses * bh + 0.04, 0]}
        label={`H = ${(wallHeight / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />

      {/* Dimension: basket width */}
      <DimensionLine
        start={[-bw / 2, numCourses * bh + 0.15, depth / 2 + 0.15]}
        end={[bw / 2, numCourses * bh + 0.15, depth / 2 + 0.15]}
        label={`${(basketWidth / 1000).toFixed(1)}m`}
        color="#94a3b8"
      />

      {/* Labels */}
      <Text position={[0, numCourses * bh + 0.35, 0]} fontSize={0.1} color="#00d9ff">
        {`Gabion Wall`}
      </Text>
      <Text position={[0, -0.2, 0]} fontSize={0.08} color="#94a3b8">
        {`${numCourses} courses × ${(basketHeight / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[bw / 2 + 0.95, numCourses * bh / 2, 0]} fontSize={0.07} color="#f59e0b">
        {`Earth pressure`}
      </Text>

      {/* Status */}
      <mesh position={[-bw / 2 - 0.2, numCourses * bh + 0.15, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[-bw / 2 - 0.2, numCourses * bh + 0.26, 0]} fontSize={0.06} color={sc}>
        {status}
      </Text>
    </group>
  );
}
