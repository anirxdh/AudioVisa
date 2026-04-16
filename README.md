# Jungle Safari 🐘🦁🦒🐵🦜

**A playful audio expedition for little explorers (ages 1–3). Hear a real animal sound, tap the right animal, earn safari badges — while an AI mascot cheers them on with a voice-spoken fact tailored to their exact pick.**

Built for **#ElevenHacks** with **[ElevenLabs](https://elevenlabs.io)** + **[turbopuffer](https://turbopuffer.com)** + **[Upstash Redis](https://upstash.com)** + **[OpenAI](https://openai.com)**.

<p align="center">
  <img src="public/background.png" width="600" alt="Jungle Safari" />
</p>

---

## The kid's experience

1. **Land on the safari** — a one-time cinematic hero video freezes on a "Let's Go!" frame. Tap anywhere → smooth scroll down to the expedition basecamp.
2. **Basecamp** — enter a name, see your daily streak and badge collection, glance at today's Animal-of-the-Day, pick a quest.
3. **Today's Expedition** (shared daily challenge) or **Free Roam** (unlimited random) — both generate 3 rounds.
4. **Listen** — a real, AI-generated animal sound plays automatically.
5. **Tap** — 4 animal options. Pick one.
6. **Mascot speaks** — our safari owl says something warm and specific, tailored to exactly what the kid picked.
   - Correct: *"Yes! That's a lion! Lions roar to tell other lions this is their home."*
   - Wrong: *"Close one — that was a lion, not a tiger. Lions roar big and bold, tigers make a deeper grumbly growl."*
   - Voice: ElevenLabs "Bella" (warm, friendly, adult female).
7. **Sticker earned** — their permanent collection grows; 3D gold badges spin on the results screen.
8. **Leaderboard** — daily global top 10 of all kids' scores, with medals for top 3.

Zero-wait UX: every sound, every mascot response, every reveal is pre-warmed before the kid needs it. Tap-to-reveal is checked locally (no server wait). Network round-trips happen in the background.

---

## Architecture

```
┌───────────────────────────────────────────────────┐
│              Jungle Safari (Next.js 16)            │
│                                                     │
│  FRONTEND (React)           BACKEND (API routes)    │
│  ┌──────────────────┐      ┌───────────────────┐   │
│  │ / (hero + home)  │      │ /api/game/*       │   │
│  │ /play (3 rounds) │ ───► │ /api/feedback     │   │
│  │ /results         │      │ /api/feedback/    │   │
│  │ /leaderboard     │      │   prewarm         │   │
│  └──────────────────┘      │ /api/animal/audio │   │
│                             │ /api/leaderboard  │   │
│                             │ /api/daily/preview│   │
│                             └─────────┬─────────┘   │
└───────────────────────────────────────┼─────────────┘
                                         │
              ┌──────────────────────────┼─────────────────────────┐
              │                          │                          │
      ┌───────▼─────────┐   ┌────────────▼──────────┐   ┌──────────▼────────┐
      │ Upstash Redis   │   │ ElevenLabs             │   │ OpenAI             │
      │                 │   │                        │   │                    │
      │ • game state    │   │ • Sound Effects API    │   │ • gpt-4o-mini      │
      │   (1h TTL)      │   │   (animal SFX, pre-gen)│   │   (mascot text)    │
      │ • leaderboard   │   │ • Text-to-Speech       │   │ • embeddings       │
      │   (daily sets)  │   │   (mascot voice)       │   │   (for turbopuffer)│
      │ • feedback      │   │                        │   │                    │
      │   cache (b64)   │   └────────────────────────┘   └────────────────────┘
      │                 │                                                       
      └────────┬────────┘   ┌────────────────────────┐                          
               │            │ turbopuffer            │                          
               └────────────┤ • animal vector index  │                          
                            │ • ANN theme search     │                          
                            └────────────────────────┘                          
```

**Deploy target: Netlify.** Frontend is served from the Netlify CDN; API routes become Netlify serverless functions automatically.

---

## Where each vendor is used

### 🎧 ElevenLabs — two distinct uses

**1. Sound Effects API** (`textToSoundEffects.convert`) — generates **all 55 animal sounds** the kids hear.
- Each animal has a hand-crafted prompt (e.g. *"A lion roaring powerfully in the savanna, low rumbling roar, realistic wildlife recording, 5 seconds"*)
- Run once per animal, cached to `public/animals/{id}.mp3` (~4 MB total, committed)
- Code: [`lib/elevenlabs.ts`](lib/elevenlabs.ts) `generateSoundEffect(prompt, 5)`
- Script: [`scripts/pre-generate-animal-audio.ts`](scripts/pre-generate-animal-audio.ts)

