/**
 * Pre-generate mascot feedback lines for every animal + the most common
 * same-category decoy pairs. Warms the Upstash cache so the live game never
 * triggers an LLM/TTS call for hot paths.
 *
 * Usage: npx tsx scripts/pre-generate-feedback.ts
 *
 * Cost estimate:
 *   - ~55 correct lines + ~3 decoy pairs per animal = ~220 calls
 *   - OpenAI: ~$0.005 each → ~$1.10
 *   - ElevenLabs: ~$0.02 each → ~$4.40
 *   - One-time warm-up total: ~$5.50
 *
 * Safe to re-run: cache hits are instant, only missing pairs are generated.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import type { Animal } from "../types/animal";
import { getAllAnimals } from "../lib/animals";
import { getOrGenerateFeedback } from "../lib/feedback";

function pickDecoyIdsForAnimal(animal: Animal, all: Animal[]): string[] {
  // Warm EVERY same-category decoy — these are the only wrong answers the
  // MC options picker ever shows, so this guarantees zero live-generation
  // for any plausible guess. Across the dataset this is ~350 pairs
  // (~$8 one-time warm-up).
  return all
    .filter((a) => a.category === animal.category && a.id !== animal.id)
    .map((a) => a.id);
}

async function main() {
  const must = ["OPENAI_API_KEY", "ELEVENLABS_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  for (const name of must) {
    if (!process.env[name]) {
      console.error(`ERROR: ${name} is not set in .env.local`);
      process.exit(1);
    }
  }

  const animals = getAllAnimals();
  console.log(`Warming feedback cache for ${animals.length} animals...`);

  let done = 0;
  let errors = 0;

  for (const animal of animals) {
    // 1) Correct-answer line
    try {
      process.stdout.write(`[${++done}/${animals.length}] ${animal.name} (correct)... `);
      await getOrGenerateFeedback(animal.id, null, true);
      console.log("ok");
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
      errors++;
    }

    // 2) Decoy pairs (wrong)
    const decoys = pickDecoyIdsForAnimal(animal, animals);
    for (const decoyId of decoys) {
      try {
        process.stdout.write(`   ↳ wrong: ${decoyId}... `);
        await getOrGenerateFeedback(animal.id, decoyId, false);
        console.log("ok");
      } catch (err) {
        console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
        errors++;
      }
    }
  }

  console.log(`\nDone. ${done} animals, ${errors} failures.`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Pre-gen failed:", err);
  process.exit(1);
});
