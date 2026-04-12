# Phase 1: Project Setup + Scene Dataset - Research

**Researched:** 2026-04-12
**Domain:** Next.js 14/15 scaffolding, TypeScript project structure, JSON dataset design, OpenAI structured output generation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | 30 hand-curated "hero" scene descriptions with 4-6 specific sounds each, tagged with location/era/difficulty | JSON schema design section covers exact field structure; Acoustic Fingerprint Theory provides quality criteria |
| DATA-02 | 170+ AI-generated scene descriptions across 7 categories (markets, historical events, city streets, nature, industrial, festivals, transport) | OpenAI Structured Outputs with Zod enables guaranteed-schema batch generation; category templates documented below |
</phase_requirements>

---

## Summary

Phase 1 creates the foundation from which all other phases build: a running Next.js project and a rich JSON dataset of 200+ scene descriptions. The project scaffolding is straightforward — `create-next-app` handles TypeScript, Tailwind, and App Router in a single command. The more nuanced work is the scene dataset itself: the 30 hero scenes must be hand-crafted with deliberate "acoustic fingerprint" layers, while the 170+ AI-generated scenes require a structured generation script using OpenAI's Structured Outputs API to guarantee schema adherence.

The critical insight for the dataset: a good scene is not just a list of sounds — it has a specific, layered acoustic identity (biome + soundmark + cultural-linguistic + era/technology + microlocal). Poor scenes lead to boring gameplay (too generic) or unfair gameplay (too obscure without enough cues). Difficulty calibration is the key judgment call: easy scenes must have globally iconic sounds, hard scenes require specialist knowledge but must still be *guessable* through the combined audio layers.

The scene JSON schema must be defined precisely in Phase 1 because Phases 2–4 (embedding, audio generation, game engine) all consume it. Adding fields later means re-running scripts. Get it right now.

**Primary recommendation:** Scaffold with `create-next-app@latest` (use Next.js 15, the current stable), define the full scene TypeScript type first, hand-write 30 hero scenes, then run a GPT-4o-mini batch generation script for the remaining 170+.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x (latest stable) | React framework, App Router, API routes | Current stable as of March 2026 (15.2.4); project spec says "Next.js 14" but 15 is what `@latest` installs and is better |
| react | 19.x | UI library | Bundled with Next.js 15 |
| typescript | 5.x | Type safety | Bundled with create-next-app; critical for scene schema contracts between phases |
| tailwindcss | 4.x | Utility CSS | Bundled with `--tailwind` flag; v4 uses CSS config instead of tailwind.config.js |
| openai | ^4.x | AI scene generation script | Official SDK, supports Structured Outputs with Zod |
| zod | ^3.x | Schema validation | Industry standard for TypeScript runtime validation; integrates with OpenAI Structured Outputs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @turbopuffer/turbopuffer | latest | Phase 2 vector DB | Install now so it's available; not used in Phase 1 |
| @elevenlabs/elevenlabs-js | latest | Phase 3 audio gen | Install now so it's available; not used in Phase 1 |
| tsx | ^4.x | Run TypeScript scripts directly | For the AI scene generation script without a build step |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenAI Structured Outputs + Zod | Manual prompting + JSON.parse | Structured Outputs guarantees schema; manual parsing can produce invalid/incomplete data |
| Single scenes.json file | Separate JSON per scene | scenes.json is simpler; split files only needed at 10k+ entries |
| Next.js 15 | Next.js 14 (as specified) | 15 is current stable with Turbopack stable and React 19; `npx create-next-app@latest` installs 15 by default; no reason to pin to 14 |

**Installation:**
```bash
# Scaffold
npx create-next-app@latest soundguessr --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Dependencies (run inside project directory)
npm install @turbopuffer/turbopuffer @elevenlabs/elevenlabs-js openai zod
npm install -D tsx
```

---

## Architecture Patterns