**2. Text-to-Speech API** (`textToSpeech.convert`, voice "Bella") — speaks the **mascot's reaction** after every round.
- Same API, totally different vibe: warm, friendly, ~2 sentences tailored to what the kid picked.
- Pre-warmed in bulk (~350 pairs) and stored as base64 in Upstash so playback is instant.
- Code: [`lib/elevenlabs.ts`](lib/elevenlabs.ts) `generateSpeech(text)`

### 🔍 turbopuffer — vector search over the animal dataset

All 55 animals indexed as 1536-dim OpenAI embeddings in the `audiovisa-animals` namespace, with category + description + fun-fact metadata.

- Index script: [`scripts/seed-animals.ts`](scripts/seed-animals.ts) — one-time, ~$0.01 OpenAI
- Query client: [`lib/turbopuffer.ts`](lib/turbopuffer.ts), [`lib/search.ts`](lib/search.ts)
- Sanity check: `npx tsx scripts/test-search.ts "jungle predators"`

### ⚡ Upstash Redis — durable state for every user

Three distinct uses in one free-tier Redis:

1. **Game state** — `audiovisa:game:{gameId}` with 1h TTL. Every in-flight game lives here so it survives Netlify's serverless cold starts (no in-memory state).
2. **Daily leaderboard** — `audiovisa:daily:YYYY-MM-DD:board` as a Redis sorted set, deterministic member key `{nickname}#{gameId}` so re-submits overwrite instead of duplicating.
3. **Mascot feedback cache** — `audiovisa:fb:{animalId}:{guessId or "correct"}` stores `{ text, audioDataUrl }`. The audio is base64-encoded mp3 bytes (~40KB per entry), so no filesystem dependency and instant playback for every user.

Code: [`lib/upstash.ts`](lib/upstash.ts), [`lib/feedback.ts`](lib/feedback.ts), [`lib/game-engine.ts`](lib/game-engine.ts)

### 🧠 OpenAI — embeddings + kid-friendly explanations

- `text-embedding-3-small` — 1536-dim embeddings for turbopuffer seeding.
- `gpt-4o-mini` — generates each mascot response, tailored to `(correct animal, wrong guess, correct?)`. System prompt constrains it to warm, simple, ~30-word answers for ages 1–3.
- ~$5 to pre-warm ALL ~350 same-category pairs; every subsequent play is free.
- Code: [`lib/feedback.ts`](lib/feedback.ts)

### 🎲 Three.js — one 3D moment

The hero has a floating low-poly safari owl mascot built entirely from primitives (body wobble sphere + head + eyes + beak + green halo ring). Gentle rotation + float. SSR-disabled via `next/dynamic` so it only runs client-side.

- [`src/components/FloatingMascot3D.tsx`](src/components/FloatingMascot3D.tsx)
- [`src/components/ParallaxSilhouettes3D.tsx`](src/components/ParallaxSilhouettes3D.tsx) — drifting leaf silhouettes behind content

Badges and trophy use plain emoji (🏆 🏅) for simpler, faster rendering.

---

## Zero-wait UX engineering

The kid game loop is designed so **no visible "loading" ever happens** after the initial game-start screen:

| Moment | What's happening in the background |
|---|---|
| Landing page loads | `/api/daily/preview` warms today's animal audio in the browser cache |
| Kid clicks "Today's Expedition" | Page transition starts immediately |
| Loading screen (~1s) | Server creates game in Upstash; client pre-fetches ALL 3 rounds' audio AND pre-warms feedback for ALL 12 option outcomes in parallel |
| Animal sound plays | Already in browser cache from previous step |
| Kid taps answer | **Local check** — correct answers were sent at game start (safe for toddlers), so reveal is instant with zero network |
| Mascot speaks | Feedback was pre-warmed — Upstash cache hit in ~100ms |
| Round N → N+1 | Audio was pre-cached, feedback was pre-warmed — instant |
| Results page loads | Score submission happens in background while sticker book animates in |

The only "blocking" moments are:
- ~1-second initial game-start loading (game create + parallel warmups)
- ~1-second scroll from hero to app section

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/anirxdh/JungleSafari.git
cd JungleSafari

# 2. Install
npm install

# 3. Env vars
cp .env.example .env.local
# Fill in:
#   OPENAI_API_KEY
#   ELEVENLABS_API_KEY
#   TURBOPUFFER_API_KEY  + TURBOPUFFER_REGION (default gcp-us-east4)
#   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
#   NEXT_PUBLIC_BASE_URL (optional; defaults to junglesafari.netlify.app)

# 4. (First-time only) Seed turbopuffer (~1 min, ~$0.01 OpenAI)
npx tsx scripts/seed-animals.ts

# 5. (Recommended) Warm the mascot feedback cache in Upstash
#    ~15 min, ~$5 one-time. After this, every user globally gets instant
#    mascot responses for every plausible pick.
npx tsx scripts/pre-generate-feedback.ts

