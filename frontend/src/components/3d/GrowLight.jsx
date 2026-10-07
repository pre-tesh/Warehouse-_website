/**
 * GrowLight.jsx
 * The physical grow light fixture and Three.js light sources.
 *
 * Driven by actuatorState:
 *   light_on   → toggles visibility/intensity of spot + point lights
 *   brightness → maps 0-255 to light intensity (lerped smoothly)
 *   mode       → no visual difference, but shown in UI
 *
 * Uses useFrame to lerp all light properties for smooth transitions.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function GrowLight({ actuator }) {
  const spotRef  = useRef();
  const pointRef = useRef();
  const glowRef  = useRef(); // emissive sphere representing the bulb

  // Lerped intensity value (avoids snapping)
  const intensityRef = useRef(0);

  useFrame((_, delta) => {
    if (!spotRef.current || !pointRef.current) return;

    // Target intensity: 0 when off, 0.1–3.0 mapped from brightness 0-255
    const targetIntensity = actuator.light_on
      ? 0.5 + (actuator.brightness / 255) * 2.5
      : 0;

    // Smooth lerp toward target (0.06 factor = ~2 second transition)
    intensityRef.current = THREE.MathUtils.lerp(
      intensityRef.current,
      targetIntensity,
      delta * 2.5
    );

    const i = intensityRef.current;

    // SpotLight: warm amber-red grow-light color
    spotRef.current.intensity = i * 1.2;
    spotRef.current.color.set(i > 0.05 ? '#ffb347' : '#ffffff');

    // PointLight: softer fill
    pointRef.current.intensity = i * 0.6;
    pointRef.current.color.set('#ff9a2a');

    // Emissive glow on the bulb mesh
    if (glowRef.current?.material) {
      glowRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        glowRef.current.material.emissiveIntensity,
        i > 0.05 ? i * 0.8 : 0,
        delta * 3
      );
      glowRef.current.material.opacity = 0.4 + Math.min(i * 0.3, 0.5);
    }
  });

  const fixtureY  = 2.2; // height of the fixture inside the greenhouse
  const fixtureColor = '#1e3a20';

  return (
    <group position={[0, fixtureY, 0]}>
      {/* ── Fixture body (mounting bar) ─────────────────────────────────── */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.08, 0.2]} />
        <meshStandardMaterial color={fixtureColor} roughness={0.6} metalness={0.5} />
      </mesh>

      {/* ── Hanging cable ──────────────────────────────────────────────── */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
        <meshStandardMaterial color="#0d1a0f" roughness={0.9} />
      </mesh>

      {/* ── Bulb (emissive sphere) ──────────────────────────────────────── */}
      <mesh ref={glowRef} position={[0, -0.12, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color="#ffb347"
          emissive="#ff8c00"
          emissiveIntensity={0}
          transparent
          opacity={0.5}
          roughness={0.1}
        />
      </mesh>

      {/* ── LED indicator dots along fixture ──────────────────────────── */}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((x, i) => (
        <mesh key={i} position={[x, -0.05, 0]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial
            color="#ff4444"
            emissive="#ff0000"
            emissiveIntensity={actuator.light_on ? 1.5 : 0}
          />
        </mesh>
      ))}

      {/* ── SpotLight: main directional grow light ─────────────────────── */}
      <spotLight
        ref={spotRef}
        position={[0, 0, 0]}
        target-position={[0, -10, 0]}
        angle={0.7}
        penumbra={0.4}
        intensity={0}
        color="#ffb347"
        castShadow
        shadow-mapSize={[1024, 1024]}
        distance={8}
        decay={1.5}
      />

      {/* ── PointLight: ambient fill ───────────────────────────────────── */}
      <pointLight
        ref={pointRef}
        position={[0, -0.15, 0]}
        intensity={0}
        color="#ff9a2a"
        distance={5}
        decay={2}
      />
    </group>
  );
}
