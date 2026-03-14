// =============================================================================
// 3D Scene: Transverse Members — Steel I-beam with flanges, web, stiffeners,
// UDL arrows, supports, dimension labels, and utilisation-based colouring.
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface TransverseMembers3DProps {
  /** Span (m) */
  span?: number;
  /** Overall member depth (mm) */
  depth?: number;
  /** Top flange width (mm) */
  widthTop?: number;
  /** Bottom flange width (mm) */
  widthBottom?: number;
  /** Web thickness (mm) */
  webThickness?: number;
  /** Main girder spacing (m) */
  girderSpacing?: number;
  /** Number of main girders */
  numberOfGirders?: number;
  /** UDL dead load (kN/m) */
  deadLoad?: number;
  /** UDL live load (kN/m) */
  liveLoad?: number;
  /** End conditions */
  endConditions?: string;
  /** Steel grade */
  steelGrade?: string;
  /** Member type */
  memberType?: string;
  /** Max utilisation 0-100+ */
  utilisation?: number;
  /** Overall status */
  status?: 'PASS' | 'FAIL';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SupportTriangle({
  position,
  continuous = false,
}: {
  position: [number, number, number];
  continuous?: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <coneGeometry args={[0.12, 0.2, 3]} />
        <meshStandardMaterial
          color={continuous ? '#a855f7' : '#00d9ff'}
          emissive={continuous ? '#a855f7' : '#00d9ff'}
          emissiveIntensity={0.4}
        />
      </mesh>
      {continuous && (
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.28, 0.03, 0.12]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function LoadArrow({
  position,
  magnitude,
  color = '#fbbf24',
}: {
  position: [number, number, number];
  magnitude: number;
  color?: string;
}) {
  const arrowLen = Math.min(0.5, Math.max(0.15, magnitude / 60));
  return (
    <group position={position}>
      <mesh position={[0, arrowLen / 2 + 0.04, 0]}>
        <cylinderGeometry args={[0.012, 0.012, arrowLen, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.035, 0.07, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function GlowRing({
  status,
  span,
  depth,
  utilisation,
}: {
  status: 'PASS' | 'FAIL';
  span: number;
  depth: number;
  utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  const radius = Math.sqrt(span * span + depth * depth) / 2 + 0.15;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.03;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.08 + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 8, 64]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.8} transparent opacity={0.1} />
    </mesh>
  );
}

/** Stiffener plate at a given X position */
function Stiffener({
  x,
  hw,
  tw,
  webY,
  color,
  emissive,
}: {
  x: number;
  hw: number;
  tw: number;
  webY: number;
  color: string;
  emissive: string;
}) {
  const stiffH = hw * 0.95;
  const stiffW = tw * 2;
  return (
    <group>
      {/* Front stiffener */}
      <mesh position={[x, webY, tw / 2 + stiffW / 2]}>
        <boxGeometry args={[tw * 0.8, stiffH, stiffW]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.05} metalness={0.7} roughness={0.3} transparent opacity={0.6} />
      </mesh>
      {/* Back stiffener */}
      <mesh position={[x, webY, -(tw / 2 + stiffW / 2)]}>
        <boxGeometry args={[tw * 0.8, stiffH, stiffW]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.05} metalness={0.7} roughness={0.3} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TransverseMembers3D({
  span = 3.5,
  depth = 800,
  widthTop = 300,
  widthBottom = 250,
  webThickness = 12,
  girderSpacing = 3.5,
  numberOfGirders = 4,
  deadLoad = 25,
  liveLoad = 40,
  endConditions = 'continuous',
  steelGrade = 'S355',
  memberType = 'beam',
  utilisation = 0,
  status = 'PASS',
}: TransverseMembers3DProps) {
  const util = utilisation;

  // Scale: 1 unit = 1 metre — I-beam along X-axis
  const L = Math.max(0.5, span);
  const halfL = L / 2;

  // Convert dimensions mm → m
  const h = depth / 1000;
  const bTop = widthTop / 1000;
  const bBot = widthBottom / 1000;
  const tw = webThickness / 1000;

  // Estimate flange thickness
  const tf = Math.max(((bTop + bBot) / 2 - tw) * 0.08, 0.01);
  const hw = h - 2 * tf;

  // Centres
  const beamY = 0;
  const botFlangeY = beamY - h / 2 + tf / 2;
  const topFlangeY = beamY + h / 2 - tf / 2;
  const webY = beamY;

  // Utilisation-based colouring
  const steelColor = useMemo(() => {
    if (util > 100) return '#7f1d1d';
    if (util > 90) return '#78350f';
    return '#475569';
  }, [util]);

  const emissiveColor = useMemo(() => {
    if (util > 100) return '#ef4444';
    if (util > 90) return '#f97316';
    return '#3b82f6';
  }, [util]);

  // UDL total
  const totalUDL = deadLoad + liveLoad;

  // UDL arrow positions along the top flange
  const udlPositions = useMemo(() => {
    const pts: [number, number, number][] = [];
    const n = Math.max(4, Math.round(L / 0.35));
    for (let i = 0; i <= n; i++) {
      pts.push([-halfL + (i / n) * L, topFlangeY + tf / 2, 0]);
    }
    return pts;
  }, [L, halfL, topFlangeY, tf]);

  const isContinuous = endConditions === 'continuous';

  // Girder positions for deck representation
  const girderPositions = useMemo(() => {
    const pts: number[] = [];
    const totalW = (numberOfGirders - 1) * girderSpacing;
    const startX = -totalW / 2;
    for (let i = 0; i < numberOfGirders; i++) {
      pts.push(startX + i * girderSpacing);
    }
    return pts;
  }, [numberOfGirders, girderSpacing]);

  return (
    <group>
      {/* ============ TOP FLANGE ============ */}
      <mesh position={[0, topFlangeY, 0]} castShadow>
        <boxGeometry args={[L, tf, bTop]} />
        <meshStandardMaterial
          color={steelColor}
          emissive={emissiveColor}
          emissiveIntensity={0.06}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Top flange edges */}
      <lineSegments position={[0, topFlangeY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(L, tf, bTop)]} />
        <lineBasicMaterial color="#60a5fa" transparent opacity={0.4} />
      </lineSegments>

      {/* ============ BOTTOM FLANGE ============ */}
      <mesh position={[0, botFlangeY, 0]} castShadow>
        <boxGeometry args={[L, tf, bBot]} />
        <meshStandardMaterial
          color={steelColor}
          emissive={emissiveColor}
          emissiveIntensity={0.06}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <lineSegments position={[0, botFlangeY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(L, tf, bBot)]} />
        <lineBasicMaterial color="#60a5fa" transparent opacity={0.4} />
      </lineSegments>

      {/* ============ WEB ============ */}
      <mesh position={[0, webY, 0]} castShadow>
        <boxGeometry args={[L, hw, tw]} />
        <meshStandardMaterial
          color={steelColor}
          emissive={emissiveColor}
          emissiveIntensity={0.04}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.85}
        />
      </mesh>
      <lineSegments position={[0, webY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(L, hw, tw)]} />
        <lineBasicMaterial color="#60a5fa" transparent opacity={0.3} />
      </lineSegments>

      {/* ============ BEARING STIFFENERS (at supports) ============ */}
      <Stiffener x={-halfL + tw} hw={hw} tw={tw} webY={webY} color={steelColor} emissive={emissiveColor} />
      <Stiffener x={halfL - tw} hw={hw} tw={tw} webY={webY} color={steelColor} emissive={emissiveColor} />

      {/* ============ INTERMEDIATE STIFFENERS ============ */}
      {L > 2 && (
        <>
          {Array.from({ length: Math.max(1, Math.round(L / 1.5) - 1) }, (_, i) => {
            const x = -halfL + ((i + 1) / (Math.round(L / 1.5))) * L;
            if (Math.abs(x) > halfL - 0.3) return null;
            return (
              <Stiffener key={`int-${i}`} x={x} hw={hw} tw={tw * 0.7} webY={webY} color={steelColor} emissive={emissiveColor} />
            );
          })}
        </>
      )}

      {/* ============ MAIN GIRDERS (tall I-beams, perpendicular) ============ */}
      {girderPositions.map((gx, i) => {
        const girderH = h * 1.8;
        const girderTf = tf * 1.2;
        const girderTw = tw * 0.8;
        const girderW = bTop * 0.7;
        const gy = beamY;
        const visible = Math.abs(gx) <= halfL + 0.1;
        if (!visible) return null;
        const clampedX = Math.max(-halfL, Math.min(halfL, gx));
        return (
          <group key={`girder-${i}`} position={[clampedX, gy, 0]} rotation={[0, Math.PI / 2, 0]}>
            {/* Girder web (perpendicular) */}
            <mesh>
              <boxGeometry args={[girderW * 2, girderH, girderTw]} />
              <meshStandardMaterial
                color="#334155"
                emissive="#6366f1"
                emissiveIntensity={0.03}
                metalness={0.7}
                roughness={0.3}
                transparent
                opacity={0.3}
              />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(girderW * 2, girderH, girderTw)]} />
              <lineBasicMaterial color="#6366f1" transparent opacity={0.2} />
            </lineSegments>
            {/* Girder label */}
            <Text
              position={[0, girderH / 2 + 0.1, 0]}
              fontSize={0.07}
              color="#818cf8"
              anchorX="center"
            >
              G{i + 1}
            </Text>
          </group>
        );
      })}

      {/* ============ DECK SLAB (semi-transparent above) ============ */}
      {(() => {
        const deckW = numberOfGirders > 1 ? (numberOfGirders - 1) * girderSpacing + 1 : L;
        const deckH = 0.08;
        return (
          <mesh position={[0, topFlangeY + tf / 2 + deckH / 2 + 0.01, 0]}>
            <boxGeometry args={[Math.min(deckW, L + 0.5), deckH, L * 0.7]} />
            <meshStandardMaterial
              color="#64748b"
              emissive="#a855f7"
              emissiveIntensity={0.02}
              transparent
              opacity={0.25}
            />
          </mesh>
        );
      })()}

      {/* ============ UDL ARROWS ============ */}
      {udlPositions.map((p, i) => (
        <LoadArrow key={`udl-${i}`} position={p} magnitude={totalUDL} color="#fbbf24" />
      ))}

      {/* ============ SUPPORTS ============ */}
      <SupportTriangle position={[-halfL, botFlangeY - tf / 2 - 0.12, 0]} continuous={isContinuous} />
      <SupportTriangle position={[halfL, botFlangeY - tf / 2 - 0.12, 0]} continuous={isContinuous} />

      {/* ============ DIMENSION LABELS ============ */}
      {/* Span */}
      <Text position={[0, botFlangeY - tf / 2 - 0.45, halfL > 1 ? bBot / 2 + 0.3 : 0]} fontSize={0.12} color="#00d9ff" anchorX="center">
        L = {span.toFixed(1)} m
      </Text>
      <mesh position={[0, botFlangeY - tf / 2 - 0.35, bBot / 2 + 0.3]}>
        <boxGeometry args={[L, 0.006, 0.006]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.3} />
      </mesh>
      {[-halfL, halfL].map((x, i) => (
        <mesh key={`dspan-${i}`} position={[x, botFlangeY - tf / 2 - 0.35, bBot / 2 + 0.3]}>
          <boxGeometry args={[0.006, 0.1, 0.006]} />
          <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Depth */}
      <Text position={[halfL + 0.25, beamY, 0]} fontSize={0.09} color="#f97316" anchorX="center">
        h={depth}mm
      </Text>
      <mesh position={[halfL + 0.15, beamY, 0]}>
        <boxGeometry args={[0.005, h, 0.005]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
      </mesh>
      {[topFlangeY + tf / 2, botFlangeY - tf / 2].map((y, i) => (
        <mesh key={`dh-${i}`} position={[halfL + 0.15, y, 0]}>
          <boxGeometry args={[0.08, 0.005, 0.005]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Top flange width */}
      <Text position={[0, topFlangeY + tf / 2 + 0.12, bTop / 2 + 0.1]} fontSize={0.07} color="#a78bfa" anchorX="center">
        b_f={widthTop}
      </Text>

      {/* Web thickness */}
      <Text position={[-halfL - 0.2, beamY, 0]} fontSize={0.07} color="#94a3b8" anchorX="center">
        t_w={webThickness}
      </Text>

      {/* ============ MATERIAL / UDL LABELS ============ */}
      <Text position={[0, topFlangeY + tf / 2 + 0.7, 0]} fontSize={0.1} color="#94a3b8" anchorX="center">
        {steelGrade} | {memberType === 'diaphragm' ? 'Diaphragm' : memberType === 'cross_beam' ? 'Cross Beam' : 'Transverse Beam'}
      </Text>
      <Text position={[0, topFlangeY + tf / 2 + 0.9, 0]} fontSize={0.1} color="#fbbf24" anchorX="center">
        UDL = {totalUDL.toFixed(1)} kN/m (DL:{deadLoad} + LL:{liveLoad})
      </Text>

      {/* End conditions label */}
      <Text position={[0, botFlangeY - tf / 2 - 0.6, bBot / 2 + 0.3]} fontSize={0.08} color={isContinuous ? '#a855f7' : '#00d9ff'} anchorX="center">
        {isContinuous ? 'Continuous' : 'Simply Supported'}
      </Text>

      {/* ============ STATUS / UTILISATION ============ */}
      <Text
        position={[0, topFlangeY + tf / 2 + 1.15, 0]}
        fontSize={0.14}
        color={status === 'FAIL' ? '#ef4444' : util > 90 ? '#f97316' : '#22c55e'}
        anchorX="center"
      >
        {status} — {util.toFixed(0)}%
      </Text>

      {/* Glow ring */}
      <GlowRing status={status} span={L} depth={h} utilisation={util} />
    </group>
  );
}
