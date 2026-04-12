# Project State: SoundGuessr

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** The core game loop must work flawlessly: hear a soundscape, guess where and when, get scored.
**Current focus:** Phase 1 — Project Setup + Scene Dataset

## Current Phase

**Phase:** 1 — Project Setup + Scene Dataset
**Status:** Not started
**Goal:** Next.js project scaffolded, 200+ scene descriptions written and stored as JSON

## Progress

- [x] PROJECT.md written
- [x] Domain research completed (turbopuffer SDK, ElevenLabs APIs, scene dataset)
- [x] REQUIREMENTS.md written (28 v1 requirements)
- [x] ROADMAP.md written (7 phases)
- [ ] Phase 1 execution

## Research Artifacts

- `.planning/research/turbopuffer-sdk.md` — TypeScript SDK reference + code examples
- `.planning/research/elevenlabs-api.md` — SFX + Music API reference

## Key Context

- User has ElevenLabs Scale subscription
- turbopuffer hackathon credits ($128)
- Tech stack: Next.js 14 + TypeScript + Tailwind + App Router
- Embeddings: OpenAI text-embedding-3-small
- 30 hero scenes (hand-curated) + 170+ AI-generated scenes
- Pre-generate audio for hero scenes, generate on-demand for rest

---
*Last updated: 2026-04-12 after planning completion*
