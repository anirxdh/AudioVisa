"use client";

/**
 * Fixed safari background — used on every route EXCEPT the landing page.
 *
 * Renders `/background.png` as a fixed cover-sized image with a dark jungle
 * overlay so cards and text remain readable regardless of the image content.
 * If the image fails to load, the same jungle gradient that powers the hero
 * fallback takes over — the page never looks broken.
 */
export default function SafariBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {/* Base jungle gradient — always rendered as fallback */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(at 30% 20%, #1c5d44 0%, #0d3b2e 40%, #062a1e 100%)",
        }}
      />

      {/* Background image — CSS background so a 404 just falls through to gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Dark readability overlay — tuned for safari photos */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6, 42, 30, 0.55) 0%, rgba(6, 42, 30, 0.78) 55%, rgba(6, 42, 30, 0.92) 100%)",
        }}
      />

      {/* Subtle paper-grain overlay for tactile feel */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.55'/></svg>\")",
          backgroundSize: "160px 160px",
        }}
      />
    </div>
  );
}
