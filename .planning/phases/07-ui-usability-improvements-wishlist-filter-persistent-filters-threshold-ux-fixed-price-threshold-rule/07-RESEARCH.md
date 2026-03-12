# Phase 7: UI Usability Improvements - Research

**Researched:** 2026-03-12
**Domain:** React UI component extension, TypeScript type extension, localStorage persistence, inline editing patterns
**Confidence:** HIGH

## Summary

Phase 7 is a purely frontend, no-new-pages phase. All four features are self-contained enhancements to existing components:

1. **Inline rule editing on CardRow** — add an editable input column that auto-saves on blur/Enter, following the CT Zero toggle's immediate-save pattern already established in Phase 3.
2. **Fixed price threshold rule** — extend the `NotificationRule` union with a new `FixedPriceRule` type, add a third tab to `RuleEditor`, and extend `fetch-prices.ts` threshold evaluation to handle absolute EUR comparison alongside the existing percent-based comparison.
3. **Wishlist filter on CardList** — derive wishlist names from the existing `wishlist_id` FK on `MonitoredCardWithPrice` by fetching the `wishlists` table once, then drive a dropdown filter in `CardList`.
4. **Persistent filters** — serialize search, expansion, and wishlist filter state to `localStorage` in `CardList`, restoring on mount with `useEffect`.

No schema migration is needed. The `notification_rule` column is already `jsonb` array (flexible). The `wishlist_id` FK already exists on `monitored_cards`. No new Supabase queries for the inline rule save—it reuses the existing `supabase.update({ notification_rule: [...] })` pattern from `RuleEditor`.

**Primary recommendation:** Treat this as four small, sequential tasks sharing a single data-model extension step (add `FixedPriceRule` type first, then each UI feature follows naturally).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Inline rule editing on dashboard
- Each card row shows the first rule's primary value as an always-visible input field
- Input adapts to rule type: shows `%` suffix for threshold rules, `EUR` suffix for fixed price rules, `days` suffix for stability rules
- Direction shown as read-only emoji indicator next to the input (up/down/both arrows)
- Only the threshold value is editable inline; direction and other settings stay on card detail page
- Auto-save on blur or Enter keypress — no save button needed
- Brief success feedback (e.g. checkmark flash) after save
- If a card has no rules, show a placeholder or empty state in the rule column

#### Fixed price threshold rule
- New rule type: `fixed_price` — alerts when cheapest price crosses an absolute EUR amount
- Same structure as percentage threshold: direction (up/down/both) + enabled toggle
- Value is an absolute EUR amount with 2 decimal places (e.g. 3.50)
- A card can have multiple rules of any type simultaneously — all rules are independent
- Each rule evaluates independently; any triggered rule sends a notification
- RuleEditor on card detail page gets a third tab: "Fixed Price" alongside "Threshold" and "Stability"
- Fixed price tab UI mirrors threshold tab: EUR amount input + direction selector + enabled toggle + remove button

#### Wishlist filter
- Add a filter/dropdown on dashboard to show cards from a specific wishlist
- Use existing `wishlist_id` foreign key on monitored_cards

#### Persistent filters
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI state + rendering | Project standard |
| TypeScript | ~5.9.3 | Type safety | Project standard |
| Tailwind CSS | ^4.0.0 | Styling | Project standard — dark palette established |
| @supabase/supabase-js | ^2.0.0 | DB updates (inline save) | Project standard |
| Vitest | ^4.0.18 | Unit tests | Project standard |

No new dependencies needed. All phase features are implemented with existing stack.

**Installation:** none required.

---

## Architecture Patterns

### Recommended File Touch Map

