"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import type { Mesh } from "three";

/**
 * Cartoony 3D safari trophy — golden cup on a base. Built from primitives
 * so it works anywhere without external assets. Rotates continuously.
 */
function Trophy() {
  const groupRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.75;
  });

  return (
    <group ref={groupRef as unknown as React.MutableRefObject<Mesh>} position={[0, -0.2, 0]}>
      {/* Base */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.7, 0.9, 0.3, 32]} />
        <meshStandardMaterial color="#5f3b18" roughness={0.45} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 24]} />
        <meshStandardMaterial color="#cf8b14" roughness={0.2} metalness={0.85} />
      </mesh>
      {/* Cup bowl (bottom half of cup) */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.6, 0.28, 0.55, 32]} />
        <meshStandardMaterial
          color="#f4a72b"
          roughness={0.25}
          metalness={0.7}
          emissive="#f4a72b"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Cup rim (top flare) */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.72, 0.6, 0.3, 32]} />
        <meshStandardMaterial
          color="#ffb951"
          roughness={0.2}
          metalness={0.75}
          emissive="#ff9600"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Handles (torus) */}
      <mesh position={[-0.75, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.3, 0.06, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#cf8b14" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.75, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.3, 0.06, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#cf8b14" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Star on top */}
      <mesh position={[0, 0.85, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial
          color="#fff4d6"
          emissive="#fff4d6"
          emissiveIntensity={0.8}
          roughness={0.25}
          metalness={0.7}
        />
      </mesh>
    </group>
  );
}

export default function Trophy3D({
  size = 220,
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
        camera={{ position: [0, 0.3, 3.6], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 4, 5]} intensity={1.3} />
        <directionalLight position={[-3, 2, 2]} intensity={0.5} color="#88c34a" />
        <Suspense fallback={null}>
          <Float speed={1.3} rotationIntensity={0.1} floatIntensity={0.6}>
            <Trophy />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
}
