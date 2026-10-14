import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// One bulb per physical LED: Light 1, 2, 3 (left to right)
const BULB_X = [-0.72, 0, 0.72];

const WARM = new THREE.Color('#ffd57a');
const COOL = new THREE.Color('#dfe7ff');
const tint = new THREE.Color();

export function GrowLight({ actuator }) {
  const bulbRefs  = useRef([]);
  const haloRefs  = useRef([]);
  const lightRefs = useRef([]);
  const levels    = useRef([0, 0, 0]); // smoothed 0..1 per bulb

  useFrame((_, delta) => {
    BULB_X.forEach((_x, idx) => {
      const on = Boolean(actuator.leds?.[idx]);
      levels.current[idx] = THREE.MathUtils.lerp(levels.current[idx], on ? 1 : 0, delta * 4);
      const k = levels.current[idx];

      tint.lerpColors(COOL, WARM, k);

      const bulb = bulbRefs.current[idx];
      if (bulb?.material) {
        bulb.scale.setScalar(0.85 + k * 0.45);
        bulb.material.color.copy(tint);
        bulb.material.emissive.copy(tint).multiplyScalar(0.9);
        bulb.material.emissiveIntensity = k * 1.6;
        bulb.material.opacity = 0.18 + k * 0.72;
      }

      const halo = haloRefs.current[idx];
      if (halo) {
        halo.scale.setScalar(1.2 + k * 1.4);
        halo.material.opacity = 0.02 + k * 0.3;
      }

      const light = lightRefs.current[idx];
      if (light) {
        light.intensity = k * 2.4;
        light.distance = 3.6 + k * 2;
        light.color.copy(tint);
      }
    });
  });

  return (
    <group position={[0, 2.2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.08, 0.2]} />
        <meshStandardMaterial color="#1e3a20" roughness={0.6} metalness={0.5} />
      </mesh>

      {BULB_X.map((x, idx) => (
        <group key={x} position={[x, -0.18, 0]}>
          <mesh ref={(el) => { bulbRefs.current[idx] = el; }}>
            <sphereGeometry args={[0.12, 20, 20]} />
            <meshStandardMaterial
              color="#dfe7ff"
              emissive="#ffd57a"
              emissiveIntensity={0}
              transparent
              opacity={0.18}
              roughness={0.1}
              metalness={0.1}
            />
          </mesh>

          <mesh ref={(el) => { haloRefs.current[idx] = el; }}>
            <sphereGeometry args={[0.19, 16, 16]} />
            <meshBasicMaterial color="#ffe39a" transparent opacity={0.02} side={THREE.DoubleSide} />
          </mesh>

          <pointLight
            ref={(el) => { lightRefs.current[idx] = el; }}
            position={[0, -0.06, 0]}
            intensity={0}
            color="#ffd57a"
            distance={3.6}
            decay={2}
          />
        </group>
      ))}
    </group>
  );
}
