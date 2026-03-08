# Phase 6: Chores and Fixes - Research

**Researched:** 2026-03-08
**Domain:** UI polish, schema cleanup, lint fixes, documentation
**Confidence:** HIGH

## Summary

Phase 6 is a polish phase with no new library dependencies. All work uses the existing stack: React 19, Tailwind v4, Supabase, Biome, and Vitest. The tasks decompose into independent workstreams: color palette migration (141 occurrences across 12 .tsx files), card detail page UX improvements, a new public "How it works" page, wishlist limit enforcement in the Edge Function, database schema rename, lint cleanup (16 Biome errors), footer addition, and documentation.

The palette migration is the highest-risk item due to its breadth (every component file). The schema rename (`expansion_name` -> `expansion_id` + FK to `ct_expansions`) is safe because the database will be reset (no migration needed). The wishlist limit is a simple server-side check in the existing Edge Function.

**Primary recommendation:** Group work into 3-4 plans: (1) palette + footer, (2) card detail UX + "How it works" page, (3) schema rename + lint cleanup + docs. Keep palette migration as a single atomic plan to avoid partial color states.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Switch from current custom palette (deep-space/papaya/flag-red/steel/molten) to dark modern theme using Tailwind slate scale: background slate-900, surface slate-800, border slate-700, text slate-100/slate-400, accent blue-500, semantic emerald-500/red-500
- Card detail page: add wishlist name as link to CardTrader, ? icon on rules linking to "How it works", new "Danger zone" section for Stop Monitoring
- Maximum 2 wishlists per user, server-side validation only in Edge Function
- Public "How it works" page at /how-it-works with 4 content sections
- Footer: "made with heart by Eomm" linking to https://github.com/Eomm, present on all pages
- Rename `expansion_name` column to `expansion_id` with FK to `ct_expansions`, no migration (DB reset)
- Update docs/ folder with installation guide including OAuth setup
- Fix all 16 Biome errors

### Claude's Discretion
- "How it works" page layout and visual design (within dark modern palette)
- Footer positioning and styling
- Exact tooltip/icon design for rules help link
- Danger zone visual treatment
- docs/ folder structure and format

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (no changes)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | ^19.2.0 | UI framework | Already installed |
| react-router | ^7.13.0 | Routing | Need new /how-it-works route |
| Tailwind CSS | ^4.0.0 | Styling | @theme block in index.css |
| @supabase/supabase-js | ^2.0.0 | Database client | Already installed |
| Biome | ^1.9.0 | Lint/format | biome.json v2 schema |
| Vitest | ^4.0.18 | Testing | Already configured |

### No New Dependencies
This phase requires zero new npm packages. All work uses existing libraries.

## Architecture Patterns

### Tailwind v4 @theme Color Migration

The current palette is defined in `src/index.css` via `@theme`:
```css
@theme {
  --color-deep-space: #003049;
  --color-papaya: #fdf0d5;
  --color-flag-red: #c1121f;
  --color-steel: #669bbc;
  --color-molten: #780000;
}
```

**Migration approach:** Tailwind v4 includes the full slate scale by default. Remove custom `@theme` colors, then do a global find-and-replace across all 12 component files (141 occurrences). The mapping:

| Old Color | Usage | New Color |
|-----------|-------|-----------|
| `bg-deep-space` | Dark backgrounds | `bg-slate-900` |
| `bg-papaya` | Light backgrounds | `bg-slate-100` (light) / unused (dark-only) |
| `text-papaya` | Primary text on dark | `text-slate-100` |
| `text-deep-space` | Primary text on light | `text-slate-900` |
| `text-deep-space/60`, `text-papaya/60` | Muted text | `text-slate-400` |
| `text-deep-space/50`, `text-papaya/50` | Dimmer text | `text-slate-500` |
| `bg-steel`, `text-steel` | Actions/links | `bg-blue-500`, `text-blue-500` |
| `border-steel/20` | Borders | `border-slate-700` |
| `bg-flag-red`, `text-flag-red` | Danger/destructive | `bg-red-500`, `text-red-500` |
| `text-molten` | Error text | `text-red-500` |
| `bg-white dark:bg-deep-space` | Surface | `bg-slate-800` |

**Key decision:** The current code has `dark:` variants everywhere (light/dark mode). The new palette is dark-only (Linear/GitHub Dark aesthetic). This means removing all light/dark conditional classes and using the dark palette directly. This simplifies every component.

### Public Route Pattern

Current routing in `App.tsx` uses `BrowserRouter` with `basename="/cardtrader-monitor"`. All routes except `/` (LoginPage) are wrapped in `<ProtectedRoute>`. The "How it works" page needs to be public (no auth), similar to LoginPage:

```tsx
<Route path="/how-it-works" element={<HowItWorksPage />} />
```

No layout wrapper needed since it is a standalone public page (but should include the footer).

### Footer Pattern

