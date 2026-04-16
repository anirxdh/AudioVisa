"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * One-time cinematic hero for the landing page.
 *
 * - Autoplays the video muted inline; freezes on the final frame (no loop).
 * - Full invisible click overlay — any tap on the hero counts as pressing
 *   the painted "Let's Go!" button inside the video.
 * - Locked for `lockoutMs` after mount (default 1000ms) so toddlers don't
 *   accidentally skip the intro.
 * - Body scroll is disabled while the hero owns the viewport; once clicked,
 *   we smooth-scroll to `scrollTargetId` over `scrollDurationMs` and free
 *   the scroll.
 * - Return visitors (localStorage flag) bypass the lock immediately.
 */
interface HeroVideoOnceProps {
  src?: string;
  scrollTargetId?: string;
  lockoutMs?: number;
  scrollDurationMs?: number;
}

export default function HeroVideoOnce({
  src = "/hero.mp4",
  scrollTargetId = "app",
  lockoutMs = 1000,
  scrollDurationMs = 2000,
}: HeroVideoOnceProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [locked, setLocked] = useState(true);

  // Lock body scroll until the user clicks into the app.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLocked(false), lockoutMs);
    return () => clearTimeout(t);
  }, [lockoutMs]);

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
    if (!target) return;
    try {
      localStorage.setItem("audiovisa:visited", "1");
    } catch {
      /* ignore */
    }
    document.body.style.overflow = "";
    const startY = window.scrollY;
    const endY = target.getBoundingClientRect().top + window.scrollY;
    const distance = endY - startY;
    const duration = scrollDurationMs;
    const startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // easeInOutCubic — slow start, fast middle, slow end
      const eased =
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, startY + distance * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [locked, scrollTargetId, scrollDurationMs]);

  return (
    <section
      className="relative w-full overflow-hidden hero-section"
      aria-label="Welcome to Audio Visa Safari"
    >
      {/* Gradient fallback — always rendered behind */}
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

      {/* Video fills the whole hero edge-to-edge on every viewport.
         On narrow phones the 16:9 frame gets cropped on the sides —
         the important content (title, button, animals) sits center so
         nothing critical is lost. */}
      {!videoFailed && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center center" }}
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
          onEnded={(e) => {
            const vid = e.currentTarget;
            try {
              vid.pause();
            } catch {
              /* noop */
            }
          }}
        />
      )}

      {/* Invisible click surface — any tap on the hero triggers scroll */}
      <button
        type="button"
        onClick={handleClick}
        disabled={locked}
        aria-label="Let's Go"
        className="absolute inset-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
        style={{ background: "transparent", border: "none", zIndex: 5 }}
      />

      {/* Dark pill caption at the bottom — adapts to viewport width */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-[min(92vw,420px)] flex justify-center"
        style={{ bottom: "max(env(safe-area-inset-bottom, 0px) + 1.5rem, 4vh)", zIndex: 6 }}
      >
        <div
          className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-2 rounded-full font-display text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] sm:tracking-[0.3em] whitespace-nowrap"
          style={{
            background: "rgba(6, 18, 12, 0.82)",
            border: "1px solid rgba(244, 167, 43, 0.5)",
            color: locked ? "rgba(255, 244, 214, 0.55)" : "var(--safari-gold)",
            boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            transition: "color 0.3s ease",
          }}
        >
          {locked ? (
            <>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: "rgba(244, 167, 43, 0.7)",
                  animation: "pulse-glow 1s ease-in-out infinite",
                }}
              />
              Starting...
            </>
          ) : (
            <>
              <span className="text-sm sm:text-base leading-none">🌿</span>
              {/* Longer copy on desktop, shorter on phone */}
              <span className="hidden sm:inline">Tap anywhere to enter the safari</span>
              <span className="sm:hidden">Tap to enter safari</span>
              <span className="text-sm sm:text-base leading-none">↓</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
