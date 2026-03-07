# Project Research Summary

**Project:** CardTrader Monitor
**Domain:** Trading card price monitoring (CardTrader marketplace)
**Researched:** 2026-03-07
**Confidence:** MEDIUM

## Executive Summary

CardTrader Monitor is a price monitoring tool for the CardTrader trading card marketplace, targeting a small group of users (5-200). The product has a clear niche: no existing tool monitors CardTrader prices. The architecture is a static React SPA on GitHub Pages, Supabase (free tier) for database/auth/edge functions, and GitHub Actions cron jobs as the background processing engine. The recommended stack is mature and well-documented -- React 19, Vite, TypeScript, TanStack Query, Tailwind CSS, with grammY for Telegram notifications.

The recommended approach is to build the notification loop first and everything else second. The entire value proposition is: import a CardTrader wishlist, check prices hourly, and send Telegram alerts when deals appear. The architecture research confirms a clear four-layer separation -- GitHub Actions jobs do the heavy lifting (price fetching, rule evaluation, notifications), Edge Functions handle user-initiated mutations, the frontend reads directly from Supabase via RLS, and Postgres is the single source of truth. The baseline price model with daily snapshot upserts is a cleaner design than the original "keep 3 snapshots" approach.

The primary risks are operational, not technical. GitHub Actions minutes budget is tight (estimated 1,620 of 2,000 min/month), cron jobs can skip or delay without warning, and Supabase free tier pauses after 7 days of inactivity. These cascade: if cron stops, Supabase pauses, and everything breaks silently. Mitigation requires npm caching from day one, gap-tolerant logic, health monitoring, and a clear escalation path if the project outgrows free-tier limits around 150 users.

## Key Findings

### Recommended Stack

The stack is split across three runtimes: a React SPA (Vite + TypeScript), Supabase Edge Functions (Deno), and GitHub Actions jobs (Node.js 22 + tsx). This is inherent to the architecture, not a choice to revisit. See `STACK.md` for full version table.

**Core technologies:**
- **React 19 + Vite 6 + TypeScript 5.7**: Standard SPA stack. Use `createHashRouter` for GitHub Pages compatibility (no server-side rewrites).
- **TanStack Query v5**: All frontend data is server state. TQ handles caching, background refetching, and stale-while-revalidate. No need for Zustand/Redux.
- **Supabase JS v2**: Single SDK for auth, database reads (RLS), and Edge Function invocation from frontend.
- **grammY v1.30+**: Telegram bot library for Node.js jobs. Use raw `fetch()` in Edge Functions instead to avoid cold start penalty.
- **Tailwind CSS v4**: Forward path for styling. Fall back to v3.4 if v4 plugin ecosystem causes issues.
- **tsx v4**: Run TypeScript job scripts directly without a build step in GitHub Actions.

**Version caveat:** All versions are based on training data through May 2025. Vite may be v7, Tailwind v4 plugins may have matured. Run `npm view <pkg> version` before initializing.

### Expected Features

**Must have (table stakes):**
- Wishlist import from CardTrader
- Per-card price drop/increase alerts with configurable thresholds
- Current price dashboard display
- Card filtering (condition, language, foil, CT Zero)
- Telegram notification delivery with buy links
- Google OAuth authentication with user isolation via RLS

**Should have (differentiators):**
- Baseline price model with manual reset (including reset from Telegram notification)
- Stability alerts ("price stable for N days") -- unique, no competitor offers this
- CT Zero-specific filtering -- CardTrader-specific, no competitor can offer this
- Daily wishlist auto-sync -- users manage one wishlist on CardTrader, monitoring follows
- Price increase alerts (bidirectional thresholds)

**Defer (v2+):**
- Price history charts (adds charting library weight, polish not core)
- Notification history view in UI
- Bulk rule editing
- Multiple wishlist support per user
- Any form of multi-marketplace comparison, collection tracking, or deck building

### Architecture Approach

The system follows a four-layer architecture where GitHub Actions jobs are the engine, Edge Functions are thin API adapters, the frontend is a read-heavy static SPA, and Postgres enforces all data integrity. The key architectural patterns are: daily snapshot upserts (one row per card per day via UNIQUE constraint), notification cooldowns (prevent spam from oscillating prices), blueprint-level API deduplication (fetch once per card across all users), and one-time tokens for Telegram deep-link actions. See `ARCHITECTURE.md` for full schema and data flow diagrams.

