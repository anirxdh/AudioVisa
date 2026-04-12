import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL = "gpt-4o-mini";
const BATCH_SIZE = 10;
const DATA_PATH = path.resolve(__dirname, "..", "data", "scenes.json");

const VALID_CATEGORIES = [
  "markets",
  "historical",
  "city_streets",
  "nature",
  "industrial",
  "festivals",
  "transport",
] as const;

type SceneCategory = (typeof VALID_CATEGORIES)[number];
type Difficulty = "easy" | "medium" | "hard";

// ---------------------------------------------------------------------------
// Zod schema matching Scene interface
// ---------------------------------------------------------------------------
const SceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "Must be kebab-case"),
  location: z.string().min(1),
  country: z.string().min(1),
  continent: z.enum([
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Africa",
    "Oceania",
  ]),
  era: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  description: z.string().min(20),
  sounds: z.array(z.string().min(5)).min(4).max(6),
  sfx_prompts: z.array(z.string().min(30)).min(2).max(3),
  music_prompt: z.string().min(20),
  category: z.enum(VALID_CATEGORIES),
});

const BatchSchema = z.object({
  scenes: z.array(SceneSchema),
});

type SceneData = z.infer<typeof SceneSchema>;

// ---------------------------------------------------------------------------
// Category generation targets
// ---------------------------------------------------------------------------
interface CategoryTarget {
  category: SceneCategory;
  total: number;
  easy: number;
  medium: number;
  hard: number;
}

const CATEGORY_TARGETS: CategoryTarget[] = [
  { category: "markets", total: 25, easy: 8, medium: 12, hard: 5 },
  { category: "historical", total: 25, easy: 5, medium: 13, hard: 7 },
  { category: "city_streets", total: 25, easy: 8, medium: 12, hard: 5 },
  { category: "nature", total: 25, easy: 10, medium: 10, hard: 5 },
  { category: "industrial", total: 20, easy: 5, medium: 10, hard: 5 },
  { category: "festivals", total: 25, easy: 8, medium: 12, hard: 5 },
  { category: "transport", total: 25, easy: 8, medium: 12, hard: 5 },
];

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert sound designer and cultural geographer creating scene descriptions for SoundGuessr, a game where players guess locations and eras from soundscapes.

## Acoustic Fingerprint Theory
Every scene must have layered audio that makes it identifiable:
1. **Biome layer** — Environmental baseline (tropical humidity, arctic stillness, temperate bustle)
2. **Soundmark layer** — Iconic recognizable sounds (Big Ben chimes, muezzin call, steam train whistle)
3. **Cultural-linguistic layer** — Language fragments, accent markers, regional music genres
4. **Era/technology layer** — Period-specific sounds (horse hooves vs car engines, vinyl crackle vs digital beeps)
5. **Microlocal layer** — Hyper-specific details (specific market vendor calls, regional bird species, local slang)

## ElevenLabs SFX Prompt Guidelines
- Each sfx_prompt must be 30+ characters and richly descriptive
- Describe a complete audio scene, not just a single sound effect
- Include spatial context (indoor/outdoor, reverberant/open), intensity, and layering
- Be specific about textures and qualities (e.g., "crackling campfire with popping embers" not just "fire")
- Good: "Busy morning fish market with vendors shouting prices, ice crunching as fish are arranged, and seagulls calling overhead"
- Bad: "Market sounds" or "Fish market"

## Difficulty Calibration
- **easy** — Globally iconic sounds that most people would recognize (Big Ben, NYC traffic, Amazon birds)
- **medium** — Regionally recognizable, requires some cultural awareness (specific market type, regional instrument)
- **hard** — Specialist knowledge needed, but the scene is still guessable with careful listening (specific historical event sounds, rare instruments, obscure locations)

## Scene Requirements
- id: kebab-case, descriptive, unique (e.g., "bangkok-floating-market-1990s")
- location: Specific real place name
- country, continent, era: Historically accurate
- description: 2-3 vivid atmospheric sentences
- sounds: 4-6 specific, descriptive sounds (never generic like "market sounds")
- sfx_prompts: 2-3 detailed prompts each 30+ characters
- music_prompt: 1 detailed prompt for era/region-appropriate instrumental music

## Geographic Diversity
Spread scenes across all 6 continents. Include both well-known and lesser-known locations.
Do NOT repeat locations or create scenes that are too similar to each other.

## Era Diversity
Cover a wide range from 1800s to 2020s. Match technology sounds to era accurately.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadScenes(): SceneData[] {
  if (!fs.existsSync(DATA_PATH)) {
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  return raw.scenes || [];
}

function saveScenes(scenes: SceneData[]): void {
  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify({ scenes }, null, 2) + "\n",
    "utf-8"
  );
}

function getExistingIds(scenes: SceneData[]): Set<string> {
  return new Set(scenes.map((s) => s.id));
}

function getExistingLocations(scenes: SceneData[]): string[] {
  return scenes.map((s) => `${s.location}, ${s.country} (${s.era})`);
}

