"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { getNickname } from "../../../lib/kid-storage";
import SafariBackground from "@/components/SafariBackground";

const SpinningBadge3D = dynamic(
  () => import("@/components/SpinningBadge3D"),
  { ssr: false, loading: () => null }
);

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
          body: JSON.stringify({
            gameId: data.gameId,
            nickname,
            score: data.totalScore,
            mode: data.mode,
          }),
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
      <>
        <SafariBackground />
        <main className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full"
                style={{
                  background: "var(--safari-gold)",
                  animation: `pulse-glow 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </main>
      </>
    );
  }

  const correctCount = results.stickers.filter((s) => s.correct).length;
  const total = results.stickers.length;
  const allRight = correctCount === total;
  const headline = allRight
    ? "Master Tracker!"
    : correctCount > 0
    ? "Good Expedition!"
    : "Safari Training!";
  const headlineColor = allRight
    ? "var(--leaf-bright)"
    : correctCount > 0
    ? "var(--safari-gold)"
    : "var(--safari-amber)";

  return (
    <>
      <SafariBackground />
      {allRight && <Confetti />}

      <main className="relative z-10 min-h-screen flex flex-col items-center px-5 py-10">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="text-center mb-2"
        >
          <div className="text-7xl sm:text-8xl animate-bounce-in">
            {allRight ? "🏆" : correctCount > 0 ? "🌿" : "🌱"}
          </div>
          <p
            className="font-display text-[11px] uppercase tracking-[0.4em] mt-3"
            style={{ color: "rgba(255, 244, 214, 0.7)" }}
          >
            · Expedition Report ·
          </p>
          <h1
            className="font-display text-4xl sm:text-5xl font-bold mt-1"
            style={{ color: headlineColor }}
          >
            {headline}
          </h1>
          <p
            className="text-base sm:text-lg font-bold mt-2"
            style={{ color: "var(--text-secondary)" }}
          >
            You tracked {correctCount} of {total} animals correctly!
          </p>
        </motion.div>

        {/* Streak + Rank (daily only) */}
        {results.mode === "daily" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mt-5 w-full max-w-md grid grid-cols-2 gap-3"
          >
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: "rgba(255, 150, 0, 0.15)",
                border: "2px solid var(--safari-amber)",
                borderBottomWidth: "5px",
                borderBottomColor: "var(--safari-amber-d)",
              }}
            >
              <span className="text-3xl">🔥</span>
              <div>
                <div
                  className="font-display text-lg font-black leading-none"
                  style={{ color: "var(--safari-amber)" }}
                >
                  {results.streak}-day
                </div>
                <div
                  className="font-display text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  streak
                </div>
              </div>
            </div>
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: "rgba(244, 167, 43, 0.15)",
                border: "2px solid var(--safari-gold)",
                borderBottomWidth: "5px",
                borderBottomColor: "var(--safari-gold-d)",
              }}
            >
              <span className="text-3xl">🏆</span>
              <div className="flex-1 min-w-0">
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: "var(--safari-gold)",
                        animation: "pulse-glow 1s ease-in-out infinite",
                      }}
                    />
                    <span
                      className="font-display text-xs font-bold uppercase"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Submitting...
                    </span>
                  </div>
                ) : rank?.rank != null ? (
                  <>
                    <div
                      className="font-display text-lg font-black leading-none"
                      style={{ color: "var(--safari-gold)" }}
                    >
                      #{rank.rank}
                    </div>
                    <div
                      className="font-display text-xs font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      of {rank.total} today
                    </div>
                  </>
                ) : (
                  <div
                    className="text-xs font-bold"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Name on home to rank
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Sticker book with 3D spinning badges for correct */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-7 mb-6"
        >
          <p
            className="font-display text-xs font-black uppercase tracking-[0.3em] mb-3 text-center"
            style={{ color: "var(--safari-gold)" }}
          >
            Safari Badges
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {results.stickers.map((sticker, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, rotate: -8, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.45 + i * 0.15, type: "spring" }}
                className="w-28 h-32 sm:w-32 sm:h-36 rounded-2xl flex flex-col items-center justify-center gap-1 p-2 relative"
                style={{
                  background: sticker.correct
                    ? "linear-gradient(180deg, rgba(244,167,43,0.25) 0%, rgba(244,167,43,0.1) 100%)"
                    : "rgba(255, 244, 214, 0.06)",
                  border: `3px solid ${
                    sticker.correct ? "var(--safari-gold)" : "rgba(255, 244, 214, 0.18)"
                  }`,
                  borderBottomWidth: "6px",
                  borderBottomColor: sticker.correct
                    ? "var(--safari-gold-d)"
                    : "rgba(255, 244, 214, 0.1)",
                  filter: sticker.correct ? "none" : "grayscale(0.7) opacity(0.75)",
                }}
              >
                {/* 3D medal hovers in top-right when correct */}
                {sticker.correct && (
                  <div className="absolute -top-4 -right-4">
                    <SpinningBadge3D size={60} />
                  </div>
                )}
                <span className="text-4xl sm:text-5xl">
                  {sticker.emoji ?? "🐾"}
                </span>
                <span
                  className="font-display text-xs font-black text-center leading-tight"
                  style={{ color: "var(--safari-cream)" }}
                >
                  {sticker.animalName}
                </span>
                {sticker.correct ? (
                  <span
                    className="font-display text-xs font-black"
                    style={{ color: "var(--leaf-bright)" }}
                  >
                    ✓ Tracked
                  </span>
                ) : (
                  <span
                    className="font-display text-xs font-bold"
                    style={{ color: "var(--text-muted)" }}
                  >
                    missed
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Top 3 preview */}
        {results.mode === "daily" && top3.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
            className="w-full max-w-md mb-6 rounded-2xl p-4"
            style={{
              background: "rgba(13, 59, 46, 0.6)",
              border: "2px solid rgba(127, 176, 105, 0.3)",
              borderBottomWidth: "4px",
              borderBottomColor: "rgba(127, 176, 105, 0.15)",
            }}
          >
            <p
              className="font-display text-xs font-black uppercase tracking-[0.3em] mb-2 text-center"
              style={{ color: "var(--safari-gold)" }}
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
                    <span style={{ color: "var(--safari-cream)" }}>
                      {medal} {entry.nickname}
                    </span>
                    <span style={{ color: "var(--safari-gold)" }}>
                      {entry.score}
                    </span>
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
            className="kid-btn font-display text-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--safari-gold), var(--safari-amber))",
              borderBottomColor: "var(--safari-amber-d)",
              color: "var(--jungle-deep)",
              padding: "1rem 1.5rem",
            }}
          >
            Another safari 🌿
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/leaderboard")}
              className="kid-btn-soft flex-1 font-display"
              style={{ padding: "0.85rem 1rem" }}
            >
              🏆 Expedition log
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem("gameResults");
                router.push("/");
              }}
              className="kid-btn-soft flex-1 font-display"
              style={{ padding: "0.85rem 1rem" }}
            >
              🏠 Basecamp
            </button>
          </div>
        </motion.div>
      </main>
    </>
  );
}

function Confetti() {
  const emojis = ["🎉", "🌟", "✨", "🎊", "⭐", "🌿", "🏆"];
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden>
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
