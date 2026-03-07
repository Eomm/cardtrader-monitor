# Requirements: CardTrader Monitor

**Defined:** 2026-03-07
**Core Value:** Users get notified about meaningful price movements on cards they care about — so they can act on deals without constantly checking CardTrader.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign in with Google OAuth via Supabase
- [x] **AUTH-02**: User session persists across browser refresh
- [x] **AUTH-03**: User can log out from any page

### Settings

- [x] **SETT-01**: User can add their CardTrader API token (stored encrypted)
- [x] **SETT-02**: User can update or remove their CardTrader API token

### Wishlist Import

- [x] **WISH-01**: User can import a wishlist by pasting a CardTrader wishlist URL
- [x] **WISH-02**: Imported cards include name, expansion, image, game, and collector number
- [x] **WISH-03**: Each imported card gets a default threshold notification rule
- [ ] **WISH-04**: Wishlist auto-syncs daily via GitHub Actions (adds new cards, deactivates removed ones)

### Price Tracking

- [x] **PRIC-01**: Hourly GitHub Actions job fetches current prices for all active monitored cards
- [x] **PRIC-02**: Price fetches are deduplicated by blueprint ID across users (one API call per unique card)
- [x] **PRIC-03**: Each card stores a baseline price set at import time
- [x] **PRIC-04**: Daily price snapshots are retained for a configurable number of days per card
- [ ] **PRIC-05**: Snapshots older than the retention window are cleaned up automatically

### Card Filtering

- [x] **FILT-01**: User can filter monitored card results by condition (NM, LP, etc.)
- [x] **FILT-02**: User can filter monitored card results by language
- [x] **FILT-03**: User can filter monitored card results by foil status
- [x] **FILT-04**: User can filter to CardTrader Zero listings only

### Notification Rules

- [x] **RULE-01**: User can set a threshold alert per card (notify when price moves X% from baseline, up or down)
- [x] **RULE-02**: User can enable or disable notifications per card
- [x] **RULE-03**: Threshold alert evaluates current cheapest matching price vs baseline price

### Notifications

- [ ] **NOTF-01**: User receives a Telegram message when a threshold alert triggers
- [x] **NOTF-02**: Telegram notification includes card name, old price, new price, and percentage change
- [x] **NOTF-03**: Telegram notification includes a direct link to the CardTrader listing
- [ ] **NOTF-04**: Sent notifications are logged in the database

### Dashboard

- [x] **DASH-01**: User can view all monitored cards with current price and active rule
- [x] **DASH-02**: User can click a card to view its detail page
- [x] **DASH-03**: Card detail page shows current price, baseline price, and rule configuration
- [x] **DASH-04**: User can edit notification rule from the card detail page

### Code Quality

- [x] **QUAL-01**: Project uses Biome for linting and formatting
- [x] **QUAL-02**: Biome runs in CI on push/PR via GitHub Actions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-05**: Telegram connection flow (link account via /start token in bot)
- **NOTF-06**: Inline Telegram button to reset baseline price from notification

### Price Tracking

- **PRIC-06**: Stability alerts — notify when price stays within Y% range for N consecutive days
- **PRIC-07**: User can manually reset baseline price from the web dashboard

### Dashboard

- **DASH-05**: Price history chart per card
- **DASH-06**: Notification history view
- **DASH-07**: Bulk rule editing across multiple cards

### Wishlist

- **WISH-05**: Support multiple wishlists per user

### Card Filtering

- **FILT-05**: Filter by reverse foil status
- **FILT-06**: Filter by first edition status

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-marketplace price comparison | Scope explosion — different product entirely |
| Collection value tracking / portfolio | EchoMTG's domain, not a wishlist monitor |
| Deck building / deck pricing | Moxfield, Archidekt already do this |
| Price prediction / trend analysis | Unreliable, requires ML and large datasets |
| Email notifications | Small friend group, Telegram is sufficient |
| In-app real-time notifications | GitHub Pages SPA cannot maintain WebSocket |
| Mobile app | Web is mobile-responsive, Telegram handles push |
| Manual card addition (not from wishlist) | Complex UI for marginal value — manage wishlist on CardTrader |
| Social features | Privacy concerns, feature creep for small group |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Foundation | Complete |
| AUTH-02 | Phase 1: Foundation | Complete |
| AUTH-03 | Phase 1: Foundation | Complete |
| SETT-01 | Phase 1: Foundation | Complete |
| SETT-02 | Phase 1: Foundation | Complete |
| QUAL-01 | Phase 1: Foundation | Complete |
| QUAL-02 | Phase 1: Foundation | Complete |
| WISH-01 | Phase 2: Data Pipeline | Complete |
| WISH-02 | Phase 2: Data Pipeline | Complete |
| WISH-03 | Phase 2: Data Pipeline | Complete |
| PRIC-01 | Phase 2: Data Pipeline | Complete |
| PRIC-02 | Phase 2: Data Pipeline | Complete |
| PRIC-03 | Phase 2: Data Pipeline | Complete |
| PRIC-04 | Phase 2: Data Pipeline | Complete |
| DASH-01 | Phase 3: Dashboard | Complete |
| DASH-02 | Phase 3: Dashboard | Complete |
| DASH-03 | Phase 3: Dashboard | Complete |
| DASH-04 | Phase 3: Dashboard | Complete |
| FILT-01 | Phase 3: Dashboard | Complete |
| FILT-02 | Phase 3: Dashboard | Complete |
| FILT-03 | Phase 3: Dashboard | Complete |
| FILT-04 | Phase 3: Dashboard | Complete |
| RULE-01 | Phase 3: Dashboard | Complete |
| RULE-02 | Phase 3: Dashboard | Complete |
| RULE-03 | Phase 4: Notifications | Complete |
| NOTF-01 | Phase 4: Notifications | Pending |
| NOTF-02 | Phase 4: Notifications | Complete |
| NOTF-03 | Phase 4: Notifications | Complete |
| NOTF-04 | Phase 4: Notifications | Pending |
| WISH-04 | Phase 5: Automation | Pending |
| PRIC-05 | Phase 5: Automation | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after roadmap creation*
