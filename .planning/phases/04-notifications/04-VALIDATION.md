---
phase: 4
slug: notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | RULE-03 | unit | `npx vitest run tests/threshold-evaluation.test.ts --reporter=verbose` | No | pending |
| 04-01-02 | 01 | 0 | NOTF-02, NOTF-03 | unit | `npx vitest run tests/notification-message.test.ts --reporter=verbose` | No | pending |
| 04-01-03 | 01 | 0 | RULE-03 | unit | `npx vitest run tests/cooldown.test.ts --reporter=verbose` | No | pending |
| 04-01-04 | 01 | 1 | RULE-03 | unit | `npx vitest run tests/threshold-evaluation.test.ts -t "evaluates" --reporter=verbose` | No | pending |
| 04-01-05 | 01 | 1 | RULE-03 | unit | `npx vitest run tests/threshold-evaluation.test.ts -t "null baseline" --reporter=verbose` | No | pending |
| 04-01-06 | 01 | 1 | RULE-03 | unit | `npx vitest run tests/threshold-evaluation.test.ts -t "direction" --reporter=verbose` | No | pending |
| 04-01-07 | 01 | 1 | RULE-03 | unit | `npx vitest run tests/threshold-evaluation.test.ts -t "disabled" --reporter=verbose` | No | pending |
| 04-02-01 | 02 | 1 | NOTF-01 | integration | manual-only -- requires live Telegram bot | N/A | pending |
| 04-02-02 | 02 | 1 | NOTF-02 | unit | `npx vitest run tests/notification-message.test.ts -t "format" --reporter=verbose` | No | pending |
| 04-02-03 | 02 | 1 | NOTF-03 | unit | `npx vitest run tests/notification-message.test.ts -t "link" --reporter=verbose` | No | pending |
| 04-02-04 | 02 | 1 | NOTF-04 | integration | manual-only -- requires Supabase connection | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/threshold-evaluation.test.ts` -- stubs for RULE-03 (threshold logic, direction, null baseline, disabled rules)
- [ ] `tests/notification-message.test.ts` -- stubs for NOTF-02, NOTF-03 (message formatting, MarkdownV2 escaping, link generation)
- [ ] `tests/cooldown.test.ts` -- stubs for cooldown logic (24h window, re-evaluation against last notified price)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Telegram message sent when threshold triggers | NOTF-01 | Requires live Telegram bot and chat ID | 1. Set up test bot 2. Configure chat ID in settings 3. Trigger a price change that crosses threshold 4. Verify message received in Telegram |
| Notifications logged in database | NOTF-04 | Requires Supabase connection | 1. Trigger notification 2. Query notifications table 3. Verify row with correct old_price, new_price, sent_at |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
