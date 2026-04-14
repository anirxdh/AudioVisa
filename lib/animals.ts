import * as fs from "fs";
import * as path from "path";
import type { Animal } from "../types/animal";
import animalsData from "../data/animals.json";
import { generateSoundEffect } from "./elevenlabs";

// ---------------------------------------------------------------------------
// Dataset loading
// ---------------------------------------------------------------------------

export function getAllAnimals(): Animal[] {
  return (animalsData as { animals: Animal[] }).animals;
}

export function getAnimalById(id: string): Animal | undefined {
  return getAllAnimals().find((a) => a.id === id);
}

// ---------------------------------------------------------------------------
// Seeded RNG (so daily picks and challenge picks are deterministic)
// ---------------------------------------------------------------------------

/** Mulberry32 — tiny, fast, good distribution for our use. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert a string seed (e.g. "2026-04-13") to a 32-bit int. */
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// ---------------------------------------------------------------------------
// Game selection
// ---------------------------------------------------------------------------

/** Shuffle using a seeded RNG — stable across workers for the same seed. */
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pick 5 animals from different categories using a seeded RNG so the same
 * seed (e.g. today's date) always yields the same set.
 */
export function pickAnimalsForSeed(seed: number, count = 5): Animal[] {
  const all = getAllAnimals();
  const rng = mulberry32(seed);
  const shuffled = seededShuffle(all, rng);
  const picked: Animal[] = [];
  const usedCategories = new Set<string>();

  // First pass: prefer category variety.
  for (const a of shuffled) {
    if (picked.length >= count) break;
    if (!usedCategories.has(a.category)) {
      picked.push(a);
      usedCategories.add(a.category);
    }
  }
  // Backfill if we haven't filled count (fewer categories than count).
  for (const a of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(a)) picked.push(a);
  }
  return picked.slice(0, count);
}

/** Pick `count` animals at random — fresh each call. */
export function pickRandomAnimals(count = 5): Animal[] {
  return pickAnimalsForSeed(Math.floor(Math.random() * 2 ** 32), count);
}

/** Look up animals from a list of IDs, preserving order and skipping misses. */
export function getAnimalsByIds(ids: string[]): Animal[] {
  return ids.map(getAnimalById).filter((a): a is Animal => a !== undefined);
}

// ---------------------------------------------------------------------------
// Multiple-choice options
// ---------------------------------------------------------------------------

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build 4 plausible option names for the correct animal: the real one plus
 * 3 decoys from the same category so the choice is interesting.
 */
export function buildAnimalOptions(correct: Animal): string[] {
  const pool = getAllAnimals().filter(
    (a) => a.id !== correct.id && a.name !== correct.name
  );
  const sameCategory = pool.filter((a) => a.category === correct.category);

  const decoys: string[] = [];
  const seen = new Set<string>([correct.name]);

  // First fill from same category.
  for (const a of shuffleInPlace([...sameCategory])) {
    if (decoys.length >= 3) break;
    if (!seen.has(a.name)) {
      decoys.push(a.name);
      seen.add(a.name);
    }
  }
  // Backfill from other categories if needed.
  if (decoys.length < 3) {
    for (const a of shuffleInPlace([...pool])) {
      if (decoys.length >= 3) break;
      if (!seen.has(a.name)) {
        decoys.push(a.name);
        seen.add(a.name);
      }
    }
  }

  return shuffleInPlace([correct.name, ...decoys.slice(0, 3)]);
}

// ---------------------------------------------------------------------------
// Audio cache (single SFX per animal)
// ---------------------------------------------------------------------------

const IS_SERVERLESS = !!process.env.VERCEL;
const ANIMAL_AUDIO_DIR = IS_SERVERLESS
  ? path.join("/tmp", "animals")
  : path.join(process.cwd(), "public", "animals");
const ANIMAL_URL_PREFIX = IS_SERVERLESS
  ? "/api/animal-audio"
  : "/animals";

function animalAudioPath(id: string): string {
  return path.join(ANIMAL_AUDIO_DIR, `${id}.mp3`);
}

export function getCachedAnimalAudioUrl(id: string): string | null {
  const p = animalAudioPath(id);
  if (!fs.existsSync(p)) return null;
  return `${ANIMAL_URL_PREFIX}/${id}.mp3`;
}

/**
 * Generate (or return cached) audio for a single animal.
 * Resolves to a playable URL.
 */
export async function generateAndCacheAnimalAudio(
  animal: Animal
): Promise<string> {
  const cached = getCachedAnimalAudioUrl(animal.id);
  if (cached) return cached;

  fs.mkdirSync(ANIMAL_AUDIO_DIR, { recursive: true });
  const buffer = await generateSoundEffect(animal.sfx_prompt, 5);
  fs.writeFileSync(animalAudioPath(animal.id), buffer);
  return `${ANIMAL_URL_PREFIX}/${animal.id}.mp3`;
}
