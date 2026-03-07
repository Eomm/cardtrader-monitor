# Phase 3: Dashboard - Research

**Researched:** 2026-03-07
**Domain:** React SPA dashboard -- card list refactoring, detail page routing, JSONB rule editing, client-side filtering
**Confidence:** HIGH

## Summary

Phase 3 transforms the existing card grid into a compact list with text search, adds a detail page at `/cards/:id` with price info and rule editing, and implements client-side filtering. The existing codebase already has React Router v7, Supabase client, Tailwind v4 with a 5-color theme, and all necessary database tables with RLS policies. The `monitored_cards` table already stores `condition_required`, `language_required`, `foil_required`, and `only_zero` columns -- filters will read these for display and `only_zero` is the only editable one.

The main technical work is: (1) refactoring `CardItem`/`CardList` from grid to compact rows, (2) adding a `/cards/:id` route with `useParams`, (3) extending `NotificationRule` type to support an array of threshold + stability rules stored as JSONB, (4) building a rule editor form with explicit save, and (5) implementing a "stop monitoring" action that sets `is_active = false`.

**Primary recommendation:** Keep all state management local (useState/useCallback). No state library needed for this scope. Client-side filtering is sufficient since all cards are already fetched. The `notification_rule` column migration from single object to JSONB array requires a database migration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Compact list rows instead of card grid -- small thumbnail, name, language flag, price, price change
- Language displayed as country flag emoji (not text abbreviation)
- Sorted by price ascending by default (cheapest first), no user-facing sort controls
- Inactive/stopped cards shown dimmed at the bottom of the list
- No rule status badges on list items -- keep it minimal
- Text search input above the list filtering by card name only
- Click card row navigates to `/cards/:id` (full page, bookmarkable URL)
- Click on the price redirects to CardTrader listing: `https://www.cardtrader.com/it/cards/${blueprint_id}` (new tab)
- Layout: card image on the left, info sections stacked on the right
- Three info sections: (1) Price (current + baseline + change %), (2) Card properties, (3) Rule editor
- No explicit back button -- users rely on browser back or navbar "Dashboard" link
- "Stop monitoring" button on the detail page -- sets `is_active = false`, card excluded from price scrape job
- Card list: name + language flag emoji + price info only
- Card detail page: shows all properties -- condition, language, foil, CT Zero
- Condition, language, foil are read-only (imported from CardTrader wishlist, edited there only)
- CT Zero is the only editable filter -- can be toggled from this app on the detail page
- Two rule types: threshold (notify when price moves X% from baseline) and stability (notify when price stays within Y% range for N consecutive days)
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope (stability alerts were explicitly pulled in)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | User can view all monitored cards with current price and active rule | Refactored CardList with compact rows, price display using existing `PriceChange` component |
| DASH-02 | User can click a card to view its detail page | New `/cards/:id` route using React Router v7 `useParams` |
| DASH-03 | Card detail page shows current price, baseline price, and rule configuration | Detail page layout with three info sections; price click links to CardTrader |
| DASH-04 | User can edit notification rule from the card detail page | Rule editor form with threshold + stability tabs, explicit save via Supabase update |
| FILT-01 | User can filter monitored card results by condition | Detail page shows condition read-only; DashboardPage already fetches `condition_required` |
| FILT-02 | User can filter monitored card results by language | Detail page shows language as flag emoji read-only; list shows flag emoji |
| FILT-03 | User can filter monitored card results by foil status | Detail page shows foil status read-only |
| FILT-04 | User can filter to CardTrader Zero listings only | Detail page has CT Zero toggle that updates `only_zero` column |
| RULE-01 | User can set a threshold alert per card | Threshold rule editor: percentage input, direction selector, enabled toggle |
| RULE-02 | User can enable or disable notifications per card | Each rule has an `enabled` toggle; save persists to `notification_rule` JSONB array |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.0 | UI framework | Already in project |
| react-router | ^7.13.0 | Client routing, `useParams` for `/cards/:id` | Already in project |
| @supabase/supabase-js | ^2.0.0 | Database client, RLS-scoped queries | Already in project |
| tailwindcss | ^4.0.0 | Styling with custom theme | Already in project |
| vitest | ^4.0.18 | Test framework | Already in project |

