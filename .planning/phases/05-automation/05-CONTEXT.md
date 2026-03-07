# Phase 5: Automation - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

The system maintains itself -- wishlists stay in sync, old data is cleaned up, and the operational loop runs reliably. Daily GitHub Actions job syncs each user's wishlist (adding new cards, hard-deleting removed ones). A separate cleanup job purges old snapshots and notifications. Both jobs handle cron delays gracefully with concurrency guards and idempotent logic.

</domain>

<decisions>
## Implementation Decisions

### Wishlist sync behavior
- Hard-delete monitored_cards when a card is removed from the CardTrader wishlist (CASCADE delete snapshots and notifications)
- New cards found during sync get the same treatment as a fresh import: resolve blueprint, fetch baseline price, create default 20% threshold rule
- Single GitHub Actions job processes all users, but each user's sync runs in parallel using their own CardTrader API token (separate rate limits per token)
- Silent sync -- no Telegram notifications about sync changes, user sees updates on next dashboard visit
- Update card metadata (card_name, image_url, expansion_name) for existing cards during sync, but do NOT touch user settings (rules, filters, baseline)
- Keep original baseline price -- sync never refreshes baseline for existing cards

### Snapshot cleanup
- Separate daily GitHub Actions job (not combined with sync or fetch-prices)
- Delete both price_snapshots AND notifications older than the card's retention_days
- Summary log output: "Deleted X snapshots and Y notifications older than retention"
- Cascade delete handles orphaned data when cards are hard-deleted during sync

### Scheduling & reliability
- Sync job runs daily at early morning UTC (e.g. 06:00 UTC)
- Cleanup job runs daily (can be same or different time -- Claude's discretion)
- GitHub Actions `concurrency` field on sync workflow with single group and `cancel-in-progress: false` to prevent overlapping runs
- Also add concurrency guard to the existing fetch-prices workflow (same pattern)
- If CardTrader API is down during sync: log the error and skip that user, continue with others -- next daily run retries naturally
- Naturally idempotent: each run compares current wishlist state vs DB state

### Sync edge cases
- Card removed then re-added to wishlist = brand new card (fresh baseline, fresh rules -- old entry was hard-deleted)
- Multiple wishlists per user: keep cards from all wishlists ever imported, sync only removes cards gone from their respective wishlist
- Card metadata changes on CardTrader (name corrections, image updates) are picked up during sync without affecting user-configured settings

### Claude's Discretion
- Exact cleanup job scheduling time
- Script file organization (separate files vs combined)
- Error retry strategy within a single user's sync
- Whether to reuse import-wishlist Edge Function code or duplicate for Node.js runtime
- DB migration details for CASCADE constraints if not already present
- Logging verbosity and format

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/import-wishlist/index.ts`: Full wishlist import logic (fetch, resolve blueprints, insert cards) -- sync needs equivalent logic
- `supabase/functions/_shared/cardtrader-api.ts`: Deno-runtime CardTrader API helpers (fetchWishlist, fetchExpansions, fetchBlueprintsForExpansion, fetchMarketplaceProducts)
- `scripts/fetch-prices.ts`: Existing Node.js cron job pattern -- sync script follows this pattern
- `src/lib/cardtrader-utils.ts`: Shared utilities (processBatches, filterCtZeroOffers, findCheapestPrice, deduplicateBlueprintIds)
- `.github/workflows/fetch-prices.yml`: Existing cron workflow template to follow

### Established Patterns
- GitHub Actions + Node.js script with service_role key for server-side DB access
- Rate-limited batching: 8 concurrent requests, 1s delay between batches
- Graceful skip when env vars missing (no hard failure)
- Supabase service_role client bypasses RLS
- Token decryption via `get_api_token` RPC function

### Integration Points
- `monitored_cards.is_active`: Column exists but sync will hard-delete instead of soft-deactivate
- `monitored_cards.retention_days`: Per-card retention, default 30 days -- cleanup uses this
- `wishlists.last_synced_at`: Track when each wishlist was last synced
- `wishlists.cardtrader_wishlist_id`: Links to CardTrader API wishlist ID for fetching
- Foreign keys on `price_snapshots.monitored_card_id` and `notifications.monitored_card_id` -- need CASCADE for hard-delete

</code_context>

<specifics>
## Specific Ideas

- Each user's CardTrader API token provides independent rate limits, enabling parallel per-user processing within the single sync job
- GitHub Actions concurrency field (not application-level locking) handles overlap prevention
- Hard-delete approach keeps the DB clean -- no accumulation of inactive cards over time

</specifics>

<deferred>
## Deferred Ideas

- WISH-05: Support multiple wishlists per user (v2) -- current sync already handles multiple wishlists if they exist
- Sync notification summaries via Telegram -- decided against for v1, could add later
- Manual baseline reset from dashboard (PRIC-07, v2)

</deferred>

---

*Phase: 05-automation*
*Context gathered: 2026-03-07*
