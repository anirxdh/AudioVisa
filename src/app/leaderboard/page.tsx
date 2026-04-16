"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import SafariBackground from "@/components/SafariBackground";

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
}

function medalFor(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    fetch("/api/leaderboard/today")
      .then((res) => res.json())
      .then((data) => {
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setDate(data.date ?? "");
      })
      .catch(() => setEntries([]));
  }, []);

  return (
    <>
      <SafariBackground />
      <main className="relative z-10 min-h-screen flex flex-col items-center px-5 py-10">
        {/* Header with 3D trophy */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 flex flex-col items-center"
        >
          <span className="text-7xl sm:text-8xl">🏆</span>
          <p
            className="font-display text-[11px] uppercase tracking-[0.4em] mt-2"
            style={{ color: "rgba(255, 244, 214, 0.7)" }}
          >
            · Today's Expedition Log ·
          </p>
          <h1
            className="font-display text-3xl sm:text-4xl font-bold mt-1"
            style={{ color: "var(--safari-gold)" }}
          >
            Top Explorers
          </h1>
          {date && (
            <p
              className="text-sm font-bold mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {date}
            </p>
          )}
        </motion.div>

        <div className="w-full max-w-md space-y-3 mb-8">
          {entries === null ? (
            Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="rounded-2xl h-16 animate-pulse"
                style={{
                  background: "rgba(255, 244, 214, 0.06)",
                  border: "2px solid rgba(127, 176, 105, 0.2)",
                }}
              />
            ))
          ) : entries.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                background: "rgba(13, 59, 46, 0.6)",
                border: "2px solid rgba(127, 176, 105, 0.35)",
                borderBottomWidth: "4px",
                borderBottomColor: "rgba(127, 176, 105, 0.2)",
              }}
            >
              <div className="text-5xl mb-2">🌱</div>
              <p
                className="font-bold"
                style={{ color: "var(--safari-cream)" }}
              >
                No explorers yet today. Be the first!
              </p>
            </div>
          ) : (
            entries.map((entry, i) => {
              const medal = medalFor(entry.rank);
              const accent =
                entry.rank === 1
                  ? "var(--safari-gold)"
                  : entry.rank === 2
                  ? "var(--kid-blue)"
                  : entry.rank === 3
                  ? "var(--safari-amber)"
                  : "rgba(127, 176, 105, 0.4)";
              const accentShadow =
                entry.rank === 1
                  ? "var(--safari-gold-d)"
                  : entry.rank === 2
                  ? "var(--kid-blue-d)"
                  : entry.rank === 3
                  ? "var(--safari-amber-d)"
                  : "rgba(127, 176, 105, 0.2)";
              return (
                <motion.div
                  key={`${entry.rank}-${entry.nickname}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="rounded-2xl p-4 flex items-center gap-4"
                  style={{
                    background: "rgba(13, 59, 46, 0.65)",
                    border: `3px solid ${accent}`,
                    borderBottomWidth: "5px",
                    borderBottomColor: accentShadow,
                  }}
                >
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-display text-xl font-black"
                    style={{
                      background:
                        entry.rank <= 3
                          ? accent
                          : "rgba(255, 244, 214, 0.1)",
                      color:
                        entry.rank <= 3
                          ? "var(--jungle-deep)"
                          : "var(--safari-cream)",
                    }}
                  >
                    {medal ?? `#${entry.rank}`}
                  </div>
                  <span
                    className="flex-1 font-display font-black truncate"
                    style={{ color: "var(--safari-cream)" }}
                  >
                    {entry.nickname}
                  </span>
                  <span
                    className="font-display font-black text-lg"
                    style={{ color: accent }}
                  >
                    {entry.score}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => router.push("/")}
            className="kid-btn-soft flex-1 font-display"
            style={{ padding: "0.9rem 1rem" }}
          >
            🏠 Basecamp
          </button>
          <button
            onClick={() => router.push("/play?mode=daily")}
            className="kid-btn flex-1 font-display"
            style={{
              background:
                "linear-gradient(135deg, var(--safari-gold), var(--safari-amber))",
              borderBottomColor: "var(--safari-amber-d)",
              color: "var(--jungle-deep)",
              padding: "0.9rem 1rem",
            }}
          >
            Start expedition
          </button>
        </div>
      </main>
    </>
  );
}
