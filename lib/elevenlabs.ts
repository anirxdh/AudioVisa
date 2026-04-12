/**
 * ElevenLabs client wrapper for sound effects and music generation.
 *
 * Provides lazy-initialized client and helper functions that return
 * audio data as Buffers from the ElevenLabs streaming APIs.
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// ---------------------------------------------------------------------------
// Client (lazy init so env vars are loaded before construction)
// ---------------------------------------------------------------------------

let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ELEVENLABS_API_KEY is not set. Add it to .env.local."
      );
    }
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}

// ---------------------------------------------------------------------------
// Stream-to-Buffer helper
// ---------------------------------------------------------------------------

/**
 * Collect a ReadableStream<Uint8Array> into a single Buffer.
 */
async function streamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Sound Effects
// ---------------------------------------------------------------------------

/**
 * Generate a single sound effect clip from a text prompt.
 *
 * @param prompt          Descriptive text for the sound (e.g. "Metal chains dragging across concrete")
 * @param durationSeconds Target duration in seconds (default 10)
 * @returns               Raw audio data as a Buffer (mp3)
 */
export async function generateSoundEffect(
  prompt: string,
  durationSeconds: number = 10
): Promise<Buffer> {
  const stream = await getClient().textToSoundEffects.convert({
    text: prompt,
    durationSeconds,
    promptInfluence: 0.3,
  });

  return streamToBuffer(stream);
}

// ---------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------

/**
 * Generate an instrumental music track from a text prompt.
 *
 * @param prompt   Descriptive text for the music style/mood
 * @param lengthMs Duration in milliseconds (default 30000 = 30s)
 * @returns        Raw audio data as a Buffer (mp3)
 */
export async function generateMusic(
  prompt: string,
  lengthMs: number = 30000
): Promise<Buffer> {
  const stream = await getClient().music.compose({
    prompt,
    musicLengthMs: lengthMs,
    forceInstrumental: true,
  });

  return streamToBuffer(stream);
}
