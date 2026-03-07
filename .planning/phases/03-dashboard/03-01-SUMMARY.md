---
phase: 03-dashboard
plan: 01
subsystem: types, utilities, database
tags: [typescript, vitest, tdd, supabase, notification-rules, flag-emoji]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    provides: monitored_cards table, import-wishlist Edge Function, cardtrader-types.ts
provides:
  - ThresholdRule, StabilityRule, NotificationRule union type
  - MonitoredCardWithPrice centralized type with all DB columns
  - languageToFlag utility for flag emoji rendering
  - sortCards utility for dashboard card ordering
  - createDefaultStabilityRule and createDefaultNotificationRules
  - DB migration wrapping single-object rules into arrays
  - Edge Function writes notification_rule as array
affects: [03-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [union-type notification rules, TDD for utility functions]

key-files:
  created:
    - tests/flag-emoji.test.ts
    - tests/card-sorting.test.ts
    - supabase/migrations/00003_notification_rule_array.sql
  modified:
    - src/lib/cardtrader-types.ts
    - src/lib/cardtrader-utils.ts
    - supabase/functions/import-wishlist/index.ts
    - src/components/CardItem.tsx
    - src/components/CardList.tsx
    - src/pages/DashboardPage.tsx
    - tests/notification-rule.test.ts

key-decisions:
  - "ThresholdRule/StabilityRule union pattern for extensible notification rules"
  - "Regional indicator symbol calculation for flag emoji (no external library)"
  - "MonitoredCardWithPrice centralized in cardtrader-types.ts with all DB columns"

patterns-established:
  - "Union type pattern: individual rule interfaces + union export"
  - "Sort pattern: active-first, price-ascending, null-at-end"

requirements-completed: [FILT-02, RULE-01, RULE-02]

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 3 Plan 01: Types, Utilities, and Migration Summary

**NotificationRule union type (threshold + stability), flag emoji mapping, card sorting, and JSONB array migration for dashboard features**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-07T16:18:47Z
- **Completed:** 2026-03-07T16:21:07Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- NotificationRule is now a union of ThresholdRule and StabilityRule, supporting extensible rule types
- languageToFlag maps 10 CardTrader language codes to flag emoji using regional indicator symbols
- sortCards utility orders active cards by price ascending with null prices at end, inactive at bottom
- DB migration wraps existing single-object notification_rule values into arrays
- MonitoredCardWithPrice centralized in types file with all DB columns properly typed
- 53 total tests passing (24 new tests via TDD)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update types and create utility functions with tests** - `3de199b` (feat, TDD)
2. **Task 2: Database migration and Edge Function update** - `a91ce88` (feat)
3. **Task 3: Move MonitoredCardWithPrice to types file and update imports** - `a64a71e` (refactor)

## Files Created/Modified
- `src/lib/cardtrader-types.ts` - ThresholdRule, StabilityRule, NotificationRule union, MonitoredCardWithPrice
- `src/lib/cardtrader-utils.ts` - languageToFlag, createDefaultStabilityRule, createDefaultNotificationRules, sortCards
- `supabase/migrations/00003_notification_rule_array.sql` - Wraps single objects into arrays
- `supabase/functions/import-wishlist/index.ts` - Writes notification_rule as array
- `src/components/CardItem.tsx` - Import from centralized types
- `src/components/CardList.tsx` - Import from centralized types
- `src/pages/DashboardPage.tsx` - Import from centralized types
- `tests/flag-emoji.test.ts` - 12 tests for language-to-flag mapping
- `tests/card-sorting.test.ts` - 6 tests for card sorting logic
- `tests/notification-rule.test.ts` - 6 tests for notification rule creation

## Decisions Made
- Used regional indicator symbol calculation for flag emoji instead of a lookup table of emoji literals -- more maintainable and correct
- ThresholdRule/StabilityRule union pattern allows easy extension with new rule types
- MonitoredCardWithPrice centralized in cardtrader-types.ts to avoid type duplication across components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Type contracts established for Plans 02 (filter UI) and 03 (rule editor)
- All utilities tested and exported
- DB migration ready to apply with `supabase db push`

## Self-Check: PASSED

All files verified present. All commit hashes verified in git log.

---
*Phase: 03-dashboard*
*Completed: 2026-03-07*
