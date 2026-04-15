/**
 * Mascot feedback generation — LLM explanation + TTS, stored entirely in
 * Upstash so it survives serverless cold starts and is shared across every
 * user and every lambda instance.
 *
 * Storage model:
 *   - Cache value: { text, audioDataUrl, correct }
 *   - audioDataUrl is a `data:audio/mpeg;base64,...` string (~30–60KB each).
 *   - No filesystem writes. No /tmp. No /public/feedback.
 *   - Cached indefinitely (manual purge if needed).
 *
 * Cost model:
 *   - Cache hit: zero cost, zero latency.
 *   - Miss: 1 OpenAI call (~$0.005) + 1 ElevenLabs TTS call (~$0.02).
 *
 * Free-tier Upstash limits:
 *   - 256MB storage — easily holds thousands of entries.
 *   - 1MB max per value — well under our ~50KB.
 */

import OpenAI from "openai";
import type { Animal } from "../types/animal";
import { getAnimalById } from "./animals";
import { generateSpeech } from "./elevenlabs";
import { getRedis } from "./upstash";

export interface FeedbackPayload {
  text: string;
  audioDataUrl: string;
  correct: boolean;
}

function cacheKey(animalId: string, guessId: string | null): string {
  return `audiovisa:fb:${animalId}:${guessId ?? "correct"}`;
}

function bufferToDataUrl(buffer: Buffer): string {
  return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
}

function buildPrompt(
  correctAnimal: Animal,
  guessedAnimal: Animal | null,
  correct: boolean
): string {
  if (correct) {
    return [
      `A little kid (age 1-3) just correctly identified a ${correctAnimal.name} by its sound.`,
      `Write a warm, excited, 2-sentence response a friendly safari mascot would say.`,
      `First sentence: celebrate their correct answer in a fun way.`,
      `Second sentence: give a simple kid-friendly fact about why the ${correctAnimal.name} makes that sound.`,
      `Hint for fact: ${correctAnimal.funFact}`,
      `Keep it under 30 words total. No emojis. No quotes around the response.`,
    ].join("\n");
  }
  const wrongPart = guessedAnimal
    ? `They guessed ${guessedAnimal.name}, but the correct answer was ${correctAnimal.name}.`
    : `They didn't pick an answer in time. The correct answer was ${correctAnimal.name}.`;
  return [
    `A little kid (age 1-3) just got a sound-identification question wrong.`,
    wrongPart,
    `Write a gentle, encouraging 2-sentence response a friendly safari mascot would say.`,
    `First sentence: gentle "not quite" without being negative, naming the real answer (${correctAnimal.name}).`,
    `Second sentence: one simple kid-friendly detail about how to tell them apart or why the ${correctAnimal.name} makes that sound.`,
    `Hint for fact: ${correctAnimal.funFact}`,
    `Keep it under 30 words total. No emojis. No quotes around the response.`,
  ].join("\n");
}

async function generateExplanation(
  correctAnimal: Animal,
  guessedAnimal: Animal | null,
  correct: boolean
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content:
          "You are a warm, cheerful safari mascot speaking to a toddler (age 1-3). Use very simple words. Short sentences.",
      },
      {
        role: "user",
        content: buildPrompt(correctAnimal, guessedAnimal, correct),
      },
    ],
  });

  const text = res.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty explanation from OpenAI");
  return text.replace(/^["']|["']$/g, "");
}

/**
 * Get (or lazily generate) feedback for a round. Returns instantly on a
 * cache hit — any user on any serverless instance.
 */
export async function getOrGenerateFeedback(
  correctAnimalId: string,
  guessId: string | null,
  correct: boolean
): Promise<FeedbackPayload> {
  const redis = getRedis();
  const key = cacheKey(correctAnimalId, guessId);

  // 1) Cache hit
  const cached = await redis.get<FeedbackPayload>(key);
  if (
    cached &&
    typeof cached.audioDataUrl === "string" &&
    cached.audioDataUrl.startsWith("data:audio/") &&
    typeof cached.text === "string"
  ) {
    return cached;
  }

  // 2) Generate
  const correctAnimal = getAnimalById(correctAnimalId);
  if (!correctAnimal) throw new Error(`Unknown animalId: ${correctAnimalId}`);
  const guessedAnimal = guessId ? getAnimalById(guessId) ?? null : null;

  const text = await generateExplanation(correctAnimal, guessedAnimal, correct);
  const audioBuffer = await generateSpeech(text);
  const audioDataUrl = bufferToDataUrl(audioBuffer);

  const payload: FeedbackPayload = { text, audioDataUrl, correct };

  // 3) Cache indefinitely in Upstash (shared across every user)
  await redis.set(key, payload);

  return payload;
}
