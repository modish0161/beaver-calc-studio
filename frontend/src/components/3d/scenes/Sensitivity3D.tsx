// =============================================================================
// 3D Scene: Sensitivity Analysis — Monte Carlo Probabilistic Visualization
// Shows a structural beam surrounded by a distribution particle cloud,
// tornado sensitivity bars, reliability gauge, and scatter points
// =============================================================================

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '../BillboardText';

export interface Sensitivity3DProps {
  calculatorType?: string;
  mean?: number;
  stdDev?: number;
  percentile95?: number;
  reliabilityIndex?: number;
  targetReliability?: number;
  probabilityOfFailure?: number;
  sensitivities?: { parameter: string; correlation: number; rank: number }[];
  histogram?: { bin: number; count: number }[];
  simCount?: number;
  status?: 'PASS' | 'FAIL';
}

// ─── Colour helpers ─────────────────────────────────────────────────────────
function utilColor(u: number): string {
  if (u > 100) return '#ff4444';
  if (u > 85) return '#ffaa00';
  if (u > 60) return '#22d3ee';
  return '#00ff88';
}

function betaColor(beta: number, target: number): string {
  if (beta >= target) return '#22c55e';
  if (beta >= target * 0.8) return '#f59e0b';
  return '#ef4444';
}

// ─── Animated glow ring ─────────────────────────────────────────────────────
function GlowRing({ radius, color, y = -0.01 }: { radius: number; color: string; y?: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * 0.2;
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 1.5) * 0.2;
    }
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, y, 0]}>
      <torusGeometry args={[radius, 0.02, 16, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.5} />
    </mesh>
  );
}

// ─── Ground plane ───────────────────────────────────────────────────────────
function Ground({ width, y = -0.05 }: { width: number; y?: number }) {
  return (
    <mesh position={[0, y, 0]} receiveShadow>
      <boxGeometry args={[width, 0.06, width * 0.6]} />
      <meshStandardMaterial color="#1a1f3a" roughness={1} />
    </mesh>
  );
}

// ─── Distribution particle cloud ────────────────────────────────────────────
function DistributionCloud({
  histogram,
  maxBin,
  baseY,
  color,
}: {
  histogram: { bin: number; count: number }[];
  maxBin: number;
  baseY: number;
  color: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const particles = useMemo(() => {
    const pts: { pos: [number, number, number]; scale: number; col: string }[] = [];
    if (!histogram || histogram.length === 0) return pts;

    const binMin = histogram[0].bin;
    const binMax = histogram[histogram.length - 1].bin;
    const range = binMax - binMin || 1;

    histogram.forEach((h) => {
      const normalizedX = ((h.bin - binMin) / range - 0.5) * 6;
      const height = (h.count / (maxBin || 1)) * 2.5;
      const numPts = Math.max(1, Math.ceil(h.count / (maxBin / 10)));

      for (let i = 0; i < numPts; i++) {
        const jitterX = (Math.random() - 0.5) * 0.25;
        const jitterY = Math.random() * height;
        const jitterZ = (Math.random() - 0.5) * 0.8;
        const ptColor = h.bin > 100 ? '#ef4444' : h.bin > 85 ? '#f59e0b' : color;
        pts.push({
          pos: [normalizedX + jitterX, baseY + jitterY + 0.1, jitterZ],
          scale: 0.03 + Math.random() * 0.02,
          col: ptColor,
        });
      }
    });
    return pts;
  }, [histogram, maxBin, baseY, color]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      const c = new THREE.Color(p.col);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [particles]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.pos[0],
        p.pos[1] + Math.sin(t * 0.8 + i * 0.1) * 0.03,
        p.pos[2],
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  if (particles.length === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, particles.length]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        vertexColors
        emissive="#6366f1"
        emissiveIntensity={0.3}
        transparent
        opacity={0.7}
      />
      <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
    </instancedMesh>
  );
}

// ─── Compact number formatter for 3D labels ────────────────────────────────
function fmt3D(v: number, dp = 1): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(v / 1_000).toFixed(1)}k`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(2)}k`;
  return v.toFixed(dp);
}

