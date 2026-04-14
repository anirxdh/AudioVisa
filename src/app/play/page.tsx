"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addSticker, bumpStreak, markDailyPlayed } from "../../../lib/kid-storage";

const ROUNDS_PER_GAME = 3;
const REVEAL_MS = 2200;

interface Round {
  roundNumber: number;
  animalId: string;
  audioUrl: string | null;
  options: string[];
}

interface CorrectAnswer {
  id: string;
  name: string;
  emoji: string;
  category: string;
  description: string;
  funFact: string;
}

interface RoundResult {
  score: number;
  correct: boolean;
  correctAnswer: CorrectAnswer;
  totalScore: number;
  gameStatus: string;
  performanceRating: string | null;
}

interface StickerEntry {
  animalName: string;
  emoji: string | null;
  correct: boolean;
  guessed: string | null;
}

type Mode = "daily" | "practice" | "challenge";

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayPageInner />
    </Suspense>
  );
}

function PlayPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const challengeId = searchParams.get("challenge");
  const mode: Mode = challengeId
    ? "challenge"
    : modeParam === "practice"
    ? "practice"
    : "daily";

  const [gameId, setGameId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<"loading" | "playing" | "done">("loading");

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [revealData, setRevealData] = useState<RoundResult | null>(null);
  const [stickers, setStickers] = useState<StickerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  // ─── Start game ────────────────────────────────────────
  const startGame = useCallback(async () => {
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, challengeId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to start");
      }
      const data = await res.json();
      setGameId(data.gameId);
      setRounds(data.rounds);
      setCurrentRound(0);
      setStickers([]);
      await loadAudio(data.rounds[0]);
      setPhase("playing");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, challengeId]);

  async function loadAudio(round: Round) {
    setAudioUrl(null);
    setAudioError(false);
    setIsGenerating(!round.audioUrl);
    try {
      if (round.audioUrl) {
        setAudioUrl(round.audioUrl);
      } else {
        const res = await fetch("/api/animal/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animalId: round.animalId }),
        });
        if (!res.ok) throw new Error("audio fetch failed");
        const data = await res.json();
        setAudioUrl(data.audioUrl);
        setRounds((prev) =>
          prev.map((r) =>
            r.animalId === round.animalId ? { ...r, audioUrl: data.audioUrl } : r
          )
        );
      }
    } catch {
      setAudioError(true);
    } finally {
      setIsGenerating(false);
    }
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }

  function playAudio() {
    if (!audioUrl) return;
    if (!audioRef.current || audioRef.current.src !== audioUrl) {
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(audioUrl);
      a.addEventListener("ended", () => setIsPlaying(false));
      a.addEventListener("error", () => {
        setAudioError(true);
        setIsPlaying(false);
      });
      audioRef.current = a;
    }
    const promise = audioRef.current.play();
    setIsPlaying(true);
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        setIsPlaying(false); // autoplay blocked; user taps to play
      });
    }
  }

  // Auto-play the current round's sound once the URL arrives
  useEffect(() => {
    if (audioUrl) playAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Preload the next round's audio while the user is revealing
  useEffect(() => {
    if (!revealData) return;
    const next = rounds[currentRound + 1];
    if (!next || next.audioUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/animal/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animalId: next.animalId }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setRounds((prev) =>
          prev.map((r) =>
            r.animalId === next.animalId ? { ...r, audioUrl: data.audioUrl } : r
          )
        );
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revealData, rounds, currentRound]);

  // ─── Pick an animal ────────────────────────────────────
  async function handlePick(option: string) {
    if (!gameId || pickedOption || submitLockRef.current) return;
    submitLockRef.current = true;
    setPickedOption(option);
    stopAudio();
    try {
      const res = await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, roundIndex: currentRound, guess: option }),
      });
      if (!res.ok) throw new Error("submit failed");
      const data: RoundResult = await res.json();
      setRevealData(data);

      // Persistent sticker collection — only on correct
      if (data.correct) {
        addSticker(data.correctAnswer.id);
      }

      // Record sticker
      setStickers((prev) => [
        ...prev,
        {
          animalName: data.correctAnswer.name,
          emoji: data.correctAnswer.emoji,
          correct: data.correct,
          guessed: option,
        },
      ]);

      // Auto-advance
      setTimeout(() => {
        submitLockRef.current = false;
        if (data.gameStatus === "finished" || currentRound + 1 >= rounds.length) {
          finishGame(data);
        } else {
          setPickedOption(null);
          setRevealData(null);
          const next = currentRound + 1;
          setCurrentRound(next);
          loadAudio(rounds[next]);
        }
      }, REVEAL_MS);
    } catch (err) {
      console.error(err);
      setError("Oops, try again.");
      submitLockRef.current = false;
      setPickedOption(null);
    }
  }

  function finishGame(lastResult: RoundResult) {
    let newStreak = 0;
    if (mode === "daily") {
      markDailyPlayed();
      newStreak = bumpStreak().count;
    }
    const payload = {
      gameId,
      mode,
      challengeId,
      totalScore: lastResult.totalScore,
      performanceRating: lastResult.performanceRating,
      stickers,
      streak: newStreak,
    };
    sessionStorage.setItem("gameResults", JSON.stringify(payload));
    router.push("/results");
  }

  // ─── Lifecycle ────────────────────────────────────────
  useEffect(() => {
    startGame();
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const round = rounds[currentRound];

  // ─── Render ───────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-6 sm:py-8">
      {/* Top bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <button
          onClick={() => {
            stopAudio();
            router.push("/");
          }}
          className="kid-btn-soft"
          style={{ padding: "0.5rem 0.9rem", fontSize: "0.85rem" }}
        >
          ← Home
        </button>
        <ProgressPips
          total={ROUNDS_PER_GAME}
          current={currentRound}
          stickers={stickers}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="kid-card w-full max-w-md mb-6 text-center"
          style={{ borderColor: "var(--kid-red)" }}
        >
          <p className="font-bold mb-3" style={{ color: "var(--kid-red)" }}>{error}</p>
          <button
            onClick={() => {
              setError(null);
              if (!gameId) startGame();
            }}
            className="kid-btn"
            style={{
              background: "var(--kid-blue)",
              borderBottomColor: "var(--kid-blue-d)",
            }}
          >
            Try again
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center flex-1 gap-4"
          >
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
            <p className="font-bold" style={{ color: "var(--text-secondary)" }}>
              Getting sounds ready...
            </p>
          </motion.div>
        )}

        {phase === "playing" && round && (
          <motion.div
            key={`round-${currentRound}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-lg flex flex-col items-center gap-6"
          >
            {/* Prompt */}
            <h2
              className="text-2xl sm:text-3xl font-black text-center"
              style={{ color: "var(--text-primary)" }}
            >
              What&apos;s this sound?
            </h2>

            {/* Speaker card */}
            <SpeakerCard
              onPlay={playAudio}
              playing={isPlaying}
              generating={isGenerating}
              failed={audioError}
              disabled={!!revealData}
            />

            {/* 4 tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {round.options.map((option) => {
                const picked = pickedOption === option;
                const isCorrect = revealData?.correct && picked;
                const isWrong = revealData && picked && !revealData.correct;
                const isCorrectReveal =
                  revealData && option === revealData.correctAnswer.name;

                let tileStyle: React.CSSProperties = {};
                if (isCorrect || isCorrectReveal) {
                  tileStyle = {
                    background: "var(--kid-green)",
                    borderColor: "var(--kid-green)",
                    borderBottomColor: "var(--kid-green-d)",
                    color: "#ffffff",
                  };
                } else if (isWrong) {
                  tileStyle = {
                    background: "var(--kid-red)",
                    borderColor: "var(--kid-red)",
                    borderBottomColor: "var(--kid-red-d)",
                    color: "#ffffff",
                  };
                } else if (picked) {
                  tileStyle = {
                    borderColor: "var(--kid-blue)",
                    borderBottomColor: "var(--kid-blue-d)",
                  };
                }

                return (
                  <motion.button
                    key={option}
                    whileHover={revealData ? {} : { y: -2 }}
                    whileTap={revealData ? {} : { y: 2 }}
                    onClick={() => handlePick(option)}
                    disabled={!!revealData || !!pickedOption}
                    className={`kid-tile ${isWrong ? "animate-shake" : ""}`}
                    style={tileStyle}
                  >
                    {/* Leading emoji — only show on reveal so kids can't cheat */}
                    {(isCorrectReveal || isCorrect || isWrong) && revealData?.correctAnswer.emoji && option === revealData?.correctAnswer.name && (
                      <span className="text-3xl">{revealData.correctAnswer.emoji}</span>
                    )}
                    <span className="flex-1">{option}</span>
                    {isCorrectReveal && (
                      <span className="text-2xl" aria-hidden>✓</span>
                    )}
                    {isWrong && (
                      <span className="text-2xl" aria-hidden>✗</span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Reveal message */}
            {revealData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="text-6xl mb-2 animate-bounce-in" aria-hidden>
                  {revealData.correctAnswer.emoji}
                </div>
                <p
                  className="text-2xl font-black"
                  style={{
                    color: revealData.correct ? "var(--kid-green)" : "var(--kid-red)",
                  }}
                >
                  {revealData.correct ? "🎉 Yes!" : "So close!"}
                </p>
                <p className="text-base font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                  It&apos;s a {revealData.correctAnswer.name}!
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ───────── Components ───────── */

function SpeakerCard({
  onPlay,
  playing,
  generating,
  failed,
  disabled,
}: {
  onPlay: () => void;
  playing: boolean;
  generating: boolean;
  failed: boolean;
  disabled: boolean;
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={disabled ? undefined : onPlay}
      disabled={disabled || generating || failed}
      className="w-full rounded-3xl p-8 flex flex-col items-center gap-4 cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: playing ? "var(--kid-yellow)" : "var(--kid-blue)",
        borderBottom: `6px solid ${
          playing ? "var(--kid-yellow-d)" : "var(--kid-blue-d)"
        }`,
        color: "#ffffff",
        minHeight: "180px",
        transition: "background 0.2s ease",
      }}
    >
      {generating ? (
        <>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-white"
                style={{
                  animation: `pulse-glow 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
          <p className="text-lg font-black uppercase tracking-widest">
            Getting sound...
          </p>
        </>
      ) : failed ? (
        <>
          <div className="text-6xl" aria-hidden>🙈</div>
          <p className="text-lg font-black uppercase tracking-widest text-center">
            Sound not ready — pick anyway!
          </p>
        </>
      ) : (
        <>
          {/* Animated equalizer bars */}
          <div className="flex items-end gap-1 h-14">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const base = 20 + Math.sin(i * 0.9) * 18 + 30;
              return (
                <div
                  key={i}
                  className="w-2.5 rounded-full bg-white"
                  style={{
                    height: `${base}%`,
                    opacity: playing ? 0.95 : 0.55,
                    animation: playing
                      ? `pulse-glow ${0.7 + i * 0.07}s ease-in-out ${i * 0.08}s infinite`
                      : "none",
                  }}
                />
              );
            })}
          </div>
          <p className="text-lg font-black uppercase tracking-widest">
            {playing ? "🔊 Listening..." : "🎵 Tap to listen"}
          </p>
        </>
      )}
    </motion.button>
  );
}

function ProgressPips({
  total,
  current,
  stickers,
}: {
  total: number;
  current: number;
  stickers: StickerEntry[];
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }, (_, i) => {
        const played = stickers[i];
        const isCurrent = i === current && !played;
        let bg = "#e5e5e5";
        let border = "#d9d9d9";
        let label: string | null = null;
        if (played) {
          if (played.correct) {
            bg = "var(--kid-green)";
            border = "var(--kid-green-d)";
            label = "✓";
          } else {
            bg = "var(--kid-red)";
            border = "var(--kid-red-d)";
            label = "✗";
          }
        } else if (isCurrent) {
          bg = "var(--kid-blue)";
          border = "var(--kid-blue-d)";
        }
        return (
          <div
            key={i}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm"
            style={{
              background: bg,
              borderBottom: `3px solid ${border}`,
              opacity: played || isCurrent ? 1 : 0.6,
            }}
          >
            {label ?? ""}
          </div>
        );
      })}
    </div>
  );
}