### Supporting (no new dependencies needed)
No new libraries required. This phase uses only existing dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local useState | zustand/jotai | Overkill -- only 1 page fetches cards, detail page fetches single card |
| Client-side filter | Server-side Supabase filter | Unnecessary -- user has < 500 cards, all already loaded |
| react-hook-form | Controlled inputs | Overkill for 2-3 form fields per rule |

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    CardRow.tsx          # Compact list row (replaces grid CardItem)
    CardList.tsx         # Refactored: list layout with search input
    RuleEditor.tsx       # Threshold + stability rule tabs with form
    PriceDisplay.tsx     # Reusable price with change % (extracted from CardItem)
    FlagEmoji.tsx        # Language code to flag emoji mapper
  pages/
    DashboardPage.tsx    # Refactored: fetch all cards (active + inactive), search filter, sorted list
    CardDetailPage.tsx   # New: single card detail with rule editor
  lib/
    cardtrader-types.ts  # Updated NotificationRule union type + StabilityRule
    cardtrader-utils.ts  # Updated createDefaultNotificationRule, add language flag mapping
    supabase.ts          # Unchanged
```

### Pattern 1: React Router v7 Dynamic Route
**What:** Add `/cards/:id` route to App.tsx for card detail
**When to use:** Navigating to individual card pages
**Example:**
```typescript
// App.tsx -- add new route inside Routes
<Route
  path="/cards/:id"
  element={
    <ProtectedRoute>
      <AuthenticatedLayout>
        <CardDetailPage />
      </AuthenticatedLayout>
    </ProtectedRoute>
  }
/>

// CardDetailPage.tsx
import { useParams } from 'react-router';
function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  // fetch single card by id from supabase
}
```

### Pattern 2: JSONB Array Notification Rules
**What:** Store rules as JSON array in `notification_rule` column
**When to use:** Saving/loading rules for a card
**Example:**
```typescript
// Updated types
type ThresholdRule = {
  type: 'threshold';
  threshold_percent: number;
  direction: 'up' | 'down' | 'both';
  enabled: boolean;
};

type StabilityRule = {
  type: 'stability';
  range_percent: number;
  consecutive_days: number;
  enabled: boolean;
};

type NotificationRule = ThresholdRule | StabilityRule;

// Column stores: NotificationRule[] (JSON array)

// Save rules
await supabase
  .from('monitored_cards')
  .update({ notification_rule: rules })
  .eq('id', cardId);
