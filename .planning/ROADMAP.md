# Roadmap: SoundGuessr

**Created:** 2026-04-12
**Milestone:** v1.0 — Hackathon MVP

## Phase 1: Project Setup + Scene Dataset
**Goal:** Next.js project scaffolded, 200+ scene descriptions written and stored as JSON
**Requirements:** DATA-01, DATA-02
**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Next.js 15 project, define Scene type contract, create validation script
- [ ] 01-02-PLAN.md — Write 30 hero scenes, AI-generate 170+ scenes, validate complete dataset

### Success Criteria
- `npx next dev` runs without errors
- `/data/scenes.json` contains 200+ scenes with all required fields
- Each scene has difficulty tier (easy/medium/hard), 4-6 specific sounds, and SFX prompt text

---

## Phase 2: Turbopuffer Integration + Embedding Pipeline
**Goal:** All scenes embedded and indexed in turbopuffer, queryable by vector search with metadata filtering
**Requirements:** DATA-03, DATA-04

### Tasks
1. Create `/lib/turbopuffer.ts` — client initialization with region + API key
2. Create `/lib/embeddings.ts` — OpenAI embedding generation (text-embedding-3-small)
3. Create `/scripts/seed.ts` — reads scenes.json, generates embeddings, upserts to turbopuffer namespace "soundguessr-scenes"
4. Schema: vector (embedding), plus filterable attributes: location, country, continent, era, difficulty
5. Create `/lib/search.ts` — query wrapper that takes text input, embeds it, searches turbopuffer, returns top results with distances
6. Test: run seed script, verify search returns relevant results for queries like "fish market Japan"

### Success Criteria
- `npx tsx scripts/seed.ts` successfully indexes all 200+ scenes
- Vector search for "busy Asian market" returns relevant scenes
- Metadata filtering by difficulty tier works

---

## Phase 3: Audio Generation Pipeline
**Goal:** ElevenLabs integration that generates layered soundscapes (SFX + music) for any scene
**Requirements:** AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, AUDIO-05

### Tasks
1. Create `/lib/elevenlabs.ts` — client initialization
2. Create `/lib/audio-generator.ts` — takes a scene, generates:
   - 2-3 SFX clips (each 5-15s) from scene's sfx_prompts via Sound Effects API
   - 1 background music track (15-30s) via Music API with `forceInstrumental: true`
3. Create `/lib/audio-mixer.ts` — combines SFX + music into a single playable audio (or returns multiple tracks for layered playback)
4. Create `/lib/audio-cache.ts` — caches generated audio to `/public/audio/{scene-id}/` as mp3 files
5. Create API route `POST /api/generate-audio` — accepts scene ID, checks cache, generates if missing, returns audio URLs
6. Create `/scripts/pre-generate.ts` — pre-generates audio for all 30 hero scenes
7. Run pre-generation script for hero scenes

### Success Criteria
- API route returns audio URLs for any scene (cached or freshly generated)
- Hero scenes have pre-generated audio in `/public/audio/`
- Each soundscape has distinct, layered audio (not a single flat SFX)

---

## Phase 4: Game Engine + Scoring
**Goal:** Core game logic: round selection, guess submission, vector-distance scoring, hint system
**Requirements:** GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06

### Tasks
1. Create `/lib/game-engine.ts`:
   - `startGame()`: selects 5 scenes (2 easy, 2 medium, 1 hard) randomly from turbopuffer
   - `submitGuess(guess, round)`: embeds guess text, computes vector distance to answer, returns score (0-1000)
   - `useHint(round)`: flags hint used, reduces max score by 200
   - `getGameSummary()`: returns total score, per-round data, performance rating
2. Create API routes:
   - `POST /api/game/start` — returns game session with 5 scene IDs + audio URLs
   - `POST /api/game/guess` — accepts guess, returns score + reveal data
   - `POST /api/game/hint` — returns additional audio layer for current round
3. Scoring algorithm: convert cosine distance to 0-1000 score (0 distance = 1000, max distance = 0, with curve)
4. Performance ratings based on total score thresholds

