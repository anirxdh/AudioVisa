/**
 * Seed script: generates embeddings for all scenes and upserts them to turbopuffer.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires OPENAI_API_KEY and TURBOPUFFER_API_KEY in .env.local
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import type { Scene } from "../types/scene";
import {
  generateEmbeddings,
  buildSceneEmbeddingText,
} from "../lib/embeddings";
import { getNamespace } from "../lib/turbopuffer";

const BATCH_SIZE = 100; // OpenAI supports up to 2048, but we batch for progress logging

async function main() {
  // --- Validate environment ---
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is not set in .env.local");
    process.exit(1);
  }
  if (!process.env.TURBOPUFFER_API_KEY) {
    console.error("ERROR: TURBOPUFFER_API_KEY is not set in .env.local");
    console.error(
      "Set it in .env.local and re-run: npx tsx scripts/seed.ts"
    );
    process.exit(1);
  }

  // --- Load scenes ---
  const dataPath = path.resolve(__dirname, "..", "data", "scenes.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const { scenes } = JSON.parse(raw) as { scenes: Scene[] };
  console.log(`Loaded ${scenes.length} scenes from ${dataPath}`);

  // --- Process in batches ---
  const ns = getNamespace();
  let totalUpserted = 0;
  const totalBatches = Math.ceil(scenes.length / BATCH_SIZE);

  for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
    const batch = scenes.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    // Build embedding texts
    const texts = batch.map((scene) => buildSceneEmbeddingText(scene));

    // Generate embeddings for the batch
    console.log(
      `Generating embeddings for batch ${batchNum}/${totalBatches} (${batch.length} scenes)...`
    );
    const embeddings = await generateEmbeddings(texts);

    // Build upsert rows with all metadata
    const upsertRows = batch.map((scene, idx) => ({
      id: scene.id,
      vector: embeddings[idx],
      location: scene.location,
      country: scene.country,
      continent: scene.continent,
      era: scene.era,
      difficulty: scene.difficulty,
      description: scene.description,
      sounds: JSON.stringify(scene.sounds),
      sfx_prompts: JSON.stringify(scene.sfx_prompts),
      music_prompt: scene.music_prompt,
      category: scene.category,
    }));

    // Upsert to turbopuffer
    await ns.write({
      upsert_rows: upsertRows,
      distance_metric: "cosine_distance",
    });

    totalUpserted += batch.length;
    console.log(
      `Embedded batch ${batchNum}/${totalBatches}, total upserted: ${totalUpserted}`
    );
  }

  console.log(
    `\nDone! Successfully indexed ${totalUpserted} scenes in turbopuffer namespace "soundguessr-scenes".`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
