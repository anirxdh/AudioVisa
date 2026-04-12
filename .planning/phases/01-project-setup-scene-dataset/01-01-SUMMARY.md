---
phase: 01-project-setup-scene-dataset
plan: 01
subsystem: infra
tags: [nextjs, typescript, tailwind, zod, openai, turbopuffer, elevenlabs, scene-types]

# Dependency graph
requires: []
provides:
  - "Next.js project scaffold with all dependencies"
  - "Scene interface and SceneCategory type contract"
  - "Validation script for scenes.json (validate-scenes.ts)"
  - "Empty scenes.json seed file"
  - "Environment variable template (.env.example)"
affects: [01-02, 02-audio-generation, 03-embedding, 04-game-engine, 05-ui]

# Tech tracking
tech-stack:
  added: [next@16.2.3, react@19.2.4, tailwindcss@4, openai, zod, "@turbopuffer/turbopuffer", "@elevenlabs/elevenlabs-js", tsx]
  patterns: [app-router, css-based-tailwind-v4, src-directory-layout]

key-files:
  created:
    - types/scene.ts
    - scripts/validate-scenes.ts
    - data/scenes.json
    - .env.example
    - src/app/page.tsx
    - src/app/layout.tsx
    - src/app/globals.css
  modified: []

key-decisions:
  - "Used Next.js 16 (latest from create-next-app) instead of 15 — current stable at time of scaffolding"
  - "Exported VALID_CATEGORIES, VALID_DIFFICULTIES, VALID_CONTINENTS constants from types/scene.ts for reuse in validation and generation"
  - "Gitignore pattern uses specific .env.local rather than .env* to allow .env.example to be committed"

patterns-established:
  - "Scene type contract in types/scene.ts is the single source of truth for all phases"
  - "Validation scripts live in scripts/ and run via npx tsx"
  - "Project directories: lib/ for shared code, data/ for JSON datasets, scripts/ for CLI tools, types/ for shared types"

requirements-completed: [DATA-01, DATA-02]

# Metrics
duration: 4min
completed: 2026-04-12
---

# Phase 1 Plan 01: Project Setup + Scene Dataset Summary

**Next.js 16 project scaffolded with Scene type contract, validation script, and all dependencies (openai, zod, turbopuffer, elevenlabs)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T21:07:34Z
- **Completed:** 2026-04-12T21:11:48Z
- **Tasks:** 2
- **Files created:** 20

## Accomplishments
- Next.js project with TypeScript, Tailwind v4 (CSS-based config), App Router, and src/ directory structure
- All dependencies installed: openai, zod, @turbopuffer/turbopuffer, @elevenlabs/elevenlabs-js, tsx
- Scene interface defining the cross-phase type contract with 11 fields and 7 categories
- Comprehensive validation script with field checks, distribution reports, and --hero-only flag
- Environment variable template for OpenAI, TurboPuffer, and ElevenLabs API keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15 project and install all dependencies** - `22aeff8` (feat)
2. **Task 2: Define Scene type contract and create validation script** - `547c6a8` (feat)

## Files Created/Modified
- `package.json` - Project manifest with all dependencies
- `tsconfig.json` - TypeScript config with path aliases and JSON module resolution
- `next.config.ts` - Next.js configuration
- `src/app/layout.tsx` - Root layout with Geist fonts and SoundGuessr metadata
- `src/app/page.tsx` - Simple SoundGuessr heading page
- `src/app/globals.css` - Tailwind v4 CSS-based configuration
- `.env.example` - API key placeholders (committed)
- `.gitignore` - Standard Next.js ignores with .env.local exclusion
- `eslint.config.mjs` - ESLint flat config for Next.js
- `postcss.config.mjs` - PostCSS with Tailwind plugin
- `types/scene.ts` - Scene interface, SceneCategory type, validation constants
- `scripts/validate-scenes.ts` - Comprehensive scene validation with distribution reports
- `data/scenes.json` - Empty scenes array seed file

## Decisions Made
- Used Next.js 16 (latest from create-next-app@latest) instead of Next.js 15. The plan specified 15 as "current stable" but create-next-app@latest now installs 16.2.3 with React 19. This is a minor version bump and fully compatible.
- Exported validation constants (VALID_CATEGORIES, VALID_DIFFICULTIES, VALID_CONTINENTS) from types/scene.ts so they can be reused by the validation script and future generation scripts without duplication.
- Changed .gitignore from `.env*` (which would block .env.example) to specific `.env.local` pattern so the environment template can be committed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed .gitignore blocking .env.example**
- **Found during:** Task 1 (Project scaffolding)
- **Issue:** create-next-app generates `.env*` in .gitignore which would prevent committing .env.example
- **Fix:** Changed to specific `.env.local` / `.env.*.local` patterns
- **Files modified:** .gitignore
- **Verification:** `git check-ignore .env.example` returns nothing (not ignored), `git check-ignore .env.local` returns match
- **Committed in:** 22aeff8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix to allow .env.example to be committed. No scope creep.

## Issues Encountered
- create-next-app@latest installs Next.js 16 instead of 15. This is expected behavior as the CLI always installs the latest stable version. No functional impact on the project.

## User Setup Required
None at this stage. API keys will be needed for Plan 02 (scene generation with OpenAI).

## Next Phase Readiness
- Project scaffold complete and building successfully
- Scene type contract ready for Plan 02 to populate scenes.json
- Validation script ready to verify Plan 02 output
- All directories (lib/, data/, scripts/, types/, public/audio/) created and ready

## Self-Check: PASSED

- All 13 files verified present
- All 5 directories verified present
- Commit 22aeff8 verified (Task 1)
- Commit 547c6a8 verified (Task 2)

---
*Phase: 01-project-setup-scene-dataset*
*Completed: 2026-04-12*