**Major components:**
1. **React SPA** -- Dashboard UI, reads directly from Supabase via RLS, invokes Edge Functions for writes
2. **Supabase Postgres** -- All persistent state: profiles, wishlists, monitored_cards, price_snapshots, notifications. RLS for frontend, service role for jobs
3. **Edge Functions (4)** -- import-wishlist, update-card-rules, reset-baseline, telegram-webhook. Thin handlers with shared code in `_shared/`
4. **GitHub Actions Jobs (3 workflows)** -- hourly-price-check, daily-wishlist-sync, daily-maintenance. Separate orchestrators from task modules
5. **External APIs** -- CardTrader (prices + wishlists), Telegram Bot API (notifications)

### Critical Pitfalls

1. **GitHub Actions cron unreliability** -- Jobs can delay 10-60 min or skip entirely. Repos inactive for 60 days get cron disabled silently. Build gap-tolerant logic from day one; never assume exact scheduling.
2. **Minutes budget exhaustion** -- Estimated 1,620 of 2,000 min/month with zero margin for slow API responses. npm caching saves ~20 hours/month. Must be in first workflow template.
3. **Supabase free tier pausing** -- Pauses after 7 days of no API calls. Cascades with cron failure. Ensure jobs always make at least one DB call even with zero users.
4. **Notification spam from oscillating prices** -- Without cooldowns and hysteresis, the same card triggers alerts every hour. Implement 24h cooldown per card per notification type from the start.
5. **Bad baseline reference** -- Single snapshot at import time is unreliable. Use median of first 3-5 snapshots or add a "warming up" period before enabling notifications.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Infrastructure

**Rationale:** Everything depends on the database schema, authentication, deployment pipeline, and GitHub Actions scaffolding. Schema decisions (currency column, user_id denormalization on monitored_cards, baseline columns) are hard to change later. npm caching and 404.html routing must be in place from the start.
**Delivers:** Working SPA deployed to GitHub Pages with auth, empty dashboard, database schema with all tables, first GitHub Actions workflow template with caching and concurrency controls.
**Addresses:** Auth + settings (table stakes), GitHub Pages deployment, Supabase project setup
**Avoids:** Pitfalls P2 (minutes budget -- npm caching), P4 (Supabase pausing -- cron keeps alive), P9 (RLS performance -- schema decision), P11 (SPA routing -- 404.html), P14 (currency -- schema), P15 (bandwidth -- marketplace_data scope)
**Research needed:** No -- well-documented patterns for all components.

### Phase 2: Data Pipeline (Import + Price Checking)

**Rationale:** The CardTrader API integration is the riskiest unknown. Import and price fetching validate the entire data model end-to-end. Must confirm API behavior (25-product limit, rate limits, token scoping) before building notifications on top.
**Delivers:** Working wishlist import via Edge Function, hourly price check job that fetches prices and upserts snapshots, card management UI showing imported cards and current prices.
**Addresses:** Wishlist import, current price display, card filtering, CardTrader API client with rate limiting, blueprint deduplication
**Avoids:** Pitfalls P5 (baseline -- implement warming period), P6 (25-product limit -- document and handle gracefully), P10 (deduplication -- group by blueprint_id), P13 (token validity -- detect 401s)
**Research needed:** YES -- CardTrader API behavior should be validated hands-on. The 25-product limit, rate limit enforcement, token scoping (read-only?), and exact response format need live testing.

### Phase 3: Notification System

**Rationale:** Notifications are the core value delivery but depend on real price data flowing through snapshots (Phase 2). Telegram webhook setup, threshold evaluation, cooldown logic, and baseline reset all belong together.
**Delivers:** Working Telegram bot with webhook, threshold alerts (drop/rise/both), notification cooldown, baseline reset from Telegram link, notification delivery with buy links.
**Addresses:** Price alerts, Telegram notifications, baseline reset, notification with buy link
**Avoids:** Pitfalls P7 (webhook reliability -- verify with getWebhookInfo), P8 (notification spam -- cooldown + hysteresis from the start), P12 (Deno quirks -- raw fetch in Edge Functions)
**Research needed:** Moderate -- Telegram webhook + Supabase Edge Function integration needs verification. grammY in Node.js jobs is standard.