### Recommended Project Structure
```
soundguessr/
├── src/
│   └── app/                   # Next.js App Router (pages, layouts, API routes)
│       └── layout.tsx
│       └── page.tsx
├── lib/                       # Shared server-side utilities (NOT inside src/app)
│   ├── turbopuffer.ts          # Phase 2: DB client (stub in Phase 1)
│   ├── embeddings.ts           # Phase 2: OpenAI embedding client
│   ├── elevenlabs.ts           # Phase 3: ElevenLabs client
│   └── audio-generator.ts     # Phase 3: Audio generation
├── data/
│   └── scenes.json             # 200+ scene descriptions (the Phase 1 deliverable)
├── public/
│   └── audio/                  # Pre-generated audio files (Phase 3)
├── scripts/
│   ├── generate-scenes.ts      # AI scene generation script (Phase 1)
│   ├── seed.ts                 # Phase 2: Embed + upsert to turbopuffer
│   └── pre-generate.ts         # Phase 3: Pre-generate hero audio
├── types/
│   └── scene.ts                # Shared Scene TypeScript type
├── .env.local                  # API keys (never committed)
├── .env.example                # Template (committed)
└── next.config.ts
```

**Note:** Place `lib/`, `data/`, `scripts/`, `types/` at the project root (alongside `src/`), not inside `src/app/`. This is standard Next.js App Router practice — `src/app/` is for routing only.

### Pattern 1: Scene Type Definition (Define First, Build Everything Else From It)
**What:** A single `types/scene.ts` defines the canonical Scene interface. Every script, API route, and component imports from here.
**When to use:** Always. Changing the type mid-project means regenerating embeddings, re-running audio generation, and updating UI.
**Example:**
```typescript
// types/scene.ts
export interface Scene {
  id: string;                    // kebab-case slug e.g. "tokyo-fish-market-1990s"
  location: string;              // Specific place: "Tsukiji Fish Market, Tokyo"
  country: string;               // "Japan"
  continent: string;             // "Asia"
  era: string;                   // Decade: "1990s"
  difficulty: "easy" | "medium" | "hard";
  description: string;           // 2-3 sentences of atmospheric prose
  sounds: string[];              // 4-6 specific sounds as plain text
  sfx_prompts: string[];         // 2-3 detailed ElevenLabs SFX prompts
  music_prompt: string;          // 1 ElevenLabs Music API prompt
  category: SceneCategory;       // For filtering/generation tracking
}

export type SceneCategory =
  | "markets"
  | "historical"
  | "city_streets"
  | "nature"
  | "industrial"
  | "festivals"
  | "transport";
```

### Pattern 2: OpenAI Structured Outputs for Batch Scene Generation
**What:** Use `openai.beta.chat.completions.parse()` with a Zod schema to guarantee valid scene JSON from GPT-4o-mini. Run in batches of 10 scenes per request.
**When to use:** Generating the 170+ AI scenes. Do NOT use JSON mode (no schema enforcement) or manual prompting.
**Example:**
```typescript
// scripts/generate-scenes.ts
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SceneSchema = z.object({
  id: z.string(),
  location: z.string(),
  country: z.string(),
  continent: z.string(),
  era: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  description: z.string(),
  sounds: z.array(z.string()).min(4).max(6),
  sfx_prompts: z.array(z.string()).min(2).max(3),
  music_prompt: z.string(),
  category: z.enum(["markets", "historical", "city_streets", "nature", "industrial", "festivals", "transport"]),
});

const BatchSchema = z.object({ scenes: z.array(SceneSchema) });

async function generateBatch(category: string, count: number) {
  const response = await client.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT, // Acoustic Fingerprint Theory instructions
      },
      {
        role: "user",
        content: `Generate ${count} unique ${category} scenes...`,
      },
    ],
    response_format: zodResponseFormat(BatchSchema, "scenes_batch"),
  });
  return response.choices[0].message.parsed?.scenes ?? [];
}
```

### Pattern 3: Environment Variable Management
**What:** `.env.local` for secrets, `.env.example` as committed template, typed env access.
**When to use:** Always — API keys must never be committed.
```typescript
// .env.local (not committed)
OPENAI_API_KEY=sk-...
TURBOPUFFER_API_KEY=...
ELEVENLABS_API_KEY=...
TURBOPUFFER_REGION=gcp-us-east4

// .env.example (committed)
OPENAI_API_KEY=
TURBOPUFFER_API_KEY=
ELEVENLABS_API_KEY=
TURBOPUFFER_REGION=gcp-us-east4
```

