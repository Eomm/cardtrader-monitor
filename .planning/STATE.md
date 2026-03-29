---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: "Completed 07-02: Fixed Price tab in RuleEditor and inline rule editing in CardRow"
last_updated: "2026-03-12T16:50:50.445Z"
last_activity: "2026-03-29 - Completed quick task 10: improve homepage with catchy description, beta notice, how it works link, and privacy page"
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 21
  completed_plans: 21
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** Users get notified about meaningful price movements on cards they care about -- so they can act on deals without constantly checking CardTrader.
**Current focus:** Phase 6: Chores and Fixes (Phase 5 complete)

## Current Position

Phase: 6 of 6 (Chores and Fixes)
Plan: 4 of 4 in current phase (06-03 complete)
Status: In progress
Last activity: 2026-03-29 - Completed quick task 10: improve homepage with catchy description, beta notice, how it works link, and privacy page

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 15 min
- Total execution time: 2.25 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 73 min | 37 min |
| 02-data-pipeline | 4/4 | 21 min | 5 min |
| 03-dashboard | 3/3 | 43 min | 14 min |

**Recent Trend:**
- Last 5 plans: 3 min, 3 min, 12 min, 2 min, 39 min
- Trend: -

*Updated after each plan completion*
| Phase 03-dashboard P02 | 2 | 2 tasks | 5 files |
| Phase 03-dashboard P03 | 39 min | 2 tasks | 4 files |
| Phase 04-notifications P01 | 2 | 2 tasks | 4 files |
| Phase 04-notifications P02 | 8 min | 3 tasks | 4 files |
| Phase 04-notifications P03 | 3 min | 2 tasks | 2 files |
| Phase 05-automation P01 | 1 | 2 tasks | 4 files |
| Phase 05-automation P02 | 2 min | 2 tasks | 2 files |
| Phase 06-chores-and-fixes P01 | 4 min | 2 tasks | 23 files |
| Phase 06-chores-and-fixes P04 | 1 min | 1 tasks | 1 files |
| Phase 06 P02 | 6 min | 2 tasks | 14 files |
| Phase 06 P03 | 2 min | 2 tasks | 5 files |
| Phase 07-ui-usability-improvements P01 | 3 | 3 tasks | 5 files |
| Phase 07-ui-usability-improvements P03 | 8 | 2 tasks | 4 files |
| Phase 07-ui-usability-improvements P02 | 2 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 5-phase structure derived from 31 requirements. Foundation -> Data Pipeline -> Dashboard -> Notifications -> Automation.
- [Roadmap]: Telegram connection flow (NOTF-05) and stability alerts (PRIC-06) deferred to v2 per REQUIREMENTS.md.
- [01-01]: Used Biome instead of ESLint+Prettier for single-tool linting/formatting
- [01-01]: Stripped JSONC comments from tsconfig files for Biome compatibility
- [01-01]: Replaced non-null assertion with explicit null check in main.tsx for Biome compliance
- [01-02]: Added aria-hidden to decorative SVGs for Biome a11y compliance
- [01-02]: Used useCallback for RPC check function to satisfy exhaustive-deps rule
- [01-02]: Inline confirmation for token removal instead of browser confirm dialog
- [02-01]: Used null for baseline_price_cents when no offers found (not sentinel value)
- [02-01]: CT Zero filter checks three seller qualifications: can_sell_via_hub, user_type=pro, can_sell_sealed_with_ct_zero
- [02-01]: Cache table RLS blocks anon/authenticated writes; service_role bypasses for Edge Functions and GH Actions
- [02-02]: Used ?? '' fallback for Deno env vars instead of non-null assertions for Biome compliance
- [02-02]: Individual marketplace price fetch failures return null price, card still imported without baseline
- [02-02]: CardTrader API helpers re-implemented for Deno runtime with inline types (cannot import from src/lib/)
- [02-03]: Used first available valid API token for all marketplace queries (prices are user-independent)
- [02-03]: Skip price snapshot for cards with no matching offers (price_cents is NOT NULL)
- [02-03]: Store top 3 offers in marketplace_data jsonb for price context
- [02-04]: Two separate Supabase queries (monitored_cards + price_snapshots) merged in JS
- [02-04]: Green = price dropped (good for buyer), Red = price rose (bad for buyer)
- [02-04]: Empty state shows full import form, data state shows compact form + card grid
- [03-01]: ThresholdRule/StabilityRule union pattern for extensible notification rules
- [03-01]: Regional indicator symbol calculation for flag emoji (no external library)
- [03-01]: MonitoredCardWithPrice centralized in cardtrader-types.ts with all DB columns
- [Phase 03-02]: Extracted formatEur and PriceChange to PriceDisplay.tsx for reuse by CardRow and future CardDetailPage
- [Phase 03-02]: Used button element for CardRow for keyboard accessibility on clickable rows
- [03-03]: Inline confirmation pattern for Stop Monitoring (confirm/cancel buttons, no browser dialog)
- [03-03]: CT Zero toggle saves immediately (filter preference) while rules require explicit save
- [03-03]: Defensive Array.isArray check in RuleEditor for databases where migration not applied
- [Phase 04-01]: Null baseline treated as -100% drop to alert when unavailable cards appear
- [Phase 04-01]: Cooldown re-evaluates threshold against last notified price during 24h window
- [Phase 04-02]: Shared telegram.ts helper in _shared/ for Deno runtime (same pattern as cardtrader-api.ts)
- [Phase 04-02]: Webhook always returns 200 OK to Telegram to prevent retries
- [Phase 04-02]: Save & Test flow: update profile first, then invoke Edge Function for test message
- [Phase 04-02]: Added direct link to @card_trader_monitor_bot in Settings instructions
- [Phase 04-03]: Local sendTelegramMessage in fetch-prices.ts (Node.js cannot import Deno code)
- [Phase 04-03]: One alert per card per run with first-triggered-rule-wins dedup
- [Phase 04-03]: Graceful skip when TELEGRAM_BOT_TOKEN not set (no failure)
- [Phase 05-01]: Used SECURITY DEFINER PL/pgSQL function for DELETE with JOIN (Supabase JS limitation)
- [Phase 05-01]: Cleanup at 04:00 UTC to avoid overlap with hourly fetch-prices; cancel-in-progress: false on both workflows
- [Phase 05-02]: Hard-delete removed cards (CASCADE cleans up snapshots/notifications)
- [Phase 05-02]: Blueprint cache checked before API calls to reduce rate limit usage
- [Phase 05-02]: Metadata updates never touch user settings (rules, baseline, filters)
- [06-01]: Used filter+type guard instead of non-null assertion for sync-wishlists Map.get()
- [06-01]: Added ct_expansions optional join type to MonitoredCardWithPrice for Supabase FK join pattern
- [06-01]: Display expansion via ct_expansions?.name with '---' fallback for null
- [Phase 06-04]: Documented all 5 GitHub secrets from actual workflow files, used actual env var names from .env.example
- [Phase 06]: Removed @theme block entirely; Tailwind v4 includes all color scales by default
- [Phase 06]: Dark-only palette: slate-100/400/500 text hierarchy, blue-500 interactive, red-500 destructive
- [06-03]: Wishlist info fetched as separate query after card load (not joined) for simplicity
- [06-03]: Help icon uses plain ? in bordered circle rather than SVG icon library
- [06-03]: Wishlist count check placed after auth but before API token fetch to fail fast
- [Phase 07-01]: FixedPriceRule uses crossing semantics: triggers only when price crosses target threshold (not just below/above)
- [Phase 07-01]: Threshold rules evaluated before fixed_price rules; first triggered rule wins per card
- [Phase 07-ui-usability-improvements]: Installed jsdom as devDependency for vitest localStorage support; used @vitest-environment jsdom annotation on test file
- [Phase 07-ui-usability-improvements]: Exported FILTER_KEY, DEFAULT_FILTERS, DashboardFilters, loadFilters from CardList.tsx at module level for unit testability
- [Phase 07-02]: InlineRuleInput split into outer/inner components to avoid hooks-in-conditional anti-pattern
- [Phase 07-02]: Direction emoji uses Unicode triangle characters; no icon library dependency
- [Phase 07-02]: CardList onRuleSaved wired through fully (was previously ignored as _onRuleSaved)