// ─── 3D Tornado / Sensitivity Bars ──────────────────────────────────────────
function TornadoBars({
  sensitivities,
  baseY,
}: {
  sensitivities: { parameter: string; correlation: number; rank: number }[];
  baseY: number;
}) {
  if (!sensitivities || sensitivities.length === 0) return null;

  const barHeight = 0.16;
  const gap = 0.05;
  const maxWidth = 1.2;
  const startZ = 1.8;

  return (
    <group position={[-2.2, baseY, startZ]}>
      <Text position={[0.4, (sensitivities.length * (barHeight + gap)) / 2 + 0.25, 0]} fontSize={0.12} color="#a5b4fc" anchorX="center">
        Sensitivity Ranking
      </Text>
      {sensitivities.slice(0, 8).map((s, i) => {
        const width = Math.max(0.08, s.correlation * maxWidth);
        const y = (sensitivities.length - 1 - i) * (barHeight + gap);
        const hue = i === 0 ? '#6366f1' : i < 3 ? '#818cf8' : '#94a3b8';

        return (
          <group key={i} position={[0, y, 0]}>
            {/* Bar */}
            <mesh position={[width / 2 + 0.65, 0, 0]}>
              <boxGeometry args={[width, barHeight, 0.12]} />
              <meshStandardMaterial
                color={hue}
                emissive={hue}
                emissiveIntensity={0.3}
                transparent
                opacity={0.85}
              />
            </mesh>
            {/* Label */}
            <Text position={[0.55, 0, 0]} fontSize={0.08} color="#94a3b8" anchorX="right">
              {s.parameter.length > 12 ? s.parameter.slice(0, 11) + '…' : s.parameter}
            </Text>
            {/* Value */}
            <Text position={[width + 0.8, 0, 0]} fontSize={0.07} color="#e2e8f0" anchorX="left">
              {(s.correlation * 100).toFixed(0)}%
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// ─── Reliability gauge arc ──────────────────────────────────────────────────
function ReliabilityGauge({
  beta,
  target,
  y,
}: {
  beta: number;
  target: number;
  y: number;
}) {
  const col = betaColor(beta, target);
  const fillAngle = Math.min(1, Math.max(0, beta / 6)) * Math.PI;

  const arcGeo = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, 0.8, 0.8, 0, Math.PI, false, 0);
    const points = curve.getPoints(32);
    return new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, p.y, 0)),
    );
  }, []);

  const fillGeo = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, 0.8, 0.8, 0, fillAngle, false, 0);
    const points = curve.getPoints(32);
    return new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, p.y, 0)),
    );
  }, [fillAngle]);

  return (
    <group position={[2.5, y + 0.6, 1.8]}>
      <Text position={[0, 1.0, 0]} fontSize={0.12} color="#a5b4fc" anchorX="center">
        Reliability Index β
      </Text>
      {/* Background arc */}
      <primitive object={new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: '#374151' }))} />
      {/* Fill arc */}
      <primitive object={new THREE.Line(fillGeo, new THREE.LineBasicMaterial({ color: col }))} />
      {/* Value */}
      <Text position={[0, 0.25, 0]} fontSize={0.24} color={col} anchorX="center">
        {beta.toFixed(2)}
      </Text>
      {/* Target */}
      <Text position={[0, -0.05, 0]} fontSize={0.09} color="#64748b" anchorX="center">
        {`Target: ${target.toFixed(1)}`}
      </Text>
      {/* Status */}
      <Text position={[0, -0.22, 0]} fontSize={0.10} color={col} anchorX="center">
        {beta >= target ? '✓ ADEQUATE' : '✗ BELOW TARGET'}
      </Text>
    </group>
  );
}

// ─── Structural beam representation ─────────────────────────────────────────
function StructuralBeam({
  calculatorType,
  color,
  emissive,
  length,
  beamY,
}: {
  calculatorType: string;
  color: string;
  emissive: string;
  length: number;
  beamY: number;
}) {
  const isFoundation = calculatorType.includes('footing') || calculatorType.includes('pile');
  const isGeotech = calculatorType.includes('sheet');
  const h = isFoundation ? 0.15 : 0.35;
  const w = isFoundation ? 1.2 : 0.35;

  if (isFoundation) {
    return (
      <group position={[0, beamY, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.15, 1.2]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.15} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.3, 0.55, 0.3]} />
          <meshStandardMaterial color="#64748b" emissive={emissive} emissiveIntensity={0.08} roughness={0.7} />
        </mesh>
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(1.2, 0.15, 1.2)]} />
          <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
        </lineSegments>
      </group>
    );
  }

  if (isGeotech) {
    return (
      <group position={[0, beamY, 0]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} position={[(i - 2) * 0.22, 0, 0]} castShadow>
            <boxGeometry args={[0.18, 1.6, 0.04]} />
            <meshStandardMaterial color="#78716c" emissive={emissive} emissiveIntensity={0.1} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        {/* Soil */}
        <mesh position={[0, 0.6, 0.3]}>
          <boxGeometry args={[1.5, 1.0, 0.5]} />
          <meshStandardMaterial color="#92400e" emissive="#92400e" emissiveIntensity={0.03} roughness={1} transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }

  // Default: beam
  return (
    <group position={[0, beamY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[length, h, w]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.15} metalness={0.6} roughness={0.3} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(length, h, w)]} />
        <lineBasicMaterial color="#00d9ff" transparent opacity={0.4} />
      </lineSegments>
      {/* Supports */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (length / 2 - 0.15), -h / 2 - 0.15, 0]}>
          <mesh>
            <coneGeometry args={[0.12, 0.22, 3]} />
            <meshStandardMaterial color="#94a3b8" emissive="#94a3b8" emissiveIntensity={0.15} />
          </mesh>
        </group>
      ))}
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
        <boxGeometry args={[len, 0.006, 0.006]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {[start, end].map((x, i) => (
        <mesh key={i} position={[x, y, 0]}>
          <boxGeometry args={[0.006, 0.1, 0.006]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      ))}
      <Text position={[mid, y - 0.12, 0]} fontSize={0.11} color={color} anchorX="center">
        {label}
      </Text>
    </group>
  );
}

