---
phase: "04"
plan: "01"
subsystem: "game-engine"
tags: [game-logic, scoring, api-routes, vector-distance]
dependency-graph:
  requires: [types/scene.ts, lib/embeddings.ts, data/scenes.json]
  provides: [lib/game-engine.ts, lib/scoring.ts, lib/audio-cache.ts, api/game/*]
  affects: [Phase 5 frontend, Phase 3 audio-cache]
tech-stack:
  added: []
  patterns: [in-memory-store, cosine-distance-scoring, quadratic-score-curve]
key-files:
  created:
    - lib/game-engine.ts
    - lib/scoring.ts
    - lib/audio-cache.ts
    - src/app/api/game/start/route.ts
    - src/app/api/game/guess/route.ts
    - src/app/api/game/hint/route.ts
    - src/app/api/game/summary/route.ts
  modified: []
decisions:
  - Quadratic scoring curve (1-distance)^2 rewards close guesses more than linear
  - In-memory Map for game state (no database, hackathon simplicity)
  - Audio-cache stub returns null until Phase 3 implements real pipeline
  - Continent revealed as text hint (not just audio) for accessibility
metrics:
  duration: "2min"
  completed: "2026-04-12"
---

# Phase 4 Plan 1: Game Engine + Scoring Summary

Cosine-distance scoring engine with quadratic curve, in-memory game state, and 4 API routes for start/guess/hint/summary.

## What Was Built

### lib/scoring.ts
Standalone vector math: `cosineSimilarity`, `cosineDistance`, and `distanceToScore`. The scoring curve uses `(1 - distance)^2 * 1000` which rewards close guesses more aggressively than linear mapping. Distance 0.1 yields 810 pts, 0.3 yields 490 pts, 0.5 yields 250 pts.

### lib/game-engine.ts
Core game logic:
- `createGame(scenes)`: selects 2 easy + 2 medium + 1 hard scene randomly, shuffles order
- `calculateScore(guessVector, answerVector, hintUsed)`: computes cosine distance and maps to 0-1000 score
- `getPerformanceRating(totalScore)`: maps 0-5000 total to five tiers (Sound Tourist through Sound Archaeologist)
- `gameStore`: in-memory `Map<string, GameState>` for session persistence

### API Routes
- **POST /api/game/start**: Creates game, loads audio URLs if available, returns rounds with scene IDs only (no answers)
- **POST /api/game/guess**: Embeds guess text + answer text via OpenAI, scores via cosine distance, returns score + reveal data
- **POST /api/game/hint**: Marks hint used (max 800 pts), returns continent text hint + additional SFX URL if available
- **POST /api/game/summary**: Returns total score, per-round breakdown, performance rating

### lib/audio-cache.ts (stub)
Type-safe stub exporting `getAudioUrls(sceneId)` that returns null. Phase 3 will replace with real filesystem/KV cache. Ensures API routes compile and gracefully handle missing audio.

## Commits

| # | Hash | Message | Files |
|---|------|---------|-------|
| 1 | babffc8 | feat(04): add game engine and scoring logic | lib/scoring.ts, lib/game-engine.ts |
| 2 | 2a394ff | feat(04): add game API routes (start, guess, hint, summary) | 5 route + cache files |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created audio-cache.ts stub for compilation**
- **Found during:** Task 2
- **Issue:** API routes import `lib/audio-cache` which doesn't exist yet (Phase 3 work). TypeScript compilation fails even though runtime uses try/catch around dynamic import.
- **Fix:** Created `lib/audio-cache.ts` stub that exports `getAudioUrls()` returning null, with proper TypeScript types.
- **Files created:** lib/audio-cache.ts
- **Commit:** 2a394ff

## Decisions Made

1. **Quadratic scoring curve**: `(1 - distance)^2` instead of linear `(1 - distance)` because it makes the game more rewarding for close guesses while still penalizing far-off ones. A guess at cosine distance 0.1 scores 810 (not 900 as linear would give).
2. **In-memory game store**: Using `Map<string, GameState>` instead of a database. Games are lost on server restart, which is acceptable for a hackathon demo.
3. **Audio-cache stub**: Rather than conditional compilation or ignoring imports, created a clean stub that Phase 3 can replace.
4. **Continent text hint**: The hint endpoint returns the continent as text in addition to any available extra SFX URL, ensuring hints are useful even when audio isn't generated yet.

## Verification

- TypeScript compilation passes cleanly (`npx tsc --noEmit` returns 0 errors)
- All 7 created files exist and are properly committed
- Scene difficulty distribution confirmed: 66 easy, 93 medium, 44 hard (ample pool for game creation)

## Self-Check: PASSED

All 7 files verified on disk. Both commits (babffc8, 2a394ff) verified in git log.
