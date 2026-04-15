"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";

/**
 * Subtle parallax 3D silhouettes drifting in the background — leafy shapes
 * that move at different depths to give the illusion of a jungle scene in
 * motion. Fully decorative, pointer-events:none.
 *
 * Uses primitives only; all shapes are low-poly so it's very light on GPU
 * even with 8 instances.
 */

function Leaf({
  position,
  scale = 1,
  speed = 0.3,
  amp = 0.4,
  tilt = 0,
}: {
  position: [number, number, number];
  scale?: number;
  speed?: number;
  amp?: number;
  tilt?: number;
}) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.position.y = position[1] + Math.sin(t * speed) * amp;
    ref.current.rotation.z = tilt + Math.sin(t * speed * 0.7) * 0.15;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh rotation={[0, 0, tilt]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#0d3b2e" transparent opacity={0.45} />
      </mesh>
      <mesh position={[0.5, 0, 0]} rotation={[0, 0, tilt + 0.4]}>
        <sphereGeometry args={[0.4, 14, 14]} />
        <meshBasicMaterial color="#1c5d44" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      {/* Back layer (far) — slower */}
      <Leaf position={[-4, 1.5, -3]} scale={1.6} speed={0.25} amp={0.3} tilt={0.2} />
      <Leaf position={[4.2, -1.8, -3]} scale={1.8} speed={0.22} amp={0.35} tilt={-0.3} />
      <Leaf position={[-2.5, -2.5, -2.5]} scale={1.2} speed={0.3} amp={0.28} tilt={0.1} />

      {/* Middle layer */}
      <Leaf position={[3, 2, -1.5]} scale={1} speed={0.4} amp={0.45} tilt={-0.15} />
      <Leaf position={[-3.5, 0.5, -1.5]} scale={1.1} speed={0.38} amp={0.4} tilt={0.3} />

      {/* Front layer (close) — faster */}
      <Leaf position={[5, -0.5, 0]} scale={0.75} speed={0.55} amp={0.5} tilt={-0.25} />
      <Leaf position={[-5, 2, 0]} scale={0.8} speed={0.5} amp={0.45} tilt={0.2} />
    </>
  );
}

export default function ParallaxSilhouettes3D({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.3]}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.4} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
