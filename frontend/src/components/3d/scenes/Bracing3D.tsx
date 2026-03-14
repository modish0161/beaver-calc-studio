// =============================================================================
// 3D Scene: Bracing — Premium version with utilisation-based colouring,
// glow ring, force labels, dimension annotations, gusset plates, and
// multi-panel support. Types: cross, single_diagonal, k, v, inverted_v, eccentric
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface Bracing3DProps {
  bayWidth?: number;
  bayHeight?: number;
  bracingType?: string;
  numberOfPanels?: number;
  memberSize?: string;
  windLoad?: number;
  lateralForce?: number;
  forcePerMember?: number;
  sectionType?: string;
  steelGrade?: string;
  utilisation?: number;
  status?: 'PASS' | 'FAIL';
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TubeMember({
  start,
  end,
  radius = 0.04,
  color = '#64748b',
  emissive = '#3b82f6',
  emissiveIntensity = 0.1,
  opacity = 1,
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
}) {
  const { mid, quat, len } = useMemo(() => {
    const dir = new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
    const l = dir.length();
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return {
      mid: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2] as [number, number, number],
      quat: q,
      len: l,
    };
  }, [start, end]);

  return (
    <mesh position={mid} quaternion={quat} castShadow>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        metalness={0.7}
        roughness={0.3}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

function GussetPlate({ position, size = 0.07 }: { position: [number, number, number]; size?: number }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[size * 2, size * 2, 0.01]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

function WindArrow({ position }: { position: [number, number, number] }) {
  const arrowLen = 0.5;
  return (
    <group position={position}>
      <mesh position={[-arrowLen / 2 - 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, arrowLen, 8]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.05, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.08, 8]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function GlowRing({
  status,
  radius,
  utilisation,
}: {
  status: 'PASS' | 'FAIL';
  radius: number;
  utilisation: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const colour = status === 'FAIL' ? '#ef4444' : utilisation > 90 ? '#f97316' : '#22c55e';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.03;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.08 + Math.sin(clock.getElapsedTime() * 2) * 0.04;
  });
  return (
    <mesh ref={ref} position={[0, radius * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 8, 64]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.8} transparent opacity={0.1} />
    </mesh>
  );
}

function SupportTriangle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <coneGeometry args={[0.1, 0.18, 3]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Bracing3D({
  bayWidth = 6,
  bayHeight = 4,
  bracingType = 'cross',
  numberOfPanels = 2,
  memberSize = 'CHS 139.7×6.3',
  windLoad = 1.2,
  lateralForce = 0,
  forcePerMember = 0,
  sectionType = '',
  steelGrade = 'S355',
  utilisation = 0,
  status = 'PASS',
}: Bracing3DProps) {
  const util = utilisation;
  const nPanels = Math.max(1, numberOfPanels);
  const totalW = bayWidth;
  const panelW = totalW / nPanels;

  // Normalise to scene units
  const maxDim = Math.max(totalW, bayHeight, 4);
  const s = 3.5 / maxDim;
  const W = totalW * s;
  const H = bayHeight * s;
  const pW = panelW * s;
  const depth = 0.5;

  // Utilisation-based colours
  const braceColor = useMemo(() => {
    if (util > 100) return '#7f1d1d';
    if (util > 90) return '#78350f';
    return '#1e3a5f';
  }, [util]);

  const braceEmissive = useMemo(() => {
    if (util > 100) return '#ef4444';
    if (util > 90) return '#f97316';
    return '#22c55e';
  }, [util]);

  const emissiveI = util > 100 ? 0.35 : util > 90 ? 0.25 : 0.15;

  const frameR = 0.05;
  const braceR = 0.035;

  // Build frame corners for each panel
  const panels = useMemo(() => {
    const result: { bl: [number, number, number]; br: [number, number, number]; tl: [number, number, number]; tr: [number, number, number] }[] = [];
    for (let i = 0; i < nPanels; i++) {
      const x0 = -W / 2 + i * pW;
      const x1 = x0 + pW;
      result.push({
        bl: [x0, 0, 0],
        br: [x1, 0, 0],
        tl: [x0, H, 0],
        tr: [x1, H, 0],
      });
    }
    return result;
  }, [W, H, pW, nPanels]);

  // Generate bracing diagonals + gusset positions per panel
  const { braces, gussets } = useMemo(() => {
    const b: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const g: [number, number, number][] = [];

    for (const p of panels) {
      const { bl, br, tl, tr } = p;
      const midX = (bl[0] + br[0]) / 2;

      switch (bracingType) {
        case 'cross':
          b.push({ start: bl, end: tr });
          b.push({ start: br, end: tl });
          g.push(bl, br, tl, tr);
          break;
        case 'single_diagonal':
          b.push({ start: bl, end: tr });
          g.push(bl, tr);
          break;
        case 'k_bracing': {
          const midL: [number, number, number] = [bl[0], H / 2, 0];
          b.push({ start: midL, end: tr });
          b.push({ start: midL, end: br });
          g.push(midL, tr, br);
          break;
        }
        case 'v_bracing': {
          const midTop: [number, number, number] = [midX, H, 0];
          b.push({ start: bl, end: midTop });
          b.push({ start: br, end: midTop });
          g.push(bl, br, midTop);
          break;
        }
        case 'inverted_v': {
          const midBot: [number, number, number] = [midX, 0, 0];
          b.push({ start: tl, end: midBot });
          b.push({ start: tr, end: midBot });
          g.push(tl, tr, midBot);
          break;
        }
        case 'eccentric': {
          const eccOff = pW * 0.25;
          const eccPt: [number, number, number] = [bl[0] + eccOff, H, 0];
          b.push({ start: bl, end: eccPt });
          b.push({ start: br, end: eccPt });
          g.push(bl, br, eccPt);
          break;
        }
        default:
          b.push({ start: bl, end: tr });
          b.push({ start: br, end: tl });
          g.push(bl, br, tl, tr);
      }
    }
    return { braces: b, gussets: g };
  }, [panels, bracingType, H, pW]);

  // Wind arrow vertical positions
  const windArrows = useMemo(() => {
    const n = Math.max(2, Math.round(H / 0.8));
    const pts: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const y = (H / (n + 1)) * (i + 1);
      pts.push([-W / 2 - 0.15, y, 0]);
    }
    return pts;
  }, [W, H]);

  const ringR = Math.sqrt(W * W + H * H) / 2 + 0.2;

  return (
    <group position={[0, 0, depth / 2]}>
      {/* ── FRONT FRAME ── */}
      {panels.map((p, i) => (
        <group key={`frame-${i}`}>
          {i === 0 && <TubeMember start={p.bl} end={p.tl} radius={frameR} color="#475569" emissive="#00d9ff" emissiveIntensity={0.08} />}
          <TubeMember start={p.br} end={p.tr} radius={frameR} color="#475569" emissive="#00d9ff" emissiveIntensity={0.08} />
          <TubeMember start={p.tl} end={p.tr} radius={frameR} color="#475569" emissive="#00d9ff" emissiveIntensity={0.08} />
          <TubeMember start={p.bl} end={p.br} radius={frameR} color="#475569" emissive="#00d9ff" emissiveIntensity={0.08} />
        </group>
      ))}

      {/* ── BACK FRAME (ghost) ── */}
      {panels.map((p, i) => {
        const blB: [number, number, number] = [p.bl[0], p.bl[1], -depth];
        const brB: [number, number, number] = [p.br[0], p.br[1], -depth];
        const tlB: [number, number, number] = [p.tl[0], p.tl[1], -depth];
        const trB: [number, number, number] = [p.tr[0], p.tr[1], -depth];
        return (
          <group key={`back-${i}`}>
            {i === 0 && <TubeMember start={blB} end={tlB} radius={frameR * 0.7} color="#334155" emissive="#00d9ff" emissiveIntensity={0.04} opacity={0.5} />}
            <TubeMember start={brB} end={trB} radius={frameR * 0.7} color="#334155" emissive="#00d9ff" emissiveIntensity={0.04} opacity={0.5} />
            <TubeMember start={tlB} end={trB} radius={frameR * 0.7} color="#334155" emissive="#00d9ff" emissiveIntensity={0.04} opacity={0.5} />
            <TubeMember start={blB} end={brB} radius={frameR * 0.7} color="#334155" emissive="#00d9ff" emissiveIntensity={0.04} opacity={0.5} />
          </group>
        );
      })}

      {/* ── CONNECTING PURLINS ── */}
      {panels.map((p, i) => (
        <group key={`conn-${i}`}>
          {i === 0 && (
            <>
              <TubeMember start={p.bl} end={[p.bl[0], p.bl[1], -depth]} radius={frameR * 0.5} color="#334155" emissive="#00d9ff" emissiveIntensity={0.04} opacity={0.4} />
              <TubeMember start={p.tl} end={[p.tl[0], p.tl[1], -depth]} radius={frameR * 0.5} color="#334155" emissive="#00d9ff" emissiveIntensity={0.04} opacity={0.4} />
            </>
          )}
          <TubeMember start={p.br} end={[p.br[0], p.br[1], -depth]} radius={frameR * 0.5} color="#334155" emissive="#00d9ff" emissiveIntensity={0.04} opacity={0.4} />
          <TubeMember start={p.tr} end={[p.tr[0], p.tr[1], -depth]} radius={frameR * 0.5} color="#334155" emissive="#00d9ff" emissiveIntensity={0.04} opacity={0.4} />
        </group>
      ))}

      {/* ── BRACING DIAGONALS ── */}
      {braces.map((m, i) => (
        <TubeMember
          key={`brace-${i}`}
          start={m.start}
          end={m.end}
          radius={braceR}
          color={braceColor}
          emissive={braceEmissive}
          emissiveIntensity={emissiveI}
        />
      ))}

      {/* ── GUSSET PLATES ── */}
      {gussets.map((pos, i) => (
        <GussetPlate key={`gusset-${i}`} position={pos} />
      ))}

      {/* ── GROUND ── */}
      <mesh position={[0, -0.05, -depth / 2]} receiveShadow>
        <boxGeometry args={[W + 1, 0.1, depth + 1]} />
        <meshStandardMaterial color="#374151" roughness={1} />
      </mesh>

      {/* ── SUPPORTS ── */}
      <SupportTriangle position={[-W / 2, -0.14, 0]} />
      <SupportTriangle position={[W / 2, -0.14, 0]} />

      {/* ── WIND ARROWS ── */}
      {windArrows.map((pos, i) => (
        <WindArrow key={`wind-${i}`} position={pos} />
      ))}

      {/* ── DIMENSION LABELS ── */}
      <Text position={[0, -0.4, 0]} fontSize={0.11} color="#00d9ff" anchorX="center">
        {`L = ${bayWidth.toFixed(1)} m`}
      </Text>
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[W, 0.005, 0.005]} />
        <meshStandardMaterial color="#00d9ff" emissive="#00d9ff" emissiveIntensity={0.3} />
      </mesh>

      <Text position={[W / 2 + 0.3, H / 2, 0]} fontSize={0.1} color="#f97316" anchorX="center">
        {`H = ${bayHeight.toFixed(1)} m`}
      </Text>
      <mesh position={[W / 2 + 0.2, H / 2, 0]}>
        <boxGeometry args={[0.005, H, 0.005]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
      </mesh>

      {/* Title */}
      <Text position={[0, H + 0.4, 0]} fontSize={0.14} color="#94a3b8" anchorX="center">
        {bracingType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Bracing
      </Text>

      <Text position={[0, H + 0.22, 0]} fontSize={0.09} color="#a78bfa" anchorX="center">
        {sectionType || memberSize} — {steelGrade}
      </Text>

      <Text position={[-W / 2 - 0.7, H + 0.1, 0]} fontSize={0.09} color="#38bdf8" anchorX="center">
        {`W = ${windLoad.toFixed(1)} kN/m²`}
      </Text>

      {forcePerMember > 0 && (
        <Text position={[0, H * 0.5, depth / 2 + 0.3]} fontSize={0.09} color="#fbbf24" anchorX="center">
          {`N_Ed = ${forcePerMember.toFixed(1)} kN/member`}
        </Text>
      )}

      {/* STATUS / UTILISATION */}
      <Text
        position={[0, H + 0.65, 0]}
        fontSize={0.16}
        color={status === 'FAIL' ? '#ef4444' : util > 90 ? '#f97316' : '#22c55e'}
        anchorX="center"
      >
        {status} — {util.toFixed(0)}%
      </Text>

      {nPanels > 1 && (
        <Text position={[0, -0.55, 0]} fontSize={0.08} color="#94a3b8" anchorX="center">
          {nPanels} panels × {panelW.toFixed(1)} m
        </Text>
      )}

      {/* GLOW RING */}
      <GlowRing status={status} radius={ringR} utilisation={util} />
    </group>
  );
}
