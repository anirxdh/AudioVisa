"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AudioPlayer from "@/components/AudioPlayer";
import ScoreDisplay from "@/components/ScoreDisplay";
import RoundIndicator from "@/components/RoundIndicator";

// ---- Types ----

interface AudioUrls {
  sfx: string[];
  music: string;
}

interface GameRound {
  roundNumber: number;
  sceneId: string;
  audioUrls: AudioUrls | null;
}

interface CorrectAnswer {
  location: string;
  country: string;
  continent: string;
  era: string;
  description: string;
  sounds: string[];
}

interface RoundResult {
  score: number;
  maxScore: number;
  correctAnswer: CorrectAnswer;
  totalScore: number;
  gameStatus: string;
  performanceRating: string | null;
}

interface RoundScore {
  score: number;
  maxScore: number;
}

type GamePhase = "loading" | "listening" | "guessing" | "revealing" | "finished";

// ---- Decade options ----
const DECADES = [
  "1800s", "1850s", "1900s", "1920s", "1940s", "1950s",
  "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s",
];

// ---- Component ----

export default function PlayPage() {
  const router = useRouter();

  // Game state
  const [gameId, setGameId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [totalScore, setTotalScore] = useState(0);

  // Round state
  const [currentAudioUrls, setCurrentAudioUrls] = useState<AudioUrls | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [locationGuess, setLocationGuess] = useState("");
  const [eraGuess, setEraGuess] = useState("1990s");
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roundScores, setRoundScores] = useState<(RoundScore | null)[]>([
    null, null, null, null, null,
  ]);
  const [error, setError] = useState<string | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);

  // ---- API helpers ----

  const startGame = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setAudioFailed(false);
    try {
      const res = await fetch("/api/game/start", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start game");
      const data = await res.json();
      setGameId(data.gameId);
      setRounds(data.rounds);
      setCurrentRound(0);
      setTotalScore(0);
      setRoundScores([null, null, null, null, null]);

      // Transition to listening, load audio for first round
      await loadAudioForRound(data.rounds[0], data.gameId);
    } catch (err) {
      setPhase("loading");
      setError("Failed to start game. Please try again.");
      console.error(err);
    }
  }, []);

  async function loadAudioForRound(round: GameRound, gId?: string) {
    setCurrentAudioUrls(null);
    setLocationGuess("");
    setEraGuess("1990s");
    setHintText(null);
    setHintUsed(false);
    setRoundResult(null);
    setAudioFailed(false);
    setError(null);

    if (round.audioUrls) {
      setCurrentAudioUrls(round.audioUrls);
      setPhase("listening");
      return;
    }

    // Generate audio on demand
    setIsGeneratingAudio(true);
    setPhase("listening");
    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId: round.sceneId }),
      });
      if (!res.ok) throw new Error("Failed to generate audio");
      const audioData = await res.json();
      setCurrentAudioUrls(audioData);

      // Update the round in state
      setRounds((prev) =>
        prev.map((r) =>
          r.sceneId === round.sceneId ? { ...r, audioUrls: audioData } : r
        )
      );
    } catch (err) {
      console.error("Audio generation failed:", err);
      // Mark audio as failed — user can skip to guessing
      setCurrentAudioUrls(null);
      setAudioFailed(true);
    } finally {
      setIsGeneratingAudio(false);
    }
  }

  async function handleUseHint() {
    if (!gameId || hintUsed) return;
    try {
      const res = await fetch("/api/game/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, roundIndex: currentRound }),
      });
      if (!res.ok) throw new Error("Failed to get hint");
      const data = await res.json();
      setHintText(data.textHint);
      setHintUsed(true);
    } catch (err) {
      console.error("Hint failed:", err);
    }
  }

  async function handleSubmitGuess() {
    if (!gameId || !locationGuess.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          roundIndex: currentRound,
          guess: { location: locationGuess.trim(), era: eraGuess },
        }),
      });
      if (!res.ok) throw new Error("Failed to submit guess");
      const data: RoundResult = await res.json();
      setRoundResult(data);
      setTotalScore(data.totalScore);

      // Update round scores
      setRoundScores((prev) => {
        const next = [...prev];
        next[currentRound] = { score: data.score, maxScore: data.maxScore };
        return next;
      });

      setPhase("revealing");
    } catch (err) {
      console.error("Guess failed:", err);
      setError("Failed to submit guess. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextRound() {
    const nextRound = currentRound + 1;
    if (nextRound >= rounds.length || roundResult?.gameStatus === "finished") {
      // Save results and go to results page
      const resultsData = {
        gameId,
        totalScore: roundResult?.totalScore ?? totalScore,
        performanceRating: roundResult?.performanceRating,
        roundScores: roundScores.map((rs, i) => ({
          ...rs,
          roundNumber: i + 1,
        })),
      };
      sessionStorage.setItem("gameResults", JSON.stringify(resultsData));
      router.push("/results");
      return;
    }
    setCurrentRound(nextRound);
    loadAudioForRound(rounds[nextRound]);
  }

  // ---- Start game on mount ----
  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Render ----

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--accent-cyan)" }}
          >
            SoundGuessr
          </h1>
          {gameId && (
            <RoundIndicator
              currentRound={currentRound}
              totalRounds={5}
              roundScores={roundScores}
            />
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="glass-card p-4 mb-6 max-w-2xl w-full text-center"
          style={{ borderColor: "var(--accent-red)" }}
        >
          <p style={{ color: "var(--accent-red)" }}>{error}</p>
          <div className="flex gap-3 justify-center mt-3">
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                color: "var(--text-primary)",
              }}
            >
              Dismiss
            </button>
            {!gameId ? (
              <button
                onClick={() => {
                  setError(null);
                  startGame();
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: "var(--accent-cyan)", color: "black" }}
              >
                Try Again
              </button>
            ) : (
              <button
                onClick={() => {
                  setError(null);
                  // Retry the guess submission
                  if (phase === "guessing" && locationGuess.trim()) {
                    handleSubmitGuess();
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: "var(--accent-cyan)", color: "black" }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Loading */}
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
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: "var(--accent-cyan)",
                    animation: `pulse-glow 1s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <p style={{ color: "var(--text-secondary)" }}>
              Preparing your game...
            </p>
          </motion.div>
        )}

        {/* Listening */}
        {phase === "listening" && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl flex flex-col items-center gap-6"
          >
            <h2
              className="text-2xl font-semibold text-center"
              style={{ color: "var(--text-primary)" }}
            >
              Listen carefully...
            </h2>

            {isGeneratingAudio && (
              <div className="glass-card p-4 text-center w-full max-w-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "var(--accent-amber)",
                      animation: "pulse-glow 1s ease-in-out infinite",
                    }}
                  />
                  <span style={{ color: "var(--accent-amber)" }}>
                    Generating soundscape...
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Creating a unique audio scene just for you
                </p>
              </div>
            )}

            {audioFailed && !currentAudioUrls && (
              <div
                className="glass-card p-4 text-center w-full max-w-lg"
                style={{
                  borderColor: "var(--accent-amber)",
                }}
              >
                <p className="text-sm mb-2" style={{ color: "var(--accent-amber)" }}>
                  Audio generation unavailable. You can still guess based on your instincts!
                </p>
                <button
                  onClick={() => setPhase("guessing")}
                  className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    background: "var(--accent-amber)",
                    color: "black",
                  }}
                >
                  Skip to Guess
                </button>
              </div>
            )}

            {!audioFailed && (
              <AudioPlayer
                audioUrls={currentAudioUrls}
                onFinished={() => {}}
              />
            )}

            <button
              onClick={() => setPhase("guessing")}
              className="px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "var(--text-primary)",
              }}
            >
              Ready to Guess
            </button>
          </motion.div>
        )}

        {/* Guessing */}
        {phase === "guessing" && (
          <motion.div
            key="guessing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl flex flex-col items-center gap-6"
          >
            <h2
              className="text-2xl font-semibold text-center"
              style={{ color: "var(--text-primary)" }}
            >
              Where is this?
            </h2>

            {/* Mini audio player — can re-listen */}
            <div className="w-full max-w-lg">
              <AudioPlayer audioUrls={currentAudioUrls} />
            </div>

            {/* Guess form */}
            <div className="glass-card p-6 w-full max-w-lg space-y-5">
              {/* Location input */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Location
                </label>
                <input
                  type="text"
                  value={locationGuess}
                  onChange={(e) => setLocationGuess(e.target.value)}
                  placeholder="Where is this? (e.g., Tokyo, Japan)"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan transition-all"
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && locationGuess.trim()) {
                      handleSubmitGuess();
                    }
                  }}
                />
              </div>

              {/* Decade selector */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Decade
                </label>
                <select
                  value={eraGuess}
                  onChange={(e) => setEraGuess(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {DECADES.map((d) => (
                    <option key={d} value={d} style={{ background: "#1a1a2e" }}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hint */}
              {hintText && (
                <div
                  className="p-3 rounded-xl text-sm"
                  style={{
                    background: "rgba(255, 165, 0, 0.1)",
                    border: "1px solid rgba(255, 165, 0, 0.3)",
                    color: "var(--accent-amber)",
                  }}
                >
                  {hintText}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {!hintUsed && (
                  <button
                    onClick={handleUseHint}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    style={{
                      background: "rgba(255, 165, 0, 0.1)",
                      border: "1px solid rgba(255, 165, 0, 0.3)",
                      color: "var(--accent-amber)",
                    }}
                  >
                    Use Hint (-200 pts)
                  </button>
                )}
                <button
                  onClick={handleSubmitGuess}
                  disabled={!locationGuess.trim() || isSubmitting}
                  className="flex-1 px-4 py-3 rounded-xl text-lg font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent-cyan), #00c4ff)",
                    color: "black",
                  }}
                >
                  {isSubmitting ? "Scoring..." : "Submit Guess"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Revealing */}
        {phase === "revealing" && roundResult && (
          <motion.div
            key="revealing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl flex flex-col items-center gap-6"
          >
            {/* Score */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <ScoreDisplay
                score={roundResult.score}
                maxScore={roundResult.maxScore}
                animate={true}
                size="lg"
              />
            </motion.div>

            {/* Correct answer card */}
            <div className="glass-card p-6 w-full max-w-lg space-y-4">
              <div>
                <span
                  className="text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Correct Answer
                </span>
                <h3 className="text-xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                  {roundResult.correctAnswer.location}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {roundResult.correctAnswer.country} &middot;{" "}
                  {roundResult.correctAnswer.continent} &middot;{" "}
                  {roundResult.correctAnswer.era}
                </p>
              </div>

              {/* Your guess */}
              <div>
                <span
                  className="text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Your Guess
                </span>
                <p className="text-sm mt-1" style={{ color: "var(--text-primary)" }}>
                  {locationGuess} &middot; {eraGuess}
                </p>
              </div>

              {/* Description */}
              <p
                className="text-sm italic leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                &ldquo;{roundResult.correctAnswer.description}&rdquo;
              </p>

              {/* Sounds */}
              <div>
                <span
                  className="text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Sounds you heard
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {roundResult.correctAnswer.sounds.map((sound, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: "rgba(0, 240, 255, 0.1)",
                        border: "1px solid rgba(0, 240, 255, 0.2)",
                        color: "var(--accent-cyan)",
                      }}
                    >
                      {sound}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Running total */}
            <div className="text-center">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Total Score
              </span>
              <ScoreDisplay
                score={roundResult.totalScore}
                maxScore={5000}
                animate={true}
                size="sm"
              />
            </div>

            {/* Next button */}
            <button
              onClick={handleNextRound}
              className="px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-cyan), #00c4ff)",
                color: "black",
                boxShadow: "0 0 30px rgba(0, 240, 255, 0.3)",
              }}
            >
              {currentRound + 1 >= rounds.length ||
              roundResult.gameStatus === "finished"
                ? "See Results"
                : "Next Round"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
