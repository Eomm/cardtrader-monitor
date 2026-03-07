# Phase 2: Data Pipeline - Research

**Researched:** 2026-03-07
**Domain:** CardTrader API integration, Supabase Edge Functions, GitHub Actions cron jobs
**Confidence:** HIGH

## Summary

This phase implements the full data pipeline: wishlist import via Supabase Edge Function, card resolution with blueprint mapping, baseline pricing from CardTrader marketplace, default notification rules, and an hourly GitHub Actions price-fetch job. The architecture splits into two server-side components -- an Edge Function for user-triggered import (keeps API token server-side) and a Node.js GitHub Actions script for scheduled price fetching (uses service_role key directly).

The existing garcon reference implementation (`/Users/mspigolon/workspace/_experiments/garcon/actions/inspect-cardtrader.js`) provides a proven, working pattern for the exact API call sequence, rate limiting (8 concurrent, 1s delay), and CT Zero filtering logic. The database schema from Phase 1 already has all core tables (`wishlists`, `monitored_cards`, `price_snapshots`) with RLS policies. Schema changes needed are: adding `baseline_price_cents` to `monitored_cards`, creating cache tables for expansions and blueprints, and adding a `retention_days` column.

**Primary recommendation:** Port the garcon API call sequence directly into both the Edge Function (import) and GitHub Actions script (hourly fetch), sharing the CT Zero filter logic and rate-limiting pattern. Use Supabase's pre-populated env vars in the Edge Function; use GitHub Secrets for the Actions job.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- User pastes a CardTrader wishlist URL to trigger import (no browse/select UI)
- Import form lives on Dashboard page, replacing empty state; once cards exist, import moves to secondary location
- Quick inline feedback: progress indicator during import, cards appear in list when done, toast for success/errors
- Partial success model: import all resolvable cards, show summary like "10 of 12 cards imported, 2 skipped"
- Frontend calls a Supabase Edge Function to perform the import (token stays server-side)
- Edge Function handles: fetch wishlist, resolve blueprints, fetch initial prices, insert cards into DB
- Follow proven garcon call order: GET /expansions -> GET /wishlists/{id} -> GET /blueprints/export?expansion_id=X -> GET /marketplace/products?blueprint_id=X&language=Y
- Rate-limited batching: 8 concurrent requests, 1s delay between batches
- Cache expansion and blueprint reference data in Supabase tables
- Baseline price = cheapest marketplace listing matching card filters with CT Zero ON by default
- CT Zero filter: can_sell_via_hub, user_type === 'pro', or can_sell_sealed_with_ct_zero
- Default notification rule: +/-20% threshold from baseline (both directions)
- Prices displayed as current price + percentage change from baseline; green if cheaper, red if more expensive
- Currency: EUR only (CardTrader API returns EUR cents)
- Price change detection uses percentage thresholds only (no absolute cent tolerance)
- GitHub Actions price job: Node.js script, authenticates with service_role key + encryption key as GitHub Secrets
- On CardTrader API failure: log error, continue with remaining cards
- Deduplicates API calls by blueprint_id across all users

### Claude's Discretion
- Database schema changes (baseline_price column, expansion/blueprint cache tables)
- Edge Function implementation details (Deno runtime specifics, error response format)
- Exact rate limiting strategy for GitHub Actions job vs Edge Function import
- Loading/error state UI patterns on Dashboard
- How to extract wishlist ID from pasted URL (regex, URL parsing)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WISH-01 | User can import a wishlist by pasting a CardTrader wishlist URL | Edge Function import flow; URL parsing pattern; Dashboard import form UI |
| WISH-02 | Imported cards include name, expansion, image, game, and collector number | Blueprint API response contains all fields (name, image_url, game_id, fixed_properties.collector_number); expansion name from expansions API |
| WISH-03 | Each imported card gets a default threshold notification rule | Edge Function sets notification_rule jsonb with +/-20% threshold on insert |
| PRIC-01 | Hourly GitHub Actions job fetches current prices for all active monitored cards | GitHub Actions cron workflow calling Node.js script with supabase-js service_role |
| PRIC-02 | Price fetches are deduplicated by blueprint_id across users | Query distinct blueprint_ids from monitored_cards, single marketplace call per blueprint |
| PRIC-03 | Each card stores a baseline price set at import time | baseline_price_cents column added to monitored_cards, set during Edge Function import |
| PRIC-04 | Daily price snapshots are retained for configurable number of days per card | retention_days column on monitored_cards, price_snapshots table with recorded_at index |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.0.0 | DB client (frontend + GitHub Actions) | Already installed; works in both browser and Node.js |
| Deno.serve | Built-in (Deno 2.1) | Edge Function HTTP handler | Supabase Edge Functions standard; no external deps needed |
| GitHub Actions | N/A | Hourly cron job runner | Already used for CI; free tier has 2,000 min/month |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| actions/checkout@v5 | v5 | Checkout repo in Actions | Already used in ci.yml |
| actions/setup-node@v6 | v6 | Setup Node.js in Actions | Already used in ci.yml |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge Function | pg_cron + database function | pg_cron cannot make external HTTP calls to CardTrader API |
| GitHub Actions | Supabase pg_cron + Edge Function invoke | More complex; GH Actions is simpler for scheduled Node.js scripts |

