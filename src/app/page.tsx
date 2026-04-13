"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";

const THEME_PRESETS = [
  "Rainy streets",
  "Coastal markets",
  "Night city",
  "Ancient ruins",
  "Industrial era",
  "Festivals",
];

const WAVE_BARS = 60;

function WaveformBackground() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-20 pointer-events-none">
      <div className="flex items-end gap-[3px] h-64 w-full max-w-4xl px-8">
        {Array.from({ length: WAVE_BARS }, (_, i) => {
          const delay = (i * 0.05) % 2;
          const baseHeight = 20 + Math.sin(i * 0.3) * 30 + Math.random() * 20;
          return (
            <div
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${baseHeight}%`,
                background: `linear-gradient(to top, var(--accent-cyan), var(--accent-amber))`,
                animation: `wave-bar ${1.2 + Math.random() * 0.8}s ease-in-out ${delay}s infinite`,
                minWidth: "3px",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [theme, setTheme] = useState("");

  function startGame() {
    const trimmed = theme.trim();
    const href = trimmed ? `/play?theme=${encodeURIComponent(trimmed)}` : "/play";
    router.push(href);
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <WaveformBackground />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Title */}
          <h1
            className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-4 glow-text-cyan"
            style={{ color: "var(--accent-cyan)" }}
          >
            Audio Visa
          </h1>

          {/* Subtitle */}
          <p
            className="text-xl sm:text-2xl font-light mb-12"
            style={{ color: "var(--text-secondary)" }}
          >
            Can you guess where you are... just by listening?
          </p>
        </motion.div>

        {/* Theme input (optional — turbopuffer ANN search) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="w-full max-w-md flex flex-col items-center gap-3 mb-6"
        >
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Optional: pick a vibe (e.g. rainy streets)"
            onKeyDown={(e) => {
              if (e.key === "Enter") startGame();
            }}
            className="w-full px-5 py-3 rounded-full text-center text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
            aria-label="Optional theme for scene selection"
          />
          <div className="flex flex-wrap justify-center gap-2">
            {THEME_PRESETS.map((preset) => {
              const active = theme === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTheme(active ? "" : preset)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer"
                  style={{
                    background: active ? "var(--accent-cyan)" : "rgba(255,255,255,0.08)",
                    color: active ? "black" : "var(--text-secondary)",
                    border: `1px solid ${active ? "var(--accent-cyan)" : "rgba(255,255,255,0.15)"}`,
                  }}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Powered by <span style={{ color: "var(--accent-cyan)" }}>turbopuffer</span> vector search
          </p>
        </motion.div>

        {/* Start button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            onClick={startGame}
            className="group relative px-10 py-4 rounded-full text-lg font-semibold text-black transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-cyan), #00c4ff)",
              boxShadow:
                "0 0 30px rgba(0, 240, 255, 0.4), 0 0 80px rgba(0, 240, 255, 0.15)",
            }}
          >
            <span className="relative z-10">Start Game</span>
            <div
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                boxShadow:
                  "0 0 40px rgba(0, 240, 255, 0.6), 0 0 100px rgba(0, 240, 255, 0.3)",
              }}
            />
          </button>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 w-full"
        >
          <h2
            className="text-sm font-semibold uppercase tracking-widest mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                ),
                title: "Listen",
                desc: "Hear an AI-generated soundscape of a real place and time",
              },
              {
                icon: (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" />
                    <path d="M2 12h20" />
                  </svg>
                ),
                title: "Guess",
                desc: "Name the location and the decade based on what you hear",
              },
              {
                icon: (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                  </svg>
                ),
                title: "Score",
                desc: "Earn points based on how close your guess is to reality",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="glass-card p-6 flex flex-col items-center text-center"
              >
                <div
                  className="mb-3"
                  style={{ color: "var(--accent-cyan)" }}
                >
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="relative z-10 mt-16 pb-8 text-center"
      >
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Built with{" "}
          <span style={{ color: "var(--accent-cyan)" }}>turbopuffer</span> +{" "}
          <span style={{ color: "var(--accent-amber)" }}>ElevenLabs</span> for{" "}
          <span className="font-semibold">#ElevenHacks</span>
        </p>
      </motion.footer>
    </main>
  );
}
