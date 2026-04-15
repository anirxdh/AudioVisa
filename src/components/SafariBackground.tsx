"use client";

/**
 * Fixed safari background — used on every route EXCEPT the landing page.
 *
 * The `/public/background.png` is intentionally blurred and heavily tinted
 * so it reads as atmospheric texture rather than a competing illustration.
 * Cards and text always sit on a readable dark surface.
 */
export default function SafariBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {/* Base jungle color */}
      <div
        className="absolute inset-0"
        style={{ background: "#062a1e" }}
      />

      {/* Background image — blurred and scaled up so edges don't show */}
      <div
        className="absolute"
        style={{
          inset: "-24px", // overflow to hide blur fringe
          backgroundImage: "url(/background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "blur(14px) saturate(0.85) brightness(0.55)",
          transform: "scale(1.08)",
        }}
      />

      {/* Strong jungle-green wash for readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6, 42, 30, 0.72) 0%, rgba(6, 42, 30, 0.86) 50%, rgba(6, 42, 30, 0.94) 100%)",
        }}
      />

      {/* Subtle color cast so the surface feels warm at the top, deep at the bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, rgba(244, 167, 43, 0.08) 0%, transparent 55%)",
        }}
      />

      {/* Very light grain for print-paper feel */}
      <div
        className="absolute inset-0 opacity-12 mix-blend-overlay"
        style={{
          opacity: 0.12,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.35'/></svg>\")",
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
}
