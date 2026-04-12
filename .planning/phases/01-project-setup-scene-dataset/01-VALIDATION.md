---
phase: 1
slug: project-setup-scene-dataset
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx scripts (no test framework needed — validation scripts) |
| **Config file** | tsconfig.json |
| **Quick run command** | `npx tsx scripts/validate-scenes.ts` |
| **Full suite command** | `npx tsx scripts/validate-scenes.ts && npx next build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/validate-scenes.ts`
- **After every plan wave:** Run `npx tsx scripts/validate-scenes.ts && npx next build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | DATA-01 | script | `npx tsx scripts/validate-scenes.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | DATA-02 | script | `npx tsx scripts/validate-scenes.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | DATA-01 | manual | Next.js dev server starts | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/validate-scenes.ts` — validates scenes.json: count >= 200, required fields, difficulty distribution, ID format
- [ ] `types/scene.ts` — Scene TypeScript interface (cross-phase contract)

*Wave 0 is embedded in Plan 01 tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Next.js dev server starts | DATA-01 setup | Dev server requires manual check | Run `npx next dev`, verify localhost loads |
| Scene descriptions are distinctive | DATA-01 quality | Subjective quality check | Review 5 random scenes from each difficulty tier |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