The footer should be added at the App.tsx level, outside the route-specific layout. Two approaches:
1. Add footer inside `AuthenticatedLayout` AND on public pages -- leads to duplication
2. Create a minimal `AppLayout` wrapper at the top level that includes footer on all pages

**Recommendation:** Create a simple `Footer` component, add it to `AuthenticatedLayout` and also render it on LoginPage and HowItWorksPage. This keeps the current structure intact without a major refactor.

### Card Detail Page Enhancements

The `CardDetailPage.tsx` needs three additions:

1. **Wishlist name link:** The card already has `wishlist_id`. Need to join/fetch the wishlist name and `cardtrader_wishlist_id` to build the CardTrader URL: `https://www.cardtrader.com/wishlists/{cardtrader_wishlist_id}`. Add a property row in the Properties section.

2. **Rules ? icon:** Add a small help icon next to "Notification Rules" heading in `RuleEditor.tsx` that links to `/how-it-works#rules` (anchor link).

3. **Danger zone:** Move the Stop Monitoring button into a visually distinct section at the bottom with a border and warning styling. Keep the existing inline confirmation pattern.

### Wishlist Limit Enforcement

In `supabase/functions/import-wishlist/index.ts`, add a count check after auth (step 3) and before the import flow (step 5):

```typescript
// Count existing wishlists for this user
const { count, error: countError } = await supabaseAdmin
  .from('wishlists')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id);

if (count !== null && count >= 2) {
  return new Response(
    JSON.stringify({ error: 'Maximum 2 wishlists per user. Remove an existing wishlist first.' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Schema Rename: expansion_name -> expansion_id

**Current state:** `monitored_cards.expansion_name` is a text column storing the expansion display name. The `ct_expansions` table already exists (from migration 00002) with `id`, `code`, `name`.

**Target:** Rename to `expansion_id` (int) with FK to `ct_expansions(id)`. Since DB will be reset, modify the existing migration files directly.

**Files referencing `expansion_name`:**
- `supabase/migrations/00001_initial_schema.sql` -- column definition
- `supabase/functions/import-wishlist/index.ts` -- sets value during import (line 296)
- `scripts/sync-wishlists.ts` -- sets value during sync
- `src/lib/cardtrader-types.ts` -- TypeScript type (line 86)
- `src/lib/cardtrader-utils.ts` -- utility function (lines 91, 99)
- `src/pages/CardDetailPage.tsx` -- displays value (line 262)
- `src/components/CardRow.tsx` -- displays value (line 63)
- `tests/card-mapper.test.ts` -- test data
- `tests/card-sorting.test.ts` -- test data

**Important:** The display name is still needed for UI. After rename, the code must JOIN `ct_expansions` to get the name, or store `expansion_id` and fetch the name separately. The simpler approach: store `expansion_id` as FK, and add a computed/joined `expansion_name` when querying for display. Alternatively, store both -- but the decision says rename, not add.

**Recommendation:** Store `expansion_id` as int FK. In the frontend queries (CardDetailPage, DashboardPage), use a Supabase join: `.select('*, ct_expansions(name)')` to get the expansion name. Update the TypeScript type to have `expansion_id: number` and handle the joined name.

### Anti-Patterns to Avoid
- **Partial palette migration:** Never leave half the app in old colors and half in new. Do all files in one plan.
- **Client-side wishlist limit check:** The decision explicitly says server-side only. Don't add frontend validation.
- **New migration files for schema rename:** DB will be reset. Modify existing migrations instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color tokens | Custom CSS variables for slate scale | Tailwind's built-in slate colors | Tailwind v4 includes all color scales by default |
| Import sorting | Manual reordering | `npx biome check . --write` | Biome's `--write` auto-fixes formatting and import ordering |
| Anchor scroll | Custom scroll-to logic | Native `id` attributes + hash links | Browser handles `#section` scrolling natively |

## Common Pitfalls

### Pitfall 1: Tailwind v4 Color Scale Availability
**What goes wrong:** Assuming custom @theme is needed for standard Tailwind colors
**Why it happens:** Tailwind v4 changed how colors work vs v3 -- all colors are available by default without importing
**How to avoid:** Remove the @theme block entirely. `slate-900`, `blue-500`, etc. work out of the box in Tailwind v4
**Warning signs:** Colors not applying after removing @theme

### Pitfall 2: Opacity Syntax in New Palette
**What goes wrong:** Using `text-slate-100/60` (opacity modifier) when a specific slate shade exists
**Why it happens:** Old palette used opacity modifiers (`text-papaya/60`) because there were only 5 custom colors
**How to avoid:** Use specific slate shades instead of opacity: `slate-400` for muted, `slate-500` for dimmer, `slate-600` for very dim
**Warning signs:** Text looking washed out or inconsistent

### Pitfall 3: Light/Dark Mode Removal
**What goes wrong:** Leaving stale `dark:` prefixes in class strings after going dark-only
**Why it happens:** Search-and-replace misses conditional patterns like `bg-white dark:bg-deep-space/50`
**How to avoid:** Grep for `dark:` after migration. Remove ALL `dark:` prefixes -- the app is now dark-only
**Warning signs:** Any remaining `dark:` in source after palette migration

