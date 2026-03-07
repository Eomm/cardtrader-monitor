# Phase 3: Dashboard - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse their monitored cards, filter by name, view card details with full properties, configure notification rules (threshold and stability), and toggle CT Zero filtering. Card detail page allows editing rules and stopping monitoring. Condition, language, and foil filters are read-only (managed on CardTrader).

</domain>

<decisions>
## Implementation Decisions

### Card list layout
- Compact list rows instead of card grid — small thumbnail, name, language flag, price, price change
- Language displayed as country flag emoji (not text abbreviation)
- Sorted by price ascending by default (cheapest first), no user-facing sort controls
- Inactive/stopped cards shown dimmed at the bottom of the list
- No rule status badges on list items — keep it minimal
- Text search input above the list filtering by card name only

### Card detail page
- Click card row navigates to `/cards/:id` (full page, bookmarkable URL)
- Click on the price redirects to CardTrader listing: `https://www.cardtrader.com/it/cards/${blueprint_id}` (new tab)
- Layout: card image on the left, info sections stacked on the right
- Three info sections: (1) Price (current + baseline + change %), (2) Card properties, (3) Rule editor
- No explicit back button — users rely on browser back or navbar "Dashboard" link
- "Stop monitoring" button on the detail page — sets `is_active = false`, card excluded from price scrape job

### Card properties display
- Card list: name + language flag emoji + price info only
- Card detail page: shows all properties — condition, language, foil, CT Zero
- Condition, language, foil are read-only (imported from CardTrader wishlist, edited there only)
- CT Zero is the only editable filter — can be toggled from this app on the detail page

### Notification rules
- Two rule types: **threshold** (notify when price moves X% from baseline) and **stability** (notify when price stays within Y% range for N consecutive days)
- A card can have multiple rules (X rules per card)
- Rules stored as JSONB array in the existing `notification_rule` column on `monitored_cards`
- Threshold rule fields: percentage (free number input), direction (up/down/both), enabled toggle
- Stability rule fields: range percentage, consecutive days, enabled toggle
- Rule type selection via tabs or toggle on the detail page
- Explicit save button (not auto-save)

### Claude's Discretion
- Compact row exact layout and spacing
- Mobile responsive behavior for detail page (image left/info right may stack on small screens)
- Loading and error states
- How the "stop monitoring" confirmation works (if any)
- Stability rule default values
- Flag emoji mapping from CardTrader language codes

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CardItem.tsx`: Current card component with `MonitoredCardWithPrice` type, `PriceChange` component, `formatEur` helper — will be refactored to compact row layout
- `CardList.tsx`: Grid wrapper — will be refactored to list layout
- `DashboardPage.tsx`: Fetches cards + latest prices, handles empty/loading/error states — extend with search filter and sorting
- `cardtrader-types.ts`: `NotificationRule` interface (needs update for array + stability type), `CardFilters` interface
- `supabase.ts`: Supabase client singleton
- `Navbar.tsx`: Top navbar with Dashboard/Settings links

### Established Patterns
- Tailwind CSS with 5-color custom theme (Deep Space Blue, Papaya Whip, Flag Red, Steel Blue, Molten Lava)
- System dark/light mode via `prefers-color-scheme`
- Green = price dropped (good for buyer), Red = price rose (bad for buyer)
- Two separate Supabase queries merged in JS (cards + snapshots)
- RLS policies scoped to user via wishlists chain
- Biome for linting/formatting

### Integration Points
- New route: `/cards/:id` for card detail page (React Router)
- `monitored_cards.notification_rule` column: migrate from single object to JSONB array
- `monitored_cards.is_active`: already exists, used by price scrape job
- `monitored_cards.only_zero`: editable from detail page (CT Zero toggle)
- `price_snapshots`: read for current + baseline price display

</code_context>

<specifics>
## Specific Ideas

- Price click links to CardTrader: `https://www.cardtrader.com/it/cards/${blueprint_id}`
- Stability alerts pulled from v2 (PRIC-06) into Phase 3 scope
- Inactive cards should still be visible but greyed out at the bottom — user can reactivate from detail page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (stability alerts were explicitly pulled in)

</deferred>

---

*Phase: 03-dashboard*
*Context gathered: 2026-03-07*
