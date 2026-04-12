# Project State: SoundGuessr

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** The core game loop must work flawlessly: hear a soundscape, guess where and when, get scored.
**Current focus:** Phase 2 complete -- ready for Phase 3

## Current Phase

**Phase:** 2 — Turbopuffer Integration + Embedding Pipeline
**Status:** Complete
**Current Plan:** 1 of 1 (all plans complete)
**Goal:** All scenes embedded and indexed in turbopuffer, queryable by vector search with metadata filtering

## Progress

- [x] PROJECT.md written
- [x] Domain research completed (turbopuffer SDK, ElevenLabs APIs, scene dataset)
- [x] REQUIREMENTS.md written (28 v1 requirements)
- [x] ROADMAP.md written (7 phases)
- [x] Phase 1, Plan 01 executed (project scaffold + Scene type + validation script)
- [x] Phase 1, Plan 02 executed (203 scenes: 30 hero + 173 AI-generated)
- [x] Phase 2, Plan 01 executed (turbopuffer client, embeddings, search, seed script)

## Research Artifacts

- `.planning/research/turbopuffer-sdk.md` — TypeScript SDK reference + code examples
- `.planning/research/elevenlabs-api.md` — SFX + Music API reference

## Key Context

- User has ElevenLabs Scale subscription
- turbopuffer hackathon credits ($128)
- Tech stack: Next.js 16 + TypeScript + Tailwind v4 + App Router
- Embeddings: OpenAI text-embedding-3-small
- 203 scenes total: 30 hero (hand-curated) + 173 AI-generated via gpt-4o-mini
- Pre-generate audio for hero scenes, generate on-demand for rest

## Decisions

- Used Next.js 16 (latest from create-next-app) instead of 15 — current stable at scaffolding time
- Exported validation constants from types/scene.ts for reuse across scripts
- Gitignore uses specific .env.local pattern (not .env*) to allow .env.example commit
- Used client.chat.completions.parse() instead of beta path for OpenAI SDK v6 compatibility
- Ran generation 3 times with escalating targets to reach 200+ scenes; deduplication ensures no duplicates
- Lazy-initialize API clients (OpenAI, turbopuffer) so dotenv loads before client construction
- Batch size of 100 for embedding generation (progress logging vs API efficiency balance)
- Store sounds/sfx_prompts as JSON strings in turbopuffer attributes
- Combine location + country + era + description + sounds for embedding text

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01      | 4min     | 2     | 20    |
| 01-02      | 20min    | 2     | 4     |
| 02-01      | 4min     | 3     | 5     |

---
*Last updated: 2026-04-12 after 02-01 execution*
*Last session stopped at: Completed 02-01-PLAN.md*
