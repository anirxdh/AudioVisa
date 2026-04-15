"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Mascot feedback card shown on the reveal phase.
 *
 * Flow:
 *   1. Mount with { animalId, guessId, correct } → fetch /api/feedback.
 *   2. When audio arrives, play it and animate the mascot "talking".
 *   3. The "Next" button is disabled until audio ends (or user skips after 2s).
 *   4. onContinue is the parent's handler that advances to next round.
 */

interface MascotFeedbackProps {
  animalId: string;
  guessId: string | null;
  correct: boolean;
  correctName: string;
  correctEmoji: string;
  pickedName: string | null;
  isLastRound: boolean;
  onContinue: () => void;
}

export default function MascotFeedback({
  animalId,
  guessId,
  correct,
  correctName,
  correctEmoji,
  pickedName,
  isLastRound,
  onContinue,
}: MascotFeedbackProps) {
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioEnded, setAudioEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [skipAllowed, setSkipAllowed] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fetchedRef = useRef(false);

  // Allow "skip" after 2s for impatient kids/parents
  useEffect(() => {
    const t = setTimeout(() => setSkipAllowed(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Fetch feedback on mount (StrictMode-safe)
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animalId, guessId, correct }),
        });
        if (!res.ok) throw new Error("feedback failed");
        const data = await res.json();
        if (cancelled) return;
        setText(data.text);
        setAudioDataUrl(data.audioDataUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [animalId, guessId, correct]);

  // Play audio when URL arrives
  useEffect(() => {
    if (!audioDataUrl) return;
    const audio = new Audio(audioDataUrl);
    audioRef.current = audio;
    const onEnded = () => {
      setIsPlaying(false);
      setAudioEnded(true);
    };
    const onError = () => {
      setIsPlaying(false);
      setAudioEnded(true); // unblock Next button
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.play().then(
      () => setIsPlaying(true),
      () => {
        // Autoplay blocked — unlock Next so the user can continue
        setAudioEnded(true);
      }
    );
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [audioDataUrl]);

  // If OpenAI/ElevenLabs failed, auto-unlock so the game never stalls
  useEffect(() => {
    if (error) setAudioEnded(true);
  }, [error]);

  const canAdvance = audioEnded || skipAllowed || error;

  function handleContinue() {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onContinue();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full max-w-lg flex flex-col items-center gap-5"
    >
      {/* Outcome banner + big emoji */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="flex flex-col items-center gap-2"
      >
        <motion.span
          className="text-7xl"
          animate={isPlaying ? { y: [0, -6, 0] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          {correctEmoji}
        </motion.span>
        <div
          className="px-5 py-1.5 rounded-full font-display font-black text-sm uppercase tracking-widest"
          style={{
            background: correct
              ? "rgba(136, 195, 74, 0.2)"
              : "rgba(231, 111, 81, 0.2)",
            border: `2px solid ${correct ? "var(--leaf-bright)" : "var(--safari-coral)"}`,
            color: correct ? "var(--leaf-bright)" : "var(--safari-coral)",
          }}
        >
          {correct ? "✓ Correct!" : "Not quite"}
        </div>
        <h3
          className="font-display text-3xl font-black text-center"
          style={{ color: "var(--safari-cream)" }}
        >
          {correctName}
        </h3>
        {!correct && pickedName && (
          <p className="text-sm font-bold" style={{ color: "var(--safari-coral)" }}>
            You picked: {pickedName}
          </p>
        )}
      </motion.div>

      {/* Mascot speech bubble */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="w-full rounded-3xl p-5 flex items-start gap-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 244, 214, 0.98) 0%, rgba(235, 215, 167, 0.96) 100%)",
          border: "2px solid var(--safari-gold)",
          borderBottomWidth: "5px",
          borderBottomColor: "var(--safari-gold-d)",
          color: "var(--jungle-deep)",
        }}
      >
        {/* Mascot avatar */}
        <motion.div
          animate={
            isPlaying
              ? { rotate: [-3, 3, -3], scale: [1, 1.05, 1] }
              : { rotate: 0, scale: 1 }
          }
          transition={{ duration: 0.6, repeat: isPlaying ? Infinity : 0 }}
          className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
          style={{
            background: "var(--safari-gold)",
            border: "2px solid var(--safari-gold-d)",
          }}
        >
          🦉
        </motion.div>

        {/* Bubble content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center gap-2 h-6">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "var(--jungle-dark)",
                    animation: `pulse-glow 1s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm font-bold">
              {correct
                ? `Yes! Great job — that&apos;s a ${correctName}!`
                : `Not quite — the answer was ${correctName}.`}
            </p>
          ) : (
            <AnimatePresence>
              <motion.p
                key="text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="text-base font-bold leading-snug"
              >
                {text}
              </motion.p>
            </AnimatePresence>
          )}

          {/* Speaker indicator */}
          {isPlaying && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-xs font-black uppercase tracking-widest opacity-70">
                🔊 Speaking
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Next / Skip button */}
      <div className="w-full flex flex-col sm:flex-row gap-3 items-center justify-center">
        <motion.button
          onClick={handleContinue}
          disabled={!canAdvance}
          whileHover={canAdvance ? { y: -2, scale: 1.02 } : {}}
          whileTap={canAdvance ? { y: 2, scale: 0.98 } : {}}
          className="kid-btn font-display"
          style={{
            background: canAdvance
              ? "linear-gradient(135deg, var(--safari-gold) 0%, var(--safari-amber) 100%)"
              : "rgba(255, 244, 214, 0.15)",
            borderBottomColor: canAdvance
              ? "var(--safari-amber-d)"
              : "rgba(255, 244, 214, 0.2)",
            color: canAdvance ? "var(--jungle-deep)" : "var(--text-muted)",
            padding: "1rem 2rem",
            fontSize: "1.05rem",
            minWidth: "220px",
          }}
        >
          {!canAdvance
            ? "Listen..."
            : isLastRound
            ? "See my safari log →"
            : "Next round →"}
        </motion.button>
      </div>
    </motion.div>
  );
}
