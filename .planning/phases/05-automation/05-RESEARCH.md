# Phase 5: Automation - Research

**Researched:** 2026-03-07
**Domain:** GitHub Actions cron jobs, Supabase DB maintenance, wishlist sync automation
**Confidence:** HIGH

## Summary

Phase 5 automates two maintenance tasks: (1) daily wishlist sync that adds new cards and hard-deletes removed ones, and (2) daily cleanup of expired snapshots and notifications. Both run as GitHub Actions cron jobs following the established pattern from `fetch-prices.yml`.

The codebase already has all the building blocks: the import-wishlist Edge Function contains the full sync logic (fetch wishlist, resolve blueprints, insert cards), the fetch-prices script provides the Node.js cron pattern, and the DB schema already has CASCADE deletes on `price_snapshots` and `notifications` foreign keys. The sync script is essentially a Node.js port of the import-wishlist logic with added diff logic (compare current DB cards vs current wishlist items). The cleanup script is a straightforward SQL DELETE with a date threshold.

**Primary recommendation:** Build two new scripts (`scripts/sync-wishlists.ts` and `scripts/cleanup-snapshots.ts`) following the exact pattern of `scripts/fetch-prices.ts`, with two new GitHub Actions workflows. Add `concurrency` guards to all three workflows.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Hard-delete monitored_cards when a card is removed from the CardTrader wishlist (CASCADE delete snapshots and notifications)
- New cards found during sync get the same treatment as a fresh import: resolve blueprint, fetch baseline price, create default 20% threshold rule
- Single GitHub Actions job processes all users, but each user's sync runs in parallel using their own CardTrader API token (separate rate limits per token)
- Silent sync -- no Telegram notifications about sync changes, user sees updates on next dashboard visit
- Update card metadata (card_name, image_url, expansion_name) for existing cards during sync, but do NOT touch user settings (rules, filters, baseline)
- Keep original baseline price -- sync never refreshes baseline for existing cards
- Separate daily GitHub Actions job (not combined with sync or fetch-prices)
- Delete both price_snapshots AND notifications older than the card's retention_days
- Summary log output: "Deleted X snapshots and Y notifications older than retention"
- Cascade delete handles orphaned data when cards are hard-deleted during sync
- Sync job runs daily at early morning UTC (e.g. 06:00 UTC)
- GitHub Actions `concurrency` field on sync workflow with single group and `cancel-in-progress: false` to prevent overlapping runs
- Also add concurrency guard to the existing fetch-prices workflow (same pattern)
- If CardTrader API is down during sync: log the error and skip that user, continue with others -- next daily run retries naturally
- Naturally idempotent: each run compares current wishlist state vs DB state
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

