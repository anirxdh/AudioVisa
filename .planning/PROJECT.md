# SoundGuessr

## What This Is

SoundGuessr is a GeoGuessr-style web game where players hear AI-generated soundscapes and guess the place and time period. It combines turbopuffer's vector search (to retrieve rich place-time-sound descriptions) with ElevenLabs' Sound Effects and Music APIs (to generate immersive audio scenes). Built as a hackathon entry for the turbopuffer x ElevenLabs hackathon.

## Core Value

The core game loop must work flawlessly: hear a soundscape, guess where and when, get scored. If the sounds aren't distinctive and guessable, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Curated dataset of 100+ place-time-sound descriptions indexed in turbopuffer
- [ ] Semantic retrieval pipeline: pick a scene → retrieve rich description → build ElevenLabs prompt
- [ ] ElevenLabs SFX generation producing distinctive, layered soundscapes per scene
- [ ] ElevenLabs Music API for era/region-appropriate background music per scene
- [ ] Game UI: audio player, guess input (place + decade), submit, reveal + score
- [ ] Scoring system based on vector distance between guess and answer
- [ ] 5-round solo play mode with cumulative score
- [ ] Shareable result card (image/text) for social media posting
- [ ] Polished, visually striking UI suitable for demo video
- [ ] Pre-generated audio cache for demo scenes (no loading in video)
- [ ] Deployed on Vercel with shareable URL

### Out of Scope

- Multiplayer mode — v2 after hackathon, adds complexity without core value
- Daily challenge (Wordle-style) — v2, needs backend scheduling
- User accounts / auth — unnecessary for hackathon demo
- Real audio samples / licensed music — we generate everything via ElevenLabs
- Mobile-native app — web-only, responsive is sufficient

## Context

- **Hackathon:** turbopuffer x ElevenLabs (#ElevenHacks). Judged on creativity, technical use of both APIs, and viral social media posts
- **Scoring criteria:** Social posts (+50 per platform), placement (1st: +400), Most Viral (+200), Most Popular (+200)
- **Viral angle:** GeoGuessr is a proven addictive format. Audio-only twist is fresh. Streamer/reaction content potential
- **Data pipeline:** Hand-curate ~30 "hero" scenes for demo quality, AI-generate 200+ more for replayability. Descriptions include specific sensory details (vendor calls, vehicle types, weather sounds, era-specific music)
- **Winning projects pattern:** Strong one-sentence hook, emotional/immersive experience, polished demo video
- **turbopuffer research:** Namespaces created on first upsert. Bring-your-own embeddings. Supports ANN vector search + metadata filtering. Python/TypeScript SDKs. $128 hackathon credits.
- **ElevenLabs:** User has Scale subscription. SFX API generates from text prompts. Music API generates tracks from descriptions.

## Constraints

- **Tech stack**: Next.js + Tailwind + TypeScript — best balance of visual polish and dev speed for hackathon
- **APIs**: turbopuffer (vector search) + ElevenLabs (SFX + Music) — hackathon requirement
- **Embeddings**: OpenAI text-embedding-3-small for generating vectors (turbopuffer is storage-only)
- **Timeline**: Hackathon sprint — prioritize working demo over feature completeness
- **Deployment**: Vercel — one-click deploy, shareable URL for judges
- **Audio caching**: Pre-generate and cache audio for hero scenes to avoid latency in demo

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Tailwind | Best visual polish + API routes in one project for hackathon | — Pending |
| Solo play only for v1 | Nail core loop; multiplayer adds complexity without core value | — Pending |
| Hybrid data: 30 curated + 200 AI-generated scenes | Hero scenes for demo quality, bulk for replayability | — Pending |
| Vector distance scoring | Player's guess embedded and compared to answer — elegant use of turbopuffer | — Pending |
| Pre-generate audio for demo scenes | Zero loading time in demo video | — Pending |
| Layered audio (SFX + Music separate) | More distinctive soundscapes than single prompt | — Pending |

---
*Last updated: 2026-04-12 after project initialization*
