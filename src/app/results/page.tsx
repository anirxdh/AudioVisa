"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getNickname } from "../../../lib/kid-storage";

interface Sticker {
  animalName: string;
  emoji: string | null;
  correct: boolean;
  guessed: string | null;
}

interface StoredResults {
  gameId: string | null;
  mode: "daily" | "practice" | "challenge";
  challengeId: string | null;
  totalScore: number;
  performanceRating: string | null;
  stickers: Sticker[];
  streak: number;
}

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsInner />
    </Suspense>
  );
}

function ResultsInner() {
  const router = useRouter();
  const [results, setResults] = useState<StoredResults | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rank, setRank] = useState<{ rank: number | null; total: number } | null>(null);
  const [top3, setTop3] = useState<LeaderboardEntry[]>([]);
  const submitGuard = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("gameResults");
    if (!stored) {
      router.push("/");
      return;
    }
    const data = JSON.parse(stored) as StoredResults;
    setResults(data);

    if (data.mode === "daily" && data.gameId && !submitGuard.current) {
      submitGuard.current = true;
      const nickname = getNickname();
      if (nickname) {
        setSubmitting(true);
        fetch("/api/leaderboard/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: data.gameId, nickname }),
        })
          .then((res) => res.json())
          .then((payload) => {
            if (payload.submitted) {
              setRank({ rank: payload.rank ?? null, total: payload.total ?? 0 });
            }
          })
          .catch(() => {})
          .finally(() => setSubmitting(false));
      }
      fetch("/api/leaderboard/today")
        .then((res) => res.json())
        .then((payload) => {
          if (Array.isArray(payload.entries)) {
            setTop3(payload.entries.slice(0, 3));
          }
        })
        .catch(() => {});
    }
  }, [router]);

  if (!results) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full"
              style={{
                background: "var(--kid-blue)",
                animation: `pulse-glow 1s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      </main>
    );
  }

  const correctCount = results.stickers.filter((s) => s.correct).length;
  const total = results.stickers.length;
  const allRight = correctCount === total;
  const headline = allRight
    ? "Amazing! 🎉"
    : correctCount > 0
    ? "Great job!"
    : "Nice try!";
  const headlineColor = allRight
    ? "var(--kid-green)"
    : correctCount > 0
    ? "var(--kid-blue)"
    : "var(--kid-orange)";

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-8">
      {allRight && <Confetti />}

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="text-center mb-2"
      >
        <div className="text-7xl sm:text-8xl animate-bounce-in">
          {allRight ? "🏆" : correctCount > 0 ? "⭐" : "🌱"}
        </div>
        <h1
          className="text-4xl sm:text-5xl font-black mt-3"
          style={{ color: headlineColor }}
        >
          {headline}
        </h1>
        <p className="text-base sm:text-lg font-bold mt-2" style={{ color: "var(--text-secondary)" }}>
          You got {correctCount} of {total} right!
        </p>
      </motion.div>

      {/* Streak + rank strip (daily only) */}
      {results.mode === "daily" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-5 w-full max-w-md grid grid-cols-2 gap-3"
        >
          <div
            className="rounded-2xl p-4 bg-white flex items-center gap-3"
            style={{
              border: "3px solid var(--kid-orange)",
              borderBottomWidth: "5px",
              borderBottomColor: "var(--kid-orange-d)",
            }}
          >
            <span className="text-3xl">🔥</span>
            <div>
              <div className="text-lg font-black leading-none" style={{ color: "var(--kid-orange)" }}>
                {results.streak}-day
              </div>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                streak
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl p-4 bg-white flex items-center gap-3"
            style={{
              border: "3px solid var(--kid-yellow)",
              borderBottomWidth: "5px",
              borderBottomColor: "var(--kid-yellow-d)",
            }}
          >
            <span className="text-3xl">🏆</span>
            <div className="flex-1 min-w-0">
              {submitting ? (
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "var(--kid-yellow)",
                      animation: "pulse-glow 1s ease-in-out infinite",
                    }}
                  />
                  <span className="text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>
                    Submitting...
                  </span>
                </div>
              ) : rank?.rank != null ? (
                <>
                  <div className="text-lg font-black leading-none" style={{ color: "var(--kid-yellow)" }}>
                    #{rank.rank}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    of {rank.total} today
                  </div>
                </>
              ) : (
                <div className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                  Type your name on home to rank
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Sticker book */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-6 mb-6"
      >
        <p
          className="text-xs font-black uppercase tracking-widest mb-3 text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          Your Sticker Book
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {results.stickers.map((sticker, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, rotate: -8, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.45 + i * 0.15, type: "spring" }}
              className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl flex flex-col items-center justify-center gap-1 p-2"
              style={{
                background: sticker.correct ? "#fffaf0" : "#f5f5f5",
                border: `3px solid ${
                  sticker.correct ? "var(--kid-yellow)" : "#d9d9d9"
                }`,
                borderBottomWidth: "6px",
                borderBottomColor: sticker.correct
                  ? "var(--kid-yellow-d)"
                  : "#c5c5c5",
                filter: sticker.correct ? "none" : "grayscale(0.7)",
              }}
            >
              <span className="text-4xl sm:text-5xl">
                {sticker.emoji ?? "🐾"}
              </span>
              <span
                className="text-xs font-black text-center leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {sticker.animalName}
              </span>
              {sticker.correct ? (
                <span className="text-xs font-black" style={{ color: "var(--kid-green)" }}>
                  ✓
                </span>
              ) : (
                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                  missed
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Top 3 preview (daily only) */}
      {results.mode === "daily" && top3.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="w-full max-w-md mb-6 rounded-2xl p-4 bg-white"
          style={{
            border: "2px solid var(--border-soft)",
            borderBottomWidth: "4px",
            borderBottomColor: "#d9d9d9",
          }}
        >
          <p
            className="text-xs font-black uppercase tracking-widest mb-2 text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Top 3 Today
          </p>
          <div className="space-y-1.5">
            {top3.map((entry) => {
              const medal =
                entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉";
              return (
                <div
                  key={`${entry.rank}-${entry.nickname}`}
                  className="flex items-center justify-between text-sm font-bold"
                >
                  <span style={{ color: "var(--text-primary)" }}>
                    {medal} {entry.nickname}
                  </span>
                  <span style={{ color: "var(--kid-blue)" }}>{entry.score}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        <button
          onClick={() => {
            sessionStorage.removeItem("gameResults");
            router.push("/play?mode=practice");
          }}
          className="kid-btn text-lg"
          style={{
            background: "var(--kid-green)",
            borderBottomColor: "var(--kid-green-d)",
            padding: "1rem 1.5rem",
          }}
        >
          Play again 🎧
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/leaderboard")}
            className="kid-btn-soft flex-1"
            style={{ padding: "0.85rem 1rem" }}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem("gameResults");
              router.push("/");
            }}
            className="kid-btn-soft flex-1"
            style={{ padding: "0.85rem 1rem" }}
          >
            🏠 Home
          </button>
        </div>
      </motion.div>
    </main>
  );
}

function Confetti() {
  const emojis = ["🎉", "🌟", "✨", "🎊", "⭐", "🌈", "🎈"];
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {pieces.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const dur = 1.4 + Math.random() * 1.2;
        const emoji = emojis[i % emojis.length];
        const cx = (Math.random() - 0.5) * 300;
        const cy = -200 - Math.random() * 300;
        const cr = (Math.random() - 0.5) * 720;
        return (
          <span
            key={i}
            className="absolute text-3xl"
            style={{
              left: `${left}%`,
              bottom: "0%",
              animation: `confetti-pop ${dur}s ${delay}s ease-out both`,
              ["--cx" as string]: `${cx}px`,
              ["--cy" as string]: `${cy}px`,
              ["--cr" as string]: `${cr}deg`,
            }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
}
