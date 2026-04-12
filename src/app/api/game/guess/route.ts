import { NextRequest, NextResponse } from "next/server";
import {
  gameStore,
  calculateScore,
  getPerformanceRating,
} from "../../../../../lib/game-engine";
import {
  generateEmbedding,
  buildSceneEmbeddingText,
} from "../../../../../lib/embeddings";

interface GuessBody {
  gameId: string;
  roundIndex: number;
  guess: {
    location: string;
    era: string;
  };
}

/**
 * POST /api/game/guess
 *
 * Accepts a player's guess for a round, embeds it, computes vector distance
 * against the correct scene, and returns the score + reveal data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GuessBody;
    const { gameId, roundIndex, guess } = body;

    // Validate required fields
    if (!gameId || roundIndex == null || !guess?.location || !guess?.era) {
      return NextResponse.json(
        { error: "Missing required fields: gameId, roundIndex, guess.location, guess.era" },
        { status: 400 }
      );
    }

    // Look up game
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

    // Validate round index
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

    const scene = round.scene;

    // Build text representations for embedding
    const guessText = `${guess.location}, ${guess.era}`;
    const answerText = buildSceneEmbeddingText(scene);

    // Generate embeddings in parallel
    const [guessVector, answerVector] = await Promise.all([
      generateEmbedding(guessText),
      generateEmbedding(answerText),
    ]);

    // Calculate score
    const { score, distance } = calculateScore(
      guessVector,
      answerVector,
      round.hintUsed
    );

    // Update game state
    round.guess = guess;
    round.score = score;
    round.revealed = true;
    game.totalScore = game.rounds.reduce((sum, r) => sum + (r.score ?? 0), 0);

    // Advance to next round or finish
    if (roundIndex + 1 < game.rounds.length) {
      game.currentRound = roundIndex + 1;
    } else {
      game.status = "finished";
      game.performanceRating = getPerformanceRating(game.totalScore);
    }

    return NextResponse.json({
      score,
      maxScore: round.maxScore,
      distance: Math.round(distance * 1000) / 1000, // 3 decimal places
      correctAnswer: {
        location: scene.location,
        country: scene.country,
        continent: scene.continent,
        era: scene.era,
        description: scene.description,
        sounds: scene.sounds,
      },
      totalScore: game.totalScore,
      gameStatus: game.status,
      performanceRating: game.status === "finished" ? game.performanceRating : null,
    });
  } catch (error) {
    console.error("[game/guess] Error:", error);
    return NextResponse.json(
      { error: "Failed to process guess" },
      { status: 500 }
    );
  }
}
