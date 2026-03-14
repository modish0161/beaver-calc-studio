import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function BobbingHook({ position, children }: { position: [number, number, number]; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.5) * 0.015;
  });
  return <group ref={ref} position={position}>{children}</group>;
}

function SwayingLoad({ position, width }: { position: [number, number, number]; width: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.8) * 0.02;
  });
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[width, 0.08, 0.2]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
    </mesh>
  );
}

function SlingTensionGlow({ position, slingLen, status, utilisation }: { position: [number, number, number]; slingLen: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={position}>
      <cylinderGeometry args={[0.01, 0.01, slingLen, 6]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz) || Math.abs(end[1] - start[1]);
  const angle = Math.atan2(dz, dx);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx, my + 0.03, mz]} fontSize={0.05} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface SpreaderBeam3DProps {
  beamLength?: number;
  beamDepth?: number;
  liftLoad?: number;
  numPickPoints?: number;
  slingAngle?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function SpreaderBeam3D({
  beamLength = 6000,
  beamDepth = 500,
  liftLoad = 20,
  numPickPoints = 2,
  slingAngle = 60,
  utilisation = 65,
  status = 'PASS',
}: SpreaderBeam3DProps) {
  const s = 1 / 3000;
  const BL = beamLength * s;
  const BD = beamDepth * s;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const hookH = BL * 0.4;
  const angleRad = (slingAngle * Math.PI) / 180;

  return (
    <group>
      {/* Spreader beam (I-section simplified) */}
      {/* Web */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[BL, BD, 0.01]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Top flange */}
      <mesh position={[0, BD / 2, 0]}>
        <boxGeometry args={[BL, 0.015, 0.06]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Bottom flange */}
      <mesh position={[0, -BD / 2, 0]}>
        <boxGeometry args={[BL, 0.015, 0.06]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Stiffeners at pick points */}
      {Array.from({ length: numPickPoints }).map((_, i) => {
        const x = numPickPoints === 1 ? 0 : (i / (numPickPoints - 1) - 0.5) * BL * 0.8;
        return (
          <mesh key={`st${i}`} position={[x, 0, 0]}>
            <boxGeometry args={[0.015, BD - 0.005, 0.05]} />
            <meshStandardMaterial color="#d97706" metalness={0.5} />
          </mesh>
        );
      })}

      {/* Top slings to crane hook */}
      {[-BL * 0.3, BL * 0.3].map((x, i) => {
        const midX = x / 2;
        const midY = BD / 2 + hookH / 2;
        const legLen = Math.sqrt(x * x + hookH * hookH);
        const angle = Math.atan2(x, hookH);
        return (
          <group key={`ts${i}`}>
            <mesh
              position={[midX, midY, 0]}
              rotation={[0, 0, -angle]}
            >
              <cylinderGeometry args={[0.006, 0.006, legLen, 6]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* Crane hook — bobbing */}
      <BobbingHook position={[0, BD / 2 + hookH + 0.03, 0]}>
        <mesh>
          <torusGeometry args={[0.03, 0.008, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#71717a" metalness={0.7} />
        </mesh>
      </BobbingHook>

      {/* Bottom slings with tension glow */}
      {Array.from({ length: numPickPoints }).map((_, i) => {
        const x = numPickPoints === 1 ? 0 : (i / (numPickPoints - 1) - 0.5) * BL * 0.8;
        const slingLen = BL * 0.2;
        return (
          <group key={`bs${i}`}>
            <SlingTensionGlow position={[x, -BD / 2 - slingLen / 2, 0]} slingLen={slingLen} status={status} utilisation={utilisation} />
            {/* Shackle */}
            <mesh position={[x, -BD / 2 - slingLen, 0]}>
              <torusGeometry args={[0.012, 0.004, 6, 8]} />
              <meshStandardMaterial color="#71717a" metalness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* Lifted load — swaying */}
      <SwayingLoad position={[0, -BD / 2 - BL * 0.25, 0]} width={BL * 0.9} />

      {/* Dimension lines */}
      <DimensionLine start={[-BL / 2, -BD / 2 - BL * 0.35, 0]} end={[BL / 2, -BD / 2 - BL * 0.35, 0]} label={`L=${(beamLength / 1000).toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[0, BD / 2 + hookH + 0.2, 0]} fontSize={0.08} color="#94a3b8">
        {`Spreader beam ${(beamLength / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[BL / 2 + 0.1, 0, 0]} fontSize={0.06} color="#f59e0b">
        {`${beamDepth}mm UB`}
      </Text>
      <Text position={[0, -BD / 2 - BL * 0.3, 0]} fontSize={0.07} color="#ef4444">
        {`${liftLoad}t total`}
      </Text>
      <Text position={[0, BD / 2 + hookH + 0.35, 0]} fontSize={0.06} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>

      <mesh position={[BL / 2 + 0.05, BD / 2 + hookH, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
