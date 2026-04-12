---
phase: 02-turbopuffer-integration
plan: 01
subsystem: data-pipeline
tags: [turbopuffer, openai-embeddings, vector-search, text-embedding-3-small]

# Dependency graph
requires:
  - phase: 01-project-setup
    provides: Scene type interface, 203 scenes in data/scenes.json
provides:
  - Turbopuffer client and namespace helper (lib/turbopuffer.ts)
  - OpenAI embedding generation with batch support (lib/embeddings.ts)
  - Semantic scene search with difficulty filtering (lib/search.ts)
  - Seed script to embed and index all scenes (scripts/seed.ts)
  - Test search CLI tool (scripts/test-search.ts)
affects: [phase-3-audio-generation, phase-4-game-engine]

# Tech tracking
tech-stack:
  added: []
  patterns: [lazy-initialized API clients for dotenv compatibility, batch embedding with OpenAI, turbopuffer upsert with cosine_distance]

key-files:
  created: [lib/turbopuffer.ts, lib/embeddings.ts, lib/search.ts, scripts/seed.ts, scripts/test-search.ts]
  modified: []

key-decisions:
  - "Lazy-initialize OpenAI and turbopuffer clients so dotenv config loads before client construction"
  - "Batch size of 100 scenes per embedding call for progress logging (OpenAI supports up to 2048)"
  - "Store sounds and sfx_prompts as JSON strings in turbopuffer (array attributes)"
  - "Combine location + country + era + description + sounds for embedding text to maximize semantic signal"

patterns-established:
  - "Lazy client pattern: API clients initialized on first use, not at import time"
  - "Embedding text construction: buildSceneEmbeddingText() centralizes the text formula"
  - "Search interface: SearchResult type with parsed attributes and distance"

requirements-completed: [DATA-03, DATA-04]

# Metrics
duration: 4min
completed: 2026-04-12
---

# Phase 2 Plan 1: Turbopuffer Integration + Embedding Pipeline Summary

**Turbopuffer client, OpenAI text-embedding-3-small integration, seed script for 203 scenes, and semantic search with difficulty filtering**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T21:42:25Z
- **Completed:** 2026-04-12T21:46:16Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created turbopuffer client with lazy initialization and namespace helper for "soundguessr-scenes"
- Built OpenAI embedding utilities: single + batch generation via text-embedding-3-small (1536 dims)
- Implemented semantic search (lib/search.ts) with cosine distance ranking and difficulty filtering
- Created seed script that batches scenes in groups of 100, generates embeddings, and upserts with full metadata
- Created CLI test search script with --difficulty filter support

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/turbopuffer.ts, lib/embeddings.ts, lib/search.ts** - `0d2b1e5` (feat)
2. **Task 2: Create scripts/seed.ts + lazy init fix** - `e472f7a` (feat)
3. **Task 3: Create scripts/test-search.ts** - `6e9f3b3` (feat)

## Files Created/Modified
- `lib/turbopuffer.ts` - Turbopuffer client initialization with lazy loading, namespace helper
- `lib/embeddings.ts` - OpenAI embedding generation (single + batch), scene embedding text builder
- `lib/search.ts` - Semantic search with cosine distance, difficulty filtering, result parsing
- `scripts/seed.ts` - Seed script: reads scenes.json, batch embeds, upserts to turbopuffer
- `scripts/test-search.ts` - CLI tool for testing vector search queries

## Decisions Made
- Lazy-initialize OpenAI and turbopuffer clients so dotenv config loads before client construction (required for scripts that call `config({ path: ".env.local" })` before imports)
- Use batch size of 100 for embedding generation (balance between progress logging and API efficiency)
- Store sounds and sfx_prompts as JSON strings in turbopuffer (array types not natively supported as filterable)
- Combine location + country + era + description + sounds for embedding text to maximize semantic search quality

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed module-level client initialization breaking dotenv loading**
- **Found during:** Task 2 (seed script execution)
- **Issue:** OpenAI and turbopuffer clients were initialized at module import time, before dotenv could load .env.local variables. This caused "Missing credentials" errors.
- **Fix:** Changed both clients to lazy initialization pattern -- clients are constructed on first use, not at import time.
- **Files modified:** lib/embeddings.ts, lib/turbopuffer.ts
- **Verification:** Seed script now loads dotenv first, then successfully initializes clients
- **Committed in:** e472f7a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for script execution correctness. No scope creep.

## Issues Encountered
- TURBOPUFFER_API_KEY is empty in .env.local -- seed script and test-search script cannot run until the user provides this key. Scripts detect this and exit with clear instructions.

## User Setup Required

The TURBOPUFFER_API_KEY must be set in `.env.local` before running the seed script:
1. Get your API key from the turbopuffer dashboard
2. Add it to `.env.local`: `TURBOPUFFER_API_KEY=your-key-here`
3. Run: `npx tsx scripts/seed.ts`
4. Verify: `npx tsx scripts/test-search.ts "busy fish market in Japan"`

## Next Phase Readiness
- All embedding and search infrastructure is built and type-checked
- Once TURBOPUFFER_API_KEY is set, `npx tsx scripts/seed.ts` will index all 203 scenes
- Search queries will work via lib/search.ts (used by Phase 4 game engine)
- Blocker: User must provide TURBOPUFFER_API_KEY before seeding can complete

## Self-Check: PASSED

- All 5 created files verified on disk
- All 3 task commits verified in git log (0d2b1e5, e472f7a, 6e9f3b3)

---
*Phase: 02-turbopuffer-integration*
*Completed: 2026-04-12*
