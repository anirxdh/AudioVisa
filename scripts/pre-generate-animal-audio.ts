/**
 * Batch-generate ElevenLabs SFX for every animal in data/animals.json and
 * cache them to /public/animals/{id}.mp3.
 *
 * Usage: npx tsx scripts/pre-generate-animal-audio.ts
 *
 * Safe to re-run: already-cached animals are skipped.
 * Requires ELEVENLABS_API_KEY in .env.local.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import type { Animal } from "../types/animal";
import { generateSoundEffect } from "../lib/elevenlabs";

const AUDIO_DIR = path.resolve(__dirname, "..", "public", "animals");

async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("ERROR: ELEVENLABS_API_KEY is not set in .env.local");
    process.exit(1);
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const dataPath = path.resolve(__dirname, "..", "data", "animals.json");
  const { animals } = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as {
    animals: Animal[];
  };
  console.log(`Loaded ${animals.length} animals from ${dataPath}`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, animal] of animals.entries()) {
    const out = path.join(AUDIO_DIR, `${animal.id}.mp3`);
    if (fs.existsSync(out)) {
      skipped++;
      continue;
    }

    const label = `[${i + 1}/${animals.length}] ${animal.name}`;
    try {
      process.stdout.write(`${label}... generating... `);
      const buffer = await generateSoundEffect(animal.sfx_prompt, 5);
      fs.writeFileSync(out, buffer);
      generated++;
      console.log("ok");
    } catch (err) {
      failed++;
      console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(
    `\nDone. Generated ${generated}, skipped ${skipped} (already cached), failed ${failed}.`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Pre-gen failed:", err);
  process.exit(1);
});