### Anti-Patterns to Avoid
- **Generating all 200 scenes in one API call:** GPT context limits and timeout risk. Batch in groups of 10-20 per call.
- **Storing audio in `data/` instead of `public/audio/`:** Audio files must be publicly served; `data/` is server-only at runtime.
- **Putting `lib/` inside `src/app/`:** `src/app/` is for routing. Shared utilities live at root `lib/` or `src/lib/` (either works; root is simpler for scripts that run outside Next.js).
- **Using `require()` to load scenes.json at runtime:** For 200 items this is fine, but prefer `import scenesData from '@/data/scenes.json'` with `resolveJsonModule: true` in tsconfig for type safety.
- **Scene IDs with spaces or special characters:** Use kebab-case slugs; these become file paths for cached audio in Phase 3.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Guaranteed JSON schema from LLM | Custom retry + validation loop | OpenAI Structured Outputs + Zod | Schema enforcement is built into the API; custom loops fail on edge cases |
| TypeScript schema → JSON Schema conversion | Manual JSON Schema writing | Zod + `zodResponseFormat` from openai SDK | Zod types stay in sync with TypeScript; manual JSON Schema diverges |
| Running TypeScript scripts without a build | ts-node, custom compilation | `tsx` (or `npx tsx`) | tsx is faster, requires zero config, works with ESM |
| Project scaffolding | Manual tsconfig + next.config setup | `create-next-app@latest` | Handles PostCSS, Tailwind v4, ESLint, path aliases correctly |

**Key insight:** The scene generation script is a one-time data pipeline, not production code. Keep it simple: no build step needed, use `tsx` directly, write output incrementally to avoid losing progress on API errors.

---

## Common Pitfalls

### Pitfall 1: Underspecified SFX Prompts
**What goes wrong:** Vague sfx_prompts like "market sounds" produce generic audio. The ElevenLabs SFX API requires descriptive, specific prompts.
**Why it happens:** Scene writers default to brief descriptions when fatigued.
**How to avoid:** Enforce minimum prompt length in the Zod schema (min 30 chars). Include ElevenLabs prompt guidelines in the system prompt: "Metal chains dragging across concrete floor in a large warehouse" not "chain sound".
**Warning signs:** sfx_prompts under 20 characters in the JSON.

### Pitfall 2: Difficulty Tier Skew
**What goes wrong:** 200 scenes generated by AI defaults to medium difficulty — the game becomes repetitive.
**Why it happens:** AI tends toward well-known, describable locations.
**How to avoid:** Explicitly specify difficulty distribution per category in the generation prompt. Target: ~30% easy, ~50% medium, ~20% hard. Verify distribution after generation.
**Warning signs:** Fewer than 30 easy or 20 hard scenes in final scenes.json.

### Pitfall 3: Duplicate or Near-Duplicate Scenes
**What goes wrong:** AI generates "Tokyo fish market 1990s" three times with slight variations.
**Why it happens:** Batch generation without uniqueness tracking.
**How to avoid:** Track generated locations in a Set; include "avoid these locations already used: [list]" in each batch prompt.
**Warning signs:** Duplicate `id` fields in scenes.json (detectable with a simple validation script).

### Pitfall 4: Scene ID Collisions with Future Audio Cache Paths
**What goes wrong:** IDs like `"market/tokyo"` contain slashes, breaking `public/audio/{scene-id}/` directory paths in Phase 3.
**Why it happens:** Location names naturally contain separators.
**How to avoid:** Enforce kebab-case IDs in Zod schema with a regex: `z.string().regex(/^[a-z0-9-]+$/)`.
**Warning signs:** Any `/`, `.`, or space in an id field.

