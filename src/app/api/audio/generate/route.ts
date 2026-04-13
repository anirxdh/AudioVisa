import { NextRequest, NextResponse } from "next/server";
import type { Scene } from "../../../../../types/scene";
import scenesData from "../../../../../data/scenes.json";
import {
  generateAndCacheAudio,
  getCachedAudioUrls,
} from "../../../../../lib/audio-cache";

// Simple in-memory token bucket: 10 requests / minute / IP.
// Protects the ElevenLabs quota from abuse. Resets per lambda instance,
// which is acceptable for a hackathon demo.
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
 * POST /api/audio/generate
 *
 * Body: { sceneId: string }
 *
 * Generates (or returns cached) audio for a scene.
 * Returns { sfx: string[], music: string }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sceneId } = body as { sceneId?: string };

    if (!sceneId || typeof sceneId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid sceneId" },
        { status: 400 }
      );
    }

    // Find scene in dataset
    const scenes = (scenesData as { scenes: Scene[] }).scenes;
    const scene = scenes.find((s) => s.id === sceneId);

    if (!scene) {
      return NextResponse.json(
        { error: `Scene not found: ${sceneId}` },
        { status: 404 }
      );
    }

    // Return cached audio immediately if available (no rate limit needed — no upstream call)
    const cached = getCachedAudioUrls(sceneId);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Rate limit ONLY live generation — cached hits are free.
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

    // Generate and cache audio
    const audioUrls = await generateAndCacheAudio(scene);

    return NextResponse.json(audioUrls);
  } catch (error) {
    console.error("[audio/generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}
