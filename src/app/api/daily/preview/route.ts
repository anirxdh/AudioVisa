import { NextResponse } from "next/server";
import {
  getCachedAnimalAudioUrl,
  pickAnimalsForSeed,
  seedFromString,
} from "../../../../../lib/animals";
import { todayKey } from "../../../../../lib/upstash";
import { ROUNDS_PER_GAME } from "../../../../../lib/game-engine";

/**
 * GET /api/daily/preview
 *
 * Returns today's daily challenge animal IDs + cached audio URLs (if any)
 * without creating a game. Used by the home page to warm the browser's
 * audio cache before the player clicks "Daily Challenge".
 */
export async function GET() {
  const seed = seedFromString(todayKey());
  const animals = pickAnimalsForSeed(seed, ROUNDS_PER_GAME);
  const preview = animals.map((a) => ({
    animalId: a.id,
    audioUrl: getCachedAnimalAudioUrl(a.id),
  }));
  return NextResponse.json({ date: todayKey(), rounds: preview });
}
