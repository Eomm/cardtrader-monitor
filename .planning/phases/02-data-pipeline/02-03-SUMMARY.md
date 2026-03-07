---
phase: 02-data-pipeline
plan: 03
subsystem: api, automation
tags: [github-actions, cardtrader, typescript, cron, supabase]

requires:
  - phase: 02-data-pipeline
    provides: Shared types, utility functions (processBatches, filterCtZeroOffers, findCheapestPrice, deduplicateBlueprintIds), and Phase 2 database migration

provides:
  - Standalone Node.js/TypeScript price fetch script for GitHub Actions
  - Hourly cron workflow with manual dispatch trigger
  - Automated price snapshot insertion for all active monitored cards

affects: [03-dashboard, 04-notifications]

tech-stack:
  added: []
  patterns: [GitHub Actions cron job, service_role Supabase client, rate-limited marketplace fetch]

key-files:
  created:
    - scripts/fetch-prices.ts
    - .github/workflows/fetch-prices.yml
  modified: []

key-decisions:
  - "Used first available valid API token for all marketplace queries since prices are user-independent"
  - "Skip price snapshot for cards with no matching offers rather than inserting null (price_cents is NOT NULL)"
  - "Store top 3 offers in marketplace_data jsonb for price context"

patterns-established:
  - "GitHub Actions cron pattern: checkout, setup-node, npm ci, npx tsx scripts/*.ts"
  - "Service role Supabase client with encryption key header for token decryption"
  - "Marketplace response keyed by blueprint_id string, not array"

requirements-completed: [PRIC-01, PRIC-02, PRIC-04]

duration: 3min
completed: 2026-03-07
---

# Phase 2 Plan 3: Hourly Price Fetch Summary

**Node.js price fetch script with rate-limited CardTrader marketplace batching and GitHub Actions hourly cron workflow for automated price snapshots**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T13:57:56Z
- **Completed:** 2026-03-07T14:01:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Price fetch script queries all active monitored cards, deduplicates by blueprint_id, and fetches marketplace prices in rate-limited batches (8 concurrent, 1s delay)
- Script decrypts CardTrader API token via Supabase RPC, handles individual API failures gracefully (logs and continues)
- Inserts price snapshots with cheapest price and top 3 offers as marketplace_data jsonb
- GitHub Actions workflow runs hourly via cron with manual dispatch for testing, passes all 3 required secrets as env vars

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement price fetch script** - `1bfded4` (feat)
2. **Task 2: Create GitHub Actions hourly workflow** - `0efa9f4` (feat)

## Files Created/Modified
- `scripts/fetch-prices.ts` - Standalone price fetch script: queries active cards, deduplicates blueprints, fetches marketplace prices, inserts snapshots
- `.github/workflows/fetch-prices.yml` - Hourly cron workflow with manual dispatch, Node.js setup, and secret env vars

## Decisions Made
- Used first available valid API token across all users for marketplace queries (prices are the same regardless of querying user, per research)
- Cards with no matching offers skip snapshot insertion (price_cents is NOT NULL in schema)
- Marketplace data stores top 3 offers with id, price_cents, condition, and seller_type for future dashboard display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - GitHub Secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY) must already be configured from Phase 1 deployment.

## Next Phase Readiness
- Price snapshots will be generated hourly once workflow is active on main branch
- Dashboard (Phase 3) can query price_snapshots to display price history and trends
- Notification system (Phase 4) can compare snapshots against notification_rule thresholds

---
*Phase: 02-data-pipeline*
*Completed: 2026-03-07*
