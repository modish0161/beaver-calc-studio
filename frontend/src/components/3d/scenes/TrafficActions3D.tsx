import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

/* ── animated sub-components ── */

function PulsingUDLArrow({ position, colour, index }: { position: [number, number, number]; colour: string; index: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2 + index * 0.4) * 0.006;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.06, 6]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.007, 0.015, 6]} />
        <meshStandardMaterial color={colour} />
      </mesh>
    </group>
  );
}

function RollingAxle({ z0, laneW, tandemAxleLoad, SPN }: { z0: number; laneW: number; tandemAxleLoad: number; SPN: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (Math.sin(clock.getElapsedTime() * 0.6) * 0.5 + 0.5);
    ref.current.position.x = -SPN * 0.35 + t * SPN * 0.7;
  });
  return (
    <group ref={ref}>
      {[-0.06, 0.06].map((dx, wi) => (
        <group key={`ta${wi}`}>
          {[-laneW * 0.2, laneW * 0.2].map((dz, wj) => (
            <mesh key={`wh${wi}-${wj}`} position={[dx, 0.03, z0 + dz]}>
              <cylinderGeometry args={[0.015, 0.015, 0.006, 12]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          ))}
          <mesh position={[dx, 0.03, z0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.003, 0.003, laneW * 0.5, 6]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        </group>
      ))}
      <Text position={[0, 0.14, z0]} fontSize={0.035} color="#ef4444">
        {`TS = ${tandemAxleLoad} kN`}
      </Text>
    </group>
  );
}

function DeckGlow({ position, width, depth, status, utilisation }: { position: [number, number, number]; width: number; depth: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.2} side={THREE.DoubleSide} />
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
      <Text position={[mx, my + 0.025, mz]} fontSize={0.03} color={colour}>
        {label}
      </Text>
    </group>
  );
}

export interface TrafficActions3DProps {
  bridgeSpan?: number;
  deckWidth?: number;
  numLanes?: number;
  udlLoad?: number;
  tandemAxleLoad?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

export default function TrafficActions3D({
  bridgeSpan = 15000,
  deckWidth = 8000,
  numLanes = 2,
  udlLoad = 9,
  tandemAxleLoad = 300,
  utilisation = 68,
  status = 'PASS',
}: TrafficActions3DProps) {
  const s = 1 / 10000;
  const SPN = bridgeSpan * s;
  const DW = deckWidth * s;
  const laneW = DW / numLanes;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  const laneColors = ['#3b82f6', '#f59e0b', '#22c55e', '#a855f7'];

  return (
    <group>
      {/* Deck slab */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[SPN, 0.025, DW]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.6} />
      </mesh>

      {/* Deck glow (status) */}
      <DeckGlow position={[0, 0.014, 0]} width={SPN} depth={DW} status={status} utilisation={utilisation} />

      {/* Abutments */}
      {[-SPN / 2, SPN / 2].map((x, i) => (
        <mesh key={`ab${i}`} position={[x, -0.06, 0]}>
          <boxGeometry args={[0.04, 0.1, DW + 0.04]} />
          <meshStandardMaterial color="#6b7280" roughness={0.7} />
        </mesh>
      ))}

      {/* Lane markings + loads */}
      {Array.from({ length: numLanes }).map((_, li) => {
        const z0 = -DW / 2 + li * laneW + laneW / 2;
        const color = laneColors[li % laneColors.length];

        return (
          <group key={`lane${li}`}>
            {/* Lane strip */}
            <mesh position={[0, 0.014, z0]}>
              <boxGeometry args={[SPN * 0.95, 0.001, laneW * 0.9]} />
              <meshStandardMaterial color={color} transparent opacity={0.2} />
            </mesh>

            {/* Animated UDL arrows along lane */}
            {Array.from({ length: 8 }).map((_, ai) => {
              const x = -SPN * 0.4 + ai * (SPN * 0.8 / 7);
              return (
                <PulsingUDLArrow key={`udl${li}-${ai}`} position={[x, 0.025, z0]} colour={color} index={ai + li * 8} />
              );
            })}

            {/* UDL label */}
            <Text position={[0, 0.1, z0]} fontSize={0.035} color={color}>
              {`UDL = ${udlLoad} kN/m² (Lane ${li + 1})`}
            </Text>

            {/* Rolling tandem axle — only on first lane */}
            {li === 0 && (
              <RollingAxle z0={z0} laneW={laneW} tandemAxleLoad={tandemAxleLoad} SPN={SPN} />
            )}
          </group>
        );
      })}

      {/* Lane dividers */}
      {Array.from({ length: numLanes - 1 }).map((_, i) => {
        const z = -DW / 2 + (i + 1) * laneW;
        return (
          <mesh key={`div${i}`} position={[0, 0.014, z]}>
            <boxGeometry args={[SPN * 0.9, 0.002, 0.003]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        );
      })}

      {/* Dimension lines */}
      <DimensionLine start={[-SPN / 2, -0.12, DW / 2 + 0.04]} end={[SPN / 2, -0.12, DW / 2 + 0.04]} label={`Span ${(bridgeSpan / 1000).toFixed(0)}m`} offset={0} />
      <DimensionLine start={[SPN / 2 + 0.04, -0.12, -DW / 2]} end={[SPN / 2 + 0.04, -0.12, DW / 2]} label={`Width ${(deckWidth / 1000).toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[0, 0.22, 0]} fontSize={0.06} color="#94a3b8">
        {`Span ${(bridgeSpan / 1000).toFixed(0)}m × ${(deckWidth / 1000).toFixed(1)}m (${numLanes} lanes)`}
      </Text>
      <Text position={[0, 0.3, 0]} fontSize={0.04} color={colour}>
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>

      <mesh position={[SPN / 2 + 0.08, 0.15, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}
