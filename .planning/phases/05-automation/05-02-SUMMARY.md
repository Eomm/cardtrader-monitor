---
phase: 05-automation
plan: 02
subsystem: automation
tags: [github-actions, cron, cardtrader-api, sync, wishlist]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    provides: "CardTrader API patterns, import-wishlist flow, ct_blueprints/ct_expansions cache tables"
  - phase: 05-automation
    provides: "Cleanup workflow pattern (05-01)"
provides:
  - "Daily wishlist sync script (diff-based add/remove/update)"
  - "GitHub Actions cron workflow for daily sync at 06:00 UTC"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Diff-based sync with hard-delete for removed cards", "Blueprint cache-first resolution pattern", "Per-user error isolation in batch scripts"]

key-files:
  created:
    - scripts/sync-wishlists.ts
    - .github/workflows/sync-wishlists.yml
  modified: []

key-decisions:
  - "Hard-delete removed cards (CASCADE cleans up snapshots/notifications)"
  - "Blueprint cache checked before API calls to reduce rate limit usage"
  - "Metadata updates never touch user settings (rules, baseline, filters)"

patterns-established:
  - "Sync script pattern: query DB state, fetch API state, diff, apply changes"

requirements-completed: [WISH-04]

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 5 Plan 2: Wishlist Sync Summary

**Diff-based daily wishlist sync with hard-delete, baseline pricing for new cards, and per-user error isolation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-07T21:25:58Z
- **Completed:** 2026-03-07T21:27:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Sync script diffs CardTrader API state vs DB state per wishlist: adds new cards, hard-deletes removed, updates metadata
- New cards get full import treatment (blueprint resolution, baseline price fetch, default 20% threshold rule)
- Per-user error isolation ensures one user's API failure does not block others
- Blueprint cache-first lookup minimizes API calls
- GitHub Actions workflow runs daily at 06:00 UTC with concurrency guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wishlist sync script** - `a0d3fd2` (feat)
2. **Task 2: Create sync workflow** - `00cc77b` (feat)

## Files Created/Modified
- `scripts/sync-wishlists.ts` - Daily wishlist sync script with diff-based add/remove/update logic
- `.github/workflows/sync-wishlists.yml` - Daily cron workflow (06:00 UTC) with concurrency guard

## Decisions Made
- Hard-delete removed cards (CASCADE handles snapshots and notifications cleanup)
- Blueprint cache checked in ct_blueprints table before making API calls
- Metadata updates only touch card_name, image_url, expansion_name -- never user settings
- Silent sync (no TELEGRAM_BOT_TOKEN needed, no notifications about sync changes)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 5 plans complete (05-01 cleanup + 05-02 sync)
- Three GitHub Actions workflows now operational: fetch-prices (hourly), cleanup (daily 04:00 UTC), sync-wishlists (daily 06:00 UTC)

---
*Phase: 05-automation*
*Completed: 2026-03-07*
