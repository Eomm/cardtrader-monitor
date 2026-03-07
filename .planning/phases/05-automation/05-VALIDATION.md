---
phase: 5
slug: automation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | WISH-04 | unit | `npx vitest run tests/sync-diff.test.ts -t "sync diff"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | WISH-04 | unit | `npx vitest run tests/sync-diff.test.ts -t "metadata"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | PRIC-05 | unit | `npx vitest run tests/cleanup.test.ts -t "cleanup"` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | PRIC-05 | unit | `npx vitest run tests/cleanup.test.ts -t "cleanup"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/sync-diff.test.ts` — stubs for WISH-04 sync diff logic (pure functions)
- [ ] `tests/cleanup.test.ts` — stubs for PRIC-05 cleanup logic (pure functions)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub Actions workflow triggers on schedule | WISH-04, PRIC-05 | Cron scheduling cannot be unit-tested | Run via `workflow_dispatch`, verify logs |
| DB function `cleanup_expired_data()` deletes correct rows | PRIC-05 | Requires live DB | Call via Supabase dashboard SQL editor, check counts |
| Sync handles CardTrader API downtime gracefully | WISH-04 | Requires simulating API failure | Temporarily use invalid token, verify error logged and other users continue |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