# 6. Run
npm run dev
```

All 55 animal SFX mp3s are already committed to `public/animals/` so the game works immediately. Open http://localhost:3000.

---

## Deploying to Netlify

1. Push to GitHub (already done — this repo).
2. On [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git → anirxdh/JungleSafari**.
3. Build command: `npm run build` · Publish directory: `.next`. Netlify auto-detects Next.js.
4. Add environment variables (all six from `.env.example`):
   - `OPENAI_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `TURBOPUFFER_API_KEY` + `TURBOPUFFER_REGION`
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_BASE_URL` = your Netlify URL
5. Click Deploy.

All runtime state (games, leaderboard, feedback audio) lives in Upstash — there's no filesystem dependency beyond the static assets shipped in `/public`.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                   # Landing: hero video + basecamp panels
│   ├── play/page.tsx              # 3-round quiz + mascot reveal
│   ├── results/page.tsx           # Badges + leaderboard rank
│   ├── leaderboard/page.tsx       # Daily top 10
│   ├── layout.tsx                 # Nunito + Fredoka fonts
│   ├── globals.css                # Jungle palette + chunky button styles
│   ├── opengraph-image.tsx        # Social preview image
│   └── api/
│       ├── game/start             # Create game (returns answers for fast client check)
│       ├── game/guess             # Background score update to Upstash
│       ├── game/summary           # End-game stats
│       ├── feedback               # Mascot LLM + TTS + cache
│       ├── feedback/prewarm       # Warm all 4 option outcomes for a round
│       ├── animal/audio           # On-demand SFX (only for uncached animals)
│       ├── animal-audio/[file]    # Serverless /tmp streamer (Vercel/Netlify)
│       ├── daily/preview          # Home-page audio preloader
│       └── leaderboard/...        # Submit + top-10 list
├── components/
│   ├── HeroVideoOnce.tsx          # Landing video + 1s lockout + smooth scroll
│   ├── SafariBackground.tsx       # Blurred background.png + overlay
│   ├── MascotFeedback.tsx         # Voice mascot with audio-locked Next
│   ├── FloatingMascot3D.tsx       # 3D safari owl
│   └── ParallaxSilhouettes3D.tsx  # 3D drifting leaves
lib/
├── animals.ts                     # Dataset, daily seed, MC decoy picker, SFX cache
├── elevenlabs.ts                  # SFX + TTS helpers
├── embeddings.ts                  # OpenAI embeddings helper
├── feedback.ts                    # LLM + TTS + Upstash cache (mascot brain)
├── game-engine.ts                 # Game state, Upstash persistence
├── kid-storage.ts                 # localStorage: nickname, streak, stickers
├── search.ts                      # turbopuffer ANN query helper
├── turbopuffer.ts                 # Namespace client
└── upstash.ts                     # Redis client + key namespacing
data/
└── animals.json                   # Hand-curated 55-animal dataset
scripts/
├── seed-animals.ts                # Upsert animals to turbopuffer
├── pre-generate-animal-audio.ts   # Batch ElevenLabs SFX → public/animals/
├── pre-generate-feedback.ts       # Warm mascot feedback in Upstash
└── test-search.ts                 # Manual turbopuffer queries
public/
├── animals/                       # 55 pre-generated SFX mp3s (~4 MB)
├── hero.mp4                       # Landing video (4.5 MB)
└── background.png                 # Safari backdrop (574 KB)
```

---

## Animal data model

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

## Cost reference (one-time warm-up)

| Command | What it does | Cost |
|---|---|---|
| `npx tsx scripts/seed-animals.ts` | Embed + index all 55 animals in turbopuffer | ~$0.01 OpenAI |
| `npx tsx scripts/pre-generate-animal-audio.ts` | Generate 55 SFX → `public/animals/` | ~$4 ElevenLabs |
| `npx tsx scripts/pre-generate-feedback.ts` | Warm every same-category mascot pair in Upstash (~350) | ~$1 OpenAI + ~$4 ElevenLabs |

**Total: ~$9 one-time.** After that every new user globally gets instant UX at zero marginal cost.

---

## Resilience (graceful degradation)

- Missing `TURBOPUFFER_API_KEY` → falls back to random local selection.
- Missing `UPSTASH_*` → game state won't persist across lambdas (fine for local dev, breaks multi-user prod).
- Missing `OPENAI_API_KEY` for a new feedback pair → mascot text fallback to a generic message.
- Missing `ELEVENLABS_API_KEY` for a new feedback pair → mascot shows text without audio.
- Missing `/public/hero.mp4` → home shows a cinematic animated gradient.
- Missing `/public/background.png` → non-landing pages show a jungle gradient.

---

## License

MIT.