```

### Pattern 3: Client-Side Search Filter
**What:** Filter card list by name using useState
**When to use:** Text search above card list
**Example:**
```typescript
const [search, setSearch] = useState('');
const filtered = cards.filter(c =>
  c.card_name.toLowerCase().includes(search.toLowerCase())
);
```

### Pattern 4: Inactive Cards Sorting
**What:** Sort active cards by price ascending, inactive dimmed at bottom
**When to use:** DashboardPage card list rendering
**Example:**
```typescript
const sorted = [...cards].sort((a, b) => {
  // Inactive cards go to bottom
  if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
  // Then sort by price ascending (null prices at end)
  const priceA = a.latest_price_cents ?? Number.MAX_SAFE_INTEGER;
  const priceB = b.latest_price_cents ?? Number.MAX_SAFE_INTEGER;
  return priceA - priceB;
});
```

### Anti-Patterns to Avoid
- **Fetching card detail with a separate RPC:** Use standard `.select('*').eq('id', id).single()` -- RLS already scopes to user via wishlist chain
- **Auto-saving rules on every keystroke:** User decided explicit save button. Use local form state, commit on save click
- **Building a custom router for detail pages:** Use React Router's existing `useParams` -- already installed and configured
- **Storing rules in a separate table:** User decided JSONB array on `monitored_cards.notification_rule` -- no new table needed

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flag emoji from language code | Custom SVG flags | Unicode flag emoji via regional indicator symbols | 2-line utility function, works everywhere |
| URL routing with params | Hash-based routing | React Router v7 `useParams` | Already configured in project |
| Form validation | Custom validation logic | HTML5 `min`/`max`/`required` attributes + simple checks | Few fields, no complex validation needed |
| Price formatting | New formatter | Existing `formatEur()` helper | Already built and tested |

**Key insight:** This phase is mostly UI refactoring and a new page. No new infrastructure is needed.

## Common Pitfalls

### Pitfall 1: JSONB Migration Breaking Existing Data
**What goes wrong:** Existing `notification_rule` column stores a single object `{type: "threshold", ...}`. Changing to an array without migrating data breaks reads.
**Why it happens:** The import-wishlist Edge Function writes a single object, not an array.
**How to avoid:** Database migration must: (1) wrap existing single objects in an array `[existing_rule]`, (2) update the Edge Function to write arrays. Handle both formats defensively in the frontend during transition.
**Warning signs:** Cards imported before migration show "undefined" or crash on detail page.

### Pitfall 2: React Router basename with new route
**What goes wrong:** `/cards/:id` route 404s on page refresh because the app uses `basename="/cardtrader-monitor/"` (GitHub Pages SPA).
**Why it happens:** GitHub Pages needs a 404.html fallback that redirects to index.html.
**How to avoid:** Verify the existing 404.html redirect handles all sub-paths. The route should be `/cards/:id` relative to basename, so the full URL is `/cardtrader-monitor/cards/uuid`.
**Warning signs:** Direct URL access or browser refresh returns 404.

### Pitfall 3: Fetching Only Active Cards
**What goes wrong:** Current `DashboardPage` only fetches `is_active = true`. User decided inactive cards should show dimmed at bottom.
**Why it happens:** Easy to miss updating the query filter.
**How to avoid:** Remove `.eq('is_active', true)` filter, fetch all cards, sort with inactive at bottom.
**Warning signs:** "Stopped" cards disappear from the list entirely.

### Pitfall 4: Price Snapshots for Inactive Cards
**What goes wrong:** Inactive cards have no recent price snapshots (scraper skips them), so `latest_price_cents` is null or stale.
**Why it happens:** Price scrape job excludes `is_active = false` cards.
**How to avoid:** Display the last known price for inactive cards with a "stale" indicator or just show the last snapshot price. Don't treat null price on inactive cards as an error.
**Warning signs:** Inactive cards show "---" instead of their last known price.

### Pitfall 5: Supabase Update RLS for monitored_cards
**What goes wrong:** Update to `notification_rule` or `only_zero` or `is_active` fails silently.
**Why it happens:** RLS policy for `monitored_cards_update` checks wishlist ownership. Should work, but the update call must not try to change `wishlist_id`.
**How to avoid:** Only update specific columns: `notification_rule`, `only_zero`, `is_active`. Check for errors in the Supabase response.
**Warning signs:** Save button appears to work but data doesn't persist on refresh.

## Code Examples

### Language Code to Flag Emoji
```typescript
// CardTrader uses language strings like "en", "it", "de", "fr", "es", "pt", "ja", "ko", "zh"
// Map to ISO 3166-1 alpha-2 country codes for flag emoji
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'GB', // English -> UK flag
  it: 'IT',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  pt: 'PT',
  ja: 'JP',
  ko: 'KR',
  zh: 'CN',
  ru: 'RU',
};

