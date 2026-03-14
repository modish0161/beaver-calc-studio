// =============================================================================
// 3D Scene: RC Beam — cross-section with reinforcement bars and stirrups
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

interface RCBeam3DProps {
  width?: number;
  depth?: number;
  span?: number;
  cover?: number;
  mainBarDia?: number;
  nBars?: number;
  linkDia?: number;
  linkSpacing?: number;
  udl?: number;
  pointLoad?: number;
  pointLoadPos?: number;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

/* ── preserved sub-components ── */

function ConcreteBody({ length, w, h }: { length: number; w: number; h: number }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[length, h, w]} />
      <meshStandardMaterial color="#6b7280" roughness={0.9} metalness={0.05} transparent opacity={0.4} />
    </mesh>
  );
}

function ConcreteWireframe({ length, w, h }: { length: number; w: number; h: number }) {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(length, h, w)]} />
      <lineBasicMaterial color="#00d9ff" linewidth={1} transparent opacity={0.5} />
    </lineSegments>
  );
}

function Rebar({ start, end, diameter, color = '#f59e0b' }: { start: [number, number, number]; end: [number, number, number]; diameter: number; color?: string }) {
  const dir = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
  const len = dir.length();
  dir.normalize();
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <mesh position={mid} quaternion={quat} castShadow>
      <cylinderGeometry args={[diameter / 2, diameter / 2, len, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.8} roughness={0.3} />
    </mesh>
  );
}

function Stirrup({ position, w, h, dia }: { position: [number, number, number]; w: number; h: number; dia: number }) {
  const r = dia / 2;
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <Rebar start={[-w / 2, -h / 2, 0]} end={[w / 2, -h / 2, 0]} diameter={r} color="#8b5cf6" />
      <Rebar start={[-w / 2, h / 2, 0]} end={[w / 2, h / 2, 0]} diameter={r} color="#8b5cf6" />
      <Rebar start={[-w / 2, -h / 2, 0]} end={[-w / 2, h / 2, 0]} diameter={r} color="#8b5cf6" />
      <Rebar start={[w / 2, -h / 2, 0]} end={[w / 2, h / 2, 0]} diameter={r} color="#8b5cf6" />
    </group>
  );
}

function Support({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <coneGeometry args={[0.18, 0.3, 3]} />
      <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.4} />
    </mesh>
  );
}

/* ── animated sub-components ── */

function AnimatedLoadArrow({ position, color = '#fbbf24', index = 0 }: { position: [number, number, number]; color?: string; index?: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2 + index * 0.4) * 0.015;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.5, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function BeamGlow({ length, w, h, beamY, status, utilisation }: { length: number; w: number; h: number; beamY: number; status: string; utilisation: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, beamY, w / 2 + 0.01]}>
      <planeGeometry args={[length, h]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.3} transparent opacity={0.12} side={THREE.DoubleSide} />
    </mesh>
  );
}