// ─── Scatter point cloud (results) ──────────────────────────────────────────
function ScatterCloud({
  mean,
  stdDev,
  simCount,
  baseY,
}: {
  mean: number;
  stdDev: number;
  simCount: number;
  baseY: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const numPts = Math.min(200, simCount);

  const particles = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < numPts; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
      const val = mean + z * stdDev;
      const x = ((val - mean) / (stdDev * 3 || 1)) * 2;
      const y = baseY + Math.random() * 2;
      const zPos = (Math.random() - 0.5) * 1.5;
      pts.push([x, y, zPos]);
    }
    return pts;
  }, [mean, stdDev, numPts, baseY]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(p[0], p[1] + Math.sin(t * 0.5 + i * 0.3) * 0.02, p[2]);
      dummy.scale.setScalar(0.025);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, numPts]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={0.5} transparent opacity={0.4} />
    </instancedMesh>
  );
}

// ─── Gaussian bell curve wireframe ──────────────────────────────────────────
function GaussianCurve({
  mean,
  stdDev,
  baseY,
  color = '#00d9ff',
  width = 6,
}: {
  mean: number;
  stdDev: number;
  baseY: number;
  color?: string;
  width?: number;
}) {
  const curveGeo = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const numPts = 60;
    const halfW = width / 2;
    for (let i = 0; i <= numPts; i++) {
      const t = (i / numPts) * 2 - 1; // -1 to 1
      const x = t * halfW;
      const sigma = (stdDev / mean) * halfW || 1;
      const gauss = Math.exp(-0.5 * (t * halfW / sigma) ** 2);
      points.push(new THREE.Vector3(x, baseY + gauss * 2.5, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [mean, stdDev, baseY, width]);

  const fillPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const numPts = 60;
    const halfW = width / 2;
    // Bottom edge
    for (let i = 0; i <= numPts; i++) {
      const t = (i / numPts) * 2 - 1;
      pts.push(new THREE.Vector3(t * halfW, baseY, 0));
    }
    // Top edge (reversed for fill)
    for (let i = numPts; i >= 0; i--) {
      const t = (i / numPts) * 2 - 1;
      const x = t * halfW;
      const sigma = (stdDev / mean) * halfW || 1;
      const gauss = Math.exp(-0.5 * (t * halfW / sigma) ** 2);
      pts.push(new THREE.Vector3(x, baseY + gauss * 2.5, 0));
    }
    return pts;
  }, [mean, stdDev, baseY, width]);

  const shapeGeo = useMemo(() => {
    const shape = new THREE.Shape();
    fillPoints.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [fillPoints]);

  return (
    <group>
      {/* Filled area */}
      <mesh geometry={shapeGeo}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Curve outline */}
      <primitive object={new THREE.Line(curveGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }))} />
    </group>
  );
}

