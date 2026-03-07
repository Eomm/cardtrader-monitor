# Architecture Patterns

**Domain:** Trading card price monitoring (Supabase + GitHub Pages + GitHub Actions)
**Researched:** 2026-03-07

## Recommended Architecture

The system has four distinct layers with clear boundaries. The key architectural insight is that **GitHub Actions jobs are the engine** (they do the heavy lifting of price fetching, rule evaluation, and notification dispatch), while **Edge Functions are thin API adapters** (they handle user-initiated actions that need auth context), and the **frontend is a static read-heavy dashboard** that talks directly to Supabase for reads and through Edge Functions for writes.

```
+-------------------+       +------------------------+       +------------------+
|  GitHub Pages     |       |  Supabase              |       |  External APIs   |
|  (React SPA)      |       |                        |       |                  |
|                   |  RLS  |  PostgreSQL             |       |  CardTrader API  |
|  - Dashboard      |<----->|  - profiles             |       |  Telegram API    |
|  - Card details   |       |  - wishlists            |       |                  |
|  - Settings       |       |  - monitored_cards      |       +--------+---------+
|                   |       |  - price_snapshots      |                |
+-------------------+       |  - notifications        |                |
        |                   |                        |                |
        | invoke            |  Edge Functions         |                |
        +------------------>|  - import-wishlist      |                |
                            |  - telegram-webhook     |                |
                            |  - update-card-rules    |                |
                            |  - reset-baseline       |                |
                            +--------+---------------+                |
                                     |                                |
                            +--------+---------------+                |
                            |  GitHub Actions         |                |
                            |  (Service Role Key)     |<---------------+
                            |                        |
                            |  - hourly-price-check  |
                            |  - daily-wishlist-sync  |
                            |  - daily-cleanup        |
                            +------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Auth Model |
|-----------|---------------|-------------------|------------|
| **React SPA** | UI rendering, client-side state, direct DB reads via Supabase client | Supabase (Postgres via RLS, Edge Functions, Auth) | Supabase anon key + user JWT |
| **Supabase Auth** | Google OAuth, JWT issuance, session management | React SPA, Edge Functions | Google OAuth provider |
| **Supabase Postgres** | All persistent state, RLS enforcement, data integrity | All components | RLS for frontend, service role for jobs |
| **Edge Functions** | User-initiated mutations requiring server logic (API calls to CardTrader, webhook handling) | Supabase Postgres, CardTrader API, Telegram API | User JWT (validated) or webhook secret |
| **GitHub Actions Jobs** | Scheduled background work: price fetching, rule evaluation, notifications, cleanup | Supabase Postgres (service role), CardTrader API, Telegram API | Service role key (bypasses RLS) |
| **CardTrader API** | Source of truth for wishlist contents and marketplace prices | Edge Functions, GitHub Actions | User's API token (stored encrypted in DB) |
| **Telegram Bot API** | Notification delivery channel | Edge Functions (webhook), GitHub Actions (send messages) | Bot token |

### Data Flow

**Read path (frontend):** React SPA --> Supabase client (anon key + JWT) --> Postgres (RLS filters to user's data). No Edge Function involved. This is the most common path -- dashboard loads, card detail views, price history. TanStack Query caches these reads client-side.

**Write path (user actions):** React SPA --> Edge Function (with JWT) --> Postgres (service role inside function). Used for: importing wishlists (needs CardTrader API call), updating card rules, resetting baselines.

**Background path (scheduled):** GitHub Actions cron --> Node.js script --> Supabase client (service role key, bypasses RLS) --> Postgres. Also calls CardTrader API and Telegram API. This path handles: price fetching, rule evaluation, notification dispatch, data cleanup.

**Webhook path (inbound):** Telegram --> Edge Function (telegram-webhook) --> Postgres. Validates webhook secret, links Telegram chat ID to user profile.

## Updated Data Model (Baseline + Daily Snapshots)

The original design doc uses a "keep latest 3 snapshots" model. PROJECT.md specifies a reworked model with baselines and daily snapshots. Here is the updated schema architecture.

### Core Schema Changes

#### `monitored_cards` -- Add baseline columns

```sql
CREATE TABLE public.monitored_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  blueprint_id bigint NOT NULL,
  card_name text NOT NULL,
  expansion_name text NOT NULL,
  game_id int NOT NULL,
  collector_number text,
  image_url text,

  -- Baseline price tracking (NEW)
  baseline_price_cents int,           -- Set on import, resettable by user
  baseline_set_at timestamptz,        -- When baseline was last set/reset

  -- Notification rules (UPDATED structure)
  threshold_rule jsonb,               -- {enabled: true, direction: 'drop'|'rise'|'both', percent: 10}
  stability_rule jsonb,               -- {enabled: true, range_percent: 5, days: 7}

  -- Card filters
  only_zero boolean DEFAULT true,
  condition_required text,
  language_required text,
  foil_required boolean,
  reverse_required boolean,
  first_edition_required boolean,

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key design decisions:**
- **Baseline on the card row, not a separate table.** There is exactly one baseline per card. No join needed for the most common query (compare current price to baseline).
- **Split `notification_rule` JSONB into `threshold_rule` and `stability_rule`.** A card can have both rule types active simultaneously. Separate columns make queries and validation cleaner than a polymorphic JSONB blob.
- **`baseline_price_cents` is nullable.** Null means "not yet set" (card just imported, first price check hasn't run). The import flow sets this from the first successful price fetch, not from the wishlist import itself (wishlist data doesn't include prices).