### Pitfall 5: Next.js 15 Tailwind v4 Configuration Difference
**What goes wrong:** Tailwind v4 (installed by `create-next-app@latest`) uses CSS-based configuration instead of `tailwind.config.js`. Docs for Tailwind v3 (most tutorials) show the old config file pattern.
**Why it happens:** Most tutorials reference Tailwind v3.
**How to avoid:** Use `globals.css` for Tailwind configuration. Do not create a `tailwind.config.js` unless adding v3-style customization.
**Warning signs:** `tailwind.config.js` with `content` arrays (v3 pattern).

---

## Code Examples

Verified patterns from official sources:

### Scenes JSON Structure (Full Example)
```json
{
  "scenes": [
    {
      "id": "tsukiji-fish-market-tokyo-1990s",
      "location": "Tsukiji Fish Market, Tokyo",
      "country": "Japan",
      "continent": "Asia",
      "era": "1990s",
      "difficulty": "medium",
      "description": "The pre-dawn chaos of the world's largest fish market. Auctioneer calls echo off wet concrete as buyers in rubber boots navigate between rows of tuna laid on ice. The air smells of brine and diesel.",
      "sounds": [
        "rapid-fire Japanese auction chanting",
        "styrofoam boxes scraping on wet concrete",
        "forklift beeping in enclosed warehouse",
        "fish being slapped onto scales",
        "rubber boots squeaking on wet floor",
        "distant Tokyo train announcement"
      ],
      "sfx_prompts": [
        "Rapid Japanese fish market auction chanting echoing in a large concrete warehouse, overlapping voices, chaotic energy, wet acoustic environment",
        "Heavy styrofoam boxes being dragged across wet concrete floor in a busy market, squeaking rubber boots, distant forklift beeps"
      ],
      "music_prompt": "Traditional Japanese shamisen and taiko drums fused with 1990s Tokyo city ambience, melancholic yet energetic, instrumental only",
      "category": "markets"
    }
  ]
}
```

### Next.js App Router Project Init
```bash
# Source: https://nextjs.org/docs/app/getting-started/installation
npx create-next-app@latest soundguessr \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

### Reading scenes.json in Next.js (Server Side)
```typescript
// lib/scenes.ts
import scenesData from "@/data/scenes.json";
import type { Scene } from "@/types/scene";

const scenes = scenesData.scenes as Scene[];

export function getAllScenes(): Scene[] {
  return scenes;
}

export function getSceneById(id: string): Scene | undefined {
  return scenes.find((s) => s.id === id);
}

