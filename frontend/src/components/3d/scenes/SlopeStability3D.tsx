import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function FailureArcGlow({ cx, cy, r, extLen, status, utilisation }: {
  cx: number; cy: number; r: number; extLen: number; status: string; utilisation: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#f59e0b';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat?.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 2 + i * 0.3) * 0.3;
      }
    });
  });

  const arcPts = 20;
  return (
    <group ref={ref}>
      {Array.from({ length: arcPts - 1 }).map((_, i) => {
        const a1 = Math.PI * 0.6 + (i / arcPts) * Math.PI * 0.5;
        const a2 = Math.PI * 0.6 + ((i + 1) / arcPts) * Math.PI * 0.5;
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy + r * Math.sin(a2);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        return (
          <mesh key={`a${i}`} position={[mx, my, extLen / 2 + 0.01]} rotation={[0, 0, ang]}>
            <boxGeometry args={[len, 0.006, 0.006]} />
            <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

function WaterTableShimmer({ position, width }: { position: [number, number, number]; width: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
  });
  return (
    <mesh ref={ref} position={position} rotation={[0, 0, 0.2]}>
      <boxGeometry args={[width, 0.005, 0.005]} />
      <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dy = end[1] - start[1];
  const dx = end[0] - start[0];
  const len = Math.sqrt(dx * dx + dy * dy);
  const vertical = Math.abs(dy) > Math.abs(dx);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={vertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx + (vertical ? 0.06 : 0), my + (vertical ? 0 : 0.04), mz]} fontSize={0.05} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface SlopeStability3DProps {
  slopeHeight?: number;
  slopeAngle?: number;
  fos?: number;
  failureRadius?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function SlopeStability3D({
  slopeHeight = 8000,
  slopeAngle = 35,
  fos = 1.3,
  failureRadius = 15000,
  utilisation = 77,
  status = 'PASS',
}: SlopeStability3DProps) {
  const s = 1 / 5000;
  const SH = slopeHeight * s;
  const FR = failureRadius * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const angleRad = (slopeAngle * Math.PI) / 180;
  const slopeRun = SH / Math.tan(angleRad);
  const extLen = 1.0;

  // Slope profile
  const slopeShape = new THREE.Shape();
  slopeShape.moveTo(-0.3, 0);
  slopeShape.lineTo(0, 0);
  slopeShape.lineTo(slopeRun, SH);
  slopeShape.lineTo(slopeRun + 0.4, SH);
  slopeShape.lineTo(slopeRun + 0.4, SH + 0.1);
  slopeShape.lineTo(-0.3, 0.1);
  slopeShape.closePath();

  const arcCx = slopeRun * 0.5;
  const arcCy = SH + FR * 0.3;

  return (
    <group>
      {/* Slope body */}
      <mesh position={[0, 0, -extLen / 2]}>
        <extrudeGeometry args={[slopeShape, { depth: extLen, bevelEnabled: false }]} />
        <meshStandardMaterial color="#78552b" roughness={0.9} />
      </mesh>

      {/* Animated failure circle arc */}
      <FailureArcGlow cx={arcCx} cy={arcCy} r={FR} extLen={extLen} status={status} utilisation={utilisation} />

      {/* Water table line — shimmer */}
      <WaterTableShimmer position={[slopeRun * 0.3, SH * 0.3, extLen / 2 + 0.005]} width={slopeRun * 0.6} />
      <Text position={[slopeRun * 0.1, SH * 0.25, extLen / 2 + 0.02]} fontSize={0.04} color="#3b82f6">
        GWT
      </Text>

      {/* Ground below slope */}
      <mesh position={[slopeRun / 2, -0.03, 0]}>
        <boxGeometry args={[slopeRun + 1, 0.04, extLen + 0.2]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Dimension lines */}
      <DimensionLine start={[slopeRun + 0.25, 0, extLen / 2]} end={[slopeRun + 0.25, SH, extLen / 2]} label={`H=${(slopeHeight / 1000).toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[slopeRun / 2, SH + 0.25, 0]} fontSize={0.08} color="#94a3b8">
        {`Slope stability, ${slopeAngle}°`}
      </Text>
      <Text position={[slopeRun / 2, SH + 0.38, 0]} fontSize={0.06} color={colour}>
        {`FoS = ${fos.toFixed(2)}  |  Util ${utilisation}% — ${status}`}
      </Text>

      <mesh position={[slopeRun + 0.15, SH + 0.1, extLen / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
