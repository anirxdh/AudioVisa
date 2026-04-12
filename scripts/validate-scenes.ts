import * as fs from "fs";
import * as path from "path";
import {
  Scene,
  SceneCategory,
  VALID_CATEGORIES,
  VALID_DIFFICULTIES,
  VALID_CONTINENTS,
} from "../types/scene";

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const heroOnly = process.argv.includes("--hero-only");
const HERO_COUNT = 30;

// ---------------------------------------------------------------------------
// Load scenes
// ---------------------------------------------------------------------------
const dataPath = path.resolve(__dirname, "..", "data", "scenes.json");

if (!fs.existsSync(dataPath)) {
  console.error(`ERROR: scenes.json not found at ${dataPath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

if (!raw.scenes || !Array.isArray(raw.scenes)) {
  console.error('ERROR: scenes.json must have a top-level "scenes" array');
  process.exit(1);
}

let scenes: unknown[] = raw.scenes;

if (heroOnly) {
  scenes = scenes.slice(0, HERO_COUNT);
  console.log(`\n-- Hero-only mode: validating first ${HERO_COUNT} scenes --\n`);
} else {
  console.log(`\nValidating all ${scenes.length} scenes...\n`);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const KEBAB_RE = /^[a-z0-9-]+$/;

const REQUIRED_FIELDS: (keyof Scene)[] = [
  "id",
  "location",
  "country",
  "continent",
  "era",
  "difficulty",
  "description",
  "sounds",
  "sfx_prompts",
  "music_prompt",
  "category",
];

interface Issue {
  sceneIndex: number;
  sceneId: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

const issues: Issue[] = [];
const seenIds = new Set<string>();

function addIssue(
  idx: number,
  id: string,
  field: string,
  message: string,
  severity: "error" | "warning" = "error"
) {
  issues.push({ sceneIndex: idx, sceneId: id, field, message, severity });
}

// ---------------------------------------------------------------------------
// Validate each scene
// ---------------------------------------------------------------------------
for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i] as Record<string, unknown>;
  const id = typeof scene.id === "string" ? scene.id : `[scene-${i}]`;

  // Required fields
  for (const field of REQUIRED_FIELDS) {
    if (scene[field] === undefined || scene[field] === null || scene[field] === "") {
      addIssue(i, id, field, `Missing required field "${field}"`);
    }
  }

  // ID format
  if (typeof scene.id === "string") {
    if (!KEBAB_RE.test(scene.id)) {
      addIssue(i, id, "id", `ID "${scene.id}" is not valid kebab-case (must match /^[a-z0-9-]+$/)`);
    }
    if (seenIds.has(scene.id)) {
      addIssue(i, id, "id", `Duplicate ID "${scene.id}"`);
    }
    seenIds.add(scene.id);
  }

  // Difficulty
  if (
    typeof scene.difficulty === "string" &&
    !VALID_DIFFICULTIES.includes(scene.difficulty as Scene["difficulty"])
  ) {
    addIssue(
      i,
      id,
      "difficulty",
      `Invalid difficulty "${scene.difficulty}". Must be one of: ${VALID_DIFFICULTIES.join(", ")}`
    );
  }

  // Category
  if (
    typeof scene.category === "string" &&
    !VALID_CATEGORIES.includes(scene.category as SceneCategory)
  ) {
    addIssue(
      i,
      id,
      "category",
      `Invalid category "${scene.category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`
    );
  }

  // Continent
  if (
    typeof scene.continent === "string" &&
    !(VALID_CONTINENTS as readonly string[]).includes(scene.continent)
  ) {
    addIssue(
      i,
      id,
      "continent",
      `Invalid continent "${scene.continent}". Must be one of: ${VALID_CONTINENTS.join(", ")}`,
      "warning"
    );
  }

  // Sounds array: 4-6 items
  if (Array.isArray(scene.sounds)) {
    if (scene.sounds.length < 4 || scene.sounds.length > 6) {
      addIssue(
        i,
        id,
        "sounds",
        `sounds array has ${scene.sounds.length} items (expected 4-6)`
      );
    }
  } else if (scene.sounds !== undefined) {
    addIssue(i, id, "sounds", "sounds must be an array");
  }

  // SFX prompts: 2-3 items, each 30+ chars
  if (Array.isArray(scene.sfx_prompts)) {
    if (scene.sfx_prompts.length < 2 || scene.sfx_prompts.length > 3) {
      addIssue(
        i,
        id,
        "sfx_prompts",
        `sfx_prompts array has ${scene.sfx_prompts.length} items (expected 2-3)`
      );
    }
    for (let j = 0; j < scene.sfx_prompts.length; j++) {
      const prompt = scene.sfx_prompts[j];
      if (typeof prompt === "string" && prompt.length < 30) {
        addIssue(
          i,
          id,
          "sfx_prompts",
          `sfx_prompts[${j}] is only ${prompt.length} chars (minimum 30)`
        );
      }
    }
  } else if (scene.sfx_prompts !== undefined) {
    addIssue(i, id, "sfx_prompts", "sfx_prompts must be an array");
  }

  // Music prompt must be a non-empty string
  if (typeof scene.music_prompt === "string" && scene.music_prompt.length === 0) {
    addIssue(i, id, "music_prompt", "music_prompt is empty");
  }
}