### Deferred Ideas (OUT OF SCOPE)
- WISH-05: Support multiple wishlists per user (v2) -- current sync already handles multiple wishlists if they exist
- Sync notification summaries via Telegram -- decided against for v1, could add later
- Manual baseline reset from dashboard (PRIC-07, v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WISH-04 | Wishlist auto-syncs daily via GitHub Actions (adds new cards, deactivates removed ones) | Sync script pattern mirrors fetch-prices.ts; import-wishlist Edge Function provides blueprint resolution logic; per-user parallel processing via separate API tokens |
| PRIC-05 | Snapshots older than the retention window are cleaned up automatically | Cleanup script uses `retention_days` column (already exists on `monitored_cards`); simple SQL DELETE with date arithmetic |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.0.0 | DB access with service_role key | Already used in fetch-prices.ts |
| tsx | (devDep via npx) | Run TypeScript scripts in Node.js | Already used in fetch-prices workflow |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| src/lib/cardtrader-utils.ts | N/A | processBatches, findCheapestPrice, createDefaultNotificationRule, deduplicateBlueprintIds | Reuse in sync script for batching and card creation |
| src/lib/cardtrader-types.ts | N/A | TypeScript interfaces | Type safety in scripts |

### No New Dependencies Needed

The existing stack covers everything. No new npm packages required.

## Architecture Patterns

### Recommended Script Structure
```
scripts/
  fetch-prices.ts      # existing -- add concurrency to workflow
  sync-wishlists.ts    # NEW -- daily wishlist sync
  cleanup-snapshots.ts # NEW -- daily retention cleanup
.github/workflows/
  fetch-prices.yml     # existing -- add concurrency block
  sync-wishlists.yml   # NEW
  cleanup-snapshots.yml # NEW
supabase/migrations/
  00004_automation.sql  # NEW -- if any schema changes needed (likely none)
```

### Pattern 1: Script Entry Point (follow fetch-prices.ts)
**What:** Each script exports a `main()` function, validates env vars, creates Supabase client, does work, logs summary.
**When to use:** All three automation scripts.
**Example:**
```typescript
// Source: scripts/fetch-prices.ts (existing pattern)
export async function main(): Promise<void> {
  const startTime = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
  });
  // ... do work ...
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Summary: ... in ${elapsed}s`);
}
main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
```

### Pattern 2: Sync Diff Logic
**What:** Compare current wishlist items (from CardTrader API) against current DB cards (from Supabase) to determine adds, updates, and deletes.
**When to use:** Wishlist sync script.
**Algorithm:**
1. For each user: get all their wishlists from DB
2. For each wishlist: fetch current items from CardTrader API using `fetchWishlist(token, wishlistId)`
3. Get existing `monitored_cards` for that wishlist from DB
4. Build sets keyed by `blueprint_id`:
   - `apiCards`: blueprint IDs present in API response
   - `dbCards`: blueprint IDs present in DB
5. `toAdd = apiCards - dbCards` -- new cards to import
6. `toRemove = dbCards - apiCards` -- cards to hard-delete
7. `toUpdate = apiCards INTERSECT dbCards` -- update metadata only
8. For `toAdd`: resolve blueprint, fetch baseline price, insert with default rules (mirrors import-wishlist logic)
9. For `toRemove`: DELETE from monitored_cards (CASCADE handles snapshots + notifications)
10. For `toUpdate`: UPDATE card_name, image_url, expansion_name only (never touch rules, baseline, filters)

### Pattern 3: Per-User Parallel Processing
**What:** Each user has their own CardTrader API token with independent rate limits. Process users sequentially but each user's card operations use `processBatches` for parallel API calls.
**When to use:** Sync script.
**Rationale:** Users have separate rate limits (200 req/10s per token). Processing users in parallel would risk complexity without significant time savings given the small user base. Within a user's sync, batch API calls (blueprint resolution, price fetches) use `processBatches(items, fn, 8, 1000)`.

### Pattern 4: GitHub Actions Concurrency Guard
**What:** Prevent overlapping workflow runs using the `concurrency` field.
**When to use:** All three workflows (sync, cleanup, fetch-prices).
**Example:**
```yaml
# Source: GitHub Actions docs
concurrency:
  group: sync-wishlists
  cancel-in-progress: false
```
**Key detail:** `cancel-in-progress: false` means if a run is in progress, the next queued run waits. It does NOT cancel. Any existing *pending* run in the same group IS replaced by the new pending run (GitHub's default behavior), but the in-progress run completes.

### Pattern 5: Cleanup Query
**What:** Delete old snapshots and notifications based on per-card `retention_days`.
**When to use:** Cleanup script.
**Example:**
```sql
-- Delete old price snapshots
DELETE FROM price_snapshots ps
USING monitored_cards mc
WHERE ps.monitored_card_id = mc.id
  AND ps.recorded_at < now() - (mc.retention_days || ' days')::interval;

-- Delete old notifications
DELETE FROM notifications n
USING monitored_cards mc
WHERE n.monitored_card_id = mc.id
  AND n.sent_at < now() - (mc.retention_days || ' days')::interval;
