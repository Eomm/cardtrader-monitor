# Phase 7: UI Usability Improvements - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve dashboard usability with inline rule editing from card rows, a new fixed-price threshold rule type, wishlist-based card filtering, and persistent filter state across page reloads. No new pages or backend services — all improvements are within existing UI components.

</domain>

<decisions>
## Implementation Decisions

### Inline rule editing on dashboard
- Each card row shows the first rule's primary value as an always-visible input field
- Input adapts to rule type: shows `%` suffix for threshold rules, `EUR` suffix for fixed price rules, `days` suffix for stability rules
- Direction shown as read-only emoji indicator next to the input (up/down/both arrows)
- Only the threshold value is editable inline; direction and other settings stay on card detail page
- Auto-save on blur or Enter keypress — no save button needed
- Brief success feedback (e.g. checkmark flash) after save
- If a card has no rules, show a placeholder or empty state in the rule column

### Fixed price threshold rule
- New rule type: `fixed_price` — alerts when cheapest price crosses an absolute EUR amount
- Same structure as percentage threshold: direction (up/down/both) + enabled toggle
- Value is an absolute EUR amount with 2 decimal places (e.g. 3.50)
- A card can have multiple rules of any type simultaneously — all rules are independent
- Each rule evaluates independently; any triggered rule sends a notification
- RuleEditor on card detail page gets a third tab: "Fixed Price" alongside "Threshold" and "Stability"
- Fixed price tab UI mirrors threshold tab: EUR amount input + direction selector + enabled toggle + remove button

### Wishlist filter
- Claude's Discretion — not discussed in detail
- Add a filter/dropdown on dashboard to show cards from a specific wishlist
- Use existing `wishlist_id` foreign key on monitored_cards

### Persistent filters
- Claude's Discretion — not discussed in detail
- Persist dashboard filter state (search, expansion, wishlist, any new filters) across page reloads
- localStorage is the expected approach

### Claude's Discretion
- Wishlist filter UI design (dropdown, tabs, or toggle)
- Persistent filter implementation details (localStorage keys, serialization)
- Inline rule input width, styling, and mobile responsiveness
- Direction emoji choice (arrows, icons, or symbols)
- Success feedback animation/design for inline save
- How to handle inline display when first rule is a stability rule
- Fixed price rule default values when creating a new one
- Empty state when card has no rules (in card row)
- Filter indicator/reset button on dashboard

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CardRow.tsx`: Compact card row — needs inline rule input column added
- `CardList.tsx`: Dashboard card list with search + expansion filter — extend with wishlist filter + persistence
- `RuleEditor.tsx`: Tabbed rule editor (threshold + stability) — add third "Fixed Price" tab
- `cardtrader-types.ts`: `ThresholdRule`, `StabilityRule`, `NotificationRule` union — add `FixedPriceRule` type
- `cardtrader-utils.ts`: `filterCtZeroOffers()` — threshold evaluation logic needs fixed-price support
- `PriceDisplay.tsx`: `formatEur` helper — reuse for fixed price display

### Established Patterns
- Dark modern palette: slate scale, blue-500 interactive (Phase 6)
- CT Zero toggle auto-saves immediately — inline rule save follows same pattern
- Rules stored as JSONB array in `monitored_cards.notification_rule`
- Explicit save in RuleEditor on detail page (card detail keeps this pattern)
- React hooks only for state management (useState, useCallback, useEffect)

### Integration Points
- `CardRow` component: add rule value column with inline input
- `CardList` component: add wishlist filter dropdown, persist filters to localStorage
- `RuleEditor`: add FixedPriceRule tab
- `cardtrader-types.ts`: extend NotificationRule union with FixedPriceRule
- `fetch-prices.ts` / threshold evaluation: support fixed price comparison (absolute EUR vs current price)
- `monitored_cards.notification_rule`: no schema change needed (JSONB array already flexible)

</code_context>

<specifics>
## Specific Ideas

- Inline input adapts display based on first rule type — % for threshold, EUR for fixed price, days for stability
- Direction shown as emoji, consistent between card row and card detail page
- Auto-save on blur/Enter for inline editing, matching CT Zero toggle's immediate-save pattern

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-ui-usability-improvements-wishlist-filter-persistent-filters-threshold-ux-fixed-price-threshold-rule*
*Context gathered: 2026-03-12*
