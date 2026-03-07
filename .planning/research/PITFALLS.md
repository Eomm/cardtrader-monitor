# Domain Pitfalls

**Domain:** Trading card price monitoring (CardTrader API + Supabase free tier + GitHub Actions cron + Telegram)
**Researched:** 2026-03-07
**Confidence:** MEDIUM-HIGH (based on documented API constraints, known platform behaviors, and architectural analysis of design doc)

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or make the system unusable.

### Pitfall 1: GitHub Actions Cron Skips and Delays

**What goes wrong:** GitHub Actions scheduled workflows are not guaranteed to run on time. During periods of high load, cron jobs can be delayed by 10-60+ minutes or skipped entirely. Workflows on inactive repos (no commits/activity for 60 days) are automatically disabled without notification.

**Why it happens:** GitHub Actions cron uses a best-effort scheduler. Public repos share infrastructure with millions of other workflows. GitHub also disables scheduled workflows on repos with no recent activity to save resources.

**Consequences:**
- Hourly price checks become irregular -- users miss short-lived price drops
- If the repo goes quiet for 2 months (no pushes, no PRs), all cron workflows silently stop
- Price history has gaps, making stability detection unreliable (e.g., "price stable for N days" requires consistent daily snapshots)

**Prevention:**
- Design the price check logic to be **idempotent and gap-tolerant** -- never assume the last run was exactly 1 hour ago
- For stability alerts, check snapshot timestamps rather than counting consecutive rows
- Add `workflow_dispatch` trigger to all cron workflows (already in design doc -- good) for manual recovery
- Set up a simple health check: if no price snapshots recorded in 2+ hours, send a Telegram alert to the admin
- Keep the repo "alive" with periodic commits or use a scheduled GitHub Action that pushes a timestamp file (though this is hacky)
- Consider adding a weekly "heartbeat" workflow that verifies other workflows ran as expected

**Detection:** No new `price_snapshots` rows for 3+ hours. Workflow run history shows gaps. GitHub sends an email when scheduled workflows are disabled, but it is easy to miss.

**Phase:** Phase 1 (Foundation) -- build gap-tolerant logic from the start, not as a retrofit.

---

### Pitfall 2: GitHub Actions Minutes Budget Exhaustion

**What goes wrong:** The design estimates 1,620 min/month out of 2,000 min/month budget. This leaves only 380 minutes of margin. A single slow CardTrader API response, network retry loop, or increased card count pushes past the limit. Once exhausted, ALL workflows stop -- including the frontend deploy workflow.

**Why it happens:** The estimate assumes 2 min/job for hourly price checks. But each run includes: checkout, npm ci (downloading node_modules), TypeScript compilation, API calls, and DB writes. npm ci alone can take 30-60 seconds. If CardTrader API is slow or rate-limited, the job runs longer.

**Consequences:**
- All monitoring stops mid-month with no warning
- Frontend can't be deployed (shares the same minutes pool)
- No notifications for potentially the last 1-2 weeks of the month

**Prevention:**
- **Cache npm dependencies** using `actions/cache` -- saves 20-40 seconds per run (saves ~15-20 hours/month)
- **Measure actual job duration** in the first week and extrapolate monthly usage
- **Build a minutes tracker** -- a simple counter that estimates remaining budget and alerts at 70% and 90% thresholds
- **Reduce check frequency** for cards with stable prices -- e.g., if price hasn't changed in 3 days, check every 4 hours instead of hourly
- **Batch efficiently** -- group all CardTrader API calls, minimize DB round-trips
- **Pre-build the jobs package** -- commit compiled JS so the workflow skips TypeScript compilation

