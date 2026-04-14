"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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
    <main className="min-h-screen flex flex-col items-center px-5 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-6"
      >
        <div className="text-6xl animate-bounce-in">🏆</div>
        <h1
          className="text-3xl sm:text-4xl font-black mt-2"
          style={{ color: "var(--kid-yellow)" }}
        >
          Today&apos;s Top Kids
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
              style={{ background: "var(--bg-soft)", border: "2px solid var(--border-soft)" }}
            />
          ))
        ) : entries.length === 0 ? (
          <div className="kid-card text-center">
            <div className="text-5xl mb-2">🌱</div>
            <p className="font-bold" style={{ color: "var(--text-secondary)" }}>
              No scores yet today. You could be first!
            </p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const medal = medalFor(entry.rank);
            const accent =
              entry.rank === 1
                ? "var(--kid-yellow)"
                : entry.rank === 2
                ? "var(--kid-blue)"
                : entry.rank === 3
                ? "var(--kid-orange)"
                : "#e5e5e5";
            const accentShadow =
              entry.rank === 1
                ? "var(--kid-yellow-d)"
                : entry.rank === 2
                ? "var(--kid-blue-d)"
                : entry.rank === 3
                ? "var(--kid-orange-d)"
                : "#d9d9d9";
            return (
              <motion.div
                key={`${entry.rank}-${entry.nickname}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-2xl p-4 flex items-center gap-4 bg-white"
                style={{
                  border: `3px solid ${accent}`,
                  borderBottomWidth: "5px",
                  borderBottomColor: accentShadow,
                }}
              >
                <div
                  className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
                  style={{
                    background: accent,
                    color: entry.rank <= 3 ? "#ffffff" : "var(--text-primary)",
                  }}
                >
                  {medal ?? `#${entry.rank}`}
                </div>
                <span
                  className="flex-1 font-black truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {entry.nickname}
                </span>
                <span
                  className="font-black text-lg"
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
          className="kid-btn-soft flex-1"
          style={{ padding: "0.9rem 1rem" }}
        >
          🏠 Home
        </button>
        <button
          onClick={() => router.push("/play?mode=daily")}
          className="kid-btn flex-1"
          style={{
            background: "var(--kid-green)",
            borderBottomColor: "var(--kid-green-d)",
            padding: "0.9rem 1rem",
          }}
        >
          Play today
        </button>
      </div>
    </main>
  );
}