```
**Note:** These can be executed via the Supabase JS client using `.rpc()` with a custom function, or by running raw SQL through a migration-created function. Since Supabase JS does not support raw SQL, the cleanest approach is to create a `cleanup_expired_data()` Postgres function in a migration and call it via `.rpc()`.

### Anti-Patterns to Avoid
- **Reusing Deno Edge Function code directly:** The `_shared/cardtrader-api.ts` uses Deno runtime imports (`npm:` specifiers). Node.js scripts cannot import these. Must re-implement CardTrader API calls for Node.js (same as `fetch-prices.ts` does with its own `fetchMarketplaceProducts`).
- **Soft-deleting cards:** User decided on hard-delete. Do NOT set `is_active = false` -- DELETE the row and let CASCADE clean up.
- **Modifying user settings during metadata update:** Only update `card_name`, `image_url`, `expansion_name`. Never touch `notification_rule`, `baseline_price_cents`, `only_zero`, `condition_required`, `language_required`, `foil_required`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate-limited API batching | Custom throttling logic | `processBatches()` from `src/lib/cardtrader-utils.ts` | Already tested, handles 8-concurrent with 1s delay |
| Blueprint resolution | Custom expansion/blueprint lookup | Port logic from `import-wishlist/index.ts` steps 5a-5f | Proven flow, handles edge cases |
| Default notification rules | Manual JSON construction | `createDefaultNotificationRule()` from `src/lib/cardtrader-utils.ts` | Consistent with import flow |
| Cheapest price finding | Manual filtering + sorting | `findCheapestPrice()` from `src/lib/cardtrader-utils.ts` | Handles CT Zero filtering correctly |
| Concurrency control | Application-level locks (Redis, DB flags) | GitHub Actions `concurrency` field | Built-in, zero maintenance |

**Key insight:** The sync script is 80% the same as import-wishlist. The difference is: import starts from scratch, sync diffs against existing DB state. Reuse `src/lib/` utilities (Node.js compatible) and port the CardTrader API calls from `fetch-prices.ts` patterns.

## Common Pitfalls

### Pitfall 1: Blueprint ID collision across wishlists
**What goes wrong:** Same card (same blueprint_id) can exist in multiple wishlists for the same user. Sync removes a card from wishlist A, but it still exists in wishlist B.
**Why it happens:** The unique constraint is `(wishlist_id, blueprint_id)`, so the same blueprint can exist in different wishlists.
**How to avoid:** Sync operates per-wishlist, not per-user. Only delete cards from the specific wishlist being synced. Never cross-wishlist delete.
**Warning signs:** Cards disappearing from dashboard after sync despite being in another wishlist.

### Pitfall 2: CardTrader API down during sync
**What goes wrong:** Script crashes and no users get synced.
**Why it happens:** No error isolation between users.
**How to avoid:** Wrap each user's sync in try/catch. Log the error, skip that user, continue with others. The next daily run retries naturally.
**Warning signs:** All-or-nothing failures in logs.

### Pitfall 3: GitHub Actions cron delays
**What goes wrong:** Sync runs overlap with fetch-prices because both scheduled close together, or sync runs delayed by 15-60 minutes.
**Why it happens:** GitHub Actions cron is best-effort, not guaranteed. Peak times (midnight UTC) have worse delays.
**How to avoid:** (1) Schedule sync at off-peak time (06:00 UTC). (2) Schedule cleanup at a different time (e.g., 04:00 UTC). (3) Concurrency guards prevent actual overlap. (4) Idempotent logic means delayed runs are harmless.
**Warning signs:** Workflow logs showing queued status for extended periods.

### Pitfall 4: Supabase JS cannot run raw SQL
**What goes wrong:** Developer tries to use `.from('price_snapshots').delete().lt('recorded_at', ...)` but retention_days is per-card, requiring a JOIN.
**Why it happens:** Supabase JS client doesn't support DELETE with JOIN or raw SQL.
**How to avoid:** Create a Postgres function (`cleanup_expired_data()`) in a migration file and call it via `supabase.rpc('cleanup_expired_data')`.
**Warning signs:** Complex workarounds with multiple queries instead of a single SQL statement.

### Pitfall 5: Fetching expansions/blueprints is expensive
**What goes wrong:** Sync script fetches all expansions + blueprints for every expansion even when most cards haven't changed.
**Why it happens:** Import-wishlist always fetches everything because it's a one-time operation.
**How to avoid:** For sync, only fetch blueprints for expansions that have new cards to add. Existing cards only need metadata updates which can come from the wishlist item itself (meta_name) or cached blueprints. However, to update image_url and expansion_name accurately, blueprint fetching is needed. Cache aggressively in ct_blueprints table -- check cache before API call.
**Warning signs:** Sync taking 5+ minutes due to unnecessary API calls.

### Pitfall 6: Forgetting to update wishlists.last_synced_at
**What goes wrong:** No way to track when a wishlist was last synced.
**Why it happens:** Easy to forget the timestamp update after processing.
**How to avoid:** Update `last_synced_at` at the end of each successful wishlist sync.

## Code Examples

### Sync Script: Per-User Processing
```typescript
// Source: Pattern derived from fetch-prices.ts + import-wishlist/index.ts

