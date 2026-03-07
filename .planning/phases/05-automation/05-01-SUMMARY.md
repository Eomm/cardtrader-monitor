---
phase: 05-automation
plan: 01
subsystem: database, infra
tags: [postgres, plpgsql, github-actions, cron, supabase-rpc, cleanup]

requires:
  - phase: 02-data-pipeline
    provides: price_snapshots table, monitored_cards.retention_days column
  - phase: 04-notifications
    provides: notifications table with sent_at column
provides:
  - cleanup_expired_data() Postgres function for per-card retention
  - cleanup-snapshots.ts Node.js script calling RPC
  - Daily cleanup workflow (04:00 UTC)
  - Concurrency guard on fetch-prices workflow
affects: []

tech-stack:
  added: []
  patterns: [supabase-rpc-for-joins, github-actions-concurrency-guard]

key-files:
  created:
    - supabase/migrations/00004_automation.sql
    - scripts/cleanup-snapshots.ts
    - .github/workflows/cleanup-snapshots.yml
  modified:
    - .github/workflows/fetch-prices.yml

key-decisions:
  - "Used SECURITY DEFINER PL/pgSQL function for DELETE with JOIN (Supabase JS cannot do DELETE with JOIN)"
  - "Cleanup at 04:00 UTC to avoid overlap with hourly fetch-prices runs"
  - "cancel-in-progress: false on both workflows to prevent data corruption"

patterns-established:
  - "RPC pattern: complex DB operations as Postgres functions called via supabase.rpc()"
  - "Concurrency guard pattern: group + cancel-in-progress: false for data workflows"

requirements-completed: [PRIC-05]

duration: 1min
completed: 2026-03-07
---

# Phase 05 Plan 01: Snapshot & Notification Cleanup Summary

**Per-card retention cleanup via Postgres function + daily GitHub Actions cron with concurrency guards on both workflows**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-07T21:23:38Z
- **Completed:** 2026-03-07T21:24:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Postgres function deletes expired snapshots and notifications using per-card retention_days
- Node.js cleanup script calls function via Supabase RPC and logs deletion summary
- Daily cron workflow at 04:00 UTC triggers cleanup
- Concurrency guard added to fetch-prices workflow to prevent overlapping runs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cleanup Postgres function and Node.js script** - `ad194c7` (feat)
2. **Task 2: Create cleanup workflow and add concurrency to fetch-prices** - `3bb93f4` (feat)

## Files Created/Modified
- `supabase/migrations/00004_automation.sql` - cleanup_expired_data() PL/pgSQL function
- `scripts/cleanup-snapshots.ts` - Node.js script calling RPC with summary logging
- `.github/workflows/cleanup-snapshots.yml` - Daily cron workflow at 04:00 UTC
- `.github/workflows/fetch-prices.yml` - Added concurrency guard

## Decisions Made
- Used SECURITY DEFINER PL/pgSQL function because Supabase JS cannot do DELETE with JOIN
- Scheduled cleanup at 04:00 UTC (off-peak, separate from hourly fetch-prices)
- cancel-in-progress: false on both workflows to avoid data corruption mid-operation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cleanup automation complete, ready for 05-02 (sync workflow or remaining automation)
- All GitHub Actions secrets already configured from prior phases

---
*Phase: 05-automation*
*Completed: 2026-03-07*
