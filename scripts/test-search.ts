/**
 * Test search script: queries turbopuffer for scenes matching a text query.
 *
 * Usage: npx tsx scripts/test-search.ts "busy fish market in Japan"
 *        npx tsx scripts/test-search.ts "rainy European city" --difficulty easy
 *
 * Requires OPENAI_API_KEY and TURBOPUFFER_API_KEY in .env.local
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { searchScenes } from "../lib/search";

async function main() {
  const args = process.argv.slice(2);
  const query = args.find((a) => !a.startsWith("--"));
  const difficultyIdx = args.indexOf("--difficulty");
  const difficulty =
    difficultyIdx !== -1 ? args[difficultyIdx + 1] : undefined;

  if (!query) {
    console.error(
      'Usage: npx tsx scripts/test-search.ts "your search query" [--difficulty easy|medium|hard]'
    );
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY is not set in .env.local");
    process.exit(1);
  }
  if (!process.env.TURBOPUFFER_API_KEY) {
    console.error("ERROR: TURBOPUFFER_API_KEY is not set in .env.local");
    process.exit(1);
  }

  console.log(`\nSearching for: "${query}"`);
  if (difficulty) {
    console.log(`Filtering by difficulty: ${difficulty}`);
  }
  console.log("---");

  const results = await searchScenes(
    query,
    difficulty ? { difficulty } : undefined,
    5
  );

  if (results.length === 0) {
    console.log("No results found. Have you run the seed script first?");
    console.log("  npx tsx scripts/seed.ts");
    return;
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`\n#${i + 1} [dist: ${r.distance.toFixed(4)}]`);
    console.log(`  ID:         ${r.id}`);
    console.log(`  Location:   ${r.location}`);
    console.log(`  Country:    ${r.country} (${r.continent})`);
    console.log(`  Era:        ${r.era}`);
    console.log(`  Difficulty: ${r.difficulty}`);
    console.log(`  Category:   ${r.category}`);
    console.log(`  Description: ${r.description.slice(0, 120)}...`);
    console.log(`  Sounds:     ${r.sounds.join(", ")}`);
  }

  console.log(`\n--- ${results.length} results returned ---`);
}

main().catch((err) => {
  console.error("Search failed:", err);
  process.exit(1);
});
