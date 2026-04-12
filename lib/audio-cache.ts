/**
 * Audio cache stub — Phase 3 will implement the full audio generation pipeline.
 * This provides the type contract so game API routes can import safely.
 */

export interface AudioUrls {
  sfx: string[];
  music: string;
}

/**
 * Get cached audio URLs for a scene.
 * Returns null if audio hasn't been generated yet.
 *
 * Phase 3 will replace this with real cache logic (filesystem or KV store).
 */
export async function getAudioUrls(
  _sceneId: string
): Promise<AudioUrls | null> {
  // Stub: no audio generated yet
  return null;
}
