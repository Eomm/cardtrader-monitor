---
phase: 7
slug: ui-usability-improvements-wishlist-filter-persistent-filters-threshold-ux-fixed-price-threshold-rule
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | FixedPriceRule type + factory | unit | `npm test -- --reporter=verbose tests/notification-rule.test.ts` | ✅ extend | ⬜ pending |
| 07-01-02 | 01 | 1 | FixedPriceRule evaluation logic | unit | `npm test -- --reporter=verbose tests/fixed-price-evaluation.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | localStorage filter persistence | unit | `npm test -- --reporter=verbose tests/dashboard-filters.test.ts` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | CardRow inline editing | manual | visual verification | N/A | ⬜ pending |
| 07-04-01 | 04 | 2 | Wishlist filter dropdown | manual | visual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/fixed-price-evaluation.test.ts` — covers fixed price crossing logic, direction, cooldown behavior
- [ ] `tests/dashboard-filters.test.ts` — covers localStorage load/save round-trip, invalid JSON graceful fallback, missing key default
- [ ] Extend `tests/notification-rule.test.ts` — add `createDefaultFixedPriceRule` test case

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CardRow inline rule input | Inline editing UX | No React Testing Library in project | 1. Open dashboard 2. Verify input shows first rule value 3. Edit value, blur → verify auto-save 4. Refresh → verify persisted |
| Wishlist filter dropdown | Wishlist filtering | No React Testing Library | 1. Open dashboard 2. Select wishlist from dropdown 3. Verify cards filter correctly 4. Clear filter → all cards shown |
| Persistent filters | Filter state across reloads | Browser-specific | 1. Set search + wishlist filter 2. Reload page 3. Verify filters restored |
| Fixed price rule tab in RuleEditor | RuleEditor UI | No React Testing Library | 1. Open card detail 2. Switch to Fixed Price tab 3. Set EUR amount + direction 4. Save → verify stored |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
