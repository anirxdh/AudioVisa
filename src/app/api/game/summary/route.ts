import { NextRequest, NextResponse } from "next/server";
import { gameStore, getPerformanceRating } from "../../../../../lib/game-engine";

interface SummaryBody {
  gameId: string;
}

/**
 * POST /api/game/summary
 *
 * Returns the end-of-game summary: total score, per-round breakdown,
 * and performance rating.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SummaryBody;
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required field: gameId" },
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

    // Calculate total from stored rounds (in case called before finish)
    const totalScore = game.rounds.reduce(
      (sum, r) => sum + (r.score ?? 0),
      0
    );
    const performanceRating = getPerformanceRating(totalScore);

    // Update game state
    game.totalScore = totalScore;
    game.performanceRating = performanceRating;

    const rounds = game.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      sceneId: round.scene.id,
      location: round.scene.location,
      country: round.scene.country,
      era: round.scene.era,
      difficulty: round.scene.difficulty,
      guess: round.guess,
      score: round.score ?? 0,
      maxScore: round.maxScore,
      hintUsed: round.hintUsed,
      sounds: round.scene.sounds,
    }));

    return NextResponse.json({
      gameId: game.id,
      totalScore,
      maxPossibleScore: 5000,
      performanceRating,
      rounds,
      status: game.status,
    });
  } catch (error) {
    console.error("[game/summary] Error:", error);
    return NextResponse.json(
      { error: "Failed to get game summary" },
      { status: 500 }
    );
  }
}
