"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * One-time cinematic hero video for the landing page.
 *
 * - Autoplays muted inline on mount.
 * - Plays through ONCE. When it ends, pauses on the final frame (does NOT loop).
 * - Covers the entire viewport.
 * - An invisible clickable button overlays the video (either whole area or a
 *   targeted rect matching the "Let's Go!" graphic if `hotspot` is provided).
 * - Button is disabled for `lockoutMs` after mount (default 1000ms) to prevent
 *   trigger-happy toddlers from scrolling before the intro plays.
 * - onClick → smooth-scrolls to `scrollTargetId` (default "app").
 *
 * If the video fails to load (404 / autoplay blocked), a gradient fallback
 * covers the screen and the button still works.
 */
interface HeroVideoOnceProps {
  src?: string;
  scrollTargetId?: string;
  lockoutMs?: number;
  /**
   * Optional: percentage-based rect over the video where the button should be.
   * Defaults to the whole video (any click on the hero triggers scroll).
   */
  hotspot?: {
    topPct: number;
    leftPct: number;
    widthPct: number;
    heightPct: number;
  };
}

export default function HeroVideoOnce({
  src = "/hero.mp4",
  scrollTargetId = "app",
  lockoutMs = 1000,
}: HeroVideoOnceProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [locked, setLocked] = useState(true);

  // 1s lockout to prevent accidental scroll during intro
  useEffect(() => {
    const t = setTimeout(() => setLocked(false), lockoutMs);
    return () => clearTimeout(t);
  }, [lockoutMs]);

  // Try to autoplay; fall back to gradient if blocked
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => setVideoFailed(true));
      }
    };
    if (el.readyState >= 2) tryPlay();
    else el.addEventListener("loadeddata", tryPlay, { once: true });
  }, []);

  const handleClick = useCallback(() => {
    if (locked) return;
    const target = document.getElementById(scrollTargetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [locked, scrollTargetId]);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "100vh" }}
      aria-label="Welcome to Audio Visa Safari"
    >
      {/* Gradient fallback — always rendered behind so we never see nothing */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(at 30% 30%, #1c5d44 0%, #0d3b2e 45%, #062a1e 100%)",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-60"
          style={{
            width: "65vmax",
            height: "65vmax",
            top: "-20%",
            left: "-15%",
            background: "radial-gradient(circle, #88c34a 0%, transparent 70%)",
            animation: "drift-a 22s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-45"
          style={{
            width: "55vmax",
            height: "55vmax",
            bottom: "-20%",
            right: "-10%",
            background: "radial-gradient(circle, #f4a72b 0%, transparent 70%)",
            animation: "drift-b 28s ease-in-out infinite alternate",
          }}
        />
      </div>

      {/* Video layer */}
      {!videoFailed && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: videoReady ? 1 : 0 }}
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          onEnded={(e) => {
            // Freeze on last frame — pause explicitly so it doesn't auto-restart.
            const vid = e.currentTarget;
            try {
              vid.pause();
            } catch {
              /* noop */
            }
          }}
        />
      )}

      {/* Invisible click overlay — covers entire hero so any click triggers scroll */}
      <button
        type="button"
        onClick={handleClick}
        disabled={locked}
        aria-label="Let's Go"
        className="absolute inset-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
        style={{
          background: "transparent",
          border: "none",
          zIndex: 5,
        }}
      />

      {/* Tiny helper label for accessibility + for kids who scroll with keyboard */}
      <div
        className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-black uppercase tracking-[0.3em]"
        style={{
          color: "rgba(255, 244, 214, 0.7)",
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          animation: "pulse-glow 2s ease-in-out infinite",
          opacity: locked ? 0.3 : 1,
          transition: "opacity 0.4s",
        }}
      >
        {locked ? "Starting..." : "Tap the safari — let's go! ↓"}
      </div>
    </section>
  );
}
