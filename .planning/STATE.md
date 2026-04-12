# Project State: SoundGuessr

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** The core game loop must work flawlessly: hear a soundscape, guess where and when, get scored.
**Current focus:** Phase 1 complete -- ready for Phase 2

## Current Phase

**Phase:** 1 — Project Setup + Scene Dataset
**Status:** Complete
**Current Plan:** 2 of 2 (all plans complete)
**Goal:** Next.js project scaffolded, 200+ scene descriptions written and stored as JSON

## Progress

- [x] PROJECT.md written
- [x] Domain research completed (turbopuffer SDK, ElevenLabs APIs, scene dataset)
- [x] REQUIREMENTS.md written (28 v1 requirements)
- [x] ROADMAP.md written (7 phases)
- [x] Phase 1, Plan 01 executed (project scaffold + Scene type + validation script)
- [x] Phase 1, Plan 02 executed (203 scenes: 30 hero + 173 AI-generated)

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

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01      | 4min     | 2     | 20    |
| 01-02      | 20min    | 2     | 4     |

---
*Last updated: 2026-04-12 after 01-02 execution*
*Last session stopped at: Completed 01-02-PLAN.md*
