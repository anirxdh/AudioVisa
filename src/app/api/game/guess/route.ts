import { NextRequest, NextResponse } from "next/server";
import {
  gameStore,
  calculateScore,
  getPerformanceRating,
} from "../../../../../lib/game-engine";
import { generateEmbeddings } from "../../../../../lib/embeddings";

interface GuessBody {
  gameId: string;
  roundIndex: number;
  guess: {
    location: string;
    era: string;
  };
}

/**
 * Simple string-matching fallback scorer.
 * Used when OPENAI_API_KEY is not available (no embeddings).
 * Compares guess text against scene location/country/era using
 * case-insensitive substring matching.
 */
function fallbackScore(
  guess: { location: string; era: string },
  scene: { location: string; country: string; continent: string; era: string },
  hintUsed: boolean
): { score: number; distance: number } {
  const maxScore = hintUsed ? 800 : 1000;
  let points = 0;

  const guessLoc = guess.location.toLowerCase().trim();
  const sceneLoc = scene.location.toLowerCase();
  const sceneCountry = scene.country.toLowerCase();
  const sceneContinent = scene.continent.toLowerCase();

  // Exact location match: 500 pts
  if (guessLoc === sceneLoc || sceneLoc.includes(guessLoc) || guessLoc.includes(sceneLoc)) {
    points += 500;
  }
  // Country match: 250 pts
  else if (guessLoc.includes(sceneCountry) || sceneCountry.includes(guessLoc)) {
    points += 250;
  }
  // Continent match: 100 pts
  else if (guessLoc.includes(sceneContinent) || sceneContinent.includes(guessLoc)) {
    points += 100;
  }

  // Era match: exact decade = 300 pts, within 20 years = 150 pts
  const guessDecade = parseInt(guess.era.replace("s", ""), 10);
  const sceneDecade = parseInt(scene.era.replace("s", ""), 10);
  if (!isNaN(guessDecade) && !isNaN(sceneDecade)) {
    const diff = Math.abs(guessDecade - sceneDecade);
    if (diff === 0) points += 300;
    else if (diff <= 20) points += 150;
    else if (diff <= 50) points += 50;
  }

  const score = Math.min(points, maxScore);
  // Approximate distance from score for consistency
  const distance = 1 - Math.sqrt(score / 1000);
  return { score, distance: Math.round(distance * 1000) / 1000 };
}

/**
 * POST /api/game/guess
 *
 * Accepts a player's guess for a round, embeds it, computes vector distance
 * against the correct scene, and returns the score + reveal data.
 *
 * Falls back to string-matching scoring if OPENAI_API_KEY is not set.
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

    let score: number;
    let distance: number;

    // Use embedding-based scoring if OPENAI_API_KEY is available, else fallback
    if (process.env.OPENAI_API_KEY) {
      // Embed only location+country+era on both sides so the location/time
      // signal isn't drowned by long prose in the scene description.
      const guessText = `${guess.location}, ${guess.era}`;
      const answerText = `${scene.location}, ${scene.country}, ${scene.era}`;

      const [guessVector, answerVector] = await generateEmbeddings([
        guessText,
        answerText,
      ]);

      const result = calculateScore(guessVector, answerVector, round.hintUsed);
      score = result.score;
      distance = result.distance;
    } else {
      console.warn("[game/guess] OPENAI_API_KEY not set — using fallback string-matching scorer");
      const result = fallbackScore(guess, scene, round.hintUsed);
      score = result.score;
      distance = result.distance;
    }

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
