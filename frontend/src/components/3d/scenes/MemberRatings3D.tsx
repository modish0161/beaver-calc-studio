// =============================================================================
// 3D Scene: Member Ratings — Multi-material structural member with
// supports, force arrows, utilisation glow, section cross-section,
// deflected shape, and dimension annotations
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface MemberRatings3DProps {
  materialType?: 'steel' | 'concrete' | 'timber';
  memberType?: string;
  spanLength?: number;
  sectionDepth?: number;
  sectionWidth?: number;
  flangeThk?: number;
  webThk?: number;
  appliedMoment?: number;
  appliedShear?: number;
  appliedAxial?: number;
  momentCapacity?: number;
  shearCapacity?: number;
  utilisation?: number;
  rating?: string;
  status?: string;
}

function utilColor(u: number): string {
  if (u > 100) return '#ff4444';
  if (u > 80) return '#ffaa00';
  if (u > 60) return '#22d3ee';
  return '#00ff88';
}

function ratingColor(r: string): string {
  switch (r) {
    case 'OPTIMAL': return '#10B981';
    case 'EFFICIENT': return '#22D3EE';
    case 'ACCEPTABLE': return '#F59E0B';
    default: return '#EF4444';
  }
}

// ─── Animated glow ring ─────────────────────────────────────────────────────
function GlowRing({ radius, color, y = -0.01 }: { radius: number; color: string; y?: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.3;
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    }
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, y, 0]}>
      <torusGeometry args={[radius, 0.02, 16, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.6} />
    </mesh>
  );
}

// ─── Steel I-Section extruded shape ─────────────────────────────────────────
function ISectionBeam({
  length, h, b, tf, tw, color, emissive,
}: {
  length: number; h: number; b: number; tf: number; tw: number; color: string; emissive: string;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = h / 2; const bw = b / 2; const twh = tw / 2;
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
  const settings = useMemo(() => ({ depth: length, bevelEnabled: false }), [length]);
  const edgesGeom = useMemo(() => {
    const geom = new THREE.ExtrudeGeometry(shape, settings);
    return new THREE.EdgesGeometry(geom, 15);
  }, [shape, settings]);

  return (
    <group rotation={[0, -Math.PI / 2, 0]} position={[length / 2, 0, 0]}>
      <mesh castShadow>
        <extrudeGeometry args={[shape, settings]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.25} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Wireframe edges to reveal I-profile */}
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.45} />
      </lineSegments>
    </group>
  );
}

// ─── Concrete rectangular beam ──────────────────────────────────────────────
function ConcreteBeam({
  length, h, b, color, emissive,
}: {
  length: number; h: number; b: number; color: string; emissive: string;
}) {
  return (
    <group>
      {/* Main body */}
      <mesh castShadow>
        <boxGeometry args={[length, h, b]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.08} roughness={0.8} />
      </mesh>
      {/* Wireframe outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(length, h, b)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
      </lineSegments>
      {/* Rebar lines (visual) */}
      {[-1, 1].map((z) =>
        [-1, 1].map((y) => (
          <mesh key={`${z}${y}`} position={[0, (y * h * 0.35), (z * b * 0.3)]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, length, 8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
          </mesh>
        )),
      )}
      {/* Stirrups */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -length * 0.4 + (i * length * 0.8) / 5;
        return (
          <lineSegments key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(b * 0.7, h * 0.8, 0.01)]} />
            <lineBasicMaterial color="#fbbf24" transparent opacity={0.5} />
          </lineSegments>
        );
      })}
    </group>
  );
}

