import { NextRequest, NextResponse } from "next/server";
import { gameStore } from "../../../../../lib/game-engine";

interface HintBody {
  gameId: string;
  roundIndex: number;
}

/**
 * POST /api/game/hint
 *
 * Marks a hint as used for a round (max score reduced to 800).
 * Returns an additional SFX URL if available, otherwise a text hint
 * with the continent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HintBody;
    const { gameId, roundIndex } = body;

    if (!gameId || roundIndex == null) {
      return NextResponse.json(
        { error: "Missing required fields: gameId, roundIndex" },
        { status: 400 }
      );
    }

    const game = gameStore.get(gameId);
    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    if (game.status === "finished") {
      return NextResponse.json(
        { error: "Game is already finished" },
        { status: 400 }
      );
    }

    if (roundIndex < 0 || roundIndex >= game.rounds.length) {
      return NextResponse.json(
        { error: "Invalid round index" },
        { status: 400 }
      );
    }

    const round = game.rounds[roundIndex];

    if (round.revealed) {
      return NextResponse.json(
        { error: "Round already revealed" },
        { status: 400 }
      );
    }

    if (round.hintUsed) {
      return NextResponse.json(
        { error: "Hint already used for this round" },
        { status: 400 }
      );
    }

    // Apply hint penalty
    round.hintUsed = true;
    round.maxScore = 800;

    // Try to get an additional SFX URL from audio cache
    let additionalSfxUrl: string | null = null;
    try {
      const { getAudioUrls } = await import(
        "../../../../../lib/audio-cache"
      );
      const audioUrls = await getAudioUrls(round.scene.id);
      // Return the last SFX URL as the "additional" layer
      if (audioUrls && audioUrls.sfx.length > 1) {
        additionalSfxUrl = audioUrls.sfx[audioUrls.sfx.length - 1];
      }
    } catch {
      // audio-cache not available — fall back to text hint
    }

    // Text hint: reveal the continent
    const textHint = `This soundscape is from ${round.scene.continent}.`;

    return NextResponse.json({
      hintUsed: true,
      maxScore: round.maxScore,
      additionalSfxUrl,
      textHint,
    });
  } catch (error) {
    console.error("[game/hint] Error:", error);
    return NextResponse.json(
      { error: "Failed to process hint" },
      { status: 500 }
    );
  }
}
