import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DROPLET_COUNT = 50;
const PUMP_BASE_X = 0.9;
const PUMP_BASE_Y = -.92;
const PUMP_BASE_Z = 0.85;

export function WaterPump({ active = false }) {
  const groupRef = useRef();
  const waterRef = useRef();
  const plumeRef = useRef();
  const splashRef = useRef();
  const flowLevel = useRef(0);

  const streamCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.52, 0.07, 0.0),
      new THREE.Vector3(0.0, 0.02, -0.12),
      new THREE.Vector3(-0.35, 0.02, -0.28),
      new THREE.Vector3(-0.84, 0.03, -0.44),
    ]);
  }, []);

  const droplets = useMemo(() => {
    return Array.from({ length: DROPLET_COUNT }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 0.16,
      z: (Math.random() - 0.5) * 0.12,
      speed: 0.7 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      size: 0.012 + Math.random() * 0.01,
    }));
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    flowLevel.current = THREE.MathUtils.lerp(flowLevel.current, active ? 1 : 0, delta * 4);
    const k = flowLevel.current;

    if (groupRef.current) {
      groupRef.current.position.y = PUMP_BASE_Y + Math.sin(t * 2.4) * 0.01 * k;
    }

    if (waterRef.current) {
      waterRef.current.material.opacity = 0.05 + k * 0.45;
      waterRef.current.material.emissiveIntensity = 0.12 + k * 0.42;
      waterRef.current.scale.setScalar(0.88 + k * 0.14 + Math.sin(t * 10.0) * 0.02 * k);
    }

    if (plumeRef.current) {
      plumeRef.current.position.y = 0.03 + Math.sin(t * 6.0) * 0.012 * k;
    }

    if (splashRef.current) {
      splashRef.current.material.opacity = k * 0.32;
      const s = 0.7 + Math.sin(t * 11.0) * 0.08 * k;
      splashRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group ref={groupRef} position={[PUMP_BASE_X, PUMP_BASE_Y, PUMP_BASE_Z]}>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.24, 0.3]} />
        <meshStandardMaterial color="#35444a" roughness={0.55} metalness={0.45} />
      </mesh>

      <mesh position={[0.12, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.18, 18]} />
        <meshStandardMaterial color="#202d33" roughness={0.35} metalness={0.7} />
      </mesh>

      <mesh position={[0.32, 0.08, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.42, 16]} />
        <meshStandardMaterial color="#24454d" roughness={0.4} metalness={0.5} />
      </mesh>

      <mesh position={[0.52, 0.08, 0]} rotation={[0, -0.25, 0]} castShadow>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#1d3941" roughness={0.35} metalness={0.55} />
      </mesh>

      <mesh ref={waterRef}>
        <tubeGeometry args={[streamCurve, 28, 0.024, 12, false]} />
        <meshStandardMaterial
          color="#80d9ff"
          emissive="#4fc8ff"
          emissiveIntensity={0.12}
          transparent
          opacity={0.06}
          roughness={0.1}
          metalness={0}
        />
      </mesh>

      <mesh ref={splashRef} position={[-0.86, 0.02, -0.44]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.12, 24]} />
        <meshBasicMaterial color="#8ad8ff" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      <group ref={plumeRef} position={[-0.86, 0.03, -0.44]}>
        {droplets.map((d) => (
          <Droplet key={d.id} data={d} activeLevelRef={flowLevel} />
        ))}
      </group>
    </group>
  );
}

function Droplet({ data, activeLevelRef }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * data.speed + data.phase;
    const k = activeLevelRef.current;

    const rise = ((t % 1.0) / 1.0) * 0.22;
    ref.current.position.x = data.x * 0.8 + Math.sin(t * 5.2) * 0.03 * k;
    ref.current.position.z = data.z * 0.8 + Math.cos(t * 4.4) * 0.02 * k;
    ref.current.position.y = -0.03 + rise;

    const s = data.size * (0.4 + k * 1.1);
    ref.current.scale.setScalar(s);
    ref.current.material.opacity = k * 0.8;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#7fd6ff" transparent opacity={0} />
    </mesh>
  );
}
