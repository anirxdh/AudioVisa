# Audio Visa — The Jungle Safari

**A playful audio safari for little explorers (ages 1–3). Hear a sound, tap the animal, collect safari badges — with an AI mascot that praises every correct answer and gently explains every wrong one.**

Built for **#ElevenHacks** using:

- **[ElevenLabs](https://elevenlabs.io)** — all animal sounds, all mascot speech
- **[turbopuffer](https://turbopuffer.com)** — semantic vector search over the animal dataset
- **[Upstash Redis](https://upstash.com)** — leaderboard, game state, feedback audio cache
- **[OpenAI](https://openai.com)** — embeddings (for turbopuffer) + kid-friendly feedback text
- **Three.js / react-three-fiber** — four decorative 3D elements
- **Next.js 16 App Router** (React 19) + Tailwind CSS v4 + Framer Motion

<p align="center">
  <img src="public/background.png" width="600" alt="Audio Visa — Jungle Safari" />
</p>

---

## Demo flow

1. **Landing hero** — a one-time video plays, then freezes on a "Let's Go!" frame. Tap anywhere to smooth-scroll into the app.
2. **Explorer home** — enter a name, see your streak, sticker collection (X / 55), Animal of the Day, biome progress grid.
3. **Pick a quest** — *Today's Expedition* (everyone gets the same 3 animals per day) or *Free Roam* (random 3 animals).
4. **Listen & tap** — a real animal sound plays, four options appear, toddler taps one.
5. **Mascot responds** — an AI-generated voice says something warm and specific: *"Yes! Great job — that's a lion! Lions roar to tell other lions this is their home."* The "Next" button stays disabled until the mascot finishes talking.
6. **Results** — safari badges spin in 3D for correct answers, score gets posted to the daily leaderboard, streak bumps.

---

## What each vendor does

### ElevenLabs — two completely different uses

1. **Sound Effects API** (`textToSoundEffects.convert`) generates the **animal sounds** the kid hears. Each animal has a crafted prompt (e.g. *"A lion roaring powerfully in the savanna, low rumbling roar, realistic wildlife recording, 5 seconds"*) that we run once per animal and cache to `public/animals/{id}.mp3`. 55 clips at ~80KB each.
   - Script: [`scripts/pre-generate-animal-audio.ts`](scripts/pre-generate-animal-audio.ts)
   - Module: [`lib/elevenlabs.ts`](lib/elevenlabs.ts) `generateSoundEffect(prompt, 5)`

2. **Text-to-Speech API** (`textToSpeech.convert`, voice "Bella") generates the **mascot's spoken reaction** at the end of every round. Same API, completely different vibe — warm, cheerful, 2 sentences tailored to exactly what the kid just picked.
   - Module: [`lib/elevenlabs.ts`](lib/elevenlabs.ts) `generateSpeech(text)`
   - Voice: `EXAVITQu4vr4xnSDxMaL` (Bella — override with `ELEVENLABS_MASCOT_VOICE_ID`)

### turbopuffer — semantic search over the animal dataset

All 55 animals are indexed as 1536-dim OpenAI embeddings in the `audiovisa-animals` namespace, with metadata (category, difficulty, description, funFact) attached. The embedding text combines name, category, description, and fun fact so we can ANN-search by theme (e.g. *"jungle predators"*, *"ocean mammals"*, *"things that buzz"*).

- Index script: [`scripts/seed-animals.ts`](scripts/seed-animals.ts)
- Client: [`lib/turbopuffer.ts`](lib/turbopuffer.ts)
- Query helper: [`lib/search.ts`](lib/search.ts) `searchScenes(query, filters, topK)`
- Sanity check: `npx tsx scripts/test-search.ts "jungle predators"`

The dataset is small enough to fit in memory, but turbopuffer lets us (a) demonstrate production-grade vector search and (b) extend to future theme-based quests without schema changes.

### Upstash Redis — durable state

Three distinct uses, all in one free-tier Redis:

1. **Game state** — each game gets `audiovisa:game:{gameId}` with a 1h TTL. Needed because Next.js on serverless (Netlify/Vercel) doesn't share in-memory state across lambda instances. Without this, any player whose two requests hit different lambdas would see "Game not found" mid-play.
2. **Daily leaderboard** — sorted set `audiovisa:daily:YYYY-MM-DD:board`, keyed by `{nickname}#{gameId}` so duplicate submits overwrite rather than stack. 48h TTL.
3. **Mascot feedback cache** — `audiovisa:fb:{animalId}:{guessId or "correct"}` stores `{ text, audioDataUrl }`. The audio is **base64-encoded mp3 bytes** directly in Redis (~40KB per entry) so no filesystem dependency — works on every serverless cold start, every lambda instance, every user anywhere.

Modules: [`lib/upstash.ts`](lib/upstash.ts), [`lib/feedback.ts`](lib/feedback.ts), [`lib/game-engine.ts`](lib/game-engine.ts)

### OpenAI — embeddings + kid-friendly explanations

- **`text-embedding-3-small`** — 1536-dim embeddings for every animal, seeded into turbopuffer.
- **`gpt-4o-mini`** — called once per unique (correctAnimal, wrongGuess) pair to produce a 2-sentence mascot response appropriate for a 1–3 year old. The response is then fed to ElevenLabs TTS.
- Costs are ~$0.005 per LLM call + ~$0.02 per TTS call, cached forever in Upstash so repeat plays are free.
- Module: [`lib/feedback.ts`](lib/feedback.ts)

### Three.js / react-three-fiber — 3D flair

Four small 3D components, each built from primitives (no external GLTF assets):

| Component | Where | What it does |
|---|---|---|
| [`FloatingMascot3D`](src/components/FloatingMascot3D.tsx) | Home app section corner | Cartoon safari owl, slow rotation, wobble material |
| [`ParallaxSilhouettes3D`](src/components/ParallaxSilhouettes3D.tsx) | Home app section backdrop | 7 leaf shapes at 3 depth layers drifting |
| [`SpinningBadge3D`](src/components/SpinningBadge3D.tsx) | Results page — per correct sticker | Gold coin + engraved star + ribbon, rotates |
| [`Trophy3D`](src/components/Trophy3D.tsx) | Leaderboard header | Cartoon gold trophy with handles + star |

All are SSR-disabled via `next/dynamic` so they only render client-side.

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/anirxdh/AudioVisa.git
cd AudioVisa

# 2. Install
npm install

# 3. Env vars
cp .env.example .env.local
# Fill in:
#   OPENAI_API_KEY
#   ELEVENLABS_API_KEY
#   TURBOPUFFER_API_KEY  + TURBOPUFFER_REGION (default gcp-us-east4)
#   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
#   NEXT_PUBLIC_BASE_URL (optional; defaults to https://audiovisa.vercel.app)

# 4. Seed turbopuffer (one-time, ~1 min, ~$0.05 OpenAI)
npx tsx scripts/seed-animals.ts

# 5. (Optional) Warm the mascot feedback cache (~15 min, ~$5 total)
npx tsx scripts/pre-generate-feedback.ts

# 6. Run
npm run dev
```

Open http://localhost:3000. All 55 animal sound clips are already committed to `public/animals/` so the game works immediately.

---

## Deploying to Netlify

1. **Set env vars** in Site Settings → Environment variables (all six from `.env.example`).
2. **Build command**: `npm run build`, **Publish directory**: `.next`.
3. Netlify auto-detects Next.js and uses its [official runtime](https://docs.netlify.com/integrations/frameworks/next-js/).
4. All runtime state (games, leaderboard, mascot audio) is in Upstash — **no filesystem dependency beyond the static assets shipped in `/public`**.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Landing: HeroVideoOnce + safari app panel
│   ├── play/page.tsx               # Round-by-round flow + MascotFeedback
│   ├── results/page.tsx            # Sticker book + 3D badges + leaderboard rank
│   ├── leaderboard/page.tsx        # Top-10 with 3D trophy
│   ├── layout.tsx                  # Fonts (Nunito + Fredoka)
│   ├── globals.css                 # Jungle palette, chunky button styles
│   └── api/
│       ├── game/start              # Create game → Upstash
│       ├── game/guess              # Score answer → Upstash
│       ├── game/summary            # End-game stats
│       ├── feedback                # Mascot LLM+TTS+cache
│       ├── animal/audio            # On-demand animal SFX (fallback path)
│       ├── animal-audio/[file]     # Serverless /tmp streamer for SFX
│       ├── daily/preview           # Home-page preload of today's seed
│       └── leaderboard/...         # Submit + top-10
├── components/
│   ├── HeroVideoOnce.tsx           # One-time video + 1s lockout + smooth scroll
│   ├── SafariBackground.tsx        # Fixed background.png + gradient fallback
│   ├── MascotFeedback.tsx          # Audio-locked Next, skip-after-2s
│   ├── FloatingMascot3D.tsx        # 3D owl
│   ├── ParallaxSilhouettes3D.tsx   # 3D drifting leaves
│   ├── SpinningBadge3D.tsx         # 3D medal
│   ├── Trophy3D.tsx                # 3D trophy
│   └── AudioPlayer.tsx / ScoreDisplay.tsx / RoundIndicator.tsx
lib/
├── animals.ts                      # Dataset loader, daily seed, decoy generator, SFX cache
├── elevenlabs.ts                   # SFX + Music + TTS helpers
├── embeddings.ts                   # OpenAI embeddings helper
├── feedback.ts                     # LLM+TTS+Upstash cache (mascot brain)
├── game-engine.ts                  # GameState, createAnimalGame, getGame/saveGame
├── kid-storage.ts                  # localStorage: nickname, streak, stickers
├── search.ts                       # turbopuffer ANN queries
├── turbopuffer.ts                  # Namespace client
└── upstash.ts                      # Redis client + key namespacing
data/
└── animals.json                    # Hand-curated 55-animal dataset
scripts/
├── seed-animals.ts                 # Upsert animals to turbopuffer
├── pre-generate-animal-audio.ts    # Batch ElevenLabs SFX → public/animals/
├── pre-generate-feedback.ts        # Batch LLM+TTS → Upstash
└── test-search.ts                  # Manual turbopuffer ANN queries
types/
└── animal.ts                       # Animal type + categories
public/
├── animals/                        # 55 pre-generated SFX mp3s (~4 MB)
├── hero.mp4                        # Landing video (4.5 MB)
└── background.png                  # Safari backdrop
```

---

## Data model — `Animal`

```ts
interface Animal {
  id: string;            // "african-lion"
  name: string;          // "Lion"
  emoji: string;         // "🦁"
  category: AnimalCategory; // "farm" | "pets" | "wild" | "birds" | "ocean" | "reptiles" | "insects"
  difficulty: "easy" | "medium" | "hard";
  sfx_prompt: string;    // ElevenLabs Sound Effects prompt
  description: string;   // 1 sentence shown on reveal
  funFact: string;       // trivia used as hint for the mascot LLM
}
```

All 55 entries in [`data/animals.json`](data/animals.json) are hand-written for quality.

---

## Scripts & costs (reference)

| Command | What it does | Cost (one-time) |
|---|---|---|
| `npm run dev` | Local dev server | — |
| `npm run build` | Production build | — |
| `npx tsx scripts/seed-animals.ts` | Embed all animals → turbopuffer | ~$0.01 OpenAI |
| `npx tsx scripts/pre-generate-animal-audio.ts` | Generate 55 SFX → `public/animals/` | ~$4 ElevenLabs |
| `npx tsx scripts/pre-generate-feedback.ts` | Warm ~220 mascot lines → Upstash | ~$1 OpenAI + ~$4 ElevenLabs |
| `npx tsx scripts/test-search.ts "your query"` | Test turbopuffer search | ~$0.0001 |

Totals: **~$9 one-time to fully warm caches**. After that every new user gets everything instantly at zero marginal cost.

---

## Resilience

- Missing `TURBOPUFFER_API_KEY` — falls back to random local selection.
- Missing `UPSTASH_*` — game state won't persist across lambdas (dev-only fallback to in-memory behaviour via Upstash errors).
- Missing `OPENAI_API_KEY` on a new (animal, guess) pair — mascot text falls back to a generic message.
- Missing `ELEVENLABS_API_KEY` on a new animal — mascot shows text only.
- Missing `/public/hero.mp4` — home shows a cinematic animated gradient instead.
- Missing `/public/background.png` — non-landing pages show a jungle gradient instead.

---

## License

MIT.
