---
phase: 3
slug: dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.0.18 |
| **Config file** | vitest.config.ts |
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
| 03-01-01 | 01 | 1 | DASH-04, RULE-01, RULE-02 | unit | `npx vitest run tests/notification-rule.test.ts` | Partial | pending |
| 03-01-02 | 01 | 1 | FILT-02 | unit | `npx vitest run tests/flag-emoji.test.ts` | No — W0 | pending |
| 03-01-03 | 01 | 1 | DASH-01 | unit | `npx vitest run tests/card-sorting.test.ts` | No — W0 | pending |
| 03-02-01 | 02 | 1 | DASH-01 | manual-only | N/A — React component rendering | N/A | pending |
| 03-02-02 | 02 | 1 | DASH-02 | manual-only | N/A — React Router navigation | N/A | pending |
| 03-02-03 | 02 | 1 | DASH-03 | manual-only | N/A — React component rendering | N/A | pending |
| 03-02-04 | 02 | 1 | FILT-01, FILT-02, FILT-03 | manual-only | N/A — UI filter display | N/A | pending |
| 03-02-05 | 02 | 1 | FILT-04 | manual-only | N/A — Supabase update | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/flag-emoji.test.ts` — stubs for FILT-02 (language code to flag emoji mapping)
- [ ] `tests/notification-rule.test.ts` — update for array format and stability rule type (DASH-04, RULE-01, RULE-02)
- [ ] `tests/card-sorting.test.ts` — stubs for DASH-01 (inactive-at-bottom + price-ascending sort)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card list renders with prices | DASH-01 | React component rendering with Supabase data | Load dashboard, verify cards show name + flag + price |
| Navigate to card detail | DASH-02 | Browser navigation + React Router | Click card row, verify `/cards/:id` URL loads detail page |
| Detail page shows prices + rules | DASH-03 | Full page layout verification | Open card detail, verify current price, baseline price, change %, rule config |
| Filter by condition | FILT-01 | UI display of read-only property | Open card detail, verify condition is displayed |
| Filter by language | FILT-02 | Flag emoji rendering | Verify flag emoji appears on list and detail page |
| Filter by foil status | FILT-03 | UI display of read-only property | Open card detail, verify foil status is displayed |
| Toggle CT Zero | FILT-04 | Supabase update + UI toggle | Toggle CT Zero on detail page, refresh, verify persisted |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
