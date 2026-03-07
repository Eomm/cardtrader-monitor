# CardTrader Monitor

## What This Is

A web application that lets a small group of users track price changes for trading cards in their CardTrader wishlists and receive Telegram notifications when prices cross configurable thresholds or remain stable over time. Built entirely on free-tier services.

## Core Value

Users get notified about meaningful price movements on cards they care about — so they can act on deals without constantly checking CardTrader.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Google OAuth authentication via Supabase
- [ ] CardTrader wishlist import via API (extract cards and metadata)
- [ ] Per-card notification rules: threshold alerts (price moves X% from baseline)
- [ ] Per-card notification rules: stability alerts (price stays within Y% range for N days)
- [ ] Baseline price set on import, manually resettable from notification link
- [ ] Daily price snapshots retained for N days (configurable), older cleaned up
- [ ] Hourly price checking via GitHub Actions
- [ ] Daily wishlist sync via GitHub Actions
- [ ] Telegram notifications for triggered alerts
- [ ] Telegram bot connection flow (link account via /start token)
- [ ] Web dashboard to view monitored cards, current prices, and manage rules
- [ ] Card detail page with price history and rule configuration
- [ ] Settings page for CardTrader API token and Telegram connection
- [ ] Card-specific filters: condition, language, foil, CardTrader Zero only, etc.

### Out of Scope

- Manual card addition (not from wishlist) — not needed for MVP
- Real-time chat or in-app notifications — Telegram is the notification channel
- Mobile app — web-first
- Price history charts — defer to post-MVP polish
- OAuth providers beyond Google — Google is sufficient for the user group
- Notification preferences beyond per-card rules — keep it simple

## Context

- Existing design doc at `docs/plans/2026-02-01-cardtrader-monitor-design.md` covers architecture, DB schema, API flows, and free-tier analysis. The infrastructure architecture (Supabase + GitHub Pages + GitHub Actions) is confirmed good.
- **Key change from original design:** Price tracking model reworked. Instead of naive "last 3 snapshots" comparison, the new model uses:
  - A **baseline price** (set at import, manually resettable) as the reference point
  - **Daily snapshots** retained for a configurable window (e.g. 14-30 days)
  - **Threshold alerts**: notify when current price vs baseline crosses ±X%
  - **Stability alerts**: notify when price stays within Y% range for N consecutive days
- Target audience: small group of friends, using Google login via Supabase Auth
- CardTrader API: 200 req/10s general, 10 req/s marketplace. No monthly limit.
- CardTrader concept: "blueprint" = unique sellable card identity

## Constraints

- **Budget**: Zero — all services must use free tiers (Supabase, GitHub Pages, GitHub Actions)
- **Tech stack**: React + Vite + Tailwind on GitHub Pages, Supabase (Postgres + Edge Functions + Auth), GitHub Actions for background jobs
- **GitHub Actions limit**: 2,000 min/month — hourly price checks + daily sync must fit
- **Supabase free tier**: 500 MB storage, 500K edge function invocations/month, 5 GB bandwidth
- **Deployment**: GitHub Pages for frontend, Supabase Edge Functions for API, GitHub Actions for cron jobs

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase + GitHub Pages + GitHub Actions stack | Zero-cost, sufficient for small user group | — Pending |
| Baseline price model (not rolling average) | Simpler, user controls the reference point | — Pending |
| Daily snapshots (not hourly retention) | Enough for stability detection, keeps storage lean | — Pending |
| Per-card rule configuration | Different cards have different value patterns | — Pending |
| Google OAuth only | Sufficient for friend group, simplest to set up | — Pending |

---
*Last updated: 2026-03-07 after initialization*
