"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addSticker, bumpStreak, markDailyPlayed } from "../../../lib/kid-storage";
import SafariBackground from "@/components/SafariBackground";
import MascotFeedback from "@/components/MascotFeedback";

const ROUNDS_PER_GAME = 3;

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

  // Map of option name → animalId (used for feedback guessId)
  const [optionIdMap] = useState<Map<string, string>>(new Map());

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
        setIsPlaying(false);
      });
    }
  }

  useEffect(() => {
    if (audioUrl) playAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Preload next round's audio during reveal phase
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
        /* best effort */
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

      if (data.correct) {
        addSticker(data.correctAnswer.id);
      }

      setStickers((prev) => [
        ...prev,
        {
          animalName: data.correctAnswer.name,
          emoji: data.correctAnswer.emoji,
          correct: data.correct,
          guessed: option,
        },
      ]);
    } catch (err) {
      console.error(err);
      setError("Oops, try again.");
      submitLockRef.current = false;
      setPickedOption(null);
    }
  }

  // Advance — called by MascotFeedback when audio finishes (or user hits skip/next)
  function advanceRound() {
    submitLockRef.current = false;
    if (
      revealData?.gameStatus === "finished" ||
      currentRound + 1 >= rounds.length
    ) {
      finishGame(revealData!);
    } else {
      setPickedOption(null);
      setRevealData(null);
      const next = currentRound + 1;
      setCurrentRound(next);
      loadAudio(rounds[next]);
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

  useEffect(() => {
    startGame();
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build a guessId (animalId) from the picked option name. We need
  // data/animals.json for the lookup — imported on the server in /api/animal/audio
  // but for the UI we can match from the current round options + correct answer.
  // Since /api/game/guess already tells us the correctAnswer.id, we derive guessId
  // differently: if the picked name IS the correct answer, guessId === correct.id;
  // otherwise we look up the id via a fetch (but for simplicity, pass the name
  // through — server-side /api/feedback does the lookup by name too).
  // To keep things tight, we stuff the id on the client via a small helper below.
  //
  // Simpler approach: load animals.json on the client for name → id lookup.
  // (Bundle impact is tiny — 55 animals.)
  useEffect(() => {
    (async () => {
      if (optionIdMap.size > 0) return;
      const mod = await import("../../../data/animals.json");
      const animals = (mod.default as { animals: { id: string; name: string }[] })
        .animals;
      for (const a of animals) optionIdMap.set(a.name, a.id);
    })();
  }, [optionIdMap]);

  const round = rounds[currentRound];
  const isLastRound = currentRound + 1 >= rounds.length;

  const guessIdForFeedback =
    pickedOption && revealData
      ? revealData.correct
        ? revealData.correctAnswer.id
        : optionIdMap.get(pickedOption) ?? null
      : null;

  return (
    <>
      <SafariBackground />
      <main className="relative z-10 min-h-screen flex flex-col items-center px-5 py-8">
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

        {error && (
          <div
            className="kid-card w-full max-w-md mb-6 text-center"
            style={{ borderColor: "var(--safari-coral)" }}
          >
            <p className="font-bold mb-3" style={{ color: "var(--safari-coral)" }}>{error}</p>
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
                      background: "var(--safari-gold)",
                      animation: `pulse-glow 1s ease-in-out ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
              <p
                className="font-display font-bold"
                style={{ color: "var(--safari-cream)" }}
              >
                Saddling up the safari...
              </p>
            </motion.div>
          )}

          {phase === "playing" && round && !revealData && (
            <motion.div
              key={`round-${currentRound}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-lg flex flex-col items-center gap-6"
            >
              <h2
                className="font-display text-3xl sm:text-4xl font-black text-center"
                style={{ color: "var(--safari-cream)" }}
              >
                What&apos;s this sound?
              </h2>

              <SpeakerCard
                onPlay={playAudio}
                playing={isPlaying}
                generating={isGenerating}
                failed={audioError}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {round.options.map((option) => {
                  const picked = pickedOption === option;
                  return (
                    <motion.button
                      key={option}
                      whileHover={pickedOption ? {} : { y: -2 }}
                      whileTap={pickedOption ? {} : { y: 2 }}
                      onClick={() => handlePick(option)}
                      disabled={!!pickedOption}
                      className="kid-tile font-display"
                      style={{
                        borderColor: picked ? "var(--safari-gold)" : undefined,
                        borderBottomColor: picked
                          ? "var(--safari-gold-d)"
                          : undefined,
                        background: picked
                          ? "rgba(244, 167, 43, 0.15)"
                          : undefined,
                      }}
                    >
                      <span className="flex-1">{option}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {phase === "playing" && revealData && (
            <MascotFeedback
              key={`reveal-${currentRound}`}
              animalId={revealData.correctAnswer.id}
              guessId={guessIdForFeedback}
              correct={revealData.correct}
              correctName={revealData.correctAnswer.name}
              correctEmoji={revealData.correctAnswer.emoji}
              pickedName={
                pickedOption && !revealData.correct ? pickedOption : null
              }
              isLastRound={isLastRound}
              onContinue={advanceRound}
            />
          )}
        </AnimatePresence>
      </main>
    </>
  );
}

/* ───────── Components ───────── */

function SpeakerCard({
  onPlay,
  playing,
  generating,
  failed,
}: {
  onPlay: () => void;
  playing: boolean;
  generating: boolean;
  failed: boolean;
}) {
  return (
    <motion.button
      whileHover={generating || failed ? {} : { scale: 1.02 }}
      whileTap={generating || failed ? {} : { scale: 0.97 }}
      onClick={onPlay}
      disabled={generating || failed}
      className="w-full rounded-3xl p-8 flex flex-col items-center gap-4 cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: playing
          ? "linear-gradient(135deg, var(--safari-gold), var(--safari-amber))"
          : "linear-gradient(135deg, var(--jungle-mid) 0%, var(--jungle) 100%)",
        borderBottom: `6px solid ${
          playing ? "var(--safari-amber-d)" : "var(--jungle-dark)"
        }`,
        color: "var(--safari-cream)",
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
          <p className="font-display text-lg font-black uppercase tracking-widest">
            Getting sound...
          </p>
        </>
      ) : failed ? (
        <>
          <div className="text-6xl" aria-hidden>
            🙈
          </div>
          <p className="font-display text-lg font-black uppercase tracking-widest text-center">
            Sound not ready — pick anyway!
          </p>
        </>
      ) : (
        <>
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
          <p className="font-display text-lg font-black uppercase tracking-widest">
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
        let bg = "rgba(255, 244, 214, 0.1)";
        let border = "rgba(255, 244, 214, 0.2)";
        let label: string | null = null;
        if (played) {
          if (played.correct) {
            bg = "var(--leaf-bright)";
            border = "var(--leaf-shadow)";
            label = "✓";
          } else {
            bg = "var(--safari-coral)";
            border = "var(--safari-coral-d)";
            label = "✗";
          }
        } else if (isCurrent) {
          bg = "var(--safari-gold)";
          border = "var(--safari-gold-d)";
        }
        return (
          <div
            key={i}
            className="w-8 h-8 rounded-full flex items-center justify-center font-display font-black text-sm text-white"
            style={{
              background: bg,
              borderBottom: `3px solid ${border}`,
              opacity: played || isCurrent ? 1 : 0.65,
            }}
          >
            {label ?? ""}
          </div>
        );
      })}
    </div>
  );
}
