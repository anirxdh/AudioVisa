"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Mascot feedback card shown on the reveal phase.
 *
 * UX flow:
 *   1. Visual reveal (emoji, correct/wrong) appears INSTANTLY.
 *   2. /api/feedback was pre-warmed during the round, so text + audio
 *      arrive in ~100-200ms (Upstash cache hit).
 *   3. Speech bubble fades in, audio plays, owl wiggles.
 *   4. Next button is disabled WHILE audio is playing.
 *   5. "Skip" link appears after 1.5s for impatient parents.
 *   6. If fetch failed or audio never arrives, Next unlocks after 2s max.
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
  const [text, setText] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioEnded, setAudioEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [skipReady, setSkipReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fetchedRef = useRef(false);

  // Skip available after 1.5s for parents who want to hurry
  useEffect(() => {
    const t = setTimeout(() => setSkipReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Hard timeout: if feedback never arrives, unlock after 2s
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Fetch feedback — should be a cache hit (pre-warmed) = ~100ms
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
        if (!cancelled) setTimedOut(true); // unlock Next
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [animalId, guessId, correct]);

  // Play audio as soon as it arrives
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
      setAudioEnded(true);
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.play().then(
      () => setIsPlaying(true),
      () => {
        setIsPlaying(false);
        setAudioEnded(true); // autoplay blocked → unlock
      }
    );
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [audioDataUrl]);

  const canAdvance = audioEnded || skipReady || timedOut;

  function handleContinue() {
    if (audioRef.current) audioRef.current.pause();
    onContinue();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full max-w-lg flex flex-col items-center gap-5"
    >
      {/* Outcome banner + big emoji — INSTANT */}
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

      {/* Mascot speech bubble — fades in when text arrives */}
      <AnimatePresence>
        {text && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
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
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold leading-snug">{text}</p>
              {isPlaying && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs font-black uppercase tracking-widest opacity-65">
                    🔊 speaking
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button — locked during audio, skip available after 1.5s */}
      <div className="flex flex-col items-center gap-2">
        <motion.button
          onClick={canAdvance ? handleContinue : undefined}
          disabled={!canAdvance}
          whileHover={canAdvance ? { y: -2, scale: 1.02 } : {}}
          whileTap={canAdvance ? { y: 2, scale: 0.98 } : {}}
          className="kid-btn font-display disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: canAdvance
              ? "linear-gradient(135deg, var(--safari-gold) 0%, var(--safari-amber) 100%)"
              : "rgba(244, 167, 43, 0.25)",
            borderBottomColor: canAdvance
              ? "var(--safari-amber-d)"
              : "rgba(244, 167, 43, 0.15)",
            color: canAdvance ? "var(--jungle-deep)" : "rgba(255, 244, 214, 0.5)",
            padding: "1rem 2rem",
            fontSize: "1.05rem",
            minWidth: "220px",
          }}
        >
          {!canAdvance
            ? "🔊 Listen..."
            : isLastRound
            ? "See my safari log →"
            : "Next round →"}
        </motion.button>

        {/* Subtle skip link for parents who want to hurry */}
        {!canAdvance && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: skipReady ? 0.7 : 0 }}
            onClick={skipReady ? handleContinue : undefined}
            className="text-xs font-bold uppercase tracking-widest cursor-pointer"
            style={{ color: "rgba(255, 244, 214, 0.5)" }}
          >
            skip →
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
