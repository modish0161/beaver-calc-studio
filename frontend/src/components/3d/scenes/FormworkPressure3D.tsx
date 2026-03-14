import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function AnimatedPourLevel({ WT, formLen, WH }: { WT: number; formLen: number; WH: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * 0.08) % 1; // slow cyclic pour
    const h = WH * (0.2 + t * 0.6);
    ref.current.scale.y = h;
    ref.current.position.y = h / 2;
  });
  return (
    <mesh ref={ref} scale={[1, WH * 0.8, 1]}>
      <boxGeometry args={[WT, 1, formLen * 0.98]} />
      <meshStandardMaterial color="#94a3b8" transparent opacity={0.4} />
    </mesh>
  );
}

function PulsingPressureArrows({ WH, WT, formLen, pressurePts }: { WH: number; WT: number; formLen: number; pressurePts: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      child.traverse(obj => {
        const m = obj as THREE.Mesh;
        if (m.material && (m.material as THREE.MeshStandardMaterial).emissive) {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.4 + Math.sin(clock.getElapsedTime() * 2.5 + i * 0.4) * 0.4;
        }
      });
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: pressurePts }).map((_, i) => {
        const y = ((i + 0.5) / pressurePts) * WH * 0.8;
        const pFrac = Math.min(y / WH, 1);
        const arrowLen = 0.1 + pFrac * 0.3;
        return (
          <group key={`pa${i}`}>
            <mesh position={[-WT / 2 - 0.08 - arrowLen / 2, y, formLen / 2 + 0.08]}>
              <boxGeometry args={[arrowLen, 0.008, 0.008]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
            </mesh>
            <mesh position={[-WT / 2 - 0.08, y, formLen / 2 + 0.08]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.015, 0.03, 6]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function TieRodGlow({ WT, WH, formLen, colour }: { WT: number; WH: number; formLen: number; colour: string }) {
  const refs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((r, i) => {
      if (!r) return;
      (r.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.3 + Math.sin(clock.getElapsedTime() * 1.8 + i * 0.6) * 0.3;
    });
  });
  const rods: JSX.Element[] = [];
  let idx = 0;
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * formLen * 0.35;
    for (let j = 0; j < Math.ceil(WH / 0.5); j++) {
      const y = 0.25 + j * 0.5;
      if (y > WH) continue;
      const ci = idx++;
      rods.push(
        <mesh key={`t${i}-${j}`} ref={(el: THREE.Mesh) => { if (el) refs.current[ci] = el; }} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, WT + 0.12, 6]} />
          <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} metalness={0.8} />
        </mesh>
      );
    }
  }
  return <group>{rods}</group>;
}

function DimensionLine({ start, end, label, offset = 0.08 }: { start: [number, number, number]; end: [number, number, number]; label: string; offset?: number }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2;
  const mz = (start[2] + end[2]) / 2;
  const len = Math.sqrt((end[0]-start[0])**2 + (end[1]-start[1])**2 + (end[2]-start[2])**2);
  const angle = Math.atan2(end[1]-start[1], end[0]-start[0]);
  return (
    <group>
      <mesh position={[mx + offset, my, mz]} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, 0.003, 0.003]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <Text position={[mx + offset + 0.08, my, mz]} fontSize={0.05} color="#94a3b8">{label}</Text>
    </group>
  );
}

/* ── main component ── */

export interface FormworkPressure3DProps {
  wallHeight?: number;
  wallThick?: number;
  pourRate?: number;
  maxPressure?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function FormworkPressure3D({
  wallHeight = 4000,
  wallThick = 300,
  pourRate = 3,
  maxPressure = 80,
  utilisation = 0,
  status = 'PASS',
}: FormworkPressure3DProps) {
  const s = 1 / 2000;
  const WH = wallHeight * s;
  const WT = wallThick * s;
  const formLen = 3 * s * 1000;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const pressurePts = 8;

  return (
    <group>
      {/* Left formwork panel */}
      <mesh position={[-WT / 2 - 0.015, WH / 2, 0]}>
        <boxGeometry args={[0.03, WH, formLen]} />
        <meshStandardMaterial color="#d4a574" roughness={0.8} />
      </mesh>

      {/* Right formwork panel */}
      <mesh position={[WT / 2 + 0.015, WH / 2, 0]}>
        <boxGeometry args={[0.03, WH, formLen]} />
        <meshStandardMaterial color="#d4a574" roughness={0.8} />
      </mesh>

      {/* Animated pour level */}
      <AnimatedPourLevel WT={WT} formLen={formLen} WH={WH} />

      {/* Waling beams (horizontal) */}
      {Array.from({ length: Math.ceil(WH / 0.4) }).map((_, i) => {
        const y = 0.2 + i * 0.4;
        if (y > WH) return null;
        return (
          <group key={`w${i}`}>
            <mesh position={[-WT / 2 - 0.06, y, 0]}>
              <boxGeometry args={[0.05, 0.08, formLen]} />
              <meshStandardMaterial color="#78716c" metalness={0.5} />
            </mesh>
            <mesh position={[WT / 2 + 0.06, y, 0]}>
              <boxGeometry args={[0.05, 0.08, formLen]} />
              <meshStandardMaterial color="#78716c" metalness={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* Tie rods with stress glow */}
      <TieRodGlow WT={WT} WH={WH} formLen={formLen} colour={colour} />

      {/* Pulsing pressure arrows */}
      <PulsingPressureArrows WH={WH} WT={WT} formLen={formLen} pressurePts={pressurePts} />

      {/* Dimension lines */}
      <DimensionLine
        start={[WT / 2 + 0.15, 0, formLen / 2]}
        end={[WT / 2 + 0.15, WH, formLen / 2]}
        label={`H ${(wallHeight / 1000).toFixed(1)}m`}
        offset={0.05}
      />
      <DimensionLine
        start={[-WT / 2, -0.06, formLen / 2]}
        end={[WT / 2, -0.06, formLen / 2]}
        label={`${wallThick}mm`}
        offset={0}
      />

      {/* Ground */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[2, 0.04, formLen + 0.5]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>

      {/* Labels */}
      <Text position={[0, WH + 0.15, 0]} fontSize={0.08} color="#94a3b8">
        {`Wall ${wallThick}mm × ${(wallHeight / 1000).toFixed(1)}m`}
      </Text>
      <Text position={[-WT / 2 - 0.5, WH * 0.3, formLen / 2 + 0.08]} fontSize={0.06} color="#ef4444">
        {`P_max = ${maxPressure} kN/m²`}
      </Text>
      <Text position={[0, WH + 0.3, 0]} fontSize={0.06} color="#f59e0b">
        {`Pour rate ${pourRate} m/hr`}
      </Text>

      {/* Status indicator */}
      <mesh position={[WT / 2 + 0.15, WH + 0.05, formLen / 2]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[WT / 2 + 0.15, WH + 0.12, formLen / 2]} fontSize={0.045} color={colour}>
        {status === 'PASS' ? `✓ ${utilisation.toFixed(0)}%` : '✗ FAIL'}
      </Text>
    </group>
  );
}