#### `price_snapshots` -- Daily granularity, retention window

```sql
CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_card_id uuid NOT NULL REFERENCES public.monitored_cards(id) ON DELETE CASCADE,
  price_cents int,                    -- NULL if no listings found
  snapshot_date date NOT NULL,        -- One per card per day
  recorded_at timestamptz DEFAULT now(),
  listing_count int,                  -- How many matching listings existed
  cheapest_listings jsonb,            -- Top 3-5 cheapest matching products (minimal data)
  UNIQUE(monitored_card_id, snapshot_date)
);

CREATE INDEX idx_snapshots_card_date
  ON public.price_snapshots(monitored_card_id, snapshot_date DESC);
```

**Key design decisions:**
- **`snapshot_date` (date, not timestamp) with UNIQUE constraint.** Enforces one snapshot per card per day at the database level. Hourly price checks UPDATE the existing row for today (upsert pattern) rather than inserting new rows each hour. This keeps storage predictable.
- **Upsert pattern for hourly checks:** `INSERT ... ON CONFLICT (monitored_card_id, snapshot_date) DO UPDATE SET price_cents = EXCLUDED.price_cents, recorded_at = now(), ...`. The latest hourly check "wins" as today's snapshot. This means today's snapshot always reflects the most recent price.
- **Retention via date arithmetic:** `DELETE FROM price_snapshots WHERE snapshot_date < CURRENT_DATE - INTERVAL 'N days'`. Much simpler than the ROW_NUMBER cleanup in the original design.
- **`listing_count` as a first-class column.** Useful for "no listings found" notifications and stability analysis without parsing JSONB.

#### `notifications` -- Add baseline reference

```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_card_id uuid NOT NULL REFERENCES public.monitored_cards(id) ON DELETE CASCADE,
  notification_type text NOT NULL,    -- 'threshold_drop', 'threshold_rise', 'stability', 'listing_appeared'
  baseline_price_cents int,           -- Baseline at time of notification (for historical context)
  current_price_cents int,
  percent_change numeric(5,2),        -- Computed at notification time
  sent_at timestamptz DEFAULT now(),
  telegram_message_id text,
  -- For "reset baseline" deep link
  reset_token text UNIQUE             -- One-time token for resetting baseline from Telegram
);
```

**Key design decisions:**
- **Store `baseline_price_cents` on the notification row.** The user might reset their baseline later; the notification should still show what the baseline was when it fired.
- **`reset_token` for Telegram deep links.** When a threshold notification fires, include a "Reset baseline to current price" link in the Telegram message. The link hits an Edge Function with the token, which updates `monitored_cards.baseline_price_cents`. Single-use, no auth required (the token IS the auth).
- **`percent_change` stored, not computed at read time.** Avoids recalculation and provides exact historical record.

