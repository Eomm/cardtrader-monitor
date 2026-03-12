---
phase: 07-ui-usability-improvements
plan: 01
subsystem: api
tags: [typescript, notification-rules, telegram, fixed-price, tdd, vitest]

# Dependency graph
requires:
  - phase: 04-notifications
    provides: ThresholdRule/StabilityRule union, shouldNotify() in telegram-utils.ts, fetch-prices.ts evaluation loop
provides:
  - FixedPriceRule interface in NotificationRule discriminated union
  - shouldNotifyFixedPrice() evaluation function with crossing semantics
  - createDefaultFixedPriceRule() factory function
  - Fixed-price rule evaluation in fetch-prices.ts hourly job
affects: [07-02, 07-03, 07-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green, discriminated union extension, crossing semantics for price alerts]

key-files:
  created:
    - tests/fixed-price-evaluation.test.ts
  modified:
    - src/lib/cardtrader-types.ts
    - src/lib/cardtrader-utils.ts
    - src/lib/telegram-utils.ts
    - scripts/fetch-prices.ts
    - tests/notification-rule.test.ts

key-decisions:
  - "FixedPriceRule uses crossing semantics: triggers only when price crosses the target threshold (not just below/above)"
  - "previousCents in shouldNotifyFixedPrice uses lastNotif.priceCents ?? baseline in fetch-prices.ts for cooldown-aware evaluation"
  - "Fixed price rules evaluated only after threshold rules (threshold-first priority per card)"

patterns-established:
  - "Crossing semantics: direction=down triggers when currentCents <= target AND previousCents > target (or no previous)"
  - "NotifyResult shape reused for fixed_price alerts so formatAlertMessage works identically"

requirements-completed: [UX-01, UX-02]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 7 Plan 01: FixedPriceRule type, evaluation, and backend integration Summary

**FixedPriceRule discriminated union member with price-crossing evaluation logic and fetch-prices.ts integration via TDD**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T16:36:48Z
- **Completed:** 2026-03-12T16:39:36Z
- **Tasks:** 3 (RED, GREEN, Integration)
- **Files modified:** 5

## Accomplishments

- Added `FixedPriceRule` interface to `NotificationRule` union with `price_eur`, `direction`, `enabled` fields
- Implemented `shouldNotifyFixedPrice()` with crossing semantics (triggers on threshold crossing, not just position)
- Extended `fetch-prices.ts` evaluation loop to evaluate fixed_price rules after threshold rules with same dedup behavior
- 28 new tests covering all crossing scenarios; 100 total tests passing with no regressions

## Task Commits

Each task was committed atomically:

1. **Task RED: Failing tests for FixedPriceRule** - `33f85e5` (test)
2. **Task GREEN: Implement FixedPriceRule type, factory, evaluation** - `bb3a267` (feat)
3. **Task Integration: Extend fetch-prices.ts** - `8df1b33` (feat)

_Note: TDD tasks have multiple commits (test -> feat)_

## Files Created/Modified

- `tests/fixed-price-evaluation.test.ts` - 24 tests covering crossing semantics (down, up, both, disabled, null price, result shape)
- `tests/notification-rule.test.ts` - Extended with 2 tests for createDefaultFixedPriceRule
- `src/lib/cardtrader-types.ts` - Added FixedPriceRule interface, extended NotificationRule union
- `src/lib/cardtrader-utils.ts` - Added createDefaultFixedPriceRule() factory
- `src/lib/telegram-utils.ts` - Added shouldNotifyFixedPrice() function
- `scripts/fetch-prices.ts` - Extended evaluation loop to handle fixed_price rules

## Decisions Made

- Crossing semantics chosen over positional semantics: a fixed-price rule triggers only when the price crosses the configured EUR amount, not when it's already on the target side. This prevents spurious repeated alerts.
- `previousCents` in fetch-prices.ts uses `lastNotif?.priceCents ?? card.baseline_price_cents` so cooldown behavior is consistent with threshold rules.
- Threshold rules evaluated first (existing dedup behavior maintained); fixed_price rules only evaluated if no threshold rule triggered for that card.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FixedPriceRule type is now in the NotificationRule union, ready for UI integration in 07-02/07-03/07-04
- `createDefaultFixedPriceRule()` available for RuleEditor components to add new rule type
- Backend evaluation fully integrated — alerts will fire on price crossings from next scheduled run

---
*Phase: 07-ui-usability-improvements*
*Completed: 2026-03-12*
