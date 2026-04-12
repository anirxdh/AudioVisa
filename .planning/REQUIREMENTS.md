# Requirements: SoundGuessr

**Defined:** 2026-04-12
**Core Value:** The core game loop must work flawlessly: hear a soundscape, guess where and when, get scored.

## v1 Requirements

### Data Pipeline

- [ ] **DATA-01**: 30 hand-curated "hero" scene descriptions with 4-6 specific sounds each, tagged with location/era/difficulty
- [ ] **DATA-02**: 170+ AI-generated scene descriptions across 7 categories (markets, historical events, city streets, nature, industrial, festivals, transport)
- [ ] **DATA-03**: All scenes embedded via OpenAI text-embedding-3-small and indexed in turbopuffer with metadata (location, country, continent, era, difficulty, sounds list)
- [ ] **DATA-04**: Seed script that generates embeddings and upserts all scenes to turbopuffer in one run

### Audio Generation

- [ ] **AUDIO-01**: Each scene generates 2-3 layered SFX clips via ElevenLabs Sound Effects API (environment base + specific sounds + ambient detail)
- [ ] **AUDIO-02**: Each scene generates 1 era/region-appropriate background music track via ElevenLabs Music API (15-30s, instrumental)
- [ ] **AUDIO-03**: SFX prompts are grounded in turbopuffer-retrieved descriptions (not hardcoded) — semantic retrieval drives generation quality
- [ ] **AUDIO-04**: Generated audio is cached (stored as files or in a KV store) so repeated plays don't re-generate
- [ ] **AUDIO-05**: 30 hero scenes have pre-generated, cached audio ready for instant playback (zero latency for demo)

### Game Mechanics

- [ ] **GAME-01**: Single game session = 5 rounds with scenes selected from different difficulty tiers (2 easy, 2 medium, 1 hard)
- [ ] **GAME-02**: Player hears soundscape and submits a guess: location (text input with autocomplete) + time period (decade selector)
- [ ] **GAME-03**: Scoring uses vector distance between player's guess (embedded) and correct answer — closer guess = higher score (max 1000 pts per round)
- [ ] **GAME-04**: After guessing, reveal screen shows: correct answer, map pin, historical context, score breakdown, and which sounds were playing
- [ ] **GAME-05**: Hint system: player can request a second audio layer (additional sounds from the scene) at cost of 200 pts max score reduction
- [ ] **GAME-06**: End-of-game summary screen shows total score, per-round breakdown, and performance rating (e.g., "Sound Tourist" → "Audio Archaeologist")

### User Interface

- [ ] **UI-01**: Landing page with game title, "Start Game" CTA, and brief explanation of how it works
- [ ] **UI-02**: Game screen with prominent audio player (play/pause, progress bar), waveform or audio visualization
- [ ] **UI-03**: Guess input: location text field with country/city autocomplete + decade selector (1800s-2020s)
- [ ] **UI-04**: Reveal screen with animated score counter, map showing guess vs correct location, and sound breakdown
- [ ] **UI-05**: End screen with shareable result card (total score, round summaries, performance title)
- [ ] **UI-06**: Responsive design — works on desktop and mobile browsers
- [ ] **UI-07**: Dark theme with audio-centric visual design (waveforms, frequency visualizations, vinyl/retro aesthetic)

### Sharing & Virality

- [ ] **SHARE-01**: Shareable result card generated as image (or copy-to-clipboard text) with score + game link
- [ ] **SHARE-02**: Result card includes #ElevenHacks hashtag and @turbopuffer @elevenlabsio tags
- [ ] **SHARE-03**: OG meta tags for social media preview when sharing game URL

### Deployment

- [ ] **DEPLOY-01**: Deployed on Vercel with custom or vercel.app URL
- [ ] **DEPLOY-02**: Environment variables for TURBOPUFFER_API_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY configured in Vercel
- [ ] **DEPLOY-03**: App loads and is playable within 3 seconds on broadband connection

## v2 Requirements

### Multiplayer

- **MP-01**: Friends can play the same 5 rounds and compare scores
- **MP-02**: Real-time multiplayer where players race to guess fastest

### Daily Challenge

- **DAILY-01**: One fixed set of 5 sounds per day, same for all players (Wordle-style)
- **DAILY-02**: Daily leaderboard showing top scores

### Community

- **COMM-01**: Users can submit their own scene descriptions
- **COMM-02**: Voting system for community-submitted scenes

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / auth | Unnecessary for hackathon demo — stateless play |
| Real audio samples | We generate everything via ElevenLabs — that's the point |
| Mobile native app | Web responsive is sufficient |
| Payment / premium tiers | Hackathon project, no monetization |
| Admin dashboard | No moderation needed for v1 |
| Offline mode | Requires audio generation APIs to be online |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| AUDIO-01 | Phase 3 | Pending |
| AUDIO-02 | Phase 3 | Pending |
| AUDIO-03 | Phase 3 | Pending |
| AUDIO-04 | Phase 3 | Pending |
| AUDIO-05 | Phase 3 | Pending |
| GAME-01 | Phase 4 | Pending |
| GAME-02 | Phase 4 | Pending |
| GAME-03 | Phase 4 | Pending |
| GAME-04 | Phase 4 | Pending |
| GAME-05 | Phase 4 | Pending |
| GAME-06 | Phase 4 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |
| UI-05 | Phase 5 | Pending |
| UI-06 | Phase 5 | Pending |
| UI-07 | Phase 5 | Pending |
| SHARE-01 | Phase 6 | Pending |
| SHARE-02 | Phase 6 | Pending |
| SHARE-03 | Phase 6 | Pending |
| DEPLOY-01 | Phase 7 | Pending |
| DEPLOY-02 | Phase 7 | Pending |
| DEPLOY-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