function countByCategory(
  scenes: SceneData[],
  category: SceneCategory
): { total: number; easy: number; medium: number; hard: number } {
  const catScenes = scenes.filter((s) => s.category === category);
  return {
    total: catScenes.length,
    easy: catScenes.filter((s) => s.difficulty === "easy").length,
    medium: catScenes.filter((s) => s.difficulty === "medium").length,
    hard: catScenes.filter((s) => s.difficulty === "hard").length,
  };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------
async function generateBatch(
  client: OpenAI,
  category: SceneCategory,
  count: number,
  difficultyMix: { easy: number; medium: number; hard: number },
  existingLocations: string[],
  existingIds: Set<string>
): Promise<SceneData[]> {
  const locationList =
    existingLocations.length > 0
      ? `\n\nALREADY USED LOCATIONS (do NOT repeat these):\n${existingLocations.join("\n")}`
      : "";

  const userPrompt = `Generate exactly ${count} unique scene descriptions for the "${category}" category.

Difficulty distribution for this batch:
- easy: ${difficultyMix.easy}
- medium: ${difficultyMix.medium}
- hard: ${difficultyMix.hard}

Each scene must be for a DIFFERENT real-world location. Ensure geographic diversity across continents and eras (range from 1800s to 2020s).
${locationList}

Return the scenes in a JSON object with a "scenes" array.`;

  const completion = await client.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(BatchSchema, "scene_batch"),
    temperature: 0.9,
    max_tokens: 16000,
  });

  const message = completion.choices[0]?.message;
  if (!message?.parsed) {
    const refusal = message?.refusal;
    if (refusal) {
      console.error(`  API refused: ${refusal}`);
    }
    console.error("  Failed to parse response from API");
    return [];
  }

  // Deduplicate against existing IDs
  const newScenes = message.parsed.scenes.filter((s) => {
    if (existingIds.has(s.id)) {
      console.log(`  Skipping duplicate ID: ${s.id}`);
      return false;
    }
    return true;
  });

  return newScenes;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "ERROR: OPENAI_API_KEY not set. Set it in .env.local or pass as environment variable."
    );
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  console.log("=== SoundGuessr Scene Generator ===\n");
  console.log(`Model: ${MODEL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Data file: ${DATA_PATH}\n`);

  let allScenes = loadScenes();
  let existingIds = getExistingIds(allScenes);
  console.log(`Starting with ${allScenes.length} existing scenes\n`);

  let batchNumber = 0;

  for (const target of CATEGORY_TARGETS) {
    const current = countByCategory(allScenes, target.category);
    const remaining = target.total - current.total;

    if (remaining <= 0) {
      console.log(
        `[${target.category}] Already has ${current.total}/${target.total} scenes, skipping`
      );
      continue;
    }

    console.log(
      `\n--- Generating ${target.category} scenes (need ${remaining} more) ---`
    );

    // Calculate remaining difficulty needs
    const needEasy = Math.max(0, target.easy - current.easy);
    const needMedium = Math.max(0, target.medium - current.medium);
    const needHard = Math.max(0, target.hard - current.hard);
    const totalNeeded = needEasy + needMedium + needHard;
    const actualRemaining = Math.max(remaining, totalNeeded);

    // Split into batches
    let generated = 0;
    let batchesForCategory = Math.ceil(actualRemaining / BATCH_SIZE);

    for (let b = 0; b < batchesForCategory; b++) {
      batchNumber++;
      const batchCount = Math.min(BATCH_SIZE, actualRemaining - generated);
      if (batchCount <= 0) break;

      // Distribute difficulty across batches proportionally
      const batchFraction = batchCount / actualRemaining;
      const batchEasy = Math.round(needEasy * batchFraction);
      const batchHard = Math.round(needHard * batchFraction);
      const batchMedium = batchCount - batchEasy - batchHard;

      const diffMix = {
        easy: Math.max(0, batchEasy),
        medium: Math.max(0, batchMedium),
        hard: Math.max(0, batchHard),
      };

      console.log(
        `  Batch ${batchNumber}: generating ${batchCount} ${target.category} scenes (E:${diffMix.easy}/M:${diffMix.medium}/H:${diffMix.hard})`
      );

      const existingLocations = getExistingLocations(allScenes);

      try {
        const newScenes = await generateBatch(
          client,
          target.category,
          batchCount,
          diffMix,
          existingLocations,
          existingIds
        );

        // Add new scenes
        for (const scene of newScenes) {
          allScenes.push(scene);
          existingIds.add(scene.id);
        }
        generated += newScenes.length;

        // Write incrementally after each batch
        saveScenes(allScenes);
        console.log(
          `  +${newScenes.length} scenes (running total: ${allScenes.length})`
        );
      } catch (error: unknown) {
        const errMsg =
          error instanceof Error ? error.message : String(error);
        console.error(`  Batch ${batchNumber} failed: ${errMsg}`);
        console.error("  Continuing with next batch...");
      }
    }

    const finalCount = countByCategory(allScenes, target.category);
    console.log(
      `  ${target.category} complete: ${finalCount.total} total (E:${finalCount.easy}/M:${finalCount.medium}/H:${finalCount.hard})`
    );
  }

  // Final summary
  console.log("\n=== Generation Complete ===");
  console.log(`Total scenes: ${allScenes.length}`);
  console.log("\nCategory breakdown:");
  for (const cat of VALID_CATEGORIES) {
    const count = countByCategory(allScenes, cat);
    console.log(
      `  ${cat}: ${count.total} (E:${count.easy}/M:${count.medium}/H:${count.hard})`
    );
  }

  const easyTotal = allScenes.filter((s) => s.difficulty === "easy").length;
  const medTotal = allScenes.filter((s) => s.difficulty === "medium").length;
  const hardTotal = allScenes.filter((s) => s.difficulty === "hard").length;
  console.log(
    `\nOverall difficulty: easy=${easyTotal} medium=${medTotal} hard=${hardTotal}`
  );
  console.log(
    `Percentages: easy=${((easyTotal / allScenes.length) * 100).toFixed(1)}% medium=${((medTotal / allScenes.length) * 100).toFixed(1)}% hard=${((hardTotal / allScenes.length) * 100).toFixed(1)}%`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
