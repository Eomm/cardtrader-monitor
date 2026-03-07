---
phase: 04-notifications
plan: 01
subsystem: api
tags: [telegram, markdown, threshold, cooldown, notification]

requires:
  - phase: 03-dashboard
    provides: ThresholdRule/StabilityRule types, MonitoredCardWithPrice type
provides:
  - evaluateThreshold function for comparing prices against threshold rules
  - shouldNotify function with 24h cooldown and re-evaluation logic
  - escapeMarkdownV2/escapeMarkdownV2Url for Telegram message safety
  - formatAlertMessage for composing alert lines with emoji, links, prices
  - formatEurCents for cents-to-EUR string conversion
affects: [04-02, 04-03]

tech-stack:
  added: []
  patterns: [MarkdownV2 escaping, threshold evaluation with null baseline, cooldown with re-evaluation]

key-files:
  created:
    - src/lib/telegram-utils.ts
    - tests/threshold-evaluation.test.ts
    - tests/notification-message.test.ts
    - tests/cooldown.test.ts
  modified: []

key-decisions:
  - "Null baseline treated as -100% drop (infinity baseline) to alert when unavailable cards appear"
  - "formatAlertMessage escapes prices for MarkdownV2 inline (dots become \\.)"
  - "Cooldown comparison uses evaluateThreshold against lastNotification.priceCents during 24h window"

patterns-established:
  - "Telegram MarkdownV2 escaping: escape all 18 special chars for text, only ) and \\ for URLs"
  - "Threshold result object pattern: { triggered, percentChange } for composable evaluation"

requirements-completed: [RULE-03, NOTF-02, NOTF-03]

duration: 2min
completed: 2026-03-07
---

# Phase 4 Plan 1: Notification Utilities Summary

**TDD-built threshold evaluation, 24h cooldown with re-evaluation, and MarkdownV2 alert formatting for Telegram notifications**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-07T17:52:16Z
- **Completed:** 2026-03-07T17:54:20Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 4

## Accomplishments
- Threshold evaluation with 9 edge cases: null baseline, null current, direction filtering, disabled rules
- 24h cooldown logic that re-evaluates against last notified price instead of original baseline
- MarkdownV2 escaping for all 18 special characters plus URL-specific escaping
- Alert message formatting with green/red circle emoji, card name hyperlinks, and price change display
- 25 tests passing across 3 test files

## Task Commits

Each task was committed atomically:

1. **TDD RED: Failing tests** - `597b72c` (test)
2. **TDD GREEN: Implementation** - `2ada519` (feat)

## Files Created/Modified
- `src/lib/telegram-utils.ts` - All notification utilities: threshold eval, cooldown, escaping, formatting
- `tests/threshold-evaluation.test.ts` - 9 tests for evaluateThreshold edge cases
- `tests/cooldown.test.ts` - 5 tests for shouldNotify cooldown logic
- `tests/notification-message.test.ts` - 11 tests for escaping, formatting, alert messages

## Decisions Made
- Null baseline treated as -100% drop (percentChange = -100) so any actual price triggers threshold rules that allow drops
- formatAlertMessage escapes price strings through escapeMarkdownV2, so dots in EUR amounts become `\.` in the final message
- shouldNotify delegates to evaluateThreshold with substituted baseline during cooldown window, keeping logic composable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test expected unescaped price in escaped message**
- **Found during:** TDD GREEN (test verification)
- **Issue:** Test checked for `€17.27` but formatAlertMessage escapes dots for MarkdownV2 producing `€17\.27`
- **Fix:** Updated test assertion to expect escaped price string
- **Files modified:** tests/notification-message.test.ts
- **Verification:** All 25 tests pass
- **Committed in:** 2ada519

---

**Total deviations:** 1 auto-fixed (1 bug in test)
**Impact on plan:** Trivial test correction, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All notification utilities ready for Plan 02 (Telegram bot Edge Function) and Plan 03 (fetch-prices integration)
- Exports match plan spec: evaluateThreshold, shouldNotify, escapeMarkdownV2, escapeMarkdownV2Url, formatAlertMessage, formatEurCents
- No blockers

---
*Phase: 04-notifications*
*Completed: 2026-03-07*
