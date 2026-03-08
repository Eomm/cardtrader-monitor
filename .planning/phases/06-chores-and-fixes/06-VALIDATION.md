---
phase: 6
slug: chores-and-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test && npx biome check .`
- **After every plan wave:** Run `npm run build && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | Biome lint cleanup | lint | `npx biome check .` | N/A (CI) | ⬜ pending |
| 06-02-01 | 02 | 1 | Build succeeds with new palette | build | `npm run build` | N/A (CI) | ⬜ pending |
| 06-03-01 | 03 | 2 | Existing tests pass after schema rename | unit | `npm test` | Yes (11 files) | ⬜ pending |
| 06-03-02 | 03 | 2 | card-mapper test updated for expansion_id | unit | `npx vitest run tests/card-mapper.test.ts` | Yes | ⬜ pending |
| 06-03-03 | 03 | 2 | card-sorting test updated for expansion_id | unit | `npx vitest run tests/card-sorting.test.ts` | Yes | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed for this chores phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark palette renders correctly | Color palette update | Visual design verification | Open app, check all pages for consistent dark theme |
| Card detail page UX | Card detail improvements | UI layout verification | Navigate to card detail, verify wishlist link, ? icon, danger zone |
| "How it works" page | Public landing page | Content and layout | Visit /how-it-works, verify all sections render |
| Footer displays on all pages | Footer addition | Visual check | Navigate multiple pages, verify footer presence |
| Wishlist limit error message | Wishlist limit enforcement | Requires 3+ wishlists | Import a 3rd wishlist, verify rejection message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
