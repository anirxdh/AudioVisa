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

// ---------------------------------------------------------------------------
// Text-to-Speech (kid-friendly mascot voice)
// ---------------------------------------------------------------------------

/**
 * Warm, friendly English female voice — good default for a kids' mascot.
 * Override with ELEVENLABS_MASCOT_VOICE_ID if you want a different voice.
 */
const DEFAULT_MASCOT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // "Bella"

/**
 * Convert a short text line into a spoken audio Buffer (mp3).
 * Used to generate per-round mascot feedback.
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  const voiceId =
    process.env.ELEVENLABS_MASCOT_VOICE_ID || DEFAULT_MASCOT_VOICE;

  const stream = await getClient().textToSpeech.convert(voiceId, {
    text,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.3,
    },
  });

  return streamToBuffer(stream);
}