// ---------------------------------------------------------------------------
// Distribution reports
// ---------------------------------------------------------------------------
const difficultyDist: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
const categoryDist: Record<string, number> = {};
for (const cat of VALID_CATEGORIES) {
  categoryDist[cat] = 0;
}

for (const scene of scenes as Record<string, unknown>[]) {
  const diff = scene.difficulty as string;
  if (diff in difficultyDist) {
    difficultyDist[diff]++;
  }
  const cat = scene.category as string;
  if (cat in categoryDist) {
    categoryDist[cat]++;
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");

console.log("=== Scene Validation Report ===\n");
console.log(`Total scenes: ${scenes.length}`);

if (!heroOnly && scenes.length < 200) {
  console.log(`WARNING: Scene count (${scenes.length}) is below target of 200`);
}

if (scenes.length < HERO_COUNT) {
  console.log(`WARNING: Fewer than ${HERO_COUNT} hero scenes available (have ${scenes.length})`);
}

console.log("\n--- Difficulty Distribution ---");
for (const [diff, count] of Object.entries(difficultyDist)) {
  const pct = scenes.length > 0 ? ((count / scenes.length) * 100).toFixed(1) : "0.0";
  console.log(`  ${diff}: ${count} (${pct}%)`);
}
if (scenes.length > 0) {
  if (difficultyDist.easy < 30) {
    console.log(`  WARNING: fewer than 30 easy scenes (${difficultyDist.easy})`);
  }
  if (difficultyDist.hard < 20) {
    console.log(`  WARNING: fewer than 20 hard scenes (${difficultyDist.hard})`);
  }
}

console.log("\n--- Category Distribution ---");
for (const [cat, count] of Object.entries(categoryDist)) {
  const pct = scenes.length > 0 ? ((count / scenes.length) * 100).toFixed(1) : "0.0";
  console.log(`  ${cat}: ${count} (${pct}%)`);
}
const emptyCategories = Object.entries(categoryDist)
  .filter(([, count]) => count === 0)
  .map(([cat]) => cat);
if (emptyCategories.length > 0 && scenes.length > 0) {
  console.log(`  WARNING: categories with 0 scenes: ${emptyCategories.join(", ")}`);
}

// Print issues
if (errors.length > 0) {
  console.log(`\n--- Errors (${errors.length}) ---`);
  for (const issue of errors) {
    console.log(`  [${issue.sceneIndex}] ${issue.sceneId} -> ${issue.field}: ${issue.message}`);
  }
}

if (warnings.length > 0) {
  console.log(`\n--- Warnings (${warnings.length}) ---`);
  for (const issue of warnings) {
    console.log(`  [${issue.sceneIndex}] ${issue.sceneId} -> ${issue.field}: ${issue.message}`);
  }
}

// Exit code
if (errors.length > 0) {
  console.log(`\nVALIDATION FAILED: ${errors.length} error(s) found`);
  process.exit(1);
} else {
  console.log(`\nVALIDATION PASSED${warnings.length > 0 ? ` (with ${warnings.length} warning(s))` : ""}`);
  process.exit(0);
}
