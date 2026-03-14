import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface Batters3DProps {
  cutHeight?: number;
  batter?: number;
  benchWidth?: number;
  numBenches?: number;
  soilType?: string;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/** Animated glow line along the slope face */
function GlowSlope({ status, slopeRun, cH, depth, utilisation }: {
  status: 'PASS' | 'FAIL'; slopeRun: number; cH: number; depth: number; utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.3;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.12 + Math.sin(clock.getElapsedTime() * 2) * 0.08;
  });
  const len = Math.sqrt(slopeRun * slopeRun + cH * cH);
  return (
    <mesh ref={ref}
          position={[slopeRun / 2, cH / 2, depth / 2 + 0.005]}
          rotation={[0, 0, Math.atan2(cH, slopeRun)]}>
      <boxGeometry args={[len, 0.015, 0.015]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.15} />
    </mesh>
  );
}

/** Animated failure plane with pulsating opacity */
function FailurePlane({ slopeRun, cH, depth }: { slopeRun: number; cH: number; depth: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.15 + Math.sin(clock.getElapsedTime() * 1.5) * 0.1;
  });
  const len = Math.sqrt(slopeRun * slopeRun + cH * cH) * 0.9;
  return (
    <mesh ref={ref}
          position={[slopeRun / 2 - 0.05, cH / 2 + 0.05, depth / 2 + 0.01]}
          rotation={[0, 0, Math.atan2(cH + 0.1, slopeRun - 0.1)]}>
      <boxGeometry args={[len, 0.004, 0.004]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} transparent opacity={0.2} />
    </mesh>
  );
}

/** Animated water drainage arrows down slope */
function DrainageArrows({ slopeRun, cH, depth }: { slopeRun: number; cH: number; depth: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const children = ref.current.children;
    for (let i = 0; i < children.length; i++) {
      const t = (clock.getElapsedTime() * 0.5 + i * 0.3) % 2;
      const frac = Math.min(t, 1);
      children[i].position.x = slopeRun * (1 - frac);
      children[i].position.y = cH * (1 - frac) + 0.02;
      (children[i] as THREE.Mesh).visible = t < 1;
    }
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[0, 0, depth / 2 + 0.02]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.4} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Dimension line */
function DimensionLine({ start, end, label, color = '#94a3b8' }: {
  start: [number, number, number]; end: [number, number, number]; label: string; color?: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2 + 0.04, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0]; const dy = end[1] - start[1]; const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return (
    <group>
      <mesh position={[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2]}>
        <boxGeometry args={[dx !== 0 ? len : 0.003, dy !== 0 ? len : 0.003, dz !== 0 ? len : 0.003]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[start, end].map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.003, 0.003, dx !== 0 ? 0.03 : dy !== 0 ? 0.003 : 0.03]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Text position={mid} fontSize={0.06} color={color}>{label}</Text>
    </group>
  );
}

export default function Batters3D({
  cutHeight = 6000,
  batter = 1,
  benchWidth = 2000,
  numBenches = 1,
  soilType = 'Stiff clay',
  utilisation = 50,
  status = 'PASS',
}: Batters3DProps) {
  const s = 1 / 4000;
  const CH = cutHeight * s;
  const BW = benchWidth * s;
  const sc = status === 'PASS' ? '#22c55e' : '#ef4444';
  const slopeRun = CH * batter;
  const extLen = 1.2;

  // Create slope profile shape
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  if (numBenches > 0) {
    const segH = CH / (numBenches + 1);
    const segR = segH * batter;
    for (let i = 0; i <= numBenches; i++) {
      shape.lineTo((i + 1) * segR + i * BW, (i + 1) * segH);
      if (i < numBenches) {
        shape.lineTo((i + 1) * segR + (i + 1) * BW, (i + 1) * segH);
      }
    }
  } else {
    shape.lineTo(slopeRun, CH);
  }
  shape.lineTo(slopeRun + 0.3, CH);
  shape.lineTo(slopeRun + 0.3, 0);
  shape.closePath();

  return (
    <group>
      {/* Animated glow slope line */}
      <GlowSlope status={status} slopeRun={slopeRun} cH={CH} depth={extLen} utilisation={utilisation} />

      {/* Animated failure plane */}
      <FailurePlane slopeRun={slopeRun} cH={CH} depth={extLen} />

      {/* Animated drainage */}
      <DrainageArrows slopeRun={slopeRun} cH={CH} depth={extLen} />

      {/* Ground at base */}
      <mesh position={[-0.3, -0.02, 0]}>
        <boxGeometry args={[0.8, 0.04, extLen]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Battered slope (extruded shape) */}
      <mesh position={[0, 0, -extLen / 2]} rotation={[0, 0, 0]}>
        <extrudeGeometry args={[shape, { depth: extLen, bevelEnabled: false }]} />
        <meshStandardMaterial color="#78552b" roughness={0.9} />
      </mesh>

      {/* Soil layer lines (strata) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const y = CH * (i + 1) * 0.2;
        return (
          <mesh key={`sl${i}`} position={[slopeRun * 0.6, y, extLen / 2 + 0.003]}>
            <boxGeometry args={[slopeRun * 0.5, 0.002, 0.002]} />
            <meshStandardMaterial color="#6b5c3d" transparent opacity={0.4} />
          </mesh>
        );
      })}

      {/* Slope face highlight */}
      {numBenches === 0 ? (
        <mesh
          position={[slopeRun / 2, CH / 2, extLen / 2 + 0.005]}
          rotation={[0, 0, Math.atan2(CH, slopeRun)]}>
          <boxGeometry args={[Math.sqrt(slopeRun * slopeRun + CH * CH), 0.003, 0.003]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      ) : null}

      {/* Angle indicator arc */}
      <mesh position={[0.15, 0.03, extLen / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.003, 4, 16, Math.atan2(CH, slopeRun)]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <Text position={[slopeRun * 0.2, CH * 0.2, extLen / 2 + 0.08]} fontSize={0.06} color="#3b82f6">
        {`1:${batter}`}
      </Text>

      {/* Dimension: height (vertical) */}
      <DimensionLine
        start={[-0.15, 0, extLen / 2 + 0.05]}
        end={[-0.15, CH, extLen / 2 + 0.05]}
        label={`H = ${(cutHeight / 1000).toFixed(1)}m`}
        color="#00d9ff"
      />

      {/* Dimension: horizontal run */}
      <DimensionLine
        start={[0, -0.08, extLen / 2 + 0.05]}
        end={[slopeRun, -0.08, extLen / 2 + 0.05]}
        label={`${(slopeRun / s / 1000).toFixed(1)}m`}
        color="#94a3b8"
      />

      {/* Labels */}
      <Text position={[slopeRun / 2, CH + 0.15, 0]} fontSize={0.08} color="#00d9ff">
        {`Batter Design`}
      </Text>
      <Text position={[slopeRun / 2, CH + 0.28, 0]} fontSize={0.06} color="#f59e0b">
        {`${soilType}, 1:${batter}`}
      </Text>
      {numBenches > 0 && (
        <Text position={[slopeRun / 2, CH + 0.4, 0]} fontSize={0.05} color="#94a3b8">
          {`${numBenches} bench(es), ${(benchWidth / 1000).toFixed(1)}m wide`}
        </Text>
      )}

      {/* Status */}
      <mesh position={[slopeRun + 0.15, CH, extLen / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={sc} emissive={sc} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[slopeRun + 0.15, CH + 0.08, extLen / 2]} fontSize={0.045} color={sc}>
        {status}
      </Text>
    </group>
  );
}
