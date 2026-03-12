---
phase: 07-ui-usability-improvements
plan: 03
subsystem: ui
tags: [react, localStorage, vitest, jsdom, filtering]

# Dependency graph
requires:
  - phase: 06-chores-and-fixes
    provides: ct_expansions join type, MonitoredCardWithPrice with wishlist_id
provides:
  - Wishlist filter dropdown in CardList (visible when >1 wishlist)
  - Persistent filter state via localStorage (search, expansion, wishlist)
  - loadFilters/DEFAULT_FILTERS/FILTER_KEY exported from CardList for testability
  - onRuleSaved and wishlists props wired on DashboardPage for downstream use
affects: [07-02-plan, plan-02-inline-editing]

# Tech tracking
tech-stack:
  added: [jsdom (devDependency for vitest localStorage support)]
  patterns:
    - Exported pure localStorage helpers (loadFilters) from component for unit testability
    - TDD red-green cycle for localStorage logic
    - Validation useEffects reset stale persisted filter values

key-files:
  created:
    - tests/dashboard-filters.test.ts
  modified:
    - src/pages/DashboardPage.tsx
    - src/components/CardList.tsx
    - package.json

key-decisions:
  - "Installed jsdom as devDependency for vitest localStorage support; used @vitest-environment jsdom annotation on test file"
  - "Exported FILTER_KEY, DEFAULT_FILTERS, DashboardFilters, loadFilters from CardList.tsx at module level for unit testability"
  - "Wishlists fetched via Promise.all alongside price_snapshots to avoid sequential round-trips"
  - "onRuleSaved prop accepted but not forwarded to CardRow yet; Plan 02 handles pass-through"

patterns-established:
  - "Export pure functions alongside React components to enable unit testing without component mounting"
  - "Validation useEffects guard against stale persisted values when available options change"

requirements-completed: [UX-04, UX-05]

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 7 Plan 03: Wishlist Filter and Persistent Dashboard Filters Summary

**Wishlist dropdown filter with full localStorage persistence for search, expansion, and wishlist filters, including stale-value validation and 4 unit tests via jsdom**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-12T17:41:27Z
- **Completed:** 2026-03-12T17:49:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DashboardPage now fetches wishlists from Supabase in parallel with price snapshots and passes them to CardList
- CardList exports `loadFilters`, `DEFAULT_FILTERS`, `FILTER_KEY`, and `DashboardFilters` for unit testing
- All filter state (search, expansion, wishlist) persists to localStorage and restores on page reload
- Wishlist dropdown appears only when user has more than one wishlist
- Stale persisted filter values (deleted wishlist, removed expansion) reset to empty string gracefully
- 4 unit tests covering missing key, invalid JSON, round-trip, and partial merge scenarios all pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Fetch wishlists in DashboardPage and pass to CardList** - `544666a` (feat)
2. **Task 2 RED: Add failing tests for loadFilters** - `7b0e6b5` (test)
3. **Task 2 GREEN: Add wishlist filter and localStorage persistence to CardList** - `5304eb1` (feat)

## Files Created/Modified
- `src/pages/DashboardPage.tsx` - Added wishlists state, parallel fetch via Promise.all, passes wishlists+onRuleSaved to CardList
- `src/components/CardList.tsx` - Added exported localStorage helpers, wishlist prop, wishlist dropdown, persistence useEffect, validation useEffects
- `tests/dashboard-filters.test.ts` - 4 unit tests for loadFilters using jsdom environment
- `package.json` - Added jsdom devDependency for vitest localStorage support

## Decisions Made
- Installed `jsdom` devDependency and used `// @vitest-environment jsdom` file-level annotation so the test file gets localStorage without global vitest config change
- Exported `loadFilters` at module level (not inside component) to keep it pure and testable without mounting React
- Fetched wishlists in `Promise.all` with snapshots query to avoid an extra sequential round-trip
- `onRuleSaved` prop is accepted but prefixed with `_` since CardRow integration is Plan 02's responsibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed jsdom for vitest localStorage support**
- **Found during:** Task 2 (test file creation)
- **Issue:** vitest config had no browser environment; `localStorage` undefined in test context
- **Fix:** Ran `npm install --save-dev jsdom`, added `// @vitest-environment jsdom` to test file
- **Files modified:** package.json, package-lock.json
- **Verification:** All 4 tests pass with localStorage correctly accessible
- **Committed in:** 544666a (Task 1 commit, jsdom installed before test run)

---

**Total deviations:** 1 auto-fixed (blocking dependency)
**Impact on plan:** Essential for test execution. No scope creep.

## Issues Encountered
None beyond the jsdom dependency gap documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wishlist filter and persistence complete; CardList ready for Plan 02 inline editing pass-through (onRuleSaved)
- DashboardPage already passes `onRuleSaved={fetchCards}` so no further edits needed when Plan 02 wires CardRow

---
*Phase: 07-ui-usability-improvements*
*Completed: 2026-03-12*

## Self-Check: PASSED

- src/pages/DashboardPage.tsx: FOUND
- src/components/CardList.tsx: FOUND
- tests/dashboard-filters.test.ts: FOUND
- Commit 544666a: FOUND
- Commit 7b0e6b5: FOUND
- Commit 5304eb1: FOUND