// 1. Get all users who have wishlists
const { data: wishlists } = await supabase
  .from('wishlists')
  .select('id, user_id, cardtrader_wishlist_id, name');

// 2. Group wishlists by user
const byUser = new Map<string, typeof wishlists>();
for (const wl of wishlists) {
  const list = byUser.get(wl.user_id) ?? [];
  list.push(wl);
  byUser.set(wl.user_id, list);
}

// 3. Process each user
for (const [userId, userWishlists] of byUser) {
  try {
    const { data: apiToken } = await supabase.rpc('get_api_token', {
      target_user_id: userId,
    });
    if (!apiToken) { console.warn(`No token for user ${userId}`); continue; }

    for (const wl of userWishlists) {
      await syncWishlist(supabase, apiToken, wl);
    }
  } catch (err) {
    console.error(`Sync failed for user ${userId}:`, err);
    // Continue with other users
  }
}
```

### Sync Script: Diff Logic for a Single Wishlist
```typescript
async function syncWishlist(supabase, apiToken, wishlist) {
  // Fetch current wishlist from CardTrader
  const ctWishlist = await fetchWishlist(apiToken, wishlist.cardtrader_wishlist_id);

  // Get current DB cards for this wishlist
  const { data: dbCards } = await supabase
    .from('monitored_cards')
    .select('id, blueprint_id, card_name, image_url, expansion_name')
    .eq('wishlist_id', wishlist.id);

  // Build blueprint sets
  const apiBlueprints = new Set(/* resolved blueprint IDs from ctWishlist.items */);
  const dbBlueprints = new Map(dbCards.map(c => [c.blueprint_id, c]));

  // Determine adds, removes, updates
  const toAdd = [...apiBlueprints].filter(id => !dbBlueprints.has(id));
  const toRemove = [...dbBlueprints.keys()].filter(id => !apiBlueprints.has(id));
  const toUpdate = [...apiBlueprints].filter(id => dbBlueprints.has(id));

  // Execute changes...
}
```

### Cleanup Function (Postgres)
```sql
-- Source: Custom for this project
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS TABLE(deleted_snapshots bigint, deleted_notifications bigint) AS $$
DECLARE
  snap_count bigint;
  notif_count bigint;
BEGIN
  DELETE FROM price_snapshots ps
  USING monitored_cards mc
  WHERE ps.monitored_card_id = mc.id
    AND ps.recorded_at < now() - (mc.retention_days || ' days')::interval;
  GET DIAGNOSTICS snap_count = ROW_COUNT;

  DELETE FROM notifications n
  USING monitored_cards mc
  WHERE n.monitored_card_id = mc.id
    AND n.sent_at < now() - (mc.retention_days || ' days')::interval;
  GET DIAGNOSTICS notif_count = ROW_COUNT;

  RETURN QUERY SELECT snap_count, notif_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### GitHub Actions Workflow Template
