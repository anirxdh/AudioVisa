import { NextRequest, NextResponse } from "next/server";
import type { Scene } from "../../../../../types/scene";
import scenesData from "../../../../../data/scenes.json";
import {
  generateAndCacheAudio,
  getCachedAudioUrls,
} from "../../../../../lib/audio-cache";

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

    // Return cached audio immediately if available
    const cached = getCachedAudioUrls(sceneId);
    if (cached) {
      return NextResponse.json(cached);
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
