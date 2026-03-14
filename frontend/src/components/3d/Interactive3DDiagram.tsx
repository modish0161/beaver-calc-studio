// =============================================================================
// Interactive 3D Diagram — Reusable wrapper for all calculator visualizations
// Uses @react-three/fiber + @react-three/drei
// =============================================================================

import { Grid, OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import React, { Suspense, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Diagram3DProps {
  children: React.ReactNode;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  height?: string;
  enablePan?: boolean;
  enableZoom?: boolean;
  maxDistance?: number;
  minDistance?: number;
  showGrid?: boolean;
  gridSize?: number;
  status?: 'PASS' | 'FAIL' | null;
}

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-cyan-400 text-sm font-mono">Loading 3D…</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Engineering Grid Floor
// ---------------------------------------------------------------------------
function EngineeringGrid({ size = 20 }: { size?: number }) {
  return (
    <Grid
      args={[size, size]}
      position={[0, -0.01, 0]}
      cellSize={0.5}
      cellThickness={0.5}
      cellColor="#1e3a5f"
      sectionSize={2}
      sectionThickness={1}
      sectionColor="#00d9ff"
      fadeDistance={size * 1.5}
      fadeStrength={1}
      infiniteGrid
    />
  );
}

// ---------------------------------------------------------------------------
// Axis Indicator
// ---------------------------------------------------------------------------
function AxisIndicator() {
  return (
    <group position={[-4, 0, -4]}>
      {/* X axis - red */}
      <mesh position={[0.5, 0, 0]}>
        <boxGeometry args={[1, 0.02, 0.02]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[1.15, 0, 0]} fontSize={0.18} color="#ef4444" anchorX="center">
        X
      </Text>
      {/* Y axis - green */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.02, 1, 0.02]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, 1.15, 0]} fontSize={0.18} color="#22c55e" anchorX="center">
        Y
      </Text>
      {/* Z axis - blue */}
      <mesh position={[0, 0, 0.5]}>
        <boxGeometry args={[0.02, 0.02, 1]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, 0, 1.15]} fontSize={0.18} color="#3b82f6" anchorX="center">
        Z
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Dimension Line (reusable for all diagrams)
// ---------------------------------------------------------------------------
export function DimensionLine({
  start,
  end,
  label,
  offset = 0.3,
  color = '#94a3b8',
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  offset?: number;
  color?: string;
}) {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const midZ = (start[2] + end[2]) / 2;

  return (
    <group>
      {/* Line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([...start, ...end])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={1} />
      </line>
      {/* Label */}
      <Text
        position={[midX + offset, midY + offset, midZ]}
        fontSize={0.2}
        color={color}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {label}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Status Badge (3D overlay)
// ---------------------------------------------------------------------------
function StatusBadge3D({ status }: { status: 'PASS' | 'FAIL' }) {
  return (
    <div
      className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider border ${
        status === 'PASS'
          ? 'bg-green-500/20 text-green-400 border-green-500/50'
          : 'bg-red-500/20 text-red-400 border-red-500/50'
      }`}
    >
      {status === 'PASS' ? '✓ PASS' : '✗ FAIL'}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls hint overlay
// ---------------------------------------------------------------------------
function ControlsHint() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900/80 border border-gray-700/50 text-gray-400 text-xs cursor-pointer hover:opacity-70 transition-opacity"
      onClick={() => setVisible(false)}
    >
      <span>🖱️ Drag to rotate · Scroll to zoom</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function Interactive3DDiagram({
  children,
  cameraPosition = [6, 4, 6],
  cameraTarget = [0, 0, 0],
  height = 'h-80',
  enablePan = true,
  enableZoom = true,
  maxDistance = 20,
  minDistance = 2,
  showGrid = true,
  gridSize = 20,
  status = null,
}: Diagram3DProps) {
  // Detect CSS values (px, %, vh, rem, em) vs Tailwind classes
  const isCssValue = /^\d|^\./.test(height) || /(%|px|vh|rem|em)$/.test(height);
  const containerClass = `relative ${isCssValue ? '' : height} w-full rounded-xl overflow-hidden border border-gray-700/50 bg-gray-950`;
  const containerStyle = isCssValue ? { height } : undefined;

  return (
    <div className={containerClass} style={containerStyle}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas shadows gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }} dpr={[1, 2]}>
          <color attach="background" args={['#0a0a1a']} />
          <fog attach="fog" args={['#0a0a1a', 15, 35]} />

          <PerspectiveCamera makeDefault position={cameraPosition} fov={50} />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[8, 12, 8]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#b026ff" />
          <pointLight position={[0, 6, 0]} intensity={0.5} color="#00d9ff" />

          {/* Controls */}
          <OrbitControls
            target={cameraTarget}
            enablePan={enablePan}
            enableZoom={enableZoom}
            maxDistance={maxDistance}
            minDistance={minDistance}
            maxPolarAngle={Math.PI / 2.05}
            autoRotate
            autoRotateSpeed={0.5}
          />

          {/* Grid */}
          {showGrid && <EngineeringGrid size={gridSize} />}

          {/* Axis */}
          <AxisIndicator />

          {/* Calculator-specific scene content */}
          {children}

          {/* Post-processing — subtle bloom for emissive highlights */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.5}
              luminanceSmoothing={0.9}
              intensity={0.6}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </Suspense>

      {/* Overlays */}
      {status && <StatusBadge3D status={status} />}
      <ControlsHint />
    </div>
  );
}
