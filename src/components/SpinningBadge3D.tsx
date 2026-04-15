"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Mesh } from "three";

/**
 * Small 3D spinning safari medal. Uses CSS-emoji texturing via a Text mesh
 * would require Drei Text, so instead we build it with primitives:
 *   - front face: gold coin (cylinder with thickness)
 *   - rim: dark gold torus
 *   - backdrop rope ribbon: simple torus
 *
 * Designed to render at small sizes (≤ 140px) for the sticker book.
 */

function Medal() {
  const groupRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 1.2;
  });

  return (
    <group ref={groupRef as unknown as React.MutableRefObject<Mesh>}>
      {/* Outer rim */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[1, 0.12, 16, 64]} />
        <meshStandardMaterial
          color="#cf8b14"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Coin face (front) */}
      <mesh position={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.92, 0.92, 0.1, 48]} />
        <meshStandardMaterial
          color="#f4a72b"
          roughness={0.25}
          metalness={0.6}
          emissive="#f4a72b"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Engraved star on the front */}
      <mesh position={[0, 0, 0.08]}>
        <coneGeometry args={[0.45, 0.08, 5]} />
        <meshStandardMaterial
          color="#fff4d6"
          emissive="#fff4d6"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Ribbon (top) */}
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.35, 0.25, 0.1]} />
        <meshStandardMaterial color="#e76f51" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.35, 0.25, 0.1]} />
        <meshStandardMaterial color="#c4512e" roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function SpinningBadge3D({
  size = 100,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ width: size, height: size, pointerEvents: "none" }}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={1.3} />
        <directionalLight position={[-3, 2, 2]} intensity={0.5} color="#fff4d6" />
        <Suspense fallback={null}>
          <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.8}>
            <Medal />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
}
