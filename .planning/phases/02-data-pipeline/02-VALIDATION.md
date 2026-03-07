---
phase: 2
slug: data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | WISH-01 | unit | `npx vitest run tests/url-parser.test.ts` | No — W0 | pending |
| 02-01-02 | 01 | 0 | WISH-02 | unit | `npx vitest run tests/card-mapper.test.ts` | No — W0 | pending |
| 02-01-03 | 01 | 0 | WISH-03 | unit | `npx vitest run tests/notification-rule.test.ts` | No — W0 | pending |
| 02-01-04 | 01 | 0 | PRIC-02 | unit | `npx vitest run tests/dedup.test.ts` | No — W0 | pending |
| 02-01-05 | 01 | 0 | PRIC-03 | unit | `npx vitest run tests/price-filter.test.ts` | No — W0 | pending |
| 02-01-06 | 01 | 0 | PRIC-04 | unit | `npx vitest run tests/retention.test.ts` | No — W0 | pending |
| 02-xx-xx | TBD | TBD | PRIC-01 | integration | Manual — requires Supabase + CardTrader credentials | No | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest` — install test framework
- [ ] `vitest.config.ts` — Vitest configuration
- [ ] `tests/url-parser.test.ts` — stubs for WISH-01
- [ ] `tests/card-mapper.test.ts` — stubs for WISH-02
- [ ] `tests/notification-rule.test.ts` — stubs for WISH-03
- [ ] `tests/price-filter.test.ts` — stubs for PRIC-03 (CT Zero filter logic)
- [ ] `tests/dedup.test.ts` — stubs for PRIC-02 (blueprint deduplication)
- [ ] `tests/retention.test.ts` — stubs for PRIC-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hourly price fetch runs and writes snapshots | PRIC-01 | Requires live Supabase + CardTrader API credentials and GitHub Actions environment | 1. Trigger workflow_dispatch on fetch-prices.yml 2. Check price_snapshots table for new rows 3. Verify logs show deduplication summary |
| Import form UI shows progress and toast feedback | WISH-01 | Visual/UX behavior | 1. Paste wishlist URL 2. Verify progress indicator appears 3. Verify cards appear in list on success 4. Verify toast shows import summary |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