### Pitfall 4: Supabase Join Syntax for expansion_name
**What goes wrong:** Forgetting that Supabase PostgREST requires a FK relationship for `.select()` joins
**Why it happens:** The FK from `monitored_cards.expansion_id` to `ct_expansions.id` must exist in the schema
**How to avoid:** Ensure the FK constraint is defined in the migration before attempting `.select('*, ct_expansions(name)')`
**Warning signs:** "Could not find a relationship" error from Supabase

### Pitfall 5: Biome Non-Null Assertion Fix
**What goes wrong:** Blindly adding `!` suppression instead of fixing the root cause
**Why it happens:** `scripts/sync-wishlists.ts:292` uses `resolvedItems.get(bpId)!`
**How to avoid:** Add a filter/guard: `const item = resolvedItems.get(bpId); if (!item) continue;`
**Warning signs:** Biome error persists after "fix"

## Code Examples

### Color Migration in index.css
```css
/* Before */
@theme {
  --color-deep-space: #003049;
  --color-papaya: #fdf0d5;
  --color-flag-red: #c1121f;
  --color-steel: #669bbc;
  --color-molten: #780000;
}

/* After -- remove @theme block entirely. Tailwind v4 includes all colors. */
/* No @theme needed. */
```

### Footer Component
```tsx
export function Footer() {
  return (
    <footer className="py-4 text-center text-sm text-slate-500">
      made with <span aria-label="love">&#10084;&#65039;</span> by{' '}
      <a
        href="https://github.com/Eomm"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-400 underline"
      >
        Eomm
      </a>
    </footer>
  );
}
```

### Wishlist Limit Check (Edge Function)
```typescript
// After step 3 (auth), before step 5 (import flow)
const { count } = await supabaseAdmin
  .from('wishlists')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id);

if (count !== null && count >= 2) {
  return new Response(
    JSON.stringify({ error: 'Maximum 2 wishlists allowed. Remove an existing wishlist to import a new one.' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Schema Change in Migration
```sql
-- In 00001_initial_schema.sql, change:
--   expansion_name text,
-- To:
--   expansion_id int REFERENCES public.ct_expansions(id),

-- Note: ct_expansions must be created BEFORE monitored_cards.
-- Move ct_expansions CREATE TABLE from 00002 to 00001 (before monitored_cards).
```

### Supabase Join Query for Expansion Name
```typescript
const { data } = await supabase
  .from('monitored_cards')
  .select('*, ct_expansions(name)')
  .eq('id', id)
  .single();

// Access: data.ct_expansions.name
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map

This is a chores/fixes phase with no formal requirement IDs. Key behaviors to validate:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Biome check passes (0 errors) | lint | `npx biome check .` | N/A (CI) |
| Build succeeds with new palette | build | `npm run build` | N/A (CI) |
| Existing tests pass after schema rename | unit | `npm test` | Yes (11 test files) |
| card-mapper test updated for expansion_id | unit | `npx vitest run tests/card-mapper.test.ts` | Yes |
| card-sorting test updated for expansion_id | unit | `npx vitest run tests/card-sorting.test.ts` | Yes |

### Sampling Rate
- **Per task commit:** `npm test && npx biome check .`
- **Per wave merge:** `npm run build && npm test`
- **Phase gate:** Full suite green + `npx biome check .` returns 0 errors

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. No new test files needed for this chores phase.

## Open Questions

1. **Migration file ordering for schema change**
   - What we know: `ct_expansions` is created in `00002_data_pipeline.sql`, but `monitored_cards` is created in `00001_initial_schema.sql`. Adding `expansion_id` FK to `monitored_cards` requires `ct_expansions` to exist first.
   - What's unclear: Whether to move `ct_expansions` to `00001` or add `expansion_id` column via ALTER in `00002` (after `ct_expansions` exists).
   - Recommendation: Since DB resets, move `ct_expansions` creation to `00001` before `monitored_cards` definition. Cleaner than ALTER.

2. **MonitoredCardWithPrice type after schema change**
   - What we know: Type currently has `expansion_name: string`. After rename to `expansion_id`, the joined response shape changes.
   - Recommendation: Change type to `expansion_id: number` and add `ct_expansions?: { name: string }` for the join result. Or flatten to keep `expansion_name` as a derived field in the query layer.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: all source files read directly
- `biome check .` output: 16 errors enumerated
- `supabase/migrations/`: schema structure verified
- `package.json`: dependency versions confirmed

### Secondary (MEDIUM confidence)
- Tailwind v4 color availability: based on Tailwind v4 default behavior (all scales included)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no changes needed, all deps already installed
- Architecture: HIGH - patterns derived directly from existing codebase
- Pitfalls: HIGH - identified from actual code analysis
- Schema change: MEDIUM - migration reordering approach needs care

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable phase, no fast-moving dependencies)
