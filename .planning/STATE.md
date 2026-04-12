# Project State: SoundGuessr

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** The core game loop must work flawlessly: hear a soundscape, guess where and when, get scored.
**Current focus:** Phase 1 — Project Setup + Scene Dataset

## Current Phase

**Phase:** 1 — Project Setup + Scene Dataset
**Status:** In progress
**Current Plan:** 2 of 2
**Goal:** Next.js project scaffolded, 200+ scene descriptions written and stored as JSON

## Progress

- [x] PROJECT.md written
- [x] Domain research completed (turbopuffer SDK, ElevenLabs APIs, scene dataset)
- [x] REQUIREMENTS.md written (28 v1 requirements)
- [x] ROADMAP.md written (7 phases)
- [x] Phase 1, Plan 01 executed (project scaffold + Scene type + validation script)
- [ ] Phase 1, Plan 02 execution (scene dataset population)

## Research Artifacts

- `.planning/research/turbopuffer-sdk.md` — TypeScript SDK reference + code examples
- `.planning/research/elevenlabs-api.md` — SFX + Music API reference

## Key Context

- User has ElevenLabs Scale subscription
- turbopuffer hackathon credits ($128)
- Tech stack: Next.js 16 + TypeScript + Tailwind v4 + App Router
- Embeddings: OpenAI text-embedding-3-small
- 30 hero scenes (hand-curated) + 170+ AI-generated scenes
- Pre-generate audio for hero scenes, generate on-demand for rest

## Decisions

- Used Next.js 16 (latest from create-next-app) instead of 15 — current stable at scaffolding time
- Exported validation constants from types/scene.ts for reuse across scripts
- Gitignore uses specific .env.local pattern (not .env*) to allow .env.example commit

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01      | 4min     | 2     | 20    |

---
*Last updated: 2026-04-12 after 01-01 execution*