export function getScenesByDifficulty(
  difficulty: "easy" | "medium" | "hard"
): Scene[] {
  return scenes.filter((s) => s.difficulty === difficulty);
}
```

### Scenes.json type-safe import (tsconfig)
```json
// tsconfig.json — ensure resolveJsonModule is true (create-next-app sets this)
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### AI Generation Script — Incremental Write Pattern
```typescript
// scripts/generate-scenes.ts — write after each batch to avoid losing progress
import fs from "fs";
import path from "path";

const OUTPUT_PATH = path.join(process.cwd(), "data", "scenes.json");

function appendScenes(newScenes: Scene[]) {
  const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
  existing.scenes.push(...newScenes);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2));
  console.log(`Wrote ${newScenes.length} scenes. Total: ${existing.scenes.length}`);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON mode (json_object response) | Structured Outputs with Zod | Aug 2024 | Guaranteed schema adherence; no need for retry loops |
| tailwind.config.js | CSS-based config in globals.css | Tailwind v4 (2025) | Simpler; no JS config file needed |
| Next.js 14 | Next.js 15 (current stable 15.2.4) | Oct 2024 → March 2026 | Turbopack stable, React 19, better caching defaults |
| ts-node for scripts | tsx | 2023+ | Zero config, faster, ESM support |
| Pages Router | App Router | Next.js 13+ | App Router is the default and recommended path |

**Deprecated/outdated:**
- `next/font` with external URL loading: use local font files or the built-in google fonts optimization
- `pages/api/*.ts`: superseded by `app/api/*/route.ts` with App Router
- JSON mode (`response_format: { type: "json_object" }`): use Structured Outputs instead

---

## Open Questions

1. **Next.js 14 vs 15: Honor the spec or use current stable?**
   - What we know: The project spec says "Next.js 14" but Next.js 15 is current stable (15.2.4 as of March 2026). `npx create-next-app@latest` installs 15.
   - What's unclear: Whether there's a specific reason to pin to 14 (there doesn't appear to be for this project).
   - Recommendation: Use Next.js 15. The spec was written before it became the default. Pin with `create-next-app@15` only if a specific 14 feature is required, which there isn't.

2. **Where should `lib/` live — root or `src/lib/`?**
   - What we know: Both work. Scripts (seed, generate, pre-generate) run outside Next.js and import from lib; placing lib at root makes imports in scripts cleaner.
   - What's unclear: Team preference. Both are defensible.
   - Recommendation: Put `lib/` and `types/` and `data/` at root (alongside `src/`), not inside `src/`. Scripts reference them without Next.js path resolution issues.

3. **How many scenes per GPT-4o-mini batch call?**
   - What we know: Each scene is ~300-400 output tokens. GPT-4o-mini supports large context windows. Batch API offers 50% discount but requires async processing.
   - What's unclear: Optimal batch size for balancing cost vs. reliability.
   - Recommendation: 10-15 scenes per synchronous request. Total cost for 170 scenes is under $0.10 using gpt-4o-mini. No need for the Batch API.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 gap |
| Config file | None — see Wave 0 |
| Quick run command | `npx tsx scripts/validate-scenes.ts` |
| Full suite command | `npx tsx scripts/validate-scenes.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | 30 hero scenes in scenes.json with all required fields, 4-6 sounds each, difficulty tagged | smoke | `npx tsx scripts/validate-scenes.ts --hero-only` | ❌ Wave 0 |
| DATA-02 | 170+ AI scenes covering 7 categories with all required fields | smoke | `npx tsx scripts/validate-scenes.ts` | ❌ Wave 0 |

**Note:** For this phase, a lightweight validation script (not a full test framework) is the right tool. The deliverable is a data file, not code with unit-testable logic. The validation script checks: total count >= 200, all required fields present on every scene, sounds array length 4-6, difficulty distribution, no duplicate IDs, sfx_prompts length >= 2, ID format is kebab-case.

### Sampling Rate
- **Per task commit:** `npx tsx scripts/validate-scenes.ts`
- **Per wave merge:** `npx tsx scripts/validate-scenes.ts`
- **Phase gate:** Validation script exits 0 before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/validate-scenes.ts` — covers DATA-01, DATA-02 (schema validation + count checks)
- [ ] Framework install: `npm install -D tsx` — required to run validation and generation scripts

---

## Sources

### Primary (HIGH confidence)
- [Next.js Installation Docs](https://nextjs.org/docs/app/getting-started/installation) — create-next-app flags and project structure
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs) — Structured Outputs API, Zod integration
- `.planning/research/turbopuffer-sdk.md` — Turbopuffer TypeScript SDK (pre-researched)
- `.planning/research/elevenlabs-api.md` — ElevenLabs SFX + Music API (pre-researched)

### Secondary (MEDIUM confidence)
- [Next.js 15 Current Version](https://www.abhs.in/blog/nextjs-current-version-march-2026-stable-release-whats-new) — Version 15.2.4 is current stable as of March 2026
- [create-next-app CLI Reference](https://nextjs.org/docs/app/api-reference/cli/create-next-app) — Available flags
- [OpenAI Pricing](https://openai.com/api/pricing/) — gpt-4o-mini pricing for cost estimation

### Tertiary (LOW confidence)
- WebSearch results on Tailwind v4 CSS-based config behavior — needs verification against official Tailwind v4 docs when scaffolding

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Next.js 15 current stable confirmed, all packages are well-established
- Architecture: HIGH — Project structure follows Next.js official recommendations; scene schema derived directly from requirements
- Scene dataset design: HIGH — Acoustic Fingerprint Theory and category breakdown provided in project context; scene JSON schema is straightforward
- Pitfalls: MEDIUM — Based on known OpenAI generation patterns and common project setup mistakes; some are inferred from experience

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable tooling; Next.js and OpenAI SDK versions may update but patterns remain valid)
