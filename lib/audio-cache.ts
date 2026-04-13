/**
 * Audio cache — stores generated audio on disk.
 *
 * Local dev: writes to /public/audio/{sceneId}/ so Next.js serves them as
 * static assets at /audio/{sceneId}/...
 *
 * Vercel serverless: /public is read-only, so we write to /tmp/audio/{sceneId}/
 * and serve the bytes through /api/audio/file/{sceneId}/{filename}.
 * Note: /tmp is per-lambda-instance, so cache hit rate is lower on Vercel —
 * pre-generating via scripts/pre-generate.ts is still strongly recommended.
 */

import * as fs from "fs";
import * as path from "path";
import { Scene } from "../types/scene";
import { generateSoundEffect, generateMusic } from "./elevenlabs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IS_SERVERLESS = !!process.env.VERCEL;
const AUDIO_DIR = IS_SERVERLESS
  ? path.join("/tmp", "audio")
  : path.join(process.cwd(), "public", "audio");
const URL_PREFIX = IS_SERVERLESS ? "/api/audio/file" : "/audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioUrls {
  sfx: string[]; // e.g. ["/audio/{sceneId}/sfx-0.mp3", "/audio/{sceneId}/sfx-1.mp3"]
  music: string; // e.g. "/audio/{sceneId}/music.mp3"
}

// Re-export as SceneAudio for compatibility
export type SceneAudio = AudioUrls;

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

/**
 * Get the filesystem directory for a scene's cached audio.
 */
export function getAudioDir(sceneId: string): string {
  return path.join(AUDIO_DIR, sceneId);
}

/**
 * Check whether audio is fully cached for a scene.
 * Requires at least 1 sfx file and 1 music file.
 */
export function isAudioCached(sceneId: string): boolean {
  const dir = getAudioDir(sceneId);
  if (!fs.existsSync(dir)) return false;

  const files = fs.readdirSync(dir);
  return (
    files.some((f) => f.startsWith("sfx-")) &&
    files.some((f) => f === "music.mp3")
  );
}

/**
 * Get cached audio URLs for a scene.
 * Returns null if audio hasn't been generated yet.
 */
export function getCachedAudioUrls(sceneId: string): AudioUrls | null {
  if (!isAudioCached(sceneId)) return null;

  const dir = getAudioDir(sceneId);
  const files = fs.readdirSync(dir);
  const sfx = files
    .filter((f) => f.startsWith("sfx-"))
    .sort()
    .map((f) => `${URL_PREFIX}/${sceneId}/${f}`);
  const music = `${URL_PREFIX}/${sceneId}/music.mp3`;

  return { sfx, music };
}

/**
 * Backwards-compatible alias used by game start route.
 */
export async function getAudioUrls(
  sceneId: string
): Promise<AudioUrls | null> {
  return getCachedAudioUrls(sceneId);
}

// ---------------------------------------------------------------------------
// Generation + caching
// ---------------------------------------------------------------------------

/**
 * Generate all audio for a scene (SFX clips + music track) and cache to disk.
 * Returns cached URLs immediately if audio already exists.
 */
export async function generateAndCacheAudio(scene: Scene): Promise<AudioUrls> {
  // Check cache first
  const cached = getCachedAudioUrls(scene.id);
  if (cached) return cached;

  const dir = getAudioDir(scene.id);
  fs.mkdirSync(dir, { recursive: true });

  // Generate SFX clips (2-3 from scene.sfx_prompts)
  const sfxUrls: string[] = [];
  for (let i = 0; i < scene.sfx_prompts.length; i++) {
    const buffer = await generateSoundEffect(scene.sfx_prompts[i], 10);
    const filename = `sfx-${i}.mp3`;
    fs.writeFileSync(path.join(dir, filename), buffer);
    sfxUrls.push(`${URL_PREFIX}/${scene.id}/${filename}`);
  }

  // Generate music track (30s instrumental)
  const musicBuffer = await generateMusic(scene.music_prompt, 30000);
  fs.writeFileSync(path.join(dir, "music.mp3"), musicBuffer);

  return {
    sfx: sfxUrls,
    music: `${URL_PREFIX}/${scene.id}/music.mp3`,
  };
}
