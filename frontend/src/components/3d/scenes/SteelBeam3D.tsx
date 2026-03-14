// =============================================================================
// 3D Scene: Steel I-Beam with supports, loads, and deflected shape
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

interface SteelBeam3DProps {
  span?: number;          // metres
  depth?: number;         // section depth mm
  width?: number;         // flange width mm
  flangeThk?: number;     // flange thickness mm
  webThk?: number;        // web thickness mm
  udl?: number;           // kN/m total
  pointLoad?: number;     // kN total
  pointLoadPos?: number;  // 0-1 fraction from left
  utilisation?: number;   // 0-100
  status?: 'PASS' | 'FAIL';
}

// I-Section extruded shape
function ISection({
  length,
  h,
  b,
  tf,
  tw,
  color,
  emissive,
}: {
  length: number;
  h: number;
  b: number;
  tf: number;
  tw: number;
  color: string;
  emissive: string;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    // I-section profile (centred on origin)
    const hw = h / 2;
    const bw = b / 2;
    const twh = tw / 2;

    s.moveTo(-bw, -hw);
    s.lineTo(bw, -hw);
    s.lineTo(bw, -hw + tf);
    s.lineTo(twh, -hw + tf);
    s.lineTo(twh, hw - tf);
    s.lineTo(bw, hw - tf);
    s.lineTo(bw, hw);
    s.lineTo(-bw, hw);
    s.lineTo(-bw, hw - tf);
    s.lineTo(-twh, hw - tf);
    s.lineTo(-twh, -hw + tf);
    s.lineTo(-bw, -hw + tf);
    s.closePath();
    return s;
  }, [h, b, tf, tw]);

  const extrudeSettings = useMemo(
    () => ({
      depth: length,
      bevelEnabled: false,
    }),
    [length],
  );

  return (
    <mesh rotation={[0, -Math.PI / 2, Math.PI / 2]} position={[-length / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.15}
        metalness={0.7}
        roughness={0.3}
      />
    </mesh>
  );
}

// Triangle support
function PinnedSupport({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, 0]}>
        <coneGeometry args={[0.2, 0.35, 3]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// Roller support
function RollerSupport({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.04, 0.35, 0.2]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// Load arrow
function LoadArrow({
  position,
  magnitude,
  color = '#fbbf24',
}: {
  position: [number, number, number];
  magnitude: number;
  color?: string;
}) {
  const arrowLen = Math.min(0.8, Math.max(0.3, magnitude / 50));
  return (
    <group position={position}>
      {/* Shaft */}
      <mesh position={[0, arrowLen / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, arrowLen, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.12, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// UDL display
function UDLArrows({
  start,
  end,
  y,
  magnitude,
  count = 8,
}: {
  start: number;
  end: number;
  y: number;
  magnitude: number;
  count?: number;
}) {
  if (magnitude <= 0) return null;
  const arrows = [];
  const step = (end - start) / (count - 1);
  for (let i = 0; i < count; i++) {
    arrows.push(
      <LoadArrow
        key={i}
        position={[start + i * step, y, 0]}
        magnitude={magnitude}
        color="#fbbf24"
      />,
    );
  }

  return (
    <group>
      {arrows}
      {/* UDL connection line */}
      <mesh position={[(start + end) / 2, y + Math.min(0.8, Math.max(0.3, magnitude / 50)) + 0.1, 0]}>
        <boxGeometry args={[end - start, 0.02, 0.02]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Animated glow ring around beam
function GlowRing({ status }: { status?: 'PASS' | 'FAIL' }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.5;
      ref.current.rotation.z += delta * 0.3;
    }
  });

  const color = status === 'FAIL' ? '#ef4444' : '#22c55e';

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <torusGeometry args={[1.8, 0.01, 8, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.3} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SteelBeam3D({
  span = 6,
  depth = 400,
  width = 200,
  flangeThk = 16,
  webThk = 10,
  udl = 20,
  pointLoad = 0,
  pointLoadPos = 0.5,
  utilisation = 50,
  status = 'PASS',
}: SteelBeam3DProps) {
  // Scale section to 3D units (mm → metres for visual, then scale up a bit)
  const scale = 3 / (span || 6);
  const beamLen = (span || 6) * scale;
  const h = ((depth || 400) / 1000) * scale * 3;
  const b = ((width || 200) / 1000) * scale * 3;
  const tf = ((flangeThk || 16) / 1000) * scale * 3;
  const tw = ((webThk || 10) / 1000) * scale * 3;

  const beamY = 0.5;
  const half = beamLen / 2;

  return (
    <group>
      {/* I-Section beam */}
      <group position={[0, beamY, 0]}>
        <ISection length={beamLen} h={h} b={b} tf={tf} tw={tw} color="#64748b" emissive="#3b82f6" />
      </group>

      {/* Supports */}
      <PinnedSupport position={[-half + 0.1, beamY - h / 2 - 0.18, 0]} />
      <RollerSupport position={[half - 0.1, beamY - h / 2 - 0.18, 0]} />

      {/* UDL */}
      {udl > 0 && (
        <UDLArrows
          start={-half + 0.15}
          end={half - 0.15}
          y={beamY + h / 2}
          magnitude={udl}
        />
      )}

      {/* Point Load */}
      {pointLoad > 0 && (
        <group>
          <LoadArrow
            position={[-half + beamLen * pointLoadPos, beamY + h / 2, 0]}
            magnitude={pointLoad}
            color="#ef4444"
          />
          <Text
            position={[-half + beamLen * pointLoadPos, beamY + h / 2 + 1.2, 0]}
            fontSize={0.15}
            color="#ef4444"
          >
            {`P = ${pointLoad.toFixed(0)} kN`}
          </Text>
        </group>
      )}

      {/* Labels */}
      <Text
        position={[0, beamY - h / 2 - 0.7, 0]}
        fontSize={0.18}
        color="#94a3b8"
        anchorX="center"
      >
        {`L = ${span.toFixed(1)} m`}
      </Text>

      {udl > 0 && (
        <Text
          position={[0, beamY + h / 2 + 1.2, 0]}
          fontSize={0.15}
          color="#fbbf24"
          anchorX="center"
        >
          {`w = ${udl.toFixed(1)} kN/m`}
        </Text>
      )}

      {/* Span dimension line */}
      <mesh position={[0, beamY - h / 2 - 0.45, 0]}>
        <boxGeometry args={[beamLen - 0.2, 0.01, 0.01]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Status glow */}
      <GlowRing status={status} />
    </group>
  );
}