function DimensionLine({ start, end, offset = 0.06, label, colour = '#64748b' }: { start: [number, number, number]; end: [number, number, number]; offset?: number; label: string; colour?: string }) {
  const mx = (start[0] + end[0]) / 2;
  const my = (start[1] + end[1]) / 2 + offset;
  const mz = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0]; const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const vertical = Math.abs(dy) > Math.abs(dx);
  return (
    <group>
      <mesh position={[mx, my, mz]} rotation={vertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
        <boxGeometry args={[len, 0.002, 0.002]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <Text position={[mx + (vertical ? 0.15 : 0), my + (vertical ? 0 : 0.06), mz]} fontSize={0.12} color={colour}>
        {label}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function RCBeam3D({
  width = 300,
  depth = 500,
  span = 6,
  cover = 35,
  mainBarDia = 25,
  nBars = 3,
  linkDia = 10,
  linkSpacing = 200,
  udl = 30,
  pointLoad = 0,
  pointLoadPos = 0.5,
  utilisation = 72,
  status = 'PASS',
}: RCBeam3DProps) {
  const scale = 3 / (span || 6);
  const beamLen = (span || 6) * scale;
  const h = ((depth || 500) / 1000) * scale * 3;
  const w = ((width || 300) / 1000) * scale * 3;
  const c = ((cover || 35) / 1000) * scale * 3;
  const barR = ((mainBarDia || 25) / 1000) * scale * 3;
  const linkR = ((linkDia || 10) / 1000) * scale * 3;

  const half = beamLen / 2;
  const beamY = h / 2 + 0.3;
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';

  const barPositions = useMemo(() => {
    const bars: [number, number][] = [];
    const availW = w - 2 * c - barR;
    if (nBars <= 1) {
      bars.push([0, 0]);
    } else {
      const spacing = availW / (nBars - 1);
      for (let i = 0; i < nBars; i++) {
        bars.push([-availW / 2 + i * spacing, 0]);
      }
    }
    return bars;
  }, [w, c, barR, nBars]);

  const stirrupPositions = useMemo(() => {
    const ls = ((linkSpacing || 200) / 1000) * scale * 3;
    const positions: number[] = [];
    const count = Math.max(2, Math.floor(beamLen / ls));
    const step = beamLen / count;
    for (let i = 0; i <= count; i++) {
      positions.push(-half + i * step);
    }
    return positions;
  }, [beamLen, linkSpacing, scale, half]);

  return (
    <group>
      {/* Concrete body */}
      <group position={[0, beamY, 0]}>
        <ConcreteBody length={beamLen} w={w} h={h} />
        <ConcreteWireframe length={beamLen} w={w} h={h} />
      </group>

      {/* Beam glow */}
      <BeamGlow length={beamLen} w={w} h={h} beamY={beamY} status={status} utilisation={utilisation} />

      {/* Main reinforcement bars (bottom) */}
      {barPositions.map(([z], idx) => (
        <Rebar key={`bar-${idx}`} start={[-half + c, beamY - h / 2 + c, z]} end={[half - c, beamY - h / 2 + c, z]} diameter={barR} />
      ))}

      {/* Stirrups */}
      {stirrupPositions.map((x, idx) => (
        <Stirrup key={`link-${idx}`} position={[x, beamY, 0]} w={w - 2 * c} h={h - 2 * c} dia={linkR} />
      ))}

      {/* Supports */}
      <Support position={[-half + 0.1, 0.12, 0]} />
      <Support position={[half - 0.1, 0.12, 0]} />

      {/* Animated UDL arrows */}
      {udl > 0 && (
        <group>
          {Array.from({ length: 8 }, (_, i) => (
            <AnimatedLoadArrow key={i} position={[-half + 0.2 + (i * (beamLen - 0.4)) / 7, beamY + h / 2, 0]} index={i} />
          ))}
          <mesh position={[0, beamY + h / 2 + 0.6, 0]}>
            <boxGeometry args={[beamLen - 0.3, 0.015, 0.015]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
          </mesh>
          <Text position={[0, beamY + h / 2 + 0.85, 0]} fontSize={0.15} color="#fbbf24" anchorX="center">
            {`w = ${udl.toFixed(1)} kN/m`}
          </Text>
        </group>
      )}

      {/* Animated point load */}
      {pointLoad > 0 && (
        <group>
          <AnimatedLoadArrow position={[-half + beamLen * pointLoadPos, beamY + h / 2, 0]} color="#ef4444" index={0} />
          <Text position={[-half + beamLen * pointLoadPos, beamY + h / 2 + 0.9, 0]} fontSize={0.14} color="#ef4444" anchorX="center">
            {`P = ${pointLoad.toFixed(0)} kN`}
          </Text>
        </group>
      )}

      {/* Dimension lines */}
      <DimensionLine start={[-half, 0, w / 2 + 0.15]} end={[half, 0, w / 2 + 0.15]} label={`L=${span.toFixed(1)}m`} offset={0} />

      {/* Labels */}
      <Text position={[0, beamY + h / 2 + 1.1, 0]} fontSize={0.14} color={colour} anchorX="center">
        {`Utilisation ${utilisation}% — ${status}`}
      </Text>
      <Text position={[half + 0.3, beamY, 0]} fontSize={0.13} color="#00d9ff" anchorX="left">
        {`${width}×${depth}`}
      </Text>
    </group>
  );
}
