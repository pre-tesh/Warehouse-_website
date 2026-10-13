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

export function GreenhouseStructure({ humidityNorm = 0 }) {
  const W = 4.4;      // greenhouse width (X)
  const D = 6.2;      // greenhouse depth (Z)
  const H = 3.1;      // wall height
  const roofH = 1.7;  // peak height above walls
  const frameColor = '#1d3827';

  return (
    <group position={[0, 0, 0]}>
      {/* ── Floor / raised bed ───────────────────────────────────────────── */}
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <boxGeometry args={[W + 0.35, 0.16, D + 0.35]} />
        <meshStandardMaterial color="#8c7355" roughness={0.9} />
      </mesh>

      {/* ── Simple glass walls — no heavy grid divisions ───────────────── */}
      <GlassPane position={[0, H/2 - 1.5, D/2]} rotation={[0, 0, 0]} width={W - 0.1} height={H} humidityNorm={humidityNorm} />
      <GlassPane position={[0, H/2 - 1.5, -D/2]} rotation={[0, Math.PI, 0]} width={W - 0.1} height={H} humidityNorm={humidityNorm} />
      <GlassPane position={[-W/2, H/2 - 1.5, 0]} rotation={[0, Math.PI/2, 0]} width={D} height={H} humidityNorm={humidityNorm} />
      <GlassPane position={[W/2, H/2 - 1.5, 0]} rotation={[0, -Math.PI/2, 0]} width={D} height={H} humidityNorm={humidityNorm} />

      {/* ── Roof panels ───────────────────────────────────────────────────── */}
      <RoofPanel humidityNorm={humidityNorm} W={W} D={D} roofH={roofH} H={H} side="left" />
      <RoofPanel humidityNorm={humidityNorm} W={W} D={D} roofH={roofH} H={H} side="right" />

      {/* ── Minimal front door frame ─────────────────────────────────────── */}
      <DoorFrame position={[0, -0.2, D/2 + 0.05]} />

      {/* ── Four simple structural posts at the corners ─────────────────── */}
      {[[-W/2, -D/2], [-W/2, D/2], [W/2, -D/2], [W/2, D/2]].map(([x, z], i) => (
        <mesh key={i} position={[x, H/2 - 1.5, z]} castShadow>
          <boxGeometry args={[0.08, H, 0.08]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}

      {/* ── Roof ridge beam ───────────────────────────────────────────────── */}
      <mesh position={[0, H - 1.5 + roofH - 0.06, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, D - 0.4]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

function RoofPanel({ humidityNorm, W, D, roofH, H, side }) {
  const sign     = side === 'left' ? -1 : 1;
  const angle    = Math.atan2(roofH, W / 2);
  const panelW   = Math.sqrt((W / 2) ** 2 + roofH ** 2);
  const panelLen = D - 0.2;
  const yPos     = H - 1.5 + roofH * 0.58;
  const zPos     = 0;

  return (
    <>
      <mesh position={[-sign * (W / 4), yPos, zPos]} rotation={[0, 0, sign * angle]} castShadow>
        <boxGeometry args={[panelW, 0.04, panelLen]} />
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
        <mesh key={i} position={[-sign * (W / 4), yPos, z]} rotation={[0, 0, sign * angle]}>
          <boxGeometry args={[panelW, 0.02, 0.04]} />
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
