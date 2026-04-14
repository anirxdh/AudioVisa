/**
 * Seed script — generates embeddings for all animals and upserts them to
 * turbopuffer namespace "audiovisa-animals".
 *
 * Usage: npx tsx scripts/seed-animals.ts
 *
 * Requires OPENAI_API_KEY and TURBOPUFFER_API_KEY in .env.local.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Turbopuffer from "@turbopuffer/turbopuffer";
import * as fs from "fs";
import * as path from "path";
import type { Animal } from "../types/animal";
import { generateEmbeddings } from "../lib/embeddings";

const NAMESPACE = "audiovisa-animals";
const BATCH_SIZE = 50;

function buildEmbeddingText(a: Animal): string {
  return `${a.name} (${a.category}). ${a.description} Fun fact: ${a.funFact}`;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is not set in .env.local");
    process.exit(1);
  }
  if (!process.env.TURBOPUFFER_API_KEY) {
    console.error("ERROR: TURBOPUFFER_API_KEY is not set in .env.local");
    process.exit(1);
  }

  const tpuf = new Turbopuffer({
    apiKey: process.env.TURBOPUFFER_API_KEY,
    region: (process.env.TURBOPUFFER_REGION as "gcp-us-east4") || "gcp-us-east4",
  });
  const ns = tpuf.namespace(NAMESPACE);

  const dataPath = path.resolve(__dirname, "..", "data", "animals.json");
  const { animals } = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as {
    animals: Animal[];
  };
  console.log(`Loaded ${animals.length} animals from ${dataPath}`);

  let upserted = 0;
  const totalBatches = Math.ceil(animals.length / BATCH_SIZE);

  for (let i = 0; i < animals.length; i += BATCH_SIZE) {
    const batch = animals.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(
      `Embedding batch ${batchNum}/${totalBatches} (${batch.length} animals)...`
    );
    const embeddings = await generateEmbeddings(batch.map(buildEmbeddingText));

    const rows = batch.map((a, idx) => ({
      id: a.id,
      vector: embeddings[idx],
      name: a.name,
      emoji: a.emoji,
      category: a.category,
      difficulty: a.difficulty,
      description: a.description,
      funFact: a.funFact,
    }));

    await ns.write({
      upsert_rows: rows,
      distance_metric: "cosine_distance",
    });

    upserted += batch.length;
    console.log(`  Upserted ${upserted}/${animals.length}`);
  }

  console.log(
    `\nDone! Indexed ${upserted} animals in turbopuffer namespace "${NAMESPACE}".`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
