import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ROOF_GRID = [-0.72, 0, 0.72];

export function GrowLight({ actuator }) {
  const bulbRefs = useRef([]);
  const haloRefs = useRef([]);
  const lightRefs = useRef([]);
  const intensityRef = useRef(0);

  useFrame((_, delta) => {
    const targetIntensity = actuator.light_on
      ? 0.25 + (actuator.brightness / 255) * 2.9
      : 0;

    intensityRef.current = THREE.MathUtils.lerp(
      intensityRef.current,
      targetIntensity,
      delta * 3.2
    );

    const i = intensityRef.current;
    const warm = new THREE.Color('#ffd57a');
    const cool = new THREE.Color('#dfe7ff');
    const bulbTint = new THREE.Color().lerpColors(cool, warm, Math.min(i / 2.8, 1));

    bulbRefs.current.forEach((bulb, index) => {
      if (!bulb || !bulb.material) return;
      const scaleBoost = 0.75 + (i * 0.5) + ((index % 3) * 0.04);
      bulb.scale.setScalar(scaleBoost);
      bulb.material.color.copy(bulbTint);
      bulb.material.emissive.copy(bulbTint.clone().multiplyScalar(0.9));
      bulb.material.emissiveIntensity = i * 0.7;
      bulb.material.opacity = actuator.light_on ? 0.9 : 0.18;
    });

    haloRefs.current.forEach((halo) => {
      if (!halo) return;
      const scale = 1.2 + i * 1.1;
      halo.scale.setScalar(scale);
      halo.material.opacity = actuator.light_on ? 0.22 + i * 0.14 : 0.02;
    });

    lightRefs.current.forEach((light, index) => {
      if (!light) return;
      const burst = index % 2 === 0 ? 0.9 : 1.2;
      light.intensity = actuator.light_on ? i * burst : 0;
      light.distance = 3.6 + i * 1.5;
      light.color.copy(bulbTint.clone().multiplyScalar(1.08));
    });
  });

  return (
    <group position={[0, 2.2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.08, 0.2]} />
        <meshStandardMaterial color="#1e3a20" roughness={0.6} metalness={0.5} />
      </mesh>

      {ROOF_GRID.flatMap((x) =>
        ROOF_GRID.map((z, index) => {
          const bulbIndex = ROOF_GRID.indexOf(x) * ROOF_GRID.length + index;
          const key = `${x}-${z}`;

          return (
            <group key={key} position={[x, -0.18, z]}>
              <mesh ref={(el) => { bulbRefs.current[bulbIndex] = el; }}>
                <sphereGeometry args={[0.12, 20, 20]} />
                <meshStandardMaterial
                  color="#dfe7ff"
                  emissive="#ffd57a"
                  emissiveIntensity={0}
                  transparent
                  opacity={0.8}
                  roughness={0.1}
                  metalness={0.1}
                />
              </mesh>

              <mesh ref={(el) => { haloRefs.current[bulbIndex] = el; }} scale={1}>
                <sphereGeometry args={[0.19, 16, 16]} />
                <meshBasicMaterial color="#ffe39a" transparent opacity={0.08} side={THREE.DoubleSide} />
              </mesh>

              <pointLight
                ref={(el) => { lightRefs.current[bulbIndex] = el; }}
                position={[0, -0.06, 0]}
                intensity={0}
                color="#ffd57a"
                distance={3.2}
                decay={2}
              />
            </group>
          );
        })
      )}
    </group>
  );
}
