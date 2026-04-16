"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
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
}[] = [
  { id: "farm", label: "Farm", emoji: "🚜" },
  { id: "pets", label: "Pets", emoji: "🐕" },
  { id: "wild", label: "Wild", emoji: "🌳" },
  { id: "birds", label: "Birds", emoji: "🦜" },
  { id: "ocean", label: "Ocean", emoji: "🌊" },
  { id: "reptiles", label: "Reptiles", emoji: "🐢" },
  { id: "insects", label: "Insects", emoji: "🐛" },
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

/* ═════════════════════════════ PAGE ═════════════════════════════ */

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
    // Prefetch the /play routes so the first click is instant — no cold
    // Turbopack compile. Fires both daily + practice variants.
    router.prefetch("/play?mode=daily");
    router.prefetch("/play?mode=practice");
    router.prefetch("/leaderboard");
  }, [router]);

  // Always start at the top on refresh — the browser's default scroll
  // restoration would drop returning visitors back at the app section.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
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
    // Require a valid nickname for BOTH modes
    if (!nick.trim() || !NICKNAME_RE.test(nick.trim())) {
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
      <SafariBackground />

      <main className="relative z-10">
        <HeroVideoOnce />

        {/* Dark anticipation zone — pushes the app content below the fold
            so the 2-second smooth scroll feels cinematic. */}
        <div
          aria-hidden
          className="relative"
          style={{
            height: "30vh",
            background:
              "linear-gradient(180deg, rgba(6, 42, 30, 0.35) 0%, rgba(6, 42, 30, 0.85) 60%, rgba(6, 42, 30, 1) 100%)",
          }}
        />

        <section
          id="app"
          className="relative px-4 sm:px-8 pt-12 sm:pt-16 pb-16"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
            <ParallaxSilhouettes3D />
          </div>

          <div className="relative max-w-5xl mx-auto space-y-6 sm:space-y-7">
            <WelcomeBanner
              streak={streak}
              stickersCollected={stickers.size}
              totalStickers={totalStickers}
              stickerPct={stickerPct}
              onLeaderboard={() => router.push("/leaderboard")}
            />

            {/* Two-column grid: actions (left) + learn (right). On mobile
                everything stacks in source order. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
              {/* ─── Left: explorer name + quest cards stacked ─── */}
              <div className="space-y-5 sm:space-y-6">
                <ExplorerProfileCard
                  nick={nick}
                  nickValid={nickValid}
                  nickSaved={nickSaved}
                  onChange={handleNickChange}
                />

                {dailyDone ? (
                  <DoneCard countdown={countdown} />
                ) : (
                  <QuestCard
                    title="Today's Expedition"
                    subtitle="3 special animals — today only"
                    emoji="🎯"
                    accent="primary"
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

                <QuestCard
                  title="Free Roam"
                  subtitle="Random animals, any time"
                  emoji="🎧"
                  accent="neutral"
                  loading={navigating === "practice"}
                  loadingLabel="Starting..."
                  onClick={() => startMode("practice")}
                  hint={!nickValid ? "Type your name first" : undefined}
                />
              </div>

              {/* ─── Right: Today's Discovery + Safari Regions stacked ─── */}
              <div className="space-y-5 sm:space-y-6">
                <AnimalOfDayCard aotd={aotd} />
                <BiomeMapCard
                  biomes={BIOMES}
                  biomeTotals={biomeTotals}
                  stickersByBiome={stickersByBiome}
                  stickersCount={stickers.size}
                  totalStickers={totalStickers}
                  stickerPct={stickerPct}
                />
              </div>
            </div>

            <HowItWorksStrip />
          </div>

          <motion.footer
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 text-center"
          >
            <p
              className="font-display text-[11px] uppercase tracking-widest"
              style={{ color: "rgba(255, 244, 214, 0.5)" }}
            >
              Made with ElevenLabs · turbopuffer · Upstash
            </p>
          </motion.footer>
        </section>
      </main>
    </>
  );
}

/* ═════════════════════════════ SECTIONS ═════════════════════════════ */

function WelcomeBanner({
  streak,
  stickersCollected,
  totalStickers,
  stickerPct,
  onLeaderboard,
}: {
  streak: number;
  stickersCollected: number;
  totalStickers: number;
  stickerPct: number;
  onLeaderboard: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      className="premium-card-warm relative overflow-hidden"
    >
      {/* Floating mascot in the corner */}
      <div className="absolute -top-2 right-2 sm:top-2 sm:right-6 pointer-events-none">
        <FloatingMascot3D size={150} />
      </div>

      <div className="relative p-6 sm:p-9 pr-[140px] sm:pr-[170px]">
        <p
          className="font-display text-[11px] uppercase tracking-[0.45em] mb-2"
          style={{ color: "rgba(244, 167, 43, 0.85)" }}
        >
          The Expedition Begins
        </p>
        <h2
          className="font-display font-bold tracking-tight leading-[0.95]"
          style={{
            fontSize: "clamp(2rem, 5.5vw, 3.75rem)",
            color: "var(--safari-cream)",
          }}
        >
          Welcome, little explorer
        </h2>
        <p
          className="mt-3 text-sm sm:text-base font-bold max-w-lg"
          style={{ color: "rgba(255, 244, 214, 0.78)" }}
        >
          Track every sound in the jungle. Collect badges. Beat your own
          streak.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatPill
            emoji="🔥"
            value={`${streak}`}
            label={streak === 1 ? "day streak" : "day streak"}
          />
          <StatPill
            emoji="🏅"
            value={`${stickersCollected}/${totalStickers}`}
            label={`${stickerPct}% tracked`}
          />
          <button
            onClick={onLeaderboard}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-display font-black text-xs uppercase tracking-widest cursor-pointer transition-all hover:-translate-y-0.5"
            style={{
              background: "rgba(244, 167, 43, 0.16)",
              color: "var(--safari-gold)",
              border: "1px solid rgba(244, 167, 43, 0.45)",
            }}
          >
            <span>🏆</span>
            <span>Top Kids</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function QuestPickerSection({
  nickValid,
  dailyDone,
  dailyReady,
  navigating,
  countdown,
  onStart,
}: {
  nickValid: boolean;
  dailyDone: boolean;
  dailyReady: boolean;
  navigating: null | "daily" | "practice";
  countdown: string;
  onStart: (mode: "daily" | "practice") => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.05 }}
    >
      <SectionHeader emoji="🎯" title="Choose your expedition" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {dailyDone ? (
          <DoneCard countdown={countdown} />
        ) : (
          <QuestCard
            title="Today's Expedition"
            subtitle="3 special animals — today only"
            emoji="🎯"
            accent="primary"
            loading={!dailyReady || navigating === "daily"}
            loadingLabel={
              navigating === "daily"
                ? "Starting..."
                : !dailyReady
                ? "Getting ready..."
                : ""
            }
            onClick={() => onStart("daily")}
            hint={!nickValid ? "Type your name first" : undefined}
          />
        )}
        <QuestCard
          title="Free Roam"
          subtitle="Random animals, any time"
          emoji="🎧"
          accent="neutral"
          loading={navigating === "practice"}
          loadingLabel="Starting..."
          onClick={() => onStart("practice")}
          hint={!nickValid ? "Type your name first" : undefined}
        />
      </div>
    </motion.section>
  );
}

function ExplorerProfileCard({
  nick,
  nickValid,
  nickSaved,
  onChange,
}: {
  nick: string;
  nickValid: boolean;
  nickSaved: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mx-auto w-full max-w-xl"
    >
      <div className="premium-card px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-center gap-4">
        <div
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
          style={{
            background: "rgba(244, 167, 43, 0.14)",
            border: "1px solid rgba(244, 167, 43, 0.45)",
            color: "var(--safari-gold)",
          }}
        >
          🎖️
        </div>
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="nick-input"
              className="font-display text-[11px] uppercase tracking-[0.3em]"
              style={{ color: "rgba(244, 167, 43, 0.85)" }}
            >
              Explorer Name
            </label>
            {nickSaved && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-black"
                style={{ color: "var(--leaf-bright)" }}
              >
                ✓ saved
              </motion.span>
            )}
          </div>
          <input
            id="nick-input"
            type="text"
            value={nick}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. Eleven"
            maxLength={20}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-base font-black outline-none transition-colors"
            style={{
              background: "rgba(255, 244, 214, 0.96)",
              border: `2px solid ${
                nick.length === 0
                  ? "rgba(127, 176, 105, 0.35)"
                  : nickValid
                  ? "rgba(127, 176, 105, 0.8)"
                  : "rgba(244, 167, 43, 0.7)"
              }`,
              color: "var(--jungle-deep)",
            }}
          />
          {nick.length > 0 && !nickValid && (
            <p
              className="text-xs font-bold mt-1.5"
              style={{ color: "var(--safari-gold)" }}
            >
              Letters, numbers, space, _ or - (max 20)
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function AnimalOfDayCard({
  aotd,
  className,
}: {
  aotd: Animal;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className={className}
    >
      <div
        className="premium-card relative overflow-hidden p-5 sm:p-6"
        style={{ minHeight: "240px" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base" aria-hidden>💫</span>
          <h3
            className="font-display font-black uppercase tracking-[0.25em] text-[11px]"
            style={{ color: "rgba(244, 167, 43, 0.9)" }}
          >
            Today&apos;s Discovery
          </h3>
        </div>
        <span
          aria-hidden
          className="absolute opacity-[0.06] animate-leaf-sway select-none pointer-events-none"
          style={{
            fontSize: "14rem",
            right: "-1.5rem",
            bottom: "-3rem",
            lineHeight: 1,
          }}
        >
          {aotd.emoji}
        </span>

        <div className="relative">
          <span className="kid-pill capitalize">{aotd.category}</span>
          <h4
            className="font-display text-2xl sm:text-3xl font-bold mt-3 leading-tight"
            style={{ color: "var(--safari-cream)" }}
          >
            {aotd.name}
          </h4>
          <p
            className="mt-3 text-sm sm:text-base font-bold leading-snug"
            style={{ color: "rgba(255, 244, 214, 0.8)" }}
          >
            {aotd.description}
          </p>
          <div
            className="mt-4 p-3 rounded-2xl"
            style={{
              background: "rgba(244, 167, 43, 0.1)",
              border: "1px solid rgba(244, 167, 43, 0.3)",
            }}
          >
            <p
              className="text-sm font-bold leading-snug"
              style={{ color: "var(--safari-gold)" }}
            >
              💡 {aotd.funFact}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function BiomeMapCard({
  className,
  biomes,
  biomeTotals,
  stickersByBiome,
  stickersCount,
  totalStickers,
  stickerPct,
}: {
  className?: string;
  biomes: typeof BIOMES;
  biomeTotals: Map<string, number>;
  stickersByBiome: Map<string, number>;
  stickersCount: number;
  totalStickers: number;
  stickerPct: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={className}
    >
      <div className="premium-card p-5 sm:p-6" style={{ minHeight: "240px" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base" aria-hidden>🗺️</span>
          <h3
            className="font-display font-black uppercase tracking-[0.25em] text-[11px]"
            style={{ color: "rgba(244, 167, 43, 0.9)" }}
          >
            Safari Regions
          </h3>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
          {biomes.map((b) => {
            const total = biomeTotals.get(b.id) ?? 0;
            const collected = stickersByBiome.get(b.id) ?? 0;
            const pct = total > 0 ? collected / total : 0;
            const isComplete = pct === 1;
            return (
              <motion.div
                key={b.id}
                whileHover={{ y: -2 }}
                className="rounded-2xl p-2.5 flex flex-col items-center gap-1 text-center cursor-default transition-colors"
                style={{
                  background: isComplete
                    ? "rgba(127, 176, 105, 0.22)"
                    : "rgba(255, 244, 214, 0.05)",
                  border: `1.5px solid ${
                    isComplete
                      ? "rgba(127, 176, 105, 0.7)"
                      : "rgba(127, 176, 105, 0.18)"
                  }`,
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
                    color: isComplete
                      ? "var(--leaf-bright)"
                      : "rgba(255, 244, 214, 0.4)",
                  }}
                >
                  {collected}/{total}
                </span>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-5">
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255, 244, 214, 0.08)" }}
          >
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${stickerPct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(127,176,105,0.9) 0%, var(--safari-gold) 100%)",
              }}
            />
          </div>
          <p
            className="text-xs font-bold mt-2"
            style={{ color: "rgba(255, 244, 214, 0.55)" }}
          >
            {stickersCount} of {totalStickers} animals tracked
          </p>
        </div>
      </div>
    </motion.section>
  );
}

function HowItWorksStrip() {
  const steps = [
    { n: "1", title: "Listen", desc: "We play a real animal sound.", emoji: "🎧" },
    { n: "2", title: "Tap", desc: "Pick the animal you heard.", emoji: "👆" },
    { n: "3", title: "Collect", desc: "Earn a safari badge + fun fact.", emoji: "🏅" },
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <SectionHeader emoji="✨" title="How it works" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 * i }}
            className="premium-card p-5 flex items-start gap-3"
          >
            <div
              className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
              style={{
                background: "rgba(255, 244, 214, 0.06)",
                border: "1px solid rgba(127, 176, 105, 0.3)",
              }}
            >
              {step.emoji}
            </div>
            <div>
              <p
                className="font-display text-[10px] font-black uppercase tracking-widest"
                style={{ color: "rgba(244, 167, 43, 0.75)" }}
              >
                Step {step.n}
              </p>
              <p
                className="font-display text-lg font-bold mt-0.5"
                style={{ color: "var(--safari-cream)" }}
              >
                {step.title}
              </p>
              <p
                className="text-sm font-bold"
                style={{ color: "rgba(255, 244, 214, 0.6)" }}
              >
                {step.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ═════════════════════════════ SHARED PRIMITIVES ═════════════════════════════ */

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3 px-1">
      <span className="text-base" aria-hidden>
        {emoji}
      </span>
      <h3
        className="font-display font-black uppercase tracking-[0.25em] text-xs"
        style={{ color: "rgba(244, 167, 43, 0.9)" }}
      >
        {title}
      </h3>
      <div
        className="flex-1 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(244,167,43,0.22) 0%, rgba(244,167,43,0) 100%)",
        }}
      />
    </div>
  );
}

function StatPill({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: "rgba(255, 244, 214, 0.06)",
        border: "1px solid rgba(127, 176, 105, 0.25)",
      }}
    >
      <span>{emoji}</span>
      <span
        className="font-display text-sm font-black"
        style={{ color: "var(--safari-cream)" }}
      >
        {value}
      </span>
      <span
        className="font-display text-[10px] font-black uppercase tracking-widest"
        style={{ color: "rgba(255, 244, 214, 0.55)" }}
      >
        {label}
      </span>
    </div>
  );
}

function QuestCard({
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
  accent: "primary" | "neutral";
  loading: boolean;
  loadingLabel: string;
  onClick: () => void;
  hint?: string;
}) {
  // Primary = safari gold (main CTA). Neutral = darker green card with a
  // subtle gold outline — still clickable but visually less shouting.
  const isPrimary = accent === "primary";
  return (
    <motion.button
      whileHover={loading ? {} : { y: -4, scale: 1.01 }}
      whileTap={loading ? {} : { y: 2, scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      onClick={loading ? undefined : onClick}
      disabled={loading}
      className="relative w-full rounded-[28px] p-5 sm:p-6 flex flex-col gap-3 text-left cursor-pointer disabled:cursor-not-allowed min-h-[180px] overflow-hidden"
      style={{
        // Both cards share the same calm jungle look — no special primary
        // styling. Differentiation comes from content (title + subtitle).
        background:
          "linear-gradient(160deg, rgba(53, 130, 102, 0.95) 0%, rgba(17, 70, 58, 0.97) 55%, rgba(10, 50, 38, 1) 100%)",
        color: "var(--safari-cream)",
        border: "1px solid rgba(255, 244, 214, 0.12)",
        boxShadow: [
          "inset 0 1px 0 rgba(255, 244, 214, 0.08)",
          "inset 0 -1.5px 0 rgba(0, 0, 0, 0.25)",
          "0 14px 32px -12px rgba(0, 0, 0, 0.5)",
        ].join(", "),
        opacity: loading ? 0.88 : 1,
      }}
      title={hint}
    >
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{
            background: isPrimary
              ? "rgba(255, 244, 214, 0.25)"
              : "rgba(244, 167, 43, 0.12)",
            border: isPrimary
              ? "1px solid rgba(255, 244, 214, 0.35)"
              : "1px solid rgba(244, 167, 43, 0.35)",
          }}
        >
          <span>{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl sm:text-2xl font-black leading-tight">
            {title}
          </h3>
          <p className="text-sm font-bold opacity-90">{subtitle}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between font-black">
        <span className="font-display text-[11px] uppercase tracking-widest opacity-85">
          {loading ? loadingLabel : "Tap to start"}
        </span>
        <span className="text-2xl">
          {loading ? (
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{
                background: isPrimary ? "var(--jungle-deep)" : "var(--safari-gold)",
                animation: "pulse-glow 1s ease-in-out infinite",
              }}
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
      className="w-full rounded-[24px] p-5 sm:p-6 flex flex-col gap-3 min-h-[170px]"
      style={{
        background:
          "linear-gradient(180deg, rgba(28, 93, 68, 0.55) 0%, rgba(14, 48, 34, 0.75) 100%)",
        color: "var(--safari-cream)",
        border: "1px solid rgba(127, 176, 105, 0.35)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{
            background: "rgba(127, 176, 105, 0.15)",
            border: "1px solid rgba(127, 176, 105, 0.35)",
          }}
        >
          🏅
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl sm:text-2xl font-black leading-tight">
            Expedition complete!
          </h3>
          <p
            className="text-sm font-bold"
            style={{ color: "rgba(255, 244, 214, 0.7)" }}
          >
            Next safari in{" "}
            <span style={{ color: "var(--safari-gold)" }}>
              {countdown || "a bit"}
            </span>
            .
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between font-display text-[11px] uppercase tracking-widest font-black">
        <span style={{ color: "rgba(255, 244, 214, 0.5)" }}>Today ✓</span>
        <span style={{ color: "var(--leaf-bright)" }}>See you soon 🌿</span>
      </div>
    </div>
  );
}
