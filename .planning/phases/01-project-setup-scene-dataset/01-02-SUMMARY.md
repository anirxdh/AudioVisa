---
phase: 01-project-setup-scene-dataset
plan: 02
subsystem: database
tags: [openai, gpt-4o-mini, zod, structured-outputs, scene-data, json]

# Dependency graph
requires:
  - phase: 01-project-setup-scene-dataset (plan 01)
    provides: "Scene TypeScript interface, validation script, project scaffold"
provides:
  - "203 validated scene descriptions in data/scenes.json (30 hero + 173 AI-generated)"
  - "Reproducible AI generation script (scripts/generate-scenes.ts)"
affects: [02-embedding-pipeline, 03-audio-generation, 04-game-engine]

# Tech tracking
tech-stack:
  added: [dotenv, openai-structured-outputs, zod-response-format]
  patterns: [batch-api-generation-with-incremental-writes, zod-schema-validation-for-ai-output]

key-files:
  created:
    - scripts/generate-scenes.ts
  modified:
    - data/scenes.json
    - package.json
    - package-lock.json

key-decisions:
  - "Used client.chat.completions.parse() instead of client.beta.chat.completions.parse() for OpenAI SDK v6 compatibility"
  - "Bumped category targets to overshoot 200 threshold (ran generation 3 times with deduplication)"
  - "Restored original documented targets in generation script after reaching 203 scenes"

patterns-established:
  - "Incremental batch writes: generation script reads existing data, appends, writes after each API batch to prevent data loss"
  - "Deduplication by ID: scenes with existing IDs are skipped on re-runs, making script idempotent"

requirements-completed: [DATA-01, DATA-02]

# Metrics
duration: 20min
completed: 2026-04-12
---

# Phase 1 Plan 2: Scene Dataset Summary

**203 scene descriptions (30 hand-curated hero + 173 AI-generated) across 7 categories with OpenAI gpt-4o-mini structured outputs and Zod schema validation**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-12T21:18:09Z
- **Completed:** 2026-04-12T21:38:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Hand-wrote 30 hero scenes with distinctive acoustic fingerprints covering all 6 continents, 7 categories, and eras from 1920s-2020s
- Built reproducible AI generation script using OpenAI Structured Outputs + Zod for guaranteed schema adherence
- Generated 173 AI scenes via gpt-4o-mini in batched API calls with incremental writes and deduplication
- Final dataset: 203 scenes, 0 duplicate IDs, all 7 categories represented, difficulty distribution 32.5% easy / 45.8% medium / 21.7% hard

## Task Commits

Each task was committed atomically:

1. **Task 1: Write 30 hero scenes and create AI generation script** - `1458892` (feat)
2. **Task 2: Run AI generation and validate complete dataset** - `4db2aa4` (feat)

## Files Created/Modified
- `data/scenes.json` - 203 scene descriptions (4561 lines) with full acoustic fingerprints
- `scripts/generate-scenes.ts` - Batch AI generation script using OpenAI Structured Outputs + Zod
- `package.json` - Added dotenv dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Used `client.chat.completions.parse()` instead of `client.beta.chat.completions.parse()` — the OpenAI SDK v6 moved the parse method out of beta namespace
- Ran generation script 3 times with escalating targets to reach 200+ threshold — deduplication by ID prevented duplicate scenes across runs
- Restored original documented category targets (25 per category, 20 for industrial) in the generation script after reaching the dataset size goal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed OpenAI SDK API path for parse method**
- **Found during:** Task 2 (Run AI generation script)
- **Issue:** `client.beta.chat.completions.parse()` threw "Cannot read properties of undefined (reading 'completions')" — the OpenAI SDK v6 no longer nests parse under beta
- **Fix:** Changed to `client.chat.completions.parse()` which is the correct path in SDK v6
- **Files modified:** scripts/generate-scenes.ts
- **Verification:** Script runs successfully and generates scenes
- **Committed in:** 4db2aa4 (Task 2 commit)

**2. [Rule 3 - Blocking] Bumped category targets to reach 200+ scene threshold**
- **Found during:** Task 2 (Run AI generation script)
- **Issue:** First two generation runs produced only 174 scenes due to API sometimes returning fewer scenes than requested and deduplication filtering
- **Fix:** Temporarily increased each category target by 5 scenes, ran generation again, then restored original targets
- **Files modified:** scripts/generate-scenes.ts (temporary), data/scenes.json
- **Verification:** Final count 203 scenes, validation passes with 0 errors
- **Committed in:** 4db2aa4 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary to complete generation. No scope creep. Original script targets restored.

## Issues Encountered
- OpenAI API occasionally returns fewer scenes than requested per batch (8-9 instead of 10) and sometimes generates duplicate IDs matching hero scenes (e.g., "berlin-wall-fall-1989"). Both handled gracefully by the script's error handling and deduplication logic.

## User Setup Required
None - OPENAI_API_KEY was already configured in .env.local.

## Next Phase Readiness
- 203 validated scene descriptions ready for embedding pipeline (Phase 2)
- Hero scenes (first 30) ready for pre-generated audio (Phase 3)
- Generation script is reproducible — can re-run to add more scenes if needed
- No blockers for next phase

## Self-Check: PASSED

- [x] data/scenes.json exists (4561 lines, 203 scenes)
- [x] scripts/generate-scenes.ts exists
- [x] Commit 1458892 exists (Task 1)
- [x] Commit 4db2aa4 exists (Task 2)
- [x] Scene count >= 200 (203)
- [x] Validation script passes with exit code 0

---
*Phase: 01-project-setup-scene-dataset*
*Completed: 2026-04-12*
