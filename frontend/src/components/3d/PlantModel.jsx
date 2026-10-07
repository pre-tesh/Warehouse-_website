/**
 * PlantModel.jsx
 * Procedural plant model: stem + leaves built from Three.js primitives.
 *
 * Behaviours driven by sensor data:
 *   • Idle sway animation (always running via useFrame)
 *   • Leaf droop angle increases when soil/temp out of range (plant stress)
 *   • Leaf color shifts from healthy green → yellow/brown under sustained stress
 *   • All transitions are lerped smoothly — no sudden jumps
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Color constants ───────────────────────────────────────────────────────────
const HEALTHY_LEAF_COLOR = new THREE.Color('#4a9e5c');
const STRESSED_LEAF_COLOR = new THREE.Color('#8b7332');
const STEM_COLOR = new THREE.Color('#2d6a35');

export function PlantModel({ evaluation, latest, profile }) {
  const groupRef    = useRef();
  const leaf1Ref    = useRef();
  const leaf2Ref    = useRef();
  const leaf3Ref    = useRef();
  const leaf4Ref    = useRef();
  const leaf5Ref    = useRef();
  const leaf6Ref    = useRef();

  // Lerped stress level (0 = healthy, 1 = very stressed)
  const stressRef   = useRef(0);
  const timeRef     = useRef(0);

  // Compute target stress from evaluation
  function getTargetStress() {
    if (!evaluation) return 0;
    let stressCount = 0;
    if (evaluation.soil.status !== 'ok')     stressCount += 1.0; // soil is most critical
    if (evaluation.temp.status !== 'ok')     stressCount += 0.7;
    if (evaluation.humidity.status !== 'ok') stressCount += 0.4;
    if (evaluation.lux.status !== 'ok')      stressCount += 0.3;
    return Math.min(stressCount / 2.4, 1); // normalise to 0-1
  }

  useFrame((state, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // ── Lerp stress level toward target ──────────────────────────────────────
    const targetStress = getTargetStress();
    stressRef.current = THREE.MathUtils.lerp(stressRef.current, targetStress, delta * 0.3);
    const stress = stressRef.current;

    // ── Idle sway: gentle sinusoidal rotation of the whole plant ─────────────
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.6) * 0.04 + Math.sin(t * 0.25) * 0.02;
      groupRef.current.rotation.x = Math.cos(t * 0.45) * 0.02;
    }

    // ── Leaf droop: leaves hang down more when stressed ───────────────────────
    const droopAngle = stress * 0.6; // max 0.6 rad droop

    // Update leaf colors (lerp between healthy green and stressed yellow/brown)
    const currentColor = new THREE.Color().lerpColors(HEALTHY_LEAF_COLOR, STRESSED_LEAF_COLOR, stress);

    const leaves = [leaf1Ref, leaf2Ref, leaf3Ref, leaf4Ref, leaf5Ref, leaf6Ref];
    leaves.forEach((ref, i) => {
      if (!ref.current) return;
      if (ref.current.material) {
        ref.current.material.color.lerp(currentColor, delta * 0.5);
      }
      // Alternate droop directions for natural look
      const side = i % 2 === 0 ? 1 : -1;
      const leafDroop = droopAngle + Math.sin(t * 0.5 + i) * 0.03;
      ref.current.rotation.z = THREE.MathUtils.lerp(
        ref.current.rotation.z,
        side * (Math.PI / 6 + leafDroop),
        delta * 1.5
      );
    });
  });

  return (
    <group ref={groupRef} position={[0, -1.5, 0]}>
      {/* ── Pot ──────────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.25, 0.5, 8]} />
        <meshStandardMaterial color="#4a2e0d" roughness={0.9} />
      </mesh>
      {/* Pot rim */}
      <mesh position={[0, 0.52, 0]}>
        <torusGeometry args={[0.36, 0.04, 8, 16]} />
        <meshStandardMaterial color="#5a3810" roughness={0.85} />
      </mesh>
      {/* Soil surface */}
      <mesh position={[0, 0.51, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.33, 12]} />
        <meshStandardMaterial color="#1a0d05" roughness={1} />
      </mesh>

      {/* ── Main stem ────────────────────────────────────────────────────── */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 1.4, 8]} />
        <meshStandardMaterial color={STEM_COLOR} roughness={0.8} />
      </mesh>

      {/* ── Mid-stem ─────────────────────────────────────────────────────── */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.6, 8]} />
        <meshStandardMaterial color={STEM_COLOR} roughness={0.8} />
      </mesh>

      {/* ── Leaves — procedural elliptic planes ──────────────────────────── */}
      {/* Pair 1 (low) */}
      <LeafMesh ref={leaf1Ref} position={[0.3, 1.05, 0.1]}  rotation={[0.2, 0.3, Math.PI/6]}  />
      <LeafMesh ref={leaf2Ref} position={[-0.3, 1.05, -0.1]} rotation={[0.2, -0.3, -Math.PI/6]} />

      {/* Pair 2 (mid) */}
      <LeafMesh ref={leaf3Ref} position={[0.28, 1.55, 0.1]}  rotation={[0.15, 0.5, Math.PI/5.5]} scale={0.9} />
      <LeafMesh ref={leaf4Ref} position={[-0.28, 1.55, -0.1]} rotation={[0.15, -0.5, -Math.PI/5.5]} scale={0.9} />

      {/* Pair 3 (top) */}
      <LeafMesh ref={leaf5Ref} position={[0.18, 2.05, 0.05]} rotation={[0.1, 0.4, Math.PI/7]} scale={0.7} />
      <LeafMesh ref={leaf6Ref} position={[-0.18, 2.05, -0.05]} rotation={[0.1, -0.4, -Math.PI/7]} scale={0.7} />

      {/* ── Apical bud (tiny sphere at top) ──────────────────────────────── */}
      <mesh position={[0, 2.35, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#3d8a48" roughness={0.7} />
      </mesh>
    </group>
  );
}

import { forwardRef } from 'react';

// eslint-disable-next-line react/display-name
const LeafMesh = forwardRef(({ position, rotation, scale = 1 }, ref) => {
  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale} castShadow>
      {/* Ellipse approximated by a scaled sphere squashed flat */}
      <sphereGeometry args={[0.28, 8, 6]} />
      <meshStandardMaterial
        color={HEALTHY_LEAF_COLOR}
        roughness={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});
