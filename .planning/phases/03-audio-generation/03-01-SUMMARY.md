---
phase: 03
plan: 01
subsystem: audio-generation
tags: [elevenlabs, sfx, music, caching, api]
dependency-graph:
  requires: [scenes.json, types/scene.ts]
  provides: [lib/elevenlabs.ts, lib/audio-cache.ts, api/audio/generate, scripts/pre-generate.ts]
  affects: [api/game/start]
tech-stack:
  added: ["@elevenlabs/elevenlabs-js (SFX + Music APIs)"]
  patterns: [lazy-init client, stream-to-buffer, filesystem cache, static file serving]
key-files:
  created: [lib/elevenlabs.ts, src/app/api/audio/generate/route.ts, scripts/pre-generate.ts]
  modified: [lib/audio-cache.ts, src/app/api/game/start/route.ts, .gitignore]
decisions:
  - Used ReadableStream.getReader() instead of for-await-of for ElevenLabs stream consumption (SDK returns web ReadableStream, not Node.js Readable)
  - Kept getAudioUrls() function as backwards-compatible alias in audio-cache.ts for game start route
  - Gitignored public/audio/ to keep generated binary audio files out of git
  - Pre-generate script delays 1s between scenes to respect rate limits
metrics:
  duration: 4min
  completed: 2026-04-12
---

# Phase 3 Plan 01: Audio Generation Pipeline Summary

ElevenLabs SFX + music generation with filesystem caching, on-demand API route, and hero scene pre-generation script.

## What Was Built

### lib/elevenlabs.ts — ElevenLabs Client Wrapper
- Lazy-initialized `ElevenLabsClient` (env var loaded at call time, not import time)
- `generateSoundEffect(prompt, durationSeconds)` — calls SFX API, returns Buffer
- `generateMusic(prompt, lengthMs)` — calls Music API with `forceInstrumental: true`, returns Buffer
- `streamToBuffer()` helper collects ReadableStream chunks via `getReader()` API

### lib/audio-cache.ts — Filesystem Audio Cache
- Replaced Phase 4 stub with full implementation
- Audio stored at `public/audio/{sceneId}/sfx-0.mp3`, `sfx-1.mp3`, `music.mp3`
- `isAudioCached(sceneId)` — checks if sfx + music files exist on disk
- `getCachedAudioUrls(sceneId)` — returns URL paths for cached files or null
- `getAudioUrls(sceneId)` — backwards-compatible async alias
- `generateAndCacheAudio(scene)` — generates all audio, writes to disk, returns URLs

### POST /api/audio/generate — On-Demand Audio Route
- Accepts `{ sceneId: string }` body
- Looks up scene in scenes.json, returns 404 if not found
- Returns cached URLs immediately if available
- Otherwise generates via ElevenLabs, caches, and returns URLs

### scripts/pre-generate.ts — Hero Scene Pre-Generation
- Processes first 30 scenes from scenes.json
- Skips already-cached scenes
- 1-second delay between scenes for rate limiting
- Progress logging with elapsed time per scene
- Summary report (generated/skipped/failed counts)
- **Not executed** — preserves ElevenLabs credits

### Game Start Route Update
- Replaced dynamic import workaround with direct import of `getAudioUrls`
- Each round now includes `audioUrls` (cached paths) or `null` (generate on demand)

## Commits

| Hash | Message |
|------|---------|
| c244e98 | feat(03): add ElevenLabs audio generation with caching pipeline |
| edbae9d | feat(03): add pre-generation script and update game start route |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ReadableStream iteration approach**
- **Found during:** Task 1
- **Issue:** ElevenLabs SDK returns web `ReadableStream<Uint8Array>`, which doesn't support `for await...of` in Node.js (TS2495 error)
- **Fix:** Used `stream.getReader()` with while-loop pattern instead of `for await` iteration
- **Files modified:** lib/elevenlabs.ts

**2. [Rule 2 - Missing critical functionality] Added .gitignore for generated audio**
- **Found during:** Task 4
- **Issue:** Generated audio files (mp3s) would be committed to git if not ignored — large binary files don't belong in version control
- **Fix:** Added `/public/audio/` to .gitignore
- **Files modified:** .gitignore

**3. [Rule 2 - Missing critical functionality] Preserved backward-compatible getAudioUrls**
- **Found during:** Task 1
- **Issue:** Game start route imports `getAudioUrls` by name from audio-cache.ts — replacing the stub could break it
- **Fix:** Added `getAudioUrls()` as an async alias for `getCachedAudioUrls()` in the new implementation
- **Files modified:** lib/audio-cache.ts

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| AUDIO-01 | Complete | `generateAndCacheAudio()` generates 2-3 SFX clips per scene from sfx_prompts |
| AUDIO-02 | Complete | `generateMusic()` generates 30s instrumental track via Music API |
| AUDIO-03 | Complete | SFX prompts come from scene.sfx_prompts (grounded in scenes.json descriptions) |
| AUDIO-04 | Complete | Filesystem cache in public/audio/{sceneId}/ with cache-check-first pattern |
| AUDIO-05 | Ready | scripts/pre-generate.ts created; run to cache 30 hero scenes |

## Self-Check: PASSED

- All 6 key files verified present on disk
- Both commits (c244e98, edbae9d) verified in git log
- TypeScript compilation clean (zero errors in project files)
