import { NextRequest, NextResponse } from "next/server";
import { getGame } from "../../../../../lib/game-engine";
import { getOrGenerateFeedback } from "../../../../../lib/feedback";
import { getAllAnimals } from "../../../../../lib/animals";

/**
 * POST /api/feedback/prewarm
 *
 * Body: { gameId, roundIndex }
 *
 * Warms the Upstash cache for ALL 4 option outcomes of a given round
 * so that whichever option the kid picks, /api/feedback returns instantly.
 *
 * Called by the client on round load (fire-and-forget). Does not return
 * the actual payloads — they stay in cache and /api/feedback serves them.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, roundIndex } = body as {
      gameId?: string;
      roundIndex?: number;
    };

    if (!gameId || roundIndex == null) {
      return NextResponse.json(
        { error: "Missing gameId or roundIndex" },
        { status: 400 }
      );
    }

    const game = await getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const round = game.rounds[roundIndex];
    if (!round) {
      return NextResponse.json(
        { error: "Invalid roundIndex" },
        { status: 400 }
      );
    }

    const correctAnimalId = round.animal.id;
    const options = round.options; // 4 animal names

    // Look up the animalId for each option name
    const allAnimals = getAllAnimals();
    const nameToId = new Map(allAnimals.map((a) => [a.name, a.id]));

    // Warm all 4 outcomes in parallel
    const warmups = options.map(async (optionName) => {
      const optionId = nameToId.get(optionName);
      const isCorrect = optionName === round.animal.name;
      try {
        await getOrGenerateFeedback(
          correctAnimalId,
          isCorrect ? null : (optionId ?? null),
          isCorrect
        );
      } catch {
        // Silent — prewarm is best-effort
      }
    });

    await Promise.all(warmups);

    return NextResponse.json({ warmed: options.length });
  } catch (error) {
    console.error("[feedback/prewarm] Error:", error);
    return NextResponse.json(
      { error: "Failed to prewarm" },
      { status: 500 }
    );
  }
}