### Success Criteria
- Starting a game returns 5 scenes with correct difficulty distribution
- Guessing "Tokyo, 1990s" for a Tokyo 1990s scene returns high score (~900+)
- Guessing "Paris, 1800s" for a Tokyo 1990s scene returns low score
- Hints work and reduce max score

---

## Phase 5: Frontend UI
**Goal:** Polished, visually striking game interface suitable for hackathon demo video
**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07

### Tasks
1. Landing page (`/app/page.tsx`): hero section with title "SoundGuessr", tagline, animated waveform background, "Start Game" button
2. Game page (`/app/play/page.tsx`):
   - Audio player with play/pause, waveform visualization (use wavesurfer.js or custom canvas)
   - Round indicator (1/5, 2/5, etc.)
   - Guess form: location autocomplete input + decade selector dropdown
   - "Use Hint" button with penalty warning
   - Submit button with loading state
3. Reveal component: animated score counter (counting up), mini map showing guess pin vs correct pin, sound breakdown list, "Next Round" button
4. End screen (`/app/results/page.tsx`):
   - Total score with performance title
   - Per-round breakdown (mini cards)
   - Share button
5. Dark theme: deep navy/black background, neon accent colors (cyan/amber for audio visualization), glassmorphism cards
6. Audio visualization: animated waveform or frequency bars during playback
7. Responsive: mobile-first grid, touch-friendly controls
8. Animations: framer-motion for transitions, score reveals, round changes

### Success Criteria
- Game is playable end-to-end in the browser
- UI looks polished enough for a demo video (no placeholder/ugly states)
- Responsive on mobile and desktop
- Audio visualization responds to playback

---

## Phase 6: Sharing & Social
**Goal:** Shareable results for social media virality
**Requirements:** SHARE-01, SHARE-02, SHARE-03

### Tasks
1. Generate result card: either canvas-based image generation (html2canvas) or styled text block for copy-to-clipboard
2. Result card includes: SoundGuessr logo, total score, performance title, round scores, game URL, #ElevenHacks, @turbopuffer @elevenlabsio
3. Share buttons: Twitter/X, LinkedIn (copy text + image)
4. OG meta tags in layout.tsx for social preview when sharing game URL
5. Dynamic OG image for result pages (optional: Vercel OG image generation)

### Success Criteria
- Player can share results with one click
- Shared links show proper social preview (OG tags)
- Result card includes hackathon tags

---

## Phase 7: Deployment & Polish
**Goal:** Live on Vercel, ready for hackathon submission and demo video
**Requirements:** DEPLOY-01, DEPLOY-02, DEPLOY-03

### Tasks
1. Configure environment variables in Vercel (TURBOPUFFER_API_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY, TURBOPUFFER_REGION)
2. Deploy to Vercel
3. Test full game flow on deployed URL
4. Performance optimization: ensure pre-generated audio loads fast, lazy-load non-critical assets
5. Error handling: graceful fallbacks if API calls fail mid-game
6. Final polish: loading states, error messages, edge cases (empty input, network errors)

### Success Criteria
- App is live and playable at a public URL
- Full game completes without errors on deployed version
- Page loads within 3 seconds

---

## Phase Summary

| Phase | Goal | Requirements | Dependencies |
|-------|------|-------------|-------------|
| 1 | Project setup + scene dataset | DATA-01, DATA-02 | None |
| 2 | Turbopuffer integration | DATA-03, DATA-04 | Phase 1 |
| 3 | Audio generation pipeline | AUDIO-01–05 | Phase 2 |
| 4 | Game engine + scoring | GAME-01–06 | Phase 2, 3 |
| 5 | Frontend UI | UI-01–07 | Phase 4 |
| 6 | Sharing & social | SHARE-01–03 | Phase 5 |
| 7 | Deployment & polish | DEPLOY-01–03 | Phase 6 |

---
*Roadmap created: 2026-04-12*
*Last updated: 2026-04-12 after Phase 1 planning*
