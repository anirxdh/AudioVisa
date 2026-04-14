import { NextRequest, NextResponse } from "next/server";
import {
  getCachedAnimalAudioUrl,
  generateAndCacheAnimalAudio,
  getAnimalById,
} from "../../../../../lib/animals";

// Simple in-memory token bucket: 10 live generations / minute / IP.
// Protects the ElevenLabs quota from abuse. Cached hits skip this.
const RATE_LIMIT_MAX = 10;
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
 * POST /api/animal/audio
 *
 * Body: { animalId: string }
 *
 * Returns { audioUrl } — cached if available, otherwise live-generates
 * through ElevenLabs (rate-limited to 10/min/IP).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { animalId } = body as { animalId?: string };

    if (!animalId || typeof animalId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid animalId" },
        { status: 400 }
      );
    }

    const animal = getAnimalById(animalId);
    if (!animal) {
      return NextResponse.json(
        { error: `Animal not found: ${animalId}` },
        { status: 404 }
      );
    }

    // Cached hit — free, no rate limit.
    const cached = getCachedAnimalAudioUrl(animalId);
    if (cached) return NextResponse.json({ audioUrl: cached });

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute." },
        { status: 429 }
      );
    }

    const audioUrl = await generateAndCacheAnimalAudio(animal);
    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("[animal/audio] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}
