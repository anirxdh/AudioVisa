import { NextResponse } from "next/server";
import { createGame, type GameRound } from "../../../../../lib/game-engine";
import type { Scene } from "../../../../../types/scene";
import scenesData from "../../../../../data/scenes.json";
import { getAudioUrls } from "../../../../../lib/audio-cache";

/**
 * POST /api/game/start
 *
 * Creates a new game session with 5 rounds (2 easy, 2 medium, 1 hard).
 * Returns game ID and round info WITHOUT scene answers.
 *
 * For each selected scene, checks if audio is cached:
 * - If cached: includes audioUrls in response (instant playback)
 * - If not cached: includes audioUrls as null (frontend triggers generation on demand)
 */
export async function POST() {
  try {
    const scenes = (scenesData as { scenes: Scene[] }).scenes;

    if (scenes.length < 5) {
      return NextResponse.json(
        { error: "Not enough scenes to start a game" },
        { status: 500 }
      );
    }

    const game = createGame(scenes);

    // Check audio cache for each round's scene
    const roundsForClient = await Promise.all(
      game.rounds.map(async (round: GameRound) => {
        const audioUrls = await getAudioUrls(round.scene.id);

        // Update the stored round with audio URLs (null if not cached)
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
    });
  } catch (error) {
    console.error("[game/start] Error:", error);
    return NextResponse.json(
      { error: "Failed to start game" },
      { status: 500 }
    );
  }
}