function languageToFlag(lang: string): string {
  const country = LANGUAGE_TO_COUNTRY[lang.toLowerCase()];
  if (!country) return lang.toUpperCase(); // fallback to text
  return String.fromCodePoint(
    ...country.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}
```

### Compact Card Row
```typescript
// Compact row: thumbnail (40x56 for 3:4 aspect) | name + flag | price + change
<div
  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-steel/20
    hover:bg-steel/5 cursor-pointer transition-colors"
  onClick={() => navigate(`/cards/${card.id}`)}
>
  <img src={card.image_url} className="h-14 w-10 object-contain rounded" />
  <div className="flex-1 min-w-0">
    <span className="truncate font-medium">{card.card_name}</span>
    <span className="ml-1">{languageToFlag(card.language_required)}</span>
  </div>
  <div className="text-right">
    <div className="text-sm font-medium">{formatEur(card.latest_price_cents)}</div>
    <PriceChange baseline={card.baseline_price_cents} current={card.latest_price_cents} />
  </div>
</div>
```

### Stop Monitoring Action
```typescript
async function stopMonitoring(cardId: string) {
  const { error } = await supabase
    .from('monitored_cards')
    .update({ is_active: false })
    .eq('id', cardId);
  if (error) throw error;
}
```

### Save Notification Rules
```typescript
async function saveRules(cardId: string, rules: NotificationRule[]) {
  const { error } = await supabase
    .from('monitored_cards')
    .update({ notification_rule: rules })
    .eq('id', cardId);
  if (error) throw error;
}
```

### Database Migration: notification_rule to Array
```sql
-- Wrap existing single-object notification_rule values in an array
UPDATE public.monitored_cards
SET notification_rule = jsonb_build_array(notification_rule)
WHERE notification_rule IS NOT NULL
  AND jsonb_typeof(notification_rule) = 'object';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single notification rule object | JSONB array of rules | Phase 3 migration | Supports multiple rule types per card |
| Card grid layout | Compact list rows | Phase 3 refactor | Better density, faster scanning |
| Active cards only | Active + inactive cards | Phase 3 refactor | Users can see stopped cards |

**Deprecated/outdated:**
- `CardItem.tsx` grid card layout: will be replaced by compact row component
- Single `NotificationRule` type: will become a union type (ThresholdRule | StabilityRule)

## Open Questions

1. **GitHub Pages 404.html redirect**
   - What we know: App uses `basename="/cardtrader-monitor/"` for GH Pages
   - What's unclear: Whether the existing 404.html handles sub-path routing for `/cards/:id`
   - Recommendation: Verify or create a 404.html that redirects all sub-paths to index.html

2. **Stability rule default values**
   - What we know: Threshold defaults are 20% / both / enabled
   - What's unclear: What defaults make sense for stability (range %, consecutive days)
   - Recommendation: Default to 5% range, 3 consecutive days, enabled. These are reasonable "the price isn't moving" thresholds.

3. **Edge Function update for array rules**
   - What we know: `import-wishlist` Edge Function currently writes a single object to `notification_rule`
   - What's unclear: Whether to update it in this phase or Phase 5
   - Recommendation: Update in this phase alongside the migration -- write `[createDefaultNotificationRule()]` instead of `createDefaultNotificationRule()`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Card list renders with price data | manual-only | N/A -- React component rendering | N/A |
| DASH-02 | Navigate to card detail page | manual-only | N/A -- React Router navigation | N/A |
| DASH-03 | Detail page shows prices and rules | manual-only | N/A -- React component rendering | N/A |
| DASH-04 | Edit and save notification rules | unit | `npx vitest run tests/notification-rule.test.ts -t` | Partial (exists but needs array update) |
| FILT-01 | Filter by condition | manual-only | N/A -- UI filter display | N/A |
| FILT-02 | Filter by language + flag emoji | unit | `npx vitest run tests/flag-emoji.test.ts` | No -- Wave 0 |
| FILT-03 | Filter by foil status | manual-only | N/A -- UI filter display | N/A |
| FILT-04 | Toggle CT Zero filter | manual-only | N/A -- Supabase update | N/A |
| RULE-01 | Set threshold alert rule | unit | `npx vitest run tests/notification-rule.test.ts` | Partial |
| RULE-02 | Enable/disable notifications | unit | `npx vitest run tests/notification-rule.test.ts` | Partial |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/flag-emoji.test.ts` -- covers language code to flag emoji mapping (FILT-02)
- [ ] Update `tests/notification-rule.test.ts` -- update for array format and stability rule type (DASH-04, RULE-01, RULE-02)
- [ ] `tests/card-sorting.test.ts` -- covers inactive-at-bottom + price-ascending sort logic (DASH-01)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/App.tsx`, `src/pages/DashboardPage.tsx`, `src/components/CardItem.tsx`, `src/components/CardList.tsx`
- Codebase analysis: `src/lib/cardtrader-types.ts`, `src/lib/cardtrader-utils.ts`
- Codebase analysis: `supabase/migrations/00001_initial_schema.sql`, `00002_data_pipeline.sql`
- React Router v7 `useParams` -- standard API, already used in project via react-router ^7.13.0

### Secondary (MEDIUM confidence)
- CardTrader language codes inferred from `WishlistItem.language` type (string) and `properties_hash.mtg_language`
- Flag emoji mapping based on standard Unicode Regional Indicator Symbols

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libs already installed and used
- Architecture: HIGH -- straightforward React page + component refactoring with existing patterns
- Pitfalls: HIGH -- identified from direct codebase analysis (existing queries, RLS policies, data format)

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- no moving parts)
