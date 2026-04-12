"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ScoreDisplay from "@/components/ScoreDisplay";

// ---- Types ----

interface RoundSummary {
  roundNumber: number;
  location: string;
  country: string;
  era: string;
  score: number;
  maxScore: number;
  hintUsed: boolean;
  sounds: string[];
}

interface GameSummary {
  gameId: string;
  totalScore: number;
  maxPossibleScore: number;
  performanceRating: string;
  rounds: RoundSummary[];
  status: string;
}

// ---- Helpers ----

function getScoreEmoji(score: number, maxScore: number): string {
  const ratio = score / maxScore;
  if (ratio >= 0.8) return "\u{1F3AF}"; // bullseye
  if (ratio >= 0.6) return "\u{1F525}"; // fire
  if (ratio >= 0.4) return "\u{1F44D}"; // thumbs up
  if (ratio >= 0.2) return "\u{1F914}"; // thinking
  return "\u{1F30D}"; // globe
}

function getRatingTitle(rating: string | null): string {
  if (!rating) return "Sound Explorer";
  return rating;
}

function getRatingColor(totalScore: number): string {
  if (totalScore >= 4000) return "var(--accent-green)";
  if (totalScore >= 2500) return "var(--accent-cyan)";
  if (totalScore >= 1500) return "var(--accent-amber)";
  return "var(--accent-red)";
}

// ---- Component ----

export default function ResultsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get game results from session storage
    const stored = sessionStorage.getItem("gameResults");
    if (!stored) {
      // No game data — redirect to home
      router.push("/");
      return;
    }

    const data = JSON.parse(stored);
    const { gameId } = data;

    // Fetch full summary from API
    async function fetchSummary() {
      try {
        const res = await fetch("/api/game/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
        });
        if (!res.ok) throw new Error("Failed to fetch summary");
        const summaryData: GameSummary = await res.json();
        setSummary(summaryData);
      } catch (err) {
        console.error("Failed to fetch summary:", err);
        // Fallback to stored data
        setSummary({
          gameId: data.gameId,
          totalScore: data.totalScore,
          maxPossibleScore: 5000,
          performanceRating: data.performanceRating || "Sound Explorer",
          rounds: data.roundScores?.map(
            (rs: { score: number; maxScore: number; roundNumber: number }) => ({
              roundNumber: rs.roundNumber,
              location: "Unknown",
              country: "",
              era: "",
              score: rs.score || 0,
              maxScore: rs.maxScore || 1000,
              hintUsed: false,
              sounds: [],
            })
          ) || [],
          status: "finished",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSummary();
  }, [router]);

  function getShareText(): string {
    if (!summary) return "";

    const lines = [
      `\u{1F3A7} SoundGuessr - I scored ${summary.totalScore}/${summary.maxPossibleScore}!`,
      summary.performanceRating,
      "",
      `Play now: ${window.location.origin}`,
      "",
      "#ElevenHacks @turbopuffer @elevenlabsio",
    ];

    return lines.join("\n");
  }

  async function handleCopyShare() {
    if (!summary) return;

    const text = getShareText();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleShareTwitter() {
    if (!summary) return;
    const text = getShareText();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                background: "var(--accent-cyan)",
                animation: `pulse-glow 1s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--text-secondary)" }}>No game data found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Performance title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-2"
      >
        <h1
          className="text-4xl sm:text-5xl font-bold tracking-tight"
          style={{ color: getRatingColor(summary.totalScore) }}
        >
          {getRatingTitle(summary.performanceRating)}
        </h1>
      </motion.div>

      {/* Total score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mb-8"
      >
        <ScoreDisplay
          score={summary.totalScore}
          maxScore={summary.maxPossibleScore}
          animate={true}
          size="lg"
        />
      </motion.div>

      {/* Round cards */}
      <div className="w-full max-w-lg space-y-3 mb-8">
        {summary.rounds.map((round, i) => (
          <motion.div
            key={round.roundNumber}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            className="glass-card p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "var(--text-primary)",
                }}
              >
                {round.roundNumber}
              </div>
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {round.location || "Unknown Location"}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {round.country && `${round.country} \u00B7 `}
                  {round.era}
                  {round.hintUsed && (
                    <span style={{ color: "var(--accent-amber)" }}>
                      {" "}
                      (hint used)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {getScoreEmoji(round.score, round.maxScore)}
              </span>
              <ScoreDisplay
                score={round.score}
                maxScore={round.maxScore}
                animate={false}
                size="sm"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="flex flex-col gap-3 w-full max-w-lg"
      >
        {/* Share row */}
        <div className="flex gap-3">
          <button
            onClick={handleShareTwitter}
            className="flex-1 px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: "rgba(29, 161, 242, 0.15)",
              border: "1px solid rgba(29, 161, 242, 0.4)",
              color: "#1da1f2",
            }}
          >
            Share on X
          </button>
          <button
            onClick={handleCopyShare}
            className="flex-1 px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: copied
                ? "var(--accent-green)"
                : "rgba(255, 255, 255, 0.1)",
              border: `1px solid ${
                copied ? "var(--accent-green)" : "rgba(255, 255, 255, 0.2)"
              }`,
              color: copied ? "black" : "var(--text-primary)",
            }}
          >
            {copied ? "Copied!" : "Copy Results"}
          </button>
        </div>
        {/* Play Again */}
        <button
          onClick={() => {
            sessionStorage.removeItem("gameResults");
            router.push("/play");
          }}
          className="w-full px-6 py-3 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-cyan), #00c4ff)",
            color: "black",
            boxShadow: "0 0 30px rgba(0, 240, 255, 0.3)",
          }}
        >
          Play Again
        </button>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="mt-12 text-center"
      >
        <button
          onClick={() => router.push("/")}
          className="text-sm transition-colors cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
        >
          Back to Home
        </button>
      </motion.footer>
    </main>
  );
}
