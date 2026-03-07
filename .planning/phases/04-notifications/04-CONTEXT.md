# Phase 4: Notifications - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users receive Telegram messages when card prices cross their configured thresholds. Threshold evaluation runs as part of the existing hourly price check job (no separate workflow). Notifications are logged in the database. Includes Telegram bot setup, message sending, threshold evaluation logic, and a Settings page section for connecting Telegram.

</domain>

<decisions>
## Implementation Decisions

### Telegram setup
- Minimal bot approach: user sends /start to the bot (unblocks it), then copies their chat ID from the bot's reply and pastes it in the Settings page
- No webhook-based link token flow in v1 — manual chat ID input only
- Telegram chat ID input lives in the Settings page, below the existing API token section
- On save, send a test message via the bot to confirm the connection works
- Telegram bot token stored in both Supabase Edge Function env var (for test message on save) and GitHub Actions secret (for price job notifications)
- The Telegram bot webhook points to a public Supabase Edge Function (no JWT verification)

### Message content & format
- Rich Telegram MarkdownV2 formatting
- Messages in English
- Multiple triggered cards grouped into a single message
- Format per card line: emoji (green circle for drop, red circle for rise), card name as clickable link to CardTrader listing, old price arrow new price
- Example: `🟢 [Dark Magician](https://cardtrader.com/...) €17.27 -> €15.00`

### Alert cooldown & dedup
- 24-hour cooldown after an alert fires for a card
- During cooldown, the threshold is re-evaluated against the last notified price (from the notifications table) instead of the original baseline
- If the price moved enough from the last alert price to trigger the threshold again, bypass the cooldown and send a new alert
- No additional dedup beyond this mechanism

### Threshold evaluation
- RULE-03: compare cheapest matching price (from current fetch) against baseline price
- Only evaluate enabled threshold rules (skip disabled rules entirely)
- Respect direction strictly: direction='down' only fires on drops, 'up' only on rises, 'both' fires on either
- No offers in marketplace (null price) = skip threshold evaluation silently (stability rule covers this scenario)
- Null baseline price = treat as infinity, so any actual price is a drop and every threshold rule matches by default (ensures alerts fire when a previously unavailable card appears on the marketplace)
- Stability rules are NOT evaluated in this phase — only threshold rules

### Claude's Discretion
- Test message content and formatting
- Edge Function implementation details for test message endpoint
- Exact MarkdownV2 escaping approach
- How the bot replies to /start (message showing the user's chat ID)
- Error handling when Telegram API is unreachable during price job
- Settings page UI details for the Telegram section (input validation, save confirmation pattern)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/fetch-prices.ts`: Hourly price fetch job — threshold evaluation and notification sending will be added here
- `src/lib/cardtrader-types.ts`: ThresholdRule/StabilityRule types, NotificationRule union, MonitoredCardWithPrice type
- `src/lib/cardtrader-utils.ts`: `findCheapestPrice`, `filterCtZeroOffers`, `processBatches` utilities
- `src/pages/SettingsPage.tsx`: Existing settings page with API token CRUD — extend with Telegram section
- `src/lib/supabase.ts`: Supabase client singleton

### Established Patterns
- GitHub Actions cron job with service_role key for server-side DB access
- Edge Functions with `Verify JWT with legacy secret` set to false for public endpoints
- Inline confirmation pattern (confirm/cancel buttons, no browser dialog)
- Green = price dropped (good for buyer), Red = price rose (bad for buyer)
- EUR only, prices in cents

### Integration Points
- `profiles.telegram_chat_id`: Already exists in DB schema — store user's Telegram chat ID
- `notifications` table: Already exists with `notification_type`, `old_price_cents`, `new_price_cents`, `sent_at`, `telegram_message_id`
- `monitored_cards.notification_rule`: JSONB array of ThresholdRule/StabilityRule objects
- `monitored_cards.baseline_price_cents`: Baseline for threshold comparison (null = treat as infinity)
- `.github/workflows/`: Existing cron workflow for price fetching — notification sending added to same job

</code_context>

<specifics>
## Specific Ideas

- User explicitly defined the notification message format: one line per card with colored circle emoji, card name as hyperlink, and old → new price
- Cooldown bypass logic: during 24h cooldown, use last notified price as the comparison baseline instead of the original baseline — this catches continued significant price movement
- Null baseline = infinity ensures users are notified when previously unavailable cards appear on the marketplace

</specifics>

<deferred>
## Deferred Ideas

- NOTF-05: Telegram connection flow via /start token link (v2 — smoother UX for connecting accounts)
- NOTF-06: Inline Telegram button to reset baseline price from notification (v2)
- Stability rule evaluation — types exist but evaluation logic is not part of this phase

</deferred>

---

*Phase: 04-notifications*
*Context gathered: 2026-03-07*
