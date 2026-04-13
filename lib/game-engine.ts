import { Scene } from "../types/scene";
import { cosineDistance, distanceToScore } from "./scoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameRound {
  roundNumber: number; // 1-5
  scene: Scene;
  audioUrls: { sfx: string[]; music: string } | null;
  guess: {
    location: string;
    era: string;
  } | null;
  score: number | null; // 0-1000
  hintUsed: boolean;
  maxScore: number; // 1000 normally, 800 if hint used
  revealed: boolean;
}

export interface GameState {
  id: string; // UUID
  rounds: GameRound[];
  currentRound: number; // 0-4 (index)
  totalScore: number;
  status: "playing" | "finished";
  performanceRating: string;
}

// ---------------------------------------------------------------------------
// In-memory game store (hackathon simplicity — no database)
// ---------------------------------------------------------------------------

export const gameStore = new Map<string, GameState>();

// ---------------------------------------------------------------------------
// Game creation
// ---------------------------------------------------------------------------

/**
 * Pick `count` random items from an array (Fisher-Yates partial shuffle).
 */
function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * Create a new game by selecting 5 scenes: 2 easy, 2 medium, 1 hard.
 * Scenes are shuffled so the player doesn't see difficulty order.
 */
export function createGame(scenes: Scene[]): GameState {
  if (scenes.length < 5) {
    throw new Error(`createGame requires at least 5 scenes, got ${scenes.length}`);
  }

  let selected: Scene[];
  if (scenes.length === 5) {
    // Caller pre-curated exactly 5 scenes (e.g. turbopuffer theme search) —
    // use them as-is without difficulty shaping.
    selected = [...scenes];
  } else {
    const easy = scenes.filter((s) => s.difficulty === "easy");
    const medium = scenes.filter((s) => s.difficulty === "medium");
    const hard = scenes.filter((s) => s.difficulty === "hard");

    selected = [
      ...pickRandom(easy, 2),
      ...pickRandom(medium, 2),
      ...pickRandom(hard, 1),
    ];

    // Backfill if any difficulty bucket is short.
    if (selected.length < 5) {
      const used = new Set(selected.map((s) => s.id));
      const remaining = scenes.filter((s) => !used.has(s.id));
      selected.push(...pickRandom(remaining, 5 - selected.length));
    }
  }

  // Shuffle the selected scenes so difficulty order is random
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  const rounds: GameRound[] = selected.map((scene, i) => ({
    roundNumber: i + 1,
    scene,
    audioUrls: null,
    guess: null,
    score: null,
    hintUsed: false,
    maxScore: 1000,
    revealed: false,
  }));

  const game: GameState = {
    id: crypto.randomUUID(),
    rounds,
    currentRound: 0,
    totalScore: 0,
    status: "playing",
    performanceRating: "",
  };

  gameStore.set(game.id, game);
  return game;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Calculate score for a guess given pre-computed embedding vectors.
 *
 * @param guessVector   Embedding of the player's guess text
 * @param answerVector  Embedding of the correct scene text
 * @param hintUsed      Whether the player used a hint (caps max at 800)
 * @returns Score 0-1000
 */
export function calculateScore(
  guessVector: number[],
  answerVector: number[],
  hintUsed: boolean
): { score: number; distance: number } {
  const distance = cosineDistance(guessVector, answerVector);
  const score = distanceToScore(distance, hintUsed);
  return { score, distance };
}

// ---------------------------------------------------------------------------
// Performance ratings
// ---------------------------------------------------------------------------

const RATINGS: [number, string][] = [
  [4001, "Sound Archaeologist"],
  [3001, "Audio Detective"],
  [2001, "Sound Explorer"],
  [1001, "Casual Listener"],
  [0, "Sound Tourist"],
];

/**
 * Get a performance rating string based on total score (0-5000).
 */
export function getPerformanceRating(totalScore: number): string {
  for (const [threshold, label] of RATINGS) {
    if (totalScore >= threshold) return label;
  }
  return "Sound Tourist";
}