// ─── Animated floating label ────────────────────────────────────────────────
function FloatingLabel({
  position,
  text,
  color,
  fontSize = 0.12,
}: {
  position: [number, number, number];
  text: string;
  color: string;
  fontSize?: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.2) * 0.04;
    }
  });
  return (
    <group ref={ref} position={position}>
      <Text position={[0, 0, 0]} fontSize={fontSize} color={color} anchorX="center">
        {text}
      </Text>
    </group>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export default function Sensitivity3D({
  calculatorType = 'steel_beam',
  mean = 65,
  stdDev = 12,
  percentile95 = 85,
  reliabilityIndex = 3.5,
  targetReliability = 3.8,
  probabilityOfFailure = 2,
  sensitivities = [],
  histogram = [],
  simCount = 1000,
  status = 'PASS',
}: Sensitivity3DProps) {
  const beamLen = 4;
  const half = beamLen / 2;
  const groundY = -0.1;
  const beamY = 0.6;

  const uCol = utilColor(mean);
  const maxBin = Math.max(...(histogram.map((h) => h.count).concat([1])));
  const hasSensitivities = sensitivities.length > 0;
  const hasHistogram = histogram.length > 0;

  return (
    <group>
      {/* Structural beam */}
      <StructuralBeam
        calculatorType={calculatorType}
        color="#4b5563"
        emissive={uCol}
        length={beamLen}
        beamY={beamY}
      />

      {/* Dimension line */}
      <DimensionLine start={-half} end={half} y={groundY - 0.3} label={`${simCount.toLocaleString()} simulations`} />

      {/* Distribution cloud from histogram */}
      {hasHistogram && (
        <DistributionCloud
          histogram={histogram}
          maxBin={maxBin}
          baseY={beamY + 0.5}
          color="#22d3ee"
        />
      )}

      {/* Gaussian bell curve wireframe */}
      {(hasHistogram || simCount > 0) && (
        <GaussianCurve
          mean={mean}
          stdDev={stdDev}
          baseY={beamY + 0.5}
          color="#00d9ff"
          width={5}
        />
      )}

      {/* Scatter result particles */}
      {!hasHistogram && simCount > 0 && (
        <ScatterCloud mean={mean} stdDev={stdDev} simCount={simCount} baseY={beamY + 0.5} />
      )}

      {/* Tornado bars */}
      {hasSensitivities && (
        <TornadoBars sensitivities={sensitivities} baseY={groundY + 0.2} />
      )}

      {/* Reliability gauge */}
      <ReliabilityGauge beta={reliabilityIndex} target={targetReliability} y={groundY + 0.2} />

      {/* Mean utilisation — floating label */}
      <FloatingLabel
        position={[-1.2, beamY + 3.3, 0]}
        text={`μ = ${fmt3D(mean)}%`}
        color={uCol}
        fontSize={0.15}
      />
      <FloatingLabel
        position={[1.2, beamY + 3.3, 0]}
        text={`σ = ${fmt3D(stdDev)}%`}
        color="#a5b4fc"
        fontSize={0.15}
      />

      {/* P95 & Pf markers */}
      <FloatingLabel
        position={[-1.2, beamY + 2.95, 0]}
        text={`P95 = ${fmt3D(percentile95)}%`}
        color="#f59e0b"
        fontSize={0.11}
      />
      <FloatingLabel
        position={[1.2, beamY + 2.95, 0]}
        text={`Pf = ${probabilityOfFailure > 99.99 ? '100' : probabilityOfFailure.toFixed(2)}%`}
        color={probabilityOfFailure > 5 ? '#ef4444' : '#22d3ee'}
        fontSize={0.11}
      />

      {/* Status badge — glowing */}
      <group position={[half + 0.4, beamY + 0.5, 0]}>
        <mesh>
          <planeGeometry args={[0.65, 0.25]} />
          <meshStandardMaterial
            color={status === 'PASS' ? '#22c55e' : '#ef4444'}
            emissive={status === 'PASS' ? '#22c55e' : '#ef4444'}
            emissiveIntensity={0.4}
            transparent
            opacity={0.15}
          />
        </mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.12} color={status === 'PASS' ? '#22c55e' : '#ef4444'} anchorX="center">
          {status}
        </Text>
      </group>

      {/* Design code badge */}
      <Text position={[0, beamY + 3.7, 0]} fontSize={0.13} color="#00d9ff" anchorX="center">
        Monte Carlo — Probabilistic Assessment
      </Text>
      <Text position={[0, beamY + 3.45, 0]} fontSize={0.09} color="#64748b" anchorX="center">
        {`β = ${reliabilityIndex.toFixed(2)} / ${targetReliability.toFixed(2)} target`}
      </Text>

      {/* Glow ring */}
      <GlowRing radius={half + 0.5} color={uCol} y={groundY + 0.01} />

      {/* Ground */}
      <Ground width={beamLen + 2.5} y={groundY} />

      {/* 100% threshold plane — dashed line effect */}
      <mesh position={[0, beamY + 2.0, 0]}>
        <planeGeometry args={[5.5, 0.015]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} transparent opacity={0.25} />
      </mesh>
      <mesh position={[0, beamY + 2.0, 0]}>
        <planeGeometry args={[5.5, 0.08]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.15} transparent opacity={0.04} />
      </mesh>
      <Text position={[2.9, beamY + 2.08, 0]} fontSize={0.09} color="#ef4444" anchorX="left">
        100% limit
      </Text>

      {/* Y-axis labels for distribution */}
      <Text position={[-2.9, beamY + 0.5, 0]} fontSize={0.07} color="#475569" anchorX="right">
        0%
      </Text>
      <Text position={[-2.9, beamY + 1.25, 0]} fontSize={0.07} color="#475569" anchorX="right">
        50%
      </Text>
      <Text position={[-2.9, beamY + 2.0, 0]} fontSize={0.07} color="#475569" anchorX="right">
        100%
      </Text>
      <Text position={[-2.9, beamY + 2.75, 0]} fontSize={0.07} color="#475569" anchorX="right">
        150%
      </Text>
    </group>
  );
}