```yaml
# Source: .github/workflows/fetch-prices.yml (existing pattern)
name: Sync Wishlists

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 06:00 UTC
  workflow_dispatch: {}

concurrency:
  group: sync-wishlists
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: 'npm'
      - run: npm ci
      - run: npx tsx scripts/sync-wishlists.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No concurrency control | GitHub Actions `concurrency` field | GA since 2022 | Built-in overlap prevention, no need for DB locks |
| Application-level cron locks | Workflow-level concurrency groups | 2022+ | Simpler, more reliable |

**Already up-to-date:**
- The existing `fetch-prices.yml` uses `actions/checkout@v5` and `actions/setup-node@v6` -- these are current.
- The project already uses `npx tsx` for running TypeScript -- no change needed.

## DB Schema Analysis

### CASCADE Deletes -- Already in Place
The initial migration (00001) already defines CASCADE on both foreign keys:
- `price_snapshots.monitored_card_id REFERENCES monitored_cards ON DELETE CASCADE`
- `notifications.monitored_card_id REFERENCES monitored_cards ON DELETE CASCADE`
- `monitored_cards.wishlist_id REFERENCES wishlists ON DELETE CASCADE`

**No migration needed for CASCADE.** Hard-deleting a `monitored_card` row will automatically delete all its snapshots and notifications.

### Potential Migration: cleanup_expired_data() function
A new migration (`00004_automation.sql`) should create the `cleanup_expired_data()` Postgres function for the cleanup script to call via RPC.

### Column: wishlists.cardtrader_wishlist_id
Currently typed as `text` in the schema. The import-wishlist Edge Function inserts it as `Number(wishlistId)`. The sync script must use the same type. This works because Postgres will cast the number to text.

## Open Questions

1. **Blueprint resolution for new cards during sync**
   - What we know: Import-wishlist fetches all expansions, then blueprints per expansion, then resolves by collector_number. This is the same flow sync needs for new cards.
   - What's unclear: Whether we should use cached ct_blueprints data or always fetch fresh. Fresh guarantees accuracy but costs API calls.
   - Recommendation: Check ct_blueprints cache first (by collector_number + expansion). Only fetch from API if not cached. This saves API calls for cards whose blueprints were already resolved during import.

2. **Wishlist item to blueprint_id mapping**
   - What we know: Wishlist items have `expansion_code` + `collector_number`. Blueprints are fetched per expansion and keyed by collector_number.
   - What's unclear: Whether the sync diff should compare by `blueprint_id` (resolved) or by `(expansion_code, collector_number)` (raw).
   - Recommendation: Compare by `blueprint_id` since that's the unique constraint in the DB. For new items, resolve to blueprint_id first, then check if it exists in DB.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WISH-04 | Sync diff logic: correctly identifies cards to add, remove, update | unit | `npx vitest run tests/sync-diff.test.ts -t "sync diff"` | No -- Wave 0 |
| WISH-04 | Metadata update preserves user settings | unit | `npx vitest run tests/sync-diff.test.ts -t "metadata"` | No -- Wave 0 |
| PRIC-05 | Cleanup deletes snapshots older than retention_days | unit | `npx vitest run tests/cleanup.test.ts -t "cleanup"` | No -- Wave 0 |
| PRIC-05 | Cleanup deletes notifications older than retention_days | unit | `npx vitest run tests/cleanup.test.ts -t "cleanup"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/sync-diff.test.ts` -- covers WISH-04 sync diff logic (unit-testable pure functions)
- [ ] `tests/cleanup.test.ts` -- covers PRIC-05 cleanup logic (if any pure function logic is extracted)

Note: Most of the sync and cleanup logic involves DB and API calls, making unit tests limited to pure function extraction. The GitHub Actions workflows and DB functions are best validated via manual `workflow_dispatch` runs and checking logs.

## Sources

### Primary (HIGH confidence)
- Project codebase: `scripts/fetch-prices.ts`, `.github/workflows/fetch-prices.yml`, `supabase/functions/import-wishlist/index.ts`, `supabase/migrations/00001_initial_schema.sql`
- [GitHub Actions concurrency docs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

### Secondary (MEDIUM confidence)
- [GitHub Actions cron reliability](https://github.com/orgs/community/discussions/156282) -- cron is best-effort, delays of minutes to hours possible during peak
- [GitHub Actions cron best practices](https://oneuptime.com/blog/post/2025-12-20-scheduled-workflows-cron-github-actions/view)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, follows existing patterns exactly
- Architecture: HIGH - All patterns derived from existing codebase (fetch-prices.ts, import-wishlist)
- Pitfalls: HIGH - Based on actual codebase analysis (CASCADE already present, Supabase JS limitations known)
- DB Schema: HIGH - Verified by reading migration files directly

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- no fast-moving dependencies)
