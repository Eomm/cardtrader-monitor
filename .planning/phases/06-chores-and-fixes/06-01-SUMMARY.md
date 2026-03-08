---
phase: 06-chores-and-fixes
plan: 01
subsystem: database, code-quality
tags: [biome, lint, schema, foreign-key, supabase]

# Dependency graph
requires:
  - phase: 05-automation
    provides: "sync-wishlists and fetch-prices scripts with expansion_name references"
provides:
  - "Zero Biome lint errors across all 55 checked files"
  - "expansion_id int FK to ct_expansions replacing expansion_name text"
  - "ct_expansions table moved to migration 00001 (before monitored_cards)"
  - "Supabase join pattern for expansion name display"
affects: [06-02, 06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase FK join via .select('*, ct_expansions(name)') for denormalized display"
    - "filter + type guard pattern replacing non-null assertions"

key-files:
  created: []
  modified:
    - supabase/migrations/00001_initial_schema.sql
    - supabase/migrations/00002_data_pipeline.sql
    - supabase/functions/import-wishlist/index.ts
    - scripts/sync-wishlists.ts
    - src/lib/cardtrader-types.ts
    - src/lib/cardtrader-utils.ts
    - src/pages/CardDetailPage.tsx
    - src/pages/DashboardPage.tsx
    - src/components/CardRow.tsx
    - tests/card-mapper.test.ts
    - tests/card-sorting.test.ts

key-decisions:
  - "Used filter+type guard instead of non-null assertion for resolvedItems.get() in sync-wishlists"
  - "Added ct_expansions optional join type to MonitoredCardWithPrice rather than flattened expansion_name"
  - "Display expansion via ct_expansions?.name with '---' fallback for null"

patterns-established:
  - "Supabase FK join: .select('*, ct_expansions(name)') with optional chaining access"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 06 Plan 01: Lint Fixes and Schema Normalization Summary

**Zero Biome errors (16 fixed) and expansion_name renamed to expansion_id int FK with ct_expansions Supabase join for display**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T18:09:17Z
- **Completed:** 2026-03-08T18:13:10Z
- **Tasks:** 2
- **Files modified:** 23 (12 in task 1, 11 in task 2)

## Accomplishments
- Resolved all 16 Biome lint errors (import ordering, formatting, non-null assertions)
- Renamed expansion_name text column to expansion_id int with FK to ct_expansions
- Moved ct_expansions table creation to migration 00001 (before monitored_cards that references it)
- Updated all queries, types, Edge Functions, scripts, and tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix all 16 Biome lint errors** - `90a5ecf` (fix)
2. **Task 2: Rename expansion_name to expansion_id with FK** - `de31026` (feat)

## Files Created/Modified
- `supabase/migrations/00001_initial_schema.sql` - Added ct_expansions table, changed expansion_name to expansion_id FK
- `supabase/migrations/00002_data_pipeline.sql` - Removed ct_expansions table (moved to 00001)
- `supabase/functions/import-wishlist/index.ts` - Use expansion_id instead of expansion_name in card inserts
- `scripts/sync-wishlists.ts` - Updated DbCard, ResolvedItem interfaces and all references to use expansion_id
- `src/lib/cardtrader-types.ts` - MonitoredCardWithPrice uses expansion_id + optional ct_expansions join
- `src/lib/cardtrader-utils.ts` - mapBlueprintToCard accepts expansionId number
- `src/pages/CardDetailPage.tsx` - Query joins ct_expansions, displays via optional chaining
- `src/pages/DashboardPage.tsx` - Query joins ct_expansions for card list
- `src/components/CardRow.tsx` - Displays ct_expansions?.name
- `tests/card-mapper.test.ts` - Updated to use expansion_id numeric values
- `tests/card-sorting.test.ts` - Updated makeCard fixture to use expansion_id

## Decisions Made
- Used filter+type guard pattern (`filter((item): item is NonNullable<typeof item> => item != null)`) instead of non-null assertion for the sync-wishlists Map.get() call
- Added `ct_expansions?: { name: string }` as optional join type on MonitoredCardWithPrice, keeping the type aligned with Supabase's join response shape
- Display fallback is `'---'` when ct_expansions join returns null

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Database will be reset so migration changes apply automatically.

## Next Phase Readiness
- Codebase is clean (zero lint errors, all tests green)
- Schema normalized with proper FK relationships
- Ready for Plan 02 (visual overhaul) and remaining chores

---
*Phase: 06-chores-and-fixes*
*Completed: 2026-03-08*
