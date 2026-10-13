/**
 * GreenhouseScene.jsx
 * Main Three.js scene wrapping the entire 3D greenhouse visualization.
 * Designed for a modern light-mode digital twin dashboard.
 */
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { useSensor } from '../../context/SensorContext';
import { useActuator } from '../../context/ActuatorContext';
import { GreenhouseStructure } from './GreenhouseStructure';
import { PlantModel } from './PlantModel';
import { GrowLight } from './GrowLight';
import { evaluateReading } from '../../lib/twinEngine';

export default function GreenhouseScene() {
  const { latest, history, profile } = useSensor();
  const { actuator } = useActuator();

  // Evaluate current reading for stress signals passed to plant
  const evaluation = latest ? evaluateReading(latest, profile) : null;

  // Normalised humidity 0-1 for fog intensity
  const humidityNorm = latest
    ? Math.min(Math.max((latest.humidity - 30) / 70, 0), 1)
    : 0.5;

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '0', overflow: 'hidden', background: '#f8f8f5' }}>
      <Canvas
        camera={{ position: [5.5, 4.2, 7.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        {/* ── Ambient daylight lighting ───────────────────────────────────── */}
        <ambientLight intensity={0.7} color="#ffffff" />
        
        {/* ── Sun directional light with shadow mapping ────────────────────── */}
        <directionalLight
          position={[12, 18, 10]}
          intensity={1.2}
          color="#fffaea"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          shadow-bias={-0.0001}
        />
        
        {/* Soft secondary fill light */}
        <directionalLight
          position={[-10, 8, -6]}
          intensity={0.4}
          color="#b0e0e6"
        />

        {/* ── Soft atmospheric mist (humidity dependent) ───────────────────── */}
        <fogExp2 attach="fog" color="#eef4ef" density={0.008 + humidityNorm * 0.02} />

        <Suspense fallback={null}>
          {/* ── Grow light (driven by actuator state) ─────────────────────── */}
          <GrowLight actuator={actuator} />

          {/* ── Greenhouse structure (glass walls, roof, door) ──────────────── */}
          <GreenhouseStructure humidityNorm={humidityNorm} />

          {/* ── Plant model (driven by health evaluation) ──────────────────── */}
          <PlantModel evaluation={evaluation} latest={latest} profile={profile} />

          {/* ── Ground plane / Garden patio tile ──────────────────────────── */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color="#ebf0ea" roughness={0.8} />
          </mesh>
        </Suspense>

        {/* ── Orbit controls: smooth damped interactions ─────────────────── */}
        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.05}
          dampingFactor={0.06}
          enableDamping
          target={[0, 0.2, 0]}
        />
      </Canvas>
    </div>
  );
}
