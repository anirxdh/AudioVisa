import type { Animal } from "../types/animal";
import { buildAnimalOptions } from "./animals";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameMode = "daily" | "practice" | "challenge";

export interface AnimalRound {
  roundNumber: number; // 1-5
  animal: Animal;
  audioUrl: string | null;
  options: string[]; // 4 animal names, one correct
  guess: string | null;
  correct: boolean | null;
  score: number | null; // 0 or 1000 per round
  revealed: boolean;
}

export interface GameState {
  id: string;
  mode: GameMode;
  rounds: AnimalRound[];
  currentRound: number;
  totalScore: number;
  status: "playing" | "finished";
  performanceRating: string;
  nickname: string | null;
  challengeId: string | null;
  submittedToLeaderboard: boolean;
}

// ---------------------------------------------------------------------------
// In-memory game store (hackathon simplicity — no database)
// ---------------------------------------------------------------------------

export const gameStore = new Map<string, GameState>();

// ---------------------------------------------------------------------------
// Game creation
// ---------------------------------------------------------------------------

export interface CreateGameOptions {
  mode: GameMode;
  animals: Animal[];
  nickname?: string | null;
  challengeId?: string | null;
}

/**
 * Create a new game from a pre-selected list of 5 animals. Options are
 * computed per round so each has 4 plausible choices.
 */
export function createAnimalGame(opts: CreateGameOptions): GameState {
  const { mode, animals } = opts;
  if (animals.length < ROUNDS_PER_GAME) {
    throw new Error(
      `createAnimalGame requires at least ${ROUNDS_PER_GAME} animals, got ${animals.length}`
    );
  }

  const selected = animals.slice(0, ROUNDS_PER_GAME);

  const rounds: AnimalRound[] = selected.map((animal, i) => ({
    roundNumber: i + 1,
    animal,
    audioUrl: null,
    options: buildAnimalOptions(animal),
    guess: null,
    correct: null,
    score: null,
    revealed: false,
  }));

  const game: GameState = {
    id: crypto.randomUUID(),
    mode,
    rounds,
    currentRound: 0,
    totalScore: 0,
    status: "playing",
    performanceRating: "",
    nickname: opts.nickname ?? null,
    challengeId: opts.challengeId ?? null,
    submittedToLeaderboard: false,
  };

  gameStore.set(game.id, game);
  return game;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export const ROUNDS_PER_GAME = 3;
export const POINTS_PER_CORRECT = 1000;
export const MAX_SCORE = ROUNDS_PER_GAME * POINTS_PER_CORRECT;

// ---------------------------------------------------------------------------
// Performance ratings
// ---------------------------------------------------------------------------

const RATINGS: [number, string][] = [
  [MAX_SCORE,         "Animal Expert!"],
  [MAX_SCORE - 1000,  "Great job!"],
  [MAX_SCORE - 2000,  "Nice try!"],
  [0,                 "Let's try again!"],
];

export function getPerformanceRating(totalScore: number): string {
  for (const [threshold, label] of RATINGS) {
    if (totalScore >= threshold) return label;
  }
  return "Let's try again!";
}
