import { NextRequest, NextResponse } from "next/server";
import { createGame, type GameRound } from "../../../../../lib/game-engine";
import type { Scene } from "../../../../../types/scene";
import scenesData from "../../../../../data/scenes.json";
import { getAudioUrls } from "../../../../../lib/audio-cache";
import { searchScenes, type SearchResult } from "../../../../../lib/search";

// Rotating exploration seeds used when no theme is provided — keeps runs
// feeling varied while still going through turbopuffer.
const EXPLORATION_SEEDS = [
  "bustling markets around the world",
  "quiet natural landscapes",
  "industrial era factories and workshops",
  "vibrant city streets at night",
  "historical scenes from centuries past",
  "festivals and public celebrations",
  "transport hubs: stations, airports, docks",
];

function randomSeed(): string {
  return EXPLORATION_SEEDS[Math.floor(Math.random() * EXPLORATION_SEEDS.length)];
}

/**
 * Convert a turbopuffer SearchResult back into a Scene-shaped object.
 */
function resultToScene(r: SearchResult): Scene {
  return {
    id: r.id,
    location: r.location,
    country: r.country,
    continent: r.continent as Scene["continent"],
    era: r.era,
    difficulty: r.difficulty as Scene["difficulty"],
    description: r.description,
    sounds: r.sounds,
    sfx_prompts: r.sfx_prompts,
    music_prompt: r.music_prompt,
    category: r.category as Scene["category"],
  };
}

/**
 * Pick 5 scenes using turbopuffer vector search.
 * - Theme query: returns the top-5 semantic matches (tight narrative).
 * - No theme: picks 30 candidates for a random exploration seed, shuffles
 *   and takes 5 (variety).
 * Returns null if turbopuffer is unavailable or returns too few hits,
 * so the caller can fall back to the local dataset.
 */
async function selectScenesViaTurbopuffer(
  theme: string | undefined
): Promise<Scene[] | null> {
  if (!process.env.TURBOPUFFER_API_KEY || !process.env.OPENAI_API_KEY) {
    return null;
  }
  try {
    if (theme && theme.trim().length > 0) {
      const hits = await searchScenes(theme.trim(), undefined, 5);
      if (hits.length < 5) return null;
      return hits.map(resultToScene);
    }

    // No theme — pull a wider pool for a random seed, shuffle, take 5.
    const hits = await searchScenes(randomSeed(), undefined, 30);
    if (hits.length < 5) return null;
    const pool = hits.map(resultToScene);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  } catch (err) {
    console.warn("[game/start] turbopuffer query failed, falling back:", err);
    return null;
  }
}

/**
 * POST /api/game/start
 *
 * Body (all optional): { theme?: string }
 *
 * Creates a new game session with 5 rounds. Scene selection:
 *   1. If turbopuffer is configured, pick via vector ANN (theme query or
 *      a random exploration seed).
 *   2. Otherwise fall back to local scenes.json with difficulty buckets
 *      (2 easy / 2 medium / 1 hard).
 *
 * Returns game ID and round info WITHOUT scene answers.
 */
export async function POST(request: NextRequest) {
  try {
    let theme: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.theme === "string") theme = body.theme;
    } catch {
      // Empty body is fine.
    }

    const allScenes = (scenesData as { scenes: Scene[] }).scenes;
    if (allScenes.length < 5) {
      return NextResponse.json(
        { error: "Not enough scenes to start a game" },
        { status: 500 }
      );
    }

    // 1) Try turbopuffer.
    const tpufScenes = await selectScenesViaTurbopuffer(theme);
    let selectedScenes: Scene[];
    let selectionSource: "turbopuffer" | "local";

    if (tpufScenes && tpufScenes.length >= 5) {
      selectedScenes = tpufScenes;
      selectionSource = "turbopuffer";
    } else {
      // 2) Fallback to local buckets.
      selectedScenes = allScenes;
      selectionSource = "local";
    }

    const game = createGame(selectedScenes);

    // Check audio cache for each round's scene.
    const roundsForClient = await Promise.all(
      game.rounds.map(async (round: GameRound) => {
        const audioUrls = await getAudioUrls(round.scene.id);
        round.audioUrls = audioUrls;
        return {
          roundNumber: round.roundNumber,
          sceneId: round.scene.id,
          audioUrls,
          // NOTE: Do NOT include scene answers (location, country, era, etc.)
        };
      })
    );

    return NextResponse.json({
      gameId: game.id,
      rounds: roundsForClient,
      currentRound: 0,
      selectionSource,
      theme: theme ?? null,
    });
  } catch (error) {
    console.error("[game/start] Error:", error);
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}
