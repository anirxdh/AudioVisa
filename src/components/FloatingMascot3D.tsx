"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshWobbleMaterial, Torus } from "@react-three/drei";
import type { Mesh } from "three";

/**
 * 3D floating mascot — a stylized safari "owl" made from primitives so it
 * works without external GLTF assets. Slow-rotating, floating, reacts
 * subtly to time.
 *
 * Primitives (no models, no textures, no external files):
 *   - body: wobbly sphere (warm amber)
 *   - head: smaller sphere
 *   - eyes: two dark spheres
 *   - beak: orange cone-like
 *   - halo: thin torus ring for flair
 */

function Owl() {
  const bodyRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!bodyRef.current) return;
    // Gentle bobbing driven by time so it feels alive
    const t = state.clock.getElapsedTime();
    bodyRef.current.rotation.y = t * 0.35;
  });

  return (
    <group ref={bodyRef as unknown as React.MutableRefObject<Mesh>}>
      {/* Body */}
      <Sphere args={[1, 48, 48]} position={[0, -0.25, 0]}>
        <MeshWobbleMaterial
          color="#f4a72b"
          factor={0.15}
          speed={0.9}
          roughness={0.55}
          metalness={0.05}
        />
      </Sphere>

      {/* Head */}
      <Sphere args={[0.72, 40, 40]} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#ff9600" roughness={0.6} />
      </Sphere>

      {/* Left eye */}
      <Sphere args={[0.18, 24, 24]} position={[-0.28, 0.85, 0.55]}>
        <meshStandardMaterial color="#062a1e" roughness={0.3} />
      </Sphere>
      {/* Left eye gleam */}
      <Sphere args={[0.06, 16, 16]} position={[-0.24, 0.91, 0.71]}>
        <meshStandardMaterial
          color="#fff4d6"
          emissive="#fff4d6"
          emissiveIntensity={0.6}
        />
      </Sphere>

      {/* Right eye */}
      <Sphere args={[0.18, 24, 24]} position={[0.28, 0.85, 0.55]}>
        <meshStandardMaterial color="#062a1e" roughness={0.3} />
      </Sphere>
      {/* Right eye gleam */}
      <Sphere args={[0.06, 16, 16]} position={[0.32, 0.91, 0.71]}>
        <meshStandardMaterial
          color="#fff4d6"
          emissive="#fff4d6"
          emissiveIntensity={0.6}
        />
      </Sphere>

      {/* Beak */}
      <mesh position={[0, 0.55, 0.58]} rotation={[Math.PI / 1, 0, 0]}>
        <coneGeometry args={[0.14, 0.24, 20]} />
        <meshStandardMaterial color="#e76f51" roughness={0.4} />
      </mesh>

      {/* Halo ring */}
      <Torus args={[1.35, 0.04, 16, 64]} position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color="#88c34a"
          emissive="#88c34a"
          emissiveIntensity={0.25}
          roughness={0.35}
        />
      </Torus>
    </group>
  );
}

export default function FloatingMascot3D({
  size = 260,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        pointerEvents: "none", // decorative — don't steal clicks
      }}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} />
        <directionalLight position={[-4, 2, 3]} intensity={0.4} color="#88c34a" />
        <Suspense fallback={null}>
          <Float speed={1.6} rotationIntensity={0.4} floatIntensity={1.1}>
            <Owl />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
}
