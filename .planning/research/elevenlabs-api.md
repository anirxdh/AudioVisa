# ElevenLabs API Research

## Sound Effects API
- **Endpoint:** `POST /v1/sound-generation`
- **SDK:** `client.textToSoundEffects.convert({ text, durationSeconds, promptInfluence, loop, outputFormat })`
- **Returns:** Raw binary audio stream (ReadableStream<Uint8Array>)
- **Constraints:** 0.5-30s duration, prompt_influence 0-1 (default 0.3)
- **Best prompts:** Specific + descriptive. "Metal chains dragging across concrete floor in a large warehouse" > "chain sound"
- **Looping:** `loop: true` for seamless ambient sounds (v2 model only)

## Music API
- **Simple:** `client.music.compose({ prompt, musicLengthMs, forceInstrumental })` → audio stream
- **Detailed:** `client.music.composeDetailed(...)` → JSON metadata + audio (multipart)
- **Stream:** `client.music.stream(...)` → streaming chunks
- **Plan (FREE):** `client.music.compositionPlan.create({ prompt, musicLengthMs })` → MusicPrompt JSON
- **Constraints:** 3s-10min, max 4100 char prompt, max 30 sections in composition plan
- **Composition plan:** `{ positive_global_styles, negative_global_styles, sections: [{ section_name, positive_local_styles, negative_local_styles, duration_ms, lines }] }`

## Package
```bash
npm install @elevenlabs/elevenlabs-js
```
```ts
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
```

## Output Formats
Default: `mp3_44100_128`. Also supports pcm, opus, ulaw, alaw variants.
