/**
 * Client-side localStorage helpers for kid progress.
 * - Streak tracking (consecutive days of daily completion)
 * - Sticker collection (set of animal IDs correctly identified)
 * - Nickname (single source of truth)
 *
 * All functions are SSR-safe: they return defaults when `window` is undefined.
 */

const NICKNAME_KEY = "audiovisa:nickname";
const STREAK_COUNT_KEY = "audiovisa:streak_count";
const STREAK_LAST_KEY = "audiovisa:streak_last_date";
const LAST_DAILY_KEY = "audiovisa:last_daily";
const STICKERS_KEY = "audiovisa:stickers"; // JSON string array of animal IDs

export const NICKNAME_RE = /^[a-zA-Z0-9 _-]{1,20}$/;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function todayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayISODate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

// ─── Nickname ───────────────────────────────────────────
export function getNickname(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(NICKNAME_KEY) ?? "";
}
export function setNickname(name: string): void {
  if (!isBrowser()) return;
  const trimmed = name.trim();
  if (NICKNAME_RE.test(trimmed)) {
    localStorage.setItem(NICKNAME_KEY, trimmed);
  }
}

// ─── Daily played flag ──────────────────────────────────
export function hasPlayedDailyToday(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(LAST_DAILY_KEY) === todayISODate();
}
export function markDailyPlayed(): void {
  if (!isBrowser()) return;
  localStorage.setItem(LAST_DAILY_KEY, todayISODate());
}

// ─── Streak tracking ────────────────────────────────────
export interface StreakState {
  count: number;
  lastDate: string | null;
}

export function getStreak(): StreakState {
  if (!isBrowser()) return { count: 0, lastDate: null };
  const count = parseInt(localStorage.getItem(STREAK_COUNT_KEY) ?? "0", 10);
  const lastDate = localStorage.getItem(STREAK_LAST_KEY);
  return {
    count: Number.isFinite(count) ? count : 0,
    lastDate,
  };
}

/**
 * Update streak after finishing a daily. Returns the new streak state.
 * Rules:
 *   - If last play was today already: no change (idempotent).
 *   - If last play was yesterday: increment.
 *   - Otherwise: reset to 1.
 */
export function bumpStreak(): StreakState {
  if (!isBrowser()) return { count: 0, lastDate: null };
  const today = todayISODate();
  const yesterday = yesterdayISODate();
  const current = getStreak();
  let next: StreakState;
  if (current.lastDate === today) {
    next = current;
  } else if (current.lastDate === yesterday) {
    next = { count: current.count + 1, lastDate: today };
  } else {
    next = { count: 1, lastDate: today };
  }
  localStorage.setItem(STREAK_COUNT_KEY, String(next.count));
  localStorage.setItem(STREAK_LAST_KEY, next.lastDate ?? "");
  return next;
}

/**
 * If the last streak day was before yesterday, surface a stale count to 0
 * for *display*. We don't rewrite storage on read — the next daily bump
 * will reset cleanly, and we still remember the record lastDate.
 */
export function getDisplayStreak(): number {
  const { count, lastDate } = getStreak();
  if (!lastDate) return 0;
  const today = todayISODate();
  const yesterday = yesterdayISODate();
  if (lastDate === today || lastDate === yesterday) return count;
  return 0;
}

// ─── Sticker collection ────────────────────────────────
export function getStickers(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(STICKERS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}
export function addSticker(animalId: string): Set<string> {
  if (!isBrowser()) return new Set();
  const current = getStickers();
  current.add(animalId);
  localStorage.setItem(STICKERS_KEY, JSON.stringify([...current]));
  return current;
}
export function addStickers(animalIds: string[]): Set<string> {
  if (!isBrowser()) return new Set();
  const current = getStickers();
  for (const id of animalIds) current.add(id);
  localStorage.setItem(STICKERS_KEY, JSON.stringify([...current]));
  return current;
}