**Detection:** GitHub provides usage stats at `github.com/{org}/{repo}/settings/billing` (or the user's billing page). Track job durations in workflow annotations.

**Phase:** Phase 1 (Foundation) -- npm caching must be in the first workflow template. Adaptive frequency in Phase 2.

---

### Pitfall 3: CardTrader API Token Stored in User Profile is a Security Liability

**What goes wrong:** The design stores each user's CardTrader API token in `profiles.cardtrader_api_token` (encrypted with pgcrypto). The GitHub Actions job uses the `SUPABASE_SERVICE_ROLE_KEY` to read ALL users' tokens, then makes API calls on their behalf. If the service role key leaks, ALL user tokens are compromised. If a user's token has write permissions, the job could theoretically modify their CardTrader inventory.

**Why it happens:** The architecture requires server-side access to user tokens for background jobs. The service role key bypasses RLS by design.

**Consequences:**
- A leaked service role key exposes every user's CardTrader API token
- CardTrader tokens may grant more permissions than just reading wishlists/marketplace (buying, selling, inventory management)
- Users may not realize they're granting broad API access

**Prevention:**
- **Verify CardTrader token scopes** -- check if CardTrader supports read-only tokens. If yes, require read-only tokens and document this clearly
- **Encrypt tokens with a separate key** (not just pgcrypto with a DB-stored key) -- use a GitHub Secret as the encryption key so even DB access alone doesn't expose tokens
- **Never log tokens** in GitHub Actions output -- mask them in workflow logs
- **Rotate the Supabase service role key** if there's any suspicion of compromise
- **Minimal data in marketplace_data JSONB** -- don't store seller usernames or other sensitive data from API responses

**Detection:** Audit GitHub Actions logs for token leakage. Monitor CardTrader API usage for unexpected calls.

**Phase:** Phase 1 (Foundation) -- encryption strategy must be decided before storing any tokens.

---

### Pitfall 4: Supabase Free Tier Project Pausing

**What goes wrong:** Supabase pauses free-tier projects after 7 days of inactivity (no API requests). A paused project returns errors on all API calls. The GitHub Actions jobs will fail, and the frontend will show errors to users.

**Why it happens:** Supabase conserves resources by pausing idle free-tier databases. If users stop visiting the dashboard and the cron jobs happen to fail for a few days (see Pitfall 1), the project goes inactive.

**Consequences:**
- All monitoring stops silently
- Users see errors when they try to visit the dashboard
- Unpausing requires manual action in the Supabase dashboard and takes a few minutes
- Data is preserved but service is interrupted

**Prevention:**
- **The hourly cron job itself prevents pausing** -- as long as it runs, the project stays active. This is actually a built-in safeguard.
- **BUT** if GitHub Actions cron stops (Pitfall 1: repo inactivity), the Supabase project can also pause -- a cascade failure
- Add a lightweight health-check query to the cron job (e.g., `SELECT 1`) that runs even if there are no cards to check
- Monitor for Supabase pause emails and set up an alert

**Detection:** API calls return connection errors or 503 status. Supabase sends an email before pausing.

**Phase:** Phase 1 (Foundation) -- ensure the cron job always makes at least one DB call, even with zero users.

---

### Pitfall 5: Price Comparison Logic Using Wrong Reference Point

**What goes wrong:** The PROJECT.md describes a baseline price model where the baseline is set at import time. But marketplace prices can be volatile -- a card imported during a price spike gets a high baseline, making all future prices look like "drops" and triggering constant notifications. Conversely, importing during a sale sets an artificially low baseline.

**Why it happens:** The baseline is a single snapshot in time. Trading card prices can swing 20-50% day-to-day based on tournament results, ban announcements, or a single seller listing/removing inventory.

**Consequences:**
- Users get flooded with notifications that aren't meaningful
- Users lose trust in the system and disable notifications
- Users have to manually reset baselines constantly

**Prevention:**
- **Set baseline as the median of the first 3-5 snapshots** rather than the first single price -- delays notifications by a few hours but gives a much more reliable reference
- **Show the baseline price prominently** in the UI so users understand what they're being compared against
- **Allow one-click baseline reset** from the notification itself (already planned -- good)
- **Add a "warming up" state** for newly imported cards -- don't send notifications until at least 3 snapshots exist
- **Consider a "rolling baseline" option** -- automatically update baseline to 7-day average, so it adapts over time

**Detection:** High notification volume in the first 24 hours after import. Users repeatedly resetting baselines.

**Phase:** Phase 2 (Core Features) -- must be addressed when implementing the price check logic.

## Moderate Pitfalls

### Pitfall 6: CardTrader Marketplace API Returns Only 25 Products Per Blueprint

**What goes wrong:** The `GET /marketplace/products?blueprint_id={id}` endpoint returns at most 25 products (cheapest). If the user's filter criteria (CT0 only, specific condition, specific language) eliminates all 25, the system reports "no listings found" even though matching listings exist beyond the top 25.

**Why it happens:** The API is designed for marketplace browsing, not exhaustive search. It pre-filters by price and returns a fixed window.

**Prevention:**
- **Document this limitation clearly** to users -- "We check the 25 cheapest listings"
- **Warn users when filters are very restrictive** -- e.g., "Near Mint, Japanese, Foil, CT0 only" on a common card may filter out all 25 results
- **Track "no match found" occurrences** -- if a card consistently returns no matches, suggest broadening filters
- **Consider using expansion_id queries** for expansion-level checks when many cards share an expansion, then filter client-side (but watch rate limits)

**Phase:** Phase 2 (Core Features) -- handle gracefully in price check logic.

---

### Pitfall 7: Telegram Bot Webhook vs. Polling Confusion

**What goes wrong:** The design uses a Supabase Edge Function as a Telegram webhook endpoint. But Telegram requires the webhook URL to be publicly accessible via HTTPS, and it must respond within a few seconds. If the Edge Function cold-starts slowly or the webhook URL changes (Supabase project re-creation), the bot silently stops receiving messages.

**Why it happens:** Supabase Edge Functions have cold start times of 1-3 seconds. Telegram retries failed webhooks with exponential backoff but eventually stops. Webhook URLs include the Supabase project ID, which changes if the project is recreated.

**Prevention:**
- **Test webhook delivery explicitly** after setup -- use Telegram's `getWebhookInfo` API to verify pending updates and error counts
- **Store the webhook URL in a config constant** and add a setup script that calls `setWebhook`
- **Handle cold starts** -- Telegram is forgiving (waits up to 60 seconds for response), so Edge Function cold starts are usually fine, but verify
- **Add a `/status` command** to the bot that confirms it's alive
- **Log all incoming webhook requests** to detect gaps

**Phase:** Phase 3 (Notifications) -- verify webhook reliability during Telegram integration.

---

### Pitfall 8: Notification Spam from Oscillating Prices

**What goes wrong:** A card's cheapest listing toggles between two sellers near the threshold boundary. Price goes from 100 to 89 (alert: -11%), then back to 100 (no alert), then to 88 (alert: -12%), creating repeated notifications for what is essentially the same price level.

**Why it happens:** Marketplace prices reflect the cheapest available listing. When multiple sellers compete, the cheapest listing changes frequently. The system compares current price vs. baseline on every check.

**Consequences:**
- Users receive multiple notifications per day for the same card
- Users mute Telegram or unlink their account
- System credibility decreases

**Prevention:**
- **Implement notification cooldown** -- don't re-notify for the same card within 24 hours unless the price moves significantly further
- **Track notification state per card** -- "last notified price" and "last notified at" columns
- **Use hysteresis** -- if threshold is -10%, only clear the alert state when price returns above -5% (halfway back)
- **Daily digest option** -- batch all triggered alerts into one message per day instead of real-time

**Detection:** Multiple notifications for the same card within a short window. Users complaining about spam.

**Phase:** Phase 2 (Core Features) -- cooldown must be in the initial notification logic, not added later.

---

### Pitfall 9: RLS Policy Performance on Nested Joins

**What goes wrong:** The RLS policy for `monitored_cards` uses a subquery: `wishlist_id IN (SELECT id FROM wishlists WHERE user_id = auth.uid())`. On the free tier with limited compute, this subquery runs on every row access. With 500+ cards across multiple users, dashboard queries become slow.

**Why it happens:** PostgreSQL evaluates RLS policies as additional WHERE clauses. Subqueries in RLS policies don't always get optimized well, especially without proper indexes.

**Prevention:**
- **Add `user_id` directly to `monitored_cards`** table (denormalized) -- simplifies RLS to a direct equality check
- **If keeping the subquery, ensure indexes exist** on `wishlists(user_id)` and `monitored_cards(wishlist_id)` (already in the design -- good)
- **Test query performance** with realistic data volume early -- use `EXPLAIN ANALYZE` on common queries
- **Use database functions** for complex aggregations instead of letting the frontend issue multiple queries

**Phase:** Phase 1 (Foundation) -- schema decision. Adding `user_id` to `monitored_cards` later requires a migration.

---

### Pitfall 10: CardTrader API Calls Not Deduplicated Across Users

**What goes wrong:** If 5 users all monitor the same card (same `blueprint_id`), the hourly job makes 5 separate API calls to fetch marketplace data for that blueprint. With 100 users, duplicate calls waste API quota and GitHub Actions minutes.

**Why it happens:** The naive approach processes cards per-user. The design doc mentions grouping by `blueprint_id` but this must be implemented carefully.

**Prevention:**
- **Group ALL monitored cards by `blueprint_id` across all users** before making API calls
- **Fetch each unique blueprint once**, then distribute results to all users monitoring it
- **Apply per-user filters (condition, language, foil, CT0) after fetching** -- the API response contains all variants
- **Cache blueprint results within a single job run** (no need for persistent cache -- just in-memory)

**Detection:** Count unique blueprint API calls vs. total monitored cards. If ratio is close to 1:1, deduplication isn't working.

**Phase:** Phase 2 (Core Features) -- must be in the first implementation of the price check job.

## Minor Pitfalls

### Pitfall 11: GitHub Pages SPA Routing Breaks on Direct URL Access

**What goes wrong:** GitHub Pages serves static files. Navigating to `/cards/123` directly returns a 404 because there's no `cards/123/index.html` file. Only the root `index.html` has the React app.

**Prevention:**
- **Add a `404.html` that redirects to `index.html`** -- the standard GitHub Pages SPA workaround
- **Or use hash-based routing** (`/#/cards/123`) instead of browser history routing
- The `404.html` approach is cleaner -- copy `index.html` to `404.html` in the build step

**Phase:** Phase 1 (Foundation) -- must be in the initial deployment setup.

---

### Pitfall 12: Supabase Edge Functions Deno Environment Quirks

**What goes wrong:** Supabase Edge Functions run on Deno, not Node.js. npm packages that use Node.js built-in modules (`fs`, `crypto`, `path`) fail at runtime. The `telegraf` library listed in the design doc dependencies is a Node.js library and may not work in Deno Edge Functions.

**Prevention:**
- **Use `telegraf` only in the GitHub Actions jobs** (Node.js environment), not in Edge Functions
- **For the Telegram webhook Edge Function**, use the raw Telegram HTTP API with `fetch()` instead of a library
- **Test Edge Functions locally** with `supabase functions serve` before deploying
- **Use `npm:` prefix** for npm packages in Deno (e.g., `import { createClient } from "npm:@supabase/supabase-js"`) but verify each package works

**Phase:** Phase 1 (Foundation) for Edge Function structure. Phase 3 (Notifications) for Telegram webhook.

---

### Pitfall 13: CardTrader API Token Validity is User-Managed

**What goes wrong:** Users generate API tokens from their CardTrader profile. Tokens can expire or be revoked without the monitoring system knowing. The hourly job silently fails for that user, and they receive no notifications with no indication of why.

**Prevention:**
- **Check for 401 responses** from CardTrader API and mark the user's token as invalid in the DB
- **Send a Telegram notification** when a token becomes invalid: "Your CardTrader API token is no longer valid. Please update it in settings."
- **Show token status** in the settings page (last successful API call timestamp)
- **Don't retry invalid tokens** on subsequent runs -- skip the user until they update

**Phase:** Phase 2 (Core Features) -- error handling in the price check job.

---

### Pitfall 14: Price in Cents Precision and Currency Confusion

**What goes wrong:** CardTrader API returns prices, but the currency depends on the marketplace context. Storing as `price_cents int` assumes a single currency. If a user's CardTrader account is set to EUR and another to USD, price comparisons are meaningless.

**Prevention:**
- **Store currency alongside price** -- add a `currency` column to `price_snapshots`
- **All comparisons must be within the same currency** -- never compare EUR cents to USD cents
- **Display currency symbol in notifications** -- "Card X dropped to 5.99 EUR" not just "5.99"
- **Check what CardTrader API actually returns** -- verify if marketplace endpoint prices are always in the buyer's currency or the seller's

**Phase:** Phase 1 (Foundation) -- schema must include currency from the start.

---

### Pitfall 15: Supabase Free Tier Bandwidth Counted on Egress

**What goes wrong:** The 5 GB/month bandwidth limit counts database egress. If the price check job fetches all 500 monitored cards with their JSONB marketplace data 24 times/day, the bandwidth adds up. Storing full marketplace response objects (25 products with all fields) in `marketplace_data` JSONB is the biggest contributor.

**Prevention:**
- **Store only essential fields in `marketplace_data`** -- price, condition, seller_username is enough. Strip description, images, shipping info
- **Or don't store marketplace_data at all** -- just store the cheapest matching price. The detailed data is queryable from CardTrader on-demand
- **Use `select` parameter in Supabase queries** to fetch only needed columns
- **Monitor bandwidth in Supabase dashboard** weekly during the first month

**Phase:** Phase 1 (Foundation) -- decide on `marketplace_data` scope early.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Supabase Setup | Project pausing on inactivity (P4) | Ensure cron jobs keep project alive |
| Phase 1: Schema Design | Missing currency column (P14), RLS perf (P9) | Include currency, add user_id to monitored_cards |
| Phase 1: GitHub Actions | No npm caching blows minutes budget (P2) | Add actions/cache from day one |
| Phase 1: GitHub Pages Deploy | SPA routing 404s (P11) | Add 404.html redirect in build step |
| Phase 2: Price Check Job | No deduplication (P10), no cooldown (P8) | Group by blueprint_id, add notification cooldown |
| Phase 2: Price Logic | Bad baseline reference (P5), 25-product limit (P6) | Warm-up period, document limitation |
| Phase 2: Error Handling | Silent token failures (P13) | Detect 401s, notify user via Telegram |
| Phase 3: Telegram Webhook | Deno vs Node.js (P12), webhook reliability (P7) | Use raw fetch API, verify with getWebhookInfo |
| Phase 3: Notifications | Spam from oscillating prices (P8) | Hysteresis + cooldown from the start |
| Ongoing: Operations | Cron skips (P1), minutes exhaustion (P2) | Health checks, budget monitoring |

## Sources

- CardTrader API documentation and skill file (`.agents/skills/cardtrader-api/SKILL.md`) -- HIGH confidence for API behavior
- Project design document (`docs/plans/2026-02-01-cardtrader-monitor-design.md`) -- HIGH confidence for architecture constraints
- GitHub Actions scheduled events documentation (training data) -- MEDIUM confidence (known behavior, but GitHub may have updated policies)
- Supabase free tier documentation (training data) -- MEDIUM confidence (limits may have changed; verify current free tier terms at supabase.com/pricing)
- Telegram Bot API documentation (training data) -- HIGH confidence (stable API, well-documented)
