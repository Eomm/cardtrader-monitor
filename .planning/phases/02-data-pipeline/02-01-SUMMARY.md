---
phase: 02-data-pipeline
plan: 01
subsystem: database, testing, api
tags: [vitest, typescript, postgresql, cardtrader, tdd]

requires:
  - phase: 01-foundation
    provides: Supabase schema with profiles, wishlists, monitored_cards, price_snapshots tables and RLS

provides:
  - Vitest test infrastructure configured and running
  - TypeScript types for all CardTrader API responses and app models
  - Tested shared utility functions (URL parsing, CT Zero filtering, pricing, batching, mapping, dedup, retention)
  - Database migration with baseline_price_cents, retention_days, cache tables, decrypt function

affects: [02-data-pipeline, 03-dashboard]

tech-stack:
  added: [vitest]
  patterns: [TDD red-green, CardTrader CT Zero filter, rate-limited batch processing]

key-files:
  created:
    - vitest.config.ts
    - src/lib/cardtrader-types.ts
    - src/lib/cardtrader-utils.ts
    - supabase/migrations/00002_data_pipeline.sql
    - tests/url-parser.test.ts
    - tests/card-mapper.test.ts
    - tests/notification-rule.test.ts
    - tests/price-filter.test.ts
    - tests/dedup.test.ts
    - tests/retention.test.ts
  modified:
    - package.json

key-decisions:
  - "Used null for baseline_price_cents when no offers found (not sentinel value)"
  - "CT Zero filter checks three seller qualifications: can_sell_via_hub, user_type=pro, can_sell_sealed_with_ct_zero"
  - "Cache table RLS blocks anon/authenticated writes; service_role bypasses RLS for Edge Functions and GH Actions"

patterns-established:
  - "TDD workflow: write failing tests first, then implement, verify with vitest"
  - "CT Zero filter pattern: three-way seller check ported from garcon reference"
  - "Rate-limited batching: 8 concurrent, 1s delay between batches"
  - "Retention days: clamped 1-365, default 30"

requirements-completed: [WISH-01, WISH-02, WISH-03, PRIC-02, PRIC-03, PRIC-04]

duration: 3min
completed: 2026-03-07
---

# Phase 2 Plan 1: Shared Types, Utilities, and Schema Summary

**Vitest test suite with 31 passing tests covering 8 shared CardTrader utility functions, TypeScript API types, and Phase 2 database migration adding baseline pricing, retention, cache tables, and token decryption**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T13:46:13Z
- **Completed:** 2026-03-07T13:49:30Z
- **Tasks:** 2 (Task 1 was TDD with RED + GREEN commits)
- **Files modified:** 12

## Accomplishments
- Vitest installed and configured with test script in package.json; 31 tests across 6 files all passing
- 8 shared utility functions implemented and tested: extractWishlistId, filterCtZeroOffers, findCheapestPrice, processBatches, mapBlueprintToCard, createDefaultNotificationRule, deduplicateBlueprintIds, getRetentionDays
- TypeScript types defined for WishlistItem, MarketplaceProduct, Blueprint, Expansion, NotificationRule, CardFilters, ImportResult
- Phase 2 SQL migration with baseline_price_cents, retention_days, ct_expansions/ct_blueprints cache tables, decrypt_api_token function, and RLS policies

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for shared utilities** - `ad1c28a` (test)
2. **Task 1 (GREEN): Implement shared utility functions** - `ca58d17` (feat)
3. **Task 2: Phase 2 database migration** - `bb5c080` (feat)

_Task 1 followed TDD: RED phase committed failing tests, GREEN phase committed implementations._

## Files Created/Modified
- `vitest.config.ts` - Vitest configuration with path aliases
- `src/lib/cardtrader-types.ts` - TypeScript interfaces for CardTrader API and app models
- `src/lib/cardtrader-utils.ts` - 8 shared utility functions for CardTrader integration
- `supabase/migrations/00002_data_pipeline.sql` - Schema migration: baseline price, retention, cache tables, decrypt function, RLS
- `tests/url-parser.test.ts` - 8 tests for wishlist URL extraction
- `tests/card-mapper.test.ts` - 2 tests for blueprint-to-card mapping
- `tests/notification-rule.test.ts` - 2 tests for default notification rule
- `tests/price-filter.test.ts` - 10 tests for CT Zero filtering and cheapest price
- `tests/dedup.test.ts` - 3 tests for blueprint ID deduplication
- `tests/retention.test.ts` - 6 tests for retention days defaults and clamping
- `package.json` - Added vitest devDependency and test script

## Decisions Made
- Used `null` for `baseline_price_cents` when no marketplace offers found, instead of garcon's 32600 sentinel value -- cleaner data model, UI shows "No offers"
- Cache table RLS uses `WITH CHECK (false)` for INSERT/UPDATE to block anon/authenticated writes; service_role used by Edge Functions and GH Actions bypasses RLS entirely
- decrypt_api_token takes target_user_id parameter (not auth.uid()) for Edge Function and service role compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Types and utilities are importable by subsequent plans (Edge Function import-wishlist, GH Actions fetch-prices, Dashboard UI)
- SQL migration ready to apply via Supabase SQL Editor or migration tool
- Test infrastructure ready for additional test files in subsequent plans

---
*Phase: 02-data-pipeline*
*Completed: 2026-03-07*
