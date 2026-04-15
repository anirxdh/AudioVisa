import { NextRequest, NextResponse } from "next/server";
import {
  getGame,
  saveGame,
  getPerformanceRating,
  POINTS_PER_CORRECT,
} from "../../../../../lib/game-engine";

interface GuessBody {
  gameId: string;
  roundIndex: number;
  guess: string;
}

/**
 * POST /api/game/guess
 *
 * Binary match: 1000 pts if the picked animal name equals the correct
 * animal's name, 0 otherwise. Empty strings (auto-submit on timer expiry)
 * always score 0.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GuessBody;
    const { gameId, roundIndex } = body;
    const guess = body.guess ?? "";

    if (!gameId || roundIndex == null) {
      return NextResponse.json(
        { error: "Missing required fields: gameId, roundIndex" },
        { status: 400 }
      );
    }

    const game = await getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
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
        { error: "Round already answered" },
        { status: 400 }
      );
    }

    const correct = guess === round.animal.name;
    const score = correct ? POINTS_PER_CORRECT : 0;

    round.guess = guess;
    round.correct = correct;
    round.score = score;
    round.revealed = true;
    game.totalScore = game.rounds.reduce((sum, r) => sum + (r.score ?? 0), 0);

    if (roundIndex + 1 < game.rounds.length) {
      game.currentRound = roundIndex + 1;
    } else {
      game.status = "finished";
      game.performanceRating = getPerformanceRating(game.totalScore);
    }

    await saveGame(game);

    return NextResponse.json({
      score,
      correct,
      correctAnswer: {
        id: round.animal.id,
        name: round.animal.name,
        emoji: round.animal.emoji,
        category: round.animal.category,
        description: round.animal.description,
        funFact: round.animal.funFact,
      },
      totalScore: game.totalScore,
      gameStatus: game.status,
      performanceRating:
        game.status === "finished" ? game.performanceRating : null,
    });
  } catch (error) {
    console.error("[game/guess] Error:", error);
    return NextResponse.json(
      { error: "Failed to process guess" },
      { status: 500 }
    );
  }
}