### Pending Todos

None yet.

### Blockers/Concerns

- CardTrader API behavior needs live validation during Phase 2 planning (25-product limit, rate limits, token scopes)
- GitHub Actions minutes budget is tight (estimated 1,620 of 2,000 min/month) -- monitor from Phase 2

### Roadmap Evolution

- Phase 6 added: chores and fixes
- Phase 7 added: UI usability improvements (wishlist filter, persistent filters, threshold UX, fixed price threshold rule)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix Telegram MarkdownV2 escaping for > character | 2026-03-07 | 903bfba | [1-fix-telegram-markdownv2-escaping-for-cha](./quick/1-fix-telegram-markdownv2-escaping-for-cha/) |
| 2 | Dashboard must show wishlist name in card row | 2026-03-12 | d3d6a12 | [2-dashboard-must-show-wishlist-name-in-car](./quick/2-dashboard-must-show-wishlist-name-in-car/) |
| 3 | Display error message from 400 response | 2026-03-12 | 91f4b88 | [3-display-error-message-from-400-response-](./quick/3-display-error-message-from-400-response-/) |
| 4 | Update How It Works page with inline rule editing and fixed price rule docs | 2026-03-12 | 8e75f10 | [4-update-how-it-works-page-with-inline-rul](./quick/4-update-how-it-works-page-with-inline-rul/) |
| 5 | Write comprehensive README.md | 2026-03-12 | 81cbaf8 | [5-we-need-to-write-a-meaningful-readme-fil](./quick/5-we-need-to-write-a-meaningful-readme-fil/) |
| 6 | Add sort buttons to dashboard for price and variation | 2026-03-12 | 9711b6f | [6-add-sort-buttons-to-dashboard-for-price-](./quick/6-add-sort-buttons-to-dashboard-for-price-/) |
| 7 | Fix mobile UI breakage with filters | 2026-03-12 | 6c88297 | [7-fix-mobile-ui-breakage-with-filters](./quick/7-fix-mobile-ui-breakage-with-filters/) |
| 8 | Add line chart for recent prices with threshold/fixed-price rule overlay lines | 2026-03-14 | 45badc6 | [8-add-line-chart-for-recent-prices-with-th](./quick/8-add-line-chart-for-recent-prices-with-th/) |
| 9 | Hide Price Log section and add hover tooltips to PriceChart | 2026-03-14 | 41b315d | [9-hide-price-log-section-and-add-hover-too](./quick/9-hide-price-log-section-and-add-hover-too/) |
| 10 | Improve homepage with catchy description, BETA badge, and Privacy page | 2026-03-29 | c802240 | [10-improve-homepage-with-catchy-description](./quick/10-improve-homepage-with-catchy-description/) |

## Session Continuity

Last session: 2026-03-29T00:00:00Z
Stopped at: Completed quick task 10: Improve homepage with catchy description, BETA badge, and Privacy page
Resume file: None
