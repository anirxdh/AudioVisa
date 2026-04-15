import { NextRequest, NextResponse } from "next/server";
import {
  createAnimalGame,
  saveGame,
  ROUNDS_PER_GAME,
  type GameMode,
} from "../../../../../lib/game-engine";
import {
  getCachedAnimalAudioUrl,
  pickAnimalsForSeed,
  pickRandomAnimals,
  seedFromString,
  getAnimalsByIds,
} from "../../../../../lib/animals";
import { getRedis, KEYS, todayKey } from "../../../../../lib/upstash";

interface StartBody {
  mode?: GameMode;
  nickname?: string;
  challengeId?: string;
}

/**
 * POST /api/game/start
 *
 * Body: { mode?: "daily"|"practice"|"challenge", nickname?: string, challengeId?: string }
 *
 * Returns gameId + 5 rounds. Each round includes the 4 MC options and the
 * audioUrl if it's already cached — clients request on-demand generation
 * via /api/animal/audio if audioUrl is null.
 *
 *   - daily mode: deterministic per-UTC-day, everyone gets the same 5.
 *   - practice mode: random 5, fresh each call.
 *   - challenge mode: reads animal IDs from Upstash challenge key.
 */
export async function POST(request: NextRequest) {
  try {
    let body: StartBody = {};
    try {
      body = (await request.json()) as StartBody;
    } catch {
      // Empty body is fine — defaults to daily.
    }

    const mode: GameMode = body.mode ?? "daily";
    let animals;

    if (mode === "challenge") {
      if (!body.challengeId) {
        return NextResponse.json(
          { error: "challengeId required for challenge mode" },
          { status: 400 }
        );
      }
      const redis = getRedis();
      const data = await redis.get<{ animalIds: string[] }>(
        KEYS.challenge(body.challengeId)
      );
      if (!data || !Array.isArray(data.animalIds)) {
        return NextResponse.json(
          { error: "Challenge not found or expired" },
          { status: 404 }
        );
      }
      animals = getAnimalsByIds(data.animalIds);
      if (animals.length < ROUNDS_PER_GAME) {
        return NextResponse.json(
          { error: "Challenge is corrupted (not enough animals)" },
          { status: 500 }
        );
      }
    } else if (mode === "practice") {
      animals = pickRandomAnimals(ROUNDS_PER_GAME);
    } else {
      // daily
      const seed = seedFromString(todayKey());
      animals = pickAnimalsForSeed(seed, ROUNDS_PER_GAME);
    }

    const game = createAnimalGame({
      mode,
      animals,
      nickname: body.nickname?.trim() || null,
      challengeId: body.challengeId ?? null,
    });

    // Attach cached audio URLs where available (no generation here).
    const roundsForClient = game.rounds.map((round) => {
      const audioUrl = getCachedAnimalAudioUrl(round.animal.id);
      round.audioUrl = audioUrl;
      return {
        roundNumber: round.roundNumber,
        animalId: round.animal.id,
        audioUrl,
        options: round.options,
      };
    });

    // Persist to Upstash so subsequent lambdas can find this game.
    await saveGame(game);

    return NextResponse.json({
      gameId: game.id,
      mode,
      challengeId: body.challengeId ?? null,
      rounds: roundsForClient,
      currentRound: 0,
    });
  } catch (error) {
    console.error("[game/start] Error:", error);
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}
