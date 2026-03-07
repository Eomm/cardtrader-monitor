# Phase 2: Data Pipeline - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can import their CardTrader wishlist by pasting a URL, see imported cards with live prices, and have those prices fetched hourly via GitHub Actions. Includes wishlist import via Edge Function, blueprint resolution, baseline pricing, default notification rules, and hourly price snapshot storage.

</domain>

<decisions>
## Implementation Decisions

### Wishlist import flow
- User pastes a CardTrader wishlist URL to trigger import (no browse/select UI)
- Import form lives on the Dashboard page, replacing the empty state. Once cards exist, import moves to a secondary location (button or menu)
- Quick inline feedback: progress indicator during import, cards appear in list when done, toast for success/errors
- Partial success model: import all resolvable cards, show summary like "10 of 12 cards imported, 2 skipped" with details on failures

### Import architecture
- Frontend calls a Supabase Edge Function to perform the import (keeps CardTrader API token server-side, never exposed to browser)
- Edge Function handles: fetch wishlist, resolve blueprints, fetch initial prices, insert cards into DB

### Card resolution strategy
- Follow the proven call order from the existing garcon reference implementation:
  1. `GET /expansions` -> build expansion code-to-id map
  2. `GET /wishlists/{id}` -> get wishlist items
  3. `GET /blueprints/export?expansion_id=X` for each unique expansion -> build collector_number-to-blueprint map
  4. `GET /marketplace/products?blueprint_id=X&language=Y` for each card -> get prices
- Rate-limited batching: 8 concurrent requests, 1s delay between batches
- Cache expansion and blueprint reference data in Supabase tables (refresh periodically, this data rarely changes)

### Price & baseline
- Baseline price = cheapest marketplace listing matching the card's filters (condition, language, foil) with CardTrader Zero ON by default
- CT Zero filter uses same logic as garcon: `can_sell_via_hub`, `user_type === 'pro'`, or `can_sell_sealed_with_ct_zero`
- Default notification rule: +/-20% threshold from baseline (both directions — covers price drops and spikes)
- Prices displayed as current price + percentage change from baseline (e.g. "EUR 2.50 down 12%"). Green if cheaper than baseline, red if more expensive
- Currency: EUR only throughout the app (CardTrader API returns EUR cents)
- Price change detection uses percentage thresholds only (no absolute cent tolerance)

### GitHub Actions price job
- Node.js script running in GitHub Actions (consistent with frontend tooling)
- Authenticates directly with Supabase using service_role key and encryption key as GitHub Secrets (no Edge Function intermediary for the cron job)
- On CardTrader API failure: log the error and continue with remaining cards (partial data is better than no data)
- Deduplicates API calls by blueprint_id across all users (one marketplace call per unique card)

### Claude's Discretion
- Database schema changes needed (e.g. baseline_price column, expansion/blueprint cache tables)
- Edge Function implementation details (Deno runtime specifics, error response format)
- Exact rate limiting strategy for the GitHub Actions job vs the Edge Function import
- Loading/error state UI patterns on Dashboard
- How to extract wishlist ID from pasted URL (regex, URL parsing)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase.ts`: Supabase client singleton — use for frontend DB calls
- `src/components/Navbar.tsx`: Top navbar with Dashboard/Settings nav
- `src/pages/DashboardPage.tsx`: Empty state placeholder — will be replaced with import form + card list
- `.agents/skills/cardtrader-api/`: Full API reference with examples for wishlists, marketplace products, blueprints, expansions

### Established Patterns
- Tailwind CSS with 5-color custom theme (Deep Space Blue, Papaya Whip, Flag Red, Steel Blue, Molten Lava)
- System dark/light mode via `prefers-color-scheme`
- Biome for linting/formatting
- RLS policies on all tables (user sees only their own data)
- Token encryption via pgcrypto `pgp_sym_encrypt` with `app.settings.encryption_key`

### Integration Points
- `profiles.cardtrader_api_token`: Encrypted token, decrypted server-side by Edge Function
- `wishlists` table: Links user to CardTrader wishlist ID
- `monitored_cards` table: Has `blueprint_id`, `notification_rule` jsonb, filter columns (`only_zero` defaults true, `condition_required`, `language_required`, `foil_required`)
- `price_snapshots` table: Stores `price_cents`, `recorded_at`, `marketplace_data` jsonb
- Existing `save_api_token`, `has_api_token`, `remove_api_token` SQL functions as pattern for server-side token access

### Reference Implementation
- `/Users/mspigolon/workspace/_experiments/garcon/actions/inspect-cardtrader.js`: Working CardTrader price checker with the exact API call sequence, rate limiting, CT Zero filtering, and price comparison logic. Should be used as the blueprint for this phase's implementation.

</code_context>

<specifics>
## Specific Ideas

- The garcon reference implementation at `/Users/mspigolon/workspace/_experiments/garcon/actions/inspect-cardtrader.js` is the proven pattern for CardTrader API interaction. The API call order, rate limiting (8 batch, 1s delay), and CT Zero filter logic should be carried forward
- CT Zero default ON matches user's actual buying behavior on CardTrader
- When no offers exist for a card, the garcon script sets price to 32600 cents (high sentinel value) — consider how to handle this in the new app's baseline/display

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-data-pipeline*
*Context gathered: 2026-03-07*