// ─── Timber rectangular beam ────────────────────────────────────────────────
function TimberBeam({
  length, h, b, color, emissive,
}: {
  length: number; h: number; b: number; color: string; emissive: string;
}) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[length, h, b]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.06} roughness={0.9} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(length, h, b)]} />
        <lineBasicMaterial color="#a78bfa" transparent opacity={0.4} />
      </lineSegments>
      {/* Grain lines */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = -h * 0.35 + (i * h * 0.7) / 4;
        return (
          <mesh key={i} position={[0, y, b / 2 + 0.002]}>
            <planeGeometry args={[length * 0.9, 0.008]} />
            <meshBasicMaterial color="#8b6c40" transparent opacity={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Pinned support ─────────────────────────────────────────────────────────
function PinnedSupport({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <coneGeometry args={[0.2, 0.35, 3]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// ─── Roller support ─────────────────────────────────────────────────────────
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

// ─── Force arrow ────────────────────────────────────────────────────────────
function ForceArrow({
  position, magnitude, label, color, direction = 'down', onPointerOver, onPointerOut,
}: {
  position: [number, number, number]; magnitude: number; label: string; color: string; direction?: 'down' | 'right'; onPointerOver?: () => void; onPointerOut?: () => void;
}) {
  const len = Math.max(0.3, Math.min(1.2, magnitude / 200));
  const isRight = direction === 'right';
  return (
    <group position={position} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <mesh
        position={isRight ? [len / 2, 0, 0] : [0, len / 2, 0]}
        rotation={isRight ? [0, 0, -Math.PI / 2] : [0, 0, 0]}
      >
        <cylinderGeometry args={[0.02, 0.02, len, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <mesh
        position={isRight ? [0, 0, 0] : [0, 0.05, 0]}
        rotation={isRight ? [0, 0, Math.PI / 2] : [Math.PI, 0, 0]}
      >
        <coneGeometry args={[0.06, 0.12, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Text position={isRight ? [len + 0.3, 0, 0] : [0, len + 0.25, 0]} fontSize={0.12} color={color}>
        {label}
      </Text>
    </group>
  );
}

// ─── UDL display ────────────────────────────────────────────────────────────
function UDLArrows({
  start, end, y, magnitude, color = '#fbbf24',
}: {
  start: number; end: number; y: number; magnitude: number; color?: string;
}) {
  if (magnitude <= 0) return null;
  const count = 8;
  const step = (end - start) / (count - 1);
  const arrowLen = Math.min(0.6, Math.max(0.2, magnitude / 100));
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <group key={i} position={[start + i * step, y, 0]}>
          <mesh position={[0, arrowLen / 2 + 0.05, 0]}>
            <cylinderGeometry args={[0.015, 0.015, arrowLen, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.04, 0.08, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}
      {/* Connection bar */}
      <mesh position={[(start + end) / 2, y + arrowLen + 0.1, 0]}>
        <boxGeometry args={[end - start, 0.015, 0.015]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// ─── Dimension line ─────────────────────────────────────────────────────────
function DimensionLine({
  start, end, y, label, color = '#94a3b8',
}: {
  start: number; end: number; y: number; label: string; color?: string;
}) {
  const mid = (start + end) / 2;
  const len = end - start;
  return (
    <group>
      <mesh position={[mid, y, 0]}>
        <boxGeometry args={[len, 0.008, 0.008]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {/* Ticks */}
      {[start, end].map((x, i) => (
        <mesh key={i} position={[x, y, 0]}>
          <boxGeometry args={[0.008, 0.12, 0.008]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      ))}
      <Text position={[mid, y - 0.15, 0]} fontSize={0.14} color={color} anchorX="center">
        {label}
      </Text>
    </group>
  );
}

// ─── Utilisation bar ────────────────────────────────────────────────────────
function UtilisationBar({ utilisation, rating, y = -1.4 }: { utilisation: number; rating: string; y?: number }) {
  const barWidth = 1.6;
  const fill = Math.min(1, utilisation / 100);
  const col = ratingColor(rating);
  return (
    <group position={[0, y, 2]}>
      {/* Background */}
      <mesh>
        <boxGeometry args={[barWidth, 0.12, 0.02]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Fill */}
      <mesh position={[-(barWidth * (1 - fill)) / 2, 0, 0.01]}>
        <boxGeometry args={[barWidth * fill, 0.12, 0.02]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, 0.2, 0]} fontSize={0.1} color={col} anchorX="center">
        {`${rating} — ${utilisation.toFixed(0)}%`}
      </Text>
    </group>
  );
}

// ─── Bending moment diagram ─────────────────────────────────────────────────
function BendingMomentDiagram({
  halfSpan, maxSag, color, y = -0.8,
}: {
  halfSpan: number; maxSag: number; color: string; y?: number;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = 30;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = -halfSpan + t * 2 * halfSpan;
      const y = -maxSag * Math.sin(t * Math.PI);
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return pts;
  }, [halfSpan, maxSag]);

  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group position={[0, y, 0]}>
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </line>
      <Text position={[0, -maxSag - 0.15, 0]} fontSize={0.1} color={color} anchorX="center">
        BMD
      </Text>
    </group>
  );
}

// ─── Ground plane ───────────────────────────────────────────────────────────
function Ground({ width, y = -0.7 }: { width: number; y?: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width + 2, width + 2]} />
      <meshStandardMaterial color="#1a1a2e" roughness={1} transparent opacity={0.5} />
    </mesh>
  );
}

// ─── Cross-section outline at beam end ──────────────────────────────────
function CrossSectionOutline({
  h, b, tf, tw, materialType, position, color,
}: {
  h: number; b: number; tf: number; tw: number; materialType: string;
  position: [number, number, number]; color: string;
}) {
  const points = useMemo(() => {
    if (materialType === 'steel') {
      const hw = h / 2; const bw = b / 2; const twh = tw / 2;
      return [
        [-bw, -hw], [bw, -hw], [bw, -hw + tf], [twh, -hw + tf],
        [twh, hw - tf], [bw, hw - tf], [bw, hw], [-bw, hw],
        [-bw, hw - tf], [-twh, hw - tf], [-twh, -hw + tf], [-bw, -hw + tf], [-bw, -hw],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0));
    }
    const hw = h / 2; const bw = b / 2;
    return [
      [-bw, -hw], [bw, -hw], [bw, hw], [-bw, hw], [-bw, -hw],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  }, [h, b, tf, tw, materialType]);
  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group position={position}>
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.8} />
      </line>
      {/* Filled transparent face */}
      {materialType === 'steel' && (
        <mesh>
          <shapeGeometry args={[(() => {
            const s = new THREE.Shape();
            const hw = h / 2; const bw = b / 2; const twh = tw / 2;
            s.moveTo(-bw, -hw); s.lineTo(bw, -hw); s.lineTo(bw, -hw + tf);
            s.lineTo(twh, -hw + tf); s.lineTo(twh, hw - tf); s.lineTo(bw, hw - tf);
            s.lineTo(bw, hw); s.lineTo(-bw, hw); s.lineTo(-bw, hw - tf);
            s.lineTo(-twh, hw - tf); s.lineTo(-twh, -hw + tf); s.lineTo(-bw, -hw + tf);
            s.closePath();
            return s;
          })()]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── Deflected shape curve ──────────────────────────────────────────────
function DeflectedShape({
  halfSpan, maxDeflection, y, color,
}: {
  halfSpan: number; maxDeflection: number; y: number; color: string;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = -halfSpan + t * 2 * halfSpan;
      const dy = -maxDeflection * Math.sin(t * Math.PI);
      pts.push(new THREE.Vector3(x, y + dy, 0));
    }
    return pts;
  }, [halfSpan, maxDeflection, y]);
  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group>
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.35} />
      </line>
      <Text position={[halfSpan * 0.4, y - maxDeflection - 0.12, 0]} fontSize={0.09} color={color} anchorX="center">
        δ (exag.)
      </Text>
    </group>
  );
}

// ─── Shear Force Diagram ────────────────────────────────────────────────
function ShearForceDiagram({
  halfSpan, maxShear, color, y = -0.8,
}: {
  halfSpan: number; maxShear: number; color: string; y?: number;
}) {
  const sfHeight = Math.min(0.35, Math.max(0.1, maxShear / 300));
  const points = useMemo(() => [
    new THREE.Vector3(-halfSpan, sfHeight, 0),
    new THREE.Vector3(-halfSpan, 0, 0),
    new THREE.Vector3(halfSpan, 0, 0),
    new THREE.Vector3(halfSpan, -sfHeight, 0),
  ], [halfSpan, sfHeight]);
  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  // Filled SFD quads
  const posQuad = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      -halfSpan, 0, 0,  -halfSpan, sfHeight, 0,  0, 0, 0,
      0, 0, 0,  -halfSpan, sfHeight, 0,  0, 0, 0,
    ], 3));
    return g;
  }, [halfSpan, sfHeight]);
  const negQuad = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0,  halfSpan, 0, 0,  halfSpan, -sfHeight, 0,
      0, 0, 0,  halfSpan, -sfHeight, 0,  0, 0, 0,
    ], 3));
    return g;
  }, [halfSpan, sfHeight]);

  return (
    <group position={[0, y, 0]}>
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </line>
      {/* Positive fill */}
      <mesh geometry={posQuad}>
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={negQuad}>
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
      <Text position={[0, -sfHeight - 0.15, 0]} fontSize={0.1} color={color} anchorX="center">
        SFD
      </Text>
    </group>
  );
}

