---
phase: "06"
plan: "01"
subsystem: sharing
tags: [og-meta, social-sharing, twitter, clipboard, opengraph-image]
dependency-graph:
  requires: [05-01]
  provides: [share-text, og-image, twitter-intent]
  affects: [layout.tsx, results/page.tsx]
tech-stack:
  added: [next/og ImageResponse]
  patterns: [edge-runtime-og-image, twitter-intent-url, clipboard-api-fallback]
key-files:
  created:
    - src/app/opengraph-image.tsx
  modified:
    - src/app/layout.tsx
    - src/app/results/page.tsx
decisions:
  - Used next/og ImageResponse for dynamic OG image instead of static PNG (no external tooling needed)
  - Twitter share uses intent URL with pre-filled text (no Twitter API required)
  - Share text includes performance rating for more engaging social posts
metrics:
  duration: 2min
  completed: "2026-04-12"
---

# Phase 6 Plan 01: Sharing & Social Summary

OG meta tags, dynamic OG image via edge runtime, and social sharing with Twitter intent and clipboard copy.

## What Was Built

### OG Meta Tags (SHARE-03)
- Added comprehensive OpenGraph and Twitter card metadata to `layout.tsx`
- Set `metadataBase` for proper URL resolution on Vercel
- Twitter card type: `summary_large_image` for maximum visibility

### Dynamic OG Image
- Created `src/app/opengraph-image.tsx` using Next.js `ImageResponse` (edge runtime)
- 1200x630 image with dark theme matching app design
- Shows title "SoundGuessr", tagline, and turbopuffer + ElevenLabs branding
- Decorative waveform bars in background for visual interest

### Social Sharing (SHARE-01, SHARE-02)
- Share text format includes score, performance rating, game link, and required hashtags
- "Share on X" button opens Twitter intent URL with pre-filled text
- "Copy Results" button copies share text to clipboard with fallback for older browsers
- Share text includes `#ElevenHacks @turbopuffer @elevenlabsio` as required

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | OG meta tags and social sharing | 78653f0 |
