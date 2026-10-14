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
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Keep the plant itself stable and natural; only the grow lights intensify and shift.
const HEALTHY_LEAF_COLOR = new THREE.Color('#4a9e5c');
const STEM_COLOR = new THREE.Color('#2d6a35');

export function PlantModel({ evaluation, latest, profile }) {
  const groupRef    = useRef();
  const leafRefs    = useRef([]);
  const stressRef   = useRef(0);
  const timeRef     = useRef(0);

  function getTargetStress() {
    if (!evaluation) return 0;
    let stressCount = 0;
    if (evaluation.soil.status !== 'ok')     stressCount += 1.0;
    if (evaluation.temp.status !== 'ok')     stressCount += 0.7;
    if (evaluation.humidity.status !== 'ok') stressCount += 0.4;
    if (evaluation.light.status !== 'ok')    stressCount += 0.3;
    return Math.min(stressCount / 2.4, 1);
  }

  useFrame((state, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const targetStress = getTargetStress();
    stressRef.current = THREE.MathUtils.lerp(stressRef.current, targetStress, delta * 0.3);
    const stress = stressRef.current;

    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.55) * 0.05 + Math.sin(t * 0.2) * 0.02;
      groupRef.current.rotation.x = Math.cos(t * 0.4) * 0.025;
    }

    const droopAngle = stress * 0.65;

    leafRefs.current.forEach((ref, i) => {
      if (!ref) return;

      const side = i % 2 === 0 ? 1 : -1;
      const leafDroop = droopAngle + Math.sin(t * 0.5 + i) * 0.04;
      ref.rotation.z = THREE.MathUtils.lerp(
        ref.rotation.z,
        side * (Math.PI / 6 + leafDroop),
        delta * 1.6
      );
    });
  });

  return (
    <group ref={groupRef} position={[0, -1.45, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.3, 0.56, 12]} />
        <meshStandardMaterial color="#4a2e0d" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.54, 0]}>
        <torusGeometry args={[0.38, 0.045, 10, 22]} />
        <meshStandardMaterial color="#5a3810" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 18]} />
        <meshStandardMaterial color="#1a0d05" roughness={1} />
      </mesh>

      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 1.6, 8]} />
        <meshStandardMaterial color={STEM_COLOR} roughness={0.8} />
      </mesh>

      <mesh position={[0, 1.95, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.7, 8]} />
        <meshStandardMaterial color={STEM_COLOR} roughness={0.8} />
      </mesh>

      <LeafMesh ref={(el) => { leafRefs.current[0] = el; }} position={[0.26, 1.0, 0.12]} rotation={[0.28, 0.35, Math.PI / 5]} scale={1.1} />
      <LeafMesh ref={(el) => { leafRefs.current[1] = el; }} position={[-0.26, 1.0, -0.12]} rotation={[0.28, -0.35, -Math.PI / 5]} scale={1.1} />
      <LeafMesh ref={(el) => { leafRefs.current[2] = el; }} position={[0.32, 1.5, 0.18]} rotation={[0.18, 0.5, Math.PI / 4.4]} scale={1.0} />
      <LeafMesh ref={(el) => { leafRefs.current[3] = el; }} position={[-0.32, 1.5, -0.18]} rotation={[0.18, -0.5, -Math.PI / 4.4]} scale={1.0} />
      <LeafMesh ref={(el) => { leafRefs.current[4] = el; }} position={[0.22, 2.05, 0.08]} rotation={[0.12, 0.4, Math.PI / 6]} scale={0.82} />
      <LeafMesh ref={(el) => { leafRefs.current[5] = el; }} position={[-0.22, 2.05, -0.08]} rotation={[0.12, -0.4, -Math.PI / 6]} scale={0.82} />
      <LeafMesh ref={(el) => { leafRefs.current[6] = el; }} position={[0.12, 0.65, 0.1]} rotation={[0.14, 0.22, Math.PI / 7]} scale={0.7} />
      <LeafMesh ref={(el) => { leafRefs.current[7] = el; }} position={[-0.12, 0.65, -0.1]} rotation={[0.14, -0.22, -Math.PI / 7]} scale={0.7} />

      <mesh position={[0, 2.42, 0]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshStandardMaterial color="#3d8a48" roughness={0.7} />
      </mesh>
    </group>
  );
}

import { forwardRef } from 'react';

const LeafMesh = forwardRef(({ position, rotation, scale = 1 }, ref) => {
  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale} castShadow>
      <sphereGeometry args={[0.28, 10, 8]} />
      <meshStandardMaterial
        color={HEALTHY_LEAF_COLOR}
        roughness={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});