### Notification Evaluation Logic

This is the core algorithm, running in the GitHub Actions hourly job.

#### Threshold Alerts

```
For each card with threshold_rule.enabled = true:
  1. Get current_price from today's snapshot
  2. Get baseline_price from monitored_cards.baseline_price_cents
  3. If baseline is NULL, skip (no reference point yet)
  4. percent_change = ((current_price - baseline_price) / baseline_price) * 100
  5. Check direction:
     - 'drop': trigger if percent_change <= -threshold_percent
     - 'rise': trigger if percent_change >= +threshold_percent
     - 'both': trigger if abs(percent_change) >= threshold_percent
  6. Check cooldown: don't re-notify if same type notification sent in last 24h
  7. If triggered: send Telegram, insert notification, generate reset_token
```

**Cooldown is critical.** Without it, every hourly check would re-fire the same notification. The cooldown check is: `SELECT 1 FROM notifications WHERE monitored_card_id = ? AND notification_type = ? AND sent_at > now() - interval '24 hours'`.

#### Stability Alerts

```
For each card with stability_rule.enabled = true:
  1. Get last N snapshots (where N = stability_rule.days)
  2. If fewer than N snapshots exist, skip
  3. Compute: all prices within range_percent of each other?
     - Method: (max_price - min_price) / min_price * 100 <= range_percent
  4. If stable AND no stability notification in last N days: trigger
```

