/**
 * GreenhouseStructure.jsx
 * Low-poly greenhouse: glass walls with grid panes, peaked roof, door.
 * Glass opacity and tint react to humidity via humidityNorm prop.
 */
import { useRef } from 'react';
import * as THREE from 'three';

// Helper: create a glass pane mesh
function GlassPane({ position, rotation, width, height, humidityNorm }) {
  const meshRef = useRef();
  // Tint toward soft mist blue at high humidity (condensation effect)
  const color   = new THREE.Color().lerpColors(
    new THREE.Color('#cce5d0'), // crisp clear green-mint at low humidity
    new THREE.Color('#b3d9e8'), // foggy soft blue at high humidity
    humidityNorm
  );
  const opacity = 0.22 + humidityNorm * 0.25;

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} castShadow>
      <planeGeometry args={[width, height]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.05}
        metalness={0.1}
        transmission={0.7}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Helper: draw a grid of thin bars (the window pane dividers)
function GridBars({ position, rotation, width, height, cols = 3, rows = 2 }) {
  const bars = [];
  const barColor = '#2d5a35';
  const barThickness = 0.04;

  // Horizontal bars
  for (let r = 0; r <= rows; r++) {
    const y = -height / 2 + (r / rows) * height;
    bars.push(
      <mesh key={`h${r}`} position={[position[0], position[1] + y, position[2]]} rotation={rotation}>
        <boxGeometry args={[width, barThickness, barThickness]} />
        <meshStandardMaterial color={barColor} roughness={0.4} metalness={0.5} />
      </mesh>
    );
  }
  // Vertical bars
  for (let c = 0; c <= cols; c++) {
    const x = -width / 2 + (c / cols) * width;
    bars.push(
      <mesh key={`v${c}`} position={[position[0] + x, position[1], position[2]]} rotation={rotation}>
        <boxGeometry args={[barThickness, height, barThickness]} />
        <meshStandardMaterial color={barColor} roughness={0.4} metalness={0.5} />
      </mesh>
    );
  }
  return <group>{bars}</group>;
}

export function GreenhouseStructure({ humidityNorm = 0 }) {
  const W = 4;   // greenhouse width (X)
  const D = 6;   // greenhouse depth (Z)
  const H = 3;   // wall height
  const roofH = 1.8; // peak height above walls
  const frameColor = '#24482b'; // elegant botanical dark emerald frame

  return (
    <group position={[0, 0, 0]}>
      {/* ── Floor / raised bed ───────────────────────────────────────────── */}
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <boxGeometry args={[W + 0.35, 0.16, D + 0.35]} />
        <meshStandardMaterial color="#8c7355" roughness={0.9} />
      </mesh>

      {/* ── Front wall (glass + grid) ─────────────────────────────────────── */}
      <GlassPane position={[0, H/2 - 1.5, D/2]} rotation={[0, 0, 0]} width={W} height={H} humidityNorm={humidityNorm} />
      <GridBars  position={[0, H/2 - 1.5, D/2 + 0.01]} rotation={[0, 0, 0]} width={W} height={H} cols={4} rows={3} />

      {/* ── Back wall ─────────────────────────────────────────────────────── */}
      <GlassPane position={[0, H/2 - 1.5, -D/2]} rotation={[0, Math.PI, 0]} width={W} height={H} humidityNorm={humidityNorm} />
      <GridBars  position={[0, H/2 - 1.5, -D/2 - 0.01]} rotation={[0, Math.PI, 0]} width={W} height={H} cols={4} rows={3} />

      {/* ── Left wall ─────────────────────────────────────────────────────── */}
      <GlassPane position={[-W/2, H/2 - 1.5, 0]} rotation={[0, Math.PI/2, 0]} width={D} height={H} humidityNorm={humidityNorm} />
      <GridBars  position={[-W/2 - 0.01, H/2 - 1.5, 0]} rotation={[0, Math.PI/2, 0]} width={D} height={H} cols={5} rows={3} />

      {/* ── Right wall ────────────────────────────────────────────────────── */}
      <GlassPane position={[W/2, H/2 - 1.5, 0]} rotation={[0, -Math.PI/2, 0]} width={D} height={H} humidityNorm={humidityNorm} />
      <GridBars  position={[W/2 + 0.01, H/2 - 1.5, 0]} rotation={[0, -Math.PI/2, 0]} width={D} height={H} cols={5} rows={3} />

      {/* ── Peaked roof panels (two angled glass planes) ─────────────────── */}
      <RoofPanel humidityNorm={humidityNorm} W={W} D={D} roofH={roofH} H={H} side="left" />
      <RoofPanel humidityNorm={humidityNorm} W={W} D={D} roofH={roofH} H={H} side="right" />

      {/* ── Door frame (front center) ─────────────────────────────────────── */}
      <DoorFrame position={[0, -0.2, D/2 + 0.05]} />

      {/* ── Structural corner posts ───────────────────────────────────────── */}
      {[[-W/2, -D/2], [-W/2, D/2], [W/2, -D/2], [W/2, D/2]].map(([x, z], i) => (
        <mesh key={i} position={[x, H/2 - 1.5, z]} castShadow>
          <boxGeometry args={[0.09, H, 0.09]} />
          <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}

      {/* ── Ridge beam along the roof peak ───────────────────────────────── */}
      <mesh position={[0, H - 1.5 + roofH - 0.05, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, D]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

function RoofPanel({ humidityNorm, W, D, roofH, H, side }) {
  const sign   = side === 'left' ? -1 : 1;
  const angle  = Math.atan2(roofH, W / 2);
  const panelW = Math.sqrt((W / 2) ** 2 + roofH ** 2);
  const xOff   = sign * W / 4;
  const yPos   = H - 1.5 + roofH / 2;

  return (
    <>
      <mesh position={[xOff, yPos, 0]} rotation={[0, 0, -sign * angle]} castShadow>
        <planeGeometry args={[panelW, D]} />
        <meshPhysicalMaterial
          color={new THREE.Color().lerpColors(new THREE.Color('#cce5d0'), new THREE.Color('#b3d9e8'), humidityNorm)}
          transparent
          opacity={0.25 + humidityNorm * 0.2}
          roughness={0.05}
          metalness={0.1}
          transmission={0.65}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Roof grid */}
      {[-D/3, 0, D/3].map((z, i) => (
        <mesh key={i} position={[xOff, yPos, z]} rotation={[0, 0, -sign * angle]}>
          <boxGeometry args={[panelW, 0.04, 0.04]} />
          <meshStandardMaterial color="#24482b" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </>
  );
}

function DoorFrame({ position }) {
  const color = '#24482b';
  return (
    <group position={position}>
      {/* Door opening (glass tint) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 1.8, 0.02]} />
        <meshStandardMaterial color="#a5d6a7" transparent opacity={0.3} roughness={0.2} />
      </mesh>
      {/* Door frame sides */}
      <mesh position={[-0.42, 0, 0.01]}>
        <boxGeometry args={[0.06, 1.8, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0.42, 0, 0.01]}>
        <boxGeometry args={[0.06, 1.8, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Door top bar */}
      <mesh position={[0, 0.93, 0.01]}>
        <boxGeometry args={[0.9, 0.06, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}
