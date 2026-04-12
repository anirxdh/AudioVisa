import { NextResponse } from "next/server";
import { createGame, type GameRound } from "../../../../../lib/game-engine";
import type { Scene } from "../../../../../types/scene";
import scenesData from "../../../../../data/scenes.json";

/**
 * POST /api/game/start
 *
 * Creates a new game session with 5 rounds (2 easy, 2 medium, 1 hard).
 * Returns game ID and round info WITHOUT scene answers.
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

    // Attempt to load audio URLs for each round.
    // Audio cache may not be available yet (Phase 3 parallel work).
    const roundsForClient = await Promise.all(
      game.rounds.map(async (round: GameRound) => {
        let audioUrls: { sfx: string[]; music: string } | null = null;

        try {
          // Dynamic import — audio-cache may not exist yet
          const { getAudioUrls } = await import(
            "../../../../../lib/audio-cache"
          );
          audioUrls = await getAudioUrls(round.scene.id);
        } catch {
          // audio-cache module not available yet — that's fine
          audioUrls = null;
        }

        // Update the stored round with audio URLs
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
