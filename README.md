# Audio Visa

Guess the sound. Earn your stamp.

Audio Visa is a web game: you hear an AI-generated soundscape of a real place and era, then guess the location and decade. Every right answer is a visa stamp.

Built for **#ElevenHacks** with **turbopuffer** (vector search over 200+ scenes) and **ElevenLabs** (SFX + Music generation).

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in OPENAI_API_KEY, ELEVENLABS_API_KEY, TURBOPUFFER_API_KEY
npm run dev
```

Open http://localhost:3000.

## One-time setup

**1. Seed turbopuffer** (takes ~1–2 min, costs a few OpenAI embedding calls):

```bash
npx tsx scripts/seed.ts
```

Indexes all 200+ scenes into the `audiovisa-scenes` namespace so the app can do vector-ANN scene selection.

**2. (Recommended) Pre-generate audio** for your hero scenes so demos don't wait on ElevenLabs:

```bash
npx tsx scripts/pre-generate.ts
```

Commits mp3s to `public/audio/`. Skip this and the app will generate on-demand (40–90s per scene first time).

## How it works

| Step | Layer |
|------|-------|
| Pick 5 scenes (optionally theme-matched) | **turbopuffer** ANN over 1536-dim embeddings |
| Generate SFX + music per scene | **ElevenLabs** Sound Effects + Music APIs |
| Score player's guess | **OpenAI** embedding → cosine distance |

Theme input on the home page uses turbopuffer ANN to curate 5 thematically matched rounds ("rainy streets", "ancient ruins", etc.). No theme = rotating exploration seed for variety.

## Environment

See `.env.example`. Required:

- `OPENAI_API_KEY` — embeddings + scoring
- `ELEVENLABS_API_KEY` — audio generation
- `TURBOPUFFER_API_KEY` + `TURBOPUFFER_REGION` — vector search
- `NEXT_PUBLIC_BASE_URL` — OG/share URLs

Missing TP key? App falls back to local `scenes.json` random selection. Missing OpenAI? Scoring falls back to string matching. Nothing hard-breaks.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsx scripts/seed.ts` | Upsert all scenes into turbopuffer |
| `npx tsx scripts/test-search.ts` | Sanity-check turbopuffer queries |
| `npx tsx scripts/pre-generate.ts` | Batch-generate audio for scenes (costs ElevenLabs credits) |
| `npx tsx scripts/validate-scenes.ts` | Lint the scene dataset |

## License

MIT.