```
src/
├── lib/
│   ├── cardtrader-types.ts      # Add FixedPriceRule interface + extend NotificationRule union
│   └── cardtrader-utils.ts      # Add createDefaultFixedPriceRule()
├── components/
│   ├── CardRow.tsx               # Add inline rule input column
│   ├── CardList.tsx              # Add wishlist filter dropdown + localStorage persistence
│   └── RuleEditor.tsx            # Add "Fixed Price" third tab
└── pages/
    └── DashboardPage.tsx         # Pass wishlist data to CardList (or fetch wishlists inside CardList)

scripts/
└── fetch-prices.ts               # Extend threshold evaluation to handle FixedPriceRule
tests/
└── fixed-price-evaluation.test.ts  # New: unit tests for fixed price comparison logic
```

### Pattern 1: Type Extension — FixedPriceRule

**What:** Add a new discriminated union member to `NotificationRule`.
**When to use:** Adding a new rule variant that needs type-safe handling everywhere rules are consumed.

```typescript
// src/lib/cardtrader-types.ts — add alongside ThresholdRule and StabilityRule
export interface FixedPriceRule {
  type: 'fixed_price';
  price_eur: number;        // absolute EUR amount, e.g. 3.50
  direction: 'up' | 'down' | 'both';
  enabled: boolean;
}

export type NotificationRule = ThresholdRule | StabilityRule | FixedPriceRule;
```

All existing `r.type === 'threshold'` type guards continue to work unchanged. Add `r.type === 'fixed_price'` guards wherever rules are processed.

### Pattern 2: Inline Auto-Save (CT Zero Toggle Pattern)

**What:** Input field that saves to Supabase immediately on blur or Enter, no explicit Save button.
**When to use:** Single-field edits where optimistic UX is acceptable.

The project already uses this in `CardDetailPage.tsx` (`handleToggleZero`). The inline rule input follows the same `supabase.from('monitored_cards').update(...).eq('id', card.id)` call, triggered by `onBlur` and `onKeyDown` (Enter).

```typescript
// Inline save handler pattern (inside CardRow)
async function handleInlineSave(newValue: number) {
  if (!firstRule) return;
  const updatedRules = card.notification_rule?.map((r, i) =>
    i === 0 ? { ...r, [primaryField]: newValue } : r
  ) ?? [];
  const { error } = await supabase
    .from('monitored_cards')
    .update({ notification_rule: updatedRules })
    .eq('id', card.id);
  if (!error) {
    // show brief checkmark flash
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }
}
```

**CardRow is currently a `<button>` wrapping everything.** This is an important constraint: placing an `<input>` inside a `<button>` is invalid HTML. The outer element must be restructured from `<button>` to a `<div>` with keyboard handlers, or the row must be split into a clickable zone and a non-clickable input zone.

**Recommended approach:** Convert `CardRow` from `<button>` to a `<div role="button">` with `onClick`/`onKeyDown` on the non-input area, and add `onClick={(e) => e.stopPropagation()}` on the inline input zone to prevent navigation when interacting with the input.

### Pattern 3: Wishlist Filter Dropdown

**What:** Derive wishlist names from cards already loaded, or from a separate Supabase query.
**When to use:** Filtering a list by a related entity.

Two implementation options:

**Option A — Derive from loaded cards (recommended).** `DashboardPage` already fetches `monitored_cards` without joining `wishlists`. The `wishlist_id` UUID is present on each card. A separate single query `supabase.from('wishlists').select('id, name')` in `DashboardPage` provides the name mapping. Pass `wishlists` as a prop to `CardList`.

**Option B — Join in the existing query.** Add `wishlists(id, name)` to the `monitored_cards` select in `DashboardPage`. Slightly fewer roundtrips but increases data payload.

Option A is recommended for clean separation — `DashboardPage` already has two separate queries (cards + snapshots) and this mirrors that established pattern.

```typescript
// DashboardPage: add alongside fetchCards
const { data: wishlistData } = await supabase
  .from('wishlists')
  .select('id, name');
// Pass to CardList:
<CardList cards={cards} wishlists={wishlistData ?? []} />
```

```typescript
// CardList: new prop, derive filter options
type CardListProps = {
  cards: MonitoredCardWithPrice[];
  wishlists: { id: string; name: string }[];
};
```