**Stability is evaluated daily, not hourly.** Even though price checks run hourly, stability by definition requires multi-day data. The job should only evaluate stability rules once per day (check if today's stability evaluation already ran).

#### First Listing Alert

```
For each card where previous snapshot had NULL price and current has a price:
  - Send "Card X now has listings starting at Y" notification
  - Set baseline_price_cents if it was NULL
```

### Baseline Management

Baselines can be set/reset in three ways:

1. **Auto-set on first price fetch.** During hourly job, if `baseline_price_cents IS NULL` and a valid price is found, set it.
2. **Manual reset from UI.** Edge Function `reset-baseline` accepts card_id and optional price (defaults to latest snapshot price).
3. **Reset from Telegram notification link.** One-click "reset to current price" using `reset_token`. Edge Function validates token, updates baseline, clears token.

## Edge Function Organization

Use Supabase's recommended pattern: one function per endpoint, shared code in a `_shared` directory.

```
/supabase
  /functions
    /_shared
      cors.ts              -- CORS headers helper
      supabase-client.ts   -- Creates authenticated Supabase client from request
      cardtrader-api.ts    -- CardTrader API client (used by import-wishlist)
      telegram.ts          -- Telegram message formatting and sending
      validation.ts        -- Input validation helpers
    /import-wishlist
      index.ts             -- POST: Import wishlist from CardTrader
    /update-card-rules
      index.ts             -- PATCH: Update threshold/stability rules
    /reset-baseline
      index.ts             -- POST: Reset baseline price (from UI or Telegram link)
    /telegram-webhook
      index.ts             -- POST: Telegram bot webhook handler
```

**Pattern: Each Edge Function is a thin handler.** Extract JWT, validate input, call Supabase, return response. Business logic that involves multiple external API calls (like importing a wishlist) still lives here because it needs the user's auth context and their encrypted API token.

**Pattern: `_shared` for cross-cutting concerns.** Supabase Edge Functions support importing from `_shared` directory. This avoids code duplication for CORS, auth extraction, and API clients.

**CORS handling:** Every Edge Function needs CORS headers for GitHub Pages origin. Use a shared helper:

```typescript
// _shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://<username>.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

## GitHub Actions Job Architecture

### Job Structure

```
/jobs
  /src
    /lib
      supabase.ts          -- Supabase client with service role key
      cardtrader.ts         -- CardTrader API client with rate limiting
      telegram.ts           -- Telegram message sending
      filters.ts            -- Product filtering (condition, language, foil, etc.)
      rules.ts              -- Notification rule evaluation engine
      logger.ts             -- Structured logging for GitHub Actions
    /tasks
      fetch-prices.ts       -- Fetch prices from CardTrader, upsert snapshots
      evaluate-thresholds.ts -- Run threshold rules, send notifications
      evaluate-stability.ts  -- Run stability rules, send notifications
      sync-wishlists.ts     -- Sync wishlist contents
      cleanup-snapshots.ts  -- Delete old snapshots beyond retention window
    price-check.ts          -- Orchestrator: fetch-prices -> evaluate-thresholds
    wishlist-sync.ts        -- Orchestrator: sync-wishlists
    daily-maintenance.ts    -- Orchestrator: evaluate-stability -> cleanup-snapshots
  package.json
  tsconfig.json
```

**Pattern: Separate orchestrators from tasks.** Each task is a pure function that takes a Supabase client and does one thing. Orchestrators compose tasks in sequence. This makes testing trivial and allows recomposition.

### Three Workflows, Not Two

The original design has two workflows (hourly price check, daily sync). The updated model needs three:

1. **Hourly Price Check** (`price-check.yml`, `0 * * * *`)
   - Fetch prices for all active cards (grouped by blueprint_id)
   - Upsert today's snapshot
   - Evaluate threshold rules
   - Send threshold notifications
   - **Budget: ~1-2 min per run, ~720-1440 min/month**

2. **Daily Wishlist Sync** (`wishlist-sync.yml`, `0 6 * * *`)
   - Sync all wishlists from CardTrader
   - Add new cards, deactivate removed cards
   - Set baseline for newly added cards (if price available)
   - **Budget: ~3-5 min per run, ~90-150 min/month**

3. **Daily Maintenance** (`daily-maintenance.yml`, `0 1 * * *`)
   - Evaluate stability rules (requires multi-day data)
   - Clean up snapshots older than retention window
   - Clean up old notifications (archive after 90 days)
   - Clean up expired/used reset tokens
   - **Budget: ~1-2 min per run, ~30-60 min/month**
   - **Total budget: ~840-1650 min/month (within 2000 min limit)**

**Why separate stability from hourly?** Stability evaluation queries N days of snapshots per card. Running it hourly wastes compute (result won't change within a day) and adds unnecessary DB load. Running it once daily at a different time than the sync avoids job collision.

### Rate Limiting Strategy for CardTrader API

The CardTrader API has two limits: 200 req/10s general, 10 req/s marketplace. The hourly price check hits the marketplace endpoint.

```typescript
// lib/cardtrader.ts - Rate-limited client
class CardTraderClient {
  private requestTimestamps: number[] = [];

  async getMarketplaceProducts(blueprintId: number, apiToken: string): Promise<Product[]> {
    await this.waitForRateLimit(); // Enforce max 8 req/s (buffer under 10/s limit)
    // ... fetch
  }

  private async waitForRateLimit() {
    // Sliding window: if 8+ requests in last second, wait
  }
}
```

**Group by blueprint_id.** Multiple users watching the same card should result in ONE API call, not one per user. The hourly job should:
1. Query all active cards with their filters
2. Group by blueprint_id
3. Fetch marketplace data once per blueprint
4. Apply per-card filters in memory
5. Upsert snapshots per card

### API Token Handling in Jobs

GitHub Actions jobs use the **service role key** to access all user data (bypasses RLS). To call CardTrader, they need each user's encrypted API token.

**Pattern: Decrypt in a Postgres function, not in application code.**

```sql
CREATE OR REPLACE FUNCTION get_active_cards_with_tokens()
RETURNS TABLE (
  card_id uuid,
  blueprint_id bigint,
  user_id uuid,
  api_token text,  -- decrypted
  -- ... other fields
)
SECURITY DEFINER
AS $$
  SELECT
    mc.id, mc.blueprint_id, p.id,
    pgp_sym_decrypt(p.cardtrader_api_token::bytea, current_setting('app.encryption_key')),
    ...
  FROM monitored_cards mc
  JOIN wishlists w ON mc.wishlist_id = w.id
  JOIN profiles p ON w.user_id = p.id
  WHERE mc.is_active = true
    AND p.cardtrader_api_token IS NOT NULL;
$$ LANGUAGE sql;
```

This keeps the encryption key as a Supabase server-side setting, never exposed to GitHub Actions. The service role key can call this function, but the actual encryption key stays in Supabase config.

## Frontend-Backend Communication Patterns

### Direct Supabase Client (Reads)

The React SPA uses `@supabase/supabase-js` with the anon key for all reads. RLS ensures users only see their own data.

```typescript
// Reads go directly to Postgres, no Edge Function needed
const { data: cards } = await supabase
  .from('monitored_cards')
  .select(`
    *,
    wishlists!inner(user_id),
    price_snapshots(price_cents, snapshot_date)
  `)
  .eq('wishlists.user_id', user.id)
  .eq('is_active', true)
  .order('snapshot_date', { referencedTable: 'price_snapshots', ascending: false });
```

**TanStack Query wraps all reads.** Stale time of 5 minutes for dashboard data (prices only update hourly anyway). Infinite stale time for card metadata (changes only on sync).

### Edge Function Invocation (Writes)

Writes that need server-side logic go through Edge Functions:

```typescript
// Writes go through Edge Functions
const { data, error } = await supabase.functions.invoke('import-wishlist', {
  body: { wishlist_url: 'https://www.cardtrader.com/wishlists/123456' }
});
```

**Simple writes can use direct Supabase client with RLS.** Updating card rules doesn't strictly need an Edge Function -- RLS can allow users to update their own cards. Use an Edge Function only if you need:
- Server-side validation beyond what CHECK constraints provide
- External API calls (CardTrader, Telegram)
- Multi-table transactions

**Recommendation: Start with direct Supabase writes for simple CRUD, add Edge Functions only where needed.** This reduces Edge Function invocation count and latency.

### Real-time Subscriptions (Optional, Low Priority)

Supabase supports real-time subscriptions on Postgres changes. For this app, it's not needed initially (prices update hourly, users don't need instant UI updates). But it could be added later for:
- Showing "sync in progress" status when wishlist import completes
- Updating dashboard when a background job finishes

## Patterns to Follow

### Pattern 1: Upsert for Daily Snapshots
**What:** Use `INSERT ... ON CONFLICT DO UPDATE` for price snapshots instead of insert-then-cleanup.
**When:** Every hourly price check.
**Why:** Eliminates the need for complex ROW_NUMBER cleanup queries. Storage stays bounded by design (one row per card per day). The UNIQUE constraint on `(monitored_card_id, snapshot_date)` enforces this.

### Pattern 2: Notification Cooldown via Query
**What:** Check for recent notifications before sending, using a simple time-window query.
**When:** Every threshold evaluation.
**Why:** Without cooldowns, the same notification fires every hour. The cooldown should be per-card, per-notification-type. A 24-hour cooldown for threshold alerts and N-day cooldown for stability alerts (matching the stability window) prevents spam while ensuring users don't miss genuine new movements.

### Pattern 3: One-Time Tokens for Telegram Actions
**What:** Generate UUID tokens stored in the notifications table, embedded in Telegram message URLs.
**When:** Threshold notifications that include a "reset baseline" action.
**Why:** Users clicking a link in Telegram shouldn't need to log in. The token IS the authorization. Edge Function validates the token exists, performs the action, deletes the token. Expiry: 7 days or one use, whichever comes first.

### Pattern 4: Blueprint-Level Deduplication
**What:** Group all monitored cards by blueprint_id before calling CardTrader API.
**When:** Hourly price check.
**Why:** If 5 users all monitor the same card, that's 1 API call, not 5. Apply per-user filters in memory after fetching. This is the single most important optimization for staying within GitHub Actions time limits.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Edge Functions for Background Work
**What:** Using Supabase Edge Functions for scheduled or long-running tasks.
**Why bad:** Edge Functions have a 150-second timeout on free tier. Price checking for hundreds of cards could exceed this. GitHub Actions has 6-hour timeout and is the right tool for batch processing.
**Instead:** Keep Edge Functions for request/response user interactions. Use GitHub Actions for batch operations.

### Anti-Pattern 2: Storing Full Marketplace Responses
**What:** Saving the complete CardTrader API response in `marketplace_data` JSONB.
**Why bad:** Each marketplace response can be large (25 products with full metadata). At 500 cards with 30 days of snapshots, this balloons storage.
**Instead:** Store only the top 3-5 cheapest matching listings with minimal fields (price, seller, condition). Or store just `listing_count` and the cheapest price as scalar columns.

### Anti-Pattern 3: Frontend Polling for Job Status
**What:** Having the frontend poll an endpoint to check if a background job completed.
**Why bad:** Unnecessary Edge Function invocations, poor UX (either polls too often or shows stale data).
**Instead:** Use TanStack Query's `refetchInterval` with a reasonable cadence (5 min), or accept that data is "eventually consistent" -- the hourly job updates data, and the next page load shows it.

### Anti-Pattern 4: Per-User API Calls in Hourly Job
**What:** Iterating users, then iterating each user's cards, making one API call per card.
**Why bad:** N users x M cards = N*M API calls. Hits rate limits, wastes GitHub Actions minutes.
**Instead:** Deduplicate by blueprint_id across all users, fetch once, fan out results to each user's cards in memory.

## Scalability Considerations

| Concern | At 5 users (launch) | At 50 users | At 200 users |
|---------|---------------------|-------------|--------------|
| **Cards monitored** | ~50 | ~500 | ~2000 |
| **Unique blueprints** | ~45 (low overlap) | ~350 (some overlap) | ~1000 (more overlap) |
| **Hourly job duration** | ~15 sec | ~2 min | ~8 min |
| **Daily snapshots storage** | ~50 KB/day | ~500 KB/day | ~2 MB/day |
| **Monthly GH Actions** | ~100 min | ~1000 min | ~4000 min (OVER LIMIT) |
| **Mitigation at scale** | None needed | Monitor job duration | Reduce frequency to every 2h, or move to Supabase pg_cron |

**The scaling wall is GitHub Actions at ~150 users / ~1500 cards.** Beyond that, either reduce check frequency or migrate the price check to a different scheduler (Supabase pg_cron + pg_net for HTTP calls, or a free-tier cloud scheduler).

## Suggested Build Order

Based on component dependencies:

```
Phase 1: Foundation
  Database schema (all tables) --> needed by everything
  Supabase Auth (Google OAuth) --> needed by frontend and Edge Functions
  React SPA scaffold + auth flow --> needed for all user interactions
  GitHub Pages deployment workflow --> needed to see anything

Phase 2: Core Data Pipeline
  CardTrader API client (shared lib) --> needed by import and price check
  import-wishlist Edge Function --> first way to get data in
  Wishlist/card management UI --> see what you imported
  Hourly price check job (fetch + upsert only, no notifications yet)
    --> validates the entire data pipeline end-to-end

Phase 3: Notification System
  Telegram bot setup + webhook Edge Function --> notification channel
  Telegram connection UI flow --> users link their accounts
  Threshold evaluation logic in price check job --> first notifications
  Stability evaluation in daily maintenance job --> second notification type
  Baseline reset (UI + Telegram deep link) --> close the loop

Phase 4: Operations
  Daily wishlist sync job --> keep data fresh
  Snapshot cleanup job --> keep storage bounded
  Notification history UI --> users see what was sent
  Error handling, logging, monitoring --> production readiness
```

**Critical dependency chain:** Schema -> Auth -> Import -> Price Check -> Notifications. Each phase validates the previous one's data model. Do not build notifications before you have real price data flowing through snapshots.

## Sources

- Supabase documentation (Edge Functions, RLS, Auth) -- from training data, MEDIUM confidence
- PostgreSQL documentation (upsert, date types, pgcrypto) -- from training data, HIGH confidence
- GitHub Actions documentation (cron scheduling, minutes limits) -- from training data, HIGH confidence
- Project design doc at `docs/plans/2026-02-01-cardtrader-monitor-design.md` -- primary source
- Project requirements at `.planning/PROJECT.md` -- primary source
