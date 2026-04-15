"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import animalsData from "../../data/animals.json";
import type { Animal, AnimalCategory } from "../../types/animal";
import {
  NICKNAME_RE,
  getNickname,
  setNickname as persistNickname,
  getDisplayStreak,
  getStickers,
  hasPlayedDailyToday,
  todayISODate,
} from "../../lib/kid-storage";
import HeroVideoOnce from "@/components/HeroVideoOnce";
import SafariBackground from "@/components/SafariBackground";

// SSR-safe dynamic import for the 3D mascot (three.js is a client-only lib)
const FloatingMascot3D = dynamic(
  () => import("@/components/FloatingMascot3D"),
  { ssr: false, loading: () => null }
);
const ParallaxSilhouettes3D = dynamic(
  () => import("@/components/ParallaxSilhouettes3D"),
  { ssr: false, loading: () => null }
);

const ANIMALS = (animalsData as { animals: Animal[] }).animals;

function pickAnimalOfDay(date: string): Animal {
  let h = 2166136261 >>> 0;
  const key = `aotd-${date}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ANIMALS[h % ANIMALS.length];
}

const BIOMES: {
  id: AnimalCategory;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: "farm", label: "Farm", emoji: "🚜", color: "#f4a72b" },
  { id: "pets", label: "Pets", emoji: "🐕", color: "#b07cd6" },
  { id: "wild", label: "Wild", emoji: "🌳", color: "#88c34a" },
  { id: "birds", label: "Birds", emoji: "🦜", color: "#3fb3c4" },
  { id: "ocean", label: "Ocean", emoji: "🌊", color: "#2a8fa0" },
  { id: "reptiles", label: "Reptiles", emoji: "🐢", color: "#5f8c3f" },
  { id: "insects", label: "Insects", emoji: "🐛", color: "#ff9600" },
];

function useCountdownToNextDay(): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function update() {
      const now = new Date();
      const tomorrow = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0, 0, 0
        )
      );
      const ms = tomorrow.getTime() - now.getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

export default function Home() {
  const router = useRouter();
  const [nick, setNick] = useState("");
  const [nickSaved, setNickSaved] = useState(false);
  const [dailyDone, setDailyDone] = useState(false);
  const [dailyReady, setDailyReady] = useState(false);
  const [navigating, setNavigating] = useState<null | "daily" | "practice">(null);
  const [streak, setStreak] = useState(0);
  const [stickers, setStickers] = useState<Set<string>>(new Set());
  const countdown = useCountdownToNextDay();
  const aotd = useMemo(() => pickAnimalOfDay(todayISODate()), []);

  useEffect(() => {
    setNick(getNickname());
    setStreak(getDisplayStreak());
    setStickers(getStickers());
    setDailyDone(hasPlayedDailyToday());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/daily/preview");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const urls = (data.rounds ?? [])
          .map((r: { audioUrl: string | null }) => r.audioUrl)
          .filter((u: string | null): u is string => !!u);
        for (const url of urls) {
          const a = new Audio();
          a.preload = "auto";
          a.src = url;
        }
      } catch {
        /* best effort */
      } finally {
        if (!cancelled) setDailyReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleNickChange(value: string) {
    setNick(value);
    if (NICKNAME_RE.test(value.trim())) {
      persistNickname(value);
      setNickSaved(true);
      setTimeout(() => setNickSaved(false), 1400);
    }
  }

  function startMode(mode: "daily" | "practice") {
    if (mode === "daily" && !nick.trim()) {
      document.getElementById("nick-input")?.focus();
      return;
    }
    setNavigating(mode);
    router.push(`/play?mode=${mode}`);
  }

  const stickersByBiome = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of stickers) {
      const animal = ANIMALS.find((a) => a.id === id);
      if (!animal) continue;
      map.set(animal.category, (map.get(animal.category) ?? 0) + 1);
    }
    return map;
  }, [stickers]);

  const biomeTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of ANIMALS) map.set(a.category, (map.get(a.category) ?? 0) + 1);
    return map;
  }, []);

  const nickValid = NICKNAME_RE.test(nick.trim());
  const totalStickers = ANIMALS.length;
  const stickerPct =
    totalStickers > 0 ? Math.round((stickers.size / totalStickers) * 100) : 0;

  return (
    <>
      {/* Safari background appears after the hero scrolls past — fixed */}
      <SafariBackground />

      <main className="relative z-10">
        {/* ═════ HERO — one-time video, full viewport ═════ */}
        <HeroVideoOnce />

        {/* ═════ APP SECTION — everything else lives here ═════ */}
        <section
          id="app"
          className="relative px-4 sm:px-8 pt-12 sm:pt-16 pb-16"
          style={{ scrollMarginTop: "0" }}
        >
          {/* 3D parallax silhouettes drifting behind the content */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
            <ParallaxSilhouettes3D />
          </div>
          {/* Safari poster header strip */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative max-w-6xl mx-auto text-center mb-8"
          >
            <p
              className="font-display text-[11px] sm:text-xs uppercase tracking-[0.4em] mb-2"
              style={{ color: "rgba(255, 244, 214, 0.7)" }}
            >
              · The Expedition Begins ·
            </p>
            <h2
              className="font-display font-bold tracking-tight leading-none"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                color: "var(--safari-gold)",
                textShadow: "0 4px 20px rgba(0,0,0,0.55)",
              }}
            >
              Welcome, little explorer
            </h2>
          </motion.div>

          {/* 3D Floating Mascot */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 pointer-events-none">
            <FloatingMascot3D size={180} />
          </div>

          {/* Main panel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="max-w-6xl mx-auto rounded-[32px] overflow-hidden paper-texture"
            style={{
              background:
                "linear-gradient(180deg, rgba(13, 59, 46, 0.72) 0%, rgba(6, 42, 30, 0.85) 100%)",
              border: "1px solid rgba(127, 176, 105, 0.35)",
              backdropFilter: "blur(22px) saturate(1.2)",
              WebkitBackdropFilter: "blur(22px) saturate(1.2)",
              boxShadow:
                "0 40px 120px -40px rgba(0, 0, 0, 0.75), 0 4px 12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div className="p-6 sm:p-10 space-y-10">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <Stat
                  emoji="🔥"
                  value={`${streak}`}
                  label={streak === 1 ? "Day streak" : "Days streak"}
                  color="var(--safari-amber)"
                />
                <Stat
                  emoji="🏅"
                  value={`${stickers.size}/${totalStickers}`}
                  label={`${stickerPct}% collected`}
                  color="var(--safari-gold)"
                />
                <StatButton
                  emoji="🏆"
                  value="Top Kids"
                  label="Expedition log"
                  onClick={() => router.push("/leaderboard")}
                />
              </div>

              {/* Nickname + Modes */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
                <div className="lg:col-span-2">
                  <div
                    className="p-5 rounded-3xl"
                    style={{
                      background: "rgba(255, 244, 214, 0.06)",
                      border: "1px solid rgba(127, 176, 105, 0.35)",
                    }}
                  >
                    <h3
                      className="font-display text-xs uppercase tracking-[0.3em] mb-2"
                      style={{ color: "var(--safari-gold)" }}
                    >
                      Explorer Name
                    </h3>
                    <p
                      className="text-sm font-bold mb-3"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Type your name so your safari shows up on the leaderboard 🏆
                    </p>
                    <div className="relative">
                      <input
                        id="nick-input"
                        type="text"
                        value={nick}
                        onChange={(e) => handleNickChange(e.target.value)}
                        placeholder="e.g. Mia"
                        maxLength={20}
                        className="w-full rounded-2xl px-4 py-3 text-lg font-black outline-none transition-colors"
                        style={{
                          background: "rgba(255, 244, 214, 0.95)",
                          border: `2px solid ${
                            nick.length === 0
                              ? "rgba(127, 176, 105, 0.5)"
                              : nickValid
                              ? "var(--leaf-bright)"
                              : "var(--safari-amber)"
                          }`,
                          color: "var(--jungle-deep)",
                        }}
                      />
                      {nickSaved && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                        >
                          ✅
                        </motion.span>
                      )}
                    </div>
                    {nick.length > 0 && !nickValid && (
                      <p
                        className="text-xs font-bold mt-2"
                        style={{ color: "var(--safari-amber)" }}
                      >
                        Letters, numbers, space, _ or - (max 20)
                      </p>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <h3
                    className="font-display text-xs uppercase tracking-[0.3em] mb-3"
                    style={{ color: "var(--safari-gold)" }}
                  >
                    Choose your expedition
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dailyDone ? (
                      <DoneCard countdown={countdown} />
                    ) : (
                      <PlayCard
                        title="Today's Expedition"
                        subtitle="3 safari animals — today only"
                        emoji="🎯"
                        accent="green"
                        loading={!dailyReady || navigating === "daily"}
                        loadingLabel={
                          navigating === "daily"
                            ? "Starting..."
                            : !dailyReady
                            ? "Getting ready..."
                            : ""
                        }
                        onClick={() => startMode("daily")}
                        hint={!nickValid ? "Type your name first" : undefined}
                      />
                    )}
                    <PlayCard
                      title="Free Roam"
                      subtitle="Random animals, any time"
                      emoji="🎧"
                      accent="gold"
                      loading={navigating === "practice"}
                      loadingLabel="Starting..."
                      onClick={() => startMode("practice")}
                    />
                  </div>
                </div>
              </div>

              {/* Learning row: AotD + Biomes side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45 }}
                  className="lg:col-span-2"
                >
                  <h3
                    className="font-display text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2"
                    style={{ color: "var(--safari-gold)" }}
                  >
                    <span>💫</span> Today&apos;s Discovery
                  </h3>
                  <div
                    className="rounded-3xl p-5 h-full"
                    style={{
                      background:
                        "linear-gradient(135deg, #2d7d5a 0%, #1c5d44 100%)",
                      border: "2px solid var(--safari-gold)",
                      borderBottomWidth: "5px",
                      borderBottomColor: "var(--safari-gold-d)",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="shrink-0 text-6xl animate-wiggle"
                        style={{ animationDelay: "0.3s" }}
                      >
                        {aotd.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-display text-xl font-bold leading-tight"
                          style={{ color: "var(--safari-cream)" }}
                        >
                          {aotd.name}
                        </h4>
                        <span className="kid-pill mt-1 capitalize">
                          {aotd.category}
                        </span>
                      </div>
                    </div>
                    <p
                      className="text-sm font-bold mt-3 leading-snug"
                      style={{ color: "var(--safari-cream)" }}
                    >
                      💡 {aotd.funFact}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                  className="lg:col-span-3"
                >
                  <h3
                    className="font-display text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2"
                    style={{ color: "var(--safari-gold)" }}
                  >
                    <span>🗺️</span> Safari Regions
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {BIOMES.map((b) => {
                      const total = biomeTotals.get(b.id) ?? 0;
                      const collected = stickersByBiome.get(b.id) ?? 0;
                      const pct = total > 0 ? collected / total : 0;
                      const isComplete = pct === 1;
                      return (
                        <div
                          key={b.id}
                          className="rounded-2xl p-2.5 flex flex-col items-center gap-1 text-center transition-transform hover:-translate-y-0.5"
                          style={{
                            background: isComplete
                              ? `${b.color}33`
                              : "rgba(255, 244, 214, 0.06)",
                            border: `2px solid ${
                              isComplete ? b.color : "rgba(127, 176, 105, 0.3)"
                            }`,
                            borderBottomWidth: "4px",
                            borderBottomColor: isComplete
                              ? b.color
                              : "rgba(127, 176, 105, 0.15)",
                          }}
                        >
                          <span className="text-2xl">{b.emoji}</span>
                          <span
                            className="font-display text-[10px] font-black leading-none"
                            style={{ color: "var(--safari-cream)" }}
                          >
                            {b.label}
                          </span>
                          <span
                            className="text-[10px] font-black leading-none"
                            style={{
                              color: isComplete ? b.color : "var(--text-muted)",
                            }}
                          >
                            {collected}/{total}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4">
                    <div
                      className="h-2.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255, 244, 214, 0.1)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stickerPct}%`,
                          background:
                            "linear-gradient(90deg, var(--safari-gold) 0%, var(--safari-amber) 100%)",
                        }}
                      />
                    </div>
                    <p
                      className="text-xs font-bold mt-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {stickers.size} of {totalStickers} animals tracked —
                      keep exploring!
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* How it works strip */}
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8"
                style={{ borderTop: "1px dashed rgba(127, 176, 105, 0.35)" }}
              >
                {[
                  { n: "1", title: "Listen", desc: "We play a real animal sound.", emoji: "🎧" },
                  { n: "2", title: "Tap", desc: "Pick the animal you heard.", emoji: "👆" },
                  { n: "3", title: "Collect", desc: "Earn a safari badge + fun fact.", emoji: "🏅" },
                ].map((step) => (
                  <div
                    key={step.n}
                    className="flex items-start gap-3"
                    style={{ color: "var(--safari-cream)" }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{
                        background: "rgba(255, 244, 214, 0.08)",
                        border: "2px solid rgba(127, 176, 105, 0.3)",
                      }}
                    >
                      {step.emoji}
                    </div>
                    <div>
                      <h4
                        className="font-display text-sm font-black uppercase tracking-widest"
                        style={{ color: "var(--safari-gold)" }}
                      >
                        Step {step.n}
                      </h4>
                      <p className="text-base font-black">{step.title}</p>
                      <p
                        className="text-sm font-bold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <p
              className="font-display text-[11px] uppercase tracking-widest"
              style={{ color: "rgba(255, 244, 214, 0.55)" }}
            >
              Made with ElevenLabs · turbopuffer · Upstash · for little explorers 🌿
            </p>
          </motion.footer>
        </section>
      </main>
    </>
  );
}

/* ───────── Components ───────── */

function Stat({
  emoji,
  value,
  label,
  color,
}: {
  emoji: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{
        background: "rgba(255, 244, 214, 0.06)",
        border: "2px solid rgba(127, 176, 105, 0.3)",
        borderBottomWidth: "4px",
        borderBottomColor: "rgba(127, 176, 105, 0.15)",
      }}
    >
      <div
        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ background: "rgba(255, 244, 214, 0.1)" }}
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <div
          className="font-display text-xl sm:text-2xl font-black leading-none"
          style={{ color }}
        >
          {value}
        </div>
        <div
          className="font-display text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function StatButton({
  emoji,
  value,
  label,
  onClick,
}: {
  emoji: string;
  value: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.98]"
      style={{
        background: "rgba(244, 167, 43, 0.1)",
        border: "2px solid var(--safari-gold)",
        borderBottomWidth: "4px",
        borderBottomColor: "var(--safari-gold-d)",
      }}
    >
      <div
        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ background: "rgba(244, 167, 43, 0.18)" }}
      >
        {emoji}
      </div>
      <div className="min-w-0 text-left">
        <div
          className="font-display text-xl sm:text-2xl font-black leading-none"
          style={{ color: "var(--safari-gold)" }}
        >
          {value}
        </div>
        <div
          className="font-display text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1"
          style={{ color: "var(--safari-gold)" }}
        >
          {label} →
        </div>
      </div>
    </button>
  );
}

