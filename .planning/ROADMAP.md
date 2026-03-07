# Roadmap: CardTrader Monitor

## Overview

CardTrader Monitor delivers price monitoring for trading card wishlists in five phases. We start with the foundation (auth, deployment, schema), then build the data pipeline (wishlist import, price fetching), expose it through a dashboard (card views, filtering, rule management), wire up the core value (Telegram notifications when prices cross thresholds), and finish with automation (daily sync, cleanup). Each phase delivers a coherent, testable capability that builds on the previous one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, settings, deployment pipeline, database schema, and code quality tooling
- [ ] **Phase 2: Data Pipeline** - Wishlist import from CardTrader, hourly price fetching, baseline prices, and snapshot storage
- [ ] **Phase 3: Dashboard** - Card list view, card detail page, filtering, and notification rule configuration
- [ ] **Phase 4: Notifications** - Telegram alert delivery when threshold rules trigger, with logging
- [ ] **Phase 5: Automation** - Daily wishlist sync, snapshot cleanup, and operational reliability

## Phase Details

### Phase 1: Foundation
**Goal**: Users can sign in, configure their CardTrader credentials, and see an empty dashboard -- all deployed and running on free-tier infrastructure
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, SETT-01, SETT-02, QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google, refresh the page and remain logged in, and log out from any page
  2. User can add, update, and remove their CardTrader API token from the settings page
  3. The SPA is deployed to GitHub Pages and accessible via URL with hash routing working correctly
  4. Biome linting and formatting runs in CI on every push/PR
  5. Database schema exists with all tables needed for the full application (profiles, monitored_cards, price_snapshots, notifications, etc.)
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Data Pipeline
**Goal**: Users can import their CardTrader wishlist and see cards with live prices fetched hourly
**Depends on**: Phase 1
**Requirements**: WISH-01, WISH-02, WISH-03, PRIC-01, PRIC-02, PRIC-03, PRIC-04
**Success Criteria** (what must be TRUE):
  1. User can paste a CardTrader wishlist URL and see imported cards appear with name, expansion, image, game, and collector number
  2. Each imported card has a baseline price set automatically and a default threshold notification rule created
  3. Hourly GitHub Actions job fetches current prices for all active cards, deduplicating API calls by blueprint ID
  4. Daily price snapshots are stored and retained for the configured number of days per card
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Dashboard
**Goal**: Users can browse their monitored cards, filter results, view card details, and configure notification rules
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, FILT-01, FILT-02, FILT-03, FILT-04, RULE-01, RULE-02
**Success Criteria** (what must be TRUE):
  1. User can view all monitored cards showing current price and active rule status
  2. User can filter the card list by condition, language, foil status, and CardTrader Zero listings
  3. User can click a card to see its detail page with current price, baseline price, and rule configuration
  4. User can set a threshold alert percentage and enable/disable notifications per card from the detail page
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Notifications
**Goal**: Users receive Telegram messages when card prices cross their configured thresholds
**Depends on**: Phase 3
**Requirements**: RULE-03, NOTF-01, NOTF-02, NOTF-03, NOTF-04
**Success Criteria** (what must be TRUE):
  1. When a card's cheapest matching price crosses the threshold percentage vs baseline, a Telegram message is sent to the user
  2. Telegram notification includes card name, old price, new price, percentage change, and a direct link to the CardTrader listing
  3. All sent notifications are logged in the database with timestamp and details
  4. Threshold evaluation runs as part of the hourly price check job (no separate workflow needed)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Automation
**Goal**: The system maintains itself -- wishlists stay in sync, old data is cleaned up, and the operational loop runs reliably
**Depends on**: Phase 4
**Requirements**: WISH-04, PRIC-05
**Success Criteria** (what must be TRUE):
  1. Daily GitHub Actions job syncs each user's wishlist -- adding new cards and deactivating removed ones
  2. Snapshots older than the retention window are automatically cleaned up
  3. The system handles GitHub Actions cron delays gracefully (gap-tolerant logic, no duplicate processing)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/? | Not started | - |
| 2. Data Pipeline | 0/? | Not started | - |
| 3. Dashboard | 0/? | Not started | - |
| 4. Notifications | 0/? | Not started | - |
| 5. Automation | 0/? | Not started | - |
