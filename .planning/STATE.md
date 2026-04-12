# Project State: SoundGuessr

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-12)

**Core value:** The core game loop must work flawlessly: hear a soundscape, guess where and when, get scored.
**Current focus:** Phase 7 complete -- All phases done. App is production-ready for Vercel deployment.

## Current Phase

**Phase:** 7 — Deployment & Polish
**Status:** Complete
**Current Plan:** 1 of 1 (all plans complete)
**Goal:** Polish, error handling, build verification

## Progress

- [x] PROJECT.md written
- [x] Domain research completed (turbopuffer SDK, ElevenLabs APIs, scene dataset)
- [x] REQUIREMENTS.md written (28 v1 requirements)
- [x] ROADMAP.md written (7 phases)
- [x] Phase 1, Plan 01 executed (project scaffold + Scene type + validation script)
- [x] Phase 1, Plan 02 executed (203 scenes: 30 hero + 173 AI-generated)
- [x] Phase 2, Plan 01 executed (turbopuffer client, embeddings, search, seed script)
- [x] Phase 4, Plan 01 executed (game engine, scoring, 4 API routes)
- [x] Phase 3, Plan 01 executed (ElevenLabs audio generation, caching, pre-generation script)
- [x] Phase 5, Plan 01 executed (frontend UI: landing, game play, results pages)
- [x] Phase 6, Plan 01 executed (OG meta tags, social sharing, Twitter intent, OG image)
- [x] Phase 7, Plan 01 executed (error handling, fallback scorer, build verification)

## Research Artifacts

- `.planning/research/turbopuffer-sdk.md` — TypeScript SDK reference + code examples
- `.planning/research/elevenlabs-api.md` — SFX + Music API reference

## Key Context

- User has ElevenLabs Scale subscription
- turbopuffer hackathon credits ($128)
- Tech stack: Next.js 16 + TypeScript + Tailwind v4 + App Router + framer-motion
- Embeddings: OpenAI text-embedding-3-small
- 203 scenes total: 30 hero (hand-curated) + 173 AI-generated via gpt-4o-mini
- Pre-generate audio for hero scenes, generate on-demand for rest
- Frontend: Dark theme (#0a0a1a), glassmorphism cards, cyan/amber accents, CSS waveform viz

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
- Quadratic scoring curve (1-distance)^2 rewards close guesses more than linear
- In-memory Map for game state (no database, hackathon simplicity)
- Audio-cache stub returns null until Phase 3 implements real pipeline
- Continent revealed as text hint for accessibility when audio not available
- Used ReadableStream.getReader() for ElevenLabs stream consumption (web streams, not Node.js)
- Gitignored public/audio/ to keep generated binary audio out of git
- Pre-generate script has 1s delay between scenes for rate limiting
- CSS animated bars for waveform viz instead of Web Audio API analyser (reliability with remote URLs)
- sessionStorage for game results between play and results pages (no state library)
- Inter font for bolder modern look matching design vision
- useEffect for game initialization to avoid SSR fetch errors during prerendering
- next/og ImageResponse for dynamic OG image (edge runtime, no external tooling)
- Twitter share via intent URL (no Twitter API needed)
- Fallback string-matching scorer when OPENAI_API_KEY missing (location substring + era proximity)
- metadataBase uses NEXT_PUBLIC_BASE_URL with fallback to soundguessr.vercel.app

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01      | 4min     | 2     | 20    |
| 01-02      | 20min    | 2     | 4     |
| 02-01      | 4min     | 3     | 5     |
| 04-01      | 2min     | 3     | 7     |
| 03-01      | 4min     | 4     | 6     |
| 05-01      | 5min     | 5     | 9     |
| 06-01      | 2min     | 1     | 3     |
| 07-01      | 4min     | 2     | 5     |

---
*Last updated: 2026-04-12 after 07-01 execution*
*Last session stopped at: Completed 06-01 and 07-01 (sharing + deployment)*