function PlayCard({
  title,
  subtitle,
  emoji,
  accent,
  loading,
  loadingLabel,
  onClick,
  hint,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  accent: "green" | "gold";
  loading: boolean;
  loadingLabel: string;
  onClick: () => void;
  hint?: string;
}) {
  const palette =
    accent === "green"
      ? {
          grad: "linear-gradient(135deg, #88c34a 0%, #5f8c3f 55%, #4a6d2f 100%)",
          soft: "rgba(255, 244, 214, 0.22)",
        }
      : {
          grad: "linear-gradient(135deg, #ffb951 0%, #f4a72b 55%, #cf8b14 100%)",
          soft: "rgba(255, 244, 214, 0.22)",
        };

  return (
    <motion.button
      whileHover={loading ? {} : { y: -3, scale: 1.015 }}
      whileTap={loading ? {} : { y: 2, scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      onClick={loading ? undefined : onClick}
      disabled={loading}
      className="w-full rounded-[22px] p-5 flex flex-col gap-3 text-left cursor-pointer disabled:cursor-not-allowed min-h-[148px]"
      style={{
        background: palette.grad,
        color: "var(--safari-cream)",
        boxShadow:
          "inset 0 1px 0 rgba(255, 244, 214, 0.45), inset 0 -6px 0 rgba(0, 0, 0, 0.28), 0 22px 40px -16px rgba(0, 0, 0, 0.55)",
        opacity: loading ? 0.92 : 1,
      }}
      title={hint}
    >
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-3xl"
          style={{
            background: palette.soft,
            boxShadow: "inset 0 1px 0 rgba(255, 244, 214, 0.3)",
          }}
        >
          <span>{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl font-black leading-tight">{title}</h3>
          <p className="text-sm font-bold opacity-95">{subtitle}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between font-black">
        <span className="font-display text-[10px] uppercase tracking-widest opacity-90">
          {loading ? loadingLabel : "Tap to start"}
        </span>
        <span className="text-2xl">
          {loading ? (
            <span
              className="inline-block w-3 h-3 rounded-full bg-white"
              style={{ animation: "pulse-glow 1s ease-in-out infinite" }}
            />
          ) : (
            "→"
          )}
        </span>
      </div>
    </motion.button>
  );
}

function DoneCard({ countdown }: { countdown: string }) {
  return (
    <div
      className="w-full rounded-[22px] p-5 flex flex-col gap-3 min-h-[148px]"
      style={{
        background:
          "linear-gradient(135deg, rgba(127, 176, 105, 0.15) 0%, rgba(13, 59, 46, 0.4) 100%)",
        color: "var(--safari-cream)",
        border: "2px solid rgba(127, 176, 105, 0.4)",
        borderBottomWidth: "5px",
        borderBottomColor: "rgba(127, 176, 105, 0.25)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: "rgba(255, 244, 214, 0.12)", border: "1px solid rgba(127, 176, 105, 0.3)" }}
        >
          🏅
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl font-black leading-tight">Expedition complete!</h3>
          <p
            className="text-sm font-bold"
            style={{ color: "var(--text-secondary)" }}
          >
            Next safari in{" "}
            <span style={{ color: "var(--safari-gold)" }}>{countdown || "a bit"}</span>.
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between font-display text-[10px] uppercase tracking-widest font-black">
        <span style={{ color: "var(--text-muted)" }}>Today ✓</span>
        <span style={{ color: "var(--leaf-bright)" }}>See you soon 🌿</span>
      </div>
    </div>
  );
}
