"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Full-bleed cinematic background for the landing/home screen.
 *
 * Tries, in order:
 *   1. The `src` prop (or /hero.mp4 by default) — drop any 4K animal
 *      compilation there (Pexels videos work great: download → save as
 *      public/hero.mp4).
 *   2. If the video fails to load / play, silently falls back to an
 *      animated cinematic gradient with slow-moving blobs — looks premium
 *      on its own so the page never feels broken.
 *
 * A soft dark-to-transparent overlay sits on top so content cards remain
 * readable without needing to lower the video's opacity.
 */
interface HeroVideoBackgroundProps {
  src?: string;
  /** Tint strength 0–1. Higher = more dimmed video, better text contrast. */
  overlayStrength?: number;
}

export default function HeroVideoBackground({
  src = "/hero.mp4",
  overlayStrength = 0.35,
}: HeroVideoBackgroundProps) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // iOS Safari sometimes needs an explicit play() call after mount.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Autoplay blocked — fall back to the gradient (rare for muted+inline).
          setVideoFailed(true);
        });
      }
    };
    if (el.readyState >= 2) tryPlay();
    else el.addEventListener("loadeddata", tryPlay, { once: true });
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {/* Gradient fallback — always rendered underneath so we never see flash-of-nothing */}
      <GradientFallback />

      {/* Video layer */}
      {!videoFailed && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: videoReady ? 1 : 0 }}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          poster=""
        />
      )}

      {/* Warm cream tint (keeps brand warmth even over cool videos) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,250,242,0.08) 0%, rgba(255,250,242,0.18) 50%, rgba(255,250,242,0.42) 100%)",
        }}
      />

      {/* Readability overlay (dark vignette, stronger at the edges) */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 20%, rgba(0,0,0,${overlayStrength *
            0.35}) 0%, rgba(0,0,0,${overlayStrength * 0.55}) 60%, rgba(0,0,0,${
            overlayStrength
          }) 100%)`,
        }}
      />

      {/* Subtle grain for depth (SVG noise — no extra asset needed) */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-25"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' stitchTiles='stitch'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.5'/></svg>\")",
          backgroundSize: "120px 120px",
        }}
      />
    </div>
  );
}

/* Animated gradient fallback — looks premium on its own, not "broken". */
function GradientFallback() {
  return (
    <div className="absolute inset-0">
      {/* Base radial gradient — warm savannah */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(at 30% 30%, #3a5f8a 0%, #1f3654 38%, #0e1a2c 100%)",
        }}
      />
      {/* Slow-drifting orbs for subtle motion */}
      <div
        className="absolute rounded-full blur-3xl opacity-50"
        style={{
          width: "60vmax",
          height: "60vmax",
          top: "-15%",
          left: "-15%",
          background: "radial-gradient(circle, #ff9a3c 0%, transparent 70%)",
          animation: "drift-a 22s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-40"
        style={{
          width: "50vmax",
          height: "50vmax",
          bottom: "-20%",
          right: "-10%",
          background: "radial-gradient(circle, #58cc02 0%, transparent 70%)",
          animation: "drift-b 28s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-30"
        style={{
          width: "40vmax",
          height: "40vmax",
          top: "30%",
          right: "20%",
          background: "radial-gradient(circle, #1cb0f6 0%, transparent 70%)",
          animation: "drift-c 34s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}
