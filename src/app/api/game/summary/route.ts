import { NextRequest, NextResponse } from "next/server";
import {
  gameStore,
  getPerformanceRating,
} from "../../../../../lib/game-engine";

interface SummaryBody {
  gameId: string;
}

/**
 * POST /api/game/summary
 *
 * Returns the end-of-game summary: total score, per-round breakdown,
 * performance rating.
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
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const totalScore = game.rounds.reduce((sum, r) => sum + (r.score ?? 0), 0);
    const performanceRating = getPerformanceRating(totalScore);
    game.totalScore = totalScore;
    game.performanceRating = performanceRating;

    const rounds = game.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      animalId: round.animal.id,
      animalName: round.animal.name,
      emoji: round.animal.emoji,
      category: round.animal.category,
      guess: round.guess,
      correct: round.correct,
      score: round.score ?? 0,
    }));

    return NextResponse.json({
      gameId: game.id,
      mode: game.mode,
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