// ─── Reaction arrow (upward at support) ─────────────────────────────────
function ReactionArrow({
  position, magnitude, label, color = '#22c55e',
}: {
  position: [number, number, number]; magnitude: number; label: string; color?: string;
}) {
  const len = Math.max(0.25, Math.min(0.8, magnitude / 200));
  return (
    <group position={position}>
      <mesh position={[0, -len / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, len, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[0.06, 0.1, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, -len - 0.15, 0]} fontSize={0.1} color={color} anchorX="center">
        {label}
      </Text>
    </group>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function MemberRatings3D({
  materialType = 'steel',
  memberType = 'ukb',
  spanLength = 6,
  sectionDepth = 400,
  sectionWidth = 200,
  flangeThk = 12,
  webThk = 8,
  appliedMoment = 150,
  appliedShear = 80,
  appliedAxial = 0,
  momentCapacity = 300,
  shearCapacity = 200,
  utilisation = 50,
  rating = 'OPTIMAL',
  status = 'PASS',
}: MemberRatings3DProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Floating animation
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.04;
    }
  });

  // ── Normalise geometry to scene units ─────────────────────────────────
  const beamLen = 5;
  const half = beamLen / 2;

  // Exaggerate cross-section so it reads clearly against the span
  const rawH = sectionDepth / 1000;
  const rawB = sectionWidth / 1000;
  const secScale = Math.max(1.5, Math.min(3.5, 0.8 / rawH));
  const h = rawH * secScale;
  const b = rawB * secScale;
  const tf = Math.max(h * 0.08, (flangeThk / sectionDepth) * h * 1.8);
  const tw = Math.max(h * 0.06, (webThk / sectionDepth) * h * 1.8);

  const beamY = h / 2 + 0.5;
  const uCol = utilColor(utilisation);
  const supportY = beamY - h / 2 - 0.2;
  const groundY = supportY - 0.2;

  // Deflection magnitude for BMD
  const bmSag = Math.min(0.4, (utilisation / 100) * 0.4);

  // Material-specific colours
  const matColours = {
    steel: { body: '#64748b', emissive: '#3b82f6' },
    concrete: { body: '#6b7280', emissive: '#8b5cf6' },
    timber: { body: '#a67c52', emissive: '#d97706' },
  };
  const mc = matColours[materialType] || matColours.steel;

  return (
    <group ref={groupRef}>
        {/* Scene-specific lighting */}
        <spotLight position={[0, 4, 3]} angle={0.5} penumbra={0.5} intensity={1.5} color="#ffffff" castShadow />
        <pointLight position={[0, beamY, 2]} intensity={0.6} color="#00d9ff" distance={8} />
        <pointLight position={[0, beamY, -2]} intensity={0.3} color="#b026ff" distance={6} />

        {/* Beam (centered between supports) */}
        <group position={[0, beamY, 0]}>
          {materialType === 'steel' ? (
            <ISectionBeam length={beamLen} h={h} b={b} tf={tf} tw={tw} color={mc.body} emissive={uCol} />
          ) : materialType === 'concrete' ? (
            <ConcreteBeam length={beamLen} h={h} b={b} color={mc.body} emissive={uCol} />
          ) : (
            <TimberBeam length={beamLen} h={h} b={b} color={mc.body} emissive={uCol} />
          )}
        </group>

        {/* Supports (aligned to beam ends) */}
        <PinnedSupport position={[-half, supportY, 0]} />
        <RollerSupport position={[half, supportY, 0]} />

        {/* Reaction arrows at supports */}
        {appliedShear > 0 && (
          <>
            <ReactionArrow
              position={[-half, supportY - 0.15, 0]}
              magnitude={appliedShear}
              label={`R_A=${appliedShear.toFixed(0)} kN`}
              color="#22c55e"
            />
            <ReactionArrow
              position={[half, supportY - 0.15, 0]}
              magnitude={appliedShear}
              label={`R_B=${appliedShear.toFixed(0)} kN`}
              color="#22c55e"
            />
          </>
        )}

        {/* Cross-section outline at both beam ends */}
        <CrossSectionOutline
          h={h} b={b} tf={tf} tw={tw}
          materialType={materialType}
          position={[-half, beamY, 0]}
          color={uCol}
        />
        <CrossSectionOutline
          h={h} b={b} tf={tf} tw={tw}
          materialType={materialType}
          position={[half, beamY, 0]}
          color={uCol}
        />

        {/* Section dimension labels on cross-section */}
        <group position={[-half - 0.05, beamY, 0]}>
          <Text position={[-b / 2 - 0.12, 0, 0]} fontSize={0.08} color="#94a3b8" anchorX="right" anchorY="middle">
            {`h=${sectionDepth.toFixed(0)}`}
          </Text>
          <Text position={[0, h / 2 + 0.1, 0]} fontSize={0.08} color="#94a3b8" anchorX="center">
            {`b=${sectionWidth.toFixed(0)}`}
          </Text>
        </group>

        {/* Applied loads */}
        {appliedMoment > 0 && (
          <UDLArrows
            start={-half + 0.15}
            end={half - 0.15}
            y={beamY + h / 2}
            magnitude={appliedMoment}
            color="#fbbf24"
          />
        )}
        {appliedShear > 0 && (
          <>
            <ForceArrow
              position={[-half, beamY + h / 2, 0.3]}
              magnitude={appliedShear}
              label={`V=${appliedShear.toFixed(0)} kN`}
              color="#f87171"
              onPointerOver={() => setHovered('shearL')}
              onPointerOut={() => setHovered(null)}
            />
            <ForceArrow
              position={[half, beamY + h / 2, 0.3]}
              magnitude={appliedShear}
              label={`V=${appliedShear.toFixed(0)} kN`}
              color="#f87171"
              onPointerOver={() => setHovered('shearR')}
              onPointerOut={() => setHovered(null)}
            />
          </>
        )}
        {appliedAxial > 0 && (
          <ForceArrow
            position={[-half - 0.3, beamY, 0]}
            magnitude={appliedAxial}
            label={`N=${appliedAxial.toFixed(0)} kN`}
            color="#c084fc"
            direction="right"
            onPointerOver={() => setHovered('axial')}
            onPointerOut={() => setHovered(null)}
          />
        )}

        {/* Moment label */}
        {appliedMoment > 0 && (
          <Text
            position={[0, beamY + h / 2 + 1.0, 0]}
            fontSize={0.13}
            color="#fbbf24"
            anchorX="center"
          >
            {`M=${appliedMoment.toFixed(0)} kNm (M_Rd=${momentCapacity.toFixed(0)} kNm)`}
          </Text>
        )}

        {/* Dimension lines */}
        <DimensionLine
          start={-half}
          end={half}
          y={supportY - 0.4}
          label={`L = ${spanLength.toFixed(1)} m`}
        />

        {/* Section depth label */}
        <Text
          position={[half + 0.5, beamY, 0]}
          fontSize={0.11}
          color="#94a3b8"
          anchorX="left"
        >
          {materialType === 'steel'
            ? `${sectionDepth.toFixed(0)}×${sectionWidth.toFixed(0)}`
            : `${sectionWidth.toFixed(0)}×${sectionDepth.toFixed(0)} mm`}
        </Text>

        {/* Bending moment diagram */}
        <BendingMomentDiagram halfSpan={half} maxSag={bmSag} color={uCol} y={groundY - 0.05} />

        {/* Shear force diagram */}
        <ShearForceDiagram halfSpan={half} maxShear={appliedShear} color="#f87171" y={groundY - 0.55} />

        {/* Deflected shape */}
        <DeflectedShape halfSpan={half} maxDeflection={bmSag * 0.5} y={beamY - h / 2 - 0.04} color={uCol} />

        {/* Utilisation bar */}
        <UtilisationBar utilisation={utilisation} rating={rating} y={groundY - 0.6} />

        {/* Glow ring */}
        <GlowRing radius={half + 0.5} color={uCol} y={groundY + 0.01} />

        {/* Ground */}
        <Ground width={beamLen + 2} y={groundY} />

        {/* Material badge */}
        <Text position={[0, beamY + h / 2 + 1.6, 0]} fontSize={0.14} color={mc.emissive} anchorX="center">
          {materialType === 'steel' ? 'EN 1993-1-1' : materialType === 'concrete' ? 'EN 1992-1-1' : 'EN 1995-1-1'}
        </Text>

        {/* Status badge */}
        <Text position={[half + 0.5, beamY + h / 2 + 0.3, 0]} fontSize={0.14} color={status === 'PASS' ? '#22c55e' : '#ef4444'} anchorX="left">
          {status}
        </Text>

        {/* Tooltips for interactive elements */}
        {hovered === 'shearL' && (
          <Text position={[-half, beamY + h / 2 + 0.5, 0.3]} fontSize={0.13} color="#f87171" anchorX="center">Left Shear Force</Text>
        )}
        {hovered === 'shearR' && (
          <Text position={[half, beamY + h / 2 + 0.5, 0.3]} fontSize={0.13} color="#f87171" anchorX="center">Right Shear Force</Text>
        )}
        {hovered === 'axial' && (
          <Text position={[-half - 0.3, beamY + 0.5, 0]} fontSize={0.13} color="#c084fc" anchorX="center">Axial Force</Text>
        )}
    </group>
  );
}
