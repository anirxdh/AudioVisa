"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
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
import HeroVideoBackground from "@/components/HeroVideoBackground";

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
  { id: "farm", label: "Farm", emoji: "🚜", color: "#ffc800" },
  { id: "pets", label: "Pets", emoji: "🐕", color: "#ce82ff" },
  { id: "wild", label: "Wild", emoji: "🌳", color: "#58cc02" },
  { id: "birds", label: "Birds", emoji: "🦜", color: "#1cb0f6" },
  { id: "ocean", label: "Ocean", emoji: "🌊", color: "#0e82b3" },
  { id: "reptiles", label: "Reptiles", emoji: "🐢", color: "#458a00" },
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
          0,
          0,
          0
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
      <HeroVideoBackground />

      <main className="relative z-10 min-h-screen flex flex-col">
        {/* ═════ HERO — fullscreen cinematic ═════ */}
        <section className="min-h-[65vh] sm:min-h-[72vh] flex flex-col items-center justify-center px-5 py-14 text-white">
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center max-w-5xl"
          >
            <p
              className="text-[11px] sm:text-xs font-black uppercase tracking-[0.4em] mb-5 opacity-90"
              style={{ textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
            >
              · An animal-sound learning adventure ·
            </p>
            <h1
              className="font-black tracking-tight leading-[0.9]"
              style={{
                fontSize: "clamp(3.25rem, 11vw, 8rem)",
                background:
                  "linear-gradient(180deg, #ffffff 0%, #f7e8c5 72%, #ffc86c 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 6px 40px rgba(0,0,0,0.45)",
              }}
            >
              Audio Visa
            </h1>
            <p
              className="mt-5 text-lg sm:text-2xl font-bold max-w-2xl mx-auto"
              style={{
                color: "rgba(255,255,255,0.95)",
                textShadow: "0 2px 16px rgba(0,0,0,0.55)",
              }}
            >
              Hear the sound. Tap the animal. Little ears, big discoveries.
            </p>

            {/* Feature chips */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {[
                { emoji: "🐾", label: "55+ Animals" },
                { emoji: "🗺️", label: "7 Biomes" },
                { emoji: "🏆", label: "Daily Challenge" },
                { emoji: "⚡", label: "No Ads. No Distractions." },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    backdropFilter: "blur(8px)",
                    color: "rgba(255,255,255,0.95)",
                  }}
                >
                  <span>{chip.emoji}</span>
                  <span>{chip.label}</span>
                </span>
              ))}
            </div>

            {/* Scroll cue */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="mt-10 text-white/70 text-sm font-bold"
            >
              ↓ Start below
            </motion.div>
          </motion.div>
        </section>

        {/* ═════ CONTENT PANEL — white/glass deck below hero ═════ */}
        <section className="relative px-4 sm:px-8 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-6xl mx-auto rounded-[32px] overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,250,242,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow:
                "0 40px 120px -40px rgba(15, 23, 42, 0.55), 0 4px 12px rgba(15, 23, 42, 0.12)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            <div className="p-6 sm:p-10 space-y-10">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <Stat emoji="🔥" value={`${streak}`} label={streak === 1 ? "Day streak" : "Days streak"} color="var(--kid-orange)" />
                <Stat
                  emoji="⭐"
                  value={`${stickers.size}/${totalStickers}`}
                  label={`${stickerPct}% collected`}
                  color="var(--kid-yellow)"
                />
                <StatButton
                  emoji="🏆"
                  value="Top Kids"
                  label="See leaderboard"
                  onClick={() => router.push("/leaderboard")}
                />
              </div>

              {/* Nickname + Modes */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
                {/* Left: nickname */}
                <div className="lg:col-span-2">
                  <div className="premium-card-solid p-5">
                    <h3
                      className="text-xs font-black uppercase tracking-[0.3em] mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Little Player
                    </h3>
                    <p
                      className="text-sm font-bold mb-3"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Type your name so your scores show up on the leaderboard 🏆
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
                          background: "#ffffff",
                          border: `2px solid ${
                            nick.length === 0
                              ? "var(--border-soft)"
                              : nickValid
                              ? "var(--kid-green)"
                              : "var(--kid-orange)"
                          }`,
                          color: "var(--text-primary)",
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
                      <p className="text-xs font-bold mt-2" style={{ color: "var(--kid-orange)" }}>
                        Letters, numbers, space, _ or - (max 20)
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: mode cards — side-by-side */}
                <div className="lg:col-span-3">
                  <h3
                    className="text-xs font-black uppercase tracking-[0.3em] mb-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Choose your quest
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dailyDone ? (
                      <DoneCard countdown={countdown} />
                    ) : (
                      <PlayCard
                        title="Today's Animals"
                        subtitle="3 special animals — today only"
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
                      title="Play More"
                      subtitle="Random animals, any time"
                      emoji="🎧"
                      accent="blue"
                      loading={navigating === "practice"}
                      loadingLabel="Starting..."
                      onClick={() => startMode("practice")}
                    />
                  </div>
                </div>
              </div>

              {/* Learning row: AotD + Biomes side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Animal of the Day */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45 }}
                  className="lg:col-span-2"
                >
                  <h3
                    className="text-xs font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span>💫</span> Animal of the Day
                  </h3>
                  <div
                    className="rounded-3xl p-5 h-full"
                    style={{
                      background:
                        "linear-gradient(135deg, #fff6d6 0%, #ffe6a1 100%)",
                      border: "2px solid var(--kid-yellow)",
                      borderBottomWidth: "5px",
                      borderBottomColor: "var(--kid-yellow-d)",
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
                          className="text-xl font-black leading-tight"
                          style={{ color: "var(--text-primary)" }}
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
                      style={{ color: "var(--text-primary)" }}
                    >
                      💡 {aotd.funFact}
                    </p>
                  </div>
                </motion.div>

                {/* Biomes */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                  className="lg:col-span-3"
                >
                  <h3
                    className="text-xs font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span>🗺️</span> Explore by Biome
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
                            background: isComplete ? `${b.color}22` : "#ffffff",
                            border: `2px solid ${
                              isComplete ? b.color : "var(--border-soft)"
                            }`,
                            borderBottomWidth: "4px",
                            borderBottomColor: isComplete ? b.color : "#d9d9d9",
                          }}
                        >
                          <span className="text-2xl">{b.emoji}</span>
                          <span
                            className="text-[10px] font-black leading-none"
                            style={{ color: "var(--text-primary)" }}
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
                  {/* Progress bar */}
                  <div className="mt-4">
                    <div
                      className="h-2.5 rounded-full overflow-hidden"
                      style={{ background: "#ececec" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${stickerPct}%`,
                          background:
                            "linear-gradient(90deg, var(--kid-yellow) 0%, var(--kid-orange) 100%)",
                        }}
                      />
                    </div>
                    <p
                      className="text-xs font-bold mt-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {stickers.size} of {totalStickers} animals learned · keep going!
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* How it works strip */}
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8"
                style={{ borderTop: "1px dashed var(--border-soft)" }}
              >
                {[
                  { n: "1", title: "Listen", desc: "We play a real animal sound.", emoji: "🎧" },
                  { n: "2", title: "Tap", desc: "Pick the animal you heard.", emoji: "👆" },
                  { n: "3", title: "Collect", desc: "Earn a sticker and a fun fact.", emoji: "⭐" },
                ].map((step) => (
                  <div
                    key={step.n}
                    className="flex items-start gap-3"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{
                        background: "var(--bg-soft)",
                        border: "2px solid var(--border-soft)",
                      }}
                    >
                      {step.emoji}
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--kid-blue)" }}>
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

          {/* Footer credit */}
          <motion.footer
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <p
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Made with ElevenLabs · turbopuffer · Upstash · for little ears 🎈
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
        background: "#ffffff",
        border: "2px solid var(--border-soft)",
        borderBottomWidth: "4px",
        borderBottomColor: "#d9d9d9",
      }}
    >
      <div
        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ background: "var(--bg-soft)" }}
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <div
          className="text-xl sm:text-2xl font-black leading-none"
          style={{ color }}
        >
          {value}
        </div>
        <div
          className="text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1"
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
        background: "#ffffff",
        border: "2px solid var(--kid-yellow)",
        borderBottomWidth: "4px",
        borderBottomColor: "var(--kid-yellow-d)",
      }}
    >
      <div
        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ background: "#fff6d6" }}
      >
        {emoji}
      </div>
      <div className="min-w-0 text-left">
        <div
          className="text-xl sm:text-2xl font-black leading-none"
          style={{ color: "var(--kid-yellow)" }}
        >
          {value}
        </div>
        <div
          className="text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1"
          style={{ color: "var(--text-muted)" }}
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
  accent: "green" | "blue";
  loading: boolean;
  loadingLabel: string;
  onClick: () => void;
  hint?: string;
}) {
  const palette =
    accent === "green"
      ? {
          grad: "linear-gradient(135deg, #6bd827 0%, #58cc02 60%, #4ba800 100%)",
          soft: "rgba(255,255,255,0.22)",
        }
      : {
          grad: "linear-gradient(135deg, #3fc0ff 0%, #1cb0f6 60%, #0e82b3 100%)",
          soft: "rgba(255,255,255,0.22)",
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
        color: "#ffffff",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -6px 0 rgba(0,0,0,0.24), 0 22px 40px -16px rgba(15,23,42,0.55)",
        opacity: loading ? 0.92 : 1,
      }}
      title={hint}
    >
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-3xl"
          style={{
            background: palette.soft,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          <span>{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black leading-tight">{title}</h3>
          <p className="text-sm font-bold opacity-95">{subtitle}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between font-black">
        <span className="text-[10px] uppercase tracking-widest opacity-90">
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
          "linear-gradient(135deg, #f7f7f7 0%, #ececec 100%)",
        color: "var(--text-primary)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -5px 0 rgba(0,0,0,0.06), 0 10px 24px -10px rgba(15,23,42,0.2)",
        border: "1px solid var(--border-soft)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: "#ffffff", border: "1px solid var(--border-soft)" }}
        >
          🏅
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black leading-tight">All done today!</h3>
          <p
            className="text-sm font-bold"
            style={{ color: "var(--text-secondary)" }}
          >
            Great work. Back in{" "}
            <span style={{ color: "var(--kid-blue)" }}>{countdown || "a bit"}</span>.
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between text-[10px] uppercase tracking-widest font-black">
        <span style={{ color: "var(--text-muted)" }}>Daily complete ✓</span>
        <span style={{ color: "var(--kid-green)" }}>See you soon ✨</span>
      </div>
    </div>
  );
}
