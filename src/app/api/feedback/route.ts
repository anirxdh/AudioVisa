import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateFeedback } from "../../../../lib/feedback";

interface FeedbackBody {
  animalId?: string;
  guessId?: string | null;
  correct?: boolean;
}

// Simple per-IP rate limit on live generation
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ipHits = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

/**
 * POST /api/feedback
 *
 * Body: { animalId: string, guessId: string | null, correct: boolean }
 *
 * Returns the mascot feedback for a round — an audio URL + the spoken text.
 * Cached permanently by (animalId, guessId) so replays are instant/free.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeedbackBody;
    const { animalId, correct } = body;
    const guessId = body.guessId ?? null;

    if (!animalId || typeof correct !== "boolean") {
      return NextResponse.json(
        { error: "Missing animalId or correct" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: "Slow down a bit — rate limit reached." },
        { status: 429 }
      );
    }

    const payload = await getOrGenerateFeedback(animalId, guessId, correct);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
