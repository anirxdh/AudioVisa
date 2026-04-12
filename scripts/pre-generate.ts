/**
 * Pre-generate audio for hero scenes (first 30 in scenes.json).
 *
 * Usage: npx tsx scripts/pre-generate.ts
 *
 * Requires ELEVENLABS_API_KEY in .env.local.
 *
 * WARNING: This script calls the ElevenLabs API and costs credits.
 * Each scene generates 2-3 SFX clips + 1 music track.
 * Estimated cost: ~30 scenes x (3 SFX + 1 music) = ~120 API calls.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import type { Scene } from "../types/scene";
import { generateAndCacheAudio, isAudioCached } from "../lib/audio-cache";

const HERO_COUNT = 30;
const DELAY_MS = 1000; // 1 second between scenes to avoid rate limiting

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // --- Validate environment ---
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("ERROR: ELEVENLABS_API_KEY is not set in .env.local");
    process.exit(1);
  }

  // --- Load scenes ---
  const scenesPath = path.join(process.cwd(), "data", "scenes.json");
  if (!fs.existsSync(scenesPath)) {
    console.error("ERROR: data/scenes.json not found");
    process.exit(1);
  }

  const raw = fs.readFileSync(scenesPath, "utf-8");
  const { scenes } = JSON.parse(raw) as { scenes: Scene[] };

  const heroScenes = scenes.slice(0, HERO_COUNT);
  console.log(`\nPre-generating audio for ${heroScenes.length} hero scenes...\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < heroScenes.length; i++) {
    const scene = heroScenes[i];
    const label = `[${i + 1}/${heroScenes.length}]`;

    // Skip if already cached
    if (isAudioCached(scene.id)) {
      console.log(`${label} CACHED (skipping): ${scene.id}`);
      skipped++;
      continue;
    }

    console.log(`${label} Generating audio for: ${scene.id}`);
    console.log(`      SFX prompts: ${scene.sfx_prompts.length}`);
    console.log(`      Music prompt: "${scene.music_prompt.slice(0, 60)}..."`);

    try {
      const startTime = Date.now();
      const audioUrls = await generateAndCacheAudio(scene);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`      Done in ${elapsed}s — ${audioUrls.sfx.length} SFX + 1 music`);
      generated++;
    } catch (error) {
      console.error(`      FAILED: ${error instanceof Error ? error.message : error}`);
      failed++;
    }

    // Delay between scenes to avoid rate limiting
    if (i < heroScenes.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // --- Report ---
  console.log("\n--- Pre-generation complete ---");
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped (cached): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${heroScenes.length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
