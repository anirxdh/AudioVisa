---
phase: "07"
plan: "01"
subsystem: deployment
tags: [error-handling, polish, build-verification, fallback-scorer, vercel]
dependency-graph:
  requires: [06-01]
  provides: [production-build, error-resilience, loading-states]
  affects: [play/page.tsx, game/guess/route.ts, .env.example]
tech-stack:
  added: []
  patterns: [fallback-scorer, audio-skip-flow, dismiss-retry-error-pattern]
key-files:
  created:
    - src/app/loading.tsx
  modified:
    - src/app/play/page.tsx
    - src/app/api/game/guess/route.ts
    - src/app/layout.tsx
    - .env.example
decisions:
  - Fallback scorer uses substring matching for location (500/250/100 pts) and decade proximity for era (300/150/50 pts)
  - Audio failure shows amber "Skip to Guess" button rather than blocking gameplay
  - Error banner has context-aware actions: Dismiss always available, Retry for guess failures, Try Again for start failures
  - metadataBase uses NEXT_PUBLIC_BASE_URL env var with fallback to soundguessr.vercel.app
metrics:
  duration: 4min
  completed: "2026-04-12"
---

# Phase 7 Plan 01: Deployment & Polish Summary

Error handling hardening, fallback scorer, loading states, and clean production build verification.

## What Was Built

### Fallback Scorer (DEPLOY-01 resilience)
- When `OPENAI_API_KEY` is not set, the guess route falls back to string-matching scoring
- Location matching: exact/substring match (500 pts), country match (250 pts), continent match (100 pts)
- Era matching: exact decade (300 pts), within 20 years (150 pts), within 50 years (50 pts)
- Allows app to function without OpenAI for demo/testing scenarios

### Error Handling (Play Page)
- Audio generation failure shows "Skip to Guess" button with amber warning
- Error banner has context-aware actions: Dismiss + Retry (for guess) or Try Again (for start)
- All error states are dismissible without forcing page reload

### Loading States
- Added `src/app/loading.tsx` for route transition loading indicator
- Matches app design with pulsing cyan dots

### Build Verification (DEPLOY-01)
- `npx next build` passes cleanly: zero TypeScript errors, zero warnings
- All routes compile and generate correctly
- Static pages: /, /play, /results, /_not-found
- Dynamic routes: all API routes + opengraph-image

### Environment Variables (DEPLOY-02)
- Updated `.env.example` with `NEXT_PUBLIC_BASE_URL` for deployment
- Full env var list: OPENAI_API_KEY, TURBOPUFFER_API_KEY, ELEVENLABS_API_KEY, TURBOPUFFER_REGION, NEXT_PUBLIC_BASE_URL

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed metadataBase warning**
- **Found during:** Task 3 (build verification)
- **Issue:** Next.js warned that metadataBase was not set, causing OG images to resolve against localhost
- **Fix:** Added metadataBase to metadata export using NEXT_PUBLIC_BASE_URL env var
- **Files modified:** src/app/layout.tsx, .env.example
- **Commit:** 23847c4

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 2 | Error handling and polish | beb3fc6 |
| 3 | Build fix (metadataBase) | 23847c4 |