**Installation:**
No new npm packages needed for the frontend. The GitHub Actions script runs `npm ci` which installs `@supabase/supabase-js`. The Edge Function uses Deno's built-in fetch and imports supabase-js via `npm:` specifier.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  functions/
    import-wishlist/
      index.ts           # Edge Function: wishlist import
    _shared/
      cors.ts            # CORS headers
      cardtrader.ts       # CT API helpers (shared between functions)
      supabase-admin.ts   # Admin client factory
  migrations/
    00001_initial_schema.sql    # Existing
    00002_data_pipeline.sql     # New: baseline_price_cents, cache tables, retention_days

scripts/
  fetch-prices.ts        # GitHub Actions price-fetch script (Node.js/TypeScript)

.github/workflows/
  ci.yml                 # Existing
  deploy.yml             # Existing
  fetch-prices.yml       # New: hourly cron workflow

src/
  pages/
    DashboardPage.tsx     # Replace empty state with import form + card list
  components/
    ImportWishlistForm.tsx # URL input + import button
    CardList.tsx           # Renders monitored cards with prices
    CardItem.tsx           # Single card row with price display
```

### Pattern 1: Edge Function Import Flow
**What:** User submits wishlist URL -> frontend invokes Edge Function -> EF fetches from CardTrader API -> inserts into DB -> returns summary
**When to use:** User-triggered import (needs user's encrypted API token)
**Example:**
```typescript
// supabase/functions/import-wishlist/index.ts
// Source: Supabase Edge Functions docs + garcon reference
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    // Create client with user's JWT to respect RLS
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    // Create admin client for decrypting token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { wishlistUrl } = await req.json()
    const wishlistId = extractWishlistId(wishlistUrl)

    // Decrypt user's CardTrader API token
    const { data: tokenRow } = await supabaseAdmin.rpc('decrypt_api_token', {
      user_id: (await supabaseUser.auth.getUser()).data.user!.id
    })

    // ... perform import using garcon call sequence ...

    return new Response(JSON.stringify({ imported: 10, skipped: 2, details: [...] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

### Pattern 2: GitHub Actions Cron Job
**What:** Scheduled Node.js script that fetches prices for all active cards across all users
**When to use:** Hourly price fetching (uses service_role to bypass RLS)
**Example:**
```yaml
# .github/workflows/fetch-prices.yml
name: Fetch Prices
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch: {}    # Manual trigger for testing

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: 'npm'
      - run: npm ci
      - run: npx tsx scripts/fetch-prices.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
```

### Pattern 3: CT Zero Filter (from garcon)
**What:** Filter marketplace products to only CT Zero-eligible sellers
**When to use:** Both import baseline pricing and hourly price fetch
**Example:**
```typescript
// Source: garcon/actions/inspect-cardtrader.js lines 105-113
function filterCtZeroOffers(products: MarketplaceProduct[], cardFilters: CardFilters) {
  return products.filter(item => {
    const conditionMatch = !cardFilters.condition ||
      item.properties_hash.condition === cardFilters.condition
    const languageMatch = item.properties_hash.mtg_language === cardFilters.language
    const isCtZero = item.user.can_sell_sealed_with_ct_zero === true ||
      item.user.user_type === 'pro' ||
      item.user.can_sell_via_hub === true
    return conditionMatch && languageMatch && isCtZero
  })
}
```

### Pattern 4: Rate-Limited Batch Processing (from garcon)
**What:** Process API calls in batches of 8 with 1s delay between batches
**When to use:** All CardTrader API sequences (blueprint fetching, marketplace queries)
**Example:**
```typescript
// Source: garcon/actions/inspect-cardtrader.js lines 128-145
async function processBatches<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize = 8,
  delayMs = 1000
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processFn))
    results.push(...batchResults)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  return results
}
```

### Pattern 5: Wishlist URL Parsing
**What:** Extract wishlist ID from a CardTrader wishlist URL
**When to use:** Import form submission
**Example:**
```typescript
// CardTrader wishlist URLs have the format:
// https://www.cardtrader.com/wishlists/12345
// or possibly: https://www.cardtrader.com/en/wishlists/12345
function extractWishlistId(url: string): string {
  const match = url.match(/cardtrader\.com\/(?:\w{2}\/)?wishlists\/(\d+)/)
  if (!match) throw new Error('Invalid CardTrader wishlist URL')
  return match[1]
}
```

### Anti-Patterns to Avoid
- **Exposing CardTrader API token to browser:** Never send the token to the frontend; always decrypt server-side in Edge Function or GitHub Actions
- **Sequential API calls when batching is possible:** Always use the batch-with-delay pattern for marketplace product fetches
- **Fetching blueprints per card instead of per expansion:** The API returns all blueprints for an expansion at once; group cards by expansion first
- **Storing prices as floats:** Always use integer cents to avoid floating-point precision issues
- **Making separate marketplace calls for cards sharing the same blueprint_id:** Deduplicate by blueprint_id first

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS handling | Custom CORS middleware | Supabase's corsHeaders pattern | Standard pattern, handles preflight correctly |
| Token decryption | Custom crypto | pgcrypto pgp_sym_decrypt via SQL function | Already established in Phase 1 with encryption_key |
| Cron scheduling | Custom timer/polling | GitHub Actions cron | Reliable, free tier, logs included |
| Rate limiting | Custom token bucket | Simple batch-with-delay (garcon pattern) | CardTrader rate limit is 10 req/s for marketplace; 8-batch with 1s delay stays well under |
| Date/time manipulation | Manual date math | Built-in Date + simple arithmetic | Retention days comparison is straightforward subtraction |

**Key insight:** The garcon reference implementation already solves the hardest problems (API call sequence, CT Zero filtering, rate limiting). Port it rather than redesigning.

## Common Pitfalls

### Pitfall 1: Edge Function Timeout
**What goes wrong:** CardTrader API calls during import can take 30+ seconds for large wishlists (many expansions = many blueprint export calls)
**Why it happens:** Supabase Edge Functions have a default timeout of ~60 seconds (can be extended to 150s on paid plans)
**How to avoid:** Pre-cache expansion and blueprint data in Supabase tables. On import, check cache first; only fetch from CardTrader what is missing. For very large wishlists, consider using `EdgeRuntime.waitUntil()` to continue processing after returning an initial response.
**Warning signs:** Import hangs or returns 504 for wishlists with 20+ unique expansions

### Pitfall 2: No Offers Sentinel Value
**What goes wrong:** When no marketplace offers exist for a card, the garcon script sets price to 32600 cents (a high sentinel value)
**Why it happens:** Need to distinguish "no offers found" from "cheapest price is X"
**How to avoid:** Use `null` for baseline_price_cents when no offers exist, and display "No offers" in the UI rather than a fake price. Store the sentinel concept in application logic, not the database.
**Warning signs:** Cards showing EUR 326.00 when they should show "No offers available"

### Pitfall 3: Marketplace Products Response Structure
**What goes wrong:** The marketplace products endpoint returns a JSON object keyed by blueprint_id (as string), not an array
**Why it happens:** API returns `{ "12345": [...products] }` where the key is the blueprint_id
**How to avoid:** Access via `response[blueprintId]` not `response.products` or similar. Check for empty/missing key when no products exist.
**Warning signs:** Getting undefined when trying to read products

### Pitfall 4: Wishlist Item foil Field is String "false" Not Boolean
**What goes wrong:** Condition/filter matching fails because foil comes as string "false" not boolean false
**Why it happens:** CardTrader wishlist API returns `"foil": "false"` (string) while marketplace returns `"mtg_foil": false` (boolean)
**How to avoid:** Normalize the foil value during import: `foil === "true"` or `foil === true`
**Warning signs:** Foil filter never matches; all foil cards filtered out or included incorrectly

### Pitfall 5: Edge Function Cannot Access `auth.uid()` Directly
**What goes wrong:** Trying to use SQL functions that reference `auth.uid()` from the admin client
**Why it happens:** Service role client bypasses RLS and auth context
**How to avoid:** For token decryption, create a dedicated SQL function that takes user_id as parameter and is SECURITY DEFINER. Or pass the user's JWT to create a user-scoped client for RLS operations, and the admin client only for decryption.
**Warning signs:** "auth.uid() is null" errors in Edge Function logs

### Pitfall 6: GitHub Actions Minutes Budget
**What goes wrong:** Hourly job burns through GitHub Actions free tier minutes (2,000/month)
**Why it happens:** 24 runs/day x 30 days = 720 runs/month; if each takes 2-3 minutes that is 1,440-2,160 minutes
**How to avoid:** Keep the script fast by deduplicating API calls. Consider reducing to every 2 hours if budget is tight. The script should exit early if no active cards exist.
**Warning signs:** GitHub sends email about approaching minutes limit

## Code Examples

### Schema Migration for Phase 2
```sql
-- Source: Derived from existing schema + CONTEXT.md decisions

-- Add baseline price and retention to monitored_cards
ALTER TABLE public.monitored_cards
  ADD COLUMN baseline_price_cents int,
  ADD COLUMN retention_days int NOT NULL DEFAULT 30;

-- Expansion cache table (data changes rarely)
CREATE TABLE public.ct_expansions (
  id int PRIMARY KEY,
  game_id int NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Blueprint cache table (data changes rarely)
CREATE TABLE public.ct_blueprints (
  id int PRIMARY KEY,
  expansion_id int NOT NULL REFERENCES public.ct_expansions(id),
  name text NOT NULL,
  game_id int,
  collector_number text,
  image_url text,
  scryfall_id text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ct_blueprints_expansion_id ON public.ct_blueprints(expansion_id);
CREATE INDEX idx_ct_blueprints_collector_number ON public.ct_blueprints(expansion_id, collector_number);

-- Token decryption function for Edge Function use
CREATE OR REPLACE FUNCTION public.decrypt_api_token(target_user_id uuid)
RETURNS text AS $$
DECLARE
  decrypted text;
BEGIN
  SELECT pgp_sym_decrypt(
    cardtrader_api_token::bytea,
    current_setting('app.settings.encryption_key')
  ) INTO decrypted
  FROM public.profiles
  WHERE id = target_user_id
    AND cardtrader_api_token IS NOT NULL;

  RETURN decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: cache tables are public-read (reference data)
ALTER TABLE public.ct_expansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY ct_expansions_select ON public.ct_expansions
  FOR SELECT USING (true);

CREATE POLICY ct_blueprints_select ON public.ct_blueprints
  FOR SELECT USING (true);
```

### Frontend: Invoking Edge Function
```typescript
// Source: Supabase JS client docs
import { supabase } from '../lib/supabase'

async function importWishlist(wishlistUrl: string) {
  const { data, error } = await supabase.functions.invoke('import-wishlist', {
    body: { wishlistUrl },
  })

  if (error) throw error
  return data // { imported: number, skipped: number, details: [...] }
}
```

### GitHub Actions: Price Fetch Script Structure
```typescript
// scripts/fetch-prices.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 1. Query all distinct blueprint_ids from active monitored_cards
// 2. For each user with cards, decrypt their API token
// 3. Group cards by blueprint_id to deduplicate API calls
// 4. Fetch marketplace products in rate-limited batches
// 5. For each card, find cheapest matching offer (CT Zero filter)
// 6. Insert price_snapshot rows
// 7. Log summary
```

### Default Notification Rule Structure
```typescript
// notification_rule JSONB stored on monitored_cards
interface NotificationRule {
  type: 'threshold'
  threshold_percent: number  // 20 means +/-20%
  direction: 'both'          // 'up' | 'down' | 'both'
  enabled: boolean
}

// Default on import:
const defaultRule: NotificationRule = {
  type: 'threshold',
  threshold_percent: 20,
  direction: 'both',
  enabled: true,
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deno 1.x in Edge Functions | Deno 2.1 | Late 2024 | Use `npm:` specifiers for packages; Node built-ins via `node:` |
| `esm.sh` imports | `npm:` prefixed imports | Deno 2.0 | Simpler dependency management in Edge Functions |
| Custom CORS headers | `@supabase/supabase-js/cors` import | supabase-js v2.95+ | Cleaner, but manual headers still work fine |

**Deprecated/outdated:**
- `deno.land/x` imports: Prefer `npm:` or `jsr:` specifiers
- `esm.sh` CDN imports: Use `npm:` instead

## Open Questions

1. **CardTrader API token scope per user in multi-user price fetch**
   - What we know: Each user has their own encrypted API token. The hourly job fetches prices for all users.
   - What's unclear: Should we use one user's token for shared blueprint lookups, or rotate tokens? All users likely have the same API access level.
   - Recommendation: Use the first available token for marketplace queries since products/prices are the same regardless of which authenticated user queries. Document this assumption.

2. **Edge Function timeout for very large wishlists**
   - What we know: Default timeout ~60s, can extend to 150s on paid plans
   - What's unclear: How many expansion + blueprint calls a typical wishlist generates
   - Recommendation: Cache expansions and blueprints aggressively. If still too slow, return early with a "processing" status and use `EdgeRuntime.waitUntil()` for background completion.

3. **Handling the "no offers" case for baseline price**
   - What we know: Garcon uses 32600 cents as sentinel. CONTEXT.md does not specify.
   - What's unclear: Should baseline be null when no offers exist?
   - Recommendation: Use `null` for baseline_price_cents when no offers found. Display "No offers" in UI. When offers appear later, set baseline to first seen price.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected -- project has no test setup yet |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WISH-01 | Extract wishlist ID from URL variants | unit | `npx vitest run tests/url-parser.test.ts -t "wishlist URL"` | No -- Wave 0 |
| WISH-02 | Map blueprint API response to monitored_card fields | unit | `npx vitest run tests/card-mapper.test.ts` | No -- Wave 0 |
| WISH-03 | Default notification rule creation | unit | `npx vitest run tests/notification-rule.test.ts` | No -- Wave 0 |
| PRIC-01 | Price fetch script runs and writes snapshots | integration | Manual -- requires Supabase + CardTrader credentials | No |
| PRIC-02 | Deduplication of blueprint_ids | unit | `npx vitest run tests/dedup.test.ts` | No -- Wave 0 |
| PRIC-03 | Baseline price set from cheapest CT Zero offer | unit | `npx vitest run tests/price-filter.test.ts` | No -- Wave 0 |
| PRIC-04 | Retention days default and snapshot storage | unit | `npx vitest run tests/retention.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Install vitest: `npm install -D vitest`
- [ ] `vitest.config.ts` -- Vitest configuration
- [ ] `tests/url-parser.test.ts` -- covers WISH-01
- [ ] `tests/card-mapper.test.ts` -- covers WISH-02
- [ ] `tests/notification-rule.test.ts` -- covers WISH-03
- [ ] `tests/price-filter.test.ts` -- covers PRIC-03, CT Zero filter logic
- [ ] `tests/dedup.test.ts` -- covers PRIC-02, blueprint deduplication

## Sources

### Primary (HIGH confidence)
- `.agents/skills/cardtrader-api/SKILL.md` -- Full API reference with endpoints, rate limits, response formats
- `.agents/skills/cardtrader-api/examples/` -- Response examples for wishlists, marketplace, blueprints, expansions
- `/Users/mspigolon/workspace/_experiments/garcon/actions/inspect-cardtrader.js` -- Proven reference implementation with exact API sequence, CT Zero filter, rate limiting
- `supabase/migrations/00001_initial_schema.sql` -- Existing DB schema with all tables and RLS policies

### Secondary (MEDIUM confidence)
- [Supabase Edge Functions Quickstart](https://supabase.com/docs/guides/functions/quickstart) -- Function creation, Deno.serve pattern
- [Supabase Edge Functions AI Prompt Guide](https://supabase.com/docs/guides/getting-started/ai-prompts/edge-functions) -- Best practices, pre-populated env vars, npm: specifiers
- [Supabase Edge Functions CORS](https://supabase.com/docs/guides/functions/cors) -- CORS headers pattern
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) -- Timeout limits, EdgeRuntime.waitUntil

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or existing code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; uses existing supabase-js, Deno built-ins, and GitHub Actions already in project
- Architecture: HIGH -- garcon reference provides proven API call sequence; existing schema covers most needs
- Pitfalls: HIGH -- derived from actual garcon code analysis and CardTrader API response inspection
- Validation: MEDIUM -- vitest is standard for Vite projects but not yet installed; test patterns are straightforward

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable domain -- CardTrader API and Supabase Edge Functions are mature)