Only show the wishlist dropdown when `wishlists.length > 1` (mirrors the existing expansion filter's `expansions.length > 1` condition).

### Pattern 4: Persistent Filters with localStorage

**What:** Serialize filter state (search, expansion, wishlist) to `localStorage` on each change; restore on mount.
**When to use:** Lightweight client-side UI state persistence with no server round-trip.

```typescript
// Single key, JSON-serialized object
const FILTER_STORAGE_KEY = 'cardtrader-dashboard-filters';

interface DashboardFilters {
  search: string;
  expansionFilter: string;
  wishlistFilter: string;
}

function loadFilters(): DashboardFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return { search: '', expansionFilter: '', wishlistFilter: '' };
    return JSON.parse(raw) as DashboardFilters;
  } catch {
    return { search: '', expansionFilter: '', wishlistFilter: '' };
  }
}
```

Initialize `useState` with `loadFilters()` (not `''`) so filters restore immediately on mount without a separate `useEffect`.

```typescript
const [search, setSearch] = useState(() => loadFilters().search);
const [expansionFilter, setExpansionFilter] = useState(() => loadFilters().expansionFilter);
const [wishlistFilter, setWishlistFilter] = useState(() => loadFilters().wishlistFilter);
```

Persist on every filter change with a `useEffect`:
```typescript
useEffect(() => {
  localStorage.setItem(
    FILTER_STORAGE_KEY,
    JSON.stringify({ search, expansionFilter, wishlistFilter })
  );
}, [search, expansionFilter, wishlistFilter]);
```

### Pattern 5: Fixed Price Evaluation in fetch-prices.ts

**What:** Extend the threshold notification loop to also evaluate `fixed_price` rules.
**When to use:** Adding a new rule type that triggers Telegram alerts.

The current loop in `fetch-prices.ts` (lines 376-411) filters for `r.type === 'threshold'` only. Extend to also handle `fixed_price`:

```typescript
// Evaluate fixed price rule: compare current price in cents to rule.price_eur * 100
function evaluateFixedPrice(
  rule: FixedPriceRule,
  currentCents: number | null,
  lastPriceCents: number | null,  // for cooldown comparison
): { triggered: boolean; percentChange: number; comparisonCents: number | null } {
  if (!rule.enabled || currentCents === null) {
    return { triggered: false, percentChange: 0, comparisonCents: null };
  }
  const targetCents = Math.round(rule.price_eur * 100);
  const comparisonCents = lastPriceCents ?? null;

  // Direction check: has the price crossed the fixed target?
  const isBelow = currentCents <= targetCents;
  const wasAbove = comparisonCents === null || comparisonCents > targetCents;
  const isAbove = currentCents >= targetCents;
  const wasBelow = comparisonCents !== null && comparisonCents < targetCents;

  let triggered = false;
  if (rule.direction === 'down' || rule.direction === 'both') {
    triggered = triggered || (isBelow && wasAbove);  // crossed down through target
  }
  if (rule.direction === 'up' || rule.direction === 'both') {
    triggered = triggered || (isAbove && wasBelow);  // crossed up through target
  }

  const percentChange = comparisonCents
    ? ((currentCents - comparisonCents) / comparisonCents) * 100
    : -100;

  return { triggered, percentChange, comparisonCents };
}
```

**Important:** The `formatAlertMessage` in `telegram-utils.ts` can be reused as-is — it only needs `oldPriceCents`, `newPriceCents`, and `percentChange`, which are available regardless of rule type.

### Pattern 6: Inline Display for Stability Rule as First Rule

**What:** The inline column shows the first rule's primary value. Stability rules have two fields (`range_percent` + `consecutive_days`), not one.
**When to use:** When a card's first rule happens to be a stability rule.

**Recommended approach (Claude's Discretion):** Show `range_percent` as the editable value with a `%` suffix (same as threshold) and `consecutive_days` as a non-editable secondary label (e.g., `3d`). This keeps the column narrow and consistent.

Alternative: Show a fixed label "Stability" (non-editable) since the stability rule has dual parameters that don't reduce to a single "primary value" as cleanly.

### Anti-Patterns to Avoid

- **Input inside button:** `<input>` nested inside `<button>` is invalid HTML. CardRow must be restructured before adding inline input. Use `stopPropagation` on the input zone.
- **Saving on every keystroke:** Auto-save must trigger on blur/Enter only, not `onChange`, to avoid excessive Supabase writes.
- **localStorage without try/catch:** Private browsing or storage-full conditions throw. Always wrap `localStorage` access in try/catch.
- **Hardcoded localStorage key:** Use a constant (e.g. `FILTER_STORAGE_KEY`) so it can be changed in one place.
- **Forgetting to update `fetch-prices.ts`:** The `FixedPriceRule` type addition in the frontend is inert if the backend script isn't extended to evaluate it. Both must be updated together.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EUR formatting | Custom EUR formatter | Existing `formatEur()` from `PriceDisplay.tsx` | Already used throughout project |
| Debounce for inline save | Custom debounce | Blur/Enter trigger (no debounce needed) | Project pattern: save on blur, not on keystroke |
| State management | Redux/Zustand | `useState` + `localStorage` | Established pattern, no external state library in project |
| Rule type guards | Manual `if` chains | TypeScript discriminated union with `r.type === 'fixed_price'` | Type-safe exhaustive checks |

---

## Common Pitfalls

### Pitfall 1: Invalid HTML — Input Inside Button
**What goes wrong:** Browsers auto-correct invalid nesting, producing unexpected focus/click behavior. The inline input may not receive clicks reliably.
**Why it happens:** `CardRow` is currently a `<button>` element. Placing `<input>` inside `<button>` is not valid HTML.
**How to avoid:** Restructure `CardRow` outer element from `<button>` to `<div>` with explicit keyboard/click handlers. Add `stopPropagation` on the inline input to prevent row navigation.
**Warning signs:** Input loses focus immediately; clicking input navigates to card detail.

### Pitfall 2: Inline Save Triggers Row Click
**What goes wrong:** Clicking the inline input triggers the row's onClick handler, navigating away from the dashboard.
**Why it happens:** Click events bubble from input up to the row container.
**How to avoid:** `onClick={(e) => e.stopPropagation()}` on the input zone.
**Warning signs:** Clicking the input field navigates to CardDetailPage.

### Pitfall 3: localStorage Desync with Wishlist Options
**What goes wrong:** A persisted `wishlistFilter` value points to a wishlist that no longer exists (deleted or user switched accounts). Filter UI shows nothing.
**Why it happens:** localStorage persists across sessions while database state changes.
**How to avoid:** After loading wishlists, validate that restored `wishlistFilter` matches an actual wishlist ID; reset to `''` if not found.
**Warning signs:** Filter dropdown shows "All wishlists" but filter is still active (cards are missing).

### Pitfall 4: Inline Save Race on Rapid Blur/Enter
**What goes wrong:** User presses Enter then immediately blurs (or vice versa), triggering two saves with potentially different values.
**Why it happens:** Both `onBlur` and `onKeyDown` (Enter) fire in quick succession.
**How to avoid:** Use a `saving` boolean flag to guard against concurrent saves (same pattern as `togglingZero` in CardDetailPage).
**Warning signs:** Two Supabase update calls in the network tab.

### Pitfall 5: fetch-prices.ts Has Local `NotificationRule` Types
**What goes wrong:** The script imports `NotificationRule` from `cardtrader-types.ts` but the import at line 6 uses `NotificationRule` only as a type annotation. Adding `FixedPriceRule` to the union requires also filtering by `r.type === 'fixed_price'` in the evaluation loop.
**Why it happens:** The script currently only processes `ThresholdRule` (explicit filter on line 376-380). The new type is silently ignored unless the loop is updated.
**How to avoid:** After extending the type, grep for all `r.type === 'threshold'` guards in scripts and extend them to cover `fixed_price`.
**Warning signs:** Fixed price rules exist in the database but no Telegram alerts are sent.

---

## Code Examples

### Extending NotificationRule Union
```typescript
// src/lib/cardtrader-types.ts
export interface FixedPriceRule {
  type: 'fixed_price';
  price_eur: number;
  direction: 'up' | 'down' | 'both';
  enabled: boolean;
}

export type NotificationRule = ThresholdRule | StabilityRule | FixedPriceRule;
```

### Default FixedPriceRule Factory
```typescript
// src/lib/cardtrader-utils.ts
export function createDefaultFixedPriceRule(): FixedPriceRule {
  return {
    type: 'fixed_price',
    price_eur: 1.00,
    direction: 'down',
    enabled: true,
  };
}
```

### RuleEditor Tab Extension
```typescript
// Add to ActiveTab union:
type ActiveTab = 'threshold' | 'stability' | 'fixed_price';

// Add fixedPriceRules computed value alongside thresholdRules/stabilityRules:
const fixedPriceRules = localRules.filter((r): r is FixedPriceRule => r.type === 'fixed_price');
```

### Inline Rule Column in CardRow
```typescript
// Inside CardRow — replace the outer <button> with a row container
// and add a right-side rule column

function InlineRuleInput({ card, onSaved }: { card: MonitoredCardWithPrice; onSaved: () => void }) {
  const firstRule = card.notification_rule?.[0] ?? null;
  const [localValue, setLocalValue] = useState(() => {
    if (!firstRule) return '';
    if (firstRule.type === 'threshold') return String(firstRule.threshold_percent);
    if (firstRule.type === 'fixed_price') return String(firstRule.price_eur.toFixed(2));
    if (firstRule.type === 'stability') return String(firstRule.range_percent);
    return '';
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // suffix based on rule type
  const suffix = !firstRule ? '' :
    firstRule.type === 'threshold' ? '%' :
    firstRule.type === 'fixed_price' ? 'EUR' : 'days';

  async function handleSave() {
    if (!firstRule || saving) return;
    setSaving(true);
    // build updated rules array
    const updatedRules = (card.notification_rule ?? []).map((r, i) => {
      if (i !== 0) return r;
      const val = parseFloat(localValue);
      if (isNaN(val)) return r;
      if (r.type === 'threshold') return { ...r, threshold_percent: val };
      if (r.type === 'fixed_price') return { ...r, price_eur: val };
      if (r.type === 'stability') return { ...r, range_percent: val };
      return r;
    });
    const { error } = await supabase
      .from('monitored_cards')
      .update({ notification_rule: updatedRules })
      .eq('id', card.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onSaved();
    }
  }

  if (!firstRule) {
    return <span className="text-xs text-slate-500 italic">No rules</span>;
  }

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        disabled={saving}
        className="w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-600 disabled:opacity-50"
      />
      <span className="text-xs text-slate-400">{suffix}</span>
      {saved && <span className="text-xs text-green-400">✓</span>}
    </div>
  );
}
```

### localStorage Persistence Pattern
```typescript
// src/components/CardList.tsx
const FILTER_KEY = 'cardtrader-dashboard-filters';

function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    return raw ? JSON.parse(raw) : { search: '', expansionFilter: '', wishlistFilter: '' };
  } catch {
    return { search: '', expansionFilter: '', wishlistFilter: '' };
  }
}

// In CardList component:
const saved = loadFilters();
const [search, setSearch] = useState<string>(saved.search ?? '');
const [expansionFilter, setExpansionFilter] = useState<string>(saved.expansionFilter ?? '');
const [wishlistFilter, setWishlistFilter] = useState<string>(saved.wishlistFilter ?? '');

useEffect(() => {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ search, expansionFilter, wishlistFilter }));
  } catch {
    // ignore storage errors
  }
}, [search, expansionFilter, wishlistFilter]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `notification_rule` jsonb object | Array of `NotificationRule[]` | Phase 3 (migration 00003) | Multiple rules per card — FixedPriceRule adds to existing array |
| Button wrapping for card row clicks | Still button — needs change | Phase 3 | Must restructure to div before nesting inputs |
| No filter persistence | localStorage | Phase 7 | QoL improvement |

**Deprecated/outdated:**
- None relevant to this phase.

---

## Open Questions

1. **How to handle inline display when card has zero rules**
   - What we know: CONTEXT.md says "show a placeholder or empty state"
   - What's unclear: Exact UI — greyed-out `---` or an "Add Rule" mini-button?
   - Recommendation: Show `---` in slate-500 (no-op column) — keeps layout consistent. Users go to card detail to add rules.

2. **Fixed price rule: "crossed" vs "below/above" semantics**
   - What we know: Rule triggers when "cheapest price crosses an absolute EUR amount"
   - What's unclear: Does it trigger every run while below, or only on the crossing moment?
   - Recommendation: Same cooldown behavior as threshold rules (24h cooldown, first-triggered-rule-wins). Evaluate as "is current price below target AND was previous notification price above target" (crossing semantics). This matches user mental model of "notify when it drops TO this price."

3. **Wishlist filter: should it be scoped to CardList or DashboardPage?**
   - What we know: `wishlist_id` is on `MonitoredCardWithPrice`. Wishlists table needs a separate query.
   - What's unclear: Whether to fetch wishlists inside `CardList` or pass from `DashboardPage`.
   - Recommendation: Fetch in `DashboardPage` alongside cards (same lifecycle), pass as prop to `CardList`. Keeps `CardList` as a pure presentation component.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| FixedPriceRule evaluation (crossing semantics, direction, enabled flag) | unit | `npm test -- --reporter=verbose tests/fixed-price-evaluation.test.ts` | ❌ Wave 0 |
| createDefaultFixedPriceRule returns correct shape | unit | `npm test -- --reporter=verbose tests/notification-rule.test.ts` | extend existing ✅ |
| localStorage filter persistence (load/save round-trip) | unit | `npm test -- --reporter=verbose tests/dashboard-filters.test.ts` | ❌ Wave 0 |

Note: React component tests (CardRow inline input, CardList wishlist filter) are excluded — the project has no React Testing Library and component behavior is verified manually. Only pure logic functions have unit tests.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/fixed-price-evaluation.test.ts` — covers fixed price crossing logic, direction, cooldown behavior
- [ ] `tests/dashboard-filters.test.ts` — covers localStorage load/save round-trip, invalid JSON graceful fallback, missing key default

*(Existing `tests/notification-rule.test.ts` should be extended with `createDefaultFixedPriceRule` test case)*

---

## Sources

### Primary (HIGH confidence)
- Direct source code review: `src/lib/cardtrader-types.ts`, `src/lib/cardtrader-utils.ts`, `src/lib/telegram-utils.ts`
- Direct source code review: `src/components/CardRow.tsx`, `CardList.tsx`, `RuleEditor.tsx`
- Direct source code review: `src/pages/DashboardPage.tsx`, `CardDetailPage.tsx`
- Direct source code review: `scripts/fetch-prices.ts`
- Direct source code review: `supabase/migrations/00001_initial_schema.sql`
- Direct source code review: `tests/threshold-evaluation.test.ts`, `notification-rule.test.ts`
- Direct source code review: `package.json`, `vitest.config.ts`
- Direct reading: `.planning/phases/07-*/07-CONTEXT.md`

### Secondary (MEDIUM confidence)
- HTML spec: `<input>` inside `<button>` is invalid — verified via established browser behavior knowledge
- React patterns: `useState` lazy initializer for localStorage restore — standard React docs pattern

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in package.json, no new dependencies
- Architecture: HIGH — all patterns derived from direct source code reading
- Pitfalls: HIGH — the button/input nesting issue is a concrete structural constraint visible in the code
- Test strategy: HIGH — vitest already configured, existing test files confirm pattern

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (stable tech stack, 90 days)