### Phase 4: Automation and Operations

**Rationale:** Daily sync and maintenance are operational concerns that refine the core loop. Stability alerts require multi-day snapshot history (only available after Phase 2 has been running). Health monitoring closes the reliability gap.
**Delivers:** Daily wishlist sync, stability alerts, snapshot cleanup, token validity monitoring, health check alerts, minutes budget tracking.
**Addresses:** Daily wishlist auto-sync, stability alerts, operational reliability
**Avoids:** Pitfalls P1 (cron reliability -- health monitoring), P2 (minutes budget -- tracking and adaptive frequency), P3 (token security -- audit and rotation procedures)
**Research needed:** No -- standard patterns for cron jobs and cleanup tasks.

### Phase Ordering Rationale

- **Foundation first** because schema changes are expensive and deployment must work before anything else is testable.
- **Data pipeline before notifications** because notifications without real data are untestable. The import + price check flow validates the entire data model.
- **Notifications before automation** because manual import + hourly checks deliver the core value. Auto-sync and stability alerts are refinements.
- **Operations last** because monitoring and cleanup are only meaningful once the system is running in production with real users.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** CardTrader API behavior needs live validation -- 25-product limit handling, rate limit enforcement, token scopes, response format for marketplace endpoint, and whether CT Zero filtering is available via API parameters or must be done client-side.
- **Phase 3:** Telegram webhook + Supabase Edge Function cold start interaction. Verify webhook reliability with `getWebhookInfo` after setup.

Phases with standard patterns (skip research-phase):
- **Phase 1:** React SPA + Supabase Auth + GitHub Pages deployment are extremely well-documented.
- **Phase 4:** Cron job orchestration, data cleanup, and health monitoring are standard DevOps patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core stack is solid. Version numbers need verification (Vite, Tailwind v4, React Router v7 hash routing). All are verifiable with `npm view`. |
| Features | HIGH | Feature landscape is well-understood from PROJECT.md and competitive analysis. CardTrader niche is clear and validated. |
| Architecture | MEDIUM-HIGH | Four-layer architecture is sound. Schema design is detailed. Scaling wall at ~150 users is a known constraint. Blueprint deduplication pattern is critical. |
| Pitfalls | MEDIUM-HIGH | Operational pitfalls (cron, minutes, pausing) are well-documented. CardTrader API-specific pitfalls (25-product limit, token scopes) need live validation. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **CardTrader API token scopes**: Unknown whether read-only tokens exist. If not, storing tokens with write access is a larger security risk. Validate during Phase 2 planning.
- **CardTrader API currency behavior**: Unknown whether marketplace prices are returned in buyer's currency or seller's. Must test with live API before finalizing price storage schema.
- **Tailwind CSS v4 maturity**: v4 was new in early 2025. Plugin ecosystem (especially `prettier-plugin-tailwindcss`) may have gaps. Verify or fall back to v3.4.
- **GitHub Actions minutes under real load**: The 1,620 min/month estimate is theoretical. Actual usage depends on CardTrader API response times and npm cache hit rates. Must measure in first week of Phase 2.
- **Supabase free tier limits**: Storage (500 MB), bandwidth (5 GB), and Edge Function invocations (500K) need monitoring. Limits may have changed since training data cutoff.

## Sources

### Primary (HIGH confidence)
- Project design document (`docs/plans/2026-02-01-cardtrader-monitor-design.md`)
- Project requirements (`.planning/PROJECT.md`)
- CardTrader API skill file (`.agents/skills/cardtrader-api/SKILL.md`)
- PostgreSQL documentation (upsert, date types, pgcrypto, RLS)
- Telegram Bot API documentation

### Secondary (MEDIUM confidence)
- React 19, Vite 6, Tailwind v4 release announcements (training data, May 2025 cutoff)
- Supabase documentation (Edge Functions, free tier limits -- may have changed)
- GitHub Actions scheduled events behavior (known patterns, policies may have updated)
- grammY vs Telegraf comparison (npm trends, GitHub activity)
- Competitor feature sets (MTGGoldfish, TCGPlayer, EchoMTG -- training data, not live-verified)

### Tertiary (LOW confidence)
- Exact version numbers for all npm packages (must verify with `npm view`)
- Supabase free tier current limits (verify at supabase.com/pricing)

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*
